import {
  platformCommandClientReadoutStateLabel,
  platformCommandDistributionSignalLabel,
  type PlatformCommandClientReadoutItem,
  type PlatformCommandClientReadoutState,
  type PlatformCommandDistributionSignal,
} from "@/lib/platformCommandClientReadout";
import {
  platformCommandResidualRiskLabel,
  type PlatformCommandResidualRisk,
} from "@/lib/platformCommandClosure";
import { platformCommandStatusLabel } from "@/lib/platformCommandSearch";

export type PlatformCommandProductPackageState = "blocked" | "pricing_review" | "packaging" | "market_ready";
export type PlatformCommandRevenueSignal = "blocked" | "pilot" | "sellable";

export type PlatformCommandProductPackagingItem = {
  packageId: string;
  readoutId: string;
  decisionId: string;
  owner: string;
  productOwner: string;
  packageState: PlatformCommandProductPackageState;
  revenueSignal: PlatformCommandRevenueSignal;
  clientReadoutState: PlatformCommandClientReadoutState;
  distributionSignal: PlatformCommandDistributionSignal;
  status: PlatformCommandClientReadoutItem["status"];
  residualRisk: PlatformCommandResidualRisk;
  readinessScore: number;
  sourceRoute: string;
  productTier: string;
  packageName: string;
  valueProposition: string;
  pricingCheck: string;
  entitlementRule: string;
  deliveryAsset: string;
  salesNote: string;
  launchChannel: string;
  launchWindow: string;
  nextAction: string;
};

export type PlatformCommandProductPackagingSummary = {
  status: PlatformCommandClientReadoutItem["status"];
  itemCount: number;
  blockedCount: number;
  pricingReviewCount: number;
  packagingCount: number;
  marketReadyCount: number;
  blockedRevenueCount: number;
  pilotCount: number;
  sellableCount: number;
  averageReadinessScore: number;
  nextLaunchWindow: string;
};

function csvCell(value: unknown) {
  const stringValue = String(value ?? "");
  if (/[",\n]/.test(stringValue)) return `"${stringValue.replaceAll('"', '""')}"`;
  return stringValue;
}

function packageStateFor(item: PlatformCommandClientReadoutItem): PlatformCommandProductPackageState {
  if (item.clientReadoutState === "blocked" || item.distributionSignal === "restricted" || item.status === "block") {
    return "blocked";
  }
  if (item.distributionSignal === "internal_only") return "pricing_review";
  if (item.clientReadoutState === "review") return "packaging";
  return "market_ready";
}

function revenueSignalFor(
  item: PlatformCommandClientReadoutItem,
  state: PlatformCommandProductPackageState,
): PlatformCommandRevenueSignal {
  if (state === "blocked" || item.residualRisk === "high") return "blocked";
  if (state === "pricing_review" || state === "packaging" || item.residualRisk === "medium") return "pilot";
  return "sellable";
}

export function platformCommandProductPackageStateLabel(state: PlatformCommandProductPackageState) {
  if (state === "blocked") return "Blocked";
  if (state === "pricing_review") return "Pricing review";
  if (state === "packaging") return "Packaging";
  return "Market ready";
}

export function platformCommandRevenueSignalLabel(signal: PlatformCommandRevenueSignal) {
  if (signal === "blocked") return "Blocked";
  if (signal === "pilot") return "Pilot";
  return "Sellable";
}

function productTierFor(item: PlatformCommandClientReadoutItem, signal: PlatformCommandRevenueSignal) {
  if (signal === "blocked") return "Internal";
  if (signal === "pilot") return "Pilot / Advisor";
  if (item.residualRisk === "low") return "Enterprise";
  return "Professional";
}

function packageNameFor(item: PlatformCommandClientReadoutItem, signal: PlatformCommandRevenueSignal) {
  if (signal === "blocked") return `Internal command note - ${item.decisionId}`;
  if (signal === "pilot") return `Advisor command readout - ${item.decisionId}`;
  return `Client command intelligence - ${item.decisionId}`;
}

function valuePropositionFor(item: PlatformCommandClientReadoutItem, signal: PlatformCommandRevenueSignal) {
  if (signal === "blocked") return "保留內部治理上下文，避免未核准內容外流";
  if (signal === "pilot") return `協助顧問理解 ${item.clientHeadline} 的揭露限制`;
  return `把 ${item.clientHeadline} 轉成可訂閱的資料分析交付`;
}

function pricingCheckFor(item: PlatformCommandClientReadoutItem, signal: PlatformCommandRevenueSignal) {
  if (signal === "blocked") return "不可定價";
  if (signal === "pilot") return `需確認 ${item.clientOwner} 的 pilot 範圍`;
  return "可納入企業訂閱或研究模組";
}

function entitlementRuleFor(signal: PlatformCommandRevenueSignal) {
  if (signal === "blocked") return "Internal only";
  if (signal === "pilot") return "Advisor pilot";
  return "Paid client access";
}

function launchChannelFor(signal: PlatformCommandRevenueSignal) {
  if (signal === "blocked") return "內部治理清單";
  if (signal === "pilot") return "顧問 pilot workspace";
  return "客戶 dashboard / API / 週報";
}

function launchWindowFor(state: PlatformCommandProductPackageState) {
  if (state === "blocked") return "暫緩";
  if (state === "pricing_review") return "本週定價檢查";
  if (state === "packaging") return "本月封裝";
  return "可上架";
}

function nextActionFor(item: PlatformCommandClientReadoutItem, state: PlatformCommandProductPackageState) {
  if (state === "blocked") return `先解除交付限制：${item.nextAction}`;
  if (state === "pricing_review") return `定義 pilot 權限與免責：${item.requiredDisclaimer}`;
  if (state === "packaging") return `把 ${item.appendixLocation} 整理成產品附件`;
  return "同步商業化目錄與銷售話術";
}

function stateRank(state: PlatformCommandProductPackageState) {
  if (state === "blocked") return 4;
  if (state === "pricing_review") return 3;
  if (state === "packaging") return 2;
  return 1;
}

export function buildPlatformCommandProductPackagingItems(
  items: PlatformCommandClientReadoutItem[],
): PlatformCommandProductPackagingItem[] {
  return items
    .map((item, index) => {
      const packageState = packageStateFor(item);
      const revenueSignal = revenueSignalFor(item, packageState);

      return {
        packageId: `PKG-${String(index + 1).padStart(3, "0")}-${item.decisionId}`,
        readoutId: item.readoutId,
        decisionId: item.decisionId,
        owner: item.owner,
        productOwner: item.clientOwner,
        packageState,
        revenueSignal,
        clientReadoutState: item.clientReadoutState,
        distributionSignal: item.distributionSignal,
        status: item.status,
        residualRisk: item.residualRisk,
        readinessScore: item.readinessScore,
        sourceRoute: item.sourceRoute,
        productTier: productTierFor(item, revenueSignal),
        packageName: packageNameFor(item, revenueSignal),
        valueProposition: valuePropositionFor(item, revenueSignal),
        pricingCheck: pricingCheckFor(item, revenueSignal),
        entitlementRule: entitlementRuleFor(revenueSignal),
        deliveryAsset: item.appendixLocation,
        salesNote: item.permittedMessage,
        launchChannel: launchChannelFor(revenueSignal),
        launchWindow: launchWindowFor(packageState),
        nextAction: nextActionFor(item, packageState),
      };
    })
    .sort(
      (left, right) =>
        stateRank(right.packageState) - stateRank(left.packageState) ||
        left.readinessScore - right.readinessScore ||
        left.packageId.localeCompare(right.packageId, "zh-Hant"),
    );
}

export function summarizePlatformCommandProductPackaging(
  items: PlatformCommandProductPackagingItem[],
): PlatformCommandProductPackagingSummary {
  const blockedCount = items.filter((item) => item.packageState === "blocked").length;
  const pricingReviewCount = items.filter((item) => item.packageState === "pricing_review").length;
  const packagingCount = items.filter((item) => item.packageState === "packaging").length;
  const blockedRevenueCount = items.filter((item) => item.revenueSignal === "blocked").length;
  const pilotCount = items.filter((item) => item.revenueSignal === "pilot").length;
  const averageReadinessScore = items.length
    ? Math.round(items.reduce((sum, item) => sum + item.readinessScore, 0) / items.length)
    : 0;

  return {
    status: blockedRevenueCount > 0 ? "block" : pilotCount > 0 ? "watch" : "pass",
    itemCount: items.length,
    blockedCount,
    pricingReviewCount,
    packagingCount,
    marketReadyCount: items.filter((item) => item.packageState === "market_ready").length,
    blockedRevenueCount,
    pilotCount,
    sellableCount: items.filter((item) => item.revenueSignal === "sellable").length,
    averageReadinessScore,
    nextLaunchWindow: blockedCount > 0 ? "暫緩" : pricingReviewCount > 0 ? "本週定價檢查" : packagingCount > 0 ? "本月封裝" : "可上架",
  };
}

export function platformCommandProductPackagingCsv(items: PlatformCommandProductPackagingItem[]) {
  const header = [
    "package_id",
    "readout_id",
    "decision_id",
    "owner",
    "product_owner",
    "package_state",
    "revenue_signal",
    "client_readout_state",
    "distribution_signal",
    "status",
    "residual_risk",
    "readiness_score",
    "source_route",
    "product_tier",
    "package_name",
    "value_proposition",
    "pricing_check",
    "entitlement_rule",
    "delivery_asset",
    "sales_note",
    "launch_channel",
    "launch_window",
    "next_action",
  ];
  const rows = items.map((item) => [
    item.packageId,
    item.readoutId,
    item.decisionId,
    item.owner,
    item.productOwner,
    platformCommandProductPackageStateLabel(item.packageState),
    platformCommandRevenueSignalLabel(item.revenueSignal),
    platformCommandClientReadoutStateLabel(item.clientReadoutState),
    platformCommandDistributionSignalLabel(item.distributionSignal),
    platformCommandStatusLabel(item.status),
    platformCommandResidualRiskLabel(item.residualRisk),
    item.readinessScore,
    item.sourceRoute,
    item.productTier,
    item.packageName,
    item.valueProposition,
    item.pricingCheck,
    item.entitlementRule,
    item.deliveryAsset,
    item.salesNote,
    item.launchChannel,
    item.launchWindow,
    item.nextAction,
  ]);

  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}
