import { ReverseCalcRow } from "@/components/ReverseCalcRow";
import type { AssetAccountRecord, FutureEventRecord } from "@/types/wealth";

type FutureEventsPanelProps = {
  isOpen: boolean;
  onToggle: () => void;
  assets: AssetAccountRecord[];
  events: FutureEventRecord[];
  futureExpensesList: FutureEventRecord[];
  currentAge: number;
  tmpEvName: string;
  onTmpEvNameChange: (value: string) => void;
  tmpEvAge: number;
  onTmpEvAgeChange: (value: number) => void;
  tmpEvAmt: number;
  onTmpEvAmtChange: (value: number) => void;
  tmpEvTarget: string;
  onTmpEvTargetChange: (value: string) => void;
  tmpEvNewName: string;
  onTmpEvNewNameChange: (value: string) => void;
  tmpEvNewType: string;
  onTmpEvNewTypeChange: (value: string) => void;
  tmpEvNewRate: number;
  onTmpEvNewRateChange: (value: number) => void;
  evtContinuous: boolean;
  onEvtContinuousChange: (value: boolean) => void;
  tmpEvDuration: number;
  onTmpEvDurationChange: (value: number) => void;
  onAddFutureEvent: () => void;
  onDeleteEvent: (id: string) => void;
};

export function FutureEventsPanel({
  isOpen,
  onToggle,
  assets,
  events,
  futureExpensesList,
  currentAge,
  tmpEvName,
  onTmpEvNameChange,
  tmpEvAge,
  onTmpEvAgeChange,
  tmpEvAmt,
  onTmpEvAmtChange,
  tmpEvTarget,
  onTmpEvTargetChange,
  tmpEvNewName,
  onTmpEvNewNameChange,
  tmpEvNewType,
  onTmpEvNewTypeChange,
  tmpEvNewRate,
  onTmpEvNewRateChange,
  evtContinuous,
  onEvtContinuousChange,
  tmpEvDuration,
  onTmpEvDurationChange,
  onAddFutureEvent,
  onDeleteEvent,
}: FutureEventsPanelProps) {
  return (
    <div className="border border-slate-800 rounded-lg bg-slate-950/40">
      <button onClick={onToggle} className="w-full bg-slate-950 px-4 py-2.5 text-left font-semibold text-xs text-slate-300 flex justify-between">
        <span>📅 5. 重大未來事件與逆算器</span><span>{isOpen ? "▲" : "▼"}</span>
      </button>
      {isOpen && (
        <div className="p-4 space-y-4 text-xs border-t border-slate-800">
          <div className="bg-slate-950 p-2.5 rounded border border-slate-800 space-y-2">
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2"><label>事件名稱</label><input type="text" value={tmpEvName} onChange={(e) => onTmpEvNameChange(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded p-1 text-[11px]" /></div>
              <div><label>發生年紀</label><input type="number" value={tmpEvAge} onChange={(e) => onTmpEvAgeChange(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1 text-[11px]" /></div>
              <div><label>金額(萬,支出負)</label><input type="number" value={tmpEvAmt} onChange={(e) => onTmpEvAmtChange(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1 text-[11px]" /></div>
              <div className="col-span-2"><label>資金來源/去向</label>
                <select value={tmpEvTarget} onChange={(e) => onTmpEvTargetChange(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded p-1 text-[11px]">
                  <option>預設現金流</option>{assets.map((asset) => <option key={asset.name}>{asset.name}</option>)}
                  {tmpEvAmt > 0 && <option>➕ 建立全新資產</option>}
                </select>
              </div>
            </div>
            {tmpEvTarget === "➕ 建立全新資產" && tmpEvAmt > 0 && (
              <div className="grid grid-cols-3 gap-2 border-t border-slate-800 pt-2">
                <div><label>新資產名</label><input type="text" value={tmpEvNewName} onChange={(e) => onTmpEvNewNameChange(e.target.value)} className="w-full bg-slate-900 rounded p-1" /></div>
                <div><label>主分類</label><select value={tmpEvNewType} onChange={(e) => onTmpEvNewTypeChange(e.target.value)} className="w-full bg-slate-900 rounded p-1"><option>現金</option><option>保單</option><option>股票</option><option>不動產</option></select></div>
                <div><label>報酬(%)</label><input type="number" value={tmpEvNewRate} onChange={(e) => onTmpEvNewRateChange(Number(e.target.value))} className="w-full bg-slate-900 rounded p-1" /></div>
              </div>
            )}
            <div className="flex items-center justify-between border-t border-slate-800 pt-2">
              <label className="flex items-center gap-1 text-slate-400"><input type="checkbox" checked={evtContinuous} onChange={(e) => onEvtContinuousChange(e.target.checked)} /> 🔄 持續多年</label>
              {evtContinuous && <input type="number" placeholder="年數" value={tmpEvDuration} onChange={(e) => onTmpEvDurationChange(Number(e.target.value))} className="w-16 bg-slate-900 border border-slate-700 rounded p-1 text-[11px]" />}
            </div>
            <button onClick={onAddFutureEvent} className="w-full bg-amber-900 text-white py-1 rounded font-bold text-[11px]">設立未來財務目標</button>
            {events.map((event) => <div key={event.id} className="flex justify-between text-[10px] text-slate-400 mt-1"><span>{event.label}: {event.amount / 10000}萬 {event.duration > 1 ? `(${event.duration}年)` : ""}</span><button onClick={() => onDeleteEvent(event.id)}>🗑️</button></div>)}
          </div>

          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 border-l-4 border-l-amber-500 space-y-3">
            <p className="font-bold text-amber-400 border-b border-slate-800 pb-1">🎯 目標達成逆算器 (月定額推算)</p>
            {futureExpensesList.length === 0 ? <p className="text-slate-500">尚無未來支出目標。</p> : (
              futureExpensesList.map((event, index) => {
                const yearsToGo = event.age - currentAge;
                const targetVal = Math.abs(event.amount) * (event.duration || 1);
                return <ReverseCalcRow key={event.id || index} label={event.label} yearsToGo={yearsToGo} targetVal={targetVal} />;
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
