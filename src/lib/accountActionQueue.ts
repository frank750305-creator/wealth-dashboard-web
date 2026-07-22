import type {
  AccountHealthItem,
  AccountHealthStage,
  AccountHealthStatus,
} from "@/lib/accountHealth";

export type AccountActionPriority = "p0" | "p1" | "p2" | "p3";
export type AccountActionMotion = "retain" | "stabilize" | "expand" | "nurture";

export type AccountActionQueueItem = {
  workspace: string;
  plan: string;
  stage: AccountHealthStage;
  priority: AccountActionPriority;
  motion: AccountActionMotion;
  status: AccountHealthStatus;
  owner: string;
  targetMrr: number;
  exposureMrr: number;
  dueWindow: string;
  playbook: string;
  evidence: string;
  nextAction: string;
  successMetric: string;
};

export type AccountActionQueueSummary = {
  status: AccountHealthStatus;
  actionCount: number;
  p0Count: number;
  p1Count: number;
  retentionCount: number;
  expansionCount: number;
  stabilizationCount: number;
  mrrAtRisk: number;
  expansionPipelineMrr: number;
};

function csvCell(value: unknown) {
  const stringValue = String(value ?? "");
  if (/[",\n]/.test(stringValue)) return `"${stringValue.replaceAll('"', '""')}"`;
  return stringValue;
}

export function accountActionPriorityLabel(priority: AccountActionPriority) {
  if (priority === "p0") return "P0";
  if (priority === "p1") return "P1";
  if (priority === "p2") return "P2";
  return "P3";
}

export function accountActionMotionLabel(motion: AccountActionMotion) {
  if (motion === "retain") return "保留";
  if (motion === "stabilize") return "穩定";
  if (motion === "expand") return "擴售";
  return "培育";
}

export function accountActionStatusLabel(status: AccountHealthStatus) {
  if (status === "pass") return "通過";
  if (status === "watch") return "觀察";
  return "暫停";
}

function priorityRank(priority: AccountActionPriority) {
  if (priority === "p0") return 4;
  if (priority === "p1") return 3;
  if (priority === "p2") return 2;
  return 1;
}

function priorityFor(item: AccountHealthItem): AccountActionPriority {
  if (item.stage === "risk" && (item.churnRiskMrr > 0 || item.productImpactSeverity === "critical")) return "p0";
  if (item.stage === "risk" || item.stage === "watch") return "p1";
  if (item.stage === "expand") return "p2";
  return "p3";
}

function motionFor(stage: AccountHealthStage): AccountActionMotion {
  if (stage === "risk") return "retain";
  if (stage === "watch") return "stabilize";
  if (stage === "expand") return "expand";
  return "nurture";
}

function dueWindow(priority: AccountActionPriority) {
  if (priority === "p0") return "48 小時內";
  if (priority === "p1") return "7 天內";
  if (priority === "p2") return "本月 QBR";
  return "例行月檢";
}

function playbookFor(item: AccountHealthItem, motion: AccountActionMotion) {
  if (motion === "retain") return "續約保留：列出阻擋項、負責人、修復日期與客戶溝通版本";
  if (motion === "stabilize") return "使用深化：安排 onboarding、資料覆蓋檢查與 14 天使用改善";
  if (motion === "expand") return "擴售提案：席位、API 額度、資料包或企業治理加購";
  return item.currentMrr > 0 ? "續約維護：維持 QBR 與使用成功案例" : "商機培育：提升 demo 到付費轉換證據";
}

function successMetricFor(item: AccountHealthItem, motion: AccountActionMotion) {
  if (motion === "retain") return `續約機率拉回 75% 以上，流失風險降至 NT$0`;
  if (motion === "stabilize") return `健康分數提升到 80 以上，產品影響降為無影響`;
  if (motion === "expand") return `擴售 pipeline 達 NT$${item.expansionMrr.toLocaleString("zh-TW")} / 月`;
  return item.currentMrr > 0 ? "維持續約機率 85% 以上" : "建立付費意向或明確退出條件";
}

export function buildAccountActionQueueItems(items: AccountHealthItem[]): AccountActionQueueItem[] {
  return items
    .map((item) => {
      const priority = priorityFor(item);
      const motion = motionFor(item.stage);
      const targetMrr = motion === "expand" ? item.expansionMrr : item.churnRiskMrr;
      const exposureMrr = item.churnRiskMrr || item.currentMrr;

      return {
        workspace: item.workspace,
        plan: item.plan,
        stage: item.stage,
        priority,
        motion,
        status: item.status,
        owner: item.owner,
        targetMrr,
        exposureMrr,
        dueWindow: dueWindow(priority),
        playbook: playbookFor(item, motion),
        evidence: item.riskDrivers.join(" / "),
        nextAction: item.nextAction,
        successMetric: successMetricFor(item, motion),
      };
    })
    .sort(
      (left, right) =>
        priorityRank(right.priority) - priorityRank(left.priority) ||
        right.exposureMrr - left.exposureMrr ||
        right.targetMrr - left.targetMrr ||
        left.workspace.localeCompare(right.workspace, "zh-Hant"),
    );
}

export function summarizeAccountActionQueue(items: AccountActionQueueItem[]): AccountActionQueueSummary {
  const p0Count = items.filter((item) => item.priority === "p0").length;
  const p1Count = items.filter((item) => item.priority === "p1").length;

  return {
    status: p0Count > 0 ? "block" : p1Count > 0 ? "watch" : "pass",
    actionCount: items.length,
    p0Count,
    p1Count,
    retentionCount: items.filter((item) => item.motion === "retain").length,
    expansionCount: items.filter((item) => item.motion === "expand").length,
    stabilizationCount: items.filter((item) => item.motion === "stabilize").length,
    mrrAtRisk: items.filter((item) => item.motion === "retain").reduce((sum, item) => sum + item.targetMrr, 0),
    expansionPipelineMrr: items.filter((item) => item.motion === "expand").reduce((sum, item) => sum + item.targetMrr, 0),
  };
}

export function accountActionQueueCsv(items: AccountActionQueueItem[]) {
  const header = [
    "workspace",
    "plan",
    "stage",
    "priority",
    "motion",
    "status",
    "owner",
    "target_mrr",
    "exposure_mrr",
    "due_window",
    "playbook",
    "evidence",
    "next_action",
    "success_metric",
  ];
  const rows = items.map((item) => [
    item.workspace,
    item.plan,
    item.stage,
    accountActionPriorityLabel(item.priority),
    accountActionMotionLabel(item.motion),
    accountActionStatusLabel(item.status),
    item.owner,
    item.targetMrr,
    item.exposureMrr,
    item.dueWindow,
    item.playbook,
    item.evidence,
    item.nextAction,
    item.successMetric,
  ]);

  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}
