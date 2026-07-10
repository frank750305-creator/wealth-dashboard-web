import { useState } from "react";
import { useMarketSources } from "@/hooks/useMarketSources";
import { fetchBigQueryAssetProfile, fetchBigQueryAssets } from "@/lib/marketApi";
import type { BigQueryAsset, BigQueryAssetProfileResponse, MarketSourceStatus } from "@/types/market";
import { BigQueryPortfolioPanel } from "./BigQueryPortfolioPanel";

type QualityStatus = "strong" | "watch" | "risk" | "neutral";

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

const bigQueryEnvironmentVars = [
  { key: "BIGQUERY_PROJECT_ID", value: "fund-war-room", kind: "plain" },
  { key: "BIGQUERY_DATASET", value: "fund_database", kind: "plain" },
  { key: "BIGQUERY_PRICE_TABLE", value: "daily_prices", kind: "plain" },
  { key: "BIGQUERY_FX_TABLE", value: "daily_fx", kind: "plain" },
  { key: "GCP_SERVICE_ACCOUNT_JSON", value: "Service account JSON", kind: "secret" },
];

function formatCount(value: number | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value.toLocaleString("zh-TW") : "--";
}

function formatPrice(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value.toLocaleString("zh-TW", { maximumFractionDigits: 4 }) : "--";
}

function formatPercent(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? `${(value * 100).toFixed(2)}%` : "--";
}

function daysSinceDate(value?: string | null) {
  if (!value) return null;
  const time = new Date(`${value}T00:00:00`).getTime();
  if (!Number.isFinite(time)) return null;
  return Math.max(0, Math.floor((Date.now() - time) / 86400000));
}

function freshnessStatus(days: number | null): QualityStatus {
  if (days === null) return "neutral";
  if (days <= 3) return "strong";
  if (days <= 10) return "watch";
  return "risk";
}

function coverageStatus(count: number | undefined, strongThreshold: number, watchThreshold: number): QualityStatus {
  if (typeof count !== "number" || !Number.isFinite(count)) return "neutral";
  if (count >= strongThreshold) return "strong";
  if (count >= watchThreshold) return "watch";
  return "risk";
}

function qualityLabel(status: QualityStatus) {
  if (status === "strong") return "正常";
  if (status === "watch") return "觀察";
  if (status === "risk") return "異常";
  return "未知";
}

function qualityClass(status: QualityStatus) {
  if (status === "strong") return "border-emerald-500/20 bg-emerald-950/10";
  if (status === "watch") return "border-amber-500/25 bg-amber-950/10";
  if (status === "risk") return "border-rose-500/25 bg-rose-950/10";
  return "border-slate-800 bg-slate-900/60";
}

function qualityBadgeClass(status: QualityStatus) {
  if (status === "strong") return "bg-emerald-500/15 text-emerald-200";
  if (status === "watch") return "bg-amber-500/15 text-amber-200";
  if (status === "risk") return "bg-rose-500/15 text-rose-200";
  return "bg-slate-800 text-slate-300";
}

function csvCell(value: unknown) {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function downloadTextFile(fileName: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function resultStamp() {
  return new Date().toISOString().slice(0, 19).replaceAll(":", "").replace("T", "-");
}

function assetProfileCsv(profile: BigQueryAssetProfileResponse) {
  const rows = [
    ["section", "date", "name", "value"],
    ["summary", "", "symbol", profile.symbol],
    ["summary", "", "price_basis", profile.priceBasis],
    ["summary", "", "first_date", profile.summary.first_date ?? ""],
    ["summary", "", "latest_date", profile.summary.latest_date ?? ""],
    ["summary", "", "row_count", profile.summary.row_count],
    ["summary", "", "selected_price_rows", profile.summary.selected_price_rows],
    ["summary", "", "missing_selected_price_rows", profile.summary.missing_selected_price_rows],
    ["summary", "", "adjusted_price_rows", profile.summary.adjusted_price_rows],
    ["summary", "", "raw_price_rows", profile.summary.raw_price_rows],
    ...Object.entries(profile.metrics).map(([key, value]) => ["metric", "", key, value ?? ""]),
    ...profile.recentPrices.map((point) => [
      "recent_price",
      point.date ?? "",
      "selected_price",
      point.selected_price ?? "",
    ]),
  ];

  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
}

export function MarketDataPanel() {
  const {
    data,
    bigQueryStatus,
    bigQueryDiagnostics,
    error,
    bigQueryError,
    bigQueryDiagnosticsError,
    isLoading,
    reload,
  } = useMarketSources();
  const [assetQuery, setAssetQuery] = useState("0050.TW");
  const [assetPriceBasis, setAssetPriceBasis] = useState<"adjusted" | "raw">("adjusted");
  const [assetSuggestions, setAssetSuggestions] = useState<BigQueryAsset[]>([]);
  const [assetProfile, setAssetProfile] = useState<BigQueryAssetProfileResponse | null>(null);
  const [assetPanelError, setAssetPanelError] = useState<string | null>(null);
  const [isSearchingAssets, setIsSearchingAssets] = useState(false);
  const [isLoadingAssetProfile, setIsLoadingAssetProfile] = useState(false);
  const sources = data?.sources ?? [];
  const securedCount = sources.filter((source) => source.status !== "needs_secret").length;
  const hasBigQueryCredentials = Boolean(
    bigQueryStatus?.hasServiceAccountEnv || bigQueryStatus?.hasGoogleApplicationCredentials,
  );
  const bigQueryBadge = hasBigQueryCredentials
    ? "已設定憑證"
    : "等待 Vercel 金鑰";
  const priceFreshnessDays = daysSinceDate(bigQueryDiagnostics?.priceSummary.latest_date);
  const fxFreshnessDays = daysSinceDate(bigQueryDiagnostics?.fxSummary.latest_date);
  const priceFreshnessStatus = freshnessStatus(priceFreshnessDays);
  const fxFreshnessStatus = freshnessStatus(fxFreshnessDays);
  const staleSymbols = bigQueryDiagnostics?.staleSymbols ?? [];
  const fxCurrencies = bigQueryDiagnostics?.fxCurrencies ?? [];
  const staleSymbolStatus: QualityStatus = staleSymbols.length >= 5 ? "risk" : staleSymbols.length > 0 ? "watch" : "strong";
  const fxCurrencyStatus: QualityStatus = coverageStatus(fxCurrencies.length, 2, 1);
  const schemaStatus: QualityStatus = bigQueryDiagnostics
    ? bigQueryDiagnostics.schemaChecks.priceTable.isReady && bigQueryDiagnostics.schemaChecks.fxTable.isReady
      ? "strong"
      : "risk"
    : "neutral";
  const symbolCoverageStatus = coverageStatus(bigQueryDiagnostics?.priceSummary.symbol_count, 50, 10);
  const priceDepthStatus = coverageStatus(bigQueryDiagnostics?.priceSummary.row_count, 50_000, 5_000);
  const qualityCards: Array<{ label: string; value: string; status: QualityStatus; note: string }> = [
    {
      label: "Schema",
      value: bigQueryDiagnostics ? (schemaStatus === "strong" ? "Ready" : "Missing") : "--",
      status: schemaStatus,
      note: schemaStatus === "strong" ? "價格表與匯率表欄位完整" : schemaStatus === "risk" ? "必要欄位缺失" : "尚未讀取",
    },
    {
      label: "價格新鮮度",
      value: priceFreshnessDays === null ? "--" : `${priceFreshnessDays} 天`,
      status: priceFreshnessStatus,
      note: bigQueryDiagnostics?.priceSummary.latest_date ?? "尚無價格最新日",
    },
    {
      label: "匯率新鮮度",
      value: fxFreshnessDays === null ? "--" : `${fxFreshnessDays} 天`,
      status: fxFreshnessStatus,
      note: bigQueryDiagnostics?.fxSummary.latest_date ?? "尚無匯率最新日",
    },
    {
      label: "商品覆蓋",
      value: `${formatCount(bigQueryDiagnostics?.priceSummary.symbol_count)} 檔`,
      status: symbolCoverageStatus,
      note: "daily_prices 可分析商品數",
    },
    {
      label: "價格深度",
      value: `${formatCount(bigQueryDiagnostics?.priceSummary.row_count)} 筆`,
      status: priceDepthStatus,
      note: "daily_prices 歷史價格筆數",
    },
  ];
  const issueCards: Array<{ label: string; value: string; status: QualityStatus; note: string }> = [
    {
      label: "落後商品",
      value: `${staleSymbols.length} 檔`,
      status: bigQueryDiagnostics ? staleSymbolStatus : "neutral",
      note: staleSymbols.length ? "部分商品最新日落後於價格表最新日" : "未偵測到落後商品",
    },
    {
      label: "匯率幣別",
      value: `${fxCurrencies.length} 組`,
      status: bigQueryDiagnostics ? fxCurrencyStatus : "neutral",
      note: "daily_fx 可供換算的幣別數",
    },
  ];
  const assetProfileQualityCards: Array<{ label: string; value: string; status: QualityStatus; note: string }> = assetProfile
    ? [
        {
          label: "價格新鮮度",
          value: `${daysSinceDate(assetProfile.summary.latest_date) ?? "--"} 天`,
          status: freshnessStatus(daysSinceDate(assetProfile.summary.latest_date)),
          note: assetProfile.summary.latest_date ?? "--",
        },
        {
          label: "資料完整度",
          value: `${formatCount(assetProfile.summary.selected_price_rows)} / ${formatCount(assetProfile.summary.row_count)}`,
          status:
            assetProfile.summary.missing_selected_price_rows === 0
              ? "strong"
              : assetProfile.summary.missing_selected_price_rows <= 5
                ? "watch"
                : "risk",
          note: `缺 ${formatCount(assetProfile.summary.missing_selected_price_rows)} 筆 ${assetProfile.priceBasis}`,
        },
        {
          label: "累積報酬",
          value: formatPercent(assetProfile.metrics.totalReturn),
          status:
            typeof assetProfile.metrics.totalReturn === "number"
              ? assetProfile.metrics.totalReturn >= 0
                ? "strong"
                : "risk"
              : "neutral",
          note: `${assetProfile.summary.first_date ?? "--"} ~ ${assetProfile.summary.latest_date ?? "--"}`,
        },
        {
          label: "年化波動",
          value: formatPercent(assetProfile.metrics.annualizedVolatility),
          status:
            typeof assetProfile.metrics.annualizedVolatility === "number"
              ? assetProfile.metrics.annualizedVolatility <= 0.18
                ? "strong"
                : assetProfile.metrics.annualizedVolatility <= 0.35
                  ? "watch"
                  : "risk"
              : "neutral",
          note: "以日報酬換算 252 交易日",
        },
        {
          label: "最大回撤",
          value: formatPercent(assetProfile.metrics.maxDrawdown),
          status:
            typeof assetProfile.metrics.maxDrawdown === "number"
              ? Math.abs(assetProfile.metrics.maxDrawdown) <= 0.15
                ? "strong"
                : Math.abs(assetProfile.metrics.maxDrawdown) <= 0.3
                  ? "watch"
                  : "risk"
              : "neutral",
          note: "單一商品高低點壓力",
        },
      ]
    : [];
  const handleExportDiagnosticsCsv = () => {
    if (!bigQueryDiagnostics) return;

    const rows = [
      ["section", "name", "value", "status", "note"],
      ...qualityCards.map((card) => ["quality", card.label, card.value, card.status, card.note]),
      ["summary", "price_first_date", bigQueryDiagnostics.priceSummary.first_date ?? "", "", ""],
      ["summary", "price_latest_date", bigQueryDiagnostics.priceSummary.latest_date ?? "", "", ""],
      ["summary", "price_row_count", bigQueryDiagnostics.priceSummary.row_count ?? "", "", ""],
      ["summary", "price_symbol_count", bigQueryDiagnostics.priceSummary.symbol_count ?? "", "", ""],
      ["summary", "adjusted_price_rows", bigQueryDiagnostics.priceSummary.adjusted_price_rows ?? "", "", ""],
      ["summary", "raw_price_rows", bigQueryDiagnostics.priceSummary.raw_price_rows ?? "", "", ""],
      ["summary", "fx_first_date", bigQueryDiagnostics.fxSummary.first_date ?? "", "", ""],
      ["summary", "fx_latest_date", bigQueryDiagnostics.fxSummary.latest_date ?? "", "", ""],
      ["summary", "fx_row_count", bigQueryDiagnostics.fxSummary.row_count ?? "", "", ""],
      ["summary", "fx_currency_count", bigQueryDiagnostics.fxSummary.currency_count ?? "", "", ""],
      ...issueCards.map((card) => ["issue", card.label, card.value, card.status, card.note]),
      ...bigQueryDiagnostics.recentSymbols.map((symbol) => [
        "recent_symbol",
        symbol.symbol,
        symbol.latest_date ?? "",
        freshnessStatus(daysSinceDate(symbol.latest_date)),
        symbol.row_count,
      ]),
      ...staleSymbols.map((symbol) => [
        "stale_symbol",
        symbol.symbol,
        symbol.latest_date ?? "",
        symbol.stale_days ?? "",
        symbol.row_count,
      ]),
      ...fxCurrencies.map((currency) => [
        "fx_currency",
        currency.currency,
        currency.latest_date ?? "",
        freshnessStatus(daysSinceDate(currency.latest_date)),
        currency.row_count,
      ]),
    ];

    downloadTextFile(
      `bigquery-data-quality-${resultStamp()}.csv`,
      rows.map((row) => row.map(csvCell).join(",")).join("\n"),
      "text/csv;charset=utf-8",
    );
  };
  const handleSearchAssets = async () => {
    if (!hasBigQueryCredentials || !assetQuery.trim()) return;

    setIsSearchingAssets(true);
    setAssetPanelError(null);
    try {
      const response = await fetchBigQueryAssets(assetQuery, 12);
      setAssetSuggestions(response.assets);
    } catch (err: unknown) {
      setAssetSuggestions([]);
      setAssetPanelError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSearchingAssets(false);
    }
  };
  const handleLoadAssetProfile = async (symbol = assetQuery) => {
    const cleanSymbol = symbol.trim();
    if (!hasBigQueryCredentials || !cleanSymbol) return;

    setIsLoadingAssetProfile(true);
    setAssetPanelError(null);
    try {
      const response = await fetchBigQueryAssetProfile(cleanSymbol, assetPriceBasis);
      setAssetQuery(response.symbol);
      setAssetProfile(response);
    } catch (err: unknown) {
      setAssetProfile(null);
      setAssetPanelError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoadingAssetProfile(false);
    }
  };
  const handleExportAssetProfileCsv = () => {
    if (!assetProfile) return;

    downloadTextFile(
      `bigquery-asset-profile-${assetProfile.symbol}-${resultStamp()}.csv`,
      assetProfileCsv(assetProfile),
      "text/csv;charset=utf-8",
    );
  };

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

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
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
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-4">
            <p className="text-slate-500 mb-1">BigQuery API</p>
            <p className={`text-sm font-bold ${hasBigQueryCredentials ? "text-emerald-300" : "text-amber-300"}`}>
              {bigQueryStatus ? bigQueryBadge : "--"}
            </p>
          </div>
        </div>

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

        <section className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-100">BigQuery 資料倉儲診斷</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                價格表與匯率表的覆蓋率、最近更新日與資料筆數
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {bigQueryDiagnostics ? (
                <button
                  onClick={handleExportDiagnosticsCsv}
                  className="px-3 py-2 text-xs font-bold rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100"
                >
                  品質 CSV
                </button>
              ) : null}
              <span className="self-start text-[10px] px-2 py-1 rounded border font-bold bg-slate-800 text-slate-300 border-slate-700">
                {bigQueryDiagnostics ? "已讀取" : "待憑證"}
              </span>
            </div>
          </div>

          {bigQueryDiagnosticsError ? (
            <div className="border border-red-900/60 bg-red-950/30 rounded-lg p-3 text-xs text-red-300 whitespace-pre-wrap">
              {bigQueryDiagnosticsError}
            </div>
          ) : bigQueryDiagnostics ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-2 text-xs">
                {qualityCards.map((card) => (
                  <div key={card.label} className={`rounded-lg border p-3 min-w-0 ${qualityClass(card.status)}`}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] text-slate-500 truncate">{card.label}</p>
                      <span className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-bold ${qualityBadgeClass(card.status)}`}>
                        {qualityLabel(card.status)}
                      </span>
                    </div>
                    <p className="mt-2 font-mono text-sm font-bold text-slate-100 truncate" title={card.value}>
                      {card.value}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">{card.note}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                {issueCards.map((card) => (
                  <div key={card.label} className={`rounded-lg border p-3 min-w-0 ${qualityClass(card.status)}`}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] text-slate-500 truncate">{card.label}</p>
                      <span className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-bold ${qualityBadgeClass(card.status)}`}>
                        {qualityLabel(card.status)}
                      </span>
                    </div>
                    <p className="mt-2 font-mono text-sm font-bold text-slate-100 truncate" title={card.value}>
                      {card.value}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">{card.note}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-bold text-slate-200">daily_prices</p>
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-bold ${qualityBadgeClass(
                        bigQueryDiagnostics.schemaChecks.priceTable.isReady ? "strong" : "risk",
                      )}`}
                    >
                      {bigQueryDiagnostics.schemaChecks.priceTable.isReady ? "Ready" : "Missing"}
                    </span>
                  </div>
                  <dl className="grid grid-cols-2 gap-2">
                    <div>
                      <dt className="text-slate-500">期間</dt>
                      <dd className="mt-0.5 font-mono text-slate-100">
                        {bigQueryDiagnostics.priceSummary.first_date ?? "--"} ~ {bigQueryDiagnostics.priceSummary.latest_date ?? "--"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">商品數</dt>
                      <dd className="mt-0.5 font-mono text-slate-100">
                        {formatCount(bigQueryDiagnostics.priceSummary.symbol_count)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">總筆數</dt>
                      <dd className="mt-0.5 font-mono text-slate-100">
                        {formatCount(bigQueryDiagnostics.priceSummary.row_count)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Adj / Raw</dt>
                      <dd className="mt-0.5 font-mono text-slate-100">
                        {formatCount(bigQueryDiagnostics.priceSummary.adjusted_price_rows)} / {formatCount(bigQueryDiagnostics.priceSummary.raw_price_rows)}
                      </dd>
                    </div>
                  </dl>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-bold text-slate-200">daily_fx</p>
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-bold ${qualityBadgeClass(
                        bigQueryDiagnostics.schemaChecks.fxTable.isReady ? "strong" : "risk",
                      )}`}
                    >
                      {bigQueryDiagnostics.schemaChecks.fxTable.isReady ? "Ready" : "Missing"}
                    </span>
                  </div>
                  <dl className="grid grid-cols-2 gap-2">
                    <div>
                      <dt className="text-slate-500">期間</dt>
                      <dd className="mt-0.5 font-mono text-slate-100">
                        {bigQueryDiagnostics.fxSummary.first_date ?? "--"} ~ {bigQueryDiagnostics.fxSummary.latest_date ?? "--"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">幣別數</dt>
                      <dd className="mt-0.5 font-mono text-slate-100">
                        {formatCount(bigQueryDiagnostics.fxSummary.currency_count)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">總筆數</dt>
                      <dd className="mt-0.5 font-mono text-slate-100">
                        {formatCount(bigQueryDiagnostics.fxSummary.row_count)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">距今天</dt>
                      <dd className="mt-0.5 font-mono text-slate-100">
                        {fxFreshnessDays === null ? "--" : `${fxFreshnessDays} 天`}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>

              {(!bigQueryDiagnostics.schemaChecks.priceTable.isReady || !bigQueryDiagnostics.schemaChecks.fxTable.isReady) && (
                <div className="border border-red-900/60 bg-red-950/30 rounded-lg p-3 text-xs text-red-300 space-y-2">
                  {!bigQueryDiagnostics.schemaChecks.priceTable.isReady && (
                    <p>
                      daily_prices 缺少欄位：
                      {bigQueryDiagnostics.schemaChecks.priceTable.missingColumns.join(", ")}
                    </p>
                  )}
                  {!bigQueryDiagnostics.schemaChecks.fxTable.isReady && (
                    <p>
                      daily_fx 缺少欄位：
                      {bigQueryDiagnostics.schemaChecks.fxTable.missingColumns.join(", ")}
                    </p>
                  )}
                </div>
              )}

              {staleSymbols.length ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3 text-[11px]">
                    <span className="text-slate-500">落後商品</span>
                    <span className="text-slate-600 font-mono">{staleSymbols.length} 檔</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                    {staleSymbols.slice(0, 8).map((symbol) => {
                      const staleDays = symbol.stale_days ?? daysSinceDate(symbol.latest_date);
                      return (
                        <div key={symbol.symbol} className="bg-slate-900 border border-slate-800 rounded-md p-2 space-y-1">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-slate-200 truncate">{symbol.symbol}</span>
                            <span
                              className={`rounded px-2 py-0.5 text-[10px] font-bold ${qualityBadgeClass(
                                freshnessStatus(staleDays),
                              )}`}
                            >
                              {staleDays === null ? "--" : `${staleDays} 天`}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-3 text-[11px] text-slate-500">
                            <span className="font-mono">{symbol.latest_date ?? "--"}</span>
                            <span className="font-mono">{formatCount(symbol.row_count)} rows</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {fxCurrencies.length ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3 text-[11px]">
                    <span className="text-slate-500">匯率幣別狀態</span>
                    <span className="text-slate-600 font-mono">{fxCurrencies.length} 組</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                    {fxCurrencies.map((currency) => (
                      <div key={currency.currency} className="flex items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-md p-2">
                        <span className="text-slate-200 truncate">{currency.currency}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500 font-mono">{currency.latest_date ?? "--"}</span>
                          <span
                            className={`rounded px-2 py-0.5 text-[10px] font-bold ${qualityBadgeClass(
                              freshnessStatus(daysSinceDate(currency.latest_date)),
                            )}`}
                          >
                            {qualityLabel(freshnessStatus(daysSinceDate(currency.latest_date)))}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3 text-[11px]">
                  <span className="text-slate-500">近期商品新鮮度</span>
                  <span className="text-slate-600 font-mono">{bigQueryDiagnostics.recentSymbols.length} 檔</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                  {bigQueryDiagnostics.recentSymbols.map((symbol) => (
                    <div key={symbol.symbol} className="flex items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-md p-2">
                      <span className="text-slate-200 truncate">{symbol.symbol}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 font-mono">{symbol.latest_date ?? "--"}</span>
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-bold ${qualityBadgeClass(
                            freshnessStatus(daysSinceDate(symbol.latest_date)),
                          )}`}
                        >
                          {qualityLabel(freshnessStatus(daysSinceDate(symbol.latest_date)))}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="border border-dashed border-slate-800 rounded-lg p-4 text-xs text-slate-500">
              設定 GCP_SERVICE_ACCOUNT_JSON 後，這裡會顯示 daily_prices / daily_fx 的資料覆蓋率。
            </div>
          )}
        </section>

        <section className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-4">
          <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-100">BigQuery 商品主檔</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                單一商品價格、報酬、波動、回撤與資料完整度
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-[1fr_120px_auto_auto] gap-2 text-xs xl:min-w-[680px]">
              <input
                value={assetQuery}
                onChange={(event) => setAssetQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    void handleLoadAssetProfile();
                  }
                }}
                placeholder="0050.TW"
                className="min-w-0 bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-slate-100 font-mono outline-none focus:border-cyan-600"
              />
              <select
                value={assetPriceBasis}
                onChange={(event) => setAssetPriceBasis(event.target.value as "adjusted" | "raw")}
                className="bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-slate-100"
              >
                <option value="adjusted">Adj</option>
                <option value="raw">Raw</option>
              </select>
              <button
                onClick={handleSearchAssets}
                disabled={!hasBigQueryCredentials || isSearchingAssets || !assetQuery.trim()}
                className="px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold disabled:cursor-not-allowed disabled:bg-slate-900 disabled:text-slate-600"
              >
                {isSearchingAssets ? "搜尋中" : "搜尋"}
              </button>
              <button
                onClick={() => handleLoadAssetProfile()}
                disabled={!hasBigQueryCredentials || isLoadingAssetProfile || !assetQuery.trim()}
                className="px-3 py-2 rounded-md bg-cyan-700 hover:bg-cyan-600 text-white font-bold disabled:cursor-not-allowed disabled:bg-slate-900 disabled:text-slate-600"
              >
                {isLoadingAssetProfile ? "讀取中" : "讀取商品"}
              </button>
            </div>
          </div>

          {assetPanelError ? (
            <div className="border border-red-900/60 bg-red-950/30 rounded-lg p-3 text-xs text-red-300 whitespace-pre-wrap">
              {assetPanelError}
            </div>
          ) : null}

          {assetSuggestions.length ? (
            <div className="flex flex-wrap gap-2">
              {assetSuggestions.map((asset) => (
                <button
                  key={asset.symbol}
                  onClick={() => handleLoadAssetProfile(asset.symbol)}
                  className="max-w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-left text-xs hover:border-cyan-600"
                >
                  <span className="block font-bold text-cyan-200">{asset.symbol}</span>
                  <span className="block text-[11px] text-slate-500">
                    {asset.first_date ?? "--"} ~ {asset.latest_date ?? "--"} · {formatCount(asset.row_count)} rows
                  </span>
                </button>
              ))}
            </div>
          ) : null}

          {assetProfile ? (
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-t border-slate-900 pt-4">
                <div>
                  <p className="text-sm font-bold text-cyan-200">{assetProfile.symbol}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {assetProfile.summary.first_date ?? "--"} ~ {assetProfile.summary.latest_date ?? "--"} · {assetProfile.priceBasis}
                  </p>
                </div>
                <button
                  onClick={handleExportAssetProfileCsv}
                  className="self-start md:self-auto px-3 py-2 text-xs font-bold rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100"
                >
                  商品 CSV
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-2 text-xs">
                {assetProfileQualityCards.map((card) => (
                  <div key={card.label} className={`rounded-lg border p-3 min-w-0 ${qualityClass(card.status)}`}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] text-slate-500 truncate">{card.label}</p>
                      <span className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-bold ${qualityBadgeClass(card.status)}`}>
                        {qualityLabel(card.status)}
                      </span>
                    </div>
                    <p className="mt-2 font-mono text-sm font-bold text-slate-100 truncate" title={card.value}>
                      {card.value}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">{card.note}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-2 text-xs">
                {[
                  ["最新價格", formatPrice(assetProfile.metrics.latestPrice)],
                  ["年化報酬", formatPercent(assetProfile.metrics.annualizedReturn)],
                  ["勝率", formatPercent(assetProfile.metrics.positiveDayRatio)],
                  ["最佳單日", formatPercent(assetProfile.metrics.bestDay)],
                  ["最差單日", formatPercent(assetProfile.metrics.worstDay)],
                  ["最新日報酬", formatPercent(assetProfile.metrics.latestDailyReturn)],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-md border border-slate-800 bg-slate-900/60 p-3 min-w-0">
                    <p className="text-[11px] text-slate-600 truncate">{label}</p>
                    <p className="mt-1 font-mono text-sm font-bold text-slate-100 truncate" title={value}>
                      {value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] text-xs">
                  <thead>
                    <tr className="text-left text-[11px] text-slate-600">
                      <th className="py-2 pr-3 font-medium">Date</th>
                      <th className="py-2 px-3 font-medium text-right">Selected</th>
                      <th className="py-2 px-3 font-medium text-right">Adj</th>
                      <th className="py-2 px-3 font-medium text-right">Raw</th>
                      <th className="py-2 pl-3 font-medium text-right">Daily Return</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assetProfile.recentPrices.slice().reverse().map((point) => (
                      <tr key={point.date} className="border-t border-slate-900">
                        <td className="py-2 pr-3 font-mono text-slate-300">{point.date ?? "--"}</td>
                        <td className="py-2 px-3 text-right font-mono text-cyan-200">{formatPrice(point.selected_price)}</td>
                        <td className="py-2 px-3 text-right font-mono text-slate-400">{formatPrice(point.adj_price)}</td>
                        <td className="py-2 px-3 text-right font-mono text-slate-400">{formatPrice(point.raw_price)}</td>
                        <td
                          className={`py-2 pl-3 text-right font-mono ${
                            typeof point.daily_return === "number" && point.daily_return < 0
                              ? "text-rose-300"
                              : "text-emerald-300"
                          }`}
                        >
                          {formatPercent(point.daily_return)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="border border-dashed border-slate-800 rounded-lg p-4 text-xs text-slate-500">
              選擇商品後，這裡會顯示單一商品的資料主檔與價格品質。
            </div>
          )}
        </section>

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

      <BigQueryPortfolioPanel hasBigQueryCredentials={hasBigQueryCredentials} />
    </div>
  );
}
