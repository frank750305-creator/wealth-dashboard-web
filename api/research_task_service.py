from __future__ import annotations

import os
from typing import Dict, List, Optional, Set

try:
    from .market_data_service import (
        MarketDataConfigError,
        MarketDataError,
        MarketDataQueryError,
        _bigquery_client,
        _bigquery_module,
        _service_account_json,
        _settings,
        _validate_identifier,
    )
except ImportError:
    from market_data_service import (
        MarketDataConfigError,
        MarketDataError,
        MarketDataQueryError,
        _bigquery_client,
        _bigquery_module,
        _service_account_json,
        _settings,
        _validate_identifier,
    )


DEFAULT_RESEARCH_TASK_TABLE = "research_tasks"
RESEARCH_TASK_FIELD_NAMES = [
    "workspace_id",
    "actor_id",
    "task_id",
    "idempotency_key",
    "generated_at",
    "updated_at",
    "lane",
    "title",
    "status",
    "priority",
    "owner",
    "symbol",
    "source",
    "evidence",
    "next_action",
    "manual_note",
    "is_manual_override",
    "lifecycle_gate_status",
    "lifecycle_decision",
    "active_stage",
    "blocker_count",
    "ready_count",
]
RESEARCH_TASK_STATUSES = {"blocked", "active", "ready", "done"}
RESEARCH_TASK_PRIORITIES = {"high", "medium", "low"}
RESEARCH_TASK_LANES = {"data", "research", "risk", "allocation", "control"}
DEFAULT_WORKSPACE_ID = "default"
DEFAULT_ACTOR_ID = "system"


def research_task_warehouse_status() -> Dict:
    project_id, dataset, _, _ = _settings()
    return {
        "projectId": project_id,
        "dataset": dataset,
        "taskTable": _research_task_table_id(),
        "hasServiceAccountEnv": bool(_service_account_json()),
        "hasGoogleApplicationCredentials": bool(os.getenv("GOOGLE_APPLICATION_CREDENTIALS")),
        "requiredEnvVars": [
            "BIGQUERY_PROJECT_ID",
            "BIGQUERY_DATASET",
            "GCP_SERVICE_ACCOUNT_JSON or GOOGLE_SERVICE_ACCOUNT_JSON",
            "BIGQUERY_RESEARCH_TASK_TABLE optional",
        ],
    }


def sync_research_task_records(records: List[Dict]) -> Dict:
    if not records:
        raise MarketDataError("Research task records are required.")
    if len(records) > 200:
        raise MarketDataError("Research task sync supports at most 200 records per request.")

    bigquery = _bigquery_module()
    client = _bigquery_client(bigquery)
    table_id = _ensure_research_task_table(bigquery, client)
    clean_records = [_normalize_research_task_record(record) for record in records]

    try:
        errors = client.insert_rows_json(
            table_id,
            clean_records,
            row_ids=[row["idempotency_key"] for row in clean_records],
        )
    except Exception as exc:
        raise MarketDataQueryError(f"BigQuery research task insert failed: {exc}") from exc

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


def load_latest_research_task_records(limit: int = 50, workspace_id: Optional[str] = None) -> Dict:
    bigquery = _bigquery_module()
    client = _bigquery_client(bigquery)
    table_id = _research_task_table_id()
    bounded_limit = max(1, min(int(limit or 50), 200))
    clean_workspace_id = _normalize_key(workspace_id, DEFAULT_WORKSPACE_ID)
    if not _research_task_table_exists(client, table_id):
        return {
            "status": "missing",
            "table": table_id,
            "workspaceId": clean_workspace_id,
            "limit": bounded_limit,
            "recordCount": 0,
            "records": [],
        }
    missing_fields = _research_task_missing_fields(client, table_id)
    if missing_fields:
        return {
            "status": "schema_outdated",
            "table": table_id,
            "workspaceId": clean_workspace_id,
            "limit": bounded_limit,
            "recordCount": 0,
            "missingFields": missing_fields,
            "records": [],
        }

    field_list = ", ".join(RESEARCH_TASK_FIELD_NAMES)
    query = f"""
    SELECT {field_list}
    FROM (
        SELECT
            {field_list},
            ROW_NUMBER() OVER (
                PARTITION BY workspace_id, task_id
                ORDER BY updated_at DESC, generated_at DESC
            ) AS row_number
        FROM `{table_id}`
        WHERE workspace_id = @workspace_id
    )
    WHERE row_number = 1
    ORDER BY updated_at DESC, generated_at DESC
    LIMIT @limit
    """

    try:
        rows = list(
            client.query(
                query,
                job_config=bigquery.QueryJobConfig(
                    query_parameters=[
                        bigquery.ScalarQueryParameter("workspace_id", "STRING", clean_workspace_id),
                        bigquery.ScalarQueryParameter("limit", "INT64", bounded_limit),
                    ]
                ),
            ).result()
        )
    except Exception as exc:
        raise MarketDataQueryError(f"BigQuery latest research task query failed: {exc}") from exc

    return {
        "status": "loaded",
        "table": table_id,
        "workspaceId": clean_workspace_id,
        "limit": bounded_limit,
        "recordCount": len(rows),
        "records": [_row_to_research_task_record(row) for row in rows],
    }


def load_research_task_sync_audit(limit: int = 12, workspace_id: Optional[str] = None) -> Dict:
    bigquery = _bigquery_module()
    client = _bigquery_client(bigquery)
    table_id = _research_task_table_id()
    bounded_limit = max(1, min(int(limit or 12), 50))
    clean_workspace_id = _normalize_key(workspace_id, DEFAULT_WORKSPACE_ID)
    if not _research_task_table_exists(client, table_id):
        return {
            "status": "missing",
            "table": table_id,
            "workspaceId": clean_workspace_id,
            "limit": bounded_limit,
            "auditCount": 0,
            "auditRecords": [],
        }
    missing_fields = _research_task_missing_fields(client, table_id)
    if missing_fields:
        return {
            "status": "schema_outdated",
            "table": table_id,
            "workspaceId": clean_workspace_id,
            "limit": bounded_limit,
            "auditCount": 0,
            "missingFields": missing_fields,
            "auditRecords": [],
        }

    query = f"""
    SELECT
        workspace_id,
        actor_id,
        generated_at,
        COUNT(1) AS task_count,
        COUNTIF(is_manual_override) AS manual_override_count,
        COUNTIF(status = 'blocked') AS blocker_count,
        COUNTIF(status = 'ready') AS ready_count,
        MAX(updated_at) AS latest_updated_at
    FROM `{table_id}`
    WHERE workspace_id = @workspace_id
    GROUP BY workspace_id, actor_id, generated_at
    ORDER BY generated_at DESC
    LIMIT @limit
    """

    try:
        rows = list(
            client.query(
                query,
                job_config=bigquery.QueryJobConfig(
                    query_parameters=[
                        bigquery.ScalarQueryParameter("workspace_id", "STRING", clean_workspace_id),
                        bigquery.ScalarQueryParameter("limit", "INT64", bounded_limit),
                    ]
                ),
            ).result()
        )
    except Exception as exc:
        raise MarketDataQueryError(f"BigQuery research task sync audit query failed: {exc}") from exc

    return {
        "status": "loaded",
        "table": table_id,
        "workspaceId": clean_workspace_id,
        "limit": bounded_limit,
        "auditCount": len(rows),
        "auditRecords": [_row_to_research_task_audit_record(row) for row in rows],
    }


def _ensure_research_task_table(bigquery, client) -> str:
    table_id = _research_task_table_id()

    schema = _research_task_schema(bigquery)
    table = bigquery.Table(table_id, schema=schema)
    table.time_partitioning = bigquery.TimePartitioning(
        type_=bigquery.TimePartitioningType.DAY,
        field="updated_at",
    )
    table.clustering_fields = ["workspace_id", "status", "priority", "lane"]

    try:
        client.create_table(table, exists_ok=True)
        existing_table = client.get_table(table_id)
        existing_fields = {field.name for field in existing_table.schema}
        missing_fields = [field for field in schema if field.name not in existing_fields]
        if missing_fields:
            existing_table.schema = [*existing_table.schema, *missing_fields]
            client.update_table(existing_table, ["schema"])
    except Exception as exc:
        raise MarketDataConfigError(f"BigQuery research task table could not be created: {exc}") from exc

    return table_id


def _research_task_schema(bigquery) -> List:
    return [
        bigquery.SchemaField("workspace_id", "STRING", description="Workspace or tenant id"),
        bigquery.SchemaField("actor_id", "STRING", description="User or process that generated the sync"),
        bigquery.SchemaField("task_id", "STRING", mode="REQUIRED", description="Stable research task id"),
        bigquery.SchemaField("idempotency_key", "STRING", description="Stable key for retry-safe inserts"),
        bigquery.SchemaField("generated_at", "TIMESTAMP", mode="REQUIRED", description="Dashboard generation timestamp"),
        bigquery.SchemaField("updated_at", "TIMESTAMP", mode="REQUIRED", description="Last task update timestamp"),
        bigquery.SchemaField("lane", "STRING", description="Task lane"),
        bigquery.SchemaField("title", "STRING", description="Task title"),
        bigquery.SchemaField("status", "STRING", description="Task status"),
        bigquery.SchemaField("priority", "STRING", description="Task priority"),
        bigquery.SchemaField("owner", "STRING", description="Responsible owner"),
        bigquery.SchemaField("symbol", "STRING", description="Related market symbol"),
        bigquery.SchemaField("source", "STRING", description="Source module"),
        bigquery.SchemaField("evidence", "STRING", description="Decision evidence"),
        bigquery.SchemaField("next_action", "STRING", description="Next action"),
        bigquery.SchemaField("manual_note", "STRING", description="Manual note"),
        bigquery.SchemaField("is_manual_override", "BOOLEAN", description="Whether user changed task state"),
        bigquery.SchemaField("lifecycle_gate_status", "STRING", description="Lifecycle gate status"),
        bigquery.SchemaField("lifecycle_decision", "STRING", description="Lifecycle decision"),
        bigquery.SchemaField("active_stage", "STRING", description="Current active stage"),
        bigquery.SchemaField("blocker_count", "INT64", description="Blocked task count"),
        bigquery.SchemaField("ready_count", "INT64", description="Ready task count"),
    ]


def _research_task_table_exists(client, table_id: str) -> bool:
    try:
        client.get_table(table_id)
        return True
    except Exception as exc:
        if exc.__class__.__name__ == "NotFound":
            return False
        raise MarketDataQueryError(f"BigQuery research task table lookup failed: {exc}") from exc


def _research_task_missing_fields(client, table_id: str) -> List[str]:
    try:
        table = client.get_table(table_id)
    except Exception as exc:
        raise MarketDataQueryError(f"BigQuery research task schema lookup failed: {exc}") from exc
    existing_fields = {field.name for field in table.schema}
    return [field for field in RESEARCH_TASK_FIELD_NAMES if field not in existing_fields]


def _normalize_research_task_record(record: Dict) -> Dict:
    workspace_id = _normalize_key(record.get("workspace_id"), DEFAULT_WORKSPACE_ID)
    actor_id = _normalize_key(record.get("actor_id"), DEFAULT_ACTOR_ID)
    task_id = _required_text(record, "task_id")
    generated_at = _required_text(record, "generated_at")
    updated_at = _required_text(record, "updated_at")
    lane = _required_choice(record, "lane", RESEARCH_TASK_LANES)
    status = _required_choice(record, "status", RESEARCH_TASK_STATUSES)
    priority = _required_choice(record, "priority", RESEARCH_TASK_PRIORITIES)

    clean_record = {
        "workspace_id": workspace_id,
        "actor_id": actor_id,
        "task_id": task_id,
        "idempotency_key": _optional_text(record, "idempotency_key") or f"{workspace_id}:{actor_id}:{task_id}:{updated_at}",
        "generated_at": generated_at,
        "updated_at": updated_at,
        "lane": lane,
        "title": _optional_text(record, "title"),
        "status": status,
        "priority": priority,
        "owner": _optional_text(record, "owner"),
        "symbol": _optional_text(record, "symbol"),
        "source": _optional_text(record, "source"),
        "evidence": _optional_text(record, "evidence"),
        "next_action": _optional_text(record, "next_action"),
        "manual_note": _optional_text(record, "manual_note"),
        "is_manual_override": bool(record.get("is_manual_override")),
        "lifecycle_gate_status": _required_choice(record, "lifecycle_gate_status", RESEARCH_TASK_STATUSES),
        "lifecycle_decision": _optional_text(record, "lifecycle_decision"),
        "active_stage": _optional_text(record, "active_stage"),
        "blocker_count": _int_value(record.get("blocker_count")),
        "ready_count": _int_value(record.get("ready_count")),
    }
    return {field: clean_record.get(field) for field in RESEARCH_TASK_FIELD_NAMES}


def _row_to_research_task_record(row) -> Dict:
    return {
        field: _serializable_value(row.get(field))
        for field in RESEARCH_TASK_FIELD_NAMES
    }


def _row_to_research_task_audit_record(row) -> Dict:
    return {
        "workspace_id": _serializable_value(row.get("workspace_id")),
        "actor_id": _serializable_value(row.get("actor_id")),
        "generated_at": _serializable_value(row.get("generated_at")),
        "latest_updated_at": _serializable_value(row.get("latest_updated_at")),
        "task_count": _int_value(row.get("task_count")),
        "manual_override_count": _int_value(row.get("manual_override_count")),
        "blocker_count": _int_value(row.get("blocker_count")),
        "ready_count": _int_value(row.get("ready_count")),
    }


def _serializable_value(value):
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return value


def _research_task_table_name() -> str:
    table_name = os.getenv("BIGQUERY_RESEARCH_TASK_TABLE", DEFAULT_RESEARCH_TASK_TABLE)
    _validate_identifier("BIGQUERY_RESEARCH_TASK_TABLE", table_name)
    return table_name


def _research_task_table_id() -> str:
    project_id, dataset, _, _ = _settings()
    return f"{project_id}.{dataset}.{_research_task_table_name()}"


def _normalize_key(value, fallback: str) -> str:
    clean_value = str(value or fallback).strip().replace(" ", "-")[:80]
    return clean_value or fallback


def _required_text(record: Dict, field: str) -> str:
    value = record.get(field)
    if value is None or str(value).strip() == "":
        raise MarketDataError(f"{field} is required.")
    return str(value).strip()


def _optional_text(record: Dict, field: str) -> Optional[str]:
    value = record.get(field)
    if value is None:
        return None
    clean_value = str(value).strip()
    return clean_value or None


def _required_choice(record: Dict, field: str, choices: Set[str]) -> str:
    value = _required_text(record, field)
    if value not in choices:
        raise MarketDataError(f"{field} has unsupported value: {value}")
    return value


def _int_value(value) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return 0
