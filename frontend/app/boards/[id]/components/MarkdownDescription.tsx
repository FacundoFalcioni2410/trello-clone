"use client";

import { useState, useEffect } from "react";
import ReactMarkdown, { Components } from "react-markdown";

const mdComponents: Components = {
  h1: ({ children }) => <p className="mb-0.5 text-sm font-bold text-[var(--c-t1)]">{children}</p>,
  h2: ({ children }) => <p className="mb-0.5 text-sm font-semibold text-[var(--c-t1)]">{children}</p>,
  h3: ({ children }) => <p className="mb-0.5 text-xs font-semibold uppercase tracking-wide text-[var(--c-t2)]">{children}</p>,
  p: ({ children }) => <p className="mb-1 text-sm text-[var(--c-t1)] last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="mb-1 list-disc pl-4 text-sm text-[var(--c-t1)] space-y-0.5">{children}</ul>,
  ol: ({ children }) => <ol className="mb-1 list-decimal pl-4 text-sm text-[var(--c-t1)] space-y-0.5">{children}</ol>,
  li: ({ children }) => <li>{children}</li>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  code: ({ children }) => <code className="rounded bg-black/15 px-1 py-0.5 font-mono text-xs text-[var(--c-t1)]">{children}</code>,
  blockquote: ({ children }) => <blockquote className="border-l-2 border-[#0052cc] pl-2 italic text-[var(--c-t3)]">{children}</blockquote>,
};

declare global {
  var LanguageModel:
    | {
        availability: () => Promise<"readily" | "after-download" | "no" | "unavailable">;
        create: (opts?: {
          systemPrompt?: string;
          temperature?: number;
          topK?: number;
        }) => Promise<{
          prompt: (text: string) => Promise<string>;
          destroy: () => void;
        }>;
      }
    | undefined;
}

export function MarkdownDescription({
  value,
  onChange,
  cardTitle,
}: {
  value: string;
  onChange: (v: string) => void;
  cardTitle?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [aiAvailable, setAiAvailable] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (typeof LanguageModel !== "undefined") {
      LanguageModel.availability()
        .then((a) => {
          // new API: "available"|"downloadable"|"downloading"|"unavailable"
          // old trial API: "readily"|"after-download"|"no"
          setAiAvailable(a !== "unavailable" && a !== "no");
        })
        .catch(() => {});
    }
  }, []);

  async function completeWithAI() {
    if (typeof LanguageModel === "undefined") return;
    setGenerating(true);
    try {
      const session = await LanguageModel.create();
      const titleCtx = cardTitle ? `Card title: "${cardTitle}".` : "";
      const existingCtx = value ? ` Existing draft: "${value}".` : "";
      const result = await session.prompt(
        `You are helping fill a Trello-style card description. ${titleCtx}${existingCtx} Write a clear, concise description in markdown (2-4 sentences or a short bullet list). Output only the description text.`
      );
      onChange(result.trim());
      session.destroy();
    } catch (err) {
      console.error("Chrome AI failed:", err);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg className="text-[var(--c-t2)]" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="17" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/>
            <line x1="21" y1="14" x2="3" y2="14"/><line x1="17" y1="18" x2="3" y2="18"/>
          </svg>
          <h3 className="text-sm font-semibold text-[var(--c-t1)]">Description</h3>
        </div>
        <div className="flex items-center gap-1">
          {aiAvailable && editing && (
            <button
              onClick={completeWithAI}
              disabled={generating}
              title="Complete with Chrome built-in AI"
              className="flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium text-violet-600 hover:bg-violet-50 disabled:opacity-40"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/></svg>
              {generating ? "Generating..." : "Complete with AI"}
            </button>
          )}
          <button
            onClick={() => setEditing((e) => !e)}
            className="rounded px-2 py-0.5 text-[11px] font-medium text-[var(--c-t3)] hover:bg-[var(--c-field)]"
          >
            {editing ? "Preview" : "Edit"}
          </button>
        </div>
      </div>

      {editing ? (
        <textarea
          autoFocus
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Add a description... (supports **markdown**)"
          className="h-32 w-full resize-none rounded-lg bg-[var(--c-field)] px-3 py-2 font-mono text-sm text-[var(--c-t1)] placeholder-[var(--c-t4)] outline-none hover:bg-[var(--c-field-h)] focus:bg-[var(--c-card)] focus:ring-2 focus:ring-[#0052cc]"
        />
      ) : (
        <div
          onClick={() => setEditing(true)}
          className="h-32 cursor-text overflow-y-auto rounded-lg bg-[var(--c-field)] px-3 py-2 hover:bg-[var(--c-field-h)]"
        >
          {value ? (
            <ReactMarkdown components={mdComponents}>{value}</ReactMarkdown>
          ) : (
            <span className="text-sm text-[var(--c-t4)]">Add a description... (click to edit)</span>
          )}
        </div>
      )}
    </div>
  );
}
