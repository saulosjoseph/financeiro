'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useExpenses } from '@/lib/hooks/useExpenses';
import { useTags } from '@/lib/hooks/useTags';
import { useFamily } from '@/lib/hooks/useFamily';
import TagSelector from '@/components/TagSelector';
import Link from 'next/link';

export default function ExpensesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const familyId = searchParams.get('family');

  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [showCreateTag, setShowCreateTag] = useState(false);
  const [tagName, setTagName] = useState('');
  const [tagColor, setTagColor] = useState('#6B7280');
  const [isCreatingTag, setIsCreatingTag] = useState(false);

  const { selectedFamily } = useFamily(familyId);
  const { expenses, totalExpense, mutate: mutateExpenses } = useExpenses(familyId);
  const { tags, mutate: mutateTags } = useTags(familyId);

  useEffect(() => {
    if (!familyId) {
      router.push('/dashboard');
    }
  }, [familyId, router]);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !familyId) return;
    setIsAddingExpense(true);

    try {
      const response = await fetch(`/api/families/${familyId}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(amount),
          description,
          category,
          tagIds: selectedTags,
        }),
      });

      if (response.ok) {
        setAmount('');
        setDescription('');
        setCategory('');
        setSelectedTags([]);
        mutateExpenses();
        alert('Gasto adicionado com sucesso!');
      } else {
        alert('Erro ao adicionar gasto');
      }
    } catch (error) {
      alert('Erro ao adicionar gasto');
    } finally {
      setIsAddingExpense(false);
    }
  };

  const handleCreateTag = async () => {
    if (!tagName.trim() || !familyId) return;
    setIsCreatingTag(true);

    try {
      const response = await fetch(`/api/families/${familyId}/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: tagName, color: tagColor }),
      });

      if (response.ok) {
        setTagName('');
        setTagColor('#6B7280');
        setShowCreateTag(false);
        mutateTags();
        alert('Tag criada com sucesso!');
      } else {
        const error = await response.json();
        alert(error.error || 'Erro ao criar tag');
      }
    } catch (error) {
      alert('Erro ao criar tag');
    } finally {
      setIsCreatingTag(false);
    }
  };

  const toggleTag = (tagId: string) => {
    setSelectedTags(prev =>
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    );
  };

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
        <p className="text-lg">Carregando...</p>
      </div>
    );
  }

  if (!session) {
    router.push('/dashboard');
    return null;
  }

  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-4xl flex-col py-4 sm:py-16 px-4 sm:px-8 bg-white dark:bg-black mx-auto">
        <div className="flex flex-col gap-4 sm:gap-6 w-full">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b pb-4 gap-3">
            <div>
              <Link
                href="/dashboard"
                className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 mb-2 inline-block"
              >
                ← Voltar ao Dashboard
              </Link>
              <h1 className="text-2xl sm:text-3xl font-semibold text-black dark:text-zinc-50">
                💳 Gastos {selectedFamily && `- ${selectedFamily.name}`}
              </h1>
            </div>
            <div className="flex items-center gap-3">
              {session.user?.image && (
                <img
                  src={session.user.image}
                  alt={session.user.name || 'User'}
                  className="w-10 h-10 rounded-full"
                />
              )}
            </div>
          </div>

          {/* Total Expense Card */}
          <div className="bg-gradient-to-r from-red-500 to-rose-600 p-6 rounded-lg text-white">
            <p className="text-sm opacity-90">Gastos Totais</p>
            <p className="text-4xl font-bold mt-2">
              R$ {totalExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>

          {/* Add Expense Form */}
          <form onSubmit={handleAddExpense} className="bg-red-50 dark:bg-red-950 p-4 rounded-lg space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-medium text-base text-black dark:text-zinc-50">Adicionar Novo Gasto</h3>
              <button
                type="button"
                onClick={() => setShowCreateTag(!showCreateTag)}
                className="text-sm text-red-600 dark:text-red-400 hover:underline"
              >
                {showCreateTag ? 'Cancelar' : '+ Nova Tag'}
              </button>
            </div>

            {/* Create Tag Form */}
            {showCreateTag && (
              <div className="bg-white dark:bg-gray-800 p-3 rounded border border-red-200 dark:border-red-800">
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    placeholder="Nome da tag"
                    value={tagName}
                    onChange={(e) => setTagName(e.target.value)}
                    className="flex-1 px-2 py-1.5 text-sm border rounded bg-white dark:bg-gray-700 text-black dark:text-white"
                  />
                  <input
                    type="color"
                    value={tagColor}
                    onChange={(e) => setTagColor(e.target.value)}
                    className="w-16 h-8 border rounded cursor-pointer"
                  />
                  <button
                    type="button"
                    onClick={handleCreateTag}
                    disabled={isCreatingTag || !tagName.trim()}
                    className="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400 whitespace-nowrap"
                  >
                    {isCreatingTag ? 'Criando...' : 'Criar'}
                  </button>
                </div>
              </div>
            )}

            {/* Tag Selector */}
            <TagSelector tags={tags} selectedTags={selectedTags} onToggleTag={toggleTag} />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="number"
                step="0.01"
                placeholder="Valor (R$)"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className="px-3 py-2 text-sm border rounded bg-white dark:bg-gray-800 text-black dark:text-white"
              />
              <input
                type="text"
                placeholder="Categoria (ex: Alimentação)"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="px-3 py-2 text-sm border rounded bg-white dark:bg-gray-800 text-black dark:text-white"
              />
            </div>
            <input
              type="text"
              placeholder="Descrição (opcional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-sm border rounded bg-white dark:bg-gray-800 text-black dark:text-white"
            />
            <button
              type="submit"
              disabled={isAddingExpense}
              className="w-full px-4 py-3 text-base bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400 font-medium"
            >
              {isAddingExpense ? 'Adicionando...' : '+ Adicionar Gasto'}
            </button>
          </form>

          {/* Expenses List */}
          <div>
            <h3 className="font-medium text-base text-black dark:text-zinc-50 mb-3">
              Histórico de Gastos
            </h3>
            <div className="space-y-3">
              {expenses && expenses.length > 0 ? (
                expenses.map((expense) => (
                  <div
                    key={expense.id}
                    className="p-4 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-900"
                  >
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
                      <div className="flex-1 w-full">
                        <div className="flex items-center gap-3">
                          {expense.user.image && (
                            <img
                              src={expense.user.image}
                              alt={expense.user.name || ''}
                              className="w-10 h-10 rounded-full flex-shrink-0"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-lg text-red-700 dark:text-red-400">
                              - R$ {parseFloat(expense.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                              {expense.user.name} • {expense.category || 'Sem categoria'}
                            </p>
                            {/* Tags */}
                            {expense.tags && expense.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {expense.tags.map((expenseTag) => (
                                  <span
                                    key={expenseTag.id}
                                    className="px-2 py-0.5 text-xs rounded-full text-white"
                                    style={{ backgroundColor: expenseTag.tag.color }}
                                  >
                                    {expenseTag.tag.name}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        {expense.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 ml-13">
                            {expense.description}
                          </p>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 ml-13 sm:ml-0 whitespace-nowrap">
                        {new Date(expense.date).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                  Nenhum gasto registrado ainda
                </p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
