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
