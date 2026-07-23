import {
  platformCommandCeoDecisionSignalLabel,
  platformCommandCeoDecisionStateLabel,
  type PlatformCommandCeoDecisionConsoleItem,
  type PlatformCommandCeoDecisionSignal,
  type PlatformCommandCeoDecisionState,
} from "@/lib/platformCommandCeoDecisionConsole";
import {
  platformCommandControlTowerSignalLabel,
  type PlatformCommandControlTowerSignal,
} from "@/lib/platformCommandOperatingControlTower";
import {
  platformCommandResidualRiskLabel,
  type PlatformCommandResidualRisk,
} from "@/lib/platformCommandClosure";
import { platformCommandStatusLabel } from "@/lib/platformCommandSearch";

export type PlatformCommandStakeholderAudience = "investor" | "board" | "customer" | "internal";
export type PlatformCommandStakeholderOutputState = "suppressed" | "rewrite" | "review" | "publish_ready";
export type PlatformCommandStakeholderDeliverySignal = "do_not_send" | "conditional_send" | "send";

export type PlatformCommandStakeholderOutputPackItem = {
  outputId: string;
  memoId: string;
  controlId: string;
  decisionId: string;
  audience: PlatformCommandStakeholderAudience;
  owner: string;
  publisher: string;
  outputState: PlatformCommandStakeholderOutputState;
  deliverySignal: PlatformCommandStakeholderDeliverySignal;
  ceoDecisionState: PlatformCommandCeoDecisionState;
  ceoDecisionSignal: PlatformCommandCeoDecisionSignal;
  controlSignal: PlatformCommandControlTowerSignal;
  status: PlatformCommandCeoDecisionConsoleItem["status"];
  residualRisk: PlatformCommandResidualRisk;
  readinessScore: number;
  sourceRoute: string;
  buyerSegment: string;
  outputTitle: string;
  executiveSummary: string;
  proofPoint: string;
  disclosure: string;
  callToAction: string;
  deliveryChannel: string;
  approvalOwner: string;
  publishWindow: string;
  decisionGate: string;
  nextAction: string;
};

export type PlatformCommandStakeholderOutputPackSummary = {
  status: PlatformCommandCeoDecisionConsoleItem["status"];
  itemCount: number;
  investorCount: number;
  boardCount: number;
  customerCount: number;
  internalCount: number;
  suppressedCount: number;
  rewriteCount: number;
  reviewCount: number;
  publishReadyCount: number;
  doNotSendCount: number;
  conditionalSendCount: number;
  sendCount: number;
  averageReadinessScore: number;
  publishDecision: string;
};

const audiences: PlatformCommandStakeholderAudience[] = ["investor", "board", "customer", "internal"];

function csvCell(value: unknown) {
  const stringValue = String(value ?? "");
  if (/[",\n]/.test(stringValue)) return `"${stringValue.replaceAll('"', '""')}"`;
  return stringValue;
}

export function platformCommandStakeholderAudienceLabel(audience: PlatformCommandStakeholderAudience) {
  if (audience === "investor") return "Investor";
  if (audience === "board") return "Board";
  if (audience === "customer") return "Customer";
  return "Internal";
}

export function platformCommandStakeholderOutputStateLabel(state: PlatformCommandStakeholderOutputState) {
  if (state === "suppressed") return "Suppressed";
  if (state === "rewrite") return "Rewrite";
  if (state === "review") return "Review";
  return "Publish ready";
}

export function platformCommandStakeholderDeliverySignalLabel(signal: PlatformCommandStakeholderDeliverySignal) {
  if (signal === "do_not_send") return "Do not send";
  if (signal === "conditional_send") return "Conditional send";
  return "Send";
}

function outputStateFor(
  item: PlatformCommandCeoDecisionConsoleItem,
  audience: PlatformCommandStakeholderAudience,
): PlatformCommandStakeholderOutputState {
  if (item.ceoDecisionSignal === "reject") return "suppressed";
  if (audience === "investor" && item.ceoDecisionSignal === "condition") return "rewrite";
  if (item.ceoDecisionSignal === "condition") return "review";
  return "publish_ready";
}

function deliverySignalFor(state: PlatformCommandStakeholderOutputState): PlatformCommandStakeholderDeliverySignal {
  if (state === "suppressed") return "do_not_send";
  if (state === "rewrite" || state === "review") return "conditional_send";
  return "send";
}

function outputTitleFor(
  item: PlatformCommandCeoDecisionConsoleItem,
  audience: PlatformCommandStakeholderAudience,
) {
  if (audience === "investor") return `Investor update：${item.agendaTitle}`;
  if (audience === "board") return `Board message：${item.agendaTitle}`;
  if (audience === "customer") return `Customer readout：${item.buyerSegment}`;
  return `Internal operating memo：${item.agendaTitle}`;
}

function executiveSummaryFor(
  item: PlatformCommandCeoDecisionConsoleItem,
  audience: PlatformCommandStakeholderAudience,
) {
  if (audience === "investor") return item.investorMessage;
  if (audience === "board") return item.boardMessage;
  if (audience === "customer") return item.customerPosture;
  return item.operatingMandate;
}

function proofPointFor(
  item: PlatformCommandCeoDecisionConsoleItem,
  audience: PlatformCommandStakeholderAudience,
) {
  if (audience === "investor") return item.revenuePosture;
  if (audience === "board") return item.decisionRationale;
  if (audience === "customer") return item.customerPosture;
  return item.investmentPosture;
}

function disclosureFor(
  item: PlatformCommandCeoDecisionConsoleItem,
  audience: PlatformCommandStakeholderAudience,
) {
  if (audience === "investor") return `揭露口徑：${item.riskMandate}`;
  if (audience === "board") return `董事會揭露：${item.riskMandate}`;
  if (audience === "customer") return `客戶揭露：${item.decisionGate}`;
  return `內部揭露：${platformCommandResidualRiskLabel(item.residualRisk)}`;
}

function callToActionFor(
  item: PlatformCommandCeoDecisionConsoleItem,
  audience: PlatformCommandStakeholderAudience,
) {
  if (audience === "investor") return item.ceoDecisionSignal === "approve" ? "納入成長敘事" : "暫不外部放大";
  if (audience === "board") return item.ceoDecision;
  if (audience === "customer") return item.ceoDecisionSignal === "reject" ? "暫停客戶擴張訊息" : "安排客戶價值溝通";
  return item.nextAction;
}

function deliveryChannelFor(audience: PlatformCommandStakeholderAudience) {
  if (audience === "investor") return "Investor update / fundraising memo";
  if (audience === "board") return "Board deck / committee packet";
  if (audience === "customer") return "QBR / customer success readout";
  return "CEO staff meeting / operating review";
}

function approvalOwnerFor(
  item: PlatformCommandCeoDecisionConsoleItem,
  audience: PlatformCommandStakeholderAudience,
) {
  if (audience === "investor") return `CEO / Finance / ${item.ceoOwner}`;
  if (audience === "board") return `CEO / Board secretary / ${item.ceoOwner}`;
  if (audience === "customer") return `Customer Success / ${item.owner}`;
  return `Operating owner / ${item.ceoOwner}`;
}

function publishWindowFor(
  item: PlatformCommandCeoDecisionConsoleItem,
  state: PlatformCommandStakeholderOutputState,
) {
  if (state === "suppressed") return "不發布";
  if (state === "rewrite") return "改寫後再發布";
  if (state === "review") return item.followUpCadence;
  return "本週可發布";
}

function decisionGateFor(
  item: PlatformCommandCeoDecisionConsoleItem,
  state: PlatformCommandStakeholderOutputState,
) {
  if (state === "suppressed") return `不得輸出：${item.decisionGate}`;
  if (state === "rewrite") return `重寫外部敘事：${item.riskMandate}`;
  if (state === "review") return `完成審核後輸出：${item.decisionGate}`;
  return "可輸出給對應利害關係人";
}

function nextActionFor(
  item: PlatformCommandCeoDecisionConsoleItem,
  audience: PlatformCommandStakeholderAudience,
  state: PlatformCommandStakeholderOutputState,
) {
  if (state === "suppressed") return `先回 CEO 決策台：${item.nextAction}`;
  if (state === "rewrite") return `由 ${approvalOwnerFor(item, audience)} 改寫敘事`;
  if (state === "review") return `由 ${approvalOwnerFor(item, audience)} 做最後審核`;
  return `交付到 ${deliveryChannelFor(audience)}`;
}

function stateRank(state: PlatformCommandStakeholderOutputState) {
  if (state === "suppressed") return 4;
  if (state === "rewrite") return 3;
  if (state === "review") return 2;
  return 1;
}

export function buildPlatformCommandStakeholderOutputPackItems(
  items: PlatformCommandCeoDecisionConsoleItem[],
): PlatformCommandStakeholderOutputPackItem[] {
  return items
    .flatMap((item, itemIndex) =>
      audiences.map((audience, audienceIndex) => {
        const outputState = outputStateFor(item, audience);
        const deliverySignal = deliverySignalFor(outputState);

        return {
          outputId: `OUT-${String(itemIndex + 1).padStart(3, "0")}-${audienceIndex + 1}-${item.decisionId}`,
          memoId: item.memoId,
          controlId: item.controlId,
          decisionId: item.decisionId,
          audience,
          owner: item.owner,
          publisher: approvalOwnerFor(item, audience),
          outputState,
          deliverySignal,
          ceoDecisionState: item.ceoDecisionState,
          ceoDecisionSignal: item.ceoDecisionSignal,
          controlSignal: item.controlSignal,
          status: item.status,
          residualRisk: item.residualRisk,
          readinessScore: item.readinessScore,
          sourceRoute: item.sourceRoute,
          buyerSegment: item.buyerSegment,
          outputTitle: outputTitleFor(item, audience),
          executiveSummary: executiveSummaryFor(item, audience),
          proofPoint: proofPointFor(item, audience),
          disclosure: disclosureFor(item, audience),
          callToAction: callToActionFor(item, audience),
          deliveryChannel: deliveryChannelFor(audience),
          approvalOwner: approvalOwnerFor(item, audience),
          publishWindow: publishWindowFor(item, outputState),
          decisionGate: decisionGateFor(item, outputState),
          nextAction: nextActionFor(item, audience, outputState),
        };
      }),
    )
    .sort(
      (left, right) =>
        stateRank(right.outputState) - stateRank(left.outputState) ||
        left.readinessScore - right.readinessScore ||
        left.outputId.localeCompare(right.outputId, "zh-Hant"),
    );
}

export function summarizePlatformCommandStakeholderOutputPack(
  items: PlatformCommandStakeholderOutputPackItem[],
): PlatformCommandStakeholderOutputPackSummary {
  const suppressedCount = items.filter((item) => item.outputState === "suppressed").length;
  const rewriteCount = items.filter((item) => item.outputState === "rewrite").length;
  const reviewCount = items.filter((item) => item.outputState === "review").length;
  const doNotSendCount = items.filter((item) => item.deliverySignal === "do_not_send").length;
  const conditionalSendCount = items.filter((item) => item.deliverySignal === "conditional_send").length;
  const averageReadinessScore = items.length
    ? Math.round(items.reduce((sum, item) => sum + item.readinessScore, 0) / items.length)
    : 0;

  return {
    status: doNotSendCount > 0 ? "block" : conditionalSendCount > 0 ? "watch" : "pass",
    itemCount: items.length,
    investorCount: items.filter((item) => item.audience === "investor").length,
    boardCount: items.filter((item) => item.audience === "board").length,
    customerCount: items.filter((item) => item.audience === "customer").length,
    internalCount: items.filter((item) => item.audience === "internal").length,
    suppressedCount,
    rewriteCount,
    reviewCount,
    publishReadyCount: items.filter((item) => item.outputState === "publish_ready").length,
    doNotSendCount,
    conditionalSendCount,
    sendCount: items.filter((item) => item.deliverySignal === "send").length,
    averageReadinessScore,
    publishDecision:
      doNotSendCount > 0
        ? "暫停對外輸出"
        : conditionalSendCount > 0
          ? "條件式輸出，需審核"
          : "可完整輸出",
  };
}

export function platformCommandStakeholderOutputPackCsv(items: PlatformCommandStakeholderOutputPackItem[]) {
  const header = [
    "output_id",
    "memo_id",
    "control_id",
    "decision_id",
    "audience",
    "owner",
    "publisher",
    "output_state",
    "delivery_signal",
    "ceo_decision_state",
    "ceo_decision_signal",
    "control_signal",
    "status",
    "residual_risk",
    "readiness_score",
    "source_route",
    "buyer_segment",
    "output_title",
    "executive_summary",
    "proof_point",
    "disclosure",
    "call_to_action",
    "delivery_channel",
    "approval_owner",
    "publish_window",
    "decision_gate",
    "next_action",
  ];
  const rows = items.map((item) => [
    item.outputId,
    item.memoId,
    item.controlId,
    item.decisionId,
    platformCommandStakeholderAudienceLabel(item.audience),
    item.owner,
    item.publisher,
    platformCommandStakeholderOutputStateLabel(item.outputState),
    platformCommandStakeholderDeliverySignalLabel(item.deliverySignal),
    platformCommandCeoDecisionStateLabel(item.ceoDecisionState),
    platformCommandCeoDecisionSignalLabel(item.ceoDecisionSignal),
    platformCommandControlTowerSignalLabel(item.controlSignal),
    platformCommandStatusLabel(item.status),
    platformCommandResidualRiskLabel(item.residualRisk),
    item.readinessScore,
    item.sourceRoute,
    item.buyerSegment,
    item.outputTitle,
    item.executiveSummary,
    item.proofPoint,
    item.disclosure,
    item.callToAction,
    item.deliveryChannel,
    item.approvalOwner,
    item.publishWindow,
    item.decisionGate,
    item.nextAction,
  ]);

  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}
