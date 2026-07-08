import type { WealthRecord } from "@/types/wealth";

type AlivePerson = {
  name: string;
};

type AliveHeirs = {
  配偶: AlivePerson[];
  子女: AlivePerson[];
  父母: AlivePerson[];
  兄弟姊妹: AlivePerson[];
  祖父母: AlivePerson[];
};

type InheritanceRow = {
  role: string;
  ratio: string;
  stat: number;
  forced: number;
  ins: number;
  total: number;
};

type InheritanceTableProps = {
  snapReport?: WealthRecord | null;
};

const EMPTY_ALIVE: AliveHeirs = {
  配偶: [],
  子女: [],
  父母: [],
  兄弟姊妹: [],
  祖父母: [],
};

export function InheritanceTable({ snapReport }: InheritanceTableProps) {
  if (!snapReport) return null;

  const baseYuan = Number(snapReport.民法繼承基數 ?? 0) * 10000;
  const payouts = (snapReport.保單理賠分配 || {}) as Record<string, number>;
  const statutoryInsPool = payouts["法定繼承人"] || 0;
  const rows: InheritanceRow[] = [];
  const alive = { ...EMPTY_ALIVE, ...(snapReport.存活字典 || {}) } as AliveHeirs;
  const hasSp = alive.配偶.length > 0;
  const kidsCnt = alive.子女.length;
  const parentsCnt = alive.父母.length;
  const sibCnt = alive.兄弟姊妹.length;
  const grandCnt = alive.祖父母.length;

  const addHeirRow = (nameStr: string, shareRatio: number, isSp = false) => {
    const statAmt = baseYuan * shareRatio;
    const tsRatio = isSp ? 0.5 : ((kidsCnt > 0 || parentsCnt > 0) ? 0.5 : (1 / 3));
    const totalIns = (payouts[nameStr] || 0) + (statutoryInsPool * shareRatio);
    rows.push({
      role: nameStr,
      ratio: `${(shareRatio * 100).toFixed(1)}%`,
      stat: statAmt,
      forced: baseYuan * tsRatio * shareRatio,
      ins: totalIns,
      total: statAmt + totalIns,
    });
  };

  if (kidsCnt > 0) {
    const share = 1 / (kidsCnt + (hasSp ? 1 : 0));
    if (hasSp) addHeirRow("配偶", share, true);
    alive.子女.forEach((person) => addHeirRow(person.name, share));
  } else if (parentsCnt > 0) {
    if (hasSp) addHeirRow("配偶", 0.5, true);
    alive.父母.forEach((person) => addHeirRow(person.name, (hasSp ? 0.5 : 1.0) / parentsCnt));
  } else if (sibCnt > 0) {
    if (hasSp) addHeirRow("配偶", 0.5, true);
    alive.兄弟姊妹.forEach((person) => addHeirRow(person.name, (hasSp ? 0.5 : 1.0) / sibCnt));
  } else if (grandCnt > 0) {
    if (hasSp) addHeirRow("配偶", 2 / 3, true);
    alive.祖父母.forEach((person) => addHeirRow(person.name, (hasSp ? 1 / 3 : 1.0) / grandCnt));
  } else if (hasSp) {
    addHeirRow("配偶", 1.0, true);
  }

  const processedNames = rows.map((row) => row.role);
  processedNames.push("法定繼承人");
  Object.keys(payouts).forEach((bName) => {
    if (!processedNames.includes(bName) && payouts[bName] > 0) {
      rows.push({
        role: `💎 ${bName} (指定)`,
        ratio: "0.0%",
        stat: 0,
        forced: 0,
        ins: payouts[bName],
        total: payouts[bName],
      });
    }
  });

  if (rows.length === 0) {
    return <p className="text-red-400 p-2">⚠️ 此年紀查無第一至第四順位之法定繼承人，遺產將歸屬國庫。</p>;
  }

  return (
    <table className="w-full text-left border-collapse text-[10px] md:text-xs font-mono">
      <thead>
        <tr className="border-b border-slate-800 text-slate-400 bg-slate-950">
          <th className="p-2">繼承人身分</th>
          <th className="p-2 text-right">應繼分比例</th>
          <th className="p-2 text-right">應繼分金額</th>
          <th className="p-2 text-right text-purple-400">特留分底線</th>
          <th className="p-2 text-right text-blue-400">特定保單理賠</th>
          <th className="p-2 text-right text-emerald-400 font-bold">預估可獲總額</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-900">
        {rows.map((row, index) => (
          <tr key={index} className="hover:bg-slate-900/40">
            <td className="p-2 text-white font-bold">{row.role}</td>
            <td className="p-2 text-right">{row.ratio}</td>
            <td className="p-2 text-right text-slate-300">{Math.round(row.stat).toLocaleString()}</td>
            <td className="p-2 text-right text-purple-300">{Math.round(row.forced).toLocaleString()}</td>
            <td className="p-2 text-right text-blue-300">{Math.round(row.ins).toLocaleString()}</td>
            <td className="p-2 text-right text-emerald-400 font-bold">{Math.round(row.total).toLocaleString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
