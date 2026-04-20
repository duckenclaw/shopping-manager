import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import type { AuthMe, CatalogEntry, Draft, Item, Place, Tag } from '../types';

export function useMe() {
  return useQuery({ queryKey: ['me'], queryFn: () => api<AuthMe>('/api/me') });
}

export function usePlaces() {
  return useQuery({ queryKey: ['places'], queryFn: () => api<Place[]>('/api/places') });
}

export function useCreatePlace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) =>
      api<Place>('/api/places', { method: 'POST', body: JSON.stringify({ name }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['places'] }),
  });
}

export function useDeletePlace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api(`/api/places/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['places'] });
      qc.invalidateQueries({ queryKey: ['items'] });
    },
  });
}

export function useItems() {
  return useQuery({ queryKey: ['items'], queryFn: () => api<Item[]>('/api/items') });
}

export function useCreateItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; tag: Tag | null; placeId?: number | null; amount?: number }) =>
      api<Item>('/api/items', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['items'] });
      qc.invalidateQueries({ queryKey: ['catalog'] });
    },
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
    mutationFn: (input: { id: number; placeId?: number | null; isChecked?: boolean; amount?: number }) =>
      api(`/api/items/${input.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ placeId: input.placeId, isChecked: input.isChecked, amount: input.amount }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['items'] }),
  });
}

export function useCompleteAll() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api<{ deleted: number }>('/api/items/complete', { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['items'] }),
  });
}

export function useCompleteTrip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (placeId: number) =>
      api<{ deleted: number }>('/api/items/complete-trip', {
        method: 'POST',
        body: JSON.stringify({ placeId }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['items'] }),
  });
}

export function useCatalog(q: string) {
  return useQuery({
    queryKey: ['catalog', q],
    queryFn: () =>
      api<CatalogEntry[]>(`/api/catalog${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  });
}

export function useDrafts() {
  return useQuery({ queryKey: ['drafts'], queryFn: () => api<Draft[]>('/api/drafts') });
}

export function useCreateDraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) =>
      api<Draft>('/api/drafts', { method: 'POST', body: JSON.stringify({ name }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['drafts'] }),
  });
}

export function useDeleteDraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api(`/api/drafts/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['drafts'] }),
  });
}

export function useAddDraftItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { draftId: number; name: string; tag: Tag | null }) =>
      api(`/api/drafts/${input.draftId}/items`, {
        method: 'POST',
        body: JSON.stringify({ name: input.name, tag: input.tag }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['drafts'] }),
  });
}

export function useDeleteDraftItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { draftId: number; itemId: number }) =>
      api(`/api/drafts/${input.draftId}/items/${input.itemId}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['drafts'] }),
  });
}

export function useApplyDraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { draftId: number; placeId: number | null }) =>
      api<{ added: number }>(`/api/drafts/${input.draftId}/apply`, {
        method: 'POST',
        body: JSON.stringify({ placeId: input.placeId }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['items'] });
      qc.invalidateQueries({ queryKey: ['catalog'] });
    },
  });
}
