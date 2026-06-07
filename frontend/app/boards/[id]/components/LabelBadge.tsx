import { LABEL_COLORS } from "./utils";

export function LabelBadge({ color }: { color: string }) {
  const found = LABEL_COLORS.find((l) => l.key === color);
  if (!found) return null;
  return (
    <span className={`inline-block h-2 w-8 rounded-full ${found.bg}`} title={color} />
  );
}
