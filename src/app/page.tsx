"use client";

import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, ComposedChart } from "recharts";

const AIIcon = () => (
  <svg className="w-6 h-6 text-emerald-400" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 6ZM12 6C13.66 6 15 7.34 15 9C15 10.66 13.66 12 12 12C10.34 12 9 10.66 9 9C9 7.34 10.34 6 12 6ZM12 20.2C9.5 20.2 7.29 18.93 6 17C6.03 15.01 10 13.9 12 13.9C13.99 13.9 17.97 15.01 18 17C16.71 18.93 14.5 20.2 12 20.2Z" fill="currentColor"/>
  </svg>
);

interface InsurancePolicy {
  id: string;
  name: string;
  type: string;
  app: string;
  ins: string;
  ben: string;
  premium: number;
  years: number;
  cv: number;
  irr: number;
  db: number;
  survival: number;
  survival_age: number;
}

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [simulationResult, setSimulationResult] = useState<any>(null);

  const [activeSection, setActiveSection] = useState<string>("timeline");

  // --- 1. 基礎時間軸與一般資產 ---
  const [currentAge, setCurrentAge] = useState(40);
  const [lifeExpectancy, setLifeExpectancy] = useState(85);
  const [initialCash, setInitialCash] = useState(8000); 
  const [stockAsset, setStockAsset] = useState(2000); 
  const [stockRate, setStockRate] = useState(6.0); 

  // --- 2. 收支與勞退設定 (展開消費細節版) ---
  const [mainSalary, setMainSalary] = useState(50000);
  const [pensionMode, setPensionMode] = useState("💼 一般勞工");
  const [lbYears, setLbYears] = useState(10);
  
  // 消費 6 大細項
  const [mLiving, setMLiving] = useState(15000);
  const [mRent, setMRent] = useState(0);
  const [mInsurance, setMInsurance] = useState(2000);
  const [mLaborHealth, setMLaborHealth] = useState(2000);
  const [mParents, setMParents] = useState(5000);
  const [mOther, setMOther] = useState(6000);
  
  // 動態加總總開銷
  const baseExp = mLiving + mRent + mInsurance + mLaborHealth + mParents + mOther;

  // --- 3. 房產購屋與房貸寬限期模組 ---
  const [hasHouse, setHasHouse] = useState(false);
  const [housePrice, setHousePrice] = useState(3000); 
  const [downPct, setDownPct] = useState(20);         
  const [mortgageRate, setMortgageRate] = useState(2.1); 
  const [graceYears, setGraceYears] = useState(3);       

  // --- 4. 家族成員與稅務扣除額 ---
  const [hasSpouse, setHasSpouse] = useState(false);
  const [spAge, setSpAge] = useState(40);
  const [spLtc, setSpLtc] = useState(false);
  const [hasFather, setHasFather] = useState(false);
  const [faAge, setFaAge] = useState(70);
  const [faLtc, setFaLtc] = useState(false);
  const [hasMother, setHasMother] = useState(false);
  const [moAge, setMoAge] = useState(68);
  const [moLtc, setMoLtc] = useState(false);
  const [kidCount, setKidCount] = useState(0);
  const [kids, setKids] = useState<{id: string, age: number, ltc: boolean}[]>([]);

  // --- 5. 獨立保單管理陣列模組 ---
  const [insurances, setInsurances] = useState<InsurancePolicy[]>([]);
  const [tmpInsName, setTmpInsName] = useState("富邦傳世富足");
  const [tmpInsType, setTmpInsType] = useState("人壽保險");
  const [tmpInsApp, setTmpInsApp] = useState("本人");
  const [tmpInsIns, setTmpInsIns] = useState("本人");
  const [tmpInsBen, setTmpInsBen] = useState("法定繼承人");
  const [tmpInsPremium, setTmpInsPremium] = useState(20);
  const [tmpInsYears, setTmpInsYears] = useState(6);
  const [tmpInsCv, setTmpInsCv] = useState(100);
  const [tmpInsIrr, setTmpInsIrr] = useState(2.25);
  const [tmpInsDb, setTmpInsDb] = useState(500);

  const handleKidCountChange = (count: number) => {
    setKidCount(count);
    setKids(prev => {
      const newKids = [...prev];
      if (count > prev.length) {
        for (let i = prev.length; i < count; i++) newKids.push({ id: `kid_${i}`, age: 10, ltc: false });
      } else {
        newKids.splice(count);
      }
      return newKids;
    });
  };

  const updateKid = (index: number, field: string, value: any) => {
    const newKids = [...kids];
    newKids[index] = { ...newKids[index], [field]: value };
    setKids(newKids);
  };

  const addInsurancePolicy = () => {
    const newPolicy: InsurancePolicy = {
      id: `ins_${Date.now()}`, name: tmpInsName, type: tmpInsType, app: tmpInsApp, ins: tmpInsIns, ben: tmpInsBen,
      premium: tmpInsPremium, years: tmpInsYears, cv: tmpInsCv, irr: tmpInsIrr, db: tmpInsDb, survival: 0, survival_age: 65
    };
    setInsurances([...insurances, newPolicy]);
  };

  const removeInsurancePolicy = (id: string) => {
    setInsurances(insurances.filter(p => p.id !== id));
  };

  const handleSimulate = async () => {
    setIsLoading(true);
    try {
      const payload = {
        timeline: { 
          current_age: currentAge, life_expectancy: lifeExpectancy, retire_age: 65,
          salary_growth: 0.012, inflation_rate: 0.02, replacement_rate: 0.7, roi_after_retire: 0.03
        },
        assets: [
          { id: "asset_1", name: "日常活存", type: "現金", value: initialCash, rate: 0.01, monthly_add: 0, add_years: 0, tax_type: "國內利息(計入27萬)" },
          ...(stockAsset > 0 ? [{ id: "asset_stock", name: "股票與基金", type: "股票", value: stockAsset, rate: stockRate / 100, monthly_add: 0, add_years: 0, tax_type: "國內股利(8.5%抵減/分開)" }] : [])
        ],
        insurances: insurances.map(ins => ({
          id: ins.id, name: ins.name, type: ins.type, app: ins.app, ins: ins.ins, ben: ins.ben,
          premium: ins.premium, years: ins.years, cv: ins.cv, irr: ins.irr / 100, db: ins.db, survival: ins.survival, survival_age: ins.survival_age
        })),
        mortgages: hasHouse ? [{
          id: "house_1", name: "自住房產", start: currentAge,
          total_price: housePrice, loan_amount: housePrice * (1 - downPct / 100),
          years: 30, grace: graceYears, rate: mortgageRate, method: "本利平均", replace_rent: true, claim_tax: true
        }] : [],
        debts: [],
        extra_incomes: [],
        family: {
          has_spouse: hasSpouse, has_father: hasFather, has_mother: hasMother, has_grand: false,
          sp_age: spAge, sp_life: 88, sp_salary: 0, sp_other_inc: 0, sp_wealth: 0, sp_add: 0, sp_rate: 0, sp_disabled: spLtc, sp_ltc: spLtc,
          fa_age: faAge, fa_life: 85, fa_claim_tax: true, fa_tax_inc: 0, fa_disabled: faLtc, fa_ltc: faLtc,
          mo_age: moAge, mo_life: 85, mo_claim_tax: true, mo_tax_inc: 0, mo_disabled: moLtc, mo_ltc: moLtc,
          gp_count: 0, gp_age: 75, gp_life: 85, gp_claim_tax: false, gp_tax_inc: 0, gp_dependent: false, gp_disabled_count: 0, gp_ltc_count: 0,
          kids: kids.map(k => ({ id: k.id, age: k.age, dep_age: 22, life: 85, ltc: k.ltc, disabled: k.ltc })), 
          siblings: [], daily_tool_val: 0, job_tool_val: 0
        },
        pension: {
          mode: pensionMode, lb_salary: 45800, lb_current_years: lbYears, 
          national_years: 0, lb_age: 65, has_old_sys: false,
          lt_bal: 0, lt_vol: 0, lt_roi: 0, pb_salary: 0, pb_years: 0, pb_type: "", tf_sys: "", tf_salary: 0, tf_years: 0, tf_bal: 0, tf_sal: 0, tf_vol: 0,
          mil_rank: "", mil_salary: 0, mil_years: 0, mil_type: "", is_rich: false, fm_wage: 0, fm_vol: 0
        },
        main_salary: mainSalary, 
        base_m_exp: baseExp // 這裡將加總後的總開銷送給後端
      };

      const response = await fetch("https://wealth-dashboard-api.onrender.com/api/v1/wealth/simulate", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error(`API 錯誤`);
      const data = await response.json();
      setSimulationResult(data);

    } catch (error: any) {
      alert("連線後端引擎失敗。請確認 Render 伺服器是否開機運轉。");
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
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {entry.value.toLocaleString()} 萬
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  let realMonthlyPensionWan = "0.00";
  let pensionCoverage = "0";
  let totalEstateTaxGapWan = "0.0";
  
  if (simulationResult && simulationResult.trajectory) {
    const retireData = simulationResult.trajectory.find((d: any) => d.年紀 == 65);
    if (retireData) {
        const rawPension = retireData.收_年金收入;
        let monthlyPensionYuan = 0;
        if (rawPension !== undefined) {
            monthlyPensionYuan = rawPension / 12;
        } else {
            const calcSalary = mainSalary > 45800 ? 45800 : mainSalary;
            monthlyPensionYuan = calcSalary * lbYears * 0.0155;
        }
        realMonthlyPensionWan = (monthlyPensionYuan / 10000).toFixed(2);
        pensionCoverage = baseExp > 0 ? ((monthlyPensionYuan / baseExp) * 100).toFixed(0) : "0";
    }
    const finalData = simulationResult.trajectory.slice(-1)[0];
    if (finalData) {
      totalEstateTaxGapWan = (finalData.預估遺產稅_萬 || (finalData.預估遺產稅 / 10000) || 0).toFixed(1);
    }
  }

  const toggleSection = (section: string) => {
    setActiveSection(activeSection === section ? "" : section);
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 md:p-8 font-sans overflow-x-hidden">
      <div className="max-w-[1700px] mx-auto">
        
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-800 pb-6 mb-8 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-wider text-slate-100 flex items-center gap-3">
              🛡️ 全方位資產配置與民法傳承精算系統
            </h1>
            <p className="text-slate-400 mt-2 text-xs md:text-sm">AI-Driven Wealth & Succession Planning System (Phase 3: 完全體對接)</p>
          </div>
          <div className="bg-slate-900 px-4 py-2 rounded border border-slate-800 text-xs md:text-sm text-emerald-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            國家級稅務公式完全體對接中
          </div>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          
          {/* 左側：模組化折疊參數設定區 */}
          <div className="xl:col-span-4 bg-slate-900 border border-slate-800 p-4 md:p-6 rounded-xl shadow-2xl flex flex-col h-fit max-h-[85vh] overflow-y-auto space-y-4">
            <h2 className="text-lg font-bold text-blue-400 pb-2 border-b border-slate-800">
              ▍ 決策核心控制台
            </h2>
            
            {/* 模組 1: 時間軸與基本資產 */}
            <div className="border border-slate-800 rounded-lg overflow-hidden">
              <button onClick={() => toggleSection('timeline')} className="w-full bg-slate-950 px-4 py-3 text-left font-semibold text-slate-200 flex justify-between items-center hover:bg-slate-900 transition-colors">
                <span>📊 基礎資產與全局時間軸</span>
                <span className="text-xs text-blue-400">{activeSection === 'timeline' ? '▲' : '▼'}</span>
              </button>
              {activeSection === 'timeline' && (
                // ⚠️ 這裡將 p-4 改成了 p-5 pb-6，加大底部留白防止截斷
                <div className="p-5 pb-8 bg-slate-900/50 space-y-5 border-t border-slate-800 text-sm">
                  <div>
                    <label className="flex justify-between text-xs text-slate-400 mb-2">
                      <span>客戶目前年齡</span>
                      <span className="text-blue-400 font-bold">{currentAge} 歲</span>
                    </label>
                    <input type="range" min="30" max="100" value={currentAge} onChange={(e) => setCurrentAge(Number(e.target.value))} className="w-full accent-blue-500"/>
                  </div>
                  <div>
                    <label className="flex justify-between text-xs text-slate-400 mb-2">
                      <span>預期壽命 (模擬評估區間)</span>
                      <span className="text-emerald-400 font-bold">{lifeExpectancy} 歲</span>
                    </label>
                    <input type="range" min={currentAge} max="110" value={lifeExpectancy} onChange={(e) => setLifeExpectancy(Number(e.target.value))} className="w-full accent-emerald-500"/>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">初始現金資產 (萬)</label>
                    <input type="number" value={initialCash} onChange={(e) => setInitialCash(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-white font-mono focus:border-blue-500"/>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">股票/基金配置 (萬)</label>
                      <input type="number" value={stockAsset} onChange={(e) => setStockAsset(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-white font-mono focus:border-blue-500"/>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">預期年化報酬 (%)</label>
                      <input type="number" step="0.1" value={stockRate} onChange={(e) => setStockRate(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-white font-mono focus:border-blue-500"/>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 模組 2: 收支與勞退設定 (細項展開版) */}
            <div className="border border-slate-800 rounded-lg overflow-hidden">
              <button onClick={() => toggleSection('pension')} className="w-full bg-slate-950 px-4 py-3 text-left font-semibold text-slate-200 flex justify-between items-center hover:bg-slate-900 transition-colors">
                <span>💰 收入、開銷明細與社會保險</span>
                <span className="text-xs text-blue-400">{activeSection === 'pension' ? '▲' : '▼'}</span>
              </button>
              {activeSection === 'pension' && (
                <div className="p-5 pb-8 bg-slate-900/50 space-y-6 border-t border-slate-800 text-sm">
                  
                  {/* 薪資輸入 */}
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">主業月薪 (元)</label>
                    <input type="number" step="1000" value={mainSalary} onChange={(e) => setMainSalary(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-white font-mono focus:border-blue-500"/>
                  </div>

                  {/* 6 大消費細項面板 */}
                  <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <span className="text-sm font-bold text-slate-300">每月總開銷 (元)</span>
                      <span className="text-orange-400 font-bold text-lg font-mono">{baseExp.toLocaleString()}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">生活餐費</label>
                        <input type="number" step="500" value={mLiving} onChange={(e) => setMLiving(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-white font-mono focus:border-orange-500"/>
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">房租/水電</label>
                        <input type="number" step="500" value={mRent} onChange={(e) => setMRent(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-white font-mono focus:border-orange-500"/>
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">一般醫療/壽險</label>
                        <input type="number" step="500" value={mInsurance} onChange={(e) => setMInsurance(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-white font-mono focus:border-orange-500"/>
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">勞健保費</label>
                        <input type="number" step="500" value={mLaborHealth} onChange={(e) => setMLaborHealth(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-white font-mono focus:border-orange-500"/>
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">孝親費</label>
                        <input type="number" step="500" value={mParents} onChange={(e) => setMParents(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-white font-mono focus:border-orange-500"/>
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">娛樂/其他</label>
                        <input type="number" step="500" value={mOther} onChange={(e) => setMOther(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-white font-mono focus:border-orange-500"/>
                      </div>
                    </div>
                  </div>

                  {/* 勞保設定 */}
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">職業退休金制度別</label>
                      <select value={pensionMode} onChange={(e) => setPensionMode(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-white focus:border-blue-500">
                        <option value="💼 一般勞工">💼 一般勞工 (勞保+勞退自動擇優)</option>
                        <option value="🏛️ 公教人員">🏛️ 公教人員 (退撫舊制/新改個人專戶)</option>
                        <option value="🎖️ 軍職人員">🎖️ 軍職人員 (服役滿20年終身俸)</option>
                        <option value="🚫 暫不設定">🚫 暫不設定</option>
                      </select>
                    </div>
                    {pensionMode === "💼 一般勞工" && (
                      <div>
                        <label className="flex justify-between text-xs text-slate-400 mb-2">
                          <span>目前已累積勞保年資</span>
                          <span className="text-blue-400 font-bold">{lbYears} 年</span>
                        </label>
                        <input type="range" min="0" max="50" value={lbYears} onChange={(e) => setLbYears(Number(e.target.value))} className="w-full accent-blue-500"/>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 模組 3: 不動產與貸款精算 */}
            <div className="border border-slate-800 rounded-lg overflow-hidden">
              <button onClick={() => toggleSection('house')} className="w-full bg-slate-950 px-4 py-3 text-left font-semibold text-slate-200 flex justify-between items-center hover:bg-slate-900 transition-colors">
                <span>🏠 不動產置換與貸款寬限期</span>
                <span className="text-xs text-blue-400">{activeSection === 'house' ? '▲' : '▼'}</span>
              </button>
              {activeSection === 'house' && (
                <div className="p-5 pb-8 bg-slate-900/50 space-y-4 border-t border-slate-800 text-sm">
                  <div className="flex items-center justify-between bg-slate-950 p-2 rounded border border-slate-800 mb-2">
                    <span className="text-xs text-slate-300">啟用購屋增置計劃</span>
                    <input type="checkbox" checked={hasHouse} onChange={(e) => setHasHouse(e.target.checked)} className="w-4 h-4 accent-orange-500 rounded cursor-pointer"/>
                  </div>
                  {hasHouse && (
                    <div className="space-y-3 animate-fade-in">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">房屋總價 (萬)</label>
                          <input type="number" value={housePrice} onChange={(e) => setHousePrice(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white focus:border-orange-500"/>
                        </div>
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">自備款比例 (%)</label>
                          <input type="number" value={downPct} onChange={(e) => setDownPct(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white focus:border-orange-500"/>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">貸款利率 (%)</label>
                          <input type="number" step="0.1" value={mortgageRate} onChange={(e) => setMortgageRate(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white focus:border-orange-500"/>
                        </div>
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">貸款寬限期 (年)</label>
                          <input type="number" max="5" value={graceYears} onChange={(e) => setGraceYears(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white focus:border-orange-500"/>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 模組 4: 家族成員與稅務扣除額 */}
            <div className="border border-slate-800 rounded-lg overflow-hidden">
              <button onClick={() => toggleSection('family')} className="w-full bg-slate-950 px-4 py-3 text-left font-semibold text-slate-200 flex justify-between items-center hover:bg-slate-900 transition-colors">
                <span>👨‍👩‍👧‍👦 家族成員與長照特扣額</span>
                <span className="text-xs text-blue-400">{activeSection === 'family' ? '▲' : '▼'}</span>
              </button>
              {activeSection === 'family' && (
                <div className="p-5 pb-8 bg-slate-900/50 space-y-4 border-t border-slate-800 text-sm">
                  {/* 配偶區塊 */}
                  <div className="bg-slate-950 p-2.5 rounded border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-300 font-bold">👩 配偶設定</span>
                      <input type="checkbox" checked={hasSpouse} onChange={(e) => setHasSpouse(e.target.checked)} className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"/>
                    </div>
                    {hasSpouse && (
                      <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-800">
                        <input type="number" value={spAge} placeholder="現年" onChange={(e) => setSpAge(Number(e.target.value))} className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white text-xs"/>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={spLtc} onChange={(e) => setSpLtc(e.target.checked)} className="accent-purple-500"/>
                          <span className="text-[11px] text-purple-400">符合長照特扣</span>
                        </label>
                      </div>
                    )}
                  </div>

                  {/* 父母親區塊 */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-slate-950 p-2.5 rounded border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-300">👴 父親</span>
                        <input type="checkbox" checked={hasFather} onChange={(e) => setHasFather(e.target.checked)} className="w-3.5 h-3.5 accent-emerald-500 cursor-pointer"/>
                      </div>
                      {hasFather && (
                        <div className="space-y-2 pt-2 border-t border-slate-800">
                          <input type="number" value={faAge} placeholder="年齡" onChange={(e) => setFaAge(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-white text-xs"/>
                          <label className="flex items-center gap-1 cursor-pointer text-[10px] text-purple-400">
                            <input type="checkbox" checked={faLtc} onChange={(e) => setFaLtc(e.target.checked)}/> <span>長照手冊</span>
                          </label>
                        </div>
                      )}
                    </div>
                    <div className="bg-slate-950 p-2.5 rounded border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-300">👵 母親</span>
                        <input type="checkbox" checked={hasMother} onChange={(e) => setHasMother(e.target.checked)} className="w-3.5 h-3.5 accent-emerald-500 cursor-pointer"/>
                      </div>
                      {hasMother && (
                        <div className="space-y-2 pt-2 border-t border-slate-800">
                          <input type="number" value={moAge} placeholder="年齡" onChange={(e) => setMoAge(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-white text-xs"/>
                          <label className="flex items-center gap-1 cursor-pointer text-[10px] text-purple-400">
                            <input type="checkbox" checked={moLtc} onChange={(e) => setMoLtc(e.target.checked)}/> <span>長照手冊</span>
                          </label>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 子女動態增置區 */}
                  <div className="bg-slate-950 p-2.5 rounded border border-slate-800 space-y-2">
                    <label className="flex justify-between text-xs text-slate-400">
                      <span>扶養子女數量</span>
                      <span className="text-emerald-400 font-bold">{kidCount} 人</span>
                    </label>
                    <input type="range" min="0" max="4" value={kidCount} onChange={(e) => handleKidCountChange(Number(e.target.value))} className="w-full accent-emerald-500"/>
                    
                    {kids.map((kid, idx) => (
                      <div key={kid.id} className="grid grid-cols-2 gap-2 items-center bg-slate-900 p-2 rounded border border-slate-700 mt-2 text-xs">
                        <input type="number" value={kid.age} placeholder="小孩年紀" onChange={(e) => updateKid(idx, 'age', Number(e.target.value))} className="bg-slate-950 border border-slate-700 rounded px-2 py-0.5 text-white"/>
                        <label className="flex items-center justify-end gap-1 text-[11px] text-purple-400 cursor-pointer">
                          <input type="checkbox" checked={kid.ltc} onChange={(e) => updateKid(idx, 'ltc', e.target.checked)}/>
                          <span>長照/身障</span>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 模組 5: 專案保單與特定傳承規劃 */}
            <div className="border border-slate-800 rounded-lg overflow-hidden">
              <button onClick={() => toggleSection('insurance')} className="w-full bg-slate-950 px-4 py-3 text-left font-semibold text-slate-200 flex justify-between items-center hover:bg-slate-900 transition-colors">
                <span>🛡️ 專案保單與特定受益人關係人</span>
                <span className="text-xs text-blue-400">{activeSection === 'insurance' ? '▲' : '▼'}</span>
              </button>
              {activeSection === 'insurance' && (
                <div className="p-5 pb-8 bg-slate-900/50 space-y-3 border-t border-slate-800 text-xs">
                  <div className="bg-slate-950 p-3 rounded border border-slate-800 space-y-2">
                    <input type="text" value={tmpInsName} onChange={(e) => setTmpInsName(e.target.value)} placeholder="保單自訂子名稱" className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white"/>
                    <div className="grid grid-cols-2 gap-2">
                      <select value={tmpInsApp} onChange={(e) => setTmpInsApp(e.target.value)} className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white">
                        <option value="本人">要保人：本人</option>
                        <option value="配偶">要保人：配偶</option>
                      </select>
                      <select value={tmpInsIns} onChange={(e) => setTmpInsIns(e.target.value)} className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white">
                        <option value="本人">被保人：本人</option>
                        <option value="配偶">被保人：配偶</option>
                      </select>
                    </div>
                    <select value={tmpInsBen} onChange={(e) => setTmpInsBen(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white">
                      <option value="法定繼承人">身故受益人：法定繼承人</option>
                      <option value="配偶">身故受益人：配偶</option>
                      <option value="指定特定子女">身故受益人：指定特定子女</option>
                    </select>
                    <div className="grid grid-cols-2 gap-2">
                      <input type="number" value={tmpInsPremium} placeholder="年化保費(萬)" onChange={(e) => setTmpInsPremium(Number(e.target.value))} className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white"/>
                      <input type="number" value={tmpInsYears} placeholder="剩餘年期" onChange={(e) => setTmpInsYears(Number(e.target.value))} className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white"/>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <input type="number" value={tmpInsCv} placeholder="現有保價金" onChange={(e) => setTmpInsCv(Number(e.target.value))} className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white"/>
                      <input type="number" step="0.01" value={tmpInsIrr} placeholder="預期IRR%" onChange={(e) => setTmpInsIrr(Number(e.target.value))} className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white"/>
                      <input type="number" value={tmpInsDb} placeholder="身故保額" onChange={(e) => setTmpInsDb(Number(e.target.value))} className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white"/>
                    </div>
                    <button onClick={addInsurancePolicy} className="w-full bg-purple-900 hover:bg-purple-800 border border-purple-700 text-white py-1.5 rounded font-bold mt-1 transition-colors">
                      📥 配置保單並啟動 3740萬 AMT 判定
                    </button>
                  </div>

                  {insurances.length > 0 && (
                    <div className="space-y-2 mt-2 max-h-[150px] overflow-y-auto pr-1">
                      {insurances.map((p) => (
                        <div key={p.id} className="bg-slate-950 p-2 rounded border border-slate-800 flex justify-between items-center">
                          <div>
                            <p className="font-bold text-purple-300">{p.name} ({p.type})</p>
                            <p className="text-[10px] text-slate-400">要:{p.app} | 被:{p.ins} | 保費:{p.premium}萬 | 額:{p.db}萬</p>
                          </div>
                          <button onClick={() => removeInsurancePolicy(p.id)} className="text-red-400 hover:text-red-300 px-2 font-bold text-sm">✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <button onClick={handleSimulate} disabled={isLoading} className={`w-full py-4 rounded-lg font-bold tracking-wide transition-all duration-300 ${isLoading ? "bg-slate-700 text-slate-400" : "bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]"}`}>
              {isLoading ? "核心微服務多維交織精算中..." : "🚀 一鍵啟動全端精算"}
            </button>
          </div>

          {/* 右側：多維戰情儀表板與大腦輸出區 */}
          <div className="xl:col-span-8 space-y-8">
            
            {/* 國家級指標看板 */}
            {simulationResult && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in">
                {[
                  { label: "勞退/公教月領預估", value: `約 ${realMonthlyPensionWan} 萬`, color: "text-blue-400", sub: `基本生活開銷覆蓋率 ${pensionCoverage}%` },
                  { label: "資產配置健康度", value: stockAsset > 0 ? "穩定增值" : "現金過剩", color: "text-emerald-400", sub: `股票投報率核算 ${stockRate}%` },
                  { label: "法定繼承遺產稅風險", value: `${totalEstateTaxGapWan} 萬`, color: "text-red-400", sub: "已啟動2024最新免稅額級距" },
                  { label: "民法雙軌防護網", value: insurances.length > 0 ? "已跨越順位" : "尚未規劃", color: "text-purple-400", sub: `${insurances.length} 筆指定受益人保單` }
                ].map((item, idx) => (
                  <div key={idx} className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg flex flex-col justify-between">
                    <div>
                      <p className="text-slate-500 text-xs mb-1 font-medium">{item.label}</p>
                      <p className={`text-xl font-bold tracking-tight ${item.color}`}>{item.value}</p>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-2 border-t border-slate-800/60 pt-1.5">{item.sub}</p>
                  </div>
                ))}
              </div>
            )}
            
            {/* 圖表呈現區 */}
            <div className="bg-slate-900 border border-slate-800 p-4 md:p-6 rounded-xl shadow-2xl h-[480px] flex flex-col">
              <h2 className="text-lg font-semibold mb-6 text-emerald-400 flex items-center gap-2 underline underline-offset-8 decoration-emerald-500/50 shrink-0">
                ▍ 終身可支配財富與台灣遺產稅缺口軌跡
              </h2>
              <div className="flex-1 w-full h-full text-xs">
                {!simulationResult ? (
                  <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-lg text-slate-600">
                    <p className="tracking-widest mb-2 text-base">等待決策台參數載入中...</p>
                    <p className="text-xs text-slate-500">請設定左側面板並按下「一鍵啟動全端精算」</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={simulationResult.trajectory} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="年紀" stroke="#64748b" tick={{ fill: '#64748b' }}/>
                      <YAxis stroke="#64748b" tick={{ fill: '#64748b' }} tickFormatter={(v) => `${v}萬`}/>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ paddingTop: '15px' }} />
                      <Bar dataKey="總資產_萬" name="法定預估總資產" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={25}/>
                      <Line type="monotone" dataKey="預估遺產稅_萬" name="預估遺產稅現金缺口" stroke="#ef4444" strokeWidth={3} dot={{ r: 3, fill: '#ef4444' }}/>
                    </ComposedChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* AI 大腦精算講稿 */}
            {!simulationResult ? null : (
                <div className="bg-slate-900 border-2 border-emerald-900 p-6 rounded-xl shadow-2xl animate-fade-in">
                    <div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-800">
                        <div className="bg-emerald-950 p-3 rounded-full border border-emerald-800 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                            <AIIcon />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-emerald-300">AI 深度判讀報告與高效溝通講稿</h3>
                            <p className="text-slate-500 text-xs">大腦已自動整合「民法特留分繼承基數」與「保單實質課稅原則」進行多重演繹。</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 font-mono text-emerald-100 text-sm">
                        <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 leading-relaxed space-y-3">
                            <p className="text-emerald-400 font-bold flex items-center gap-1.5">▍ [現況智慧判讀] (顧問視角)</p>
                            <p>客戶設定現年 <span className="text-white bg-blue-900 px-1.5 py-0.5 rounded font-mono">{currentAge} 歲</span>，其名下一般性水庫總額核算達 <span className="text-white bg-blue-900 px-1.5 py-0.5 rounded font-mono">{initialCash + stockAsset} 萬</span>。</p>
                            
                            <p className="text-blue-200 border-l-2 border-blue-500 pl-2">
                              依據法定精算，在 65 歲進入人生下半場時，社會保險機制預估提供每月 <span className="text-white bg-blue-900 px-1 rounded">{realMonthlyPensionWan} 萬</span> 的穩定年金，
                              已可有效對抗通膨並對沖 <span className="text-white font-bold bg-emerald-900 px-1 rounded">{pensionCoverage}%</span> 的基本生存支出開銷。
                            </p>

                            <p>然而，若其一般性資產依照常態年化報酬複利增長，至模擬生命終點 <span className="text-white bg-emerald-900 px-1 rounded">{lifeExpectancy} 歲</span> 時，總資產與負債置換將推升課稅基準。</p>
                            <p className="text-red-400 font-bold border border-red-900 bg-red-950/60 p-3 rounded-lg text-xs md:text-sm">
                                💥 警訊：屆時繼承人將面臨近 <span className="text-white text-base md:text-lg bg-red-700 px-1 rounded font-mono">{totalEstateTaxGapWan} 萬</span> 的應納遺產稅現金缺口。若未提前進行關係人定性，繼承人極可能陷入因無足夠現金而無法完稅繼承的家族困境。
                            </p>
                        </div>
                        
                        <div className="bg-slate-950 p-4 rounded-lg border border-emerald-800 leading-relaxed text-slate-300 text-xs md:text-sm space-y-2">
                            <p className="text-emerald-400 font-bold not-italic mb-2 flex items-center gap-1.5">▍ [高轉化談判話術] (面對客戶)</p>
                            <p className="italic">「董座，我們透過這套系統精算出來的稅務軌跡，向您揭示了一個非常重要的隱形考驗。雖然您目前在事業與現金部位的資產防禦實力極為雄厚，但隨著時間推進，自然的複利增值在未來反而會成為家人的重擔。」</p>
                            <p className="italic">「依照台灣現行遺產及贈與稅法規定，當那一天來臨時，您的家人在繼承時，必須在短短六個月內，以**純現金**的方式向國庫繳納近 <span className="text-emerald-300 font-bold underline decoration-emerald-500">{totalEstateTaxGapWan} 萬</span> 的稅金，否則資產將被凍結。如果我們現在利用民法雙軌制，提早將部分資金重新定性為保險傳承，這筆錢不但能在完稅前『合法跨越民法繼承順位』，還能精準、免爭議地直接交到您指定的人手上...」</p>
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