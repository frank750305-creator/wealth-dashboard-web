import type { DataLicenseComplianceItem } from "@/lib/dataLicenseCompliance";
import type { IncidentCommandItem } from "@/lib/incidentCommand";
import {
  releaseStageClass,
  releaseStageLabel,
  type ProductReleaseGateItem,
} from "@/lib/productReleaseGate";
import { customerHealthStageClass, customerHealthStageLabel, type CustomerSuccessHealthItem } from "@/lib/customerSuccessHealth";
import { revenueForecastStageClass, revenueForecastStageLabel, type RevenueForecastItem } from "@/lib/revenueForecast";
import type { SecurityAuditItem } from "@/lib/securityAudit";
import { executionHandoffPriorityClass, executionHandoffPriorityLabel } from "@/lib/executionOperationsWorkflow";

type ExecutionStatus = "pass" | "watch" | "block";

type EnterpriseReadinessSectionProps = {
  dataLicenseComplianceDecision: ExecutionStatus;
  licenseReadyCount: number;
  licenseRestrictedCount: number;
  dataLicenseComplianceItems: DataLicenseComplianceItem[];
  onExportDataLicenseComplianceCsv: () => void;
  securityAuditDecision: ExecutionStatus;
  securityReadyCount: number;
  securityBlockCount: number;
  securityAuditItems: SecurityAuditItem[];
  onExportSecurityAuditCsv: () => void;
  incidentCommandDecision: ExecutionStatus;
  incidentOpenCount: number;
  incidentHighPriorityCount: number;
  incidentCommandItems: IncidentCommandItem[];
  onExportIncidentCommandCsv: () => void;
  productReleaseGateDecision: ExecutionStatus;
  releaseProductionCount: number;
  releasePilotCount: number;
  releaseHoldCount: number;
  productReleaseGateItems: ProductReleaseGateItem[];
  onExportProductReleaseGateCsv: () => void;
  customerSuccessHealthDecision: ExecutionStatus;
  customerHealthyCount: number;
  customerExpansionCount: number;
  customerRiskCount: number;
  customerSuccessHealthItems: CustomerSuccessHealthItem[];
  onExportCustomerSuccessHealthCsv: () => void;
  revenueForecastDecision: ExecutionStatus;
  revenueCurrentMrr: number;
  revenueExpansionMrr: number;
  revenueRiskMrr: number;
  revenueProjectedMrr: number;
  revenueForecastItems: RevenueForecastItem[];
  onExportRevenueForecastCsv: () => void;
};

function formatPercent(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? `${(value * 100).toFixed(2)}%` : "--";
}

function formatCurrency(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value)
    ? value.toLocaleString("zh-TW", { maximumFractionDigits: 0 })
    : "--";
}

function executionReviewLabel(status: ExecutionStatus) {
  if (status === "pass") return "通過";
  if (status === "watch") return "觀察";
  return "暫停";
}

function executionReviewBadgeClass(status: ExecutionStatus) {
  if (status === "pass") return "bg-emerald-500/15 text-emerald-200";
  if (status === "watch") return "bg-amber-500/15 text-amber-200";
  return "bg-rose-500/15 text-rose-200";
}

function executionReviewRowClass(status: ExecutionStatus) {
  if (status === "pass") return "border-emerald-500/15 bg-emerald-950/10";
  if (status === "watch") return "border-amber-500/20 bg-amber-950/10";
  return "border-rose-500/20 bg-rose-950/10";
}

export function EnterpriseReadinessSection({
  dataLicenseComplianceDecision,
  licenseReadyCount,
  licenseRestrictedCount,
  dataLicenseComplianceItems,
  onExportDataLicenseComplianceCsv: handleExportDataLicenseComplianceCsv,
  securityAuditDecision,
  securityReadyCount,
  securityBlockCount,
  securityAuditItems,
  onExportSecurityAuditCsv: handleExportSecurityAuditCsv,
  incidentCommandDecision,
  incidentOpenCount,
  incidentHighPriorityCount,
  incidentCommandItems,
  onExportIncidentCommandCsv: handleExportIncidentCommandCsv,
  productReleaseGateDecision,
  releaseProductionCount,
  releasePilotCount,
  releaseHoldCount,
  productReleaseGateItems,
  onExportProductReleaseGateCsv: handleExportProductReleaseGateCsv,
  customerSuccessHealthDecision,
  customerHealthyCount,
  customerExpansionCount,
  customerRiskCount,
  customerSuccessHealthItems,
  onExportCustomerSuccessHealthCsv: handleExportCustomerSuccessHealthCsv,
  revenueForecastDecision,
  revenueCurrentMrr,
  revenueExpansionMrr,
  revenueRiskMrr,
  revenueProjectedMrr,
  revenueForecastItems,
  onExportRevenueForecastCsv: handleExportRevenueForecastCsv,
}: EnterpriseReadinessSectionProps) {
  return (
    <>
              <div className="border-t border-slate-800 pt-3 space-y-3">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-xs font-bold text-slate-100">資料授權與合規中心</h4>
                      <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${executionReviewBadgeClass(dataLicenseComplianceDecision)}`}>
                        {executionReviewLabel(dataLicenseComplianceDecision)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      管理資料來源授權、再散布限制、客戶可見範圍、匯出政策、稽核軌跡與續約檢查
                    </p>
                  </div>
                  <div className="flex flex-wrap items-end gap-2 text-xs">
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        ["可上線", `${licenseReadyCount}`],
                        ["受限項", `${licenseRestrictedCount}`],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-md border border-slate-800 bg-slate-900/70 px-3 py-2 text-right">
                          <p className="text-[10px] text-slate-600">{label}</p>
                          <p className="mt-0.5 font-mono font-bold text-slate-100">{value}</p>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={handleExportDataLicenseComplianceCsv}
                      disabled={!dataLicenseComplianceItems.length}
                      className="px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold disabled:cursor-not-allowed disabled:bg-slate-950 disabled:text-slate-600"
                    >
                      授權 CSV
                    </button>
                  </div>
                </div>

                {dataLicenseComplianceItems.length ? (
                  <div className="overflow-x-auto rounded-lg border border-slate-800">
                    <table className="w-full min-w-[1600px] text-xs">
                      <thead className="bg-slate-900/80">
                        <tr className="text-left text-[11px] text-slate-600">
                          <th className="py-2 px-3 font-medium">來源</th>
                          <th className="py-2 px-3 font-medium">資料集</th>
                          <th className="py-2 px-3 font-medium">授權範圍</th>
                          <th className="py-2 px-3 font-medium">再散布限制</th>
                          <th className="py-2 px-3 font-medium">客戶可見範圍</th>
                          <th className="py-2 px-3 font-medium">匯出政策</th>
                          <th className="py-2 px-3 font-medium">稽核軌跡</th>
                          <th className="py-2 px-3 font-medium">續約</th>
                          <th className="py-2 px-3 font-medium text-right">狀態</th>
                          <th className="py-2 px-3 font-medium">依據</th>
                          <th className="py-2 px-3 font-medium">動作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dataLicenseComplianceItems.map((item) => (
                          <tr key={`${item.source}-${item.dataset}`} className={`border-t ${executionReviewRowClass(item.status)}`}>
                            <td className="py-2 px-3 font-bold text-slate-100">{item.source}</td>
                            <td className="py-2 px-3 text-slate-400">{item.dataset}</td>
                            <td className="py-2 px-3 text-slate-400">{item.licenseScope}</td>
                            <td className="py-2 px-3 text-slate-500">{item.redistribution}</td>
                            <td className="py-2 px-3 text-slate-400">{item.clientAccess}</td>
                            <td className="py-2 px-3 text-slate-500">{item.exportPolicy}</td>
                            <td className="py-2 px-3 text-slate-500">{item.auditTrail}</td>
                            <td className="py-2 px-3 text-slate-500">{item.renewal}</td>
                            <td className="py-2 px-3 text-right">
                              <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${executionReviewBadgeClass(item.status)}`}>
                                {executionReviewLabel(item.status)}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-slate-500">{item.evidence}</td>
                            <td className="py-2 px-3 text-slate-500">{item.action}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="rounded-md border border-dashed border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-500">
                    建立用量與帳務資料後，這裡會顯示資料授權與合規清單。
                  </div>
                )}
              </div>

              <div className="border-t border-slate-800 pt-3 space-y-3">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-xs font-bold text-slate-100">安全與審計中心</h4>
                      <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${executionReviewBadgeClass(securityAuditDecision)}`}>
                        {executionReviewLabel(securityAuditDecision)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      管理 SSO、API key 輪替、IP allowlist、匯出稽核、管理員操作與事件回應
                    </p>
                  </div>
                  <div className="flex flex-wrap items-end gap-2 text-xs">
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        ["就緒", `${securityReadyCount}`],
                        ["阻擋", `${securityBlockCount}`],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-md border border-slate-800 bg-slate-900/70 px-3 py-2 text-right">
                          <p className="text-[10px] text-slate-600">{label}</p>
                          <p className="mt-0.5 font-mono font-bold text-slate-100">{value}</p>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={handleExportSecurityAuditCsv}
                      disabled={!securityAuditItems.length}
                      className="px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold disabled:cursor-not-allowed disabled:bg-slate-950 disabled:text-slate-600"
                    >
                      安全 CSV
                    </button>
                  </div>
                </div>

                {securityAuditItems.length ? (
                  <div className="overflow-x-auto rounded-lg border border-slate-800">
                    <table className="w-full min-w-[1500px] text-xs">
                      <thead className="bg-slate-900/80">
                        <tr className="text-left text-[11px] text-slate-600">
                          <th className="py-2 px-3 font-medium">控制項</th>
                          <th className="py-2 px-3 font-medium">範圍</th>
                          <th className="py-2 px-3 font-medium">負責人</th>
                          <th className="py-2 px-3 font-medium text-right">狀態</th>
                          <th className="py-2 px-3 font-medium">依據</th>
                          <th className="py-2 px-3 font-medium">風險</th>
                          <th className="py-2 px-3 font-medium">頻率</th>
                          <th className="py-2 px-3 font-medium">動作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {securityAuditItems.map((item) => (
                          <tr key={`${item.control}-${item.scope}`} className={`border-t ${executionReviewRowClass(item.status)}`}>
                            <td className="py-2 px-3 font-bold text-slate-100">{item.control}</td>
                            <td className="py-2 px-3 text-slate-400">{item.scope}</td>
                            <td className="py-2 px-3 text-slate-400">{item.owner}</td>
                            <td className="py-2 px-3 text-right">
                              <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${executionReviewBadgeClass(item.status)}`}>
                                {executionReviewLabel(item.status)}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-slate-500">{item.evidence}</td>
                            <td className="py-2 px-3 text-slate-500">{item.risk}</td>
                            <td className="py-2 px-3 text-slate-500">{item.frequency}</td>
                            <td className="py-2 px-3 text-slate-500">{item.action}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="rounded-md border border-dashed border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-500">
                    建立授權合規資料後，這裡會顯示安全與審計控制項。
                  </div>
                )}
              </div>

              <div className="border-t border-slate-800 pt-3 space-y-3">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-xs font-bold text-slate-100">營運事件指揮中心</h4>
                      <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${executionReviewBadgeClass(incidentCommandDecision)}`}>
                        {executionReviewLabel(incidentCommandDecision)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      將資料、API、權限、帳務、合規、安全與交易流程異常轉成事件等級、客戶影響、SLA 與 runbook
                    </p>
                  </div>
                  <div className="flex flex-wrap items-end gap-2 text-xs">
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        ["未結事件", `${incidentOpenCount}`],
                        ["高優先", `${incidentHighPriorityCount}`],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-md border border-slate-800 bg-slate-900/70 px-3 py-2 text-right">
                          <p className="text-[10px] text-slate-600">{label}</p>
                          <p className="mt-0.5 font-mono font-bold text-slate-100">{value}</p>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={handleExportIncidentCommandCsv}
                      disabled={!incidentCommandItems.length}
                      className="px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold disabled:cursor-not-allowed disabled:bg-slate-950 disabled:text-slate-600"
                    >
                      事件 CSV
                    </button>
                  </div>
                </div>

                {incidentCommandItems.length ? (
                  <div className="overflow-x-auto rounded-lg border border-slate-800">
                    <table className="w-full min-w-[1650px] text-xs">
                      <thead className="bg-slate-900/80">
                        <tr className="text-left text-[11px] text-slate-600">
                          <th className="py-2 px-3 font-medium">事件</th>
                          <th className="py-2 px-3 font-medium">優先級</th>
                          <th className="py-2 px-3 font-medium text-right">狀態</th>
                          <th className="py-2 px-3 font-medium">觸發條件</th>
                          <th className="py-2 px-3 font-medium">客戶影響</th>
                          <th className="py-2 px-3 font-medium">負責人</th>
                          <th className="py-2 px-3 font-medium">SLA</th>
                          <th className="py-2 px-3 font-medium">Runbook</th>
                          <th className="py-2 px-3 font-medium">下一步</th>
                        </tr>
                      </thead>
                      <tbody>
                        {incidentCommandItems.map((item) => (
                          <tr key={`${item.incident}-${item.owner}`} className={`border-t ${executionReviewRowClass(item.status)}`}>
                            <td className="py-2 px-3 font-bold text-slate-100">{item.incident}</td>
                            <td className="py-2 px-3">
                              <span className={`rounded border px-2 py-0.5 text-[10px] font-bold ${executionHandoffPriorityClass(item.severity)}`}>
                                {executionHandoffPriorityLabel(item.severity)}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-right">
                              <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${executionReviewBadgeClass(item.status)}`}>
                                {executionReviewLabel(item.status)}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-slate-400">{item.trigger}</td>
                            <td className="py-2 px-3 text-slate-500">{item.customerImpact}</td>
                            <td className="py-2 px-3 text-slate-400">{item.owner}</td>
                            <td className="py-2 px-3 font-mono text-[11px] text-slate-300">{item.sla}</td>
                            <td className="py-2 px-3 text-slate-500">{item.runbook}</td>
                            <td className="py-2 px-3 text-slate-500">{item.nextAction}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="rounded-md border border-dashed border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-500">
                    建立安全審計資料後，這裡會顯示營運事件指揮清單。
                  </div>
                )}
              </div>

              <div className="border-t border-slate-800 pt-3 space-y-3">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-xs font-bold text-slate-100">產品上線閘門</h4>
                      <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${executionReviewBadgeClass(productReleaseGateDecision)}`}>
                        {executionReviewLabel(productReleaseGateDecision)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      彙總資料、API、模型、權限、帳務、授權、安全與事件狀態，判斷每個產品可正式上線、試點或暫緩
                    </p>
                  </div>
                  <div className="flex flex-wrap items-end gap-2 text-xs">
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        ["正式", `${releaseProductionCount}`],
                        ["試點", `${releasePilotCount}`],
                        ["暫緩", `${releaseHoldCount}`],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-md border border-slate-800 bg-slate-900/70 px-3 py-2 text-right">
                          <p className="text-[10px] text-slate-600">{label}</p>
                          <p className="mt-0.5 font-mono font-bold text-slate-100">{value}</p>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={handleExportProductReleaseGateCsv}
                      disabled={!productReleaseGateItems.length}
                      className="px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold disabled:cursor-not-allowed disabled:bg-slate-950 disabled:text-slate-600"
                    >
                      上線 CSV
                    </button>
                  </div>
                </div>

                {productReleaseGateItems.length ? (
                  <div className="overflow-x-auto rounded-lg border border-slate-800">
                    <table className="w-full min-w-[1700px] text-xs">
                      <thead className="bg-slate-900/80">
                        <tr className="text-left text-[11px] text-slate-600">
                          <th className="py-2 px-3 font-medium">產品</th>
                          <th className="py-2 px-3 font-medium">對象</th>
                          <th className="py-2 px-3 font-medium">上線階段</th>
                          <th className="py-2 px-3 font-medium text-right">狀態</th>
                          <th className="py-2 px-3 font-medium">負責人</th>
                          <th className="py-2 px-3 font-medium">依賴</th>
                          <th className="py-2 px-3 font-medium">依據</th>
                          <th className="py-2 px-3 font-medium">阻擋項</th>
                          <th className="py-2 px-3 font-medium">決策</th>
                          <th className="py-2 px-3 font-medium">下一步</th>
                        </tr>
                      </thead>
                      <tbody>
                        {productReleaseGateItems.map((item) => (
                          <tr key={`${item.product}-${item.audience}`} className={`border-t ${executionReviewRowClass(item.status)}`}>
                            <td className="py-2 px-3 font-bold text-slate-100">{item.product}</td>
                            <td className="py-2 px-3 text-slate-400">{item.audience}</td>
                            <td className="py-2 px-3">
                              <span className={`rounded border px-2 py-0.5 text-[10px] font-bold ${releaseStageClass(item.releaseStage)}`}>
                                {releaseStageLabel(item.releaseStage)}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-right">
                              <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${executionReviewBadgeClass(item.status)}`}>
                                {executionReviewLabel(item.status)}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-slate-400">{item.owner}</td>
                            <td className="py-2 px-3 text-slate-500">{item.dependencies}</td>
                            <td className="py-2 px-3 text-slate-500">{item.evidence}</td>
                            <td className="py-2 px-3 text-slate-500">{item.blocker}</td>
                            <td className="py-2 px-3 text-slate-400">{item.decision}</td>
                            <td className="py-2 px-3 text-slate-500">{item.nextAction}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="rounded-md border border-dashed border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-500">
                    建立營運事件資料後，這裡會顯示產品上線閘門。
                  </div>
                )}
              </div>

              <div className="border-t border-slate-800 pt-3 space-y-3">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-xs font-bold text-slate-100">客戶成功健康中心</h4>
                      <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${executionReviewBadgeClass(customerSuccessHealthDecision)}`}>
                        {executionReviewLabel(customerSuccessHealthDecision)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      以工作區、方案、帳務、產品上線、事件與安全合規狀態，推導客戶健康分數、續約風險與擴充機會
                    </p>
                  </div>
                  <div className="flex flex-wrap items-end gap-2 text-xs">
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        ["健康", `${customerHealthyCount}`],
                        ["可擴充", `${customerExpansionCount}`],
                        ["風險", `${customerRiskCount}`],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-md border border-slate-800 bg-slate-900/70 px-3 py-2 text-right">
                          <p className="text-[10px] text-slate-600">{label}</p>
                          <p className="mt-0.5 font-mono font-bold text-slate-100">{value}</p>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={handleExportCustomerSuccessHealthCsv}
                      disabled={!customerSuccessHealthItems.length}
                      className="px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold disabled:cursor-not-allowed disabled:bg-slate-950 disabled:text-slate-600"
                    >
                      客戶 CSV
                    </button>
                  </div>
                </div>

                {customerSuccessHealthItems.length ? (
                  <div className="overflow-x-auto rounded-lg border border-slate-800">
                    <table className="w-full min-w-[1650px] text-xs">
                      <thead className="bg-slate-900/80">
                        <tr className="text-left text-[11px] text-slate-600">
                          <th className="py-2 px-3 font-medium">工作區</th>
                          <th className="py-2 px-3 font-medium">客群</th>
                          <th className="py-2 px-3 font-medium">方案</th>
                          <th className="py-2 px-3 font-medium text-right">分數</th>
                          <th className="py-2 px-3 font-medium">階段</th>
                          <th className="py-2 px-3 font-medium text-right">狀態</th>
                          <th className="py-2 px-3 font-medium">收入訊號</th>
                          <th className="py-2 px-3 font-medium">使用訊號</th>
                          <th className="py-2 px-3 font-medium">風險訊號</th>
                          <th className="py-2 px-3 font-medium">擴充訊號</th>
                          <th className="py-2 px-3 font-medium">負責人</th>
                          <th className="py-2 px-3 font-medium">下一步</th>
                        </tr>
                      </thead>
                      <tbody>
                        {customerSuccessHealthItems.map((item) => (
                          <tr key={`${item.workspace}-${item.plan}`} className={`border-t ${executionReviewRowClass(item.status)}`}>
                            <td className="py-2 px-3 font-bold text-slate-100">{item.workspace}</td>
                            <td className="py-2 px-3 text-slate-400">{item.segment}</td>
                            <td className="py-2 px-3 text-slate-400">{item.plan}</td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-slate-100">{item.healthScore}</td>
                            <td className="py-2 px-3">
                              <span className={`rounded border px-2 py-0.5 text-[10px] font-bold ${customerHealthStageClass(item.healthStage)}`}>
                                {customerHealthStageLabel(item.healthStage)}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-right">
                              <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${executionReviewBadgeClass(item.status)}`}>
                                {executionReviewLabel(item.status)}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-slate-500">{item.revenueSignal}</td>
                            <td className="py-2 px-3 text-slate-500">{item.adoptionSignal}</td>
                            <td className="py-2 px-3 text-slate-500">{item.riskSignal}</td>
                            <td className="py-2 px-3 text-slate-500">{item.expansionSignal}</td>
                            <td className="py-2 px-3 text-slate-400">{item.owner}</td>
                            <td className="py-2 px-3 text-slate-500">{item.nextAction}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="rounded-md border border-dashed border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-500">
                    建立客戶工作區後，這裡會顯示客戶成功健康資料。
                  </div>
                )}
              </div>

              <div className="border-t border-slate-800 pt-3 space-y-3">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-xs font-bold text-slate-100">收入續約預測中心</h4>
                      <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${executionReviewBadgeClass(revenueForecastDecision)}`}>
                        {executionReviewLabel(revenueForecastDecision)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      把客戶健康與帳務資料轉成目前 MRR、擴售機會、流失風險、續約機率與本季營收動作
                    </p>
                  </div>
                  <div className="flex flex-wrap items-end gap-2 text-xs">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {[
                        ["目前 MRR", formatCurrency(revenueCurrentMrr)],
                        ["擴售", formatCurrency(revenueExpansionMrr)],
                        ["風險", formatCurrency(revenueRiskMrr)],
                        ["預估 MRR", formatCurrency(revenueProjectedMrr)],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-md border border-slate-800 bg-slate-900/70 px-3 py-2 text-right">
                          <p className="text-[10px] text-slate-600">{label}</p>
                          <p className="mt-0.5 font-mono font-bold text-slate-100">{value}</p>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={handleExportRevenueForecastCsv}
                      disabled={!revenueForecastItems.length}
                      className="px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold disabled:cursor-not-allowed disabled:bg-slate-950 disabled:text-slate-600"
                    >
                      收入 CSV
                    </button>
                  </div>
                </div>

                {revenueForecastItems.length ? (
                  <div className="overflow-x-auto rounded-lg border border-slate-800">
                    <table className="w-full min-w-[1600px] text-xs">
                      <thead className="bg-slate-900/80">
                        <tr className="text-left text-[11px] text-slate-600">
                          <th className="py-2 px-3 font-medium">工作區</th>
                          <th className="py-2 px-3 font-medium">方案</th>
                          <th className="py-2 px-3 font-medium">階段</th>
                          <th className="py-2 px-3 font-medium text-right">目前 MRR</th>
                          <th className="py-2 px-3 font-medium text-right">擴售 MRR</th>
                          <th className="py-2 px-3 font-medium text-right">風險 MRR</th>
                          <th className="py-2 px-3 font-medium text-right">預估 MRR</th>
                          <th className="py-2 px-3 font-medium text-right">續約率</th>
                          <th className="py-2 px-3 font-medium">負責人</th>
                          <th className="py-2 px-3 font-medium">依據</th>
                          <th className="py-2 px-3 font-medium">本季動作</th>
                          <th className="py-2 px-3 font-medium">下一步</th>
                        </tr>
                      </thead>
                      <tbody>
                        {revenueForecastItems.map((item) => (
                          <tr key={`${item.workspace}-${item.forecastStage}`} className={`border-t ${executionReviewRowClass(item.status)}`}>
                            <td className="py-2 px-3 font-bold text-slate-100">{item.workspace}</td>
                            <td className="py-2 px-3 text-slate-400">{item.plan}</td>
                            <td className="py-2 px-3">
                              <span className={`rounded border px-2 py-0.5 text-[10px] font-bold ${revenueForecastStageClass(item.forecastStage)}`}>
                                {revenueForecastStageLabel(item.forecastStage)}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-slate-300">{formatCurrency(item.currentMrr)}</td>
                            <td className="py-2 px-3 text-right font-mono text-emerald-200">{formatCurrency(item.expansionMrr)}</td>
                            <td className="py-2 px-3 text-right font-mono text-rose-200">{formatCurrency(item.churnRiskMrr)}</td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-slate-100">{formatCurrency(item.projectedMrr)}</td>
                            <td className="py-2 px-3 text-right font-mono text-slate-300">{formatPercent(item.renewalProbability)}</td>
                            <td className="py-2 px-3 text-slate-400">{item.owner}</td>
                            <td className="py-2 px-3 text-slate-500">{item.evidence}</td>
                            <td className="py-2 px-3 text-slate-400">{item.quarterAction}</td>
                            <td className="py-2 px-3 text-slate-500">{item.nextAction}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="rounded-md border border-dashed border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-500">
                    建立客戶健康資料後，這裡會顯示收入與續約預測。
                  </div>
                )}
              </div>

    </>
  );
}
