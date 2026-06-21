"use client";

import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, ComposedChart } from "recharts";

const AIIcon = () => (
  <svg className="w-6 h-6 text-emerald-400" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 6ZM12 6C13.66 6 15 7.34 15 9C15 10.66 13.66 12 12 12C10.34 12 9 10.66 9 9C9 7.34 10.34 6 12 6ZM12 20.2C9.5 20.2 7.29 18.93 6 17C6.03 15.01 10 13.9 12 13.9C13.99 13.9 17.97 15.01 18 17C16.71 18.93 14.5 20.2 12 20.2Z" fill="currentColor"/>
  </svg>
);

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [simulationResult, setSimulationResult] = useState<any>(null);

  // 基礎參數
  const [currentAge, setCurrentAge] = useState(65);
  const [lifeExpectancy, setLifeExpectancy] = useState(85);
  const [initialCash, setInitialCash] = useState(8000); 

  // 新增：勞退與收支參數
  const [mainSalary, setMainSalary] = useState(50000);
  const [baseExp, setBaseExp] = useState(30000);
  const [pensionMode, setPensionMode] = useState("💼 一般勞工");
  const [lbYears, setLbYears] = useState(10);

  const handleSimulate = async () => {
    setIsLoading(true);
    try {
      const payload = {
        timeline: { 
          current_age: currentAge, 
          life_expectancy: lifeExpectancy, 
          retire_age: 65,
          salary_growth: 0.012,
          inflation_rate: 0.02,
          replacement_rate: 0.7,
          roi_after_retire: 0.03
        },
        assets: [
          {
            id: "asset_1", name: "日常活存", type: "現金",
            value: initialCash, rate: 0.01, monthly_add: 0, add_years: 0, tax_type: "國內利息(計入27萬)"
          }
        ],
        insurances: [],
        mortgages: [],
        debts: [],
        extra_incomes: [],
        family: {
          has_spouse: false, has_father: false, has_mother: false, has_grand: false,
          sp_age: 30, sp_life: 88, sp_salary: 0, sp_other_inc: 0, sp_wealth: 0, sp_add: 0, sp_rate: 0, sp_disabled: false, sp_ltc: false,
          fa_age: 65, fa_life: 85, fa_claim_tax: false, fa_tax_inc: 0, fa_disabled: false, fa_ltc: false,
          mo_age: 65, mo_life: 85, mo_claim_tax: false, mo_tax_inc: 0, mo_disabled: false, mo_ltc: false,
          gp_count: 0, gp_age: 75, gp_life: 85, gp_claim_tax: false, gp_tax_inc: 0, gp_dependent: false, gp_disabled_count: 0, gp_ltc_count: 0,
          kids: [], siblings: [], daily_tool_val: 0, job_tool_val: 0
        },
        pension: {
          mode: pensionMode, 
          lb_salary: 45800, 
          lb_current_years: lbYears, 
          national_years: 0, lb_age: 65, has_old_sys: false,
          lt_bal: 0, lt_vol: 0, lt_roi: 0, pb_salary: 0, pb_years: 0, pb_type: "", tf_sys: "", tf_salary: 0, tf_years: 0, tf_bal: 0, tf_sal: 0, tf_vol: 0,
          mil_rank: "", mil_salary: 0, mil_years: 0, mil_type: "", is_rich: false, fm_wage: 0, fm_vol: 0
        },
        main_salary: mainSalary, 
        base_m_exp: baseExp      
      };

      const response = await fetch("https://wealth-dashboard-api.onrender.com/api/v1/wealth/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error(`API 錯誤`);
      const data = await response.json();
      setSimulationResult(data);

    } catch (error: any) {
      alert("連線後端引擎失敗。請確認 Render 伺服器是否清醒。");
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

  return (
    <main className="min-h-screen bg-slate-950 text-white p-8 font-sans overflow-x-hidden">
      <div className="max-w-[1600px] mx-auto">
        
        <header className="flex justify-between items-center border-b border-slate-800 pb-6 mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-wider text-slate-100">高資產客戶傳承與稅務戰情室</h1>
            <p className="text-slate-400 mt-2 text-sm">AI-Driven Wealth & Succession Planning System (Phase 3: AI 武裝)</p>
          </div>
          <div className="flex items-center gap-4">
             <div className="bg-slate-900 px-4 py-2 rounded border border-slate-800 text-sm text-emerald-400 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                全端微服務 V2 運轉中
              </div>
          </div>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          
          {/* 左側：互動式參數設定區 */}
          <div className="xl:col-span-3 bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-2xl flex flex-col h-fit">
            <h2 className="text-xl font-semibold mb-6 text-blue-400 flex items-center gap-2 underline underline-offset-8 decoration-blue-500/50">
              ▍ 客戶財務參數
            </h2>
            
            <div className="space-y-6">
              <div>
                <label className="flex justify-between text-sm text-slate-400 mb-2">
                  <span>客戶目前年齡</span>
                  <span className="text-blue-400 font-bold">{currentAge} 歲</span>
                </label>
                <input type="range" min="40" max="100" value={currentAge} onChange={(e) => setCurrentAge(Number(e.target.value))} className="w-full accent-blue-500"/>
              </div>
              <div>
                <label className="flex justify-between text-sm text-slate-400 mb-2">
                  <span>預期壽命 (評估區間)</span>
                  <span className="text-emerald-400 font-bold">{lifeExpectancy} 歲</span>
                </label>
                <input type="range" min={currentAge} max="110" value={lifeExpectancy} onChange={(e) => setLifeExpectancy(Number(e.target.value))} className="w-full accent-emerald-500"/>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-2">初始現金資產 (萬)</label>
                <input type="number" value={initialCash} onChange={(e) => setInitialCash(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white text-lg font-mono focus:border-blue-500"/>
              </div>

              {/* 🎯 新增區塊：收支與勞退面板 */}
              <div className="pt-6 mt-6 border-t border-slate-800 space-y-6">
                <h3 className="text-md font-semibold text-blue-300">💰 收支與勞退設定</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">主業月薪 (元)</label>
                    <input type="number" step="1000" value={mainSalary} onChange={(e) => setMainSalary(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white font-mono focus:border-blue-500"/>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">每月開銷 (元)</label>
                    <input type="number" step="1000" value={baseExp} onChange={(e) => setBaseExp(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white font-mono focus:border-blue-500"/>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">職業別 / 退休金制度</label>
                  <select value={pensionMode} onChange={(e) => setPensionMode(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white focus:border-blue-500">
                    <option value="💼 一般勞工">💼 一般勞工 (勞保+勞退)</option>
                    <option value="🏛️ 公教人員">🏛️ 公教人員</option>
                    <option value="🎖️ 軍職人員">🎖️ 軍職人員</option>
                    <option value="🚫 暫不設定">🚫 暫不設定</option>
                  </select>
                </div>

                {pensionMode === "💼 一般勞工" && (
                  <div>
                    <label className="flex justify-between text-xs text-slate-400 mb-2">
                      <span>目前勞保年資</span>
                      <span className="text-blue-400 font-bold">{lbYears} 年</span>
                    </label>
                    <input type="range" min="0" max="40" value={lbYears} onChange={(e) => setLbYears(Number(e.target.value))} className="w-full accent-blue-500"/>
                  </div>
                )}
              </div>

            </div>
            
            <button onClick={handleSimulate} disabled={isLoading} className={`w-full py-4 mt-8 rounded-lg font-bold tracking-wide transition-all ${isLoading ? "bg-slate-700 text-slate-400" : "bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_20px_rgba(37,99,235,0.5)]"}`}>
              {isLoading ? "核心引擎精算中..." : "🚀 一鍵啟動全端精算"}
            </button>
          </div>

          {/* 右側：圖表與 AI 講稿區 */}
          <div className="xl:col-span-9 space-y-8">
            
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-2xl h-[500px] flex flex-col">
              <h2 className="text-xl font-semibold mb-6 text-emerald-400 flex items-center gap-2 underline underline-offset-8 decoration-emerald-500/50 shrink-0">
                ▍ 終身資產與台灣遺產稅缺口分析
              </h2>
              <div className="flex-1 w-full h-full">
                {!simulationResult ? (
                  <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-lg text-slate-600">
                    <p className="tracking-widest mb-2 text-lg">等待載入財務參數...</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={simulationResult.trajectory} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="年紀" stroke="#64748b" tick={{ fill: '#64748b' }}/>
                      <YAxis stroke="#64748b" tick={{ fill: '#64748b' }} tickFormatter={(v) => `${v}萬`}/>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ paddingTop: '15px' }} />
                      <Bar dataKey="總資產_萬" name="預估總資產" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={35}/>
                      <Line type="monotone" dataKey="預估遺產稅_萬" name="預估遺產稅缺口" stroke="#ef4444" strokeWidth={3} dot={{ r: 4, fill: '#ef4444' }}/>
                    </ComposedChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {!simulationResult ? null : (
                <div className="bg-slate-900 border-2 border-emerald-900 p-6 rounded-xl shadow-2xl animate-fade-in">
                    <div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-800">
                        <div className="bg-emerald-950 p-3 rounded-full border border-emerald-800">
                            <AIIcon />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-emerald-300">AI 精算報告與理專談判講稿</h3>
                            <p className="text-slate-500 text-sm">此講稿由 LLM 模型判讀圖表後動態生成，旨在提供高轉換率的客戶溝通策略。</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-mono text-emerald-100 text-sm">
                        <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 leading-relaxed space-y-3">
                            <p className="text-emerald-400 font-bold">▍ [現況判讀] (理專視角)</p>
                            <p>客戶目前 <span className="text-white bg-blue-900 px-1 rounded">{currentAge} 歲</span>，初始資產 <span className="text-white bg-blue-900 px-1 rounded">{initialCash} 萬</span>。</p>
                            <p>依台灣現行稅法，在不進行任何規劃下，於預期壽命 <span className="text-white bg-emerald-900 px-1 rounded">{lifeExpectancy} 歲</span> 時，總資產將複利滾存至 <span className="text-white font-bold text-lg">{(simulationResult.trajectory.slice(-1)[0].總資產_萬).toLocaleString()} 萬</span>。</p>
                            <p className="text-red-400 font-bold border border-red-800 bg-red-950 p-2 rounded">
                                💥 屆時將產生高達 <span className="text-white text-xl">{(simulationResult.trajectory.slice(-1)[0].預估遺產稅_萬).toLocaleString()} 萬</span> 的遺產稅現金缺口。此為重大財務風險。
                            </p>
                        </div>
                        <div className="bg-slate-950 p-4 rounded-lg border border-emerald-800 leading-relaxed italic text-slate-300">
                            <p className="text-emerald-400 font-bold not-italic mb-2">▍ [推薦談判話術] (面對客戶)</p>
                            「{initialCash > 5000 ? '董座' : '先生/女士'}，這張圖表展現了一個需要引起您高度重視的警訊。雖然您現在實力雄厚，但隨著資產自然的增值，未來的繼承人可能面臨極大的考驗。依照目前政府的計算方式，您的家人在繼承時，必須在短短六個月內籌措出近 <span className="text-emerald-300 font-bold">{(simulationResult.trajectory.slice(-1)[0].預估遺產稅_萬 / 10).toLocaleString()} 萬</span> 的現金交給國庫，否則無法順利繼承。這對家族資產的流動性將是巨大的打擊...」
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