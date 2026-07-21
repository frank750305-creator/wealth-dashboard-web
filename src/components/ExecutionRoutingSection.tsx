import { rebalanceDirectionLabel } from "@/lib/rebalanceWorkflow";
import {
  executionRouteStateLabel,
  type ExecutionReviewStatus,
  type ExecutionRouteRow,
  type ExecutionRouteState,
} from "@/lib/tradeExecutionWorkflow";

type ExecutionRoutingSectionProps = {
  executionRouteDecision: ExecutionReviewStatus;
  primaryVenue: string;
  onPrimaryVenueChange: (value: string) => void;
  backupVenue: string;
  onBackupVenueChange: (value: string) => void;
  venueCapacityAmount: number;
  onVenueCapacityAmountChange: (value: number) => void;
  routeSlippageBps: number;
  onRouteSlippageBpsChange: (value: number) => void;
  routeCommissionBps: number;
  onRouteCommissionBpsChange: (value: number) => void;
  onExportExecutionRouteCsv: () => void;
  executionRouteRows: ExecutionRouteRow[];
  routedCount: number;
  stagedCount: number;
  blockedCount: number;
  estimatedRouteCost: number;
};

function formatCurrency(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value)
    ? value.toLocaleString("zh-TW", { maximumFractionDigits: 0 })
    : "--";
}

function executionReviewLabel(status: ExecutionReviewStatus) {
  if (status === "pass") return "通過";
  if (status === "watch") return "觀察";
  return "暫停";
}

function executionReviewBadgeClass(status: ExecutionReviewStatus) {
  if (status === "pass") return "bg-emerald-500/15 text-emerald-200 border border-emerald-500/30";
  if (status === "watch") return "bg-amber-500/15 text-amber-200 border border-amber-500/30";
  return "bg-rose-500/15 text-rose-200 border border-rose-500/30";
}

function routeStateBadgeClass(state: ExecutionRouteState) {
  if (state === "routed") return "bg-emerald-500/10 text-emerald-300 border-emerald-500/30";
  if (state === "staged") return "bg-amber-500/10 text-amber-300 border-amber-500/30";
  return "bg-rose-500/10 text-rose-300 border-rose-500/30";
}

function executionRouteRowClass(status: ExecutionReviewStatus) {
  if (status === "pass") return "border-slate-900";
  if (status === "watch") return "border-amber-500/20 bg-amber-500/5";
  return "border-rose-500/20 bg-rose-500/5";
}

export function ExecutionRoutingSection({
  executionRouteDecision,
  primaryVenue,
  onPrimaryVenueChange,
  backupVenue,
  onBackupVenueChange,
  venueCapacityAmount,
  onVenueCapacityAmountChange,
  routeSlippageBps,
  onRouteSlippageBpsChange,
  routeCommissionBps,
  onRouteCommissionBpsChange,
  onExportExecutionRouteCsv,
  executionRouteRows,
  routedCount,
  stagedCount,
  blockedCount,
  estimatedRouteCost,
}: ExecutionRoutingSectionProps) {
  return (
    <div className="border-t border-slate-800 pt-3 space-y-3">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h5 className="text-xs font-bold text-slate-100">Execution Venue Route</h5>
            <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${executionReviewBadgeClass(executionRouteDecision)}`}>
              {executionReviewLabel(executionRouteDecision)}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            將核准後的批次交易轉成模擬 venue 路由與 route status，不送出真實委託
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-[140px_150px_130px_100px_100px_auto] gap-2 text-xs">
          <label className="space-y-1">
            <span className="text-slate-500">Primary venue</span>
            <input
              type="text"
              value={primaryVenue}
              onChange={(event) => onPrimaryVenueChange(event.target.value)}
              className="w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-slate-100"
            />
          </label>
          <label className="space-y-1">
            <span className="text-slate-500">Backup queue</span>
            <input
              type="text"
              value={backupVenue}
              onChange={(event) => onBackupVenueChange(event.target.value)}
              className="w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-slate-100"
            />
          </label>
          <label className="space-y-1">
            <span className="text-slate-500">Venue 容量</span>
            <input
              type="number"
              min={0}
              step={10000}
              value={venueCapacityAmount}
              onChange={(event) => onVenueCapacityAmountChange(Math.max(0, Number(event.target.value) || 0))}
              className="w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-right font-mono text-slate-100"
            />
          </label>
          <label className="space-y-1">
            <span className="text-slate-500">滑價 bps</span>
            <input
              type="number"
              min={0}
              max={200}
              step={0.5}
              value={routeSlippageBps}
              onChange={(event) => onRouteSlippageBpsChange(Math.min(200, Math.max(0, Number(event.target.value) || 0)))}
              className="w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-right font-mono text-slate-100"
            />
          </label>
          <label className="space-y-1">
            <span className="text-slate-500">費率 bps</span>
            <input
              type="number"
              min={0}
              max={200}
              step={0.5}
              value={routeCommissionBps}
              onChange={(event) => onRouteCommissionBpsChange(Math.min(200, Math.max(0, Number(event.target.value) || 0)))}
              className="w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-right font-mono text-slate-100"
            />
          </label>
          <button
            onClick={onExportExecutionRouteCsv}
            disabled={!executionRouteRows.length}
            className="sm:col-span-2 xl:col-span-1 xl:self-end px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold disabled:cursor-not-allowed disabled:bg-slate-950 disabled:text-slate-600"
          >
            Route CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
        {[
          ["模擬路由", `${routedCount} 張`],
          ["待確認", `${stagedCount} 張`],
          ["暫停", `${blockedCount} 張`],
          ["估計成本", formatCurrency(estimatedRouteCost)],
          ["venue", primaryVenue.trim() || "--"],
        ].map(([label, value]) => (
          <div key={label} className="rounded-md border border-slate-800 bg-slate-900/70 p-3 min-w-0">
            <p className="text-[11px] text-slate-600 truncate">{label}</p>
            <p className="mt-1 font-mono text-sm font-bold text-slate-100 truncate" title={value}>
              {value}
            </p>
          </div>
        ))}
      </div>

      {executionRouteRows.length ? (
        <div className="overflow-x-auto rounded-md border border-slate-800">
          <table className="w-full min-w-[1180px] text-xs">
            <thead>
              <tr className="text-left text-[11px] text-slate-600">
                <th className="py-2 px-3 font-medium">Route ID</th>
                <th className="py-2 px-3 font-medium text-right">Seq</th>
                <th className="py-2 px-3 font-medium">Symbol</th>
                <th className="py-2 px-3 font-medium">Action</th>
                <th className="py-2 px-3 font-medium">Venue</th>
                <th className="py-2 px-3 font-medium text-right">Notional</th>
                <th className="py-2 px-3 font-medium text-right">Cost</th>
                <th className="py-2 px-3 font-medium">State</th>
                <th className="py-2 px-3 font-medium">Note</th>
              </tr>
            </thead>
            <tbody>
              {executionRouteRows.slice(0, 18).map((row) => (
                <tr key={row.routeId} className={`border-t ${executionRouteRowClass(row.routeStatus)}`}>
                  <td className="py-2 px-3 font-mono text-[11px] text-cyan-200">{row.routeId}</td>
                  <td className="py-2 px-3 text-right font-mono text-slate-500">{row.routeSequence}</td>
                  <td className="py-2 px-3 font-bold text-slate-100">{row.symbol}</td>
                  <td className="py-2 px-3 text-slate-300">{rebalanceDirectionLabel(row.direction)}</td>
                  <td className="py-2 px-3 text-slate-400">{row.venue}</td>
                  <td className="py-2 px-3 text-right font-mono text-slate-100">{formatCurrency(row.routeNotional)}</td>
                  <td className="py-2 px-3 text-right font-mono text-rose-200">{formatCurrency(row.estimatedRouteCost)}</td>
                  <td className="py-2 px-3">
                    <span className={`rounded border px-2 py-0.5 text-[10px] font-bold ${routeStateBadgeClass(row.routeState)}`}>
                      {executionRouteStateLabel(row.routeState)}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-slate-500">{row.routeNote}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-slate-800 bg-slate-900/60 p-3 text-xs text-slate-500">
          批次交易建立後，這裡會產生模擬路由與 route status。
        </div>
      )}
    </div>
  );
}
