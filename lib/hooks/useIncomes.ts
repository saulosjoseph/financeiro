'use client';

import useSWR from 'swr';
import { User } from './useFamily';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export interface Tag {
  id: string;
  name: string;
  color: string;
  familyId: string;
}

export interface IncomeTag {
  id: string;
  tag: Tag;
}

export interface Income {
  id: string;
  amount: string;
  description: string | null;
  source: string | null;
  date: string;
  user: User;
  tags: IncomeTag[];
}

export function useIncomes(familyId?: string | null) {
  const { data, mutate, error, isLoading } = useSWR<Income[]>(
    familyId ? `/api/families/${familyId}/incomes` : null,
    fetcher
  );
  
  const totalIncome = data?.reduce((sum, income) => sum + parseFloat(income.amount), 0) || 0;
  
  return {
    incomes: data,
    totalIncome,
    mutate,
    error,
    isLoading,
  };
}
