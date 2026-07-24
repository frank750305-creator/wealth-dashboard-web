import type { DashboardTab } from "@/types/dashboard";

type DashboardTabsProps = {
  activeTab: DashboardTab;
  onActiveTabChange: (tab: DashboardTab) => void;
};

const tabs: { id: DashboardTab; label: string }[] = [
  { id: "client", label: "客戶展示版" },
  { id: "main", label: "現金流與資產傳承" },
  { id: "tax", label: "所得稅與 AMT 精算" },
  { id: "market", label: "市場資料平台" },
];

export function DashboardTabs({ activeTab, onActiveTabChange }: DashboardTabsProps) {
  return (
    <div className="flex flex-wrap border-b border-slate-800 gap-2 mb-6">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onActiveTabChange(tab.id)}
          className={`px-4 py-2 text-sm font-semibold transition-all ${
            activeTab === tab.id
              ? "border-b-2 border-blue-500 text-blue-400 bg-slate-900/40"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
