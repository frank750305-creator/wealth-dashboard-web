type SnapshotMetricKind = "percent" | "number";

type SnapshotComparisonRow = {
  key: string;
  label: string;
  kind: SnapshotMetricKind;
  currentValue: number | null;
  snapshotValue: number | null;
  delta: number | null;
};

type BigQueryPortfolioSnapshotComparisonProps = {
  snapshotName: string | null | undefined;
  rows: SnapshotComparisonRow[];
};

function formatMetric(value: number | null, kind: SnapshotMetricKind) {
  if (value === null || !Number.isFinite(value)) return "--";
  if (kind === "percent") return `${(value * 100).toFixed(2)}%`;
  return value.toFixed(3);
}

function formatMetricDelta(value: number | null, kind: SnapshotMetricKind) {
  if (value === null || !Number.isFinite(value)) return "--";
  const sign = value > 0 ? "+" : "";
  if (kind === "percent") return `${sign}${(value * 100).toFixed(2)}%`;
  return `${sign}${value.toFixed(3)}`;
}

export function BigQueryPortfolioSnapshotComparison({
  snapshotName,
  rows,
}: BigQueryPortfolioSnapshotComparisonProps) {
  if (!rows.length) return null;

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-slate-200">快照比較</p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {snapshotName ?? "--"} · Delta = 目前結果 - 快照
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2">
        {rows.map((row) => {
          const isNegative = typeof row.delta === "number" && row.delta < 0;
          return (
            <div key={row.key} className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 min-w-0">
              <p className="text-[11px] text-slate-500 truncate">{row.label}</p>
              <p className="mt-2 font-mono text-xs font-bold text-slate-100">
                {formatMetric(row.currentValue, row.kind)}
              </p>
              <p className="mt-1 font-mono text-[11px] text-slate-500">
                快照 {formatMetric(row.snapshotValue, row.kind)}
              </p>
              <p className={`mt-1 font-mono text-[11px] font-bold ${isNegative ? "text-rose-300" : "text-emerald-300"}`}>
                {formatMetricDelta(row.delta, row.kind)}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
