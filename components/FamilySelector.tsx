'use client';

import { Family } from '@/lib/hooks/useFamily';

interface FamilySelectorProps {
  families: Family[] | undefined;
  selectedFamilyId: string | null;
  onSelectFamily: (familyId: string) => void;
}

export default function FamilySelector({ families, selectedFamilyId, onSelectFamily }: FamilySelectorProps) {
  if (!families || families.length === 0) {
    return (
      <p className="text-gray-500 dark:text-gray-400 text-center py-8">
        Nenhuma família criada ainda
      </p>
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
