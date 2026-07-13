type PortfolioSnapshotOption = {
  id: string;
  name: string;
  createdAt: string;
};

type BigQueryPortfolioSnapshotBarProps = {
  savedSnapshots: PortfolioSnapshotOption[];
  selectedSnapshotId: string;
  hasSelectedSnapshot: boolean;
  onSelectedSnapshotIdChange: (value: string) => void;
  onLoadSnapshot: () => void;
  onExportSnapshotJson: () => void;
  onDeleteSnapshot: () => void;
};

export function BigQueryPortfolioSnapshotBar({
  savedSnapshots,
  selectedSnapshotId,
  hasSelectedSnapshot,
  onSelectedSnapshotIdChange,
  onLoadSnapshot,
  onExportSnapshotJson,
  onDeleteSnapshot,
}: BigQueryPortfolioSnapshotBarProps) {
  if (!savedSnapshots.length) return null;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[0.7fr_1.3fr] gap-3 bg-slate-950 border border-slate-800 rounded-lg p-3">
      <div>
        <p className="text-xs font-bold text-slate-200">分析快照</p>
        <p className="text-[11px] text-slate-500 mt-0.5">{savedSnapshots.length} 筆本機留存</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto_auto] gap-2 text-xs">
        <select
          value={selectedSnapshotId}
          onChange={(event) => onSelectedSnapshotIdChange(event.target.value)}
          className="w-full bg-slate-900 border border-slate-700 rounded-md px-2 py-2 text-slate-100"
        >
          {savedSnapshots.map((snapshot) => (
            <option key={snapshot.id} value={snapshot.id}>
              {snapshot.name} · {new Date(snapshot.createdAt).toLocaleString("zh-TW")}
            </option>
          ))}
        </select>
        <button
          onClick={onLoadSnapshot}
          disabled={!hasSelectedSnapshot}
          className="px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold disabled:cursor-not-allowed disabled:text-slate-500"
        >
          載入
        </button>
        <button
          onClick={onExportSnapshotJson}
          disabled={!hasSelectedSnapshot}
          className="px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold disabled:cursor-not-allowed disabled:text-slate-500"
        >
          JSON
        </button>
        <button
          onClick={onDeleteSnapshot}
          disabled={!hasSelectedSnapshot}
          className="px-3 py-2 rounded-md bg-slate-900 border border-slate-700 hover:border-red-500 text-slate-300 hover:text-red-300 font-bold disabled:cursor-not-allowed disabled:text-slate-600"
        >
          刪除
        </button>
      </div>
    </div>
  );
}
