'use client';

import { Family } from '@/lib/hooks/useFamily';

interface FamilySelectorProps {
  families: Family[] | undefined;
  selectedFamilyId: string | null;
  onSelectFamily: (familyId: string) => void;
  compact?: boolean;
}

export default function FamilySelector({ families, selectedFamilyId, onSelectFamily, compact = false }: FamilySelectorProps) {
  if (!families || families.length === 0) {
    return (
      <p className="text-gray-500 dark:text-gray-400 text-center py-8">
        Nenhuma família criada ainda
      </p>
    );
  }

  // Compact mode for navbar
  if (compact) {
    const selectedFamily = families.find(f => f.id === selectedFamilyId);
    
    return (
      <div className="relative group">
        <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
          <span className="text-sm font-medium truncate max-w-[150px]">
            {selectedFamily?.name || 'Selecionar família'}
          </span>
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
          <div className="p-2 space-y-1">
            {families.map((family) => (
              <button
                key={family.id}
                onClick={() => onSelectFamily(family.id)}
                className={`w-full p-2 rounded text-left transition-colors ${
                  selectedFamilyId === family.id
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100'
                }`}
              >
                <div className="font-medium text-sm truncate">{family.name}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {family.members.length} membro(s)
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
      {families.map((family) => (
        <button
          key={family.id}
          onClick={() => onSelectFamily(family.id)}
          className={`p-3 sm:p-4 rounded-lg border-2 text-left transition-colors ${
            selectedFamilyId === family.id
              ? 'border-blue-600 bg-blue-50 dark:bg-blue-950'
              : 'border-gray-200 dark:border-gray-700 hover:border-blue-400'
          }`}
        >
          <h3 className="font-semibold text-base sm:text-lg text-black dark:text-white">
            {family.name}
          </h3>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
            {family.members.length} membro(s)
          </p>
        </button>
      ))}
    </div>
  );
}
