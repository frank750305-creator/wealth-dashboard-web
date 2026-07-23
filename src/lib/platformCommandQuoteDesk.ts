import {
  platformCommandDiscountSignalLabel,
  platformCommandPricingGovernanceStateLabel,
  type PlatformCommandDiscountSignal,
  type PlatformCommandPricingGovernanceItem,
  type PlatformCommandPricingGovernanceState,
} from "@/lib/platformCommandPricingGovernance";
import {
  platformCommandResidualRiskLabel,
  type PlatformCommandResidualRisk,
} from "@/lib/platformCommandClosure";
import { platformCommandStatusLabel } from "@/lib/platformCommandSearch";

export type PlatformCommandQuoteDeskState = "blocked" | "draft" | "legal_review" | "ready";
export type PlatformCommandQuoteRiskSignal = "blocked" | "needs_review" | "ready";

export type PlatformCommandQuoteDeskItem = {
  quoteId: string;
  pricingId: string;
  economicsId: string;
  decisionId: string;
  owner: string;
  quoteOwner: string;
  quoteDeskState: PlatformCommandQuoteDeskState;
  quoteRiskSignal: PlatformCommandQuoteRiskSignal;
  pricingGovernanceState: PlatformCommandPricingGovernanceState;
  discountSignal: PlatformCommandDiscountSignal;
  status: PlatformCommandPricingGovernanceItem["status"];
  residualRisk: PlatformCommandResidualRisk;
  readinessScore: number;
  sourceRoute: string;
  buyerSegment: string;
  offerPackage: string;
  quoteTerms: string;
  legalNote: string;
  approvalPacket: string;
  entitlementPlan: string;
  deliveryHandoff: string;
  salesEnablement: string;
  buyerRisk: string;
  quoteCadence: string;
  decisionGate: string;
  nextAction: string;
};

export type PlatformCommandQuoteDeskSummary = {
  status: PlatformCommandPricingGovernanceItem["status"];
  itemCount: number;
  blockedCount: number;
  draftCount: number;
  legalReviewCount: number;
  readyCount: number;
  blockedRiskCount: number;
  needsReviewCount: number;
  readyRiskCount: number;
  averageReadinessScore: number;
  nextQuoteWindow: string;
};

function csvCell(value: unknown) {
  const stringValue = String(value ?? "");
  if (/[",\n]/.test(stringValue)) return `"${stringValue.replaceAll('"', '""')}"`;
  return stringValue;
}

function quoteDeskStateFor(item: PlatformCommandPricingGovernanceItem): PlatformCommandQuoteDeskState {
  if (item.pricingGovernanceState === "blocked" || item.discountSignal === "freeze" || item.status === "block") {
    return "blocked";
  }
  if (item.pricingGovernanceState === "floor_review") return "draft";
  if (item.pricingGovernanceState === "discount_control" || item.discountSignal === "guarded") return "legal_review";
  return "ready";
}

function quoteRiskSignalFor(
  item: PlatformCommandPricingGovernanceItem,
  state: PlatformCommandQuoteDeskState,
): PlatformCommandQuoteRiskSignal {
  if (state === "blocked" || item.residualRisk === "high") return "blocked";
  if (state === "draft" || state === "legal_review" || item.residualRisk === "medium") return "needs_review";
  return "ready";
}

export function platformCommandQuoteDeskStateLabel(state: PlatformCommandQuoteDeskState) {
  if (state === "blocked") return "Blocked";
  if (state === "draft") return "Draft";
  if (state === "legal_review") return "Legal review";
  return "Ready";
}

export function platformCommandQuoteRiskSignalLabel(signal: PlatformCommandQuoteRiskSignal) {
  if (signal === "blocked") return "Blocked";
  if (signal === "needs_review") return "Needs review";
  return "Ready";
}

function offerPackageFor(item: PlatformCommandPricingGovernanceItem, state: PlatformCommandQuoteDeskState) {
  if (state === "blocked") return `不出 offer：${item.decisionGate}`;
  if (state === "draft") return `Draft offer，等待 price floor：${item.priceFloor}`;
  if (state === "legal_review") return `受控 offer package：${item.packagingTier}`;
  return `正式 offer package：${item.packagingTier}`;
}

function quoteTermsFor(item: PlatformCommandPricingGovernanceItem, signal: PlatformCommandQuoteRiskSignal) {
  if (signal === "blocked") return `條款暫停：${item.exceptionRisk}`;
  if (signal === "needs_review") return `條款需人工確認：${item.discountGuardrail}`;
  return `標準條款可用：${item.approvalPolicy}`;
}

function legalNoteFor(item: PlatformCommandPricingGovernanceItem, state: PlatformCommandQuoteDeskState) {
  if (state === "blocked") return `法務不收件：${item.marginEvidence}`;
  if (state === "draft") return `先補商務證據：${item.priceFloor}`;
  if (state === "legal_review") return `法務確認折扣與承諾邊界：${item.discountGuardrail}`;
  return "標準 MSA / DPA / SLA 條款可套用";
}

function approvalPacketFor(item: PlatformCommandPricingGovernanceItem, signal: PlatformCommandQuoteRiskSignal) {
  if (signal === "blocked") return `缺核准包：${item.commercialOwnerAction}`;
  if (signal === "needs_review") return `核准包需含毛利、折扣、交付證據：${item.marginEvidence}`;
  return `核准包完整：${item.quoteReadiness}`;
}

function entitlementPlanFor(item: PlatformCommandPricingGovernanceItem, state: PlatformCommandQuoteDeskState) {
  if (state === "blocked") return "不開 entitlement";
  if (state === "draft") return `草稿 entitlement：${item.buyerSegment}`;
  if (state === "legal_review") return `受控 entitlement，等待法務放行：${item.buyerSegment}`;
  return `正式 entitlement 可進 API / data product：${item.buyerSegment}`;
}

function deliveryHandoffFor(item: PlatformCommandPricingGovernanceItem, state: PlatformCommandQuoteDeskState) {
  if (state === "blocked") return `交付不接手：${item.nextAction}`;
  if (state === "draft") return `先準備 onboarding 假設：${item.sourceRoute}`;
  if (state === "legal_review") return `交付需確認特殊折扣與承諾：${item.approvalPolicy}`;
  return "交付可接手啟用、權限與 SLA 排程";
}

function salesEnablementFor(item: PlatformCommandPricingGovernanceItem, signal: PlatformCommandQuoteRiskSignal) {
  if (signal === "blocked") return "Sales 不可承諾價格或時程";
  if (signal === "needs_review") return `Sales 只能使用受控話術：${item.quoteReadiness}`;
  return `Sales 可用標準 talk track：${platformCommandDiscountSignalLabel(item.discountSignal)}`;
}

function buyerRiskFor(item: PlatformCommandPricingGovernanceItem, signal: PlatformCommandQuoteRiskSignal) {
  if (signal === "blocked") return `高：${item.exceptionRisk}`;
  if (signal === "needs_review") return `中：${item.commercialOwnerAction}`;
  return `低：${platformCommandResidualRiskLabel(item.residualRisk)}`;
}

function quoteCadenceFor(signal: PlatformCommandQuoteRiskSignal) {
  if (signal === "blocked") return "每日 quote exception";
  if (signal === "needs_review") return "每週 quote desk review";
  return "月度 quote QA";
}

function decisionGateFor(item: PlatformCommandPricingGovernanceItem, state: PlatformCommandQuoteDeskState) {
  if (state === "blocked") return `不得進客戶報價：${item.decisionGate}`;
  if (state === "draft") return `完成 price floor 後才可發草案：${item.priceFloor}`;
  if (state === "legal_review") return `法務與折扣核准完成：${item.approvalPolicy}`;
  return "可進客戶報價、合約與商業化交付";
}

function nextActionFor(item: PlatformCommandPricingGovernanceItem, state: PlatformCommandQuoteDeskState) {
  if (state === "blocked") return `先解除報價阻塞：${item.nextAction}`;
  if (state === "draft") return `補 quote draft 所需證據：${item.marginEvidence}`;
  if (state === "legal_review") return `完成法務與折扣 gate：${item.discountGuardrail}`;
  return "把 quote package 交給 Commercialization、Sales 與 Delivery";
}

function stateRank(state: PlatformCommandQuoteDeskState) {
  if (state === "blocked") return 4;
  if (state === "draft") return 3;
  if (state === "legal_review") return 2;
  return 1;
}

export function buildPlatformCommandQuoteDeskItems(
  items: PlatformCommandPricingGovernanceItem[],
): PlatformCommandQuoteDeskItem[] {
  return items
    .map((item, index) => {
      const quoteDeskState = quoteDeskStateFor(item);
      const quoteRiskSignal = quoteRiskSignalFor(item, quoteDeskState);

      return {
        quoteId: `QTE-${String(index + 1).padStart(3, "0")}-${item.decisionId}`,
        pricingId: item.pricingId,
        economicsId: item.economicsId,
        decisionId: item.decisionId,
        owner: item.owner,
        quoteOwner: item.pricingOwner,
        quoteDeskState,
        quoteRiskSignal,
        pricingGovernanceState: item.pricingGovernanceState,
        discountSignal: item.discountSignal,
        status: item.status,
        residualRisk: item.residualRisk,
        readinessScore: item.readinessScore,
        sourceRoute: item.sourceRoute,
        buyerSegment: item.buyerSegment,
        offerPackage: offerPackageFor(item, quoteDeskState),
        quoteTerms: quoteTermsFor(item, quoteRiskSignal),
        legalNote: legalNoteFor(item, quoteDeskState),
        approvalPacket: approvalPacketFor(item, quoteRiskSignal),
        entitlementPlan: entitlementPlanFor(item, quoteDeskState),
        deliveryHandoff: deliveryHandoffFor(item, quoteDeskState),
        salesEnablement: salesEnablementFor(item, quoteRiskSignal),
        buyerRisk: buyerRiskFor(item, quoteRiskSignal),
        quoteCadence: quoteCadenceFor(quoteRiskSignal),
        decisionGate: decisionGateFor(item, quoteDeskState),
        nextAction: nextActionFor(item, quoteDeskState),
      };
    })
    .sort(
      (left, right) =>
        stateRank(right.quoteDeskState) - stateRank(left.quoteDeskState) ||
        left.readinessScore - right.readinessScore ||
        left.quoteId.localeCompare(right.quoteId, "zh-Hant"),
    );
}

export function summarizePlatformCommandQuoteDesk(
  items: PlatformCommandQuoteDeskItem[],
): PlatformCommandQuoteDeskSummary {
  const blockedCount = items.filter((item) => item.quoteDeskState === "blocked").length;
  const draftCount = items.filter((item) => item.quoteDeskState === "draft").length;
  const legalReviewCount = items.filter((item) => item.quoteDeskState === "legal_review").length;
  const blockedRiskCount = items.filter((item) => item.quoteRiskSignal === "blocked").length;
  const needsReviewCount = items.filter((item) => item.quoteRiskSignal === "needs_review").length;
  const averageReadinessScore = items.length
    ? Math.round(items.reduce((sum, item) => sum + item.readinessScore, 0) / items.length)
    : 0;

  return {
    status: blockedRiskCount > 0 ? "block" : needsReviewCount > 0 ? "watch" : "pass",
    itemCount: items.length,
    blockedCount,
    draftCount,
    legalReviewCount,
    readyCount: items.filter((item) => item.quoteDeskState === "ready").length,
    blockedRiskCount,
    needsReviewCount,
    readyRiskCount: items.filter((item) => item.quoteRiskSignal === "ready").length,
    averageReadinessScore,
    nextQuoteWindow:
      blockedCount > 0
        ? "不進客戶報價"
        : draftCount > 0
          ? "本週 quote draft"
          : legalReviewCount > 0
            ? "本週 legal review"
            : "可進客戶報價",
  };
}

export function platformCommandQuoteDeskCsv(items: PlatformCommandQuoteDeskItem[]) {
  const header = [
    "quote_id",
    "pricing_id",
    "economics_id",
    "decision_id",
    "owner",
    "quote_owner",
    "quote_desk_state",
    "quote_risk_signal",
    "pricing_governance_state",
    "discount_signal",
    "status",
    "residual_risk",
    "readiness_score",
    "source_route",
    "buyer_segment",
    "offer_package",
    "quote_terms",
    "legal_note",
    "approval_packet",
    "entitlement_plan",
    "delivery_handoff",
    "sales_enablement",
    "buyer_risk",
    "quote_cadence",
    "decision_gate",
    "next_action",
  ];
  const rows = items.map((item) => [
    item.quoteId,
    item.pricingId,
    item.economicsId,
    item.decisionId,
    item.owner,
    item.quoteOwner,
    platformCommandQuoteDeskStateLabel(item.quoteDeskState),
    platformCommandQuoteRiskSignalLabel(item.quoteRiskSignal),
    platformCommandPricingGovernanceStateLabel(item.pricingGovernanceState),
    platformCommandDiscountSignalLabel(item.discountSignal),
    platformCommandStatusLabel(item.status),
    platformCommandResidualRiskLabel(item.residualRisk),
    item.readinessScore,
    item.sourceRoute,
    item.buyerSegment,
    item.offerPackage,
    item.quoteTerms,
    item.legalNote,
    item.approvalPacket,
    item.entitlementPlan,
    item.deliveryHandoff,
    item.salesEnablement,
    item.buyerRisk,
    item.quoteCadence,
    item.decisionGate,
    item.nextAction,
  ]);

  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}
