"use client";

import { useState, useEffect, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Line, ComposedChart } from "recharts";

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [simulationResult, setSimulationResult] = useState<any>(null);
  const [activeSection, setActiveSection] = useState<string>("timeline");
  const [selectedReportAge, setSelectedReportAge] = useState<number>(40);
  const [activeTab, setActiveTab] = useState<string>("main");

  // --- 1. 全局時間軸與精算參數 ---
  const [currentAge, setCurrentAge] = useState(30);
  const [lifeExpectancy, setLifeExpectancy] = useState(90);
  const [retireAge, setRetireAge] = useState(65);
  const [salaryGrowth, setSalaryGrowth] = useState(1.2);
  const [inflationRate, setInflationRate] = useState(2.0);
  const [replacementRate, setReplacementRate] = useState(70);
  const [roiAfterRetire, setRoiAfterRetire] = useState(3.0);

  useEffect(() => { setSelectedReportAge(currentAge); }, [currentAge]);

  // --- 2. 收入、六大常態開銷與動態多元所得池 ---
  const [mainSalary, setMainSalary] = useState(50000);
  const [extraIncomes, setExtraIncomes] = useState<any[]>([]);
  const [tmpIncName, setTmpIncName] = useState("兼職/收租");
  const [tmpIncType, setTmpIncType] = useState("執行業務-一般(9A, 扣30%成本)");
  const [tmpIncAmt, setTmpIncAmt] = useState(0);

  const [mLiving, setMLiving] = useState(0);
  const [mRent, setMRent] = useState(0);
  const [mInsurance, setMInsurance] = useState(0);
  const [mLaborHealth, setMLaborHealth] = useState(0);
  const [mParents, setMParents] = useState(0);
  const [mOther, setMOther] = useState(0);
  const baseExp = mLiving + mRent + mInsurance + mLaborHealth + mParents + mOther;

  // --- 3. 動態資產池 ---
  const [assets, setAssets] = useState<any[]>([
    { id: "asset_cash_default", name: "日常活存", type: "現金", value: 0.0, rate: 0.0, monthly_add: 0.0, add_years: 0, tax_type: "國內利息(計入27萬)" }
  ]);
  const [tmpAssetCat, setTmpAssetCat] = useState("現金");
  const [tmpAssetName, setTmpAssetName] = useState("我的現金");
  const [tmpAssetVal, setTmpAssetVal] = useState(0);
  const [tmpAssetMonthly, setTmpAssetMonthly] = useState(0);
  const [tmpAssetAddYears, setTmpAssetAddYears] = useState(35);
  const [tmpAssetRate, setTmpAssetRate] = useState(0.0);
  const [tmpAssetTax, setTmpAssetTax] = useState("資本利得/不計稅");

  // --- 4. 國家與職業退休金專案 ---
  const [pensionMode, setPensionMode] = useState<string>("💼 一般勞工");
  // 勞工
  const [lbSalary, setLbSalary] = useState(45800);
  const [lbCurrentYears, setLbCurrentYears] = useState(0);
  const [nationalYears, setNationalYears] = useState(0);
  const [lbAge, setLbAge] = useState(65);
  const [hasOldSys, setHasOldSys] = useState(false);
  const [lbSelectedPlan, setLbSelectedPlan] = useState("");
  const [ltBal, setLtBal] = useState(0);
  const [ltVol, setLtVol] = useState(0);
  const [ltRoi, setLtRoi] = useState(0);
  // 公教
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
  // 軍職
  const [milRank, setMilRank] = useState("士官 (最高替代率 95%)");
  const [milSalary, setMilSalary] = useState(50000);
  const [milYears, setMilYears] = useState(0);
  const [milAge, setMilAge] = useState(65);
  const [milType, setMilType] = useState("按月領取 (終身俸)");
  // 農牧
  const [fmIsRich, setFmIsRich] = useState(false);
  const [fmAge, setFmAge] = useState(65);
  const [fmBal, setFmBal] = useState(0);
  const [fmWage, setFmWage] = useState(0);
  const [fmVol, setFmVol] = useState(0);
  const [fmRoi, setFmRoi] = useState(0);
  // 其他
  const [oaAmt, setOaAmt] = useState(0);
  const [oaAge, setOaAge] = useState(65);
  const [opBal, setOpBal] = useState(0);
  const [opAdd, setOpAdd] = useState(0);
  const [opDeduct, setOpDeduct] = useState(0);
  const [opRoi, setOpRoi] = useState(0);

  // --- 5. 未來重大財務事件 ---
  const [events, setEvents] = useState<any[]>([]);
  const [tmpEvName, setTmpEvName] = useState("子女出國學費/保單生存金");
  const [tmpEvAge, setTmpEvAge] = useState(40);
  const [tmpEvAmt, setTmpEvAmt] = useState(0); 
  const [tmpEvTarget, setTmpEvTarget] = useState("預設現金流");
  const [tmpEvNewName, setTmpEvNewName] = useState("保單滿期轉投資");
  const [tmpEvNewType, setTmpEvNewType] = useState("現金");
  const [tmpEvNewRate, setTmpEvNewRate] = useState(0);
  const [evtContinuous, setEvtContinuous] = useState(false);
  const [tmpEvDuration, setTmpEvDuration] = useState(4);

  // --- 6. 不動產購屋置換與信貸債務模組 ---
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
  const [mortgages, setMortgages] = useState<any[]>([]);
  
  const [debts, setDebts] = useState<any[]>([]);
  const [tmpDName, setTmpDName] = useState("信用貸款");
  const [tmpDStart, setTmpDStart] = useState(30);
  const [tmpDAmt, setTmpDAmt] = useState(0);
  const [tmpDYears, setTmpDYears] = useState(0);
  const [tmpDRate, setTmpDRate] = useState(0.0);

  // --- 7. 家族成員與稅務扶養扣除額 ---
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

  const [kids, setKids] = useState<any[]>([]);
  const [siblings, setSiblings] = useState<any[]>([]);
  const [dailyToolVal, setDailyToolVal] = useState(0);
  const [jobToolVal, setJobToolVal] = useState(0);

  // --- 8. 獨立保單管理陣列模組 ---
  const [insurances, setInsurances] = useState<any[]>([]);
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

  // --- 法規常數設定 (顯示為元) ---
  const [taxParams, setTaxParams] = useState<Record<string, number>>({
    exemption: 97000, std_deduction: 131000, salary_deduction: 218000, inc_disabled_ded: 218000,
    savings_limit: 270000, amt_threshold: 7500000, rent_limit: 180000, mortgage_limit: 300000,
    ins_limit: 24000, retire_exempt: 814000, manual_itemized: 0, basic_living: 218000,
    ltc_deduction: 120000, preschool_1st: 120000, preschool_2nd: 150000
  });

  const updateTaxParam = (key: string, val: number) => {
    setTaxParams({ ...taxParams, [key]: val });
  };

  // --- 動態戰情指標 State ---
  const [serverTax, setServerTax] = useState(0);
  const [serverLoan, setServerLoan] = useState(0);

  // --- 功能：家族動態選單 ---
  const getFamilyOptions = () => {
    let opts = ["本人", "配偶", "法定繼承人", "其他(自行輸入)"];
    if (hasFather) opts.push("父親");
    if (hasMother) opts.push("母親");
    kids.forEach((_, i) => opts.push(`子女 ${i + 1}`));
    siblings.forEach((_, i) => opts.push(`兄弟姊妹 ${i + 1}`));
    for (let i = 0; i < gpCount; i++) opts.push(`祖父母 ${i + 1}`);
    return opts;
  };
  const toggleInsBen = (b: string) => {
    setTmpInsBen(prev => prev.includes(b) ? prev.filter(x => x !== b) : [...prev, b]);
  };

  // --- 功能：列表增刪 ---
  const addExtraIncome = () => setExtraIncomes([...extraIncomes, { id: `inc_${Date.now()}`, name: tmpIncName, type: tmpIncType, monthly_amt: tmpIncAmt }]);
  const addAssetAccount = () => {
    if (!assets.find(a => a.name === tmpAssetName)) {
      setAssets([...assets, { id: `ast_${Date.now()}`, name: tmpAssetName, type: tmpAssetCat, value: tmpAssetVal, rate: tmpAssetRate, monthly_add: tmpAssetMonthly, add_years: tmpAssetAddYears, tax_type: tmpAssetTax }]);
    } else alert("子帳戶名稱已存在！");
  };
  const addMortgage = () => {
    const loan_amt = tmpHPrice * (1 - tmpHDownPct/100);
    const m_rate = (tmpHRate / 100) / 12;
    const amort_months = (tmpHYears - tmpHGrace) * 12;
    let pmt = 0;
    if (amort_months > 0) {
      pmt = tmpHMethod === "本利平均" ? (loan_amt * 10000 * m_rate * Math.pow(1+m_rate, amort_months)) / (Math.pow(1+m_rate, amort_months) - 1) : (loan_amt * 10000 / amort_months) + (loan_amt * 10000 * m_rate);
    } else { pmt = loan_amt * 10000 * m_rate; }
    setMortgages([...mortgages, { id: `h_${Date.now()}`, name: tmpHName, start: tmpHStart, total_price: tmpHPrice, loan_amount: loan_amt, years: tmpHYears, grace: tmpHGrace, rate: tmpHRate, method: tmpHMethod, replace_rent: tmpHReplaceRent, claim_tax: tmpHClaimTax, monthly_pay: Math.round(pmt || 0) }]);
  };
  const addDebtPlan = () => setDebts([...debts, { id: `d_${Date.now()}`, name: tmpDName, start: tmpDStart, loan_amount: tmpDAmt, years: tmpDYears, rate: tmpDRate, monthly_pay: Math.round((tmpDAmt * 10000 * (tmpDRate/100/12)) / (1 - Math.pow(1 + tmpDRate/100/12, -tmpDYears*12)) || 0) }]);
  const addInsurancePolicy = () => {
    if (tmpInsBen.length === 0) return alert("請至少選擇一位身故受益人！");
    setInsurances([...insurances, { id: `ins_${Date.now()}`, name: tmpInsName, type: tmpInsType, app: tmpInsApp, ins: tmpInsIns, ben: tmpInsBen, custom_ben: tmpInsCustomBen, ben_allocation: tmpInsAlloc, pay_freq: tmpInsPayFreq, pay_method: tmpInsPayMethod, bank: tmpInsBank, due_date: tmpInsDueDate, premium: tmpInsPremium, years: tmpInsYears, cv: tmpInsCv, irr: tmpInsIrr, db: tmpInsDb, survival: tmpInsSurv, survival_age: tmpInsSurvAge }]);
  };
  const addFutureEvent = () => {
    const newAst = tmpEvTarget === "➕ 建立全新資產" ? { name: tmpEvNewName, type: tmpEvNewType, rate: tmpEvNewRate/100, tax_type: "資本利得/不計稅" } : null;
    setEvents([...events, { id: `ev_${Date.now()}`, label: tmpEvName, age: tmpEvAge, amount: tmpEvAmt * 10000, target: tmpEvTarget, duration: evtContinuous ? tmpEvDuration : 1, new_asset: newAst }]);
  };

  const delAsset = (id: string) => setAssets(assets.filter(a => a.id !== id));
  const delInc = (id: string) => setExtraIncomes(extraIncomes.filter(i => i.id !== id));
  const delMortgage = (id: string) => setMortgages(mortgages.filter(m => m.id !== id));
  const delDebt = (id: string) => setDebts(debts.filter(d => d.id !== id));
  const delIns = (id: string) => setInsurances(insurances.filter(i => i.id !== id));
  const delEv = (id: string) => setEvents(events.filter(e => e.id !== id));

  // --- 退休金大腦 (React 版) ---
  const calculatePension = () => {
    let p = { annuity_start_age: 65, annuity_m_amt_wan: 0, lump_sum_wan: 0, lump_sum_age: 65, acct_bal_wan: 0, acct_add_wan: 0, acct_roi: 0, vol_deduct_wan: 0 };
    if (!pensionMode || pensionMode.includes("清空")) return p;

    if (pensionMode.includes("勞工")) {
      const calcLaborAnnuity = (years: number, offset: number) => {
        if (lbSalary <= 0 || years <= 0) return 0;
        const adj = 1.0 + (offset * 0.04);
        return Math.floor(Math.max((lbSalary * years * 0.00775) + 3000, lbSalary * years * 0.0155) * adj);
      };
      const calcNationalAnnuity = (years: number, isEligibleForA: boolean) => {
        if (isEligibleForA) return Math.floor(Math.max((19761 * years * 0.0065) + 3772, 19761 * years * 0.013));
        return Math.floor(19761 * years * 0.013);
      };
      
      const futureYears = Math.max(0, retireAge - currentAge);
      const totalLbYears = lbCurrentYears + futureYears;
      const offset = Math.max(-5, Math.min(5, lbAge - 65));
      
      let plans: Record<string, {type: string, val: number}> = {};
      if (totalLbYears < 15) plans["老年一次金 (新制)"] = { type: "lump", val: lbSalary * Math.min(totalLbYears, 60) };
      if (hasOldSys) plans["一次請領老年給付 (舊制)"] = { type: "lump", val: lbSalary * Math.min(Math.min(totalLbYears, 15)*1 + Math.max(0, Math.min(totalLbYears-15, 15))*2, 45) };
      
      if (totalLbYears >= 15) {
        plans["純勞保年金 + 國保(B式)"] = { type: "monthly", val: calcLaborAnnuity(totalLbYears, offset) + (nationalYears > 0 ? calcNationalAnnuity(nationalYears, false) : 0) };
      } else if (totalLbYears < 15 && (totalLbYears + nationalYears) >= 15 && lbAge >= 65) {
        plans["勞國保年資併計雙年金"] = { type: "monthly", val: calcLaborAnnuity(totalLbYears, 0) + calcNationalAnnuity(nationalYears, false) };
      } else if (nationalYears > 0 && lbAge >= 65) {
        plans["純國保年金 (A/B擇優)"] = { type: "monthly", val: calcNationalAnnuity(nationalYears, true) };
      }

      if (Object.keys(plans).length > 0) {
        const selected = plans[lbSelectedPlan] || Object.values(plans)[0];
        if (selected.type === "monthly") { p.annuity_start_age = lbAge; p.annuity_m_amt_wan = selected.val / 10000; }
        else { p.lump_sum_age = lbAge; p.lump_sum_wan = selected.val / 10000; }
      }
      p.acct_bal_wan = ltBal; p.acct_add_wan = (Math.min(mainSalary, 150000) * (0.06 + ltVol/100)) / 10000;
      p.acct_roi = ltRoi; p.vol_deduct_wan = (Math.min(mainSalary, 150000) * (ltVol/100)) / 10000;

    } else if (pensionMode.includes("公教")) {
      if (pbType.includes("按月")) { p.annuity_start_age = pbAge; p.annuity_m_amt_wan += (pbSalary * Math.min(pbYears, 35) * 0.013) / 10000; }
      else { p.lump_sum_age = pbAge; p.lump_sum_wan += (pbSalary * Math.min(pbYears * 1.2, 42)) / 10000; }

      if (tfSys.includes("舊制")) {
        const maxRatio = Math.min(0.75, Math.max(0.0, 0.375 + (tfYears - 15) * 0.015));
        p.annuity_start_age = pbAge; p.annuity_m_amt_wan += ((tfSalary * 2) * maxRatio) / 10000;
      } else {
        p.acct_bal_wan = tfBal; p.acct_add_wan = ((tfSal * 2) * (0.15 + tfVol/100)) / 10000;
        p.acct_roi = tfRoi; p.vol_deduct_wan = ((tfSal * 2) * (0.0525 + tfVol/100)) / 10000;
      }
    } else if (pensionMode.includes("軍職")) {
      if (milType.includes("按月") && milYears >= 20) {
        const ratio = Math.min(milRank.includes("士官") ? 0.95 : 0.90, 0.55 + (milYears - 20) * 0.02);
        p.annuity_start_age = milAge; p.annuity_m_amt_wan += ((milSalary * 2) * ratio) / 10000;
      } else if (milType.includes("一次")) {
        p.lump_sum_age = milAge; p.lump_sum_wan += ((milSalary * 2) * Math.min(Math.min(milYears, 15)*1.5 + Math.max(0, milYears-15)*2.0, 53)) / 10000;
      }
    } else if (pensionMode.includes("農牧")) {
      if (!fmIsRich) { p.annuity_start_age = fmAge; p.annuity_m_amt_wan += 8080 / 10000; }
      p.acct_bal_wan = fmBal; p.acct_add_wan = (fmWage * (fmVol/100) * 2) / 10000;
      p.acct_roi = fmRoi; p.vol_deduct_wan = (fmWage * (fmVol/100)) / 10000;
    } else {
      p.annuity_start_age = oaAge; p.annuity_m_amt_wan += oaAmt;
      p.acct_bal_wan = opBal; p.acct_add_wan = opAdd; p.acct_roi = opRoi; p.vol_deduct_wan = opDeduct;
    }
    return p;
  };

  // --- 動態運算 ---
  const totalMInc = mainSalary + extraIncomes.reduce((acc, curr) => acc + curr.monthly_amt, 0);
  const insPremiumMonthly = insurances.reduce((acc, curr) => acc + ((curr.premium * 10000) / 12), 0);
  const monthlyNetFlow = totalMInc - (baseExp + serverTax/12 + serverLoan/12 + insPremiumMonthly);

  // 逆算器準備
  const futureExpensesList = events.filter(ev => ev.amount < 0 && (ev.age - currentAge) > 0);
  const realRetireFundPv = useMemo(() => {
    const p = calculatePension();
    const gapMonthly = Math.max(0, (mainSalary * Math.pow(1+salaryGrowth/100, retireAge-currentAge) * replacementRate/100) - p.annuity_m_amt_wan*10000);
    let fundPv = 0;
    const yrsInRetire = lifeExpectancy - retireAge + 1;
    for(let y=0; y<yrsInRetire; y++) fundPv += (gapMonthly * 12 * Math.pow(1+inflationRate/100, y)) / Math.pow(1+roiAfterRetire/100, y);
    
    let projBal = p.acct_bal_wan * 10000;
    for(let y=0; y<Math.max(0, retireAge-currentAge); y++) {
      projBal += (p.acct_add_wan * 10000 * 12) * Math.pow(1+salaryGrowth/100, y);
      projBal *= (1 + p.acct_roi/100);
    }
    return Math.max(0, fundPv - projBal - (p.lump_sum_wan * 10000));
  }, [mainSalary, salaryGrowth, retireAge, currentAge, replacementRate, lifeExpectancy, inflationRate, roiAfterRetire, calculatePension]);
  
  if (retireAge > currentAge) {
    futureExpensesList.push({ id: "retire_fund", label: "🏖️ 真實退休準備金", age: retireAge, amount: -realRetireFundPv, target: "退休金", duration: 1, new_asset: null });
  }
  futureExpensesList.sort((a, b) => a.age - b.age);

  // --- 發射引擎 ---
  const handleSimulate = async () => {
    setIsLoading(true);
    try {
      const tpWan = { ...taxParams };
      Object.keys(tpWan).forEach(k => tpWan[k] = tpWan[k] / 10000); // 將元轉成萬送後端

      const payload = {
        timeline: { current_age: currentAge, life_expectancy: lifeExpectancy, retire_age: retireAge, salary_growth: salaryGrowth / 100, inflation_rate: inflationRate / 100, replacement_rate: replacementRate / 100, roi_after_retire: roiAfterRetire / 100 },
        assets: assets.map(a => ({...a, rate: a.rate / 100})),
        insurances: insurances.map(ins => ({ ...ins, irr: ins.irr / 100 })),
        mortgages: mortgages,
        debts: debts,
        extra_incomes: extraIncomes,
        events: events,
        family: {
          has_spouse: hasSpouse, sp_age: spAge, sp_life: spLife, sp_wealth: spWealth, sp_add: spAdd, sp_rate: spRate, sp_salary: spSalary, sp_other_inc: spOtherInc, sp_disabled: spDisabled, sp_ltc: spLtc,
          has_father: hasFather, fa_age: faAge, fa_life: faLife, fa_claim_tax: faClaimTax, fa_tax_inc: faTaxInc, fa_disabled: faDisabled, fa_ltc: faLtc,
          has_mother: hasMother, mo_age: moAge, mo_life: moLife, mo_claim_tax: moClaimTax, mo_tax_inc: moTaxInc, mo_disabled: moDisabled, mo_ltc: moLtc,
          has_grand: hasGrand, gp_count: gpCount, gp_age: gpAge, gp_life: gpLife, gp_claim_tax: gpClaimTax, gp_tax_inc: gpTaxInc, gp_dependent: gpDependent, gp_disabled_count: gpDisabledCount, gp_ltc_count: gpLtcCount,
          kids: kids.map(k => ({ id: k.id, age: k.age, dep_age: k.dep_age, life: k.life, disabled: k.disabled, ltc: k.ltc })), 
          siblings: siblings.map(s => ({ id: s.id, age: s.age, life: s.life, claim_tax: s.claim_tax, tax_inc: s.tax_inc, dependent: s.dependent, disabled: s.disabled, ltc: s.ltc })),
          daily_tool_val: dailyToolVal, job_tool_val: jobToolVal
        },
        pension: calculatePension(),
        tax_params: tpWan,
        main_salary: mainSalary, 
        base_m_exp: baseExp, m_rent: mRent, m_insurance: mInsurance
      };

      const response = await fetch("https://wealth-dashboard-api.onrender.com/api/v1/wealth/simulate", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`伺服器異常 (代碼: ${response.status})\n${errText}`);
      }
      
      const data = await response.json();
      setSimulationResult(data);
      setServerTax(data.first_year_tax || 0);
      setServerLoan(data.first_year_loan_pay || 0);

    } catch (error: any) {
      alert(`連線或運算異常:\n${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800 border border-slate-700 p-4 rounded shadow-xl">
          <p className="text-slate-300 mb-2 font-bold">{`${label} 歲`}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">{entry.name}: {entry.value.toLocaleString()} 萬</p>
          ))}
        </div>
      );
    }
    return null;
  };

  const snapReport = simulationResult?.trajectory?.find((d: any) => d.年紀 == selectedReportAge);

  const renderInheritanceTable = () => {
    if (!snapReport) return null;
    const baseYuan = snapReport.民法繼承基數 * 10000;
    const payouts = snapReport.保單理賠分配 || {};
    const statutoryInsPool = payouts["法定繼承人"] || 0;
    let rows: any[] = [];
    
    const alive = snapReport.存活字典 || { 配偶:[], 子女:[], 父母:[], 兄弟姊妹:[], 祖父母:[] };
    const hasSp = alive.配偶.length > 0;
    const kidsCnt = alive.子女.length;
    const parentsCnt = alive.父母.length;
    const sibCnt = alive.兄弟姊妹.length;
    const grandCnt = alive.祖父母.length;

    const addHeirRow = (nameStr: string, shareRatio: number, isSp: boolean = false) => {
      const statAmt = baseYuan * shareRatio;
      const tsRatio = isSp ? 0.5 : ((kidsCnt > 0 || parentsCnt > 0) ? 0.5 : (1/3));
      const totalIns = (payouts[nameStr] || 0) + (statutoryInsPool * shareRatio);
      rows.push({ role: nameStr, ratio: `${(shareRatio*100).toFixed(1)}%`, stat: statAmt, forced: baseYuan * tsRatio * shareRatio, ins: totalIns, total: statAmt + totalIns });
    };

    if (kidsCnt > 0) {
      const share = 1 / (kidsCnt + (hasSp ? 1 : 0));
      if (hasSp) addHeirRow("配偶", share, true);
      alive.子女.forEach((k:any) => addHeirRow(k.name, share));
    } else if (parentsCnt > 0) {
      if (hasSp) addHeirRow("配偶", 0.5, true);
      alive.父母.forEach((p:any) => addHeirRow(p.name, (hasSp ? 0.5 : 1.0) / parentsCnt));
    } else if (sibCnt > 0) {
      if (hasSp) addHeirRow("配偶", 0.5, true);
      alive.兄弟姊妹.forEach((s:any) => addHeirRow(s.name, (hasSp ? 0.5 : 1.0) / sibCnt));
    } else if (grandCnt > 0) {
      if (hasSp) addHeirRow("配偶", 2/3, true);
      alive.祖父母.forEach((g:any) => addHeirRow(g.name, (hasSp ? 1/3 : 1.0) / grandCnt));
    } else if (hasSp) {
      addHeirRow("配偶", 1.0, true);
    }

    const processedNames = rows.map(r => r.role);
    processedNames.push("法定繼承人");
    Object.keys(payouts).forEach(bName => {
      if (!processedNames.includes(bName) && payouts[bName] > 0) {
        rows.push({ role: `💎 ${bName} (指定)`, ratio: "0.0%", stat: 0, forced: 0, ins: payouts[bName], total: payouts[bName] });
      }
    });

    if (rows.length === 0) return <p className="text-red-400 p-2">⚠️ 此年紀查無第一至第四順位之法定繼承人，遺產將歸屬國庫。</p>;

    return (
      <table className="w-full text-left border-collapse text-[10px] md:text-xs font-mono">
        <thead>
          <tr className="border-b border-slate-800 text-slate-400 bg-slate-950">
            <th className="p-2">繼承人身分</th>
            <th className="p-2 text-right">應繼分比例</th>
            <th className="p-2 text-right">應繼分金額</th>
            <th className="p-2 text-right text-purple-400">特留分底線</th>
            <th className="p-2 text-right text-blue-400">特定保單理賠</th>
            <th className="p-2 text-right text-emerald-400 font-bold">預估可獲總額</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-900">
          {rows.map((r, i) => (
            <tr key={i} className="hover:bg-slate-900/40">
              <td className="p-2 text-white font-bold">{r.role}</td>
              <td className="p-2 text-right">{r.ratio}</td>
              <td className="p-2 text-right text-slate-300">{Math.round(r.stat).toLocaleString()}</td>
              <td className="p-2 text-right text-purple-300">{Math.round(r.forced).toLocaleString()}</td>
              <td className="p-2 text-right text-blue-300">{Math.round(r.ins).toLocaleString()}</td>
              <td className="p-2 text-right text-emerald-400 font-bold">{Math.round(r.total).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 md:p-8 font-sans overflow-x-hidden">
      <div className="max-w-[1750px] mx-auto">
        <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center border-b border-slate-800 pb-6 mb-8 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-wider text-slate-100 flex items-center gap-3">
              🛡️ 全方位資產配置與民法傳承精算系統 <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded font-mono">V4.0 終極完全體</span>
            </h1>
            <p className="text-slate-400 mt-2 text-xs md:text-sm">AI-Driven Wealth & Succession Planning System (軍公教退休、逆算器全解鎖)</p>
          </div>
        </header>

        <div className="flex border-b border-slate-800 gap-2 mb-6">
          <button onClick={()=>setActiveTab("main")} className={`px-4 py-2 text-sm font-semibold transition-all ${activeTab==="main"?"border-b-2 border-blue-500 text-blue-400 bg-slate-900/40":"text-slate-400"}`}>📊 現金流與資產傳承</button>
          <button onClick={()=>setActiveTab("tax")} className={`px-4 py-2 text-sm font-semibold transition-all ${activeTab==="tax"?"border-b-2 border-blue-500 text-blue-400 bg-slate-900/40":"text-slate-400"}`}>🏛️ 所得稅與最低稅負(AMT)精算</button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          
          <div className="xl:col-span-4 bg-slate-900 border border-slate-800 p-4 md:p-6 rounded-xl shadow-2xl flex flex-col h-fit max-h-[88vh] overflow-y-auto space-y-4 custom-scrollbar">
            <h2 className="text-base font-bold text-blue-400 pb-2 border-b border-slate-800 flex justify-between items-center">
              <span>▍ 決策控制中樞 (8大模組)</span>
            </h2>
            
            <div className="space-y-4 pb-32">
              
              {/* 1. 時間軸 */}
              <div className="border border-slate-800 rounded-lg bg-slate-950/40">
                <button onClick={() => setActiveSection(activeSection === 'timeline' ? '' : 'timeline')} className="w-full bg-slate-950 px-4 py-2.5 text-left font-semibold text-xs text-slate-300 flex justify-between">
                  <span>📊 1. 全局時間軸與精算參數</span><span>{activeSection === 'timeline' ? '▲' : '▼'}</span>
                </button>
                {activeSection === 'timeline' && (
                  <div className="p-4 space-y-3 text-xs border-t border-slate-800">
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className="text-slate-400">當前年紀</label><input type="number" value={currentAge} onChange={(e)=>setCurrentAge(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1"/></div>
                      <div><label className="text-slate-400">模擬至年紀</label><input type="number" value={lifeExpectancy} onChange={(e)=>setLifeExpectancy(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1"/></div>
                      <div><label className="text-slate-400">預計退休年紀</label><input type="number" value={retireAge} onChange={(e)=>setRetireAge(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1"/></div>
                      <div><label className="text-slate-400">薪資成長率(%)</label><input type="number" step="0.1" value={salaryGrowth} onChange={(e)=>setSalaryGrowth(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1"/></div>
                      <div><label className="text-slate-400">通貨膨脹率(%)</label><input type="number" step="0.1" value={inflationRate} onChange={(e)=>setInflationRate(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1"/></div>
                      <div><label className="text-slate-400">所得替代率(%)</label><input type="number" step="1" value={replacementRate} onChange={(e)=>setReplacementRate(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1"/></div>
                      <div><label className="text-slate-400">退休後ROI(%)</label><input type="number" step="0.1" value={roiAfterRetire} onChange={(e)=>setRoiAfterRetire(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1"/></div>
                    </div>
                  </div>
                )}
              </div>

              {/* 2. 收支與動態戰情 */}
              <div className="border border-slate-800 rounded-lg bg-slate-950/40 border-l-4 border-l-emerald-500">
                <button onClick={() => setActiveSection(activeSection === 'income' ? '' : 'income')} className="w-full bg-slate-950 px-4 py-2.5 text-left font-semibold text-xs text-slate-300 flex justify-between">
                  <span>💰 2. 收入/開銷與實質戰情</span><span>{activeSection === 'income' ? '▲' : '▼'}</span>
                </button>
                {activeSection === 'income' && (
                  <div className="p-4 space-y-4 text-xs border-t border-slate-800">
                    <div><label className="text-slate-400 font-bold">主業薪資/月 (元)</label><input type="number" value={mainSalary} onChange={(e)=>setMainSalary(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1 text-white font-mono"/></div>
                    <div className="bg-slate-950 p-2.5 rounded border border-slate-800 space-y-2">
                      <p className="text-emerald-400 font-bold text-[11px]">➕ 額外各類所得</p>
                      <select value={tmpIncType} onChange={(e)=>setTmpIncType(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded p-1 text-white text-[11px]"><option value="執行業務-一般(9A, 扣30%成本)">9A 執行業務所得</option><option value="執行業務-講演/稿費(9B, 享18萬免稅)">9B 講演稿費</option><option value="租賃所得(51, 扣43%成本)">51 房屋租賃所得</option><option value="營利/股利所得(54)">54 營利/股利</option><option value="利息所得(52)">52 利息</option></select>
                      <div className="grid grid-cols-2 gap-2"><input type="text" value={tmpIncName} onChange={(e)=>setTmpIncName(e.target.value)} className="bg-slate-900 border border-slate-700 rounded p-1 text-[11px]"/><input type="number" value={tmpIncAmt} onChange={(e)=>setTmpIncAmt(Number(e.target.value))} className="bg-slate-900 border border-slate-700 rounded p-1 font-mono text-[11px]"/></div>
                      <button onClick={addExtraIncome} className="w-full bg-emerald-900 text-white text-[11px] py-1 rounded font-bold">新增所得</button>
                      {extraIncomes.map(inc => <div key={inc.id} className="flex justify-between text-[10px] text-slate-400"><span>{inc.name}</span><button onClick={()=>delInc(inc.id)}>🗑️</button></div>)}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div><label className="text-[10px] text-slate-500">生活餐費</label><input type="number" value={mLiving} onChange={(e)=>setMLiving(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1 font-mono"/></div>
                      <div><label className="text-[10px] text-slate-500">房屋租金</label><input type="number" value={mRent} onChange={(e)=>setMRent(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1 font-mono"/></div>
                      <div><label className="text-[10px] text-slate-500">醫療壽險</label><input type="number" value={mInsurance} onChange={(e)=>setMInsurance(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1 font-mono"/></div>
                      <div><label className="text-[10px] text-slate-500">勞健保費</label><input type="number" value={mLaborHealth} onChange={(e)=>setMLaborHealth(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1 font-mono"/></div>
                      <div><label className="text-[10px] text-slate-500">孝親費</label><input type="number" value={mParents} onChange={(e)=>setMParents(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1 font-mono"/></div>
                      <div><label className="text-[10px] text-slate-500">娛樂其他</label><input type="number" value={mOther} onChange={(e)=>setMOther(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1 font-mono"/></div>
                      <div><label className="text-[10px] text-blue-400 font-bold">系統自動回填貸款</label><input type="number" value={Math.round(serverLoan/12)} disabled className="w-full bg-slate-800 border border-slate-700 rounded p-1 font-mono text-slate-400"/></div>
                      <div><label className="text-[10px] text-red-400 font-bold">系統自動回填稅負</label><input type="number" value={Math.round(serverTax/12)} disabled className="w-full bg-slate-800 border border-slate-700 rounded p-1 font-mono text-slate-400"/></div>
                    </div>
                    <div className="bg-emerald-950/40 p-3 rounded-lg border border-emerald-800 text-center">
                      <p className="text-slate-300 text-[11px] mb-1">💰 實質每月結餘 (可自由運用/滾存)</p>
                      <p className="text-lg font-bold text-emerald-400 font-mono">{isLoading ? "精算中..." : `${Math.round(monthlyNetFlow).toLocaleString()} 元`}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* 3. 資產池 */}
              <div className="border border-slate-800 rounded-lg bg-slate-950/40">
                <button onClick={() => setActiveSection(activeSection === 'assets' ? '' : 'assets')} className="w-full bg-slate-950 px-4 py-2.5 text-left font-semibold text-xs text-slate-300 flex justify-between">
                  <span>📈 3. 動態資產池 (含定額扣款)</span><span>{activeSection === 'assets' ? '▲' : '▼'}</span>
                </button>
                {activeSection === 'assets' && (
                  <div className="p-4 space-y-3 text-xs border-t border-slate-800">
                    <div className="bg-slate-950 p-2.5 rounded border border-slate-800 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <select value={tmpAssetCat} onChange={(e)=>setTmpAssetCat(e.target.value)} className="bg-slate-900 border border-slate-700 rounded p-1 text-[11px]"><option>現金</option><option>保單</option><option>基金</option><option>債券</option><option>不動產</option><option>股票</option><option>其他</option></select>
                        <input type="text" value={tmpAssetName} onChange={(e)=>setTmpAssetName(e.target.value)} className="bg-slate-900 border border-slate-700 rounded p-1 text-[11px]"/>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div><label className="text-[10px] text-slate-500">起始(萬)</label><input type="number" value={tmpAssetVal} onChange={(e)=>setTmpAssetVal(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1 font-mono"/></div>
                        <div><label className="text-[10px] text-slate-500">報酬(%)</label><input type="number" value={tmpAssetRate} onChange={(e)=>setTmpAssetRate(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1 font-mono"/></div>
                        <div><label className="text-[10px] text-slate-500">月定額(萬)</label><input type="number" step="0.1" value={tmpAssetMonthly} onChange={(e)=>setTmpAssetMonthly(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1 font-mono"/></div>
                        <div><label className="text-[10px] text-slate-500">持續年數</label><input type="number" value={tmpAssetAddYears} onChange={(e)=>setTmpAssetAddYears(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1 font-mono"/></div>
                      </div>
                      <select value={tmpAssetTax} onChange={(e)=>setTmpAssetTax(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded p-1 text-[11px]"><option>資本利得/不計稅</option><option>國內利息(計入27萬)</option><option>國內股利(8.5%抵減/分開)</option><option>海外所得(計入AMT)</option><option>特定保單給付(計入AMT)</option></select>
                      <button onClick={addAssetAccount} className="w-full bg-blue-900 text-white text-[11px] py-1 rounded font-bold">配置全新子帳戶</button>
                      {assets.map(a => <div key={a.id} className="flex justify-between text-[10px] text-slate-400 mt-1"><span>{a.name} ({a.monthly_add}萬/月)</span>{a.name!=="日常活存"&&<button onClick={()=>delAsset(a.id)}>🗑️</button>}</div>)}
                    </div>
                  </div>
                )}
              </div>

              {/* 4. 國家與職業退休金專案設定 */}
              <div className="border border-slate-800 rounded-lg bg-slate-950/40">
                <button onClick={() => setActiveSection(activeSection === 'pension' ? '' : 'pension')} className="w-full bg-slate-950 px-4 py-2.5 text-left font-semibold text-xs text-slate-300 flex justify-between">
                  <span>🏛️ 4. 國家與職業退休金專案</span><span>{activeSection === 'pension' ? '▲' : '▼'}</span>
                </button>
                {activeSection === 'pension' && (
                  <div className="p-4 space-y-4 text-xs border-t border-slate-800">
                    <select value={pensionMode} onChange={(e)=>setPensionMode(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white font-bold mb-2">
                      <option>💼 一般勞工</option><option>🏛️ 公教人員</option><option>🎖️ 軍職人員</option><option>🧑‍🌾 農牧業</option><option>🏢 其他職業</option><option>🚫 暫不設定(清空)</option>
                    </select>
                    
                    {pensionMode.includes("勞工") && (
                      <div className="space-y-4">
                        <div className="bg-slate-950 p-2.5 rounded border border-slate-800 space-y-2">
                          <p className="text-[11px] font-bold text-blue-400">🛡️ 勞保與國保設定 (自動擇優引擎)</p>
                          <div className="grid grid-cols-2 gap-2">
                            <div><label>預估均薪(上限45800)</label><input type="number" value={lbSalary} onChange={(e)=>setLbSalary(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1"/></div>
                            <div><label>預計請領年齡</label><input type="number" value={lbAge} onChange={(e)=>setLbAge(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1"/></div>
                            <div><label>目前勞保年資</label><input type="number" value={lbCurrentYears} onChange={(e)=>setLbCurrentYears(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1"/></div>
                            <div><label>國保年資</label><input type="number" value={nationalYears} onChange={(e)=>setNationalYears(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1"/></div>
                          </div>
                          <label className="flex items-center gap-2"><input type="checkbox" checked={hasOldSys} onChange={(e)=>setHasOldSys(e.target.checked)}/> 具97年底前舊制年資</label>
                        </div>
                        <div className="bg-slate-950 p-2.5 rounded border border-slate-800 space-y-2">
                          <p className="text-[11px] font-bold text-blue-400">🏦 勞退新制專戶</p>
                          <div className="grid grid-cols-3 gap-2">
                            <div><label>專戶餘額(萬)</label><input type="number" value={ltBal} onChange={(e)=>setLtBal(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1"/></div>
                            <div><label>自提比例(%)</label><input type="number" value={ltVol} onChange={(e)=>setLtVol(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1"/></div>
                            <div><label>專戶報酬(%)</label><input type="number" value={ltRoi} onChange={(e)=>setLtRoi(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1"/></div>
                          </div>
                        </div>
                      </div>
                    )}

                    {pensionMode.includes("公教") && (
                      <div className="space-y-4">
                        <div className="bg-slate-950 p-2.5 rounded border border-slate-800 space-y-2">
                          <p className="text-[11px] font-bold text-purple-400">🛡️ 公保養老給付</p>
                          <select value={pbType} onChange={(e)=>setPbType(e.target.value)} className="w-full bg-slate-900 rounded p-1 mb-1"><option>按月領取 (養老年金)</option><option>一次請領 (養老給付)</option></select>
                          <div className="grid grid-cols-3 gap-2">
                            <div><label>預估保俸(元)</label><input type="number" value={pbSalary} onChange={(e)=>setPbSalary(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1"/></div>
                            <div><label>公保總年資</label><input type="number" value={pbYears} onChange={(e)=>setPbYears(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1"/></div>
                            <div><label>請領年紀</label><input type="number" value={pbAge} onChange={(e)=>setPbAge(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1"/></div>
                          </div>
                        </div>
                        <div className="bg-slate-950 p-2.5 rounded border border-slate-800 space-y-2">
                          <p className="text-[11px] font-bold text-purple-400">🏛️ 退撫金制度</p>
                          <select value={tfSys} onChange={(e)=>setTfSys(e.target.value)} className="w-full bg-slate-900 rounded p-1 mb-1"><option>舊制/現職年改 (確定給付 DB)</option><option>112年後初任 (個人專戶 DC)</option></select>
                          {tfSys.includes("舊制") ? (
                            <div className="grid grid-cols-2 gap-2">
                              <div><label>預估退休本俸(元)</label><input type="number" value={tfSalary} onChange={(e)=>setTfSalary(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1"/></div>
                              <div><label>預估退撫總年資</label><input type="number" value={tfYears} onChange={(e)=>setTfYears(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1"/></div>
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 gap-2">
                              <div><label>退撫餘額(萬)</label><input type="number" value={tfBal} onChange={(e)=>setTfBal(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1"/></div>
                              <div><label>退撫本薪(元)</label><input type="number" value={tfSal} onChange={(e)=>setTfSal(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1"/></div>
                              <div><label>自願增提(%)</label><input type="number" step="0.1" value={tfVol} onChange={(e)=>setTfVol(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1"/></div>
                              <div><label>專戶報酬(%)</label><input type="number" value={tfRoi} onChange={(e)=>setTfRoi(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1"/></div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {pensionMode.includes("軍職") && (
                      <div className="bg-slate-950 p-2.5 rounded border border-slate-800 space-y-2">
                        <select value={milType} onChange={(e)=>setMilType(e.target.value)} className="w-full bg-slate-900 rounded p-1 mb-1"><option>按月領取 (終身俸)</option><option>一次請領 (退伍金)</option></select>
                        <select value={milRank} onChange={(e)=>setMilRank(e.target.value)} className="w-full bg-slate-900 rounded p-1 mb-1"><option>士官 (最高替代率 95%)</option><option>軍官/將官 (最高替代率 90%)</option></select>
                        <div className="grid grid-cols-3 gap-2">
                          <div><label>退伍本俸(元)</label><input type="number" value={milSalary} onChange={(e)=>setMilSalary(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1"/></div>
                          <div><label>服役總年資</label><input type="number" value={milYears} onChange={(e)=>setMilYears(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1"/></div>
                          <div><label>退伍年紀</label><input type="number" value={milAge} onChange={(e)=>setMilAge(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1"/></div>
                        </div>
                      </div>
                    )}

                    {pensionMode.includes("農牧") && (
                      <div className="space-y-4">
                        <div className="bg-slate-950 p-2.5 rounded border border-slate-800 space-y-2">
                          <label className="flex items-center gap-2 text-red-400"><input type="checkbox" checked={fmIsRich} onChange={(e)=>setFmIsRich(e.target.checked)}/> 觸發排富條款(喪失津貼)</label>
                          <div><label>老農津貼起領年齡</label><input type="number" value={fmAge} onChange={(e)=>setFmAge(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1"/></div>
                        </div>
                        <div className="bg-slate-950 p-2.5 rounded border border-slate-800 space-y-2">
                          <p className="text-[11px] font-bold text-emerald-400">🚜 農民退休儲金 (農退)</p>
                          <div className="grid grid-cols-2 gap-2">
                            <div><label>專戶餘額(萬)</label><input type="number" value={fmBal} onChange={(e)=>setFmBal(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1"/></div>
                            <div><label>月投保金額(元)</label><input type="number" value={fmWage} onChange={(e)=>setFmWage(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1"/></div>
                            <div><label>自提比例(1-10%)</label><input type="number" value={fmVol} onChange={(e)=>setFmVol(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1"/></div>
                            <div><label>預期報酬(%)</label><input type="number" value={fmRoi} onChange={(e)=>setFmRoi(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1"/></div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 5. 未來重大事件與逆算器 */}
              <div className="border border-slate-800 rounded-lg bg-slate-950/40">
                <button onClick={() => setActiveSection(activeSection === 'events' ? '' : 'events')} className="w-full bg-slate-950 px-4 py-2.5 text-left font-semibold text-xs text-slate-300 flex justify-between">
                  <span>📅 5. 重大未來事件與逆算器</span><span>{activeSection === 'events' ? '▲' : '▼'}</span>
                </button>
                {activeSection === 'events' && (
                  <div className="p-4 space-y-4 text-xs border-t border-slate-800">
                    <div className="bg-slate-950 p-2.5 rounded border border-slate-800 space-y-2">
                      <div className="grid grid-cols-3 gap-2">
                        <div className="col-span-2"><label>事件名稱</label><input type="text" value={tmpEvName} onChange={(e)=>setTmpEvName(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded p-1 text-[11px]"/></div>
                        <div><label>發生年紀</label><input type="number" value={tmpEvAge} onChange={(e)=>setTmpEvAge(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1 text-[11px]"/></div>
                        <div><label>金額(萬,支出負)</label><input type="number" value={tmpEvAmt} onChange={(e)=>setTmpEvAmt(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1 text-[11px]"/></div>
                        <div className="col-span-2"><label>資金來源/去向</label>
                          <select value={tmpEvTarget} onChange={(e)=>setTmpEvTarget(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded p-1 text-[11px]">
                            <option>預設現金流</option>{assets.map(a=><option key={a.name}>{a.name}</option>)}
                            {tmpEvAmt > 0 && <option>➕ 建立全新資產</option>}
                          </select>
                        </div>
                      </div>
                      {tmpEvTarget === "➕ 建立全新資產" && tmpEvAmt > 0 && (
                        <div className="grid grid-cols-3 gap-2 border-t border-slate-800 pt-2">
                          <div><label>新資產名</label><input type="text" value={tmpEvNewName} onChange={(e)=>setTmpEvNewName(e.target.value)} className="w-full bg-slate-900 rounded p-1"/></div>
                          <div><label>主分類</label><select value={tmpEvNewType} onChange={(e)=>setTmpEvNewType(e.target.value)} className="w-full bg-slate-900 rounded p-1"><option>現金</option><option>保單</option><option>股票</option><option>不動產</option></select></div>
                          <div><label>報酬(%)</label><input type="number" value={tmpEvNewRate} onChange={(e)=>setTmpEvNewRate(Number(e.target.value))} className="w-full bg-slate-900 rounded p-1"/></div>
                        </div>
                      )}
                      <div className="flex items-center justify-between border-t border-slate-800 pt-2">
                        <label className="flex items-center gap-1 text-slate-400"><input type="checkbox" checked={evtContinuous} onChange={(e)=>setEvtContinuous(e.target.checked)}/> 🔄 持續多年</label>
                        {evtContinuous && <input type="number" placeholder="年數" value={tmpEvDuration} onChange={(e)=>setTmpEvDuration(Number(e.target.value))} className="w-16 bg-slate-900 border border-slate-700 rounded p-1 text-[11px]"/>}
                      </div>
                      <button onClick={addFutureEvent} className="w-full bg-amber-900 text-white py-1 rounded font-bold text-[11px]">設立未來財務目標</button>
                      {events.map(ev => <div key={ev.id} className="flex justify-between text-[10px] text-slate-400 mt-1"><span>{ev.label}: {ev.amount/10000}萬 {ev.duration>1?`(${ev.duration}年)`:''}</span><button onClick={()=>delEv(ev.id)}>🗑️</button></div>)}
                    </div>

                    {/* 🎯 目標達成逆算器 */}
                    <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 border-l-4 border-l-amber-500 space-y-3">
                      <p className="font-bold text-amber-400 border-b border-slate-800 pb-1">🎯 目標達成逆算器 (月定額推算)</p>
                      {futureExpensesList.length === 0 ? <p className="text-slate-500">尚無未來支出目標。</p> : (
                        futureExpensesList.map((ev: any, idx) => {
                          const yearsToGo = ev.age - currentAge;
                          const targetVal = Math.abs(ev.amount) * (ev.duration || 1);
                          // 簡單用 local state 管理這層 UI (或預設0算)
                          return <ReverseCalcRow key={ev.id || idx} label={ev.label} yearsToGo={yearsToGo} targetVal={targetVal} />;
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* 6. 負債與房產 */}
              <div className="border border-slate-800 rounded-lg bg-slate-950/40 border-l-4 border-l-orange-500">
                <button onClick={() => setActiveSection(activeSection === 'liabilities' ? '' : 'liabilities')} className="w-full bg-slate-950 px-4 py-2.5 text-left font-semibold text-xs text-slate-300 flex justify-between">
                  <span>🏠 6. 購屋購買力與信貸負債</span><span>{activeSection === 'liabilities' ? '▲' : '▼'}</span>
                </button>
                {activeSection === 'liabilities' && (
                  <div className="p-4 space-y-4 text-xs border-t border-slate-800">
                    
                    {/* 購屋購買力提示 */}
                    <div className="bg-slate-950 p-3 rounded border border-orange-900 text-orange-200 space-y-1">
                      <p className="font-bold text-orange-400">💡 購屋購買力即時推算</p>
                      {(() => {
                        if (monthlyNetFlow <= 0) return <p>目前已無剩餘現金流，暫無多餘空間承擔新貸款。</p>;
                        const r_m = (tmpHRate / 100) / 12;
                        const n_m = (tmpHYears - tmpHGrace) * 12;
                        if (n_m <= 0) return <p>寬限期設定等於或超過貸款年期，無法反推。</p>;
                        let maxPvYuan = r_m > 0 ? monthlyNetFlow * ((1 - Math.pow(1+r_m, -n_m)) / r_m) : monthlyNetFlow * n_m;
                        let maxPvWan = maxPvYuan / 10000;
                        let sugPrice = tmpHDownPct < 100 ? maxPvWan / (1 - tmpHDownPct / 100) : maxPvWan;
                        return <p>以您實質結餘 <b>{Math.round(monthlyNetFlow).toLocaleString()}</b> 元/月，安全貸款上限約 <b>{Math.round(maxPvWan)} 萬</b> (看房總價建議 <b>{Math.round(sugPrice)} 萬</b> 內)。</p>;
                      })()}
                    </div>

                    <div className="bg-slate-950 p-2.5 rounded border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between"><span className="text-[11px] font-bold text-orange-400">➕ 啟用購屋增置</span><input type="checkbox" checked={hasHouse} onChange={(e)=>setHasHouse(e.target.checked)}/></div>
                      {hasHouse && (
                        <>
                          <div className="grid grid-cols-4 gap-2 pt-1 border-t border-slate-800">
                            <div className="col-span-2"><label>名稱</label><input type="text" value={tmpHName} onChange={(e)=>setTmpHName(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded p-1"/></div>
                            <div><label>年紀</label><input type="number" value={tmpHStart} onChange={(e)=>setTmpHStart(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1"/></div>
                            <div><label>總價(萬)</label><input type="number" value={tmpHPrice} onChange={(e)=>setTmpHPrice(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1"/></div>
                          </div>
                          <div className="grid grid-cols-4 gap-2">
                            <div><label>頭期(%)</label><input type="number" value={tmpHDownPct} onChange={(e)=>setTmpHDownPct(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1"/></div>
                            <div><label>利率(%)</label><input type="number" step="0.1" value={tmpHRate} onChange={(e)=>setTmpHRate(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1"/></div>
                            <div><label>貸款年期</label><input type="number" value={tmpHYears} onChange={(e)=>setTmpHYears(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1"/></div>
                            <div><label>寬限期</label><input type="number" value={tmpHGrace} onChange={(e)=>setTmpHGrace(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1"/></div>
                          </div>
                          <div className="grid grid-cols-3 gap-2 items-center">
                            <div className="col-span-1"><label>攤還方式</label><select value={tmpHMethod} onChange={(e)=>setTmpHMethod(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded p-1"><option value="本利平均">本利平均</option><option value="本金平均">本金平均</option></select></div>
                            <div className="col-span-2 flex justify-around">
                              <label className="flex items-center gap-1"><input type="checkbox" checked={tmpHReplaceRent} onChange={(e)=>setTmpHReplaceRent(e.target.checked)}/> 取代房租</label>
                              <label className="flex items-center gap-1"><input type="checkbox" checked={tmpHClaimTax} onChange={(e)=>setTmpHClaimTax(e.target.checked)}/> 列報抵稅</label>
                            </div>
                          </div>
                          <button onClick={addMortgage} className="w-full bg-orange-900 text-white py-1 text-[11px] rounded font-bold">加入房產</button>
                        </>
                      )}
                      {mortgages.map(m => <div key={m.id} className="flex justify-between text-[10px] text-slate-400 mt-1"><span>{m.name} ({m.total_price}萬)</span><button onClick={()=>delMortgage(m.id)}>🗑️</button></div>)}
                    </div>

                    <div className="bg-slate-950 p-2.5 rounded border border-slate-800 space-y-2">
                      <p className="text-[11px] font-bold text-red-400">💳 新增信貸/其他債務</p>
                      <div className="grid grid-cols-4 gap-2">
                        <div className="col-span-2"><label>名稱</label><input type="text" value={tmpDName} onChange={(e)=>setTmpDName(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded p-1 text-[11px]"/></div>
                        <div><label>借貸年紀</label><input type="number" value={tmpDStart} onChange={(e)=>setTmpDStart(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1 text-[11px]"/></div>
                        <div><label>金額(萬)</label><input type="number" value={tmpDAmt} onChange={(e)=>setTmpDAmt(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1 text-[11px]"/></div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div><label>年期</label><input type="number" value={tmpDYears} onChange={(e)=>setTmpDYears(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1 text-[11px]"/></div>
                        <div><label>利率(%)</label><input type="number" step="0.1" value={tmpDRate} onChange={(e)=>setTmpDRate(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1 text-[11px]"/></div>
                      </div>
                      <button onClick={addDebtPlan} className="w-full bg-red-900 text-white py-1 text-[11px] rounded font-bold">綁定負債</button>
                      {debts.map(d => <div key={d.id} className="flex justify-between text-[10px] text-slate-400 mt-1"><span>{d.name}: 貸{d.loan_amount}萬</span><button onClick={()=>delDebt(d.id)}>🗑️</button></div>)}
                    </div>
                  </div>
                )}
              </div>

              {/* 7. 家族成員 */}
              <div className="border border-slate-800 rounded-lg bg-slate-950/40">
                <button onClick={() => setActiveSection(activeSection === 'family' ? '' : 'family')} className="w-full bg-slate-950 px-4 py-2.5 text-left font-semibold text-xs text-slate-300 flex justify-between">
                  <span>👨‍👩‍👧‍👦 7. 家族親屬與稅務對沖配置</span><span>{activeSection === 'family' ? '▲' : '▼'}</span>
                </button>
                {activeSection === 'family' && (
                  <div className="p-4 space-y-3 text-xs border-t border-slate-800">
                    <div className="bg-slate-950 p-2 rounded border border-slate-800 space-y-2">
                      <div className="flex justify-between font-bold text-blue-300 border-b border-slate-800 pb-1"><span>👩 配偶</span><input type="checkbox" checked={hasSpouse} onChange={(e)=>setHasSpouse(e.target.checked)}/></div>
                      {hasSpouse && (
                        <div className="grid grid-cols-2 gap-2">
                          <div><label>年紀</label><input type="number" value={spAge} onChange={(e)=>setSpAge(Number(e.target.value))} className="w-full bg-slate-900 rounded p-1"/></div>
                          <div><label>壽命</label><input type="number" value={spLife} onChange={(e)=>setSpLife(Number(e.target.value))} className="w-full bg-slate-900 rounded p-1"/></div>
                          <div><label>年薪(萬)</label><input type="number" value={spSalary} onChange={(e)=>setSpSalary(Number(e.target.value))} className="w-full bg-slate-900 rounded p-1"/></div>
                          <div><label>其他年收(萬)</label><input type="number" value={spOtherInc} onChange={(e)=>setSpOtherInc(Number(e.target.value))} className="w-full bg-slate-900 rounded p-1"/></div>
                          <div><label>淨資產(萬)</label><input type="number" value={spWealth} onChange={(e)=>setSpWealth(Number(e.target.value))} className="w-full bg-slate-900 rounded p-1"/></div>
                          <div><label>年增投入(萬)</label><input type="number" value={spAdd} onChange={(e)=>setSpAdd(Number(e.target.value))} className="w-full bg-slate-900 rounded p-1"/></div>
                          <div><label>預期報酬(%)</label><input type="number" value={spRate} onChange={(e)=>setSpRate(Number(e.target.value))} className="w-full bg-slate-900 rounded p-1"/></div>
                          <div className="col-span-2 flex justify-between"><label><input type="checkbox" checked={spDisabled} onChange={(e)=>setSpDisabled(e.target.checked)}/> 身障</label><label><input type="checkbox" checked={spLtc} onChange={(e)=>setSpLtc(e.target.checked)}/> 長照</label></div>
                        </div>
                      )}
                    </div>

                    <div className="bg-slate-950 p-2 rounded border border-slate-800 space-y-2">
                      <div className="flex justify-between font-bold text-slate-300"><span>👴 父親</span><input type="checkbox" checked={hasFather} onChange={(e)=>setHasFather(e.target.checked)}/></div>
                      {hasFather && (
                        <div className="grid grid-cols-2 gap-2 border-t border-slate-800 pt-1">
                          <div><label>年紀</label><input type="number" value={faAge} onChange={(e)=>setFaAge(Number(e.target.value))} className="w-full bg-slate-900 rounded p-1"/></div>
                          <div><label>壽命</label><input type="number" value={faLife} onChange={(e)=>setFaLife(Number(e.target.value))} className="w-full bg-slate-900 rounded p-1"/></div>
                          <label className="col-span-2"><input type="checkbox" checked={faClaimTax} onChange={(e)=>setFaClaimTax(e.target.checked)}/> 報稅扶養</label>
                          {faClaimTax && <div className="col-span-2"><label>應稅所得(萬)</label><input type="number" value={faTaxInc} onChange={(e)=>setFaTaxInc(Number(e.target.value))} className="w-full bg-slate-900 rounded p-1"/></div>}
                          <div className="col-span-2 flex justify-between"><label><input type="checkbox" checked={faDisabled} onChange={(e)=>setFaDisabled(e.target.checked)}/> 身障</label><label><input type="checkbox" checked={faLtc} onChange={(e)=>setFaLtc(e.target.checked)}/> 長照</label></div>
                        </div>
                      )}
                    </div>

                    <div className="bg-slate-950 p-2 rounded border border-slate-800 space-y-2">
                      <div className="flex justify-between font-bold text-slate-300"><span>👵 母親</span><input type="checkbox" checked={hasMother} onChange={(e)=>setHasMother(e.target.checked)}/></div>
                      {hasMother && (
                        <div className="grid grid-cols-2 gap-2 border-t border-slate-800 pt-1">
                          <div><label>年紀</label><input type="number" value={moAge} onChange={(e)=>setMoAge(Number(e.target.value))} className="w-full bg-slate-900 rounded p-1"/></div>
                          <div><label>壽命</label><input type="number" value={moLife} onChange={(e)=>setMoLife(Number(e.target.value))} className="w-full bg-slate-900 rounded p-1"/></div>
                          <label className="col-span-2"><input type="checkbox" checked={moClaimTax} onChange={(e)=>setMoClaimTax(e.target.checked)}/> 報稅扶養</label>
                          {moClaimTax && <div className="col-span-2"><label>應稅所得(萬)</label><input type="number" value={moTaxInc} onChange={(e)=>setMoTaxInc(Number(e.target.value))} className="w-full bg-slate-900 rounded p-1"/></div>}
                          <div className="col-span-2 flex justify-between"><label><input type="checkbox" checked={moDisabled} onChange={(e)=>setMoDisabled(e.target.checked)}/> 身障</label><label><input type="checkbox" checked={moLtc} onChange={(e)=>setMoLtc(e.target.checked)}/> 長照</label></div>
                        </div>
                      )}
                    </div>

                    <div className="bg-slate-950 p-2 rounded border border-slate-800 space-y-2">
                      <div className="flex justify-between font-bold text-slate-300"><span>🧓 祖父母</span><input type="checkbox" checked={hasGrand} onChange={(e)=>setHasGrand(e.target.checked)}/></div>
                      {hasGrand && (
                        <div className="grid grid-cols-2 gap-2 border-t border-slate-800 pt-1">
                          <div><label>在世人數</label><input type="number" min="0" max="4" value={gpCount} onChange={(e)=>setGpCount(Number(e.target.value))} className="w-full bg-slate-900 rounded p-1"/></div>
                          <div><label>平均現年</label><input type="number" value={gpAge} onChange={(e)=>setGpAge(Number(e.target.value))} className="w-full bg-slate-900 rounded p-1"/></div>
                          <div><label>平均壽命</label><input type="number" value={gpLife} onChange={(e)=>setGpLife(Number(e.target.value))} className="w-full bg-slate-900 rounded p-1"/></div>
                          <label className="col-span-2"><input type="checkbox" checked={gpClaimTax} onChange={(e)=>setGpClaimTax(e.target.checked)}/> 報稅扶養</label>
                          {gpClaimTax && <div className="col-span-2"><label>應稅所得(萬)</label><input type="number" value={gpTaxInc} onChange={(e)=>setGpTaxInc(Number(e.target.value))} className="w-full bg-slate-900 rounded p-1"/></div>}
                          <label className="col-span-2"><input type="checkbox" checked={gpDependent} onChange={(e)=>setGpDependent(e.target.checked)}/> 受繼承人扶養(遺產稅)</label>
                          <div><label>身障人數</label><input type="number" max={gpCount} value={gpDisabledCount} onChange={(e)=>setGpDisabledCount(Number(e.target.value))} className="w-full bg-slate-900 rounded p-1"/></div>
                          <div><label>長照人數</label><input type="number" max={gpCount} value={gpLtcCount} onChange={(e)=>setGpLtcCount(Number(e.target.value))} className="w-full bg-slate-900 rounded p-1"/></div>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <button onClick={()=>setKids([...kids, { id: `kid_${Date.now()}`, age: 0, life: 85, dep_age: 22, disabled: false, ltc: false }])} className="w-full bg-emerald-900 py-1 rounded">➕ 子女</button>
                      <button onClick={()=>setSiblings([...siblings, { id: `sib_${Date.now()}`, age: 30, life: 85, dependent: false, claim_tax: false, tax_inc: 0, disabled: false, ltc: false }])} className="w-full bg-emerald-900 py-1 rounded">➕ 手足</button>
                    </div>

                    {kids.map((k, i) => (
                      <div key={k.id} className="bg-slate-950 p-2 rounded border border-slate-800">
                        <div className="flex justify-between text-emerald-400 font-bold mb-1"><span>🟢 子女 {i+1}</span><button onClick={()=>setKids(kids.filter(x=>x.id!==k.id))}>🗑️</button></div>
                        <div className="grid grid-cols-3 gap-2">
                          <div><label>現年</label><input type="number" value={k.age} onChange={(e)=>setKids(kids.map(x=>x.id===k.id ? {...x, age: Number(e.target.value)} : x))} className="w-full bg-slate-900 rounded p-1"/></div>
                          <div><label>壽命</label><input type="number" value={k.life} onChange={(e)=>setKids(kids.map(x=>x.id===k.id ? {...x, life: Number(e.target.value)} : x))} className="w-full bg-slate-900 rounded p-1"/></div>
                          <div><label>扶養至</label><input type="number" value={k.dep_age} onChange={(e)=>setKids(kids.map(x=>x.id===k.id ? {...x, dep_age: Number(e.target.value)} : x))} className="w-full bg-slate-900 rounded p-1"/></div>
                        </div>
                        <div className="flex justify-between mt-1"><label><input type="checkbox" checked={k.disabled} onChange={(e)=>setKids(kids.map(x=>x.id===k.id ? {...x, disabled: e.target.checked} : x))}/> 身障</label><label><input type="checkbox" checked={k.ltc} onChange={(e)=>setKids(kids.map(x=>x.id===k.id ? {...x, ltc: e.target.checked} : x))}/> 長照</label></div>
                      </div>
                    ))}

                    {siblings.map((s, i) => (
                      <div key={s.id} className="bg-slate-950 p-2 rounded border border-slate-800">
                        <div className="flex justify-between text-orange-400 font-bold mb-1"><span>🟠 手足 {i+1}</span><button onClick={()=>setSiblings(siblings.filter(x=>x.id!==s.id))}>🗑️</button></div>
                        <div className="grid grid-cols-2 gap-2">
                          <div><label>現年</label><input type="number" value={s.age} onChange={(e)=>setSiblings(siblings.map(x=>x.id===s.id ? {...x, age: Number(e.target.value)} : x))} className="w-full bg-slate-900 rounded p-1"/></div>
                          <div><label>壽命</label><input type="number" value={s.life} onChange={(e)=>setSiblings(siblings.map(x=>x.id===s.id ? {...x, life: Number(e.target.value)} : x))} className="w-full bg-slate-900 rounded p-1"/></div>
                        </div>
                        <label className="block mt-1"><input type="checkbox" checked={s.claim_tax} onChange={(e)=>setSiblings(siblings.map(x=>x.id===s.id ? {...x, claim_tax: e.target.checked} : x))}/> 報稅扶養</label>
                        {s.claim_tax && <div className="mt-1"><label>應稅所得(萬)</label><input type="number" value={s.tax_inc} onChange={(e)=>setSiblings(siblings.map(x=>x.id===s.id ? {...x, tax_inc: Number(e.target.value)} : x))} className="w-full bg-slate-900 rounded p-1"/></div>}
                        <label className="block mt-1"><input type="checkbox" checked={s.dependent} onChange={(e)=>setSiblings(siblings.map(x=>x.id===s.id ? {...x, dependent: e.target.checked} : x))}/> 受繼承人扶養(遺產稅)</label>
                        <div className="flex justify-between mt-1"><label><input type="checkbox" checked={s.disabled} onChange={(e)=>setSiblings(siblings.map(x=>x.id===s.id ? {...x, disabled: e.target.checked} : x))}/> 身障</label><label><input type="checkbox" checked={s.ltc} onChange={(e)=>setSiblings(siblings.map(x=>x.id===s.id ? {...x, ltc: e.target.checked} : x))}/> 長照</label></div>
                      </div>
                    ))}

                    <div className="grid grid-cols-2 gap-2 border-t border-slate-800 pt-2">
                      <div><label>遺產日常用品(萬)</label><input type="number" value={dailyToolVal} onChange={(e)=>setDailyToolVal(Number(e.target.value))} className="w-full bg-slate-900 rounded p-1"/></div>
                      <div><label>遺產職業工具(萬)</label><input type="number" value={jobToolVal} onChange={(e)=>setJobToolVal(Number(e.target.value))} className="w-full bg-slate-900 rounded p-1"/></div>
                    </div>
                  </div>
                )}
              </div>

              {/* 8. 保單與傳承 */}
              <div className="border border-slate-800 rounded-lg bg-slate-950/40 border-l-4 border-l-purple-500">
                <button onClick={() => setActiveSection(activeSection === 'insurance' ? '' : 'insurance')} className="w-full bg-slate-950 px-4 py-2.5 text-left font-semibold text-xs text-slate-300 flex justify-between">
                  <span>🛡️ 8. 專案保單與特定受益人</span><span>{activeSection === 'insurance' ? '▲' : '▼'}</span>
                </button>
                {activeSection === 'insurance' && (
                  <div className="p-4 space-y-3 text-xs border-t border-slate-800">
                    <div className="bg-slate-950 p-3 rounded border border-slate-800 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div><label>名稱</label><input type="text" value={tmpInsName} onChange={(e)=>setTmpInsName(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded p-1"/></div>
                        <div><label>險種</label><select value={tmpInsType} onChange={(e)=>setTmpInsType(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded p-1"><option>人壽保險</option><option>年金保險</option><option>醫療/健康險</option><option>其他</option></select></div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div><label>要保人</label><select value={tmpInsApp} onChange={(e)=>setTmpInsApp(e.target.value)} className="w-full bg-slate-900 rounded p-1"><option>本人</option><option>配偶</option><option>子女</option></select></div>
                        <div><label>被保險人</label><select value={tmpInsIns} onChange={(e)=>setTmpInsIns(e.target.value)} className="w-full bg-slate-900 rounded p-1"><option>本人</option><option>配偶</option><option>子女</option></select></div>
                      </div>
                      
                      <div className="bg-slate-900 p-2 rounded">
                        <label className="text-purple-400 font-bold block mb-1">身故受益人 (可複選)</label>
                        <div className="grid grid-cols-2 gap-1 max-h-32 overflow-y-auto">
                          {getFamilyOptions().map(opt => (
                            <label key={opt} className="flex items-center gap-1 text-[10px]">
                              <input type="checkbox" checked={tmpInsBen.includes(opt)} onChange={()=>toggleInsBen(opt)} /> {opt}
                            </label>
                          ))}
                        </div>
                      </div>
                      {tmpInsBen.includes("其他(自行輸入)") && <div><label>自訂名稱</label><input type="text" value={tmpInsCustomBen} onChange={(e)=>setTmpInsCustomBen(e.target.value)} className="w-full bg-slate-900 rounded p-1"/></div>}

                      <div className="grid grid-cols-2 gap-2">
                        <div><label>分配方式</label><select value={tmpInsAlloc} onChange={(e)=>setTmpInsAlloc(e.target.value)} className="w-full bg-slate-900 rounded p-1"><option>均分比例</option><option>順位(由第一順位全額領取)</option></select></div>
                        <div><label>繳費頻率</label><select value={tmpInsPayFreq} onChange={(e)=>setTmpInsPayFreq(e.target.value)} className="w-full bg-slate-900 rounded p-1"><option>年繳</option><option>半年繳</option><option>季繳</option><option>月繳</option><option>躉繳</option></select></div>
                        <div><label>管道</label><select value={tmpInsPayMethod} onChange={(e)=>setTmpInsPayMethod(e.target.value)} className="w-full bg-slate-900 rounded p-1"><option>信用卡</option><option>轉帳</option><option>自行繳費</option></select></div>
                        <div><label>銀行</label><input type="text" value={tmpInsBank} onChange={(e)=>setTmpInsBank(e.target.value)} className="w-full bg-slate-900 rounded p-1"/></div>
                        <div><label>扣款日</label><input type="text" value={tmpInsDueDate} onChange={(e)=>setTmpInsDueDate(e.target.value)} className="w-full bg-slate-900 rounded p-1"/></div>
                      </div>

                      <div className="grid grid-cols-4 gap-2 border-t border-slate-800 pt-2">
                        <div className="col-span-2"><label>年保費(萬)</label><input type="number" value={tmpInsPremium} onChange={(e)=>setTmpInsPremium(Number(e.target.value))} className="w-full bg-slate-900 rounded p-1"/></div>
                        <div className="col-span-2"><label>剩餘年期</label><input type="number" value={tmpInsYears} onChange={(e)=>setTmpInsYears(Number(e.target.value))} className="w-full bg-slate-900 rounded p-1"/></div>
                        <div className="col-span-2"><label>目前保價(萬)</label><input type="number" value={tmpInsCv} onChange={(e)=>setTmpInsCv(Number(e.target.value))} className="w-full bg-slate-900 rounded p-1"/></div>
                        <div className="col-span-2"><label>IRR(%)</label><input type="number" step="0.1" value={tmpInsIrr} onChange={(e)=>setTmpInsIrr(Number(e.target.value))} className="w-full bg-slate-900 rounded p-1"/></div>
                        <div className="col-span-4"><label>目前身故保額(萬)</label><input type="number" value={tmpInsDb} onChange={(e)=>setTmpInsDb(Number(e.target.value))} className="w-full bg-slate-900 rounded p-1"/></div>
                        <div className="col-span-2"><label>生存還本金(萬)</label><input type="number" value={tmpInsSurv} onChange={(e)=>setTmpInsSurv(Number(e.target.value))} className="w-full bg-slate-900 rounded p-1"/></div>
                        <div className="col-span-2"><label>起領年紀</label><input type="number" value={tmpInsSurvAge} onChange={(e)=>setTmpInsSurvAge(Number(e.target.value))} className="w-full bg-slate-900 rounded p-1"/></div>
                      </div>

                      <button onClick={addInsurancePolicy} className="w-full bg-purple-900 text-white py-1 rounded font-bold mt-2">配置傳承保單</button>
                      {insurances.map(ins => <div key={ins.id} className="flex justify-between text-[10px] text-slate-400 border-t border-slate-800 pt-1 mt-1"><span>{ins.name} ({ins.pay_freq} {ins.premium}萬)</span><button onClick={()=>delIns(ins.id)}>🗑️</button></div>)}
                    </div>
                  </div>
                )}
              </div>

            </div>
            
            <button onClick={handleSimulate} disabled={isLoading} className={`w-full py-4 rounded-lg font-bold tracking-wide transition-all duration-300 shrink-0 ${isLoading ? "bg-slate-700 text-slate-400" : "bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]"}`}>
              {isLoading ? "全端精密運算中..." : "🚀 一鍵啟動全端精算"}
            </button>
          </div>

          <div className="xl:col-span-8 space-y-8">
            
            {activeTab === "main" && (
              <div className="space-y-6 animate-fade-in">
                {/* 圖表呈現 */}
                <div className="bg-slate-900 border border-slate-800 p-4 md:p-6 rounded-xl shadow-2xl flex flex-col">
  <h2 className="text-base font-semibold mb-6 text-emerald-400 flex items-center gap-2 underline underline-offset-8 decoration-emerald-500/50">
    ▍ 終身可支配淨資產與遺產稅現金風險軌跡趨勢
  </h2>
  {/* 🚀 修復關鍵：直接給定明確的高度 h-[350px]，拿掉 flex-1 與 h-full */}
  <div className="w-full h-[350px] text-xs">
                    {!simulationResult ? (
                      <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-lg text-slate-600">
                        <p className="tracking-widest mb-1 text-base">等待決策控制中樞參數裝填...</p>
                        <p className="text-xs text-slate-500">請完成左側面板設定並點擊「一鍵啟動全端精算」</p>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={simulationResult.trajectory} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                          <XAxis dataKey="年紀" stroke="#64748b" tick={{ fill: '#64748b' }}/>
                          <YAxis stroke="#64748b" tick={{ fill: '#64748b' }} tickFormatter={(v) => `${v}萬`}/>
                          <Tooltip content={<CustomTooltip />} />
                          <Legend wrapperStyle={{ paddingTop: '10px' }} />
                          <Bar dataKey="總資產_萬" name="預估總資產" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={22}/>
                          <Line type="monotone" dataKey="預估遺產稅_萬" name="預估遺產稅現金缺口" stroke="#ef4444" strokeWidth={3} dot={{ r: 2, fill: '#ef4444' }}/>
                        </ComposedChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                {/* 逐年財富軌跡數據表 (Data Grid) */}
                {simulationResult && (
                  <div className="bg-slate-900 border border-slate-800 p-4 md:p-6 rounded-xl shadow-2xl space-y-4 animate-fade-in">
                    <h2 className="text-base font-semibold text-blue-400 flex items-center gap-2 border-b border-slate-800 pb-3">
                      <span>📋 逐年現金流與稅務財富軌跡明細 (Data Grid)</span>
                    </h2>
                    <div className="overflow-x-auto max-h-[400px] border border-slate-800 rounded-lg custom-scrollbar">
                      <table className="w-full text-left border-collapse text-xs md:text-sm whitespace-nowrap">
                        <thead className="bg-slate-950 sticky top-0 z-10 shadow-md">
                          <tr className="border-b border-slate-800 text-slate-400">
                            <th className="py-3 px-4 font-semibold">年齡</th>
                            <th className="py-3 px-4 text-right font-semibold text-blue-400">預估總資產 (萬)</th>
                            <th className="py-3 px-4 text-right font-semibold text-red-400">遺產稅缺口 (萬)</th>
                            <th className="py-3 px-4 text-right font-semibold text-emerald-400">配偶請求權 (萬)</th>
                            <th className="py-3 px-4 text-right font-semibold">年金收入 (元)</th>
                            <th className="py-3 px-4 text-right font-semibold text-orange-400">應納所得稅金 (元)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 text-slate-300 font-mono">
                          {simulationResult.trajectory.map((row: any, idx: number) => (
                            <tr key={idx} className="hover:bg-slate-800/50 transition-colors">
                              <td className="py-2.5 px-4 text-center bg-slate-950/50 text-white font-bold">{row.年紀} 歲</td>
                              <td className="py-2.5 px-4 text-right text-blue-300">{row.總資產_萬?.toLocaleString()}</td>
                              <td className="py-2.5 px-4 text-right text-red-400 font-bold">{row.預估遺產稅_萬?.toLocaleString()}</td>
                              <td className="py-2.5 px-4 text-right text-emerald-400">{row.差額分配請求權?.toLocaleString()}</td>
                              <td className="py-2.5 px-4 text-right">{Math.round(row.收_年金收入 || 0).toLocaleString()}</td>
                              <td className="py-2.5 px-4 text-right text-orange-300">{Math.round(row.支_所得稅金 || 0).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 深度報表分頁表格與民法試算明細 */}
                {simulationResult && (
                  <div className="bg-slate-900 border border-slate-800 p-4 md:p-6 rounded-xl shadow-2xl space-y-4">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-800 pb-3 gap-2">
                      <h2 className="text-base font-semibold text-purple-400">🏛️ 民法應繼分與特留分保單雙軌變現分配明細表</h2>
                      <div className="flex items-center gap-3 w-full md:w-auto">
                        <span className="text-xs text-slate-400 whitespace-nowrap">模擬身故年齡:</span>
                        <input type="range" min={currentAge} max={lifeExpectancy} value={selectedReportAge} onChange={(e)=>setSelectedReportAge(Number(e.target.value))} className="w-full md:w-48 accent-blue-500"/>
                        <span className="text-blue-400 font-bold font-mono text-sm whitespace-nowrap">{selectedReportAge}歲</span>
                      </div>
                    </div>
                    {renderInheritanceTable()}
                  </div>
                )}
              </div>
            )}

            {/* ⚙️ 完美復刻 Streamlit 的 16 大法規常數調整控制台面板頁面 */}
            {activeTab === "tax" && (
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-4 animate-fade-in text-xs">
                <h2 className="text-sm font-bold text-emerald-400 pb-2 border-b border-slate-800">⚙️ 國家級稅務法規與特別扣除額參數台 (全配完全體)</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-2">
                    <p className="font-bold text-blue-300">📌 免稅額與基本扣除</p>
                    <div><label className="text-slate-500">個人免稅基準 (元)</label><input type="number" value={taxParams.exemption} onChange={(e)=>updateTaxParam("exemption", Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 p-1 rounded font-mono"/></div>
                    <div><label className="text-slate-500">標準扣除額 (元)</label><input type="number" value={taxParams.std_deduction} onChange={(e)=>updateTaxParam("std_deduction", Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 p-1 rounded font-mono"/></div>
                    <div><label className="text-slate-500">薪資特別扣除 (元)</label><input type="number" value={taxParams.salary_deduction} onChange={(e)=>updateTaxParam("salary_deduction", Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 p-1 rounded font-mono"/></div>
                  </div>

                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-2">
                    <p className="font-bold text-orange-300">📌 特定支出扣除上限</p>
                    <div><label className="text-slate-500">儲蓄投資上限 (元)</label><input type="number" value={taxParams.savings_limit} onChange={(e)=>updateTaxParam("savings_limit", Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 p-1 rounded font-mono"/></div>
                    <div><label className="text-slate-500">房屋租金扣除上限 (元)</label><input type="number" value={taxParams.rent_limit} onChange={(e)=>updateTaxParam("rent_limit", Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 p-1 rounded font-mono"/></div>
                    <div><label className="text-slate-500">房貸利息扣除上限 (元)</label><input type="number" value={taxParams.mortgage_limit} onChange={(e)=>updateTaxParam("mortgage_limit", Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 p-1 rounded font-mono"/></div>
                  </div>

                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-2">
                    <p className="font-bold text-purple-300">📌 進階 AMT 最低稅負護城河</p>
                    <div><label className="text-slate-500">AMT 免稅起徵門檻 (元)</label><input type="number" value={taxParams.amt_threshold} onChange={(e)=>updateTaxParam("amt_threshold", Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 p-1 rounded font-mono"/></div>
                    <div><label className="text-slate-500">每人基本生活費額度 (元)</label><input type="number" value={taxParams.basic_living} onChange={(e)=>updateTaxParam("basic_living", Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 p-1 rounded font-mono"/></div>
                    <div><label className="text-slate-500">長照特別扣除額 (元)</label><input type="number" value={taxParams.ltc_deduction} onChange={(e)=>updateTaxParam("ltc_deduction", Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 p-1 rounded font-mono"/></div>
                  </div>
                </div>

                {snapReport && (
                  <div className="bg-slate-950 p-4 rounded-xl border-2 border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 leading-relaxed font-mono">
                    <div className="space-y-1">
                      <p className="text-orange-400 font-bold">1️⃣ 當年所得稅拆解過程 ({selectedReportAge}歲)</p>
                      <p>➕ 綜合所得總額：{Math.round(snapReport.稅_綜合所得總額 * 10000).toLocaleString()} 元</p>
                      <p>➖ 最佳化免稅與扣除：-{Math.round((snapReport.稅_免稅額 + snapReport.稅_扣除額 + snapReport.稅_特扣總計 + snapReport.稅_基本差額) * 10000).toLocaleString()} 元</p>
                      <p className="border-t border-slate-800 pt-1 text-white font-bold">🟰 綜合所得淨額：{Math.round(snapReport.稅_綜合所得淨額 * 10000).toLocaleString()} 元</p>
                      <p className="text-emerald-400 font-bold">🧾 核定一般應納稅額：{Math.round(snapReport.稅_一般應納稅額 * 10000).toLocaleString()} 元 ({snapReport.扣除額類型}計稅 + {snapReport.股利計稅})</p>
                    </div>
                    <div className="space-y-1 border-l-0 md:border-l border-slate-800 pl-0 md:pl-4">
                      <p className="text-purple-400 font-bold">2️⃣ 最低稅負制 (AMT) 檢驗線</p>
                      <p>➕ AMT 基本所得額基數：{Math.round(snapReport.稅_AMT基本所得額 * 10000).toLocaleString()} 元</p>
                      <p>➖ 法定起徵免稅額度：-{Math.round(taxParams.amt_threshold).toLocaleString()} 元</p>
                      <p className="border-t border-slate-800 pt-1 text-white font-bold">🟰 AMT 應納稅額：{Math.round(snapReport.稅_AMT稅額 * 10000).toLocaleString()} 元</p>
                      <p className="text-amber-400 font-bold">🎯 最終應納稅額 (兩者取其高)：{Math.round(snapReport.支_所得稅金).toLocaleString()} 元 (觸發AMT: {snapReport.觸發AMT})</p>
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>
    </main>
  );
}

// 輔助組件：目標達成逆算器單列 UI
function ReverseCalcRow({ label, yearsToGo, targetVal }: { label: string, yearsToGo: number, targetVal: number }) {
  const [roi, setRoi] = useState(0);
  const rm = (roi / 100) / 12;
  const nm = yearsToGo * 12;
  const monthlyNeed = rm > 0 ? (targetVal * rm) / (Math.pow(1+rm, nm) - 1) : (targetVal / nm);
  
  return (
    <div className="flex justify-between items-center text-[11px] border-b border-slate-800/50 pb-1">
      <div className="w-1/3 truncate text-slate-300" title={label}>{label} <br/><span className="text-[9px] text-slate-500">({yearsToGo}年,需{targetVal/10000}萬)</span></div>
      <div className="w-1/4 flex items-center gap-1">ROI<input type="number" value={roi} onChange={e=>setRoi(Number(e.target.value))} className="w-12 bg-slate-900 p-0.5 rounded"/>%</div>
      <div className="w-1/3 text-right text-emerald-400 font-mono">{(monthlyNeed || 0).toLocaleString(undefined, {maximumFractionDigits:0})} 元/月</div>
    </div>
  );
}