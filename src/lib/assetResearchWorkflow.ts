import type { BigQueryAssetHistoryResponse, BigQueryAssetProfileResponse } from "@/types/market";

export type QualityStatus = "strong" | "watch" | "risk" | "neutral";
export type AssetDecisionSignal = "candidate" | "watch" | "risk" | "neutral";
export type AssetComparisonSortKey =
  | "score"
  | "annualizedReturn"
  | "annualizedVolatility"
  | "maxDrawdown"
  | "riskAdjustedReturn"
  | "freshnessDays";

export type AssetComparisonRow = {
  symbol: string;
  latestDate: string | null;
  rowCount: number;
  latestPrice: number | null;
  totalReturn: number | null;
  annualizedReturn: number | null;
  annualizedVolatility: number | null;
  maxDrawdown: number | null;
  freshnessDays: number | null;
  qualityStatus: QualityStatus;
  riskAdjustedReturn: number | null;
  score: number;
  signal: AssetDecisionSignal;
  signalNote: string;
};

function csvCell(value: unknown) {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function formatCount(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value.toLocaleString("zh-TW") : "--";
}

export function formatPrice(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value.toLocaleString("zh-TW", { maximumFractionDigits: 4 }) : "--";
}

export function daysSinceDate(value?: string | null) {
  if (!value) return null;
  const time = new Date(`${value}T00:00:00`).getTime();
  if (!Number.isFinite(time)) return null;
  return Math.max(0, Math.floor((Date.now() - time) / 86400000));
}

export function freshnessStatus(days: number | null): QualityStatus {
  if (days === null) return "neutral";
  if (days <= 3) return "strong";
  if (days <= 10) return "watch";
  return "risk";
}

export function coverageStatus(count: number | undefined, strongThreshold: number, watchThreshold: number): QualityStatus {
  if (typeof count !== "number" || !Number.isFinite(count)) return "neutral";
  if (count >= strongThreshold) return "strong";
  if (count >= watchThreshold) return "watch";
  return "risk";
}

export function qualityLabel(status: QualityStatus) {
  if (status === "strong") return "正常";
  if (status === "watch") return "觀察";
  if (status === "risk") return "異常";
  return "未知";
}

export function qualityClass(status: QualityStatus) {
  if (status === "strong") return "border-emerald-500/20 bg-emerald-950/10";
  if (status === "watch") return "border-amber-500/25 bg-amber-950/10";
  if (status === "risk") return "border-rose-500/25 bg-rose-950/10";
  return "border-slate-800 bg-slate-900/60";
}

export function qualityBadgeClass(status: QualityStatus) {
  if (status === "strong") return "bg-emerald-500/15 text-emerald-200";
  if (status === "watch") return "bg-amber-500/15 text-amber-200";
  if (status === "risk") return "bg-rose-500/15 text-rose-200";
  return "bg-slate-800 text-slate-300";
}

export function decisionSignalLabel(signal: AssetDecisionSignal) {
  if (signal === "candidate") return "候選";
  if (signal === "watch") return "觀察";
  if (signal === "risk") return "風險";
  return "中性";
}

export function decisionSignalClass(signal: AssetDecisionSignal) {
  if (signal === "candidate") return "bg-emerald-500/15 text-emerald-200";
  if (signal === "watch") return "bg-amber-500/15 text-amber-200";
  if (signal === "risk") return "bg-rose-500/15 text-rose-200";
  return "bg-slate-800 text-slate-300";
}

export function comparisonRowFromProfile(profile: BigQueryAssetProfileResponse): AssetComparisonRow {
  const freshnessDays = daysSinceDate(profile.summary.latest_date);
  const missingRows = profile.summary.missing_selected_price_rows;
  const freshness = freshnessStatus(freshnessDays);
  const qualityStatus: QualityStatus =
    freshness === "risk" || missingRows > 5
      ? "risk"
      : freshness === "watch" || missingRows > 0
        ? "watch"
        : "strong";
  const annualizedReturn = profile.metrics.annualizedReturn;
  const annualizedVolatility = profile.metrics.annualizedVolatility;
  const maxDrawdown = profile.metrics.maxDrawdown;
  const returnScore = typeof annualizedReturn === "number" ? clamp(annualizedReturn * 120, -30, 35) : 0;
  const volatilityPenalty =
    typeof annualizedVolatility === "number" ? clamp(annualizedVolatility * 60, 0, 25) : 10;
  const drawdownPenalty = typeof maxDrawdown === "number" ? clamp(Math.abs(maxDrawdown) * 70, 0, 30) : 10;
  const freshnessPenalty = freshnessDays === null ? 8 : freshnessDays > 10 ? 18 : freshnessDays > 3 ? 8 : 0;
  const missingPenalty = missingRows > 5 ? 12 : missingRows > 0 ? 5 : 0;
  const score = Math.round(clamp(50 + returnScore - volatilityPenalty - drawdownPenalty - freshnessPenalty - missingPenalty, 0, 100));
  const riskAdjustedReturn =
    typeof annualizedReturn === "number" &&
    typeof annualizedVolatility === "number" &&
    annualizedVolatility > 0
      ? annualizedReturn / annualizedVolatility
      : null;
  const signal: AssetDecisionSignal =
    qualityStatus === "risk" || score < 40
      ? "risk"
      : score >= 70 && qualityStatus === "strong"
        ? "candidate"
        : score >= 55
          ? "watch"
          : "neutral";
  const signalNote =
    signal === "candidate"
      ? "報酬、風險與資料品質相對較佳"
      : signal === "watch"
        ? "具備可比性，但仍需檢查波動或資料品質"
        : signal === "risk"
          ? "資料品質或風險報酬條件偏弱"
          : "暫無明確優勢";

  return {
    symbol: profile.symbol,
    latestDate: profile.summary.latest_date,
    rowCount: profile.summary.row_count,
    latestPrice: profile.metrics.latestPrice,
    totalReturn: profile.metrics.totalReturn,
    annualizedReturn: profile.metrics.annualizedReturn,
    annualizedVolatility: profile.metrics.annualizedVolatility,
    maxDrawdown: profile.metrics.maxDrawdown,
    freshnessDays,
    qualityStatus,
    riskAdjustedReturn,
    score,
    signal,
    signalNote,
  };
}

export function assetComparisonCsv(rows: AssetComparisonRow[], priceBasis: "adjusted" | "raw") {
  const header = [
    "symbol",
    "price_basis",
    "latest_date",
    "row_count",
    "latest_price",
    "total_return",
    "annualized_return",
    "annualized_volatility",
    "max_drawdown",
    "freshness_days",
    "quality_status",
    "risk_adjusted_return",
    "score",
    "signal",
    "signal_note",
  ];
  const csvRows = rows.map((row) => [
    row.symbol,
    priceBasis,
    row.latestDate ?? "",
    row.rowCount,
    row.latestPrice ?? "",
    row.totalReturn ?? "",
    row.annualizedReturn ?? "",
    row.annualizedVolatility ?? "",
    row.maxDrawdown ?? "",
    row.freshnessDays ?? "",
    row.qualityStatus,
    row.riskAdjustedReturn ?? "",
    row.score,
    row.signal,
    row.signalNote,
  ]);

  return [header, ...csvRows].map((row) => row.map(csvCell).join(",")).join("\n");
}

export function assetProfileCsv(profile: BigQueryAssetProfileResponse) {
  const rows = [
    ["section", "date", "name", "value"],
    ["summary", "", "symbol", profile.symbol],
    ["summary", "", "price_basis", profile.priceBasis],
    ["summary", "", "first_date", profile.summary.first_date ?? ""],
    ["summary", "", "latest_date", profile.summary.latest_date ?? ""],
    ["summary", "", "row_count", profile.summary.row_count],
    ["summary", "", "selected_price_rows", profile.summary.selected_price_rows],
    ["summary", "", "missing_selected_price_rows", profile.summary.missing_selected_price_rows],
    ["summary", "", "adjusted_price_rows", profile.summary.adjusted_price_rows],
    ["summary", "", "raw_price_rows", profile.summary.raw_price_rows],
    ...Object.entries(profile.metrics).map(([key, value]) => ["metric", "", key, value ?? ""]),
    ...profile.recentPrices.map((point) => [
      "recent_price",
      point.date ?? "",
      "selected_price",
      point.selected_price ?? "",
    ]),
  ];

  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
}

function markdownPercent(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? `${(value * 100).toFixed(2)}%` : "--";
}

function markdownMetricLine(label: string, value: string) {
  return `| ${label} | ${value} |`;
}

function assetResearchDecision(profile: BigQueryAssetProfileResponse, history?: BigQueryAssetHistoryResponse | null) {
  const comparisonRow = comparisonRowFromProfile(profile);
  const historyStatus = history?.quality.status ?? "neutral";
  const maxDrawdown = history?.metrics.maxDrawdown ?? profile.metrics.maxDrawdown;
  const volatility = history?.metrics.annualizedVolatility ?? profile.metrics.annualizedVolatility;

  if (comparisonRow.signal === "risk" || historyStatus === "risk") {
    return {
      label: "暫緩",
      reason: "資料品質或風險指標進入異常區，先完成資料與風險檢查。",
    };
  }
  if (typeof maxDrawdown === "number" && Math.abs(maxDrawdown) >= 0.3) {
    return {
      label: "觀察",
      reason: "最大回撤偏大，需要壓力測試與部位上限。",
    };
  }
  if (typeof volatility === "number" && volatility >= 0.35) {
    return {
      label: "觀察",
      reason: "年化波動偏高，建議先進入 watchlist，不直接放大權重。",
    };
  }
  if (comparisonRow.signal === "candidate" && historyStatus === "strong") {
    return {
      label: "候選",
      reason: "資料品質、報酬與風險條件可進入投組比較。",
    };
  }
  return {
    label: "觀察",
    reason: "資料足以研究，但仍需和同類資產、基準與配置限制一起比較。",
  };
}

export function assetResearchReportMarkdown({
  profile,
  history,
}: {
  profile: BigQueryAssetProfileResponse;
  history?: BigQueryAssetHistoryResponse | null;
}) {
  const comparisonRow = comparisonRowFromProfile(profile);
  const decision = assetResearchDecision(profile, history);
  const qualityWarnings = history?.quality.warnings.length
    ? history.quality.warnings
    : ["目前沒有明顯資料品質阻塞項"];
  const nextActions = history?.quality.nextActions.length
    ? history.quality.nextActions
    : ["補齊歷史 drill-down 後再輸出正式研究結論"];
  const recentRows = (history?.prices ?? profile.recentPrices).slice(-10).reverse();

  return [
    `# ${profile.symbol} 單一資產研究 Memo`,
    "",
    `產出時間：${new Date().toISOString()}`,
    `價格口徑：${profile.priceBasis}`,
    "",
    "## 初步結論",
    "",
    `- 研究狀態：${decision.label}`,
    `- 判斷理由：${decision.reason}`,
    `- Watchlist 訊號：${decisionSignalLabel(comparisonRow.signal)}，${comparisonRow.signalNote}`,
    `- 綜合分數：${comparisonRow.score}`,
    "",
    "## 核心指標",
    "",
    "| 指標 | 數值 |",
    "| --- | ---: |",
    markdownMetricLine("最新價格", formatPrice(profile.metrics.latestPrice)),
    markdownMetricLine("期間報酬", markdownPercent(history?.metrics.totalReturn ?? profile.metrics.totalReturn)),
    markdownMetricLine("年化報酬", markdownPercent(history?.metrics.annualizedReturn ?? profile.metrics.annualizedReturn)),
    markdownMetricLine("年化波動", markdownPercent(history?.metrics.annualizedVolatility ?? profile.metrics.annualizedVolatility)),
    markdownMetricLine("最大回撤", markdownPercent(history?.metrics.maxDrawdown ?? profile.metrics.maxDrawdown)),
    markdownMetricLine("最佳單日", markdownPercent(history?.metrics.bestDay ?? profile.metrics.bestDay)),
    markdownMetricLine("最差單日", markdownPercent(history?.metrics.worstDay ?? profile.metrics.worstDay)),
    "",
    "## 資料品質",
    "",
    `- 主檔區間：${profile.summary.first_date ?? "--"} ~ ${profile.summary.latest_date ?? "--"}`,
    `- 主檔筆數：${formatCount(profile.summary.row_count)}`,
    `- 缺漏價格：${formatCount(profile.summary.missing_selected_price_rows)}`,
    `- 歷史品質分數：${history ? `${history.quality.score} / ${qualityLabel(history.quality.status)}` : "--"}`,
    "",
    ...qualityWarnings.map((item) => `- ${item}`),
    "",
    "## 下一步",
    "",
    ...nextActions.map((item) => `- ${item}`),
    "",
    "## 最近價格",
    "",
    "| 日期 | Selected | Daily Return |",
    "| --- | ---: | ---: |",
    ...recentRows.map((point) => (
      `| ${point.date ?? "--"} | ${formatPrice(point.selected_price)} | ${markdownPercent(point.daily_return)} |`
    )),
    "",
    "> 本 memo 用於內部研究與資料檢核，不等同交易建議。",
    "",
  ].join("\n");
}

export function parseSymbolList(value: string) {
  const seen = new Set<string>();
  return value
    .split(/[\s,，、]+/)
    .map((symbol) => symbol.trim())
    .filter(Boolean)
    .filter((symbol) => {
      const key = symbol.toUpperCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 12);
}

export function averageComparisonMetric(rows: AssetComparisonRow[], selector: (row: AssetComparisonRow) => number | null) {
  const values = rows.map(selector).filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function comparisonSortLabel(sortKey: AssetComparisonSortKey) {
  if (sortKey === "score") return "分數高到低";
  if (sortKey === "annualizedReturn") return "年化報酬高到低";
  if (sortKey === "riskAdjustedReturn") return "風險調整報酬高到低";
  if (sortKey === "annualizedVolatility") return "波動低到高";
  if (sortKey === "maxDrawdown") return "回撤低到高";
  return "資料新鮮優先";
}

export function comparisonSignalFilterLabel(signal: AssetDecisionSignal | "all") {
  return signal === "all" ? "全部" : decisionSignalLabel(signal);
}

export function sortComparisonRows(rows: AssetComparisonRow[], sortKey: AssetComparisonSortKey) {
  const sortedRows = [...rows];

  return sortedRows.sort((left, right) => {
    if (sortKey === "annualizedVolatility" || sortKey === "maxDrawdown" || sortKey === "freshnessDays") {
      const leftValue = sortKey === "maxDrawdown" ? Math.abs(left.maxDrawdown ?? Infinity) : left[sortKey] ?? Infinity;
      const rightValue = sortKey === "maxDrawdown" ? Math.abs(right.maxDrawdown ?? Infinity) : right[sortKey] ?? Infinity;
      return leftValue - rightValue;
    }

    const leftValue = left[sortKey] ?? -Infinity;
    const rightValue = right[sortKey] ?? -Infinity;
    return rightValue - leftValue;
  });
}
