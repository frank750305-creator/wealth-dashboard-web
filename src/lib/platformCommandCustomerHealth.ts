import {
  platformCommandAuditSignalLabel,
  platformCommandRevenueAuditStateLabel,
  type PlatformCommandAuditSignal,
  type PlatformCommandRevenueAuditItem,
  type PlatformCommandRevenueAuditState,
} from "@/lib/platformCommandRevenueAudit";
import {
  platformCommandResidualRiskLabel,
  type PlatformCommandResidualRisk,
} from "@/lib/platformCommandClosure";
import { platformCommandStatusLabel } from "@/lib/platformCommandSearch";

export type PlatformCommandCustomerHealthState = "blocked" | "adoption_recovery" | "value_review" | "healthy";
export type PlatformCommandRetentionSignal = "churn_risk" | "expansion_watch" | "retained";

export type PlatformCommandCustomerHealthItem = {
  healthId: string;
  auditId: string;
  usageId: string;
  decisionId: string;
  owner: string;
  successOwner: string;
  customerHealthState: PlatformCommandCustomerHealthState;
  retentionSignal: PlatformCommandRetentionSignal;
  revenueAuditState: PlatformCommandRevenueAuditState;
  auditSignal: PlatformCommandAuditSignal;
  status: PlatformCommandRevenueAuditItem["status"];
  residualRisk: PlatformCommandResidualRisk;
  readinessScore: number;
  sourceRoute: string;
  buyerSegment: string;
  adoptionSignal: string;
  valueEvidence: string;
  supportLoad: string;
  renewalRisk: string;
  expansionPotential: string;
  executiveSponsor: string;
  customerComms: string;
  qbrCadence: string;
  decisionGate: string;
  nextAction: string;
};

export type PlatformCommandCustomerHealthSummary = {
  status: PlatformCommandRevenueAuditItem["status"];
  itemCount: number;
  blockedCount: number;
  adoptionRecoveryCount: number;
  valueReviewCount: number;
  healthyCount: number;
  churnRiskCount: number;
  expansionWatchCount: number;
  retainedCount: number;
  averageReadinessScore: number;
  nextQbrWindow: string;
};

function csvCell(value: unknown) {
  const stringValue = String(value ?? "");
  if (/[",\n]/.test(stringValue)) return `"${stringValue.replaceAll('"', '""')}"`;
  return stringValue;
}

function customerHealthStateFor(item: PlatformCommandRevenueAuditItem): PlatformCommandCustomerHealthState {
  if (item.revenueAuditState === "blocked" || item.auditSignal === "failed" || item.status === "block") {
    return "blocked";
  }
  if (item.revenueAuditState === "reconciliation") return "adoption_recovery";
  if (item.revenueAuditState === "exception_review" || item.auditSignal === "exception") return "value_review";
  return "healthy";
}

function retentionSignalFor(
  item: PlatformCommandRevenueAuditItem,
  state: PlatformCommandCustomerHealthState,
): PlatformCommandRetentionSignal {
  if (state === "blocked" || item.residualRisk === "high") return "churn_risk";
  if (state === "adoption_recovery" || state === "value_review" || item.residualRisk === "medium") {
    return "expansion_watch";
  }
  return "retained";
}

export function platformCommandCustomerHealthStateLabel(state: PlatformCommandCustomerHealthState) {
  if (state === "blocked") return "Blocked";
  if (state === "adoption_recovery") return "Adoption recovery";
  if (state === "value_review") return "Value review";
  return "Healthy";
}

export function platformCommandRetentionSignalLabel(signal: PlatformCommandRetentionSignal) {
  if (signal === "churn_risk") return "Churn risk";
  if (signal === "expansion_watch") return "Expansion watch";
  return "Retained";
}

function adoptionSignalFor(item: PlatformCommandRevenueAuditItem, signal: PlatformCommandRetentionSignal) {
  if (signal === "churn_risk") return `採用不可證明：${item.customerImpact}`;
  if (signal === "expansion_watch") return `採用需客戶成功驗證：${item.customerImpact}`;
  return `採用健康：${item.customerImpact}`;
}

function valueEvidenceFor(item: PlatformCommandRevenueAuditItem, state: PlatformCommandCustomerHealthState) {
  if (state === "blocked") return `價值證據不足：${item.auditEvidence}`;
  if (state === "adoption_recovery") return `需補採用與對帳價值證據：${item.usageToInvoiceCheck}`;
  if (state === "value_review") return `需補例外價值說明：${item.variancePolicy}`;
  return `價值證據完整：${item.boardReportingSignal}`;
}

function supportLoadFor(item: PlatformCommandRevenueAuditItem, signal: PlatformCommandRetentionSignal) {
  if (signal === "churn_risk") return "支援負載高，不可擴張";
  if (signal === "expansion_watch") return `支援負載需監控：${item.complianceNote}`;
  return `支援負載可控：${platformCommandResidualRiskLabel(item.residualRisk)}`;
}

function renewalRiskFor(item: PlatformCommandRevenueAuditItem, signal: PlatformCommandRetentionSignal) {
  if (signal === "churn_risk") return `續約高風險：${item.decisionGate}`;
  if (signal === "expansion_watch") return `續約需 QBR 證明：${item.customerImpact}`;
  return "續約風險低，可列入 retained base";
}

function expansionPotentialFor(item: PlatformCommandRevenueAuditItem, signal: PlatformCommandRetentionSignal) {
  if (signal === "churn_risk") return "不進擴張 pipeline";
  if (signal === "expansion_watch") return `擴張需待價值證據：${item.boardReportingSignal}`;
  return `可進擴張 pipeline：${item.boardReportingSignal}`;
}

function executiveSponsorFor(item: PlatformCommandRevenueAuditItem, state: PlatformCommandCustomerHealthState) {
  if (state === "blocked") return `Customer Success lead + Finance：${item.auditOwner}`;
  if (state === "adoption_recovery") return `Customer Success + Data Ops：${item.auditOwner}`;
  if (state === "value_review") return `Customer Success + Executive sponsor：${item.owner}`;
  return `Executive sponsor：${item.owner}`;
}

function customerCommsFor(item: PlatformCommandRevenueAuditItem, signal: PlatformCommandRetentionSignal) {
  if (signal === "churn_risk") return "不對客戶承諾擴張，只同步修復計畫";
  if (signal === "expansion_watch") return `客戶溝通需附價值與用量證據：${item.customerImpact}`;
  return "可對客戶同步健康狀態與下一步擴張討論";
}

function qbrCadenceFor(signal: PlatformCommandRetentionSignal) {
  if (signal === "churn_risk") return "每週風險 QBR";
  if (signal === "expansion_watch") return "雙週價值 QBR";
  return "月度成功 QBR";
}

function decisionGateFor(item: PlatformCommandRevenueAuditItem, state: PlatformCommandCustomerHealthState) {
  if (state === "blocked") return `不得標記健康客戶：${item.decisionGate}`;
  if (state === "adoption_recovery") return `完成採用恢復與用量證據：${item.customerImpact}`;
  if (state === "value_review") return `完成價值證據與例外說明：${item.auditEvidence}`;
  return "可進管理層總覽、續約 forecast 與擴張 pipeline";
}

function nextActionFor(item: PlatformCommandRevenueAuditItem, state: PlatformCommandCustomerHealthState) {
  if (state === "blocked") return `先解除 customer health 阻塞：${item.nextAction}`;
  if (state === "adoption_recovery") return `安排採用恢復 QBR：${item.customerImpact}`;
  if (state === "value_review") return `補價值證據與 executive sponsor：${item.boardReportingSignal}`;
  return "把客戶健康輸出給管理層總覽、續約與擴張節奏";
}

function stateRank(state: PlatformCommandCustomerHealthState) {
  if (state === "blocked") return 4;
  if (state === "adoption_recovery") return 3;
  if (state === "value_review") return 2;
  return 1;
}

export function buildPlatformCommandCustomerHealthItems(
  items: PlatformCommandRevenueAuditItem[],
): PlatformCommandCustomerHealthItem[] {
  return items
    .map((item, index) => {
      const customerHealthState = customerHealthStateFor(item);
      const retentionSignal = retentionSignalFor(item, customerHealthState);

      return {
        healthId: `HLT-${String(index + 1).padStart(3, "0")}-${item.decisionId}`,
        auditId: item.auditId,
        usageId: item.usageId,
        decisionId: item.decisionId,
        owner: item.owner,
        successOwner: item.auditOwner,
        customerHealthState,
        retentionSignal,
        revenueAuditState: item.revenueAuditState,
        auditSignal: item.auditSignal,
        status: item.status,
        residualRisk: item.residualRisk,
        readinessScore: item.readinessScore,
        sourceRoute: item.sourceRoute,
        buyerSegment: item.buyerSegment,
        adoptionSignal: adoptionSignalFor(item, retentionSignal),
        valueEvidence: valueEvidenceFor(item, customerHealthState),
        supportLoad: supportLoadFor(item, retentionSignal),
        renewalRisk: renewalRiskFor(item, retentionSignal),
        expansionPotential: expansionPotentialFor(item, retentionSignal),
        executiveSponsor: executiveSponsorFor(item, customerHealthState),
        customerComms: customerCommsFor(item, retentionSignal),
        qbrCadence: qbrCadenceFor(retentionSignal),
        decisionGate: decisionGateFor(item, customerHealthState),
        nextAction: nextActionFor(item, customerHealthState),
      };
    })
    .sort(
      (left, right) =>
        stateRank(right.customerHealthState) - stateRank(left.customerHealthState) ||
        left.readinessScore - right.readinessScore ||
        left.healthId.localeCompare(right.healthId, "zh-Hant"),
    );
}

export function summarizePlatformCommandCustomerHealth(
  items: PlatformCommandCustomerHealthItem[],
): PlatformCommandCustomerHealthSummary {
  const blockedCount = items.filter((item) => item.customerHealthState === "blocked").length;
  const adoptionRecoveryCount = items.filter((item) => item.customerHealthState === "adoption_recovery").length;
  const valueReviewCount = items.filter((item) => item.customerHealthState === "value_review").length;
  const churnRiskCount = items.filter((item) => item.retentionSignal === "churn_risk").length;
  const expansionWatchCount = items.filter((item) => item.retentionSignal === "expansion_watch").length;
  const averageReadinessScore = items.length
    ? Math.round(items.reduce((sum, item) => sum + item.readinessScore, 0) / items.length)
    : 0;

  return {
    status: churnRiskCount > 0 ? "block" : expansionWatchCount > 0 ? "watch" : "pass",
    itemCount: items.length,
    blockedCount,
    adoptionRecoveryCount,
    valueReviewCount,
    healthyCount: items.filter((item) => item.customerHealthState === "healthy").length,
    churnRiskCount,
    expansionWatchCount,
    retainedCount: items.filter((item) => item.retentionSignal === "retained").length,
    averageReadinessScore,
    nextQbrWindow:
      blockedCount > 0
        ? "不進健康客戶"
        : adoptionRecoveryCount > 0
          ? "本週採用恢復 QBR"
          : valueReviewCount > 0
            ? "本週價值 QBR"
            : "可進續約與擴張",
  };
}

export function platformCommandCustomerHealthCsv(items: PlatformCommandCustomerHealthItem[]) {
  const header = [
    "health_id",
    "audit_id",
    "usage_id",
    "decision_id",
    "owner",
    "success_owner",
    "customer_health_state",
    "retention_signal",
    "revenue_audit_state",
    "audit_signal",
    "status",
    "residual_risk",
    "readiness_score",
    "source_route",
    "buyer_segment",
    "adoption_signal",
    "value_evidence",
    "support_load",
    "renewal_risk",
    "expansion_potential",
    "executive_sponsor",
    "customer_comms",
    "qbr_cadence",
    "decision_gate",
    "next_action",
  ];
  const rows = items.map((item) => [
    item.healthId,
    item.auditId,
    item.usageId,
    item.decisionId,
    item.owner,
    item.successOwner,
    platformCommandCustomerHealthStateLabel(item.customerHealthState),
    platformCommandRetentionSignalLabel(item.retentionSignal),
    platformCommandRevenueAuditStateLabel(item.revenueAuditState),
    platformCommandAuditSignalLabel(item.auditSignal),
    platformCommandStatusLabel(item.status),
    platformCommandResidualRiskLabel(item.residualRisk),
    item.readinessScore,
    item.sourceRoute,
    item.buyerSegment,
    item.adoptionSignal,
    item.valueEvidence,
    item.supportLoad,
    item.renewalRisk,
    item.expansionPotential,
    item.executiveSponsor,
    item.customerComms,
    item.qbrCadence,
    item.decisionGate,
    item.nextAction,
  ]);

  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}
