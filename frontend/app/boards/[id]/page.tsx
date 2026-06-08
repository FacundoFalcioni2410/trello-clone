"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, getCsrfCookie } from "@/lib/api";
import { listenToBoard } from "@/lib/echo";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  defaultDropAnimationSideEffects,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { LabelDropdown } from "./components/LabelDropdown";
import { MarkdownDescription } from "./components/MarkdownDescription";
import { StatusPicker } from "./components/StatusPicker";
import { useTheme } from "@/app/components/ThemeProvider";
import { SortableCard } from "./components/SortableCard";
import { CardPreview } from "./components/CardPreview";
import { DroppableColumn } from "./components/DroppableColumn";
import { Board, Card, CardStatus, BoardList, ChecklistItem, User } from "./components/types";
import { formatDate, isOverdue, STATUS_CONFIG } from "./components/utils";

async function mutate(path: string, options: RequestInit = {}) {
  await getCsrfCookie();
  return apiFetch(path, options);
}

function isAccessDeniedError(message: string): boolean {
  return message.includes("403") || message.includes("You don't have access") || message.includes("You no longer have access");
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

export default function BoardPage({ params }: { params: Promise<{ id: string }> }) {
  const [board, setBoard] = useState<Board | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newListName, setNewListName] = useState("");
  const [addingList, setAddingList] = useState(false);
  const [creatingList, setCreatingList] = useState(false);
  const [createCardList, setCreateCardList] = useState<BoardList | null>(null);
  const [createTitle, setCreateTitle] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createDueDate, setCreateDueDate] = useState("");
  const [createLabels, setCreateLabels] = useState<string[]>([]);
  const [createStatus, setCreateStatus] = useState("todo");
  const [createParentId, setCreateParentId] = useState<number | null>(null);
  const [creatingCardListId, setCreatingCardListId] = useState<number | null>(null);
  const [editingListId, setEditingListId] = useState<number | null>(null);
  const [editListName, setEditListName] = useState("");
  const [deletingListId, setDeletingListId] = useState<number | null>(null);
  const [selectedCard, setSelectedCard] = useState<{ list: BoardList; card: Card } | null>(null);
  const [editCardTitle, setEditCardTitle] = useState("");
  const [editCardDescription, setEditCardDescription] = useState("");
  const [editCardDueDate, setEditCardDueDate] = useState("");
  const [editCardLabels, setEditCardLabels] = useState<string[]>([]);
  const [editCardStatus, setEditCardStatus] = useState<string>("todo");
  const [editCardParentId, setEditCardParentId] = useState<number | null>(null);
  const [savingCard, setSavingCard] = useState(false);
  const [deletingCardId, setDeletingCardId] = useState<number | null>(null);
  const [activeDragCard, setActiveDragCard] = useState<Card | null>(null);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [newChecklistText, setNewChecklistText] = useState("");
  const [addingChecklist, setAddingChecklist] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState<number | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const router = useRouter();
  const { theme, toggle: toggleTheme } = useTheme();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { id } = await params;
        if (cancelled) return;
        await getCsrfCookie();
        const [boardData, userData] = await Promise.all([
          apiFetch(`/api/boards/${id}`),
          apiFetch("/api/user"),
        ]);
        if (!cancelled) {
          setBoard(boardData);
          setCurrentUser(userData);
        }
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : "Failed to load board";
        if (message.includes("401") || message.includes("Unauthenticated")) {
          router.push("/login");
        } else if (isAccessDeniedError(message)) {
          setError("Access denied. Redirecting...");
          setTimeout(() => router.push("/"), 2000);
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

  const isOwner = board && currentUser ? board.owner_id === currentUser.id : false;

  // Keep selectedCard in sync with board changes (checklist, drag & drop, etc.)
  useEffect(() => {
    if (!board || !selectedCard) return;
    const currentCard = board.lists.flatMap((l) => l.cards).find((c) => c.id === selectedCard.card.id);
    if (currentCard && currentCard !== selectedCard.card) {
      setSelectedCard((prev) => (prev ? { ...prev, card: currentCard } : null));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board]);

  // Real-time updates via WebSocket
  useEffect(() => {
    if (!board) return;
    const unsubscribe = listenToBoard(board.id, () => {
      refreshBoard();
    });
    return () => {
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board?.id]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      if (selectedCard) { setSelectedCard(null); return; }
      if (createCardList) { setCreateCardList(null); return; }
      if (showMembers) { setShowMembers(false); return; }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [selectedCard, createCardList, showMembers]);

  async function refreshBoard() {
    if (!board) return;
    try {
      await getCsrfCookie();
      const data = await apiFetch(`/api/boards/${board.id}`);
      setBoard(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (isAccessDeniedError(message)) {
        setError("You no longer have access to this board. Redirecting...");
        setTimeout(() => router.push("/"), 2000);
      }
      // ignore other refresh failures
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

  function openCreateModal(list: BoardList) {
    setCreateCardList(list);
    setCreateTitle("");
    setCreateDescription("");
    setCreateDueDate("");
    setCreateLabels([]);
    setCreateStatus("todo");
    setCreateParentId(null);
  }

  function closeCreateModal() {
    setCreateCardList(null);
  }

  async function handleCreateCard() {
    if (!board || !createCardList || !createTitle.trim()) return;
    setCreatingCardListId(createCardList.id);
    try {
      await mutate(`/api/boards/${board.id}/lists/${createCardList.id}/cards`, {
        method: "POST",
        body: JSON.stringify({
          title: createTitle.trim(),
          description: createDescription.trim() || null,
          due_date: createDueDate || null,
          labels: createLabels.length > 0 ? createLabels : null,
          status: createStatus || "todo",
          parent_id: createParentId ?? null,
        }),
      });
      await refreshBoard();
      closeCreateModal();
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
      status: (editCardStatus as CardStatus) || "todo",
      parent_id: editCardParentId ?? null,
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
          status: updatedCard.status,
          parent_id: updatedCard.parent_id,
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

  async function handleUpdateSubtaskStatus(child: Card, status: string) {
    if (!board) return;
    const childList = board.lists.find((l) => l.cards.some((c) => c.id === child.id));
    if (!childList) return;
    setBoard((prev) =>
      replaceCardInBoard(prev, child.id, (c) => ({ ...c, status: status as CardStatus }))
    );
    try {
      await mutate(`/api/boards/${board.id}/lists/${childList.id}/cards/${child.id}`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      });
      await refreshBoard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update subtask status");
      refreshBoard();
    }
  }

  async function handleLogout() {
    try { await mutate("/logout", { method: "POST" }); } catch { /* ignore */ }
    router.push("/login");
  }

  async function handleInviteMember() {
    if (!board || !inviteEmail.trim()) return;
    setInviting(true);
    try {
      await mutate(`/api/boards/${board.id}/members`, {
        method: "POST",
        body: JSON.stringify({ email: inviteEmail.trim() }),
      });
      setInviteEmail("");
      await refreshBoard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to invite member");
    } finally {
      setInviting(false);
    }
  }

  async function handleRemoveMember(userId: number) {
    if (!board) return;
    setRemovingMemberId(userId);
    try {
      await mutate(`/api/boards/${board.id}/members/${userId}`, { method: "DELETE" });
      await refreshBoard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove member");
    } finally {
      setRemovingMemberId(null);
    }
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
    <div className="flex h-[100dvh] flex-col overflow-hidden" style={{ backgroundColor: bg }}>
      <header className="shrink-0 bg-black/25 px-3 py-2 sm:px-4 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <button
              onClick={() => router.push("/")}
              className="flex shrink-0 items-center gap-1 rounded px-1.5 py-1 text-xs font-medium text-white/60 transition hover:bg-white/15 hover:text-white/90"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
              Boards
            </button>
            <span className="shrink-0 text-[10px] text-white/25">/</span>
            <h1 className="truncate text-sm font-bold text-white">{board?.name || "Board"}</h1>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setShowMembers(true)}
              className="flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-semibold text-white/80 transition hover:bg-white/20 hover:text-white"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              <span className="hidden sm:inline">Members</span>
            </button>
            <button
              onClick={toggleTheme}
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              className="rounded px-2 py-1.5 text-xs font-semibold text-white/70 transition hover:bg-white/20 hover:text-white"
            >
              {theme === "dark" ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
              )}
            </button>
            <button
              onClick={handleLogout}
              className="rounded px-2.5 py-1.5 text-xs font-semibold text-white/70 transition hover:bg-white/20 hover:text-white"
            >
              <span className="hidden sm:inline">Log out</span>
              <svg className="sm:hidden" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            </button>
          </div>
        </div>
      </header>

      <main className="relative flex-1 overflow-x-auto overflow-y-hidden min-w-0">
        {error && !loading && (
          <div className="absolute left-6 right-6 top-5 z-10 flex items-center justify-between rounded-xl bg-red-500/90 px-4 py-3 text-sm text-white shadow-lg backdrop-blur-sm">
            <span>{error}</span>
            <button
              onClick={() => setError("")}
              className="ml-3 rounded-md p-1 text-white/70 hover:bg-white/20 hover:text-white transition-colors"
              aria-label="Dismiss error"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
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
            <div className="flex h-full items-start gap-3 sm:gap-4 px-3 py-3 sm:px-6 sm:py-5 overflow-x-auto snap-x snap-mandatory scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
              {board.lists.map((list) => (
                <DroppableColumn key={list.id} list={list}>
                  {/* Column header */}
                  <div className="flex items-center gap-1 px-3 pt-3 pb-2">
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
                        className="flex-1 rounded bg-[var(--c-card)] px-2 py-1 text-sm font-bold text-[var(--c-t1)] outline-none ring-2 ring-[#0052cc]"
                      />
                    ) : (
                      <h3
                        onClick={() => { setEditingListId(list.id); setEditListName(list.name); }}
                        className="flex-1 cursor-pointer select-none rounded px-2 py-1 text-sm font-bold text-[var(--c-t1)] hover:bg-black/5"
                      >
                        {list.name}
                      </h3>
                    )}
                    <button
                      onClick={() => handleDeleteList(list.id)}
                      disabled={deletingListId === list.id}
                      className="flex h-7 w-7 items-center justify-center rounded text-[var(--c-t2)] transition-colors hover:bg-black/10"
                      title="Delete list"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                    </button>
                  </div>

                  {/* Cards */}
                  <div className="flex flex-col gap-2 px-2 overflow-y-auto max-h-[calc(100vh-220px)] scrollbar-thin scrollbar-thumb-[var(--c-sep)] scrollbar-track-transparent">
                    <SortableContext
                      items={list.cards.filter((c) => !c.parent_id).map((c) => c.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {list.cards.filter((c) => !c.parent_id).map((card) => (
                        <div key={card.id} className="flex flex-col gap-1">
                          <SortableCard
                            card={card}
                            onClick={(c) => {
                              setSelectedCard({ list, card: c });
                              setEditCardTitle(c.title);
                              setEditCardDescription(c.description || "");
                              setEditCardDueDate(c.due_date || "");
                              setEditCardLabels(c.labels || []);
                              setEditCardStatus(c.status || "todo");
                              setEditCardParentId(c.parent_id ?? null);
                              setChecklistItems(c.checklist_items || []);
                            }}
                          />
                          {card.children && card.children.length > 0 && (
                            <div className="flex flex-col gap-1 ml-2 pl-2 border-l-2 border-[var(--c-sep)]">
                              {card.children.map((child) => (
                                <CardPreview
                                  key={child.id}
                                  card={child}
                                  onClick={(c) => {
                                    setSelectedCard({ list, card: c });
                                    setEditCardTitle(c.title);
                                    setEditCardDescription(c.description || "");
                                    setEditCardDueDate(c.due_date || "");
                                    setEditCardLabels(c.labels || []);
                                    setEditCardStatus(c.status || "todo");
                                    setEditCardParentId(c.parent_id ?? null);
                                    setChecklistItems(c.checklist_items || []);
                                  }}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                      {list.cards.filter((c) => !c.parent_id).length === 0 && (
                        <div className="rounded-lg border-2 border-dashed border-[var(--c-sep)] py-6 text-center text-xs text-[var(--c-t4)]">
                          Drop cards here
                        </div>
                      )}
                    </SortableContext>
                  </div>

                  {/* Add card */}
                  <div className="p-2">
                    <button
                      onClick={() => openCreateModal(list)}
                      className="flex w-full items-center gap-1.5 rounded-lg px-2 py-2 text-sm text-[var(--c-t2)] transition-colors hover:bg-black/10 hover:text-[var(--c-t1)]"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                      Add a card
                    </button>
                  </div>
                </DroppableColumn>
              ))}

              <div className="w-[272px] shrink-0 snap-start">
                {addingList ? (
                  <form onSubmit={handleCreateList} className="rounded-xl bg-[var(--c-col)] p-2">
                    <input
                      type="text"
                      value={newListName}
                      onChange={(e) => setNewListName(e.target.value)}
                      placeholder="Enter list title..."
                      autoFocus
                      className="w-full rounded bg-[var(--c-card)] px-2 py-1.5 text-sm font-medium text-[var(--c-t1)] placeholder-[var(--c-t4)] outline-none ring-2 ring-[#0052cc]"
                    />
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        type="submit"
                        disabled={creatingList || !newListName.trim()}
                        className="rounded bg-[#0052cc] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#0065ff] disabled:opacity-50"
                      >
                        {creatingList ? "Adding..." : "Add list"}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setAddingList(false); setNewListName(""); }}
                        className="rounded p-1.5 text-[var(--c-t2)] hover:bg-black/10"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    onClick={() => { setAddingList(true); setError(""); }}
                    className="flex w-full items-center gap-2 rounded-xl bg-white/20 px-4 py-3 text-left text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/30"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                    Add another list
                  </button>
                )}
              </div>
            </div>

            <DragOverlay dropAnimation={dropAnimation}>
              {activeDragCard ? (
                <div className="rounded-lg bg-[var(--c-card)] shadow-2xl opacity-90 px-3 py-2">
                  <p className="text-sm text-[var(--c-t1)]">{activeDragCard.title}</p>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </main>

      {showMembers && board && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 sm:p-4 backdrop-blur-sm" onClick={() => setShowMembers(false)}>
          <div className="w-full h-full sm:h-auto sm:max-w-md rounded-none sm:rounded-3xl bg-[var(--c-card)]p-4 sm:p-6 shadow-2xl dark:bg-zinc-900" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 sm:mb-5 flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Board members</h2>
                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">Manage who has access to this board</p>
              </div>
              <button onClick={() => setShowMembers(false)} className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-white">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>

            <div className="space-y-4">
              {board.owner && (
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                    {board.owner.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">{board.owner.name}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">{board.owner.email}</p>
                  </div>
                  <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">Owner</span>
                </div>
              )}

              {(board.members || []).map((member) => (
                <div key={member.id} className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-bold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
                    {member.user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">{member.user.name}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">{member.user.email}</p>
                  </div>
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-bold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 capitalize">{member.role}</span>
                  {isOwner && (
                    <button
                      onClick={() => handleRemoveMember(member.user_id)}
                      disabled={removingMemberId === member.user_id}
                      className="rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                    </button>
                  )}
                </div>
              ))}

              {isOwner && (
                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleInviteMember();
                    }}
                    placeholder="Enter email to invite..."
                    className="flex-1 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-800 placeholder-zinc-400 outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-zinc-600 dark:bg-zinc-900 dark:text-white dark:focus:ring-blue-900/30"
                  />
                  <button
                    onClick={handleInviteMember}
                    disabled={inviting || !inviteEmail.trim()}
                    className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white transition-all hover:bg-blue-500 disabled:opacity-40"
                  >
                    {inviting ? "..." : "Invite"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedCard && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:p-8"
          onClick={() => setSelectedCard(null)}
        >
          <div
            className="relative my-auto w-full max-w-2xl rounded-xl bg-[var(--c-modal)] shadow-2xl max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close */}
            <button
              onClick={() => setSelectedCard(null)}
              className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-lg text-[var(--c-t2)] hover:bg-black/10"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>

            {/* Title area */}
            <div className="flex items-start gap-3 px-5 pt-5 pb-2">
              <svg className="mt-1 shrink-0 text-[var(--c-t2)]" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
              <div className="flex-1 min-w-0 pr-8">
                <textarea
                  value={editCardTitle}
                  onChange={(e) => setEditCardTitle(e.target.value)}
                  rows={1}
                  className="w-full resize-none rounded bg-transparent px-1 py-0.5 text-lg font-bold text-[var(--c-t1)] outline-none hover:bg-[var(--c-field)] focus:bg-[var(--c-card)] focus:ring-2 focus:ring-[#0052cc]"
                />
                <span className="mt-1 inline-flex items-center rounded bg-[var(--c-field)] px-2 py-0.5 text-xs font-medium text-[var(--c-t2)]">
                  {selectedCard.list.name}
                </span>
              </div>
            </div>

            {/* Two-column body */}
            <div className="flex flex-col sm:flex-row gap-4 px-4 pb-5">
              {/* Left: main content */}
              <div className="flex-1 min-w-0 space-y-5">
                {/* Description */}
                <MarkdownDescription value={editCardDescription} onChange={setEditCardDescription} cardTitle={editCardTitle} />

                {/* Checklist */}
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <svg className="text-[var(--c-t2)]" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                    <h3 className="text-sm font-semibold text-[var(--c-t1)]">Checklist</h3>
                  </div>
                  {checklistItems.length > 0 && (
                    <>
                      <div className="mb-3 flex items-center gap-2">
                        <span className="w-7 text-right text-[10px] text-[var(--c-t3)]">
                          {Math.round((checklistItems.filter((i) => i.completed).length / checklistItems.length) * 100)}%
                        </span>
                        <div className="flex-1 h-2 rounded-full bg-[var(--c-field)]">
                          <div
                            className={`h-2 rounded-full transition-all ${checklistItems.filter((i) => i.completed).length === checklistItems.length ? "bg-green-500" : "bg-[#0052cc]"}`}
                            style={{ width: `${(checklistItems.filter((i) => i.completed).length / checklistItems.length) * 100}%` }}
                          />
                        </div>
                      </div>
                      <div className="space-y-0.5">
                        {checklistItems.map((item) => (
                          <div key={item.id} className="group flex items-center gap-2 rounded px-1 py-1 hover:bg-[var(--c-field)]">
                            <button
                              onClick={() => handleToggleChecklistItem(item)}
                              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${item.completed ? "border-[#0052cc] bg-[#0052cc]" : "border-[var(--c-t4)] bg-[var(--c-card)] hover:border-[#0052cc]"}`}
                            >
                              {item.completed && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>}
                            </button>
                            <span className={`flex-1 text-sm ${item.completed ? "text-[var(--c-t3)] line-through" : "text-[var(--c-t1)]"}`}>{item.text}</span>
                            <button
                              onClick={() => handleDeleteChecklistItem(item.id)}
                              className="hidden rounded p-0.5 text-[var(--c-t4)] hover:bg-[var(--c-field-h)] hover:text-[var(--c-t1)] group-hover:flex"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                  <div className="mt-2 flex gap-2">
                    <input
                      type="text"
                      value={newChecklistText}
                      onChange={(e) => setNewChecklistText(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleAddChecklistItem(); }}
                      placeholder="Add an item..."
                      className="flex-1 rounded-lg bg-[var(--c-card)] px-3 py-2 text-sm text-[var(--c-t1)] placeholder-[var(--c-t4)] outline-none ring-1 ring-[var(--c-border)] focus:ring-2 focus:ring-[#0052cc]"
                    />
                    <button
                      onClick={handleAddChecklistItem}
                      disabled={addingChecklist || !newChecklistText.trim()}
                      className="rounded bg-[var(--c-field)] px-3 py-2 text-sm font-medium text-[var(--c-t1)] hover:bg-[var(--c-field-h)] disabled:opacity-50"
                    >
                      {addingChecklist ? "..." : "Add"}
                    </button>
                  </div>
                </div>

                {/* Subtasks */}
                {(selectedCard.card.children?.length ?? 0) > 0 && (
                  <div>
                    <div className="mb-2 flex items-center gap-2">
                      <svg className="text-[var(--c-t2)]" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M3 6h.01"/><path d="M3 12h.01"/><path d="M3 18h.01"/></svg>
                      <h3 className="text-sm font-semibold text-[var(--c-t1)]">Subtasks</h3>
                      <span className="text-xs text-[var(--c-t3)]">
                        {selectedCard.card.children!.filter((c) => c.status === "done").length}/{selectedCard.card.children!.length}
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {(selectedCard.card.children || []).map((child) => (
                        <div key={child.id} className="flex items-center gap-2 rounded-lg bg-[var(--c-card)] px-3 py-2 shadow-sm ring-1 ring-[var(--c-border)]">
                          <button
                            onClick={() => {
                              setSelectedCard({ list: selectedCard.list, card: child });
                              setEditCardTitle(child.title);
                              setEditCardDescription(child.description || "");
                              setEditCardDueDate(child.due_date || "");
                              setEditCardLabels(child.labels || []);
                              setEditCardStatus(child.status || "todo");
                              setEditCardParentId(child.parent_id ?? null);
                              setChecklistItems(child.checklist_items || []);
                            }}
                            className="flex-1 min-w-0 text-left text-sm text-[var(--c-t1)] leading-snug hover:text-[#0052cc]"
                          >
                            {child.title}
                          </button>
                          <div className="flex shrink-0 items-center gap-1.5 rounded bg-[var(--c-field)] px-1.5 py-1 hover:bg-[var(--c-field-h)]">
                            <span className={`h-2 w-2 shrink-0 rounded-full ${STATUS_CONFIG[child.status || "todo"]?.dot ?? "bg-zinc-400"}`} />
                            <select
                              value={child.status || "todo"}
                              onChange={(e) => handleUpdateSubtaskStatus(child, e.target.value)}
                              className={`bg-transparent text-xs font-semibold outline-none ${STATUS_CONFIG[child.status || "todo"]?.text ?? "text-zinc-600"}`}
                            >
                              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                                <option key={key} value={key}>{cfg.label}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Activity */}
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <svg className="text-[var(--c-t2)]" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                    <h3 className="text-sm font-semibold text-[var(--c-t1)]">Activity</h3>
                  </div>
                  <div className="space-y-3">
                    {(selectedCard.card.activities || []).length === 0 && (
                      <p className="text-xs text-[var(--c-t4)]">No activity yet.</p>
                    )}
                    {(selectedCard.card.activities || []).map((activity) => (
                      <div key={activity.id} className="flex items-start gap-2">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#0052cc] text-[11px] font-bold text-white">
                          {activity.user?.name?.charAt(0).toUpperCase() ?? "?"}
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-[var(--c-t1)]">
                            <span className="font-semibold">{activity.user?.name ?? "Unknown"}</span>{" "}{activity.description}
                          </p>
                          <p className="mt-0.5 text-[10px] text-[var(--c-t4)]">
                            {formatDate(activity.created_at)} at {new Date(activity.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Save/Cancel */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSaveCard}
                    disabled={savingCard || !editCardTitle.trim()}
                    className="rounded bg-[#0052cc] px-4 py-2 text-sm font-medium text-white hover:bg-[#0065ff] disabled:opacity-50"
                  >
                    {savingCard ? "Saving..." : "Save"}
                  </button>
                  <button
                    onClick={() => setSelectedCard(null)}
                    className="rounded px-4 py-2 text-sm text-[var(--c-t1)] hover:bg-[var(--c-field)]"
                  >
                    Cancel
                  </button>
                </div>
              </div>

              {/* Right sidebar */}
              <div className="sm:w-44 shrink-0 space-y-4">
                {/* Status */}
                <div>
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--c-t3)]">Status</p>
                  <StatusPicker selected={editCardStatus} onChange={(status) => setEditCardStatus(status)} />
                </div>

                {/* Labels */}
                <div>
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--c-t3)]">Labels</p>
                  <LabelDropdown
                    selected={editCardLabels}
                    onToggle={(color) => setEditCardLabels((prev) => prev.includes(color) ? prev.filter((c) => c !== color) : [...prev, color])}
                  />
                </div>

                {/* Due date */}
                <div>
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--c-t3)]">Due date</p>
                  <input
                    type="date"
                    value={editCardDueDate}
                    onChange={(e) => setEditCardDueDate(e.target.value)}
                    className="w-full rounded bg-[var(--c-field)] px-2 py-1.5 text-sm text-[var(--c-t1)] outline-none hover:bg-[var(--c-field-h)] focus:bg-[var(--c-card)] focus:ring-2 focus:ring-[#0052cc]"
                  />
                  {isOverdue(editCardDueDate) && <p className="mt-1 text-xs font-medium text-red-500">Overdue</p>}
                </div>

                {/* Parent */}
                <div>
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--c-t3)]">Parent card</p>
                  <select
                    value={editCardParentId ?? ""}
                    onChange={(e) => setEditCardParentId(e.target.value ? Number(e.target.value) : null)}
                    className="w-full rounded bg-[var(--c-field)] px-2 py-1.5 text-xs text-[var(--c-t1)] outline-none hover:bg-[var(--c-field-h)] focus:bg-[var(--c-card)] focus:ring-2 focus:ring-[#0052cc]"
                  >
                    <option value="">No parent</option>
                    {selectedCard.list.cards
                      .filter((c) => c.id !== selectedCard.card.id && !c.parent_id)
                      .map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                </div>

                {/* Delete */}
                <div>
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--c-t3)]">Actions</p>
                  <button
                    onClick={() => handleDeleteCard(selectedCard.list.id, selectedCard.card.id)}
                    disabled={deletingCardId === selectedCard.card.id}
                    className="flex w-full items-center gap-2 rounded bg-[var(--c-field)] px-3 py-2 text-sm text-[var(--c-t1)] hover:bg-red-100 hover:text-red-600 disabled:opacity-50"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                    {deletingCardId === selectedCard.card.id ? "Deleting..." : "Delete card"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {createCardList && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:p-8"
          onClick={closeCreateModal}
        >
          <div
            className="relative my-auto w-full max-w-2xl rounded-xl bg-[var(--c-modal)] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={closeCreateModal}
              className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-lg text-[var(--c-t2)] hover:bg-black/10"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>

            <div className="flex items-start gap-3 px-5 pt-5 pb-2">
              <svg className="mt-1 shrink-0 text-[var(--c-t2)]" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
              <div className="flex-1 min-w-0 pr-8">
                <textarea
                  autoFocus
                  value={createTitle}
                  onChange={(e) => setCreateTitle(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleCreateCard(); } }}
                  placeholder="Card title..."
                  rows={1}
                  className="w-full resize-none rounded bg-transparent px-1 py-0.5 text-lg font-bold text-[var(--c-t1)] placeholder-[var(--c-t4)] outline-none hover:bg-[var(--c-field)] focus:bg-[var(--c-card)] focus:ring-2 focus:ring-[#0052cc]"
                />
                <span className="mt-1 inline-flex items-center rounded bg-[var(--c-field)] px-2 py-0.5 text-xs font-medium text-[var(--c-t2)]">
                  {createCardList.name}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 px-4 pb-5">
              <div className="flex-1 min-w-0 space-y-5">
                <MarkdownDescription value={createDescription} onChange={setCreateDescription} cardTitle={createTitle} />
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCreateCard}
                    disabled={!createTitle.trim() || creatingCardListId === createCardList.id}
                    className="rounded bg-[#0052cc] px-4 py-2 text-sm font-medium text-white hover:bg-[#0065ff] disabled:opacity-50"
                  >
                    {creatingCardListId === createCardList.id ? "Adding..." : "Add card"}
                  </button>
                  <button onClick={closeCreateModal} className="rounded px-4 py-2 text-sm text-[var(--c-t1)] hover:bg-[var(--c-field)]">
                    Cancel
                  </button>
                </div>
              </div>

              <div className="sm:w-44 shrink-0 space-y-4">
                <div>
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--c-t3)]">Status</p>
                  <StatusPicker selected={createStatus} onChange={setCreateStatus} />
                </div>
                <div>
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--c-t3)]">Labels</p>
                  <LabelDropdown
                    selected={createLabels}
                    onToggle={(color) => setCreateLabels((prev) => prev.includes(color) ? prev.filter((c) => c !== color) : [...prev, color])}
                  />
                </div>
                <div>
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--c-t3)]">Due date</p>
                  <input
                    type="date"
                    value={createDueDate}
                    onChange={(e) => setCreateDueDate(e.target.value)}
                    className="w-full rounded bg-[var(--c-field)] px-2 py-1.5 text-sm text-[var(--c-t1)] outline-none hover:bg-[var(--c-field-h)] focus:bg-[var(--c-card)] focus:ring-2 focus:ring-[#0052cc]"
                  />
                </div>
                <div>
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--c-t3)]">Parent card</p>
                  <select
                    value={createParentId ?? ""}
                    onChange={(e) => setCreateParentId(e.target.value ? Number(e.target.value) : null)}
                    className="w-full rounded bg-[var(--c-field)] px-2 py-1.5 text-xs text-[var(--c-t1)] outline-none hover:bg-[var(--c-field-h)] focus:bg-[var(--c-card)] focus:ring-2 focus:ring-[#0052cc]"
                  >
                    <option value="">No parent</option>
                    {createCardList.cards.filter((c) => !c.parent_id).map((c) => (
                      <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
