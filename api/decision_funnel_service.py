from __future__ import annotations

import os
from typing import Dict, List, Optional

try:
    from .market_data_service import (
        MarketDataConfigError,
        MarketDataError,
        MarketDataQueryError,
        _bigquery_client,
        _bigquery_module,
        _settings,
        _validate_identifier,
    )
    from .research_task_service import DEFAULT_ACTOR_ID, DEFAULT_WORKSPACE_ID, _normalize_key, _serializable_value
    from .trading_ticket_service import _float_value, _optional_text, _required_choice, _required_text
except ImportError:
    from market_data_service import (
        MarketDataConfigError,
        MarketDataError,
        MarketDataQueryError,
        _bigquery_client,
        _bigquery_module,
        _settings,
        _validate_identifier,
    )
    from research_task_service import DEFAULT_ACTOR_ID, DEFAULT_WORKSPACE_ID, _normalize_key, _serializable_value
    from trading_ticket_service import _float_value, _optional_text, _required_choice, _required_text


DEFAULT_DECISION_FUNNEL_TABLE = "decision_funnel"
DECISION_FUNNEL_STATUSES = {"pass", "watch", "block"}
DECISION_FUNNEL_FIELD_NAMES = [
    "workspace_id",
    "actor_id",
    "funnel_id",
    "idempotency_key",
    "generated_at",
    "updated_at",
    "portfolio_id",
    "batch_id",
    "stage_key",
    "stage_order",
    "label",
    "status",
    "value",
    "conversion",
    "owner",
    "note",
    "total_rows",
    "visible_rows",
    "candidate_count",
    "active_allocation_count",
    "active_rebalance_count",
    "trade_ticket_count",
    "filled_trade_count",
    "block_count",
    "watch_count",
    "source",
]


def sync_decision_funnel_records(records: List[Dict]) -> Dict:
    if not records:
        raise MarketDataError("Decision funnel records are required.")
    if len(records) > 200:
        raise MarketDataError("Decision funnel sync supports at most 200 records per request.")

    bigquery = _bigquery_module()
    client = _bigquery_client(bigquery)
    table_id = _ensure_decision_funnel_table(bigquery, client)
    clean_records = [_normalize_decision_funnel_record(record) for record in records]

    try:
        errors = client.insert_rows_json(
            table_id,
            clean_records,
            row_ids=[row["idempotency_key"] for row in clean_records],
        )
    except Exception as exc:
        raise MarketDataQueryError(f"BigQuery decision funnel insert failed: {exc}") from exc

    if errors:
        return {
            "status": "partial_error",
            "table": table_id,
            "receivedCount": len(records),
            "insertedCount": 0,
            "errors": errors[:5],
        }

    return {
        "status": "synced",
        "table": table_id,
        "receivedCount": len(records),
        "insertedCount": len(clean_records),
        "errors": [],
    }


def load_latest_decision_funnel_records(
    limit: int = 100,
    workspace_id: Optional[str] = None,
    portfolio_id: Optional[str] = None,
    batch_id: Optional[str] = None,
) -> Dict:
    bigquery = _bigquery_module()
    client = _bigquery_client(bigquery)
    table_id = _decision_funnel_table_id()
    bounded_limit = max(1, min(int(limit or 100), 500))
    clean_workspace_id = _normalize_key(workspace_id, DEFAULT_WORKSPACE_ID)
    clean_portfolio_id = _optional_text({"portfolio_id": portfolio_id}, "portfolio_id")
    clean_batch_id = _optional_text({"batch_id": batch_id}, "batch_id")

    if not _decision_funnel_table_exists(client, table_id):
        return {
            "status": "missing",
            "table": table_id,
            "workspaceId": clean_workspace_id,
            "limit": bounded_limit,
            "stageCount": 0,
            "stages": [],
        }
    missing_fields = _decision_funnel_missing_fields(client, table_id)
    if missing_fields:
        return {
            "status": "schema_outdated",
            "table": table_id,
            "workspaceId": clean_workspace_id,
            "limit": bounded_limit,
            "stageCount": 0,
            "missingFields": missing_fields,
            "stages": [],
        }

    conditions = ["workspace_id = @workspace_id"]
    parameters = [bigquery.ScalarQueryParameter("workspace_id", "STRING", clean_workspace_id)]
    if clean_portfolio_id:
        conditions.append("portfolio_id = @portfolio_id")
        parameters.append(bigquery.ScalarQueryParameter("portfolio_id", "STRING", clean_portfolio_id))
    if clean_batch_id:
        conditions.append("batch_id = @batch_id")
        parameters.append(bigquery.ScalarQueryParameter("batch_id", "STRING", clean_batch_id))
    parameters.append(bigquery.ScalarQueryParameter("limit", "INT64", bounded_limit))

    field_list = ", ".join(DECISION_FUNNEL_FIELD_NAMES)
    query = f"""
    SELECT {field_list}
    FROM (
        SELECT
            {field_list},
            ROW_NUMBER() OVER (
                PARTITION BY workspace_id, funnel_id
                ORDER BY updated_at DESC, generated_at DESC
            ) AS row_number
        FROM `{table_id}`
        WHERE {" AND ".join(conditions)}
    )
    WHERE row_number = 1
    ORDER BY updated_at DESC, generated_at DESC, stage_order
    LIMIT @limit
    """

    try:
        rows = list(
            client.query(
                query,
                job_config=bigquery.QueryJobConfig(query_parameters=parameters),
            ).result()
        )
    except Exception as exc:
        raise MarketDataQueryError(f"BigQuery latest decision funnel query failed: {exc}") from exc

    return {
        "status": "loaded",
        "table": table_id,
        "workspaceId": clean_workspace_id,
        "portfolioId": clean_portfolio_id,
        "batchId": clean_batch_id,
        "limit": bounded_limit,
        "stageCount": len(rows),
        "stages": [_row_to_decision_funnel_record(row) for row in rows],
    }


def _ensure_decision_funnel_table(bigquery, client) -> str:
    table_id = _decision_funnel_table_id()
    schema = _decision_funnel_schema(bigquery)
    table = bigquery.Table(table_id, schema=schema)
    table.time_partitioning = bigquery.TimePartitioning(
        type_=bigquery.TimePartitioningType.DAY,
        field="updated_at",
    )
    table.clustering_fields = ["workspace_id", "portfolio_id", "batch_id", "status"]

    try:
        client.create_table(table, exists_ok=True)
        existing_table = client.get_table(table_id)
        existing_fields = {field.name for field in existing_table.schema}
        missing_fields = [field for field in schema if field.name not in existing_fields]
        if missing_fields:
            existing_table.schema = [*existing_table.schema, *missing_fields]
            client.update_table(existing_table, ["schema"])
    except Exception as exc:
        raise MarketDataConfigError(f"BigQuery decision funnel table could not be created: {exc}") from exc

    return table_id


def _decision_funnel_schema(bigquery) -> List:
    return [
        bigquery.SchemaField("workspace_id", "STRING", description="Workspace or tenant id"),
        bigquery.SchemaField("actor_id", "STRING", description="User or process that generated the funnel"),
        bigquery.SchemaField("funnel_id", "STRING", mode="REQUIRED", description="Stable decision funnel stage id"),
        bigquery.SchemaField("idempotency_key", "STRING", description="Stable key for retry-safe inserts"),
        bigquery.SchemaField("generated_at", "TIMESTAMP", mode="REQUIRED", description="Funnel generation timestamp"),
        bigquery.SchemaField("updated_at", "TIMESTAMP", mode="REQUIRED", description="Last funnel update timestamp"),
        bigquery.SchemaField("portfolio_id", "STRING", description="Portfolio or watchlist id"),
        bigquery.SchemaField("batch_id", "STRING", description="Execution batch id"),
        bigquery.SchemaField("stage_key", "STRING", description="Stable funnel stage key"),
        bigquery.SchemaField("stage_order", "INT64", description="Display order"),
        bigquery.SchemaField("label", "STRING", description="Funnel stage label"),
        bigquery.SchemaField("status", "STRING", description="Funnel stage status"),
        bigquery.SchemaField("value", "STRING", description="Displayed stage value"),
        bigquery.SchemaField("conversion", "STRING", description="Displayed conversion ratio"),
        bigquery.SchemaField("owner", "STRING", description="Responsible owner"),
        bigquery.SchemaField("note", "STRING", description="Stage explanation"),
        bigquery.SchemaField("total_rows", "FLOAT64", description="Total source universe count"),
        bigquery.SchemaField("visible_rows", "FLOAT64", description="Filtered research universe count"),
        bigquery.SchemaField("candidate_count", "FLOAT64", description="Candidate count"),
        bigquery.SchemaField("active_allocation_count", "FLOAT64", description="Active allocation count"),
        bigquery.SchemaField("active_rebalance_count", "FLOAT64", description="Active rebalance count"),
        bigquery.SchemaField("trade_ticket_count", "FLOAT64", description="Trade ticket count"),
        bigquery.SchemaField("filled_trade_count", "FLOAT64", description="Filled trade count"),
        bigquery.SchemaField("block_count", "INT64", description="Funnel block count in the batch"),
        bigquery.SchemaField("watch_count", "INT64", description="Funnel watch count in the batch"),
        bigquery.SchemaField("source", "STRING", description="Funnel source"),
    ]


def _decision_funnel_table_exists(client, table_id: str) -> bool:
    try:
        client.get_table(table_id)
        return True
    except Exception as exc:
        if exc.__class__.__name__ == "NotFound":
            return False
        raise MarketDataQueryError(f"BigQuery decision funnel table lookup failed: {exc}") from exc


def _decision_funnel_missing_fields(client, table_id: str) -> List[str]:
    try:
        table = client.get_table(table_id)
    except Exception as exc:
        raise MarketDataQueryError(f"BigQuery decision funnel schema lookup failed: {exc}") from exc
    existing_fields = {field.name for field in table.schema}
    return [field for field in DECISION_FUNNEL_FIELD_NAMES if field not in existing_fields]


def _normalize_decision_funnel_record(record: Dict) -> Dict:
    workspace_id = _normalize_key(record.get("workspace_id"), DEFAULT_WORKSPACE_ID)
    actor_id = _normalize_key(record.get("actor_id"), DEFAULT_ACTOR_ID)
    funnel_id = _required_text(record, "funnel_id")
    generated_at = _required_text(record, "generated_at")
    updated_at = _required_text(record, "updated_at")

    clean_record = {
        "workspace_id": workspace_id,
        "actor_id": actor_id,
        "funnel_id": funnel_id,
        "idempotency_key": _optional_text(record, "idempotency_key") or f"{workspace_id}:{actor_id}:{funnel_id}:{updated_at}",
        "generated_at": generated_at,
        "updated_at": updated_at,
        "portfolio_id": _optional_text(record, "portfolio_id"),
        "batch_id": _optional_text(record, "batch_id"),
        "stage_key": _required_text(record, "stage_key"),
        "stage_order": _int_value(record.get("stage_order")),
        "label": _required_text(record, "label"),
        "status": _required_choice(record, "status", DECISION_FUNNEL_STATUSES),
        "value": _optional_text(record, "value"),
        "conversion": _optional_text(record, "conversion"),
        "owner": _optional_text(record, "owner"),
        "note": _optional_text(record, "note"),
        "total_rows": _float_value(record.get("total_rows")),
        "visible_rows": _float_value(record.get("visible_rows")),
        "candidate_count": _float_value(record.get("candidate_count")),
        "active_allocation_count": _float_value(record.get("active_allocation_count")),
        "active_rebalance_count": _float_value(record.get("active_rebalance_count")),
        "trade_ticket_count": _float_value(record.get("trade_ticket_count")),
        "filled_trade_count": _float_value(record.get("filled_trade_count")),
        "block_count": _int_value(record.get("block_count")),
        "watch_count": _int_value(record.get("watch_count")),
        "source": _optional_text(record, "source") or "decision_funnel",
    }
    return {field: clean_record.get(field) for field in DECISION_FUNNEL_FIELD_NAMES}


def _row_to_decision_funnel_record(row) -> Dict:
    return {
        field: _serializable_value(row.get(field))
        for field in DECISION_FUNNEL_FIELD_NAMES
    }


def _decision_funnel_table_name() -> str:
    table_name = os.getenv("BIGQUERY_DECISION_FUNNEL_TABLE", DEFAULT_DECISION_FUNNEL_TABLE)
    _validate_identifier("BIGQUERY_DECISION_FUNNEL_TABLE", table_name)
    return table_name


def _decision_funnel_table_id() -> str:
    project_id, dataset, _, _ = _settings()
    return f"{project_id}.{dataset}.{_decision_funnel_table_name()}"


def _int_value(value) -> int:
    try:
        number = int(value)
    except (TypeError, ValueError):
        return 0
    return number
