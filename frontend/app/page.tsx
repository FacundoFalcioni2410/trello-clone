"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, getCsrfCookie } from "@/lib/api";

interface Board {
  id: number;
  name: string;
  background_color: string | null;
  background_image: string | null;
  owner_id: number;
  created_at: string;
  updated_at: string;
}

const PRESET_COLORS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#84cc16",
  "#22c55e",
  "#14b8a6",
  "#06b6d4",
  "#3b82f6",
  "#6366f1",
  "#8b5cf6",
  "#a855f7",
  "#d946ef",
  "#f43f5e",
  "#64748b",
  "#18181b",
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
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    startTransition(async () => {
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
      } finally {
        setLoading(false);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      setNewBoardName("");
      setShowCreate(false);
      const data = await apiFetch("/api/boards");
      setBoards(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create board");
    } finally {
      setCreating(false);
    }
  }

  async function handleRename(boardId: number) {
    if (!editName.trim()) {
      setEditingId(null);
      return;
    }

    try {
      await apiFetch(`/api/boards/${boardId}`, {
        method: "PUT",
        body: JSON.stringify({ name: editName.trim() }),
      });
      setEditingId(null);
      const data = await apiFetch("/api/boards");
      setBoards(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to rename board");
    }
  }

  async function handleDelete(boardId: number) {
    setDeletingId(boardId);
    try {
      await apiFetch(`/api/boards/${boardId}`, {
        method: "DELETE",
      });
      const data = await apiFetch("/api/boards");
      setBoards(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete board");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleLogout() {
    try {
      await apiFetch("/logout", { method: "POST" });
    } catch {
      // ignore
    }
    router.push("/login");
  }

  return (
    <div className="min-h-full bg-zinc-50 dark:bg-black">
      <header className="border-b border-zinc-200 bg-white px-6 py-4 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <h1 className="text-xl font-bold text-zinc-900 dark:text-white">Boards</h1>
          <button
            onClick={handleLogout}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
          >
            Log out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        {error && (
          <div className="mb-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200">Your boards</h2>
          <button
            onClick={() => {
              setShowCreate(!showCreate);
              setError("");
            }}
            className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
          >
            {showCreate ? "Cancel" : "Create board"}
          </button>
        </div>

        {showCreate && (
          <form onSubmit={handleCreate} className="mb-8 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
            <h3 className="mb-4 text-sm font-semibold text-zinc-800 dark:text-zinc-200">Create new board</h3>
            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Name</label>
              <input
                type="text"
                value={newBoardName}
                onChange={(e) => setNewBoardName(e.target.value)}
                placeholder="Board name"
                autoFocus
                className="block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
              />
            </div>
            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Background color</label>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setSelectedColor(color)}
                    className={`h-8 w-8 rounded-full border-2 transition-transform hover:scale-110 ${selectedColor === color ? "border-zinc-900 dark:border-white" : "border-transparent"}`}
                    style={{ backgroundColor: color }}
                    aria-label={`Select color ${color}`}
                  />
                ))}
              </div>
            </div>
            <button
              type="submit"
              disabled={creating || !newBoardName.trim()}
              className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
            >
              {creating ? "Creating..." : "Create board"}
            </button>
          </form>
        )}

        {loading || isPending ? (
          <div className="text-sm text-zinc-500 dark:text-zinc-400">Loading boards...</div>
        ) : boards.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 bg-white py-12 text-center dark:border-zinc-800 dark:bg-zinc-950">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">No boards yet. Create your first board to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {boards.map((board) => (
              <div
                key={board.id}
                className="group relative flex flex-col justify-between rounded-xl p-5 transition-shadow hover:shadow-lg"
                style={{ backgroundColor: board.background_color || "#3b82f6" }}
              >
                <div className="mb-8">
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
                      autoFocus
                      className="w-full rounded border border-white/30 bg-white/20 px-2 py-1 text-lg font-semibold text-white placeholder-white/70 outline-none backdrop-blur-sm"
                    />
                  ) : (
                    <h3
                      onClick={() => {
                        setEditingId(board.id);
                        setEditName(board.name);
                      }}
                      className="cursor-text text-lg font-semibold text-white"
                      title="Click to rename"
                    >
                      {board.name}
                    </h3>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/80">
                    {new Date(board.created_at).toLocaleDateString()}
                  </span>
                  <div className="flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      onClick={() => {
                        setEditingId(board.id);
                        setEditName(board.name);
                      }}
                      className="rounded-md bg-white/20 px-2 py-1 text-xs font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/30"
                    >
                      Rename
                    </button>
                    <button
                      onClick={() => handleDelete(board.id)}
                      disabled={deletingId === board.id}
                      className="rounded-md bg-white/20 px-2 py-1 text-xs font-medium text-white backdrop-blur-sm transition-colors hover:bg-red-500/60"
                    >
                      {deletingId === board.id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
