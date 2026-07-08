"use client";

import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { WealthChartTooltip } from "@/components/WealthChartTooltip";
import type { SimulationResult } from "@/types/wealth";

type WealthTrajectoryChartProps = {
  simulationResult: SimulationResult | null;
};

export function WealthTrajectoryChart({ simulationResult }: WealthTrajectoryChartProps) {
  return (
    <div className="bg-slate-900 border border-slate-800 p-4 md:p-6 rounded-xl shadow-2xl flex flex-col">
      <h2 className="text-base font-semibold mb-6 text-emerald-400 flex items-center gap-2 underline underline-offset-8 decoration-emerald-500/50">
        ▍ 終身可支配淨資產與遺產稅現金風險軌跡趨勢
      </h2>
      <div className="w-full h-[350px] text-xs">
        {!simulationResult ? (
          <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-lg text-slate-600">
            <p className="tracking-widest mb-1 text-base">等待決策控制中樞參數裝填...</p>
            <p className="text-xs text-slate-500">請完成左側面板設定並點擊「一鍵啟動全端精算」</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={simulationResult.trajectory} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="年紀" stroke="#64748b" tick={{ fill: "#64748b" }} />
              <YAxis stroke="#64748b" tick={{ fill: "#64748b" }} tickFormatter={(value) => `${value}萬`} />
              <Tooltip content={<WealthChartTooltip />} />
              <Legend wrapperStyle={{ paddingTop: "10px" }} />
              <Bar dataKey="總資產" name="預估總資產" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={22} />
              <Line type="monotone" dataKey="預估遺產稅" name="預估遺產稅現金缺口" stroke="#ef4444" strokeWidth={3} dot={{ r: 2, fill: "#ef4444" }} />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
