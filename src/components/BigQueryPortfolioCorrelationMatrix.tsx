import type { PortfolioCorrelationMatrix } from "@/types/market";

type BigQueryPortfolioCorrelationMatrixProps = {
  matrix: PortfolioCorrelationMatrix | undefined;
};

function formatCorrelation(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "--";
  return value.toFixed(2);
}

function correlationCellClass(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "bg-slate-900 text-slate-600 border-slate-800";
  }
  if (value >= 0.75) return "bg-red-500/20 text-red-200 border-red-500/30";
  if (value >= 0.4) return "bg-amber-500/15 text-amber-200 border-amber-500/30";
  if (value <= -0.4) return "bg-cyan-500/15 text-cyan-200 border-cyan-500/30";
  return "bg-slate-900 text-slate-300 border-slate-800";
}

export function BigQueryPortfolioCorrelationMatrix({
  matrix,
}: BigQueryPortfolioCorrelationMatrixProps) {
  if (!matrix?.symbols?.length) return null;

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
      <div className="flex items-center justify-between gap-3 mb-3">
        <p className="text-[11px] text-slate-500">相關係數矩陣</p>
        <p className="text-[11px] text-slate-600 font-mono">-1.00 ~ 1.00</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] border-separate border-spacing-1 text-[11px]">
          <thead>
            <tr>
              <th className="w-28 px-2 py-1 text-left font-medium text-slate-600">Asset</th>
              {matrix.symbols.map((symbol, index) => (
                <th key={`${symbol}-${index}`} className="max-w-[6rem] px-2 py-1 text-center font-medium text-slate-500">
                  <span title={symbol} className="block truncate">
                    {symbol}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.symbols.map((rowSymbol, rowIndex) => (
              <tr key={`${rowSymbol}-${rowIndex}`}>
                <th className="max-w-[8rem] px-2 py-2 text-left font-medium text-slate-300">
                  <span title={rowSymbol} className="block truncate">
                    {rowSymbol}
                  </span>
                </th>
                {matrix.symbols.map((columnSymbol, columnIndex) => {
                  const value = matrix.values?.[rowIndex]?.[columnIndex] ?? null;
                  return (
                    <td
                      key={`${rowSymbol}-${rowIndex}-${columnSymbol}-${columnIndex}`}
                      className={`h-9 min-w-[4rem] rounded-md border px-2 text-center align-middle font-mono ${correlationCellClass(value)}`}
                    >
                      {formatCorrelation(value)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
