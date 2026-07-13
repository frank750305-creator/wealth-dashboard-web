export type CustomerSuccessStatus = "pass" | "watch" | "block";
export type CustomerHealthStage = "expand" | "healthy" | "watch" | "risk";
export type CustomerReleaseStage = "production" | "pilot" | "hold";

export type CustomerSuccessWorkspace = {
  workspace: string;
  segment: string;
  plan: string;
  seats: string;
  dataPackages: string;
  billing: string;
  status: CustomerSuccessStatus;
};

export type CustomerSuccessBilling = {
  workspace: string;
  monthlyRevenue: string;
  invoiceStatus: string;
  status: CustomerSuccessStatus;
};

export type CustomerSuccessReleaseGate = {
  releaseStage: CustomerReleaseStage;
};

export type CustomerSuccessIncident = {
  status: CustomerSuccessStatus;
  severity: "high" | "medium" | "low";
};

export type CustomerSuccessHealthItem = {
  workspace: string;
  segment: string;
  plan: string;
  healthStage: CustomerHealthStage;
  status: CustomerSuccessStatus;
  healthScore: number;
  revenueSignal: string;
  adoptionSignal: string;
  riskSignal: string;
  expansionSignal: string;
  owner: string;
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

function executionReviewLabel(status: CustomerSuccessStatus) {
  if (status === "pass") return "通過";
  if (status === "watch") return "觀察";
  return "暫停";
}

export function customerHealthStageLabel(stage: CustomerHealthStage) {
  if (stage === "expand") return "可擴充";
  if (stage === "healthy") return "健康";
  if (stage === "watch") return "觀察";
  return "續約風險";
}

export function customerHealthStageClass(stage: CustomerHealthStage) {
  if (stage === "expand") return "border-sky-500/40 bg-sky-500/10 text-sky-300";
  if (stage === "healthy") return "border-emerald-500/40 bg-emerald-500/10 text-emerald-300";
  if (stage === "watch") return "border-amber-500/40 bg-amber-500/10 text-amber-300";
  return "border-rose-500/40 bg-rose-500/10 text-rose-300";
}

function customerHealthStatus(score: number): CustomerSuccessStatus {
  if (score >= 80) return "pass";
  if (score >= 60) return "watch";
  return "block";
}

function customerHealthStage(score: number, plan: string): CustomerHealthStage {
  if (score >= 90 && !["Free", "Internal", "Internal Admin"].includes(plan)) return "expand";
  if (score >= 80) return "healthy";
  if (score >= 60) return "watch";
  return "risk";
}

function statusPenalty(status: CustomerSuccessStatus, blockPenalty: number, watchPenalty: number) {
  if (status === "block") return blockPenalty;
  if (status === "watch") return watchPenalty;
  return 0;
}

export function buildCustomerSuccessHealthItems({
  clientWorkspaceProvisioningItems,
  usageBillingItems,
  productReleaseGateItems,
  incidentCommandItems,
  usageBillingDecision,
  dataLicenseComplianceDecision,
  securityAuditDecision,
  incidentCommandDecision,
  riskOwner,
  decisionOwner,
  executionOwner,
}: {
  clientWorkspaceProvisioningItems: CustomerSuccessWorkspace[];
  usageBillingItems: CustomerSuccessBilling[];
  productReleaseGateItems: CustomerSuccessReleaseGate[];
  incidentCommandItems: CustomerSuccessIncident[];
  usageBillingDecision: CustomerSuccessStatus;
  dataLicenseComplianceDecision: CustomerSuccessStatus;
  securityAuditDecision: CustomerSuccessStatus;
  incidentCommandDecision: CustomerSuccessStatus;
  riskOwner: string;
  decisionOwner: string;
  executionOwner: string;
}): CustomerSuccessHealthItem[] {
  const cleanRiskOwner = riskOwner.trim() || "風控";
  const cleanDecisionOwner = decisionOwner.trim() || "研究";
  const cleanExecutionOwner = executionOwner.trim() || "交易營運";
  const billingByWorkspace = new Map(usageBillingItems.map((item) => [item.workspace, item]));
  const productionProducts = productReleaseGateItems.filter((item) => item.releaseStage === "production").length;
  const pilotProducts = productReleaseGateItems.filter((item) => item.releaseStage === "pilot").length;
  const holdProducts = productReleaseGateItems.filter((item) => item.releaseStage === "hold").length;
  const openIncidents = incidentCommandItems.filter((item) => item.status !== "pass").length;
  const highIncidents = incidentCommandItems.filter((item) => item.severity === "high").length;
  const controlPenalty =
    statusPenalty(dataLicenseComplianceDecision, 12, 5) +
    statusPenalty(securityAuditDecision, 14, 6) +
    statusPenalty(incidentCommandDecision, 12, 5);

  return clientWorkspaceProvisioningItems
    .map((workspace) => {
      const billing = billingByWorkspace.get(workspace.workspace);
      const incidentPenalty = Math.min(22, highIncidents * 5 + openIncidents * 2);
      const releasePenalty = Math.min(15, holdProducts * 4 + pilotProducts);
      const score = Math.round(
        clamp(
          100 -
            statusPenalty(workspace.status, 24, 10) -
            statusPenalty(billing?.status ?? usageBillingDecision, 18, 8) -
            controlPenalty -
            incidentPenalty -
            releasePenalty,
          0,
          100,
        ),
      );
      const stage = customerHealthStage(score, workspace.plan);
      const status = customerHealthStatus(score);
      const isInternal = workspace.plan.includes("Internal") || workspace.segment.includes("內部");
      const isTrading = workspace.workspace.includes("Trading");
      const owner = isTrading ? cleanExecutionOwner : isInternal ? cleanRiskOwner : cleanDecisionOwner;
      const revenueSignal = billing
        ? `${billing.monthlyRevenue} / ${billing.invoiceStatus}`
        : workspace.billing;
      const adoptionSignal = `${workspace.seats} 席 / ${workspace.dataPackages}`;
      const riskSignal =
        highIncidents > 0
          ? `${highIncidents} 個高優先事件需先關閉`
          : status !== "pass"
            ? "權限、帳務、授權或安全仍需觀察"
            : "低風險，可維持例行追蹤";
      const expansionSignal =
        stage === "expand"
          ? `${productionProducts} 個產品可正式上線，可評估加購或升級`
          : stage === "healthy"
            ? `${productionProducts} 個正式產品 / ${pilotProducts} 個試點產品`
            : stage === "watch"
              ? "先完成 onboarding 與使用深度，再談擴充"
              : "優先保留與修復，不進行擴售";
      const nextAction =
        stage === "expand"
          ? "安排 QBR，提出 API、席位或資料包擴充方案"
          : stage === "healthy"
            ? "維持月度健康檢查與使用回顧"
            : stage === "watch"
              ? "建立 14 天 onboarding / usage improvement plan"
              : "由客戶成功與風控共同處理續約風險";

      return {
        workspace: workspace.workspace,
        segment: workspace.segment,
        plan: workspace.plan,
        healthStage: stage,
        status,
        healthScore: score,
        revenueSignal,
        adoptionSignal,
        riskSignal,
        expansionSignal,
        owner,
        nextAction,
      };
    })
    .sort(
      (left, right) =>
        left.healthScore - right.healthScore ||
        left.workspace.localeCompare(right.workspace, "zh-Hant"),
    );
}

export function customerSuccessHealthCsv(rows: CustomerSuccessHealthItem[]) {
  const header = ["workspace", "segment", "plan", "health_stage", "status", "health_score", "revenue_signal", "adoption_signal", "risk_signal", "expansion_signal", "owner", "next_action"];
  const csvRows = rows.map((row) => [
    row.workspace,
    row.segment,
    row.plan,
    customerHealthStageLabel(row.healthStage),
    executionReviewLabel(row.status),
    row.healthScore,
    row.revenueSignal,
    row.adoptionSignal,
    row.riskSignal,
    row.expansionSignal,
    row.owner,
    row.nextAction,
  ]);

  return [header, ...csvRows].map((row) => row.map(csvCell).join(",")).join("\n");
}
