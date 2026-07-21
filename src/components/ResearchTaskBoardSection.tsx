import {
  researchTaskLaneLabel,
  researchTaskPriorityLabel,
  researchTaskStatusLabel,
  type ResearchTaskLifecycle,
  type ResearchTaskItem,
  type ResearchTaskOverride,
  type ResearchTaskPriority,
  type ResearchTaskStatus,
  type ResearchTaskSummary,
} from "@/lib/researchTaskWorkflow";

type ResearchTaskBoardSectionProps = {
  tasks: ResearchTaskItem[];
  summary: ResearchTaskSummary;
  lifecycle: ResearchTaskLifecycle;
  taskOverrides: ResearchTaskOverride[];
  hasBigQueryCredentials: boolean;
  workspaceId: string;
  warehouseTable?: string;
  warehouseError: string;
  syncStatus: "idle" | "syncing" | "loading" | "synced" | "loaded" | "error";
  syncMessage: string;
  onWorkspaceIdChange: (value: string) => void;
  onTaskOverrideChange: (
    taskId: string,
    patch: Partial<Pick<ResearchTaskOverride, "status" | "owner" | "note">>,
  ) => void;
  onResetTaskOverride: (taskId: string) => void;
  onSyncResearchTasksToBigQuery: () => void;
  onLoadResearchTasksFromBigQuery: () => void;
  onExportResearchTaskCsv: () => void;
  onExportResearchTaskLifecycleCsv: () => void;
  onExportResearchTaskSyncJson: () => void;
  onExportResearchTaskBigQueryDdl: () => void;
  onExportResearchTaskSchemaJson: () => void;
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
  lifecycle,
  taskOverrides,
  hasBigQueryCredentials,
  workspaceId,
  warehouseTable,
  warehouseError,
  syncStatus,
  syncMessage,
  onWorkspaceIdChange,
  onTaskOverrideChange,
  onResetTaskOverride,
  onSyncResearchTasksToBigQuery,
  onLoadResearchTasksFromBigQuery,
  onExportResearchTaskCsv,
  onExportResearchTaskLifecycleCsv,
  onExportResearchTaskSyncJson,
  onExportResearchTaskBigQueryDdl,
  onExportResearchTaskSchemaJson,
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
        <div className="flex flex-wrap gap-2">
          <input
            value={workspaceId}
            onChange={(event) => onWorkspaceIdChange(event.target.value)}
            placeholder="workspace"
            className="min-w-[150px] rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-xs font-mono text-slate-100 outline-none placeholder:text-slate-700 focus:border-cyan-600"
          />
          <button
            onClick={onSyncResearchTasksToBigQuery}
            disabled={!hasBigQueryCredentials || !tasks.length || syncStatus === "syncing" || syncStatus === "loading"}
            className="px-3 py-2 rounded-md bg-cyan-700 hover:bg-cyan-600 text-white text-xs font-bold disabled:cursor-not-allowed disabled:bg-slate-950 disabled:text-slate-600"
          >
            {syncStatus === "syncing" ? "同步中" : "同步 BigQuery"}
          </button>
          <button
            onClick={onLoadResearchTasksFromBigQuery}
            disabled={!hasBigQueryCredentials || syncStatus === "syncing" || syncStatus === "loading"}
            className="px-3 py-2 rounded-md bg-sky-700 hover:bg-sky-600 text-white text-xs font-bold disabled:cursor-not-allowed disabled:bg-slate-950 disabled:text-slate-600"
          >
            {syncStatus === "loading" ? "載入中" : "載入 BigQuery"}
          </button>
          <button
            onClick={onExportResearchTaskSyncJson}
            disabled={!tasks.length}
            className="px-3 py-2 rounded-md bg-indigo-700 hover:bg-indigo-600 text-white text-xs font-bold disabled:cursor-not-allowed disabled:bg-slate-950 disabled:text-slate-600"
          >
            同步 JSON
          </button>
          <button
            onClick={onExportResearchTaskBigQueryDdl}
            className="px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-bold"
          >
            BigQuery DDL
          </button>
          <button
            onClick={onExportResearchTaskSchemaJson}
            className="px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-bold"
          >
            Schema JSON
          </button>
          <button
            onClick={onExportResearchTaskLifecycleCsv}
            className="px-3 py-2 rounded-md bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold"
          >
            生命週期 CSV
          </button>
          <button
            onClick={onExportResearchTaskCsv}
            disabled={!tasks.length}
            className="px-3 py-2 rounded-md bg-cyan-700 hover:bg-cyan-600 text-white text-xs font-bold disabled:cursor-not-allowed disabled:bg-slate-950 disabled:text-slate-600"
          >
            任務 CSV
          </button>
        </div>
      </div>
      {syncMessage ? (
        <p className={`text-[11px] ${syncStatus === "error" ? "text-rose-300" : "text-slate-500"}`}>
          {syncMessage}
        </p>
      ) : null}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
        <div className="rounded-md border border-slate-800 bg-slate-950/60 p-2 min-w-0">
          <p className="text-[10px] text-slate-600">Workspace</p>
          <p className="mt-1 truncate font-mono font-bold text-slate-100">{workspaceId.trim() || "default"}</p>
        </div>
        <div className="rounded-md border border-slate-800 bg-slate-950/60 p-2 min-w-0">
          <p className="text-[10px] text-slate-600">BigQuery Table</p>
          <p className="mt-1 truncate font-mono font-bold text-slate-100">{warehouseTable || "--"}</p>
        </div>
        <div className="rounded-md border border-slate-800 bg-slate-950/60 p-2 min-w-0">
          <p className="text-[10px] text-slate-600">Warehouse</p>
          <p className={`mt-1 truncate font-bold ${warehouseError ? "text-rose-300" : hasBigQueryCredentials ? "text-emerald-300" : "text-amber-300"}`}>
            {warehouseError || (hasBigQueryCredentials ? "Ready" : "Missing credentials")}
          </p>
        </div>
      </div>

      <div className={`rounded-md border p-3 ${statusPanelClass(lifecycle.gateStatus)}`}>
        <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-bold text-slate-100">生命週期 Gate</p>
              <span className={`rounded border px-2 py-0.5 text-[10px] font-bold ${statusBadgeClass(lifecycle.gateStatus)}`}>
                {lifecycle.gateLabel}
              </span>
            </div>
            <p className="mt-2 text-sm font-bold text-slate-100">{lifecycle.decision}</p>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{lifecycle.releaseCondition}</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs xl:min-w-[520px]">
            {[
              ["目前階段", lifecycle.activeStage],
              ["阻塞", lifecycle.blockerCount],
              ["待覆核", lifecycle.readyCount],
              ["稽核紀錄", lifecycle.auditRecords.length],
            ].map(([label, value]) => (
              <div key={label} className="rounded bg-slate-950/70 px-2 py-2 min-w-0">
                <p className="text-[10px] text-slate-600 truncate">{label}</p>
                <p className="mt-1 font-mono font-bold text-slate-100 truncate" title={String(value)}>
                  {value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-2 text-xs">
        {lifecycle.stages.map((stage) => (
          <div key={stage.id} className={`rounded-md border p-3 min-w-0 ${statusPanelClass(stage.status)}`}>
            <div className="flex items-center justify-between gap-2">
              <p className="font-bold text-slate-100 truncate">{stage.label}</p>
              <span className={`shrink-0 rounded border px-2 py-0.5 text-[10px] font-bold ${statusBadgeClass(stage.status)}`}>
                {researchTaskStatusLabel(stage.status)}
              </span>
            </div>
            <p className="mt-2 text-[11px] text-slate-500 truncate">{stage.owner}</p>
            <p className="mt-1 font-mono text-[11px] text-slate-400 truncate" title={stage.evidence}>
              {stage.evidence}
            </p>
            <p className="mt-2 text-[11px] leading-relaxed text-slate-500">{stage.exitCriteria}</p>
          </div>
        ))}
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
          {tasks.slice(0, 6).map((task) => {
            const override = taskOverrides.find((item) => item.taskId === task.id);

            return (
              <div key={task.id} className={`rounded-md border p-3 min-w-0 ${statusPanelClass(task.status)}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-slate-100 truncate">{task.title}</p>
                      {task.isManualOverride ? (
                        <span className="rounded bg-cyan-500/15 px-2 py-0.5 text-[10px] font-bold text-cyan-200">
                          手動
                        </span>
                      ) : null}
                    </div>
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
                <div className="mt-3 grid grid-cols-1 md:grid-cols-[130px_1fr_auto] gap-2">
                  <select
                    value={task.status}
                    onChange={(event) => onTaskOverrideChange(task.id, { status: event.target.value as ResearchTaskStatus })}
                    className="rounded-md border border-slate-800 bg-slate-950 px-2 py-2 text-slate-100"
                  >
                    <option value="blocked">阻塞</option>
                    <option value="active">進行中</option>
                    <option value="ready">待覆核</option>
                    <option value="done">完成</option>
                  </select>
                  <input
                    value={task.owner}
                    onChange={(event) => onTaskOverrideChange(task.id, { owner: event.target.value })}
                    placeholder="負責人"
                    className="rounded-md border border-slate-800 bg-slate-950 px-2 py-2 text-slate-100 outline-none focus:border-cyan-600"
                  />
                  <button
                    onClick={() => onResetTaskOverride(task.id)}
                    disabled={!override}
                    className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 font-bold text-slate-300 hover:border-cyan-600 disabled:cursor-not-allowed disabled:text-slate-700"
                  >
                    重設
                  </button>
                </div>
                <input
                  value={task.manualNote ?? ""}
                  onChange={(event) => onTaskOverrideChange(task.id, { note: event.target.value })}
                  placeholder="人工備註"
                  className="mt-2 w-full rounded-md border border-slate-800 bg-slate-950 px-2 py-2 text-slate-100 outline-none placeholder:text-slate-700 focus:border-cyan-600"
                />
                {task.manuallyUpdatedAt ? (
                  <p className="mt-2 text-[10px] text-slate-600">更新：{task.manuallyUpdatedAt.slice(0, 19)}</p>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-500">
          目前沒有研究任務。
        </div>
      )}

      {lifecycle.auditRecords.length ? (
        <div className="rounded-md border border-slate-800 bg-slate-950/60 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-bold text-slate-100">稽核紀錄</p>
            <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-300">
              {lifecycle.auditRecords.length} 筆
            </span>
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[760px] text-xs">
              <thead>
                <tr className="text-left text-[11px] text-slate-600">
                  <th className="py-2 pr-3 font-medium">Time</th>
                  <th className="py-2 px-3 font-medium">Actor</th>
                  <th className="py-2 px-3 font-medium">Action</th>
                  <th className="py-2 px-3 font-medium text-right">Status</th>
                  <th className="py-2 pl-3 font-medium">Evidence</th>
                </tr>
              </thead>
              <tbody>
                {lifecycle.auditRecords.slice(0, 6).map((record, index) => (
                  <tr key={`${record.timestamp}-${record.action}-${index}`} className="border-t border-slate-800">
                    <td className="py-2 pr-3 font-mono text-slate-400">{record.timestamp.slice(0, 19)}</td>
                    <td className="py-2 px-3 text-slate-300">{record.actor}</td>
                    <td className="py-2 px-3 text-slate-200">{record.action}</td>
                    <td className="py-2 px-3 text-right">
                      <span className={`rounded border px-2 py-0.5 text-[10px] font-bold ${statusBadgeClass(record.status)}`}>
                        {researchTaskStatusLabel(record.status)}
                      </span>
                    </td>
                    <td className="py-2 pl-3 font-mono text-slate-500">{record.evidence}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </section>
  );
}
