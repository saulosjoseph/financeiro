'use client';

import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export interface User {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
}

export interface FamilyMember {
  id: string;
  role: string;
  user: User;
}

export interface Family {
  id: string;
  name: string;
  members: FamilyMember[];
  _count: {
    incomes: number;
    expenses: number;
  };
}

export function useFamily(familyId?: string | null) {
  const { data: families, mutate, error, isLoading } = useSWR<Family[]>('/api/families', fetcher);
  
  const selectedFamily = families?.find(f => f.id === familyId);
  
  return {
    families,
    selectedFamily,
    mutate,
    error,
    isLoading,
  };
}
