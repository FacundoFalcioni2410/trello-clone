export interface ChecklistItem {
  id: number;
  card_id: number;
  text: string;
  completed: boolean;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
}

export interface CardActivity {
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

export type CardStatus = "todo" | "in_progress" | "done" | "blocked" | "on_hold";

export interface Card {
  id: number;
  title: string;
  description: string | null;
  due_date: string | null;
  position: number;
  board_list_id: number;
  labels: string[] | null;
  status: CardStatus;
  parent_id: number | null;
  children: Card[];
  checklist_items: ChecklistItem[];
  activities: CardActivity[];
  created_at: string;
}

export interface BoardList {
  id: number;
  name: string;
  position: number;
  cards: Card[];
}

export interface BoardMember {
  id: number;
  board_id: number;
  user_id: number;
  user: User;
  role: string;
  created_at: string;
}

export interface Board {
  id: number;
  name: string;
  background_color: string | null;
  background_image: string | null;
  owner_id: number;
  owner: User;
  members: BoardMember[];
  lists: BoardList[];
}
