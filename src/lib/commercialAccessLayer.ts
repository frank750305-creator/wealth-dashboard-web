export type CommercialAccessStatus = "pass" | "watch" | "block";

export type PlatformEntitlementItem = {
  role: string;
  plan: string;
  dataScope: string;
  apiAccess: string;
  tools: string;
  exportRights: string;
  approvalLimit: string;
  status: CommercialAccessStatus;
  owner: string;
  evidence: string;
  action: string;
};

export type ClientWorkspaceProvisioningItem = {
  workspace: string;
  segment: string;
  plan: string;
  seats: string;
  dataPackages: string;
  apiKeys: string;
  sso: string;
  billing: string;
  status: CommercialAccessStatus;
  owner: string;
  evidence: string;
  action: string;
};

export type UsageBillingItem = {
  workspace: string;
  plan: string;
  billingModel: string;
  seatUsage: string;
  apiUsage: string;
  exportUsage: string;
  monthlyRevenue: string;
  invoiceStatus: string;
  status: CommercialAccessStatus;
  owner: string;
  evidence: string;
  action: string;
};

function csvCell(value: unknown) {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function executionReviewLabel(status: CommercialAccessStatus) {
  if (status === "pass") return "通過";
  if (status === "watch") return "觀察";
  return "暫停";
}

function combinedExecutionStatus(statuses: CommercialAccessStatus[]): CommercialAccessStatus {
  if (statuses.some((status) => status === "block")) return "block";
  if (statuses.some((status) => status === "watch")) return "watch";
  return "pass";
}

export function buildPlatformEntitlementItems({
  dataReadinessDecision,
  apiServiceCatalogDecision,
  apiContractBlueprintDecision,
  marketAlertDecision,
  hasBigQueryCredentials,
  comparisonRows,
  activeAllocationRows,
  tradeTickets,
  riskOwner,
  decisionOwner,
}: {
  dataReadinessDecision: CommercialAccessStatus;
  apiServiceCatalogDecision: CommercialAccessStatus;
  apiContractBlueprintDecision: CommercialAccessStatus;
  marketAlertDecision: CommercialAccessStatus;
  hasBigQueryCredentials: boolean;
  comparisonRows: unknown[];
  activeAllocationRows: unknown[];
  tradeTickets: unknown[];
  riskOwner: string;
  decisionOwner: string;
}): PlatformEntitlementItem[] {
  const cleanRiskOwner = riskOwner.trim() || "風控";
  const cleanDecisionOwner = decisionOwner.trim() || "研究";
  const marketDataStatus: CommercialAccessStatus = hasBigQueryCredentials ? dataReadinessDecision : "block";
  const portfolioStatus: CommercialAccessStatus =
    comparisonRows.length && activeAllocationRows.length ? combinedExecutionStatus([dataReadinessDecision, apiContractBlueprintDecision]) : "watch";
  const governanceStatus = combinedExecutionStatus([apiServiceCatalogDecision, apiContractBlueprintDecision, marketAlertDecision]);

  return [
    {
      role: "訪客 / Demo",
      plan: "Free",
      dataScope: "公開資料源狀態與平台能力摘要",
      apiAccess: "/api/v1/market/sources",
      tools: "資料源狀態、平台導覽",
      exportRights: "不可匯出",
      approvalLimit: "無交易與投組權限",
      status: "pass",
      owner: cleanRiskOwner,
      evidence: "公開資訊不讀取 BigQuery 明細",
      action: "可作為 landing demo 與銷售入口",
    },
    {
      role: "註冊研究員",
      plan: "Pro",
      dataScope: "商品搜尋、商品主檔、價格與風險指標",
      apiAccess: "/api/v1/market/bigquery/assets, /api/v1/market/bigquery/assets/:symbol",
      tools: "商品搜尋、Watchlist、研究摘要",
      exportRights: "Markdown memo / 研究 CSV",
      approvalLimit: "不可送出交易票",
      status: marketDataStatus,
      owner: cleanDecisionOwner,
      evidence: hasBigQueryCredentials ? "BigQuery 憑證已設定" : "缺少 BigQuery 憑證",
      action: marketDataStatus === "pass" ? "可開放研究工作台" : "先補齊 BigQuery 金鑰與資料讀取",
    },
    {
      role: "投資顧問",
      plan: "Pro Plus",
      dataScope: "投組分析、模型配置、風險預算",
      apiAccess: "/api/v1/portfolio/analyze-bigquery, /api/v1/portfolio/optimize-bigquery",
      tools: "投組分析、最佳化、再平衡草案",
      exportRights: "投組 memo / 交易前檢核",
      approvalLimit: "可產生建議，不可直接執行",
      status: portfolioStatus,
      owner: cleanDecisionOwner,
      evidence: `${comparisonRows.length} 檔比較 / ${activeAllocationRows.length} 檔配置`,
      action: portfolioStatus === "pass" ? "可接入顧問工作流" : "先建立有效 watchlist 與配置草案",
    },
    {
      role: "交易營運",
      plan: "Enterprise",
      dataScope: "交易票、批次、執行交接",
      apiAccess: "/api/v1/trading/tickets",
      tools: "交易票、批次、執行回填",
      exportRights: "交易 CSV / 執行報告",
      approvalLimit: "需投委會或主管核准",
      status: tradeTickets.length ? portfolioStatus : "watch",
      owner: cleanDecisionOwner,
      evidence: `${tradeTickets.length} 張交易票`,
      action: tradeTickets.length ? "可接執行交接" : "先產生交易票與最小交易金額規則",
    },
    {
      role: "資料工程",
      plan: "Internal",
      dataScope: "資料表診斷、資料合約、API 合約",
      apiAccess: "/api/v1/market/bigquery/diagnostics, /api/v1/platform/data-products",
      tools: "資料管線、合約中心、OpenAPI 藍圖",
      exportRights: "OpenAPI JSON / 資料品質 CSV",
      approvalLimit: "可修復資料，不可覆核投資決策",
      status: apiContractBlueprintDecision,
      owner: cleanRiskOwner,
      evidence: `API 合約狀態：${executionReviewLabel(apiContractBlueprintDecision)}`,
      action: apiContractBlueprintDecision === "pass" ? "可進入 API 文件化" : "先凍結 request/response 與版本策略",
    },
    {
      role: "風控 / 合規",
      plan: "Enterprise",
      dataScope: "警示、SLA、KRI、審核軌跡",
      apiAccess: "/api/v1/platform/data-products, /api/v1/trading/tickets",
      tools: "市場警示、SLA 升級、投委會審核",
      exportRights: "審核 memo / 例外報告",
      approvalLimit: "可阻擋交易與資料產品發布",
      status: marketAlertDecision,
      owner: cleanRiskOwner,
      evidence: `警示狀態：${executionReviewLabel(marketAlertDecision)}`,
      action: marketAlertDecision === "pass" ? "可維持日常監控" : "先處理阻斷警示與高優先例外",
    },
    {
      role: "平台管理員",
      plan: "Internal Admin",
      dataScope: "全部 API、環境變數、角色與方案設定",
      apiAccess: "all internal endpoints",
      tools: "權限、資料產品、API 合約、營運監控",
      exportRights: "全部內部匯出",
      approvalLimit: "可調整權限，不直接覆核投資建議",
      status: governanceStatus,
      owner: cleanRiskOwner,
      evidence: `治理狀態：${executionReviewLabel(governanceStatus)}`,
      action: governanceStatus === "pass" ? "可進入正式權限系統設計" : "先收斂 API、警示與資料治理缺口",
    },
  ];
}

export function platformEntitlementCsv(rows: PlatformEntitlementItem[]) {
  const header = ["role", "plan", "data_scope", "api_access", "tools", "export_rights", "approval_limit", "status", "owner", "evidence", "action"];
  const csvRows = rows.map((row) => [
    row.role,
    row.plan,
    row.dataScope,
    row.apiAccess,
    row.tools,
    row.exportRights,
    row.approvalLimit,
    executionReviewLabel(row.status),
    row.owner,
    row.evidence,
    row.action,
  ]);

  return [header, ...csvRows].map((row) => row.map(csvCell).join(",")).join("\n");
}

export function buildClientWorkspaceProvisioningItems({
  dataReadinessDecision,
  apiContractBlueprintDecision,
  platformEntitlementDecision,
  marketAlertDecision,
  hasBigQueryCredentials,
  comparisonRows,
  activeAllocationRows,
  tradeTickets,
  riskOwner,
  decisionOwner,
}: {
  dataReadinessDecision: CommercialAccessStatus;
  apiContractBlueprintDecision: CommercialAccessStatus;
  platformEntitlementDecision: CommercialAccessStatus;
  marketAlertDecision: CommercialAccessStatus;
  hasBigQueryCredentials: boolean;
  comparisonRows: unknown[];
  activeAllocationRows: unknown[];
  tradeTickets: unknown[];
  riskOwner: string;
  decisionOwner: string;
}): ClientWorkspaceProvisioningItem[] {
  const cleanRiskOwner = riskOwner.trim() || "風控";
  const cleanDecisionOwner = decisionOwner.trim() || "研究";
  const marketDataStatus: CommercialAccessStatus = hasBigQueryCredentials ? dataReadinessDecision : "block";
  const advisoryStatus: CommercialAccessStatus =
    comparisonRows.length && activeAllocationRows.length ? combinedExecutionStatus([marketDataStatus, apiContractBlueprintDecision]) : "watch";
  const enterpriseStatus = combinedExecutionStatus([platformEntitlementDecision, apiContractBlueprintDecision, marketAlertDecision]);

  return [
    {
      workspace: "Demo Sandbox",
      segment: "公開試用",
      plan: "Free",
      seats: "公開瀏覽",
      dataPackages: "資料源狀態、平台能力摘要",
      apiKeys: "不開放",
      sso: "不需要",
      billing: "無",
      status: "pass",
      owner: cleanRiskOwner,
      evidence: "不讀取客戶資料與 BigQuery 明細",
      action: "可作為銷售入口與產品展示",
    },
    {
      workspace: "Research Desk",
      segment: "個人研究員",
      plan: "Pro",
      seats: "1-5",
      dataPackages: "daily_prices / daily_fx / 商品主檔",
      apiKeys: hasBigQueryCredentials ? "可核發唯讀 key" : "等待資料憑證",
      sso: "Email login",
      billing: "月付 / 年付",
      status: marketDataStatus,
      owner: cleanDecisionOwner,
      evidence: hasBigQueryCredentials ? "BigQuery 已可讀取" : "缺少 BigQuery 憑證",
      action: marketDataStatus === "pass" ? "可開通研究工作區" : "先補齊 BigQuery 環境變數",
    },
    {
      workspace: "Advisory Team",
      segment: "投資顧問團隊",
      plan: "Pro Plus",
      seats: "5-20",
      dataPackages: "研究宇宙、投組分析、再平衡草案",
      apiKeys: "團隊唯讀 key + memo export",
      sso: "Email / Google Workspace",
      billing: "團隊訂閱",
      status: advisoryStatus,
      owner: cleanDecisionOwner,
      evidence: `${comparisonRows.length} 檔比較 / ${activeAllocationRows.length} 檔配置`,
      action: advisoryStatus === "pass" ? "可開通顧問工作區" : "先建立有效 watchlist 與配置草案",
    },
    {
      workspace: "Investment Office",
      segment: "家族辦公室 / 投資委員會",
      plan: "Enterprise",
      seats: "20+",
      dataPackages: "投組分析、交易票、審核軌跡、SLA",
      apiKeys: "分權 key + IP allowlist",
      sso: "SAML / OIDC",
      billing: "年度合約",
      status: enterpriseStatus,
      owner: cleanRiskOwner,
      evidence: `治理狀態：${executionReviewLabel(enterpriseStatus)}`,
      action: enterpriseStatus === "pass" ? "可進入企業上線前檢核" : "先完成 API 合約、權限與警示治理",
    },
    {
      workspace: "Data Engineering Lab",
      segment: "內部資料工程",
      plan: "Internal",
      seats: "資料團隊",
      dataPackages: "資料管線、資料合約、OpenAPI 藍圖",
      apiKeys: "service key",
      sso: "內部帳號",
      billing: "內部成本中心",
      status: apiContractBlueprintDecision,
      owner: cleanRiskOwner,
      evidence: `API 合約狀態：${executionReviewLabel(apiContractBlueprintDecision)}`,
      action: apiContractBlueprintDecision === "pass" ? "可進入 API 文件與 SDK 規劃" : "先凍結 request/response",
    },
    {
      workspace: "Risk Control Room",
      segment: "風控 / 合規",
      plan: "Enterprise",
      seats: "審核席位",
      dataPackages: "警示、KRI、SLA、例外報告",
      apiKeys: "監控唯讀 key",
      sso: "SAML / OIDC",
      billing: "包含於企業合約",
      status: marketAlertDecision,
      owner: cleanRiskOwner,
      evidence: `警示狀態：${executionReviewLabel(marketAlertDecision)}`,
      action: marketAlertDecision === "pass" ? "可開放風控檢視" : "先處理阻斷警示",
    },
    {
      workspace: "Platform Admin",
      segment: "內部平台管理",
      plan: "Internal Admin",
      seats: "管理員",
      dataPackages: "全部資料產品、權限、API 合約",
      apiKeys: "admin service key",
      sso: "內部 SSO",
      billing: "不對外計費",
      status: platformEntitlementDecision,
      owner: cleanRiskOwner,
      evidence: `權限矩陣狀態：${executionReviewLabel(platformEntitlementDecision)}`,
      action: platformEntitlementDecision === "pass" ? "可進入正式租戶管理設計" : "先收斂角色與方案控管",
    },
    {
      workspace: "Trading Operations",
      segment: "交易營運",
      plan: "Enterprise Add-on",
      seats: "交易席位",
      dataPackages: "交易票、批次、執行交接",
      apiKeys: "交易流程 key",
      sso: "SAML / OIDC",
      billing: "企業加購",
      status: tradeTickets.length ? advisoryStatus : "watch",
      owner: cleanDecisionOwner,
      evidence: `${tradeTickets.length} 張交易票`,
      action: tradeTickets.length ? "可接交易執行流程" : "先建立交易票與批次規則",
    },
  ];
}

export function clientWorkspaceProvisioningCsv(rows: ClientWorkspaceProvisioningItem[]) {
  const header = ["workspace", "segment", "plan", "seats", "data_packages", "api_keys", "sso", "billing", "status", "owner", "evidence", "action"];
  const csvRows = rows.map((row) => [
    row.workspace,
    row.segment,
    row.plan,
    row.seats,
    row.dataPackages,
    row.apiKeys,
    row.sso,
    row.billing,
    executionReviewLabel(row.status),
    row.owner,
    row.evidence,
    row.action,
  ]);

  return [header, ...csvRows].map((row) => row.map(csvCell).join(",")).join("\n");
}

export function buildUsageBillingItems({
  clientWorkspaceProvisioningItems,
  apiContractBlueprintDecision,
  platformEntitlementDecision,
  riskOwner,
  decisionOwner,
}: {
  clientWorkspaceProvisioningItems: ClientWorkspaceProvisioningItem[];
  apiContractBlueprintDecision: CommercialAccessStatus;
  platformEntitlementDecision: CommercialAccessStatus;
  riskOwner: string;
  decisionOwner: string;
}): UsageBillingItem[] {
  const cleanRiskOwner = riskOwner.trim() || "風控";
  const cleanDecisionOwner = decisionOwner.trim() || "研究";
  const workspaceStatus = (workspace: string): CommercialAccessStatus =>
    clientWorkspaceProvisioningItems.find((item) => item.workspace === workspace)?.status ?? "watch";
  const governanceStatus = combinedExecutionStatus([apiContractBlueprintDecision, platformEntitlementDecision]);

  return [
    {
      workspace: "Demo Sandbox",
      plan: "Free",
      billingModel: "免費試用",
      seatUsage: "公開瀏覽",
      apiUsage: "0 / 不開放",
      exportUsage: "0 / 不開放",
      monthlyRevenue: "NT$0",
      invoiceStatus: "不開票",
      status: "pass",
      owner: cleanRiskOwner,
      evidence: "不使用付費資料與 API key",
      action: "保留為銷售入口，不納入 MRR",
    },
    {
      workspace: "Research Desk",
      plan: "Pro",
      billingModel: "月付 / 年付",
      seatUsage: "1-5 / 5",
      apiUsage: "2,000 / 10,000 calls",
      exportUsage: "20 / 100 exports",
      monthlyRevenue: "NT$9,900 / 月",
      invoiceStatus: workspaceStatus("Research Desk") === "pass" ? "可收款" : "等待資料開通",
      status: workspaceStatus("Research Desk"),
      owner: cleanDecisionOwner,
      evidence: "研究員方案需 BigQuery 商品資料可讀",
      action: workspaceStatus("Research Desk") === "pass" ? "可接金流與訂閱管理" : "先完成研究工作區開通",
    },
    {
      workspace: "Advisory Team",
      plan: "Pro Plus",
      billingModel: "團隊訂閱",
      seatUsage: "8 / 20",
      apiUsage: "18,000 / 50,000 calls",
      exportUsage: "80 / 500 exports",
      monthlyRevenue: "NT$39,900 / 月",
      invoiceStatus: workspaceStatus("Advisory Team") === "pass" ? "可收款" : "待配置與顧問流程",
      status: workspaceStatus("Advisory Team"),
      owner: cleanDecisionOwner,
      evidence: "顧問方案依賴 watchlist、配置與 memo 輸出",
      action: workspaceStatus("Advisory Team") === "pass" ? "可進入團隊帳務與席位管理" : "先完成顧問工作區檢核",
    },
    {
      workspace: "Investment Office",
      plan: "Enterprise",
      billingModel: "年度合約",
      seatUsage: "25+ / 合約",
      apiUsage: "合約額度",
      exportUsage: "合約額度",
      monthlyRevenue: "年度合約",
      invoiceStatus: workspaceStatus("Investment Office") === "pass" ? "可送合約" : "待企業治理檢核",
      status: workspaceStatus("Investment Office"),
      owner: cleanRiskOwner,
      evidence: "企業方案需 SSO、權限、API 合約與警示治理",
      action: workspaceStatus("Investment Office") === "pass" ? "可準備企業報價與合約" : "先完成企業上線前檢核",
    },
    {
      workspace: "Data Engineering Lab",
      plan: "Internal",
      billingModel: "內部成本中心",
      seatUsage: "資料團隊",
      apiUsage: "工程測試額度",
      exportUsage: "內部匯出",
      monthlyRevenue: "內部成本",
      invoiceStatus: "不對外開票",
      status: apiContractBlueprintDecision,
      owner: cleanRiskOwner,
      evidence: `API 合約狀態：${executionReviewLabel(apiContractBlueprintDecision)}`,
      action: apiContractBlueprintDecision === "pass" ? "可估算資料工程成本" : "先凍結 API 合約",
    },
    {
      workspace: "Risk Control Room",
      plan: "Enterprise",
      billingModel: "企業合約內含",
      seatUsage: "審核席位",
      apiUsage: "監控唯讀",
      exportUsage: "例外報告",
      monthlyRevenue: "包含於企業合約",
      invoiceStatus: workspaceStatus("Risk Control Room") === "pass" ? "可納入企業包" : "待警示治理",
      status: workspaceStatus("Risk Control Room"),
      owner: cleanRiskOwner,
      evidence: "風控功能依賴警示、KRI、SLA 與例外報告",
      action: workspaceStatus("Risk Control Room") === "pass" ? "可納入企業報價" : "先關閉阻斷警示",
    },
    {
      workspace: "Platform Admin",
      plan: "Internal Admin",
      billingModel: "內部管理",
      seatUsage: "管理員",
      apiUsage: "admin service key",
      exportUsage: "全部內部匯出",
      monthlyRevenue: "不對外計費",
      invoiceStatus: "不對外開票",
      status: platformEntitlementDecision,
      owner: cleanRiskOwner,
      evidence: `權限矩陣狀態：${executionReviewLabel(platformEntitlementDecision)}`,
      action: platformEntitlementDecision === "pass" ? "可進入租戶與帳務後台設計" : "先收斂權限矩陣",
    },
    {
      workspace: "Trading Operations",
      plan: "Enterprise Add-on",
      billingModel: "企業加購",
      seatUsage: "交易席位",
      apiUsage: "交易流程額度",
      exportUsage: "交易 CSV / 執行報告",
      monthlyRevenue: "NT$19,900 / 月起",
      invoiceStatus: workspaceStatus("Trading Operations") === "pass" ? "可加購" : "待交易票流程",
      status: workspaceStatus("Trading Operations"),
      owner: cleanDecisionOwner,
      evidence: "交易營運加購需交易票與執行交接流程",
      action: workspaceStatus("Trading Operations") === "pass" ? "可進入企業加購報價" : "先建立交易票與批次規則",
    },
    {
      workspace: "Billing Governance",
      plan: "Revenue Ops",
      billingModel: "帳務治理",
      seatUsage: "平台管理",
      apiUsage: "用量彙總",
      exportUsage: "帳務報表",
      monthlyRevenue: "MRR / 合約彙總",
      invoiceStatus: governanceStatus === "pass" ? "可建立正式帳務流程" : "待權限與 API 治理",
      status: governanceStatus,
      owner: cleanRiskOwner,
      evidence: `治理狀態：${executionReviewLabel(governanceStatus)}`,
      action: governanceStatus === "pass" ? "可接 Stripe/發票/合約台帳" : "先完成權限與 API 合約治理",
    },
  ];
}

export function usageBillingCsv(rows: UsageBillingItem[]) {
  const header = ["workspace", "plan", "billing_model", "seat_usage", "api_usage", "export_usage", "monthly_revenue", "invoice_status", "status", "owner", "evidence", "action"];
  const csvRows = rows.map((row) => [
    row.workspace,
    row.plan,
    row.billingModel,
    row.seatUsage,
    row.apiUsage,
    row.exportUsage,
    row.monthlyRevenue,
    row.invoiceStatus,
    executionReviewLabel(row.status),
    row.owner,
    row.evidence,
    row.action,
  ]);

  return [header, ...csvRows].map((row) => row.map(csvCell).join(",")).join("\n");
}
