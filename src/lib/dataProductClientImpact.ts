import type {
  ClientWorkspaceProvisioningItem,
  UsageBillingItem,
} from "@/lib/commercialAccessLayer";
import type {
  DataProductErrorBudgetItem,
  DataProductReleasePolicy,
} from "@/lib/dataProductErrorBudget";
import type { DataProductStatusPageItem } from "@/lib/dataProductStatusPage";

export type DataProductClientImpactSeverity = "none" | "watch" | "critical";

export type DataProductClientImpactItem = {
  workspace: string;
  segment: string;
  plan: string;
  severity: DataProductClientImpactSeverity;
  impactedProducts: string[];
  frozenProducts: number;
  degradedProducts: number;
  estimatedMonthlyRevenue: number;
  revenueRisk: string;
  communicationOwner: string;
  customerMessage: string;
  internalAction: string;
};

export type DataProductClientImpactSummary = {
  severity: DataProductClientImpactSeverity;
  workspaceCount: number;
  impactedWorkspaceCount: number;
  criticalWorkspaceCount: number;
  estimatedMonthlyRevenueAtRisk: number;
  frozenProductCount: number;
};

function csvCell(value: unknown) {
  const stringValue = String(value ?? "");
  if (/[",\n]/.test(stringValue)) return `"${stringValue.replaceAll('"', '""')}"`;
  return stringValue;
}

function severityLabel(severity: DataProductClientImpactSeverity) {
  if (severity === "critical") return "重大";
  if (severity === "watch") return "觀察";
  return "無影響";
}

export function clientImpactSeverityLabel(severity: DataProductClientImpactSeverity) {
  return severityLabel(severity);
}

function releasePolicyWeight(policy: DataProductReleasePolicy) {
  if (policy === "freeze") return 2;
  if (policy === "guarded") return 1;
  return 0;
}

function parseMonthlyRevenue(value: string) {
  if (!value.startsWith("NT$")) return 0;
  const match = value.match(/NT\$([\d,]+)/);
  if (!match) return 0;
  return Number(match[1].replaceAll(",", "")) || 0;
}

function billingForWorkspace(workspace: string, billingItems: UsageBillingItem[]) {
  return billingItems.find((item) => item.workspace === workspace);
}

function productMatchesWorkspace(product: string, workspace: ClientWorkspaceProvisioningItem) {
  const target = `${workspace.workspace} ${workspace.segment} ${workspace.plan} ${workspace.dataPackages}`.toLowerCase();
  const productName = product.toLowerCase();

  if (target.includes("全部資料產品")) return true;
  if (target.includes("企業") || target.includes("enterprise")) return true;
  if (productName.includes("價格") || productName.includes("匯率")) return target.includes("daily") || target.includes("商品") || target.includes("資料源");
  if (productName.includes("研究")) return target.includes("研究") || target.includes("商品");
  if (productName.includes("決策")) return target.includes("投組") || target.includes("審核");
  if (productName.includes("交易") || productName.includes("成交")) return target.includes("交易");
  if (productName.includes("例外") || productName.includes("sla") || productName.includes("kri")) return target.includes("sla") || target.includes("kri") || target.includes("例外") || target.includes("警示");
  if (productName.includes("警示")) return target.includes("警示") || target.includes("風控");
  return target.includes("資料產品");
}

function severityFromImpacts({
  workspaceStatus,
  frozenProducts,
  degradedProducts,
}: {
  workspaceStatus: ClientWorkspaceProvisioningItem["status"];
  frozenProducts: number;
  degradedProducts: number;
}): DataProductClientImpactSeverity {
  if (workspaceStatus === "block" || frozenProducts > 0) return "critical";
  if (workspaceStatus === "watch" || degradedProducts > 0) return "watch";
  return "none";
}

function customerMessage(severity: DataProductClientImpactSeverity, impactedProducts: string[]) {
  if (severity === "none") return "目前沒有可見服務影響。";
  const productText = impactedProducts.slice(0, 3).join("、") || "部分資料產品";
  if (severity === "watch") return `${productText} 處於觀察狀態，部分輸出可能需要人工覆核。`;
  return `${productText} 存在阻擋項，正式資料輸出或發布需暫停。`;
}

function internalAction(severity: DataProductClientImpactSeverity, workspace: ClientWorkspaceProvisioningItem) {
  if (severity === "none") return "維持例行監控與客戶成功追蹤";
  if (severity === "watch") return `由 ${workspace.owner} 追蹤資料同步、SLO 與客戶訊息`;
  return `由 ${workspace.owner} 啟動客戶通報與發布凍結覆核`;
}

export function buildDataProductClientImpactItems({
  workspaces,
  billingItems,
  statusPageItems,
  errorBudgetItems,
}: {
  workspaces: ClientWorkspaceProvisioningItem[];
  billingItems: UsageBillingItem[];
  statusPageItems: DataProductStatusPageItem[];
  errorBudgetItems: DataProductErrorBudgetItem[];
}): DataProductClientImpactItem[] {
  const productStateByName = new Map(statusPageItems.map((item) => [item.product, item]));
  const errorBudgetByName = new Map(errorBudgetItems.map((item) => [item.product, item]));

  return workspaces.map((workspace) => {
    const matchedProducts = errorBudgetItems.filter((item) => productMatchesWorkspace(item.product, workspace));
    const impactedProducts = matchedProducts.filter((item) => item.releasePolicy !== "allow");
    const frozenProducts = impactedProducts.filter((item) => item.releasePolicy === "freeze").length;
    const degradedProducts = impactedProducts.filter((item) => item.releasePolicy === "guarded").length;
    const severity = severityFromImpacts({
      workspaceStatus: workspace.status,
      frozenProducts,
      degradedProducts,
    });
    const billingItem = billingForWorkspace(workspace.workspace, billingItems);
    const estimatedMonthlyRevenue = parseMonthlyRevenue(billingItem?.monthlyRevenue ?? "");
    const impactWeight = impactedProducts.reduce((sum, item) => sum + releasePolicyWeight(item.releasePolicy), 0);
    const revenueRisk =
      estimatedMonthlyRevenue > 0 && impactWeight > 0
        ? `NT$${Math.round(estimatedMonthlyRevenue * Math.min(1, impactWeight / 4)).toLocaleString("zh-TW")} / 月`
        : billingItem?.monthlyRevenue.includes("合約")
          ? "合約續約風險"
          : "低";
    const impactedProductNames = impactedProducts.map((item) => {
      const state = productStateByName.get(item.product)?.serviceState ?? "degraded";
      const budget = errorBudgetByName.get(item.product)?.releasePolicy ?? item.releasePolicy;
      return `${item.product} (${state}/${budget})`;
    });

    return {
      workspace: workspace.workspace,
      segment: workspace.segment,
      plan: workspace.plan,
      severity,
      impactedProducts: impactedProductNames,
      frozenProducts,
      degradedProducts,
      estimatedMonthlyRevenue,
      revenueRisk,
      communicationOwner: workspace.owner,
      customerMessage: customerMessage(severity, impactedProductNames),
      internalAction: internalAction(severity, workspace),
    };
  });
}

export function summarizeDataProductClientImpact(
  items: DataProductClientImpactItem[],
): DataProductClientImpactSummary {
  const impactedWorkspaceCount = items.filter((item) => item.severity !== "none").length;
  const criticalWorkspaceCount = items.filter((item) => item.severity === "critical").length;
  const estimatedMonthlyRevenueAtRisk = items
    .filter((item) => item.severity !== "none")
    .reduce((sum, item) => sum + item.estimatedMonthlyRevenue, 0);
  const frozenProductCount = items.reduce((sum, item) => sum + item.frozenProducts, 0);

  return {
    severity: criticalWorkspaceCount > 0 ? "critical" : impactedWorkspaceCount > 0 ? "watch" : "none",
    workspaceCount: items.length,
    impactedWorkspaceCount,
    criticalWorkspaceCount,
    estimatedMonthlyRevenueAtRisk,
    frozenProductCount,
  };
}

export function dataProductClientImpactCsv(items: DataProductClientImpactItem[]) {
  const header = [
    "workspace",
    "segment",
    "plan",
    "severity",
    "impacted_products",
    "frozen_products",
    "degraded_products",
    "estimated_monthly_revenue",
    "revenue_risk",
    "communication_owner",
    "customer_message",
    "internal_action",
  ];
  const rows = items.map((item) => [
    item.workspace,
    item.segment,
    item.plan,
    severityLabel(item.severity),
    item.impactedProducts.join(" | "),
    item.frozenProducts,
    item.degradedProducts,
    item.estimatedMonthlyRevenue,
    item.revenueRisk,
    item.communicationOwner,
    item.customerMessage,
    item.internalAction,
  ]);

  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}
