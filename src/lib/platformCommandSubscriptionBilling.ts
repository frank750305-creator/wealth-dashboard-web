import {
  platformCommandAccessSignalLabel,
  platformCommandEntitlementStateLabel,
  type PlatformCommandAccessSignal,
  type PlatformCommandEntitlementProvisioningItem,
  type PlatformCommandEntitlementState,
} from "@/lib/platformCommandEntitlementProvisioning";
import {
  platformCommandResidualRiskLabel,
  type PlatformCommandResidualRisk,
} from "@/lib/platformCommandClosure";
import { platformCommandStatusLabel } from "@/lib/platformCommandSearch";

export type PlatformCommandSubscriptionBillingState = "blocked" | "setup" | "invoice_review" | "live";
export type PlatformCommandRevenueMeterSignal = "disabled" | "manual" | "automated";

export type PlatformCommandSubscriptionBillingItem = {
  billingId: string;
  entitlementId: string;
  quoteId: string;
  decisionId: string;
  owner: string;
  billingOwner: string;
  billingState: PlatformCommandSubscriptionBillingState;
  revenueMeterSignal: PlatformCommandRevenueMeterSignal;
  entitlementState: PlatformCommandEntitlementState;
  accessSignal: PlatformCommandAccessSignal;
  status: PlatformCommandEntitlementProvisioningItem["status"];
  residualRisk: PlatformCommandResidualRisk;
  readinessScore: number;
  sourceRoute: string;
  buyerSegment: string;
  subscriptionPlan: string;
  billingAccount: string;
  invoiceRule: string;
  usageMeter: string;
  taxTreatment: string;
  revenueSchedule: string;
  collectionsControl: string;
  dunningPlan: string;
  financeClose: string;
  decisionGate: string;
  nextAction: string;
};

export type PlatformCommandSubscriptionBillingSummary = {
  status: PlatformCommandEntitlementProvisioningItem["status"];
  itemCount: number;
  blockedCount: number;
  setupCount: number;
  invoiceReviewCount: number;
  liveCount: number;
  disabledCount: number;
  manualCount: number;
  automatedCount: number;
  averageReadinessScore: number;
  nextBillingWindow: string;
};

function csvCell(value: unknown) {
  const stringValue = String(value ?? "");
  if (/[",\n]/.test(stringValue)) return `"${stringValue.replaceAll('"', '""')}"`;
  return stringValue;
}

function billingStateFor(item: PlatformCommandEntitlementProvisioningItem): PlatformCommandSubscriptionBillingState {
  if (item.entitlementState === "blocked" || item.accessSignal === "denied" || item.status === "block") {
    return "blocked";
  }
  if (item.entitlementState === "provisioning") return "setup";
  if (item.entitlementState === "security_review" || item.accessSignal === "guarded") return "invoice_review";
  return "live";
}

function revenueMeterSignalFor(
  item: PlatformCommandEntitlementProvisioningItem,
  state: PlatformCommandSubscriptionBillingState,
): PlatformCommandRevenueMeterSignal {
  if (state === "blocked" || item.residualRisk === "high") return "disabled";
  if (state === "setup" || state === "invoice_review" || item.residualRisk === "medium") return "manual";
  return "automated";
}

export function platformCommandSubscriptionBillingStateLabel(state: PlatformCommandSubscriptionBillingState) {
  if (state === "blocked") return "Blocked";
  if (state === "setup") return "Setup";
  if (state === "invoice_review") return "Invoice review";
  return "Live";
}

export function platformCommandRevenueMeterSignalLabel(signal: PlatformCommandRevenueMeterSignal) {
  if (signal === "disabled") return "Disabled";
  if (signal === "manual") return "Manual";
  return "Automated";
}

function subscriptionPlanFor(
  item: PlatformCommandEntitlementProvisioningItem,
  state: PlatformCommandSubscriptionBillingState,
) {
  if (state === "blocked") return `不建立訂閱：${item.decisionGate}`;
  if (state === "setup") return `建立 trial / sandbox subscription：${item.accountPlan}`;
  if (state === "invoice_review") return `受控 subscription：${item.buyerSegment}`;
  return `正式 enterprise subscription：${item.buyerSegment}`;
}

function billingAccountFor(
  item: PlatformCommandEntitlementProvisioningItem,
  state: PlatformCommandSubscriptionBillingState,
) {
  if (state === "blocked") return "不建立 billing account";
  if (state === "setup") return `草稿 billing account：${item.accountPlan}`;
  if (state === "invoice_review") return `需 Finance 確認 billing account：${item.customerComms}`;
  return `正式 billing account + customer tenant：${item.accountPlan}`;
}

function invoiceRuleFor(item: PlatformCommandEntitlementProvisioningItem, signal: PlatformCommandRevenueMeterSignal) {
  if (signal === "disabled") return "不產生 invoice";
  if (signal === "manual") return `人工 invoice rule：${item.permissionBoundary}`;
  return `自動 invoice rule：${item.meteringPlan}`;
}

function usageMeterFor(item: PlatformCommandEntitlementProvisioningItem, signal: PlatformCommandRevenueMeterSignal) {
  if (signal === "disabled") return "不啟用 usage meter";
  if (signal === "manual") return `手動用量對帳：${item.meteringPlan}`;
  return `自動用量計量：${item.meteringPlan}`;
}

function taxTreatmentFor(item: PlatformCommandEntitlementProvisioningItem, state: PlatformCommandSubscriptionBillingState) {
  if (state === "blocked") return "稅務不處理";
  if (state === "setup") return `稅務資料待補：${item.buyerSegment}`;
  if (state === "invoice_review") return `稅務與發票條款待確認：${item.customerComms}`;
  return "稅務與 invoice metadata 完成";
}

function revenueScheduleFor(item: PlatformCommandEntitlementProvisioningItem, signal: PlatformCommandRevenueMeterSignal) {
  if (signal === "disabled") return `收入排程暫停：${item.securityReview}`;
  if (signal === "manual") return `收入排程需人工 gate：${item.slaPrerequisite}`;
  return `收入排程可自動進月結：${item.slaPrerequisite}`;
}

function collectionsControlFor(
  item: PlatformCommandEntitlementProvisioningItem,
  state: PlatformCommandSubscriptionBillingState,
) {
  if (state === "blocked") return `不進收款：${item.nextAction}`;
  if (state === "setup") return `收款條件待建立：${item.onboardingRunbook}`;
  if (state === "invoice_review") return `收款需 Finance review：${item.customerComms}`;
  return "收款控制可進標準流程";
}

function dunningPlanFor(signal: PlatformCommandRevenueMeterSignal) {
  if (signal === "disabled") return "不建立催收流程";
  if (signal === "manual") return "人工催收與帳齡追蹤";
  return "自動催收與帳齡追蹤";
}

function financeCloseFor(signal: PlatformCommandRevenueMeterSignal) {
  if (signal === "disabled") return "不進月結";
  if (signal === "manual") return "每週 billing review + 月結人工檢查";
  return "可進自動月結";
}

function decisionGateFor(
  item: PlatformCommandEntitlementProvisioningItem,
  state: PlatformCommandSubscriptionBillingState,
) {
  if (state === "blocked") return `不得建立訂閱帳務：${item.decisionGate}`;
  if (state === "setup") return `完成 account、metering、invoice 草稿：${item.meteringPlan}`;
  if (state === "invoice_review") return `Finance 確認 invoice / tax / collection：${item.customerComms}`;
  return "可進訂閱啟用、用量計費、月結與營收稽核";
}

function nextActionFor(
  item: PlatformCommandEntitlementProvisioningItem,
  state: PlatformCommandSubscriptionBillingState,
) {
  if (state === "blocked") return `先解除 billing 阻塞：${item.nextAction}`;
  if (state === "setup") return `建立 subscription draft 與 metering key：${item.meteringPlan}`;
  if (state === "invoice_review") return `完成發票、稅務與收款 review：${item.customerComms}`;
  return "把訂閱帳務交給 SLA、用量監控與營收稽核";
}

function stateRank(state: PlatformCommandSubscriptionBillingState) {
  if (state === "blocked") return 4;
  if (state === "setup") return 3;
  if (state === "invoice_review") return 2;
  return 1;
}

export function buildPlatformCommandSubscriptionBillingItems(
  items: PlatformCommandEntitlementProvisioningItem[],
): PlatformCommandSubscriptionBillingItem[] {
  return items
    .map((item, index) => {
      const billingState = billingStateFor(item);
      const revenueMeterSignal = revenueMeterSignalFor(item, billingState);

      return {
        billingId: `BIL-${String(index + 1).padStart(3, "0")}-${item.decisionId}`,
        entitlementId: item.entitlementId,
        quoteId: item.quoteId,
        decisionId: item.decisionId,
        owner: item.owner,
        billingOwner: item.accessOwner,
        billingState,
        revenueMeterSignal,
        entitlementState: item.entitlementState,
        accessSignal: item.accessSignal,
        status: item.status,
        residualRisk: item.residualRisk,
        readinessScore: item.readinessScore,
        sourceRoute: item.sourceRoute,
        buyerSegment: item.buyerSegment,
        subscriptionPlan: subscriptionPlanFor(item, billingState),
        billingAccount: billingAccountFor(item, billingState),
        invoiceRule: invoiceRuleFor(item, revenueMeterSignal),
        usageMeter: usageMeterFor(item, revenueMeterSignal),
        taxTreatment: taxTreatmentFor(item, billingState),
        revenueSchedule: revenueScheduleFor(item, revenueMeterSignal),
        collectionsControl: collectionsControlFor(item, billingState),
        dunningPlan: dunningPlanFor(revenueMeterSignal),
        financeClose: financeCloseFor(revenueMeterSignal),
        decisionGate: decisionGateFor(item, billingState),
        nextAction: nextActionFor(item, billingState),
      };
    })
    .sort(
      (left, right) =>
        stateRank(right.billingState) - stateRank(left.billingState) ||
        left.readinessScore - right.readinessScore ||
        left.billingId.localeCompare(right.billingId, "zh-Hant"),
    );
}

export function summarizePlatformCommandSubscriptionBilling(
  items: PlatformCommandSubscriptionBillingItem[],
): PlatformCommandSubscriptionBillingSummary {
  const blockedCount = items.filter((item) => item.billingState === "blocked").length;
  const setupCount = items.filter((item) => item.billingState === "setup").length;
  const invoiceReviewCount = items.filter((item) => item.billingState === "invoice_review").length;
  const disabledCount = items.filter((item) => item.revenueMeterSignal === "disabled").length;
  const manualCount = items.filter((item) => item.revenueMeterSignal === "manual").length;
  const averageReadinessScore = items.length
    ? Math.round(items.reduce((sum, item) => sum + item.readinessScore, 0) / items.length)
    : 0;

  return {
    status: disabledCount > 0 ? "block" : manualCount > 0 ? "watch" : "pass",
    itemCount: items.length,
    blockedCount,
    setupCount,
    invoiceReviewCount,
    liveCount: items.filter((item) => item.billingState === "live").length,
    disabledCount,
    manualCount,
    automatedCount: items.filter((item) => item.revenueMeterSignal === "automated").length,
    averageReadinessScore,
    nextBillingWindow:
      blockedCount > 0
        ? "不進帳務"
        : setupCount > 0
          ? "本週帳務設定"
          : invoiceReviewCount > 0
            ? "本週 invoice review"
            : "可進自動帳務",
  };
}

export function platformCommandSubscriptionBillingCsv(items: PlatformCommandSubscriptionBillingItem[]) {
  const header = [
    "billing_id",
    "entitlement_id",
    "quote_id",
    "decision_id",
    "owner",
    "billing_owner",
    "billing_state",
    "revenue_meter_signal",
    "entitlement_state",
    "access_signal",
    "status",
    "residual_risk",
    "readiness_score",
    "source_route",
    "buyer_segment",
    "subscription_plan",
    "billing_account",
    "invoice_rule",
    "usage_meter",
    "tax_treatment",
    "revenue_schedule",
    "collections_control",
    "dunning_plan",
    "finance_close",
    "decision_gate",
    "next_action",
  ];
  const rows = items.map((item) => [
    item.billingId,
    item.entitlementId,
    item.quoteId,
    item.decisionId,
    item.owner,
    item.billingOwner,
    platformCommandSubscriptionBillingStateLabel(item.billingState),
    platformCommandRevenueMeterSignalLabel(item.revenueMeterSignal),
    platformCommandEntitlementStateLabel(item.entitlementState),
    platformCommandAccessSignalLabel(item.accessSignal),
    platformCommandStatusLabel(item.status),
    platformCommandResidualRiskLabel(item.residualRisk),
    item.readinessScore,
    item.sourceRoute,
    item.buyerSegment,
    item.subscriptionPlan,
    item.billingAccount,
    item.invoiceRule,
    item.usageMeter,
    item.taxTreatment,
    item.revenueSchedule,
    item.collectionsControl,
    item.dunningPlan,
    item.financeClose,
    item.decisionGate,
    item.nextAction,
  ]);

  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}
