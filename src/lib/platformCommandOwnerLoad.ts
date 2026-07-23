import {
  type PlatformCommandSlaItem,
  type PlatformCommandSlaState,
} from "@/lib/platformCommandSla";
import {
  platformCommandPriorityLabel,
  platformCommandStatusLabel,
  type PlatformCommandPriority,
} from "@/lib/platformCommandSearch";

export type PlatformCommandOwnerLoadState = "overloaded" | "strained" | "balanced" | "clear";

export type PlatformCommandOwnerLoadItem = {
  owner: string;
  loadState: PlatformCommandOwnerLoadState;
  priority: PlatformCommandPriority;
  status: PlatformCommandSlaItem["status"];
  commandCount: number;
  breachCount: number;
  urgentCount: number;
  watchCount: number;
  onTrackCount: number;
  routeCount: number;
  loadScore: number;
  leadCommand: string;
  leadRoute: string;
  responseClock: string;
  escalation: string;
  handoffNote: string;
  nextAction: string;
};

export type PlatformCommandOwnerLoadSummary = {
  status: PlatformCommandSlaItem["status"];
  ownerCount: number;
  overloadedCount: number;
  strainedCount: number;
  balancedCount: number;
  clearCount: number;
  breachCount: number;
  urgentCount: number;
  commandCount: number;
  topOwner: string;
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

function statusRank(status: PlatformCommandSlaItem["status"]) {
  if (status === "block") return 3;
  if (status === "watch") return 2;
  return 1;
}

function stateRank(state: PlatformCommandSlaState) {
  if (state === "breach") return 4;
  if (state === "urgent") return 3;
  if (state === "watch") return 2;
  return 1;
}

function rollupPriority(items: PlatformCommandSlaItem[]): PlatformCommandPriority {
  return items.reduce(
    (current, item) => (priorityRank(item.priority) > priorityRank(current) ? item.priority : current),
    "low" as PlatformCommandPriority,
  );
}

function rollupStatus(items: PlatformCommandSlaItem[]): PlatformCommandSlaItem["status"] {
  return items.reduce(
    (current, item) => (statusRank(item.status) > statusRank(current) ? item.status : current),
    "pass" as PlatformCommandSlaItem["status"],
  );
}

function leadItem(items: PlatformCommandSlaItem[]) {
  return [...items].sort(
    (left, right) =>
      stateRank(right.slaState) - stateRank(left.slaState) ||
      priorityRank(right.priority) - priorityRank(left.priority) ||
      left.command.localeCompare(right.command, "zh-Hant"),
  )[0];
}

function loadStateFor(score: number): PlatformCommandOwnerLoadState {
  if (score >= 12) return "overloaded";
  if (score >= 7) return "strained";
  if (score >= 3) return "balanced";
  return "clear";
}

function loadStateLabel(state: PlatformCommandOwnerLoadState) {
  if (state === "overloaded") return "Overloaded";
  if (state === "strained") return "Strained";
  if (state === "balanced") return "Balanced";
  return "Clear";
}

export function platformCommandOwnerLoadStateLabel(state: PlatformCommandOwnerLoadState) {
  return loadStateLabel(state);
}

function handoffNoteFor(state: PlatformCommandOwnerLoadState, owner: string, breachCount: number, urgentCount: number) {
  if (state === "overloaded") return `${owner} 需立即分派副 owner，先處理 ${breachCount} 個 breach`;
  if (state === "strained") return `${owner} 需保留今日處理窗口，避免 ${urgentCount} 個 urgent 轉 breach`;
  if (state === "balanced") return `${owner} 可按現有節奏處理，週會追蹤即可`;
  return `${owner} 無明顯負載壓力，可支援其他 owner`;
}

export function buildPlatformCommandOwnerLoadItems(items: PlatformCommandSlaItem[]): PlatformCommandOwnerLoadItem[] {
  const groups = new Map<string, PlatformCommandSlaItem[]>();

  for (const item of items) {
    groups.set(item.owner, [...(groups.get(item.owner) ?? []), item]);
  }

  return Array.from(groups.entries())
    .map(([owner, ownerItems]) => {
      const breachCount = ownerItems.filter((item) => item.slaState === "breach").length;
      const urgentCount = ownerItems.filter((item) => item.slaState === "urgent").length;
      const watchCount = ownerItems.filter((item) => item.slaState === "watch").length;
      const onTrackCount = ownerItems.filter((item) => item.slaState === "on_track").length;
      const loadScore = breachCount * 5 + urgentCount * 3 + watchCount + Math.ceil(onTrackCount / 4);
      const loadState = loadStateFor(loadScore);
      const lead = leadItem(ownerItems);

      return {
        owner,
        loadState,
        priority: rollupPriority(ownerItems),
        status: rollupStatus(ownerItems),
        commandCount: ownerItems.length,
        breachCount,
        urgentCount,
        watchCount,
        onTrackCount,
        routeCount: new Set(ownerItems.map((item) => item.terminalRoute)).size,
        loadScore,
        leadCommand: lead.command,
        leadRoute: lead.terminalRoute,
        responseClock: lead.responseClock,
        escalation: lead.escalation,
        handoffNote: handoffNoteFor(loadState, owner, breachCount, urgentCount),
        nextAction: lead.nextAction,
      };
    })
    .sort(
      (left, right) =>
        right.loadScore - left.loadScore ||
        statusRank(right.status) - statusRank(left.status) ||
        priorityRank(right.priority) - priorityRank(left.priority) ||
        left.owner.localeCompare(right.owner, "zh-Hant"),
    );
}

export function summarizePlatformCommandOwnerLoad(items: PlatformCommandOwnerLoadItem[]): PlatformCommandOwnerLoadSummary {
  const overloadedCount = items.filter((item) => item.loadState === "overloaded").length;
  const strainedCount = items.filter((item) => item.loadState === "strained").length;
  const breachCount = items.reduce((sum, item) => sum + item.breachCount, 0);
  const urgentCount = items.reduce((sum, item) => sum + item.urgentCount, 0);

  return {
    status: overloadedCount > 0 || breachCount > 0 ? "block" : strainedCount > 0 || urgentCount > 0 ? "watch" : "pass",
    ownerCount: items.length,
    overloadedCount,
    strainedCount,
    balancedCount: items.filter((item) => item.loadState === "balanced").length,
    clearCount: items.filter((item) => item.loadState === "clear").length,
    breachCount,
    urgentCount,
    commandCount: items.reduce((sum, item) => sum + item.commandCount, 0),
    topOwner: items[0]?.owner ?? "--",
  };
}

export function platformCommandOwnerLoadCsv(items: PlatformCommandOwnerLoadItem[]) {
  const header = [
    "owner",
    "load_state",
    "priority",
    "status",
    "command_count",
    "breach_count",
    "urgent_count",
    "watch_count",
    "on_track_count",
    "route_count",
    "load_score",
    "lead_command",
    "lead_route",
    "response_clock",
    "escalation",
    "handoff_note",
    "next_action",
  ];
  const rows = items.map((item) => [
    item.owner,
    loadStateLabel(item.loadState),
    platformCommandPriorityLabel(item.priority),
    platformCommandStatusLabel(item.status),
    item.commandCount,
    item.breachCount,
    item.urgentCount,
    item.watchCount,
    item.onTrackCount,
    item.routeCount,
    item.loadScore,
    item.leadCommand,
    item.leadRoute,
    item.responseClock,
    item.escalation,
    item.handoffNote,
    item.nextAction,
  ]);

  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}
