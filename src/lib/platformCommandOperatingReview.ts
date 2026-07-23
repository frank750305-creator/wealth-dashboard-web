import {
  platformCommandReleaseMonitorStateLabel,
  type PlatformCommandReleaseMonitorItem,
  type PlatformCommandReleaseMonitorState,
} from "@/lib/platformCommandReleaseMonitor";
import {
  platformCommandReleaseStateLabel,
  type PlatformCommandReleaseState,
} from "@/lib/platformCommandReleaseReadiness";
import {
  platformCommandBacklogImpactLabel,
  type PlatformCommandBacklogImpact,
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

export type PlatformCommandOperatingDecision = "escalate" | "review" | "report" | "archive";

export type PlatformCommandOperatingReviewItem = {
  owner: string;
  reviewOwner: string;
  decision: PlatformCommandOperatingDecision;
  monitorState: PlatformCommandReleaseMonitorState;
  releaseState: PlatformCommandReleaseState;
  impact: PlatformCommandBacklogImpact;
  priority: PlatformCommandPriority;
  status: PlatformCommandReleaseMonitorItem["status"];
  residualRisk: PlatformCommandResidualRisk;
  readinessScore: number;
  backlogTitle: string;
  sourceRoute: string;
  leadCommand: string;
  operatingNarrative: string;
  managementAction: string;
  boardMetric: string;
  riskMemo: string;
  meetingCadence: string;
  decisionOwner: string;
  evidencePack: string;
  nextCheckpoint: string;
};

export type PlatformCommandOperatingReviewSummary = {
  status: PlatformCommandReleaseMonitorItem["status"];
  itemCount: number;
  escalateCount: number;
  reviewCount: number;
  reportCount: number;
  archiveCount: number;
  averageReadinessScore: number;
  highResidualRiskCount: number;
  nextManagementWindow: string;
};

function csvCell(value: unknown) {
  const stringValue = String(value ?? "");
  if (/[",\n]/.test(stringValue)) return `"${stringValue.replaceAll('"', '""')}"`;
  return stringValue;
}

function decisionFor(item: PlatformCommandReleaseMonitorItem): PlatformCommandOperatingDecision {
  if (item.monitorState === "halt" || item.residualRisk === "high" || item.status === "block") return "escalate";
  if (item.monitorState === "watch" || item.readinessScore < 75 || item.status === "watch") return "review";
  if (item.monitorState === "stable") return "report";
  return "archive";
}

export function platformCommandOperatingDecisionLabel(decision: PlatformCommandOperatingDecision) {
  if (decision === "escalate") return "Escalate";
  if (decision === "review") return "Review";
  if (decision === "report") return "Report";
  return "Archive";
}

function operatingNarrativeFor(item: PlatformCommandReleaseMonitorItem, decision: PlatformCommandOperatingDecision) {
  if (decision === "escalate") return `${item.backlogTitle} 仍有 no-go 或高風險，需要管理層介入`;
  if (decision === "review") return `${item.backlogTitle} 可進觀察，但需要週會確認 rollback 與責任人`;
  if (decision === "report") return `${item.backlogTitle} 已可列入例行營運報告`;
  return `${item.backlogTitle} 暫不進本輪管理議程，保留歸檔`;
}

function managementActionFor(item: PlatformCommandReleaseMonitorItem, decision: PlatformCommandOperatingDecision) {
  if (decision === "escalate") return `要求 ${item.monitorOwner} 在下一次會議前解除 ${item.alertThreshold}`;
  if (decision === "review") return `每週追蹤 ${item.monitoredSignal}，並確認 ${item.rollbackTrigger}`;
  if (decision === "report") return `納入月報，觀察 ${item.observationWindow} 後關閉`;
  return "放入季度 backlog review";
}

function boardMetricFor(item: PlatformCommandReleaseMonitorItem, decision: PlatformCommandOperatingDecision) {
  if (decision === "escalate") return `阻擋項解除率 / readiness ${item.readinessScore}`;
  if (decision === "review") return `watch 轉 stable 比率 / readiness ${item.readinessScore}`;
  if (decision === "report") return `stable 維持率 / readiness ${item.readinessScore}`;
  return "季度重啟率";
}

function riskMemoFor(item: PlatformCommandReleaseMonitorItem, decision: PlatformCommandOperatingDecision) {
  if (decision === "escalate") return `${item.recoveryAction}；未完成時不可進 release`;
  if (decision === "review") return `${item.rollbackTrigger} 是主要管理風險`;
  if (decision === "report") return "維持例行監控即可";
  return "暫無當期風險，保留紀錄";
}

function meetingCadenceFor(decision: PlatformCommandOperatingDecision) {
  if (decision === "escalate") return "每日 standup";
  if (decision === "review") return "每週 operating review";
  if (decision === "report") return "月度 management report";
  return "季度 backlog review";
}

function decisionOwnerFor(item: PlatformCommandReleaseMonitorItem, decision: PlatformCommandOperatingDecision) {
  if (decision === "escalate") return `管理層 + ${item.monitorOwner}`;
  if (decision === "review") return item.monitorOwner;
  if (decision === "report") return item.owner;
  return "backlog owner";
}

function nextCheckpointFor(item: PlatformCommandReleaseMonitorItem, decision: PlatformCommandOperatingDecision) {
  if (decision === "escalate") return `下一次會議確認 ${item.nextAction}`;
  if (decision === "review") return `下一週確認 ${item.verificationCadence} 紀錄`;
  if (decision === "report") return `月報確認 ${item.evidenceLog}`;
  return "下季重新排序";
}

function decisionRank(decision: PlatformCommandOperatingDecision) {
  if (decision === "escalate") return 4;
  if (decision === "review") return 3;
  if (decision === "report") return 2;
  return 1;
}

export function buildPlatformCommandOperatingReviewItems(
  items: PlatformCommandReleaseMonitorItem[],
): PlatformCommandOperatingReviewItem[] {
  return items
    .map((item) => {
      const decision = decisionFor(item);

      return {
        owner: item.owner,
        reviewOwner: item.monitorOwner,
        decision,
        monitorState: item.monitorState,
        releaseState: item.releaseState,
        impact: item.impact,
        priority: item.priority,
        status: item.status,
        residualRisk: item.residualRisk,
        readinessScore: item.readinessScore,
        backlogTitle: item.backlogTitle,
        sourceRoute: item.sourceRoute,
        leadCommand: item.leadCommand,
        operatingNarrative: operatingNarrativeFor(item, decision),
        managementAction: managementActionFor(item, decision),
        boardMetric: boardMetricFor(item, decision),
        riskMemo: riskMemoFor(item, decision),
        meetingCadence: meetingCadenceFor(decision),
        decisionOwner: decisionOwnerFor(item, decision),
        evidencePack: item.evidenceLog,
        nextCheckpoint: nextCheckpointFor(item, decision),
      };
    })
    .sort(
      (left, right) =>
        decisionRank(right.decision) - decisionRank(left.decision) ||
        left.readinessScore - right.readinessScore ||
        left.backlogTitle.localeCompare(right.backlogTitle, "zh-Hant"),
    );
}

export function summarizePlatformCommandOperatingReview(
  items: PlatformCommandOperatingReviewItem[],
): PlatformCommandOperatingReviewSummary {
  const escalateCount = items.filter((item) => item.decision === "escalate").length;
  const reviewCount = items.filter((item) => item.decision === "review").length;
  const averageReadinessScore = items.length
    ? Math.round(items.reduce((sum, item) => sum + item.readinessScore, 0) / items.length)
    : 0;

  return {
    status: escalateCount > 0 ? "block" : reviewCount > 0 ? "watch" : "pass",
    itemCount: items.length,
    escalateCount,
    reviewCount,
    reportCount: items.filter((item) => item.decision === "report").length,
    archiveCount: items.filter((item) => item.decision === "archive").length,
    averageReadinessScore,
    highResidualRiskCount: items.filter((item) => item.residualRisk === "high").length,
    nextManagementWindow: escalateCount > 0 ? "每日 standup" : reviewCount > 0 ? "每週 review" : "月度 report",
  };
}

export function platformCommandOperatingReviewCsv(items: PlatformCommandOperatingReviewItem[]) {
  const header = [
    "owner",
    "review_owner",
    "decision",
    "monitor_state",
    "release_state",
    "impact",
    "priority",
    "status",
    "residual_risk",
    "readiness_score",
    "source_route",
    "lead_command",
    "backlog_title",
    "operating_narrative",
    "management_action",
    "board_metric",
    "risk_memo",
    "meeting_cadence",
    "decision_owner",
    "evidence_pack",
    "next_checkpoint",
  ];
  const rows = items.map((item) => [
    item.owner,
    item.reviewOwner,
    platformCommandOperatingDecisionLabel(item.decision),
    platformCommandReleaseMonitorStateLabel(item.monitorState),
    platformCommandReleaseStateLabel(item.releaseState),
    platformCommandBacklogImpactLabel(item.impact),
    platformCommandPriorityLabel(item.priority),
    platformCommandStatusLabel(item.status),
    platformCommandResidualRiskLabel(item.residualRisk),
    item.readinessScore,
    item.sourceRoute,
    item.leadCommand,
    item.backlogTitle,
    item.operatingNarrative,
    item.managementAction,
    item.boardMetric,
    item.riskMemo,
    item.meetingCadence,
    item.decisionOwner,
    item.evidencePack,
    item.nextCheckpoint,
  ]);

  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}
