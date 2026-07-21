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
  manualNote?: string;
  manuallyUpdatedAt?: string;
  isManualOverride?: boolean;
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

export type ResearchLifecycleStage = {
  id: string;
  label: string;
  status: ResearchTaskStatus;
  owner: string;
  evidence: string;
  exitCriteria: string;
};

export type ResearchLifecycleAuditRecord = {
  timestamp: string;
  actor: string;
  action: string;
  status: ResearchTaskStatus;
  evidence: string;
};

export type ResearchTaskLifecycle = {
  gateStatus: ResearchTaskStatus;
  gateLabel: string;
  decision: string;
  releaseCondition: string;
  activeStage: string;
  blockerCount: number;
  readyCount: number;
  stages: ResearchLifecycleStage[];
  auditRecords: ResearchLifecycleAuditRecord[];
};

export type ResearchTaskOverride = {
  taskId: string;
  status?: ResearchTaskStatus;
  owner?: string;
  note?: string;
  updatedAt: string;
};

export type ResearchTaskSyncRecord = {
  workspace_id: string;
  actor_id: string;
  task_id: string;
  idempotency_key: string;
  generated_at: string;
  updated_at: string;
  lane: ResearchTaskLane;
  title: string;
  status: ResearchTaskStatus;
  priority: ResearchTaskPriority;
  owner: string;
  symbol: string | null;
  source: string;
  evidence: string;
  next_action: string;
  manual_note: string | null;
  is_manual_override: boolean;
  lifecycle_gate_status: ResearchTaskStatus;
  lifecycle_decision: string;
  active_stage: string;
  blocker_count: number;
  ready_count: number;
};

export type ResearchTaskSyncPayload = {
  table: string;
  workspace_id: string;
  actor_id: string;
  generated_at: string;
  record_count: number;
  records: ResearchTaskSyncRecord[];
  lifecycle: ResearchTaskLifecycle;
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

const researchTaskOverrideStorageKey = "wealth-dashboard.researchTaskOverrides";
const researchTaskWorkspaceStorageKey = "wealth-dashboard.researchTaskWorkspaceId";
const researchTaskWarehouseTable = "research_tasks";

const researchTaskBigQueryFields = [
  { name: "workspace_id", apiType: "STRING", sqlType: "STRING", mode: "NULLABLE", description: "Workspace or tenant id" },
  { name: "actor_id", apiType: "STRING", sqlType: "STRING", mode: "NULLABLE", description: "User or process that generated the sync" },
  { name: "task_id", apiType: "STRING", sqlType: "STRING", mode: "REQUIRED", description: "Stable research task id" },
  { name: "idempotency_key", apiType: "STRING", sqlType: "STRING", mode: "NULLABLE", description: "Stable key for retry-safe inserts" },
  { name: "generated_at", apiType: "TIMESTAMP", sqlType: "TIMESTAMP", mode: "REQUIRED", description: "Dashboard generation timestamp" },
  { name: "updated_at", apiType: "TIMESTAMP", sqlType: "TIMESTAMP", mode: "REQUIRED", description: "Last task update timestamp" },
  { name: "lane", apiType: "STRING", sqlType: "STRING", mode: "NULLABLE", description: "Task lane" },
  { name: "title", apiType: "STRING", sqlType: "STRING", mode: "NULLABLE", description: "Task title" },
  { name: "status", apiType: "STRING", sqlType: "STRING", mode: "NULLABLE", description: "Task status" },
  { name: "priority", apiType: "STRING", sqlType: "STRING", mode: "NULLABLE", description: "Task priority" },
  { name: "owner", apiType: "STRING", sqlType: "STRING", mode: "NULLABLE", description: "Responsible owner" },
  { name: "symbol", apiType: "STRING", sqlType: "STRING", mode: "NULLABLE", description: "Related market symbol" },
  { name: "source", apiType: "STRING", sqlType: "STRING", mode: "NULLABLE", description: "Source module" },
  { name: "evidence", apiType: "STRING", sqlType: "STRING", mode: "NULLABLE", description: "Decision evidence" },
  { name: "next_action", apiType: "STRING", sqlType: "STRING", mode: "NULLABLE", description: "Next action" },
  { name: "manual_note", apiType: "STRING", sqlType: "STRING", mode: "NULLABLE", description: "Manual note" },
  { name: "is_manual_override", apiType: "BOOLEAN", sqlType: "BOOL", mode: "NULLABLE", description: "Whether user changed task state" },
  { name: "lifecycle_gate_status", apiType: "STRING", sqlType: "STRING", mode: "NULLABLE", description: "Lifecycle gate status" },
  { name: "lifecycle_decision", apiType: "STRING", sqlType: "STRING", mode: "NULLABLE", description: "Lifecycle decision" },
  { name: "active_stage", apiType: "STRING", sqlType: "STRING", mode: "NULLABLE", description: "Current active stage" },
  { name: "blocker_count", apiType: "INTEGER", sqlType: "INT64", mode: "NULLABLE", description: "Blocked task count" },
  { name: "ready_count", apiType: "INTEGER", sqlType: "INT64", mode: "NULLABLE", description: "Ready task count" },
];

type BuildResearchTaskLifecycleInput = {
  tasks: ResearchTaskItem[];
  summary: ResearchTaskSummary;
  marketAlertCommandSummary: MarketAlertCommandSummary;
  generatedAt: string;
  decisionOwner: string;
  riskOwner: string;
};

function csvCell(value: unknown) {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function isResearchTaskStatus(value: unknown): value is ResearchTaskStatus {
  return value === "blocked" || value === "active" || value === "ready" || value === "done";
}

function normalizeWarehouseKey(value: string | undefined, fallback: string) {
  const cleanValue = (value || fallback).trim().replace(/\s+/g, "-").slice(0, 80);
  return cleanValue || fallback;
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

function laneStatus(tasks: ResearchTaskItem[], lane: ResearchTaskLane): ResearchTaskStatus {
  const laneTasks = tasks.filter((task) => task.lane === lane);
  if (!laneTasks.length) return "done";
  if (laneTasks.some((task) => task.status === "blocked")) return "blocked";
  if (laneTasks.some((task) => task.status === "active")) return "active";
  if (laneTasks.some((task) => task.status === "ready")) return "ready";
  return "done";
}

function lifecycleDecision(gateStatus: ResearchTaskStatus) {
  if (gateStatus === "blocked") return "暫停研究放行";
  if (gateStatus === "active") return "條件式放行";
  if (gateStatus === "ready") return "等待覆核放行";
  return "可進入投委會";
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

export function loadResearchTaskOverridesFromStorage(): ResearchTaskOverride[] {
  if (typeof window === "undefined") return [];

  try {
    const parsed = JSON.parse(window.localStorage.getItem(researchTaskOverrideStorageKey) || "[]");
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((item): item is ResearchTaskOverride => {
      if (!item || typeof item !== "object") return false;
      const override = item as Partial<ResearchTaskOverride>;
      return (
        typeof override.taskId === "string" &&
        typeof override.updatedAt === "string" &&
        (override.status === undefined || isResearchTaskStatus(override.status)) &&
        (override.owner === undefined || typeof override.owner === "string") &&
        (override.note === undefined || typeof override.note === "string")
      );
    });
  } catch {
    return [];
  }
}

export function writeResearchTaskOverridesToStorage(overrides: ResearchTaskOverride[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(researchTaskOverrideStorageKey, JSON.stringify(overrides));
}

export function loadResearchTaskWorkspaceIdFromStorage() {
  if (typeof window === "undefined") return "default";
  return normalizeWarehouseKey(window.localStorage.getItem(researchTaskWorkspaceStorageKey) || undefined, "default");
}

export function writeResearchTaskWorkspaceIdToStorage(workspaceId: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(researchTaskWorkspaceStorageKey, normalizeWarehouseKey(workspaceId, "default"));
}

export function applyResearchTaskOverrides(tasks: ResearchTaskItem[], overrides: ResearchTaskOverride[]) {
  const overrideByTaskId = new Map(overrides.map((override) => [override.taskId, override]));

  return tasks.map((task) => {
    const override = overrideByTaskId.get(task.id);
    if (!override) return task;

    const manualNote = override.note?.trim();
    return {
      ...task,
      status: override.status ?? task.status,
      owner: override.owner?.trim() || task.owner,
      manualNote: manualNote || undefined,
      manuallyUpdatedAt: override.updatedAt,
      isManualOverride: true,
    };
  });
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
    "manual_note",
    "manual_updated_at",
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
    row.manualNote ?? "",
    row.manuallyUpdatedAt ?? "",
  ]);

  return [header, ...csvRows].map((row) => row.map(csvCell).join(",")).join("\n");
}

export function buildResearchTaskSyncPayload({
  tasks,
  lifecycle,
  generatedAt,
  workspaceId,
  actorId,
}: {
  tasks: ResearchTaskItem[];
  lifecycle: ResearchTaskLifecycle;
  generatedAt: string;
  workspaceId?: string;
  actorId?: string;
}): ResearchTaskSyncPayload {
  const cleanWorkspaceId = normalizeWarehouseKey(workspaceId, "default");
  const cleanActorId = normalizeWarehouseKey(actorId, "system");
  const records = tasks.map((task) => ({
    workspace_id: cleanWorkspaceId,
    actor_id: cleanActorId,
    task_id: task.id,
    idempotency_key: `${cleanWorkspaceId}:${cleanActorId}:${task.id}:${task.manuallyUpdatedAt ?? generatedAt}`,
    generated_at: generatedAt,
    updated_at: task.manuallyUpdatedAt ?? generatedAt,
    lane: task.lane,
    title: task.title,
    status: task.status,
    priority: task.priority,
    owner: task.owner,
    symbol: task.symbol ?? null,
    source: task.source,
    evidence: task.evidence,
    next_action: task.nextAction,
    manual_note: task.manualNote ?? null,
    is_manual_override: Boolean(task.isManualOverride),
    lifecycle_gate_status: lifecycle.gateStatus,
    lifecycle_decision: lifecycle.decision,
    active_stage: lifecycle.activeStage,
    blocker_count: lifecycle.blockerCount,
    ready_count: lifecycle.readyCount,
  }));

  return {
    table: researchTaskWarehouseTable,
    workspace_id: cleanWorkspaceId,
    actor_id: cleanActorId,
    generated_at: generatedAt,
    record_count: records.length,
    records,
    lifecycle,
  };
}

export function researchTaskSyncPayloadJson(payload: ResearchTaskSyncPayload) {
  return JSON.stringify(payload, null, 2);
}

export function researchTaskBigQuerySchemaJson() {
  return JSON.stringify(
    researchTaskBigQueryFields.map(({ name, apiType, mode, description }) => ({
      name,
      type: apiType,
      mode,
      description,
    })),
    null,
    2,
  );
}

export function researchTaskBigQueryDdl(tableId = "project_id.dataset_name.research_tasks") {
  const columns = researchTaskBigQueryFields
    .map((field) => {
      const required = field.mode === "REQUIRED" ? " NOT NULL" : "";
      return `  ${field.name} ${field.sqlType}${required} OPTIONS(description="${field.description}")`;
    })
    .join(",\n");

  return [
    "-- Replace project_id.dataset_name before running this in BigQuery.",
    `CREATE TABLE IF NOT EXISTS \`${tableId}\` (`,
    columns,
    ")",
    "PARTITION BY DATE(updated_at)",
    "CLUSTER BY workspace_id, status, priority, lane",
    'OPTIONS(description="Research task state exported from wealth dashboard");',
    "",
  ].join("\n");
}

export function buildResearchTaskLifecycle({
  tasks,
  summary,
  marketAlertCommandSummary,
  generatedAt,
  decisionOwner,
  riskOwner,
}: BuildResearchTaskLifecycleInput): ResearchTaskLifecycle {
  const gateStatus: ResearchTaskStatus =
    summary.blocked || marketAlertCommandSummary.status === "block"
      ? "blocked"
      : summary.active || marketAlertCommandSummary.status === "watch"
        ? "active"
        : summary.ready
          ? "ready"
          : "done";
  const stages: ResearchLifecycleStage[] = [
    {
      id: "data",
      label: "資料與 Watchlist",
      status: laneStatus(tasks, "data"),
      owner: decisionOwner,
      evidence: `${tasks.filter((task) => task.lane === "data").length} 個資料任務`,
      exitCriteria: "Watchlist 已載入，且沒有資料阻塞項。",
    },
    {
      id: "research",
      label: "研究 Memo",
      status: laneStatus(tasks, "research"),
      owner: decisionOwner,
      evidence: `${tasks.filter((task) => task.lane === "research").length} 個研究任務`,
      exitCriteria: "候選商品完成單一資產 memo，並保留資料品質結論。",
    },
    {
      id: "risk",
      label: "風控覆核",
      status: laneStatus(tasks, "risk"),
      owner: riskOwner,
      evidence: `${tasks.filter((task) => task.lane === "risk").length} 個風控任務`,
      exitCriteria: "風險或資料異常已解除，或明確排除相關資產。",
    },
    {
      id: "allocation",
      label: "配置草案",
      status: laneStatus(tasks, "allocation"),
      owner: decisionOwner,
      evidence: `${tasks.filter((task) => task.lane === "allocation").length} 個配置任務`,
      exitCriteria: "權重、風險貢獻、交易限制完成覆核。",
    },
    {
      id: "control",
      label: "告警與放行",
      status: laneStatus(tasks, "control"),
      owner: marketAlertCommandSummary.focusOwner,
      evidence: marketAlertCommandSummary.releaseGate,
      exitCriteria: "市場警示中心不再阻塞，runbook 已完成驗收。",
    },
  ];
  const activeStage = stages.find((stage) => stage.status !== "done") ?? stages.at(-1);
  const gateLabel = gateStatus === "blocked" ? "暫停" : gateStatus === "active" ? "條件式" : gateStatus === "ready" ? "待覆核" : "放行";
  const releaseCondition =
    gateStatus === "blocked"
      ? "解除所有阻塞任務與市場警示後才能進入投委會。"
      : gateStatus === "active"
        ? "可持續研究，但配置與交易前需人工覆核。"
        : gateStatus === "ready"
          ? "等待研究負責人完成最後覆核。"
          : "已達到研究流程放行條件。";
  const auditRecords: ResearchLifecycleAuditRecord[] = [
    {
      timestamp: generatedAt,
      actor: decisionOwner,
      action: lifecycleDecision(gateStatus),
      status: gateStatus,
      evidence: `${summary.total} tasks / ${marketAlertCommandSummary.releaseGate}`,
    },
    ...tasks.slice(0, 5).map((task) => ({
      timestamp: generatedAt,
      actor: task.owner,
      action: task.title,
      status: task.status,
      evidence: task.evidence,
    })),
  ];

  return {
    gateStatus,
    gateLabel,
    decision: lifecycleDecision(gateStatus),
    releaseCondition,
    activeStage: activeStage?.label ?? "--",
    blockerCount: summary.blocked,
    readyCount: summary.ready,
    stages,
    auditRecords,
  };
}

export function researchTaskLifecycleCsv(lifecycle: ResearchTaskLifecycle) {
  const stageHeader = ["section", "id", "label", "status", "owner", "evidence", "exit_criteria"];
  const stageRows = lifecycle.stages.map((stage) => [
    "stage",
    stage.id,
    stage.label,
    researchTaskStatusLabel(stage.status),
    stage.owner,
    stage.evidence,
    stage.exitCriteria,
  ]);
  const auditRows = lifecycle.auditRecords.map((record) => [
    "audit",
    record.timestamp,
    record.actor,
    researchTaskStatusLabel(record.status),
    record.action,
    record.evidence,
    "",
  ]);
  const summaryRows = [
    ["summary", "decision", lifecycle.decision, researchTaskStatusLabel(lifecycle.gateStatus), lifecycle.gateLabel, lifecycle.releaseCondition, ""],
    ["summary", "active_stage", lifecycle.activeStage, "", "", "", ""],
  ];

  return [stageHeader, ...summaryRows, ...stageRows, ...auditRows].map((row) => row.map(csvCell).join(",")).join("\n");
}
