"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { DashboardTab } from "@/types/dashboard";
import type { SimulationResult, WealthRecord } from "@/types/wealth";

type ClientDemoPanelProps = {
  simulationResult: SimulationResult | null;
  currentAge: number;
  lifeExpectancy: number;
  selectedReportAge: number;
  snapReport?: WealthRecord | null;
  monthlyNetFlow: number;
  realRetireFundPv: number;
  onNavigate: (tab: DashboardTab) => void;
};

function formatWan(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "--";
  return `${Math.round(value).toLocaleString("zh-TW")} 萬`;
}

function formatCurrency(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "--";
  return `NT$${Math.round(value).toLocaleString("zh-TW")}`;
}

function formatPercent(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "--";
  return `${value.toFixed(1)}%`;
}

function metricTone(value: number | null | undefined, threshold: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "text-slate-100";
  return value >= threshold ? "text-emerald-200" : "text-amber-200";
}

function chartRows(simulationResult: SimulationResult | null) {
  return (
    simulationResult?.trajectory.map((row) => ({
      age: row.年紀,
      assets: row.總資產 ?? 0,
      estateTax: row.預估遺產稅 ?? 0,
    })) ?? []
  );
}

function tooltipMetricValue(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  if (Array.isArray(value)) return Number(value[0]);
  return 0;
}

export function ClientDemoPanel({
  simulationResult,
  currentAge,
  lifeExpectancy,
  selectedReportAge,
  snapReport,
  monthlyNetFlow,
  realRetireFundPv,
  onNavigate,
}: ClientDemoPanelProps) {
  const selectedRecord = snapReport ?? simulationResult?.trajectory.find((row) => row.年紀 === selectedReportAge) ?? null;
  const finalRecord = simulationResult?.trajectory.at(-1) ?? null;
  const rows = chartRows(simulationResult);
  const projectionYears = Math.max(0, lifeExpectancy - currentAge);
  const estateTaxWan = selectedRecord?.預估遺產稅 ?? 0;
  const netWorthWan = selectedRecord?.總資產 ?? 0;
  const finalAssetsWan = finalRecord?.總資產 ?? 0;
  const retirementReserveGap = realRetireFundPv - (selectedRecord?.退休金專戶 ?? 0);
  const preservationScore = netWorthWan > 0 ? Math.max(0, Math.min(100, 100 - (estateTaxWan / netWorthWan) * 100)) : null;

  const summaryCards = [
    {
      label: "本階段可支配淨資產",
      value: formatWan(netWorthWan),
      note: `${selectedReportAge} 歲情境估算`,
      tone: "text-cyan-100",
    },
    {
      label: "退休準備需求",
      value: formatCurrency(realRetireFundPv),
      note: `${projectionYears} 年投影期間`,
      tone: "text-emerald-100",
    },
    {
      label: "遺產稅現金風險",
      value: formatWan(estateTaxWan),
      note: estateTaxWan > 0 ? "需規劃現金來源" : "目前未見主要缺口",
      tone: estateTaxWan > 0 ? "text-amber-100" : "text-emerald-100",
    },
    {
      label: "每月自由現金流",
      value: formatCurrency(monthlyNetFlow),
      note: monthlyNetFlow >= 0 ? "仍有配置空間" : "需先修正收支結構",
      tone: metricTone(monthlyNetFlow, 0),
    },
  ];

  const advisoryRows = [
    {
      title: "資產配置",
      status: finalAssetsWan > netWorthWan ? "增長型" : "保守型",
      detail: `終局資產預估 ${formatWan(finalAssetsWan)}，用於檢查退休與傳承兩端是否同時成立。`,
    },
    {
      title: "傳承風險",
      status: estateTaxWan > 0 ? "需規劃" : "可控",
      detail: estateTaxWan > 0 ? "建議準備現金、保單或資產處分順序，避免繼承時流動性不足。" : "目前情境下未出現明顯遺產稅現金缺口。",
    },
    {
      title: "退休現金流",
      status: retirementReserveGap > 0 ? "需補強" : "可覆蓋",
      detail: retirementReserveGap > 0 ? `退休專戶仍需補強約 ${formatCurrency(retirementReserveGap)}。` : "退休準備已能覆蓋本情境需求。",
    },
    {
      title: "分析可信度",
      status: simulationResult ? "已精算" : "待精算",
      detail: simulationResult ? "本頁資料由目前參數即時計算，適合做客戶會議摘要。" : "請先在內部工作台完成一次精算，再使用客戶展示版。",
    },
  ];

  return (
    <section className="space-y-5">
      <div className="rounded-lg border border-slate-800 bg-slate-900 p-5">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div>
            <p className="text-xs font-mono text-cyan-300">CLIENT DEMO VIEW</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-100">財富、退休與傳承風險摘要</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
              這個畫面只保留客戶需要理解的結論：資產能不能支撐退休、繼承時是否有現金缺口、下一步應該優先處理什麼。
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <button
              type="button"
              onClick={() => onNavigate("main")}
              className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 font-bold text-slate-200 hover:border-cyan-700 hover:text-cyan-100"
            >
              內部精算工作台
            </button>
            <button
              type="button"
              onClick={() => onNavigate("market")}
              className="rounded-md border border-cyan-700 bg-cyan-500/10 px-3 py-2 font-bold text-cyan-100 hover:bg-cyan-500/20"
            >
              資料平台後台
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {summaryCards.map((card) => (
          <div key={card.label} className="rounded-lg border border-slate-800 bg-slate-900/80 p-4">
            <p className="text-xs text-slate-500">{card.label}</p>
            <p className={`mt-2 text-2xl font-black font-mono ${card.tone}`}>{card.value}</p>
            <p className="mt-1 text-xs text-slate-500">{card.note}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.35fr_0.65fr] gap-4">
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-100">資產與傳承風險投影</h3>
              <p className="mt-1 text-xs text-slate-500">藍色為總資產，紅色為遺產稅現金風險。</p>
            </div>
            <div className="rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-right">
              <p className="text-[10px] text-slate-600">Preservation Score</p>
              <p className="font-mono text-lg font-black text-emerald-200">{formatPercent(preservationScore)}</p>
            </div>
          </div>
          <div className="mt-4 h-[360px]">
            {rows.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={rows} margin={{ top: 10, right: 8, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="clientAssets" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#22d3ee" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="clientEstateTax" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#fb7185" stopOpacity={0.28} />
                      <stop offset="95%" stopColor="#fb7185" stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="age" stroke="#64748b" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                  <YAxis stroke="#64748b" tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={(value) => `${value}萬`} />
                  <Tooltip
                    contentStyle={{ background: "#020617", border: "1px solid #1e293b", borderRadius: 8, color: "#e2e8f0" }}
                    formatter={(value, name) => [
                      formatWan(tooltipMetricValue(value)),
                      name === "assets" ? "總資產" : "遺產稅風險",
                    ]}
                    labelFormatter={(label) => `${label} 歲`}
                  />
                  <Area type="monotone" dataKey="assets" stroke="#22d3ee" fill="url(#clientAssets)" strokeWidth={2} />
                  <Area type="monotone" dataKey="estateTax" stroke="#fb7185" fill="url(#clientEstateTax)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full flex-col items-center justify-center rounded-lg border border-dashed border-slate-800 text-center">
                <p className="text-sm font-bold text-slate-300">尚未產生客戶展示資料</p>
                <p className="mt-1 text-xs text-slate-500">請先切回內部精算工作台，完成一次全端精算。</p>
                <button
                  type="button"
                  onClick={() => onNavigate("main")}
                  className="mt-4 rounded-md border border-cyan-700 bg-cyan-500/10 px-3 py-2 text-xs font-bold text-cyan-100 hover:bg-cyan-500/20"
                >
                  前往精算工作台
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3">
          {advisoryRows.map((row) => (
            <div key={row.title} className="rounded-lg border border-slate-800 bg-slate-900 p-4">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-sm font-bold text-slate-100">{row.title}</h3>
                <span className="rounded bg-slate-950 px-2 py-1 text-[10px] font-bold text-cyan-200">{row.status}</span>
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-400">{row.detail}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
          <p className="text-xs font-bold text-slate-100">給客戶看的交付物</p>
          <p className="mt-2 text-xs leading-5 text-slate-400">一頁式財富摘要、年度資產軌跡、退休缺口、遺產稅現金需求與下一步規劃清單。</p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
          <p className="text-xs font-bold text-slate-100">資料與模型說明</p>
          <p className="mt-2 text-xs leading-5 text-slate-400">依目前輸入參數與 BigQuery 資料能力形成情境估算；正式建議需再經人工覆核。</p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
          <p className="text-xs font-bold text-slate-100">合作下一步</p>
          <p className="mt-2 text-xs leading-5 text-slate-400">確認資料口徑、補齊真實資產明細、建立風險偏好，再輸出正式配置與傳承規劃版本。</p>
        </div>
      </div>
    </section>
  );
}
