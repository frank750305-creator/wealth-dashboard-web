import type { MarketSource, MarketSourceStatus } from "@/types/market";
import type {
  CoverageUniverseItem,
  DataContractItem,
  DataPipelineHealthItem,
  DataPipelineTableSnapshot,
} from "@/lib/dataWarehouseMonitoring";

export type DataGovernanceStatus = "pass" | "watch" | "block";
export type DataGovernancePriority = "high" | "medium" | "low";

export type DataRemediationItem = {
  source: string;
  item: string;
  status: DataGovernanceStatus;
  priority: DataGovernancePriority;
  owner: string;
  evidence: string;
  impact: string;
  action: string;
};

export type DataLineageItem = {
  stage: string;
  node: string;
  status: DataGovernanceStatus;
  input: string;
  output: string;
  owner: string;
  evidence: string;
  action: string;
};

export type DataProductCatalogItem = {
  product: string;
  category: string;
  status: DataGovernanceStatus;
  owner: string;
  consumer: string;
  input: string;
  output: string;
  serviceLevel: string;
  evidence: string;
  action: string;
};

function csvCell(value: unknown) {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function executionReviewLabel(status: DataGovernanceStatus) {
  if (status === "pass") return "通過";
  if (status === "watch") return "觀察";
  return "暫停";
}

function executionHandoffPriorityLabel(priority: DataGovernancePriority) {
  if (priority === "high") return "高";
  if (priority === "medium") return "中";
  return "低";
}

function combinedExecutionStatus(statuses: DataGovernanceStatus[]): DataGovernanceStatus {
  if (statuses.some((status) => status === "block")) return "block";
  if (statuses.some((status) => status === "watch")) return "watch";
  return "pass";
}

function marketAlertPriorityFromStatus(status: DataGovernanceStatus): DataGovernancePriority {
  if (status === "block") return "high";
  if (status === "watch") return "medium";
  return "low";
}

function sourceStatusLabel(status: MarketSourceStatus) {
  if (status === "ready") return "可接 API";
  if (status === "needs_secret") return "需環境變數";
  if (status === "batch_only") return "批次管線";
  return "本機資料";
}

function sourceRemediationStatus(status: MarketSourceStatus): DataGovernanceStatus {
  if (status === "needs_secret") return "block";
  if (status === "batch_only" || status === "local_only") return "watch";
  return "pass";
}

export function buildDataRemediationItems({
  sources,
  dataPipelineHealthItems,
  dataContractItems,
  coverageUniverseItems,
  riskOwner,
}: {
  sources: MarketSource[];
  dataPipelineHealthItems: DataPipelineHealthItem[];
  dataContractItems: DataContractItem[];
  coverageUniverseItems: CoverageUniverseItem[];
  riskOwner: string;
}): DataRemediationItem[] {
  const cleanRiskOwner = riskOwner.trim() || "風控";
  const sourceItems: DataRemediationItem[] = sources.flatMap((source) => {
      const status = sourceRemediationStatus(source.status);
      if (status === "pass") return [];

      return [{
        source: "資料源接線",
        item: source.name,
        status,
        priority: marketAlertPriorityFromStatus(status),
        owner: cleanRiskOwner,
        evidence: `${source.provider} / ${source.currentStorage}`,
        impact: source.status === "needs_secret" ? "資料源尚未可用" : "資料仍依賴批次或本機流程",
        action: source.nextAction || source.integrationPath,
      }];
    });
  const pipelineItems = dataPipelineHealthItems
    .filter((item) => item.status !== "pass")
    .map((item) => ({
      source: "資料管線",
      item: item.label,
      status: item.status,
      priority: marketAlertPriorityFromStatus(item.status),
      owner: item.owner,
      evidence: `${item.value} / ${item.target}`,
      impact: item.status === "block" ? "暫停正式分析或回測" : "需要追蹤下一次批次",
      action: item.action,
    }));
  const contractItems = dataContractItems
    .filter((item) => item.status !== "pass")
    .map((item) => ({
      source: "資料合約",
      item: item.table,
      status: item.status,
      priority: marketAlertPriorityFromStatus(item.status),
      owner: item.owner,
      evidence: item.missingColumns.length ? `缺欄位 ${item.missingColumns.join(", ")}` : item.freshness,
      impact: item.status === "block" ? "API 或分析計算可能失效" : "欄位可用但更新狀態需觀察",
      action: item.action,
    }));
  const coverageItems = coverageUniverseItems
    .filter((item) => item.status !== "pass")
    .map((item) => ({
      source: "可投資宇宙",
      item: item.label,
      status: item.status,
      priority: marketAlertPriorityFromStatus(item.status),
      owner: item.owner,
      evidence: `${item.count} / ${item.target}`,
      impact: item.status === "block" ? "研究宇宙不足或資料過期" : "研究宇宙仍需擴充",
      action: item.action,
    }));
  const priorityRank: Record<DataGovernancePriority, number> = { high: 0, medium: 1, low: 2 };
  const statusRank: Record<DataGovernanceStatus, number> = { block: 0, watch: 1, pass: 2 };

  return [...sourceItems, ...pipelineItems, ...contractItems, ...coverageItems]
    .sort(
      (left, right) =>
        priorityRank[left.priority] - priorityRank[right.priority] ||
        statusRank[left.status] - statusRank[right.status] ||
        left.source.localeCompare(right.source, "zh-Hant") ||
        left.item.localeCompare(right.item, "zh-Hant"),
    )
    .slice(0, 40);
}

export function dataRemediationCsv(rows: DataRemediationItem[]) {
  const header = ["source", "item", "priority", "status", "owner", "evidence", "impact", "action"];
  const csvRows = rows.map((row) => [
    row.source,
    row.item,
    executionHandoffPriorityLabel(row.priority),
    executionReviewLabel(row.status),
    row.owner,
    row.evidence,
    row.impact,
    row.action,
  ]);

  return [header, ...csvRows].map((row) => row.map(csvCell).join(",")).join("\n");
}

export function buildDataLineageItems({
  sources,
  dataPipelineTableSnapshots,
  dataContractItems,
  coverageUniverseItems,
  dataRemediationItems,
  riskOwner,
  decisionOwner,
}: {
  sources: MarketSource[];
  dataPipelineTableSnapshots: DataPipelineTableSnapshot[];
  dataContractItems: DataContractItem[];
  coverageUniverseItems: CoverageUniverseItem[];
  dataRemediationItems: DataRemediationItem[];
  riskOwner: string;
  decisionOwner: string;
}): DataLineageItem[] {
  const cleanRiskOwner = riskOwner.trim() || "風控";
  const cleanDecisionOwner = decisionOwner.trim() || "研究";
  const sourceStatuses = sources.map((source) => sourceRemediationStatus(source.status));
  const sourceDecision = sourceStatuses.length ? combinedExecutionStatus(sourceStatuses) : "watch";
  const readySourceCount = sources.filter((source) => source.status === "ready").length;
  const highRemediationCount = dataRemediationItems.filter((item) => item.priority === "high").length;
  const mediumRemediationCount = dataRemediationItems.filter((item) => item.priority === "medium").length;
  const productStatus: DataGovernanceStatus =
    highRemediationCount > 0 ? "block" : mediumRemediationCount > 0 ? "watch" : "pass";

  const sourceNode: DataLineageItem = {
    stage: "來源接線",
    node: "外部資料源",
    status: sourceDecision,
    input: `${sources.length} sources`,
    output: `${readySourceCount}/${sources.length} ready`,
    owner: cleanRiskOwner,
    evidence: sources.length ? sources.map((source) => `${source.name}:${sourceStatusLabel(source.status)}`).join(" / ") : "--",
    action: sourceDecision === "pass" ? "維持資料源憑證與批次紀錄" : "優先處理需環境變數或批次接線的資料源",
  };
  const warehouseNodes = dataPipelineTableSnapshots.map((item) => ({
    stage: "倉儲表",
    node: item.table,
    status: item.status,
    input: "BigQuery dataset",
    output: `${item.rowCount} / ${item.coverage}`,
    owner: item.owner,
    evidence: `${item.latestDate} / ${item.freshness}`,
    action: item.action,
  }));
  const contractNodes = dataContractItems.map((item) => ({
    stage: "資料合約",
    node: item.table,
    status: item.status,
    input: item.layer,
    output: `${item.presentColumns.length}/${item.requiredColumns.length} columns`,
    owner: item.owner,
    evidence: item.missingColumns.length ? `缺 ${item.missingColumns.join(", ")}` : item.freshness,
    action: item.action,
  }));
  const universeNodes = coverageUniverseItems.map((item) => ({
    stage: "研究宇宙",
    node: item.label,
    status: item.status,
    input: item.target,
    output: item.count,
    owner: item.owner,
    evidence: item.coverage,
    action: item.action,
  }));
  const remediationNode: DataLineageItem = {
    stage: "營運修復",
    node: "資料缺口佇列",
    status: dataRemediationItems.length ? combinedExecutionStatus(dataRemediationItems.map((item) => item.status)) : "pass",
    input: "來源 / 管線 / 合約 / 研究宇宙",
    output: `高 ${highRemediationCount} / 中 ${mediumRemediationCount}`,
    owner: cleanRiskOwner,
    evidence: dataRemediationItems.length ? `${dataRemediationItems.length} 項待處理` : "無待處理缺口",
    action: dataRemediationItems.length ? "依優先級關閉資料缺口" : "維持每日監控",
  };
  const productNode: DataLineageItem = {
    stage: "分析產品",
    node: "商品主檔 / Watchlist / 投組引擎",
    status: productStatus,
    input: "資料合約 + 研究宇宙",
    output: "商品分析、研究摘要、投組分析",
    owner: cleanDecisionOwner,
    evidence: productStatus === "pass" ? "資料鏈可支援前端分析" : "仍有資料缺口影響產品輸出",
    action: productStatus === "pass" ? "可進入模型與客戶視圖擴充" : "先處理高 / 中優先資料缺口",
  };

  return [sourceNode, ...warehouseNodes, ...contractNodes, ...universeNodes, remediationNode, productNode];
}

export function dataLineageCsv(rows: DataLineageItem[]) {
  const header = ["stage", "node", "status", "input", "output", "owner", "evidence", "action"];
  const csvRows = rows.map((row) => [
    row.stage,
    row.node,
    executionReviewLabel(row.status),
    row.input,
    row.output,
    row.owner,
    row.evidence,
    row.action,
  ]);

  return [header, ...csvRows].map((row) => row.map(csvCell).join(",")).join("\n");
}

export function buildDataProductCatalogItems({
  dataReadinessDecision,
  coverageUniverseDecision,
  dataRemediationDecision,
  dataLineageDecision,
  marketAlertDecision,
  comparisonRows,
  visibleComparisonRows,
  activeAllocationRows,
  tradeTickets,
  dataRemediationItems,
  riskOwner,
  decisionOwner,
}: {
  dataReadinessDecision: DataGovernanceStatus;
  coverageUniverseDecision: DataGovernanceStatus;
  dataRemediationDecision: DataGovernanceStatus;
  dataLineageDecision: DataGovernanceStatus;
  marketAlertDecision: DataGovernanceStatus;
  comparisonRows: unknown[];
  visibleComparisonRows: unknown[];
  activeAllocationRows: unknown[];
  tradeTickets: unknown[];
  dataRemediationItems: DataRemediationItem[];
  riskOwner: string;
  decisionOwner: string;
}): DataProductCatalogItem[] {
  const cleanRiskOwner = riskOwner.trim() || "風控";
  const cleanDecisionOwner = decisionOwner.trim() || "研究";
  const researchStatus: DataGovernanceStatus = comparisonRows.length
    ? combinedExecutionStatus([dataReadinessDecision, coverageUniverseDecision])
    : "watch";
  const portfolioStatus: DataGovernanceStatus = activeAllocationRows.length
    ? combinedExecutionStatus([researchStatus, dataLineageDecision])
    : "watch";
  const operationsStatus: DataGovernanceStatus = dataRemediationItems.some((item) => item.priority === "high")
    ? "block"
    : dataRemediationItems.length
      ? "watch"
      : "pass";

  return [
    {
      product: "市場資料 API",
      category: "資料服務",
      status: dataReadinessDecision,
      owner: cleanRiskOwner,
      consumer: "前端分析 / 投組引擎",
      input: "BigQuery daily_prices / daily_fx",
      output: "商品搜尋、商品主檔、價格序列",
      serviceLevel: "T+1 更新，schema 必要欄位完整",
      evidence: `資料準備狀態：${executionReviewLabel(dataReadinessDecision)}`,
      action: dataReadinessDecision === "pass" ? "可支援前端資料讀取" : "先處理資料管線與合約缺口",
    },
    {
      product: "商品主檔分析",
      category: "研究工具",
      status: dataReadinessDecision,
      owner: cleanDecisionOwner,
      consumer: "研究 / 顧問",
      input: "市場資料 API",
      output: "報酬、波動、回撤、近期價格",
      serviceLevel: "單商品即時查詢，使用 BigQuery 歷史價格",
      evidence: "支援 adjusted / raw 價格口徑",
      action: dataReadinessDecision === "pass" ? "可擴充估值、配息與基本面欄位" : "先確保價格資料可讀取",
    },
    {
      product: "Watchlist 研究摘要",
      category: "研究產品",
      status: researchStatus,
      owner: cleanDecisionOwner,
      consumer: "投委會 / 客戶報告",
      input: "商品主檔分析 + 研究宇宙",
      output: "候選名單、風險摘要、Markdown memo",
      serviceLevel: "研究清單需有可比較商品",
      evidence: `${visibleComparisonRows.length}/${comparisonRows.length} 檔符合目前篩選`,
      action: comparisonRows.length ? "可依研究模板匯出 memo" : "先載入 watchlist 商品比較",
    },
    {
      product: "投組分析與最佳化",
      category: "投組工具",
      status: portfolioStatus,
      owner: cleanDecisionOwner,
      consumer: "投資決策 / 再平衡",
      input: "Watchlist 研究摘要",
      output: "配置草案、風險預算、交易清單",
      serviceLevel: "至少一檔有效配置才能產生投組輸出",
      evidence: `${activeAllocationRows.length} 檔配置 / ${tradeTickets.length} 張交易票`,
      action: activeAllocationRows.length ? "可進入簽核與交易流程" : "先產生有效配置",
    },
    {
      product: "市場警示中心",
      category: "營運監控",
      status: marketAlertDecision,
      owner: cleanRiskOwner,
      consumer: "資料營運 / 風控",
      input: "資料品質、KRI、SLA、例外、血緣",
      output: "可分派警示事件",
      serviceLevel: "高優先事件需先關閉",
      evidence: `警示狀態：${executionReviewLabel(marketAlertDecision)}`,
      action: marketAlertDecision === "pass" ? "維持日常監控" : "依優先級關閉警示",
    },
    {
      product: "資料營運控制台",
      category: "平台治理",
      status: operationsStatus,
      owner: cleanRiskOwner,
      consumer: "資料工程 / 平台管理",
      input: "管線、合約、研究宇宙、血緣",
      output: "修復佇列、血緣 CSV、營運 CSV",
      serviceLevel: "高優先缺口不得進入正式分析",
      evidence: `${dataRemediationItems.length} 項資料缺口`,
      action: dataRemediationDecision === "pass" ? "可進入資料產品擴充" : "先清理資料缺口修復佇列",
    },
    {
      product: "資料血緣與產品目錄",
      category: "平台治理",
      status: dataLineageDecision,
      owner: cleanRiskOwner,
      consumer: "內部審計 / 平台管理",
      input: "資料血緣地圖",
      output: "資料產品清單、依賴與服務等級",
      serviceLevel: "每個資料產品需有 owner、輸入、輸出與動作",
      evidence: `血緣狀態：${executionReviewLabel(dataLineageDecision)}`,
      action: dataLineageDecision === "pass" ? "可作為平台治理基準" : "先修復阻斷或觀察節點",
    },
  ];
}

export function dataProductCatalogCsv(rows: DataProductCatalogItem[]) {
  const header = ["product", "category", "status", "owner", "consumer", "input", "output", "service_level", "evidence", "action"];
  const csvRows = rows.map((row) => [
    row.product,
    row.category,
    executionReviewLabel(row.status),
    row.owner,
    row.consumer,
    row.input,
    row.output,
    row.serviceLevel,
    row.evidence,
    row.action,
  ]);

  return [header, ...csvRows].map((row) => row.map(csvCell).join(",")).join("\n");
}
