export type PlatformCommandProductNavigatorStatus = "pass" | "watch" | "block";

export type PlatformCommandProductNavigatorInput = {
  areaId: string;
  title: string;
  stage: string;
  owner: string;
  href: string;
  statuses: PlatformCommandProductNavigatorStatus[];
  recordCount: number;
  moduleCount: number;
  entryPoint: string;
  narrative: string;
  modules: string[];
};

export type PlatformCommandProductNavigatorItem = PlatformCommandProductNavigatorInput & {
  status: PlatformCommandProductNavigatorStatus;
  blockCount: number;
  watchCount: number;
  passCount: number;
  completionScore: number;
  priority: "critical" | "review" | "ready";
  nextAction: string;
};

export type PlatformCommandProductNavigatorSummary = {
  status: PlatformCommandProductNavigatorStatus;
  areaCount: number;
  moduleCount: number;
  recordCount: number;
  blockCount: number;
  watchCount: number;
  passCount: number;
  averageCompletionScore: number;
  recommendedFocus: string;
};

function groupStatus(statuses: PlatformCommandProductNavigatorStatus[]): PlatformCommandProductNavigatorStatus {
  if (statuses.includes("block")) return "block";
  if (statuses.includes("watch")) return "watch";
  return "pass";
}

function completionScoreFor(statuses: PlatformCommandProductNavigatorStatus[]) {
  if (!statuses.length) return 0;

  const penalty = statuses.reduce((sum, status) => {
    if (status === "block") return sum + 16;
    if (status === "watch") return sum + 7;
    return sum;
  }, 0);

  return Math.max(0, Math.min(100, 100 - penalty));
}

function priorityFor(status: PlatformCommandProductNavigatorStatus): PlatformCommandProductNavigatorItem["priority"] {
  if (status === "block") return "critical";
  if (status === "watch") return "review";
  return "ready";
}

function nextActionFor(item: PlatformCommandProductNavigatorInput, status: PlatformCommandProductNavigatorStatus) {
  if (status === "block") return `先處理 ${item.title} 的阻塞，再往下游輸出`;
  if (status === "watch") return `進入 ${item.title} 複核，確認例外是否可揭露`;
  return `可從 ${item.title} 進入下一層產品工作流`;
}

export function buildPlatformCommandProductNavigatorItems(
  inputs: PlatformCommandProductNavigatorInput[],
): PlatformCommandProductNavigatorItem[] {
  return inputs.map((item) => {
    const status = groupStatus(item.statuses);
    const blockCount = item.statuses.filter((value) => value === "block").length;
    const watchCount = item.statuses.filter((value) => value === "watch").length;

    return {
      ...item,
      status,
      blockCount,
      watchCount,
      passCount: item.statuses.filter((value) => value === "pass").length,
      completionScore: completionScoreFor(item.statuses),
      priority: priorityFor(status),
      nextAction: nextActionFor(item, status),
    };
  });
}

export function summarizePlatformCommandProductNavigator(
  items: PlatformCommandProductNavigatorItem[],
): PlatformCommandProductNavigatorSummary {
  const blockCount = items.filter((item) => item.status === "block").length;
  const watchCount = items.filter((item) => item.status === "watch").length;
  const averageCompletionScore = items.length
    ? Math.round(items.reduce((sum, item) => sum + item.completionScore, 0) / items.length)
    : 0;

  return {
    status: blockCount > 0 ? "block" : watchCount > 0 ? "watch" : "pass",
    areaCount: items.length,
    moduleCount: items.reduce((sum, item) => sum + item.moduleCount, 0),
    recordCount: items.reduce((sum, item) => sum + item.recordCount, 0),
    blockCount,
    watchCount,
    passCount: items.filter((item) => item.status === "pass").length,
    averageCompletionScore,
    recommendedFocus:
      blockCount > 0
        ? "先處理紅色區域"
        : watchCount > 0
          ? "先複核黃色區域"
          : "可直接進入 CEO / 對外輸出層",
  };
}
