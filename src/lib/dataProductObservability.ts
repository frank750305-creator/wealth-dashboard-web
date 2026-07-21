import type { ApiServiceCatalogItem } from "@/lib/apiServiceLayer";
import type { DataProductCatalogItem } from "@/lib/dataGovernanceCatalog";
import type {
  MarketAlertWarehouseAuditRecord,
  ResearchTaskWarehouseAuditRecord,
} from "@/types/market";

export type DataProductObservabilityStatus = "pass" | "watch" | "block";

export type DataProductObservabilityItem = {
  domain: string;
  product: string;
  status: DataProductObservabilityStatus;
  generatedRecords: number;
  warehouseRecords: number;
  coveragePercent: number | null;
  apiCoverage: string;
  auditTrail: string;
  owner: string;
  evidence: string;
  action: string;
};

export type DataProductObservabilitySummary = {
  decision: DataProductObservabilityStatus;
  readyCount: number;
  watchCount: number;
  blockCount: number;
  productCount: number;
  apiCount: number;
  warehouseBackedCount: number;
  averageCoveragePercent: number | null;
};

type BuildDataProductObservabilityItemsInput = {
  hasBigQueryCredentials: boolean;
  dataPipelineDecision: DataProductObservabilityStatus;
  dataContractDecision: DataProductObservabilityStatus;
  dataProductCatalogItems: DataProductCatalogItem[];
  apiServiceCatalogItems: ApiServiceCatalogItem[];
  researchTaskGeneratedCount: number;
  researchTaskAuditRecords: ResearchTaskWarehouseAuditRecord[];
  tradeTicketGeneratedCount: number;
  tradeTicketWarehouseCount: number;
  executionRouteGeneratedCount: number;
  executionRouteWarehouseCount: number;
  executionRouteEventGeneratedCount: number;
  executionRouteEventWarehouseCount: number;
  executionFillGeneratedCount: number;
  executionFillWarehouseCount: number;
  postTradeAttributionGeneratedCount: number;
  postTradeAttributionWarehouseCount: number;
  platformExceptionGeneratedCount: number;
  platformExceptionWarehouseCount: number;
  slaEscalationGeneratedCount: number;
  slaEscalationWarehouseCount: number;
  operatingKriGeneratedCount: number;
  operatingKriWarehouseCount: number;
  decisionFunnelGeneratedCount: number;
  decisionFunnelWarehouseCount: number;
  marketAlertGeneratedCount: number;
  marketAlertWarehouseCount: number;
  marketAlertOwnerQueueGeneratedCount: number;
  marketAlertOwnerQueueWarehouseCount: number;
  marketAlertRunbookGeneratedCount: number;
  marketAlertRunbookWarehouseCount: number;
  marketAlertAuditRecords: MarketAlertWarehouseAuditRecord[];
  riskOwner: string;
  decisionOwner: string;
  executionOwner: string;
};

function csvCell(value: unknown) {
  const stringValue = String(value ?? "");
  if (/[",\n]/.test(stringValue)) return `"${stringValue.replaceAll('"', '""')}"`;
  return stringValue;
}

function statusLabel(status: DataProductObservabilityStatus) {
  if (status === "pass") return "通過";
  if (status === "watch") return "觀察";
  return "暫停";
}

function combinedStatus(statuses: DataProductObservabilityStatus[]): DataProductObservabilityStatus {
  if (statuses.some((status) => status === "block")) return "block";
  if (statuses.some((status) => status === "watch")) return "watch";
  return "pass";
}

function normalizeOwner(value: string, fallback: string) {
  return value.trim() || fallback;
}

function coveragePercent(generatedRecords: number, warehouseRecords: number) {
  if (generatedRecords <= 0) return warehouseRecords > 0 ? 1 : null;
  return Math.min(1, warehouseRecords / generatedRecords);
}

function statusFromCoverage({
  hasBigQueryCredentials,
  generatedRecords,
  warehouseRecords,
  upstreamStatus,
}: {
  hasBigQueryCredentials: boolean;
  generatedRecords: number;
  warehouseRecords: number;
  upstreamStatus: DataProductObservabilityStatus;
}): DataProductObservabilityStatus {
  if (!hasBigQueryCredentials) return "block";
  if (upstreamStatus === "block") return "block";
  if (generatedRecords <= 0) return upstreamStatus === "pass" ? "watch" : upstreamStatus;
  if (warehouseRecords <= 0) return "watch";
  if (warehouseRecords < generatedRecords) return "watch";
  return upstreamStatus;
}

function apiCoverage(productKeywords: string[], apiServiceCatalogItems: ApiServiceCatalogItem[]) {
  const normalizedKeywords = productKeywords.map((item) => item.toLowerCase());
  const matchedApis = apiServiceCatalogItems.filter((item) => {
    const target = `${item.product} ${item.endpoint} ${item.output}`.toLowerCase();
    return normalizedKeywords.some((keyword) => target.includes(keyword));
  });
  const readyCount = matchedApis.filter((item) => item.status === "pass").length;

  if (!matchedApis.length) return "0 endpoints";
  return `${readyCount}/${matchedApis.length} ready`;
}

function latestResearchAuditLabel(records: ResearchTaskWarehouseAuditRecord[]) {
  const latest = records[0];
  if (!latest) return "尚未載入研究任務稽核";
  return `${latest.workspace_id} / ${latest.task_count} tasks / ${latest.generated_at}`;
}

function latestMarketAlertAuditLabel(records: MarketAlertWarehouseAuditRecord[]) {
  const latest = records[0];
  if (!latest) return "尚未載入市場警示稽核";
  return `${latest.workspace_id} / ${latest.alert_count} alerts / ${latest.generated_at}`;
}

function productCatalogEvidence(product: string, items: DataProductCatalogItem[]) {
  const matchedItem = items.find((item) => item.product === product);
  if (!matchedItem) return "尚未納入資料產品目錄";
  return matchedItem.evidence || matchedItem.serviceLevel;
}

export function buildDataProductObservabilityItems({
  hasBigQueryCredentials,
  dataPipelineDecision,
  dataContractDecision,
  dataProductCatalogItems,
  apiServiceCatalogItems,
  researchTaskGeneratedCount,
  researchTaskAuditRecords,
  tradeTicketGeneratedCount,
  tradeTicketWarehouseCount,
  executionRouteGeneratedCount,
  executionRouteWarehouseCount,
  executionRouteEventGeneratedCount,
  executionRouteEventWarehouseCount,
  executionFillGeneratedCount,
  executionFillWarehouseCount,
  postTradeAttributionGeneratedCount,
  postTradeAttributionWarehouseCount,
  platformExceptionGeneratedCount,
  platformExceptionWarehouseCount,
  slaEscalationGeneratedCount,
  slaEscalationWarehouseCount,
  operatingKriGeneratedCount,
  operatingKriWarehouseCount,
  decisionFunnelGeneratedCount,
  decisionFunnelWarehouseCount,
  marketAlertGeneratedCount,
  marketAlertWarehouseCount,
  marketAlertOwnerQueueGeneratedCount,
  marketAlertOwnerQueueWarehouseCount,
  marketAlertRunbookGeneratedCount,
  marketAlertRunbookWarehouseCount,
  marketAlertAuditRecords,
  riskOwner,
  decisionOwner,
  executionOwner,
}: BuildDataProductObservabilityItemsInput): DataProductObservabilityItem[] {
  const cleanRiskOwner = normalizeOwner(riskOwner, "風控");
  const cleanDecisionOwner = normalizeOwner(decisionOwner, "研究");
  const cleanExecutionOwner = normalizeOwner(executionOwner, "交易員");
  const warehouseStatus = combinedStatus([dataPipelineDecision, dataContractDecision]);
  const researchWarehouseCount = researchTaskAuditRecords[0]?.task_count ?? 0;

  const rows: Array<{
    domain: string;
    product: string;
    generatedRecords: number;
    warehouseRecords: number;
    keywords: string[];
    auditTrail: string;
    owner: string;
    upstreamStatus: DataProductObservabilityStatus;
    actionWhenReady: string;
    actionWhenWatch: string;
  }> = [
    {
      domain: "資料倉儲",
      product: "價格與匯率核心資料",
      generatedRecords: dataProductCatalogItems.length,
      warehouseRecords: hasBigQueryCredentials ? dataProductCatalogItems.length : 0,
      keywords: ["market", "bigquery", "diagnostics", "asset"],
      auditTrail: "BigQuery diagnostics / data contracts / coverage universe",
      owner: cleanRiskOwner,
      upstreamStatus: warehouseStatus,
      actionWhenReady: "可支援研究、配置、交易與客戶 API",
      actionWhenWatch: "先處理資料新鮮度、schema 或覆蓋率觀察項",
    },
    {
      domain: "研究流程",
      product: "研究任務看板",
      generatedRecords: researchTaskGeneratedCount,
      warehouseRecords: researchWarehouseCount,
      keywords: ["research", "task"],
      auditTrail: latestResearchAuditLabel(researchTaskAuditRecords),
      owner: cleanDecisionOwner,
      upstreamStatus: warehouseStatus,
      actionWhenReady: "可把研究任務變成客戶工作區與內部派工依據",
      actionWhenWatch: "同步研究任務或載入 BigQuery audit，確認任務已落庫",
    },
    {
      domain: "投資決策",
      product: "決策漏斗",
      generatedRecords: decisionFunnelGeneratedCount,
      warehouseRecords: decisionFunnelWarehouseCount,
      keywords: ["decision", "funnel"],
      auditTrail: "decision_funnel latest endpoint",
      owner: cleanDecisionOwner,
      upstreamStatus: warehouseStatus,
      actionWhenReady: "可追蹤研究到交易的轉換率",
      actionWhenWatch: "同步決策漏斗，建立跨期轉換紀錄",
    },
    {
      domain: "交易執行",
      product: "交易票與路由",
      generatedRecords: tradeTicketGeneratedCount + executionRouteGeneratedCount + executionRouteEventGeneratedCount,
      warehouseRecords: tradeTicketWarehouseCount + executionRouteWarehouseCount + executionRouteEventWarehouseCount,
      keywords: ["trading", "ticket", "route"],
      auditTrail: "tickets / routes / route events latest endpoints",
      owner: cleanExecutionOwner,
      upstreamStatus: warehouseStatus,
      actionWhenReady: "可建立從投委會到交易路由的完整軌跡",
      actionWhenWatch: "同步交易票、路由與事件，避免只有前端暫存結果",
    },
    {
      domain: "成交復盤",
      product: "成交、成本與歸因",
      generatedRecords: executionFillGeneratedCount + postTradeAttributionGeneratedCount,
      warehouseRecords: executionFillWarehouseCount + postTradeAttributionWarehouseCount,
      keywords: ["fill", "attribution"],
      auditTrail: "execution_fills / post_trade_attribution latest endpoints",
      owner: cleanExecutionOwner,
      upstreamStatus: warehouseStatus,
      actionWhenReady: "可支援交易成本、殘單與事後歸因分析",
      actionWhenWatch: "同步成交與歸因資料，補足交易後分析閉環",
    },
    {
      domain: "營運控制",
      product: "例外、SLA 與 KRI",
      generatedRecords: platformExceptionGeneratedCount + slaEscalationGeneratedCount + operatingKriGeneratedCount,
      warehouseRecords: platformExceptionWarehouseCount + slaEscalationWarehouseCount + operatingKriWarehouseCount,
      keywords: ["exception", "sla", "kri"],
      auditTrail: "platform_exceptions / sla_escalations / operating_kri latest endpoints",
      owner: cleanRiskOwner,
      upstreamStatus: warehouseStatus,
      actionWhenReady: "可支援管理層營運監控與 SLA 升級",
      actionWhenWatch: "同步例外、SLA、KRI，避免營運控制只停留在畫面",
    },
    {
      domain: "市場警示",
      product: "警示、Owner Queue 與 Runbook",
      generatedRecords: marketAlertGeneratedCount + marketAlertOwnerQueueGeneratedCount + marketAlertRunbookGeneratedCount,
      warehouseRecords: marketAlertWarehouseCount + marketAlertOwnerQueueWarehouseCount + marketAlertRunbookWarehouseCount,
      keywords: ["market-alert", "alert", "runbook", "owner"],
      auditTrail: latestMarketAlertAuditLabel(marketAlertAuditRecords),
      owner: cleanRiskOwner,
      upstreamStatus: warehouseStatus,
      actionWhenReady: "可支援市場警示指揮中心與責任人分派",
      actionWhenWatch: "同步警示、分派與 Runbook，並載入 audit 批次",
    },
  ];

  return rows.map((row) => {
    const status = statusFromCoverage({
      hasBigQueryCredentials,
      generatedRecords: row.generatedRecords,
      warehouseRecords: row.warehouseRecords,
      upstreamStatus: row.upstreamStatus,
    });
    const coverage = coveragePercent(row.generatedRecords, row.warehouseRecords);

    return {
      domain: row.domain,
      product: row.product,
      status,
      generatedRecords: row.generatedRecords,
      warehouseRecords: row.warehouseRecords,
      coveragePercent: coverage,
      apiCoverage: apiCoverage(row.keywords, apiServiceCatalogItems),
      auditTrail: row.auditTrail,
      owner: row.owner,
      evidence: productCatalogEvidence(row.product, dataProductCatalogItems),
      action: status === "pass" ? row.actionWhenReady : row.actionWhenWatch,
    };
  });
}

export function summarizeDataProductObservability(
  rows: DataProductObservabilityItem[],
  apiServiceCatalogItems: ApiServiceCatalogItem[],
): DataProductObservabilitySummary {
  const readyCount = rows.filter((row) => row.status === "pass").length;
  const watchCount = rows.filter((row) => row.status === "watch").length;
  const blockCount = rows.filter((row) => row.status === "block").length;
  const coverageRows = rows.filter((row) => row.coveragePercent !== null);
  const averageCoveragePercent = coverageRows.length
    ? coverageRows.reduce((sum, row) => sum + (row.coveragePercent ?? 0), 0) / coverageRows.length
    : null;

  return {
    decision: combinedStatus(rows.map((row) => row.status)),
    readyCount,
    watchCount,
    blockCount,
    productCount: rows.length,
    apiCount: apiServiceCatalogItems.length,
    warehouseBackedCount: rows.filter((row) => row.warehouseRecords > 0).length,
    averageCoveragePercent,
  };
}

export function dataProductObservabilityCsv(rows: DataProductObservabilityItem[]) {
  const header = [
    "domain",
    "product",
    "status",
    "generated_records",
    "warehouse_records",
    "coverage_percent",
    "api_coverage",
    "audit_trail",
    "owner",
    "evidence",
    "action",
  ];
  const csvRows = rows.map((row) => [
    row.domain,
    row.product,
    statusLabel(row.status),
    row.generatedRecords,
    row.warehouseRecords,
    row.coveragePercent === null ? "" : `${(row.coveragePercent * 100).toFixed(1)}%`,
    row.apiCoverage,
    row.auditTrail,
    row.owner,
    row.evidence,
    row.action,
  ]);

  return [header, ...csvRows].map((row) => row.map(csvCell).join(",")).join("\n");
}
