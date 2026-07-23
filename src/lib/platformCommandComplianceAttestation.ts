import {
  platformCommandAuditResultLabel,
  platformCommandAuditStateLabel,
  type PlatformCommandAuditResult,
  type PlatformCommandAuditState,
  type PlatformCommandAuditTrailItem,
} from "@/lib/platformCommandAuditTrail";
import {
  platformCommandEvidenceStateLabel,
  type PlatformCommandEvidenceState,
} from "@/lib/platformCommandEvidenceLedger";
import {
  platformCommandResidualRiskLabel,
  type PlatformCommandResidualRisk,
} from "@/lib/platformCommandClosure";
import { platformCommandStatusLabel } from "@/lib/platformCommandSearch";

export type PlatformCommandAttestationState = "blocked" | "drafting" | "ready" | "attested";
export type PlatformCommandAttestationResult = "not_ready" | "conditional" | "clean";

export type PlatformCommandComplianceAttestationItem = {
  attestationId: string;
  auditId: string;
  decisionId: string;
  owner: string;
  attestationOwner: string;
  auditOwner: string;
  attestationState: PlatformCommandAttestationState;
  attestationResult: PlatformCommandAttestationResult;
  auditState: PlatformCommandAuditState;
  auditResult: PlatformCommandAuditResult;
  evidenceState: PlatformCommandEvidenceState;
  status: PlatformCommandAuditTrailItem["status"];
  residualRisk: PlatformCommandResidualRisk;
  readinessScore: number;
  sourceRoute: string;
  attestationScope: string;
  attestationStatement: string;
  exceptionNote: string;
  requiredSignoff: string;
  attestationPackage: string;
  deliveryWindow: string;
  reportingUseCase: string;
  nextAction: string;
};

export type PlatformCommandComplianceAttestationSummary = {
  status: PlatformCommandAuditTrailItem["status"];
  itemCount: number;
  blockedCount: number;
  draftingCount: number;
  readyCount: number;
  attestedCount: number;
  notReadyCount: number;
  conditionalCount: number;
  cleanCount: number;
  averageReadinessScore: number;
  nextDeliveryWindow: string;
};

function csvCell(value: unknown) {
  const stringValue = String(value ?? "");
  if (/[",\n]/.test(stringValue)) return `"${stringValue.replaceAll('"', '""')}"`;
  return stringValue;
}

function attestationStateFor(item: PlatformCommandAuditTrailItem): PlatformCommandAttestationState {
  if (item.auditState === "exception" || item.auditResult === "fail" || item.status === "block") return "blocked";
  if (item.auditState === "open") return "drafting";
  if (item.auditState === "scheduled") return "ready";
  return "attested";
}

function attestationResultFor(
  item: PlatformCommandAuditTrailItem,
  state: PlatformCommandAttestationState,
): PlatformCommandAttestationResult {
  if (state === "blocked") return "not_ready";
  if (state === "drafting" || item.auditResult === "review" || item.residualRisk === "medium") return "conditional";
  return "clean";
}

export function platformCommandAttestationStateLabel(state: PlatformCommandAttestationState) {
  if (state === "blocked") return "Blocked";
  if (state === "drafting") return "Drafting";
  if (state === "ready") return "Ready";
  return "Attested";
}

export function platformCommandAttestationResultLabel(result: PlatformCommandAttestationResult) {
  if (result === "not_ready") return "Not ready";
  if (result === "conditional") return "Conditional";
  return "Clean";
}

function scopeFor(item: PlatformCommandAuditTrailItem) {
  if (item.residualRisk === "high") return "高風險決策與阻塞解除證據";
  if (item.auditResult === "review") return "條件式驗收與補救追蹤";
  if (item.auditState === "closed") return "已歸檔決策的季度抽樣聲明";
  return "月度營運治理與產品化決策聲明";
}

function statementFor(item: PlatformCommandAuditTrailItem, result: PlatformCommandAttestationResult) {
  if (result === "not_ready") return `尚不可簽核：${item.auditFinding}`;
  if (result === "conditional") return `可條件式簽核：${item.remediationAction}`;
  return `可簽核：${item.controlObjective}`;
}

function exceptionNoteFor(item: PlatformCommandAuditTrailItem, state: PlatformCommandAttestationState) {
  if (state === "blocked") return item.auditFinding;
  if (state === "drafting") return `等待補救確認：${item.remediationAction}`;
  if (state === "ready") return `等待 ${item.signoffOwner} 完成簽核`;
  return "無重大例外";
}

function deliveryWindowFor(state: PlatformCommandAttestationState) {
  if (state === "blocked") return "暫緩交付";
  if (state === "drafting") return "本週草稿";
  if (state === "ready") return "本月簽核";
  return "已交付";
}

function reportingUseCaseFor(item: PlatformCommandAuditTrailItem, result: PlatformCommandAttestationResult) {
  if (result === "not_ready") return "例外追蹤會議";
  if (result === "conditional") return "月報附註與風險揭露";
  if (item.auditState === "closed") return "季度治理抽查";
  return "董事會 / 管理層決策包";
}

function nextActionFor(item: PlatformCommandAuditTrailItem, state: PlatformCommandAttestationState) {
  if (state === "blocked") return `先完成補救：${item.remediationAction}`;
  if (state === "drafting") return `整理 ${item.sampledEvidence} 成簽核附件`;
  if (state === "ready") return `送 ${item.signoffOwner} 簽核`;
  return "保留簽核包並納入下季抽查";
}

function stateRank(state: PlatformCommandAttestationState) {
  if (state === "blocked") return 4;
  if (state === "drafting") return 3;
  if (state === "ready") return 2;
  return 1;
}

export function buildPlatformCommandComplianceAttestationItems(
  items: PlatformCommandAuditTrailItem[],
): PlatformCommandComplianceAttestationItem[] {
  return items
    .map((item, index) => {
      const attestationState = attestationStateFor(item);
      const attestationResult = attestationResultFor(item, attestationState);

      return {
        attestationId: `ATT-${String(index + 1).padStart(3, "0")}-${item.decisionId}`,
        auditId: item.auditId,
        decisionId: item.decisionId,
        owner: item.owner,
        attestationOwner: item.signoffOwner,
        auditOwner: item.auditOwner,
        attestationState,
        attestationResult,
        auditState: item.auditState,
        auditResult: item.auditResult,
        evidenceState: item.evidenceState,
        status: item.status,
        residualRisk: item.residualRisk,
        readinessScore: item.readinessScore,
        sourceRoute: item.sourceRoute,
        attestationScope: scopeFor(item),
        attestationStatement: statementFor(item, attestationResult),
        exceptionNote: exceptionNoteFor(item, attestationState),
        requiredSignoff: item.signoffOwner,
        attestationPackage: `${item.archiveLocation} / attestation-package`,
        deliveryWindow: deliveryWindowFor(attestationState),
        reportingUseCase: reportingUseCaseFor(item, attestationResult),
        nextAction: nextActionFor(item, attestationState),
      };
    })
    .sort(
      (left, right) =>
        stateRank(right.attestationState) - stateRank(left.attestationState) ||
        left.readinessScore - right.readinessScore ||
        left.attestationId.localeCompare(right.attestationId, "zh-Hant"),
    );
}

export function summarizePlatformCommandComplianceAttestation(
  items: PlatformCommandComplianceAttestationItem[],
): PlatformCommandComplianceAttestationSummary {
  const blockedCount = items.filter((item) => item.attestationState === "blocked").length;
  const draftingCount = items.filter((item) => item.attestationState === "drafting").length;
  const notReadyCount = items.filter((item) => item.attestationResult === "not_ready").length;
  const conditionalCount = items.filter((item) => item.attestationResult === "conditional").length;
  const averageReadinessScore = items.length
    ? Math.round(items.reduce((sum, item) => sum + item.readinessScore, 0) / items.length)
    : 0;

  return {
    status: notReadyCount > 0 ? "block" : conditionalCount > 0 ? "watch" : "pass",
    itemCount: items.length,
    blockedCount,
    draftingCount,
    readyCount: items.filter((item) => item.attestationState === "ready").length,
    attestedCount: items.filter((item) => item.attestationState === "attested").length,
    notReadyCount,
    conditionalCount,
    cleanCount: items.filter((item) => item.attestationResult === "clean").length,
    averageReadinessScore,
    nextDeliveryWindow: blockedCount > 0 ? "暫緩交付" : draftingCount > 0 ? "本週草稿" : "本月簽核",
  };
}

export function platformCommandComplianceAttestationCsv(items: PlatformCommandComplianceAttestationItem[]) {
  const header = [
    "attestation_id",
    "audit_id",
    "decision_id",
    "owner",
    "attestation_owner",
    "audit_owner",
    "attestation_state",
    "attestation_result",
    "audit_state",
    "audit_result",
    "evidence_state",
    "status",
    "residual_risk",
    "readiness_score",
    "source_route",
    "attestation_scope",
    "attestation_statement",
    "exception_note",
    "required_signoff",
    "attestation_package",
    "delivery_window",
    "reporting_use_case",
    "next_action",
  ];
  const rows = items.map((item) => [
    item.attestationId,
    item.auditId,
    item.decisionId,
    item.owner,
    item.attestationOwner,
    item.auditOwner,
    platformCommandAttestationStateLabel(item.attestationState),
    platformCommandAttestationResultLabel(item.attestationResult),
    platformCommandAuditStateLabel(item.auditState),
    platformCommandAuditResultLabel(item.auditResult),
    platformCommandEvidenceStateLabel(item.evidenceState),
    platformCommandStatusLabel(item.status),
    platformCommandResidualRiskLabel(item.residualRisk),
    item.readinessScore,
    item.sourceRoute,
    item.attestationScope,
    item.attestationStatement,
    item.exceptionNote,
    item.requiredSignoff,
    item.attestationPackage,
    item.deliveryWindow,
    item.reportingUseCase,
    item.nextAction,
  ]);

  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}
