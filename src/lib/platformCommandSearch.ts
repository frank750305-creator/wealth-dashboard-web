import {
  accountActionMotionLabel,
  accountActionPriorityLabel,
  type AccountActionQueueItem,
} from "@/lib/accountActionQueue";
import {
  accountHealthStageLabel,
  type AccountHealthItem,
  type AccountHealthStatus,
} from "@/lib/accountHealth";
import type { ApiServiceCatalogItem } from "@/lib/apiServiceLayer";
import type { DataProductErrorBudgetItem } from "@/lib/dataProductErrorBudget";
import { serviceStateLabel, type DataProductStatusPageItem } from "@/lib/dataProductStatusPage";
import type { MarketSource } from "@/types/market";

export type PlatformCommandCategory = "account" | "action" | "data_product" | "api" | "source";
export type PlatformCommandPriority = "critical" | "high" | "medium" | "low";

export type PlatformCommandSearchItem = {
  id: string;
  category: PlatformCommandCategory;
  priority: PlatformCommandPriority;
  status: AccountHealthStatus;
  command: string;
  title: string;
  subtitle: string;
  owner: string;
  metric: string;
  evidence: string;
  nextAction: string;
  keywords: string;
};

export type PlatformCommandSearchSummary = {
  itemCount: number;
  criticalCount: number;
  highCount: number;
  blockCount: number;
  watchCount: number;
  ownerCount: number;
};

function csvCell(value: unknown) {
  const stringValue = String(value ?? "");
  if (/[",\n]/.test(stringValue)) return `"${stringValue.replaceAll('"', '""')}"`;
  return stringValue;
}

function formatCurrency(value: number) {
  if (value === 0) return "NT$0";
  return `NT$${value.toLocaleString("zh-TW")}`;
}

function searchKeywords(values: unknown[]) {
  return values
    .flatMap((value) => (Array.isArray(value) ? value : [value]))
    .map((value) => String(value ?? "").toLowerCase())
    .join(" ");
}

function priorityRank(priority: PlatformCommandPriority) {
  if (priority === "critical") return 4;
  if (priority === "high") return 3;
  if (priority === "medium") return 2;
  return 1;
}

function statusRank(status: AccountHealthStatus) {
  if (status === "block") return 3;
  if (status === "watch") return 2;
  return 1;
}

function actionPriority(priority: AccountActionQueueItem["priority"]): PlatformCommandPriority {
  if (priority === "p0") return "critical";
  if (priority === "p1") return "high";
  if (priority === "p2") return "medium";
  return "low";
}

function accountPriority(item: AccountHealthItem): PlatformCommandPriority {
  if (item.stage === "risk" || item.productImpactSeverity === "critical") return "critical";
  if (item.stage === "watch" || item.productImpactSeverity === "watch") return "high";
  if (item.stage === "expand") return "medium";
  return "low";
}

function dataProductPriority(item: DataProductStatusPageItem): PlatformCommandPriority {
  if (item.serviceState === "incident") return "critical";
  if (item.serviceState === "degraded") return "high";
  return "low";
}

function errorBudgetPriority(item: DataProductErrorBudgetItem): PlatformCommandPriority {
  if (item.releasePolicy === "freeze") return "critical";
  if (item.releasePolicy === "guarded") return "high";
  return "low";
}

function apiPriority(item: ApiServiceCatalogItem): PlatformCommandPriority {
  if (item.status === "block") return "critical";
  if (item.status === "watch") return "medium";
  return "low";
}

function sourceStatus(source: MarketSource): AccountHealthStatus {
  if (source.status === "needs_secret") return "block";
  if (source.status === "batch_only" || source.status === "local_only") return "watch";
  return "pass";
}

function sourcePriority(source: MarketSource): PlatformCommandPriority {
  if (source.status === "needs_secret") return "critical";
  if (source.status === "batch_only" || source.status === "local_only") return "medium";
  return "low";
}

export function platformCommandCategoryLabel(category: PlatformCommandCategory) {
  if (category === "account") return "Account";
  if (category === "action") return "Action";
  if (category === "data_product") return "Data Product";
  if (category === "api") return "API";
  return "Source";
}

export function platformCommandPriorityLabel(priority: PlatformCommandPriority) {
  if (priority === "critical") return "Critical";
  if (priority === "high") return "High";
  if (priority === "medium") return "Medium";
  return "Low";
}

export function platformCommandStatusLabel(status: AccountHealthStatus) {
  if (status === "pass") return "通過";
  if (status === "watch") return "觀察";
  return "暫停";
}

export function buildPlatformCommandSearchItems({
  accountHealthItems,
  accountActionQueueItems,
  dataProductStatusPageItems,
  dataProductErrorBudgetItems,
  apiServiceCatalogItems,
  sources,
}: {
  accountHealthItems: AccountHealthItem[];
  accountActionQueueItems: AccountActionQueueItem[];
  dataProductStatusPageItems: DataProductStatusPageItem[];
  dataProductErrorBudgetItems: DataProductErrorBudgetItem[];
  apiServiceCatalogItems: ApiServiceCatalogItem[];
  sources: MarketSource[];
}): PlatformCommandSearchItem[] {
  const actionCommands = accountActionQueueItems.map((item): PlatformCommandSearchItem => ({
    id: `action:${item.workspace}`,
    category: "action",
    priority: actionPriority(item.priority),
    status: item.status,
    command: `ACTION ${item.workspace.toUpperCase().replaceAll(" ", "_")}`,
    title: `${accountActionPriorityLabel(item.priority)} ${item.workspace}`,
    subtitle: `${accountActionMotionLabel(item.motion)} / ${item.dueWindow}`,
    owner: item.owner,
    metric: item.targetMrr ? formatCurrency(item.targetMrr) : item.dueWindow,
    evidence: item.evidence,
    nextAction: item.nextAction,
    keywords: searchKeywords([item.workspace, item.plan, item.motion, item.priority, item.owner, item.playbook, item.evidence, item.nextAction]),
  }));

  const accountCommands = accountHealthItems.map((item): PlatformCommandSearchItem => ({
    id: `account:${item.workspace}`,
    category: "account",
    priority: accountPriority(item),
    status: item.status,
    command: `ACCT ${item.workspace.toUpperCase().replaceAll(" ", "_")}`,
    title: item.workspace,
    subtitle: `${item.segment} / ${accountHealthStageLabel(item.stage)}`,
    owner: item.owner,
    metric: `${item.healthScore} 分 / ${Math.round(item.renewalProbability * 100)}%`,
    evidence: item.riskDrivers.join(" / "),
    nextAction: item.nextAction,
    keywords: searchKeywords([item.workspace, item.segment, item.plan, item.stage, item.owner, item.riskDrivers, item.nextAction]),
  }));

  const statusCommands = dataProductStatusPageItems.map((item): PlatformCommandSearchItem => ({
    id: `data-product-status:${item.product}`,
    category: "data_product",
    priority: dataProductPriority(item),
    status: item.status,
    command: `DP ${item.product.toUpperCase().replaceAll(" ", "_")}`,
    title: item.product,
    subtitle: `${item.domain} / ${serviceStateLabel(item.serviceState)}`,
    owner: item.owner,
    metric: `${item.sloScore} SLO`,
    evidence: item.customerMessage,
    nextAction: item.operatorNote,
    keywords: searchKeywords([item.domain, item.product, item.serviceState, item.status, item.owner, item.customerMessage, item.operatorNote]),
  }));

  const budgetCommands = dataProductErrorBudgetItems.map((item): PlatformCommandSearchItem => ({
    id: `error-budget:${item.product}`,
    category: "data_product",
    priority: errorBudgetPriority(item),
    status: item.releasePolicy === "freeze" ? "block" : item.releasePolicy === "guarded" ? "watch" : "pass",
    command: `SLO ${item.product.toUpperCase().replaceAll(" ", "_")}`,
    title: `${item.product} Error Budget`,
    subtitle: `${item.domain} / ${item.releasePolicy}`,
    owner: item.owner,
    metric: `${Math.round(item.budgetRemainingPercent * 100)}% budget`,
    evidence: item.evidence,
    nextAction: item.action,
    keywords: searchKeywords([item.domain, item.product, item.releasePolicy, item.owner, item.evidence, item.action]),
  }));

  const apiCommands = apiServiceCatalogItems.map((item): PlatformCommandSearchItem => ({
    id: `api:${item.method}:${item.endpoint}`,
    category: "api",
    priority: apiPriority(item),
    status: item.status,
    command: `${item.method} ${item.endpoint}`,
    title: item.product,
    subtitle: `${item.method} ${item.endpoint}`,
    owner: item.owner,
    metric: item.serviceLevel,
    evidence: `${item.consumer} / ${item.output}`,
    nextAction: item.action,
    keywords: searchKeywords([item.endpoint, item.method, item.product, item.status, item.owner, item.consumer, item.input, item.output, item.action]),
  }));

  const sourceCommands = sources.map((source): PlatformCommandSearchItem => ({
    id: `source:${source.id}`,
    category: "source",
    priority: sourcePriority(source),
    status: sourceStatus(source),
    command: `SRC ${source.id.toUpperCase().replaceAll(" ", "_")}`,
    title: source.name,
    subtitle: `${source.provider} / ${source.category}`,
    owner: "資料工程",
    metric: source.status,
    evidence: `${source.currentStorage} / ${source.integrationPath}`,
    nextAction: source.nextAction,
    keywords: searchKeywords([source.id, source.name, source.provider, source.category, source.status, source.currentStorage, source.integrationPath, source.nextAction]),
  }));

  return [
    ...actionCommands,
    ...accountCommands,
    ...statusCommands,
    ...budgetCommands,
    ...apiCommands,
    ...sourceCommands,
  ].sort(
    (left, right) =>
      priorityRank(right.priority) - priorityRank(left.priority) ||
      statusRank(right.status) - statusRank(left.status) ||
      left.category.localeCompare(right.category, "zh-Hant") ||
      left.title.localeCompare(right.title, "zh-Hant"),
  );
}

export function summarizePlatformCommandSearch(items: PlatformCommandSearchItem[]): PlatformCommandSearchSummary {
  return {
    itemCount: items.length,
    criticalCount: items.filter((item) => item.priority === "critical").length,
    highCount: items.filter((item) => item.priority === "high").length,
    blockCount: items.filter((item) => item.status === "block").length,
    watchCount: items.filter((item) => item.status === "watch").length,
    ownerCount: new Set(items.map((item) => item.owner)).size,
  };
}

export function platformCommandSearchCsv(items: PlatformCommandSearchItem[]) {
  const header = [
    "command",
    "category",
    "priority",
    "status",
    "title",
    "subtitle",
    "owner",
    "metric",
    "evidence",
    "next_action",
  ];
  const rows = items.map((item) => [
    item.command,
    platformCommandCategoryLabel(item.category),
    platformCommandPriorityLabel(item.priority),
    platformCommandStatusLabel(item.status),
    item.title,
    item.subtitle,
    item.owner,
    item.metric,
    item.evidence,
    item.nextAction,
  ]);

  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}
