import {
  platformCommandHandoffStateLabel,
  type PlatformCommandHandoffItem,
  type PlatformCommandHandoffState,
} from "@/lib/platformCommandHandoff";
import {
  platformCommandPriorityLabel,
  platformCommandStatusLabel,
  type PlatformCommandPriority,
} from "@/lib/platformCommandSearch";

export type PlatformCommandClosureState = "blocked" | "ready" | "monitor" | "closed";
export type PlatformCommandResidualRisk = "high" | "medium" | "low";

export type PlatformCommandClosureItem = {
  owner: string;
  deputyOwner: string;
  closureState: PlatformCommandClosureState;
  handoffState: PlatformCommandHandoffState;
  priority: PlatformCommandPriority;
  status: PlatformCommandHandoffItem["status"];
  loadScore: number;
  leadCommand: string;
  sourceRoute: string;
  closeGate: string;
  evidenceRequired: string;
  approvalOwner: string;
  residualRisk: PlatformCommandResidualRisk;
  closeWindow: string;
  nextAction: string;
};

export type PlatformCommandClosureSummary = {
  status: PlatformCommandHandoffItem["status"];
  itemCount: number;
  blockedCount: number;
  readyCount: number;
  monitorCount: number;
  closedCount: number;
  approvalOwnerCount: number;
  highResidualRiskCount: number;
  nextCloseWindow: string;
};

function csvCell(value: unknown) {
  const stringValue = String(value ?? "");
  if (/[",\n]/.test(stringValue)) return `"${stringValue.replaceAll('"', '""')}"`;
  return stringValue;
}

function closureStateFor(item: PlatformCommandHandoffItem): PlatformCommandClosureState {
  if (item.handoffState === "required" || item.status === "block") return "blocked";
  if (item.handoffState === "recommended") return "ready";
  if (item.handoffState === "scheduled") return "monitor";
  return "closed";
}

export function platformCommandClosureStateLabel(state: PlatformCommandClosureState) {
  if (state === "blocked") return "Blocked";
  if (state === "ready") return "Ready";
  if (state === "monitor") return "Monitor";
  return "Closed";
}

export function platformCommandResidualRiskLabel(risk: PlatformCommandResidualRisk) {
  if (risk === "high") return "高";
  if (risk === "medium") return "中";
  return "低";
}

function closeGateFor(state: PlatformCommandClosureState) {
  if (state === "blocked") return "breach 降為 0，副 owner 接手 lead command";
  if (state === "ready") return "urgent 不轉 breach，next action 有明確日期";
  if (state === "monitor") return "週會確認備援 owner 與追蹤紀錄";
  return "保留例行檢查紀錄";
}

function evidenceFor(state: PlatformCommandClosureState, item: PlatformCommandHandoffItem) {
  if (state === "blocked") {
    return `${item.leadCommand} 執行紀錄、交接 owner、升級處理結果`;
  }
  if (state === "ready") return "response clock、驗收標準、副 owner 確認";
  if (state === "monitor") return "週會追蹤紀錄、備援名單、未轉 breach 證據";
  return "月檢紀錄與支援池可用性";
}

function approvalOwnerFor(state: PlatformCommandClosureState, item: PlatformCommandHandoffItem) {
  if (state === "blocked") return `風控 + ${item.deputyOwner}`;
  if (state === "ready") return item.deputyOwner;
  return item.owner;
}

function residualRiskFor(state: PlatformCommandClosureState): PlatformCommandResidualRisk {
  if (state === "blocked") return "high";
  if (state === "ready") return "medium";
  return "low";
}

function closeWindowFor(state: PlatformCommandClosureState) {
  if (state === "blocked") return "48 小時內";
  if (state === "ready") return "7 天內";
  if (state === "monitor") return "本月內";
  return "例行月檢";
}

function nextActionFor(state: PlatformCommandClosureState, item: PlatformCommandHandoffItem) {
  if (state === "blocked") return `立即確認 ${item.deputyOwner} 是否接手 ${item.leadCommand}`;
  if (state === "ready") return `由 ${item.deputyOwner} 確認 ${item.acceptanceCriteria}`;
  if (state === "monitor") return `把 ${item.sourceRoute} 放入週會追蹤`;
  return "維持支援池待命";
}

export function buildPlatformCommandClosureItems(items: PlatformCommandHandoffItem[]): PlatformCommandClosureItem[] {
  return items
    .map((item) => {
      const closureState = closureStateFor(item);

      return {
        owner: item.owner,
        deputyOwner: item.deputyOwner,
        closureState,
        handoffState: item.handoffState,
        priority: item.priority,
        status: item.status,
        loadScore: item.loadScore,
        leadCommand: item.leadCommand,
        sourceRoute: item.sourceRoute,
        closeGate: closeGateFor(closureState),
        evidenceRequired: evidenceFor(closureState, item),
        approvalOwner: approvalOwnerFor(closureState, item),
        residualRisk: residualRiskFor(closureState),
        closeWindow: closeWindowFor(closureState),
        nextAction: nextActionFor(closureState, item),
      };
    })
    .sort(
      (left, right) =>
        closureRank(right.closureState) - closureRank(left.closureState) ||
        right.loadScore - left.loadScore ||
        left.owner.localeCompare(right.owner, "zh-Hant"),
    );
}

function closureRank(state: PlatformCommandClosureState) {
  if (state === "blocked") return 4;
  if (state === "ready") return 3;
  if (state === "monitor") return 2;
  return 1;
}

export function summarizePlatformCommandClosure(items: PlatformCommandClosureItem[]): PlatformCommandClosureSummary {
  const blockedCount = items.filter((item) => item.closureState === "blocked").length;
  const readyCount = items.filter((item) => item.closureState === "ready").length;
  const monitorCount = items.filter((item) => item.closureState === "monitor").length;
  const highResidualRiskCount = items.filter((item) => item.residualRisk === "high").length;

  return {
    status: blockedCount > 0 ? "block" : readyCount > 0 || monitorCount > 0 ? "watch" : "pass",
    itemCount: items.length,
    blockedCount,
    readyCount,
    monitorCount,
    closedCount: items.filter((item) => item.closureState === "closed").length,
    approvalOwnerCount: new Set(items.map((item) => item.approvalOwner)).size,
    highResidualRiskCount,
    nextCloseWindow: blockedCount > 0 ? "48 小時內" : readyCount > 0 ? "7 天內" : monitorCount > 0 ? "本月內" : "例行月檢",
  };
}

export function platformCommandClosureCsv(items: PlatformCommandClosureItem[]) {
  const header = [
    "owner",
    "deputy_owner",
    "closure_state",
    "handoff_state",
    "priority",
    "status",
    "load_score",
    "source_route",
    "lead_command",
    "close_gate",
    "evidence_required",
    "approval_owner",
    "residual_risk",
    "close_window",
    "next_action",
  ];
  const rows = items.map((item) => [
    item.owner,
    item.deputyOwner,
    platformCommandClosureStateLabel(item.closureState),
    platformCommandHandoffStateLabel(item.handoffState),
    platformCommandPriorityLabel(item.priority),
    platformCommandStatusLabel(item.status),
    item.loadScore,
    item.sourceRoute,
    item.leadCommand,
    item.closeGate,
    item.evidenceRequired,
    item.approvalOwner,
    platformCommandResidualRiskLabel(item.residualRisk),
    item.closeWindow,
    item.nextAction,
  ]);

  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}
