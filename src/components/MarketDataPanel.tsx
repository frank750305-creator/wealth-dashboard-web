import { useEffect, useState } from "react";
import { useMarketSources } from "@/hooks/useMarketSources";
import { assetComparisonMemo } from "@/lib/watchlistMemo";
import {
  assetComparisonCsv,
  assetProfileCsv,
  comparisonRowFromProfile,
  coverageStatus,
  daysSinceDate,
  decisionSignalClass,
  decisionSignalLabel,
  formatCount,
  formatPrice,
  freshnessStatus,
  parseSymbolList,
  qualityBadgeClass,
  qualityClass,
  qualityLabel,
  sortComparisonRows,
  type AssetComparisonRow,
  type AssetComparisonSortKey,
  type AssetDecisionSignal,
  type QualityStatus,
} from "@/lib/assetResearchWorkflow";
import {
  allocationDraftCsv,
  allocationDraftRows,
  allocationRiskCsv,
  allocationRiskSnapshot,
  type AllocationMode,
} from "@/lib/allocationWorkflow";
import {
  rebalanceDirectionClass,
  rebalanceDirectionLabel,
  rebalanceDraftCsv,
  rebalanceDraftRows,
} from "@/lib/rebalanceWorkflow";
import { fetchBigQueryAssetProfile, fetchBigQueryAssets } from "@/lib/marketApi";
import {
  buildClientWorkspaceProvisioningItems,
  buildPlatformEntitlementItems,
  buildUsageBillingItems,
  clientWorkspaceProvisioningCsv,
  platformEntitlementCsv,
  usageBillingCsv,
} from "@/lib/commercialAccessLayer";
import {
  apiContractBlueprintJson,
  apiServiceCatalogCsv,
  buildApiContractBlueprintItems,
  buildApiServiceCatalogItems,
} from "@/lib/apiServiceLayer";
import {
  buildDataLineageItems,
  buildDataProductCatalogItems,
  buildDataRemediationItems,
  dataLineageCsv,
  dataProductCatalogCsv,
  dataRemediationCsv,
} from "@/lib/dataGovernanceCatalog";
import {
  buildCoverageUniverseItems,
  buildDataContractItems,
  buildDataPipelineHealthItems,
  buildDataPipelineTableSnapshots,
  bigQueryDiagnosticsCsv,
  coverageUniverseCsv,
  dataContractCsv,
  dataPipelineCsv,
} from "@/lib/dataWarehouseMonitoring";
import {
  buildMarketAlertEvents,
  marketAlertCsv,
} from "@/lib/marketAlertEvents";
import {
  buildDataLicenseComplianceItems,
  dataLicenseComplianceCsv,
} from "@/lib/dataLicenseCompliance";
import {
  buildSecurityAuditItems,
  securityAuditCsv,
} from "@/lib/securityAudit";
import {
  buildIncidentCommandItems,
  incidentCommandCsv,
} from "@/lib/incidentCommand";
import {
  buildCioOperatingBriefItems,
  buildDecisionFunnelStages,
  buildOperatingKriItems,
  buildSlaEscalationItems,
  decisionFunnelCsv,
  operatingKriCsv,
  slaEscalationCsv,
  slaEscalationTierLabel,
} from "@/lib/operatingControlWorkflow";
import {
  buildProductReleaseGateItems,
  productReleaseGateCsv,
} from "@/lib/productReleaseGate";
import {
  buildCustomerSuccessHealthItems,
  customerSuccessHealthCsv,
} from "@/lib/customerSuccessHealth";
import {
  buildRevenueForecastItems,
  revenueForecastCsv,
} from "@/lib/revenueForecast";
import {
  executionReviewCsv,
  tradeExecutionReviewItems,
  tradeMonitoringRuleItems,
} from "@/lib/executionReviewWorkflow";
import {
  buildExecutionHandoffItems,
  executionHandoffCsv,
  executionHandoffPriorityClass,
  executionHandoffPriorityLabel,
  formatBps,
  platformExceptionCsv,
  platformExceptionQueueItems,
  postTradeAttributionItems,
} from "@/lib/executionOperationsWorkflow";
import {
  buildDecisionAuditId,
  buildDecisionAuditRecords,
  committeeApprovalChecklist,
  committeeDecisionFromItems,
  committeeDecisionLabel,
  committeeDecisionStatus,
  decisionAuditCsv,
  formatDecisionAuditTime,
  investmentPolicyLimitItems,
} from "@/lib/investmentCommitteeWorkflow";
import {
  buildExecutionFillRows,
  executionFillCsv,
  tradeBatchCsv,
  tradeBatchRows,
  tradeTicketCsv,
  tradeTicketRows,
  type ExecutionReviewStatus,
} from "@/lib/tradeExecutionWorkflow";
import type {
  BigQueryAsset,
  BigQueryAssetProfileResponse,
  MarketSourceStatus,
} from "@/types/market";
import { AllocationDraftSection } from "./AllocationDraftSection";
import { BigQueryPortfolioPanel } from "./BigQueryPortfolioPanel";
import { AssetProfileSection } from "./AssetProfileSection";
import { CommercializationSection } from "./CommercializationSection";
import { DataOperationsSection } from "./DataOperationsSection";
import { EnterpriseReadinessSection } from "./EnterpriseReadinessSection";
import { RebalanceDraftSection } from "./RebalanceDraftSection";
import { TradeTicketSection } from "./TradeTicketSection";
import { WatchlistControlsSection } from "./WatchlistControlsSection";
import { WatchlistSummaryCards } from "./WatchlistSummaryCards";

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

function formatPercent(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? `${(value * 100).toFixed(2)}%` : "--";
}

function formatCurrency(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value)
    ? value.toLocaleString("zh-TW", { maximumFractionDigits: 0 })
    : "--";
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

    downloadTextFile(
      `bigquery-data-quality-${resultStamp()}.csv`,
      bigQueryDiagnosticsCsv({
        diagnostics: bigQueryDiagnostics,
        qualityCards,
        issueCards,
        staleSymbols,
        fxCurrencies,
      }),
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

              <DataOperationsSection
                dataPipelineDecision={dataPipelineDecision}
                dataPipelineBlockCount={dataPipelineBlockCount}
                dataPipelineWatchCount={dataPipelineWatchCount}
                dataPipelineGeneratedAt={bigQueryDiagnostics?.generatedAt}
                dataPipelineHealthItems={dataPipelineHealthItems}
                dataPipelineTableSnapshots={dataPipelineTableSnapshots}
                dataContractDecision={dataContractDecision}
                dataContractBlockCount={dataContractBlockCount}
                dataContractWatchCount={dataContractWatchCount}
                dataContractItems={dataContractItems}
                onExportDataContractCsv={handleExportDataContractCsv}
                coverageUniverseDecision={coverageUniverseDecision}
                coverageUniverseBlockCount={coverageUniverseBlockCount}
                coverageUniverseWatchCount={coverageUniverseWatchCount}
                coverageUniverseItems={coverageUniverseItems}
                onExportCoverageUniverseCsv={handleExportCoverageUniverseCsv}
                dataRemediationDecision={dataRemediationDecision}
                dataRemediationHighCount={dataRemediationHighCount}
                dataRemediationMediumCount={dataRemediationMediumCount}
                dataRemediationItems={dataRemediationItems}
                onExportDataRemediationCsv={handleExportDataRemediationCsv}
                dataLineageDecision={dataLineageDecision}
                dataLineageBlockCount={dataLineageBlockCount}
                dataLineageWatchCount={dataLineageWatchCount}
                dataLineageItems={dataLineageItems}
                onExportDataLineageCsv={handleExportDataLineageCsv}
              />
              <CommercializationSection
                dataProductCatalogDecision={dataProductCatalogDecision}
                dataProductReadyCount={dataProductReadyCount}
                dataProductWatchCount={dataProductWatchCount}
                dataProductCatalogItems={dataProductCatalogItems}
                onExportDataProductCatalogCsv={handleExportDataProductCatalogCsv}
                apiServiceCatalogDecision={apiServiceCatalogDecision}
                apiServiceReadyCount={apiServiceReadyCount}
                apiServiceWatchCount={apiServiceWatchCount}
                apiServiceCatalogItems={apiServiceCatalogItems}
                onExportApiServiceCatalogCsv={handleExportApiServiceCatalogCsv}
                apiContractBlueprintDecision={apiContractBlueprintDecision}
                apiContractStableCount={apiContractStableCount}
                apiContractDraftCount={apiContractDraftCount}
                apiContractBlueprintItems={apiContractBlueprintItems}
                onExportApiContractBlueprintJson={handleExportApiContractBlueprintJson}
                platformEntitlementDecision={platformEntitlementDecision}
                entitlementReadyCount={entitlementReadyCount}
                entitlementRestrictedCount={entitlementRestrictedCount}
                platformEntitlementItems={platformEntitlementItems}
                onExportPlatformEntitlementCsv={handleExportPlatformEntitlementCsv}
                clientWorkspaceProvisioningDecision={clientWorkspaceProvisioningDecision}
                workspaceReadyCount={workspaceReadyCount}
                workspaceBlockedCount={workspaceBlockedCount}
                clientWorkspaceProvisioningItems={clientWorkspaceProvisioningItems}
                onExportClientWorkspaceCsv={handleExportClientWorkspaceCsv}
                usageBillingDecision={usageBillingDecision}
                billableWorkspaceCount={billableWorkspaceCount}
                billingReadyCount={billingReadyCount}
                usageBillingItems={usageBillingItems}
                onExportUsageBillingCsv={handleExportUsageBillingCsv}
              />
              <EnterpriseReadinessSection
                dataLicenseComplianceDecision={dataLicenseComplianceDecision}
                licenseReadyCount={licenseReadyCount}
                licenseRestrictedCount={licenseRestrictedCount}
                dataLicenseComplianceItems={dataLicenseComplianceItems}
                onExportDataLicenseComplianceCsv={handleExportDataLicenseComplianceCsv}
                securityAuditDecision={securityAuditDecision}
                securityReadyCount={securityReadyCount}
                securityBlockCount={securityBlockCount}
                securityAuditItems={securityAuditItems}
                onExportSecurityAuditCsv={handleExportSecurityAuditCsv}
                incidentCommandDecision={incidentCommandDecision}
                incidentOpenCount={incidentOpenCount}
                incidentHighPriorityCount={incidentHighPriorityCount}
                incidentCommandItems={incidentCommandItems}
                onExportIncidentCommandCsv={handleExportIncidentCommandCsv}
                productReleaseGateDecision={productReleaseGateDecision}
                releaseProductionCount={releaseProductionCount}
                releasePilotCount={releasePilotCount}
                releaseHoldCount={releaseHoldCount}
                productReleaseGateItems={productReleaseGateItems}
                onExportProductReleaseGateCsv={handleExportProductReleaseGateCsv}
                customerSuccessHealthDecision={customerSuccessHealthDecision}
                customerHealthyCount={customerHealthyCount}
                customerExpansionCount={customerExpansionCount}
                customerRiskCount={customerRiskCount}
                customerSuccessHealthItems={customerSuccessHealthItems}
                onExportCustomerSuccessHealthCsv={handleExportCustomerSuccessHealthCsv}
                revenueForecastDecision={revenueForecastDecision}
                revenueCurrentMrr={revenueCurrentMrr}
                revenueExpansionMrr={revenueExpansionMrr}
                revenueRiskMrr={revenueRiskMrr}
                revenueProjectedMrr={revenueProjectedMrr}
                revenueForecastItems={revenueForecastItems}
                onExportRevenueForecastCsv={handleExportRevenueForecastCsv}
              />
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

        <AssetProfileSection
          assetQuery={assetQuery}
          onAssetQueryChange={setAssetQuery}
          assetPriceBasis={assetPriceBasis}
          onAssetPriceBasisChange={setAssetPriceBasis}
          hasBigQueryCredentials={hasBigQueryCredentials}
          isSearchingAssets={isSearchingAssets}
          isLoadingAssetProfile={isLoadingAssetProfile}
          onSearchAssets={handleSearchAssets}
          onLoadAssetProfile={handleLoadAssetProfile}
          assetPanelError={assetPanelError}
          assetSuggestions={assetSuggestions}
          assetProfile={assetProfile}
          assetProfileQualityCards={assetProfileQualityCards}
          onExportAssetProfileCsv={handleExportAssetProfileCsv}
        />
        <section className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-4">
          <WatchlistControlsSection
            comparisonRows={comparisonRows}
            visibleComparisonRows={visibleComparisonRows}
            watchlistMemoCopyStatus={watchlistMemoCopyStatus}
            onExportAssetComparisonMemo={handleExportAssetComparisonMemo}
            onCopyAssetComparisonMemo={handleCopyAssetComparisonMemo}
            onExportAssetComparisonCsv={handleExportAssetComparisonCsv}
            onCompareAssets={handleCompareAssets}
            hasBigQueryCredentials={hasBigQueryCredentials}
            isLoadingComparison={isLoadingComparison}
            comparisonSymbols={comparisonSymbols}
            onComparisonSymbolsChange={setComparisonSymbols}
            assetPriceBasis={assetPriceBasis}
            watchlistPresetName={watchlistPresetName}
            onWatchlistPresetNameChange={setWatchlistPresetName}
            selectedWatchlistPresetId={selectedWatchlistPresetId}
            savedWatchlistPresets={savedWatchlistPresets}
            onSelectedWatchlistPresetIdChange={setSelectedWatchlistPresetId}
            onSaveWatchlistPreset={handleSaveWatchlistPreset}
            onLoadWatchlistPreset={handleLoadWatchlistPreset}
            onDeleteWatchlistPreset={handleDeleteWatchlistPreset}
            comparisonSortKey={comparisonSortKey}
            onComparisonSortKeyChange={setComparisonSortKey}
            comparisonSignalFilter={comparisonSignalFilter}
            onComparisonSignalFilterChange={setComparisonSignalFilter}
            minimumComparisonScore={minimumComparisonScore}
            onMinimumComparisonScoreChange={setMinimumComparisonScore}
            comparisonError={comparisonError}
          />

          {comparisonRows.length ? (
            <div className="space-y-3">
              <WatchlistSummaryCards
                comparisonRows={comparisonRows}
                visibleComparisonRows={visibleComparisonRows}
              />

              <section className="rounded-lg border border-slate-800 bg-slate-900/50 p-3 space-y-3">
                <AllocationDraftSection
                  allocationMode={allocationMode}
                  onAllocationModeChange={setAllocationMode}
                  allocationCapital={allocationCapital}
                  onAllocationCapitalChange={setAllocationCapital}
                  maximumAllocationWeight={maximumAllocationWeight}
                  onMaximumAllocationWeightChange={setMaximumAllocationWeight}
                  stressShockPercent={stressShockPercent}
                  onStressShockPercentChange={setStressShockPercent}
                  onExportAllocationDraftCsv={handleExportAllocationDraftCsv}
                  onExportAllocationRiskCsv={handleExportAllocationRiskCsv}
                  modelAllocationRows={modelAllocationRows}
                  activeAllocationRows={activeAllocationRows}
                  visibleComparisonRowsCount={visibleComparisonRows.length}
                  effectiveMaximumAllocationWeight={effectiveMaximumAllocationWeight}
                  allocationRisk={allocationRisk}
                />

                <div className="border-t border-slate-800 pt-3 space-y-3">
                  <RebalanceDraftSection
                    rebalanceThreshold={rebalanceThreshold}
                    onRebalanceThresholdChange={setRebalanceThreshold}
                    onExportRebalanceDraftCsv={handleExportRebalanceDraftCsv}
                    currentHoldingsText={currentHoldingsText}
                    onCurrentHoldingsTextChange={setCurrentHoldingsText}
                    rebalanceRows={rebalanceRows}
                    activeRebalanceRows={activeRebalanceRows}
                  />

                  {rebalanceRows.length ? (
                    <div className="space-y-3">
                      <section className="rounded-md border border-slate-800 bg-slate-950/70 p-3 space-y-3">
                        <TradeTicketSection
                          minimumTradeAmount={minimumTradeAmount}
                          onMinimumTradeAmountChange={setMinimumTradeAmount}
                          onExportTradeTicketCsv={handleExportTradeTicketCsv}
                          tradeTickets={tradeTickets}
                          skippedTradeCount={skippedTradeCount}
                        />

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
