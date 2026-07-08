import { InheritanceTable } from "@/components/InheritanceTable";
import type { WealthRecord } from "@/types/wealth";

type InheritanceReportPanelProps = {
  currentAge: number;
  lifeExpectancy: number;
  selectedReportAge: number;
  snapReport?: WealthRecord | null;
  onSelectedReportAgeChange: (age: number) => void;
};

export function InheritanceReportPanel({
  currentAge,
  lifeExpectancy,
  selectedReportAge,
  snapReport,
  onSelectedReportAgeChange,
}: InheritanceReportPanelProps) {
  return (
    <div className="bg-slate-900 border border-slate-800 p-4 md:p-6 rounded-xl shadow-2xl space-y-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-800 pb-3 gap-2">
        <h2 className="text-base font-semibold text-purple-400">
          🏛️ 民法應繼分與特留分保單雙軌變現分配明細表
        </h2>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <span className="text-xs text-slate-400 whitespace-nowrap">模擬身故年齡:</span>
          <input
            type="range"
            min={currentAge}
            max={lifeExpectancy}
            value={selectedReportAge}
            onChange={(event) => onSelectedReportAgeChange(Number(event.target.value))}
            className="w-full md:w-48 accent-blue-500"
          />
          <span className="text-blue-400 font-bold font-mono text-sm whitespace-nowrap">
            {selectedReportAge}歲
          </span>
        </div>
      </div>
      <InheritanceTable snapReport={snapReport} />
    </div>
  );
}
