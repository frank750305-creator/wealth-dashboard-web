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
    from .trading_ticket_service import (
        TRADE_TICKET_DIRECTIONS,
        _float_value,
        _optional_text,
        _required_choice,
        _required_text,
    )
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
    from trading_ticket_service import (
        TRADE_TICKET_DIRECTIONS,
        _float_value,
        _optional_text,
        _required_choice,
        _required_text,
    )


DEFAULT_EXECUTION_FILL_TABLE = "execution_fills"
EXECUTION_FILL_STATUSES = {"pass", "watch", "block"}
EXECUTION_FILL_FIELD_NAMES = [
    "workspace_id",
    "actor_id",
    "fill_id",
    "ticket_id",
    "route_id",
    "idempotency_key",
    "generated_at",
    "updated_at",
    "portfolio_id",
    "batch_id",
    "symbol",
    "direction",
    "fill_status",
    "ticket_amount",
    "filled_notional",
    "unfilled_notional",
    "fill_completion_rate",
    "slippage_bps",
    "commission_bps",
    "slippage_cost",
    "commission_cost",
    "total_cost",
    "cash_impact",
    "cash_impact_after_cost",
    "source",
    "note",
]


def sync_execution_fill_records(records: List[Dict]) -> Dict:
    if not records:
        raise MarketDataError("Execution fill records are required.")
    if len(records) > 500:
        raise MarketDataError("Execution fill sync supports at most 500 records per request.")

    bigquery = _bigquery_module()
    client = _bigquery_client(bigquery)
    table_id = _ensure_execution_fill_table(bigquery, client)
    clean_records = [_normalize_execution_fill_record(record) for record in records]

    try:
        errors = client.insert_rows_json(
            table_id,
            clean_records,
            row_ids=[row["idempotency_key"] for row in clean_records],
        )
    except Exception as exc:
        raise MarketDataQueryError(f"BigQuery execution fill insert failed: {exc}") from exc

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


def load_latest_execution_fill_records(
    limit: int = 100,
    workspace_id: Optional[str] = None,
    portfolio_id: Optional[str] = None,
    batch_id: Optional[str] = None,
) -> Dict:
    bigquery = _bigquery_module()
    client = _bigquery_client(bigquery)
    table_id = _execution_fill_table_id()
    bounded_limit = max(1, min(int(limit or 100), 500))
    clean_workspace_id = _normalize_key(workspace_id, DEFAULT_WORKSPACE_ID)
    clean_portfolio_id = _optional_text({"portfolio_id": portfolio_id}, "portfolio_id")
    clean_batch_id = _optional_text({"batch_id": batch_id}, "batch_id")

    if not _execution_fill_table_exists(client, table_id):
        return {
            "status": "missing",
            "table": table_id,
            "workspaceId": clean_workspace_id,
            "limit": bounded_limit,
            "fillCount": 0,
            "fills": [],
        }
    missing_fields = _execution_fill_missing_fields(client, table_id)
    if missing_fields:
        return {
            "status": "schema_outdated",
            "table": table_id,
            "workspaceId": clean_workspace_id,
            "limit": bounded_limit,
            "fillCount": 0,
            "missingFields": missing_fields,
            "fills": [],
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

    field_list = ", ".join(EXECUTION_FILL_FIELD_NAMES)
    query = f"""
    SELECT {field_list}
    FROM (
        SELECT
            {field_list},
            ROW_NUMBER() OVER (
                PARTITION BY workspace_id, fill_id
                ORDER BY updated_at DESC, generated_at DESC
            ) AS row_number
        FROM `{table_id}`
        WHERE {" AND ".join(conditions)}
    )
    WHERE row_number = 1
    ORDER BY updated_at DESC, generated_at DESC, symbol
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
        raise MarketDataQueryError(f"BigQuery latest execution fill query failed: {exc}") from exc

    return {
        "status": "loaded",
        "table": table_id,
        "workspaceId": clean_workspace_id,
        "portfolioId": clean_portfolio_id,
        "batchId": clean_batch_id,
        "limit": bounded_limit,
        "fillCount": len(rows),
        "fills": [_row_to_execution_fill_record(row) for row in rows],
    }


def _ensure_execution_fill_table(bigquery, client) -> str:
    table_id = _execution_fill_table_id()
    schema = _execution_fill_schema(bigquery)
    table = bigquery.Table(table_id, schema=schema)
    table.time_partitioning = bigquery.TimePartitioning(
        type_=bigquery.TimePartitioningType.DAY,
        field="updated_at",
    )
    table.clustering_fields = ["workspace_id", "portfolio_id", "batch_id", "fill_status"]

    try:
        client.create_table(table, exists_ok=True)
        existing_table = client.get_table(table_id)
        existing_fields = {field.name for field in existing_table.schema}
        missing_fields = [field for field in schema if field.name not in existing_fields]
        if missing_fields:
            existing_table.schema = [*existing_table.schema, *missing_fields]
            client.update_table(existing_table, ["schema"])
    except Exception as exc:
        raise MarketDataConfigError(f"BigQuery execution fill table could not be created: {exc}") from exc

    return table_id


def _execution_fill_schema(bigquery) -> List:
    return [
        bigquery.SchemaField("workspace_id", "STRING", description="Workspace or tenant id"),
        bigquery.SchemaField("actor_id", "STRING", description="User or process that generated the fill"),
        bigquery.SchemaField("fill_id", "STRING", mode="REQUIRED", description="Stable execution fill id"),
        bigquery.SchemaField("ticket_id", "STRING", mode="REQUIRED", description="Linked trade ticket id"),
        bigquery.SchemaField("route_id", "STRING", description="Linked execution route id"),
        bigquery.SchemaField("idempotency_key", "STRING", description="Stable key for retry-safe inserts"),
        bigquery.SchemaField("generated_at", "TIMESTAMP", mode="REQUIRED", description="Fill generation timestamp"),
        bigquery.SchemaField("updated_at", "TIMESTAMP", mode="REQUIRED", description="Last fill update timestamp"),
        bigquery.SchemaField("portfolio_id", "STRING", description="Portfolio or watchlist id"),
        bigquery.SchemaField("batch_id", "STRING", description="Execution batch id"),
        bigquery.SchemaField("symbol", "STRING", description="Trade symbol"),
        bigquery.SchemaField("direction", "STRING", description="Trade direction"),
        bigquery.SchemaField("fill_status", "STRING", description="Fill control status"),
        bigquery.SchemaField("ticket_amount", "FLOAT64", description="Original ticket notional"),
        bigquery.SchemaField("filled_notional", "FLOAT64", description="Filled notional"),
        bigquery.SchemaField("unfilled_notional", "FLOAT64", description="Unfilled notional"),
        bigquery.SchemaField("fill_completion_rate", "FLOAT64", description="Filled notional divided by ticket amount"),
        bigquery.SchemaField("slippage_bps", "FLOAT64", description="Slippage in bps"),
        bigquery.SchemaField("commission_bps", "FLOAT64", description="Commission in bps"),
        bigquery.SchemaField("slippage_cost", "FLOAT64", description="Estimated slippage cost"),
        bigquery.SchemaField("commission_cost", "FLOAT64", description="Estimated commission cost"),
        bigquery.SchemaField("total_cost", "FLOAT64", description="Total execution cost"),
        bigquery.SchemaField("cash_impact", "FLOAT64", description="Original ticket cash impact"),
        bigquery.SchemaField("cash_impact_after_cost", "FLOAT64", description="Cash impact after fill and costs"),
        bigquery.SchemaField("source", "STRING", description="Fill source, such as simulated or manual"),
        bigquery.SchemaField("note", "STRING", description="Fill note or control message"),
    ]


def _execution_fill_table_exists(client, table_id: str) -> bool:
    try:
        client.get_table(table_id)
        return True
    except Exception as exc:
        if exc.__class__.__name__ == "NotFound":
            return False
        raise MarketDataQueryError(f"BigQuery execution fill table lookup failed: {exc}") from exc


def _execution_fill_missing_fields(client, table_id: str) -> List[str]:
    try:
        table = client.get_table(table_id)
    except Exception as exc:
        raise MarketDataQueryError(f"BigQuery execution fill schema lookup failed: {exc}") from exc
    existing_fields = {field.name for field in table.schema}
    return [field for field in EXECUTION_FILL_FIELD_NAMES if field not in existing_fields]


def _normalize_execution_fill_record(record: Dict) -> Dict:
    workspace_id = _normalize_key(record.get("workspace_id"), DEFAULT_WORKSPACE_ID)
    actor_id = _normalize_key(record.get("actor_id"), DEFAULT_ACTOR_ID)
    fill_id = _required_text(record, "fill_id")
    generated_at = _required_text(record, "generated_at")
    updated_at = _required_text(record, "updated_at")

    clean_record = {
        "workspace_id": workspace_id,
        "actor_id": actor_id,
        "fill_id": fill_id,
        "ticket_id": _required_text(record, "ticket_id"),
        "route_id": _optional_text(record, "route_id"),
        "idempotency_key": _optional_text(record, "idempotency_key") or f"{workspace_id}:{actor_id}:{fill_id}:{updated_at}",
        "generated_at": generated_at,
        "updated_at": updated_at,
        "portfolio_id": _optional_text(record, "portfolio_id"),
        "batch_id": _optional_text(record, "batch_id"),
        "symbol": _required_text(record, "symbol"),
        "direction": _required_choice(record, "direction", TRADE_TICKET_DIRECTIONS),
        "fill_status": _required_choice(record, "fill_status", EXECUTION_FILL_STATUSES),
        "ticket_amount": _float_value(record.get("ticket_amount")),
        "filled_notional": _float_value(record.get("filled_notional")),
        "unfilled_notional": _float_value(record.get("unfilled_notional")),
        "fill_completion_rate": _float_value(record.get("fill_completion_rate")),
        "slippage_bps": _float_value(record.get("slippage_bps")),
        "commission_bps": _float_value(record.get("commission_bps")),
        "slippage_cost": _float_value(record.get("slippage_cost")),
        "commission_cost": _float_value(record.get("commission_cost")),
        "total_cost": _float_value(record.get("total_cost")),
        "cash_impact": _float_value(record.get("cash_impact")),
        "cash_impact_after_cost": _float_value(record.get("cash_impact_after_cost")),
        "source": _optional_text(record, "source") or "simulated",
        "note": _optional_text(record, "note"),
    }
    return {field: clean_record.get(field) for field in EXECUTION_FILL_FIELD_NAMES}


def _row_to_execution_fill_record(row) -> Dict:
    return {
        field: _serializable_value(row.get(field))
        for field in EXECUTION_FILL_FIELD_NAMES
    }


def _execution_fill_table_name() -> str:
    table_name = os.getenv("BIGQUERY_EXECUTION_FILL_TABLE", DEFAULT_EXECUTION_FILL_TABLE)
    _validate_identifier("BIGQUERY_EXECUTION_FILL_TABLE", table_name)
    return table_name


def _execution_fill_table_id() -> str:
    project_id, dataset, _, _ = _settings()
    return f"{project_id}.{dataset}.{_execution_fill_table_name()}"
