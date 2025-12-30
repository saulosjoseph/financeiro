'use client';

import useSWR from 'swr';
import { Tag } from './useEntradas';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useTags(familyId?: string | null) {
  const { data, mutate, error, isLoading } = useSWR<Tag[]>(
    familyId ? `/api/families/${familyId}/tags` : null,
    fetcher
  );
  
  return {
    tags: data,
    mutate,
    error,
    isLoading,
  };
}
