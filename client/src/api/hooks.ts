import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import type { AuthMe, Category, CatalogEntry, HistoryEntry, Item, Tag } from '../types';

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
    onSuccess: () => qc.invalidateQueries({ queryKey: ['items'] }),
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ['items'] }),
  });
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
