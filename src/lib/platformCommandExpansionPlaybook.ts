import {
  platformCommandAdoptionSignalLabel,
  platformCommandCustomerSuccessStateLabel,
  type PlatformCommandAdoptionSignal,
  type PlatformCommandCustomerSuccessActivationItem,
  type PlatformCommandCustomerSuccessState,
} from "@/lib/platformCommandCustomerSuccessActivation";
import {
  platformCommandResidualRiskLabel,
  type PlatformCommandResidualRisk,
} from "@/lib/platformCommandClosure";
import { platformCommandStatusLabel } from "@/lib/platformCommandSearch";

export type PlatformCommandExpansionState = "blocked" | "renewal_save" | "expansion_ready" | "scale_motion";
export type PlatformCommandExpansionSignal = "protect" | "expand" | "scale";

export type PlatformCommandExpansionPlaybookItem = {
  expansionId: string;
  successId: string;
  launchId: string;
  decisionId: string;
  owner: string;
  expansionOwner: string;
  expansionState: PlatformCommandExpansionState;
  expansionSignal: PlatformCommandExpansionSignal;
  customerSuccessState: PlatformCommandCustomerSuccessState;
  adoptionSignal: PlatformCommandAdoptionSignal;
  status: PlatformCommandCustomerSuccessActivationItem["status"];
  residualRisk: PlatformCommandResidualRisk;
  readinessScore: number;
  sourceRoute: string;
  buyerSegment: string;
  renewalPosture: string;
  expansionPath: string;
  stakeholderMap: string;
  valueProof: string;
  pricingLever: string;
  successMotion: string;
  commercialAsk: string;
  expansionWindow: string;
  riskNote: string;
  nextAction: string;
};

export type PlatformCommandExpansionPlaybookSummary = {
  status: PlatformCommandCustomerSuccessActivationItem["status"];
  itemCount: number;
  blockedCount: number;
  renewalSaveCount: number;
  expansionReadyCount: number;
  scaleMotionCount: number;
  protectCount: number;
  expandCount: number;
  scaleCount: number;
  averageReadinessScore: number;
  nextExpansionWindow: string;
};

function csvCell(value: unknown) {
  const stringValue = String(value ?? "");
  if (/[",\n]/.test(stringValue)) return `"${stringValue.replaceAll('"', '""')}"`;
  return stringValue;
}

function expansionStateFor(item: PlatformCommandCustomerSuccessActivationItem): PlatformCommandExpansionState {
  if (item.customerSuccessState === "blocked" || item.adoptionSignal === "at_risk" || item.status === "block") {
    return "blocked";
  }
  if (item.customerSuccessState === "onboarding") return "renewal_save";
  if (item.customerSuccessState === "adoption" || item.adoptionSignal === "guided") return "expansion_ready";
  return "scale_motion";
}

function expansionSignalFor(
  item: PlatformCommandCustomerSuccessActivationItem,
  state: PlatformCommandExpansionState,
): PlatformCommandExpansionSignal {
  if (state === "blocked" || item.residualRisk === "high") return "protect";
  if (state === "renewal_save" || state === "expansion_ready" || item.residualRisk === "medium") return "expand";
  return "scale";
}

export function platformCommandExpansionStateLabel(state: PlatformCommandExpansionState) {
  if (state === "blocked") return "Blocked";
  if (state === "renewal_save") return "Renewal save";
  if (state === "expansion_ready") return "Expansion ready";
  return "Scale motion";
}

export function platformCommandExpansionSignalLabel(signal: PlatformCommandExpansionSignal) {
  if (signal === "protect") return "Protect";
  if (signal === "expand") return "Expand";
  return "Scale";
}

function renewalPostureFor(item: PlatformCommandCustomerSuccessActivationItem, signal: PlatformCommandExpansionSignal) {
  if (signal === "protect") return `先保護續約：${item.renewalRisk}`;
  if (signal === "expand") return `可做 guided renewal：${item.healthMetric}`;
  return `可進擴張續約：${item.healthMetric}`;
}

function expansionPathFor(item: PlatformCommandCustomerSuccessActivationItem, signal: PlatformCommandExpansionSignal) {
  if (signal === "protect") return "不做 upsell，先處理採用風險";
  if (signal === "expand") return `從 ${item.buyerSegment} 的 pilot/usage 增購切入`;
  return `從 ${item.buyerSegment} 擴到團隊 / API / 企業席位`;
}

function stakeholderMapFor(item: PlatformCommandCustomerSuccessActivationItem, signal: PlatformCommandExpansionSignal) {
  if (signal === "protect") return `${item.successOwner} + 內部 owner`;
  if (signal === "expand") return `${item.successOwner} + 顧問 champion + product owner`;
  return `${item.successOwner} + executive buyer + procurement`;
}

function valueProofFor(item: PlatformCommandCustomerSuccessActivationItem, signal: PlatformCommandExpansionSignal) {
  if (signal === "protect") return `價值證明不足：${item.activationMetric}`;
  if (signal === "expand") return `使用證明：${item.usageCheckpoint}`;
  return `可規模化價值：${item.activationMetric}`;
}

function pricingLeverFor(signal: PlatformCommandExpansionSignal) {
  if (signal === "protect") return "不調價";
  if (signal === "expand") return "pilot upgrade / seat expansion";
  return "enterprise bundle / API entitlement";
}

function successMotionFor(item: PlatformCommandCustomerSuccessActivationItem, signal: PlatformCommandExpansionSignal) {
  if (signal === "protect") return `CS rescue：${item.supportModel}`;
  if (signal === "expand") return `guided QBR：${item.customerFeedbackLoop}`;
  return `scaled QBR + executive readout：${item.customerFeedbackLoop}`;
}

function commercialAskFor(item: PlatformCommandCustomerSuccessActivationItem, signal: PlatformCommandExpansionSignal) {
  if (signal === "protect") return `先解風險：${item.nextAction}`;
  if (signal === "expand") return "請 sales / CS 確認擴張假設與下一次 QBR";
  return "請準備 enterprise 擴張 proposal";
}

function expansionWindowFor(state: PlatformCommandExpansionState) {
  if (state === "blocked") return "暫緩";
  if (state === "renewal_save") return "本週續約保護";
  if (state === "expansion_ready") return "本月擴張評估";
  return "可進 scale pipeline";
}

function riskNoteFor(item: PlatformCommandCustomerSuccessActivationItem, signal: PlatformCommandExpansionSignal) {
  if (signal === "protect") return item.renewalRisk;
  if (signal === "expand") return `需控管：${item.usageCheckpoint}`;
  return `可 scale，殘餘風險為 ${platformCommandResidualRiskLabel(item.residualRisk)}`;
}

function nextActionFor(item: PlatformCommandCustomerSuccessActivationItem, state: PlatformCommandExpansionState) {
  if (state === "blocked") return `先完成客戶成功阻塞：${item.nextAction}`;
  if (state === "renewal_save") return `建立 renewal save plan：${item.supportModel}`;
  if (state === "expansion_ready") return `準備 QBR 與擴張假設：${item.activationMetric}`;
  return "同步 enterprise expansion pipeline";
}

function stateRank(state: PlatformCommandExpansionState) {
  if (state === "blocked") return 4;
  if (state === "renewal_save") return 3;
  if (state === "expansion_ready") return 2;
  return 1;
}

export function buildPlatformCommandExpansionPlaybookItems(
  items: PlatformCommandCustomerSuccessActivationItem[],
): PlatformCommandExpansionPlaybookItem[] {
  return items
    .map((item, index) => {
      const expansionState = expansionStateFor(item);
      const expansionSignal = expansionSignalFor(item, expansionState);

      return {
        expansionId: `EXP-${String(index + 1).padStart(3, "0")}-${item.decisionId}`,
        successId: item.successId,
        launchId: item.launchId,
        decisionId: item.decisionId,
        owner: item.owner,
        expansionOwner: item.successOwner,
        expansionState,
        expansionSignal,
        customerSuccessState: item.customerSuccessState,
        adoptionSignal: item.adoptionSignal,
        status: item.status,
        residualRisk: item.residualRisk,
        readinessScore: item.readinessScore,
        sourceRoute: item.sourceRoute,
        buyerSegment: item.buyerSegment,
        renewalPosture: renewalPostureFor(item, expansionSignal),
        expansionPath: expansionPathFor(item, expansionSignal),
        stakeholderMap: stakeholderMapFor(item, expansionSignal),
        valueProof: valueProofFor(item, expansionSignal),
        pricingLever: pricingLeverFor(expansionSignal),
        successMotion: successMotionFor(item, expansionSignal),
        commercialAsk: commercialAskFor(item, expansionSignal),
        expansionWindow: expansionWindowFor(expansionState),
        riskNote: riskNoteFor(item, expansionSignal),
        nextAction: nextActionFor(item, expansionState),
      };
    })
    .sort(
      (left, right) =>
        stateRank(right.expansionState) - stateRank(left.expansionState) ||
        left.readinessScore - right.readinessScore ||
        left.expansionId.localeCompare(right.expansionId, "zh-Hant"),
    );
}

export function summarizePlatformCommandExpansionPlaybook(
  items: PlatformCommandExpansionPlaybookItem[],
): PlatformCommandExpansionPlaybookSummary {
  const blockedCount = items.filter((item) => item.expansionState === "blocked").length;
  const renewalSaveCount = items.filter((item) => item.expansionState === "renewal_save").length;
  const expansionReadyCount = items.filter((item) => item.expansionState === "expansion_ready").length;
  const protectCount = items.filter((item) => item.expansionSignal === "protect").length;
  const expandCount = items.filter((item) => item.expansionSignal === "expand").length;
  const averageReadinessScore = items.length
    ? Math.round(items.reduce((sum, item) => sum + item.readinessScore, 0) / items.length)
    : 0;

  return {
    status: protectCount > 0 ? "block" : expandCount > 0 ? "watch" : "pass",
    itemCount: items.length,
    blockedCount,
    renewalSaveCount,
    expansionReadyCount,
    scaleMotionCount: items.filter((item) => item.expansionState === "scale_motion").length,
    protectCount,
    expandCount,
    scaleCount: items.filter((item) => item.expansionSignal === "scale").length,
    averageReadinessScore,
    nextExpansionWindow: blockedCount > 0 ? "暫緩" : renewalSaveCount > 0 ? "本週續約保護" : expansionReadyCount > 0 ? "本月擴張評估" : "可進 scale pipeline",
  };
}

export function platformCommandExpansionPlaybookCsv(items: PlatformCommandExpansionPlaybookItem[]) {
  const header = [
    "expansion_id",
    "success_id",
    "launch_id",
    "decision_id",
    "owner",
    "expansion_owner",
    "expansion_state",
    "expansion_signal",
    "customer_success_state",
    "adoption_signal",
    "status",
    "residual_risk",
    "readiness_score",
    "source_route",
    "buyer_segment",
    "renewal_posture",
    "expansion_path",
    "stakeholder_map",
    "value_proof",
    "pricing_lever",
    "success_motion",
    "commercial_ask",
    "expansion_window",
    "risk_note",
    "next_action",
  ];
  const rows = items.map((item) => [
    item.expansionId,
    item.successId,
    item.launchId,
    item.decisionId,
    item.owner,
    item.expansionOwner,
    platformCommandExpansionStateLabel(item.expansionState),
    platformCommandExpansionSignalLabel(item.expansionSignal),
    platformCommandCustomerSuccessStateLabel(item.customerSuccessState),
    platformCommandAdoptionSignalLabel(item.adoptionSignal),
    platformCommandStatusLabel(item.status),
    platformCommandResidualRiskLabel(item.residualRisk),
    item.readinessScore,
    item.sourceRoute,
    item.buyerSegment,
    item.renewalPosture,
    item.expansionPath,
    item.stakeholderMap,
    item.valueProof,
    item.pricingLever,
    item.successMotion,
    item.commercialAsk,
    item.expansionWindow,
    item.riskNote,
    item.nextAction,
  ]);

  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}
