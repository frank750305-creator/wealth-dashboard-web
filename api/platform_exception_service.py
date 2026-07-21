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
    from .trading_ticket_service import _optional_text, _required_choice, _required_text
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
    from trading_ticket_service import _optional_text, _required_choice, _required_text


DEFAULT_PLATFORM_EXCEPTION_TABLE = "platform_exceptions"
PLATFORM_EXCEPTION_STATUSES = {"pass", "watch", "block"}
PLATFORM_EXCEPTION_PRIORITIES = {"high", "medium", "low"}
PLATFORM_EXCEPTION_FIELD_NAMES = [
    "workspace_id",
    "actor_id",
    "exception_id",
    "idempotency_key",
    "generated_at",
    "updated_at",
    "portfolio_id",
    "batch_id",
    "exception_due_days",
    "source",
    "owner",
    "item",
    "status",
    "priority",
    "due",
    "evidence",
    "next_action",
]


def sync_platform_exception_records(records: List[Dict]) -> Dict:
    if not records:
        raise MarketDataError("Platform exception records are required.")
    if len(records) > 1000:
        raise MarketDataError("Platform exception sync supports at most 1000 records per request.")

    bigquery = _bigquery_module()
    client = _bigquery_client(bigquery)
    table_id = _ensure_platform_exception_table(bigquery, client)
    clean_records = [_normalize_platform_exception_record(record) for record in records]

    try:
        errors = client.insert_rows_json(
            table_id,
            clean_records,
            row_ids=[row["idempotency_key"] for row in clean_records],
        )
    except Exception as exc:
        raise MarketDataQueryError(f"BigQuery platform exception insert failed: {exc}") from exc

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


def load_latest_platform_exception_records(
    limit: int = 100,
    workspace_id: Optional[str] = None,
    portfolio_id: Optional[str] = None,
    batch_id: Optional[str] = None,
) -> Dict:
    bigquery = _bigquery_module()
    client = _bigquery_client(bigquery)
    table_id = _platform_exception_table_id()
    bounded_limit = max(1, min(int(limit or 100), 500))
    clean_workspace_id = _normalize_key(workspace_id, DEFAULT_WORKSPACE_ID)
    clean_portfolio_id = _optional_text({"portfolio_id": portfolio_id}, "portfolio_id")
    clean_batch_id = _optional_text({"batch_id": batch_id}, "batch_id")

    if not _platform_exception_table_exists(client, table_id):
        return {
            "status": "missing",
            "table": table_id,
            "workspaceId": clean_workspace_id,
            "limit": bounded_limit,
            "exceptionCount": 0,
            "exceptions": [],
        }
    missing_fields = _platform_exception_missing_fields(client, table_id)
    if missing_fields:
        return {
            "status": "schema_outdated",
            "table": table_id,
            "workspaceId": clean_workspace_id,
            "limit": bounded_limit,
            "exceptionCount": 0,
            "missingFields": missing_fields,
            "exceptions": [],
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

    field_list = ", ".join(PLATFORM_EXCEPTION_FIELD_NAMES)
    query = f"""
    SELECT {field_list}
    FROM (
        SELECT
            {field_list},
            ROW_NUMBER() OVER (
                PARTITION BY workspace_id, exception_id
                ORDER BY updated_at DESC, generated_at DESC
            ) AS row_number
        FROM `{table_id}`
        WHERE {" AND ".join(conditions)}
    )
    WHERE row_number = 1
    ORDER BY updated_at DESC, generated_at DESC, priority, source, item
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
        raise MarketDataQueryError(f"BigQuery latest platform exception query failed: {exc}") from exc

    return {
        "status": "loaded",
        "table": table_id,
        "workspaceId": clean_workspace_id,
        "portfolioId": clean_portfolio_id,
        "batchId": clean_batch_id,
        "limit": bounded_limit,
        "exceptionCount": len(rows),
        "exceptions": [_row_to_platform_exception_record(row) for row in rows],
    }


def _ensure_platform_exception_table(bigquery, client) -> str:
    table_id = _platform_exception_table_id()
    schema = _platform_exception_schema(bigquery)
    table = bigquery.Table(table_id, schema=schema)
    table.time_partitioning = bigquery.TimePartitioning(
        type_=bigquery.TimePartitioningType.DAY,
        field="updated_at",
    )
    table.clustering_fields = ["workspace_id", "portfolio_id", "batch_id", "priority"]

    try:
        client.create_table(table, exists_ok=True)
        existing_table = client.get_table(table_id)
        existing_fields = {field.name for field in existing_table.schema}
        missing_fields = [field for field in schema if field.name not in existing_fields]
        if missing_fields:
            existing_table.schema = [*existing_table.schema, *missing_fields]
            client.update_table(existing_table, ["schema"])
    except Exception as exc:
        raise MarketDataConfigError(f"BigQuery platform exception table could not be created: {exc}") from exc

    return table_id


def _platform_exception_schema(bigquery) -> List:
    return [
        bigquery.SchemaField("workspace_id", "STRING", description="Workspace or tenant id"),
        bigquery.SchemaField("actor_id", "STRING", description="User or process that generated the exception"),
        bigquery.SchemaField("exception_id", "STRING", mode="REQUIRED", description="Stable platform exception id"),
        bigquery.SchemaField("idempotency_key", "STRING", description="Stable key for retry-safe inserts"),
        bigquery.SchemaField("generated_at", "TIMESTAMP", mode="REQUIRED", description="Exception generation timestamp"),
        bigquery.SchemaField("updated_at", "TIMESTAMP", mode="REQUIRED", description="Last exception update timestamp"),
        bigquery.SchemaField("portfolio_id", "STRING", description="Portfolio or watchlist id"),
        bigquery.SchemaField("batch_id", "STRING", description="Execution batch id"),
        bigquery.SchemaField("exception_due_days", "INT64", description="Default exception due days"),
        bigquery.SchemaField("source", "STRING", description="Exception source"),
        bigquery.SchemaField("owner", "STRING", description="Responsible owner"),
        bigquery.SchemaField("item", "STRING", description="Exception item"),
        bigquery.SchemaField("status", "STRING", description="Exception control status"),
        bigquery.SchemaField("priority", "STRING", description="Exception priority"),
        bigquery.SchemaField("due", "STRING", description="Due label"),
        bigquery.SchemaField("evidence", "STRING", description="Exception evidence"),
        bigquery.SchemaField("next_action", "STRING", description="Next operational action"),
    ]


def _platform_exception_table_exists(client, table_id: str) -> bool:
    try:
        client.get_table(table_id)
        return True
    except Exception as exc:
        if exc.__class__.__name__ == "NotFound":
            return False
        raise MarketDataQueryError(f"BigQuery platform exception table lookup failed: {exc}") from exc


def _platform_exception_missing_fields(client, table_id: str) -> List[str]:
    try:
        table = client.get_table(table_id)
    except Exception as exc:
        raise MarketDataQueryError(f"BigQuery platform exception schema lookup failed: {exc}") from exc
    existing_fields = {field.name for field in table.schema}
    return [field for field in PLATFORM_EXCEPTION_FIELD_NAMES if field not in existing_fields]


def _normalize_platform_exception_record(record: Dict) -> Dict:
    workspace_id = _normalize_key(record.get("workspace_id"), DEFAULT_WORKSPACE_ID)
    actor_id = _normalize_key(record.get("actor_id"), DEFAULT_ACTOR_ID)
    exception_id = _required_text(record, "exception_id")
    generated_at = _required_text(record, "generated_at")
    updated_at = _required_text(record, "updated_at")

    clean_record = {
        "workspace_id": workspace_id,
        "actor_id": actor_id,
        "exception_id": exception_id,
        "idempotency_key": _optional_text(record, "idempotency_key") or f"{workspace_id}:{actor_id}:{exception_id}:{updated_at}",
        "generated_at": generated_at,
        "updated_at": updated_at,
        "portfolio_id": _optional_text(record, "portfolio_id"),
        "batch_id": _optional_text(record, "batch_id"),
        "exception_due_days": _int_value(record.get("exception_due_days")),
        "source": _required_text(record, "source"),
        "owner": _required_text(record, "owner"),
        "item": _required_text(record, "item"),
        "status": _required_choice(record, "status", PLATFORM_EXCEPTION_STATUSES),
        "priority": _required_choice(record, "priority", PLATFORM_EXCEPTION_PRIORITIES),
        "due": _optional_text(record, "due"),
        "evidence": _optional_text(record, "evidence"),
        "next_action": _optional_text(record, "next_action"),
    }
    return {field: clean_record.get(field) for field in PLATFORM_EXCEPTION_FIELD_NAMES}


def _row_to_platform_exception_record(row) -> Dict:
    return {
        field: _serializable_value(row.get(field))
        for field in PLATFORM_EXCEPTION_FIELD_NAMES
    }


def _platform_exception_table_name() -> str:
    table_name = os.getenv("BIGQUERY_PLATFORM_EXCEPTION_TABLE", DEFAULT_PLATFORM_EXCEPTION_TABLE)
    _validate_identifier("BIGQUERY_PLATFORM_EXCEPTION_TABLE", table_name)
    return table_name


def _platform_exception_table_id() -> str:
    project_id, dataset, _, _ = _settings()
    return f"{project_id}.{dataset}.{_platform_exception_table_name()}"


def _int_value(value) -> int:
    try:
        number = int(value)
    except (TypeError, ValueError):
        return 0
    return number
