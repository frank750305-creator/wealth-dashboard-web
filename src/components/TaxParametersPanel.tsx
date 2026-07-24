import type { DashboardTab } from "@/types/dashboard";
import type { TaxParams, WealthRecord } from "@/types/wealth";

type TaxParametersPanelProps = {
  taxParams: TaxParams;
  snapReport?: WealthRecord | null;
  selectedReportAge: number;
  onTaxParamChange: (key: string, value: number) => void;
  onNavigate?: (tab: DashboardTab) => void;
};

export function TaxParametersPanel({
  taxParams,
  snapReport,
  selectedReportAge,
  onTaxParamChange,
  onNavigate,
}: TaxParametersPanelProps) {
  return (
    <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-4 animate-fade-in text-xs">
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <p className="text-[10px] font-mono text-slate-500">TAX RULE CONFIGURATION</p>
          <h2 className="mt-1 text-base font-bold text-emerald-300">稅務規則設定</h2>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-500">
            這裡只管理免稅額、扣除額、最低稅負與法規假設；完整現金流、資產與傳承結論放在財富精算工作台。
          </p>
        </div>
        {onNavigate ? (
          <button
            type="button"
            onClick={() => onNavigate("main")}
            className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-bold text-slate-200 hover:border-cyan-700 hover:text-cyan-100"
          >
            查看完整精算結果
          </button>
        ) : null}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-2">
          <p className="font-bold text-blue-300">免稅額與基本扣除</p>
          <div><label className="text-slate-500">個人免稅基準 (元)</label><input type="number" value={taxParams.exemption} onChange={(e) => onTaxParamChange("exemption", Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 p-1 rounded font-mono" /></div>
          <div><label className="text-slate-500">標準扣除額 (元)</label><input type="number" value={taxParams.std_deduction} onChange={(e) => onTaxParamChange("std_deduction", Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 p-1 rounded font-mono" /></div>
          <div><label className="text-slate-500">薪資特別扣除 (元)</label><input type="number" value={taxParams.salary_deduction} onChange={(e) => onTaxParamChange("salary_deduction", Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 p-1 rounded font-mono" /></div>
        </div>

        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-2">
          <p className="font-bold text-orange-300">特定支出扣除上限</p>
          <div><label className="text-slate-500">儲蓄投資上限 (元)</label><input type="number" value={taxParams.savings_limit} onChange={(e) => onTaxParamChange("savings_limit", Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 p-1 rounded font-mono" /></div>
          <div><label className="text-slate-500">房屋租金扣除上限 (元)</label><input type="number" value={taxParams.rent_limit} onChange={(e) => onTaxParamChange("rent_limit", Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 p-1 rounded font-mono" /></div>
          <div><label className="text-slate-500">房貸利息扣除上限 (元)</label><input type="number" value={taxParams.mortgage_limit} onChange={(e) => onTaxParamChange("mortgage_limit", Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 p-1 rounded font-mono" /></div>
        </div>

        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-2">
          <p className="font-bold text-purple-300">AMT 最低稅負參數</p>
          <div><label className="text-slate-500">AMT 免稅起徵門檻 (元)</label><input type="number" value={taxParams.amt_threshold} onChange={(e) => onTaxParamChange("amt_threshold", Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 p-1 rounded font-mono" /></div>
          <div><label className="text-slate-500">每人基本生活費額度 (元)</label><input type="number" value={taxParams.basic_living} onChange={(e) => onTaxParamChange("basic_living", Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 p-1 rounded font-mono" /></div>
          <div><label className="text-slate-500">長照特別扣除額 (元)</label><input type="number" value={taxParams.ltc_deduction} onChange={(e) => onTaxParamChange("ltc_deduction", Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 p-1 rounded font-mono" /></div>
        </div>
      </div>

      {snapReport && (
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 mt-6 space-y-3">
          <div>
            <p className="text-[10px] font-mono text-slate-600">PARAMETER CHECK</p>
            <h3 className="mt-1 text-sm font-bold text-slate-100">目前參數驗算摘要</h3>
            <p className="mt-1 text-xs text-slate-500">
              這裡用選定年齡快速確認稅務規則是否合理；客戶展示與完整年度軌跡請回到財富精算工作台。
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 leading-relaxed font-mono">
          <div className="space-y-1">
            <p className="text-orange-400 font-bold">當年所得稅驗算 ({selectedReportAge}歲)</p>
            <p>➕ 綜合所得總額：{Math.round(snapReport.稅_綜合所得總額 * 10000).toLocaleString()} 元</p>
            <p>➖ 最佳化免稅與扣除：-{Math.round((snapReport.稅_免稅額 + snapReport.稅_扣除額 + snapReport.稅_特扣總計 + snapReport.稅_基本差額) * 10000).toLocaleString()} 元</p>
            <p className="border-t border-slate-800 pt-1 text-white font-bold">🟰 綜合所得淨額：{Math.round(snapReport.稅_綜合所得淨額 * 10000).toLocaleString()} 元</p>
            <p className="text-emerald-400 font-bold">🧾 核定一般應納稅額：{Math.round(snapReport.稅_一般應納稅額 * 10000).toLocaleString()} 元 ({snapReport.扣除額類型}計稅 + {snapReport.股利計稅})</p>
          </div>
          <div className="space-y-1 border-l-0 md:border-l border-slate-800 pl-0 md:pl-4">
            <p className="text-purple-400 font-bold">最低稅負制 AMT 驗算</p>
            <p>➕ AMT 基本所得額基數：{Math.round(snapReport.稅_AMT基本所得額 * 10000).toLocaleString()} 元</p>
            <p>➖ 法定起徵免稅額度：-{Math.round(taxParams.amt_threshold).toLocaleString()} 元</p>
            <p className="border-t border-slate-800 pt-1 text-white font-bold">🟰 AMT 應納稅額：{Math.round(snapReport.稅_AMT稅額 * 10000).toLocaleString()} 元</p>
            <p className="text-amber-400 font-bold">🎯 最終應納稅額 (兩者取其高)：{Math.round(snapReport.支_所得稅金).toLocaleString()} 元 (觸發AMT: {snapReport.觸發AMT})</p>
          </div>
          </div>
        </div>
      )}
    </div>
  );
}
