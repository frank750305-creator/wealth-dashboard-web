import type { ComponentProps } from "react";
import { AssetPoolPanel } from "@/components/AssetPoolPanel";
import { FamilyPanel } from "@/components/FamilyPanel";
import { FutureEventsPanel } from "@/components/FutureEventsPanel";
import { IncomeExpensePanel } from "@/components/IncomeExpensePanel";
import { InsurancePanel } from "@/components/InsurancePanel";
import { LiabilitiesPanel } from "@/components/LiabilitiesPanel";
import { PensionPanel } from "@/components/PensionPanel";
import { TimelinePanel } from "@/components/TimelinePanel";
import type { DashboardSection } from "@/types/dashboard";

type PanelSection = Exclude<DashboardSection, "">;

type ControlCenterPanelProps = {
  activeSection: DashboardSection;
  onActiveSectionChange: (section: DashboardSection) => void;
  timelinePanelProps: Omit<ComponentProps<typeof TimelinePanel>, "isOpen" | "onToggle" | "mainSalary" | "pensionInfo" | "realRetireFundPv">;
  incomeExpensePanelProps: Omit<ComponentProps<typeof IncomeExpensePanel>, "isOpen" | "onToggle" | "serverLoan" | "serverTax" | "monthlyNetFlow" | "isLoading">;
  assetPoolPanelProps: Omit<ComponentProps<typeof AssetPoolPanel>, "isOpen" | "onToggle">;
  pensionPanelProps: Omit<ComponentProps<typeof PensionPanel>, "isOpen" | "onToggle">;
  futureEventsPanelProps: Omit<ComponentProps<typeof FutureEventsPanel>, "isOpen" | "onToggle" | "assets" | "futureExpensesList" | "currentAge">;
  liabilitiesPanelProps: Omit<ComponentProps<typeof LiabilitiesPanel>, "isOpen" | "onToggle" | "monthlyNetFlow">;
  familyPanelProps: Omit<ComponentProps<typeof FamilyPanel>, "isOpen" | "onToggle">;
  insurancePanelProps: Omit<ComponentProps<typeof InsurancePanel>, "isOpen" | "onToggle" | "familyOptions">;
  mainSalary: number;
  pensionInfo: ComponentProps<typeof TimelinePanel>["pensionInfo"];
  realRetireFundPv: number;
  serverLoan: number;
  serverTax: number;
  monthlyNetFlow: number;
  isLoading: boolean;
  assets: ComponentProps<typeof FutureEventsPanel>["assets"];
  futureExpensesList: ComponentProps<typeof FutureEventsPanel>["futureExpensesList"];
  currentAge: number;
  familyOptions: ComponentProps<typeof InsurancePanel>["familyOptions"];
  onSimulate: () => void;
};

export function ControlCenterPanel({
  activeSection,
  onActiveSectionChange,
  timelinePanelProps,
  incomeExpensePanelProps,
  assetPoolPanelProps,
  pensionPanelProps,
  futureEventsPanelProps,
  liabilitiesPanelProps,
  familyPanelProps,
  insurancePanelProps,
  mainSalary,
  pensionInfo,
  realRetireFundPv,
  serverLoan,
  serverTax,
  monthlyNetFlow,
  isLoading,
  assets,
  futureExpensesList,
  currentAge,
  familyOptions,
  onSimulate,
}: ControlCenterPanelProps) {
  const toggleSection = (section: PanelSection) => {
    onActiveSectionChange(activeSection === section ? "" : section);
  };

  return (
    <div className="xl:col-span-4 bg-slate-900 border border-slate-800 p-4 md:p-6 rounded-xl shadow-2xl flex flex-col h-fit max-h-[88vh] overflow-y-auto space-y-4 custom-scrollbar">
      <h2 className="text-base font-bold text-blue-400 pb-2 border-b border-slate-800 flex justify-between items-center">
        <span>▍ 決策控制中樞 (8大模組)</span>
      </h2>

      <div className="space-y-4 pb-32">
        <TimelinePanel
          isOpen={activeSection === "timeline"}
          onToggle={() => toggleSection("timeline")}
          mainSalary={mainSalary}
          pensionInfo={pensionInfo}
          realRetireFundPv={realRetireFundPv}
          {...timelinePanelProps}
        />

        <IncomeExpensePanel
          isOpen={activeSection === "income"}
          onToggle={() => toggleSection("income")}
          serverLoan={serverLoan}
          serverTax={serverTax}
          monthlyNetFlow={monthlyNetFlow}
          isLoading={isLoading}
          {...incomeExpensePanelProps}
        />

        <AssetPoolPanel
          isOpen={activeSection === "assets"}
          onToggle={() => toggleSection("assets")}
          {...assetPoolPanelProps}
        />

        <PensionPanel
          isOpen={activeSection === "pension"}
          onToggle={() => toggleSection("pension")}
          {...pensionPanelProps}
        />

        <FutureEventsPanel
          isOpen={activeSection === "events"}
          onToggle={() => toggleSection("events")}
          assets={assets}
          futureExpensesList={futureExpensesList}
          currentAge={currentAge}
          {...futureEventsPanelProps}
        />

        <LiabilitiesPanel
          isOpen={activeSection === "liabilities"}
          onToggle={() => toggleSection("liabilities")}
          monthlyNetFlow={monthlyNetFlow}
          {...liabilitiesPanelProps}
        />

        <FamilyPanel
          isOpen={activeSection === "family"}
          onToggle={() => toggleSection("family")}
          {...familyPanelProps}
        />

        <InsurancePanel
          isOpen={activeSection === "insurance"}
          onToggle={() => toggleSection("insurance")}
          familyOptions={familyOptions}
          {...insurancePanelProps}
        />
      </div>

      <button
        onClick={onSimulate}
        disabled={isLoading}
        className={`w-full py-4 rounded-lg font-bold tracking-wide transition-all duration-300 shrink-0 ${
          isLoading
            ? "bg-slate-700 text-slate-400"
            : "bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]"
        }`}
      >
        {isLoading ? "全端精密運算中..." : "🚀 一鍵啟動全端精算"}
      </button>
    </div>
  );
}
