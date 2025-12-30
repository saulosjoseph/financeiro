'use client';

import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export interface GoalContribution {
  id: string;
  goalId: string;
  entradaId: string | null;
  amount: string;
  description: string | null;
  date: string;
  createdAt: string;
  entrada?: {
    id: string;
    description: string | null;
    date: string;
    user?: {
      name: string | null;
      email: string;
    };
  };
}

export interface SavingsGoal {
  id: string;
  familyId: string;
  name: string;
  description: string | null;
  targetAmount: string;
  currentAmount: string;
  targetDate: string | null;
  priority: number;
  isEmergencyFund: boolean;
  monthlyExpenses: string | null;
  targetMonths: number | null;
  isCompleted: boolean;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  contributions?: GoalContribution[];
  _count?: {
    contributions: number;
  };
}

export function useGoals(familyId?: string | null) {
  const { data, mutate, error, isLoading } = useSWR<SavingsGoal[]>(
    familyId ? `/api/families/${familyId}/goals` : null,
    fetcher
  );

  return {
    goals: data,
    isLoading,
    error,
    mutate,
  };
}

export function useGoal(familyId?: string | null, goalId?: string | null) {
  const { data, mutate, error, isLoading } = useSWR<SavingsGoal>(
    familyId && goalId ? `/api/families/${familyId}/goals/${goalId}` : null,
    fetcher
  );

  return {
    goal: data,
    isLoading,
    error,
    mutate,
  };
}

export function useGoalContributions(familyId?: string | null, goalId?: string | null) {
  const { data, mutate, error, isLoading } = useSWR<GoalContribution[]>(
    familyId && goalId ? `/api/families/${familyId}/goals/${goalId}/contributions` : null,
    fetcher
  );

  return {
    contributions: data,
    isLoading,
    error,
    mutate,
  };
}
