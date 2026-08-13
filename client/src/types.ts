export const TAGS = [
  'Фрукты',
  'Овощи',
  'Мясо',
  'Кондименты',
  'Крупы',
  'Молочка',
  'Сладкое',
  'Дом',
] as const;

export type PredefinedTag = (typeof TAGS)[number];
export type Tag = string;

export type Item = {
  id: number;
  name: string;
  tag: Tag | null;
  is_checked: boolean;
  amount: number;
  created_at: string;
};

export type HistoryEntry = {
  id: number;
  name: string;
  tag: Tag | null;
  amount: number;
  /** when the item was originally added to the list */
  added_at: string;
  /** when it was bought — i.e. when "Готово" was pressed */
  completed_at: string;
};

export type CatalogEntry = {
  id: number;
  name: string;
  tag: Tag | null;
};

export type Category = {
  name: string;
  color: string;
};

export type AuthMe = {
  user: {
    id: number;
    username?: string;
    firstName: string;
    lastName?: string;
    photoUrl?: string;
  };
  hasAccess: boolean;
};
