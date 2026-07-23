import {
  platformCommandPostmortemThemeLabel,
  type PlatformCommandPostmortemItem,
  type PlatformCommandPostmortemTheme,
} from "@/lib/platformCommandPostmortem";
import {
  platformCommandResidualRiskLabel,
  type PlatformCommandResidualRisk,
} from "@/lib/platformCommandClosure";
import {
  platformCommandPriorityLabel,
  platformCommandStatusLabel,
  type PlatformCommandPriority,
} from "@/lib/platformCommandSearch";

export type PlatformCommandBacklogState = "critical_path" | "planned" | "scheduled" | "parking_lot";
export type PlatformCommandBacklogEffort = "high" | "medium" | "low";
export type PlatformCommandBacklogImpact = "risk" | "reliability" | "handoff" | "knowledge";

export type PlatformCommandImprovementBacklogItem = {
  owner: string;
  sponsor: string;
  backlogState: PlatformCommandBacklogState;
  impact: PlatformCommandBacklogImpact;
  effort: PlatformCommandBacklogEffort;
  theme: PlatformCommandPostmortemTheme;
  priority: PlatformCommandPriority;
  status: PlatformCommandPostmortemItem["status"];
  residualRisk: PlatformCommandResidualRisk;
  leadCommand: string;
  sourceRoute: string;
  backlogTitle: string;
  deliveryScope: string;
  dependency: string;
  releaseWindow: string;
  acceptanceMetric: string;
  deliveryRisk: string;
  nextMilestone: string;
};

export type PlatformCommandImprovementBacklogSummary = {
  status: PlatformCommandPostmortemItem["status"];
  itemCount: number;
  criticalPathCount: number;
  plannedCount: number;
  scheduledCount: number;
  parkingLotCount: number;
  highEffortCount: number;
  highResidualRiskCount: number;
  nextReleaseWindow: string;
};

function csvCell(value: unknown) {
  const stringValue = String(value ?? "");
  if (/[",\n]/.test(stringValue)) return `"${stringValue.replaceAll('"', '""')}"`;
  return stringValue;
}

function backlogStateFor(item: PlatformCommandPostmortemItem): PlatformCommandBacklogState {
  if (item.theme === "risk_reduction" || item.residualRisk === "high" || item.status === "block") return "critical_path";
  if (item.theme === "handoff_quality") return "planned";
  if (item.theme === "sla_prevention") return "scheduled";
  return "parking_lot";
}

export function platformCommandBacklogStateLabel(state: PlatformCommandBacklogState) {
  if (state === "critical_path") return "Critical Path";
  if (state === "planned") return "Planned";
  if (state === "scheduled") return "Scheduled";
  return "Parking Lot";
}

export function platformCommandBacklogEffortLabel(effort: PlatformCommandBacklogEffort) {
  if (effort === "high") return "高";
  if (effort === "medium") return "中";
  return "低";
}

export function platformCommandBacklogImpactLabel(impact: PlatformCommandBacklogImpact) {
  if (impact === "risk") return "風險";
  if (impact === "reliability") return "可靠性";
  if (impact === "handoff") return "交接";
  return "知識庫";
}

function impactFor(theme: PlatformCommandPostmortemTheme): PlatformCommandBacklogImpact {
  if (theme === "risk_reduction") return "risk";
  if (theme === "sla_prevention") return "reliability";
  if (theme === "handoff_quality") return "handoff";
  return "knowledge";
}

function effortFor(state: PlatformCommandBacklogState): PlatformCommandBacklogEffort {
  if (state === "critical_path") return "high";
  if (state === "planned" || state === "scheduled") return "medium";
  return "low";
}

function releaseWindowFor(state: PlatformCommandBacklogState) {
  if (state === "critical_path") return "本週 hotfix";
  if (state === "planned") return "下個 sprint";
  if (state === "scheduled") return "月度 release";
  return "季度整理";
}

function dependencyFor(item: PlatformCommandPostmortemItem, state: PlatformCommandBacklogState) {
  if (state === "critical_path") return `${item.deputyOwner} 接手、風控確認、證據歸檔`;
  if (state === "planned") return `${item.deputyOwner} 簽核交接標準`;
  if (state === "scheduled") return `${item.sourceRoute} 連續監控資料`;
  return "runbook owner 定期複核";
}

function backlogTitleFor(item: PlatformCommandPostmortemItem) {
  return `${item.sourceRoute} / ${platformCommandPostmortemThemeLabel(item.theme)}`;
}

function deliveryScopeFor(item: PlatformCommandPostmortemItem) {
  return `${item.improvementAction}；同步落地 ${item.preventionControl}`;
}

function deliveryRiskFor(item: PlatformCommandPostmortemItem, state: PlatformCommandBacklogState) {
  if (state === "critical_path") return `${item.owner} 負載未拆分時，阻擋項可能復發`;
  if (state === "planned") return "驗收證據不足時，交接責任會回流原 owner";
  if (state === "scheduled") return "監控資料不足時，無法證明 SLA 風險下降";
  return "知識未整理時，下次處理仍需重新摸索";
}

function nextMilestoneFor(item: PlatformCommandPostmortemItem, state: PlatformCommandBacklogState) {
  if (state === "critical_path") return `完成 ${item.evidenceArchive} 並確認 ${item.successMetric}`;
  if (state === "planned") return `由 ${item.deputyOwner} 補齊簽核與驗收欄位`;
  if (state === "scheduled") return `建立 ${item.reviewCadence} 檢查節奏`;
  return "沉澱為 reusable runbook";
}

function stateRank(state: PlatformCommandBacklogState) {
  if (state === "critical_path") return 4;
  if (state === "planned") return 3;
  if (state === "scheduled") return 2;
  return 1;
}

export function buildPlatformCommandImprovementBacklogItems(
  items: PlatformCommandPostmortemItem[],
): PlatformCommandImprovementBacklogItem[] {
  return items
    .map((item) => {
      const backlogState = backlogStateFor(item);

      return {
        owner: item.owner,
        sponsor: item.deputyOwner,
        backlogState,
        impact: impactFor(item.theme),
        effort: effortFor(backlogState),
        theme: item.theme,
        priority: item.priority,
        status: item.status,
        residualRisk: item.residualRisk,
        leadCommand: item.leadCommand,
        sourceRoute: item.sourceRoute,
        backlogTitle: backlogTitleFor(item),
        deliveryScope: deliveryScopeFor(item),
        dependency: dependencyFor(item, backlogState),
        releaseWindow: releaseWindowFor(backlogState),
        acceptanceMetric: item.successMetric,
        deliveryRisk: deliveryRiskFor(item, backlogState),
        nextMilestone: nextMilestoneFor(item, backlogState),
      };
    })
    .sort(
      (left, right) =>
        stateRank(right.backlogState) - stateRank(left.backlogState) ||
        left.owner.localeCompare(right.owner, "zh-Hant") ||
        left.backlogTitle.localeCompare(right.backlogTitle, "zh-Hant"),
    );
}

export function summarizePlatformCommandImprovementBacklog(
  items: PlatformCommandImprovementBacklogItem[],
): PlatformCommandImprovementBacklogSummary {
  const criticalPathCount = items.filter((item) => item.backlogState === "critical_path").length;
  const plannedCount = items.filter((item) => item.backlogState === "planned").length;
  const scheduledCount = items.filter((item) => item.backlogState === "scheduled").length;

  return {
    status: criticalPathCount > 0 ? "block" : plannedCount > 0 || scheduledCount > 0 ? "watch" : "pass",
    itemCount: items.length,
    criticalPathCount,
    plannedCount,
    scheduledCount,
    parkingLotCount: items.filter((item) => item.backlogState === "parking_lot").length,
    highEffortCount: items.filter((item) => item.effort === "high").length,
    highResidualRiskCount: items.filter((item) => item.residualRisk === "high").length,
    nextReleaseWindow: criticalPathCount > 0 ? "本週 hotfix" : plannedCount > 0 ? "下個 sprint" : "月度 release",
  };
}

export function platformCommandImprovementBacklogCsv(items: PlatformCommandImprovementBacklogItem[]) {
  const header = [
    "owner",
    "sponsor",
    "backlog_state",
    "impact",
    "effort",
    "theme",
    "priority",
    "status",
    "residual_risk",
    "source_route",
    "lead_command",
    "backlog_title",
    "delivery_scope",
    "dependency",
    "release_window",
    "acceptance_metric",
    "delivery_risk",
    "next_milestone",
  ];
  const rows = items.map((item) => [
    item.owner,
    item.sponsor,
    platformCommandBacklogStateLabel(item.backlogState),
    platformCommandBacklogImpactLabel(item.impact),
    platformCommandBacklogEffortLabel(item.effort),
    platformCommandPostmortemThemeLabel(item.theme),
    platformCommandPriorityLabel(item.priority),
    platformCommandStatusLabel(item.status),
    platformCommandResidualRiskLabel(item.residualRisk),
    item.sourceRoute,
    item.leadCommand,
    item.backlogTitle,
    item.deliveryScope,
    item.dependency,
    item.releaseWindow,
    item.acceptanceMetric,
    item.deliveryRisk,
    item.nextMilestone,
  ]);

  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}
