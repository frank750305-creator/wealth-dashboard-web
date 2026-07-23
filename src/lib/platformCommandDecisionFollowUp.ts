import {
  platformCommandDecisionStateLabel,
  type PlatformCommandDecisionRegisterItem,
  type PlatformCommandDecisionState,
} from "@/lib/platformCommandDecisionRegister";
import {
  platformCommandExecutiveDecisionLabel,
  type PlatformCommandExecutiveDecision,
} from "@/lib/platformCommandExecutiveBrief";
import {
  platformCommandResidualRiskLabel,
  type PlatformCommandResidualRisk,
} from "@/lib/platformCommandClosure";
import {
  platformCommandPriorityLabel,
  platformCommandStatusLabel,
  type PlatformCommandPriority,
} from "@/lib/platformCommandSearch";

export type PlatformCommandFollowUpState = "blocked" | "due" | "active" | "closed";

export type PlatformCommandDecisionFollowUpItem = {
  owner: string;
  followUpOwner: string;
  decisionId: string;
  followUpState: PlatformCommandFollowUpState;
  decisionState: PlatformCommandDecisionState;
  executiveDecision: PlatformCommandExecutiveDecision;
  priority: PlatformCommandPriority;
  status: PlatformCommandDecisionRegisterItem["status"];
  residualRisk: PlatformCommandResidualRisk;
  readinessScore: number;
  backlogTitle: string;
  sourceRoute: string;
  leadCommand: string;
  actionPlan: string;
  dueWindow: string;
  proofRequired: string;
  successCriteria: string;
  escalationPath: string;
  nextReview: string;
  closureGate: string;
};

export type PlatformCommandDecisionFollowUpSummary = {
  status: PlatformCommandDecisionRegisterItem["status"];
  itemCount: number;
  blockedCount: number;
  dueCount: number;
  activeCount: number;
  closedCount: number;
  highResidualRiskCount: number;
  averageReadinessScore: number;
  nextFollowUpWindow: string;
};

function csvCell(value: unknown) {
  const stringValue = String(value ?? "");
  if (/[",\n]/.test(stringValue)) return `"${stringValue.replaceAll('"', '""')}"`;
  return stringValue;
}

function followUpStateFor(item: PlatformCommandDecisionRegisterItem): PlatformCommandFollowUpState {
  if (item.decisionState === "required" || item.status === "block" || item.residualRisk === "high") return "blocked";
  if (item.decisionState === "pending") return "due";
  if (item.decisionState === "approved") return "active";
  return "closed";
}

export function platformCommandFollowUpStateLabel(state: PlatformCommandFollowUpState) {
  if (state === "blocked") return "Blocked";
  if (state === "due") return "Due";
  if (state === "active") return "Active";
  return "Closed";
}

function dueWindowFor(state: PlatformCommandFollowUpState) {
  if (state === "blocked") return "24 小時內";
  if (state === "due") return "下一次週會前";
  if (state === "active") return "本月月報前";
  return "下季回顧";
}

function actionPlanFor(item: PlatformCommandDecisionRegisterItem, state: PlatformCommandFollowUpState) {
  if (state === "blocked") return `先取得 ${item.approver} 審批，解除 ${item.downstreamImpact}`;
  if (state === "due") return `推進 ${item.nextAction}，等待 ${item.approver} 確認`;
  if (state === "active") return `由 ${item.implementationOwner} 落地 ${item.approvalCriteria}`;
  return "保留登錄紀錄，下季檢查是否重啟";
}

function proofRequiredFor(item: PlatformCommandDecisionRegisterItem, state: PlatformCommandFollowUpState) {
  if (state === "blocked") return `${item.auditTrail} + 審批截圖或會議紀錄`;
  if (state === "due") return `${item.auditTrail} + 週會確認紀錄`;
  if (state === "active") return `${item.auditTrail} + 月報追蹤指標`;
  return item.auditTrail;
}

function successCriteriaFor(item: PlatformCommandDecisionRegisterItem, state: PlatformCommandFollowUpState) {
  if (state === "blocked") return "Required 決策降為 Pending 或 Approved，且高風險解除";
  if (state === "due") return "Pending 決策完成審批，且下一步 owner 明確";
  if (state === "active") return `${item.implementationOwner} 完成落地並可用證據驗收`;
  return "下季未重新開啟";
}

function escalationPathFor(item: PlatformCommandDecisionRegisterItem, state: PlatformCommandFollowUpState) {
  if (state === "blocked") return `高層 + ${item.approver}`;
  if (state === "due") return `${item.approver} + ${item.implementationOwner}`;
  if (state === "active") return item.implementationOwner;
  return "backlog owner";
}

function nextReviewFor(state: PlatformCommandFollowUpState) {
  if (state === "blocked") return "每日 standup";
  if (state === "due") return "每週 review";
  if (state === "active") return "月度 report";
  return "季度 review";
}

function closureGateFor(item: PlatformCommandDecisionRegisterItem, state: PlatformCommandFollowUpState) {
  if (state === "blocked") return `完成 ${item.approvalCriteria}`;
  if (state === "due") return `決策狀態改為 Approved，且 ${item.approver} 留痕`;
  if (state === "active") return `落地證據符合 ${item.approvalCriteria}`;
  return "保留 audit trail";
}

function stateRank(state: PlatformCommandFollowUpState) {
  if (state === "blocked") return 4;
  if (state === "due") return 3;
  if (state === "active") return 2;
  return 1;
}

export function buildPlatformCommandDecisionFollowUpItems(
  items: PlatformCommandDecisionRegisterItem[],
): PlatformCommandDecisionFollowUpItem[] {
  return items
    .map((item) => {
      const followUpState = followUpStateFor(item);

      return {
        owner: item.owner,
        followUpOwner: item.implementationOwner,
        decisionId: item.decisionId,
        followUpState,
        decisionState: item.decisionState,
        executiveDecision: item.executiveDecision,
        priority: item.priority,
        status: item.status,
        residualRisk: item.residualRisk,
        readinessScore: item.readinessScore,
        backlogTitle: item.backlogTitle,
        sourceRoute: item.sourceRoute,
        leadCommand: item.leadCommand,
        actionPlan: actionPlanFor(item, followUpState),
        dueWindow: dueWindowFor(followUpState),
        proofRequired: proofRequiredFor(item, followUpState),
        successCriteria: successCriteriaFor(item, followUpState),
        escalationPath: escalationPathFor(item, followUpState),
        nextReview: nextReviewFor(followUpState),
        closureGate: closureGateFor(item, followUpState),
      };
    })
    .sort(
      (left, right) =>
        stateRank(right.followUpState) - stateRank(left.followUpState) ||
        left.readinessScore - right.readinessScore ||
        left.decisionId.localeCompare(right.decisionId, "zh-Hant"),
    );
}

export function summarizePlatformCommandDecisionFollowUp(
  items: PlatformCommandDecisionFollowUpItem[],
): PlatformCommandDecisionFollowUpSummary {
  const blockedCount = items.filter((item) => item.followUpState === "blocked").length;
  const dueCount = items.filter((item) => item.followUpState === "due").length;
  const averageReadinessScore = items.length
    ? Math.round(items.reduce((sum, item) => sum + item.readinessScore, 0) / items.length)
    : 0;

  return {
    status: blockedCount > 0 ? "block" : dueCount > 0 ? "watch" : "pass",
    itemCount: items.length,
    blockedCount,
    dueCount,
    activeCount: items.filter((item) => item.followUpState === "active").length,
    closedCount: items.filter((item) => item.followUpState === "closed").length,
    highResidualRiskCount: items.filter((item) => item.residualRisk === "high").length,
    averageReadinessScore,
    nextFollowUpWindow: blockedCount > 0 ? "24 小時內" : dueCount > 0 ? "下一次週會前" : "本月月報前",
  };
}

export function platformCommandDecisionFollowUpCsv(items: PlatformCommandDecisionFollowUpItem[]) {
  const header = [
    "decision_id",
    "owner",
    "follow_up_owner",
    "follow_up_state",
    "decision_state",
    "executive_decision",
    "priority",
    "status",
    "residual_risk",
    "readiness_score",
    "source_route",
    "lead_command",
    "backlog_title",
    "action_plan",
    "due_window",
    "proof_required",
    "success_criteria",
    "escalation_path",
    "next_review",
    "closure_gate",
  ];
  const rows = items.map((item) => [
    item.decisionId,
    item.owner,
    item.followUpOwner,
    platformCommandFollowUpStateLabel(item.followUpState),
    platformCommandDecisionStateLabel(item.decisionState),
    platformCommandExecutiveDecisionLabel(item.executiveDecision),
    platformCommandPriorityLabel(item.priority),
    platformCommandStatusLabel(item.status),
    platformCommandResidualRiskLabel(item.residualRisk),
    item.readinessScore,
    item.sourceRoute,
    item.leadCommand,
    item.backlogTitle,
    item.actionPlan,
    item.dueWindow,
    item.proofRequired,
    item.successCriteria,
    item.escalationPath,
    item.nextReview,
    item.closureGate,
  ]);

  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}
