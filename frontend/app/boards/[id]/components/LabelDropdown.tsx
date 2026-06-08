"use client";

import { useState, useRef, useEffect } from "react";
import { LABEL_COLORS } from "./utils";

export function LabelDropdown({ selected, onToggle }: { selected: string[]; onToggle: (color: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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
        className="flex w-full items-center gap-2 rounded bg-[#ebecf0] px-2 py-1.5 text-sm text-[#172b4d] hover:bg-[#dfe1e6]"
      >
        {selected.length === 0 ? (
          <span className="text-[#5e6c84] text-xs">None</span>
        ) : (
          <div className="flex flex-wrap gap-1">
            {selected.map((color) => {
              const label = LABEL_COLORS.find((l) => l.key === color);
              return label ? <span key={color} className={`h-4 w-8 rounded ${label.bg}`} title={color} /> : null;
            })}
          </div>
        )}
        <svg className="ml-auto shrink-0 text-[#5e6c84]" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-52 overflow-y-auto rounded-lg bg-white p-2 shadow-xl ring-1 ring-black/10">
          <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wide text-[#5e6c84]">Labels</p>
          {LABEL_COLORS.map((label) => {
            const isSelected = selected.includes(label.key);
            return (
              <button
                key={label.key}
                onClick={() => onToggle(label.key)}
                className={`mb-1 flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm font-semibold text-white transition-all ${label.bg} ${isSelected ? "" : "opacity-70 hover:opacity-100"}`}
              >
                <span className="flex-1 text-left capitalize">{label.key}</span>
                {isSelected && (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
