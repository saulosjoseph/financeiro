'use client';

import useSWR from 'swr';
import { useMemo } from 'react';
import { User } from './useFamily';
import { Tag } from './useEntradas';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export interface SaidaTag {
  id: string;
  tag: Tag;
}

export interface Saida {
  id: string;
  amount: string;
  description: string | null;
  category: string | null;
  date: string;
  user: User;
  tags: SaidaTag[];
}

export type PeriodType = 'mes' | 'ano' | 'geral';

export function useSaidas(familyId?: string | null) {
  const { data, mutate, error, isLoading } = useSWR<Saida[]>(
    familyId ? `/api/families/${familyId}/saidas` : null,
    fetcher
  );
  
  // Calcular totais por período
  const totalMes = useMemo(() => {
    if (!data) return 0;
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    
    return data
      .filter(saida => {
        const saidaDate = new Date(saida.date);
        return saidaDate >= firstDayOfMonth && saidaDate <= lastDayOfMonth;
      })
      .reduce((sum, saida) => sum + parseFloat(saida.amount), 0);
  }, [data]);

  const totalAno = useMemo(() => {
    if (!data) return 0;
    const now = new Date();
    const firstDayOfYear = new Date(now.getFullYear(), 0, 1);
    const lastDayOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    
    return data
      .filter(saida => {
        const saidaDate = new Date(saida.date);
        return saidaDate >= firstDayOfYear && saidaDate <= lastDayOfYear;
      })
      .reduce((sum, saida) => sum + parseFloat(saida.amount), 0);
  }, [data]);

  const totalGeral = useMemo(() => {
    if (!data) return 0;
    return data.reduce((sum, saida) => sum + parseFloat(saida.amount), 0);
  }, [data]);

  // Calcular contadores por período
  const countMes = useMemo(() => {
    if (!data) return 0;
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    
    return data.filter(saida => {
      const saidaDate = new Date(saida.date);
      return saidaDate >= firstDayOfMonth && saidaDate <= lastDayOfMonth;
    }).length;
  }, [data]);

  const countAno = useMemo(() => {
    if (!data) return 0;
    const now = new Date();
    const firstDayOfYear = new Date(now.getFullYear(), 0, 1);
    const lastDayOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    
    return data.filter(saida => {
      const saidaDate = new Date(saida.date);
      return saidaDate >= firstDayOfYear && saidaDate <= lastDayOfYear;
    }).length;
  }, [data]);

  const countGeral = useMemo(() => {
    return data?.length || 0;
  }, [data]);

  // Função para obter label do período
  const getPeriodLabel = (period: PeriodType): string => {
    const now = new Date();
    
    if (period === 'mes') {
      return now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    } else if (period === 'ano') {
      return now.getFullYear().toString();
    } else {
      return 'Histórico Completo';
    }
  };

  // Função para obter dados filtrados por período
  const getFilteredData = (period: PeriodType): Saida[] => {
    if (!data) return [];
    
    if (period === 'geral') {
      return data;
    }
    
    const now = new Date();
    let startDate: Date;
    let endDate: Date;
    
    if (period === 'mes') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    } else {
      startDate = new Date(now.getFullYear(), 0, 1);
      endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    }
    
    return data.filter(saida => {
      const saidaDate = new Date(saida.date);
      return saidaDate >= startDate && saidaDate <= endDate;
    });
  };
  
  return {
    saidas: data,
    totalMes,
    totalAno,
    totalGeral,
    countMes,
    countAno,
    countGeral,
    getPeriodLabel,
    getFilteredData,
    mutate,
    error,
    isLoading,
  };
}
