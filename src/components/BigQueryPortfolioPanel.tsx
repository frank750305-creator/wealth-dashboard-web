"use client";

import { type ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { CartesianGrid, ComposedChart, Line, LineChart, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis } from "recharts";
import { analyzePortfolioFromBigQuery, fetchBigQueryAssets, optimizePortfolioFromBigQuery } from "@/lib/marketApi";
import type { BigQueryAsset, PortfolioAnalysisResponse, PortfolioOptimizationResponse } from "@/types/market";

type AssetRow = {
  id: string;
  symbol: string;
  weight: number;
  currency: string;
};

type BigQueryPortfolioPanelProps = {
  hasBigQueryCredentials: boolean;
};

type SavedPortfolioPreset = {
  id: string;
  name: string;
  rows: Array<Pick<AssetRow, "symbol" | "weight" | "currency">>;
  portfolioValue?: number;
  benchmarkSymbol: string;
  startDate: string;
  endDate: string;
  priceBasis: "adjusted" | "raw";
  pricingCurrency: "original" | "TWD";
  mode: "overlap" | "long_rebuild";
  optimizationMode: "max_sharpe" | "min_vol" | "max_return" | "target_vol";
  targetVolatility: number;
  updatedAt: string;
};

type PortfolioResult = PortfolioAnalysisResponse | PortfolioOptimizationResponse;

type RebalanceRecommendation = {
  symbol: string;
  currentWeight: number;
  targetWeight: number;
  deltaWeight: number;
  tradeAmount: number;
  action: "increase" | "decrease" | "hold";
};

type ExportedPortfolioPayload = {
  presetName?: string;
  configuration?: {
    rows?: Array<{
      symbol?: string;
      weight?: number;
      currency?: string;
    }>;
    portfolioValue?: number;
    benchmarkSymbol?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    priceBasis?: "adjusted" | "raw";
    pricingCurrency?: "original" | "TWD";
    mode?: "overlap" | "long_rebuild";
    optimizationMode?: "max_sharpe" | "min_vol" | "max_return" | "target_vol";
    targetVolatility?: number;
  };
  result?: PortfolioResult;
  rebalancing?: RebalanceRecommendation[];
};

const initialRows: AssetRow[] = [
  { id: "asset-0050", symbol: "0050.TW", weight: 50, currency: "TWD" },
  { id: "asset-spy", symbol: "SPDR S&P500 ETF", weight: 50, currency: "USD" },
];

const assetOptionListId = "bigquery-asset-symbol-options";
const presetStorageKey = "wealth-dashboard.bigqueryPortfolioPresets";
const defaultPortfolioValue = 1_000_000;

const moneyFormatter = new Intl.NumberFormat("zh-TW", {
  maximumFractionDigits: 0,
});

const metricCards: Array<{
  key: keyof PortfolioAnalysisResponse["metrics"];
  label: string;
  kind: "percent" | "number";
}> = [
  { key: "cagr", label: "CAGR", kind: "percent" },
  { key: "annualVolatility", label: "年化波動", kind: "percent" },
  { key: "sharpe", label: "Sharpe", kind: "number" },
  { key: "maxDrawdown", label: "最大回撤", kind: "percent" },
  { key: "beta", label: "Beta", kind: "number" },
  { key: "alpha", label: "Alpha", kind: "percent" },
];

function makeRow(): AssetRow {
  return {
    id: `asset-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    symbol: "",
    weight: 0,
    currency: "USD",
  };
}

function makePresetRow(row: Pick<AssetRow, "symbol" | "weight" | "currency">): AssetRow {
  return {
    id: `asset-${row.symbol || "preset"}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    symbol: row.symbol,
    weight: row.weight,
    currency: row.currency,
  };
}

function loadPresetsFromStorage() {
  if (typeof window === "undefined") return [];

  try {
    const parsed = JSON.parse(window.localStorage.getItem(presetStorageKey) || "[]");
    return Array.isArray(parsed) ? (parsed as SavedPortfolioPreset[]) : [];
  } catch {
    return [];
  }
}

function writePresetsToStorage(presets: SavedPortfolioPreset[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(presetStorageKey, JSON.stringify(presets));
}

function csvCell(value: unknown) {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function downloadTextFile(fileName: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function resultStamp() {
  return new Date().toISOString().slice(0, 19).replaceAll(":", "").replace("T", "-");
}

function wealthPathCsv(result: PortfolioResult) {
  const header = ["date", "wealth_index", "daily_return"];
  const rows = result.wealthPath.map((point) => [point.date, point.value, point.dailyReturn]);
  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}

function assetStatisticsCsv(result: PortfolioResult) {
  const contributionBySymbol = new Map((result.riskContributions ?? []).map((item) => [item.symbol, item]));
  const header = [
    "symbol",
    "annual_return",
    "annual_volatility",
    "weight",
    "marginal_risk",
    "risk_contribution",
    "risk_contribution_percent",
  ];
  const rows = result.assetStatistics.map((asset) => {
    const contribution = contributionBySymbol.get(asset.symbol);
    return [
      asset.symbol,
      asset.annualReturn,
      asset.annualVolatility,
      contribution?.weight,
      contribution?.marginalRisk,
      contribution?.riskContribution,
      contribution?.riskContributionPercent,
    ];
  });
  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}

function rebalancingCsv(rows: RebalanceRecommendation[]) {
  const header = ["symbol", "current_weight", "target_weight", "delta_weight", "trade_amount_twd", "action"];
  const csvRows = rows.map((row) => [
    row.symbol,
    row.currentWeight,
    row.targetWeight,
    row.deltaWeight,
    row.tradeAmount,
    row.action,
  ]);
  return [header, ...csvRows].map((row) => row.map(csvCell).join(",")).join("\n");
}

function formatMetric(value: number | null, kind: "percent" | "number") {
  if (value === null || !Number.isFinite(value)) return "--";
  if (kind === "percent") return `${(value * 100).toFixed(2)}%`;
  return value.toFixed(2);
}

function formatSignedWeightDelta(value: number) {
  if (!Number.isFinite(value)) return "--";
  const sign = value > 0 ? "+" : "";
  return `${sign}${(value * 100).toFixed(1)}pp`;
}

function formatMoney(value: number, signed = false) {
  if (!Number.isFinite(value)) return "--";
  const sign = value < 0 ? "-" : signed && value > 0 ? "+" : "";
  return `${sign}TWD ${moneyFormatter.format(Math.abs(value))}`;
}

function normalizePortfolioValue(value: unknown, fallback = defaultPortfolioValue) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : fallback;
}

function rebalanceAction(deltaWeight: number): RebalanceRecommendation["action"] {
  if (Math.abs(deltaWeight) < 0.0005) return "hold";
  return deltaWeight > 0 ? "increase" : "decrease";
}

function rebalanceActionLabel(action: RebalanceRecommendation["action"]) {
  if (action === "increase") return "加碼";
  if (action === "decrease") return "減碼";
  return "維持";
}

function rebalanceActionClass(action: RebalanceRecommendation["action"]) {
  if (action === "increase") return "text-emerald-300 bg-emerald-500/10 border-emerald-500/30";
  if (action === "decrease") return "text-rose-300 bg-rose-500/10 border-rose-500/30";
  return "text-slate-300 bg-slate-800 border-slate-700";
}

function rebalanceBarWidth(value: number) {
  if (!Number.isFinite(value)) return "0%";
  return `${Math.min(Math.abs(value) * 100, 100).toFixed(1)}%`;
}

function riskContributionBarWidth(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "0%";
  return `${Math.min(Math.abs(value) * 100, 100).toFixed(1)}%`;
}

function formatCorrelation(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "--";
  return value.toFixed(2);
}

function correlationCellClass(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "bg-slate-900 text-slate-600 border-slate-800";
  }
  if (value >= 0.75) return "bg-red-500/20 text-red-200 border-red-500/30";
  if (value >= 0.4) return "bg-amber-500/15 text-amber-200 border-amber-500/30";
  if (value <= -0.4) return "bg-cyan-500/15 text-cyan-200 border-cyan-500/30";
  return "bg-slate-900 text-slate-300 border-slate-800";
}

function formatChartNumber(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric.toFixed(1) : "--";
}

function formatChartPercent(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? `${(numeric * 100).toFixed(1)}%` : "--";
}

function formatChartDate(value: unknown) {
  if (typeof value !== "string" || value.length < 7) return "--";
  return value.slice(2, 7).replace("-", "/");
}

function inferSymbolCurrency(symbol: string) {
  return symbol.trim().toUpperCase().endsWith(".TW") ? "TWD" : "USD";
}

function isPortfolioResult(value: unknown): value is PortfolioResult {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<PortfolioResult>;
  return Boolean(candidate.metrics && candidate.dataWindow && Array.isArray(candidate.wealthPath));
}

function importedWeightToPercent(weight: unknown) {
  const numeric = Number(weight);
  if (!Number.isFinite(numeric)) return 0;
  return Math.abs(numeric) <= 1 ? Number((numeric * 100).toFixed(2)) : numeric;
}

function applyTradeAmounts(rows: RebalanceRecommendation[], portfolioValue: number) {
  return rows.map((row) => ({
    ...row,
    tradeAmount: row.deltaWeight * portfolioValue,
  }));
}

function buildRebalanceRows(
  currentRows: Array<Pick<AssetRow, "symbol" | "weight">>,
  targetRows: PortfolioOptimizationResponse["weights"],
  portfolioValue: number,
) {
  const totalWeight = currentRows.reduce((sum, row) => sum + (Number(row.weight) || 0), 0);
  const currentBySymbol = new Map(
    currentRows.map((row) => [
      row.symbol.trim(),
      totalWeight > 0 ? (Number(row.weight) || 0) / totalWeight : 0,
    ]),
  );

  return targetRows.map((targetRow) => {
    const targetWeight = Number(targetRow.weight) || 0;
    const currentWeight = currentBySymbol.get(targetRow.symbol) ?? 0;
    const deltaWeight = targetWeight - currentWeight;
    return {
      symbol: targetRow.symbol,
      currentWeight,
      targetWeight,
      deltaWeight,
      tradeAmount: deltaWeight * portfolioValue,
      action: rebalanceAction(deltaWeight),
    };
  });
}

function normalizeRebalanceRows(value: unknown, portfolioValue: number) {
  if (!Array.isArray(value)) return [];

  return value.flatMap((row) => {
    if (!row || typeof row !== "object") return [];
    const item = row as Partial<RebalanceRecommendation>;
    if (typeof item.symbol !== "string" || !item.symbol.trim()) return [];

    const currentWeight = Number(item.currentWeight);
    const targetWeight = Number(item.targetWeight);
    const deltaWeight = Number.isFinite(Number(item.deltaWeight)) ? Number(item.deltaWeight) : targetWeight - currentWeight;
    if (!Number.isFinite(currentWeight) || !Number.isFinite(targetWeight) || !Number.isFinite(deltaWeight)) return [];

    return [
      {
        symbol: item.symbol.trim(),
        currentWeight,
        targetWeight,
        deltaWeight,
        tradeAmount: deltaWeight * portfolioValue,
        action: item.action === "increase" || item.action === "decrease" || item.action === "hold"
          ? item.action
          : rebalanceAction(deltaWeight),
      },
    ];
  });
}

export function BigQueryPortfolioPanel({ hasBigQueryCredentials }: BigQueryPortfolioPanelProps) {
  const [rows, setRows] = useState<AssetRow[]>(initialRows);
  const [benchmarkSymbol, setBenchmarkSymbol] = useState("0050.TW");
  const [startDate, setStartDate] = useState("2020-01-01");
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [priceBasis, setPriceBasis] = useState<"adjusted" | "raw">("adjusted");
  const [pricingCurrency, setPricingCurrency] = useState<"original" | "TWD">("TWD");
  const [mode, setMode] = useState<"overlap" | "long_rebuild">("overlap");
  const [optimizationMode, setOptimizationMode] = useState<"max_sharpe" | "min_vol" | "max_return" | "target_vol">(
    "max_sharpe",
  );
  const [targetVolatility, setTargetVolatility] = useState(12);
  const [portfolioValue, setPortfolioValue] = useState(defaultPortfolioValue);
  const [result, setResult] = useState<PortfolioAnalysisResponse | null>(null);
  const [optimizationResult, setOptimizationResult] = useState<PortfolioOptimizationResponse | null>(null);
  const [rebalanceRows, setRebalanceRows] = useState<RebalanceRecommendation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [assetQuery, setAssetQuery] = useState("");
  const [assetSuggestions, setAssetSuggestions] = useState<BigQueryAsset[]>([]);
  const [assetSearchError, setAssetSearchError] = useState<string | null>(null);
  const [isLoadingAssets, setIsLoadingAssets] = useState(false);
  const [presetName, setPresetName] = useState("核心配置");
  const [selectedPresetId, setSelectedPresetId] = useState("");
  const [savedPresets, setSavedPresets] = useState<SavedPortfolioPreset[]>([]);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  const totalWeight = useMemo(
    () => rows.reduce((sum, row) => sum + (Number.isFinite(row.weight) ? row.weight : 0), 0),
    [rows],
  );

  const isBusy = isAnalyzing || isOptimizing;
  const canSubmit = hasBigQueryCredentials && rows.some((row) => row.symbol.trim()) && !isBusy;
  const displayResult = optimizationResult ?? result;
  const correlationMatrix = displayResult?.correlationMatrix;
  const efficientFrontier = optimizationResult?.efficientFrontier;
  const riskContributionRows = useMemo(() => {
    return [...(displayResult?.riskContributions ?? [])].sort(
      (left, right) =>
        Math.abs(right.riskContributionPercent ?? 0) - Math.abs(left.riskContributionPercent ?? 0),
    );
  }, [displayResult]);
  const wealthChartData = useMemo(() => {
    const wealthPath = displayResult?.wealthPath ?? [];
    const step = Math.max(1, Math.floor(wealthPath.length / 360));

    const sampled = wealthPath
      .filter((point, index) => index % step === 0 && point.date && point.value !== null && Number.isFinite(point.value))
      .map((point) => ({
        date: point.date,
        value: point.value,
        dailyReturn: point.dailyReturn,
      }));

    const lastPoint = wealthPath.at(-1);
    if (
      lastPoint?.date &&
      lastPoint.value !== null &&
      Number.isFinite(lastPoint.value) &&
      sampled.at(-1)?.date !== lastPoint.date
    ) {
      sampled.push({
        date: lastPoint.date,
        value: lastPoint.value,
        dailyReturn: lastPoint.dailyReturn,
      });
    }

    return sampled;
  }, [displayResult]);
  const drawdownChartData = useMemo(() => {
    const wealthPath = displayResult?.wealthPath ?? [];
    const drawdownRows: Array<{ date: string; drawdown: number; value: number }> = [];
    let runningPeak = -Infinity;

    for (const point of wealthPath) {
      const value = Number(point.value);
      if (!point.date || !Number.isFinite(value)) continue;

      runningPeak = Math.max(runningPeak, value);
      drawdownRows.push({
        date: point.date,
        drawdown: runningPeak > 0 ? value / runningPeak - 1 : 0,
        value,
      });
    }

    const step = Math.max(1, Math.floor(drawdownRows.length / 360));
    const sampled = drawdownRows.filter((_, index) => index % step === 0);
    const lastPoint = drawdownRows.at(-1);

    if (lastPoint && sampled.at(-1)?.date !== lastPoint.date) {
      sampled.push(lastPoint);
    }

    return sampled;
  }, [displayResult]);

  useEffect(() => {
    if (!hasBigQueryCredentials) {
      return;
    }

    let isCancelled = false;
    const timer = window.setTimeout(async () => {
      setIsLoadingAssets(true);
      setAssetSearchError(null);

      try {
        const response = await fetchBigQueryAssets(assetQuery, assetQuery.trim() ? 20 : 12);
        if (!isCancelled) {
          setAssetSuggestions(response.assets);
        }
      } catch (err: unknown) {
        if (!isCancelled) {
          setAssetSuggestions([]);
          setAssetSearchError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingAssets(false);
        }
      }
    }, 350);

    return () => {
      isCancelled = true;
      window.clearTimeout(timer);
    };
  }, [assetQuery, hasBigQueryCredentials]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const presets = loadPresetsFromStorage();
      setSavedPresets(presets);
      setSelectedPresetId((currentId) => currentId || presets[0]?.id || "");
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  function updateRow(id: string, patch: Partial<AssetRow>) {
    setRows((currentRows) => currentRows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function removeRow(id: string) {
    setRows((currentRows) => currentRows.filter((row) => row.id !== id));
  }

  function activeRows() {
    return rows.filter((row) => row.symbol.trim());
  }

  function handlePortfolioValueChange(value: number) {
    const nextValue = normalizePortfolioValue(value, 0);
    setPortfolioValue(nextValue);
    setRebalanceRows((currentRows) => applyTradeAmounts(currentRows, nextValue));
  }

  function applyAssetSuggestion(symbol: string) {
    const currency = inferSymbolCurrency(symbol);
    setRows((currentRows) => {
      const emptyRowIndex = currentRows.findIndex((row) => !row.symbol.trim());

      if (emptyRowIndex >= 0) {
        return currentRows.map((row, index) => (index === emptyRowIndex ? { ...row, symbol, currency } : row));
      }

      return [
        ...currentRows,
        {
          ...makeRow(),
          symbol,
          currency,
        },
      ];
    });
    setAssetQuery(symbol);
  }

  function currencyBySymbolFor(activeAssetRows: AssetRow[]) {
    return Object.fromEntries(
      activeAssetRows.map((row) => [row.symbol.trim(), row.currency.trim().toUpperCase() || "USD"]),
    );
  }

  function handleSavePreset() {
    const cleanName = presetName.trim() || "未命名配置";
    const now = new Date().toISOString();
    const activeAssetRows = activeRows();
    const preset: SavedPortfolioPreset = {
      id: selectedPresetId || `preset-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name: cleanName,
      rows: activeAssetRows.length
        ? activeAssetRows.map((row) => ({
            symbol: row.symbol.trim(),
            weight: Number(row.weight) || 0,
            currency: row.currency.trim().toUpperCase() || "USD",
          }))
        : rows.map((row) => ({
            symbol: row.symbol.trim(),
            weight: Number(row.weight) || 0,
            currency: row.currency.trim().toUpperCase() || "USD",
          })),
      portfolioValue,
      benchmarkSymbol,
      startDate,
      endDate,
      priceBasis,
      pricingCurrency,
      mode,
      optimizationMode,
      targetVolatility,
      updatedAt: now,
    };

    setSavedPresets((currentPresets) => {
      const nextPresets = [preset, ...currentPresets.filter((item) => item.id !== preset.id)].slice(0, 12);
      writePresetsToStorage(nextPresets);
      return nextPresets;
    });
    setSelectedPresetId(preset.id);
  }

  function handleLoadPreset() {
    const preset = savedPresets.find((item) => item.id === selectedPresetId);
    if (!preset) return;

    setRows(preset.rows.length ? preset.rows.map(makePresetRow) : initialRows);
    setBenchmarkSymbol(preset.benchmarkSymbol);
    setStartDate(preset.startDate);
    setEndDate(preset.endDate);
    setPriceBasis(preset.priceBasis);
    setPricingCurrency(preset.pricingCurrency);
    setMode(preset.mode);
    setOptimizationMode(preset.optimizationMode);
    setTargetVolatility(preset.targetVolatility);
    setPortfolioValue(normalizePortfolioValue(preset.portfolioValue));
    setPresetName(preset.name);
    setResult(null);
    setOptimizationResult(null);
    setRebalanceRows([]);
    setError(null);
  }

  function handleDeletePreset() {
    if (!selectedPresetId) return;

    setSavedPresets((currentPresets) => {
      const nextPresets = currentPresets.filter((preset) => preset.id !== selectedPresetId);
      writePresetsToStorage(nextPresets);
      setSelectedPresetId(nextPresets[0]?.id || "");
      return nextPresets;
    });
  }

  async function handleImportJson(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const payload = JSON.parse(await file.text()) as ExportedPortfolioPayload;
      const config = payload.configuration;
      if (!config?.rows?.length) {
        throw new Error("匯入檔缺少 configuration.rows。");
      }

      const importedRows = config.rows
        .filter((row) => typeof row.symbol === "string" && row.symbol.trim())
        .map((row) =>
          makePresetRow({
            symbol: row.symbol?.trim() ?? "",
            weight: importedWeightToPercent(row.weight),
            currency: row.currency?.trim().toUpperCase() || inferSymbolCurrency(row.symbol ?? ""),
          }),
        );

      if (!importedRows.length) {
        throw new Error("匯入檔沒有可用商品。");
      }

      setRows(importedRows);
      setBenchmarkSymbol(config.benchmarkSymbol?.trim() || "");
      setStartDate(config.startDate || "2020-01-01");
      setEndDate(config.endDate || new Date().toISOString().slice(0, 10));
      setPriceBasis(config.priceBasis === "raw" ? "raw" : "adjusted");
      setPricingCurrency(config.pricingCurrency === "original" ? "original" : "TWD");
      setMode(config.mode === "long_rebuild" ? "long_rebuild" : "overlap");
      setOptimizationMode(config.optimizationMode ?? "max_sharpe");
      setTargetVolatility(Number.isFinite(config.targetVolatility) ? Number(config.targetVolatility) : 12);
      const nextPortfolioValue = normalizePortfolioValue(config.portfolioValue);
      setPortfolioValue(nextPortfolioValue);
      setPresetName(payload.presetName?.trim() || file.name.replace(/\.json$/i, ""));
      setSelectedPresetId("");
      setRebalanceRows(normalizeRebalanceRows(payload.rebalancing, nextPortfolioValue));
      setError(null);

      if (isPortfolioResult(payload.result)) {
        if ("optimizationMode" in payload.result) {
          setOptimizationResult(payload.result as PortfolioOptimizationResponse);
          setResult(null);
        } else {
          setResult(payload.result as PortfolioAnalysisResponse);
          setOptimizationResult(null);
        }
      } else {
        setResult(null);
        setOptimizationResult(null);
      }
    } catch (err: unknown) {
      setError(`JSON 匯入失敗：${err instanceof Error ? err.message : String(err)}`);
    }
  }

  function exportPayload() {
    if (!displayResult) return null;

    return {
      exportedAt: new Date().toISOString(),
      presetName,
      configuration: {
        rows: activeRows().map((row) => ({
          symbol: row.symbol.trim(),
          weight: Number(row.weight) / 100,
          currency: row.currency.trim().toUpperCase() || "USD",
        })),
        portfolioValue,
        benchmarkSymbol,
        startDate,
        endDate,
        priceBasis,
        pricingCurrency,
        mode,
        optimizationMode,
        targetVolatility,
      },
      result: displayResult,
      rebalancing: rebalanceRows,
    };
  }

  function handleExportJson() {
    const payload = exportPayload();
    if (!payload) return;

    downloadTextFile(
      `bigquery-portfolio-${resultStamp()}.json`,
      JSON.stringify(payload, null, 2),
      "application/json;charset=utf-8",
    );
  }

  function handleExportWealthCsv() {
    if (!displayResult) return;

    downloadTextFile(
      `bigquery-wealth-path-${resultStamp()}.csv`,
      wealthPathCsv(displayResult),
      "text/csv;charset=utf-8",
    );
  }

  function handleExportAssetCsv() {
    if (!displayResult) return;

    downloadTextFile(
      `bigquery-asset-statistics-${resultStamp()}.csv`,
      assetStatisticsCsv(displayResult),
      "text/csv;charset=utf-8",
    );
  }

  function handleExportRebalancingCsv() {
    if (!rebalanceRows.length) return;

    downloadTextFile(
      `bigquery-rebalancing-${resultStamp()}.csv`,
      rebalancingCsv(rebalanceRows),
      "text/csv;charset=utf-8",
    );
  }

  async function handleAnalyze() {
    setError(null);
    setResult(null);
    setRebalanceRows([]);

    if (!hasBigQueryCredentials) {
      setError("Vercel 尚未設定 GCP_SERVICE_ACCOUNT_JSON。");
      return;
    }

    const activeAssetRows = activeRows();
    if (!activeAssetRows.length) {
      setError("至少需要一個商品代號。");
      return;
    }

    setIsAnalyzing(true);
    try {
      const weightsBySymbol = Object.fromEntries(
        activeAssetRows.map((row) => [row.symbol.trim(), Number(row.weight) / 100]),
      );

      const response = await analyzePortfolioFromBigQuery({
        weights_by_symbol: weightsBySymbol,
        benchmark_symbol: benchmarkSymbol.trim() || null,
        start_date: startDate || null,
        end_date: endDate || null,
        price_basis: priceBasis,
        pricing_currency: pricingCurrency,
        currency_by_symbol: currencyBySymbolFor(activeAssetRows),
        mode,
      });

      setResult(response);
      setOptimizationResult(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function handleOptimize() {
    setError(null);
    setResult(null);
    setOptimizationResult(null);
    setRebalanceRows([]);

    if (!hasBigQueryCredentials) {
      setError("Vercel 尚未設定 GCP_SERVICE_ACCOUNT_JSON。");
      return;
    }

    const activeAssetRows = activeRows();
    if (activeAssetRows.length < 2) {
      setError("AI 調倉至少需要兩個商品。");
      return;
    }

    setIsOptimizing(true);
    try {
      const response = await optimizePortfolioFromBigQuery({
        symbols: activeAssetRows.map((row) => row.symbol.trim()),
        benchmark_symbol: benchmarkSymbol.trim() || null,
        start_date: startDate || null,
        end_date: endDate || null,
        price_basis: priceBasis,
        pricing_currency: pricingCurrency,
        currency_by_symbol: currencyBySymbolFor(activeAssetRows),
        mode,
        optimization_mode: optimizationMode,
        target_volatility: optimizationMode === "target_vol" ? targetVolatility / 100 : null,
      });

      const optimizedWeights = Object.fromEntries(
        response.weights.map((weightRow) => [weightRow.symbol, Number((weightRow.weight * 100).toFixed(1))]),
      );
      const nextRebalanceRows = buildRebalanceRows(activeAssetRows, response.weights, portfolioValue);

      setRows((currentRows) =>
        currentRows.map((row) => {
          const symbol = row.symbol.trim();
          return symbol in optimizedWeights ? { ...row, weight: optimizedWeights[symbol] } : row;
        }),
      );
      setOptimizationResult(response);
      setRebalanceRows(nextRebalanceRows);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsOptimizing(false);
    }
  }

  return (
    <section className="bg-slate-900 border border-slate-800 p-4 md:p-6 rounded-xl shadow-2xl space-y-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h3 className="text-sm font-bold text-cyan-300">▍ BigQuery 投組分析工作台</h3>
          <p className="text-[11px] text-slate-500 mt-1">daily_prices / daily_fx</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleAnalyze}
            disabled={!canSubmit}
            className="px-3 py-2 text-xs font-bold rounded-md bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
          >
            {isAnalyzing ? "分析中" : "執行分析"}
          </button>
          <button
            onClick={handleOptimize}
            disabled={!canSubmit}
            className="px-3 py-2 text-xs font-bold rounded-md bg-cyan-600 hover:bg-cyan-500 text-white transition-colors disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
          >
            {isOptimizing ? "調倉中" : "AI 調倉"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[0.8fr_1.2fr] gap-3 bg-slate-950 border border-slate-800 rounded-lg p-3">
        <input ref={importInputRef} type="file" accept="application/json,.json" hidden onChange={handleImportJson} />
        <label className="space-y-1 text-xs">
          <span className="text-slate-500">配置名稱</span>
          <input
            value={presetName}
            onChange={(event) => setPresetName(event.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-md px-2 py-2 text-slate-100"
          />
        </label>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto_auto_auto] gap-2 text-xs">
          <label className="space-y-1">
            <span className="text-slate-500">已存配置</span>
            <select
              value={selectedPresetId}
              onChange={(event) => {
                const preset = savedPresets.find((item) => item.id === event.target.value);
                setSelectedPresetId(event.target.value);
                if (preset) setPresetName(preset.name);
              }}
              className="w-full bg-slate-900 border border-slate-700 rounded-md px-2 py-2 text-slate-100"
            >
              <option value="">尚未選擇</option>
              {savedPresets.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.name} · {new Date(preset.updatedAt).toLocaleDateString("zh-TW")}
                </option>
              ))}
            </select>
          </label>
          <button
            onClick={handleSavePreset}
            className="md:self-end px-3 py-2 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
          >
            儲存
          </button>
          <button
            onClick={handleLoadPreset}
            disabled={!selectedPresetId}
            className="md:self-end px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold disabled:cursor-not-allowed disabled:text-slate-500"
          >
            載入
          </button>
          <button
            onClick={handleDeletePreset}
            disabled={!selectedPresetId}
            className="md:self-end px-3 py-2 rounded-md bg-slate-900 border border-slate-700 hover:border-red-500 text-slate-300 hover:text-red-300 font-bold disabled:cursor-not-allowed disabled:text-slate-600"
          >
            刪除
          </button>
          <button
            onClick={() => importInputRef.current?.click()}
            className="md:self-end px-3 py-2 rounded-md bg-cyan-700 hover:bg-cyan-600 text-white font-bold"
          >
            匯入 JSON
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.3fr_0.7fr] gap-4">
        <div className="space-y-3">
          <div className="grid grid-cols-[1fr_72px_82px_36px] gap-2 text-[11px] text-slate-500 px-1">
            <span>商品代號</span>
            <span>權重%</span>
            <span>幣別</span>
            <span />
          </div>

          <datalist id={assetOptionListId}>
            {assetSuggestions.map((asset) => (
              <option
                key={asset.symbol}
                value={asset.symbol}
                label={`${asset.latest_date ?? "--"} · Adj ${asset.adjusted_price_rows.toLocaleString("zh-TW")} · Raw ${asset.raw_price_rows.toLocaleString("zh-TW")}`}
              />
            ))}
          </datalist>

          {rows.map((row) => (
            <div key={row.id} className="grid grid-cols-[1fr_72px_82px_36px] gap-2">
              <input
                value={row.symbol}
                list={hasBigQueryCredentials ? assetOptionListId : undefined}
                onChange={(event) => {
                  updateRow(row.id, { symbol: event.target.value });
                  setAssetQuery(event.target.value);
                }}
                className="min-w-0 bg-slate-950 border border-slate-700 rounded-md px-2 py-2 text-xs text-slate-100"
              />
              <input
                type="number"
                value={row.weight}
                onChange={(event) => updateRow(row.id, { weight: Number(event.target.value) })}
                className="bg-slate-950 border border-slate-700 rounded-md px-2 py-2 text-xs text-slate-100 font-mono"
              />
              <select
                value={row.currency}
                onChange={(event) => updateRow(row.id, { currency: event.target.value })}
                className="bg-slate-950 border border-slate-700 rounded-md px-2 py-2 text-xs text-slate-100"
              >
                <option value="TWD">TWD</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="AUD">AUD</option>
              </select>
              <button
                onClick={() => removeRow(row.id)}
                disabled={rows.length <= 1}
                className="bg-slate-950 border border-slate-700 rounded-md text-slate-400 hover:text-red-300 disabled:opacity-30"
                title="移除"
              >
                ×
              </button>
            </div>
          ))}

          <div className="flex items-center justify-between gap-3">
            <button
              onClick={() => setRows((currentRows) => [...currentRows, makeRow()])}
              className="w-9 h-9 rounded-md bg-slate-950 border border-slate-700 text-cyan-300 hover:border-cyan-600"
              title="新增商品"
            >
              +
            </button>
            <p className={`text-xs font-mono ${Math.abs(totalWeight - 100) < 0.01 ? "text-emerald-300" : "text-amber-300"}`}>
              {totalWeight.toFixed(1)}%
            </p>
          </div>

          {hasBigQueryCredentials && (
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between gap-3 text-[11px]">
                <span className="text-slate-500">BigQuery 商品候選</span>
                <span className="text-slate-500 font-mono">
                  {isLoadingAssets ? "搜尋中" : `${assetSuggestions.length} 筆`}
                </span>
              </div>
              {assetSearchError ? (
                <p className="text-[11px] text-red-300 whitespace-pre-wrap">{assetSearchError}</p>
              ) : assetSuggestions.length ? (
                <div className="flex flex-wrap gap-2">
                  {assetSuggestions.slice(0, 8).map((asset) => (
                    <button
                      key={asset.symbol}
                      onClick={() => applyAssetSuggestion(asset.symbol)}
                      className="max-w-full min-w-0 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-left text-[11px] text-slate-200 hover:border-cyan-600"
                    >
                      <span className="block truncate font-bold text-cyan-200">{asset.symbol}</span>
                      <span className="block truncate text-slate-500">{asset.latest_date ?? "--"}</span>
                      <span className="block truncate text-slate-500">
                        Adj {asset.adjusted_price_rows.toLocaleString("zh-TW")} · Raw{" "}
                        {asset.raw_price_rows.toLocaleString("zh-TW")}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-slate-500">查無候選</p>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <label className="space-y-1 col-span-2">
            <span className="text-slate-500">Benchmark</span>
            <input
              value={benchmarkSymbol}
              list={hasBigQueryCredentials ? assetOptionListId : undefined}
              onChange={(event) => {
                setBenchmarkSymbol(event.target.value);
                setAssetQuery(event.target.value);
              }}
              className="w-full bg-slate-950 border border-slate-700 rounded-md px-2 py-2 text-slate-100"
            />
          </label>
          <label className="space-y-1 col-span-2">
            <span className="text-slate-500">投組總金額 TWD</span>
            <input
              type="number"
              min={0}
              step={10000}
              value={portfolioValue}
              onChange={(event) => handlePortfolioValueChange(Number(event.target.value))}
              className="w-full bg-slate-950 border border-slate-700 rounded-md px-2 py-2 text-slate-100 font-mono"
            />
          </label>
          <label className="space-y-1">
            <span className="text-slate-500">起日</span>
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-md px-2 py-2 text-slate-100"
            />
          </label>
          <label className="space-y-1">
            <span className="text-slate-500">迄日</span>
            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-md px-2 py-2 text-slate-100"
            />
          </label>
          <label className="space-y-1">
            <span className="text-slate-500">價格基準</span>
            <select
              value={priceBasis}
              onChange={(event) => setPriceBasis(event.target.value as "adjusted" | "raw")}
              className="w-full bg-slate-950 border border-slate-700 rounded-md px-2 py-2 text-slate-100"
            >
              <option value="adjusted">Adj</option>
              <option value="raw">Raw</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-slate-500">計價</span>
            <select
              value={pricingCurrency}
              onChange={(event) => setPricingCurrency(event.target.value as "original" | "TWD")}
              className="w-full bg-slate-950 border border-slate-700 rounded-md px-2 py-2 text-slate-100"
            >
              <option value="TWD">TWD</option>
              <option value="original">原幣</option>
            </select>
          </label>
          <label className="space-y-1 col-span-2">
            <span className="text-slate-500">模式</span>
            <select
              value={mode}
              onChange={(event) => setMode(event.target.value as "overlap" | "long_rebuild")}
              className="w-full bg-slate-950 border border-slate-700 rounded-md px-2 py-2 text-slate-100"
            >
              <option value="overlap">近期交集法</option>
              <option value="long_rebuild">長線重建法</option>
            </select>
          </label>
          <label className="space-y-1 col-span-2">
            <span className="text-slate-500">AI 策略</span>
            <select
              value={optimizationMode}
              onChange={(event) =>
                setOptimizationMode(event.target.value as "max_sharpe" | "min_vol" | "max_return" | "target_vol")
              }
              className="w-full bg-slate-950 border border-slate-700 rounded-md px-2 py-2 text-slate-100"
            >
              <option value="max_sharpe">最大夏普</option>
              <option value="min_vol">最小風險</option>
              <option value="max_return">最大報酬</option>
              <option value="target_vol">指定波動率</option>
            </select>
          </label>
          {optimizationMode === "target_vol" && (
            <label className="space-y-1 col-span-2">
              <span className="text-slate-500">目標波動率 %</span>
              <input
                type="number"
                value={targetVolatility}
                onChange={(event) => setTargetVolatility(Number(event.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-md px-2 py-2 text-slate-100 font-mono"
              />
            </label>
          )}
        </div>
      </div>

      {!hasBigQueryCredentials && (
        <div className="border border-amber-900/60 bg-amber-950/20 rounded-lg p-3 text-xs text-amber-200">
          Vercel 尚未設定 GCP_SERVICE_ACCOUNT_JSON。
        </div>
      )}

      {error && (
        <div className="border border-red-900/60 bg-red-950/30 rounded-lg p-3 text-xs text-red-300 whitespace-pre-wrap">
          {error}
        </div>
      )}

      {displayResult && (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-950 border border-slate-800 rounded-lg p-3">
            <div>
              <p className="text-xs font-bold text-slate-200">分析結果匯出</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {displayResult.dataWindow.startDate ?? "--"} ~ {displayResult.dataWindow.endDate ?? "--"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleExportJson}
                className="px-3 py-2 text-xs font-bold rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100"
              >
                JSON
              </button>
              <button
                onClick={handleExportWealthCsv}
                className="px-3 py-2 text-xs font-bold rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100"
              >
                財富 CSV
              </button>
              <button
                onClick={handleExportAssetCsv}
                className="px-3 py-2 text-xs font-bold rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100"
              >
                資產 CSV
              </button>
              {rebalanceRows.length ? (
                <button
                  onClick={handleExportRebalancingCsv}
                  className="px-3 py-2 text-xs font-bold rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100"
                >
                  調倉 CSV
                </button>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            {metricCards.map((metric) => (
              <div key={metric.key} className="bg-slate-950 border border-slate-800 rounded-lg p-3">
                <p className="text-[11px] text-slate-500 mb-1">{metric.label}</p>
                <p className="text-lg font-bold text-slate-100 font-mono">
                  {formatMetric(displayResult.metrics[metric.key], metric.kind)}
                </p>
              </div>
            ))}
          </div>

          {rebalanceRows.length ? (
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
              <div className="flex items-center justify-between gap-3 mb-3">
                <p className="text-[11px] text-slate-500">再平衡建議</p>
                <p className="text-[11px] text-slate-600 font-mono">{formatMoney(portfolioValue)}</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[820px] text-xs">
                  <thead>
                    <tr className="text-left text-[11px] text-slate-600">
                      <th className="py-2 pr-3 font-medium">Asset</th>
                      <th className="py-2 px-3 font-medium text-right">Current</th>
                      <th className="py-2 px-3 font-medium text-right">Target</th>
                      <th className="py-2 px-3 font-medium">Delta</th>
                      <th className="py-2 px-3 font-medium text-right">Trade</th>
                      <th className="py-2 pl-3 font-medium text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rebalanceRows.map((row) => (
                      <tr key={row.symbol} className="border-t border-slate-900">
                        <td className="py-2 pr-3 text-slate-200">
                          <span title={row.symbol} className="block max-w-48 truncate">
                            {row.symbol}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-slate-400">
                          {formatMetric(row.currentWeight, "percent")}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-cyan-200">
                          {formatMetric(row.targetWeight, "percent")}
                        </td>
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-16 font-mono ${
                                row.deltaWeight > 0 ? "text-emerald-300" : row.deltaWeight < 0 ? "text-rose-300" : "text-slate-400"
                              }`}
                            >
                              {formatSignedWeightDelta(row.deltaWeight)}
                            </span>
                            <div className="h-2 min-w-24 flex-1 rounded-full bg-slate-900 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${row.deltaWeight >= 0 ? "bg-emerald-400" : "bg-rose-400"}`}
                                style={{ width: rebalanceBarWidth(row.deltaWeight) }}
                              />
                            </div>
                          </div>
                        </td>
                        <td
                          className={`py-2 px-3 text-right font-mono ${
                            row.tradeAmount > 0
                              ? "text-emerald-300"
                              : row.tradeAmount < 0
                                ? "text-rose-300"
                                : "text-slate-400"
                          }`}
                        >
                          {formatMoney(row.tradeAmount, true)}
                        </td>
                        <td className="py-2 pl-3 text-right">
                          <span className={`inline-flex min-w-12 justify-center rounded-md border px-2 py-1 text-[11px] font-bold ${rebalanceActionClass(row.action)}`}>
                            {rebalanceActionLabel(row.action)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {riskContributionRows.length ? (
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
              <div className="flex items-center justify-between gap-3 mb-3">
                <p className="text-[11px] text-slate-500">風險貢獻</p>
                <p className="text-[11px] text-slate-600 font-mono">Weight / Risk</p>
              </div>
              <div className="space-y-3">
                {riskContributionRows.map((item) => {
                  const isNegative =
                    item.riskContributionPercent !== null &&
                    item.riskContributionPercent !== undefined &&
                    item.riskContributionPercent < 0;
                  return (
                    <div key={item.symbol} className="grid grid-cols-1 md:grid-cols-[11rem_1fr_10rem] gap-2 md:items-center">
                      <div className="min-w-0">
                        <p className="text-xs text-slate-200 truncate" title={item.symbol}>
                          {item.symbol}
                        </p>
                        <p className="text-[11px] text-slate-600 font-mono">
                          {formatMetric(item.weight, "percent")}
                        </p>
                      </div>
                      <div className="h-2 rounded-full bg-slate-900 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${isNegative ? "bg-cyan-400" : "bg-rose-400"}`}
                          style={{ width: riskContributionBarWidth(item.riskContributionPercent) }}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px] font-mono md:text-right">
                        <span className={isNegative ? "text-cyan-200" : "text-rose-200"}>
                          {formatMetric(item.riskContributionPercent, "percent")}
                        </span>
                        <span className="text-slate-500">{formatMetric(item.marginalRisk, "percent")}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          {efficientFrontier?.points?.length ? (
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                  <p className="text-[11px] text-slate-500">有效前緣</p>
                  <p className="text-[11px] text-slate-600 mt-0.5">候選組合風險 / 報酬分布</p>
                </div>
                <p className="text-[11px] text-slate-600 font-mono">
                  {efficientFrontier.points.length} scenarios
                </p>
              </div>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={efficientFrontier.points} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis
                      type="number"
                      dataKey="annualVolatility"
                      name="年化波動"
                      domain={["auto", "auto"]}
                      stroke="#64748b"
                      tick={{ fill: "#64748b", fontSize: 11 }}
                      tickFormatter={formatChartPercent}
                    />
                    <YAxis
                      type="number"
                      dataKey="annualReturn"
                      name="年化報酬"
                      domain={["auto", "auto"]}
                      stroke="#64748b"
                      tick={{ fill: "#64748b", fontSize: 11 }}
                      tickFormatter={formatChartPercent}
                    />
                    <Tooltip
                      contentStyle={{ background: "#020617", border: "1px solid #1e293b", borderRadius: 8 }}
                      labelStyle={{ color: "#cbd5e1" }}
                      formatter={(value, name) => {
                        const label = String(name);
                        if (label === "annualVolatility") return [formatChartPercent(value), "年化波動"];
                        if (label === "sharpe") {
                          const numeric = Number(value);
                          return [Number.isFinite(numeric) ? numeric.toFixed(2) : "--", "Sharpe"];
                        }
                        return [formatChartPercent(value), "年化報酬"];
                      }}
                    />
                    <Scatter
                      data={efficientFrontier.points}
                      name="候選組合"
                      fill="#475569"
                      fillOpacity={0.45}
                      isAnimationActive={false}
                    />
                    <Line
                      data={efficientFrontier.frontier}
                      type="monotone"
                      dataKey="annualReturn"
                      name="有效前緣"
                      stroke="#22d3ee"
                      strokeWidth={2.5}
                      dot={false}
                      activeDot={{ r: 4, fill: "#67e8f9" }}
                      isAnimationActive={false}
                    />
                    {efficientFrontier.selectedPoint?.annualReturn !== null &&
                    efficientFrontier.selectedPoint?.annualVolatility !== null ? (
                      <Scatter
                        data={[efficientFrontier.selectedPoint]}
                        name="AI 建議"
                        fill="#facc15"
                        isAnimationActive={false}
                      />
                    ) : null}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : null}

          <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_0.6fr] gap-4">
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
              <div className="flex items-center justify-between gap-3 mb-3">
                <p className="text-[11px] text-slate-500">財富指數曲線</p>
                <p className="text-[11px] text-slate-600 font-mono">Base 100</p>
              </div>
              <div className="h-72 w-full">
                {wealthChartData.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={wealthChartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis
                        dataKey="date"
                        minTickGap={28}
                        stroke="#64748b"
                        tick={{ fill: "#64748b", fontSize: 11 }}
                        tickFormatter={formatChartDate}
                      />
                      <YAxis
                        stroke="#64748b"
                        tick={{ fill: "#64748b", fontSize: 11 }}
                        tickFormatter={formatChartNumber}
                      />
                      <Tooltip
                        contentStyle={{ background: "#020617", border: "1px solid #1e293b", borderRadius: 8 }}
                        labelStyle={{ color: "#cbd5e1" }}
                        formatter={(value) => [formatChartNumber(value), "財富指數"]}
                      />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="#22d3ee"
                        strokeWidth={2.5}
                        dot={false}
                        activeDot={{ r: 4, fill: "#67e8f9" }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center border border-dashed border-slate-800 rounded-md text-xs text-slate-600">
                    尚無曲線資料
                  </div>
                )}
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
              <p className="text-[11px] text-slate-500 mb-3">資產統計</p>
              <div className="space-y-2">
                {(displayResult.assetStatistics ?? []).map((asset) => (
                  <div key={asset.symbol} className="border-b border-slate-900 last:border-0 pb-2 last:pb-0">
                    <p className="text-xs text-slate-200 truncate">{asset.symbol}</p>
                    <div className="mt-1 grid grid-cols-2 gap-2 text-[11px] font-mono">
                      <span className="text-emerald-300">{formatMetric(asset.annualReturn, "percent")}</span>
                      <span className="text-amber-300">{formatMetric(asset.annualVolatility, "percent")}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
            <div className="flex items-center justify-between gap-3 mb-3">
              <p className="text-[11px] text-slate-500">回撤曲線</p>
              <p className="text-[11px] text-slate-600 font-mono">Peak to trough</p>
            </div>
            <div className="h-56 w-full">
              {drawdownChartData.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={drawdownChartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis
                      dataKey="date"
                      minTickGap={28}
                      stroke="#64748b"
                      tick={{ fill: "#64748b", fontSize: 11 }}
                      tickFormatter={formatChartDate}
                    />
                    <YAxis
                      stroke="#64748b"
                      tick={{ fill: "#64748b", fontSize: 11 }}
                      tickFormatter={formatChartPercent}
                    />
                    <Tooltip
                      contentStyle={{ background: "#020617", border: "1px solid #1e293b", borderRadius: 8 }}
                      labelStyle={{ color: "#cbd5e1" }}
                      formatter={(value) => [formatChartPercent(value), "回撤"]}
                    />
                    <Line
                      type="monotone"
                      dataKey="drawdown"
                      stroke="#fb7185"
                      strokeWidth={2.5}
                      dot={false}
                      activeDot={{ r: 4, fill: "#fda4af" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center border border-dashed border-slate-800 rounded-md text-xs text-slate-600">
                  尚無回撤資料
                </div>
              )}
            </div>
          </div>

          {correlationMatrix?.symbols?.length ? (
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
              <div className="flex items-center justify-between gap-3 mb-3">
                <p className="text-[11px] text-slate-500">相關係數矩陣</p>
                <p className="text-[11px] text-slate-600 font-mono">-1.00 ~ 1.00</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] border-separate border-spacing-1 text-[11px]">
                  <thead>
                    <tr>
                      <th className="w-28 px-2 py-1 text-left font-medium text-slate-600">Asset</th>
                      {correlationMatrix.symbols.map((symbol, index) => (
                        <th key={`${symbol}-${index}`} className="max-w-[6rem] px-2 py-1 text-center font-medium text-slate-500">
                          <span title={symbol} className="block truncate">
                            {symbol}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {correlationMatrix.symbols.map((rowSymbol, rowIndex) => (
                      <tr key={`${rowSymbol}-${rowIndex}`}>
                        <th className="max-w-[8rem] px-2 py-2 text-left font-medium text-slate-300">
                          <span title={rowSymbol} className="block truncate">
                            {rowSymbol}
                          </span>
                        </th>
                        {correlationMatrix.symbols.map((columnSymbol, columnIndex) => {
                          const value = correlationMatrix.values?.[rowIndex]?.[columnIndex] ?? null;
                          return (
                            <td
                              key={`${rowSymbol}-${rowIndex}-${columnSymbol}-${columnIndex}`}
                              className={`h-9 min-w-[4rem] rounded-md border px-2 text-center align-middle font-mono ${correlationCellClass(value)}`}
                            >
                              {formatCorrelation(value)}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {optimizationResult && (
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
              <p className="text-[11px] text-slate-500 mb-2">AI 建議權重</p>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2">
                {optimizationResult.weights.map((weightRow) => (
                  <div key={weightRow.symbol} className="flex items-center justify-between gap-3 text-xs">
                    <span className="text-slate-300 truncate">{weightRow.symbol}</span>
                    <span className="text-cyan-200 font-mono">{(weightRow.weight * 100).toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="text-xs text-slate-400 font-mono">
            {displayResult.dataWindow.startDate ?? "--"} ~ {displayResult.dataWindow.endDate ?? "--"} ·{" "}
            {displayResult.dataWindow.observations} observations
          </div>
        </div>
      )}
    </section>
  );
}
