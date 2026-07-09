import type { MarketSourcesResponse } from "@/types/market";

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
