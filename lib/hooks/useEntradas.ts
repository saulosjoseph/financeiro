'use client';

import useSWR from 'swr';
import { useMemo } from 'react';
import { User } from './useFamily';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export interface Tag {
  id: string;
  name: string;
  color: string;
  familyId: string;
}

export interface EntradaTag {
  id: string;
  tag: Tag;
}

export interface Entrada {
  id: string;
  amount: string;
  description: string | null;
  source: string | null;
  date: string;
  user: User;
  tags: EntradaTag[];
  isRecurring?: boolean;
  recurringType?: string | null;
  recurringDay?: number | null;
  recurringEndDate?: string | null;
}

export type PeriodType = 'mes' | 'ano' | 'geral';

export function useEntradas(familyId?: string | null) {
  const { data, mutate, error, isLoading } = useSWR<Entrada[]>(
    familyId ? `/api/families/${familyId}/entradas` : null,
    fetcher
  );
  
  // Calcular totais por período
  const totalMes = useMemo(() => {
    if (!data) return 0;
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    
    return data
      .filter(entrada => {
        const entradaDate = new Date(entrada.date);
        return entradaDate >= firstDayOfMonth && entradaDate <= lastDayOfMonth;
      })
      .reduce((sum, entrada) => sum + parseFloat(entrada.amount), 0);
  }, [data]);

  const totalAno = useMemo(() => {
    if (!data) return 0;
    const now = new Date();
    const firstDayOfYear = new Date(now.getFullYear(), 0, 1);
    const lastDayOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    
    return data
      .filter(entrada => {
        const entradaDate = new Date(entrada.date);
        return entradaDate >= firstDayOfYear && entradaDate <= lastDayOfYear;
      })
      .reduce((sum, entrada) => sum + parseFloat(entrada.amount), 0);
  }, [data]);

  const totalGeral = useMemo(() => {
    if (!data) return 0;
    return data.reduce((sum, entrada) => sum + parseFloat(entrada.amount), 0);
  }, [data]);

  // Calcular contadores por período
  const countMes = useMemo(() => {
    if (!data) return 0;
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    
    return data.filter(entrada => {
      const entradaDate = new Date(entrada.date);
      return entradaDate >= firstDayOfMonth && entradaDate <= lastDayOfMonth;
    }).length;
  }, [data]);

  const countAno = useMemo(() => {
    if (!data) return 0;
    const now = new Date();
    const firstDayOfYear = new Date(now.getFullYear(), 0, 1);
    const lastDayOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    
    return data.filter(entrada => {
      const entradaDate = new Date(entrada.date);
      return entradaDate >= firstDayOfYear && entradaDate <= lastDayOfYear;
    }).length;
  }, [data]);

  const countGeral = useMemo(() => {
    return data?.length || 0;
  }, [data]);

  // Filtrar entradas recorrentes
  const recurringEntradas = useMemo(() => {
    return data?.filter(entrada => entrada.isRecurring) || [];
  }, [data]);

  // Calcular impacto mensal das recorrências
  const recurringMonthlyImpact = useMemo(() => {
    if (!recurringEntradas.length) return 0;
    
    return recurringEntradas.reduce((sum, entrada) => {
      const amount = parseFloat(entrada.amount);
      const type = entrada.recurringType;
      
      // Converter para impacto mensal
      switch (type) {
        case 'weekly':
          return sum + (amount * 4.33);
        case 'biweekly':
          return sum + (amount * 2.165);
        case 'monthly':
          return sum + amount;
        case 'bimonthly':
          return sum + (amount / 2);
        case 'quarterly':
          return sum + (amount / 3);
        case 'semiannual':
          return sum + (amount / 6);
        case 'annual':
          return sum + (amount / 12);
        default:
          return sum + amount;
      }
    }, 0);
  }, [recurringEntradas]);

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
  const getFilteredData = (period: PeriodType): Entrada[] => {
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
    
    return data.filter(entrada => {
      const entradaDate = new Date(entrada.date);
      return entradaDate >= startDate && entradaDate <= endDate;
    });
  };
  
  return {
    entradas: data,
    totalMes,
    totalAno,
    totalGeral,
    countMes,
    countAno,
    countGeral,
    recurringEntradas,
    recurringMonthlyImpact,
    getPeriodLabel,
    getFilteredData,
    mutate,
    error,
    isLoading,
  };
}
