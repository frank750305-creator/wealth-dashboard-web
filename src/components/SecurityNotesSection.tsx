type SecurityNotesSectionProps = {
  notes: string[];
};

export function SecurityNotesSection({ notes }: SecurityNotesSectionProps) {
  if (!notes.length) return null;

  return (
    <section className="bg-slate-900 border border-slate-800 p-4 md:p-6 rounded-xl shadow-2xl">
      <h3 className="text-sm font-bold text-amber-300 border-b border-slate-800 pb-3 mb-3">
        ▍ 上線安全檢查
      </h3>
      <ul className="space-y-2 text-xs text-slate-300">
        {notes.map((note) => (
          <li key={note} className="flex gap-2">
            <span className="text-amber-400">•</span>
            <span>{note}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
