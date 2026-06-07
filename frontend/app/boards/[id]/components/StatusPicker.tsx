import { STATUS_CONFIG } from "./utils";

export function StatusPicker({
  selected,
  onChange,
}: {
  selected: string;
  onChange: (status: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {Object.entries(STATUS_CONFIG).map(([key, config]) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${config.bg} ${config.text} ${selected === key ? "ring-2 ring-offset-1 ring-zinc-400 dark:ring-offset-zinc-900" : "opacity-60 hover:opacity-100"}`}
        >
          <span className={`h-2 w-2 rounded-full ${config.dot}`} />
          {config.label}
        </button>
      ))}
    </div>
  );
}
