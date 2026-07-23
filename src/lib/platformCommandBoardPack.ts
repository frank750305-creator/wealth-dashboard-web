import {
  platformCommandExecutiveSignalLabel,
  platformCommandManagementStateLabel,
  type PlatformCommandExecutiveSignal,
  type PlatformCommandManagementOverviewItem,
  type PlatformCommandManagementState,
} from "@/lib/platformCommandManagementOverview";
import {
  platformCommandResidualRiskLabel,
  type PlatformCommandResidualRisk,
} from "@/lib/platformCommandClosure";
import { platformCommandStatusLabel } from "@/lib/platformCommandSearch";

export type PlatformCommandBoardPackState = "blocked" | "committee_review" | "board_draft" | "board_ready";
export type PlatformCommandBoardSignal = "hold" | "disclose" | "approve";

export type PlatformCommandBoardPackItem = {
  boardPackId: string;
  overviewId: string;
  healthId: string;
  decisionId: string;
  owner: string;
  boardOwner: string;
  boardPackState: PlatformCommandBoardPackState;
  boardSignal: PlatformCommandBoardSignal;
  managementState: PlatformCommandManagementState;
  executiveSignal: PlatformCommandExecutiveSignal;
  status: PlatformCommandManagementOverviewItem["status"];
  residualRisk: PlatformCommandResidualRisk;
  readinessScore: number;
  sourceRoute: string;
  buyerSegment: string;
  revenueStory: string;
  customerStory: string;
  riskDisclosure: string;
  strategicDecision: string;
  capitalAsk: string;
  operatingKpi: string;
  governanceNote: string;
  appendixEvidence: string;
  boardCadence: string;
  decisionGate: string;
  nextAction: string;
};

export type PlatformCommandBoardPackSummary = {
  status: PlatformCommandManagementOverviewItem["status"];
  itemCount: number;
  blockedCount: number;
  committeeReviewCount: number;
  boardDraftCount: number;
  boardReadyCount: number;
  holdCount: number;
  discloseCount: number;
  approveCount: number;
  averageReadinessScore: number;
  nextBoardWindow: string;
};

function csvCell(value: unknown) {
  const stringValue = String(value ?? "");
  if (/[",\n]/.test(stringValue)) return `"${stringValue.replaceAll('"', '""')}"`;
  return stringValue;
}

function boardPackStateFor(item: PlatformCommandManagementOverviewItem): PlatformCommandBoardPackState {
  if (item.managementState === "blocked" || item.executiveSignal === "red" || item.status === "block") {
    return "blocked";
  }
  if (item.managementState === "turnaround") return "committee_review";
  if (item.managementState === "operating_review" || item.executiveSignal === "amber") return "board_draft";
  return "board_ready";
}

function boardSignalFor(
  item: PlatformCommandManagementOverviewItem,
  state: PlatformCommandBoardPackState,
): PlatformCommandBoardSignal {
  if (state === "blocked" || item.residualRisk === "high") return "hold";
  if (state === "committee_review" || state === "board_draft" || item.residualRisk === "medium") return "disclose";
  return "approve";
}

export function platformCommandBoardPackStateLabel(state: PlatformCommandBoardPackState) {
  if (state === "blocked") return "Blocked";
  if (state === "committee_review") return "Committee review";
  if (state === "board_draft") return "Board draft";
  return "Board ready";
}

export function platformCommandBoardSignalLabel(signal: PlatformCommandBoardSignal) {
  if (signal === "hold") return "Hold";
  if (signal === "disclose") return "Disclose";
  return "Approve";
}

function revenueStoryFor(item: PlatformCommandManagementOverviewItem, signal: PlatformCommandBoardSignal) {
  if (signal === "hold") return `收入故事不可上會：${item.revenueConfidence}`;
  if (signal === "disclose") return `收入故事需揭露例外：${item.revenueConfidence}`;
  return `收入故事可上會：${item.revenueConfidence}`;
}

function customerStoryFor(item: PlatformCommandManagementOverviewItem, signal: PlatformCommandBoardSignal) {
  if (signal === "hold") return `客戶故事需修復：${item.customerConfidence}`;
  if (signal === "disclose") return `客戶故事需揭露風險：${item.customerConfidence}`;
  return `客戶故事可支撐續約與擴張：${item.customerConfidence}`;
}

function riskDisclosureFor(item: PlatformCommandManagementOverviewItem, signal: PlatformCommandBoardSignal) {
  if (signal === "hold") return `重大風險揭露：${item.operatingFocus}`;
  if (signal === "disclose") return `需揭露營運風險：${item.boardNarrative}`;
  return `標準風險揭露：${platformCommandResidualRiskLabel(item.residualRisk)}`;
}

function strategicDecisionFor(item: PlatformCommandManagementOverviewItem, state: PlatformCommandBoardPackState) {
  if (state === "blocked") return `董事會不批准擴張：${item.executiveDecision}`;
  if (state === "committee_review") return `先進營運委員會：${item.executiveDecision}`;
  if (state === "board_draft") return `董事會草案需補資料：${item.executiveDecision}`;
  return `董事會可批准：${item.executiveDecision}`;
}

function capitalAskFor(item: PlatformCommandManagementOverviewItem, signal: PlatformCommandBoardSignal) {
  if (signal === "hold") return "不提出資源要求";
  if (signal === "disclose") return `資源要求需附風險註記：${item.strategicAsk}`;
  return `可提出資源與擴張要求：${item.strategicAsk}`;
}

function operatingKpiFor(item: PlatformCommandManagementOverviewItem, signal: PlatformCommandBoardSignal) {
  if (signal === "hold") return `KPI 不可列 clean：${item.operatingFocus}`;
  if (signal === "disclose") return `KPI 需加例外標註：${item.operatingFocus}`;
  return `KPI 可列 clean：${item.operatingFocus}`;
}

function governanceNoteFor(item: PlatformCommandManagementOverviewItem, state: PlatformCommandBoardPackState) {
  if (state === "blocked") return `Governance hold：${item.decisionGate}`;
  if (state === "committee_review") return `先走 committee governance：${item.riskOwner}`;
  if (state === "board_draft") return `Board draft governance：${item.riskOwner}`;
  return `Board-ready governance：${item.riskOwner}`;
}

function appendixEvidenceFor(item: PlatformCommandManagementOverviewItem, signal: PlatformCommandBoardSignal) {
  if (signal === "hold") return `缺附錄證據：${item.nextAction}`;
  if (signal === "disclose") return `附錄需含例外證據：${item.boardNarrative}`;
  return `附錄完整：${item.boardNarrative}`;
}

function boardCadenceFor(signal: PlatformCommandBoardSignal) {
  if (signal === "hold") return "不上會，每週修復追蹤";
  if (signal === "disclose") return "本週 board draft review";
  return "月度 board pack";
}

function decisionGateFor(item: PlatformCommandManagementOverviewItem, state: PlatformCommandBoardPackState) {
  if (state === "blocked") return `不得產生 Board Pack：${item.decisionGate}`;
  if (state === "committee_review") return `完成委員會審查：${item.nextAction}`;
  if (state === "board_draft") return `完成董事會草案與風險揭露：${item.boardNarrative}`;
  return "可形成董事會包、平台作戰總結與 CEO 決策視圖";
}

function nextActionFor(item: PlatformCommandManagementOverviewItem, state: PlatformCommandBoardPackState) {
  if (state === "blocked") return `先解除 Board Pack 阻塞：${item.nextAction}`;
  if (state === "committee_review") return `送 committee review：${item.riskOwner}`;
  if (state === "board_draft") return `補齊 board draft：${item.boardNarrative}`;
  return "把 Board Pack 輸出給平台作戰總結與管理層總控";
}

function stateRank(state: PlatformCommandBoardPackState) {
  if (state === "blocked") return 4;
  if (state === "committee_review") return 3;
  if (state === "board_draft") return 2;
  return 1;
}

export function buildPlatformCommandBoardPackItems(
  items: PlatformCommandManagementOverviewItem[],
): PlatformCommandBoardPackItem[] {
  return items
    .map((item, index) => {
      const boardPackState = boardPackStateFor(item);
      const boardSignal = boardSignalFor(item, boardPackState);

      return {
        boardPackId: `BRD-${String(index + 1).padStart(3, "0")}-${item.decisionId}`,
        overviewId: item.overviewId,
        healthId: item.healthId,
        decisionId: item.decisionId,
        owner: item.owner,
        boardOwner: item.executiveOwner,
        boardPackState,
        boardSignal,
        managementState: item.managementState,
        executiveSignal: item.executiveSignal,
        status: item.status,
        residualRisk: item.residualRisk,
        readinessScore: item.readinessScore,
        sourceRoute: item.sourceRoute,
        buyerSegment: item.buyerSegment,
        revenueStory: revenueStoryFor(item, boardSignal),
        customerStory: customerStoryFor(item, boardSignal),
        riskDisclosure: riskDisclosureFor(item, boardSignal),
        strategicDecision: strategicDecisionFor(item, boardPackState),
        capitalAsk: capitalAskFor(item, boardSignal),
        operatingKpi: operatingKpiFor(item, boardSignal),
        governanceNote: governanceNoteFor(item, boardPackState),
        appendixEvidence: appendixEvidenceFor(item, boardSignal),
        boardCadence: boardCadenceFor(boardSignal),
        decisionGate: decisionGateFor(item, boardPackState),
        nextAction: nextActionFor(item, boardPackState),
      };
    })
    .sort(
      (left, right) =>
        stateRank(right.boardPackState) - stateRank(left.boardPackState) ||
        left.readinessScore - right.readinessScore ||
        left.boardPackId.localeCompare(right.boardPackId, "zh-Hant"),
    );
}

export function summarizePlatformCommandBoardPack(
  items: PlatformCommandBoardPackItem[],
): PlatformCommandBoardPackSummary {
  const blockedCount = items.filter((item) => item.boardPackState === "blocked").length;
  const committeeReviewCount = items.filter((item) => item.boardPackState === "committee_review").length;
  const boardDraftCount = items.filter((item) => item.boardPackState === "board_draft").length;
  const holdCount = items.filter((item) => item.boardSignal === "hold").length;
  const discloseCount = items.filter((item) => item.boardSignal === "disclose").length;
  const averageReadinessScore = items.length
    ? Math.round(items.reduce((sum, item) => sum + item.readinessScore, 0) / items.length)
    : 0;

  return {
    status: holdCount > 0 ? "block" : discloseCount > 0 ? "watch" : "pass",
    itemCount: items.length,
    blockedCount,
    committeeReviewCount,
    boardDraftCount,
    boardReadyCount: items.filter((item) => item.boardPackState === "board_ready").length,
    holdCount,
    discloseCount,
    approveCount: items.filter((item) => item.boardSignal === "approve").length,
    averageReadinessScore,
    nextBoardWindow:
      blockedCount > 0
        ? "不上董事會"
        : committeeReviewCount > 0
          ? "本週 committee review"
          : boardDraftCount > 0
            ? "本週 board draft"
            : "可進 Board Pack",
  };
}

export function platformCommandBoardPackCsv(items: PlatformCommandBoardPackItem[]) {
  const header = [
    "board_pack_id",
    "overview_id",
    "health_id",
    "decision_id",
    "owner",
    "board_owner",
    "board_pack_state",
    "board_signal",
    "management_state",
    "executive_signal",
    "status",
    "residual_risk",
    "readiness_score",
    "source_route",
    "buyer_segment",
    "revenue_story",
    "customer_story",
    "risk_disclosure",
    "strategic_decision",
    "capital_ask",
    "operating_kpi",
    "governance_note",
    "appendix_evidence",
    "board_cadence",
    "decision_gate",
    "next_action",
  ];
  const rows = items.map((item) => [
    item.boardPackId,
    item.overviewId,
    item.healthId,
    item.decisionId,
    item.owner,
    item.boardOwner,
    platformCommandBoardPackStateLabel(item.boardPackState),
    platformCommandBoardSignalLabel(item.boardSignal),
    platformCommandManagementStateLabel(item.managementState),
    platformCommandExecutiveSignalLabel(item.executiveSignal),
    platformCommandStatusLabel(item.status),
    platformCommandResidualRiskLabel(item.residualRisk),
    item.readinessScore,
    item.sourceRoute,
    item.buyerSegment,
    item.revenueStory,
    item.customerStory,
    item.riskDisclosure,
    item.strategicDecision,
    item.capitalAsk,
    item.operatingKpi,
    item.governanceNote,
    item.appendixEvidence,
    item.boardCadence,
    item.decisionGate,
    item.nextAction,
  ]);

  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}
