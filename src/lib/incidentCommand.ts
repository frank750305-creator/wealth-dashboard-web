export type IncidentCommandStatus = "pass" | "watch" | "block";
export type IncidentCommandPriority = "high" | "medium" | "low";

export type IncidentCommandItem = {
  incident: string;
  severity: IncidentCommandPriority;
  status: IncidentCommandStatus;
  trigger: string;
  customerImpact: string;
  owner: string;
  sla: string;
  runbook: string;
  nextAction: string;
};

function csvCell(value: unknown) {
  const stringValue = String(value ?? "");
  if (/[",\n]/.test(stringValue)) return `"${stringValue.replaceAll('"', '""')}"`;
  return stringValue;
}

function executionReviewLabel(status: IncidentCommandStatus) {
  if (status === "pass") return "通過";
  if (status === "watch") return "觀察";
  return "暫停";
}

function executionHandoffPriorityLabel(priority: IncidentCommandPriority) {
  if (priority === "high") return "高";
  if (priority === "medium") return "中";
  return "低";
}

function combinedExecutionStatus(statuses: IncidentCommandStatus[]): IncidentCommandStatus {
  if (statuses.some((status) => status === "block")) return "block";
  if (statuses.some((status) => status === "watch")) return "watch";
  return "pass";
}

function marketAlertPriorityFromStatus(status: IncidentCommandStatus): IncidentCommandPriority {
  if (status === "block") return "high";
  if (status === "watch") return "medium";
  return "low";
}

function incidentSlaLabel(status: IncidentCommandStatus, priority: IncidentCommandPriority) {
  if (status === "pass") return "例行追蹤";
  if (priority === "high") return "L1 / 4h 內回覆";
  if (priority === "medium") return "L2 / 24h 內回覆";
  return "L3 / 每週盤點";
}

export function buildIncidentCommandItems({
  dataPipelineDecision,
  dataContractDecision,
  dataRemediationDecision,
  marketAlertDecision,
  apiServiceCatalogDecision,
  apiContractBlueprintDecision,
  platformEntitlementDecision,
  clientWorkspaceProvisioningDecision,
  usageBillingDecision,
  dataLicenseComplianceDecision,
  securityAuditDecision,
  dataPipelineBlockCount,
  dataContractBlockCount,
  dataRemediationHighCount,
  marketHighAlertCount,
  workspaceBlockedCount,
  securityBlockCount,
  hasBigQueryCredentials,
  riskOwner,
  decisionOwner,
  executionOwner,
}: {
  dataPipelineDecision: IncidentCommandStatus;
  dataContractDecision: IncidentCommandStatus;
  dataRemediationDecision: IncidentCommandStatus;
  marketAlertDecision: IncidentCommandStatus;
  apiServiceCatalogDecision: IncidentCommandStatus;
  apiContractBlueprintDecision: IncidentCommandStatus;
  platformEntitlementDecision: IncidentCommandStatus;
  clientWorkspaceProvisioningDecision: IncidentCommandStatus;
  usageBillingDecision: IncidentCommandStatus;
  dataLicenseComplianceDecision: IncidentCommandStatus;
  securityAuditDecision: IncidentCommandStatus;
  dataPipelineBlockCount: number;
  dataContractBlockCount: number;
  dataRemediationHighCount: number;
  marketHighAlertCount: number;
  workspaceBlockedCount: number;
  securityBlockCount: number;
  hasBigQueryCredentials: boolean;
  riskOwner: string;
  decisionOwner: string;
  executionOwner: string;
}): IncidentCommandItem[] {
  const cleanRiskOwner = riskOwner.trim() || "風控";
  const cleanDecisionOwner = decisionOwner.trim() || "研究";
  const cleanExecutionOwner = executionOwner.trim() || "交易營運";
  const warehouseStatus: IncidentCommandStatus = hasBigQueryCredentials ? dataPipelineDecision : "block";
  const apiStatus = combinedExecutionStatus([apiServiceCatalogDecision, apiContractBlueprintDecision]);
  const tenantStatus = combinedExecutionStatus([platformEntitlementDecision, clientWorkspaceProvisioningDecision]);
  const commercialStatus = combinedExecutionStatus([clientWorkspaceProvisioningDecision, usageBillingDecision]);
  const governanceStatus = combinedExecutionStatus([dataLicenseComplianceDecision, securityAuditDecision, marketAlertDecision]);
  const investmentWorkflowStatus = combinedExecutionStatus([warehouseStatus, apiContractBlueprintDecision, marketAlertDecision]);
  const rows: Array<Omit<IncidentCommandItem, "sla">> = [
    {
      incident: "資料倉儲中斷",
      severity: warehouseStatus === "block" || !hasBigQueryCredentials ? "high" : marketAlertPriorityFromStatus(warehouseStatus),
      status: warehouseStatus,
      trigger: hasBigQueryCredentials ? `${dataPipelineBlockCount} 個管線阻擋項` : "缺少 BigQuery 環境變數",
      customerImpact: "商品搜尋、研究摘要、投組模型可能無法提供最新資料",
      owner: cleanRiskOwner,
      runbook: "確認 Vercel env、BigQuery service account、daily_prices / daily_fx 更新批次",
      nextAction: warehouseStatus === "pass" ? "維持每日資料健康檢查" : "先恢復資料讀取與資料表新鮮度",
    },
    {
      incident: "資料合約破壞",
      severity: dataContractBlockCount > 0 ? "high" : marketAlertPriorityFromStatus(dataContractDecision),
      status: dataContractDecision,
      trigger: `${dataContractBlockCount} 個 schema / freshness 阻擋項`,
      customerImpact: "API 欄位或分析輸出可能不穩定",
      owner: cleanRiskOwner,
      runbook: "比對必要欄位、缺欄位、資料量與 freshness，再決定回補或凍結發布",
      nextAction: dataContractDecision === "pass" ? "維持資料合約版本控管" : "先修復資料合約中心列出的阻擋項",
    },
    {
      incident: "資料缺口修復超時",
      severity: dataRemediationHighCount > 0 ? "high" : marketAlertPriorityFromStatus(dataRemediationDecision),
      status: dataRemediationDecision,
      trigger: `${dataRemediationHighCount} 個高優先修復項`,
      customerImpact: "研究宇宙、回測深度或跨幣別資料可能不足",
      owner: cleanRiskOwner,
      runbook: "依修復佇列排序處理資料源、管線、合約與覆蓋缺口",
      nextAction: dataRemediationDecision === "pass" ? "維持修復佇列清空" : "先關閉高優先資料缺口",
    },
    {
      incident: "API 服務降級",
      severity: marketAlertPriorityFromStatus(apiStatus),
      status: apiStatus,
      trigger: `服務目錄 ${executionReviewLabel(apiServiceCatalogDecision)} / 合約 ${executionReviewLabel(apiContractBlueprintDecision)}`,
      customerImpact: "內部工具或企業客戶 API 串接可能遇到欄位或版本不穩",
      owner: cleanRiskOwner,
      runbook: "確認 endpoint owner、request/response、auth、stability 與 breaking risk",
      nextAction: apiStatus === "pass" ? "可進入 API 文件與 SDK 規劃" : "先凍結 API 合約與服務等級",
    },
    {
      incident: "租戶開通阻擋",
      severity: workspaceBlockedCount > 0 ? "high" : marketAlertPriorityFromStatus(tenantStatus),
      status: tenantStatus,
      trigger: `${workspaceBlockedCount} 個工作區阻擋項`,
      customerImpact: "企業客戶、研究團隊或風控席位可能無法正式開通",
      owner: cleanRiskOwner,
      runbook: "檢查角色方案、資料包、API key、SSO、帳務與管理員權限",
      nextAction: tenantStatus === "pass" ? "可接租戶管理後台" : "先完成權限矩陣與工作區開通條件",
    },
    {
      incident: "帳務與合約異常",
      severity: marketAlertPriorityFromStatus(commercialStatus),
      status: commercialStatus,
      trigger: `帳務 ${executionReviewLabel(usageBillingDecision)} / 工作區 ${executionReviewLabel(clientWorkspaceProvisioningDecision)}`,
      customerImpact: "收費方案、發票、用量額度或企業合約履約可能不清楚",
      owner: cleanRiskOwner,
      runbook: "核對席位、API call、匯出量、MRR、發票與合約台帳",
      nextAction: commercialStatus === "pass" ? "可接 Stripe / 發票 / 合約台帳" : "先補齊帳務與用量治理",
    },
    {
      incident: "授權與再散布風險",
      severity: marketAlertPriorityFromStatus(dataLicenseComplianceDecision),
      status: dataLicenseComplianceDecision,
      trigger: `授權合規 ${executionReviewLabel(dataLicenseComplianceDecision)}`,
      customerImpact: "外部客戶匯出、API 回傳或報表使用範圍可能超出授權",
      owner: cleanRiskOwner,
      runbook: "確認資料來源、授權範圍、再散布限制、匯出政策與稽核軌跡",
      nextAction: dataLicenseComplianceDecision === "pass" ? "可接授權審批工作流" : "先關閉授權與匯出政策缺口",
    },
    {
      incident: "安全控制未達標",
      severity: securityBlockCount > 0 ? "high" : marketAlertPriorityFromStatus(securityAuditDecision),
      status: securityAuditDecision,
      trigger: `${securityBlockCount} 個安全阻擋項`,
      customerImpact: "SSO、API key、匯出留痕或管理員操作可能無法通過企業審查",
      owner: cleanRiskOwner,
      runbook: "依安全與審計中心逐項確認 SSO/MFA、key 輪替、IP allowlist、export log",
      nextAction: securityAuditDecision === "pass" ? "可規劃企業安全審查包" : "先修復安全審計阻擋項",
    },
    {
      incident: "市場警示未結",
      severity: marketHighAlertCount > 0 ? "high" : marketAlertPriorityFromStatus(marketAlertDecision),
      status: marketAlertDecision,
      trigger: `${marketHighAlertCount} 個高優先市場 / 營運警示`,
      customerImpact: "投資決策、資料品質或營運 SLA 需要人工覆核",
      owner: cleanRiskOwner,
      runbook: "先處理 high priority，再處理 watch；所有 block 事件需留下一步與負責人",
      nextAction: marketAlertDecision === "pass" ? "維持例行監控" : "先關閉高優先警示事件",
    },
    {
      incident: "投資工作流停擺",
      severity: marketAlertPriorityFromStatus(investmentWorkflowStatus),
      status: investmentWorkflowStatus,
      trigger: `資料 ${executionReviewLabel(warehouseStatus)} / API ${executionReviewLabel(apiContractBlueprintDecision)} / 警示 ${executionReviewLabel(marketAlertDecision)}`,
      customerImpact: "研究 memo、投組最佳化、交易票或投委會審核可能暫停",
      owner: cleanDecisionOwner,
      runbook: "確認資料可用性、模型輸出欄位、警示狀態與交易前審查",
      nextAction: investmentWorkflowStatus === "pass" ? "可進入客戶報告與交易流程" : "先恢復資料與模型輸出穩定性",
    },
    {
      incident: "交易執行交接風險",
      severity: marketAlertPriorityFromStatus(marketAlertDecision),
      status: marketAlertDecision,
      trigger: `營運警示 ${executionReviewLabel(marketAlertDecision)}`,
      customerImpact: "交易票、批次、成交回填與投後復盤可能需要延後",
      owner: cleanExecutionOwner,
      runbook: "確認交易票、批次限制、成交回填、成本與例外事項",
      nextAction: marketAlertDecision === "pass" ? "可維持交易營運交接" : "先確認警示是否影響交易執行",
    },
    {
      incident: "治理總控未通過",
      severity: marketAlertPriorityFromStatus(governanceStatus),
      status: governanceStatus,
      trigger: `授權 ${executionReviewLabel(dataLicenseComplianceDecision)} / 安全 ${executionReviewLabel(securityAuditDecision)} / 警示 ${executionReviewLabel(marketAlertDecision)}`,
      customerImpact: "新資料產品、企業客戶上線或外部 API 開放應暫緩",
      owner: cleanRiskOwner,
      runbook: "把授權、安全、警示與帳務證據整理成上線前 gate",
      nextAction: governanceStatus === "pass" ? "可進入正式上線門檻設計" : "先補齊治理總控缺口",
    },
  ];
  const priorityRank: Record<IncidentCommandPriority, number> = { high: 0, medium: 1, low: 2 };
  const statusRank: Record<IncidentCommandStatus, number> = { block: 0, watch: 1, pass: 2 };

  return rows
    .map((row) => ({
      ...row,
      sla: incidentSlaLabel(row.status, row.severity),
    }))
    .sort(
      (left, right) =>
        priorityRank[left.severity] - priorityRank[right.severity] ||
        statusRank[left.status] - statusRank[right.status] ||
        left.incident.localeCompare(right.incident, "zh-Hant"),
    );
}

export function incidentCommandCsv(rows: IncidentCommandItem[]) {
  const header = ["incident", "severity", "status", "trigger", "customer_impact", "owner", "sla", "runbook", "next_action"];
  const csvRows = rows.map((row) => [
    row.incident,
    executionHandoffPriorityLabel(row.severity),
    executionReviewLabel(row.status),
    row.trigger,
    row.customerImpact,
    row.owner,
    row.sla,
    row.runbook,
    row.nextAction,
  ]);

  return [header, ...csvRows].map((row) => row.map(csvCell).join(",")).join("\n");
}
