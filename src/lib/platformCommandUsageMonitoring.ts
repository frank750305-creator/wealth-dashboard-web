import {
  platformCommandServiceSignalLabel,
  platformCommandSlaStateLabel,
  type PlatformCommandServiceSignal,
  type PlatformCommandSlaOperationsItem,
  type PlatformCommandSlaState,
} from "@/lib/platformCommandSlaOperations";
import {
  platformCommandResidualRiskLabel,
  type PlatformCommandResidualRisk,
} from "@/lib/platformCommandClosure";
import { platformCommandStatusLabel } from "@/lib/platformCommandSearch";

export type PlatformCommandUsageMonitoringState = "blocked" | "instrumentation_setup" | "anomaly_watch" | "live";
export type PlatformCommandUsageSignal = "unmetered" | "sampled" | "real_time";

export type PlatformCommandUsageMonitoringItem = {
  usageId: string;
  slaId: string;
  billingId: string;
  decisionId: string;
  owner: string;
  usageOwner: string;
  usageState: PlatformCommandUsageMonitoringState;
  usageSignal: PlatformCommandUsageSignal;
  slaState: PlatformCommandSlaState;
  serviceSignal: PlatformCommandServiceSignal;
  status: PlatformCommandSlaOperationsItem["status"];
  residualRisk: PlatformCommandResidualRisk;
  readinessScore: number;
  sourceRoute: string;
  buyerSegment: string;
  telemetryScope: string;
  eventSchema: string;
  meteringKey: string;
  quotaPolicy: string;
  anomalyRule: string;
  alertRoute: string;
  billingReconciliation: string;
  customerUsageView: string;
  dataRetention: string;
  monitoringCadence: string;
  decisionGate: string;
  nextAction: string;
};

export type PlatformCommandUsageMonitoringSummary = {
  status: PlatformCommandSlaOperationsItem["status"];
  itemCount: number;
  blockedCount: number;
  instrumentationSetupCount: number;
  anomalyWatchCount: number;
  liveCount: number;
  unmeteredCount: number;
  sampledCount: number;
  realTimeCount: number;
  averageReadinessScore: number;
  nextMonitoringWindow: string;
};

function csvCell(value: unknown) {
  const stringValue = String(value ?? "");
  if (/[",\n]/.test(stringValue)) return `"${stringValue.replaceAll('"', '""')}"`;
  return stringValue;
}

function usageStateFor(item: PlatformCommandSlaOperationsItem): PlatformCommandUsageMonitoringState {
  if (item.slaState === "blocked" || item.serviceSignal === "no_sla" || item.status === "block") {
    return "blocked";
  }
  if (item.slaState === "draft") return "instrumentation_setup";
  if (item.slaState === "incident_watch" || item.serviceSignal === "monitored") return "anomaly_watch";
  return "live";
}

function usageSignalFor(
  item: PlatformCommandSlaOperationsItem,
  state: PlatformCommandUsageMonitoringState,
): PlatformCommandUsageSignal {
  if (state === "blocked" || item.residualRisk === "high") return "unmetered";
  if (state === "instrumentation_setup" || state === "anomaly_watch" || item.residualRisk === "medium") {
    return "sampled";
  }
  return "real_time";
}

export function platformCommandUsageMonitoringStateLabel(state: PlatformCommandUsageMonitoringState) {
  if (state === "blocked") return "Blocked";
  if (state === "instrumentation_setup") return "Instrumentation setup";
  if (state === "anomaly_watch") return "Anomaly watch";
  return "Live";
}

export function platformCommandUsageSignalLabel(signal: PlatformCommandUsageSignal) {
  if (signal === "unmetered") return "Unmetered";
  if (signal === "sampled") return "Sampled";
  return "Real time";
}

function telemetryScopeFor(item: PlatformCommandSlaOperationsItem, signal: PlatformCommandUsageSignal) {
  if (signal === "unmetered") return `不啟用 telemetry：${item.decisionGate}`;
  if (signal === "sampled") return `抽樣 telemetry：${item.statusPagePlan}`;
  return `即時 telemetry：${item.statusPagePlan}`;
}

function eventSchemaFor(item: PlatformCommandSlaOperationsItem, state: PlatformCommandUsageMonitoringState) {
  if (state === "blocked") return "不建立 event schema";
  if (state === "instrumentation_setup") return `建立事件草稿：${item.sourceRoute}`;
  if (state === "anomaly_watch") return `事件 schema 需含 incident tags：${item.incidentProtocol}`;
  return `正式 event schema：${item.sourceRoute}`;
}

function meteringKeyFor(item: PlatformCommandSlaOperationsItem, signal: PlatformCommandUsageSignal) {
  if (signal === "unmetered") return "不建立 metering key";
  if (signal === "sampled") return `pilot metering key：${item.billingId}`;
  return `real-time metering key：${item.billingId}`;
}

function quotaPolicyFor(item: PlatformCommandSlaOperationsItem, signal: PlatformCommandUsageSignal) {
  if (signal === "unmetered") return "不套用 quota";
  if (signal === "sampled") return `人工 quota review：${item.serviceCreditPolicy}`;
  return `自動 quota policy：${item.buyerSegment}`;
}

function anomalyRuleFor(item: PlatformCommandSlaOperationsItem, state: PlatformCommandUsageMonitoringState) {
  if (state === "blocked") return `不建立異常規則：${item.nextAction}`;
  if (state === "instrumentation_setup") return `先建立基本異常規則：${item.errorBudgetPolicy}`;
  if (state === "anomaly_watch") return `加強異常規則與 burn-rate：${item.errorBudgetPolicy}`;
  return "即時異常規則與 burn-rate alert";
}

function alertRouteFor(item: PlatformCommandSlaOperationsItem, signal: PlatformCommandUsageSignal) {
  if (signal === "unmetered") return "不發 usage alert";
  if (signal === "sampled") return `人工 alert route：${item.serviceCadence}`;
  return `即時 alert route：${item.serviceCadence}`;
}

function billingReconciliationFor(item: PlatformCommandSlaOperationsItem, signal: PlatformCommandUsageSignal) {
  if (signal === "unmetered") return `不進 usage 對帳：${item.decisionGate}`;
  if (signal === "sampled") return `人工 usage / billing 對帳：${item.billingId}`;
  return `自動 usage / billing reconciliation：${item.billingId}`;
}

function customerUsageViewFor(item: PlatformCommandSlaOperationsItem, state: PlatformCommandUsageMonitoringState) {
  if (state === "blocked") return "不開客戶用量視圖";
  if (state === "instrumentation_setup") return `內部用量視圖草稿：${item.buyerSegment}`;
  if (state === "anomaly_watch") return `受控客戶用量視圖：${item.buyerSegment}`;
  return `正式客戶用量視圖：${item.buyerSegment}`;
}

function dataRetentionFor(signal: PlatformCommandUsageSignal) {
  if (signal === "unmetered") return "不保留 usage event";
  if (signal === "sampled") return "抽樣事件保留 90 天";
  return "即時事件與月結快照保留 13 個月";
}

function monitoringCadenceFor(signal: PlatformCommandUsageSignal) {
  if (signal === "unmetered") return "每日 usage exception";
  if (signal === "sampled") return "每週 usage review";
  return "每日自動 usage QA";
}

function decisionGateFor(item: PlatformCommandSlaOperationsItem, state: PlatformCommandUsageMonitoringState) {
  if (state === "blocked") return `不得啟用用量監控：${item.decisionGate}`;
  if (state === "instrumentation_setup") return `完成 telemetry、schema、metering key：${item.statusPagePlan}`;
  if (state === "anomaly_watch") return `完成異常規則與 usage / billing 對帳：${item.errorBudgetPolicy}`;
  return "可進正式用量監控、客戶視圖與營收稽核";
}

function nextActionFor(item: PlatformCommandSlaOperationsItem, state: PlatformCommandUsageMonitoringState) {
  if (state === "blocked") return `先解除 usage monitoring 阻塞：${item.nextAction}`;
  if (state === "instrumentation_setup") return `建立 telemetry 與 metering key：${item.billingId}`;
  if (state === "anomaly_watch") return `把 ${item.slaId} 加入異常監控與對帳`;
  return "把用量監控輸出給營收稽核、客戶成功與帳務";
}

function stateRank(state: PlatformCommandUsageMonitoringState) {
  if (state === "blocked") return 4;
  if (state === "instrumentation_setup") return 3;
  if (state === "anomaly_watch") return 2;
  return 1;
}

export function buildPlatformCommandUsageMonitoringItems(
  items: PlatformCommandSlaOperationsItem[],
): PlatformCommandUsageMonitoringItem[] {
  return items
    .map((item, index) => {
      const usageState = usageStateFor(item);
      const usageSignal = usageSignalFor(item, usageState);

      return {
        usageId: `USG-${String(index + 1).padStart(3, "0")}-${item.decisionId}`,
        slaId: item.slaId,
        billingId: item.billingId,
        decisionId: item.decisionId,
        owner: item.owner,
        usageOwner: item.slaOwner,
        usageState,
        usageSignal,
        slaState: item.slaState,
        serviceSignal: item.serviceSignal,
        status: item.status,
        residualRisk: item.residualRisk,
        readinessScore: item.readinessScore,
        sourceRoute: item.sourceRoute,
        buyerSegment: item.buyerSegment,
        telemetryScope: telemetryScopeFor(item, usageSignal),
        eventSchema: eventSchemaFor(item, usageState),
        meteringKey: meteringKeyFor(item, usageSignal),
        quotaPolicy: quotaPolicyFor(item, usageSignal),
        anomalyRule: anomalyRuleFor(item, usageState),
        alertRoute: alertRouteFor(item, usageSignal),
        billingReconciliation: billingReconciliationFor(item, usageSignal),
        customerUsageView: customerUsageViewFor(item, usageState),
        dataRetention: dataRetentionFor(usageSignal),
        monitoringCadence: monitoringCadenceFor(usageSignal),
        decisionGate: decisionGateFor(item, usageState),
        nextAction: nextActionFor(item, usageState),
      };
    })
    .sort(
      (left, right) =>
        stateRank(right.usageState) - stateRank(left.usageState) ||
        left.readinessScore - right.readinessScore ||
        left.usageId.localeCompare(right.usageId, "zh-Hant"),
    );
}

export function summarizePlatformCommandUsageMonitoring(
  items: PlatformCommandUsageMonitoringItem[],
): PlatformCommandUsageMonitoringSummary {
  const blockedCount = items.filter((item) => item.usageState === "blocked").length;
  const instrumentationSetupCount = items.filter((item) => item.usageState === "instrumentation_setup").length;
  const anomalyWatchCount = items.filter((item) => item.usageState === "anomaly_watch").length;
  const unmeteredCount = items.filter((item) => item.usageSignal === "unmetered").length;
  const sampledCount = items.filter((item) => item.usageSignal === "sampled").length;
  const averageReadinessScore = items.length
    ? Math.round(items.reduce((sum, item) => sum + item.readinessScore, 0) / items.length)
    : 0;

  return {
    status: unmeteredCount > 0 ? "block" : sampledCount > 0 ? "watch" : "pass",
    itemCount: items.length,
    blockedCount,
    instrumentationSetupCount,
    anomalyWatchCount,
    liveCount: items.filter((item) => item.usageState === "live").length,
    unmeteredCount,
    sampledCount,
    realTimeCount: items.filter((item) => item.usageSignal === "real_time").length,
    averageReadinessScore,
    nextMonitoringWindow:
      blockedCount > 0
        ? "不啟用用量監控"
        : instrumentationSetupCount > 0
          ? "本週 telemetry setup"
          : anomalyWatchCount > 0
            ? "本週 anomaly review"
            : "可即時監控",
  };
}

export function platformCommandUsageMonitoringCsv(items: PlatformCommandUsageMonitoringItem[]) {
  const header = [
    "usage_id",
    "sla_id",
    "billing_id",
    "decision_id",
    "owner",
    "usage_owner",
    "usage_state",
    "usage_signal",
    "sla_state",
    "service_signal",
    "status",
    "residual_risk",
    "readiness_score",
    "source_route",
    "buyer_segment",
    "telemetry_scope",
    "event_schema",
    "metering_key",
    "quota_policy",
    "anomaly_rule",
    "alert_route",
    "billing_reconciliation",
    "customer_usage_view",
    "data_retention",
    "monitoring_cadence",
    "decision_gate",
    "next_action",
  ];
  const rows = items.map((item) => [
    item.usageId,
    item.slaId,
    item.billingId,
    item.decisionId,
    item.owner,
    item.usageOwner,
    platformCommandUsageMonitoringStateLabel(item.usageState),
    platformCommandUsageSignalLabel(item.usageSignal),
    platformCommandSlaStateLabel(item.slaState),
    platformCommandServiceSignalLabel(item.serviceSignal),
    platformCommandStatusLabel(item.status),
    platformCommandResidualRiskLabel(item.residualRisk),
    item.readinessScore,
    item.sourceRoute,
    item.buyerSegment,
    item.telemetryScope,
    item.eventSchema,
    item.meteringKey,
    item.quotaPolicy,
    item.anomalyRule,
    item.alertRoute,
    item.billingReconciliation,
    item.customerUsageView,
    item.dataRetention,
    item.monitoringCadence,
    item.decisionGate,
    item.nextAction,
  ]);

  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}
