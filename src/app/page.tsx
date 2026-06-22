"use client";

import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Line, ComposedChart } from "recharts";

const AIIcon = () => (
  <svg className="w-6 h-6 text-emerald-400" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 6ZM12 6C13.66 6 15 7.34 15 9C15 10.66 13.66 12 12 12C10.34 12 9 10.66 9 9C9 7.34 10.34 6 12 6ZM12 20.2C9.5 20.2 7.29 18.93 6 17C6.03 15.01 10 13.9 12 13.9C13.99 13.9 17.97 15.01 18 17C16.71 18.93 14.5 20.2 12 20.2Z" fill="currentColor"/>
  </svg>
);

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [simulationResult, setSimulationResult] = useState<any>(null);
  const [activeSection, setActiveSection] = useState<string>("timeline");
  const [selectedReportAge, setSelectedReportAge] = useState<number>(40);

  // --- 1. 全局時間軸與精算參數 ---
  const [currentAge, setCurrentAge] = useState(40);
  const [lifeExpectancy, setLifeExpectancy] = useState(85);
  const [retireAge, setRetireAge] = useState(65);
  const [salaryGrowth, setSalaryGrowth] = useState(1.2);
  const [inflationRate, setInflationRate] = useState(2.0);
  const [replacementRate, setReplacementRate] = useState(70);
  const [roiAfterRetire, setRoiAfterRetire] = useState(3.0);

  useEffect(() => { setSelectedReportAge(currentAge); }, [currentAge]);

  // --- 2. 收入、六大常態開銷與動態多元所得池 ---
  const [mainSalary, setMainSalary] = useState(50000);
  const [extraIncomes, setExtraIncomes] = useState<any[]>([]);
  const [tmpIncName, setTmpIncName] = useState("兼職外快/租金");
  const [tmpIncType, setTmpIncType] = useState("執行業務-一般(9A, 扣30%成本)");
  const [tmpIncAmt, setTmpIncAmt] = useState(15000);

  const [mLiving, setMLiving] = useState(15000);
  const [mRent, setMRent] = useState(0);
  const [mInsurance, setMInsurance] = useState(2000);
  const [mLaborHealth, setMLaborHealth] = useState(2000);
  const [mParents, setMParents] = useState(5000);
  const [mOther, setMOther] = useState(6000);
  const baseExp = mLiving + mRent + mInsurance + mLaborHealth + mParents + mOther;

  // --- 3. 社會保險與職業退休金 ---
  const [pensionMode, setPensionMode] = useState("💼 一般勞工");
  const [lbYears, setLbYears] = useState(10);

  // --- 4. 動態資產池 ---
  const [assets, setAssets] = useState<any[]>([
    { id: "asset_cash_default", name: "日常活存", type: "現金", value: 8000, rate: 0.01, monthly_add: 0, add_years: 0, tax_type: "國內利息(計入27萬)" }
  ]);
  const [tmpAssetName, setTmpAssetName] = useState("股票部位");
  const [tmpAssetType, setTmpAssetType] = useState("股票");
  const [tmpAssetVal, setTmpAssetVal] = useState(2000);
  const [tmpAssetRate, setTmpAssetRate] = useState(6.0);
  const [tmpAssetTax, setTmpAssetTax] = useState("國內股利(8.5%抵減/分開)");

  // --- 5. 不動產購屋置換與信貸債務模組 ---
  const [hasHouse, setHasHouse] = useState(false);
  const [tmpHName, setTmpHName] = useState("自住房");
  const [tmpHPrice, setTmpHPrice] = useState(2500);
  const [tmpHDownPct, setTmpHDownPct] = useState(20);
  const [tmpHRate, setTmpHRate] = useState(2.1);
  const [tmpHGrace, setTmpHGrace] = useState(3);
  
  const [debts, setDebts] = useState<any[]>([]);
  const [tmpDName, setTmpDName] = useState("信用貸款");
  const [tmpDAmt, setTmpDAmt] = useState(100);
  const [tmpDYears, setTmpDYears] = useState(7);
  const [tmpDRate, setTmpDRate] = useState(3.5);

  // --- 6. 家族成員與稅務扶養扣除額 (全配版) ---
  const [hasSpouse, setHasSpouse] = useState(false);
  const [spAge, setSpAge] = useState(40);
  const [spLtc, setSpLtc] = useState(false);
  const [spWealth, setSpWealth] = useState(0);

  const [hasFather, setHasFather] = useState(false);
  const [faAge, setFaAge] = useState(70);
  const [faLtc, setFaLtc] = useState(false);
  const [hasMother, setHasMother] = useState(false);
  const [moAge, setMoAge] = useState(68);
  const [moLtc, setMoLtc] = useState(false);

  const [kidCount, setKidCount] = useState(0);
  const [kids, setKids] = useState<any[]>([]);
  const [siblingCount, setSiblingCount] = useState(0);
  const [siblings, setSiblings] = useState<any[]>([]);

  // --- 7. 獨立保單管理陣列模組 ---
  const [insurances, setInsurances] = useState<any[]>([]);
  const [tmpInsName, setTmpInsName] = useState("傳世保單");
  const [tmpInsBen, setTmpInsBen] = useState("法定繼承人");
  const [tmpInsPremium, setTmpInsPremium] = useState(20);
  const [tmpInsYears, setTmpInsYears] = useState(6);
  const [tmpInsCv, setTmpInsCv] = useState(100);
  const [tmpInsIrr, setTmpInsIrr] = useState(2.25);
  const [tmpInsDb, setTmpInsDb] = useState(500);

  // --- 8. 未來重大財務事件 ---
  const [events, setEvents] = useState<any[]>([]);
  const [tmpEvName, setTmpEvName] = useState("子女留學準備金");
  const [tmpEvAge, setTmpEvAge] = useState(50);
  const [tmpEvAmt, setTmpEvAmt] = useState(-400); // 負數代表支出
  const [tmpEvDuration, setTmpEvDuration] = useState(4);

  // --- 列表新增功能器 ---
  const addExtraIncome = () => setExtraIncomes([...extraIncomes, { id: `inc_${Date.now()}`, name: tmpIncName, type: tmpIncType, amount: tmpIncAmt }]);
  const addAssetAccount = () => setAssets([...assets, { id: `ast_${Date.now()}`, name: tmpAssetName, type: tmpAssetType, value: tmpAssetVal, rate: tmpAssetRate / 100, monthly_add: 0, add_years: 0, tax_type: tmpAssetTax }]);
  const addDebtPlan = () => setDebts([...debts, { id: `d_${Date.now()}`, name: tmpDName, start: currentAge, loan_amount: tmpDAmt, years: tmpDYears, rate: tmpDRate, monthly_pay: Math.round((tmpDAmt * 10000 * (tmpDRate/100/12)) / (1 - Math.pow(1 + tmpDRate/100/12, -tmpDYears*12))) }]);
  const addInsurancePolicy = () => setInsurances([...insurances, { id: `ins_${Date.now()}`, name: tmpInsName, type: "人壽保險", app: "本人", ins: "本人", ben: tmpInsBen, premium: tmpInsPremium, years: tmpInsYears, cv: tmpInsCv, irr: tmpInsIrr, db: tmpInsDb, survival: 0, survival_age: 65 }]);
  const addFutureEvent = () => setEvents([...events, { id: `ev_${Date.now()}`, label: tmpEvName, age: tmpEvAge, amount: tmpEvAmt * 10000, target: "預設現金流", duration: tmpEvDuration }]);

  const handleKidChange = (count: number) => {
    setKidCount(count);
    setKids(Array.from({ length: count }, (_, i) => kids[i] || { id: `kid_${i}`, age: 10, ltc: false }));
  };
  const handleSiblingChange = (count: number) => {
    setSiblingCount(count);
    setSiblings(Array.from({ length: count }, (_, i) => siblings[i] || { id: `sib_${i}`, age: 35, ltc: false }));
  };

  const handleSimulate = async () => {
    setIsLoading(true);
    try {
      const payload = {
        timeline: { current_age: currentAge, life_expectancy: lifeExpectancy, retire_age: retireAge, salary_growth: salaryGrowth / 100, inflation_rate: inflationRate / 100, replacement_rate: replacementRate / 100, roi_after_retire: roiAfterRetire / 100 },
        assets: assets,
        insurances: insurances.map(ins => ({ ...ins, irr: ins.irr / 100 })),
        mortgages: hasHouse ? [{ id: "house_1", name: tmpHName, start: currentAge, total_price: tmpHPrice, loan_amount: tmpHPrice * (1 - tmpHDownPct / 100), years: 30, grace: tmpHGrace, rate: tmpHRate, method: "本利平均", replace_rent: true, claim_tax: true }] : [],
        debts: debts,
        extra_incomes: extraIncomes.map(inc => ({ id: inc.id, name: inc.name, type: inc.type, monthly_amt: inc.amount })),
        events: events,
        family: {
          has_spouse: hasSpouse, has_father: hasFather, has_mother: hasMother, has_grand: false,
          sp_age: spAge, sp_life: 88, sp_salary: 0, sp_other_inc: 0, sp_wealth: spWealth, sp_add: 0, sp_rate: 0, sp_disabled: spLtc, sp_ltc: spLtc,
          fa_age: faAge, fa_life: 85, fa_claim_tax: true, fa_tax_inc: 0, fa_disabled: faLtc, fa_ltc: faLtc,
          mo_age: moAge, mo_life: 85, mo_claim_tax: true, mo_tax_inc: 0, mo_disabled: moLtc, mo_ltc: moLtc,
          gp_count: 0, gp_age: 75, gp_life: 85, gp_claim_tax: false, gp_tax_inc: 0, gp_dependent: false, gp_disabled_count: 0, gp_ltc_count: 0,
          kids: kids.map(k => ({ id: k.id, age: k.age, dep_age: 22, life: 85, ltc: k.ltc, disabled: k.ltc })), 
          siblings: siblings.map(s => ({ id: s.id, age: s.age, life: 85, claim_tax: true, tax_inc: 0, dependent: true, disabled: s.ltc, ltc: s.ltc }))
        },
        pension: {
          mode: pensionMode, lb_salary: 45800, lb_current_years: lbYears, national_years: 0, lb_age: 65, has_old_sys: false,
          lt_bal: 0, lt_vol: 0, lt_roi: 0, pb_salary: 0, pb_years: 0, pb_type: "", tf_sys: "", tf_salary: 0, tf_years: 0, tf_bal: 0, tf_sal: 0, tf_vol: 0,
          mil_rank: "", mil_salary: 0, mil_years: 0, mil_type: "", is_rich: false, fm_wage: 0, fm_vol: 0
        },
        main_salary: mainSalary, 
        base_m_exp: baseExp 
      };

      const response = await fetch("https://wealth-dashboard-api.onrender.com/api/v1/wealth/simulate", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error(`API 錯誤`);
      const data = await response.json();
      setSimulationResult(data);
    } catch (error: any) {
      alert("連線後端引擎失敗。請確認伺服器是否運轉中。");
    } finally {
      setIsLoading(false);
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800 border border-slate-700 p-4 rounded shadow-xl">
          <p className="text-slate-300 mb-2 font-bold">{`${label} 歲`}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">{entry.name}: {entry.value.toLocaleString()} 萬</p>
          ))}
        </div>
      );
    }
    return null;
  };

  let realMonthlyPensionWan = "0.00";
  let pensionCoverage = "0";
  let totalEstateTaxGapWan = "0.0";
  let totalMonthlyNeededCounter = 0;
  
  if (simulationResult && simulationResult.trajectory) {
    const retireData = simulationResult.trajectory.find((d: any) => d.年紀 == 65);
    if (retireData) {
        const rawPension = retireData.收_年金收入;
        realMonthlyPensionWan = (rawPension !== undefined ? (rawPension / 12 / 10000) : (mainSalary > 45800 ? 45800 : mainSalary) * lbYears * 0.0155 / 10000).toFixed(2);
        pensionCoverage = baseExp > 0 ? ((parseFloat(realMonthlyPensionWan) * 10000 / baseExp) * 100).toFixed(0) : "0";
    }
    const finalData = simulationResult.trajectory.slice(-1)[0];
    if (finalData) totalEstateTaxGapWan = (finalData.預估遺產稅_萬 || (finalData.預估遺產稅 / 10000) || 0).toFixed(1);

    events.forEach(ev => {
      const yearsToGo = ev.age - currentAge;
      if (yearsToGo > 0 && ev.amount < 0) {
        totalMonthlyNeededCounter += Math.abs(ev.amount) / (yearsToGo * 12);
      }
    });
  }

  const snapReport = simulationResult?.trajectory?.find((d: any) => d.年紀 == selectedReportAge);

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 md:p-8 font-sans overflow-x-hidden">
      <div className="max-w-[1750px] mx-auto">
        <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center border-b border-slate-800 pb-6 mb-8 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-wider text-slate-100 flex items-center gap-3">
              🛡️ 全方位資產配置與民法傳承精算系統 <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded font-mono">V3完全體</span>
            </h1>
            <p className="text-slate-400 mt-2 text-xs md:text-sm">AI-Driven Wealth & Succession Planning System (Phase 4: 全功能核載)</p>
          </div>
          <div className="bg-slate-900 px-4 py-2 rounded border border-slate-800 text-xs text-emerald-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            法規引擎管線全線暢通
          </div>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          
          {/* 左側：極限加長版模組化控制台 */}
          <div className="xl:col-span-4 bg-slate-900 border border-slate-800 p-4 md:p-6 rounded-xl shadow-2xl flex flex-col h-fit max-h-[88vh] overflow-y-auto space-y-4">
            <h2 className="text-base font-bold text-blue-400 pb-2 border-b border-slate-800 flex justify-between items-center">
              <span>▍ 決策控制中樞</span>
              <span className="text-[10px] text-slate-500 font-mono">SCROLLABLE</span>
            </h2>
            
            {/* 🛡️ 底部強制墊高 pb-32 保證輸入框不被裁切 */}
            <div className="space-y-4 pb-32">
              
              {/* 1. 時間軸 */}
              <div className="border border-slate-800 rounded-lg bg-slate-950/40">
                <button onClick={() => setActiveSection(activeSection === 'timeline' ? '' : 'timeline')} className="w-full bg-slate-950 px-4 py-2.5 text-left font-semibold text-xs text-slate-300 flex justify-between">
                  <span>📊 1. 全局時間軸與通膨設定</span><span>{activeSection === 'timeline' ? '▲' : '▼'}</span>
                </button>
                {activeSection === 'timeline' && (
                  <div className="p-4 space-y-3 text-xs border-t border-slate-800">
                    <div className="grid grid-cols-2 gap-4">
                      <div><label className="text-slate-400">目前年齡：<span className="text-blue-400 font-bold">{currentAge}歲</span></label><input type="range" min="30" max="90" value={currentAge} onChange={(e)=>setCurrentAge(Number(e.target.value))} className="w-full accent-blue-500"/></div>
                      <div><label className="text-slate-400">模擬壽命：<span className="text-emerald-400 font-bold">{lifeExpectancy}歲</span></label><input type="range" min={currentAge} max="110" value={lifeExpectancy} onChange={(e)=>setLifeExpectancy(Number(e.target.value))} className="w-full accent-emerald-500"/></div>
                    </div>
                  </div>
                )}
              </div>

              {/* 2. 收支與勞退 */}
              <div className="border border-slate-800 rounded-lg bg-slate-950/40">
                <button onClick={() => setActiveSection(activeSection === 'income' ? '' : 'income')} className="w-full bg-slate-950 px-4 py-2.5 text-left font-semibold text-xs text-slate-300 flex justify-between">
                  <span>💰 2. 多元收入與 6 大開銷明細</span><span>{activeSection === 'income' ? '▲' : '▼'}</span>
                </button>
                {activeSection === 'income' && (
                  <div className="p-4 space-y-4 text-xs border-t border-slate-800">
                    <div><label className="text-slate-400 font-bold">主業月薪 (元)</label><input type="number" value={mainSalary} onChange={(e)=>setMainSalary(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1 text-white font-mono"/></div>
                    {pensionMode === "💼 一般勞工" && (
                      <div><label className="text-slate-500">累積勞保年資: {lbYears}年</label><input type="range" min="0" max="50" value={lbYears} onChange={(e)=>setLbYears(Number(e.target.value))} className="w-full accent-blue-500"/></div>
                    )}
                    
                    {/* 動態新增多元收入 */}
                    <div className="bg-slate-950 p-2.5 rounded border border-slate-800 space-y-2">
                      <p className="text-emerald-400 font-bold text-[11px]">➕ 增置額外所得項目</p>
                      <select value={tmpIncType} onChange={(e)=>setTmpIncType(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded p-1 text-white text-[11px]"><option value="執行業務-一般(9A, 扣30%成本)">9A 執行業務所得</option><option value="租賃所得(51, 扣43%成本)">51 房屋租賃所得</option><option value="營利/股利所得(54)">54 營利股利所得</option></select>
                      <div className="grid grid-cols-2 gap-2">
                        <input type="text" value={tmpIncName} onChange={(e)=>setTmpIncName(e.target.value)} className="bg-slate-900 border border-slate-700 rounded p-1 text-white text-[11px]"/>
                        <input type="number" value={tmpIncAmt} onChange={(e)=>setTmpIncAmt(Number(e.target.value))} className="bg-slate-900 border border-slate-700 rounded p-1 text-white font-mono text-[11px]"/>
                      </div>
                      <button onClick={addExtraIncome} className="w-full bg-emerald-900 text-white text-[11px] py-1 rounded font-bold">注入多元收入池</button>
                      {extraIncomes.map(inc => <div key={inc.id} className="flex justify-between text-[10px] text-slate-400"><span>{inc.name}</span><span>{inc.amount}元</span></div>)}
                    </div>

                    {/* 六大開銷細項 */}
                    <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 grid grid-cols-2 gap-2">
                      <div className="col-span-2 text-orange-400 font-bold border-b border-slate-800 pb-1 flex justify-between"><span>💸 每月總開銷:</span><span className="font-mono">{baseExp.toLocaleString()} 元</span></div>
                      <div><label className="text-[10px] text-slate-500">生活餐費</label><input type="number" value={mLiving} onChange={(e)=>setMLiving(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1 font-mono"/></div>
                      <div><label className="text-[10px] text-slate-500">房屋租金</label><input type="number" value={mRent} onChange={(e)=>setMRent(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1 font-mono"/></div>
                      <div><label className="text-[10px] text-slate-500">醫療壽險</label><input type="number" value={mInsurance} onChange={(e)=>setMInsurance(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1 font-mono"/></div>
                      <div><label className="text-[10px] text-slate-500">勞健保費</label><input type="number" value={mLaborHealth} onChange={(e)=>setMLaborHealth(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1 font-mono"/></div>
                      <div><label className="text-[10px] text-slate-500">孝親費</label><input type="number" value={mParents} onChange={(e)=>setMParents(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1 font-mono"/></div>
                      <div><label className="text-[10px] text-slate-500">娛樂/其他</label><input type="number" value={mOther} onChange={(e)=>setMOther(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1 font-mono"/></div>
                    </div>
                  </div>
                )}
              </div>

              {/* 3. 資產池 */}
              <div className="border border-slate-800 rounded-lg bg-slate-950/40">
                <button onClick={() => setActiveSection(activeSection === 'assets' ? '' : 'assets')} className="w-full bg-slate-950 px-4 py-2.5 text-left font-semibold text-xs text-slate-300 flex justify-between">
                  <span>📈 3. 動態資產池配置清單</span><span>{activeSection === 'assets' ? '▲' : '▼'}</span>
                </button>
                {activeSection === 'assets' && (
                  <div className="p-4 space-y-3 text-xs border-t border-slate-800">
                    <div className="bg-slate-950 p-2.5 rounded border border-slate-800 space-y-2">
                      <input type="text" value={tmpAssetName} onChange={(e)=>setTmpAssetName(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded p-1 text-white text-[11px]"/>
                      <div className="grid grid-cols-3 gap-2">
                        <select value={tmpAssetType} onChange={(e)=>setTmpAssetType(e.target.value)} className="bg-slate-900 border border-slate-700 rounded p-1 text-[11px]"><option value="股票">股票</option><option value="基金">基金</option></select>
                        <input type="number" value={tmpAssetVal} onChange={(e)=>setTmpAssetVal(Number(e.target.value))} className="bg-slate-900 border border-slate-700 rounded p-1 font-mono text-[11px]"/>
                        <input type="number" value={tmpAssetRate} onChange={(e)=>setTmpAssetRate(Number(e.target.value))} className="bg-slate-900 border border-slate-700 rounded p-1 font-mono text-[11px]"/>
                      </div>
                      <button onClick={addAssetAccount} className="w-full bg-blue-900 text-white text-[11px] py-1 rounded font-bold">配置全新子帳戶</button>
                      {assets.map(a => <div key={a.id} className="flex justify-between text-[10px] text-slate-400"><span>{a.name}</span><span>{a.value}萬</span></div>)}
                    </div>
                  </div>
                )}
              </div>

              {/* 4. 負債與房產 */}
              <div className="border border-slate-800 rounded-lg bg-slate-950/40">
                <button onClick={() => setActiveSection(activeSection === 'liabilities' ? '' : 'liabilities')} className="w-full bg-slate-950 px-4 py-2.5 text-left font-semibold text-xs text-slate-300 flex justify-between">
                  <span>🏠 4. 不動產置換與信貸負債</span><span>{activeSection === 'liabilities' ? '▲' : '▼'}</span>
                </button>
                {activeSection === 'liabilities' && (
                  <div className="p-4 space-y-4 text-xs border-t border-slate-800">
                    <div className="bg-slate-950 p-2.5 rounded border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between"><span className="text-[11px] font-bold text-orange-400">➕ 啟用購屋增置</span><input type="checkbox" checked={hasHouse} onChange={(e)=>setHasHouse(e.target.checked)}/></div>
                      {hasHouse && (
                        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800">
                          <input type="number" placeholder="總價(萬)" value={tmpHPrice} onChange={(e)=>setTmpHPrice(Number(e.target.value))} className="bg-slate-900 border border-slate-700 rounded p-1 text-[11px]"/>
                          <input type="number" placeholder="寬限期" value={tmpHGrace} onChange={(e)=>setTmpHGrace(Number(e.target.value))} className="bg-slate-900 border border-slate-700 rounded p-1 text-[11px]"/>
                        </div>
                      )}
                    </div>
                    <div className="bg-slate-950 p-2.5 rounded border border-slate-800 space-y-2">
                      <p className="text-[11px] font-bold text-red-400">➕ 新增信用貸款</p>
                      <div className="grid grid-cols-3 gap-2">
                        <input type="text" value={tmpDName} onChange={(e)=>setTmpDName(e.target.value)} className="bg-slate-900 border border-slate-700 rounded p-1 text-[11px]"/>
                        <input type="number" placeholder="金額(萬)" value={tmpDAmt} onChange={(e)=>setTmpDAmt(Number(e.target.value))} className="bg-slate-900 border border-slate-700 rounded p-1 text-[11px]"/>
                        <input type="number" placeholder="年期" value={tmpDYears} onChange={(e)=>setTmpDYears(Number(e.target.value))} className="bg-slate-900 border border-slate-700 rounded p-1 text-[11px]"/>
                      </div>
                      <button onClick={addDebtPlan} className="w-full bg-red-900 text-white py-1 text-[11px] rounded font-bold">綁定負債金流</button>
                      {debts.map(d => <div key={d.id} className="text-[10px] text-slate-400">{d.name}: 貸{d.loan_amount}萬</div>)}
                    </div>
                  </div>
                )}
              </div>

              {/* 5. 家族成員 */}
              <div className="border border-slate-800 rounded-lg bg-slate-950/40">
                <button onClick={() => setActiveSection(activeSection === 'family' ? '' : 'family')} className="w-full bg-slate-950 px-4 py-2.5 text-left font-semibold text-xs text-slate-300 flex justify-between">
                  <span>👨‍👩‍👧‍👦 5. 家族親屬與長照特扣額</span><span>{activeSection === 'family' ? '▲' : '▼'}</span>
                </button>
                {activeSection === 'family' && (
                  <div className="p-4 space-y-3 text-xs border-t border-slate-800">
                    <div className="bg-slate-950 p-2 rounded border border-slate-800 flex justify-between"><span>配偶</span><input type="checkbox" checked={hasSpouse} onChange={(e)=>setHasSpouse(e.target.checked)}/></div>
                    <div className="bg-slate-950 p-2 rounded border border-slate-800 flex justify-between"><span>扶養父親</span><input type="checkbox" checked={hasFather} onChange={(e)=>setHasFather(e.target.checked)}/></div>
                    <div className="bg-slate-950 p-2 rounded border border-slate-800 flex justify-between"><span>扶養母親</span><input type="checkbox" checked={hasMother} onChange={(e)=>setHasMother(e.target.checked)}/></div>
                    <div className="space-y-2 bg-slate-950 p-2.5 rounded border border-slate-800">
                      <div className="flex justify-between"><span>子女數量:</span><span className="text-emerald-400">{kidCount}人</span></div><input type="range" min="0" max="4" value={kidCount} onChange={(e)=>handleKidChange(Number(e.target.value))} className="w-full accent-emerald-500"/>
                      <div className="flex justify-between"><span>兄弟姊妹:</span><span className="text-emerald-400">{siblingCount}人</span></div><input type="range" min="0" max="4" value={siblingCount} onChange={(e)=>handleSiblingChange(Number(e.target.value))} className="w-full accent-emerald-500"/>
                    </div>
                  </div>
                )}
              </div>

              {/* 6. 保單與傳承 */}
              <div className="border border-slate-800 rounded-lg bg-slate-950/40">
                <button onClick={() => setActiveSection(activeSection === 'insurance' ? '' : 'insurance')} className="w-full bg-slate-950 px-4 py-2.5 text-left font-semibold text-xs text-slate-300 flex justify-between">
                  <span>🛡️ 6. 專案保單與特定受益人</span><span>{activeSection === 'insurance' ? '▲' : '▼'}</span>
                </button>
                {activeSection === 'insurance' && (
                  <div className="p-4 space-y-3 text-xs border-t border-slate-800">
                    <div className="bg-slate-950 p-3 rounded border border-slate-800 space-y-2">
                      <input type="text" value={tmpInsName} onChange={(e)=>setTmpInsName(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded p-1"/>
                      <select value={tmpInsBen} onChange={(e)=>setTmpInsBen(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded p-1"><option value="法定繼承人">受益人：法定繼承人</option><option value="配偶">受益人：配偶</option><option value="指定特定子女">受益人：指定特定子女</option></select>
                      <div className="grid grid-cols-3 gap-2">
                        <input type="number" placeholder="繳費" value={tmpInsPremium} onChange={(e)=>setTmpInsPremium(Number(e.target.value))} className="bg-slate-900 border border-slate-700 rounded p-1 font-mono"/>
                        <input type="number" placeholder="IRR%" value={tmpInsIrr} onChange={(e)=>setTmpInsIrr(Number(e.target.value))} className="bg-slate-900 border border-slate-700 rounded p-1 font-mono"/>
                        <input type="number" placeholder="保額" value={tmpInsDb} onChange={(e)=>setTmpInsDb(Number(e.target.value))} className="bg-slate-900 border border-slate-700 rounded p-1 font-mono"/>
                      </div>
                      <button onClick={addInsurancePolicy} className="w-full bg-purple-900 text-white py-1 rounded font-bold">配置傳承保單</button>
                      {insurances.map(ins => <div key={ins.id} className="text-[10px] text-slate-400">{ins.name}: 保額 {ins.db}萬</div>)}
                    </div>
                  </div>
                )}
              </div>

              {/* 7. 未來重大事件逆算器 */}
              <div className="border border-slate-800 rounded-lg bg-slate-950/40">
                <button onClick={() => setActiveSection(activeSection === 'events' ? '' : 'events')} className="w-full bg-slate-950 px-4 py-2.5 text-left font-semibold text-xs text-slate-300 flex justify-between">
                  <span>📅 7. 重大未來事件與逆算器</span><span>{activeSection === 'events' ? '▲' : '▼'}</span>
                </button>
                {activeSection === 'events' && (
                  <div className="p-4 space-y-3 text-xs border-t border-slate-800">
                    <div className="bg-slate-950 p-2.5 rounded border border-slate-800 space-y-2">
                      <input type="text" value={tmpEvName} onChange={(e)=>setTmpEvName(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded p-1 text-[11px]"/>
                      <div className="grid grid-cols-3 gap-2">
                        <input type="number" placeholder="年紀" value={tmpEvAge} onChange={(e)=>setTmpEvAge(Number(e.target.value))} className="bg-slate-900 border border-slate-700 rounded p-1 text-[11px]"/>
                        <input type="number" placeholder="金額(萬,支出填負)" value={tmpEvAmt} onChange={(e)=>setTmpEvAmt(Number(e.target.value))} className="bg-slate-900 border border-slate-700 rounded p-1 text-[11px]"/>
                        <input type="number" placeholder="年期" value={tmpEvDuration} onChange={(e)=>setTmpEvDuration(Number(e.target.value))} className="bg-slate-900 border border-slate-700 rounded p-1 text-[11px]"/>
                      </div>
                      <button onClick={addFutureEvent} className="w-full bg-amber-900 text-white py-1 rounded font-bold text-[11px]">設立未來財務目標</button>
                      {events.map(ev => <div key={ev.id} className="text-[10px] text-slate-400">{ev.label}: {ev.amount/10000}萬</div>)}
                    </div>
                  </div>
                )}
              </div>

            </div>
            
            <button onClick={handleSimulate} disabled={isLoading} className={`w-full py-4 rounded-lg font-bold tracking-wide transition-all duration-300 shrink-0 ${isLoading ? "bg-slate-700 text-slate-400" : "bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]"}`}>
              {isLoading ? "核心多維合流引擎大腦精算中..." : "🚀 一鍵啟動全端精算"}
            </button>
          </div>

          {/* 右側：多維戰情看板與大腦解讀區 */}
          <div className="xl:col-span-8 space-y-8">
            
            {/* 國家級高管指標看板 */}
            {simulationResult && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in text-xs md:text-sm">
                {[
                  { label: "社會保險退休金預估", value: `約 ${realMonthlyPensionWan} 萬/月`, color: "text-blue-400", sub: `替代率核算覆蓋約 ${pensionCoverage}%` },
                  { label: "自備重大目標逆算", value: totalMonthlyNeededCounter > 0 ? `需額外 ${Math.round(totalMonthlyNeededCounter).toLocaleString()} 元/月` : "無多餘缺口", color: "text-amber-400", sub: "專款專用精算逆算結果" },
                  { label: "法定繼承遺產稅缺口風險", value: `${totalEstateTaxGapWan} 萬`, color: "text-red-400", sub: "已扣除免稅額與全部親屬扣除" },
                  { label: "民法雙軌隔離防護網", value: insurances.length > 0 ? "保單指定架構生效" : "尚未佈防", color: "text-purple-400", sub: `共納管 ${insurances.length} 筆高傳承價值標的` }
                ].map((item, idx) => (
                  <div key={idx} className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg flex flex-col justify-between">
                    <div>
                      <p className="text-slate-500 text-xs mb-1">{item.label}</p>
                      <p className={`text-lg md:text-xl font-bold tracking-tight ${item.color}`}>{item.value}</p>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-2 border-t border-slate-800/50 pt-1">{item.sub}</p>
                  </div>
                ))}
              </div>
            )}
            
            {/* 圖表呈現 */}
            <div className="bg-slate-900 border border-slate-800 p-4 md:p-6 rounded-xl shadow-2xl h-[450px] flex flex-col">
              <h2 className="text-base font-semibold mb-6 text-emerald-400 flex items-center gap-2 underline underline-offset-8 decoration-emerald-500/50">
                ▍ 終身可支配淨資產與遺產稅現金風險軌跡趨勢
              </h2>
              <div className="flex-1 w-full h-full text-xs">
                {!simulationResult ? (
                  <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-lg text-slate-600">
                    <p className="tracking-widest mb-1 text-base">等待決策控制中樞參數裝填...</p>
                    <p className="text-xs text-slate-500">請完成左側面板設定並點擊「一鍵啟動全端精算」</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={simulationResult.trajectory} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="年紀" stroke="#64748b" tick={{ fill: '#64748b' }}/>
                      <YAxis stroke="#64748b" tick={{ fill: '#64748b' }} tickFormatter={(v) => `${v}萬`}/>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ paddingTop: '10px' }} />
                      <Bar dataKey="總資產_萬" name="預估總資產" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={22}/>
                      <Line type="monotone" dataKey="預估遺產稅_萬" name="預估遺產稅現金缺口" stroke="#ef4444" strokeWidth={3} dot={{ r: 2, fill: '#ef4444' }}/>
                    </ComposedChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* 深度報表分頁表格與民法試算明細 */}
            {simulationResult && (
              <div className="bg-slate-900 border border-slate-800 p-4 md:p-6 rounded-xl shadow-2xl space-y-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-800 pb-3 gap-2">
                  <h2 className="text-base font-semibold text-blue-400">⚖️ 逐年財富結算與民法傳承試算明細報表</h2>
                  <div className="flex items-center gap-3 w-full md:w-auto">
                    <span className="text-xs text-slate-400 whitespace-nowrap">模擬身故年齡:</span>
                    <input type="range" min={currentAge} max={lifeExpectancy} value={selectedReportAge} onChange={(e)=>setSelectedReportAge(Number(e.target.value))} className="w-full md:w-48 accent-blue-500"/>
                    <span className="text-blue-400 font-bold font-mono text-sm whitespace-nowrap">{selectedReportAge}歲</span>
                  </div>
                </div>

                {snapReport ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs">
                    {/* 稅務瀑布拆解 */}
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                      <p className="font-bold text-orange-300 border-l-2 border-orange-500 pl-2 mb-2">🧾 國家級遺產稅精算瀑布表</p>
                      <div className="flex justify-between text-slate-400"><span>預估課稅總資產基準:</span><span className="font-mono text-white">{(snapReport.總資產_萬 || snapReport.總資產 || 0).toLocaleString()} 萬</span></div>
                      <div className="flex justify-between text-slate-400"><span>減: 配偶差額分配請求權:</span><span className="font-mono text-emerald-400">- {(snapReport.差額分配請求權 || 0).toFixed(0)} 萬</span></div>
                      <div className="flex justify-between text-slate-400"><span>減: 法定免稅額與扣除額總計:</span><span className="font-mono text-emerald-400">- {(snapReport.扣除額總計 || 1471).toFixed(0)} 萬</span></div>
                      <div className="border-t border-slate-800/80 my-2 pt-1 flex justify-between font-bold">
                        <span className="text-slate-300">課稅遺產淨額 (Taxable Estate):</span>
                        <span className="font-mono text-amber-400">{Math.max(0, (snapReport.總資產_萬 || 0) - (snapReport.差額分配請求權 || 0) - (snapReport.扣除額總計 || 1471)).toLocaleString()} 萬</span>
                      </div>
                      <div className="flex justify-between items-center bg-red-950/40 p-2 rounded border border-red-900/60 font-bold text-red-400">
                        <span>💥 最終核定應納遺產稅負:</span>
                        <span className="font-mono text-lg text-white">{(snapReport.預估遺產稅_萬 || snapReport.預估遺產稅 || 0).toLocaleString()} 萬</span>
                      </div>
                    </div>

                    {/* 民法分配表格 */}
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                      <p className="font-bold text-purple-300 border-l-2 border-purple-500 pl-2 mb-2">🏛️ 民法應繼分與保單雙軌變現分配表</p>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-slate-800 text-slate-500 text-[10px]"><th className="pb-1">法定繼承人身分</th><th className="pb-1 text-right">應繼分比例</th><th className="pb-1 text-right">保單指定理賠</th></tr>
                          </thead>
                          <tbody className="text-slate-300 font-mono text-[11px] divide-y divide-slate-900">
                            {hasSpouse && <tr><td className="py-1.5">配偶 (第一順位)</td><td className="text-right py-1.5">依民法合流</td><td className="text-right text-purple-400 py-1.5">{insurances.filter(i=>i.ben==="配偶").reduce((a,b)=>a+b.db, 0)} 萬</td></tr>}
                            {kidCount > 0 && <tr><td className="py-1.5">直系血親卑親屬 (子女)</td><td className="text-right py-1.5">均分剩餘比例</td><td className="text-right text-purple-400 py-1.5">{insurances.filter(i=>i.ben==="指定特定子女").reduce((a,b)=>a+b.db, 0)} 萬</td></tr>}
                            <tr><td className="py-1.5 font-bold text-slate-400">其他法定繼承人</td><td className="text-right text-slate-500 py-1.5">概括繼承</td><td className="text-right text-purple-400 py-1.5">{insurances.filter(i=>i.ben==="法定繼承人").reduce((a,b)=>a+b.db, 0)} 萬</td></tr>
                          </tbody>
                        </table>
                      </div>
                      <p className="text-[10px] text-slate-500 italic mt-2">※ 提示：此表完整實證保單如何合法跨越民法繼承順位限制，達成資產定向精準派發。</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic text-center">報表未生成。</p>
                )}
              </div>
            )}

            {/* AI 大腦精算解讀講稿 */}
            {simulationResult && (
                <div className="bg-slate-900 border-2 border-emerald-900 p-6 rounded-xl shadow-2xl animate-fade-in">
                    <div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-800">
                        <div className="bg-emerald-950 p-3 rounded-full border border-emerald-800 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                            <AIIcon />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-emerald-300">AI 深度判讀報告與高效溝通講稿</h3>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 font-mono text-emerald-100 text-sm">
                        <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 leading-relaxed space-y-3">
                            <p className="text-emerald-400 font-bold">▍ [現況智慧判讀] (顧問視角)</p>
                            <p>客戶設定現年 <span className="text-white bg-blue-900 px-1.5 py-0.5 rounded">{currentAge} 歲</span>。</p>
                            <p className="text-blue-200 border-l-2 border-blue-500 pl-2">65 歲預估提供每月 <span className="text-white bg-blue-900 px-1 rounded">{realMonthlyPensionWan} 萬</span> 安全年金，覆蓋 <span className="text-white font-bold bg-emerald-900 px-1 rounded">{pensionCoverage}%</span> 開銷。</p>
                            <p className="text-red-400 font-bold border border-red-900 bg-red-950/60 p-3 rounded-lg text-xs md:text-sm">💥 警訊：至 <span className="text-white bg-red-700 px-1 rounded">{lifeExpectancy} 歲</span> 將產生高達 <span className="text-white text-base md:text-lg bg-red-700 px-1 rounded font-mono">{totalEstateTaxGapWan} 萬</span> 遺產稅現金缺口。</p>
                        </div>
                        <div className="bg-slate-950 p-4 rounded-lg border border-emerald-800 leading-relaxed text-slate-300 text-xs md:text-sm space-y-2">
                            <p className="text-emerald-400 font-bold mb-2">▍ [高轉化談判話術] (面對客戶)</p>
                            <p className="italic">「董座，這套系統向您揭示了一個隱形考驗。自然的資產增值未來反而會成為家人的完稅重擔。」</p>
                            <p className="italic">「屆時家人必須在六個月內用純現金向國庫繳納近 <span className="text-emerald-300 font-bold underline decoration-emerald-500">{totalEstateTaxGapWan} 萬</span>。如果我們提早善用民法雙軌制，將資金重新定性為保險傳承，就能合法跨越特留分限制，精準把大筆活水交到您指定的人手上...」</p>
                        </div>
                    </div>
                </div>
            )}

          </div>
        </div>
      </div>
    </main>
  );
}