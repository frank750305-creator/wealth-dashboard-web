import type { TaxParams } from "@/types/wealth";

export const DEFAULT_TAX_PARAMS: TaxParams = {
  exemption: 97000,
  std_deduction: 131000,
  salary_deduction: 218000,
  inc_disabled_ded: 218000,
  savings_limit: 270000,
  amt_threshold: 7500000,
  rent_limit: 180000,
  mortgage_limit: 300000,
  ins_limit: 24000,
  retire_exempt: 814000,
  manual_itemized: 0,
  basic_living: 218000,
  ltc_deduction: 120000,
  preschool_1st: 120000,
  preschool_2nd: 150000,
};

export function toWanTaxParams(params: TaxParams): TaxParams {
  return Object.fromEntries(
    Object.entries(params).map(([key, value]) => [key, value / 10000]),
  ) as TaxParams;
}
