export type DataLicenseComplianceStatus = "pass" | "watch" | "block";

export type DataLicenseComplianceItem = {
  source: string;
  dataset: string;
  licenseScope: string;
  redistribution: string;
  clientAccess: string;
  exportPolicy: string;
  auditTrail: string;
  renewal: string;
  status: DataLicenseComplianceStatus;
  owner: string;
  evidence: string;
  action: string;
};

function csvCell(value: unknown) {
  const stringValue = String(value ?? "");
  if (/[",\n]/.test(stringValue)) return `"${stringValue.replaceAll('"', '""')}"`;
  return stringValue;
}

function executionReviewLabel(status: DataLicenseComplianceStatus) {
  if (status === "pass") return "通過";
  if (status === "watch") return "觀察";
  return "暫停";
}

function combinedExecutionStatus(statuses: DataLicenseComplianceStatus[]): DataLicenseComplianceStatus {
  if (statuses.some((status) => status === "block")) return "block";
  if (statuses.some((status) => status === "watch")) return "watch";
  return "pass";
}

export function buildDataLicenseComplianceItems({
  dataReadinessDecision,
  apiContractBlueprintDecision,
  platformEntitlementDecision,
  clientWorkspaceProvisioningDecision,
  usageBillingDecision,
  marketAlertDecision,
  hasBigQueryCredentials,
  riskOwner,
  decisionOwner,
}: {
  dataReadinessDecision: DataLicenseComplianceStatus;
  apiContractBlueprintDecision: DataLicenseComplianceStatus;
  platformEntitlementDecision: DataLicenseComplianceStatus;
  clientWorkspaceProvisioningDecision: DataLicenseComplianceStatus;
  usageBillingDecision: DataLicenseComplianceStatus;
  marketAlertDecision: DataLicenseComplianceStatus;
  hasBigQueryCredentials: boolean;
  riskOwner: string;
  decisionOwner: string;
}): DataLicenseComplianceItem[] {
  const cleanRiskOwner = riskOwner.trim() || "風控";
  const cleanDecisionOwner = decisionOwner.trim() || "研究";
  const warehouseStatus: DataLicenseComplianceStatus = hasBigQueryCredentials ? dataReadinessDecision : "block";
  const productStatus = combinedExecutionStatus([apiContractBlueprintDecision, platformEntitlementDecision]);
  const commercialStatus = combinedExecutionStatus([clientWorkspaceProvisioningDecision, usageBillingDecision]);
  const governanceStatus = combinedExecutionStatus([productStatus, commercialStatus, marketAlertDecision]);

  return [
    {
      source: "BigQuery 倉儲",
      dataset: "daily_prices / daily_fx",
      licenseScope: "平台內部分析與授權客戶使用",
      redistribution: "不得原樣再散布；僅可透過授權 API 與報表輸出",
      clientAccess: "Pro 以上依方案開放",
      exportPolicy: "研究 memo 與 CSV 需保留來源與時間戳",
      auditTrail: "BigQuery 診斷、資料合約、用量帳務",
      renewal: "依資料供應合約週期檢查",
      status: warehouseStatus,
      owner: cleanRiskOwner,
      evidence: hasBigQueryCredentials ? "BigQuery 憑證與資料診斷可用" : "缺少 BigQuery 憑證",
      action: warehouseStatus === "pass" ? "可納入授權資料產品" : "先完成資料讀取與授權邊界確認",
    },
    {
      source: "市場價格來源",
      dataset: "價格、幣別、交易所與商品主檔",
      licenseScope: "依來源條款限制用途",
      redistribution: "未確認供應商條款前，不開放外部原始資料下載",
      clientAccess: "研究畫面可看衍生指標，原始資料需授權",
      exportPolicy: "外部客戶匯出需遮蔽或轉為分析摘要",
      auditTrail: "資料產品目錄、API 合約、權限矩陣",
      renewal: "建立供應商合約台帳",
      status: productStatus === "pass" ? "watch" : productStatus,
      owner: cleanRiskOwner,
      evidence: `API/權限治理：${executionReviewLabel(productStatus)}`,
      action: productStatus === "pass" ? "補供應商合約欄位後可進入正式授權控管" : "先凍結 API 合約與權限矩陣",
    },
    {
      source: "衍生分析引擎",
      dataset: "報酬、波動、回撤、分數、配置、交易票",
      licenseScope: "平台自產衍生資料",
      redistribution: "可依方案提供，但不得暗示為投資保證",
      clientAccess: "Pro Plus / Enterprise",
      exportPolicy: "memo、投組報告與交易前檢核需保留模型口徑",
      auditTrail: "研究摘要、決策稽核、OpenAPI 藍圖",
      renewal: "隨模型版本更新",
      status: apiContractBlueprintDecision,
      owner: cleanDecisionOwner,
      evidence: `API 合約狀態：${executionReviewLabel(apiContractBlueprintDecision)}`,
      action: apiContractBlueprintDecision === "pass" ? "可建立模型版本與責任聲明" : "先凍結 request/response 與模型輸出欄位",
    },
    {
      source: "客戶匯出與下載",
      dataset: "CSV、Markdown memo、OpenAPI JSON、帳務報表",
      licenseScope: "依角色、方案與合約限制匯出",
      redistribution: "企業客戶可內部使用；外部再散布需另簽授權",
      clientAccess: "依權限矩陣控管",
      exportPolicy: "所有匯出需帶 workspace、時間戳與資料口徑",
      auditTrail: "權限矩陣、工作區、用量與帳務",
      renewal: "每次方案調整檢查",
      status: commercialStatus,
      owner: cleanRiskOwner,
      evidence: `商業化狀態：${executionReviewLabel(commercialStatus)}`,
      action: commercialStatus === "pass" ? "可接匯出稽核與下載限制" : "先完成工作區與帳務狀態",
    },
    {
      source: "API Key 與外部串接",
      dataset: "Market API / Portfolio API / Trading API",
      licenseScope: "依 API key、IP allowlist、SSO 與方案控管",
      redistribution: "不得將 key 轉交第三方；需可停權與輪替",
      clientAccess: "Enterprise / Internal",
      exportPolicy: "API response 不應提供超出授權範圍的原始資料",
      auditTrail: "API 服務目錄、OpenAPI、權限矩陣",
      renewal: "API key 每季檢查",
      status: platformEntitlementDecision,
      owner: cleanRiskOwner,
      evidence: `權限矩陣狀態：${executionReviewLabel(platformEntitlementDecision)}`,
      action: platformEntitlementDecision === "pass" ? "可設計 API key 輪替與停權流程" : "先完成角色與方案邊界",
    },
    {
      source: "企業合約與帳務",
      dataset: "MRR、年度合約、發票、用量額度",
      licenseScope: "依合約定義資料包、席位與使用額度",
      redistribution: "合約需明確約定內部使用與外部再散布",
      clientAccess: "Enterprise / Add-on",
      exportPolicy: "帳務報表不可包含敏感客戶明細給非授權角色",
      auditTrail: "用量與帳務中心、工作區開通中心",
      renewal: "合約到期前 90 天檢查",
      status: usageBillingDecision,
      owner: cleanRiskOwner,
      evidence: `帳務狀態：${executionReviewLabel(usageBillingDecision)}`,
      action: usageBillingDecision === "pass" ? "可接合約台帳與續約提醒" : "先完成帳務模式與發票狀態",
    },
    {
      source: "風控與合規監控",
      dataset: "警示、KRI、SLA、例外、阻斷事件",
      licenseScope: "平台內控與客戶合約履約證據",
      redistribution: "僅限合規角色與管理員檢視",
      clientAccess: "Risk / Admin",
      exportPolicy: "例外報告需遮蔽敏感資料",
      auditTrail: "市場警示中心、SLA、營運 KRI",
      renewal: "月度內控檢查",
      status: marketAlertDecision,
      owner: cleanRiskOwner,
      evidence: `警示狀態：${executionReviewLabel(marketAlertDecision)}`,
      action: marketAlertDecision === "pass" ? "可作為合規監控基準" : "先關閉阻斷警示",
    },
    {
      source: "授權治理總控",
      dataset: "資料產品、API、客戶工作區、帳務、匯出",
      licenseScope: "跨資料、API、商業方案的總控邊界",
      redistribution: "未通過總控不得對外開放新資料產品",
      clientAccess: "Admin / Compliance",
      exportPolicy: "所有資料產品上線前需通過授權檢核",
      auditTrail: "資料血緣、產品目錄、OpenAPI、權限、帳務",
      renewal: "每季授權盤點",
      status: governanceStatus,
      owner: cleanRiskOwner,
      evidence: `總控狀態：${executionReviewLabel(governanceStatus)}`,
      action: governanceStatus === "pass" ? "可進入正式合規工作流設計" : "先補齊資料、API、商業化治理缺口",
    },
  ];
}

export function dataLicenseComplianceCsv(rows: DataLicenseComplianceItem[]) {
  const header = ["source", "dataset", "license_scope", "redistribution", "client_access", "export_policy", "audit_trail", "renewal", "status", "owner", "evidence", "action"];
  const csvRows = rows.map((row) => [
    row.source,
    row.dataset,
    row.licenseScope,
    row.redistribution,
    row.clientAccess,
    row.exportPolicy,
    row.auditTrail,
    row.renewal,
    executionReviewLabel(row.status),
    row.owner,
    row.evidence,
    row.action,
  ]);

  return [header, ...csvRows].map((row) => row.map(csvCell).join(",")).join("\n");
}
