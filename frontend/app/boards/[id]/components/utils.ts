export const LABEL_COLORS: { key: string; bg: string; text: string }[] = [
  { key: "red", bg: "bg-red-500", text: "text-white" },
  { key: "orange", bg: "bg-orange-500", text: "text-white" },
  { key: "yellow", bg: "bg-yellow-500", text: "text-black" },
  { key: "green", bg: "bg-green-500", text: "text-white" },
  { key: "blue", bg: "bg-blue-500", text: "text-white" },
  { key: "purple", bg: "bg-purple-500", text: "text-white" },
  { key: "pink", bg: "bg-pink-500", text: "text-white" },
  { key: "slate", bg: "bg-slate-500", text: "text-white" },
];

export const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  todo: { label: "To do", bg: "bg-zinc-100", text: "text-zinc-600", dot: "bg-zinc-400" },
  in_progress: { label: "In progress", bg: "bg-blue-100", text: "text-blue-700", dot: "bg-blue-500" },
  done: { label: "Done", bg: "bg-green-100", text: "text-green-700", dot: "bg-green-500" },
  blocked: { label: "Blocked", bg: "bg-red-100", text: "text-red-700", dot: "bg-red-500" },
  on_hold: { label: "On hold", bg: "bg-amber-100", text: "text-amber-700", dot: "bg-amber-500" },
};

export function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function isOverdue(dateStr: string | null) {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date(new Date().toDateString());
}
