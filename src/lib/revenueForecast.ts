export type RevenueForecastStatus = "pass" | "watch" | "block";
export type RevenueForecastCustomerHealthStage = "expand" | "healthy" | "watch" | "risk";
export type RevenueForecastStage = "expansion" | "renewal" | "protect" | "nurture";

export type RevenueForecastCustomer = {
  workspace: string;
  plan: string;
  healthStage: RevenueForecastCustomerHealthStage;
  status: RevenueForecastStatus;
  healthScore: number;
  revenueSignal: string;
  owner: string;
};

export type RevenueForecastBilling = {
  workspace: string;
  plan: string;
  monthlyRevenue: string;
  invoiceStatus: string;
  status: RevenueForecastStatus;
};

export type RevenueForecastItem = {
  workspace: string;
  plan: string;
  forecastStage: RevenueForecastStage;
  status: RevenueForecastStatus;
  currentMrr: number;
  expansionMrr: number;
  churnRiskMrr: number;
  projectedMrr: number;
  renewalProbability: number;
  owner: string;
  evidence: string;
  quarterAction: string;
  nextAction: string;
};

function csvCell(value: unknown) {
  const stringValue = String(value ?? "");
  if (/[",\n]/.test(stringValue)) return `"${stringValue.replaceAll('"', '""')}"`;
  return stringValue;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function executionReviewLabel(status: RevenueForecastStatus) {
  if (status === "pass") return "通過";
  if (status === "watch") return "觀察";
  return "暫停";
}

function customerHealthStageLabel(stage: RevenueForecastCustomerHealthStage) {
  if (stage === "expand") return "可擴充";
  if (stage === "healthy") return "健康";
  if (stage === "watch") return "觀察";
  return "續約風險";
}

export function revenueForecastStageLabel(stage: RevenueForecastStage) {
  if (stage === "expansion") return "擴售";
  if (stage === "renewal") return "續約";
  if (stage === "protect") return "保留";
  return "培育";
}

export function revenueForecastStageClass(stage: RevenueForecastStage) {
  if (stage === "expansion") return "border-sky-500/40 bg-sky-500/10 text-sky-300";
  if (stage === "renewal") return "border-emerald-500/40 bg-emerald-500/10 text-emerald-300";
  if (stage === "protect") return "border-rose-500/40 bg-rose-500/10 text-rose-300";
  return "border-amber-500/40 bg-amber-500/10 text-amber-300";
}

function parseMonthlyRevenueValue(value: string, plan: string) {
  const match = value.match(/NT\$([\d,]+)/);
  if (match) return Number(match[1].replaceAll(",", ""));
  if (value.includes("年度合約")) return plan.includes("Enterprise") ? 120000 : 0;
  if (value.includes("包含於企業合約")) return 0;
  return 0;
}

function revenueStatusFromProbability(probability: number): RevenueForecastStatus {
  if (probability >= 0.85) return "pass";
  if (probability >= 0.65) return "watch";
  return "block";
}

function revenueForecastStageForCustomer(customer: RevenueForecastCustomer, currentMrr: number): RevenueForecastStage {
  if (customer.healthStage === "expand") return "expansion";
  if (customer.healthStage === "risk") return "protect";
  if (currentMrr > 0 && customer.healthScore >= 75) return "renewal";
  return "nurture";
}

export function buildRevenueForecastItems({
  customerSuccessHealthItems,
  usageBillingItems,
}: {
  customerSuccessHealthItems: RevenueForecastCustomer[];
  usageBillingItems: RevenueForecastBilling[];
}): RevenueForecastItem[] {
  const billingByWorkspace = new Map(usageBillingItems.map((item) => [item.workspace, item]));

  return customerSuccessHealthItems
    .map((customer) => {
      const billing = billingByWorkspace.get(customer.workspace);
      const currentMrr = billing ? parseMonthlyRevenueValue(billing.monthlyRevenue, billing.plan) : 0;
      const forecastStage = revenueForecastStageForCustomer(customer, currentMrr);
      const renewalProbability = clamp(
        customer.healthScore / 100 -
          (customer.status === "block" ? 0.18 : customer.status === "watch" ? 0.08 : 0) -
          (billing?.status === "block" ? 0.12 : billing?.status === "watch" ? 0.05 : 0),
        0.05,
        0.98,
      );
      const expansionMrr =
        forecastStage === "expansion"
          ? Math.max(9900, Math.round(currentMrr * 0.35))
          : forecastStage === "renewal"
            ? Math.round(currentMrr * 0.1)
            : 0;
      const churnRiskMrr =
        forecastStage === "protect"
          ? Math.round(currentMrr * 0.65)
          : customer.status === "watch"
            ? Math.round(currentMrr * 0.2)
            : 0;
      const projectedMrr = Math.max(0, Math.round(currentMrr + expansionMrr - churnRiskMrr));
      const status = revenueStatusFromProbability(renewalProbability);
      const quarterAction =
        forecastStage === "expansion"
          ? "QBR 擴售提案"
          : forecastStage === "renewal"
            ? "續約與使用回顧"
            : forecastStage === "protect"
              ? "續約風險保留方案"
              : "培育轉付費路徑";
      const nextAction =
        forecastStage === "expansion"
          ? "提出席位、API 額度或企業資料包升級"
          : forecastStage === "renewal"
            ? "確認本季續約條件與成功案例"
            : forecastStage === "protect"
              ? "安排風控、客戶成功與產品 owner 共同處理阻擋項"
              : "增加 onboarding 與 demo 使用深度";

      return {
        workspace: customer.workspace,
        plan: customer.plan,
        forecastStage,
        status,
        currentMrr,
        expansionMrr,
        churnRiskMrr,
        projectedMrr,
        renewalProbability,
        owner: customer.owner,
        evidence: `${customerHealthStageLabel(customer.healthStage)} / ${customer.healthScore} 分 / ${billing?.invoiceStatus ?? customer.revenueSignal}`,
        quarterAction,
        nextAction,
      };
    })
    .sort(
      (left, right) =>
        right.churnRiskMrr - left.churnRiskMrr ||
        right.expansionMrr - left.expansionMrr ||
        right.currentMrr - left.currentMrr ||
        left.workspace.localeCompare(right.workspace, "zh-Hant"),
    );
}

export function revenueForecastCsv(rows: RevenueForecastItem[]) {
  const header = ["workspace", "plan", "forecast_stage", "status", "current_mrr", "expansion_mrr", "churn_risk_mrr", "projected_mrr", "renewal_probability", "owner", "evidence", "quarter_action", "next_action"];
  const csvRows = rows.map((row) => [
    row.workspace,
    row.plan,
    revenueForecastStageLabel(row.forecastStage),
    executionReviewLabel(row.status),
    row.currentMrr,
    row.expansionMrr,
    row.churnRiskMrr,
    row.projectedMrr,
    row.renewalProbability,
    row.owner,
    row.evidence,
    row.quarterAction,
    row.nextAction,
  ]);

  return [header, ...csvRows].map((row) => row.map(csvCell).join(",")).join("\n");
}
