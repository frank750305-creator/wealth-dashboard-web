import {
  averageComparisonMetric,
  comparisonSignalFilterLabel,
  comparisonSortLabel,
  decisionSignalLabel,
  parseSymbolList,
  qualityLabel,
  type AssetComparisonRow,
  type AssetComparisonSortKey,
  type AssetDecisionSignal,
} from "@/lib/assetResearchWorkflow";
import {
  allocationModeLabel,
  type AllocationDraftRow,
  type AllocationMode,
  type AllocationRiskSnapshot,
} from "@/lib/allocationWorkflow";
import { rebalanceDirectionLabel, type RebalanceDraftRow } from "@/lib/rebalanceWorkflow";
import type { ExecutionReviewItem } from "@/lib/executionReviewWorkflow";
import {
  executionHandoffPriorityLabel,
  formatBps,
  type ExecutionHandoffItem,
  type PlatformExceptionItem,
} from "@/lib/executionOperationsWorkflow";
import { committeeDecisionLabel, type CommitteeDecision, type DecisionAuditRecord } from "@/lib/investmentCommitteeWorkflow";
import type { ExecutionFillRow, TradeBatchRow, TradeTicketRow } from "@/lib/tradeExecutionWorkflow";
import {
  slaEscalationTierLabel,
  type DecisionFunnelStage,
  type OperatingKriItem,
  type SlaEscalationItem,
} from "@/lib/operatingControlWorkflow";
import type { MarketAlertEvent } from "@/lib/marketAlertEvents";
import type {
  CoverageUniverseItem,
  DataContractItem,
  DataPipelineHealthItem,
  DataPipelineTableSnapshot,
} from "@/lib/dataWarehouseMonitoring";
import type { DataLineageItem, DataProductCatalogItem, DataRemediationItem } from "@/lib/dataGovernanceCatalog";
import { apiContractStabilityLabel, type ApiContractBlueprintItem, type ApiServiceCatalogItem } from "@/lib/apiServiceLayer";
import type { ClientWorkspaceProvisioningItem, PlatformEntitlementItem, UsageBillingItem } from "@/lib/commercialAccessLayer";
import type { DataLicenseComplianceItem } from "@/lib/dataLicenseCompliance";
import type { SecurityAuditItem } from "@/lib/securityAudit";
import type { IncidentCommandItem } from "@/lib/incidentCommand";
import { releaseStageLabel, type ProductReleaseGateItem } from "@/lib/productReleaseGate";
import { customerHealthStageLabel, type CustomerSuccessHealthItem } from "@/lib/customerSuccessHealth";
import { revenueForecastStageLabel, type RevenueForecastItem } from "@/lib/revenueForecast";

type MemoExecutionStatus = "pass" | "watch" | "block";

function formatPercent(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? `${(value * 100).toFixed(2)}%` : "--";
}

function formatCurrency(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value)
    ? value.toLocaleString("zh-TW", { maximumFractionDigits: 0 })
    : "--";
}

function markdownCell(value: unknown) {
  if (value === null || value === undefined || value === "") return "--";
  return String(value).replaceAll("|", "/").replaceAll("\n", " ");
}

function executionReviewLabel(status: MemoExecutionStatus) {
  if (status === "pass") return "通過";
  if (status === "watch") return "觀察";
  return "暫停";
}

export function assetComparisonMemo(
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
