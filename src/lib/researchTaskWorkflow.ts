import {
  decisionSignalLabel,
  type AssetComparisonRow,
} from "@/lib/assetResearchWorkflow";
import type {
  MarketAlertCommandSummary,
  MarketAlertPriority,
  MarketAlertRunbookItem,
  MarketAlertStatus,
} from "@/lib/marketAlertEvents";

export type ResearchTaskStatus = "blocked" | "active" | "ready" | "done";
export type ResearchTaskPriority = "high" | "medium" | "low";
export type ResearchTaskLane = "data" | "research" | "risk" | "allocation" | "control";

export type ResearchTaskItem = {
  id: string;
  lane: ResearchTaskLane;
  title: string;
  status: ResearchTaskStatus;
  priority: ResearchTaskPriority;
  owner: string;
  symbol?: string;
  source: string;
  evidence: string;
  nextAction: string;
};

export type ResearchTaskSummary = {
  total: number;
  blocked: number;
  active: number;
  ready: number;
  done: number;
  status: ResearchTaskStatus;
  priority: ResearchTaskPriority;
  headline: string;
  focusOwner: string;
  nextAction: string;
};

type BuildResearchTaskItemsInput = {
  comparisonRows: AssetComparisonRow[];
  visibleComparisonRows: AssetComparisonRow[];
  assetProfileSymbol?: string | null;
  activeAllocationRows: Array<{ symbol: string; allocationWeight: number; allocationAmount: number }>;
  marketAlertCommandSummary: MarketAlertCommandSummary;
  marketAlertRunbookItems: MarketAlertRunbookItem[];
  researchOwner: string;
  riskOwner: string;
};

function csvCell(value: unknown) {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function taskPriorityFromAlert(priority: MarketAlertPriority): ResearchTaskPriority {
  if (priority === "high") return "high";
  if (priority === "medium") return "medium";
  return "low";
}

function taskStatusFromAlert(status: MarketAlertStatus): ResearchTaskStatus {
  if (status === "block") return "blocked";
  if (status === "watch") return "active";
  return "ready";
}

function taskPriorityRank(priority: ResearchTaskPriority) {
  if (priority === "high") return 0;
  if (priority === "medium") return 1;
  return 2;
}

function taskStatusRank(status: ResearchTaskStatus) {
  if (status === "blocked") return 0;
  if (status === "active") return 1;
  if (status === "ready") return 2;
  return 3;
}

function taskFromComparisonRow(row: AssetComparisonRow, researchOwner: string, riskOwner: string): ResearchTaskItem {
  if (row.signal === "risk" || row.qualityStatus === "risk") {
    return {
      id: `risk-${row.symbol}`,
      lane: "risk",
      title: `處理 ${row.symbol} 研究風險`,
      status: "blocked",
      priority: "high",
      owner: riskOwner,
      symbol: row.symbol,
      source: "Watchlist",
      evidence: `${decisionSignalLabel(row.signal)} · score ${row.score}`,
      nextAction: "先確認資料品質、回撤與波動，再決定是否排除。",
    };
  }

  if (row.signal === "candidate") {
    return {
      id: `candidate-${row.symbol}`,
      lane: "research",
      title: `完成 ${row.symbol} 研究 memo`,
      status: "ready",
      priority: "medium",
      owner: researchOwner,
      symbol: row.symbol,
      source: "Watchlist",
      evidence: `${decisionSignalLabel(row.signal)} · score ${row.score}`,
      nextAction: "開啟單一資產詳情，輸出研究 Memo，納入配置比較。",
    };
  }

  return {
    id: `review-${row.symbol}`,
    lane: "research",
    title: `覆核 ${row.symbol} 比較結論`,
    status: "active",
    priority: "medium",
    owner: researchOwner,
    symbol: row.symbol,
    source: "Watchlist",
    evidence: `${decisionSignalLabel(row.signal)} · score ${row.score}`,
    nextAction: "補同類資產比較與資料品質檢查。",
  };
}

export function researchTaskStatusLabel(status: ResearchTaskStatus) {
  if (status === "blocked") return "阻塞";
  if (status === "active") return "進行中";
  if (status === "ready") return "待覆核";
  return "完成";
}

export function researchTaskPriorityLabel(priority: ResearchTaskPriority) {
  if (priority === "high") return "高";
  if (priority === "medium") return "中";
  return "低";
}

export function researchTaskLaneLabel(lane: ResearchTaskLane) {
  if (lane === "data") return "資料";
  if (lane === "research") return "研究";
  if (lane === "risk") return "風控";
  if (lane === "allocation") return "配置";
  return "管控";
}

export function buildResearchTaskItems({
  comparisonRows,
  visibleComparisonRows,
  assetProfileSymbol,
  activeAllocationRows,
  marketAlertCommandSummary,
  marketAlertRunbookItems,
  researchOwner,
  riskOwner,
}: BuildResearchTaskItemsInput): ResearchTaskItem[] {
  const tasks: ResearchTaskItem[] = [];

  if (!comparisonRows.length) {
    tasks.push({
      id: "load-watchlist",
      lane: "data",
      title: "載入 Watchlist 比較",
      status: marketAlertCommandSummary.status === "block" ? "blocked" : "active",
      priority: "high",
      owner: researchOwner,
      source: "Watchlist",
      evidence: "尚未產生比較列",
      nextAction: "輸入 symbol 並執行比較商品。",
    });
  }

  tasks.push(
    ...visibleComparisonRows
      .slice(0, 5)
      .map((row) => taskFromComparisonRow(row, researchOwner, riskOwner)),
  );

  if (assetProfileSymbol) {
    tasks.push({
      id: `asset-memo-${assetProfileSymbol}`,
      lane: "research",
      title: `輸出 ${assetProfileSymbol} 單一資產 memo`,
      status: "ready",
      priority: "medium",
      owner: researchOwner,
      symbol: assetProfileSymbol,
      source: "單一資產詳情",
      evidence: "已載入 asset profile / history",
      nextAction: "匯出研究 Memo，並把結論回填到 watchlist 決策。",
    });
  }

  if (marketAlertCommandSummary.status !== "pass") {
    tasks.push({
      id: "market-alert-gate",
      lane: "control",
      title: "解除市場警示放行條件",
      status: taskStatusFromAlert(marketAlertCommandSummary.status),
      priority: taskPriorityFromAlert(marketAlertCommandSummary.priority),
      owner: marketAlertCommandSummary.focusOwner,
      source: "市場警示中心",
      evidence: marketAlertCommandSummary.releaseGate,
      nextAction: marketAlertCommandSummary.immediateAction,
    });
  }

  tasks.push(
    ...marketAlertRunbookItems.slice(0, 3).map((item) => ({
      id: `runbook-${item.source}-${item.title}`,
      lane: "control" as const,
      title: `Runbook：${item.title}`,
      status: taskStatusFromAlert(item.status),
      priority: taskPriorityFromAlert(item.priority),
      owner: item.owner,
      source: item.source,
      evidence: item.trigger,
      nextAction: item.resolve,
    })),
  );

  if (activeAllocationRows.length) {
    const topAllocation = activeAllocationRows[0];
    tasks.push({
      id: "allocation-review",
      lane: "allocation",
      title: "覆核模型配置草案",
      status: marketAlertCommandSummary.status === "block" ? "active" : "ready",
      priority: marketAlertCommandSummary.status === "block" ? "high" : "medium",
      owner: researchOwner,
      source: "模型配置",
      evidence: `${activeAllocationRows.length} 檔；最高權重 ${topAllocation.symbol}`,
      nextAction: "檢查單檔權重、風險貢獻與交易前限制。",
    });
  } else if (visibleComparisonRows.length) {
    tasks.push({
      id: "allocation-draft",
      lane: "allocation",
      title: "產生模型配置草案",
      status: "active",
      priority: "medium",
      owner: researchOwner,
      source: "模型配置",
      evidence: `${visibleComparisonRows.length} 檔已通過篩選`,
      nextAction: "確認配置模式、本金、單檔上限與壓力情境。",
    });
  }

  return tasks
    .sort(
      (left, right) =>
        taskPriorityRank(left.priority) - taskPriorityRank(right.priority) ||
        taskStatusRank(left.status) - taskStatusRank(right.status) ||
        left.lane.localeCompare(right.lane, "zh-Hant") ||
        left.title.localeCompare(right.title, "zh-Hant"),
    )
    .slice(0, 14);
}

export function buildResearchTaskSummary(tasks: ResearchTaskItem[]): ResearchTaskSummary {
  const blocked = tasks.filter((task) => task.status === "blocked").length;
  const active = tasks.filter((task) => task.status === "active").length;
  const ready = tasks.filter((task) => task.status === "ready").length;
  const done = tasks.filter((task) => task.status === "done").length;
  const focusTask = tasks[0];
  const status: ResearchTaskStatus = blocked ? "blocked" : active ? "active" : ready ? "ready" : "done";
  const priority: ResearchTaskPriority = tasks.some((task) => task.priority === "high")
    ? "high"
    : tasks.some((task) => task.priority === "medium")
      ? "medium"
      : "low";

  return {
    total: tasks.length,
    blocked,
    active,
    ready,
    done,
    status,
    priority,
    headline: focusTask ? `先處理：${focusTask.title}` : "目前沒有研究任務",
    focusOwner: focusTask?.owner ?? "--",
    nextAction: focusTask?.nextAction ?? "維持例行研究節奏。",
  };
}

export function researchTaskCsv(rows: ResearchTaskItem[]) {
  const header = [
    "lane",
    "title",
    "priority",
    "status",
    "owner",
    "symbol",
    "source",
    "evidence",
    "next_action",
  ];
  const csvRows = rows.map((row) => [
    researchTaskLaneLabel(row.lane),
    row.title,
    researchTaskPriorityLabel(row.priority),
    researchTaskStatusLabel(row.status),
    row.owner,
    row.symbol ?? "",
    row.source,
    row.evidence,
    row.nextAction,
  ]);

  return [header, ...csvRows].map((row) => row.map(csvCell).join(",")).join("\n");
}
