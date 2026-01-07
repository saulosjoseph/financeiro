'use client';

import { formatCurrency } from '@/lib/utils/dateAnalysis';

interface HeatmapChartProps {
  data: Array<{
    dayOfWeek: string;
    hour: number;
    amount: number;
    count: number;
  }>;
  title: string;
}

const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export default function HeatmapChart({ data, title }: HeatmapChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-900 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">{title}</h3>
        <p className="text-gray-500 dark:text-gray-400 text-center py-8">Nenhum dado disponível</p>
      </div>
    );
  }

  const maxAmount = Math.max(...data.map(d => d.amount));

  const getColor = (amount: number) => {
    if (amount === 0) return 'bg-gray-100 dark:bg-gray-800';
    const intensity = (amount / maxAmount) * 100;
    if (intensity < 20) return 'bg-red-200 dark:bg-red-900';
    if (intensity < 40) return 'bg-red-300 dark:bg-red-800';
    if (intensity < 60) return 'bg-red-400 dark:bg-red-700';
    if (intensity < 80) return 'bg-red-500 dark:bg-red-600';
    return 'bg-red-600 dark:bg-red-500';
  };

  const getValue = (day: string, hour: number) => {
    return data.find(d => d.dayOfWeek === day && d.hour === hour);
  };

  return (
    <div className="bg-white dark:bg-gray-900 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">{title}</h3>
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          <div className="grid grid-cols-[auto_repeat(24,_minmax(0,_1fr))] gap-1">
            {/* Header */}
            <div className="text-xs font-medium text-gray-600 dark:text-gray-400"></div>
            {HOURS.map(hour => (
              <div key={hour} className="text-xs text-center font-medium text-gray-600 dark:text-gray-400">
                {hour}h
              </div>
            ))}
            
            {/* Rows */}
            {DAYS.map(day => (
              <>
                <div key={`day-${day}`} className="text-xs font-medium text-gray-600 dark:text-gray-400 flex items-center pr-2">
                  {day}
                </div>
                {HOURS.map(hour => {
                  const value = getValue(day, hour);
                  return (
                    <div
                      key={`${day}-${hour}`}
                      className={`aspect-square rounded ${getColor(value?.amount || 0)} cursor-pointer hover:opacity-80 transition-opacity`}
                      title={`${day} ${hour}h: ${value ? `${formatCurrency(value.amount)} (${value.count} transações)` : 'Sem gastos'}`}
                    />
                  );
                })}
              </>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
        <span>Menos</span>
        <div className="flex gap-1">
          <div className="w-4 h-4 bg-gray-100 dark:bg-gray-800 rounded"></div>
          <div className="w-4 h-4 bg-red-200 dark:bg-red-900 rounded"></div>
          <div className="w-4 h-4 bg-red-400 dark:bg-red-700 rounded"></div>
          <div className="w-4 h-4 bg-red-600 dark:bg-red-500 rounded"></div>
        </div>
        <span>Mais</span>
      </div>
    </div>
  );
}
