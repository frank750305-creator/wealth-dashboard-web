import {
  platformCommandCategoryLabel,
  platformCommandPriorityLabel,
  platformCommandStatusLabel,
  type PlatformCommandCategory,
  type PlatformCommandPriority,
  type PlatformCommandSearchItem,
} from "@/lib/platformCommandSearch";

export type PlatformCommandTriageItem = {
  id: string;
  owner: string;
  terminalRoute: string;
  category: PlatformCommandCategory;
  priority: PlatformCommandPriority;
  status: PlatformCommandSearchItem["status"];
  commandCount: number;
  criticalCount: number;
  highCount: number;
  blockCount: number;
  watchCount: number;
  leadCommand: string;
  leadTitle: string;
  leadMetric: string;
  escalation: string;
  runbook: string;
  expectedOutput: string;
  nextAction: string;
};

export type PlatformCommandTriageSummary = {
  status: PlatformCommandSearchItem["status"];
  routeCount: number;
  ownerCount: number;
  criticalRouteCount: number;
  highRouteCount: number;
  blockRouteCount: number;
  watchRouteCount: number;
  commandCount: number;
};

function csvCell(value: unknown) {
  const stringValue = String(value ?? "");
  if (/[",\n]/.test(stringValue)) return `"${stringValue.replaceAll('"', '""')}"`;
  return stringValue;
}

function priorityRank(priority: PlatformCommandPriority) {
  if (priority === "critical") return 4;
  if (priority === "high") return 3;
  if (priority === "medium") return 2;
  return 1;
}

function statusRank(status: PlatformCommandSearchItem["status"]) {
  if (status === "block") return 3;
  if (status === "watch") return 2;
  return 1;
}

function rollupPriority(items: PlatformCommandSearchItem[]): PlatformCommandPriority {
  return items.reduce(
    (current, item) => (priorityRank(item.priority) > priorityRank(current) ? item.priority : current),
    "low" as PlatformCommandPriority,
  );
}

function rollupStatus(items: PlatformCommandSearchItem[]): PlatformCommandSearchItem["status"] {
  return items.reduce(
    (current, item) => (statusRank(item.status) > statusRank(current) ? item.status : current),
    "pass" as PlatformCommandSearchItem["status"],
  );
}

function leadCommand(items: PlatformCommandSearchItem[]) {
  return [...items].sort(
    (left, right) =>
      priorityRank(right.priority) - priorityRank(left.priority) ||
      statusRank(right.status) - statusRank(left.status) ||
      left.title.localeCompare(right.title, "zh-Hant"),
  )[0];
}

export function buildPlatformCommandTriageItems(items: PlatformCommandSearchItem[]): PlatformCommandTriageItem[] {
  const groups = new Map<string, PlatformCommandSearchItem[]>();

  for (const item of items) {
    const key = `${item.owner}::${item.terminalRoute}`;
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }

  return Array.from(groups.entries())
    .map(([id, groupItems]) => {
      const lead = leadCommand(groupItems);
      const priority = rollupPriority(groupItems);
      const status = rollupStatus(groupItems);

      return {
        id,
        owner: lead.owner,
        terminalRoute: lead.terminalRoute,
        category: lead.category,
        priority,
        status,
        commandCount: groupItems.length,
        criticalCount: groupItems.filter((item) => item.priority === "critical").length,
        highCount: groupItems.filter((item) => item.priority === "high").length,
        blockCount: groupItems.filter((item) => item.status === "block").length,
        watchCount: groupItems.filter((item) => item.status === "watch").length,
        leadCommand: lead.command,
        leadTitle: lead.title,
        leadMetric: lead.metric,
        escalation: lead.escalation,
        runbook: lead.runbook,
        expectedOutput: lead.expectedOutput,
        nextAction: lead.nextAction,
      };
    })
    .sort(
      (left, right) =>
        priorityRank(right.priority) - priorityRank(left.priority) ||
        statusRank(right.status) - statusRank(left.status) ||
        right.commandCount - left.commandCount ||
        left.owner.localeCompare(right.owner, "zh-Hant"),
    );
}

export function summarizePlatformCommandTriage(items: PlatformCommandTriageItem[]): PlatformCommandTriageSummary {
  return {
    status: rollupStatus(
      items.map((item) => ({
        status: item.status,
        priority: item.priority,
      }) as PlatformCommandSearchItem),
    ),
    routeCount: items.length,
    ownerCount: new Set(items.map((item) => item.owner)).size,
    criticalRouteCount: items.filter((item) => item.priority === "critical").length,
    highRouteCount: items.filter((item) => item.priority === "high").length,
    blockRouteCount: items.filter((item) => item.status === "block").length,
    watchRouteCount: items.filter((item) => item.status === "watch").length,
    commandCount: items.reduce((sum, item) => sum + item.commandCount, 0),
  };
}

export function platformCommandTriageCsv(items: PlatformCommandTriageItem[]) {
  const header = [
    "owner",
    "terminal_route",
    "category",
    "priority",
    "status",
    "command_count",
    "critical_count",
    "high_count",
    "block_count",
    "watch_count",
    "lead_command",
    "lead_title",
    "lead_metric",
    "escalation",
    "runbook",
    "expected_output",
    "next_action",
  ];
  const rows = items.map((item) => [
    item.owner,
    item.terminalRoute,
    platformCommandCategoryLabel(item.category),
    platformCommandPriorityLabel(item.priority),
    platformCommandStatusLabel(item.status),
    item.commandCount,
    item.criticalCount,
    item.highCount,
    item.blockCount,
    item.watchCount,
    item.leadCommand,
    item.leadTitle,
    item.leadMetric,
    item.escalation,
    item.runbook,
    item.expectedOutput,
    item.nextAction,
  ]);

  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}
