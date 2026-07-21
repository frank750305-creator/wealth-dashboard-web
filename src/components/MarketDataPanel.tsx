import { useEffect, useState } from "react";
import { useMarketSources } from "@/hooks/useMarketSources";
import { assetComparisonMemo } from "@/lib/watchlistMemo";
import {
  loadWatchlistPresetsFromStorage,
  writeWatchlistPresetsToStorage,
  type SavedWatchlistPreset,
} from "@/lib/watchlistPresets";
import {
  assetComparisonCsv,
  assetProfileCsv,
  assetResearchReportMarkdown,
  comparisonRowFromProfile,
  coverageStatus,
  daysSinceDate,
  formatCount,
  freshnessStatus,
  parseSymbolList,
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
  rebalanceDraftCsv,
  rebalanceDraftRows,
} from "@/lib/rebalanceWorkflow";
import {
  fetchBigQueryAssetHistory,
  fetchBigQueryAssetProfile,
  fetchBigQueryAssets,
  syncResearchTasksToBigQuery,
} from "@/lib/marketApi";
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
  buildMarketAlertOwnerQueues,
  marketAlertOwnerQueueCsv,
  buildMarketAlertRunbookItems,
  marketAlertRunbookCsv,
  buildMarketAlertCommandSummary,
  marketAlertCommandSummaryCsv,
} from "@/lib/marketAlertEvents";
import {
  applyResearchTaskOverrides,
  buildResearchTaskSyncPayload,
  buildResearchTaskLifecycle,
  buildResearchTaskItems,
  buildResearchTaskSummary,
  loadResearchTaskOverridesFromStorage,
  researchTaskBigQueryDdl,
  researchTaskBigQuerySchemaJson,
  researchTaskCsv,
  researchTaskLifecycleCsv,
  researchTaskSyncPayloadJson,
  writeResearchTaskOverridesToStorage,
  type ResearchTaskOverride,
} from "@/lib/researchTaskWorkflow";
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
  platformExceptionCsv,
  platformExceptionQueueItems,
  postTradeAttributionItems,
} from "@/lib/executionOperationsWorkflow";
import {
  buildDecisionAuditId,
  buildDecisionAuditRecords,
  committeeApprovalChecklist,
  committeeDecisionFromItems,
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
  BigQueryAssetHistoryResponse,
  BigQueryAssetProfileResponse,
} from "@/types/market";
import { AllocationDraftSection } from "./AllocationDraftSection";
import { AssetComparisonTable } from "./AssetComparisonTable";
import { BigQueryConnectionSection } from "./BigQueryConnectionSection";
import { BigQueryPortfolioPanel } from "./BigQueryPortfolioPanel";
import {
  BigQueryQualityCardGrid,
  BigQueryQualityScorecard,
  BigQueryWarehouseSnapshotSection,
} from "./BigQueryWarehouseDiagnosticsSection";
import { AssetProfileSection } from "./AssetProfileSection";
import { CioOperatingBriefSection } from "./CioOperatingBriefSection";
import { CommitteeApprovalSection } from "./CommitteeApprovalSection";
import { CommercializationSection } from "./CommercializationSection";
import { MarketDataConsoleHeader } from "./MarketDataConsoleHeader";
import { DataOperationsSection } from "./DataOperationsSection";
import { DecisionFunnelSection } from "./DecisionFunnelSection";
import { DecisionAuditSection } from "./DecisionAuditSection";
import { EnterpriseReadinessSection } from "./EnterpriseReadinessSection";
import { ExecutionFillSection } from "./ExecutionFillSection";
import { ExecutionHandoffSection } from "./ExecutionHandoffSection";
import { ExecutionReviewSection } from "./ExecutionReviewSection";
import { MonitoringRulesSection } from "./MonitoringRulesSection";
import { MarketAlertSection } from "./MarketAlertSection";
import { MarketSourceInventorySection } from "./MarketSourceInventorySection";
import { OperatingKriSection } from "./OperatingKriSection";
import { PolicyLimitSection } from "./PolicyLimitSection";
import { PlatformExceptionSection } from "./PlatformExceptionSection";
import { PostTradeAttributionSection } from "./PostTradeAttributionSection";
import { RebalanceDraftSection } from "./RebalanceDraftSection";
import { ResearchTaskBoardSection } from "./ResearchTaskBoardSection";
import { SecurityNotesSection } from "./SecurityNotesSection";
import { SlaEscalationSection } from "./SlaEscalationSection";
import { TradeBatchSection } from "./TradeBatchSection";
import { TradeTicketSection } from "./TradeTicketSection";
import { WatchlistControlsSection } from "./WatchlistControlsSection";
import { WatchlistSummaryCards } from "./WatchlistSummaryCards";

function formatPercent(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? `${(value * 100).toFixed(2)}%` : "--";
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
  const [assetHistory, setAssetHistory] = useState<BigQueryAssetHistoryResponse | null>(null);
  const [assetHistoryStartDate, setAssetHistoryStartDate] = useState("");
  const [assetHistoryEndDate, setAssetHistoryEndDate] = useState("");
  const [assetHistoryLimit, setAssetHistoryLimit] = useState(365);
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
  const [researchTaskOverrides, setResearchTaskOverrides] = useState<ResearchTaskOverride[]>([]);
  const [researchTaskSyncStatus, setResearchTaskSyncStatus] = useState<"idle" | "syncing" | "synced" | "error">("idle");
  const [researchTaskSyncMessage, setResearchTaskSyncMessage] = useState("");
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
  const marketAlertOwnerQueues = buildMarketAlertOwnerQueues(marketAlertEvents);
  const marketAlertRunbookItems = buildMarketAlertRunbookItems(marketAlertEvents);
  const marketAlertCommandSummary = buildMarketAlertCommandSummary({
    events: marketAlertEvents,
    ownerQueues: marketAlertOwnerQueues,
    runbookItems: marketAlertRunbookItems,
  });
  const generatedResearchTaskItems = buildResearchTaskItems({
    comparisonRows,
    visibleComparisonRows,
    assetProfileSymbol: assetProfile?.symbol,
    activeAllocationRows,
    marketAlertCommandSummary,
    marketAlertRunbookItems,
    researchOwner: decisionOwner,
    riskOwner,
  });
  const researchTaskItems = applyResearchTaskOverrides(generatedResearchTaskItems, researchTaskOverrides);
  const researchTaskSummary = buildResearchTaskSummary(researchTaskItems);
  const researchTaskLifecycle = buildResearchTaskLifecycle({
    tasks: researchTaskItems,
    summary: researchTaskSummary,
    marketAlertCommandSummary,
    generatedAt: decisionGeneratedAt,
    decisionOwner,
    riskOwner,
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
      const taskOverrides = loadResearchTaskOverridesFromStorage();
      setSavedWatchlistPresets(presets);
      setResearchTaskOverrides(taskOverrides);
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
      const [profileResponse, historyResponse] = await Promise.all([
        fetchBigQueryAssetProfile(cleanSymbol, assetPriceBasis),
        fetchBigQueryAssetHistory(cleanSymbol, assetPriceBasis, {
          startDate: assetHistoryStartDate || undefined,
          endDate: assetHistoryEndDate || undefined,
          limit: assetHistoryLimit,
        }),
      ]);
      setAssetQuery(profileResponse.symbol);
      setAssetProfile(profileResponse);
      setAssetHistory(historyResponse);
    } catch (err: unknown) {
      setAssetProfile(null);
      setAssetHistory(null);
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
  const handleExportAssetResearchReport = () => {
    if (!assetProfile) return;

    downloadTextFile(
      `bigquery-asset-research-${assetProfile.symbol}-${resultStamp()}.md`,
      assetResearchReportMarkdown({ profile: assetProfile, history: assetHistory }),
      "text/markdown;charset=utf-8",
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
  const handleExportMarketAlertCommandSummaryCsv = () => {
    downloadTextFile(
      `bigquery-market-alert-command-summary-${resultStamp()}.csv`,
      marketAlertCommandSummaryCsv(marketAlertCommandSummary),
      "text/csv;charset=utf-8",
    );
  };
  const handleExportMarketAlertOwnerQueueCsv = () => {
    if (!marketAlertOwnerQueues.length) return;

    downloadTextFile(
      `bigquery-market-alert-owner-queue-${resultStamp()}.csv`,
      marketAlertOwnerQueueCsv(marketAlertOwnerQueues),
      "text/csv;charset=utf-8",
    );
  };
  const handleExportMarketAlertRunbookCsv = () => {
    if (!marketAlertRunbookItems.length) return;

    downloadTextFile(
      `bigquery-market-alert-runbook-${resultStamp()}.csv`,
      marketAlertRunbookCsv(marketAlertRunbookItems),
      "text/csv;charset=utf-8",
    );
  };
  const handleExportResearchTaskCsv = () => {
    if (!researchTaskItems.length) return;

    downloadTextFile(
      `bigquery-research-task-board-${resultStamp()}.csv`,
      researchTaskCsv(researchTaskItems),
      "text/csv;charset=utf-8",
    );
  };
  const handleExportResearchTaskLifecycleCsv = () => {
    downloadTextFile(
      `bigquery-research-task-lifecycle-${resultStamp()}.csv`,
      researchTaskLifecycleCsv(researchTaskLifecycle),
      "text/csv;charset=utf-8",
    );
  };
  const handleExportResearchTaskSyncJson = () => {
    if (!researchTaskItems.length) return;

    downloadTextFile(
      `bigquery-research-task-sync-${resultStamp()}.json`,
      researchTaskSyncPayloadJson(
        buildResearchTaskSyncPayload({
          tasks: researchTaskItems,
          lifecycle: researchTaskLifecycle,
          generatedAt: decisionGeneratedAt,
        }),
      ),
      "application/json;charset=utf-8",
    );
  };
  const handleExportResearchTaskBigQueryDdl = () => {
    downloadTextFile(
      `bigquery-research-task-ddl-${resultStamp()}.sql`,
      researchTaskBigQueryDdl(),
      "text/plain;charset=utf-8",
    );
  };
  const handleExportResearchTaskSchemaJson = () => {
    downloadTextFile(
      `bigquery-research-task-schema-${resultStamp()}.json`,
      researchTaskBigQuerySchemaJson(),
      "application/json;charset=utf-8",
    );
  };
  const handleSyncResearchTasksToBigQuery = async () => {
    if (!researchTaskItems.length) return;

    setResearchTaskSyncStatus("syncing");
    setResearchTaskSyncMessage("研究任務同步中。");

    try {
      const result = await syncResearchTasksToBigQuery(
        buildResearchTaskSyncPayload({
          tasks: researchTaskItems,
          lifecycle: researchTaskLifecycle,
          generatedAt: decisionGeneratedAt,
        }),
      );
      const isSynced = result.status === "synced";
      setResearchTaskSyncStatus(isSynced ? "synced" : "error");
      setResearchTaskSyncMessage(
        `${result.insertedCount}/${result.receivedCount} 筆寫入 ${result.table}`,
      );
    } catch (err: unknown) {
      setResearchTaskSyncStatus("error");
      setResearchTaskSyncMessage(err instanceof Error ? err.message : String(err));
    }
  };
  const handleResearchTaskOverrideChange = (
    taskId: string,
    patch: Partial<Pick<ResearchTaskOverride, "status" | "owner" | "note">>,
  ) => {
    setResearchTaskOverrides((currentOverrides) => {
      const existing = currentOverrides.find((item) => item.taskId === taskId);
      const now = new Date().toISOString();
      const status = patch.status ?? existing?.status;
      const owner = patch.owner !== undefined ? patch.owner : existing?.owner;
      const note = patch.note !== undefined ? patch.note : existing?.note;
      const nextOverride: ResearchTaskOverride = {
        taskId,
        updatedAt: now,
        ...(status ? { status } : {}),
        ...(owner?.trim() ? { owner } : {}),
        ...(note?.trim() ? { note } : {}),
      };
      const hasOverride = Boolean(nextOverride.status || nextOverride.owner || nextOverride.note);
      const nextOverrides = hasOverride
        ? [nextOverride, ...currentOverrides.filter((item) => item.taskId !== taskId)]
        : currentOverrides.filter((item) => item.taskId !== taskId);

      writeResearchTaskOverridesToStorage(nextOverrides);
      return nextOverrides;
    });
  };
  const handleResetResearchTaskOverride = (taskId: string) => {
    setResearchTaskOverrides((currentOverrides) => {
      const nextOverrides = currentOverrides.filter((item) => item.taskId !== taskId);
      writeResearchTaskOverridesToStorage(nextOverrides);
      return nextOverrides;
    });
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
        <MarketDataConsoleHeader
          sourceCount={sources.length}
          securedCount={securedCount}
          generatedAt={data?.generatedAt}
          hasBigQueryCredentials={hasBigQueryCredentials}
          bigQueryStatus={bigQueryStatus}
          bigQueryBadge={bigQueryBadge}
          onReload={reload}
        />

        <BigQueryConnectionSection
          bigQueryStatus={bigQueryStatus}
          bigQueryError={bigQueryError}
          hasBigQueryCredentials={hasBigQueryCredentials}
          bigQueryBadge={bigQueryBadge}
        />

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
              <BigQueryQualityCardGrid
                qualityCards={qualityCards}
                issueCards={issueCards}
              />
              <BigQueryQualityScorecard scorecard={bigQueryDiagnostics.qualityScorecard} />

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
              <BigQueryWarehouseSnapshotSection
                bigQueryDiagnostics={bigQueryDiagnostics}
                fxFreshnessDays={fxFreshnessDays}
                staleSymbols={staleSymbols}
                fxCurrencies={fxCurrencies}
              />
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
          assetHistory={assetHistory}
          assetHistoryStartDate={assetHistoryStartDate}
          assetHistoryEndDate={assetHistoryEndDate}
          assetHistoryLimit={assetHistoryLimit}
          onAssetHistoryStartDateChange={setAssetHistoryStartDate}
          onAssetHistoryEndDateChange={setAssetHistoryEndDate}
          onAssetHistoryLimitChange={setAssetHistoryLimit}
          assetProfileQualityCards={assetProfileQualityCards}
          onExportAssetProfileCsv={handleExportAssetProfileCsv}
          onExportAssetResearchReport={handleExportAssetResearchReport}
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

          <ResearchTaskBoardSection
            tasks={researchTaskItems}
            summary={researchTaskSummary}
            lifecycle={researchTaskLifecycle}
            taskOverrides={researchTaskOverrides}
            hasBigQueryCredentials={hasBigQueryCredentials}
            syncStatus={researchTaskSyncStatus}
            syncMessage={researchTaskSyncMessage}
            onTaskOverrideChange={handleResearchTaskOverrideChange}
            onResetTaskOverride={handleResetResearchTaskOverride}
            onSyncResearchTasksToBigQuery={handleSyncResearchTasksToBigQuery}
            onExportResearchTaskCsv={handleExportResearchTaskCsv}
            onExportResearchTaskLifecycleCsv={handleExportResearchTaskLifecycleCsv}
            onExportResearchTaskSyncJson={handleExportResearchTaskSyncJson}
            onExportResearchTaskBigQueryDdl={handleExportResearchTaskBigQueryDdl}
            onExportResearchTaskSchemaJson={handleExportResearchTaskSchemaJson}
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
                          <TradeBatchSection
                            maximumBatchAmount={maximumBatchAmount}
                            onMaximumBatchAmountChange={setMaximumBatchAmount}
                            maximumTicketsPerBatch={maximumTicketsPerBatch}
                            onMaximumTicketsPerBatchChange={setMaximumTicketsPerBatch}
                            onExportTradeBatchCsv={handleExportTradeBatchCsv}
                            tradeBatches={tradeBatches}
                            tradeBatchCount={tradeBatchCount}
                            maximumTradeBatchGross={maximumTradeBatchGross}
                            firstTradeBatchCashImpact={firstTradeBatch?.batchCashImpact}
                            averageTradeBatchGross={averageTradeBatchGross}
                          />

                          <ExecutionReviewSection
                            decision={executionReviewDecision}
                            blockCount={executionBlockCount}
                            watchCount={executionWatchCount}
                            canExport={Boolean(rebalanceRows.length)}
                            onExportExecutionReviewCsv={handleExportExecutionReviewCsv}
                            items={executionReviewItems}
                          />

                          <PolicyLimitSection
                            policyDecision={policyDecision}
                            policyMaxSingleWeightPercent={policyMaxSingleWeightPercent}
                            onPolicyMaxSingleWeightPercentChange={setPolicyMaxSingleWeightPercent}
                            policyMaxVolatilityPercent={policyMaxVolatilityPercent}
                            onPolicyMaxVolatilityPercentChange={setPolicyMaxVolatilityPercent}
                            policyMaxDrawdownPercent={policyMaxDrawdownPercent}
                            onPolicyMaxDrawdownPercentChange={setPolicyMaxDrawdownPercent}
                            policyMinimumScore={policyMinimumScore}
                            onPolicyMinimumScoreChange={setPolicyMinimumScore}
                            onExportPolicyLimitCsv={handleExportPolicyLimitCsv}
                            canExport={Boolean(rebalanceRows.length)}
                            policyBlockCount={policyBlockCount}
                            policyWatchCount={policyWatchCount}
                            policyLimitItems={policyLimitItems}
                          />

                          <MonitoringRulesSection
                            monitoringDecision={monitoringDecision}
                            monitoringHorizonDays={monitoringHorizonDays}
                            onMonitoringHorizonDaysChange={setMonitoringHorizonDays}
                            monitoringDrawdownAlertPercent={monitoringDrawdownAlertPercent}
                            onMonitoringDrawdownAlertPercentChange={setMonitoringDrawdownAlertPercent}
                            onExportMonitoringRulesCsv={handleExportMonitoringRulesCsv}
                            canExport={Boolean(rebalanceRows.length)}
                            monitoringAlertCount={monitoringAlertCount}
                            monitoringWatchCount={monitoringWatchCount}
                            monitoringRules={monitoringRules}
                          />

                          <CommitteeApprovalSection
                            committeeDecision={committeeDecision}
                            onExportCommitteeApprovalCsv={handleExportCommitteeApprovalCsv}
                            canExport={Boolean(rebalanceRows.length)}
                            committeeBlockCount={committeeBlockCount}
                            committeeWatchCount={committeeWatchCount}
                            tradeTicketCount={tradeTickets.length}
                            committeeApprovalItems={committeeApprovalItems}
                          />

                          <DecisionAuditSection
                            decisionAuditId={decisionAuditId}
                            decisionOwner={decisionOwner}
                            onDecisionOwnerChange={setDecisionOwner}
                            decisionApprover={decisionApprover}
                            onDecisionApproverChange={setDecisionApprover}
                            onRefreshDecisionVersion={() => setDecisionGeneratedAt(new Date().toISOString())}
                            onExportDecisionAuditCsv={handleExportDecisionAuditCsv}
                            decisionAuditGeneratedText={decisionAuditGeneratedText}
                            decisionAuditRecords={decisionAuditRecords}
                          />

                          <ExecutionHandoffSection
                            executionOwner={executionOwner}
                            onExecutionOwnerChange={setExecutionOwner}
                            riskOwner={riskOwner}
                            onRiskOwnerChange={setRiskOwner}
                            settlementOwner={settlementOwner}
                            onSettlementOwnerChange={setSettlementOwner}
                            handoffDueDays={handoffDueDays}
                            onHandoffDueDaysChange={setHandoffDueDays}
                            onExportExecutionHandoffCsv={handleExportExecutionHandoffCsv}
                            handoffBlockCount={handoffBlockCount}
                            handoffWatchCount={handoffWatchCount}
                            handoffHighPriorityCount={handoffHighPriorityCount}
                            executionHandoffItems={executionHandoffItems}
                          />

                          <ExecutionFillSection
                            executionFillDecision={executionFillDecision}
                            fillCompletionPercent={fillCompletionPercent}
                            onFillCompletionPercentChange={setFillCompletionPercent}
                            fillSlippageBps={fillSlippageBps}
                            onFillSlippageBpsChange={setFillSlippageBps}
                            fillCommissionBps={fillCommissionBps}
                            onFillCommissionBpsChange={setFillCommissionBps}
                            onExportExecutionFillCsv={handleExportExecutionFillCsv}
                            executionFillRows={executionFillRows}
                            totalFilledNotional={totalFilledNotional}
                            totalUnfilledNotional={totalUnfilledNotional}
                            totalExecutionCost={totalExecutionCost}
                            totalCashImpactAfterCost={totalCashImpactAfterCost}
                          />

                          <PostTradeAttributionSection
                            postTradeDecision={postTradeDecision}
                            postTradeReviewDays={postTradeReviewDays}
                            onPostTradeReviewDaysChange={setPostTradeReviewDays}
                            postTradeBenchmarkMovePercent={postTradeBenchmarkMovePercent}
                            onPostTradeBenchmarkMovePercentChange={setPostTradeBenchmarkMovePercent}
                            onExportPostTradeAttributionCsv={handleExportPostTradeAttributionCsv}
                            postTradeAttributionRows={postTradeAttributionRows}
                            postTradeBlockCount={postTradeBlockCount}
                            postTradeWatchCount={postTradeWatchCount}
                            postTradeResidualMarketImpact={postTradeResidualMarketImpact}
                          />

                          <PlatformExceptionSection
                            platformExceptionDecision={platformExceptionDecision}
                            exceptionDueDays={exceptionDueDays}
                            onExceptionDueDaysChange={setExceptionDueDays}
                            onExportPlatformExceptionCsv={handleExportPlatformExceptionCsv}
                            platformExceptionItems={platformExceptionItems}
                            platformExceptionHighPriorityCount={platformExceptionHighPriorityCount}
                            platformExceptionBlockCount={platformExceptionBlockCount}
                            platformExceptionWatchCount={platformExceptionWatchCount}
                          />

                          <CioOperatingBriefSection
                            cioOperatingDecision={cioOperatingDecision}
                            onExportCioOperatingBriefCsv={handleExportCioOperatingBriefCsv}
                            cioOperatingBriefItems={cioOperatingBriefItems}
                            candidateVisibleCount={candidateVisibleCount}
                            tradeTicketCount={tradeTickets.length}
                            platformExceptionCount={platformExceptionItems.length}
                          />

                          <SlaEscalationSection
                            slaEscalationDecision={slaEscalationDecision}
                            slaCriticalHours={slaCriticalHours}
                            onSlaCriticalHoursChange={setSlaCriticalHours}
                            slaReviewHours={slaReviewHours}
                            onSlaReviewHoursChange={setSlaReviewHours}
                            onExportSlaEscalationCsv={handleExportSlaEscalationCsv}
                            slaEscalationItems={slaEscalationItems}
                            slaCriticalCount={slaCriticalCount}
                            slaReviewCount={slaReviewCount}
                          />

                          <OperatingKriSection
                            operatingKriDecision={operatingKriDecision}
                            onExportOperatingKriCsv={handleExportOperatingKriCsv}
                            operatingKriItems={operatingKriItems}
                            operatingKriBlockCount={operatingKriBlockCount}
                            operatingKriWatchCount={operatingKriWatchCount}
                            totalExecutionCost={totalExecutionCost}
                            totalFilledNotional={totalFilledNotional}
                            totalUnfilledNotional={totalUnfilledNotional}
                          />

                          <DecisionFunnelSection
                            decisionFunnelDecision={decisionFunnelDecision}
                            onExportDecisionFunnelCsv={handleExportDecisionFunnelCsv}
                            decisionFunnelStages={decisionFunnelStages}
                            decisionFunnelBlockCount={decisionFunnelBlockCount}
                            decisionFunnelWatchCount={decisionFunnelWatchCount}
                            candidateVisibleCount={candidateVisibleCount}
                            activeAllocationCount={activeAllocationRows.length}
                            tradeTicketCount={tradeTickets.length}
                            filledTradeCount={filledTradeCount}
                          />

                          <MarketAlertSection
                            marketAlertDecision={marketAlertDecision}
                            marketAlertCommandSummary={marketAlertCommandSummary}
                            onExportMarketAlertCsv={handleExportMarketAlertCsv}
                            onExportMarketAlertCommandSummaryCsv={handleExportMarketAlertCommandSummaryCsv}
                            onExportMarketAlertOwnerQueueCsv={handleExportMarketAlertOwnerQueueCsv}
                            onExportMarketAlertRunbookCsv={handleExportMarketAlertRunbookCsv}
                            marketAlertEvents={marketAlertEvents}
                            marketAlertOwnerQueues={marketAlertOwnerQueues}
                            marketAlertRunbookItems={marketAlertRunbookItems}
                            marketHighAlertCount={marketHighAlertCount}
                            marketMediumAlertCount={marketMediumAlertCount}
                            platformExceptionCount={platformExceptionItems.length}
                          />
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

              <AssetComparisonTable rows={visibleComparisonRows} onLoadAssetProfile={handleLoadAssetProfile} />
            </div>
          ) : (
            <div className="border border-dashed border-slate-800 rounded-lg p-4 text-xs text-slate-500">
              輸入多個商品代號後，這裡會顯示 watchlist 橫向比較。
            </div>
          )}
        </section>

        <MarketSourceInventorySection sources={sources} isLoading={isLoading} error={error} />
      </section>

      <SecurityNotesSection notes={data?.securityNotes ?? []} />

      <BigQueryPortfolioPanel hasBigQueryCredentials={hasBigQueryCredentials} />
    </div>
  );
}
