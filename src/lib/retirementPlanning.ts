import type { PensionResult } from "@/lib/pension";
import type { FutureEventRecord } from "@/types/wealth";

type CalculateRetirementFundInput = {
  mainSalary: number;
  salaryGrowth: number;
  retireAge: number;
  currentAge: number;
  replacementRate: number;
  lifeExpectancy: number;
  inflationRate: number;
  roiAfterRetire: number;
  pension: PensionResult;
};

type BuildFutureExpensesListInput = {
  events: FutureEventRecord[];
  currentAge: number;
  retireAge: number;
  realRetireFundPv: number;
};

export function calculateRealRetirementFundPv({
  mainSalary,
  salaryGrowth,
  retireAge,
  currentAge,
  replacementRate,
  lifeExpectancy,
  inflationRate,
  roiAfterRetire,
  pension,
}: CalculateRetirementFundInput): number {
  const yearsToRetire = retireAge - currentAge;
  const projectedMonthlyNeed = mainSalary * Math.pow(1 + salaryGrowth / 100, yearsToRetire) * replacementRate / 100;
  const gapMonthly = Math.max(0, projectedMonthlyNeed - pension.annuity_m_amt_wan * 10000);
  const yrsInRetire = lifeExpectancy - retireAge + 1;
  let fundPv = 0;

  for (let year = 0; year < yrsInRetire; year += 1) {
    fundPv += (gapMonthly * 12 * Math.pow(1 + inflationRate / 100, year)) / Math.pow(1 + roiAfterRetire / 100, year);
  }

  let projectedBalance = pension.acct_bal_wan * 10000;
  for (let year = 0; year < Math.max(0, yearsToRetire); year += 1) {
    projectedBalance += (pension.acct_add_wan * 10000 * 12) * Math.pow(1 + salaryGrowth / 100, year);
    projectedBalance *= (1 + pension.acct_roi / 100);
  }

  return Math.max(0, fundPv - projectedBalance - pension.lump_sum_wan * 10000);
}

export function buildFutureExpensesList({
  events,
  currentAge,
  retireAge,
  realRetireFundPv,
}: BuildFutureExpensesListInput): FutureEventRecord[] {
  const futureExpenses = events.filter((event) => event.amount < 0 && event.age > currentAge);
  const retireFundEvent: FutureEventRecord | null = retireAge > currentAge
    ? {
        id: "retire_fund",
        label: "🏖️ 真實退休準備金",
        age: retireAge,
        amount: -realRetireFundPv,
        target: "退休金",
        duration: 1,
        new_asset: null,
      }
    : null;

  return [
    ...futureExpenses,
    ...(retireFundEvent ? [retireFundEvent] : []),
  ].sort((a, b) => a.age - b.age);
}
