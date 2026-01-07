'use client';

import { formatCurrency } from '@/lib/utils/dateAnalysis';

interface WaterfallChartProps {
  data: {
    initialBalance: number;
    incomes: number;
    expenses: number;
    finalBalance: number;
  };
  title: string;
}

export default function WaterfallChart({ data, title }: WaterfallChartProps) {
  const steps = [
    { label: 'Saldo Inicial', value: data.initialBalance, isBase: true },
    { label: 'Receitas', value: data.incomes, isPositive: true },
    { label: 'Despesas', value: data.expenses, isNegative: true },
    { label: 'Saldo Final', value: data.finalBalance, isFinal: true },
  ];

  const maxValue = Math.max(
    Math.abs(data.initialBalance),
    Math.abs(data.incomes),
    Math.abs(data.expenses),
    Math.abs(data.finalBalance)
  );

  return (
    <div className="bg-white dark:bg-gray-900 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">{title}</h3>
      <div className="flex items-end justify-around gap-4 h-64">
        {steps.map((step, index) => {
          const height = (Math.abs(step.value) / maxValue) * 100;
          const isNegative = step.isNegative || step.value < 0;
          
          return (
            <div key={index} className="flex flex-col items-center flex-1">
              <div className="text-xs font-semibold mb-2 text-gray-900 dark:text-white">
                {formatCurrency(Math.abs(step.value))}
              </div>
              <div 
                className={`w-full rounded-t-lg transition-all ${
                  step.isBase ? 'bg-blue-500' :
                  step.isPositive ? 'bg-green-500' :
                  step.isNegative ? 'bg-red-500' :
                  step.isFinal ? (step.value >= 0 ? 'bg-green-600' : 'bg-red-600') :
                  'bg-gray-400'
                }`}
                style={{ height: `${height}%` }}
              />
              <div className="text-xs mt-2 text-center font-medium text-gray-700 dark:text-gray-300">
                {step.label}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-500 rounded"></div>
          <span className="text-gray-600 dark:text-gray-400">Entrada</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-500 rounded"></div>
          <span className="text-gray-600 dark:text-gray-400">Saída</span>
        </div>
      </div>
    </div>
  );
}
