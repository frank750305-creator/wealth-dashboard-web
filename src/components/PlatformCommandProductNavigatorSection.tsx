import {
  type PlatformCommandProductNavigatorItem,
  type PlatformCommandProductNavigatorStatus,
  type PlatformCommandProductNavigatorSummary,
} from "@/lib/platformCommandProductNavigator";
import { platformCommandStatusLabel } from "@/lib/platformCommandSearch";

type PlatformCommandProductNavigatorSectionProps = {
  summary: PlatformCommandProductNavigatorSummary;
  items: PlatformCommandProductNavigatorItem[];
};

function statusBadgeClass(status: PlatformCommandProductNavigatorStatus) {
  if (status === "pass") return "bg-emerald-500/15 text-emerald-200";
  if (status === "watch") return "bg-amber-500/15 text-amber-200";
  return "bg-rose-500/15 text-rose-200";
}

function priorityText(item: PlatformCommandProductNavigatorItem) {
  if (item.priority === "critical") return "Critical";
  if (item.priority === "review") return "Review";
  return "Ready";
}

function scoreClass(score: number) {
  if (score < 60) return "text-rose-200";
  if (score < 85) return "text-amber-200";
  return "text-emerald-200";
}

export function PlatformCommandProductNavigatorSection({
  summary,
  items,
}: PlatformCommandProductNavigatorSectionProps) {
  const metrics = [
    ["Areas", `${summary.areaCount}`],
    ["Modules", `${summary.moduleCount}`],
    ["Records", `${summary.recordCount}`],
    ["Blocked", `${summary.blockCount}`],
    ["Watch", `${summary.watchCount}`],
    ["Pass", `${summary.passCount}`],
    ["Score", `${summary.averageCompletionScore}`],
    ["Focus", summary.recommendedFocus],
  ];

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 space-y-4">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-sm font-bold text-slate-100">Command Product Navigator 產品入口總覽</h4>
            <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${statusBadgeClass(summary.status)}`}>
              {platformCommandStatusLabel(summary.status)}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            把平台作戰流程收斂成六個可跳轉入口，讓使用者先看狀態、再進入需要處理的工作流
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-2 text-xs">
          {metrics.map(([label, value]) => (
            <div key={label} className="rounded-md border border-slate-800 bg-slate-900/70 px-3 py-2 text-right">
              <p className="text-[10px] text-slate-600">{label}</p>
              <p className="mt-0.5 font-mono font-bold text-slate-100">{value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
        {items.map((item) => (
          <a
            key={item.areaId}
            href={item.href}
            className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 hover:border-cyan-700/80 hover:bg-slate-900 transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-mono text-slate-600">{item.stage}</p>
                <h5 className="mt-0.5 text-xs font-bold text-slate-100">{item.title}</h5>
                <p className="mt-1 text-[11px] text-slate-500">{item.entryPoint}</p>
              </div>
              <div className="text-right">
                <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${statusBadgeClass(item.status)}`}>
                  {platformCommandStatusLabel(item.status)}
                </span>
                <p className="mt-2 text-[10px] text-slate-600">{priorityText(item)}</p>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-4 gap-2 text-right text-xs">
              <div>
                <p className="text-[10px] text-slate-600">Modules</p>
                <p className="font-mono font-bold text-slate-100">{item.moduleCount}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-600">Records</p>
                <p className="font-mono font-bold text-slate-100">{item.recordCount}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-600">Watch</p>
                <p className="font-mono font-bold text-amber-200">{item.watchCount}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-600">Score</p>
                <p className={`font-mono font-bold ${scoreClass(item.completionScore)}`}>{item.completionScore}</p>
              </div>
            </div>

            <p className="mt-3 text-[11px] text-slate-300">{item.narrative}</p>
            <p className="mt-1 text-[11px] text-amber-200">{item.nextAction}</p>
            <div className="mt-3 flex flex-wrap gap-1">
              {item.modules.map((module) => (
                <span key={`${item.areaId}-${module}`} className="rounded bg-slate-950 px-2 py-1 text-[10px] text-slate-400">
                  {module}
                </span>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between text-[10px] text-slate-600">
              <span>{item.owner}</span>
              <span>Jump</span>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
