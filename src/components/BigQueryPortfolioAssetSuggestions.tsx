import type { BigQueryAsset } from "@/types/market";

type BigQueryPortfolioAssetSuggestionsProps = {
  hasBigQueryCredentials: boolean;
  isLoadingAssets: boolean;
  assetSuggestions: BigQueryAsset[];
  assetSearchError: string | null;
  onApplyAssetSuggestion: (symbol: string) => void;
};

export function BigQueryPortfolioAssetSuggestions({
  hasBigQueryCredentials,
  isLoadingAssets,
  assetSuggestions,
  assetSearchError,
  onApplyAssetSuggestion,
}: BigQueryPortfolioAssetSuggestionsProps) {
  if (!hasBigQueryCredentials) return null;

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between gap-3 text-[11px]">
        <span className="text-slate-500">BigQuery 商品候選</span>
        <span className="text-slate-500 font-mono">
          {isLoadingAssets ? "搜尋中" : `${assetSuggestions.length} 筆`}
        </span>
      </div>
      {assetSearchError ? (
        <p className="text-[11px] text-red-300 whitespace-pre-wrap">{assetSearchError}</p>
      ) : assetSuggestions.length ? (
        <div className="flex flex-wrap gap-2">
          {assetSuggestions.slice(0, 8).map((asset) => (
            <button
              key={asset.symbol}
              onClick={() => onApplyAssetSuggestion(asset.symbol)}
              className="max-w-full min-w-0 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-left text-[11px] text-slate-200 hover:border-cyan-600"
            >
              <span className="block truncate font-bold text-cyan-200">{asset.symbol}</span>
              <span className="block truncate text-slate-500">{asset.latest_date ?? "--"}</span>
              <span className="block truncate text-slate-500">
                Adj {asset.adjusted_price_rows.toLocaleString("zh-TW")} · Raw{" "}
                {asset.raw_price_rows.toLocaleString("zh-TW")}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <p className="text-[11px] text-slate-500">查無候選</p>
      )}
    </div>
  );
}
