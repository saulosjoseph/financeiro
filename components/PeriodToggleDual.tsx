'use client';

import { PeriodType } from '@/lib/hooks/useEntradas';

interface PeriodToggleDualProps {
  selectedPeriod: PeriodType;
  onPeriodChange: (period: PeriodType) => void;
  countEntradasMes: number;
  countEntradasAno: number;
  countEntradasGeral: number;
  countSaidasMes: number;
  countSaidasAno: number;
  countSaidasGeral: number;
}

export default function PeriodToggleDual({
  selectedPeriod,
  onPeriodChange,
  countEntradasMes,
  countEntradasAno,
  countEntradasGeral,
  countSaidasMes,
  countSaidasAno,
  countSaidasGeral,
}: PeriodToggleDualProps) {
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

  const getBadges = (period: PeriodType) => {
    const counts = {
      mes: { entradas: countEntradasMes, saidas: countSaidasMes },
      ano: { entradas: countEntradasAno, saidas: countSaidasAno },
      geral: { entradas: countEntradasGeral, saidas: countSaidasGeral },
    };

    const { entradas, saidas } = counts[period];

    return (
      <span className="ml-2 inline-flex gap-1">
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
          {entradas}
        </span>
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
          {saidas}
        </span>
      </span>
    );
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
        Mês{getBadges('mes')}
      </button>
      <button
        type="button"
        onClick={() => onPeriodChange('ano')}
        onKeyDown={(e) => handleKeyDown(e, 'ano')}
        aria-pressed={selectedPeriod === 'ano'}
        className={buttonClasses('ano', false, false)}
      >
        Ano{getBadges('ano')}
      </button>
      <button
        type="button"
        onClick={() => onPeriodChange('geral')}
        onKeyDown={(e) => handleKeyDown(e, 'geral')}
        aria-pressed={selectedPeriod === 'geral'}
        className={buttonClasses('geral', false, true)}
      >
        Total{getBadges('geral')}
      </button>
    </div>
  );
}
