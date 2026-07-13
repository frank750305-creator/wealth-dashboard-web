import type {
  AssetComparisonSortKey,
  AssetDecisionSignal,
} from "@/lib/assetResearchWorkflow";

export type SavedWatchlistPreset = {
  id: string;
  name: string;
  symbols: string;
  priceBasis: "adjusted" | "raw";
  sortKey: AssetComparisonSortKey;
  signalFilter: AssetDecisionSignal | "all";
  minimumScore: number;
  updatedAt: string;
};

const watchlistPresetStorageKey = "wealth-dashboard.bigqueryWatchlistPresets";

export function loadWatchlistPresetsFromStorage() {
  if (typeof window === "undefined") return [];

  try {
    const parsed = JSON.parse(window.localStorage.getItem(watchlistPresetStorageKey) || "[]");
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((item): item is SavedWatchlistPreset => {
      if (!item || typeof item !== "object") return false;
      const preset = item as Partial<SavedWatchlistPreset>;
      return (
        typeof preset.id === "string" &&
        typeof preset.name === "string" &&
        typeof preset.symbols === "string" &&
        typeof preset.updatedAt === "string"
      );
    });
  } catch {
    return [];
  }
}

export function writeWatchlistPresetsToStorage(presets: SavedWatchlistPreset[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(watchlistPresetStorageKey, JSON.stringify(presets));
}
