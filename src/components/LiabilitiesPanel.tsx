import { calculateHousingBuyingPower } from "@/lib/loans";
import type { DebtRecord, MortgageRecord } from "@/types/wealth";

type LiabilitiesPanelProps = {
  isOpen: boolean;
  onToggle: () => void;
  monthlyNetFlow: number;
  hasHouse: boolean;
  onHasHouseChange: (value: boolean) => void;
  tmpHName: string;
  onTmpHNameChange: (value: string) => void;
  tmpHStart: number;
  onTmpHStartChange: (value: number) => void;
  tmpHPrice: number;
  onTmpHPriceChange: (value: number) => void;
  tmpHDownPct: number;
  onTmpHDownPctChange: (value: number) => void;
  tmpHRate: number;
  onTmpHRateChange: (value: number) => void;
  tmpHYears: number;
  onTmpHYearsChange: (value: number) => void;
  tmpHGrace: number;
  onTmpHGraceChange: (value: number) => void;
  tmpHMethod: string;
  onTmpHMethodChange: (value: string) => void;
  tmpHReplaceRent: boolean;
  onTmpHReplaceRentChange: (value: boolean) => void;
  tmpHClaimTax: boolean;
  onTmpHClaimTaxChange: (value: boolean) => void;
  mortgages: MortgageRecord[];
  onAddMortgage: () => void;
  onDeleteMortgage: (id: string) => void;
  tmpDName: string;
  onTmpDNameChange: (value: string) => void;
  tmpDStart: number;
  onTmpDStartChange: (value: number) => void;
  tmpDAmt: number;
  onTmpDAmtChange: (value: number) => void;
  tmpDYears: number;
  onTmpDYearsChange: (value: number) => void;
  tmpDRate: number;
  onTmpDRateChange: (value: number) => void;
  debts: DebtRecord[];
  onAddDebtPlan: () => void;
  onDeleteDebt: (id: string) => void;
};

export function LiabilitiesPanel({
  isOpen,
  onToggle,
  monthlyNetFlow,
  hasHouse,
  onHasHouseChange,
  tmpHName,
  onTmpHNameChange,
  tmpHStart,
  onTmpHStartChange,
  tmpHPrice,
  onTmpHPriceChange,
  tmpHDownPct,
  onTmpHDownPctChange,
  tmpHRate,
  onTmpHRateChange,
  tmpHYears,
  onTmpHYearsChange,
  tmpHGrace,
  onTmpHGraceChange,
  tmpHMethod,
  onTmpHMethodChange,
  tmpHReplaceRent,
  onTmpHReplaceRentChange,
  tmpHClaimTax,
  onTmpHClaimTaxChange,
  mortgages,
  onAddMortgage,
  onDeleteMortgage,
  tmpDName,
  onTmpDNameChange,
  tmpDStart,
  onTmpDStartChange,
  tmpDAmt,
  onTmpDAmtChange,
  tmpDYears,
  onTmpDYearsChange,
  tmpDRate,
  onTmpDRateChange,
  debts,
  onAddDebtPlan,
  onDeleteDebt,
}: LiabilitiesPanelProps) {
  const buyingPower = calculateHousingBuyingPower({
    monthlyNetFlow,
    annualRatePct: tmpHRate,
    years: tmpHYears,
    graceYears: tmpHGrace,
    downPaymentPct: tmpHDownPct,
  });

  return (
    <div className="border border-slate-800 rounded-lg bg-slate-950/40 border-l-4 border-l-orange-500">
      <button onClick={onToggle} className="w-full bg-slate-950 px-4 py-2.5 text-left font-semibold text-xs text-slate-300 flex justify-between">
        <span>🏠 6. 購屋購買力與信貸負債</span><span>{isOpen ? "▲" : "▼"}</span>
      </button>
      {isOpen && (
        <div className="p-4 space-y-4 text-xs border-t border-slate-800">
          <div className="bg-slate-950 p-3 rounded border border-orange-900 text-orange-200 space-y-1">
            <p className="font-bold text-orange-400">💡 購屋購買力即時推算</p>
            {buyingPower.status === "no_cashflow" && <p>目前已無剩餘現金流，暫無多餘空間承擔新貸款。</p>}
            {buyingPower.status === "invalid_term" && <p>寬限期設定等於或超過貸款年期，無法反推。</p>}
            {buyingPower.status === "ok" && (
              <p>以您實質結餘 <b>{Math.round(monthlyNetFlow).toLocaleString()}</b> 元/月，安全貸款上限約 <b>{Math.round(buyingPower.maxLoanWan)} 萬</b> (看房總價建議 <b>{Math.round(buyingPower.suggestedPriceWan)} 萬</b> 內)。</p>
            )}
          </div>

          <div className="bg-slate-950 p-2.5 rounded border border-slate-800 space-y-2">
            <div className="flex items-center justify-between"><span className="text-[11px] font-bold text-orange-400">➕ 啟用購屋增置</span><input type="checkbox" checked={hasHouse} onChange={(e) => onHasHouseChange(e.target.checked)} /></div>
            {hasHouse && (
              <>
                <div className="grid grid-cols-4 gap-2 pt-1 border-t border-slate-800">
                  <div className="col-span-2"><label>名稱</label><input type="text" value={tmpHName} onChange={(e) => onTmpHNameChange(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded p-1" /></div>
                  <div><label>年紀</label><input type="number" value={tmpHStart} onChange={(e) => onTmpHStartChange(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1" /></div>
                  <div><label>總價(萬)</label><input type="number" value={tmpHPrice} onChange={(e) => onTmpHPriceChange(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1" /></div>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <div><label>頭期(%)</label><input type="number" value={tmpHDownPct} onChange={(e) => onTmpHDownPctChange(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1" /></div>
                  <div><label>利率(%)</label><input type="number" step="0.1" value={tmpHRate} onChange={(e) => onTmpHRateChange(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1" /></div>
                  <div><label>貸款年期</label><input type="number" value={tmpHYears} onChange={(e) => onTmpHYearsChange(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1" /></div>
                  <div><label>寬限期</label><input type="number" value={tmpHGrace} onChange={(e) => onTmpHGraceChange(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1" /></div>
                </div>
                <div className="grid grid-cols-3 gap-2 items-center">
                  <div className="col-span-1"><label>攤還方式</label><select value={tmpHMethod} onChange={(e) => onTmpHMethodChange(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded p-1"><option value="本利平均">本利平均</option><option value="本金平均">本金平均</option></select></div>
                  <div className="col-span-2 flex justify-around">
                    <label className="flex items-center gap-1"><input type="checkbox" checked={tmpHReplaceRent} onChange={(e) => onTmpHReplaceRentChange(e.target.checked)} /> 取代房租</label>
                    <label className="flex items-center gap-1"><input type="checkbox" checked={tmpHClaimTax} onChange={(e) => onTmpHClaimTaxChange(e.target.checked)} /> 列報抵稅</label>
                  </div>
                </div>
                <button onClick={onAddMortgage} className="w-full bg-orange-900 text-white py-1 text-[11px] rounded font-bold">加入房產</button>
              </>
            )}
            {mortgages.map((mortgage) => <div key={mortgage.id} className="flex justify-between text-[10px] text-slate-400 mt-1"><span>{mortgage.name} ({mortgage.total_price}萬)</span><button onClick={() => onDeleteMortgage(mortgage.id)}>🗑️</button></div>)}
          </div>

          <div className="bg-slate-950 p-2.5 rounded border border-slate-800 space-y-2">
            <p className="text-[11px] font-bold text-red-400">💳 新增信貸/其他債務</p>
            <div className="grid grid-cols-4 gap-2">
              <div className="col-span-2"><label>名稱</label><input type="text" value={tmpDName} onChange={(e) => onTmpDNameChange(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded p-1 text-[11px]" /></div>
              <div><label>借貸年紀</label><input type="number" value={tmpDStart} onChange={(e) => onTmpDStartChange(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1 text-[11px]" /></div>
              <div><label>金額(萬)</label><input type="number" value={tmpDAmt} onChange={(e) => onTmpDAmtChange(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1 text-[11px]" /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><label>年期</label><input type="number" value={tmpDYears} onChange={(e) => onTmpDYearsChange(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1 text-[11px]" /></div>
              <div><label>利率(%)</label><input type="number" step="0.1" value={tmpDRate} onChange={(e) => onTmpDRateChange(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1 text-[11px]" /></div>
            </div>
            <button onClick={onAddDebtPlan} className="w-full bg-red-900 text-white py-1 text-[11px] rounded font-bold">綁定負債</button>
            {debts.map((debt) => <div key={debt.id} className="flex justify-between text-[10px] text-slate-400 mt-1"><span>{debt.name}: 貸{debt.loan_amount}萬</span><button onClick={() => onDeleteDebt(debt.id)}>🗑️</button></div>)}
          </div>
        </div>
      )}
    </div>
  );
}
