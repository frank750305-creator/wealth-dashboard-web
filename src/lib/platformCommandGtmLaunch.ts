import {
  platformCommandBookingSignalLabel,
  platformCommandRevenueReadinessStateLabel,
  type PlatformCommandBookingSignal,
  type PlatformCommandRevenueReadinessItem,
  type PlatformCommandRevenueReadinessState,
} from "@/lib/platformCommandRevenueReadiness";
import {
  platformCommandResidualRiskLabel,
  type PlatformCommandResidualRisk,
} from "@/lib/platformCommandClosure";
import { platformCommandStatusLabel } from "@/lib/platformCommandSearch";

export type PlatformCommandGtmLaunchState = "blocked" | "enablement" | "pilot_launch" | "live";
export type PlatformCommandLaunchSignal = "hold" | "controlled" | "scale";

export type PlatformCommandGtmLaunchItem = {
  launchId: string;
  revenueId: string;
  packageId: string;
  decisionId: string;
  owner: string;
  launchOwner: string;
  gtmLaunchState: PlatformCommandGtmLaunchState;
  launchSignal: PlatformCommandLaunchSignal;
  revenueReadinessState: PlatformCommandRevenueReadinessState;
  bookingSignal: PlatformCommandBookingSignal;
  status: PlatformCommandRevenueReadinessItem["status"];
  residualRisk: PlatformCommandResidualRisk;
  readinessScore: number;
  sourceRoute: string;
  buyerSegment: string;
  launchMotion: string;
  enablementAsset: string;
  demoScript: string;
  crmStage: string;
  launchChannel: string;
  successMetric: string;
  feedbackLoop: string;
  launchWindow: string;
  launchRisk: string;
  nextAction: string;
};

export type PlatformCommandGtmLaunchSummary = {
  status: PlatformCommandRevenueReadinessItem["status"];
  itemCount: number;
  blockedCount: number;
  enablementCount: number;
  pilotLaunchCount: number;
  liveCount: number;
  holdCount: number;
  controlledCount: number;
  scaleCount: number;
  averageReadinessScore: number;
  nextLaunchWindow: string;
};

function csvCell(value: unknown) {
  const stringValue = String(value ?? "");
  if (/[",\n]/.test(stringValue)) return `"${stringValue.replaceAll('"', '""')}"`;
  return stringValue;
}

function gtmLaunchStateFor(item: PlatformCommandRevenueReadinessItem): PlatformCommandGtmLaunchState {
  if (item.revenueReadinessState === "blocked" || item.bookingSignal === "no_go" || item.status === "block") {
    return "blocked";
  }
  if (item.revenueReadinessState === "qualifying" || item.bookingSignal === "pilot_only") return "enablement";
  if (item.revenueReadinessState === "contracting") return "pilot_launch";
  return "live";
}

function launchSignalFor(
  item: PlatformCommandRevenueReadinessItem,
  state: PlatformCommandGtmLaunchState,
): PlatformCommandLaunchSignal {
  if (state === "blocked" || item.residualRisk === "high") return "hold";
  if (state === "enablement" || state === "pilot_launch" || item.residualRisk === "medium") return "controlled";
  return "scale";
}

export function platformCommandGtmLaunchStateLabel(state: PlatformCommandGtmLaunchState) {
  if (state === "blocked") return "Blocked";
  if (state === "enablement") return "Enablement";
  if (state === "pilot_launch") return "Pilot launch";
  return "Live";
}

export function platformCommandLaunchSignalLabel(signal: PlatformCommandLaunchSignal) {
  if (signal === "hold") return "Hold";
  if (signal === "controlled") return "Controlled";
  return "Scale";
}

function launchMotionFor(item: PlatformCommandRevenueReadinessItem, signal: PlatformCommandLaunchSignal) {
  if (signal === "hold") return "不啟動 GTM";
  if (signal === "controlled") return `受控啟動：${item.salesMotion}`;
  return `標準化啟動：${item.salesMotion}`;
}

function enablementAssetFor(item: PlatformCommandRevenueReadinessItem, signal: PlatformCommandLaunchSignal) {
  if (signal === "hold") return "無對外 enablement";
  if (signal === "controlled") return `Pilot enablement / ${item.revenueId}`;
  return `Sales playbook / ${item.revenueId}`;
}

function demoScriptFor(item: PlatformCommandRevenueReadinessItem, signal: PlatformCommandLaunchSignal) {
  if (signal === "hold") return `Demo 暫停：${item.revenueRisk}`;
  if (signal === "controlled") return `Demo 僅展示 pilot 範圍與限制：${item.contractGate}`;
  return `Demo 展示 ${item.qualifiedOffer} 的資料價值與使用場景`;
}

function crmStageFor(signal: PlatformCommandLaunchSignal) {
  if (signal === "hold") return "Not in CRM";
  if (signal === "controlled") return "Pilot qualified";
  return "Sales qualified";
}

function launchChannelFor(signal: PlatformCommandLaunchSignal) {
  if (signal === "hold") return "內部阻塞清單";
  if (signal === "controlled") return "顧問 pilot / founder-led sales";
  return "Demo、dashboard、API 文件、週報";
}

function successMetricFor(item: PlatformCommandRevenueReadinessItem, signal: PlatformCommandLaunchSignal) {
  if (signal === "hold") return "解除 no-go";
  if (signal === "controlled") return `pilot 轉正式：${item.forecastTreatment}`;
  return `pipeline 建立：${item.arrBand}`;
}

function feedbackLoopFor(signal: PlatformCommandLaunchSignal) {
  if (signal === "hold") return "回到 revenue readiness";
  if (signal === "controlled") return "每週 sales / CS 回饋";
  return "每月 win-loss 與產品 roadmap 回饋";
}

function launchWindowFor(state: PlatformCommandGtmLaunchState) {
  if (state === "blocked") return "暫緩";
  if (state === "enablement") return "本週 enablement";
  if (state === "pilot_launch") return "本月 pilot";
  return "可正式推廣";
}

function launchRiskFor(item: PlatformCommandRevenueReadinessItem, signal: PlatformCommandLaunchSignal) {
  if (signal === "hold") return item.revenueRisk;
  if (signal === "controlled") return `受控啟動風險：${item.contractGate}`;
  return `可推廣，殘餘風險為 ${platformCommandResidualRiskLabel(item.residualRisk)}`;
}

function nextActionFor(item: PlatformCommandRevenueReadinessItem, state: PlatformCommandGtmLaunchState) {
  if (state === "blocked") return `先處理收入阻塞：${item.nextAction}`;
  if (state === "enablement") return `建立 enablement 與 pilot 白名單：${item.salesMotion}`;
  if (state === "pilot_launch") return `確認合約與 CS 交接：${item.customerSuccessHandoff}`;
  return "同步 sales playbook、CRM 與客戶成功節奏";
}

function stateRank(state: PlatformCommandGtmLaunchState) {
  if (state === "blocked") return 4;
  if (state === "enablement") return 3;
  if (state === "pilot_launch") return 2;
  return 1;
}

export function buildPlatformCommandGtmLaunchItems(
  items: PlatformCommandRevenueReadinessItem[],
): PlatformCommandGtmLaunchItem[] {
  return items
    .map((item, index) => {
      const gtmLaunchState = gtmLaunchStateFor(item);
      const launchSignal = launchSignalFor(item, gtmLaunchState);

      return {
        launchId: `GTM-${String(index + 1).padStart(3, "0")}-${item.decisionId}`,
        revenueId: item.revenueId,
        packageId: item.packageId,
        decisionId: item.decisionId,
        owner: item.owner,
        launchOwner: item.revenueOwner,
        gtmLaunchState,
        launchSignal,
        revenueReadinessState: item.revenueReadinessState,
        bookingSignal: item.bookingSignal,
        status: item.status,
        residualRisk: item.residualRisk,
        readinessScore: item.readinessScore,
        sourceRoute: item.sourceRoute,
        buyerSegment: item.buyerSegment,
        launchMotion: launchMotionFor(item, launchSignal),
        enablementAsset: enablementAssetFor(item, launchSignal),
        demoScript: demoScriptFor(item, launchSignal),
        crmStage: crmStageFor(launchSignal),
        launchChannel: launchChannelFor(launchSignal),
        successMetric: successMetricFor(item, launchSignal),
        feedbackLoop: feedbackLoopFor(launchSignal),
        launchWindow: launchWindowFor(gtmLaunchState),
        launchRisk: launchRiskFor(item, launchSignal),
        nextAction: nextActionFor(item, gtmLaunchState),
      };
    })
    .sort(
      (left, right) =>
        stateRank(right.gtmLaunchState) - stateRank(left.gtmLaunchState) ||
        left.readinessScore - right.readinessScore ||
        left.launchId.localeCompare(right.launchId, "zh-Hant"),
    );
}

export function summarizePlatformCommandGtmLaunch(
  items: PlatformCommandGtmLaunchItem[],
): PlatformCommandGtmLaunchSummary {
  const blockedCount = items.filter((item) => item.gtmLaunchState === "blocked").length;
  const enablementCount = items.filter((item) => item.gtmLaunchState === "enablement").length;
  const pilotLaunchCount = items.filter((item) => item.gtmLaunchState === "pilot_launch").length;
  const holdCount = items.filter((item) => item.launchSignal === "hold").length;
  const controlledCount = items.filter((item) => item.launchSignal === "controlled").length;
  const averageReadinessScore = items.length
    ? Math.round(items.reduce((sum, item) => sum + item.readinessScore, 0) / items.length)
    : 0;

  return {
    status: holdCount > 0 ? "block" : controlledCount > 0 ? "watch" : "pass",
    itemCount: items.length,
    blockedCount,
    enablementCount,
    pilotLaunchCount,
    liveCount: items.filter((item) => item.gtmLaunchState === "live").length,
    holdCount,
    controlledCount,
    scaleCount: items.filter((item) => item.launchSignal === "scale").length,
    averageReadinessScore,
    nextLaunchWindow: blockedCount > 0 ? "暫緩" : enablementCount > 0 ? "本週 enablement" : pilotLaunchCount > 0 ? "本月 pilot" : "可正式推廣",
  };
}

export function platformCommandGtmLaunchCsv(items: PlatformCommandGtmLaunchItem[]) {
  const header = [
    "launch_id",
    "revenue_id",
    "package_id",
    "decision_id",
    "owner",
    "launch_owner",
    "gtm_launch_state",
    "launch_signal",
    "revenue_readiness_state",
    "booking_signal",
    "status",
    "residual_risk",
    "readiness_score",
    "source_route",
    "buyer_segment",
    "launch_motion",
    "enablement_asset",
    "demo_script",
    "crm_stage",
    "launch_channel",
    "success_metric",
    "feedback_loop",
    "launch_window",
    "launch_risk",
    "next_action",
  ];
  const rows = items.map((item) => [
    item.launchId,
    item.revenueId,
    item.packageId,
    item.decisionId,
    item.owner,
    item.launchOwner,
    platformCommandGtmLaunchStateLabel(item.gtmLaunchState),
    platformCommandLaunchSignalLabel(item.launchSignal),
    platformCommandRevenueReadinessStateLabel(item.revenueReadinessState),
    platformCommandBookingSignalLabel(item.bookingSignal),
    platformCommandStatusLabel(item.status),
    platformCommandResidualRiskLabel(item.residualRisk),
    item.readinessScore,
    item.sourceRoute,
    item.buyerSegment,
    item.launchMotion,
    item.enablementAsset,
    item.demoScript,
    item.crmStage,
    item.launchChannel,
    item.successMetric,
    item.feedbackLoop,
    item.launchWindow,
    item.launchRisk,
    item.nextAction,
  ]);

  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}
