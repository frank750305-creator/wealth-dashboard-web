import type { PensionResult } from "@/lib/pension";

export type TaxParams = Record<string, number>;

export type ExtraIncomeRecord = {
  id: string;
  name: string;
  type: string;
  monthly_amt: number;
};

export type AssetAccountRecord = {
  id: string;
  name: string;
  type: string;
  value: number;
  rate: number;
  monthly_add: number;
  add_years: number;
  tax_type: string;
};

export type MortgageRecord = {
  id: string;
  name: string;
  start: number;
  total_price: number;
  loan_amount: number;
  years: number;
  grace: number;
  rate: number;
  method: string;
  replace_rent: boolean;
  claim_tax: boolean;
  monthly_pay: number;
};

export type DebtRecord = {
  id: string;
  name: string;
  start: number;
  loan_amount: number;
  years: number;
  rate: number;
  monthly_pay: number;
};

export type InsuranceRecord = {
  id: string;
  name: string;
  type: string;
  app: string;
  ins: string;
  ben: string[];
  custom_ben: string;
  ben_allocation: string;
  pay_freq: string;
  pay_method: string;
  bank: string;
  due_date: string;
  premium: number;
  years: number;
  cv: number;
  irr: number;
  db: number;
  survival: number;
  survival_age: number;
};

export type FutureEventNewAsset = {
  name: string;
  type: string;
  rate: number;
  tax_type: string;
};

export type FutureEventRecord = {
  id: string;
  label: string;
  age: number;
  amount: number;
  target: string;
  duration: number;
  new_asset: FutureEventNewAsset | null;
};

export type KidRecord = {
  id: string;
  age: number;
  life: number;
  dep_age: number;
  disabled: boolean;
  ltc: boolean;
};

export type SiblingRecord = {
  id: string;
  age: number;
  life: number;
  dependent: boolean;
  claim_tax: boolean;
  tax_inc: number;
  disabled: boolean;
  ltc: boolean;
};

export type AliveHeir = {
  name: string;
};

export type AliveHeirs = {
  配偶: AliveHeir[];
  子女: AliveHeir[];
  父母: AliveHeir[];
  兄弟姊妹: AliveHeir[];
  祖父母: AliveHeir[];
};

export type WealthRecord = Record<string, unknown> & {
  年紀: number;
  總資產?: number;
  退休金專戶?: number;
  預估遺產稅?: number;
  差額分配請求權?: number;
  收_年金收入?: number;
  支_所得稅金: number;
  民法繼承基數?: number;
  保單理賠分配?: Record<string, number>;
  存活字典?: Partial<AliveHeirs>;
  稅_綜合所得總額: number;
  稅_免稅額: number;
  稅_扣除額: number;
  稅_特扣總計: number;
  稅_基本差額: number;
  稅_綜合所得淨額: number;
  稅_一般應納稅額: number;
  稅_AMT基本所得額: number;
  稅_AMT稅額: number;
  扣除額類型: string;
  股利計稅: string;
  觸發AMT: string | boolean;
};

export type SimulationFamilyPayload = {
  has_spouse: boolean;
  sp_age: number;
  sp_life: number;
  sp_wealth: number;
  sp_add: number;
  sp_rate: number;
  sp_salary: number;
  sp_other_inc: number;
  sp_disabled: boolean;
  sp_ltc: boolean;
  has_father: boolean;
  fa_age: number;
  fa_life: number;
  fa_claim_tax: boolean;
  fa_tax_inc: number;
  fa_disabled: boolean;
  fa_ltc: boolean;
  has_mother: boolean;
  mo_age: number;
  mo_life: number;
  mo_claim_tax: boolean;
  mo_tax_inc: number;
  mo_disabled: boolean;
  mo_ltc: boolean;
  has_grand: boolean;
  gp_count: number;
  gp_age: number;
  gp_life: number;
  gp_claim_tax: boolean;
  gp_tax_inc: number;
  gp_dependent: boolean;
  gp_disabled_count: number;
  gp_ltc_count: number;
  kids: KidRecord[];
  siblings: SiblingRecord[];
  daily_tool_val: number;
  job_tool_val: number;
};

export type SimulationPayload = {
  timeline: {
    current_age: number;
    life_expectancy: number;
    retire_age: number;
    salary_growth: number;
    inflation_rate: number;
    replacement_rate: number;
    roi_after_retire: number;
  };
  assets: AssetAccountRecord[];
  insurances: InsuranceRecord[];
  mortgages: MortgageRecord[];
  debts: DebtRecord[];
  extra_incomes: ExtraIncomeRecord[];
  events: FutureEventRecord[];
  family: SimulationFamilyPayload;
  pension: PensionResult;
  tax_params: TaxParams;
  main_salary: number;
  base_m_exp: number;
  m_rent: number;
  m_insurance: number;
};

export type SimulationResult = {
  trajectory: WealthRecord[];
  first_year_loan_pay?: number;
  first_year_tax?: number;
};
