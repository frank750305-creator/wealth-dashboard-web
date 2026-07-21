type SignalCardStatus = "strong" | "watch" | "risk" | "neutral";

export type BigQueryPortfolioSignalCard = {
  label: string;
  value: string;
  status: SignalCardStatus;
  note: string;
};

type BigQueryPortfolioSignalCardGridProps = {
  cards: BigQueryPortfolioSignalCard[];
  labelVariant?: "input" | "decision";
  variant?: "compact" | "three" | "four" | "wide";
};

function signalCardClass(status: SignalCardStatus) {
  if (status === "strong") return "border-emerald-500/25 bg-emerald-950/10";
  if (status === "watch") return "border-amber-500/25 bg-amber-950/10";
  if (status === "risk") return "border-rose-500/25 bg-rose-950/10";
  return "border-slate-800 bg-slate-950";
}

function signalBadgeClass(status: SignalCardStatus) {
  if (status === "strong") return "bg-emerald-500/15 text-emerald-200";
  if (status === "watch") return "bg-amber-500/15 text-amber-200";
  if (status === "risk") return "bg-rose-500/15 text-rose-200";
  return "bg-slate-800 text-slate-300";
}

function signalStatusLabel(status: SignalCardStatus, labelVariant: "input" | "decision") {
  if (labelVariant === "input") {
    if (status === "strong") return "通過";
    if (status === "watch") return "檢查";
    if (status === "risk") return "修正";
    return "資訊";
  }

  if (status === "strong") return "穩健";
  if (status === "watch") return "觀察";
  if (status === "risk") return "風險";
  return "中性";
}

function gridClass(variant: NonNullable<BigQueryPortfolioSignalCardGridProps["variant"]>) {
  if (variant === "three") return "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2";
  if (variant === "four") return "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2";
  if (variant === "wide") return "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-2";
  return "grid grid-cols-1 md:grid-cols-2 gap-2";
}

export function BigQueryPortfolioSignalCardGrid({
  cards,
  labelVariant = "input",
  variant = "compact",
}: BigQueryPortfolioSignalCardGridProps) {
  return (
    <div className={gridClass(variant)}>
      {cards.map((card) => (
        <div
          key={card.label}
          className={`rounded-lg border p-3 min-w-0 ${signalCardClass(card.status)}`}
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] text-slate-500 truncate">{card.label}</p>
            <span
              className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-bold ${signalBadgeClass(card.status)}`}
            >
              {signalStatusLabel(card.status, labelVariant)}
            </span>
          </div>
          <p className="mt-2 font-mono text-xs font-bold text-slate-100 truncate" title={card.value}>
            {card.value}
          </p>
          <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">{card.note}</p>
        </div>
      ))}
    </div>
  );
}
