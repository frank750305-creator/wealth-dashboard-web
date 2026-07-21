import { CartesianGrid, ComposedChart, Line, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis } from "recharts";
import type { PortfolioEfficientFrontier } from "@/types/market";

type BigQueryPortfolioEfficientFrontierProps = {
  efficientFrontier: PortfolioEfficientFrontier | undefined;
  formatChartPercent: (value: unknown) => string;
};

export function BigQueryPortfolioEfficientFrontier({
  efficientFrontier,
  formatChartPercent,
}: BigQueryPortfolioEfficientFrontierProps) {
  if (!efficientFrontier?.points?.length) return null;

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <p className="text-[11px] text-slate-500">有效前緣</p>
          <p className="text-[11px] text-slate-600 mt-0.5">候選組合風險 / 報酬分布</p>
        </div>
        <p className="text-[11px] text-slate-600 font-mono">
          {efficientFrontier.points.length} scenarios
        </p>
      </div>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={efficientFrontier.points} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis
              type="number"
              dataKey="annualVolatility"
              name="年化波動"
              domain={["auto", "auto"]}
              stroke="#64748b"
              tick={{ fill: "#64748b", fontSize: 11 }}
              tickFormatter={formatChartPercent}
            />
            <YAxis
              type="number"
              dataKey="annualReturn"
              name="年化報酬"
              domain={["auto", "auto"]}
              stroke="#64748b"
              tick={{ fill: "#64748b", fontSize: 11 }}
              tickFormatter={formatChartPercent}
            />
            <Tooltip
              contentStyle={{ background: "#020617", border: "1px solid #1e293b", borderRadius: 8 }}
              labelStyle={{ color: "#cbd5e1" }}
              formatter={(value, name) => {
                const label = String(name);
                if (label === "annualVolatility") return [formatChartPercent(value), "年化波動"];
                if (label === "sharpe") {
                  const numeric = Number(value);
                  return [Number.isFinite(numeric) ? numeric.toFixed(2) : "--", "Sharpe"];
                }
                return [formatChartPercent(value), "年化報酬"];
              }}
            />
            <Scatter
              data={efficientFrontier.points}
              name="候選組合"
              fill="#475569"
              fillOpacity={0.45}
              isAnimationActive={false}
            />
            <Line
              data={efficientFrontier.frontier}
              type="monotone"
              dataKey="annualReturn"
              name="有效前緣"
              stroke="#22d3ee"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4, fill: "#67e8f9" }}
              isAnimationActive={false}
            />
            {efficientFrontier.selectedPoint?.annualReturn !== null &&
            efficientFrontier.selectedPoint?.annualVolatility !== null ? (
              <Scatter
                data={[efficientFrontier.selectedPoint]}
                name="AI 建議"
                fill="#facc15"
                isAnimationActive={false}
              />
            ) : null}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
