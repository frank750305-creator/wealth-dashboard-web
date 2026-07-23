import {
  platformCommandOwnerLoadStateLabel,
  type PlatformCommandOwnerLoadItem,
  type PlatformCommandOwnerLoadState,
} from "@/lib/platformCommandOwnerLoad";
import {
  platformCommandPriorityLabel,
  platformCommandStatusLabel,
  type PlatformCommandPriority,
} from "@/lib/platformCommandSearch";

export type PlatformCommandHandoffState = "required" | "recommended" | "scheduled" | "standby";

export type PlatformCommandHandoffItem = {
  owner: string;
  deputyOwner: string;
  handoffState: PlatformCommandHandoffState;
  loadState: PlatformCommandOwnerLoadState;
  priority: PlatformCommandPriority;
  status: PlatformCommandOwnerLoadItem["status"];
  loadScore: number;
  commandCount: number;
  breachCount: number;
  urgentCount: number;
  sourceRoute: string;
  leadCommand: string;
  targetWindow: string;
  trigger: string;
  handoffScope: string;
  acceptanceCriteria: string;
  nextAction: string;
};

export type PlatformCommandHandoffSummary = {
  status: PlatformCommandOwnerLoadItem["status"];
  itemCount: number;
  requiredCount: number;
  recommendedCount: number;
  scheduledCount: number;
  standbyCount: number;
  overloadedCount: number;
  deputyPoolCount: number;
  nextHandoffWindow: string;
};

function csvCell(value: unknown) {
  const stringValue = String(value ?? "");
  if (/[",\n]/.test(stringValue)) return `"${stringValue.replaceAll('"', '""')}"`;
  return stringValue;
}

function handoffStateFor(item: PlatformCommandOwnerLoadItem): PlatformCommandHandoffState {
  if (item.loadState === "overloaded") return "required";
  if (item.loadState === "strained") return "recommended";
  if (item.loadState === "balanced") return "scheduled";
  return "standby";
}

export function platformCommandHandoffStateLabel(state: PlatformCommandHandoffState) {
  if (state === "required") return "Required";
  if (state === "recommended") return "Recommended";
  if (state === "scheduled") return "Scheduled";
  return "Standby";
}

function targetWindowFor(state: PlatformCommandHandoffState) {
  if (state === "required") return "今日內完成副 owner 指派";
  if (state === "recommended") return "本週內建立交接窗口";
  if (state === "scheduled") return "週會確認備援人選";
  return "可作為支援池";
}

function triggerFor(item: PlatformCommandOwnerLoadItem) {
  if (item.breachCount > 0) return `${item.breachCount} 個 breach 需拆分處理`;
  if (item.urgentCount > 0) return `${item.urgentCount} 個 urgent 需避免轉 breach`;
  if (item.loadScore >= 3) return `負載分數 ${item.loadScore}，需保留備援`;
  return "目前可支援其他 owner";
}

function scopeFor(item: PlatformCommandOwnerLoadItem) {
  if (item.loadState === "overloaded") return `先交接 ${item.leadRoute} / ${item.leadCommand}`;
  if (item.loadState === "strained") return `交接 urgent 命令的追蹤與回覆`;
  if (item.loadState === "balanced") return `建立備援 owner 與週會追蹤`;
  return `支援 breach 或 urgent owner`;
}

function acceptanceCriteriaFor(item: PlatformCommandOwnerLoadItem) {
  if (item.loadState === "overloaded") return "breach 降為 0，或副 owner 接手 lead command";
  if (item.loadState === "strained") return "urgent 沒有轉 breach，且 next action 有明確日期";
  if (item.loadState === "balanced") return "保留交接紀錄與備援名單";
  return "必要時可在 24 小時內接手";
}

function deputyFor(owner: string, items: PlatformCommandOwnerLoadItem[]) {
  const candidates = items
    .filter((item) => item.owner !== owner)
    .sort((left, right) => left.loadScore - right.loadScore || left.owner.localeCompare(right.owner, "zh-Hant"));
  const clearCandidate = candidates.find((item) => item.loadState === "clear");
  const balancedCandidate = candidates.find((item) => item.loadState === "balanced");
  const fallback = candidates[0];

  return clearCandidate?.owner ?? balancedCandidate?.owner ?? fallback?.owner ?? "待指派";
}

export function buildPlatformCommandHandoffItems(items: PlatformCommandOwnerLoadItem[]): PlatformCommandHandoffItem[] {
  return items
    .map((item) => {
      const handoffState = handoffStateFor(item);

      return {
        owner: item.owner,
        deputyOwner: handoffState === "standby" ? "支援池" : deputyFor(item.owner, items),
        handoffState,
        loadState: item.loadState,
        priority: item.priority,
        status: item.status,
        loadScore: item.loadScore,
        commandCount: item.commandCount,
        breachCount: item.breachCount,
        urgentCount: item.urgentCount,
        sourceRoute: item.leadRoute,
        leadCommand: item.leadCommand,
        targetWindow: targetWindowFor(handoffState),
        trigger: triggerFor(item),
        handoffScope: scopeFor(item),
        acceptanceCriteria: acceptanceCriteriaFor(item),
        nextAction: item.handoffNote,
      };
    })
    .sort(
      (left, right) =>
        right.loadScore - left.loadScore ||
        right.breachCount - left.breachCount ||
        right.urgentCount - left.urgentCount ||
        left.owner.localeCompare(right.owner, "zh-Hant"),
    );
}

export function summarizePlatformCommandHandoff(items: PlatformCommandHandoffItem[]): PlatformCommandHandoffSummary {
  const requiredCount = items.filter((item) => item.handoffState === "required").length;
  const recommendedCount = items.filter((item) => item.handoffState === "recommended").length;
  const scheduledCount = items.filter((item) => item.handoffState === "scheduled").length;

  return {
    status: requiredCount > 0 ? "block" : recommendedCount > 0 || scheduledCount > 0 ? "watch" : "pass",
    itemCount: items.length,
    requiredCount,
    recommendedCount,
    scheduledCount,
    standbyCount: items.filter((item) => item.handoffState === "standby").length,
    overloadedCount: items.filter((item) => item.loadState === "overloaded").length,
    deputyPoolCount: new Set(items.filter((item) => item.handoffState === "standby").map((item) => item.owner)).size,
    nextHandoffWindow: requiredCount > 0 ? "今日內" : recommendedCount > 0 ? "本週內" : scheduledCount > 0 ? "週會確認" : "待命",
  };
}

export function platformCommandHandoffCsv(items: PlatformCommandHandoffItem[]) {
  const header = [
    "owner",
    "deputy_owner",
    "handoff_state",
    "load_state",
    "priority",
    "status",
    "load_score",
    "command_count",
    "breach_count",
    "urgent_count",
    "source_route",
    "lead_command",
    "target_window",
    "trigger",
    "handoff_scope",
    "acceptance_criteria",
    "next_action",
  ];
  const rows = items.map((item) => [
    item.owner,
    item.deputyOwner,
    platformCommandHandoffStateLabel(item.handoffState),
    platformCommandOwnerLoadStateLabel(item.loadState),
    platformCommandPriorityLabel(item.priority),
    platformCommandStatusLabel(item.status),
    item.loadScore,
    item.commandCount,
    item.breachCount,
    item.urgentCount,
    item.sourceRoute,
    item.leadCommand,
    item.targetWindow,
    item.trigger,
    item.handoffScope,
    item.acceptanceCriteria,
    item.nextAction,
  ]);

  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}
