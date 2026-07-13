import type { MarketSource, MarketSourceStatus } from "@/types/market";

type MarketSourceInventorySectionProps = {
  sources: MarketSource[];
  isLoading: boolean;
  error: string | null;
};

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

export function MarketSourceInventorySection({ sources, isLoading, error }: MarketSourceInventorySectionProps) {
  if (isLoading) {
    return (
      <div className="border border-dashed border-slate-800 rounded-lg p-8 text-center text-slate-500 text-sm">
        市場資料源盤點讀取中...
      </div>
    );
  }

  if (error) {
    return (
      <div className="border border-red-900/60 bg-red-950/30 rounded-lg p-4 text-sm text-red-300 whitespace-pre-wrap">
        {error}
      </div>
    );
  }

  return (
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
  );
}
