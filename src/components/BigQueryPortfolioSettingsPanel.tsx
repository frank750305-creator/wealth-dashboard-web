type PriceBasis = "adjusted" | "raw";
type PricingCurrency = "original" | "TWD";
type AnalysisMode = "overlap" | "long_rebuild";
type OptimizationMode = "max_sharpe" | "min_vol" | "max_return" | "target_vol";

type BigQueryPortfolioSettingsPanelProps = {
  hasBigQueryCredentials: boolean;
  assetOptionListId: string;
  benchmarkSymbol: string;
  portfolioValue: number;
  transactionCostBps: number;
  minTradeAmount: number;
  requiredReturn: number;
  maxLossTolerance: number;
  confidenceLevel: number;
  riskFreeRate: number;
  startDate: string;
  endDate: string;
  priceBasis: PriceBasis;
  pricingCurrency: PricingCurrency;
  mode: AnalysisMode;
  optimizationMode: OptimizationMode;
  targetVolatility: number;
  onBenchmarkSymbolChange: (value: string) => void;
  onAssetQueryChange: (value: string) => void;
  onPortfolioValueChange: (value: number) => void;
  onTransactionCostBpsChange: (value: number) => void;
  onMinTradeAmountChange: (value: number) => void;
  onRequiredReturnChange: (value: string) => void;
  onMaxLossToleranceChange: (value: string) => void;
  onConfidenceLevelChange: (value: string) => void;
  onRiskFreeRateChange: (value: string) => void;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onPriceBasisChange: (value: PriceBasis) => void;
  onPricingCurrencyChange: (value: PricingCurrency) => void;
  onModeChange: (value: AnalysisMode) => void;
  onOptimizationModeChange: (value: OptimizationMode) => void;
  onTargetVolatilityChange: (value: number) => void;
};

export function BigQueryPortfolioSettingsPanel({
  hasBigQueryCredentials,
  assetOptionListId,
  benchmarkSymbol,
  portfolioValue,
  transactionCostBps,
  minTradeAmount,
  requiredReturn,
  maxLossTolerance,
  confidenceLevel,
  riskFreeRate,
  startDate,
  endDate,
  priceBasis,
  pricingCurrency,
  mode,
  optimizationMode,
  targetVolatility,
  onBenchmarkSymbolChange,
  onAssetQueryChange,
  onPortfolioValueChange,
  onTransactionCostBpsChange,
  onMinTradeAmountChange,
  onRequiredReturnChange,
  onMaxLossToleranceChange,
  onConfidenceLevelChange,
  onRiskFreeRateChange,
  onStartDateChange,
  onEndDateChange,
  onPriceBasisChange,
  onPricingCurrencyChange,
  onModeChange,
  onOptimizationModeChange,
  onTargetVolatilityChange,
}: BigQueryPortfolioSettingsPanelProps) {
  return (
    <div className="grid grid-cols-2 gap-3 text-xs">
      <label className="space-y-1 col-span-2">
        <span className="text-slate-500">Benchmark</span>
        <input
          value={benchmarkSymbol}
          list={hasBigQueryCredentials ? assetOptionListId : undefined}
          onChange={(event) => {
            onBenchmarkSymbolChange(event.target.value);
            onAssetQueryChange(event.target.value);
          }}
          className="w-full bg-slate-950 border border-slate-700 rounded-md px-2 py-2 text-slate-100"
        />
      </label>
      <label className="space-y-1 col-span-2">
        <span className="text-slate-500">投組總金額 TWD</span>
        <input
          type="number"
          min={0}
          step={10000}
          value={portfolioValue}
          onChange={(event) => onPortfolioValueChange(Number(event.target.value))}
          className="w-full bg-slate-950 border border-slate-700 rounded-md px-2 py-2 text-slate-100 font-mono"
        />
      </label>
      <label className="space-y-1 col-span-2">
        <span className="text-slate-500">交易成本 bps</span>
        <input
          type="number"
          min={0}
          step={1}
          value={transactionCostBps}
          onChange={(event) => onTransactionCostBpsChange(Number(event.target.value))}
          className="w-full bg-slate-950 border border-slate-700 rounded-md px-2 py-2 text-slate-100 font-mono"
        />
      </label>
      <label className="space-y-1 col-span-2">
        <span className="text-slate-500">最小交易金額 TWD</span>
        <input
          type="number"
          min={0}
          step={1000}
          value={minTradeAmount}
          onChange={(event) => onMinTradeAmountChange(Number(event.target.value))}
          className="w-full bg-slate-950 border border-slate-700 rounded-md px-2 py-2 text-slate-100 font-mono"
        />
      </label>
      <label className="space-y-1">
        <span className="text-slate-500">要求報酬 %</span>
        <input
          type="number"
          min={0}
          step={0.5}
          value={requiredReturn}
          onChange={(event) => onRequiredReturnChange(event.target.value)}
          className="w-full bg-slate-950 border border-slate-700 rounded-md px-2 py-2 text-slate-100 font-mono"
        />
      </label>
      <label className="space-y-1">
        <span className="text-slate-500">最大損失 %</span>
        <input
          type="number"
          min={0}
          step={1}
          value={maxLossTolerance}
          onChange={(event) => onMaxLossToleranceChange(event.target.value)}
          className="w-full bg-slate-950 border border-slate-700 rounded-md px-2 py-2 text-slate-100 font-mono"
        />
      </label>
      <label className="space-y-1">
        <span className="text-slate-500">信賴區間</span>
        <select
          value={confidenceLevel}
          onChange={(event) => onConfidenceLevelChange(event.target.value)}
          className="w-full bg-slate-950 border border-slate-700 rounded-md px-2 py-2 text-slate-100"
        >
          <option value={0.9}>90%</option>
          <option value={0.95}>95%</option>
          <option value={0.99}>99%</option>
        </select>
      </label>
      <label className="space-y-1">
        <span className="text-slate-500">無風險利率 %</span>
        <input
          type="number"
          min={0}
          step={0.25}
          value={riskFreeRate}
          onChange={(event) => onRiskFreeRateChange(event.target.value)}
          className="w-full bg-slate-950 border border-slate-700 rounded-md px-2 py-2 text-slate-100 font-mono"
        />
      </label>
      <label className="space-y-1">
        <span className="text-slate-500">起日</span>
        <input
          type="date"
          value={startDate}
          onChange={(event) => onStartDateChange(event.target.value)}
          className="w-full bg-slate-950 border border-slate-700 rounded-md px-2 py-2 text-slate-100"
        />
      </label>
      <label className="space-y-1">
        <span className="text-slate-500">迄日</span>
        <input
          type="date"
          value={endDate}
          onChange={(event) => onEndDateChange(event.target.value)}
          className="w-full bg-slate-950 border border-slate-700 rounded-md px-2 py-2 text-slate-100"
        />
      </label>
      <label className="space-y-1">
        <span className="text-slate-500">價格基準</span>
        <select
          value={priceBasis}
          onChange={(event) => onPriceBasisChange(event.target.value as PriceBasis)}
          className="w-full bg-slate-950 border border-slate-700 rounded-md px-2 py-2 text-slate-100"
        >
          <option value="adjusted">Adj</option>
          <option value="raw">Raw</option>
        </select>
      </label>
      <label className="space-y-1">
        <span className="text-slate-500">計價</span>
        <select
          value={pricingCurrency}
          onChange={(event) => onPricingCurrencyChange(event.target.value as PricingCurrency)}
          className="w-full bg-slate-950 border border-slate-700 rounded-md px-2 py-2 text-slate-100"
        >
          <option value="TWD">TWD</option>
          <option value="original">原幣</option>
        </select>
      </label>
      <label className="space-y-1 col-span-2">
        <span className="text-slate-500">模式</span>
        <select
          value={mode}
          onChange={(event) => onModeChange(event.target.value as AnalysisMode)}
          className="w-full bg-slate-950 border border-slate-700 rounded-md px-2 py-2 text-slate-100"
        >
          <option value="overlap">近期交集法</option>
          <option value="long_rebuild">長線重建法</option>
        </select>
      </label>
      <label className="space-y-1 col-span-2">
        <span className="text-slate-500">AI 策略</span>
        <select
          value={optimizationMode}
          onChange={(event) => onOptimizationModeChange(event.target.value as OptimizationMode)}
          className="w-full bg-slate-950 border border-slate-700 rounded-md px-2 py-2 text-slate-100"
        >
          <option value="max_sharpe">最大夏普</option>
          <option value="min_vol">最小風險</option>
          <option value="max_return">最大報酬</option>
          <option value="target_vol">指定波動率</option>
        </select>
      </label>
      {optimizationMode === "target_vol" && (
        <label className="space-y-1 col-span-2">
          <span className="text-slate-500">目標波動率 %</span>
          <input
            type="number"
            value={targetVolatility}
            onChange={(event) => onTargetVolatilityChange(Number(event.target.value))}
            className="w-full bg-slate-950 border border-slate-700 rounded-md px-2 py-2 text-slate-100 font-mono"
          />
        </label>
      )}
    </div>
  );
}
