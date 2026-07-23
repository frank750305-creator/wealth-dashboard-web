import {
  platformCommandGtmLaunchStateLabel,
  platformCommandLaunchSignalLabel,
  type PlatformCommandGtmLaunchItem,
  type PlatformCommandGtmLaunchState,
  type PlatformCommandLaunchSignal,
} from "@/lib/platformCommandGtmLaunch";
import {
  platformCommandResidualRiskLabel,
  type PlatformCommandResidualRisk,
} from "@/lib/platformCommandClosure";
import { platformCommandStatusLabel } from "@/lib/platformCommandSearch";

export type PlatformCommandCustomerSuccessState = "blocked" | "onboarding" | "adoption" | "scaled";
export type PlatformCommandAdoptionSignal = "at_risk" | "guided" | "healthy";

export type PlatformCommandCustomerSuccessActivationItem = {
  successId: string;
  launchId: string;
  revenueId: string;
  decisionId: string;
  owner: string;
  successOwner: string;
  customerSuccessState: PlatformCommandCustomerSuccessState;
  adoptionSignal: PlatformCommandAdoptionSignal;
  gtmLaunchState: PlatformCommandGtmLaunchState;
  launchSignal: PlatformCommandLaunchSignal;
  status: PlatformCommandGtmLaunchItem["status"];
  residualRisk: PlatformCommandResidualRisk;
  readinessScore: number;
  sourceRoute: string;
  buyerSegment: string;
  onboardingPlan: string;
  trainingAsset: string;
  activationMetric: string;
  healthMetric: string;
  usageCheckpoint: string;
  renewalRisk: string;
  supportModel: string;
  customerFeedbackLoop: string;
  successWindow: string;
  nextAction: string;
};

export type PlatformCommandCustomerSuccessActivationSummary = {
  status: PlatformCommandGtmLaunchItem["status"];
  itemCount: number;
  blockedCount: number;
  onboardingCount: number;
  adoptionCount: number;
  scaledCount: number;
  atRiskCount: number;
  guidedCount: number;
  healthyCount: number;
  averageReadinessScore: number;
  nextSuccessWindow: string;
};

function csvCell(value: unknown) {
  const stringValue = String(value ?? "");
  if (/[",\n]/.test(stringValue)) return `"${stringValue.replaceAll('"', '""')}"`;
  return stringValue;
}

function customerSuccessStateFor(item: PlatformCommandGtmLaunchItem): PlatformCommandCustomerSuccessState {
  if (item.gtmLaunchState === "blocked" || item.launchSignal === "hold" || item.status === "block") return "blocked";
  if (item.gtmLaunchState === "enablement") return "onboarding";
  if (item.gtmLaunchState === "pilot_launch" || item.launchSignal === "controlled") return "adoption";
  return "scaled";
}

function adoptionSignalFor(
  item: PlatformCommandGtmLaunchItem,
  state: PlatformCommandCustomerSuccessState,
): PlatformCommandAdoptionSignal {
  if (state === "blocked" || item.residualRisk === "high") return "at_risk";
  if (state === "onboarding" || state === "adoption" || item.residualRisk === "medium") return "guided";
  return "healthy";
}

export function platformCommandCustomerSuccessStateLabel(state: PlatformCommandCustomerSuccessState) {
  if (state === "blocked") return "Blocked";
  if (state === "onboarding") return "Onboarding";
  if (state === "adoption") return "Adoption";
  return "Scaled";
}

export function platformCommandAdoptionSignalLabel(signal: PlatformCommandAdoptionSignal) {
  if (signal === "at_risk") return "At risk";
  if (signal === "guided") return "Guided";
  return "Healthy";
}

function onboardingPlanFor(item: PlatformCommandGtmLaunchItem, signal: PlatformCommandAdoptionSignal) {
  if (signal === "at_risk") return `暫停 onboarding：${item.launchRisk}`;
  if (signal === "guided") return `受控 onboarding：${item.buyerSegment} / ${item.launchMotion}`;
  return `標準 onboarding：${item.buyerSegment}`;
}

function trainingAssetFor(item: PlatformCommandGtmLaunchItem, signal: PlatformCommandAdoptionSignal) {
  if (signal === "at_risk") return "無客戶訓練素材";
  if (signal === "guided") return `Pilot training / ${item.enablementAsset}`;
  return `Client academy / ${item.enablementAsset}`;
}

function activationMetricFor(item: PlatformCommandGtmLaunchItem, signal: PlatformCommandAdoptionSignal) {
  if (signal === "at_risk") return "解除 launch hold";
  if (signal === "guided") return `完成 pilot 使用：${item.successMetric}`;
  return `達成正式啟用：${item.successMetric}`;
}

function healthMetricFor(signal: PlatformCommandAdoptionSignal) {
  if (signal === "at_risk") return "Red health";
  if (signal === "guided") return "Yellow health";
  return "Green health";
}

function usageCheckpointFor(item: PlatformCommandGtmLaunchItem, signal: PlatformCommandAdoptionSignal) {
  if (signal === "at_risk") return `不建立使用檢查：${item.nextAction}`;
  if (signal === "guided") return "每週 pilot 使用檢查";
  return "每月客戶採用與價值回顧";
}

function renewalRiskFor(item: PlatformCommandGtmLaunchItem, signal: PlatformCommandAdoptionSignal) {
  if (signal === "at_risk") return item.launchRisk;
  if (signal === "guided") return `續約依賴 pilot 成果：${item.feedbackLoop}`;
  return `續約風險低，殘餘風險為 ${platformCommandResidualRiskLabel(item.residualRisk)}`;
}

function supportModelFor(signal: PlatformCommandAdoptionSignal) {
  if (signal === "at_risk") return "內部處理";
  if (signal === "guided") return "High-touch CS";
  return "Scaled CS + product education";
}

function feedbackLoopFor(signal: PlatformCommandAdoptionSignal) {
  if (signal === "at_risk") return "回到 GTM launch";
  if (signal === "guided") return "每週 CS / Sales / Product 回饋";
  return "每月 QBR 與 roadmap 回饋";
}

function successWindowFor(state: PlatformCommandCustomerSuccessState) {
  if (state === "blocked") return "暫緩";
  if (state === "onboarding") return "本週 onboarding";
  if (state === "adoption") return "本月 adoption";
  return "已可 scale";
}

function nextActionFor(item: PlatformCommandGtmLaunchItem, state: PlatformCommandCustomerSuccessState) {
  if (state === "blocked") return `先解除 launch 阻塞：${item.nextAction}`;
  if (state === "onboarding") return `建立客戶啟用 checklist：${item.enablementAsset}`;
  if (state === "adoption") return `安排 usage checkpoint 與 CS 回饋：${item.feedbackLoop}`;
  return "同步客戶成功 playbook 與續約觀測";
}

function stateRank(state: PlatformCommandCustomerSuccessState) {
  if (state === "blocked") return 4;
  if (state === "onboarding") return 3;
  if (state === "adoption") return 2;
  return 1;
}

export function buildPlatformCommandCustomerSuccessActivationItems(
  items: PlatformCommandGtmLaunchItem[],
): PlatformCommandCustomerSuccessActivationItem[] {
  return items
    .map((item, index) => {
      const customerSuccessState = customerSuccessStateFor(item);
      const adoptionSignal = adoptionSignalFor(item, customerSuccessState);

      return {
        successId: `CS-${String(index + 1).padStart(3, "0")}-${item.decisionId}`,
        launchId: item.launchId,
        revenueId: item.revenueId,
        decisionId: item.decisionId,
        owner: item.owner,
        successOwner: item.launchOwner,
        customerSuccessState,
        adoptionSignal,
        gtmLaunchState: item.gtmLaunchState,
        launchSignal: item.launchSignal,
        status: item.status,
        residualRisk: item.residualRisk,
        readinessScore: item.readinessScore,
        sourceRoute: item.sourceRoute,
        buyerSegment: item.buyerSegment,
        onboardingPlan: onboardingPlanFor(item, adoptionSignal),
        trainingAsset: trainingAssetFor(item, adoptionSignal),
        activationMetric: activationMetricFor(item, adoptionSignal),
        healthMetric: healthMetricFor(adoptionSignal),
        usageCheckpoint: usageCheckpointFor(item, adoptionSignal),
        renewalRisk: renewalRiskFor(item, adoptionSignal),
        supportModel: supportModelFor(adoptionSignal),
        customerFeedbackLoop: feedbackLoopFor(adoptionSignal),
        successWindow: successWindowFor(customerSuccessState),
        nextAction: nextActionFor(item, customerSuccessState),
      };
    })
    .sort(
      (left, right) =>
        stateRank(right.customerSuccessState) - stateRank(left.customerSuccessState) ||
        left.readinessScore - right.readinessScore ||
        left.successId.localeCompare(right.successId, "zh-Hant"),
    );
}

export function summarizePlatformCommandCustomerSuccessActivation(
  items: PlatformCommandCustomerSuccessActivationItem[],
): PlatformCommandCustomerSuccessActivationSummary {
  const blockedCount = items.filter((item) => item.customerSuccessState === "blocked").length;
  const onboardingCount = items.filter((item) => item.customerSuccessState === "onboarding").length;
  const adoptionCount = items.filter((item) => item.customerSuccessState === "adoption").length;
  const atRiskCount = items.filter((item) => item.adoptionSignal === "at_risk").length;
  const guidedCount = items.filter((item) => item.adoptionSignal === "guided").length;
  const averageReadinessScore = items.length
    ? Math.round(items.reduce((sum, item) => sum + item.readinessScore, 0) / items.length)
    : 0;

  return {
    status: atRiskCount > 0 ? "block" : guidedCount > 0 ? "watch" : "pass",
    itemCount: items.length,
    blockedCount,
    onboardingCount,
    adoptionCount,
    scaledCount: items.filter((item) => item.customerSuccessState === "scaled").length,
    atRiskCount,
    guidedCount,
    healthyCount: items.filter((item) => item.adoptionSignal === "healthy").length,
    averageReadinessScore,
    nextSuccessWindow: blockedCount > 0 ? "暫緩" : onboardingCount > 0 ? "本週 onboarding" : adoptionCount > 0 ? "本月 adoption" : "已可 scale",
  };
}

export function platformCommandCustomerSuccessActivationCsv(items: PlatformCommandCustomerSuccessActivationItem[]) {
  const header = [
    "success_id",
    "launch_id",
    "revenue_id",
    "decision_id",
    "owner",
    "success_owner",
    "customer_success_state",
    "adoption_signal",
    "gtm_launch_state",
    "launch_signal",
    "status",
    "residual_risk",
    "readiness_score",
    "source_route",
    "buyer_segment",
    "onboarding_plan",
    "training_asset",
    "activation_metric",
    "health_metric",
    "usage_checkpoint",
    "renewal_risk",
    "support_model",
    "customer_feedback_loop",
    "success_window",
    "next_action",
  ];
  const rows = items.map((item) => [
    item.successId,
    item.launchId,
    item.revenueId,
    item.decisionId,
    item.owner,
    item.successOwner,
    platformCommandCustomerSuccessStateLabel(item.customerSuccessState),
    platformCommandAdoptionSignalLabel(item.adoptionSignal),
    platformCommandGtmLaunchStateLabel(item.gtmLaunchState),
    platformCommandLaunchSignalLabel(item.launchSignal),
    platformCommandStatusLabel(item.status),
    platformCommandResidualRiskLabel(item.residualRisk),
    item.readinessScore,
    item.sourceRoute,
    item.buyerSegment,
    item.onboardingPlan,
    item.trainingAsset,
    item.activationMetric,
    item.healthMetric,
    item.usageCheckpoint,
    item.renewalRisk,
    item.supportModel,
    item.customerFeedbackLoop,
    item.successWindow,
    item.nextAction,
  ]);

  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}
