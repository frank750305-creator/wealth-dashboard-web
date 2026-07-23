import { useMemo, useState } from "react";
import {
  platformCommandCategoryLabel,
  platformCommandPriorityLabel,
  platformCommandStatusLabel,
  type PlatformCommandCategory,
  type PlatformCommandPriority,
  type PlatformCommandSearchItem,
  type PlatformCommandSearchSummary,
} from "@/lib/platformCommandSearch";

type PlatformCommandSearchSectionProps = {
  summary: PlatformCommandSearchSummary;
  items: PlatformCommandSearchItem[];
  onExportCsv: () => void;
};

const categoryFilters: Array<"all" | PlatformCommandCategory> = ["all", "action", "account", "data_product", "api", "source"];

function priorityBadgeClass(priority: PlatformCommandPriority) {
  if (priority === "critical") return "bg-rose-500/15 text-rose-200";
  if (priority === "high") return "bg-amber-500/15 text-amber-200";
  if (priority === "medium") return "bg-sky-500/15 text-sky-200";
  return "bg-slate-700/60 text-slate-300";
}

function statusBadgeClass(status: PlatformCommandSearchItem["status"]) {
  if (status === "pass") return "bg-emerald-500/15 text-emerald-200";
  if (status === "watch") return "bg-amber-500/15 text-amber-200";
  return "bg-rose-500/15 text-rose-200";
}

function normalizeQuery(value: string) {
  return value.trim().toLowerCase();
}

export function PlatformCommandSearchSection({
  summary,
  items,
  onExportCsv: handleExportCsv,
}: PlatformCommandSearchSectionProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"all" | PlatformCommandCategory>("all");
  const [selectedItemId, setSelectedItemId] = useState("");
  const cleanQuery = normalizeQuery(query);
  const filteredItems = useMemo(
    () =>
      items
        .filter((item) => category === "all" || item.category === category)
        .filter((item) => {
          if (!cleanQuery) return true;
          return `${item.command} ${item.title} ${item.subtitle} ${item.owner} ${item.metric} ${item.evidence} ${item.nextAction} ${item.keywords}`
            .toLowerCase()
            .includes(cleanQuery);
        })
        .slice(0, 24),
    [category, cleanQuery, items],
  );
  const selectedItem = useMemo(
    () => filteredItems.find((item) => item.id === selectedItemId) ?? filteredItems[0] ?? null,
    [filteredItems, selectedItemId],
  );
  const metrics = [
    ["命令", `${summary.itemCount}`],
    ["Critical", `${summary.criticalCount}`],
    ["High", `${summary.highCount}`],
    ["暫停", `${summary.blockCount}`],
    ["觀察", `${summary.watchCount}`],
    ["Owner", `${summary.ownerCount}`],
  ];

  return (
    <div className="border-t border-slate-800 pt-3 space-y-3">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-xs font-bold text-slate-100">Command Search 全域命令搜尋</h4>
            <span className="rounded bg-cyan-500/15 px-2 py-0.5 text-[10px] font-bold text-cyan-200">
              Terminal
            </span>
          </div>
          <p className="mt-0.5 text-[11px] text-slate-500">
            用一個入口搜尋帳戶、續約任務、資料產品狀態、API 與資料源，優先顯示高風險項目
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2 text-xs">
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
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
            命令 CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(280px,420px),1fr] gap-3">
        <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 space-y-3">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600" htmlFor="platform-command-search">
              Search
            </label>
            <input
              id="platform-command-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="輸入 workspace、API、產品、owner..."
              className="mt-1 w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            {categoryFilters.map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setCategory(filter)}
                className={`rounded-md border px-3 py-2 text-left text-[11px] font-bold ${
                  category === filter
                    ? "border-cyan-500/60 bg-cyan-500/10 text-cyan-200"
                    : "border-slate-800 bg-slate-900/70 text-slate-500 hover:text-slate-300"
                }`}
              >
                {filter === "all" ? "All" : platformCommandCategoryLabel(filter)}
              </button>
            ))}
          </div>
          <div className="rounded-md border border-slate-800 bg-slate-900/70 p-3">
            <p className="text-[10px] text-slate-600">結果</p>
            <p className="mt-1 font-mono text-2xl font-bold text-slate-100">{filteredItems.length}</p>
            <p className="mt-1 text-[11px] text-slate-500">最多顯示 24 筆，CSV 仍匯出完整命令索引。</p>
          </div>
          {selectedItem ? (
            <div className="rounded-lg border border-cyan-500/20 bg-cyan-950/10 p-3 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-mono text-xs font-bold text-cyan-200">{selectedItem.command}</p>
                  <p className="mt-1 text-sm font-bold text-slate-100">{selectedItem.title}</p>
                  <p className="mt-0.5 text-[11px] text-slate-500">{selectedItem.subtitle}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void navigator.clipboard?.writeText(selectedItem.command)}
                  className="shrink-0 rounded-md border border-slate-700 px-2 py-1 text-[10px] font-bold text-slate-300 hover:border-cyan-500/60 hover:text-cyan-200"
                >
                  複製
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-md border border-slate-800 bg-slate-900/70 p-2">
                  <p className="text-[10px] text-slate-600">Priority</p>
                  <span className={`mt-1 inline-block rounded px-2 py-0.5 text-[10px] font-bold ${priorityBadgeClass(selectedItem.priority)}`}>
                    {platformCommandPriorityLabel(selectedItem.priority)}
                  </span>
                </div>
                <div className="rounded-md border border-slate-800 bg-slate-900/70 p-2">
                  <p className="text-[10px] text-slate-600">Status</p>
                  <span className={`mt-1 inline-block rounded px-2 py-0.5 text-[10px] font-bold ${statusBadgeClass(selectedItem.status)}`}>
                    {platformCommandStatusLabel(selectedItem.status)}
                  </span>
                </div>
              </div>
              <dl className="space-y-2 text-xs">
                <div>
                  <dt className="text-[10px] text-slate-600">Owner</dt>
                  <dd className="mt-0.5 text-slate-300">{selectedItem.owner}</dd>
                </div>
                <div>
                  <dt className="text-[10px] text-slate-600">Metric</dt>
                  <dd className="mt-0.5 font-mono text-slate-300">{selectedItem.metric}</dd>
                </div>
                <div>
                  <dt className="text-[10px] text-slate-600">Evidence</dt>
                  <dd className="mt-0.5 text-slate-500">{selectedItem.evidence}</dd>
                </div>
                <div>
                  <dt className="text-[10px] text-slate-600">Next Action</dt>
                  <dd className="mt-0.5 text-amber-200">{selectedItem.nextAction}</dd>
                </div>
              </dl>
            </div>
          ) : null}
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full min-w-[1320px] text-xs">
            <thead className="bg-slate-900/80">
              <tr className="text-left text-[11px] text-slate-600">
                <th className="py-2 px-3 font-medium">Command</th>
                <th className="py-2 px-3 font-medium">Priority</th>
                <th className="py-2 px-3 font-medium">Status</th>
                <th className="py-2 px-3 font-medium">Title</th>
                <th className="py-2 px-3 font-medium">Metric</th>
                <th className="py-2 px-3 font-medium">Owner</th>
                <th className="py-2 px-3 font-medium">Evidence</th>
                <th className="py-2 px-3 font-medium">Next Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => setSelectedItemId(item.id)}
                  className={`cursor-pointer border-t border-slate-800/80 hover:bg-slate-900/70 ${
                    selectedItem?.id === item.id ? "bg-cyan-950/20" : ""
                  }`}
                >
                  <td className="py-2 px-3">
                    <p className="font-mono font-bold text-cyan-200">{item.command}</p>
                    <p className="mt-0.5 text-[10px] text-slate-600">{platformCommandCategoryLabel(item.category)}</p>
                  </td>
                  <td className="py-2 px-3">
                    <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${priorityBadgeClass(item.priority)}`}>
                      {platformCommandPriorityLabel(item.priority)}
                    </span>
                  </td>
                  <td className="py-2 px-3">
                    <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${statusBadgeClass(item.status)}`}>
                      {platformCommandStatusLabel(item.status)}
                    </span>
                  </td>
                  <td className="py-2 px-3">
                    <p className="font-bold text-slate-100">{item.title}</p>
                    <p className="mt-0.5 text-[10px] text-slate-600">{item.subtitle}</p>
                  </td>
                  <td className="py-2 px-3 font-mono text-slate-300">{item.metric}</td>
                  <td className="py-2 px-3 text-slate-400">{item.owner}</td>
                  <td className="py-2 px-3 text-slate-500">{item.evidence}</td>
                  <td className="py-2 px-3 text-slate-500">{item.nextAction}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
