import {
  BigQueryPortfolioSignalCardGrid,
  type BigQueryPortfolioSignalCard,
} from "./BigQueryPortfolioSignalCardGrid";

type BigQueryPortfolioDecisionSectionsProps = {
  policySignals: BigQueryPortfolioSignalCard[];
  decisionSignals: BigQueryPortfolioSignalCard[];
  requiredReturn: number;
  maxLossTolerance: number;
  confidenceLevel: number;
};

export function BigQueryPortfolioDecisionSections({
  policySignals,
  decisionSignals,
  requiredReturn,
  maxLossTolerance,
  confidenceLevel,
}: BigQueryPortfolioDecisionSectionsProps) {
  return (
    <>
      {policySignals.length ? (
        <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-slate-200">投資政策檢核</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Return {requiredReturn.toFixed(1)}% · Loss {maxLossTolerance.toFixed(1)}% · Confidence {(confidenceLevel * 100).toFixed(0)}%
              </p>
            </div>
          </div>
          <BigQueryPortfolioSignalCardGrid cards={policySignals} labelVariant="decision" variant="four" />
        </div>
      ) : null}

      {decisionSignals.length ? (
        <BigQueryPortfolioSignalCardGrid cards={decisionSignals} labelVariant="decision" variant="three" />
      ) : null}
    </>
  );
}
