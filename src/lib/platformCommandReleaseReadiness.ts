import {
  platformCommandBacklogEffortLabel,
  platformCommandBacklogImpactLabel,
  platformCommandBacklogStateLabel,
  type PlatformCommandBacklogEffort,
  type PlatformCommandBacklogImpact,
  type PlatformCommandBacklogState,
  type PlatformCommandImprovementBacklogItem,
} from "@/lib/platformCommandImprovementBacklog";
import {
  platformCommandResidualRiskLabel,
  type PlatformCommandResidualRisk,
} from "@/lib/platformCommandClosure";
import {
  platformCommandPriorityLabel,
  platformCommandStatusLabel,
  type PlatformCommandPriority,
} from "@/lib/platformCommandSearch";

export type PlatformCommandReleaseState = "blocked" | "guarded" | "go" | "deferred";

export type PlatformCommandReleaseReadinessItem = {
  owner: string;
  releaseOwner: string;
  releaseState: PlatformCommandReleaseState;
  backlogState: PlatformCommandBacklogState;
  impact: PlatformCommandBacklogImpact;
  effort: PlatformCommandBacklogEffort;
  priority: PlatformCommandPriority;
  status: PlatformCommandImprovementBacklogItem["status"];
  residualRisk: PlatformCommandResidualRisk;
  readinessScore: number;
  backlogTitle: string;
  sourceRoute: string;
  leadCommand: string;
  releaseWindow: string;
  rolloutMode: string;
  goNoGoGate: string;
  qaEvidence: string;
  rollbackPlan: string;
  customerNotice: string;
  approvalPath: string;
  nextAction: string;
};

export type PlatformCommandReleaseReadinessSummary = {
  status: PlatformCommandImprovementBacklogItem["status"];
  itemCount: number;
  blockedCount: number;
  guardedCount: number;
  goCount: number;
  deferredCount: number;
  rollbackPlanCount: number;
  averageReadinessScore: number;
  nextReleaseWindow: string;
};

function csvCell(value: unknown) {
  const stringValue = String(value ?? "");
  if (/[",\n]/.test(stringValue)) return `"${stringValue.replaceAll('"', '""')}"`;
  return stringValue;
}

function releaseStateFor(item: PlatformCommandImprovementBacklogItem): PlatformCommandReleaseState {
  if (item.backlogState === "critical_path" || item.status === "block" || item.residualRisk === "high") {
    return "blocked";
  }
  if (item.priority === "critical" || item.priority === "high" || item.effort === "high") return "guarded";
  if (item.backlogState === "parking_lot") return "deferred";
  return "go";
}

export function platformCommandReleaseStateLabel(state: PlatformCommandReleaseState) {
  if (state === "blocked") return "Blocked";
  if (state === "guarded") return "Guarded";
  if (state === "go") return "Go";
  return "Deferred";
}

function readinessScoreFor(item: PlatformCommandImprovementBacklogItem, state: PlatformCommandReleaseState) {
  const statePenalty = state === "blocked" ? 35 : state === "guarded" ? 15 : state === "deferred" ? 8 : 0;
  const riskPenalty = item.residualRisk === "high" ? 25 : item.residualRisk === "medium" ? 10 : 0;
  const effortPenalty = item.effort === "high" ? 15 : item.effort === "medium" ? 8 : 0;
  const statusPenalty = item.status === "block" ? 20 : item.status === "watch" ? 8 : 0;

  return Math.max(0, 100 - statePenalty - riskPenalty - effortPenalty - statusPenalty);
}

function rolloutModeFor(state: PlatformCommandReleaseState) {
  if (state === "blocked") return "No-go，先補齊證據與依賴";
  if (state === "guarded") return "Guarded rollout，限定 owner 與範圍";
  if (state === "go") return "Standard release";
  return "不進本輪 release train";
}

function goNoGoGateFor(item: PlatformCommandImprovementBacklogItem, state: PlatformCommandReleaseState) {
  if (state === "blocked") return `完成 ${item.dependency} 後才可重新評估`;
  if (state === "guarded") return `先驗證 ${item.acceptanceMetric}，再擴大範圍`;
  if (state === "go") return `符合 ${item.acceptanceMetric} 即可發布`;
  return "下季重新排入 release review";
}

function qaEvidenceFor(item: PlatformCommandImprovementBacklogItem, state: PlatformCommandReleaseState) {
  if (state === "blocked") return `${item.nextMilestone} 尚未完成`;
  if (state === "guarded") return `需保留 ${item.sourceRoute} 前後指標與 owner 簽核`;
  if (state === "go") return `${item.acceptanceMetric} 已納入 release checklist`;
  return "只需保存 backlog 與 runbook 連結";
}

function rollbackPlanFor(item: PlatformCommandImprovementBacklogItem, state: PlatformCommandReleaseState) {
  if (state === "blocked") return "不發布，不需要 rollback";
  if (state === "guarded") return `若 ${item.sourceRoute} 回到 watch/block，回復原 owner 流程`;
  if (state === "go") return "保留上一版流程與 CSV 匯出作為回復依據";
  return "不進 release，無 rollback";
}

function customerNoticeFor(item: PlatformCommandImprovementBacklogItem, state: PlatformCommandReleaseState) {
  if (state === "blocked") return "內部阻擋，不對外通知";
  if (state === "guarded") return `僅通知受 ${item.sourceRoute} 影響的內部 owner`;
  if (state === "go" && item.impact === "reliability") return "可列入資料產品狀態更新";
  return "不需對外通知";
}

function approvalPathFor(item: PlatformCommandImprovementBacklogItem, state: PlatformCommandReleaseState) {
  if (state === "blocked") return `風控 + ${item.sponsor} + ${item.owner}`;
  if (state === "guarded") return `${item.sponsor} + ${item.owner}`;
  if (state === "go") return item.owner;
  return "季度 backlog owner";
}

function nextActionFor(item: PlatformCommandImprovementBacklogItem, state: PlatformCommandReleaseState) {
  if (state === "blocked") return `先解除阻擋：${item.dependency}`;
  if (state === "guarded") return `建立 guarded rollout checklist：${item.nextMilestone}`;
  if (state === "go") return `排入 ${item.releaseWindow} 並鎖定驗收`;
  return "下季重新審查";
}

function releaseRank(state: PlatformCommandReleaseState) {
  if (state === "blocked") return 4;
  if (state === "guarded") return 3;
  if (state === "go") return 2;
  return 1;
}

export function buildPlatformCommandReleaseReadinessItems(
  items: PlatformCommandImprovementBacklogItem[],
): PlatformCommandReleaseReadinessItem[] {
  return items
    .map((item) => {
      const releaseState = releaseStateFor(item);

      return {
        owner: item.owner,
        releaseOwner: item.sponsor,
        releaseState,
        backlogState: item.backlogState,
        impact: item.impact,
        effort: item.effort,
        priority: item.priority,
        status: item.status,
        residualRisk: item.residualRisk,
        readinessScore: readinessScoreFor(item, releaseState),
        backlogTitle: item.backlogTitle,
        sourceRoute: item.sourceRoute,
        leadCommand: item.leadCommand,
        releaseWindow: item.releaseWindow,
        rolloutMode: rolloutModeFor(releaseState),
        goNoGoGate: goNoGoGateFor(item, releaseState),
        qaEvidence: qaEvidenceFor(item, releaseState),
        rollbackPlan: rollbackPlanFor(item, releaseState),
        customerNotice: customerNoticeFor(item, releaseState),
        approvalPath: approvalPathFor(item, releaseState),
        nextAction: nextActionFor(item, releaseState),
      };
    })
    .sort(
      (left, right) =>
        releaseRank(right.releaseState) - releaseRank(left.releaseState) ||
        left.readinessScore - right.readinessScore ||
        left.backlogTitle.localeCompare(right.backlogTitle, "zh-Hant"),
    );
}

export function summarizePlatformCommandReleaseReadiness(
  items: PlatformCommandReleaseReadinessItem[],
): PlatformCommandReleaseReadinessSummary {
  const blockedCount = items.filter((item) => item.releaseState === "blocked").length;
  const guardedCount = items.filter((item) => item.releaseState === "guarded").length;
  const averageReadinessScore = items.length
    ? Math.round(items.reduce((sum, item) => sum + item.readinessScore, 0) / items.length)
    : 0;

  return {
    status: blockedCount > 0 ? "block" : guardedCount > 0 ? "watch" : "pass",
    itemCount: items.length,
    blockedCount,
    guardedCount,
    goCount: items.filter((item) => item.releaseState === "go").length,
    deferredCount: items.filter((item) => item.releaseState === "deferred").length,
    rollbackPlanCount: items.filter((item) => item.releaseState === "guarded" || item.releaseState === "go").length,
    averageReadinessScore,
    nextReleaseWindow: blockedCount > 0 ? "解除阻擋後" : guardedCount > 0 ? "Guarded rollout" : "本輪 release",
  };
}

export function platformCommandReleaseReadinessCsv(items: PlatformCommandReleaseReadinessItem[]) {
  const header = [
    "owner",
    "release_owner",
    "release_state",
    "backlog_state",
    "impact",
    "effort",
    "priority",
    "status",
    "residual_risk",
    "readiness_score",
    "source_route",
    "lead_command",
    "backlog_title",
    "release_window",
    "rollout_mode",
    "go_no_go_gate",
    "qa_evidence",
    "rollback_plan",
    "customer_notice",
    "approval_path",
    "next_action",
  ];
  const rows = items.map((item) => [
    item.owner,
    item.releaseOwner,
    platformCommandReleaseStateLabel(item.releaseState),
    platformCommandBacklogStateLabel(item.backlogState),
    platformCommandBacklogImpactLabel(item.impact),
    platformCommandBacklogEffortLabel(item.effort),
    platformCommandPriorityLabel(item.priority),
    platformCommandStatusLabel(item.status),
    platformCommandResidualRiskLabel(item.residualRisk),
    item.readinessScore,
    item.sourceRoute,
    item.leadCommand,
    item.backlogTitle,
    item.releaseWindow,
    item.rolloutMode,
    item.goNoGoGate,
    item.qaEvidence,
    item.rollbackPlan,
    item.customerNotice,
    item.approvalPath,
    item.nextAction,
  ]);

  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}
