import type { PensionResult } from "@/lib/pension";
import { toWanTaxParams } from "@/lib/taxParams";
import type {
  AssetAccountRecord,
  DebtRecord,
  ExtraIncomeRecord,
  FutureEventRecord,
  InsuranceRecord,
  KidRecord,
  MortgageRecord,
  SimulationPayload,
  SiblingRecord,
  TaxParams,
} from "@/types/wealth";

export type BuildSimulationPayloadInput = {
  currentAge: number;
  lifeExpectancy: number;
  retireAge: number;
  salaryGrowth: number;
  inflationRate: number;
  replacementRate: number;
  roiAfterRetire: number;
  assets: AssetAccountRecord[];
  insurances: InsuranceRecord[];
  mortgages: MortgageRecord[];
  debts: DebtRecord[];
  extraIncomes: ExtraIncomeRecord[];
  events: FutureEventRecord[];
  pension: PensionResult;
  taxParams: TaxParams;
  mainSalary: number;
  baseExp: number;
  mRent: number;
  mInsurance: number;
  family: {
    hasSpouse: boolean;
    spAge: number;
    spLife: number;
    spWealth: number;
    spAdd: number;
    spRate: number;
    spSalary: number;
    spOtherInc: number;
    spDisabled: boolean;
    spLtc: boolean;
    hasFather: boolean;
    faAge: number;
    faLife: number;
    faClaimTax: boolean;
    faTaxInc: number;
    faDisabled: boolean;
    faLtc: boolean;
    hasMother: boolean;
    moAge: number;
    moLife: number;
    moClaimTax: boolean;
    moTaxInc: number;
    moDisabled: boolean;
    moLtc: boolean;
    hasGrand: boolean;
    gpCount: number;
    gpAge: number;
    gpLife: number;
    gpClaimTax: boolean;
    gpTaxInc: number;
    gpDependent: boolean;
    gpDisabledCount: number;
    gpLtcCount: number;
    kids: KidRecord[];
    siblings: SiblingRecord[];
    dailyToolVal: number;
    jobToolVal: number;
  };
};

export function buildSimulationPayload(input: BuildSimulationPayloadInput): SimulationPayload {
  const tpWan = toWanTaxParams(input.taxParams);

  return {
    timeline: {
      current_age: input.currentAge,
      life_expectancy: input.lifeExpectancy,
      retire_age: input.retireAge,
      salary_growth: input.salaryGrowth / 100,
      inflation_rate: input.inflationRate / 100,
      replacement_rate: input.replacementRate / 100,
      roi_after_retire: input.roiAfterRetire / 100,
    },
    assets: input.assets.map((asset) => ({ ...asset, rate: asset.rate / 100 })),
    insurances: input.insurances.map((insurance) => ({ ...insurance, irr: insurance.irr / 100 })),
    mortgages: input.mortgages,
    debts: input.debts,
    extra_incomes: input.extraIncomes,
    events: input.events,
    family: {
      has_spouse: input.family.hasSpouse,
      sp_age: input.family.spAge,
      sp_life: input.family.spLife,
      sp_wealth: input.family.spWealth,
      sp_add: input.family.spAdd,
      sp_rate: input.family.spRate,
      sp_salary: input.family.spSalary,
      sp_other_inc: input.family.spOtherInc,
      sp_disabled: input.family.spDisabled,
      sp_ltc: input.family.spLtc,
      has_father: input.family.hasFather,
      fa_age: input.family.faAge,
      fa_life: input.family.faLife,
      fa_claim_tax: input.family.faClaimTax,
      fa_tax_inc: input.family.faTaxInc,
      fa_disabled: input.family.faDisabled,
      fa_ltc: input.family.faLtc,
      has_mother: input.family.hasMother,
      mo_age: input.family.moAge,
      mo_life: input.family.moLife,
      mo_claim_tax: input.family.moClaimTax,
      mo_tax_inc: input.family.moTaxInc,
      mo_disabled: input.family.moDisabled,
      mo_ltc: input.family.moLtc,
      has_grand: input.family.hasGrand,
      gp_count: input.family.gpCount,
      gp_age: input.family.gpAge,
      gp_life: input.family.gpLife,
      gp_claim_tax: input.family.gpClaimTax,
      gp_tax_inc: input.family.gpTaxInc,
      gp_dependent: input.family.gpDependent,
      gp_disabled_count: input.family.gpDisabledCount,
      gp_ltc_count: input.family.gpLtcCount,
      kids: input.family.kids.map((kid) => ({
        id: kid.id,
        age: kid.age,
        dep_age: kid.dep_age,
        life: kid.life,
        disabled: kid.disabled,
        ltc: kid.ltc,
      })),
      siblings: input.family.siblings.map((sibling) => ({
        id: sibling.id,
        age: sibling.age,
        life: sibling.life,
        claim_tax: sibling.claim_tax,
        tax_inc: sibling.tax_inc,
        dependent: sibling.dependent,
        disabled: sibling.disabled,
        ltc: sibling.ltc,
      })),
      daily_tool_val: input.family.dailyToolVal,
      job_tool_val: input.family.jobToolVal,
    },
    pension: input.pension,
    tax_params: tpWan,
    main_salary: input.mainSalary,
    base_m_exp: input.baseExp,
    m_rent: input.mRent,
    m_insurance: input.mInsurance,
  };
}
