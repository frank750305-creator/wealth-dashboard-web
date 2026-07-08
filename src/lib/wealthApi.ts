import type { SimulationPayload, SimulationResult } from "@/types/wealth";

export async function simulateWealth(payload: SimulationPayload): Promise<SimulationResult> {
  const response = await fetch("/api/v1/wealth/simulate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`伺服器異常 (代碼: ${response.status})\n${errText}`);
  }

  return response.json();
}
