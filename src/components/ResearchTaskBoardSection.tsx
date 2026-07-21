import {
  researchTaskLaneLabel,
  researchTaskPriorityLabel,
  researchTaskStatusLabel,
  type ResearchTaskItem,
  type ResearchTaskPriority,
  type ResearchTaskStatus,
  type ResearchTaskSummary,
} from "@/lib/researchTaskWorkflow";

type ResearchTaskBoardSectionProps = {
  tasks: ResearchTaskItem[];
  summary: ResearchTaskSummary;
  onExportResearchTaskCsv: () => void;
};

function statusBadgeClass(status: ResearchTaskStatus) {
  if (status === "blocked") return "bg-rose-500/15 text-rose-200 border-rose-500/30";
  if (status === "active") return "bg-amber-500/15 text-amber-200 border-amber-500/30";
  if (status === "ready") return "bg-cyan-500/15 text-cyan-200 border-cyan-500/30";
  return "bg-emerald-500/15 text-emerald-200 border-emerald-500/30";
}

function statusPanelClass(status: ResearchTaskStatus) {
  if (status === "blocked") return "border-rose-500/25 bg-rose-950/10";
  if (status === "active") return "border-amber-500/25 bg-amber-950/10";
  if (status === "ready") return "border-cyan-500/20 bg-cyan-950/10";
  return "border-emerald-500/20 bg-emerald-950/10";
}

function priorityBadgeClass(priority: ResearchTaskPriority) {
  if (priority === "high") return "bg-rose-500/15 text-rose-200 border-rose-500/30";
  if (priority === "medium") return "bg-amber-500/15 text-amber-200 border-amber-500/30";
  return "bg-slate-800 text-slate-300 border-slate-700";
}

export function ResearchTaskBoardSection({
  tasks,
  summary,
  onExportResearchTaskCsv,
}: ResearchTaskBoardSectionProps) {
  return (
    <section className="rounded-lg border border-slate-800 bg-slate-900/50 p-3 space-y-3">
      <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-xs font-bold text-slate-100">研究任務工作台</h4>
            <span className={`rounded border px-2 py-0.5 text-[10px] font-bold ${statusBadgeClass(summary.status)}`}>
              {researchTaskStatusLabel(summary.status)}
            </span>
            <span className={`rounded border px-2 py-0.5 text-[10px] font-bold ${priorityBadgeClass(summary.priority)}`}>
              {researchTaskPriorityLabel(summary.priority)}
            </span>
          </div>
          <p className="mt-2 text-sm font-bold text-slate-100">{summary.headline}</p>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
            負責：{summary.focusOwner} · {summary.nextAction}
          </p>
        </div>
        <button
          onClick={onExportResearchTaskCsv}
          disabled={!tasks.length}
          className="self-start xl:self-auto px-3 py-2 rounded-md bg-cyan-700 hover:bg-cyan-600 text-white text-xs font-bold disabled:cursor-not-allowed disabled:bg-slate-950 disabled:text-slate-600"
        >
          任務 CSV
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
        {[
          ["總任務", summary.total],
          ["阻塞", summary.blocked],
          ["進行中", summary.active],
          ["待覆核", summary.ready],
          ["完成", summary.done],
        ].map(([label, value]) => (
          <div key={label} className="rounded-md border border-slate-800 bg-slate-950/70 p-3 min-w-0">
            <p className="text-[11px] text-slate-600 truncate">{label}</p>
            <p className="mt-1 font-mono text-sm font-bold text-slate-100">{value}</p>
          </div>
        ))}
      </div>

      {tasks.length ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-2 text-xs">
          {tasks.slice(0, 8).map((task) => (
            <div key={task.id} className={`rounded-md border p-3 min-w-0 ${statusPanelClass(task.status)}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold text-slate-100 truncate">{task.title}</p>
                  <p className="mt-1 text-[11px] text-slate-500 truncate">
                    {researchTaskLaneLabel(task.lane)} · {task.owner} · {task.source}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className={`rounded border px-2 py-0.5 text-[10px] font-bold ${priorityBadgeClass(task.priority)}`}>
                    {researchTaskPriorityLabel(task.priority)}
                  </span>
                  <span className={`rounded border px-2 py-0.5 text-[10px] font-bold ${statusBadgeClass(task.status)}`}>
                    {researchTaskStatusLabel(task.status)}
                  </span>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-1 md:grid-cols-[0.8fr_1.2fr] gap-2">
                <div className="rounded bg-slate-950/70 p-2">
                  <p className="text-[10px] font-bold text-slate-500">依據</p>
                  <p className="mt-1 font-mono text-[11px] leading-relaxed text-slate-400">{task.evidence}</p>
                </div>
                <div className="rounded bg-slate-950/70 p-2">
                  <p className="text-[10px] font-bold text-slate-500">下一步</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-slate-400">{task.nextAction}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-500">
          目前沒有研究任務。
        </div>
      )}
    </section>
  );
}
