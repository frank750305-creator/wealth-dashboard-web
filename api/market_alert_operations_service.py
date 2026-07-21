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
    from .market_alert_service import (
        _market_alert_missing_fields,
        _market_alert_table_exists,
        _market_alert_table_id,
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
    from trading_ticket_service import _optional_text, _required_choice, _required_text
    from market_alert_service import (
        _market_alert_missing_fields,
        _market_alert_table_exists,
        _market_alert_table_id,
    )


DEFAULT_MARKET_ALERT_OWNER_QUEUE_TABLE = "market_alert_owner_queues"
DEFAULT_MARKET_ALERT_RUNBOOK_TABLE = "market_alert_runbooks"
MARKET_ALERT_OPERATION_STATUSES = {"pass", "watch", "block"}
MARKET_ALERT_OPERATION_PRIORITIES = {"high", "medium", "low"}
OWNER_QUEUE_FIELD_NAMES = [
    "workspace_id",
    "actor_id",
    "queue_id",
    "idempotency_key",
    "generated_at",
    "updated_at",
    "portfolio_id",
    "batch_id",
    "owner",
    "status",
    "priority",
    "total",
    "high",
    "medium",
    "low",
    "block",
    "watch",
    "pass_count",
    "top_source",
    "next_action",
    "command_status",
    "command_priority",
    "total_alerts",
    "source_system",
]
RUNBOOK_FIELD_NAMES = [
    "workspace_id",
    "actor_id",
    "runbook_id",
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
    "deadline",
    "trigger",
    "diagnose",
    "resolve",
    "verify",
    "escalation",
    "command_status",
    "command_priority",
    "total_alerts",
    "source_system",
]
MARKET_ALERT_AUDIT_FIELD_NAMES = [
    "workspace_id",
    "actor_id",
    "generated_at",
    "portfolio_id",
    "batch_id",
    "latest_updated_at",
    "alert_count",
    "high_priority_count",
    "block_count",
    "watch_count",
    "alert_owner_count",
    "owner_queue_count",
    "owner_queue_total",
    "runbook_count",
]


def sync_market_alert_owner_queue_records(records: List[Dict]) -> Dict:
    if not records:
        raise MarketDataError("Market alert owner queue records are required.")
    if len(records) > 200:
        raise MarketDataError("Market alert owner queue sync supports at most 200 records per request.")

    bigquery = _bigquery_module()
    client = _bigquery_client(bigquery)
    table_id = _ensure_owner_queue_table(bigquery, client)
    clean_records = [_normalize_owner_queue_record(record) for record in records]

    try:
        errors = client.insert_rows_json(
            table_id,
            clean_records,
            row_ids=[row["idempotency_key"] for row in clean_records],
        )
    except Exception as exc:
        raise MarketDataQueryError(f"BigQuery market alert owner queue insert failed: {exc}") from exc

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


def sync_market_alert_runbook_records(records: List[Dict]) -> Dict:
    if not records:
        raise MarketDataError("Market alert runbook records are required.")
    if len(records) > 300:
        raise MarketDataError("Market alert runbook sync supports at most 300 records per request.")

    bigquery = _bigquery_module()
    client = _bigquery_client(bigquery)
    table_id = _ensure_runbook_table(bigquery, client)
    clean_records = [_normalize_runbook_record(record) for record in records]

    try:
        errors = client.insert_rows_json(
            table_id,
            clean_records,
            row_ids=[row["idempotency_key"] for row in clean_records],
        )
    except Exception as exc:
        raise MarketDataQueryError(f"BigQuery market alert runbook insert failed: {exc}") from exc

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


def load_latest_market_alert_owner_queue_records(
    limit: int = 100,
    workspace_id: Optional[str] = None,
    portfolio_id: Optional[str] = None,
    batch_id: Optional[str] = None,
) -> Dict:
    bigquery = _bigquery_module()
    client = _bigquery_client(bigquery)
    table_id = _owner_queue_table_id()
    bounded_limit = max(1, min(int(limit or 100), 500))
    clean_workspace_id = _normalize_key(workspace_id, DEFAULT_WORKSPACE_ID)
    clean_portfolio_id = _optional_text({"portfolio_id": portfolio_id}, "portfolio_id")
    clean_batch_id = _optional_text({"batch_id": batch_id}, "batch_id")

    if not _table_exists(client, table_id, "market alert owner queue"):
        return {
            "status": "missing",
            "table": table_id,
            "workspaceId": clean_workspace_id,
            "limit": bounded_limit,
            "queueCount": 0,
            "queues": [],
        }
    missing_fields = _missing_fields(client, table_id, OWNER_QUEUE_FIELD_NAMES, "market alert owner queue")
    if missing_fields:
        return {
            "status": "schema_outdated",
            "table": table_id,
            "workspaceId": clean_workspace_id,
            "limit": bounded_limit,
            "queueCount": 0,
            "missingFields": missing_fields,
            "queues": [],
        }

    rows = _latest_rows(
        bigquery,
        client,
        table_id,
        OWNER_QUEUE_FIELD_NAMES,
        "queue_id",
        "priority, status, owner",
        bounded_limit,
        clean_workspace_id,
        clean_portfolio_id,
        clean_batch_id,
        "market alert owner queue",
    )

    return {
        "status": "loaded",
        "table": table_id,
        "workspaceId": clean_workspace_id,
        "portfolioId": clean_portfolio_id,
        "batchId": clean_batch_id,
        "limit": bounded_limit,
        "queueCount": len(rows),
        "queues": [_row_to_record(row, OWNER_QUEUE_FIELD_NAMES) for row in rows],
    }


def load_latest_market_alert_runbook_records(
    limit: int = 100,
    workspace_id: Optional[str] = None,
    portfolio_id: Optional[str] = None,
    batch_id: Optional[str] = None,
) -> Dict:
    bigquery = _bigquery_module()
    client = _bigquery_client(bigquery)
    table_id = _runbook_table_id()
    bounded_limit = max(1, min(int(limit or 100), 500))
    clean_workspace_id = _normalize_key(workspace_id, DEFAULT_WORKSPACE_ID)
    clean_portfolio_id = _optional_text({"portfolio_id": portfolio_id}, "portfolio_id")
    clean_batch_id = _optional_text({"batch_id": batch_id}, "batch_id")

    if not _table_exists(client, table_id, "market alert runbook"):
        return {
            "status": "missing",
            "table": table_id,
            "workspaceId": clean_workspace_id,
            "limit": bounded_limit,
            "runbookCount": 0,
            "runbooks": [],
        }
    missing_fields = _missing_fields(client, table_id, RUNBOOK_FIELD_NAMES, "market alert runbook")
    if missing_fields:
        return {
            "status": "schema_outdated",
            "table": table_id,
            "workspaceId": clean_workspace_id,
            "limit": bounded_limit,
            "runbookCount": 0,
            "missingFields": missing_fields,
            "runbooks": [],
        }

    rows = _latest_rows(
        bigquery,
        client,
        table_id,
        RUNBOOK_FIELD_NAMES,
        "runbook_id",
        "priority, status, source, title",
        bounded_limit,
        clean_workspace_id,
        clean_portfolio_id,
        clean_batch_id,
        "market alert runbook",
    )

    return {
        "status": "loaded",
        "table": table_id,
        "workspaceId": clean_workspace_id,
        "portfolioId": clean_portfolio_id,
        "batchId": clean_batch_id,
        "limit": bounded_limit,
        "runbookCount": len(rows),
        "runbooks": [_row_to_record(row, RUNBOOK_FIELD_NAMES) for row in rows],
    }


def load_market_alert_sync_audit(
    limit: int = 12,
    workspace_id: Optional[str] = None,
    portfolio_id: Optional[str] = None,
    batch_id: Optional[str] = None,
) -> Dict:
    bigquery = _bigquery_module()
    client = _bigquery_client(bigquery)
    alert_table_id = _market_alert_table_id()
    owner_queue_table_id = _owner_queue_table_id()
    runbook_table_id = _runbook_table_id()
    bounded_limit = max(1, min(int(limit or 12), 50))
    clean_workspace_id = _normalize_key(workspace_id, DEFAULT_WORKSPACE_ID)
    clean_portfolio_id = _optional_text({"portfolio_id": portfolio_id}, "portfolio_id")
    clean_batch_id = _optional_text({"batch_id": batch_id}, "batch_id")

    missing_tables = []
    if not _market_alert_table_exists(client, alert_table_id):
        missing_tables.append(alert_table_id)
    if not _table_exists(client, owner_queue_table_id, "market alert owner queue"):
        missing_tables.append(owner_queue_table_id)
    if not _table_exists(client, runbook_table_id, "market alert runbook"):
        missing_tables.append(runbook_table_id)
    if missing_tables:
        return {
            "status": "missing",
            "table": alert_table_id,
            "ownerQueueTable": owner_queue_table_id,
            "runbookTable": runbook_table_id,
            "workspaceId": clean_workspace_id,
            "portfolioId": clean_portfolio_id,
            "batchId": clean_batch_id,
            "limit": bounded_limit,
            "auditCount": 0,
            "missingTables": missing_tables,
            "auditRecords": [],
        }

    missing_fields = [
        *[f"market_alert_events.{field}" for field in _market_alert_missing_fields(client, alert_table_id)],
        *[f"market_alert_owner_queues.{field}" for field in _missing_fields(client, owner_queue_table_id, OWNER_QUEUE_FIELD_NAMES, "market alert owner queue")],
        *[f"market_alert_runbooks.{field}" for field in _missing_fields(client, runbook_table_id, RUNBOOK_FIELD_NAMES, "market alert runbook")],
    ]
    if missing_fields:
        return {
            "status": "schema_outdated",
            "table": alert_table_id,
            "ownerQueueTable": owner_queue_table_id,
            "runbookTable": runbook_table_id,
            "workspaceId": clean_workspace_id,
            "portfolioId": clean_portfolio_id,
            "batchId": clean_batch_id,
            "limit": bounded_limit,
            "auditCount": 0,
            "missingFields": missing_fields,
            "auditRecords": [],
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
    where_clause = " AND ".join(conditions)

    query = f"""
    WITH alert_batches AS (
        SELECT
            workspace_id,
            ANY_VALUE(actor_id) AS actor_id,
            generated_at,
            portfolio_id,
            batch_id,
            COUNT(1) AS alert_count,
            COUNTIF(priority = 'high') AS high_priority_count,
            COUNTIF(status = 'block') AS block_count,
            COUNTIF(status = 'watch') AS watch_count,
            COUNT(DISTINCT owner) AS alert_owner_count,
            MAX(updated_at) AS latest_alert_updated_at
        FROM `{alert_table_id}`
        WHERE {where_clause}
        GROUP BY workspace_id, generated_at, portfolio_id, batch_id
    ),
    owner_batches AS (
        SELECT
            workspace_id,
            generated_at,
            portfolio_id,
            batch_id,
            COUNT(1) AS owner_queue_count,
            SUM(total) AS owner_queue_total,
            MAX(updated_at) AS latest_owner_queue_updated_at
        FROM `{owner_queue_table_id}`
        WHERE {where_clause}
        GROUP BY workspace_id, generated_at, portfolio_id, batch_id
    ),
    runbook_batches AS (
        SELECT
            workspace_id,
            generated_at,
            portfolio_id,
            batch_id,
            COUNT(1) AS runbook_count,
            MAX(updated_at) AS latest_runbook_updated_at
        FROM `{runbook_table_id}`
        WHERE {where_clause}
        GROUP BY workspace_id, generated_at, portfolio_id, batch_id
    )
    SELECT
        alerts.workspace_id,
        alerts.actor_id,
        alerts.generated_at,
        alerts.portfolio_id,
        alerts.batch_id,
        (
            SELECT MAX(ts)
            FROM UNNEST([
                alerts.latest_alert_updated_at,
                owner_queues.latest_owner_queue_updated_at,
                runbooks.latest_runbook_updated_at
            ]) AS ts
        ) AS latest_updated_at,
        alerts.alert_count,
        alerts.high_priority_count,
        alerts.block_count,
        alerts.watch_count,
        alerts.alert_owner_count,
        COALESCE(owner_queues.owner_queue_count, 0) AS owner_queue_count,
        COALESCE(owner_queues.owner_queue_total, 0) AS owner_queue_total,
        COALESCE(runbooks.runbook_count, 0) AS runbook_count
    FROM alert_batches AS alerts
    LEFT JOIN owner_batches AS owner_queues
        ON alerts.workspace_id = owner_queues.workspace_id
        AND alerts.generated_at = owner_queues.generated_at
        AND alerts.portfolio_id = owner_queues.portfolio_id
        AND alerts.batch_id = owner_queues.batch_id
    LEFT JOIN runbook_batches AS runbooks
        ON alerts.workspace_id = runbooks.workspace_id
        AND alerts.generated_at = runbooks.generated_at
        AND alerts.portfolio_id = runbooks.portfolio_id
        AND alerts.batch_id = runbooks.batch_id
    ORDER BY alerts.generated_at DESC
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
        raise MarketDataQueryError(f"BigQuery market alert sync audit query failed: {exc}") from exc

    return {
        "status": "loaded",
        "table": alert_table_id,
        "ownerQueueTable": owner_queue_table_id,
        "runbookTable": runbook_table_id,
        "workspaceId": clean_workspace_id,
        "portfolioId": clean_portfolio_id,
        "batchId": clean_batch_id,
        "limit": bounded_limit,
        "auditCount": len(rows),
        "auditRecords": [_row_to_record(row, MARKET_ALERT_AUDIT_FIELD_NAMES) for row in rows],
    }


def _ensure_owner_queue_table(bigquery, client) -> str:
    table_id = _owner_queue_table_id()
    schema = _owner_queue_schema(bigquery)
    _ensure_table(bigquery, client, table_id, schema, "market alert owner queue")
    return table_id


def _ensure_runbook_table(bigquery, client) -> str:
    table_id = _runbook_table_id()
    schema = _runbook_schema(bigquery)
    _ensure_table(bigquery, client, table_id, schema, "market alert runbook")
    return table_id


def _ensure_table(bigquery, client, table_id: str, schema: List, label: str) -> None:
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
        raise MarketDataConfigError(f"BigQuery {label} table could not be created: {exc}") from exc


def _owner_queue_schema(bigquery) -> List:
    return [
        bigquery.SchemaField("workspace_id", "STRING", description="Workspace or tenant id"),
        bigquery.SchemaField("actor_id", "STRING", description="User or process that generated the queue"),
        bigquery.SchemaField("queue_id", "STRING", mode="REQUIRED", description="Stable owner queue id"),
        bigquery.SchemaField("idempotency_key", "STRING", description="Stable key for retry-safe inserts"),
        bigquery.SchemaField("generated_at", "TIMESTAMP", mode="REQUIRED", description="Queue generation timestamp"),
        bigquery.SchemaField("updated_at", "TIMESTAMP", mode="REQUIRED", description="Last queue update timestamp"),
        bigquery.SchemaField("portfolio_id", "STRING", description="Portfolio or watchlist id"),
        bigquery.SchemaField("batch_id", "STRING", description="Execution batch id"),
        bigquery.SchemaField("owner", "STRING", description="Responsible owner"),
        bigquery.SchemaField("status", "STRING", description="Owner queue status"),
        bigquery.SchemaField("priority", "STRING", description="Owner queue priority"),
        bigquery.SchemaField("total", "INT64", description="Total assigned alerts"),
        bigquery.SchemaField("high", "INT64", description="High priority count"),
        bigquery.SchemaField("medium", "INT64", description="Medium priority count"),
        bigquery.SchemaField("low", "INT64", description="Low priority count"),
        bigquery.SchemaField("block", "INT64", description="Blocked alert count"),
        bigquery.SchemaField("watch", "INT64", description="Watch alert count"),
        bigquery.SchemaField("pass_count", "INT64", description="Pass alert count"),
        bigquery.SchemaField("top_source", "STRING", description="Most frequent alert source"),
        bigquery.SchemaField("next_action", "STRING", description="Next action for owner"),
        bigquery.SchemaField("command_status", "STRING", description="Command summary status"),
        bigquery.SchemaField("command_priority", "STRING", description="Command summary priority"),
        bigquery.SchemaField("total_alerts", "INT64", description="Total alert count in command summary"),
        bigquery.SchemaField("source_system", "STRING", description="Source system"),
    ]


def _runbook_schema(bigquery) -> List:
    return [
        bigquery.SchemaField("workspace_id", "STRING", description="Workspace or tenant id"),
        bigquery.SchemaField("actor_id", "STRING", description="User or process that generated the runbook"),
        bigquery.SchemaField("runbook_id", "STRING", mode="REQUIRED", description="Stable runbook id"),
        bigquery.SchemaField("idempotency_key", "STRING", description="Stable key for retry-safe inserts"),
        bigquery.SchemaField("generated_at", "TIMESTAMP", mode="REQUIRED", description="Runbook generation timestamp"),
        bigquery.SchemaField("updated_at", "TIMESTAMP", mode="REQUIRED", description="Last runbook update timestamp"),
        bigquery.SchemaField("portfolio_id", "STRING", description="Portfolio or watchlist id"),
        bigquery.SchemaField("batch_id", "STRING", description="Execution batch id"),
        bigquery.SchemaField("source", "STRING", description="Alert source"),
        bigquery.SchemaField("title", "STRING", description="Runbook title"),
        bigquery.SchemaField("status", "STRING", description="Runbook status"),
        bigquery.SchemaField("priority", "STRING", description="Runbook priority"),
        bigquery.SchemaField("owner", "STRING", description="Responsible owner"),
        bigquery.SchemaField("deadline", "STRING", description="Handling deadline"),
        bigquery.SchemaField("trigger", "STRING", description="Runbook trigger"),
        bigquery.SchemaField("diagnose", "STRING", description="Diagnosis step"),
        bigquery.SchemaField("resolve", "STRING", description="Resolution step"),
        bigquery.SchemaField("verify", "STRING", description="Verification step"),
        bigquery.SchemaField("escalation", "STRING", description="Escalation rule"),
        bigquery.SchemaField("command_status", "STRING", description="Command summary status"),
        bigquery.SchemaField("command_priority", "STRING", description="Command summary priority"),
        bigquery.SchemaField("total_alerts", "INT64", description="Total alert count in command summary"),
        bigquery.SchemaField("source_system", "STRING", description="Source system"),
    ]


def _latest_rows(
    bigquery,
    client,
    table_id: str,
    field_names: List[str],
    entity_id_field: str,
    order_fields: str,
    bounded_limit: int,
    workspace_id: str,
    portfolio_id: Optional[str],
    batch_id: Optional[str],
    label: str,
) -> List:
    conditions = ["workspace_id = @workspace_id"]
    parameters = [bigquery.ScalarQueryParameter("workspace_id", "STRING", workspace_id)]
    if portfolio_id:
        conditions.append("portfolio_id = @portfolio_id")
        parameters.append(bigquery.ScalarQueryParameter("portfolio_id", "STRING", portfolio_id))
    if batch_id:
        conditions.append("batch_id = @batch_id")
        parameters.append(bigquery.ScalarQueryParameter("batch_id", "STRING", batch_id))
    parameters.append(bigquery.ScalarQueryParameter("limit", "INT64", bounded_limit))

    field_list = ", ".join(field_names)
    query = f"""
    SELECT {field_list}
    FROM (
        SELECT
            {field_list},
            ROW_NUMBER() OVER (
                PARTITION BY workspace_id, {entity_id_field}
                ORDER BY updated_at DESC, generated_at DESC
            ) AS row_number
        FROM `{table_id}`
        WHERE {" AND ".join(conditions)}
    )
    WHERE row_number = 1
    ORDER BY updated_at DESC, generated_at DESC, {order_fields}
    LIMIT @limit
    """

    try:
        return list(
            client.query(
                query,
                job_config=bigquery.QueryJobConfig(query_parameters=parameters),
            ).result()
        )
    except Exception as exc:
        raise MarketDataQueryError(f"BigQuery latest {label} query failed: {exc}") from exc


def _table_exists(client, table_id: str, label: str) -> bool:
    try:
        client.get_table(table_id)
        return True
    except Exception as exc:
        if exc.__class__.__name__ == "NotFound":
            return False
        raise MarketDataQueryError(f"BigQuery {label} table lookup failed: {exc}") from exc


def _missing_fields(client, table_id: str, field_names: List[str], label: str) -> List[str]:
    try:
        table = client.get_table(table_id)
    except Exception as exc:
        raise MarketDataQueryError(f"BigQuery {label} schema lookup failed: {exc}") from exc
    existing_fields = {field.name for field in table.schema}
    return [field for field in field_names if field not in existing_fields]


def _normalize_owner_queue_record(record: Dict) -> Dict:
    workspace_id = _normalize_key(record.get("workspace_id"), DEFAULT_WORKSPACE_ID)
    actor_id = _normalize_key(record.get("actor_id"), DEFAULT_ACTOR_ID)
    queue_id = _required_text(record, "queue_id")
    generated_at = _required_text(record, "generated_at")
    updated_at = _required_text(record, "updated_at")

    clean_record = {
        "workspace_id": workspace_id,
        "actor_id": actor_id,
        "queue_id": queue_id,
        "idempotency_key": _optional_text(record, "idempotency_key") or f"{workspace_id}:{actor_id}:{queue_id}:{updated_at}",
        "generated_at": generated_at,
        "updated_at": updated_at,
        "portfolio_id": _optional_text(record, "portfolio_id"),
        "batch_id": _optional_text(record, "batch_id"),
        "owner": _required_text(record, "owner"),
        "status": _required_choice(record, "status", MARKET_ALERT_OPERATION_STATUSES),
        "priority": _required_choice(record, "priority", MARKET_ALERT_OPERATION_PRIORITIES),
        "total": _int_value(record.get("total")),
        "high": _int_value(record.get("high")),
        "medium": _int_value(record.get("medium")),
        "low": _int_value(record.get("low")),
        "block": _int_value(record.get("block")),
        "watch": _int_value(record.get("watch")),
        "pass_count": _int_value(record.get("pass_count")),
        "top_source": _optional_text(record, "top_source"),
        "next_action": _optional_text(record, "next_action"),
        "command_status": _required_choice(record, "command_status", MARKET_ALERT_OPERATION_STATUSES),
        "command_priority": _required_choice(record, "command_priority", MARKET_ALERT_OPERATION_PRIORITIES),
        "total_alerts": _int_value(record.get("total_alerts")),
        "source_system": _optional_text(record, "source_system") or "market_alert_owner_queue",
    }
    return {field: clean_record.get(field) for field in OWNER_QUEUE_FIELD_NAMES}


def _normalize_runbook_record(record: Dict) -> Dict:
    workspace_id = _normalize_key(record.get("workspace_id"), DEFAULT_WORKSPACE_ID)
    actor_id = _normalize_key(record.get("actor_id"), DEFAULT_ACTOR_ID)
    runbook_id = _required_text(record, "runbook_id")
    generated_at = _required_text(record, "generated_at")
    updated_at = _required_text(record, "updated_at")

    clean_record = {
        "workspace_id": workspace_id,
        "actor_id": actor_id,
        "runbook_id": runbook_id,
        "idempotency_key": _optional_text(record, "idempotency_key") or f"{workspace_id}:{actor_id}:{runbook_id}:{updated_at}",
        "generated_at": generated_at,
        "updated_at": updated_at,
        "portfolio_id": _optional_text(record, "portfolio_id"),
        "batch_id": _optional_text(record, "batch_id"),
        "source": _required_text(record, "source"),
        "title": _required_text(record, "title"),
        "status": _required_choice(record, "status", MARKET_ALERT_OPERATION_STATUSES),
        "priority": _required_choice(record, "priority", MARKET_ALERT_OPERATION_PRIORITIES),
        "owner": _optional_text(record, "owner"),
        "deadline": _optional_text(record, "deadline"),
        "trigger": _optional_text(record, "trigger"),
        "diagnose": _optional_text(record, "diagnose"),
        "resolve": _optional_text(record, "resolve"),
        "verify": _optional_text(record, "verify"),
        "escalation": _optional_text(record, "escalation"),
        "command_status": _required_choice(record, "command_status", MARKET_ALERT_OPERATION_STATUSES),
        "command_priority": _required_choice(record, "command_priority", MARKET_ALERT_OPERATION_PRIORITIES),
        "total_alerts": _int_value(record.get("total_alerts")),
        "source_system": _optional_text(record, "source_system") or "market_alert_runbook",
    }
    return {field: clean_record.get(field) for field in RUNBOOK_FIELD_NAMES}


def _row_to_record(row, field_names: List[str]) -> Dict:
    return {
        field: _serializable_value(row.get(field))
        for field in field_names
    }


def _owner_queue_table_name() -> str:
    table_name = os.getenv("BIGQUERY_MARKET_ALERT_OWNER_QUEUE_TABLE", DEFAULT_MARKET_ALERT_OWNER_QUEUE_TABLE)
    _validate_identifier("BIGQUERY_MARKET_ALERT_OWNER_QUEUE_TABLE", table_name)
    return table_name


def _runbook_table_name() -> str:
    table_name = os.getenv("BIGQUERY_MARKET_ALERT_RUNBOOK_TABLE", DEFAULT_MARKET_ALERT_RUNBOOK_TABLE)
    _validate_identifier("BIGQUERY_MARKET_ALERT_RUNBOOK_TABLE", table_name)
    return table_name


def _owner_queue_table_id() -> str:
    project_id, dataset, _, _ = _settings()
    return f"{project_id}.{dataset}.{_owner_queue_table_name()}"


def _runbook_table_id() -> str:
    project_id, dataset, _, _ = _settings()
    return f"{project_id}.{dataset}.{_runbook_table_name()}"


def _int_value(value) -> int:
    try:
        number = int(value)
    except (TypeError, ValueError):
        return 0
    return number
