"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card } from "./types";
import { LabelBadge } from "./LabelBadge";
import { STATUS_CONFIG, formatDate, isOverdue } from "./utils";

export function SortableCard({ card, onClick }: { card: Card; onClick: (card: Card) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    data: { card },
  });

  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };
  const overdue = isOverdue(card.due_date);
  const checklistTotal = card.checklist_items?.length ?? 0;
  const checklistDone = card.checklist_items?.filter((i) => i.completed).length ?? 0;
  const hasChildren = (card.children?.length ?? 0) > 0;
  const childrenDone = card.children?.filter((c) => c.status === "done").length ?? 0;
  const childrenTotal = card.children?.length ?? 0;
  const statusCfg = STATUS_CONFIG[card.status] ?? STATUS_CONFIG.todo;
  const hasMeta = card.due_date || checklistTotal > 0 || card.status !== "todo" || hasChildren || card.description;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onClick(card)}
      className="group relative cursor-grab rounded-lg bg-[var(--c-card)] shadow-sm hover:shadow-md transition-shadow active:cursor-grabbing"
    >
      {card.labels && card.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 px-3 pt-2">
          {card.labels.map((color) => <LabelBadge key={color} color={color} />)}
        </div>
      )}

      <div className="px-3 pt-2 pb-1">
        <p className="text-sm text-[var(--c-t1)] leading-normal">{card.title}</p>
      </div>

      {hasMeta && (
        <div className="flex flex-wrap items-center gap-1.5 px-3 pb-2">
          {card.status !== "todo" && (
            <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold ${statusCfg.bg} ${statusCfg.text}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${statusCfg.dot}`} />
              {statusCfg.label}
            </span>
          )}
          {card.due_date && (
            <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold ${
              overdue ? "bg-red-600 text-white" : "bg-[var(--c-field)] text-[var(--c-t3)]"
            }`}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              {formatDate(card.due_date)}
            </span>
          )}
          {checklistTotal > 0 && (
            <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold ${
              checklistDone === checklistTotal ? "bg-green-500 text-white" : "bg-[var(--c-field)] text-[var(--c-t3)]"
            }`}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
              {checklistDone}/{checklistTotal}
            </span>
          )}
          {hasChildren && (
            <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold ${
              childrenDone === childrenTotal ? "bg-green-500 text-white" : "bg-[var(--c-field)] text-[var(--c-t3)]"
            }`}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
              {childrenDone}/{childrenTotal}
            </span>
          )}
          {card.description && !hasMeta && (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--c-t3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="17" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="17" y1="18" x2="3" y2="18"/></svg>
          )}
        </div>
      )}
    </div>
  );
}
