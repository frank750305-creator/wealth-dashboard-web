import {
  daysSinceDate,
  formatCount,
  freshnessStatus,
  qualityBadgeClass,
  qualityClass,
  qualityLabel,
  type QualityStatus,
} from "@/lib/assetResearchWorkflow";
import type {
  BigQueryFxCurrency,
  BigQueryMarketDiagnostics,
  BigQueryQualityScorecard,
  BigQueryStaleSymbol,
} from "@/types/market";

type DiagnosticCard = {
  label: string;
  value: string;
  status: QualityStatus;
  note: string;
};

type BigQueryQualityCardGridProps = {
  qualityCards: DiagnosticCard[];
  issueCards: DiagnosticCard[];
};

type BigQueryWarehouseSnapshotSectionProps = {
  bigQueryDiagnostics: BigQueryMarketDiagnostics;
  fxFreshnessDays: number | null;
  staleSymbols: BigQueryStaleSymbol[];
  fxCurrencies: BigQueryFxCurrency[];
};

type BigQueryQualityScorecardProps = {
  scorecard: BigQueryQualityScorecard | undefined;
};

function qualityScoreWidth(score: number) {
  if (!Number.isFinite(score)) return "0%";
  return `${Math.max(0, Math.min(score, 100)).toFixed(0)}%`;
}

function qualityLevelLabel(level: string) {
  if (level === "production_ready") return "可放行";
  if (level === "watchlist") return "觀察";
  if (level === "blocked") return "阻擋";
  return level || "--";
}

export function BigQueryQualityCardGrid({
  qualityCards,
  issueCards,
}: BigQueryQualityCardGridProps) {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-2 text-xs">
        {qualityCards.map((card) => (
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
        {issueCards.map((card) => (
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
    </>
  );
}

export function BigQueryQualityScorecard({
  scorecard,
}: BigQueryQualityScorecardProps) {
  if (!scorecard) return null;

  return (
    <div className={`rounded-lg border p-3 ${qualityClass(scorecard.status)}`}>
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-xs font-bold text-slate-100">Data Quality Scorecard</p>
            <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${qualityBadgeClass(scorecard.status)}`}>
              {qualityLabel(scorecard.status)}
            </span>
            <span className="rounded border border-slate-700 bg-slate-900 px-2 py-0.5 text-[10px] font-bold text-slate-300">
              {qualityLevelLabel(scorecard.level)}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">{scorecard.summary}</p>
        </div>
        <div className="lg:w-56">
          <div className="flex items-end justify-between gap-3">
            <span className="font-mono text-3xl font-bold text-slate-100">{scorecard.overallScore}</span>
            <span className="pb-1 text-[11px] text-slate-500">/ 100</span>
          </div>
          <div className="mt-2 h-2 rounded-full bg-slate-900 overflow-hidden">
            <div
              className={`h-full rounded-full ${
                scorecard.status === "strong"
                  ? "bg-emerald-400"
                  : scorecard.status === "watch"
                    ? "bg-amber-400"
                    : "bg-rose-400"
              }`}
              style={{ width: qualityScoreWidth(scorecard.overallScore) }}
            />
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-2 text-xs">
        {scorecard.dimensions.map((dimension) => (
          <div key={dimension.id} className="rounded-md border border-slate-800 bg-slate-950/70 p-2 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] text-slate-500 truncate">{dimension.label}</p>
              <span className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-bold ${qualityBadgeClass(dimension.status)}`}>
                {dimension.score}
              </span>
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-slate-900 overflow-hidden">
              <div className="h-full rounded-full bg-cyan-400" style={{ width: qualityScoreWidth(dimension.score) }} />
            </div>
            <p className="mt-2 text-[11px] text-slate-400 truncate" title={dimension.evidence}>
              {dimension.evidence}
            </p>
            <p className="mt-1 text-[11px] text-slate-600 truncate" title={dimension.action}>
              {dimension.action}
            </p>
          </div>
        ))}
      </div>

      {(scorecard.blockers.length || scorecard.nextActions.length) ? (
        <div className="mt-3 grid grid-cols-1 lg:grid-cols-2 gap-2 text-xs">
          <div className="rounded-md border border-slate-800 bg-slate-950/70 p-2">
            <p className="text-[11px] font-bold text-slate-300">阻擋項</p>
            <div className="mt-2 space-y-1 text-[11px] text-slate-500">
              {(scorecard.blockers.length ? scorecard.blockers : ["目前沒有 block 項目"]).map((item) => (
                <p key={item} className="truncate" title={item}>
                  {item}
                </p>
              ))}
            </div>
          </div>
          <div className="rounded-md border border-slate-800 bg-slate-950/70 p-2">
            <p className="text-[11px] font-bold text-slate-300">下一步</p>
            <div className="mt-2 space-y-1 text-[11px] text-slate-500">
              {scorecard.nextActions.map((item) => (
                <p key={item} className="truncate" title={item}>
                  {item}
                </p>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function BigQueryWarehouseSnapshotSection({
  bigQueryDiagnostics,
  fxFreshnessDays,
  staleSymbols,
  fxCurrencies,
}: BigQueryWarehouseSnapshotSectionProps) {
  return (
    <>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 text-xs">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="font-bold text-slate-200">daily_prices</p>
            <span
              className={`rounded px-2 py-0.5 text-[10px] font-bold ${qualityBadgeClass(
                bigQueryDiagnostics.schemaChecks.priceTable.isReady ? "strong" : "risk",
              )}`}
            >
              {bigQueryDiagnostics.schemaChecks.priceTable.isReady ? "Ready" : "Missing"}
            </span>
          </div>
          <dl className="grid grid-cols-2 gap-2">
            <div>
              <dt className="text-slate-500">期間</dt>
              <dd className="mt-0.5 font-mono text-slate-100">
                {bigQueryDiagnostics.priceSummary.first_date ?? "--"} ~ {bigQueryDiagnostics.priceSummary.latest_date ?? "--"}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">商品數</dt>
              <dd className="mt-0.5 font-mono text-slate-100">
                {formatCount(bigQueryDiagnostics.priceSummary.symbol_count)}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">總筆數</dt>
              <dd className="mt-0.5 font-mono text-slate-100">
                {formatCount(bigQueryDiagnostics.priceSummary.row_count)}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Adj / Raw</dt>
              <dd className="mt-0.5 font-mono text-slate-100">
                {formatCount(bigQueryDiagnostics.priceSummary.adjusted_price_rows)} / {formatCount(bigQueryDiagnostics.priceSummary.raw_price_rows)}
              </dd>
            </div>
          </dl>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="font-bold text-slate-200">daily_fx</p>
            <span
              className={`rounded px-2 py-0.5 text-[10px] font-bold ${qualityBadgeClass(
                bigQueryDiagnostics.schemaChecks.fxTable.isReady ? "strong" : "risk",
              )}`}
            >
              {bigQueryDiagnostics.schemaChecks.fxTable.isReady ? "Ready" : "Missing"}
            </span>
          </div>
          <dl className="grid grid-cols-2 gap-2">
            <div>
              <dt className="text-slate-500">期間</dt>
              <dd className="mt-0.5 font-mono text-slate-100">
                {bigQueryDiagnostics.fxSummary.first_date ?? "--"} ~ {bigQueryDiagnostics.fxSummary.latest_date ?? "--"}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">幣別數</dt>
              <dd className="mt-0.5 font-mono text-slate-100">
                {formatCount(bigQueryDiagnostics.fxSummary.currency_count)}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">總筆數</dt>
              <dd className="mt-0.5 font-mono text-slate-100">
                {formatCount(bigQueryDiagnostics.fxSummary.row_count)}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">距今天</dt>
              <dd className="mt-0.5 font-mono text-slate-100">
                {fxFreshnessDays === null ? "--" : `${fxFreshnessDays} 天`}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {(!bigQueryDiagnostics.schemaChecks.priceTable.isReady || !bigQueryDiagnostics.schemaChecks.fxTable.isReady) && (
        <div className="border border-red-900/60 bg-red-950/30 rounded-lg p-3 text-xs text-red-300 space-y-2">
          {!bigQueryDiagnostics.schemaChecks.priceTable.isReady && (
            <p>
              daily_prices 缺少欄位：
              {bigQueryDiagnostics.schemaChecks.priceTable.missingColumns.join(", ")}
            </p>
          )}
          {!bigQueryDiagnostics.schemaChecks.fxTable.isReady && (
            <p>
              daily_fx 缺少欄位：
              {bigQueryDiagnostics.schemaChecks.fxTable.missingColumns.join(", ")}
            </p>
          )}
        </div>
      )}

      {staleSymbols.length ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3 text-[11px]">
            <span className="text-slate-500">落後商品</span>
            <span className="text-slate-600 font-mono">{staleSymbols.length} 檔</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
            {staleSymbols.slice(0, 8).map((symbol) => {
              const staleDays = symbol.stale_days ?? daysSinceDate(symbol.latest_date);
              return (
                <div key={symbol.symbol} className="bg-slate-900 border border-slate-800 rounded-md p-2 space-y-1">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-200 truncate">{symbol.symbol}</span>
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-bold ${qualityBadgeClass(
                        freshnessStatus(staleDays),
                      )}`}
                    >
                      {staleDays === null ? "--" : `${staleDays} 天`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-[11px] text-slate-500">
                    <span className="font-mono">{symbol.latest_date ?? "--"}</span>
                    <span className="font-mono">{formatCount(symbol.row_count)} rows</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {fxCurrencies.length ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3 text-[11px]">
            <span className="text-slate-500">匯率幣別狀態</span>
            <span className="text-slate-600 font-mono">{fxCurrencies.length} 組</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
            {fxCurrencies.map((currency) => (
              <div key={currency.currency} className="flex items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-md p-2">
                <span className="text-slate-200 truncate">{currency.currency}</span>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 font-mono">{currency.latest_date ?? "--"}</span>
                  <span
                    className={`rounded px-2 py-0.5 text-[10px] font-bold ${qualityBadgeClass(
                      freshnessStatus(daysSinceDate(currency.latest_date)),
                    )}`}
                  >
                    {qualityLabel(freshnessStatus(daysSinceDate(currency.latest_date)))}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3 text-[11px]">
          <span className="text-slate-500">近期商品新鮮度</span>
          <span className="text-slate-600 font-mono">{bigQueryDiagnostics.recentSymbols.length} 檔</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
          {bigQueryDiagnostics.recentSymbols.map((symbol) => (
            <div key={symbol.symbol} className="flex items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-md p-2">
              <span className="text-slate-200 truncate">{symbol.symbol}</span>
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-mono">{symbol.latest_date ?? "--"}</span>
                <span
                  className={`rounded px-2 py-0.5 text-[10px] font-bold ${qualityBadgeClass(
                    freshnessStatus(daysSinceDate(symbol.latest_date)),
                  )}`}
                >
                  {qualityLabel(freshnessStatus(daysSinceDate(symbol.latest_date)))}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
