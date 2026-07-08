"use client";

import { useState } from "react";

type ReverseCalcRowProps = {
  label: string;
  yearsToGo: number;
  targetVal: number;
};

export function ReverseCalcRow({ label, yearsToGo, targetVal }: ReverseCalcRowProps) {
  const [roi, setRoi] = useState(0);
  const rm = (roi / 100) / 12;
  const nm = yearsToGo * 12;
  const monthlyNeed = rm > 0 ? (targetVal * rm) / (Math.pow(1 + rm, nm) - 1) : (targetVal / nm);

  return (
    <div className="flex justify-between items-center text-[11px] border-b border-slate-800/50 pb-1">
      <div className="w-1/3 truncate text-slate-300" title={label}>
        {label}
        <br />
        <span className="text-[9px] text-slate-500">({yearsToGo}年,需{targetVal / 10000}萬)</span>
      </div>
      <div className="w-1/4 flex items-center gap-1">
        ROI
        <input
          type="number"
          value={roi}
          onChange={(e) => setRoi(Number(e.target.value))}
          className="w-12 bg-slate-900 p-0.5 rounded"
        />
        %
      </div>
      <div className="w-1/3 text-right text-emerald-400 font-mono">
        {(monthlyNeed || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })} 元/月
      </div>
    </div>
  );
}
