from __future__ import annotations

import math
from typing import Dict, Iterable, List, Optional, Sequence

import numpy as np


TRADING_DAYS = 252
EPSILON = 1e-12


class PortfolioEngineError(ValueError):
    pass


def analyze_portfolio_returns(
    *,
    weights_by_symbol: Dict[str, float],
    returns_by_symbol: Dict[str, Sequence[Optional[float]]],
    benchmark_returns: Optional[Sequence[Optional[float]]] = None,
    dates: Optional[Sequence[str]] = None,
    mode: str = "overlap",
    confidence_level: float = 0.95,
    risk_free_rate: float = 0.02,
) -> Dict:
    symbols = list(weights_by_symbol.keys())
    weights = _normalize_weights([weights_by_symbol[symbol] for symbol in symbols])
    returns_matrix = _returns_matrix(returns_by_symbol, symbols)
    benchmark = _optional_array(benchmark_returns, len(returns_matrix))
    date_values = _optional_dates(dates, len(returns_matrix))

    normalized_mode = _normalize_analysis_mode(mode)
    if normalized_mode == "long_rebuild":
        model = _build_long_rebuild_model(returns_matrix, weights, benchmark, date_values)
    else:
        model = _build_overlap_model(returns_matrix, weights, benchmark, date_values)

    metrics = _calculate_metrics(
        portfolio_daily_returns=model["portfolioDailyReturns"],
        benchmark_daily_returns=model["benchmarkDailyReturns"],
        annual_return=model["annualReturn"],
        annual_covariance=model["annualCovariance"],
        weights=weights,
        confidence_level=confidence_level,
        risk_free_rate=risk_free_rate,
    )

    asset_statistics = _asset_statistics(symbols, model["assetAnnualReturns"], model["assetAnnualVolatilities"])
    return {
        "mode": normalized_mode,
        "symbols": symbols,
        "weights": [
            {"symbol": symbol, "weight": _json_number(weight)}
            for symbol, weight in zip(symbols, weights)
        ],
        "metrics": metrics,
        "assetStatistics": asset_statistics,
        "wealthPath": _wealth_path(model["portfolioDailyReturns"], model["dates"]),
        "dataWindow": {
            "startDate": model["dates"][0] if model["dates"] else None,
            "endDate": model["dates"][-1] if model["dates"] else None,
            "observations": int(len(model["portfolioDailyReturns"])),
        },
    }


def optimize_portfolio_weights(
    *,
    returns_by_symbol: Dict[str, Sequence[Optional[float]]],
    symbols: Optional[Sequence[str]] = None,
    benchmark_returns: Optional[Sequence[Optional[float]]] = None,
    dates: Optional[Sequence[str]] = None,
    mode: str = "overlap",
    optimization_mode: str = "max_sharpe",
    target_volatility: Optional[float] = None,
    risk_free_rate: float = 0.02,
    confidence_level: float = 0.95,
    sample_count: int = 5000,
    random_seed: int = 7,
) -> Dict:
    selected_symbols = list(symbols) if symbols else list(returns_by_symbol.keys())
    if not selected_symbols:
        raise PortfolioEngineError("At least one symbol is required.")

    equal_weights = np.ones(len(selected_symbols), dtype=float) / len(selected_symbols)
    returns_matrix = _returns_matrix(returns_by_symbol, selected_symbols)
    benchmark = _optional_array(benchmark_returns, len(returns_matrix))
    date_values = _optional_dates(dates, len(returns_matrix))

    normalized_mode = _normalize_analysis_mode(mode)
    if normalized_mode == "long_rebuild":
        model = _build_long_rebuild_model(returns_matrix, equal_weights, benchmark, date_values)
    else:
        model = _build_overlap_model(returns_matrix, equal_weights, benchmark, date_values)

    asset_returns = np.asarray(model["assetAnnualReturns"], dtype=float)
    covariance = np.asarray(model["annualCovariance"], dtype=float)
    if not np.all(np.isfinite(asset_returns)):
        raise PortfolioEngineError("Asset return data is insufficient for optimization.")

    candidates = _weight_candidates(len(selected_symbols), sample_count, random_seed)
    chosen_weights = _choose_candidate(
        candidates=candidates,
        annual_returns=asset_returns,
        annual_covariance=covariance,
        optimization_mode=optimization_mode,
        target_volatility=target_volatility,
        risk_free_rate=risk_free_rate,
    )

    weights_by_symbol = {
        symbol: float(weight)
        for symbol, weight in zip(selected_symbols, chosen_weights)
    }
    analysis = analyze_portfolio_returns(
        weights_by_symbol=weights_by_symbol,
        returns_by_symbol=returns_by_symbol,
        benchmark_returns=benchmark_returns,
        dates=dates,
        mode=normalized_mode,
        confidence_level=confidence_level,
        risk_free_rate=risk_free_rate,
    )

    return {
        "optimizationMode": _normalize_optimization_mode(optimization_mode),
        "targetVolatility": _json_number(target_volatility),
        "weights": analysis["weights"],
        "metrics": analysis["metrics"],
        "assetStatistics": analysis["assetStatistics"],
        "wealthPath": analysis["wealthPath"],
        "dataWindow": analysis["dataWindow"],
    }


def _build_overlap_model(
    returns_matrix: np.ndarray,
    weights: np.ndarray,
    benchmark: Optional[np.ndarray],
    dates: Optional[List[str]],
) -> Dict:
    valid_mask = np.all(np.isfinite(returns_matrix), axis=1)
    subset = returns_matrix[valid_mask]
    if len(subset) < 2:
        raise PortfolioEngineError("At least two overlapping return observations are required.")

    portfolio_daily = subset @ weights
    annual_returns = np.mean(subset, axis=0) * TRADING_DAYS
    annual_covariance = _annual_covariance(subset)
    selected_dates = _select_dates(dates, valid_mask)

    benchmark_daily = None
    if benchmark is not None:
        benchmark_daily = benchmark[valid_mask]

    return {
        "portfolioDailyReturns": portfolio_daily,
        "benchmarkDailyReturns": benchmark_daily,
        "annualReturn": float(annual_returns @ weights),
        "annualCovariance": annual_covariance,
        "assetAnnualReturns": annual_returns,
        "assetAnnualVolatilities": np.sqrt(np.maximum(np.diag(annual_covariance), 0.0)),
        "dates": selected_dates,
    }


def _build_long_rebuild_model(
    returns_matrix: np.ndarray,
    weights: np.ndarray,
    benchmark: Optional[np.ndarray],
    dates: Optional[List[str]],
) -> Dict:
    if len(returns_matrix) < 2:
        raise PortfolioEngineError("At least two return observations are required.")

    asset_returns = []
    asset_volatilities = []
    for column in range(returns_matrix.shape[1]):
        series = returns_matrix[:, column]
        series = series[np.isfinite(series)]
        if len(series) < 2:
            raise PortfolioEngineError("Each selected asset needs at least two valid observations.")
        asset_returns.append(float(np.mean(series) * TRADING_DAYS))
        asset_volatilities.append(float(_sample_std(series) * math.sqrt(TRADING_DAYS)))

    overlap_mask = np.all(np.isfinite(returns_matrix), axis=1)
    overlap = returns_matrix[overlap_mask]
    if len(overlap) >= 2:
        correlation = np.corrcoef(overlap, rowvar=False)
        correlation = np.nan_to_num(correlation, nan=0.0, posinf=0.0, neginf=0.0)
        np.fill_diagonal(correlation, 1.0)
    else:
        correlation = np.eye(returns_matrix.shape[1])

    asset_vol = np.asarray(asset_volatilities, dtype=float)
    annual_covariance = np.outer(asset_vol, asset_vol) * correlation

    valid_mask = np.isfinite(returns_matrix)
    weighted_mask = valid_mask * weights
    daily_weight_sum = weighted_mask.sum(axis=1)
    usable_rows = daily_weight_sum > EPSILON
    if not np.any(usable_rows):
        raise PortfolioEngineError("No usable return observations were found.")

    row_weights = weighted_mask[usable_rows] / daily_weight_sum[usable_rows, None]
    portfolio_daily = np.nansum(returns_matrix[usable_rows] * row_weights, axis=1)
    selected_dates = _select_dates(dates, usable_rows)

    benchmark_daily = None
    if benchmark is not None:
        benchmark_daily = np.nan_to_num(benchmark[usable_rows], nan=0.0, posinf=0.0, neginf=0.0)

    return {
        "portfolioDailyReturns": portfolio_daily,
        "benchmarkDailyReturns": benchmark_daily,
        "annualReturn": float(np.asarray(asset_returns) @ weights),
        "annualCovariance": annual_covariance,
        "assetAnnualReturns": np.asarray(asset_returns, dtype=float),
        "assetAnnualVolatilities": asset_vol,
        "dates": selected_dates,
    }


def _calculate_metrics(
    *,
    portfolio_daily_returns: np.ndarray,
    benchmark_daily_returns: Optional[np.ndarray],
    annual_return: float,
    annual_covariance: np.ndarray,
    weights: np.ndarray,
    confidence_level: float,
    risk_free_rate: float,
) -> Dict:
    daily = portfolio_daily_returns[np.isfinite(portfolio_daily_returns)]
    if len(daily) < 2:
        raise PortfolioEngineError("At least two portfolio return observations are required.")

    wealth = 100.0 * np.cumprod(1.0 + daily)
    cumulative_return = wealth[-1] / 100.0 - 1.0
    cagr = (wealth[-1] / 100.0) ** (TRADING_DAYS / len(daily)) - 1.0
    portfolio_variance = float(weights.T @ annual_covariance @ weights)
    annual_volatility = math.sqrt(max(portfolio_variance, 0.0))
    z_value = _z_value(confidence_level)
    lower_bound = cagr - (z_value * annual_volatility)
    sharpe = _safe_divide(annual_return - risk_free_rate, annual_volatility)

    downside = daily[daily < 0.0]
    downside_deviation = _sample_std(downside) * math.sqrt(TRADING_DAYS) if len(downside) else 0.0
    sortino = _safe_divide(annual_return - risk_free_rate, downside_deviation)

    drawdowns = wealth / np.maximum.accumulate(wealth) - 1.0
    max_drawdown = float(np.min(drawdowns))

    beta = alpha = r_squared = information_ratio = appraisal_ratio = treynor = None
    if benchmark_daily_returns is not None:
        benchmark = np.asarray(benchmark_daily_returns, dtype=float)
        pair_mask = np.isfinite(daily) & np.isfinite(benchmark)
        if int(pair_mask.sum()) > 30:
            paired_port = daily[pair_mask]
            paired_benchmark = benchmark[pair_mask]
            beta_raw, intercept, r_value = _linear_regression(paired_benchmark, paired_port)
            beta = beta_raw
            alpha = intercept * TRADING_DAYS
            r_squared = r_value**2
            active_return = paired_port - paired_benchmark
            tracking_error = _sample_std(active_return) * math.sqrt(TRADING_DAYS)
            benchmark_annual_return = float(np.mean(paired_benchmark) * TRADING_DAYS)
            information_ratio = _safe_divide(annual_return - benchmark_annual_return, tracking_error)
            residual = paired_port - (intercept + beta_raw * paired_benchmark)
            residual_risk = _sample_std(residual) * math.sqrt(TRADING_DAYS)
            appraisal_ratio = _safe_divide(alpha, residual_risk)
            treynor = _safe_divide(annual_return - risk_free_rate, beta_raw)

    return {
        "cumulativeReturn": _json_number(cumulative_return),
        "cagr": _json_number(cagr),
        "annualReturn": _json_number(annual_return),
        "annualVolatility": _json_number(annual_volatility),
        "confidenceLowerBound": _json_number(lower_bound),
        "sharpe": _json_number(sharpe),
        "sortino": _json_number(sortino),
        "maxDrawdown": _json_number(max_drawdown),
        "downsideDeviation": _json_number(downside_deviation),
        "beta": _json_number(beta),
        "rSquared": _json_number(r_squared),
        "treynor": _json_number(treynor),
        "informationRatio": _json_number(information_ratio),
        "alpha": _json_number(alpha),
        "appraisalRatio": _json_number(appraisal_ratio),
        "skewness": _json_number(_skewness(daily)),
        "kurtosis": _json_number(_kurtosis(daily)),
    }


def _asset_statistics(symbols: Sequence[str], annual_returns: Iterable[float], annual_volatilities: Iterable[float]) -> List[Dict]:
    return [
        {
            "symbol": symbol,
            "annualReturn": _json_number(annual_return),
            "annualVolatility": _json_number(annual_volatility),
        }
        for symbol, annual_return, annual_volatility in zip(symbols, annual_returns, annual_volatilities)
    ]


def _wealth_path(portfolio_daily_returns: np.ndarray, dates: Optional[List[str]]) -> List[Dict]:
    wealth_values = 100.0 * np.cumprod(1.0 + portfolio_daily_returns)
    rows = []
    for index, value in enumerate(wealth_values):
        rows.append(
            {
                "date": dates[index] if dates and index < len(dates) else None,
                "value": _json_number(value),
                "dailyReturn": _json_number(portfolio_daily_returns[index]),
            }
        )
    return rows


def _weight_candidates(asset_count: int, sample_count: int, random_seed: int) -> np.ndarray:
    if asset_count == 1:
        return np.ones((1, 1), dtype=float)

    capped_count = min(max(int(sample_count), 250), 20000)
    rng = np.random.default_rng(random_seed)
    random_candidates = rng.dirichlet(np.ones(asset_count), capped_count)
    equal_weight = np.ones((1, asset_count), dtype=float) / asset_count
    single_asset = np.eye(asset_count, dtype=float)
    return np.vstack([equal_weight, single_asset, random_candidates])


def _choose_candidate(
    *,
    candidates: np.ndarray,
    annual_returns: np.ndarray,
    annual_covariance: np.ndarray,
    optimization_mode: str,
    target_volatility: Optional[float],
    risk_free_rate: float,
) -> np.ndarray:
    mode = _normalize_optimization_mode(optimization_mode)
    candidate_returns = candidates @ annual_returns
    candidate_variances = np.einsum("ij,jk,ik->i", candidates, annual_covariance, candidates)
    candidate_volatilities = np.sqrt(np.maximum(candidate_variances, 0.0))

    if mode == "min_vol":
        index = int(np.argmin(candidate_volatilities))
    elif mode == "max_return":
        index = int(np.argmax(candidate_returns))
    elif mode == "target_vol":
        if target_volatility is None:
            raise PortfolioEngineError("target_volatility is required when optimization_mode is target_vol.")
        eligible = candidate_volatilities <= float(target_volatility)
        if np.any(eligible):
            eligible_indices = np.where(eligible)[0]
            index = int(eligible_indices[np.argmax(candidate_returns[eligible])])
        else:
            index = int(np.argmin(np.abs(candidate_volatilities - float(target_volatility))))
    else:
        sharpe = np.array(
            [
                _safe_divide(ret - risk_free_rate, vol)
                for ret, vol in zip(candidate_returns, candidate_volatilities)
            ],
            dtype=float,
        )
        sharpe = np.nan_to_num(sharpe, nan=-np.inf, posinf=-np.inf, neginf=-np.inf)
        index = int(np.argmax(sharpe))

    return candidates[index]


def _returns_matrix(returns_by_symbol: Dict[str, Sequence[Optional[float]]], symbols: Sequence[str]) -> np.ndarray:
    if not symbols:
        raise PortfolioEngineError("At least one symbol is required.")

    missing = [symbol for symbol in symbols if symbol not in returns_by_symbol]
    if missing:
        raise PortfolioEngineError(f"Missing return series for: {', '.join(missing)}")

    lengths = {len(returns_by_symbol[symbol]) for symbol in symbols}
    if len(lengths) != 1:
        raise PortfolioEngineError("All return series must have the same length.")

    matrix = np.array(
        [[_to_float(value) for value in returns_by_symbol[symbol]] for symbol in symbols],
        dtype=float,
    ).T
    if matrix.size == 0:
        raise PortfolioEngineError("Return series cannot be empty.")
    return matrix


def _optional_array(values: Optional[Sequence[Optional[float]]], expected_length: int) -> Optional[np.ndarray]:
    if values is None:
        return None
    if len(values) != expected_length:
        raise PortfolioEngineError("benchmark_returns length must match asset return series length.")
    return np.asarray([_to_float(value) for value in values], dtype=float)


def _optional_dates(values: Optional[Sequence[str]], expected_length: int) -> Optional[List[str]]:
    if values is None:
        return None
    if len(values) != expected_length:
        raise PortfolioEngineError("dates length must match asset return series length.")
    return [str(value) for value in values]


def _select_dates(dates: Optional[List[str]], mask: np.ndarray) -> Optional[List[str]]:
    if dates is None:
        return None
    return [date for date, keep in zip(dates, mask) if bool(keep)]


def _normalize_weights(weights: Sequence[float]) -> np.ndarray:
    clean_weights = np.asarray([_to_float(weight) for weight in weights], dtype=float)
    if not np.all(np.isfinite(clean_weights)):
        raise PortfolioEngineError("Weights must be finite numbers.")
    if np.any(clean_weights < -EPSILON):
        raise PortfolioEngineError("Negative weights are not supported in this long-only engine.")

    total = float(clean_weights.sum())
    if total <= EPSILON:
        raise PortfolioEngineError("Total portfolio weight must be greater than zero.")
    return clean_weights / total


def _annual_covariance(matrix: np.ndarray) -> np.ndarray:
    if matrix.shape[1] == 1:
        return np.array([[_sample_std(matrix[:, 0]) ** 2 * TRADING_DAYS]], dtype=float)
    covariance = np.cov(matrix, rowvar=False) * TRADING_DAYS
    return np.atleast_2d(covariance)


def _sample_std(values: np.ndarray) -> float:
    clean = values[np.isfinite(values)]
    if len(clean) == 0:
        return float("nan")
    if len(clean) == 1:
        return 0.0
    return float(np.std(clean, ddof=1))


def _linear_regression(x_values: np.ndarray, y_values: np.ndarray) -> tuple[float, float, float]:
    x = np.asarray(x_values, dtype=float)
    y = np.asarray(y_values, dtype=float)
    x_var = float(np.var(x))
    if x_var <= EPSILON:
        return float("nan"), float("nan"), float("nan")

    covariance = float(np.mean((x - np.mean(x)) * (y - np.mean(y))))
    slope = covariance / x_var
    intercept = float(np.mean(y) - slope * np.mean(x))
    correlation = float(np.corrcoef(x, y)[0, 1])
    return slope, intercept, correlation


def _skewness(values: np.ndarray) -> float:
    clean = values[np.isfinite(values)]
    if len(clean) < 3:
        return float("nan")
    centered = clean - np.mean(clean)
    std = float(np.std(clean))
    if std <= EPSILON:
        return float("nan")
    return float(np.mean(centered**3) / (std**3))


def _kurtosis(values: np.ndarray) -> float:
    clean = values[np.isfinite(values)]
    if len(clean) < 4:
        return float("nan")
    centered = clean - np.mean(clean)
    std = float(np.std(clean))
    if std <= EPSILON:
        return float("nan")
    return float(np.mean(centered**4) / (std**4) - 3.0)


def _safe_divide(numerator: Optional[float], denominator: Optional[float]) -> Optional[float]:
    if numerator is None or denominator is None:
        return None
    if not math.isfinite(float(numerator)) or not math.isfinite(float(denominator)):
        return None
    if abs(float(denominator)) <= EPSILON:
        return None
    return float(numerator) / float(denominator)


def _to_float(value: Optional[float]) -> float:
    if value is None:
        return float("nan")
    try:
        number = float(value)
    except (TypeError, ValueError):
        return float("nan")
    if not math.isfinite(number):
        return float("nan")
    return number


def _json_number(value: Optional[float]) -> Optional[float]:
    if value is None:
        return None
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    if not math.isfinite(number):
        return None
    return number


def _z_value(confidence_level: float) -> float:
    level = float(confidence_level)
    if level > 1.0:
        level = level / 100.0
    if level >= 0.985:
        return 2.58
    if level >= 0.925:
        return 1.96
    return 1.65


def _normalize_analysis_mode(mode: str) -> str:
    normalized = (mode or "overlap").strip().lower()
    aliases = {
        "intersection": "overlap",
        "recent": "overlap",
        "近期真實": "overlap",
        "long": "long_rebuild",
        "long_rebuild": "long_rebuild",
        "model": "long_rebuild",
        "長線重建": "long_rebuild",
    }
    return aliases.get(normalized, normalized if normalized in {"overlap", "long_rebuild"} else "overlap")


def _normalize_optimization_mode(mode: str) -> str:
    normalized = (mode or "max_sharpe").strip().lower()
    aliases = {
        "sharpe": "max_sharpe",
        "max_sharpe": "max_sharpe",
        "最大夏普": "max_sharpe",
        "min_vol": "min_vol",
        "min_risk": "min_vol",
        "最小風險": "min_vol",
        "max_return": "max_return",
        "max_ret": "max_return",
        "最大報酬": "max_return",
        "target_vol": "target_vol",
        "target_volatility": "target_vol",
        "指定風險": "target_vol",
    }
    return aliases.get(normalized, "max_sharpe")
