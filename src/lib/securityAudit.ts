export type SecurityAuditStatus = "pass" | "watch" | "block";

export type SecurityAuditItem = {
  control: string;
  scope: string;
  owner: string;
  status: SecurityAuditStatus;
  evidence: string;
  risk: string;
  frequency: string;
  action: string;
};

function csvCell(value: unknown) {
  const stringValue = String(value ?? "");
  if (/[",\n]/.test(stringValue)) return `"${stringValue.replaceAll('"', '""')}"`;
  return stringValue;
}

function executionReviewLabel(status: SecurityAuditStatus) {
  if (status === "pass") return "通過";
  if (status === "watch") return "觀察";
  return "暫停";
}

function combinedExecutionStatus(statuses: SecurityAuditStatus[]): SecurityAuditStatus {
  if (statuses.some((status) => status === "block")) return "block";
  if (statuses.some((status) => status === "watch")) return "watch";
  return "pass";
}

export function buildSecurityAuditItems({
  apiContractBlueprintDecision,
  platformEntitlementDecision,
  clientWorkspaceProvisioningDecision,
  usageBillingDecision,
  dataLicenseComplianceDecision,
  marketAlertDecision,
  hasBigQueryCredentials,
  riskOwner,
  decisionOwner,
}: {
  apiContractBlueprintDecision: SecurityAuditStatus;
  platformEntitlementDecision: SecurityAuditStatus;
  clientWorkspaceProvisioningDecision: SecurityAuditStatus;
  usageBillingDecision: SecurityAuditStatus;
  dataLicenseComplianceDecision: SecurityAuditStatus;
  marketAlertDecision: SecurityAuditStatus;
  hasBigQueryCredentials: boolean;
  riskOwner: string;
  decisionOwner: string;
}): SecurityAuditItem[] {
  const cleanRiskOwner = riskOwner.trim() || "風控";
  const cleanDecisionOwner = decisionOwner.trim() || "研究";
  const apiSecurityStatus = combinedExecutionStatus([apiContractBlueprintDecision, platformEntitlementDecision]);
  const tenantSecurityStatus = combinedExecutionStatus([platformEntitlementDecision, clientWorkspaceProvisioningDecision]);
  const complianceSecurityStatus = combinedExecutionStatus([dataLicenseComplianceDecision, marketAlertDecision]);

  return [
    {
      control: "SSO / MFA / 帳號開通",
      scope: "Enterprise、Internal Admin、Risk Control Room",
      owner: cleanRiskOwner,
      status: tenantSecurityStatus,
      evidence: `工作區與權限狀態：${executionReviewLabel(tenantSecurityStatus)}`,
      risk: "未完成 SSO/MFA 前，不應開放企業客戶正式使用",
      frequency: "每次企業上線前",
      action: tenantSecurityStatus === "pass" ? "可進入 SSO/OIDC 具體接入設計" : "先完成角色、方案與工作區開通邊界",
    },
    {
      control: "API key 輪替與停權",
      scope: "Market API / Portfolio API / Trading API",
      owner: cleanRiskOwner,
      status: apiSecurityStatus,
      evidence: `API 合約與權限矩陣：${executionReviewLabel(apiSecurityStatus)}`,
      risk: "key 未輪替或未分權會放大資料外洩與未授權使用風險",
      frequency: "每季檢查",
      action: apiSecurityStatus === "pass" ? "可建立 key 發放、輪替、停權與 IP allowlist 流程" : "先凍結 API 合約與角色權限",
    },
    {
      control: "IP allowlist / 客戶網域限制",
      scope: "Enterprise API 與交易流程",
      owner: cleanRiskOwner,
      status: clientWorkspaceProvisioningDecision,
      evidence: `工作區開通狀態：${executionReviewLabel(clientWorkspaceProvisioningDecision)}`,
      risk: "企業 key 若無來源限制，難以控管外部轉用",
      frequency: "企業合約簽署前",
      action: clientWorkspaceProvisioningDecision === "pass" ? "可把 IP allowlist 放進企業開通清單" : "先完成企業工作區上線檢核",
    },
    {
      control: "匯出稽核與下載留痕",
      scope: "CSV、Markdown memo、OpenAPI JSON、帳務報表",
      owner: cleanRiskOwner,
      status: dataLicenseComplianceDecision,
      evidence: `授權合規狀態：${executionReviewLabel(dataLicenseComplianceDecision)}`,
      risk: "未留痕的匯出會造成資料授權與再散布責任不清",
      frequency: "每次匯出",
      action: dataLicenseComplianceDecision === "pass" ? "可設計 export log 與 watermark 欄位" : "先完成授權與匯出政策",
    },
    {
      control: "管理員操作審計",
      scope: "角色、方案、工作區、API key、資料產品",
      owner: cleanRiskOwner,
      status: platformEntitlementDecision,
      evidence: `權限矩陣狀態：${executionReviewLabel(platformEntitlementDecision)}`,
      risk: "管理員可改權限但無審計，會造成責任歸屬不清",
      frequency: "所有管理員操作",
      action: platformEntitlementDecision === "pass" ? "可建立 admin audit log 與雙人覆核規則" : "先收斂管理員權限邊界",
    },
    {
      control: "帳務與合約資料權限",
      scope: "MRR、發票、年度合約、客戶用量",
      owner: cleanRiskOwner,
      status: usageBillingDecision,
      evidence: `帳務狀態：${executionReviewLabel(usageBillingDecision)}`,
      risk: "帳務資料若被非授權角色讀取，會暴露客戶與商業敏感資訊",
      frequency: "每月結帳前",
      action: usageBillingDecision === "pass" ? "可建立 Revenue Ops 權限與報表遮蔽規則" : "先完成帳務模式與發票狀態",
    },
    {
      control: "BigQuery service account 金鑰控管",
      scope: "Vercel env、BigQuery dataset、資料管線",
      owner: cleanRiskOwner,
      status: hasBigQueryCredentials ? "pass" : "block",
      evidence: hasBigQueryCredentials ? "Vercel BigQuery 環境變數已設定" : "缺少 BigQuery 環境變數",
      risk: "資料倉儲金鑰缺失或外洩會直接影響資料服務",
      frequency: "每次部署與每季輪替",
      action: hasBigQueryCredentials ? "可規劃 service account 最小權限與輪替" : "先補齊 GCP_SERVICE_ACCOUNT_JSON",
    },
    {
      control: "事件回應與停權流程",
      scope: "資料外洩、API 濫用、超額匯出、異常交易",
      owner: cleanRiskOwner,
      status: marketAlertDecision,
      evidence: `市場警示與營運監控：${executionReviewLabel(marketAlertDecision)}`,
      risk: "沒有停權與事件分級時，異常用量會延伸成合約或法遵問題",
      frequency: "即時事件",
      action: marketAlertDecision === "pass" ? "可建立 L1/L2/L3 事件回應 playbook" : "先關閉阻斷警示與高優先事件",
    },
    {
      control: "投資建議責任聲明",
      scope: "研究 memo、投組分析、最佳化、交易票",
      owner: cleanDecisionOwner,
      status: apiContractBlueprintDecision,
      evidence: `分析 API 合約：${executionReviewLabel(apiContractBlueprintDecision)}`,
      risk: "未標示模型口徑與責任邊界，容易被誤用為保證性建議",
      frequency: "每個對外報告版本",
      action: apiContractBlueprintDecision === "pass" ? "可把模型口徑與免責聲明接進 memo" : "先凍結分析輸出欄位與版本",
    },
    {
      control: "合規證據庫",
      scope: "資料血緣、授權、匯出、帳務、審核軌跡",
      owner: cleanRiskOwner,
      status: complianceSecurityStatus,
      evidence: `合規與警示狀態：${executionReviewLabel(complianceSecurityStatus)}`,
      risk: "缺少集中證據時，客戶稽核或供應商審查難以快速回覆",
      frequency: "每季稽核",
      action: complianceSecurityStatus === "pass" ? "可規劃合規 evidence vault" : "先補齊授權合規與警示資料",
    },
  ];
}

export function securityAuditCsv(rows: SecurityAuditItem[]) {
  const header = ["control", "scope", "owner", "status", "evidence", "risk", "frequency", "action"];
  const csvRows = rows.map((row) => [
    row.control,
    row.scope,
    row.owner,
    executionReviewLabel(row.status),
    row.evidence,
    row.risk,
    row.frequency,
    row.action,
  ]);

  return [header, ...csvRows].map((row) => row.map(csvCell).join(",")).join("\n");
}
