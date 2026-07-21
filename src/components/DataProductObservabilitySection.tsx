import type {
  DataProductObservabilityItem,
  DataProductObservabilityStatus,
  DataProductObservabilitySummary,
} from "@/lib/dataProductObservability";

type DataProductObservabilitySectionProps = {
  summary: DataProductObservabilitySummary;
  items: DataProductObservabilityItem[];
  onExportCsv: () => void;
};

function statusLabel(status: DataProductObservabilityStatus) {
  if (status === "pass") return "通過";
  if (status === "watch") return "觀察";
  return "暫停";
}

function statusBadgeClass(status: DataProductObservabilityStatus) {
  if (status === "pass") return "bg-emerald-500/15 text-emerald-200";
  if (status === "watch") return "bg-amber-500/15 text-amber-200";
  return "bg-rose-500/15 text-rose-200";
}

function statusRowClass(status: DataProductObservabilityStatus) {
  if (status === "pass") return "border-emerald-500/15 bg-emerald-950/10";
  if (status === "watch") return "border-amber-500/20 bg-amber-950/10";
  return "border-rose-500/20 bg-rose-950/10";
}

function formatPercent(value: number | null) {
  return typeof value === "number" && Number.isFinite(value) ? `${(value * 100).toFixed(1)}%` : "--";
}

export function DataProductObservabilitySection({
  summary,
  items,
  onExportCsv: handleExportCsv,
}: DataProductObservabilitySectionProps) {
  return (
    <div className="border-t border-slate-800 pt-3 space-y-3">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-xs font-bold text-slate-100">資料產品可觀測性</h4>
            <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${statusBadgeClass(summary.decision)}`}>
              {statusLabel(summary.decision)}
            </span>
          </div>
          <p className="mt-0.5 text-[11px] text-slate-500">
            把資料產品、API、BigQuery 落庫數、同步稽核與責任人接成營運健康表
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2 text-xs">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              ["產品", `${summary.productCount}`],
              ["已落庫", `${summary.warehouseBackedCount}`],
              ["阻擋", `${summary.blockCount}`],
              ["平均覆蓋", formatPercent(summary.averageCoveragePercent)],
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
            可觀測性 CSV
          </button>
        </div>
      </div>

      {items.length ? (
        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full min-w-[1380px] text-xs">
            <thead className="bg-slate-900/80">
              <tr className="text-left text-[11px] text-slate-600">
                <th className="py-2 px-3 font-medium">領域</th>
                <th className="py-2 px-3 font-medium">資料產品</th>
                <th className="py-2 px-3 font-medium text-right">狀態</th>
                <th className="py-2 px-3 font-medium text-right">落庫覆蓋</th>
                <th className="py-2 px-3 font-medium text-right">前端產出</th>
                <th className="py-2 px-3 font-medium text-right">BigQuery</th>
                <th className="py-2 px-3 font-medium">API</th>
                <th className="py-2 px-3 font-medium">稽核</th>
                <th className="py-2 px-3 font-medium">Owner</th>
                <th className="py-2 px-3 font-medium">動作</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={`${item.domain}-${item.product}`} className={`border-t ${statusRowClass(item.status)}`}>
                  <td className="py-2 px-3 text-slate-400">{item.domain}</td>
                  <td className="py-2 px-3">
                    <p className="font-bold text-slate-100">{item.product}</p>
                    <p className="mt-0.5 text-[10px] text-slate-600">{item.evidence}</p>
                  </td>
                  <td className="py-2 px-3 text-right">
                    <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${statusBadgeClass(item.status)}`}>
                      {statusLabel(item.status)}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-slate-100">{formatPercent(item.coveragePercent)}</td>
                  <td className="py-2 px-3 text-right font-mono text-slate-300">{item.generatedRecords.toLocaleString("zh-TW")}</td>
                  <td className="py-2 px-3 text-right font-mono text-slate-300">{item.warehouseRecords.toLocaleString("zh-TW")}</td>
                  <td className="py-2 px-3 font-mono text-[11px] text-slate-400">{item.apiCoverage}</td>
                  <td className="py-2 px-3 text-slate-500">{item.auditTrail}</td>
                  <td className="py-2 px-3 text-slate-400">{item.owner}</td>
                  <td className="py-2 px-3 text-slate-500">{item.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-500">
          建立資料產品與 API 目錄後，這裡會顯示端到端可觀測性。
        </div>
      )}
    </div>
  );
}
