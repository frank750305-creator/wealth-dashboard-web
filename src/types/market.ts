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

export type PortfolioAnalyzeBigQueryPayload = {
  weights_by_symbol: Record<string, number>;
  benchmark_symbol?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  price_basis: "adjusted" | "raw";
  pricing_currency: "original" | "TWD";
  currency_by_symbol?: Record<string, string>;
  mode: "overlap" | "long_rebuild";
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
