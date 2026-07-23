import {
  platformCommandEvidenceStateLabel,
  type PlatformCommandEvidenceLedgerItem,
  type PlatformCommandEvidenceState,
} from "@/lib/platformCommandEvidenceLedger";
import {
  platformCommandResidualRiskLabel,
  type PlatformCommandResidualRisk,
} from "@/lib/platformCommandClosure";
import { platformCommandStatusLabel } from "@/lib/platformCommandSearch";

export type PlatformCommandAuditState = "exception" | "open" | "scheduled" | "closed";
export type PlatformCommandAuditResult = "fail" | "review" | "pass";

export type PlatformCommandAuditTrailItem = {
  auditId: string;
  decisionId: string;
  owner: string;
  auditOwner: string;
  evidenceOwner: string;
  auditState: PlatformCommandAuditState;
  auditResult: PlatformCommandAuditResult;
  evidenceState: PlatformCommandEvidenceState;
  status: PlatformCommandEvidenceLedgerItem["status"];
  residualRisk: PlatformCommandResidualRisk;
  readinessScore: number;
  sourceRoute: string;
  controlObjective: string;
  sampledEvidence: string;
  auditFinding: string;
  remediationAction: string;
  auditWindow: string;
  nextAuditEvent: string;
  signoffOwner: string;
  archiveLocation: string;
};

export type PlatformCommandAuditTrailSummary = {
  status: PlatformCommandEvidenceLedgerItem["status"];
  itemCount: number;
  exceptionCount: number;
  openCount: number;
  scheduledCount: number;
  closedCount: number;
  failCount: number;
  reviewCount: number;
  passCount: number;
  averageReadinessScore: number;
  nextAuditWindow: string;
};

function csvCell(value: unknown) {
  const stringValue = String(value ?? "");
  if (/[",\n]/.test(stringValue)) return `"${stringValue.replaceAll('"', '""')}"`;
  return stringValue;
}

function auditStateFor(item: PlatformCommandEvidenceLedgerItem): PlatformCommandAuditState {
  if (item.evidenceState === "missing" || item.status === "block") return "exception";
  if (item.evidenceState === "collecting") return "open";
  if (item.evidenceState === "ready") return "scheduled";
  return "closed";
}

function auditResultFor(item: PlatformCommandEvidenceLedgerItem, state: PlatformCommandAuditState): PlatformCommandAuditResult {
  if (state === "exception" || item.residualRisk === "high") return "fail";
  if (state === "open" || item.residualRisk === "medium") return "review";
  return "pass";
}

export function platformCommandAuditStateLabel(state: PlatformCommandAuditState) {
  if (state === "exception") return "Exception";
  if (state === "open") return "Open";
  if (state === "scheduled") return "Scheduled";
  return "Closed";
}

export function platformCommandAuditResultLabel(result: PlatformCommandAuditResult) {
  if (result === "fail") return "Fail";
  if (result === "review") return "Review";
  return "Pass";
}

function controlObjectiveFor(item: PlatformCommandEvidenceLedgerItem) {
  if (item.status === "block") return "確認阻塞項目已有 owner、證據與解除條件";
  if (item.residualRisk === "high") return "確認高殘餘風險已保留完整決策證據";
  if (item.evidenceState === "ready") return "確認 ready 證據可支援月報驗收與追溯";
  return "確認決策、證據、保存位置與 closure gate 可以互相追溯";
}

function auditFindingFor(item: PlatformCommandEvidenceLedgerItem, state: PlatformCommandAuditState) {
  if (state === "exception") return `例外：${item.evidenceGap}`;
  if (state === "open") return `待補：${item.evidenceOwner} 仍需更新 ${item.evidenceLocation}`;
  if (state === "scheduled") return `可抽查：${item.evidenceLocation} 已具備驗收條件`;
  return `已關閉：依 ${item.retentionRule} 保留`;
}

function remediationActionFor(item: PlatformCommandEvidenceLedgerItem, state: PlatformCommandAuditState) {
  if (state === "exception") return `升級給 ${item.verificationOwner}，先補齊 ${item.evidenceType}`;
  if (state === "open") return `由 ${item.evidenceOwner} 在 ${item.verificationCadence} 內補 evidence`;
  if (state === "scheduled") return `安排 ${item.verificationOwner} 驗證 ${item.closureGate}`;
  return "維持歸檔，等待季度抽樣";
}

function auditWindowFor(state: PlatformCommandAuditState) {
  if (state === "exception") return "24 小時內";
  if (state === "open") return "本週內";
  if (state === "scheduled") return "本月驗收";
  return "下季抽查";
}

function nextAuditEventFor(item: PlatformCommandEvidenceLedgerItem, state: PlatformCommandAuditState) {
  if (state === "exception") return `例外會議：${item.verificationOwner}`;
  if (state === "open") return `證據追蹤：${item.evidenceOwner}`;
  if (state === "scheduled") return `驗收簽核：${item.closureGate}`;
  return "季度證據抽樣";
}

function stateRank(state: PlatformCommandAuditState) {
  if (state === "exception") return 4;
  if (state === "open") return 3;
  if (state === "scheduled") return 2;
  return 1;
}

export function buildPlatformCommandAuditTrailItems(
  items: PlatformCommandEvidenceLedgerItem[],
): PlatformCommandAuditTrailItem[] {
  return items
    .map((item, index) => {
      const auditState = auditStateFor(item);
      const auditResult = auditResultFor(item, auditState);

      return {
        auditId: `AUD-${String(index + 1).padStart(3, "0")}-${item.decisionId}`,
        decisionId: item.decisionId,
        owner: item.owner,
        auditOwner: item.verificationOwner,
        evidenceOwner: item.evidenceOwner,
        auditState,
        auditResult,
        evidenceState: item.evidenceState,
        status: item.status,
        residualRisk: item.residualRisk,
        readinessScore: item.readinessScore,
        sourceRoute: item.sourceRoute,
        controlObjective: controlObjectiveFor(item),
        sampledEvidence: item.evidenceType,
        auditFinding: auditFindingFor(item, auditState),
        remediationAction: remediationActionFor(item, auditState),
        auditWindow: auditWindowFor(auditState),
        nextAuditEvent: nextAuditEventFor(item, auditState),
        signoffOwner: item.verificationOwner,
        archiveLocation: `${item.evidenceLocation} / audit-trail`,
      };
    })
    .sort(
      (left, right) =>
        stateRank(right.auditState) - stateRank(left.auditState) ||
        left.readinessScore - right.readinessScore ||
        left.auditId.localeCompare(right.auditId, "zh-Hant"),
    );
}

export function summarizePlatformCommandAuditTrail(
  items: PlatformCommandAuditTrailItem[],
): PlatformCommandAuditTrailSummary {
  const exceptionCount = items.filter((item) => item.auditState === "exception").length;
  const openCount = items.filter((item) => item.auditState === "open").length;
  const failCount = items.filter((item) => item.auditResult === "fail").length;
  const reviewCount = items.filter((item) => item.auditResult === "review").length;
  const averageReadinessScore = items.length
    ? Math.round(items.reduce((sum, item) => sum + item.readinessScore, 0) / items.length)
    : 0;

  return {
    status: failCount > 0 ? "block" : reviewCount > 0 ? "watch" : "pass",
    itemCount: items.length,
    exceptionCount,
    openCount,
    scheduledCount: items.filter((item) => item.auditState === "scheduled").length,
    closedCount: items.filter((item) => item.auditState === "closed").length,
    failCount,
    reviewCount,
    passCount: items.filter((item) => item.auditResult === "pass").length,
    averageReadinessScore,
    nextAuditWindow: exceptionCount > 0 ? "24 小時內" : openCount > 0 ? "本週內" : "本月驗收",
  };
}

export function platformCommandAuditTrailCsv(items: PlatformCommandAuditTrailItem[]) {
  const header = [
    "audit_id",
    "decision_id",
    "owner",
    "audit_owner",
    "evidence_owner",
    "audit_state",
    "audit_result",
    "evidence_state",
    "status",
    "residual_risk",
    "readiness_score",
    "source_route",
    "control_objective",
    "sampled_evidence",
    "audit_finding",
    "remediation_action",
    "audit_window",
    "next_audit_event",
    "signoff_owner",
    "archive_location",
  ];
  const rows = items.map((item) => [
    item.auditId,
    item.decisionId,
    item.owner,
    item.auditOwner,
    item.evidenceOwner,
    platformCommandAuditStateLabel(item.auditState),
    platformCommandAuditResultLabel(item.auditResult),
    platformCommandEvidenceStateLabel(item.evidenceState),
    platformCommandStatusLabel(item.status),
    platformCommandResidualRiskLabel(item.residualRisk),
    item.readinessScore,
    item.sourceRoute,
    item.controlObjective,
    item.sampledEvidence,
    item.auditFinding,
    item.remediationAction,
    item.auditWindow,
    item.nextAuditEvent,
    item.signoffOwner,
    item.archiveLocation,
  ]);

  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}
