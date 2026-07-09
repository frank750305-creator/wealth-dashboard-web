import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchBigQueryMarketStatus, fetchMarketSources } from "@/lib/marketApi";
import type { BigQueryMarketStatus, MarketSourcesResponse } from "@/types/market";

export function useMarketSources() {
  const [data, setData] = useState<MarketSourcesResponse | null>(null);
  const [bigQueryStatus, setBigQueryStatus] = useState<BigQueryMarketStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [bigQueryError, setBigQueryError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadSources = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setBigQueryError(null);

    try {
      const [sourcesResult, statusResult] = await Promise.allSettled([
        fetchMarketSources(),
        fetchBigQueryMarketStatus(),
      ]);

      if (sourcesResult.status === "fulfilled") {
        setData(sourcesResult.value);
      } else {
        setError(sourcesResult.reason instanceof Error ? sourcesResult.reason.message : String(sourcesResult.reason));
      }

      if (statusResult.status === "fulfilled") {
        setBigQueryStatus(statusResult.value);
      } else {
        setBigQueryError(statusResult.reason instanceof Error ? statusResult.reason.message : String(statusResult.reason));
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;

    async function loadInitialSources() {
      const [sourcesResult, statusResult] = await Promise.allSettled([
        fetchMarketSources(),
        fetchBigQueryMarketStatus(),
      ]);

      if (ignore) return;

      if (sourcesResult.status === "fulfilled") {
        setData(sourcesResult.value);
      } else {
        setError(sourcesResult.reason instanceof Error ? sourcesResult.reason.message : String(sourcesResult.reason));
      }

      if (statusResult.status === "fulfilled") {
        setBigQueryStatus(statusResult.value);
      } else {
        setBigQueryError(statusResult.reason instanceof Error ? statusResult.reason.message : String(statusResult.reason));
      }

      setIsLoading(false);
    }

    void loadInitialSources();

    return () => {
      ignore = true;
    };
  }, []);

  return useMemo(() => ({
    data,
    bigQueryStatus,
    error,
    bigQueryError,
    isLoading,
    reload: loadSources,
  }), [data, bigQueryStatus, error, bigQueryError, isLoading, loadSources]);
}
