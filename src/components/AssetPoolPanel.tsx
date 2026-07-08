import type { AssetAccountRecord } from "@/types/wealth";

type AssetPoolPanelProps = {
  isOpen: boolean;
  onToggle: () => void;
  assets: AssetAccountRecord[];
  tmpAssetCat: string;
  onTmpAssetCatChange: (value: string) => void;
  tmpAssetName: string;
  onTmpAssetNameChange: (value: string) => void;
  tmpAssetVal: number;
  onTmpAssetValChange: (value: number) => void;
  tmpAssetRate: number;
  onTmpAssetRateChange: (value: number) => void;
  tmpAssetMonthly: number;
  onTmpAssetMonthlyChange: (value: number) => void;
  tmpAssetAddYears: number;
  onTmpAssetAddYearsChange: (value: number) => void;
  tmpAssetTax: string;
  onTmpAssetTaxChange: (value: string) => void;
  onAddAssetAccount: () => void;
  onDeleteAsset: (id: string) => void;
};

export function AssetPoolPanel({
  isOpen,
  onToggle,
  assets,
  tmpAssetCat,
  onTmpAssetCatChange,
  tmpAssetName,
  onTmpAssetNameChange,
  tmpAssetVal,
  onTmpAssetValChange,
  tmpAssetRate,
  onTmpAssetRateChange,
  tmpAssetMonthly,
  onTmpAssetMonthlyChange,
  tmpAssetAddYears,
  onTmpAssetAddYearsChange,
  tmpAssetTax,
  onTmpAssetTaxChange,
  onAddAssetAccount,
  onDeleteAsset,
}: AssetPoolPanelProps) {
  return (
    <div className="border border-slate-800 rounded-lg bg-slate-950/40">
      <button onClick={onToggle} className="w-full bg-slate-950 px-4 py-2.5 text-left font-semibold text-xs text-slate-300 flex justify-between">
        <span>📈 3. 動態資產池 (含定額扣款)</span><span>{isOpen ? "▲" : "▼"}</span>
      </button>
      {isOpen && (
        <div className="p-4 space-y-3 text-xs border-t border-slate-800">
          <div className="bg-slate-950 p-2.5 rounded border border-slate-800 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <select value={tmpAssetCat} onChange={(e) => onTmpAssetCatChange(e.target.value)} className="bg-slate-900 border border-slate-700 rounded p-1 text-[11px]"><option>現金</option><option>保單</option><option>基金</option><option>債券</option><option>不動產</option><option>股票</option><option>其他</option></select>
              <input type="text" value={tmpAssetName} onChange={(e) => onTmpAssetNameChange(e.target.value)} className="bg-slate-900 border border-slate-700 rounded p-1 text-[11px]" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><label className="text-[10px] text-slate-500">起始(萬)</label><input type="number" value={tmpAssetVal} onChange={(e) => onTmpAssetValChange(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1 font-mono" /></div>
              <div><label className="text-[10px] text-slate-500">報酬(%)</label><input type="number" value={tmpAssetRate} onChange={(e) => onTmpAssetRateChange(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1 font-mono" /></div>
              <div><label className="text-[10px] text-slate-500">月定額(萬)</label><input type="number" step="0.1" value={tmpAssetMonthly} onChange={(e) => onTmpAssetMonthlyChange(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1 font-mono" /></div>
              <div><label className="text-[10px] text-slate-500">持續年數</label><input type="number" value={tmpAssetAddYears} onChange={(e) => onTmpAssetAddYearsChange(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1 font-mono" /></div>
            </div>
            <select value={tmpAssetTax} onChange={(e) => onTmpAssetTaxChange(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded p-1 text-[11px]"><option>資本利得/不計稅</option><option>國內利息(計入27萬)</option><option>國內股利(8.5%抵減/分開)</option><option>海外所得(計入AMT)</option><option>特定保單給付(計入AMT)</option></select>
            <button onClick={onAddAssetAccount} className="w-full bg-blue-900 text-white text-[11px] py-1 rounded font-bold">配置全新子帳戶</button>
            {assets.map((asset) => <div key={asset.id} className="flex justify-between text-[10px] text-slate-400 mt-1"><span>{asset.name} ({asset.monthly_add}萬/月)</span>{asset.name !== "日常活存" && <button onClick={() => onDeleteAsset(asset.id)}>🗑️</button>}</div>)}
          </div>
        </div>
      )}
    </div>
  );
}
