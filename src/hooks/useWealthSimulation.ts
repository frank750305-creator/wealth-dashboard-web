import { useCallback, useMemo, useState } from "react";
import { buildSimulationPayload, type BuildSimulationPayloadInput } from "@/lib/buildSimulationPayload";
import { simulateWealth } from "@/lib/wealthApi";
import type { SimulationResult } from "@/types/wealth";

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return String(error);
}

export function useWealthSimulation(
  simulationInput: BuildSimulationPayloadInput,
  selectedReportAge: number,
) {
  const [isLoading, setIsLoading] = useState(false);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [serverTax, setServerTax] = useState(0);
  const [serverLoan, setServerLoan] = useState(0);

  const handleSimulate = useCallback(async () => {
    setIsLoading(true);
    try {
      const payload = buildSimulationPayload(simulationInput);
      const data = await simulateWealth(payload);
      setSimulationResult(data);
      setServerTax(data.first_year_tax || 0);
      setServerLoan(data.first_year_loan_pay || 0);
    } catch (error: unknown) {
      alert(`連線或運算異常:\n${getErrorMessage(error)}`);
    } finally {
      setIsLoading(false);
    }
  }, [simulationInput]);

  const snapReport = useMemo(
    () => simulationResult?.trajectory?.find((record) => record.年紀 === selectedReportAge) ?? null,
    [selectedReportAge, simulationResult],
  );

  return useMemo(() => ({
    isLoading,
    simulationResult,
    serverTax,
    serverLoan,
    snapReport,
    handleSimulate,
  }), [handleSimulate, isLoading, serverLoan, serverTax, simulationResult, snapReport]);
}
