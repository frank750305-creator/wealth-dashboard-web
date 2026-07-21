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


DEFAULT_MARKET_ALERT_TABLE = "market_alert_events"
MARKET_ALERT_STATUSES = {"pass", "watch", "block"}
MARKET_ALERT_PRIORITIES = {"high", "medium", "low"}
MARKET_ALERT_FIELD_NAMES = [
    "workspace_id",
    "actor_id",
    "alert_id",
    "idempotency_key",
    "generated_at",
    "updated_at",
    "portfolio_id",
    "batch_id",
    "source",
    "title",
    "status",
    "priority",
    "owner",
    "evidence",
    "action",
    "command_status",
    "command_priority",
    "operating_mode",
    "release_gate",
    "headline",
    "blocked_flow",
    "focus_owner",
    "focus_source",
    "immediate_action",
    "next_review",
    "total_alerts",
    "high_priority_count",
    "block_count",
    "watch_count",
    "owner_count",
    "runbook_count",
    "source_system",
]


def sync_market_alert_records(records: List[Dict]) -> Dict:
    if not records:
        raise MarketDataError("Market alert records are required.")
    if len(records) > 300:
        raise MarketDataError("Market alert sync supports at most 300 records per request.")

    bigquery = _bigquery_module()
    client = _bigquery_client(bigquery)
    table_id = _ensure_market_alert_table(bigquery, client)
    clean_records = [_normalize_market_alert_record(record) for record in records]

    try:
        errors = client.insert_rows_json(
            table_id,
            clean_records,
            row_ids=[row["idempotency_key"] for row in clean_records],
        )
    except Exception as exc:
        raise MarketDataQueryError(f"BigQuery market alert insert failed: {exc}") from exc

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


def load_latest_market_alert_records(
    limit: int = 100,
    workspace_id: Optional[str] = None,
    portfolio_id: Optional[str] = None,
    batch_id: Optional[str] = None,
) -> Dict:
    bigquery = _bigquery_module()
    client = _bigquery_client(bigquery)
    table_id = _market_alert_table_id()
    bounded_limit = max(1, min(int(limit or 100), 500))
    clean_workspace_id = _normalize_key(workspace_id, DEFAULT_WORKSPACE_ID)
    clean_portfolio_id = _optional_text({"portfolio_id": portfolio_id}, "portfolio_id")
    clean_batch_id = _optional_text({"batch_id": batch_id}, "batch_id")

    if not _market_alert_table_exists(client, table_id):
        return {
            "status": "missing",
            "table": table_id,
            "workspaceId": clean_workspace_id,
            "limit": bounded_limit,
            "alertCount": 0,
            "alerts": [],
        }
    missing_fields = _market_alert_missing_fields(client, table_id)
    if missing_fields:
        return {
            "status": "schema_outdated",
            "table": table_id,
            "workspaceId": clean_workspace_id,
            "limit": bounded_limit,
            "alertCount": 0,
            "missingFields": missing_fields,
            "alerts": [],
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

    field_list = ", ".join(MARKET_ALERT_FIELD_NAMES)
    query = f"""
    SELECT {field_list}
    FROM (
        SELECT
            {field_list},
            ROW_NUMBER() OVER (
                PARTITION BY workspace_id, alert_id
                ORDER BY updated_at DESC, generated_at DESC
            ) AS row_number
        FROM `{table_id}`
        WHERE {" AND ".join(conditions)}
    )
    WHERE row_number = 1
    ORDER BY updated_at DESC, generated_at DESC, priority, status, source, title
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
        raise MarketDataQueryError(f"BigQuery latest market alert query failed: {exc}") from exc

    return {
        "status": "loaded",
        "table": table_id,
        "workspaceId": clean_workspace_id,
        "portfolioId": clean_portfolio_id,
        "batchId": clean_batch_id,
        "limit": bounded_limit,
        "alertCount": len(rows),
        "alerts": [_row_to_market_alert_record(row) for row in rows],
    }


def _ensure_market_alert_table(bigquery, client) -> str:
    table_id = _market_alert_table_id()
    schema = _market_alert_schema(bigquery)
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
        raise MarketDataConfigError(f"BigQuery market alert table could not be created: {exc}") from exc

    return table_id


def _market_alert_schema(bigquery) -> List:
    return [
        bigquery.SchemaField("workspace_id", "STRING", description="Workspace or tenant id"),
        bigquery.SchemaField("actor_id", "STRING", description="User or process that generated the alert"),
        bigquery.SchemaField("alert_id", "STRING", mode="REQUIRED", description="Stable market alert id"),
        bigquery.SchemaField("idempotency_key", "STRING", description="Stable key for retry-safe inserts"),
        bigquery.SchemaField("generated_at", "TIMESTAMP", mode="REQUIRED", description="Alert generation timestamp"),
        bigquery.SchemaField("updated_at", "TIMESTAMP", mode="REQUIRED", description="Last alert update timestamp"),
        bigquery.SchemaField("portfolio_id", "STRING", description="Portfolio or watchlist id"),
        bigquery.SchemaField("batch_id", "STRING", description="Execution batch id"),
        bigquery.SchemaField("source", "STRING", description="Alert source"),
        bigquery.SchemaField("title", "STRING", description="Alert title"),
        bigquery.SchemaField("status", "STRING", description="Alert status"),
        bigquery.SchemaField("priority", "STRING", description="Alert priority"),
        bigquery.SchemaField("owner", "STRING", description="Responsible owner"),
        bigquery.SchemaField("evidence", "STRING", description="Alert evidence"),
        bigquery.SchemaField("action", "STRING", description="Recommended action"),
        bigquery.SchemaField("command_status", "STRING", description="Command summary status"),
        bigquery.SchemaField("command_priority", "STRING", description="Command summary priority"),
        bigquery.SchemaField("operating_mode", "STRING", description="Operating mode"),
        bigquery.SchemaField("release_gate", "STRING", description="Release gate label"),
        bigquery.SchemaField("headline", "STRING", description="Command headline"),
        bigquery.SchemaField("blocked_flow", "STRING", description="Blocked workflow"),
        bigquery.SchemaField("focus_owner", "STRING", description="First owner to handle"),
        bigquery.SchemaField("focus_source", "STRING", description="First source to handle"),
        bigquery.SchemaField("immediate_action", "STRING", description="Immediate action"),
        bigquery.SchemaField("next_review", "STRING", description="Next review cadence"),
        bigquery.SchemaField("total_alerts", "INT64", description="Total alert count"),
        bigquery.SchemaField("high_priority_count", "INT64", description="High priority alert count"),
        bigquery.SchemaField("block_count", "INT64", description="Blocked alert count"),
        bigquery.SchemaField("watch_count", "INT64", description="Watch alert count"),
        bigquery.SchemaField("owner_count", "INT64", description="Owner queue count"),
        bigquery.SchemaField("runbook_count", "INT64", description="Runbook item count"),
        bigquery.SchemaField("source_system", "STRING", description="Alert source system"),
    ]


def _market_alert_table_exists(client, table_id: str) -> bool:
    try:
        client.get_table(table_id)
        return True
    except Exception as exc:
        if exc.__class__.__name__ == "NotFound":
            return False
        raise MarketDataQueryError(f"BigQuery market alert table lookup failed: {exc}") from exc


def _market_alert_missing_fields(client, table_id: str) -> List[str]:
    try:
        table = client.get_table(table_id)
    except Exception as exc:
        raise MarketDataQueryError(f"BigQuery market alert schema lookup failed: {exc}") from exc
    existing_fields = {field.name for field in table.schema}
    return [field for field in MARKET_ALERT_FIELD_NAMES if field not in existing_fields]


def _normalize_market_alert_record(record: Dict) -> Dict:
    workspace_id = _normalize_key(record.get("workspace_id"), DEFAULT_WORKSPACE_ID)
    actor_id = _normalize_key(record.get("actor_id"), DEFAULT_ACTOR_ID)
    alert_id = _required_text(record, "alert_id")
    generated_at = _required_text(record, "generated_at")
    updated_at = _required_text(record, "updated_at")

    clean_record = {
        "workspace_id": workspace_id,
        "actor_id": actor_id,
        "alert_id": alert_id,
        "idempotency_key": _optional_text(record, "idempotency_key") or f"{workspace_id}:{actor_id}:{alert_id}:{updated_at}",
        "generated_at": generated_at,
        "updated_at": updated_at,
        "portfolio_id": _optional_text(record, "portfolio_id"),
        "batch_id": _optional_text(record, "batch_id"),
        "source": _required_text(record, "source"),
        "title": _required_text(record, "title"),
        "status": _required_choice(record, "status", MARKET_ALERT_STATUSES),
        "priority": _required_choice(record, "priority", MARKET_ALERT_PRIORITIES),
        "owner": _optional_text(record, "owner"),
        "evidence": _optional_text(record, "evidence"),
        "action": _optional_text(record, "action"),
        "command_status": _required_choice(record, "command_status", MARKET_ALERT_STATUSES),
        "command_priority": _required_choice(record, "command_priority", MARKET_ALERT_PRIORITIES),
        "operating_mode": _optional_text(record, "operating_mode"),
        "release_gate": _optional_text(record, "release_gate"),
        "headline": _optional_text(record, "headline"),
        "blocked_flow": _optional_text(record, "blocked_flow"),
        "focus_owner": _optional_text(record, "focus_owner"),
        "focus_source": _optional_text(record, "focus_source"),
        "immediate_action": _optional_text(record, "immediate_action"),
        "next_review": _optional_text(record, "next_review"),
        "total_alerts": _int_value(record.get("total_alerts")),
        "high_priority_count": _int_value(record.get("high_priority_count")),
        "block_count": _int_value(record.get("block_count")),
        "watch_count": _int_value(record.get("watch_count")),
        "owner_count": _int_value(record.get("owner_count")),
        "runbook_count": _int_value(record.get("runbook_count")),
        "source_system": _optional_text(record, "source_system") or "market_alert_center",
    }
    return {field: clean_record.get(field) for field in MARKET_ALERT_FIELD_NAMES}


def _row_to_market_alert_record(row) -> Dict:
    return {
        field: _serializable_value(row.get(field))
        for field in MARKET_ALERT_FIELD_NAMES
    }


def _market_alert_table_name() -> str:
    table_name = os.getenv("BIGQUERY_MARKET_ALERT_TABLE", DEFAULT_MARKET_ALERT_TABLE)
    _validate_identifier("BIGQUERY_MARKET_ALERT_TABLE", table_name)
    return table_name


def _market_alert_table_id() -> str:
    project_id, dataset, _, _ = _settings()
    return f"{project_id}.{dataset}.{_market_alert_table_name()}"


def _int_value(value) -> int:
    try:
        number = int(value)
    except (TypeError, ValueError):
        return 0
    return number
