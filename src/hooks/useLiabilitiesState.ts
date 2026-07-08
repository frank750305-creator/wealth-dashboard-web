import { useCallback, useMemo, useState } from "react";
import { buildDebtPlan, buildMortgage } from "@/lib/recordBuilders";
import type { DebtRecord, MortgageRecord } from "@/types/wealth";

export function useLiabilitiesState() {
  const [hasHouse, setHasHouse] = useState(false);
  const [tmpHName, setTmpHName] = useState("我的家");
  const [tmpHStart, setTmpHStart] = useState(30);
  const [tmpHPrice, setTmpHPrice] = useState(0);
  const [tmpHDownPct, setTmpHDownPct] = useState(0);
  const [tmpHRate, setTmpHRate] = useState(0.0);
  const [tmpHYears, setTmpHYears] = useState(30);
  const [tmpHGrace, setTmpHGrace] = useState(0);
  const [tmpHMethod, setTmpHMethod] = useState("本利平均");
  const [tmpHReplaceRent, setTmpHReplaceRent] = useState(true);
  const [tmpHClaimTax, setTmpHClaimTax] = useState(true);
  const [mortgages, setMortgages] = useState<MortgageRecord[]>([]);

  const [debts, setDebts] = useState<DebtRecord[]>([]);
  const [tmpDName, setTmpDName] = useState("信用貸款");
  const [tmpDStart, setTmpDStart] = useState(30);
  const [tmpDAmt, setTmpDAmt] = useState(0);
  const [tmpDYears, setTmpDYears] = useState(0);
  const [tmpDRate, setTmpDRate] = useState(0.0);

  const addMortgage = useCallback(() => {
    setMortgages((prev) => [
      ...prev,
      buildMortgage({
        name: tmpHName,
        startAge: tmpHStart,
        priceWan: tmpHPrice,
        downPaymentPct: tmpHDownPct,
        annualRatePct: tmpHRate,
        years: tmpHYears,
        graceYears: tmpHGrace,
        method: tmpHMethod,
        replaceRent: tmpHReplaceRent,
        claimTax: tmpHClaimTax,
      }),
    ]);
  }, [
    tmpHClaimTax,
    tmpHDownPct,
    tmpHGrace,
    tmpHMethod,
    tmpHName,
    tmpHPrice,
    tmpHRate,
    tmpHReplaceRent,
    tmpHStart,
    tmpHYears,
  ]);

  const addDebtPlan = useCallback(() => {
    setDebts((prev) => [
      ...prev,
      buildDebtPlan({
        name: tmpDName,
        startAge: tmpDStart,
        amountWan: tmpDAmt,
        years: tmpDYears,
        annualRatePct: tmpDRate,
      }),
    ]);
  }, [tmpDAmt, tmpDName, tmpDRate, tmpDStart, tmpDYears]);

  const delMortgage = useCallback((id: string) => {
    setMortgages((prev) => prev.filter((mortgage) => mortgage.id !== id));
  }, []);

  const delDebt = useCallback((id: string) => {
    setDebts((prev) => prev.filter((debt) => debt.id !== id));
  }, []);

  const liabilitiesPanelProps = useMemo(() => ({
    hasHouse,
    onHasHouseChange: setHasHouse,
    tmpHName,
    onTmpHNameChange: setTmpHName,
    tmpHStart,
    onTmpHStartChange: setTmpHStart,
    tmpHPrice,
    onTmpHPriceChange: setTmpHPrice,
    tmpHDownPct,
    onTmpHDownPctChange: setTmpHDownPct,
    tmpHRate,
    onTmpHRateChange: setTmpHRate,
    tmpHYears,
    onTmpHYearsChange: setTmpHYears,
    tmpHGrace,
    onTmpHGraceChange: setTmpHGrace,
    tmpHMethod,
    onTmpHMethodChange: setTmpHMethod,
    tmpHReplaceRent,
    onTmpHReplaceRentChange: setTmpHReplaceRent,
    tmpHClaimTax,
    onTmpHClaimTaxChange: setTmpHClaimTax,
    mortgages,
    onAddMortgage: addMortgage,
    onDeleteMortgage: delMortgage,
    tmpDName,
    onTmpDNameChange: setTmpDName,
    tmpDStart,
    onTmpDStartChange: setTmpDStart,
    tmpDAmt,
    onTmpDAmtChange: setTmpDAmt,
    tmpDYears,
    onTmpDYearsChange: setTmpDYears,
    tmpDRate,
    onTmpDRateChange: setTmpDRate,
    debts,
    onAddDebtPlan: addDebtPlan,
    onDeleteDebt: delDebt,
  }), [
    addDebtPlan,
    addMortgage,
    debts,
    delDebt,
    delMortgage,
    hasHouse,
    mortgages,
    tmpDAmt,
    tmpDName,
    tmpDRate,
    tmpDStart,
    tmpDYears,
    tmpHClaimTax,
    tmpHDownPct,
    tmpHGrace,
    tmpHMethod,
    tmpHName,
    tmpHPrice,
    tmpHRate,
    tmpHReplaceRent,
    tmpHStart,
    tmpHYears,
  ]);

  return useMemo(() => ({
    mortgages,
    debts,
    liabilitiesPanelProps,
  }), [debts, liabilitiesPanelProps, mortgages]);
}
