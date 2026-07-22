import type {
  ClientWorkspaceProvisioningItem,
  UsageBillingItem,
} from "@/lib/commercialAccessLayer";
import type { CustomerSuccessHealthItem } from "@/lib/customerSuccessHealth";
import type {
  DataProductClientImpactItem,
  DataProductClientImpactSeverity,
} from "@/lib/dataProductClientImpact";
import type { RevenueForecastItem } from "@/lib/revenueForecast";

export type AccountHealthStage = "expand" | "healthy" | "watch" | "risk";
export type AccountHealthStatus = "pass" | "watch" | "block";

export type AccountHealthItem = {
  workspace: string;
  segment: string;
  plan: string;
  stage: AccountHealthStage;
  status: AccountHealthStatus;
  healthScore: number;
  renewalProbability: number;
  currentMrr: number;
  expansionMrr: number;
  churnRiskMrr: number;
  projectedMrr: number;
  netMrrOpportunity: number;
  productImpactSeverity: DataProductClientImpactSeverity;
  impactedProducts: string[];
  invoiceStatus: string;
  seatUsage: string;
  apiUsage: string;
  owner: string;
  riskDrivers: string[];
  nextAction: string;
};

export type AccountHealthSummary = {
  status: AccountHealthStatus;
  accountCount: number;
  healthyCount: number;
  watchCount: number;
  riskCount: number;
  expansionCount: number;
  impactedAccountCount: number;
  criticalImpactCount: number;
  currentMrr: number;
  expansionMrr: number;
  churnRiskMrr: number;
  projectedMrr: number;
  netMrrOpportunity: number;
};

function csvCell(value: unknown) {
  const stringValue = String(value ?? "");
  if (/[",\n]/.test(stringValue)) return `"${stringValue.replaceAll('"', '""')}"`;
  return stringValue;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function executionReviewLabel(status: AccountHealthStatus) {
  if (status === "pass") return "通過";
  if (status === "watch") return "觀察";
  return "暫停";
}

export function accountHealthStageLabel(stage: AccountHealthStage) {
  if (stage === "expand") return "擴售";
  if (stage === "healthy") return "健康";
  if (stage === "watch") return "觀察";
  return "續約風險";
}

export function accountHealthStageClass(stage: AccountHealthStage) {
  if (stage === "expand") return "border-sky-500/40 bg-sky-500/10 text-sky-300";
  if (stage === "healthy") return "border-emerald-500/40 bg-emerald-500/10 text-emerald-300";
  if (stage === "watch") return "border-amber-500/40 bg-amber-500/10 text-amber-300";
  return "border-rose-500/40 bg-rose-500/10 text-rose-300";
}

export function accountHealthStatusLabel(status: AccountHealthStatus) {
  return executionReviewLabel(status);
}

function parseMonthlyRevenue(value: string) {
  const match = value.match(/NT\$([\d,]+)/);
  if (match) return Number(match[1].replaceAll(",", "")) || 0;
  if (value.includes("年度合約")) return 120000;
  return 0;
}

function statusPenalty(status: AccountHealthStatus) {
  if (status === "block") return 18;
  if (status === "watch") return 7;
  return 0;
}

function stageStatus(stage: AccountHealthStage): AccountHealthStatus {
  if (stage === "risk") return "block";
  if (stage === "watch") return "watch";
  return "pass";
}

function rankStatus(status: AccountHealthStatus) {
  if (status === "block") return 3;
  if (status === "watch") return 2;
  return 1;
}

function combinedStatus(statuses: AccountHealthStatus[]): AccountHealthStatus {
  return statuses.reduce((current, status) => (rankStatus(status) > rankStatus(current) ? status : current), "pass");
}

function accountStage({
  score,
  renewalProbability,
  expansionMrr,
  currentMrr,
  churnRiskMrr,
  impactSeverity,
  billingStatus,
  workspaceStatus,
}: {
  score: number;
  renewalProbability: number;
  expansionMrr: number;
  currentMrr: number;
  churnRiskMrr: number;
  impactSeverity: DataProductClientImpactSeverity;
  billingStatus: AccountHealthStatus;
  workspaceStatus: AccountHealthStatus;
}): AccountHealthStage {
  if (
    score < 58 ||
    renewalProbability < 0.58 ||
    impactSeverity === "critical" ||
    workspaceStatus === "block" ||
    billingStatus === "block" ||
    churnRiskMrr > Math.max(0, currentMrr * 0.45)
  ) {
    return "risk";
  }

  if (score < 76 || renewalProbability < 0.76 || impactSeverity === "watch" || workspaceStatus === "watch" || billingStatus === "watch") {
    return "watch";
  }

  if (score >= 86 && expansionMrr > 0) return "expand";
  return "healthy";
}

function riskDrivers({
  customer,
  forecast,
  billing,
  workspace,
  impact,
}: {
  customer?: CustomerSuccessHealthItem;
  forecast?: RevenueForecastItem;
  billing?: UsageBillingItem;
  workspace: ClientWorkspaceProvisioningItem;
  impact?: DataProductClientImpactItem;
}) {
  const drivers: string[] = [];

  if (workspace.status !== "pass") drivers.push(`工作區：${workspace.evidence}`);
  if (billing && billing.status !== "pass") drivers.push(`帳務：${billing.invoiceStatus}`);
  if (customer && customer.healthStage === "risk") drivers.push(customer.riskSignal);
  if (customer && customer.healthStage === "watch") drivers.push(customer.nextAction);
  if (forecast && forecast.renewalProbability < 0.7) drivers.push(`續約機率 ${Math.round(forecast.renewalProbability * 100)}%`);
  if (forecast && forecast.churnRiskMrr > 0) drivers.push(`流失風險 NT$${forecast.churnRiskMrr.toLocaleString("zh-TW")} / 月`);
  if (impact && impact.severity !== "none") drivers.push(impact.customerMessage);

  return drivers.length ? drivers.slice(0, 4) : ["健康度穩定，可維持例行 QBR 與使用檢查"];
}

function nextActionFor(stage: AccountHealthStage, customer?: CustomerSuccessHealthItem, forecast?: RevenueForecastItem) {
  if (stage === "risk") return customer?.nextAction ?? forecast?.nextAction ?? "建立保留方案，先處理阻擋項";
  if (stage === "watch") return customer?.nextAction ?? forecast?.nextAction ?? "安排 14 天改善計畫";
  if (stage === "expand") return forecast?.nextAction ?? customer?.expansionSignal ?? "提出擴售方案";
  return customer?.nextAction ?? forecast?.nextAction ?? "維持月度健康檢查";
}

export function buildAccountHealthItems({
  workspaces,
  billingItems,
  customerSuccessHealthItems,
  revenueForecastItems,
  dataProductClientImpactItems,
}: {
  workspaces: ClientWorkspaceProvisioningItem[];
  billingItems: UsageBillingItem[];
  customerSuccessHealthItems: CustomerSuccessHealthItem[];
  revenueForecastItems: RevenueForecastItem[];
  dataProductClientImpactItems: DataProductClientImpactItem[];
}): AccountHealthItem[] {
  const billingByWorkspace = new Map(billingItems.map((item) => [item.workspace, item]));
  const customerByWorkspace = new Map(customerSuccessHealthItems.map((item) => [item.workspace, item]));
  const forecastByWorkspace = new Map(revenueForecastItems.map((item) => [item.workspace, item]));
  const impactByWorkspace = new Map(dataProductClientImpactItems.map((item) => [item.workspace, item]));

  return workspaces
    .map((workspace) => {
      const billing = billingByWorkspace.get(workspace.workspace);
      const customer = customerByWorkspace.get(workspace.workspace);
      const forecast = forecastByWorkspace.get(workspace.workspace);
      const impact = impactByWorkspace.get(workspace.workspace);
      const currentMrr = forecast?.currentMrr ?? parseMonthlyRevenue(billing?.monthlyRevenue ?? workspace.billing);
      const impactPenalty = impact?.severity === "critical" ? 16 : impact?.severity === "watch" ? 7 : 0;
      const score = Math.round(
        clamp(
          (customer?.healthScore ?? 70) -
            impactPenalty -
            statusPenalty(workspace.status) -
            statusPenalty(billing?.status ?? "watch"),
          0,
          100,
        ),
      );
      const renewalProbability = clamp(
        (forecast?.renewalProbability ?? score / 100) -
          (impact?.severity === "critical" ? 0.12 : impact?.severity === "watch" ? 0.05 : 0),
        0.05,
        0.98,
      );
      const expansionMrr = forecast?.expansionMrr ?? 0;
      const churnRiskMrr = forecast?.churnRiskMrr ?? (score < 60 ? Math.round(currentMrr * 0.4) : 0);
      const projectedMrr = forecast?.projectedMrr ?? Math.max(0, currentMrr + expansionMrr - churnRiskMrr);
      const stage = accountStage({
        score,
        renewalProbability,
        expansionMrr,
        currentMrr,
        churnRiskMrr,
        impactSeverity: impact?.severity ?? "none",
        billingStatus: billing?.status ?? "watch",
        workspaceStatus: workspace.status,
      });
      const status = stageStatus(stage);

      return {
        workspace: workspace.workspace,
        segment: workspace.segment,
        plan: workspace.plan,
        stage,
        status,
        healthScore: score,
        renewalProbability,
        currentMrr,
        expansionMrr,
        churnRiskMrr,
        projectedMrr,
        netMrrOpportunity: projectedMrr - currentMrr,
        productImpactSeverity: impact?.severity ?? "none",
        impactedProducts: impact?.impactedProducts ?? [],
        invoiceStatus: billing?.invoiceStatus ?? workspace.billing,
        seatUsage: billing?.seatUsage ?? workspace.seats,
        apiUsage: billing?.apiUsage ?? workspace.apiKeys,
        owner: customer?.owner ?? forecast?.owner ?? billing?.owner ?? workspace.owner,
        riskDrivers: riskDrivers({ customer, forecast, billing, workspace, impact }),
        nextAction: nextActionFor(stage, customer, forecast),
      };
    })
    .sort(
      (left, right) =>
        rankStatus(right.status) - rankStatus(left.status) ||
        right.churnRiskMrr - left.churnRiskMrr ||
        right.expansionMrr - left.expansionMrr ||
        left.workspace.localeCompare(right.workspace, "zh-Hant"),
    );
}

export function summarizeAccountHealth(items: AccountHealthItem[]): AccountHealthSummary {
  const status = combinedStatus(items.map((item) => item.status));

  return {
    status,
    accountCount: items.length,
    healthyCount: items.filter((item) => item.stage === "healthy").length,
    watchCount: items.filter((item) => item.stage === "watch").length,
    riskCount: items.filter((item) => item.stage === "risk").length,
    expansionCount: items.filter((item) => item.stage === "expand").length,
    impactedAccountCount: items.filter((item) => item.productImpactSeverity !== "none").length,
    criticalImpactCount: items.filter((item) => item.productImpactSeverity === "critical").length,
    currentMrr: items.reduce((sum, item) => sum + item.currentMrr, 0),
    expansionMrr: items.reduce((sum, item) => sum + item.expansionMrr, 0),
    churnRiskMrr: items.reduce((sum, item) => sum + item.churnRiskMrr, 0),
    projectedMrr: items.reduce((sum, item) => sum + item.projectedMrr, 0),
    netMrrOpportunity: items.reduce((sum, item) => sum + item.netMrrOpportunity, 0),
  };
}

export function accountHealthCsv(items: AccountHealthItem[]) {
  const header = [
    "workspace",
    "segment",
    "plan",
    "stage",
    "status",
    "health_score",
    "renewal_probability",
    "current_mrr",
    "expansion_mrr",
    "churn_risk_mrr",
    "projected_mrr",
    "net_mrr_opportunity",
    "product_impact_severity",
    "impacted_products",
    "invoice_status",
    "seat_usage",
    "api_usage",
    "owner",
    "risk_drivers",
    "next_action",
  ];
  const rows = items.map((item) => [
    item.workspace,
    item.segment,
    item.plan,
    accountHealthStageLabel(item.stage),
    accountHealthStatusLabel(item.status),
    item.healthScore,
    item.renewalProbability,
    item.currentMrr,
    item.expansionMrr,
    item.churnRiskMrr,
    item.projectedMrr,
    item.netMrrOpportunity,
    item.productImpactSeverity,
    item.impactedProducts.join(" | "),
    item.invoiceStatus,
    item.seatUsage,
    item.apiUsage,
    item.owner,
    item.riskDrivers.join(" | "),
    item.nextAction,
  ]);

  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}
