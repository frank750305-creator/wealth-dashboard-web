import type {
  BigQueryMarketStatus,
  BigQueryMarketDiagnostics,
  BigQueryAssetHistoryResponse,
  BigQueryAssetProfileResponse,
  BigQueryAssetSearchResponse,
  ExecutionFillWarehouseLatestResponse,
  ExecutionFillWarehouseSyncPayload,
  ExecutionFillWarehouseSyncResponse,
  ExecutionRouteWarehouseLatestResponse,
  ExecutionRouteWarehouseSyncPayload,
  ExecutionRouteWarehouseSyncResponse,
  ExecutionRouteEventWarehouseLatestResponse,
  ExecutionRouteEventWarehouseSyncPayload,
  ExecutionRouteEventWarehouseSyncResponse,
  MarketSourcesResponse,
  PortfolioAnalysisResponse,
  PortfolioAnalyzeBigQueryPayload,
  PortfolioOptimizationResponse,
  PortfolioOptimizeBigQueryPayload,
  PlatformExceptionWarehouseLatestResponse,
  PlatformExceptionWarehouseSyncPayload,
  PlatformExceptionWarehouseSyncResponse,
  PostTradeAttributionWarehouseLatestResponse,
  PostTradeAttributionWarehouseSyncPayload,
  PostTradeAttributionWarehouseSyncResponse,
  ResearchTaskWarehouseAuditResponse,
  ResearchTaskWarehouseLatestResponse,
  ResearchTaskWarehouseStatus,
  ResearchTaskWarehouseSyncPayload,
  ResearchTaskWarehouseSyncResponse,
  TradeTicketWarehouseLatestResponse,
  TradeTicketWarehouseSyncPayload,
  TradeTicketWarehouseSyncResponse,
} from "@/types/market";

export async function fetchMarketSources(): Promise<MarketSourcesResponse> {
  const response = await fetch("/api/v1/market/sources", {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`市場資料源讀取異常 (代碼: ${response.status})\n${errText}`);
  }

  return response.json();
}

export async function fetchBigQueryMarketStatus(): Promise<BigQueryMarketStatus> {
  const response = await fetch("/api/v1/market/bigquery/status", {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`BigQuery 狀態讀取異常 (代碼: ${response.status})\n${errText}`);
  }

  return response.json();
}

export async function fetchBigQueryMarketDiagnostics(): Promise<BigQueryMarketDiagnostics> {
  const response = await fetch("/api/v1/market/bigquery/diagnostics", {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`BigQuery 診斷讀取異常 (代碼: ${response.status})\n${errText}`);
  }

  return response.json();
}

export async function fetchResearchTaskWarehouseStatus(): Promise<ResearchTaskWarehouseStatus> {
  const response = await fetch("/api/v1/research/tasks/bigquery/status", {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`研究任務倉儲狀態讀取異常 (代碼: ${response.status})\n${errText}`);
  }

  return response.json();
}

export async function fetchLatestResearchTasksFromBigQuery(
  limit = 50,
  workspaceId = "default",
): Promise<ResearchTaskWarehouseLatestResponse> {
  const params = new URLSearchParams({
    limit: String(limit),
    workspace_id: workspaceId.trim() || "default",
  });
  const response = await fetch(`/api/v1/research/tasks/bigquery/latest?${params.toString()}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`研究任務 BigQuery 載入異常 (代碼: ${response.status})\n${errText}`);
  }

  return response.json();
}

export async function fetchResearchTaskSyncAudit(
  limit = 12,
  workspaceId = "default",
): Promise<ResearchTaskWarehouseAuditResponse> {
  const params = new URLSearchParams({
    limit: String(limit),
    workspace_id: workspaceId.trim() || "default",
  });
  const response = await fetch(`/api/v1/research/tasks/bigquery/audit?${params.toString()}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`研究任務同步稽核讀取異常 (代碼: ${response.status})\n${errText}`);
  }

  return response.json();
}

export async function syncResearchTasksToBigQuery(
  payload: ResearchTaskWarehouseSyncPayload,
): Promise<ResearchTaskWarehouseSyncResponse> {
  const response = await fetch("/api/v1/research/tasks/bigquery/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`研究任務 BigQuery 同步異常 (代碼: ${response.status})\n${errText}`);
  }

  return response.json();
}

export async function fetchLatestTradeTicketsFromBigQuery({
  limit = 100,
  workspaceId = "default",
  portfolioId = "",
  batchId = "",
}: {
  limit?: number;
  workspaceId?: string;
  portfolioId?: string;
  batchId?: string;
}): Promise<TradeTicketWarehouseLatestResponse> {
  const params = new URLSearchParams({
    limit: String(limit),
    workspace_id: workspaceId.trim() || "default",
  });
  if (portfolioId.trim()) params.set("portfolio_id", portfolioId.trim());
  if (batchId.trim()) params.set("batch_id", batchId.trim());

  const response = await fetch(`/api/v1/trading/tickets?${params.toString()}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`交易票 BigQuery 載入異常 (代碼: ${response.status})\n${errText}`);
  }

  return response.json();
}

export async function syncTradeTicketsToBigQuery(
  payload: TradeTicketWarehouseSyncPayload,
): Promise<TradeTicketWarehouseSyncResponse> {
  const response = await fetch("/api/v1/trading/tickets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`交易票 BigQuery 同步異常 (代碼: ${response.status})\n${errText}`);
  }

  return response.json();
}

export async function fetchLatestExecutionRoutesFromBigQuery({
  limit = 100,
  workspaceId = "default",
  portfolioId = "",
  batchId = "",
}: {
  limit?: number;
  workspaceId?: string;
  portfolioId?: string;
  batchId?: string;
}): Promise<ExecutionRouteWarehouseLatestResponse> {
  const params = new URLSearchParams({
    limit: String(limit),
    workspace_id: workspaceId.trim() || "default",
  });
  if (portfolioId.trim()) params.set("portfolio_id", portfolioId.trim());
  if (batchId.trim()) params.set("batch_id", batchId.trim());

  const response = await fetch(`/api/v1/trading/routes?${params.toString()}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`執行路由 BigQuery 載入異常 (代碼: ${response.status})\n${errText}`);
  }

  return response.json();
}

export async function syncExecutionRoutesToBigQuery(
  payload: ExecutionRouteWarehouseSyncPayload,
): Promise<ExecutionRouteWarehouseSyncResponse> {
  const response = await fetch("/api/v1/trading/routes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`執行路由 BigQuery 同步異常 (代碼: ${response.status})\n${errText}`);
  }

  return response.json();
}

export async function fetchLatestExecutionRouteEventsFromBigQuery({
  limit = 200,
  workspaceId = "default",
  portfolioId = "",
  batchId = "",
  routeId = "",
}: {
  limit?: number;
  workspaceId?: string;
  portfolioId?: string;
  batchId?: string;
  routeId?: string;
}): Promise<ExecutionRouteEventWarehouseLatestResponse> {
  const params = new URLSearchParams({
    limit: String(limit),
    workspace_id: workspaceId.trim() || "default",
  });
  if (portfolioId.trim()) params.set("portfolio_id", portfolioId.trim());
  if (batchId.trim()) params.set("batch_id", batchId.trim());
  if (routeId.trim()) params.set("route_id", routeId.trim());

  const response = await fetch(`/api/v1/trading/route-events?${params.toString()}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`路由事件 BigQuery 載入異常 (代碼: ${response.status})\n${errText}`);
  }

  return response.json();
}

export async function syncExecutionRouteEventsToBigQuery(
  payload: ExecutionRouteEventWarehouseSyncPayload,
): Promise<ExecutionRouteEventWarehouseSyncResponse> {
  const response = await fetch("/api/v1/trading/route-events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`路由事件 BigQuery 同步異常 (代碼: ${response.status})\n${errText}`);
  }

  return response.json();
}

export async function fetchLatestExecutionFillsFromBigQuery({
  limit = 100,
  workspaceId = "default",
  portfolioId = "",
  batchId = "",
}: {
  limit?: number;
  workspaceId?: string;
  portfolioId?: string;
  batchId?: string;
}): Promise<ExecutionFillWarehouseLatestResponse> {
  const params = new URLSearchParams({
    limit: String(limit),
    workspace_id: workspaceId.trim() || "default",
  });
  if (portfolioId.trim()) params.set("portfolio_id", portfolioId.trim());
  if (batchId.trim()) params.set("batch_id", batchId.trim());

  const response = await fetch(`/api/v1/trading/fills?${params.toString()}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`成交回報 BigQuery 載入異常 (代碼: ${response.status})\n${errText}`);
  }

  return response.json();
}

export async function syncExecutionFillsToBigQuery(
  payload: ExecutionFillWarehouseSyncPayload,
): Promise<ExecutionFillWarehouseSyncResponse> {
  const response = await fetch("/api/v1/trading/fills", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`成交回報 BigQuery 同步異常 (代碼: ${response.status})\n${errText}`);
  }

  return response.json();
}

export async function fetchLatestPostTradeAttributionsFromBigQuery({
  limit = 100,
  workspaceId = "default",
  portfolioId = "",
  batchId = "",
}: {
  limit?: number;
  workspaceId?: string;
  portfolioId?: string;
  batchId?: string;
}): Promise<PostTradeAttributionWarehouseLatestResponse> {
  const params = new URLSearchParams({
    limit: String(limit),
    workspace_id: workspaceId.trim() || "default",
  });
  if (portfolioId.trim()) params.set("portfolio_id", portfolioId.trim());
  if (batchId.trim()) params.set("batch_id", batchId.trim());

  const response = await fetch(`/api/v1/trading/post-trade-attribution?${params.toString()}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`交易後歸因 BigQuery 載入異常 (代碼: ${response.status})\n${errText}`);
  }

  return response.json();
}

export async function syncPostTradeAttributionsToBigQuery(
  payload: PostTradeAttributionWarehouseSyncPayload,
): Promise<PostTradeAttributionWarehouseSyncResponse> {
  const response = await fetch("/api/v1/trading/post-trade-attribution", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`交易後歸因 BigQuery 同步異常 (代碼: ${response.status})\n${errText}`);
  }

  return response.json();
}

export async function fetchLatestPlatformExceptionsFromBigQuery({
  limit = 100,
  workspaceId = "default",
  portfolioId = "",
  batchId = "",
}: {
  limit?: number;
  workspaceId?: string;
  portfolioId?: string;
  batchId?: string;
}): Promise<PlatformExceptionWarehouseLatestResponse> {
  const params = new URLSearchParams({
    limit: String(limit),
    workspace_id: workspaceId.trim() || "default",
  });
  if (portfolioId.trim()) params.set("portfolio_id", portfolioId.trim());
  if (batchId.trim()) params.set("batch_id", batchId.trim());

  const response = await fetch(`/api/v1/trading/platform-exceptions?${params.toString()}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`例外事項 BigQuery 載入異常 (代碼: ${response.status})\n${errText}`);
  }

  return response.json();
}

export async function syncPlatformExceptionsToBigQuery(
  payload: PlatformExceptionWarehouseSyncPayload,
): Promise<PlatformExceptionWarehouseSyncResponse> {
  const response = await fetch("/api/v1/trading/platform-exceptions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`例外事項 BigQuery 同步異常 (代碼: ${response.status})\n${errText}`);
  }

  return response.json();
}

export async function fetchBigQueryAssets(query = "", limit = 20): Promise<BigQueryAssetSearchResponse> {
  const params = new URLSearchParams({
    limit: String(limit),
  });
  if (query.trim()) {
    params.set("q", query.trim());
  }

  const response = await fetch(`/api/v1/market/bigquery/assets?${params.toString()}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`BigQuery 商品搜尋異常 (代碼: ${response.status})\n${errText}`);
  }

  return response.json();
}

export async function fetchBigQueryAssetProfile(
  symbol: string,
  priceBasis: "adjusted" | "raw" = "adjusted",
): Promise<BigQueryAssetProfileResponse> {
  const cleanSymbol = symbol.trim();
  const params = new URLSearchParams({
    price_basis: priceBasis,
    recent_limit: "30",
  });

  const response = await fetch(`/api/v1/market/bigquery/assets/${encodeURIComponent(cleanSymbol)}?${params.toString()}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`BigQuery 商品詳情讀取異常 (代碼: ${response.status})\n${errText}`);
  }

  return response.json();
}

export async function fetchBigQueryAssetHistory(
  symbol: string,
  priceBasis: "adjusted" | "raw" = "adjusted",
  options: { startDate?: string; endDate?: string; limit?: number } = {},
): Promise<BigQueryAssetHistoryResponse> {
  const cleanSymbol = symbol.trim();
  const params = new URLSearchParams({
    price_basis: priceBasis,
    limit: String(options.limit ?? 365),
  });
  if (options.startDate) {
    params.set("start_date", options.startDate);
  }
  if (options.endDate) {
    params.set("end_date", options.endDate);
  }

  const response = await fetch(`/api/v1/market/bigquery/assets/${encodeURIComponent(cleanSymbol)}/history?${params.toString()}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`BigQuery 歷史資料讀取異常 (代碼: ${response.status})\n${errText}`);
  }

  return response.json();
}

export async function analyzePortfolioFromBigQuery(
  payload: PortfolioAnalyzeBigQueryPayload,
): Promise<PortfolioAnalysisResponse> {
  const response = await fetch("/api/v1/portfolio/analyze-bigquery", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`BigQuery 投組分析異常 (代碼: ${response.status})\n${errText}`);
  }

  return response.json();
}

export async function optimizePortfolioFromBigQuery(
  payload: PortfolioOptimizeBigQueryPayload,
): Promise<PortfolioOptimizationResponse> {
  const response = await fetch("/api/v1/portfolio/optimize-bigquery", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`BigQuery AI 調倉異常 (代碼: ${response.status})\n${errText}`);
  }

  return response.json();
}
