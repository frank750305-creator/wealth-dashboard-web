import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export type BigQueryPortfolioWealthPoint = {
  date: string | null;
  value: number | null;
  dailyReturn: number | null;
};

type BigQueryPortfolioWealthChartProps = {
  data: BigQueryPortfolioWealthPoint[];
  formatChartDate: (value: unknown) => string;
};

function formatChartNumber(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric.toFixed(1) : "--";
}

export function BigQueryPortfolioWealthChart({
  data,
  formatChartDate,
}: BigQueryPortfolioWealthChartProps) {
  return (
    <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
      <div className="flex items-center justify-between gap-3 mb-3">
        <p className="text-[11px] text-slate-500">財富指數曲線</p>
        <p className="text-[11px] text-slate-600 font-mono">Base 100</p>
      </div>
      <div className="h-72 w-full">
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
                tickFormatter={formatChartNumber}
              />
              <Tooltip
                contentStyle={{ background: "#020617", border: "1px solid #1e293b", borderRadius: 8 }}
                labelStyle={{ color: "#cbd5e1" }}
                formatter={(value) => [formatChartNumber(value), "財富指數"]}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#22d3ee"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 4, fill: "#67e8f9" }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center border border-dashed border-slate-800 rounded-md text-xs text-slate-600">
            尚無曲線資料
          </div>
        )}
      </div>
    </div>
  );
}
