import {
  clientImpactSeverityLabel,
  type DataProductClientImpactItem,
  type DataProductClientImpactSeverity,
  type DataProductClientImpactSummary,
} from "@/lib/dataProductClientImpact";

type DataProductClientImpactSectionProps = {
  summary: DataProductClientImpactSummary;
  items: DataProductClientImpactItem[];
  onExportCsv: () => void;
};

function severityBadgeClass(severity: DataProductClientImpactSeverity) {
  if (severity === "none") return "bg-emerald-500/15 text-emerald-200";
  if (severity === "watch") return "bg-amber-500/15 text-amber-200";
  return "bg-rose-500/15 text-rose-200";
}

function severityRowClass(severity: DataProductClientImpactSeverity) {
  if (severity === "none") return "border-emerald-500/15 bg-emerald-950/10";
  if (severity === "watch") return "border-amber-500/20 bg-amber-950/10";
  return "border-rose-500/20 bg-rose-950/10";
}

function formatCurrency(value: number) {
  return value > 0 ? `NT$${value.toLocaleString("zh-TW")}` : "--";
}

export function DataProductClientImpactSection({
  summary,
  items,
  onExportCsv: handleExportCsv,
}: DataProductClientImpactSectionProps) {
  return (
    <div className="border-t border-slate-800 pt-3 space-y-3">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-xs font-bold text-slate-100">客戶影響矩陣</h4>
            <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${severityBadgeClass(summary.severity)}`}>
              {clientImpactSeverityLabel(summary.severity)}
            </span>
          </div>
          <p className="mt-0.5 text-[11px] text-slate-500">
            將資料產品狀態、Error Budget、工作區與帳務資料轉成客戶影響與通報優先順序
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2 text-xs">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              ["工作區", `${summary.workspaceCount}`],
              ["受影響", `${summary.impactedWorkspaceCount}`],
              ["重大", `${summary.criticalWorkspaceCount}`],
              ["風險 MRR", formatCurrency(summary.estimatedMonthlyRevenueAtRisk)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-md border border-slate-800 bg-slate-900/70 px-3 py-2 text-right">
                <p className="text-[10px] text-slate-600">{label}</p>
                <p className="mt-0.5 font-mono font-bold text-slate-100">{value}</p>
              </div>
            ))}
          </div>
          <button
            onClick={handleExportCsv}
            disabled={!items.length}
            className="px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold disabled:cursor-not-allowed disabled:bg-slate-950 disabled:text-slate-600"
          >
            客戶影響 CSV
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-800">
        <table className="w-full min-w-[1480px] text-xs">
          <thead className="bg-slate-900/80">
            <tr className="text-left text-[11px] text-slate-600">
              <th className="py-2 px-3 font-medium">Workspace</th>
              <th className="py-2 px-3 font-medium text-right">影響</th>
              <th className="py-2 px-3 font-medium">受影響資料產品</th>
              <th className="py-2 px-3 font-medium text-right">凍結</th>
              <th className="py-2 px-3 font-medium text-right">觀察</th>
              <th className="py-2 px-3 font-medium text-right">MRR</th>
              <th className="py-2 px-3 font-medium">收入風險</th>
              <th className="py-2 px-3 font-medium">Owner</th>
              <th className="py-2 px-3 font-medium">客戶訊息</th>
              <th className="py-2 px-3 font-medium">內部動作</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={`${item.workspace}-client-impact`} className={`border-t ${severityRowClass(item.severity)}`}>
                <td className="py-2 px-3">
                  <p className="font-bold text-slate-100">{item.workspace}</p>
                  <p className="mt-0.5 text-[10px] text-slate-600">{item.segment} · {item.plan}</p>
                </td>
                <td className="py-2 px-3 text-right">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${severityBadgeClass(item.severity)}`}>
                    {clientImpactSeverityLabel(item.severity)}
                  </span>
                </td>
                <td className="py-2 px-3 text-slate-400">{item.impactedProducts.length ? item.impactedProducts.join(" / ") : "--"}</td>
                <td className="py-2 px-3 text-right font-mono text-slate-300">{item.frozenProducts}</td>
                <td className="py-2 px-3 text-right font-mono text-slate-300">{item.degradedProducts}</td>
                <td className="py-2 px-3 text-right font-mono text-slate-300">{formatCurrency(item.estimatedMonthlyRevenue)}</td>
                <td className="py-2 px-3 text-slate-400">{item.revenueRisk}</td>
                <td className="py-2 px-3 text-slate-400">{item.communicationOwner}</td>
                <td className="py-2 px-3 text-slate-500">{item.customerMessage}</td>
                <td className="py-2 px-3 text-slate-500">{item.internalAction}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
