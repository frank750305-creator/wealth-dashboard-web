import {
  platformCommandAttestationResultLabel,
  platformCommandAttestationStateLabel,
  type PlatformCommandAttestationResult,
  type PlatformCommandAttestationState,
  type PlatformCommandComplianceAttestationItem,
} from "@/lib/platformCommandComplianceAttestation";
import {
  platformCommandResidualRiskLabel,
  type PlatformCommandResidualRisk,
} from "@/lib/platformCommandClosure";
import { platformCommandStatusLabel } from "@/lib/platformCommandSearch";

export type PlatformCommandBoardReportState = "blocked" | "draft" | "ready" | "published";
export type PlatformCommandBoardSignal = "red" | "amber" | "green";

export type PlatformCommandBoardReportingItem = {
  reportId: string;
  attestationId: string;
  decisionId: string;
  owner: string;
  reportOwner: string;
  boardReportState: PlatformCommandBoardReportState;
  boardSignal: PlatformCommandBoardSignal;
  attestationState: PlatformCommandAttestationState;
  attestationResult: PlatformCommandAttestationResult;
  status: PlatformCommandComplianceAttestationItem["status"];
  residualRisk: PlatformCommandResidualRisk;
  readinessScore: number;
  sourceRoute: string;
  audience: string;
  executiveHeadline: string;
  riskDisclosure: string;
  boardAsk: string;
  dataAppendix: string;
  publishWindow: string;
  reportingUseCase: string;
  nextAction: string;
};

export type PlatformCommandBoardReportingSummary = {
  status: PlatformCommandComplianceAttestationItem["status"];
  itemCount: number;
  blockedCount: number;
  draftCount: number;
  readyCount: number;
  publishedCount: number;
  redCount: number;
  amberCount: number;
  greenCount: number;
  averageReadinessScore: number;
  nextPublishWindow: string;
};

function csvCell(value: unknown) {
  const stringValue = String(value ?? "");
  if (/[",\n]/.test(stringValue)) return `"${stringValue.replaceAll('"', '""')}"`;
  return stringValue;
}

function boardReportStateFor(item: PlatformCommandComplianceAttestationItem): PlatformCommandBoardReportState {
  if (item.attestationState === "blocked" || item.attestationResult === "not_ready" || item.status === "block") {
    return "blocked";
  }
  if (item.attestationState === "drafting") return "draft";
  if (item.attestationState === "ready") return "ready";
  return "published";
}

function boardSignalFor(
  item: PlatformCommandComplianceAttestationItem,
  state: PlatformCommandBoardReportState,
): PlatformCommandBoardSignal {
  if (state === "blocked" || item.residualRisk === "high") return "red";
  if (state === "draft" || item.attestationResult === "conditional" || item.residualRisk === "medium") return "amber";
  return "green";
}

export function platformCommandBoardReportStateLabel(state: PlatformCommandBoardReportState) {
  if (state === "blocked") return "Blocked";
  if (state === "draft") return "Draft";
  if (state === "ready") return "Ready";
  return "Published";
}

export function platformCommandBoardSignalLabel(signal: PlatformCommandBoardSignal) {
  if (signal === "red") return "Red";
  if (signal === "amber") return "Amber";
  return "Green";
}

function audienceFor(item: PlatformCommandComplianceAttestationItem) {
  if (item.attestationResult === "not_ready") return "CEO / COO / Risk Owner";
  if (item.attestationResult === "conditional") return "管理層月會";
  return "董事會 / 投資委員會";
}

function executiveHeadlineFor(
  item: PlatformCommandComplianceAttestationItem,
  signal: PlatformCommandBoardSignal,
) {
  if (signal === "red") return `需決策：${item.decisionId} 尚未可簽核`;
  if (signal === "amber") return `條件通過：${item.decisionId} 需揭露補救狀態`;
  return `可發布：${item.decisionId} 已具備治理證據`;
}

function riskDisclosureFor(
  item: PlatformCommandComplianceAttestationItem,
  signal: PlatformCommandBoardSignal,
) {
  if (signal === "red") return item.exceptionNote;
  if (signal === "amber") return `附註揭露：${item.attestationStatement}`;
  return `無重大例外，殘餘風險為 ${platformCommandResidualRiskLabel(item.residualRisk)}`;
}

function boardAskFor(item: PlatformCommandComplianceAttestationItem, state: PlatformCommandBoardReportState) {
  if (state === "blocked") return `請核准補救路徑：${item.nextAction}`;
  if (state === "draft") return `請確認條件式揭露與 ${item.requiredSignoff} 簽核時程`;
  if (state === "ready") return `請 ${item.requiredSignoff} 完成簽核後發布`;
  return "無需追加決策，納入下季追蹤";
}

function publishWindowFor(state: PlatformCommandBoardReportState) {
  if (state === "blocked") return "暫不發布";
  if (state === "draft") return "本週草稿";
  if (state === "ready") return "本月發布";
  return "已發布";
}

function nextActionFor(item: PlatformCommandComplianceAttestationItem, state: PlatformCommandBoardReportState) {
  if (state === "blocked") return `先完成例外解除：${item.exceptionNote}`;
  if (state === "draft") return `補齊報告附件：${item.attestationPackage}`;
  if (state === "ready") return `送交 ${item.requiredSignoff} 做最終確認`;
  return "保留董事會包並同步到治理資料夾";
}

function stateRank(state: PlatformCommandBoardReportState) {
  if (state === "blocked") return 4;
  if (state === "draft") return 3;
  if (state === "ready") return 2;
  return 1;
}

export function buildPlatformCommandBoardReportingItems(
  items: PlatformCommandComplianceAttestationItem[],
): PlatformCommandBoardReportingItem[] {
  return items
    .map((item, index) => {
      const boardReportState = boardReportStateFor(item);
      const boardSignal = boardSignalFor(item, boardReportState);

      return {
        reportId: `BRD-${String(index + 1).padStart(3, "0")}-${item.decisionId}`,
        attestationId: item.attestationId,
        decisionId: item.decisionId,
        owner: item.owner,
        reportOwner: item.attestationOwner,
        boardReportState,
        boardSignal,
        attestationState: item.attestationState,
        attestationResult: item.attestationResult,
        status: item.status,
        residualRisk: item.residualRisk,
        readinessScore: item.readinessScore,
        sourceRoute: item.sourceRoute,
        audience: audienceFor(item),
        executiveHeadline: executiveHeadlineFor(item, boardSignal),
        riskDisclosure: riskDisclosureFor(item, boardSignal),
        boardAsk: boardAskFor(item, boardReportState),
        dataAppendix: `${item.attestationPackage} / board-appendix`,
        publishWindow: publishWindowFor(boardReportState),
        reportingUseCase: item.reportingUseCase,
        nextAction: nextActionFor(item, boardReportState),
      };
    })
    .sort(
      (left, right) =>
        stateRank(right.boardReportState) - stateRank(left.boardReportState) ||
        left.readinessScore - right.readinessScore ||
        left.reportId.localeCompare(right.reportId, "zh-Hant"),
    );
}

export function summarizePlatformCommandBoardReporting(
  items: PlatformCommandBoardReportingItem[],
): PlatformCommandBoardReportingSummary {
  const blockedCount = items.filter((item) => item.boardReportState === "blocked").length;
  const draftCount = items.filter((item) => item.boardReportState === "draft").length;
  const redCount = items.filter((item) => item.boardSignal === "red").length;
  const amberCount = items.filter((item) => item.boardSignal === "amber").length;
  const averageReadinessScore = items.length
    ? Math.round(items.reduce((sum, item) => sum + item.readinessScore, 0) / items.length)
    : 0;

  return {
    status: redCount > 0 ? "block" : amberCount > 0 ? "watch" : "pass",
    itemCount: items.length,
    blockedCount,
    draftCount,
    readyCount: items.filter((item) => item.boardReportState === "ready").length,
    publishedCount: items.filter((item) => item.boardReportState === "published").length,
    redCount,
    amberCount,
    greenCount: items.filter((item) => item.boardSignal === "green").length,
    averageReadinessScore,
    nextPublishWindow: blockedCount > 0 ? "暫不發布" : draftCount > 0 ? "本週草稿" : "本月發布",
  };
}

export function platformCommandBoardReportingCsv(items: PlatformCommandBoardReportingItem[]) {
  const header = [
    "report_id",
    "attestation_id",
    "decision_id",
    "owner",
    "report_owner",
    "board_report_state",
    "board_signal",
    "attestation_state",
    "attestation_result",
    "status",
    "residual_risk",
    "readiness_score",
    "source_route",
    "audience",
    "executive_headline",
    "risk_disclosure",
    "board_ask",
    "data_appendix",
    "publish_window",
    "reporting_use_case",
    "next_action",
  ];
  const rows = items.map((item) => [
    item.reportId,
    item.attestationId,
    item.decisionId,
    item.owner,
    item.reportOwner,
    platformCommandBoardReportStateLabel(item.boardReportState),
    platformCommandBoardSignalLabel(item.boardSignal),
    platformCommandAttestationStateLabel(item.attestationState),
    platformCommandAttestationResultLabel(item.attestationResult),
    platformCommandStatusLabel(item.status),
    platformCommandResidualRiskLabel(item.residualRisk),
    item.readinessScore,
    item.sourceRoute,
    item.audience,
    item.executiveHeadline,
    item.riskDisclosure,
    item.boardAsk,
    item.dataAppendix,
    item.publishWindow,
    item.reportingUseCase,
    item.nextAction,
  ]);

  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}
