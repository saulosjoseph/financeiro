'use client';

import { PeriodAnalysis, formatCurrency } from '@/lib/utils/dateAnalysis';

interface PeriodAnalysisChartProps {
  analyses: PeriodAnalysis[];
}

export default function PeriodAnalysisChart({ analyses }: PeriodAnalysisChartProps) {
  if (analyses.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        Nenhum dado disponível para análise
      </div>
    );
  }

  const maxValue = Math.max(
    ...analyses.map(a => Math.max(a.totalIncome, a.totalExpense))
  );

  return (
    <div className="space-y-6">
      {analyses.map((analysis, index) => (
        <div key={index} className="space-y-2">
          <div className="flex justify-between items-center">
            <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300">
              {analysis.period}
            </h4>
            <span className={`text-sm font-semibold ${
              analysis.balance >= 0 
                ? 'text-green-600 dark:text-green-400' 
                : 'text-red-600 dark:text-red-400'
            }`}>
              {formatCurrency(analysis.balance)}
            </span>
          </div>

          {/* Income Bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
              <span>Rendas ({analysis.incomeCount})</span>
              <span>{formatCurrency(analysis.totalIncome)}</span>
            </div>
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all duration-500"
                style={{ width: `${(analysis.totalIncome / maxValue) * 100}%` }}
              />
            </div>
          </div>

          {/* Expense Bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
              <span>Gastos ({analysis.expenseCount})</span>
              <span>{formatCurrency(analysis.totalExpense)}</span>
            </div>
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-red-500 transition-all duration-500"
                style={{ width: `${(analysis.totalExpense / maxValue) * 100}%` }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
