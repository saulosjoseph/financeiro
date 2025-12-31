'use client';

import useSWR from 'swr';
import { useState } from 'react';

export interface TransferAccount {
  id: string;
  name: string;
  type: string;
  color: string;
  icon: string;
}

export interface Transfer {
  id: string;
  familyId: string;
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  description?: string;
  date: string;
  createdAt: string;
  updatedAt: string;
  fromAccount?: TransferAccount;
  toAccount?: TransferAccount;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useTransfers(familyId: string | null) {
  const { data, error, mutate } = useSWR<Transfer[]>(
    familyId ? `/api/families/${familyId}/transfers` : null,
    fetcher
  );

  const [isCreating, setIsCreating] = useState(false);

  const createTransfer = async (transferData: {
    fromAccountId: string;
    toAccountId: string;
    amount: number;
    description?: string;
    date?: string;
  }) => {
    if (!familyId) return;
    
    setIsCreating(true);
    try {
      const response = await fetch(`/api/families/${familyId}/transfers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transferData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create transfer');
      }

      await mutate();
      return await response.json();
    } catch (error) {
      console.error('Error creating transfer:', error);
      throw error;
    } finally {
      setIsCreating(false);
    }
  };

  return {
    transfers: data,
    isLoading: !error && !data,
    isError: error,
    isCreating,
    createTransfer,
    mutate,
  };
}
