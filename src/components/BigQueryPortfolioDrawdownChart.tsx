import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export type BigQueryPortfolioDrawdownPoint = {
  date: string;
  drawdown: number;
  value: number;
};

type BigQueryPortfolioDrawdownChartProps = {
  data: BigQueryPortfolioDrawdownPoint[];
  formatChartDate: (value: unknown) => string;
  formatChartPercent: (value: unknown) => string;
};

export function BigQueryPortfolioDrawdownChart({
  data,
  formatChartDate,
  formatChartPercent,
}: BigQueryPortfolioDrawdownChartProps) {
  return (
    <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
      <div className="flex items-center justify-between gap-3 mb-3">
        <p className="text-[11px] text-slate-500">回撤曲線</p>
        <p className="text-[11px] text-slate-600 font-mono">Peak to trough</p>
      </div>
      <div className="h-56 w-full">
        {data.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis
                dataKey="date"
                minTickGap={28}
                stroke="#64748b"
                tick={{ fill: "#64748b", fontSize: 11 }}
                tickFormatter={formatChartDate}
              />
              <YAxis
                stroke="#64748b"
                tick={{ fill: "#64748b", fontSize: 11 }}
                tickFormatter={formatChartPercent}
              />
              <Tooltip
                contentStyle={{ background: "#020617", border: "1px solid #1e293b", borderRadius: 8 }}
                labelStyle={{ color: "#cbd5e1" }}
                formatter={(value) => [formatChartPercent(value), "回撤"]}
              />
              <Line
                type="monotone"
                dataKey="drawdown"
                stroke="#fb7185"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 4, fill: "#fda4af" }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center border border-dashed border-slate-800 rounded-md text-xs text-slate-600">
            尚無回撤資料
          </div>
        )}
      </div>
    </div>
  );
}
