import {
  serviceStateLabel,
  type DataProductServiceState,
  type DataProductStatusPageItem,
  type DataProductStatusPageSummary,
} from "@/lib/dataProductStatusPage";

type DataProductStatusPageSectionProps = {
  summary: DataProductStatusPageSummary;
  items: DataProductStatusPageItem[];
  onExportCsv: () => void;
};

function serviceStateBadgeClass(state: DataProductServiceState) {
  if (state === "operational") return "bg-emerald-500/15 text-emerald-200";
  if (state === "degraded") return "bg-amber-500/15 text-amber-200";
  return "bg-rose-500/15 text-rose-200";
}

function serviceStateRowClass(state: DataProductServiceState) {
  if (state === "operational") return "border-emerald-500/15 bg-emerald-950/10";
  if (state === "degraded") return "border-amber-500/20 bg-amber-950/10";
  return "border-rose-500/20 bg-rose-950/10";
}

export function DataProductStatusPageSection({
  summary,
  items,
  onExportCsv: handleExportCsv,
}: DataProductStatusPageSectionProps) {
  return (
    <div className="border-t border-slate-800 pt-3 space-y-3">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-xs font-bold text-slate-100">資料產品狀態頁</h4>
            <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${serviceStateBadgeClass(summary.serviceState)}`}>
              {serviceStateLabel(summary.serviceState)}
            </span>
          </div>
          <p className="mt-0.5 text-[11px] text-slate-500">
            將 SLO、Action Queue 與客戶影響整理成可對內營運、對外通報的狀態頁
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2 text-xs">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              ["正常", `${summary.operationalCount}`],
              ["觀察", `${summary.degradedCount}`],
              ["Incident", `${summary.incidentCount}`],
              ["下次更新", summary.nextUpdate],
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
            狀態頁 CSV
          </button>
        </div>
      </div>

      <div className={`rounded-lg border p-3 text-xs ${serviceStateRowClass(summary.serviceState)}`}>
        <p className="font-bold text-slate-100">{summary.customerMessage}</p>
        <p className="mt-1 text-slate-500">資料產品數：{summary.productCount} · 下一次狀態更新：{summary.nextUpdate}</p>
      </div>

      {items.length ? (
        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full min-w-[1420px] text-xs">
            <thead className="bg-slate-900/80">
              <tr className="text-left text-[11px] text-slate-600">
                <th className="py-2 px-3 font-medium">資料產品</th>
                <th className="py-2 px-3 font-medium text-right">狀態頁</th>
                <th className="py-2 px-3 font-medium text-right">SLO</th>
                <th className="py-2 px-3 font-medium text-right">Action</th>
                <th className="py-2 px-3 font-medium">客戶影響</th>
                <th className="py-2 px-3 font-medium">下次更新</th>
                <th className="py-2 px-3 font-medium">Owner</th>
                <th className="py-2 px-3 font-medium">對外訊息</th>
                <th className="py-2 px-3 font-medium">內部備註</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={`${item.domain}-${item.product}-status-page`} className={`border-t ${serviceStateRowClass(item.serviceState)}`}>
                  <td className="py-2 px-3">
                    <p className="font-bold text-slate-100">{item.product}</p>
                    <p className="mt-0.5 text-[10px] text-slate-600">{item.domain}</p>
                  </td>
                  <td className="py-2 px-3 text-right">
                    <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${serviceStateBadgeClass(item.serviceState)}`}>
                      {serviceStateLabel(item.serviceState)}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-slate-100">{item.sloScore}</td>
                  <td className="py-2 px-3 text-right font-mono text-slate-300">{item.openActionCount}</td>
                  <td className="py-2 px-3 text-slate-400">{item.clientImpact}</td>
                  <td className="py-2 px-3 text-slate-400">{item.nextUpdate}</td>
                  <td className="py-2 px-3 text-slate-400">{item.owner}</td>
                  <td className="py-2 px-3 text-slate-500">{item.customerMessage}</td>
                  <td className="py-2 px-3 text-slate-500">{item.operatorNote}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-500">
          建立 SLO 與 reliability action 後，這裡會產生狀態頁摘要。
        </div>
      )}
    </div>
  );
}
