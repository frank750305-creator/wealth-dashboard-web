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
    from .trading_ticket_service import (
        TRADE_TICKET_DIRECTIONS,
        _float_value,
        _optional_choice,
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
        _optional_choice,
        _optional_text,
        _required_choice,
        _required_text,
    )


DEFAULT_EXECUTION_ROUTE_TABLE = "execution_routes"
EXECUTION_ROUTE_STATES = {"blocked", "staged", "routed"}
EXECUTION_ROUTE_STATUSES = {"pass", "watch", "block"}
EXECUTION_ROUTE_FIELD_NAMES = [
    "workspace_id",
    "actor_id",
    "route_id",
    "ticket_id",
    "idempotency_key",
    "generated_at",
    "updated_at",
    "portfolio_id",
    "batch_id",
    "batch_number",
    "sequence_in_batch",
    "route_sequence",
    "symbol",
    "direction",
    "venue",
    "route_state",
    "route_status",
    "route_notional",
    "ticket_amount",
    "cash_impact",
    "batch_gross_amount",
    "batch_cash_impact",
    "estimated_slippage_bps",
    "estimated_commission_bps",
    "estimated_route_cost",
    "approval_decision",
    "route_note",
]


def sync_execution_route_records(records: List[Dict]) -> Dict:
    if not records:
        raise MarketDataError("Execution route records are required.")
    if len(records) > 500:
        raise MarketDataError("Execution route sync supports at most 500 records per request.")

    bigquery = _bigquery_module()
    client = _bigquery_client(bigquery)
    table_id = _ensure_execution_route_table(bigquery, client)
    clean_records = [_normalize_execution_route_record(record) for record in records]

    try:
        errors = client.insert_rows_json(
            table_id,
            clean_records,
            row_ids=[row["idempotency_key"] for row in clean_records],
        )
    except Exception as exc:
        raise MarketDataQueryError(f"BigQuery execution route insert failed: {exc}") from exc

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


def load_latest_execution_route_records(
    limit: int = 100,
    workspace_id: Optional[str] = None,
    portfolio_id: Optional[str] = None,
    batch_id: Optional[str] = None,
) -> Dict:
    bigquery = _bigquery_module()
    client = _bigquery_client(bigquery)
    table_id = _execution_route_table_id()
    bounded_limit = max(1, min(int(limit or 100), 500))
    clean_workspace_id = _normalize_key(workspace_id, DEFAULT_WORKSPACE_ID)
    clean_portfolio_id = _optional_text({"portfolio_id": portfolio_id}, "portfolio_id")
    clean_batch_id = _optional_text({"batch_id": batch_id}, "batch_id")

    if not _execution_route_table_exists(client, table_id):
        return {
            "status": "missing",
            "table": table_id,
            "workspaceId": clean_workspace_id,
            "limit": bounded_limit,
            "routeCount": 0,
            "routes": [],
        }
    missing_fields = _execution_route_missing_fields(client, table_id)
    if missing_fields:
        return {
            "status": "schema_outdated",
            "table": table_id,
            "workspaceId": clean_workspace_id,
            "limit": bounded_limit,
            "routeCount": 0,
            "missingFields": missing_fields,
            "routes": [],
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

    field_list = ", ".join(EXECUTION_ROUTE_FIELD_NAMES)
    query = f"""
    SELECT {field_list}
    FROM (
        SELECT
            {field_list},
            ROW_NUMBER() OVER (
                PARTITION BY workspace_id, route_id
                ORDER BY updated_at DESC, generated_at DESC
            ) AS row_number
        FROM `{table_id}`
        WHERE {" AND ".join(conditions)}
    )
    WHERE row_number = 1
    ORDER BY updated_at DESC, generated_at DESC, route_sequence, symbol
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
        raise MarketDataQueryError(f"BigQuery latest execution route query failed: {exc}") from exc

    return {
        "status": "loaded",
        "table": table_id,
        "workspaceId": clean_workspace_id,
        "portfolioId": clean_portfolio_id,
        "batchId": clean_batch_id,
        "limit": bounded_limit,
        "routeCount": len(rows),
        "routes": [_row_to_execution_route_record(row) for row in rows],
    }


def _ensure_execution_route_table(bigquery, client) -> str:
    table_id = _execution_route_table_id()
    schema = _execution_route_schema(bigquery)
    table = bigquery.Table(table_id, schema=schema)
    table.time_partitioning = bigquery.TimePartitioning(
        type_=bigquery.TimePartitioningType.DAY,
        field="updated_at",
    )
    table.clustering_fields = ["workspace_id", "portfolio_id", "batch_id", "route_state"]

    try:
        client.create_table(table, exists_ok=True)
        existing_table = client.get_table(table_id)
        existing_fields = {field.name for field in existing_table.schema}
        missing_fields = [field for field in schema if field.name not in existing_fields]
        if missing_fields:
            existing_table.schema = [*existing_table.schema, *missing_fields]
            client.update_table(existing_table, ["schema"])
    except Exception as exc:
        raise MarketDataConfigError(f"BigQuery execution route table could not be created: {exc}") from exc

    return table_id


def _execution_route_schema(bigquery) -> List:
    return [
        bigquery.SchemaField("workspace_id", "STRING", description="Workspace or tenant id"),
        bigquery.SchemaField("actor_id", "STRING", description="User or process that generated the route"),
        bigquery.SchemaField("route_id", "STRING", mode="REQUIRED", description="Stable execution route id"),
        bigquery.SchemaField("ticket_id", "STRING", description="Linked trade ticket id"),
        bigquery.SchemaField("idempotency_key", "STRING", description="Stable key for retry-safe inserts"),
        bigquery.SchemaField("generated_at", "TIMESTAMP", mode="REQUIRED", description="Route generation timestamp"),
        bigquery.SchemaField("updated_at", "TIMESTAMP", mode="REQUIRED", description="Last route update timestamp"),
        bigquery.SchemaField("portfolio_id", "STRING", description="Portfolio or watchlist id"),
        bigquery.SchemaField("batch_id", "STRING", description="Execution batch id"),
        bigquery.SchemaField("batch_number", "INT64", description="Trade batch number"),
        bigquery.SchemaField("sequence_in_batch", "INT64", description="Ticket sequence inside batch"),
        bigquery.SchemaField("route_sequence", "INT64", description="Route sequence across all batches"),
        bigquery.SchemaField("symbol", "STRING", description="Trade symbol"),
        bigquery.SchemaField("direction", "STRING", description="Trade direction"),
        bigquery.SchemaField("venue", "STRING", description="Execution venue or manual queue"),
        bigquery.SchemaField("route_state", "STRING", description="Route lifecycle state"),
        bigquery.SchemaField("route_status", "STRING", description="Route control status"),
        bigquery.SchemaField("route_notional", "FLOAT64", description="Route notional amount"),
        bigquery.SchemaField("ticket_amount", "FLOAT64", description="Original trade ticket amount"),
        bigquery.SchemaField("cash_impact", "FLOAT64", description="Cash impact after buy or sell"),
        bigquery.SchemaField("batch_gross_amount", "FLOAT64", description="Gross notional of the batch"),
        bigquery.SchemaField("batch_cash_impact", "FLOAT64", description="Cash impact of the batch"),
        bigquery.SchemaField("estimated_slippage_bps", "FLOAT64", description="Estimated slippage in bps"),
        bigquery.SchemaField("estimated_commission_bps", "FLOAT64", description="Estimated commission in bps"),
        bigquery.SchemaField("estimated_route_cost", "FLOAT64", description="Estimated route cost"),
        bigquery.SchemaField("approval_decision", "STRING", description="Approval gate decision at route generation"),
        bigquery.SchemaField("route_note", "STRING", description="Route note or blocker reason"),
    ]


def _execution_route_table_exists(client, table_id: str) -> bool:
    try:
        client.get_table(table_id)
        return True
    except Exception as exc:
        if exc.__class__.__name__ == "NotFound":
            return False
        raise MarketDataQueryError(f"BigQuery execution route table lookup failed: {exc}") from exc


def _execution_route_missing_fields(client, table_id: str) -> List[str]:
    try:
        table = client.get_table(table_id)
    except Exception as exc:
        raise MarketDataQueryError(f"BigQuery execution route schema lookup failed: {exc}") from exc
    existing_fields = {field.name for field in table.schema}
    return [field for field in EXECUTION_ROUTE_FIELD_NAMES if field not in existing_fields]


def _normalize_execution_route_record(record: Dict) -> Dict:
    workspace_id = _normalize_key(record.get("workspace_id"), DEFAULT_WORKSPACE_ID)
    actor_id = _normalize_key(record.get("actor_id"), DEFAULT_ACTOR_ID)
    route_id = _required_text(record, "route_id")
    generated_at = _required_text(record, "generated_at")
    updated_at = _required_text(record, "updated_at")

    clean_record = {
        "workspace_id": workspace_id,
        "actor_id": actor_id,
        "route_id": route_id,
        "ticket_id": _optional_text(record, "ticket_id"),
        "idempotency_key": _optional_text(record, "idempotency_key") or f"{workspace_id}:{actor_id}:{route_id}:{updated_at}",
        "generated_at": generated_at,
        "updated_at": updated_at,
        "portfolio_id": _optional_text(record, "portfolio_id"),
        "batch_id": _optional_text(record, "batch_id"),
        "batch_number": _int_value(record.get("batch_number")),
        "sequence_in_batch": _int_value(record.get("sequence_in_batch")),
        "route_sequence": _int_value(record.get("route_sequence")),
        "symbol": _required_text(record, "symbol"),
        "direction": _required_choice(record, "direction", TRADE_TICKET_DIRECTIONS),
        "venue": _required_text(record, "venue"),
        "route_state": _required_choice(record, "route_state", EXECUTION_ROUTE_STATES),
        "route_status": _required_choice(record, "route_status", EXECUTION_ROUTE_STATUSES),
        "route_notional": _float_value(record.get("route_notional")),
        "ticket_amount": _float_value(record.get("ticket_amount")),
        "cash_impact": _float_value(record.get("cash_impact")),
        "batch_gross_amount": _float_value(record.get("batch_gross_amount")),
        "batch_cash_impact": _float_value(record.get("batch_cash_impact")),
        "estimated_slippage_bps": _float_value(record.get("estimated_slippage_bps")),
        "estimated_commission_bps": _float_value(record.get("estimated_commission_bps")),
        "estimated_route_cost": _float_value(record.get("estimated_route_cost")),
        "approval_decision": _optional_choice(record, "approval_decision", EXECUTION_ROUTE_STATUSES, "watch"),
        "route_note": _optional_text(record, "route_note"),
    }
    return {field: clean_record.get(field) for field in EXECUTION_ROUTE_FIELD_NAMES}


def _row_to_execution_route_record(row) -> Dict:
    return {
        field: _serializable_value(row.get(field))
        for field in EXECUTION_ROUTE_FIELD_NAMES
    }


def _execution_route_table_name() -> str:
    table_name = os.getenv("BIGQUERY_EXECUTION_ROUTE_TABLE", DEFAULT_EXECUTION_ROUTE_TABLE)
    _validate_identifier("BIGQUERY_EXECUTION_ROUTE_TABLE", table_name)
    return table_name


def _execution_route_table_id() -> str:
    project_id, dataset, _, _ = _settings()
    return f"{project_id}.{dataset}.{_execution_route_table_name()}"


def _int_value(value) -> int:
    try:
        number = int(value)
    except (TypeError, ValueError):
        return 0
    return number
