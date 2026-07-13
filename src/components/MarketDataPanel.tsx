import { useEffect, useState } from "react";
import { useMarketSources } from "@/hooks/useMarketSources";
import { fetchBigQueryAssetProfile, fetchBigQueryAssets } from "@/lib/marketApi";
import {
  buildDataLicenseComplianceItems,
  dataLicenseComplianceCsv,
  type DataLicenseComplianceItem,
} from "@/lib/dataLicenseCompliance";
import {
  buildSecurityAuditItems,
  securityAuditCsv,
  type SecurityAuditItem,
} from "@/lib/securityAudit";
import {
  buildIncidentCommandItems,
  incidentCommandCsv,
  type IncidentCommandItem,
} from "@/lib/incidentCommand";
import {
  buildProductReleaseGateItems,
  productReleaseGateCsv,
  releaseStageClass,
  releaseStageLabel,
  type ProductReleaseGateItem,
} from "@/lib/productReleaseGate";
import {
  buildCustomerSuccessHealthItems,
  customerHealthStageClass,
  customerHealthStageLabel,
  customerSuccessHealthCsv,
  type CustomerSuccessHealthItem,
} from "@/lib/customerSuccessHealth";
import {
  buildRevenueForecastItems,
  revenueForecastCsv,
  revenueForecastStageClass,
  revenueForecastStageLabel,
  type RevenueForecastItem,
} from "@/lib/revenueForecast";
import type {
  BigQueryAsset,
  BigQueryAssetProfileResponse,
  BigQueryFxCurrency,
  BigQueryMarketDiagnostics,
  BigQuerySchemaCheck,
  BigQueryStaleSymbol,
  MarketSource,
  MarketSourceStatus,
} from "@/types/market";
import { BigQueryPortfolioPanel } from "./BigQueryPortfolioPanel";

type QualityStatus = "strong" | "watch" | "risk" | "neutral";
type AssetDecisionSignal = "candidate" | "watch" | "risk" | "neutral";
type AssetComparisonSortKey =
  | "score"
  | "annualizedReturn"
  | "annualizedVolatility"
  | "maxDrawdown"
  | "riskAdjustedReturn"
  | "freshnessDays";
type AllocationMode = "score" | "risk" | "equal";

type SavedWatchlistPreset = {
  id: string;
  name: string;
  symbols: string;
  priceBasis: "adjusted" | "raw";
  sortKey: AssetComparisonSortKey;
  signalFilter: AssetDecisionSignal | "all";
  minimumScore: number;
  updatedAt: string;
};

type AssetComparisonRow = {
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

type AllocationDraftRow = AssetComparisonRow & {
  allocationWeight: number;
  allocationAmount: number;
  allocationBasis: number;
  allocationCapApplied: boolean;
  allocationNote: string;
};

type AllocationRiskRow = AllocationDraftRow & {
  weightedVolatility: number;
  riskContribution: number;
};

type AllocationRiskSnapshot = {
  investedAmount: number;
  expectedAnnualReturn: number | null;
  estimatedAnnualVolatility: number | null;
  weightedMaxDrawdown: number | null;
  worstMaxDrawdown: number | null;
  stressLoss: number;
  stressedValue: number;
  riskRows: AllocationRiskRow[];
};

type RebalanceDirection = "buy" | "sell" | "hold";

type RebalanceDraftRow = {
  symbol: string;
  currentAmount: number;
  currentWeight: number;
  targetAmount: number;
  targetWeight: number;
  tradeAmount: number;
  tradeWeight: number;
  direction: RebalanceDirection;
  score: number | null;
  signal: AssetDecisionSignal | null;
  note: string;
};

type TradeTicketRow = RebalanceDraftRow & {
  ticketAmount: number;
  cashImpact: number;
  ticketNote: string;
};

type TradeBatchRow = TradeTicketRow & {
  batchNumber: number;
  batchGrossAmount: number;
  batchCashImpact: number;
  sequenceInBatch: number;
  batchNote: string;
};

type ExecutionReviewStatus = "pass" | "watch" | "block";

type ExecutionReviewItem = {
  label: string;
  status: ExecutionReviewStatus;
  value: string;
  threshold: string;
  note: string;
};

type CommitteeDecision = "approve" | "conditional" | "hold";

type DecisionAuditRecord = {
  label: string;
  value: string;
  note: string;
};

type ExecutionHandoffPriority = "high" | "medium" | "low";

type ExecutionHandoffItem = {
  owner: string;
  task: string;
  priority: ExecutionHandoffPriority;
  due: string;
  status: ExecutionReviewStatus;
  evidence: string;
  note: string;
};

type ExecutionFillRow = TradeTicketRow & {
  filledNotional: number;
  unfilledNotional: number;
  fillCompletionRate: number;
  slippageBps: number;
  commissionBps: number;
  slippageCost: number;
  commissionCost: number;
  totalCost: number;
  cashImpactAfterCost: number;
  fillStatus: ExecutionReviewStatus;
  fillNote: string;
};

type PlatformExceptionItem = {
  source: string;
  owner: string;
  item: string;
  status: ExecutionReviewStatus;
  priority: ExecutionHandoffPriority;
  due: string;
  evidence: string;
  nextAction: string;
};

type SlaEscalationTier = "critical" | "review" | "routine";

type SlaEscalationItem = {
  tier: SlaEscalationTier;
  owner: string;
  trigger: string;
  status: ExecutionReviewStatus;
  priority: ExecutionHandoffPriority;
  due: string;
  escalationPath: string;
  action: string;
};

type OperatingKriItem = {
  label: string;
  status: ExecutionReviewStatus;
  value: string;
  limit: string;
  owner: string;
  note: string;
};

type DecisionFunnelStage = {
  label: string;
  status: ExecutionReviewStatus;
  value: string;
  conversion: string;
  owner: string;
  note: string;
};

type MarketAlertEvent = {
  source: string;
  title: string;
  status: ExecutionReviewStatus;
  priority: ExecutionHandoffPriority;
  owner: string;
  evidence: string;
  action: string;
};

type DataPipelineHealthItem = {
  label: string;
  status: ExecutionReviewStatus;
  value: string;
  target: string;
  owner: string;
  action: string;
};

type DataPipelineTableSnapshot = {
  table: string;
  status: ExecutionReviewStatus;
  latestDate: string;
  rowCount: string;
  coverage: string;
  freshness: string;
  owner: string;
  action: string;
};

type DataContractItem = {
  table: string;
  layer: string;
  status: ExecutionReviewStatus;
  requiredColumns: string[];
  presentColumns: string[];
  missingColumns: string[];
  freshness: string;
  volume: string;
  owner: string;
  action: string;
};

type CoverageUniverseItem = {
  label: string;
  status: ExecutionReviewStatus;
  count: string;
  target: string;
  coverage: string;
  owner: string;
  action: string;
};

type DataRemediationItem = {
  source: string;
  item: string;
  status: ExecutionReviewStatus;
  priority: ExecutionHandoffPriority;
  owner: string;
  evidence: string;
  impact: string;
  action: string;
};

type DataLineageItem = {
  stage: string;
  node: string;
  status: ExecutionReviewStatus;
  input: string;
  output: string;
  owner: string;
  evidence: string;
  action: string;
};

type DataProductCatalogItem = {
  product: string;
  category: string;
  status: ExecutionReviewStatus;
  owner: string;
  consumer: string;
  input: string;
  output: string;
  serviceLevel: string;
  evidence: string;
  action: string;
};

type ApiServiceCatalogItem = {
  endpoint: string;
  method: "GET" | "POST";
  product: string;
  status: ExecutionReviewStatus;
  owner: string;
  consumer: string;
  input: string;
  output: string;
  serviceLevel: string;
  action: string;
};

type ApiContractBlueprintItem = {
  endpoint: string;
  method: "GET" | "POST";
  product: string;
  version: string;
  auth: string;
  requestSchema: string;
  responseSchema: string;
  stability: "stable" | "beta" | "draft";
  status: ExecutionReviewStatus;
  owner: string;
  breakingRisk: string;
  action: string;
};

type PlatformEntitlementItem = {
  role: string;
  plan: string;
  dataScope: string;
  apiAccess: string;
  tools: string;
  exportRights: string;
  approvalLimit: string;
  status: ExecutionReviewStatus;
  owner: string;
  evidence: string;
  action: string;
};

type ClientWorkspaceProvisioningItem = {
  workspace: string;
  segment: string;
  plan: string;
  seats: string;
  dataPackages: string;
  apiKeys: string;
  sso: string;
  billing: string;
  status: ExecutionReviewStatus;
  owner: string;
  evidence: string;
  action: string;
};

type UsageBillingItem = {
  workspace: string;
  plan: string;
  billingModel: string;
  seatUsage: string;
  apiUsage: string;
  exportUsage: string;
  monthlyRevenue: string;
  invoiceStatus: string;
  status: ExecutionReviewStatus;
  owner: string;
  evidence: string;
  action: string;
};

const statusMeta: Record<MarketSourceStatus, { label: string; className: string }> = {
  ready: {
    label: "可接 API",
    className: "bg-emerald-500/10 text-emerald-300 border-emerald-500/40",
  },
  needs_secret: {
    label: "需環境變數",
    className: "bg-amber-500/10 text-amber-300 border-amber-500/40",
  },
  batch_only: {
    label: "批次管線",
    className: "bg-blue-500/10 text-blue-300 border-blue-500/40",
  },
  local_only: {
    label: "本機資料",
    className: "bg-slate-500/10 text-slate-300 border-slate-500/40",
  },
};

const bigQueryEnvironmentVars = [
  { key: "BIGQUERY_PROJECT_ID", value: "fund-war-room", kind: "plain" },
  { key: "BIGQUERY_DATASET", value: "fund_database", kind: "plain" },
  { key: "BIGQUERY_PRICE_TABLE", value: "daily_prices", kind: "plain" },
  { key: "BIGQUERY_FX_TABLE", value: "daily_fx", kind: "plain" },
  { key: "GCP_SERVICE_ACCOUNT_JSON", value: "Service account JSON", kind: "secret" },
];
const watchlistPresetStorageKey = "wealth-dashboard.bigqueryWatchlistPresets";

function formatCount(value: number | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value.toLocaleString("zh-TW") : "--";
}

function formatPrice(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value.toLocaleString("zh-TW", { maximumFractionDigits: 4 }) : "--";
}

function formatPercent(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? `${(value * 100).toFixed(2)}%` : "--";
}

function formatCurrency(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value)
    ? value.toLocaleString("zh-TW", { maximumFractionDigits: 0 })
    : "--";
}

function daysSinceDate(value?: string | null) {
  if (!value) return null;
  const time = new Date(`${value}T00:00:00`).getTime();
  if (!Number.isFinite(time)) return null;
  return Math.max(0, Math.floor((Date.now() - time) / 86400000));
}

function freshnessStatus(days: number | null): QualityStatus {
  if (days === null) return "neutral";
  if (days <= 3) return "strong";
  if (days <= 10) return "watch";
  return "risk";
}

function coverageStatus(count: number | undefined, strongThreshold: number, watchThreshold: number): QualityStatus {
  if (typeof count !== "number" || !Number.isFinite(count)) return "neutral";
  if (count >= strongThreshold) return "strong";
  if (count >= watchThreshold) return "watch";
  return "risk";
}

function qualityLabel(status: QualityStatus) {
  if (status === "strong") return "正常";
  if (status === "watch") return "觀察";
  if (status === "risk") return "異常";
  return "未知";
}

function qualityClass(status: QualityStatus) {
  if (status === "strong") return "border-emerald-500/20 bg-emerald-950/10";
  if (status === "watch") return "border-amber-500/25 bg-amber-950/10";
  if (status === "risk") return "border-rose-500/25 bg-rose-950/10";
  return "border-slate-800 bg-slate-900/60";
}

function qualityBadgeClass(status: QualityStatus) {
  if (status === "strong") return "bg-emerald-500/15 text-emerald-200";
  if (status === "watch") return "bg-amber-500/15 text-amber-200";
  if (status === "risk") return "bg-rose-500/15 text-rose-200";
  return "bg-slate-800 text-slate-300";
}

function decisionSignalLabel(signal: AssetDecisionSignal) {
  if (signal === "candidate") return "候選";
  if (signal === "watch") return "觀察";
  if (signal === "risk") return "風險";
  return "中性";
}

function decisionSignalClass(signal: AssetDecisionSignal) {
  if (signal === "candidate") return "bg-emerald-500/15 text-emerald-200";
  if (signal === "watch") return "bg-amber-500/15 text-amber-200";
  if (signal === "risk") return "bg-rose-500/15 text-rose-200";
  return "bg-slate-800 text-slate-300";
}

function csvCell(value: unknown) {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function markdownCell(value: unknown) {
  if (value === null || value === undefined || value === "") return "--";
  return String(value).replaceAll("|", "/").replaceAll("\n", " ");
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

function loadWatchlistPresetsFromStorage() {
  if (typeof window === "undefined") return [];

  try {
    const parsed = JSON.parse(window.localStorage.getItem(watchlistPresetStorageKey) || "[]");
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((item): item is SavedWatchlistPreset => {
      if (!item || typeof item !== "object") return false;
      const preset = item as Partial<SavedWatchlistPreset>;
      return (
        typeof preset.id === "string" &&
        typeof preset.name === "string" &&
        typeof preset.symbols === "string" &&
        typeof preset.updatedAt === "string"
      );
    });
  } catch {
    return [];
  }
}

function writeWatchlistPresetsToStorage(presets: SavedWatchlistPreset[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(watchlistPresetStorageKey, JSON.stringify(presets));
}

function assetProfileCsv(profile: BigQueryAssetProfileResponse) {
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

function parseSymbolList(value: string) {
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

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function comparisonRowFromProfile(profile: BigQueryAssetProfileResponse): AssetComparisonRow {
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

function assetComparisonCsv(rows: AssetComparisonRow[], priceBasis: "adjusted" | "raw") {
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

function allocationModeLabel(mode: AllocationMode) {
  if (mode === "score") return "分數加權";
  if (mode === "risk") return "風險調整";
  return "等權重";
}

function allocationBasisForRow(row: AssetComparisonRow, mode: AllocationMode) {
  if (row.signal === "risk" || row.qualityStatus === "risk" || row.score < 40) return 0;
  if (mode === "equal") return 1;
  if (mode === "score") return Math.max(0, row.score - 35);

  const volatility = typeof row.annualizedVolatility === "number" && row.annualizedVolatility > 0 ? row.annualizedVolatility : 0.25;
  const drawdownPenalty = typeof row.maxDrawdown === "number" ? 1 + Math.abs(row.maxDrawdown) : 1.2;
  return Math.max(0, row.score - 35) / volatility / drawdownPenalty;
}

function allocationNoteForRow(row: AssetComparisonRow, mode: AllocationMode, capApplied: boolean) {
  if (row.signal === "risk" || row.qualityStatus === "risk") return "排除：資料品質或風險訊號偏弱";
  if (row.score < 40) return "排除：分數低於配置門檻";
  if (capApplied) return "納入：達單檔上限，超額權重已重新分配";
  if (mode === "risk") return "納入：分數經波動與回撤調整";
  if (mode === "score") return "納入：依 Watchlist 分數配置";
  return "納入：符合門檻後等權配置";
}

function cappedAllocationWeights(basisValues: number[], maximumWeight: number) {
  const activeIndexes = basisValues
    .map((basis, index) => ({ basis, index }))
    .filter((item) => item.basis > 0)
    .map((item) => item.index);
  const weights = basisValues.map(() => 0);
  if (!activeIndexes.length) return weights;

  const effectiveCap = Math.max(Math.min(Math.max(maximumWeight, 0.01), 1), 1 / activeIndexes.length);
  let remainingIndexes = [...activeIndexes];
  let remainingWeight = 1;

  while (remainingIndexes.length && remainingWeight > 0.000001) {
    const totalBasis = remainingIndexes.reduce((sum, index) => sum + basisValues[index], 0);
    if (totalBasis <= 0) {
      const equalWeight = remainingWeight / remainingIndexes.length;
      remainingIndexes.forEach((index) => {
        weights[index] = Math.min(effectiveCap, equalWeight);
      });
      break;
    }

    const cappedIndexes = remainingIndexes.filter((index) => {
      const proposedWeight = (remainingWeight * basisValues[index]) / totalBasis;
      return proposedWeight >= effectiveCap;
    });

    if (!cappedIndexes.length) {
      remainingIndexes.forEach((index) => {
        weights[index] = (remainingWeight * basisValues[index]) / totalBasis;
      });
      break;
    }

    cappedIndexes.forEach((index) => {
      weights[index] = effectiveCap;
      remainingWeight -= effectiveCap;
    });
    remainingIndexes = remainingIndexes.filter((index) => !cappedIndexes.includes(index));
  }

  return weights;
}

function allocationDraftRows(rows: AssetComparisonRow[], mode: AllocationMode, capital: number, maximumWeight: number): AllocationDraftRow[] {
  const positiveRows = rows.map((row) => ({ row, basis: allocationBasisForRow(row, mode) }));
  const allocationWeights = cappedAllocationWeights(
    positiveRows.map((item) => item.basis),
    maximumWeight,
  );
  const effectiveCap = Math.max(
    Math.min(Math.max(maximumWeight, 0.01), 1),
    positiveRows.filter((item) => item.basis > 0).length ? 1 / positiveRows.filter((item) => item.basis > 0).length : 0,
  );

  return positiveRows
    .map(({ row, basis }, index) => {
      const allocationWeight = allocationWeights[index] ?? 0;
      const allocationCapApplied = allocationWeight > 0 && allocationWeight >= effectiveCap - 0.000001;
      return {
        ...row,
        allocationWeight,
        allocationAmount: allocationWeight * Math.max(0, capital),
        allocationBasis: basis,
        allocationCapApplied,
        allocationNote: allocationNoteForRow(row, mode, allocationCapApplied),
      };
    })
    .sort((left, right) => right.allocationWeight - left.allocationWeight || right.score - left.score);
}

function allocationDraftCsv(rows: AllocationDraftRow[], mode: AllocationMode, capital: number, priceBasis: "adjusted" | "raw", maximumWeight: number) {
  const header = [
    "symbol",
    "price_basis",
    "allocation_mode",
    "model_capital",
    "maximum_weight",
    "allocation_weight",
    "allocation_amount",
    "allocation_cap_applied",
    "score",
    "signal",
    "quality_status",
    "annualized_return",
    "annualized_volatility",
    "max_drawdown",
    "risk_adjusted_return",
    "latest_date",
    "allocation_note",
  ];
  const csvRows = rows.map((row) => [
    row.symbol,
    priceBasis,
    mode,
    capital,
    maximumWeight,
    row.allocationWeight,
    row.allocationAmount,
    row.allocationCapApplied,
    row.score,
    row.signal,
    row.qualityStatus,
    row.annualizedReturn ?? "",
    row.annualizedVolatility ?? "",
    row.maxDrawdown ?? "",
    row.riskAdjustedReturn ?? "",
    row.latestDate ?? "",
    row.allocationNote,
  ]);

  return [header, ...csvRows].map((row) => row.map(csvCell).join(",")).join("\n");
}

function allocationRiskRows(rows: AllocationDraftRow[]) {
  const riskRows = rows.map((row) => ({
    ...row,
    weightedVolatility: row.allocationWeight * (row.annualizedVolatility ?? 0),
    riskContribution: 0,
  }));
  const totalWeightedVolatility = riskRows.reduce((sum, row) => sum + row.weightedVolatility, 0);

  return riskRows
    .map((row) => ({
      ...row,
      riskContribution: totalWeightedVolatility > 0 ? row.weightedVolatility / totalWeightedVolatility : 0,
    }))
    .sort((left, right) => right.riskContribution - left.riskContribution || right.allocationWeight - left.allocationWeight);
}

function weightedAllocationMetric(rows: AllocationDraftRow[], selector: (row: AllocationDraftRow) => number | null) {
  const validRows = rows.filter((row) => typeof selector(row) === "number" && Number.isFinite(selector(row) as number));
  if (!validRows.length) return null;
  return validRows.reduce((sum, row) => sum + row.allocationWeight * (selector(row) as number), 0);
}

function allocationRiskSnapshot(rows: AllocationDraftRow[], stressShockPercent: number): AllocationRiskSnapshot {
  const investedAmount = rows.reduce((sum, row) => sum + row.allocationAmount, 0);
  const stressRate = stressShockPercent / 100;
  const maxDrawdownValues = rows
    .map((row) => row.maxDrawdown)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));

  return {
    investedAmount,
    expectedAnnualReturn: weightedAllocationMetric(rows, (row) => row.annualizedReturn),
    estimatedAnnualVolatility: weightedAllocationMetric(rows, (row) => row.annualizedVolatility),
    weightedMaxDrawdown: weightedAllocationMetric(rows, (row) => row.maxDrawdown),
    worstMaxDrawdown: maxDrawdownValues.length ? Math.min(...maxDrawdownValues) : null,
    stressLoss: investedAmount * stressRate,
    stressedValue: investedAmount * (1 + stressRate),
    riskRows: allocationRiskRows(rows),
  };
}

function allocationRiskCsv(snapshot: AllocationRiskSnapshot, stressShockPercent: number) {
  const summaryRows = [
    ["summary", "invested_amount", snapshot.investedAmount, "", "", "", "", "", "", "", "", ""],
    ["summary", "expected_annual_return", snapshot.expectedAnnualReturn ?? "", "", "", "", "", "", "", "", "", ""],
    ["summary", "estimated_annual_volatility", snapshot.estimatedAnnualVolatility ?? "", "", "", "", "", "", "", "", "", ""],
    ["summary", "weighted_max_drawdown", snapshot.weightedMaxDrawdown ?? "", "", "", "", "", "", "", "", "", ""],
    ["summary", "worst_asset_drawdown", snapshot.worstMaxDrawdown ?? "", "", "", "", "", "", "", "", "", ""],
    ["summary", "stress_shock_percent", stressShockPercent, "", "", "", "", "", "", "", "", ""],
    ["summary", "stress_loss", snapshot.stressLoss, "", "", "", "", "", "", "", "", ""],
    ["summary", "stressed_value", snapshot.stressedValue, "", "", "", "", "", "", "", "", ""],
  ];
  const riskRows = snapshot.riskRows.map((row) => [
    "risk_budget",
    "asset",
    "",
    row.symbol,
    row.allocationWeight,
    row.allocationAmount,
    row.annualizedVolatility ?? "",
    row.weightedVolatility,
    row.riskContribution,
    row.maxDrawdown ?? "",
    row.score,
    row.signal,
  ]);

  return [
    ["section", "name", "value", "symbol", "allocation_weight", "allocation_amount", "annualized_volatility", "weighted_volatility", "risk_contribution", "max_drawdown", "score", "signal"],
    ...summaryRows,
    ...riskRows,
  ]
    .map((row) => row.map(csvCell).join(","))
    .join("\n");
}

function parseCurrentHoldings(value: string) {
  const holdings = new Map<string, number>();

  value.split(/\n+/).forEach((line) => {
    const cleanLine = line.trim();
    if (!cleanLine) return;

    const match = cleanLine.match(/^([^\s,，]+)[\s,，]+(.+)$/);
    if (!match) return;

    const symbol = match[1].trim().toUpperCase();
    const amount = Number(match[2].replace(/[,\s，]/g, ""));
    if (!symbol || !Number.isFinite(amount)) return;

    holdings.set(symbol, (holdings.get(symbol) ?? 0) + amount);
  });

  return holdings;
}

function rebalanceDirectionLabel(direction: RebalanceDirection) {
  if (direction === "buy") return "買入";
  if (direction === "sell") return "賣出";
  return "不動";
}

function rebalanceDirectionClass(direction: RebalanceDirection) {
  if (direction === "buy") return "bg-emerald-500/15 text-emerald-200";
  if (direction === "sell") return "bg-rose-500/15 text-rose-200";
  return "bg-slate-800 text-slate-300";
}

function rebalanceDraftRows(
  allocationRows: AllocationDraftRow[],
  currentHoldingsText: string,
  driftThreshold: number,
): RebalanceDraftRow[] {
  const currentHoldings = parseCurrentHoldings(currentHoldingsText);
  if (!currentHoldings.size) return [];

  const allocationBySymbol = new Map(allocationRows.map((row) => [row.symbol.toUpperCase(), row]));
  const symbols = Array.from(new Set([...allocationRows.map((row) => row.symbol.toUpperCase()), ...currentHoldings.keys()]));
  const currentTotal = Array.from(currentHoldings.values()).reduce((sum, amount) => sum + amount, 0);
  const targetTotal = allocationRows.reduce((sum, row) => sum + row.allocationAmount, 0);

  return symbols
    .map((symbol) => {
      const allocation = allocationBySymbol.get(symbol);
      const currentAmount = currentHoldings.get(symbol) ?? 0;
      const targetAmount = allocation?.allocationAmount ?? 0;
      const currentWeight = currentTotal > 0 ? currentAmount / currentTotal : 0;
      const targetWeight = allocation?.allocationWeight ?? 0;
      const tradeAmount = targetAmount - currentAmount;
      const tradeWeight = targetWeight - currentWeight;
      const direction: RebalanceDirection =
        Math.abs(tradeWeight) < driftThreshold ? "hold" : tradeAmount > 0 ? "buy" : "sell";

      return {
        symbol,
        currentAmount,
        currentWeight,
        targetAmount,
        targetWeight,
        tradeAmount,
        tradeWeight,
        direction,
        score: allocation?.score ?? null,
        signal: allocation?.signal ?? null,
        note:
          allocation && allocation.allocationWeight > 0
            ? "依模型目標權重再平衡"
            : "不在模型配置內，目標權重為 0",
      };
    })
    .sort((left, right) => Math.abs(right.tradeAmount) - Math.abs(left.tradeAmount));
}

function rebalanceDraftCsv(rows: RebalanceDraftRow[], driftThreshold: number) {
  const header = [
    "symbol",
    "current_amount",
    "current_weight",
    "target_amount",
    "target_weight",
    "trade_amount",
    "trade_weight",
    "direction",
    "drift_threshold",
    "score",
    "signal",
    "note",
  ];
  const csvRows = rows.map((row) => [
    row.symbol,
    row.currentAmount,
    row.currentWeight,
    row.targetAmount,
    row.targetWeight,
    row.tradeAmount,
    row.tradeWeight,
    row.direction,
    driftThreshold,
    row.score ?? "",
    row.signal ?? "",
    row.note,
  ]);

  return [header, ...csvRows].map((row) => row.map(csvCell).join(",")).join("\n");
}

function tradeTicketRows(rows: RebalanceDraftRow[], minimumTradeAmount: number): TradeTicketRow[] {
  return rows
    .filter((row) => row.direction !== "hold")
    .map((row) => {
      const ticketAmount = Math.abs(row.tradeAmount);
      const isBelowMinimum = ticketAmount < minimumTradeAmount;
      return {
        ...row,
        ticketAmount,
        cashImpact: row.direction === "buy" ? -ticketAmount : ticketAmount,
        ticketNote: isBelowMinimum ? "低於最小交易金額，暫不執行" : "可列入交易清單",
      };
    })
    .filter((row) => row.ticketAmount >= minimumTradeAmount)
    .sort((left, right) => Math.abs(right.cashImpact) - Math.abs(left.cashImpact));
}

function tradeTicketCsv(rows: TradeTicketRow[], minimumTradeAmount: number) {
  const header = [
    "symbol",
    "direction",
    "ticket_amount",
    "cash_impact",
    "current_amount",
    "target_amount",
    "trade_weight",
    "minimum_trade_amount",
    "score",
    "signal",
    "note",
  ];
  const csvRows = rows.map((row) => [
    row.symbol,
    row.direction,
    row.ticketAmount,
    row.cashImpact,
    row.currentAmount,
    row.targetAmount,
    row.tradeWeight,
    minimumTradeAmount,
    row.score ?? "",
    row.signal ?? "",
    row.ticketNote,
  ]);

  return [header, ...csvRows].map((row) => row.map(csvCell).join(",")).join("\n");
}

function tradeBatchRows(
  tickets: TradeTicketRow[],
  maximumBatchAmount: number,
  maximumTicketsPerBatch: number,
): TradeBatchRow[] {
  const cleanMaximumBatchAmount = Math.max(0, maximumBatchAmount);
  const cleanMaximumTicketsPerBatch = Math.max(1, Math.floor(maximumTicketsPerBatch));
  const batches: TradeTicketRow[][] = [];

  tickets.forEach((ticket) => {
    const currentBatch = batches[batches.length - 1];
    const currentGrossAmount = currentBatch?.reduce((sum, row) => sum + row.ticketAmount, 0) ?? 0;
    const shouldStartNewBatch = Boolean(
      currentBatch?.length &&
        (currentBatch.length >= cleanMaximumTicketsPerBatch ||
          (cleanMaximumBatchAmount > 0 && currentGrossAmount + ticket.ticketAmount > cleanMaximumBatchAmount)),
    );

    if (!currentBatch || shouldStartNewBatch) {
      batches.push([ticket]);
      return;
    }

    currentBatch.push(ticket);
  });

  return batches.flatMap((batch, batchIndex) => {
    const batchGrossAmount = batch.reduce((sum, row) => sum + row.ticketAmount, 0);
    const batchCashImpact = batch.reduce((sum, row) => sum + row.cashImpact, 0);
    const batchNote =
      cleanMaximumBatchAmount > 0 && batchGrossAmount > cleanMaximumBatchAmount
        ? "單筆交易已超過批次金額上限，需人工確認流動性"
        : "依交易金額與筆數上限分批";

    return batch.map((row, rowIndex) => ({
      ...row,
      batchNumber: batchIndex + 1,
      batchGrossAmount,
      batchCashImpact,
      sequenceInBatch: rowIndex + 1,
      batchNote,
    }));
  });
}

function tradeBatchCsv(rows: TradeBatchRow[], maximumBatchAmount: number, maximumTicketsPerBatch: number) {
  const header = [
    "batch_number",
    "sequence_in_batch",
    "symbol",
    "direction",
    "ticket_amount",
    "cash_impact",
    "batch_gross_amount",
    "batch_cash_impact",
    "maximum_batch_amount",
    "maximum_tickets_per_batch",
    "trade_weight",
    "score",
    "note",
  ];
  const csvRows = rows.map((row) => [
    row.batchNumber,
    row.sequenceInBatch,
    row.symbol,
    row.direction,
    row.ticketAmount,
    row.cashImpact,
    row.batchGrossAmount,
    row.batchCashImpact,
    maximumBatchAmount,
    maximumTicketsPerBatch,
    row.tradeWeight,
    row.score ?? "",
    row.batchNote,
  ]);

  return [header, ...csvRows].map((row) => row.map(csvCell).join(",")).join("\n");
}

function executionReviewLabel(status: ExecutionReviewStatus) {
  if (status === "pass") return "通過";
  if (status === "watch") return "觀察";
  return "暫停";
}

function executionReviewBadgeClass(status: ExecutionReviewStatus) {
  if (status === "pass") return "bg-emerald-500/15 text-emerald-200";
  if (status === "watch") return "bg-amber-500/15 text-amber-200";
  return "bg-rose-500/15 text-rose-200";
}

function executionReviewRowClass(status: ExecutionReviewStatus) {
  if (status === "pass") return "border-emerald-500/15 bg-emerald-950/10";
  if (status === "watch") return "border-amber-500/20 bg-amber-950/10";
  return "border-rose-500/20 bg-rose-950/10";
}

function finiteValues(values: Array<number | null | undefined>) {
  return values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
}

function minimumFiniteValue(values: Array<number | null | undefined>) {
  const cleanValues = finiteValues(values);
  return cleanValues.length ? Math.min(...cleanValues) : null;
}

function maximumFiniteValue(values: Array<number | null | undefined>) {
  const cleanValues = finiteValues(values);
  return cleanValues.length ? Math.max(...cleanValues) : null;
}

function tradeExecutionReviewItems({
  tradeTickets,
  activeTrades,
  allocationCapital,
  priceFreshnessDays,
  allocationRisk,
  skippedTradeCount,
}: {
  tradeTickets: TradeTicketRow[];
  activeTrades: RebalanceDraftRow[];
  allocationCapital: number;
  priceFreshnessDays: number | null;
  allocationRisk: AllocationRiskSnapshot;
  skippedTradeCount: number;
}): ExecutionReviewItem[] {
  const activeCount = activeTrades.length;
  const ticketCount = tradeTickets.length;
  const executableCoverage = activeCount ? ticketCount / activeCount : null;
  const netCash = tradeTickets.reduce((sum, row) => sum + row.cashImpact, 0);
  const maxTicketAmount = tradeTickets.reduce((maxValue, row) => Math.max(maxValue, row.ticketAmount), 0);
  const netCashRatio = allocationCapital > 0 ? Math.abs(netCash) / allocationCapital : null;
  const maxTicketRatio = allocationCapital > 0 ? maxTicketAmount / allocationCapital : null;
  const minScore = minimumFiniteValue(tradeTickets.map((row) => row.score));
  const stressLossRatio = allocationRisk.investedAmount > 0 ? Math.abs(allocationRisk.stressLoss) / allocationRisk.investedAmount : null;
  const coverageReviewStatus: ExecutionReviewStatus =
    activeCount === 0 ? "watch" : ticketCount === 0 ? "block" : skippedTradeCount > 0 ? "watch" : "pass";
  const cashReviewStatus: ExecutionReviewStatus =
    netCashRatio === null ? "watch" : netCashRatio <= 0.15 ? "pass" : netCashRatio <= 0.3 ? "watch" : "block";
  const concentrationReviewStatus: ExecutionReviewStatus =
    maxTicketRatio === null ? "watch" : maxTicketRatio <= 0.2 ? "pass" : maxTicketRatio <= 0.35 ? "watch" : "block";
  const freshnessReviewStatus: ExecutionReviewStatus =
    priceFreshnessDays === null ? "watch" : priceFreshnessDays <= 3 ? "pass" : priceFreshnessDays <= 10 ? "watch" : "block";
  const scoreReviewStatus: ExecutionReviewStatus =
    minScore === null ? "watch" : minScore >= 55 ? "pass" : minScore >= 45 ? "watch" : "block";
  const stressReviewStatus: ExecutionReviewStatus =
    stressLossRatio === null ? "watch" : stressLossRatio <= 0.12 ? "pass" : stressLossRatio <= 0.25 ? "watch" : "block";

  return [
    {
      label: "交易覆蓋率",
      status: coverageReviewStatus,
      value: executableCoverage === null ? "--" : `${ticketCount}/${activeCount} (${formatPercent(executableCoverage)})`,
      threshold: "可執行交易不得為 0",
      note:
        activeCount === 0
          ? "尚未形成需交易項目"
          : skippedTradeCount > 0
            ? "部分交易低於最小交易金額，需人工決定是否合併或暫緩"
            : "所有需交易項目都已進入執行清單",
    },
    {
      label: "現金淨流量",
      status: cashReviewStatus,
      value: `${formatCurrency(netCash)} / ${formatPercent(netCashRatio)}`,
      threshold: "低於模型本金 15% 為佳",
      note: netCash < 0 ? "本次交易需要淨投入現金" : netCash > 0 ? "本次交易會釋放現金" : "買賣金額大致平衡",
    },
    {
      label: "最大單筆交易",
      status: concentrationReviewStatus,
      value: `${formatCurrency(maxTicketAmount)} / ${formatPercent(maxTicketRatio)}`,
      threshold: "單筆低於模型本金 20% 為佳",
      note: "避免單一商品交易主導整批調倉",
    },
    {
      label: "價格資料新鮮度",
      status: freshnessReviewStatus,
      value: priceFreshnessDays === null ? "--" : `${priceFreshnessDays} 天`,
      threshold: "3 天內通過，10 天內觀察",
      note: "交易前應確認 BigQuery daily_prices 已更新",
    },
    {
      label: "最低模型分數",
      status: scoreReviewStatus,
      value: minScore === null ? "--" : String(minScore),
      threshold: "55 分以上通過，45 分以下暫停",
      note: "避免低分商品被動進入交易單",
    },
    {
      label: "壓力損失比例",
      status: stressReviewStatus,
      value: `${formatCurrency(allocationRisk.stressLoss)} / ${formatPercent(stressLossRatio)}`,
      threshold: "低於 12% 通過，25% 以上暫停",
      note: "使用目前配置草稿的壓力情境估算",
    },
  ];
}

function executionReviewCsv(rows: ExecutionReviewItem[]) {
  const header = ["label", "status", "value", "threshold", "note"];
  const csvRows = rows.map((row) => [
    row.label,
    executionReviewLabel(row.status),
    row.value,
    row.threshold,
    row.note,
  ]);

  return [header, ...csvRows].map((row) => row.map(csvCell).join(",")).join("\n");
}

function tradeMonitoringRuleItems({
  tradeTickets,
  tradeBatches,
  activeTrades,
  allocationCapital,
  allocationRisk,
  priceFreshnessDays,
  skippedTradeCount,
  monitoringHorizonDays,
  monitoringDrawdownAlertPercent,
}: {
  tradeTickets: TradeTicketRow[];
  tradeBatches: TradeBatchRow[];
  activeTrades: RebalanceDraftRow[];
  allocationCapital: number;
  allocationRisk: AllocationRiskSnapshot;
  priceFreshnessDays: number | null;
  skippedTradeCount: number;
  monitoringHorizonDays: number;
  monitoringDrawdownAlertPercent: number;
}): ExecutionReviewItem[] {
  const tradeSymbols = new Set(tradeTickets.map((row) => row.symbol));
  const skippedTrades = activeTrades.filter((row) => !tradeSymbols.has(row.symbol));
  const maxSkippedDrift = maximumFiniteValue(skippedTrades.map((row) => Math.abs(row.tradeWeight)));
  const minTradeScore = minimumFiniteValue(tradeTickets.map((row) => row.score));
  const firstBatch = tradeBatches.find((row) => row.batchNumber === 1);
  const firstBatchCashRatio = allocationCapital > 0 && firstBatch ? Math.abs(firstBatch.batchCashImpact) / allocationCapital : null;
  const maxBatchGross = maximumFiniteValue(tradeBatches.map((row) => row.batchGrossAmount));
  const maxBatchGrossRatio = allocationCapital > 0 && maxBatchGross !== null ? maxBatchGross / allocationCapital : null;
  const drawdownLimit = -Math.max(0.01, Math.abs(monitoringDrawdownAlertPercent) / 100);
  const weightedDrawdown = allocationRisk.weightedMaxDrawdown;
  const drawdownWatchLimit = drawdownLimit * 0.75;
  const priceStatus: ExecutionReviewStatus =
    priceFreshnessDays === null ? "watch" : priceFreshnessDays <= 3 ? "pass" : priceFreshnessDays <= 10 ? "watch" : "block";
  const skippedStatus: ExecutionReviewStatus =
    skippedTradeCount === 0 ? "pass" : skippedTradeCount <= 2 ? "watch" : "block";
  const firstBatchCashStatus: ExecutionReviewStatus =
    firstBatchCashRatio === null ? "watch" : firstBatchCashRatio <= 0.1 ? "pass" : firstBatchCashRatio <= 0.2 ? "watch" : "block";
  const batchSizeStatus: ExecutionReviewStatus =
    maxBatchGrossRatio === null ? "watch" : maxBatchGrossRatio <= 0.2 ? "pass" : maxBatchGrossRatio <= 0.35 ? "watch" : "block";
  const scoreStatus: ExecutionReviewStatus =
    minTradeScore === null ? "watch" : minTradeScore >= 55 ? "pass" : minTradeScore >= 45 ? "watch" : "block";
  const drawdownStatus: ExecutionReviewStatus =
    weightedDrawdown === null ? "watch" : weightedDrawdown <= drawdownLimit ? "block" : weightedDrawdown <= drawdownWatchLimit ? "watch" : "pass";

  return [
    {
      label: `T+${monitoringHorizonDays} 價格更新`,
      status: priceStatus,
      value: priceFreshnessDays === null ? "--" : `${priceFreshnessDays} 天`,
      threshold: "交易後必須確認 daily_prices 更新",
      note: priceStatus === "pass" ? "資料可支援交易後追蹤" : "先補齊價格更新，再檢查交易後偏離",
    },
    {
      label: "未執行偏離",
      status: skippedStatus,
      value: `${Math.max(0, skippedTradeCount)} 檔 / ${formatPercent(maxSkippedDrift)}`,
      threshold: "低於最小交易金額的偏離需定期回看",
      note: skippedTradeCount ? "下次再平衡前先檢查這些殘留偏離" : "本輪沒有殘留未執行交易",
    },
    {
      label: "首批現金壓力",
      status: firstBatchCashStatus,
      value: `${formatCurrency(firstBatch?.batchCashImpact)} / ${formatPercent(firstBatchCashRatio)}`,
      threshold: "首批現金影響低於模型本金 10% 為佳",
      note: firstBatch?.batchCashImpact && firstBatch.batchCashImpact < 0 ? "需確認現金來源與入金時間" : "首批不需要明顯額外現金",
    },
    {
      label: "批次規模",
      status: batchSizeStatus,
      value: `${formatCurrency(maxBatchGross)} / ${formatPercent(maxBatchGrossRatio)}`,
      threshold: "最大單批低於模型本金 20% 為佳",
      note: batchSizeStatus === "block" ? "建議再降低單批金額上限" : "批次規模可作為執行節奏參考",
    },
    {
      label: "低分交易覆核",
      status: scoreStatus,
      value: minTradeScore === null ? "--" : String(minTradeScore),
      threshold: "最低分數 55 以上較適合直接執行",
      note: scoreStatus === "pass" ? "交易清單未包含明顯低分標的" : "低分標的應先人工確認理由",
    },
    {
      label: "回撤警戒",
      status: drawdownStatus,
      value: `${formatPercent(weightedDrawdown)} / ${formatPercent(drawdownLimit)}`,
      threshold: "超過設定回撤警戒需重新檢查配置",
      note: "以配置草稿的加權最大回撤作為交易後監控基準",
    },
  ];
}

function investmentPolicyLimitItems({
  allocationRows,
  allocationRisk,
  tradeTickets,
  allocationCapital,
  priceFreshnessDays,
  policyMaxSingleWeightPercent,
  policyMaxVolatilityPercent,
  policyMaxDrawdownPercent,
  policyMinimumScore,
}: {
  allocationRows: AllocationDraftRow[];
  allocationRisk: AllocationRiskSnapshot;
  tradeTickets: TradeTicketRow[];
  allocationCapital: number;
  priceFreshnessDays: number | null;
  policyMaxSingleWeightPercent: number;
  policyMaxVolatilityPercent: number;
  policyMaxDrawdownPercent: number;
  policyMinimumScore: number;
}): ExecutionReviewItem[] {
  const maxSingleWeight = Math.max(0, policyMaxSingleWeightPercent) / 100;
  const maxVolatility = Math.max(0, policyMaxVolatilityPercent) / 100;
  const drawdownLimit = -Math.max(0.01, Math.abs(policyMaxDrawdownPercent) / 100);
  const maxWeight = maximumFiniteValue(allocationRows.map((row) => row.allocationWeight));
  const maxWeightRow = allocationRows.find((row) => row.allocationWeight === maxWeight);
  const minScore = minimumFiniteValue(allocationRows.map((row) => row.score));
  const grossTradeAmount = tradeTickets.reduce((sum, row) => sum + row.ticketAmount, 0);
  const grossTradeRatio = allocationCapital > 0 ? grossTradeAmount / allocationCapital : null;
  const volatility = allocationRisk.estimatedAnnualVolatility;
  const weightedDrawdown = allocationRisk.weightedMaxDrawdown;
  const weightStatus: ExecutionReviewStatus =
    maxWeight === null ? "watch" : maxWeight <= maxSingleWeight ? "pass" : maxWeight <= maxSingleWeight * 1.15 ? "watch" : "block";
  const volatilityStatus: ExecutionReviewStatus =
    volatility === null ? "watch" : volatility <= maxVolatility ? "pass" : volatility <= maxVolatility * 1.2 ? "watch" : "block";
  const drawdownStatus: ExecutionReviewStatus =
    weightedDrawdown === null ? "watch" : weightedDrawdown >= drawdownLimit ? "pass" : weightedDrawdown >= drawdownLimit * 1.15 ? "watch" : "block";
  const scoreStatus: ExecutionReviewStatus =
    minScore === null ? "watch" : minScore >= policyMinimumScore ? "pass" : minScore >= policyMinimumScore - 5 ? "watch" : "block";
  const turnoverStatus: ExecutionReviewStatus =
    grossTradeRatio === null ? "watch" : grossTradeRatio <= 0.5 ? "pass" : grossTradeRatio <= 0.8 ? "watch" : "block";
  const freshnessStatusValue: ExecutionReviewStatus =
    priceFreshnessDays === null ? "watch" : priceFreshnessDays <= 3 ? "pass" : priceFreshnessDays <= 10 ? "watch" : "block";

  return [
    {
      label: "單檔權重上限",
      status: weightStatus,
      value: `${maxWeightRow?.symbol ?? "--"} / ${formatPercent(maxWeight)}`,
      threshold: `不得高於 ${formatPercent(maxSingleWeight)}`,
      note: weightStatus === "block" ? "單檔權重超出政策限制，需重跑配置或降低上限" : "檢查模型配置是否過度集中",
    },
    {
      label: "年化波動上限",
      status: volatilityStatus,
      value: formatPercent(volatility),
      threshold: `不得高於 ${formatPercent(maxVolatility)}`,
      note: volatilityStatus === "block" ? "預估波動超出政策限制，需降低風險資產比重" : "使用配置草稿的預估年化波動",
    },
    {
      label: "回撤限制",
      status: drawdownStatus,
      value: formatPercent(weightedDrawdown),
      threshold: `不得低於 ${formatPercent(drawdownLimit)}`,
      note: drawdownStatus === "block" ? "加權回撤超出政策限制，需調整候選資產" : "使用配置草稿的加權最大回撤",
    },
    {
      label: "最低模型分數",
      status: scoreStatus,
      value: minScore === null ? "--" : String(minScore),
      threshold: `不得低於 ${policyMinimumScore}`,
      note: scoreStatus === "block" ? "低分標的不應納入政策組合" : "確認配置內商品分數符合政策底線",
    },
    {
      label: "換手限制",
      status: turnoverStatus,
      value: `${formatCurrency(grossTradeAmount)} / ${formatPercent(grossTradeRatio)}`,
      threshold: "總交易額低於模型本金 50% 為佳",
      note: turnoverStatus === "block" ? "交易幅度過大，建議分批或降低調倉強度" : "用總交易額估算本次調倉強度",
    },
    {
      label: "資料新鮮度",
      status: freshnessStatusValue,
      value: priceFreshnessDays === null ? "--" : `${priceFreshnessDays} 天`,
      threshold: "3 天內通過，10 天內觀察",
      note: freshnessStatusValue === "block" ? "資料過舊，不應作為正式政策簽核依據" : "確認 BigQuery daily_prices 已足夠接近交易日",
    },
  ];
}

function committeeDecisionLabel(decision: CommitteeDecision) {
  if (decision === "approve") return "可執行";
  if (decision === "conditional") return "條件執行";
  return "暫緩";
}

function committeeDecisionStatus(decision: CommitteeDecision): ExecutionReviewStatus {
  if (decision === "approve") return "pass";
  if (decision === "conditional") return "watch";
  return "block";
}

function committeeDecisionFromItems({
  tradeTickets,
  executionReviewItems,
  monitoringRules,
  policyLimitItems,
}: {
  tradeTickets: TradeTicketRow[];
  executionReviewItems: ExecutionReviewItem[];
  monitoringRules: ExecutionReviewItem[];
  policyLimitItems: ExecutionReviewItem[];
}): CommitteeDecision {
  const allReviewItems = [...policyLimitItems, ...executionReviewItems, ...monitoringRules];
  const hasBlock = allReviewItems.some((item) => item.status === "block");
  const hasWatch = allReviewItems.some((item) => item.status === "watch");

  if (!tradeTickets.length || hasBlock) return "hold";
  if (hasWatch) return "conditional";
  return "approve";
}

function committeeApprovalChecklist({
  decision,
  tradeTickets,
  tradeBatches,
  executionReviewItems,
  monitoringRules,
  policyLimitItems,
  allocationRisk,
  allocationCapital,
  skippedTradeCount,
}: {
  decision: CommitteeDecision;
  tradeTickets: TradeTicketRow[];
  tradeBatches: TradeBatchRow[];
  executionReviewItems: ExecutionReviewItem[];
  monitoringRules: ExecutionReviewItem[];
  policyLimitItems: ExecutionReviewItem[];
  allocationRisk: AllocationRiskSnapshot;
  allocationCapital: number;
  skippedTradeCount: number;
}): ExecutionReviewItem[] {
  const allReviewItems = [...policyLimitItems, ...executionReviewItems, ...monitoringRules];
  const blockCount = allReviewItems.filter((item) => item.status === "block").length;
  const watchCount = allReviewItems.filter((item) => item.status === "watch").length;
  const batchCount = tradeBatches.reduce((maxValue, row) => Math.max(maxValue, row.batchNumber), 0);
  const grossTradeAmount = tradeTickets.reduce((sum, row) => sum + row.ticketAmount, 0);
  const netCashImpact = tradeTickets.reduce((sum, row) => sum + row.cashImpact, 0);
  const grossTradeRatio = allocationCapital > 0 ? grossTradeAmount / allocationCapital : null;
  const netCashRatio = allocationCapital > 0 ? Math.abs(netCashImpact) / allocationCapital : null;
  const stressLossRatio = allocationRisk.investedAmount > 0 ? Math.abs(allocationRisk.stressLoss) / allocationRisk.investedAmount : null;
  const tradeAmountStatus: ExecutionReviewStatus =
    grossTradeRatio === null ? "watch" : grossTradeRatio <= 0.5 ? "pass" : grossTradeRatio <= 0.8 ? "watch" : "block";
  const netCashStatus: ExecutionReviewStatus =
    netCashRatio === null ? "watch" : netCashRatio <= 0.15 ? "pass" : netCashRatio <= 0.3 ? "watch" : "block";
  const stressStatus: ExecutionReviewStatus =
    stressLossRatio === null ? "watch" : stressLossRatio <= 0.12 ? "pass" : stressLossRatio <= 0.25 ? "watch" : "block";

  return [
    {
      label: "簽核結論",
      status: committeeDecisionStatus(decision),
      value: committeeDecisionLabel(decision),
      threshold: "沒有暫停項目才可直接執行",
      note:
        decision === "approve"
          ? "可進入交易執行"
          : decision === "conditional"
            ? "需要先處理觀察項目，再執行或分批執行"
            : "存在暫停項目或尚無交易清單，暫不建議執行",
    },
    {
      label: "交易範圍",
      status: tradeTickets.length ? "pass" : "block",
      value: `${tradeTickets.length} 檔 / ${batchCount} 批`,
      threshold: "至少一檔可執行交易",
      note: tradeTickets.length ? "交易清單與批次計畫已形成" : "尚未形成可送簽的交易清單",
    },
    {
      label: "未處理警示",
      status: blockCount > 0 ? "block" : watchCount > 0 ? "watch" : "pass",
      value: `暫停 ${blockCount} / 觀察 ${watchCount}`,
      threshold: "暫停項目必須先解除",
      note: blockCount > 0 ? "先處理暫停項目再送出交易" : watchCount > 0 ? "可條件執行，但需保留覆核紀錄" : "未發現阻擋項目",
    },
    {
      label: "總交易額",
      status: tradeAmountStatus,
      value: `${formatCurrency(grossTradeAmount)} / ${formatPercent(grossTradeRatio)}`,
      threshold: "總交易額低於模型本金 50% 為佳",
      note: tradeAmountStatus === "block" ? "交易幅度過大，建議重新拆批或降低目標差距" : "用於判斷本次調倉幅度",
    },
    {
      label: "現金影響",
      status: netCashStatus,
      value: `${formatCurrency(netCashImpact)} / ${formatPercent(netCashRatio)}`,
      threshold: "淨現金影響低於模型本金 15% 為佳",
      note: netCashImpact < 0 ? "執行前需確認現金來源" : netCashImpact > 0 ? "執行後會釋放現金" : "買賣現金大致平衡",
    },
    {
      label: "壓力風險",
      status: stressStatus,
      value: `${formatCurrency(allocationRisk.stressLoss)} / ${formatPercent(stressLossRatio)}`,
      threshold: "壓力損失低於 12% 為佳",
      note: "簽核時保留配置草稿的壓力風險基準",
    },
    {
      label: "殘留偏離",
      status: skippedTradeCount === 0 ? "pass" : skippedTradeCount <= 2 ? "watch" : "block",
      value: `${Math.max(0, skippedTradeCount)} 檔`,
      threshold: "低於最小交易金額的殘留偏離需列入下次追蹤",
      note: skippedTradeCount ? "有交易因金額太小未執行，需在下次再平衡複核" : "沒有因最小交易金額留下的殘留項目",
    },
  ];
}

function formatDecisionAuditTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || "--";
  return date.toLocaleString("zh-TW", { hour12: false });
}

function buildDecisionAuditId(name: string, symbols: string, generatedAt: string) {
  const slug =
    `${name}-${symbols}`
      .trim()
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 24)
      .toUpperCase() || "WATCHLIST";
  const stamp = generatedAt.replace(/\D/g, "").slice(0, 12) || resultStamp().replace(/\D/g, "").slice(0, 12);

  return `IC-${stamp}-${slug}`;
}

function buildDecisionAuditRecords({
  auditId,
  generatedAt,
  owner,
  approver,
  watchlistName,
  comparisonSymbols,
  committeeDecision,
  policyDecision,
  policyLimitItems,
  executionReviewItems,
  monitoringRules,
  committeeApprovalItems,
  tradeTickets,
  tradeBatches,
  allocationCapital,
}: {
  auditId: string;
  generatedAt: string;
  owner: string;
  approver: string;
  watchlistName: string;
  comparisonSymbols: string;
  committeeDecision: CommitteeDecision;
  policyDecision: ExecutionReviewStatus;
  policyLimitItems: ExecutionReviewItem[];
  executionReviewItems: ExecutionReviewItem[];
  monitoringRules: ExecutionReviewItem[];
  committeeApprovalItems: ExecutionReviewItem[];
  tradeTickets: TradeTicketRow[];
  tradeBatches: TradeBatchRow[];
  allocationCapital: number;
}): DecisionAuditRecord[] {
  const symbols = parseSymbolList(comparisonSymbols);
  const allReviewItems = [...policyLimitItems, ...executionReviewItems, ...monitoringRules, ...committeeApprovalItems];
  const blockCount = allReviewItems.filter((item) => item.status === "block").length;
  const watchCount = allReviewItems.filter((item) => item.status === "watch").length;
  const policyBlockCount = policyLimitItems.filter((item) => item.status === "block").length;
  const policyWatchCount = policyLimitItems.filter((item) => item.status === "watch").length;
  const tradeBatchCount = tradeBatches.reduce((maxValue, row) => Math.max(maxValue, row.batchNumber), 0);

  return [
    {
      label: "決策包編號",
      value: auditId,
      note: "用於比對本次投委會摘要、交易清單與匯出檔版本",
    },
    {
      label: "產出時間",
      value: formatDecisionAuditTime(generatedAt),
      note: "刷新時間後會重新產生稽核版本",
    },
    {
      label: "決策人",
      value: owner.trim() || "--",
      note: "送簽前確認本次決策負責人",
    },
    {
      label: "簽核單位",
      value: approver.trim() || "--",
      note: "用於保留投委會或覆核人資訊",
    },
    {
      label: "Watchlist",
      value: watchlistName.trim() || "未命名 Watchlist",
      note: "對應目前研究名單",
    },
    {
      label: "商品清單",
      value: symbols.join(" ") || "--",
      note: `共 ${symbols.length} 檔商品`,
    },
    {
      label: "簽核建議",
      value: committeeDecisionLabel(committeeDecision),
      note: "由政策限制、交易前檢核、交易後監控共同推導",
    },
    {
      label: "政策狀態",
      value: executionReviewLabel(policyDecision),
      note: `政策暫停 ${policyBlockCount} / 觀察 ${policyWatchCount}`,
    },
    {
      label: "風控檢核",
      value: `暫停 ${blockCount} / 觀察 ${watchCount}`,
      note: "合併政策、交易前、交易後與簽核檢查",
    },
    {
      label: "交易清單",
      value: `${tradeTickets.length} 檔`,
      note: `分批計畫 ${tradeBatchCount} 批`,
    },
    {
      label: "模型本金",
      value: formatCurrency(allocationCapital),
      note: "本次配置、交易額與風險比例基準",
    },
    {
      label: "稽核備註",
      value:
        committeeDecision === "approve"
          ? "可歸檔送執行"
          : committeeDecision === "conditional"
            ? "需保留條件執行紀錄"
            : "暫緩並保留阻擋原因",
      note: "作為後續回看與版本追蹤的人工覆核入口",
    },
  ];
}

function decisionAuditCsv(rows: DecisionAuditRecord[]) {
  const header = ["label", "value", "note"];
  const csvRows = rows.map((row) => [row.label, row.value, row.note]);

  return [header, ...csvRows].map((row) => row.map(csvCell).join(",")).join("\n");
}

function executionHandoffPriorityLabel(priority: ExecutionHandoffPriority) {
  if (priority === "high") return "高";
  if (priority === "medium") return "中";
  return "低";
}

function executionHandoffPriorityClass(priority: ExecutionHandoffPriority) {
  if (priority === "high") return "bg-rose-500/15 text-rose-200 border-rose-500/30";
  if (priority === "medium") return "bg-amber-500/15 text-amber-200 border-amber-500/30";
  return "bg-emerald-500/15 text-emerald-200 border-emerald-500/30";
}

function handoffPriorityFromStatus(status: ExecutionReviewStatus): ExecutionHandoffPriority {
  if (status === "block") return "high";
  if (status === "watch") return "medium";
  return "low";
}

function buildExecutionHandoffItems({
  auditId,
  executionOwner,
  riskOwner,
  settlementOwner,
  handoffDueDays,
  committeeDecision,
  policyDecision,
  monitoringDecision,
  tradeTickets,
  tradeBatches,
  allocationCapital,
  policyBlockCount,
  policyWatchCount,
  committeeBlockCount,
  committeeWatchCount,
}: {
  auditId: string;
  executionOwner: string;
  riskOwner: string;
  settlementOwner: string;
  handoffDueDays: number;
  committeeDecision: CommitteeDecision;
  policyDecision: ExecutionReviewStatus;
  monitoringDecision: ExecutionReviewStatus;
  tradeTickets: TradeTicketRow[];
  tradeBatches: TradeBatchRow[];
  allocationCapital: number;
  policyBlockCount: number;
  policyWatchCount: number;
  committeeBlockCount: number;
  committeeWatchCount: number;
}): ExecutionHandoffItem[] {
  const batchCount = tradeBatches.reduce((maxValue, row) => Math.max(maxValue, row.batchNumber), 0);
  const grossTradeAmount = tradeTickets.reduce((sum, row) => sum + row.ticketAmount, 0);
  const netCashImpact = tradeTickets.reduce((sum, row) => sum + row.cashImpact, 0);
  const grossTradeRatio = allocationCapital > 0 ? grossTradeAmount / allocationCapital : null;
  const netCashRatio = allocationCapital > 0 ? Math.abs(netCashImpact) / allocationCapital : null;
  const tradeReadiness: ExecutionReviewStatus =
    committeeDecision === "hold" || !tradeTickets.length ? "block" : committeeDecision === "conditional" ? "watch" : "pass";
  const batchReadiness: ExecutionReviewStatus =
    !tradeBatches.length ? "block" : batchCount > 3 || (grossTradeRatio !== null && grossTradeRatio > 0.5) ? "watch" : "pass";
  const cashReadiness: ExecutionReviewStatus =
    netCashRatio === null ? "watch" : netCashRatio > 0.3 ? "block" : netCashRatio > 0.15 ? "watch" : "pass";
  const policyReadiness: ExecutionReviewStatus =
    policyDecision === "block" ? "block" : policyDecision === "watch" || committeeWatchCount > 0 ? "watch" : "pass";

  return [
    {
      owner: executionOwner.trim() || "交易員",
      task: "確認決策包版本",
      priority: "low",
      due: "T+0",
      status: "pass",
      evidence: auditId,
      note: "交易前先核對目前畫面、CSV 與 memo 是否為同一個決策包版本",
    },
    {
      owner: executionOwner.trim() || "交易員",
      task: "執行第一批交易",
      priority: handoffPriorityFromStatus(tradeReadiness),
      due: "T+0",
      status: tradeReadiness,
      evidence: `${tradeTickets.length} 檔 / ${batchCount} 批`,
      note:
        tradeReadiness === "block"
          ? "簽核結果暫緩或尚無可執行交易，不應送出交易"
          : tradeReadiness === "watch"
            ? "條件執行，需先確認觀察項目已被接受"
            : "可依第一批交易計畫進入執行",
    },
    {
      owner: executionOwner.trim() || "交易員",
      task: "拆批與交易金額控管",
      priority: handoffPriorityFromStatus(batchReadiness),
      due: "T+0",
      status: batchReadiness,
      evidence: `${formatCurrency(grossTradeAmount)} / ${formatPercent(grossTradeRatio)}`,
      note:
        batchReadiness === "block"
          ? "尚無分批計畫"
          : batchReadiness === "watch"
            ? "交易幅度或批次偏大，執行時需分段回報"
            : "批次與交易金額在目前規則內",
    },
    {
      owner: riskOwner.trim() || "風控",
      task: "覆核政策例外",
      priority: handoffPriorityFromStatus(policyReadiness),
      due: "T+0",
      status: policyReadiness,
      evidence: `政策暫停 ${policyBlockCount} / 觀察 ${policyWatchCount}`,
      note:
        policyReadiness === "block"
          ? "政策暫停項目解除前不得執行"
          : policyReadiness === "watch"
            ? "觀察項目需留下接受原因"
            : "政策檢查未發現阻擋項",
    },
    {
      owner: riskOwner.trim() || "風控",
      task: "建立交易後監控",
      priority: handoffPriorityFromStatus(monitoringDecision),
      due: `T+${Math.max(1, handoffDueDays)}`,
      status: monitoringDecision,
      evidence: `簽核暫停 ${committeeBlockCount} / 觀察 ${committeeWatchCount}`,
      note:
        monitoringDecision === "block"
          ? "監控警戒項目需要先定義處置方式"
          : monitoringDecision === "watch"
            ? "需要設定觀察條件與回報節點"
            : "監控規則可直接列入後續追蹤",
    },
    {
      owner: settlementOwner.trim() || "中台",
      task: "確認現金與結算影響",
      priority: handoffPriorityFromStatus(cashReadiness),
      due: "T+0",
      status: cashReadiness,
      evidence: `${formatCurrency(netCashImpact)} / ${formatPercent(netCashRatio)}`,
      note:
        cashReadiness === "block"
          ? "淨現金影響偏高，需確認現金來源或拆分交易"
          : cashReadiness === "watch"
            ? "現金影響需在執行前覆核"
            : "現金影響在目前門檻內",
    },
  ];
}

function executionHandoffCsv(rows: ExecutionHandoffItem[]) {
  const header = ["owner", "task", "priority", "due", "status", "evidence", "note"];
  const csvRows = rows.map((row) => [
    row.owner,
    row.task,
    executionHandoffPriorityLabel(row.priority),
    row.due,
    executionReviewLabel(row.status),
    row.evidence,
    row.note,
  ]);

  return [header, ...csvRows].map((row) => row.map(csvCell).join(",")).join("\n");
}

function formatBps(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "--";
  return `${value.toFixed(1)} bps`;
}

function buildExecutionFillRows({
  tradeTickets,
  fillCompletionPercent,
  fillSlippageBps,
  fillCommissionBps,
}: {
  tradeTickets: TradeTicketRow[];
  fillCompletionPercent: number;
  fillSlippageBps: number;
  fillCommissionBps: number;
}): ExecutionFillRow[] {
  const completionRate = Math.min(1, Math.max(0, fillCompletionPercent / 100));
  const cleanSlippageBps = Math.max(0, fillSlippageBps);
  const cleanCommissionBps = Math.max(0, fillCommissionBps);
  const allInCostBps = cleanSlippageBps + cleanCommissionBps;

  return tradeTickets.map((row) => {
    const filledNotional = row.ticketAmount * completionRate;
    const unfilledNotional = Math.max(0, row.ticketAmount - filledNotional);
    const slippageCost = filledNotional * (cleanSlippageBps / 10_000);
    const commissionCost = filledNotional * (cleanCommissionBps / 10_000);
    const totalCost = slippageCost + commissionCost;
    const cashImpactAfterCost = row.direction === "buy" ? -(filledNotional + totalCost) : filledNotional - totalCost;
    const fillStatus: ExecutionReviewStatus =
      completionRate < 0.8 ? "block" : completionRate < 1 || allInCostBps > 20 ? "watch" : "pass";
    const fillNote =
      fillStatus === "block"
        ? "成交率偏低，需要重新排程或取消殘單"
        : fillStatus === "watch"
          ? "存在未成交或成本偏高，需要執行後覆核"
          : "成交率與成本在目前門檻內";

    return {
      ...row,
      filledNotional,
      unfilledNotional,
      fillCompletionRate: completionRate,
      slippageBps: cleanSlippageBps,
      commissionBps: cleanCommissionBps,
      slippageCost,
      commissionCost,
      totalCost,
      cashImpactAfterCost,
      fillStatus,
      fillNote,
    };
  });
}

function executionFillCsv(rows: ExecutionFillRow[]) {
  const header = [
    "symbol",
    "direction",
    "target_notional",
    "filled_notional",
    "unfilled_notional",
    "fill_completion_rate",
    "slippage_bps",
    "commission_bps",
    "slippage_cost",
    "commission_cost",
    "total_cost",
    "cash_impact_after_cost",
    "status",
    "note",
  ];
  const csvRows = rows.map((row) => [
    row.symbol,
    row.direction,
    row.ticketAmount,
    row.filledNotional,
    row.unfilledNotional,
    row.fillCompletionRate,
    row.slippageBps,
    row.commissionBps,
    row.slippageCost,
    row.commissionCost,
    row.totalCost,
    row.cashImpactAfterCost,
    executionReviewLabel(row.fillStatus),
    row.fillNote,
  ]);

  return [header, ...csvRows].map((row) => row.map(csvCell).join(",")).join("\n");
}

function postTradeAttributionItems({
  executionFillRows,
  allocationCapital,
  postTradeReviewDays,
  postTradeBenchmarkMovePercent,
}: {
  executionFillRows: ExecutionFillRow[];
  allocationCapital: number;
  postTradeReviewDays: number;
  postTradeBenchmarkMovePercent: number;
}): ExecutionReviewItem[] {
  const targetNotional = executionFillRows.reduce((sum, row) => sum + row.ticketAmount, 0);
  const filledNotional = executionFillRows.reduce((sum, row) => sum + row.filledNotional, 0);
  const unfilledNotional = executionFillRows.reduce((sum, row) => sum + row.unfilledNotional, 0);
  const totalCost = executionFillRows.reduce((sum, row) => sum + row.totalCost, 0);
  const cashImpactAfterCost = executionFillRows.reduce((sum, row) => sum + row.cashImpactAfterCost, 0);
  const completionRate = targetNotional > 0 ? filledNotional / targetNotional : null;
  const unfilledRatio = targetNotional > 0 ? unfilledNotional / targetNotional : null;
  const costBps = filledNotional > 0 ? (totalCost / filledNotional) * 10_000 : null;
  const cashImpactRatio = allocationCapital > 0 ? Math.abs(cashImpactAfterCost) / allocationCapital : null;
  const benchmarkMove = postTradeBenchmarkMovePercent / 100;
  const residualMarketImpact = unfilledNotional * benchmarkMove;
  const residualMarketImpactRatio = allocationCapital > 0 ? Math.abs(residualMarketImpact) / allocationCapital : null;
  const completionStatus: ExecutionReviewStatus =
    completionRate === null ? "block" : completionRate < 0.8 ? "block" : completionRate < 1 ? "watch" : "pass";
  const unfilledStatus: ExecutionReviewStatus =
    unfilledRatio === null ? "watch" : unfilledRatio > 0.2 ? "block" : unfilledRatio > 0.05 ? "watch" : "pass";
  const costStatus: ExecutionReviewStatus =
    costBps === null ? "watch" : costBps > 35 ? "block" : costBps > 20 ? "watch" : "pass";
  const cashStatus: ExecutionReviewStatus =
    cashImpactRatio === null ? "watch" : cashImpactRatio > 0.3 ? "block" : cashImpactRatio > 0.15 ? "watch" : "pass";
  const residualStatus: ExecutionReviewStatus =
    residualMarketImpactRatio === null ? "watch" : residualMarketImpactRatio > 0.08 ? "block" : residualMarketImpactRatio > 0.03 ? "watch" : "pass";

  return [
    {
      label: "成交完成率",
      status: completionStatus,
      value: `${formatCurrency(filledNotional)} / ${formatPercent(completionRate)}`,
      threshold: "100% 通過，80% 以下暫停",
      note:
        completionStatus === "block"
          ? "成交不足，需重新排程或檢討流動性"
          : completionStatus === "watch"
            ? "仍有未成交部位，需列入復盤"
            : "交易清單已完整成交",
    },
    {
      label: "未成交殘單",
      status: unfilledStatus,
      value: `${formatCurrency(unfilledNotional)} / ${formatPercent(unfilledRatio)}`,
      threshold: "殘單低於交易金額 5% 為佳",
      note:
        unfilledStatus === "block"
          ? "殘單比例偏高，可能影響模型配置落地"
          : unfilledStatus === "watch"
            ? "有少量殘單，需決定補單或取消"
            : "沒有明顯殘單",
    },
    {
      label: "交易成本",
      status: costStatus,
      value: `${formatCurrency(totalCost)} / ${formatBps(costBps)}`,
      threshold: "20 bps 內通過，35 bps 以上暫停",
      note:
        costStatus === "block"
          ? "交易成本偏高，需要檢討執行方式"
          : costStatus === "watch"
            ? "成本略高，需保留交易理由"
            : "成本在目前門檻內",
    },
    {
      label: "成交後現金偏差",
      status: cashStatus,
      value: `${formatCurrency(cashImpactAfterCost)} / ${formatPercent(cashImpactRatio)}`,
      threshold: "低於模型本金 15% 為佳",
      note:
        cashStatus === "block"
          ? "成交後現金影響過大，需重新檢查資金安排"
          : cashStatus === "watch"
            ? "現金影響需在下次復盤確認"
            : "成交後現金影響在目前門檻內",
    },
    {
      label: "未成交市場曝險",
      status: residualStatus,
      value: `${formatCurrency(residualMarketImpact)} / ${formatPercent(residualMarketImpactRatio)}`,
      threshold: `T+${Math.max(1, postTradeReviewDays)} 市場變動假設 ${formatPercent(benchmarkMove)}`,
      note:
        residualStatus === "block"
          ? "未成交部位的市場變動影響偏高，需優先檢討"
          : residualStatus === "watch"
            ? "未成交曝險需列入復盤紀錄"
            : "未成交曝險在目前門檻內",
    },
  ];
}

function platformExceptionQueueItems({
  policyLimitItems,
  executionReviewItems,
  monitoringRules,
  committeeApprovalItems,
  executionHandoffItems,
  executionFillRows,
  postTradeAttributionRows,
  executionOwner,
  riskOwner,
  settlementOwner,
  decisionApprover,
  exceptionDueDays,
}: {
  policyLimitItems: ExecutionReviewItem[];
  executionReviewItems: ExecutionReviewItem[];
  monitoringRules: ExecutionReviewItem[];
  committeeApprovalItems: ExecutionReviewItem[];
  executionHandoffItems: ExecutionHandoffItem[];
  executionFillRows: ExecutionFillRow[];
  postTradeAttributionRows: ExecutionReviewItem[];
  executionOwner: string;
  riskOwner: string;
  settlementOwner: string;
  decisionApprover: string;
  exceptionDueDays: number;
}): PlatformExceptionItem[] {
  const cleanExecutionOwner = executionOwner.trim() || "交易員";
  const cleanRiskOwner = riskOwner.trim() || "風控";
  const cleanSettlementOwner = settlementOwner.trim() || "中台";
  const cleanApprover = decisionApprover.trim() || "投委會";
  const due = `T+${Math.max(1, exceptionDueDays)}`;
  const fromReviewItems = (
    source: string,
    owner: string,
    rows: ExecutionReviewItem[],
    nextAction: string,
  ): PlatformExceptionItem[] =>
    rows
      .filter((row) => row.status !== "pass")
      .map((row) => ({
        source,
        owner,
        item: row.label,
        status: row.status,
        priority: handoffPriorityFromStatus(row.status),
        due,
        evidence: row.value,
        nextAction,
      }));

  return [
    ...fromReviewItems("投資政策", cleanRiskOwner, policyLimitItems, "確認政策例外是否可接受，必要時退回模型配置"),
    ...fromReviewItems("交易前檢核", cleanExecutionOwner, executionReviewItems, "交易前解除阻擋項或保留條件執行理由"),
    ...fromReviewItems("交易後監控", cleanRiskOwner, monitoringRules, "建立監控條件與處置節點"),
    ...fromReviewItems("投委會簽核", cleanApprover, committeeApprovalItems, "確認簽核結論與觀察項目是否已被接受"),
    ...executionHandoffItems
      .filter((row) => row.status !== "pass")
      .map((row) => ({
        source: "執行交接",
        owner: row.owner,
        item: row.task,
        status: row.status,
        priority: row.priority,
        due: row.due,
        evidence: row.evidence,
        nextAction: row.note,
      })),
    ...executionFillRows
      .filter((row) => row.fillStatus !== "pass")
      .map((row) => ({
        source: "成交回報",
        owner: cleanExecutionOwner,
        item: row.symbol,
        status: row.fillStatus,
        priority: handoffPriorityFromStatus(row.fillStatus),
        due,
        evidence: `${formatCurrency(row.unfilledNotional)} / ${formatCurrency(row.totalCost)}`,
        nextAction: row.fillNote,
      })),
    ...fromReviewItems("交易後歸因", cleanRiskOwner || cleanSettlementOwner, postTradeAttributionRows, "納入復盤紀錄並決定是否調整下次交易規則"),
  ].sort((left, right) => {
    const priorityRank: Record<ExecutionHandoffPriority, number> = { high: 0, medium: 1, low: 2 };
    return priorityRank[left.priority] - priorityRank[right.priority];
  });
}

function platformExceptionCsv(rows: PlatformExceptionItem[]) {
  const header = ["source", "owner", "item", "priority", "due", "status", "evidence", "next_action"];
  const csvRows = rows.map((row) => [
    row.source,
    row.owner,
    row.item,
    executionHandoffPriorityLabel(row.priority),
    row.due,
    executionReviewLabel(row.status),
    row.evidence,
    row.nextAction,
  ]);

  return [header, ...csvRows].map((row) => row.map(csvCell).join(",")).join("\n");
}

function qualityToExecutionStatus(status: QualityStatus): ExecutionReviewStatus {
  if (status === "risk") return "block";
  if (status === "watch" || status === "neutral") return "watch";
  return "pass";
}

function combinedExecutionStatus(statuses: ExecutionReviewStatus[]): ExecutionReviewStatus {
  if (statuses.some((status) => status === "block")) return "block";
  if (statuses.some((status) => status === "watch")) return "watch";
  return "pass";
}

function buildCioOperatingBriefItems({
  dataStatus,
  visibleRows,
  candidateCount,
  activeAllocationCount,
  allocationRisk,
  tradeTickets,
  tradeBatchCount,
  committeeDecision,
  executionFillDecision,
  postTradeDecision,
  platformExceptionDecision,
  platformExceptionBlockCount,
  platformExceptionWatchCount,
  totalExecutionCost,
  totalUnfilledNotional,
  totalCashImpactAfterCost,
}: {
  dataStatus: ExecutionReviewStatus;
  visibleRows: number;
  candidateCount: number;
  activeAllocationCount: number;
  allocationRisk: AllocationRiskSnapshot;
  tradeTickets: TradeTicketRow[];
  tradeBatchCount: number;
  committeeDecision: CommitteeDecision;
  executionFillDecision: ExecutionReviewStatus;
  postTradeDecision: ExecutionReviewStatus;
  platformExceptionDecision: ExecutionReviewStatus;
  platformExceptionBlockCount: number;
  platformExceptionWatchCount: number;
  totalExecutionCost: number;
  totalUnfilledNotional: number;
  totalCashImpactAfterCost: number;
}): ExecutionReviewItem[] {
  const researchStatus: ExecutionReviewStatus = candidateCount > 0 ? "pass" : visibleRows > 0 ? "watch" : "block";
  const allocationStatus: ExecutionReviewStatus = activeAllocationCount > 0 ? "pass" : visibleRows > 0 ? "watch" : "block";
  const tradeStatus = committeeDecisionStatus(committeeDecision);
  const exceptionStatus = platformExceptionDecision;
  const baseItems: ExecutionReviewItem[] = [
    {
      label: "資料可用性",
      status: dataStatus,
      value: executionReviewLabel(dataStatus),
      threshold: "資料表結構、價格新鮮度與覆蓋率需可用",
      note: dataStatus === "block" ? "資料層仍有阻擋項，不應進入正式決策" : dataStatus === "watch" ? "資料可用但需保留觀察" : "資料層可支撐目前工作流",
    },
    {
      label: "研究池",
      status: researchStatus,
      value: `${candidateCount} 候選 / ${visibleRows} 顯示`,
      threshold: "至少一檔候選標的",
      note: researchStatus === "block" ? "目前沒有可用研究標的" : researchStatus === "watch" ? "有標的但沒有候選，需要調整篩選條件" : "研究池已有候選標的",
    },
    {
      label: "模型配置",
      status: allocationStatus,
      value: `${activeAllocationCount} 檔 / ${formatCurrency(allocationRisk.investedAmount)}`,
      threshold: "至少一檔進入模型配置",
      note: allocationStatus === "block" ? "尚未形成配置草稿" : allocationStatus === "watch" ? "配置草稿不足，需檢查篩選條件" : "配置草稿已可進入交易流程",
    },
    {
      label: "交易管線",
      status: tradeStatus,
      value: `${tradeTickets.length} 檔 / ${tradeBatchCount} 批`,
      threshold: "投委會簽核建議需可執行",
      note: tradeStatus === "block" ? "交易管線暫緩" : tradeStatus === "watch" ? "交易可條件執行" : "交易管線可執行",
    },
    {
      label: "成交與成本",
      status: executionFillDecision,
      value: `${formatCurrency(totalExecutionCost)} / 未成交 ${formatCurrency(totalUnfilledNotional)}`,
      threshold: "成交率與交易成本需在門檻內",
      note: executionFillDecision === "block" ? "成交或成本存在阻擋項" : executionFillDecision === "watch" ? "成交或成本需觀察" : "成交回報在目前門檻內",
    },
    {
      label: "復盤狀態",
      status: postTradeDecision,
      value: `${formatCurrency(totalCashImpactAfterCost)} 現金影響`,
      threshold: "成交後現金偏差、殘單與成本需可解釋",
      note: postTradeDecision === "block" ? "復盤仍有阻擋項" : postTradeDecision === "watch" ? "復盤仍有觀察項" : "復盤狀態可接受",
    },
    {
      label: "例外事項",
      status: exceptionStatus,
      value: `暫停 ${platformExceptionBlockCount} / 觀察 ${platformExceptionWatchCount}`,
      threshold: "高優先例外需先處理",
      note: exceptionStatus === "block" ? "先清除暫停項目" : exceptionStatus === "watch" ? "保留觀察項目並追蹤" : "目前沒有待處理例外事項",
    },
  ];
  const overallStatus = combinedExecutionStatus(baseItems.map((item) => item.status));
  const nextAction =
    overallStatus === "block"
      ? "暫停正式推進，先處理阻擋項與高優先例外"
      : overallStatus === "watch"
        ? "可進入條件執行或觀察，但需保留追蹤紀錄"
        : "可進入下一輪配置、交易或回報週期";

  return [
    {
      label: "CIO 總覽",
      status: overallStatus,
      value: executionReviewLabel(overallStatus),
      threshold: "資料、研究、配置、交易、成交、復盤與例外事項共同判斷",
      note: nextAction,
    },
    ...baseItems,
  ];
}

function slaEscalationTierLabel(tier: SlaEscalationTier) {
  if (tier === "critical") return "L1 立即升級";
  if (tier === "review") return "L2 覆核追蹤";
  return "L3 例行追蹤";
}

function buildSlaEscalationItems({
  platformExceptionItems,
  cioOperatingDecision,
  riskOwner,
  decisionApprover,
  slaCriticalHours,
  slaReviewHours,
}: {
  platformExceptionItems: PlatformExceptionItem[];
  cioOperatingDecision: ExecutionReviewStatus;
  riskOwner: string;
  decisionApprover: string;
  slaCriticalHours: number;
  slaReviewHours: number;
}): SlaEscalationItem[] {
  const cleanRiskOwner = riskOwner.trim() || "風控";
  const cleanApprover = decisionApprover.trim() || "投委會";
  const cleanCriticalHours = Math.max(1, Math.floor(slaCriticalHours));
  const cleanReviewHours = Math.max(cleanCriticalHours, Math.floor(slaReviewHours));
  const escalationItems = platformExceptionItems.map((item) => {
    const tier: SlaEscalationTier = item.status === "block" ? "critical" : item.priority === "high" ? "critical" : "review";
    const due = tier === "critical" ? `${cleanCriticalHours}h` : `${cleanReviewHours}h`;
    const escalationPath = tier === "critical" ? `${item.owner} -> ${cleanApprover}` : `${item.owner} -> ${cleanRiskOwner}`;

    return {
      tier,
      owner: item.owner,
      trigger: `${item.source} / ${item.item}`,
      status: item.status,
      priority: item.priority,
      due,
      escalationPath,
      action: item.nextAction,
    };
  });

  if (escalationItems.length) {
    return escalationItems.sort((left, right) => {
      const tierRank: Record<SlaEscalationTier, number> = { critical: 0, review: 1, routine: 2 };
      const priorityRank: Record<ExecutionHandoffPriority, number> = { high: 0, medium: 1, low: 2 };
      return tierRank[left.tier] - tierRank[right.tier] || priorityRank[left.priority] - priorityRank[right.priority];
    });
  }

  return [
    {
      tier: "routine",
      owner: cleanRiskOwner,
      trigger: "CIO 營運總覽",
      status: cioOperatingDecision,
      priority: cioOperatingDecision === "pass" ? "low" : "medium",
      due: `${cleanReviewHours}h`,
      escalationPath: `${cleanRiskOwner} -> ${cleanApprover}`,
      action: cioOperatingDecision === "pass" ? "維持例行監控與下一輪配置檢查" : "確認觀察項目是否需要升級",
    },
  ];
}

function slaEscalationCsv(rows: SlaEscalationItem[]) {
  const header = ["tier", "owner", "trigger", "priority", "due", "status", "escalation_path", "action"];
  const csvRows = rows.map((row) => [
    slaEscalationTierLabel(row.tier),
    row.owner,
    row.trigger,
    executionHandoffPriorityLabel(row.priority),
    row.due,
    executionReviewLabel(row.status),
    row.escalationPath,
    row.action,
  ]);

  return [header, ...csvRows].map((row) => row.map(csvCell).join(",")).join("\n");
}

function buildOperatingKriItems({
  dataStatus,
  allocationRisk,
  tradeTickets,
  executionFillRows,
  totalExecutionCost,
  totalUnfilledNotional,
  platformExceptionItems,
  slaEscalationItems,
  postTradeDecision,
  riskOwner,
  executionOwner,
  decisionApprover,
  priceFreshnessDays,
}: {
  dataStatus: ExecutionReviewStatus;
  allocationRisk: AllocationRiskSnapshot;
  tradeTickets: TradeTicketRow[];
  executionFillRows: ExecutionFillRow[];
  totalExecutionCost: number;
  totalUnfilledNotional: number;
  platformExceptionItems: PlatformExceptionItem[];
  slaEscalationItems: SlaEscalationItem[];
  postTradeDecision: ExecutionReviewStatus;
  riskOwner: string;
  executionOwner: string;
  decisionApprover: string;
  priceFreshnessDays: number | null;
}): OperatingKriItem[] {
  const cleanRiskOwner = riskOwner.trim() || "風控";
  const cleanExecutionOwner = executionOwner.trim() || "交易員";
  const cleanApprover = decisionApprover.trim() || "投委會";
  const totalTicketNotional = tradeTickets.reduce((sum, row) => sum + row.ticketAmount, 0);
  const totalFilledNotional = executionFillRows.reduce((sum, row) => sum + row.filledNotional, 0);
  const unfilledRatio = totalTicketNotional > 0 ? totalUnfilledNotional / totalTicketNotional : null;
  const costBps = totalFilledNotional > 0 ? (totalExecutionCost / totalFilledNotional) * 10000 : null;
  const stressLossRatio = allocationRisk.investedAmount > 0 ? Math.abs(allocationRisk.stressLoss) / allocationRisk.investedAmount : null;
  const exceptionBlockCount = platformExceptionItems.filter((item) => item.status === "block").length;
  const exceptionWatchCount = platformExceptionItems.filter((item) => item.status === "watch").length;
  const highPriorityExceptionCount = platformExceptionItems.filter((item) => item.priority === "high").length;
  const criticalSlaCount = slaEscalationItems.filter((item) => item.tier === "critical").length;
  const reviewSlaCount = slaEscalationItems.filter((item) => item.tier === "review").length;
  const stressStatus: ExecutionReviewStatus =
    stressLossRatio === null ? "watch" : stressLossRatio <= 0.12 ? "pass" : stressLossRatio <= 0.25 ? "watch" : "block";
  const unfilledStatus: ExecutionReviewStatus =
    unfilledRatio === null ? "watch" : unfilledRatio <= 0.05 ? "pass" : unfilledRatio <= 0.2 ? "watch" : "block";
  const costStatus: ExecutionReviewStatus =
    costBps === null ? (totalTicketNotional > 0 ? "block" : "watch") : costBps <= 15 ? "pass" : costBps <= 35 ? "watch" : "block";
  const exceptionStatus: ExecutionReviewStatus =
    exceptionBlockCount > 0 ? "block" : exceptionWatchCount > 0 || highPriorityExceptionCount > 0 ? "watch" : "pass";
  const slaStatus: ExecutionReviewStatus = criticalSlaCount > 0 ? "block" : reviewSlaCount > 0 ? "watch" : "pass";

  return [
    {
      label: "資料新鮮度",
      status: dataStatus,
      value: priceFreshnessDays === null ? "--" : `${priceFreshnessDays} 天`,
      limit: "3 天內通過，10 天以上暫停",
      owner: cleanRiskOwner,
      note: dataStatus === "block" ? "資料層阻擋正式決策" : dataStatus === "watch" ? "資料可用但需保留觀察" : "資料層可支援營運監控",
    },
    {
      label: "配置壓力損失",
      status: stressStatus,
      value: `${formatCurrency(allocationRisk.stressLoss)} / ${formatPercent(stressLossRatio)}`,
      limit: "低於 12% 通過，25% 以上暫停",
      owner: cleanRiskOwner,
      note: stressStatus === "block" ? "壓力損失過高，應先調整配置" : "以目前配置草稿估算下行情境",
    },
    {
      label: "未成交殘單",
      status: unfilledStatus,
      value: `${formatCurrency(totalUnfilledNotional)} / ${formatPercent(unfilledRatio)}`,
      limit: "低於交易額 5% 通過，20% 以上暫停",
      owner: cleanExecutionOwner,
      note: unfilledStatus === "block" ? "殘單過高，需重新拆單或延後決策" : "用成交回報檢查執行落差",
    },
    {
      label: "交易成本",
      status: costStatus,
      value: `${formatCurrency(totalExecutionCost)} / ${formatBps(costBps)}`,
      limit: "低於 15 bps 通過，35 bps 以上暫停",
      owner: cleanExecutionOwner,
      note: costStatus === "block" ? "交易成本超出營運門檻" : "合併滑價與手續費估算",
    },
    {
      label: "例外事項",
      status: exceptionStatus,
      value: `高優先 ${highPriorityExceptionCount} / 暫停 ${exceptionBlockCount} / 觀察 ${exceptionWatchCount}`,
      limit: "不得有暫停項目，高優先需追蹤",
      owner: cleanApprover,
      note: exceptionStatus === "pass" ? "目前沒有需要升級的例外" : "需在例外事項總控台指定處理動作",
    },
    {
      label: "SLA 升級",
      status: slaStatus,
      value: `L1 ${criticalSlaCount} / L2 ${reviewSlaCount}`,
      limit: "L1 項目需立即升級",
      owner: cleanRiskOwner,
      note: slaStatus === "block" ? "存在 L1 升級項目" : slaStatus === "watch" ? "存在 L2 覆核項目" : "SLA 處於例行追蹤",
    },
    {
      label: "投後復盤",
      status: postTradeDecision,
      value: executionReviewLabel(postTradeDecision),
      limit: "復盤無暫停項目才可關閉本輪交易",
      owner: cleanRiskOwner,
      note: postTradeDecision === "block" ? "復盤仍有阻擋項" : postTradeDecision === "watch" ? "復盤仍有觀察項" : "成交後狀態可接受",
    },
  ];
}

function operatingKriCsv(rows: OperatingKriItem[]) {
  const header = ["label", "status", "value", "limit", "owner", "note"];
  const csvRows = rows.map((row) => [
    row.label,
    executionReviewLabel(row.status),
    row.value,
    row.limit,
    row.owner,
    row.note,
  ]);

  return [header, ...csvRows].map((row) => row.map(csvCell).join(",")).join("\n");
}

function funnelConversionText(count: number, total: number) {
  return total > 0 ? formatPercent(count / total) : "--";
}

function funnelRatioStatus(count: number, total: number, passRatio: number, watchRatio: number): ExecutionReviewStatus {
  if (total <= 0) return "watch";
  if (count <= 0) return "block";
  const ratio = count / total;
  if (ratio >= passRatio) return "pass";
  if (ratio >= watchRatio) return "watch";
  return "block";
}

function buildDecisionFunnelStages({
  totalRows,
  visibleRows,
  candidateCount,
  activeAllocationCount,
  activeRebalanceCount,
  tradeTicketCount,
  filledTradeCount,
  dataStatus,
  executionFillDecision,
  operatingKriDecision,
  platformExceptionDecision,
  platformExceptionCount,
  operatingKriBlockCount,
  operatingKriWatchCount,
  riskOwner,
  executionOwner,
  decisionApprover,
}: {
  totalRows: number;
  visibleRows: number;
  candidateCount: number;
  activeAllocationCount: number;
  activeRebalanceCount: number;
  tradeTicketCount: number;
  filledTradeCount: number;
  dataStatus: ExecutionReviewStatus;
  executionFillDecision: ExecutionReviewStatus;
  operatingKriDecision: ExecutionReviewStatus;
  platformExceptionDecision: ExecutionReviewStatus;
  platformExceptionCount: number;
  operatingKriBlockCount: number;
  operatingKriWatchCount: number;
  riskOwner: string;
  executionOwner: string;
  decisionApprover: string;
}): DecisionFunnelStage[] {
  const cleanRiskOwner = riskOwner.trim() || "風控";
  const cleanExecutionOwner = executionOwner.trim() || "交易員";
  const cleanApprover = decisionApprover.trim() || "投委會";
  const dataLoadStatus: ExecutionReviewStatus = totalRows > 0 ? dataStatus : "watch";
  const tradeStatus: ExecutionReviewStatus =
    activeRebalanceCount === 0 ? "watch" : tradeTicketCount === 0 ? "block" : tradeTicketCount < activeRebalanceCount ? "watch" : "pass";
  const filledStatus: ExecutionReviewStatus = tradeTicketCount > 0 ? executionFillDecision : "watch";

  return [
    {
      label: "資料載入",
      status: dataLoadStatus,
      value: `${totalRows} 檔`,
      conversion: totalRows > 0 ? "100.00%" : "--",
      owner: cleanRiskOwner,
      note: dataLoadStatus === "pass" ? "BigQuery 商品資料已可進入研究流程" : "先載入或修正資料品質，再進入研究漏斗",
    },
    {
      label: "研究篩選",
      status: funnelRatioStatus(visibleRows, totalRows, 0.2, 0.05),
      value: `${visibleRows} / ${totalRows}`,
      conversion: funnelConversionText(visibleRows, totalRows),
      owner: cleanRiskOwner,
      note: visibleRows ? "Watchlist 篩選後仍有可研究標的" : "目前篩選條件沒有留下標的",
    },
    {
      label: "候選名單",
      status: funnelRatioStatus(candidateCount, visibleRows, 0.15, 0.01),
      value: `${candidateCount} / ${visibleRows}`,
      conversion: funnelConversionText(candidateCount, visibleRows),
      owner: cleanRiskOwner,
      note: candidateCount ? "候選池可支援下一步配置" : "需要調整篩選門檻或商品清單",
    },
    {
      label: "模型配置",
      status: funnelRatioStatus(activeAllocationCount, visibleRows, 0.15, 0.01),
      value: `${activeAllocationCount} / ${visibleRows}`,
      conversion: funnelConversionText(activeAllocationCount, visibleRows),
      owner: cleanRiskOwner,
      note: activeAllocationCount ? "已有商品進入配置草稿" : "尚未形成可交易的配置草稿",
    },
    {
      label: "再平衡交易",
      status: tradeStatus,
      value: `${tradeTicketCount} / ${activeRebalanceCount}`,
      conversion: funnelConversionText(tradeTicketCount, activeRebalanceCount),
      owner: cleanExecutionOwner,
      note:
        activeRebalanceCount === 0
          ? "目前沒有偏離門檻以上的交易"
          : tradeTicketCount < activeRebalanceCount
            ? "部分交易低於最小交易金額，需人工確認"
            : "需交易項目已轉成交易清單",
    },
    {
      label: "成交回報",
      status: filledStatus,
      value: `${filledTradeCount} / ${tradeTicketCount}`,
      conversion: funnelConversionText(filledTradeCount, tradeTicketCount),
      owner: cleanExecutionOwner,
      note: filledStatus === "block" ? "成交不足或成本過高" : filledStatus === "watch" ? "成交回報需要覆核" : "成交回報可進入復盤",
    },
    {
      label: "營運放行",
      status: operatingKriDecision,
      value: `暫停 ${operatingKriBlockCount} / 觀察 ${operatingKriWatchCount}`,
      conversion: executionReviewLabel(operatingKriDecision),
      owner: cleanApprover,
      note: operatingKriDecision === "pass" ? "KRI 未阻擋本輪流程" : "先處理 KRI 暫停或觀察項目",
    },
    {
      label: "例外關閉",
      status: platformExceptionDecision,
      value: `${platformExceptionCount} 項`,
      conversion: platformExceptionCount ? "待清理" : "已清理",
      owner: cleanApprover,
      note: platformExceptionCount ? "依例外事項總控台關閉待辦" : "本輪沒有未關閉例外",
    },
  ];
}

function decisionFunnelCsv(rows: DecisionFunnelStage[]) {
  const header = ["stage", "status", "value", "conversion", "owner", "note"];
  const csvRows = rows.map((row) => [
    row.label,
    executionReviewLabel(row.status),
    row.value,
    row.conversion,
    row.owner,
    row.note,
  ]);

  return [header, ...csvRows].map((row) => row.map(csvCell).join(",")).join("\n");
}

function marketAlertPriorityFromStatus(status: ExecutionReviewStatus): ExecutionHandoffPriority {
  if (status === "block") return "high";
  if (status === "watch") return "medium";
  return "low";
}

function pipelineSchemaAction(check: { isReady: boolean; missingColumns: string[] }, tableLabel: string) {
  if (check.isReady) return `${tableLabel} schema 已符合最低需求`;
  return `補齊缺少欄位：${check.missingColumns.join(", ") || "--"}`;
}

function staleSymbolExecutionStatus(staleDays: number | null): ExecutionReviewStatus {
  if (staleDays === null) return "watch";
  return staleDays >= 10 ? "block" : "watch";
}

function buildDataPipelineHealthItems({
  hasBigQueryCredentials,
  diagnostics,
  schemaStatus,
  priceFreshnessStatus,
  fxFreshnessStatus,
  symbolCoverageStatus,
  priceDepthStatus,
  staleSymbolStatus,
  fxCurrencyStatus,
  staleSymbols,
  fxCurrencies,
  riskOwner,
}: {
  hasBigQueryCredentials: boolean;
  diagnostics?: BigQueryMarketDiagnostics;
  schemaStatus: QualityStatus;
  priceFreshnessStatus: QualityStatus;
  fxFreshnessStatus: QualityStatus;
  symbolCoverageStatus: QualityStatus;
  priceDepthStatus: QualityStatus;
  staleSymbolStatus: QualityStatus;
  fxCurrencyStatus: QualityStatus;
  staleSymbols: BigQueryStaleSymbol[];
  fxCurrencies: BigQueryFxCurrency[];
  riskOwner: string;
}): DataPipelineHealthItem[] {
  const cleanRiskOwner = riskOwner.trim() || "風控";

  return [
    {
      label: "BigQuery 憑證",
      status: hasBigQueryCredentials ? "pass" : "block",
      value: hasBigQueryCredentials ? "已設定" : "未設定",
      target: "Vercel Production 需有 GCP_SERVICE_ACCOUNT_JSON",
      owner: cleanRiskOwner,
      action: hasBigQueryCredentials ? "維持憑證輪替紀錄" : "先設定 service account JSON 並重新部署",
    },
    {
      label: "Schema 完整度",
      status: qualityToExecutionStatus(schemaStatus),
      value: diagnostics ? (schemaStatus === "strong" ? "Ready" : "Missing") : "--",
      target: "daily_prices / daily_fx 必要欄位完整",
      owner: cleanRiskOwner,
      action: diagnostics
        ? [
            pipelineSchemaAction(diagnostics.schemaChecks.priceTable, "daily_prices"),
            pipelineSchemaAction(diagnostics.schemaChecks.fxTable, "daily_fx"),
          ].join("；")
        : "讀取 BigQuery 診斷後確認 schema",
    },
    {
      label: "價格更新",
      status: qualityToExecutionStatus(priceFreshnessStatus),
      value: diagnostics?.priceSummary.latest_date ?? "--",
      target: "3 天內通過，10 天以上暫停",
      owner: cleanRiskOwner,
      action: priceFreshnessStatus === "risk" ? "重新跑 daily_prices 更新流程" : priceFreshnessStatus === "watch" ? "確認今日批次是否完成" : "價格資料可支援分析",
    },
    {
      label: "匯率更新",
      status: qualityToExecutionStatus(fxFreshnessStatus),
      value: diagnostics?.fxSummary.latest_date ?? "--",
      target: "3 天內通過，10 天以上暫停",
      owner: cleanRiskOwner,
      action: fxFreshnessStatus === "risk" ? "重新跑 daily_fx 更新流程" : fxFreshnessStatus === "watch" ? "確認匯率批次是否完成" : "匯率資料可支援換算",
    },
    {
      label: "商品覆蓋",
      status: qualityToExecutionStatus(symbolCoverageStatus),
      value: `${formatCount(diagnostics?.priceSummary.symbol_count)} 檔`,
      target: "50 檔以上通過，10 檔以下暫停",
      owner: cleanRiskOwner,
      action: symbolCoverageStatus === "risk" ? "補齊商品清單或檢查匯入程式" : "覆蓋率可用，持續追蹤新增商品",
    },
    {
      label: "價格深度",
      status: qualityToExecutionStatus(priceDepthStatus),
      value: `${formatCount(diagnostics?.priceSummary.row_count)} 筆`,
      target: "50,000 筆以上通過，5,000 筆以下暫停",
      owner: cleanRiskOwner,
      action: priceDepthStatus === "risk" ? "重新跑歷史價格 backfill" : "歷史深度可支援目前分析",
    },
    {
      label: "落後商品",
      status: diagnostics ? qualityToExecutionStatus(staleSymbolStatus) : "watch",
      value: `${staleSymbols.length} 檔`,
      target: "應為 0；5 檔以上暫停",
      owner: cleanRiskOwner,
      action: staleSymbols.length ? "優先補跑落後商品，再確認最新交易日" : "未偵測到落後商品",
    },
    {
      label: "匯率幣別",
      status: diagnostics ? qualityToExecutionStatus(fxCurrencyStatus) : "watch",
      value: `${fxCurrencies.length} 組`,
      target: "至少 2 組主要幣別",
      owner: cleanRiskOwner,
      action: fxCurrencies.length ? "確認主要交易幣別已覆蓋" : "補齊 daily_fx 幣別資料",
    },
  ];
}

function buildDataPipelineTableSnapshots({
  diagnostics,
  priceFreshnessDays,
  fxFreshnessDays,
  priceStatus,
  fxStatus,
  riskOwner,
}: {
  diagnostics?: BigQueryMarketDiagnostics;
  priceFreshnessDays: number | null;
  fxFreshnessDays: number | null;
  priceStatus: ExecutionReviewStatus;
  fxStatus: ExecutionReviewStatus;
  riskOwner: string;
}): DataPipelineTableSnapshot[] {
  const cleanRiskOwner = riskOwner.trim() || "風控";

  if (!diagnostics) {
    return [
      {
        table: "daily_prices",
        status: "watch",
        latestDate: "--",
        rowCount: "--",
        coverage: "--",
        freshness: "--",
        owner: cleanRiskOwner,
        action: "等待 BigQuery 診斷資料",
      },
      {
        table: "daily_fx",
        status: "watch",
        latestDate: "--",
        rowCount: "--",
        coverage: "--",
        freshness: "--",
        owner: cleanRiskOwner,
        action: "等待 BigQuery 診斷資料",
      },
    ];
  }

  return [
    {
      table: "daily_prices",
      status: priceStatus,
      latestDate: diagnostics.priceSummary.latest_date ?? "--",
      rowCount: `${formatCount(diagnostics.priceSummary.row_count)} 筆`,
      coverage: `${formatCount(diagnostics.priceSummary.symbol_count)} 檔`,
      freshness: priceFreshnessDays === null ? "--" : `${priceFreshnessDays} 天`,
      owner: cleanRiskOwner,
      action: priceStatus === "block" ? "暫停正式分析，先補價格資料" : priceStatus === "watch" ? "確認當日批次與落後商品" : "可支援目前分析",
    },
    {
      table: "daily_fx",
      status: fxStatus,
      latestDate: diagnostics.fxSummary.latest_date ?? "--",
      rowCount: `${formatCount(diagnostics.fxSummary.row_count)} 筆`,
      coverage: `${formatCount(diagnostics.fxSummary.currency_count)} 組`,
      freshness: fxFreshnessDays === null ? "--" : `${fxFreshnessDays} 天`,
      owner: cleanRiskOwner,
      action: fxStatus === "block" ? "暫停跨幣別換算，先補匯率資料" : fxStatus === "watch" ? "確認匯率批次是否完成" : "可支援目前換算",
    },
  ];
}

function dataPipelineCsv({
  healthItems,
  tableSnapshots,
  staleSymbols,
  fxCurrencies,
}: {
  healthItems: DataPipelineHealthItem[];
  tableSnapshots: DataPipelineTableSnapshot[];
  staleSymbols: BigQueryStaleSymbol[];
  fxCurrencies: BigQueryFxCurrency[];
}) {
  const header = ["section", "name", "status", "value", "target", "owner", "action"];
  const healthRows = healthItems.map((item) => [
    "health",
    item.label,
    executionReviewLabel(item.status),
    item.value,
    item.target,
    item.owner,
    item.action,
  ]);
  const snapshotRows = tableSnapshots.map((item) => [
    "table",
    item.table,
    executionReviewLabel(item.status),
    `${item.latestDate} / ${item.rowCount} / ${item.coverage}`,
    item.freshness,
    item.owner,
    item.action,
  ]);
  const staleRows = staleSymbols.map((symbol) => {
    const staleDays = symbol.stale_days ?? daysSinceDate(symbol.latest_date);
    return [
      "stale_symbol",
      symbol.symbol,
      executionReviewLabel(staleSymbolExecutionStatus(staleDays)),
      symbol.latest_date ?? "--",
      staleDays === null ? "--" : `${staleDays} days`,
      "",
      `${formatCount(symbol.row_count)} rows`,
    ];
  });
  const fxRows = fxCurrencies.map((currency) => [
    "fx_currency",
    currency.currency,
    qualityLabel(freshnessStatus(daysSinceDate(currency.latest_date))),
    currency.latest_date ?? "--",
    `${formatCount(currency.row_count)} rows`,
    "",
    "",
  ]);

  return [header, ...healthRows, ...snapshotRows, ...staleRows, ...fxRows]
    .map((row) => row.map(csvCell).join(","))
    .join("\n");
}

function buildDataContractItem({
  check,
  layer,
  freshness,
  volume,
  freshnessStatusValue,
  owner,
}: {
  check: BigQuerySchemaCheck;
  layer: string;
  freshness: string;
  volume: string;
  freshnessStatusValue: QualityStatus;
  owner: string;
}): DataContractItem {
  const schemaStatusValue: ExecutionReviewStatus = check.isReady ? "pass" : "block";
  const status = combinedExecutionStatus([schemaStatusValue, qualityToExecutionStatus(freshnessStatusValue)]);

  return {
    table: check.tableName,
    layer,
    status,
    requiredColumns: check.requiredColumns,
    presentColumns: check.presentColumns,
    missingColumns: check.missingColumns,
    freshness,
    volume,
    owner,
    action: check.isReady
      ? status === "pass"
        ? "欄位合約與更新狀態可用"
        : "欄位合約可用，但需確認更新批次"
      : `補齊欄位：${check.missingColumns.join(", ") || "--"}`,
  };
}

function buildDataContractItems({
  diagnostics,
  priceFreshnessDays,
  fxFreshnessDays,
  priceFreshnessStatus,
  fxFreshnessStatus,
  riskOwner,
}: {
  diagnostics?: BigQueryMarketDiagnostics;
  priceFreshnessDays: number | null;
  fxFreshnessDays: number | null;
  priceFreshnessStatus: QualityStatus;
  fxFreshnessStatus: QualityStatus;
  riskOwner: string;
}): DataContractItem[] {
  const cleanRiskOwner = riskOwner.trim() || "風控";
  if (!diagnostics) return [];

  return [
    buildDataContractItem({
      check: diagnostics.schemaChecks.priceTable,
      layer: "價格事實表",
      freshness: priceFreshnessDays === null ? "--" : `${priceFreshnessDays} 天`,
      volume: `${formatCount(diagnostics.priceSummary.row_count)} rows / ${formatCount(diagnostics.priceSummary.symbol_count)} symbols`,
      freshnessStatusValue: priceFreshnessStatus,
      owner: cleanRiskOwner,
    }),
    buildDataContractItem({
      check: diagnostics.schemaChecks.fxTable,
      layer: "匯率事實表",
      freshness: fxFreshnessDays === null ? "--" : `${fxFreshnessDays} 天`,
      volume: `${formatCount(diagnostics.fxSummary.row_count)} rows / ${formatCount(diagnostics.fxSummary.currency_count)} currencies`,
      freshnessStatusValue: fxFreshnessStatus,
      owner: cleanRiskOwner,
    }),
  ];
}

function dataContractCsv(rows: DataContractItem[]) {
  const header = ["table", "layer", "status", "required_columns", "present_columns", "missing_columns", "freshness", "volume", "owner", "action"];
  const csvRows = rows.map((row) => [
    row.table,
    row.layer,
    executionReviewLabel(row.status),
    row.requiredColumns.join("|"),
    row.presentColumns.join("|"),
    row.missingColumns.join("|"),
    row.freshness,
    row.volume,
    row.owner,
    row.action,
  ]);

  return [header, ...csvRows].map((row) => row.map(csvCell).join(",")).join("\n");
}

function buildCoverageUniverseItems({
  diagnostics,
  staleSymbols,
  fxCurrencies,
  symbolCoverageStatus,
  priceDepthStatus,
  fxCurrencyStatus,
  riskOwner,
}: {
  diagnostics?: BigQueryMarketDiagnostics;
  staleSymbols: BigQueryStaleSymbol[];
  fxCurrencies: BigQueryFxCurrency[];
  symbolCoverageStatus: QualityStatus;
  priceDepthStatus: QualityStatus;
  fxCurrencyStatus: QualityStatus;
  riskOwner: string;
}): CoverageUniverseItem[] {
  const cleanRiskOwner = riskOwner.trim() || "風控";
  if (!diagnostics) return [];

  const staleStatus: ExecutionReviewStatus = staleSymbols.length >= 5 ? "block" : staleSymbols.length > 0 ? "watch" : "pass";
  const staleCoverage = staleSymbols.length
    ? staleSymbols
        .slice(0, 5)
        .map((symbol) => `${symbol.symbol}:${symbol.stale_days ?? daysSinceDate(symbol.latest_date) ?? "--"}d`)
        .join(", ")
    : "未偵測到落後商品";
  const fxCoverage = fxCurrencies.length
    ? fxCurrencies
        .slice(0, 8)
        .map((currency) => currency.currency)
        .join(", ")
    : "--";

  return [
    {
      label: "可分析商品宇宙",
      status: qualityToExecutionStatus(symbolCoverageStatus),
      count: `${formatCount(diagnostics.priceSummary.symbol_count)} 檔`,
      target: "50 檔以上進入研究池",
      coverage: `${formatCount(diagnostics.recentSymbols.length)} 檔近期樣本`,
      owner: cleanRiskOwner,
      action:
        symbolCoverageStatus === "risk"
          ? "先補商品清單與價格匯入，避免研究池過窄"
          : symbolCoverageStatus === "watch"
            ? "擴充 ETF / 股票 / 債券商品清單"
            : "可支援第一版研究宇宙",
    },
    {
      label: "歷史價格深度",
      status: qualityToExecutionStatus(priceDepthStatus),
      count: `${formatCount(diagnostics.priceSummary.row_count)} 筆`,
      target: "50,000 筆以上支援回測",
      coverage: `${diagnostics.priceSummary.first_date ?? "--"} ~ ${diagnostics.priceSummary.latest_date ?? "--"}`,
      owner: cleanRiskOwner,
      action: priceDepthStatus === "risk" ? "重新跑歷史價格 backfill" : "歷史深度可支援目前分析",
    },
    {
      label: "落後商品清理",
      status: staleStatus,
      count: `${staleSymbols.length} 檔`,
      target: "落後商品 0 檔",
      coverage: staleCoverage,
      owner: cleanRiskOwner,
      action: staleSymbols.length ? "優先補跑落後商品，避免模型拿到過期價格" : "維持每日批次監控",
    },
    {
      label: "跨幣別覆蓋",
      status: qualityToExecutionStatus(fxCurrencyStatus),
      count: `${fxCurrencies.length} 組`,
      target: "至少 2 組主要幣別",
      coverage: fxCoverage,
      owner: cleanRiskOwner,
      action: fxCurrencyStatus === "risk" ? "補齊 daily_fx 幣別與歷史資料" : "可支援基本跨幣別換算",
    },
  ];
}

function coverageUniverseCsv(rows: CoverageUniverseItem[]) {
  const header = ["label", "status", "count", "target", "coverage", "owner", "action"];
  const csvRows = rows.map((row) => [
    row.label,
    executionReviewLabel(row.status),
    row.count,
    row.target,
    row.coverage,
    row.owner,
    row.action,
  ]);

  return [header, ...csvRows].map((row) => row.map(csvCell).join(",")).join("\n");
}

function sourceRemediationStatus(status: MarketSourceStatus): ExecutionReviewStatus {
  if (status === "needs_secret") return "block";
  if (status === "batch_only" || status === "local_only") return "watch";
  return "pass";
}

function buildDataRemediationItems({
  sources,
  dataPipelineHealthItems,
  dataContractItems,
  coverageUniverseItems,
  riskOwner,
}: {
  sources: MarketSource[];
  dataPipelineHealthItems: DataPipelineHealthItem[];
  dataContractItems: DataContractItem[];
  coverageUniverseItems: CoverageUniverseItem[];
  riskOwner: string;
}): DataRemediationItem[] {
  const cleanRiskOwner = riskOwner.trim() || "風控";
  const sourceItems: DataRemediationItem[] = sources.flatMap((source) => {
      const status = sourceRemediationStatus(source.status);
      if (status === "pass") return [];

      return [{
        source: "資料源接線",
        item: source.name,
        status,
        priority: marketAlertPriorityFromStatus(status),
        owner: cleanRiskOwner,
        evidence: `${source.provider} / ${source.currentStorage}`,
        impact: source.status === "needs_secret" ? "資料源尚未可用" : "資料仍依賴批次或本機流程",
        action: source.nextAction || source.integrationPath,
      }];
    });
  const pipelineItems = dataPipelineHealthItems
    .filter((item) => item.status !== "pass")
    .map((item) => ({
      source: "資料管線",
      item: item.label,
      status: item.status,
      priority: marketAlertPriorityFromStatus(item.status),
      owner: item.owner,
      evidence: `${item.value} / ${item.target}`,
      impact: item.status === "block" ? "暫停正式分析或回測" : "需要追蹤下一次批次",
      action: item.action,
    }));
  const contractItems = dataContractItems
    .filter((item) => item.status !== "pass")
    .map((item) => ({
      source: "資料合約",
      item: item.table,
      status: item.status,
      priority: marketAlertPriorityFromStatus(item.status),
      owner: item.owner,
      evidence: item.missingColumns.length ? `缺欄位 ${item.missingColumns.join(", ")}` : item.freshness,
      impact: item.status === "block" ? "API 或分析計算可能失效" : "欄位可用但更新狀態需觀察",
      action: item.action,
    }));
  const coverageItems = coverageUniverseItems
    .filter((item) => item.status !== "pass")
    .map((item) => ({
      source: "可投資宇宙",
      item: item.label,
      status: item.status,
      priority: marketAlertPriorityFromStatus(item.status),
      owner: item.owner,
      evidence: `${item.count} / ${item.target}`,
      impact: item.status === "block" ? "研究宇宙不足或資料過期" : "研究宇宙仍需擴充",
      action: item.action,
    }));
  const priorityRank: Record<ExecutionHandoffPriority, number> = { high: 0, medium: 1, low: 2 };
  const statusRank: Record<ExecutionReviewStatus, number> = { block: 0, watch: 1, pass: 2 };

  return [...sourceItems, ...pipelineItems, ...contractItems, ...coverageItems]
    .sort(
      (left, right) =>
        priorityRank[left.priority] - priorityRank[right.priority] ||
        statusRank[left.status] - statusRank[right.status] ||
        left.source.localeCompare(right.source, "zh-Hant") ||
        left.item.localeCompare(right.item, "zh-Hant"),
    )
    .slice(0, 40);
}

function dataRemediationCsv(rows: DataRemediationItem[]) {
  const header = ["source", "item", "priority", "status", "owner", "evidence", "impact", "action"];
  const csvRows = rows.map((row) => [
    row.source,
    row.item,
    executionHandoffPriorityLabel(row.priority),
    executionReviewLabel(row.status),
    row.owner,
    row.evidence,
    row.impact,
    row.action,
  ]);

  return [header, ...csvRows].map((row) => row.map(csvCell).join(",")).join("\n");
}

function buildDataLineageItems({
  sources,
  dataPipelineTableSnapshots,
  dataContractItems,
  coverageUniverseItems,
  dataRemediationItems,
  riskOwner,
  decisionOwner,
}: {
  sources: MarketSource[];
  dataPipelineTableSnapshots: DataPipelineTableSnapshot[];
  dataContractItems: DataContractItem[];
  coverageUniverseItems: CoverageUniverseItem[];
  dataRemediationItems: DataRemediationItem[];
  riskOwner: string;
  decisionOwner: string;
}): DataLineageItem[] {
  const cleanRiskOwner = riskOwner.trim() || "風控";
  const cleanDecisionOwner = decisionOwner.trim() || "研究";
  const sourceStatuses = sources.map((source) => sourceRemediationStatus(source.status));
  const sourceDecision = sourceStatuses.length ? combinedExecutionStatus(sourceStatuses) : "watch";
  const readySourceCount = sources.filter((source) => source.status === "ready").length;
  const highRemediationCount = dataRemediationItems.filter((item) => item.priority === "high").length;
  const mediumRemediationCount = dataRemediationItems.filter((item) => item.priority === "medium").length;
  const productStatus: ExecutionReviewStatus =
    highRemediationCount > 0 ? "block" : mediumRemediationCount > 0 ? "watch" : "pass";

  const sourceNode: DataLineageItem = {
    stage: "來源接線",
    node: "外部資料源",
    status: sourceDecision,
    input: `${sources.length} sources`,
    output: `${readySourceCount}/${sources.length} ready`,
    owner: cleanRiskOwner,
    evidence: sources.length ? sources.map((source) => `${source.name}:${statusMeta[source.status].label}`).join(" / ") : "--",
    action: sourceDecision === "pass" ? "維持資料源憑證與批次紀錄" : "優先處理需環境變數或批次接線的資料源",
  };
  const warehouseNodes = dataPipelineTableSnapshots.map((item) => ({
    stage: "倉儲表",
    node: item.table,
    status: item.status,
    input: "BigQuery dataset",
    output: `${item.rowCount} / ${item.coverage}`,
    owner: item.owner,
    evidence: `${item.latestDate} / ${item.freshness}`,
    action: item.action,
  }));
  const contractNodes = dataContractItems.map((item) => ({
    stage: "資料合約",
    node: item.table,
    status: item.status,
    input: item.layer,
    output: `${item.presentColumns.length}/${item.requiredColumns.length} columns`,
    owner: item.owner,
    evidence: item.missingColumns.length ? `缺 ${item.missingColumns.join(", ")}` : item.freshness,
    action: item.action,
  }));
  const universeNodes = coverageUniverseItems.map((item) => ({
    stage: "研究宇宙",
    node: item.label,
    status: item.status,
    input: item.target,
    output: item.count,
    owner: item.owner,
    evidence: item.coverage,
    action: item.action,
  }));
  const remediationNode: DataLineageItem = {
    stage: "營運修復",
    node: "資料缺口佇列",
    status: dataRemediationItems.length ? combinedExecutionStatus(dataRemediationItems.map((item) => item.status)) : "pass",
    input: "來源 / 管線 / 合約 / 研究宇宙",
    output: `高 ${highRemediationCount} / 中 ${mediumRemediationCount}`,
    owner: cleanRiskOwner,
    evidence: dataRemediationItems.length ? `${dataRemediationItems.length} 項待處理` : "無待處理缺口",
    action: dataRemediationItems.length ? "依優先級關閉資料缺口" : "維持每日監控",
  };
  const productNode: DataLineageItem = {
    stage: "分析產品",
    node: "商品主檔 / Watchlist / 投組引擎",
    status: productStatus,
    input: "資料合約 + 研究宇宙",
    output: "商品分析、研究摘要、投組分析",
    owner: cleanDecisionOwner,
    evidence: productStatus === "pass" ? "資料鏈可支援前端分析" : "仍有資料缺口影響產品輸出",
    action: productStatus === "pass" ? "可進入模型與客戶視圖擴充" : "先處理高 / 中優先資料缺口",
  };

  return [sourceNode, ...warehouseNodes, ...contractNodes, ...universeNodes, remediationNode, productNode];
}

function dataLineageCsv(rows: DataLineageItem[]) {
  const header = ["stage", "node", "status", "input", "output", "owner", "evidence", "action"];
  const csvRows = rows.map((row) => [
    row.stage,
    row.node,
    executionReviewLabel(row.status),
    row.input,
    row.output,
    row.owner,
    row.evidence,
    row.action,
  ]);

  return [header, ...csvRows].map((row) => row.map(csvCell).join(",")).join("\n");
}

function buildDataProductCatalogItems({
  dataReadinessDecision,
  coverageUniverseDecision,
  dataRemediationDecision,
  dataLineageDecision,
  marketAlertDecision,
  comparisonRows,
  visibleComparisonRows,
  activeAllocationRows,
  tradeTickets,
  dataRemediationItems,
  riskOwner,
  decisionOwner,
}: {
  dataReadinessDecision: ExecutionReviewStatus;
  coverageUniverseDecision: ExecutionReviewStatus;
  dataRemediationDecision: ExecutionReviewStatus;
  dataLineageDecision: ExecutionReviewStatus;
  marketAlertDecision: ExecutionReviewStatus;
  comparisonRows: AssetComparisonRow[];
  visibleComparisonRows: AssetComparisonRow[];
  activeAllocationRows: AllocationDraftRow[];
  tradeTickets: TradeTicketRow[];
  dataRemediationItems: DataRemediationItem[];
  riskOwner: string;
  decisionOwner: string;
}): DataProductCatalogItem[] {
  const cleanRiskOwner = riskOwner.trim() || "風控";
  const cleanDecisionOwner = decisionOwner.trim() || "研究";
  const researchStatus: ExecutionReviewStatus = comparisonRows.length
    ? combinedExecutionStatus([dataReadinessDecision, coverageUniverseDecision])
    : "watch";
  const portfolioStatus: ExecutionReviewStatus = activeAllocationRows.length
    ? combinedExecutionStatus([researchStatus, dataLineageDecision])
    : "watch";
  const operationsStatus: ExecutionReviewStatus = dataRemediationItems.some((item) => item.priority === "high")
    ? "block"
    : dataRemediationItems.length
      ? "watch"
      : "pass";

  return [
    {
      product: "市場資料 API",
      category: "資料服務",
      status: dataReadinessDecision,
      owner: cleanRiskOwner,
      consumer: "前端分析 / 投組引擎",
      input: "BigQuery daily_prices / daily_fx",
      output: "商品搜尋、商品主檔、價格序列",
      serviceLevel: "T+1 更新，schema 必要欄位完整",
      evidence: `資料準備狀態：${executionReviewLabel(dataReadinessDecision)}`,
      action: dataReadinessDecision === "pass" ? "可支援前端資料讀取" : "先處理資料管線與合約缺口",
    },
    {
      product: "商品主檔分析",
      category: "研究工具",
      status: dataReadinessDecision,
      owner: cleanDecisionOwner,
      consumer: "研究 / 顧問",
      input: "市場資料 API",
      output: "報酬、波動、回撤、近期價格",
      serviceLevel: "單商品即時查詢，使用 BigQuery 歷史價格",
      evidence: "支援 adjusted / raw 價格口徑",
      action: dataReadinessDecision === "pass" ? "可擴充估值、配息與基本面欄位" : "先確保價格資料可讀取",
    },
    {
      product: "Watchlist 研究摘要",
      category: "研究產品",
      status: researchStatus,
      owner: cleanDecisionOwner,
      consumer: "投委會 / 客戶報告",
      input: "商品主檔分析 + 研究宇宙",
      output: "候選名單、風險摘要、Markdown memo",
      serviceLevel: "研究清單需有可比較商品",
      evidence: `${visibleComparisonRows.length}/${comparisonRows.length} 檔符合目前篩選`,
      action: comparisonRows.length ? "可依研究模板匯出 memo" : "先載入 watchlist 商品比較",
    },
    {
      product: "投組分析與最佳化",
      category: "投組工具",
      status: portfolioStatus,
      owner: cleanDecisionOwner,
      consumer: "投資決策 / 再平衡",
      input: "Watchlist 研究摘要",
      output: "配置草案、風險預算、交易清單",
      serviceLevel: "至少一檔有效配置才能產生投組輸出",
      evidence: `${activeAllocationRows.length} 檔配置 / ${tradeTickets.length} 張交易票`,
      action: activeAllocationRows.length ? "可進入簽核與交易流程" : "先產生有效配置",
    },
    {
      product: "市場警示中心",
      category: "營運監控",
      status: marketAlertDecision,
      owner: cleanRiskOwner,
      consumer: "資料營運 / 風控",
      input: "資料品質、KRI、SLA、例外、血緣",
      output: "可分派警示事件",
      serviceLevel: "高優先事件需先關閉",
      evidence: `警示狀態：${executionReviewLabel(marketAlertDecision)}`,
      action: marketAlertDecision === "pass" ? "維持日常監控" : "依優先級關閉警示",
    },
    {
      product: "資料營運控制台",
      category: "平台治理",
      status: operationsStatus,
      owner: cleanRiskOwner,
      consumer: "資料工程 / 平台管理",
      input: "管線、合約、研究宇宙、血緣",
      output: "修復佇列、血緣 CSV、營運 CSV",
      serviceLevel: "高優先缺口不得進入正式分析",
      evidence: `${dataRemediationItems.length} 項資料缺口`,
      action: dataRemediationDecision === "pass" ? "可進入資料產品擴充" : "先清理資料缺口修復佇列",
    },
    {
      product: "資料血緣與產品目錄",
      category: "平台治理",
      status: dataLineageDecision,
      owner: cleanRiskOwner,
      consumer: "內部審計 / 平台管理",
      input: "資料血緣地圖",
      output: "資料產品清單、依賴與服務等級",
      serviceLevel: "每個資料產品需有 owner、輸入、輸出與動作",
      evidence: `血緣狀態：${executionReviewLabel(dataLineageDecision)}`,
      action: dataLineageDecision === "pass" ? "可作為平台治理基準" : "先修復阻斷或觀察節點",
    },
  ];
}

function dataProductCatalogCsv(rows: DataProductCatalogItem[]) {
  const header = ["product", "category", "status", "owner", "consumer", "input", "output", "service_level", "evidence", "action"];
  const csvRows = rows.map((row) => [
    row.product,
    row.category,
    executionReviewLabel(row.status),
    row.owner,
    row.consumer,
    row.input,
    row.output,
    row.serviceLevel,
    row.evidence,
    row.action,
  ]);

  return [header, ...csvRows].map((row) => row.map(csvCell).join(",")).join("\n");
}

function buildApiServiceCatalogItems({
  dataReadinessDecision,
  dataProductCatalogDecision,
  dataLineageDecision,
  dataRemediationDecision,
  hasBigQueryCredentials,
  comparisonRows,
  activeAllocationRows,
  tradeTickets,
  riskOwner,
  decisionOwner,
}: {
  dataReadinessDecision: ExecutionReviewStatus;
  dataProductCatalogDecision: ExecutionReviewStatus;
  dataLineageDecision: ExecutionReviewStatus;
  dataRemediationDecision: ExecutionReviewStatus;
  hasBigQueryCredentials: boolean;
  comparisonRows: AssetComparisonRow[];
  activeAllocationRows: AllocationDraftRow[];
  tradeTickets: TradeTicketRow[];
  riskOwner: string;
  decisionOwner: string;
}): ApiServiceCatalogItem[] {
  const cleanRiskOwner = riskOwner.trim() || "風控";
  const cleanDecisionOwner = decisionOwner.trim() || "研究";
  const warehouseStatus: ExecutionReviewStatus = hasBigQueryCredentials ? dataReadinessDecision : "block";
  const portfolioStatus: ExecutionReviewStatus = activeAllocationRows.length
    ? combinedExecutionStatus([dataReadinessDecision, dataLineageDecision])
    : "watch";
  const productStatus: ExecutionReviewStatus = combinedExecutionStatus([dataProductCatalogDecision, dataRemediationDecision]);

  return [
    {
      method: "GET",
      endpoint: "/api/v1/market/sources",
      product: "資料源狀態",
      status: "pass",
      owner: cleanRiskOwner,
      consumer: "平台管理 / 前端",
      input: "Market source 設定",
      output: "資料源清單、接入方式、缺少金鑰",
      serviceLevel: "每次載入平台時可讀",
      action: "維持資料源盤點與金鑰狀態同步",
    },
    {
      method: "GET",
      endpoint: "/api/v1/market/bigquery/status",
      product: "BigQuery 連線狀態",
      status: hasBigQueryCredentials ? "pass" : "block",
      owner: cleanRiskOwner,
      consumer: "平台管理 / 資料工程",
      input: "Vercel 環境變數",
      output: "project、dataset、table、credential 狀態",
      serviceLevel: "部署後需立即可檢查",
      action: hasBigQueryCredentials ? "可進入資料表診斷" : "先補齊 GCP_SERVICE_ACCOUNT_JSON 與 BigQuery 變數",
    },
    {
      method: "GET",
      endpoint: "/api/v1/market/bigquery/diagnostics",
      product: "資料倉儲診斷",
      status: warehouseStatus,
      owner: cleanRiskOwner,
      consumer: "資料營運 / 風控",
      input: "daily_prices / daily_fx",
      output: "schema、freshness、coverage、stale symbols",
      serviceLevel: "每日批次完成後更新",
      action: warehouseStatus === "pass" ? "可作為分析前健康檢查" : "先排除 BigQuery 憑證或資料品質問題",
    },
    {
      method: "GET",
      endpoint: "/api/v1/market/bigquery/assets",
      product: "商品搜尋",
      status: warehouseStatus,
      owner: cleanDecisionOwner,
      consumer: "研究 / 顧問",
      input: "查詢文字、limit",
      output: "商品代碼、名稱、交易所、幣別、最新日",
      serviceLevel: "互動查詢需穩定回應",
      action: warehouseStatus === "pass" ? "可擴充資產類別與地區篩選" : "先確保商品資料可讀",
    },
    {
      method: "GET",
      endpoint: "/api/v1/market/bigquery/assets/:symbol",
      product: "商品主檔分析",
      status: warehouseStatus,
      owner: cleanDecisionOwner,
      consumer: "研究 / 投委會",
      input: "symbol、price_basis、lookback",
      output: "報酬、波動、回撤、價格序列",
      serviceLevel: "單商品查詢需回傳可解釋品質欄位",
      action: warehouseStatus === "pass" ? "可接基本面與配息欄位" : "先補齊價格序列",
    },
    {
      method: "POST",
      endpoint: "/api/v1/portfolio/analyze-bigquery",
      product: "投組分析",
      status: comparisonRows.length ? portfolioStatus : "watch",
      owner: cleanDecisionOwner,
      consumer: "投資決策 / 顧問",
      input: "watchlist、權重、價格口徑",
      output: "投組風險、績效、商品比較、決策摘要",
      serviceLevel: "至少一組可比較商品才能產生有效分析",
      action: comparisonRows.length ? "可進入模型配置與 memo 輸出" : "先載入 watchlist 比較資料",
    },
    {
      method: "POST",
      endpoint: "/api/v1/portfolio/optimize-bigquery",
      product: "AI 調倉最佳化",
      status: activeAllocationRows.length ? portfolioStatus : "watch",
      owner: cleanDecisionOwner,
      consumer: "再平衡 / 投委會",
      input: "候選商品、風險限制、本金、單檔上限",
      output: "最佳化權重、交易票、風險預算",
      serviceLevel: "阻斷資料缺口不得產生正式建議",
      action: activeAllocationRows.length ? "可進入交易前審查" : "先產生有效配置草案",
    },
    {
      method: "GET",
      endpoint: "/api/v1/platform/data-products",
      product: "資料產品目錄",
      status: productStatus,
      owner: cleanRiskOwner,
      consumer: "平台管理 / 內部審計",
      input: "資料產品、血緣、修復佇列",
      output: "產品 owner、使用者、輸入輸出、SLA",
      serviceLevel: "每次資料產品變更後更新",
      action: productStatus === "pass" ? "可作為平台治理基準" : "先處理資料目錄或修復佇列缺口",
    },
    {
      method: "GET",
      endpoint: "/api/v1/trading/tickets",
      product: "交易票查詢",
      status: tradeTickets.length ? portfolioStatus : "watch",
      owner: cleanDecisionOwner,
      consumer: "交易 / 營運",
      input: "配置草案、再平衡門檻、最小交易金額",
      output: "交易方向、金額、現金影響、批次",
      serviceLevel: "送交交易前需有審核軌跡",
      action: tradeTickets.length ? "可進入執行交接" : "先建立交易票與批次規則",
    },
  ];
}

function apiServiceCatalogCsv(rows: ApiServiceCatalogItem[]) {
  const header = ["method", "endpoint", "product", "status", "owner", "consumer", "input", "output", "service_level", "action"];
  const csvRows = rows.map((row) => [
    row.method,
    row.endpoint,
    row.product,
    executionReviewLabel(row.status),
    row.owner,
    row.consumer,
    row.input,
    row.output,
    row.serviceLevel,
    row.action,
  ]);

  return [header, ...csvRows].map((row) => row.map(csvCell).join(",")).join("\n");
}

function apiContractStabilityLabel(stability: ApiContractBlueprintItem["stability"]) {
  if (stability === "stable") return "Stable";
  if (stability === "beta") return "Beta";
  return "Draft";
}

function apiContractStabilityClass(stability: ApiContractBlueprintItem["stability"]) {
  if (stability === "stable") return "border-emerald-500/40 bg-emerald-500/10 text-emerald-300";
  if (stability === "beta") return "border-sky-500/40 bg-sky-500/10 text-sky-300";
  return "border-amber-500/40 bg-amber-500/10 text-amber-300";
}

function buildApiContractBlueprintItems({
  apiServiceCatalogItems,
  hasBigQueryCredentials,
  riskOwner,
  decisionOwner,
}: {
  apiServiceCatalogItems: ApiServiceCatalogItem[];
  hasBigQueryCredentials: boolean;
  riskOwner: string;
  decisionOwner: string;
}): ApiContractBlueprintItem[] {
  const cleanRiskOwner = riskOwner.trim() || "風控";
  const cleanDecisionOwner = decisionOwner.trim() || "研究";
  const serviceByEndpoint = new Map(apiServiceCatalogItems.map((item) => [item.endpoint, item]));
  const serviceStatus = (endpoint: string): ExecutionReviewStatus => serviceByEndpoint.get(endpoint)?.status ?? "watch";

  return [
    {
      method: "GET",
      endpoint: "/api/v1/market/sources",
      product: "資料源狀態",
      version: "v1",
      auth: "public-read",
      requestSchema: "none",
      responseSchema: "MarketSource[]",
      stability: "stable",
      status: serviceStatus("/api/v1/market/sources"),
      owner: cleanRiskOwner,
      breakingRisk: "低：只新增資料源欄位時可向後相容",
      action: "維持欄位向後相容，新增欄位需設 optional",
    },
    {
      method: "GET",
      endpoint: "/api/v1/market/bigquery/status",
      product: "BigQuery 連線狀態",
      version: "v1",
      auth: "server-env",
      requestSchema: "none",
      responseSchema: "BigQueryConnectionStatus",
      stability: "stable",
      status: hasBigQueryCredentials ? serviceStatus("/api/v1/market/bigquery/status") : "block",
      owner: cleanRiskOwner,
      breakingRisk: "中：credential 欄位命名會影響前端提示",
      action: hasBigQueryCredentials ? "可作為部署後 health check" : "先補齊 Vercel BigQuery 環境變數",
    },
    {
      method: "GET",
      endpoint: "/api/v1/market/bigquery/diagnostics",
      product: "資料倉儲診斷",
      version: "v1",
      auth: "service-account",
      requestSchema: "none",
      responseSchema: "BigQueryDiagnostics",
      stability: "beta",
      status: serviceStatus("/api/v1/market/bigquery/diagnostics"),
      owner: cleanRiskOwner,
      breakingRisk: "中：schemaChecks 與 summary 欄位需維持",
      action: "新增診斷項目時用 optional 欄位，避免破壞既有頁面",
    },
    {
      method: "GET",
      endpoint: "/api/v1/market/bigquery/assets",
      product: "商品搜尋",
      version: "v1",
      auth: "service-account",
      requestSchema: "{ query: string; limit?: number }",
      responseSchema: "{ assets: AssetSearchResult[] }",
      stability: "beta",
      status: serviceStatus("/api/v1/market/bigquery/assets"),
      owner: cleanDecisionOwner,
      breakingRisk: "中：symbol、name、currency 欄位不可改名",
      action: "下一步可加 asset_class、region、exchange 篩選",
    },
    {
      method: "GET",
      endpoint: "/api/v1/market/bigquery/assets/:symbol",
      product: "商品主檔分析",
      version: "v1",
      auth: "service-account",
      requestSchema: "{ symbol: string; price_basis?: adjusted | raw; lookback?: number }",
      responseSchema: "AssetProfile",
      stability: "beta",
      status: serviceStatus("/api/v1/market/bigquery/assets/:symbol"),
      owner: cleanDecisionOwner,
      breakingRisk: "高：metrics 與 price series 是研究畫面核心依賴",
      action: "先凍結 metrics 命名，再擴充估值、配息與基本面",
    },
    {
      method: "POST",
      endpoint: "/api/v1/portfolio/analyze-bigquery",
      product: "投組分析",
      version: "v1",
      auth: "service-account",
      requestSchema: "PortfolioAnalyzeRequest",
      responseSchema: "PortfolioAnalysisResult",
      stability: "draft",
      status: serviceStatus("/api/v1/portfolio/analyze-bigquery"),
      owner: cleanDecisionOwner,
      breakingRisk: "高：投組風險欄位會影響 memo 與簽核資料",
      action: "把 request/response 固化後，再開放外部客戶或內部工具串接",
    },
    {
      method: "POST",
      endpoint: "/api/v1/portfolio/optimize-bigquery",
      product: "AI 調倉最佳化",
      version: "v1",
      auth: "service-account",
      requestSchema: "PortfolioOptimizeRequest",
      responseSchema: "PortfolioOptimizeResult",
      stability: "draft",
      status: serviceStatus("/api/v1/portfolio/optimize-bigquery"),
      owner: cleanDecisionOwner,
      breakingRisk: "高：權重、限制與交易票欄位不可無預警改版",
      action: "需補版本化限制條件與 optimizer policy，再進入正式建議",
    },
    {
      method: "GET",
      endpoint: "/api/v1/platform/data-products",
      product: "資料產品目錄",
      version: "v1",
      auth: "internal",
      requestSchema: "none",
      responseSchema: "DataProductCatalogItem[]",
      stability: "beta",
      status: serviceStatus("/api/v1/platform/data-products"),
      owner: cleanRiskOwner,
      breakingRisk: "中：owner、consumer、SLA 欄位需維持",
      action: "可接入權限控管與內部審計流程",
    },
    {
      method: "GET",
      endpoint: "/api/v1/trading/tickets",
      product: "交易票查詢",
      version: "v1",
      auth: "internal",
      requestSchema: "{ portfolio_id?: string; batch_id?: string }",
      responseSchema: "TradeTicketRow[]",
      stability: "draft",
      status: serviceStatus("/api/v1/trading/tickets"),
      owner: cleanDecisionOwner,
      breakingRisk: "高：交易方向、金額與現金影響欄位需可追溯",
      action: "接交易前審查與執行回填前，先建立欄位凍結規則",
    },
  ];
}

function apiContractBlueprintJson(rows: ApiContractBlueprintItem[]) {
  const paths = Object.fromEntries(
    rows.map((row) => {
      const endpoint = row.endpoint.replace(":symbol", "{symbol}");
      const method = row.method.toLowerCase();
      return [
        endpoint,
        {
          [method]: {
            summary: row.product,
            tags: [row.product],
            security: [{ [row.auth]: [] }],
            "x-version": row.version,
            "x-status": executionReviewLabel(row.status),
            "x-stability": apiContractStabilityLabel(row.stability),
            "x-owner": row.owner,
            "x-breaking-risk": row.breakingRisk,
            parameters: row.method === "GET" && row.requestSchema !== "none" ? [{ name: "request", in: "query", schema: { type: "object" } }] : [],
            requestBody:
              row.method === "POST"
                ? {
                    required: true,
                    description: row.requestSchema,
                    content: { "application/json": { schema: { type: "object" } } },
                  }
                : undefined,
            responses: {
              "200": {
                description: row.responseSchema,
                content: { "application/json": { schema: { type: "object" } } },
              },
            },
          },
        },
      ];
    }),
  );

  return JSON.stringify(
    {
      openapi: "3.1.0",
      info: {
        title: "Wealth Dashboard Platform API",
        version: "0.1.0",
        description: "Internal API blueprint for market data, portfolio analytics, data products, and trading workflow.",
      },
      paths,
    },
    null,
    2,
  );
}

function buildPlatformEntitlementItems({
  dataReadinessDecision,
  apiServiceCatalogDecision,
  apiContractBlueprintDecision,
  marketAlertDecision,
  hasBigQueryCredentials,
  comparisonRows,
  activeAllocationRows,
  tradeTickets,
  riskOwner,
  decisionOwner,
}: {
  dataReadinessDecision: ExecutionReviewStatus;
  apiServiceCatalogDecision: ExecutionReviewStatus;
  apiContractBlueprintDecision: ExecutionReviewStatus;
  marketAlertDecision: ExecutionReviewStatus;
  hasBigQueryCredentials: boolean;
  comparisonRows: AssetComparisonRow[];
  activeAllocationRows: AllocationDraftRow[];
  tradeTickets: TradeTicketRow[];
  riskOwner: string;
  decisionOwner: string;
}): PlatformEntitlementItem[] {
  const cleanRiskOwner = riskOwner.trim() || "風控";
  const cleanDecisionOwner = decisionOwner.trim() || "研究";
  const marketDataStatus: ExecutionReviewStatus = hasBigQueryCredentials ? dataReadinessDecision : "block";
  const portfolioStatus: ExecutionReviewStatus =
    comparisonRows.length && activeAllocationRows.length ? combinedExecutionStatus([dataReadinessDecision, apiContractBlueprintDecision]) : "watch";
  const governanceStatus = combinedExecutionStatus([apiServiceCatalogDecision, apiContractBlueprintDecision, marketAlertDecision]);

  return [
    {
      role: "訪客 / Demo",
      plan: "Free",
      dataScope: "公開資料源狀態與平台能力摘要",
      apiAccess: "/api/v1/market/sources",
      tools: "資料源狀態、平台導覽",
      exportRights: "不可匯出",
      approvalLimit: "無交易與投組權限",
      status: "pass",
      owner: cleanRiskOwner,
      evidence: "公開資訊不讀取 BigQuery 明細",
      action: "可作為 landing demo 與銷售入口",
    },
    {
      role: "註冊研究員",
      plan: "Pro",
      dataScope: "商品搜尋、商品主檔、價格與風險指標",
      apiAccess: "/api/v1/market/bigquery/assets, /api/v1/market/bigquery/assets/:symbol",
      tools: "商品搜尋、Watchlist、研究摘要",
      exportRights: "Markdown memo / 研究 CSV",
      approvalLimit: "不可送出交易票",
      status: marketDataStatus,
      owner: cleanDecisionOwner,
      evidence: hasBigQueryCredentials ? "BigQuery 憑證已設定" : "缺少 BigQuery 憑證",
      action: marketDataStatus === "pass" ? "可開放研究工作台" : "先補齊 BigQuery 金鑰與資料讀取",
    },
    {
      role: "投資顧問",
      plan: "Pro Plus",
      dataScope: "投組分析、模型配置、風險預算",
      apiAccess: "/api/v1/portfolio/analyze-bigquery, /api/v1/portfolio/optimize-bigquery",
      tools: "投組分析、最佳化、再平衡草案",
      exportRights: "投組 memo / 交易前檢核",
      approvalLimit: "可產生建議，不可直接執行",
      status: portfolioStatus,
      owner: cleanDecisionOwner,
      evidence: `${comparisonRows.length} 檔比較 / ${activeAllocationRows.length} 檔配置`,
      action: portfolioStatus === "pass" ? "可接入顧問工作流" : "先建立有效 watchlist 與配置草案",
    },
    {
      role: "交易營運",
      plan: "Enterprise",
      dataScope: "交易票、批次、執行交接",
      apiAccess: "/api/v1/trading/tickets",
      tools: "交易票、批次、執行回填",
      exportRights: "交易 CSV / 執行報告",
      approvalLimit: "需投委會或主管核准",
      status: tradeTickets.length ? portfolioStatus : "watch",
      owner: cleanDecisionOwner,
      evidence: `${tradeTickets.length} 張交易票`,
      action: tradeTickets.length ? "可接執行交接" : "先產生交易票與最小交易金額規則",
    },
    {
      role: "資料工程",
      plan: "Internal",
      dataScope: "資料表診斷、資料合約、API 合約",
      apiAccess: "/api/v1/market/bigquery/diagnostics, /api/v1/platform/data-products",
      tools: "資料管線、合約中心、OpenAPI 藍圖",
      exportRights: "OpenAPI JSON / 資料品質 CSV",
      approvalLimit: "可修復資料，不可覆核投資決策",
      status: apiContractBlueprintDecision,
      owner: cleanRiskOwner,
      evidence: `API 合約狀態：${executionReviewLabel(apiContractBlueprintDecision)}`,
      action: apiContractBlueprintDecision === "pass" ? "可進入 API 文件化" : "先凍結 request/response 與版本策略",
    },
    {
      role: "風控 / 合規",
      plan: "Enterprise",
      dataScope: "警示、SLA、KRI、審核軌跡",
      apiAccess: "/api/v1/platform/data-products, /api/v1/trading/tickets",
      tools: "市場警示、SLA 升級、投委會審核",
      exportRights: "審核 memo / 例外報告",
      approvalLimit: "可阻擋交易與資料產品發布",
      status: marketAlertDecision,
      owner: cleanRiskOwner,
      evidence: `警示狀態：${executionReviewLabel(marketAlertDecision)}`,
      action: marketAlertDecision === "pass" ? "可維持日常監控" : "先處理阻斷警示與高優先例外",
    },
    {
      role: "平台管理員",
      plan: "Internal Admin",
      dataScope: "全部 API、環境變數、角色與方案設定",
      apiAccess: "all internal endpoints",
      tools: "權限、資料產品、API 合約、營運監控",
      exportRights: "全部內部匯出",
      approvalLimit: "可調整權限，不直接覆核投資建議",
      status: governanceStatus,
      owner: cleanRiskOwner,
      evidence: `治理狀態：${executionReviewLabel(governanceStatus)}`,
      action: governanceStatus === "pass" ? "可進入正式權限系統設計" : "先收斂 API、警示與資料治理缺口",
    },
  ];
}

function platformEntitlementCsv(rows: PlatformEntitlementItem[]) {
  const header = ["role", "plan", "data_scope", "api_access", "tools", "export_rights", "approval_limit", "status", "owner", "evidence", "action"];
  const csvRows = rows.map((row) => [
    row.role,
    row.plan,
    row.dataScope,
    row.apiAccess,
    row.tools,
    row.exportRights,
    row.approvalLimit,
    executionReviewLabel(row.status),
    row.owner,
    row.evidence,
    row.action,
  ]);

  return [header, ...csvRows].map((row) => row.map(csvCell).join(",")).join("\n");
}

function buildClientWorkspaceProvisioningItems({
  dataReadinessDecision,
  apiContractBlueprintDecision,
  platformEntitlementDecision,
  marketAlertDecision,
  hasBigQueryCredentials,
  comparisonRows,
  activeAllocationRows,
  tradeTickets,
  riskOwner,
  decisionOwner,
}: {
  dataReadinessDecision: ExecutionReviewStatus;
  apiContractBlueprintDecision: ExecutionReviewStatus;
  platformEntitlementDecision: ExecutionReviewStatus;
  marketAlertDecision: ExecutionReviewStatus;
  hasBigQueryCredentials: boolean;
  comparisonRows: AssetComparisonRow[];
  activeAllocationRows: AllocationDraftRow[];
  tradeTickets: TradeTicketRow[];
  riskOwner: string;
  decisionOwner: string;
}): ClientWorkspaceProvisioningItem[] {
  const cleanRiskOwner = riskOwner.trim() || "風控";
  const cleanDecisionOwner = decisionOwner.trim() || "研究";
  const marketDataStatus: ExecutionReviewStatus = hasBigQueryCredentials ? dataReadinessDecision : "block";
  const advisoryStatus: ExecutionReviewStatus =
    comparisonRows.length && activeAllocationRows.length ? combinedExecutionStatus([marketDataStatus, apiContractBlueprintDecision]) : "watch";
  const enterpriseStatus = combinedExecutionStatus([platformEntitlementDecision, apiContractBlueprintDecision, marketAlertDecision]);

  return [
    {
      workspace: "Demo Sandbox",
      segment: "公開試用",
      plan: "Free",
      seats: "公開瀏覽",
      dataPackages: "資料源狀態、平台能力摘要",
      apiKeys: "不開放",
      sso: "不需要",
      billing: "無",
      status: "pass",
      owner: cleanRiskOwner,
      evidence: "不讀取客戶資料與 BigQuery 明細",
      action: "可作為銷售入口與產品展示",
    },
    {
      workspace: "Research Desk",
      segment: "個人研究員",
      plan: "Pro",
      seats: "1-5",
      dataPackages: "daily_prices / daily_fx / 商品主檔",
      apiKeys: hasBigQueryCredentials ? "可核發唯讀 key" : "等待資料憑證",
      sso: "Email login",
      billing: "月付 / 年付",
      status: marketDataStatus,
      owner: cleanDecisionOwner,
      evidence: hasBigQueryCredentials ? "BigQuery 已可讀取" : "缺少 BigQuery 憑證",
      action: marketDataStatus === "pass" ? "可開通研究工作區" : "先補齊 BigQuery 環境變數",
    },
    {
      workspace: "Advisory Team",
      segment: "投資顧問團隊",
      plan: "Pro Plus",
      seats: "5-20",
      dataPackages: "研究宇宙、投組分析、再平衡草案",
      apiKeys: "團隊唯讀 key + memo export",
      sso: "Email / Google Workspace",
      billing: "團隊訂閱",
      status: advisoryStatus,
      owner: cleanDecisionOwner,
      evidence: `${comparisonRows.length} 檔比較 / ${activeAllocationRows.length} 檔配置`,
      action: advisoryStatus === "pass" ? "可開通顧問工作區" : "先建立有效 watchlist 與配置草案",
    },
    {
      workspace: "Investment Office",
      segment: "家族辦公室 / 投資委員會",
      plan: "Enterprise",
      seats: "20+",
      dataPackages: "投組分析、交易票、審核軌跡、SLA",
      apiKeys: "分權 key + IP allowlist",
      sso: "SAML / OIDC",
      billing: "年度合約",
      status: enterpriseStatus,
      owner: cleanRiskOwner,
      evidence: `治理狀態：${executionReviewLabel(enterpriseStatus)}`,
      action: enterpriseStatus === "pass" ? "可進入企業上線前檢核" : "先完成 API 合約、權限與警示治理",
    },
    {
      workspace: "Data Engineering Lab",
      segment: "內部資料工程",
      plan: "Internal",
      seats: "資料團隊",
      dataPackages: "資料管線、資料合約、OpenAPI 藍圖",
      apiKeys: "service key",
      sso: "內部帳號",
      billing: "內部成本中心",
      status: apiContractBlueprintDecision,
      owner: cleanRiskOwner,
      evidence: `API 合約狀態：${executionReviewLabel(apiContractBlueprintDecision)}`,
      action: apiContractBlueprintDecision === "pass" ? "可進入 API 文件與 SDK 規劃" : "先凍結 request/response",
    },
    {
      workspace: "Risk Control Room",
      segment: "風控 / 合規",
      plan: "Enterprise",
      seats: "審核席位",
      dataPackages: "警示、KRI、SLA、例外報告",
      apiKeys: "監控唯讀 key",
      sso: "SAML / OIDC",
      billing: "包含於企業合約",
      status: marketAlertDecision,
      owner: cleanRiskOwner,
      evidence: `警示狀態：${executionReviewLabel(marketAlertDecision)}`,
      action: marketAlertDecision === "pass" ? "可開放風控檢視" : "先處理阻斷警示",
    },
    {
      workspace: "Platform Admin",
      segment: "內部平台管理",
      plan: "Internal Admin",
      seats: "管理員",
      dataPackages: "全部資料產品、權限、API 合約",
      apiKeys: "admin service key",
      sso: "內部 SSO",
      billing: "不對外計費",
      status: platformEntitlementDecision,
      owner: cleanRiskOwner,
      evidence: `權限矩陣狀態：${executionReviewLabel(platformEntitlementDecision)}`,
      action: platformEntitlementDecision === "pass" ? "可進入正式租戶管理設計" : "先收斂角色與方案控管",
    },
    {
      workspace: "Trading Operations",
      segment: "交易營運",
      plan: "Enterprise Add-on",
      seats: "交易席位",
      dataPackages: "交易票、批次、執行交接",
      apiKeys: "交易流程 key",
      sso: "SAML / OIDC",
      billing: "企業加購",
      status: tradeTickets.length ? advisoryStatus : "watch",
      owner: cleanDecisionOwner,
      evidence: `${tradeTickets.length} 張交易票`,
      action: tradeTickets.length ? "可接交易執行流程" : "先建立交易票與批次規則",
    },
  ];
}

function clientWorkspaceProvisioningCsv(rows: ClientWorkspaceProvisioningItem[]) {
  const header = ["workspace", "segment", "plan", "seats", "data_packages", "api_keys", "sso", "billing", "status", "owner", "evidence", "action"];
  const csvRows = rows.map((row) => [
    row.workspace,
    row.segment,
    row.plan,
    row.seats,
    row.dataPackages,
    row.apiKeys,
    row.sso,
    row.billing,
    executionReviewLabel(row.status),
    row.owner,
    row.evidence,
    row.action,
  ]);

  return [header, ...csvRows].map((row) => row.map(csvCell).join(",")).join("\n");
}

function buildUsageBillingItems({
  clientWorkspaceProvisioningItems,
  apiContractBlueprintDecision,
  platformEntitlementDecision,
  riskOwner,
  decisionOwner,
}: {
  clientWorkspaceProvisioningItems: ClientWorkspaceProvisioningItem[];
  apiContractBlueprintDecision: ExecutionReviewStatus;
  platformEntitlementDecision: ExecutionReviewStatus;
  riskOwner: string;
  decisionOwner: string;
}): UsageBillingItem[] {
  const cleanRiskOwner = riskOwner.trim() || "風控";
  const cleanDecisionOwner = decisionOwner.trim() || "研究";
  const workspaceStatus = (workspace: string): ExecutionReviewStatus =>
    clientWorkspaceProvisioningItems.find((item) => item.workspace === workspace)?.status ?? "watch";
  const governanceStatus = combinedExecutionStatus([apiContractBlueprintDecision, platformEntitlementDecision]);

  return [
    {
      workspace: "Demo Sandbox",
      plan: "Free",
      billingModel: "免費試用",
      seatUsage: "公開瀏覽",
      apiUsage: "0 / 不開放",
      exportUsage: "0 / 不開放",
      monthlyRevenue: "NT$0",
      invoiceStatus: "不開票",
      status: "pass",
      owner: cleanRiskOwner,
      evidence: "不使用付費資料與 API key",
      action: "保留為銷售入口，不納入 MRR",
    },
    {
      workspace: "Research Desk",
      plan: "Pro",
      billingModel: "月付 / 年付",
      seatUsage: "1-5 / 5",
      apiUsage: "2,000 / 10,000 calls",
      exportUsage: "20 / 100 exports",
      monthlyRevenue: "NT$9,900 / 月",
      invoiceStatus: workspaceStatus("Research Desk") === "pass" ? "可收款" : "等待資料開通",
      status: workspaceStatus("Research Desk"),
      owner: cleanDecisionOwner,
      evidence: "研究員方案需 BigQuery 商品資料可讀",
      action: workspaceStatus("Research Desk") === "pass" ? "可接金流與訂閱管理" : "先完成研究工作區開通",
    },
    {
      workspace: "Advisory Team",
      plan: "Pro Plus",
      billingModel: "團隊訂閱",
      seatUsage: "8 / 20",
      apiUsage: "18,000 / 50,000 calls",
      exportUsage: "80 / 500 exports",
      monthlyRevenue: "NT$39,900 / 月",
      invoiceStatus: workspaceStatus("Advisory Team") === "pass" ? "可收款" : "待配置與顧問流程",
      status: workspaceStatus("Advisory Team"),
      owner: cleanDecisionOwner,
      evidence: "顧問方案依賴 watchlist、配置與 memo 輸出",
      action: workspaceStatus("Advisory Team") === "pass" ? "可進入團隊帳務與席位管理" : "先完成顧問工作區檢核",
    },
    {
      workspace: "Investment Office",
      plan: "Enterprise",
      billingModel: "年度合約",
      seatUsage: "25+ / 合約",
      apiUsage: "合約額度",
      exportUsage: "合約額度",
      monthlyRevenue: "年度合約",
      invoiceStatus: workspaceStatus("Investment Office") === "pass" ? "可送合約" : "待企業治理檢核",
      status: workspaceStatus("Investment Office"),
      owner: cleanRiskOwner,
      evidence: "企業方案需 SSO、權限、API 合約與警示治理",
      action: workspaceStatus("Investment Office") === "pass" ? "可準備企業報價與合約" : "先完成企業上線前檢核",
    },
    {
      workspace: "Data Engineering Lab",
      plan: "Internal",
      billingModel: "內部成本中心",
      seatUsage: "資料團隊",
      apiUsage: "工程測試額度",
      exportUsage: "內部匯出",
      monthlyRevenue: "內部成本",
      invoiceStatus: "不對外開票",
      status: apiContractBlueprintDecision,
      owner: cleanRiskOwner,
      evidence: `API 合約狀態：${executionReviewLabel(apiContractBlueprintDecision)}`,
      action: apiContractBlueprintDecision === "pass" ? "可估算資料工程成本" : "先凍結 API 合約",
    },
    {
      workspace: "Risk Control Room",
      plan: "Enterprise",
      billingModel: "企業合約內含",
      seatUsage: "審核席位",
      apiUsage: "監控唯讀",
      exportUsage: "例外報告",
      monthlyRevenue: "包含於企業合約",
      invoiceStatus: workspaceStatus("Risk Control Room") === "pass" ? "可納入企業包" : "待警示治理",
      status: workspaceStatus("Risk Control Room"),
      owner: cleanRiskOwner,
      evidence: "風控功能依賴警示、KRI、SLA 與例外報告",
      action: workspaceStatus("Risk Control Room") === "pass" ? "可納入企業報價" : "先關閉阻斷警示",
    },
    {
      workspace: "Platform Admin",
      plan: "Internal Admin",
      billingModel: "內部管理",
      seatUsage: "管理員",
      apiUsage: "admin service key",
      exportUsage: "全部內部匯出",
      monthlyRevenue: "不對外計費",
      invoiceStatus: "不對外開票",
      status: platformEntitlementDecision,
      owner: cleanRiskOwner,
      evidence: `權限矩陣狀態：${executionReviewLabel(platformEntitlementDecision)}`,
      action: platformEntitlementDecision === "pass" ? "可進入租戶與帳務後台設計" : "先收斂權限矩陣",
    },
    {
      workspace: "Trading Operations",
      plan: "Enterprise Add-on",
      billingModel: "企業加購",
      seatUsage: "交易席位",
      apiUsage: "交易流程額度",
      exportUsage: "交易 CSV / 執行報告",
      monthlyRevenue: "NT$19,900 / 月起",
      invoiceStatus: workspaceStatus("Trading Operations") === "pass" ? "可加購" : "待交易票流程",
      status: workspaceStatus("Trading Operations"),
      owner: cleanDecisionOwner,
      evidence: "交易營運加購需交易票與執行交接流程",
      action: workspaceStatus("Trading Operations") === "pass" ? "可進入企業加購報價" : "先建立交易票與批次規則",
    },
    {
      workspace: "Billing Governance",
      plan: "Revenue Ops",
      billingModel: "帳務治理",
      seatUsage: "平台管理",
      apiUsage: "用量彙總",
      exportUsage: "帳務報表",
      monthlyRevenue: "MRR / 合約彙總",
      invoiceStatus: governanceStatus === "pass" ? "可建立正式帳務流程" : "待權限與 API 治理",
      status: governanceStatus,
      owner: cleanRiskOwner,
      evidence: `治理狀態：${executionReviewLabel(governanceStatus)}`,
      action: governanceStatus === "pass" ? "可接 Stripe/發票/合約台帳" : "先完成權限與 API 合約治理",
    },
  ];
}

function usageBillingCsv(rows: UsageBillingItem[]) {
  const header = ["workspace", "plan", "billing_model", "seat_usage", "api_usage", "export_usage", "monthly_revenue", "invoice_status", "status", "owner", "evidence", "action"];
  const csvRows = rows.map((row) => [
    row.workspace,
    row.plan,
    row.billingModel,
    row.seatUsage,
    row.apiUsage,
    row.exportUsage,
    row.monthlyRevenue,
    row.invoiceStatus,
    executionReviewLabel(row.status),
    row.owner,
    row.evidence,
    row.action,
  ]);

  return [header, ...csvRows].map((row) => row.map(csvCell).join(",")).join("\n");
}

function buildMarketAlertEvents({
  coverageUniverseItems,
  dataContractItems,
  dataPipelineHealthItems,
  qualityCards,
  decisionFunnelStages,
  operatingKriItems,
  platformExceptionItems,
  slaEscalationItems,
  riskOwner,
  decisionApprover,
}: {
  coverageUniverseItems: CoverageUniverseItem[];
  dataContractItems: DataContractItem[];
  dataPipelineHealthItems: DataPipelineHealthItem[];
  qualityCards: Array<{ label: string; value: string; status: QualityStatus; note: string }>;
  decisionFunnelStages: DecisionFunnelStage[];
  operatingKriItems: OperatingKriItem[];
  platformExceptionItems: PlatformExceptionItem[];
  slaEscalationItems: SlaEscalationItem[];
  riskOwner: string;
  decisionApprover: string;
}): MarketAlertEvent[] {
  const cleanRiskOwner = riskOwner.trim() || "風控";
  const cleanApprover = decisionApprover.trim() || "投委會";
  const coverageAlerts = coverageUniverseItems
    .filter((item) => item.status !== "pass")
    .map((item) => ({
      source: "可投資宇宙",
      title: item.label,
      status: item.status,
      priority: marketAlertPriorityFromStatus(item.status),
      owner: item.owner,
      evidence: `${item.count} / ${item.target}`,
      action: item.action,
    }));
  const contractAlerts = dataContractItems
    .filter((item) => item.status !== "pass")
    .map((item) => ({
      source: "資料合約",
      title: item.table,
      status: item.status,
      priority: marketAlertPriorityFromStatus(item.status),
      owner: item.owner,
      evidence: item.missingColumns.length ? `缺欄位 ${item.missingColumns.join(", ")}` : item.freshness,
      action: item.action,
    }));
  const pipelineAlerts = dataPipelineHealthItems
    .filter((item) => item.status !== "pass")
    .map((item) => ({
      source: "資料管線",
      title: item.label,
      status: item.status,
      priority: marketAlertPriorityFromStatus(item.status),
      owner: item.owner,
      evidence: item.value,
      action: item.action,
    }));
  const dataAlerts = qualityCards
    .filter((card) => card.status !== "strong" && card.status !== "neutral")
    .map((card) => {
      const status = qualityToExecutionStatus(card.status);

      return {
        source: "資料品質",
        title: card.label,
        status,
        priority: marketAlertPriorityFromStatus(status),
        owner: cleanRiskOwner,
        evidence: card.value,
        action: card.note,
      };
    });
  const funnelAlerts = decisionFunnelStages
    .filter((stage) => stage.status !== "pass")
    .map((stage) => ({
      source: "決策漏斗",
      title: stage.label,
      status: stage.status,
      priority: marketAlertPriorityFromStatus(stage.status),
      owner: stage.owner,
      evidence: `${stage.value} / ${stage.conversion}`,
      action: stage.note,
    }));
  const kriAlerts = operatingKriItems
    .filter((item) => item.status !== "pass")
    .map((item) => ({
      source: "營運 KRI",
      title: item.label,
      status: item.status,
      priority: marketAlertPriorityFromStatus(item.status),
      owner: item.owner,
      evidence: item.value,
      action: item.note,
    }));
  const slaAlerts = slaEscalationItems
    .filter((item) => item.tier !== "routine" || item.status !== "pass")
    .map((item) => ({
      source: "SLA 升級",
      title: item.trigger,
      status: item.status,
      priority: item.priority,
      owner: item.owner,
      evidence: `${slaEscalationTierLabel(item.tier)} / ${item.due}`,
      action: item.action,
    }));
  const exceptionAlerts = platformExceptionItems.map((item) => ({
    source: item.source,
    title: item.item,
    status: item.status,
    priority: item.priority,
    owner: item.owner || cleanApprover,
    evidence: item.evidence,
    action: item.nextAction,
  }));
  const priorityRank: Record<ExecutionHandoffPriority, number> = { high: 0, medium: 1, low: 2 };
  const statusRank: Record<ExecutionReviewStatus, number> = { block: 0, watch: 1, pass: 2 };

  return [...coverageAlerts, ...contractAlerts, ...pipelineAlerts, ...dataAlerts, ...funnelAlerts, ...kriAlerts, ...slaAlerts, ...exceptionAlerts]
    .sort(
      (left, right) =>
        priorityRank[left.priority] - priorityRank[right.priority] ||
        statusRank[left.status] - statusRank[right.status] ||
        left.source.localeCompare(right.source, "zh-Hant") ||
        left.title.localeCompare(right.title, "zh-Hant"),
    )
    .slice(0, 30);
}

function marketAlertCsv(rows: MarketAlertEvent[]) {
  const header = ["source", "title", "priority", "status", "owner", "evidence", "action"];
  const csvRows = rows.map((row) => [
    row.source,
    row.title,
    executionHandoffPriorityLabel(row.priority),
    executionReviewLabel(row.status),
    row.owner,
    row.evidence,
    row.action,
  ]);

  return [header, ...csvRows].map((row) => row.map(csvCell).join(",")).join("\n");
}

function averageComparisonMetric(rows: AssetComparisonRow[], selector: (row: AssetComparisonRow) => number | null) {
  const values = rows.map(selector).filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function comparisonSortLabel(sortKey: AssetComparisonSortKey) {
  if (sortKey === "score") return "分數高到低";
  if (sortKey === "annualizedReturn") return "年化報酬高到低";
  if (sortKey === "riskAdjustedReturn") return "風險調整報酬高到低";
  if (sortKey === "annualizedVolatility") return "波動低到高";
  if (sortKey === "maxDrawdown") return "回撤低到高";
  return "資料新鮮優先";
}

function comparisonSignalFilterLabel(signal: AssetDecisionSignal | "all") {
  return signal === "all" ? "全部" : decisionSignalLabel(signal);
}

function assetComparisonMemo(
  rows: AssetComparisonRow[],
  options: {
    name: string;
    symbols: string;
    priceBasis: "adjusted" | "raw";
    sortKey: AssetComparisonSortKey;
    signalFilter: AssetDecisionSignal | "all";
    minimumScore: number;
    totalRows: number;
    allocationRows?: AllocationDraftRow[];
    allocationMode?: AllocationMode;
    allocationCapital?: number;
    maximumAllocationWeight?: number;
    allocationRisk?: AllocationRiskSnapshot;
    stressShockPercent?: number;
    rebalanceRows?: RebalanceDraftRow[];
    rebalanceThreshold?: number;
    tradeTickets?: TradeTicketRow[];
    minimumTradeAmount?: number;
    tradeBatches?: TradeBatchRow[];
    maximumBatchAmount?: number;
    maximumTicketsPerBatch?: number;
    executionReviewItems?: ExecutionReviewItem[];
    monitoringRules?: ExecutionReviewItem[];
    monitoringHorizonDays?: number;
    monitoringDrawdownAlertPercent?: number;
    policyLimitItems?: ExecutionReviewItem[];
    policyMaxSingleWeightPercent?: number;
    policyMaxVolatilityPercent?: number;
    policyMaxDrawdownPercent?: number;
    policyMinimumScore?: number;
    committeeDecision?: CommitteeDecision;
    committeeApprovalItems?: ExecutionReviewItem[];
    decisionAuditRecords?: DecisionAuditRecord[];
    executionHandoffItems?: ExecutionHandoffItem[];
    executionFillRows?: ExecutionFillRow[];
    fillCompletionPercent?: number;
    fillSlippageBps?: number;
    fillCommissionBps?: number;
    postTradeAttributionItems?: ExecutionReviewItem[];
    postTradeReviewDays?: number;
    postTradeBenchmarkMovePercent?: number;
    platformExceptionItems?: PlatformExceptionItem[];
    exceptionDueDays?: number;
    cioOperatingBriefItems?: ExecutionReviewItem[];
    slaEscalationItems?: SlaEscalationItem[];
    slaCriticalHours?: number;
    slaReviewHours?: number;
    operatingKriItems?: OperatingKriItem[];
    decisionFunnelStages?: DecisionFunnelStage[];
    marketAlertEvents?: MarketAlertEvent[];
    dataPipelineHealthItems?: DataPipelineHealthItem[];
    dataPipelineTableSnapshots?: DataPipelineTableSnapshot[];
    dataPipelineGeneratedAt?: string;
    dataContractItems?: DataContractItem[];
    coverageUniverseItems?: CoverageUniverseItem[];
    dataRemediationItems?: DataRemediationItem[];
    dataLineageItems?: DataLineageItem[];
    dataProductCatalogItems?: DataProductCatalogItem[];
    apiServiceCatalogItems?: ApiServiceCatalogItem[];
    apiContractBlueprintItems?: ApiContractBlueprintItem[];
    platformEntitlementItems?: PlatformEntitlementItem[];
    clientWorkspaceProvisioningItems?: ClientWorkspaceProvisioningItem[];
    usageBillingItems?: UsageBillingItem[];
    dataLicenseComplianceItems?: DataLicenseComplianceItem[];
    securityAuditItems?: SecurityAuditItem[];
    incidentCommandItems?: IncidentCommandItem[];
    productReleaseGateItems?: ProductReleaseGateItem[];
    customerSuccessHealthItems?: CustomerSuccessHealthItem[];
    revenueForecastItems?: RevenueForecastItem[];
  },
) {
  const candidateRows = rows.filter((row) => row.signal === "candidate");
  const watchRows = rows.filter((row) => row.signal === "watch");
  const riskRows = rows.filter((row) => row.signal === "risk" || row.qualityStatus === "risk");
  const qualityRows = rows.filter((row) => row.qualityStatus !== "strong");
  const avgReturn = averageComparisonMetric(rows, (row) => row.annualizedReturn);
  const avgVolatility = averageComparisonMetric(rows, (row) => row.annualizedVolatility);
  const avgDrawdown = averageComparisonMetric(rows, (row) => row.maxDrawdown);
  const symbolText = parseSymbolList(options.symbols).join(", ") || "--";
  const topRows = rows.slice(0, 8);
  const reviewRows = [...riskRows, ...qualityRows.filter((row) => !riskRows.some((riskRow) => riskRow.symbol === row.symbol))].slice(0, 8);
  const memoAllocationRows = (options.allocationRows ?? []).filter((row) => row.allocationWeight > 0).slice(0, 8);
  const memoRiskRows = (options.allocationRisk?.riskRows ?? []).slice(0, 5);
  const memoRebalanceRows = (options.rebalanceRows ?? []).slice(0, 8);
  const memoTradeTickets = (options.tradeTickets ?? []).slice(0, 8);
  const memoTradeBatches = (options.tradeBatches ?? []).slice(0, 10);
  const memoExecutionReviewItems = (options.executionReviewItems ?? []).slice(0, 8);
  const memoMonitoringRules = (options.monitoringRules ?? []).slice(0, 8);
  const memoPolicyLimitItems = (options.policyLimitItems ?? []).slice(0, 8);
  const memoCommitteeApprovalItems = (options.committeeApprovalItems ?? []).slice(0, 8);
  const memoDecisionAuditRecords = (options.decisionAuditRecords ?? []).slice(0, 12);
  const memoExecutionHandoffItems = (options.executionHandoffItems ?? []).slice(0, 8);
  const memoExecutionFillRows = (options.executionFillRows ?? []).slice(0, 8);
  const memoPostTradeAttributionItems = (options.postTradeAttributionItems ?? []).slice(0, 8);
  const memoPlatformExceptionItems = (options.platformExceptionItems ?? []).slice(0, 12);
  const memoCioOperatingBriefItems = (options.cioOperatingBriefItems ?? []).slice(0, 8);
  const memoSlaEscalationItems = (options.slaEscalationItems ?? []).slice(0, 12);
  const memoOperatingKriItems = (options.operatingKriItems ?? []).slice(0, 12);
  const memoDecisionFunnelStages = (options.decisionFunnelStages ?? []).slice(0, 12);
  const memoMarketAlertEvents = (options.marketAlertEvents ?? []).slice(0, 16);
  const memoDataPipelineHealthItems = (options.dataPipelineHealthItems ?? []).slice(0, 12);
  const memoDataPipelineTableSnapshots = (options.dataPipelineTableSnapshots ?? []).slice(0, 6);
  const memoDataContractItems = (options.dataContractItems ?? []).slice(0, 8);
  const memoCoverageUniverseItems = (options.coverageUniverseItems ?? []).slice(0, 8);
  const memoDataRemediationItems = (options.dataRemediationItems ?? []).slice(0, 12);
  const memoDataLineageItems = (options.dataLineageItems ?? []).slice(0, 14);
  const memoDataProductCatalogItems = (options.dataProductCatalogItems ?? []).slice(0, 10);
  const memoApiServiceCatalogItems = (options.apiServiceCatalogItems ?? []).slice(0, 12);
  const memoApiContractBlueprintItems = (options.apiContractBlueprintItems ?? []).slice(0, 12);
  const memoPlatformEntitlementItems = (options.platformEntitlementItems ?? []).slice(0, 12);
  const memoClientWorkspaceProvisioningItems = (options.clientWorkspaceProvisioningItems ?? []).slice(0, 12);
  const memoUsageBillingItems = (options.usageBillingItems ?? []).slice(0, 12);
  const memoDataLicenseComplianceItems = (options.dataLicenseComplianceItems ?? []).slice(0, 12);
  const memoSecurityAuditItems = (options.securityAuditItems ?? []).slice(0, 12);
  const memoIncidentCommandItems = (options.incidentCommandItems ?? []).slice(0, 12);
  const memoProductReleaseGateItems = (options.productReleaseGateItems ?? []).slice(0, 12);
  const memoCustomerSuccessHealthItems = (options.customerSuccessHealthItems ?? []).slice(0, 12);
  const memoRevenueForecastItems = (options.revenueForecastItems ?? []).slice(0, 12);
  const tableHeader = "| 商品 | 分數 | 訊號 | 年化報酬 | 年化波動 | 最大回撤 | 最新日 | 說明 |";
  const tableDivider = "|---|---:|---|---:|---:|---:|---|---|";
  const tableRows = topRows.map((row) =>
    [
      markdownCell(row.symbol),
      row.score,
      markdownCell(decisionSignalLabel(row.signal)),
      markdownCell(formatPercent(row.annualizedReturn)),
      markdownCell(formatPercent(row.annualizedVolatility)),
      markdownCell(formatPercent(row.maxDrawdown)),
      markdownCell(row.latestDate),
      markdownCell(row.signalNote),
    ].join(" | "),
  );
  const reviewTableRows = reviewRows.map((row) =>
    [
      markdownCell(row.symbol),
      row.score,
      markdownCell(decisionSignalLabel(row.signal)),
      markdownCell(qualityLabel(row.qualityStatus)),
      markdownCell(row.latestDate),
      markdownCell(row.freshnessDays === null ? "--" : `${row.freshnessDays} 天`),
      markdownCell(row.signalNote),
    ].join(" | "),
  );
  const allocationTableRows = memoAllocationRows.map((row) =>
    [
      markdownCell(row.symbol),
      markdownCell(formatPercent(row.allocationWeight)),
      markdownCell(formatCurrency(row.allocationAmount)),
      row.score,
      markdownCell(decisionSignalLabel(row.signal)),
      markdownCell(row.allocationCapApplied ? "達上限" : "--"),
      markdownCell(row.allocationNote),
    ].join(" | "),
  );
  const riskBudgetTableRows = memoRiskRows.map((row) =>
    [
      markdownCell(row.symbol),
      markdownCell(formatPercent(row.allocationWeight)),
      markdownCell(formatPercent(row.riskContribution)),
      markdownCell(formatPercent(row.annualizedVolatility)),
      markdownCell(formatPercent(row.maxDrawdown)),
    ].join(" | "),
  );
  const rebalanceTableRows = memoRebalanceRows.map((row) =>
    [
      markdownCell(row.symbol),
      markdownCell(formatCurrency(row.currentAmount)),
      markdownCell(formatCurrency(row.targetAmount)),
      markdownCell(formatCurrency(row.tradeAmount)),
      markdownCell(formatPercent(row.tradeWeight)),
      markdownCell(rebalanceDirectionLabel(row.direction)),
    ].join(" | "),
  );
  const tradeTicketTableRows = memoTradeTickets.map((row) =>
    [
      markdownCell(row.symbol),
      markdownCell(rebalanceDirectionLabel(row.direction)),
      markdownCell(formatCurrency(row.ticketAmount)),
      markdownCell(formatCurrency(row.cashImpact)),
      markdownCell(formatPercent(row.tradeWeight)),
      markdownCell(row.ticketNote),
    ].join(" | "),
  );
  const tradeBatchTableRows = memoTradeBatches.map((row) =>
    [
      row.batchNumber,
      row.sequenceInBatch,
      markdownCell(row.symbol),
      markdownCell(rebalanceDirectionLabel(row.direction)),
      markdownCell(formatCurrency(row.ticketAmount)),
      markdownCell(formatCurrency(row.batchGrossAmount)),
      markdownCell(formatCurrency(row.batchCashImpact)),
      markdownCell(row.batchNote),
    ].join(" | "),
  );
  const executionReviewTableRows = memoExecutionReviewItems.map((row) =>
    [
      markdownCell(row.label),
      markdownCell(executionReviewLabel(row.status)),
      markdownCell(row.value),
      markdownCell(row.threshold),
      markdownCell(row.note),
    ].join(" | "),
  );
  const monitoringRuleTableRows = memoMonitoringRules.map((row) =>
    [
      markdownCell(row.label),
      markdownCell(executionReviewLabel(row.status)),
      markdownCell(row.value),
      markdownCell(row.threshold),
      markdownCell(row.note),
    ].join(" | "),
  );
  const policyLimitTableRows = memoPolicyLimitItems.map((row) =>
    [
      markdownCell(row.label),
      markdownCell(executionReviewLabel(row.status)),
      markdownCell(row.value),
      markdownCell(row.threshold),
      markdownCell(row.note),
    ].join(" | "),
  );
  const committeeApprovalTableRows = memoCommitteeApprovalItems.map((row) =>
    [
      markdownCell(row.label),
      markdownCell(executionReviewLabel(row.status)),
      markdownCell(row.value),
      markdownCell(row.threshold),
      markdownCell(row.note),
    ].join(" | "),
  );
  const decisionAuditTableRows = memoDecisionAuditRecords.map((row) =>
    [
      markdownCell(row.label),
      markdownCell(row.value),
      markdownCell(row.note),
    ].join(" | "),
  );
  const executionHandoffTableRows = memoExecutionHandoffItems.map((row) =>
    [
      markdownCell(row.owner),
      markdownCell(row.task),
      markdownCell(executionHandoffPriorityLabel(row.priority)),
      markdownCell(row.due),
      markdownCell(executionReviewLabel(row.status)),
      markdownCell(row.evidence),
      markdownCell(row.note),
    ].join(" | "),
  );
  const executionFillTableRows = memoExecutionFillRows.map((row) =>
    [
      markdownCell(row.symbol),
      markdownCell(rebalanceDirectionLabel(row.direction)),
      markdownCell(formatCurrency(row.ticketAmount)),
      markdownCell(formatCurrency(row.filledNotional)),
      markdownCell(formatCurrency(row.unfilledNotional)),
      markdownCell(formatCurrency(row.totalCost)),
      markdownCell(formatCurrency(row.cashImpactAfterCost)),
      markdownCell(executionReviewLabel(row.fillStatus)),
      markdownCell(row.fillNote),
    ].join(" | "),
  );
  const postTradeAttributionTableRows = memoPostTradeAttributionItems.map((row) =>
    [
      markdownCell(row.label),
      markdownCell(executionReviewLabel(row.status)),
      markdownCell(row.value),
      markdownCell(row.threshold),
      markdownCell(row.note),
    ].join(" | "),
  );
  const platformExceptionTableRows = memoPlatformExceptionItems.map((row) =>
    [
      markdownCell(row.source),
      markdownCell(row.owner),
      markdownCell(row.item),
      markdownCell(executionHandoffPriorityLabel(row.priority)),
      markdownCell(row.due),
      markdownCell(executionReviewLabel(row.status)),
      markdownCell(row.evidence),
      markdownCell(row.nextAction),
    ].join(" | "),
  );
  const cioOperatingBriefTableRows = memoCioOperatingBriefItems.map((row) =>
    [
      markdownCell(row.label),
      markdownCell(executionReviewLabel(row.status)),
      markdownCell(row.value),
      markdownCell(row.threshold),
      markdownCell(row.note),
    ].join(" | "),
  );
  const slaEscalationTableRows = memoSlaEscalationItems.map((row) =>
    [
      markdownCell(slaEscalationTierLabel(row.tier)),
      markdownCell(row.owner),
      markdownCell(row.trigger),
      markdownCell(executionHandoffPriorityLabel(row.priority)),
      markdownCell(row.due),
      markdownCell(executionReviewLabel(row.status)),
      markdownCell(row.escalationPath),
      markdownCell(row.action),
    ].join(" | "),
  );
  const operatingKriTableRows = memoOperatingKriItems.map((row) =>
    [
      markdownCell(row.label),
      markdownCell(executionReviewLabel(row.status)),
      markdownCell(row.value),
      markdownCell(row.limit),
      markdownCell(row.owner),
      markdownCell(row.note),
    ].join(" | "),
  );
  const decisionFunnelTableRows = memoDecisionFunnelStages.map((row) =>
    [
      markdownCell(row.label),
      markdownCell(executionReviewLabel(row.status)),
      markdownCell(row.value),
      markdownCell(row.conversion),
      markdownCell(row.owner),
      markdownCell(row.note),
    ].join(" | "),
  );
  const marketAlertTableRows = memoMarketAlertEvents.map((row) =>
    [
      markdownCell(row.source),
      markdownCell(row.title),
      markdownCell(executionHandoffPriorityLabel(row.priority)),
      markdownCell(executionReviewLabel(row.status)),
      markdownCell(row.owner),
      markdownCell(row.evidence),
      markdownCell(row.action),
    ].join(" | "),
  );
  const dataPipelineHealthTableRows = memoDataPipelineHealthItems.map((row) =>
    [
      markdownCell(row.label),
      markdownCell(executionReviewLabel(row.status)),
      markdownCell(row.value),
      markdownCell(row.target),
      markdownCell(row.owner),
      markdownCell(row.action),
    ].join(" | "),
  );
  const dataPipelineTableRows = memoDataPipelineTableSnapshots.map((row) =>
    [
      markdownCell(row.table),
      markdownCell(executionReviewLabel(row.status)),
      markdownCell(row.latestDate),
      markdownCell(row.rowCount),
      markdownCell(row.coverage),
      markdownCell(row.freshness),
      markdownCell(row.action),
    ].join(" | "),
  );
  const dataContractTableRows = memoDataContractItems.map((row) =>
    [
      markdownCell(row.table),
      markdownCell(row.layer),
      markdownCell(executionReviewLabel(row.status)),
      markdownCell(`${row.presentColumns.length}/${row.requiredColumns.length}`),
      markdownCell(row.missingColumns.join(", ") || "--"),
      markdownCell(row.freshness),
      markdownCell(row.volume),
      markdownCell(row.action),
    ].join(" | "),
  );
  const coverageUniverseTableRows = memoCoverageUniverseItems.map((row) =>
    [
      markdownCell(row.label),
      markdownCell(executionReviewLabel(row.status)),
      markdownCell(row.count),
      markdownCell(row.target),
      markdownCell(row.coverage),
      markdownCell(row.owner),
      markdownCell(row.action),
    ].join(" | "),
  );
  const dataRemediationTableRows = memoDataRemediationItems.map((row) =>
    [
      markdownCell(row.source),
      markdownCell(row.item),
      markdownCell(executionHandoffPriorityLabel(row.priority)),
      markdownCell(executionReviewLabel(row.status)),
      markdownCell(row.owner),
      markdownCell(row.evidence),
      markdownCell(row.impact),
      markdownCell(row.action),
    ].join(" | "),
  );
  const dataLineageTableRows = memoDataLineageItems.map((row) =>
    [
      markdownCell(row.stage),
      markdownCell(row.node),
      markdownCell(executionReviewLabel(row.status)),
      markdownCell(row.input),
      markdownCell(row.output),
      markdownCell(row.owner),
      markdownCell(row.evidence),
      markdownCell(row.action),
    ].join(" | "),
  );
  const dataProductCatalogTableRows = memoDataProductCatalogItems.map((row) =>
    [
      markdownCell(row.product),
      markdownCell(row.category),
      markdownCell(executionReviewLabel(row.status)),
      markdownCell(row.owner),
      markdownCell(row.consumer),
      markdownCell(row.input),
      markdownCell(row.output),
      markdownCell(row.serviceLevel),
      markdownCell(row.action),
    ].join(" | "),
  );
  const apiServiceCatalogTableRows = memoApiServiceCatalogItems.map((row) =>
    [
      markdownCell(row.method),
      markdownCell(row.endpoint),
      markdownCell(row.product),
      markdownCell(executionReviewLabel(row.status)),
      markdownCell(row.owner),
      markdownCell(row.consumer),
      markdownCell(row.input),
      markdownCell(row.output),
      markdownCell(row.serviceLevel),
      markdownCell(row.action),
    ].join(" | "),
  );
  const apiContractBlueprintTableRows = memoApiContractBlueprintItems.map((row) =>
    [
      markdownCell(row.method),
      markdownCell(row.endpoint),
      markdownCell(row.version),
      markdownCell(row.auth),
      markdownCell(row.requestSchema),
      markdownCell(row.responseSchema),
      markdownCell(apiContractStabilityLabel(row.stability)),
      markdownCell(executionReviewLabel(row.status)),
      markdownCell(row.action),
    ].join(" | "),
  );
  const platformEntitlementTableRows = memoPlatformEntitlementItems.map((row) =>
    [
      markdownCell(row.role),
      markdownCell(row.plan),
      markdownCell(row.dataScope),
      markdownCell(row.apiAccess),
      markdownCell(row.tools),
      markdownCell(row.exportRights),
      markdownCell(row.approvalLimit),
      markdownCell(executionReviewLabel(row.status)),
      markdownCell(row.action),
    ].join(" | "),
  );
  const clientWorkspaceProvisioningTableRows = memoClientWorkspaceProvisioningItems.map((row) =>
    [
      markdownCell(row.workspace),
      markdownCell(row.segment),
      markdownCell(row.plan),
      markdownCell(row.seats),
      markdownCell(row.dataPackages),
      markdownCell(row.apiKeys),
      markdownCell(row.sso),
      markdownCell(row.billing),
      markdownCell(executionReviewLabel(row.status)),
      markdownCell(row.action),
    ].join(" | "),
  );
  const usageBillingTableRows = memoUsageBillingItems.map((row) =>
    [
      markdownCell(row.workspace),
      markdownCell(row.plan),
      markdownCell(row.billingModel),
      markdownCell(row.seatUsage),
      markdownCell(row.apiUsage),
      markdownCell(row.exportUsage),
      markdownCell(row.monthlyRevenue),
      markdownCell(row.invoiceStatus),
      markdownCell(executionReviewLabel(row.status)),
      markdownCell(row.action),
    ].join(" | "),
  );
  const dataLicenseComplianceTableRows = memoDataLicenseComplianceItems.map((row) =>
    [
      markdownCell(row.source),
      markdownCell(row.dataset),
      markdownCell(row.licenseScope),
      markdownCell(row.redistribution),
      markdownCell(row.clientAccess),
      markdownCell(row.exportPolicy),
      markdownCell(row.auditTrail),
      markdownCell(row.renewal),
      markdownCell(executionReviewLabel(row.status)),
      markdownCell(row.action),
    ].join(" | "),
  );
  const securityAuditTableRows = memoSecurityAuditItems.map((row) =>
    [
      markdownCell(row.control),
      markdownCell(row.scope),
      markdownCell(row.owner),
      markdownCell(executionReviewLabel(row.status)),
      markdownCell(row.evidence),
      markdownCell(row.risk),
      markdownCell(row.frequency),
      markdownCell(row.action),
    ].join(" | "),
  );
  const incidentCommandTableRows = memoIncidentCommandItems.map((row) =>
    [
      markdownCell(row.incident),
      markdownCell(executionHandoffPriorityLabel(row.severity)),
      markdownCell(executionReviewLabel(row.status)),
      markdownCell(row.trigger),
      markdownCell(row.customerImpact),
      markdownCell(row.owner),
      markdownCell(row.sla),
      markdownCell(row.nextAction),
    ].join(" | "),
  );
  const productReleaseGateTableRows = memoProductReleaseGateItems.map((row) =>
    [
      markdownCell(row.product),
      markdownCell(row.audience),
      markdownCell(releaseStageLabel(row.releaseStage)),
      markdownCell(executionReviewLabel(row.status)),
      markdownCell(row.owner),
      markdownCell(row.evidence),
      markdownCell(row.decision),
      markdownCell(row.nextAction),
    ].join(" | "),
  );
  const customerSuccessHealthTableRows = memoCustomerSuccessHealthItems.map((row) =>
    [
      markdownCell(row.workspace),
      markdownCell(row.segment),
      markdownCell(row.plan),
      row.healthScore,
      markdownCell(customerHealthStageLabel(row.healthStage)),
      markdownCell(row.revenueSignal),
      markdownCell(row.riskSignal),
      markdownCell(row.expansionSignal),
      markdownCell(row.nextAction),
    ].join(" | "),
  );
  const revenueForecastTableRows = memoRevenueForecastItems.map((row) =>
    [
      markdownCell(row.workspace),
      markdownCell(row.plan),
      markdownCell(revenueForecastStageLabel(row.forecastStage)),
      markdownCell(formatCurrency(row.currentMrr)),
      markdownCell(formatCurrency(row.expansionMrr)),
      markdownCell(formatCurrency(row.churnRiskMrr)),
      markdownCell(formatCurrency(row.projectedMrr)),
      markdownCell(formatPercent(row.renewalProbability)),
      markdownCell(row.quarterAction),
      markdownCell(row.nextAction),
    ].join(" | "),
  );

  return [
    `# ${options.name || "未命名 Watchlist"} 研究摘要`,
    "",
    `- 產出時間：${new Date().toLocaleString("zh-TW")}`,
    `- 商品清單：${symbolText}`,
    `- 價格口徑：${options.priceBasis}`,
    `- 排序：${comparisonSortLabel(options.sortKey)}`,
    `- 訊號篩選：${comparisonSignalFilterLabel(options.signalFilter)}`,
    `- 最低分數：${options.minimumScore}`,
    "",
    "## CIO 營運總覽",
    memoCioOperatingBriefItems.length ? "| 項目 | 狀態 | 目前值 | 門檻 | 下一步 |" : "目前沒有可輸出的 CIO 營運總覽。",
    memoCioOperatingBriefItems.length ? "|---|---|---:|---|---|" : "",
    ...cioOperatingBriefTableRows.map((row) => `| ${row} |`),
    "",
    "## SLA 升級矩陣",
    `- L1 時限：${options.slaCriticalHours ?? "--"}h`,
    `- L2 時限：${options.slaReviewHours ?? "--"}h`,
    memoSlaEscalationItems.length ? "| 層級 | 負責人 | 觸發項 | 優先級 | 時限 | 狀態 | 升級路徑 | 動作 |" : "目前沒有 SLA 升級項目。",
    memoSlaEscalationItems.length ? "|---|---|---|---|---|---|---|---|" : "",
    ...slaEscalationTableRows.map((row) => `| ${row} |`),
    "",
    "## 營運 KRI 指標板",
    memoOperatingKriItems.length ? "| 指標 | 狀態 | 目前值 | 門檻 | 負責人 | 說明 |" : "目前沒有可輸出的營運 KRI。",
    memoOperatingKriItems.length ? "|---|---|---:|---|---|---|" : "",
    ...operatingKriTableRows.map((row) => `| ${row} |`),
    "",
    "## 資料到交易決策漏斗",
    memoDecisionFunnelStages.length ? "| 階段 | 狀態 | 數量 | 轉換率 | 負責人 | 說明 |" : "目前沒有可輸出的決策漏斗。",
    memoDecisionFunnelStages.length ? "|---|---|---:|---:|---|---|" : "",
    ...decisionFunnelTableRows.map((row) => `| ${row} |`),
    "",
    "## 市場警示中心",
    memoMarketAlertEvents.length ? "| 來源 | 事件 | 優先級 | 狀態 | 負責人 | 依據 | 動作 |" : "目前沒有需要處理的市場警示。",
    memoMarketAlertEvents.length ? "|---|---|---|---|---|---|---|" : "",
    ...marketAlertTableRows.map((row) => `| ${row} |`),
    "",
    "## 資料管線監控台",
    `- 診斷時間：${options.dataPipelineGeneratedAt ?? "--"}`,
    memoDataPipelineHealthItems.length ? "| 檢查項 | 狀態 | 目前值 | 目標 | 負責人 | 動作 |" : "目前沒有可輸出的資料管線健康檢查。",
    memoDataPipelineHealthItems.length ? "|---|---|---:|---|---|---|" : "",
    ...dataPipelineHealthTableRows.map((row) => `| ${row} |`),
    memoDataPipelineTableSnapshots.length ? "| 資料表 | 狀態 | 最新日 | 筆數 | 覆蓋 | 新鮮度 | 動作 |" : "",
    memoDataPipelineTableSnapshots.length ? "|---|---|---|---:|---:|---:|---|" : "",
    ...dataPipelineTableRows.map((row) => `| ${row} |`),
    "",
    "## 資料合約中心",
    memoDataContractItems.length ? "| 資料表 | 層級 | 狀態 | 欄位覆蓋 | 缺欄位 | 新鮮度 | 資料量 | 動作 |" : "目前沒有可輸出的資料合約。",
    memoDataContractItems.length ? "|---|---|---|---:|---|---:|---:|---|" : "",
    ...dataContractTableRows.map((row) => `| ${row} |`),
    "",
    "## 可投資宇宙覆蓋",
    memoCoverageUniverseItems.length ? "| 項目 | 狀態 | 數量 | 目標 | 覆蓋 | 負責人 | 動作 |" : "目前沒有可輸出的可投資宇宙資料。",
    memoCoverageUniverseItems.length ? "|---|---|---:|---|---|---|---|" : "",
    ...coverageUniverseTableRows.map((row) => `| ${row} |`),
    "",
    "## 資料缺口修復佇列",
    memoDataRemediationItems.length ? "| 來源 | 項目 | 優先級 | 狀態 | 負責人 | 依據 | 影響 | 動作 |" : "目前沒有待處理資料缺口。",
    memoDataRemediationItems.length ? "|---|---|---|---|---|---|---|---|" : "",
    ...dataRemediationTableRows.map((row) => `| ${row} |`),
    "",
    "## 資料血緣地圖",
    memoDataLineageItems.length ? "| 階段 | 節點 | 狀態 | 輸入 | 輸出 | 負責人 | 依據 | 動作 |" : "目前沒有可輸出的資料血緣。",
    memoDataLineageItems.length ? "|---|---|---|---|---|---|---|---|" : "",
    ...dataLineageTableRows.map((row) => `| ${row} |`),
    "",
    "## 資料產品目錄",
    memoDataProductCatalogItems.length ? "| 產品 | 類別 | 狀態 | 負責人 | 使用者 | 輸入 | 輸出 | 服務等級 | 動作 |" : "目前沒有可輸出的資料產品目錄。",
    memoDataProductCatalogItems.length ? "|---|---|---|---|---|---|---|---|---|" : "",
    ...dataProductCatalogTableRows.map((row) => `| ${row} |`),
    "",
    "## API 服務目錄",
    memoApiServiceCatalogItems.length ? "| Method | Endpoint | 產品 | 狀態 | 負責人 | 使用者 | 輸入 | 輸出 | 服務等級 | 動作 |" : "目前沒有可輸出的 API 服務目錄。",
    memoApiServiceCatalogItems.length ? "|---|---|---|---|---|---|---|---|---|---|" : "",
    ...apiServiceCatalogTableRows.map((row) => `| ${row} |`),
    "",
    "## API 合約 / OpenAPI 藍圖",
    memoApiContractBlueprintItems.length ? "| Method | Endpoint | Version | Auth | Request | Response | Stability | 狀態 | 動作 |" : "目前沒有可輸出的 API 合約藍圖。",
    memoApiContractBlueprintItems.length ? "|---|---|---|---|---|---|---|---|---|" : "",
    ...apiContractBlueprintTableRows.map((row) => `| ${row} |`),
    "",
    "## 權限與方案控管",
    memoPlatformEntitlementItems.length ? "| 角色 | 方案 | 資料範圍 | API 權限 | 工具 | 匯出權限 | 簽核限制 | 狀態 | 動作 |" : "目前沒有可輸出的權限矩陣。",
    memoPlatformEntitlementItems.length ? "|---|---|---|---|---|---|---|---|---|" : "",
    ...platformEntitlementTableRows.map((row) => `| ${row} |`),
    "",
    "## 客戶工作區開通中心",
    memoClientWorkspaceProvisioningItems.length ? "| 工作區 | 客群 | 方案 | 席位 | 資料包 | API Key | SSO | 帳務 | 狀態 | 動作 |" : "目前沒有可輸出的客戶工作區開通清單。",
    memoClientWorkspaceProvisioningItems.length ? "|---|---|---|---|---|---|---|---|---|---|" : "",
    ...clientWorkspaceProvisioningTableRows.map((row) => `| ${row} |`),
    "",
    "## 用量與帳務中心",
    memoUsageBillingItems.length ? "| 工作區 | 方案 | 帳務模式 | 席位用量 | API 用量 | 匯出用量 | 月收入 | 發票/合約狀態 | 狀態 | 動作 |" : "目前沒有可輸出的用量與帳務資料。",
    memoUsageBillingItems.length ? "|---|---|---|---|---|---|---|---|---|---|" : "",
    ...usageBillingTableRows.map((row) => `| ${row} |`),
    "",
    "## 資料授權與合規中心",
    memoDataLicenseComplianceItems.length ? "| 來源 | 資料集 | 授權範圍 | 再散布限制 | 客戶可見範圍 | 匯出政策 | 稽核軌跡 | 續約 | 狀態 | 動作 |" : "目前沒有可輸出的資料授權與合規資料。",
    memoDataLicenseComplianceItems.length ? "|---|---|---|---|---|---|---|---|---|---|" : "",
    ...dataLicenseComplianceTableRows.map((row) => `| ${row} |`),
    "",
    "## 安全與審計中心",
    memoSecurityAuditItems.length ? "| 控制項 | 範圍 | 負責人 | 狀態 | 依據 | 風險 | 頻率 | 動作 |" : "目前沒有可輸出的安全審計資料。",
    memoSecurityAuditItems.length ? "|---|---|---|---|---|---|---|---|" : "",
    ...securityAuditTableRows.map((row) => `| ${row} |`),
    "",
    "## 營運事件指揮中心",
    memoIncidentCommandItems.length ? "| 事件 | 優先級 | 狀態 | 觸發條件 | 客戶影響 | 負責人 | SLA | 下一步 |" : "目前沒有可輸出的營運事件。",
    memoIncidentCommandItems.length ? "|---|---|---|---|---|---|---|---|" : "",
    ...incidentCommandTableRows.map((row) => `| ${row} |`),
    "",
    "## 產品上線閘門",
    memoProductReleaseGateItems.length ? "| 產品 | 對象 | 上線階段 | 狀態 | 負責人 | 依據 | 決策 | 下一步 |" : "目前沒有可輸出的產品上線閘門。",
    memoProductReleaseGateItems.length ? "|---|---|---|---|---|---|---|---|" : "",
    ...productReleaseGateTableRows.map((row) => `| ${row} |`),
    "",
    "## 客戶成功健康中心",
    memoCustomerSuccessHealthItems.length ? "| 工作區 | 客群 | 方案 | 健康分數 | 階段 | 收入訊號 | 風險訊號 | 擴充訊號 | 下一步 |" : "目前沒有可輸出的客戶健康資料。",
    memoCustomerSuccessHealthItems.length ? "|---|---|---|---:|---|---|---|---|---|" : "",
    ...customerSuccessHealthTableRows.map((row) => `| ${row} |`),
    "",
    "## 收入續約預測中心",
    memoRevenueForecastItems.length ? "| 工作區 | 方案 | 階段 | 目前 MRR | 擴售 MRR | 風險 MRR | 預估 MRR | 續約率 | 本季動作 | 下一步 |" : "目前沒有可輸出的收入預測資料。",
    memoRevenueForecastItems.length ? "|---|---|---|---:|---:|---:|---:|---:|---|---|" : "",
    ...revenueForecastTableRows.map((row) => `| ${row} |`),
    "",
    "## 篩選概況",
    `- 顯示商品：${rows.length} / ${options.totalRows} 檔`,
    `- 候選 / 觀察 / 風險：${candidateRows.length} / ${watchRows.length} / ${riskRows.length}`,
    `- 平均年化報酬：${formatPercent(avgReturn)}`,
    `- 平均年化波動：${formatPercent(avgVolatility)}`,
    `- 平均最大回撤：${formatPercent(avgDrawdown)}`,
    "",
    "## 優先研究名單",
    topRows.length ? tableHeader : "目前篩選條件下沒有商品。",
    topRows.length ? tableDivider : "",
    ...tableRows.map((row) => `| ${row} |`),
    "",
    "## 模型配置草稿",
    `- 配置模式：${options.allocationMode ? allocationModeLabel(options.allocationMode) : "--"}`,
    `- 模型本金：${formatCurrency(options.allocationCapital)}`,
    `- 單檔權重上限：${formatPercent(options.maximumAllocationWeight)}`,
    memoAllocationRows.length ? "| 商品 | 權重 | 金額 | 分數 | 訊號 | 上限 | 說明 |" : "目前篩選條件下沒有可納入配置的商品。",
    memoAllocationRows.length ? "|---|---:|---:|---:|---|---|---|" : "",
    ...allocationTableRows.map((row) => `| ${row} |`),
    "",
    "## 配置風險壓力測試",
    `- 預估年化報酬：${formatPercent(options.allocationRisk?.expectedAnnualReturn)}`,
    `- 預估年化波動：${formatPercent(options.allocationRisk?.estimatedAnnualVolatility)}`,
    `- 加權最大回撤：${formatPercent(options.allocationRisk?.weightedMaxDrawdown)}`,
    `- 壓力情境：${options.stressShockPercent ?? "--"}%`,
    `- 情境損益：${formatCurrency(options.allocationRisk?.stressLoss)}`,
    memoRiskRows.length ? "| 商品 | 權重 | 風險貢獻 | 年化波動 | 最大回撤 |" : "目前沒有可計算風險貢獻的配置商品。",
    memoRiskRows.length ? "|---|---:|---:|---:|---:|" : "",
    ...riskBudgetTableRows.map((row) => `| ${row} |`),
    "",
    "## 再平衡交易草稿",
    `- 偏離門檻：${formatPercent(options.rebalanceThreshold)}`,
    memoRebalanceRows.length ? "| 商品 | 現有金額 | 目標金額 | 交易差額 | 權重偏離 | 動作 |" : "尚未輸入現有持倉，無法產生再平衡草稿。",
    memoRebalanceRows.length ? "|---|---:|---:|---:|---:|---|" : "",
    ...rebalanceTableRows.map((row) => `| ${row} |`),
    "",
    "## 交易執行清單",
    `- 最小交易金額：${formatCurrency(options.minimumTradeAmount)}`,
    memoTradeTickets.length ? "| 商品 | 動作 | 交易金額 | 現金影響 | 權重偏離 | 說明 |" : "目前沒有達最小交易金額的可執行交易。",
    memoTradeTickets.length ? "|---|---|---:|---:|---:|---|" : "",
    ...tradeTicketTableRows.map((row) => `| ${row} |`),
    "",
    "## 分批交易計畫",
    `- 單批金額上限：${formatCurrency(options.maximumBatchAmount)}`,
    `- 每批筆數上限：${options.maximumTicketsPerBatch ?? "--"}`,
    memoTradeBatches.length ? "| 批次 | 順序 | 商品 | 動作 | 交易金額 | 批次總額 | 批次現金 | 說明 |" : "目前沒有可分批的交易。",
    memoTradeBatches.length ? "|---:|---:|---|---|---:|---:|---:|---|" : "",
    ...tradeBatchTableRows.map((row) => `| ${row} |`),
    "",
    "## 交易前檢核",
    memoExecutionReviewItems.length ? "| 項目 | 狀態 | 目前值 | 門檻 | 說明 |" : "目前沒有可輸出的交易前檢核。",
    memoExecutionReviewItems.length ? "|---|---|---:|---|---|" : "",
    ...executionReviewTableRows.map((row) => `| ${row} |`),
    "",
    "## 交易後監控規則",
    `- 監控天數：T+${options.monitoringHorizonDays ?? "--"}`,
    `- 回撤警戒：${options.monitoringDrawdownAlertPercent ?? "--"}%`,
    memoMonitoringRules.length ? "| 項目 | 狀態 | 目前值 | 觸發條件 | 後續動作 |" : "目前沒有可輸出的交易後監控規則。",
    memoMonitoringRules.length ? "|---|---|---:|---|---|" : "",
    ...monitoringRuleTableRows.map((row) => `| ${row} |`),
    "",
    "## 投資政策限制檢查",
    `- 單檔權重上限：${options.policyMaxSingleWeightPercent ?? "--"}%`,
    `- 年化波動上限：${options.policyMaxVolatilityPercent ?? "--"}%`,
    `- 回撤限制：${options.policyMaxDrawdownPercent ?? "--"}%`,
    `- 最低模型分數：${options.policyMinimumScore ?? "--"}`,
    memoPolicyLimitItems.length ? "| 項目 | 狀態 | 目前值 | 限制 | 說明 |" : "目前沒有可輸出的政策限制檢查。",
    memoPolicyLimitItems.length ? "|---|---|---:|---|---|" : "",
    ...policyLimitTableRows.map((row) => `| ${row} |`),
    "",
    "## 投委會簽核摘要",
    `- 簽核建議：${options.committeeDecision ? committeeDecisionLabel(options.committeeDecision) : "--"}`,
    memoCommitteeApprovalItems.length ? "| 項目 | 狀態 | 目前值 | 門檻 | 說明 |" : "目前沒有可輸出的簽核摘要。",
    memoCommitteeApprovalItems.length ? "|---|---|---:|---|---|" : "",
    ...committeeApprovalTableRows.map((row) => `| ${row} |`),
    "",
    "## 決策包稽核紀錄",
    memoDecisionAuditRecords.length ? "| 欄位 | 值 | 說明 |" : "目前沒有可輸出的決策包稽核紀錄。",
    memoDecisionAuditRecords.length ? "|---|---|---|" : "",
    ...decisionAuditTableRows.map((row) => `| ${row} |`),
    "",
    "## 執行交接清單",
    memoExecutionHandoffItems.length ? "| 負責人 | 任務 | 優先級 | 期限 | 狀態 | 依據 | 說明 |" : "目前沒有可輸出的執行交接清單。",
    memoExecutionHandoffItems.length ? "|---|---|---|---|---|---|---|" : "",
    ...executionHandoffTableRows.map((row) => `| ${row} |`),
    "",
    "## 成交回報與滑價分析",
    `- 成交率：${options.fillCompletionPercent ?? "--"}%`,
    `- 滑價：${formatBps(options.fillSlippageBps)}`,
    `- 手續費：${formatBps(options.fillCommissionBps)}`,
    memoExecutionFillRows.length ? "| 商品 | 動作 | 目標金額 | 成交金額 | 未成交 | 成本 | 成交後現金 | 狀態 | 說明 |" : "目前沒有可輸出的成交回報。",
    memoExecutionFillRows.length ? "|---|---|---:|---:|---:|---:|---:|---|---|" : "",
    ...executionFillTableRows.map((row) => `| ${row} |`),
    "",
    "## 交易後績效歸因",
    `- 復盤天數：T+${options.postTradeReviewDays ?? "--"}`,
    `- 市場變動假設：${options.postTradeBenchmarkMovePercent ?? "--"}%`,
    memoPostTradeAttributionItems.length ? "| 項目 | 狀態 | 目前值 | 門檻 | 說明 |" : "目前沒有可輸出的交易後績效歸因。",
    memoPostTradeAttributionItems.length ? "|---|---|---:|---|---|" : "",
    ...postTradeAttributionTableRows.map((row) => `| ${row} |`),
    "",
    "## 例外事項總控台",
    `- 處理期限：T+${options.exceptionDueDays ?? "--"}`,
    memoPlatformExceptionItems.length ? "| 來源 | 負責人 | 項目 | 優先級 | 期限 | 狀態 | 依據 | 下一步 |" : "目前沒有待處理例外事項。",
    memoPlatformExceptionItems.length ? "|---|---|---|---|---|---|---|---|" : "",
    ...platformExceptionTableRows.map((row) => `| ${row} |`),
    "",
    "## 需要複核的風險",
    reviewRows.length ? "| 商品 | 分數 | 訊號 | 品質 | 最新日 | 距今天 | 說明 |" : "目前篩選結果未偵測到明確風險。",
    reviewRows.length ? "|---|---:|---|---|---|---:|---|" : "",
    ...reviewTableRows.map((row) => `| ${row} |`),
    "",
    "## 使用限制",
    "- 此摘要只依 BigQuery daily_prices 的歷史價格計算，尚未納入估值、產業、流動性、配息、匯率與交易成本。",
    "- 分數是研究排序工具，不是買賣建議；正式決策前仍需人工覆核。",
  ].join("\n");
}

function sortComparisonRows(rows: AssetComparisonRow[], sortKey: AssetComparisonSortKey) {
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

export function MarketDataPanel() {
  const {
    data,
    bigQueryStatus,
    bigQueryDiagnostics,
    error,
    bigQueryError,
    bigQueryDiagnosticsError,
    isLoading,
    reload,
  } = useMarketSources();
  const [assetQuery, setAssetQuery] = useState("0050.TW");
  const [assetPriceBasis, setAssetPriceBasis] = useState<"adjusted" | "raw">("adjusted");
  const [assetSuggestions, setAssetSuggestions] = useState<BigQueryAsset[]>([]);
  const [assetProfile, setAssetProfile] = useState<BigQueryAssetProfileResponse | null>(null);
  const [assetPanelError, setAssetPanelError] = useState<string | null>(null);
  const [isSearchingAssets, setIsSearchingAssets] = useState(false);
  const [isLoadingAssetProfile, setIsLoadingAssetProfile] = useState(false);
  const [comparisonSymbols, setComparisonSymbols] = useState("0050.TW SPY QQQ");
  const [comparisonRows, setComparisonRows] = useState<AssetComparisonRow[]>([]);
  const [comparisonError, setComparisonError] = useState<string | null>(null);
  const [isLoadingComparison, setIsLoadingComparison] = useState(false);
  const [comparisonSignalFilter, setComparisonSignalFilter] = useState<AssetDecisionSignal | "all">("all");
  const [comparisonSortKey, setComparisonSortKey] = useState<AssetComparisonSortKey>("score");
  const [minimumComparisonScore, setMinimumComparisonScore] = useState(0);
  const [allocationMode, setAllocationMode] = useState<AllocationMode>("risk");
  const [allocationCapital, setAllocationCapital] = useState(1_000_000);
  const [maximumAllocationWeight, setMaximumAllocationWeight] = useState(0.35);
  const [stressShockPercent, setStressShockPercent] = useState(-20);
  const [currentHoldingsText, setCurrentHoldingsText] = useState("");
  const [rebalanceThreshold, setRebalanceThreshold] = useState(0.02);
  const [minimumTradeAmount, setMinimumTradeAmount] = useState(10_000);
  const [maximumBatchAmount, setMaximumBatchAmount] = useState(300_000);
  const [maximumTicketsPerBatch, setMaximumTicketsPerBatch] = useState(4);
  const [monitoringHorizonDays, setMonitoringHorizonDays] = useState(10);
  const [monitoringDrawdownAlertPercent, setMonitoringDrawdownAlertPercent] = useState(-8);
  const [policyMaxSingleWeightPercent, setPolicyMaxSingleWeightPercent] = useState(35);
  const [policyMaxVolatilityPercent, setPolicyMaxVolatilityPercent] = useState(25);
  const [policyMaxDrawdownPercent, setPolicyMaxDrawdownPercent] = useState(-25);
  const [policyMinimumScore, setPolicyMinimumScore] = useState(55);
  const [decisionOwner, setDecisionOwner] = useState("Frank");
  const [decisionApprover, setDecisionApprover] = useState("投委會");
  const [decisionGeneratedAt, setDecisionGeneratedAt] = useState(() => new Date().toISOString());
  const [executionOwner, setExecutionOwner] = useState("交易員");
  const [riskOwner, setRiskOwner] = useState("風控");
  const [settlementOwner, setSettlementOwner] = useState("中台");
  const [handoffDueDays, setHandoffDueDays] = useState(3);
  const [fillCompletionPercent, setFillCompletionPercent] = useState(100);
  const [fillSlippageBps, setFillSlippageBps] = useState(8);
  const [fillCommissionBps, setFillCommissionBps] = useState(3);
  const [postTradeReviewDays, setPostTradeReviewDays] = useState(5);
  const [postTradeBenchmarkMovePercent, setPostTradeBenchmarkMovePercent] = useState(0);
  const [exceptionDueDays, setExceptionDueDays] = useState(2);
  const [slaCriticalHours, setSlaCriticalHours] = useState(24);
  const [slaReviewHours, setSlaReviewHours] = useState(72);
  const [watchlistPresetName, setWatchlistPresetName] = useState("核心 ETF");
  const [selectedWatchlistPresetId, setSelectedWatchlistPresetId] = useState("");
  const [savedWatchlistPresets, setSavedWatchlistPresets] = useState<SavedWatchlistPreset[]>([]);
  const [watchlistMemoCopyStatus, setWatchlistMemoCopyStatus] = useState<"idle" | "copied">("idle");
  const sources = data?.sources ?? [];
  const securedCount = sources.filter((source) => source.status !== "needs_secret").length;
  const hasBigQueryCredentials = Boolean(
    bigQueryStatus?.hasServiceAccountEnv || bigQueryStatus?.hasGoogleApplicationCredentials,
  );
  const bigQueryBadge = hasBigQueryCredentials
    ? "已設定憑證"
    : "等待 Vercel 金鑰";
  const priceFreshnessDays = daysSinceDate(bigQueryDiagnostics?.priceSummary.latest_date);
  const fxFreshnessDays = daysSinceDate(bigQueryDiagnostics?.fxSummary.latest_date);
  const priceFreshnessStatus = freshnessStatus(priceFreshnessDays);
  const fxFreshnessStatus = freshnessStatus(fxFreshnessDays);
  const staleSymbols = bigQueryDiagnostics?.staleSymbols ?? [];
  const fxCurrencies = bigQueryDiagnostics?.fxCurrencies ?? [];
  const staleSymbolStatus: QualityStatus = staleSymbols.length >= 5 ? "risk" : staleSymbols.length > 0 ? "watch" : "strong";
  const fxCurrencyStatus: QualityStatus = coverageStatus(fxCurrencies.length, 2, 1);
  const schemaStatus: QualityStatus = bigQueryDiagnostics
    ? bigQueryDiagnostics.schemaChecks.priceTable.isReady && bigQueryDiagnostics.schemaChecks.fxTable.isReady
      ? "strong"
      : "risk"
    : "neutral";
  const priceSchemaStatus: QualityStatus = bigQueryDiagnostics
    ? bigQueryDiagnostics.schemaChecks.priceTable.isReady
      ? "strong"
      : "risk"
    : "neutral";
  const fxSchemaStatus: QualityStatus = bigQueryDiagnostics
    ? bigQueryDiagnostics.schemaChecks.fxTable.isReady
      ? "strong"
      : "risk"
    : "neutral";
  const symbolCoverageStatus = coverageStatus(bigQueryDiagnostics?.priceSummary.symbol_count, 50, 10);
  const priceDepthStatus = coverageStatus(bigQueryDiagnostics?.priceSummary.row_count, 50_000, 5_000);
  const qualityCards: Array<{ label: string; value: string; status: QualityStatus; note: string }> = [
    {
      label: "Schema",
      value: bigQueryDiagnostics ? (schemaStatus === "strong" ? "Ready" : "Missing") : "--",
      status: schemaStatus,
      note: schemaStatus === "strong" ? "價格表與匯率表欄位完整" : schemaStatus === "risk" ? "必要欄位缺失" : "尚未讀取",
    },
    {
      label: "價格新鮮度",
      value: priceFreshnessDays === null ? "--" : `${priceFreshnessDays} 天`,
      status: priceFreshnessStatus,
      note: bigQueryDiagnostics?.priceSummary.latest_date ?? "尚無價格最新日",
    },
    {
      label: "匯率新鮮度",
      value: fxFreshnessDays === null ? "--" : `${fxFreshnessDays} 天`,
      status: fxFreshnessStatus,
      note: bigQueryDiagnostics?.fxSummary.latest_date ?? "尚無匯率最新日",
    },
    {
      label: "商品覆蓋",
      value: `${formatCount(bigQueryDiagnostics?.priceSummary.symbol_count)} 檔`,
      status: symbolCoverageStatus,
      note: "daily_prices 可分析商品數",
    },
    {
      label: "價格深度",
      value: `${formatCount(bigQueryDiagnostics?.priceSummary.row_count)} 筆`,
      status: priceDepthStatus,
      note: "daily_prices 歷史價格筆數",
    },
  ];
  const issueCards: Array<{ label: string; value: string; status: QualityStatus; note: string }> = [
    {
      label: "落後商品",
      value: `${staleSymbols.length} 檔`,
      status: bigQueryDiagnostics ? staleSymbolStatus : "neutral",
      note: staleSymbols.length ? "部分商品最新日落後於價格表最新日" : "未偵測到落後商品",
    },
    {
      label: "匯率幣別",
      value: `${fxCurrencies.length} 組`,
      status: bigQueryDiagnostics ? fxCurrencyStatus : "neutral",
      note: "daily_fx 可供換算的幣別數",
    },
  ];
  const visibleComparisonRows = sortComparisonRows(
    comparisonRows.filter((row) => {
      const signalMatched = comparisonSignalFilter === "all" || row.signal === comparisonSignalFilter;
      return signalMatched && row.score >= minimumComparisonScore;
    }),
    comparisonSortKey,
  );
  const modelAllocationRows = allocationDraftRows(visibleComparisonRows, allocationMode, allocationCapital, maximumAllocationWeight);
  const activeAllocationRows = modelAllocationRows.filter((row) => row.allocationWeight > 0);
  const effectiveMaximumAllocationWeight = Math.max(
    maximumAllocationWeight,
    activeAllocationRows.length ? 1 / activeAllocationRows.length : maximumAllocationWeight,
  );
  const allocationRisk = allocationRiskSnapshot(activeAllocationRows, stressShockPercent);
  const rebalanceRows = rebalanceDraftRows(activeAllocationRows, currentHoldingsText, rebalanceThreshold);
  const activeRebalanceRows = rebalanceRows.filter((row) => row.direction !== "hold");
  const tradeTickets = tradeTicketRows(rebalanceRows, minimumTradeAmount);
  const skippedTradeCount = activeRebalanceRows.length - tradeTickets.length;
  const tradeBatches = tradeBatchRows(tradeTickets, maximumBatchAmount, maximumTicketsPerBatch);
  const tradeBatchCount = tradeBatches.reduce((maxValue, row) => Math.max(maxValue, row.batchNumber), 0);
  const firstTradeBatch = tradeBatches.find((row) => row.batchNumber === 1);
  const maximumTradeBatchGross = tradeBatches.reduce((maxValue, row) => Math.max(maxValue, row.batchGrossAmount), 0);
  const averageTradeBatchGross = tradeBatchCount > 0 ? tradeBatches.reduce((sum, row) => {
    if (row.sequenceInBatch !== 1) return sum;
    return sum + row.batchGrossAmount;
  }, 0) / tradeBatchCount : null;
  const executionReviewItems = tradeExecutionReviewItems({
    tradeTickets,
    activeTrades: activeRebalanceRows,
    allocationCapital,
    priceFreshnessDays,
    allocationRisk,
    skippedTradeCount,
  });
  const executionBlockCount = executionReviewItems.filter((item) => item.status === "block").length;
  const executionWatchCount = executionReviewItems.filter((item) => item.status === "watch").length;
  const executionReviewDecision: ExecutionReviewStatus = executionBlockCount > 0 ? "block" : executionWatchCount > 0 ? "watch" : "pass";
  const monitoringRules = tradeMonitoringRuleItems({
    tradeTickets,
    tradeBatches,
    activeTrades: activeRebalanceRows,
    allocationCapital,
    allocationRisk,
    priceFreshnessDays,
    skippedTradeCount,
    monitoringHorizonDays,
    monitoringDrawdownAlertPercent,
  });
  const monitoringAlertCount = monitoringRules.filter((item) => item.status === "block").length;
  const monitoringWatchCount = monitoringRules.filter((item) => item.status === "watch").length;
  const monitoringDecision: ExecutionReviewStatus = monitoringAlertCount > 0 ? "block" : monitoringWatchCount > 0 ? "watch" : "pass";
  const policyLimitItems = investmentPolicyLimitItems({
    allocationRows: activeAllocationRows,
    allocationRisk,
    tradeTickets,
    allocationCapital,
    priceFreshnessDays,
    policyMaxSingleWeightPercent,
    policyMaxVolatilityPercent,
    policyMaxDrawdownPercent,
    policyMinimumScore,
  });
  const policyBlockCount = policyLimitItems.filter((item) => item.status === "block").length;
  const policyWatchCount = policyLimitItems.filter((item) => item.status === "watch").length;
  const policyDecision: ExecutionReviewStatus = policyBlockCount > 0 ? "block" : policyWatchCount > 0 ? "watch" : "pass";
  const committeeDecision = committeeDecisionFromItems({
    tradeTickets,
    executionReviewItems,
    monitoringRules,
    policyLimitItems,
  });
  const committeeApprovalItems = committeeApprovalChecklist({
    decision: committeeDecision,
    tradeTickets,
    tradeBatches,
    executionReviewItems,
    monitoringRules,
    policyLimitItems,
    allocationRisk,
    allocationCapital,
    skippedTradeCount,
  });
  const committeeBlockCount = committeeApprovalItems.filter((item) => item.status === "block").length;
  const committeeWatchCount = committeeApprovalItems.filter((item) => item.status === "watch").length;
  const decisionAuditId = buildDecisionAuditId(watchlistPresetName, comparisonSymbols, decisionGeneratedAt);
  const decisionAuditGeneratedText = formatDecisionAuditTime(decisionGeneratedAt);
  const decisionAuditRecords = buildDecisionAuditRecords({
    auditId: decisionAuditId,
    generatedAt: decisionGeneratedAt,
    owner: decisionOwner,
    approver: decisionApprover,
    watchlistName: watchlistPresetName,
    comparisonSymbols,
    committeeDecision,
    policyDecision,
    policyLimitItems,
    executionReviewItems,
    monitoringRules,
    committeeApprovalItems,
    tradeTickets,
    tradeBatches,
    allocationCapital,
  });
  const executionHandoffItems = buildExecutionHandoffItems({
    auditId: decisionAuditId,
    executionOwner,
    riskOwner,
    settlementOwner,
    handoffDueDays,
    committeeDecision,
    policyDecision,
    monitoringDecision,
    tradeTickets,
    tradeBatches,
    allocationCapital,
    policyBlockCount,
    policyWatchCount,
    committeeBlockCount,
    committeeWatchCount,
  });
  const handoffBlockCount = executionHandoffItems.filter((item) => item.status === "block").length;
  const handoffWatchCount = executionHandoffItems.filter((item) => item.status === "watch").length;
  const handoffHighPriorityCount = executionHandoffItems.filter((item) => item.priority === "high").length;
  const executionFillRows = buildExecutionFillRows({
    tradeTickets,
    fillCompletionPercent,
    fillSlippageBps,
    fillCommissionBps,
  });
  const fillBlockCount = executionFillRows.filter((item) => item.fillStatus === "block").length;
  const fillWatchCount = executionFillRows.filter((item) => item.fillStatus === "watch").length;
  const executionFillDecision: ExecutionReviewStatus = fillBlockCount > 0 ? "block" : fillWatchCount > 0 ? "watch" : "pass";
  const totalFilledNotional = executionFillRows.reduce((sum, row) => sum + row.filledNotional, 0);
  const totalUnfilledNotional = executionFillRows.reduce((sum, row) => sum + row.unfilledNotional, 0);
  const totalExecutionCost = executionFillRows.reduce((sum, row) => sum + row.totalCost, 0);
  const totalCashImpactAfterCost = executionFillRows.reduce((sum, row) => sum + row.cashImpactAfterCost, 0);
  const postTradeAttributionRows = postTradeAttributionItems({
    executionFillRows,
    allocationCapital,
    postTradeReviewDays,
    postTradeBenchmarkMovePercent,
  });
  const postTradeBlockCount = postTradeAttributionRows.filter((item) => item.status === "block").length;
  const postTradeWatchCount = postTradeAttributionRows.filter((item) => item.status === "watch").length;
  const postTradeDecision: ExecutionReviewStatus = postTradeBlockCount > 0 ? "block" : postTradeWatchCount > 0 ? "watch" : "pass";
  const postTradeResidualMarketImpact = totalUnfilledNotional * (postTradeBenchmarkMovePercent / 100);
  const platformExceptionItems = platformExceptionQueueItems({
    policyLimitItems,
    executionReviewItems,
    monitoringRules,
    committeeApprovalItems,
    executionHandoffItems,
    executionFillRows,
    postTradeAttributionRows,
    executionOwner,
    riskOwner,
    settlementOwner,
    decisionApprover,
    exceptionDueDays,
  });
  const platformExceptionBlockCount = platformExceptionItems.filter((item) => item.status === "block").length;
  const platformExceptionWatchCount = platformExceptionItems.filter((item) => item.status === "watch").length;
  const platformExceptionHighPriorityCount = platformExceptionItems.filter((item) => item.priority === "high").length;
  const platformExceptionDecision: ExecutionReviewStatus =
    platformExceptionBlockCount > 0 ? "block" : platformExceptionWatchCount > 0 ? "watch" : "pass";
  const dataReadinessDecision = combinedExecutionStatus([
    qualityToExecutionStatus(schemaStatus),
    qualityToExecutionStatus(priceFreshnessStatus),
    qualityToExecutionStatus(symbolCoverageStatus),
    qualityToExecutionStatus(priceDepthStatus),
  ]);
  const pricePipelineDecision = combinedExecutionStatus([
    qualityToExecutionStatus(priceSchemaStatus),
    qualityToExecutionStatus(priceFreshnessStatus),
    qualityToExecutionStatus(symbolCoverageStatus),
    qualityToExecutionStatus(priceDepthStatus),
    qualityToExecutionStatus(staleSymbolStatus),
  ]);
  const fxPipelineDecision = combinedExecutionStatus([
    qualityToExecutionStatus(fxSchemaStatus),
    qualityToExecutionStatus(fxFreshnessStatus),
    qualityToExecutionStatus(fxCurrencyStatus),
  ]);
  const dataPipelineHealthItems = buildDataPipelineHealthItems({
    hasBigQueryCredentials,
    diagnostics: bigQueryDiagnostics ?? undefined,
    schemaStatus,
    priceFreshnessStatus,
    fxFreshnessStatus,
    symbolCoverageStatus,
    priceDepthStatus,
    staleSymbolStatus,
    fxCurrencyStatus,
    staleSymbols,
    fxCurrencies,
    riskOwner,
  });
  const dataPipelineTableSnapshots = buildDataPipelineTableSnapshots({
    diagnostics: bigQueryDiagnostics ?? undefined,
    priceFreshnessDays,
    fxFreshnessDays,
    priceStatus: pricePipelineDecision,
    fxStatus: fxPipelineDecision,
    riskOwner,
  });
  const dataPipelineBlockCount = dataPipelineHealthItems.filter((item) => item.status === "block").length;
  const dataPipelineWatchCount = dataPipelineHealthItems.filter((item) => item.status === "watch").length;
  const dataPipelineDecision = combinedExecutionStatus(dataPipelineHealthItems.map((item) => item.status));
  const dataContractItems = buildDataContractItems({
    diagnostics: bigQueryDiagnostics ?? undefined,
    priceFreshnessDays,
    fxFreshnessDays,
    priceFreshnessStatus,
    fxFreshnessStatus,
    riskOwner,
  });
  const dataContractBlockCount = dataContractItems.filter((item) => item.status === "block").length;
  const dataContractWatchCount = dataContractItems.filter((item) => item.status === "watch").length;
  const dataContractDecision = dataContractItems.length
    ? combinedExecutionStatus(dataContractItems.map((item) => item.status))
    : "watch";
  const coverageUniverseItems = buildCoverageUniverseItems({
    diagnostics: bigQueryDiagnostics ?? undefined,
    staleSymbols,
    fxCurrencies,
    symbolCoverageStatus,
    priceDepthStatus,
    fxCurrencyStatus,
    riskOwner,
  });
  const coverageUniverseBlockCount = coverageUniverseItems.filter((item) => item.status === "block").length;
  const coverageUniverseWatchCount = coverageUniverseItems.filter((item) => item.status === "watch").length;
  const coverageUniverseDecision = coverageUniverseItems.length
    ? combinedExecutionStatus(coverageUniverseItems.map((item) => item.status))
    : "watch";
  const dataRemediationItems = buildDataRemediationItems({
    sources,
    dataPipelineHealthItems,
    dataContractItems,
    coverageUniverseItems,
    riskOwner,
  });
  const dataRemediationHighCount = dataRemediationItems.filter((item) => item.priority === "high").length;
  const dataRemediationMediumCount = dataRemediationItems.filter((item) => item.priority === "medium").length;
  const dataRemediationDecision = dataRemediationItems.length
    ? combinedExecutionStatus(dataRemediationItems.map((item) => item.status))
    : "pass";
  const dataLineageItems = buildDataLineageItems({
    sources,
    dataPipelineTableSnapshots,
    dataContractItems,
    coverageUniverseItems,
    dataRemediationItems,
    riskOwner,
    decisionOwner,
  });
  const dataLineageBlockCount = dataLineageItems.filter((item) => item.status === "block").length;
  const dataLineageWatchCount = dataLineageItems.filter((item) => item.status === "watch").length;
  const dataLineageDecision = dataLineageItems.length
    ? combinedExecutionStatus(dataLineageItems.map((item) => item.status))
    : "watch";
  const candidateVisibleCount = visibleComparisonRows.filter((row) => row.signal === "candidate").length;
  const cioOperatingBriefItems = buildCioOperatingBriefItems({
    dataStatus: dataReadinessDecision,
    visibleRows: visibleComparisonRows.length,
    candidateCount: candidateVisibleCount,
    activeAllocationCount: activeAllocationRows.length,
    allocationRisk,
    tradeTickets,
    tradeBatchCount,
    committeeDecision,
    executionFillDecision,
    postTradeDecision,
    platformExceptionDecision,
    platformExceptionBlockCount,
    platformExceptionWatchCount,
    totalExecutionCost,
    totalUnfilledNotional,
    totalCashImpactAfterCost,
  });
  const cioOperatingDecision = cioOperatingBriefItems[0]?.status ?? "watch";
  const slaEscalationItems = buildSlaEscalationItems({
    platformExceptionItems,
    cioOperatingDecision,
    riskOwner,
    decisionApprover,
    slaCriticalHours,
    slaReviewHours,
  });
  const slaCriticalCount = slaEscalationItems.filter((item) => item.tier === "critical").length;
  const slaReviewCount = slaEscalationItems.filter((item) => item.tier === "review").length;
  const slaEscalationDecision: ExecutionReviewStatus =
    slaCriticalCount > 0 ? "block" : slaReviewCount > 0 || cioOperatingDecision !== "pass" ? "watch" : "pass";
  const operatingKriItems = buildOperatingKriItems({
    dataStatus: dataReadinessDecision,
    allocationRisk,
    tradeTickets,
    executionFillRows,
    totalExecutionCost,
    totalUnfilledNotional,
    platformExceptionItems,
    slaEscalationItems,
    postTradeDecision,
    riskOwner,
    executionOwner,
    decisionApprover,
    priceFreshnessDays,
  });
  const operatingKriBlockCount = operatingKriItems.filter((item) => item.status === "block").length;
  const operatingKriWatchCount = operatingKriItems.filter((item) => item.status === "watch").length;
  const operatingKriDecision = combinedExecutionStatus(operatingKriItems.map((item) => item.status));
  const filledTradeCount = executionFillRows.filter((row) => row.filledNotional > 0).length;
  const decisionFunnelStages = buildDecisionFunnelStages({
    totalRows: comparisonRows.length,
    visibleRows: visibleComparisonRows.length,
    candidateCount: candidateVisibleCount,
    activeAllocationCount: activeAllocationRows.length,
    activeRebalanceCount: activeRebalanceRows.length,
    tradeTicketCount: tradeTickets.length,
    filledTradeCount,
    dataStatus: dataReadinessDecision,
    executionFillDecision,
    operatingKriDecision,
    platformExceptionDecision,
    platformExceptionCount: platformExceptionItems.length,
    operatingKriBlockCount,
    operatingKriWatchCount,
    riskOwner,
    executionOwner,
    decisionApprover,
  });
  const decisionFunnelBlockCount = decisionFunnelStages.filter((stage) => stage.status === "block").length;
  const decisionFunnelWatchCount = decisionFunnelStages.filter((stage) => stage.status === "watch").length;
  const decisionFunnelDecision = combinedExecutionStatus(decisionFunnelStages.map((stage) => stage.status));
  const marketAlertEvents = buildMarketAlertEvents({
    coverageUniverseItems,
    dataContractItems,
    dataPipelineHealthItems,
    qualityCards,
    decisionFunnelStages,
    operatingKriItems,
    platformExceptionItems,
    slaEscalationItems,
    riskOwner,
    decisionApprover,
  });
  const marketHighAlertCount = marketAlertEvents.filter((event) => event.priority === "high").length;
  const marketMediumAlertCount = marketAlertEvents.filter((event) => event.priority === "medium").length;
  const marketAlertDecision = marketAlertEvents.length
    ? combinedExecutionStatus(marketAlertEvents.map((event) => event.status))
    : "pass";
  const dataProductCatalogItems = buildDataProductCatalogItems({
    dataReadinessDecision,
    coverageUniverseDecision,
    dataRemediationDecision,
    dataLineageDecision,
    marketAlertDecision,
    comparisonRows,
    visibleComparisonRows,
    activeAllocationRows,
    tradeTickets,
    dataRemediationItems,
    riskOwner,
    decisionOwner,
  });
  const dataProductReadyCount = dataProductCatalogItems.filter((item) => item.status === "pass").length;
  const dataProductWatchCount = dataProductCatalogItems.filter((item) => item.status === "watch").length;
  const dataProductCatalogDecision = dataProductCatalogItems.length
    ? combinedExecutionStatus(dataProductCatalogItems.map((item) => item.status))
    : "watch";
  const apiServiceCatalogItems = buildApiServiceCatalogItems({
    dataReadinessDecision,
    dataProductCatalogDecision,
    dataLineageDecision,
    dataRemediationDecision,
    hasBigQueryCredentials,
    comparisonRows,
    activeAllocationRows: modelAllocationRows,
    tradeTickets,
    riskOwner,
    decisionOwner,
  });
  const apiServiceReadyCount = apiServiceCatalogItems.filter((item) => item.status === "pass").length;
  const apiServiceWatchCount = apiServiceCatalogItems.filter((item) => item.status === "watch").length;
  const apiServiceCatalogDecision = apiServiceCatalogItems.length
    ? combinedExecutionStatus(apiServiceCatalogItems.map((item) => item.status))
    : "watch";
  const apiContractBlueprintItems = buildApiContractBlueprintItems({
    apiServiceCatalogItems,
    hasBigQueryCredentials,
    riskOwner,
    decisionOwner,
  });
  const apiContractStableCount = apiContractBlueprintItems.filter((item) => item.stability === "stable").length;
  const apiContractDraftCount = apiContractBlueprintItems.filter((item) => item.stability === "draft").length;
  const apiContractBlueprintDecision = apiContractBlueprintItems.length
    ? combinedExecutionStatus(apiContractBlueprintItems.map((item) => item.status))
    : "watch";
  const platformEntitlementItems = buildPlatformEntitlementItems({
    dataReadinessDecision,
    apiServiceCatalogDecision,
    apiContractBlueprintDecision,
    marketAlertDecision,
    hasBigQueryCredentials,
    comparisonRows,
    activeAllocationRows: modelAllocationRows,
    tradeTickets,
    riskOwner,
    decisionOwner,
  });
  const entitlementReadyCount = platformEntitlementItems.filter((item) => item.status === "pass").length;
  const entitlementRestrictedCount = platformEntitlementItems.filter((item) => item.status === "block").length;
  const platformEntitlementDecision = platformEntitlementItems.length
    ? combinedExecutionStatus(platformEntitlementItems.map((item) => item.status))
    : "watch";
  const clientWorkspaceProvisioningItems = buildClientWorkspaceProvisioningItems({
    dataReadinessDecision,
    apiContractBlueprintDecision,
    platformEntitlementDecision,
    marketAlertDecision,
    hasBigQueryCredentials,
    comparisonRows,
    activeAllocationRows: modelAllocationRows,
    tradeTickets,
    riskOwner,
    decisionOwner,
  });
  const workspaceReadyCount = clientWorkspaceProvisioningItems.filter((item) => item.status === "pass").length;
  const workspaceBlockedCount = clientWorkspaceProvisioningItems.filter((item) => item.status === "block").length;
  const clientWorkspaceProvisioningDecision = clientWorkspaceProvisioningItems.length
    ? combinedExecutionStatus(clientWorkspaceProvisioningItems.map((item) => item.status))
    : "watch";
  const usageBillingItems = buildUsageBillingItems({
    clientWorkspaceProvisioningItems,
    apiContractBlueprintDecision,
    platformEntitlementDecision,
    riskOwner,
    decisionOwner,
  });
  const billableWorkspaceCount = usageBillingItems.filter((item) => item.monthlyRevenue.startsWith("NT$") || item.monthlyRevenue.includes("合約")).length;
  const billingReadyCount = usageBillingItems.filter((item) => item.status === "pass").length;
  const usageBillingDecision = usageBillingItems.length
    ? combinedExecutionStatus(usageBillingItems.map((item) => item.status))
    : "watch";
  const dataLicenseComplianceItems = buildDataLicenseComplianceItems({
    dataReadinessDecision,
    apiContractBlueprintDecision,
    platformEntitlementDecision,
    clientWorkspaceProvisioningDecision,
    usageBillingDecision,
    marketAlertDecision,
    hasBigQueryCredentials,
    riskOwner,
    decisionOwner,
  });
  const licenseReadyCount = dataLicenseComplianceItems.filter((item) => item.status === "pass").length;
  const licenseRestrictedCount = dataLicenseComplianceItems.filter(
    (item) => item.redistribution.includes("不得") || item.exportPolicy.includes("需"),
  ).length;
  const dataLicenseComplianceDecision = dataLicenseComplianceItems.length
    ? combinedExecutionStatus(dataLicenseComplianceItems.map((item) => item.status))
    : "watch";
  const securityAuditItems = buildSecurityAuditItems({
    apiContractBlueprintDecision,
    platformEntitlementDecision,
    clientWorkspaceProvisioningDecision,
    usageBillingDecision,
    dataLicenseComplianceDecision,
    marketAlertDecision,
    hasBigQueryCredentials,
    riskOwner,
    decisionOwner,
  });
  const securityReadyCount = securityAuditItems.filter((item) => item.status === "pass").length;
  const securityBlockCount = securityAuditItems.filter((item) => item.status === "block").length;
  const securityAuditDecision = securityAuditItems.length
    ? combinedExecutionStatus(securityAuditItems.map((item) => item.status))
    : "watch";
  const incidentCommandItems = buildIncidentCommandItems({
    dataPipelineDecision,
    dataContractDecision,
    dataRemediationDecision,
    marketAlertDecision,
    apiServiceCatalogDecision,
    apiContractBlueprintDecision,
    platformEntitlementDecision,
    clientWorkspaceProvisioningDecision,
    usageBillingDecision,
    dataLicenseComplianceDecision,
    securityAuditDecision,
    dataPipelineBlockCount,
    dataContractBlockCount,
    dataRemediationHighCount,
    marketHighAlertCount,
    workspaceBlockedCount,
    securityBlockCount,
    hasBigQueryCredentials,
    riskOwner,
    decisionOwner,
    executionOwner,
  });
  const incidentOpenCount = incidentCommandItems.filter((item) => item.status !== "pass").length;
  const incidentHighPriorityCount = incidentCommandItems.filter((item) => item.severity === "high").length;
  const incidentCommandDecision = incidentCommandItems.length
    ? combinedExecutionStatus(incidentCommandItems.map((item) => item.status))
    : "watch";
  const productReleaseGateItems = buildProductReleaseGateItems({
    dataPipelineDecision,
    dataProductCatalogDecision,
    dataLineageDecision,
    apiServiceCatalogDecision,
    apiContractBlueprintDecision,
    platformEntitlementDecision,
    clientWorkspaceProvisioningDecision,
    usageBillingDecision,
    dataLicenseComplianceDecision,
    securityAuditDecision,
    incidentCommandDecision,
    marketAlertDecision,
    hasBigQueryCredentials,
    comparisonRows,
    activeAllocationRows: modelAllocationRows,
    tradeTickets,
    incidentOpenCount,
    incidentHighPriorityCount,
    riskOwner,
    decisionOwner,
    executionOwner,
  });
  const releaseProductionCount = productReleaseGateItems.filter((item) => item.releaseStage === "production").length;
  const releasePilotCount = productReleaseGateItems.filter((item) => item.releaseStage === "pilot").length;
  const releaseHoldCount = productReleaseGateItems.filter((item) => item.releaseStage === "hold").length;
  const productReleaseGateDecision = productReleaseGateItems.length
    ? combinedExecutionStatus(productReleaseGateItems.map((item) => item.status))
    : "watch";
  const customerSuccessHealthItems = buildCustomerSuccessHealthItems({
    clientWorkspaceProvisioningItems,
    usageBillingItems,
    productReleaseGateItems,
    incidentCommandItems,
    usageBillingDecision,
    dataLicenseComplianceDecision,
    securityAuditDecision,
    incidentCommandDecision,
    riskOwner,
    decisionOwner,
    executionOwner,
  });
  const customerHealthyCount = customerSuccessHealthItems.filter(
    (item) => item.healthStage === "healthy" || item.healthStage === "expand",
  ).length;
  const customerExpansionCount = customerSuccessHealthItems.filter((item) => item.healthStage === "expand").length;
  const customerRiskCount = customerSuccessHealthItems.filter((item) => item.healthStage === "risk").length;
  const customerSuccessHealthDecision = customerSuccessHealthItems.length
    ? combinedExecutionStatus(customerSuccessHealthItems.map((item) => item.status))
    : "watch";
  const revenueForecastItems = buildRevenueForecastItems({
    customerSuccessHealthItems,
    usageBillingItems,
  });
  const revenueCurrentMrr = revenueForecastItems.reduce((sum, item) => sum + item.currentMrr, 0);
  const revenueExpansionMrr = revenueForecastItems.reduce((sum, item) => sum + item.expansionMrr, 0);
  const revenueRiskMrr = revenueForecastItems.reduce((sum, item) => sum + item.churnRiskMrr, 0);
  const revenueProjectedMrr = revenueForecastItems.reduce((sum, item) => sum + item.projectedMrr, 0);
  const revenueForecastDecision = revenueForecastItems.length
    ? combinedExecutionStatus(revenueForecastItems.map((item) => item.status))
    : "watch";

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const presets = loadWatchlistPresetsFromStorage();
      setSavedWatchlistPresets(presets);
      setSelectedWatchlistPresetId((currentId) => currentId || presets[0]?.id || "");
      setWatchlistPresetName((currentName) => currentName || presets[0]?.name || "核心 ETF");
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  const assetProfileQualityCards: Array<{ label: string; value: string; status: QualityStatus; note: string }> = assetProfile
    ? [
        {
          label: "價格新鮮度",
          value: `${daysSinceDate(assetProfile.summary.latest_date) ?? "--"} 天`,
          status: freshnessStatus(daysSinceDate(assetProfile.summary.latest_date)),
          note: assetProfile.summary.latest_date ?? "--",
        },
        {
          label: "資料完整度",
          value: `${formatCount(assetProfile.summary.selected_price_rows)} / ${formatCount(assetProfile.summary.row_count)}`,
          status:
            assetProfile.summary.missing_selected_price_rows === 0
              ? "strong"
              : assetProfile.summary.missing_selected_price_rows <= 5
                ? "watch"
                : "risk",
          note: `缺 ${formatCount(assetProfile.summary.missing_selected_price_rows)} 筆 ${assetProfile.priceBasis}`,
        },
        {
          label: "累積報酬",
          value: formatPercent(assetProfile.metrics.totalReturn),
          status:
            typeof assetProfile.metrics.totalReturn === "number"
              ? assetProfile.metrics.totalReturn >= 0
                ? "strong"
                : "risk"
              : "neutral",
          note: `${assetProfile.summary.first_date ?? "--"} ~ ${assetProfile.summary.latest_date ?? "--"}`,
        },
        {
          label: "年化波動",
          value: formatPercent(assetProfile.metrics.annualizedVolatility),
          status:
            typeof assetProfile.metrics.annualizedVolatility === "number"
              ? assetProfile.metrics.annualizedVolatility <= 0.18
                ? "strong"
                : assetProfile.metrics.annualizedVolatility <= 0.35
                  ? "watch"
                  : "risk"
              : "neutral",
          note: "以日報酬換算 252 交易日",
        },
        {
          label: "最大回撤",
          value: formatPercent(assetProfile.metrics.maxDrawdown),
          status:
            typeof assetProfile.metrics.maxDrawdown === "number"
              ? Math.abs(assetProfile.metrics.maxDrawdown) <= 0.15
                ? "strong"
                : Math.abs(assetProfile.metrics.maxDrawdown) <= 0.3
                  ? "watch"
                  : "risk"
              : "neutral",
          note: "單一商品高低點壓力",
        },
      ]
    : [];
  const handleExportDiagnosticsCsv = () => {
    if (!bigQueryDiagnostics) return;

    const rows = [
      ["section", "name", "value", "status", "note"],
      ...qualityCards.map((card) => ["quality", card.label, card.value, card.status, card.note]),
      ["summary", "price_first_date", bigQueryDiagnostics.priceSummary.first_date ?? "", "", ""],
      ["summary", "price_latest_date", bigQueryDiagnostics.priceSummary.latest_date ?? "", "", ""],
      ["summary", "price_row_count", bigQueryDiagnostics.priceSummary.row_count ?? "", "", ""],
      ["summary", "price_symbol_count", bigQueryDiagnostics.priceSummary.symbol_count ?? "", "", ""],
      ["summary", "adjusted_price_rows", bigQueryDiagnostics.priceSummary.adjusted_price_rows ?? "", "", ""],
      ["summary", "raw_price_rows", bigQueryDiagnostics.priceSummary.raw_price_rows ?? "", "", ""],
      ["summary", "fx_first_date", bigQueryDiagnostics.fxSummary.first_date ?? "", "", ""],
      ["summary", "fx_latest_date", bigQueryDiagnostics.fxSummary.latest_date ?? "", "", ""],
      ["summary", "fx_row_count", bigQueryDiagnostics.fxSummary.row_count ?? "", "", ""],
      ["summary", "fx_currency_count", bigQueryDiagnostics.fxSummary.currency_count ?? "", "", ""],
      ...issueCards.map((card) => ["issue", card.label, card.value, card.status, card.note]),
      ...bigQueryDiagnostics.recentSymbols.map((symbol) => [
        "recent_symbol",
        symbol.symbol,
        symbol.latest_date ?? "",
        freshnessStatus(daysSinceDate(symbol.latest_date)),
        symbol.row_count,
      ]),
      ...staleSymbols.map((symbol) => [
        "stale_symbol",
        symbol.symbol,
        symbol.latest_date ?? "",
        symbol.stale_days ?? "",
        symbol.row_count,
      ]),
      ...fxCurrencies.map((currency) => [
        "fx_currency",
        currency.currency,
        currency.latest_date ?? "",
        freshnessStatus(daysSinceDate(currency.latest_date)),
        currency.row_count,
      ]),
    ];

    downloadTextFile(
      `bigquery-data-quality-${resultStamp()}.csv`,
      rows.map((row) => row.map(csvCell).join(",")).join("\n"),
      "text/csv;charset=utf-8",
    );
  };
  const handleExportDataPipelineCsv = () => {
    downloadTextFile(
      `bigquery-data-pipeline-${resultStamp()}.csv`,
      dataPipelineCsv({
        healthItems: dataPipelineHealthItems,
        tableSnapshots: dataPipelineTableSnapshots,
        staleSymbols,
        fxCurrencies,
      }),
      "text/csv;charset=utf-8",
    );
  };
  const handleExportDataContractCsv = () => {
    if (!dataContractItems.length) return;

    downloadTextFile(
      `bigquery-data-contracts-${resultStamp()}.csv`,
      dataContractCsv(dataContractItems),
      "text/csv;charset=utf-8",
    );
  };
  const handleExportCoverageUniverseCsv = () => {
    if (!coverageUniverseItems.length) return;

    downloadTextFile(
      `bigquery-coverage-universe-${resultStamp()}.csv`,
      coverageUniverseCsv(coverageUniverseItems),
      "text/csv;charset=utf-8",
    );
  };
  const handleExportDataRemediationCsv = () => {
    if (!dataRemediationItems.length) return;

    downloadTextFile(
      `bigquery-data-remediation-${resultStamp()}.csv`,
      dataRemediationCsv(dataRemediationItems),
      "text/csv;charset=utf-8",
    );
  };
  const handleExportDataLineageCsv = () => {
    if (!dataLineageItems.length) return;

    downloadTextFile(
      `bigquery-data-lineage-${resultStamp()}.csv`,
      dataLineageCsv(dataLineageItems),
      "text/csv;charset=utf-8",
    );
  };
  const handleExportDataProductCatalogCsv = () => {
    if (!dataProductCatalogItems.length) return;

    downloadTextFile(
      `bigquery-data-product-catalog-${resultStamp()}.csv`,
      dataProductCatalogCsv(dataProductCatalogItems),
      "text/csv;charset=utf-8",
    );
  };
  const handleExportApiServiceCatalogCsv = () => {
    if (!apiServiceCatalogItems.length) return;

    downloadTextFile(
      `bigquery-api-service-catalog-${resultStamp()}.csv`,
      apiServiceCatalogCsv(apiServiceCatalogItems),
      "text/csv;charset=utf-8",
    );
  };
  const handleExportApiContractBlueprintJson = () => {
    if (!apiContractBlueprintItems.length) return;

    downloadTextFile(
      `wealth-dashboard-openapi-blueprint-${resultStamp()}.json`,
      apiContractBlueprintJson(apiContractBlueprintItems),
      "application/json;charset=utf-8",
    );
  };
  const handleExportPlatformEntitlementCsv = () => {
    if (!platformEntitlementItems.length) return;

    downloadTextFile(
      `wealth-dashboard-entitlement-matrix-${resultStamp()}.csv`,
      platformEntitlementCsv(platformEntitlementItems),
      "text/csv;charset=utf-8",
    );
  };
  const handleExportClientWorkspaceCsv = () => {
    if (!clientWorkspaceProvisioningItems.length) return;

    downloadTextFile(
      `wealth-dashboard-client-workspaces-${resultStamp()}.csv`,
      clientWorkspaceProvisioningCsv(clientWorkspaceProvisioningItems),
      "text/csv;charset=utf-8",
    );
  };
  const handleExportUsageBillingCsv = () => {
    if (!usageBillingItems.length) return;

    downloadTextFile(
      `wealth-dashboard-usage-billing-${resultStamp()}.csv`,
      usageBillingCsv(usageBillingItems),
      "text/csv;charset=utf-8",
    );
  };
  const handleExportDataLicenseComplianceCsv = () => {
    if (!dataLicenseComplianceItems.length) return;

    downloadTextFile(
      `wealth-dashboard-data-license-compliance-${resultStamp()}.csv`,
      dataLicenseComplianceCsv(dataLicenseComplianceItems),
      "text/csv;charset=utf-8",
    );
  };
  const handleExportSecurityAuditCsv = () => {
    if (!securityAuditItems.length) return;

    downloadTextFile(
      `wealth-dashboard-security-audit-${resultStamp()}.csv`,
      securityAuditCsv(securityAuditItems),
      "text/csv;charset=utf-8",
    );
  };
  const handleExportIncidentCommandCsv = () => {
    if (!incidentCommandItems.length) return;

    downloadTextFile(
      `wealth-dashboard-incident-command-${resultStamp()}.csv`,
      incidentCommandCsv(incidentCommandItems),
      "text/csv;charset=utf-8",
    );
  };
  const handleExportProductReleaseGateCsv = () => {
    if (!productReleaseGateItems.length) return;

    downloadTextFile(
      `wealth-dashboard-product-release-gate-${resultStamp()}.csv`,
      productReleaseGateCsv(productReleaseGateItems),
      "text/csv;charset=utf-8",
    );
  };
  const handleExportCustomerSuccessHealthCsv = () => {
    if (!customerSuccessHealthItems.length) return;

    downloadTextFile(
      `wealth-dashboard-customer-success-health-${resultStamp()}.csv`,
      customerSuccessHealthCsv(customerSuccessHealthItems),
      "text/csv;charset=utf-8",
    );
  };
  const handleExportRevenueForecastCsv = () => {
    if (!revenueForecastItems.length) return;

    downloadTextFile(
      `wealth-dashboard-revenue-forecast-${resultStamp()}.csv`,
      revenueForecastCsv(revenueForecastItems),
      "text/csv;charset=utf-8",
    );
  };
  const handleSearchAssets = async () => {
    if (!hasBigQueryCredentials || !assetQuery.trim()) return;

    setIsSearchingAssets(true);
    setAssetPanelError(null);
    try {
      const response = await fetchBigQueryAssets(assetQuery, 12);
      setAssetSuggestions(response.assets);
    } catch (err: unknown) {
      setAssetSuggestions([]);
      setAssetPanelError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSearchingAssets(false);
    }
  };
  const handleLoadAssetProfile = async (symbol = assetQuery) => {
    const cleanSymbol = symbol.trim();
    if (!hasBigQueryCredentials || !cleanSymbol) return;

    setIsLoadingAssetProfile(true);
    setAssetPanelError(null);
    try {
      const response = await fetchBigQueryAssetProfile(cleanSymbol, assetPriceBasis);
      setAssetQuery(response.symbol);
      setAssetProfile(response);
    } catch (err: unknown) {
      setAssetProfile(null);
      setAssetPanelError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoadingAssetProfile(false);
    }
  };
  const handleExportAssetProfileCsv = () => {
    if (!assetProfile) return;

    downloadTextFile(
      `bigquery-asset-profile-${assetProfile.symbol}-${resultStamp()}.csv`,
      assetProfileCsv(assetProfile),
      "text/csv;charset=utf-8",
    );
  };
  const handleCompareAssets = async () => {
    const symbols = parseSymbolList(comparisonSymbols);
    if (!hasBigQueryCredentials || !symbols.length) return;

    setIsLoadingComparison(true);
    setComparisonError(null);
    try {
      const profiles = await Promise.all(
        symbols.map((symbol) => fetchBigQueryAssetProfile(symbol, assetPriceBasis)),
      );
      setComparisonRows(profiles.map(comparisonRowFromProfile));
    } catch (err: unknown) {
      setComparisonRows([]);
      setComparisonError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoadingComparison(false);
    }
  };
  const handleExportAssetComparisonCsv = () => {
    if (!visibleComparisonRows.length) return;

    downloadTextFile(
      `bigquery-asset-watchlist-${resultStamp()}.csv`,
      assetComparisonCsv(visibleComparisonRows, assetPriceBasis),
      "text/csv;charset=utf-8",
    );
  };
  const handleExportAllocationDraftCsv = () => {
    if (!modelAllocationRows.length) return;

    downloadTextFile(
      `bigquery-allocation-draft-${resultStamp()}.csv`,
      allocationDraftCsv(modelAllocationRows, allocationMode, allocationCapital, assetPriceBasis, maximumAllocationWeight),
      "text/csv;charset=utf-8",
    );
  };
  const handleExportAllocationRiskCsv = () => {
    if (!activeAllocationRows.length) return;

    downloadTextFile(
      `bigquery-allocation-risk-${resultStamp()}.csv`,
      allocationRiskCsv(allocationRisk, stressShockPercent),
      "text/csv;charset=utf-8",
    );
  };
  const handleExportRebalanceDraftCsv = () => {
    if (!rebalanceRows.length) return;

    downloadTextFile(
      `bigquery-rebalance-draft-${resultStamp()}.csv`,
      rebalanceDraftCsv(rebalanceRows, rebalanceThreshold),
      "text/csv;charset=utf-8",
    );
  };
  const handleExportTradeTicketCsv = () => {
    if (!tradeTickets.length) return;

    downloadTextFile(
      `bigquery-trade-tickets-${resultStamp()}.csv`,
      tradeTicketCsv(tradeTickets, minimumTradeAmount),
      "text/csv;charset=utf-8",
    );
  };
  const handleExportTradeBatchCsv = () => {
    if (!tradeBatches.length) return;

    downloadTextFile(
      `bigquery-trade-batches-${resultStamp()}.csv`,
      tradeBatchCsv(tradeBatches, maximumBatchAmount, maximumTicketsPerBatch),
      "text/csv;charset=utf-8",
    );
  };
  const handleExportExecutionReviewCsv = () => {
    if (!executionReviewItems.length) return;

    downloadTextFile(
      `bigquery-execution-review-${resultStamp()}.csv`,
      executionReviewCsv(executionReviewItems),
      "text/csv;charset=utf-8",
    );
  };
  const handleExportMonitoringRulesCsv = () => {
    if (!monitoringRules.length) return;

    downloadTextFile(
      `bigquery-monitoring-rules-${resultStamp()}.csv`,
      executionReviewCsv(monitoringRules),
      "text/csv;charset=utf-8",
    );
  };
  const handleExportPolicyLimitCsv = () => {
    if (!policyLimitItems.length) return;

    downloadTextFile(
      `bigquery-policy-limits-${resultStamp()}.csv`,
      executionReviewCsv(policyLimitItems),
      "text/csv;charset=utf-8",
    );
  };
  const handleExportCommitteeApprovalCsv = () => {
    if (!committeeApprovalItems.length) return;

    downloadTextFile(
      `bigquery-committee-approval-${resultStamp()}.csv`,
      executionReviewCsv(committeeApprovalItems),
      "text/csv;charset=utf-8",
    );
  };
  const handleExportDecisionAuditCsv = () => {
    if (!decisionAuditRecords.length) return;

    downloadTextFile(
      `bigquery-decision-audit-${resultStamp()}.csv`,
      decisionAuditCsv(decisionAuditRecords),
      "text/csv;charset=utf-8",
    );
  };
  const handleExportExecutionHandoffCsv = () => {
    if (!executionHandoffItems.length) return;

    downloadTextFile(
      `bigquery-execution-handoff-${resultStamp()}.csv`,
      executionHandoffCsv(executionHandoffItems),
      "text/csv;charset=utf-8",
    );
  };
  const handleExportExecutionFillCsv = () => {
    if (!executionFillRows.length) return;

    downloadTextFile(
      `bigquery-execution-fills-${resultStamp()}.csv`,
      executionFillCsv(executionFillRows),
      "text/csv;charset=utf-8",
    );
  };
  const handleExportPostTradeAttributionCsv = () => {
    if (!postTradeAttributionRows.length) return;

    downloadTextFile(
      `bigquery-post-trade-attribution-${resultStamp()}.csv`,
      executionReviewCsv(postTradeAttributionRows),
      "text/csv;charset=utf-8",
    );
  };
  const handleExportPlatformExceptionCsv = () => {
    if (!platformExceptionItems.length) return;

    downloadTextFile(
      `bigquery-platform-exceptions-${resultStamp()}.csv`,
      platformExceptionCsv(platformExceptionItems),
      "text/csv;charset=utf-8",
    );
  };
  const handleExportCioOperatingBriefCsv = () => {
    if (!cioOperatingBriefItems.length) return;

    downloadTextFile(
      `bigquery-cio-operating-brief-${resultStamp()}.csv`,
      executionReviewCsv(cioOperatingBriefItems),
      "text/csv;charset=utf-8",
    );
  };
  const handleExportSlaEscalationCsv = () => {
    if (!slaEscalationItems.length) return;

    downloadTextFile(
      `bigquery-sla-escalation-${resultStamp()}.csv`,
      slaEscalationCsv(slaEscalationItems),
      "text/csv;charset=utf-8",
    );
  };
  const handleExportOperatingKriCsv = () => {
    if (!operatingKriItems.length) return;

    downloadTextFile(
      `bigquery-operating-kri-${resultStamp()}.csv`,
      operatingKriCsv(operatingKriItems),
      "text/csv;charset=utf-8",
    );
  };
  const handleExportDecisionFunnelCsv = () => {
    if (!decisionFunnelStages.length) return;

    downloadTextFile(
      `bigquery-decision-funnel-${resultStamp()}.csv`,
      decisionFunnelCsv(decisionFunnelStages),
      "text/csv;charset=utf-8",
    );
  };
  const handleExportMarketAlertCsv = () => {
    if (!marketAlertEvents.length) return;

    downloadTextFile(
      `bigquery-market-alerts-${resultStamp()}.csv`,
      marketAlertCsv(marketAlertEvents),
      "text/csv;charset=utf-8",
    );
  };
  const buildAssetComparisonMemo = () =>
    assetComparisonMemo(visibleComparisonRows, {
      name: watchlistPresetName.trim() || "未命名 Watchlist",
      symbols: comparisonSymbols,
      priceBasis: assetPriceBasis,
      sortKey: comparisonSortKey,
      signalFilter: comparisonSignalFilter,
      minimumScore: minimumComparisonScore,
      totalRows: comparisonRows.length,
      allocationRows: modelAllocationRows,
      allocationMode,
      allocationCapital,
      maximumAllocationWeight,
      allocationRisk,
      stressShockPercent,
      rebalanceRows,
      rebalanceThreshold,
      tradeTickets,
      minimumTradeAmount,
      tradeBatches,
      maximumBatchAmount,
      maximumTicketsPerBatch,
      executionReviewItems,
      monitoringRules,
      monitoringHorizonDays,
      monitoringDrawdownAlertPercent,
      policyLimitItems,
      policyMaxSingleWeightPercent,
      policyMaxVolatilityPercent,
      policyMaxDrawdownPercent,
      policyMinimumScore,
      committeeDecision,
      committeeApprovalItems,
      decisionAuditRecords,
      executionHandoffItems,
      executionFillRows,
      fillCompletionPercent,
      fillSlippageBps,
      fillCommissionBps,
      postTradeAttributionItems: postTradeAttributionRows,
      postTradeReviewDays,
      postTradeBenchmarkMovePercent,
      platformExceptionItems,
      exceptionDueDays,
      cioOperatingBriefItems,
      slaEscalationItems,
      slaCriticalHours,
      slaReviewHours,
      operatingKriItems,
      decisionFunnelStages,
      marketAlertEvents,
      dataPipelineHealthItems,
      dataPipelineTableSnapshots,
      dataPipelineGeneratedAt: bigQueryDiagnostics?.generatedAt,
      dataContractItems,
      coverageUniverseItems,
      dataRemediationItems,
      dataLineageItems,
      dataProductCatalogItems,
      apiServiceCatalogItems,
      apiContractBlueprintItems,
      platformEntitlementItems,
      clientWorkspaceProvisioningItems,
      usageBillingItems,
      dataLicenseComplianceItems,
      securityAuditItems,
      incidentCommandItems,
      productReleaseGateItems,
      customerSuccessHealthItems,
      revenueForecastItems,
    });
  const handleExportAssetComparisonMemo = () => {
    if (!visibleComparisonRows.length) return;

    downloadTextFile(
      `bigquery-watchlist-memo-${resultStamp()}.md`,
      buildAssetComparisonMemo(),
      "text/markdown;charset=utf-8",
    );
  };
  const handleCopyAssetComparisonMemo = async () => {
    if (!visibleComparisonRows.length || typeof navigator === "undefined" || !navigator.clipboard) return;

    try {
      await navigator.clipboard.writeText(buildAssetComparisonMemo());
      setWatchlistMemoCopyStatus("copied");
      window.setTimeout(() => setWatchlistMemoCopyStatus("idle"), 1800);
    } catch (err: unknown) {
      setComparisonError(err instanceof Error ? err.message : String(err));
    }
  };
  const handleSaveWatchlistPreset = () => {
    const cleanName = watchlistPresetName.trim() || "未命名 Watchlist";
    const now = new Date().toISOString();
    const preset: SavedWatchlistPreset = {
      id: selectedWatchlistPresetId || `watchlist-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name: cleanName,
      symbols: comparisonSymbols,
      priceBasis: assetPriceBasis,
      sortKey: comparisonSortKey,
      signalFilter: comparisonSignalFilter,
      minimumScore: minimumComparisonScore,
      updatedAt: now,
    };

    setSavedWatchlistPresets((currentPresets) => {
      const nextPresets = [preset, ...currentPresets.filter((item) => item.id !== preset.id)].slice(0, 12);
      writeWatchlistPresetsToStorage(nextPresets);
      return nextPresets;
    });
    setSelectedWatchlistPresetId(preset.id);
  };
  const handleLoadWatchlistPreset = () => {
    const preset = savedWatchlistPresets.find((item) => item.id === selectedWatchlistPresetId);
    if (!preset) return;

    setWatchlistPresetName(preset.name);
    setComparisonSymbols(preset.symbols);
    setAssetPriceBasis(preset.priceBasis === "raw" ? "raw" : "adjusted");
    setComparisonSortKey(preset.sortKey ?? "score");
    setComparisonSignalFilter(preset.signalFilter ?? "all");
    setMinimumComparisonScore(Number.isFinite(preset.minimumScore) ? preset.minimumScore : 0);
    setComparisonRows([]);
    setComparisonError(null);
  };
  const handleDeleteWatchlistPreset = () => {
    if (!selectedWatchlistPresetId) return;

    setSavedWatchlistPresets((currentPresets) => {
      const nextPresets = currentPresets.filter((preset) => preset.id !== selectedWatchlistPresetId);
      writeWatchlistPresetsToStorage(nextPresets);
      setSelectedWatchlistPresetId(nextPresets[0]?.id || "");
      setWatchlistPresetName(nextPresets[0]?.name || "核心 ETF");
      return nextPresets;
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <section className="bg-slate-900 border border-slate-800 p-4 md:p-6 rounded-xl shadow-2xl space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-base font-semibold text-cyan-300 flex items-center gap-2">
              ▍ 市場資料平台中控台
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              MoneyDJ、鉅亨、Yahoo、FRED、BigQuery 資料管線盤點
            </p>
          </div>
          <button
            onClick={reload}
            className="self-start md:self-auto px-3 py-2 text-xs font-bold rounded-md bg-cyan-600 hover:bg-cyan-500 text-white transition-colors"
          >
            ⟳ 重新整理
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-4">
            <p className="text-slate-500 mb-1">資料源</p>
            <p className="text-2xl font-bold text-white font-mono">{sources.length}</p>
          </div>
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-4">
            <p className="text-slate-500 mb-1">可安全接入</p>
            <p className="text-2xl font-bold text-emerald-300 font-mono">{securedCount}</p>
          </div>
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-4">
            <p className="text-slate-500 mb-1">最後檢查</p>
            <p className="text-sm font-semibold text-slate-200 font-mono">
              {data?.generatedAt ? new Date(data.generatedAt).toLocaleString("zh-TW") : "--"}
            </p>
          </div>
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-4">
            <p className="text-slate-500 mb-1">BigQuery API</p>
            <p className={`text-sm font-bold ${hasBigQueryCredentials ? "text-emerald-300" : "text-amber-300"}`}>
              {bigQueryStatus ? bigQueryBadge : "--"}
            </p>
          </div>
        </div>

        <section className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-100">BigQuery 連線狀態</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                投組分析 API 會從這裡讀取 daily_prices / daily_fx
              </p>
            </div>
            <span
              className={`self-start text-[10px] px-2 py-1 rounded border font-bold ${
                hasBigQueryCredentials
                  ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/40"
                  : "bg-amber-500/10 text-amber-300 border-amber-500/40"
              }`}
            >
              {bigQueryStatus ? bigQueryBadge : "讀取中"}
            </span>
          </div>

          {bigQueryError ? (
            <div className="border border-red-900/60 bg-red-950/30 rounded-lg p-3 text-xs text-red-300 whitespace-pre-wrap">
              {bigQueryError}
            </div>
          ) : (
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div>
                <dt className="text-slate-500">Project / Dataset</dt>
                <dd className="text-slate-200 mt-0.5 font-mono">
                  {bigQueryStatus ? `${bigQueryStatus.projectId}.${bigQueryStatus.dataset}` : "--"}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">憑證來源</dt>
                <dd className="text-slate-200 mt-0.5 font-mono">
                  {bigQueryStatus?.credentialSource ?? "--"}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">價格表</dt>
                <dd className="text-cyan-200 mt-0.5 font-mono break-all">
                  {bigQueryStatus?.priceTable ?? "--"}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">匯率表</dt>
                <dd className="text-cyan-200 mt-0.5 font-mono break-all">
                  {bigQueryStatus?.fxTable ?? "--"}
                </dd>
              </div>
            </dl>
          )}
        </section>

        {!hasBigQueryCredentials && (
          <section className="bg-amber-950/20 border border-amber-900/60 rounded-lg p-4 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-amber-200">BigQuery 上線接線板</h3>
                <p className="text-[11px] text-amber-100/70 mt-0.5">
                  Vercel 設定完成並重新部署後，市場資料 API 會切換為可讀取狀態
                </p>
              </div>
              <a
                href="https://vercel.com/frank-workspace/wealth-dashboard-web/settings/environment-variables"
                target="_blank"
                rel="noreferrer"
                className="self-start md:self-auto px-3 py-2 text-xs font-bold rounded-md bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors"
              >
                開啟 Vercel
              </a>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-2 text-xs">
              {bigQueryEnvironmentVars.map((envVar) => (
                <div key={envVar.key} className="bg-slate-950/80 border border-amber-900/40 rounded-md p-3 min-w-0">
                  <p className="text-[10px] text-amber-100/60 mb-1">{envVar.kind === "secret" ? "Secret" : "Value"}</p>
                  <p className="font-mono text-amber-100 truncate">{envVar.key}</p>
                  <p className="font-mono text-slate-400 truncate mt-1">{envVar.value}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[11px] text-amber-100/80">
              <div className="bg-slate-950/60 border border-amber-900/30 rounded-md p-3">
                <span className="font-mono text-amber-200">1</span> 建立 BigQuery service account
              </div>
              <div className="bg-slate-950/60 border border-amber-900/30 rounded-md p-3">
                <span className="font-mono text-amber-200">2</span> 貼到 Vercel Production / Preview / Development
              </div>
              <div className="bg-slate-950/60 border border-amber-900/30 rounded-md p-3">
                <span className="font-mono text-amber-200">3</span> 重新部署 main 後按重新整理
              </div>
            </div>
          </section>
        )}

        <section className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-100">BigQuery 資料倉儲診斷</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                價格表與匯率表的覆蓋率、最近更新日與資料筆數
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleExportDataPipelineCsv}
                className="px-3 py-2 text-xs font-bold rounded-md bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-100"
              >
                管線 CSV
              </button>
              {bigQueryDiagnostics ? (
                <button
                  onClick={handleExportDiagnosticsCsv}
                  className="px-3 py-2 text-xs font-bold rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100"
                >
                  品質 CSV
                </button>
              ) : null}
              <span className="self-start text-[10px] px-2 py-1 rounded border font-bold bg-slate-800 text-slate-300 border-slate-700">
                {bigQueryDiagnostics ? "已讀取" : "待憑證"}
              </span>
            </div>
          </div>

          {bigQueryDiagnosticsError ? (
            <div className="border border-red-900/60 bg-red-950/30 rounded-lg p-3 text-xs text-red-300 whitespace-pre-wrap">
              {bigQueryDiagnosticsError}
            </div>
          ) : bigQueryDiagnostics ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-2 text-xs">
                {qualityCards.map((card) => (
                  <div key={card.label} className={`rounded-lg border p-3 min-w-0 ${qualityClass(card.status)}`}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] text-slate-500 truncate">{card.label}</p>
                      <span className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-bold ${qualityBadgeClass(card.status)}`}>
                        {qualityLabel(card.status)}
                      </span>
                    </div>
                    <p className="mt-2 font-mono text-sm font-bold text-slate-100 truncate" title={card.value}>
                      {card.value}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">{card.note}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                {issueCards.map((card) => (
                  <div key={card.label} className={`rounded-lg border p-3 min-w-0 ${qualityClass(card.status)}`}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] text-slate-500 truncate">{card.label}</p>
                      <span className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-bold ${qualityBadgeClass(card.status)}`}>
                        {qualityLabel(card.status)}
                      </span>
                    </div>
                    <p className="mt-2 font-mono text-sm font-bold text-slate-100 truncate" title={card.value}>
                      {card.value}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">{card.note}</p>
                  </div>
                ))}
              </div>

              <div className="border-t border-slate-800 pt-3 space-y-3">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-xs font-bold text-slate-100">資料管線監控台</h4>
                      <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${executionReviewBadgeClass(dataPipelineDecision)}`}>
                        {executionReviewLabel(dataPipelineDecision)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      追蹤 BigQuery 憑證、schema、最新日期、row count、覆蓋率、落後商品與匯率幣別
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    {[
                      ["暫停", `${dataPipelineBlockCount}`],
                      ["觀察", `${dataPipelineWatchCount}`],
                      ["診斷", bigQueryDiagnostics?.generatedAt ? "已更新" : "待讀取"],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-md border border-slate-800 bg-slate-900/70 px-3 py-2 text-right">
                        <p className="text-[10px] text-slate-600">{label}</p>
                        <p className="mt-0.5 font-mono font-bold text-slate-100">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                  <div className="overflow-x-auto rounded-lg border border-slate-800">
                    <table className="w-full min-w-[760px] text-xs">
                      <thead className="bg-slate-900/80">
                        <tr className="text-left text-[11px] text-slate-600">
                          <th className="py-2 px-3 font-medium">檢查項</th>
                          <th className="py-2 px-3 font-medium text-right">狀態</th>
                          <th className="py-2 px-3 font-medium text-right">目前值</th>
                          <th className="py-2 px-3 font-medium">目標</th>
                          <th className="py-2 px-3 font-medium">動作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dataPipelineHealthItems.map((item) => (
                          <tr key={item.label} className={`border-t ${executionReviewRowClass(item.status)}`}>
                            <td className="py-2 px-3 font-bold text-slate-100">{item.label}</td>
                            <td className="py-2 px-3 text-right">
                              <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${executionReviewBadgeClass(item.status)}`}>
                                {executionReviewLabel(item.status)}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-slate-200">{item.value}</td>
                            <td className="py-2 px-3 text-slate-400">{item.target}</td>
                            <td className="py-2 px-3 text-slate-500">{item.action}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="space-y-2">
                    {dataPipelineTableSnapshots.map((item) => (
                      <div key={item.table} className={`rounded-lg border p-3 text-xs ${executionReviewRowClass(item.status)}`}>
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-bold text-slate-100">{item.table}</p>
                            <p className="mt-0.5 text-[11px] text-slate-500">{item.action}</p>
                          </div>
                          <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${executionReviewBadgeClass(item.status)}`}>
                            {executionReviewLabel(item.status)}
                          </span>
                        </div>
                        <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2">
                          {[
                            ["最新日", item.latestDate],
                            ["筆數", item.rowCount],
                            ["覆蓋", item.coverage],
                            ["新鮮度", item.freshness],
                          ].map(([label, value]) => (
                            <div key={label} className="rounded-md border border-slate-800 bg-slate-950/60 p-2 min-w-0">
                              <p className="text-[10px] text-slate-600 truncate">{label}</p>
                              <p className="mt-0.5 font-mono text-slate-100 truncate" title={value}>{value}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-800 pt-3 space-y-3">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-xs font-bold text-slate-100">資料合約中心</h4>
                      <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${executionReviewBadgeClass(dataContractDecision)}`}>
                        {executionReviewLabel(dataContractDecision)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      管理資料表必要欄位、缺欄位、資料量、新鮮度與修復動作
                    </p>
                  </div>
                  <div className="flex flex-wrap items-end gap-2 text-xs">
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        ["暫停", `${dataContractBlockCount}`],
                        ["觀察", `${dataContractWatchCount}`],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-md border border-slate-800 bg-slate-900/70 px-3 py-2 text-right">
                          <p className="text-[10px] text-slate-600">{label}</p>
                          <p className="mt-0.5 font-mono font-bold text-slate-100">{value}</p>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={handleExportDataContractCsv}
                      disabled={!dataContractItems.length}
                      className="px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold disabled:cursor-not-allowed disabled:bg-slate-950 disabled:text-slate-600"
                    >
                      合約 CSV
                    </button>
                  </div>
                </div>

                {dataContractItems.length ? (
                  <div className="overflow-x-auto rounded-lg border border-slate-800">
                    <table className="w-full min-w-[1120px] text-xs">
                      <thead className="bg-slate-900/80">
                        <tr className="text-left text-[11px] text-slate-600">
                          <th className="py-2 px-3 font-medium">資料表</th>
                          <th className="py-2 px-3 font-medium">層級</th>
                          <th className="py-2 px-3 font-medium text-right">狀態</th>
                          <th className="py-2 px-3 font-medium text-right">欄位覆蓋</th>
                          <th className="py-2 px-3 font-medium">缺欄位</th>
                          <th className="py-2 px-3 font-medium text-right">新鮮度</th>
                          <th className="py-2 px-3 font-medium">資料量</th>
                          <th className="py-2 px-3 font-medium">動作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dataContractItems.map((item) => (
                          <tr key={item.table} className={`border-t ${executionReviewRowClass(item.status)}`}>
                            <td className="py-2 px-3 font-mono text-slate-100">{item.table}</td>
                            <td className="py-2 px-3 text-slate-300">{item.layer}</td>
                            <td className="py-2 px-3 text-right">
                              <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${executionReviewBadgeClass(item.status)}`}>
                                {executionReviewLabel(item.status)}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-slate-200">
                              {item.presentColumns.length}/{item.requiredColumns.length}
                            </td>
                            <td className="py-2 px-3 text-slate-400">
                              {item.missingColumns.length ? item.missingColumns.join(", ") : "--"}
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-slate-300">{item.freshness}</td>
                            <td className="py-2 px-3 font-mono text-slate-400">{item.volume}</td>
                            <td className="py-2 px-3 text-slate-500">{item.action}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="rounded-md border border-dashed border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-500">
                    讀取 BigQuery 診斷後，這裡會顯示資料表欄位合約。
                  </div>
                )}
              </div>

              <div className="border-t border-slate-800 pt-3 space-y-3">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-xs font-bold text-slate-100">可投資宇宙覆蓋</h4>
                      <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${executionReviewBadgeClass(coverageUniverseDecision)}`}>
                        {executionReviewLabel(coverageUniverseDecision)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      把商品數、歷史價格深度、落後商品與匯率幣別整理成研究宇宙上線條件
                    </p>
                  </div>
                  <div className="flex flex-wrap items-end gap-2 text-xs">
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        ["暫停", `${coverageUniverseBlockCount}`],
                        ["觀察", `${coverageUniverseWatchCount}`],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-md border border-slate-800 bg-slate-900/70 px-3 py-2 text-right">
                          <p className="text-[10px] text-slate-600">{label}</p>
                          <p className="mt-0.5 font-mono font-bold text-slate-100">{value}</p>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={handleExportCoverageUniverseCsv}
                      disabled={!coverageUniverseItems.length}
                      className="px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold disabled:cursor-not-allowed disabled:bg-slate-950 disabled:text-slate-600"
                    >
                      宇宙 CSV
                    </button>
                  </div>
                </div>

                {coverageUniverseItems.length ? (
                  <div className="overflow-x-auto rounded-lg border border-slate-800">
                    <table className="w-full min-w-[1040px] text-xs">
                      <thead className="bg-slate-900/80">
                        <tr className="text-left text-[11px] text-slate-600">
                          <th className="py-2 px-3 font-medium">項目</th>
                          <th className="py-2 px-3 font-medium text-right">狀態</th>
                          <th className="py-2 px-3 font-medium text-right">數量</th>
                          <th className="py-2 px-3 font-medium">目標</th>
                          <th className="py-2 px-3 font-medium">覆蓋</th>
                          <th className="py-2 px-3 font-medium">動作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {coverageUniverseItems.map((item) => (
                          <tr key={item.label} className={`border-t ${executionReviewRowClass(item.status)}`}>
                            <td className="py-2 px-3 font-bold text-slate-100">{item.label}</td>
                            <td className="py-2 px-3 text-right">
                              <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${executionReviewBadgeClass(item.status)}`}>
                                {executionReviewLabel(item.status)}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-slate-200">{item.count}</td>
                            <td className="py-2 px-3 text-slate-400">{item.target}</td>
                            <td className="py-2 px-3 text-slate-400">{item.coverage}</td>
                            <td className="py-2 px-3 text-slate-500">{item.action}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="rounded-md border border-dashed border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-500">
                    讀取 BigQuery 診斷後，這裡會顯示可投資宇宙覆蓋狀態。
                  </div>
                )}
              </div>

              <div className="border-t border-slate-800 pt-3 space-y-3">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-xs font-bold text-slate-100">資料缺口修復佇列</h4>
                      <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${executionReviewBadgeClass(dataRemediationDecision)}`}>
                        {executionReviewLabel(dataRemediationDecision)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      將資料源接線、管線、合約與研究宇宙問題合併成可分派的修復清單
                    </p>
                  </div>
                  <div className="flex flex-wrap items-end gap-2 text-xs">
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        ["高優先", `${dataRemediationHighCount}`],
                        ["中優先", `${dataRemediationMediumCount}`],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-md border border-slate-800 bg-slate-900/70 px-3 py-2 text-right">
                          <p className="text-[10px] text-slate-600">{label}</p>
                          <p className="mt-0.5 font-mono font-bold text-slate-100">{value}</p>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={handleExportDataRemediationCsv}
                      disabled={!dataRemediationItems.length}
                      className="px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold disabled:cursor-not-allowed disabled:bg-slate-950 disabled:text-slate-600"
                    >
                      修復 CSV
                    </button>
                  </div>
                </div>

                {dataRemediationItems.length ? (
                  <div className="overflow-x-auto rounded-lg border border-slate-800">
                    <table className="w-full min-w-[1180px] text-xs">
                      <thead className="bg-slate-900/80">
                        <tr className="text-left text-[11px] text-slate-600">
                          <th className="py-2 px-3 font-medium">來源</th>
                          <th className="py-2 px-3 font-medium">項目</th>
                          <th className="py-2 px-3 font-medium text-right">優先級</th>
                          <th className="py-2 px-3 font-medium text-right">狀態</th>
                          <th className="py-2 px-3 font-medium">依據</th>
                          <th className="py-2 px-3 font-medium">影響</th>
                          <th className="py-2 px-3 font-medium">動作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dataRemediationItems.map((item) => (
                          <tr key={`${item.source}-${item.item}`} className={`border-t ${executionReviewRowClass(item.status)}`}>
                            <td className="py-2 px-3 text-slate-400">{item.source}</td>
                            <td className="py-2 px-3 font-bold text-slate-100">{item.item}</td>
                            <td className="py-2 px-3 text-right">
                              <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${executionHandoffPriorityClass(item.priority)}`}>
                                {executionHandoffPriorityLabel(item.priority)}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-right">
                              <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${executionReviewBadgeClass(item.status)}`}>
                                {executionReviewLabel(item.status)}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-slate-400">{item.evidence}</td>
                            <td className="py-2 px-3 text-slate-400">{item.impact}</td>
                            <td className="py-2 px-3 text-slate-500">{item.action}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="rounded-md border border-dashed border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-500">
                    目前沒有待處理資料缺口。
                  </div>
                )}
              </div>

              <div className="border-t border-slate-800 pt-3 space-y-3">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-xs font-bold text-slate-100">資料血緣地圖</h4>
                      <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${executionReviewBadgeClass(dataLineageDecision)}`}>
                        {executionReviewLabel(dataLineageDecision)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      從外部資料源、BigQuery 倉儲、合約、研究宇宙一路追到前端分析產品
                    </p>
                  </div>
                  <div className="flex flex-wrap items-end gap-2 text-xs">
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        ["阻斷", `${dataLineageBlockCount}`],
                        ["觀察", `${dataLineageWatchCount}`],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-md border border-slate-800 bg-slate-900/70 px-3 py-2 text-right">
                          <p className="text-[10px] text-slate-600">{label}</p>
                          <p className="mt-0.5 font-mono font-bold text-slate-100">{value}</p>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={handleExportDataLineageCsv}
                      disabled={!dataLineageItems.length}
                      className="px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold disabled:cursor-not-allowed disabled:bg-slate-950 disabled:text-slate-600"
                    >
                      血緣 CSV
                    </button>
                  </div>
                </div>

                {dataLineageItems.length ? (
                  <div className="overflow-x-auto rounded-lg border border-slate-800">
                    <table className="w-full min-w-[1180px] text-xs">
                      <thead className="bg-slate-900/80">
                        <tr className="text-left text-[11px] text-slate-600">
                          <th className="py-2 px-3 font-medium">階段</th>
                          <th className="py-2 px-3 font-medium">節點</th>
                          <th className="py-2 px-3 font-medium text-right">狀態</th>
                          <th className="py-2 px-3 font-medium">輸入</th>
                          <th className="py-2 px-3 font-medium">輸出</th>
                          <th className="py-2 px-3 font-medium">依據</th>
                          <th className="py-2 px-3 font-medium">動作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dataLineageItems.map((item) => (
                          <tr key={`${item.stage}-${item.node}`} className={`border-t ${executionReviewRowClass(item.status)}`}>
                            <td className="py-2 px-3 text-slate-400">{item.stage}</td>
                            <td className="py-2 px-3 font-bold text-slate-100">{item.node}</td>
                            <td className="py-2 px-3 text-right">
                              <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${executionReviewBadgeClass(item.status)}`}>
                                {executionReviewLabel(item.status)}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-slate-400">{item.input}</td>
                            <td className="py-2 px-3 text-slate-400">{item.output}</td>
                            <td className="py-2 px-3 text-slate-500">{item.evidence}</td>
                            <td className="py-2 px-3 text-slate-500">{item.action}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="rounded-md border border-dashed border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-500">
                    讀取資料診斷後，這裡會顯示資料血緣。
                  </div>
                )}
              </div>

              <div className="border-t border-slate-800 pt-3 space-y-3">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-xs font-bold text-slate-100">資料產品目錄</h4>
                      <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${executionReviewBadgeClass(dataProductCatalogDecision)}`}>
                        {executionReviewLabel(dataProductCatalogDecision)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      定義每個資料產品的使用者、輸入、輸出、服務等級與下一步
                    </p>
                  </div>
                  <div className="flex flex-wrap items-end gap-2 text-xs">
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        ["可用", `${dataProductReadyCount}`],
                        ["觀察", `${dataProductWatchCount}`],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-md border border-slate-800 bg-slate-900/70 px-3 py-2 text-right">
                          <p className="text-[10px] text-slate-600">{label}</p>
                          <p className="mt-0.5 font-mono font-bold text-slate-100">{value}</p>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={handleExportDataProductCatalogCsv}
                      disabled={!dataProductCatalogItems.length}
                      className="px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold disabled:cursor-not-allowed disabled:bg-slate-950 disabled:text-slate-600"
                    >
                      產品 CSV
                    </button>
                  </div>
                </div>

                {dataProductCatalogItems.length ? (
                  <div className="overflow-x-auto rounded-lg border border-slate-800">
                    <table className="w-full min-w-[1280px] text-xs">
                      <thead className="bg-slate-900/80">
                        <tr className="text-left text-[11px] text-slate-600">
                          <th className="py-2 px-3 font-medium">產品</th>
                          <th className="py-2 px-3 font-medium">類別</th>
                          <th className="py-2 px-3 font-medium text-right">狀態</th>
                          <th className="py-2 px-3 font-medium">使用者</th>
                          <th className="py-2 px-3 font-medium">輸入</th>
                          <th className="py-2 px-3 font-medium">輸出</th>
                          <th className="py-2 px-3 font-medium">服務等級</th>
                          <th className="py-2 px-3 font-medium">動作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dataProductCatalogItems.map((item) => (
                          <tr key={item.product} className={`border-t ${executionReviewRowClass(item.status)}`}>
                            <td className="py-2 px-3 font-bold text-slate-100">{item.product}</td>
                            <td className="py-2 px-3 text-slate-400">{item.category}</td>
                            <td className="py-2 px-3 text-right">
                              <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${executionReviewBadgeClass(item.status)}`}>
                                {executionReviewLabel(item.status)}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-slate-400">{item.consumer}</td>
                            <td className="py-2 px-3 text-slate-400">{item.input}</td>
                            <td className="py-2 px-3 text-slate-400">{item.output}</td>
                            <td className="py-2 px-3 text-slate-500">{item.serviceLevel}</td>
                            <td className="py-2 px-3 text-slate-500">{item.action}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="rounded-md border border-dashed border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-500">
                    讀取資料診斷後，這裡會顯示資料產品目錄。
                  </div>
                )}
              </div>

              <div className="border-t border-slate-800 pt-3 space-y-3">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-xs font-bold text-slate-100">API 服務目錄</h4>
                      <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${executionReviewBadgeClass(apiServiceCatalogDecision)}`}>
                        {executionReviewLabel(apiServiceCatalogDecision)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      盤點資料服務與分析服務的 endpoint、使用者、輸入輸出、服務等級與動作
                    </p>
                  </div>
                  <div className="flex flex-wrap items-end gap-2 text-xs">
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        ["可用", `${apiServiceReadyCount}`],
                        ["觀察", `${apiServiceWatchCount}`],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-md border border-slate-800 bg-slate-900/70 px-3 py-2 text-right">
                          <p className="text-[10px] text-slate-600">{label}</p>
                          <p className="mt-0.5 font-mono font-bold text-slate-100">{value}</p>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={handleExportApiServiceCatalogCsv}
                      disabled={!apiServiceCatalogItems.length}
                      className="px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold disabled:cursor-not-allowed disabled:bg-slate-950 disabled:text-slate-600"
                    >
                      API CSV
                    </button>
                  </div>
                </div>

                {apiServiceCatalogItems.length ? (
                  <div className="overflow-x-auto rounded-lg border border-slate-800">
                    <table className="w-full min-w-[1360px] text-xs">
                      <thead className="bg-slate-900/80">
                        <tr className="text-left text-[11px] text-slate-600">
                          <th className="py-2 px-3 font-medium">Method</th>
                          <th className="py-2 px-3 font-medium">Endpoint</th>
                          <th className="py-2 px-3 font-medium">產品</th>
                          <th className="py-2 px-3 font-medium text-right">狀態</th>
                          <th className="py-2 px-3 font-medium">使用者</th>
                          <th className="py-2 px-3 font-medium">輸入</th>
                          <th className="py-2 px-3 font-medium">輸出</th>
                          <th className="py-2 px-3 font-medium">服務等級</th>
                          <th className="py-2 px-3 font-medium">動作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {apiServiceCatalogItems.map((item) => (
                          <tr key={item.endpoint} className={`border-t ${executionReviewRowClass(item.status)}`}>
                            <td className="py-2 px-3">
                              <span
                                className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                                  item.method === "GET"
                                    ? "border border-sky-500/40 bg-sky-500/10 text-sky-300"
                                    : "border border-violet-500/40 bg-violet-500/10 text-violet-300"
                                }`}
                              >
                                {item.method}
                              </span>
                            </td>
                            <td className="py-2 px-3 font-mono text-[11px] text-slate-300">{item.endpoint}</td>
                            <td className="py-2 px-3 font-bold text-slate-100">{item.product}</td>
                            <td className="py-2 px-3 text-right">
                              <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${executionReviewBadgeClass(item.status)}`}>
                                {executionReviewLabel(item.status)}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-slate-400">{item.consumer}</td>
                            <td className="py-2 px-3 text-slate-400">{item.input}</td>
                            <td className="py-2 px-3 text-slate-400">{item.output}</td>
                            <td className="py-2 px-3 text-slate-500">{item.serviceLevel}</td>
                            <td className="py-2 px-3 text-slate-500">{item.action}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="rounded-md border border-dashed border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-500">
                    讀取資料診斷後，這裡會顯示 API 服務目錄。
                  </div>
                )}
              </div>

              <div className="border-t border-slate-800 pt-3 space-y-3">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-xs font-bold text-slate-100">API 合約 / OpenAPI 藍圖</h4>
                      <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${executionReviewBadgeClass(apiContractBlueprintDecision)}`}>
                        {executionReviewLabel(apiContractBlueprintDecision)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      管理每個 API 的版本、認證、request、response、穩定度與破壞性變更風險
                    </p>
                  </div>
                  <div className="flex flex-wrap items-end gap-2 text-xs">
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        ["Stable", `${apiContractStableCount}`],
                        ["Draft", `${apiContractDraftCount}`],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-md border border-slate-800 bg-slate-900/70 px-3 py-2 text-right">
                          <p className="text-[10px] text-slate-600">{label}</p>
                          <p className="mt-0.5 font-mono font-bold text-slate-100">{value}</p>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={handleExportApiContractBlueprintJson}
                      disabled={!apiContractBlueprintItems.length}
                      className="px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold disabled:cursor-not-allowed disabled:bg-slate-950 disabled:text-slate-600"
                    >
                      OpenAPI JSON
                    </button>
                  </div>
                </div>

                {apiContractBlueprintItems.length ? (
                  <div className="overflow-x-auto rounded-lg border border-slate-800">
                    <table className="w-full min-w-[1480px] text-xs">
                      <thead className="bg-slate-900/80">
                        <tr className="text-left text-[11px] text-slate-600">
                          <th className="py-2 px-3 font-medium">Method</th>
                          <th className="py-2 px-3 font-medium">Endpoint</th>
                          <th className="py-2 px-3 font-medium">Version</th>
                          <th className="py-2 px-3 font-medium">Auth</th>
                          <th className="py-2 px-3 font-medium">Request</th>
                          <th className="py-2 px-3 font-medium">Response</th>
                          <th className="py-2 px-3 font-medium">Stability</th>
                          <th className="py-2 px-3 font-medium text-right">狀態</th>
                          <th className="py-2 px-3 font-medium">破壞風險</th>
                          <th className="py-2 px-3 font-medium">動作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {apiContractBlueprintItems.map((item) => (
                          <tr key={`${item.method}-${item.endpoint}`} className={`border-t ${executionReviewRowClass(item.status)}`}>
                            <td className="py-2 px-3">
                              <span
                                className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                                  item.method === "GET"
                                    ? "border border-sky-500/40 bg-sky-500/10 text-sky-300"
                                    : "border border-violet-500/40 bg-violet-500/10 text-violet-300"
                                }`}
                              >
                                {item.method}
                              </span>
                            </td>
                            <td className="py-2 px-3 font-mono text-[11px] text-slate-300">{item.endpoint}</td>
                            <td className="py-2 px-3 text-slate-400">{item.version}</td>
                            <td className="py-2 px-3 text-slate-400">{item.auth}</td>
                            <td className="py-2 px-3 font-mono text-[11px] text-slate-400">{item.requestSchema}</td>
                            <td className="py-2 px-3 font-mono text-[11px] text-slate-400">{item.responseSchema}</td>
                            <td className="py-2 px-3">
                              <span className={`rounded border px-2 py-0.5 text-[10px] font-bold ${apiContractStabilityClass(item.stability)}`}>
                                {apiContractStabilityLabel(item.stability)}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-right">
                              <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${executionReviewBadgeClass(item.status)}`}>
                                {executionReviewLabel(item.status)}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-slate-500">{item.breakingRisk}</td>
                            <td className="py-2 px-3 text-slate-500">{item.action}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="rounded-md border border-dashed border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-500">
                    建立 API 服務目錄後，這裡會顯示 OpenAPI 藍圖。
                  </div>
                )}
              </div>

              <div className="border-t border-slate-800 pt-3 space-y-3">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-xs font-bold text-slate-100">權限與方案控管</h4>
                      <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${executionReviewBadgeClass(platformEntitlementDecision)}`}>
                        {executionReviewLabel(platformEntitlementDecision)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      定義角色、方案、資料範圍、API 權限、匯出權限與簽核限制
                    </p>
                  </div>
                  <div className="flex flex-wrap items-end gap-2 text-xs">
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        ["可啟用", `${entitlementReadyCount}`],
                        ["受限", `${entitlementRestrictedCount}`],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-md border border-slate-800 bg-slate-900/70 px-3 py-2 text-right">
                          <p className="text-[10px] text-slate-600">{label}</p>
                          <p className="mt-0.5 font-mono font-bold text-slate-100">{value}</p>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={handleExportPlatformEntitlementCsv}
                      disabled={!platformEntitlementItems.length}
                      className="px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold disabled:cursor-not-allowed disabled:bg-slate-950 disabled:text-slate-600"
                    >
                      權限 CSV
                    </button>
                  </div>
                </div>

                {platformEntitlementItems.length ? (
                  <div className="overflow-x-auto rounded-lg border border-slate-800">
                    <table className="w-full min-w-[1500px] text-xs">
                      <thead className="bg-slate-900/80">
                        <tr className="text-left text-[11px] text-slate-600">
                          <th className="py-2 px-3 font-medium">角色</th>
                          <th className="py-2 px-3 font-medium">方案</th>
                          <th className="py-2 px-3 font-medium">資料範圍</th>
                          <th className="py-2 px-3 font-medium">API 權限</th>
                          <th className="py-2 px-3 font-medium">工具</th>
                          <th className="py-2 px-3 font-medium">匯出權限</th>
                          <th className="py-2 px-3 font-medium">簽核限制</th>
                          <th className="py-2 px-3 font-medium text-right">狀態</th>
                          <th className="py-2 px-3 font-medium">依據</th>
                          <th className="py-2 px-3 font-medium">動作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {platformEntitlementItems.map((item) => (
                          <tr key={`${item.plan}-${item.role}`} className={`border-t ${executionReviewRowClass(item.status)}`}>
                            <td className="py-2 px-3 font-bold text-slate-100">{item.role}</td>
                            <td className="py-2 px-3">
                              <span className="rounded border border-slate-700 bg-slate-950 px-2 py-0.5 text-[10px] font-bold text-slate-300">
                                {item.plan}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-slate-400">{item.dataScope}</td>
                            <td className="py-2 px-3 font-mono text-[11px] text-slate-400">{item.apiAccess}</td>
                            <td className="py-2 px-3 text-slate-400">{item.tools}</td>
                            <td className="py-2 px-3 text-slate-400">{item.exportRights}</td>
                            <td className="py-2 px-3 text-slate-500">{item.approvalLimit}</td>
                            <td className="py-2 px-3 text-right">
                              <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${executionReviewBadgeClass(item.status)}`}>
                                {executionReviewLabel(item.status)}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-slate-500">{item.evidence}</td>
                            <td className="py-2 px-3 text-slate-500">{item.action}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="rounded-md border border-dashed border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-500">
                    建立 API 合約後，這裡會顯示角色與方案權限矩陣。
                  </div>
                )}
              </div>

              <div className="border-t border-slate-800 pt-3 space-y-3">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-xs font-bold text-slate-100">客戶工作區開通中心</h4>
                      <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${executionReviewBadgeClass(clientWorkspaceProvisioningDecision)}`}>
                        {executionReviewLabel(clientWorkspaceProvisioningDecision)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      將方案與權限落到可開通的工作區、席位、資料包、API key、SSO 與帳務狀態
                    </p>
                  </div>
                  <div className="flex flex-wrap items-end gap-2 text-xs">
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        ["可開通", `${workspaceReadyCount}`],
                        ["阻擋", `${workspaceBlockedCount}`],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-md border border-slate-800 bg-slate-900/70 px-3 py-2 text-right">
                          <p className="text-[10px] text-slate-600">{label}</p>
                          <p className="mt-0.5 font-mono font-bold text-slate-100">{value}</p>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={handleExportClientWorkspaceCsv}
                      disabled={!clientWorkspaceProvisioningItems.length}
                      className="px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold disabled:cursor-not-allowed disabled:bg-slate-950 disabled:text-slate-600"
                    >
                      工作區 CSV
                    </button>
                  </div>
                </div>

                {clientWorkspaceProvisioningItems.length ? (
                  <div className="overflow-x-auto rounded-lg border border-slate-800">
                    <table className="w-full min-w-[1500px] text-xs">
                      <thead className="bg-slate-900/80">
                        <tr className="text-left text-[11px] text-slate-600">
                          <th className="py-2 px-3 font-medium">工作區</th>
                          <th className="py-2 px-3 font-medium">客群</th>
                          <th className="py-2 px-3 font-medium">方案</th>
                          <th className="py-2 px-3 font-medium">席位</th>
                          <th className="py-2 px-3 font-medium">資料包</th>
                          <th className="py-2 px-3 font-medium">API Key</th>
                          <th className="py-2 px-3 font-medium">SSO</th>
                          <th className="py-2 px-3 font-medium">帳務</th>
                          <th className="py-2 px-3 font-medium text-right">狀態</th>
                          <th className="py-2 px-3 font-medium">依據</th>
                          <th className="py-2 px-3 font-medium">動作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {clientWorkspaceProvisioningItems.map((item) => (
                          <tr key={`${item.plan}-${item.workspace}`} className={`border-t ${executionReviewRowClass(item.status)}`}>
                            <td className="py-2 px-3 font-bold text-slate-100">{item.workspace}</td>
                            <td className="py-2 px-3 text-slate-400">{item.segment}</td>
                            <td className="py-2 px-3">
                              <span className="rounded border border-slate-700 bg-slate-950 px-2 py-0.5 text-[10px] font-bold text-slate-300">
                                {item.plan}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-slate-400">{item.seats}</td>
                            <td className="py-2 px-3 text-slate-400">{item.dataPackages}</td>
                            <td className="py-2 px-3 text-slate-400">{item.apiKeys}</td>
                            <td className="py-2 px-3 text-slate-400">{item.sso}</td>
                            <td className="py-2 px-3 text-slate-500">{item.billing}</td>
                            <td className="py-2 px-3 text-right">
                              <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${executionReviewBadgeClass(item.status)}`}>
                                {executionReviewLabel(item.status)}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-slate-500">{item.evidence}</td>
                            <td className="py-2 px-3 text-slate-500">{item.action}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="rounded-md border border-dashed border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-500">
                    建立權限矩陣後，這裡會顯示客戶工作區開通清單。
                  </div>
                )}
              </div>

              <div className="border-t border-slate-800 pt-3 space-y-3">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-xs font-bold text-slate-100">用量與帳務中心</h4>
                      <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${executionReviewBadgeClass(usageBillingDecision)}`}>
                        {executionReviewLabel(usageBillingDecision)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      追蹤席位、API call、匯出量、月費/合約、發票狀態與下一步收款動作
                    </p>
                  </div>
                  <div className="flex flex-wrap items-end gap-2 text-xs">
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        ["可收費", `${billableWorkspaceCount}`],
                        ["就緒", `${billingReadyCount}`],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-md border border-slate-800 bg-slate-900/70 px-3 py-2 text-right">
                          <p className="text-[10px] text-slate-600">{label}</p>
                          <p className="mt-0.5 font-mono font-bold text-slate-100">{value}</p>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={handleExportUsageBillingCsv}
                      disabled={!usageBillingItems.length}
                      className="px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold disabled:cursor-not-allowed disabled:bg-slate-950 disabled:text-slate-600"
                    >
                      帳務 CSV
                    </button>
                  </div>
                </div>

                {usageBillingItems.length ? (
                  <div className="overflow-x-auto rounded-lg border border-slate-800">
                    <table className="w-full min-w-[1500px] text-xs">
                      <thead className="bg-slate-900/80">
                        <tr className="text-left text-[11px] text-slate-600">
                          <th className="py-2 px-3 font-medium">工作區</th>
                          <th className="py-2 px-3 font-medium">方案</th>
                          <th className="py-2 px-3 font-medium">帳務模式</th>
                          <th className="py-2 px-3 font-medium">席位用量</th>
                          <th className="py-2 px-3 font-medium">API 用量</th>
                          <th className="py-2 px-3 font-medium">匯出用量</th>
                          <th className="py-2 px-3 font-medium">月收入</th>
                          <th className="py-2 px-3 font-medium">發票/合約</th>
                          <th className="py-2 px-3 font-medium text-right">狀態</th>
                          <th className="py-2 px-3 font-medium">依據</th>
                          <th className="py-2 px-3 font-medium">動作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {usageBillingItems.map((item) => (
                          <tr key={`${item.plan}-${item.workspace}`} className={`border-t ${executionReviewRowClass(item.status)}`}>
                            <td className="py-2 px-3 font-bold text-slate-100">{item.workspace}</td>
                            <td className="py-2 px-3">
                              <span className="rounded border border-slate-700 bg-slate-950 px-2 py-0.5 text-[10px] font-bold text-slate-300">
                                {item.plan}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-slate-400">{item.billingModel}</td>
                            <td className="py-2 px-3 text-slate-400">{item.seatUsage}</td>
                            <td className="py-2 px-3 text-slate-400">{item.apiUsage}</td>
                            <td className="py-2 px-3 text-slate-400">{item.exportUsage}</td>
                            <td className="py-2 px-3 font-mono text-[11px] text-slate-300">{item.monthlyRevenue}</td>
                            <td className="py-2 px-3 text-slate-500">{item.invoiceStatus}</td>
                            <td className="py-2 px-3 text-right">
                              <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${executionReviewBadgeClass(item.status)}`}>
                                {executionReviewLabel(item.status)}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-slate-500">{item.evidence}</td>
                            <td className="py-2 px-3 text-slate-500">{item.action}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="rounded-md border border-dashed border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-500">
                    建立客戶工作區後，這裡會顯示用量與帳務資料。
                  </div>
                )}
              </div>

              <div className="border-t border-slate-800 pt-3 space-y-3">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-xs font-bold text-slate-100">資料授權與合規中心</h4>
                      <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${executionReviewBadgeClass(dataLicenseComplianceDecision)}`}>
                        {executionReviewLabel(dataLicenseComplianceDecision)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      管理資料來源授權、再散布限制、客戶可見範圍、匯出政策、稽核軌跡與續約檢查
                    </p>
                  </div>
                  <div className="flex flex-wrap items-end gap-2 text-xs">
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        ["可上線", `${licenseReadyCount}`],
                        ["受限項", `${licenseRestrictedCount}`],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-md border border-slate-800 bg-slate-900/70 px-3 py-2 text-right">
                          <p className="text-[10px] text-slate-600">{label}</p>
                          <p className="mt-0.5 font-mono font-bold text-slate-100">{value}</p>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={handleExportDataLicenseComplianceCsv}
                      disabled={!dataLicenseComplianceItems.length}
                      className="px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold disabled:cursor-not-allowed disabled:bg-slate-950 disabled:text-slate-600"
                    >
                      授權 CSV
                    </button>
                  </div>
                </div>

                {dataLicenseComplianceItems.length ? (
                  <div className="overflow-x-auto rounded-lg border border-slate-800">
                    <table className="w-full min-w-[1600px] text-xs">
                      <thead className="bg-slate-900/80">
                        <tr className="text-left text-[11px] text-slate-600">
                          <th className="py-2 px-3 font-medium">來源</th>
                          <th className="py-2 px-3 font-medium">資料集</th>
                          <th className="py-2 px-3 font-medium">授權範圍</th>
                          <th className="py-2 px-3 font-medium">再散布限制</th>
                          <th className="py-2 px-3 font-medium">客戶可見範圍</th>
                          <th className="py-2 px-3 font-medium">匯出政策</th>
                          <th className="py-2 px-3 font-medium">稽核軌跡</th>
                          <th className="py-2 px-3 font-medium">續約</th>
                          <th className="py-2 px-3 font-medium text-right">狀態</th>
                          <th className="py-2 px-3 font-medium">依據</th>
                          <th className="py-2 px-3 font-medium">動作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dataLicenseComplianceItems.map((item) => (
                          <tr key={`${item.source}-${item.dataset}`} className={`border-t ${executionReviewRowClass(item.status)}`}>
                            <td className="py-2 px-3 font-bold text-slate-100">{item.source}</td>
                            <td className="py-2 px-3 text-slate-400">{item.dataset}</td>
                            <td className="py-2 px-3 text-slate-400">{item.licenseScope}</td>
                            <td className="py-2 px-3 text-slate-500">{item.redistribution}</td>
                            <td className="py-2 px-3 text-slate-400">{item.clientAccess}</td>
                            <td className="py-2 px-3 text-slate-500">{item.exportPolicy}</td>
                            <td className="py-2 px-3 text-slate-500">{item.auditTrail}</td>
                            <td className="py-2 px-3 text-slate-500">{item.renewal}</td>
                            <td className="py-2 px-3 text-right">
                              <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${executionReviewBadgeClass(item.status)}`}>
                                {executionReviewLabel(item.status)}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-slate-500">{item.evidence}</td>
                            <td className="py-2 px-3 text-slate-500">{item.action}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="rounded-md border border-dashed border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-500">
                    建立用量與帳務資料後，這裡會顯示資料授權與合規清單。
                  </div>
                )}
              </div>

              <div className="border-t border-slate-800 pt-3 space-y-3">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-xs font-bold text-slate-100">安全與審計中心</h4>
                      <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${executionReviewBadgeClass(securityAuditDecision)}`}>
                        {executionReviewLabel(securityAuditDecision)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      管理 SSO、API key 輪替、IP allowlist、匯出稽核、管理員操作與事件回應
                    </p>
                  </div>
                  <div className="flex flex-wrap items-end gap-2 text-xs">
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        ["就緒", `${securityReadyCount}`],
                        ["阻擋", `${securityBlockCount}`],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-md border border-slate-800 bg-slate-900/70 px-3 py-2 text-right">
                          <p className="text-[10px] text-slate-600">{label}</p>
                          <p className="mt-0.5 font-mono font-bold text-slate-100">{value}</p>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={handleExportSecurityAuditCsv}
                      disabled={!securityAuditItems.length}
                      className="px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold disabled:cursor-not-allowed disabled:bg-slate-950 disabled:text-slate-600"
                    >
                      安全 CSV
                    </button>
                  </div>
                </div>

                {securityAuditItems.length ? (
                  <div className="overflow-x-auto rounded-lg border border-slate-800">
                    <table className="w-full min-w-[1500px] text-xs">
                      <thead className="bg-slate-900/80">
                        <tr className="text-left text-[11px] text-slate-600">
                          <th className="py-2 px-3 font-medium">控制項</th>
                          <th className="py-2 px-3 font-medium">範圍</th>
                          <th className="py-2 px-3 font-medium">負責人</th>
                          <th className="py-2 px-3 font-medium text-right">狀態</th>
                          <th className="py-2 px-3 font-medium">依據</th>
                          <th className="py-2 px-3 font-medium">風險</th>
                          <th className="py-2 px-3 font-medium">頻率</th>
                          <th className="py-2 px-3 font-medium">動作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {securityAuditItems.map((item) => (
                          <tr key={`${item.control}-${item.scope}`} className={`border-t ${executionReviewRowClass(item.status)}`}>
                            <td className="py-2 px-3 font-bold text-slate-100">{item.control}</td>
                            <td className="py-2 px-3 text-slate-400">{item.scope}</td>
                            <td className="py-2 px-3 text-slate-400">{item.owner}</td>
                            <td className="py-2 px-3 text-right">
                              <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${executionReviewBadgeClass(item.status)}`}>
                                {executionReviewLabel(item.status)}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-slate-500">{item.evidence}</td>
                            <td className="py-2 px-3 text-slate-500">{item.risk}</td>
                            <td className="py-2 px-3 text-slate-500">{item.frequency}</td>
                            <td className="py-2 px-3 text-slate-500">{item.action}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="rounded-md border border-dashed border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-500">
                    建立授權合規資料後，這裡會顯示安全與審計控制項。
                  </div>
                )}
              </div>

              <div className="border-t border-slate-800 pt-3 space-y-3">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-xs font-bold text-slate-100">營運事件指揮中心</h4>
                      <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${executionReviewBadgeClass(incidentCommandDecision)}`}>
                        {executionReviewLabel(incidentCommandDecision)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      將資料、API、權限、帳務、合規、安全與交易流程異常轉成事件等級、客戶影響、SLA 與 runbook
                    </p>
                  </div>
                  <div className="flex flex-wrap items-end gap-2 text-xs">
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        ["未結事件", `${incidentOpenCount}`],
                        ["高優先", `${incidentHighPriorityCount}`],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-md border border-slate-800 bg-slate-900/70 px-3 py-2 text-right">
                          <p className="text-[10px] text-slate-600">{label}</p>
                          <p className="mt-0.5 font-mono font-bold text-slate-100">{value}</p>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={handleExportIncidentCommandCsv}
                      disabled={!incidentCommandItems.length}
                      className="px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold disabled:cursor-not-allowed disabled:bg-slate-950 disabled:text-slate-600"
                    >
                      事件 CSV
                    </button>
                  </div>
                </div>

                {incidentCommandItems.length ? (
                  <div className="overflow-x-auto rounded-lg border border-slate-800">
                    <table className="w-full min-w-[1650px] text-xs">
                      <thead className="bg-slate-900/80">
                        <tr className="text-left text-[11px] text-slate-600">
                          <th className="py-2 px-3 font-medium">事件</th>
                          <th className="py-2 px-3 font-medium">優先級</th>
                          <th className="py-2 px-3 font-medium text-right">狀態</th>
                          <th className="py-2 px-3 font-medium">觸發條件</th>
                          <th className="py-2 px-3 font-medium">客戶影響</th>
                          <th className="py-2 px-3 font-medium">負責人</th>
                          <th className="py-2 px-3 font-medium">SLA</th>
                          <th className="py-2 px-3 font-medium">Runbook</th>
                          <th className="py-2 px-3 font-medium">下一步</th>
                        </tr>
                      </thead>
                      <tbody>
                        {incidentCommandItems.map((item) => (
                          <tr key={`${item.incident}-${item.owner}`} className={`border-t ${executionReviewRowClass(item.status)}`}>
                            <td className="py-2 px-3 font-bold text-slate-100">{item.incident}</td>
                            <td className="py-2 px-3">
                              <span className={`rounded border px-2 py-0.5 text-[10px] font-bold ${executionHandoffPriorityClass(item.severity)}`}>
                                {executionHandoffPriorityLabel(item.severity)}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-right">
                              <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${executionReviewBadgeClass(item.status)}`}>
                                {executionReviewLabel(item.status)}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-slate-400">{item.trigger}</td>
                            <td className="py-2 px-3 text-slate-500">{item.customerImpact}</td>
                            <td className="py-2 px-3 text-slate-400">{item.owner}</td>
                            <td className="py-2 px-3 font-mono text-[11px] text-slate-300">{item.sla}</td>
                            <td className="py-2 px-3 text-slate-500">{item.runbook}</td>
                            <td className="py-2 px-3 text-slate-500">{item.nextAction}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="rounded-md border border-dashed border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-500">
                    建立安全審計資料後，這裡會顯示營運事件指揮清單。
                  </div>
                )}
              </div>

              <div className="border-t border-slate-800 pt-3 space-y-3">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-xs font-bold text-slate-100">產品上線閘門</h4>
                      <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${executionReviewBadgeClass(productReleaseGateDecision)}`}>
                        {executionReviewLabel(productReleaseGateDecision)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      彙總資料、API、模型、權限、帳務、授權、安全與事件狀態，判斷每個產品可正式上線、試點或暫緩
                    </p>
                  </div>
                  <div className="flex flex-wrap items-end gap-2 text-xs">
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        ["正式", `${releaseProductionCount}`],
                        ["試點", `${releasePilotCount}`],
                        ["暫緩", `${releaseHoldCount}`],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-md border border-slate-800 bg-slate-900/70 px-3 py-2 text-right">
                          <p className="text-[10px] text-slate-600">{label}</p>
                          <p className="mt-0.5 font-mono font-bold text-slate-100">{value}</p>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={handleExportProductReleaseGateCsv}
                      disabled={!productReleaseGateItems.length}
                      className="px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold disabled:cursor-not-allowed disabled:bg-slate-950 disabled:text-slate-600"
                    >
                      上線 CSV
                    </button>
                  </div>
                </div>

                {productReleaseGateItems.length ? (
                  <div className="overflow-x-auto rounded-lg border border-slate-800">
                    <table className="w-full min-w-[1700px] text-xs">
                      <thead className="bg-slate-900/80">
                        <tr className="text-left text-[11px] text-slate-600">
                          <th className="py-2 px-3 font-medium">產品</th>
                          <th className="py-2 px-3 font-medium">對象</th>
                          <th className="py-2 px-3 font-medium">上線階段</th>
                          <th className="py-2 px-3 font-medium text-right">狀態</th>
                          <th className="py-2 px-3 font-medium">負責人</th>
                          <th className="py-2 px-3 font-medium">依賴</th>
                          <th className="py-2 px-3 font-medium">依據</th>
                          <th className="py-2 px-3 font-medium">阻擋項</th>
                          <th className="py-2 px-3 font-medium">決策</th>
                          <th className="py-2 px-3 font-medium">下一步</th>
                        </tr>
                      </thead>
                      <tbody>
                        {productReleaseGateItems.map((item) => (
                          <tr key={`${item.product}-${item.audience}`} className={`border-t ${executionReviewRowClass(item.status)}`}>
                            <td className="py-2 px-3 font-bold text-slate-100">{item.product}</td>
                            <td className="py-2 px-3 text-slate-400">{item.audience}</td>
                            <td className="py-2 px-3">
                              <span className={`rounded border px-2 py-0.5 text-[10px] font-bold ${releaseStageClass(item.releaseStage)}`}>
                                {releaseStageLabel(item.releaseStage)}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-right">
                              <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${executionReviewBadgeClass(item.status)}`}>
                                {executionReviewLabel(item.status)}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-slate-400">{item.owner}</td>
                            <td className="py-2 px-3 text-slate-500">{item.dependencies}</td>
                            <td className="py-2 px-3 text-slate-500">{item.evidence}</td>
                            <td className="py-2 px-3 text-slate-500">{item.blocker}</td>
                            <td className="py-2 px-3 text-slate-400">{item.decision}</td>
                            <td className="py-2 px-3 text-slate-500">{item.nextAction}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="rounded-md border border-dashed border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-500">
                    建立營運事件資料後，這裡會顯示產品上線閘門。
                  </div>
                )}
              </div>

              <div className="border-t border-slate-800 pt-3 space-y-3">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-xs font-bold text-slate-100">客戶成功健康中心</h4>
                      <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${executionReviewBadgeClass(customerSuccessHealthDecision)}`}>
                        {executionReviewLabel(customerSuccessHealthDecision)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      以工作區、方案、帳務、產品上線、事件與安全合規狀態，推導客戶健康分數、續約風險與擴充機會
                    </p>
                  </div>
                  <div className="flex flex-wrap items-end gap-2 text-xs">
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        ["健康", `${customerHealthyCount}`],
                        ["可擴充", `${customerExpansionCount}`],
                        ["風險", `${customerRiskCount}`],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-md border border-slate-800 bg-slate-900/70 px-3 py-2 text-right">
                          <p className="text-[10px] text-slate-600">{label}</p>
                          <p className="mt-0.5 font-mono font-bold text-slate-100">{value}</p>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={handleExportCustomerSuccessHealthCsv}
                      disabled={!customerSuccessHealthItems.length}
                      className="px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold disabled:cursor-not-allowed disabled:bg-slate-950 disabled:text-slate-600"
                    >
                      客戶 CSV
                    </button>
                  </div>
                </div>

                {customerSuccessHealthItems.length ? (
                  <div className="overflow-x-auto rounded-lg border border-slate-800">
                    <table className="w-full min-w-[1650px] text-xs">
                      <thead className="bg-slate-900/80">
                        <tr className="text-left text-[11px] text-slate-600">
                          <th className="py-2 px-3 font-medium">工作區</th>
                          <th className="py-2 px-3 font-medium">客群</th>
                          <th className="py-2 px-3 font-medium">方案</th>
                          <th className="py-2 px-3 font-medium text-right">分數</th>
                          <th className="py-2 px-3 font-medium">階段</th>
                          <th className="py-2 px-3 font-medium text-right">狀態</th>
                          <th className="py-2 px-3 font-medium">收入訊號</th>
                          <th className="py-2 px-3 font-medium">使用訊號</th>
                          <th className="py-2 px-3 font-medium">風險訊號</th>
                          <th className="py-2 px-3 font-medium">擴充訊號</th>
                          <th className="py-2 px-3 font-medium">負責人</th>
                          <th className="py-2 px-3 font-medium">下一步</th>
                        </tr>
                      </thead>
                      <tbody>
                        {customerSuccessHealthItems.map((item) => (
                          <tr key={`${item.workspace}-${item.plan}`} className={`border-t ${executionReviewRowClass(item.status)}`}>
                            <td className="py-2 px-3 font-bold text-slate-100">{item.workspace}</td>
                            <td className="py-2 px-3 text-slate-400">{item.segment}</td>
                            <td className="py-2 px-3 text-slate-400">{item.plan}</td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-slate-100">{item.healthScore}</td>
                            <td className="py-2 px-3">
                              <span className={`rounded border px-2 py-0.5 text-[10px] font-bold ${customerHealthStageClass(item.healthStage)}`}>
                                {customerHealthStageLabel(item.healthStage)}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-right">
                              <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${executionReviewBadgeClass(item.status)}`}>
                                {executionReviewLabel(item.status)}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-slate-500">{item.revenueSignal}</td>
                            <td className="py-2 px-3 text-slate-500">{item.adoptionSignal}</td>
                            <td className="py-2 px-3 text-slate-500">{item.riskSignal}</td>
                            <td className="py-2 px-3 text-slate-500">{item.expansionSignal}</td>
                            <td className="py-2 px-3 text-slate-400">{item.owner}</td>
                            <td className="py-2 px-3 text-slate-500">{item.nextAction}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="rounded-md border border-dashed border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-500">
                    建立客戶工作區後，這裡會顯示客戶成功健康資料。
                  </div>
                )}
              </div>

              <div className="border-t border-slate-800 pt-3 space-y-3">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-xs font-bold text-slate-100">收入續約預測中心</h4>
                      <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${executionReviewBadgeClass(revenueForecastDecision)}`}>
                        {executionReviewLabel(revenueForecastDecision)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      把客戶健康與帳務資料轉成目前 MRR、擴售機會、流失風險、續約機率與本季營收動作
                    </p>
                  </div>
                  <div className="flex flex-wrap items-end gap-2 text-xs">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {[
                        ["目前 MRR", formatCurrency(revenueCurrentMrr)],
                        ["擴售", formatCurrency(revenueExpansionMrr)],
                        ["風險", formatCurrency(revenueRiskMrr)],
                        ["預估 MRR", formatCurrency(revenueProjectedMrr)],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-md border border-slate-800 bg-slate-900/70 px-3 py-2 text-right">
                          <p className="text-[10px] text-slate-600">{label}</p>
                          <p className="mt-0.5 font-mono font-bold text-slate-100">{value}</p>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={handleExportRevenueForecastCsv}
                      disabled={!revenueForecastItems.length}
                      className="px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold disabled:cursor-not-allowed disabled:bg-slate-950 disabled:text-slate-600"
                    >
                      收入 CSV
                    </button>
                  </div>
                </div>

                {revenueForecastItems.length ? (
                  <div className="overflow-x-auto rounded-lg border border-slate-800">
                    <table className="w-full min-w-[1600px] text-xs">
                      <thead className="bg-slate-900/80">
                        <tr className="text-left text-[11px] text-slate-600">
                          <th className="py-2 px-3 font-medium">工作區</th>
                          <th className="py-2 px-3 font-medium">方案</th>
                          <th className="py-2 px-3 font-medium">階段</th>
                          <th className="py-2 px-3 font-medium text-right">目前 MRR</th>
                          <th className="py-2 px-3 font-medium text-right">擴售 MRR</th>
                          <th className="py-2 px-3 font-medium text-right">風險 MRR</th>
                          <th className="py-2 px-3 font-medium text-right">預估 MRR</th>
                          <th className="py-2 px-3 font-medium text-right">續約率</th>
                          <th className="py-2 px-3 font-medium">負責人</th>
                          <th className="py-2 px-3 font-medium">依據</th>
                          <th className="py-2 px-3 font-medium">本季動作</th>
                          <th className="py-2 px-3 font-medium">下一步</th>
                        </tr>
                      </thead>
                      <tbody>
                        {revenueForecastItems.map((item) => (
                          <tr key={`${item.workspace}-${item.forecastStage}`} className={`border-t ${executionReviewRowClass(item.status)}`}>
                            <td className="py-2 px-3 font-bold text-slate-100">{item.workspace}</td>
                            <td className="py-2 px-3 text-slate-400">{item.plan}</td>
                            <td className="py-2 px-3">
                              <span className={`rounded border px-2 py-0.5 text-[10px] font-bold ${revenueForecastStageClass(item.forecastStage)}`}>
                                {revenueForecastStageLabel(item.forecastStage)}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-slate-300">{formatCurrency(item.currentMrr)}</td>
                            <td className="py-2 px-3 text-right font-mono text-emerald-200">{formatCurrency(item.expansionMrr)}</td>
                            <td className="py-2 px-3 text-right font-mono text-rose-200">{formatCurrency(item.churnRiskMrr)}</td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-slate-100">{formatCurrency(item.projectedMrr)}</td>
                            <td className="py-2 px-3 text-right font-mono text-slate-300">{formatPercent(item.renewalProbability)}</td>
                            <td className="py-2 px-3 text-slate-400">{item.owner}</td>
                            <td className="py-2 px-3 text-slate-500">{item.evidence}</td>
                            <td className="py-2 px-3 text-slate-400">{item.quarterAction}</td>
                            <td className="py-2 px-3 text-slate-500">{item.nextAction}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="rounded-md border border-dashed border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-500">
                    建立客戶健康資料後，這裡會顯示收入與續約預測。
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-bold text-slate-200">daily_prices</p>
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-bold ${qualityBadgeClass(
                        bigQueryDiagnostics.schemaChecks.priceTable.isReady ? "strong" : "risk",
                      )}`}
                    >
                      {bigQueryDiagnostics.schemaChecks.priceTable.isReady ? "Ready" : "Missing"}
                    </span>
                  </div>
                  <dl className="grid grid-cols-2 gap-2">
                    <div>
                      <dt className="text-slate-500">期間</dt>
                      <dd className="mt-0.5 font-mono text-slate-100">
                        {bigQueryDiagnostics.priceSummary.first_date ?? "--"} ~ {bigQueryDiagnostics.priceSummary.latest_date ?? "--"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">商品數</dt>
                      <dd className="mt-0.5 font-mono text-slate-100">
                        {formatCount(bigQueryDiagnostics.priceSummary.symbol_count)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">總筆數</dt>
                      <dd className="mt-0.5 font-mono text-slate-100">
                        {formatCount(bigQueryDiagnostics.priceSummary.row_count)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Adj / Raw</dt>
                      <dd className="mt-0.5 font-mono text-slate-100">
                        {formatCount(bigQueryDiagnostics.priceSummary.adjusted_price_rows)} / {formatCount(bigQueryDiagnostics.priceSummary.raw_price_rows)}
                      </dd>
                    </div>
                  </dl>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-bold text-slate-200">daily_fx</p>
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-bold ${qualityBadgeClass(
                        bigQueryDiagnostics.schemaChecks.fxTable.isReady ? "strong" : "risk",
                      )}`}
                    >
                      {bigQueryDiagnostics.schemaChecks.fxTable.isReady ? "Ready" : "Missing"}
                    </span>
                  </div>
                  <dl className="grid grid-cols-2 gap-2">
                    <div>
                      <dt className="text-slate-500">期間</dt>
                      <dd className="mt-0.5 font-mono text-slate-100">
                        {bigQueryDiagnostics.fxSummary.first_date ?? "--"} ~ {bigQueryDiagnostics.fxSummary.latest_date ?? "--"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">幣別數</dt>
                      <dd className="mt-0.5 font-mono text-slate-100">
                        {formatCount(bigQueryDiagnostics.fxSummary.currency_count)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">總筆數</dt>
                      <dd className="mt-0.5 font-mono text-slate-100">
                        {formatCount(bigQueryDiagnostics.fxSummary.row_count)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">距今天</dt>
                      <dd className="mt-0.5 font-mono text-slate-100">
                        {fxFreshnessDays === null ? "--" : `${fxFreshnessDays} 天`}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>

              {(!bigQueryDiagnostics.schemaChecks.priceTable.isReady || !bigQueryDiagnostics.schemaChecks.fxTable.isReady) && (
                <div className="border border-red-900/60 bg-red-950/30 rounded-lg p-3 text-xs text-red-300 space-y-2">
                  {!bigQueryDiagnostics.schemaChecks.priceTable.isReady && (
                    <p>
                      daily_prices 缺少欄位：
                      {bigQueryDiagnostics.schemaChecks.priceTable.missingColumns.join(", ")}
                    </p>
                  )}
                  {!bigQueryDiagnostics.schemaChecks.fxTable.isReady && (
                    <p>
                      daily_fx 缺少欄位：
                      {bigQueryDiagnostics.schemaChecks.fxTable.missingColumns.join(", ")}
                    </p>
                  )}
                </div>
              )}

              {staleSymbols.length ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3 text-[11px]">
                    <span className="text-slate-500">落後商品</span>
                    <span className="text-slate-600 font-mono">{staleSymbols.length} 檔</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                    {staleSymbols.slice(0, 8).map((symbol) => {
                      const staleDays = symbol.stale_days ?? daysSinceDate(symbol.latest_date);
                      return (
                        <div key={symbol.symbol} className="bg-slate-900 border border-slate-800 rounded-md p-2 space-y-1">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-slate-200 truncate">{symbol.symbol}</span>
                            <span
                              className={`rounded px-2 py-0.5 text-[10px] font-bold ${qualityBadgeClass(
                                freshnessStatus(staleDays),
                              )}`}
                            >
                              {staleDays === null ? "--" : `${staleDays} 天`}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-3 text-[11px] text-slate-500">
                            <span className="font-mono">{symbol.latest_date ?? "--"}</span>
                            <span className="font-mono">{formatCount(symbol.row_count)} rows</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {fxCurrencies.length ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3 text-[11px]">
                    <span className="text-slate-500">匯率幣別狀態</span>
                    <span className="text-slate-600 font-mono">{fxCurrencies.length} 組</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                    {fxCurrencies.map((currency) => (
                      <div key={currency.currency} className="flex items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-md p-2">
                        <span className="text-slate-200 truncate">{currency.currency}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500 font-mono">{currency.latest_date ?? "--"}</span>
                          <span
                            className={`rounded px-2 py-0.5 text-[10px] font-bold ${qualityBadgeClass(
                              freshnessStatus(daysSinceDate(currency.latest_date)),
                            )}`}
                          >
                            {qualityLabel(freshnessStatus(daysSinceDate(currency.latest_date)))}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3 text-[11px]">
                  <span className="text-slate-500">近期商品新鮮度</span>
                  <span className="text-slate-600 font-mono">{bigQueryDiagnostics.recentSymbols.length} 檔</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                  {bigQueryDiagnostics.recentSymbols.map((symbol) => (
                    <div key={symbol.symbol} className="flex items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-md p-2">
                      <span className="text-slate-200 truncate">{symbol.symbol}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 font-mono">{symbol.latest_date ?? "--"}</span>
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-bold ${qualityBadgeClass(
                            freshnessStatus(daysSinceDate(symbol.latest_date)),
                          )}`}
                        >
                          {qualityLabel(freshnessStatus(daysSinceDate(symbol.latest_date)))}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="border border-dashed border-slate-800 rounded-lg p-4 text-xs text-slate-500">
              設定 GCP_SERVICE_ACCOUNT_JSON 後，這裡會顯示 daily_prices / daily_fx 的資料覆蓋率。
            </div>
          )}
        </section>

        <section className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-4">
          <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-100">BigQuery 商品主檔</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                單一商品價格、報酬、波動、回撤與資料完整度
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-[1fr_120px_auto_auto] gap-2 text-xs xl:min-w-[680px]">
              <input
                value={assetQuery}
                onChange={(event) => setAssetQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    void handleLoadAssetProfile();
                  }
                }}
                placeholder="0050.TW"
                className="min-w-0 bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-slate-100 font-mono outline-none focus:border-cyan-600"
              />
              <select
                value={assetPriceBasis}
                onChange={(event) => setAssetPriceBasis(event.target.value as "adjusted" | "raw")}
                className="bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-slate-100"
              >
                <option value="adjusted">Adj</option>
                <option value="raw">Raw</option>
              </select>
              <button
                onClick={handleSearchAssets}
                disabled={!hasBigQueryCredentials || isSearchingAssets || !assetQuery.trim()}
                className="px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold disabled:cursor-not-allowed disabled:bg-slate-900 disabled:text-slate-600"
              >
                {isSearchingAssets ? "搜尋中" : "搜尋"}
              </button>
              <button
                onClick={() => handleLoadAssetProfile()}
                disabled={!hasBigQueryCredentials || isLoadingAssetProfile || !assetQuery.trim()}
                className="px-3 py-2 rounded-md bg-cyan-700 hover:bg-cyan-600 text-white font-bold disabled:cursor-not-allowed disabled:bg-slate-900 disabled:text-slate-600"
              >
                {isLoadingAssetProfile ? "讀取中" : "讀取商品"}
              </button>
            </div>
          </div>

          {assetPanelError ? (
            <div className="border border-red-900/60 bg-red-950/30 rounded-lg p-3 text-xs text-red-300 whitespace-pre-wrap">
              {assetPanelError}
            </div>
          ) : null}

          {assetSuggestions.length ? (
            <div className="flex flex-wrap gap-2">
              {assetSuggestions.map((asset) => (
                <button
                  key={asset.symbol}
                  onClick={() => handleLoadAssetProfile(asset.symbol)}
                  className="max-w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-left text-xs hover:border-cyan-600"
                >
                  <span className="block font-bold text-cyan-200">{asset.symbol}</span>
                  <span className="block text-[11px] text-slate-500">
                    {asset.first_date ?? "--"} ~ {asset.latest_date ?? "--"} · {formatCount(asset.row_count)} rows
                  </span>
                </button>
              ))}
            </div>
          ) : null}

          {assetProfile ? (
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-t border-slate-900 pt-4">
                <div>
                  <p className="text-sm font-bold text-cyan-200">{assetProfile.symbol}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {assetProfile.summary.first_date ?? "--"} ~ {assetProfile.summary.latest_date ?? "--"} · {assetProfile.priceBasis}
                  </p>
                </div>
                <button
                  onClick={handleExportAssetProfileCsv}
                  className="self-start md:self-auto px-3 py-2 text-xs font-bold rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100"
                >
                  商品 CSV
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-2 text-xs">
                {assetProfileQualityCards.map((card) => (
                  <div key={card.label} className={`rounded-lg border p-3 min-w-0 ${qualityClass(card.status)}`}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] text-slate-500 truncate">{card.label}</p>
                      <span className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-bold ${qualityBadgeClass(card.status)}`}>
                        {qualityLabel(card.status)}
                      </span>
                    </div>
                    <p className="mt-2 font-mono text-sm font-bold text-slate-100 truncate" title={card.value}>
                      {card.value}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">{card.note}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-2 text-xs">
                {[
                  ["最新價格", formatPrice(assetProfile.metrics.latestPrice)],
                  ["年化報酬", formatPercent(assetProfile.metrics.annualizedReturn)],
                  ["勝率", formatPercent(assetProfile.metrics.positiveDayRatio)],
                  ["最佳單日", formatPercent(assetProfile.metrics.bestDay)],
                  ["最差單日", formatPercent(assetProfile.metrics.worstDay)],
                  ["最新日報酬", formatPercent(assetProfile.metrics.latestDailyReturn)],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-md border border-slate-800 bg-slate-900/60 p-3 min-w-0">
                    <p className="text-[11px] text-slate-600 truncate">{label}</p>
                    <p className="mt-1 font-mono text-sm font-bold text-slate-100 truncate" title={value}>
                      {value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] text-xs">
                  <thead>
                    <tr className="text-left text-[11px] text-slate-600">
                      <th className="py-2 pr-3 font-medium">Date</th>
                      <th className="py-2 px-3 font-medium text-right">Selected</th>
                      <th className="py-2 px-3 font-medium text-right">Adj</th>
                      <th className="py-2 px-3 font-medium text-right">Raw</th>
                      <th className="py-2 pl-3 font-medium text-right">Daily Return</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assetProfile.recentPrices.slice().reverse().map((point) => (
                      <tr key={point.date} className="border-t border-slate-900">
                        <td className="py-2 pr-3 font-mono text-slate-300">{point.date ?? "--"}</td>
                        <td className="py-2 px-3 text-right font-mono text-cyan-200">{formatPrice(point.selected_price)}</td>
                        <td className="py-2 px-3 text-right font-mono text-slate-400">{formatPrice(point.adj_price)}</td>
                        <td className="py-2 px-3 text-right font-mono text-slate-400">{formatPrice(point.raw_price)}</td>
                        <td
                          className={`py-2 pl-3 text-right font-mono ${
                            typeof point.daily_return === "number" && point.daily_return < 0
                              ? "text-rose-300"
                              : "text-emerald-300"
                          }`}
                        >
                          {formatPercent(point.daily_return)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="border border-dashed border-slate-800 rounded-lg p-4 text-xs text-slate-500">
              選擇商品後，這裡會顯示單一商品的資料主檔與價格品質。
            </div>
          )}
        </section>

        <section className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-4">
          <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-100">BigQuery Watchlist 比較</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                批次比較多檔商品的報酬、波動、回撤與資料品質
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {comparisonRows.length ? (
                <>
                  <button
                    onClick={handleExportAssetComparisonMemo}
                    disabled={!visibleComparisonRows.length}
                    className="px-3 py-2 text-xs font-bold rounded-md bg-emerald-700 hover:bg-emerald-600 text-white disabled:cursor-not-allowed disabled:bg-slate-900 disabled:text-slate-600"
                  >
                    Memo MD
                  </button>
                  <button
                    onClick={() => void handleCopyAssetComparisonMemo()}
                    disabled={!visibleComparisonRows.length}
                    className="px-3 py-2 text-xs font-bold rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100 disabled:cursor-not-allowed disabled:bg-slate-900 disabled:text-slate-600"
                  >
                    {watchlistMemoCopyStatus === "copied" ? "已複製" : "複製 Memo"}
                  </button>
                  <button
                    onClick={handleExportAssetComparisonCsv}
                    className="px-3 py-2 text-xs font-bold rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100"
                  >
                    Watchlist CSV
                  </button>
                </>
              ) : null}
              <button
                onClick={handleCompareAssets}
                disabled={!hasBigQueryCredentials || isLoadingComparison || !parseSymbolList(comparisonSymbols).length}
                className="px-3 py-2 text-xs font-bold rounded-md bg-cyan-700 hover:bg-cyan-600 text-white disabled:cursor-not-allowed disabled:bg-slate-900 disabled:text-slate-600"
              >
                {isLoadingComparison ? "比較中" : "比較商品"}
              </button>
            </div>
          </div>

          <textarea
            value={comparisonSymbols}
            onChange={(event) => setComparisonSymbols(event.target.value)}
            rows={3}
            placeholder="0050.TW SPY QQQ"
            className="w-full resize-y rounded-md border border-slate-800 bg-slate-900 px-3 py-2 font-mono text-xs text-slate-100 outline-none placeholder:text-slate-700 focus:border-cyan-600"
          />
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
            <span>最多比較 12 檔；可用空白、逗號或換行分隔</span>
            <span className="font-mono">
              {parseSymbolList(comparisonSymbols).length} symbols · {assetPriceBasis}
            </span>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[0.8fr_1.2fr] gap-2 rounded-lg border border-slate-800 bg-slate-900/60 p-3 text-xs">
            <label className="space-y-1">
              <span className="text-slate-500">Watchlist 名稱</span>
              <input
                value={watchlistPresetName}
                onChange={(event) => setWatchlistPresetName(event.target.value)}
                className="w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-slate-100"
              />
            </label>
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto_auto] gap-2">
              <label className="space-y-1">
                <span className="text-slate-500">已存 Watchlist</span>
                <select
                  value={selectedWatchlistPresetId}
                  onChange={(event) => {
                    const preset = savedWatchlistPresets.find((item) => item.id === event.target.value);
                    setSelectedWatchlistPresetId(event.target.value);
                    if (preset) setWatchlistPresetName(preset.name);
                  }}
                  className="w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-slate-100"
                >
                  <option value="">尚未選擇</option>
                  {savedWatchlistPresets.map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.name} · {new Date(preset.updatedAt).toLocaleDateString("zh-TW")}
                    </option>
                  ))}
                </select>
              </label>
              <button
                onClick={handleSaveWatchlistPreset}
                className="md:self-end px-3 py-2 rounded-md bg-emerald-700 hover:bg-emerald-600 text-white font-bold"
              >
                儲存
              </button>
              <button
                onClick={handleLoadWatchlistPreset}
                disabled={!selectedWatchlistPresetId}
                className="md:self-end px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold disabled:cursor-not-allowed disabled:text-slate-600"
              >
                載入
              </button>
              <button
                onClick={handleDeleteWatchlistPreset}
                disabled={!selectedWatchlistPresetId}
                className="md:self-end px-3 py-2 rounded-md border border-slate-700 bg-slate-950 text-slate-300 hover:border-rose-500 hover:text-rose-300 font-bold disabled:cursor-not-allowed disabled:text-slate-700"
              >
                刪除
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1.2fr] gap-2 text-xs">
            <label className="space-y-1">
              <span className="text-slate-500">排序</span>
              <select
                value={comparisonSortKey}
                onChange={(event) => setComparisonSortKey(event.target.value as AssetComparisonSortKey)}
                className="w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-slate-100"
              >
                <option value="score">分數高到低</option>
                <option value="annualizedReturn">年化報酬高到低</option>
                <option value="riskAdjustedReturn">風險調整報酬高到低</option>
                <option value="annualizedVolatility">波動低到高</option>
                <option value="maxDrawdown">回撤低到高</option>
                <option value="freshnessDays">資料新鮮優先</option>
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-slate-500">訊號</span>
              <select
                value={comparisonSignalFilter}
                onChange={(event) => setComparisonSignalFilter(event.target.value as AssetDecisionSignal | "all")}
                className="w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-slate-100"
              >
                <option value="all">全部</option>
                <option value="candidate">候選</option>
                <option value="watch">觀察</option>
                <option value="neutral">中性</option>
                <option value="risk">風險</option>
              </select>
            </label>
            <label className="space-y-1">
              <span className="flex items-center justify-between gap-2 text-slate-500">
                <span>最低分數</span>
                <span className="font-mono text-slate-400">{minimumComparisonScore}</span>
              </span>
              <input
                type="range"
                min={0}
                max={90}
                step={5}
                value={minimumComparisonScore}
                onChange={(event) => setMinimumComparisonScore(Number(event.target.value))}
                className="w-full accent-cyan-500"
              />
            </label>
          </div>

          {comparisonError ? (
            <div className="border border-red-900/60 bg-red-950/30 rounded-lg p-3 text-xs text-red-300 whitespace-pre-wrap">
              {comparisonError}
            </div>
          ) : null}

          {comparisonRows.length ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                {[
                  ["顯示商品", `${visibleComparisonRows.length} / ${comparisonRows.length} 檔`],
                  [
                    "平均年化報酬",
                    formatPercent(
                      visibleComparisonRows.reduce((sum, row) => sum + (row.annualizedReturn ?? 0), 0) /
                        Math.max(1, visibleComparisonRows.filter((row) => row.annualizedReturn !== null).length),
                    ),
                  ],
                  [
                    "平均波動",
                    formatPercent(
                      visibleComparisonRows.reduce((sum, row) => sum + (row.annualizedVolatility ?? 0), 0) /
                        Math.max(1, visibleComparisonRows.filter((row) => row.annualizedVolatility !== null).length),
                    ),
                  ],
                  [
                    "異常/觀察",
                    `${visibleComparisonRows.filter((row) => row.qualityStatus !== "strong").length} 檔`,
                  ],
                  [
                    "最高分",
                    visibleComparisonRows.length
                      ? `${visibleComparisonRows[0].symbol} · ${visibleComparisonRows[0].score}`
                      : "--",
                  ],
                  [
                    "候選",
                    `${visibleComparisonRows.filter((row) => row.signal === "candidate").length} 檔`,
                  ],
                  [
                    "風險",
                    `${visibleComparisonRows.filter((row) => row.signal === "risk").length} 檔`,
                  ],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-md border border-slate-800 bg-slate-900/60 p-3 min-w-0">
                    <p className="text-[11px] text-slate-600 truncate">{label}</p>
                    <p className="mt-1 font-mono text-sm font-bold text-slate-100 truncate" title={value}>
                      {value}
                    </p>
                  </div>
                ))}
              </div>

              <section className="rounded-lg border border-slate-800 bg-slate-900/50 p-3 space-y-3">
                <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-bold text-slate-100">模型配置草稿</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      依目前 Watchlist 篩選結果產生研究用權重；風險訊號與低分商品會自動排除
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-[150px_160px_140px_150px_auto_auto] gap-2 text-xs">
                    <label className="space-y-1">
                      <span className="text-slate-500">配置模式</span>
                      <select
                        value={allocationMode}
                        onChange={(event) => setAllocationMode(event.target.value as AllocationMode)}
                        className="w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-slate-100"
                      >
                        <option value="risk">風險調整</option>
                        <option value="score">分數加權</option>
                        <option value="equal">等權重</option>
                      </select>
                    </label>
                    <label className="space-y-1">
                      <span className="text-slate-500">模型本金</span>
                      <input
                        type="number"
                        min={0}
                        step={10000}
                        value={allocationCapital}
                        onChange={(event) => setAllocationCapital(Math.max(0, Number(event.target.value) || 0))}
                        className="w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-right font-mono text-slate-100"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-slate-500">單檔上限</span>
                      <input
                        type="number"
                        min={5}
                        max={100}
                        step={5}
                        value={Math.round(maximumAllocationWeight * 100)}
                        onChange={(event) => setMaximumAllocationWeight(Math.min(1, Math.max(0.05, (Number(event.target.value) || 0) / 100)))}
                        className="w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-right font-mono text-slate-100"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-slate-500">壓力情境</span>
                      <input
                        type="number"
                        min={-80}
                        max={0}
                        step={5}
                        value={stressShockPercent}
                        onChange={(event) => setStressShockPercent(Math.min(0, Math.max(-80, Number(event.target.value) || 0)))}
                        className="w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-right font-mono text-slate-100"
                      />
                    </label>
                    <button
                      onClick={handleExportAllocationDraftCsv}
                      disabled={!modelAllocationRows.length}
                      className="sm:self-end px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold disabled:cursor-not-allowed disabled:bg-slate-950 disabled:text-slate-600"
                    >
                      配置 CSV
                    </button>
                    <button
                      onClick={handleExportAllocationRiskCsv}
                      disabled={!activeAllocationRows.length}
                      className="sm:self-end px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold disabled:cursor-not-allowed disabled:bg-slate-950 disabled:text-slate-600"
                    >
                      風險 CSV
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  {[
                    ["模式", allocationModeLabel(allocationMode)],
                    ["納入商品", `${activeAllocationRows.length} / ${visibleComparisonRows.length} 檔`],
                    ["配置金額", formatCurrency(activeAllocationRows.reduce((sum, row) => sum + row.allocationAmount, 0))],
                    [
                      "最高權重",
                      activeAllocationRows.length
                        ? `${activeAllocationRows[0].symbol} · ${formatPercent(activeAllocationRows[0].allocationWeight)}`
                        : "--",
                    ],
                    ["權重上限", formatPercent(effectiveMaximumAllocationWeight)],
                    ["達上限", `${activeAllocationRows.filter((row) => row.allocationCapApplied).length} 檔`],
                    ["預估年化報酬", formatPercent(allocationRisk.expectedAnnualReturn)],
                    ["預估年化波動", formatPercent(allocationRisk.estimatedAnnualVolatility)],
                    ["壓力損益", formatCurrency(allocationRisk.stressLoss)],
                    [
                      "最大風險貢獻",
                      allocationRisk.riskRows.length
                        ? `${allocationRisk.riskRows[0].symbol} · ${formatPercent(allocationRisk.riskRows[0].riskContribution)}`
                        : "--",
                    ],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-md border border-slate-800 bg-slate-950/70 p-3 min-w-0">
                      <p className="text-[11px] text-slate-600 truncate">{label}</p>
                      <p className="mt-1 font-mono text-sm font-bold text-slate-100 truncate" title={value}>
                        {value}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[960px] text-xs">
                    <thead>
                      <tr className="text-left text-[11px] text-slate-600">
                        <th className="py-2 pr-3 font-medium">Symbol</th>
                        <th className="py-2 px-3 font-medium text-right">Weight</th>
                        <th className="py-2 px-3 font-medium text-right">Cap</th>
                        <th className="py-2 px-3 font-medium text-right">Amount</th>
                        <th className="py-2 px-3 font-medium text-right">Score</th>
                        <th className="py-2 px-3 font-medium text-right">Vol</th>
                        <th className="py-2 px-3 font-medium text-right">Drawdown</th>
                        <th className="py-2 px-3 font-medium">Signal</th>
                        <th className="py-2 pl-3 font-medium">Note</th>
                      </tr>
                    </thead>
                    <tbody>
                      {modelAllocationRows.slice(0, 10).map((row) => (
                        <tr key={row.symbol} className="border-t border-slate-800/80">
                          <td className="py-2 pr-3 font-bold text-cyan-200">{row.symbol}</td>
                          <td className="py-2 px-3 text-right font-mono text-slate-100">
                            {formatPercent(row.allocationWeight)}
                          </td>
                          <td className="py-2 px-3 text-right">
                            <span
                              className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                                row.allocationCapApplied ? "bg-amber-500/15 text-amber-200" : "bg-slate-800 text-slate-400"
                              }`}
                            >
                              {row.allocationCapApplied ? "Hit" : "--"}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-slate-300">
                            {formatCurrency(row.allocationAmount)}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-slate-300">{row.score}</td>
                          <td className="py-2 px-3 text-right font-mono text-amber-200">
                            {formatPercent(row.annualizedVolatility)}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-rose-300">
                            {formatPercent(row.maxDrawdown)}
                          </td>
                          <td className="py-2 px-3">
                            <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${decisionSignalClass(row.signal)}`}>
                              {decisionSignalLabel(row.signal)}
                            </span>
                          </td>
                          <td className="py-2 pl-3 text-slate-500">{row.allocationNote}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-[0.85fr_1.15fr] gap-3">
                  <div className="rounded-md border border-slate-800 bg-slate-950/70 p-3 text-xs space-y-3">
                    <div>
                      <p className="text-[11px] text-slate-600">壓力情境損益</p>
                      <p className={`mt-1 font-mono text-lg font-bold ${allocationRisk.stressLoss < 0 ? "text-rose-300" : "text-emerald-300"}`}>
                        {formatCurrency(allocationRisk.stressLoss)}
                      </p>
                      <p className="mt-1 text-[11px] text-slate-500">
                        {formatPercent(stressShockPercent / 100)} 情境後估計市值 {formatCurrency(allocationRisk.stressedValue)}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-[11px] text-slate-600">加權最大回撤</p>
                        <p className="mt-1 font-mono text-sm font-bold text-rose-300">
                          {formatPercent(allocationRisk.weightedMaxDrawdown)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] text-slate-600">單檔最差回撤</p>
                        <p className="mt-1 font-mono text-sm font-bold text-rose-300">
                          {formatPercent(allocationRisk.worstMaxDrawdown)}
                        </p>
                      </div>
                    </div>
                    <p className="text-[11px] leading-relaxed text-slate-500">
                      目前使用單資產歷史波動估算風險預算，尚未納入資產間相關係數；後續接完整歷史報酬矩陣後，可升級為共變異數模型。
                    </p>
                  </div>

                  <div className="overflow-x-auto rounded-md border border-slate-800 bg-slate-950/70">
                    <table className="w-full min-w-[720px] text-xs">
                      <thead>
                        <tr className="text-left text-[11px] text-slate-600">
                          <th className="py-2 px-3 font-medium">Symbol</th>
                          <th className="py-2 px-3 font-medium text-right">Weight</th>
                          <th className="py-2 px-3 font-medium text-right">Risk Budget</th>
                          <th className="py-2 px-3 font-medium text-right">Weighted Vol</th>
                          <th className="py-2 px-3 font-medium text-right">Vol</th>
                          <th className="py-2 px-3 font-medium text-right">Drawdown</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allocationRisk.riskRows.slice(0, 8).map((row) => (
                          <tr key={row.symbol} className="border-t border-slate-800/80">
                            <td className="py-2 px-3 font-bold text-cyan-200">{row.symbol}</td>
                            <td className="py-2 px-3 text-right font-mono text-slate-300">
                              {formatPercent(row.allocationWeight)}
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-slate-100">
                              {formatPercent(row.riskContribution)}
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-slate-400">
                              {formatPercent(row.weightedVolatility)}
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-amber-200">
                              {formatPercent(row.annualizedVolatility)}
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-rose-300">
                              {formatPercent(row.maxDrawdown)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="border-t border-slate-800 pt-3 space-y-3">
                  <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-3">
                    <div>
                      <h4 className="text-xs font-bold text-slate-100">再平衡交易草稿</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        輸入現有持倉金額後，依模型目標權重估算買賣差額
                      </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-[150px_auto] gap-2 text-xs">
                      <label className="space-y-1">
                        <span className="text-slate-500">偏離門檻</span>
                        <input
                          type="number"
                          min={0}
                          max={20}
                          step={0.5}
                          value={Number((rebalanceThreshold * 100).toFixed(2))}
                          onChange={(event) => setRebalanceThreshold(Math.min(0.2, Math.max(0, (Number(event.target.value) || 0) / 100)))}
                          className="w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-right font-mono text-slate-100"
                        />
                      </label>
                      <button
                        onClick={handleExportRebalanceDraftCsv}
                        disabled={!rebalanceRows.length}
                        className="sm:self-end px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold disabled:cursor-not-allowed disabled:bg-slate-950 disabled:text-slate-600"
                      >
                        再平衡 CSV
                      </button>
                    </div>
                  </div>

                  <textarea
                    value={currentHoldingsText}
                    onChange={(event) => setCurrentHoldingsText(event.target.value)}
                    rows={4}
                    placeholder={"0050.TW 300000\nSPY 250000\nQQQ 200000"}
                    className="w-full resize-y rounded-md border border-slate-800 bg-slate-950 px-3 py-2 font-mono text-xs text-slate-100 outline-none placeholder:text-slate-700 focus:border-cyan-600"
                  />
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
                    <span>每行一檔：商品代號 金額；也可用逗號分隔</span>
                    <span className="font-mono">
                      {rebalanceRows.length} rows · {formatPercent(rebalanceThreshold)}
                    </span>
                  </div>

                  {rebalanceRows.length ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                        {[
                          ["需交易", `${activeRebalanceRows.length} 檔`],
                          [
                            "買入金額",
                            formatCurrency(
                              activeRebalanceRows
                                .filter((row) => row.direction === "buy")
                                .reduce((sum, row) => sum + row.tradeAmount, 0),
                            ),
                          ],
                          [
                            "賣出金額",
                            formatCurrency(
                              activeRebalanceRows
                                .filter((row) => row.direction === "sell")
                                .reduce((sum, row) => sum + Math.abs(row.tradeAmount), 0),
                            ),
                          ],
                          [
                            "最大偏離",
                            rebalanceRows.length
                              ? `${rebalanceRows[0].symbol} · ${formatPercent(rebalanceRows[0].tradeWeight)}`
                              : "--",
                          ],
                        ].map(([label, value]) => (
                          <div key={label} className="rounded-md border border-slate-800 bg-slate-950/70 p-3 min-w-0">
                            <p className="text-[11px] text-slate-600 truncate">{label}</p>
                            <p className="mt-1 font-mono text-sm font-bold text-slate-100 truncate" title={value}>
                              {value}
                            </p>
                          </div>
                        ))}
                      </div>

                      <div className="overflow-x-auto rounded-md border border-slate-800 bg-slate-950/70">
                        <table className="w-full min-w-[920px] text-xs">
                          <thead>
                            <tr className="text-left text-[11px] text-slate-600">
                              <th className="py-2 px-3 font-medium">Symbol</th>
                              <th className="py-2 px-3 font-medium text-right">Current</th>
                              <th className="py-2 px-3 font-medium text-right">Target</th>
                              <th className="py-2 px-3 font-medium text-right">Trade</th>
                              <th className="py-2 px-3 font-medium text-right">Current W</th>
                              <th className="py-2 px-3 font-medium text-right">Target W</th>
                              <th className="py-2 px-3 font-medium text-right">Drift</th>
                              <th className="py-2 px-3 font-medium text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rebalanceRows.slice(0, 12).map((row) => (
                              <tr key={row.symbol} className="border-t border-slate-800/80">
                                <td className="py-2 px-3 font-bold text-cyan-200">{row.symbol}</td>
                                <td className="py-2 px-3 text-right font-mono text-slate-300">
                                  {formatCurrency(row.currentAmount)}
                                </td>
                                <td className="py-2 px-3 text-right font-mono text-slate-300">
                                  {formatCurrency(row.targetAmount)}
                                </td>
                                <td
                                  className={`py-2 px-3 text-right font-mono ${
                                    row.tradeAmount < 0 ? "text-rose-300" : row.tradeAmount > 0 ? "text-emerald-300" : "text-slate-400"
                                  }`}
                                >
                                  {formatCurrency(row.tradeAmount)}
                                </td>
                                <td className="py-2 px-3 text-right font-mono text-slate-400">
                                  {formatPercent(row.currentWeight)}
                                </td>
                                <td className="py-2 px-3 text-right font-mono text-slate-400">
                                  {formatPercent(row.targetWeight)}
                                </td>
                                <td className="py-2 px-3 text-right font-mono text-slate-300">
                                  {formatPercent(row.tradeWeight)}
                                </td>
                                <td className="py-2 px-3 text-right">
                                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${rebalanceDirectionClass(row.direction)}`}>
                                    {rebalanceDirectionLabel(row.direction)}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <section className="rounded-md border border-slate-800 bg-slate-950/70 p-3 space-y-3">
                        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-3">
                          <div>
                            <h5 className="text-xs font-bold text-slate-100">交易執行清單</h5>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              再用最小交易金額過濾，形成可交給人工覆核的交易清單
                            </p>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-[170px_auto] gap-2 text-xs">
                            <label className="space-y-1">
                              <span className="text-slate-500">最小交易金額</span>
                              <input
                                type="number"
                                min={0}
                                step={1000}
                                value={minimumTradeAmount}
                                onChange={(event) => setMinimumTradeAmount(Math.max(0, Number(event.target.value) || 0))}
                                className="w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-right font-mono text-slate-100"
                              />
                            </label>
                            <button
                              onClick={handleExportTradeTicketCsv}
                              disabled={!tradeTickets.length}
                              className="sm:self-end px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold disabled:cursor-not-allowed disabled:bg-slate-950 disabled:text-slate-600"
                            >
                              交易 CSV
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                          {[
                            ["可執行", `${tradeTickets.length} 檔`],
                            ["低於門檻", `${Math.max(0, skippedTradeCount)} 檔`],
                            [
                              "買入合計",
                              formatCurrency(
                                tradeTickets
                                  .filter((row) => row.direction === "buy")
                                  .reduce((sum, row) => sum + row.ticketAmount, 0),
                              ),
                            ],
                            [
                              "現金淨額",
                              formatCurrency(tradeTickets.reduce((sum, row) => sum + row.cashImpact, 0)),
                            ],
                          ].map(([label, value]) => (
                            <div key={label} className="rounded-md border border-slate-800 bg-slate-900/70 p-3 min-w-0">
                              <p className="text-[11px] text-slate-600 truncate">{label}</p>
                              <p className="mt-1 font-mono text-sm font-bold text-slate-100 truncate" title={value}>
                                {value}
                              </p>
                            </div>
                          ))}
                        </div>

                        {tradeTickets.length ? (
                          <div className="overflow-x-auto rounded-md border border-slate-800">
                            <table className="w-full min-w-[860px] text-xs">
                              <thead>
                                <tr className="text-left text-[11px] text-slate-600">
                                  <th className="py-2 px-3 font-medium">Symbol</th>
                                  <th className="py-2 px-3 font-medium text-right">Action</th>
                                  <th className="py-2 px-3 font-medium text-right">Amount</th>
                                  <th className="py-2 px-3 font-medium text-right">Cash</th>
                                  <th className="py-2 px-3 font-medium text-right">Drift</th>
                                  <th className="py-2 px-3 font-medium text-right">Score</th>
                                  <th className="py-2 px-3 font-medium">Note</th>
                                </tr>
                              </thead>
                              <tbody>
                                {tradeTickets.slice(0, 12).map((row) => (
                                  <tr key={row.symbol} className="border-t border-slate-800/80">
                                    <td className="py-2 px-3 font-bold text-cyan-200">{row.symbol}</td>
                                    <td className="py-2 px-3 text-right">
                                      <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${rebalanceDirectionClass(row.direction)}`}>
                                        {rebalanceDirectionLabel(row.direction)}
                                      </span>
                                    </td>
                                    <td className="py-2 px-3 text-right font-mono text-slate-100">
                                      {formatCurrency(row.ticketAmount)}
                                    </td>
                                    <td
                                      className={`py-2 px-3 text-right font-mono ${
                                        row.cashImpact < 0 ? "text-rose-300" : "text-emerald-300"
                                      }`}
                                    >
                                      {formatCurrency(row.cashImpact)}
                                    </td>
                                    <td className="py-2 px-3 text-right font-mono text-slate-300">
                                      {formatPercent(row.tradeWeight)}
                                    </td>
                                    <td className="py-2 px-3 text-right font-mono text-slate-300">
                                      {row.score ?? "--"}
                                    </td>
                                    <td className="py-2 px-3 text-slate-500">{row.ticketNote}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="rounded-md border border-dashed border-slate-800 bg-slate-900/60 p-3 text-xs text-slate-500">
                            目前沒有超過最小交易金額的買賣項目。
                          </div>
                        )}

                        <div className="border-t border-slate-800 pt-3 space-y-3">
                          <div className="space-y-3">
                            <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-3">
                              <div>
                                <h5 className="text-xs font-bold text-slate-100">分批交易計畫</h5>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                  依單批金額與筆數限制，把交易清單拆成較容易執行與覆核的批次
                                </p>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-[170px_140px_auto] gap-2 text-xs">
                                <label className="space-y-1">
                                  <span className="text-slate-500">單批金額上限</span>
                                  <input
                                    type="number"
                                    min={0}
                                    step={10000}
                                    value={maximumBatchAmount}
                                    onChange={(event) => setMaximumBatchAmount(Math.max(0, Number(event.target.value) || 0))}
                                    className="w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-right font-mono text-slate-100"
                                  />
                                </label>
                                <label className="space-y-1">
                                  <span className="text-slate-500">每批筆數</span>
                                  <input
                                    type="number"
                                    min={1}
                                    max={20}
                                    step={1}
                                    value={maximumTicketsPerBatch}
                                    onChange={(event) => setMaximumTicketsPerBatch(Math.max(1, Math.floor(Number(event.target.value) || 1)))}
                                    className="w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-right font-mono text-slate-100"
                                  />
                                </label>
                                <button
                                  onClick={handleExportTradeBatchCsv}
                                  disabled={!tradeBatches.length}
                                  className="sm:self-end px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold disabled:cursor-not-allowed disabled:bg-slate-950 disabled:text-slate-600"
                                >
                                  批次 CSV
                                </button>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                              {[
                                ["批次數", `${tradeBatchCount} 批`],
                                ["最大單批", formatCurrency(maximumTradeBatchGross)],
                                ["首批現金", formatCurrency(firstTradeBatch?.batchCashImpact)],
                                ["平均單批", formatCurrency(averageTradeBatchGross)],
                              ].map(([label, value]) => (
                                <div key={label} className="rounded-md border border-slate-800 bg-slate-900/70 p-3 min-w-0">
                                  <p className="text-[11px] text-slate-600 truncate">{label}</p>
                                  <p className="mt-1 font-mono text-sm font-bold text-slate-100 truncate" title={value}>
                                    {value}
                                  </p>
                                </div>
                              ))}
                            </div>

                            {tradeBatches.length ? (
                              <div className="overflow-x-auto rounded-md border border-slate-800">
                                <table className="w-full min-w-[980px] text-xs">
                                  <thead>
                                    <tr className="text-left text-[11px] text-slate-600">
                                      <th className="py-2 px-3 font-medium text-right">Batch</th>
                                      <th className="py-2 px-3 font-medium text-right">Seq</th>
                                      <th className="py-2 px-3 font-medium">Symbol</th>
                                      <th className="py-2 px-3 font-medium text-right">Action</th>
                                      <th className="py-2 px-3 font-medium text-right">Amount</th>
                                      <th className="py-2 px-3 font-medium text-right">Batch Gross</th>
                                      <th className="py-2 px-3 font-medium text-right">Batch Cash</th>
                                      <th className="py-2 px-3 font-medium">Note</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {tradeBatches.slice(0, 16).map((row) => (
                                      <tr key={`${row.batchNumber}-${row.symbol}`} className="border-t border-slate-800/80">
                                        <td className="py-2 px-3 text-right font-mono text-cyan-200">{row.batchNumber}</td>
                                        <td className="py-2 px-3 text-right font-mono text-slate-500">{row.sequenceInBatch}</td>
                                        <td className="py-2 px-3 font-bold text-cyan-200">{row.symbol}</td>
                                        <td className="py-2 px-3 text-right">
                                          <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${rebalanceDirectionClass(row.direction)}`}>
                                            {rebalanceDirectionLabel(row.direction)}
                                          </span>
                                        </td>
                                        <td className="py-2 px-3 text-right font-mono text-slate-100">{formatCurrency(row.ticketAmount)}</td>
                                        <td className="py-2 px-3 text-right font-mono text-slate-300">{formatCurrency(row.batchGrossAmount)}</td>
                                        <td
                                          className={`py-2 px-3 text-right font-mono ${
                                            row.batchCashImpact < 0 ? "text-rose-300" : "text-emerald-300"
                                          }`}
                                        >
                                          {formatCurrency(row.batchCashImpact)}
                                        </td>
                                        <td className="py-2 px-3 text-slate-500">{row.batchNote}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <div className="rounded-md border border-dashed border-slate-800 bg-slate-900/60 p-3 text-xs text-slate-500">
                                交易清單建立後，這裡會依批次限制產生執行順序。
                              </div>
                            )}
                          </div>

                          <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-3">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <h5 className="text-xs font-bold text-slate-100">交易前檢核中心</h5>
                                <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${executionReviewBadgeClass(executionReviewDecision)}`}>
                                  {executionReviewLabel(executionReviewDecision)}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                將交易清單轉成可覆核的現金、集中度、資料新鮮度與壓力風險檢查
                              </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                              <span className="rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-slate-400">
                                暫停 {executionBlockCount} · 觀察 {executionWatchCount}
                              </span>
                              <button
                                onClick={handleExportExecutionReviewCsv}
                                disabled={!rebalanceRows.length}
                                className="px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold disabled:cursor-not-allowed disabled:bg-slate-950 disabled:text-slate-600"
                              >
                                檢核 CSV
                              </button>
                            </div>
                          </div>

                          <div className="overflow-x-auto">
                            <table className="w-full min-w-[900px] text-xs">
                              <thead>
                                <tr className="text-left text-[11px] text-slate-600">
                                  <th className="py-2 px-3 font-medium">項目</th>
                                  <th className="py-2 px-3 font-medium text-right">狀態</th>
                                  <th className="py-2 px-3 font-medium text-right">目前值</th>
                                  <th className="py-2 px-3 font-medium">門檻</th>
                                  <th className="py-2 px-3 font-medium">說明</th>
                                </tr>
                              </thead>
                              <tbody>
                                {executionReviewItems.map((item) => (
                                  <tr key={item.label} className={`border-t ${executionReviewRowClass(item.status)}`}>
                                    <td className="py-2 px-3 font-bold text-slate-100">{item.label}</td>
                                    <td className="py-2 px-3 text-right">
                                      <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${executionReviewBadgeClass(item.status)}`}>
                                        {executionReviewLabel(item.status)}
                                      </span>
                                    </td>
                                    <td className="py-2 px-3 text-right font-mono text-slate-200">{item.value}</td>
                                    <td className="py-2 px-3 text-slate-400">{item.threshold}</td>
                                    <td className="py-2 px-3 text-slate-500">{item.note}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          <div className="border-t border-slate-800 pt-3 space-y-3">
                            <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-3">
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <h5 className="text-xs font-bold text-slate-100">投資政策限制檢查</h5>
                                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${executionReviewBadgeClass(policyDecision)}`}>
                                    {executionReviewLabel(policyDecision)}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                  用政策上限檢查模型配置、交易幅度與資料新鮮度，作為送簽前的硬性控管
                                </p>
                              </div>
                              <div className="grid grid-cols-2 xl:grid-cols-[120px_120px_120px_110px_auto] gap-2 text-xs">
                                <label className="space-y-1">
                                  <span className="text-slate-500">單檔上限 %</span>
                                  <input
                                    type="number"
                                    min={1}
                                    max={100}
                                    step={1}
                                    value={policyMaxSingleWeightPercent}
                                    onChange={(event) => setPolicyMaxSingleWeightPercent(Math.min(100, Math.max(1, Number(event.target.value) || 1)))}
                                    className="w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-right font-mono text-slate-100"
                                  />
                                </label>
                                <label className="space-y-1">
                                  <span className="text-slate-500">波動上限 %</span>
                                  <input
                                    type="number"
                                    min={1}
                                    max={100}
                                    step={1}
                                    value={policyMaxVolatilityPercent}
                                    onChange={(event) => setPolicyMaxVolatilityPercent(Math.min(100, Math.max(1, Number(event.target.value) || 1)))}
                                    className="w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-right font-mono text-slate-100"
                                  />
                                </label>
                                <label className="space-y-1">
                                  <span className="text-slate-500">回撤限制 %</span>
                                  <input
                                    type="number"
                                    min={-90}
                                    max={0}
                                    step={1}
                                    value={policyMaxDrawdownPercent}
                                    onChange={(event) => {
                                      const nextValue = Number(event.target.value);
                                      setPolicyMaxDrawdownPercent(Math.min(0, Math.max(-90, Number.isFinite(nextValue) ? nextValue : -25)));
                                    }}
                                    className="w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-right font-mono text-slate-100"
                                  />
                                </label>
                                <label className="space-y-1">
                                  <span className="text-slate-500">最低分數</span>
                                  <input
                                    type="number"
                                    min={0}
                                    max={100}
                                    step={1}
                                    value={policyMinimumScore}
                                    onChange={(event) => setPolicyMinimumScore(Math.min(100, Math.max(0, Math.floor(Number(event.target.value) || 0))))}
                                    className="w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-right font-mono text-slate-100"
                                  />
                                </label>
                                <button
                                  onClick={handleExportPolicyLimitCsv}
                                  disabled={!rebalanceRows.length}
                                  className="col-span-2 xl:col-span-1 xl:self-end px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold disabled:cursor-not-allowed disabled:bg-slate-950 disabled:text-slate-600"
                                >
                                  政策 CSV
                                </button>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                              {[
                                ["政策狀態", executionReviewLabel(policyDecision)],
                                ["暫停項目", `${policyBlockCount} 項`],
                                ["觀察項目", `${policyWatchCount} 項`],
                                ["政策下限", `${policyMinimumScore} 分`],
                              ].map(([label, value]) => (
                                <div key={label} className="rounded-md border border-slate-800 bg-slate-900/70 p-3 min-w-0">
                                  <p className="text-[11px] text-slate-600 truncate">{label}</p>
                                  <p className="mt-1 font-mono text-sm font-bold text-slate-100 truncate" title={value}>
                                    {value}
                                  </p>
                                </div>
                              ))}
                            </div>

                            <div className="overflow-x-auto">
                              <table className="w-full min-w-[920px] text-xs">
                                <thead>
                                  <tr className="text-left text-[11px] text-slate-600">
                                    <th className="py-2 px-3 font-medium">項目</th>
                                    <th className="py-2 px-3 font-medium text-right">狀態</th>
                                    <th className="py-2 px-3 font-medium text-right">目前值</th>
                                    <th className="py-2 px-3 font-medium">政策限制</th>
                                    <th className="py-2 px-3 font-medium">說明</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {policyLimitItems.map((item) => (
                                    <tr key={item.label} className={`border-t ${executionReviewRowClass(item.status)}`}>
                                      <td className="py-2 px-3 font-bold text-slate-100">{item.label}</td>
                                      <td className="py-2 px-3 text-right">
                                        <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${executionReviewBadgeClass(item.status)}`}>
                                          {executionReviewLabel(item.status)}
                                        </span>
                                      </td>
                                      <td className="py-2 px-3 text-right font-mono text-slate-200">{item.value}</td>
                                      <td className="py-2 px-3 text-slate-400">{item.threshold}</td>
                                      <td className="py-2 px-3 text-slate-500">{item.note}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          <div className="border-t border-slate-800 pt-3 space-y-3">
                            <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-3">
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <h5 className="text-xs font-bold text-slate-100">交易後監控規則</h5>
                                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${executionReviewBadgeClass(monitoringDecision)}`}>
                                    {executionReviewLabel(monitoringDecision)}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                  把本次交易轉成後續追蹤條件，避免執行後沒有回看機制
                                </p>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-[120px_140px_auto] gap-2 text-xs">
                                <label className="space-y-1">
                                  <span className="text-slate-500">監控天數</span>
                                  <input
                                    type="number"
                                    min={1}
                                    max={90}
                                    step={1}
                                    value={monitoringHorizonDays}
                                    onChange={(event) => setMonitoringHorizonDays(Math.min(90, Math.max(1, Math.floor(Number(event.target.value) || 1))))}
                                    className="w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-right font-mono text-slate-100"
                                  />
                                </label>
                                <label className="space-y-1">
                                  <span className="text-slate-500">回撤警戒 %</span>
                                  <input
                                    type="number"
                                    min={-80}
                                    max={0}
                                    step={1}
                                    value={monitoringDrawdownAlertPercent}
                                    onChange={(event) => {
                                      const nextValue = Number(event.target.value);
                                      setMonitoringDrawdownAlertPercent(Math.min(0, Math.max(-80, Number.isFinite(nextValue) ? nextValue : -8)));
                                    }}
                                    className="w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-right font-mono text-slate-100"
                                  />
                                </label>
                                <button
                                  onClick={handleExportMonitoringRulesCsv}
                                  disabled={!rebalanceRows.length}
                                  className="sm:self-end px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold disabled:cursor-not-allowed disabled:bg-slate-950 disabled:text-slate-600"
                                >
                                  監控 CSV
                                </button>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                              {[
                                ["監控狀態", executionReviewLabel(monitoringDecision)],
                                ["警戒項目", `${monitoringAlertCount} 項`],
                                ["觀察項目", `${monitoringWatchCount} 項`],
                                ["監控週期", `T+${monitoringHorizonDays}`],
                              ].map(([label, value]) => (
                                <div key={label} className="rounded-md border border-slate-800 bg-slate-900/70 p-3 min-w-0">
                                  <p className="text-[11px] text-slate-600 truncate">{label}</p>
                                  <p className="mt-1 font-mono text-sm font-bold text-slate-100 truncate" title={value}>
                                    {value}
                                  </p>
                                </div>
                              ))}
                            </div>

                            <div className="overflow-x-auto">
                              <table className="w-full min-w-[920px] text-xs">
                                <thead>
                                  <tr className="text-left text-[11px] text-slate-600">
                                    <th className="py-2 px-3 font-medium">項目</th>
                                    <th className="py-2 px-3 font-medium text-right">狀態</th>
                                    <th className="py-2 px-3 font-medium text-right">目前值</th>
                                    <th className="py-2 px-3 font-medium">觸發條件</th>
                                    <th className="py-2 px-3 font-medium">後續動作</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {monitoringRules.map((item) => (
                                    <tr key={item.label} className={`border-t ${executionReviewRowClass(item.status)}`}>
                                      <td className="py-2 px-3 font-bold text-slate-100">{item.label}</td>
                                      <td className="py-2 px-3 text-right">
                                        <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${executionReviewBadgeClass(item.status)}`}>
                                          {executionReviewLabel(item.status)}
                                        </span>
                                      </td>
                                      <td className="py-2 px-3 text-right font-mono text-slate-200">{item.value}</td>
                                      <td className="py-2 px-3 text-slate-400">{item.threshold}</td>
                                      <td className="py-2 px-3 text-slate-500">{item.note}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          <div className="border-t border-slate-800 pt-3 space-y-3">
                            <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-3">
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <h5 className="text-xs font-bold text-slate-100">投委會簽核摘要</h5>
                                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${executionReviewBadgeClass(committeeDecisionStatus(committeeDecision))}`}>
                                    {committeeDecisionLabel(committeeDecision)}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                  將交易前檢核與交易後監控合併成可送簽的最終決策摘要
                                </p>
                              </div>
                              <button
                                onClick={handleExportCommitteeApprovalCsv}
                                disabled={!rebalanceRows.length}
                                className="px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-bold disabled:cursor-not-allowed disabled:bg-slate-950 disabled:text-slate-600"
                              >
                                簽核 CSV
                              </button>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                              {[
                                ["簽核建議", committeeDecisionLabel(committeeDecision)],
                                ["暫停項目", `${committeeBlockCount} 項`],
                                ["觀察項目", `${committeeWatchCount} 項`],
                                ["送簽交易", `${tradeTickets.length} 檔`],
                              ].map(([label, value]) => (
                                <div key={label} className="rounded-md border border-slate-800 bg-slate-900/70 p-3 min-w-0">
                                  <p className="text-[11px] text-slate-600 truncate">{label}</p>
                                  <p className="mt-1 font-mono text-sm font-bold text-slate-100 truncate" title={value}>
                                    {value}
                                  </p>
                                </div>
                              ))}
                            </div>

                            <div className="overflow-x-auto">
                              <table className="w-full min-w-[920px] text-xs">
                                <thead>
                                  <tr className="text-left text-[11px] text-slate-600">
                                    <th className="py-2 px-3 font-medium">項目</th>
                                    <th className="py-2 px-3 font-medium text-right">狀態</th>
                                    <th className="py-2 px-3 font-medium text-right">目前值</th>
                                    <th className="py-2 px-3 font-medium">門檻</th>
                                    <th className="py-2 px-3 font-medium">說明</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {committeeApprovalItems.map((item) => (
                                    <tr key={item.label} className={`border-t ${executionReviewRowClass(item.status)}`}>
                                      <td className="py-2 px-3 font-bold text-slate-100">{item.label}</td>
                                      <td className="py-2 px-3 text-right">
                                        <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${executionReviewBadgeClass(item.status)}`}>
                                          {executionReviewLabel(item.status)}
                                        </span>
                                      </td>
                                      <td className="py-2 px-3 text-right font-mono text-slate-200">{item.value}</td>
                                      <td className="py-2 px-3 text-slate-400">{item.threshold}</td>
                                      <td className="py-2 px-3 text-slate-500">{item.note}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          <div className="border-t border-slate-800 pt-3 space-y-3">
                            <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-3">
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <h5 className="text-xs font-bold text-slate-100">決策包稽核紀錄</h5>
                                  <span className="rounded px-2 py-0.5 text-[10px] font-bold bg-cyan-500/10 text-cyan-200 border border-cyan-500/30">
                                    {decisionAuditId}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                  將本次政策、簽核、交易清單與版本時間整理成可追蹤紀錄
                                </p>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-[140px_140px_auto_auto] gap-2 text-xs">
                                <label className="space-y-1">
                                  <span className="text-slate-500">決策人</span>
                                  <input
                                    type="text"
                                    value={decisionOwner}
                                    onChange={(event) => setDecisionOwner(event.target.value)}
                                    className="w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-slate-100"
                                  />
                                </label>
                                <label className="space-y-1">
                                  <span className="text-slate-500">簽核單位</span>
                                  <input
                                    type="text"
                                    value={decisionApprover}
                                    onChange={(event) => setDecisionApprover(event.target.value)}
                                    className="w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-slate-100"
                                  />
                                </label>
                                <button
                                  onClick={() => setDecisionGeneratedAt(new Date().toISOString())}
                                  className="sm:self-end px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold"
                                >
                                  刷新版本
                                </button>
                                <button
                                  onClick={handleExportDecisionAuditCsv}
                                  className="sm:self-end px-3 py-2 rounded-md bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-100 font-bold"
                                >
                                  稽核 CSV
                                </button>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                              {[
                                ["決策包", decisionAuditId],
                                ["版本時間", decisionAuditGeneratedText],
                                ["決策人", decisionOwner.trim() || "--"],
                                ["簽核單位", decisionApprover.trim() || "--"],
                              ].map(([label, value]) => (
                                <div key={label} className="rounded-md border border-slate-800 bg-slate-900/70 p-3 min-w-0">
                                  <p className="text-[11px] text-slate-600 truncate">{label}</p>
                                  <p className="mt-1 font-mono text-sm font-bold text-slate-100 truncate" title={value}>
                                    {value}
                                  </p>
                                </div>
                              ))}
                            </div>

                            <div className="overflow-x-auto">
                              <table className="w-full min-w-[860px] text-xs">
                                <thead>
                                  <tr className="text-left text-[11px] text-slate-600">
                                    <th className="py-2 px-3 font-medium">欄位</th>
                                    <th className="py-2 px-3 font-medium">值</th>
                                    <th className="py-2 px-3 font-medium">說明</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {decisionAuditRecords.map((item) => (
                                    <tr key={item.label} className="border-t border-slate-900">
                                      <td className="py-2 px-3 font-bold text-slate-100">{item.label}</td>
                                      <td className="py-2 px-3 font-mono text-slate-200">{item.value}</td>
                                      <td className="py-2 px-3 text-slate-500">{item.note}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          <div className="border-t border-slate-800 pt-3 space-y-3">
                            <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-3">
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <h5 className="text-xs font-bold text-slate-100">執行交接清單</h5>
                                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${executionReviewBadgeClass(handoffBlockCount > 0 ? "block" : handoffWatchCount > 0 ? "watch" : "pass")}`}>
                                    暫停 {handoffBlockCount} / 觀察 {handoffWatchCount}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                  將簽核後的交易、風控與結算事項轉成可交接的任務清單
                                </p>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-[120px_120px_120px_100px_auto] gap-2 text-xs">
                                <label className="space-y-1">
                                  <span className="text-slate-500">交易負責人</span>
                                  <input
                                    type="text"
                                    value={executionOwner}
                                    onChange={(event) => setExecutionOwner(event.target.value)}
                                    className="w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-slate-100"
                                  />
                                </label>
                                <label className="space-y-1">
                                  <span className="text-slate-500">風控負責人</span>
                                  <input
                                    type="text"
                                    value={riskOwner}
                                    onChange={(event) => setRiskOwner(event.target.value)}
                                    className="w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-slate-100"
                                  />
                                </label>
                                <label className="space-y-1">
                                  <span className="text-slate-500">中台負責人</span>
                                  <input
                                    type="text"
                                    value={settlementOwner}
                                    onChange={(event) => setSettlementOwner(event.target.value)}
                                    className="w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-slate-100"
                                  />
                                </label>
                                <label className="space-y-1">
                                  <span className="text-slate-500">追蹤天數</span>
                                  <input
                                    type="number"
                                    min={1}
                                    max={30}
                                    step={1}
                                    value={handoffDueDays}
                                    onChange={(event) => setHandoffDueDays(Math.min(30, Math.max(1, Math.floor(Number(event.target.value) || 1))))}
                                    className="w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-right font-mono text-slate-100"
                                  />
                                </label>
                                <button
                                  onClick={handleExportExecutionHandoffCsv}
                                  className="sm:col-span-2 xl:col-span-1 xl:self-end px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold"
                                >
                                  交接 CSV
                                </button>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                              {[
                                ["任務數", `${executionHandoffItems.length} 項`],
                                ["高優先", `${handoffHighPriorityCount} 項`],
                                ["交易負責", executionOwner.trim() || "--"],
                                ["追蹤期限", `T+${handoffDueDays}`],
                              ].map(([label, value]) => (
                                <div key={label} className="rounded-md border border-slate-800 bg-slate-900/70 p-3 min-w-0">
                                  <p className="text-[11px] text-slate-600 truncate">{label}</p>
                                  <p className="mt-1 font-mono text-sm font-bold text-slate-100 truncate" title={value}>
                                    {value}
                                  </p>
                                </div>
                              ))}
                            </div>

                            <div className="overflow-x-auto">
                              <table className="w-full min-w-[1040px] text-xs">
                                <thead>
                                  <tr className="text-left text-[11px] text-slate-600">
                                    <th className="py-2 px-3 font-medium">負責人</th>
                                    <th className="py-2 px-3 font-medium">任務</th>
                                    <th className="py-2 px-3 font-medium text-right">優先級</th>
                                    <th className="py-2 px-3 font-medium text-right">期限</th>
                                    <th className="py-2 px-3 font-medium text-right">狀態</th>
                                    <th className="py-2 px-3 font-medium">依據</th>
                                    <th className="py-2 px-3 font-medium">說明</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {executionHandoffItems.map((item) => (
                                    <tr key={`${item.owner}-${item.task}`} className={`border-t ${executionReviewRowClass(item.status)}`}>
                                      <td className="py-2 px-3 font-bold text-slate-100">{item.owner}</td>
                                      <td className="py-2 px-3 text-slate-200">{item.task}</td>
                                      <td className="py-2 px-3 text-right">
                                        <span className={`rounded border px-2 py-0.5 text-[10px] font-bold ${executionHandoffPriorityClass(item.priority)}`}>
                                          {executionHandoffPriorityLabel(item.priority)}
                                        </span>
                                      </td>
                                      <td className="py-2 px-3 text-right font-mono text-slate-300">{item.due}</td>
                                      <td className="py-2 px-3 text-right">
                                        <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${executionReviewBadgeClass(item.status)}`}>
                                          {executionReviewLabel(item.status)}
                                        </span>
                                      </td>
                                      <td className="py-2 px-3 font-mono text-slate-400">{item.evidence}</td>
                                      <td className="py-2 px-3 text-slate-500">{item.note}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          <div className="border-t border-slate-800 pt-3 space-y-3">
                            <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-3">
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <h5 className="text-xs font-bold text-slate-100">成交回報與滑價分析</h5>
                                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${executionReviewBadgeClass(executionFillDecision)}`}>
                                    {executionReviewLabel(executionFillDecision)}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                  以交易清單估算成交金額、未成交金額、滑價成本、手續費與成交後現金影響
                                </p>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-[110px_110px_110px_auto] gap-2 text-xs">
                                <label className="space-y-1">
                                  <span className="text-slate-500">成交率 %</span>
                                  <input
                                    type="number"
                                    min={0}
                                    max={100}
                                    step={1}
                                    value={fillCompletionPercent}
                                    onChange={(event) => setFillCompletionPercent(Math.min(100, Math.max(0, Math.floor(Number(event.target.value) || 0))))}
                                    className="w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-right font-mono text-slate-100"
                                  />
                                </label>
                                <label className="space-y-1">
                                  <span className="text-slate-500">滑價 bps</span>
                                  <input
                                    type="number"
                                    min={0}
                                    max={200}
                                    step={0.5}
                                    value={fillSlippageBps}
                                    onChange={(event) => setFillSlippageBps(Math.min(200, Math.max(0, Number(event.target.value) || 0)))}
                                    className="w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-right font-mono text-slate-100"
                                  />
                                </label>
                                <label className="space-y-1">
                                  <span className="text-slate-500">手續費 bps</span>
                                  <input
                                    type="number"
                                    min={0}
                                    max={200}
                                    step={0.5}
                                    value={fillCommissionBps}
                                    onChange={(event) => setFillCommissionBps(Math.min(200, Math.max(0, Number(event.target.value) || 0)))}
                                    className="w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-right font-mono text-slate-100"
                                  />
                                </label>
                                <button
                                  onClick={handleExportExecutionFillCsv}
                                  disabled={!executionFillRows.length}
                                  className="sm:col-span-2 xl:col-span-1 xl:self-end px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold disabled:cursor-not-allowed disabled:bg-slate-950 disabled:text-slate-600"
                                >
                                  成交 CSV
                                </button>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                              {[
                                ["成交金額", formatCurrency(totalFilledNotional)],
                                ["未成交", formatCurrency(totalUnfilledNotional)],
                                ["總成本", formatCurrency(totalExecutionCost)],
                                ["成交後現金", formatCurrency(totalCashImpactAfterCost)],
                              ].map(([label, value]) => (
                                <div key={label} className="rounded-md border border-slate-800 bg-slate-900/70 p-3 min-w-0">
                                  <p className="text-[11px] text-slate-600 truncate">{label}</p>
                                  <p className="mt-1 font-mono text-sm font-bold text-slate-100 truncate" title={value}>
                                    {value}
                                  </p>
                                </div>
                              ))}
                            </div>

                            <div className="overflow-x-auto">
                              <table className="w-full min-w-[1080px] text-xs">
                                <thead>
                                  <tr className="text-left text-[11px] text-slate-600">
                                    <th className="py-2 px-3 font-medium">商品</th>
                                    <th className="py-2 px-3 font-medium">動作</th>
                                    <th className="py-2 px-3 font-medium text-right">目標金額</th>
                                    <th className="py-2 px-3 font-medium text-right">成交金額</th>
                                    <th className="py-2 px-3 font-medium text-right">未成交</th>
                                    <th className="py-2 px-3 font-medium text-right">成本</th>
                                    <th className="py-2 px-3 font-medium text-right">成交後現金</th>
                                    <th className="py-2 px-3 font-medium text-right">狀態</th>
                                    <th className="py-2 px-3 font-medium">說明</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {executionFillRows.map((row) => (
                                    <tr key={`${row.symbol}-${row.direction}-fill`} className={`border-t ${executionReviewRowClass(row.fillStatus)}`}>
                                      <td className="py-2 px-3 font-bold text-slate-100">{row.symbol}</td>
                                      <td className="py-2 px-3 text-slate-300">{rebalanceDirectionLabel(row.direction)}</td>
                                      <td className="py-2 px-3 text-right font-mono text-slate-300">{formatCurrency(row.ticketAmount)}</td>
                                      <td className="py-2 px-3 text-right font-mono text-slate-100">{formatCurrency(row.filledNotional)}</td>
                                      <td className="py-2 px-3 text-right font-mono text-amber-200">{formatCurrency(row.unfilledNotional)}</td>
                                      <td className="py-2 px-3 text-right font-mono text-rose-200">{formatCurrency(row.totalCost)}</td>
                                      <td className="py-2 px-3 text-right font-mono text-slate-200">{formatCurrency(row.cashImpactAfterCost)}</td>
                                      <td className="py-2 px-3 text-right">
                                        <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${executionReviewBadgeClass(row.fillStatus)}`}>
                                          {executionReviewLabel(row.fillStatus)}
                                        </span>
                                      </td>
                                      <td className="py-2 px-3 text-slate-500">{row.fillNote}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          <div className="border-t border-slate-800 pt-3 space-y-3">
                            <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-3">
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <h5 className="text-xs font-bold text-slate-100">交易後績效歸因</h5>
                                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${executionReviewBadgeClass(postTradeDecision)}`}>
                                    {executionReviewLabel(postTradeDecision)}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                  將成交率、殘單、成本、現金偏差與未成交市場曝險整理成復盤指標
                                </p>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-[120px_140px_auto] gap-2 text-xs">
                                <label className="space-y-1">
                                  <span className="text-slate-500">復盤天數</span>
                                  <input
                                    type="number"
                                    min={1}
                                    max={60}
                                    step={1}
                                    value={postTradeReviewDays}
                                    onChange={(event) => setPostTradeReviewDays(Math.min(60, Math.max(1, Math.floor(Number(event.target.value) || 1))))}
                                    className="w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-right font-mono text-slate-100"
                                  />
                                </label>
                                <label className="space-y-1">
                                  <span className="text-slate-500">市場變動 %</span>
                                  <input
                                    type="number"
                                    min={-30}
                                    max={30}
                                    step={0.5}
                                    value={postTradeBenchmarkMovePercent}
                                    onChange={(event) => {
                                      const nextValue = Number(event.target.value);
                                      setPostTradeBenchmarkMovePercent(Math.min(30, Math.max(-30, Number.isFinite(nextValue) ? nextValue : 0)));
                                    }}
                                    className="w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-right font-mono text-slate-100"
                                  />
                                </label>
                                <button
                                  onClick={handleExportPostTradeAttributionCsv}
                                  disabled={!postTradeAttributionRows.length}
                                  className="sm:self-end px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold disabled:cursor-not-allowed disabled:bg-slate-950 disabled:text-slate-600"
                                >
                                  歸因 CSV
                                </button>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                              {[
                                ["復盤狀態", executionReviewLabel(postTradeDecision)],
                                ["阻擋 / 觀察", `${postTradeBlockCount} / ${postTradeWatchCount}`],
                                ["殘單曝險", formatCurrency(postTradeResidualMarketImpact)],
                                ["復盤週期", `T+${postTradeReviewDays}`],
                              ].map(([label, value]) => (
                                <div key={label} className="rounded-md border border-slate-800 bg-slate-900/70 p-3 min-w-0">
                                  <p className="text-[11px] text-slate-600 truncate">{label}</p>
                                  <p className="mt-1 font-mono text-sm font-bold text-slate-100 truncate" title={value}>
                                    {value}
                                  </p>
                                </div>
                              ))}
                            </div>

                            <div className="overflow-x-auto">
                              <table className="w-full min-w-[980px] text-xs">
                                <thead>
                                  <tr className="text-left text-[11px] text-slate-600">
                                    <th className="py-2 px-3 font-medium">項目</th>
                                    <th className="py-2 px-3 font-medium text-right">狀態</th>
                                    <th className="py-2 px-3 font-medium text-right">目前值</th>
                                    <th className="py-2 px-3 font-medium">門檻</th>
                                    <th className="py-2 px-3 font-medium">說明</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {postTradeAttributionRows.map((item) => (
                                    <tr key={item.label} className={`border-t ${executionReviewRowClass(item.status)}`}>
                                      <td className="py-2 px-3 font-bold text-slate-100">{item.label}</td>
                                      <td className="py-2 px-3 text-right">
                                        <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${executionReviewBadgeClass(item.status)}`}>
                                          {executionReviewLabel(item.status)}
                                        </span>
                                      </td>
                                      <td className="py-2 px-3 text-right font-mono text-slate-200">{item.value}</td>
                                      <td className="py-2 px-3 text-slate-400">{item.threshold}</td>
                                      <td className="py-2 px-3 text-slate-500">{item.note}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          <div className="border-t border-slate-800 pt-3 space-y-3">
                            <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-3">
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <h5 className="text-xs font-bold text-slate-100">例外事項總控台</h5>
                                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${executionReviewBadgeClass(platformExceptionDecision)}`}>
                                    {executionReviewLabel(platformExceptionDecision)}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                  將政策、簽核、交接、成交與復盤的觀察/暫停項目集中成 Action Queue
                                </p>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-[120px_auto] gap-2 text-xs">
                                <label className="space-y-1">
                                  <span className="text-slate-500">處理期限</span>
                                  <input
                                    type="number"
                                    min={1}
                                    max={30}
                                    step={1}
                                    value={exceptionDueDays}
                                    onChange={(event) => setExceptionDueDays(Math.min(30, Math.max(1, Math.floor(Number(event.target.value) || 1))))}
                                    className="w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-right font-mono text-slate-100"
                                  />
                                </label>
                                <button
                                  onClick={handleExportPlatformExceptionCsv}
                                  disabled={!platformExceptionItems.length}
                                  className="sm:self-end px-3 py-2 rounded-md bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-100 font-bold disabled:cursor-not-allowed disabled:bg-slate-950 disabled:text-slate-600"
                                >
                                  例外 CSV
                                </button>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                              {[
                                ["待處理", `${platformExceptionItems.length} 項`],
                                ["高優先", `${platformExceptionHighPriorityCount} 項`],
                                ["暫停 / 觀察", `${platformExceptionBlockCount} / ${platformExceptionWatchCount}`],
                                ["期限", `T+${exceptionDueDays}`],
                              ].map(([label, value]) => (
                                <div key={label} className="rounded-md border border-slate-800 bg-slate-900/70 p-3 min-w-0">
                                  <p className="text-[11px] text-slate-600 truncate">{label}</p>
                                  <p className="mt-1 font-mono text-sm font-bold text-slate-100 truncate" title={value}>
                                    {value}
                                  </p>
                                </div>
                              ))}
                            </div>

                            {platformExceptionItems.length ? (
                              <div className="overflow-x-auto">
                                <table className="w-full min-w-[1120px] text-xs">
                                  <thead>
                                    <tr className="text-left text-[11px] text-slate-600">
                                      <th className="py-2 px-3 font-medium">來源</th>
                                      <th className="py-2 px-3 font-medium">負責人</th>
                                      <th className="py-2 px-3 font-medium">項目</th>
                                      <th className="py-2 px-3 font-medium text-right">優先級</th>
                                      <th className="py-2 px-3 font-medium text-right">期限</th>
                                      <th className="py-2 px-3 font-medium text-right">狀態</th>
                                      <th className="py-2 px-3 font-medium">依據</th>
                                      <th className="py-2 px-3 font-medium">下一步</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {platformExceptionItems.map((item) => (
                                      <tr key={`${item.source}-${item.item}-${item.owner}`} className={`border-t ${executionReviewRowClass(item.status)}`}>
                                        <td className="py-2 px-3 font-bold text-slate-100">{item.source}</td>
                                        <td className="py-2 px-3 text-slate-300">{item.owner}</td>
                                        <td className="py-2 px-3 text-slate-200">{item.item}</td>
                                        <td className="py-2 px-3 text-right">
                                          <span className={`rounded border px-2 py-0.5 text-[10px] font-bold ${executionHandoffPriorityClass(item.priority)}`}>
                                            {executionHandoffPriorityLabel(item.priority)}
                                          </span>
                                        </td>
                                        <td className="py-2 px-3 text-right font-mono text-slate-300">{item.due}</td>
                                        <td className="py-2 px-3 text-right">
                                          <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${executionReviewBadgeClass(item.status)}`}>
                                            {executionReviewLabel(item.status)}
                                          </span>
                                        </td>
                                        <td className="py-2 px-3 font-mono text-slate-400">{item.evidence}</td>
                                        <td className="py-2 px-3 text-slate-500">{item.nextAction}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <div className="rounded-md border border-emerald-500/20 bg-emerald-950/10 p-3 text-xs text-emerald-200">
                                目前沒有待處理例外事項。
                              </div>
                            )}
                          </div>

                          <div className="border-t border-slate-800 pt-3 space-y-3">
                            <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-3">
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <h5 className="text-xs font-bold text-slate-100">CIO 營運總覽</h5>
                                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${executionReviewBadgeClass(cioOperatingDecision)}`}>
                                    {executionReviewLabel(cioOperatingDecision)}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                  將資料、研究、配置、交易、成交、復盤與例外事項整合成高層決策摘要
                                </p>
                              </div>
                              <button
                                onClick={handleExportCioOperatingBriefCsv}
                                disabled={!cioOperatingBriefItems.length}
                                className="px-3 py-2 rounded-md bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-100 text-xs font-bold disabled:cursor-not-allowed disabled:bg-slate-950 disabled:text-slate-600"
                              >
                                CIO CSV
                              </button>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                              {[
                                ["總覽狀態", executionReviewLabel(cioOperatingDecision)],
                                ["候選標的", `${candidateVisibleCount} 檔`],
                                ["送簽交易", `${tradeTickets.length} 檔`],
                                ["待處理例外", `${platformExceptionItems.length} 項`],
                              ].map(([label, value]) => (
                                <div key={label} className="rounded-md border border-slate-800 bg-slate-900/70 p-3 min-w-0">
                                  <p className="text-[11px] text-slate-600 truncate">{label}</p>
                                  <p className="mt-1 font-mono text-sm font-bold text-slate-100 truncate" title={value}>
                                    {value}
                                  </p>
                                </div>
                              ))}
                            </div>

                            <div className="overflow-x-auto">
                              <table className="w-full min-w-[980px] text-xs">
                                <thead>
                                  <tr className="text-left text-[11px] text-slate-600">
                                    <th className="py-2 px-3 font-medium">項目</th>
                                    <th className="py-2 px-3 font-medium text-right">狀態</th>
                                    <th className="py-2 px-3 font-medium text-right">目前值</th>
                                    <th className="py-2 px-3 font-medium">門檻</th>
                                    <th className="py-2 px-3 font-medium">下一步</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {cioOperatingBriefItems.map((item) => (
                                    <tr key={item.label} className={`border-t ${executionReviewRowClass(item.status)}`}>
                                      <td className="py-2 px-3 font-bold text-slate-100">{item.label}</td>
                                      <td className="py-2 px-3 text-right">
                                        <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${executionReviewBadgeClass(item.status)}`}>
                                          {executionReviewLabel(item.status)}
                                        </span>
                                      </td>
                                      <td className="py-2 px-3 text-right font-mono text-slate-200">{item.value}</td>
                                      <td className="py-2 px-3 text-slate-400">{item.threshold}</td>
                                      <td className="py-2 px-3 text-slate-500">{item.note}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          <div className="border-t border-slate-800 pt-3 space-y-3">
                            <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-3">
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <h5 className="text-xs font-bold text-slate-100">SLA 升級矩陣</h5>
                                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${executionReviewBadgeClass(slaEscalationDecision)}`}>
                                    {executionReviewLabel(slaEscalationDecision)}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                  將例外事項與 CIO 狀態轉成處理時限、升級路徑與責任人
                                </p>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-[100px_100px_auto] gap-2 text-xs">
                                <label className="space-y-1">
                                  <span className="text-slate-500">L1 小時</span>
                                  <input
                                    type="number"
                                    min={1}
                                    max={168}
                                    step={1}
                                    value={slaCriticalHours}
                                    onChange={(event) => setSlaCriticalHours(Math.min(168, Math.max(1, Math.floor(Number(event.target.value) || 1))))}
                                    className="w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-right font-mono text-slate-100"
                                  />
                                </label>
                                <label className="space-y-1">
                                  <span className="text-slate-500">L2 小時</span>
                                  <input
                                    type="number"
                                    min={1}
                                    max={336}
                                    step={1}
                                    value={slaReviewHours}
                                    onChange={(event) => setSlaReviewHours(Math.min(336, Math.max(1, Math.floor(Number(event.target.value) || 1))))}
                                    className="w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-right font-mono text-slate-100"
                                  />
                                </label>
                                <button
                                  onClick={handleExportSlaEscalationCsv}
                                  disabled={!slaEscalationItems.length}
                                  className="sm:self-end px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold disabled:cursor-not-allowed disabled:bg-slate-950 disabled:text-slate-600"
                                >
                                  SLA CSV
                                </button>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                              {[
                                ["升級項目", `${slaEscalationItems.length} 項`],
                                ["L1 立即", `${slaCriticalCount} 項`],
                                ["L2 覆核", `${slaReviewCount} 項`],
                                ["升級狀態", executionReviewLabel(slaEscalationDecision)],
                              ].map(([label, value]) => (
                                <div key={label} className="rounded-md border border-slate-800 bg-slate-900/70 p-3 min-w-0">
                                  <p className="text-[11px] text-slate-600 truncate">{label}</p>
                                  <p className="mt-1 font-mono text-sm font-bold text-slate-100 truncate" title={value}>
                                    {value}
                                  </p>
                                </div>
                              ))}
                            </div>

                            <div className="overflow-x-auto">
                              <table className="w-full min-w-[1100px] text-xs">
                                <thead>
                                  <tr className="text-left text-[11px] text-slate-600">
                                    <th className="py-2 px-3 font-medium">層級</th>
                                    <th className="py-2 px-3 font-medium">負責人</th>
                                    <th className="py-2 px-3 font-medium">觸發項</th>
                                    <th className="py-2 px-3 font-medium text-right">優先級</th>
                                    <th className="py-2 px-3 font-medium text-right">時限</th>
                                    <th className="py-2 px-3 font-medium text-right">狀態</th>
                                    <th className="py-2 px-3 font-medium">升級路徑</th>
                                    <th className="py-2 px-3 font-medium">動作</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {slaEscalationItems.map((item) => (
                                    <tr key={`${item.tier}-${item.trigger}-${item.owner}`} className={`border-t ${executionReviewRowClass(item.status)}`}>
                                      <td className="py-2 px-3 font-bold text-slate-100">{slaEscalationTierLabel(item.tier)}</td>
                                      <td className="py-2 px-3 text-slate-300">{item.owner}</td>
                                      <td className="py-2 px-3 text-slate-200">{item.trigger}</td>
                                      <td className="py-2 px-3 text-right">
                                        <span className={`rounded border px-2 py-0.5 text-[10px] font-bold ${executionHandoffPriorityClass(item.priority)}`}>
                                          {executionHandoffPriorityLabel(item.priority)}
                                        </span>
                                      </td>
                                      <td className="py-2 px-3 text-right font-mono text-slate-300">{item.due}</td>
                                      <td className="py-2 px-3 text-right">
                                        <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${executionReviewBadgeClass(item.status)}`}>
                                          {executionReviewLabel(item.status)}
                                        </span>
                                      </td>
                                      <td className="py-2 px-3 text-slate-400">{item.escalationPath}</td>
                                      <td className="py-2 px-3 text-slate-500">{item.action}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          <div className="border-t border-slate-800 pt-3 space-y-3">
                            <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-3">
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <h5 className="text-xs font-bold text-slate-100">營運 KRI 指標板</h5>
                                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${executionReviewBadgeClass(operatingKriDecision)}`}>
                                    {executionReviewLabel(operatingKriDecision)}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                  把資料品質、壓力損失、殘單、成本、例外、SLA 與投後復盤整理成營運風險指標
                                </p>
                              </div>
                              <button
                                onClick={handleExportOperatingKriCsv}
                                disabled={!operatingKriItems.length}
                                className="px-3 py-2 rounded-md bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-100 text-xs font-bold disabled:cursor-not-allowed disabled:bg-slate-950 disabled:text-slate-600"
                              >
                                KRI CSV
                              </button>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                              {[
                                ["KRI 狀態", executionReviewLabel(operatingKriDecision)],
                                ["暫停 / 觀察", `${operatingKriBlockCount} / ${operatingKriWatchCount}`],
                                [
                                  "交易成本",
                                  `${formatCurrency(totalExecutionCost)} / ${formatBps(totalFilledNotional > 0 ? (totalExecutionCost / totalFilledNotional) * 10000 : null)}`,
                                ],
                                ["未成交", formatCurrency(totalUnfilledNotional)],
                              ].map(([label, value]) => (
                                <div key={label} className="rounded-md border border-slate-800 bg-slate-900/70 p-3 min-w-0">
                                  <p className="text-[11px] text-slate-600 truncate">{label}</p>
                                  <p className="mt-1 font-mono text-sm font-bold text-slate-100 truncate" title={value}>
                                    {value}
                                  </p>
                                </div>
                              ))}
                            </div>

                            <div className="overflow-x-auto">
                              <table className="w-full min-w-[1050px] text-xs">
                                <thead>
                                  <tr className="text-left text-[11px] text-slate-600">
                                    <th className="py-2 px-3 font-medium">指標</th>
                                    <th className="py-2 px-3 font-medium text-right">狀態</th>
                                    <th className="py-2 px-3 font-medium text-right">目前值</th>
                                    <th className="py-2 px-3 font-medium">門檻</th>
                                    <th className="py-2 px-3 font-medium">負責人</th>
                                    <th className="py-2 px-3 font-medium">說明</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {operatingKriItems.map((item) => (
                                    <tr key={item.label} className={`border-t ${executionReviewRowClass(item.status)}`}>
                                      <td className="py-2 px-3 font-bold text-slate-100">{item.label}</td>
                                      <td className="py-2 px-3 text-right">
                                        <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${executionReviewBadgeClass(item.status)}`}>
                                          {executionReviewLabel(item.status)}
                                        </span>
                                      </td>
                                      <td className="py-2 px-3 text-right font-mono text-slate-200">{item.value}</td>
                                      <td className="py-2 px-3 text-slate-400">{item.limit}</td>
                                      <td className="py-2 px-3 text-slate-300">{item.owner}</td>
                                      <td className="py-2 px-3 text-slate-500">{item.note}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          <div className="border-t border-slate-800 pt-3 space-y-3">
                            <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-3">
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <h5 className="text-xs font-bold text-slate-100">資料到交易決策漏斗</h5>
                                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${executionReviewBadgeClass(decisionFunnelDecision)}`}>
                                    {executionReviewLabel(decisionFunnelDecision)}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                  從 BigQuery 商品池一路追蹤到研究、配置、交易、成交、KRI 放行與例外關閉
                                </p>
                              </div>
                              <button
                                onClick={handleExportDecisionFunnelCsv}
                                disabled={!decisionFunnelStages.length}
                                className="px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-bold disabled:cursor-not-allowed disabled:bg-slate-950 disabled:text-slate-600"
                              >
                                漏斗 CSV
                              </button>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                              {[
                                ["漏斗狀態", executionReviewLabel(decisionFunnelDecision)],
                                ["暫停 / 觀察", `${decisionFunnelBlockCount} / ${decisionFunnelWatchCount}`],
                                ["候選 / 配置", `${candidateVisibleCount} / ${activeAllocationRows.length}`],
                                ["交易 / 成交", `${tradeTickets.length} / ${filledTradeCount}`],
                              ].map(([label, value]) => (
                                <div key={label} className="rounded-md border border-slate-800 bg-slate-900/70 p-3 min-w-0">
                                  <p className="text-[11px] text-slate-600 truncate">{label}</p>
                                  <p className="mt-1 font-mono text-sm font-bold text-slate-100 truncate" title={value}>
                                    {value}
                                  </p>
                                </div>
                              ))}
                            </div>

                            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                              {decisionFunnelStages.map((stage) => (
                                <div key={stage.label} className={`rounded-md border p-3 text-xs ${executionReviewRowClass(stage.status)}`}>
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                      <p className="font-bold text-slate-100 truncate">{stage.label}</p>
                                      <p className="mt-1 font-mono text-sm text-slate-200">{stage.value}</p>
                                    </div>
                                    <span className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-bold ${executionReviewBadgeClass(stage.status)}`}>
                                      {executionReviewLabel(stage.status)}
                                    </span>
                                  </div>
                                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-950">
                                    <div
                                      className={`h-full rounded-full ${stage.status === "block" ? "bg-rose-400" : stage.status === "watch" ? "bg-amber-300" : "bg-emerald-400"}`}
                                      style={{
                                        width: stage.conversion.endsWith("%")
                                          ? `${Math.min(100, Math.max(0, Number(stage.conversion.replace("%", ""))))}%`
                                          : stage.status === "pass"
                                            ? "100%"
                                            : stage.status === "watch"
                                              ? "55%"
                                              : "20%",
                                      }}
                                    />
                                  </div>
                                  <div className="mt-2 flex items-center justify-between gap-2 text-[11px]">
                                    <span className="text-slate-500 truncate" title={stage.owner}>{stage.owner}</span>
                                    <span className="font-mono text-slate-300">{stage.conversion}</span>
                                  </div>
                                  <p className="mt-2 text-[11px] leading-relaxed text-slate-500">{stage.note}</p>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="border-t border-slate-800 pt-3 space-y-3">
                            <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-3">
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <h5 className="text-xs font-bold text-slate-100">市場警示中心</h5>
                                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${executionReviewBadgeClass(marketAlertDecision)}`}>
                                    {executionReviewLabel(marketAlertDecision)}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                  將資料品質、決策漏斗、KRI、SLA 與例外事項合併成可分派的警示事件流
                                </p>
                              </div>
                              <button
                                onClick={handleExportMarketAlertCsv}
                                disabled={!marketAlertEvents.length}
                                className="px-3 py-2 rounded-md bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-100 text-xs font-bold disabled:cursor-not-allowed disabled:bg-slate-950 disabled:text-slate-600"
                              >
                                警示 CSV
                              </button>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                              {[
                                ["警示狀態", executionReviewLabel(marketAlertDecision)],
                                ["事件數", `${marketAlertEvents.length} 筆`],
                                ["高 / 中優先", `${marketHighAlertCount} / ${marketMediumAlertCount}`],
                                ["待處理例外", `${platformExceptionItems.length} 項`],
                              ].map(([label, value]) => (
                                <div key={label} className="rounded-md border border-slate-800 bg-slate-900/70 p-3 min-w-0">
                                  <p className="text-[11px] text-slate-600 truncate">{label}</p>
                                  <p className="mt-1 font-mono text-sm font-bold text-slate-100 truncate" title={value}>
                                    {value}
                                  </p>
                                </div>
                              ))}
                            </div>

                            {marketAlertEvents.length ? (
                              <div className="overflow-x-auto">
                                <table className="w-full min-w-[1120px] text-xs">
                                  <thead>
                                    <tr className="text-left text-[11px] text-slate-600">
                                      <th className="py-2 px-3 font-medium">來源</th>
                                      <th className="py-2 px-3 font-medium">事件</th>
                                      <th className="py-2 px-3 font-medium text-right">優先級</th>
                                      <th className="py-2 px-3 font-medium text-right">狀態</th>
                                      <th className="py-2 px-3 font-medium">負責人</th>
                                      <th className="py-2 px-3 font-medium">依據</th>
                                      <th className="py-2 px-3 font-medium">動作</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {marketAlertEvents.map((event, index) => (
                                      <tr key={`${event.source}-${event.title}-${index}`} className={`border-t ${executionReviewRowClass(event.status)}`}>
                                        <td className="py-2 px-3 font-bold text-slate-100">{event.source}</td>
                                        <td className="py-2 px-3 text-slate-200">{event.title}</td>
                                        <td className="py-2 px-3 text-right">
                                          <span className={`rounded border px-2 py-0.5 text-[10px] font-bold ${executionHandoffPriorityClass(event.priority)}`}>
                                            {executionHandoffPriorityLabel(event.priority)}
                                          </span>
                                        </td>
                                        <td className="py-2 px-3 text-right">
                                          <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${executionReviewBadgeClass(event.status)}`}>
                                            {executionReviewLabel(event.status)}
                                          </span>
                                        </td>
                                        <td className="py-2 px-3 text-slate-300">{event.owner}</td>
                                        <td className="py-2 px-3 font-mono text-slate-400">{event.evidence}</td>
                                        <td className="py-2 px-3 text-slate-500">{event.action}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <div className="rounded-md border border-emerald-500/20 bg-emerald-950/10 p-3 text-xs text-emerald-200">
                                目前沒有需要處理的市場警示。
                              </div>
                            )}
                          </div>
                        </div>
                      </section>
                    </div>
                  ) : (
                    <div className="rounded-md border border-dashed border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-500">
                      輸入現有持倉後，這裡會顯示目標金額、買賣差額與偏離門檻判斷。
                    </div>
                  )}
                </div>
              </section>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[1120px] text-xs">
                  <thead>
                    <tr className="text-left text-[11px] text-slate-600">
                      <th className="py-2 pr-3 font-medium">Symbol</th>
                      <th className="py-2 px-3 font-medium text-right">Score</th>
                      <th className="py-2 px-3 font-medium">Latest</th>
                      <th className="py-2 px-3 font-medium text-right">Rows</th>
                      <th className="py-2 px-3 font-medium text-right">Price</th>
                      <th className="py-2 px-3 font-medium text-right">Total</th>
                      <th className="py-2 px-3 font-medium text-right">Ann. Return</th>
                      <th className="py-2 px-3 font-medium text-right">Vol</th>
                      <th className="py-2 px-3 font-medium text-right">Drawdown</th>
                      <th className="py-2 px-3 font-medium text-right">RA Return</th>
                      <th className="py-2 px-3 font-medium text-right">Signal</th>
                      <th className="py-2 pl-3 font-medium text-right">Quality</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleComparisonRows.map((row) => (
                        <tr key={row.symbol} className="border-t border-slate-900">
                          <td className="py-2 pr-3">
                            <button
                              onClick={() => handleLoadAssetProfile(row.symbol)}
                              className="font-bold text-cyan-200 hover:text-cyan-100"
                            >
                              {row.symbol}
                            </button>
                          </td>
                          <td className="py-2 px-3 text-right">
                            <span
                              className={`inline-flex min-w-10 justify-center rounded px-2 py-0.5 font-mono text-[11px] font-bold ${
                                row.score >= 70
                                  ? "bg-emerald-500/15 text-emerald-200"
                                  : row.score >= 55
                                    ? "bg-amber-500/15 text-amber-200"
                                    : "bg-rose-500/15 text-rose-200"
                              }`}
                            >
                              {row.score}
                            </span>
                          </td>
                          <td className="py-2 px-3 font-mono text-slate-400">
                            {row.latestDate ?? "--"}
                            <span className="ml-2 text-slate-600">
                              {row.freshnessDays === null ? "" : `${row.freshnessDays}d`}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-slate-400">{formatCount(row.rowCount)}</td>
                          <td className="py-2 px-3 text-right font-mono text-slate-300">{formatPrice(row.latestPrice)}</td>
                          <td
                            className={`py-2 px-3 text-right font-mono ${
                              typeof row.totalReturn === "number" && row.totalReturn < 0 ? "text-rose-300" : "text-emerald-300"
                            }`}
                          >
                            {formatPercent(row.totalReturn)}
                          </td>
                          <td
                            className={`py-2 px-3 text-right font-mono ${
                              typeof row.annualizedReturn === "number" && row.annualizedReturn < 0
                                ? "text-rose-300"
                                : "text-emerald-300"
                            }`}
                          >
                            {formatPercent(row.annualizedReturn)}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-amber-200">
                            {formatPercent(row.annualizedVolatility)}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-rose-300">
                            {formatPercent(row.maxDrawdown)}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-slate-300">
                            {typeof row.riskAdjustedReturn === "number" ? row.riskAdjustedReturn.toFixed(2) : "--"}
                          </td>
                          <td className="py-2 px-3 text-right">
                            <span
                              className={`rounded px-2 py-0.5 text-[10px] font-bold ${decisionSignalClass(row.signal)}`}
                              title={row.signalNote}
                            >
                              {decisionSignalLabel(row.signal)}
                            </span>
                          </td>
                          <td className="py-2 pl-3 text-right">
                            <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${qualityBadgeClass(row.qualityStatus)}`}>
                              {qualityLabel(row.qualityStatus)}
                            </span>
                          </td>
                        </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="border border-dashed border-slate-800 rounded-lg p-4 text-xs text-slate-500">
              輸入多個商品代號後，這裡會顯示 watchlist 橫向比較。
            </div>
          )}
        </section>

        {isLoading && (
          <div className="border border-dashed border-slate-800 rounded-lg p-8 text-center text-slate-500 text-sm">
            市場資料源盤點讀取中...
          </div>
        )}

        {error && (
          <div className="border border-red-900/60 bg-red-950/30 rounded-lg p-4 text-sm text-red-300 whitespace-pre-wrap">
            {error}
          </div>
        )}

        {!isLoading && !error && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {sources.map((source) => {
              const meta = statusMeta[source.status];

              return (
                <article key={source.id} className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-slate-100">{source.name}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {source.provider} · {source.category}
                      </p>
                    </div>
                    <span className={`shrink-0 text-[10px] px-2 py-1 rounded border font-bold ${meta.className}`}>
                      {meta.label}
                    </span>
                  </div>

                  <dl className="grid grid-cols-1 gap-2 text-xs">
                    <div>
                      <dt className="text-slate-500">目前資料位置</dt>
                      <dd className="text-slate-300 mt-0.5">{source.currentStorage}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">整合路徑</dt>
                      <dd className="text-cyan-200 mt-0.5">{source.integrationPath}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">下一步</dt>
                      <dd className="text-amber-200 mt-0.5">{source.nextAction}</dd>
                    </div>
                  </dl>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {data?.securityNotes.length ? (
        <section className="bg-slate-900 border border-slate-800 p-4 md:p-6 rounded-xl shadow-2xl">
          <h3 className="text-sm font-bold text-amber-300 border-b border-slate-800 pb-3 mb-3">
            ▍ 上線安全檢查
          </h3>
          <ul className="space-y-2 text-xs text-slate-300">
            {data.securityNotes.map((note) => (
              <li key={note} className="flex gap-2">
                <span className="text-amber-400">•</span>
                <span>{note}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <BigQueryPortfolioPanel hasBigQueryCredentials={hasBigQueryCredentials} />
    </div>
  );
}
