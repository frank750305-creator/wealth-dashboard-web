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
        _settings,
        _validate_identifier,
    )
    from .research_task_service import DEFAULT_ACTOR_ID, DEFAULT_WORKSPACE_ID, _normalize_key, _serializable_value
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


DEFAULT_TRADE_TICKET_TABLE = "trade_tickets"
TRADE_TICKET_DIRECTIONS = {"buy", "sell", "hold"}
TRADE_TICKET_STATUSES = {"draft", "approved", "routed", "filled", "cancelled"}
TRADE_TICKET_FIELD_NAMES = [
    "workspace_id",
    "actor_id",
    "ticket_id",
    "idempotency_key",
    "generated_at",
    "updated_at",
    "portfolio_id",
    "batch_id",
    "symbol",
    "direction",
    "status",
    "ticket_amount",
    "cash_impact",
    "current_amount",
    "current_weight",
    "target_amount",
    "target_weight",
    "trade_amount",
    "trade_weight",
    "score",
    "signal",
    "note",
    "ticket_note",
    "minimum_trade_amount",
]


def sync_trade_ticket_records(records: List[Dict]) -> Dict:
    if not records:
        raise MarketDataError("Trade ticket records are required.")
    if len(records) > 500:
        raise MarketDataError("Trade ticket sync supports at most 500 records per request.")

    bigquery = _bigquery_module()
    client = _bigquery_client(bigquery)
    table_id = _ensure_trade_ticket_table(bigquery, client)
    clean_records = [_normalize_trade_ticket_record(record) for record in records]

    try:
        errors = client.insert_rows_json(
            table_id,
            clean_records,
            row_ids=[row["idempotency_key"] for row in clean_records],
        )
    except Exception as exc:
        raise MarketDataQueryError(f"BigQuery trade ticket insert failed: {exc}") from exc

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


def load_latest_trade_ticket_records(
    limit: int = 100,
    workspace_id: Optional[str] = None,
    portfolio_id: Optional[str] = None,
    batch_id: Optional[str] = None,
) -> Dict:
    bigquery = _bigquery_module()
    client = _bigquery_client(bigquery)
    table_id = _trade_ticket_table_id()
    bounded_limit = max(1, min(int(limit or 100), 500))
    clean_workspace_id = _normalize_key(workspace_id, DEFAULT_WORKSPACE_ID)
    clean_portfolio_id = _optional_text({"portfolio_id": portfolio_id}, "portfolio_id")
    clean_batch_id = _optional_text({"batch_id": batch_id}, "batch_id")

    if not _trade_ticket_table_exists(client, table_id):
        return {
            "status": "missing",
            "table": table_id,
            "workspaceId": clean_workspace_id,
            "limit": bounded_limit,
            "ticketCount": 0,
            "tickets": [],
        }
    missing_fields = _trade_ticket_missing_fields(client, table_id)
    if missing_fields:
        return {
            "status": "schema_outdated",
            "table": table_id,
            "workspaceId": clean_workspace_id,
            "limit": bounded_limit,
            "ticketCount": 0,
            "missingFields": missing_fields,
            "tickets": [],
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

    field_list = ", ".join(TRADE_TICKET_FIELD_NAMES)
    query = f"""
    SELECT {field_list}
    FROM (
        SELECT
            {field_list},
            ROW_NUMBER() OVER (
                PARTITION BY workspace_id, ticket_id
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
        raise MarketDataQueryError(f"BigQuery latest trade ticket query failed: {exc}") from exc

    return {
        "status": "loaded",
        "table": table_id,
        "workspaceId": clean_workspace_id,
        "portfolioId": clean_portfolio_id,
        "batchId": clean_batch_id,
        "limit": bounded_limit,
        "ticketCount": len(rows),
        "tickets": [_row_to_trade_ticket_record(row) for row in rows],
    }


def _ensure_trade_ticket_table(bigquery, client) -> str:
    table_id = _trade_ticket_table_id()
    schema = _trade_ticket_schema(bigquery)
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
        raise MarketDataConfigError(f"BigQuery trade ticket table could not be created: {exc}") from exc

    return table_id


def _trade_ticket_schema(bigquery) -> List:
    return [
        bigquery.SchemaField("workspace_id", "STRING", description="Workspace or tenant id"),
        bigquery.SchemaField("actor_id", "STRING", description="User or process that generated the ticket"),
        bigquery.SchemaField("ticket_id", "STRING", mode="REQUIRED", description="Stable trade ticket id"),
        bigquery.SchemaField("idempotency_key", "STRING", description="Stable key for retry-safe inserts"),
        bigquery.SchemaField("generated_at", "TIMESTAMP", mode="REQUIRED", description="Ticket generation timestamp"),
        bigquery.SchemaField("updated_at", "TIMESTAMP", mode="REQUIRED", description="Last ticket update timestamp"),
        bigquery.SchemaField("portfolio_id", "STRING", description="Portfolio or watchlist id"),
        bigquery.SchemaField("batch_id", "STRING", description="Execution batch id"),
        bigquery.SchemaField("symbol", "STRING", description="Trade symbol"),
        bigquery.SchemaField("direction", "STRING", description="Trade direction"),
        bigquery.SchemaField("status", "STRING", description="Ticket lifecycle status"),
        bigquery.SchemaField("ticket_amount", "FLOAT64", description="Absolute ticket amount"),
        bigquery.SchemaField("cash_impact", "FLOAT64", description="Cash impact after buy or sell"),
        bigquery.SchemaField("current_amount", "FLOAT64", description="Current notional"),
        bigquery.SchemaField("current_weight", "FLOAT64", description="Current portfolio weight"),
        bigquery.SchemaField("target_amount", "FLOAT64", description="Target notional"),
        bigquery.SchemaField("target_weight", "FLOAT64", description="Target portfolio weight"),
        bigquery.SchemaField("trade_amount", "FLOAT64", description="Signed trade amount"),
        bigquery.SchemaField("trade_weight", "FLOAT64", description="Trade weight drift"),
        bigquery.SchemaField("score", "FLOAT64", description="Research score"),
        bigquery.SchemaField("signal", "STRING", description="Research signal"),
        bigquery.SchemaField("note", "STRING", description="Rebalance note"),
        bigquery.SchemaField("ticket_note", "STRING", description="Execution note"),
        bigquery.SchemaField("minimum_trade_amount", "FLOAT64", description="Minimum trade threshold"),
    ]


def _trade_ticket_table_exists(client, table_id: str) -> bool:
    try:
        client.get_table(table_id)
        return True
    except Exception as exc:
        if exc.__class__.__name__ == "NotFound":
            return False
        raise MarketDataQueryError(f"BigQuery trade ticket table lookup failed: {exc}") from exc


def _trade_ticket_missing_fields(client, table_id: str) -> List[str]:
    try:
        table = client.get_table(table_id)
    except Exception as exc:
        raise MarketDataQueryError(f"BigQuery trade ticket schema lookup failed: {exc}") from exc
    existing_fields = {field.name for field in table.schema}
    return [field for field in TRADE_TICKET_FIELD_NAMES if field not in existing_fields]


def _normalize_trade_ticket_record(record: Dict) -> Dict:
    workspace_id = _normalize_key(record.get("workspace_id"), DEFAULT_WORKSPACE_ID)
    actor_id = _normalize_key(record.get("actor_id"), DEFAULT_ACTOR_ID)
    ticket_id = _required_text(record, "ticket_id")
    generated_at = _required_text(record, "generated_at")
    updated_at = _required_text(record, "updated_at")
    direction = _required_choice(record, "direction", TRADE_TICKET_DIRECTIONS)
    status = _optional_choice(record, "status", TRADE_TICKET_STATUSES, "draft")

    clean_record = {
        "workspace_id": workspace_id,
        "actor_id": actor_id,
        "ticket_id": ticket_id,
        "idempotency_key": _optional_text(record, "idempotency_key") or f"{workspace_id}:{actor_id}:{ticket_id}:{updated_at}",
        "generated_at": generated_at,
        "updated_at": updated_at,
        "portfolio_id": _optional_text(record, "portfolio_id"),
        "batch_id": _optional_text(record, "batch_id"),
        "symbol": _required_text(record, "symbol"),
        "direction": direction,
        "status": status,
        "ticket_amount": _float_value(record.get("ticket_amount")),
        "cash_impact": _float_value(record.get("cash_impact")),
        "current_amount": _float_value(record.get("current_amount")),
        "current_weight": _float_value(record.get("current_weight")),
        "target_amount": _float_value(record.get("target_amount")),
        "target_weight": _float_value(record.get("target_weight")),
        "trade_amount": _float_value(record.get("trade_amount")),
        "trade_weight": _float_value(record.get("trade_weight")),
        "score": _optional_float(record.get("score")),
        "signal": _optional_text(record, "signal"),
        "note": _optional_text(record, "note"),
        "ticket_note": _optional_text(record, "ticket_note"),
        "minimum_trade_amount": _float_value(record.get("minimum_trade_amount")),
    }
    return {field: clean_record.get(field) for field in TRADE_TICKET_FIELD_NAMES}


def _row_to_trade_ticket_record(row) -> Dict:
    return {
        field: _serializable_value(row.get(field))
        for field in TRADE_TICKET_FIELD_NAMES
    }


def _trade_ticket_table_name() -> str:
    table_name = os.getenv("BIGQUERY_TRADE_TICKET_TABLE", DEFAULT_TRADE_TICKET_TABLE)
    _validate_identifier("BIGQUERY_TRADE_TICKET_TABLE", table_name)
    return table_name


def _trade_ticket_table_id() -> str:
    project_id, dataset, _, _ = _settings()
    return f"{project_id}.{dataset}.{_trade_ticket_table_name()}"


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


def _optional_choice(record: Dict, field: str, choices: Set[str], fallback: str) -> str:
    value = _optional_text(record, field) or fallback
    if value not in choices:
        raise MarketDataError(f"{field} has unsupported value: {value}")
    return value


def _float_value(value) -> float:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return 0.0
    return number if number == number else 0.0


def _optional_float(value) -> Optional[float]:
    if value is None or value == "":
        return None
    return _float_value(value)
