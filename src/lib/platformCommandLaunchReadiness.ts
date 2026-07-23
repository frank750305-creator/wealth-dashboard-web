import type {
  PlatformCommandProductNavigatorActiveArea,
  PlatformCommandProductNavigatorItem,
  PlatformCommandProductNavigatorStatus,
  PlatformCommandProductNavigatorSummary,
} from "@/lib/platformCommandProductNavigator";

export type PlatformCommandLaunchReadinessState = "blocked" | "conditional" | "ready" | "complete";
export type PlatformCommandLaunchReadinessSignal = "hold" | "review" | "launch" | "complete";

export type PlatformCommandLaunchReadinessItem = {
  checkId: string;
  areaId: PlatformCommandProductNavigatorActiveArea;
  title: string;
  owner: string;
  state: PlatformCommandLaunchReadinessState;
  signal: PlatformCommandLaunchReadinessSignal;
  status: PlatformCommandProductNavigatorStatus;
  score: number;
  evidence: string;
  decisionGate: string;
  nextAction: string;
};

export type PlatformCommandLaunchReadinessSummary = {
  status: PlatformCommandProductNavigatorStatus;
  itemCount: number;
  blockedCount: number;
  conditionalCount: number;
  readyCount: number;
  completeCount: number;
  platformCompletion: number;
  operatingReadinessScore: number;
  launchDecision: string;
};

const requiredAreaCount = 6;
const requiredModuleCount = 36;
const requiredRecordCount = 100;

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function structuralCompletion(summary: PlatformCommandProductNavigatorSummary) {
  const areaScore = Math.min(1, summary.areaCount / requiredAreaCount) * 40;
  const moduleScore = Math.min(1, summary.moduleCount / requiredModuleCount) * 40;
  const recordScore = Math.min(1, summary.recordCount / requiredRecordCount) * 20;
  return clampPercent(areaScore + moduleScore + recordScore);
}

function stateForNavigatorItem(item: PlatformCommandProductNavigatorItem): PlatformCommandLaunchReadinessState {
  if (item.status === "block") return "blocked";
  if (item.status === "watch") return "conditional";
  if (item.completionScore >= 96) return "complete";
  return "ready";
}

function signalForState(state: PlatformCommandLaunchReadinessState): PlatformCommandLaunchReadinessSignal {
  if (state === "blocked") return "hold";
  if (state === "conditional") return "review";
  if (state === "complete") return "complete";
  return "launch";
}

function aggregateState(score: number): PlatformCommandLaunchReadinessState {
  if (score >= 100) return "complete";
  if (score >= 90) return "ready";
  return "conditional";
}

function averageScore(items: PlatformCommandLaunchReadinessItem[]) {
  if (!items.length) return 0;
  return clampPercent(items.reduce((sum, item) => sum + item.score, 0) / items.length);
}

export function platformCommandLaunchReadinessStateLabel(state: PlatformCommandLaunchReadinessState) {
  if (state === "blocked") return "阻塞";
  if (state === "conditional") return "條件通過";
  if (state === "ready") return "可展示";
  return "完成";
}

export function platformCommandLaunchReadinessSignalLabel(signal: PlatformCommandLaunchReadinessSignal) {
  if (signal === "hold") return "Hold";
  if (signal === "review") return "Review";
  if (signal === "launch") return "Launch";
  return "Complete";
}

export function buildPlatformCommandLaunchReadinessItems(
  summary: PlatformCommandProductNavigatorSummary,
  items: PlatformCommandProductNavigatorItem[],
): PlatformCommandLaunchReadinessItem[] {
  const navigatorItems = items.map((item, index): PlatformCommandLaunchReadinessItem => {
    const state = stateForNavigatorItem(item);

    return {
      checkId: `LCH-${String(index + 1).padStart(3, "0")}`,
      areaId: item.areaId,
      title: `${item.title} 完整性`,
      owner: item.owner,
      state,
      signal: signalForState(state),
      status: item.status,
      score: item.completionScore,
      evidence: `${item.moduleCount} modules / ${item.recordCount} records / ${item.passCount} pass / ${item.watchCount} watch / ${item.blockCount} block`,
      decisionGate: item.entryPoint,
      nextAction: item.nextAction,
    };
  });
  const completion = structuralCompletion(summary);
  const platformState = aggregateState(completion);

  return [
    {
      checkId: "LCH-000",
      areaId: "all",
      title: "平台產品骨架完成度",
      owner: "CEO Office / Product",
      state: platformState,
      signal: signalForState(platformState),
      status: completion >= 95 ? "pass" : "watch",
      score: completion,
      evidence: `${summary.areaCount}/${requiredAreaCount} areas / ${summary.moduleCount}/${requiredModuleCount} modules / ${summary.recordCount} records`,
      decisionGate: "所有 Command 區域已能從同一入口被檢視、聚焦與交付",
      nextAction: completion >= 100 ? "進入正式展示與商業化驗收" : "補齊缺口後再做上線驗收",
    },
    ...navigatorItems,
  ];
}

export function summarizePlatformCommandLaunchReadiness(
  items: PlatformCommandLaunchReadinessItem[],
): PlatformCommandLaunchReadinessSummary {
  const blockedCount = items.filter((item) => item.state === "blocked").length;
  const conditionalCount = items.filter((item) => item.state === "conditional").length;
  const readyCount = items.filter((item) => item.state === "ready").length;
  const completeCount = items.filter((item) => item.state === "complete").length;
  const platformCompletion = items.find((item) => item.checkId === "LCH-000")?.score ?? 0;
  const operatingItems = items.filter((item) => item.checkId !== "LCH-000");
  const operatingReadinessScore = averageScore(operatingItems);

  return {
    status: blockedCount > 0 ? "block" : conditionalCount > 0 ? "watch" : "pass",
    itemCount: items.length,
    blockedCount,
    conditionalCount,
    readyCount,
    completeCount,
    platformCompletion,
    operatingReadinessScore,
    launchDecision:
      blockedCount > 0
        ? "暫緩對外上線，先解除紅色 Gate"
        : platformCompletion >= 100 && conditionalCount === 0
          ? "Web MVP 可正式展示與交付"
          : platformCompletion >= 100
            ? "Web MVP 可展示，黃色項目列入上線備註"
            : "產品骨架仍需補齊後再進展示",
  };
}
