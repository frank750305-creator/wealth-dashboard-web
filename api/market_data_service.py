from __future__ import annotations

import json
import os
import re
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
    price_table = _table_path("BIGQUERY_PRICE_TABLE", DEFAULT_PRICE_TABLE)
    fx_table = _table_path("BIGQUERY_FX_TABLE", DEFAULT_FX_TABLE)

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

    try:
        price_summary = next(iter(client.query(price_summary_query).result()), None)
        fx_summary = next(iter(client.query(fx_summary_query).result()), None)
        recent_symbols = list(client.query(recent_symbols_query).result())
    except Exception as exc:
        raise MarketDataQueryError(f"BigQuery diagnostics query failed: {exc}") from exc

    return {
        "status": bigquery_market_status(),
        "priceSummary": _summary_row_to_dict(
            price_summary,
            date_fields=("first_date", "latest_date"),
        ),
        "fxSummary": _summary_row_to_dict(
            fx_summary,
            date_fields=("first_date", "latest_date"),
        ),
        "recentSymbols": [
            _summary_row_to_dict(row, date_fields=("latest_date",))
            for row in recent_symbols
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
