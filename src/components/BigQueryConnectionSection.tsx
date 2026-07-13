import type { BigQueryMarketStatus } from "@/types/market";

type BigQueryEnvironmentVar = {
  key: string;
  value: string;
  kind: "plain" | "secret";
};

type BigQueryConnectionSectionProps = {
  bigQueryStatus: BigQueryMarketStatus | null | undefined;
  bigQueryError: string | null | undefined;
  hasBigQueryCredentials: boolean;
  bigQueryBadge: string;
};

const bigQueryEnvironmentVars: BigQueryEnvironmentVar[] = [
  { key: "BIGQUERY_PROJECT_ID", value: "fund-war-room", kind: "plain" },
  { key: "BIGQUERY_DATASET", value: "fund_database", kind: "plain" },
  { key: "BIGQUERY_PRICE_TABLE", value: "daily_prices", kind: "plain" },
  { key: "BIGQUERY_FX_TABLE", value: "daily_fx", kind: "plain" },
  { key: "GCP_SERVICE_ACCOUNT_JSON", value: "Service account JSON", kind: "secret" },
];

export function BigQueryConnectionSection({
  bigQueryStatus,
  bigQueryError,
  hasBigQueryCredentials,
  bigQueryBadge,
}: BigQueryConnectionSectionProps) {
  return (
    <>
      <section className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-100">BigQuery 連線狀態</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              投組分析 API 會從這裡讀取 daily_prices / daily_fx
            </p>
          </div>
          <span
            className={`self-start text-[10px] px-2 py-1 rounded border font-bold ${
              hasBigQueryCredentials
                ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/40"
                : "bg-amber-500/10 text-amber-300 border-amber-500/40"
            }`}
          >
            {bigQueryStatus ? bigQueryBadge : "讀取中"}
          </span>
        </div>

        {bigQueryError ? (
          <div className="border border-red-900/60 bg-red-950/30 rounded-lg p-3 text-xs text-red-300 whitespace-pre-wrap">
            {bigQueryError}
          </div>
        ) : (
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div>
              <dt className="text-slate-500">Project / Dataset</dt>
              <dd className="text-slate-200 mt-0.5 font-mono">
                {bigQueryStatus ? `${bigQueryStatus.projectId}.${bigQueryStatus.dataset}` : "--"}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">憑證來源</dt>
              <dd className="text-slate-200 mt-0.5 font-mono">
                {bigQueryStatus?.credentialSource ?? "--"}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">價格表</dt>
              <dd className="text-cyan-200 mt-0.5 font-mono break-all">
                {bigQueryStatus?.priceTable ?? "--"}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">匯率表</dt>
              <dd className="text-cyan-200 mt-0.5 font-mono break-all">
                {bigQueryStatus?.fxTable ?? "--"}
              </dd>
            </div>
          </dl>
        )}
      </section>

      {!hasBigQueryCredentials && (
        <section className="bg-amber-950/20 border border-amber-900/60 rounded-lg p-4 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-amber-200">BigQuery 上線接線板</h3>
              <p className="text-[11px] text-amber-100/70 mt-0.5">
                Vercel 設定完成並重新部署後，市場資料 API 會切換為可讀取狀態
              </p>
            </div>
            <a
              href="https://vercel.com/frank-workspace/wealth-dashboard-web/settings/environment-variables"
              target="_blank"
              rel="noreferrer"
              className="self-start md:self-auto px-3 py-2 text-xs font-bold rounded-md bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors"
            >
              開啟 Vercel
            </a>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-2 text-xs">
            {bigQueryEnvironmentVars.map((envVar) => (
              <div key={envVar.key} className="bg-slate-950/80 border border-amber-900/40 rounded-md p-3 min-w-0">
                <p className="text-[10px] text-amber-100/60 mb-1">{envVar.kind === "secret" ? "Secret" : "Value"}</p>
                <p className="font-mono text-amber-100 truncate">{envVar.key}</p>
                <p className="font-mono text-slate-400 truncate mt-1">{envVar.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[11px] text-amber-100/80">
            <div className="bg-slate-950/60 border border-amber-900/30 rounded-md p-3">
              <span className="font-mono text-amber-200">1</span> 建立 BigQuery service account
            </div>
            <div className="bg-slate-950/60 border border-amber-900/30 rounded-md p-3">
              <span className="font-mono text-amber-200">2</span> 貼到 Vercel Production / Preview / Development
            </div>
            <div className="bg-slate-950/60 border border-amber-900/30 rounded-md p-3">
              <span className="font-mono text-amber-200">3</span> 重新部署 main 後按重新整理
            </div>
          </div>
        </section>
      )}
    </>
  );
}
