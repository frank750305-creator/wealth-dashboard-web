import {
  platformCommandOperatingDecisionLabel,
  type PlatformCommandOperatingDecision,
  type PlatformCommandOperatingReviewItem,
} from "@/lib/platformCommandOperatingReview";
import {
  platformCommandReleaseMonitorStateLabel,
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

export type PlatformCommandExecutiveDecision =
  | "board_attention"
  | "management_review"
  | "monthly_update"
  | "archive";

export type PlatformCommandExecutiveBriefItem = {
  owner: string;
  executiveOwner: string;
  executiveDecision: PlatformCommandExecutiveDecision;
  operatingDecision: PlatformCommandOperatingDecision;
  monitorState: PlatformCommandReleaseMonitorState;
  releaseState: PlatformCommandReleaseState;
  impact: PlatformCommandBacklogImpact;
  priority: PlatformCommandPriority;
  status: PlatformCommandOperatingReviewItem["status"];
  residualRisk: PlatformCommandResidualRisk;
  readinessScore: number;
  backlogTitle: string;
  sourceRoute: string;
  leadCommand: string;
  executiveSummary: string;
  decisionAsk: string;
  resourceNeed: string;
  exposureMemo: string;
  clientMessage: string;
  boardMetric: string;
  evidencePack: string;
  decisionWindow: string;
  nextAction: string;
};

export type PlatformCommandExecutiveBriefSummary = {
  status: PlatformCommandOperatingReviewItem["status"];
  itemCount: number;
  boardAttentionCount: number;
  managementReviewCount: number;
  monthlyUpdateCount: number;
  archiveCount: number;
  averageReadinessScore: number;
  highResidualRiskCount: number;
  nextExecutiveWindow: string;
};

function csvCell(value: unknown) {
  const stringValue = String(value ?? "");
  if (/[",\n]/.test(stringValue)) return `"${stringValue.replaceAll('"', '""')}"`;
  return stringValue;
}

function executiveDecisionFor(item: PlatformCommandOperatingReviewItem): PlatformCommandExecutiveDecision {
  if (item.decision === "escalate" || item.residualRisk === "high" || item.status === "block") {
    return "board_attention";
  }
  if (item.decision === "review" || item.readinessScore < 75) return "management_review";
  if (item.decision === "report") return "monthly_update";
  return "archive";
}

export function platformCommandExecutiveDecisionLabel(decision: PlatformCommandExecutiveDecision) {
  if (decision === "board_attention") return "Board Attention";
  if (decision === "management_review") return "Management Review";
  if (decision === "monthly_update") return "Monthly Update";
  return "Archive";
}

function executiveOwnerFor(item: PlatformCommandOperatingReviewItem, decision: PlatformCommandExecutiveDecision) {
  if (decision === "board_attention") return `CEO/CIO + ${item.decisionOwner}`;
  if (decision === "management_review") return item.decisionOwner;
  if (decision === "monthly_update") return item.reviewOwner;
  return "backlog owner";
}

function executiveSummaryFor(item: PlatformCommandOperatingReviewItem, decision: PlatformCommandExecutiveDecision) {
  if (decision === "board_attention") return `${item.backlogTitle} 需要高層介入，避免阻擋項延伸到 release 或客戶承諾`;
  if (decision === "management_review") return `${item.backlogTitle} 可繼續推進，但需管理層追蹤風險與 rollback 條件`;
  if (decision === "monthly_update") return `${item.backlogTitle} 已進入穩定報告，可納入月度營運摘要`;
  return `${item.backlogTitle} 暫不進本期簡報，保留證據與下季檢查`;
}

function decisionAskFor(item: PlatformCommandOperatingReviewItem, decision: PlatformCommandExecutiveDecision) {
  if (decision === "board_attention") return `核准 ${item.managementAction}，並確認 ${item.decisionOwner} 負責解除風險`;
  if (decision === "management_review") return `確認 ${item.nextCheckpoint} 是否足以讓項目轉 stable`;
  if (decision === "monthly_update") return `同意納入月報，追蹤 ${item.boardMetric}`;
  return "無本期決策需求";
}

function resourceNeedFor(item: PlatformCommandOperatingReviewItem, decision: PlatformCommandExecutiveDecision) {
  if (decision === "board_attention") return `需要 ${item.decisionOwner} 指派跨職能資源`;
  if (decision === "management_review") return `需要 ${item.reviewOwner} 固定週會追蹤`;
  if (decision === "monthly_update") return "維持既有人力與例行報告";
  return "不需新增資源";
}

function exposureMemoFor(item: PlatformCommandOperatingReviewItem, decision: PlatformCommandExecutiveDecision) {
  if (decision === "board_attention") return `${item.riskMemo}；若延遲，可能影響 ${item.sourceRoute}`;
  if (decision === "management_review") return `${item.riskMemo}；需避免 watch 回到 block`;
  if (decision === "monthly_update") return "目前風險可控，保持可追蹤紀錄";
  return "已歸檔，暫無本期 exposure";
}

function clientMessageFor(item: PlatformCommandOperatingReviewItem, decision: PlatformCommandExecutiveDecision) {
  if (decision === "archive") return "不需客戶訊息";
  if (item.impact === "reliability") return "可包裝為資料產品穩定性改善";
  if (item.impact === "risk") return "對外不說內部風險，只保留客戶承諾不受影響";
  if (item.impact === "handoff") return "可包裝為服務響應與責任人清晰化";
  return "可包裝為知識庫與處理效率改善";
}

function decisionWindowFor(decision: PlatformCommandExecutiveDecision) {
  if (decision === "board_attention") return "24 小時內";
  if (decision === "management_review") return "下一次週會";
  if (decision === "monthly_update") return "本月月報";
  return "下季回顧";
}

function nextActionFor(item: PlatformCommandOperatingReviewItem, decision: PlatformCommandExecutiveDecision) {
  if (decision === "board_attention") return `排入高層議程：${item.nextCheckpoint}`;
  if (decision === "management_review") return `追蹤 ${item.meetingCadence} 並更新 evidence pack`;
  if (decision === "monthly_update") return "納入月報摘要並維持觀察";
  return "保留歸檔，等待下季排序";
}

function executiveRank(decision: PlatformCommandExecutiveDecision) {
  if (decision === "board_attention") return 4;
  if (decision === "management_review") return 3;
  if (decision === "monthly_update") return 2;
  return 1;
}

export function buildPlatformCommandExecutiveBriefItems(
  items: PlatformCommandOperatingReviewItem[],
): PlatformCommandExecutiveBriefItem[] {
  return items
    .map((item) => {
      const executiveDecision = executiveDecisionFor(item);

      return {
        owner: item.owner,
        executiveOwner: executiveOwnerFor(item, executiveDecision),
        executiveDecision,
        operatingDecision: item.decision,
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
        executiveSummary: executiveSummaryFor(item, executiveDecision),
        decisionAsk: decisionAskFor(item, executiveDecision),
        resourceNeed: resourceNeedFor(item, executiveDecision),
        exposureMemo: exposureMemoFor(item, executiveDecision),
        clientMessage: clientMessageFor(item, executiveDecision),
        boardMetric: item.boardMetric,
        evidencePack: item.evidencePack,
        decisionWindow: decisionWindowFor(executiveDecision),
        nextAction: nextActionFor(item, executiveDecision),
      };
    })
    .sort(
      (left, right) =>
        executiveRank(right.executiveDecision) - executiveRank(left.executiveDecision) ||
        left.readinessScore - right.readinessScore ||
        left.backlogTitle.localeCompare(right.backlogTitle, "zh-Hant"),
    );
}

export function summarizePlatformCommandExecutiveBrief(
  items: PlatformCommandExecutiveBriefItem[],
): PlatformCommandExecutiveBriefSummary {
  const boardAttentionCount = items.filter((item) => item.executiveDecision === "board_attention").length;
  const managementReviewCount = items.filter((item) => item.executiveDecision === "management_review").length;
  const averageReadinessScore = items.length
    ? Math.round(items.reduce((sum, item) => sum + item.readinessScore, 0) / items.length)
    : 0;

  return {
    status: boardAttentionCount > 0 ? "block" : managementReviewCount > 0 ? "watch" : "pass",
    itemCount: items.length,
    boardAttentionCount,
    managementReviewCount,
    monthlyUpdateCount: items.filter((item) => item.executiveDecision === "monthly_update").length,
    archiveCount: items.filter((item) => item.executiveDecision === "archive").length,
    averageReadinessScore,
    highResidualRiskCount: items.filter((item) => item.residualRisk === "high").length,
    nextExecutiveWindow: boardAttentionCount > 0 ? "24 小時內" : managementReviewCount > 0 ? "下一次週會" : "本月月報",
  };
}

export function platformCommandExecutiveBriefCsv(items: PlatformCommandExecutiveBriefItem[]) {
  const header = [
    "owner",
    "executive_owner",
    "executive_decision",
    "operating_decision",
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
    "executive_summary",
    "decision_ask",
    "resource_need",
    "exposure_memo",
    "client_message",
    "board_metric",
    "evidence_pack",
    "decision_window",
    "next_action",
  ];
  const rows = items.map((item) => [
    item.owner,
    item.executiveOwner,
    platformCommandExecutiveDecisionLabel(item.executiveDecision),
    platformCommandOperatingDecisionLabel(item.operatingDecision),
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
    item.executiveSummary,
    item.decisionAsk,
    item.resourceNeed,
    item.exposureMemo,
    item.clientMessage,
    item.boardMetric,
    item.evidencePack,
    item.decisionWindow,
    item.nextAction,
  ]);

  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}
