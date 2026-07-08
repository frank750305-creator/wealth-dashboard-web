import type { ComponentProps } from "react";
import { MainResultsPanel } from "@/components/MainResultsPanel";
import { TaxParametersPanel } from "@/components/TaxParametersPanel";
import type { DashboardTab } from "@/types/dashboard";

type MainPanelProps = ComponentProps<typeof MainResultsPanel>;
type TaxPanelProps = ComponentProps<typeof TaxParametersPanel>;

type ResultsWorkspacePanelProps = {
  activeTab: DashboardTab;
  simulationResult: MainPanelProps["simulationResult"];
  currentAge: MainPanelProps["currentAge"];
  lifeExpectancy: MainPanelProps["lifeExpectancy"];
  selectedReportAge: MainPanelProps["selectedReportAge"];
  snapReport: MainPanelProps["snapReport"];
  onSelectedReportAgeChange: MainPanelProps["onSelectedReportAgeChange"];
  taxParams: TaxPanelProps["taxParams"];
  onTaxParamChange: TaxPanelProps["onTaxParamChange"];
};

export function ResultsWorkspacePanel({
  activeTab,
  simulationResult,
  currentAge,
  lifeExpectancy,
  selectedReportAge,
  snapReport,
  onSelectedReportAgeChange,
  taxParams,
  onTaxParamChange,
}: ResultsWorkspacePanelProps) {
  return (
    <div className="xl:col-span-8 space-y-8">
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
        />
      )}
    </div>
  );
}
