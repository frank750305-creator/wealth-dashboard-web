import {
  releasePolicyText,
  type DataProductErrorBudgetItem,
  type DataProductErrorBudgetSummary,
  type DataProductReleasePolicy,
} from "@/lib/dataProductErrorBudget";
import { serviceStateLabel } from "@/lib/dataProductStatusPage";

type DataProductErrorBudgetSectionProps = {
  summary: DataProductErrorBudgetSummary;
  items: DataProductErrorBudgetItem[];
  onExportCsv: () => void;
};

function releasePolicyBadgeClass(policy: DataProductReleasePolicy) {
  if (policy === "allow") return "bg-emerald-500/15 text-emerald-200";
  if (policy === "guarded") return "bg-amber-500/15 text-amber-200";
  return "bg-rose-500/15 text-rose-200";
}

function releasePolicyRowClass(policy: DataProductReleasePolicy) {
  if (policy === "allow") return "border-emerald-500/15 bg-emerald-950/10";
  if (policy === "guarded") return "border-amber-500/20 bg-amber-950/10";
  return "border-rose-500/20 bg-rose-950/10";
}

function formatPercent(value: number | null) {
  return typeof value === "number" && Number.isFinite(value) ? `${(value * 100).toFixed(1)}%` : "--";
}

function formatNumber(value: number | null) {
  return typeof value === "number" && Number.isFinite(value) ? value.toFixed(2) : "--";
}

export function DataProductErrorBudgetSection({
  summary,
  items,
  onExportCsv: handleExportCsv,
}: DataProductErrorBudgetSectionProps) {
  return (
    <div className="border-t border-slate-800 pt-3 space-y-3">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-xs font-bold text-slate-100">資料產品 Error Budget</h4>
            <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${releasePolicyBadgeClass(summary.releasePolicy)}`}>
              {releasePolicyText(summary.releasePolicy)}
            </span>
          </div>
          <p className="mt-0.5 text-[11px] text-slate-500">
            用 SLO、狀態頁與 action queue 推算資料產品剩餘風險預算與發布凍結條件
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2 text-xs">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              ["允許", `${summary.allowCount}`],
              ["條件", `${summary.guardedCount}`],
              ["凍結", `${summary.freezeCount}`],
              ["剩餘", formatPercent(summary.averageBudgetRemainingPercent)],
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
            Error Budget CSV
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-800">
        <table className="w-full min-w-[1380px] text-xs">
          <thead className="bg-slate-900/80">
            <tr className="text-left text-[11px] text-slate-600">
              <th className="py-2 px-3 font-medium">資料產品</th>
              <th className="py-2 px-3 font-medium text-right">發布政策</th>
              <th className="py-2 px-3 font-medium text-right">SLO</th>
              <th className="py-2 px-3 font-medium text-right">剩餘預算</th>
              <th className="py-2 px-3 font-medium text-right">消耗</th>
              <th className="py-2 px-3 font-medium text-right">Burn</th>
              <th className="py-2 px-3 font-medium text-right">Action</th>
              <th className="py-2 px-3 font-medium">狀態頁</th>
              <th className="py-2 px-3 font-medium">Owner</th>
              <th className="py-2 px-3 font-medium">動作</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={`${item.domain}-${item.product}-error-budget`} className={`border-t ${releasePolicyRowClass(item.releasePolicy)}`}>
                <td className="py-2 px-3">
                  <p className="font-bold text-slate-100">{item.product}</p>
                  <p className="mt-0.5 text-[10px] text-slate-600">{item.domain} · {item.evidence}</p>
                </td>
                <td className="py-2 px-3 text-right">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${releasePolicyBadgeClass(item.releasePolicy)}`}>
                    {releasePolicyText(item.releasePolicy)}
                  </span>
                </td>
                <td className="py-2 px-3 text-right font-mono text-slate-100">{item.sloScore}/{item.targetScore}</td>
                <td className="py-2 px-3 text-right font-mono text-slate-300">{formatPercent(item.budgetRemainingPercent)}</td>
                <td className="py-2 px-3 text-right font-mono text-slate-300">{formatPercent(item.budgetConsumedPercent)}</td>
                <td className="py-2 px-3 text-right font-mono text-slate-300">{formatNumber(item.burnRate)}</td>
                <td className="py-2 px-3 text-right font-mono text-slate-300">{item.openActionCount}</td>
                <td className="py-2 px-3 text-slate-400">{serviceStateLabel(item.serviceState)}</td>
                <td className="py-2 px-3 text-slate-400">{item.owner}</td>
                <td className="py-2 px-3 text-slate-500">{item.action}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
