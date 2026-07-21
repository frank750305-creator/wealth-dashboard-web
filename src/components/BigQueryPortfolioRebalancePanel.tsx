import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export type RebalanceRecommendation = {
  symbol: string;
  currentWeight: number;
  targetWeight: number;
  deltaWeight: number;
  tradeAmount: number;
  estimatedCost: number;
  action: "increase" | "decrease" | "hold" | "skip";
};

export type RebalanceSummary = {
  totalBuy: number;
  totalSell: number;
  netCashFlow: number;
  turnover: number | null;
  totalEstimatedCost: number;
};

type RebalanceChartRow = Pick<RebalanceRecommendation, "symbol" | "currentWeight" | "targetWeight">;

type BigQueryPortfolioRebalancePanelProps = {
  rows: RebalanceRecommendation[];
  summary: RebalanceSummary;
  chartData: RebalanceChartRow[];
  portfolioValue: number;
  formatMoney: (value: number, signed?: boolean) => string;
  formatMetric: (value: number | null, kind: "percent" | "number") => string;
  formatChartPercent: (value: unknown) => string;
  formatSignedWeightDelta: (value: number) => string;
  actionLabel: (action: RebalanceRecommendation["action"]) => string;
};

function formatShortSymbol(value: unknown) {
  const text = String(value ?? "");
  return text.length > 12 ? `${text.slice(0, 10)}...` : text;
}

function rebalanceActionClass(action: RebalanceRecommendation["action"]) {
  if (action === "increase") return "text-emerald-300 bg-emerald-500/10 border-emerald-500/30";
  if (action === "decrease") return "text-rose-300 bg-rose-500/10 border-rose-500/30";
  if (action === "skip") return "text-slate-400 bg-slate-900 border-slate-700";
  return "text-slate-300 bg-slate-800 border-slate-700";
}

function rebalanceBarWidth(value: number) {
  if (!Number.isFinite(value)) return "0%";
  return `${Math.min(Math.abs(value) * 100, 100).toFixed(1)}%`;
}

function cashFlowClass(value: number) {
  if (value > 0) return "text-emerald-300";
  if (value < 0) return "text-rose-300";
  return "text-slate-300";
}

function deltaClass(value: number) {
  if (value > 0) return "text-emerald-300";
  if (value < 0) return "text-rose-300";
  return "text-slate-400";
}

export function BigQueryPortfolioRebalancePanel({
  rows,
  summary,
  chartData,
  portfolioValue,
  formatMoney,
  formatMetric,
  formatChartPercent,
  formatSignedWeightDelta,
  actionLabel,
}: BigQueryPortfolioRebalancePanelProps) {
  if (!rows.length) return null;

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
      <div className="flex items-center justify-between gap-3 mb-3">
        <p className="text-[11px] text-slate-500">再平衡建議</p>
        <div className="text-right">
          <p className="text-[11px] text-slate-600 font-mono">{formatMoney(portfolioValue)}</p>
          <p className="text-[11px] text-slate-500 font-mono">
            Cost {formatMoney(summary.totalEstimatedCost)}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-3">
        <div className="rounded-md border border-slate-800 bg-slate-900/60 p-2">
          <p className="text-[11px] text-slate-600">Buy</p>
          <p className="mt-1 font-mono text-xs text-emerald-300">{formatMoney(summary.totalBuy)}</p>
        </div>
        <div className="rounded-md border border-slate-800 bg-slate-900/60 p-2">
          <p className="text-[11px] text-slate-600">Sell</p>
          <p className="mt-1 font-mono text-xs text-rose-300">{formatMoney(summary.totalSell)}</p>
        </div>
        <div className="rounded-md border border-slate-800 bg-slate-900/60 p-2">
          <p className="text-[11px] text-slate-600">Net Cash</p>
          <p className={`mt-1 font-mono text-xs ${cashFlowClass(summary.netCashFlow)}`}>
            {formatMoney(summary.netCashFlow, true)}
          </p>
        </div>
        <div className="rounded-md border border-slate-800 bg-slate-900/60 p-2">
          <p className="text-[11px] text-slate-600">Turnover</p>
          <p className="mt-1 font-mono text-xs text-cyan-200">
            {formatMetric(summary.turnover, "percent")}
          </p>
        </div>
        <div className="rounded-md border border-slate-800 bg-slate-900/60 p-2">
          <p className="text-[11px] text-slate-600">Cost</p>
          <p className="mt-1 font-mono text-xs text-amber-200">
            {formatMoney(summary.totalEstimatedCost)}
          </p>
        </div>
      </div>
      <div className="mb-3 h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis
              dataKey="symbol"
              minTickGap={18}
              stroke="#64748b"
              tick={{ fill: "#64748b", fontSize: 11 }}
              tickFormatter={formatShortSymbol}
            />
            <YAxis
              stroke="#64748b"
              tick={{ fill: "#64748b", fontSize: 11 }}
              tickFormatter={formatChartPercent}
            />
            <Tooltip
              contentStyle={{ background: "#020617", border: "1px solid #1e293b", borderRadius: 8 }}
              labelStyle={{ color: "#cbd5e1" }}
              formatter={(value, name) => [
                formatChartPercent(value),
                String(name) === "currentWeight" ? "Current" : "Target",
              ]}
            />
            <Bar dataKey="currentWeight" name="Current" fill="#64748b" radius={[3, 3, 0, 0]} />
            <Bar dataKey="targetWeight" name="Target" fill="#22d3ee" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px] text-xs">
          <thead>
            <tr className="text-left text-[11px] text-slate-600">
              <th className="py-2 pr-3 font-medium">Asset</th>
              <th className="py-2 px-3 font-medium text-right">Current</th>
              <th className="py-2 px-3 font-medium text-right">Target</th>
              <th className="py-2 px-3 font-medium">Delta</th>
              <th className="py-2 px-3 font-medium text-right">Trade</th>
              <th className="py-2 px-3 font-medium text-right">Cost</th>
              <th className="py-2 pl-3 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.symbol} className="border-t border-slate-900">
                <td className="py-2 pr-3 text-slate-200">
                  <span title={row.symbol} className="block max-w-48 truncate">
                    {row.symbol}
                  </span>
                </td>
                <td className="py-2 px-3 text-right font-mono text-slate-400">
                  {formatMetric(row.currentWeight, "percent")}
                </td>
                <td className="py-2 px-3 text-right font-mono text-cyan-200">
                  {formatMetric(row.targetWeight, "percent")}
                </td>
                <td className="py-2 px-3">
                  <div className="flex items-center gap-2">
                    <span className={`w-16 font-mono ${deltaClass(row.deltaWeight)}`}>
                      {formatSignedWeightDelta(row.deltaWeight)}
                    </span>
                    <div className="h-2 min-w-24 flex-1 rounded-full bg-slate-900 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${row.deltaWeight >= 0 ? "bg-emerald-400" : "bg-rose-400"}`}
                        style={{ width: rebalanceBarWidth(row.deltaWeight) }}
                      />
                    </div>
                  </div>
                </td>
                <td className={`py-2 px-3 text-right font-mono ${cashFlowClass(row.tradeAmount)}`}>
                  {formatMoney(row.tradeAmount, true)}
                </td>
                <td className="py-2 px-3 text-right font-mono text-amber-200">
                  {formatMoney(row.estimatedCost)}
                </td>
                <td className="py-2 pl-3 text-right">
                  <span className={`inline-flex min-w-12 justify-center rounded-md border px-2 py-1 text-[11px] font-bold ${rebalanceActionClass(row.action)}`}>
                    {actionLabel(row.action)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
