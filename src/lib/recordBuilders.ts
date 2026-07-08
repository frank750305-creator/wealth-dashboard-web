import { calculateDebtMonthlyPayment, calculateMortgageLoanWan, calculateMortgageMonthlyPayment } from "@/lib/loans";
import type {
  AssetAccountRecord,
  DebtRecord,
  ExtraIncomeRecord,
  FutureEventRecord,
  InsuranceRecord,
  MortgageRecord,
} from "@/types/wealth";

type BuildExtraIncomeInput = {
  name: string;
  type: string;
  monthlyAmt: number;
  now?: number;
};

type BuildAssetAccountInput = {
  category: string;
  name: string;
  value: number;
  rate: number;
  monthlyAdd: number;
  addYears: number;
  taxType: string;
  now?: number;
};

type BuildMortgageInput = {
  name: string;
  startAge: number;
  priceWan: number;
  downPaymentPct: number;
  annualRatePct: number;
  years: number;
  graceYears: number;
  method: string;
  replaceRent: boolean;
  claimTax: boolean;
  now?: number;
};

type BuildDebtPlanInput = {
  name: string;
  startAge: number;
  amountWan: number;
  years: number;
  annualRatePct: number;
  now?: number;
};

type BuildInsurancePolicyInput = {
  name: string;
  type: string;
  applicant: string;
  insured: string;
  beneficiaries: string[];
  customBeneficiary: string;
  allocation: string;
  payFrequency: string;
  payMethod: string;
  bank: string;
  dueDate: string;
  premiumWan: number;
  years: number;
  cashValueWan: number;
  irrPct: number;
  deathBenefitWan: number;
  survivalWan: number;
  survivalAge: number;
  now?: number;
};

type BuildFutureEventInput = {
  label: string;
  age: number;
  amountWan: number;
  target: string;
  continuous: boolean;
  duration: number;
  newAssetName: string;
  newAssetType: string;
  newAssetRatePct: number;
  now?: number;
};

export function buildExtraIncome({
  name,
  type,
  monthlyAmt,
  now = Date.now(),
}: BuildExtraIncomeInput): ExtraIncomeRecord {
  return {
    id: `inc_${now}`,
    name,
    type,
    monthly_amt: monthlyAmt,
  };
}

export function buildAssetAccount({
  category,
  name,
  value,
  rate,
  monthlyAdd,
  addYears,
  taxType,
  now = Date.now(),
}: BuildAssetAccountInput): AssetAccountRecord {
  return {
    id: `ast_${now}`,
    name,
    type: category,
    value,
    rate,
    monthly_add: monthlyAdd,
    add_years: addYears,
    tax_type: taxType,
  };
}

export function buildMortgage({
  name,
  startAge,
  priceWan,
  downPaymentPct,
  annualRatePct,
  years,
  graceYears,
  method,
  replaceRent,
  claimTax,
  now = Date.now(),
}: BuildMortgageInput): MortgageRecord {
  return {
    id: `h_${now}`,
    name,
    start: startAge,
    total_price: priceWan,
    loan_amount: calculateMortgageLoanWan(priceWan, downPaymentPct),
    years,
    grace: graceYears,
    rate: annualRatePct,
    method,
    replace_rent: replaceRent,
    claim_tax: claimTax,
    monthly_pay: calculateMortgageMonthlyPayment({
      priceWan,
      downPaymentPct,
      annualRatePct,
      years,
      graceYears,
      method,
    }),
  };
}

export function buildDebtPlan({
  name,
  startAge,
  amountWan,
  years,
  annualRatePct,
  now = Date.now(),
}: BuildDebtPlanInput): DebtRecord {
  return {
    id: `d_${now}`,
    name,
    start: startAge,
    loan_amount: amountWan,
    years,
    rate: annualRatePct,
    monthly_pay: calculateDebtMonthlyPayment(amountWan, annualRatePct, years),
  };
}

export function buildInsurancePolicy({
  name,
  type,
  applicant,
  insured,
  beneficiaries,
  customBeneficiary,
  allocation,
  payFrequency,
  payMethod,
  bank,
  dueDate,
  premiumWan,
  years,
  cashValueWan,
  irrPct,
  deathBenefitWan,
  survivalWan,
  survivalAge,
  now = Date.now(),
}: BuildInsurancePolicyInput): InsuranceRecord {
  return {
    id: `ins_${now}`,
    name,
    type,
    app: applicant,
    ins: insured,
    ben: beneficiaries,
    custom_ben: customBeneficiary,
    ben_allocation: allocation,
    pay_freq: payFrequency,
    pay_method: payMethod,
    bank,
    due_date: dueDate,
    premium: premiumWan,
    years,
    cv: cashValueWan,
    irr: irrPct,
    db: deathBenefitWan,
    survival: survivalWan,
    survival_age: survivalAge,
  };
}

export function buildFutureEvent({
  label,
  age,
  amountWan,
  target,
  continuous,
  duration,
  newAssetName,
  newAssetType,
  newAssetRatePct,
  now = Date.now(),
}: BuildFutureEventInput): FutureEventRecord {
  return {
    id: `ev_${now}`,
    label,
    age,
    amount: amountWan * 10000,
    target,
    duration: continuous ? duration : 1,
    new_asset: target === "➕ 建立全新資產"
      ? {
          name: newAssetName,
          type: newAssetType,
          rate: newAssetRatePct / 100,
          tax_type: "資本利得/不計稅",
        }
      : null,
  };
}
