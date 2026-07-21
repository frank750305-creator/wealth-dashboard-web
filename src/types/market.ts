export type MarketSourceStatus = "ready" | "needs_secret" | "batch_only" | "local_only";

export type MarketSource = {
  id: string;
  name: string;
  provider: string;
  category: string;
  status: MarketSourceStatus;
  currentStorage: string;
  integrationPath: string;
  nextAction: string;
};

export type MarketSourcesResponse = {
  generatedAt: string;
  sources: MarketSource[];
  securityNotes: string[];
};

export type BigQueryMarketStatus = {
  generatedAt: string;
  projectId: string;
  dataset: string;
  priceTable: string;
  fxTable: string;
  credentialSource: string;
  hasServiceAccountEnv: boolean;
  hasGoogleApplicationCredentials: boolean;
  requiredEnvVars: string[];
};

export type BigQueryDiagnosticsSummary = {
  row_count?: number;
  symbol_count?: number;
  currency_count?: number;
  first_date?: string | null;
  latest_date?: string | null;
  adjusted_price_rows?: number;
  raw_price_rows?: number;
};

export type BigQueryRecentSymbol = {
  symbol: string;
  latest_date: string | null;
  row_count: number;
};

export type BigQueryStaleSymbol = BigQueryRecentSymbol & {
  stale_days: number | null;
  adjusted_price_rows?: number;
  raw_price_rows?: number;
};

export type BigQueryFxCurrency = {
  currency: string;
  first_date: string | null;
  latest_date: string | null;
  row_count: number;
};

export type BigQuerySchemaCheck = {
  tableName: string;
  requiredColumns: string[];
  presentColumns: string[];
  missingColumns: string[];
  isReady: boolean;
};

export type BigQueryQualityStatus = "strong" | "watch" | "risk" | "neutral";

export type BigQueryQualityScorecardDimension = {
  id: string;
  label: string;
  score: number;
  status: BigQueryQualityStatus;
  weight: number;
  evidence: string;
  action: string;
};

export type BigQueryQualityScorecard = {
  overallScore: number;
  status: BigQueryQualityStatus;
  level: "production_ready" | "watchlist" | "blocked" | string;
  summary: string;
  dimensions: BigQueryQualityScorecardDimension[];
  blockers: string[];
  nextActions: string[];
};

export type BigQueryMarketDiagnostics = {
  generatedAt: string;
  status: Omit<BigQueryMarketStatus, "generatedAt">;
  schemaChecks: {
    priceTable: BigQuerySchemaCheck;
    fxTable: BigQuerySchemaCheck;
  };
  priceSummary: BigQueryDiagnosticsSummary;
  fxSummary: BigQueryDiagnosticsSummary;
  recentSymbols: BigQueryRecentSymbol[];
  staleSymbols?: BigQueryStaleSymbol[];
  fxCurrencies?: BigQueryFxCurrency[];
  qualityScorecard?: BigQueryQualityScorecard;
};

export type BigQueryAsset = {
  symbol: string;
  first_date: string | null;
  latest_date: string | null;
  row_count: number;
  adjusted_price_rows: number;
  raw_price_rows: number;
};

export type BigQueryAssetSearchResponse = {
  generatedAt: string;
  status: Omit<BigQueryMarketStatus, "generatedAt">;
  query: string;
  limit: number;
  assets: BigQueryAsset[];
};

export type BigQueryAssetProfileSummary = {
  first_date: string | null;
  latest_date: string | null;
  row_count: number;
  selected_price_rows: number;
  missing_selected_price_rows: number;
  adjusted_price_rows: number;
  raw_price_rows: number;
};

export type BigQueryAssetProfileMetrics = {
  firstPrice: number | null;
  latestPrice: number | null;
  minPrice: number | null;
  maxPrice: number | null;
  totalReturn: number | null;
  annualizedReturn: number | null;
  annualizedVolatility: number | null;
  maxDrawdown: number | null;
  positiveDayRatio: number | null;
  bestDay: number | null;
  worstDay: number | null;
  latestDailyReturn: number | null;
};

export type BigQueryAssetPricePoint = {
  date: string | null;
  raw_price: number | null;
  adj_price: number | null;
  selected_price: number | null;
  daily_return: number | null;
};

export type BigQueryAssetProfileResponse = {
  generatedAt: string;
  status: Omit<BigQueryMarketStatus, "generatedAt">;
  symbol: string;
  priceBasis: "adjusted" | "raw";
  summary: BigQueryAssetProfileSummary;
  metrics: BigQueryAssetProfileMetrics;
  recentPrices: BigQueryAssetPricePoint[];
};

export type BigQueryAssetHistorySummary = {
  requested_start_date: string | null;
  requested_end_date: string | null;
  first_date: string | null;
  latest_date: string | null;
  row_count: number;
  selected_price_rows: number;
  missing_selected_price_rows: number;
  max_gap_days: number | null;
  limit: number;
};

export type BigQueryAssetHistoryMetrics = {
  firstPrice: number | null;
  latestPrice: number | null;
  totalReturn: number | null;
  annualizedReturn: number | null;
  annualizedVolatility: number | null;
  maxDrawdown: number | null;
  bestDay: number | null;
  worstDay: number | null;
};

export type BigQueryAssetHistoryQualityCheck = {
  id: string;
  label: string;
  score: number;
  status: BigQueryQualityStatus;
  evidence: string;
  action: string;
};

export type BigQueryAssetHistoryQuality = {
  score: number;
  status: BigQueryQualityStatus;
  checks: BigQueryAssetHistoryQualityCheck[];
  warnings: string[];
  nextActions: string[];
};

export type BigQueryAssetHistoryResponse = {
  generatedAt: string;
  status: Omit<BigQueryMarketStatus, "generatedAt">;
  symbol: string;
  priceBasis: "adjusted" | "raw";
  summary: BigQueryAssetHistorySummary;
  metrics: BigQueryAssetHistoryMetrics;
  quality: BigQueryAssetHistoryQuality;
  prices: BigQueryAssetPricePoint[];
};

export type PortfolioAnalyzeBigQueryPayload = {
  weights_by_symbol: Record<string, number>;
  benchmark_symbol?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  price_basis: "adjusted" | "raw";
  pricing_currency: "original" | "TWD";
  currency_by_symbol?: Record<string, string>;
  mode: "overlap" | "long_rebuild";
  confidence_level?: number;
  risk_free_rate?: number;
};

export type PortfolioOptimizeBigQueryPayload = {
  symbols: string[];
  benchmark_symbol?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  price_basis: "adjusted" | "raw";
  pricing_currency: "original" | "TWD";
  currency_by_symbol?: Record<string, string>;
  mode: "overlap" | "long_rebuild";
  optimization_mode: "max_sharpe" | "min_vol" | "max_return" | "target_vol";
  target_volatility?: number | null;
  confidence_level?: number;
  risk_free_rate?: number;
};

export type PortfolioMetricSet = {
  cumulativeReturn: number | null;
  cagr: number | null;
  annualReturn: number | null;
  annualVolatility: number | null;
  confidenceLowerBound: number | null;
  sharpe: number | null;
  sortino: number | null;
  maxDrawdown: number | null;
  downsideDeviation: number | null;
  beta: number | null;
  rSquared: number | null;
  treynor: number | null;
  informationRatio: number | null;
  alpha: number | null;
  appraisalRatio: number | null;
  skewness: number | null;
  kurtosis: number | null;
};

export type PortfolioAnalysisWeight = {
  symbol: string;
  weight: number;
};

export type PortfolioAssetStatistic = {
  symbol: string;
  annualReturn: number | null;
  annualVolatility: number | null;
};

export type PortfolioWealthPoint = {
  date: string | null;
  value: number | null;
  dailyReturn: number | null;
};

export type PortfolioCorrelationMatrix = {
  symbols: string[];
  values: Array<Array<number | null>>;
};

export type PortfolioRiskContribution = {
  symbol: string;
  weight: number | null;
  marginalRisk: number | null;
  riskContribution: number | null;
  riskContributionPercent: number | null;
};

export type PortfolioFrontierPoint = {
  annualReturn: number | null;
  annualVolatility: number | null;
  sharpe: number | null;
};

export type PortfolioEfficientFrontier = {
  points: PortfolioFrontierPoint[];
  frontier: PortfolioFrontierPoint[];
  selectedPoint: PortfolioFrontierPoint;
};

export type PortfolioAnalysisDataWindow = {
  startDate: string | null;
  endDate: string | null;
  observations: number;
};

export type PortfolioAnalysisResponse = {
  generatedAt: string;
  mode: "overlap" | "long_rebuild";
  symbols: string[];
  weights: PortfolioAnalysisWeight[];
  metrics: PortfolioMetricSet;
  assetStatistics: PortfolioAssetStatistic[];
  riskContributions?: PortfolioRiskContribution[];
  correlationMatrix: PortfolioCorrelationMatrix;
  wealthPath: PortfolioWealthPoint[];
  dataWindow: PortfolioAnalysisDataWindow;
  marketData?: {
    source: string;
    symbols: string[];
    benchmarkSymbol: string | null;
    priceBasis: string;
    pricingCurrency: string;
    startDate: string | null;
    endDate: string | null;
    observations: number;
  };
};

export type PortfolioOptimizationResponse = {
  generatedAt: string;
  optimizationMode: "max_sharpe" | "min_vol" | "max_return" | "target_vol";
  targetVolatility: number | null;
  weights: PortfolioAnalysisWeight[];
  metrics: PortfolioMetricSet;
  assetStatistics: PortfolioAssetStatistic[];
  riskContributions?: PortfolioRiskContribution[];
  correlationMatrix: PortfolioCorrelationMatrix;
  efficientFrontier?: PortfolioEfficientFrontier;
  wealthPath: PortfolioWealthPoint[];
  dataWindow: PortfolioAnalysisDataWindow;
  marketData?: PortfolioAnalysisResponse["marketData"];
};

export type ResearchTaskWarehouseStatus = {
  generatedAt: string;
  projectId: string;
  dataset: string;
  taskTable: string;
  hasServiceAccountEnv: boolean;
  hasGoogleApplicationCredentials: boolean;
  requiredEnvVars: string[];
};

export type ResearchTaskWarehouseSyncRecord = {
  workspace_id: string;
  actor_id: string;
  task_id: string;
  idempotency_key: string;
  generated_at: string;
  updated_at: string;
  lane: string;
  title: string | null;
  status: string;
  priority: string;
  owner: string | null;
  symbol: string | null;
  source: string | null;
  evidence: string | null;
  next_action: string | null;
  manual_note: string | null;
  is_manual_override: boolean;
  lifecycle_gate_status: string;
  lifecycle_decision: string | null;
  active_stage: string | null;
  blocker_count: number;
  ready_count: number;
};

export type ResearchTaskWarehouseSyncPayload = {
  table: string;
  workspace_id: string;
  actor_id: string;
  generated_at: string;
  record_count: number;
  records: ResearchTaskWarehouseSyncRecord[];
  lifecycle?: unknown;
};

export type ResearchTaskWarehouseSyncResponse = {
  generatedAt: string;
  status: "synced" | "partial_error" | string;
  table: string;
  receivedCount: number;
  insertedCount: number;
  errors: unknown[];
};

export type ResearchTaskWarehouseLatestResponse = {
  generatedAt: string;
  status: "loaded" | "missing" | "schema_outdated" | string;
  table: string;
  workspaceId: string;
  limit: number;
  recordCount: number;
  missingFields?: string[];
  records: ResearchTaskWarehouseSyncRecord[];
};

export type ResearchTaskWarehouseAuditRecord = {
  workspace_id: string;
  actor_id: string | null;
  generated_at: string;
  latest_updated_at: string | null;
  task_count: number;
  manual_override_count: number;
  blocker_count: number;
  ready_count: number;
};

export type ResearchTaskWarehouseAuditResponse = {
  generatedAt: string;
  status: "loaded" | "missing" | "schema_outdated" | string;
  table: string;
  workspaceId: string;
  limit: number;
  auditCount: number;
  missingFields?: string[];
  auditRecords: ResearchTaskWarehouseAuditRecord[];
};
