import { useCallback, useMemo, useState } from "react";

export function useTimelineState() {
  const [currentAge, setCurrentAge] = useState(30);
  const [lifeExpectancy, setLifeExpectancy] = useState(90);
  const [retireAge, setRetireAge] = useState(65);
  const [salaryGrowth, setSalaryGrowth] = useState(1.2);
  const [inflationRate, setInflationRate] = useState(2.0);
  const [replacementRate, setReplacementRate] = useState(70);
  const [roiAfterRetire, setRoiAfterRetire] = useState(3.0);
  const [selectedReportAge, setSelectedReportAge] = useState<number>(30);

  const handleCurrentAgeChange = useCallback((age: number) => {
    setCurrentAge(age);
    setSelectedReportAge(age);
  }, []);

  const timelinePayload = useMemo(() => ({
    currentAge,
    lifeExpectancy,
    retireAge,
    salaryGrowth,
    inflationRate,
    replacementRate,
    roiAfterRetire,
  }), [
    currentAge,
    lifeExpectancy,
    retireAge,
    salaryGrowth,
    inflationRate,
    replacementRate,
    roiAfterRetire,
  ]);

  const timelinePanelProps = useMemo(() => ({
    currentAge,
    onCurrentAgeChange: handleCurrentAgeChange,
    lifeExpectancy,
    onLifeExpectancyChange: setLifeExpectancy,
    retireAge,
    onRetireAgeChange: setRetireAge,
    salaryGrowth,
    onSalaryGrowthChange: setSalaryGrowth,
    inflationRate,
    onInflationRateChange: setInflationRate,
    replacementRate,
    onReplacementRateChange: setReplacementRate,
    roiAfterRetire,
    onRoiAfterRetireChange: setRoiAfterRetire,
  }), [
    currentAge,
    handleCurrentAgeChange,
    inflationRate,
    lifeExpectancy,
    replacementRate,
    retireAge,
    roiAfterRetire,
    salaryGrowth,
  ]);

  return useMemo(() => ({
    timelinePayload,
    timelinePanelProps,
    selectedReportAge,
    onSelectedReportAgeChange: setSelectedReportAge,
  }), [selectedReportAge, timelinePanelProps, timelinePayload]);
}
