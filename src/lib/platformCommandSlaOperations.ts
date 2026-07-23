import {
  platformCommandRevenueMeterSignalLabel,
  platformCommandSubscriptionBillingStateLabel,
  type PlatformCommandRevenueMeterSignal,
  type PlatformCommandSubscriptionBillingItem,
  type PlatformCommandSubscriptionBillingState,
} from "@/lib/platformCommandSubscriptionBilling";
import {
  platformCommandResidualRiskLabel,
  type PlatformCommandResidualRisk,
} from "@/lib/platformCommandClosure";
import { platformCommandStatusLabel } from "@/lib/platformCommandSearch";

export type PlatformCommandSlaState = "blocked" | "draft" | "incident_watch" | "active";
export type PlatformCommandServiceSignal = "no_sla" | "monitored" | "guaranteed";

export type PlatformCommandSlaOperationsItem = {
  slaId: string;
  billingId: string;
  entitlementId: string;
  decisionId: string;
  owner: string;
  slaOwner: string;
  slaState: PlatformCommandSlaState;
  serviceSignal: PlatformCommandServiceSignal;
  billingState: PlatformCommandSubscriptionBillingState;
  revenueMeterSignal: PlatformCommandRevenueMeterSignal;
  status: PlatformCommandSubscriptionBillingItem["status"];
  residualRisk: PlatformCommandResidualRisk;
  readinessScore: number;
  sourceRoute: string;
  buyerSegment: string;
  availabilityTarget: string;
  responseTarget: string;
  dataFreshnessTarget: string;
  supportCoverage: string;
  incidentProtocol: string;
  statusPagePlan: string;
  errorBudgetPolicy: string;
  serviceCreditPolicy: string;
  serviceCadence: string;
  decisionGate: string;
  nextAction: string;
};

export type PlatformCommandSlaOperationsSummary = {
  status: PlatformCommandSubscriptionBillingItem["status"];
  itemCount: number;
  blockedCount: number;
  draftCount: number;
  incidentWatchCount: number;
  activeCount: number;
  noSlaCount: number;
  monitoredCount: number;
  guaranteedCount: number;
  averageReadinessScore: number;
  nextServiceWindow: string;
};

function csvCell(value: unknown) {
  const stringValue = String(value ?? "");
  if (/[",\n]/.test(stringValue)) return `"${stringValue.replaceAll('"', '""')}"`;
  return stringValue;
}

function slaStateFor(item: PlatformCommandSubscriptionBillingItem): PlatformCommandSlaState {
  if (item.billingState === "blocked" || item.revenueMeterSignal === "disabled" || item.status === "block") {
    return "blocked";
  }
  if (item.billingState === "setup") return "draft";
  if (item.billingState === "invoice_review" || item.revenueMeterSignal === "manual") return "incident_watch";
  return "active";
}

function serviceSignalFor(
  item: PlatformCommandSubscriptionBillingItem,
  state: PlatformCommandSlaState,
): PlatformCommandServiceSignal {
  if (state === "blocked" || item.residualRisk === "high") return "no_sla";
  if (state === "draft" || state === "incident_watch" || item.residualRisk === "medium") return "monitored";
  return "guaranteed";
}

export function platformCommandSlaStateLabel(state: PlatformCommandSlaState) {
  if (state === "blocked") return "Blocked";
  if (state === "draft") return "Draft";
  if (state === "incident_watch") return "Incident watch";
  return "Active";
}

export function platformCommandServiceSignalLabel(signal: PlatformCommandServiceSignal) {
  if (signal === "no_sla") return "No SLA";
  if (signal === "monitored") return "Monitored";
  return "Guaranteed";
}

function availabilityTargetFor(item: PlatformCommandSubscriptionBillingItem, signal: PlatformCommandServiceSignal) {
  if (signal === "no_sla") return `不承諾 availability：${item.decisionGate}`;
  if (signal === "monitored") return `監控型 availability，先不給正式 credit：${item.subscriptionPlan}`;
  return `正式 availability target：${item.subscriptionPlan}`;
}

function responseTargetFor(item: PlatformCommandSubscriptionBillingItem, signal: PlatformCommandServiceSignal) {
  if (signal === "no_sla") return "不承諾回應時間";
  if (signal === "monitored") return `受控回應目標：${item.collectionsControl}`;
  return `標準 enterprise response target：${item.buyerSegment}`;
}

function dataFreshnessTargetFor(item: PlatformCommandSubscriptionBillingItem, signal: PlatformCommandServiceSignal) {
  if (signal === "no_sla") return "不承諾資料新鮮度";
  if (signal === "monitored") return `資料新鮮度先人工監控：${item.usageMeter}`;
  return `資料新鮮度可正式承諾：${item.usageMeter}`;
}

function supportCoverageFor(item: PlatformCommandSubscriptionBillingItem, state: PlatformCommandSlaState) {
  if (state === "blocked") return `Support 不接 SLA：${item.nextAction}`;
  if (state === "draft") return `建立 support coverage 草稿：${item.billingAccount}`;
  if (state === "incident_watch") return `支援涵蓋需加 incident watch：${item.invoiceRule}`;
  return `正式 support coverage：${item.buyerSegment}`;
}

function incidentProtocolFor(item: PlatformCommandSubscriptionBillingItem, signal: PlatformCommandServiceSignal) {
  if (signal === "no_sla") return "不建立 incident protocol";
  if (signal === "monitored") return `人工 incident protocol：${item.financeClose}`;
  return `正式 incident protocol + escalation：${item.financeClose}`;
}

function statusPagePlanFor(item: PlatformCommandSubscriptionBillingItem, signal: PlatformCommandServiceSignal) {
  if (signal === "no_sla") return "不對外發布 status page";
  if (signal === "monitored") return `內部 status page 追蹤：${item.sourceRoute}`;
  return `客戶可見 status page：${item.sourceRoute}`;
}

function errorBudgetPolicyFor(item: PlatformCommandSubscriptionBillingItem, signal: PlatformCommandServiceSignal) {
  if (signal === "no_sla") return `不開 error budget：${item.revenueSchedule}`;
  if (signal === "monitored") return `人工 error budget 檢查：${item.revenueSchedule}`;
  return "正式 error budget 與 burn-rate 追蹤";
}

function serviceCreditPolicyFor(item: PlatformCommandSubscriptionBillingItem, signal: PlatformCommandServiceSignal) {
  if (signal === "no_sla") return "不提供 service credit";
  if (signal === "monitored") return `service credit 需人工核准：${item.taxTreatment}`;
  return `標準 service credit policy：${platformCommandResidualRiskLabel(item.residualRisk)}`;
}

function serviceCadenceFor(signal: PlatformCommandServiceSignal) {
  if (signal === "no_sla") return "每日 SLA exception";
  if (signal === "monitored") return "每週 service review";
  return "月度 SLA QA";
}

function decisionGateFor(item: PlatformCommandSubscriptionBillingItem, state: PlatformCommandSlaState) {
  if (state === "blocked") return `不得承諾 SLA：${item.decisionGate}`;
  if (state === "draft") return `完成 billing setup 後才可出 SLA 草案：${item.billingAccount}`;
  if (state === "incident_watch") return `完成 invoice / metering review 後啟用 SLA：${item.usageMeter}`;
  return "可進正式 SLA、用量監控與營收稽核";
}

function nextActionFor(item: PlatformCommandSubscriptionBillingItem, state: PlatformCommandSlaState) {
  if (state === "blocked") return `先解除 SLA 阻塞：${item.nextAction}`;
  if (state === "draft") return `建立 SLA 草案與支援目標：${item.subscriptionPlan}`;
  if (state === "incident_watch") return `把 ${item.billingId} 放入 incident watch 與 service review`;
  return "把 SLA 輸出給用量監控、客戶成功與營收稽核";
}

function stateRank(state: PlatformCommandSlaState) {
  if (state === "blocked") return 4;
  if (state === "draft") return 3;
  if (state === "incident_watch") return 2;
  return 1;
}

export function buildPlatformCommandSlaOperationsItems(
  items: PlatformCommandSubscriptionBillingItem[],
): PlatformCommandSlaOperationsItem[] {
  return items
    .map((item, index) => {
      const slaState = slaStateFor(item);
      const serviceSignal = serviceSignalFor(item, slaState);

      return {
        slaId: `SLA-${String(index + 1).padStart(3, "0")}-${item.decisionId}`,
        billingId: item.billingId,
        entitlementId: item.entitlementId,
        decisionId: item.decisionId,
        owner: item.owner,
        slaOwner: item.billingOwner,
        slaState,
        serviceSignal,
        billingState: item.billingState,
        revenueMeterSignal: item.revenueMeterSignal,
        status: item.status,
        residualRisk: item.residualRisk,
        readinessScore: item.readinessScore,
        sourceRoute: item.sourceRoute,
        buyerSegment: item.buyerSegment,
        availabilityTarget: availabilityTargetFor(item, serviceSignal),
        responseTarget: responseTargetFor(item, serviceSignal),
        dataFreshnessTarget: dataFreshnessTargetFor(item, serviceSignal),
        supportCoverage: supportCoverageFor(item, slaState),
        incidentProtocol: incidentProtocolFor(item, serviceSignal),
        statusPagePlan: statusPagePlanFor(item, serviceSignal),
        errorBudgetPolicy: errorBudgetPolicyFor(item, serviceSignal),
        serviceCreditPolicy: serviceCreditPolicyFor(item, serviceSignal),
        serviceCadence: serviceCadenceFor(serviceSignal),
        decisionGate: decisionGateFor(item, slaState),
        nextAction: nextActionFor(item, slaState),
      };
    })
    .sort(
      (left, right) =>
        stateRank(right.slaState) - stateRank(left.slaState) ||
        left.readinessScore - right.readinessScore ||
        left.slaId.localeCompare(right.slaId, "zh-Hant"),
    );
}

export function summarizePlatformCommandSlaOperations(
  items: PlatformCommandSlaOperationsItem[],
): PlatformCommandSlaOperationsSummary {
  const blockedCount = items.filter((item) => item.slaState === "blocked").length;
  const draftCount = items.filter((item) => item.slaState === "draft").length;
  const incidentWatchCount = items.filter((item) => item.slaState === "incident_watch").length;
  const noSlaCount = items.filter((item) => item.serviceSignal === "no_sla").length;
  const monitoredCount = items.filter((item) => item.serviceSignal === "monitored").length;
  const averageReadinessScore = items.length
    ? Math.round(items.reduce((sum, item) => sum + item.readinessScore, 0) / items.length)
    : 0;

  return {
    status: noSlaCount > 0 ? "block" : monitoredCount > 0 ? "watch" : "pass",
    itemCount: items.length,
    blockedCount,
    draftCount,
    incidentWatchCount,
    activeCount: items.filter((item) => item.slaState === "active").length,
    noSlaCount,
    monitoredCount,
    guaranteedCount: items.filter((item) => item.serviceSignal === "guaranteed").length,
    averageReadinessScore,
    nextServiceWindow:
      blockedCount > 0
        ? "不承諾 SLA"
        : draftCount > 0
          ? "本週 SLA 草案"
          : incidentWatchCount > 0
            ? "本週 service review"
            : "可正式承諾",
  };
}

export function platformCommandSlaOperationsCsv(items: PlatformCommandSlaOperationsItem[]) {
  const header = [
    "sla_id",
    "billing_id",
    "entitlement_id",
    "decision_id",
    "owner",
    "sla_owner",
    "sla_state",
    "service_signal",
    "billing_state",
    "revenue_meter_signal",
    "status",
    "residual_risk",
    "readiness_score",
    "source_route",
    "buyer_segment",
    "availability_target",
    "response_target",
    "data_freshness_target",
    "support_coverage",
    "incident_protocol",
    "status_page_plan",
    "error_budget_policy",
    "service_credit_policy",
    "service_cadence",
    "decision_gate",
    "next_action",
  ];
  const rows = items.map((item) => [
    item.slaId,
    item.billingId,
    item.entitlementId,
    item.decisionId,
    item.owner,
    item.slaOwner,
    platformCommandSlaStateLabel(item.slaState),
    platformCommandServiceSignalLabel(item.serviceSignal),
    platformCommandSubscriptionBillingStateLabel(item.billingState),
    platformCommandRevenueMeterSignalLabel(item.revenueMeterSignal),
    platformCommandStatusLabel(item.status),
    platformCommandResidualRiskLabel(item.residualRisk),
    item.readinessScore,
    item.sourceRoute,
    item.buyerSegment,
    item.availabilityTarget,
    item.responseTarget,
    item.dataFreshnessTarget,
    item.supportCoverage,
    item.incidentProtocol,
    item.statusPagePlan,
    item.errorBudgetPolicy,
    item.serviceCreditPolicy,
    item.serviceCadence,
    item.decisionGate,
    item.nextAction,
  ]);

  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}
