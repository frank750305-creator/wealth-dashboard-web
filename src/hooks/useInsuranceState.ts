import { useCallback, useMemo, useState } from "react";
import { buildInsurancePolicy } from "@/lib/recordBuilders";
import type { InsuranceRecord } from "@/types/wealth";

export function useInsuranceState() {
  const [insurances, setInsurances] = useState<InsuranceRecord[]>([]);
  const [tmpInsName, setTmpInsName] = useState("富邦傳世富足");
  const [tmpInsType, setTmpInsType] = useState("人壽保險");
  const [tmpInsApp, setTmpInsApp] = useState("本人");
  const [tmpInsIns, setTmpInsIns] = useState("本人");
  const [tmpInsBen, setTmpInsBen] = useState<string[]>(["法定繼承人"]);
  const [tmpInsCustomBen, setTmpInsCustomBen] = useState("");
  const [tmpInsAlloc, setTmpInsAlloc] = useState("均分比例");
  const [tmpInsPayFreq, setTmpInsPayFreq] = useState("年繳");
  const [tmpInsPayMethod, setTmpInsPayMethod] = useState("信用卡");
  const [tmpInsBank, setTmpInsBank] = useState("");
  const [tmpInsDueDate, setTmpInsDueDate] = useState("01/01");
  const [tmpInsPremium, setTmpInsPremium] = useState(0);
  const [tmpInsYears, setTmpInsYears] = useState(6);
  const [tmpInsCv, setTmpInsCv] = useState(0);
  const [tmpInsIrr, setTmpInsIrr] = useState(2.25);
  const [tmpInsDb, setTmpInsDb] = useState(0);
  const [tmpInsSurv, setTmpInsSurv] = useState(0);
  const [tmpInsSurvAge, setTmpInsSurvAge] = useState(65);

  const toggleInsBen = useCallback((beneficiary: string) => {
    setTmpInsBen((prev) =>
      prev.includes(beneficiary)
        ? prev.filter((item) => item !== beneficiary)
        : [...prev, beneficiary],
    );
  }, []);

  const addInsurancePolicy = useCallback(() => {
    if (tmpInsBen.length === 0) {
      alert("請至少選擇一位身故受益人！");
      return;
    }

    setInsurances((prev) => [
      ...prev,
      buildInsurancePolicy({
        name: tmpInsName,
        type: tmpInsType,
        applicant: tmpInsApp,
        insured: tmpInsIns,
        beneficiaries: tmpInsBen,
        customBeneficiary: tmpInsCustomBen,
        allocation: tmpInsAlloc,
        payFrequency: tmpInsPayFreq,
        payMethod: tmpInsPayMethod,
        bank: tmpInsBank,
        dueDate: tmpInsDueDate,
        premiumWan: tmpInsPremium,
        years: tmpInsYears,
        cashValueWan: tmpInsCv,
        irrPct: tmpInsIrr,
        deathBenefitWan: tmpInsDb,
        survivalWan: tmpInsSurv,
        survivalAge: tmpInsSurvAge,
      }),
    ]);
  }, [
    tmpInsAlloc,
    tmpInsApp,
    tmpInsBank,
    tmpInsBen,
    tmpInsCustomBen,
    tmpInsCv,
    tmpInsDb,
    tmpInsDueDate,
    tmpInsIns,
    tmpInsIrr,
    tmpInsName,
    tmpInsPayFreq,
    tmpInsPayMethod,
    tmpInsPremium,
    tmpInsSurv,
    tmpInsSurvAge,
    tmpInsType,
    tmpInsYears,
  ]);

  const delIns = useCallback((id: string) => {
    setInsurances((prev) => prev.filter((insurance) => insurance.id !== id));
  }, []);

  const insurancePanelProps = useMemo(() => ({
    insurances,
    tmpInsName,
    onTmpInsNameChange: setTmpInsName,
    tmpInsType,
    onTmpInsTypeChange: setTmpInsType,
    tmpInsApp,
    onTmpInsAppChange: setTmpInsApp,
    tmpInsIns,
    onTmpInsInsChange: setTmpInsIns,
    tmpInsBen,
    onToggleBeneficiary: toggleInsBen,
    tmpInsCustomBen,
    onTmpInsCustomBenChange: setTmpInsCustomBen,
    tmpInsAlloc,
    onTmpInsAllocChange: setTmpInsAlloc,
    tmpInsPayFreq,
    onTmpInsPayFreqChange: setTmpInsPayFreq,
    tmpInsPayMethod,
    onTmpInsPayMethodChange: setTmpInsPayMethod,
    tmpInsBank,
    onTmpInsBankChange: setTmpInsBank,
    tmpInsDueDate,
    onTmpInsDueDateChange: setTmpInsDueDate,
    tmpInsPremium,
    onTmpInsPremiumChange: setTmpInsPremium,
    tmpInsYears,
    onTmpInsYearsChange: setTmpInsYears,
    tmpInsCv,
    onTmpInsCvChange: setTmpInsCv,
    tmpInsIrr,
    onTmpInsIrrChange: setTmpInsIrr,
    tmpInsDb,
    onTmpInsDbChange: setTmpInsDb,
    tmpInsSurv,
    onTmpInsSurvChange: setTmpInsSurv,
    tmpInsSurvAge,
    onTmpInsSurvAgeChange: setTmpInsSurvAge,
    onAddInsurancePolicy: addInsurancePolicy,
    onDeleteInsurance: delIns,
  }), [
    addInsurancePolicy,
    delIns,
    insurances,
    tmpInsAlloc,
    tmpInsApp,
    tmpInsBank,
    tmpInsBen,
    tmpInsCustomBen,
    tmpInsCv,
    tmpInsDb,
    tmpInsDueDate,
    tmpInsIns,
    tmpInsIrr,
    tmpInsName,
    tmpInsPayFreq,
    tmpInsPayMethod,
    tmpInsPremium,
    tmpInsSurv,
    tmpInsSurvAge,
    tmpInsType,
    tmpInsYears,
    toggleInsBen,
  ]);

  return useMemo(() => ({
    insurances,
    insurancePanelProps,
  }), [insurancePanelProps, insurances]);
}
