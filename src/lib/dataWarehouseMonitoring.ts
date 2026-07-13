import type {
  BigQueryFxCurrency,
  BigQueryMarketDiagnostics,
  BigQuerySchemaCheck,
  BigQueryStaleSymbol,
} from "@/types/market";

export type DataWarehouseStatus = "pass" | "watch" | "block";
export type DataWarehouseQualityStatus = "strong" | "watch" | "risk" | "neutral";

export type DataPipelineHealthItem = {
  label: string;
  status: DataWarehouseStatus;
  value: string;
  target: string;
  owner: string;
  action: string;
};

export type DataPipelineTableSnapshot = {
  table: string;
  status: DataWarehouseStatus;
  latestDate: string;
  rowCount: string;
  coverage: string;
  freshness: string;
  owner: string;
  action: string;
};

export type DataContractItem = {
  table: string;
  layer: string;
  status: DataWarehouseStatus;
  requiredColumns: string[];
  presentColumns: string[];
  missingColumns: string[];
  freshness: string;
  volume: string;
  owner: string;
  action: string;
};

export type CoverageUniverseItem = {
  label: string;
  status: DataWarehouseStatus;
  count: string;
  target: string;
  coverage: string;
  owner: string;
  action: string;
};

export type DataQualitySummaryCard = {
  label: string;
  value: string;
  status: DataWarehouseQualityStatus;
  note: string;
};

function formatCount(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value.toLocaleString("zh-TW") : "--";
}

function daysSinceDate(value?: string | null) {
  if (!value) return null;
  const time = new Date(`${value}T00:00:00`).getTime();
  if (!Number.isFinite(time)) return null;
  return Math.max(0, Math.floor((Date.now() - time) / 86400000));
}

function freshnessStatus(days: number | null): DataWarehouseQualityStatus {
  if (days === null) return "neutral";
  if (days <= 3) return "strong";
  if (days <= 10) return "watch";
  return "risk";
}

function qualityLabel(status: DataWarehouseQualityStatus) {
  if (status === "strong") return "正常";
  if (status === "watch") return "觀察";
  if (status === "risk") return "異常";
  return "未知";
}

function csvCell(value: unknown) {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function executionReviewLabel(status: DataWarehouseStatus) {
  if (status === "pass") return "通過";
  if (status === "watch") return "觀察";
  return "暫停";
}

function qualityToExecutionStatus(status: DataWarehouseQualityStatus): DataWarehouseStatus {
  if (status === "risk") return "block";
  if (status === "watch" || status === "neutral") return "watch";
  return "pass";
}

function combinedExecutionStatus(statuses: DataWarehouseStatus[]): DataWarehouseStatus {
  if (statuses.some((status) => status === "block")) return "block";
  if (statuses.some((status) => status === "watch")) return "watch";
  return "pass";
}

function pipelineSchemaAction(check: { isReady: boolean; missingColumns: string[] }, tableLabel: string) {
  if (check.isReady) return `${tableLabel} schema 已符合最低需求`;
  return `補齊缺少欄位：${check.missingColumns.join(", ") || "--"}`;
}

function staleSymbolExecutionStatus(staleDays: number | null): DataWarehouseStatus {
  if (staleDays === null) return "watch";
  return staleDays >= 10 ? "block" : "watch";
}

export function buildDataPipelineHealthItems({
  hasBigQueryCredentials,
  diagnostics,
  schemaStatus,
  priceFreshnessStatus,
  fxFreshnessStatus,
  symbolCoverageStatus,
  priceDepthStatus,
  staleSymbolStatus,
  fxCurrencyStatus,
  staleSymbols,
  fxCurrencies,
  riskOwner,
}: {
  hasBigQueryCredentials: boolean;
  diagnostics?: BigQueryMarketDiagnostics;
  schemaStatus: DataWarehouseQualityStatus;
  priceFreshnessStatus: DataWarehouseQualityStatus;
  fxFreshnessStatus: DataWarehouseQualityStatus;
  symbolCoverageStatus: DataWarehouseQualityStatus;
  priceDepthStatus: DataWarehouseQualityStatus;
  staleSymbolStatus: DataWarehouseQualityStatus;
  fxCurrencyStatus: DataWarehouseQualityStatus;
  staleSymbols: BigQueryStaleSymbol[];
  fxCurrencies: BigQueryFxCurrency[];
  riskOwner: string;
}): DataPipelineHealthItem[] {
  const cleanRiskOwner = riskOwner.trim() || "風控";

  return [
    {
      label: "BigQuery 憑證",
      status: hasBigQueryCredentials ? "pass" : "block",
      value: hasBigQueryCredentials ? "已設定" : "未設定",
      target: "Vercel Production 需有 GCP_SERVICE_ACCOUNT_JSON",
      owner: cleanRiskOwner,
      action: hasBigQueryCredentials ? "維持憑證輪替紀錄" : "先設定 service account JSON 並重新部署",
    },
    {
      label: "Schema 完整度",
      status: qualityToExecutionStatus(schemaStatus),
      value: diagnostics ? (schemaStatus === "strong" ? "Ready" : "Missing") : "--",
      target: "daily_prices / daily_fx 必要欄位完整",
      owner: cleanRiskOwner,
      action: diagnostics
        ? [
            pipelineSchemaAction(diagnostics.schemaChecks.priceTable, "daily_prices"),
            pipelineSchemaAction(diagnostics.schemaChecks.fxTable, "daily_fx"),
          ].join("；")
        : "讀取 BigQuery 診斷後確認 schema",
    },
    {
      label: "價格更新",
      status: qualityToExecutionStatus(priceFreshnessStatus),
      value: diagnostics?.priceSummary.latest_date ?? "--",
      target: "3 天內通過，10 天以上暫停",
      owner: cleanRiskOwner,
      action: priceFreshnessStatus === "risk" ? "重新跑 daily_prices 更新流程" : priceFreshnessStatus === "watch" ? "確認今日批次是否完成" : "價格資料可支援分析",
    },
    {
      label: "匯率更新",
      status: qualityToExecutionStatus(fxFreshnessStatus),
      value: diagnostics?.fxSummary.latest_date ?? "--",
      target: "3 天內通過，10 天以上暫停",
      owner: cleanRiskOwner,
      action: fxFreshnessStatus === "risk" ? "重新跑 daily_fx 更新流程" : fxFreshnessStatus === "watch" ? "確認匯率批次是否完成" : "匯率資料可支援換算",
    },
    {
      label: "商品覆蓋",
      status: qualityToExecutionStatus(symbolCoverageStatus),
      value: `${formatCount(diagnostics?.priceSummary.symbol_count)} 檔`,
      target: "50 檔以上通過，10 檔以下暫停",
      owner: cleanRiskOwner,
      action: symbolCoverageStatus === "risk" ? "補齊商品清單或檢查匯入程式" : "覆蓋率可用，持續追蹤新增商品",
    },
    {
      label: "價格深度",
      status: qualityToExecutionStatus(priceDepthStatus),
      value: `${formatCount(diagnostics?.priceSummary.row_count)} 筆`,
      target: "50,000 筆以上通過，5,000 筆以下暫停",
      owner: cleanRiskOwner,
      action: priceDepthStatus === "risk" ? "重新跑歷史價格 backfill" : "歷史深度可支援目前分析",
    },
    {
      label: "落後商品",
      status: diagnostics ? qualityToExecutionStatus(staleSymbolStatus) : "watch",
      value: `${staleSymbols.length} 檔`,
      target: "應為 0；5 檔以上暫停",
      owner: cleanRiskOwner,
      action: staleSymbols.length ? "優先補跑落後商品，再確認最新交易日" : "未偵測到落後商品",
    },
    {
      label: "匯率幣別",
      status: diagnostics ? qualityToExecutionStatus(fxCurrencyStatus) : "watch",
      value: `${fxCurrencies.length} 組`,
      target: "至少 2 組主要幣別",
      owner: cleanRiskOwner,
      action: fxCurrencies.length ? "確認主要交易幣別已覆蓋" : "補齊 daily_fx 幣別資料",
    },
  ];
}

export function buildDataPipelineTableSnapshots({
  diagnostics,
  priceFreshnessDays,
  fxFreshnessDays,
  priceStatus,
  fxStatus,
  riskOwner,
}: {
  diagnostics?: BigQueryMarketDiagnostics;
  priceFreshnessDays: number | null;
  fxFreshnessDays: number | null;
  priceStatus: DataWarehouseStatus;
  fxStatus: DataWarehouseStatus;
  riskOwner: string;
}): DataPipelineTableSnapshot[] {
  const cleanRiskOwner = riskOwner.trim() || "風控";

  if (!diagnostics) {
    return [
      {
        table: "daily_prices",
        status: "watch",
        latestDate: "--",
        rowCount: "--",
        coverage: "--",
        freshness: "--",
        owner: cleanRiskOwner,
        action: "等待 BigQuery 診斷資料",
      },
      {
        table: "daily_fx",
        status: "watch",
        latestDate: "--",
        rowCount: "--",
        coverage: "--",
        freshness: "--",
        owner: cleanRiskOwner,
        action: "等待 BigQuery 診斷資料",
      },
    ];
  }

  return [
    {
      table: "daily_prices",
      status: priceStatus,
      latestDate: diagnostics.priceSummary.latest_date ?? "--",
      rowCount: `${formatCount(diagnostics.priceSummary.row_count)} 筆`,
      coverage: `${formatCount(diagnostics.priceSummary.symbol_count)} 檔`,
      freshness: priceFreshnessDays === null ? "--" : `${priceFreshnessDays} 天`,
      owner: cleanRiskOwner,
      action: priceStatus === "block" ? "暫停正式分析，先補價格資料" : priceStatus === "watch" ? "確認當日批次與落後商品" : "可支援目前分析",
    },
    {
      table: "daily_fx",
      status: fxStatus,
      latestDate: diagnostics.fxSummary.latest_date ?? "--",
      rowCount: `${formatCount(diagnostics.fxSummary.row_count)} 筆`,
      coverage: `${formatCount(diagnostics.fxSummary.currency_count)} 組`,
      freshness: fxFreshnessDays === null ? "--" : `${fxFreshnessDays} 天`,
      owner: cleanRiskOwner,
      action: fxStatus === "block" ? "暫停跨幣別換算，先補匯率資料" : fxStatus === "watch" ? "確認匯率批次是否完成" : "可支援目前換算",
    },
  ];
}

export function dataPipelineCsv({
  healthItems,
  tableSnapshots,
  staleSymbols,
  fxCurrencies,
}: {
  healthItems: DataPipelineHealthItem[];
  tableSnapshots: DataPipelineTableSnapshot[];
  staleSymbols: BigQueryStaleSymbol[];
  fxCurrencies: BigQueryFxCurrency[];
}) {
  const header = ["section", "name", "status", "value", "target", "owner", "action"];
  const healthRows = healthItems.map((item) => [
    "health",
    item.label,
    executionReviewLabel(item.status),
    item.value,
    item.target,
    item.owner,
    item.action,
  ]);
  const snapshotRows = tableSnapshots.map((item) => [
    "table",
    item.table,
    executionReviewLabel(item.status),
    `${item.latestDate} / ${item.rowCount} / ${item.coverage}`,
    item.freshness,
    item.owner,
    item.action,
  ]);
  const staleRows = staleSymbols.map((symbol) => {
    const staleDays = symbol.stale_days ?? daysSinceDate(symbol.latest_date);
    return [
      "stale_symbol",
      symbol.symbol,
      executionReviewLabel(staleSymbolExecutionStatus(staleDays)),
      symbol.latest_date ?? "--",
      staleDays === null ? "--" : `${staleDays} days`,
      "",
      `${formatCount(symbol.row_count)} rows`,
    ];
  });
  const fxRows = fxCurrencies.map((currency) => [
    "fx_currency",
    currency.currency,
    qualityLabel(freshnessStatus(daysSinceDate(currency.latest_date))),
    currency.latest_date ?? "--",
    `${formatCount(currency.row_count)} rows`,
    "",
    "",
  ]);

  return [header, ...healthRows, ...snapshotRows, ...staleRows, ...fxRows]
    .map((row) => row.map(csvCell).join(","))
    .join("\n");
}

export function bigQueryDiagnosticsCsv({
  diagnostics,
  qualityCards,
  issueCards,
  staleSymbols,
  fxCurrencies,
}: {
  diagnostics: BigQueryMarketDiagnostics;
  qualityCards: DataQualitySummaryCard[];
  issueCards: DataQualitySummaryCard[];
  staleSymbols: BigQueryStaleSymbol[];
  fxCurrencies: BigQueryFxCurrency[];
}) {
  const rows = [
    ["section", "name", "value", "status", "note"],
    ...qualityCards.map((card) => ["quality", card.label, card.value, card.status, card.note]),
    ["summary", "price_first_date", diagnostics.priceSummary.first_date ?? "", "", ""],
    ["summary", "price_latest_date", diagnostics.priceSummary.latest_date ?? "", "", ""],
    ["summary", "price_row_count", diagnostics.priceSummary.row_count ?? "", "", ""],
    ["summary", "price_symbol_count", diagnostics.priceSummary.symbol_count ?? "", "", ""],
    ["summary", "adjusted_price_rows", diagnostics.priceSummary.adjusted_price_rows ?? "", "", ""],
    ["summary", "raw_price_rows", diagnostics.priceSummary.raw_price_rows ?? "", "", ""],
    ["summary", "fx_first_date", diagnostics.fxSummary.first_date ?? "", "", ""],
    ["summary", "fx_latest_date", diagnostics.fxSummary.latest_date ?? "", "", ""],
    ["summary", "fx_row_count", diagnostics.fxSummary.row_count ?? "", "", ""],
    ["summary", "fx_currency_count", diagnostics.fxSummary.currency_count ?? "", "", ""],
    ...issueCards.map((card) => ["issue", card.label, card.value, card.status, card.note]),
    ...diagnostics.recentSymbols.map((symbol) => [
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

  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
}

function buildDataContractItem({
  check,
  layer,
  freshness,
  volume,
  freshnessStatusValue,
  owner,
}: {
  check: BigQuerySchemaCheck;
  layer: string;
  freshness: string;
  volume: string;
  freshnessStatusValue: DataWarehouseQualityStatus;
  owner: string;
}): DataContractItem {
  const schemaStatusValue: DataWarehouseStatus = check.isReady ? "pass" : "block";
  const status = combinedExecutionStatus([schemaStatusValue, qualityToExecutionStatus(freshnessStatusValue)]);

  return {
    table: check.tableName,
    layer,
    status,
    requiredColumns: check.requiredColumns,
    presentColumns: check.presentColumns,
    missingColumns: check.missingColumns,
    freshness,
    volume,
    owner,
    action: check.isReady
      ? status === "pass"
        ? "欄位合約與更新狀態可用"
        : "欄位合約可用，但需確認更新批次"
      : `補齊欄位：${check.missingColumns.join(", ") || "--"}`,
  };
}

export function buildDataContractItems({
  diagnostics,
  priceFreshnessDays,
  fxFreshnessDays,
  priceFreshnessStatus,
  fxFreshnessStatus,
  riskOwner,
}: {
  diagnostics?: BigQueryMarketDiagnostics;
  priceFreshnessDays: number | null;
  fxFreshnessDays: number | null;
  priceFreshnessStatus: DataWarehouseQualityStatus;
  fxFreshnessStatus: DataWarehouseQualityStatus;
  riskOwner: string;
}): DataContractItem[] {
  const cleanRiskOwner = riskOwner.trim() || "風控";
  if (!diagnostics) return [];

  return [
    buildDataContractItem({
      check: diagnostics.schemaChecks.priceTable,
      layer: "價格事實表",
      freshness: priceFreshnessDays === null ? "--" : `${priceFreshnessDays} 天`,
      volume: `${formatCount(diagnostics.priceSummary.row_count)} rows / ${formatCount(diagnostics.priceSummary.symbol_count)} symbols`,
      freshnessStatusValue: priceFreshnessStatus,
      owner: cleanRiskOwner,
    }),
    buildDataContractItem({
      check: diagnostics.schemaChecks.fxTable,
      layer: "匯率事實表",
      freshness: fxFreshnessDays === null ? "--" : `${fxFreshnessDays} 天`,
      volume: `${formatCount(diagnostics.fxSummary.row_count)} rows / ${formatCount(diagnostics.fxSummary.currency_count)} currencies`,
      freshnessStatusValue: fxFreshnessStatus,
      owner: cleanRiskOwner,
    }),
  ];
}

export function dataContractCsv(rows: DataContractItem[]) {
  const header = ["table", "layer", "status", "required_columns", "present_columns", "missing_columns", "freshness", "volume", "owner", "action"];
  const csvRows = rows.map((row) => [
    row.table,
    row.layer,
    executionReviewLabel(row.status),
    row.requiredColumns.join("|"),
    row.presentColumns.join("|"),
    row.missingColumns.join("|"),
    row.freshness,
    row.volume,
    row.owner,
    row.action,
  ]);

  return [header, ...csvRows].map((row) => row.map(csvCell).join(",")).join("\n");
}

export function buildCoverageUniverseItems({
  diagnostics,
  staleSymbols,
  fxCurrencies,
  symbolCoverageStatus,
  priceDepthStatus,
  fxCurrencyStatus,
  riskOwner,
}: {
  diagnostics?: BigQueryMarketDiagnostics;
  staleSymbols: BigQueryStaleSymbol[];
  fxCurrencies: BigQueryFxCurrency[];
  symbolCoverageStatus: DataWarehouseQualityStatus;
  priceDepthStatus: DataWarehouseQualityStatus;
  fxCurrencyStatus: DataWarehouseQualityStatus;
  riskOwner: string;
}): CoverageUniverseItem[] {
  const cleanRiskOwner = riskOwner.trim() || "風控";
  if (!diagnostics) return [];

  const staleStatus: DataWarehouseStatus = staleSymbols.length >= 5 ? "block" : staleSymbols.length > 0 ? "watch" : "pass";
  const staleCoverage = staleSymbols.length
    ? staleSymbols
        .slice(0, 5)
        .map((symbol) => `${symbol.symbol}:${symbol.stale_days ?? daysSinceDate(symbol.latest_date) ?? "--"}d`)
        .join(", ")
    : "未偵測到落後商品";
  const fxCoverage = fxCurrencies.length
    ? fxCurrencies
        .slice(0, 8)
        .map((currency) => currency.currency)
        .join(", ")
    : "--";

  return [
    {
      label: "可分析商品宇宙",
      status: qualityToExecutionStatus(symbolCoverageStatus),
      count: `${formatCount(diagnostics.priceSummary.symbol_count)} 檔`,
      target: "50 檔以上進入研究池",
      coverage: `${formatCount(diagnostics.recentSymbols.length)} 檔近期樣本`,
      owner: cleanRiskOwner,
      action:
        symbolCoverageStatus === "risk"
          ? "先補商品清單與價格匯入，避免研究池過窄"
          : symbolCoverageStatus === "watch"
            ? "擴充 ETF / 股票 / 債券商品清單"
            : "可支援第一版研究宇宙",
    },
    {
      label: "歷史價格深度",
      status: qualityToExecutionStatus(priceDepthStatus),
      count: `${formatCount(diagnostics.priceSummary.row_count)} 筆`,
      target: "50,000 筆以上支援回測",
      coverage: `${diagnostics.priceSummary.first_date ?? "--"} ~ ${diagnostics.priceSummary.latest_date ?? "--"}`,
      owner: cleanRiskOwner,
      action: priceDepthStatus === "risk" ? "重新跑歷史價格 backfill" : "歷史深度可支援目前分析",
    },
    {
      label: "落後商品清理",
      status: staleStatus,
      count: `${staleSymbols.length} 檔`,
      target: "落後商品 0 檔",
      coverage: staleCoverage,
      owner: cleanRiskOwner,
      action: staleSymbols.length ? "優先補跑落後商品，避免模型拿到過期價格" : "維持每日批次監控",
    },
    {
      label: "跨幣別覆蓋",
      status: qualityToExecutionStatus(fxCurrencyStatus),
      count: `${fxCurrencies.length} 組`,
      target: "至少 2 組主要幣別",
      coverage: fxCoverage,
      owner: cleanRiskOwner,
      action: fxCurrencyStatus === "risk" ? "補齊 daily_fx 幣別與歷史資料" : "可支援基本跨幣別換算",
    },
  ];
}

export function coverageUniverseCsv(rows: CoverageUniverseItem[]) {
  const header = ["label", "status", "count", "target", "coverage", "owner", "action"];
  const csvRows = rows.map((row) => [
    row.label,
    executionReviewLabel(row.status),
    row.count,
    row.target,
    row.coverage,
    row.owner,
    row.action,
  ]);

  return [header, ...csvRows].map((row) => row.map(csvCell).join(",")).join("\n");
}
