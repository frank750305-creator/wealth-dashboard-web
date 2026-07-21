import { formatCount, formatPrice, qualityBadgeClass, qualityClass, qualityLabel, type QualityStatus } from "@/lib/assetResearchWorkflow";
import type { BigQueryAsset, BigQueryAssetHistoryResponse, BigQueryAssetProfileResponse } from "@/types/market";

type AssetPriceBasis = "adjusted" | "raw";

type AssetProfileQualityCard = {
  label: string;
  value: string;
  status: QualityStatus;
  note: string;
};

type AssetProfileSectionProps = {
  assetQuery: string;
  onAssetQueryChange: (value: string) => void;
  assetPriceBasis: AssetPriceBasis;
  onAssetPriceBasisChange: (value: AssetPriceBasis) => void;
  hasBigQueryCredentials: boolean;
  isSearchingAssets: boolean;
  isLoadingAssetProfile: boolean;
  onSearchAssets: () => void;
  onLoadAssetProfile: (symbol?: string) => void | Promise<void>;
  assetPanelError: string | null;
  assetSuggestions: BigQueryAsset[];
  assetProfile: BigQueryAssetProfileResponse | null;
  assetHistory: BigQueryAssetHistoryResponse | null;
  assetHistoryStartDate: string;
  assetHistoryEndDate: string;
  assetHistoryLimit: number;
  onAssetHistoryStartDateChange: (value: string) => void;
  onAssetHistoryEndDateChange: (value: string) => void;
  onAssetHistoryLimitChange: (value: number) => void;
  assetProfileQualityCards: AssetProfileQualityCard[];
  onExportAssetProfileCsv: () => void;
  onExportAssetResearchReport: () => void;
};

function formatPercent(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? `${(value * 100).toFixed(2)}%` : "--";
}

export function AssetProfileSection({
  assetQuery,
  onAssetQueryChange: setAssetQuery,
  assetPriceBasis,
  onAssetPriceBasisChange: setAssetPriceBasis,
  hasBigQueryCredentials,
  isSearchingAssets,
  isLoadingAssetProfile,
  onSearchAssets: handleSearchAssets,
  onLoadAssetProfile: handleLoadAssetProfile,
  assetPanelError,
  assetSuggestions,
  assetProfile,
  assetHistory,
  assetHistoryStartDate,
  assetHistoryEndDate,
  assetHistoryLimit,
  onAssetHistoryStartDateChange: setAssetHistoryStartDate,
  onAssetHistoryEndDateChange: setAssetHistoryEndDate,
  onAssetHistoryLimitChange: setAssetHistoryLimit,
  assetProfileQualityCards,
  onExportAssetProfileCsv: handleExportAssetProfileCsv,
  onExportAssetResearchReport: handleExportAssetResearchReport,
}: AssetProfileSectionProps) {
  return (
        <section className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-4">
          <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-100">BigQuery 商品主檔</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                單一商品價格、報酬、波動、回撤與資料完整度
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-[1fr_110px_140px_140px_110px_auto_auto] gap-2 text-xs xl:min-w-[980px]">
              <input
                value={assetQuery}
                onChange={(event) => setAssetQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    void handleLoadAssetProfile();
                  }
                }}
                placeholder="0050.TW"
                className="min-w-0 bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-slate-100 font-mono outline-none focus:border-cyan-600"
              />
              <select
                value={assetPriceBasis}
                onChange={(event) => setAssetPriceBasis(event.target.value as "adjusted" | "raw")}
                className="bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-slate-100"
              >
                <option value="adjusted">Adj</option>
                <option value="raw">Raw</option>
              </select>
              <input
                type="date"
                value={assetHistoryStartDate}
                onChange={(event) => setAssetHistoryStartDate(event.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-slate-100 outline-none focus:border-cyan-600"
              />
              <input
                type="date"
                value={assetHistoryEndDate}
                onChange={(event) => setAssetHistoryEndDate(event.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-slate-100 outline-none focus:border-cyan-600"
              />
              <select
                value={assetHistoryLimit}
                onChange={(event) => setAssetHistoryLimit(Number(event.target.value))}
                className="bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-slate-100"
              >
                <option value={120}>120 筆</option>
                <option value={365}>365 筆</option>
                <option value={730}>730 筆</option>
                <option value={1000}>1000 筆</option>
              </select>
              <button
                onClick={handleSearchAssets}
                disabled={!hasBigQueryCredentials || isSearchingAssets || !assetQuery.trim()}
                className="px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold disabled:cursor-not-allowed disabled:bg-slate-900 disabled:text-slate-600"
              >
                {isSearchingAssets ? "搜尋中" : "搜尋"}
              </button>
              <button
                onClick={() => handleLoadAssetProfile()}
                disabled={!hasBigQueryCredentials || isLoadingAssetProfile || !assetQuery.trim()}
                className="px-3 py-2 rounded-md bg-cyan-700 hover:bg-cyan-600 text-white font-bold disabled:cursor-not-allowed disabled:bg-slate-900 disabled:text-slate-600"
              >
                {isLoadingAssetProfile ? "讀取中" : "讀取商品"}
              </button>
            </div>
          </div>

          {assetPanelError ? (
            <div className="border border-red-900/60 bg-red-950/30 rounded-lg p-3 text-xs text-red-300 whitespace-pre-wrap">
              {assetPanelError}
            </div>
          ) : null}

          {assetSuggestions.length ? (
            <div className="flex flex-wrap gap-2">
              {assetSuggestions.map((asset) => (
                <button
                  key={asset.symbol}
                  onClick={() => handleLoadAssetProfile(asset.symbol)}
                  className="max-w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-left text-xs hover:border-cyan-600"
                >
                  <span className="block font-bold text-cyan-200">{asset.symbol}</span>
                  <span className="block text-[11px] text-slate-500">
                    {asset.first_date ?? "--"} ~ {asset.latest_date ?? "--"} · {formatCount(asset.row_count)} rows
                  </span>
                </button>
              ))}
            </div>
          ) : null}

          {assetProfile ? (
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-t border-slate-900 pt-4">
                <div>
                  <p className="text-sm font-bold text-cyan-200">{assetProfile.symbol}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {assetProfile.summary.first_date ?? "--"} ~ {assetProfile.summary.latest_date ?? "--"} · {assetProfile.priceBasis}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={handleExportAssetProfileCsv}
                    className="px-3 py-2 text-xs font-bold rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100"
                  >
                    商品 CSV
                  </button>
                  <button
                    onClick={handleExportAssetResearchReport}
                    className="px-3 py-2 text-xs font-bold rounded-md bg-cyan-700 hover:bg-cyan-600 text-white"
                  >
                    研究 Memo
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-2 text-xs">
                {assetProfileQualityCards.map((card) => (
                  <div key={card.label} className={`rounded-lg border p-3 min-w-0 ${qualityClass(card.status)}`}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] text-slate-500 truncate">{card.label}</p>
                      <span className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-bold ${qualityBadgeClass(card.status)}`}>
                        {qualityLabel(card.status)}
                      </span>
                    </div>
                    <p className="mt-2 font-mono text-sm font-bold text-slate-100 truncate" title={card.value}>
                      {card.value}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">{card.note}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-2 text-xs">
                {[
                  ["最新價格", formatPrice(assetProfile.metrics.latestPrice)],
                  ["年化報酬", formatPercent(assetProfile.metrics.annualizedReturn)],
                  ["勝率", formatPercent(assetProfile.metrics.positiveDayRatio)],
                  ["最佳單日", formatPercent(assetProfile.metrics.bestDay)],
                  ["最差單日", formatPercent(assetProfile.metrics.worstDay)],
                  ["最新日報酬", formatPercent(assetProfile.metrics.latestDailyReturn)],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-md border border-slate-800 bg-slate-900/60 p-3 min-w-0">
                    <p className="text-[11px] text-slate-600 truncate">{label}</p>
                    <p className="mt-1 font-mono text-sm font-bold text-slate-100 truncate" title={value}>
                      {value}
                    </p>
                  </div>
                ))}
              </div>

              {assetHistory ? (
                <section className="rounded-lg border border-slate-800 bg-slate-900/40 p-4 space-y-4">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-bold text-slate-100">歷史資料 Drill-down</h4>
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        {assetHistory.summary.first_date ?? "--"} ~ {assetHistory.summary.latest_date ?? "--"} · {formatCount(assetHistory.summary.row_count)} rows
                      </p>
                    </div>
                    <div className={`rounded-md border px-3 py-2 text-right ${qualityClass(assetHistory.quality.status)}`}>
                      <p className="text-[10px] text-slate-500">History Score</p>
                      <p className="font-mono text-lg font-bold text-slate-100">{assetHistory.quality.score}</p>
                      <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${qualityBadgeClass(assetHistory.quality.status)}`}>
                        {qualityLabel(assetHistory.quality.status)}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-2 text-xs">
                    {[
                      ["期初價格", formatPrice(assetHistory.metrics.firstPrice)],
                      ["期末價格", formatPrice(assetHistory.metrics.latestPrice)],
                      ["期間報酬", formatPercent(assetHistory.metrics.totalReturn)],
                      ["年化報酬", formatPercent(assetHistory.metrics.annualizedReturn)],
                      ["年化波動", formatPercent(assetHistory.metrics.annualizedVolatility)],
                      ["最大回撤", formatPercent(assetHistory.metrics.maxDrawdown)],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-md border border-slate-800 bg-slate-950/70 p-3 min-w-0">
                        <p className="text-[11px] text-slate-600 truncate">{label}</p>
                        <p className="mt-1 font-mono text-sm font-bold text-slate-100 truncate" title={value}>
                          {value}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2 text-xs">
                    {assetHistory.quality.checks.map((check) => (
                      <div key={check.id} className={`rounded-md border p-3 min-w-0 ${qualityClass(check.status)}`}>
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-bold text-slate-200 truncate">{check.label}</p>
                          <span className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-bold ${qualityBadgeClass(check.status)}`}>
                            {check.score}
                          </span>
                        </div>
                        <p className="mt-2 font-mono text-[11px] text-slate-400 truncate" title={check.evidence}>
                          {check.evidence}
                        </p>
                        <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">{check.action}</p>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 text-xs">
                    <div className="rounded-md border border-slate-800 bg-slate-950/60 p-3">
                      <p className="text-[11px] font-bold text-slate-400">品質提醒</p>
                      <div className="mt-2 space-y-1 text-slate-500">
                        {(assetHistory.quality.warnings.length ? assetHistory.quality.warnings : ["目前沒有明顯阻塞項"]).map((item) => (
                          <p key={item}>{item}</p>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-md border border-slate-800 bg-slate-950/60 p-3">
                      <p className="text-[11px] font-bold text-slate-400">下一步</p>
                      <div className="mt-2 space-y-1 text-slate-500">
                        {assetHistory.quality.nextActions.map((item) => (
                          <p key={item}>{item}</p>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[680px] text-xs">
                      <thead>
                        <tr className="text-left text-[11px] text-slate-600">
                          <th className="py-2 pr-3 font-medium">Date</th>
                          <th className="py-2 px-3 font-medium text-right">Selected</th>
                          <th className="py-2 px-3 font-medium text-right">Adj</th>
                          <th className="py-2 px-3 font-medium text-right">Raw</th>
                          <th className="py-2 pl-3 font-medium text-right">Daily Return</th>
                        </tr>
                      </thead>
                      <tbody>
                        {assetHistory.prices.slice(-20).reverse().map((point) => (
                          <tr key={point.date} className="border-t border-slate-900">
                            <td className="py-2 pr-3 font-mono text-slate-300">{point.date ?? "--"}</td>
                            <td className="py-2 px-3 text-right font-mono text-cyan-200">{formatPrice(point.selected_price)}</td>
                            <td className="py-2 px-3 text-right font-mono text-slate-400">{formatPrice(point.adj_price)}</td>
                            <td className="py-2 px-3 text-right font-mono text-slate-400">{formatPrice(point.raw_price)}</td>
                            <td
                              className={`py-2 pl-3 text-right font-mono ${
                                typeof point.daily_return === "number" && point.daily_return < 0
                                  ? "text-rose-300"
                                  : "text-emerald-300"
                              }`}
                            >
                              {formatPercent(point.daily_return)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              ) : null}

              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] text-xs">
                  <thead>
                    <tr className="text-left text-[11px] text-slate-600">
                      <th className="py-2 pr-3 font-medium">Date</th>
                      <th className="py-2 px-3 font-medium text-right">Selected</th>
                      <th className="py-2 px-3 font-medium text-right">Adj</th>
                      <th className="py-2 px-3 font-medium text-right">Raw</th>
                      <th className="py-2 pl-3 font-medium text-right">Daily Return</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assetProfile.recentPrices.slice().reverse().map((point) => (
                      <tr key={point.date} className="border-t border-slate-900">
                        <td className="py-2 pr-3 font-mono text-slate-300">{point.date ?? "--"}</td>
                        <td className="py-2 px-3 text-right font-mono text-cyan-200">{formatPrice(point.selected_price)}</td>
                        <td className="py-2 px-3 text-right font-mono text-slate-400">{formatPrice(point.adj_price)}</td>
                        <td className="py-2 px-3 text-right font-mono text-slate-400">{formatPrice(point.raw_price)}</td>
                        <td
                          className={`py-2 pl-3 text-right font-mono ${
                            typeof point.daily_return === "number" && point.daily_return < 0
                              ? "text-rose-300"
                              : "text-emerald-300"
                          }`}
                        >
                          {formatPercent(point.daily_return)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="border border-dashed border-slate-800 rounded-lg p-4 text-xs text-slate-500">
              選擇商品後，這裡會顯示單一商品的資料主檔與價格品質。
            </div>
          )}
        </section>

  );
}
