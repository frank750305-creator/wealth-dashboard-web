export type PensionResult = {
  annuity_start_age: number;
  annuity_m_amt_wan: number;
  lump_sum_wan: number;
  lump_sum_age: number;
  acct_bal_wan: number;
  acct_add_wan: number;
  acct_roi: number;
  vol_deduct_wan: number;
};

type PensionPlan = {
  type: "monthly" | "lump";
  val: number;
};

export type PensionInput = {
  pensionMode: string;
  currentAge: number;
  retireAge: number;
  mainSalary: number;
  lbSalary: number;
  lbCurrentYears: number;
  nationalYears: number;
  lbAge: number;
  hasOldSys: boolean;
  lbSelectedPlan: string;
  ltBal: number;
  ltVol: number;
  ltRoi: number;
  pbSalary: number;
  pbYears: number;
  pbAge: number;
  pbType: string;
  tfSys: string;
  tfSalary: number;
  tfYears: number;
  tfBal: number;
  tfSal: number;
  tfVol: number;
  tfRoi: number;
  milRank: string;
  milSalary: number;
  milYears: number;
  milAge: number;
  milType: string;
  fmIsRich: boolean;
  fmAge: number;
  fmBal: number;
  fmWage: number;
  fmVol: number;
  fmRoi: number;
  oaAmt: number;
  oaAge: number;
  opBal: number;
  opAdd: number;
  opDeduct: number;
  opRoi: number;
};

export function calculatePension(input: PensionInput): PensionResult {
  const p: PensionResult = {
    annuity_start_age: 65,
    annuity_m_amt_wan: 0,
    lump_sum_wan: 0,
    lump_sum_age: 65,
    acct_bal_wan: 0,
    acct_add_wan: 0,
    acct_roi: 0,
    vol_deduct_wan: 0,
  };

  if (!input.pensionMode || input.pensionMode.includes("清空")) return p;

  if (input.pensionMode.includes("勞工")) {
    const calcLaborAnnuity = (years: number, offset: number) => {
      if (input.lbSalary <= 0 || years <= 0) return 0;
      const adj = 1.0 + (offset * 0.04);
      return Math.floor(Math.max((input.lbSalary * years * 0.00775) + 3000, input.lbSalary * years * 0.0155) * adj);
    };
    const calcNationalAnnuity = (years: number, isEligibleForA: boolean) => {
      if (isEligibleForA) return Math.floor(Math.max((19761 * years * 0.0065) + 3772, 19761 * years * 0.013));
      return Math.floor(19761 * years * 0.013);
    };

    const futureYears = Math.max(0, input.retireAge - input.currentAge);
    const totalLbYears = input.lbCurrentYears + futureYears;
    const offset = Math.max(-5, Math.min(5, input.lbAge - 65));

    const plans: Record<string, PensionPlan> = {};
    if (totalLbYears < 15) plans["老年一次金 (新制)"] = { type: "lump", val: input.lbSalary * Math.min(totalLbYears, 60) };
    if (input.hasOldSys) plans["一次請領老年給付 (舊制)"] = { type: "lump", val: input.lbSalary * Math.min(Math.min(totalLbYears, 15) * 1 + Math.max(0, Math.min(totalLbYears - 15, 15)) * 2, 45) };

    if (totalLbYears >= 15) {
      plans["純勞保年金 + 國保(B式)"] = { type: "monthly", val: calcLaborAnnuity(totalLbYears, offset) + (input.nationalYears > 0 ? calcNationalAnnuity(input.nationalYears, false) : 0) };
    } else if (totalLbYears < 15 && (totalLbYears + input.nationalYears) >= 15 && input.lbAge >= 65) {
      plans["勞國保年資併計雙年金"] = { type: "monthly", val: calcLaborAnnuity(totalLbYears, 0) + calcNationalAnnuity(input.nationalYears, false) };
    } else if (input.nationalYears > 0 && input.lbAge >= 65) {
      plans["純國保年金 (A/B擇優)"] = { type: "monthly", val: calcNationalAnnuity(input.nationalYears, true) };
    }

    if (Object.keys(plans).length > 0) {
      const selected = plans[input.lbSelectedPlan] || Object.values(plans)[0];
      if (selected.type === "monthly") {
        p.annuity_start_age = input.lbAge;
        p.annuity_m_amt_wan = selected.val / 10000;
      } else {
        p.lump_sum_age = input.lbAge;
        p.lump_sum_wan = selected.val / 10000;
      }
    }

    p.acct_bal_wan = input.ltBal;
    p.acct_add_wan = (Math.min(input.mainSalary, 150000) * (0.06 + input.ltVol / 100)) / 10000;
    p.acct_roi = input.ltRoi;
    p.vol_deduct_wan = (Math.min(input.mainSalary, 150000) * (input.ltVol / 100)) / 10000;
  } else if (input.pensionMode.includes("公教")) {
    if (input.pbType.includes("按月")) {
      p.annuity_start_age = input.pbAge;
      p.annuity_m_amt_wan += (input.pbSalary * Math.min(input.pbYears, 35) * 0.013) / 10000;
    } else {
      p.lump_sum_age = input.pbAge;
      p.lump_sum_wan += (input.pbSalary * Math.min(input.pbYears * 1.2, 42)) / 10000;
    }

    if (input.tfSys.includes("舊制")) {
      const maxRatio = Math.min(0.75, Math.max(0.0, 0.375 + (input.tfYears - 15) * 0.015));
      p.annuity_start_age = input.pbAge;
      p.annuity_m_amt_wan += ((input.tfSalary * 2) * maxRatio) / 10000;
    } else {
      p.acct_bal_wan = input.tfBal;
      p.acct_add_wan = ((input.tfSal * 2) * (0.15 + input.tfVol / 100)) / 10000;
      p.acct_roi = input.tfRoi;
      p.vol_deduct_wan = ((input.tfSal * 2) * (0.0525 + input.tfVol / 100)) / 10000;
    }
  } else if (input.pensionMode.includes("軍職")) {
    if (input.milType.includes("按月") && input.milYears >= 20) {
      const ratio = Math.min(input.milRank.includes("士官") ? 0.95 : 0.90, 0.55 + (input.milYears - 20) * 0.02);
      p.annuity_start_age = input.milAge;
      p.annuity_m_amt_wan += ((input.milSalary * 2) * ratio) / 10000;
    } else if (input.milType.includes("一次")) {
      p.lump_sum_age = input.milAge;
      p.lump_sum_wan += ((input.milSalary * 2) * Math.min(Math.min(input.milYears, 15) * 1.5 + Math.max(0, input.milYears - 15) * 2.0, 53)) / 10000;
    }
  } else if (input.pensionMode.includes("農牧")) {
    if (!input.fmIsRich) {
      p.annuity_start_age = input.fmAge;
      p.annuity_m_amt_wan += 8080 / 10000;
    }
    p.acct_bal_wan = input.fmBal;
    p.acct_add_wan = (input.fmWage * (input.fmVol / 100) * 2) / 10000;
    p.acct_roi = input.fmRoi;
    p.vol_deduct_wan = (input.fmWage * (input.fmVol / 100)) / 10000;
  } else {
    p.annuity_start_age = input.oaAge;
    p.annuity_m_amt_wan += input.oaAmt;
    p.acct_bal_wan = input.opBal;
    p.acct_add_wan = input.opAdd;
    p.acct_roi = input.opRoi;
    p.vol_deduct_wan = input.opDeduct;
  }

  return p;
}
