"use client";

import { useState } from "react";
import { ControlCenterPanel } from "@/components/ControlCenterPanel";
import { DashboardHeader } from "@/components/DashboardHeader";
import { DashboardTabs } from "@/components/DashboardTabs";
import { ResultsWorkspacePanel } from "@/components/ResultsWorkspacePanel";
import { useAssetPoolState } from "@/hooks/useAssetPoolState";
import { useDashboardDerivedData } from "@/hooks/useDashboardDerivedData";
import { useFamilyState } from "@/hooks/useFamilyState";
import { useFutureEventsState } from "@/hooks/useFutureEventsState";
import { useIncomeExpenseState } from "@/hooks/useIncomeExpenseState";
import { useInsuranceState } from "@/hooks/useInsuranceState";
import { useLiabilitiesState } from "@/hooks/useLiabilitiesState";
import { usePensionState } from "@/hooks/usePensionState";
import { useTaxParamsState } from "@/hooks/useTaxParamsState";
import { useTimelineState } from "@/hooks/useTimelineState";
import type { DashboardSection, DashboardTab } from "@/types/dashboard";

export default function Home() {
  const [activeSection, setActiveSection] = useState<DashboardSection>("timeline");
  const [activeTab, setActiveTab] = useState<DashboardTab>("client");

  // --- 1. 全局時間軸與精算參數 ---
  const {
    timelinePayload,
    timelinePanelProps,
    selectedReportAge,
    onSelectedReportAgeChange,
  } = useTimelineState();
  const {
    currentAge,
    lifeExpectancy,
    retireAge,
  } = timelinePayload;

  // --- 2. 收入、六大常態開銷與動態多元所得池 ---
  const {
    mainSalary,
    extraIncomes,
    baseExp,
    mRent,
    mInsurance,
    incomeExpensePanelProps,
  } = useIncomeExpenseState();

  // --- 3. 動態資產池 ---
  const { assets, assetPoolPanelProps } = useAssetPoolState();

  // --- 4. 國家與職業退休金專案 ---
  const { pensionInfo, pensionPanelProps } = usePensionState({
    currentAge,
    retireAge,
    mainSalary,
  });

  // --- 5. 未來重大財務事件 ---
  const { events, futureEventsPanelProps } = useFutureEventsState();

  // --- 6. 不動產購屋置換與信貸債務模組 ---
  const { mortgages, debts, liabilitiesPanelProps } = useLiabilitiesState();

  // --- 7. 家族成員與稅務扶養扣除額 ---
  const { familyPayload, familyPanelProps, familyOptions } = useFamilyState();

  // --- 8. 獨立保單管理陣列模組 ---
  const { insurances, insurancePanelProps } = useInsuranceState();

  // --- 法規常數設定 (顯示為元) ---
  const { taxParams, updateTaxParam } = useTaxParamsState();

  const {
    isLoading,
    simulationResult,
    serverTax,
    serverLoan,
    snapReport,
    handleSimulate,
    monthlyNetFlow,
    realRetireFundPv,
    futureExpensesList,
  } = useDashboardDerivedData({
    timelinePayload,
    selectedReportAge,
    assets,
    insurances,
    mortgages,
    debts,
    extraIncomes,
    events,
    pensionInfo,
    taxParams,
    mainSalary,
    baseExp,
    mRent,
    mInsurance,
    familyPayload,
  });

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 md:p-8 font-sans overflow-x-hidden">
      <div className="max-w-[1750px] mx-auto">
        <DashboardHeader activeTab={activeTab} />

        <DashboardTabs activeTab={activeTab} onActiveTabChange={setActiveTab} />

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          {activeTab !== "client" && (
            <ControlCenterPanel
              activeSection={activeSection}
              onActiveSectionChange={setActiveSection}
              timelinePanelProps={timelinePanelProps}
              incomeExpensePanelProps={incomeExpensePanelProps}
              assetPoolPanelProps={assetPoolPanelProps}
              pensionPanelProps={pensionPanelProps}
              futureEventsPanelProps={futureEventsPanelProps}
              liabilitiesPanelProps={liabilitiesPanelProps}
              familyPanelProps={familyPanelProps}
              insurancePanelProps={insurancePanelProps}
              mainSalary={mainSalary}
              pensionInfo={pensionInfo}
              realRetireFundPv={realRetireFundPv}
              serverLoan={serverLoan}
              serverTax={serverTax}
              monthlyNetFlow={monthlyNetFlow}
              isLoading={isLoading}
              assets={assets}
              futureExpensesList={futureExpensesList}
              currentAge={currentAge}
              familyOptions={familyOptions}
              onSimulate={handleSimulate}
            />
          )}

          <ResultsWorkspacePanel
            activeTab={activeTab}
            onActiveTabChange={setActiveTab}
            simulationResult={simulationResult}
            currentAge={currentAge}
            lifeExpectancy={lifeExpectancy}
            selectedReportAge={selectedReportAge}
            snapReport={snapReport}
            onSelectedReportAgeChange={onSelectedReportAgeChange}
            taxParams={taxParams}
            onTaxParamChange={updateTaxParam}
            monthlyNetFlow={monthlyNetFlow}
            realRetireFundPv={realRetireFundPv}
            isFullWidth={activeTab === "client"}
          />
        </div>
      </div>
    </main>
  );
}
