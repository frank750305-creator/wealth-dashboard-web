import {
  platformCommandUsageMonitoringStateLabel,
  platformCommandUsageSignalLabel,
  type PlatformCommandUsageMonitoringItem,
  type PlatformCommandUsageMonitoringState,
  type PlatformCommandUsageSignal,
} from "@/lib/platformCommandUsageMonitoring";
import {
  platformCommandResidualRiskLabel,
  type PlatformCommandResidualRisk,
} from "@/lib/platformCommandClosure";
import { platformCommandStatusLabel } from "@/lib/platformCommandSearch";

export type PlatformCommandRevenueAuditState = "blocked" | "reconciliation" | "exception_review" | "certified";
export type PlatformCommandAuditSignal = "failed" | "exception" | "clean";

export type PlatformCommandRevenueAuditItem = {
  auditId: string;
  usageId: string;
  billingId: string;
  decisionId: string;
  owner: string;
  auditOwner: string;
  revenueAuditState: PlatformCommandRevenueAuditState;
  auditSignal: PlatformCommandAuditSignal;
  usageState: PlatformCommandUsageMonitoringState;
  usageSignal: PlatformCommandUsageSignal;
  status: PlatformCommandUsageMonitoringItem["status"];
  residualRisk: PlatformCommandResidualRisk;
  readinessScore: number;
  sourceRoute: string;
  buyerSegment: string;
  revenueEventTrace: string;
  invoiceMatch: string;
  usageToInvoiceCheck: string;
  recognitionControl: string;
  variancePolicy: string;
  auditEvidence: string;
  complianceNote: string;
  customerImpact: string;
  financeCloseGate: string;
  boardReportingSignal: string;
  decisionGate: string;
  nextAction: string;
};

export type PlatformCommandRevenueAuditSummary = {
  status: PlatformCommandUsageMonitoringItem["status"];
  itemCount: number;
  blockedCount: number;
  reconciliationCount: number;
  exceptionReviewCount: number;
  certifiedCount: number;
  failedCount: number;
  exceptionCount: number;
  cleanCount: number;
  averageReadinessScore: number;
  nextAuditWindow: string;
};

function csvCell(value: unknown) {
  const stringValue = String(value ?? "");
  if (/[",\n]/.test(stringValue)) return `"${stringValue.replaceAll('"', '""')}"`;
  return stringValue;
}

function revenueAuditStateFor(item: PlatformCommandUsageMonitoringItem): PlatformCommandRevenueAuditState {
  if (item.usageState === "blocked" || item.usageSignal === "unmetered" || item.status === "block") {
    return "blocked";
  }
  if (item.usageState === "instrumentation_setup") return "reconciliation";
  if (item.usageState === "anomaly_watch" || item.usageSignal === "sampled") return "exception_review";
  return "certified";
}

function auditSignalFor(
  item: PlatformCommandUsageMonitoringItem,
  state: PlatformCommandRevenueAuditState,
): PlatformCommandAuditSignal {
  if (state === "blocked" || item.residualRisk === "high") return "failed";
  if (state === "reconciliation" || state === "exception_review" || item.residualRisk === "medium") return "exception";
  return "clean";
}

export function platformCommandRevenueAuditStateLabel(state: PlatformCommandRevenueAuditState) {
  if (state === "blocked") return "Blocked";
  if (state === "reconciliation") return "Reconciliation";
  if (state === "exception_review") return "Exception review";
  return "Certified";
}

export function platformCommandAuditSignalLabel(signal: PlatformCommandAuditSignal) {
  if (signal === "failed") return "Failed";
  if (signal === "exception") return "Exception";
  return "Clean";
}

function revenueEventTraceFor(item: PlatformCommandUsageMonitoringItem, signal: PlatformCommandAuditSignal) {
  if (signal === "failed") return `收入事件不可追蹤：${item.decisionGate}`;
  if (signal === "exception") return `收入事件需人工串接：${item.eventSchema}`;
  return `收入事件可追蹤：${item.eventSchema}`;
}

function invoiceMatchFor(item: PlatformCommandUsageMonitoringItem, state: PlatformCommandRevenueAuditState) {
  if (state === "blocked") return `invoice match 停止：${item.nextAction}`;
  if (state === "reconciliation") return `invoice match 待建立：${item.billingReconciliation}`;
  if (state === "exception_review") return `invoice match 需例外複核：${item.billingReconciliation}`;
  return `invoice match 可月結：${item.billingReconciliation}`;
}

function usageToInvoiceCheckFor(item: PlatformCommandUsageMonitoringItem, signal: PlatformCommandAuditSignal) {
  if (signal === "failed") return "usage / invoice 不可對帳";
  if (signal === "exception") return `usage / invoice 人工抽查：${item.meteringKey}`;
  return `usage / invoice 自動對帳：${item.meteringKey}`;
}

function recognitionControlFor(item: PlatformCommandUsageMonitoringItem, state: PlatformCommandRevenueAuditState) {
  if (state === "blocked") return `收入認列暫停：${item.decisionGate}`;
  if (state === "reconciliation") return `收入認列需建立 control：${item.telemetryScope}`;
  if (state === "exception_review") return `收入認列需例外 gate：${item.anomalyRule}`;
  return "收入認列 control 可進標準月結";
}

function variancePolicyFor(item: PlatformCommandUsageMonitoringItem, signal: PlatformCommandAuditSignal) {
  if (signal === "failed") return `差異不可接受：${item.alertRoute}`;
  if (signal === "exception") return `差異需人工說明：${item.quotaPolicy}`;
  return `差異可自動落在 policy：${item.quotaPolicy}`;
}

function auditEvidenceFor(item: PlatformCommandUsageMonitoringItem, state: PlatformCommandRevenueAuditState) {
  if (state === "blocked") return `缺稽核證據：${item.anomalyRule}`;
  if (state === "reconciliation") return `需補 telemetry、metering、invoice 證據：${item.telemetryScope}`;
  if (state === "exception_review") return `需補異常、對帳與客戶用量證據：${item.customerUsageView}`;
  return `證據完整：${item.telemetryScope} / ${item.customerUsageView}`;
}

function complianceNoteFor(item: PlatformCommandUsageMonitoringItem, signal: PlatformCommandAuditSignal) {
  if (signal === "failed") return `Compliance hold：${item.decisionGate}`;
  if (signal === "exception") return `Compliance exception：${item.dataRetention}`;
  return `Compliance clean：${item.dataRetention}`;
}

function customerImpactFor(item: PlatformCommandUsageMonitoringItem, signal: PlatformCommandAuditSignal) {
  if (signal === "failed") return `客戶不可見：${item.customerUsageView}`;
  if (signal === "exception") return `客戶用量需標註受控：${item.customerUsageView}`;
  return `客戶用量可對外揭露：${item.customerUsageView}`;
}

function financeCloseGateFor(signal: PlatformCommandAuditSignal) {
  if (signal === "failed") return "不進月結";
  if (signal === "exception") return "月結需人工 approval";
  return "可自動月結";
}

function boardReportingSignalFor(item: PlatformCommandUsageMonitoringItem, signal: PlatformCommandAuditSignal) {
  if (signal === "failed") return `不進 board revenue：${platformCommandResidualRiskLabel(item.residualRisk)}`;
  if (signal === "exception") return `Board revenue 標註例外：${platformCommandResidualRiskLabel(item.residualRisk)}`;
  return "Board revenue 可列為 clean";
}

function decisionGateFor(item: PlatformCommandUsageMonitoringItem, state: PlatformCommandRevenueAuditState) {
  if (state === "blocked") return `不得通過營收稽核：${item.decisionGate}`;
  if (state === "reconciliation") return `完成 usage / invoice reconciliation：${item.billingReconciliation}`;
  if (state === "exception_review") return `完成例外說明與 finance approval：${item.anomalyRule}`;
  return "可進管理層收入總覽、客戶健康與董事會報告";
}

function nextActionFor(item: PlatformCommandUsageMonitoringItem, state: PlatformCommandRevenueAuditState) {
  if (state === "blocked") return `先解除 revenue audit 阻塞：${item.nextAction}`;
  if (state === "reconciliation") return `補 usage / billing 對帳證據：${item.billingReconciliation}`;
  if (state === "exception_review") return `完成異常調查與稽核註記：${item.anomalyRule}`;
  return "把營收稽核輸出給客戶健康、管理層總覽與 board reporting";
}

function stateRank(state: PlatformCommandRevenueAuditState) {
  if (state === "blocked") return 4;
  if (state === "reconciliation") return 3;
  if (state === "exception_review") return 2;
  return 1;
}

export function buildPlatformCommandRevenueAuditItems(
  items: PlatformCommandUsageMonitoringItem[],
): PlatformCommandRevenueAuditItem[] {
  return items
    .map((item, index) => {
      const revenueAuditState = revenueAuditStateFor(item);
      const auditSignal = auditSignalFor(item, revenueAuditState);

      return {
        auditId: `AUD-${String(index + 1).padStart(3, "0")}-${item.decisionId}`,
        usageId: item.usageId,
        billingId: item.billingId,
        decisionId: item.decisionId,
        owner: item.owner,
        auditOwner: item.usageOwner,
        revenueAuditState,
        auditSignal,
        usageState: item.usageState,
        usageSignal: item.usageSignal,
        status: item.status,
        residualRisk: item.residualRisk,
        readinessScore: item.readinessScore,
        sourceRoute: item.sourceRoute,
        buyerSegment: item.buyerSegment,
        revenueEventTrace: revenueEventTraceFor(item, auditSignal),
        invoiceMatch: invoiceMatchFor(item, revenueAuditState),
        usageToInvoiceCheck: usageToInvoiceCheckFor(item, auditSignal),
        recognitionControl: recognitionControlFor(item, revenueAuditState),
        variancePolicy: variancePolicyFor(item, auditSignal),
        auditEvidence: auditEvidenceFor(item, revenueAuditState),
        complianceNote: complianceNoteFor(item, auditSignal),
        customerImpact: customerImpactFor(item, auditSignal),
        financeCloseGate: financeCloseGateFor(auditSignal),
        boardReportingSignal: boardReportingSignalFor(item, auditSignal),
        decisionGate: decisionGateFor(item, revenueAuditState),
        nextAction: nextActionFor(item, revenueAuditState),
      };
    })
    .sort(
      (left, right) =>
        stateRank(right.revenueAuditState) - stateRank(left.revenueAuditState) ||
        left.readinessScore - right.readinessScore ||
        left.auditId.localeCompare(right.auditId, "zh-Hant"),
    );
}

export function summarizePlatformCommandRevenueAudit(
  items: PlatformCommandRevenueAuditItem[],
): PlatformCommandRevenueAuditSummary {
  const blockedCount = items.filter((item) => item.revenueAuditState === "blocked").length;
  const reconciliationCount = items.filter((item) => item.revenueAuditState === "reconciliation").length;
  const exceptionReviewCount = items.filter((item) => item.revenueAuditState === "exception_review").length;
  const failedCount = items.filter((item) => item.auditSignal === "failed").length;
  const exceptionCount = items.filter((item) => item.auditSignal === "exception").length;
  const averageReadinessScore = items.length
    ? Math.round(items.reduce((sum, item) => sum + item.readinessScore, 0) / items.length)
    : 0;

  return {
    status: failedCount > 0 ? "block" : exceptionCount > 0 ? "watch" : "pass",
    itemCount: items.length,
    blockedCount,
    reconciliationCount,
    exceptionReviewCount,
    certifiedCount: items.filter((item) => item.revenueAuditState === "certified").length,
    failedCount,
    exceptionCount,
    cleanCount: items.filter((item) => item.auditSignal === "clean").length,
    averageReadinessScore,
    nextAuditWindow:
      blockedCount > 0
        ? "不進營收稽核"
        : reconciliationCount > 0
          ? "本週 revenue reconciliation"
          : exceptionReviewCount > 0
            ? "本週 audit exception"
            : "可進 clean revenue close",
  };
}

export function platformCommandRevenueAuditCsv(items: PlatformCommandRevenueAuditItem[]) {
  const header = [
    "audit_id",
    "usage_id",
    "billing_id",
    "decision_id",
    "owner",
    "audit_owner",
    "revenue_audit_state",
    "audit_signal",
    "usage_state",
    "usage_signal",
    "status",
    "residual_risk",
    "readiness_score",
    "source_route",
    "buyer_segment",
    "revenue_event_trace",
    "invoice_match",
    "usage_to_invoice_check",
    "recognition_control",
    "variance_policy",
    "audit_evidence",
    "compliance_note",
    "customer_impact",
    "finance_close_gate",
    "board_reporting_signal",
    "decision_gate",
    "next_action",
  ];
  const rows = items.map((item) => [
    item.auditId,
    item.usageId,
    item.billingId,
    item.decisionId,
    item.owner,
    item.auditOwner,
    platformCommandRevenueAuditStateLabel(item.revenueAuditState),
    platformCommandAuditSignalLabel(item.auditSignal),
    platformCommandUsageMonitoringStateLabel(item.usageState),
    platformCommandUsageSignalLabel(item.usageSignal),
    platformCommandStatusLabel(item.status),
    platformCommandResidualRiskLabel(item.residualRisk),
    item.readinessScore,
    item.sourceRoute,
    item.buyerSegment,
    item.revenueEventTrace,
    item.invoiceMatch,
    item.usageToInvoiceCheck,
    item.recognitionControl,
    item.variancePolicy,
    item.auditEvidence,
    item.complianceNote,
    item.customerImpact,
    item.financeCloseGate,
    item.boardReportingSignal,
    item.decisionGate,
    item.nextAction,
  ]);

  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}
