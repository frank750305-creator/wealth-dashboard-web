import {
  platformCommandCustomerHealthStateLabel,
  platformCommandRetentionSignalLabel,
  type PlatformCommandCustomerHealthItem,
  type PlatformCommandCustomerHealthState,
  type PlatformCommandRetentionSignal,
} from "@/lib/platformCommandCustomerHealth";
import {
  platformCommandResidualRiskLabel,
  type PlatformCommandResidualRisk,
} from "@/lib/platformCommandClosure";
import { platformCommandStatusLabel } from "@/lib/platformCommandSearch";

export type PlatformCommandManagementState = "blocked" | "turnaround" | "operating_review" | "executive_ready";
export type PlatformCommandExecutiveSignal = "red" | "amber" | "green";

export type PlatformCommandManagementOverviewItem = {
  overviewId: string;
  healthId: string;
  auditId: string;
  decisionId: string;
  owner: string;
  executiveOwner: string;
  managementState: PlatformCommandManagementState;
  executiveSignal: PlatformCommandExecutiveSignal;
  customerHealthState: PlatformCommandCustomerHealthState;
  retentionSignal: PlatformCommandRetentionSignal;
  status: PlatformCommandCustomerHealthItem["status"];
  residualRisk: PlatformCommandResidualRisk;
  readinessScore: number;
  sourceRoute: string;
  buyerSegment: string;
  revenueConfidence: string;
  customerConfidence: string;
  operatingFocus: string;
  strategicAsk: string;
  boardNarrative: string;
  executiveDecision: string;
  riskOwner: string;
  qbrCadence: string;
  decisionGate: string;
  nextAction: string;
};

export type PlatformCommandManagementOverviewSummary = {
  status: PlatformCommandCustomerHealthItem["status"];
  itemCount: number;
  blockedCount: number;
  turnaroundCount: number;
  operatingReviewCount: number;
  executiveReadyCount: number;
  redCount: number;
  amberCount: number;
  greenCount: number;
  averageReadinessScore: number;
  nextExecutiveWindow: string;
};

function csvCell(value: unknown) {
  const stringValue = String(value ?? "");
  if (/[",\n]/.test(stringValue)) return `"${stringValue.replaceAll('"', '""')}"`;
  return stringValue;
}

function managementStateFor(item: PlatformCommandCustomerHealthItem): PlatformCommandManagementState {
  if (item.customerHealthState === "blocked" || item.retentionSignal === "churn_risk" || item.status === "block") {
    return "blocked";
  }
  if (item.customerHealthState === "adoption_recovery") return "turnaround";
  if (item.customerHealthState === "value_review" || item.retentionSignal === "expansion_watch") {
    return "operating_review";
  }
  return "executive_ready";
}

function executiveSignalFor(
  item: PlatformCommandCustomerHealthItem,
  state: PlatformCommandManagementState,
): PlatformCommandExecutiveSignal {
  if (state === "blocked" || item.residualRisk === "high") return "red";
  if (state === "turnaround" || state === "operating_review" || item.residualRisk === "medium") return "amber";
  return "green";
}

export function platformCommandManagementStateLabel(state: PlatformCommandManagementState) {
  if (state === "blocked") return "Blocked";
  if (state === "turnaround") return "Turnaround";
  if (state === "operating_review") return "Operating review";
  return "Executive ready";
}

export function platformCommandExecutiveSignalLabel(signal: PlatformCommandExecutiveSignal) {
  if (signal === "red") return "Red";
  if (signal === "amber") return "Amber";
  return "Green";
}

function revenueConfidenceFor(item: PlatformCommandCustomerHealthItem, signal: PlatformCommandExecutiveSignal) {
  if (signal === "red") return `營收信心低：${item.renewalRisk}`;
  if (signal === "amber") return `營收信心需複核：${item.valueEvidence}`;
  return `營收信心可列入管理層視圖：${item.expansionPotential}`;
}

function customerConfidenceFor(item: PlatformCommandCustomerHealthItem, signal: PlatformCommandExecutiveSignal) {
  if (signal === "red") return `客戶信心不足：${item.adoptionSignal}`;
  if (signal === "amber") return `客戶信心需 QBR 驗證：${item.customerComms}`;
  return `客戶信心健康：${item.customerComms}`;
}

function operatingFocusFor(item: PlatformCommandCustomerHealthItem, state: PlatformCommandManagementState) {
  if (state === "blocked") return `先處理阻塞：${item.decisionGate}`;
  if (state === "turnaround") return `採用恢復：${item.adoptionSignal}`;
  if (state === "operating_review") return `價值與續約複核：${item.valueEvidence}`;
  return `推進續約與擴張：${item.expansionPotential}`;
}

function strategicAskFor(item: PlatformCommandCustomerHealthItem, signal: PlatformCommandExecutiveSignal) {
  if (signal === "red") return `需要管理層介入：${item.executiveSponsor}`;
  if (signal === "amber") return `需要 executive sponsor 支持：${item.executiveSponsor}`;
  return `可請管理層批准擴張節奏：${item.executiveSponsor}`;
}

function boardNarrativeFor(item: PlatformCommandCustomerHealthItem, signal: PlatformCommandExecutiveSignal) {
  if (signal === "red") return `Board narrative：客戶與收入需修復，${platformCommandResidualRiskLabel(item.residualRisk)}風險`;
  if (signal === "amber") return `Board narrative：客戶價值待證明，${item.qbrCadence}`;
  return `Board narrative：客戶健康，可支撐 retained / expansion base`;
}

function executiveDecisionFor(item: PlatformCommandCustomerHealthItem, state: PlatformCommandManagementState) {
  if (state === "blocked") return `暫停擴張與收入上修：${item.nextAction}`;
  if (state === "turnaround") return `批准採用恢復計畫：${item.qbrCadence}`;
  if (state === "operating_review") return `批准價值複核與續約守門：${item.renewalRisk}`;
  return `批准進入續約 forecast 與擴張 pipeline：${item.expansionPotential}`;
}

function riskOwnerFor(item: PlatformCommandCustomerHealthItem, state: PlatformCommandManagementState) {
  if (state === "blocked") return `CEO / Finance / ${item.successOwner}`;
  if (state === "turnaround") return `Customer Success / ${item.successOwner}`;
  if (state === "operating_review") return `Revenue Ops / ${item.successOwner}`;
  return item.owner;
}

function decisionGateFor(item: PlatformCommandCustomerHealthItem, state: PlatformCommandManagementState) {
  if (state === "blocked") return `不得進管理層 clean view：${item.decisionGate}`;
  if (state === "turnaround") return `完成採用恢復與 QBR：${item.nextAction}`;
  if (state === "operating_review") return `完成價值證據與續約複核：${item.valueEvidence}`;
  return "可進 Board Pack、平台作戰總結與管理層總控";
}

function nextActionFor(item: PlatformCommandCustomerHealthItem, state: PlatformCommandManagementState) {
  if (state === "blocked") return `先解除 management overview 阻塞：${item.nextAction}`;
  if (state === "turnaround") return `把採用恢復放入管理層 weekly review：${item.qbrCadence}`;
  if (state === "operating_review") return `把價值與續約風險放入 operating review：${item.renewalRisk}`;
  return "把管理層總覽輸出給 Board Pack 與平台作戰總結";
}

function stateRank(state: PlatformCommandManagementState) {
  if (state === "blocked") return 4;
  if (state === "turnaround") return 3;
  if (state === "operating_review") return 2;
  return 1;
}

export function buildPlatformCommandManagementOverviewItems(
  items: PlatformCommandCustomerHealthItem[],
): PlatformCommandManagementOverviewItem[] {
  return items
    .map((item, index) => {
      const managementState = managementStateFor(item);
      const executiveSignal = executiveSignalFor(item, managementState);

      return {
        overviewId: `MGT-${String(index + 1).padStart(3, "0")}-${item.decisionId}`,
        healthId: item.healthId,
        auditId: item.auditId,
        decisionId: item.decisionId,
        owner: item.owner,
        executiveOwner: item.executiveSponsor,
        managementState,
        executiveSignal,
        customerHealthState: item.customerHealthState,
        retentionSignal: item.retentionSignal,
        status: item.status,
        residualRisk: item.residualRisk,
        readinessScore: item.readinessScore,
        sourceRoute: item.sourceRoute,
        buyerSegment: item.buyerSegment,
        revenueConfidence: revenueConfidenceFor(item, executiveSignal),
        customerConfidence: customerConfidenceFor(item, executiveSignal),
        operatingFocus: operatingFocusFor(item, managementState),
        strategicAsk: strategicAskFor(item, executiveSignal),
        boardNarrative: boardNarrativeFor(item, executiveSignal),
        executiveDecision: executiveDecisionFor(item, managementState),
        riskOwner: riskOwnerFor(item, managementState),
        qbrCadence: item.qbrCadence,
        decisionGate: decisionGateFor(item, managementState),
        nextAction: nextActionFor(item, managementState),
      };
    })
    .sort(
      (left, right) =>
        stateRank(right.managementState) - stateRank(left.managementState) ||
        left.readinessScore - right.readinessScore ||
        left.overviewId.localeCompare(right.overviewId, "zh-Hant"),
    );
}

export function summarizePlatformCommandManagementOverview(
  items: PlatformCommandManagementOverviewItem[],
): PlatformCommandManagementOverviewSummary {
  const blockedCount = items.filter((item) => item.managementState === "blocked").length;
  const turnaroundCount = items.filter((item) => item.managementState === "turnaround").length;
  const operatingReviewCount = items.filter((item) => item.managementState === "operating_review").length;
  const redCount = items.filter((item) => item.executiveSignal === "red").length;
  const amberCount = items.filter((item) => item.executiveSignal === "amber").length;
  const averageReadinessScore = items.length
    ? Math.round(items.reduce((sum, item) => sum + item.readinessScore, 0) / items.length)
    : 0;

  return {
    status: redCount > 0 ? "block" : amberCount > 0 ? "watch" : "pass",
    itemCount: items.length,
    blockedCount,
    turnaroundCount,
    operatingReviewCount,
    executiveReadyCount: items.filter((item) => item.managementState === "executive_ready").length,
    redCount,
    amberCount,
    greenCount: items.filter((item) => item.executiveSignal === "green").length,
    averageReadinessScore,
    nextExecutiveWindow:
      blockedCount > 0
        ? "不進 clean executive view"
        : turnaroundCount > 0
          ? "本週 turnaround review"
          : operatingReviewCount > 0
            ? "本週 operating review"
            : "可進 Board Pack",
  };
}

export function platformCommandManagementOverviewCsv(items: PlatformCommandManagementOverviewItem[]) {
  const header = [
    "overview_id",
    "health_id",
    "audit_id",
    "decision_id",
    "owner",
    "executive_owner",
    "management_state",
    "executive_signal",
    "customer_health_state",
    "retention_signal",
    "status",
    "residual_risk",
    "readiness_score",
    "source_route",
    "buyer_segment",
    "revenue_confidence",
    "customer_confidence",
    "operating_focus",
    "strategic_ask",
    "board_narrative",
    "executive_decision",
    "risk_owner",
    "qbr_cadence",
    "decision_gate",
    "next_action",
  ];
  const rows = items.map((item) => [
    item.overviewId,
    item.healthId,
    item.auditId,
    item.decisionId,
    item.owner,
    item.executiveOwner,
    platformCommandManagementStateLabel(item.managementState),
    platformCommandExecutiveSignalLabel(item.executiveSignal),
    platformCommandCustomerHealthStateLabel(item.customerHealthState),
    platformCommandRetentionSignalLabel(item.retentionSignal),
    platformCommandStatusLabel(item.status),
    platformCommandResidualRiskLabel(item.residualRisk),
    item.readinessScore,
    item.sourceRoute,
    item.buyerSegment,
    item.revenueConfidence,
    item.customerConfidence,
    item.operatingFocus,
    item.strategicAsk,
    item.boardNarrative,
    item.executiveDecision,
    item.riskOwner,
    item.qbrCadence,
    item.decisionGate,
    item.nextAction,
  ]);

  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}
