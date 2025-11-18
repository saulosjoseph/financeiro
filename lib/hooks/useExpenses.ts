'use client';

import useSWR from 'swr';
import { User } from './useFamily';
import { Tag } from './useIncomes';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export interface ExpenseTag {
  id: string;
  tag: Tag;
}

export interface Expense {
  id: string;
  amount: string;
  description: string | null;
  category: string | null;
  date: string;
  user: User;
  tags: ExpenseTag[];
}

export function useExpenses(familyId?: string | null) {
  const { data, mutate, error, isLoading } = useSWR<Expense[]>(
    familyId ? `/api/families/${familyId}/expenses` : null,
    fetcher
  );
  
  const totalExpense = data?.reduce((sum, expense) => sum + parseFloat(expense.amount), 0) || 0;
  
  return {
    expenses: data,
    totalExpense,
    mutate,
    error,
    isLoading,
  };
}
