from __future__ import annotations

import json
import os
import re
from datetime import date, timedelta
from typing import Dict, Iterable, List, Optional

import numpy as np
import pandas as pd


DEFAULT_PROJECT_ID = "fund-war-room"
DEFAULT_DATASET = "fund_database"
DEFAULT_PRICE_TABLE = "daily_prices"
DEFAULT_FX_TABLE = "daily_fx"
DEFAULT_ADJUSTED_BACKFILL_MAX_DAILY_RETURN = 0.35

IDENTIFIER_RE = re.compile(r"^[A-Za-z0-9_-]+$")

ASSET_CATEGORY_LABELS = {
    "all": "全部",
    "tw_etf": "台股 ETF",
    "us_etf": "美股 ETF",
    "fund": "基金",
    "stock": "股票",
    "fx": "匯率",
    "index": "指數",
    "other": "其他",
}

VALID_ASSET_CATEGORIES = set(ASSET_CATEGORY_LABELS.keys())


class MarketDataError(RuntimeError):
    status_code = 400


class MarketDataConfigError(MarketDataError):
    status_code = 503


class MarketDataQueryError(MarketDataError):
    status_code = 502


def bigquery_market_status() -> Dict:
    project_id, dataset, price_table, fx_table = _settings()
    service_account_env = bool(_service_account_json())
    runtime_credential = bool(os.getenv("GOOGLE_APPLICATION_CREDENTIALS"))
    credential_source = "service_account_env" if service_account_env else "runtime_identity_or_adc"

    return {
        "projectId": project_id,
        "dataset": dataset,
        "priceTable": f"{project_id}.{dataset}.{price_table}",
        "fxTable": f"{project_id}.{dataset}.{fx_table}",
        "credentialSource": credential_source,
        "hasServiceAccountEnv": service_account_env,
        "hasGoogleApplicationCredentials": runtime_credential,
        "requiredEnvVars": [
            "BIGQUERY_PROJECT_ID",
            "BIGQUERY_DATASET",
            "GCP_SERVICE_ACCOUNT_JSON or GOOGLE_SERVICE_ACCOUNT_JSON",
        ],
    }


def load_bigquery_market_diagnostics() -> Dict:
    bigquery = _bigquery_module()
    client = _bigquery_client(bigquery)
    _, _, price_table_name, fx_table_name = _settings()
    price_table = _table_path("BIGQUERY_PRICE_TABLE", DEFAULT_PRICE_TABLE)
    fx_table = _table_path("BIGQUERY_FX_TABLE", DEFAULT_FX_TABLE)
    schema_checks = _load_schema_checks(
        bigquery=bigquery,
        client=client,
        price_table_name=price_table_name,
        fx_table_name=fx_table_name,
    )
    diagnostics = {
        "status": bigquery_market_status(),
        "schemaChecks": schema_checks,
        "priceSummary": {},
        "fxSummary": {},
        "recentSymbols": [],
        "staleSymbols": [],
        "adjustedStaleSymbols": [],
        "fxCurrencies": [],
        "qualityScorecard": {},
    }

    if not schema_checks["priceTable"]["isReady"] or not schema_checks["fxTable"]["isReady"]:
        diagnostics["qualityScorecard"] = _build_bigquery_quality_scorecard(diagnostics)
        return diagnostics

    price_summary_query = f"""
    SELECT
        COUNT(1) AS row_count,
        COUNT(DISTINCT symbol) AS symbol_count,
        MIN(DATE(date)) AS first_date,
        MAX(DATE(date)) AS latest_date,
        COUNTIF(SAFE_CAST(adj_price AS FLOAT64) > 0) AS adjusted_price_rows,
        COUNTIF(SAFE_CAST(raw_price AS FLOAT64) > 0) AS raw_price_rows
    FROM {price_table}
    """
    fx_summary_query = f"""
    SELECT
        COUNT(1) AS row_count,
        COUNT(DISTINCT currency) AS currency_count,
        MIN(DATE(date)) AS first_date,
        MAX(DATE(date)) AS latest_date
    FROM {fx_table}
    """
    recent_symbols_query = f"""
    SELECT
        symbol,
        MAX(DATE(date)) AS latest_date,
        COUNT(1) AS row_count
    FROM {price_table}
    GROUP BY symbol
    ORDER BY latest_date DESC, row_count DESC
    LIMIT 8
    """
    stale_symbols_query = f"""
    WITH latest AS (
        SELECT MAX(DATE(date)) AS latest_date
        FROM {price_table}
    ),
    symbol_stats AS (
        SELECT
            symbol,
            MAX(DATE(date)) AS latest_date,
            COUNT(1) AS row_count,
            COUNTIF(SAFE_CAST(adj_price AS FLOAT64) > 0) AS adjusted_price_rows,
            COUNTIF(SAFE_CAST(raw_price AS FLOAT64) > 0) AS raw_price_rows
        FROM {price_table}
        GROUP BY symbol
    )
    SELECT
        symbol,
        latest_date,
        row_count,
        adjusted_price_rows,
        raw_price_rows,
        DATE_DIFF((SELECT latest_date FROM latest), latest_date, DAY) AS stale_days
    FROM symbol_stats
    WHERE latest_date IS NOT NULL
      AND DATE_DIFF((SELECT latest_date FROM latest), latest_date, DAY) > 0
    ORDER BY stale_days DESC, latest_date ASC, row_count DESC
    LIMIT 12
    """
    adjusted_stale_symbols_query = f"""
    WITH symbol_stats AS (
        SELECT
            symbol,
            MAX(DATE(date)) AS latest_any_date,
            MAX(IF(SAFE_CAST(adj_price AS FLOAT64) > 0, DATE(date), NULL)) AS latest_adjusted_date,
            MAX(IF(SAFE_CAST(raw_price AS FLOAT64) > 0, DATE(date), NULL)) AS latest_raw_date,
            COUNT(1) AS row_count,
            COUNTIF(SAFE_CAST(adj_price AS FLOAT64) > 0) AS adjusted_price_rows,
            COUNTIF(SAFE_CAST(raw_price AS FLOAT64) > 0) AS raw_price_rows
        FROM {price_table}
        GROUP BY symbol
    )
    SELECT
        symbol,
        latest_any_date,
        latest_adjusted_date,
        latest_raw_date,
        row_count,
        adjusted_price_rows,
        raw_price_rows,
        DATE_DIFF(latest_any_date, latest_adjusted_date, DAY) AS adjusted_lag_days,
        DATE_DIFF(latest_any_date, latest_raw_date, DAY) AS raw_lag_days
    FROM symbol_stats
    WHERE latest_any_date IS NOT NULL
      AND (
        latest_adjusted_date IS NULL
        OR DATE_DIFF(latest_any_date, latest_adjusted_date, DAY) >= 7
      )
    ORDER BY adjusted_lag_days DESC, latest_any_date DESC, row_count DESC, symbol
    LIMIT 20
    """
    fx_currencies_query = f"""
    SELECT
        currency,
        MIN(DATE(date)) AS first_date,
        MAX(DATE(date)) AS latest_date,
        COUNT(1) AS row_count
    FROM {fx_table}
    GROUP BY currency
    ORDER BY latest_date DESC, currency
    LIMIT 12
    """

    try:
        price_summary = next(iter(client.query(price_summary_query).result()), None)
        fx_summary = next(iter(client.query(fx_summary_query).result()), None)
        recent_symbols = list(client.query(recent_symbols_query).result())
        stale_symbols = list(client.query(stale_symbols_query).result())
        adjusted_stale_symbols = list(client.query(adjusted_stale_symbols_query).result())
        fx_currencies = list(client.query(fx_currencies_query).result())
    except Exception as exc:
        raise MarketDataQueryError(f"BigQuery diagnostics query failed: {exc}") from exc

    diagnostics["priceSummary"] = _summary_row_to_dict(
        price_summary,
        date_fields=("first_date", "latest_date"),
    )
    diagnostics["fxSummary"] = _summary_row_to_dict(
        fx_summary,
        date_fields=("first_date", "latest_date"),
    )
    diagnostics["recentSymbols"] = [
        _summary_row_to_dict(row, date_fields=("latest_date",))
        for row in recent_symbols
    ]
    diagnostics["staleSymbols"] = [
        _summary_row_to_dict(row, date_fields=("latest_date",))
        for row in stale_symbols
    ]
    diagnostics["adjustedStaleSymbols"] = [
        _summary_row_to_dict(
            row,
            date_fields=("latest_any_date", "latest_adjusted_date", "latest_raw_date"),
        )
        for row in adjusted_stale_symbols
    ]
    diagnostics["fxCurrencies"] = [
        _summary_row_to_dict(row, date_fields=("first_date", "latest_date"))
        for row in fx_currencies
    ]
    diagnostics["qualityScorecard"] = _build_bigquery_quality_scorecard(diagnostics)
    return diagnostics


def load_bigquery_adjusted_backfill_plan(
    *,
    max_daily_return: float = DEFAULT_ADJUSTED_BACKFILL_MAX_DAILY_RETURN,
    limit: int = 20,
) -> Dict:
    diagnostics = load_bigquery_market_diagnostics()
    schema_checks = diagnostics.get("schemaChecks") or {}
    price_schema = schema_checks.get("priceTable") or {}
    adjusted_symbols = diagnostics.get("adjustedStaleSymbols") or []
    bounded_limit = max(1, min(int(limit or 20), 100))
    try:
        bounded_max_daily_return = float(max_daily_return)
    except (TypeError, ValueError):
        bounded_max_daily_return = DEFAULT_ADJUSTED_BACKFILL_MAX_DAILY_RETURN
    bounded_max_daily_return = max(0.05, min(bounded_max_daily_return, 1.0))

    plan = {
        "status": bigquery_market_status(),
        "mode": "dry_run",
        "writesEnabled": False,
        "writeGuard": "This endpoint only builds a safety plan. It does not update BigQuery.",
        "maxDailyReturn": bounded_max_daily_return,
        "symbolsFlagged": len(adjusted_symbols),
        "symbolsInspected": 0,
        "safeToApplyCount": 0,
        "manualReviewCount": 0,
        "nothingToApplyCount": 0,
        "proposedRowCount": 0,
        "candidates": [],
    }

    if not price_schema.get("isReady"):
        plan["blockers"] = ["daily_prices schema is not ready."]
        return plan

    if not adjusted_symbols:
        return plan

    bigquery = _bigquery_module()
    client = _bigquery_client(bigquery)
    price_table = _table_path("BIGQUERY_PRICE_TABLE", DEFAULT_PRICE_TABLE)
    candidates = _load_adjusted_backfill_candidates(
        bigquery=bigquery,
        client=client,
        price_table=price_table,
        symbol_summaries=adjusted_symbols[:bounded_limit],
        max_daily_return=bounded_max_daily_return,
    )

    plan["candidates"] = candidates
    plan["symbolsInspected"] = len(candidates)
    plan["safeToApplyCount"] = sum(1 for item in candidates if item["decision"] == "safe_to_apply")
    plan["manualReviewCount"] = sum(1 for item in candidates if item["decision"] == "manual_review")
    plan["nothingToApplyCount"] = sum(1 for item in candidates if item["decision"] == "nothing_to_apply")
    plan["proposedRowCount"] = sum(int(item.get("proposed", {}).get("rowCount") or 0) for item in candidates)
    plan["blockers"] = [
        f"{item['symbol']}: {', '.join(item['reasons'])}"
        for item in candidates
        if item["decision"] == "manual_review"
    ][:8]
    return plan


def apply_bigquery_adjusted_backfill(
    *,
    symbols: Optional[Iterable[str]] = None,
    max_daily_return: float = DEFAULT_ADJUSTED_BACKFILL_MAX_DAILY_RETURN,
    limit: int = 20,
) -> Dict:
    selected_symbols = set(_dedupe([symbol for symbol in symbols or [] if symbol]))
    plan = load_bigquery_adjusted_backfill_plan(
        max_daily_return=max_daily_return,
        limit=limit,
    )
    safe_candidates = [
        candidate
        for candidate in plan.get("candidates", [])
        if candidate.get("decision") == "safe_to_apply"
        and (not selected_symbols or candidate.get("symbol") in selected_symbols)
    ]

    execution = {
        "status": "skipped" if not safe_candidates else "applied",
        "requestedSymbols": sorted(selected_symbols),
        "safeCandidateCount": len(safe_candidates),
        "updatedRowCount": 0,
        "appliedSymbols": [],
        "skippedSymbols": [
            {
                "symbol": candidate.get("symbol"),
                "decision": candidate.get("decision"),
                "reasons": candidate.get("reasons"),
            }
            for candidate in plan.get("candidates", [])
            if candidate.get("decision") != "safe_to_apply"
            or (selected_symbols and candidate.get("symbol") not in selected_symbols)
        ],
    }

    if not safe_candidates:
        return {
            **plan,
            "mode": "apply",
            "writesEnabled": True,
            "execution": execution,
        }

    bigquery = _bigquery_module()
    client = _bigquery_client(bigquery)
    price_table = _table_path("BIGQUERY_PRICE_TABLE", DEFAULT_PRICE_TABLE)

    for candidate in safe_candidates:
        result = _apply_adjusted_backfill_candidate(
            bigquery=bigquery,
            client=client,
            price_table=price_table,
            candidate=candidate,
        )
        execution["updatedRowCount"] += int(result["updatedRowCount"])
        execution["appliedSymbols"].append(result)

    return {
        **plan,
        "mode": "apply",
        "writesEnabled": True,
        "execution": execution,
    }


def _empty_adjusted_backfill_candidate(symbol_summary: Dict) -> Dict:
    symbol = str(symbol_summary.get("symbol") or "").strip()
    latest_adjusted_date = _parse_internal_iso_date(symbol_summary.get("latest_adjusted_date"))
    latest_any_date = _parse_internal_iso_date(symbol_summary.get("latest_any_date"))
    latest_raw_date = _parse_internal_iso_date(symbol_summary.get("latest_raw_date"))

    return {
        "symbol": symbol,
        "decision": "manual_review",
        "canApply": False,
        "reasons": [],
        "latestAnyDate": latest_any_date.isoformat() if latest_any_date else None,
        "latestAdjustedDate": latest_adjusted_date.isoformat() if latest_adjusted_date else None,
        "latestRawDate": latest_raw_date.isoformat() if latest_raw_date else None,
        "adjustedLagDays": symbol_summary.get("adjusted_lag_days"),
        "rowCount": symbol_summary.get("row_count"),
        "rawPriceRows": symbol_summary.get("raw_price_rows"),
        "adjustedPriceRows": symbol_summary.get("adjusted_price_rows"),
        "anchor": None,
        "proposed": {"rowCount": 0, "firstDate": None, "latestDate": None, "method": None},
        "riskChecks": {
            "maxAbsRawDailyReturn": None,
            "maxAbsRawDailyReturnDate": None,
            "duplicateDateCount": 0,
            "duplicateRawConflictCount": 0,
            "jumpDates": [],
        },
    }


def _build_adjusted_backfill_candidate_from_records(
    *,
    symbol_summary: Dict,
    records: List[Dict],
    max_daily_return: float,
) -> Dict:
    symbol = str(symbol_summary.get("symbol") or "").strip()
    latest_adjusted_date = _parse_internal_iso_date(symbol_summary.get("latest_adjusted_date"))
    candidate = _empty_adjusted_backfill_candidate(symbol_summary)

    if not symbol:
        candidate["reasons"].append("missing_symbol")
        return candidate
    if not latest_adjusted_date:
        candidate["reasons"].append("no_adjusted_anchor")
        return candidate

    anchor_records = [
        record
        for record in records
        if record["date"] <= latest_adjusted_date
        and record["raw_price"] is not None
        and record["adj_price"] is not None
    ]
    if not anchor_records:
        candidate["reasons"].append("missing_positive_anchor_row")
        return candidate

    anchor_record = max(anchor_records, key=lambda item: item["date"])
    anchor_ratio = anchor_record["adj_price"] / anchor_record["raw_price"]
    candidate["anchor"] = {
        "date": anchor_record["date"].isoformat(),
        "rawPrice": _finite_or_none(anchor_record["raw_price"]),
        "adjPrice": _finite_or_none(anchor_record["adj_price"]),
        "adjustmentRatio": _finite_or_none(anchor_ratio),
    }

    if not np.isfinite(anchor_ratio) or anchor_ratio <= 0:
        candidate["reasons"].append("invalid_anchor_ratio")
        return candidate
    if anchor_ratio < 0.2 or anchor_ratio > 5:
        candidate["reasons"].append("anchor_ratio_outlier")
        return candidate

    rows_after_anchor = [record for record in records if record["date"] > anchor_record["date"]]
    proposed_rows = [
        record
        for record in rows_after_anchor
        if record["raw_price"] is not None and record["adj_price"] is None
    ]
    if not proposed_rows:
        candidate["decision"] = "nothing_to_apply"
        candidate["reasons"].append("no_missing_adjusted_rows_after_anchor")
        return candidate

    duplicate_date_count, duplicate_raw_conflict_count = _duplicate_price_date_counts(rows_after_anchor)
    raw_risk = _raw_price_continuity_risk(
        [anchor_record, *rows_after_anchor],
        max_daily_return=max_daily_return,
    )
    candidate["riskChecks"] = {
        "maxAbsRawDailyReturn": _finite_or_none(raw_risk["max_abs_return"]),
        "maxAbsRawDailyReturnDate": raw_risk["max_abs_return_date"],
        "duplicateDateCount": duplicate_date_count,
        "duplicateRawConflictCount": duplicate_raw_conflict_count,
        "jumpDates": raw_risk["jump_dates"],
    }

    proposed_values = [record["raw_price"] * anchor_ratio for record in proposed_rows]
    proposed_dates = sorted({record["date"] for record in proposed_rows})
    candidate["proposed"] = {
        "rowCount": len(proposed_rows),
        "firstDate": proposed_dates[0].isoformat() if proposed_dates else None,
        "latestDate": proposed_dates[-1].isoformat() if proposed_dates else None,
        "method": "adj_price = raw_price * last_valid_adjusted_to_raw_ratio",
        "estimatedAdjMin": _finite_or_none(min(proposed_values) if proposed_values else None),
        "estimatedAdjMax": _finite_or_none(max(proposed_values) if proposed_values else None),
    }

    if duplicate_raw_conflict_count:
        candidate["reasons"].append("same_date_raw_price_conflict")
    if raw_risk["jump_dates"]:
        candidate["reasons"].append("raw_price_jump_detected")

    if candidate["reasons"]:
        candidate["decision"] = "manual_review"
        candidate["canApply"] = False
        return candidate

    candidate["decision"] = "safe_to_apply"
    candidate["canApply"] = True
    candidate["reasons"].append("passed_safety_checks")
    return candidate


def _load_adjusted_backfill_candidates(
    *,
    bigquery,
    client,
    price_table: str,
    symbol_summaries: List[Dict],
    max_daily_return: float,
) -> List[Dict]:
    summaries = list(symbol_summaries)
    symbols = []
    start_dates = []

    for symbol_summary in summaries:
        symbol = str(symbol_summary.get("symbol") or "").strip()
        latest_adjusted_date = _parse_internal_iso_date(symbol_summary.get("latest_adjusted_date"))
        if symbol and latest_adjusted_date:
            symbols.append(symbol)
            start_dates.append(latest_adjusted_date - timedelta(days=10))

    records_by_symbol: Dict[str, List[Dict]] = {}
    if symbols and start_dates:
        query = f"""
        SELECT
            symbol,
            DATE(date) AS price_date,
            SAFE_CAST(raw_price AS FLOAT64) AS raw_price,
            SAFE_CAST(adj_price AS FLOAT64) AS adj_price
        FROM {price_table}
        WHERE symbol IN UNNEST(@symbols)
          AND DATE(date) >= @start_date
        ORDER BY symbol, price_date, raw_price, adj_price
        """

        try:
            rows = list(
                client.query(
                    query,
                    job_config=bigquery.QueryJobConfig(
                        query_parameters=[
                            bigquery.ArrayQueryParameter("symbols", "STRING", symbols),
                            bigquery.ScalarQueryParameter("start_date", "DATE", min(start_dates)),
                        ]
                    ),
                ).result()
            )
        except Exception as exc:
            raise MarketDataQueryError(f"BigQuery adjusted backfill batch plan query failed: {exc}") from exc

        for row in rows:
            symbol = str(row["symbol"] or "").strip()
            records_by_symbol.setdefault(symbol, []).append(
                {
                    "date": row["price_date"],
                    "raw_price": _positive_number_or_none(row["raw_price"]),
                    "adj_price": _positive_number_or_none(row["adj_price"]),
                }
            )

    return [
        _build_adjusted_backfill_candidate_from_records(
            symbol_summary=symbol_summary,
            records=records_by_symbol.get(str(symbol_summary.get("symbol") or "").strip(), []),
            max_daily_return=max_daily_return,
        )
        for symbol_summary in summaries
    ]


def _load_adjusted_backfill_candidate(
    *,
    bigquery,
    client,
    price_table: str,
    symbol_summary: Dict,
    max_daily_return: float,
) -> Dict:
    symbol = str(symbol_summary.get("symbol") or "").strip()
    latest_adjusted_date = _parse_internal_iso_date(symbol_summary.get("latest_adjusted_date"))

    if not symbol:
        return _build_adjusted_backfill_candidate_from_records(
            symbol_summary=symbol_summary,
            records=[],
            max_daily_return=max_daily_return,
        )
    if not latest_adjusted_date:
        return _build_adjusted_backfill_candidate_from_records(
            symbol_summary=symbol_summary,
            records=[],
            max_daily_return=max_daily_return,
        )

    start_date = latest_adjusted_date - timedelta(days=10)
    query = f"""
    SELECT
        DATE(date) AS price_date,
        SAFE_CAST(raw_price AS FLOAT64) AS raw_price,
        SAFE_CAST(adj_price AS FLOAT64) AS adj_price
    FROM {price_table}
    WHERE symbol = @symbol
      AND DATE(date) >= @start_date
    ORDER BY price_date, raw_price, adj_price
    """

    try:
        rows = list(
            client.query(
                query,
                job_config=bigquery.QueryJobConfig(
                    query_parameters=[
                        bigquery.ScalarQueryParameter("symbol", "STRING", symbol),
                        bigquery.ScalarQueryParameter("start_date", "DATE", start_date),
                    ]
                ),
            ).result()
        )
    except Exception as exc:
        raise MarketDataQueryError(f"BigQuery adjusted backfill plan query failed: {exc}") from exc

    records = [
        {
            "date": row["price_date"],
            "raw_price": _positive_number_or_none(row["raw_price"]),
            "adj_price": _positive_number_or_none(row["adj_price"]),
        }
        for row in rows
    ]

    return _build_adjusted_backfill_candidate_from_records(
        symbol_summary=symbol_summary,
        records=records,
        max_daily_return=max_daily_return,
    )


def _apply_adjusted_backfill_candidate(*, bigquery, client, price_table: str, candidate: Dict) -> Dict:
    proposed = candidate.get("proposed") or {}
    anchor = candidate.get("anchor") or {}
    symbol = candidate.get("symbol")
    first_date = _parse_internal_iso_date(proposed.get("firstDate"))
    latest_date = _parse_internal_iso_date(proposed.get("latestDate"))
    adjustment_ratio = _positive_number_or_none(anchor.get("adjustmentRatio"))

    if not symbol or not first_date or not latest_date or adjustment_ratio is None:
        raise MarketDataError(f"Adjusted backfill candidate is incomplete for: {symbol or '--'}")

    update_query = f"""
    UPDATE {price_table}
    SET adj_price = SAFE_CAST(raw_price AS FLOAT64) * @adjustment_ratio
    WHERE symbol = @symbol
      AND DATE(date) >= @first_date
      AND DATE(date) <= @latest_date
      AND SAFE_CAST(raw_price AS FLOAT64) > 0
      AND (SAFE_CAST(adj_price AS FLOAT64) IS NULL OR SAFE_CAST(adj_price AS FLOAT64) <= 0)
    """

    try:
        job = client.query(
            update_query,
            job_config=bigquery.QueryJobConfig(
                query_parameters=[
                    bigquery.ScalarQueryParameter("symbol", "STRING", symbol),
                    bigquery.ScalarQueryParameter("first_date", "DATE", first_date),
                    bigquery.ScalarQueryParameter("latest_date", "DATE", latest_date),
                    bigquery.ScalarQueryParameter("adjustment_ratio", "FLOAT64", adjustment_ratio),
                ]
            ),
        )
        job.result()
    except Exception as exc:
        raise MarketDataQueryError(f"BigQuery adjusted backfill update failed for {symbol}: {exc}") from exc

    return {
        "symbol": symbol,
        "updatedRowCount": int(job.num_dml_affected_rows or 0),
        "firstDate": first_date.isoformat(),
        "latestDate": latest_date.isoformat(),
        "adjustmentRatio": _finite_or_none(adjustment_ratio),
    }


def _normalize_asset_category(category: Optional[str]) -> str:
    normalized = (category or "all").strip().lower()
    return normalized if normalized in VALID_ASSET_CATEGORIES else "all"


def _asset_category_label(category: Optional[str]) -> str:
    return ASSET_CATEGORY_LABELS.get(_normalize_asset_category(category), ASSET_CATEGORY_LABELS["other"])


def _asset_categories() -> List[Dict[str, str]]:
    return [
        {"id": category, "label": label}
        for category, label in ASSET_CATEGORY_LABELS.items()
    ]


def _asset_category_sql(symbol_expression: str) -> str:
    return f"""
    CASE
        WHEN REGEXP_CONTAINS(UPPER({symbol_expression}), r'^[A-Z]{{3}}[_-]?[A-Z]{{3}}$') THEN 'fx'
        WHEN STARTS_WITH({symbol_expression}, '^') THEN 'index'
        WHEN REGEXP_CONTAINS(UPPER({symbol_expression}), r'^[0-9]{{4,6}}\\.TW$') THEN 'tw_etf'
        WHEN UPPER({symbol_expression}) IN ('SPY', 'QQQ', 'VOO', 'VTI', 'IVV', 'DIA', 'IWM', 'AGG', 'BND', 'TLT', 'GLD', 'SLV', 'VNQ')
          OR REGEXP_CONTAINS(UPPER({symbol_expression}), r'ETF') THEN 'us_etf'
        WHEN REGEXP_CONTAINS(UPPER({symbol_expression}), r'^[A-Z]{{1,5}}(\\.[A-Z]{{1,3}})?$') THEN 'stock'
        WHEN REGEXP_CONTAINS(UPPER({symbol_expression}), r'FUND|FIDELITY|FRANKLIN|ALLIANZ|ALLIANCE|ABERDEEN|BLACKROCK|UBS|GOLDMAN')
          OR REGEXP_CONTAINS({symbol_expression}, r'_') THEN 'fund'
        ELSE 'other'
    END
    """


def search_bigquery_assets(
    *,
    query: Optional[str] = None,
    category: str = "all",
    limit: int = 20,
    offset: int = 0,
) -> Dict:
    bigquery = _bigquery_module()
    client = _bigquery_client(bigquery)
    price_table = _table_path("BIGQUERY_PRICE_TABLE", DEFAULT_PRICE_TABLE)
    clean_query = (query or "").strip().lower()
    normalized_category = _normalize_asset_category(category)
    bounded_limit = max(1, min(int(limit or 20), 500))
    bounded_offset = max(0, int(offset or 0))
    category_sql = _asset_category_sql("symbol")

    query_parameters = [
        bigquery.ScalarQueryParameter("limit", "INT64", bounded_limit),
        bigquery.ScalarQueryParameter("offset", "INT64", bounded_offset),
        bigquery.ScalarQueryParameter("category", "STRING", normalized_category),
        bigquery.ScalarQueryParameter("query", "STRING", clean_query),
        bigquery.ScalarQueryParameter("query_pattern", "STRING", f"%{clean_query}%"),
    ]
    if clean_query:
        query_parameters.extend(
            [
                bigquery.ScalarQueryParameter("query_exact", "STRING", clean_query),
                bigquery.ScalarQueryParameter("query_prefix", "STRING", clean_query),
            ]
        )
        order_clause = """
        CASE
            WHEN LOWER(symbol) = @query_exact THEN 0
            WHEN STARTS_WITH(LOWER(symbol), @query_prefix) THEN 1
            ELSE 2
        END,
        latest_date DESC,
        row_count DESC,
        symbol
        """
    else:
        order_clause = "latest_date DESC, row_count DESC, symbol"

    asset_query = f"""
    WITH base AS (
        SELECT
            symbol,
            DATE(date) AS price_date,
            SAFE_CAST(adj_price AS FLOAT64) AS adj_price,
            SAFE_CAST(raw_price AS FLOAT64) AS raw_price,
            {category_sql} AS category
        FROM {price_table}
        WHERE @query = '' OR LOWER(symbol) LIKE @query_pattern
    ),
    assets AS (
        SELECT
            symbol,
            category,
            MIN(price_date) AS first_date,
            MAX(price_date) AS latest_date,
            COUNT(1) AS row_count,
            COUNTIF(adj_price > 0) AS adjusted_price_rows,
            COUNTIF(raw_price > 0) AS raw_price_rows
        FROM base
        WHERE @category = 'all' OR category = @category
        GROUP BY symbol, category
    ),
    total_assets AS (
        SELECT COUNT(1) AS total FROM assets
    )
    SELECT
        assets.*,
        total_assets.total AS total_assets
    FROM assets
    CROSS JOIN total_assets
    ORDER BY {order_clause}
    LIMIT @limit
    OFFSET @offset
    """

    try:
        rows = list(
            client.query(
                asset_query,
                job_config=bigquery.QueryJobConfig(query_parameters=query_parameters),
            ).result()
        )
    except Exception as exc:
        raise MarketDataQueryError(f"BigQuery asset search query failed: {exc}") from exc

    assets = []
    for row in rows:
        asset = _summary_row_to_dict(row, date_fields=("first_date", "latest_date"))
        asset["category_label"] = _asset_category_label(asset.get("category"))
        asset.pop("total_assets", None)
        assets.append(asset)

    total = int(rows[0]["total_assets"]) if rows else 0

    return {
        "status": bigquery_market_status(),
        "query": clean_query,
        "category": normalized_category,
        "categoryLabel": _asset_category_label(normalized_category),
        "categories": _asset_categories(),
        "limit": bounded_limit,
        "offset": bounded_offset,
        "total": total,
        "hasMore": bounded_offset + len(assets) < total,
        "assets": assets,
    }


def load_bigquery_quote_cards(
    *,
    price_basis: str = "adjusted",
    query: Optional[str] = None,
    category: str = "all",
    limit: int = 500,
    offset: int = 0,
) -> Dict:
    bigquery = _bigquery_module()
    client = _bigquery_client(bigquery)
    selected_price_column = _price_column(price_basis)
    normalized_price_basis = _normalize_price_basis(price_basis)
    price_table = _table_path("BIGQUERY_PRICE_TABLE", DEFAULT_PRICE_TABLE)
    bounded_limit = max(1, min(int(limit or 500), 500))
    bounded_offset = max(0, int(offset or 0))
    clean_query = (query or "").strip().lower()
    normalized_category = _normalize_asset_category(category)
    category_sql = _asset_category_sql("symbol")

    query = f"""
    WITH base AS (
        SELECT
            symbol,
            DATE(date) AS price_date,
            SAFE_CAST({selected_price_column} AS FLOAT64) AS selected_price,
            {category_sql} AS category
        FROM {price_table}
        WHERE @query = '' OR LOWER(symbol) LIKE @query_pattern
    ),
    filtered_base AS (
        SELECT *
        FROM base
        WHERE @category = 'all' OR category = @category
    ),
    symbol_stats AS (
        SELECT
            symbol,
            category,
            MIN(price_date) AS first_date,
            MAX(price_date) AS latest_any_date,
            COUNT(1) AS row_count,
            COUNTIF(selected_price > 0) AS selected_price_rows
        FROM filtered_base
        GROUP BY symbol, category
    ),
    valid_prices AS (
        SELECT
            symbol,
            price_date,
            selected_price
        FROM filtered_base
        WHERE selected_price IS NOT NULL
          AND selected_price > 0
    ),
    ranked_recent AS (
        SELECT
            symbol,
            price_date,
            selected_price,
            ROW_NUMBER() OVER (PARTITION BY symbol ORDER BY price_date DESC) AS recent_rank
        FROM valid_prices
    ),
    latest AS (
        SELECT
            symbol,
            price_date AS latest_date,
            selected_price AS latest_price,
            EXTRACT(YEAR FROM price_date) AS latest_year
        FROM ranked_recent
        WHERE recent_rank = 1
    ),
    previous AS (
        SELECT
            symbol,
            price_date AS previous_date,
            selected_price AS previous_price
        FROM ranked_recent
        WHERE recent_rank = 2
    ),
    ytd_candidates AS (
        SELECT
            valid_prices.symbol,
            valid_prices.price_date,
            valid_prices.selected_price,
            ROW_NUMBER() OVER (PARTITION BY valid_prices.symbol ORDER BY valid_prices.price_date ASC) AS ytd_rank
        FROM valid_prices
        JOIN latest USING (symbol)
        WHERE EXTRACT(YEAR FROM valid_prices.price_date) = latest.latest_year
          AND valid_prices.price_date <= latest.latest_date
    ),
    ytd_start AS (
        SELECT
            symbol,
            price_date AS ytd_start_date,
            selected_price AS ytd_start_price
        FROM ytd_candidates
        WHERE ytd_rank = 1
    ),
    total_symbols AS (
        SELECT COUNT(1) AS total FROM symbol_stats
    )
    SELECT
        symbol_stats.symbol,
        symbol_stats.category,
        symbol_stats.first_date,
        symbol_stats.latest_any_date,
        latest.latest_date,
        latest.latest_price,
        previous.previous_date,
        previous.previous_price,
        SAFE_DIVIDE(latest.latest_price, previous.previous_price) - 1 AS daily_return,
        latest.latest_price - previous.previous_price AS daily_price_change,
        ytd_start.ytd_start_date,
        ytd_start.ytd_start_price,
        SAFE_DIVIDE(latest.latest_price, ytd_start.ytd_start_price) - 1 AS ytd_return,
        latest.latest_price - ytd_start.ytd_start_price AS ytd_price_change,
        symbol_stats.row_count,
        symbol_stats.selected_price_rows,
        total_symbols.total AS total_symbols
    FROM symbol_stats
    CROSS JOIN total_symbols
    LEFT JOIN latest USING (symbol)
    LEFT JOIN previous USING (symbol)
    LEFT JOIN ytd_start USING (symbol)
    ORDER BY latest.latest_date DESC, symbol_stats.row_count DESC, symbol_stats.symbol
    LIMIT @limit
    OFFSET @offset
    """

    try:
        rows = list(
            client.query(
                query,
                job_config=bigquery.QueryJobConfig(
                    query_parameters=[
                        bigquery.ScalarQueryParameter("limit", "INT64", bounded_limit),
                        bigquery.ScalarQueryParameter("offset", "INT64", bounded_offset),
                        bigquery.ScalarQueryParameter("category", "STRING", normalized_category),
                        bigquery.ScalarQueryParameter("query", "STRING", clean_query),
                        bigquery.ScalarQueryParameter("query_pattern", "STRING", f"%{clean_query}%"),
                    ]
                ),
            ).result()
        )
    except Exception as exc:
        raise MarketDataQueryError(f"BigQuery quote cards query failed: {exc}") from exc

    quotes = []
    for row in rows:
        quote = _summary_row_to_dict(
            row,
            date_fields=("first_date", "latest_any_date", "latest_date", "previous_date", "ytd_start_date"),
        )
        quote["category_label"] = _asset_category_label(quote.get("category"))
        quote.pop("total_symbols", None)
        quotes.append(quote)

    total = int(rows[0]["total_symbols"]) if rows else 0

    return {
        "status": bigquery_market_status(),
        "priceBasis": normalized_price_basis,
        "query": clean_query,
        "category": normalized_category,
        "categoryLabel": _asset_category_label(normalized_category),
        "categories": _asset_categories(),
        "limit": bounded_limit,
        "offset": bounded_offset,
        "total": total,
        "hasMore": bounded_offset + len(quotes) < total,
        "quotes": quotes,
    }


def load_bigquery_asset_profile(*, symbol: str, price_basis: str = "adjusted", recent_limit: int = 30) -> Dict:
    clean_symbol = (symbol or "").strip()
    if not clean_symbol:
        raise MarketDataError("Symbol is required.")

    bigquery = _bigquery_module()
    client = _bigquery_client(bigquery)
    selected_price_column = _price_column(price_basis)
    normalized_price_basis = _normalize_price_basis(price_basis)
    price_table = _table_path("BIGQUERY_PRICE_TABLE", DEFAULT_PRICE_TABLE)
    bounded_recent_limit = max(5, min(int(recent_limit or 30), 120))

    query = f"""
    SELECT
        DATE(date) AS price_date,
        symbol,
        SAFE_CAST(adj_price AS FLOAT64) AS adj_price,
        SAFE_CAST(raw_price AS FLOAT64) AS raw_price,
        SAFE_CAST(dividend AS FLOAT64) AS dividend,
        SAFE_CAST({selected_price_column} AS FLOAT64) AS selected_price
    FROM {price_table}
    WHERE symbol = @symbol
    ORDER BY price_date
    """

    try:
        rows = list(
            client.query(
                query,
                job_config=bigquery.QueryJobConfig(
                    query_parameters=[
                        bigquery.ScalarQueryParameter("symbol", "STRING", clean_symbol),
                    ]
                ),
            ).result()
        )
    except Exception as exc:
        raise MarketDataQueryError(f"BigQuery asset profile query failed: {exc}") from exc

    records = [
        {
            "date": row["price_date"],
            "symbol": row["symbol"],
            "adj_price": row["adj_price"],
            "raw_price": row["raw_price"],
            "dividend": row["dividend"],
            "selected_price": row["selected_price"],
        }
        for row in rows
    ]
    if not records:
        raise MarketDataError(f"No BigQuery price data found for: {clean_symbol}")

    frame = pd.DataFrame.from_records(records)
    frame["date"] = pd.to_datetime(frame["date"])
    for column in ("adj_price", "raw_price", "dividend", "selected_price"):
        frame[column] = pd.to_numeric(frame[column], errors="coerce")

    frame = frame.sort_values("date")
    frame["daily_return"] = frame["selected_price"].pct_change(fill_method=None)
    valid_frame = frame[frame["selected_price"].notna() & (frame["selected_price"] > 0)].copy()
    if valid_frame.empty:
        raise MarketDataError(f"No valid {normalized_price_basis} price data found for: {clean_symbol}")

    valid_returns = valid_frame["selected_price"].pct_change(fill_method=None).replace([np.inf, -np.inf], np.nan)
    first_price = float(valid_frame["selected_price"].iloc[0])
    latest_price = float(valid_frame["selected_price"].iloc[-1])
    first_date = valid_frame["date"].iloc[0]
    latest_date = valid_frame["date"].iloc[-1]
    first_any_date = frame["date"].min()
    latest_any_date = frame["date"].max()
    elapsed_days = max(int((latest_date - first_date).days), 0)
    total_return = latest_price / first_price - 1 if first_price > 0 else None
    annualized_return = (
        (latest_price / first_price) ** (365.25 / elapsed_days) - 1
        if first_price > 0 and elapsed_days > 0
        else None
    )
    annualized_volatility = (
        float(valid_returns.std(ddof=0) * np.sqrt(252))
        if valid_returns.dropna().shape[0] > 1
        else None
    )
    drawdown_series = valid_frame["selected_price"] / valid_frame["selected_price"].cummax() - 1
    valid_return_count = int(valid_returns.dropna().shape[0])
    positive_day_ratio = (
        float((valid_returns.dropna() > 0).sum() / valid_return_count)
        if valid_return_count
        else None
    )

    frame_for_recent = frame.tail(bounded_recent_limit).copy()
    frame_for_recent["date"] = frame_for_recent["date"].dt.strftime("%Y-%m-%d")

    def finite_or_none(value):
        return float(value) if value is not None and np.isfinite(value) else None

    return {
        "status": bigquery_market_status(),
        "symbol": clean_symbol,
        "priceBasis": normalized_price_basis,
        "summary": {
            "first_date": first_date.strftime("%Y-%m-%d"),
            "latest_date": latest_date.strftime("%Y-%m-%d"),
            "first_any_date": first_any_date.strftime("%Y-%m-%d"),
            "latest_any_date": latest_any_date.strftime("%Y-%m-%d"),
            "row_count": int(len(frame)),
            "selected_price_rows": int(valid_frame.shape[0]),
            "missing_selected_price_rows": int(len(frame) - valid_frame.shape[0]),
            "adjusted_price_rows": int((frame["adj_price"].notna() & (frame["adj_price"] > 0)).sum()),
            "raw_price_rows": int((frame["raw_price"].notna() & (frame["raw_price"] > 0)).sum()),
        },
        "metrics": {
            "firstPrice": finite_or_none(first_price),
            "latestPrice": finite_or_none(latest_price),
            "minPrice": finite_or_none(valid_frame["selected_price"].min()),
            "maxPrice": finite_or_none(valid_frame["selected_price"].max()),
            "totalReturn": finite_or_none(total_return),
            "annualizedReturn": finite_or_none(annualized_return),
            "annualizedVolatility": finite_or_none(annualized_volatility),
            "maxDrawdown": finite_or_none(drawdown_series.min()),
            "positiveDayRatio": finite_or_none(positive_day_ratio),
            "bestDay": finite_or_none(valid_returns.max()),
            "worstDay": finite_or_none(valid_returns.min()),
            "latestDailyReturn": finite_or_none(valid_returns.dropna().iloc[-1] if valid_return_count else None),
        },
        "recentPrices": [
            {
                "date": row["date"],
                "raw_price": finite_or_none(row["raw_price"]),
                "adj_price": finite_or_none(row["adj_price"]),
                "dividend": finite_or_none(row["dividend"]),
                "selected_price": finite_or_none(row["selected_price"]),
                "daily_return": finite_or_none(row["daily_return"]),
            }
            for row in frame_for_recent.to_dict("records")
        ],
    }


def load_bigquery_asset_history(
    *,
    symbol: str,
    price_basis: str = "adjusted",
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: int = 365,
) -> Dict:
    clean_symbol = (symbol or "").strip()
    if not clean_symbol:
        raise MarketDataError("Symbol is required.")

    start_dt = _parse_optional_iso_date(start_date, "start_date")
    end_dt = _parse_optional_iso_date(end_date, "end_date")
    if start_dt and end_dt and start_dt > end_dt:
        raise MarketDataError("start_date cannot be later than end_date.")

    bigquery = _bigquery_module()
    client = _bigquery_client(bigquery)
    selected_price_column = _price_column(price_basis)
    normalized_price_basis = _normalize_price_basis(price_basis)
    price_table = _table_path("BIGQUERY_PRICE_TABLE", DEFAULT_PRICE_TABLE)
    bounded_limit = max(20, min(int(limit or 365), 20000))

    where_clauses = ["symbol = @symbol"]
    query_parameters = [
        bigquery.ScalarQueryParameter("symbol", "STRING", clean_symbol),
        bigquery.ScalarQueryParameter("limit", "INT64", bounded_limit),
    ]
    if start_dt:
        where_clauses.append("DATE(date) >= @start_date")
        query_parameters.append(bigquery.ScalarQueryParameter("start_date", "DATE", start_dt))
    if end_dt:
        where_clauses.append("DATE(date) <= @end_date")
        query_parameters.append(bigquery.ScalarQueryParameter("end_date", "DATE", end_dt))

    query = f"""
    SELECT
        DATE(date) AS price_date,
        SAFE_CAST(adj_price AS FLOAT64) AS adj_price,
        SAFE_CAST(raw_price AS FLOAT64) AS raw_price,
        SAFE_CAST(dividend AS FLOAT64) AS dividend,
        SAFE_CAST({selected_price_column} AS FLOAT64) AS selected_price
    FROM {price_table}
    WHERE {" AND ".join(where_clauses)}
    ORDER BY price_date DESC
    LIMIT @limit
    """

    try:
        rows = list(
            client.query(
                query,
                job_config=bigquery.QueryJobConfig(query_parameters=query_parameters),
            ).result()
        )
    except Exception as exc:
        raise MarketDataQueryError(f"BigQuery asset history query failed: {exc}") from exc

    records = [
        {
            "date": row["price_date"],
            "raw_price": row["raw_price"],
            "adj_price": row["adj_price"],
            "dividend": row["dividend"],
            "selected_price": row["selected_price"],
        }
        for row in rows
    ]
    if not records:
        raise MarketDataError(f"No BigQuery price history found for: {clean_symbol}")

    frame = pd.DataFrame.from_records(records)
    frame["date"] = pd.to_datetime(frame["date"])
    for column in ("adj_price", "raw_price", "dividend", "selected_price"):
        frame[column] = pd.to_numeric(frame[column], errors="coerce")

    frame = frame.sort_values("date")
    frame["daily_return"] = frame["selected_price"].pct_change(fill_method=None).replace([np.inf, -np.inf], np.nan)
    valid_frame = frame[frame["selected_price"].notna() & (frame["selected_price"] > 0)].copy()
    if valid_frame.empty:
        raise MarketDataError(f"No valid {normalized_price_basis} price history found for: {clean_symbol}")

    valid_returns = valid_frame["selected_price"].pct_change(fill_method=None).replace([np.inf, -np.inf], np.nan)
    first_price = float(valid_frame["selected_price"].iloc[0])
    latest_price = float(valid_frame["selected_price"].iloc[-1])
    first_date = valid_frame["date"].iloc[0]
    latest_date = valid_frame["date"].iloc[-1]
    first_any_date = frame["date"].min()
    latest_any_date = frame["date"].max()
    elapsed_days = max(int((latest_date - first_date).days), 0)
    total_return = latest_price / first_price - 1 if first_price > 0 else None
    annualized_return = (
        (latest_price / first_price) ** (365.25 / elapsed_days) - 1
        if first_price > 0 and elapsed_days > 0
        else None
    )
    annualized_volatility = (
        float(valid_returns.std(ddof=0) * np.sqrt(252))
        if valid_returns.dropna().shape[0] > 1
        else None
    )
    drawdown_series = valid_frame["selected_price"] / valid_frame["selected_price"].cummax() - 1
    date_gaps = valid_frame["date"].sort_values().diff().dt.days.dropna()
    max_gap_days = int(date_gaps.max()) if not date_gaps.empty else None

    frame_for_output = frame.copy()
    frame_for_output["date"] = frame_for_output["date"].dt.strftime("%Y-%m-%d")
    summary = {
        "requested_start_date": start_dt.isoformat() if start_dt else None,
        "requested_end_date": end_dt.isoformat() if end_dt else None,
        "first_date": first_date.strftime("%Y-%m-%d"),
        "latest_date": latest_date.strftime("%Y-%m-%d"),
        "first_any_date": first_any_date.strftime("%Y-%m-%d"),
        "latest_any_date": latest_any_date.strftime("%Y-%m-%d"),
        "row_count": int(len(frame)),
        "selected_price_rows": int(valid_frame.shape[0]),
        "missing_selected_price_rows": int(len(frame) - valid_frame.shape[0]),
        "max_gap_days": max_gap_days,
        "limit": bounded_limit,
    }
    metrics = {
        "firstPrice": _finite_or_none(first_price),
        "latestPrice": _finite_or_none(latest_price),
        "totalReturn": _finite_or_none(total_return),
        "annualizedReturn": _finite_or_none(annualized_return),
        "annualizedVolatility": _finite_or_none(annualized_volatility),
        "maxDrawdown": _finite_or_none(drawdown_series.min()),
        "bestDay": _finite_or_none(valid_returns.max()),
        "worstDay": _finite_or_none(valid_returns.min()),
    }

    return {
        "status": bigquery_market_status(),
        "symbol": clean_symbol,
        "priceBasis": normalized_price_basis,
        "summary": summary,
        "metrics": metrics,
        "quality": _build_asset_history_quality(summary),
        "prices": [
            {
                "date": row["date"],
                "raw_price": _finite_or_none(row["raw_price"]),
                "adj_price": _finite_or_none(row["adj_price"]),
                "dividend": _finite_or_none(row["dividend"]),
                "selected_price": _finite_or_none(row["selected_price"]),
                "daily_return": _finite_or_none(row["daily_return"]),
            }
            for row in frame_for_output.to_dict("records")
        ],
    }


def load_portfolio_return_input(
    *,
    symbols: Iterable[str],
    benchmark_symbol: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    price_basis: str = "adjusted",
    pricing_currency: str = "original",
    currency_by_symbol: Optional[Dict[str, str]] = None,
) -> Dict:
    selected_symbols = _dedupe([symbol for symbol in symbols if symbol])
    if benchmark_symbol:
        selected_symbols = _dedupe([*selected_symbols, benchmark_symbol])
    if not selected_symbols:
        raise MarketDataError("At least one symbol is required.")

    price_frame = _load_price_frame(
        symbols=selected_symbols,
        start_date=start_date,
        end_date=end_date,
        price_basis=price_basis,
    )
    missing_symbols = [symbol for symbol in selected_symbols if symbol not in price_frame.columns]
    if missing_symbols:
        raise MarketDataError(f"No BigQuery price data found for: {', '.join(missing_symbols)}")

    target_currency = _normalize_currency_mode(pricing_currency)
    if target_currency == "TWD":
        price_frame = _convert_price_frame_to_twd(
            price_frame=price_frame,
            symbols=selected_symbols,
            currency_by_symbol=currency_by_symbol or {},
        )

    returns_frame = price_frame[selected_symbols].pct_change(fill_method=None)
    returns_frame = returns_frame.replace([np.inf, -np.inf], np.nan)

    returns_by_symbol = {
        symbol: _series_to_python_numbers(returns_frame[symbol])
        for symbol in selected_symbols
    }
    benchmark_returns = returns_by_symbol.get(benchmark_symbol) if benchmark_symbol else None

    return {
        "returns_by_symbol": returns_by_symbol,
        "benchmark_returns": benchmark_returns,
        "dates": [value.strftime("%Y-%m-%d") for value in returns_frame.index],
        "metadata": {
            "source": "BigQuery",
            "symbols": selected_symbols,
            "benchmarkSymbol": benchmark_symbol,
            "priceBasis": _normalize_price_basis(price_basis),
            "pricingCurrency": target_currency,
            "startDate": returns_frame.index.min().strftime("%Y-%m-%d") if len(returns_frame.index) else None,
            "endDate": returns_frame.index.max().strftime("%Y-%m-%d") if len(returns_frame.index) else None,
            "observations": int(len(returns_frame.index)),
            **bigquery_market_status(),
        },
    }


def _load_price_frame(
    *,
    symbols: List[str],
    start_date: Optional[str],
    end_date: Optional[str],
    price_basis: str,
) -> pd.DataFrame:
    bigquery = _bigquery_module()
    client = _bigquery_client(bigquery)
    price_column = _price_column(price_basis)
    price_table = _table_path("BIGQUERY_PRICE_TABLE", DEFAULT_PRICE_TABLE)

    where_clauses = [
        "symbol IN UNNEST(@symbols)",
        f"SAFE_CAST({price_column} AS FLOAT64) > 0",
    ]
    query_parameters = [
        bigquery.ArrayQueryParameter("symbols", "STRING", symbols),
    ]

    if start_date:
        where_clauses.append("date >= @start_date")
        query_parameters.append(bigquery.ScalarQueryParameter("start_date", "DATE", start_date))
    if end_date:
        where_clauses.append("date <= @end_date")
        query_parameters.append(bigquery.ScalarQueryParameter("end_date", "DATE", end_date))

    query = f"""
    SELECT
        DATE(date) AS price_date,
        symbol,
        SAFE_CAST({price_column} AS FLOAT64) AS price
    FROM {price_table}
    WHERE {' AND '.join(where_clauses)}
    ORDER BY price_date
    """

    try:
        rows = client.query(
            query,
            job_config=bigquery.QueryJobConfig(query_parameters=query_parameters),
        ).result()
    except Exception as exc:
        raise MarketDataQueryError(f"BigQuery price query failed: {exc}") from exc

    frame = _rows_to_frame(rows, date_column="price_date", value_column="price")
    if frame.empty:
        raise MarketDataError("BigQuery price query returned no rows.")
    return frame


def _convert_price_frame_to_twd(
    *,
    price_frame: pd.DataFrame,
    symbols: List[str],
    currency_by_symbol: Dict[str, str],
) -> pd.DataFrame:
    symbol_currency = {
        symbol: (currency_by_symbol.get(symbol) or _infer_symbol_currency(symbol)).upper()
        for symbol in symbols
    }
    required_currencies = sorted({currency for currency in symbol_currency.values() if currency != "TWD"})
    if not required_currencies:
        return price_frame

    fx_frame = _load_fx_frame(
        currencies=required_currencies,
        start_date=price_frame.index.min().strftime("%Y-%m-%d"),
        end_date=price_frame.index.max().strftime("%Y-%m-%d"),
    )
    fx_frame = fx_frame.reindex(price_frame.index).ffill().bfill()

    missing_currencies = [currency for currency in required_currencies if currency not in fx_frame.columns]
    if missing_currencies:
        raise MarketDataError(f"Missing FX data for: {', '.join(missing_currencies)}")

    converted = price_frame.copy()
    for symbol, currency in symbol_currency.items():
        if currency == "TWD":
            continue
        converted[symbol] = converted[symbol] * fx_frame[currency]
    return converted


def _load_fx_frame(*, currencies: List[str], start_date: str, end_date: str) -> pd.DataFrame:
    bigquery = _bigquery_module()
    client = _bigquery_client(bigquery)
    fx_table = _table_path("BIGQUERY_FX_TABLE", DEFAULT_FX_TABLE)

    query = f"""
    SELECT
        DATE(date) AS fx_date,
        currency,
        SAFE_CAST(rate AS FLOAT64) AS rate
    FROM {fx_table}
    WHERE currency IN UNNEST(@currencies)
      AND DATE(date) >= @start_date
      AND DATE(date) <= @end_date
      AND SAFE_CAST(rate AS FLOAT64) > 0
    ORDER BY fx_date
    """

    try:
        rows = client.query(
            query,
            job_config=bigquery.QueryJobConfig(
                query_parameters=[
                    bigquery.ArrayQueryParameter("currencies", "STRING", currencies),
                    bigquery.ScalarQueryParameter("start_date", "DATE", start_date),
                    bigquery.ScalarQueryParameter("end_date", "DATE", end_date),
                ]
            ),
        ).result()
    except Exception as exc:
        raise MarketDataQueryError(f"BigQuery FX query failed: {exc}") from exc

    frame = _rows_to_frame(rows, date_column="fx_date", value_column="rate")
    if frame.empty:
        raise MarketDataError("BigQuery FX query returned no rows.")
    return frame


def _rows_to_frame(rows, *, date_column: str, value_column: str) -> pd.DataFrame:
    records = [
        {
            "date": row[date_column],
            "symbol": row.get("symbol") if "symbol" in row.keys() else row.get("currency"),
            "value": row[value_column],
        }
        for row in rows
    ]
    if not records:
        return pd.DataFrame()

    frame = pd.DataFrame.from_records(records)
    frame["date"] = pd.to_datetime(frame["date"])
    frame = frame.drop_duplicates(subset=["date", "symbol"], keep="last")
    return frame.pivot(index="date", columns="symbol", values="value").sort_index()


def _load_schema_checks(*, bigquery, client, price_table_name: str, fx_table_name: str) -> Dict:
    project_id, dataset, _, _ = _settings()
    information_schema = f"`{project_id}.{dataset}.INFORMATION_SCHEMA.COLUMNS`"
    table_names = _dedupe([price_table_name, fx_table_name])
    required_columns = {
        price_table_name: ["date", "symbol", "raw_price", "adj_price"],
        fx_table_name: ["date", "currency", "rate"],
    }
    query = f"""
    SELECT
        table_name,
        column_name,
        data_type
    FROM {information_schema}
    WHERE table_name IN UNNEST(@table_names)
    ORDER BY table_name, ordinal_position
    """

    try:
        rows = client.query(
            query,
            job_config=bigquery.QueryJobConfig(
                query_parameters=[
                    bigquery.ArrayQueryParameter("table_names", "STRING", table_names),
                ]
            ),
        ).result()
    except Exception as exc:
        raise MarketDataQueryError(f"BigQuery schema query failed: {exc}") from exc

    columns_by_table: Dict[str, List[Dict[str, str]]] = {table_name: [] for table_name in table_names}
    for row in rows:
        columns_by_table.setdefault(row["table_name"], []).append(
            {
                "name": row["column_name"],
                "type": row["data_type"],
            }
        )

    def table_check(table_name: str) -> Dict:
        present_columns = [column["name"] for column in columns_by_table.get(table_name, [])]
        missing_columns = [
            column
            for column in required_columns[table_name]
            if column not in present_columns
        ]
        return {
            "tableName": f"{project_id}.{dataset}.{table_name}",
            "requiredColumns": required_columns[table_name],
            "presentColumns": present_columns,
            "missingColumns": missing_columns,
            "isReady": len(missing_columns) == 0,
        }

    return {
        "priceTable": table_check(price_table_name),
        "fxTable": table_check(fx_table_name),
    }


def _build_bigquery_quality_scorecard(diagnostics: Dict) -> Dict:
    schema_checks = diagnostics.get("schemaChecks") or {}
    price_schema = schema_checks.get("priceTable") or {}
    fx_schema = schema_checks.get("fxTable") or {}
    price_summary = diagnostics.get("priceSummary") or {}
    fx_summary = diagnostics.get("fxSummary") or {}
    stale_symbols = diagnostics.get("staleSymbols") or []
    adjusted_stale_symbols = diagnostics.get("adjustedStaleSymbols") or []

    price_schema_ready = bool(price_schema.get("isReady"))
    fx_schema_ready = bool(fx_schema.get("isReady"))
    schema_ready_count = int(price_schema_ready) + int(fx_schema_ready)
    schema_score = 100 if schema_ready_count == 2 else 50 if schema_ready_count == 1 else 0

    price_days = _days_since_iso_date(price_summary.get("latest_date"))
    fx_days = _days_since_iso_date(fx_summary.get("latest_date"))
    freshness_score = round((_freshness_score(price_days) + _freshness_score(fx_days)) / 2)

    symbol_score = _coverage_score(_safe_number(price_summary.get("symbol_count")), strong=100, watch=50)
    row_score = _coverage_score(_safe_number(price_summary.get("row_count")), strong=100_000, watch=50_000)
    fx_score = _coverage_score(_safe_number(fx_summary.get("currency_count")), strong=3, watch=2)
    coverage_score = round(symbol_score * 0.45 + row_score * 0.35 + fx_score * 0.20)

    price_row_count = _safe_number(price_summary.get("row_count"))
    adjusted_rows = _safe_number(price_summary.get("adjusted_price_rows"))
    raw_rows = _safe_number(price_summary.get("raw_price_rows"))
    if price_row_count > 0:
        completeness_score = round(min(max(adjusted_rows, raw_rows) / price_row_count, 1) * 100)
    else:
        completeness_score = 0

    max_stale_days = max(
        [_safe_number(symbol.get("stale_days")) for symbol in stale_symbols],
        default=0,
    )
    exception_score = _exception_score(len(stale_symbols), max_stale_days)
    max_adjusted_lag_days = max(
        [_safe_number(symbol.get("adjusted_lag_days")) for symbol in adjusted_stale_symbols],
        default=0,
    )
    adjusted_freshness_score = _exception_score(
        len(adjusted_stale_symbols),
        max_adjusted_lag_days,
    )

    dimensions = [
        _quality_dimension(
            "schema",
            "Schema contract",
            schema_score,
            25,
            "daily_prices / daily_fx required columns",
            "補齊缺失欄位" if schema_score < 100 else "維持 schema contract",
        ),
        _quality_dimension(
            "freshness",
            "Freshness",
            freshness_score,
            20,
            f"price {price_days if price_days is not None else '--'}d / fx {fx_days if fx_days is not None else '--'}d",
            "檢查每日更新批次" if freshness_score < 85 else "維持每日更新監控",
        ),
        _quality_dimension(
            "adjusted_freshness",
            "Adjusted freshness",
            adjusted_freshness_score,
            15,
            f"{len(adjusted_stale_symbols)} adj-lag symbols / max {int(max_adjusted_lag_days)}d",
            "補齊或重算 adj_price" if adjusted_freshness_score < 85 else "Adj 價格可支援報酬分析",
        ),
        _quality_dimension(
            "coverage",
            "Coverage",
            coverage_score,
            15,
            f"{int(_safe_number(price_summary.get('symbol_count')))} symbols / {int(_safe_number(fx_summary.get('currency_count')))} FX",
            "擴充商品池與 FX 幣別" if coverage_score < 85 else "可支援主要投組分析",
        ),
        _quality_dimension(
            "completeness",
            "Price completeness",
            completeness_score,
            15,
            f"adj {int(adjusted_rows)} / raw {int(raw_rows)} / total {int(price_row_count)}",
            "回補缺漏價格欄位" if completeness_score < 85 else "價格欄位覆蓋正常",
        ),
        _quality_dimension(
            "exceptions",
            "Stale exceptions",
            exception_score,
            15,
            f"{len(stale_symbols)} stale symbols / max {int(max_stale_days)}d",
            "優先回補落後商品" if exception_score < 85 else "未見重大落後商品",
        ),
    ]
    total_weight = sum(item["weight"] for item in dimensions)
    overall_score = round(sum(item["score"] * item["weight"] for item in dimensions) / total_weight)
    blockers = _quality_blockers(dimensions, price_schema, fx_schema)
    status = "risk" if blockers else _quality_status(overall_score)
    level = "production_ready" if status == "strong" else "watchlist" if status == "watch" else "blocked"

    return {
        "overallScore": overall_score,
        "status": status,
        "level": level,
        "summary": _quality_summary(overall_score, blockers),
        "dimensions": dimensions,
        "blockers": blockers,
        "nextActions": _quality_next_actions(dimensions, blockers),
    }


def _quality_dimension(id: str, label: str, score: int, weight: int, evidence: str, action: str) -> Dict:
    bounded_score = max(0, min(int(score), 100))
    return {
        "id": id,
        "label": label,
        "score": bounded_score,
        "status": _quality_status(bounded_score),
        "weight": weight,
        "evidence": evidence,
        "action": action,
    }


def _quality_status(score: int) -> str:
    if score >= 85:
        return "strong"
    if score >= 60:
        return "watch"
    return "risk"


def _quality_summary(score: int, blockers: List[str]) -> str:
    if blockers:
        return "資料倉儲尚未達到投資分析放行條件。"
    if score >= 85:
        return "資料倉儲可支援主要投組分析工作流。"
    if score >= 60:
        return "資料倉儲可試跑，但建議先處理觀察項。"
    return "資料倉儲品質偏弱，應先修復再進入分析。"


def _quality_blockers(dimensions: List[Dict], price_schema: Dict, fx_schema: Dict) -> List[str]:
    blockers: List[str] = []
    if not price_schema.get("isReady"):
        blockers.append(f"daily_prices missing columns: {', '.join(price_schema.get('missingColumns') or []) or '--'}")
    if not fx_schema.get("isReady"):
        blockers.append(f"daily_fx missing columns: {', '.join(fx_schema.get('missingColumns') or []) or '--'}")
    for item in dimensions:
        if item["status"] == "risk":
            blockers.append(f"{item['label']}: {item['evidence']}")
    return list(dict.fromkeys(blockers))[:6]


def _quality_next_actions(dimensions: List[Dict], blockers: List[str]) -> List[str]:
    if blockers:
        return ["先修復 block 項目", "完成回補後重新讀取 diagnostics", "再放行投組分析與研究報告輸出"]
    actions = [item["action"] for item in dimensions if item["status"] != "strong"]
    if not actions:
        return ["維持每日批次監控", "將 scorecard 納入部署後 health check", "建立資料異常告警"]
    return list(dict.fromkeys(actions))[:4]


def _build_asset_history_quality(summary: Dict) -> Dict:
    row_count = _safe_number(summary.get("row_count"))
    selected_rows = _safe_number(summary.get("selected_price_rows"))
    missing_rows = _safe_number(summary.get("missing_selected_price_rows"))
    max_gap_days = summary.get("max_gap_days")
    first_date = summary.get("first_date")
    latest_date = summary.get("latest_date")
    elapsed_days = _elapsed_days(first_date, latest_date)
    latest_days = _days_since_iso_date(latest_date)
    completeness_score = round((selected_rows / row_count) * 100) if row_count > 0 else 0
    horizon_score = 100 if elapsed_days >= 365 else 75 if elapsed_days >= 180 else 50 if elapsed_days >= 60 else 25
    gap_score = _history_gap_score(max_gap_days)
    freshness_score = _freshness_score(latest_days)
    checks = [
        _history_quality_check(
            "completeness",
            "價格完整度",
            completeness_score,
            f"{int(selected_rows)} / {int(row_count)} selected prices",
            "回補缺漏價格" if missing_rows else "價格欄位完整",
        ),
        _history_quality_check(
            "horizon",
            "歷史長度",
            horizon_score,
            f"{elapsed_days} days",
            "拉長查詢區間或回補歷史" if horizon_score < 85 else "歷史視窗足以支援波動分析",
        ),
        _history_quality_check(
            "continuity",
            "時間連續性",
            gap_score,
            f"max gap {max_gap_days if max_gap_days is not None else '--'}d",
            "檢查交易日缺口" if gap_score < 85 else "未見重大時間缺口",
        ),
        _history_quality_check(
            "freshness",
            "最新日",
            freshness_score,
            f"{latest_days if latest_days is not None else '--'} days since latest price",
            "檢查最新批次" if freshness_score < 85 else "最新日可用",
        ),
    ]
    total_score = round(sum(check["score"] for check in checks) / len(checks))
    warnings = [
        f"{check['label']}: {check['evidence']}"
        for check in checks
        if check["status"] != "strong"
    ]
    next_actions = [check["action"] for check in checks if check["status"] != "strong"]
    if not next_actions:
        next_actions = ["可進入報酬、波動與 drawdown drill-down", "可納入 watchlist 比較與投組分析"]

    return {
        "score": total_score,
        "status": _quality_status(total_score),
        "checks": checks,
        "warnings": warnings[:4],
        "nextActions": list(dict.fromkeys(next_actions))[:4],
    }


def _history_quality_check(id: str, label: str, score: int, evidence: str, action: str) -> Dict:
    bounded_score = max(0, min(int(score), 100))
    return {
        "id": id,
        "label": label,
        "score": bounded_score,
        "status": _quality_status(bounded_score),
        "evidence": evidence,
        "action": action,
    }


def _history_gap_score(max_gap_days) -> int:
    if max_gap_days is None:
        return 0
    try:
        numeric = float(max_gap_days)
    except (TypeError, ValueError):
        return 0
    if numeric <= 5:
        return 100
    if numeric <= 14:
        return 75
    if numeric <= 45:
        return 45
    return 15


def _elapsed_days(first_date: Optional[str], latest_date: Optional[str]) -> int:
    start = _parse_optional_iso_date(first_date, "first_date")
    end = _parse_optional_iso_date(latest_date, "latest_date")
    if not start or not end:
        return 0
    return max(0, (end - start).days)


def _parse_internal_iso_date(value) -> Optional[date]:
    if not value:
        return None
    if isinstance(value, date):
        return value
    try:
        return date.fromisoformat(str(value)[:10])
    except ValueError:
        return None


def _positive_number_or_none(value) -> Optional[float]:
    try:
        numeric = float(value)
    except (TypeError, ValueError):
        return None
    if not np.isfinite(numeric) or numeric <= 0:
        return None
    return numeric


def _duplicate_price_date_counts(records: List[Dict]) -> tuple[int, int]:
    raw_values_by_date: Dict[str, set] = {}
    row_counts_by_date: Dict[str, int] = {}
    for record in records:
        date_key = record["date"].isoformat()
        row_counts_by_date[date_key] = row_counts_by_date.get(date_key, 0) + 1
        raw_price = record.get("raw_price")
        if raw_price is not None:
            raw_values_by_date.setdefault(date_key, set()).add(round(float(raw_price), 10))

    duplicate_date_count = sum(1 for count in row_counts_by_date.values() if count > 1)
    duplicate_raw_conflict_count = sum(
        1
        for date_key, raw_values in raw_values_by_date.items()
        if row_counts_by_date.get(date_key, 0) > 1 and len(raw_values) > 1
    )
    return duplicate_date_count, duplicate_raw_conflict_count


def _raw_price_continuity_risk(records: List[Dict], *, max_daily_return: float) -> Dict:
    raw_values_by_date: Dict[str, float] = {}
    date_by_key: Dict[str, date] = {}
    for record in records:
        raw_price = record.get("raw_price")
        if raw_price is None:
            continue
        date_key = record["date"].isoformat()
        raw_values_by_date[date_key] = float(raw_price)
        date_by_key[date_key] = record["date"]

    ordered = [
        (date_by_key[date_key], raw_values_by_date[date_key])
        for date_key in sorted(raw_values_by_date.keys())
    ]
    max_abs_return = None
    max_abs_return_date = None
    jump_dates = []
    previous_date = None
    previous_price = None

    for current_date, current_price in ordered:
        if previous_price and previous_price > 0:
            daily_return = current_price / previous_price - 1
            abs_return = abs(daily_return)
            if max_abs_return is None or abs_return > max_abs_return:
                max_abs_return = abs_return
                max_abs_return_date = current_date.isoformat()
            if abs_return > max_daily_return:
                jump_dates.append(
                    {
                        "date": current_date.isoformat(),
                        "previousDate": previous_date.isoformat() if previous_date else None,
                        "previousRawPrice": _finite_or_none(previous_price),
                        "rawPrice": _finite_or_none(current_price),
                        "dailyReturn": _finite_or_none(daily_return),
                    }
                )
        previous_date = current_date
        previous_price = current_price

    jump_dates = sorted(
        jump_dates,
        key=lambda item: abs(float(item.get("dailyReturn") or 0)),
        reverse=True,
    )

    return {
        "max_abs_return": max_abs_return,
        "max_abs_return_date": max_abs_return_date,
        "jump_dates": jump_dates[:5],
    }


def _safe_number(value) -> float:
    try:
        numeric = float(value)
    except (TypeError, ValueError):
        return 0
    return numeric if np.isfinite(numeric) else 0


def _finite_or_none(value):
    return float(value) if value is not None and np.isfinite(value) else None


def _coverage_score(value: float, *, strong: float, watch: float) -> int:
    if value >= strong:
        return 100
    if value >= watch:
        return 75
    if value > 0:
        return 35
    return 0


def _freshness_score(days: Optional[int]) -> int:
    if days is None:
        return 0
    if days <= 1:
        return 100
    if days <= 3:
        return 85
    if days <= 10:
        return 65
    if days <= 30:
        return 35
    return 10


def _exception_score(stale_count: int, max_stale_days: float) -> int:
    if stale_count <= 0:
        return 100
    if stale_count <= 3 and max_stale_days <= 3:
        return 85
    if stale_count <= 8 and max_stale_days <= 10:
        return 60
    return 35


def _days_since_iso_date(value: Optional[str]) -> Optional[int]:
    if not value:
        return None
    try:
        parsed = date.fromisoformat(str(value)[:10])
    except ValueError:
        return None
    return max(0, (date.today() - parsed).days)


def _parse_optional_iso_date(value: Optional[str], label: str) -> Optional[date]:
    if not value:
        return None
    try:
        return date.fromisoformat(str(value)[:10])
    except ValueError as exc:
        raise MarketDataError(f"{label} must be an ISO date string.") from exc


def _summary_row_to_dict(row, *, date_fields: tuple[str, ...]) -> Dict:
    if row is None:
        return {}

    result = {}
    for key in row.keys():
        value = row[key]
        if key in date_fields and value is not None:
            result[key] = value.isoformat()
        else:
            result[key] = value
    return result


def _bigquery_client(bigquery):
    project_id, _, _, _ = _settings()
    service_account = _service_account_json()
    if service_account:
        try:
            from google.oauth2 import service_account as google_service_account
        except ImportError as exc:
            raise MarketDataConfigError("google-auth is not installed in the API runtime.") from exc

        try:
            info = json.loads(service_account)
            credentials = google_service_account.Credentials.from_service_account_info(info)
        except Exception as exc:
            raise MarketDataConfigError("GCP service account JSON environment variable is invalid.") from exc

        try:
            return bigquery.Client(credentials=credentials, project=project_id or credentials.project_id)
        except Exception as exc:
            raise MarketDataConfigError("BigQuery service account credentials could not be initialized.") from exc

    try:
        return bigquery.Client(project=project_id)
    except Exception as exc:
        raise MarketDataConfigError(
            "BigQuery credentials are not configured. Set GCP_SERVICE_ACCOUNT_JSON in Vercel."
        ) from exc


def _bigquery_module():
    try:
        from google.cloud import bigquery
    except ImportError as exc:
        raise MarketDataConfigError("google-cloud-bigquery is not installed in the API runtime.") from exc
    return bigquery


def _settings() -> tuple[str, str, str, str]:
    project_id = os.getenv("BIGQUERY_PROJECT_ID", DEFAULT_PROJECT_ID)
    dataset = os.getenv("BIGQUERY_DATASET", DEFAULT_DATASET)
    price_table = os.getenv("BIGQUERY_PRICE_TABLE", DEFAULT_PRICE_TABLE)
    fx_table = os.getenv("BIGQUERY_FX_TABLE", DEFAULT_FX_TABLE)
    for label, value in {
        "BIGQUERY_PROJECT_ID": project_id,
        "BIGQUERY_DATASET": dataset,
        "BIGQUERY_PRICE_TABLE": price_table,
        "BIGQUERY_FX_TABLE": fx_table,
    }.items():
        _validate_identifier(label, value)
    return project_id, dataset, price_table, fx_table


def _table_path(table_env_name: str, default_table: str) -> str:
    project_id, dataset, price_table, fx_table = _settings()
    table = os.getenv(table_env_name, default_table)
    if table_env_name == "BIGQUERY_PRICE_TABLE":
        table = price_table
    elif table_env_name == "BIGQUERY_FX_TABLE":
        table = fx_table
    _validate_identifier(table_env_name, table)
    return f"`{project_id}.{dataset}.{table}`"


def _service_account_json() -> Optional[str]:
    return os.getenv("GCP_SERVICE_ACCOUNT_JSON") or os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON")


def _validate_identifier(label: str, value: str) -> None:
    if not value or not IDENTIFIER_RE.match(value):
        raise MarketDataConfigError(f"{label} contains unsupported characters.")


def _price_column(price_basis: str) -> str:
    normalized = _normalize_price_basis(price_basis)
    return "raw_price" if normalized == "raw" else "adj_price"


def _normalize_price_basis(price_basis: str) -> str:
    normalized = (price_basis or "adjusted").strip().lower()
    if normalized in {"raw", "price", "market"}:
        return "raw"
    return "adjusted"


def _normalize_currency_mode(pricing_currency: str) -> str:
    normalized = (pricing_currency or "original").strip().upper()
    if normalized in {"TWD", "NTD", "新台幣"}:
        return "TWD"
    return "ORIGINAL"


def _infer_symbol_currency(symbol: str) -> str:
    if symbol.upper().endswith(".TW"):
        return "TWD"
    return "USD"


def _dedupe(values: Iterable[str]) -> List[str]:
    seen = set()
    result = []
    for value in values:
        if value in seen:
            continue
        seen.add(value)
        result.append(value)
    return result


def _series_to_python_numbers(series: pd.Series) -> List[Optional[float]]:
    values: List[Optional[float]] = []
    for value in series.tolist():
        if value is None or not np.isfinite(value):
            values.append(None)
        else:
            values.append(float(value))
    return values
