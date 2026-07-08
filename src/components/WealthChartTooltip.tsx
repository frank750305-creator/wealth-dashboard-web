/* eslint-disable @typescript-eslint/no-explicit-any */

export function WealthChartTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-800 border border-slate-700 p-4 rounded shadow-xl">
        <p className="text-slate-300 mb-2 font-bold">{`${label} 歲`}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} style={{ color: entry.color }} className="text-sm">
            {entry.name}: {entry.value.toLocaleString()} 萬
          </p>
        ))}
      </div>
    );
  }

  return null;
}
