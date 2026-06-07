"use client";

import { useDroppable } from "@dnd-kit/core";
import { BoardList } from "./types";

export function DroppableColumn({
  list,
  children,
}: {
  list: BoardList;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `list-${list.id}`, data: { listId: list.id } });

  return (
    <div
      ref={setNodeRef}
      className={`flex w-80 shrink-0 flex-col rounded-2xl bg-white/85 shadow-xl backdrop-blur-xl transition-colors dark:bg-zinc-900/85 ${isOver ? "ring-2 ring-blue-400/60 bg-white/95 dark:bg-zinc-800/95" : ""}`}
    >
      {children}
    </div>
  );
}
