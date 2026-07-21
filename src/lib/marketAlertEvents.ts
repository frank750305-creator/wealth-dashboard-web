export type MarketAlertStatus = "pass" | "watch" | "block";
export type MarketAlertPriority = "high" | "medium" | "low";
export type MarketAlertQualityStatus = "strong" | "watch" | "risk" | "neutral";
export type MarketAlertSlaTier = "critical" | "review" | "routine";

export type MarketAlertEvent = {
  source: string;
  title: string;
  status: MarketAlertStatus;
  priority: MarketAlertPriority;
  owner: string;
  evidence: string;
  action: string;
};

export type MarketAlertOwnerQueue = {
  owner: string;
  status: MarketAlertStatus;
  priority: MarketAlertPriority;
  total: number;
  high: number;
  medium: number;
  low: number;
  block: number;
  watch: number;
  pass: number;
  topSource: string;
  nextAction: string;
};

export type MarketAlertRunbookItem = {
  source: string;
  title: string;
  status: MarketAlertStatus;
  priority: MarketAlertPriority;
  owner: string;
  deadline: string;
  trigger: string;
  diagnose: string;
  resolve: string;
  verify: string;
  escalation: string;
};

export type MarketAlertCommandSummary = {
  status: MarketAlertStatus;
  priority: MarketAlertPriority;
  operatingMode: string;
  releaseGate: string;
  headline: string;
  blockedFlow: string;
  focusOwner: string;
  focusSource: string;
  immediateAction: string;
  nextReview: string;
  totalAlerts: number;
  highPriorityCount: number;
  blockCount: number;
  watchCount: number;
  ownerCount: number;
  runbookCount: number;
};

type CoverageUniverseAlertInput = {
  label: string;
  status: MarketAlertStatus;
  count: string;
  target: string;
  owner: string;
  action: string;
};

type DataContractAlertInput = {
  table: string;
  status: MarketAlertStatus;
  missingColumns: string[];
  freshness: string;
  owner: string;
  action: string;
};

type DataPipelineHealthAlertInput = {
  label: string;
  status: MarketAlertStatus;
  value: string;
  owner: string;
  action: string;
};

type QualityCardAlertInput = {
  label: string;
  value: string;
  status: MarketAlertQualityStatus;
  note: string;
};

type DecisionFunnelAlertInput = {
  label: string;
  status: MarketAlertStatus;
  value: string;
  conversion: string;
  owner: string;
  note: string;
};

type OperatingKriAlertInput = {
  label: string;
  status: MarketAlertStatus;
  value: string;
  owner: string;
  note: string;
};

type PlatformExceptionAlertInput = {
  source: string;
  item: string;
  status: MarketAlertStatus;
  priority: MarketAlertPriority;
  owner: string;
  evidence: string;
  nextAction: string;
};

type SlaEscalationAlertInput = {
  trigger: string;
  tier: MarketAlertSlaTier;
  status: MarketAlertStatus;
  priority: MarketAlertPriority;
  owner: string;
  due: string;
  action: string;
};

function csvCell(value: unknown) {
  const stringValue = String(value ?? "");
  if (/[",\n]/.test(stringValue)) return `"${stringValue.replaceAll('"', '""')}"`;
  return stringValue;
}

function executionReviewLabel(status: MarketAlertStatus) {
  if (status === "pass") return "通過";
  if (status === "watch") return "觀察";
  return "暫停";
}

function executionHandoffPriorityLabel(priority: MarketAlertPriority) {
  if (priority === "high") return "高";
  if (priority === "medium") return "中";
  return "低";
}

function qualityToExecutionStatus(status: MarketAlertQualityStatus): MarketAlertStatus {
  if (status === "risk") return "block";
  if (status === "watch" || status === "neutral") return "watch";
  return "pass";
}

function slaEscalationTierLabel(tier: MarketAlertSlaTier) {
  if (tier === "critical") return "L1 立即升級";
  if (tier === "review") return "L2 覆核追蹤";
  return "L3 例行追蹤";
}

function marketAlertPriorityFromStatus(status: MarketAlertStatus): MarketAlertPriority {
  if (status === "block") return "high";
  if (status === "watch") return "medium";
  return "low";
}

function marketAlertStatusFromEvents(events: MarketAlertEvent[]): MarketAlertStatus {
  if (events.some((event) => event.status === "block")) return "block";
  if (events.some((event) => event.status === "watch")) return "watch";
  return "pass";
}

function marketAlertPriorityFromEvents(events: MarketAlertEvent[]): MarketAlertPriority {
  if (events.some((event) => event.priority === "high")) return "high";
  if (events.some((event) => event.priority === "medium")) return "medium";
  return "low";
}

function marketAlertDeadline(priority: MarketAlertPriority, status: MarketAlertStatus) {
  if (priority === "high" || status === "block") return "T+0 盤中處理";
  if (priority === "medium" || status === "watch") return "T+1 收盤前";
  return "週檢查";
}

function runbookTemplateForSource(source: string) {
  if (source === "資料合約") {
    return {
      diagnose: "比對 BigQuery schema、必要欄位與 API 回傳欄位，確認是缺欄位、型別不符或查詢口徑變更。",
      resolve: "修正資料表欄位、查詢映射或 ingestion schema，必要時補一次歷史回填。",
      verify: "重新讀取 diagnostics，確認 schema check 通過且缺欄位清單為空。",
    };
  }
  if (source === "資料管線") {
    return {
      diagnose: "檢查最近批次、資料日期、row count 與來源抓取結果，定位是抓取失敗、寫入失敗或排程中斷。",
      resolve: "重跑對應 ingestion job，補齊缺口日期，並確認失敗原因已移除。",
      verify: "重新檢查 latest date、stale symbol 與資料管線健康卡是否回到通過。",
    };
  }
  if (source === "資料品質") {
    return {
      diagnose: "檢查 freshness、coverage、depth 與缺漏價格，確認異常集中在單一資產、資料表或整批資料。",
      resolve: "回補缺漏價格、修正 symbol mapping，或暫時將受影響資產排除在正式分析外。",
      verify: "重新產生品質 scorecard，確認分數與狀態恢復到正常或觀察區。",
    };
  }
  if (source === "可投資宇宙") {
    return {
      diagnose: "檢查商品主檔、可投資清單與 watchlist 是否有缺資產、重複 symbol 或資料期間不足。",
      resolve: "補 metadata、清理重複商品，並更新 watchlist preset。",
      verify: "重新搜尋與比較資產，確認候選資產可進入配置與研究 memo。",
    };
  }
  if (source === "決策漏斗") {
    return {
      diagnose: "檢查從 watchlist、配置草案、交易 ticket 到成交回填的轉換斷點。",
      resolve: "補齊缺少的配置、交易或覆核資料，重新產生決策漏斗。",
      verify: "確認漏斗主要階段不再 block，且候選、配置、交易數量合理。",
    };
  }
  if (source === "營運 KRI") {
    return {
      diagnose: "檢查交易成本、未成交金額、SLA、例外項與風控限制是否超過門檻。",
      resolve: "分派負責人處理高風險 KRI，必要時暫停交易或降低部位。",
      verify: "重新產生營運 KRI，確認 block 項目下降並留下處理紀錄。",
    };
  }
  if (source === "SLA 升級") {
    return {
      diagnose: "確認升級等級、到期時間、未處理 owner 與受影響流程。",
      resolve: "依 L1/L2/L3 節奏處理，L1 立即通知負責人並凍結相關放行。",
      verify: "確認 SLA 狀態降級或解除，並同步到 owner queue。",
    };
  }

  return {
    diagnose: "確認事件來源、依據與受影響流程，避免把資料問題誤判為投資結論。",
    resolve: "依事件 action 完成修復或人工覆核，必要時暫停放行。",
    verify: "重新產生市場警示中心，確認事件狀態下降或消失。",
  };
}

export function buildMarketAlertEvents({
  coverageUniverseItems,
  dataContractItems,
  dataPipelineHealthItems,
  qualityCards,
  decisionFunnelStages,
  operatingKriItems,
  platformExceptionItems,
  slaEscalationItems,
  riskOwner,
  decisionApprover,
}: {
  coverageUniverseItems: CoverageUniverseAlertInput[];
  dataContractItems: DataContractAlertInput[];
  dataPipelineHealthItems: DataPipelineHealthAlertInput[];
  qualityCards: QualityCardAlertInput[];
  decisionFunnelStages: DecisionFunnelAlertInput[];
  operatingKriItems: OperatingKriAlertInput[];
  platformExceptionItems: PlatformExceptionAlertInput[];
  slaEscalationItems: SlaEscalationAlertInput[];
  riskOwner: string;
  decisionApprover: string;
}): MarketAlertEvent[] {
  const cleanRiskOwner = riskOwner.trim() || "風控";
  const cleanApprover = decisionApprover.trim() || "投委會";
  const coverageAlerts = coverageUniverseItems
    .filter((item) => item.status !== "pass")
    .map((item) => ({
      source: "可投資宇宙",
      title: item.label,
      status: item.status,
      priority: marketAlertPriorityFromStatus(item.status),
      owner: item.owner,
      evidence: `${item.count} / ${item.target}`,
      action: item.action,
    }));
  const contractAlerts = dataContractItems
    .filter((item) => item.status !== "pass")
    .map((item) => ({
      source: "資料合約",
      title: item.table,
      status: item.status,
      priority: marketAlertPriorityFromStatus(item.status),
      owner: item.owner,
      evidence: item.missingColumns.length ? `缺欄位 ${item.missingColumns.join(", ")}` : item.freshness,
      action: item.action,
    }));
  const pipelineAlerts = dataPipelineHealthItems
    .filter((item) => item.status !== "pass")
    .map((item) => ({
      source: "資料管線",
      title: item.label,
      status: item.status,
      priority: marketAlertPriorityFromStatus(item.status),
      owner: item.owner,
      evidence: item.value,
      action: item.action,
    }));
  const dataAlerts = qualityCards
    .filter((card) => card.status !== "strong" && card.status !== "neutral")
    .map((card) => {
      const status = qualityToExecutionStatus(card.status);

      return {
        source: "資料品質",
        title: card.label,
        status,
        priority: marketAlertPriorityFromStatus(status),
        owner: cleanRiskOwner,
        evidence: card.value,
        action: card.note,
      };
    });
  const funnelAlerts = decisionFunnelStages
    .filter((stage) => stage.status !== "pass")
    .map((stage) => ({
      source: "決策漏斗",
      title: stage.label,
      status: stage.status,
      priority: marketAlertPriorityFromStatus(stage.status),
      owner: stage.owner,
      evidence: `${stage.value} / ${stage.conversion}`,
      action: stage.note,
    }));
  const kriAlerts = operatingKriItems
    .filter((item) => item.status !== "pass")
    .map((item) => ({
      source: "營運 KRI",
      title: item.label,
      status: item.status,
      priority: marketAlertPriorityFromStatus(item.status),
      owner: item.owner,
      evidence: item.value,
      action: item.note,
    }));
  const slaAlerts = slaEscalationItems
    .filter((item) => item.tier !== "routine" || item.status !== "pass")
    .map((item) => ({
      source: "SLA 升級",
      title: item.trigger,
      status: item.status,
      priority: item.priority,
      owner: item.owner,
      evidence: `${slaEscalationTierLabel(item.tier)} / ${item.due}`,
      action: item.action,
    }));
  const exceptionAlerts = platformExceptionItems.map((item) => ({
    source: item.source,
    title: item.item,
    status: item.status,
    priority: item.priority,
    owner: item.owner || cleanApprover,
    evidence: item.evidence,
    action: item.nextAction,
  }));
  const priorityRank: Record<MarketAlertPriority, number> = { high: 0, medium: 1, low: 2 };
  const statusRank: Record<MarketAlertStatus, number> = { block: 0, watch: 1, pass: 2 };

  return [...coverageAlerts, ...contractAlerts, ...pipelineAlerts, ...dataAlerts, ...funnelAlerts, ...kriAlerts, ...slaAlerts, ...exceptionAlerts]
    .sort(
      (left, right) =>
        priorityRank[left.priority] - priorityRank[right.priority] ||
        statusRank[left.status] - statusRank[right.status] ||
        left.source.localeCompare(right.source, "zh-Hant") ||
        left.title.localeCompare(right.title, "zh-Hant"),
    )
    .slice(0, 30);
}

export function marketAlertCsv(rows: MarketAlertEvent[]) {
  const header = ["source", "title", "priority", "status", "owner", "evidence", "action"];
  const csvRows = rows.map((row) => [
    row.source,
    row.title,
    executionHandoffPriorityLabel(row.priority),
    executionReviewLabel(row.status),
    row.owner,
    row.evidence,
    row.action,
  ]);

  return [header, ...csvRows].map((row) => row.map(csvCell).join(",")).join("\n");
}

export function buildMarketAlertOwnerQueues(rows: MarketAlertEvent[]): MarketAlertOwnerQueue[] {
  const groups = rows.reduce<Record<string, MarketAlertEvent[]>>((accumulator, row) => {
    const owner = row.owner.trim() || "未分派";
    accumulator[owner] = [...(accumulator[owner] ?? []), row];
    return accumulator;
  }, {});
  const priorityRank: Record<MarketAlertPriority, number> = { high: 0, medium: 1, low: 2 };
  const statusRank: Record<MarketAlertStatus, number> = { block: 0, watch: 1, pass: 2 };

  return Object.entries(groups)
    .map(([owner, events]) => {
      const sortedEvents = [...events].sort(
        (left, right) =>
          priorityRank[left.priority] - priorityRank[right.priority] ||
          statusRank[left.status] - statusRank[right.status],
      );
      const sourceCount = events.reduce<Record<string, number>>((accumulator, event) => {
        accumulator[event.source] = (accumulator[event.source] ?? 0) + 1;
        return accumulator;
      }, {});
      const topSource = Object.entries(sourceCount).sort((left, right) => right[1] - left[1])[0]?.[0] ?? "--";

      return {
        owner,
        status: marketAlertStatusFromEvents(events),
        priority: marketAlertPriorityFromEvents(events),
        total: events.length,
        high: events.filter((event) => event.priority === "high").length,
        medium: events.filter((event) => event.priority === "medium").length,
        low: events.filter((event) => event.priority === "low").length,
        block: events.filter((event) => event.status === "block").length,
        watch: events.filter((event) => event.status === "watch").length,
        pass: events.filter((event) => event.status === "pass").length,
        topSource,
        nextAction: sortedEvents[0]?.action ?? "維持監控",
      };
    })
    .sort(
      (left, right) =>
        priorityRank[left.priority] - priorityRank[right.priority] ||
        statusRank[left.status] - statusRank[right.status] ||
        right.total - left.total ||
        left.owner.localeCompare(right.owner, "zh-Hant"),
    )
    .slice(0, 12);
}

export function marketAlertOwnerQueueCsv(rows: MarketAlertOwnerQueue[]) {
  const header = [
    "owner",
    "priority",
    "status",
    "total",
    "high",
    "medium",
    "low",
    "block",
    "watch",
    "pass",
    "top_source",
    "next_action",
  ];
  const csvRows = rows.map((row) => [
    row.owner,
    executionHandoffPriorityLabel(row.priority),
    executionReviewLabel(row.status),
    row.total,
    row.high,
    row.medium,
    row.low,
    row.block,
    row.watch,
    row.pass,
    row.topSource,
    row.nextAction,
  ]);

  return [header, ...csvRows].map((row) => row.map(csvCell).join(",")).join("\n");
}

export function buildMarketAlertRunbookItems(rows: MarketAlertEvent[]): MarketAlertRunbookItem[] {
  const priorityRank: Record<MarketAlertPriority, number> = { high: 0, medium: 1, low: 2 };
  const statusRank: Record<MarketAlertStatus, number> = { block: 0, watch: 1, pass: 2 };

  return rows
    .map((row) => {
      const template = runbookTemplateForSource(row.source);
      const escalation =
        row.status === "block"
          ? "若 T+0 無法解除，升級給決策負責人並暫停相關模型輸出。"
          : row.priority === "medium"
            ? "若 T+1 仍未解除，排入每日站會並指定修復時間。"
            : "若連續兩次週檢仍存在，轉為觀察項。";

      return {
        source: row.source,
        title: row.title,
        status: row.status,
        priority: row.priority,
        owner: row.owner,
        deadline: marketAlertDeadline(row.priority, row.status),
        trigger: row.evidence,
        diagnose: template.diagnose,
        resolve: `${template.resolve} 目前動作：${row.action}`,
        verify: template.verify,
        escalation,
      };
    })
    .sort(
      (left, right) =>
        priorityRank[left.priority] - priorityRank[right.priority] ||
        statusRank[left.status] - statusRank[right.status] ||
        left.owner.localeCompare(right.owner, "zh-Hant") ||
        left.title.localeCompare(right.title, "zh-Hant"),
    )
    .slice(0, 18);
}

export function marketAlertRunbookCsv(rows: MarketAlertRunbookItem[]) {
  const header = [
    "source",
    "title",
    "priority",
    "status",
    "owner",
    "deadline",
    "trigger",
    "diagnose",
    "resolve",
    "verify",
    "escalation",
  ];
  const csvRows = rows.map((row) => [
    row.source,
    row.title,
    executionHandoffPriorityLabel(row.priority),
    executionReviewLabel(row.status),
    row.owner,
    row.deadline,
    row.trigger,
    row.diagnose,
    row.resolve,
    row.verify,
    row.escalation,
  ]);

  return [header, ...csvRows].map((row) => row.map(csvCell).join(",")).join("\n");
}

export function buildMarketAlertCommandSummary({
  events,
  ownerQueues,
  runbookItems,
}: {
  events: MarketAlertEvent[];
  ownerQueues: MarketAlertOwnerQueue[];
  runbookItems: MarketAlertRunbookItem[];
}): MarketAlertCommandSummary {
  const status = events.length ? marketAlertStatusFromEvents(events) : "pass";
  const priority = events.length ? marketAlertPriorityFromEvents(events) : "low";
  const blockCount = events.filter((event) => event.status === "block").length;
  const watchCount = events.filter((event) => event.status === "watch").length;
  const highPriorityCount = events.filter((event) => event.priority === "high").length;
  const focusQueue = ownerQueues[0];
  const focusRunbook = runbookItems[0];
  const focusEvent = events[0];
  const releaseGate = blockCount ? "暫停放行" : watchCount ? "人工覆核" : "可放行";
  const operatingMode = blockCount ? "Incident" : watchCount ? "Supervision" : "Normal";
  const headline = blockCount
    ? `${blockCount} 個阻塞項，先處理 ${focusQueue?.owner ?? focusEvent?.owner ?? "未分派"}`
    : watchCount
      ? `${watchCount} 個觀察項，今日需人工覆核`
      : "目前沒有阻塞投資流程的市場警示";

  return {
    status,
    priority,
    operatingMode,
    releaseGate,
    headline,
    blockedFlow: blockCount ? focusEvent?.source ?? "未定位" : "未阻塞",
    focusOwner: focusQueue?.owner ?? focusEvent?.owner ?? "未分派",
    focusSource: focusQueue?.topSource ?? focusEvent?.source ?? "--",
    immediateAction: focusRunbook?.resolve ?? focusEvent?.action ?? "維持例行監控",
    nextReview: blockCount ? "今日盤中復核" : watchCount ? "T+1 收盤前復核" : "週檢查",
    totalAlerts: events.length,
    highPriorityCount,
    blockCount,
    watchCount,
    ownerCount: ownerQueues.length,
    runbookCount: runbookItems.length,
  };
}

export function marketAlertCommandSummaryCsv(summary: MarketAlertCommandSummary) {
  const rows = [
    ["field", "value"],
    ["status", executionReviewLabel(summary.status)],
    ["priority", executionHandoffPriorityLabel(summary.priority)],
    ["operating_mode", summary.operatingMode],
    ["release_gate", summary.releaseGate],
    ["headline", summary.headline],
    ["blocked_flow", summary.blockedFlow],
    ["focus_owner", summary.focusOwner],
    ["focus_source", summary.focusSource],
    ["immediate_action", summary.immediateAction],
    ["next_review", summary.nextReview],
    ["total_alerts", summary.totalAlerts],
    ["high_priority_count", summary.highPriorityCount],
    ["block_count", summary.blockCount],
    ["watch_count", summary.watchCount],
    ["owner_count", summary.ownerCount],
    ["runbook_count", summary.runbookCount],
  ];

  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
}
