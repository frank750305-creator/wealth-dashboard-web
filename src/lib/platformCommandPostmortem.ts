import {
  platformCommandClosureStateLabel,
  platformCommandResidualRiskLabel,
  type PlatformCommandClosureItem,
  type PlatformCommandClosureState,
  type PlatformCommandResidualRisk,
} from "@/lib/platformCommandClosure";
import {
  platformCommandHandoffStateLabel,
  type PlatformCommandHandoffState,
} from "@/lib/platformCommandHandoff";
import {
  platformCommandPriorityLabel,
  platformCommandStatusLabel,
  type PlatformCommandPriority,
} from "@/lib/platformCommandSearch";

export type PlatformCommandPostmortemTheme =
  | "risk_reduction"
  | "handoff_quality"
  | "sla_prevention"
  | "operating_memory";

export type PlatformCommandPostmortemItem = {
  owner: string;
  deputyOwner: string;
  theme: PlatformCommandPostmortemTheme;
  closureState: PlatformCommandClosureState;
  handoffState: PlatformCommandHandoffState;
  priority: PlatformCommandPriority;
  status: PlatformCommandClosureItem["status"];
  residualRisk: PlatformCommandResidualRisk;
  leadCommand: string;
  sourceRoute: string;
  finding: string;
  rootCause: string;
  improvementAction: string;
  preventionControl: string;
  evidenceArchive: string;
  reviewCadence: string;
  dueWindow: string;
  successMetric: string;
};

export type PlatformCommandPostmortemSummary = {
  status: PlatformCommandClosureItem["status"];
  itemCount: number;
  riskReductionCount: number;
  handoffQualityCount: number;
  slaPreventionCount: number;
  operatingMemoryCount: number;
  highResidualRiskCount: number;
  nextReviewWindow: string;
};

function csvCell(value: unknown) {
  const stringValue = String(value ?? "");
  if (/[",\n]/.test(stringValue)) return `"${stringValue.replaceAll('"', '""')}"`;
  return stringValue;
}

function themeFor(item: PlatformCommandClosureItem): PlatformCommandPostmortemTheme {
  if (item.closureState === "blocked" || item.residualRisk === "high") return "risk_reduction";
  if (item.closureState === "ready") return "handoff_quality";
  if (item.closureState === "monitor" || item.priority === "critical" || item.priority === "high") return "sla_prevention";
  return "operating_memory";
}

export function platformCommandPostmortemThemeLabel(theme: PlatformCommandPostmortemTheme) {
  if (theme === "risk_reduction") return "Risk Reduction";
  if (theme === "handoff_quality") return "Handoff Quality";
  if (theme === "sla_prevention") return "SLA Prevention";
  return "Operating Memory";
}

function findingFor(item: PlatformCommandClosureItem, theme: PlatformCommandPostmortemTheme) {
  if (theme === "risk_reduction") return `${item.leadCommand} 仍有結案阻擋與高殘餘風險`;
  if (theme === "handoff_quality") return `${item.leadCommand} 可結案，但需要交接驗收證據`;
  if (theme === "sla_prevention") return `${item.sourceRoute} 需保留趨勢追蹤，避免再次觸發 SLA`;
  return `${item.owner} 的處理方式可沉澱成標準作業記憶`;
}

function rootCauseFor(item: PlatformCommandClosureItem, theme: PlatformCommandPostmortemTheme) {
  if (theme === "risk_reduction") return `${item.owner} 負載與升級責任尚未完全拆分`;
  if (theme === "handoff_quality") return `${item.deputyOwner} 的接手邊界需要被明確簽核`;
  if (theme === "sla_prevention") return "目前有監控，但缺少連續穩定的趨勢證據";
  return "事件已穩定，主要價值在保留可重用處理路徑";
}

function improvementActionFor(item: PlatformCommandClosureItem, theme: PlatformCommandPostmortemTheme) {
  if (theme === "risk_reduction") return `拆出 ${item.deputyOwner} 主責任務，先關閉 ${item.closeGate}`;
  if (theme === "handoff_quality") return `補齊 ${item.evidenceRequired}，由 ${item.approvalOwner} 簽核`;
  if (theme === "sla_prevention") return `把 ${item.sourceRoute} 加入月度趨勢檢查`;
  return `把 ${item.leadCommand} 寫入 reusable runbook`;
}

function preventionControlFor(theme: PlatformCommandPostmortemTheme) {
  if (theme === "risk_reduction") return "新增 breach 門檻警示與副 owner 強制指派規則";
  if (theme === "handoff_quality") return "交接前必須有驗收標準、證據與下一責任人";
  if (theme === "sla_prevention") return "連續兩個週期穩定後才移出監控清單";
  return "每月抽查 runbook 是否仍可重用";
}

function reviewCadenceFor(theme: PlatformCommandPostmortemTheme) {
  if (theme === "risk_reduction") return "每日到結案";
  if (theme === "handoff_quality") return "每週到簽核";
  if (theme === "sla_prevention") return "月度追蹤";
  return "季度複核";
}

function dueWindowFor(theme: PlatformCommandPostmortemTheme) {
  if (theme === "risk_reduction") return "5 個工作日內";
  if (theme === "handoff_quality") return "14 天內";
  if (theme === "sla_prevention") return "下個月檢前";
  return "下季前";
}

function successMetricFor(theme: PlatformCommandPostmortemTheme) {
  if (theme === "risk_reduction") return "阻擋項歸零，且 2 個週期內未復發";
  if (theme === "handoff_quality") return "副 owner 簽核完成，驗收證據可查";
  if (theme === "sla_prevention") return "連續 2 個監控週期未觸發 watch/block";
  return "runbook 可被下一個 owner 重複使用";
}

function evidenceArchiveFor(item: PlatformCommandClosureItem) {
  return `Command archive / ${item.owner} / ${item.sourceRoute}`;
}

function themeRank(theme: PlatformCommandPostmortemTheme) {
  if (theme === "risk_reduction") return 4;
  if (theme === "handoff_quality") return 3;
  if (theme === "sla_prevention") return 2;
  return 1;
}

export function buildPlatformCommandPostmortemItems(
  items: PlatformCommandClosureItem[],
): PlatformCommandPostmortemItem[] {
  return items
    .map((item) => {
      const theme = themeFor(item);

      return {
        owner: item.owner,
        deputyOwner: item.deputyOwner,
        theme,
        closureState: item.closureState,
        handoffState: item.handoffState,
        priority: item.priority,
        status: item.status,
        residualRisk: item.residualRisk,
        leadCommand: item.leadCommand,
        sourceRoute: item.sourceRoute,
        finding: findingFor(item, theme),
        rootCause: rootCauseFor(item, theme),
        improvementAction: improvementActionFor(item, theme),
        preventionControl: preventionControlFor(theme),
        evidenceArchive: evidenceArchiveFor(item),
        reviewCadence: reviewCadenceFor(theme),
        dueWindow: dueWindowFor(theme),
        successMetric: successMetricFor(theme),
      };
    })
    .sort(
      (left, right) =>
        themeRank(right.theme) - themeRank(left.theme) ||
        left.owner.localeCompare(right.owner, "zh-Hant") ||
        left.leadCommand.localeCompare(right.leadCommand, "zh-Hant"),
    );
}

export function summarizePlatformCommandPostmortem(
  items: PlatformCommandPostmortemItem[],
): PlatformCommandPostmortemSummary {
  const riskReductionCount = items.filter((item) => item.theme === "risk_reduction").length;
  const handoffQualityCount = items.filter((item) => item.theme === "handoff_quality").length;
  const slaPreventionCount = items.filter((item) => item.theme === "sla_prevention").length;

  return {
    status: riskReductionCount > 0 ? "block" : handoffQualityCount > 0 || slaPreventionCount > 0 ? "watch" : "pass",
    itemCount: items.length,
    riskReductionCount,
    handoffQualityCount,
    slaPreventionCount,
    operatingMemoryCount: items.filter((item) => item.theme === "operating_memory").length,
    highResidualRiskCount: items.filter((item) => item.residualRisk === "high").length,
    nextReviewWindow: riskReductionCount > 0 ? "5 個工作日內" : handoffQualityCount > 0 ? "14 天內" : "月度追蹤",
  };
}

export function platformCommandPostmortemCsv(items: PlatformCommandPostmortemItem[]) {
  const header = [
    "owner",
    "deputy_owner",
    "theme",
    "closure_state",
    "handoff_state",
    "priority",
    "status",
    "residual_risk",
    "source_route",
    "lead_command",
    "finding",
    "root_cause",
    "improvement_action",
    "prevention_control",
    "evidence_archive",
    "review_cadence",
    "due_window",
    "success_metric",
  ];
  const rows = items.map((item) => [
    item.owner,
    item.deputyOwner,
    platformCommandPostmortemThemeLabel(item.theme),
    platformCommandClosureStateLabel(item.closureState),
    platformCommandHandoffStateLabel(item.handoffState),
    platformCommandPriorityLabel(item.priority),
    platformCommandStatusLabel(item.status),
    platformCommandResidualRiskLabel(item.residualRisk),
    item.sourceRoute,
    item.leadCommand,
    item.finding,
    item.rootCause,
    item.improvementAction,
    item.preventionControl,
    item.evidenceArchive,
    item.reviewCadence,
    item.dueWindow,
    item.successMetric,
  ]);

  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}
