from __future__ import annotations

import json
import os
import re
from datetime import date
from typing import Dict, Iterable, List, Optional

import numpy as np
import pandas as pd


DEFAULT_PROJECT_ID = "fund-war-room"
DEFAULT_DATASET = "fund_database"
DEFAULT_PRICE_TABLE = "daily_prices"
DEFAULT_FX_TABLE = "daily_fx"

IDENTIFIER_RE = re.compile(r"^[A-Za-z0-9_-]+$")


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
    diagnostics["fxCurrencies"] = [
        _summary_row_to_dict(row, date_fields=("first_date", "latest_date"))
        for row in fx_currencies
    ]
    diagnostics["qualityScorecard"] = _build_bigquery_quality_scorecard(diagnostics)
    return diagnostics


def search_bigquery_assets(*, query: Optional[str] = None, limit: int = 20) -> Dict:
    bigquery = _bigquery_module()
    client = _bigquery_client(bigquery)
    price_table = _table_path("BIGQUERY_PRICE_TABLE", DEFAULT_PRICE_TABLE)
    clean_query = (query or "").strip().lower()
    bounded_limit = max(1, min(int(limit or 20), 50))

    where_clause = ""
    query_parameters = [
        bigquery.ScalarQueryParameter("limit", "INT64", bounded_limit),
    ]
    if clean_query:
        where_clause = "WHERE LOWER(symbol) LIKE @query_pattern"
        query_parameters.extend(
            [
                bigquery.ScalarQueryParameter("query_pattern", "STRING", f"%{clean_query}%"),
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
    SELECT
        symbol,
        MIN(DATE(date)) AS first_date,
        MAX(DATE(date)) AS latest_date,
        COUNT(1) AS row_count,
        COUNTIF(SAFE_CAST(adj_price AS FLOAT64) > 0) AS adjusted_price_rows,
        COUNTIF(SAFE_CAST(raw_price AS FLOAT64) > 0) AS raw_price_rows
    FROM {price_table}
    {where_clause}
    GROUP BY symbol
    ORDER BY {order_clause}
    LIMIT @limit
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

    return {
        "status": bigquery_market_status(),
        "query": clean_query,
        "limit": bounded_limit,
        "assets": [
            _summary_row_to_dict(row, date_fields=("first_date", "latest_date"))
            for row in rows
        ],
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
            "selected_price": row["selected_price"],
        }
        for row in rows
    ]
    if not records:
        raise MarketDataError(f"No BigQuery price data found for: {clean_symbol}")

    frame = pd.DataFrame.from_records(records)
    frame["date"] = pd.to_datetime(frame["date"])
    for column in ("adj_price", "raw_price", "selected_price"):
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
            "first_date": frame["date"].min().strftime("%Y-%m-%d"),
            "latest_date": frame["date"].max().strftime("%Y-%m-%d"),
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
    bounded_limit = max(20, min(int(limit or 365), 2000))

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
            "selected_price": row["selected_price"],
        }
        for row in rows
    ]
    if not records:
        raise MarketDataError(f"No BigQuery price history found for: {clean_symbol}")

    frame = pd.DataFrame.from_records(records)
    frame["date"] = pd.to_datetime(frame["date"])
    for column in ("adj_price", "raw_price", "selected_price"):
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
        "first_date": frame["date"].min().strftime("%Y-%m-%d"),
        "latest_date": frame["date"].max().strftime("%Y-%m-%d"),
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
            25,
            f"price {price_days if price_days is not None else '--'}d / fx {fx_days if fx_days is not None else '--'}d",
            "檢查每日更新批次" if freshness_score < 85 else "維持每日更新監控",
        ),
        _quality_dimension(
            "coverage",
            "Coverage",
            coverage_score,
            20,
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
