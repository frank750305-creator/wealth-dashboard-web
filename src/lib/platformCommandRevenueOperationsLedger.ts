import {
  platformCommandNrrSignalLabel,
  platformCommandRenewalForecastStateLabel,
  type PlatformCommandNrrSignal,
  type PlatformCommandRenewalForecastItem,
  type PlatformCommandRenewalForecastState,
} from "@/lib/platformCommandRenewalForecast";
import {
  platformCommandResidualRiskLabel,
  type PlatformCommandResidualRisk,
} from "@/lib/platformCommandClosure";
import { platformCommandStatusLabel } from "@/lib/platformCommandSearch";

export type PlatformCommandRevOpsState = "blocked" | "contract_review" | "billing_setup" | "revenue_live";
export type PlatformCommandRevenueRecognitionSignal = "defer" | "manual_review" | "recognizable";

export type PlatformCommandRevenueOperationsLedgerItem = {
  revOpsId: string;
  forecastId: string;
  expansionId: string;
  decisionId: string;
  owner: string;
  revOpsOwner: string;
  revOpsState: PlatformCommandRevOpsState;
  recognitionSignal: PlatformCommandRevenueRecognitionSignal;
  renewalForecastState: PlatformCommandRenewalForecastState;
  nrrSignal: PlatformCommandNrrSignal;
  status: PlatformCommandRenewalForecastItem["status"];
  residualRisk: PlatformCommandResidualRisk;
  readinessScore: number;
  sourceRoute: string;
  buyerSegment: string;
  contractStatus: string;
  billingStatus: string;
  arrTreatment: string;
  mrrMovement: string;
  revenueRecognitionNote: string;
  collectionRisk: string;
  financeControl: string;
  operatingCadence: string;
  closeWindow: string;
  nextAction: string;
};

export type PlatformCommandRevenueOperationsLedgerSummary = {
  status: PlatformCommandRenewalForecastItem["status"];
  itemCount: number;
  blockedCount: number;
  contractReviewCount: number;
  billingSetupCount: number;
  revenueLiveCount: number;
  deferCount: number;
  manualReviewCount: number;
  recognizableCount: number;
  averageReadinessScore: number;
  nextCloseWindow: string;
};

function csvCell(value: unknown) {
  const stringValue = String(value ?? "");
  if (/[",\n]/.test(stringValue)) return `"${stringValue.replaceAll('"', '""')}"`;
  return stringValue;
}

function revOpsStateFor(item: PlatformCommandRenewalForecastItem): PlatformCommandRevOpsState {
  if (item.renewalForecastState === "blocked" || item.nrrSignal === "contraction" || item.status === "block") {
    return "blocked";
  }
  if (item.renewalForecastState === "protect" || item.nrrSignal === "flat") return "contract_review";
  if (item.renewalForecastState === "commit_review") return "billing_setup";
  return "revenue_live";
}

function recognitionSignalFor(
  item: PlatformCommandRenewalForecastItem,
  state: PlatformCommandRevOpsState,
): PlatformCommandRevenueRecognitionSignal {
  if (state === "blocked" || item.residualRisk === "high") return "defer";
  if (state === "contract_review" || state === "billing_setup" || item.residualRisk === "medium") {
    return "manual_review";
  }
  return "recognizable";
}

export function platformCommandRevOpsStateLabel(state: PlatformCommandRevOpsState) {
  if (state === "blocked") return "Blocked";
  if (state === "contract_review") return "Contract review";
  if (state === "billing_setup") return "Billing setup";
  return "Revenue live";
}

export function platformCommandRevenueRecognitionSignalLabel(signal: PlatformCommandRevenueRecognitionSignal) {
  if (signal === "defer") return "Defer";
  if (signal === "manual_review") return "Manual review";
  return "Recognizable";
}

function contractStatusFor(item: PlatformCommandRenewalForecastItem, signal: PlatformCommandRevenueRecognitionSignal) {
  if (signal === "defer") return `合約暫停：${item.forecastRisk}`;
  if (signal === "manual_review") return `需人工確認：${item.pricingAction}`;
  return `可進標準條款：${item.executiveSponsor}`;
}

function billingStatusFor(item: PlatformCommandRenewalForecastItem, signal: PlatformCommandRevenueRecognitionSignal) {
  if (signal === "defer") return "不建立帳單";
  if (signal === "manual_review") return `建立草稿帳單：${item.forecastCategory}`;
  return `可正式開帳：${item.forecastCategory}`;
}

function arrTreatmentFor(item: PlatformCommandRenewalForecastItem, signal: PlatformCommandRevenueRecognitionSignal) {
  if (signal === "defer") return "不計 ARR";
  if (signal === "manual_review") return `只計 weighted ARR：${item.nrrDirection}`;
  return `可計 committed ARR：${item.nrrDirection}`;
}

function mrrMovementFor(signal: PlatformCommandRevenueRecognitionSignal) {
  if (signal === "defer") return "MRR 暫不變動";
  if (signal === "manual_review") return "MRR 待 finance review";
  return "MRR 可入帳";
}

function recognitionNoteFor(item: PlatformCommandRenewalForecastItem, signal: PlatformCommandRevenueRecognitionSignal) {
  if (signal === "defer") return `收入遞延：${item.forecastRisk}`;
  if (signal === "manual_review") return `需確認收入條件：${item.commercialEvidence}`;
  return `可認列，殘餘風險為 ${platformCommandResidualRiskLabel(item.residualRisk)}`;
}

function collectionRiskFor(item: PlatformCommandRenewalForecastItem, signal: PlatformCommandRevenueRecognitionSignal) {
  if (signal === "defer") return item.forecastRisk;
  if (signal === "manual_review") return `收款風險取決於 QBR：${item.qbrAction}`;
  return `收款風險低：${item.renewalProbability}`;
}

function financeControlFor(signal: PlatformCommandRevenueRecognitionSignal) {
  if (signal === "defer") return "Finance hold";
  if (signal === "manual_review") return "RevOps + Finance manual gate";
  return "Standard revenue control";
}

function operatingCadenceFor(signal: PlatformCommandRevenueRecognitionSignal) {
  if (signal === "defer") return "每日例外追蹤";
  if (signal === "manual_review") return "每週 RevOps review";
  return "月結檢查";
}

function closeWindowFor(state: PlatformCommandRevOpsState) {
  if (state === "blocked") return "不進月結";
  if (state === "contract_review") return "本週合約確認";
  if (state === "billing_setup") return "本月帳務設定";
  return "可進月結";
}

function nextActionFor(item: PlatformCommandRenewalForecastItem, state: PlatformCommandRevOpsState) {
  if (state === "blocked") return `先解除 forecast 阻塞：${item.nextAction}`;
  if (state === "contract_review") return `確認合約與 sponsor：${item.executiveSponsor}`;
  if (state === "billing_setup") return `設定帳單與 ARR 處理：${item.pricingAction}`;
  return "同步 RevOps ledger、月結與管理層收入視圖";
}

function stateRank(state: PlatformCommandRevOpsState) {
  if (state === "blocked") return 4;
  if (state === "contract_review") return 3;
  if (state === "billing_setup") return 2;
  return 1;
}

export function buildPlatformCommandRevenueOperationsLedgerItems(
  items: PlatformCommandRenewalForecastItem[],
): PlatformCommandRevenueOperationsLedgerItem[] {
  return items
    .map((item, index) => {
      const revOpsState = revOpsStateFor(item);
      const recognitionSignal = recognitionSignalFor(item, revOpsState);

      return {
        revOpsId: `RVO-${String(index + 1).padStart(3, "0")}-${item.decisionId}`,
        forecastId: item.forecastId,
        expansionId: item.expansionId,
        decisionId: item.decisionId,
        owner: item.owner,
        revOpsOwner: item.forecastOwner,
        revOpsState,
        recognitionSignal,
        renewalForecastState: item.renewalForecastState,
        nrrSignal: item.nrrSignal,
        status: item.status,
        residualRisk: item.residualRisk,
        readinessScore: item.readinessScore,
        sourceRoute: item.sourceRoute,
        buyerSegment: item.buyerSegment,
        contractStatus: contractStatusFor(item, recognitionSignal),
        billingStatus: billingStatusFor(item, recognitionSignal),
        arrTreatment: arrTreatmentFor(item, recognitionSignal),
        mrrMovement: mrrMovementFor(recognitionSignal),
        revenueRecognitionNote: recognitionNoteFor(item, recognitionSignal),
        collectionRisk: collectionRiskFor(item, recognitionSignal),
        financeControl: financeControlFor(recognitionSignal),
        operatingCadence: operatingCadenceFor(recognitionSignal),
        closeWindow: closeWindowFor(revOpsState),
        nextAction: nextActionFor(item, revOpsState),
      };
    })
    .sort(
      (left, right) =>
        stateRank(right.revOpsState) - stateRank(left.revOpsState) ||
        left.readinessScore - right.readinessScore ||
        left.revOpsId.localeCompare(right.revOpsId, "zh-Hant"),
    );
}

export function summarizePlatformCommandRevenueOperationsLedger(
  items: PlatformCommandRevenueOperationsLedgerItem[],
): PlatformCommandRevenueOperationsLedgerSummary {
  const blockedCount = items.filter((item) => item.revOpsState === "blocked").length;
  const contractReviewCount = items.filter((item) => item.revOpsState === "contract_review").length;
  const billingSetupCount = items.filter((item) => item.revOpsState === "billing_setup").length;
  const deferCount = items.filter((item) => item.recognitionSignal === "defer").length;
  const manualReviewCount = items.filter((item) => item.recognitionSignal === "manual_review").length;
  const averageReadinessScore = items.length
    ? Math.round(items.reduce((sum, item) => sum + item.readinessScore, 0) / items.length)
    : 0;

  return {
    status: deferCount > 0 ? "block" : manualReviewCount > 0 ? "watch" : "pass",
    itemCount: items.length,
    blockedCount,
    contractReviewCount,
    billingSetupCount,
    revenueLiveCount: items.filter((item) => item.revOpsState === "revenue_live").length,
    deferCount,
    manualReviewCount,
    recognizableCount: items.filter((item) => item.recognitionSignal === "recognizable").length,
    averageReadinessScore,
    nextCloseWindow: blockedCount > 0 ? "不進月結" : contractReviewCount > 0 ? "本週合約確認" : billingSetupCount > 0 ? "本月帳務設定" : "可進月結",
  };
}

export function platformCommandRevenueOperationsLedgerCsv(items: PlatformCommandRevenueOperationsLedgerItem[]) {
  const header = [
    "revops_id",
    "forecast_id",
    "expansion_id",
    "decision_id",
    "owner",
    "revops_owner",
    "revops_state",
    "recognition_signal",
    "renewal_forecast_state",
    "nrr_signal",
    "status",
    "residual_risk",
    "readiness_score",
    "source_route",
    "buyer_segment",
    "contract_status",
    "billing_status",
    "arr_treatment",
    "mrr_movement",
    "revenue_recognition_note",
    "collection_risk",
    "finance_control",
    "operating_cadence",
    "close_window",
    "next_action",
  ];
  const rows = items.map((item) => [
    item.revOpsId,
    item.forecastId,
    item.expansionId,
    item.decisionId,
    item.owner,
    item.revOpsOwner,
    platformCommandRevOpsStateLabel(item.revOpsState),
    platformCommandRevenueRecognitionSignalLabel(item.recognitionSignal),
    platformCommandRenewalForecastStateLabel(item.renewalForecastState),
    platformCommandNrrSignalLabel(item.nrrSignal),
    platformCommandStatusLabel(item.status),
    platformCommandResidualRiskLabel(item.residualRisk),
    item.readinessScore,
    item.sourceRoute,
    item.buyerSegment,
    item.contractStatus,
    item.billingStatus,
    item.arrTreatment,
    item.mrrMovement,
    item.revenueRecognitionNote,
    item.collectionRisk,
    item.financeControl,
    item.operatingCadence,
    item.closeWindow,
    item.nextAction,
  ]);

  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}
