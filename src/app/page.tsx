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

  // --- 全局狀態參數 ---
  const [currentAge, setCurrentAge] = useState(40);
  const [lifeExpectancy, setLifeExpectancy] = useState(85);
  const [retireAge, setRetireAge] = useState(65);
  const [salaryGrowth, setSalaryGrowth] = useState(1.2);
  const [inflationRate, setInflationRate] = useState(2.0);
  const [replacementRate, setReplacementRate] = useState(70);
  const [roiAfterRetire, setRoiAfterRetire] = useState(3.0);
  const [mainSalary, setMainSalary] = useState(50000);

  // --- 6 大開銷細項 ---
  const [mLiving, setMLiving] = useState(15000);
  const [mRent, setMRent] = useState(0);
  const [mInsurance, setMInsurance] = useState(2000);
  const [mLaborHealth, setMLaborHealth] = useState(2000);
  const [mParents, setMParents] = useState(5000);
  const [mOther, setMOther] = useState(6000);
  const baseExp = mLiving + mRent + mInsurance + mLaborHealth + mParents + mOther;

  // --- 多元所得與資產池 ---
  const [extraIncomes, setExtraIncomes] = useState<any[]>([]);
  const [tmpIncName, setTmpIncName] = useState("兼職外快");
  const [tmpIncType, setTmpIncType] = useState("執行業務-一般(9A, 扣30%成本)");
  const [tmpIncAmt, setTmpIncAmt] = useState(15000);

  const [assets, setAssets] = useState<any[]>([]);
  const [tmpAssetName, setTmpAssetName] = useState("股票基金");
  const [tmpAssetType, setTmpAssetType] = useState("股票");
  const [tmpAssetVal, setTmpAssetVal] = useState(2000);
  const [tmpAssetRate, setTmpAssetRate] = useState(6.0);
  const [tmpAssetTax, setTmpAssetTax] = useState("國內股利(8.5%抵減/分開)");

  // --- 房產信貸與親屬群組 ---
  const [hasHouse, setHasHouse] = useState(false);
  const [tmpHPrice, setTmpHPrice] = useState(2500);
  const [tmpHGrace, setTmpHGrace] = useState(3);
  const [debts, setDebts] = useState<any[]>([]);
  const [insurances, setInsurances] = useState<any[]>([]);
  
  const [hasSpouse, setHasSpouse] = useState(false);
  const [spWealth, setSpWealth] = useState(0);
  const [spLtc, setSpLtc] = useState(false);
  const [hasFather, setHasFather] = useState(false);
  const [hasMother, setHasMother] = useState(false);
  const [kidCount, setKidCount] = useState(0);
  const [kids, setKids] = useState<any[]>([]);

  // --- ⚙️ 完美復刻 Streamlit 的 16 大法規常數控制台狀態 ---
  const [taxParams, setTaxParams] = useState<Record<string, number>>({
    exemption: 9.7, std_deduction: 13.1, salary_deduction: 21.8, inc_disabled_ded: 21.8,
    savings_limit: 27.0, amt_threshold: 750.0, rent_limit: 18.0, mortgage_limit: 30.0,
    ins_limit: 2.4, retire_exempt: 81.4, manual_itemized: 0.0, basic_living: 21.8,
    ltc_deduction: 12.0, preschool_1st: 12.0, preschool_2nd: 15.0
  });

  const updateTaxParam = (key: string, val: number) => {
    setTaxParams({ ...taxParams, [key]: val });
  };

  const addExtraIncome = () => setExtraIncomes([...extraIncomes, { id: `inc_${Date.now()}`, name: tmpIncName, type: tmpIncType, amount: tmpIncAmt }]);
  const addAssetAccount = () => setAssets([...assets, { id: `ast_${Date.now()}`, name: tmpAssetName, type: tmpAssetType, value: tmpAssetVal, rate: tmpAssetRate, monthly_add: 0, add_years: 0, tax_type: tmpAssetTax }]);
  const addInsurancePolicy = () => setInsurances([...insurances, { id: `ins_${Date.now()}`, name: "傳世富足", type: "人壽保險", app: "本人", ins: "本人", ben: ["法定繼承人"], premium: 20, years: 6, cv: 100, irr: 2.25, db: 500, survival: 0, survival_age: 65 }]);

  const handleSimulate = async () => {
    setIsLoading(true);
    try {
      // 🛡️ 完美對齊後端 Pydantic Schema 的封裝包裹
      const payload = {
        timeline: { 
          current_age: currentAge, life_expectancy: lifeExpectancy, retire_age: retireAge, 
          salary_growth: salaryGrowth / 100, inflation_rate: inflationRate / 100, replacement_rate: replacementRate / 100, roi_after_retire: roiAfterRetire / 100 
        },
        assets: assets.length > 0 ? assets.map(a => ({...a, rate: a.rate / 100})) : [{ id: "c", name: "日常活存", type: "現金", value: 500, rate: 0.01, monthly_add: 0, add_years: 0, tax_type: "國內利息(計入27萬)" }],
        insurances: insurances.map(ins => ({ ...ins, ben_allocation: "均分比例", custom_ben: "", irr: ins.irr / 100 })),
        mortgages: hasHouse ? [{ id: "h", name: "自住房", start: currentAge, total_price: tmpHPrice, loan_amount: tmpHPrice * 0.8, years: 30, grace: tmpHGrace, rate: 2.1, method: "本利平均", replace_rent: true, claim_tax: true }] : [],
        debts: debts,
        extra_incomes: extraIncomes.map(inc => ({ id: inc.id, name: inc.name, type: inc.type, monthly_amt: inc.amount })),
        events: [],
        family: { 
          has_spouse: hasSpouse, has_father: hasFather, has_mother: hasMother, has_grand: false, 
          sp_age: currentAge, sp_life: 88, sp_wealth: spWealth, sp_disabled: spLtc, sp_ltc: spLtc, 
          kids: kids.map(k => ({ id: k.id, age: k.age, dep_age: 22, life: 85, disabled: false, ltc: k.ltc })), 
          siblings: [], daily_tool_val: 0, job_tool_val: 0 
        },
        pension: { mode: "💼 一般勞工", lb_salary: 45800, lb_current_years: 15 },
        tax_params: taxParams,
        main_salary: mainSalary,
        base_m_exp: baseExp
      };

      const response = await fetch("https://wealth-dashboard-api.onrender.com/api/v1/wealth/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      // 🛡️ 攔截伺服器詳細報錯訊息，方便未來除錯
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`伺服器拒絕請求 (代碼: ${response.status})\n詳細原因: ${errText}`);
      }
      
      const data = await response.json();
      setSimulationResult(data);
    } catch (e: any) {
      alert(`連線或運算異常:\n${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const snapReport = simulationResult?.trajectory?.find((d: any) => d.年紀 == selectedReportAge);

  // --- 🏛️ 完美復刻 Streamlit 民法繼承應繼分與特留分雙軌試算 ---
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
    <main className="min-h-screen bg-slate-950 text-white p-4 md:p-8 font-sans">
      <div className="max-w-[1750px] mx-auto space-y-6">
        
        {/* 導覽 Tab 分頁區 */}
        <div className="flex border-b border-slate-800 gap-2">
          <button onClick={()=>setActiveTab("main")} className={`px-4 py-2 text-sm font-semibold transition-all ${activeTab==="main"?"border-b-2 border-blue-500 text-blue-400 bg-slate-900/40":"text-slate-400"}`}>📊 現金流與資產傳承</button>
          <button onClick={()=>setActiveTab("tax")} className={`px-4 py-2 text-sm font-semibold transition-all ${activeTab==="tax"?"border-b-2 border-blue-500 text-blue-400 bg-slate-900/40":"text-slate-400"}`}>🏛️ 所得稅與最低稅負(AMT)精算控制台</button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          
          {/* 左側：模組化控制台 */}
          <div className="xl:col-span-4 bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-4 max-h-[85vh] overflow-y-auto pb-32 custom-scrollbar">
            
            {/* 1. 時間軸假設 */}
            <div className="border border-slate-800 rounded-lg bg-slate-950/40 p-3 space-y-3">
              <p className="text-xs font-bold text-slate-300">▍ 1. 全局時間軸與精算參數</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><label className="text-slate-500">當前年紀</label><input type="number" value={currentAge} onChange={(e)=>setCurrentAge(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1"/></div>
                <div><label className="text-slate-500">預計退休</label><input type="number" value={retireAge} onChange={(e)=>setRetireAge(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1"/></div>
              </div>
            </div>

            {/* 2. 多元所得與常態開銷 */}
            <div className="border border-slate-800 rounded-lg bg-slate-950/40 p-3 space-y-3">
              <p className="text-xs font-bold text-slate-300">▍ 2. 多元收入與 6 大支出設定</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><label className="text-slate-500">主業月薪 (元)</label><input type="number" value={mainSalary} onChange={(e)=>setMainSalary(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1 font-mono"/></div>
                <div><label className="text-slate-500">生活雜費 (元)</label><input type="number" value={mLiving} onChange={(e)=>setMLiving(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1 font-mono"/></div>
                <div><label className="text-slate-500">房屋租金 (元)</label><input type="number" value={mRent} onChange={(e)=>setMRent(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1 font-mono"/></div>
                <div><label className="text-slate-500">醫療保費 (元)</label><input type="number" value={mInsurance} onChange={(e)=>setMInsurance(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1 font-mono"/></div>
                <div><label className="text-slate-500">勞健保費 (元)</label><input type="number" value={mLaborHealth} onChange={(e)=>setMLaborHealth(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1 font-mono"/></div>
                <div><label className="text-slate-500">每月孝親 (元)</label><input type="number" value={mParents} onChange={(e)=>setMParents(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1 font-mono"/></div>
                <div><label className="text-slate-500">娛樂開銷 (元)</label><input type="number" value={mOther} onChange={(e)=>setMOther(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1 font-mono"/></div>
              </div>
              <div className="bg-slate-950 p-2 rounded border border-slate-800 space-y-1 text-xs">
                <p className="text-emerald-400 font-bold text-[11px]">➕ 配置各類所得 (9A / 51 扣成本)</p>
                <div className="grid grid-cols-2 gap-1">
                  <input type="text" value={tmpIncName} onChange={(e)=>setTmpIncName(e.target.value)} className="bg-slate-900 border border-slate-700 rounded p-1 text-[11px]"/>
                  <input type="number" value={tmpIncAmt} onChange={(e)=>setTmpIncAmt(Number(e.target.value))} className="bg-slate-900 border border-slate-700 rounded p-1 font-mono text-[11px]"/>
                </div>
                <button onClick={addExtraIncome} className="w-full bg-emerald-900 text-white text-[10px] py-1 rounded font-bold">新增所得</button>
              </div>
            </div>

            {/* 3. 家庭成員 */}
            <div className="border border-slate-800 rounded-lg bg-slate-950/40 p-3 space-y-2 text-xs">
              <p className="text-xs font-bold text-slate-300">▍ 3. 家庭成員與節稅配置</p>
              <label className="flex items-center gap-2"><input type="checkbox" checked={hasSpouse} onChange={(e)=>setHasSpouse(e.target.checked)}/> 納入配偶 (獨立資產: <input type="number" value={spWealth} onChange={(e)=>setSpWealth(Number(e.target.value))} className="w-16 bg-slate-900 text-white px-1"/> 萬)</label>
              <div className="flex justify-between items-center bg-slate-950 p-2 rounded border border-slate-800">
                <span>扶養子女數量: <span className="text-emerald-400 font-bold">{kidCount}人</span></span>
                <input type="range" min="0" max="4" value={kidCount} onChange={(e)=>handleKidChange(Number(e.target.value))} className="w-24 accent-emerald-500"/>
              </div>
            </div>

            <button onClick={handleSimulate} disabled={isLoading} className="w-full py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-bold transition-all shadow-lg text-sm">
              {isLoading ? "全端精密運算中..." : "🚀 一鍵啟動全端精算"}
            </button>
          </div>

          {/* 右側：多維看板與拆解明細表格 */}
          <div className="xl:col-span-8 space-y-6">
            
            {activeTab === "main" && simulationResult && (
              <div className="space-y-6 animate-fade-in">
                
                {/* 1. 數據趨勢與 Data Grid 明細 */}
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-4">
                  <h3 className="text-sm font-bold text-blue-400">📋 終身資產、現金流與稅務財富軌跡數據表 (Data Grid)</h3>
                  <div className="overflow-x-auto max-h-[350px] border border-slate-800 rounded-lg custom-scrollbar">
                    <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
                      <thead className="bg-slate-950 sticky top-0 z-10 shadow">
                        <tr className="text-slate-400 border-b border-slate-800">
                          <th className="p-3">年齡</th>
                          <th className="p-3 text-right text-blue-400">預估總資產 (萬)</th>
                          <th className="p-3 text-right text-red-400">遺產稅現金缺口 (萬)</th>
                          <th className="p-3 text-right text-emerald-400">配偶請求權 (萬)</th>
                          <th className="p-3 text-right">勞保年金 (元/年)</th>
                          <th className="p-3 text-right text-orange-400">應納所得稅 (元/年)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-slate-300 font-mono">
                        {simulationResult.trajectory.map((row: any, i: number) => (
                          <tr key={i} className="hover:bg-slate-800/40">
                            <td className="p-2.5 text-center font-bold text-white bg-slate-950/20">{row.年紀} 歲</td>
                            <td className="p-2.5 text-right text-blue-300">{row.總資產_萬?.toLocaleString()}</td>
                            <td className="p-2.5 text-right text-red-300 font-bold">{row.預估遺產稅_萬?.toLocaleString()}</td>
                            <td className="p-2.5 text-right text-emerald-300">{row.差額分配請求權?.toLocaleString()}</td>
                            <td className="p-2.5 text-right">{Math.round(row.收_年金收入 || 0).toLocaleString()}</td>
                            <td className="p-2.5 text-right text-orange-300">{Math.round(row.支_所得稅金 || 0).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 2. 民法特留分雙軌分配 */}
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                    <h3 className="text-sm font-bold text-purple-400">🏛️ 民法應繼分與特留分保單雙軌變現分配明細表</h3>
                    <div className="flex items-center gap-2 text-xs">
                      <span>發生年紀:</span>
                      <input type="range" min={currentAge} max={lifeExpectancy} value={selectedReportAge} onChange={(e)=>setSelectedReportAge(Number(e.target.value))} className="accent-blue-500 w-32"/>
                      <span className="text-blue-400 font-bold">{selectedReportAge}歲</span>
                    </div>
                  </div>
                  {renderInheritanceTable()}
                </div>
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