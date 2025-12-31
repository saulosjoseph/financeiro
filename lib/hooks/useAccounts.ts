'use client';

import useSWR from 'swr';
import { useState } from 'react';

export interface Account {
  id: string;
  familyId: string;
  name: string;
  type: 'checking' | 'savings' | 'cash' | 'credit_card' | 'investment';
  initialBalance: number;
  creditLimit?: number;
  color: string;
  icon: string;
  description?: string;
  isDefault: boolean;
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
  currentBalance?: number;
  entradasCount?: number;
  saidasCount?: number;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useAccounts(familyId: string | null) {
  const { data, error, mutate } = useSWR<Account[]>(
    familyId ? `/api/families/${familyId}/accounts` : null,
    fetcher
  );

  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const createAccount = async (accountData: Partial<Account>) => {
    if (!familyId) return;
    
    setIsCreating(true);
    try {
      const response = await fetch(`/api/families/${familyId}/accounts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(accountData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create account');
      }

      await mutate();
      return await response.json();
    } catch (error) {
      console.error('Error creating account:', error);
      throw error;
    } finally {
      setIsCreating(false);
    }
  };

  const updateAccount = async (accountId: string, accountData: Partial<Account>) => {
    if (!familyId) return;
    
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/families/${familyId}/accounts/${accountId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(accountData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update account');
      }

      await mutate();
      return await response.json();
    } catch (error) {
      console.error('Error updating account:', error);
      throw error;
    } finally {
      setIsUpdating(false);
    }
  };

  const deleteAccount = async (accountId: string) => {
    if (!familyId) return;
    
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/families/${familyId}/accounts/${accountId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete account');
      }

      await mutate();
      return await response.json();
    } catch (error) {
      console.error('Error deleting account:', error);
      throw error;
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    accounts: data,
    isLoading: !error && !data,
    isError: error,
    isCreating,
    isUpdating,
    isDeleting,
    createAccount,
    updateAccount,
    deleteAccount,
    mutate,
  };
}

export function useAccount(familyId: string | null, accountId: string | null) {
  const { data, error, mutate } = useSWR<Account>(
    familyId && accountId ? `/api/families/${familyId}/accounts/${accountId}` : null,
    fetcher
  );

  return {
    account: data,
    isLoading: !error && !data,
    isError: error,
    mutate,
  };
}
