import {
  platformCommandRevenueRecognitionSignalLabel,
  platformCommandRevOpsStateLabel,
  type PlatformCommandRevenueOperationsLedgerItem,
  type PlatformCommandRevenueRecognitionSignal,
  type PlatformCommandRevOpsState,
} from "@/lib/platformCommandRevenueOperationsLedger";
import {
  platformCommandResidualRiskLabel,
  type PlatformCommandResidualRisk,
} from "@/lib/platformCommandClosure";
import { platformCommandStatusLabel } from "@/lib/platformCommandSearch";

export type PlatformCommandUnitEconomicsState = "blocked" | "cost_review" | "margin_watch" | "efficient";
export type PlatformCommandMarginSignal = "negative" | "thin" | "healthy";

export type PlatformCommandUnitEconomicsItem = {
  economicsId: string;
  revOpsId: string;
  forecastId: string;
  decisionId: string;
  owner: string;
  financeOwner: string;
  unitEconomicsState: PlatformCommandUnitEconomicsState;
  marginSignal: PlatformCommandMarginSignal;
  revOpsState: PlatformCommandRevOpsState;
  recognitionSignal: PlatformCommandRevenueRecognitionSignal;
  status: PlatformCommandRevenueOperationsLedgerItem["status"];
  residualRisk: PlatformCommandResidualRisk;
  readinessScore: number;
  sourceRoute: string;
  buyerSegment: string;
  grossMarginBand: string;
  cogsDriver: string;
  deliveryCostControl: string;
  supportCostModel: string;
  paybackView: string;
  pricingAction: string;
  marginRisk: string;
  financeCadence: string;
  decisionGate: string;
  nextAction: string;
};

export type PlatformCommandUnitEconomicsSummary = {
  status: PlatformCommandRevenueOperationsLedgerItem["status"];
  itemCount: number;
  blockedCount: number;
  costReviewCount: number;
  marginWatchCount: number;
  efficientCount: number;
  negativeCount: number;
  thinCount: number;
  healthyCount: number;
  averageReadinessScore: number;
  nextMarginWindow: string;
};

function csvCell(value: unknown) {
  const stringValue = String(value ?? "");
  if (/[",\n]/.test(stringValue)) return `"${stringValue.replaceAll('"', '""')}"`;
  return stringValue;
}

function unitEconomicsStateFor(item: PlatformCommandRevenueOperationsLedgerItem): PlatformCommandUnitEconomicsState {
  if (item.revOpsState === "blocked" || item.recognitionSignal === "defer" || item.status === "block") {
    return "blocked";
  }
  if (item.recognitionSignal === "manual_review") return "cost_review";
  if (item.revOpsState === "billing_setup") return "margin_watch";
  return "efficient";
}

function marginSignalFor(
  item: PlatformCommandRevenueOperationsLedgerItem,
  state: PlatformCommandUnitEconomicsState,
): PlatformCommandMarginSignal {
  if (state === "blocked" || item.residualRisk === "high") return "negative";
  if (state === "cost_review" || state === "margin_watch" || item.residualRisk === "medium") return "thin";
  return "healthy";
}

export function platformCommandUnitEconomicsStateLabel(state: PlatformCommandUnitEconomicsState) {
  if (state === "blocked") return "Blocked";
  if (state === "cost_review") return "Cost review";
  if (state === "margin_watch") return "Margin watch";
  return "Efficient";
}

export function platformCommandMarginSignalLabel(signal: PlatformCommandMarginSignal) {
  if (signal === "negative") return "Negative";
  if (signal === "thin") return "Thin";
  return "Healthy";
}

function grossMarginBandFor(signal: PlatformCommandMarginSignal) {
  if (signal === "negative") return "不可計入 gross margin";
  if (signal === "thin") return "待確認 55%-70% gross margin";
  return "可進 70%+ gross margin";
}

function cogsDriverFor(item: PlatformCommandRevenueOperationsLedgerItem, signal: PlatformCommandMarginSignal) {
  if (signal === "negative") return `COGS 未鎖定：${item.collectionRisk}`;
  if (signal === "thin") return `資料成本 / 人工審核：${item.financeControl}`;
  return `標準資料倉儲與 API 成本：${item.financeControl}`;
}

function deliveryCostControlFor(
  item: PlatformCommandRevenueOperationsLedgerItem,
  state: PlatformCommandUnitEconomicsState,
) {
  if (state === "blocked") return `停止交付排程：${item.contractStatus}`;
  if (state === "cost_review") return `交付成本需 Finance gate：${item.billingStatus}`;
  if (state === "margin_watch") return `追蹤 onboarding 工時：${item.closeWindow}`;
  return `標準交付成本池：${item.operatingCadence}`;
}

function supportCostModelFor(item: PlatformCommandRevenueOperationsLedgerItem, signal: PlatformCommandMarginSignal) {
  if (signal === "negative") return "不開 SLA，避免支援成本放大";
  if (signal === "thin") return `限制高接觸支援：${item.buyerSegment}`;
  return `可進標準 enterprise support：${item.buyerSegment}`;
}

function paybackViewFor(item: PlatformCommandRevenueOperationsLedgerItem, signal: PlatformCommandMarginSignal) {
  if (signal === "negative") return `Payback 不可計算：${item.revenueRecognitionNote}`;
  if (signal === "thin") return `Payback 待複核：${item.arrTreatment}`;
  return `Payback 可進收入模型：${item.arrTreatment}`;
}

function pricingActionFor(item: PlatformCommandRevenueOperationsLedgerItem, signal: PlatformCommandMarginSignal) {
  if (signal === "negative") return `暫停定價承諾：${item.nextAction}`;
  if (signal === "thin") return `補 COGS 條款後再報價：${item.contractStatus}`;
  return `維持 enterprise price floor：${item.mrrMovement}`;
}

function marginRiskFor(item: PlatformCommandRevenueOperationsLedgerItem, signal: PlatformCommandMarginSignal) {
  if (signal === "negative") return `負毛利風險：${item.revenueRecognitionNote}`;
  if (signal === "thin") return `毛利壓縮風險：${item.collectionRisk}`;
  return `毛利風險低，殘餘風險為 ${platformCommandResidualRiskLabel(item.residualRisk)}`;
}

function financeCadenceFor(signal: PlatformCommandMarginSignal) {
  if (signal === "negative") return "每日 unit economics exception";
  if (signal === "thin") return "每週毛利複核";
  return "月度毛利檢查";
}

function decisionGateFor(
  item: PlatformCommandRevenueOperationsLedgerItem,
  state: PlatformCommandUnitEconomicsState,
) {
  if (state === "blocked") return `不得進商業化：${item.financeControl}`;
  if (state === "cost_review") return `Finance 確認成本與收入認列：${item.revenueRecognitionNote}`;
  if (state === "margin_watch") return `完成帳務設定後確認毛利：${item.billingStatus}`;
  return `可交給 Commercialization：${item.closeWindow}`;
}

function nextActionFor(item: PlatformCommandRevenueOperationsLedgerItem, state: PlatformCommandUnitEconomicsState) {
  if (state === "blocked") return `先解除收入與成本阻塞：${item.nextAction}`;
  if (state === "cost_review") return `由 ${item.revOpsOwner} 補成本證據與 finance gate`;
  if (state === "margin_watch") return `把 ${item.revOpsId} 放入本月毛利追蹤`;
  return "同步單位經濟、定價、毛利與商業化封裝";
}

function stateRank(state: PlatformCommandUnitEconomicsState) {
  if (state === "blocked") return 4;
  if (state === "cost_review") return 3;
  if (state === "margin_watch") return 2;
  return 1;
}

export function buildPlatformCommandUnitEconomicsItems(
  items: PlatformCommandRevenueOperationsLedgerItem[],
): PlatformCommandUnitEconomicsItem[] {
  return items
    .map((item, index) => {
      const unitEconomicsState = unitEconomicsStateFor(item);
      const marginSignal = marginSignalFor(item, unitEconomicsState);

      return {
        economicsId: `UEC-${String(index + 1).padStart(3, "0")}-${item.decisionId}`,
        revOpsId: item.revOpsId,
        forecastId: item.forecastId,
        decisionId: item.decisionId,
        owner: item.owner,
        financeOwner: item.revOpsOwner,
        unitEconomicsState,
        marginSignal,
        revOpsState: item.revOpsState,
        recognitionSignal: item.recognitionSignal,
        status: item.status,
        residualRisk: item.residualRisk,
        readinessScore: item.readinessScore,
        sourceRoute: item.sourceRoute,
        buyerSegment: item.buyerSegment,
        grossMarginBand: grossMarginBandFor(marginSignal),
        cogsDriver: cogsDriverFor(item, marginSignal),
        deliveryCostControl: deliveryCostControlFor(item, unitEconomicsState),
        supportCostModel: supportCostModelFor(item, marginSignal),
        paybackView: paybackViewFor(item, marginSignal),
        pricingAction: pricingActionFor(item, marginSignal),
        marginRisk: marginRiskFor(item, marginSignal),
        financeCadence: financeCadenceFor(marginSignal),
        decisionGate: decisionGateFor(item, unitEconomicsState),
        nextAction: nextActionFor(item, unitEconomicsState),
      };
    })
    .sort(
      (left, right) =>
        stateRank(right.unitEconomicsState) - stateRank(left.unitEconomicsState) ||
        left.readinessScore - right.readinessScore ||
        left.economicsId.localeCompare(right.economicsId, "zh-Hant"),
    );
}

export function summarizePlatformCommandUnitEconomics(
  items: PlatformCommandUnitEconomicsItem[],
): PlatformCommandUnitEconomicsSummary {
  const blockedCount = items.filter((item) => item.unitEconomicsState === "blocked").length;
  const costReviewCount = items.filter((item) => item.unitEconomicsState === "cost_review").length;
  const marginWatchCount = items.filter((item) => item.unitEconomicsState === "margin_watch").length;
  const negativeCount = items.filter((item) => item.marginSignal === "negative").length;
  const thinCount = items.filter((item) => item.marginSignal === "thin").length;
  const averageReadinessScore = items.length
    ? Math.round(items.reduce((sum, item) => sum + item.readinessScore, 0) / items.length)
    : 0;

  return {
    status: negativeCount > 0 ? "block" : thinCount > 0 ? "watch" : "pass",
    itemCount: items.length,
    blockedCount,
    costReviewCount,
    marginWatchCount,
    efficientCount: items.filter((item) => item.unitEconomicsState === "efficient").length,
    negativeCount,
    thinCount,
    healthyCount: items.filter((item) => item.marginSignal === "healthy").length,
    averageReadinessScore,
    nextMarginWindow:
      blockedCount > 0
        ? "不進毛利評估"
        : costReviewCount > 0
          ? "本週成本複核"
          : marginWatchCount > 0
            ? "本月毛利追蹤"
            : "可進定價委員會",
  };
}

export function platformCommandUnitEconomicsCsv(items: PlatformCommandUnitEconomicsItem[]) {
  const header = [
    "economics_id",
    "revops_id",
    "forecast_id",
    "decision_id",
    "owner",
    "finance_owner",
    "unit_economics_state",
    "margin_signal",
    "revops_state",
    "recognition_signal",
    "status",
    "residual_risk",
    "readiness_score",
    "source_route",
    "buyer_segment",
    "gross_margin_band",
    "cogs_driver",
    "delivery_cost_control",
    "support_cost_model",
    "payback_view",
    "pricing_action",
    "margin_risk",
    "finance_cadence",
    "decision_gate",
    "next_action",
  ];
  const rows = items.map((item) => [
    item.economicsId,
    item.revOpsId,
    item.forecastId,
    item.decisionId,
    item.owner,
    item.financeOwner,
    platformCommandUnitEconomicsStateLabel(item.unitEconomicsState),
    platformCommandMarginSignalLabel(item.marginSignal),
    platformCommandRevOpsStateLabel(item.revOpsState),
    platformCommandRevenueRecognitionSignalLabel(item.recognitionSignal),
    platformCommandStatusLabel(item.status),
    platformCommandResidualRiskLabel(item.residualRisk),
    item.readinessScore,
    item.sourceRoute,
    item.buyerSegment,
    item.grossMarginBand,
    item.cogsDriver,
    item.deliveryCostControl,
    item.supportCostModel,
    item.paybackView,
    item.pricingAction,
    item.marginRisk,
    item.financeCadence,
    item.decisionGate,
    item.nextAction,
  ]);

  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}
