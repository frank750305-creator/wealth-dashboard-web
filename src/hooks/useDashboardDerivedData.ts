import { useMemo } from "react";
import type { BuildSimulationPayloadInput } from "@/lib/buildSimulationPayload";
import { buildFutureExpensesList, calculateRealRetirementFundPv } from "@/lib/retirementPlanning";
import { useWealthSimulation } from "@/hooks/useWealthSimulation";

type TimelinePayload = Pick<
  BuildSimulationPayloadInput,
  | "currentAge"
  | "lifeExpectancy"
  | "retireAge"
  | "salaryGrowth"
  | "inflationRate"
  | "replacementRate"
  | "roiAfterRetire"
>;

type UseDashboardDerivedDataInput = {
  timelinePayload: TimelinePayload;
  selectedReportAge: number;
  assets: BuildSimulationPayloadInput["assets"];
  insurances: BuildSimulationPayloadInput["insurances"];
  mortgages: BuildSimulationPayloadInput["mortgages"];
  debts: BuildSimulationPayloadInput["debts"];
  extraIncomes: BuildSimulationPayloadInput["extraIncomes"];
  events: BuildSimulationPayloadInput["events"];
  pensionInfo: BuildSimulationPayloadInput["pension"];
  taxParams: BuildSimulationPayloadInput["taxParams"];
  mainSalary: number;
  baseExp: number;
  mRent: number;
  mInsurance: number;
  familyPayload: BuildSimulationPayloadInput["family"];
};

export function useDashboardDerivedData({
  timelinePayload,
  selectedReportAge,
  assets,
  insurances,
  mortgages,
  debts,
  extraIncomes,
  events,
  pensionInfo,
  taxParams,
  mainSalary,
  baseExp,
  mRent,
  mInsurance,
  familyPayload,
}: UseDashboardDerivedDataInput) {
  const {
    currentAge,
    lifeExpectancy,
    retireAge,
    salaryGrowth,
    inflationRate,
    replacementRate,
    roiAfterRetire,
  } = timelinePayload;

  const simulationInput = useMemo<BuildSimulationPayloadInput>(() => ({
    currentAge,
    lifeExpectancy,
    retireAge,
    salaryGrowth,
    inflationRate,
    replacementRate,
    roiAfterRetire,
    assets,
    insurances,
    mortgages,
    debts,
    extraIncomes,
    events,
    pension: pensionInfo,
    taxParams,
    mainSalary,
    baseExp,
    mRent,
    mInsurance,
    family: familyPayload,
  }), [
    assets,
    insurances,
    mortgages,
    debts,
    extraIncomes,
    events,
    pensionInfo,
    taxParams,
    mainSalary,
    baseExp,
    mRent,
    mInsurance,
    familyPayload,
    currentAge,
    lifeExpectancy,
    retireAge,
    salaryGrowth,
    inflationRate,
    replacementRate,
    roiAfterRetire,
  ]);

  const {
    isLoading,
    simulationResult,
    serverTax,
    serverLoan,
    snapReport,
    handleSimulate,
  } = useWealthSimulation(simulationInput, selectedReportAge);

  const totalMonthlyIncome = useMemo(
    () => mainSalary + extraIncomes.reduce((acc, income) => acc + income.monthly_amt, 0),
    [extraIncomes, mainSalary],
  );

  const insurancePremiumMonthly = useMemo(
    () => insurances.reduce((acc, insurance) => acc + ((insurance.premium * 10000) / 12), 0),
    [insurances],
  );

  const monthlyNetFlow = useMemo(
    () => totalMonthlyIncome - (baseExp + serverTax / 12 + serverLoan / 12 + insurancePremiumMonthly),
    [baseExp, insurancePremiumMonthly, serverLoan, serverTax, totalMonthlyIncome],
  );

  const realRetireFundPv = useMemo(() => calculateRealRetirementFundPv({
    mainSalary,
    salaryGrowth,
    retireAge,
    currentAge,
    replacementRate,
    lifeExpectancy,
    inflationRate,
    roiAfterRetire,
    pension: pensionInfo,
  }), [
    currentAge,
    inflationRate,
    lifeExpectancy,
    mainSalary,
    pensionInfo,
    replacementRate,
    retireAge,
    roiAfterRetire,
    salaryGrowth,
  ]);

  const futureExpensesList = useMemo(() => buildFutureExpensesList({
    events,
    currentAge,
    retireAge,
    realRetireFundPv,
  }), [currentAge, events, realRetireFundPv, retireAge]);

  return useMemo(() => ({
    isLoading,
    simulationResult,
    serverTax,
    serverLoan,
    snapReport,
    handleSimulate,
    monthlyNetFlow,
    realRetireFundPv,
    futureExpensesList,
  }), [
    futureExpensesList,
    handleSimulate,
    isLoading,
    monthlyNetFlow,
    realRetireFundPv,
    serverLoan,
    serverTax,
    simulationResult,
    snapReport,
  ]);
}
