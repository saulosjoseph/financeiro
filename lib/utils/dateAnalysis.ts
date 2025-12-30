import { Entrada } from '@/lib/hooks/useEntradas';
import { Saida } from '@/lib/hooks/useSaidas';

export type PeriodType = 'weekly' | 'biweekly' | 'monthly' | 'bimonthly' | 'quarterly' | 'semiannual' | 'annual';

export interface DateRange {
  start: Date;
  end: Date;
}

export interface PeriodAnalysis {
  period: string;
  totalIncome: number;
  totalExpense: number;
  balance: number;
  incomeCount: number;
  expenseCount: number;
}

// Get date range for a specific period
export function getDateRangeForPeriod(periodType: PeriodType, date: Date = new Date()): DateRange {
  const start = new Date(date);
  const end = new Date(date);

  switch (periodType) {
    case 'weekly':
      // Start of week (Sunday)
      start.setDate(date.getDate() - date.getDay());
      start.setHours(0, 0, 0, 0);
      // End of week (Saturday)
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      break;

    case 'biweekly':
      // Last 14 days
      start.setDate(date.getDate() - 13);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;

    case 'monthly':
      // First day of month
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      // Last day of month
      end.setMonth(date.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
      break;

    case 'bimonthly':
      // Last 2 months
      start.setMonth(date.getMonth() - 1);
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(date.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
      break;

    case 'quarterly':
      // Last 3 months (quarter)
      const quarterMonth = Math.floor(date.getMonth() / 3) * 3;
      start.setMonth(quarterMonth);
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(quarterMonth + 3, 0);
      end.setHours(23, 59, 59, 999);
      break;

    case 'semiannual':
      // Last 6 months (semester)
      const semesterMonth = Math.floor(date.getMonth() / 6) * 6;
      start.setMonth(semesterMonth);
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(semesterMonth + 6, 0);
      end.setHours(23, 59, 59, 999);
      break;

    case 'annual':
      // Start of year
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      // End of year
      end.setMonth(11, 31);
      end.setHours(23, 59, 59, 999);
      break;
  }

  return { start, end };
}

// Filter items by date range
export function filterByDateRange<T extends { date: string }>(
  items: T[],
  range: DateRange
): T[] {
  return items.filter(item => {
    const itemDate = new Date(item.date);
    return itemDate >= range.start && itemDate <= range.end;
  });
}

// Calculate analysis for a period
export function calculatePeriodAnalysis(
  incomes: Entrada[],
  expenses: Saida[],
  range: DateRange,
  periodLabel: string
): PeriodAnalysis {
  const filteredIncomes = filterByDateRange(incomes, range);
  const filteredExpenses = filterByDateRange(expenses, range);

  const totalIncome = filteredIncomes.reduce((sum, entrada) => sum + parseFloat(entrada.amount), 0);
  const totalExpense = filteredExpenses.reduce((sum, saida) => sum + parseFloat(saida.amount), 0);

  return {
    period: periodLabel,
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense,
    incomeCount: filteredIncomes.length,
    expenseCount: filteredExpenses.length,
  };
}

// Get period label
export function getPeriodLabel(periodType: PeriodType, date: Date = new Date()): string {
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  
  switch (periodType) {
    case 'weekly': {
      const range = getDateRangeForPeriod('weekly', date);
      return `${range.start.getDate()}/${months[range.start.getMonth()]} - ${range.end.getDate()}/${months[range.end.getMonth()]}`;
    }
    case 'biweekly':
      return 'Últimas 2 semanas';
    case 'monthly':
      return `${months[date.getMonth()]}/${date.getFullYear()}`;
    case 'bimonthly':
      return 'Últimos 2 meses';
    case 'quarterly':
      const quarter = Math.floor(date.getMonth() / 3) + 1;
      return `Q${quarter} ${date.getFullYear()}`;
    case 'semiannual':
      const semester = Math.floor(date.getMonth() / 6) + 1;
      return `S${semester} ${date.getFullYear()}`;
    case 'annual':
      return date.getFullYear().toString();
  }
}

// Get multiple periods for comparison
export function getMultiplePeriods(
  periodType: PeriodType,
  count: number = 6
): { range: DateRange; label: string }[] {
  const periods: { range: DateRange; label: string }[] = [];
  const today = new Date();

  for (let i = 0; i < count; i++) {
    const date = new Date(today);
    
    switch (periodType) {
      case 'weekly':
        date.setDate(today.getDate() - (i * 7));
        break;
      case 'biweekly':
        date.setDate(today.getDate() - (i * 14));
        break;
      case 'monthly':
        date.setMonth(today.getMonth() - i);
        break;
      case 'bimonthly':
        date.setMonth(today.getMonth() - (i * 2));
        break;
      case 'quarterly':
        date.setMonth(today.getMonth() - (i * 3));
        break;
      case 'semiannual':
        date.setMonth(today.getMonth() - (i * 6));
        break;
      case 'annual':
        date.setFullYear(today.getFullYear() - i);
        break;
    }

    const range = getDateRangeForPeriod(periodType, date);
    const label = getPeriodLabel(periodType, date);
    
    periods.push({ range, label });
  }

  return periods.reverse();
}

// Format currency
export function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { 
    style: 'currency', 
    currency: 'BRL',
    minimumFractionDigits: 2 
  });
}
