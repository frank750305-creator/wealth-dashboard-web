import {
  platformCommandControlTowerSignalLabel,
  platformCommandControlTowerStateLabel,
  type PlatformCommandControlTowerSignal,
  type PlatformCommandControlTowerState,
  type PlatformCommandOperatingControlTowerItem,
} from "@/lib/platformCommandOperatingControlTower";
import {
  platformCommandResidualRiskLabel,
  type PlatformCommandResidualRisk,
} from "@/lib/platformCommandClosure";
import { platformCommandStatusLabel } from "@/lib/platformCommandSearch";

export type PlatformCommandCeoDecisionState =
  | "blocked_decision"
  | "repair_mandate"
  | "conditional_go"
  | "ceo_go";
export type PlatformCommandCeoDecisionSignal = "reject" | "condition" | "approve";

export type PlatformCommandCeoDecisionConsoleItem = {
  memoId: string;
  controlId: string;
  boardPackId: string;
  decisionId: string;
  owner: string;
  ceoOwner: string;
  ceoDecisionState: PlatformCommandCeoDecisionState;
  ceoDecisionSignal: PlatformCommandCeoDecisionSignal;
  controlState: PlatformCommandControlTowerState;
  controlSignal: PlatformCommandControlTowerSignal;
  status: PlatformCommandOperatingControlTowerItem["status"];
  residualRisk: PlatformCommandResidualRisk;
  readinessScore: number;
  sourceRoute: string;
  buyerSegment: string;
  agendaTitle: string;
  ceoDecision: string;
  decisionRationale: string;
  investmentPosture: string;
  revenuePosture: string;
  customerPosture: string;
  operatingMandate: string;
  riskMandate: string;
  boardMessage: string;
  investorMessage: string;
  followUpCadence: string;
  decisionGate: string;
  nextAction: string;
};

export type PlatformCommandCeoDecisionConsoleSummary = {
  status: PlatformCommandOperatingControlTowerItem["status"];
  itemCount: number;
  blockedDecisionCount: number;
  repairMandateCount: number;
  conditionalGoCount: number;
  ceoGoCount: number;
  rejectCount: number;
  conditionCount: number;
  approveCount: number;
  averageReadinessScore: number;
  ceoDecisionWindow: string;
};

function csvCell(value: unknown) {
  const stringValue = String(value ?? "");
  if (/[",\n]/.test(stringValue)) return `"${stringValue.replaceAll('"', '""')}"`;
  return stringValue;
}

function ceoDecisionStateFor(
  item: PlatformCommandOperatingControlTowerItem,
): PlatformCommandCeoDecisionState {
  if (item.controlState === "halted" || item.controlSignal === "stop" || item.status === "block") {
    return "blocked_decision";
  }
  if (item.controlState === "war_room") return "repair_mandate";
  if (item.controlState === "executive_review" || item.controlSignal === "focus") return "conditional_go";
  return "ceo_go";
}

function ceoDecisionSignalFor(state: PlatformCommandCeoDecisionState): PlatformCommandCeoDecisionSignal {
  if (state === "blocked_decision") return "reject";
  if (state === "repair_mandate" || state === "conditional_go") return "condition";
  return "approve";
}

export function platformCommandCeoDecisionStateLabel(state: PlatformCommandCeoDecisionState) {
  if (state === "blocked_decision") return "Blocked decision";
  if (state === "repair_mandate") return "Repair mandate";
  if (state === "conditional_go") return "Conditional go";
  return "CEO go";
}

export function platformCommandCeoDecisionSignalLabel(signal: PlatformCommandCeoDecisionSignal) {
  if (signal === "reject") return "Reject";
  if (signal === "condition") return "Condition";
  return "Approve";
}

function agendaTitleFor(
  item: PlatformCommandOperatingControlTowerItem,
  state: PlatformCommandCeoDecisionState,
) {
  if (state === "blocked_decision") return `阻塞決策：${item.decisionId}`;
  if (state === "repair_mandate") return `修復授權：${item.decisionId}`;
  if (state === "conditional_go") return `條件批准：${item.decisionId}`;
  return `CEO 批准放量：${item.decisionId}`;
}

function ceoDecisionFor(
  item: PlatformCommandOperatingControlTowerItem,
  signal: PlatformCommandCeoDecisionSignal,
) {
  if (signal === "reject") return `拒絕擴張與資源申請：${item.decisionGate}`;
  if (signal === "condition") return `條件批准，需補足管理層條件：${item.nextAction}`;
  return `批准進入平台放量與董事會 readout：${item.nextAction}`;
}

function decisionRationaleFor(
  item: PlatformCommandOperatingControlTowerItem,
  signal: PlatformCommandCeoDecisionSignal,
) {
  if (signal === "reject") return `理由：${item.riskCommand}`;
  if (signal === "condition") return `理由：${item.commandNarrative}`;
  return `理由：${item.commandNarrative}`;
}

function investmentPostureFor(
  item: PlatformCommandOperatingControlTowerItem,
  signal: PlatformCommandCeoDecisionSignal,
) {
  if (signal === "reject") return "不投入新增預算";
  if (signal === "condition") return `小額條件式投入：${item.capitalCommand}`;
  return `可投入擴張預算：${item.capitalCommand}`;
}

function revenuePostureFor(
  item: PlatformCommandOperatingControlTowerItem,
  signal: PlatformCommandCeoDecisionSignal,
) {
  if (signal === "reject") return `收入 forecast 不上修：${item.revenueCommand}`;
  if (signal === "condition") return `收入 forecast 條件式觀察：${item.revenueCommand}`;
  return `收入 forecast 可納入管理層目標：${item.revenueCommand}`;
}

function customerPostureFor(
  item: PlatformCommandOperatingControlTowerItem,
  signal: PlatformCommandCeoDecisionSignal,
) {
  if (signal === "reject") return `客戶不進擴張敘事：${item.customerCommand}`;
  if (signal === "condition") return `客戶擴張需 QBR 或價值驗證：${item.customerCommand}`;
  return `客戶可進續約與擴張敘事：${item.customerCommand}`;
}

function operatingMandateFor(
  item: PlatformCommandOperatingControlTowerItem,
  state: PlatformCommandCeoDecisionState,
) {
  if (state === "blocked_decision") return `CEO mandate：立即解除阻塞，${item.operatingCommand}`;
  if (state === "repair_mandate") return `CEO mandate：作戰室修復，${item.operatingCommand}`;
  if (state === "conditional_go") return `CEO mandate：條件式交付，${item.operatingCommand}`;
  return `CEO mandate：標準化放量，${item.operatingCommand}`;
}

function riskMandateFor(
  item: PlatformCommandOperatingControlTowerItem,
  signal: PlatformCommandCeoDecisionSignal,
) {
  if (signal === "reject") return `風險升級到 CEO：${item.riskCommand}`;
  if (signal === "condition") return `風險需揭露與追蹤：${item.riskCommand}`;
  return `風險維持標準監控：${platformCommandResidualRiskLabel(item.residualRisk)}`;
}

function boardMessageFor(
  item: PlatformCommandOperatingControlTowerItem,
  signal: PlatformCommandCeoDecisionSignal,
) {
  if (signal === "reject") return `董事會訊息：目前不批准，${item.decisionGate}`;
  if (signal === "condition") return `董事會訊息：條件式批准，${item.executivePriority}`;
  return `董事會訊息：可放量，${item.executivePriority}`;
}

function investorMessageFor(
  item: PlatformCommandOperatingControlTowerItem,
  signal: PlatformCommandCeoDecisionSignal,
) {
  if (signal === "reject") return "投資人訊息：不納入成長敘事";
  if (signal === "condition") return `投資人訊息：保守揭露，${item.dataCommand}`;
  return `投資人訊息：可納入平台成長敘事，${item.dataCommand}`;
}

function followUpCadenceFor(state: PlatformCommandCeoDecisionState) {
  if (state === "blocked_decision") return "每日 CEO blocker review";
  if (state === "repair_mandate") return "每日 war room update";
  if (state === "conditional_go") return "每週 CEO operating review";
  return "月度 CEO / Board pack";
}

function decisionGateFor(
  item: PlatformCommandOperatingControlTowerItem,
  state: PlatformCommandCeoDecisionState,
) {
  if (state === "blocked_decision") return `不得送 CEO clean decision：${item.decisionGate}`;
  if (state === "repair_mandate") return `完成修復 mandate：${item.nextAction}`;
  if (state === "conditional_go") return `完成條件批准條款：${item.decisionGate}`;
  return "可進 CEO 決策、董事會訊息與投資人敘事";
}

function nextActionFor(
  item: PlatformCommandOperatingControlTowerItem,
  state: PlatformCommandCeoDecisionState,
) {
  if (state === "blocked_decision") return `回到平台總控解除阻塞：${item.nextAction}`;
  if (state === "repair_mandate") return `由 ${item.controlOwner} 回報修復進度`;
  if (state === "conditional_go") return `整理條件批准清單：${item.executivePriority}`;
  return "輸出 CEO 決策包給董事會、商業化與客戶 readout";
}

function stateRank(state: PlatformCommandCeoDecisionState) {
  if (state === "blocked_decision") return 4;
  if (state === "repair_mandate") return 3;
  if (state === "conditional_go") return 2;
  return 1;
}

export function buildPlatformCommandCeoDecisionConsoleItems(
  items: PlatformCommandOperatingControlTowerItem[],
): PlatformCommandCeoDecisionConsoleItem[] {
  return items
    .map((item, index) => {
      const ceoDecisionState = ceoDecisionStateFor(item);
      const ceoDecisionSignal = ceoDecisionSignalFor(ceoDecisionState);

      return {
        memoId: `CEO-${String(index + 1).padStart(3, "0")}-${item.decisionId}`,
        controlId: item.controlId,
        boardPackId: item.boardPackId,
        decisionId: item.decisionId,
        owner: item.owner,
        ceoOwner: item.controlOwner,
        ceoDecisionState,
        ceoDecisionSignal,
        controlState: item.controlState,
        controlSignal: item.controlSignal,
        status: item.status,
        residualRisk: item.residualRisk,
        readinessScore: item.readinessScore,
        sourceRoute: item.sourceRoute,
        buyerSegment: item.buyerSegment,
        agendaTitle: agendaTitleFor(item, ceoDecisionState),
        ceoDecision: ceoDecisionFor(item, ceoDecisionSignal),
        decisionRationale: decisionRationaleFor(item, ceoDecisionSignal),
        investmentPosture: investmentPostureFor(item, ceoDecisionSignal),
        revenuePosture: revenuePostureFor(item, ceoDecisionSignal),
        customerPosture: customerPostureFor(item, ceoDecisionSignal),
        operatingMandate: operatingMandateFor(item, ceoDecisionState),
        riskMandate: riskMandateFor(item, ceoDecisionSignal),
        boardMessage: boardMessageFor(item, ceoDecisionSignal),
        investorMessage: investorMessageFor(item, ceoDecisionSignal),
        followUpCadence: followUpCadenceFor(ceoDecisionState),
        decisionGate: decisionGateFor(item, ceoDecisionState),
        nextAction: nextActionFor(item, ceoDecisionState),
      };
    })
    .sort(
      (left, right) =>
        stateRank(right.ceoDecisionState) - stateRank(left.ceoDecisionState) ||
        left.readinessScore - right.readinessScore ||
        left.memoId.localeCompare(right.memoId, "zh-Hant"),
    );
}

export function summarizePlatformCommandCeoDecisionConsole(
  items: PlatformCommandCeoDecisionConsoleItem[],
): PlatformCommandCeoDecisionConsoleSummary {
  const blockedDecisionCount = items.filter((item) => item.ceoDecisionState === "blocked_decision").length;
  const repairMandateCount = items.filter((item) => item.ceoDecisionState === "repair_mandate").length;
  const conditionalGoCount = items.filter((item) => item.ceoDecisionState === "conditional_go").length;
  const rejectCount = items.filter((item) => item.ceoDecisionSignal === "reject").length;
  const conditionCount = items.filter((item) => item.ceoDecisionSignal === "condition").length;
  const averageReadinessScore = items.length
    ? Math.round(items.reduce((sum, item) => sum + item.readinessScore, 0) / items.length)
    : 0;

  return {
    status: rejectCount > 0 ? "block" : conditionCount > 0 ? "watch" : "pass",
    itemCount: items.length,
    blockedDecisionCount,
    repairMandateCount,
    conditionalGoCount,
    ceoGoCount: items.filter((item) => item.ceoDecisionState === "ceo_go").length,
    rejectCount,
    conditionCount,
    approveCount: items.filter((item) => item.ceoDecisionSignal === "approve").length,
    averageReadinessScore,
    ceoDecisionWindow:
      rejectCount > 0
        ? "CEO blocker review"
        : conditionCount > 0
          ? "CEO conditional review"
          : "CEO approve window",
  };
}

export function platformCommandCeoDecisionConsoleCsv(items: PlatformCommandCeoDecisionConsoleItem[]) {
  const header = [
    "memo_id",
    "control_id",
    "board_pack_id",
    "decision_id",
    "owner",
    "ceo_owner",
    "ceo_decision_state",
    "ceo_decision_signal",
    "control_state",
    "control_signal",
    "status",
    "residual_risk",
    "readiness_score",
    "source_route",
    "buyer_segment",
    "agenda_title",
    "ceo_decision",
    "decision_rationale",
    "investment_posture",
    "revenue_posture",
    "customer_posture",
    "operating_mandate",
    "risk_mandate",
    "board_message",
    "investor_message",
    "follow_up_cadence",
    "decision_gate",
    "next_action",
  ];
  const rows = items.map((item) => [
    item.memoId,
    item.controlId,
    item.boardPackId,
    item.decisionId,
    item.owner,
    item.ceoOwner,
    platformCommandCeoDecisionStateLabel(item.ceoDecisionState),
    platformCommandCeoDecisionSignalLabel(item.ceoDecisionSignal),
    platformCommandControlTowerStateLabel(item.controlState),
    platformCommandControlTowerSignalLabel(item.controlSignal),
    platformCommandStatusLabel(item.status),
    platformCommandResidualRiskLabel(item.residualRisk),
    item.readinessScore,
    item.sourceRoute,
    item.buyerSegment,
    item.agendaTitle,
    item.ceoDecision,
    item.decisionRationale,
    item.investmentPosture,
    item.revenuePosture,
    item.customerPosture,
    item.operatingMandate,
    item.riskMandate,
    item.boardMessage,
    item.investorMessage,
    item.followUpCadence,
    item.decisionGate,
    item.nextAction,
  ]);

  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}
