import { useCallback, useMemo, useState } from "react";
import { DEFAULT_TAX_PARAMS } from "@/lib/taxParams";
import type { TaxParams } from "@/types/wealth";

export function useTaxParamsState() {
  const [taxParams, setTaxParams] = useState<TaxParams>(DEFAULT_TAX_PARAMS);

  const updateTaxParam = useCallback((key: string, value: number) => {
    setTaxParams((prev) => ({ ...prev, [key]: value }));
  }, []);

  return useMemo(() => ({
    taxParams,
    updateTaxParam,
  }), [taxParams, updateTaxParam]);
}
