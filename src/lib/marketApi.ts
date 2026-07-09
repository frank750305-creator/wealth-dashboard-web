import type {
  BigQueryMarketStatus,
  MarketSourcesResponse,
  PortfolioAnalysisResponse,
  PortfolioAnalyzeBigQueryPayload,
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
