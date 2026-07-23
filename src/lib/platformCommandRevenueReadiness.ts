import {
  platformCommandProductPackageStateLabel,
  platformCommandRevenueSignalLabel,
  type PlatformCommandProductPackagingItem,
  type PlatformCommandProductPackageState,
  type PlatformCommandRevenueSignal,
} from "@/lib/platformCommandProductPackaging";
import {
  platformCommandResidualRiskLabel,
  type PlatformCommandResidualRisk,
} from "@/lib/platformCommandClosure";
import { platformCommandStatusLabel } from "@/lib/platformCommandSearch";

export type PlatformCommandRevenueReadinessState = "blocked" | "qualifying" | "contracting" | "bookable";
export type PlatformCommandBookingSignal = "no_go" | "pilot_only" | "bookable";

export type PlatformCommandRevenueReadinessItem = {
  revenueId: string;
  packageId: string;
  decisionId: string;
  owner: string;
  revenueOwner: string;
  revenueReadinessState: PlatformCommandRevenueReadinessState;
  bookingSignal: PlatformCommandBookingSignal;
  packageState: PlatformCommandProductPackageState;
  revenueSignal: PlatformCommandRevenueSignal;
  status: PlatformCommandProductPackagingItem["status"];
  residualRisk: PlatformCommandResidualRisk;
  readinessScore: number;
  sourceRoute: string;
  productTier: string;
  buyerSegment: string;
  salesMotion: string;
  qualifiedOffer: string;
  arrBand: string;
  contractGate: string;
  billingNote: string;
  customerSuccessHandoff: string;
  forecastTreatment: string;
  revenueRisk: string;
  nextAction: string;
};

export type PlatformCommandRevenueReadinessSummary = {
  status: PlatformCommandProductPackagingItem["status"];
  itemCount: number;
  blockedCount: number;
  qualifyingCount: number;
  contractingCount: number;
  bookableCount: number;
  noGoCount: number;
  pilotOnlyCount: number;
  bookableSignalCount: number;
  averageReadinessScore: number;
  nextRevenueWindow: string;
};

function csvCell(value: unknown) {
  const stringValue = String(value ?? "");
  if (/[",\n]/.test(stringValue)) return `"${stringValue.replaceAll('"', '""')}"`;
  return stringValue;
}

function revenueReadinessStateFor(item: PlatformCommandProductPackagingItem): PlatformCommandRevenueReadinessState {
  if (item.packageState === "blocked" || item.revenueSignal === "blocked" || item.status === "block") return "blocked";
  if (item.packageState === "pricing_review" || item.revenueSignal === "pilot") return "qualifying";
  if (item.packageState === "packaging") return "contracting";
  return "bookable";
}

function bookingSignalFor(
  item: PlatformCommandProductPackagingItem,
  state: PlatformCommandRevenueReadinessState,
): PlatformCommandBookingSignal {
  if (state === "blocked" || item.residualRisk === "high") return "no_go";
  if (state === "qualifying" || state === "contracting" || item.residualRisk === "medium") return "pilot_only";
  return "bookable";
}

export function platformCommandRevenueReadinessStateLabel(state: PlatformCommandRevenueReadinessState) {
  if (state === "blocked") return "Blocked";
  if (state === "qualifying") return "Qualifying";
  if (state === "contracting") return "Contracting";
  return "Bookable";
}

export function platformCommandBookingSignalLabel(signal: PlatformCommandBookingSignal) {
  if (signal === "no_go") return "No go";
  if (signal === "pilot_only") return "Pilot only";
  return "Bookable";
}

function buyerSegmentFor(item: PlatformCommandProductPackagingItem, signal: PlatformCommandBookingSignal) {
  if (signal === "no_go") return "內部治理 owner";
  if (signal === "pilot_only") return "顧問 pilot / 早期企業客戶";
  if (item.productTier === "Enterprise") return "企業投資研究 / CIO office";
  return "專業訂閱客戶";
}

function salesMotionFor(signal: PlatformCommandBookingSignal) {
  if (signal === "no_go") return "不進銷售漏斗";
  if (signal === "pilot_only") return "顧問帶測試與手動白名單";
  return "標準 demo + 訂閱提案";
}

function qualifiedOfferFor(item: PlatformCommandProductPackagingItem, signal: PlatformCommandBookingSignal) {
  if (signal === "no_go") return `暫停：${item.packageName}`;
  if (signal === "pilot_only") return `Pilot offer：${item.packageName}`;
  return `Paid offer：${item.packageName}`;
}

function arrBandFor(item: PlatformCommandProductPackagingItem, signal: PlatformCommandBookingSignal) {
  if (signal === "no_go") return "N/A";
  if (signal === "pilot_only") return "低承諾 pilot / 手動報價";
  if (item.productTier === "Enterprise") return "Enterprise ARR";
  return "Professional ARR";
}

function contractGateFor(item: PlatformCommandProductPackagingItem, signal: PlatformCommandBookingSignal) {
  if (signal === "no_go") return `需先解除：${item.nextAction}`;
  if (signal === "pilot_only") return `需確認權限與免責：${item.entitlementRule}`;
  return "可進標準訂閱條款";
}

function billingNoteFor(signal: PlatformCommandBookingSignal) {
  if (signal === "no_go") return "不可開帳";
  if (signal === "pilot_only") return "pilot 期不自動續約";
  return "可納入正式計費";
}

function customerSuccessHandoffFor(item: PlatformCommandProductPackagingItem, signal: PlatformCommandBookingSignal) {
  if (signal === "no_go") return "不交接 CS";
  if (signal === "pilot_only") return `CS 只接收 pilot 限制：${item.pricingCheck}`;
  return `CS 可接收正式 onboarding：${item.deliveryAsset}`;
}

function forecastTreatmentFor(signal: PlatformCommandBookingSignal) {
  if (signal === "no_go") return "不進 forecast";
  if (signal === "pilot_only") return "只進 upside / pilot pipeline";
  return "可進 base pipeline";
}

function revenueRiskFor(item: PlatformCommandProductPackagingItem, signal: PlatformCommandBookingSignal) {
  if (signal === "no_go") return item.nextAction;
  if (signal === "pilot_only") return `商業化限制：${item.pricingCheck}`;
  return `可銷售，殘餘風險為 ${platformCommandResidualRiskLabel(item.residualRisk)}`;
}

function nextActionFor(item: PlatformCommandProductPackagingItem, state: PlatformCommandRevenueReadinessState) {
  if (state === "blocked") return `先完成產品封裝阻塞：${item.nextAction}`;
  if (state === "qualifying") return `由 ${item.productOwner} 確認 pilot 價格與權限`;
  if (state === "contracting") return `補齊合約 gate：${item.entitlementRule}`;
  return "同步 sales pipeline 與 forecast";
}

function stateRank(state: PlatformCommandRevenueReadinessState) {
  if (state === "blocked") return 4;
  if (state === "qualifying") return 3;
  if (state === "contracting") return 2;
  return 1;
}

export function buildPlatformCommandRevenueReadinessItems(
  items: PlatformCommandProductPackagingItem[],
): PlatformCommandRevenueReadinessItem[] {
  return items
    .map((item, index) => {
      const revenueReadinessState = revenueReadinessStateFor(item);
      const bookingSignal = bookingSignalFor(item, revenueReadinessState);

      return {
        revenueId: `REV-${String(index + 1).padStart(3, "0")}-${item.decisionId}`,
        packageId: item.packageId,
        decisionId: item.decisionId,
        owner: item.owner,
        revenueOwner: item.productOwner,
        revenueReadinessState,
        bookingSignal,
        packageState: item.packageState,
        revenueSignal: item.revenueSignal,
        status: item.status,
        residualRisk: item.residualRisk,
        readinessScore: item.readinessScore,
        sourceRoute: item.sourceRoute,
        productTier: item.productTier,
        buyerSegment: buyerSegmentFor(item, bookingSignal),
        salesMotion: salesMotionFor(bookingSignal),
        qualifiedOffer: qualifiedOfferFor(item, bookingSignal),
        arrBand: arrBandFor(item, bookingSignal),
        contractGate: contractGateFor(item, bookingSignal),
        billingNote: billingNoteFor(bookingSignal),
        customerSuccessHandoff: customerSuccessHandoffFor(item, bookingSignal),
        forecastTreatment: forecastTreatmentFor(bookingSignal),
        revenueRisk: revenueRiskFor(item, bookingSignal),
        nextAction: nextActionFor(item, revenueReadinessState),
      };
    })
    .sort(
      (left, right) =>
        stateRank(right.revenueReadinessState) - stateRank(left.revenueReadinessState) ||
        left.readinessScore - right.readinessScore ||
        left.revenueId.localeCompare(right.revenueId, "zh-Hant"),
    );
}

export function summarizePlatformCommandRevenueReadiness(
  items: PlatformCommandRevenueReadinessItem[],
): PlatformCommandRevenueReadinessSummary {
  const blockedCount = items.filter((item) => item.revenueReadinessState === "blocked").length;
  const qualifyingCount = items.filter((item) => item.revenueReadinessState === "qualifying").length;
  const contractingCount = items.filter((item) => item.revenueReadinessState === "contracting").length;
  const noGoCount = items.filter((item) => item.bookingSignal === "no_go").length;
  const pilotOnlyCount = items.filter((item) => item.bookingSignal === "pilot_only").length;
  const averageReadinessScore = items.length
    ? Math.round(items.reduce((sum, item) => sum + item.readinessScore, 0) / items.length)
    : 0;

  return {
    status: noGoCount > 0 ? "block" : pilotOnlyCount > 0 ? "watch" : "pass",
    itemCount: items.length,
    blockedCount,
    qualifyingCount,
    contractingCount,
    bookableCount: items.filter((item) => item.revenueReadinessState === "bookable").length,
    noGoCount,
    pilotOnlyCount,
    bookableSignalCount: items.filter((item) => item.bookingSignal === "bookable").length,
    averageReadinessScore,
    nextRevenueWindow: blockedCount > 0 ? "暫不入帳" : qualifyingCount > 0 ? "本週 qualification" : contractingCount > 0 ? "本月合約確認" : "可入 pipeline",
  };
}

export function platformCommandRevenueReadinessCsv(items: PlatformCommandRevenueReadinessItem[]) {
  const header = [
    "revenue_id",
    "package_id",
    "decision_id",
    "owner",
    "revenue_owner",
    "revenue_readiness_state",
    "booking_signal",
    "package_state",
    "revenue_signal",
    "status",
    "residual_risk",
    "readiness_score",
    "source_route",
    "product_tier",
    "buyer_segment",
    "sales_motion",
    "qualified_offer",
    "arr_band",
    "contract_gate",
    "billing_note",
    "customer_success_handoff",
    "forecast_treatment",
    "revenue_risk",
    "next_action",
  ];
  const rows = items.map((item) => [
    item.revenueId,
    item.packageId,
    item.decisionId,
    item.owner,
    item.revenueOwner,
    platformCommandRevenueReadinessStateLabel(item.revenueReadinessState),
    platformCommandBookingSignalLabel(item.bookingSignal),
    platformCommandProductPackageStateLabel(item.packageState),
    platformCommandRevenueSignalLabel(item.revenueSignal),
    platformCommandStatusLabel(item.status),
    platformCommandResidualRiskLabel(item.residualRisk),
    item.readinessScore,
    item.sourceRoute,
    item.productTier,
    item.buyerSegment,
    item.salesMotion,
    item.qualifiedOffer,
    item.arrBand,
    item.contractGate,
    item.billingNote,
    item.customerSuccessHandoff,
    item.forecastTreatment,
    item.revenueRisk,
    item.nextAction,
  ]);

  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}
