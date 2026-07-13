import {
  decisionSignalClass,
  decisionSignalLabel,
} from "@/lib/assetResearchWorkflow";
import {
  allocationModeLabel,
  type AllocationDraftRow,
  type AllocationMode,
  type AllocationRiskSnapshot,
} from "@/lib/allocationWorkflow";

type AllocationDraftSectionProps = {
  allocationMode: AllocationMode;
  onAllocationModeChange: (value: AllocationMode) => void;
  allocationCapital: number;
  onAllocationCapitalChange: (value: number) => void;
  maximumAllocationWeight: number;
  onMaximumAllocationWeightChange: (value: number) => void;
  stressShockPercent: number;
  onStressShockPercentChange: (value: number) => void;
  onExportAllocationDraftCsv: () => void;
  onExportAllocationRiskCsv: () => void;
  modelAllocationRows: AllocationDraftRow[];
  activeAllocationRows: AllocationDraftRow[];
  visibleComparisonRowsCount: number;
  effectiveMaximumAllocationWeight: number;
  allocationRisk: AllocationRiskSnapshot;
};

function formatPercent(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? `${(value * 100).toFixed(2)}%` : "--";
}

function formatCurrency(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value)
    ? value.toLocaleString("zh-TW", { maximumFractionDigits: 0 })
    : "--";
}

export function AllocationDraftSection({
  allocationMode,
  onAllocationModeChange,
  allocationCapital,
  onAllocationCapitalChange,
  maximumAllocationWeight,
  onMaximumAllocationWeightChange,
  stressShockPercent,
  onStressShockPercentChange,
  onExportAllocationDraftCsv,
  onExportAllocationRiskCsv,
  modelAllocationRows,
  activeAllocationRows,
  visibleComparisonRowsCount,
  effectiveMaximumAllocationWeight,
  allocationRisk,
}: AllocationDraftSectionProps) {
  return (
    <>
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-3">
        <div>
          <h4 className="text-xs font-bold text-slate-100">模型配置草稿</h4>
          <p className="text-[11px] text-slate-500 mt-0.5">
            依目前 Watchlist 篩選結果產生研究用權重；風險訊號與低分商品會自動排除
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-[150px_160px_140px_150px_auto_auto] gap-2 text-xs">
          <label className="space-y-1">
            <span className="text-slate-500">配置模式</span>
            <select
              value={allocationMode}
              onChange={(event) => onAllocationModeChange(event.target.value as AllocationMode)}
              className="w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-slate-100"
            >
              <option value="risk">風險調整</option>
              <option value="score">分數加權</option>
              <option value="equal">等權重</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-slate-500">模型本金</span>
            <input
              type="number"
              min={0}
              step={10000}
              value={allocationCapital}
              onChange={(event) => onAllocationCapitalChange(Math.max(0, Number(event.target.value) || 0))}
              className="w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-right font-mono text-slate-100"
            />
          </label>
          <label className="space-y-1">
            <span className="text-slate-500">單檔上限</span>
            <input
              type="number"
              min={5}
              max={100}
              step={5}
              value={Math.round(maximumAllocationWeight * 100)}
              onChange={(event) => onMaximumAllocationWeightChange(Math.min(1, Math.max(0.05, (Number(event.target.value) || 0) / 100)))}
              className="w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-right font-mono text-slate-100"
            />
          </label>
          <label className="space-y-1">
            <span className="text-slate-500">壓力情境</span>
            <input
              type="number"
              min={-80}
              max={0}
              step={5}
              value={stressShockPercent}
              onChange={(event) => onStressShockPercentChange(Math.min(0, Math.max(-80, Number(event.target.value) || 0)))}
              className="w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-right font-mono text-slate-100"
            />
          </label>
          <button
            onClick={onExportAllocationDraftCsv}
            disabled={!modelAllocationRows.length}
            className="sm:self-end px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold disabled:cursor-not-allowed disabled:bg-slate-950 disabled:text-slate-600"
          >
            配置 CSV
          </button>
          <button
            onClick={onExportAllocationRiskCsv}
            disabled={!activeAllocationRows.length}
            className="sm:self-end px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold disabled:cursor-not-allowed disabled:bg-slate-950 disabled:text-slate-600"
          >
            風險 CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
        {[
          ["模式", allocationModeLabel(allocationMode)],
          ["納入商品", `${activeAllocationRows.length} / ${visibleComparisonRowsCount} 檔`],
          ["配置金額", formatCurrency(activeAllocationRows.reduce((sum, row) => sum + row.allocationAmount, 0))],
          [
            "最高權重",
            activeAllocationRows.length
              ? `${activeAllocationRows[0].symbol} · ${formatPercent(activeAllocationRows[0].allocationWeight)}`
              : "--",
          ],
          ["權重上限", formatPercent(effectiveMaximumAllocationWeight)],
          ["達上限", `${activeAllocationRows.filter((row) => row.allocationCapApplied).length} 檔`],
          ["預估年化報酬", formatPercent(allocationRisk.expectedAnnualReturn)],
          ["預估年化波動", formatPercent(allocationRisk.estimatedAnnualVolatility)],
          ["壓力損益", formatCurrency(allocationRisk.stressLoss)],
          [
            "最大風險貢獻",
            allocationRisk.riskRows.length
              ? `${allocationRisk.riskRows[0].symbol} · ${formatPercent(allocationRisk.riskRows[0].riskContribution)}`
              : "--",
          ],
        ].map(([label, value]) => (
          <div key={label} className="rounded-md border border-slate-800 bg-slate-950/70 p-3 min-w-0">
            <p className="text-[11px] text-slate-600 truncate">{label}</p>
            <p className="mt-1 font-mono text-sm font-bold text-slate-100 truncate" title={value}>
              {value}
            </p>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[960px] text-xs">
          <thead>
            <tr className="text-left text-[11px] text-slate-600">
              <th className="py-2 pr-3 font-medium">Symbol</th>
              <th className="py-2 px-3 font-medium text-right">Weight</th>
              <th className="py-2 px-3 font-medium text-right">Cap</th>
              <th className="py-2 px-3 font-medium text-right">Amount</th>
              <th className="py-2 px-3 font-medium text-right">Score</th>
              <th className="py-2 px-3 font-medium text-right">Vol</th>
              <th className="py-2 px-3 font-medium text-right">Drawdown</th>
              <th className="py-2 px-3 font-medium">Signal</th>
              <th className="py-2 pl-3 font-medium">Note</th>
            </tr>
          </thead>
          <tbody>
            {modelAllocationRows.slice(0, 10).map((row) => (
              <tr key={row.symbol} className="border-t border-slate-800/80">
                <td className="py-2 pr-3 font-bold text-cyan-200">{row.symbol}</td>
                <td className="py-2 px-3 text-right font-mono text-slate-100">
                  {formatPercent(row.allocationWeight)}
                </td>
                <td className="py-2 px-3 text-right">
                  <span
                    className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                      row.allocationCapApplied ? "bg-amber-500/15 text-amber-200" : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {row.allocationCapApplied ? "Hit" : "--"}
                  </span>
                </td>
                <td className="py-2 px-3 text-right font-mono text-slate-300">
                  {formatCurrency(row.allocationAmount)}
                </td>
                <td className="py-2 px-3 text-right font-mono text-slate-300">{row.score}</td>
                <td className="py-2 px-3 text-right font-mono text-amber-200">
                  {formatPercent(row.annualizedVolatility)}
                </td>
                <td className="py-2 px-3 text-right font-mono text-rose-300">
                  {formatPercent(row.maxDrawdown)}
                </td>
                <td className="py-2 px-3">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${decisionSignalClass(row.signal)}`}>
                    {decisionSignalLabel(row.signal)}
                  </span>
                </td>
                <td className="py-2 pl-3 text-slate-500">{row.allocationNote}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[0.85fr_1.15fr] gap-3">
        <div className="rounded-md border border-slate-800 bg-slate-950/70 p-3 text-xs space-y-3">
          <div>
            <p className="text-[11px] text-slate-600">壓力情境損益</p>
            <p className={`mt-1 font-mono text-lg font-bold ${allocationRisk.stressLoss < 0 ? "text-rose-300" : "text-emerald-300"}`}>
              {formatCurrency(allocationRisk.stressLoss)}
            </p>
            <p className="mt-1 text-[11px] text-slate-500">
              {formatPercent(stressShockPercent / 100)} 情境後估計市值 {formatCurrency(allocationRisk.stressedValue)}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[11px] text-slate-600">加權最大回撤</p>
              <p className="mt-1 font-mono text-sm font-bold text-rose-300">
                {formatPercent(allocationRisk.weightedMaxDrawdown)}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-slate-600">單檔最差回撤</p>
              <p className="mt-1 font-mono text-sm font-bold text-rose-300">
                {formatPercent(allocationRisk.worstMaxDrawdown)}
              </p>
            </div>
          </div>
          <p className="text-[11px] leading-relaxed text-slate-500">
            目前使用單資產歷史波動估算風險預算，尚未納入資產間相關係數；後續接完整歷史報酬矩陣後，可升級為共變異數模型。
          </p>
        </div>

        <div className="overflow-x-auto rounded-md border border-slate-800 bg-slate-950/70">
          <table className="w-full min-w-[720px] text-xs">
            <thead>
              <tr className="text-left text-[11px] text-slate-600">
                <th className="py-2 px-3 font-medium">Symbol</th>
                <th className="py-2 px-3 font-medium text-right">Weight</th>
                <th className="py-2 px-3 font-medium text-right">Risk Budget</th>
                <th className="py-2 px-3 font-medium text-right">Weighted Vol</th>
                <th className="py-2 px-3 font-medium text-right">Vol</th>
                <th className="py-2 px-3 font-medium text-right">Drawdown</th>
              </tr>
            </thead>
            <tbody>
              {allocationRisk.riskRows.slice(0, 8).map((row) => (
                <tr key={row.symbol} className="border-t border-slate-800/80">
                  <td className="py-2 px-3 font-bold text-cyan-200">{row.symbol}</td>
                  <td className="py-2 px-3 text-right font-mono text-slate-300">
                    {formatPercent(row.allocationWeight)}
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-slate-100">
                    {formatPercent(row.riskContribution)}
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-slate-400">
                    {formatPercent(row.weightedVolatility)}
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-amber-200">
                    {formatPercent(row.annualizedVolatility)}
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-rose-300">
                    {formatPercent(row.maxDrawdown)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
