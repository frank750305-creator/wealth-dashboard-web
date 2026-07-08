import { useCallback, useMemo, useState } from "react";
import { buildAssetAccount } from "@/lib/recordBuilders";
import type { AssetAccountRecord } from "@/types/wealth";

const DEFAULT_ASSET_ACCOUNT: AssetAccountRecord = {
  id: "asset_cash_default",
  name: "日常活存",
  type: "現金",
  value: 0.0,
  rate: 0.0,
  monthly_add: 0.0,
  add_years: 0,
  tax_type: "國內利息(計入27萬)",
};

export function useAssetPoolState() {
  const [assets, setAssets] = useState<AssetAccountRecord[]>([DEFAULT_ASSET_ACCOUNT]);
  const [tmpAssetCat, setTmpAssetCat] = useState("現金");
  const [tmpAssetName, setTmpAssetName] = useState("我的現金");
  const [tmpAssetVal, setTmpAssetVal] = useState(0);
  const [tmpAssetMonthly, setTmpAssetMonthly] = useState(0);
  const [tmpAssetAddYears, setTmpAssetAddYears] = useState(35);
  const [tmpAssetRate, setTmpAssetRate] = useState(0.0);
  const [tmpAssetTax, setTmpAssetTax] = useState("資本利得/不計稅");

  const addAssetAccount = useCallback(() => {
    setAssets((prev) => {
      if (prev.find((asset) => asset.name === tmpAssetName)) {
        alert("子帳戶名稱已存在！");
        return prev;
      }

      return [
        ...prev,
        buildAssetAccount({
          category: tmpAssetCat,
          name: tmpAssetName,
          value: tmpAssetVal,
          rate: tmpAssetRate,
          monthlyAdd: tmpAssetMonthly,
          addYears: tmpAssetAddYears,
          taxType: tmpAssetTax,
        }),
      ];
    });
  }, [
    tmpAssetAddYears,
    tmpAssetCat,
    tmpAssetMonthly,
    tmpAssetName,
    tmpAssetRate,
    tmpAssetTax,
    tmpAssetVal,
  ]);

  const delAsset = useCallback((id: string) => {
    setAssets((prev) => prev.filter((asset) => asset.id !== id));
  }, []);

  const assetPoolPanelProps = useMemo(() => ({
    assets,
    tmpAssetCat,
    onTmpAssetCatChange: setTmpAssetCat,
    tmpAssetName,
    onTmpAssetNameChange: setTmpAssetName,
    tmpAssetVal,
    onTmpAssetValChange: setTmpAssetVal,
    tmpAssetRate,
    onTmpAssetRateChange: setTmpAssetRate,
    tmpAssetMonthly,
    onTmpAssetMonthlyChange: setTmpAssetMonthly,
    tmpAssetAddYears,
    onTmpAssetAddYearsChange: setTmpAssetAddYears,
    tmpAssetTax,
    onTmpAssetTaxChange: setTmpAssetTax,
    onAddAssetAccount: addAssetAccount,
    onDeleteAsset: delAsset,
  }), [
    addAssetAccount,
    assets,
    delAsset,
    tmpAssetAddYears,
    tmpAssetCat,
    tmpAssetMonthly,
    tmpAssetName,
    tmpAssetRate,
    tmpAssetTax,
    tmpAssetVal,
  ]);

  return useMemo(() => ({
    assets,
    assetPoolPanelProps,
  }), [assetPoolPanelProps, assets]);
}
