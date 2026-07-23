import {
  platformCommandFollowUpStateLabel,
  type PlatformCommandDecisionFollowUpItem,
  type PlatformCommandFollowUpState,
} from "@/lib/platformCommandDecisionFollowUp";
import {
  platformCommandDecisionStateLabel,
  type PlatformCommandDecisionState,
} from "@/lib/platformCommandDecisionRegister";
import {
  platformCommandResidualRiskLabel,
  type PlatformCommandResidualRisk,
} from "@/lib/platformCommandClosure";
import {
  platformCommandPriorityLabel,
  platformCommandStatusLabel,
  type PlatformCommandPriority,
} from "@/lib/platformCommandSearch";

export type PlatformCommandEvidenceState = "missing" | "collecting" | "ready" | "archived";

export type PlatformCommandEvidenceLedgerItem = {
  owner: string;
  evidenceOwner: string;
  decisionId: string;
  evidenceState: PlatformCommandEvidenceState;
  followUpState: PlatformCommandFollowUpState;
  decisionState: PlatformCommandDecisionState;
  priority: PlatformCommandPriority;
  status: PlatformCommandDecisionFollowUpItem["status"];
  residualRisk: PlatformCommandResidualRisk;
  readinessScore: number;
  backlogTitle: string;
  sourceRoute: string;
  leadCommand: string;
  evidenceType: string;
  evidenceLocation: string;
  evidenceGap: string;
  verificationOwner: string;
  verificationCadence: string;
  retentionRule: string;
  closureGate: string;
  nextAction: string;
};

export type PlatformCommandEvidenceLedgerSummary = {
  status: PlatformCommandDecisionFollowUpItem["status"];
  itemCount: number;
  missingCount: number;
  collectingCount: number;
  readyCount: number;
  archivedCount: number;
  highResidualRiskCount: number;
  averageReadinessScore: number;
  nextEvidenceWindow: string;
};

function csvCell(value: unknown) {
  const stringValue = String(value ?? "");
  if (/[",\n]/.test(stringValue)) return `"${stringValue.replaceAll('"', '""')}"`;
  return stringValue;
}

function evidenceStateFor(item: PlatformCommandDecisionFollowUpItem): PlatformCommandEvidenceState {
  if (item.followUpState === "blocked" || item.status === "block" || item.residualRisk === "high") return "missing";
  if (item.followUpState === "due") return "collecting";
  if (item.followUpState === "active") return "ready";
  return "archived";
}

export function platformCommandEvidenceStateLabel(state: PlatformCommandEvidenceState) {
  if (state === "missing") return "Missing";
  if (state === "collecting") return "Collecting";
  if (state === "ready") return "Ready";
  return "Archived";
}

function evidenceTypeFor(item: PlatformCommandDecisionFollowUpItem, state: PlatformCommandEvidenceState) {
  if (state === "missing") return "審批紀錄 + 風險解除證據";
  if (state === "collecting") return "週會紀錄 + owner 確認";
  if (state === "ready") return "月報指標 + 落地截圖";
  return item.proofRequired;
}

function evidenceLocationFor(item: PlatformCommandDecisionFollowUpItem) {
  return `Command evidence / ${item.decisionId} / ${item.sourceRoute}`;
}

function evidenceGapFor(item: PlatformCommandDecisionFollowUpItem, state: PlatformCommandEvidenceState) {
  if (state === "missing") return `缺少 ${item.proofRequired}`;
  if (state === "collecting") return `等待 ${item.followUpOwner} 補齊 ${item.successCriteria}`;
  if (state === "ready") return "證據已可驗收，等待歸檔";
  return "已歸檔";
}

function verificationCadenceFor(state: PlatformCommandEvidenceState) {
  if (state === "missing") return "每日確認";
  if (state === "collecting") return "每週確認";
  if (state === "ready") return "月度驗收";
  return "季度抽查";
}

function retentionRuleFor(item: PlatformCommandDecisionFollowUpItem, state: PlatformCommandEvidenceState) {
  if (state === "archived") return "保留到下季 review";
  if (item.residualRisk === "high" || item.status === "block") return "保留到風險解除後兩個週期";
  return "保留到月報驗收完成";
}

function nextActionFor(item: PlatformCommandDecisionFollowUpItem, state: PlatformCommandEvidenceState) {
  if (state === "missing") return `先補齊證據：${item.proofRequired}`;
  if (state === "collecting") return `由 ${item.followUpOwner} 更新 evidence location`;
  if (state === "ready") return `驗收 ${item.closureGate} 後歸檔`;
  return "下季抽查是否仍可追溯";
}

function stateRank(state: PlatformCommandEvidenceState) {
  if (state === "missing") return 4;
  if (state === "collecting") return 3;
  if (state === "ready") return 2;
  return 1;
}

export function buildPlatformCommandEvidenceLedgerItems(
  items: PlatformCommandDecisionFollowUpItem[],
): PlatformCommandEvidenceLedgerItem[] {
  return items
    .map((item) => {
      const evidenceState = evidenceStateFor(item);

      return {
        owner: item.owner,
        evidenceOwner: item.followUpOwner,
        decisionId: item.decisionId,
        evidenceState,
        followUpState: item.followUpState,
        decisionState: item.decisionState,
        priority: item.priority,
        status: item.status,
        residualRisk: item.residualRisk,
        readinessScore: item.readinessScore,
        backlogTitle: item.backlogTitle,
        sourceRoute: item.sourceRoute,
        leadCommand: item.leadCommand,
        evidenceType: evidenceTypeFor(item, evidenceState),
        evidenceLocation: evidenceLocationFor(item),
        evidenceGap: evidenceGapFor(item, evidenceState),
        verificationOwner: item.escalationPath,
        verificationCadence: verificationCadenceFor(evidenceState),
        retentionRule: retentionRuleFor(item, evidenceState),
        closureGate: item.closureGate,
        nextAction: nextActionFor(item, evidenceState),
      };
    })
    .sort(
      (left, right) =>
        stateRank(right.evidenceState) - stateRank(left.evidenceState) ||
        left.readinessScore - right.readinessScore ||
        left.decisionId.localeCompare(right.decisionId, "zh-Hant"),
    );
}

export function summarizePlatformCommandEvidenceLedger(
  items: PlatformCommandEvidenceLedgerItem[],
): PlatformCommandEvidenceLedgerSummary {
  const missingCount = items.filter((item) => item.evidenceState === "missing").length;
  const collectingCount = items.filter((item) => item.evidenceState === "collecting").length;
  const averageReadinessScore = items.length
    ? Math.round(items.reduce((sum, item) => sum + item.readinessScore, 0) / items.length)
    : 0;

  return {
    status: missingCount > 0 ? "block" : collectingCount > 0 ? "watch" : "pass",
    itemCount: items.length,
    missingCount,
    collectingCount,
    readyCount: items.filter((item) => item.evidenceState === "ready").length,
    archivedCount: items.filter((item) => item.evidenceState === "archived").length,
    highResidualRiskCount: items.filter((item) => item.residualRisk === "high").length,
    averageReadinessScore,
    nextEvidenceWindow: missingCount > 0 ? "每日確認" : collectingCount > 0 ? "每週確認" : "月度驗收",
  };
}

export function platformCommandEvidenceLedgerCsv(items: PlatformCommandEvidenceLedgerItem[]) {
  const header = [
    "decision_id",
    "owner",
    "evidence_owner",
    "evidence_state",
    "follow_up_state",
    "decision_state",
    "priority",
    "status",
    "residual_risk",
    "readiness_score",
    "source_route",
    "lead_command",
    "backlog_title",
    "evidence_type",
    "evidence_location",
    "evidence_gap",
    "verification_owner",
    "verification_cadence",
    "retention_rule",
    "closure_gate",
    "next_action",
  ];
  const rows = items.map((item) => [
    item.decisionId,
    item.owner,
    item.evidenceOwner,
    platformCommandEvidenceStateLabel(item.evidenceState),
    platformCommandFollowUpStateLabel(item.followUpState),
    platformCommandDecisionStateLabel(item.decisionState),
    platformCommandPriorityLabel(item.priority),
    platformCommandStatusLabel(item.status),
    platformCommandResidualRiskLabel(item.residualRisk),
    item.readinessScore,
    item.sourceRoute,
    item.leadCommand,
    item.backlogTitle,
    item.evidenceType,
    item.evidenceLocation,
    item.evidenceGap,
    item.verificationOwner,
    item.verificationCadence,
    item.retentionRule,
    item.closureGate,
    item.nextAction,
  ]);

  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}
