import { useMemo, useState } from "react";
import type { KidRecord, SiblingRecord } from "@/types/wealth";

export function useFamilyState() {
  const [hasSpouse, setHasSpouse] = useState(false);
  const [spAge, setSpAge] = useState(30);
  const [spLife, setSpLife] = useState(88);
  const [spSalary, setSpSalary] = useState(0);
  const [spOtherInc, setSpOtherInc] = useState(0);
  const [spWealth, setSpWealth] = useState(0);
  const [spAdd, setSpAdd] = useState(0);
  const [spRate, setSpRate] = useState(0);
  const [spDisabled, setSpDisabled] = useState(false);
  const [spLtc, setSpLtc] = useState(false);

  const [hasFather, setHasFather] = useState(false);
  const [faAge, setFaAge] = useState(65);
  const [faLife, setFaLife] = useState(85);
  const [faClaimTax, setFaClaimTax] = useState(true);
  const [faTaxInc, setFaTaxInc] = useState(0);
  const [faDisabled, setFaDisabled] = useState(false);
  const [faLtc, setFaLtc] = useState(false);

  const [hasMother, setHasMother] = useState(false);
  const [moAge, setMoAge] = useState(65);
  const [moLife, setMoLife] = useState(88);
  const [moClaimTax, setMoClaimTax] = useState(true);
  const [moTaxInc, setMoTaxInc] = useState(0);
  const [moDisabled, setMoDisabled] = useState(false);
  const [moLtc, setMoLtc] = useState(false);

  const [hasGrand, setHasGrand] = useState(false);
  const [gpCount, setGpCount] = useState(0);
  const [gpAge, setGpAge] = useState(75);
  const [gpLife, setGpLife] = useState(85);
  const [gpClaimTax, setGpClaimTax] = useState(false);
  const [gpTaxInc, setGpTaxInc] = useState(0);
  const [gpDependent, setGpDependent] = useState(true);
  const [gpDisabledCount, setGpDisabledCount] = useState(0);
  const [gpLtcCount, setGpLtcCount] = useState(0);

  const [kids, setKids] = useState<KidRecord[]>([]);
  const [siblings, setSiblings] = useState<SiblingRecord[]>([]);
  const [dailyToolVal, setDailyToolVal] = useState(0);
  const [jobToolVal, setJobToolVal] = useState(0);

  const familyOptions = useMemo(() => {
    const options = ["本人", "配偶", "法定繼承人", "其他(自行輸入)"];
    if (hasFather) options.push("父親");
    if (hasMother) options.push("母親");
    kids.forEach((_, index) => options.push(`子女 ${index + 1}`));
    siblings.forEach((_, index) => options.push(`兄弟姊妹 ${index + 1}`));
    for (let index = 0; index < gpCount; index += 1) options.push(`祖父母 ${index + 1}`);
    return options;
  }, [gpCount, hasFather, hasMother, kids, siblings]);

  const familyPayload = useMemo(() => ({
    hasSpouse,
    spAge,
    spLife,
    spSalary,
    spOtherInc,
    spWealth,
    spAdd,
    spRate,
    spDisabled,
    spLtc,
    hasFather,
    faAge,
    faLife,
    faClaimTax,
    faTaxInc,
    faDisabled,
    faLtc,
    hasMother,
    moAge,
    moLife,
    moClaimTax,
    moTaxInc,
    moDisabled,
    moLtc,
    hasGrand,
    gpCount,
    gpAge,
    gpLife,
    gpClaimTax,
    gpTaxInc,
    gpDependent,
    gpDisabledCount,
    gpLtcCount,
    kids,
    siblings,
    dailyToolVal,
    jobToolVal,
  }), [
    dailyToolVal,
    faAge,
    faClaimTax,
    faDisabled,
    faLife,
    faLtc,
    faTaxInc,
    gpAge,
    gpClaimTax,
    gpCount,
    gpDependent,
    gpDisabledCount,
    gpLife,
    gpLtcCount,
    gpTaxInc,
    hasFather,
    hasGrand,
    hasMother,
    hasSpouse,
    jobToolVal,
    kids,
    moAge,
    moClaimTax,
    moDisabled,
    moLife,
    moLtc,
    moTaxInc,
    siblings,
    spAdd,
    spAge,
    spDisabled,
    spLife,
    spLtc,
    spOtherInc,
    spRate,
    spSalary,
    spWealth,
  ]);

  const familyPanelProps = useMemo(() => ({
    ...familyPayload,
    onHasSpouseChange: setHasSpouse,
    onSpAgeChange: setSpAge,
    onSpLifeChange: setSpLife,
    onSpSalaryChange: setSpSalary,
    onSpOtherIncChange: setSpOtherInc,
    onSpWealthChange: setSpWealth,
    onSpAddChange: setSpAdd,
    onSpRateChange: setSpRate,
    onSpDisabledChange: setSpDisabled,
    onSpLtcChange: setSpLtc,
    onHasFatherChange: setHasFather,
    onFaAgeChange: setFaAge,
    onFaLifeChange: setFaLife,
    onFaClaimTaxChange: setFaClaimTax,
    onFaTaxIncChange: setFaTaxInc,
    onFaDisabledChange: setFaDisabled,
    onFaLtcChange: setFaLtc,
    onHasMotherChange: setHasMother,
    onMoAgeChange: setMoAge,
    onMoLifeChange: setMoLife,
    onMoClaimTaxChange: setMoClaimTax,
    onMoTaxIncChange: setMoTaxInc,
    onMoDisabledChange: setMoDisabled,
    onMoLtcChange: setMoLtc,
    onHasGrandChange: setHasGrand,
    onGpCountChange: setGpCount,
    onGpAgeChange: setGpAge,
    onGpLifeChange: setGpLife,
    onGpClaimTaxChange: setGpClaimTax,
    onGpTaxIncChange: setGpTaxInc,
    onGpDependentChange: setGpDependent,
    onGpDisabledCountChange: setGpDisabledCount,
    onGpLtcCountChange: setGpLtcCount,
    onKidsChange: setKids,
    onSiblingsChange: setSiblings,
    onDailyToolValChange: setDailyToolVal,
    onJobToolValChange: setJobToolVal,
  }), [familyPayload]);

  return useMemo(() => ({
    familyPayload,
    familyPanelProps,
    familyOptions,
  }), [familyOptions, familyPanelProps, familyPayload]);
}
