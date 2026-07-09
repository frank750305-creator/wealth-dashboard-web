import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchMarketSources } from "@/lib/marketApi";
import type { MarketSourcesResponse } from "@/types/market";

export function useMarketSources() {
  const [data, setData] = useState<MarketSourcesResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadSources = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchMarketSources();
      setData(result);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;

    async function loadInitialSources() {
      try {
        const result = await fetchMarketSources();
        if (!ignore) setData(result);
      } catch (err: unknown) {
        if (!ignore) setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }

    void loadInitialSources();

    return () => {
      ignore = true;
    };
  }, []);

  return useMemo(() => ({
    data,
    error,
    isLoading,
    reload: loadSources,
  }), [data, error, isLoading, loadSources]);
}
