import type { ExtraIncomeRecord } from "@/types/wealth";

type IncomeExpensePanelProps = {
  isOpen: boolean;
  onToggle: () => void;
  mainSalary: number;
  onMainSalaryChange: (value: number) => void;
  extraIncomes: ExtraIncomeRecord[];
  tmpIncName: string;
  onTmpIncNameChange: (value: string) => void;
  tmpIncType: string;
  onTmpIncTypeChange: (value: string) => void;
  tmpIncAmt: number;
  onTmpIncAmtChange: (value: number) => void;
  onAddExtraIncome: () => void;
  onDeleteIncome: (id: string) => void;
  mLiving: number;
  onMLivingChange: (value: number) => void;
  mRent: number;
  onMRentChange: (value: number) => void;
  mInsurance: number;
  onMInsuranceChange: (value: number) => void;
  mLaborHealth: number;
  onMLaborHealthChange: (value: number) => void;
  mParents: number;
  onMParentsChange: (value: number) => void;
  mOther: number;
  onMOtherChange: (value: number) => void;
  serverLoan: number;
  serverTax: number;
  monthlyNetFlow: number;
  isLoading: boolean;
};

export function IncomeExpensePanel({
  isOpen,
  onToggle,
  mainSalary,
  onMainSalaryChange,
  extraIncomes,
  tmpIncName,
  onTmpIncNameChange,
  tmpIncType,
  onTmpIncTypeChange,
  tmpIncAmt,
  onTmpIncAmtChange,
  onAddExtraIncome,
  onDeleteIncome,
  mLiving,
  onMLivingChange,
  mRent,
  onMRentChange,
  mInsurance,
  onMInsuranceChange,
  mLaborHealth,
  onMLaborHealthChange,
  mParents,
  onMParentsChange,
  mOther,
  onMOtherChange,
  serverLoan,
  serverTax,
  monthlyNetFlow,
  isLoading,
}: IncomeExpensePanelProps) {
  return (
    <div className="border border-slate-800 rounded-lg bg-slate-950/40 border-l-4 border-l-emerald-500">
      <button onClick={onToggle} className="w-full bg-slate-950 px-4 py-2.5 text-left font-semibold text-xs text-slate-300 flex justify-between">
        <span>💰 2. 收入/開銷與實質戰情</span><span>{isOpen ? "▲" : "▼"}</span>
      </button>
      {isOpen && (
        <div className="p-4 space-y-4 text-xs border-t border-slate-800">
          <div><label className="text-slate-400 font-bold">主業薪資/月 (元)</label><input type="number" value={mainSalary} onChange={(e) => onMainSalaryChange(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1 text-white font-mono" /></div>
          <div className="bg-slate-950 p-2.5 rounded border border-slate-800 space-y-2">
            <p className="text-emerald-400 font-bold text-[11px]">➕ 額外各類所得</p>
            <select value={tmpIncType} onChange={(e) => onTmpIncTypeChange(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded p-1 text-white text-[11px]"><option value="執行業務-一般(9A, 扣30%成本)">9A 執行業務所得</option><option value="執行業務-講演/稿費(9B, 享18萬免稅)">9B 講演稿費</option><option value="租賃所得(51, 扣43%成本)">51 房屋租賃所得</option><option value="營利/股利所得(54)">54 營利/股利</option><option value="利息所得(52)">52 利息</option></select>
            <div className="grid grid-cols-2 gap-2"><input type="text" value={tmpIncName} onChange={(e) => onTmpIncNameChange(e.target.value)} className="bg-slate-900 border border-slate-700 rounded p-1 text-[11px]" /><input type="number" value={tmpIncAmt} onChange={(e) => onTmpIncAmtChange(Number(e.target.value))} className="bg-slate-900 border border-slate-700 rounded p-1 font-mono text-[11px]" /></div>
            <button onClick={onAddExtraIncome} className="w-full bg-emerald-900 text-white text-[11px] py-1 rounded font-bold">新增所得</button>
            {extraIncomes.map((income) => <div key={income.id} className="flex justify-between text-[10px] text-slate-400"><span>{income.name}</span><button onClick={() => onDeleteIncome(income.id)}>🗑️</button></div>)}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className="text-[10px] text-slate-500">生活餐費</label><input type="number" value={mLiving} onChange={(e) => onMLivingChange(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1 font-mono" /></div>
            <div><label className="text-[10px] text-slate-500">房屋租金</label><input type="number" value={mRent} onChange={(e) => onMRentChange(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1 font-mono" /></div>
            <div><label className="text-[10px] text-slate-500">醫療壽險</label><input type="number" value={mInsurance} onChange={(e) => onMInsuranceChange(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1 font-mono" /></div>
            <div><label className="text-[10px] text-slate-500">勞健保費</label><input type="number" value={mLaborHealth} onChange={(e) => onMLaborHealthChange(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1 font-mono" /></div>
            <div><label className="text-[10px] text-slate-500">孝親費</label><input type="number" value={mParents} onChange={(e) => onMParentsChange(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1 font-mono" /></div>
            <div><label className="text-[10px] text-slate-500">娛樂其他</label><input type="number" value={mOther} onChange={(e) => onMOtherChange(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1 font-mono" /></div>
            <div><label className="text-[10px] text-blue-400 font-bold">系統自動回填貸款</label><input type="number" value={Math.round(serverLoan / 12)} disabled className="w-full bg-slate-800 border border-slate-700 rounded p-1 font-mono text-slate-400" /></div>
            <div><label className="text-[10px] text-red-400 font-bold">系統自動回填稅負</label><input type="number" value={Math.round(serverTax / 12)} disabled className="w-full bg-slate-800 border border-slate-700 rounded p-1 font-mono text-slate-400" /></div>
          </div>
          <div className="bg-emerald-950/40 p-3 rounded-lg border border-emerald-800 text-center">
            <p className="text-slate-300 text-[11px] mb-1">💰 實質每月結餘 (可自由運用/滾存)</p>
            <p className="text-lg font-bold text-emerald-400 font-mono">{isLoading ? "精算中..." : `${Math.round(monthlyNetFlow).toLocaleString()} 元`}</p>
          </div>
        </div>
      )}
    </div>
  );
}
