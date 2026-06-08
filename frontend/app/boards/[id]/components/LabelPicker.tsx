import { LABEL_COLORS } from "./utils";

export function LabelPicker({ selected, onToggle }: { selected: string[]; onToggle: (color: string) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      {LABEL_COLORS.map((label) => {
        const isSelected = selected.includes(label.key);
        return (
          <button
            key={label.key}
            onClick={() => onToggle(label.key)}
            className={`flex items-center gap-2 rounded px-3 py-2 text-sm font-semibold text-white transition-all hover:brightness-90 ${label.bg} ${isSelected ? "ring-2 ring-offset-1 ring-white/60" : "opacity-75 hover:opacity-100"}`}
          >
            <span className="flex-1 text-left capitalize">{label.key}</span>
            {isSelected && (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
            )}
          </button>
        );
      })}
    </div>
  );
}
