import { LABEL_COLORS } from "./utils";

export function LabelPicker({
  selected,
  onToggle,
}: {
  selected: string[];
  onToggle: (color: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {LABEL_COLORS.map((label) => {
        const isSelected = selected.includes(label.key);
        return (
          <button
            key={label.key}
            onClick={() => onToggle(label.key)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${label.bg} ${label.text} ${isSelected ? "ring-2 ring-offset-1 ring-zinc-400 dark:ring-offset-zinc-900" : "opacity-60 hover:opacity-100"}`}
          >
            {isSelected && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
            )}
            {label.key}
          </button>
        );
      })}
    </div>
  );
}
