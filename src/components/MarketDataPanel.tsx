import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  formatPrice,
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
  applyBigQueryAdjustedBackfill,
  fetchBigQueryAdjustedBackfillApplyStatus,
  fetchBigQueryAdjustedBackfillPlan,
  fetchBigQueryAssetHistory,
  fetchBigQueryAssetProfile,
  fetchBigQueryAssets,
  fetchBigQueryQuoteCards,
  fetchLatestDecisionFunnelFromBigQuery,
  fetchLatestExecutionFillsFromBigQuery,
  fetchMarketAlertWarehouseAudit,
  fetchLatestMarketAlertOwnerQueuesFromBigQuery,
  fetchLatestMarketAlertRunbooksFromBigQuery,
  fetchLatestMarketAlertsFromBigQuery,
  fetchLatestExecutionRouteEventsFromBigQuery,
  fetchLatestExecutionRoutesFromBigQuery,
  fetchLatestOperatingKriFromBigQuery,
  fetchLatestPlatformExceptionsFromBigQuery,
  fetchLatestPostTradeAttributionsFromBigQuery,
  fetchLatestSlaEscalationsFromBigQuery,
  fetchLatestTradeTicketsFromBigQuery,
  fetchLatestResearchTasksFromBigQuery,
  fetchResearchTaskSyncAudit,
  fetchResearchTaskWarehouseStatus,
  syncDecisionFunnelToBigQuery,
  syncExecutionFillsToBigQuery,
  syncExecutionRouteEventsToBigQuery,
  syncExecutionRoutesToBigQuery,
  syncMarketAlertOwnerQueuesToBigQuery,
  syncMarketAlertRunbooksToBigQuery,
  syncMarketAlertsToBigQuery,
  syncOperatingKriToBigQuery,
  syncPlatformExceptionsToBigQuery,
  syncPostTradeAttributionsToBigQuery,
  syncSlaEscalationsToBigQuery,
  syncTradeTicketsToBigQuery,
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
  apiVersionGovernanceCsv,
  buildApiContractBlueprintItems,
  buildApiServiceCatalogItems,
  buildApiVersionGovernanceItems,
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
  buildDataProductObservabilityItems,
  buildDataProductReliabilityActions,
  buildDataProductSloItems,
  dataProductObservabilityCsv,
  dataProductReliabilityActionsCsv,
  dataProductSloCsv,
  summarizeDataProductObservability,
  summarizeDataProductSlo,
} from "@/lib/dataProductObservability";
import {
  buildDataProductErrorBudgetItems,
  dataProductErrorBudgetCsv,
  summarizeDataProductErrorBudget,
} from "@/lib/dataProductErrorBudget";
import {
  buildDataProductClientImpactItems,
  dataProductClientImpactCsv,
  summarizeDataProductClientImpact,
} from "@/lib/dataProductClientImpact";
import {
  buildDataProductStatusPageItems,
  dataProductStatusPageCsv,
  summarizeDataProductStatusPage,
} from "@/lib/dataProductStatusPage";
import {
  adjustedBackfillManualReviewCsv,
  buildCoverageUniverseItems,
  buildAdjustedBackfillManualReviewRows,
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
  buildMarketAlertOwnerQueueSyncPayload,
  buildMarketAlertRunbookItems,
  marketAlertRunbookCsv,
  buildMarketAlertRunbookSyncPayload,
  buildMarketAlertCommandSummary,
  buildMarketAlertSyncPayload,
  marketAlertCommandSummaryCsv,
} from "@/lib/marketAlertEvents";
import {
  applyResearchTaskOverrides,
  buildResearchTaskSyncPayload,
  buildResearchTaskLifecycle,
  buildResearchTaskItems,
  buildResearchTaskSummary,
  loadResearchTaskOverridesFromStorage,
  loadResearchTaskWorkspaceIdFromStorage,
  researchTaskBigQueryDdl,
  researchTaskBigQuerySchemaJson,
  researchTaskCsv,
  researchTaskLifecycleCsv,
  researchTaskSyncAuditCsv,
  researchTaskSyncPayloadJson,
  writeResearchTaskOverridesToStorage,
  writeResearchTaskWorkspaceIdToStorage,
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
  buildDecisionFunnelSyncPayload,
  buildOperatingKriItems,
  buildOperatingKriSyncPayload,
  buildSlaEscalationSyncPayload,
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
  accountHealthCsv,
  buildAccountHealthItems,
  summarizeAccountHealth,
} from "@/lib/accountHealth";
import {
  accountActionQueueCsv,
  buildAccountActionQueueItems,
  summarizeAccountActionQueue,
} from "@/lib/accountActionQueue";
import {
  buildPlatformCommandSearchItems,
  platformCommandSearchCsv,
  summarizePlatformCommandSearch,
} from "@/lib/platformCommandSearch";
import {
  buildPlatformCommandTriageItems,
  platformCommandTriageCsv,
  summarizePlatformCommandTriage,
} from "@/lib/platformCommandTriage";
import {
  buildPlatformCommandSlaItems,
  platformCommandSlaCsv,
  summarizePlatformCommandSla,
} from "@/lib/platformCommandSla";
import {
  buildPlatformCommandOwnerLoadItems,
  platformCommandOwnerLoadCsv,
  summarizePlatformCommandOwnerLoad,
} from "@/lib/platformCommandOwnerLoad";
import {
  buildPlatformCommandHandoffItems,
  platformCommandHandoffCsv,
  summarizePlatformCommandHandoff,
} from "@/lib/platformCommandHandoff";
import {
  buildPlatformCommandClosureItems,
  platformCommandClosureCsv,
  summarizePlatformCommandClosure,
} from "@/lib/platformCommandClosure";
import {
  buildPlatformCommandPostmortemItems,
  platformCommandPostmortemCsv,
  summarizePlatformCommandPostmortem,
} from "@/lib/platformCommandPostmortem";
import {
  buildPlatformCommandImprovementBacklogItems,
  platformCommandImprovementBacklogCsv,
  summarizePlatformCommandImprovementBacklog,
} from "@/lib/platformCommandImprovementBacklog";
import {
  buildPlatformCommandReleaseReadinessItems,
  platformCommandReleaseReadinessCsv,
  summarizePlatformCommandReleaseReadiness,
} from "@/lib/platformCommandReleaseReadiness";
import {
  buildPlatformCommandReleaseMonitorItems,
  platformCommandReleaseMonitorCsv,
  summarizePlatformCommandReleaseMonitor,
} from "@/lib/platformCommandReleaseMonitor";
import {
  buildPlatformCommandOperatingReviewItems,
  platformCommandOperatingReviewCsv,
  summarizePlatformCommandOperatingReview,
} from "@/lib/platformCommandOperatingReview";
import {
  buildPlatformCommandExecutiveBriefItems,
  platformCommandExecutiveBriefCsv,
  summarizePlatformCommandExecutiveBrief,
} from "@/lib/platformCommandExecutiveBrief";
import {
  buildPlatformCommandDecisionRegisterItems,
  platformCommandDecisionRegisterCsv,
  summarizePlatformCommandDecisionRegister,
} from "@/lib/platformCommandDecisionRegister";
import {
  buildPlatformCommandDecisionFollowUpItems,
  platformCommandDecisionFollowUpCsv,
  summarizePlatformCommandDecisionFollowUp,
} from "@/lib/platformCommandDecisionFollowUp";
import {
  buildPlatformCommandEvidenceLedgerItems,
  platformCommandEvidenceLedgerCsv,
  summarizePlatformCommandEvidenceLedger,
} from "@/lib/platformCommandEvidenceLedger";
import {
  buildPlatformCommandAuditTrailItems,
  platformCommandAuditTrailCsv,
  summarizePlatformCommandAuditTrail,
} from "@/lib/platformCommandAuditTrail";
import {
  buildPlatformCommandComplianceAttestationItems,
  platformCommandComplianceAttestationCsv,
  summarizePlatformCommandComplianceAttestation,
} from "@/lib/platformCommandComplianceAttestation";
import {
  buildPlatformCommandBoardReportingItems,
  platformCommandBoardReportingCsv,
  summarizePlatformCommandBoardReporting,
} from "@/lib/platformCommandBoardReporting";
import {
  buildPlatformCommandClientReadoutItems,
  platformCommandClientReadoutCsv,
  summarizePlatformCommandClientReadout,
} from "@/lib/platformCommandClientReadout";
import {
  buildPlatformCommandProductPackagingItems,
  platformCommandProductPackagingCsv,
  summarizePlatformCommandProductPackaging,
} from "@/lib/platformCommandProductPackaging";
import {
  buildPlatformCommandRevenueReadinessItems,
  platformCommandRevenueReadinessCsv,
  summarizePlatformCommandRevenueReadiness,
} from "@/lib/platformCommandRevenueReadiness";
import {
  buildPlatformCommandGtmLaunchItems,
  platformCommandGtmLaunchCsv,
  summarizePlatformCommandGtmLaunch,
} from "@/lib/platformCommandGtmLaunch";
import {
  buildPlatformCommandCustomerSuccessActivationItems,
  platformCommandCustomerSuccessActivationCsv,
  summarizePlatformCommandCustomerSuccessActivation,
} from "@/lib/platformCommandCustomerSuccessActivation";
import {
  buildPlatformCommandExpansionPlaybookItems,
  platformCommandExpansionPlaybookCsv,
  summarizePlatformCommandExpansionPlaybook,
} from "@/lib/platformCommandExpansionPlaybook";
import {
  buildPlatformCommandRenewalForecastItems,
  platformCommandRenewalForecastCsv,
  summarizePlatformCommandRenewalForecast,
} from "@/lib/platformCommandRenewalForecast";
import {
  buildPlatformCommandRevenueOperationsLedgerItems,
  platformCommandRevenueOperationsLedgerCsv,
  summarizePlatformCommandRevenueOperationsLedger,
} from "@/lib/platformCommandRevenueOperationsLedger";
import {
  buildPlatformCommandUnitEconomicsItems,
  platformCommandUnitEconomicsCsv,
  summarizePlatformCommandUnitEconomics,
} from "@/lib/platformCommandUnitEconomics";
import {
  buildPlatformCommandPricingGovernanceItems,
  platformCommandPricingGovernanceCsv,
  summarizePlatformCommandPricingGovernance,
} from "@/lib/platformCommandPricingGovernance";
import {
  buildPlatformCommandQuoteDeskItems,
  platformCommandQuoteDeskCsv,
  summarizePlatformCommandQuoteDesk,
} from "@/lib/platformCommandQuoteDesk";
import {
  buildPlatformCommandEntitlementProvisioningItems,
  platformCommandEntitlementProvisioningCsv,
  summarizePlatformCommandEntitlementProvisioning,
} from "@/lib/platformCommandEntitlementProvisioning";
import {
  buildPlatformCommandSubscriptionBillingItems,
  platformCommandSubscriptionBillingCsv,
  summarizePlatformCommandSubscriptionBilling,
} from "@/lib/platformCommandSubscriptionBilling";
import {
  buildPlatformCommandSlaOperationsItems,
  platformCommandSlaOperationsCsv,
  summarizePlatformCommandSlaOperations,
} from "@/lib/platformCommandSlaOperations";
import {
  buildPlatformCommandUsageMonitoringItems,
  platformCommandUsageMonitoringCsv,
  summarizePlatformCommandUsageMonitoring,
} from "@/lib/platformCommandUsageMonitoring";
import {
  buildPlatformCommandRevenueAuditItems,
  platformCommandRevenueAuditCsv,
  summarizePlatformCommandRevenueAudit,
} from "@/lib/platformCommandRevenueAudit";
import {
  buildPlatformCommandCustomerHealthItems,
  platformCommandCustomerHealthCsv,
  summarizePlatformCommandCustomerHealth,
} from "@/lib/platformCommandCustomerHealth";
import {
  buildPlatformCommandManagementOverviewItems,
  platformCommandManagementOverviewCsv,
  summarizePlatformCommandManagementOverview,
} from "@/lib/platformCommandManagementOverview";
import {
  buildPlatformCommandBoardPackItems,
  platformCommandBoardPackCsv,
  summarizePlatformCommandBoardPack,
} from "@/lib/platformCommandBoardPack";
import {
  buildPlatformCommandOperatingControlTowerItems,
  platformCommandOperatingControlTowerCsv,
  summarizePlatformCommandOperatingControlTower,
} from "@/lib/platformCommandOperatingControlTower";
import {
  buildPlatformCommandCeoDecisionConsoleItems,
  platformCommandCeoDecisionConsoleCsv,
  summarizePlatformCommandCeoDecisionConsole,
} from "@/lib/platformCommandCeoDecisionConsole";
import {
  buildPlatformCommandStakeholderOutputPackItems,
  platformCommandStakeholderOutputPackCsv,
  summarizePlatformCommandStakeholderOutputPack,
} from "@/lib/platformCommandStakeholderOutputPack";
import {
  buildPlatformCommandProductNavigatorItems,
  loadPlatformCommandProductNavigatorAreaFromStorage,
  summarizePlatformCommandProductNavigator,
  type PlatformCommandProductNavigatorActiveArea,
  type PlatformCommandProductNavigatorStatus,
  writePlatformCommandProductNavigatorAreaToStorage,
} from "@/lib/platformCommandProductNavigator";
import {
  buildPlatformCommandLaunchReadinessItems,
  summarizePlatformCommandLaunchReadiness,
} from "@/lib/platformCommandLaunchReadiness";
import {
  executionReviewCsv,
  tradeExecutionReviewItems,
  tradeMonitoringRuleItems,
} from "@/lib/executionReviewWorkflow";
import {
  buildExecutionHandoffItems,
  buildPlatformExceptionSyncPayload,
  buildPostTradeAttributionSyncPayload,
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
  buildExecutionFillSyncPayload,
  buildExecutionRouteEventRows,
  buildExecutionRouteEventSyncPayload,
  buildExecutionRouteRows,
  buildExecutionRouteSyncPayload,
  buildTradeTicketApprovalGateItems,
  buildTradeTicketSyncPayload,
  executionFillCsv,
  executionRouteEventCsv,
  executionRouteCsv,
  tradeBatchCsv,
  tradeBatchRows,
  tradeTicketApprovalGateCsv,
  tradeTicketCsv,
  tradeTicketRows,
  type BrokerBoundaryMode,
  type ExecutionReviewStatus,
} from "@/lib/tradeExecutionWorkflow";
import type {
  BigQueryAdjustedBackfillPlanResponse,
  BigQueryAdjustedBackfillApplyStatusResponse,
  BigQueryAdjustedBackfillCandidate,
  BigQueryAdjustedStaleSymbol,
  BigQueryAsset,
  BigQueryAssetHistoryResponse,
  BigQueryAssetProfileResponse,
  BigQueryQuoteCard,
  ResearchTaskWarehouseAuditRecord,
  ResearchTaskWarehouseStatus,
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
import { AccountActionQueueSection } from "./AccountActionQueueSection";
import { AccountHealthSection } from "./AccountHealthSection";
import { CioOperatingBriefSection } from "./CioOperatingBriefSection";
import { CommitteeApprovalSection } from "./CommitteeApprovalSection";
import { CommercializationSection } from "./CommercializationSection";
import { MarketDataConsoleHeader } from "./MarketDataConsoleHeader";
import { DataOperationsSection } from "./DataOperationsSection";
import { DataProductClientImpactSection } from "./DataProductClientImpactSection";
import { DataProductErrorBudgetSection } from "./DataProductErrorBudgetSection";
import { DataProductObservabilitySection } from "./DataProductObservabilitySection";
import { DataProductStatusPageSection } from "./DataProductStatusPageSection";
import { DecisionFunnelSection } from "./DecisionFunnelSection";
import { DecisionAuditSection } from "./DecisionAuditSection";
import { EnterpriseReadinessSection } from "./EnterpriseReadinessSection";
import { ExecutionFillSection } from "./ExecutionFillSection";
import { ExecutionHandoffSection } from "./ExecutionHandoffSection";
import { ExecutionRouteEventSection } from "./ExecutionRouteEventSection";
import { ExecutionReviewSection } from "./ExecutionReviewSection";
import { ExecutionRoutingSection } from "./ExecutionRoutingSection";
import { MonitoringRulesSection } from "./MonitoringRulesSection";
import { MarketAlertSection } from "./MarketAlertSection";
import { MarketSourceInventorySection } from "./MarketSourceInventorySection";
import { OperatingKriSection } from "./OperatingKriSection";
import { PolicyLimitSection } from "./PolicyLimitSection";
import { PlatformCommandHandoffSection } from "./PlatformCommandHandoffSection";
import { PlatformCommandClosureSection } from "./PlatformCommandClosureSection";
import { PlatformCommandImprovementBacklogSection } from "./PlatformCommandImprovementBacklogSection";
import { PlatformCommandOwnerLoadSection } from "./PlatformCommandOwnerLoadSection";
import { PlatformCommandPostmortemSection } from "./PlatformCommandPostmortemSection";
import { PlatformCommandReleaseReadinessSection } from "./PlatformCommandReleaseReadinessSection";
import { PlatformCommandReleaseMonitorSection } from "./PlatformCommandReleaseMonitorSection";
import { PlatformCommandOperatingReviewSection } from "./PlatformCommandOperatingReviewSection";
import { PlatformCommandExecutiveBriefSection } from "./PlatformCommandExecutiveBriefSection";
import { PlatformCommandDecisionRegisterSection } from "./PlatformCommandDecisionRegisterSection";
import { PlatformCommandDecisionFollowUpSection } from "./PlatformCommandDecisionFollowUpSection";
import { PlatformCommandEvidenceLedgerSection } from "./PlatformCommandEvidenceLedgerSection";
import { PlatformCommandAuditTrailSection } from "./PlatformCommandAuditTrailSection";
import { PlatformCommandComplianceAttestationSection } from "./PlatformCommandComplianceAttestationSection";
import { PlatformCommandBoardReportingSection } from "./PlatformCommandBoardReportingSection";
import { PlatformCommandClientReadoutSection } from "./PlatformCommandClientReadoutSection";
import { PlatformCommandProductPackagingSection } from "./PlatformCommandProductPackagingSection";
import { PlatformCommandRevenueReadinessSection } from "./PlatformCommandRevenueReadinessSection";
import { PlatformCommandGtmLaunchSection } from "./PlatformCommandGtmLaunchSection";
import { PlatformCommandCustomerSuccessActivationSection } from "./PlatformCommandCustomerSuccessActivationSection";
import { PlatformCommandExpansionPlaybookSection } from "./PlatformCommandExpansionPlaybookSection";
import { PlatformCommandRenewalForecastSection } from "./PlatformCommandRenewalForecastSection";
import { PlatformCommandRevenueOperationsLedgerSection } from "./PlatformCommandRevenueOperationsLedgerSection";
import { PlatformCommandUnitEconomicsSection } from "./PlatformCommandUnitEconomicsSection";
import { PlatformCommandPricingGovernanceSection } from "./PlatformCommandPricingGovernanceSection";
import { PlatformCommandQuoteDeskSection } from "./PlatformCommandQuoteDeskSection";
import { PlatformCommandEntitlementProvisioningSection } from "./PlatformCommandEntitlementProvisioningSection";
import { PlatformCommandSubscriptionBillingSection } from "./PlatformCommandSubscriptionBillingSection";
import { PlatformCommandSlaOperationsSection } from "./PlatformCommandSlaOperationsSection";
import { PlatformCommandUsageMonitoringSection } from "./PlatformCommandUsageMonitoringSection";
import { PlatformCommandRevenueAuditSection } from "./PlatformCommandRevenueAuditSection";
import { PlatformCommandCustomerHealthSection } from "./PlatformCommandCustomerHealthSection";
import { PlatformCommandManagementOverviewSection } from "./PlatformCommandManagementOverviewSection";
import { PlatformCommandBoardPackSection } from "./PlatformCommandBoardPackSection";
import { PlatformCommandOperatingControlTowerSection } from "./PlatformCommandOperatingControlTowerSection";
import { PlatformCommandCeoDecisionConsoleSection } from "./PlatformCommandCeoDecisionConsoleSection";
import { PlatformCommandStakeholderOutputPackSection } from "./PlatformCommandStakeholderOutputPackSection";
import { PlatformCommandLaunchReadinessSection } from "./PlatformCommandLaunchReadinessSection";
import { PlatformCommandProductNavigatorSection } from "./PlatformCommandProductNavigatorSection";
import { PlatformCommandSearchSection } from "./PlatformCommandSearchSection";
import { PlatformCommandSlaSection } from "./PlatformCommandSlaSection";
import { PlatformCommandTriageSection } from "./PlatformCommandTriageSection";
import { PlatformExceptionSection } from "./PlatformExceptionSection";
import { PostTradeAttributionSection } from "./PostTradeAttributionSection";
import { RebalanceDraftSection } from "./RebalanceDraftSection";
import { ResearchTaskBoardSection } from "./ResearchTaskBoardSection";
import { SecurityNotesSection } from "./SecurityNotesSection";
import type { MarketAlertWarehouseAuditRecord } from "@/types/market";
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

type MarketDataWorkspace = "quotes" | "portfolio";
type DailyQuoteFilter = "all" | "loaded" | "error";
type DailyQuoteSortKey = "symbol" | "latestDate" | "latestPrice" | "dailyReturn" | "ytdReturn" | "status";
type SortDirection = "asc" | "desc";
type DailyQuoteQualityLevel = "ready" | "watch" | "risk";

type DailyMarketQuoteRow = {
  symbol: string;
  latestAnyDate: string | null;
  latestDate: string | null;
  latestPrice: number | null;
  dailyReturn: number | null;
  dailyPriceChange: number | null;
  ytdReturn: number | null;
  ytdPriceChange: number | null;
  ytdStartDate: string | null;
  ytdStartPrice: number | null;
  priceBasis: "adjusted" | "raw";
  rowCount: number | null;
  selectedPriceRows: number | null;
  status: "loaded" | "error";
  errorMessage?: string;
  alternatePriceBasis?: "adjusted" | "raw";
  alternateLatestDate?: string | null;
  alternateLatestPrice?: number | null;
  alternateSelectedPriceRows?: number | null;
};

type DailyQuoteQuality = {
  level: DailyQuoteQualityLevel;
  label: string;
  note: string;
};

type AdjustedRepairPlanRow = {
  symbol: string;
  severity: "safe" | "block" | "watch";
  issueLabel: string;
  rawLatestDate: string;
  adjustedLatestDate: string;
  lagText: string;
  coverageText: string;
  action: string;
  canUseRaw: boolean;
  canApply: boolean;
  proposedText: string;
  riskText: string;
};

const EMPTY_ADJUSTED_STALE_SYMBOLS: BigQueryAdjustedStaleSymbol[] = [];

function finiteMarketNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function priceBasisLabel(priceBasis: "adjusted" | "raw") {
  return priceBasis === "raw" ? "Raw" : "Adj";
}

function priceBasisColumnName(priceBasis: "adjusted" | "raw") {
  return priceBasis === "raw" ? "raw_price" : "adj_price";
}

function daysBetweenIsoDates(laterDate: string | null | undefined, earlierDate: string | null | undefined) {
  if (!laterDate || !earlierDate) return null;
  const laterTime = Date.parse(laterDate);
  const earlierTime = Date.parse(earlierDate);
  if (!Number.isFinite(laterTime) || !Number.isFinite(earlierTime)) return null;
  return Math.max(0, Math.round((laterTime - earlierTime) / 86400000));
}

function parseDailyQuoteSymbols(input: string, limit = 500) {
  const rawParts = input
    .split(/[\n,，、;；]+/)
    .map((part) => part.trim())
    .filter(Boolean);
  const symbols = rawParts.flatMap((part) => {
    const tokens = part.split(/\s+/).filter(Boolean);
    const looksLikeTickerList =
      tokens.length > 1 &&
      tokens.every((token) => /^[A-Za-z0-9.^=_-]+$/.test(token));
    return looksLikeTickerList ? tokens : [part];
  });

  return dedupeDailyQuoteSymbols(symbols, limit);
}

function dedupeDailyQuoteSymbols(symbols: string[], limit = 500) {
  const seenSymbols = new Set<string>();
  return symbols
    .map((symbol) => symbol.trim())
    .filter(Boolean)
    .filter((symbol) => {
      const normalizedSymbol = symbol.toUpperCase();
      if (seenSymbols.has(normalizedSymbol)) return false;
      seenSymbols.add(normalizedSymbol);
      return true;
    })
    .slice(0, limit);
}

async function withClientTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string,
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

function dailyQuoteRowFromHistory(
  symbol: string,
  history: BigQueryAssetHistoryResponse,
  priceBasis: "adjusted" | "raw",
): DailyMarketQuoteRow {
  const validPrices = history.prices
    .filter((point) => point.date && finiteMarketNumber(point.selected_price) !== null && Number(point.selected_price) > 0)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const latest = validPrices[validPrices.length - 1];
  const previous = validPrices[validPrices.length - 2];
  const latestPrice = finiteMarketNumber(latest?.selected_price);
  const previousPrice = finiteMarketNumber(previous?.selected_price);
  const latestYear = latest?.date?.slice(0, 4) ?? "";
  const ytdStart = validPrices.find((point) => point.date?.startsWith(latestYear));
  const ytdStartPrice = finiteMarketNumber(ytdStart?.selected_price);
  const dailyReturn =
    latestPrice !== null && previousPrice !== null && previousPrice > 0
      ? latestPrice / previousPrice - 1
      : finiteMarketNumber(latest?.daily_return);
  const ytdReturn =
    latestPrice !== null && ytdStartPrice !== null && ytdStartPrice > 0
      ? latestPrice / ytdStartPrice - 1
      : null;

  return {
    symbol: history.symbol || symbol,
    latestAnyDate: history.summary.latest_date,
    latestDate: latest?.date ?? history.summary.latest_date,
    latestPrice,
    dailyReturn,
    dailyPriceChange: latestPrice !== null && previousPrice !== null ? latestPrice - previousPrice : null,
    ytdReturn,
    ytdPriceChange: latestPrice !== null && ytdStartPrice !== null ? latestPrice - ytdStartPrice : null,
    ytdStartDate: ytdStart?.date ?? null,
    ytdStartPrice,
    priceBasis,
    rowCount: history.summary.row_count,
    selectedPriceRows: history.summary.selected_price_rows,
    status: latestPrice !== null ? "loaded" : "error",
    errorMessage: latestPrice !== null ? undefined : "BigQuery 歷史資料沒有可用價格。",
  };
}

function dailyQuoteRowFromQuoteCard(
  quote: BigQueryQuoteCard,
  priceBasis: "adjusted" | "raw",
): DailyMarketQuoteRow {
  const latestPrice = finiteMarketNumber(quote.latest_price);
  const ytdStartPrice = finiteMarketNumber(quote.ytd_start_price);
  const dailyReturn = finiteMarketNumber(quote.daily_return);
  const ytdReturn = finiteMarketNumber(quote.ytd_return);

  return {
    symbol: quote.symbol,
    latestAnyDate: quote.latest_any_date,
    latestDate: quote.latest_date ?? quote.latest_any_date,
    latestPrice,
    dailyReturn,
    dailyPriceChange: finiteMarketNumber(quote.daily_price_change),
    ytdReturn,
    ytdPriceChange: finiteMarketNumber(quote.ytd_price_change),
    ytdStartDate: quote.ytd_start_date,
    ytdStartPrice,
    priceBasis,
    rowCount: quote.row_count,
    selectedPriceRows: quote.selected_price_rows,
    status: latestPrice !== null ? "loaded" : "error",
    errorMessage: latestPrice !== null
      ? undefined
      : `BigQuery 有 ${quote.row_count.toLocaleString()} 筆資料，但 ${priceBasisColumnName(priceBasis)} 沒有可用價格。`,
  };
}

function annotateDailyRowsWithAlternateQuoteCards(
  rows: DailyMarketQuoteRow[],
  alternateQuotes: BigQueryQuoteCard[],
  alternatePriceBasis: "adjusted" | "raw",
) {
  const alternateQuoteBySymbol = new Map(
    alternateQuotes.map((quote) => [quote.symbol.toUpperCase(), quote]),
  );

  return rows.map((row) => {
    if (row.status === "loaded") return row;

    const alternateQuote = alternateQuoteBySymbol.get(row.symbol.toUpperCase());
    const alternateLatestPrice = finiteMarketNumber(alternateQuote?.latest_price);
    if (!alternateQuote || alternateLatestPrice === null) return row;

    const alternateLatestDate = alternateQuote.latest_date ?? alternateQuote.latest_any_date;
    return {
      ...row,
      alternatePriceBasis,
      alternateLatestDate,
      alternateLatestPrice,
      alternateSelectedPriceRows: alternateQuote.selected_price_rows,
      errorMessage: `${priceBasisLabel(row.priceBasis)} 缺可用價格；${priceBasisLabel(alternatePriceBasis)} 可用 ${alternateLatestDate ?? "--"} / ${formatPrice(alternateLatestPrice)}。`,
    };
  });
}

async function loadDailyRowsFromQuoteCards(
  priceBasis: "adjusted" | "raw",
  limit = 500,
): Promise<DailyMarketQuoteRow[]> {
  const response = await withClientTimeout(
    fetchBigQueryQuoteCards(priceBasis, limit),
    15000,
    "BigQuery 全部行情讀取逾時：前端 15 秒內沒有收到回應。",
  );

  const rows = response.quotes.map((quote) => dailyQuoteRowFromQuoteCard(quote, priceBasis));
  if (!rows.some((row) => row.status === "error")) return rows;

  const alternatePriceBasis = priceBasis === "adjusted" ? "raw" : "adjusted";
  try {
    const alternateResponse = await withClientTimeout(
      fetchBigQueryQuoteCards(alternatePriceBasis, limit),
      8000,
      `BigQuery ${priceBasisLabel(alternatePriceBasis)} 備用行情讀取逾時。`,
    );
    return annotateDailyRowsWithAlternateQuoteCards(
      rows,
      alternateResponse.quotes,
      alternatePriceBasis,
    );
  } catch {
    return rows;
  }
}

async function loadDailyRowsForSymbols(
  symbols: string[],
  priceBasis: "adjusted" | "raw",
): Promise<DailyMarketQuoteRow[]> {
  const uniqueSymbols = dedupeDailyQuoteSymbols(symbols, 500);
  let quoteRows: DailyMarketQuoteRow[];
  try {
    quoteRows = await loadDailyRowsFromQuoteCards(priceBasis, Math.max(500, uniqueSymbols.length));
  } catch {
    return loadDailyRowsFromHistoryFallback(uniqueSymbols, priceBasis);
  }
  const rowsBySymbol = new Map(quoteRows.map((row) => [row.symbol.toUpperCase(), row]));

  return uniqueSymbols.map((symbol) => rowsBySymbol.get(symbol.toUpperCase()) ?? {
    symbol,
    latestAnyDate: null,
    latestDate: null,
    latestPrice: null,
    dailyReturn: null,
    dailyPriceChange: null,
    ytdReturn: null,
    ytdPriceChange: null,
    ytdStartDate: null,
    ytdStartPrice: null,
    priceBasis,
    rowCount: null,
    selectedPriceRows: null,
    status: "error",
    errorMessage: "BigQuery 全部行情清單沒有找到這個標的。",
  });
}

async function loadDailyRowsFromHistoryFallback(
  symbols: string[],
  priceBasis: "adjusted" | "raw",
): Promise<DailyMarketQuoteRow[]> {
  const uniqueSymbols = dedupeDailyQuoteSymbols(symbols, 500);
  const settledRows = await Promise.allSettled(
    uniqueSymbols.map((symbol) =>
      withClientTimeout(
        fetchBigQueryAssetHistory(symbol, priceBasis, { limit: 400 }),
        15000,
        `BigQuery ${symbol} 歷史資料讀取逾時：15 秒內沒有收到回應。`,
      ),
    ),
  );

  return uniqueSymbols.map((symbol, index) => {
    const result = settledRows[index];
    if (result.status === "fulfilled") {
      return dailyQuoteRowFromHistory(symbol, result.value, priceBasis);
    }

    return {
      symbol,
      latestAnyDate: null,
      latestDate: null,
      latestPrice: null,
      dailyReturn: null,
      dailyPriceChange: null,
      ytdReturn: null,
      ytdPriceChange: null,
      ytdStartDate: null,
      ytdStartPrice: null,
      priceBasis,
      rowCount: null,
      selectedPriceRows: null,
      status: "error",
      errorMessage: result.reason instanceof Error ? result.reason.message : String(result.reason),
    };
  });
}

function formatSignedPercent(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "--";
  const percent = value * 100;
  const sign = percent > 0 ? "+" : "";
  return `${sign}${percent.toFixed(2)}%`;
}

function formatSignedPrice(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "--";
  const sign = value > 0 ? "+" : "";
  return `${sign}${formatPrice(value)}`;
}

function dailyReturnTextClass(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "text-slate-400";
  if (value > 0) return "text-emerald-200";
  if (value < 0) return "text-rose-200";
  return "text-slate-300";
}

function dailyQuoteQuality(row: DailyMarketQuoteRow): DailyQuoteQuality {
  if (row.status === "error") {
    if (row.alternatePriceBasis) {
      return {
        level: "watch",
        label: `${priceBasisLabel(row.priceBasis)} 缺`,
        note: `可切 ${priceBasisLabel(row.alternatePriceBasis)} 查看價格`,
      };
    }
    return {
      level: "risk",
      label: "不可用",
      note: row.errorMessage || "BigQuery 沒有可用價格",
    };
  }

  const lagDays = daysBetweenIsoDates(row.latestAnyDate, row.latestDate);
  if (row.priceBasis === "adjusted" && lagDays !== null && lagDays >= 7) {
    return {
      level: lagDays >= 30 ? "risk" : "watch",
      label: "Adj 延遲",
      note: `晚於原始最新日 ${lagDays} 天`,
    };
  }

  const absoluteYtdReturn = Math.abs(row.ytdReturn ?? 0);
  if (row.priceBasis === "raw" && absoluteYtdReturn >= 1) {
    return {
      level: "risk",
      label: "Raw 異常",
      note: "報酬率可能受單位、配息或拆分影響",
    };
  }
  if (row.priceBasis === "raw" && absoluteYtdReturn >= 0.5) {
    return {
      level: "watch",
      label: "Raw 觀察",
      note: "報酬率偏大，正式分析建議核對 Adj",
    };
  }

  return {
    level: "ready",
    label: "可分析",
    note: row.priceBasis === "raw" ? "Raw 可查價，投組分析仍建議核對 Adj" : "資料口徑可用",
  };
}

function dailyQuoteQualityBadgeClass(level: DailyQuoteQualityLevel) {
  if (level === "risk") return "bg-rose-500/15 text-rose-200";
  if (level === "watch") return "bg-amber-500/15 text-amber-200";
  return "bg-emerald-500/15 text-emerald-200";
}

function dailyQuoteSortValue(row: DailyMarketQuoteRow, sortKey: DailyQuoteSortKey) {
  if (sortKey === "symbol") return row.symbol;
  if (sortKey === "latestDate") return row.latestDate;
  if (sortKey === "latestPrice") return row.latestPrice;
  if (sortKey === "dailyReturn") return row.dailyReturn;
  if (sortKey === "ytdReturn") return row.ytdReturn;
  return row.status;
}

function sortDailyQuoteRows(
  rows: DailyMarketQuoteRow[],
  sortKey: DailyQuoteSortKey,
  direction: SortDirection,
) {
  const directionFactor = direction === "asc" ? 1 : -1;
  return [...rows].sort((left, right) => {
    const leftValue = dailyQuoteSortValue(left, sortKey);
    const rightValue = dailyQuoteSortValue(right, sortKey);
    if (leftValue === null || leftValue === undefined) return 1;
    if (rightValue === null || rightValue === undefined) return -1;
    if (typeof leftValue === "number" && typeof rightValue === "number") {
      return (leftValue - rightValue) * directionFactor;
    }
    return String(leftValue).localeCompare(String(rightValue)) * directionFactor;
  });
}

function dailyQuoteIssueSummary(rows: DailyMarketQuoteRow[]) {
  const issueRows = rows.filter((row) => row.status === "error");
  if (!issueRows.length) return "";

  const switchableRows = issueRows.filter((row) => row.alternatePriceBasis);
  const switchableBasisText = Array.from(
    new Set(switchableRows.map((row) => priceBasisLabel(row.alternatePriceBasis!))),
  ).join(" / ");
  const switchableText = switchableRows.length
    ? `，其中 ${switchableRows.length} 檔可切 ${switchableBasisText} 顯示`
    : "";

  return `${issueRows.length} 檔標的目前 ${priceBasisLabel(issueRows[0].priceBasis)} 沒有可用價格${switchableText}。`;
}

function adjustedRepairBadgeClass(severity: AdjustedRepairPlanRow["severity"]) {
  if (severity === "safe") return "bg-emerald-500/15 text-emerald-200";
  return severity === "block"
    ? "bg-rose-500/15 text-rose-200"
    : "bg-amber-500/15 text-amber-200";
}

function adjustedBackfillReasonLabel(reason: string) {
  const labels: Record<string, string> = {
    no_adjusted_anchor: "沒有 Adj anchor",
    missing_positive_anchor_row: "anchor 價格無效",
    invalid_anchor_ratio: "調整比例無效",
    anchor_ratio_outlier: "調整比例異常",
    same_date_raw_price_conflict: "同日 raw 衝突",
    raw_price_jump_detected: "raw 跳價",
    no_missing_adjusted_rows_after_anchor: "無待補列",
    passed_safety_checks: "安全檢查通過",
  };
  return labels[reason] ?? reason;
}

function buildAdjustedRepairPlanRowsFromBackfillPlan(
  plan: BigQueryAdjustedBackfillPlanResponse | null,
): AdjustedRepairPlanRow[] {
  if (!plan) return [];

  return plan.candidates.map((candidate: BigQueryAdjustedBackfillCandidate) => {
    const isSafe = candidate.decision === "safe_to_apply";
    const isNothingToApply = candidate.decision === "nothing_to_apply";
    const severity: AdjustedRepairPlanRow["severity"] = isSafe ? "safe" : isNothingToApply ? "watch" : "block";
    const reasonText = candidate.reasons.map(adjustedBackfillReasonLabel).join("、") || "--";
    const firstJump = candidate.riskChecks.jumpDates[0];
    const jumpText = candidate.riskChecks.jumpDates.length
      ? `${firstJump.previousDate ?? "--"} ${formatPrice(firstJump.previousRawPrice)} -> ${firstJump.date} ${formatPrice(firstJump.rawPrice)} / ${formatSignedPercent(firstJump.dailyReturn)}`
      : candidate.riskChecks.duplicateRawConflictCount
        ? `同日 raw 衝突 ${candidate.riskChecks.duplicateRawConflictCount} 筆`
        : "未見跳價";

    return {
      symbol: candidate.symbol,
      severity,
      issueLabel: isSafe ? "可自動補" : isNothingToApply ? "無待補" : "人工覆核",
      rawLatestDate: candidate.latestRawDate ?? "--",
      adjustedLatestDate: candidate.latestAdjustedDate ?? "--",
      lagText: typeof candidate.adjustedLagDays === "number" ? `${candidate.adjustedLagDays} 天` : "無 Adj",
      coverageText: `${formatCount(candidate.adjustedPriceRows)} / ${formatCount(candidate.rawPriceRows)}`,
      action: isSafe
        ? "可用受保護端點補 adj_price"
        : `${reasonText}；先修正資料來源或確認口徑`,
      canUseRaw: candidate.latestRawDate === candidate.latestAnyDate,
      canApply: candidate.canApply,
      proposedText: candidate.proposed.rowCount
        ? `${formatCount(candidate.proposed.rowCount)} 筆 / ${candidate.proposed.firstDate ?? "--"} ~ ${candidate.proposed.latestDate ?? "--"}`
        : "--",
      riskText: jumpText,
    };
  });
}

function buildAdjustedRepairPlanRows(symbols: BigQueryAdjustedStaleSymbol[]): AdjustedRepairPlanRow[] {
  return symbols.map((symbol) => {
    const lagDays = symbol.adjusted_lag_days;
    const canUseRaw = symbol.latest_raw_date === symbol.latest_any_date && symbol.raw_lag_days === 0;
    const severity: AdjustedRepairPlanRow["severity"] = lagDays === null || lagDays >= 30 ? "block" : "watch";
    const issueLabel = lagDays === null ? "缺 Adj" : lagDays >= 30 ? "Adj 停更" : "Adj 延遲";
    const action = lagDays === null
      ? "先建立 adj_price 來源或對應代號，再放行報酬分析"
      : lagDays >= 30
        ? "重跑 adj_price 回補批次，確認配息與拆分口徑"
        : "補跑近期 adj_price，完成後重新讀取 diagnostics";

    return {
      symbol: symbol.symbol,
      severity,
      issueLabel,
      rawLatestDate: symbol.latest_raw_date ?? "--",
      adjustedLatestDate: symbol.latest_adjusted_date ?? "--",
      lagText: lagDays === null ? "無 Adj" : `${lagDays} 天`,
      coverageText: `${formatCount(symbol.adjusted_price_rows)} / ${formatCount(symbol.raw_price_rows)}`,
      action,
      canUseRaw,
      canApply: false,
      proposedText: "--",
      riskText: "等待安全計畫 API",
    };
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
  const [dailyQuotePriceBasis, setDailyQuotePriceBasis] = useState<"adjusted" | "raw">("raw");
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
  const [primaryExecutionVenue, setPrimaryExecutionVenue] = useState("Paper Broker");
  const [backupExecutionVenue, setBackupExecutionVenue] = useState("Manual Review Queue");
  const [venueCapacityAmount, setVenueCapacityAmount] = useState(500_000);
  const [routeSlippageBps, setRouteSlippageBps] = useState(6);
  const [routeCommissionBps, setRouteCommissionBps] = useState(2);
  const [brokerBoundaryMode, setBrokerBoundaryMode] = useState<BrokerBoundaryMode>("paper");
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
  const [researchTaskWorkspaceId, setResearchTaskWorkspaceId] = useState("default");
  const [researchTaskSyncStatus, setResearchTaskSyncStatus] = useState<
    "idle" | "syncing" | "loading" | "synced" | "loaded" | "error"
  >("idle");
  const [researchTaskSyncMessage, setResearchTaskSyncMessage] = useState("");
  const [researchTaskWarehouseStatus, setResearchTaskWarehouseStatus] = useState<ResearchTaskWarehouseStatus | null>(null);
  const [researchTaskWarehouseError, setResearchTaskWarehouseError] = useState("");
  const [researchTaskAuditRecords, setResearchTaskAuditRecords] = useState<ResearchTaskWarehouseAuditRecord[]>([]);
  const [researchTaskAuditError, setResearchTaskAuditError] = useState("");
  const [tradeTicketSyncStatus, setTradeTicketSyncStatus] = useState<
    "idle" | "syncing" | "loading" | "synced" | "loaded" | "error"
  >("idle");
  const [tradeTicketSyncMessage, setTradeTicketSyncMessage] = useState("");
  const [tradeTicketWarehouseCount, setTradeTicketWarehouseCount] = useState(0);
  const [executionRouteSyncStatus, setExecutionRouteSyncStatus] = useState<
    "idle" | "syncing" | "loading" | "synced" | "loaded" | "error"
  >("idle");
  const [executionRouteSyncMessage, setExecutionRouteSyncMessage] = useState("");
  const [executionRouteWarehouseCount, setExecutionRouteWarehouseCount] = useState(0);
  const [executionRouteEventSyncStatus, setExecutionRouteEventSyncStatus] = useState<
    "idle" | "syncing" | "loading" | "synced" | "loaded" | "error"
  >("idle");
  const [executionRouteEventSyncMessage, setExecutionRouteEventSyncMessage] = useState("");
  const [executionRouteEventWarehouseCount, setExecutionRouteEventWarehouseCount] = useState(0);
  const [executionFillSyncStatus, setExecutionFillSyncStatus] = useState<
    "idle" | "syncing" | "loading" | "synced" | "loaded" | "error"
  >("idle");
  const [executionFillSyncMessage, setExecutionFillSyncMessage] = useState("");
  const [executionFillWarehouseCount, setExecutionFillWarehouseCount] = useState(0);
  const [postTradeAttributionSyncStatus, setPostTradeAttributionSyncStatus] = useState<
    "idle" | "syncing" | "loading" | "synced" | "loaded" | "error"
  >("idle");
  const [postTradeAttributionSyncMessage, setPostTradeAttributionSyncMessage] = useState("");
  const [postTradeAttributionWarehouseCount, setPostTradeAttributionWarehouseCount] = useState(0);
  const [platformExceptionSyncStatus, setPlatformExceptionSyncStatus] = useState<
    "idle" | "syncing" | "loading" | "synced" | "loaded" | "error"
  >("idle");
  const [platformExceptionSyncMessage, setPlatformExceptionSyncMessage] = useState("");
  const [platformExceptionWarehouseCount, setPlatformExceptionWarehouseCount] = useState(0);
  const [slaEscalationSyncStatus, setSlaEscalationSyncStatus] = useState<
    "idle" | "syncing" | "loading" | "synced" | "loaded" | "error"
  >("idle");
  const [slaEscalationSyncMessage, setSlaEscalationSyncMessage] = useState("");
  const [slaEscalationWarehouseCount, setSlaEscalationWarehouseCount] = useState(0);
  const [operatingKriSyncStatus, setOperatingKriSyncStatus] = useState<
    "idle" | "syncing" | "loading" | "synced" | "loaded" | "error"
  >("idle");
  const [operatingKriSyncMessage, setOperatingKriSyncMessage] = useState("");
  const [operatingKriWarehouseCount, setOperatingKriWarehouseCount] = useState(0);
  const [decisionFunnelSyncStatus, setDecisionFunnelSyncStatus] = useState<
    "idle" | "syncing" | "loading" | "synced" | "loaded" | "error"
  >("idle");
  const [decisionFunnelSyncMessage, setDecisionFunnelSyncMessage] = useState("");
  const [decisionFunnelWarehouseCount, setDecisionFunnelWarehouseCount] = useState(0);
  const [marketAlertSyncStatus, setMarketAlertSyncStatus] = useState<
    "idle" | "syncing" | "loading" | "synced" | "loaded" | "error"
  >("idle");
  const [marketAlertSyncMessage, setMarketAlertSyncMessage] = useState("");
  const [marketAlertWarehouseCount, setMarketAlertWarehouseCount] = useState(0);
  const [marketAlertOwnerQueueSyncStatus, setMarketAlertOwnerQueueSyncStatus] = useState<
    "idle" | "syncing" | "loading" | "synced" | "loaded" | "error"
  >("idle");
  const [marketAlertOwnerQueueSyncMessage, setMarketAlertOwnerQueueSyncMessage] = useState("");
  const [marketAlertOwnerQueueWarehouseCount, setMarketAlertOwnerQueueWarehouseCount] = useState(0);
  const [marketAlertRunbookSyncStatus, setMarketAlertRunbookSyncStatus] = useState<
    "idle" | "syncing" | "loading" | "synced" | "loaded" | "error"
  >("idle");
  const [marketAlertRunbookSyncMessage, setMarketAlertRunbookSyncMessage] = useState("");
  const [marketAlertRunbookWarehouseCount, setMarketAlertRunbookWarehouseCount] = useState(0);
  const [marketAlertAuditStatus, setMarketAlertAuditStatus] = useState<"idle" | "loading" | "loaded" | "error">("idle");
  const [marketAlertAuditMessage, setMarketAlertAuditMessage] = useState("");
  const [marketAlertAuditRecords, setMarketAlertAuditRecords] = useState<MarketAlertWarehouseAuditRecord[]>([]);
  const [watchlistMemoCopyStatus, setWatchlistMemoCopyStatus] = useState<"idle" | "copied">("idle");
  const [activeMarketWorkspace, setActiveMarketWorkspace] = useState<MarketDataWorkspace>("quotes");
  const [dailyQuoteSymbolsText, setDailyQuoteSymbolsText] = useState("0050.TW 0056.TW 2330.TW SPY QQQ");
  const [dailyQuoteRows, setDailyQuoteRows] = useState<DailyMarketQuoteRow[]>([]);
  const [dailyQuoteStatus, setDailyQuoteStatus] = useState<"idle" | "loading" | "loaded" | "error">("idle");
  const [dailyQuoteError, setDailyQuoteError] = useState("");
  const [dailyQuoteAutoLoadStatus, setDailyQuoteAutoLoadStatus] = useState<"idle" | "loading" | "done">("idle");
  const [dailyQuoteSearch, setDailyQuoteSearch] = useState("");
  const [dailyQuoteFilter, setDailyQuoteFilter] = useState<DailyQuoteFilter>("all");
  const [dailyQuoteSortKey, setDailyQuoteSortKey] = useState<DailyQuoteSortKey>("symbol");
  const [dailyQuoteSortDirection, setDailyQuoteSortDirection] = useState<SortDirection>("asc");
  const [adjustedBackfillPlan, setAdjustedBackfillPlan] = useState<BigQueryAdjustedBackfillPlanResponse | null>(null);
  const [adjustedBackfillPlanStatus, setAdjustedBackfillPlanStatus] = useState<"idle" | "loading" | "loaded" | "error">("idle");
  const [adjustedBackfillPlanError, setAdjustedBackfillPlanError] = useState("");
  const [adjustedBackfillApplyConfig, setAdjustedBackfillApplyConfig] = useState<BigQueryAdjustedBackfillApplyStatusResponse | null>(null);
  const [adjustedBackfillApplyConfigStatus, setAdjustedBackfillApplyConfigStatus] = useState<"idle" | "loading" | "loaded" | "error">("idle");
  const [adjustedBackfillApplyConfigError, setAdjustedBackfillApplyConfigError] = useState("");
  const [adjustedBackfillAdminToken, setAdjustedBackfillAdminToken] = useState("");
  const [adjustedBackfillApplyStatus, setAdjustedBackfillApplyStatus] = useState<"idle" | "applying" | "applied" | "error">("idle");
  const [adjustedBackfillApplyMessage, setAdjustedBackfillApplyMessage] = useState("");
  const dailyQuoteAutoLoadKeyRef = useRef("");
  const [activeCommandAreaId, setActiveCommandAreaId] = useState<PlatformCommandProductNavigatorActiveArea>("all");
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
  const adjustedStaleSymbols = bigQueryDiagnostics?.adjustedStaleSymbols ?? EMPTY_ADJUSTED_STALE_SYMBOLS;
  const fxCurrencies = bigQueryDiagnostics?.fxCurrencies ?? [];
  const staleSymbolStatus: QualityStatus = staleSymbols.length >= 5 ? "risk" : staleSymbols.length > 0 ? "watch" : "strong";
  const adjustedStaleStatus: QualityStatus = adjustedStaleSymbols.length >= 5 ? "risk" : adjustedStaleSymbols.length > 0 ? "watch" : "strong";
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
      label: "Adj 落後",
      value: `${adjustedStaleSymbols.length} 檔`,
      status: bigQueryDiagnostics ? adjustedStaleStatus : "neutral",
      note: adjustedStaleSymbols.length ? "adj_price 晚於 raw/latest date，報酬分析需先修復" : "Adj 價格日期一致",
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
  const tradeTicketPortfolioId = selectedWatchlistPresetId || watchlistPresetName.trim() || "default-portfolio";
  const tradeTicketBatchId = decisionAuditId;
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
  const handoffDecision: ExecutionReviewStatus = handoffBlockCount > 0 ? "block" : handoffWatchCount > 0 ? "watch" : "pass";
  const executionFillRows = buildExecutionFillRows({
    tradeTickets,
    fillCompletionPercent,
    fillSlippageBps,
    fillCommissionBps,
  });
  const fillBlockCount = executionFillRows.filter((item) => item.fillStatus === "block").length;
  const fillWatchCount = executionFillRows.filter((item) => item.fillStatus === "watch").length;
  const executionFillDecision: ExecutionReviewStatus =
    !executionFillRows.length ? "watch" : fillBlockCount > 0 ? "block" : fillWatchCount > 0 ? "watch" : "pass";
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
    adjustedStaleStatus,
    fxCurrencyStatus,
    staleSymbols,
    adjustedStaleSymbols,
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
    adjustedStaleSymbols,
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
  const committeeApprovalDecision: ExecutionReviewStatus =
    committeeBlockCount > 0 ? "block" : committeeWatchCount > 0 ? "watch" : "pass";
  const tradeTicketApprovalGateItems = buildTradeTicketApprovalGateItems({
    tradeTickets,
    tradeBatches,
    skippedTradeCount,
    executionReviewDecision,
    committeeApprovalDecision,
    policyDecision,
    handoffDecision,
    dataReadinessDecision,
    marketAlertDecision,
    maximumBatchAmount,
    minimumTradeAmount,
    decisionOwner,
    executionOwner,
  });
  const tradeTicketApprovalBlockCount = tradeTicketApprovalGateItems.filter((item) => item.status === "block").length;
  const tradeTicketApprovalWatchCount = tradeTicketApprovalGateItems.filter((item) => item.status === "watch").length;
  const tradeTicketApprovalDecision: ExecutionReviewStatus =
    tradeTicketApprovalBlockCount > 0 ? "block" : tradeTicketApprovalWatchCount > 0 ? "watch" : "pass";
  const executionRouteRows = buildExecutionRouteRows({
    tradeBatches,
    approvalDecision: tradeTicketApprovalDecision,
    primaryVenue: primaryExecutionVenue,
    backupVenue: backupExecutionVenue,
    venueCapacityAmount,
    routeSlippageBps,
    routeCommissionBps,
  });
  const executionRouteBlockedCount = executionRouteRows.filter((row) => row.routeState === "blocked").length;
  const executionRouteStagedCount = executionRouteRows.filter((row) => row.routeState === "staged").length;
  const executionRouteRoutedCount = executionRouteRows.filter((row) => row.routeState === "routed").length;
  const estimatedRouteCost = executionRouteRows.reduce((sum, row) => sum + row.estimatedRouteCost, 0);
  const executionRouteDecision: ExecutionReviewStatus =
    !executionRouteRows.length ? "watch" : executionRouteBlockedCount > 0 ? "block" : executionRouteStagedCount > 0 ? "watch" : "pass";
  const executionRouteEventRows = buildExecutionRouteEventRows({
    routes: executionRouteRows,
    generatedAt: decisionGeneratedAt,
    actor: executionOwner,
    brokerMode: brokerBoundaryMode,
    approvalDecision: tradeTicketApprovalDecision,
  });
  const executionRouteEventBlockCount = executionRouteEventRows.filter((row) => row.eventStatus === "block").length;
  const executionRouteEventWatchCount = executionRouteEventRows.filter((row) => row.eventStatus === "watch").length;
  const executionRouteEventPassCount = executionRouteEventRows.filter((row) => row.eventStatus === "pass").length;
  const executionRouteEventDecision: ExecutionReviewStatus =
    !executionRouteEventRows.length
      ? "watch"
      : executionRouteEventBlockCount > 0
        ? "block"
        : executionRouteEventWatchCount > 0
          ? "watch"
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
  const apiVersionGovernanceItems = buildApiVersionGovernanceItems(apiContractBlueprintItems);
  const apiVersionGovernanceDecision = apiVersionGovernanceItems.length
    ? combinedExecutionStatus(apiVersionGovernanceItems.map((item) => item.status))
    : "watch";
  const apiVersionProductionCount = apiVersionGovernanceItems.filter((item) => item.releaseChannel === "production").length;
  const apiVersionMigrationRiskCount = apiVersionGovernanceItems.filter((item) => item.migrationRisk === "high").length;
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
  const dataProductObservabilityItems = buildDataProductObservabilityItems({
    hasBigQueryCredentials,
    dataPipelineDecision,
    dataContractDecision,
    dataProductCatalogItems,
    apiServiceCatalogItems,
    researchTaskGeneratedCount: researchTaskItems.length,
    researchTaskAuditRecords,
    tradeTicketGeneratedCount: tradeTickets.length,
    tradeTicketWarehouseCount,
    executionRouteGeneratedCount: executionRouteRows.length,
    executionRouteWarehouseCount,
    executionRouteEventGeneratedCount: executionRouteEventRows.length,
    executionRouteEventWarehouseCount,
    executionFillGeneratedCount: executionFillRows.length,
    executionFillWarehouseCount,
    postTradeAttributionGeneratedCount: postTradeAttributionRows.length,
    postTradeAttributionWarehouseCount,
    platformExceptionGeneratedCount: platformExceptionItems.length,
    platformExceptionWarehouseCount,
    slaEscalationGeneratedCount: slaEscalationItems.length,
    slaEscalationWarehouseCount,
    operatingKriGeneratedCount: operatingKriItems.length,
    operatingKriWarehouseCount,
    decisionFunnelGeneratedCount: decisionFunnelStages.length,
    decisionFunnelWarehouseCount,
    marketAlertGeneratedCount: marketAlertEvents.length,
    marketAlertWarehouseCount,
    marketAlertOwnerQueueGeneratedCount: marketAlertOwnerQueues.length,
    marketAlertOwnerQueueWarehouseCount,
    marketAlertRunbookGeneratedCount: marketAlertRunbookItems.length,
    marketAlertRunbookWarehouseCount,
    marketAlertAuditRecords,
    riskOwner,
    decisionOwner,
    executionOwner,
  });
  const dataProductObservabilitySummary = summarizeDataProductObservability(
    dataProductObservabilityItems,
    apiServiceCatalogItems,
  );
  const dataProductReliabilityActions = buildDataProductReliabilityActions(dataProductObservabilityItems);
  const dataProductSloItems = buildDataProductSloItems(dataProductObservabilityItems);
  const dataProductSloSummary = summarizeDataProductSlo(dataProductSloItems);
  const dataProductStatusPageItems = buildDataProductStatusPageItems({
    sloItems: dataProductSloItems,
    reliabilityActions: dataProductReliabilityActions,
  });
  const dataProductStatusPageSummary = summarizeDataProductStatusPage(dataProductStatusPageItems);
  const dataProductErrorBudgetItems = buildDataProductErrorBudgetItems({
    sloItems: dataProductSloItems,
    statusPageItems: dataProductStatusPageItems,
    reliabilityActions: dataProductReliabilityActions,
  });
  const dataProductErrorBudgetSummary = summarizeDataProductErrorBudget(dataProductErrorBudgetItems);
  const dataProductClientImpactItems = buildDataProductClientImpactItems({
    workspaces: clientWorkspaceProvisioningItems,
    billingItems: usageBillingItems,
    statusPageItems: dataProductStatusPageItems,
    errorBudgetItems: dataProductErrorBudgetItems,
  });
  const dataProductClientImpactSummary = summarizeDataProductClientImpact(dataProductClientImpactItems);
  const accountHealthItems = buildAccountHealthItems({
    workspaces: clientWorkspaceProvisioningItems,
    billingItems: usageBillingItems,
    customerSuccessHealthItems,
    revenueForecastItems,
    dataProductClientImpactItems,
  });
  const accountHealthSummary = summarizeAccountHealth(accountHealthItems);
  const accountActionQueueItems = buildAccountActionQueueItems(accountHealthItems);
  const accountActionQueueSummary = summarizeAccountActionQueue(accountActionQueueItems);
  const platformCommandSearchItems = buildPlatformCommandSearchItems({
    accountHealthItems,
    accountActionQueueItems,
    dataProductStatusPageItems,
    dataProductErrorBudgetItems,
    apiServiceCatalogItems,
    sources,
  });
  const platformCommandSearchSummary = summarizePlatformCommandSearch(platformCommandSearchItems);
  const platformCommandTriageItems = buildPlatformCommandTriageItems(platformCommandSearchItems);
  const platformCommandTriageSummary = summarizePlatformCommandTriage(platformCommandTriageItems);
  const platformCommandSlaItems = buildPlatformCommandSlaItems(platformCommandSearchItems);
  const platformCommandSlaSummary = summarizePlatformCommandSla(platformCommandSlaItems);
  const platformCommandOwnerLoadItems = buildPlatformCommandOwnerLoadItems(platformCommandSlaItems);
  const platformCommandOwnerLoadSummary = summarizePlatformCommandOwnerLoad(platformCommandOwnerLoadItems);
  const platformCommandHandoffItems = buildPlatformCommandHandoffItems(platformCommandOwnerLoadItems);
  const platformCommandHandoffSummary = summarizePlatformCommandHandoff(platformCommandHandoffItems);
  const platformCommandClosureItems = buildPlatformCommandClosureItems(platformCommandHandoffItems);
  const platformCommandClosureSummary = summarizePlatformCommandClosure(platformCommandClosureItems);
  const platformCommandPostmortemItems = buildPlatformCommandPostmortemItems(platformCommandClosureItems);
  const platformCommandPostmortemSummary = summarizePlatformCommandPostmortem(platformCommandPostmortemItems);
  const platformCommandImprovementBacklogItems = buildPlatformCommandImprovementBacklogItems(
    platformCommandPostmortemItems,
  );
  const platformCommandImprovementBacklogSummary = summarizePlatformCommandImprovementBacklog(
    platformCommandImprovementBacklogItems,
  );
  const platformCommandReleaseReadinessItems = buildPlatformCommandReleaseReadinessItems(
    platformCommandImprovementBacklogItems,
  );
  const platformCommandReleaseReadinessSummary = summarizePlatformCommandReleaseReadiness(
    platformCommandReleaseReadinessItems,
  );
  const platformCommandReleaseMonitorItems = buildPlatformCommandReleaseMonitorItems(
    platformCommandReleaseReadinessItems,
  );
  const platformCommandReleaseMonitorSummary = summarizePlatformCommandReleaseMonitor(platformCommandReleaseMonitorItems);
  const platformCommandOperatingReviewItems = buildPlatformCommandOperatingReviewItems(platformCommandReleaseMonitorItems);
  const platformCommandOperatingReviewSummary = summarizePlatformCommandOperatingReview(
    platformCommandOperatingReviewItems,
  );
  const platformCommandExecutiveBriefItems = buildPlatformCommandExecutiveBriefItems(
    platformCommandOperatingReviewItems,
  );
  const platformCommandExecutiveBriefSummary = summarizePlatformCommandExecutiveBrief(platformCommandExecutiveBriefItems);
  const platformCommandDecisionRegisterItems = buildPlatformCommandDecisionRegisterItems(
    platformCommandExecutiveBriefItems,
  );
  const platformCommandDecisionRegisterSummary = summarizePlatformCommandDecisionRegister(
    platformCommandDecisionRegisterItems,
  );
  const platformCommandDecisionFollowUpItems = buildPlatformCommandDecisionFollowUpItems(
    platformCommandDecisionRegisterItems,
  );
  const platformCommandDecisionFollowUpSummary = summarizePlatformCommandDecisionFollowUp(
    platformCommandDecisionFollowUpItems,
  );
  const platformCommandEvidenceLedgerItems = buildPlatformCommandEvidenceLedgerItems(
    platformCommandDecisionFollowUpItems,
  );
  const platformCommandEvidenceLedgerSummary = summarizePlatformCommandEvidenceLedger(
    platformCommandEvidenceLedgerItems,
  );
  const platformCommandAuditTrailItems = buildPlatformCommandAuditTrailItems(platformCommandEvidenceLedgerItems);
  const platformCommandAuditTrailSummary = summarizePlatformCommandAuditTrail(platformCommandAuditTrailItems);
  const platformCommandComplianceAttestationItems = buildPlatformCommandComplianceAttestationItems(
    platformCommandAuditTrailItems,
  );
  const platformCommandComplianceAttestationSummary = summarizePlatformCommandComplianceAttestation(
    platformCommandComplianceAttestationItems,
  );
  const platformCommandBoardReportingItems = buildPlatformCommandBoardReportingItems(
    platformCommandComplianceAttestationItems,
  );
  const platformCommandBoardReportingSummary = summarizePlatformCommandBoardReporting(platformCommandBoardReportingItems);
  const platformCommandClientReadoutItems = buildPlatformCommandClientReadoutItems(platformCommandBoardReportingItems);
  const platformCommandClientReadoutSummary = summarizePlatformCommandClientReadout(platformCommandClientReadoutItems);
  const platformCommandProductPackagingItems = buildPlatformCommandProductPackagingItems(platformCommandClientReadoutItems);
  const platformCommandProductPackagingSummary = summarizePlatformCommandProductPackaging(
    platformCommandProductPackagingItems,
  );
  const platformCommandRevenueReadinessItems = buildPlatformCommandRevenueReadinessItems(
    platformCommandProductPackagingItems,
  );
  const platformCommandRevenueReadinessSummary = summarizePlatformCommandRevenueReadiness(
    platformCommandRevenueReadinessItems,
  );
  const platformCommandGtmLaunchItems = buildPlatformCommandGtmLaunchItems(platformCommandRevenueReadinessItems);
  const platformCommandGtmLaunchSummary = summarizePlatformCommandGtmLaunch(platformCommandGtmLaunchItems);
  const platformCommandCustomerSuccessActivationItems = buildPlatformCommandCustomerSuccessActivationItems(
    platformCommandGtmLaunchItems,
  );
  const platformCommandCustomerSuccessActivationSummary = summarizePlatformCommandCustomerSuccessActivation(
    platformCommandCustomerSuccessActivationItems,
  );
  const platformCommandExpansionPlaybookItems = buildPlatformCommandExpansionPlaybookItems(
    platformCommandCustomerSuccessActivationItems,
  );
  const platformCommandExpansionPlaybookSummary = summarizePlatformCommandExpansionPlaybook(
    platformCommandExpansionPlaybookItems,
  );
  const platformCommandRenewalForecastItems = buildPlatformCommandRenewalForecastItems(
    platformCommandExpansionPlaybookItems,
  );
  const platformCommandRenewalForecastSummary = summarizePlatformCommandRenewalForecast(
    platformCommandRenewalForecastItems,
  );
  const platformCommandRevenueOperationsLedgerItems = buildPlatformCommandRevenueOperationsLedgerItems(
    platformCommandRenewalForecastItems,
  );
  const platformCommandRevenueOperationsLedgerSummary = summarizePlatformCommandRevenueOperationsLedger(
    platformCommandRevenueOperationsLedgerItems,
  );
  const platformCommandUnitEconomicsItems = buildPlatformCommandUnitEconomicsItems(
    platformCommandRevenueOperationsLedgerItems,
  );
  const platformCommandUnitEconomicsSummary = summarizePlatformCommandUnitEconomics(
    platformCommandUnitEconomicsItems,
  );
  const platformCommandPricingGovernanceItems = buildPlatformCommandPricingGovernanceItems(
    platformCommandUnitEconomicsItems,
  );
  const platformCommandPricingGovernanceSummary = summarizePlatformCommandPricingGovernance(
    platformCommandPricingGovernanceItems,
  );
  const platformCommandQuoteDeskItems = buildPlatformCommandQuoteDeskItems(platformCommandPricingGovernanceItems);
  const platformCommandQuoteDeskSummary = summarizePlatformCommandQuoteDesk(platformCommandQuoteDeskItems);
  const platformCommandEntitlementProvisioningItems = buildPlatformCommandEntitlementProvisioningItems(
    platformCommandQuoteDeskItems,
  );
  const platformCommandEntitlementProvisioningSummary = summarizePlatformCommandEntitlementProvisioning(
    platformCommandEntitlementProvisioningItems,
  );
  const platformCommandSubscriptionBillingItems = buildPlatformCommandSubscriptionBillingItems(
    platformCommandEntitlementProvisioningItems,
  );
  const platformCommandSubscriptionBillingSummary = summarizePlatformCommandSubscriptionBilling(
    platformCommandSubscriptionBillingItems,
  );
  const platformCommandSlaOperationsItems = buildPlatformCommandSlaOperationsItems(
    platformCommandSubscriptionBillingItems,
  );
  const platformCommandSlaOperationsSummary = summarizePlatformCommandSlaOperations(platformCommandSlaOperationsItems);
  const platformCommandUsageMonitoringItems = buildPlatformCommandUsageMonitoringItems(
    platformCommandSlaOperationsItems,
  );
  const platformCommandUsageMonitoringSummary = summarizePlatformCommandUsageMonitoring(
    platformCommandUsageMonitoringItems,
  );
  const platformCommandRevenueAuditItems = buildPlatformCommandRevenueAuditItems(platformCommandUsageMonitoringItems);
  const platformCommandRevenueAuditSummary = summarizePlatformCommandRevenueAudit(platformCommandRevenueAuditItems);
  const platformCommandCustomerHealthItems = buildPlatformCommandCustomerHealthItems(platformCommandRevenueAuditItems);
  const platformCommandCustomerHealthSummary = summarizePlatformCommandCustomerHealth(platformCommandCustomerHealthItems);
  const platformCommandManagementOverviewItems = buildPlatformCommandManagementOverviewItems(
    platformCommandCustomerHealthItems,
  );
  const platformCommandManagementOverviewSummary = summarizePlatformCommandManagementOverview(
    platformCommandManagementOverviewItems,
  );
  const platformCommandBoardPackItems = buildPlatformCommandBoardPackItems(platformCommandManagementOverviewItems);
  const platformCommandBoardPackSummary = summarizePlatformCommandBoardPack(platformCommandBoardPackItems);
  const platformCommandOperatingControlTowerItems =
    buildPlatformCommandOperatingControlTowerItems(platformCommandBoardPackItems);
  const platformCommandOperatingControlTowerSummary = summarizePlatformCommandOperatingControlTower(
    platformCommandOperatingControlTowerItems,
  );
  const platformCommandCeoDecisionConsoleItems = buildPlatformCommandCeoDecisionConsoleItems(
    platformCommandOperatingControlTowerItems,
  );
  const platformCommandCeoDecisionConsoleSummary = summarizePlatformCommandCeoDecisionConsole(
    platformCommandCeoDecisionConsoleItems,
  );
  const platformCommandStakeholderOutputPackItems = buildPlatformCommandStakeholderOutputPackItems(
    platformCommandCeoDecisionConsoleItems,
  );
  const platformCommandStakeholderOutputPackSummary = summarizePlatformCommandStakeholderOutputPack(
    platformCommandStakeholderOutputPackItems,
  );
  const platformCommandProductNavigatorItems = buildPlatformCommandProductNavigatorItems([
    {
      areaId: "command-foundation",
      title: "營運基礎層",
      stage: "01 / Foundation",
      owner: "Platform Ops",
      href: "#command-foundation",
      statuses: [
        platformCommandSearchSummary.blockCount > 0
          ? "block"
          : platformCommandSearchSummary.watchCount > 0
            ? "watch"
            : "pass",
        platformCommandTriageSummary.status,
        platformCommandSlaSummary.status,
        platformCommandOwnerLoadSummary.status,
        platformCommandHandoffSummary.status,
        platformCommandClosureSummary.status,
        platformCommandPostmortemSummary.status,
        platformCommandImprovementBacklogSummary.status,
      ] as PlatformCommandProductNavigatorStatus[],
      recordCount:
        platformCommandSearchItems.length +
        platformCommandTriageItems.length +
        platformCommandSlaItems.length +
        platformCommandOwnerLoadItems.length +
        platformCommandHandoffItems.length +
        platformCommandClosureItems.length +
        platformCommandPostmortemItems.length +
        platformCommandImprovementBacklogItems.length,
      moduleCount: 8,
      entryPoint: "從搜尋、分流、SLA、責任人、交接、結案與改善 backlog 開始",
      narrative: "用來把資料平台每日運轉的例外與責任歸屬整理清楚，是所有下游治理與商業化的入口。",
      modules: ["Search", "Triage", "SLA", "Owner", "Handoff", "Closure", "Postmortem", "Backlog"],
    },
    {
      areaId: "command-governance",
      title: "治理與董事會層",
      stage: "02 / Governance",
      owner: "Governance",
      href: "#command-governance",
      statuses: [
        platformCommandReleaseReadinessSummary.status,
        platformCommandReleaseMonitorSummary.status,
        platformCommandOperatingReviewSummary.status,
        platformCommandExecutiveBriefSummary.status,
        platformCommandDecisionRegisterSummary.status,
        platformCommandDecisionFollowUpSummary.status,
        platformCommandEvidenceLedgerSummary.status,
        platformCommandAuditTrailSummary.status,
        platformCommandComplianceAttestationSummary.status,
        platformCommandBoardReportingSummary.status,
      ] as PlatformCommandProductNavigatorStatus[],
      recordCount:
        platformCommandReleaseReadinessItems.length +
        platformCommandReleaseMonitorItems.length +
        platformCommandOperatingReviewItems.length +
        platformCommandExecutiveBriefItems.length +
        platformCommandDecisionRegisterItems.length +
        platformCommandDecisionFollowUpItems.length +
        platformCommandEvidenceLedgerItems.length +
        platformCommandAuditTrailItems.length +
        platformCommandComplianceAttestationItems.length +
        platformCommandBoardReportingItems.length,
      moduleCount: 10,
      entryPoint: "看版本、營運複核、管理 brief、決策登記、證據、稽核與董事會報告",
      narrative: "用來證明平台不是只有資料，而是有可稽核、可追責、可交給董事會的管理流程。",
      modules: ["Release", "Monitor", "Review", "Brief", "Decision", "Evidence", "Audit", "Attestation", "Board"],
    },
    {
      areaId: "command-client-commercial",
      title: "客戶與商業化層",
      stage: "03 / Client",
      owner: "GTM / CS",
      href: "#command-client-commercial",
      statuses: [
        platformCommandClientReadoutSummary.status,
        platformCommandProductPackagingSummary.status,
        platformCommandRevenueReadinessSummary.status,
        platformCommandGtmLaunchSummary.status,
        platformCommandCustomerSuccessActivationSummary.status,
        platformCommandExpansionPlaybookSummary.status,
      ] as PlatformCommandProductNavigatorStatus[],
      recordCount:
        platformCommandClientReadoutItems.length +
        platformCommandProductPackagingItems.length +
        platformCommandRevenueReadinessItems.length +
        platformCommandGtmLaunchItems.length +
        platformCommandCustomerSuccessActivationItems.length +
        platformCommandExpansionPlaybookItems.length,
      moduleCount: 6,
      entryPoint: "看客戶 readout、產品包裝、收入 ready、GTM、CS 啟動與擴張 playbook",
      narrative: "把資料能力包成客戶與市場能理解的產品，避免只停留在內部 dashboard。",
      modules: ["Readout", "Packaging", "Revenue ready", "GTM", "CS", "Expansion"],
    },
    {
      areaId: "command-revenue-engine",
      title: "收入與計費引擎",
      stage: "04 / Revenue",
      owner: "Revenue Ops",
      href: "#command-revenue-engine",
      statuses: [
        platformCommandRenewalForecastSummary.status,
        platformCommandRevenueOperationsLedgerSummary.status,
        platformCommandUnitEconomicsSummary.status,
        platformCommandPricingGovernanceSummary.status,
        platformCommandQuoteDeskSummary.status,
        platformCommandEntitlementProvisioningSummary.status,
        platformCommandSubscriptionBillingSummary.status,
        platformCommandSlaOperationsSummary.status,
        platformCommandUsageMonitoringSummary.status,
        platformCommandRevenueAuditSummary.status,
        platformCommandCustomerHealthSummary.status,
      ] as PlatformCommandProductNavigatorStatus[],
      recordCount:
        platformCommandRenewalForecastItems.length +
        platformCommandRevenueOperationsLedgerItems.length +
        platformCommandUnitEconomicsItems.length +
        platformCommandPricingGovernanceItems.length +
        platformCommandQuoteDeskItems.length +
        platformCommandEntitlementProvisioningItems.length +
        platformCommandSubscriptionBillingItems.length +
        platformCommandSlaOperationsItems.length +
        platformCommandUsageMonitoringItems.length +
        platformCommandRevenueAuditItems.length +
        platformCommandCustomerHealthItems.length,
      moduleCount: 11,
      entryPoint: "看續約 forecast、收入 ledger、unit economics、定價、報價、權益、計費與使用量",
      narrative: "把平台從分析工具推進到可收費、可續約、可稽核的收入機器。",
      modules: ["Renewal", "Ledger", "Economics", "Pricing", "Quote", "Entitlement", "Billing", "Usage", "Health"],
    },
    {
      areaId: "command-executive-control",
      title: "管理層總控",
      stage: "05 / Executive",
      owner: "CEO Office",
      href: "#command-executive-control",
      statuses: [
        platformCommandManagementOverviewSummary.status,
        platformCommandBoardPackSummary.status,
        platformCommandOperatingControlTowerSummary.status,
        platformCommandCeoDecisionConsoleSummary.status,
      ] as PlatformCommandProductNavigatorStatus[],
      recordCount:
        platformCommandManagementOverviewItems.length +
        platformCommandBoardPackItems.length +
        platformCommandOperatingControlTowerItems.length +
        platformCommandCeoDecisionConsoleItems.length,
      moduleCount: 4,
      entryPoint: "看管理層總覽、Board Pack、Operating Control Tower、CEO Decision Console",
      narrative: "把營運、客戶、收入與風險收斂成 CEO 能批准或否決的決策台。",
      modules: ["Management", "Board Pack", "Control Tower", "CEO Decision"],
    },
    {
      areaId: "command-stakeholder-output",
      title: "最終輸出層",
      stage: "06 / Output",
      owner: "CEO / Communications",
      href: "#command-stakeholder-output",
      statuses: [platformCommandStakeholderOutputPackSummary.status] as PlatformCommandProductNavigatorStatus[],
      recordCount: platformCommandStakeholderOutputPackItems.length,
      moduleCount: 1,
      entryPoint: "看投資人、董事會、客戶、內部管理層四種輸出包",
      narrative: "把 CEO 決策轉成真正能對外或對內發布的交付物，控制可發、條件發與禁止發。",
      modules: ["Investor", "Board", "Customer", "Internal"],
    },
  ]);
  const platformCommandProductNavigatorSummary = summarizePlatformCommandProductNavigator(
    platformCommandProductNavigatorItems,
  );
  const platformCommandLaunchReadinessItems = buildPlatformCommandLaunchReadinessItems(
    platformCommandProductNavigatorSummary,
    platformCommandProductNavigatorItems,
  );
  const platformCommandLaunchReadinessSummary = summarizePlatformCommandLaunchReadiness(
    platformCommandLaunchReadinessItems,
  );
  const isCommandAreaVisible = (areaId: Exclude<PlatformCommandProductNavigatorActiveArea, "all">) =>
    activeCommandAreaId === "all" || activeCommandAreaId === areaId;
  const handleSelectCommandArea = (areaId: PlatformCommandProductNavigatorActiveArea) => {
    setActiveCommandAreaId(areaId);
    writePlatformCommandProductNavigatorAreaToStorage(areaId);
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const presets = loadWatchlistPresetsFromStorage();
      const taskOverrides = loadResearchTaskOverridesFromStorage();
      setActiveCommandAreaId(loadPlatformCommandProductNavigatorAreaFromStorage());
      setSavedWatchlistPresets(presets);
      setResearchTaskOverrides(taskOverrides);
      setResearchTaskWorkspaceId(loadResearchTaskWorkspaceIdFromStorage());
      setSelectedWatchlistPresetId((currentId) => currentId || presets[0]?.id || "");
      setWatchlistPresetName((currentName) => currentName || presets[0]?.name || "核心 ETF");
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    let ignore = false;

    async function loadResearchTaskWarehouseStatus() {
      try {
        const result = await fetchResearchTaskWarehouseStatus();
        if (ignore) return;
        setResearchTaskWarehouseStatus(result);
        setResearchTaskWarehouseError("");
      } catch (err: unknown) {
        if (ignore) return;
        setResearchTaskWarehouseStatus(null);
        setResearchTaskWarehouseError(err instanceof Error ? err.message : String(err));
      }
    }

    void loadResearchTaskWarehouseStatus();

    return () => {
      ignore = true;
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
        adjustedStaleSymbols,
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
        adjustedStaleSymbols,
        fxCurrencies,
      }),
      "text/csv;charset=utf-8",
    );
  };
  const handleExportAdjustedBackfillManualReviewCsv = () => {
    if (!adjustedBackfillManualReviewRows.length) return;

    downloadTextFile(
      `bigquery-adjusted-backfill-manual-review-${resultStamp()}.csv`,
      adjustedBackfillManualReviewCsv(adjustedBackfillManualReviewRows),
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
  const handleExportDataProductObservabilityCsv = () => {
    if (!dataProductObservabilityItems.length) return;

    downloadTextFile(
      `wealth-dashboard-data-product-observability-${resultStamp()}.csv`,
      dataProductObservabilityCsv(dataProductObservabilityItems),
      "text/csv;charset=utf-8",
    );
  };
  const handleExportDataProductReliabilityActionsCsv = () => {
    if (!dataProductReliabilityActions.length) return;

    downloadTextFile(
      `wealth-dashboard-data-product-actions-${resultStamp()}.csv`,
      dataProductReliabilityActionsCsv(dataProductReliabilityActions),
      "text/csv;charset=utf-8",
    );
  };
  const handleExportDataProductSloCsv = () => {
    if (!dataProductSloItems.length) return;

    downloadTextFile(
      `wealth-dashboard-data-product-slo-${resultStamp()}.csv`,
      dataProductSloCsv(dataProductSloItems),
      "text/csv;charset=utf-8",
    );
  };
  const handleExportDataProductStatusPageCsv = () => {
    if (!dataProductStatusPageItems.length) return;

    downloadTextFile(
      `wealth-dashboard-data-product-status-page-${resultStamp()}.csv`,
      dataProductStatusPageCsv(dataProductStatusPageItems),
      "text/csv;charset=utf-8",
    );
  };
  const handleExportDataProductErrorBudgetCsv = () => {
    if (!dataProductErrorBudgetItems.length) return;

    downloadTextFile(
      `wealth-dashboard-data-product-error-budget-${resultStamp()}.csv`,
      dataProductErrorBudgetCsv(dataProductErrorBudgetItems),
      "text/csv;charset=utf-8",
    );
  };
  const handleExportDataProductClientImpactCsv = () => {
    if (!dataProductClientImpactItems.length) return;

    downloadTextFile(
      `wealth-dashboard-data-product-client-impact-${resultStamp()}.csv`,
      dataProductClientImpactCsv(dataProductClientImpactItems),
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
  const handleExportApiVersionGovernanceCsv = () => {
    if (!apiVersionGovernanceItems.length) return;

    downloadTextFile(
      `wealth-dashboard-api-version-governance-${resultStamp()}.csv`,
      apiVersionGovernanceCsv(apiVersionGovernanceItems),
      "text/csv;charset=utf-8",
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
  const handleExportAccountHealthCsv = () => {
    if (!accountHealthItems.length) return;

    downloadTextFile(
      `wealth-dashboard-account-health-${resultStamp()}.csv`,
      accountHealthCsv(accountHealthItems),
      "text/csv;charset=utf-8",
    );
  };
  const handleExportAccountActionQueueCsv = () => {
    if (!accountActionQueueItems.length) return;

    downloadTextFile(
      `wealth-dashboard-account-action-queue-${resultStamp()}.csv`,
      accountActionQueueCsv(accountActionQueueItems),
      "text/csv;charset=utf-8",
    );
  };
  const handleExportPlatformCommandSearchCsv = () => {
    if (!platformCommandSearchItems.length) return;

    downloadTextFile(
      `wealth-dashboard-command-search-${resultStamp()}.csv`,
      platformCommandSearchCsv(platformCommandSearchItems),
      "text/csv;charset=utf-8",
    );
  };
  const handleExportPlatformCommandTriageCsv = () => {
    if (!platformCommandTriageItems.length) return;

    downloadTextFile(
      `wealth-dashboard-command-triage-${resultStamp()}.csv`,
      platformCommandTriageCsv(platformCommandTriageItems),
      "text/csv;charset=utf-8",
    );
  };
  const handleExportPlatformCommandSlaCsv = () => {
    if (!platformCommandSlaItems.length) return;

    downloadTextFile(
      `wealth-dashboard-command-sla-${resultStamp()}.csv`,
      platformCommandSlaCsv(platformCommandSlaItems),
      "text/csv;charset=utf-8",
    );
  };
  const handleExportPlatformCommandOwnerLoadCsv = () => {
    if (!platformCommandOwnerLoadItems.length) return;

    downloadTextFile(
      `wealth-dashboard-command-owner-load-${resultStamp()}.csv`,
      platformCommandOwnerLoadCsv(platformCommandOwnerLoadItems),
      "text/csv;charset=utf-8",
    );
  };
  const handleExportPlatformCommandHandoffCsv = () => {
    if (!platformCommandHandoffItems.length) return;

    downloadTextFile(
      `wealth-dashboard-command-handoff-${resultStamp()}.csv`,
      platformCommandHandoffCsv(platformCommandHandoffItems),
      "text/csv;charset=utf-8",
    );
  };
  const handleExportPlatformCommandClosureCsv = () => {
    if (!platformCommandClosureItems.length) return;

    downloadTextFile(
      `wealth-dashboard-command-closure-${resultStamp()}.csv`,
      platformCommandClosureCsv(platformCommandClosureItems),
      "text/csv;charset=utf-8",
    );
  };
  const handleExportPlatformCommandPostmortemCsv = () => {
    if (!platformCommandPostmortemItems.length) return;

    downloadTextFile(
      `wealth-dashboard-command-postmortem-${resultStamp()}.csv`,
      platformCommandPostmortemCsv(platformCommandPostmortemItems),
      "text/csv;charset=utf-8",
    );
  };
  const handleExportPlatformCommandImprovementBacklogCsv = () => {
    if (!platformCommandImprovementBacklogItems.length) return;

    downloadTextFile(
      `wealth-dashboard-command-improvement-backlog-${resultStamp()}.csv`,
      platformCommandImprovementBacklogCsv(platformCommandImprovementBacklogItems),
      "text/csv;charset=utf-8",
    );
  };
  const handleExportPlatformCommandReleaseReadinessCsv = () => {
    if (!platformCommandReleaseReadinessItems.length) return;

    downloadTextFile(
      `wealth-dashboard-command-release-readiness-${resultStamp()}.csv`,
      platformCommandReleaseReadinessCsv(platformCommandReleaseReadinessItems),
      "text/csv;charset=utf-8",
    );
  };
  const handleExportPlatformCommandReleaseMonitorCsv = () => {
    if (!platformCommandReleaseMonitorItems.length) return;

    downloadTextFile(
      `wealth-dashboard-command-release-monitor-${resultStamp()}.csv`,
      platformCommandReleaseMonitorCsv(platformCommandReleaseMonitorItems),
      "text/csv;charset=utf-8",
    );
  };
  const handleExportPlatformCommandOperatingReviewCsv = () => {
    if (!platformCommandOperatingReviewItems.length) return;

    downloadTextFile(
      `wealth-dashboard-command-operating-review-${resultStamp()}.csv`,
      platformCommandOperatingReviewCsv(platformCommandOperatingReviewItems),
      "text/csv;charset=utf-8",
    );
  };
  const handleExportPlatformCommandExecutiveBriefCsv = () => {
    if (!platformCommandExecutiveBriefItems.length) return;

    downloadTextFile(
      `wealth-dashboard-command-executive-brief-${resultStamp()}.csv`,
      platformCommandExecutiveBriefCsv(platformCommandExecutiveBriefItems),
      "text/csv;charset=utf-8",
    );
  };
  const handleExportPlatformCommandDecisionRegisterCsv = () => {
    if (!platformCommandDecisionRegisterItems.length) return;

    downloadTextFile(
      `wealth-dashboard-command-decision-register-${resultStamp()}.csv`,
      platformCommandDecisionRegisterCsv(platformCommandDecisionRegisterItems),
      "text/csv;charset=utf-8",
    );
  };
  const handleExportPlatformCommandDecisionFollowUpCsv = () => {
    if (!platformCommandDecisionFollowUpItems.length) return;

    downloadTextFile(
      `wealth-dashboard-command-decision-follow-up-${resultStamp()}.csv`,
      platformCommandDecisionFollowUpCsv(platformCommandDecisionFollowUpItems),
      "text/csv;charset=utf-8",
    );
  };
  const handleExportPlatformCommandEvidenceLedgerCsv = () => {
    if (!platformCommandEvidenceLedgerItems.length) return;

    downloadTextFile(
      `wealth-dashboard-command-evidence-ledger-${resultStamp()}.csv`,
      platformCommandEvidenceLedgerCsv(platformCommandEvidenceLedgerItems),
      "text/csv;charset=utf-8",
    );
  };
  const handleExportPlatformCommandAuditTrailCsv = () => {
    if (!platformCommandAuditTrailItems.length) return;

    downloadTextFile(
      `wealth-dashboard-command-audit-trail-${resultStamp()}.csv`,
      platformCommandAuditTrailCsv(platformCommandAuditTrailItems),
      "text/csv;charset=utf-8",
    );
  };
  const handleExportPlatformCommandComplianceAttestationCsv = () => {
    if (!platformCommandComplianceAttestationItems.length) return;

    downloadTextFile(
      `wealth-dashboard-command-compliance-attestation-${resultStamp()}.csv`,
      platformCommandComplianceAttestationCsv(platformCommandComplianceAttestationItems),
      "text/csv;charset=utf-8",
    );
  };
  const handleExportPlatformCommandBoardReportingCsv = () => {
    if (!platformCommandBoardReportingItems.length) return;

    downloadTextFile(
      `wealth-dashboard-command-board-reporting-${resultStamp()}.csv`,
      platformCommandBoardReportingCsv(platformCommandBoardReportingItems),
      "text/csv;charset=utf-8",
    );
  };
  const handleExportPlatformCommandClientReadoutCsv = () => {
    if (!platformCommandClientReadoutItems.length) return;

    downloadTextFile(
      `wealth-dashboard-command-client-readout-${resultStamp()}.csv`,
      platformCommandClientReadoutCsv(platformCommandClientReadoutItems),
      "text/csv;charset=utf-8",
    );
  };
  const handleExportPlatformCommandProductPackagingCsv = () => {
    if (!platformCommandProductPackagingItems.length) return;

    downloadTextFile(
      `wealth-dashboard-command-product-packaging-${resultStamp()}.csv`,
      platformCommandProductPackagingCsv(platformCommandProductPackagingItems),
      "text/csv;charset=utf-8",
    );
  };
  const handleExportPlatformCommandRevenueReadinessCsv = () => {
    if (!platformCommandRevenueReadinessItems.length) return;

    downloadTextFile(
      `wealth-dashboard-command-revenue-readiness-${resultStamp()}.csv`,
      platformCommandRevenueReadinessCsv(platformCommandRevenueReadinessItems),
      "text/csv;charset=utf-8",
    );
  };
  const handleExportPlatformCommandGtmLaunchCsv = () => {
    if (!platformCommandGtmLaunchItems.length) return;

    downloadTextFile(
      `wealth-dashboard-command-gtm-launch-${resultStamp()}.csv`,
      platformCommandGtmLaunchCsv(platformCommandGtmLaunchItems),
      "text/csv;charset=utf-8",
    );
  };
  const handleExportPlatformCommandCustomerSuccessActivationCsv = () => {
    if (!platformCommandCustomerSuccessActivationItems.length) return;

    downloadTextFile(
      `wealth-dashboard-command-customer-success-activation-${resultStamp()}.csv`,
      platformCommandCustomerSuccessActivationCsv(platformCommandCustomerSuccessActivationItems),
      "text/csv;charset=utf-8",
    );
  };
  const handleExportPlatformCommandExpansionPlaybookCsv = () => {
    if (!platformCommandExpansionPlaybookItems.length) return;

    downloadTextFile(
      `wealth-dashboard-command-expansion-playbook-${resultStamp()}.csv`,
      platformCommandExpansionPlaybookCsv(platformCommandExpansionPlaybookItems),
      "text/csv;charset=utf-8",
    );
  };
  const handleExportPlatformCommandRenewalForecastCsv = () => {
    if (!platformCommandRenewalForecastItems.length) return;

    downloadTextFile(
      `wealth-dashboard-command-renewal-forecast-${resultStamp()}.csv`,
      platformCommandRenewalForecastCsv(platformCommandRenewalForecastItems),
      "text/csv;charset=utf-8",
    );
  };
  const handleExportPlatformCommandRevenueOperationsLedgerCsv = () => {
    if (!platformCommandRevenueOperationsLedgerItems.length) return;

    downloadTextFile(
      `wealth-dashboard-command-revenue-operations-ledger-${resultStamp()}.csv`,
      platformCommandRevenueOperationsLedgerCsv(platformCommandRevenueOperationsLedgerItems),
      "text/csv;charset=utf-8",
    );
  };
  const handleExportPlatformCommandUnitEconomicsCsv = () => {
    if (!platformCommandUnitEconomicsItems.length) return;

    downloadTextFile(
      `wealth-dashboard-command-unit-economics-${resultStamp()}.csv`,
      platformCommandUnitEconomicsCsv(platformCommandUnitEconomicsItems),
      "text/csv;charset=utf-8",
    );
  };
  const handleExportPlatformCommandPricingGovernanceCsv = () => {
    if (!platformCommandPricingGovernanceItems.length) return;

    downloadTextFile(
      `wealth-dashboard-command-pricing-governance-${resultStamp()}.csv`,
      platformCommandPricingGovernanceCsv(platformCommandPricingGovernanceItems),
      "text/csv;charset=utf-8",
    );
  };
  const handleExportPlatformCommandQuoteDeskCsv = () => {
    if (!platformCommandQuoteDeskItems.length) return;

    downloadTextFile(
      `wealth-dashboard-command-quote-desk-${resultStamp()}.csv`,
      platformCommandQuoteDeskCsv(platformCommandQuoteDeskItems),
      "text/csv;charset=utf-8",
    );
  };
  const handleExportPlatformCommandEntitlementProvisioningCsv = () => {
    if (!platformCommandEntitlementProvisioningItems.length) return;

    downloadTextFile(
      `wealth-dashboard-command-entitlement-provisioning-${resultStamp()}.csv`,
      platformCommandEntitlementProvisioningCsv(platformCommandEntitlementProvisioningItems),
      "text/csv;charset=utf-8",
    );
  };
  const handleExportPlatformCommandSubscriptionBillingCsv = () => {
    if (!platformCommandSubscriptionBillingItems.length) return;

    downloadTextFile(
      `wealth-dashboard-command-subscription-billing-${resultStamp()}.csv`,
      platformCommandSubscriptionBillingCsv(platformCommandSubscriptionBillingItems),
      "text/csv;charset=utf-8",
    );
  };
  const handleExportPlatformCommandSlaOperationsCsv = () => {
    if (!platformCommandSlaOperationsItems.length) return;

    downloadTextFile(
      `wealth-dashboard-command-sla-operations-${resultStamp()}.csv`,
      platformCommandSlaOperationsCsv(platformCommandSlaOperationsItems),
      "text/csv;charset=utf-8",
    );
  };
  const handleExportPlatformCommandUsageMonitoringCsv = () => {
    if (!platformCommandUsageMonitoringItems.length) return;

    downloadTextFile(
      `wealth-dashboard-command-usage-monitoring-${resultStamp()}.csv`,
      platformCommandUsageMonitoringCsv(platformCommandUsageMonitoringItems),
      "text/csv;charset=utf-8",
    );
  };
  const handleExportPlatformCommandRevenueAuditCsv = () => {
    if (!platformCommandRevenueAuditItems.length) return;

    downloadTextFile(
      `wealth-dashboard-command-revenue-audit-${resultStamp()}.csv`,
      platformCommandRevenueAuditCsv(platformCommandRevenueAuditItems),
      "text/csv;charset=utf-8",
    );
  };
  const handleExportPlatformCommandCustomerHealthCsv = () => {
    if (!platformCommandCustomerHealthItems.length) return;

    downloadTextFile(
      `wealth-dashboard-command-customer-health-${resultStamp()}.csv`,
      platformCommandCustomerHealthCsv(platformCommandCustomerHealthItems),
      "text/csv;charset=utf-8",
    );
  };
  const handleExportPlatformCommandManagementOverviewCsv = () => {
    if (!platformCommandManagementOverviewItems.length) return;

    downloadTextFile(
      `wealth-dashboard-command-management-overview-${resultStamp()}.csv`,
      platformCommandManagementOverviewCsv(platformCommandManagementOverviewItems),
      "text/csv;charset=utf-8",
    );
  };
  const handleExportPlatformCommandBoardPackCsv = () => {
    if (!platformCommandBoardPackItems.length) return;

    downloadTextFile(
      `wealth-dashboard-command-board-pack-${resultStamp()}.csv`,
      platformCommandBoardPackCsv(platformCommandBoardPackItems),
      "text/csv;charset=utf-8",
    );
  };
  const handleExportPlatformCommandOperatingControlTowerCsv = () => {
    if (!platformCommandOperatingControlTowerItems.length) return;

    downloadTextFile(
      `wealth-dashboard-command-operating-control-tower-${resultStamp()}.csv`,
      platformCommandOperatingControlTowerCsv(platformCommandOperatingControlTowerItems),
      "text/csv;charset=utf-8",
    );
  };
  const handleExportPlatformCommandCeoDecisionConsoleCsv = () => {
    if (!platformCommandCeoDecisionConsoleItems.length) return;

    downloadTextFile(
      `wealth-dashboard-command-ceo-decision-console-${resultStamp()}.csv`,
      platformCommandCeoDecisionConsoleCsv(platformCommandCeoDecisionConsoleItems),
      "text/csv;charset=utf-8",
    );
  };
  const handleExportPlatformCommandStakeholderOutputPackCsv = () => {
    if (!platformCommandStakeholderOutputPackItems.length) return;

    downloadTextFile(
      `wealth-dashboard-command-stakeholder-output-pack-${resultStamp()}.csv`,
      platformCommandStakeholderOutputPackCsv(platformCommandStakeholderOutputPackItems),
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
  const handleAppendComparisonSymbol = (symbol: string) => {
    const cleanSymbol = symbol.trim();
    if (!cleanSymbol) return;

    const symbols = parseSymbolList(comparisonSymbols);
    const hasSymbol = symbols.some((item) => item.toUpperCase() === cleanSymbol.toUpperCase());
    const nextSymbols = hasSymbol ? symbols : [...symbols, cleanSymbol].slice(0, 12);
    setComparisonSymbols(nextSymbols.join(" "));
    setAssetQuery(cleanSymbol);
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
  const handleExportTradeTicketApprovalGateCsv = () => {
    if (!tradeTicketApprovalGateItems.length) return;

    downloadTextFile(
      `bigquery-trade-ticket-approval-gate-${resultStamp()}.csv`,
      tradeTicketApprovalGateCsv(tradeTicketApprovalGateItems),
      "text/csv;charset=utf-8",
    );
  };
  const handleSyncTradeTicketsToBigQuery = async () => {
    if (!tradeTickets.length) return;

    setTradeTicketSyncStatus("syncing");
    setTradeTicketSyncMessage("交易票同步中。");

    try {
      const result = await syncTradeTicketsToBigQuery(
        buildTradeTicketSyncPayload({
          tickets: tradeTickets,
          generatedAt: decisionGeneratedAt,
          workspaceId: researchTaskWorkspaceId,
          actorId: decisionOwner,
          portfolioId: tradeTicketPortfolioId,
          batchId: tradeTicketBatchId,
          minimumTradeAmount,
        }),
      );
      const isSynced = result.status === "synced";
      setTradeTicketSyncStatus(isSynced ? "synced" : "error");
      setTradeTicketWarehouseCount(result.insertedCount);
      setTradeTicketSyncMessage(`${result.insertedCount}/${result.receivedCount} 張交易票寫入 ${result.table}`);
    } catch (err: unknown) {
      setTradeTicketSyncStatus("error");
      setTradeTicketSyncMessage(err instanceof Error ? err.message : String(err));
    }
  };
  const handleLoadTradeTicketsFromBigQuery = async () => {
    setTradeTicketSyncStatus("loading");
    setTradeTicketSyncMessage("交易票載入中。");

    try {
      const result = await fetchLatestTradeTicketsFromBigQuery({
        limit: 100,
        workspaceId: researchTaskWorkspaceId,
        portfolioId: tradeTicketPortfolioId,
      });
      if (result.status === "schema_outdated") {
        setTradeTicketSyncStatus("error");
        setTradeTicketSyncMessage(`交易票表需先同步升級欄位：${result.missingFields?.join(", ") || "--"}`);
        return;
      }
      setTradeTicketWarehouseCount(result.ticketCount);
      setTradeTicketSyncStatus("loaded");
      setTradeTicketSyncMessage(`已讀取 ${result.ticketCount} 張交易票 ${result.workspaceId}`);
    } catch (err: unknown) {
      setTradeTicketSyncStatus("error");
      setTradeTicketSyncMessage(err instanceof Error ? err.message : String(err));
    }
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
  const handleExportExecutionRouteCsv = () => {
    if (!executionRouteRows.length) return;

    downloadTextFile(
      `bigquery-execution-routes-${resultStamp()}.csv`,
      executionRouteCsv(executionRouteRows),
      "text/csv;charset=utf-8",
    );
  };
  const handleExportExecutionRouteEventCsv = () => {
    if (!executionRouteEventRows.length) return;

    downloadTextFile(
      `bigquery-execution-route-events-${resultStamp()}.csv`,
      executionRouteEventCsv(executionRouteEventRows),
      "text/csv;charset=utf-8",
    );
  };
  const handleSyncExecutionRoutesToBigQuery = async () => {
    if (!executionRouteRows.length) return;

    setExecutionRouteSyncStatus("syncing");
    setExecutionRouteSyncMessage("執行路由同步中。");

    try {
      const result = await syncExecutionRoutesToBigQuery(
        buildExecutionRouteSyncPayload({
          routes: executionRouteRows,
          generatedAt: decisionGeneratedAt,
          workspaceId: researchTaskWorkspaceId,
          actorId: executionOwner,
          portfolioId: tradeTicketPortfolioId,
          batchId: tradeTicketBatchId,
          approvalDecision: tradeTicketApprovalDecision,
        }),
      );
      const isSynced = result.status === "synced";
      setExecutionRouteSyncStatus(isSynced ? "synced" : "error");
      setExecutionRouteWarehouseCount(result.insertedCount);
      setExecutionRouteSyncMessage(`${result.insertedCount}/${result.receivedCount} 筆執行路由寫入 ${result.table}`);
    } catch (err: unknown) {
      setExecutionRouteSyncStatus("error");
      setExecutionRouteSyncMessage(err instanceof Error ? err.message : String(err));
    }
  };
  const handleSyncExecutionRouteEventsToBigQuery = async () => {
    if (!executionRouteEventRows.length) return;

    setExecutionRouteEventSyncStatus("syncing");
    setExecutionRouteEventSyncMessage("路由事件同步中。");

    try {
      const result = await syncExecutionRouteEventsToBigQuery(
        buildExecutionRouteEventSyncPayload({
          events: executionRouteEventRows,
          generatedAt: decisionGeneratedAt,
          workspaceId: researchTaskWorkspaceId,
          actorId: executionOwner,
          portfolioId: tradeTicketPortfolioId,
          batchId: tradeTicketBatchId,
        }),
      );
      const isSynced = result.status === "synced";
      setExecutionRouteEventSyncStatus(isSynced ? "synced" : "error");
      setExecutionRouteEventWarehouseCount(result.insertedCount);
      setExecutionRouteEventSyncMessage(`${result.insertedCount}/${result.receivedCount} 筆路由事件寫入 ${result.table}`);
    } catch (err: unknown) {
      setExecutionRouteEventSyncStatus("error");
      setExecutionRouteEventSyncMessage(err instanceof Error ? err.message : String(err));
    }
  };
  const handleLoadExecutionRoutesFromBigQuery = async () => {
    setExecutionRouteSyncStatus("loading");
    setExecutionRouteSyncMessage("執行路由載入中。");

    try {
      const result = await fetchLatestExecutionRoutesFromBigQuery({
        limit: 100,
        workspaceId: researchTaskWorkspaceId,
        portfolioId: tradeTicketPortfolioId,
      });
      if (result.status === "schema_outdated") {
        setExecutionRouteSyncStatus("error");
        setExecutionRouteSyncMessage(`執行路由表需先同步升級欄位：${result.missingFields?.join(", ") || "--"}`);
        return;
      }
      setExecutionRouteWarehouseCount(result.routeCount);
      setExecutionRouteSyncStatus("loaded");
      setExecutionRouteSyncMessage(`已讀取 ${result.routeCount} 筆執行路由 ${result.workspaceId}`);
    } catch (err: unknown) {
      setExecutionRouteSyncStatus("error");
      setExecutionRouteSyncMessage(err instanceof Error ? err.message : String(err));
    }
  };
  const handleLoadExecutionRouteEventsFromBigQuery = async () => {
    setExecutionRouteEventSyncStatus("loading");
    setExecutionRouteEventSyncMessage("路由事件載入中。");

    try {
      const result = await fetchLatestExecutionRouteEventsFromBigQuery({
        limit: 200,
        workspaceId: researchTaskWorkspaceId,
        portfolioId: tradeTicketPortfolioId,
      });
      if (result.status === "schema_outdated") {
        setExecutionRouteEventSyncStatus("error");
        setExecutionRouteEventSyncMessage(`路由事件表需先同步升級欄位：${result.missingFields?.join(", ") || "--"}`);
        return;
      }
      setExecutionRouteEventWarehouseCount(result.eventCount);
      setExecutionRouteEventSyncStatus("loaded");
      setExecutionRouteEventSyncMessage(`已讀取 ${result.eventCount} 筆路由事件 ${result.workspaceId}`);
    } catch (err: unknown) {
      setExecutionRouteEventSyncStatus("error");
      setExecutionRouteEventSyncMessage(err instanceof Error ? err.message : String(err));
    }
  };
  const handleSyncExecutionFillsToBigQuery = async () => {
    if (!executionFillRows.length) return;

    setExecutionFillSyncStatus("syncing");
    setExecutionFillSyncMessage("成交回報同步中。");

    try {
      const result = await syncExecutionFillsToBigQuery(
        buildExecutionFillSyncPayload({
          fills: executionFillRows,
          routes: executionRouteRows,
          generatedAt: decisionGeneratedAt,
          workspaceId: researchTaskWorkspaceId,
          actorId: executionOwner,
          portfolioId: tradeTicketPortfolioId,
          batchId: tradeTicketBatchId,
        }),
      );
      const isSynced = result.status === "synced";
      setExecutionFillSyncStatus(isSynced ? "synced" : "error");
      setExecutionFillWarehouseCount(result.insertedCount);
      setExecutionFillSyncMessage(`${result.insertedCount}/${result.receivedCount} 筆成交回報寫入 ${result.table}`);
    } catch (err: unknown) {
      setExecutionFillSyncStatus("error");
      setExecutionFillSyncMessage(err instanceof Error ? err.message : String(err));
    }
  };
  const handleLoadExecutionFillsFromBigQuery = async () => {
    setExecutionFillSyncStatus("loading");
    setExecutionFillSyncMessage("成交回報載入中。");

    try {
      const result = await fetchLatestExecutionFillsFromBigQuery({
        limit: 100,
        workspaceId: researchTaskWorkspaceId,
        portfolioId: tradeTicketPortfolioId,
      });
      if (result.status === "schema_outdated") {
        setExecutionFillSyncStatus("error");
        setExecutionFillSyncMessage(`成交回報表需先同步升級欄位：${result.missingFields?.join(", ") || "--"}`);
        return;
      }
      setExecutionFillWarehouseCount(result.fillCount);
      setExecutionFillSyncStatus("loaded");
      setExecutionFillSyncMessage(`已讀取 ${result.fillCount} 筆成交回報 ${result.workspaceId}`);
    } catch (err: unknown) {
      setExecutionFillSyncStatus("error");
      setExecutionFillSyncMessage(err instanceof Error ? err.message : String(err));
    }
  };
  const handleExportExecutionFillCsv = () => {
    if (!executionFillRows.length) return;

    downloadTextFile(
      `bigquery-execution-fills-${resultStamp()}.csv`,
      executionFillCsv(executionFillRows),
      "text/csv;charset=utf-8",
    );
  };
  const handleSyncPostTradeAttributionsToBigQuery = async () => {
    if (!postTradeAttributionRows.length) return;

    setPostTradeAttributionSyncStatus("syncing");
    setPostTradeAttributionSyncMessage("交易後歸因同步中。");

    try {
      const result = await syncPostTradeAttributionsToBigQuery(
        buildPostTradeAttributionSyncPayload({
          rows: postTradeAttributionRows,
          generatedAt: decisionGeneratedAt,
          workspaceId: researchTaskWorkspaceId,
          actorId: riskOwner,
          portfolioId: tradeTicketPortfolioId,
          batchId: tradeTicketBatchId,
          reviewDays: postTradeReviewDays,
          benchmarkMovePercent: postTradeBenchmarkMovePercent,
          residualMarketImpact: postTradeResidualMarketImpact,
        }),
      );
      const isSynced = result.status === "synced";
      setPostTradeAttributionSyncStatus(isSynced ? "synced" : "error");
      setPostTradeAttributionWarehouseCount(result.insertedCount);
      setPostTradeAttributionSyncMessage(`${result.insertedCount}/${result.receivedCount} 筆交易後歸因寫入 ${result.table}`);
    } catch (err: unknown) {
      setPostTradeAttributionSyncStatus("error");
      setPostTradeAttributionSyncMessage(err instanceof Error ? err.message : String(err));
    }
  };
  const handleLoadPostTradeAttributionsFromBigQuery = async () => {
    setPostTradeAttributionSyncStatus("loading");
    setPostTradeAttributionSyncMessage("交易後歸因載入中。");

    try {
      const result = await fetchLatestPostTradeAttributionsFromBigQuery({
        limit: 100,
        workspaceId: researchTaskWorkspaceId,
        portfolioId: tradeTicketPortfolioId,
      });
      if (result.status === "schema_outdated") {
        setPostTradeAttributionSyncStatus("error");
        setPostTradeAttributionSyncMessage(`交易後歸因表需先同步升級欄位：${result.missingFields?.join(", ") || "--"}`);
        return;
      }
      setPostTradeAttributionWarehouseCount(result.attributionCount);
      setPostTradeAttributionSyncStatus("loaded");
      setPostTradeAttributionSyncMessage(`已讀取 ${result.attributionCount} 筆交易後歸因 ${result.workspaceId}`);
    } catch (err: unknown) {
      setPostTradeAttributionSyncStatus("error");
      setPostTradeAttributionSyncMessage(err instanceof Error ? err.message : String(err));
    }
  };
  const handleExportPostTradeAttributionCsv = () => {
    if (!postTradeAttributionRows.length) return;

    downloadTextFile(
      `bigquery-post-trade-attribution-${resultStamp()}.csv`,
      executionReviewCsv(postTradeAttributionRows),
      "text/csv;charset=utf-8",
    );
  };
  const handleSyncPlatformExceptionsToBigQuery = async () => {
    if (!platformExceptionItems.length) return;

    setPlatformExceptionSyncStatus("syncing");
    setPlatformExceptionSyncMessage("例外事項同步中。");

    try {
      const result = await syncPlatformExceptionsToBigQuery(
        buildPlatformExceptionSyncPayload({
          items: platformExceptionItems,
          generatedAt: decisionGeneratedAt,
          workspaceId: researchTaskWorkspaceId,
          actorId: riskOwner,
          portfolioId: tradeTicketPortfolioId,
          batchId: tradeTicketBatchId,
          exceptionDueDays,
        }),
      );
      const isSynced = result.status === "synced";
      setPlatformExceptionSyncStatus(isSynced ? "synced" : "error");
      setPlatformExceptionWarehouseCount(result.insertedCount);
      setPlatformExceptionSyncMessage(`${result.insertedCount}/${result.receivedCount} 項例外事項寫入 ${result.table}`);
    } catch (err: unknown) {
      setPlatformExceptionSyncStatus("error");
      setPlatformExceptionSyncMessage(err instanceof Error ? err.message : String(err));
    }
  };
  const handleLoadPlatformExceptionsFromBigQuery = async () => {
    setPlatformExceptionSyncStatus("loading");
    setPlatformExceptionSyncMessage("例外事項載入中。");

    try {
      const result = await fetchLatestPlatformExceptionsFromBigQuery({
        limit: 100,
        workspaceId: researchTaskWorkspaceId,
        portfolioId: tradeTicketPortfolioId,
      });
      if (result.status === "schema_outdated") {
        setPlatformExceptionSyncStatus("error");
        setPlatformExceptionSyncMessage(`例外事項表需先同步升級欄位：${result.missingFields?.join(", ") || "--"}`);
        return;
      }
      setPlatformExceptionWarehouseCount(result.exceptionCount);
      setPlatformExceptionSyncStatus("loaded");
      setPlatformExceptionSyncMessage(`已讀取 ${result.exceptionCount} 項例外事項 ${result.workspaceId}`);
    } catch (err: unknown) {
      setPlatformExceptionSyncStatus("error");
      setPlatformExceptionSyncMessage(err instanceof Error ? err.message : String(err));
    }
  };
  const handleExportPlatformExceptionCsv = () => {
    if (!platformExceptionItems.length) return;

    downloadTextFile(
      `bigquery-platform-exceptions-${resultStamp()}.csv`,
      platformExceptionCsv(platformExceptionItems),
      "text/csv;charset=utf-8",
    );
  };
  const handleSyncSlaEscalationsToBigQuery = async () => {
    if (!slaEscalationItems.length) return;

    setSlaEscalationSyncStatus("syncing");
    setSlaEscalationSyncMessage("SLA 升級同步中。");

    try {
      const result = await syncSlaEscalationsToBigQuery(
        buildSlaEscalationSyncPayload({
          items: slaEscalationItems,
          generatedAt: decisionGeneratedAt,
          workspaceId: researchTaskWorkspaceId,
          actorId: riskOwner,
          portfolioId: tradeTicketPortfolioId,
          batchId: tradeTicketBatchId,
          slaCriticalHours,
          slaReviewHours,
        }),
      );
      const isSynced = result.status === "synced";
      setSlaEscalationSyncStatus(isSynced ? "synced" : "error");
      setSlaEscalationWarehouseCount(result.insertedCount);
      setSlaEscalationSyncMessage(`${result.insertedCount}/${result.receivedCount} 項 SLA 升級寫入 ${result.table}`);
    } catch (err: unknown) {
      setSlaEscalationSyncStatus("error");
      setSlaEscalationSyncMessage(err instanceof Error ? err.message : String(err));
    }
  };
  const handleLoadSlaEscalationsFromBigQuery = async () => {
    setSlaEscalationSyncStatus("loading");
    setSlaEscalationSyncMessage("SLA 升級載入中。");

    try {
      const result = await fetchLatestSlaEscalationsFromBigQuery({
        limit: 100,
        workspaceId: researchTaskWorkspaceId,
        portfolioId: tradeTicketPortfolioId,
      });
      if (result.status === "schema_outdated") {
        setSlaEscalationSyncStatus("error");
        setSlaEscalationSyncMessage(`SLA 升級表需先同步升級欄位：${result.missingFields?.join(", ") || "--"}`);
        return;
      }
      setSlaEscalationWarehouseCount(result.escalationCount);
      setSlaEscalationSyncStatus("loaded");
      setSlaEscalationSyncMessage(`已讀取 ${result.escalationCount} 項 SLA 升級 ${result.workspaceId}`);
    } catch (err: unknown) {
      setSlaEscalationSyncStatus("error");
      setSlaEscalationSyncMessage(err instanceof Error ? err.message : String(err));
    }
  };
  const handleSyncOperatingKriToBigQuery = async () => {
    if (!operatingKriItems.length) return;

    setOperatingKriSyncStatus("syncing");
    setOperatingKriSyncMessage("營運 KRI 同步中。");

    try {
      const result = await syncOperatingKriToBigQuery(
        buildOperatingKriSyncPayload({
          items: operatingKriItems,
          generatedAt: decisionGeneratedAt,
          workspaceId: researchTaskWorkspaceId,
          actorId: riskOwner,
          portfolioId: tradeTicketPortfolioId,
          batchId: tradeTicketBatchId,
          totalExecutionCost,
          totalUnfilledNotional,
          blockCount: operatingKriBlockCount,
          watchCount: operatingKriWatchCount,
        }),
      );
      const isSynced = result.status === "synced";
      setOperatingKriSyncStatus(isSynced ? "synced" : "error");
      setOperatingKriWarehouseCount(result.insertedCount);
      setOperatingKriSyncMessage(`${result.insertedCount}/${result.receivedCount} 項營運 KRI 寫入 ${result.table}`);
    } catch (err: unknown) {
      setOperatingKriSyncStatus("error");
      setOperatingKriSyncMessage(err instanceof Error ? err.message : String(err));
    }
  };
  const handleLoadOperatingKriFromBigQuery = async () => {
    setOperatingKriSyncStatus("loading");
    setOperatingKriSyncMessage("營運 KRI 載入中。");

    try {
      const result = await fetchLatestOperatingKriFromBigQuery({
        limit: 100,
        workspaceId: researchTaskWorkspaceId,
        portfolioId: tradeTicketPortfolioId,
      });
      if (result.status === "schema_outdated") {
        setOperatingKriSyncStatus("error");
        setOperatingKriSyncMessage(`營運 KRI 表需先同步升級欄位：${result.missingFields?.join(", ") || "--"}`);
        return;
      }
      setOperatingKriWarehouseCount(result.kriCount);
      setOperatingKriSyncStatus("loaded");
      setOperatingKriSyncMessage(`已讀取 ${result.kriCount} 項營運 KRI ${result.workspaceId}`);
    } catch (err: unknown) {
      setOperatingKriSyncStatus("error");
      setOperatingKriSyncMessage(err instanceof Error ? err.message : String(err));
    }
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
  const handleSyncDecisionFunnelToBigQuery = async () => {
    if (!decisionFunnelStages.length) return;

    setDecisionFunnelSyncStatus("syncing");
    setDecisionFunnelSyncMessage("決策漏斗同步中。");

    try {
      const result = await syncDecisionFunnelToBigQuery(
        buildDecisionFunnelSyncPayload({
          stages: decisionFunnelStages,
          generatedAt: decisionGeneratedAt,
          workspaceId: researchTaskWorkspaceId,
          actorId: riskOwner,
          portfolioId: tradeTicketPortfolioId,
          batchId: tradeTicketBatchId,
          totalRows: comparisonRows.length,
          visibleRows: visibleComparisonRows.length,
          candidateCount: candidateVisibleCount,
          activeAllocationCount: activeAllocationRows.length,
          activeRebalanceCount: activeRebalanceRows.length,
          tradeTicketCount: tradeTickets.length,
          filledTradeCount,
          blockCount: decisionFunnelBlockCount,
          watchCount: decisionFunnelWatchCount,
        }),
      );
      const isSynced = result.status === "synced";
      setDecisionFunnelSyncStatus(isSynced ? "synced" : "error");
      setDecisionFunnelWarehouseCount(result.insertedCount);
      setDecisionFunnelSyncMessage(`${result.insertedCount}/${result.receivedCount} 個決策階段寫入 ${result.table}`);
    } catch (err: unknown) {
      setDecisionFunnelSyncStatus("error");
      setDecisionFunnelSyncMessage(err instanceof Error ? err.message : String(err));
    }
  };
  const handleLoadDecisionFunnelFromBigQuery = async () => {
    setDecisionFunnelSyncStatus("loading");
    setDecisionFunnelSyncMessage("決策漏斗載入中。");

    try {
      const result = await fetchLatestDecisionFunnelFromBigQuery({
        limit: 100,
        workspaceId: researchTaskWorkspaceId,
        portfolioId: tradeTicketPortfolioId,
      });
      if (result.status === "schema_outdated") {
        setDecisionFunnelSyncStatus("error");
        setDecisionFunnelSyncMessage(`決策漏斗表需先同步升級欄位：${result.missingFields?.join(", ") || "--"}`);
        return;
      }
      setDecisionFunnelWarehouseCount(result.stageCount);
      setDecisionFunnelSyncStatus("loaded");
      setDecisionFunnelSyncMessage(`已讀取 ${result.stageCount} 個決策階段 ${result.workspaceId}`);
    } catch (err: unknown) {
      setDecisionFunnelSyncStatus("error");
      setDecisionFunnelSyncMessage(err instanceof Error ? err.message : String(err));
    }
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
  const handleSyncMarketAlertsToBigQuery = async () => {
    if (!marketAlertEvents.length) return;

    setMarketAlertSyncStatus("syncing");
    setMarketAlertSyncMessage("市場警示同步中。");

    try {
      const result = await syncMarketAlertsToBigQuery(
        buildMarketAlertSyncPayload({
          events: marketAlertEvents,
          commandSummary: marketAlertCommandSummary,
          generatedAt: decisionGeneratedAt,
          workspaceId: researchTaskWorkspaceId,
          actorId: riskOwner,
          portfolioId: tradeTicketPortfolioId,
          batchId: tradeTicketBatchId,
        }),
      );
      const isSynced = result.status === "synced";
      setMarketAlertSyncStatus(isSynced ? "synced" : "error");
      setMarketAlertWarehouseCount(result.insertedCount);
      setMarketAlertSyncMessage(`${result.insertedCount}/${result.receivedCount} 筆市場警示寫入 ${result.table}`);
    } catch (err: unknown) {
      setMarketAlertSyncStatus("error");
      setMarketAlertSyncMessage(err instanceof Error ? err.message : String(err));
    }
  };
  const handleLoadMarketAlertsFromBigQuery = async () => {
    setMarketAlertSyncStatus("loading");
    setMarketAlertSyncMessage("市場警示載入中。");

    try {
      const result = await fetchLatestMarketAlertsFromBigQuery({
        limit: 100,
        workspaceId: researchTaskWorkspaceId,
        portfolioId: tradeTicketPortfolioId,
      });
      if (result.status === "schema_outdated") {
        setMarketAlertSyncStatus("error");
        setMarketAlertSyncMessage(`市場警示表需先同步升級欄位：${result.missingFields?.join(", ") || "--"}`);
        return;
      }
      setMarketAlertWarehouseCount(result.alertCount);
      setMarketAlertSyncStatus("loaded");
      setMarketAlertSyncMessage(`已讀取 ${result.alertCount} 筆市場警示 ${result.workspaceId}`);
    } catch (err: unknown) {
      setMarketAlertSyncStatus("error");
      setMarketAlertSyncMessage(err instanceof Error ? err.message : String(err));
    }
  };
  const handleSyncMarketAlertOwnerQueuesToBigQuery = async () => {
    if (!marketAlertOwnerQueues.length) return;

    setMarketAlertOwnerQueueSyncStatus("syncing");
    setMarketAlertOwnerQueueSyncMessage("市場警示分派同步中。");

    try {
      const result = await syncMarketAlertOwnerQueuesToBigQuery(
        buildMarketAlertOwnerQueueSyncPayload({
          ownerQueues: marketAlertOwnerQueues,
          commandSummary: marketAlertCommandSummary,
          generatedAt: decisionGeneratedAt,
          workspaceId: researchTaskWorkspaceId,
          actorId: riskOwner,
          portfolioId: tradeTicketPortfolioId,
          batchId: tradeTicketBatchId,
        }),
      );
      const isSynced = result.status === "synced";
      setMarketAlertOwnerQueueSyncStatus(isSynced ? "synced" : "error");
      setMarketAlertOwnerQueueWarehouseCount(result.insertedCount);
      setMarketAlertOwnerQueueSyncMessage(`${result.insertedCount}/${result.receivedCount} 筆分派佇列寫入 ${result.table}`);
    } catch (err: unknown) {
      setMarketAlertOwnerQueueSyncStatus("error");
      setMarketAlertOwnerQueueSyncMessage(err instanceof Error ? err.message : String(err));
    }
  };
  const handleLoadMarketAlertOwnerQueuesFromBigQuery = async () => {
    setMarketAlertOwnerQueueSyncStatus("loading");
    setMarketAlertOwnerQueueSyncMessage("市場警示分派載入中。");

    try {
      const result = await fetchLatestMarketAlertOwnerQueuesFromBigQuery({
        limit: 100,
        workspaceId: researchTaskWorkspaceId,
        portfolioId: tradeTicketPortfolioId,
      });
      if (result.status === "schema_outdated") {
        setMarketAlertOwnerQueueSyncStatus("error");
        setMarketAlertOwnerQueueSyncMessage(`市場警示分派表需先同步升級欄位：${result.missingFields?.join(", ") || "--"}`);
        return;
      }
      setMarketAlertOwnerQueueWarehouseCount(result.queueCount);
      setMarketAlertOwnerQueueSyncStatus("loaded");
      setMarketAlertOwnerQueueSyncMessage(`已讀取 ${result.queueCount} 筆分派佇列 ${result.workspaceId}`);
    } catch (err: unknown) {
      setMarketAlertOwnerQueueSyncStatus("error");
      setMarketAlertOwnerQueueSyncMessage(err instanceof Error ? err.message : String(err));
    }
  };
  const handleSyncMarketAlertRunbooksToBigQuery = async () => {
    if (!marketAlertRunbookItems.length) return;

    setMarketAlertRunbookSyncStatus("syncing");
    setMarketAlertRunbookSyncMessage("市場警示 Runbook 同步中。");

    try {
      const result = await syncMarketAlertRunbooksToBigQuery(
        buildMarketAlertRunbookSyncPayload({
          runbookItems: marketAlertRunbookItems,
          commandSummary: marketAlertCommandSummary,
          generatedAt: decisionGeneratedAt,
          workspaceId: researchTaskWorkspaceId,
          actorId: riskOwner,
          portfolioId: tradeTicketPortfolioId,
          batchId: tradeTicketBatchId,
        }),
      );
      const isSynced = result.status === "synced";
      setMarketAlertRunbookSyncStatus(isSynced ? "synced" : "error");
      setMarketAlertRunbookWarehouseCount(result.insertedCount);
      setMarketAlertRunbookSyncMessage(`${result.insertedCount}/${result.receivedCount} 筆 Runbook 寫入 ${result.table}`);
    } catch (err: unknown) {
      setMarketAlertRunbookSyncStatus("error");
      setMarketAlertRunbookSyncMessage(err instanceof Error ? err.message : String(err));
    }
  };
  const handleLoadMarketAlertRunbooksFromBigQuery = async () => {
    setMarketAlertRunbookSyncStatus("loading");
    setMarketAlertRunbookSyncMessage("市場警示 Runbook 載入中。");

    try {
      const result = await fetchLatestMarketAlertRunbooksFromBigQuery({
        limit: 100,
        workspaceId: researchTaskWorkspaceId,
        portfolioId: tradeTicketPortfolioId,
      });
      if (result.status === "schema_outdated") {
        setMarketAlertRunbookSyncStatus("error");
        setMarketAlertRunbookSyncMessage(`市場警示 Runbook 表需先同步升級欄位：${result.missingFields?.join(", ") || "--"}`);
        return;
      }
      setMarketAlertRunbookWarehouseCount(result.runbookCount);
      setMarketAlertRunbookSyncStatus("loaded");
      setMarketAlertRunbookSyncMessage(`已讀取 ${result.runbookCount} 筆 Runbook ${result.workspaceId}`);
    } catch (err: unknown) {
      setMarketAlertRunbookSyncStatus("error");
      setMarketAlertRunbookSyncMessage(err instanceof Error ? err.message : String(err));
    }
  };
  const handleLoadMarketAlertWarehouseAudit = async () => {
    setMarketAlertAuditStatus("loading");
    setMarketAlertAuditMessage("市場警示稽核載入中。");

    try {
      const result = await fetchMarketAlertWarehouseAudit({
        limit: 12,
        workspaceId: researchTaskWorkspaceId,
        portfolioId: tradeTicketPortfolioId,
      });
      if (result.status === "schema_outdated") {
        setMarketAlertAuditStatus("error");
        setMarketAlertAuditMessage(`市場警示稽核需先同步升級欄位：${result.missingFields?.join(", ") || "--"}`);
        return;
      }
      if (result.status === "missing") {
        setMarketAlertAuditStatus("error");
        setMarketAlertAuditMessage(`市場警示稽核缺少資料表：${result.missingTables?.join(", ") || result.table}`);
        return;
      }
      setMarketAlertAuditRecords(result.auditRecords);
      setMarketAlertAuditStatus("loaded");
      setMarketAlertAuditMessage(`已載入 ${result.auditCount} 批市場警示稽核 ${result.workspaceId}`);
    } catch (err: unknown) {
      setMarketAlertAuditStatus("error");
      setMarketAlertAuditMessage(err instanceof Error ? err.message : String(err));
    }
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
  const handleExportResearchTaskSyncAuditCsv = () => {
    if (!researchTaskAuditRecords.length) return;

    downloadTextFile(
      `bigquery-research-task-sync-audit-${resultStamp()}.csv`,
      researchTaskSyncAuditCsv(researchTaskAuditRecords),
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
          workspaceId: researchTaskWorkspaceId,
          actorId: decisionOwner,
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
  const refreshResearchTaskSyncAudit = async (workspaceId: string) => {
    const result = await fetchResearchTaskSyncAudit(12, workspaceId);
    if (result.status === "schema_outdated") {
      throw new Error(`研究任務表需先同步升級欄位：${result.missingFields?.join(", ") || "--"}`);
    }
    setResearchTaskAuditRecords(result.auditRecords);
    setResearchTaskAuditError("");
    return result;
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
          workspaceId: researchTaskWorkspaceId,
          actorId: decisionOwner,
        }),
      );
      const isSynced = result.status === "synced";
      setResearchTaskSyncStatus(isSynced ? "synced" : "error");
      setResearchTaskSyncMessage(
        `${result.insertedCount}/${result.receivedCount} 筆寫入 ${result.table}`,
      );
      if (isSynced) {
        try {
          const auditResult = await refreshResearchTaskSyncAudit(researchTaskWorkspaceId);
          setResearchTaskSyncMessage(
            `${result.insertedCount}/${result.receivedCount} 筆寫入 ${result.table}；稽核 ${auditResult.auditCount} 批`,
          );
        } catch (auditErr: unknown) {
          const auditMessage = auditErr instanceof Error ? auditErr.message : String(auditErr);
          setResearchTaskAuditError(auditMessage);
          setResearchTaskSyncMessage(
            `${result.insertedCount}/${result.receivedCount} 筆寫入 ${result.table}；稽核更新失敗`,
          );
        }
      }
    } catch (err: unknown) {
      setResearchTaskSyncStatus("error");
      setResearchTaskSyncMessage(err instanceof Error ? err.message : String(err));
    }
  };
  const handleLoadResearchTasksFromBigQuery = async () => {
    setResearchTaskSyncStatus("loading");
    setResearchTaskSyncMessage("研究任務載入中。");

    try {
      const result = await fetchLatestResearchTasksFromBigQuery(50, researchTaskWorkspaceId);
      if (result.status === "schema_outdated") {
        setResearchTaskSyncStatus("error");
        setResearchTaskSyncMessage(`研究任務表需先同步升級欄位：${result.missingFields?.join(", ") || "--"}`);
        return;
      }
      const validStatuses = new Set(["blocked", "active", "ready", "done"]);
      const nextOverrides: ResearchTaskOverride[] = result.records
        .filter((record) => validStatuses.has(record.status))
        .map((record) => ({
          taskId: record.task_id,
          status: record.status as ResearchTaskOverride["status"],
          owner: record.owner || undefined,
          note: record.manual_note || undefined,
          updatedAt: record.updated_at,
        }));

      setResearchTaskOverrides(nextOverrides);
      writeResearchTaskOverridesToStorage(nextOverrides);
      setResearchTaskSyncStatus("loaded");
      setResearchTaskSyncMessage(`已載入 ${nextOverrides.length}/${result.recordCount} 筆 ${result.workspaceId}`);
    } catch (err: unknown) {
      setResearchTaskSyncStatus("error");
      setResearchTaskSyncMessage(err instanceof Error ? err.message : String(err));
    }
  };
  const handleLoadResearchTaskSyncAudit = async () => {
    setResearchTaskSyncStatus("loading");
    setResearchTaskSyncMessage("同步稽核載入中。");

    try {
      const result = await refreshResearchTaskSyncAudit(researchTaskWorkspaceId);
      setResearchTaskSyncStatus("loaded");
      setResearchTaskSyncMessage(`已載入 ${result.auditCount} 筆同步稽核 ${result.workspaceId}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setResearchTaskAuditError(message);
      setResearchTaskSyncStatus("error");
      setResearchTaskSyncMessage(message);
    }
  };
  const handleResearchTaskWorkspaceIdChange = (workspaceId: string) => {
    setResearchTaskWorkspaceId(workspaceId);
    writeResearchTaskWorkspaceIdToStorage(workspaceId);
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
  const loadDailyQuoteSymbols = useCallback(async (symbols: string[]) => {
    if (!symbols.length) {
      setDailyQuoteError("請至少輸入一個商品代號。");
      setDailyQuoteStatus("error");
      return;
    }

    setDailyQuoteStatus("loading");
    setDailyQuoteError("");
    setDailyQuoteRows([]);
    const requestedSymbols = dedupeDailyQuoteSymbols(symbols, 500);

    try {
      const rows = await loadDailyRowsForSymbols(requestedSymbols, dailyQuotePriceBasis);
      const loadedCount = rows.filter((row) => row.status === "loaded").length;
      setDailyQuoteRows(rows);
      setDailyQuoteError(dailyQuoteIssueSummary(rows));
      setDailyQuoteStatus(loadedCount ? "loaded" : "error");
    } catch (err: unknown) {
      setDailyQuoteRows([]);
      setDailyQuoteError(err instanceof Error ? err.message : String(err));
      setDailyQuoteStatus("error");
    }
  }, [dailyQuotePriceBasis]);
  const handleLoadDailyQuotes = async () => {
    await loadDailyQuoteSymbols(parseDailyQuoteSymbols(dailyQuoteSymbolsText, 500));
  };
  const handleDailyQuotePriceBasisChange = (nextPriceBasis: "adjusted" | "raw") => {
    if (nextPriceBasis === dailyQuotePriceBasis) return;

    setDailyQuoteRows([]);
    setDailyQuoteError("");
    setDailyQuoteStatus("loading");
    setDailyQuoteAutoLoadStatus("loading");
    setDailyQuotePriceBasis(nextPriceBasis);
  };
  const loadAdjustedBackfillSafetyPlan = useCallback(async () => {
    setAdjustedBackfillPlanStatus("loading");
    setAdjustedBackfillPlanError("");

    try {
      const plan = await fetchBigQueryAdjustedBackfillPlan(20, 0.35);
      setAdjustedBackfillPlan(plan);
      setAdjustedBackfillPlanStatus("loaded");
    } catch (err: unknown) {
      setAdjustedBackfillPlan(null);
      setAdjustedBackfillPlanError(err instanceof Error ? err.message : String(err));
      setAdjustedBackfillPlanStatus("error");
    }
  }, []);
  const loadAdjustedBackfillApplyConfig = useCallback(async () => {
    setAdjustedBackfillApplyConfigStatus("loading");
    setAdjustedBackfillApplyConfigError("");

    try {
      const status = await fetchBigQueryAdjustedBackfillApplyStatus();
      setAdjustedBackfillApplyConfig(status);
      setAdjustedBackfillApplyConfigStatus("loaded");
    } catch (err: unknown) {
      setAdjustedBackfillApplyConfig(null);
      setAdjustedBackfillApplyConfigError(err instanceof Error ? err.message : String(err));
      setAdjustedBackfillApplyConfigStatus("error");
    }
  }, []);
  useEffect(() => {
    if (!hasBigQueryCredentials) return;

    const timer = window.setTimeout(() => {
      void loadAdjustedBackfillSafetyPlan();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [hasBigQueryCredentials, loadAdjustedBackfillSafetyPlan]);
  useEffect(() => {
    if (!hasBigQueryCredentials) return;

    const timer = window.setTimeout(() => {
      void loadAdjustedBackfillApplyConfig();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [hasBigQueryCredentials, loadAdjustedBackfillApplyConfig]);
  useEffect(() => {
    if (!hasBigQueryCredentials) return;

    const autoLoadKey = dailyQuotePriceBasis;
    if (dailyQuoteAutoLoadKeyRef.current === autoLoadKey) return;
    dailyQuoteAutoLoadKeyRef.current = autoLoadKey;

    let ignore = false;

    async function loadAllStoredQuotes() {
      setDailyQuoteAutoLoadStatus("loading");
      setDailyQuoteStatus("loading");
      setDailyQuoteError("");
      setDailyQuoteRows([]);
      try {
        const rows = await loadDailyRowsFromQuoteCards(dailyQuotePriceBasis, 500);
        if (ignore) return;

        if (!rows.length) {
          setDailyQuoteError("BigQuery daily_prices 目前沒有可顯示標的。");
          setDailyQuoteStatus("error");
          setDailyQuoteAutoLoadStatus("done");
          return;
        }

        setDailyQuoteSymbolsText(rows.map((row) => row.symbol).join("\n"));
        const loadedCount = rows.filter((row) => row.status === "loaded").length;
        setDailyQuoteRows(rows);
        setDailyQuoteError(dailyQuoteIssueSummary(rows));
        setDailyQuoteStatus(loadedCount ? "loaded" : "error");
        setDailyQuoteAutoLoadStatus("done");
      } catch (err: unknown) {
        if (ignore) return;
        setDailyQuoteError(err instanceof Error ? err.message : String(err));
        setDailyQuoteStatus("error");
        setDailyQuoteAutoLoadStatus("done");
      }
    }

    void loadAllStoredQuotes();

    return () => {
      ignore = true;
    };
  }, [hasBigQueryCredentials, dailyQuotePriceBasis]);
  const isOverviewWorkspace = activeMarketWorkspace === "quotes";
  const isAssetsWorkspace = activeMarketWorkspace === "portfolio";
  const isPortfolioWorkspace = activeMarketWorkspace === "portfolio";
  const isOperationsWorkspace = false;
  const isBackofficeWorkspace = false;
  const loadedDailyQuoteRows = dailyQuoteRows.filter((row) => row.status === "loaded");
  const failedDailyQuoteRows = dailyQuoteRows.filter((row) => row.status === "error");
  const dailyQuoteQualitySummary = useMemo(() => {
    const summary = {
      readyCount: 0,
      watchCount: 0,
      riskCount: 0,
      riskExamples: [] as string[],
    };

    dailyQuoteRows.forEach((row) => {
      const quality = dailyQuoteQuality(row);
      if (quality.level === "ready") {
        summary.readyCount += 1;
        return;
      }
      if (quality.level === "watch") {
        summary.watchCount += 1;
        return;
      }
      summary.riskCount += 1;
      if (summary.riskExamples.length < 3) {
        summary.riskExamples.push(row.symbol);
      }
    });

    return summary;
  }, [dailyQuoteRows]);
  const filteredDailyQuoteRows = useMemo(() => {
    const cleanSearch = dailyQuoteSearch.trim().toLowerCase();
    const matchingRows = dailyQuoteRows.filter((row) => {
      const matchesFilter = dailyQuoteFilter === "all" || row.status === dailyQuoteFilter;
      const matchesSearch =
        !cleanSearch ||
        row.symbol.toLowerCase().includes(cleanSearch) ||
        (row.latestDate ?? "").includes(cleanSearch);
      return matchesFilter && matchesSearch;
    });
    return sortDailyQuoteRows(matchingRows, dailyQuoteSortKey, dailyQuoteSortDirection);
  }, [dailyQuoteRows, dailyQuoteSearch, dailyQuoteFilter, dailyQuoteSortKey, dailyQuoteSortDirection]);
  const positiveDailyQuoteCount = loadedDailyQuoteRows.filter((row) => typeof row.dailyReturn === "number" && row.dailyReturn > 0).length;
  const negativeDailyQuoteCount = loadedDailyQuoteRows.filter((row) => typeof row.dailyReturn === "number" && row.dailyReturn < 0).length;
  const bestDailyQuoteRow = loadedDailyQuoteRows.reduce<DailyMarketQuoteRow | null>((bestRow, row) => {
    if (typeof row.dailyReturn !== "number") return bestRow;
    if (!bestRow || typeof bestRow.dailyReturn !== "number" || row.dailyReturn > bestRow.dailyReturn) return row;
    return bestRow;
  }, null);
  const worstDailyQuoteRow = loadedDailyQuoteRows.reduce<DailyMarketQuoteRow | null>((worstRow, row) => {
    if (typeof row.dailyReturn !== "number") return worstRow;
    if (!worstRow || typeof worstRow.dailyReturn !== "number" || row.dailyReturn < worstRow.dailyReturn) return row;
    return worstRow;
  }, null);
  const marketWorkspaceItems: Array<{
    id: MarketDataWorkspace;
    label: string;
    description: string;
    metric: string;
  }> = [
    {
      id: "quotes",
      label: "今日行情",
      description: "當日價格、漲跌幅、資料日期與資料品質",
      metric: dailyQuoteRows.length ? `${loadedDailyQuoteRows.length}/${dailyQuoteRows.length} 檔` : bigQueryBadge,
    },
    {
      id: "portfolio",
      label: "投資組合分析",
      description: "選取投資標的，建立 watchlist、配置、再平衡與投組分析",
      metric: visibleComparisonRows.length ? `${visibleComparisonRows.length} 檔` : assetProfile?.symbol ?? assetQuery,
    },
  ];
  const dailyMarketSummaryCards = [
    {
      label: "行情狀態",
      value:
        dailyQuoteAutoLoadStatus === "loading"
          ? "自動載入中"
          : dailyQuoteStatus === "loaded"
            ? "已載入"
              : hasBigQueryCredentials
                ? "可讀取"
                : "待設定",
      note: dailyQuoteRows.length
        ? `成功 ${loadedDailyQuoteRows.length}，缺資料 ${failedDailyQuoteRows.length}`
        : dailyQuoteAutoLoadStatus === "loading"
          ? "一次讀取 BigQuery 行情摘要，逾時保護已啟用"
          : bigQueryBadge,
    },
    {
      label: "BigQuery 標的",
      value: dailyQuoteRows.length ? `${loadedDailyQuoteRows.length}/${dailyQuoteRows.length}` : "--",
      note: `資料庫共 ${formatCount(bigQueryDiagnostics?.priceSummary.symbol_count)} 檔`,
    },
    {
      label: "最新資料日",
      value: loadedDailyQuoteRows[0]?.latestDate ?? bigQueryDiagnostics?.priceSummary.latest_date ?? "--",
      note: "最新交易日",
    },
    {
      label: "價格口徑",
      value: dailyQuotePriceBasis === "raw" ? "Raw" : "Adjusted",
      note: "今日行情獨立於投組分析口徑",
    },
    {
      label: "資料品質",
      value: dailyQuoteRows.length ? `${dailyQuoteQualitySummary.readyCount}/${dailyQuoteRows.length} 可分析` : "--",
      note: dailyQuoteRows.length
        ? `觀察 ${dailyQuoteQualitySummary.watchCount}，風險 ${dailyQuoteQualitySummary.riskCount}`
        : "等待行情載入",
    },
  ];
  const adjustedRepairPlanRows = useMemo(
    () => {
      const apiRows = buildAdjustedRepairPlanRowsFromBackfillPlan(adjustedBackfillPlan);
      return apiRows.length ? apiRows : buildAdjustedRepairPlanRows(adjustedStaleSymbols);
    },
    [adjustedBackfillPlan, adjustedStaleSymbols],
  );
  const adjustedBackfillManualReviewRows = buildAdjustedBackfillManualReviewRows(adjustedBackfillPlan);
  const adjustedRepairSafeCount = adjustedRepairPlanRows.filter((row) => row.severity === "safe").length;
  const adjustedRepairBlockCount = adjustedRepairPlanRows.filter((row) => row.severity === "block").length;
  const adjustedRepairWatchCount = adjustedRepairPlanRows.filter((row) => row.severity === "watch").length;
  const adjustedRepairRawReadyCount = adjustedRepairPlanRows.filter((row) => row.canUseRaw).length;
  const adjustedRepairProposedRows = adjustedBackfillPlan?.proposedRowCount ?? 0;
  const adjustedRepairMaxLagDays = adjustedBackfillPlan
    ? adjustedBackfillPlan.candidates.reduce((maxValue, candidate) => (
      typeof candidate.adjustedLagDays === "number"
        ? Math.max(maxValue, candidate.adjustedLagDays)
        : maxValue
    ), 0)
    : adjustedStaleSymbols.reduce((maxValue, symbol) => (
      typeof symbol.adjusted_lag_days === "number"
        ? Math.max(maxValue, symbol.adjusted_lag_days)
        : maxValue
    ), 0);
  const adjustedBackfillSafeSymbols = useMemo(
    () => adjustedBackfillPlan?.candidates
      .filter((candidate) => candidate.decision === "safe_to_apply" && candidate.canApply)
      .map((candidate) => candidate.symbol) ?? [],
    [adjustedBackfillPlan],
  );
  const adjustedBackfillApplyIsConfigured = Boolean(adjustedBackfillApplyConfig?.isConfigured);
  const handleApplyAdjustedBackfill = async () => {
    const cleanToken = adjustedBackfillAdminToken.trim();
    if (!adjustedBackfillApplyIsConfigured) {
      setAdjustedBackfillApplyStatus("error");
      setAdjustedBackfillApplyMessage("Vercel 尚未設定 MARKET_ADMIN_TOKEN。");
      return;
    }
    if (!cleanToken) {
      setAdjustedBackfillApplyStatus("error");
      setAdjustedBackfillApplyMessage("請先輸入 MARKET_ADMIN_TOKEN。");
      return;
    }
    if (!adjustedBackfillSafeSymbols.length) {
      setAdjustedBackfillApplyStatus("error");
      setAdjustedBackfillApplyMessage("目前沒有通過安全檢查的標的可回補。");
      return;
    }

    setAdjustedBackfillApplyStatus("applying");
    setAdjustedBackfillApplyMessage("");
    try {
      const result = await applyBigQueryAdjustedBackfill(
        {
          symbols: adjustedBackfillSafeSymbols,
          max_daily_return: 0.35,
          limit: 20,
        },
        cleanToken,
      );
      setAdjustedBackfillPlan(result);
      setAdjustedBackfillApplyStatus("applied");
      setAdjustedBackfillApplyMessage(
        `已送出安全回補：${formatCount(result.execution?.updatedRowCount ?? 0)} 筆，${result.execution?.appliedSymbols.length ?? 0} 檔。`,
      );
      await loadAdjustedBackfillSafetyPlan();
    } catch (err: unknown) {
      setAdjustedBackfillApplyStatus("error");
      setAdjustedBackfillApplyMessage(err instanceof Error ? err.message : String(err));
    }
  };
  const handleDailyQuoteSort = (sortKey: DailyQuoteSortKey) => {
    setDailyQuoteSortDirection((currentDirection) => (
      dailyQuoteSortKey === sortKey && currentDirection === "asc" ? "desc" : "asc"
    ));
    setDailyQuoteSortKey(sortKey);
  };
  const handleAddDailyQuoteToPortfolio = (row: DailyMarketQuoteRow) => {
    if (row.status !== "loaded") return;
    if (/\s/.test(row.symbol)) {
      setDailyQuoteError(`「${row.symbol}」含有空格，目前投資組合分析會把空格視為分隔符；請先在 BigQuery master table 補一個不含空格的正式代號。`);
      return;
    }

    handleAppendComparisonSymbol(row.symbol);
    setActiveMarketWorkspace("portfolio");
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

        <section className="rounded-lg border border-slate-800 bg-slate-950 p-4 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-mono text-cyan-300">MARKET PLATFORM</p>
              <h3 className="mt-1 text-base font-bold text-slate-100">市場資料平台</h3>
              <p className="mt-1 text-xs text-slate-500">
                市場平台分成兩件事：先看今日行情，再選取標的做投資組合分析。
              </p>
            </div>
            <div className="inline-grid grid-cols-2 rounded-lg border border-slate-800 bg-slate-900 p-1 text-xs">
              {marketWorkspaceItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveMarketWorkspace(item.id)}
                  className={`rounded-md px-4 py-2 font-bold transition-colors ${
                    activeMarketWorkspace === item.id
                      ? "bg-cyan-600 text-white"
                      : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {marketWorkspaceItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveMarketWorkspace(item.id)}
                className={`rounded-md border p-3 text-left transition-colors ${
                  activeMarketWorkspace === item.id
                    ? "border-cyan-500 bg-cyan-500/10 text-cyan-100 shadow-[inset_0_0_0_1px_rgba(34,211,238,0.15)]"
                    : "border-slate-800 bg-slate-900/70 text-slate-300 hover:border-slate-700 hover:text-slate-100"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-bold">{item.label}</p>
                  <span className="rounded bg-slate-950 px-2 py-0.5 text-[10px] font-mono text-slate-400">
                    {item.metric}
                  </span>
                </div>
                <p className="mt-1 text-[11px] leading-5 text-slate-500">{item.description}</p>
              </button>
            ))}
          </div>
        </section>

        {isOperationsWorkspace && <BigQueryConnectionSection
          bigQueryStatus={bigQueryStatus}
          bigQueryError={bigQueryError}
          hasBigQueryCredentials={hasBigQueryCredentials}
          bigQueryBadge={bigQueryBadge}
        />}

        {isOverviewWorkspace && (
        <section className="bg-slate-950 border border-cyan-900/50 rounded-lg p-4 space-y-4">
          <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-mono text-cyan-300">DAILY MARKET</p>
              <h3 className="mt-1 text-base font-bold text-slate-100">今日行情</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                進入畫面會用 Raw 載入 BigQuery 全部標的；表格列出最新價格、前日漲跌與今年漲跌。
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-[1fr_150px_auto] gap-2 text-xs xl:min-w-[760px]">
              <input
                value={dailyQuoteSymbolsText}
                onChange={(event) => setDailyQuoteSymbolsText(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    void handleLoadDailyQuotes();
                  }
                }}
                placeholder="0050.TW 0056.TW 2330.TW SPY QQQ"
                className="min-w-0 bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-slate-100 font-mono outline-none focus:border-cyan-600"
              />
              <select
                value={dailyQuotePriceBasis}
                onChange={(event) => handleDailyQuotePriceBasisChange(event.target.value as "adjusted" | "raw")}
                className="bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-slate-100"
              >
                <option value="raw">Raw 最新價</option>
                <option value="adjusted">Adj 報酬</option>
              </select>
              <button
                type="button"
                onClick={() => void handleLoadDailyQuotes()}
                disabled={!hasBigQueryCredentials || dailyQuoteStatus === "loading"}
                className="px-3 py-2 rounded-md bg-cyan-700 hover:bg-cyan-600 text-white font-bold disabled:cursor-not-allowed disabled:bg-slate-900 disabled:text-slate-600"
              >
                {dailyQuoteStatus === "loading" ? "讀取中" : "重新讀取"}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 xl:grid-cols-5 gap-2">
            {dailyMarketSummaryCards.map((card) => (
              <div key={card.label} className="rounded-md border border-slate-800 bg-slate-900/70 p-3">
                <p className="text-[10px] text-slate-500">{card.label}</p>
                <p className="mt-1 text-lg font-bold font-mono text-slate-100">{card.value}</p>
                <p className="mt-1 text-[11px] text-slate-600">{card.note}</p>
              </div>
            ))}
          </div>

          {dailyQuoteError ? (
            <div className={`rounded-lg border p-3 text-xs whitespace-pre-wrap ${
              loadedDailyQuoteRows.length
                ? "border-amber-900/60 bg-amber-950/20 text-amber-200"
                : "border-red-900/60 bg-red-950/30 text-red-300"
            }`}>
              {dailyQuoteError}
            </div>
          ) : null}

          {dailyQuoteRows.length && (dailyQuoteQualitySummary.watchCount || dailyQuoteQualitySummary.riskCount) ? (
            <div className="rounded-lg border border-amber-900/60 bg-amber-950/10 p-3 text-xs text-amber-100">
              <p className="font-bold">資料品質提醒</p>
              <p className="mt-1 text-amber-200/80">
                目前有 {dailyQuoteQualitySummary.watchCount} 檔觀察、{dailyQuoteQualitySummary.riskCount} 檔風險。
                {dailyQuotePriceBasis === "raw"
                  ? " Raw 可用來查最新價，但報酬率可能受單位、配息或拆分影響；正式投組分析建議優先核對 Adj。"
                  : " Adj 較適合報酬分析；若資料日落後，請先依品質欄處理。"}
                {dailyQuoteQualitySummary.riskExamples.length
                  ? ` 風險例：${dailyQuoteQualitySummary.riskExamples.join("、")}。`
                  : ""}
              </p>
            </div>
          ) : null}

          {dailyQuoteRows.length ? (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div className="rounded-md border border-slate-800 bg-slate-900/70 p-3">
                  <p className="text-[10px] text-slate-500">漲跌分布</p>
                  <p className="mt-1 text-lg font-bold font-mono text-slate-100">
                    {positiveDailyQuoteCount} 上漲 / {negativeDailyQuoteCount} 下跌
                  </p>
                  <p className="mt-1 text-[11px] text-slate-600">以最新有效交易日計算前日漲跌</p>
                </div>
                <div className="rounded-md border border-slate-800 bg-slate-900/70 p-3">
                  <p className="text-[10px] text-slate-500">前日最強</p>
                  <p className="mt-1 text-lg font-bold font-mono text-emerald-200">
                    {bestDailyQuoteRow?.symbol ?? "--"}
                  </p>
                  <p className="mt-1 text-[11px] font-mono text-emerald-200">
                    {formatSignedPercent(bestDailyQuoteRow?.dailyReturn)}
                  </p>
                </div>
                <div className="rounded-md border border-slate-800 bg-slate-900/70 p-3">
                  <p className="text-[10px] text-slate-500">前日最弱</p>
                  <p className="mt-1 text-lg font-bold font-mono text-rose-200">
                    {worstDailyQuoteRow?.symbol ?? "--"}
                  </p>
                  <p className="mt-1 text-[11px] font-mono text-rose-200">
                    {formatSignedPercent(worstDailyQuoteRow?.dailyReturn)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_auto] gap-2 rounded-lg border border-slate-800 bg-slate-900/60 p-3 text-xs">
                <input
                  value={dailyQuoteSearch}
                  onChange={(event) => setDailyQuoteSearch(event.target.value)}
                  placeholder="搜尋標的或日期"
                  className="min-w-0 rounded-md border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-slate-100 outline-none placeholder:text-slate-700 focus:border-cyan-600"
                />
                <select
                  value={dailyQuoteFilter}
                  onChange={(event) => setDailyQuoteFilter(event.target.value as DailyQuoteFilter)}
                  className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
                >
                  <option value="all">全部標的</option>
                  <option value="loaded">只看有資料</option>
                  <option value="error">只看缺資料</option>
                </select>
                <div className="rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-slate-400">
                  顯示 {filteredDailyQuoteRows.length} / {dailyQuoteRows.length} 檔
                </div>
              </div>

              <div className="overflow-x-auto rounded-lg border border-slate-800">
                <table className="min-w-[1180px] w-full border-collapse text-left text-xs">
                  <thead className="bg-slate-900 text-slate-500">
                    <tr>
                      {[
                        ["symbol", "標的"],
                        ["latestDate", "資料日"],
                        ["latestPrice", "價格"],
                        ["dailyReturn", "前日漲跌"],
                        ["ytdReturn", "今年漲跌"],
                        ["status", "狀態"],
                      ].map(([sortKey, label]) => (
                        <th key={sortKey} className="border-b border-slate-800 px-3 py-2 font-medium">
                          <button
                            type="button"
                            onClick={() => handleDailyQuoteSort(sortKey as DailyQuoteSortKey)}
                            className="font-bold text-slate-300 hover:text-cyan-200"
                          >
                            {label}
                            {dailyQuoteSortKey === sortKey ? ` ${dailyQuoteSortDirection.toUpperCase()}` : ""}
                          </button>
                        </th>
                      ))}
                      <th className="border-b border-slate-800 px-3 py-2 font-bold text-slate-300">品質</th>
                      <th className="border-b border-slate-800 px-3 py-2 font-bold text-slate-300">資料量</th>
                      <th className="border-b border-slate-800 px-3 py-2 font-bold text-slate-300">動作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDailyQuoteRows.length ? filteredDailyQuoteRows.map((row) => {
                      const isLoaded = row.status === "loaded";
                      const canAddToPortfolio = isLoaded && !/\s/.test(row.symbol);
                      const canSwitchPriceBasis = Boolean(row.alternatePriceBasis);
                      const quality = dailyQuoteQuality(row);
                      return (
                        <tr key={`${row.symbol}-${row.priceBasis}`} className="border-b border-slate-800/70 bg-slate-950/60 hover:bg-slate-900">
                          <td className="px-3 py-3">
                            <p className="font-mono font-bold text-cyan-100">{row.symbol}</p>
                            <p className="mt-0.5 text-[10px] text-slate-600">{priceBasisLabel(row.priceBasis)}</p>
                          </td>
                          <td className="px-3 py-3 font-mono text-slate-300">{row.latestDate ?? "--"}</td>
                          <td className="px-3 py-3 font-mono text-slate-100">{formatPrice(row.latestPrice)}</td>
                          <td className="px-3 py-3">
                            <p className={`font-mono font-bold ${dailyReturnTextClass(row.dailyReturn)}`}>
                              {formatSignedPercent(row.dailyReturn)}
                            </p>
                            <p className={`mt-0.5 font-mono text-[10px] ${dailyReturnTextClass(row.dailyReturn)}`}>
                              {formatSignedPrice(row.dailyPriceChange)}
                            </p>
                          </td>
                          <td className="px-3 py-3">
                            <p className={`font-mono font-bold ${dailyReturnTextClass(row.ytdReturn)}`}>
                              {formatSignedPercent(row.ytdReturn)}
                            </p>
                            <p className="mt-0.5 font-mono text-[10px] text-slate-600">
                              起日 {row.ytdStartDate ?? "--"}
                            </p>
                          </td>
                          <td className="px-3 py-3">
                            <span className={`rounded px-2 py-1 text-[10px] font-bold ${
                              isLoaded
                                ? "bg-emerald-500/15 text-emerald-200"
                                : canSwitchPriceBasis
                                  ? "bg-cyan-500/15 text-cyan-200"
                                  : "bg-amber-500/15 text-amber-200"
                            }`}>
                              {isLoaded
                                ? "有資料"
                                : canSwitchPriceBasis
                                  ? `${priceBasisLabel(row.priceBasis)} 缺 / ${priceBasisLabel(row.alternatePriceBasis!)} 可用`
                                  : "缺資料"}
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            <span className={`rounded px-2 py-1 text-[10px] font-bold ${dailyQuoteQualityBadgeClass(quality.level)}`}>
                              {quality.label}
                            </span>
                            <p className="mt-1 max-w-[180px] text-[10px] leading-4 text-slate-500">
                              {quality.note}
                            </p>
                          </td>
                          <td className="px-3 py-3 font-mono text-slate-400">
                            {row.selectedPriceRows === null ? "--" : row.selectedPriceRows.toLocaleString("zh-TW")}
                          </td>
                          <td className="px-3 py-3">
                            {canSwitchPriceBasis ? (
                              <button
                                type="button"
                                onClick={() => handleDailyQuotePriceBasisChange(row.alternatePriceBasis!)}
                                title={`切到 ${priceBasisLabel(row.alternatePriceBasis!)} 查看 ${row.symbol}`}
                                className="rounded-md border border-cyan-800 bg-cyan-950/40 px-2 py-1 text-[10px] font-bold text-cyan-100 hover:bg-cyan-900"
                              >
                                切 {priceBasisLabel(row.alternatePriceBasis!)}
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleAddDailyQuoteToPortfolio(row)}
                                disabled={!canAddToPortfolio}
                                title={canAddToPortfolio ? "加入投資組合分析" : "缺資料或代號含空格，暫不加入投組分析"}
                                className="rounded-md border border-cyan-800 bg-cyan-950/40 px-2 py-1 text-[10px] font-bold text-cyan-100 hover:bg-cyan-900 disabled:cursor-not-allowed disabled:border-slate-800 disabled:bg-slate-900 disabled:text-slate-600"
                              >
                                加入分析
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    }) : (
                      <tr>
                        <td colSpan={9} className="px-3 py-6 text-center text-slate-500">
                          沒有符合條件的標的。
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {failedDailyQuoteRows.length ? (
                <div className="rounded-lg border border-amber-900/50 bg-amber-950/10 p-3 text-xs">
                  <p className="font-bold text-amber-200">缺資料標的</p>
                  <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                    {failedDailyQuoteRows.map((row) => (
                      <div key={`${row.symbol}-missing`} className="rounded-md border border-amber-900/40 bg-slate-950/60 p-2">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-mono font-bold text-amber-100">{row.symbol}</p>
                          {row.alternatePriceBasis ? (
                            <button
                              type="button"
                              onClick={() => handleDailyQuotePriceBasisChange(row.alternatePriceBasis!)}
                              className="shrink-0 rounded border border-cyan-800 bg-cyan-950/40 px-2 py-1 text-[10px] font-bold text-cyan-100 hover:bg-cyan-900"
                            >
                              切 {priceBasisLabel(row.alternatePriceBasis)}
                            </button>
                          ) : null}
                        </div>
                        <p className="mt-1 break-words text-[11px] text-amber-200/70">{row.errorMessage}</p>
                        {row.alternatePriceBasis ? (
                          <p className="mt-1 text-[10px] text-slate-500">
                            {priceBasisLabel(row.alternatePriceBasis)} 資料筆數：
                            {row.alternateSelectedPriceRows?.toLocaleString("zh-TW") ?? "--"}
                          </p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-cyan-900/60 bg-cyan-950/10 p-5 text-xs text-slate-400">
              {dailyQuoteStatus === "error"
                ? "目前沒有可顯示的行情表格。上方錯誤訊息會說明是 API 逾時、查詢失敗，或 BigQuery 沒有可用價格。"
                : dailyQuoteAutoLoadStatus === "loading" || dailyQuoteStatus === "loading"
                  ? "正在從 BigQuery 行情摘要載入每一檔資料；載入後會顯示今日價格、前日漲跌與今年漲跌。"
                  : "尚未載入行情。按「重新讀取」後會從 BigQuery 讀取全部或指定標的。"}
            </div>
          )}

          {adjustedRepairPlanRows.length ? (
            <section className="rounded-lg border border-amber-900/50 bg-amber-950/10 p-3 space-y-3">
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-mono text-amber-300">ADJUSTED PRICE REPAIR</p>
                  <h4 className="mt-1 text-sm font-bold text-amber-100">Adj 價格修復計畫</h4>
                  <p className="mt-1 text-[11px] leading-5 text-amber-200/75">
                    後端會逐檔檢查 anchor、raw 跳價與同日資料衝突；只有通過安全檢查的標的才可進入受保護寫入。
                  </p>
                  {adjustedBackfillPlanError ? (
                    <p className="mt-2 text-[11px] leading-5 text-rose-200">{adjustedBackfillPlanError}</p>
                  ) : null}
                  <button
                    type="button"
                    onClick={loadAdjustedBackfillSafetyPlan}
                    disabled={!hasBigQueryCredentials || adjustedBackfillPlanStatus === "loading"}
                    className="mt-3 rounded-md bg-amber-500/15 px-3 py-2 text-xs font-bold text-amber-100 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {adjustedBackfillPlanStatus === "loading" ? "檢查中" : "重新檢查"}
                  </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs lg:min-w-[560px]">
                  <div className="rounded-md border border-emerald-900/40 bg-slate-950/60 p-2">
                    <p className="text-[10px] text-slate-500">可自動補</p>
                    <p className="mt-1 font-mono text-lg font-bold text-emerald-100">{adjustedRepairSafeCount} 檔</p>
                  </div>
                  <div className="rounded-md border border-rose-900/40 bg-slate-950/60 p-2">
                    <p className="text-[10px] text-slate-500">人工覆核</p>
                    <p className="mt-1 font-mono text-lg font-bold text-rose-200">{adjustedRepairBlockCount} 檔</p>
                  </div>
                  <div className="rounded-md border border-slate-800 bg-slate-950/60 p-2">
                    <p className="text-[10px] text-slate-500">預計補列</p>
                    <p className="mt-1 font-mono text-lg font-bold text-cyan-100">{formatCount(adjustedRepairProposedRows)}</p>
                  </div>
                  <div className="rounded-md border border-slate-800 bg-slate-950/60 p-2">
                    <p className="text-[10px] text-slate-500">最大落後</p>
                    <p className="mt-1 font-mono text-lg font-bold text-slate-100">{adjustedRepairMaxLagDays} 天</p>
                  </div>
                </div>
              </div>

              {adjustedBackfillManualReviewRows.length ? (
                <div className="rounded-lg border border-rose-900/50 bg-rose-950/10 p-3">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-mono text-rose-300">MANUAL REVIEW QUEUE</p>
                      <h5 className="mt-1 text-sm font-bold text-rose-100">人工覆核清單</h5>
                      <p className="mt-1 text-[11px] leading-5 text-rose-200/70">
                        這裡只列不能自動補的標的；先處理最大 raw 跳價，再重新檢查安全計畫。
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleExportAdjustedBackfillManualReviewCsv}
                      className="rounded-md bg-rose-500/15 px-3 py-2 text-xs font-bold text-rose-100 hover:bg-rose-500/25"
                    >
                      匯出覆核 CSV
                    </button>
                  </div>
                  <div className="mt-3 grid grid-cols-1 xl:grid-cols-2 gap-2">
                    {adjustedBackfillManualReviewRows.slice(0, 6).map((row) => (
                      <div key={`${row.symbol}-manual-review`} className="rounded-md border border-slate-800 bg-slate-950/70 p-3 text-xs">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-mono font-bold text-cyan-100">{row.symbol}</p>
                            <p className="mt-1 text-[11px] text-rose-200/80">{row.reason}</p>
                          </div>
                          <span className="rounded bg-rose-500/15 px-2 py-1 text-[10px] font-bold text-rose-100">
                            {typeof row.adjustedLagDays === "number" ? `${row.adjustedLagDays} 天` : "無 Adj"}
                          </span>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                          <div>
                            <p className="text-slate-500">最大跳價</p>
                            <p className="mt-1 font-mono text-slate-100">{row.maxJumpDate ?? "--"}</p>
                          </div>
                          <div>
                            <p className="text-slate-500">跳幅</p>
                            <p className="mt-1 font-mono font-bold text-rose-100">{formatSignedPercent(row.dailyReturn)}</p>
                          </div>
                          <div>
                            <p className="text-slate-500">前一筆 Raw</p>
                            <p className="mt-1 font-mono text-slate-300">{row.previousDate ?? "--"} / {formatPrice(row.previousRawPrice)}</p>
                          </div>
                          <div>
                            <p className="text-slate-500">異常 Raw</p>
                            <p className="mt-1 font-mono text-slate-300">{row.maxJumpDate ?? "--"} / {formatPrice(row.rawPrice)}</p>
                          </div>
                        </div>
                        <div className="mt-3 rounded border border-slate-800 bg-slate-900/70 p-2">
                          <p className="text-[10px] text-slate-500">待補範圍</p>
                          <p className="mt-1 font-mono text-[11px] text-cyan-100">
                            {formatCount(row.proposedRowCount)} 筆 / {row.proposedWindow}
                          </p>
                          <p className="mt-2 text-[11px] leading-5 text-slate-400">{row.action}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {adjustedBackfillManualReviewRows.length > 6 ? (
                    <p className="mt-2 text-[10px] text-slate-500">
                      另有 {adjustedBackfillManualReviewRows.length - 6} 檔在 CSV 中；此區先顯示跳價最明顯的前 6 檔。
                    </p>
                  ) : null}
                </div>
              ) : null}

              <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-3">
                <div className="overflow-x-auto rounded-lg border border-slate-800">
                  <table className="min-w-[1080px] w-full border-collapse text-left text-xs">
                    <thead className="bg-slate-900 text-slate-500">
                      <tr>
                        {["標的", "判斷", "Raw 最新", "Adj 最新", "落後", "預計補", "風險檢查", "動作"].map((label) => (
                          <th key={label} className="border-b border-slate-800 px-3 py-2 font-bold text-slate-300">
                            {label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {adjustedRepairPlanRows.slice(0, 10).map((row) => (
                        <tr key={`${row.symbol}-repair`} className="border-b border-slate-800/70 bg-slate-950/60">
                          <td className="px-3 py-2 font-mono font-bold text-cyan-100">{row.symbol}</td>
                          <td className="px-3 py-2">
                            <span className={`rounded px-2 py-1 text-[10px] font-bold ${adjustedRepairBadgeClass(row.severity)}`}>
                              {row.issueLabel}
                            </span>
                          </td>
                          <td className="px-3 py-2 font-mono text-slate-300">{row.rawLatestDate}</td>
                          <td className="px-3 py-2 font-mono text-slate-300">{row.adjustedLatestDate}</td>
                          <td className="px-3 py-2 font-mono text-amber-100">{row.lagText}</td>
                          <td className="px-3 py-2 font-mono text-cyan-100">{row.proposedText}</td>
                          <td className="px-3 py-2 text-slate-400">{row.riskText}</td>
                          <td className="px-3 py-2 text-slate-400">
                            <p>{row.action}</p>
                            <p className="mt-1 font-mono text-[10px] text-slate-600">Adj / Raw {row.coverageText}</p>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3 text-xs">
                  <p className="font-bold text-slate-200">放行規則</p>
                  <div className="mt-2 space-y-2 text-[11px] leading-5 text-slate-500">
                    <p>1. Raw 用於「今日行情」看最新價。</p>
                    <p>2. Adj 用於「投資組合分析」算報酬、波動與回撤。</p>
                    <p>3. 後端只允許通過安全檢查的標的自動補 adj_price。</p>
                    <p>4. 跳價、無 anchor 或同日衝突會保留人工覆核，不會自動寫入。</p>
                  </div>
                  <div className="mt-3 rounded-md border border-amber-900/40 bg-amber-950/20 p-2 text-[11px] text-amber-100">
                    目前狀態：{adjustedRepairSafeCount} 檔可自動補、{adjustedRepairBlockCount} 檔人工覆核、{adjustedRepairRawReadyCount} 檔 Raw 可查價；
                    寫入權限 {adjustedBackfillApplyConfigStatus === "loading" ? "檢查中" : adjustedBackfillApplyIsConfigured ? "已啟用" : "尚未設定"}。
                    {adjustedRepairWatchCount ? ` 另有 ${adjustedRepairWatchCount} 檔觀察。` : ""}
                  </div>
                  {adjustedBackfillApplyConfigError ? (
                    <p className="mt-2 text-[11px] leading-5 text-rose-200">{adjustedBackfillApplyConfigError}</p>
                  ) : null}
                  <div className="mt-3 rounded-md border border-slate-800 bg-slate-950/80 p-2">
                    <label className="text-[10px] font-bold text-slate-500" htmlFor="adjusted-backfill-admin-token">
                      MARKET_ADMIN_TOKEN
                    </label>
                    <input
                      id="adjusted-backfill-admin-token"
                      type="password"
                      autoComplete="off"
                      value={adjustedBackfillAdminToken}
                      onChange={(event) => setAdjustedBackfillAdminToken(event.target.value)}
                      placeholder="輸入後才可執行"
                      className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-2 text-xs font-mono text-slate-100 outline-none focus:border-amber-400"
                    />
                    <button
                      type="button"
                      onClick={handleApplyAdjustedBackfill}
                      disabled={
                        !hasBigQueryCredentials ||
                        !adjustedBackfillApplyIsConfigured ||
                        !adjustedBackfillSafeSymbols.length ||
                        adjustedBackfillApplyStatus === "applying" ||
                        adjustedBackfillPlanStatus === "loading"
                      }
                      className="mt-2 w-full rounded-md bg-emerald-500/15 px-3 py-2 text-xs font-bold text-emerald-100 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {adjustedBackfillApplyStatus === "applying"
                        ? "安全回補中"
                        : `只補通過檢查的 ${adjustedBackfillSafeSymbols.length} 檔`}
                    </button>
                    <p className="mt-2 text-[10px] leading-4 text-slate-500">
                      安全清單：{adjustedBackfillSafeSymbols.length ? adjustedBackfillSafeSymbols.join("、") : "--"}
                    </p>
                    {!adjustedBackfillApplyIsConfigured ? (
                      <div className="mt-2 rounded-md border border-amber-900/40 bg-amber-950/10 p-2">
                        <p className="text-[10px] leading-4 text-amber-200/80">
                          請先在 Vercel Environment Variables 新增 {adjustedBackfillApplyConfig?.requiredEnvVar ?? "MARKET_ADMIN_TOKEN"}，完成後重新部署或等待 Production 生效。
                        </p>
                        {adjustedBackfillApplyConfig?.setupSteps?.length ? (
                          <ol className="mt-2 list-decimal space-y-1 pl-4 text-[10px] leading-4 text-slate-500">
                            {adjustedBackfillApplyConfig.setupSteps.map((step) => (
                              <li key={step}>{step}</li>
                            ))}
                          </ol>
                        ) : null}
                        <button
                          type="button"
                          onClick={loadAdjustedBackfillApplyConfig}
                          disabled={adjustedBackfillApplyConfigStatus === "loading"}
                          className="mt-2 rounded-md border border-amber-800 px-2 py-1 text-[10px] font-bold text-amber-100 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {adjustedBackfillApplyConfigStatus === "loading" ? "檢查中" : "重新檢查寫入權限"}
                        </button>
                      </div>
                    ) : null}
                    {adjustedBackfillApplyMessage ? (
                      <p className={`mt-2 text-[11px] leading-5 ${adjustedBackfillApplyStatus === "error" ? "text-rose-200" : "text-emerald-200"}`}>
                        {adjustedBackfillApplyMessage}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            </section>
          ) : null}
        </section>
        )}

        {(isOperationsWorkspace || isBackofficeWorkspace) && (
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
              {(isOverviewWorkspace || isOperationsWorkspace) && (
              <>
              <BigQueryQualityCardGrid
                qualityCards={qualityCards}
                issueCards={issueCards}
              />
              <BigQueryQualityScorecard scorecard={bigQueryDiagnostics.qualityScorecard} />
              </>
              )}

              {isOperationsWorkspace && (
              <>
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
              <DataProductObservabilitySection
                summary={dataProductObservabilitySummary}
                items={dataProductObservabilityItems}
                reliabilityActions={dataProductReliabilityActions}
                sloSummary={dataProductSloSummary}
                sloItems={dataProductSloItems}
                onExportCsv={handleExportDataProductObservabilityCsv}
                onExportReliabilityCsv={handleExportDataProductReliabilityActionsCsv}
                onExportSloCsv={handleExportDataProductSloCsv}
              />
              <DataProductStatusPageSection
                summary={dataProductStatusPageSummary}
                items={dataProductStatusPageItems}
                onExportCsv={handleExportDataProductStatusPageCsv}
              />
              <DataProductErrorBudgetSection
                summary={dataProductErrorBudgetSummary}
                items={dataProductErrorBudgetItems}
                onExportCsv={handleExportDataProductErrorBudgetCsv}
              />
              <DataProductClientImpactSection
                summary={dataProductClientImpactSummary}
                items={dataProductClientImpactItems}
                onExportCsv={handleExportDataProductClientImpactCsv}
              />
              </>
              )}
              {isBackofficeWorkspace && (
              <>
              <AccountHealthSection
                summary={accountHealthSummary}
                items={accountHealthItems}
                onExportCsv={handleExportAccountHealthCsv}
              />
              <AccountActionQueueSection
                summary={accountActionQueueSummary}
                items={accountActionQueueItems}
                onExportCsv={handleExportAccountActionQueueCsv}
              />
              <PlatformCommandProductNavigatorSection
                summary={platformCommandProductNavigatorSummary}
                items={platformCommandProductNavigatorItems}
                activeAreaId={activeCommandAreaId}
                onSelectArea={handleSelectCommandArea}
              />
              <PlatformCommandLaunchReadinessSection
                summary={platformCommandLaunchReadinessSummary}
                items={platformCommandLaunchReadinessItems}
                onSelectArea={handleSelectCommandArea}
              />
              <div
                id="command-foundation"
                className={isCommandAreaVisible("command-foundation") ? "space-y-3 scroll-mt-24" : "hidden"}
              >
              <PlatformCommandSearchSection
                summary={platformCommandSearchSummary}
                items={platformCommandSearchItems}
                onExportCsv={handleExportPlatformCommandSearchCsv}
              />
              <PlatformCommandTriageSection
                summary={platformCommandTriageSummary}
                items={platformCommandTriageItems}
                onExportCsv={handleExportPlatformCommandTriageCsv}
              />
              <PlatformCommandSlaSection
                summary={platformCommandSlaSummary}
                items={platformCommandSlaItems}
                onExportCsv={handleExportPlatformCommandSlaCsv}
              />
              <PlatformCommandOwnerLoadSection
                summary={platformCommandOwnerLoadSummary}
                items={platformCommandOwnerLoadItems}
                onExportCsv={handleExportPlatformCommandOwnerLoadCsv}
              />
              <PlatformCommandHandoffSection
                summary={platformCommandHandoffSummary}
                items={platformCommandHandoffItems}
                onExportCsv={handleExportPlatformCommandHandoffCsv}
              />
              <PlatformCommandClosureSection
                summary={platformCommandClosureSummary}
                items={platformCommandClosureItems}
                onExportCsv={handleExportPlatformCommandClosureCsv}
              />
              <PlatformCommandPostmortemSection
                summary={platformCommandPostmortemSummary}
                items={platformCommandPostmortemItems}
                onExportCsv={handleExportPlatformCommandPostmortemCsv}
              />
              <PlatformCommandImprovementBacklogSection
                summary={platformCommandImprovementBacklogSummary}
                items={platformCommandImprovementBacklogItems}
                onExportCsv={handleExportPlatformCommandImprovementBacklogCsv}
              />
              </div>
              <div
                id="command-governance"
                className={isCommandAreaVisible("command-governance") ? "space-y-3 scroll-mt-24" : "hidden"}
              >
              <PlatformCommandReleaseReadinessSection
                summary={platformCommandReleaseReadinessSummary}
                items={platformCommandReleaseReadinessItems}
                onExportCsv={handleExportPlatformCommandReleaseReadinessCsv}
              />
              <PlatformCommandReleaseMonitorSection
                summary={platformCommandReleaseMonitorSummary}
                items={platformCommandReleaseMonitorItems}
                onExportCsv={handleExportPlatformCommandReleaseMonitorCsv}
              />
              <PlatformCommandOperatingReviewSection
                summary={platformCommandOperatingReviewSummary}
                items={platformCommandOperatingReviewItems}
                onExportCsv={handleExportPlatformCommandOperatingReviewCsv}
              />
              <PlatformCommandExecutiveBriefSection
                summary={platformCommandExecutiveBriefSummary}
                items={platformCommandExecutiveBriefItems}
                onExportCsv={handleExportPlatformCommandExecutiveBriefCsv}
              />
              <PlatformCommandDecisionRegisterSection
                summary={platformCommandDecisionRegisterSummary}
                items={platformCommandDecisionRegisterItems}
                onExportCsv={handleExportPlatformCommandDecisionRegisterCsv}
              />
              <PlatformCommandDecisionFollowUpSection
                summary={platformCommandDecisionFollowUpSummary}
                items={platformCommandDecisionFollowUpItems}
                onExportCsv={handleExportPlatformCommandDecisionFollowUpCsv}
              />
              <PlatformCommandEvidenceLedgerSection
                summary={platformCommandEvidenceLedgerSummary}
                items={platformCommandEvidenceLedgerItems}
                onExportCsv={handleExportPlatformCommandEvidenceLedgerCsv}
              />
              <PlatformCommandAuditTrailSection
                summary={platformCommandAuditTrailSummary}
                items={platformCommandAuditTrailItems}
                onExportCsv={handleExportPlatformCommandAuditTrailCsv}
              />
              <PlatformCommandComplianceAttestationSection
                summary={platformCommandComplianceAttestationSummary}
                items={platformCommandComplianceAttestationItems}
                onExportCsv={handleExportPlatformCommandComplianceAttestationCsv}
              />
              <PlatformCommandBoardReportingSection
                summary={platformCommandBoardReportingSummary}
                items={platformCommandBoardReportingItems}
                onExportCsv={handleExportPlatformCommandBoardReportingCsv}
              />
              </div>
              <div
                id="command-client-commercial"
                className={isCommandAreaVisible("command-client-commercial") ? "space-y-3 scroll-mt-24" : "hidden"}
              >
              <PlatformCommandClientReadoutSection
                summary={platformCommandClientReadoutSummary}
                items={platformCommandClientReadoutItems}
                onExportCsv={handleExportPlatformCommandClientReadoutCsv}
              />
              <PlatformCommandProductPackagingSection
                summary={platformCommandProductPackagingSummary}
                items={platformCommandProductPackagingItems}
                onExportCsv={handleExportPlatformCommandProductPackagingCsv}
              />
              <PlatformCommandRevenueReadinessSection
                summary={platformCommandRevenueReadinessSummary}
                items={platformCommandRevenueReadinessItems}
                onExportCsv={handleExportPlatformCommandRevenueReadinessCsv}
              />
              <PlatformCommandGtmLaunchSection
                summary={platformCommandGtmLaunchSummary}
                items={platformCommandGtmLaunchItems}
                onExportCsv={handleExportPlatformCommandGtmLaunchCsv}
              />
              <PlatformCommandCustomerSuccessActivationSection
                summary={platformCommandCustomerSuccessActivationSummary}
                items={platformCommandCustomerSuccessActivationItems}
                onExportCsv={handleExportPlatformCommandCustomerSuccessActivationCsv}
              />
              <PlatformCommandExpansionPlaybookSection
                summary={platformCommandExpansionPlaybookSummary}
                items={platformCommandExpansionPlaybookItems}
                onExportCsv={handleExportPlatformCommandExpansionPlaybookCsv}
              />
              </div>
              <div
                id="command-revenue-engine"
                className={isCommandAreaVisible("command-revenue-engine") ? "space-y-3 scroll-mt-24" : "hidden"}
              >
              <PlatformCommandRenewalForecastSection
                summary={platformCommandRenewalForecastSummary}
                items={platformCommandRenewalForecastItems}
                onExportCsv={handleExportPlatformCommandRenewalForecastCsv}
              />
              <PlatformCommandRevenueOperationsLedgerSection
                summary={platformCommandRevenueOperationsLedgerSummary}
                items={platformCommandRevenueOperationsLedgerItems}
                onExportCsv={handleExportPlatformCommandRevenueOperationsLedgerCsv}
              />
              <PlatformCommandUnitEconomicsSection
                summary={platformCommandUnitEconomicsSummary}
                items={platformCommandUnitEconomicsItems}
                onExportCsv={handleExportPlatformCommandUnitEconomicsCsv}
              />
              <PlatformCommandPricingGovernanceSection
                summary={platformCommandPricingGovernanceSummary}
                items={platformCommandPricingGovernanceItems}
                onExportCsv={handleExportPlatformCommandPricingGovernanceCsv}
              />
              <PlatformCommandQuoteDeskSection
                summary={platformCommandQuoteDeskSummary}
                items={platformCommandQuoteDeskItems}
                onExportCsv={handleExportPlatformCommandQuoteDeskCsv}
              />
              <PlatformCommandEntitlementProvisioningSection
                summary={platformCommandEntitlementProvisioningSummary}
                items={platformCommandEntitlementProvisioningItems}
                onExportCsv={handleExportPlatformCommandEntitlementProvisioningCsv}
              />
              <PlatformCommandSubscriptionBillingSection
                summary={platformCommandSubscriptionBillingSummary}
                items={platformCommandSubscriptionBillingItems}
                onExportCsv={handleExportPlatformCommandSubscriptionBillingCsv}
              />
              <PlatformCommandSlaOperationsSection
                summary={platformCommandSlaOperationsSummary}
                items={platformCommandSlaOperationsItems}
                onExportCsv={handleExportPlatformCommandSlaOperationsCsv}
              />
              <PlatformCommandUsageMonitoringSection
                summary={platformCommandUsageMonitoringSummary}
                items={platformCommandUsageMonitoringItems}
                onExportCsv={handleExportPlatformCommandUsageMonitoringCsv}
              />
              <PlatformCommandRevenueAuditSection
                summary={platformCommandRevenueAuditSummary}
                items={platformCommandRevenueAuditItems}
                onExportCsv={handleExportPlatformCommandRevenueAuditCsv}
              />
              <PlatformCommandCustomerHealthSection
                summary={platformCommandCustomerHealthSummary}
                items={platformCommandCustomerHealthItems}
                onExportCsv={handleExportPlatformCommandCustomerHealthCsv}
              />
              </div>
              <div
                id="command-executive-control"
                className={isCommandAreaVisible("command-executive-control") ? "space-y-3 scroll-mt-24" : "hidden"}
              >
              <PlatformCommandManagementOverviewSection
                summary={platformCommandManagementOverviewSummary}
                items={platformCommandManagementOverviewItems}
                onExportCsv={handleExportPlatformCommandManagementOverviewCsv}
              />
              <PlatformCommandBoardPackSection
                summary={platformCommandBoardPackSummary}
                items={platformCommandBoardPackItems}
                onExportCsv={handleExportPlatformCommandBoardPackCsv}
              />
              <PlatformCommandOperatingControlTowerSection
                summary={platformCommandOperatingControlTowerSummary}
                items={platformCommandOperatingControlTowerItems}
                onExportCsv={handleExportPlatformCommandOperatingControlTowerCsv}
              />
              <PlatformCommandCeoDecisionConsoleSection
                summary={platformCommandCeoDecisionConsoleSummary}
                items={platformCommandCeoDecisionConsoleItems}
                onExportCsv={handleExportPlatformCommandCeoDecisionConsoleCsv}
              />
              </div>
              <div
                id="command-stakeholder-output"
                className={isCommandAreaVisible("command-stakeholder-output") ? "space-y-3 scroll-mt-24" : "hidden"}
              >
              <PlatformCommandStakeholderOutputPackSection
                summary={platformCommandStakeholderOutputPackSummary}
                items={platformCommandStakeholderOutputPackItems}
                onExportCsv={handleExportPlatformCommandStakeholderOutputPackCsv}
              />
              </div>
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
                apiVersionGovernanceDecision={apiVersionGovernanceDecision}
                apiVersionProductionCount={apiVersionProductionCount}
                apiVersionMigrationRiskCount={apiVersionMigrationRiskCount}
                apiVersionGovernanceItems={apiVersionGovernanceItems}
                onExportApiVersionGovernanceCsv={handleExportApiVersionGovernanceCsv}
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
              </>
              )}
              {(isOverviewWorkspace || isOperationsWorkspace) && (
              <BigQueryWarehouseSnapshotSection
                bigQueryDiagnostics={bigQueryDiagnostics}
                fxFreshnessDays={fxFreshnessDays}
                staleSymbols={staleSymbols}
                adjustedStaleSymbols={adjustedStaleSymbols}
                fxCurrencies={fxCurrencies}
              />
              )}
            </div>
          ) : (
            <div className="border border-dashed border-slate-800 rounded-lg p-4 text-xs text-slate-500">
              設定 GCP_SERVICE_ACCOUNT_JSON 後，這裡會顯示 daily_prices / daily_fx 的資料覆蓋率。
            </div>
          )}
        </section>
        )}

        {isAssetsWorkspace && (
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
          onAddAssetToComparison={handleAppendComparisonSymbol}
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
        )}
        {isPortfolioWorkspace && (
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
            isSearchingAssets={isSearchingAssets}
            assetQuery={assetQuery}
            onAssetQueryChange={setAssetQuery}
            assetSuggestions={assetSuggestions}
            onSearchAssets={handleSearchAssets}
            onAppendComparisonSymbol={handleAppendComparisonSymbol}
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
            workspaceId={researchTaskWorkspaceId}
            warehouseTable={researchTaskWarehouseStatus?.taskTable}
            warehouseError={researchTaskWarehouseError}
            auditRecords={researchTaskAuditRecords}
            auditError={researchTaskAuditError}
            syncStatus={researchTaskSyncStatus}
            syncMessage={researchTaskSyncMessage}
            onWorkspaceIdChange={handleResearchTaskWorkspaceIdChange}
            onTaskOverrideChange={handleResearchTaskOverrideChange}
            onResetTaskOverride={handleResetResearchTaskOverride}
            onSyncResearchTasksToBigQuery={handleSyncResearchTasksToBigQuery}
            onLoadResearchTasksFromBigQuery={handleLoadResearchTasksFromBigQuery}
            onLoadResearchTaskSyncAudit={handleLoadResearchTaskSyncAudit}
            onExportResearchTaskCsv={handleExportResearchTaskCsv}
            onExportResearchTaskSyncAuditCsv={handleExportResearchTaskSyncAuditCsv}
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
                          onSyncTradeTicketsToBigQuery={handleSyncTradeTicketsToBigQuery}
                          onLoadTradeTicketsFromBigQuery={handleLoadTradeTicketsFromBigQuery}
                          tradeTickets={tradeTickets}
                          skippedTradeCount={skippedTradeCount}
                          hasBigQueryCredentials={hasBigQueryCredentials}
                          syncStatus={tradeTicketSyncStatus}
                          syncMessage={tradeTicketSyncMessage}
                          warehouseTicketCount={tradeTicketWarehouseCount}
                          approvalDecision={tradeTicketApprovalDecision}
                          approvalBlockCount={tradeTicketApprovalBlockCount}
                          approvalWatchCount={tradeTicketApprovalWatchCount}
                          approvalGateItems={tradeTicketApprovalGateItems}
                          onExportTradeTicketApprovalGateCsv={handleExportTradeTicketApprovalGateCsv}
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

                          <ExecutionRoutingSection
                            executionRouteDecision={executionRouteDecision}
                            primaryVenue={primaryExecutionVenue}
                            onPrimaryVenueChange={setPrimaryExecutionVenue}
                            backupVenue={backupExecutionVenue}
                            onBackupVenueChange={setBackupExecutionVenue}
                            venueCapacityAmount={venueCapacityAmount}
                            onVenueCapacityAmountChange={setVenueCapacityAmount}
                            routeSlippageBps={routeSlippageBps}
                            onRouteSlippageBpsChange={setRouteSlippageBps}
                            routeCommissionBps={routeCommissionBps}
                            onRouteCommissionBpsChange={setRouteCommissionBps}
                            onSyncExecutionRoutesToBigQuery={handleSyncExecutionRoutesToBigQuery}
                            onLoadExecutionRoutesFromBigQuery={handleLoadExecutionRoutesFromBigQuery}
                            onExportExecutionRouteCsv={handleExportExecutionRouteCsv}
                            executionRouteRows={executionRouteRows}
                            routedCount={executionRouteRoutedCount}
                            stagedCount={executionRouteStagedCount}
                            blockedCount={executionRouteBlockedCount}
                            estimatedRouteCost={estimatedRouteCost}
                            hasBigQueryCredentials={hasBigQueryCredentials}
                            syncStatus={executionRouteSyncStatus}
                            syncMessage={executionRouteSyncMessage}
                            warehouseRouteCount={executionRouteWarehouseCount}
                          />

                          <ExecutionRouteEventSection
                            brokerBoundaryMode={brokerBoundaryMode}
                            onBrokerBoundaryModeChange={setBrokerBoundaryMode}
                            eventRows={executionRouteEventRows}
                            eventDecision={executionRouteEventDecision}
                            eventPassCount={executionRouteEventPassCount}
                            eventWatchCount={executionRouteEventWatchCount}
                            eventBlockCount={executionRouteEventBlockCount}
                            hasBigQueryCredentials={hasBigQueryCredentials}
                            syncStatus={executionRouteEventSyncStatus}
                            syncMessage={executionRouteEventSyncMessage}
                            warehouseEventCount={executionRouteEventWarehouseCount}
                            onSyncExecutionRouteEventsToBigQuery={handleSyncExecutionRouteEventsToBigQuery}
                            onLoadExecutionRouteEventsFromBigQuery={handleLoadExecutionRouteEventsFromBigQuery}
                            onExportExecutionRouteEventCsv={handleExportExecutionRouteEventCsv}
                          />

                          <ExecutionFillSection
                            executionFillDecision={executionFillDecision}
                            fillCompletionPercent={fillCompletionPercent}
                            onFillCompletionPercentChange={setFillCompletionPercent}
                            fillSlippageBps={fillSlippageBps}
                            onFillSlippageBpsChange={setFillSlippageBps}
                            fillCommissionBps={fillCommissionBps}
                            onFillCommissionBpsChange={setFillCommissionBps}
                            hasBigQueryCredentials={hasBigQueryCredentials}
                            syncStatus={executionFillSyncStatus}
                            syncMessage={executionFillSyncMessage}
                            warehouseFillCount={executionFillWarehouseCount}
                            onSyncExecutionFillsToBigQuery={handleSyncExecutionFillsToBigQuery}
                            onLoadExecutionFillsFromBigQuery={handleLoadExecutionFillsFromBigQuery}
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
                            hasBigQueryCredentials={hasBigQueryCredentials}
                            syncStatus={postTradeAttributionSyncStatus}
                            syncMessage={postTradeAttributionSyncMessage}
                            warehouseAttributionCount={postTradeAttributionWarehouseCount}
                            onSyncPostTradeAttributionsToBigQuery={handleSyncPostTradeAttributionsToBigQuery}
                            onLoadPostTradeAttributionsFromBigQuery={handleLoadPostTradeAttributionsFromBigQuery}
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
                            hasBigQueryCredentials={hasBigQueryCredentials}
                            syncStatus={platformExceptionSyncStatus}
                            syncMessage={platformExceptionSyncMessage}
                            warehouseExceptionCount={platformExceptionWarehouseCount}
                            onSyncPlatformExceptionsToBigQuery={handleSyncPlatformExceptionsToBigQuery}
                            onLoadPlatformExceptionsFromBigQuery={handleLoadPlatformExceptionsFromBigQuery}
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
                            hasBigQueryCredentials={hasBigQueryCredentials}
                            syncStatus={slaEscalationSyncStatus}
                            syncMessage={slaEscalationSyncMessage}
                            warehouseEscalationCount={slaEscalationWarehouseCount}
                            onSyncSlaEscalationsToBigQuery={handleSyncSlaEscalationsToBigQuery}
                            onLoadSlaEscalationsFromBigQuery={handleLoadSlaEscalationsFromBigQuery}
                            onExportSlaEscalationCsv={handleExportSlaEscalationCsv}
                            slaEscalationItems={slaEscalationItems}
                            slaCriticalCount={slaCriticalCount}
                            slaReviewCount={slaReviewCount}
                          />

                          <OperatingKriSection
                            operatingKriDecision={operatingKriDecision}
                            hasBigQueryCredentials={hasBigQueryCredentials}
                            syncStatus={operatingKriSyncStatus}
                            syncMessage={operatingKriSyncMessage}
                            warehouseKriCount={operatingKriWarehouseCount}
                            onSyncOperatingKriToBigQuery={handleSyncOperatingKriToBigQuery}
                            onLoadOperatingKriFromBigQuery={handleLoadOperatingKriFromBigQuery}
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
                            hasBigQueryCredentials={hasBigQueryCredentials}
                            syncStatus={decisionFunnelSyncStatus}
                            syncMessage={decisionFunnelSyncMessage}
                            warehouseStageCount={decisionFunnelWarehouseCount}
                            onSyncDecisionFunnelToBigQuery={handleSyncDecisionFunnelToBigQuery}
                            onLoadDecisionFunnelFromBigQuery={handleLoadDecisionFunnelFromBigQuery}
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
                            hasBigQueryCredentials={hasBigQueryCredentials}
                            syncStatus={marketAlertSyncStatus}
                            syncMessage={marketAlertSyncMessage}
                            warehouseAlertCount={marketAlertWarehouseCount}
                            ownerQueueSyncStatus={marketAlertOwnerQueueSyncStatus}
                            ownerQueueSyncMessage={marketAlertOwnerQueueSyncMessage}
                            warehouseOwnerQueueCount={marketAlertOwnerQueueWarehouseCount}
                            runbookSyncStatus={marketAlertRunbookSyncStatus}
                            runbookSyncMessage={marketAlertRunbookSyncMessage}
                            warehouseRunbookCount={marketAlertRunbookWarehouseCount}
                            auditStatus={marketAlertAuditStatus}
                            auditMessage={marketAlertAuditMessage}
                            auditRecords={marketAlertAuditRecords}
                            onSyncMarketAlertsToBigQuery={handleSyncMarketAlertsToBigQuery}
                            onLoadMarketAlertsFromBigQuery={handleLoadMarketAlertsFromBigQuery}
                            onLoadMarketAlertWarehouseAudit={handleLoadMarketAlertWarehouseAudit}
                            onSyncMarketAlertOwnerQueuesToBigQuery={handleSyncMarketAlertOwnerQueuesToBigQuery}
                            onLoadMarketAlertOwnerQueuesFromBigQuery={handleLoadMarketAlertOwnerQueuesFromBigQuery}
                            onSyncMarketAlertRunbooksToBigQuery={handleSyncMarketAlertRunbooksToBigQuery}
                            onLoadMarketAlertRunbooksFromBigQuery={handleLoadMarketAlertRunbooksFromBigQuery}
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
        )}

        {isOperationsWorkspace && (
        <MarketSourceInventorySection sources={sources} isLoading={isLoading} error={error} />
        )}
      </section>

      {isOperationsWorkspace && <SecurityNotesSection notes={data?.securityNotes ?? []} />}

      {isPortfolioWorkspace && <BigQueryPortfolioPanel hasBigQueryCredentials={hasBigQueryCredentials} />}
    </div>
  );
}
