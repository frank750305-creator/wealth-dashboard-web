import type { AssetComparisonRow } from "@/lib/assetResearchWorkflow";

type WatchlistSummaryCardsProps = {
  comparisonRows: AssetComparisonRow[];
  visibleComparisonRows: AssetComparisonRow[];
};

function formatPercent(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? `${(value * 100).toFixed(2)}%` : "--";
}

export function WatchlistSummaryCards({
  comparisonRows,
  visibleComparisonRows,
}: WatchlistSummaryCardsProps) {
  const annualReturnCount = visibleComparisonRows.filter((row) => row.annualizedReturn !== null).length;
  const volatilityCount = visibleComparisonRows.filter((row) => row.annualizedVolatility !== null).length;

  const cards = [
    ["顯示商品", `${visibleComparisonRows.length} / ${comparisonRows.length} 檔`],
    [
      "平均年化報酬",
      formatPercent(
        visibleComparisonRows.reduce((sum, row) => sum + (row.annualizedReturn ?? 0), 0) /
          Math.max(1, annualReturnCount),
      ),
    ],
    [
      "平均波動",
      formatPercent(
        visibleComparisonRows.reduce((sum, row) => sum + (row.annualizedVolatility ?? 0), 0) /
          Math.max(1, volatilityCount),
      ),
    ],
    [
      "異常/觀察",
      `${visibleComparisonRows.filter((row) => row.qualityStatus !== "strong").length} 檔`,
    ],
    [
      "最高分",
      visibleComparisonRows.length
        ? `${visibleComparisonRows[0].symbol} · ${visibleComparisonRows[0].score}`
        : "--",
    ],
    [
      "候選",
      `${visibleComparisonRows.filter((row) => row.signal === "candidate").length} 檔`,
    ],
    [
      "風險",
      `${visibleComparisonRows.filter((row) => row.signal === "risk").length} 檔`,
    ],
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
      {cards.map(([label, value]) => (
        <div key={label} className="rounded-md border border-slate-800 bg-slate-900/60 p-3 min-w-0">
          <p className="text-[11px] text-slate-600 truncate">{label}</p>
          <p className="mt-1 font-mono text-sm font-bold text-slate-100 truncate" title={value}>
            {value}
          </p>
        </div>
      ))}
    </div>
  );
}
