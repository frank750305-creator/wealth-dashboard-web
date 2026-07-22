import type {
  DataProductReliabilityAction,
  DataProductSloItem,
} from "@/lib/dataProductObservability";
import type {
  DataProductServiceState,
  DataProductStatusPageItem,
} from "@/lib/dataProductStatusPage";

export type DataProductReleasePolicy = "allow" | "guarded" | "freeze";

export type DataProductErrorBudgetItem = {
  domain: string;
  product: string;
  serviceState: DataProductServiceState;
  releasePolicy: DataProductReleasePolicy;
  sloScore: number;
  targetScore: number;
  budgetRemainingPercent: number;
  budgetConsumedPercent: number;
  burnRate: number;
  openActionCount: number;
  owner: string;
  evidence: string;
  action: string;
};

export type DataProductErrorBudgetSummary = {
  releasePolicy: DataProductReleasePolicy;
  productCount: number;
  allowCount: number;
  guardedCount: number;
  freezeCount: number;
  averageBudgetRemainingPercent: number | null;
  highestBurnRate: number | null;
};

function csvCell(value: unknown) {
  const stringValue = String(value ?? "");
  if (/[",\n]/.test(stringValue)) return `"${stringValue.replaceAll('"', '""')}"`;
  return stringValue;
}

function clamp(value: number, minValue: number, maxValue: number) {
  return Math.min(maxValue, Math.max(minValue, value));
}

function serviceStatePenalty(state: DataProductServiceState) {
  if (state === "incident") return 0.5;
  if (state === "degraded") return 0.2;
  return 0;
}

function releasePolicyLabel(policy: DataProductReleasePolicy) {
  if (policy === "allow") return "允許發布";
  if (policy === "guarded") return "條件發布";
  return "凍結發布";
}

export function releasePolicyText(policy: DataProductReleasePolicy) {
  return releasePolicyLabel(policy);
}

function releasePolicyFromBudget({
  serviceState,
  sloScore,
  budgetRemainingPercent,
  openActionCount,
}: {
  serviceState: DataProductServiceState;
  sloScore: number;
  budgetRemainingPercent: number;
  openActionCount: number;
}): DataProductReleasePolicy {
  if (serviceState === "incident" || sloScore < 65 || budgetRemainingPercent < 0.2) return "freeze";
  if (serviceState === "degraded" || openActionCount > 0 || budgetRemainingPercent < 0.5) return "guarded";
  return "allow";
}

function policyAction(policy: DataProductReleasePolicy, fallbackAction: string) {
  if (policy === "allow") return "可維持既有發布節奏，保留例行監控";
  if (policy === "guarded") return "新功能需附帶回滾方案，先完成資料同步或稽核覆核";
  return fallbackAction || "凍結對客戶發布，先修復 SLO、Action Queue 與狀態頁 incident";
}

function actionCountForProduct(product: string, actions: DataProductReliabilityAction[]) {
  return actions.filter((action) => action.product === product).length;
}

function statusPageForProduct(product: string, statusPageItems: DataProductStatusPageItem[]) {
  return statusPageItems.find((item) => item.product === product);
}

export function buildDataProductErrorBudgetItems({
  sloItems,
  statusPageItems,
  reliabilityActions,
}: {
  sloItems: DataProductSloItem[];
  statusPageItems: DataProductStatusPageItem[];
  reliabilityActions: DataProductReliabilityAction[];
}): DataProductErrorBudgetItem[] {
  return sloItems.map((item) => {
    const statusPageItem = statusPageForProduct(item.product, statusPageItems);
    const serviceState = statusPageItem?.serviceState ?? "degraded";
    const openActionCount = actionCountForProduct(item.product, reliabilityActions);
    const baseRemaining = clamp((item.score - 65) / 25, 0, 1);
    const actionPenalty = Math.min(0.6, openActionCount * 0.2);
    const remaining = clamp(baseRemaining - actionPenalty - serviceStatePenalty(serviceState), 0, 1);
    const consumed = 1 - remaining;
    const burnRate = Number((consumed * (1 + openActionCount * 0.5 + (serviceState === "incident" ? 1 : 0))).toFixed(2));
    const releasePolicy = releasePolicyFromBudget({
      serviceState,
      sloScore: item.score,
      budgetRemainingPercent: remaining,
      openActionCount,
    });

    return {
      domain: item.domain,
      product: item.product,
      serviceState,
      releasePolicy,
      sloScore: item.score,
      targetScore: 90,
      budgetRemainingPercent: remaining,
      budgetConsumedPercent: consumed,
      burnRate,
      openActionCount,
      owner: item.owner,
      evidence: `${item.evidence} / ${statusPageItem?.nextUpdate ?? "no status page"}`,
      action: policyAction(releasePolicy, statusPageItem?.operatorNote ?? item.action),
    };
  });
}

export function summarizeDataProductErrorBudget(
  items: DataProductErrorBudgetItem[],
): DataProductErrorBudgetSummary {
  const allowCount = items.filter((item) => item.releasePolicy === "allow").length;
  const guardedCount = items.filter((item) => item.releasePolicy === "guarded").length;
  const freezeCount = items.filter((item) => item.releasePolicy === "freeze").length;
  const averageBudgetRemainingPercent = items.length
    ? items.reduce((sum, item) => sum + item.budgetRemainingPercent, 0) / items.length
    : null;
  const highestBurnRate = items.length ? Math.max(...items.map((item) => item.burnRate)) : null;

  return {
    releasePolicy: freezeCount > 0 ? "freeze" : guardedCount > 0 ? "guarded" : "allow",
    productCount: items.length,
    allowCount,
    guardedCount,
    freezeCount,
    averageBudgetRemainingPercent,
    highestBurnRate,
  };
}

export function dataProductErrorBudgetCsv(items: DataProductErrorBudgetItem[]) {
  const header = [
    "domain",
    "product",
    "service_state",
    "release_policy",
    "slo_score",
    "target_score",
    "budget_remaining_percent",
    "budget_consumed_percent",
    "burn_rate",
    "open_action_count",
    "owner",
    "evidence",
    "action",
  ];
  const rows = items.map((item) => [
    item.domain,
    item.product,
    item.serviceState,
    releasePolicyLabel(item.releasePolicy),
    item.sloScore,
    item.targetScore,
    `${(item.budgetRemainingPercent * 100).toFixed(1)}%`,
    `${(item.budgetConsumedPercent * 100).toFixed(1)}%`,
    item.burnRate,
    item.openActionCount,
    item.owner,
    item.evidence,
    item.action,
  ]);

  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}
