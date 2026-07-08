import { useMemo, useState } from "react";
import { calculatePension } from "@/lib/pension";

type UsePensionStateInput = {
  currentAge: number;
  retireAge: number;
  mainSalary: number;
};

export function usePensionState({
  currentAge,
  retireAge,
  mainSalary,
}: UsePensionStateInput) {
  const [pensionMode, setPensionMode] = useState<string>("💼 一般勞工");

  const [lbSalary, setLbSalary] = useState(45800);
  const [lbCurrentYears, setLbCurrentYears] = useState(0);
  const [nationalYears, setNationalYears] = useState(0);
  const [lbAge, setLbAge] = useState(65);
  const [hasOldSys, setHasOldSys] = useState(false);
  const lbSelectedPlan = "";
  const [ltBal, setLtBal] = useState(0);
  const [ltVol, setLtVol] = useState(0);
  const [ltRoi, setLtRoi] = useState(0);

  const [pbSalary, setPbSalary] = useState(53070);
  const [pbYears, setPbYears] = useState(0);
  const [pbAge, setPbAge] = useState(65);
  const [pbType, setPbType] = useState("按月領取 (養老年金)");
  const [tfSys, setTfSys] = useState("舊制/現職年改 (確定給付 DB)");
  const [tfSalary, setTfSalary] = useState(53070);
  const [tfYears, setTfYears] = useState(0);
  const [tfBal, setTfBal] = useState(0);
  const [tfSal, setTfSal] = useState(53070);
  const [tfVol, setTfVol] = useState(0);
  const [tfRoi, setTfRoi] = useState(0);

  const [milRank, setMilRank] = useState("士官 (最高替代率 95%)");
  const [milSalary, setMilSalary] = useState(50000);
  const [milYears, setMilYears] = useState(0);
  const [milAge, setMilAge] = useState(65);
  const [milType, setMilType] = useState("按月領取 (終身俸)");

  const [fmIsRich, setFmIsRich] = useState(false);
  const [fmAge, setFmAge] = useState(65);
  const [fmBal, setFmBal] = useState(0);
  const [fmWage, setFmWage] = useState(0);
  const [fmVol, setFmVol] = useState(0);
  const [fmRoi, setFmRoi] = useState(0);

  const oaAmt = 0;
  const oaAge = 65;
  const opBal = 0;
  const opAdd = 0;
  const opDeduct = 0;
  const opRoi = 0;

  const pensionInfo = useMemo(() => calculatePension({
    pensionMode,
    currentAge,
    retireAge,
    mainSalary,
    lbSalary,
    lbCurrentYears,
    nationalYears,
    lbAge,
    hasOldSys,
    lbSelectedPlan,
    ltBal,
    ltVol,
    ltRoi,
    pbSalary,
    pbYears,
    pbAge,
    pbType,
    tfSys,
    tfSalary,
    tfYears,
    tfBal,
    tfSal,
    tfVol,
    tfRoi,
    milRank,
    milSalary,
    milYears,
    milAge,
    milType,
    fmIsRich,
    fmAge,
    fmBal,
    fmWage,
    fmVol,
    fmRoi,
    oaAmt,
    oaAge,
    opBal,
    opAdd,
    opDeduct,
    opRoi,
  }), [
    pensionMode,
    currentAge,
    retireAge,
    mainSalary,
    lbSalary,
    lbCurrentYears,
    nationalYears,
    lbAge,
    hasOldSys,
    lbSelectedPlan,
    ltBal,
    ltVol,
    ltRoi,
    pbSalary,
    pbYears,
    pbAge,
    pbType,
    tfSys,
    tfSalary,
    tfYears,
    tfBal,
    tfSal,
    tfVol,
    tfRoi,
    milRank,
    milSalary,
    milYears,
    milAge,
    milType,
    fmIsRich,
    fmAge,
    fmBal,
    fmWage,
    fmVol,
    fmRoi,
    oaAmt,
    oaAge,
    opBal,
    opAdd,
    opDeduct,
    opRoi,
  ]);

  const pensionPanelProps = useMemo(() => ({
    pensionMode,
    onPensionModeChange: setPensionMode,
    lbSalary,
    onLbSalaryChange: setLbSalary,
    lbCurrentYears,
    onLbCurrentYearsChange: setLbCurrentYears,
    nationalYears,
    onNationalYearsChange: setNationalYears,
    lbAge,
    onLbAgeChange: setLbAge,
    hasOldSys,
    onHasOldSysChange: setHasOldSys,
    ltBal,
    onLtBalChange: setLtBal,
    ltVol,
    onLtVolChange: setLtVol,
    ltRoi,
    onLtRoiChange: setLtRoi,
    pbSalary,
    onPbSalaryChange: setPbSalary,
    pbYears,
    onPbYearsChange: setPbYears,
    pbAge,
    onPbAgeChange: setPbAge,
    pbType,
    onPbTypeChange: setPbType,
    tfSys,
    onTfSysChange: setTfSys,
    tfSalary,
    onTfSalaryChange: setTfSalary,
    tfYears,
    onTfYearsChange: setTfYears,
    tfBal,
    onTfBalChange: setTfBal,
    tfSal,
    onTfSalChange: setTfSal,
    tfVol,
    onTfVolChange: setTfVol,
    tfRoi,
    onTfRoiChange: setTfRoi,
    milRank,
    onMilRankChange: setMilRank,
    milSalary,
    onMilSalaryChange: setMilSalary,
    milYears,
    onMilYearsChange: setMilYears,
    milAge,
    onMilAgeChange: setMilAge,
    milType,
    onMilTypeChange: setMilType,
    fmIsRich,
    onFmIsRichChange: setFmIsRich,
    fmAge,
    onFmAgeChange: setFmAge,
    fmBal,
    onFmBalChange: setFmBal,
    fmWage,
    onFmWageChange: setFmWage,
    fmVol,
    onFmVolChange: setFmVol,
    fmRoi,
    onFmRoiChange: setFmRoi,
  }), [
    fmAge,
    fmBal,
    fmIsRich,
    fmRoi,
    fmVol,
    fmWage,
    hasOldSys,
    lbAge,
    lbCurrentYears,
    lbSalary,
    ltBal,
    ltRoi,
    ltVol,
    milAge,
    milRank,
    milSalary,
    milType,
    milYears,
    nationalYears,
    pbAge,
    pbSalary,
    pbType,
    pbYears,
    pensionMode,
    tfBal,
    tfRoi,
    tfSal,
    tfSalary,
    tfSys,
    tfVol,
    tfYears,
  ]);

  return useMemo(() => ({
    pensionInfo,
    pensionPanelProps,
  }), [pensionInfo, pensionPanelProps]);
}
