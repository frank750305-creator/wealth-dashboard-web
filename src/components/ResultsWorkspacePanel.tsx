import type { ComponentProps } from "react";
import { ClientDemoPanel } from "@/components/ClientDemoPanel";
import { MainResultsPanel } from "@/components/MainResultsPanel";
import { MarketDataPanel } from "@/components/MarketDataPanel";
import { TaxParametersPanel } from "@/components/TaxParametersPanel";
import type { DashboardTab } from "@/types/dashboard";

type MainPanelProps = ComponentProps<typeof MainResultsPanel>;
type TaxPanelProps = ComponentProps<typeof TaxParametersPanel>;

type ResultsWorkspacePanelProps = {
  activeTab: DashboardTab;
  onActiveTabChange: (tab: DashboardTab) => void;
  simulationResult: MainPanelProps["simulationResult"];
  currentAge: MainPanelProps["currentAge"];
  lifeExpectancy: MainPanelProps["lifeExpectancy"];
  selectedReportAge: MainPanelProps["selectedReportAge"];
  snapReport: MainPanelProps["snapReport"];
  onSelectedReportAgeChange: MainPanelProps["onSelectedReportAgeChange"];
  taxParams: TaxPanelProps["taxParams"];
  onTaxParamChange: TaxPanelProps["onTaxParamChange"];
  monthlyNetFlow: number;
  realRetireFundPv: number;
  isFullWidth?: boolean;
};

export function ResultsWorkspacePanel({
  activeTab,
  onActiveTabChange,
  simulationResult,
  currentAge,
  lifeExpectancy,
  selectedReportAge,
  snapReport,
  onSelectedReportAgeChange,
  taxParams,
  onTaxParamChange,
  monthlyNetFlow,
  realRetireFundPv,
  isFullWidth = false,
}: ResultsWorkspacePanelProps) {
  return (
    <div className={`${isFullWidth ? "xl:col-span-12" : "xl:col-span-8"} space-y-8`}>
      {activeTab === "client" && (
        <ClientDemoPanel
          simulationResult={simulationResult}
          currentAge={currentAge}
          lifeExpectancy={lifeExpectancy}
          selectedReportAge={selectedReportAge}
          snapReport={snapReport}
          monthlyNetFlow={monthlyNetFlow}
          realRetireFundPv={realRetireFundPv}
          onNavigate={onActiveTabChange}
        />
      )}

      {activeTab === "main" && (
        <MainResultsPanel
          simulationResult={simulationResult}
          currentAge={currentAge}
          lifeExpectancy={lifeExpectancy}
          selectedReportAge={selectedReportAge}
          snapReport={snapReport}
          onSelectedReportAgeChange={onSelectedReportAgeChange}
        />
      )}

      {activeTab === "tax" && (
        <TaxParametersPanel
          taxParams={taxParams}
          snapReport={snapReport}
          selectedReportAge={selectedReportAge}
          onTaxParamChange={onTaxParamChange}
          onNavigate={onActiveTabChange}
        />
      )}

      {activeTab === "market" && <MarketDataPanel />}
    </div>
  );
}
