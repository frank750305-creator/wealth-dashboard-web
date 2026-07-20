import {
  BigQueryPortfolioSignalCardGrid,
  type BigQueryPortfolioSignalCard,
} from "./BigQueryPortfolioSignalCardGrid";

type AllocationExposureRow = {
  label: string;
  value: number;
};

type BigQueryPortfolioAllocationSummaryProps = {
  allocationInsights: BigQueryPortfolioSignalCard[];
  currencyExposureRows: AllocationExposureRow[];
  allocationRows: AllocationExposureRow[];
  onExportAllocationCsv: () => void;
};

function formatPercent(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? `${(value * 100).toFixed(2)}%` : "--";
}

function exposureBarWidth(value: number) {
  return `${Math.max(value * 100, 2)}%`;
}

export function BigQueryPortfolioAllocationSummary({
  allocationInsights,
  currencyExposureRows,
  allocationRows,
  onExportAllocationCsv,
}: BigQueryPortfolioAllocationSummaryProps) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-slate-200">配置結構分析</p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {allocationRows.length ? `${allocationRows.length} 檔有效商品` : "尚無有效商品"}
          </p>
        </div>
        <button
          onClick={onExportAllocationCsv}
          disabled={!allocationRows.length}
          className="h-9 px-3 rounded-md border border-slate-700 bg-slate-900 text-[11px] font-bold text-slate-300 hover:border-cyan-600 hover:text-cyan-200 disabled:cursor-not-allowed disabled:text-slate-600"
        >
          分析 CSV
        </button>
      </div>

      <BigQueryPortfolioSignalCardGrid cards={allocationInsights} variant="wide" />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>幣別曝險</span>
            <span className="font-mono">{currencyExposureRows.length} 組</span>
          </div>
          {currencyExposureRows.length ? (
            <div className="space-y-2">
              {currencyExposureRows.map((row) => (
                <div key={row.label} className="space-y-1">
                  <div className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="font-bold text-slate-200 truncate">{row.label}</span>
                    <span className="font-mono text-slate-400">{formatPercent(row.value)}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-900">
                    <div
                      className="h-full rounded-full bg-cyan-500"
                      style={{ width: exposureBarWidth(row.value) }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-slate-600">--</p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>前五大持倉</span>
            <span className="font-mono">{allocationRows.slice(0, 5).length} 檔</span>
          </div>
          {allocationRows.length ? (
            <div className="space-y-2">
              {allocationRows.slice(0, 5).map((row) => (
                <div key={row.label} className="space-y-1">
                  <div className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="font-bold text-slate-200 truncate" title={row.label}>
                      {row.label}
                    </span>
                    <span className="font-mono text-slate-400">{formatPercent(row.value)}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-900">
                    <div
                      className="h-full rounded-full bg-emerald-500"
                      style={{ width: exposureBarWidth(row.value) }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-slate-600">--</p>
          )}
        </div>
      </div>
    </div>
  );
}
