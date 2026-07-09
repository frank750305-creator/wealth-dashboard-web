import { useMarketSources } from "@/hooks/useMarketSources";
import type { MarketSourceStatus } from "@/types/market";

const statusMeta: Record<MarketSourceStatus, { label: string; className: string }> = {
  ready: {
    label: "可接 API",
    className: "bg-emerald-500/10 text-emerald-300 border-emerald-500/40",
  },
  needs_secret: {
    label: "需環境變數",
    className: "bg-amber-500/10 text-amber-300 border-amber-500/40",
  },
  batch_only: {
    label: "批次管線",
    className: "bg-blue-500/10 text-blue-300 border-blue-500/40",
  },
  local_only: {
    label: "本機資料",
    className: "bg-slate-500/10 text-slate-300 border-slate-500/40",
  },
};

export function MarketDataPanel() {
  const { data, error, isLoading, reload } = useMarketSources();
  const sources = data?.sources ?? [];
  const securedCount = sources.filter((source) => source.status !== "needs_secret").length;

  return (
    <div className="space-y-6 animate-fade-in">
      <section className="bg-slate-900 border border-slate-800 p-4 md:p-6 rounded-xl shadow-2xl space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-base font-semibold text-cyan-300 flex items-center gap-2">
              ▍ 市場資料平台中控台
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              MoneyDJ、鉅亨、Yahoo、FRED、BigQuery 資料管線盤點
            </p>
          </div>
          <button
            onClick={reload}
            className="self-start md:self-auto px-3 py-2 text-xs font-bold rounded-md bg-cyan-600 hover:bg-cyan-500 text-white transition-colors"
          >
            ⟳ 重新整理
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-4">
            <p className="text-slate-500 mb-1">資料源</p>
            <p className="text-2xl font-bold text-white font-mono">{sources.length}</p>
          </div>
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-4">
            <p className="text-slate-500 mb-1">可安全接入</p>
            <p className="text-2xl font-bold text-emerald-300 font-mono">{securedCount}</p>
          </div>
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-4">
            <p className="text-slate-500 mb-1">最後檢查</p>
            <p className="text-sm font-semibold text-slate-200 font-mono">
              {data?.generatedAt ? new Date(data.generatedAt).toLocaleString("zh-TW") : "--"}
            </p>
          </div>
        </div>

        {isLoading && (
          <div className="border border-dashed border-slate-800 rounded-lg p-8 text-center text-slate-500 text-sm">
            市場資料源盤點讀取中...
          </div>
        )}

        {error && (
          <div className="border border-red-900/60 bg-red-950/30 rounded-lg p-4 text-sm text-red-300 whitespace-pre-wrap">
            {error}
          </div>
        )}

        {!isLoading && !error && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {sources.map((source) => {
              const meta = statusMeta[source.status];

              return (
                <article key={source.id} className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-slate-100">{source.name}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {source.provider} · {source.category}
                      </p>
                    </div>
                    <span className={`shrink-0 text-[10px] px-2 py-1 rounded border font-bold ${meta.className}`}>
                      {meta.label}
                    </span>
                  </div>

                  <dl className="grid grid-cols-1 gap-2 text-xs">
                    <div>
                      <dt className="text-slate-500">目前資料位置</dt>
                      <dd className="text-slate-300 mt-0.5">{source.currentStorage}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">整合路徑</dt>
                      <dd className="text-cyan-200 mt-0.5">{source.integrationPath}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">下一步</dt>
                      <dd className="text-amber-200 mt-0.5">{source.nextAction}</dd>
                    </div>
                  </dl>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {data?.securityNotes.length ? (
        <section className="bg-slate-900 border border-slate-800 p-4 md:p-6 rounded-xl shadow-2xl">
          <h3 className="text-sm font-bold text-amber-300 border-b border-slate-800 pb-3 mb-3">
            ▍ 上線安全檢查
          </h3>
          <ul className="space-y-2 text-xs text-slate-300">
            {data.securityNotes.map((note) => (
              <li key={note} className="flex gap-2">
                <span className="text-amber-400">•</span>
                <span>{note}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
