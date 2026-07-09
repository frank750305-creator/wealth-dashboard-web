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
  dataWindow: PortfolioAnalysisDataWindow;
  marketData?: PortfolioAnalysisResponse["marketData"];
};
