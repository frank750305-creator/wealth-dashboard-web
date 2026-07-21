import type {
  BigQueryMarketStatus,
  BigQueryMarketDiagnostics,
  BigQueryAssetHistoryResponse,
  BigQueryAssetProfileResponse,
  BigQueryAssetSearchResponse,
  MarketSourcesResponse,
  PortfolioAnalysisResponse,
  PortfolioAnalyzeBigQueryPayload,
  PortfolioOptimizationResponse,
  PortfolioOptimizeBigQueryPayload,
  ResearchTaskWarehouseLatestResponse,
  ResearchTaskWarehouseStatus,
  ResearchTaskWarehouseSyncPayload,
  ResearchTaskWarehouseSyncResponse,
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
