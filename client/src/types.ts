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
export type Tag = (typeof TAGS)[number];

export type Place = {
  id: number;
  name: string;
  created_at: string;
};

export type Item = {
  id: number;
  name: string;
  tag: Tag | null;
  place_id: number | null;
  place_name: string | null;
  is_checked: boolean;
  amount: number;
  created_at: string;
};

export type CatalogEntry = {
  id: number;
  name: string;
  tag: Tag | null;
};

export type Draft = {
  id: number;
  name: string;
  created_at: string;
  items: { id: number; name: string; tag: Tag | null }[];
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
