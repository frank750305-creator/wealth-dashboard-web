import type { DecisionFunnelStage } from "@/lib/operatingControlWorkflow";
import type { ExecutionReviewStatus } from "@/lib/tradeExecutionWorkflow";

type DecisionFunnelSectionProps = {
  decisionFunnelDecision: ExecutionReviewStatus;
  onExportDecisionFunnelCsv: () => void;
  decisionFunnelStages: DecisionFunnelStage[];
  decisionFunnelBlockCount: number;
  decisionFunnelWatchCount: number;
  candidateVisibleCount: number;
  activeAllocationCount: number;
  tradeTicketCount: number;
  filledTradeCount: number;
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

function funnelProgressWidth(stage: DecisionFunnelStage) {
  if (stage.conversion.endsWith("%")) {
    return `${Math.min(100, Math.max(0, Number(stage.conversion.replace("%", ""))))}%`;
  }

  if (stage.status === "pass") return "100%";
  if (stage.status === "watch") return "55%";
  return "20%";
}

export function DecisionFunnelSection({
  decisionFunnelDecision,
  onExportDecisionFunnelCsv,
  decisionFunnelStages,
  decisionFunnelBlockCount,
  decisionFunnelWatchCount,
  candidateVisibleCount,
  activeAllocationCount,
  tradeTicketCount,
  filledTradeCount,
}: DecisionFunnelSectionProps) {
  return (
    <div className="border-t border-slate-800 pt-3 space-y-3">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h5 className="text-xs font-bold text-slate-100">資料到交易決策漏斗</h5>
            <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${executionReviewBadgeClass(decisionFunnelDecision)}`}>
              {executionReviewLabel(decisionFunnelDecision)}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            從 BigQuery 商品池一路追蹤到研究、配置、交易、成交、KRI 放行與例外關閉
          </p>
        </div>
        <button
          onClick={onExportDecisionFunnelCsv}
          disabled={!decisionFunnelStages.length}
          className="px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-bold disabled:cursor-not-allowed disabled:bg-slate-950 disabled:text-slate-600"
        >
          漏斗 CSV
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
        {[
          ["漏斗狀態", executionReviewLabel(decisionFunnelDecision)],
          ["暫停 / 觀察", `${decisionFunnelBlockCount} / ${decisionFunnelWatchCount}`],
          ["候選 / 配置", `${candidateVisibleCount} / ${activeAllocationCount}`],
          ["交易 / 成交", `${tradeTicketCount} / ${filledTradeCount}`],
        ].map(([label, value]) => (
          <div key={label} className="rounded-md border border-slate-800 bg-slate-900/70 p-3 min-w-0">
            <p className="text-[11px] text-slate-600 truncate">{label}</p>
            <p className="mt-1 font-mono text-sm font-bold text-slate-100 truncate" title={value}>
              {value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        {decisionFunnelStages.map((stage) => (
          <div key={stage.label} className={`rounded-md border p-3 text-xs ${executionReviewRowClass(stage.status)}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-bold text-slate-100 truncate">{stage.label}</p>
                <p className="mt-1 font-mono text-sm text-slate-200">{stage.value}</p>
              </div>
              <span className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-bold ${executionReviewBadgeClass(stage.status)}`}>
                {executionReviewLabel(stage.status)}
              </span>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-950">
              <div
                className={`h-full rounded-full ${stage.status === "block" ? "bg-rose-400" : stage.status === "watch" ? "bg-amber-300" : "bg-emerald-400"}`}
                style={{ width: funnelProgressWidth(stage) }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between gap-2 text-[11px]">
              <span className="text-slate-500 truncate" title={stage.owner}>
                {stage.owner}
              </span>
              <span className="font-mono text-slate-300">{stage.conversion}</span>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-slate-500">{stage.note}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
