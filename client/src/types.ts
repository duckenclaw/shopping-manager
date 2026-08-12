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
