import {
  platformCommandBoardPackStateLabel,
  platformCommandBoardSignalLabel,
  type PlatformCommandBoardPackItem,
  type PlatformCommandBoardPackState,
  type PlatformCommandBoardSignal,
} from "@/lib/platformCommandBoardPack";
import {
  platformCommandExecutiveSignalLabel,
  platformCommandManagementStateLabel,
  type PlatformCommandExecutiveSignal,
  type PlatformCommandManagementState,
} from "@/lib/platformCommandManagementOverview";
import {
  platformCommandResidualRiskLabel,
  type PlatformCommandResidualRisk,
} from "@/lib/platformCommandClosure";
import { platformCommandStatusLabel } from "@/lib/platformCommandSearch";

export type PlatformCommandControlTowerState =
  | "halted"
  | "war_room"
  | "executive_review"
  | "operating_clear";
export type PlatformCommandControlTowerSignal = "stop" | "focus" | "scale";

export type PlatformCommandOperatingControlTowerItem = {
  controlId: string;
  boardPackId: string;
  overviewId: string;
  decisionId: string;
  owner: string;
  controlOwner: string;
  controlState: PlatformCommandControlTowerState;
  controlSignal: PlatformCommandControlTowerSignal;
  boardPackState: PlatformCommandBoardPackState;
  boardSignal: PlatformCommandBoardSignal;
  managementState: PlatformCommandManagementState;
  executiveSignal: PlatformCommandExecutiveSignal;
  status: PlatformCommandBoardPackItem["status"];
  residualRisk: PlatformCommandResidualRisk;
  readinessScore: number;
  sourceRoute: string;
  buyerSegment: string;
  commandNarrative: string;
  executivePriority: string;
  operatingCommand: string;
  dataCommand: string;
  revenueCommand: string;
  customerCommand: string;
  riskCommand: string;
  capitalCommand: string;
  controlCadence: string;
  decisionGate: string;
  nextAction: string;
};

export type PlatformCommandOperatingControlTowerSummary = {
  status: PlatformCommandBoardPackItem["status"];
  itemCount: number;
  haltedCount: number;
  warRoomCount: number;
  executiveReviewCount: number;
  operatingClearCount: number;
  stopCount: number;
  focusCount: number;
  scaleCount: number;
  averageReadinessScore: number;
  platformDecision: string;
};

function csvCell(value: unknown) {
  const stringValue = String(value ?? "");
  if (/[",\n]/.test(stringValue)) return `"${stringValue.replaceAll('"', '""')}"`;
  return stringValue;
}

function controlStateFor(item: PlatformCommandBoardPackItem): PlatformCommandControlTowerState {
  if (item.boardPackState === "blocked" || item.boardSignal === "hold" || item.status === "block") {
    return "halted";
  }
  if (item.boardPackState === "committee_review") return "war_room";
  if (item.boardPackState === "board_draft" || item.boardSignal === "disclose") return "executive_review";
  return "operating_clear";
}

function controlSignalFor(state: PlatformCommandControlTowerState): PlatformCommandControlTowerSignal {
  if (state === "halted") return "stop";
  if (state === "war_room" || state === "executive_review") return "focus";
  return "scale";
}

export function platformCommandControlTowerStateLabel(state: PlatformCommandControlTowerState) {
  if (state === "halted") return "Halted";
  if (state === "war_room") return "War room";
  if (state === "executive_review") return "Executive review";
  return "Operating clear";
}

export function platformCommandControlTowerSignalLabel(signal: PlatformCommandControlTowerSignal) {
  if (signal === "stop") return "Stop";
  if (signal === "focus") return "Focus";
  return "Scale";
}

function commandNarrativeFor(
  item: PlatformCommandBoardPackItem,
  signal: PlatformCommandControlTowerSignal,
) {
  if (signal === "stop") return `平台總控暫停：${item.riskDisclosure}`;
  if (signal === "focus") return `平台總控聚焦：${item.strategicDecision}`;
  return `平台總控可放大：${item.revenueStory}`;
}

function executivePriorityFor(
  item: PlatformCommandBoardPackItem,
  state: PlatformCommandControlTowerState,
) {
  if (state === "halted") return `CEO 優先排除阻塞：${item.decisionGate}`;
  if (state === "war_room") return `進入作戰室：${item.governanceNote}`;
  if (state === "executive_review") return `管理層複核：${item.appendixEvidence}`;
  return `管理層可批准平台節奏：${item.strategicDecision}`;
}

function operatingCommandFor(
  item: PlatformCommandBoardPackItem,
  state: PlatformCommandControlTowerState,
) {
  if (state === "halted") return `停止營運放量：${item.operatingKpi}`;
  if (state === "war_room") return `每日追蹤營運修復：${item.operatingKpi}`;
  if (state === "executive_review") return `週會檢查營運 KPI：${item.operatingKpi}`;
  return `轉入標準營運節奏：${item.operatingKpi}`;
}

function dataCommandFor(item: PlatformCommandBoardPackItem, signal: PlatformCommandControlTowerSignal) {
  if (signal === "stop") return `資料證據不足，不進 clean dashboard：${item.appendixEvidence}`;
  if (signal === "focus") return `補齊資料證據與風險註記：${item.appendixEvidence}`;
  return `資料證據可作為平台總控底稿：${item.appendixEvidence}`;
}

function revenueCommandFor(item: PlatformCommandBoardPackItem, signal: PlatformCommandControlTowerSignal) {
  if (signal === "stop") return `營收不可上修：${item.revenueStory}`;
  if (signal === "focus") return `營收維持觀察：${item.revenueStory}`;
  return `營收可進 forecast 與擴張視圖：${item.revenueStory}`;
}

function customerCommandFor(item: PlatformCommandBoardPackItem, signal: PlatformCommandControlTowerSignal) {
  if (signal === "stop") return `客戶健康需修復：${item.customerStory}`;
  if (signal === "focus") return `客戶健康需 QBR 或價值證明：${item.customerStory}`;
  return `客戶健康可支撐續約與擴張：${item.customerStory}`;
}

function riskCommandFor(item: PlatformCommandBoardPackItem, signal: PlatformCommandControlTowerSignal) {
  if (signal === "stop") return `重大風險直接升級：${item.riskDisclosure}`;
  if (signal === "focus") return `風險需揭露後才能放量：${item.riskDisclosure}`;
  return `風險維持標準揭露：${platformCommandResidualRiskLabel(item.residualRisk)}`;
}

function capitalCommandFor(item: PlatformCommandBoardPackItem, signal: PlatformCommandControlTowerSignal) {
  if (signal === "stop") return "不追加資源，不批准擴張";
  if (signal === "focus") return `條件式資源要求：${item.capitalAsk}`;
  return `可提出資源與市場擴張要求：${item.capitalAsk}`;
}

function controlCadenceFor(state: PlatformCommandControlTowerState) {
  if (state === "halted") return "每日 09:00 阻塞會";
  if (state === "war_room") return "每日作戰室";
  if (state === "executive_review") return "每週管理層複核";
  return "月度 CEO / Board review";
}

function decisionGateFor(
  item: PlatformCommandBoardPackItem,
  state: PlatformCommandControlTowerState,
) {
  if (state === "halted") return `不得進平台總控 clean view：${item.decisionGate}`;
  if (state === "war_room") return `解除作戰室條件：${item.nextAction}`;
  if (state === "executive_review") return `完成管理層複核：${item.decisionGate}`;
  return "可進平台總控、董事會決策與商業化放量";
}

function nextActionFor(
  item: PlatformCommandBoardPackItem,
  state: PlatformCommandControlTowerState,
) {
  if (state === "halted") return `先解除平台總控阻塞：${item.nextAction}`;
  if (state === "war_room") return `派給作戰室 owner：${item.boardOwner}`;
  if (state === "executive_review") return `整理 CEO review 包：${item.appendixEvidence}`;
  return "把平台總控訊號輸出給商業化、董事會與客戶 readout";
}

function stateRank(state: PlatformCommandControlTowerState) {
  if (state === "halted") return 4;
  if (state === "war_room") return 3;
  if (state === "executive_review") return 2;
  return 1;
}

export function buildPlatformCommandOperatingControlTowerItems(
  items: PlatformCommandBoardPackItem[],
): PlatformCommandOperatingControlTowerItem[] {
  return items
    .map((item, index) => {
      const controlState = controlStateFor(item);
      const controlSignal = controlSignalFor(controlState);

      return {
        controlId: `CTL-${String(index + 1).padStart(3, "0")}-${item.decisionId}`,
        boardPackId: item.boardPackId,
        overviewId: item.overviewId,
        decisionId: item.decisionId,
        owner: item.owner,
        controlOwner: item.boardOwner,
        controlState,
        controlSignal,
        boardPackState: item.boardPackState,
        boardSignal: item.boardSignal,
        managementState: item.managementState,
        executiveSignal: item.executiveSignal,
        status: item.status,
        residualRisk: item.residualRisk,
        readinessScore: item.readinessScore,
        sourceRoute: item.sourceRoute,
        buyerSegment: item.buyerSegment,
        commandNarrative: commandNarrativeFor(item, controlSignal),
        executivePriority: executivePriorityFor(item, controlState),
        operatingCommand: operatingCommandFor(item, controlState),
        dataCommand: dataCommandFor(item, controlSignal),
        revenueCommand: revenueCommandFor(item, controlSignal),
        customerCommand: customerCommandFor(item, controlSignal),
        riskCommand: riskCommandFor(item, controlSignal),
        capitalCommand: capitalCommandFor(item, controlSignal),
        controlCadence: controlCadenceFor(controlState),
        decisionGate: decisionGateFor(item, controlState),
        nextAction: nextActionFor(item, controlState),
      };
    })
    .sort(
      (left, right) =>
        stateRank(right.controlState) - stateRank(left.controlState) ||
        left.readinessScore - right.readinessScore ||
        left.controlId.localeCompare(right.controlId, "zh-Hant"),
    );
}

export function summarizePlatformCommandOperatingControlTower(
  items: PlatformCommandOperatingControlTowerItem[],
): PlatformCommandOperatingControlTowerSummary {
  const haltedCount = items.filter((item) => item.controlState === "halted").length;
  const warRoomCount = items.filter((item) => item.controlState === "war_room").length;
  const executiveReviewCount = items.filter((item) => item.controlState === "executive_review").length;
  const stopCount = items.filter((item) => item.controlSignal === "stop").length;
  const focusCount = items.filter((item) => item.controlSignal === "focus").length;
  const averageReadinessScore = items.length
    ? Math.round(items.reduce((sum, item) => sum + item.readinessScore, 0) / items.length)
    : 0;

  return {
    status: stopCount > 0 ? "block" : focusCount > 0 ? "watch" : "pass",
    itemCount: items.length,
    haltedCount,
    warRoomCount,
    executiveReviewCount,
    operatingClearCount: items.filter((item) => item.controlState === "operating_clear").length,
    stopCount,
    focusCount,
    scaleCount: items.filter((item) => item.controlSignal === "scale").length,
    averageReadinessScore,
    platformDecision:
      stopCount > 0
        ? "停止放量，先解除平台阻塞"
        : focusCount > 0
          ? "條件式放量，管理層每週複核"
          : "可進 CEO / Board 平台總控",
  };
}

export function platformCommandOperatingControlTowerCsv(items: PlatformCommandOperatingControlTowerItem[]) {
  const header = [
    "control_id",
    "board_pack_id",
    "overview_id",
    "decision_id",
    "owner",
    "control_owner",
    "control_state",
    "control_signal",
    "board_pack_state",
    "board_signal",
    "management_state",
    "executive_signal",
    "status",
    "residual_risk",
    "readiness_score",
    "source_route",
    "buyer_segment",
    "command_narrative",
    "executive_priority",
    "operating_command",
    "data_command",
    "revenue_command",
    "customer_command",
    "risk_command",
    "capital_command",
    "control_cadence",
    "decision_gate",
    "next_action",
  ];
  const rows = items.map((item) => [
    item.controlId,
    item.boardPackId,
    item.overviewId,
    item.decisionId,
    item.owner,
    item.controlOwner,
    platformCommandControlTowerStateLabel(item.controlState),
    platformCommandControlTowerSignalLabel(item.controlSignal),
    platformCommandBoardPackStateLabel(item.boardPackState),
    platformCommandBoardSignalLabel(item.boardSignal),
    platformCommandManagementStateLabel(item.managementState),
    platformCommandExecutiveSignalLabel(item.executiveSignal),
    platformCommandStatusLabel(item.status),
    platformCommandResidualRiskLabel(item.residualRisk),
    item.readinessScore,
    item.sourceRoute,
    item.buyerSegment,
    item.commandNarrative,
    item.executivePriority,
    item.operatingCommand,
    item.dataCommand,
    item.revenueCommand,
    item.customerCommand,
    item.riskCommand,
    item.capitalCommand,
    item.controlCadence,
    item.decisionGate,
    item.nextAction,
  ]);

  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}
