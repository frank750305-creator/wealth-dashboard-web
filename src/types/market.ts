export type MarketSourceStatus = "ready" | "needs_secret" | "batch_only" | "local_only";

export type MarketSource = {
  id: string;
  name: string;
  provider: string;
  category: string;
  status: MarketSourceStatus;
  currentStorage: string;
  integrationPath: string;
  nextAction: string;
};

export type MarketSourcesResponse = {
  generatedAt: string;
  sources: MarketSource[];
  securityNotes: string[];
};
