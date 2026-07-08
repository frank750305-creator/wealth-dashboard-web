export function DashboardHeader() {
  return (
    <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center border-b border-slate-800 pb-6 mb-8 gap-4">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-wider text-slate-100 flex items-center gap-3">
          🛡️ 全方位資產配置與民法傳承精算系統 <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded font-mono">V4.0 終極完全體</span>
        </h1>
        <p className="text-slate-400 mt-2 text-xs md:text-sm">
          AI-Driven Wealth & Succession Planning System (軍公教退休、逆算器全解鎖)
        </p>
      </div>
    </header>
  );
}
