"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card } from "./types";
import { LabelBadge } from "./LabelBadge";
import { StatusBadge } from "./StatusBadge";
import { formatDate, isOverdue } from "./utils";

export function SortableCard({
  card,
  onClick,
}: {
  card: Card;
  onClick: (card: Card) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id, data: { card } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const overdue = isOverdue(card.due_date);
  const checklistTotal = card.checklist_items?.length ?? 0;
  const checklistDone = card.checklist_items?.filter((i) => i.completed).length ?? 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onClick(card)}
      className={`group relative cursor-grab rounded-xl bg-white p-3.5 text-left shadow-sm ring-1 ring-zinc-200 transition-all hover:shadow-md hover:ring-zinc-300 active:cursor-grabbing dark:bg-zinc-800 dark:ring-zinc-700 dark:hover:ring-zinc-600 ${card.parent_id ? "ml-4" : ""}`}
    >
      {card.parent_id && (
        <div className="absolute -left-2.5 top-1/2 -translate-y-1/2 text-zinc-300 dark:text-zinc-600">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
        </div>
      )}
      {card.labels && card.labels.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {card.labels.map((color) => (
            <LabelBadge key={color} color={color} />
          ))}
        </div>
      )}
      <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
        <StatusBadge status={card.status} />
        {card.due_date && (
          <div className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase ${overdue ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"}`}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2z"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/></svg>
            {formatDate(card.due_date)}
          </div>
        )}
      </div>
      <p className="text-sm font-medium leading-snug text-zinc-800 dark:text-zinc-100">{card.title}</p>
      {card.description && (
        <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">{card.description}</p>
      )}
      {(card.children?.length ?? 0) > 0 && (
        <div className="mt-2 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
          {card.children?.length} subtask{card.children!.length > 1 ? "s" : ""}
        </div>
      )}
      {checklistTotal > 0 && (
        <div className={`mt-2 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold ${checklistDone === checklistTotal ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"}`}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg>
          {checklistDone}/{checklistTotal}
        </div>
      )}
    </div>
  );
}
