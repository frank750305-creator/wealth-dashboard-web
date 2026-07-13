import type { ChangeEvent, RefObject } from "react";

type SavedPortfolioPresetOption = {
  id: string;
  name: string;
  updatedAt: string;
};

type BigQueryPortfolioPresetBarProps = {
  importInputRef: RefObject<HTMLInputElement | null>;
  presetName: string;
  selectedPresetId: string;
  savedPresets: SavedPortfolioPresetOption[];
  onImportJson: (event: ChangeEvent<HTMLInputElement>) => void;
  onPresetNameChange: (value: string) => void;
  onSelectedPresetIdChange: (value: string) => void;
  onSavePreset: () => void;
  onLoadPreset: () => void;
  onDeletePreset: () => void;
};

export function BigQueryPortfolioPresetBar({
  importInputRef,
  presetName,
  selectedPresetId,
  savedPresets,
  onImportJson,
  onPresetNameChange,
  onSelectedPresetIdChange,
  onSavePreset,
  onLoadPreset,
  onDeletePreset,
}: BigQueryPortfolioPresetBarProps) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-[0.8fr_1.2fr] gap-3 bg-slate-950 border border-slate-800 rounded-lg p-3">
      <input ref={importInputRef} type="file" accept="application/json,.json" hidden onChange={onImportJson} />
      <label className="space-y-1 text-xs">
        <span className="text-slate-500">配置名稱</span>
        <input
          value={presetName}
          onChange={(event) => onPresetNameChange(event.target.value)}
          className="w-full bg-slate-900 border border-slate-700 rounded-md px-2 py-2 text-slate-100"
        />
      </label>
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto_auto_auto] gap-2 text-xs">
        <label className="space-y-1">
          <span className="text-slate-500">已存配置</span>
          <select
            value={selectedPresetId}
            onChange={(event) => {
              const preset = savedPresets.find((item) => item.id === event.target.value);
              onSelectedPresetIdChange(event.target.value);
              if (preset) onPresetNameChange(preset.name);
            }}
            className="w-full bg-slate-900 border border-slate-700 rounded-md px-2 py-2 text-slate-100"
          >
            <option value="">尚未選擇</option>
            {savedPresets.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.name} · {new Date(preset.updatedAt).toLocaleDateString("zh-TW")}
              </option>
            ))}
          </select>
        </label>
        <button
          onClick={onSavePreset}
          className="md:self-end px-3 py-2 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
        >
          儲存
        </button>
        <button
          onClick={onLoadPreset}
          disabled={!selectedPresetId}
          className="md:self-end px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold disabled:cursor-not-allowed disabled:text-slate-500"
        >
          載入
        </button>
        <button
          onClick={onDeletePreset}
          disabled={!selectedPresetId}
          className="md:self-end px-3 py-2 rounded-md bg-slate-900 border border-slate-700 hover:border-red-500 text-slate-300 hover:text-red-300 font-bold disabled:cursor-not-allowed disabled:text-slate-600"
        >
          刪除
        </button>
        <button
          onClick={() => importInputRef.current?.click()}
          className="md:self-end px-3 py-2 rounded-md bg-cyan-700 hover:bg-cyan-600 text-white font-bold"
        >
          匯入 JSON
        </button>
      </div>
    </div>
  );
}
