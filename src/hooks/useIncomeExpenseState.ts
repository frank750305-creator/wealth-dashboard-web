import { useCallback, useMemo, useState } from "react";
import { buildExtraIncome } from "@/lib/recordBuilders";
import type { ExtraIncomeRecord } from "@/types/wealth";

export function useIncomeExpenseState() {
  const [mainSalary, setMainSalary] = useState(50000);
  const [extraIncomes, setExtraIncomes] = useState<ExtraIncomeRecord[]>([]);
  const [tmpIncName, setTmpIncName] = useState("兼職/收租");
  const [tmpIncType, setTmpIncType] = useState("執行業務-一般(9A, 扣30%成本)");
  const [tmpIncAmt, setTmpIncAmt] = useState(0);

  const [mLiving, setMLiving] = useState(0);
  const [mRent, setMRent] = useState(0);
  const [mInsurance, setMInsurance] = useState(0);
  const [mLaborHealth, setMLaborHealth] = useState(0);
  const [mParents, setMParents] = useState(0);
  const [mOther, setMOther] = useState(0);

  const baseExp = useMemo(
    () => mLiving + mRent + mInsurance + mLaborHealth + mParents + mOther,
    [mInsurance, mLaborHealth, mLiving, mOther, mParents, mRent],
  );

  const addExtraIncome = useCallback(() => {
    setExtraIncomes((prev) => [
      ...prev,
      buildExtraIncome({
        name: tmpIncName,
        type: tmpIncType,
        monthlyAmt: tmpIncAmt,
      }),
    ]);
  }, [tmpIncAmt, tmpIncName, tmpIncType]);

  const delInc = useCallback((id: string) => {
    setExtraIncomes((prev) => prev.filter((income) => income.id !== id));
  }, []);

  const incomeExpensePanelProps = useMemo(() => ({
    mainSalary,
    onMainSalaryChange: setMainSalary,
    extraIncomes,
    tmpIncName,
    onTmpIncNameChange: setTmpIncName,
    tmpIncType,
    onTmpIncTypeChange: setTmpIncType,
    tmpIncAmt,
    onTmpIncAmtChange: setTmpIncAmt,
    onAddExtraIncome: addExtraIncome,
    onDeleteIncome: delInc,
    mLiving,
    onMLivingChange: setMLiving,
    mRent,
    onMRentChange: setMRent,
    mInsurance,
    onMInsuranceChange: setMInsurance,
    mLaborHealth,
    onMLaborHealthChange: setMLaborHealth,
    mParents,
    onMParentsChange: setMParents,
    mOther,
    onMOtherChange: setMOther,
  }), [
    addExtraIncome,
    delInc,
    extraIncomes,
    mInsurance,
    mLaborHealth,
    mLiving,
    mOther,
    mParents,
    mRent,
    mainSalary,
    tmpIncAmt,
    tmpIncName,
    tmpIncType,
  ]);

  return useMemo(() => ({
    mainSalary,
    extraIncomes,
    baseExp,
    mRent,
    mInsurance,
    incomeExpensePanelProps,
  }), [baseExp, extraIncomes, incomeExpensePanelProps, mInsurance, mRent, mainSalary]);
}
