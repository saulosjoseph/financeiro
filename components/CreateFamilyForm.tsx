'use client';

import { useState } from 'react';

interface CreateFamilyFormProps {
  onSuccess: () => void;
}

export default function CreateFamilyForm({ onSuccess }: CreateFamilyFormProps) {
  const [familyName, setFamilyName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!familyName.trim()) return;
    setIsCreating(true);

    try {
      const response = await fetch('/api/families', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: familyName }),
      });

      if (response.ok) {
        setFamilyName('');
        onSuccess();
      } else {
        alert('Erro ao criar família');
      }
    } catch (error) {
      alert('Erro ao criar família');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-blue-50 dark:bg-blue-950 p-3 sm:p-4 rounded-lg">
      <h3 className="font-medium text-sm sm:text-base text-black dark:text-zinc-50 mb-3">
        Criar Nova Família
      </h3>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          placeholder="Nome da família"
          value={familyName}
          onChange={(e) => setFamilyName(e.target.value)}
          required
          className="flex-1 px-3 py-2 text-sm sm:text-base border rounded bg-white dark:bg-gray-800 text-black dark:text-white"
        />
        <button
          type="submit"
          disabled={isCreating}
          className="px-4 sm:px-6 py-2 text-sm sm:text-base bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 whitespace-nowrap"
        >
          {isCreating ? 'Criando...' : 'Criar'}
        </button>
      </div>
    </form>
  );
}
