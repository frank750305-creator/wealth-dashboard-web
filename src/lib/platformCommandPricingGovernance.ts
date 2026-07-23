import {
  platformCommandMarginSignalLabel,
  platformCommandUnitEconomicsStateLabel,
  type PlatformCommandMarginSignal,
  type PlatformCommandUnitEconomicsItem,
  type PlatformCommandUnitEconomicsState,
} from "@/lib/platformCommandUnitEconomics";
import {
  platformCommandResidualRiskLabel,
  type PlatformCommandResidualRisk,
} from "@/lib/platformCommandClosure";
import { platformCommandStatusLabel } from "@/lib/platformCommandSearch";

export type PlatformCommandPricingGovernanceState = "blocked" | "floor_review" | "discount_control" | "approved";
export type PlatformCommandDiscountSignal = "freeze" | "guarded" | "standard";

export type PlatformCommandPricingGovernanceItem = {
  pricingId: string;
  economicsId: string;
  revOpsId: string;
  decisionId: string;
  owner: string;
  pricingOwner: string;
  pricingGovernanceState: PlatformCommandPricingGovernanceState;
  discountSignal: PlatformCommandDiscountSignal;
  unitEconomicsState: PlatformCommandUnitEconomicsState;
  marginSignal: PlatformCommandMarginSignal;
  status: PlatformCommandUnitEconomicsItem["status"];
  residualRisk: PlatformCommandResidualRisk;
  readinessScore: number;
  sourceRoute: string;
  buyerSegment: string;
  priceFloor: string;
  discountGuardrail: string;
  packagingTier: string;
  approvalPolicy: string;
  quoteReadiness: string;
  marginEvidence: string;
  exceptionRisk: string;
  commercialOwnerAction: string;
  financeCadence: string;
  decisionGate: string;
  nextAction: string;
};

export type PlatformCommandPricingGovernanceSummary = {
  status: PlatformCommandUnitEconomicsItem["status"];
  itemCount: number;
  blockedCount: number;
  floorReviewCount: number;
  discountControlCount: number;
  approvedCount: number;
  freezeCount: number;
  guardedCount: number;
  standardCount: number;
  averageReadinessScore: number;
  nextPricingWindow: string;
};

function csvCell(value: unknown) {
  const stringValue = String(value ?? "");
  if (/[",\n]/.test(stringValue)) return `"${stringValue.replaceAll('"', '""')}"`;
  return stringValue;
}

function pricingGovernanceStateFor(item: PlatformCommandUnitEconomicsItem): PlatformCommandPricingGovernanceState {
  if (item.unitEconomicsState === "blocked" || item.marginSignal === "negative" || item.status === "block") {
    return "blocked";
  }
  if (item.marginSignal === "thin") return "floor_review";
  if (item.unitEconomicsState === "margin_watch" || item.residualRisk === "medium") return "discount_control";
  return "approved";
}

function discountSignalFor(state: PlatformCommandPricingGovernanceState): PlatformCommandDiscountSignal {
  if (state === "blocked") return "freeze";
  if (state === "floor_review" || state === "discount_control") return "guarded";
  return "standard";
}

export function platformCommandPricingGovernanceStateLabel(state: PlatformCommandPricingGovernanceState) {
  if (state === "blocked") return "Blocked";
  if (state === "floor_review") return "Floor review";
  if (state === "discount_control") return "Discount control";
  return "Approved";
}

export function platformCommandDiscountSignalLabel(signal: PlatformCommandDiscountSignal) {
  if (signal === "freeze") return "Freeze";
  if (signal === "guarded") return "Guarded";
  return "Standard";
}

function priceFloorFor(item: PlatformCommandUnitEconomicsItem, signal: PlatformCommandDiscountSignal) {
  if (signal === "freeze") return `暫不開價格底線：${item.marginRisk}`;
  if (signal === "guarded") return `需守最低毛利底線：${item.grossMarginBand}`;
  return `可用 enterprise price floor：${item.grossMarginBand}`;
}

function discountGuardrailFor(item: PlatformCommandUnitEconomicsItem, signal: PlatformCommandDiscountSignal) {
  if (signal === "freeze") return "禁止折扣與客製承諾";
  if (signal === "guarded") return `折扣需 Finance + Commercial approval：${item.financeCadence}`;
  return `標準折扣 guardrail，依 ${item.buyerSegment} 管控`;
}

function packagingTierFor(item: PlatformCommandUnitEconomicsItem, signal: PlatformCommandDiscountSignal) {
  if (signal === "freeze") return "不進商業 package";
  if (signal === "guarded") return `Controlled enterprise pilot：${item.buyerSegment}`;
  return `Enterprise analytics tier：${item.buyerSegment}`;
}

function approvalPolicyFor(item: PlatformCommandUnitEconomicsItem, state: PlatformCommandPricingGovernanceState) {
  if (state === "blocked") return `CFO / RevOps hold：${item.decisionGate}`;
  if (state === "floor_review") return `Finance 核定 price floor：${item.cogsDriver}`;
  if (state === "discount_control") return `Commercial lead 核准折扣：${item.deliveryCostControl}`;
  return "可由標準商業核准流程放行";
}

function quoteReadinessFor(state: PlatformCommandPricingGovernanceState) {
  if (state === "blocked") return "不可出報價";
  if (state === "floor_review") return "可出草稿，不可承諾";
  if (state === "discount_control") return "可出受控報價";
  return "可正式報價";
}

function marginEvidenceFor(item: PlatformCommandUnitEconomicsItem, signal: PlatformCommandDiscountSignal) {
  if (signal === "freeze") return `缺毛利證據：${item.marginRisk}`;
  if (signal === "guarded") return `需補 payback / support 證據：${item.paybackView}`;
  return `毛利證據完整：${item.supportCostModel}`;
}

function exceptionRiskFor(item: PlatformCommandUnitEconomicsItem, signal: PlatformCommandDiscountSignal) {
  if (signal === "freeze") return `高：${platformCommandResidualRiskLabel(item.residualRisk)} / ${item.marginRisk}`;
  if (signal === "guarded") return `中：${item.pricingAction}`;
  return `低：${platformCommandMarginSignalLabel(item.marginSignal)}`;
}

function commercialOwnerActionFor(
  item: PlatformCommandUnitEconomicsItem,
  state: PlatformCommandPricingGovernanceState,
) {
  if (state === "blocked") return `暫停 commercial handoff：${item.nextAction}`;
  if (state === "floor_review") return `請 ${item.financeOwner} 確認價格底線`;
  if (state === "discount_control") return `把 ${item.economicsId} 放入折扣審批`;
  return `同步 package、quote 與 sales enablement：${item.sourceRoute}`;
}

function financeCadenceFor(signal: PlatformCommandDiscountSignal) {
  if (signal === "freeze") return "每日 pricing exception";
  if (signal === "guarded") return "每週 pricing council";
  return "月度 pricing review";
}

function decisionGateFor(
  item: PlatformCommandUnitEconomicsItem,
  state: PlatformCommandPricingGovernanceState,
) {
  if (state === "blocked") return `不得進 Commercialization：${item.decisionGate}`;
  if (state === "floor_review") return `完成價格底線與 COGS 複核：${item.cogsDriver}`;
  if (state === "discount_control") return `折扣 guardrail 入帳：${item.pricingAction}`;
  return "可進 Commercialization 與 quote desk";
}

function nextActionFor(item: PlatformCommandUnitEconomicsItem, state: PlatformCommandPricingGovernanceState) {
  if (state === "blocked") return `先解除 pricing hold：${item.nextAction}`;
  if (state === "floor_review") return `補齊 price floor evidence：${item.marginRisk}`;
  if (state === "discount_control") return `建立折扣核准與例外追蹤：${item.financeCadence}`;
  return "把 pricing governance 輸出給商業化、銷售與客戶成功";
}

function stateRank(state: PlatformCommandPricingGovernanceState) {
  if (state === "blocked") return 4;
  if (state === "floor_review") return 3;
  if (state === "discount_control") return 2;
  return 1;
}

export function buildPlatformCommandPricingGovernanceItems(
  items: PlatformCommandUnitEconomicsItem[],
): PlatformCommandPricingGovernanceItem[] {
  return items
    .map((item, index) => {
      const pricingGovernanceState = pricingGovernanceStateFor(item);
      const discountSignal = discountSignalFor(pricingGovernanceState);

      return {
        pricingId: `PRC-${String(index + 1).padStart(3, "0")}-${item.decisionId}`,
        economicsId: item.economicsId,
        revOpsId: item.revOpsId,
        decisionId: item.decisionId,
        owner: item.owner,
        pricingOwner: item.financeOwner,
        pricingGovernanceState,
        discountSignal,
        unitEconomicsState: item.unitEconomicsState,
        marginSignal: item.marginSignal,
        status: item.status,
        residualRisk: item.residualRisk,
        readinessScore: item.readinessScore,
        sourceRoute: item.sourceRoute,
        buyerSegment: item.buyerSegment,
        priceFloor: priceFloorFor(item, discountSignal),
        discountGuardrail: discountGuardrailFor(item, discountSignal),
        packagingTier: packagingTierFor(item, discountSignal),
        approvalPolicy: approvalPolicyFor(item, pricingGovernanceState),
        quoteReadiness: quoteReadinessFor(pricingGovernanceState),
        marginEvidence: marginEvidenceFor(item, discountSignal),
        exceptionRisk: exceptionRiskFor(item, discountSignal),
        commercialOwnerAction: commercialOwnerActionFor(item, pricingGovernanceState),
        financeCadence: financeCadenceFor(discountSignal),
        decisionGate: decisionGateFor(item, pricingGovernanceState),
        nextAction: nextActionFor(item, pricingGovernanceState),
      };
    })
    .sort(
      (left, right) =>
        stateRank(right.pricingGovernanceState) - stateRank(left.pricingGovernanceState) ||
        left.readinessScore - right.readinessScore ||
        left.pricingId.localeCompare(right.pricingId, "zh-Hant"),
    );
}

export function summarizePlatformCommandPricingGovernance(
  items: PlatformCommandPricingGovernanceItem[],
): PlatformCommandPricingGovernanceSummary {
  const blockedCount = items.filter((item) => item.pricingGovernanceState === "blocked").length;
  const floorReviewCount = items.filter((item) => item.pricingGovernanceState === "floor_review").length;
  const discountControlCount = items.filter((item) => item.pricingGovernanceState === "discount_control").length;
  const freezeCount = items.filter((item) => item.discountSignal === "freeze").length;
  const guardedCount = items.filter((item) => item.discountSignal === "guarded").length;
  const averageReadinessScore = items.length
    ? Math.round(items.reduce((sum, item) => sum + item.readinessScore, 0) / items.length)
    : 0;

  return {
    status: freezeCount > 0 ? "block" : guardedCount > 0 ? "watch" : "pass",
    itemCount: items.length,
    blockedCount,
    floorReviewCount,
    discountControlCount,
    approvedCount: items.filter((item) => item.pricingGovernanceState === "approved").length,
    freezeCount,
    guardedCount,
    standardCount: items.filter((item) => item.discountSignal === "standard").length,
    averageReadinessScore,
    nextPricingWindow:
      blockedCount > 0
        ? "不進報價"
        : floorReviewCount > 0
          ? "本週 price floor review"
          : discountControlCount > 0
            ? "本月折扣審批"
            : "可進 quote desk",
  };
}

export function platformCommandPricingGovernanceCsv(items: PlatformCommandPricingGovernanceItem[]) {
  const header = [
    "pricing_id",
    "economics_id",
    "revops_id",
    "decision_id",
    "owner",
    "pricing_owner",
    "pricing_governance_state",
    "discount_signal",
    "unit_economics_state",
    "margin_signal",
    "status",
    "residual_risk",
    "readiness_score",
    "source_route",
    "buyer_segment",
    "price_floor",
    "discount_guardrail",
    "packaging_tier",
    "approval_policy",
    "quote_readiness",
    "margin_evidence",
    "exception_risk",
    "commercial_owner_action",
    "finance_cadence",
    "decision_gate",
    "next_action",
  ];
  const rows = items.map((item) => [
    item.pricingId,
    item.economicsId,
    item.revOpsId,
    item.decisionId,
    item.owner,
    item.pricingOwner,
    platformCommandPricingGovernanceStateLabel(item.pricingGovernanceState),
    platformCommandDiscountSignalLabel(item.discountSignal),
    platformCommandUnitEconomicsStateLabel(item.unitEconomicsState),
    platformCommandMarginSignalLabel(item.marginSignal),
    platformCommandStatusLabel(item.status),
    platformCommandResidualRiskLabel(item.residualRisk),
    item.readinessScore,
    item.sourceRoute,
    item.buyerSegment,
    item.priceFloor,
    item.discountGuardrail,
    item.packagingTier,
    item.approvalPolicy,
    item.quoteReadiness,
    item.marginEvidence,
    item.exceptionRisk,
    item.commercialOwnerAction,
    item.financeCadence,
    item.decisionGate,
    item.nextAction,
  ]);

  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}
