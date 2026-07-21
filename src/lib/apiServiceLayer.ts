export type ApiServiceStatus = "pass" | "watch" | "block";
export type ApiServiceMethod = "GET" | "POST";
export type ApiContractStability = "stable" | "beta" | "draft";

export type ApiServiceCatalogItem = {
  endpoint: string;
  method: ApiServiceMethod;
  product: string;
  status: ApiServiceStatus;
  owner: string;
  consumer: string;
  input: string;
  output: string;
  serviceLevel: string;
  action: string;
};

export type ApiContractBlueprintItem = {
  endpoint: string;
  method: ApiServiceMethod;
  product: string;
  version: string;
  auth: string;
  requestSchema: string;
  responseSchema: string;
  stability: ApiContractStability;
  status: ApiServiceStatus;
  owner: string;
  breakingRisk: string;
  action: string;
};

export type ApiVersionGovernanceItem = {
  endpoint: string;
  method: ApiServiceMethod;
  product: string;
  version: string;
  stability: ApiContractStability;
  status: ApiServiceStatus;
  owner: string;
  releaseChannel: string;
  compatibilityWindow: string;
  clientNotice: string;
  deprecationPolicy: string;
  migrationRisk: "high" | "medium" | "low";
  action: string;
};

function csvCell(value: unknown) {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function executionReviewLabel(status: ApiServiceStatus) {
  if (status === "pass") return "通過";
  if (status === "watch") return "觀察";
  return "暫停";
}

function combinedExecutionStatus(statuses: ApiServiceStatus[]): ApiServiceStatus {
  if (statuses.some((status) => status === "block")) return "block";
  if (statuses.some((status) => status === "watch")) return "watch";
  return "pass";
}

function stabilityStatus(item: ApiContractBlueprintItem): ApiServiceStatus {
  if (item.status === "block") return "block";
  if (item.stability === "stable") return item.status;
  return "watch";
}

function migrationRiskLevel(breakingRisk: string): ApiVersionGovernanceItem["migrationRisk"] {
  if (breakingRisk.startsWith("高")) return "high";
  if (breakingRisk.startsWith("中")) return "medium";
  return "low";
}

export function buildApiServiceCatalogItems({
  dataReadinessDecision,
  dataProductCatalogDecision,
  dataLineageDecision,
  dataRemediationDecision,
  hasBigQueryCredentials,
  comparisonRows,
  activeAllocationRows,
  tradeTickets,
  riskOwner,
  decisionOwner,
}: {
  dataReadinessDecision: ApiServiceStatus;
  dataProductCatalogDecision: ApiServiceStatus;
  dataLineageDecision: ApiServiceStatus;
  dataRemediationDecision: ApiServiceStatus;
  hasBigQueryCredentials: boolean;
  comparisonRows: unknown[];
  activeAllocationRows: unknown[];
  tradeTickets: unknown[];
  riskOwner: string;
  decisionOwner: string;
}): ApiServiceCatalogItem[] {
  const cleanRiskOwner = riskOwner.trim() || "風控";
  const cleanDecisionOwner = decisionOwner.trim() || "研究";
  const warehouseStatus: ApiServiceStatus = hasBigQueryCredentials ? dataReadinessDecision : "block";
  const portfolioStatus: ApiServiceStatus = activeAllocationRows.length
    ? combinedExecutionStatus([dataReadinessDecision, dataLineageDecision])
    : "watch";
  const productStatus: ApiServiceStatus = combinedExecutionStatus([dataProductCatalogDecision, dataRemediationDecision]);

  return [
    {
      method: "GET",
      endpoint: "/api/v1/market/sources",
      product: "資料源狀態",
      status: "pass",
      owner: cleanRiskOwner,
      consumer: "平台管理 / 前端",
      input: "Market source 設定",
      output: "資料源清單、接入方式、缺少金鑰",
      serviceLevel: "每次載入平台時可讀",
      action: "維持資料源盤點與金鑰狀態同步",
    },
    {
      method: "GET",
      endpoint: "/api/v1/market/bigquery/status",
      product: "BigQuery 連線狀態",
      status: hasBigQueryCredentials ? "pass" : "block",
      owner: cleanRiskOwner,
      consumer: "平台管理 / 資料工程",
      input: "Vercel 環境變數",
      output: "project、dataset、table、credential 狀態",
      serviceLevel: "部署後需立即可檢查",
      action: hasBigQueryCredentials ? "可進入資料表診斷" : "先補齊 GCP_SERVICE_ACCOUNT_JSON 與 BigQuery 變數",
    },
    {
      method: "GET",
      endpoint: "/api/v1/market/bigquery/diagnostics",
      product: "資料倉儲診斷",
      status: warehouseStatus,
      owner: cleanRiskOwner,
      consumer: "資料營運 / 風控",
      input: "daily_prices / daily_fx",
      output: "schema、freshness、coverage、stale symbols",
      serviceLevel: "每日批次完成後更新",
      action: warehouseStatus === "pass" ? "可作為分析前健康檢查" : "先排除 BigQuery 憑證或資料品質問題",
    },
    {
      method: "GET",
      endpoint: "/api/v1/market/bigquery/assets",
      product: "商品搜尋",
      status: warehouseStatus,
      owner: cleanDecisionOwner,
      consumer: "研究 / 顧問",
      input: "查詢文字、limit",
      output: "商品代碼、名稱、交易所、幣別、最新日",
      serviceLevel: "互動查詢需穩定回應",
      action: warehouseStatus === "pass" ? "可擴充資產類別與地區篩選" : "先確保商品資料可讀",
    },
    {
      method: "GET",
      endpoint: "/api/v1/market/bigquery/assets/:symbol",
      product: "商品主檔分析",
      status: warehouseStatus,
      owner: cleanDecisionOwner,
      consumer: "研究 / 投委會",
      input: "symbol、price_basis、lookback",
      output: "報酬、波動、回撤、價格序列",
      serviceLevel: "單商品查詢需回傳可解釋品質欄位",
      action: warehouseStatus === "pass" ? "可接基本面與配息欄位" : "先補齊價格序列",
    },
    {
      method: "POST",
      endpoint: "/api/v1/portfolio/analyze-bigquery",
      product: "投組分析",
      status: comparisonRows.length ? portfolioStatus : "watch",
      owner: cleanDecisionOwner,
      consumer: "投資決策 / 顧問",
      input: "watchlist、權重、價格口徑",
      output: "投組風險、績效、商品比較、決策摘要",
      serviceLevel: "至少一組可比較商品才能產生有效分析",
      action: comparisonRows.length ? "可進入模型配置與 memo 輸出" : "先載入 watchlist 比較資料",
    },
    {
      method: "POST",
      endpoint: "/api/v1/portfolio/optimize-bigquery",
      product: "AI 調倉最佳化",
      status: activeAllocationRows.length ? portfolioStatus : "watch",
      owner: cleanDecisionOwner,
      consumer: "再平衡 / 投委會",
      input: "候選商品、風險限制、本金、單檔上限",
      output: "最佳化權重、交易票、風險預算",
      serviceLevel: "阻斷資料缺口不得產生正式建議",
      action: activeAllocationRows.length ? "可進入交易前審查" : "先產生有效配置草案",
    },
    {
      method: "GET",
      endpoint: "/api/v1/research/tasks/bigquery/status",
      product: "研究任務倉儲狀態",
      status: hasBigQueryCredentials ? "pass" : "block",
      owner: cleanRiskOwner,
      consumer: "研究 / 資料工程",
      input: "Vercel 環境變數、BigQuery dataset",
      output: "研究任務表、credential 狀態、必要環境變數",
      serviceLevel: "部署後需立即可檢查",
      action: hasBigQueryCredentials ? "可進入研究任務同步" : "先補齊 BigQuery service account",
    },
    {
      method: "GET",
      endpoint: "/api/v1/research/tasks/bigquery/latest",
      product: "研究任務最新狀態",
      status: hasBigQueryCredentials ? "pass" : "block",
      owner: cleanDecisionOwner,
      consumer: "研究工作台 / 投委會",
      input: "workspace_id、limit",
      output: "每個 task_id 最新狀態",
      serviceLevel: "跨裝置載入需回傳最新人工狀態",
      action: hasBigQueryCredentials ? "可從 BigQuery 回復研究任務狀態" : "先補齊 BigQuery 讀取權限",
    },
    {
      method: "GET",
      endpoint: "/api/v1/research/tasks/bigquery/audit",
      product: "研究任務同步稽核",
      status: hasBigQueryCredentials ? "pass" : "block",
      owner: cleanRiskOwner,
      consumer: "研究工作台 / 平台審計",
      input: "workspace_id、limit",
      output: "同步批次、actor、任務數、手動覆寫數、阻塞數",
      serviceLevel: "同步後需可回查最近批次",
      action: hasBigQueryCredentials ? "可檢查研究任務同步軌跡" : "先補齊 BigQuery 讀取權限",
    },
    {
      method: "POST",
      endpoint: "/api/v1/research/tasks/bigquery/sync",
      product: "研究任務同步",
      status: hasBigQueryCredentials ? "pass" : "block",
      owner: cleanDecisionOwner,
      consumer: "研究工作台 / 投委會",
      input: "ResearchTaskSyncPayload、workspace_id、actor_id、idempotency_key",
      output: "寫入筆數、資料表、錯誤明細",
      serviceLevel: "人工同步需有可追蹤結果",
      action: hasBigQueryCredentials ? "可把研究任務寫入 BigQuery" : "先補齊 BigQuery 寫入權限",
    },
    {
      method: "GET",
      endpoint: "/api/v1/platform/data-products",
      product: "資料產品目錄",
      status: productStatus,
      owner: cleanRiskOwner,
      consumer: "平台管理 / 內部審計",
      input: "資料產品、血緣、修復佇列",
      output: "產品 owner、使用者、輸入輸出、SLA",
      serviceLevel: "每次資料產品變更後更新",
      action: productStatus === "pass" ? "可作為平台治理基準" : "先處理資料目錄或修復佇列缺口",
    },
    {
      method: "GET",
      endpoint: "/api/v1/trading/tickets",
      product: "交易票查詢",
      status: tradeTickets.length ? portfolioStatus : "watch",
      owner: cleanDecisionOwner,
      consumer: "交易 / 營運",
      input: "配置草案、再平衡門檻、最小交易金額",
      output: "交易方向、金額、現金影響、批次",
      serviceLevel: "送交交易前需有審核軌跡",
      action: tradeTickets.length ? "可進入執行交接" : "先建立交易票與批次規則",
    },
    {
      method: "POST",
      endpoint: "/api/v1/trading/tickets",
      product: "交易票同步",
      status: tradeTickets.length ? portfolioStatus : "watch",
      owner: cleanDecisionOwner,
      consumer: "交易 / 營運",
      input: "TradeTicketSyncPayload、workspace_id、portfolio_id、batch_id",
      output: "寫入筆數、資料表、錯誤明細",
      serviceLevel: "送交執行前需先持久化交易票",
      action: tradeTickets.length ? "可把交易票寫入 BigQuery" : "先建立交易票與批次規則",
    },
  ];
}

export function apiServiceCatalogCsv(rows: ApiServiceCatalogItem[]) {
  const header = ["method", "endpoint", "product", "status", "owner", "consumer", "input", "output", "service_level", "action"];
  const csvRows = rows.map((row) => [
    row.method,
    row.endpoint,
    row.product,
    executionReviewLabel(row.status),
    row.owner,
    row.consumer,
    row.input,
    row.output,
    row.serviceLevel,
    row.action,
  ]);

  return [header, ...csvRows].map((row) => row.map(csvCell).join(",")).join("\n");
}

export function apiContractStabilityLabel(stability: ApiContractBlueprintItem["stability"]) {
  if (stability === "stable") return "Stable";
  if (stability === "beta") return "Beta";
  return "Draft";
}

export function apiContractStabilityClass(stability: ApiContractBlueprintItem["stability"]) {
  if (stability === "stable") return "border-emerald-500/40 bg-emerald-500/10 text-emerald-300";
  if (stability === "beta") return "border-sky-500/40 bg-sky-500/10 text-sky-300";
  return "border-amber-500/40 bg-amber-500/10 text-amber-300";
}

export function buildApiContractBlueprintItems({
  apiServiceCatalogItems,
  hasBigQueryCredentials,
  riskOwner,
  decisionOwner,
}: {
  apiServiceCatalogItems: ApiServiceCatalogItem[];
  hasBigQueryCredentials: boolean;
  riskOwner: string;
  decisionOwner: string;
}): ApiContractBlueprintItem[] {
  const cleanRiskOwner = riskOwner.trim() || "風控";
  const cleanDecisionOwner = decisionOwner.trim() || "研究";
  const serviceByEndpoint = new Map(apiServiceCatalogItems.map((item) => [item.endpoint, item]));
  const serviceStatus = (endpoint: string): ApiServiceStatus => serviceByEndpoint.get(endpoint)?.status ?? "watch";

  return [
    {
      method: "GET",
      endpoint: "/api/v1/market/sources",
      product: "資料源狀態",
      version: "v1",
      auth: "public-read",
      requestSchema: "none",
      responseSchema: "MarketSource[]",
      stability: "stable",
      status: serviceStatus("/api/v1/market/sources"),
      owner: cleanRiskOwner,
      breakingRisk: "低：只新增資料源欄位時可向後相容",
      action: "維持欄位向後相容，新增欄位需設 optional",
    },
    {
      method: "GET",
      endpoint: "/api/v1/market/bigquery/status",
      product: "BigQuery 連線狀態",
      version: "v1",
      auth: "server-env",
      requestSchema: "none",
      responseSchema: "BigQueryConnectionStatus",
      stability: "stable",
      status: hasBigQueryCredentials ? serviceStatus("/api/v1/market/bigquery/status") : "block",
      owner: cleanRiskOwner,
      breakingRisk: "中：credential 欄位命名會影響前端提示",
      action: hasBigQueryCredentials ? "可作為部署後 health check" : "先補齊 Vercel BigQuery 環境變數",
    },
    {
      method: "GET",
      endpoint: "/api/v1/market/bigquery/diagnostics",
      product: "資料倉儲診斷",
      version: "v1",
      auth: "service-account",
      requestSchema: "none",
      responseSchema: "BigQueryDiagnostics",
      stability: "beta",
      status: serviceStatus("/api/v1/market/bigquery/diagnostics"),
      owner: cleanRiskOwner,
      breakingRisk: "中：schemaChecks 與 summary 欄位需維持",
      action: "新增診斷項目時用 optional 欄位，避免破壞既有頁面",
    },
    {
      method: "GET",
      endpoint: "/api/v1/market/bigquery/assets",
      product: "商品搜尋",
      version: "v1",
      auth: "service-account",
      requestSchema: "{ query: string; limit?: number }",
      responseSchema: "{ assets: AssetSearchResult[] }",
      stability: "beta",
      status: serviceStatus("/api/v1/market/bigquery/assets"),
      owner: cleanDecisionOwner,
      breakingRisk: "中：symbol、name、currency 欄位不可改名",
      action: "下一步可加 asset_class、region、exchange 篩選",
    },
    {
      method: "GET",
      endpoint: "/api/v1/market/bigquery/assets/:symbol",
      product: "商品主檔分析",
      version: "v1",
      auth: "service-account",
      requestSchema: "{ symbol: string; price_basis?: adjusted | raw; lookback?: number }",
      responseSchema: "AssetProfile",
      stability: "beta",
      status: serviceStatus("/api/v1/market/bigquery/assets/:symbol"),
      owner: cleanDecisionOwner,
      breakingRisk: "高：metrics 與 price series 是研究畫面核心依賴",
      action: "先凍結 metrics 命名，再擴充估值、配息與基本面",
    },
    {
      method: "POST",
      endpoint: "/api/v1/portfolio/analyze-bigquery",
      product: "投組分析",
      version: "v1",
      auth: "service-account",
      requestSchema: "PortfolioAnalyzeRequest",
      responseSchema: "PortfolioAnalysisResult",
      stability: "draft",
      status: serviceStatus("/api/v1/portfolio/analyze-bigquery"),
      owner: cleanDecisionOwner,
      breakingRisk: "高：投組風險欄位會影響 memo 與簽核資料",
      action: "把 request/response 固化後，再開放外部客戶或內部工具串接",
    },
    {
      method: "POST",
      endpoint: "/api/v1/portfolio/optimize-bigquery",
      product: "AI 調倉最佳化",
      version: "v1",
      auth: "service-account",
      requestSchema: "PortfolioOptimizeRequest",
      responseSchema: "PortfolioOptimizeResult",
      stability: "draft",
      status: serviceStatus("/api/v1/portfolio/optimize-bigquery"),
      owner: cleanDecisionOwner,
      breakingRisk: "高：權重、限制與交易票欄位不可無預警改版",
      action: "需補版本化限制條件與 optimizer policy，再進入正式建議",
    },
    {
      method: "GET",
      endpoint: "/api/v1/research/tasks/bigquery/status",
      product: "研究任務倉儲狀態",
      version: "v1",
      auth: "service-account",
      requestSchema: "none",
      responseSchema: "ResearchTaskWarehouseStatus",
      stability: "beta",
      status: hasBigQueryCredentials ? serviceStatus("/api/v1/research/tasks/bigquery/status") : "block",
      owner: cleanRiskOwner,
      breakingRisk: "中：taskTable 與 credential 欄位會影響同步按鈕",
      action: "維持欄位向後相容，新增表設定需 optional",
    },
    {
      method: "GET",
      endpoint: "/api/v1/research/tasks/bigquery/latest",
      product: "研究任務最新狀態",
      version: "v1",
      auth: "service-account",
      requestSchema: "{ workspace_id?: string; limit?: number }",
      responseSchema: "ResearchTaskLatestResult",
      stability: "draft",
      status: hasBigQueryCredentials ? serviceStatus("/api/v1/research/tasks/bigquery/latest") : "block",
      owner: cleanDecisionOwner,
      breakingRisk: "中：task_id 與 updated_at 排序會影響跨裝置狀態回復",
      action: "多人使用前需補 user/workspace 維度",
    },
    {
      method: "GET",
      endpoint: "/api/v1/research/tasks/bigquery/audit",
      product: "研究任務同步稽核",
      version: "v1",
      auth: "service-account",
      requestSchema: "{ workspace_id?: string; limit?: number }",
      responseSchema: "ResearchTaskSyncAuditResult",
      stability: "draft",
      status: hasBigQueryCredentials ? serviceStatus("/api/v1/research/tasks/bigquery/audit") : "block",
      owner: cleanRiskOwner,
      breakingRisk: "中：generated_at 分批邏輯會影響稽核排序與批次統計",
      action: "多人使用前需補明確 actor 身份來源",
    },
    {
      method: "POST",
      endpoint: "/api/v1/research/tasks/bigquery/sync",
      product: "研究任務同步",
      version: "v1",
      auth: "service-account",
      requestSchema: "ResearchTaskSyncPayload & { workspace_id: string; actor_id: string }",
      responseSchema: "ResearchTaskSyncResult",
      stability: "draft",
      status: hasBigQueryCredentials ? serviceStatus("/api/v1/research/tasks/bigquery/sync") : "block",
      owner: cleanDecisionOwner,
      breakingRisk: "高：task_id、status、updated_at 欄位需可追溯",
      action: "正式多人使用前需補 idempotency 與使用者身份",
    },
    {
      method: "GET",
      endpoint: "/api/v1/platform/data-products",
      product: "資料產品目錄",
      version: "v1",
      auth: "internal",
      requestSchema: "none",
      responseSchema: "DataProductCatalogItem[]",
      stability: "beta",
      status: serviceStatus("/api/v1/platform/data-products"),
      owner: cleanRiskOwner,
      breakingRisk: "中：owner、consumer、SLA 欄位需維持",
      action: "可接入權限控管與內部審計流程",
    },
    {
      method: "GET",
      endpoint: "/api/v1/trading/tickets",
      product: "交易票查詢",
      version: "v1",
      auth: "internal",
      requestSchema: "{ portfolio_id?: string; batch_id?: string }",
      responseSchema: "TradeTicketRow[]",
      stability: "draft",
      status: serviceStatus("/api/v1/trading/tickets"),
      owner: cleanDecisionOwner,
      breakingRisk: "高：交易方向、金額與現金影響欄位需可追溯",
      action: "接交易前審查與執行回填前，先建立欄位凍結規則",
    },
    {
      method: "POST",
      endpoint: "/api/v1/trading/tickets",
      product: "交易票同步",
      version: "v1",
      auth: "internal",
      requestSchema: "TradeTicketSyncPayload & { workspace_id: string; portfolio_id: string; batch_id: string }",
      responseSchema: "TradeTicketSyncResult",
      stability: "draft",
      status: serviceStatus("/api/v1/trading/tickets"),
      owner: cleanDecisionOwner,
      breakingRisk: "高：ticket_id、方向、金額、現金影響與 batch_id 需可追溯",
      action: "approval gate 已接前端；正式路由前需補 execution venue 與 route 狀態回填",
    },
  ];
}

export function apiContractBlueprintJson(rows: ApiContractBlueprintItem[]) {
  const paths = Object.fromEntries(
    rows.map((row) => {
      const endpoint = row.endpoint.replace(":symbol", "{symbol}");
      const method = row.method.toLowerCase();
      return [
        endpoint,
        {
          [method]: {
            summary: row.product,
            tags: [row.product],
            security: [{ [row.auth]: [] }],
            "x-version": row.version,
            "x-status": executionReviewLabel(row.status),
            "x-stability": apiContractStabilityLabel(row.stability),
            "x-owner": row.owner,
            "x-breaking-risk": row.breakingRisk,
            parameters: row.method === "GET" && row.requestSchema !== "none" ? [{ name: "request", in: "query", schema: { type: "object" } }] : [],
            requestBody:
              row.method === "POST"
                ? {
                    required: true,
                    description: row.requestSchema,
                    content: { "application/json": { schema: { type: "object" } } },
                  }
                : undefined,
            responses: {
              "200": {
                description: row.responseSchema,
                content: { "application/json": { schema: { type: "object" } } },
              },
            },
          },
        },
      ];
    }),
  );

  return JSON.stringify(
    {
      openapi: "3.1.0",
      info: {
        title: "Wealth Dashboard Platform API",
        version: "0.1.0",
        description: "Internal API blueprint for market data, portfolio analytics, data products, and trading workflow.",
      },
      paths,
      components: {
        securitySchemes: {
          "public-read": {
            type: "apiKey",
            in: "header",
            name: "x-public-client",
            description: "Read-only public demo surface. Production data must still be scoped by tenant policy.",
          },
          "server-env": {
            type: "apiKey",
            in: "header",
            name: "x-server-runtime",
            description: "Server-side runtime route backed by Vercel environment configuration.",
          },
          "service-account": {
            type: "apiKey",
            in: "header",
            name: "x-workspace-api-key",
            description: "Workspace-scoped server credential for BigQuery-backed market and research workflows.",
          },
          internal: {
            type: "apiKey",
            in: "header",
            name: "x-internal-operator",
            description: "Internal operator route for platform governance and trading workflow operations.",
          },
        },
      },
    },
    null,
    2,
  );
}

export function buildApiVersionGovernanceItems(rows: ApiContractBlueprintItem[]): ApiVersionGovernanceItem[] {
  return rows.map((row) => {
    const isStable = row.stability === "stable";
    const isBeta = row.stability === "beta";

    return {
      endpoint: row.endpoint,
      method: row.method,
      product: row.product,
      version: row.version,
      stability: row.stability,
      status: stabilityStatus(row),
      owner: row.owner,
      releaseChannel: isStable ? "production" : isBeta ? "controlled-beta" : "internal-draft",
      compatibilityWindow: isStable ? "180 days" : isBeta ? "90 days" : "30 days",
      clientNotice: isStable ? "60 days before breaking change" : isBeta ? "30 days before breaking change" : "internal changelog only",
      deprecationPolicy: isStable ? "breaking change requires new /v2 route" : "breaking change allowed before external release",
      migrationRisk: migrationRiskLevel(row.breakingRisk),
      action: isStable ? "維持 v1 向後相容與 optional 欄位策略" : row.action,
    };
  });
}

export function apiVersionGovernanceCsv(rows: ApiVersionGovernanceItem[]) {
  const header = [
    "method",
    "endpoint",
    "product",
    "version",
    "stability",
    "status",
    "owner",
    "release_channel",
    "compatibility_window",
    "client_notice",
    "deprecation_policy",
    "migration_risk",
    "action",
  ];
  const csvRows = rows.map((row) => [
    row.method,
    row.endpoint,
    row.product,
    row.version,
    apiContractStabilityLabel(row.stability),
    executionReviewLabel(row.status),
    row.owner,
    row.releaseChannel,
    row.compatibilityWindow,
    row.clientNotice,
    row.deprecationPolicy,
    row.migrationRisk,
    row.action,
  ]);

  return [header, ...csvRows].map((row) => row.map(csvCell).join(",")).join("\n");
}
