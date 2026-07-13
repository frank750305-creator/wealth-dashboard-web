export type ProductReleaseStatus = "pass" | "watch" | "block";
export type ReleaseStage = "production" | "pilot" | "hold";

export type ProductReleaseGateItem = {
  product: string;
  audience: string;
  releaseStage: ReleaseStage;
  status: ProductReleaseStatus;
  owner: string;
  dependencies: string;
  evidence: string;
  blocker: string;
  decision: string;
  nextAction: string;
};

function csvCell(value: unknown) {
  const stringValue = String(value ?? "");
  if (/[",\n]/.test(stringValue)) return `"${stringValue.replaceAll('"', '""')}"`;
  return stringValue;
}

function executionReviewLabel(status: ProductReleaseStatus) {
  if (status === "pass") return "通過";
  if (status === "watch") return "觀察";
  return "暫停";
}

function combinedExecutionStatus(statuses: ProductReleaseStatus[]): ProductReleaseStatus {
  if (statuses.some((status) => status === "block")) return "block";
  if (statuses.some((status) => status === "watch")) return "watch";
  return "pass";
}

function releaseStageFromStatus(status: ProductReleaseStatus): ReleaseStage {
  if (status === "pass") return "production";
  if (status === "watch") return "pilot";
  return "hold";
}

export function releaseStageLabel(stage: ReleaseStage) {
  if (stage === "production") return "正式上線";
  if (stage === "pilot") return "試點";
  return "暫緩";
}

export function releaseStageClass(stage: ReleaseStage) {
  if (stage === "production") return "border-emerald-500/40 bg-emerald-500/10 text-emerald-300";
  if (stage === "pilot") return "border-amber-500/40 bg-amber-500/10 text-amber-300";
  return "border-rose-500/40 bg-rose-500/10 text-rose-300";
}

function releaseDecisionText(status: ProductReleaseStatus, productionText: string, pilotText: string, holdText: string) {
  if (status === "pass") return productionText;
  if (status === "watch") return pilotText;
  return holdText;
}

export function buildProductReleaseGateItems({
  dataPipelineDecision,
  dataProductCatalogDecision,
  dataLineageDecision,
  apiServiceCatalogDecision,
  apiContractBlueprintDecision,
  platformEntitlementDecision,
  clientWorkspaceProvisioningDecision,
  usageBillingDecision,
  dataLicenseComplianceDecision,
  securityAuditDecision,
  incidentCommandDecision,
  marketAlertDecision,
  hasBigQueryCredentials,
  comparisonRows,
  activeAllocationRows,
  tradeTickets,
  incidentOpenCount,
  incidentHighPriorityCount,
  riskOwner,
  decisionOwner,
  executionOwner,
}: {
  dataPipelineDecision: ProductReleaseStatus;
  dataProductCatalogDecision: ProductReleaseStatus;
  dataLineageDecision: ProductReleaseStatus;
  apiServiceCatalogDecision: ProductReleaseStatus;
  apiContractBlueprintDecision: ProductReleaseStatus;
  platformEntitlementDecision: ProductReleaseStatus;
  clientWorkspaceProvisioningDecision: ProductReleaseStatus;
  usageBillingDecision: ProductReleaseStatus;
  dataLicenseComplianceDecision: ProductReleaseStatus;
  securityAuditDecision: ProductReleaseStatus;
  incidentCommandDecision: ProductReleaseStatus;
  marketAlertDecision: ProductReleaseStatus;
  hasBigQueryCredentials: boolean;
  comparisonRows: unknown[];
  activeAllocationRows: unknown[];
  tradeTickets: unknown[];
  incidentOpenCount: number;
  incidentHighPriorityCount: number;
  riskOwner: string;
  decisionOwner: string;
  executionOwner: string;
}): ProductReleaseGateItem[] {
  const cleanRiskOwner = riskOwner.trim() || "風控";
  const cleanDecisionOwner = decisionOwner.trim() || "研究";
  const cleanExecutionOwner = executionOwner.trim() || "交易營運";
  const dataFoundationStatus: ProductReleaseStatus = hasBigQueryCredentials
    ? combinedExecutionStatus([dataPipelineDecision, dataLineageDecision])
    : "block";
  const apiFoundationStatus = combinedExecutionStatus([apiServiceCatalogDecision, apiContractBlueprintDecision]);
  const enterpriseControlStatus = combinedExecutionStatus([
    platformEntitlementDecision,
    clientWorkspaceProvisioningDecision,
    usageBillingDecision,
    dataLicenseComplianceDecision,
    securityAuditDecision,
  ]);
  const governanceStatus = combinedExecutionStatus([enterpriseControlStatus, incidentCommandDecision, marketAlertDecision]);
  const researchStatus: ProductReleaseStatus = comparisonRows.length
    ? combinedExecutionStatus([dataFoundationStatus, dataProductCatalogDecision])
    : "watch";
  const portfolioStatus: ProductReleaseStatus = activeAllocationRows.length
    ? combinedExecutionStatus([researchStatus, apiContractBlueprintDecision])
    : "watch";
  const tradingStatus: ProductReleaseStatus = tradeTickets.length
    ? combinedExecutionStatus([portfolioStatus, marketAlertDecision, incidentCommandDecision])
    : "watch";
  const externalApiStatus = combinedExecutionStatus([apiFoundationStatus, platformEntitlementDecision, dataLicenseComplianceDecision, securityAuditDecision]);
  const releaseRows: Array<Omit<ProductReleaseGateItem, "releaseStage">> = [
    {
      product: "Market Data API",
      audience: "內部研究 / API 客戶",
      status: dataFoundationStatus,
      owner: cleanRiskOwner,
      dependencies: "BigQuery、資料血緣、資料產品目錄",
      evidence: hasBigQueryCredentials ? `資料 ${executionReviewLabel(dataPipelineDecision)} / 血緣 ${executionReviewLabel(dataLineageDecision)}` : "缺少 BigQuery 環境變數",
      blocker: dataFoundationStatus === "pass" ? "無主要阻擋" : "資料倉儲、血緣或憑證未完全就緒",
      decision: releaseDecisionText(dataFoundationStatus, "可作為資料服務底座", "只開放內部試點", "不得對外開放"),
      nextAction: dataFoundationStatus === "pass" ? "建立 SLA 與版本標籤" : "先修復資料管線與血緣阻擋項",
    },
    {
      product: "Asset Profile Workbench",
      audience: "研究員 / 顧問",
      status: researchStatus,
      owner: cleanDecisionOwner,
      dependencies: "商品搜尋、商品主檔、研究宇宙",
      evidence: `${comparisonRows.length} 檔 watchlist 比較資料`,
      blocker: comparisonRows.length ? "需確認研究宇宙與資料品質" : "尚未載入可比較商品",
      decision: releaseDecisionText(researchStatus, "可給研究席位使用", "可開放示範與研究試點", "先暫緩研究工作台上線"),
      nextAction: comparisonRows.length ? "補研究模板與欄位說明" : "先載入 watchlist 比較資料",
    },
    {
      product: "Portfolio Analytics",
      audience: "投資顧問 / 投委會",
      status: portfolioStatus,
      owner: cleanDecisionOwner,
      dependencies: "配置草案、風險預算、API 合約",
      evidence: `${activeAllocationRows.length} 檔有效配置 / ${comparisonRows.length} 檔比較`,
      blocker: activeAllocationRows.length ? "需確認模型口徑與審核軌跡" : "尚未產生有效配置",
      decision: releaseDecisionText(portfolioStatus, "可進入正式分析流程", "可做顧問試點", "不得作為正式建議"),
      nextAction: activeAllocationRows.length ? "把模型版本與責任聲明接進 memo" : "先建立配置草案",
    },
    {
      product: "Trading Workflow",
      audience: "交易營運 / 投後復盤",
      status: tradingStatus,
      owner: cleanExecutionOwner,
      dependencies: "交易票、批次、成交回填、事件中心",
      evidence: `${tradeTickets.length} 張交易票 / ${incidentOpenCount} 個未結事件`,
      blocker: tradeTickets.length ? "需確認事件中心沒有高優先阻擋" : "尚未產生交易票",
      decision: releaseDecisionText(tradingStatus, "可進入交易營運交接", "只做流程演練", "暫緩交易流程上線"),
      nextAction: tradingStatus === "pass" ? "接入交易前雙人覆核" : "先關閉交易相關警示與事件",
    },
    {
      product: "Enterprise Workspace",
      audience: "企業客戶 / 家族辦公室",
      status: enterpriseControlStatus,
      owner: cleanRiskOwner,
      dependencies: "權限、工作區、帳務、授權、安全審計",
      evidence: `權限 ${executionReviewLabel(platformEntitlementDecision)} / 安全 ${executionReviewLabel(securityAuditDecision)}`,
      blocker: enterpriseControlStatus === "pass" ? "無主要阻擋" : "企業級權限、帳務、授權或安全未完全就緒",
      decision: releaseDecisionText(enterpriseControlStatus, "可進入企業上線前檢核", "可先開封閉 beta", "不得簽正式企業上線"),
      nextAction: enterpriseControlStatus === "pass" ? "準備企業 onboarding checklist" : "補齊企業控制項",
    },
    {
      product: "External API / SDK",
      audience: "企業 API 串接",
      status: externalApiStatus,
      owner: cleanRiskOwner,
      dependencies: "API 服務目錄、OpenAPI、權限矩陣、授權、安全",
      evidence: `API ${executionReviewLabel(apiFoundationStatus)} / 授權 ${executionReviewLabel(dataLicenseComplianceDecision)}`,
      blocker: externalApiStatus === "pass" ? "無主要阻擋" : "API 合約、授權或 key 管控未完全就緒",
      decision: releaseDecisionText(externalApiStatus, "可準備外部 API pilot", "僅限受控客戶試點", "不得發放外部 key"),
      nextAction: externalApiStatus === "pass" ? "產出 SDK 與 key 輪替規則" : "先凍結 API 合約與授權政策",
    },
    {
      product: "Compliance Evidence Pack",
      audience: "供應商審查 / 客戶稽核",
      status: governanceStatus,
      owner: cleanRiskOwner,
      dependencies: "授權、合規、安全、事件、警示",
      evidence: `${incidentHighPriorityCount} 個高優先事件 / ${incidentOpenCount} 個未結事件`,
      blocker: governanceStatus === "pass" ? "無主要阻擋" : "仍有治理、警示或安全事件未結",
      decision: releaseDecisionText(governanceStatus, "可作為稽核證據包", "可內部盤點", "不得對客戶承諾通過稽核"),
      nextAction: governanceStatus === "pass" ? "建立 evidence vault 欄位" : "先清理高優先事件與合規缺口",
    },
    {
      product: "Public Demo Sandbox",
      audience: "銷售展示 / 初次試用",
      status: "pass",
      owner: cleanRiskOwner,
      dependencies: "公開資料源狀態、平台導覽、非敏感摘要",
      evidence: "不開放客戶資料與交易流程",
      blocker: "不得展示未授權原始資料",
      decision: "可持續作為銷售入口",
      nextAction: "加入明確 demo 標示與資料延遲說明",
    },
    {
      product: "Revenue Ops Console",
      audience: "營收營運 / 管理員",
      status: usageBillingDecision,
      owner: cleanRiskOwner,
      dependencies: "用量帳務、工作區、合約台帳",
      evidence: `帳務 ${executionReviewLabel(usageBillingDecision)} / 工作區 ${executionReviewLabel(clientWorkspaceProvisioningDecision)}`,
      blocker: usageBillingDecision === "pass" ? "無主要阻擋" : "帳務或合約狀態尚未完整",
      decision: releaseDecisionText(usageBillingDecision, "可接帳務後台", "可先內部試算", "暫緩正式收費流程"),
      nextAction: usageBillingDecision === "pass" ? "接 Stripe/發票/合約台帳" : "補齊用量與發票規則",
    },
  ];

  return releaseRows.map((row) => ({
    ...row,
    releaseStage: releaseStageFromStatus(row.status),
  }));
}

export function productReleaseGateCsv(rows: ProductReleaseGateItem[]) {
  const header = ["product", "audience", "release_stage", "status", "owner", "dependencies", "evidence", "blocker", "decision", "next_action"];
  const csvRows = rows.map((row) => [
    row.product,
    row.audience,
    releaseStageLabel(row.releaseStage),
    executionReviewLabel(row.status),
    row.owner,
    row.dependencies,
    row.evidence,
    row.blocker,
    row.decision,
    row.nextAction,
  ]);

  return [header, ...csvRows].map((row) => row.map(csvCell).join(",")).join("\n");
}
