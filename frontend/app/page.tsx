"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, getCsrfCookie } from "@/lib/api";
import { listenToUser } from "@/lib/echo";

interface Board {
  id: number;
  name: string;
  background_color: string | null;
  background_image: string | null;
  owner_id: number;
  created_at: string;
  updated_at: string;
}

interface User {
  id: number;
  name: string;
  email: string;
}

const PRESET_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#84cc16", "#22c55e",
  "#14b8a6", "#06b6d4", "#3b82f6", "#6366f1", "#8b5cf6",
  "#a855f7", "#d946ef", "#f43f5e", "#64748b", "#18181b",
];

export default function Home() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newBoardName, setNewBoardName] = useState("");
  const [selectedColor, setSelectedColor] = useState("#3b82f6");
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const router = useRouter();

  async function loadBoards() {
    try {
      await getCsrfCookie();
      const data = await apiFetch("/api/boards");
      setBoards(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load boards";
      if (message.includes("401") || message.includes("Unauthenticated")) {
        router.push("/login");
      } else {
        setError(message);
      }
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await getCsrfCookie();
        const [boardsData, userData] = await Promise.all([
          apiFetch("/api/boards"),
          apiFetch("/api/user"),
        ]);
        if (!cancelled) {
          setBoards(boardsData);
          setCurrentUser(userData);
        }
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : "Failed to load boards";
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

  useEffect(() => {
    if (!currentUser) return;
    const unsubscribe = listenToUser(currentUser.id, () => {
      loadBoards();
    });
    return () => {
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newBoardName.trim()) return;
    setCreating(true);
    try {
      await apiFetch("/api/boards", {
        method: "POST",
        body: JSON.stringify({
          name: newBoardName.trim(),
          background_color: selectedColor,
        }),
      });
      const data = await apiFetch("/api/boards");
      setBoards(data);
      setNewBoardName("");
      setShowCreate(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create board");
    } finally {
      setCreating(false);
    }
  }

  async function handleRename(boardId: number) {
    if (!editName.trim()) { setEditingId(null); return; }
    try {
      await apiFetch(`/api/boards/${boardId}`, {
        method: "PUT",
        body: JSON.stringify({ name: editName.trim() }),
      });
      const data = await apiFetch("/api/boards");
      setBoards(data);
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to rename board");
    }
  }

  async function handleDelete(boardId: number) {
    setDeletingId(boardId);
    try {
      await apiFetch(`/api/boards/${boardId}`, { method: "DELETE" });
      const data = await apiFetch("/api/boards");
      setBoards(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete board");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleLogout() {
    try { await apiFetch("/logout", { method: "POST" }); } catch { /* ignore */ }
    router.push("/login");
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <nav className="sticky top-0 z-40 border-b border-white/10 bg-zinc-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
            </div>
            <span className="text-lg font-bold tracking-tight">Trello Clone</span>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-xl px-4 py-2 text-sm font-semibold text-zinc-400 transition-all hover:bg-white/10 hover:text-white"
          >
            Log out
          </button>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-6 py-10">
        {error && (
          <div className="mb-6 flex items-center gap-2 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-400 ring-1 ring-red-500/20">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>
            {error}
          </div>
        )}

        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Your boards</h2>
            <p className="mt-1 text-sm text-zinc-500">Manage your projects and tasks</p>
          </div>
          <button
            onClick={() => { setShowCreate(!showCreate); setError(""); }}
            className="flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition-all hover:bg-blue-500 hover:shadow-blue-500/30 active:scale-[0.97]"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
            {showCreate ? "Cancel" : "Create board"}
          </button>
        </div>

        {showCreate && (
          <form onSubmit={handleCreate} className="mb-10 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl">
            <h3 className="mb-5 text-sm font-bold uppercase tracking-wider text-zinc-400">New board</h3>
            <div className="mb-5">
              <label className="mb-2 block text-xs font-semibold text-zinc-400">Board name</label>
              <input
                type="text"
                value={newBoardName}
                onChange={(e) => setNewBoardName(e.target.value)}
                placeholder="e.g. Marketing Q3"
                autoFocus
                className="w-full rounded-2xl border border-white/10 bg-zinc-900 px-4 py-3 text-sm font-medium text-white placeholder-zinc-600 outline-none ring-2 ring-transparent transition-all focus:border-blue-500/50 focus:ring-blue-500/20"
              />
            </div>
            <div className="mb-6">
              <label className="mb-3 block text-xs font-semibold text-zinc-400">Background</label>
              <div className="flex flex-wrap gap-3">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setSelectedColor(color)}
                    className={`relative h-10 w-10 rounded-xl transition-all hover:scale-110 ${selectedColor === color ? "ring-2 ring-white ring-offset-2 ring-offset-zinc-950" : ""}`}
                    style={{ backgroundColor: color }}
                    aria-label={`Select color ${color}`}
                  >
                    {selectedColor === color && (
                      <svg className="absolute inset-0 m-auto text-white" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                    )}
                  </button>
                ))}
              </div>
            </div>
            <button
              type="submit"
              disabled={creating || !newBoardName.trim()}
              className="flex items-center gap-2 rounded-2xl bg-white px-6 py-3 text-sm font-bold text-zinc-900 transition-all hover:bg-zinc-200 active:scale-[0.97] disabled:opacity-40"
            >
              {creating ? "Creating..." : "Create board"}
            </button>
          </form>
        )}

        {loading ? (
          <div className="flex items-center gap-3 text-zinc-500">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-700 border-t-zinc-400" />
            Loading boards...
          </div>
        ) : boards.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-zinc-800 py-20">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-900">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-600"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
            </div>
            <p className="text-sm font-medium text-zinc-400">No boards yet</p>
            <p className="mt-1 text-xs text-zinc-600">Create your first board to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {boards.map((board) => (
              <div
                key={board.id}
                className="group relative overflow-hidden rounded-3xl transition-all hover:-translate-y-1 hover:shadow-2xl"
                style={{ backgroundColor: board.background_color || "#3b82f6" }}
              >
                <div
                  onClick={() => router.push(`/boards/${board.id}`)}
                  className="cursor-pointer p-6 pb-16"
                >
                  {editingId === board.id ? (
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onBlur={() => handleRename(board.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleRename(board.id);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
                      className="w-full rounded-xl border border-white/20 bg-black/20 px-3 py-2 text-lg font-bold text-white placeholder-white/40 outline-none backdrop-blur-md"
                    />
                  ) : (
                    <h3
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingId(board.id);
                        setEditName(board.name);
                      }}
                      className="cursor-text text-lg font-bold text-white drop-shadow-md"
                      title="Click to rename"
                    >
                      {board.name}
                    </h3>
                  )}
                  <p className="mt-1.5 text-xs font-medium text-white/70">
                    {new Date(board.created_at).toLocaleDateString()}
                  </p>
                </div>

                <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between bg-black/10 px-4 py-3 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingId(board.id);
                      setEditName(board.name);
                    }}
                    className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white/90 transition-colors hover:bg-white/20"
                  >
                    Rename
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(board.id);
                    }}
                    disabled={deletingId === board.id}
                    className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white/90 transition-colors hover:bg-red-500/60"
                  >
                    {deletingId === board.id ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
