import type { SimulationResult } from "@/types/wealth";

type WealthDataTableProps = {
  simulationResult: SimulationResult;
};

export function WealthDataTable({ simulationResult }: WealthDataTableProps) {
  return (
    <div className="bg-slate-900 border border-slate-800 p-4 md:p-6 rounded-xl shadow-2xl space-y-4 animate-fade-in">
      <h2 className="text-base font-semibold text-blue-400 flex items-center gap-2 border-b border-slate-800 pb-3">
        <span>📋 逐年現金流與稅務財富軌跡明細 (Data Grid)</span>
      </h2>
      <div className="overflow-x-auto max-h-[400px] border border-slate-800 rounded-lg custom-scrollbar">
        <table className="w-full text-left border-collapse text-xs md:text-sm whitespace-nowrap">
          <thead className="bg-slate-950 sticky top-0 z-10 shadow-md">
            <tr className="border-b border-slate-800 text-slate-400">
              <th className="py-3 px-4 font-semibold">年齡</th>
              <th className="py-3 px-4 text-right font-semibold text-blue-400">預估總資產 (萬)</th>
              <th className="py-3 px-4 text-right font-semibold text-purple-400">退休金專戶 (萬)</th>
              <th className="py-3 px-4 text-right font-semibold text-red-400">遺產稅缺口 (萬)</th>
              <th className="py-3 px-4 text-right font-semibold text-emerald-400">配偶請求權 (萬)</th>
              <th className="py-3 px-4 text-right font-semibold">年金收入 (元)</th>
              <th className="py-3 px-4 text-right font-semibold text-orange-400">應納所得稅金 (元)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 text-slate-300 font-mono">
            {simulationResult.trajectory.map((row, index) => (
              <tr key={index} className="hover:bg-slate-800/50 transition-colors">
                <td className="py-2.5 px-4 text-center bg-slate-950/50 text-white font-bold">{row.年紀} 歲</td>
                <td className="py-2.5 px-4 text-right text-blue-300">{row.總資產?.toLocaleString()}</td>
                <td className="py-2.5 px-4 text-right text-purple-300">{Math.round((row.退休金專戶 || 0) / 10000).toLocaleString()}</td>
                <td className="py-2.5 px-4 text-right text-red-400 font-bold">{row.預估遺產稅?.toLocaleString()}</td>
                <td className="py-2.5 px-4 text-right text-emerald-400">{row.差額分配請求權?.toLocaleString()}</td>
                <td className="py-2.5 px-4 text-right">{Math.round(row.收_年金收入 || 0).toLocaleString()}</td>
                <td className="py-2.5 px-4 text-right text-orange-300">{Math.round(row.支_所得稅金 || 0).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
