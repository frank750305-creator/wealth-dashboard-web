import type { PensionResult } from "@/lib/pension";

type TimelinePanelProps = {
  isOpen: boolean;
  onToggle: () => void;
  currentAge: number;
  onCurrentAgeChange: (value: number) => void;
  lifeExpectancy: number;
  onLifeExpectancyChange: (value: number) => void;
  retireAge: number;
  onRetireAgeChange: (value: number) => void;
  salaryGrowth: number;
  onSalaryGrowthChange: (value: number) => void;
  inflationRate: number;
  onInflationRateChange: (value: number) => void;
  replacementRate: number;
  onReplacementRateChange: (value: number) => void;
  roiAfterRetire: number;
  onRoiAfterRetireChange: (value: number) => void;
  mainSalary: number;
  pensionInfo: PensionResult;
  realRetireFundPv: number;
};

function calculateProjectedRetirementFund({
  mainSalary,
  salaryGrowth,
  retireAge,
  currentAge,
  replacementRate,
  lifeExpectancy,
  inflationRate,
  roiAfterRetire,
}: {
  mainSalary: number;
  salaryGrowth: number;
  retireAge: number;
  currentAge: number;
  replacementRate: number;
  lifeExpectancy: number;
  inflationRate: number;
  roiAfterRetire: number;
}) {
  let total = 0;
  const yearsToRetire = Math.max(0, retireAge - currentAge);
  const annualNeed =
    mainSalary *
    12 *
    Math.pow(1 + salaryGrowth / 100, yearsToRetire) *
    (replacementRate / 100);
  const retirementYears = Math.max(0, lifeExpectancy - retireAge + 1);

  for (let year = 0; year < retirementYears; year += 1) {
    total +=
      (annualNeed * Math.pow(1 + inflationRate / 100, year)) /
      Math.pow(1 + roiAfterRetire / 100, year);
  }

  return total;
}

export function TimelinePanel({
  isOpen,
  onToggle,
  currentAge,
  onCurrentAgeChange,
  lifeExpectancy,
  onLifeExpectancyChange,
  retireAge,
  onRetireAgeChange,
  salaryGrowth,
  onSalaryGrowthChange,
  inflationRate,
  onInflationRateChange,
  replacementRate,
  onReplacementRateChange,
  roiAfterRetire,
  onRoiAfterRetireChange,
  mainSalary,
  pensionInfo,
  realRetireFundPv,
}: TimelinePanelProps) {
  const yearsToRetire = Math.max(0, retireAge - currentAge);
  const projectedMonthlyNeed =
    mainSalary *
    Math.pow(1 + salaryGrowth / 100, yearsToRetire) *
    (replacementRate / 100);
  const projectedFund =
    calculateProjectedRetirementFund({
      mainSalary,
      salaryGrowth,
      retireAge,
      currentAge,
      replacementRate,
      lifeExpectancy,
      inflationRate,
      roiAfterRetire,
    }) / 10000;
  const selfFundedMonthlyNeed = Math.max(
    0,
    (projectedMonthlyNeed - pensionInfo.annuity_m_amt_wan * 10000) / 10000,
  );

  return (
    <div className="border border-slate-800 rounded-lg bg-slate-950/40">
      <button onClick={onToggle} className="w-full bg-slate-950 px-4 py-2.5 text-left font-semibold text-xs text-slate-300 flex justify-between">
        <span>📊 1. 全局時間軸與精算參數</span><span>{isOpen ? "▲" : "▼"}</span>
      </button>
      {isOpen && (
        <div className="p-4 space-y-3 text-xs border-t border-slate-800">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-slate-400">當前年紀</label><input type="number" value={currentAge} onChange={(event) => onCurrentAgeChange(Number(event.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1" /></div>
            <div><label className="text-slate-400">模擬至年紀</label><input type="number" value={lifeExpectancy} onChange={(event) => onLifeExpectancyChange(Number(event.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1" /></div>
            <div><label className="text-slate-400">預計退休年紀</label><input type="number" value={retireAge} onChange={(event) => onRetireAgeChange(Number(event.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1" /></div>
            <div><label className="text-slate-400">薪資成長率(%)</label><input type="number" step="0.1" value={salaryGrowth} onChange={(event) => onSalaryGrowthChange(Number(event.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1" /></div>
            <div><label className="text-slate-400">通貨膨脹率(%)</label><input type="number" step="0.1" value={inflationRate} onChange={(event) => onInflationRateChange(Number(event.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1" /></div>
            <div><label className="text-slate-400">所得替代率(%)</label><input type="number" step="1" value={replacementRate} onChange={(event) => onReplacementRateChange(Number(event.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1" /></div>
            <div><label className="text-slate-400">退休後ROI(%)</label><input type="number" step="0.1" value={roiAfterRetire} onChange={(event) => onRoiAfterRetireChange(Number(event.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1" /></div>
          </div>
          <div className="mt-4 space-y-3 pt-3 border-t border-slate-800">
            <div className="bg-slate-800/80 p-3 rounded-lg shadow-inner border-l-4 border-l-blue-500">
              <p className="text-blue-400 font-bold text-sm mb-1">
                📊 {retireAge}歲預估：月費需求：{(projectedMonthlyNeed / 10000).toFixed(1)} 萬
              </p>
              <p className="text-blue-300 font-bold text-sm">
                總應備金：{projectedFund.toFixed(0)} 萬
              </p>
            </div>

            <div className="bg-emerald-900/40 p-3 rounded-lg shadow-inner border-l-4 border-l-emerald-500">
              <p className="text-emerald-400 font-bold text-sm mb-1">
                🎯 【真實缺口】自備月費：{selfFundedMonthlyNeed.toFixed(1)} 萬
              </p>
              <p className="text-emerald-300 font-bold text-sm">
                真實應備：{(realRetireFundPv / 10000).toFixed(0)} 萬
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
