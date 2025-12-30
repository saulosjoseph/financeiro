'use client';

import { PeriodType } from '@/lib/hooks/useEntradas';

interface PeriodToggleProps {
  selectedPeriod: PeriodType;
  onPeriodChange: (period: PeriodType) => void;
  countMes: number;
  countAno: number;
  countGeral: number;
}

export default function PeriodToggle({
  selectedPeriod,
  onPeriodChange,
  countMes,
  countAno,
  countGeral,
}: PeriodToggleProps) {
  const handleKeyDown = (e: React.KeyboardEvent, currentPeriod: PeriodType) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (currentPeriod === 'ano') onPeriodChange('mes');
      else if (currentPeriod === 'geral') onPeriodChange('ano');
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      if (currentPeriod === 'mes') onPeriodChange('ano');
      else if (currentPeriod === 'ano') onPeriodChange('geral');
    }
  };

  const buttonClasses = (period: PeriodType, isFirst: boolean, isLast: boolean) => {
    const baseClasses = 'px-4 py-2 text-sm font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:z-10';
    const positionClasses = isFirst ? 'rounded-l-lg' : isLast ? 'rounded-r-lg -ml-px' : '-ml-px';
    const activeClasses = selectedPeriod === period
      ? 'bg-purple-600 text-white border-purple-600 hover:bg-purple-700'
      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700';
    
    return `${baseClasses} ${positionClasses} ${activeClasses}`;
  };

  return (
    <div role="group" aria-label="Selecionar período" className="inline-flex">
      <button
        type="button"
        onClick={() => onPeriodChange('mes')}
        onKeyDown={(e) => handleKeyDown(e, 'mes')}
        aria-pressed={selectedPeriod === 'mes'}
        className={buttonClasses('mes', true, false)}
      >
        Mês <span className="ml-1 text-xs opacity-75">({countMes})</span>
      </button>
      <button
        type="button"
        onClick={() => onPeriodChange('ano')}
        onKeyDown={(e) => handleKeyDown(e, 'ano')}
        aria-pressed={selectedPeriod === 'ano'}
        className={buttonClasses('ano', false, false)}
      >
        Ano <span className="ml-1 text-xs opacity-75">({countAno})</span>
      </button>
      <button
        type="button"
        onClick={() => onPeriodChange('geral')}
        onKeyDown={(e) => handleKeyDown(e, 'geral')}
        aria-pressed={selectedPeriod === 'geral'}
        className={buttonClasses('geral', false, true)}
      >
        Total <span className="ml-1 text-xs opacity-75">({countGeral})</span>
      </button>
    </div>
  );
}
