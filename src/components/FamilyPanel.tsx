import type { KidRecord, SiblingRecord } from "@/types/wealth";

type FamilyPanelProps = {
  isOpen: boolean;
  onToggle: () => void;
  hasSpouse: boolean;
  onHasSpouseChange: (value: boolean) => void;
  spAge: number;
  onSpAgeChange: (value: number) => void;
  spLife: number;
  onSpLifeChange: (value: number) => void;
  spSalary: number;
  onSpSalaryChange: (value: number) => void;
  spOtherInc: number;
  onSpOtherIncChange: (value: number) => void;
  spWealth: number;
  onSpWealthChange: (value: number) => void;
  spAdd: number;
  onSpAddChange: (value: number) => void;
  spRate: number;
  onSpRateChange: (value: number) => void;
  spDisabled: boolean;
  onSpDisabledChange: (value: boolean) => void;
  spLtc: boolean;
  onSpLtcChange: (value: boolean) => void;
  hasFather: boolean;
  onHasFatherChange: (value: boolean) => void;
  faAge: number;
  onFaAgeChange: (value: number) => void;
  faLife: number;
  onFaLifeChange: (value: number) => void;
  faClaimTax: boolean;
  onFaClaimTaxChange: (value: boolean) => void;
  faTaxInc: number;
  onFaTaxIncChange: (value: number) => void;
  faDisabled: boolean;
  onFaDisabledChange: (value: boolean) => void;
  faLtc: boolean;
  onFaLtcChange: (value: boolean) => void;
  hasMother: boolean;
  onHasMotherChange: (value: boolean) => void;
  moAge: number;
  onMoAgeChange: (value: number) => void;
  moLife: number;
  onMoLifeChange: (value: number) => void;
  moClaimTax: boolean;
  onMoClaimTaxChange: (value: boolean) => void;
  moTaxInc: number;
  onMoTaxIncChange: (value: number) => void;
  moDisabled: boolean;
  onMoDisabledChange: (value: boolean) => void;
  moLtc: boolean;
  onMoLtcChange: (value: boolean) => void;
  hasGrand: boolean;
  onHasGrandChange: (value: boolean) => void;
  gpCount: number;
  onGpCountChange: (value: number) => void;
  gpAge: number;
  onGpAgeChange: (value: number) => void;
  gpLife: number;
  onGpLifeChange: (value: number) => void;
  gpClaimTax: boolean;
  onGpClaimTaxChange: (value: boolean) => void;
  gpTaxInc: number;
  onGpTaxIncChange: (value: number) => void;
  gpDependent: boolean;
  onGpDependentChange: (value: boolean) => void;
  gpDisabledCount: number;
  onGpDisabledCountChange: (value: number) => void;
  gpLtcCount: number;
  onGpLtcCountChange: (value: number) => void;
  kids: KidRecord[];
  onKidsChange: (value: KidRecord[]) => void;
  siblings: SiblingRecord[];
  onSiblingsChange: (value: SiblingRecord[]) => void;
  dailyToolVal: number;
  onDailyToolValChange: (value: number) => void;
  jobToolVal: number;
  onJobToolValChange: (value: number) => void;
};

export function FamilyPanel({
  isOpen,
  onToggle,
  hasSpouse,
  onHasSpouseChange,
  spAge,
  onSpAgeChange,
  spLife,
  onSpLifeChange,
  spSalary,
  onSpSalaryChange,
  spOtherInc,
  onSpOtherIncChange,
  spWealth,
  onSpWealthChange,
  spAdd,
  onSpAddChange,
  spRate,
  onSpRateChange,
  spDisabled,
  onSpDisabledChange,
  spLtc,
  onSpLtcChange,
  hasFather,
  onHasFatherChange,
  faAge,
  onFaAgeChange,
  faLife,
  onFaLifeChange,
  faClaimTax,
  onFaClaimTaxChange,
  faTaxInc,
  onFaTaxIncChange,
  faDisabled,
  onFaDisabledChange,
  faLtc,
  onFaLtcChange,
  hasMother,
  onHasMotherChange,
  moAge,
  onMoAgeChange,
  moLife,
  onMoLifeChange,
  moClaimTax,
  onMoClaimTaxChange,
  moTaxInc,
  onMoTaxIncChange,
  moDisabled,
  onMoDisabledChange,
  moLtc,
  onMoLtcChange,
  hasGrand,
  onHasGrandChange,
  gpCount,
  onGpCountChange,
  gpAge,
  onGpAgeChange,
  gpLife,
  onGpLifeChange,
  gpClaimTax,
  onGpClaimTaxChange,
  gpTaxInc,
  onGpTaxIncChange,
  gpDependent,
  onGpDependentChange,
  gpDisabledCount,
  onGpDisabledCountChange,
  gpLtcCount,
  onGpLtcCountChange,
  kids,
  onKidsChange,
  siblings,
  onSiblingsChange,
  dailyToolVal,
  onDailyToolValChange,
  jobToolVal,
  onJobToolValChange,
}: FamilyPanelProps) {
  const addKid = () => {
    onKidsChange([...kids, { id: `kid_${Date.now()}`, age: 0, life: 85, dep_age: 22, disabled: false, ltc: false }]);
  };
  const updateKid = (id: string, patch: Partial<KidRecord>) => {
    onKidsChange(kids.map((kid) => kid.id === id ? { ...kid, ...patch } : kid));
  };
  const deleteKid = (id: string) => onKidsChange(kids.filter((kid) => kid.id !== id));

  const addSibling = () => {
    onSiblingsChange([...siblings, { id: `sib_${Date.now()}`, age: 30, life: 85, dependent: false, claim_tax: false, tax_inc: 0, disabled: false, ltc: false }]);
  };
  const updateSibling = (id: string, patch: Partial<SiblingRecord>) => {
    onSiblingsChange(siblings.map((sibling) => sibling.id === id ? { ...sibling, ...patch } : sibling));
  };
  const deleteSibling = (id: string) => onSiblingsChange(siblings.filter((sibling) => sibling.id !== id));

  return (
    <div className="border border-slate-800 rounded-lg bg-slate-950/40">
      <button onClick={onToggle} className="w-full bg-slate-950 px-4 py-2.5 text-left font-semibold text-xs text-slate-300 flex justify-between">
        <span>👨‍👩‍👧‍👦 7. 家族親屬與稅務對沖配置</span><span>{isOpen ? "▲" : "▼"}</span>
      </button>
      {isOpen && (
        <div className="p-4 space-y-3 text-xs border-t border-slate-800">
          <div className="bg-slate-950 p-2 rounded border border-slate-800 space-y-2">
            <div className="flex justify-between font-bold text-blue-300 border-b border-slate-800 pb-1"><span>👩 配偶</span><input type="checkbox" checked={hasSpouse} onChange={(e) => onHasSpouseChange(e.target.checked)} /></div>
            {hasSpouse && (
              <div className="grid grid-cols-2 gap-2">
                <div><label>年紀</label><input type="number" value={spAge} onChange={(e) => onSpAgeChange(Number(e.target.value))} className="w-full bg-slate-900 rounded p-1" /></div>
                <div><label>壽命</label><input type="number" value={spLife} onChange={(e) => onSpLifeChange(Number(e.target.value))} className="w-full bg-slate-900 rounded p-1" /></div>
                <div><label>年薪(萬)</label><input type="number" value={spSalary} onChange={(e) => onSpSalaryChange(Number(e.target.value))} className="w-full bg-slate-900 rounded p-1" /></div>
                <div><label>其他年收(萬)</label><input type="number" value={spOtherInc} onChange={(e) => onSpOtherIncChange(Number(e.target.value))} className="w-full bg-slate-900 rounded p-1" /></div>
                <div><label>淨資產(萬)</label><input type="number" value={spWealth} onChange={(e) => onSpWealthChange(Number(e.target.value))} className="w-full bg-slate-900 rounded p-1" /></div>
                <div><label>年增投入(萬)</label><input type="number" value={spAdd} onChange={(e) => onSpAddChange(Number(e.target.value))} className="w-full bg-slate-900 rounded p-1" /></div>
                <div><label>預期報酬(%)</label><input type="number" value={spRate} onChange={(e) => onSpRateChange(Number(e.target.value))} className="w-full bg-slate-900 rounded p-1" /></div>
                <div className="col-span-2 flex justify-between"><label><input type="checkbox" checked={spDisabled} onChange={(e) => onSpDisabledChange(e.target.checked)} /> 身障</label><label><input type="checkbox" checked={spLtc} onChange={(e) => onSpLtcChange(e.target.checked)} /> 長照</label></div>
              </div>
            )}
          </div>

          <div className="bg-slate-950 p-2 rounded border border-slate-800 space-y-2">
            <div className="flex justify-between font-bold text-slate-300"><span>👴 父親</span><input type="checkbox" checked={hasFather} onChange={(e) => onHasFatherChange(e.target.checked)} /></div>
            {hasFather && (
              <div className="grid grid-cols-2 gap-2 border-t border-slate-800 pt-1">
                <div><label>年紀</label><input type="number" value={faAge} onChange={(e) => onFaAgeChange(Number(e.target.value))} className="w-full bg-slate-900 rounded p-1" /></div>
                <div><label>壽命</label><input type="number" value={faLife} onChange={(e) => onFaLifeChange(Number(e.target.value))} className="w-full bg-slate-900 rounded p-1" /></div>
                <label className="col-span-2"><input type="checkbox" checked={faClaimTax} onChange={(e) => onFaClaimTaxChange(e.target.checked)} /> 報稅扶養</label>
                {faClaimTax && <div className="col-span-2"><label>應稅所得(萬)</label><input type="number" value={faTaxInc} onChange={(e) => onFaTaxIncChange(Number(e.target.value))} className="w-full bg-slate-900 rounded p-1" /></div>}
                <div className="col-span-2 flex justify-between"><label><input type="checkbox" checked={faDisabled} onChange={(e) => onFaDisabledChange(e.target.checked)} /> 身障</label><label><input type="checkbox" checked={faLtc} onChange={(e) => onFaLtcChange(e.target.checked)} /> 長照</label></div>
              </div>
            )}
          </div>

          <div className="bg-slate-950 p-2 rounded border border-slate-800 space-y-2">
            <div className="flex justify-between font-bold text-slate-300"><span>👵 母親</span><input type="checkbox" checked={hasMother} onChange={(e) => onHasMotherChange(e.target.checked)} /></div>
            {hasMother && (
              <div className="grid grid-cols-2 gap-2 border-t border-slate-800 pt-1">
                <div><label>年紀</label><input type="number" value={moAge} onChange={(e) => onMoAgeChange(Number(e.target.value))} className="w-full bg-slate-900 rounded p-1" /></div>
                <div><label>壽命</label><input type="number" value={moLife} onChange={(e) => onMoLifeChange(Number(e.target.value))} className="w-full bg-slate-900 rounded p-1" /></div>
                <label className="col-span-2"><input type="checkbox" checked={moClaimTax} onChange={(e) => onMoClaimTaxChange(e.target.checked)} /> 報稅扶養</label>
                {moClaimTax && <div className="col-span-2"><label>應稅所得(萬)</label><input type="number" value={moTaxInc} onChange={(e) => onMoTaxIncChange(Number(e.target.value))} className="w-full bg-slate-900 rounded p-1" /></div>}
                <div className="col-span-2 flex justify-between"><label><input type="checkbox" checked={moDisabled} onChange={(e) => onMoDisabledChange(e.target.checked)} /> 身障</label><label><input type="checkbox" checked={moLtc} onChange={(e) => onMoLtcChange(e.target.checked)} /> 長照</label></div>
              </div>
            )}
          </div>

          <div className="bg-slate-950 p-2 rounded border border-slate-800 space-y-2">
            <div className="flex justify-between font-bold text-slate-300"><span>🧓 祖父母</span><input type="checkbox" checked={hasGrand} onChange={(e) => onHasGrandChange(e.target.checked)} /></div>
            {hasGrand && (
              <div className="grid grid-cols-2 gap-2 border-t border-slate-800 pt-1">
                <div><label>在世人數</label><input type="number" min="0" max="4" value={gpCount} onChange={(e) => onGpCountChange(Number(e.target.value))} className="w-full bg-slate-900 rounded p-1" /></div>
                <div><label>平均現年</label><input type="number" value={gpAge} onChange={(e) => onGpAgeChange(Number(e.target.value))} className="w-full bg-slate-900 rounded p-1" /></div>
                <div><label>平均壽命</label><input type="number" value={gpLife} onChange={(e) => onGpLifeChange(Number(e.target.value))} className="w-full bg-slate-900 rounded p-1" /></div>
                <label className="col-span-2"><input type="checkbox" checked={gpClaimTax} onChange={(e) => onGpClaimTaxChange(e.target.checked)} /> 報稅扶養</label>
                {gpClaimTax && <div className="col-span-2"><label>應稅所得(萬)</label><input type="number" value={gpTaxInc} onChange={(e) => onGpTaxIncChange(Number(e.target.value))} className="w-full bg-slate-900 rounded p-1" /></div>}
                <label className="col-span-2"><input type="checkbox" checked={gpDependent} onChange={(e) => onGpDependentChange(e.target.checked)} /> 受繼承人扶養(遺產稅)</label>
                <div><label>身障人數</label><input type="number" max={gpCount} value={gpDisabledCount} onChange={(e) => onGpDisabledCountChange(Number(e.target.value))} className="w-full bg-slate-900 rounded p-1" /></div>
                <div><label>長照人數</label><input type="number" max={gpCount} value={gpLtcCount} onChange={(e) => onGpLtcCountChange(Number(e.target.value))} className="w-full bg-slate-900 rounded p-1" /></div>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button onClick={addKid} className="w-full bg-emerald-900 py-1 rounded">➕ 子女</button>
            <button onClick={addSibling} className="w-full bg-emerald-900 py-1 rounded">➕ 手足</button>
          </div>

          {kids.map((kid, index) => (
            <div key={kid.id} className="bg-slate-950 p-2 rounded border border-slate-800">
              <div className="flex justify-between text-emerald-400 font-bold mb-1"><span>🟢 子女 {index + 1}</span><button onClick={() => deleteKid(kid.id)}>🗑️</button></div>
              <div className="grid grid-cols-3 gap-2">
                <div><label>現年</label><input type="number" value={kid.age} onChange={(e) => updateKid(kid.id, { age: Number(e.target.value) })} className="w-full bg-slate-900 rounded p-1" /></div>
                <div><label>壽命</label><input type="number" value={kid.life} onChange={(e) => updateKid(kid.id, { life: Number(e.target.value) })} className="w-full bg-slate-900 rounded p-1" /></div>
                <div><label>扶養至</label><input type="number" value={kid.dep_age} onChange={(e) => updateKid(kid.id, { dep_age: Number(e.target.value) })} className="w-full bg-slate-900 rounded p-1" /></div>
              </div>
              <div className="flex justify-between mt-1"><label><input type="checkbox" checked={kid.disabled} onChange={(e) => updateKid(kid.id, { disabled: e.target.checked })} /> 身障</label><label><input type="checkbox" checked={kid.ltc} onChange={(e) => updateKid(kid.id, { ltc: e.target.checked })} /> 長照</label></div>
            </div>
          ))}

          {siblings.map((sibling, index) => (
            <div key={sibling.id} className="bg-slate-950 p-2 rounded border border-slate-800">
              <div className="flex justify-between text-orange-400 font-bold mb-1"><span>🟠 手足 {index + 1}</span><button onClick={() => deleteSibling(sibling.id)}>🗑️</button></div>
              <div className="grid grid-cols-2 gap-2">
                <div><label>現年</label><input type="number" value={sibling.age} onChange={(e) => updateSibling(sibling.id, { age: Number(e.target.value) })} className="w-full bg-slate-900 rounded p-1" /></div>
                <div><label>壽命</label><input type="number" value={sibling.life} onChange={(e) => updateSibling(sibling.id, { life: Number(e.target.value) })} className="w-full bg-slate-900 rounded p-1" /></div>
              </div>
              <label className="block mt-1"><input type="checkbox" checked={sibling.claim_tax} onChange={(e) => updateSibling(sibling.id, { claim_tax: e.target.checked })} /> 報稅扶養</label>
              {sibling.claim_tax && <div className="mt-1"><label>應稅所得(萬)</label><input type="number" value={sibling.tax_inc} onChange={(e) => updateSibling(sibling.id, { tax_inc: Number(e.target.value) })} className="w-full bg-slate-900 rounded p-1" /></div>}
              <label className="block mt-1"><input type="checkbox" checked={sibling.dependent} onChange={(e) => updateSibling(sibling.id, { dependent: e.target.checked })} /> 受繼承人扶養(遺產稅)</label>
              <div className="flex justify-between mt-1"><label><input type="checkbox" checked={sibling.disabled} onChange={(e) => updateSibling(sibling.id, { disabled: e.target.checked })} /> 身障</label><label><input type="checkbox" checked={sibling.ltc} onChange={(e) => updateSibling(sibling.id, { ltc: e.target.checked })} /> 長照</label></div>
            </div>
          ))}

          <div className="grid grid-cols-2 gap-2 border-t border-slate-800 pt-2">
            <div><label>遺產日常用品(萬)</label><input type="number" value={dailyToolVal} onChange={(e) => onDailyToolValChange(Number(e.target.value))} className="w-full bg-slate-900 rounded p-1" /></div>
            <div><label>遺產職業工具(萬)</label><input type="number" value={jobToolVal} onChange={(e) => onJobToolValChange(Number(e.target.value))} className="w-full bg-slate-900 rounded p-1" /></div>
          </div>
        </div>
      )}
    </div>
  );
}
