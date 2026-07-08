import { useCallback, useMemo, useState } from "react";
import { buildFutureEvent } from "@/lib/recordBuilders";
import type { FutureEventRecord } from "@/types/wealth";

export function useFutureEventsState() {
  const [events, setEvents] = useState<FutureEventRecord[]>([]);
  const [tmpEvName, setTmpEvName] = useState("子女出國學費/保單生存金");
  const [tmpEvAge, setTmpEvAge] = useState(40);
  const [tmpEvAmt, setTmpEvAmt] = useState(0);
  const [tmpEvTarget, setTmpEvTarget] = useState("預設現金流");
  const [tmpEvNewName, setTmpEvNewName] = useState("保單滿期轉投資");
  const [tmpEvNewType, setTmpEvNewType] = useState("現金");
  const [tmpEvNewRate, setTmpEvNewRate] = useState(0);
  const [evtContinuous, setEvtContinuous] = useState(false);
  const [tmpEvDuration, setTmpEvDuration] = useState(4);

  const addFutureEvent = useCallback(() => {
    setEvents((prev) => [
      ...prev,
      buildFutureEvent({
        label: tmpEvName,
        age: tmpEvAge,
        amountWan: tmpEvAmt,
        target: tmpEvTarget,
        continuous: evtContinuous,
        duration: tmpEvDuration,
        newAssetName: tmpEvNewName,
        newAssetType: tmpEvNewType,
        newAssetRatePct: tmpEvNewRate,
      }),
    ]);
  }, [
    evtContinuous,
    tmpEvAge,
    tmpEvAmt,
    tmpEvDuration,
    tmpEvName,
    tmpEvNewName,
    tmpEvNewRate,
    tmpEvNewType,
    tmpEvTarget,
  ]);

  const delEv = useCallback((id: string) => {
    setEvents((prev) => prev.filter((event) => event.id !== id));
  }, []);

  const futureEventsPanelProps = useMemo(() => ({
    events,
    tmpEvName,
    onTmpEvNameChange: setTmpEvName,
    tmpEvAge,
    onTmpEvAgeChange: setTmpEvAge,
    tmpEvAmt,
    onTmpEvAmtChange: setTmpEvAmt,
    tmpEvTarget,
    onTmpEvTargetChange: setTmpEvTarget,
    tmpEvNewName,
    onTmpEvNewNameChange: setTmpEvNewName,
    tmpEvNewType,
    onTmpEvNewTypeChange: setTmpEvNewType,
    tmpEvNewRate,
    onTmpEvNewRateChange: setTmpEvNewRate,
    evtContinuous,
    onEvtContinuousChange: setEvtContinuous,
    tmpEvDuration,
    onTmpEvDurationChange: setTmpEvDuration,
    onAddFutureEvent: addFutureEvent,
    onDeleteEvent: delEv,
  }), [
    addFutureEvent,
    delEv,
    events,
    evtContinuous,
    tmpEvAge,
    tmpEvAmt,
    tmpEvDuration,
    tmpEvName,
    tmpEvNewName,
    tmpEvNewRate,
    tmpEvNewType,
    tmpEvTarget,
  ]);

  return useMemo(() => ({
    events,
    futureEventsPanelProps,
  }), [events, futureEventsPanelProps]);
}
