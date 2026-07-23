import {
  platformCommandCategoryLabel,
  platformCommandPriorityLabel,
  platformCommandStatusLabel,
  type PlatformCommandPriority,
  type PlatformCommandSearchItem,
} from "@/lib/platformCommandSearch";

export type PlatformCommandSlaState = "breach" | "urgent" | "watch" | "on_track";

export type PlatformCommandSlaItem = {
  id: string;
  command: string;
  title: string;
  owner: string;
  terminalRoute: string;
  category: PlatformCommandSearchItem["category"];
  priority: PlatformCommandPriority;
  status: PlatformCommandSearchItem["status"];
  slaState: PlatformCommandSlaState;
  targetWindow: string;
  responseClock: string;
  escalation: string;
  expectedOutput: string;
  nextAction: string;
};

export type PlatformCommandSlaSummary = {
  status: PlatformCommandSearchItem["status"];
  itemCount: number;
  breachCount: number;
  urgentCount: number;
  watchCount: number;
  onTrackCount: number;
  criticalCount: number;
  ownerCount: number;
  nextResponseWindow: string;
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

function slaStateFor(item: PlatformCommandSearchItem): PlatformCommandSlaState {
  if (item.status === "block" || item.priority === "critical") return "breach";
  if (item.status === "watch" || item.priority === "high") return "urgent";
  if (item.priority === "medium") return "watch";
  return "on_track";
}

function targetWindowFor(state: PlatformCommandSlaState) {
  if (state === "breach") return "4 小時內回覆 / 48 小時內處理";
  if (state === "urgent") return "24 小時內回覆 / 7 天內處理";
  if (state === "watch") return "本月 QBR 或下次批次";
  return "例行月檢";
}

function responseClockFor(state: PlatformCommandSlaState) {
  if (state === "breach") return "已進入升級時鐘";
  if (state === "urgent") return "啟動 24h response";
  if (state === "watch") return "排入月度改善";
  return "例行追蹤";
}

export function platformCommandSlaStateLabel(state: PlatformCommandSlaState) {
  if (state === "breach") return "Breach";
  if (state === "urgent") return "Urgent";
  if (state === "watch") return "Watch";
  return "On Track";
}

export function buildPlatformCommandSlaItems(items: PlatformCommandSearchItem[]): PlatformCommandSlaItem[] {
  return items
    .map((item) => {
      const slaState = slaStateFor(item);

      return {
        id: item.id,
        command: item.command,
        title: item.title,
        owner: item.owner,
        terminalRoute: item.terminalRoute,
        category: item.category,
        priority: item.priority,
        status: item.status,
        slaState,
        targetWindow: targetWindowFor(slaState),
        responseClock: responseClockFor(slaState),
        escalation: item.escalation,
        expectedOutput: item.expectedOutput,
        nextAction: item.nextAction,
      };
    })
    .sort(
      (left, right) =>
        statusRank(right.status) - statusRank(left.status) ||
        priorityRank(right.priority) - priorityRank(left.priority) ||
        left.terminalRoute.localeCompare(right.terminalRoute, "zh-Hant") ||
        left.title.localeCompare(right.title, "zh-Hant"),
    );
}

export function summarizePlatformCommandSla(items: PlatformCommandSlaItem[]): PlatformCommandSlaSummary {
  const breachCount = items.filter((item) => item.slaState === "breach").length;
  const urgentCount = items.filter((item) => item.slaState === "urgent").length;
  const watchCount = items.filter((item) => item.slaState === "watch").length;

  return {
    status: breachCount > 0 ? "block" : urgentCount > 0 || watchCount > 0 ? "watch" : "pass",
    itemCount: items.length,
    breachCount,
    urgentCount,
    watchCount,
    onTrackCount: items.filter((item) => item.slaState === "on_track").length,
    criticalCount: items.filter((item) => item.priority === "critical").length,
    ownerCount: new Set(items.map((item) => item.owner)).size,
    nextResponseWindow: breachCount > 0 ? "4 小時內" : urgentCount > 0 ? "24 小時內" : watchCount > 0 ? "本月 QBR" : "例行月檢",
  };
}

export function platformCommandSlaCsv(items: PlatformCommandSlaItem[]) {
  const header = [
    "command",
    "title",
    "owner",
    "terminal_route",
    "category",
    "priority",
    "status",
    "sla_state",
    "target_window",
    "response_clock",
    "escalation",
    "expected_output",
    "next_action",
  ];
  const rows = items.map((item) => [
    item.command,
    item.title,
    item.owner,
    item.terminalRoute,
    platformCommandCategoryLabel(item.category),
    platformCommandPriorityLabel(item.priority),
    platformCommandStatusLabel(item.status),
    platformCommandSlaStateLabel(item.slaState),
    item.targetWindow,
    item.responseClock,
    item.escalation,
    item.expectedOutput,
    item.nextAction,
  ]);

  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}
