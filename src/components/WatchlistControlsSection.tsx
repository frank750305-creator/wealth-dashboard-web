import {
  parseSymbolList,
  type AssetComparisonRow,
  type AssetComparisonSortKey,
  type AssetDecisionSignal,
} from "@/lib/assetResearchWorkflow";
import type { BigQueryAsset } from "@/types/market";

type AssetPriceBasis = "adjusted" | "raw";

type WatchlistPreset = {
  id: string;
  name: string;
  updatedAt: string;
};

type WatchlistControlsSectionProps = {
  comparisonRows: AssetComparisonRow[];
  visibleComparisonRows: AssetComparisonRow[];
  watchlistMemoCopyStatus: "idle" | "copied";
  onExportAssetComparisonMemo: () => void;
  onCopyAssetComparisonMemo: () => void | Promise<void>;
  onExportAssetComparisonCsv: () => void;
  onCompareAssets: () => void | Promise<void>;
  hasBigQueryCredentials: boolean;
  isLoadingComparison: boolean;
  isSearchingAssets: boolean;
  assetQuery: string;
  onAssetQueryChange: (value: string) => void;
  assetSuggestions: BigQueryAsset[];
  availableSymbols: string[];
  onSearchAssets: () => void | Promise<void>;
  onAppendComparisonSymbol: (symbol: string) => void;
  comparisonSymbols: string;
  onComparisonSymbolsChange: (value: string) => void;
  assetPriceBasis: AssetPriceBasis;
  watchlistPresetName: string;
  onWatchlistPresetNameChange: (value: string) => void;
  selectedWatchlistPresetId: string;
  savedWatchlistPresets: WatchlistPreset[];
  onSelectedWatchlistPresetIdChange: (value: string) => void;
  onSaveWatchlistPreset: () => void;
  onLoadWatchlistPreset: () => void;
  onDeleteWatchlistPreset: () => void;
  comparisonSortKey: AssetComparisonSortKey;
  onComparisonSortKeyChange: (value: AssetComparisonSortKey) => void;
  comparisonSignalFilter: AssetDecisionSignal | "all";
  onComparisonSignalFilterChange: (value: AssetDecisionSignal | "all") => void;
  minimumComparisonScore: number;
  onMinimumComparisonScoreChange: (value: number) => void;
  comparisonError: string | null;
};

export function WatchlistControlsSection({
  comparisonRows,
  visibleComparisonRows,
  watchlistMemoCopyStatus,
  onExportAssetComparisonMemo,
  onCopyAssetComparisonMemo,
  onExportAssetComparisonCsv,
  onCompareAssets,
  hasBigQueryCredentials,
  isLoadingComparison,
  isSearchingAssets,
  assetQuery,
  onAssetQueryChange,
  assetSuggestions,
  availableSymbols,
  onSearchAssets,
  onAppendComparisonSymbol,
  comparisonSymbols,
  onComparisonSymbolsChange,
  assetPriceBasis,
  watchlistPresetName,
  onWatchlistPresetNameChange,
  selectedWatchlistPresetId,
  savedWatchlistPresets,
  onSelectedWatchlistPresetIdChange,
  onSaveWatchlistPreset,
  onLoadWatchlistPreset,
  onDeleteWatchlistPreset,
  comparisonSortKey,
  onComparisonSortKeyChange,
  comparisonSignalFilter,
  onComparisonSignalFilterChange,
  minimumComparisonScore,
  onMinimumComparisonScoreChange,
  comparisonError,
}: WatchlistControlsSectionProps) {
  const symbolCount = parseSymbolList(comparisonSymbols).length;

  return (
    <>
      <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-100">BigQuery Watchlist 比較</h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            批次比較多檔商品的報酬、波動、回撤與資料品質
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {comparisonRows.length ? (
            <>
              <button
                onClick={onExportAssetComparisonMemo}
                disabled={!visibleComparisonRows.length}
                className="px-3 py-2 text-xs font-bold rounded-md bg-emerald-700 hover:bg-emerald-600 text-white disabled:cursor-not-allowed disabled:bg-slate-900 disabled:text-slate-600"
              >
                Memo MD
              </button>
              <button
                onClick={() => void onCopyAssetComparisonMemo()}
                disabled={!visibleComparisonRows.length}
                className="px-3 py-2 text-xs font-bold rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100 disabled:cursor-not-allowed disabled:bg-slate-900 disabled:text-slate-600"
              >
                {watchlistMemoCopyStatus === "copied" ? "已複製" : "複製 Memo"}
              </button>
              <button
                onClick={onExportAssetComparisonCsv}
                className="px-3 py-2 text-xs font-bold rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100"
              >
                Watchlist CSV
              </button>
            </>
          ) : null}
          <button
            onClick={() => void onCompareAssets()}
            disabled={!hasBigQueryCredentials || isLoadingComparison || !symbolCount}
            className="px-3 py-2 text-xs font-bold rounded-md bg-cyan-700 hover:bg-cyan-600 text-white disabled:cursor-not-allowed disabled:bg-slate-900 disabled:text-slate-600"
          >
            {isLoadingComparison ? "比較中" : "比較商品"}
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-cyan-900/40 bg-cyan-950/10 p-3 space-y-2">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
          <div>
            <p className="text-xs font-bold text-cyan-100">選擇投資標的</p>
            <p className="mt-0.5 text-[11px] text-slate-500">可手動輸入，也可搜尋 BigQuery 後用下拉加入。</p>
          </div>
          <span className="rounded bg-slate-950 px-2 py-1 text-[10px] font-mono text-slate-400">
            {symbolCount}/12 symbols
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_auto_auto] gap-2 text-xs">
          <input
            value={assetQuery}
            onChange={(event) => onAssetQueryChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                onAppendComparisonSymbol(assetQuery);
              }
            }}
            list="watchlist-symbol-options"
            placeholder="輸入代號，例如 0050.TW"
            className="min-w-0 rounded-md border border-slate-800 bg-slate-950 px-3 py-2 font-mono text-slate-100 outline-none placeholder:text-slate-700 focus:border-cyan-600"
          />
          <datalist id="watchlist-symbol-options">
            {availableSymbols.map((symbol) => (
              <option key={symbol} value={symbol} />
            ))}
          </datalist>
          <select
            value=""
            onChange={(event) => {
              if (event.target.value) onAppendComparisonSymbol(event.target.value);
            }}
            disabled={!availableSymbols.length || symbolCount >= 12}
            className="min-w-0 rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-slate-100 disabled:cursor-not-allowed disabled:text-slate-600"
          >
            <option value="">從 BigQuery 加入</option>
            {availableSymbols.map((symbol) => (
              <option key={symbol} value={symbol}>
                {symbol}
              </option>
            ))}
          </select>
          <select
            value=""
            onChange={(event) => {
              if (event.target.value) onAppendComparisonSymbol(event.target.value);
            }}
            disabled={!assetSuggestions.length}
            className="min-w-0 rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-slate-100 disabled:cursor-not-allowed disabled:text-slate-600"
          >
            <option value="">從搜尋結果加入</option>
            {assetSuggestions.map((asset) => (
              <option key={asset.symbol} value={asset.symbol}>
                {asset.symbol} · {asset.latest_date ?? "--"} · {asset.row_count.toLocaleString("zh-TW")} 筆
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => void onSearchAssets()}
            disabled={!hasBigQueryCredentials || isSearchingAssets || !assetQuery.trim()}
            className="rounded-md bg-slate-800 px-3 py-2 font-bold text-slate-100 hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-900 disabled:text-slate-600"
          >
            {isSearchingAssets ? "搜尋中" : "搜尋"}
          </button>
          <button
            type="button"
            onClick={() => onAppendComparisonSymbol(assetQuery)}
            disabled={!assetQuery.trim() || symbolCount >= 12}
            className="rounded-md bg-cyan-700 px-3 py-2 font-bold text-white hover:bg-cyan-600 disabled:cursor-not-allowed disabled:bg-slate-900 disabled:text-slate-600"
          >
            加入
          </button>
        </div>
      </div>

      <textarea
        value={comparisonSymbols}
        onChange={(event) => onComparisonSymbolsChange(event.target.value)}
        rows={3}
        placeholder="0050.TW SPY QQQ"
        className="w-full resize-y rounded-md border border-slate-800 bg-slate-900 px-3 py-2 font-mono text-xs text-slate-100 outline-none placeholder:text-slate-700 focus:border-cyan-600"
      />
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
        <span>最多比較 12 檔；可用空白、逗號或換行分隔</span>
        <span className="font-mono">
          {symbolCount} symbols · {assetPriceBasis}
        </span>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[0.8fr_1.2fr] gap-2 rounded-lg border border-slate-800 bg-slate-900/60 p-3 text-xs">
        <label className="space-y-1">
          <span className="text-slate-500">Watchlist 名稱</span>
          <input
            value={watchlistPresetName}
            onChange={(event) => onWatchlistPresetNameChange(event.target.value)}
            className="w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-slate-100"
          />
        </label>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto_auto] gap-2">
          <label className="space-y-1">
            <span className="text-slate-500">已存 Watchlist</span>
            <select
              value={selectedWatchlistPresetId}
              onChange={(event) => {
                const preset = savedWatchlistPresets.find((item) => item.id === event.target.value);
                onSelectedWatchlistPresetIdChange(event.target.value);
                if (preset) onWatchlistPresetNameChange(preset.name);
              }}
              className="w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-slate-100"
            >
              <option value="">尚未選擇</option>
              {savedWatchlistPresets.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.name} · {new Date(preset.updatedAt).toLocaleDateString("zh-TW")}
                </option>
              ))}
            </select>
          </label>
          <button
            onClick={onSaveWatchlistPreset}
            className="md:self-end px-3 py-2 rounded-md bg-emerald-700 hover:bg-emerald-600 text-white font-bold"
          >
            儲存
          </button>
          <button
            onClick={onLoadWatchlistPreset}
            disabled={!selectedWatchlistPresetId}
            className="md:self-end px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold disabled:cursor-not-allowed disabled:text-slate-600"
          >
            載入
          </button>
          <button
            onClick={onDeleteWatchlistPreset}
            disabled={!selectedWatchlistPresetId}
            className="md:self-end px-3 py-2 rounded-md border border-slate-700 bg-slate-950 text-slate-300 hover:border-rose-500 hover:text-rose-300 font-bold disabled:cursor-not-allowed disabled:text-slate-700"
          >
            刪除
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1.2fr] gap-2 text-xs">
        <label className="space-y-1">
          <span className="text-slate-500">排序</span>
          <select
            value={comparisonSortKey}
            onChange={(event) => onComparisonSortKeyChange(event.target.value as AssetComparisonSortKey)}
            className="w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-slate-100"
          >
            <option value="score">分數高到低</option>
            <option value="annualizedReturn">年化報酬高到低</option>
            <option value="riskAdjustedReturn">風險調整報酬高到低</option>
            <option value="annualizedVolatility">波動低到高</option>
            <option value="maxDrawdown">回撤低到高</option>
            <option value="freshnessDays">資料新鮮優先</option>
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-slate-500">訊號</span>
          <select
            value={comparisonSignalFilter}
            onChange={(event) => onComparisonSignalFilterChange(event.target.value as AssetDecisionSignal | "all")}
            className="w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-slate-100"
          >
            <option value="all">全部</option>
            <option value="candidate">候選</option>
            <option value="watch">觀察</option>
            <option value="neutral">中性</option>
            <option value="risk">風險</option>
          </select>
        </label>
        <label className="space-y-1">
          <span className="flex items-center justify-between gap-2 text-slate-500">
            <span>最低分數</span>
            <span className="font-mono text-slate-400">{minimumComparisonScore}</span>
          </span>
          <input
            type="range"
            min={0}
            max={90}
            step={5}
            value={minimumComparisonScore}
            onChange={(event) => onMinimumComparisonScoreChange(Number(event.target.value))}
            className="w-full accent-cyan-500"
          />
        </label>
      </div>

      {comparisonError ? (
        <div className="border border-red-900/60 bg-red-950/30 rounded-lg p-3 text-xs text-red-300 whitespace-pre-wrap">
          {comparisonError}
        </div>
      ) : null}
    </>
  );
}
