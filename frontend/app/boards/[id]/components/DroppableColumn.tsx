"use client";

import { useDroppable } from "@dnd-kit/core";
import { BoardList } from "./types";

export function DroppableColumn({ list, children }: { list: BoardList; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: `list-${list.id}`, data: { listId: list.id } });

  return (
    <div
      ref={setNodeRef}
      className={`flex w-[272px] shrink-0 snap-start flex-col rounded-xl transition-colors ${
        isOver ? "bg-[var(--c-col-over)]" : "bg-[var(--c-col)]"
      }`}
    >
      {children}
    </div>
  );
}
