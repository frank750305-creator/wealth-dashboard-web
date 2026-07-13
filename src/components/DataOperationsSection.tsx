import type { DataLineageItem, DataRemediationItem } from "@/lib/dataGovernanceCatalog";
import type {
  CoverageUniverseItem,
  DataContractItem,
  DataPipelineHealthItem,
  DataPipelineTableSnapshot,
} from "@/lib/dataWarehouseMonitoring";
import { executionHandoffPriorityClass, executionHandoffPriorityLabel } from "@/lib/executionOperationsWorkflow";

type ExecutionStatus = "pass" | "watch" | "block";

type DataOperationsSectionProps = {
  dataPipelineDecision: ExecutionStatus;
  dataPipelineBlockCount: number;
  dataPipelineWatchCount: number;
  dataPipelineGeneratedAt?: string;
  dataPipelineHealthItems: DataPipelineHealthItem[];
  dataPipelineTableSnapshots: DataPipelineTableSnapshot[];
  dataContractDecision: ExecutionStatus;
  dataContractBlockCount: number;
  dataContractWatchCount: number;
  dataContractItems: DataContractItem[];
  onExportDataContractCsv: () => void;
  coverageUniverseDecision: ExecutionStatus;
  coverageUniverseBlockCount: number;
  coverageUniverseWatchCount: number;
  coverageUniverseItems: CoverageUniverseItem[];
  onExportCoverageUniverseCsv: () => void;
  dataRemediationDecision: ExecutionStatus;
  dataRemediationHighCount: number;
  dataRemediationMediumCount: number;
  dataRemediationItems: DataRemediationItem[];
  onExportDataRemediationCsv: () => void;
  dataLineageDecision: ExecutionStatus;
  dataLineageBlockCount: number;
  dataLineageWatchCount: number;
  dataLineageItems: DataLineageItem[];
  onExportDataLineageCsv: () => void;
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

export function DataOperationsSection({
  dataPipelineDecision,
  dataPipelineBlockCount,
  dataPipelineWatchCount,
  dataPipelineGeneratedAt,
  dataPipelineHealthItems,
  dataPipelineTableSnapshots,
  dataContractDecision,
  dataContractBlockCount,
  dataContractWatchCount,
  dataContractItems,
  onExportDataContractCsv: handleExportDataContractCsv,
  coverageUniverseDecision,
  coverageUniverseBlockCount,
  coverageUniverseWatchCount,
  coverageUniverseItems,
  onExportCoverageUniverseCsv: handleExportCoverageUniverseCsv,
  dataRemediationDecision,
  dataRemediationHighCount,
  dataRemediationMediumCount,
  dataRemediationItems,
  onExportDataRemediationCsv: handleExportDataRemediationCsv,
  dataLineageDecision,
  dataLineageBlockCount,
  dataLineageWatchCount,
  dataLineageItems,
  onExportDataLineageCsv: handleExportDataLineageCsv,
}: DataOperationsSectionProps) {
  return (
    <>
              <div className="border-t border-slate-800 pt-3 space-y-3">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-xs font-bold text-slate-100">資料管線監控台</h4>
                      <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${executionReviewBadgeClass(dataPipelineDecision)}`}>
                        {executionReviewLabel(dataPipelineDecision)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      追蹤 BigQuery 憑證、schema、最新日期、row count、覆蓋率、落後商品與匯率幣別
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    {[
                      ["暫停", `${dataPipelineBlockCount}`],
                      ["觀察", `${dataPipelineWatchCount}`],
                      ["診斷", dataPipelineGeneratedAt ? "已更新" : "待讀取"],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-md border border-slate-800 bg-slate-900/70 px-3 py-2 text-right">
                        <p className="text-[10px] text-slate-600">{label}</p>
                        <p className="mt-0.5 font-mono font-bold text-slate-100">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                  <div className="overflow-x-auto rounded-lg border border-slate-800">
                    <table className="w-full min-w-[760px] text-xs">
                      <thead className="bg-slate-900/80">
                        <tr className="text-left text-[11px] text-slate-600">
                          <th className="py-2 px-3 font-medium">檢查項</th>
                          <th className="py-2 px-3 font-medium text-right">狀態</th>
                          <th className="py-2 px-3 font-medium text-right">目前值</th>
                          <th className="py-2 px-3 font-medium">目標</th>
                          <th className="py-2 px-3 font-medium">動作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dataPipelineHealthItems.map((item) => (
                          <tr key={item.label} className={`border-t ${executionReviewRowClass(item.status)}`}>
                            <td className="py-2 px-3 font-bold text-slate-100">{item.label}</td>
                            <td className="py-2 px-3 text-right">
                              <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${executionReviewBadgeClass(item.status)}`}>
                                {executionReviewLabel(item.status)}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-slate-200">{item.value}</td>
                            <td className="py-2 px-3 text-slate-400">{item.target}</td>
                            <td className="py-2 px-3 text-slate-500">{item.action}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="space-y-2">
                    {dataPipelineTableSnapshots.map((item) => (
                      <div key={item.table} className={`rounded-lg border p-3 text-xs ${executionReviewRowClass(item.status)}`}>
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-bold text-slate-100">{item.table}</p>
                            <p className="mt-0.5 text-[11px] text-slate-500">{item.action}</p>
                          </div>
                          <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${executionReviewBadgeClass(item.status)}`}>
                            {executionReviewLabel(item.status)}
                          </span>
                        </div>
                        <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2">
                          {[
                            ["最新日", item.latestDate],
                            ["筆數", item.rowCount],
                            ["覆蓋", item.coverage],
                            ["新鮮度", item.freshness],
                          ].map(([label, value]) => (
                            <div key={label} className="rounded-md border border-slate-800 bg-slate-950/60 p-2 min-w-0">
                              <p className="text-[10px] text-slate-600 truncate">{label}</p>
                              <p className="mt-0.5 font-mono text-slate-100 truncate" title={value}>{value}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-800 pt-3 space-y-3">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-xs font-bold text-slate-100">資料合約中心</h4>
                      <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${executionReviewBadgeClass(dataContractDecision)}`}>
                        {executionReviewLabel(dataContractDecision)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      管理資料表必要欄位、缺欄位、資料量、新鮮度與修復動作
                    </p>
                  </div>
                  <div className="flex flex-wrap items-end gap-2 text-xs">
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        ["暫停", `${dataContractBlockCount}`],
                        ["觀察", `${dataContractWatchCount}`],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-md border border-slate-800 bg-slate-900/70 px-3 py-2 text-right">
                          <p className="text-[10px] text-slate-600">{label}</p>
                          <p className="mt-0.5 font-mono font-bold text-slate-100">{value}</p>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={handleExportDataContractCsv}
                      disabled={!dataContractItems.length}
                      className="px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold disabled:cursor-not-allowed disabled:bg-slate-950 disabled:text-slate-600"
                    >
                      合約 CSV
                    </button>
                  </div>
                </div>

                {dataContractItems.length ? (
                  <div className="overflow-x-auto rounded-lg border border-slate-800">
                    <table className="w-full min-w-[1120px] text-xs">
                      <thead className="bg-slate-900/80">
                        <tr className="text-left text-[11px] text-slate-600">
                          <th className="py-2 px-3 font-medium">資料表</th>
                          <th className="py-2 px-3 font-medium">層級</th>
                          <th className="py-2 px-3 font-medium text-right">狀態</th>
                          <th className="py-2 px-3 font-medium text-right">欄位覆蓋</th>
                          <th className="py-2 px-3 font-medium">缺欄位</th>
                          <th className="py-2 px-3 font-medium text-right">新鮮度</th>
                          <th className="py-2 px-3 font-medium">資料量</th>
                          <th className="py-2 px-3 font-medium">動作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dataContractItems.map((item) => (
                          <tr key={item.table} className={`border-t ${executionReviewRowClass(item.status)}`}>
                            <td className="py-2 px-3 font-mono text-slate-100">{item.table}</td>
                            <td className="py-2 px-3 text-slate-300">{item.layer}</td>
                            <td className="py-2 px-3 text-right">
                              <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${executionReviewBadgeClass(item.status)}`}>
                                {executionReviewLabel(item.status)}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-slate-200">
                              {item.presentColumns.length}/{item.requiredColumns.length}
                            </td>
                            <td className="py-2 px-3 text-slate-400">
                              {item.missingColumns.length ? item.missingColumns.join(", ") : "--"}
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-slate-300">{item.freshness}</td>
                            <td className="py-2 px-3 font-mono text-slate-400">{item.volume}</td>
                            <td className="py-2 px-3 text-slate-500">{item.action}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="rounded-md border border-dashed border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-500">
                    讀取 BigQuery 診斷後，這裡會顯示資料表欄位合約。
                  </div>
                )}
              </div>

              <div className="border-t border-slate-800 pt-3 space-y-3">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-xs font-bold text-slate-100">可投資宇宙覆蓋</h4>
                      <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${executionReviewBadgeClass(coverageUniverseDecision)}`}>
                        {executionReviewLabel(coverageUniverseDecision)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      把商品數、歷史價格深度、落後商品與匯率幣別整理成研究宇宙上線條件
                    </p>
                  </div>
                  <div className="flex flex-wrap items-end gap-2 text-xs">
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        ["暫停", `${coverageUniverseBlockCount}`],
                        ["觀察", `${coverageUniverseWatchCount}`],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-md border border-slate-800 bg-slate-900/70 px-3 py-2 text-right">
                          <p className="text-[10px] text-slate-600">{label}</p>
                          <p className="mt-0.5 font-mono font-bold text-slate-100">{value}</p>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={handleExportCoverageUniverseCsv}
                      disabled={!coverageUniverseItems.length}
                      className="px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold disabled:cursor-not-allowed disabled:bg-slate-950 disabled:text-slate-600"
                    >
                      宇宙 CSV
                    </button>
                  </div>
                </div>

                {coverageUniverseItems.length ? (
                  <div className="overflow-x-auto rounded-lg border border-slate-800">
                    <table className="w-full min-w-[1040px] text-xs">
                      <thead className="bg-slate-900/80">
                        <tr className="text-left text-[11px] text-slate-600">
                          <th className="py-2 px-3 font-medium">項目</th>
                          <th className="py-2 px-3 font-medium text-right">狀態</th>
                          <th className="py-2 px-3 font-medium text-right">數量</th>
                          <th className="py-2 px-3 font-medium">目標</th>
                          <th className="py-2 px-3 font-medium">覆蓋</th>
                          <th className="py-2 px-3 font-medium">動作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {coverageUniverseItems.map((item) => (
                          <tr key={item.label} className={`border-t ${executionReviewRowClass(item.status)}`}>
                            <td className="py-2 px-3 font-bold text-slate-100">{item.label}</td>
                            <td className="py-2 px-3 text-right">
                              <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${executionReviewBadgeClass(item.status)}`}>
                                {executionReviewLabel(item.status)}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-slate-200">{item.count}</td>
                            <td className="py-2 px-3 text-slate-400">{item.target}</td>
                            <td className="py-2 px-3 text-slate-400">{item.coverage}</td>
                            <td className="py-2 px-3 text-slate-500">{item.action}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="rounded-md border border-dashed border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-500">
                    讀取 BigQuery 診斷後，這裡會顯示可投資宇宙覆蓋狀態。
                  </div>
                )}
              </div>

              <div className="border-t border-slate-800 pt-3 space-y-3">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-xs font-bold text-slate-100">資料缺口修復佇列</h4>
                      <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${executionReviewBadgeClass(dataRemediationDecision)}`}>
                        {executionReviewLabel(dataRemediationDecision)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      將資料源接線、管線、合約與研究宇宙問題合併成可分派的修復清單
                    </p>
                  </div>
                  <div className="flex flex-wrap items-end gap-2 text-xs">
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        ["高優先", `${dataRemediationHighCount}`],
                        ["中優先", `${dataRemediationMediumCount}`],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-md border border-slate-800 bg-slate-900/70 px-3 py-2 text-right">
                          <p className="text-[10px] text-slate-600">{label}</p>
                          <p className="mt-0.5 font-mono font-bold text-slate-100">{value}</p>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={handleExportDataRemediationCsv}
                      disabled={!dataRemediationItems.length}
                      className="px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold disabled:cursor-not-allowed disabled:bg-slate-950 disabled:text-slate-600"
                    >
                      修復 CSV
                    </button>
                  </div>
                </div>

                {dataRemediationItems.length ? (
                  <div className="overflow-x-auto rounded-lg border border-slate-800">
                    <table className="w-full min-w-[1180px] text-xs">
                      <thead className="bg-slate-900/80">
                        <tr className="text-left text-[11px] text-slate-600">
                          <th className="py-2 px-3 font-medium">來源</th>
                          <th className="py-2 px-3 font-medium">項目</th>
                          <th className="py-2 px-3 font-medium text-right">優先級</th>
                          <th className="py-2 px-3 font-medium text-right">狀態</th>
                          <th className="py-2 px-3 font-medium">依據</th>
                          <th className="py-2 px-3 font-medium">影響</th>
                          <th className="py-2 px-3 font-medium">動作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dataRemediationItems.map((item) => (
                          <tr key={`${item.source}-${item.item}`} className={`border-t ${executionReviewRowClass(item.status)}`}>
                            <td className="py-2 px-3 text-slate-400">{item.source}</td>
                            <td className="py-2 px-3 font-bold text-slate-100">{item.item}</td>
                            <td className="py-2 px-3 text-right">
                              <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${executionHandoffPriorityClass(item.priority)}`}>
                                {executionHandoffPriorityLabel(item.priority)}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-right">
                              <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${executionReviewBadgeClass(item.status)}`}>
                                {executionReviewLabel(item.status)}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-slate-400">{item.evidence}</td>
                            <td className="py-2 px-3 text-slate-400">{item.impact}</td>
                            <td className="py-2 px-3 text-slate-500">{item.action}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="rounded-md border border-dashed border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-500">
                    目前沒有待處理資料缺口。
                  </div>
                )}
              </div>

              <div className="border-t border-slate-800 pt-3 space-y-3">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-xs font-bold text-slate-100">資料血緣地圖</h4>
                      <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${executionReviewBadgeClass(dataLineageDecision)}`}>
                        {executionReviewLabel(dataLineageDecision)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      從外部資料源、BigQuery 倉儲、合約、研究宇宙一路追到前端分析產品
                    </p>
                  </div>
                  <div className="flex flex-wrap items-end gap-2 text-xs">
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        ["阻斷", `${dataLineageBlockCount}`],
                        ["觀察", `${dataLineageWatchCount}`],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-md border border-slate-800 bg-slate-900/70 px-3 py-2 text-right">
                          <p className="text-[10px] text-slate-600">{label}</p>
                          <p className="mt-0.5 font-mono font-bold text-slate-100">{value}</p>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={handleExportDataLineageCsv}
                      disabled={!dataLineageItems.length}
                      className="px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold disabled:cursor-not-allowed disabled:bg-slate-950 disabled:text-slate-600"
                    >
                      血緣 CSV
                    </button>
                  </div>
                </div>

                {dataLineageItems.length ? (
                  <div className="overflow-x-auto rounded-lg border border-slate-800">
                    <table className="w-full min-w-[1180px] text-xs">
                      <thead className="bg-slate-900/80">
                        <tr className="text-left text-[11px] text-slate-600">
                          <th className="py-2 px-3 font-medium">階段</th>
                          <th className="py-2 px-3 font-medium">節點</th>
                          <th className="py-2 px-3 font-medium text-right">狀態</th>
                          <th className="py-2 px-3 font-medium">輸入</th>
                          <th className="py-2 px-3 font-medium">輸出</th>
                          <th className="py-2 px-3 font-medium">依據</th>
                          <th className="py-2 px-3 font-medium">動作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dataLineageItems.map((item) => (
                          <tr key={`${item.stage}-${item.node}`} className={`border-t ${executionReviewRowClass(item.status)}`}>
                            <td className="py-2 px-3 text-slate-400">{item.stage}</td>
                            <td className="py-2 px-3 font-bold text-slate-100">{item.node}</td>
                            <td className="py-2 px-3 text-right">
                              <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${executionReviewBadgeClass(item.status)}`}>
                                {executionReviewLabel(item.status)}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-slate-400">{item.input}</td>
                            <td className="py-2 px-3 text-slate-400">{item.output}</td>
                            <td className="py-2 px-3 text-slate-500">{item.evidence}</td>
                            <td className="py-2 px-3 text-slate-500">{item.action}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="rounded-md border border-dashed border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-500">
                    讀取資料診斷後，這裡會顯示資料血緣。
                  </div>
                )}
              </div>

    </>
  );
}
