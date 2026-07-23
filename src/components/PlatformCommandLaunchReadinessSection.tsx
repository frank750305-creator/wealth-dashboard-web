import {
  platformCommandLaunchReadinessSignalLabel,
  platformCommandLaunchReadinessStateLabel,
  type PlatformCommandLaunchReadinessItem,
  type PlatformCommandLaunchReadinessState,
  type PlatformCommandLaunchReadinessSummary,
} from "@/lib/platformCommandLaunchReadiness";
import type { PlatformCommandProductNavigatorActiveArea } from "@/lib/platformCommandProductNavigator";
import { platformCommandStatusLabel } from "@/lib/platformCommandSearch";

type PlatformCommandLaunchReadinessSectionProps = {
  summary: PlatformCommandLaunchReadinessSummary;
  items: PlatformCommandLaunchReadinessItem[];
  onSelectArea: (areaId: PlatformCommandProductNavigatorActiveArea) => void;
};

function stateBadgeClass(state: PlatformCommandLaunchReadinessState) {
  if (state === "blocked") return "bg-rose-500/15 text-rose-200";
  if (state === "conditional") return "bg-amber-500/15 text-amber-200";
  if (state === "ready") return "bg-cyan-500/15 text-cyan-200";
  return "bg-emerald-500/15 text-emerald-200";
}

function statusBadgeClass(status: PlatformCommandLaunchReadinessSummary["status"]) {
  if (status === "pass") return "bg-emerald-500/15 text-emerald-200";
  if (status === "watch") return "bg-amber-500/15 text-amber-200";
  return "bg-rose-500/15 text-rose-200";
}

function scoreClass(score: number) {
  if (score < 70) return "text-rose-200";
  if (score < 90) return "text-amber-200";
  return "text-emerald-200";
}

export function PlatformCommandLaunchReadinessSection({
  summary,
  items,
  onSelectArea: handleSelectArea,
}: PlatformCommandLaunchReadinessSectionProps) {
  const metrics = [
    ["Platform", `${summary.platformCompletion}%`],
    ["Operating", `${summary.operatingReadinessScore}%`],
    ["Checks", `${summary.itemCount}`],
    ["Blocked", `${summary.blockedCount}`],
    ["Review", `${summary.conditionalCount}`],
    ["Ready", `${summary.readyCount}`],
    ["Complete", `${summary.completeCount}`],
  ];

  return (
    <div id="command-launch-readiness" className="rounded-lg border border-slate-800 bg-slate-950 p-4 space-y-4">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-sm font-bold text-slate-100">Launch Readiness 完成判斷台</h4>
            <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${statusBadgeClass(summary.status)}`}>
              {platformCommandStatusLabel(summary.status)}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            把六個 Command 產品區域收斂成一張上線檢查表，明確標出可展示、需複核與暫停項
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-2 text-xs">
          {metrics.map(([label, value]) => (
            <div key={label} className="rounded-md border border-slate-800 bg-slate-900/70 px-3 py-2 text-right">
              <p className="text-[10px] text-slate-600">{label}</p>
              <p className="mt-0.5 font-mono font-bold text-slate-100">{value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-3">
        <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3">
          <p className="text-[10px] font-mono text-slate-600">LAUNCH DECISION</p>
          <p className="mt-1 text-sm font-bold text-slate-100">{summary.launchDecision}</p>
          <p className="mt-1 text-xs text-slate-500">
            Platform 是產品骨架完整度；Operating 是目前各區域資料與流程 Gate 的可運作分數。
          </p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3 text-right">
          <p className="text-[10px] font-mono text-slate-600">WEB MVP</p>
          <p className={`mt-1 font-mono text-3xl font-black ${scoreClass(summary.platformCompletion)}`}>
            {summary.platformCompletion}%
          </p>
          <p className="mt-1 text-[11px] text-slate-500">產品入口、治理、收入、管理與輸出層</p>
        </div>
      </div>

      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.checkId} className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[10px] text-slate-600">{item.checkId}</span>
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${stateBadgeClass(item.state)}`}>
                    {platformCommandLaunchReadinessStateLabel(item.state)}
                  </span>
                  <span className="rounded bg-slate-950 px-2 py-0.5 text-[10px] font-bold text-slate-400">
                    {platformCommandLaunchReadinessSignalLabel(item.signal)}
                  </span>
                </div>
                <h5 className="mt-1 text-xs font-bold text-slate-100">{item.title}</h5>
                <p className="mt-1 text-[11px] text-slate-500">{item.evidence}</p>
              </div>
              <div className="flex flex-row lg:flex-col items-center lg:items-end gap-2">
                <p className={`font-mono text-lg font-black ${scoreClass(item.score)}`}>{item.score}%</p>
                <button
                  type="button"
                  onClick={() => handleSelectArea(item.areaId)}
                  className="rounded-md border border-slate-700 bg-slate-950 px-3 py-1.5 text-[11px] font-bold text-slate-200 hover:border-cyan-700 hover:text-cyan-100"
                >
                  {item.areaId === "all" ? "查看全部" : "查看區域"}
                </button>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-1 lg:grid-cols-3 gap-2 text-[11px]">
              <div className="rounded-md bg-slate-950 px-3 py-2">
                <p className="text-[10px] text-slate-600">Owner</p>
                <p className="mt-0.5 font-bold text-slate-300">{item.owner}</p>
              </div>
              <div className="rounded-md bg-slate-950 px-3 py-2">
                <p className="text-[10px] text-slate-600">Decision Gate</p>
                <p className="mt-0.5 text-slate-300">{item.decisionGate}</p>
              </div>
              <div className="rounded-md bg-slate-950 px-3 py-2">
                <p className="text-[10px] text-slate-600">Next Action</p>
                <p className="mt-0.5 text-slate-300">{item.nextAction}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
