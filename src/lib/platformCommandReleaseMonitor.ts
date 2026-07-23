import {
  platformCommandReleaseStateLabel,
  type PlatformCommandReleaseReadinessItem,
  type PlatformCommandReleaseState,
} from "@/lib/platformCommandReleaseReadiness";
import {
  platformCommandBacklogImpactLabel,
  type PlatformCommandBacklogImpact,
} from "@/lib/platformCommandImprovementBacklog";
import {
  platformCommandResidualRiskLabel,
  type PlatformCommandResidualRisk,
} from "@/lib/platformCommandClosure";
import {
  platformCommandPriorityLabel,
  platformCommandStatusLabel,
  type PlatformCommandPriority,
} from "@/lib/platformCommandSearch";

export type PlatformCommandReleaseMonitorState = "halt" | "watch" | "stable" | "deferred";

export type PlatformCommandReleaseMonitorItem = {
  owner: string;
  monitorOwner: string;
  monitorState: PlatformCommandReleaseMonitorState;
  releaseState: PlatformCommandReleaseState;
  impact: PlatformCommandBacklogImpact;
  priority: PlatformCommandPriority;
  status: PlatformCommandReleaseReadinessItem["status"];
  residualRisk: PlatformCommandResidualRisk;
  readinessScore: number;
  backlogTitle: string;
  sourceRoute: string;
  leadCommand: string;
  releaseWindow: string;
  observationWindow: string;
  monitoredSignal: string;
  alertThreshold: string;
  rollbackTrigger: string;
  customerSignal: string;
  verificationCadence: string;
  recoveryAction: string;
  evidenceLog: string;
  nextAction: string;
};

export type PlatformCommandReleaseMonitorSummary = {
  status: PlatformCommandReleaseReadinessItem["status"];
  itemCount: number;
  haltCount: number;
  watchCount: number;
  stableCount: number;
  deferredCount: number;
  rollbackTriggerCount: number;
  averageReadinessScore: number;
  nextObservationWindow: string;
};

function csvCell(value: unknown) {
  const stringValue = String(value ?? "");
  if (/[",\n]/.test(stringValue)) return `"${stringValue.replaceAll('"', '""')}"`;
  return stringValue;
}

function monitorStateFor(item: PlatformCommandReleaseReadinessItem): PlatformCommandReleaseMonitorState {
  if (item.releaseState === "blocked") return "halt";
  if (item.releaseState === "deferred") return "deferred";
  if (item.releaseState === "guarded" || item.readinessScore < 75 || item.status !== "pass") return "watch";
  return "stable";
}

export function platformCommandReleaseMonitorStateLabel(state: PlatformCommandReleaseMonitorState) {
  if (state === "halt") return "Halt";
  if (state === "watch") return "Watch";
  if (state === "stable") return "Stable";
  return "Deferred";
}

function observationWindowFor(state: PlatformCommandReleaseMonitorState) {
  if (state === "halt") return "解除阻擋前不觀察";
  if (state === "watch") return "發布後 72 小時";
  if (state === "stable") return "發布後 24 小時";
  return "下季複核";
}

function monitoredSignalFor(item: PlatformCommandReleaseReadinessItem) {
  if (item.impact === "risk") return "阻擋項數量、owner 負載、風控簽核";
  if (item.impact === "reliability") return `${item.sourceRoute} watch/block rate 與 error budget`;
  if (item.impact === "handoff") return "副 owner 回覆時間、驗收證據完整度";
  return "runbook 查詢與重用紀錄";
}

function alertThresholdFor(item: PlatformCommandReleaseReadinessItem, state: PlatformCommandReleaseMonitorState) {
  if (state === "halt") return "任一 no-go 條件未解除";
  if (state === "watch") return `${item.sourceRoute} 回到 watch/block 或 readiness < 75`;
  if (state === "stable") return "連續 24 小時無 watch/block";
  return "下季仍有需求時重新排程";
}

function rollbackTriggerFor(item: PlatformCommandReleaseReadinessItem, state: PlatformCommandReleaseMonitorState) {
  if (state === "halt") return "不發布，無 rollback";
  if (state === "watch") return `${item.sourceRoute} 觸發 watch/block 或 owner 拒絕簽核`;
  if (state === "stable") return "發布後指標回落到 watch/block";
  return "不進 release，無 rollback";
}

function verificationCadenceFor(state: PlatformCommandReleaseMonitorState) {
  if (state === "halt") return "每日確認 no-go";
  if (state === "watch") return "每日兩次";
  if (state === "stable") return "每日一次";
  return "季度一次";
}

function recoveryActionFor(item: PlatformCommandReleaseReadinessItem, state: PlatformCommandReleaseMonitorState) {
  if (state === "halt") return `先完成 ${item.goNoGoGate}`;
  if (state === "watch") return `執行 rollback plan：${item.rollbackPlan}`;
  if (state === "stable") return "保留上一版流程，必要時回復";
  return "下季重新評估是否進 release train";
}

function evidenceLogFor(item: PlatformCommandReleaseReadinessItem) {
  return `Release monitor / ${item.releaseOwner} / ${item.sourceRoute}`;
}

function nextActionFor(item: PlatformCommandReleaseReadinessItem, state: PlatformCommandReleaseMonitorState) {
  if (state === "halt") return `先解除 ${item.approvalPath} 的 no-go`;
  if (state === "watch") return `建立 ${item.releaseWindow} 觀察板並指定 rollback owner`;
  if (state === "stable") return "上線後保存觀察紀錄";
  return "下季回到 backlog review";
}

function monitorRank(state: PlatformCommandReleaseMonitorState) {
  if (state === "halt") return 4;
  if (state === "watch") return 3;
  if (state === "stable") return 2;
  return 1;
}

export function buildPlatformCommandReleaseMonitorItems(
  items: PlatformCommandReleaseReadinessItem[],
): PlatformCommandReleaseMonitorItem[] {
  return items
    .map((item) => {
      const monitorState = monitorStateFor(item);

      return {
        owner: item.owner,
        monitorOwner: item.releaseOwner,
        monitorState,
        releaseState: item.releaseState,
        impact: item.impact,
        priority: item.priority,
        status: item.status,
        residualRisk: item.residualRisk,
        readinessScore: item.readinessScore,
        backlogTitle: item.backlogTitle,
        sourceRoute: item.sourceRoute,
        leadCommand: item.leadCommand,
        releaseWindow: item.releaseWindow,
        observationWindow: observationWindowFor(monitorState),
        monitoredSignal: monitoredSignalFor(item),
        alertThreshold: alertThresholdFor(item, monitorState),
        rollbackTrigger: rollbackTriggerFor(item, monitorState),
        customerSignal: item.customerNotice,
        verificationCadence: verificationCadenceFor(monitorState),
        recoveryAction: recoveryActionFor(item, monitorState),
        evidenceLog: evidenceLogFor(item),
        nextAction: nextActionFor(item, monitorState),
      };
    })
    .sort(
      (left, right) =>
        monitorRank(right.monitorState) - monitorRank(left.monitorState) ||
        left.readinessScore - right.readinessScore ||
        left.backlogTitle.localeCompare(right.backlogTitle, "zh-Hant"),
    );
}

export function summarizePlatformCommandReleaseMonitor(
  items: PlatformCommandReleaseMonitorItem[],
): PlatformCommandReleaseMonitorSummary {
  const haltCount = items.filter((item) => item.monitorState === "halt").length;
  const watchCount = items.filter((item) => item.monitorState === "watch").length;
  const averageReadinessScore = items.length
    ? Math.round(items.reduce((sum, item) => sum + item.readinessScore, 0) / items.length)
    : 0;

  return {
    status: haltCount > 0 ? "block" : watchCount > 0 ? "watch" : "pass",
    itemCount: items.length,
    haltCount,
    watchCount,
    stableCount: items.filter((item) => item.monitorState === "stable").length,
    deferredCount: items.filter((item) => item.monitorState === "deferred").length,
    rollbackTriggerCount: items.filter((item) => item.monitorState === "watch" || item.monitorState === "stable").length,
    averageReadinessScore,
    nextObservationWindow: haltCount > 0 ? "解除阻擋前" : watchCount > 0 ? "發布後 72 小時" : "發布後 24 小時",
  };
}

export function platformCommandReleaseMonitorCsv(items: PlatformCommandReleaseMonitorItem[]) {
  const header = [
    "owner",
    "monitor_owner",
    "monitor_state",
    "release_state",
    "impact",
    "priority",
    "status",
    "residual_risk",
    "readiness_score",
    "source_route",
    "lead_command",
    "backlog_title",
    "release_window",
    "observation_window",
    "monitored_signal",
    "alert_threshold",
    "rollback_trigger",
    "customer_signal",
    "verification_cadence",
    "recovery_action",
    "evidence_log",
    "next_action",
  ];
  const rows = items.map((item) => [
    item.owner,
    item.monitorOwner,
    platformCommandReleaseMonitorStateLabel(item.monitorState),
    platformCommandReleaseStateLabel(item.releaseState),
    platformCommandBacklogImpactLabel(item.impact),
    platformCommandPriorityLabel(item.priority),
    platformCommandStatusLabel(item.status),
    platformCommandResidualRiskLabel(item.residualRisk),
    item.readinessScore,
    item.sourceRoute,
    item.leadCommand,
    item.backlogTitle,
    item.releaseWindow,
    item.observationWindow,
    item.monitoredSignal,
    item.alertThreshold,
    item.rollbackTrigger,
    item.customerSignal,
    item.verificationCadence,
    item.recoveryAction,
    item.evidenceLog,
    item.nextAction,
  ]);

  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}
