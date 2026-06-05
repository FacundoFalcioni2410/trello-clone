"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, getCsrfCookie } from "@/lib/api";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  defaultDropAnimationSideEffects,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface ChecklistItem {
  id: number;
  card_id: number;
  text: string;
  completed: boolean;
  position: number;
  created_at: string;
  updated_at: string;
}

interface User {
  id: number;
  name: string;
  email: string;
}

interface CardActivity {
  id: number;
  card_id: number;
  user_id: number | null;
  user: User | null;
  type: string;
  description: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

interface Card {
  id: number;
  title: string;
  description: string | null;
  due_date: string | null;
  position: number;
  board_list_id: number;
  labels: string[] | null;
  checklist_items: ChecklistItem[];
  activities: CardActivity[];
  created_at: string;
}

interface BoardList {
  id: number;
  name: string;
  position: number;
  cards: Card[];
}

interface Board {
  id: number;
  name: string;
  background_color: string | null;
  background_image: string | null;
  lists: BoardList[];
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function isOverdue(dateStr: string | null) {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date(new Date().toDateString());
}

async function mutate(path: string, options: RequestInit = {}) {
  await getCsrfCookie();
  return apiFetch(path, options);
}

function replaceCardInBoard(prev: Board | null, cardId: number, updater: (card: Card) => Card): Board | null {
  if (!prev) return prev;
  return {
    ...prev,
    lists: prev.lists.map((l) => ({
      ...l,
      cards: l.cards.map((c) => (c.id === cardId ? updater(c) : c)),
    })),
  };
}

const LABEL_COLORS: { key: string; bg: string; text: string }[] = [
  { key: "red", bg: "bg-red-500", text: "text-white" },
  { key: "orange", bg: "bg-orange-500", text: "text-white" },
  { key: "yellow", bg: "bg-yellow-500", text: "text-black" },
  { key: "green", bg: "bg-green-500", text: "text-white" },
  { key: "blue", bg: "bg-blue-500", text: "text-white" },
  { key: "purple", bg: "bg-purple-500", text: "text-white" },
  { key: "pink", bg: "bg-pink-500", text: "text-white" },
  { key: "slate", bg: "bg-slate-500", text: "text-white" },
];

function LabelBadge({ color }: { color: string }) {
  const found = LABEL_COLORS.find((l) => l.key === color);
  if (!found) return null;
  return (
    <span className={`inline-block h-2 w-8 rounded-full ${found.bg}`} title={color} />
  );
}

function LabelPicker({
  selected,
  onToggle,
}: {
  selected: string[];
  onToggle: (color: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {LABEL_COLORS.map((label) => {
        const isSelected = selected.includes(label.key);
        return (
          <button
            key={label.key}
            onClick={() => onToggle(label.key)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${label.bg} ${label.text} ${isSelected ? "ring-2 ring-offset-1 ring-zinc-400 dark:ring-offset-zinc-900" : "opacity-60 hover:opacity-100"}`}
          >
            {isSelected && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
            )}
            {label.key}
          </button>
        );
      })}
    </div>
  );
}

function SortableCard({
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
      className="group relative cursor-grab rounded-xl bg-white p-3.5 text-left shadow-sm ring-1 ring-zinc-200 transition-all hover:shadow-md hover:ring-zinc-300 active:cursor-grabbing dark:bg-zinc-800 dark:ring-zinc-700 dark:hover:ring-zinc-600"
    >
      {card.labels && card.labels.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {card.labels.map((color) => (
            <LabelBadge key={color} color={color} />
          ))}
        </div>
      )}
      {card.due_date && (
        <div className={`mb-1.5 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase ${overdue ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"}`}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2z"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/></svg>
          {formatDate(card.due_date)}
        </div>
      )}
      <p className="text-sm font-medium leading-snug text-zinc-800 dark:text-zinc-100">{card.title}</p>
      {card.description && (
        <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">{card.description}</p>
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

function DroppableColumn({
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

export default function BoardPage({ params }: { params: Promise<{ id: string }> }) {
  const [board, setBoard] = useState<Board | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newListName, setNewListName] = useState("");
  const [addingList, setAddingList] = useState(false);
  const [creatingList, setCreatingList] = useState(false);
  const [newCardTitles, setNewCardTitles] = useState<Record<number, string>>({});
  const [newCardDescriptions, setNewCardDescriptions] = useState<Record<number, string>>({});
  const [newCardDueDates, setNewCardDueDates] = useState<Record<number, string>>({});
  const [newCardLabels, setNewCardLabels] = useState<Record<number, string[]>>({});
  const [creatingCardListId, setCreatingCardListId] = useState<number | null>(null);
  const [editingListId, setEditingListId] = useState<number | null>(null);
  const [editListName, setEditListName] = useState("");
  const [deletingListId, setDeletingListId] = useState<number | null>(null);
  const [selectedCard, setSelectedCard] = useState<{ list: BoardList; card: Card } | null>(null);
  const [editCardTitle, setEditCardTitle] = useState("");
  const [editCardDescription, setEditCardDescription] = useState("");
  const [editCardDueDate, setEditCardDueDate] = useState("");
  const [editCardLabels, setEditCardLabels] = useState<string[]>([]);
  const [savingCard, setSavingCard] = useState(false);
  const [deletingCardId, setDeletingCardId] = useState<number | null>(null);
  const [activeDragCard, setActiveDragCard] = useState<Card | null>(null);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [newChecklistText, setNewChecklistText] = useState("");
  const [addingChecklist, setAddingChecklist] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { id } = await params;
        if (cancelled) return;
        await getCsrfCookie();
        const data = await apiFetch(`/api/boards/${id}`);
        if (!cancelled) setBoard(data);
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : "Failed to load board";
        if (message.includes("401") || message.includes("Unauthenticated")) {
          router.push("/login");
        } else {
          setError(message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep selectedCard in sync with board changes (checklist, drag & drop, etc.)
  useEffect(() => {
    if (!board || !selectedCard) return;
    const currentCard = board.lists.flatMap((l) => l.cards).find((c) => c.id === selectedCard.card.id);
    if (currentCard && currentCard !== selectedCard.card) {
      setSelectedCard((prev) => (prev ? { ...prev, card: currentCard } : null));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board]);

  async function refreshBoard() {
    if (!board) return;
    try {
      await getCsrfCookie();
      const data = await apiFetch(`/api/boards/${board.id}`);
      setBoard(data);
    } catch {
      // ignore refresh failures
    }
  }

  async function handleCreateList(e: React.FormEvent) {
    e.preventDefault();
    if (!board || !newListName.trim()) return;
    setCreatingList(true);
    try {
      await mutate(`/api/boards/${board.id}/lists`, {
        method: "POST",
        body: JSON.stringify({ name: newListName.trim() }),
      });
      await refreshBoard();
      setNewListName("");
      setAddingList(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create list");
    } finally {
      setCreatingList(false);
    }
  }

  async function handleCreateCard(listId: number) {
    if (!board || !newCardTitles[listId]?.trim()) return;
    setCreatingCardListId(listId);
    try {
      await mutate(`/api/boards/${board.id}/lists/${listId}/cards`, {
        method: "POST",
        body: JSON.stringify({
          title: newCardTitles[listId].trim(),
          description: newCardDescriptions[listId]?.trim() || null,
          due_date: newCardDueDates[listId] || null,
          labels: newCardLabels[listId] || null,
        }),
      });
      await refreshBoard();
      setNewCardTitles((prev) => ({ ...prev, [listId]: "" }));
      setNewCardDescriptions((prev) => ({ ...prev, [listId]: "" }));
      setNewCardDueDates((prev) => ({ ...prev, [listId]: "" }));
      setNewCardLabels((prev) => ({ ...prev, [listId]: [] }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create card");
    } finally {
      setCreatingCardListId(null);
    }
  }

  async function handleRenameList(listId: number) {
    if (!board || !editListName.trim()) { setEditingListId(null); return; }
    try {
      await mutate(`/api/boards/${board.id}/lists/${listId}`, {
        method: "PUT",
        body: JSON.stringify({ name: editListName.trim() }),
      });
      await refreshBoard();
      setEditingListId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to rename list");
    }
  }

  async function handleDeleteList(listId: number) {
    if (!board) return;
    setDeletingListId(listId);
    try {
      await mutate(`/api/boards/${board.id}/lists/${listId}`, { method: "DELETE" });
      await refreshBoard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete list");
    } finally {
      setDeletingListId(null);
    }
  }

  async function handleSaveCard() {
    if (!board || !selectedCard || !editCardTitle.trim()) return;
    setSavingCard(true);

    // Tomar la card más actual del board para no perder checklist items actualizados en vivo
    const currentCard = board.lists.flatMap((l) => l.cards).find((c) => c.id === selectedCard.card.id) ?? selectedCard.card;

    const updatedCard: Card = {
      ...currentCard,
      title: editCardTitle.trim(),
      description: editCardDescription.trim() || null,
      due_date: editCardDueDate || null,
      labels: editCardLabels.length > 0 ? editCardLabels : null,
    };

    const prevBoard = board;

    setBoard((prev) => replaceCardInBoard(prev, selectedCard.card.id, () => updatedCard));
    setSelectedCard(null);

    try {
      await mutate(`/api/boards/${board.id}/lists/${selectedCard.list.id}/cards/${selectedCard.card.id}`, {
        method: "PUT",
        body: JSON.stringify({
          title: updatedCard.title,
          description: updatedCard.description,
          due_date: updatedCard.due_date,
          labels: updatedCard.labels,
        }),
      });
      await refreshBoard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update card");
      setBoard(prevBoard);
    } finally {
      setSavingCard(false);
    }
  }

  async function handleDeleteCard(listId: number, cardId: number) {
    if (!board) return;
    setDeletingCardId(cardId);
    try {
      await mutate(`/api/boards/${board.id}/lists/${listId}/cards/${cardId}`, { method: "DELETE" });
      setSelectedCard(null);
      await refreshBoard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete card");
    } finally {
      setDeletingCardId(null);
    }
  }

  async function handleLogout() {
    try { await mutate("/logout", { method: "POST" }); } catch { /* ignore */ }
    router.push("/login");
  }

  async function handleAddChecklistItem() {
    if (!board || !selectedCard || !newChecklistText.trim()) return;

    const text = newChecklistText.trim();
    const tempId = -Date.now();
    const tempItem: ChecklistItem = {
      id: tempId,
      card_id: selectedCard.card.id,
      text,
      completed: false,
      position: checklistItems.length,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const prevChecklist = checklistItems;
    const prevBoard = board;

    setChecklistItems((prev) => [...prev, tempItem]);
    setBoard((prev) =>
      replaceCardInBoard(prev, selectedCard.card.id, (c) => ({
        ...c,
        checklist_items: [...(c.checklist_items || []), tempItem],
      }))
    );
    setNewChecklistText("");
    setAddingChecklist(true);

    try {
      const item = await mutate(`/api/boards/${board.id}/lists/${selectedCard.list.id}/cards/${selectedCard.card.id}/checklist-items`, {
        method: "POST",
        body: JSON.stringify({ text }),
      });
      setChecklistItems((prev) => prev.map((i) => (i.id === tempId ? item : i)));
      setBoard((prev) =>
        replaceCardInBoard(prev, selectedCard.card.id, (c) => ({
          ...c,
          checklist_items: (c.checklist_items || []).map((i) => (i.id === tempId ? item : i)),
        }))
      );
      await refreshBoard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add checklist item");
      setChecklistItems(prevChecklist);
      setBoard(prevBoard);
    } finally {
      setAddingChecklist(false);
    }
  }

  async function handleToggleChecklistItem(item: ChecklistItem) {
    if (!board || !selectedCard) return;

    const prevChecklist = checklistItems;
    const prevBoard = board;
    const nextCompleted = !item.completed;

    setChecklistItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, completed: nextCompleted } : i))
    );
    setBoard((prev) =>
      replaceCardInBoard(prev, selectedCard.card.id, (c) => ({
        ...c,
        checklist_items: (c.checklist_items || []).map((i) =>
          i.id === item.id ? { ...i, completed: nextCompleted } : i
        ),
      }))
    );

    try {
      await mutate(`/api/boards/${board.id}/lists/${selectedCard.list.id}/cards/${selectedCard.card.id}/checklist-items/${item.id}`, {
        method: "PUT",
        body: JSON.stringify({ completed: nextCompleted }),
      });
      await refreshBoard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update checklist item");
      setChecklistItems(prevChecklist);
      setBoard(prevBoard);
    }
  }

  async function handleDeleteChecklistItem(itemId: number) {
    if (!board || !selectedCard) return;

    const prevChecklist = checklistItems;
    const prevBoard = board;

    setChecklistItems((prev) => prev.filter((i) => i.id !== itemId));
    setBoard((prev) =>
      replaceCardInBoard(prev, selectedCard.card.id, (c) => ({
        ...c,
        checklist_items: (c.checklist_items || []).filter((i) => i.id !== itemId),
      }))
    );

    try {
      await mutate(`/api/boards/${board.id}/lists/${selectedCard.list.id}/cards/${selectedCard.card.id}/checklist-items/${itemId}`, {
        method: "DELETE",
      });
      await refreshBoard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete checklist item");
      setChecklistItems(prevChecklist);
      setBoard(prevBoard);
    }
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function findListByCardId(cardId: number): BoardList | undefined {
    return board?.lists.find((l) => l.cards.some((c) => c.id === cardId));
  }

  function handleDragStart(event: DragStartEvent) {
    const cardId = Number(event.active.id);
    const list = findListByCardId(cardId);
    const card = list?.cards.find((c) => c.id === cardId);
    if (card) setActiveDragCard(card);
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over || !board) return;

    const activeId = Number(active.id);
    const overId = over.id;

    const activeList = findListByCardId(activeId);
    if (!activeList) return;

    let overList: BoardList | undefined;
    let overIndex = -1;

    if (typeof overId === "string" && overId.startsWith("list-")) {
      const listId = Number(overId.replace("list-", ""));
      overList = board.lists.find((l) => l.id === listId);
    } else {
      const overCardId = Number(overId);
      overList = findListByCardId(overCardId);
      if (overList) overIndex = overList.cards.findIndex((c) => c.id === overCardId);
    }

    if (!overList || activeList.id === overList.id) return;

    setBoard((prev) => {
      if (!prev) return prev;
      const newLists = prev.lists.map((l) => {
        if (l.id === activeList.id) {
          return { ...l, cards: l.cards.filter((c) => c.id !== activeId) };
        }
        if (l.id === overList!.id) {
          const activeCard = activeList.cards.find((c) => c.id === activeId)!;
          const newCards = [...l.cards];
          const insertIndex = overIndex >= 0 ? overIndex : newCards.length;
          newCards.splice(insertIndex, 0, { ...activeCard, board_list_id: overList!.id });
          return { ...l, cards: newCards };
        }
        return l;
      });
      return { ...prev, lists: newLists };
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveDragCard(null);
    if (!over || !board) return;

    const activeId = Number(active.id);
    const activeList = findListByCardId(activeId);
    if (!activeList) return;

    let overList: BoardList | undefined;
    let overIndex = -1;

    if (typeof over.id === "string" && String(over.id).startsWith("list-")) {
      const listId = Number(String(over.id).replace("list-", ""));
      overList = board.lists.find((l) => l.id === listId);
    } else {
      const overCardId = Number(over.id);
      overList = findListByCardId(overCardId);
      if (overList) overIndex = overList.cards.findIndex((c) => c.id === overCardId);
    }

    if (!overList) return;

    const activeIndex = activeList.cards.findIndex((c) => c.id === activeId);
    const currentIndexInOver = overList.cards.findIndex((c) => c.id === activeId);

    if (activeList.id === overList.id) {
      if (activeIndex === overIndex || (overIndex === -1 && currentIndexInOver === activeIndex)) return;
      const newCards = arrayMove(activeList.cards, activeIndex, overIndex >= 0 ? overIndex : activeIndex);
      const newPosition = overIndex >= 0 ? (overIndex === 0 ? 0 : newCards[overIndex - 1].position + 1) : activeList.cards[activeIndex].position;

      setBoard((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          lists: prev.lists.map((l) => (l.id === overList!.id ? { ...l, cards: newCards } : l)),
        };
      });

      syncCardMove(activeId, activeList.id, overList.id, newPosition);
    } else {
      const insertIndex = currentIndexInOver >= 0 ? currentIndexInOver : overList.cards.length;
      const newPosition = insertIndex === 0 ? 0 : (overList.cards[insertIndex - 1]?.position ?? 0) + 1;
      syncCardMove(activeId, activeList.id, overList.id, newPosition);
    }
  }

  function syncCardMove(cardId: number, sourceListId: number, targetListId: number, position: number) {
    if (!board) return;
    mutate(`/api/boards/${board.id}/lists/${sourceListId}/cards/${cardId}`, {
      method: "PUT",
      body: JSON.stringify({ board_list_id: targetListId, position }),
    }).catch((err) => {
      setError(err instanceof Error ? err.message : "Failed to move card");
      refreshBoard();
    });
  }

  const bg = board?.background_color || "#3b82f6";

  const dropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
      styles: { active: { opacity: "0.5" } },
    }),
  };

  return (
    <div className="flex h-screen flex-col" style={{ backgroundColor: bg }}>
      <header className="shrink-0 bg-black/15 px-6 py-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-[90rem] items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/")}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-white/90 transition-all hover:bg-white/20 hover:text-white"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
              Boards
            </button>
            <div className="h-5 w-px bg-white/20" />
            <h1 className="text-lg font-bold text-white drop-shadow-sm">{board?.name || "Board"}</h1>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-white/80 transition-all hover:bg-white/20 hover:text-white"
          >
            Log out
          </button>
        </div>
      </header>

      <main className="relative flex-1 overflow-x-auto overflow-y-hidden">
        {error && !loading && (
          <div className="absolute left-6 right-6 top-5 z-10 rounded-xl bg-red-500/90 px-4 py-3 text-sm text-white shadow-lg backdrop-blur-sm">
            {error}
          </div>
        )}

        {loading || !board ? (
          <div className="flex h-full flex-col items-center justify-center">
            <div className="flex items-center gap-3 rounded-2xl bg-white/10 px-8 py-5 text-white shadow-xl backdrop-blur-md">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              <span className="text-sm font-semibold">Loading board...</span>
            </div>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <div className="flex h-full items-start gap-4 px-6 py-5">
              {board.lists.map((list) => (
                <DroppableColumn key={list.id} list={list}>
                  <div className="flex items-center justify-between px-4 pt-4 pb-2">
                    {editingListId === list.id ? (
                      <input
                        type="text"
                        value={editListName}
                        onChange={(e) => setEditListName(e.target.value)}
                        onBlur={() => handleRenameList(list.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleRenameList(list.id);
                          if (e.key === "Escape") setEditingListId(null);
                        }}
                        autoFocus
                        className="flex-1 rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm font-semibold text-zinc-800 outline-none ring-2 ring-blue-500/30 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                      />
                    ) : (
                      <h3
                        onClick={() => { setEditingListId(list.id); setEditListName(list.name); }}
                        className="cursor-pointer flex-1 select-none text-sm font-bold tracking-tight text-zinc-700 dark:text-zinc-200"
                      >
                        {list.name}
                      </h3>
                    )}
                    <span className="ml-2 rounded-full bg-zinc-200/80 px-2 py-0.5 text-[10px] font-bold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                      {list.cards.length}
                    </span>
                    <button
                      onClick={() => handleDeleteList(list.id)}
                      disabled={deletingListId === list.id}
                      className="ml-2 rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-zinc-200 hover:text-red-500 dark:hover:bg-zinc-800"
                      title="Delete list"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                    </button>
                  </div>

                  <div className="flex flex-col gap-2.5 px-3 pb-3">
                    <SortableContext
                      items={list.cards.map((c) => c.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {list.cards.map((card) => (
                        <SortableCard
                          key={card.id}
                          card={card}
                          onClick={(c) => {
                            setSelectedCard({ list, card: c });
                            setEditCardTitle(c.title);
                            setEditCardDescription(c.description || "");
                            setEditCardDueDate(c.due_date || "");
                            setEditCardLabels(c.labels || []);
                            setChecklistItems(c.checklist_items || []);
                          }}
                        />
                      ))}
                      {list.cards.length === 0 && (
                        <div className="rounded-xl border-2 border-dashed border-zinc-300/60 py-8 text-center text-xs text-zinc-400 dark:border-zinc-700/60 dark:text-zinc-500">
                          Drop cards here
                        </div>
                      )}
                    </SortableContext>

                    <div className="mt-1 rounded-xl bg-white p-3 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-800 dark:ring-zinc-700">
                      <input
                        type="text"
                        value={newCardTitles[list.id] || ""}
                        onChange={(e) => setNewCardTitles((prev) => ({ ...prev, [list.id]: e.target.value }))}
                        placeholder="Enter a title for this card..."
                        className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-800 placeholder-zinc-400 outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-zinc-600 dark:bg-zinc-900 dark:text-white dark:focus:ring-blue-900/30"
                      />
                      {(newCardTitles[list.id]?.trim()) && (
                        <>
                          <textarea
                            value={newCardDescriptions[list.id] || ""}
                            onChange={(e) => setNewCardDescriptions((prev) => ({ ...prev, [list.id]: e.target.value }))}
                            placeholder="Description (optional)"
                            rows={2}
                            className="mt-2 w-full resize-none rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-700 placeholder-zinc-400 outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:focus:ring-blue-900/30"
                          />
                          <div className="relative mt-2">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"><path d="M18 6H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2z"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/></svg>
                            <input
                              type="date"
                              value={newCardDueDates[list.id] || ""}
                              onChange={(e) => setNewCardDueDates((prev) => ({ ...prev, [list.id]: e.target.value }))}
                              className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-2 pl-8 pr-3 text-xs text-zinc-700 outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:focus:ring-blue-900/30"
                            />
                          </div>
                          <div className="mt-2">
                            <LabelPicker
                              selected={newCardLabels[list.id] || []}
                              onToggle={(color) => {
                                setNewCardLabels((prev) => {
                                  const current = prev[list.id] || [];
                                  const next = current.includes(color) ? current.filter((c) => c !== color) : [...current, color];
                                  return { ...prev, [list.id]: next };
                                });
                              }}
                            />
                          </div>
                        </>
                      )}
                      <button
                        onClick={() => handleCreateCard(list.id)}
                        disabled={creatingCardListId === list.id || !newCardTitles[list.id]?.trim()}
                        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-blue-600 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-600/20 transition-all hover:bg-blue-500 active:scale-[0.98] disabled:opacity-40"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                        {creatingCardListId === list.id ? "Adding..." : "Add card"}
                      </button>
                    </div>
                  </div>
                </DroppableColumn>
              ))}

              <div className="w-80 shrink-0">
                {addingList ? (
                  <form onSubmit={handleCreateList} className="rounded-2xl bg-white/85 p-4 shadow-xl backdrop-blur-xl dark:bg-zinc-900/85">
                    <input
                      type="text"
                      value={newListName}
                      onChange={(e) => setNewListName(e.target.value)}
                      placeholder="Enter list title..."
                      autoFocus
                      className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm font-medium text-zinc-800 placeholder-zinc-400 outline-none ring-2 ring-transparent transition-all focus:border-blue-400 focus:ring-blue-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:focus:ring-blue-900/30"
                    />
                    <div className="mt-3 flex gap-2">
                      <button
                        type="submit"
                        disabled={creatingList || !newListName.trim()}
                        className="flex items-center gap-1.5 rounded-xl bg-zinc-900 px-4 py-2 text-xs font-bold text-white transition-all hover:bg-zinc-800 active:scale-[0.97] disabled:opacity-40 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                        {creatingList ? "Adding..." : "Add list"}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setAddingList(false); setNewListName(""); }}
                        className="rounded-xl px-4 py-2 text-xs font-semibold text-zinc-600 transition-colors hover:bg-zinc-200 dark:text-zinc-400 dark:hover:bg-zinc-800"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    onClick={() => { setAddingList(true); setError(""); }}
                    className="flex w-full items-center gap-2 rounded-2xl bg-white/20 px-5 py-3.5 text-left text-sm font-semibold text-white backdrop-blur-md transition-all hover:bg-white/30 hover:shadow-lg"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                    Add another list
                  </button>
                )}
              </div>
            </div>

            <DragOverlay dropAnimation={dropAnimation}>
              {activeDragCard ? (
                <div className="rounded-xl bg-white p-3.5 shadow-2xl ring-1 ring-zinc-200 opacity-90 dark:bg-zinc-800 dark:ring-zinc-700">
                  <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100">{activeDragCard.title}</p>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </main>

      {selectedCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={() => setSelectedCard(null)}>
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl dark:bg-zinc-900" onClick={(e) => e.stopPropagation()}>
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Card details</h2>
                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">in list <span className="font-semibold text-zinc-700 dark:text-zinc-300">{selectedCard.list.name}</span></p>
              </div>
              <button onClick={() => setSelectedCard(null)} className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-white">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Title</label>
                <input type="text" value={editCardTitle} onChange={(e) => setEditCardTitle(e.target.value)} className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm font-medium text-zinc-800 outline-none ring-2 ring-transparent transition-all focus:border-blue-400 focus:ring-blue-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:focus:ring-blue-900/30" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Description</label>
                <textarea value={editCardDescription} onChange={(e) => setEditCardDescription(e.target.value)} placeholder="Add a more detailed description..." rows={5} className="w-full resize-none rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700 outline-none ring-2 ring-transparent transition-all focus:border-blue-400 focus:ring-blue-100 placeholder-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:focus:ring-blue-900/30" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Due date</label>
                <input type="date" value={editCardDueDate} onChange={(e) => setEditCardDueDate(e.target.value)} className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-800 outline-none ring-2 ring-transparent transition-all focus:border-blue-400 focus:ring-blue-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:focus:ring-blue-900/30" />
                {isOverdue(editCardDueDate) && <p className="mt-1 text-xs font-medium text-red-500">This card is overdue</p>}
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Labels</label>
                <LabelPicker
                  selected={editCardLabels}
                  onToggle={(color) => {
                    setEditCardLabels((prev) =>
                      prev.includes(color) ? prev.filter((c) => c !== color) : [...prev, color]
                    );
                  }}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Checklist</label>
                <div className="space-y-2">
                  {checklistItems.map((item) => (
                    <div key={item.id} className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800">
                      <button
                        onClick={() => handleToggleChecklistItem(item)}
                        className={`shrink-0 rounded-md border p-1 transition-colors ${item.completed ? "border-green-500 bg-green-500 text-white" : "border-zinc-300 bg-white text-transparent hover:border-zinc-400 dark:border-zinc-600 dark:bg-zinc-700"}`}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                      </button>
                      <span className={`flex-1 text-sm ${item.completed ? "text-zinc-400 line-through" : "text-zinc-800 dark:text-zinc-200"}`}>{item.text}</span>
                      <button
                        onClick={() => handleDeleteChecklistItem(item.id)}
                        className="rounded-md p-1 text-zinc-400 hover:bg-zinc-200 hover:text-red-500 dark:hover:bg-zinc-700"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                      </button>
                    </div>
                  ))}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newChecklistText}
                      onChange={(e) => setNewChecklistText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleAddChecklistItem();
                      }}
                      placeholder="Add a checklist item..."
                      className="flex-1 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-800 placeholder-zinc-400 outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-zinc-600 dark:bg-zinc-900 dark:text-white dark:focus:ring-blue-900/30"
                    />
                    <button
                      onClick={handleAddChecklistItem}
                      disabled={addingChecklist || !newChecklistText.trim()}
                      className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white transition-all hover:bg-blue-500 disabled:opacity-40"
                    >
                      {addingChecklist ? "..." : "Add"}
                    </button>
                  </div>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Activity</label>
                <div className="space-y-3">
                  {(selectedCard.card.activities || []).length === 0 && (
                    <p className="text-xs text-zinc-400 dark:text-zinc-500">No activity yet.</p>
                  )}
                  {(selectedCard.card.activities || []).map((activity) => (
                    <div key={activity.id} className="flex items-start gap-2">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                        {activity.user?.name?.charAt(0).toUpperCase() ?? "?"}
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-zinc-700 dark:text-zinc-300">
                          <span className="font-semibold">{activity.user?.name ?? "Unknown"}</span>{" "}
                          {activity.description}
                        </p>
                        <p className="mt-0.5 text-[10px] text-zinc-400 dark:text-zinc-500">
                          {formatDate(activity.created_at)} at {new Date(activity.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button onClick={handleSaveCard} disabled={savingCard || !editCardTitle.trim()} className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-blue-700 active:scale-[0.97] disabled:opacity-40">{savingCard ? "Saving..." : "Save changes"}</button>
                <button onClick={() => setSelectedCard(null)} className="rounded-xl px-5 py-2.5 text-sm font-semibold text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800">Cancel</button>
                <div className="flex-1" />
                <button onClick={() => handleDeleteCard(selectedCard.list.id, selectedCard.card.id)} disabled={deletingCardId === selectedCard.card.id} className="flex items-center gap-1.5 rounded-xl bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                  {deletingCardId === selectedCard.card.id ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
