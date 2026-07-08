import type { InsuranceRecord } from "@/types/wealth";

type InsurancePanelProps = {
  isOpen: boolean;
  onToggle: () => void;
  insurances: InsuranceRecord[];
  familyOptions: string[];
  tmpInsName: string;
  onTmpInsNameChange: (value: string) => void;
  tmpInsType: string;
  onTmpInsTypeChange: (value: string) => void;
  tmpInsApp: string;
  onTmpInsAppChange: (value: string) => void;
  tmpInsIns: string;
  onTmpInsInsChange: (value: string) => void;
  tmpInsBen: string[];
  onToggleBeneficiary: (value: string) => void;
  tmpInsCustomBen: string;
  onTmpInsCustomBenChange: (value: string) => void;
  tmpInsAlloc: string;
  onTmpInsAllocChange: (value: string) => void;
  tmpInsPayFreq: string;
  onTmpInsPayFreqChange: (value: string) => void;
  tmpInsPayMethod: string;
  onTmpInsPayMethodChange: (value: string) => void;
  tmpInsBank: string;
  onTmpInsBankChange: (value: string) => void;
  tmpInsDueDate: string;
  onTmpInsDueDateChange: (value: string) => void;
  tmpInsPremium: number;
  onTmpInsPremiumChange: (value: number) => void;
  tmpInsYears: number;
  onTmpInsYearsChange: (value: number) => void;
  tmpInsCv: number;
  onTmpInsCvChange: (value: number) => void;
  tmpInsIrr: number;
  onTmpInsIrrChange: (value: number) => void;
  tmpInsDb: number;
  onTmpInsDbChange: (value: number) => void;
  tmpInsSurv: number;
  onTmpInsSurvChange: (value: number) => void;
  tmpInsSurvAge: number;
  onTmpInsSurvAgeChange: (value: number) => void;
  onAddInsurancePolicy: () => void;
  onDeleteInsurance: (id: string) => void;
};

export function InsurancePanel({
  isOpen,
  onToggle,
  insurances,
  familyOptions,
  tmpInsName,
  onTmpInsNameChange,
  tmpInsType,
  onTmpInsTypeChange,
  tmpInsApp,
  onTmpInsAppChange,
  tmpInsIns,
  onTmpInsInsChange,
  tmpInsBen,
  onToggleBeneficiary,
  tmpInsCustomBen,
  onTmpInsCustomBenChange,
  tmpInsAlloc,
  onTmpInsAllocChange,
  tmpInsPayFreq,
  onTmpInsPayFreqChange,
  tmpInsPayMethod,
  onTmpInsPayMethodChange,
  tmpInsBank,
  onTmpInsBankChange,
  tmpInsDueDate,
  onTmpInsDueDateChange,
  tmpInsPremium,
  onTmpInsPremiumChange,
  tmpInsYears,
  onTmpInsYearsChange,
  tmpInsCv,
  onTmpInsCvChange,
  tmpInsIrr,
  onTmpInsIrrChange,
  tmpInsDb,
  onTmpInsDbChange,
  tmpInsSurv,
  onTmpInsSurvChange,
  tmpInsSurvAge,
  onTmpInsSurvAgeChange,
  onAddInsurancePolicy,
  onDeleteInsurance,
}: InsurancePanelProps) {
  return (
    <div className="border border-slate-800 rounded-lg bg-slate-950/40 border-l-4 border-l-purple-500">
      <button onClick={onToggle} className="w-full bg-slate-950 px-4 py-2.5 text-left font-semibold text-xs text-slate-300 flex justify-between">
        <span>🛡️ 8. 專案保單與特定受益人</span><span>{isOpen ? "▲" : "▼"}</span>
      </button>
      {isOpen && (
        <div className="p-4 space-y-3 text-xs border-t border-slate-800">
          <div className="bg-slate-950 p-3 rounded border border-slate-800 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div><label>名稱</label><input type="text" value={tmpInsName} onChange={(e) => onTmpInsNameChange(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded p-1" /></div>
              <div><label>險種</label><select value={tmpInsType} onChange={(e) => onTmpInsTypeChange(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded p-1"><option>人壽保險</option><option>年金保險</option><option>醫療/健康險</option><option>其他</option></select></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><label>要保人</label><select value={tmpInsApp} onChange={(e) => onTmpInsAppChange(e.target.value)} className="w-full bg-slate-900 rounded p-1"><option>本人</option><option>配偶</option><option>子女</option></select></div>
              <div><label>被保險人</label><select value={tmpInsIns} onChange={(e) => onTmpInsInsChange(e.target.value)} className="w-full bg-slate-900 rounded p-1"><option>本人</option><option>配偶</option><option>子女</option></select></div>
            </div>

            <div className="bg-slate-900 p-2 rounded">
              <label className="text-purple-400 font-bold block mb-1">身故受益人 (可複選)</label>
              <div className="grid grid-cols-2 gap-1 max-h-32 overflow-y-auto">
                {familyOptions.map((option) => (
                  <label key={option} className="flex items-center gap-1 text-[10px]">
                    <input type="checkbox" checked={tmpInsBen.includes(option)} onChange={() => onToggleBeneficiary(option)} /> {option}
                  </label>
                ))}
              </div>
            </div>
            {tmpInsBen.includes("其他(自行輸入)") && <div><label>自訂名稱</label><input type="text" value={tmpInsCustomBen} onChange={(e) => onTmpInsCustomBenChange(e.target.value)} className="w-full bg-slate-900 rounded p-1" /></div>}

            <div className="grid grid-cols-2 gap-2">
              <div><label>分配方式</label><select value={tmpInsAlloc} onChange={(e) => onTmpInsAllocChange(e.target.value)} className="w-full bg-slate-900 rounded p-1"><option>均分比例</option><option>順位(由第一順位全額領取)</option></select></div>
              <div><label>繳費頻率</label><select value={tmpInsPayFreq} onChange={(e) => onTmpInsPayFreqChange(e.target.value)} className="w-full bg-slate-900 rounded p-1"><option>年繳</option><option>半年繳</option><option>季繳</option><option>月繳</option><option>躉繳</option></select></div>
              <div><label>管道</label><select value={tmpInsPayMethod} onChange={(e) => onTmpInsPayMethodChange(e.target.value)} className="w-full bg-slate-900 rounded p-1"><option>信用卡</option><option>轉帳</option><option>自行繳費</option></select></div>
              <div><label>銀行</label><input type="text" value={tmpInsBank} onChange={(e) => onTmpInsBankChange(e.target.value)} className="w-full bg-slate-900 rounded p-1" /></div>
              <div><label>扣款日</label><input type="text" value={tmpInsDueDate} onChange={(e) => onTmpInsDueDateChange(e.target.value)} className="w-full bg-slate-900 rounded p-1" /></div>
            </div>

            <div className="grid grid-cols-4 gap-2 border-t border-slate-800 pt-2">
              <div className="col-span-2"><label>年保費(萬)</label><input type="number" value={tmpInsPremium} onChange={(e) => onTmpInsPremiumChange(Number(e.target.value))} className="w-full bg-slate-900 rounded p-1" /></div>
              <div className="col-span-2"><label>剩餘年期</label><input type="number" value={tmpInsYears} onChange={(e) => onTmpInsYearsChange(Number(e.target.value))} className="w-full bg-slate-900 rounded p-1" /></div>
              <div className="col-span-2"><label>目前保價(萬)</label><input type="number" value={tmpInsCv} onChange={(e) => onTmpInsCvChange(Number(e.target.value))} className="w-full bg-slate-900 rounded p-1" /></div>
              <div className="col-span-2"><label>IRR(%)</label><input type="number" step="0.1" value={tmpInsIrr} onChange={(e) => onTmpInsIrrChange(Number(e.target.value))} className="w-full bg-slate-900 rounded p-1" /></div>
              <div className="col-span-4"><label>目前身故保額(萬)</label><input type="number" value={tmpInsDb} onChange={(e) => onTmpInsDbChange(Number(e.target.value))} className="w-full bg-slate-900 rounded p-1" /></div>
              <div className="col-span-2"><label>生存還本金(萬)</label><input type="number" value={tmpInsSurv} onChange={(e) => onTmpInsSurvChange(Number(e.target.value))} className="w-full bg-slate-900 rounded p-1" /></div>
              <div className="col-span-2"><label>起領年紀</label><input type="number" value={tmpInsSurvAge} onChange={(e) => onTmpInsSurvAgeChange(Number(e.target.value))} className="w-full bg-slate-900 rounded p-1" /></div>
            </div>

            <button onClick={onAddInsurancePolicy} className="w-full bg-purple-900 text-white py-1 rounded font-bold mt-2">配置傳承保單</button>
            {insurances.map((insurance) => <div key={insurance.id} className="flex justify-between text-[10px] text-slate-400 border-t border-slate-800 pt-1 mt-1"><span>{insurance.name} ({insurance.pay_freq} {insurance.premium}萬)</span><button onClick={() => onDeleteInsurance(insurance.id)}>🗑️</button></div>)}
          </div>
        </div>
      )}
    </div>
  );
}
