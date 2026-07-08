type MortgagePaymentInput = {
  priceWan: number;
  downPaymentPct: number;
  annualRatePct: number;
  years: number;
  graceYears: number;
  method: string;
};

type HousingBuyingPowerInput = {
  monthlyNetFlow: number;
  annualRatePct: number;
  years: number;
  graceYears: number;
  downPaymentPct: number;
};

export type HousingBuyingPowerResult =
  | { status: "no_cashflow" }
  | { status: "invalid_term" }
  | {
      status: "ok";
      maxLoanWan: number;
      suggestedPriceWan: number;
    };

export function calculateMortgageLoanWan(priceWan: number, downPaymentPct: number): number {
  return priceWan * (1 - downPaymentPct / 100);
}

export function calculateMortgageMonthlyPayment({
  priceWan,
  downPaymentPct,
  annualRatePct,
  years,
  graceYears,
  method,
}: MortgagePaymentInput): number {
  const loanAmountWan = calculateMortgageLoanWan(priceWan, downPaymentPct);
  const principal = loanAmountWan * 10000;
  const monthlyRate = annualRatePct / 100 / 12;
  const amortizationMonths = (years - graceYears) * 12;

  if (amortizationMonths <= 0) {
    return Math.round(principal * monthlyRate || 0);
  }

  if (monthlyRate === 0) {
    return Math.round(principal / amortizationMonths || 0);
  }

  if (method === "本利平均") {
    const compound = Math.pow(1 + monthlyRate, amortizationMonths);
    return Math.round((principal * monthlyRate * compound) / (compound - 1) || 0);
  }

  return Math.round((principal / amortizationMonths + principal * monthlyRate) || 0);
}

export function calculateDebtMonthlyPayment(
  loanAmountWan: number,
  annualRatePct: number,
  years: number,
): number {
  const months = years * 12;
  const principal = loanAmountWan * 10000;
  const monthlyRate = annualRatePct / 100 / 12;

  if (months <= 0) {
    return 0;
  }

  if (monthlyRate === 0) {
    return Math.round(principal / months || 0);
  }

  return Math.round(
    (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -months)) || 0,
  );
}

export function calculateHousingBuyingPower({
  monthlyNetFlow,
  annualRatePct,
  years,
  graceYears,
  downPaymentPct,
}: HousingBuyingPowerInput): HousingBuyingPowerResult {
  if (monthlyNetFlow <= 0) {
    return { status: "no_cashflow" };
  }

  const monthlyRate = annualRatePct / 100 / 12;
  const amortizationMonths = (years - graceYears) * 12;
  if (amortizationMonths <= 0) {
    return { status: "invalid_term" };
  }

  const maxLoanYuan = monthlyRate > 0
    ? monthlyNetFlow * ((1 - Math.pow(1 + monthlyRate, -amortizationMonths)) / monthlyRate)
    : monthlyNetFlow * amortizationMonths;
  const maxLoanWan = maxLoanYuan / 10000;

  return {
    status: "ok",
    maxLoanWan,
    suggestedPriceWan: downPaymentPct < 100 ? maxLoanWan / (1 - downPaymentPct / 100) : maxLoanWan,
  };
}
