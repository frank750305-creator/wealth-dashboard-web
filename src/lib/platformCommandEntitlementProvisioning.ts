import {
  platformCommandQuoteDeskStateLabel,
  platformCommandQuoteRiskSignalLabel,
  type PlatformCommandQuoteDeskItem,
  type PlatformCommandQuoteDeskState,
  type PlatformCommandQuoteRiskSignal,
} from "@/lib/platformCommandQuoteDesk";
import {
  platformCommandResidualRiskLabel,
  type PlatformCommandResidualRisk,
} from "@/lib/platformCommandClosure";
import { platformCommandStatusLabel } from "@/lib/platformCommandSearch";

export type PlatformCommandEntitlementState = "blocked" | "provisioning" | "security_review" | "active";
export type PlatformCommandAccessSignal = "denied" | "guarded" | "clear";

export type PlatformCommandEntitlementProvisioningItem = {
  entitlementId: string;
  quoteId: string;
  pricingId: string;
  decisionId: string;
  owner: string;
  accessOwner: string;
  entitlementState: PlatformCommandEntitlementState;
  accessSignal: PlatformCommandAccessSignal;
  quoteDeskState: PlatformCommandQuoteDeskState;
  quoteRiskSignal: PlatformCommandQuoteRiskSignal;
  status: PlatformCommandQuoteDeskItem["status"];
  residualRisk: PlatformCommandResidualRisk;
  readinessScore: number;
  sourceRoute: string;
  buyerSegment: string;
  accountPlan: string;
  apiScope: string;
  dataProductScope: string;
  permissionBoundary: string;
  securityReview: string;
  onboardingRunbook: string;
  slaPrerequisite: string;
  meteringPlan: string;
  customerComms: string;
  provisionCadence: string;
  decisionGate: string;
  nextAction: string;
};

export type PlatformCommandEntitlementProvisioningSummary = {
  status: PlatformCommandQuoteDeskItem["status"];
  itemCount: number;
  blockedCount: number;
  provisioningCount: number;
  securityReviewCount: number;
  activeCount: number;
  deniedCount: number;
  guardedCount: number;
  clearCount: number;
  averageReadinessScore: number;
  nextProvisionWindow: string;
};

function csvCell(value: unknown) {
  const stringValue = String(value ?? "");
  if (/[",\n]/.test(stringValue)) return `"${stringValue.replaceAll('"', '""')}"`;
  return stringValue;
}

function entitlementStateFor(item: PlatformCommandQuoteDeskItem): PlatformCommandEntitlementState {
  if (item.quoteDeskState === "blocked" || item.quoteRiskSignal === "blocked" || item.status === "block") {
    return "blocked";
  }
  if (item.quoteDeskState === "draft") return "provisioning";
  if (item.quoteDeskState === "legal_review") return "security_review";
  return "active";
}

function accessSignalFor(
  item: PlatformCommandQuoteDeskItem,
  state: PlatformCommandEntitlementState,
): PlatformCommandAccessSignal {
  if (state === "blocked" || item.residualRisk === "high") return "denied";
  if (state === "provisioning" || state === "security_review" || item.residualRisk === "medium") return "guarded";
  return "clear";
}

export function platformCommandEntitlementStateLabel(state: PlatformCommandEntitlementState) {
  if (state === "blocked") return "Blocked";
  if (state === "provisioning") return "Provisioning";
  if (state === "security_review") return "Security review";
  return "Active";
}

export function platformCommandAccessSignalLabel(signal: PlatformCommandAccessSignal) {
  if (signal === "denied") return "Denied";
  if (signal === "guarded") return "Guarded";
  return "Clear";
}

function accountPlanFor(item: PlatformCommandQuoteDeskItem, state: PlatformCommandEntitlementState) {
  if (state === "blocked") return `不建立 account：${item.decisionGate}`;
  if (state === "provisioning") return `建立 sandbox account：${item.buyerSegment}`;
  if (state === "security_review") return `建立受控 account：${item.buyerSegment}`;
  return `正式 enterprise account：${item.buyerSegment}`;
}

function apiScopeFor(item: PlatformCommandQuoteDeskItem, signal: PlatformCommandAccessSignal) {
  if (signal === "denied") return "API scope 不開通";
  if (signal === "guarded") return `只開最小 API scope：${item.entitlementPlan}`;
  return `開通正式 API scope：${item.entitlementPlan}`;
}

function dataProductScopeFor(item: PlatformCommandQuoteDeskItem, signal: PlatformCommandAccessSignal) {
  if (signal === "denied") return `資料產品不授權：${item.buyerRisk}`;
  if (signal === "guarded") return `資料產品採 read-only / pilot：${item.offerPackage}`;
  return `資料產品可正式授權：${item.offerPackage}`;
}

function permissionBoundaryFor(item: PlatformCommandQuoteDeskItem, signal: PlatformCommandAccessSignal) {
  if (signal === "denied") return "禁止建立客戶權限";
  if (signal === "guarded") return `權限需限制 tenant、資料集與期間：${item.quoteTerms}`;
  return `標準 tenant boundary + audit logging：${item.buyerSegment}`;
}

function securityReviewFor(item: PlatformCommandQuoteDeskItem, state: PlatformCommandEntitlementState) {
  if (state === "blocked") return `Security 不收件：${item.legalNote}`;
  if (state === "provisioning") return `先做 provisioning checklist：${item.approvalPacket}`;
  if (state === "security_review") return `完成法務、安全與權限邊界確認：${item.legalNote}`;
  return "安全檢查通過，進入正式開通";
}

function onboardingRunbookFor(item: PlatformCommandQuoteDeskItem, state: PlatformCommandEntitlementState) {
  if (state === "blocked") return `不啟動 onboarding：${item.nextAction}`;
  if (state === "provisioning") return `準備 onboarding runbook：${item.deliveryHandoff}`;
  if (state === "security_review") return `runbook 需加入法務與權限限制：${item.deliveryHandoff}`;
  return "可執行正式 onboarding runbook";
}

function slaPrerequisiteFor(item: PlatformCommandQuoteDeskItem, signal: PlatformCommandAccessSignal) {
  if (signal === "denied") return "SLA 不生效";
  if (signal === "guarded") return `SLA 需待 quote desk review：${item.quoteCadence}`;
  return "SLA 前置條件完成，可進服務承諾";
}

function meteringPlanFor(item: PlatformCommandQuoteDeskItem, signal: PlatformCommandAccessSignal) {
  if (signal === "denied") return "不建立用量計量";
  if (signal === "guarded") return `建立 pilot metering：${item.buyerSegment}`;
  return `正式 metering + billing key：${item.buyerSegment}`;
}

function customerCommsFor(item: PlatformCommandQuoteDeskItem, state: PlatformCommandEntitlementState) {
  if (state === "blocked") return "不對客戶承諾開通";
  if (state === "provisioning") return `只同步草稿開通時程：${item.salesEnablement}`;
  if (state === "security_review") return `同步安全審查與條款限制：${item.quoteTerms}`;
  return "可發正式開通信與帳號資訊";
}

function provisionCadenceFor(signal: PlatformCommandAccessSignal) {
  if (signal === "denied") return "每日 entitlement exception";
  if (signal === "guarded") return "每週 entitlement review";
  return "月度 access QA";
}

function decisionGateFor(item: PlatformCommandQuoteDeskItem, state: PlatformCommandEntitlementState) {
  if (state === "blocked") return `不得開通：${item.decisionGate}`;
  if (state === "provisioning") return `完成 quote draft 與 account checklist：${item.approvalPacket}`;
  if (state === "security_review") return `安全、法務、權限邊界完成：${item.legalNote}`;
  return "可正式開通帳號、API、資料產品與 metering";
}

function nextActionFor(item: PlatformCommandQuoteDeskItem, state: PlatformCommandEntitlementState) {
  if (state === "blocked") return `先解除 entitlement 阻塞：${item.nextAction}`;
  if (state === "provisioning") return `建立 sandbox account 與最小權限：${item.entitlementPlan}`;
  if (state === "security_review") return `完成 security review 與 access boundary：${item.legalNote}`;
  return "把開通狀態交給訂閱帳務、SLA 與用量監控";
}

function stateRank(state: PlatformCommandEntitlementState) {
  if (state === "blocked") return 4;
  if (state === "provisioning") return 3;
  if (state === "security_review") return 2;
  return 1;
}

export function buildPlatformCommandEntitlementProvisioningItems(
  items: PlatformCommandQuoteDeskItem[],
): PlatformCommandEntitlementProvisioningItem[] {
  return items
    .map((item, index) => {
      const entitlementState = entitlementStateFor(item);
      const accessSignal = accessSignalFor(item, entitlementState);

      return {
        entitlementId: `ENT-${String(index + 1).padStart(3, "0")}-${item.decisionId}`,
        quoteId: item.quoteId,
        pricingId: item.pricingId,
        decisionId: item.decisionId,
        owner: item.owner,
        accessOwner: item.quoteOwner,
        entitlementState,
        accessSignal,
        quoteDeskState: item.quoteDeskState,
        quoteRiskSignal: item.quoteRiskSignal,
        status: item.status,
        residualRisk: item.residualRisk,
        readinessScore: item.readinessScore,
        sourceRoute: item.sourceRoute,
        buyerSegment: item.buyerSegment,
        accountPlan: accountPlanFor(item, entitlementState),
        apiScope: apiScopeFor(item, accessSignal),
        dataProductScope: dataProductScopeFor(item, accessSignal),
        permissionBoundary: permissionBoundaryFor(item, accessSignal),
        securityReview: securityReviewFor(item, entitlementState),
        onboardingRunbook: onboardingRunbookFor(item, entitlementState),
        slaPrerequisite: slaPrerequisiteFor(item, accessSignal),
        meteringPlan: meteringPlanFor(item, accessSignal),
        customerComms: customerCommsFor(item, entitlementState),
        provisionCadence: provisionCadenceFor(accessSignal),
        decisionGate: decisionGateFor(item, entitlementState),
        nextAction: nextActionFor(item, entitlementState),
      };
    })
    .sort(
      (left, right) =>
        stateRank(right.entitlementState) - stateRank(left.entitlementState) ||
        left.readinessScore - right.readinessScore ||
        left.entitlementId.localeCompare(right.entitlementId, "zh-Hant"),
    );
}

export function summarizePlatformCommandEntitlementProvisioning(
  items: PlatformCommandEntitlementProvisioningItem[],
): PlatformCommandEntitlementProvisioningSummary {
  const blockedCount = items.filter((item) => item.entitlementState === "blocked").length;
  const provisioningCount = items.filter((item) => item.entitlementState === "provisioning").length;
  const securityReviewCount = items.filter((item) => item.entitlementState === "security_review").length;
  const deniedCount = items.filter((item) => item.accessSignal === "denied").length;
  const guardedCount = items.filter((item) => item.accessSignal === "guarded").length;
  const averageReadinessScore = items.length
    ? Math.round(items.reduce((sum, item) => sum + item.readinessScore, 0) / items.length)
    : 0;

  return {
    status: deniedCount > 0 ? "block" : guardedCount > 0 ? "watch" : "pass",
    itemCount: items.length,
    blockedCount,
    provisioningCount,
    securityReviewCount,
    activeCount: items.filter((item) => item.entitlementState === "active").length,
    deniedCount,
    guardedCount,
    clearCount: items.filter((item) => item.accessSignal === "clear").length,
    averageReadinessScore,
    nextProvisionWindow:
      blockedCount > 0
        ? "不開通"
        : provisioningCount > 0
          ? "本週 sandbox 開通"
          : securityReviewCount > 0
            ? "本週安全審查"
            : "可正式開通",
  };
}

export function platformCommandEntitlementProvisioningCsv(items: PlatformCommandEntitlementProvisioningItem[]) {
  const header = [
    "entitlement_id",
    "quote_id",
    "pricing_id",
    "decision_id",
    "owner",
    "access_owner",
    "entitlement_state",
    "access_signal",
    "quote_desk_state",
    "quote_risk_signal",
    "status",
    "residual_risk",
    "readiness_score",
    "source_route",
    "buyer_segment",
    "account_plan",
    "api_scope",
    "data_product_scope",
    "permission_boundary",
    "security_review",
    "onboarding_runbook",
    "sla_prerequisite",
    "metering_plan",
    "customer_comms",
    "provision_cadence",
    "decision_gate",
    "next_action",
  ];
  const rows = items.map((item) => [
    item.entitlementId,
    item.quoteId,
    item.pricingId,
    item.decisionId,
    item.owner,
    item.accessOwner,
    platformCommandEntitlementStateLabel(item.entitlementState),
    platformCommandAccessSignalLabel(item.accessSignal),
    platformCommandQuoteDeskStateLabel(item.quoteDeskState),
    platformCommandQuoteRiskSignalLabel(item.quoteRiskSignal),
    platformCommandStatusLabel(item.status),
    platformCommandResidualRiskLabel(item.residualRisk),
    item.readinessScore,
    item.sourceRoute,
    item.buyerSegment,
    item.accountPlan,
    item.apiScope,
    item.dataProductScope,
    item.permissionBoundary,
    item.securityReview,
    item.onboardingRunbook,
    item.slaPrerequisite,
    item.meteringPlan,
    item.customerComms,
    item.provisionCadence,
    item.decisionGate,
    item.nextAction,
  ]);

  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}
