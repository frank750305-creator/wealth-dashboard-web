import { InheritanceReportPanel } from "@/components/InheritanceReportPanel";
import { WealthDataTable } from "@/components/WealthDataTable";
import { WealthTrajectoryChart } from "@/components/WealthTrajectoryChart";
import type { SimulationResult, WealthRecord } from "@/types/wealth";

type MainResultsPanelProps = {
  simulationResult: SimulationResult | null;
  currentAge: number;
  lifeExpectancy: number;
  selectedReportAge: number;
  snapReport?: WealthRecord | null;
  onSelectedReportAgeChange: (age: number) => void;
};

export function MainResultsPanel({
  simulationResult,
  currentAge,
  lifeExpectancy,
  selectedReportAge,
  snapReport,
  onSelectedReportAgeChange,
}: MainResultsPanelProps) {
  return (
    <div className="space-y-6 animate-fade-in">
      <WealthTrajectoryChart simulationResult={simulationResult} />

      {simulationResult && (
        <>
          <WealthDataTable simulationResult={simulationResult} />
          <InheritanceReportPanel
            currentAge={currentAge}
            lifeExpectancy={lifeExpectancy}
            selectedReportAge={selectedReportAge}
            snapReport={snapReport}
            onSelectedReportAgeChange={onSelectedReportAgeChange}
          />
        </>
      )}
    </div>
  );
}
