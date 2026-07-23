import {
  platformCommandExpansionSignalLabel,
  platformCommandExpansionStateLabel,
  type PlatformCommandExpansionPlaybookItem,
  type PlatformCommandExpansionSignal,
  type PlatformCommandExpansionState,
} from "@/lib/platformCommandExpansionPlaybook";
import {
  platformCommandResidualRiskLabel,
  type PlatformCommandResidualRisk,
} from "@/lib/platformCommandClosure";
import { platformCommandStatusLabel } from "@/lib/platformCommandSearch";

export type PlatformCommandRenewalForecastState = "blocked" | "protect" | "commit_review" | "growth_commit";
export type PlatformCommandNrrSignal = "contraction" | "flat" | "expansion";

export type PlatformCommandRenewalForecastItem = {
  forecastId: string;
  expansionId: string;
  successId: string;
  decisionId: string;
  owner: string;
  forecastOwner: string;
  renewalForecastState: PlatformCommandRenewalForecastState;
  nrrSignal: PlatformCommandNrrSignal;
  expansionState: PlatformCommandExpansionState;
  expansionSignal: PlatformCommandExpansionSignal;
  status: PlatformCommandExpansionPlaybookItem["status"];
  residualRisk: PlatformCommandResidualRisk;
  readinessScore: number;
  sourceRoute: string;
  buyerSegment: string;
  renewalProbability: string;
  forecastCategory: string;
  nrrDirection: string;
  qbrAction: string;
  commercialEvidence: string;
  pricingAction: string;
  executiveSponsor: string;
  forecastRisk: string;
  renewalWindow: string;
  nextAction: string;
};

export type PlatformCommandRenewalForecastSummary = {
  status: PlatformCommandExpansionPlaybookItem["status"];
  itemCount: number;
  blockedCount: number;
  protectCount: number;
  commitReviewCount: number;
  growthCommitCount: number;
  contractionCount: number;
  flatCount: number;
  expansionCount: number;
  averageReadinessScore: number;
  nextRenewalWindow: string;
};

function csvCell(value: unknown) {
  const stringValue = String(value ?? "");
  if (/[",\n]/.test(stringValue)) return `"${stringValue.replaceAll('"', '""')}"`;
  return stringValue;
}

function renewalForecastStateFor(item: PlatformCommandExpansionPlaybookItem): PlatformCommandRenewalForecastState {
  if (item.expansionState === "blocked" || item.expansionSignal === "protect" || item.status === "block") {
    return "blocked";
  }
  if (item.expansionState === "renewal_save") return "protect";
  if (item.expansionState === "expansion_ready" || item.expansionSignal === "expand") return "commit_review";
  return "growth_commit";
}

function nrrSignalFor(
  item: PlatformCommandExpansionPlaybookItem,
  state: PlatformCommandRenewalForecastState,
): PlatformCommandNrrSignal {
  if (state === "blocked" || item.residualRisk === "high") return "contraction";
  if (state === "protect" || state === "commit_review" || item.residualRisk === "medium") return "flat";
  return "expansion";
}

export function platformCommandRenewalForecastStateLabel(state: PlatformCommandRenewalForecastState) {
  if (state === "blocked") return "Blocked";
  if (state === "protect") return "Protect";
  if (state === "commit_review") return "Commit review";
  return "Growth commit";
}

export function platformCommandNrrSignalLabel(signal: PlatformCommandNrrSignal) {
  if (signal === "contraction") return "Contraction";
  if (signal === "flat") return "Flat";
  return "Expansion";
}

function renewalProbabilityFor(item: PlatformCommandExpansionPlaybookItem, signal: PlatformCommandNrrSignal) {
  if (signal === "contraction") return `低：${item.riskNote}`;
  if (signal === "flat") return `中：${item.renewalPosture}`;
  return `高：${item.valueProof}`;
}

function forecastCategoryFor(signal: PlatformCommandNrrSignal) {
  if (signal === "contraction") return "Risk / downside";
  if (signal === "flat") return "Base / renewal";
  return "Upside / expansion";
}

function nrrDirectionFor(item: PlatformCommandExpansionPlaybookItem, signal: PlatformCommandNrrSignal) {
  if (signal === "contraction") return "NRR 下修或暫不計入";
  if (signal === "flat") return `NRR 持平，等待 ${item.expansionOwner} 驗證`;
  return "NRR 可上修到擴張 pipeline";
}

function qbrActionFor(item: PlatformCommandExpansionPlaybookItem, signal: PlatformCommandNrrSignal) {
  if (signal === "contraction") return `安排風險 QBR：${item.commercialAsk}`;
  if (signal === "flat") return `安排 renewal QBR：${item.successMotion}`;
  return `安排 expansion QBR：${item.expansionPath}`;
}

function pricingActionFor(item: PlatformCommandExpansionPlaybookItem, signal: PlatformCommandNrrSignal) {
  if (signal === "contraction") return "保留價格，先救續約";
  if (signal === "flat") return `驗證 pricing lever：${item.pricingLever}`;
  return `提出擴張報價：${item.pricingLever}`;
}

function executiveSponsorFor(item: PlatformCommandExpansionPlaybookItem, signal: PlatformCommandNrrSignal) {
  if (signal === "contraction") return `${item.expansionOwner} + internal risk owner`;
  if (signal === "flat") return item.stakeholderMap;
  return `${item.stakeholderMap} + executive buyer`;
}

function forecastRiskFor(item: PlatformCommandExpansionPlaybookItem, signal: PlatformCommandNrrSignal) {
  if (signal === "contraction") return item.riskNote;
  if (signal === "flat") return `仍需證明：${item.valueProof}`;
  return `可擴張，殘餘風險為 ${platformCommandResidualRiskLabel(item.residualRisk)}`;
}

function renewalWindowFor(state: PlatformCommandRenewalForecastState) {
  if (state === "blocked") return "暫不入 forecast";
  if (state === "protect") return "本週 renewal save";
  if (state === "commit_review") return "本月 commit review";
  return "可入 growth commit";
}

function nextActionFor(item: PlatformCommandExpansionPlaybookItem, state: PlatformCommandRenewalForecastState) {
  if (state === "blocked") return `先完成擴張阻塞：${item.nextAction}`;
  if (state === "protect") return `建立 renewal save forecast：${item.renewalPosture}`;
  if (state === "commit_review") return `用 QBR 驗證 forecast：${item.valueProof}`;
  return "同步 NRR forecast 與 enterprise expansion pipeline";
}

function stateRank(state: PlatformCommandRenewalForecastState) {
  if (state === "blocked") return 4;
  if (state === "protect") return 3;
  if (state === "commit_review") return 2;
  return 1;
}

export function buildPlatformCommandRenewalForecastItems(
  items: PlatformCommandExpansionPlaybookItem[],
): PlatformCommandRenewalForecastItem[] {
  return items
    .map((item, index) => {
      const renewalForecastState = renewalForecastStateFor(item);
      const nrrSignal = nrrSignalFor(item, renewalForecastState);

      return {
        forecastId: `RNW-${String(index + 1).padStart(3, "0")}-${item.decisionId}`,
        expansionId: item.expansionId,
        successId: item.successId,
        decisionId: item.decisionId,
        owner: item.owner,
        forecastOwner: item.expansionOwner,
        renewalForecastState,
        nrrSignal,
        expansionState: item.expansionState,
        expansionSignal: item.expansionSignal,
        status: item.status,
        residualRisk: item.residualRisk,
        readinessScore: item.readinessScore,
        sourceRoute: item.sourceRoute,
        buyerSegment: item.buyerSegment,
        renewalProbability: renewalProbabilityFor(item, nrrSignal),
        forecastCategory: forecastCategoryFor(nrrSignal),
        nrrDirection: nrrDirectionFor(item, nrrSignal),
        qbrAction: qbrActionFor(item, nrrSignal),
        commercialEvidence: item.valueProof,
        pricingAction: pricingActionFor(item, nrrSignal),
        executiveSponsor: executiveSponsorFor(item, nrrSignal),
        forecastRisk: forecastRiskFor(item, nrrSignal),
        renewalWindow: renewalWindowFor(renewalForecastState),
        nextAction: nextActionFor(item, renewalForecastState),
      };
    })
    .sort(
      (left, right) =>
        stateRank(right.renewalForecastState) - stateRank(left.renewalForecastState) ||
        left.readinessScore - right.readinessScore ||
        left.forecastId.localeCompare(right.forecastId, "zh-Hant"),
    );
}

export function summarizePlatformCommandRenewalForecast(
  items: PlatformCommandRenewalForecastItem[],
): PlatformCommandRenewalForecastSummary {
  const blockedCount = items.filter((item) => item.renewalForecastState === "blocked").length;
  const protectCount = items.filter((item) => item.renewalForecastState === "protect").length;
  const commitReviewCount = items.filter((item) => item.renewalForecastState === "commit_review").length;
  const contractionCount = items.filter((item) => item.nrrSignal === "contraction").length;
  const flatCount = items.filter((item) => item.nrrSignal === "flat").length;
  const averageReadinessScore = items.length
    ? Math.round(items.reduce((sum, item) => sum + item.readinessScore, 0) / items.length)
    : 0;

  return {
    status: contractionCount > 0 ? "block" : flatCount > 0 ? "watch" : "pass",
    itemCount: items.length,
    blockedCount,
    protectCount,
    commitReviewCount,
    growthCommitCount: items.filter((item) => item.renewalForecastState === "growth_commit").length,
    contractionCount,
    flatCount,
    expansionCount: items.filter((item) => item.nrrSignal === "expansion").length,
    averageReadinessScore,
    nextRenewalWindow: blockedCount > 0 ? "暫不入 forecast" : protectCount > 0 ? "本週 renewal save" : commitReviewCount > 0 ? "本月 commit review" : "可入 growth commit",
  };
}

export function platformCommandRenewalForecastCsv(items: PlatformCommandRenewalForecastItem[]) {
  const header = [
    "forecast_id",
    "expansion_id",
    "success_id",
    "decision_id",
    "owner",
    "forecast_owner",
    "renewal_forecast_state",
    "nrr_signal",
    "expansion_state",
    "expansion_signal",
    "status",
    "residual_risk",
    "readiness_score",
    "source_route",
    "buyer_segment",
    "renewal_probability",
    "forecast_category",
    "nrr_direction",
    "qbr_action",
    "commercial_evidence",
    "pricing_action",
    "executive_sponsor",
    "forecast_risk",
    "renewal_window",
    "next_action",
  ];
  const rows = items.map((item) => [
    item.forecastId,
    item.expansionId,
    item.successId,
    item.decisionId,
    item.owner,
    item.forecastOwner,
    platformCommandRenewalForecastStateLabel(item.renewalForecastState),
    platformCommandNrrSignalLabel(item.nrrSignal),
    platformCommandExpansionStateLabel(item.expansionState),
    platformCommandExpansionSignalLabel(item.expansionSignal),
    platformCommandStatusLabel(item.status),
    platformCommandResidualRiskLabel(item.residualRisk),
    item.readinessScore,
    item.sourceRoute,
    item.buyerSegment,
    item.renewalProbability,
    item.forecastCategory,
    item.nrrDirection,
    item.qbrAction,
    item.commercialEvidence,
    item.pricingAction,
    item.executiveSponsor,
    item.forecastRisk,
    item.renewalWindow,
    item.nextAction,
  ]);

  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}
