import {
  platformCommandExecutiveDecisionLabel,
  type PlatformCommandExecutiveBriefItem,
  type PlatformCommandExecutiveDecision,
} from "@/lib/platformCommandExecutiveBrief";
import {
  platformCommandOperatingDecisionLabel,
  type PlatformCommandOperatingDecision,
} from "@/lib/platformCommandOperatingReview";
import {
  platformCommandResidualRiskLabel,
  type PlatformCommandResidualRisk,
} from "@/lib/platformCommandClosure";
import {
  platformCommandPriorityLabel,
  platformCommandStatusLabel,
  type PlatformCommandPriority,
} from "@/lib/platformCommandSearch";

export type PlatformCommandDecisionState = "required" | "pending" | "approved" | "noted";

export type PlatformCommandDecisionRegisterItem = {
  owner: string;
  implementationOwner: string;
  decisionId: string;
  decisionState: PlatformCommandDecisionState;
  executiveDecision: PlatformCommandExecutiveDecision;
  operatingDecision: PlatformCommandOperatingDecision;
  priority: PlatformCommandPriority;
  status: PlatformCommandExecutiveBriefItem["status"];
  residualRisk: PlatformCommandResidualRisk;
  readinessScore: number;
  backlogTitle: string;
  sourceRoute: string;
  leadCommand: string;
  decisionRecord: string;
  approver: string;
  approvalDeadline: string;
  approvalCriteria: string;
  downstreamImpact: string;
  auditTrail: string;
  nextAction: string;
};

export type PlatformCommandDecisionRegisterSummary = {
  status: PlatformCommandExecutiveBriefItem["status"];
  itemCount: number;
  requiredCount: number;
  pendingCount: number;
  approvedCount: number;
  notedCount: number;
  highResidualRiskCount: number;
  averageReadinessScore: number;
  nextApprovalWindow: string;
};

function csvCell(value: unknown) {
  const stringValue = String(value ?? "");
  if (/[",\n]/.test(stringValue)) return `"${stringValue.replaceAll('"', '""')}"`;
  return stringValue;
}

function slug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 36);
}

function decisionStateFor(item: PlatformCommandExecutiveBriefItem): PlatformCommandDecisionState {
  if (item.executiveDecision === "board_attention" || item.status === "block" || item.residualRisk === "high") {
    return "required";
  }
  if (item.executiveDecision === "management_review") return "pending";
  if (item.executiveDecision === "monthly_update") return "approved";
  return "noted";
}

export function platformCommandDecisionStateLabel(state: PlatformCommandDecisionState) {
  if (state === "required") return "Required";
  if (state === "pending") return "Pending";
  if (state === "approved") return "Approved";
  return "Noted";
}

function decisionIdFor(item: PlatformCommandExecutiveBriefItem, index: number) {
  return `DEC-${String(index + 1).padStart(3, "0")}-${slug(item.sourceRoute || item.backlogTitle)}`;
}

function approvalDeadlineFor(state: PlatformCommandDecisionState) {
  if (state === "required") return "24 小時內";
  if (state === "pending") return "下一次週會";
  if (state === "approved") return "本月月報前";
  return "下季回顧";
}

function approvalCriteriaFor(item: PlatformCommandExecutiveBriefItem, state: PlatformCommandDecisionState) {
  if (state === "required") return `高層確認 ${item.decisionAsk}，並指派資源`;
  if (state === "pending") return `管理層確認 ${item.nextAction} 足以降低風險`;
  if (state === "approved") return `月報接受 ${item.boardMetric} 作為追蹤指標`;
  return "保留證據即可，不需本期審批";
}

function downstreamImpactFor(item: PlatformCommandExecutiveBriefItem, state: PlatformCommandDecisionState) {
  if (state === "required") return `${item.sourceRoute} 可能受阻，需避免影響 release 與客戶承諾`;
  if (state === "pending") return `${item.sourceRoute} 可推進，但需避免 watch 回到 block`;
  if (state === "approved") return "可進入例行報告與月度追蹤";
  return "歸檔後等待下季排序";
}

function decisionRecordFor(item: PlatformCommandExecutiveBriefItem) {
  return `${item.executiveSummary} / Ask: ${item.decisionAsk}`;
}

function auditTrailFor(item: PlatformCommandExecutiveBriefItem) {
  return `${item.evidencePack} / ${item.decisionWindow}`;
}

function nextActionFor(item: PlatformCommandExecutiveBriefItem, state: PlatformCommandDecisionState) {
  if (state === "required") return `立刻排入決策會議：${item.nextAction}`;
  if (state === "pending") return `等待 ${item.executiveOwner} 確認：${item.decisionAsk}`;
  if (state === "approved") return `交由 ${item.owner} 落地並更新月報`;
  return "保留紀錄，下季檢查是否重啟";
}

function stateRank(state: PlatformCommandDecisionState) {
  if (state === "required") return 4;
  if (state === "pending") return 3;
  if (state === "approved") return 2;
  return 1;
}

export function buildPlatformCommandDecisionRegisterItems(
  items: PlatformCommandExecutiveBriefItem[],
): PlatformCommandDecisionRegisterItem[] {
  return items
    .map((item, index) => {
      const decisionState = decisionStateFor(item);

      return {
        owner: item.owner,
        implementationOwner: item.executiveOwner,
        decisionId: decisionIdFor(item, index),
        decisionState,
        executiveDecision: item.executiveDecision,
        operatingDecision: item.operatingDecision,
        priority: item.priority,
        status: item.status,
        residualRisk: item.residualRisk,
        readinessScore: item.readinessScore,
        backlogTitle: item.backlogTitle,
        sourceRoute: item.sourceRoute,
        leadCommand: item.leadCommand,
        decisionRecord: decisionRecordFor(item),
        approver: item.executiveOwner,
        approvalDeadline: approvalDeadlineFor(decisionState),
        approvalCriteria: approvalCriteriaFor(item, decisionState),
        downstreamImpact: downstreamImpactFor(item, decisionState),
        auditTrail: auditTrailFor(item),
        nextAction: nextActionFor(item, decisionState),
      };
    })
    .sort(
      (left, right) =>
        stateRank(right.decisionState) - stateRank(left.decisionState) ||
        left.readinessScore - right.readinessScore ||
        left.decisionId.localeCompare(right.decisionId, "zh-Hant"),
    );
}

export function summarizePlatformCommandDecisionRegister(
  items: PlatformCommandDecisionRegisterItem[],
): PlatformCommandDecisionRegisterSummary {
  const requiredCount = items.filter((item) => item.decisionState === "required").length;
  const pendingCount = items.filter((item) => item.decisionState === "pending").length;
  const averageReadinessScore = items.length
    ? Math.round(items.reduce((sum, item) => sum + item.readinessScore, 0) / items.length)
    : 0;

  return {
    status: requiredCount > 0 ? "block" : pendingCount > 0 ? "watch" : "pass",
    itemCount: items.length,
    requiredCount,
    pendingCount,
    approvedCount: items.filter((item) => item.decisionState === "approved").length,
    notedCount: items.filter((item) => item.decisionState === "noted").length,
    highResidualRiskCount: items.filter((item) => item.residualRisk === "high").length,
    averageReadinessScore,
    nextApprovalWindow: requiredCount > 0 ? "24 小時內" : pendingCount > 0 ? "下一次週會" : "本月月報前",
  };
}

export function platformCommandDecisionRegisterCsv(items: PlatformCommandDecisionRegisterItem[]) {
  const header = [
    "decision_id",
    "owner",
    "implementation_owner",
    "decision_state",
    "executive_decision",
    "operating_decision",
    "priority",
    "status",
    "residual_risk",
    "readiness_score",
    "source_route",
    "lead_command",
    "backlog_title",
    "decision_record",
    "approver",
    "approval_deadline",
    "approval_criteria",
    "downstream_impact",
    "audit_trail",
    "next_action",
  ];
  const rows = items.map((item) => [
    item.decisionId,
    item.owner,
    item.implementationOwner,
    platformCommandDecisionStateLabel(item.decisionState),
    platformCommandExecutiveDecisionLabel(item.executiveDecision),
    platformCommandOperatingDecisionLabel(item.operatingDecision),
    platformCommandPriorityLabel(item.priority),
    platformCommandStatusLabel(item.status),
    platformCommandResidualRiskLabel(item.residualRisk),
    item.readinessScore,
    item.sourceRoute,
    item.leadCommand,
    item.backlogTitle,
    item.decisionRecord,
    item.approver,
    item.approvalDeadline,
    item.approvalCriteria,
    item.downstreamImpact,
    item.auditTrail,
    item.nextAction,
  ]);

  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}
