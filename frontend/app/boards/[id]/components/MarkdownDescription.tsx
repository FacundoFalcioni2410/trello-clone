"use client";

import { useState, useEffect } from "react";
import ReactMarkdown, { Components } from "react-markdown";

const mdComponents: Components = {
  h1: ({ children }) => <p className="mb-0.5 text-sm font-bold text-[#172b4d]">{children}</p>,
  h2: ({ children }) => <p className="mb-0.5 text-sm font-semibold text-[#172b4d]">{children}</p>,
  h3: ({ children }) => <p className="mb-0.5 text-xs font-semibold uppercase tracking-wide text-[#44546f]">{children}</p>,
  p: ({ children }) => <p className="mb-1 text-sm text-[#172b4d] last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="mb-1 list-disc pl-4 text-sm text-[#172b4d] space-y-0.5">{children}</ul>,
  ol: ({ children }) => <ol className="mb-1 list-decimal pl-4 text-sm text-[#172b4d] space-y-0.5">{children}</ol>,
  li: ({ children }) => <li>{children}</li>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  code: ({ children }) => <code className="rounded bg-black/10 px-1 py-0.5 font-mono text-xs">{children}</code>,
  blockquote: ({ children }) => <blockquote className="border-l-2 border-[#0052cc] pl-2 italic text-[#5e6c84]">{children}</blockquote>,
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
          <svg className="text-[#44546f]" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="17" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/>
            <line x1="21" y1="14" x2="3" y2="14"/><line x1="17" y1="18" x2="3" y2="18"/>
          </svg>
          <h3 className="text-sm font-semibold text-[#172b4d]">Description</h3>
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
            className="rounded px-2 py-0.5 text-[11px] font-medium text-[#5e6c84] hover:bg-[#ebecf0]"
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
          className="h-32 w-full resize-none rounded-lg bg-[#ebecf0] px-3 py-2 font-mono text-sm text-[#172b4d] placeholder-[#8590a2] outline-none hover:bg-[#dfe1e6] focus:bg-white focus:ring-2 focus:ring-[#0052cc]"
        />
      ) : (
        <div
          onClick={() => setEditing(true)}
          className="h-32 cursor-text overflow-y-auto rounded-lg bg-[#ebecf0] px-3 py-2 hover:bg-[#dfe1e6]"
        >
          {value ? (
            <ReactMarkdown components={mdComponents}>{value}</ReactMarkdown>
          ) : (
            <span className="text-sm text-[#8590a2]">Add a description... (click to edit)</span>
          )}
        </div>
      )}
    </div>
  );
}
