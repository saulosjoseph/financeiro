'use client';

import { PeriodType } from '@/lib/utils/dateAnalysis';

interface PeriodSelectorProps {
  selectedPeriod: PeriodType;
  onSelectPeriod: (period: PeriodType) => void;
}

export default function PeriodSelector({ selectedPeriod, onSelectPeriod }: PeriodSelectorProps) {
  const periods: { value: PeriodType; label: string }[] = [
    { value: 'weekly', label: 'Semanal' },
    { value: 'biweekly', label: 'Quinzenal' },
    { value: 'monthly', label: 'Mensal' },
    { value: 'bimonthly', label: 'Bimestral' },
    { value: 'quarterly', label: 'Trimestral' },
    { value: 'semiannual', label: 'Semestral' },
    { value: 'annual', label: 'Anual' },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {periods.map((period) => (
        <button
          key={period.value}
          onClick={() => onSelectPeriod(period.value)}
          className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
            selectedPeriod === period.value
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          {period.label}
        </button>
      ))}
    </div>
  );
}
