import type { BigQueryMarketStatus } from "@/types/market";

type MarketDataConsoleHeaderProps = {
  sourceCount: number;
  securedCount: number;
  generatedAt: string | null | undefined;
  hasBigQueryCredentials: boolean;
  bigQueryStatus: BigQueryMarketStatus | null | undefined;
  bigQueryBadge: string;
  onReload: () => void;
};

export function MarketDataConsoleHeader({
  sourceCount,
  securedCount,
  generatedAt,
  hasBigQueryCredentials,
  bigQueryStatus,
  bigQueryBadge,
  onReload,
}: MarketDataConsoleHeaderProps) {
  return (
    <>
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
          onClick={onReload}
          className="self-start md:self-auto px-3 py-2 text-xs font-bold rounded-md bg-cyan-600 hover:bg-cyan-500 text-white transition-colors"
        >
          ⟳ 重新整理
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
        <div className="bg-slate-950 border border-slate-800 rounded-lg p-4">
          <p className="text-slate-500 mb-1">資料源</p>
          <p className="text-2xl font-bold text-white font-mono">{sourceCount}</p>
        </div>
        <div className="bg-slate-950 border border-slate-800 rounded-lg p-4">
          <p className="text-slate-500 mb-1">可安全接入</p>
          <p className="text-2xl font-bold text-emerald-300 font-mono">{securedCount}</p>
        </div>
        <div className="bg-slate-950 border border-slate-800 rounded-lg p-4">
          <p className="text-slate-500 mb-1">最後檢查</p>
          <p className="text-sm font-semibold text-slate-200 font-mono">
            {generatedAt ? new Date(generatedAt).toLocaleString("zh-TW") : "--"}
          </p>
        </div>
        <div className="bg-slate-950 border border-slate-800 rounded-lg p-4">
          <p className="text-slate-500 mb-1">BigQuery API</p>
          <p className={`text-sm font-bold ${hasBigQueryCredentials ? "text-emerald-300" : "text-amber-300"}`}>
            {bigQueryStatus ? bigQueryBadge : "--"}
          </p>
        </div>
      </div>
    </>
  );
}
