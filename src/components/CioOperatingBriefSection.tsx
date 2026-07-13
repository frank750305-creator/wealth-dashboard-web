import type { ExecutionReviewItem } from "@/lib/executionReviewWorkflow";
import type { ExecutionReviewStatus } from "@/lib/tradeExecutionWorkflow";

type CioOperatingBriefSectionProps = {
  cioOperatingDecision: ExecutionReviewStatus;
  onExportCioOperatingBriefCsv: () => void;
  cioOperatingBriefItems: ExecutionReviewItem[];
  candidateVisibleCount: number;
  tradeTicketCount: number;
  platformExceptionCount: number;
};

function executionReviewLabel(status: ExecutionReviewStatus) {
  if (status === "pass") return "通過";
  if (status === "watch") return "觀察";
  return "暫停";
}

function executionReviewBadgeClass(status: ExecutionReviewStatus) {
  if (status === "pass") return "bg-emerald-500/15 text-emerald-200 border border-emerald-500/30";
  if (status === "watch") return "bg-amber-500/15 text-amber-200 border border-amber-500/30";
  return "bg-rose-500/15 text-rose-200 border border-rose-500/30";
}

function executionReviewRowClass(status: ExecutionReviewStatus) {
  if (status === "pass") return "border-slate-900";
  if (status === "watch") return "border-amber-500/20 bg-amber-500/5";
  return "border-rose-500/20 bg-rose-500/5";
}

export function CioOperatingBriefSection({
  cioOperatingDecision,
  onExportCioOperatingBriefCsv,
  cioOperatingBriefItems,
  candidateVisibleCount,
  tradeTicketCount,
  platformExceptionCount,
}: CioOperatingBriefSectionProps) {
  return (
    <div className="border-t border-slate-800 pt-3 space-y-3">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h5 className="text-xs font-bold text-slate-100">CIO 營運總覽</h5>
            <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${executionReviewBadgeClass(cioOperatingDecision)}`}>
              {executionReviewLabel(cioOperatingDecision)}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            將資料、研究、配置、交易、成交、復盤與例外事項整合成高層決策摘要
          </p>
        </div>
        <button
          onClick={onExportCioOperatingBriefCsv}
          disabled={!cioOperatingBriefItems.length}
          className="px-3 py-2 rounded-md bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-100 text-xs font-bold disabled:cursor-not-allowed disabled:bg-slate-950 disabled:text-slate-600"
        >
          CIO CSV
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
        {[
          ["總覽狀態", executionReviewLabel(cioOperatingDecision)],
          ["候選標的", `${candidateVisibleCount} 檔`],
          ["送簽交易", `${tradeTicketCount} 檔`],
          ["待處理例外", `${platformExceptionCount} 項`],
        ].map(([label, value]) => (
          <div key={label} className="rounded-md border border-slate-800 bg-slate-900/70 p-3 min-w-0">
            <p className="text-[11px] text-slate-600 truncate">{label}</p>
            <p className="mt-1 font-mono text-sm font-bold text-slate-100 truncate" title={value}>
              {value}
            </p>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-xs">
          <thead>
            <tr className="text-left text-[11px] text-slate-600">
              <th className="py-2 px-3 font-medium">項目</th>
              <th className="py-2 px-3 font-medium text-right">狀態</th>
              <th className="py-2 px-3 font-medium text-right">目前值</th>
              <th className="py-2 px-3 font-medium">門檻</th>
              <th className="py-2 px-3 font-medium">下一步</th>
            </tr>
          </thead>
          <tbody>
            {cioOperatingBriefItems.map((item) => (
              <tr key={item.label} className={`border-t ${executionReviewRowClass(item.status)}`}>
                <td className="py-2 px-3 font-bold text-slate-100">{item.label}</td>
                <td className="py-2 px-3 text-right">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${executionReviewBadgeClass(item.status)}`}>
                    {executionReviewLabel(item.status)}
                  </span>
                </td>
                <td className="py-2 px-3 text-right font-mono text-slate-200">{item.value}</td>
                <td className="py-2 px-3 text-slate-400">{item.threshold}</td>
                <td className="py-2 px-3 text-slate-500">{item.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
