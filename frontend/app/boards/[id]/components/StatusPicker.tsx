"use client";

import { useState, useRef, useEffect } from "react";
import { STATUS_CONFIG } from "./utils";

export function StatusPicker({ selected, onChange }: { selected: string; onChange: (status: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const cfg = STATUS_CONFIG[selected] ?? STATUS_CONFIG.todo;

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 rounded bg-[var(--c-field)] px-2 py-1.5 text-sm hover:bg-[var(--c-field-h)]"
      >
        <span className={`h-2 w-2 shrink-0 rounded-full ${cfg.dot}`} />
        <span className={`flex-1 text-left text-xs font-semibold ${cfg.text}`}>{cfg.label}</span>
        <svg className="ml-auto shrink-0 text-[var(--c-t3)]" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-lg bg-[var(--c-card)] shadow-xl ring-1 ring-black/10">
          {Object.entries(STATUS_CONFIG).map(([key, c]) => (
            <button
              key={key}
              onClick={() => { onChange(key); setOpen(false); }}
              className={`flex w-full items-center gap-2 px-3 py-2 text-xs transition-colors hover:bg-[var(--c-field)] ${selected === key ? "bg-[var(--c-field)]" : ""}`}
            >
              <span className={`h-2 w-2 shrink-0 rounded-full ${c.dot}`} />
              <span className={`font-semibold ${c.text}`}>{c.label}</span>
              {selected === key && (
                <svg className="ml-auto text-[var(--c-t2)]" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
