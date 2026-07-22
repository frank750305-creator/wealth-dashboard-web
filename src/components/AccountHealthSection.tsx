import {
  accountHealthStageClass,
  accountHealthStageLabel,
  accountHealthStatusLabel,
  type AccountHealthItem,
  type AccountHealthStage,
  type AccountHealthSummary,
} from "@/lib/accountHealth";
import type { DataProductClientImpactSeverity } from "@/lib/dataProductClientImpact";

type AccountHealthSectionProps = {
  summary: AccountHealthSummary;
  items: AccountHealthItem[];
  onExportCsv: () => void;
};

function formatCurrency(value: number) {
  if (value === 0) return "NT$0";
  const sign = value < 0 ? "-" : "";
  return `${sign}NT$${Math.abs(value).toLocaleString("zh-TW")}`;
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function summaryBadgeClass(status: AccountHealthSummary["status"]) {
  if (status === "pass") return "bg-emerald-500/15 text-emerald-200";
  if (status === "watch") return "bg-amber-500/15 text-amber-200";
  return "bg-rose-500/15 text-rose-200";
}

function impactBadgeClass(severity: DataProductClientImpactSeverity) {
  if (severity === "none") return "bg-emerald-500/15 text-emerald-200";
  if (severity === "watch") return "bg-amber-500/15 text-amber-200";
  return "bg-rose-500/15 text-rose-200";
}

function impactLabel(severity: DataProductClientImpactSeverity) {
  if (severity === "critical") return "重大";
  if (severity === "watch") return "觀察";
  return "無影響";
}

function rowClass(stage: AccountHealthStage) {
  if (stage === "risk") return "border-rose-500/20 bg-rose-950/10";
  if (stage === "watch") return "border-amber-500/20 bg-amber-950/10";
  if (stage === "expand") return "border-sky-500/15 bg-sky-950/10";
  return "border-emerald-500/15 bg-emerald-950/10";
}

export function AccountHealthSection({
  summary,
  items,
  onExportCsv: handleExportCsv,
}: AccountHealthSectionProps) {
  const metrics = [
    ["帳戶", `${summary.accountCount}`],
    ["風險", `${summary.riskCount}`],
    ["擴售", `${summary.expansionCount}`],
    ["受產品影響", `${summary.impactedAccountCount}`],
    ["目前 MRR", formatCurrency(summary.currentMrr)],
    ["流失風險", formatCurrency(summary.churnRiskMrr)],
    ["擴售機會", formatCurrency(summary.expansionMrr)],
    ["淨機會", formatCurrency(summary.netMrrOpportunity)],
  ];

  return (
    <div className="border-t border-slate-800 pt-3 space-y-3">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-xs font-bold text-slate-100">Account Health 續約風險</h4>
            <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${summaryBadgeClass(summary.status)}`}>
              {accountHealthStatusLabel(summary.status)}
            </span>
          </div>
          <p className="mt-0.5 text-[11px] text-slate-500">
            合併工作區、帳務、客戶成功、收入預測與資料產品影響，形成客戶續約與擴售優先順序
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2 text-xs">
          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-2">
            {metrics.map(([label, value]) => (
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
            Account Health CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
        {items.slice(0, 3).map((item) => (
          <div key={`${item.workspace}-priority`} className={`rounded-lg border p-3 ${rowClass(item.stage)}`}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-bold text-slate-100">{item.workspace}</p>
                <p className="mt-0.5 text-[10px] text-slate-600">{item.segment} · {item.plan}</p>
              </div>
              <span className={`rounded border px-2 py-0.5 text-[10px] font-bold ${accountHealthStageClass(item.stage)}`}>
                {accountHealthStageLabel(item.stage)}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-right">
              <div>
                <p className="text-[10px] text-slate-600">健康</p>
                <p className="font-mono text-sm font-bold text-slate-100">{item.healthScore}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-600">續約</p>
                <p className="font-mono text-sm font-bold text-slate-100">{formatPercent(item.renewalProbability)}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-600">淨機會</p>
                <p className={`font-mono text-sm font-bold ${item.netMrrOpportunity < 0 ? "text-rose-200" : "text-emerald-200"}`}>
                  {formatCurrency(item.netMrrOpportunity)}
                </p>
              </div>
            </div>
            <p className="mt-3 text-[11px] text-slate-500">{item.nextAction}</p>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-800">
        <table className="w-full min-w-[1600px] text-xs">
          <thead className="bg-slate-900/80">
            <tr className="text-left text-[11px] text-slate-600">
              <th className="py-2 px-3 font-medium">Workspace</th>
              <th className="py-2 px-3 font-medium text-right">狀態</th>
              <th className="py-2 px-3 font-medium text-right">健康</th>
              <th className="py-2 px-3 font-medium text-right">續約</th>
              <th className="py-2 px-3 font-medium text-right">目前 MRR</th>
              <th className="py-2 px-3 font-medium text-right">擴售</th>
              <th className="py-2 px-3 font-medium text-right">流失風險</th>
              <th className="py-2 px-3 font-medium text-right">預估 MRR</th>
              <th className="py-2 px-3 font-medium">產品影響</th>
              <th className="py-2 px-3 font-medium">席位 / API</th>
              <th className="py-2 px-3 font-medium">Owner</th>
              <th className="py-2 px-3 font-medium">風險因子</th>
              <th className="py-2 px-3 font-medium">下一步</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={`${item.workspace}-account-health`} className={`border-t ${rowClass(item.stage)}`}>
                <td className="py-2 px-3">
                  <p className="font-bold text-slate-100">{item.workspace}</p>
                  <p className="mt-0.5 text-[10px] text-slate-600">{item.segment} · {item.plan}</p>
                </td>
                <td className="py-2 px-3 text-right">
                  <span className={`rounded border px-2 py-0.5 text-[10px] font-bold ${accountHealthStageClass(item.stage)}`}>
                    {accountHealthStageLabel(item.stage)}
                  </span>
                </td>
                <td className="py-2 px-3 text-right font-mono text-slate-300">{item.healthScore}</td>
                <td className="py-2 px-3 text-right font-mono text-slate-300">{formatPercent(item.renewalProbability)}</td>
                <td className="py-2 px-3 text-right font-mono text-slate-300">{formatCurrency(item.currentMrr)}</td>
                <td className="py-2 px-3 text-right font-mono text-sky-200">{formatCurrency(item.expansionMrr)}</td>
                <td className="py-2 px-3 text-right font-mono text-rose-200">{formatCurrency(item.churnRiskMrr)}</td>
                <td className="py-2 px-3 text-right font-mono text-slate-300">{formatCurrency(item.projectedMrr)}</td>
                <td className="py-2 px-3">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${impactBadgeClass(item.productImpactSeverity)}`}>
                    {impactLabel(item.productImpactSeverity)}
                  </span>
                  <p className="mt-1 text-[10px] text-slate-500">{item.impactedProducts.slice(0, 2).join(" / ") || "--"}</p>
                </td>
                <td className="py-2 px-3 text-slate-500">
                  <p>{item.seatUsage}</p>
                  <p className="mt-0.5 text-[10px] text-slate-600">{item.apiUsage}</p>
                </td>
                <td className="py-2 px-3 text-slate-400">{item.owner}</td>
                <td className="py-2 px-3 text-slate-500">{item.riskDrivers.join(" / ")}</td>
                <td className="py-2 px-3 text-slate-500">{item.nextAction}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
