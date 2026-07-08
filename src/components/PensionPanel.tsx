type PensionPanelProps = {
  isOpen: boolean;
  onToggle: () => void;
  pensionMode: string;
  onPensionModeChange: (value: string) => void;
  lbSalary: number;
  onLbSalaryChange: (value: number) => void;
  lbCurrentYears: number;
  onLbCurrentYearsChange: (value: number) => void;
  nationalYears: number;
  onNationalYearsChange: (value: number) => void;
  lbAge: number;
  onLbAgeChange: (value: number) => void;
  hasOldSys: boolean;
  onHasOldSysChange: (value: boolean) => void;
  ltBal: number;
  onLtBalChange: (value: number) => void;
  ltVol: number;
  onLtVolChange: (value: number) => void;
  ltRoi: number;
  onLtRoiChange: (value: number) => void;
  pbSalary: number;
  onPbSalaryChange: (value: number) => void;
  pbYears: number;
  onPbYearsChange: (value: number) => void;
  pbAge: number;
  onPbAgeChange: (value: number) => void;
  pbType: string;
  onPbTypeChange: (value: string) => void;
  tfSys: string;
  onTfSysChange: (value: string) => void;
  tfSalary: number;
  onTfSalaryChange: (value: number) => void;
  tfYears: number;
  onTfYearsChange: (value: number) => void;
  tfBal: number;
  onTfBalChange: (value: number) => void;
  tfSal: number;
  onTfSalChange: (value: number) => void;
  tfVol: number;
  onTfVolChange: (value: number) => void;
  tfRoi: number;
  onTfRoiChange: (value: number) => void;
  milRank: string;
  onMilRankChange: (value: string) => void;
  milSalary: number;
  onMilSalaryChange: (value: number) => void;
  milYears: number;
  onMilYearsChange: (value: number) => void;
  milAge: number;
  onMilAgeChange: (value: number) => void;
  milType: string;
  onMilTypeChange: (value: string) => void;
  fmIsRich: boolean;
  onFmIsRichChange: (value: boolean) => void;
  fmAge: number;
  onFmAgeChange: (value: number) => void;
  fmBal: number;
  onFmBalChange: (value: number) => void;
  fmWage: number;
  onFmWageChange: (value: number) => void;
  fmVol: number;
  onFmVolChange: (value: number) => void;
  fmRoi: number;
  onFmRoiChange: (value: number) => void;
};

export function PensionPanel({
  isOpen,
  onToggle,
  pensionMode,
  onPensionModeChange,
  lbSalary,
  onLbSalaryChange,
  lbCurrentYears,
  onLbCurrentYearsChange,
  nationalYears,
  onNationalYearsChange,
  lbAge,
  onLbAgeChange,
  hasOldSys,
  onHasOldSysChange,
  ltBal,
  onLtBalChange,
  ltVol,
  onLtVolChange,
  ltRoi,
  onLtRoiChange,
  pbSalary,
  onPbSalaryChange,
  pbYears,
  onPbYearsChange,
  pbAge,
  onPbAgeChange,
  pbType,
  onPbTypeChange,
  tfSys,
  onTfSysChange,
  tfSalary,
  onTfSalaryChange,
  tfYears,
  onTfYearsChange,
  tfBal,
  onTfBalChange,
  tfSal,
  onTfSalChange,
  tfVol,
  onTfVolChange,
  tfRoi,
  onTfRoiChange,
  milRank,
  onMilRankChange,
  milSalary,
  onMilSalaryChange,
  milYears,
  onMilYearsChange,
  milAge,
  onMilAgeChange,
  milType,
  onMilTypeChange,
  fmIsRich,
  onFmIsRichChange,
  fmAge,
  onFmAgeChange,
  fmBal,
  onFmBalChange,
  fmWage,
  onFmWageChange,
  fmVol,
  onFmVolChange,
  fmRoi,
  onFmRoiChange,
}: PensionPanelProps) {
  return (
    <div className="border border-slate-800 rounded-lg bg-slate-950/40">
      <button onClick={onToggle} className="w-full bg-slate-950 px-4 py-2.5 text-left font-semibold text-xs text-slate-300 flex justify-between">
        <span>🏛️ 4. 國家與職業退休金專案</span><span>{isOpen ? "▲" : "▼"}</span>
      </button>
      {isOpen && (
        <div className="p-4 space-y-4 text-xs border-t border-slate-800">
          <select value={pensionMode} onChange={(e) => onPensionModeChange(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white font-bold mb-2">
            <option>💼 一般勞工</option><option>🏛️ 公教人員</option><option>🎖️ 軍職人員</option><option>🧑‍🌾 農牧業</option><option>🏢 其他職業</option><option>🚫 暫不設定(清空)</option>
          </select>

          {pensionMode.includes("勞工") && (
            <div className="space-y-4">
              <div className="bg-slate-950 p-2.5 rounded border border-slate-800 space-y-2">
                <p className="text-[11px] font-bold text-blue-400">🛡️ 勞保與國保設定 (自動擇優引擎)</p>
                <div className="grid grid-cols-2 gap-2">
                  <div><label>預估均薪(上限45800)</label><input type="number" value={lbSalary} onChange={(e) => onLbSalaryChange(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1" /></div>
                  <div><label>預計請領年齡</label><input type="number" value={lbAge} onChange={(e) => onLbAgeChange(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1" /></div>
                  <div><label>目前勞保年資</label><input type="number" value={lbCurrentYears} onChange={(e) => onLbCurrentYearsChange(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1" /></div>
                  <div><label>國保年資</label><input type="number" value={nationalYears} onChange={(e) => onNationalYearsChange(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1" /></div>
                </div>
                <label className="flex items-center gap-2"><input type="checkbox" checked={hasOldSys} onChange={(e) => onHasOldSysChange(e.target.checked)} /> 具97年底前舊制年資</label>
              </div>
              <div className="bg-slate-950 p-2.5 rounded border border-slate-800 space-y-2">
                <p className="text-[11px] font-bold text-blue-400">🏦 勞退新制專戶</p>
                <div className="grid grid-cols-3 gap-2">
                  <div><label>專戶餘額(萬)</label><input type="number" value={ltBal} onChange={(e) => onLtBalChange(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1" /></div>
                  <div><label>自提比例(%)</label><input type="number" value={ltVol} onChange={(e) => onLtVolChange(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1" /></div>
                  <div><label>專戶報酬(%)</label><input type="number" value={ltRoi} onChange={(e) => onLtRoiChange(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1" /></div>
                </div>
              </div>
            </div>
          )}

          {pensionMode.includes("公教") && (
            <div className="space-y-4">
              <div className="bg-slate-950 p-2.5 rounded border border-slate-800 space-y-2">
                <p className="text-[11px] font-bold text-purple-400">🛡️ 公保養老給付</p>
                <select value={pbType} onChange={(e) => onPbTypeChange(e.target.value)} className="w-full bg-slate-900 rounded p-1 mb-1"><option>按月領取 (養老年金)</option><option>一次請領 (養老給付)</option></select>
                <div className="grid grid-cols-3 gap-2">
                  <div><label>預估保俸(元)</label><input type="number" value={pbSalary} onChange={(e) => onPbSalaryChange(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1" /></div>
                  <div><label>公保總年資</label><input type="number" value={pbYears} onChange={(e) => onPbYearsChange(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1" /></div>
                  <div><label>請領年紀</label><input type="number" value={pbAge} onChange={(e) => onPbAgeChange(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1" /></div>
                </div>
              </div>
              <div className="bg-slate-950 p-2.5 rounded border border-slate-800 space-y-2">
                <p className="text-[11px] font-bold text-purple-400">🏛️ 退撫金制度</p>
                <select value={tfSys} onChange={(e) => onTfSysChange(e.target.value)} className="w-full bg-slate-900 rounded p-1 mb-1"><option>舊制/現職年改 (確定給付 DB)</option><option>112年後初任 (個人專戶 DC)</option></select>
                {tfSys.includes("舊制") ? (
                  <div className="grid grid-cols-2 gap-2">
                    <div><label>預估退休本俸(元)</label><input type="number" value={tfSalary} onChange={(e) => onTfSalaryChange(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1" /></div>
                    <div><label>預估退撫總年資</label><input type="number" value={tfYears} onChange={(e) => onTfYearsChange(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1" /></div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <div><label>退撫餘額(萬)</label><input type="number" value={tfBal} onChange={(e) => onTfBalChange(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1" /></div>
                    <div><label>退撫本薪(元)</label><input type="number" value={tfSal} onChange={(e) => onTfSalChange(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1" /></div>
                    <div><label>自願增提(%)</label><input type="number" step="0.1" value={tfVol} onChange={(e) => onTfVolChange(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1" /></div>
                    <div><label>專戶報酬(%)</label><input type="number" value={tfRoi} onChange={(e) => onTfRoiChange(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1" /></div>
                  </div>
                )}
              </div>
            </div>
          )}

          {pensionMode.includes("軍職") && (
            <div className="bg-slate-950 p-2.5 rounded border border-slate-800 space-y-2">
              <select value={milType} onChange={(e) => onMilTypeChange(e.target.value)} className="w-full bg-slate-900 rounded p-1 mb-1"><option>按月領取 (終身俸)</option><option>一次請領 (退伍金)</option></select>
              <select value={milRank} onChange={(e) => onMilRankChange(e.target.value)} className="w-full bg-slate-900 rounded p-1 mb-1"><option>士官 (最高替代率 95%)</option><option>軍官/將官 (最高替代率 90%)</option></select>
              <div className="grid grid-cols-3 gap-2">
                <div><label>退伍本俸(元)</label><input type="number" value={milSalary} onChange={(e) => onMilSalaryChange(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1" /></div>
                <div><label>服役總年資</label><input type="number" value={milYears} onChange={(e) => onMilYearsChange(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1" /></div>
                <div><label>退伍年紀</label><input type="number" value={milAge} onChange={(e) => onMilAgeChange(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1" /></div>
              </div>
            </div>
          )}

          {pensionMode.includes("農牧") && (
            <div className="space-y-4">
              <div className="bg-slate-950 p-2.5 rounded border border-slate-800 space-y-2">
                <label className="flex items-center gap-2 text-red-400"><input type="checkbox" checked={fmIsRich} onChange={(e) => onFmIsRichChange(e.target.checked)} /> 觸發排富條款(喪失津貼)</label>
                <div><label>老農津貼起領年齡</label><input type="number" value={fmAge} onChange={(e) => onFmAgeChange(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1" /></div>
              </div>
              <div className="bg-slate-950 p-2.5 rounded border border-slate-800 space-y-2">
                <p className="text-[11px] font-bold text-emerald-400">🚜 農民退休儲金 (農退)</p>
                <div className="grid grid-cols-2 gap-2">
                  <div><label>專戶餘額(萬)</label><input type="number" value={fmBal} onChange={(e) => onFmBalChange(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1" /></div>
                  <div><label>月投保金額(元)</label><input type="number" value={fmWage} onChange={(e) => onFmWageChange(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1" /></div>
                  <div><label>自提比例(1-10%)</label><input type="number" value={fmVol} onChange={(e) => onFmVolChange(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1" /></div>
                  <div><label>預期報酬(%)</label><input type="number" value={fmRoi} onChange={(e) => onFmRoiChange(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1" /></div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
