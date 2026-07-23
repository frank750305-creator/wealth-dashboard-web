import {
  platformCommandBoardReportStateLabel,
  platformCommandBoardSignalLabel,
  type PlatformCommandBoardReportingItem,
  type PlatformCommandBoardReportState,
  type PlatformCommandBoardSignal,
} from "@/lib/platformCommandBoardReporting";
import {
  platformCommandResidualRiskLabel,
  type PlatformCommandResidualRisk,
} from "@/lib/platformCommandClosure";
import { platformCommandStatusLabel } from "@/lib/platformCommandSearch";

export type PlatformCommandClientReadoutState = "blocked" | "drafting" | "review" | "deliverable";
export type PlatformCommandDistributionSignal = "restricted" | "internal_only" | "client_ready";

export type PlatformCommandClientReadoutItem = {
  readoutId: string;
  reportId: string;
  attestationId: string;
  decisionId: string;
  owner: string;
  clientOwner: string;
  clientReadoutState: PlatformCommandClientReadoutState;
  distributionSignal: PlatformCommandDistributionSignal;
  boardReportState: PlatformCommandBoardReportState;
  boardSignal: PlatformCommandBoardSignal;
  status: PlatformCommandBoardReportingItem["status"];
  residualRisk: PlatformCommandResidualRisk;
  readinessScore: number;
  sourceRoute: string;
  clientSegment: string;
  clientHeadline: string;
  permittedMessage: string;
  disclosureLevel: string;
  deliveryChannel: string;
  requiredDisclaimer: string;
  clientAction: string;
  deliveryWindow: string;
  appendixLocation: string;
  nextAction: string;
};

export type PlatformCommandClientReadoutSummary = {
  status: PlatformCommandBoardReportingItem["status"];
  itemCount: number;
  blockedCount: number;
  draftingCount: number;
  reviewCount: number;
  deliverableCount: number;
  restrictedCount: number;
  internalOnlyCount: number;
  clientReadyCount: number;
  averageReadinessScore: number;
  nextDeliveryWindow: string;
};

function csvCell(value: unknown) {
  const stringValue = String(value ?? "");
  if (/[",\n]/.test(stringValue)) return `"${stringValue.replaceAll('"', '""')}"`;
  return stringValue;
}

function clientReadoutStateFor(item: PlatformCommandBoardReportingItem): PlatformCommandClientReadoutState {
  if (item.boardReportState === "blocked" || item.boardSignal === "red" || item.status === "block") return "blocked";
  if (item.boardReportState === "draft") return "drafting";
  if (item.boardReportState === "ready" || item.boardSignal === "amber") return "review";
  return "deliverable";
}

function distributionSignalFor(
  item: PlatformCommandBoardReportingItem,
  state: PlatformCommandClientReadoutState,
): PlatformCommandDistributionSignal {
  if (state === "blocked" || item.residualRisk === "high") return "restricted";
  if (state === "drafting" || state === "review" || item.boardSignal === "amber") return "internal_only";
  return "client_ready";
}

export function platformCommandClientReadoutStateLabel(state: PlatformCommandClientReadoutState) {
  if (state === "blocked") return "Blocked";
  if (state === "drafting") return "Drafting";
  if (state === "review") return "Review";
  return "Deliverable";
}

export function platformCommandDistributionSignalLabel(signal: PlatformCommandDistributionSignal) {
  if (signal === "restricted") return "Restricted";
  if (signal === "internal_only") return "Internal only";
  return "Client ready";
}

function clientSegmentFor(item: PlatformCommandBoardReportingItem) {
  if (item.boardSignal === "red") return "內部高風險處理";
  if (item.boardSignal === "amber") return "高接觸客戶 / 顧問團隊";
  return "標準研究訂閱與企業客戶";
}

function clientHeadlineFor(item: PlatformCommandBoardReportingItem, signal: PlatformCommandDistributionSignal) {
  if (signal === "restricted") return `暫不對外：${item.decisionId} 仍有內部例外`;
  if (signal === "internal_only") return `內部備稿：${item.decisionId} 等待揭露確認`;
  return `可交付：${item.executiveHeadline}`;
}

function permittedMessageFor(item: PlatformCommandBoardReportingItem, signal: PlatformCommandDistributionSignal) {
  if (signal === "restricted") return "只可內部討論，不進入客戶材料";
  if (signal === "internal_only") return `可供顧問內部備註：${item.riskDisclosure}`;
  return `可對外摘要：${item.executiveHeadline}`;
}

function disclosureLevelFor(signal: PlatformCommandDistributionSignal) {
  if (signal === "restricted") return "Restricted internal";
  if (signal === "internal_only") return "Advisor internal";
  return "Client distributable";
}

function deliveryChannelFor(signal: PlatformCommandDistributionSignal) {
  if (signal === "restricted") return "內部例外會議";
  if (signal === "internal_only") return "顧問備忘錄";
  return "客戶週報 / Dashboard 註解";
}

function requiredDisclaimerFor(item: PlatformCommandBoardReportingItem, signal: PlatformCommandDistributionSignal) {
  if (signal === "restricted") return "不得對外傳遞";
  if (signal === "internal_only") return `需附風險揭露：${item.riskDisclosure}`;
  return "資料僅供研究與決策參考，非投資建議";
}

function clientActionFor(item: PlatformCommandBoardReportingItem, signal: PlatformCommandDistributionSignal) {
  if (signal === "restricted") return `等待內部解除：${item.nextAction}`;
  if (signal === "internal_only") return `由 ${item.reportOwner} 確認揭露口徑`;
  return "納入客戶交付包並更新產品註解";
}

function deliveryWindowFor(state: PlatformCommandClientReadoutState) {
  if (state === "blocked") return "暫緩交付";
  if (state === "drafting") return "本週備稿";
  if (state === "review") return "本月審閱";
  return "可立即交付";
}

function nextActionFor(item: PlatformCommandBoardReportingItem, state: PlatformCommandClientReadoutState) {
  if (state === "blocked") return `先完成內部 board ask：${item.boardAsk}`;
  if (state === "drafting") return `整理客戶版本附件：${item.dataAppendix}`;
  if (state === "review") return `確認 ${item.reportOwner} 的揭露與免責文字`;
  return "同步到客戶交付清單";
}

function stateRank(state: PlatformCommandClientReadoutState) {
  if (state === "blocked") return 4;
  if (state === "drafting") return 3;
  if (state === "review") return 2;
  return 1;
}

export function buildPlatformCommandClientReadoutItems(
  items: PlatformCommandBoardReportingItem[],
): PlatformCommandClientReadoutItem[] {
  return items
    .map((item, index) => {
      const clientReadoutState = clientReadoutStateFor(item);
      const distributionSignal = distributionSignalFor(item, clientReadoutState);

      return {
        readoutId: `CLT-${String(index + 1).padStart(3, "0")}-${item.decisionId}`,
        reportId: item.reportId,
        attestationId: item.attestationId,
        decisionId: item.decisionId,
        owner: item.owner,
        clientOwner: item.reportOwner,
        clientReadoutState,
        distributionSignal,
        boardReportState: item.boardReportState,
        boardSignal: item.boardSignal,
        status: item.status,
        residualRisk: item.residualRisk,
        readinessScore: item.readinessScore,
        sourceRoute: item.sourceRoute,
        clientSegment: clientSegmentFor(item),
        clientHeadline: clientHeadlineFor(item, distributionSignal),
        permittedMessage: permittedMessageFor(item, distributionSignal),
        disclosureLevel: disclosureLevelFor(distributionSignal),
        deliveryChannel: deliveryChannelFor(distributionSignal),
        requiredDisclaimer: requiredDisclaimerFor(item, distributionSignal),
        clientAction: clientActionFor(item, distributionSignal),
        deliveryWindow: deliveryWindowFor(clientReadoutState),
        appendixLocation: `${item.dataAppendix} / client-readout`,
        nextAction: nextActionFor(item, clientReadoutState),
      };
    })
    .sort(
      (left, right) =>
        stateRank(right.clientReadoutState) - stateRank(left.clientReadoutState) ||
        left.readinessScore - right.readinessScore ||
        left.readoutId.localeCompare(right.readoutId, "zh-Hant"),
    );
}

export function summarizePlatformCommandClientReadout(
  items: PlatformCommandClientReadoutItem[],
): PlatformCommandClientReadoutSummary {
  const blockedCount = items.filter((item) => item.clientReadoutState === "blocked").length;
  const draftingCount = items.filter((item) => item.clientReadoutState === "drafting").length;
  const reviewCount = items.filter((item) => item.clientReadoutState === "review").length;
  const restrictedCount = items.filter((item) => item.distributionSignal === "restricted").length;
  const internalOnlyCount = items.filter((item) => item.distributionSignal === "internal_only").length;
  const averageReadinessScore = items.length
    ? Math.round(items.reduce((sum, item) => sum + item.readinessScore, 0) / items.length)
    : 0;

  return {
    status: restrictedCount > 0 ? "block" : internalOnlyCount > 0 ? "watch" : "pass",
    itemCount: items.length,
    blockedCount,
    draftingCount,
    reviewCount,
    deliverableCount: items.filter((item) => item.clientReadoutState === "deliverable").length,
    restrictedCount,
    internalOnlyCount,
    clientReadyCount: items.filter((item) => item.distributionSignal === "client_ready").length,
    averageReadinessScore,
    nextDeliveryWindow: blockedCount > 0 ? "暫緩交付" : draftingCount > 0 ? "本週備稿" : reviewCount > 0 ? "本月審閱" : "可立即交付",
  };
}

export function platformCommandClientReadoutCsv(items: PlatformCommandClientReadoutItem[]) {
  const header = [
    "readout_id",
    "report_id",
    "attestation_id",
    "decision_id",
    "owner",
    "client_owner",
    "client_readout_state",
    "distribution_signal",
    "board_report_state",
    "board_signal",
    "status",
    "residual_risk",
    "readiness_score",
    "source_route",
    "client_segment",
    "client_headline",
    "permitted_message",
    "disclosure_level",
    "delivery_channel",
    "required_disclaimer",
    "client_action",
    "delivery_window",
    "appendix_location",
    "next_action",
  ];
  const rows = items.map((item) => [
    item.readoutId,
    item.reportId,
    item.attestationId,
    item.decisionId,
    item.owner,
    item.clientOwner,
    platformCommandClientReadoutStateLabel(item.clientReadoutState),
    platformCommandDistributionSignalLabel(item.distributionSignal),
    platformCommandBoardReportStateLabel(item.boardReportState),
    platformCommandBoardSignalLabel(item.boardSignal),
    platformCommandStatusLabel(item.status),
    platformCommandResidualRiskLabel(item.residualRisk),
    item.readinessScore,
    item.sourceRoute,
    item.clientSegment,
    item.clientHeadline,
    item.permittedMessage,
    item.disclosureLevel,
    item.deliveryChannel,
    item.requiredDisclaimer,
    item.clientAction,
    item.deliveryWindow,
    item.appendixLocation,
    item.nextAction,
  ]);

  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}
