import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { api } from './client';
import type { AuthMe, Category, CatalogEntry, HistoryEntry, Item, Tag } from '../types';

/**
 * Applies `fn` to the cached item list. The write happens synchronously — before the
 * `cancelQueries` await — so a burst of taps in one tick each sees the previous tap's
 * result instead of all computing from the same stale value.
 * Returns the snapshot to roll back to.
 */
async function patchItems(qc: QueryClient, fn: (items: Item[]) => Item[]) {
  const previous = qc.getQueryData<Item[]>(['items']);
  if (previous) qc.setQueryData<Item[]>(['items'], fn(previous));
  await qc.cancelQueries({ queryKey: ['items'] });
  return { previous };
}

function rollbackItems(qc: QueryClient, ctx: { previous?: Item[] } | undefined) {
  if (ctx?.previous) qc.setQueryData<Item[]>(['items'], ctx.previous);
}

export function useMe() {
  return useQuery({ queryKey: ['me'], queryFn: () => api<AuthMe>('/api/me') });
}

export function useItems() {
  return useQuery({ queryKey: ['items'], queryFn: () => api<Item[]>('/api/items') });
}

export function useCreateItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; tag: Tag | null; amount?: number }) =>
      api<Item>('/api/items', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['items'] });
      qc.invalidateQueries({ queryKey: ['catalog'] });
      qc.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}

export function useCategories() {
  return useQuery({ queryKey: ['categories'], queryFn: () => api<Category[]>('/api/categories') });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; color?: string }) =>
      api<Category>('/api/categories', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });
}

export function useDeleteItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api(`/api/items/${id}`, { method: 'DELETE' }),
    onMutate: (id) =>
      patchItems(qc, (items) => items.filter((it) => it.id !== id)),
    onError: (_err, _id, ctx) => rollbackItems(qc, ctx),
    onSettled: () => qc.invalidateQueries({ queryKey: ['items'] }),
  });
}

export function useUpdateItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: number; isChecked?: boolean; amount?: number }) =>
      api(`/api/items/${input.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isChecked: input.isChecked, amount: input.amount }),
      }),
    onMutate: (input) =>
      patchItems(qc, (items) =>
        items.map((it) =>
          it.id === input.id
            ? {
                ...it,
                is_checked: input.isChecked ?? it.is_checked,
                amount: input.amount ?? it.amount,
              }
            : it,
        ),
      ),
    onError: (_err, _input, ctx) => rollbackItems(qc, ctx),
    onSettled: () => qc.invalidateQueries({ queryKey: ['items'] }),
  });
}

/**
 * Steps an item's amount by `delta`, resolved against the freshest cached value rather
 * than a rendered one, so rapid taps add up. Stepping below 1 takes the item off the list.
 */
export function useStepAmount() {
  const qc = useQueryClient();
  const updateItem = useUpdateItem();
  const deleteItem = useDeleteItem();
  return (id: number, delta: number) => {
    const current = qc.getQueryData<Item[]>(['items'])?.find((it) => it.id === id);
    if (!current) return;
    const next = current.amount + delta;
    if (next < 1) deleteItem.mutate(id);
    else updateItem.mutate({ id, amount: next });
  };
}

export function useCompleteAll() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api<{ deleted: number }>('/api/items/complete', { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['items'] });
      qc.invalidateQueries({ queryKey: ['history'] });
    },
  });
}

export function useHistory() {
  return useQuery({ queryKey: ['history'], queryFn: () => api<HistoryEntry[]>('/api/history') });
}

export function useCatalog(q: string) {
  return useQuery({
    queryKey: ['catalog', q],
    queryFn: () =>
      api<CatalogEntry[]>(`/api/catalog${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  });
}

export function useDeleteCatalogEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api(`/api/catalog/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['catalog'] }),
  });
}
