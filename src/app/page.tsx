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
  const [activeTab, setActiveTab] = useState<string>("main");

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
    { id: "asset_cash_default", name: "日常活存", type: "現金", value: 8000, rate: 1.0, monthly_add: 0, add_years: 0, tax_type: "國內利息(計入27萬)" }
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
  const [tmpHMethod, setTmpHMethod] = useState;
  
  const [debts, setDebts] = useState<any[]>([]);
  const [tmpDName, setTmpDName] = useState("信用貸款");
  const [tmpDAmt, setTmpDAmt] = useState(100);
  const [tmpDYears, setTmpDYears] = useState(7);
  const [tmpDRate, setTmpDRate] = useState(3.5);

  // --- 6. 家族成員與稅務扶養扣除額 ---
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
  const [tmpEvAmt, setTmpEvAmt] = useState(-400); 
  const [tmpEvDuration, setTmpEvDuration] = useState(4);

  // --- 法規常數設定 ---
  const [taxParams, setTaxParams] = useState<Record<string, number>>({
    exemption: 9.7, std_deduction: 13.1, salary_deduction: 21.8, inc_disabled_ded: 21.8,
    savings_limit: 27.0, amt_threshold: 750.0, rent_limit: 18.0, mortgage_limit: 30.0,
    ins_limit: 2.4, retire_exempt: 81.4, manual_itemized: 0.0, basic_living: 21.8,
    ltc_deduction: 12.0, preschool_1st: 12.0, preschool_2nd: 15.0
  });

  const updateTaxParam = (key: string, val: number) => {
    setTaxParams({ ...taxParams, [key]: val });
  };

  // --- 列表新增功能器 ---
  const addExtraIncome = () => setExtraIncomes([...extraIncomes, { id: `inc_${Date.now()}`, name: tmpIncName, type: tmpIncType, amount: tmpIncAmt }]);
  const addAssetAccount = () => setAssets([...assets, { id: `ast_${Date.now()}`, name: tmpAssetName, type: tmpAssetType, value: tmpAssetVal, rate: tmpAssetRate, monthly_add: 0, add_years: 0, tax_type: tmpAssetTax }]);
  const addDebtPlan = () => setDebts([...debts, { id: `d_${Date.now()}`, name: tmpDName, start: currentAge, loan_amount: tmpDAmt, years: tmpDYears, rate: tmpDRate, monthly_pay: Math.round((tmpDAmt * 10000 * (tmpDRate/100/12)) / (1 - Math.pow(1 + tmpDRate/100/12, -tmpDYears*12))) }]);
  const addInsurancePolicy = () => setInsurances([...insurances, { id: `ins_${Date.now()}`, name: tmpInsName, type: "人壽保險", app: "本人", ins: "本人", ben: [tmpInsBen], premium: tmpInsPremium, years: tmpInsYears, cv: tmpInsCv, irr: tmpInsIrr, db: tmpInsDb, survival: 0, survival_age: 65 }]);
  const addFutureEvent = () => setEvents([...events, { id: `ev_${Date.now()}`, label: tmpEvName, age: tmpEvAge, amount: tmpEvAmt * 10000, target: "預設現金流", duration: tmpEvDuration }]);

  const handleKidChange = (count: number) => {
    setKidCount(count);
    setKids(Array.from({ length: count }, (_, i) => kids[i] || { id: `kid_${i}`, age: 10, ltc: false }));
  };
  const handleSiblingChange = (count: number) => {
    setSiblingCount(count);
    setSiblings(Array.from({ length: count }, (_, i) => siblings[i] || { id: `sib_${i}`, age: 35, ltc: false }));
  };

  // --- 發射引擎 ---
  const handleSimulate = async () => {
    setIsLoading(true);
    try {
      const payload = {
        timeline: { current_age: currentAge, life_expectancy: lifeExpectancy, retire_age: retireAge, salary_growth: salaryGrowth / 100, inflation_rate: inflationRate / 100, replacement_rate: replacementRate / 100, roi_after_retire: roiAfterRetire / 100 },
        assets: assets.map(a => ({...a, rate: a.rate / 100})),
        insurances: insurances.map(ins => ({ ...ins, ben_allocation: "均分比例", custom_ben: "", irr: ins.irr / 100 })),
        // 找到 mortgages 這行，把 "本利平均" 改成 tmpHMethod
mortgages: hasHouse ? [{ id: "house_1", name: tmpHName, start: currentAge, total_price: tmpHPrice, loan_amount: tmpHPrice * (1 - tmpHDownPct / 100), years: 30, grace: tmpHGrace, rate: tmpHRate, method: tmpHMethod, replace_rent: true, claim_tax: true }] : [],
        debts: debts,
        extra_incomes: extraIncomes.map(inc => ({ id: inc.id, name: inc.name, type: inc.type, monthly_amt: inc.amount })),
        events: events,
        family: {
          has_spouse: hasSpouse, has_father: hasFather, has_mother: hasMother, has_grand: false,
          sp_age: spAge, sp_life: 88, sp_wealth: spWealth, sp_disabled: spLtc, sp_ltc: spLtc,
          kids: kids.map(k => ({ id: k.id, age: k.age, dep_age: 22, life: 85, disabled: k.ltc, ltc: k.ltc })), 
          siblings: siblings.map(s => ({ id: s.id, age: s.age, life: 85, claim_tax: true, tax_inc: 0, dependent: true, disabled: s.ltc, ltc: s.ltc })),
          daily_tool_val: 0, job_tool_val: 0
        },
        pension: { mode: pensionMode, lb_salary: 45800, lb_current_years: lbYears },
        tax_params: taxParams,
        main_salary: mainSalary, 
        base_m_exp: baseExp 
      };

      const response = await fetch("https://wealth-dashboard-api.onrender.com/api/v1/wealth/simulate", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`伺服器拒絕請求 (代碼: ${response.status})\n詳細原因: ${errText}`);
      }
      
      const data = await response.json();
      setSimulationResult(data);
    } catch (error: any) {
      alert(`連線或運算異常:\n${error.message}`);
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

  const snapReport = simulationResult?.trajectory?.find((d: any) => d.年紀 == selectedReportAge);

  const renderInheritanceTable = () => {
    if (!snapReport) return null;
    const base_yuan = snapReport.民法繼承基數 * 10000;
    const payouts = snapReport.保單理賠分配 || {};
    
    let rows: any[] = [];
    let kids_cnt = kidCount;
    let total_heads = kids_cnt + (hasSpouse ? 1 : 0);
    
    if (hasSpouse) {
      const share_ratio = total_heads > 0 ? 1 / total_heads : 1.0;
      const stat_amt = base_yuan * share_ratio;
      const ins_amt = payouts["配偶"] || 0;
      rows.push({ role: "配偶", ratio: `${(share_ratio*100).toFixed(1)}%`, stat: stat_amt, forced: stat_amt * 0.5, ins: ins_amt, total: stat_amt + ins_amt });
    }
    
    for (let i = 0; i < kids_cnt; i++) {
      const share_ratio = total_heads > 0 ? 1 / total_heads : 0;
      const stat_amt = base_yuan * share_ratio;
      const ins_amt = payouts["指定特定子女"] ? (payouts["指定特定子女"] / kids_cnt) : 0;
      rows.push({ role: `子女 ${i+1}`, ratio: `${(share_ratio*100).toFixed(1)}%`, stat: stat_amt, forced: stat_amt * 0.5, ins: ins_amt, total: stat_amt + ins_amt });
    }

    if (rows.length === 0) {
       rows.push({ role: "法定繼承人", ratio: "100%", stat: base_yuan, forced: base_yuan * 0.5, ins: payouts["法定繼承人"] || 0, total: base_yuan + (payouts["法定繼承人"] || 0) });
    }

    return (
      <table className="w-full text-left border-collapse text-xs font-mono">
        <thead>
          <tr className="border-b border-slate-800 text-slate-400 bg-slate-950">
            <th className="p-2">法定繼承人</th>
            <th className="p-2 text-right">應繼分比例</th>
            <th className="p-2 text-right">應繼分金額</th>
            <th className="p-2 text-right text-purple-400">特留分保底線</th>
            <th className="p-2 text-right text-blue-400">專屬保單理賠</th>
            <th className="p-2 text-right text-emerald-400 font-bold">預估最終獲取總額</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-900">
          {rows.map((r, i) => (
            <tr key={i} className="hover:bg-slate-900/40">
              <td className="p-2 text-white font-bold">{r.role}</td>
              <td className="p-2 text-right">{r.ratio}</td>
              <td className="p-2 text-right text-slate-300">{Math.round(r.stat).toLocaleString()} 元</td>
              <td className="p-2 text-right text-purple-300">{Math.round(r.forced).toLocaleString()} 元</td>
              <td className="p-2 text-right text-blue-300">{Math.round(r.ins).toLocaleString()} 元</td>
              <td className="p-2 text-right text-emerald-400 font-bold">{Math.round(r.total).toLocaleString()} 元</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 md:p-8 font-sans overflow-x-hidden">
      <div className="max-w-[1750px] mx-auto">
        <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center border-b border-slate-800 pb-6 mb-8 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-wider text-slate-100 flex items-center gap-3">
              🛡️ 全方位資產配置與民法傳承精算系統 <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded font-mono">V3.5完全體</span>
            </h1>
            <p className="text-slate-400 mt-2 text-xs md:text-sm">AI-Driven Wealth & Succession Planning System (全端模組裝載完畢)</p>
          </div>
          <div className="bg-slate-900 px-4 py-2 rounded border border-slate-800 text-xs text-emerald-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>法規引擎管線全線暢通
          </div>
        </header>

        {/* 導覽 Tab 分頁區 */}
        <div className="flex border-b border-slate-800 gap-2 mb-6">
          <button onClick={()=>setActiveTab("main")} className={`px-4 py-2 text-sm font-semibold transition-all ${activeTab==="main"?"border-b-2 border-blue-500 text-blue-400 bg-slate-900/40":"text-slate-400"}`}>📊 現金流與資產傳承</button>
          <button onClick={()=>setActiveTab("tax")} className={`px-4 py-2 text-sm font-semibold transition-all ${activeTab==="tax"?"border-b-2 border-blue-500 text-blue-400 bg-slate-900/40":"text-slate-400"}`}>🏛️ 所得稅與最低稅負(AMT)精算控制台</button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          
          {/* 左側：極限加長版模組化控制台 (7大模組全數回歸) */}
          <div className="xl:col-span-4 bg-slate-900 border border-slate-800 p-4 md:p-6 rounded-xl shadow-2xl flex flex-col h-fit max-h-[88vh] overflow-y-auto space-y-4 custom-scrollbar">
            <h2 className="text-base font-bold text-blue-400 pb-2 border-b border-slate-800 flex justify-between items-center">
              <span>▍ 決策控制中樞</span>
              <span className="text-[10px] text-slate-500 font-mono">SCROLLABLE</span>
            </h2>
            
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
                      <div><label className="text-slate-400">預計退休：<span className="text-orange-400 font-bold">{retireAge}歲</span></label><input type="range" min={currentAge} max="110" value={retireAge} onChange={(e)=>setRetireAge(Number(e.target.value))} className="w-full accent-orange-500"/></div>
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
                        <input type="number" placeholder="金額(萬)" value={tmpAssetVal} onChange={(e)=>setTmpAssetVal(Number(e.target.value))} className="bg-slate-900 border border-slate-700 rounded p-1 font-mono text-[11px]"/>
                        <input type="number" placeholder="報酬(%)" value={tmpAssetRate} onChange={(e)=>setTmpAssetRate(Number(e.target.value))} className="bg-slate-900 border border-slate-700 rounded p-1 font-mono text-[11px]"/>
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
                      <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-800">
                        <input type="number" placeholder="總價(萬)" value={tmpHPrice} onChange={(e)=>setTmpHPrice(Number(e.target.value))} className="bg-slate-900 border border-slate-700 rounded p-1 text-[11px]"/>
                        <input type="number" placeholder="寬限期" value={tmpHGrace} onChange={(e)=>setTmpHGrace(Number(e.target.value))} className="bg-slate-900 border border-slate-700 rounded p-1 text-[11px]"/>
                        {/* 這裡就是加裝下拉選單的地方，且寬度已經自動適應成 3 欄 (grid-cols-3) */}
                        <select value={tmpHMethod} onChange={(e)=>setTmpHMethod(e.target.value)} className="bg-slate-900 border border-slate-700 rounded p-1 text-[11px] text-white">
                          <option value="本利平均">本利平均攤還</option>
                          <option value="本金平均">本金平均攤還</option>
                        </select>
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
                        <input type="number" placeholder="年保費(萬)" value={tmpInsPremium} onChange={(e)=>setTmpInsPremium(Number(e.target.value))} className="bg-slate-900 border border-slate-700 rounded p-1 font-mono"/>
                        <input type="number" placeholder="IRR%" value={tmpInsIrr} onChange={(e)=>setTmpInsIrr(Number(e.target.value))} className="bg-slate-900 border border-slate-700 rounded p-1 font-mono"/>
                        <input type="number" placeholder="身故保額(萬)" value={tmpInsDb} onChange={(e)=>setTmpInsDb(Number(e.target.value))} className="bg-slate-900 border border-slate-700 rounded p-1 font-mono"/>
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
              {isLoading ? "全端精密運算中..." : "🚀 一鍵啟動全端精算"}
            </button>
          </div>

          {/* 右側：多維戰情看板與大腦解讀區 */}
          <div className="xl:col-span-8 space-y-8">
            
            {activeTab === "main" && (
              <div className="space-y-6 animate-fade-in">
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

                {/* 逐年財富軌跡數據表 (Data Grid) */}
                {simulationResult && (
                  <div className="bg-slate-900 border border-slate-800 p-4 md:p-6 rounded-xl shadow-2xl space-y-4 animate-fade-in">
                    <h2 className="text-base font-semibold text-blue-400 flex items-center gap-2 border-b border-slate-800 pb-3">
                      <span>📋 逐年現金流與稅務財富軌跡明細 (Data Grid)</span>
                    </h2>
                    <div className="overflow-x-auto max-h-[400px] border border-slate-800 rounded-lg custom-scrollbar">
                      <table className="w-full text-left border-collapse text-xs md:text-sm whitespace-nowrap">
                        <thead className="bg-slate-950 sticky top-0 z-10 shadow-md">
                          <tr className="border-b border-slate-800 text-slate-400">
                            <th className="py-3 px-4 font-semibold">年齡</th>
                            <th className="py-3 px-4 text-right font-semibold text-blue-400">預估總資產 (萬)</th>
                            <th className="py-3 px-4 text-right font-semibold text-red-400">遺產稅缺口 (萬)</th>
                            <th className="py-3 px-4 text-right font-semibold text-emerald-400">配偶請求權 (萬)</th>
                            <th className="py-3 px-4 text-right font-semibold">年金收入 (元)</th>
                            <th className="py-3 px-4 text-right font-semibold text-orange-400">應納所得稅金 (元)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 text-slate-300 font-mono">
                          {simulationResult.trajectory.map((row: any, idx: number) => (
                            <tr key={idx} className="hover:bg-slate-800/50 transition-colors">
                              <td className="py-2.5 px-4 text-center bg-slate-950/50 text-white font-bold">{row.年紀} 歲</td>
                              <td className="py-2.5 px-4 text-right text-blue-300">{row.總資產_萬?.toLocaleString()}</td>
                              <td className="py-2.5 px-4 text-right text-red-400 font-bold">{row.預估遺產稅_萬?.toLocaleString()}</td>
                              <td className="py-2.5 px-4 text-right text-emerald-400">{row.差額分配請求權?.toLocaleString()}</td>
                              <td className="py-2.5 px-4 text-right">{Math.round(row.收_年金收入 || 0).toLocaleString()}</td>
                              <td className="py-2.5 px-4 text-right text-orange-300">{Math.round(row.支_所得稅金 || 0).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 深度報表分頁表格與民法試算明細 */}
                {simulationResult && (
                  <div className="bg-slate-900 border border-slate-800 p-4 md:p-6 rounded-xl shadow-2xl space-y-4">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-800 pb-3 gap-2">
                      <h2 className="text-base font-semibold text-purple-400">🏛️ 民法應繼分與特留分保單雙軌變現分配明細表</h2>
                      <div className="flex items-center gap-3 w-full md:w-auto">
                        <span className="text-xs text-slate-400 whitespace-nowrap">模擬身故年齡:</span>
                        <input type="range" min={currentAge} max={lifeExpectancy} value={selectedReportAge} onChange={(e)=>setSelectedReportAge(Number(e.target.value))} className="w-full md:w-48 accent-blue-500"/>
                        <span className="text-blue-400 font-bold font-mono text-sm whitespace-nowrap">{selectedReportAge}歲</span>
                      </div>
                    </div>
                    {renderInheritanceTable()}
                  </div>
                )}
              </div>
            )}

            {/* ⚙️ 完美復刻 Streamlit 的 16 大法規常數調整控制台面板頁面 */}
            {activeTab === "tax" && (
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-4 animate-fade-in text-xs">
                <h2 className="text-sm font-bold text-emerald-400 pb-2 border-b border-slate-800">⚙️ 國家級稅務法規與特別扣除額參數台 (全配完全體)</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-2">
                    <p className="font-bold text-blue-300">📌 免稅額與基本扣除</p>
                    <div><label className="text-slate-500">個人免稅基準 (萬)</label><input type="number" value={taxParams.exemption} onChange={(e)=>updateTaxParam("exemption", Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 p-1 rounded font-mono"/></div>
                    <div><label className="text-slate-500">標準扣除額 (萬)</label><input type="number" value={taxParams.std_deduction} onChange={(e)=>updateTaxParam("std_deduction", Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 p-1 rounded font-mono"/></div>
                    <div><label className="text-slate-500">薪資特別扣除 (萬)</label><input type="number" value={taxParams.salary_deduction} onChange={(e)=>updateTaxParam("salary_deduction", Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 p-1 rounded font-mono"/></div>
                  </div>

                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-2">
                    <p className="font-bold text-orange-300">📌 特定支出扣除上限</p>
                    <div><label className="text-slate-500">儲蓄投資上限 (萬)</label><input type="number" value={taxParams.savings_limit} onChange={(e)=>updateTaxParam("savings_limit", Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 p-1 rounded font-mono"/></div>
                    <div><label className="text-slate-500">房貸利息扣除上限 (萬)</label><input type="number" value={taxParams.mortgage_limit} onChange={(e)=>updateTaxParam("mortgage_limit", Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 p-1 rounded font-mono"/></div>
                    <div><label className="text-slate-500">每人保費列舉上限 (萬)</label><input type="number" value={taxParams.ins_limit} onChange={(e)=>updateTaxParam("ins_limit", Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 p-1 rounded font-mono"/></div>
                  </div>

                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-2">
                    <p className="font-bold text-purple-300">📌 進階 AMT 最低稅負護城河</p>
                    <div><label className="text-slate-500">AMT 免稅起徵門檻 (萬)</label><input type="number" value={taxParams.amt_threshold} onChange={(e)=>updateTaxParam("amt_threshold", Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 p-1 rounded font-mono"/></div>
                    <div><label className="text-slate-500">每人基本生活費額度 (萬)</label><input type="number" value={taxParams.basic_living} onChange={(e)=>updateTaxParam("basic_living", Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 p-1 rounded font-mono"/></div>
                    <div><label className="text-slate-500">長照特別扣除額 (萬)</label><input type="number" value={taxParams.ltc_deduction} onChange={(e)=>updateTaxParam("ltc_deduction", Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 p-1 rounded font-mono"/></div>
                  </div>
                </div>

                {snapReport && (
                  <div className="bg-slate-950 p-4 rounded-xl border-2 border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 leading-relaxed font-mono">
                    <div className="space-y-1">
                      <p className="text-orange-400 font-bold">1️⃣ 當年所得稅拆解過程 ({selectedReportAge}歲)</p>
                      <p>➕ 綜合所得總額：{Math.round(snapReport.稅_綜合所得總額 * 10000).toLocaleString()} 元</p>
                      <p>➖ 最佳化免稅與扣除：-{Math.round((snapReport.稅_免稅額 + snapReport.稅_扣除額 + snapReport.稅_特扣總計 + snapReport.稅_基本差額) * 10000).toLocaleString()} 元</p>
                      <p className="border-t border-slate-800 pt-1 text-white font-bold">🟰 綜合所得淨額：{Math.round(snapReport.稅_綜合所得淨額 * 10000).toLocaleString()} 元</p>
                      <p className="text-emerald-400 font-bold">🧾 核定一般應納稅額：{Math.round(snapReport.稅_一般應納稅額 * 10000).toLocaleString()} 元 ({snapReport.扣除額類型}計稅 + {snapReport.股利計稅})</p>
                    </div>
                    <div className="space-y-1 border-l-0 md:border-l border-slate-800 pl-0 md:pl-4">
                      <p className="text-purple-400 font-bold">2️⃣ 最低稅負制 (AMT) 檢驗線</p>
                      <p>➕ AMT 基本所得額基數：{Math.round(snapReport.稅_AMT基本所得額 * 10000).toLocaleString()} 元</p>
                      <p>➖ 法定起徵免稅額度：-{Math.round(taxParams.amt_threshold * 10000).toLocaleString()} 元</p>
                      <p className="border-t border-slate-800 pt-1 text-white font-bold">🟰 AMT 應納稅額：{Math.round(snapReport.稅_AMT稅額 * 10000).toLocaleString()} 元</p>
                      <p className="text-amber-400 font-bold">🎯 最終應納稅額 (兩者取其高)：{Math.round(snapReport.支_所得稅金).toLocaleString()} 元 (觸發AMT: {snapReport.觸發AMT})</p>
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>
    </main>
  );
}