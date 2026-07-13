import {
  apiContractStabilityClass,
  apiContractStabilityLabel,
  type ApiContractBlueprintItem,
  type ApiServiceCatalogItem,
} from "@/lib/apiServiceLayer";
import type { ClientWorkspaceProvisioningItem, PlatformEntitlementItem, UsageBillingItem } from "@/lib/commercialAccessLayer";
import type { DataProductCatalogItem } from "@/lib/dataGovernanceCatalog";

type ExecutionStatus = "pass" | "watch" | "block";

type CommercializationSectionProps = {
  dataProductCatalogDecision: ExecutionStatus;
  dataProductReadyCount: number;
  dataProductWatchCount: number;
  dataProductCatalogItems: DataProductCatalogItem[];
  onExportDataProductCatalogCsv: () => void;
  apiServiceCatalogDecision: ExecutionStatus;
  apiServiceReadyCount: number;
  apiServiceWatchCount: number;
  apiServiceCatalogItems: ApiServiceCatalogItem[];
  onExportApiServiceCatalogCsv: () => void;
  apiContractBlueprintDecision: ExecutionStatus;
  apiContractStableCount: number;
  apiContractDraftCount: number;
  apiContractBlueprintItems: ApiContractBlueprintItem[];
  onExportApiContractBlueprintJson: () => void;
  platformEntitlementDecision: ExecutionStatus;
  entitlementReadyCount: number;
  entitlementRestrictedCount: number;
  platformEntitlementItems: PlatformEntitlementItem[];
  onExportPlatformEntitlementCsv: () => void;
  clientWorkspaceProvisioningDecision: ExecutionStatus;
  workspaceReadyCount: number;
  workspaceBlockedCount: number;
  clientWorkspaceProvisioningItems: ClientWorkspaceProvisioningItem[];
  onExportClientWorkspaceCsv: () => void;
  usageBillingDecision: ExecutionStatus;
  billableWorkspaceCount: number;
  billingReadyCount: number;
  usageBillingItems: UsageBillingItem[];
  onExportUsageBillingCsv: () => void;
};

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

export function CommercializationSection({
  dataProductCatalogDecision,
  dataProductReadyCount,
  dataProductWatchCount,
  dataProductCatalogItems,
  onExportDataProductCatalogCsv: handleExportDataProductCatalogCsv,
  apiServiceCatalogDecision,
  apiServiceReadyCount,
  apiServiceWatchCount,
  apiServiceCatalogItems,
  onExportApiServiceCatalogCsv: handleExportApiServiceCatalogCsv,
  apiContractBlueprintDecision,
  apiContractStableCount,
  apiContractDraftCount,
  apiContractBlueprintItems,
  onExportApiContractBlueprintJson: handleExportApiContractBlueprintJson,
  platformEntitlementDecision,
  entitlementReadyCount,
  entitlementRestrictedCount,
  platformEntitlementItems,
  onExportPlatformEntitlementCsv: handleExportPlatformEntitlementCsv,
  clientWorkspaceProvisioningDecision,
  workspaceReadyCount,
  workspaceBlockedCount,
  clientWorkspaceProvisioningItems,
  onExportClientWorkspaceCsv: handleExportClientWorkspaceCsv,
  usageBillingDecision,
  billableWorkspaceCount,
  billingReadyCount,
  usageBillingItems,
  onExportUsageBillingCsv: handleExportUsageBillingCsv,
}: CommercializationSectionProps) {
  return (
    <>
              <div className="border-t border-slate-800 pt-3 space-y-3">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-xs font-bold text-slate-100">資料產品目錄</h4>
                      <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${executionReviewBadgeClass(dataProductCatalogDecision)}`}>
                        {executionReviewLabel(dataProductCatalogDecision)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      定義每個資料產品的使用者、輸入、輸出、服務等級與下一步
                    </p>
                  </div>
                  <div className="flex flex-wrap items-end gap-2 text-xs">
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        ["可用", `${dataProductReadyCount}`],
                        ["觀察", `${dataProductWatchCount}`],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-md border border-slate-800 bg-slate-900/70 px-3 py-2 text-right">
                          <p className="text-[10px] text-slate-600">{label}</p>
                          <p className="mt-0.5 font-mono font-bold text-slate-100">{value}</p>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={handleExportDataProductCatalogCsv}
                      disabled={!dataProductCatalogItems.length}
                      className="px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold disabled:cursor-not-allowed disabled:bg-slate-950 disabled:text-slate-600"
                    >
                      產品 CSV
                    </button>
                  </div>
                </div>

                {dataProductCatalogItems.length ? (
                  <div className="overflow-x-auto rounded-lg border border-slate-800">
                    <table className="w-full min-w-[1280px] text-xs">
                      <thead className="bg-slate-900/80">
                        <tr className="text-left text-[11px] text-slate-600">
                          <th className="py-2 px-3 font-medium">產品</th>
                          <th className="py-2 px-3 font-medium">類別</th>
                          <th className="py-2 px-3 font-medium text-right">狀態</th>
                          <th className="py-2 px-3 font-medium">使用者</th>
                          <th className="py-2 px-3 font-medium">輸入</th>
                          <th className="py-2 px-3 font-medium">輸出</th>
                          <th className="py-2 px-3 font-medium">服務等級</th>
                          <th className="py-2 px-3 font-medium">動作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dataProductCatalogItems.map((item) => (
                          <tr key={item.product} className={`border-t ${executionReviewRowClass(item.status)}`}>
                            <td className="py-2 px-3 font-bold text-slate-100">{item.product}</td>
                            <td className="py-2 px-3 text-slate-400">{item.category}</td>
                            <td className="py-2 px-3 text-right">
                              <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${executionReviewBadgeClass(item.status)}`}>
                                {executionReviewLabel(item.status)}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-slate-400">{item.consumer}</td>
                            <td className="py-2 px-3 text-slate-400">{item.input}</td>
                            <td className="py-2 px-3 text-slate-400">{item.output}</td>
                            <td className="py-2 px-3 text-slate-500">{item.serviceLevel}</td>
                            <td className="py-2 px-3 text-slate-500">{item.action}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="rounded-md border border-dashed border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-500">
                    讀取資料診斷後，這裡會顯示資料產品目錄。
                  </div>
                )}
              </div>

              <div className="border-t border-slate-800 pt-3 space-y-3">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-xs font-bold text-slate-100">API 服務目錄</h4>
                      <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${executionReviewBadgeClass(apiServiceCatalogDecision)}`}>
                        {executionReviewLabel(apiServiceCatalogDecision)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      盤點資料服務與分析服務的 endpoint、使用者、輸入輸出、服務等級與動作
                    </p>
                  </div>
                  <div className="flex flex-wrap items-end gap-2 text-xs">
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        ["可用", `${apiServiceReadyCount}`],
                        ["觀察", `${apiServiceWatchCount}`],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-md border border-slate-800 bg-slate-900/70 px-3 py-2 text-right">
                          <p className="text-[10px] text-slate-600">{label}</p>
                          <p className="mt-0.5 font-mono font-bold text-slate-100">{value}</p>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={handleExportApiServiceCatalogCsv}
                      disabled={!apiServiceCatalogItems.length}
                      className="px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold disabled:cursor-not-allowed disabled:bg-slate-950 disabled:text-slate-600"
                    >
                      API CSV
                    </button>
                  </div>
                </div>

                {apiServiceCatalogItems.length ? (
                  <div className="overflow-x-auto rounded-lg border border-slate-800">
                    <table className="w-full min-w-[1360px] text-xs">
                      <thead className="bg-slate-900/80">
                        <tr className="text-left text-[11px] text-slate-600">
                          <th className="py-2 px-3 font-medium">Method</th>
                          <th className="py-2 px-3 font-medium">Endpoint</th>
                          <th className="py-2 px-3 font-medium">產品</th>
                          <th className="py-2 px-3 font-medium text-right">狀態</th>
                          <th className="py-2 px-3 font-medium">使用者</th>
                          <th className="py-2 px-3 font-medium">輸入</th>
                          <th className="py-2 px-3 font-medium">輸出</th>
                          <th className="py-2 px-3 font-medium">服務等級</th>
                          <th className="py-2 px-3 font-medium">動作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {apiServiceCatalogItems.map((item) => (
                          <tr key={item.endpoint} className={`border-t ${executionReviewRowClass(item.status)}`}>
                            <td className="py-2 px-3">
                              <span
                                className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                                  item.method === "GET"
                                    ? "border border-sky-500/40 bg-sky-500/10 text-sky-300"
                                    : "border border-violet-500/40 bg-violet-500/10 text-violet-300"
                                }`}
                              >
                                {item.method}
                              </span>
                            </td>
                            <td className="py-2 px-3 font-mono text-[11px] text-slate-300">{item.endpoint}</td>
                            <td className="py-2 px-3 font-bold text-slate-100">{item.product}</td>
                            <td className="py-2 px-3 text-right">
                              <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${executionReviewBadgeClass(item.status)}`}>
                                {executionReviewLabel(item.status)}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-slate-400">{item.consumer}</td>
                            <td className="py-2 px-3 text-slate-400">{item.input}</td>
                            <td className="py-2 px-3 text-slate-400">{item.output}</td>
                            <td className="py-2 px-3 text-slate-500">{item.serviceLevel}</td>
                            <td className="py-2 px-3 text-slate-500">{item.action}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="rounded-md border border-dashed border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-500">
                    讀取資料診斷後，這裡會顯示 API 服務目錄。
                  </div>
                )}
              </div>

              <div className="border-t border-slate-800 pt-3 space-y-3">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-xs font-bold text-slate-100">API 合約 / OpenAPI 藍圖</h4>
                      <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${executionReviewBadgeClass(apiContractBlueprintDecision)}`}>
                        {executionReviewLabel(apiContractBlueprintDecision)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      管理每個 API 的版本、認證、request、response、穩定度與破壞性變更風險
                    </p>
                  </div>
                  <div className="flex flex-wrap items-end gap-2 text-xs">
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        ["Stable", `${apiContractStableCount}`],
                        ["Draft", `${apiContractDraftCount}`],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-md border border-slate-800 bg-slate-900/70 px-3 py-2 text-right">
                          <p className="text-[10px] text-slate-600">{label}</p>
                          <p className="mt-0.5 font-mono font-bold text-slate-100">{value}</p>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={handleExportApiContractBlueprintJson}
                      disabled={!apiContractBlueprintItems.length}
                      className="px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold disabled:cursor-not-allowed disabled:bg-slate-950 disabled:text-slate-600"
                    >
                      OpenAPI JSON
                    </button>
                  </div>
                </div>

                {apiContractBlueprintItems.length ? (
                  <div className="overflow-x-auto rounded-lg border border-slate-800">
                    <table className="w-full min-w-[1480px] text-xs">
                      <thead className="bg-slate-900/80">
                        <tr className="text-left text-[11px] text-slate-600">
                          <th className="py-2 px-3 font-medium">Method</th>
                          <th className="py-2 px-3 font-medium">Endpoint</th>
                          <th className="py-2 px-3 font-medium">Version</th>
                          <th className="py-2 px-3 font-medium">Auth</th>
                          <th className="py-2 px-3 font-medium">Request</th>
                          <th className="py-2 px-3 font-medium">Response</th>
                          <th className="py-2 px-3 font-medium">Stability</th>
                          <th className="py-2 px-3 font-medium text-right">狀態</th>
                          <th className="py-2 px-3 font-medium">破壞風險</th>
                          <th className="py-2 px-3 font-medium">動作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {apiContractBlueprintItems.map((item) => (
                          <tr key={`${item.method}-${item.endpoint}`} className={`border-t ${executionReviewRowClass(item.status)}`}>
                            <td className="py-2 px-3">
                              <span
                                className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                                  item.method === "GET"
                                    ? "border border-sky-500/40 bg-sky-500/10 text-sky-300"
                                    : "border border-violet-500/40 bg-violet-500/10 text-violet-300"
                                }`}
                              >
                                {item.method}
                              </span>
                            </td>
                            <td className="py-2 px-3 font-mono text-[11px] text-slate-300">{item.endpoint}</td>
                            <td className="py-2 px-3 text-slate-400">{item.version}</td>
                            <td className="py-2 px-3 text-slate-400">{item.auth}</td>
                            <td className="py-2 px-3 font-mono text-[11px] text-slate-400">{item.requestSchema}</td>
                            <td className="py-2 px-3 font-mono text-[11px] text-slate-400">{item.responseSchema}</td>
                            <td className="py-2 px-3">
                              <span className={`rounded border px-2 py-0.5 text-[10px] font-bold ${apiContractStabilityClass(item.stability)}`}>
                                {apiContractStabilityLabel(item.stability)}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-right">
                              <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${executionReviewBadgeClass(item.status)}`}>
                                {executionReviewLabel(item.status)}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-slate-500">{item.breakingRisk}</td>
                            <td className="py-2 px-3 text-slate-500">{item.action}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="rounded-md border border-dashed border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-500">
                    建立 API 服務目錄後，這裡會顯示 OpenAPI 藍圖。
                  </div>
                )}
              </div>

              <div className="border-t border-slate-800 pt-3 space-y-3">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-xs font-bold text-slate-100">權限與方案控管</h4>
                      <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${executionReviewBadgeClass(platformEntitlementDecision)}`}>
                        {executionReviewLabel(platformEntitlementDecision)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      定義角色、方案、資料範圍、API 權限、匯出權限與簽核限制
                    </p>
                  </div>
                  <div className="flex flex-wrap items-end gap-2 text-xs">
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        ["可啟用", `${entitlementReadyCount}`],
                        ["受限", `${entitlementRestrictedCount}`],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-md border border-slate-800 bg-slate-900/70 px-3 py-2 text-right">
                          <p className="text-[10px] text-slate-600">{label}</p>
                          <p className="mt-0.5 font-mono font-bold text-slate-100">{value}</p>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={handleExportPlatformEntitlementCsv}
                      disabled={!platformEntitlementItems.length}
                      className="px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold disabled:cursor-not-allowed disabled:bg-slate-950 disabled:text-slate-600"
                    >
                      權限 CSV
                    </button>
                  </div>
                </div>

                {platformEntitlementItems.length ? (
                  <div className="overflow-x-auto rounded-lg border border-slate-800">
                    <table className="w-full min-w-[1500px] text-xs">
                      <thead className="bg-slate-900/80">
                        <tr className="text-left text-[11px] text-slate-600">
                          <th className="py-2 px-3 font-medium">角色</th>
                          <th className="py-2 px-3 font-medium">方案</th>
                          <th className="py-2 px-3 font-medium">資料範圍</th>
                          <th className="py-2 px-3 font-medium">API 權限</th>
                          <th className="py-2 px-3 font-medium">工具</th>
                          <th className="py-2 px-3 font-medium">匯出權限</th>
                          <th className="py-2 px-3 font-medium">簽核限制</th>
                          <th className="py-2 px-3 font-medium text-right">狀態</th>
                          <th className="py-2 px-3 font-medium">依據</th>
                          <th className="py-2 px-3 font-medium">動作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {platformEntitlementItems.map((item) => (
                          <tr key={`${item.plan}-${item.role}`} className={`border-t ${executionReviewRowClass(item.status)}`}>
                            <td className="py-2 px-3 font-bold text-slate-100">{item.role}</td>
                            <td className="py-2 px-3">
                              <span className="rounded border border-slate-700 bg-slate-950 px-2 py-0.5 text-[10px] font-bold text-slate-300">
                                {item.plan}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-slate-400">{item.dataScope}</td>
                            <td className="py-2 px-3 font-mono text-[11px] text-slate-400">{item.apiAccess}</td>
                            <td className="py-2 px-3 text-slate-400">{item.tools}</td>
                            <td className="py-2 px-3 text-slate-400">{item.exportRights}</td>
                            <td className="py-2 px-3 text-slate-500">{item.approvalLimit}</td>
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
                    建立 API 合約後，這裡會顯示角色與方案權限矩陣。
                  </div>
                )}
              </div>

              <div className="border-t border-slate-800 pt-3 space-y-3">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-xs font-bold text-slate-100">客戶工作區開通中心</h4>
                      <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${executionReviewBadgeClass(clientWorkspaceProvisioningDecision)}`}>
                        {executionReviewLabel(clientWorkspaceProvisioningDecision)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      將方案與權限落到可開通的工作區、席位、資料包、API key、SSO 與帳務狀態
                    </p>
                  </div>
                  <div className="flex flex-wrap items-end gap-2 text-xs">
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        ["可開通", `${workspaceReadyCount}`],
                        ["阻擋", `${workspaceBlockedCount}`],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-md border border-slate-800 bg-slate-900/70 px-3 py-2 text-right">
                          <p className="text-[10px] text-slate-600">{label}</p>
                          <p className="mt-0.5 font-mono font-bold text-slate-100">{value}</p>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={handleExportClientWorkspaceCsv}
                      disabled={!clientWorkspaceProvisioningItems.length}
                      className="px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold disabled:cursor-not-allowed disabled:bg-slate-950 disabled:text-slate-600"
                    >
                      工作區 CSV
                    </button>
                  </div>
                </div>

                {clientWorkspaceProvisioningItems.length ? (
                  <div className="overflow-x-auto rounded-lg border border-slate-800">
                    <table className="w-full min-w-[1500px] text-xs">
                      <thead className="bg-slate-900/80">
                        <tr className="text-left text-[11px] text-slate-600">
                          <th className="py-2 px-3 font-medium">工作區</th>
                          <th className="py-2 px-3 font-medium">客群</th>
                          <th className="py-2 px-3 font-medium">方案</th>
                          <th className="py-2 px-3 font-medium">席位</th>
                          <th className="py-2 px-3 font-medium">資料包</th>
                          <th className="py-2 px-3 font-medium">API Key</th>
                          <th className="py-2 px-3 font-medium">SSO</th>
                          <th className="py-2 px-3 font-medium">帳務</th>
                          <th className="py-2 px-3 font-medium text-right">狀態</th>
                          <th className="py-2 px-3 font-medium">依據</th>
                          <th className="py-2 px-3 font-medium">動作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {clientWorkspaceProvisioningItems.map((item) => (
                          <tr key={`${item.plan}-${item.workspace}`} className={`border-t ${executionReviewRowClass(item.status)}`}>
                            <td className="py-2 px-3 font-bold text-slate-100">{item.workspace}</td>
                            <td className="py-2 px-3 text-slate-400">{item.segment}</td>
                            <td className="py-2 px-3">
                              <span className="rounded border border-slate-700 bg-slate-950 px-2 py-0.5 text-[10px] font-bold text-slate-300">
                                {item.plan}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-slate-400">{item.seats}</td>
                            <td className="py-2 px-3 text-slate-400">{item.dataPackages}</td>
                            <td className="py-2 px-3 text-slate-400">{item.apiKeys}</td>
                            <td className="py-2 px-3 text-slate-400">{item.sso}</td>
                            <td className="py-2 px-3 text-slate-500">{item.billing}</td>
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
                    建立權限矩陣後，這裡會顯示客戶工作區開通清單。
                  </div>
                )}
              </div>

              <div className="border-t border-slate-800 pt-3 space-y-3">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-xs font-bold text-slate-100">用量與帳務中心</h4>
                      <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${executionReviewBadgeClass(usageBillingDecision)}`}>
                        {executionReviewLabel(usageBillingDecision)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      追蹤席位、API call、匯出量、月費/合約、發票狀態與下一步收款動作
                    </p>
                  </div>
                  <div className="flex flex-wrap items-end gap-2 text-xs">
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        ["可收費", `${billableWorkspaceCount}`],
                        ["就緒", `${billingReadyCount}`],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-md border border-slate-800 bg-slate-900/70 px-3 py-2 text-right">
                          <p className="text-[10px] text-slate-600">{label}</p>
                          <p className="mt-0.5 font-mono font-bold text-slate-100">{value}</p>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={handleExportUsageBillingCsv}
                      disabled={!usageBillingItems.length}
                      className="px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold disabled:cursor-not-allowed disabled:bg-slate-950 disabled:text-slate-600"
                    >
                      帳務 CSV
                    </button>
                  </div>
                </div>

                {usageBillingItems.length ? (
                  <div className="overflow-x-auto rounded-lg border border-slate-800">
                    <table className="w-full min-w-[1500px] text-xs">
                      <thead className="bg-slate-900/80">
                        <tr className="text-left text-[11px] text-slate-600">
                          <th className="py-2 px-3 font-medium">工作區</th>
                          <th className="py-2 px-3 font-medium">方案</th>
                          <th className="py-2 px-3 font-medium">帳務模式</th>
                          <th className="py-2 px-3 font-medium">席位用量</th>
                          <th className="py-2 px-3 font-medium">API 用量</th>
                          <th className="py-2 px-3 font-medium">匯出用量</th>
                          <th className="py-2 px-3 font-medium">月收入</th>
                          <th className="py-2 px-3 font-medium">發票/合約</th>
                          <th className="py-2 px-3 font-medium text-right">狀態</th>
                          <th className="py-2 px-3 font-medium">依據</th>
                          <th className="py-2 px-3 font-medium">動作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {usageBillingItems.map((item) => (
                          <tr key={`${item.plan}-${item.workspace}`} className={`border-t ${executionReviewRowClass(item.status)}`}>
                            <td className="py-2 px-3 font-bold text-slate-100">{item.workspace}</td>
                            <td className="py-2 px-3">
                              <span className="rounded border border-slate-700 bg-slate-950 px-2 py-0.5 text-[10px] font-bold text-slate-300">
                                {item.plan}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-slate-400">{item.billingModel}</td>
                            <td className="py-2 px-3 text-slate-400">{item.seatUsage}</td>
                            <td className="py-2 px-3 text-slate-400">{item.apiUsage}</td>
                            <td className="py-2 px-3 text-slate-400">{item.exportUsage}</td>
                            <td className="py-2 px-3 font-mono text-[11px] text-slate-300">{item.monthlyRevenue}</td>
                            <td className="py-2 px-3 text-slate-500">{item.invoiceStatus}</td>
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
                    建立客戶工作區後，這裡會顯示用量與帳務資料。
                  </div>
                )}
              </div>

    </>
  );
}
