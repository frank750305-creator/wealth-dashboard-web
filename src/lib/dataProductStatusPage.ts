import type {
  DataProductObservabilityStatus,
  DataProductReliabilityAction,
  DataProductSloItem,
} from "@/lib/dataProductObservability";

export type DataProductServiceState = "operational" | "degraded" | "incident";

export type DataProductStatusPageItem = {
  domain: string;
  product: string;
  serviceState: DataProductServiceState;
  status: DataProductObservabilityStatus;
  sloScore: number;
  openActionCount: number;
  clientImpact: string;
  nextUpdate: string;
  owner: string;
  customerMessage: string;
  operatorNote: string;
};

export type DataProductStatusPageSummary = {
  serviceState: DataProductServiceState;
  operationalCount: number;
  degradedCount: number;
  incidentCount: number;
  productCount: number;
  nextUpdate: string;
  customerMessage: string;
};

function csvCell(value: unknown) {
  const stringValue = String(value ?? "");
  if (/[",\n]/.test(stringValue)) return `"${stringValue.replaceAll('"', '""')}"`;
  return stringValue;
}

function statusLabel(status: DataProductObservabilityStatus) {
  if (status === "pass") return "通過";
  if (status === "watch") return "觀察";
  return "暫停";
}

export function serviceStateLabel(state: DataProductServiceState) {
  if (state === "operational") return "Operational";
  if (state === "degraded") return "Degraded";
  return "Incident";
}

function serviceStateFromSlo(item: DataProductSloItem, openActionCount: number): DataProductServiceState {
  if (item.status === "block" || item.score < 65 || openActionCount >= 2) return "incident";
  if (item.status === "watch" || item.score < 90 || openActionCount > 0) return "degraded";
  return "operational";
}

function clientImpactFromState(state: DataProductServiceState) {
  if (state === "operational") return "無明顯客戶影響";
  if (state === "degraded") return "部分資料或工作流可能需要人工確認";
  return "資料服務可能暫停正式決策或客戶輸出";
}

function nextUpdateFromState(state: DataProductServiceState) {
  if (state === "incident") return "4 小時內更新";
  if (state === "degraded") return "24 小時內更新";
  return "下次例行檢查";
}

function customerMessageFromState(state: DataProductServiceState, product: string) {
  if (state === "operational") return `${product} 服務正常，資料與 API 可按目前規則使用。`;
  if (state === "degraded") return `${product} 服務處於觀察狀態，部分資料同步或稽核仍需確認。`;
  return `${product} 服務存在阻擋項，正式輸出前需先完成修復與覆核。`;
}

function operatorNoteFromAction(actions: DataProductReliabilityAction[], fallbackAction: string) {
  const firstAction = actions[0];
  if (!firstAction) return fallbackAction;
  return `${firstAction.sla} / ${firstAction.trigger} / ${firstAction.action}`;
}

export function buildDataProductStatusPageItems({
  sloItems,
  reliabilityActions,
}: {
  sloItems: DataProductSloItem[];
  reliabilityActions: DataProductReliabilityAction[];
}): DataProductStatusPageItem[] {
  return sloItems.map((item) => {
    const matchedActions = reliabilityActions.filter(
      (action) => action.domain === item.domain && action.product === item.product,
    );
    const serviceState = serviceStateFromSlo(item, matchedActions.length);

    return {
      domain: item.domain,
      product: item.product,
      serviceState,
      status: item.status,
      sloScore: item.score,
      openActionCount: matchedActions.length,
      clientImpact: clientImpactFromState(serviceState),
      nextUpdate: nextUpdateFromState(serviceState),
      owner: item.owner,
      customerMessage: customerMessageFromState(serviceState, item.product),
      operatorNote: operatorNoteFromAction(matchedActions, item.action),
    };
  });
}

export function summarizeDataProductStatusPage(items: DataProductStatusPageItem[]): DataProductStatusPageSummary {
  const operationalCount = items.filter((item) => item.serviceState === "operational").length;
  const degradedCount = items.filter((item) => item.serviceState === "degraded").length;
  const incidentCount = items.filter((item) => item.serviceState === "incident").length;
  const serviceState: DataProductServiceState =
    incidentCount > 0 ? "incident" : degradedCount > 0 ? "degraded" : "operational";

  return {
    serviceState,
    operationalCount,
    degradedCount,
    incidentCount,
    productCount: items.length,
    nextUpdate: nextUpdateFromState(serviceState),
    customerMessage:
      serviceState === "operational"
        ? "全部資料產品服務正常。"
        : serviceState === "degraded"
          ? "部分資料產品處於觀察狀態，需持續追蹤同步與稽核。"
          : "存在資料產品 incident，正式對客戶輸出前需先修復。",
  };
}

export function dataProductStatusPageCsv(items: DataProductStatusPageItem[]) {
  const header = [
    "domain",
    "product",
    "service_state",
    "status",
    "slo_score",
    "open_action_count",
    "client_impact",
    "next_update",
    "owner",
    "customer_message",
    "operator_note",
  ];
  const rows = items.map((item) => [
    item.domain,
    item.product,
    serviceStateLabel(item.serviceState),
    statusLabel(item.status),
    item.sloScore,
    item.openActionCount,
    item.clientImpact,
    item.nextUpdate,
    item.owner,
    item.customerMessage,
    item.operatorNote,
  ]);

  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}
