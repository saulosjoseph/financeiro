'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useEntradas, Entrada } from '@/lib/hooks/useEntradas';
import { useSaidas, Saida } from '@/lib/hooks/useSaidas';
import { useFamily } from '@/lib/hooks/useFamily';
import { useTags } from '@/lib/hooks/useTags';
import { formatCurrency as formatCurrencyMask, parseCurrency } from '@/lib/utils/currencyMask';
import Link from 'next/link';
import { toast } from 'sonner';

type TransactionType = 'all' | 'entrada' | 'saida';
type SortBy = 'date' | 'value' | 'description';
type SortOrder = 'asc' | 'desc';

function TransactionsContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const familyId = searchParams.get('family');

  const [transactionType, setTransactionType] = useState<TransactionType>('all');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [minValue, setMinValue] = useState('');
  const [maxValue, setMaxValue] = useState('');
  const [searchText, setSearchText] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [editingItem, setEditingItem] = useState<{type: 'entrada' | 'saida', item: Entrada | Saida} | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editSourceOrCategory, setEditSourceOrCategory] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editTags, setEditTags] = useState<string[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);

  const { selectedFamily } = useFamily(familyId);
  const { entradas, totalGeral: totalIncome, mutate: mutateIncomes } = useEntradas(familyId);
  const { saidas, totalGeral: totalExpense, mutate: mutateExpenses } = useSaidas(familyId);
  const { tags } = useTags(familyId);

  useEffect(() => {
    if (!familyId) {
      router.push('/dashboard');
    }
  }, [familyId, router]);

  const balance = totalIncome - totalExpense;

  // Filtrar e ordenar transações
  const filteredTransactions = useMemo(() => {
    let transactions: Array<{
      id: string;
      type: 'entrada' | 'saida';
      amount: number;
      description: string;
      sourceOrCategory: string;
      date: string;
      user: any;
      tags: any[];
      item: Entrada | Saida;
    }> = [];

    // Adicionar rendas
    if (transactionType === 'all' || transactionType === 'entrada') {
      transactions = transactions.concat(
        (entradas || []).map(income => ({
          id: income.id,
          type: 'entrada' as const,
          amount: parseFloat(income.amount),
          description: income.description || '',
          sourceOrCategory: income.source || '',
          date: income.date,
          user: income.user,
          tags: income.tags.map(t => t.tag),
          item: income,
        }))
      );
    }

    // Adicionar gastos
    if (transactionType === 'all' || transactionType === 'saida') {
      transactions = transactions.concat(
        (saidas || []).map(expense => ({
          id: expense.id,
          type: 'saida' as const,
          amount: parseFloat(expense.amount),
          description: expense.description || '',
          sourceOrCategory: expense.category || '',
          date: expense.date,
          user: expense.user,
          tags: expense.tags.map(t => t.tag),
          item: expense,
        }))
      );
    }

    // Aplicar filtros
    transactions = transactions.filter(t => {
      // Filtro por tags
      if (selectedTags.length > 0) {
        const hasTag = t.tags.some(tag => selectedTags.includes(tag.id));
        if (!hasTag) return false;
      }

      // Filtro por data
      if (startDate) {
        if (new Date(t.date) < new Date(startDate)) return false;
      }
      if (endDate) {
        if (new Date(t.date) > new Date(endDate)) return false;
      }

      // Filtro por valor
      if (minValue) {
        const min = parseFloat(parseCurrency(minValue));
        if (t.amount < min) return false;
      }
      if (maxValue) {
        const max = parseFloat(parseCurrency(maxValue));
        if (t.amount > max) return false;
      }

      // Filtro por texto (busca em descrição e origem/categoria)
      if (searchText) {
        const search = searchText.toLowerCase();
        const matchDescription = t.description.toLowerCase().includes(search);
        const matchSource = t.sourceOrCategory.toLowerCase().includes(search);
        if (!matchDescription && !matchSource) return false;
      }

      return true;
    });

    // Ordenar
    transactions.sort((a, b) => {
      let comparison = 0;
      
      if (sortBy === 'date') {
        comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
      } else if (sortBy === 'value') {
        comparison = a.amount - b.amount;
      } else if (sortBy === 'description') {
        comparison = a.description.localeCompare(b.description);
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return transactions;
  }, [entradas, saidas, transactionType, selectedTags, startDate, endDate, minValue, maxValue, searchText, sortBy, sortOrder]);

  const toggleTag = (tagId: string) => {
    setSelectedTags(prev =>
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    );
  };

  const handleEdit = (type: 'entrada' | 'saida', item: Entrada | Saida) => {
    setEditingItem({ type, item });
    setEditAmount(formatCurrencyMask(item.amount));
    setEditDescription(item.description || '');
    setEditSourceOrCategory(type === 'entrada' ? (item as Entrada).source || '' : (item as Saida).category || '');
    setEditDate(new Date(item.date).toISOString().split('T')[0]);
    setEditTags(item.tags.map(t => t.tag.id));
  };

  const handleCancelEdit = () => {
    setEditingItem(null);
    setEditAmount('');
    setEditDescription('');
    setEditSourceOrCategory('');
    setEditDate('');
    setEditTags([]);
  };

  const handleSaveEdit = async () => {
    if (!editingItem || !familyId) return;
    setIsUpdating(true);

    try {
      const endpoint = editingItem.type === 'entrada' 
        ? `/api/families/${familyId}/entradas`
        : `/api/families/${familyId}/saidas`;

      const body: any = {
        id: editingItem.item.id,
        amount: parseFloat(parseCurrency(editAmount)),
        description: editDescription,
        date: new Date(editDate).toISOString(),
        tagIds: editTags,
      };

      if (editingItem.type === 'entrada') {
        body.source = editSourceOrCategory;
      } else {
        body.category = editSourceOrCategory;
      }

      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        if (editingItem.type === 'entrada') {
          mutateIncomes();
        } else {
          mutateExpenses();
        }
        handleCancelEdit();
        toast.success('Atualizado com sucesso!');
      } else {
        toast.error('Erro ao atualizar');
      }
    } catch (error) {
      toast.error('Erro ao atualizar');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async (type: 'entrada' | 'saida', id: string) => {
    if (!familyId || !confirm('Deseja realmente excluir este item?')) return;

    try {
      const endpoint = type === 'entrada'
        ? `/api/families/${familyId}/entradas?id=${id}`
        : `/api/families/${familyId}/saidas?id=${id}`;

      const response = await fetch(endpoint, {
        method: 'DELETE',
      });

      if (response.ok) {
        if (type === 'entrada') {
          mutateIncomes();
        } else {
          mutateExpenses();
        }
        toast.success('Excluído com sucesso!');
      } else {
        toast.error('Erro ao excluir');
      }
    } catch (error) {
      toast.error('Erro ao excluir');
    }
  };

  const filteredTotalIncome = filteredTransactions
    .filter(t => t.type === 'entrada')
    .reduce((sum, t) => sum + t.amount, 0);

  const filteredTotalExpense = filteredTransactions
    .filter(t => t.type === 'saida')
    .reduce((sum, t) => sum + t.amount, 0);

  const filteredBalance = filteredTotalIncome - filteredTotalExpense;

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
      <main className="flex min-h-screen w-full max-w-6xl flex-col py-4 sm:py-16 px-4 sm:px-8 bg-white dark:bg-black mx-auto">
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
                📋 Detalhamento de Transações {selectedFamily && `- ${selectedFamily.name}`}
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

          {/* Filtros */}
          <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg space-y-4">
            <h3 className="font-medium text-base text-black dark:text-zinc-50">Filtros</h3>
            
            {/* Tipo de Transação */}
            <div>
              <label className="text-xs text-gray-700 dark:text-gray-300 mb-2 block">
                Tipo de Transação
              </label>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setTransactionType('all')}
                  className={`px-4 py-2 text-sm rounded ${
                    transactionType === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white dark:bg-gray-800 text-black dark:text-white border'
                  }`}
                >
                  Todas
                </button>
                <button
                  onClick={() => setTransactionType('entrada')}
                  className={`px-4 py-2 text-sm rounded ${
                    transactionType === 'entrada'
                      ? 'bg-green-600 text-white'
                      : 'bg-white dark:bg-gray-800 text-black dark:text-white border'
                  }`}
                >
                  Rendas
                </button>
                <button
                  onClick={() => setTransactionType('saida')}
                  className={`px-4 py-2 text-sm rounded ${
                    transactionType === 'saida'
                      ? 'bg-red-600 text-white'
                      : 'bg-white dark:bg-gray-800 text-black dark:text-white border'
                  }`}
                >
                  Gastos
                </button>
              </div>
            </div>

            {/* Tags */}
            {tags && tags.length > 0 && (
              <div>
                <label className="text-xs text-gray-700 dark:text-gray-300 mb-2 block">
                  Filtrar por Tags
                </label>
                <div className="flex flex-wrap gap-2">
                  {tags.map(tag => (
                    <button
                      key={tag.id}
                      onClick={() => toggleTag(tag.id)}
                      className={`px-3 py-1.5 text-sm rounded-full transition-all ${
                        selectedTags.includes(tag.id)
                          ? 'ring-2 ring-offset-2 ring-blue-500'
                          : 'opacity-70 hover:opacity-100'
                      }`}
                      style={{ 
                        backgroundColor: tag.color,
                        color: 'white'
                      }}
                    >
                      {tag.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Data e Valor */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-700 dark:text-gray-300 mb-1 block">
                  Data Inicial
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border rounded bg-white dark:bg-gray-800 text-black dark:text-white"
                />
              </div>
              <div>
                <label className="text-xs text-gray-700 dark:text-gray-300 mb-1 block">
                  Data Final
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border rounded bg-white dark:bg-gray-800 text-black dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-700 dark:text-gray-300 mb-1 block">
                  Valor Mínimo
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="R$ 0,00"
                  value={minValue}
                  onChange={(e) => setMinValue(formatCurrencyMask(e.target.value))}
                  className="w-full px-3 py-2 text-sm border rounded bg-white dark:bg-gray-800 text-black dark:text-white"
                />
              </div>
              <div>
                <label className="text-xs text-gray-700 dark:text-gray-300 mb-1 block">
                  Valor Máximo
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="R$ 0,00"
                  value={maxValue}
                  onChange={(e) => setMaxValue(formatCurrencyMask(e.target.value))}
                  className="w-full px-3 py-2 text-sm border rounded bg-white dark:bg-gray-800 text-black dark:text-white"
                />
              </div>
            </div>

            {/* Busca por texto */}
            <div>
              <label className="text-xs text-gray-700 dark:text-gray-300 mb-1 block">
                Buscar por Descrição ou Origem/Categoria
              </label>
              <input
                type="text"
                placeholder="Digite para buscar..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="w-full px-3 py-2 text-sm border rounded bg-white dark:bg-gray-800 text-black dark:text-white"
              />
            </div>

            {/* Ordenação */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-700 dark:text-gray-300 mb-1 block">
                  Ordenar Por
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortBy)}
                  className="w-full px-3 py-2 text-sm border rounded bg-white dark:bg-gray-800 text-black dark:text-white"
                >
                  <option value="date">Data</option>
                  <option value="value">Valor</option>
                  <option value="description">Descrição</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-700 dark:text-gray-300 mb-1 block">
                  Ordem
                </label>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as SortOrder)}
                  className="w-full px-3 py-2 text-sm border rounded bg-white dark:bg-gray-800 text-black dark:text-white"
                >
                  <option value="desc">Decrescente</option>
                  <option value="asc">Crescente</option>
                </select>
              </div>
            </div>

            {/* Botão limpar filtros */}
            <button
              onClick={() => {
                setSelectedTags([]);
                setStartDate('');
                setEndDate('');
                setMinValue('');
                setMaxValue('');
                setSearchText('');
                setTransactionType('all');
              }}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              Limpar Filtros
            </button>
          </div>

          {/* Totais Filtrados */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg border border-green-200 dark:border-green-900">
              <p className="text-xs text-green-900 dark:text-green-100 mb-1">Rendas Filtradas</p>
              <p className="text-xl font-bold text-green-700 dark:text-green-400">
                R$ {filteredTotalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-red-50 dark:bg-red-950 p-4 rounded-lg border border-red-200 dark:border-red-900">
              <p className="text-xs text-red-900 dark:text-red-100 mb-1">Gastos Filtrados</p>
              <p className="text-xl font-bold text-red-700 dark:text-red-400">
                R$ {filteredTotalExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className={`p-4 rounded-lg border ${
              filteredBalance >= 0
                ? 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-900'
                : 'bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-900'
            }`}>
              <p className={`text-xs mb-1 ${
                filteredBalance >= 0
                  ? 'text-blue-900 dark:text-blue-100'
                  : 'text-orange-900 dark:text-orange-100'
              }`}>
                Saldo Filtrado
              </p>
              <p className={`text-xl font-bold ${
                filteredBalance >= 0
                  ? 'text-blue-700 dark:text-blue-400'
                  : 'text-orange-700 dark:text-orange-400'
              }`}>
                R$ {filteredBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          {/* Lista de Transações */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-medium text-base text-black dark:text-zinc-50">
                Transações ({filteredTransactions.length})
              </h3>
            </div>
            
            <div className="space-y-2">
              {filteredTransactions.length > 0 ? (
                filteredTransactions.map((transaction) => (
                  <div
                    key={`${transaction.type}-${transaction.id}`}
                    className={`p-4 rounded-lg border ${
                      transaction.type === 'entrada'
                        ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-900'
                        : 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-900'
                    }`}
                  >
                    {editingItem?.item.id === transaction.id ? (
                      // Modo de Edição
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs text-gray-700 dark:text-gray-300 mb-1 block">
                              Valor
                            </label>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={editAmount}
                              onChange={(e) => setEditAmount(formatCurrencyMask(e.target.value))}
                              className="w-full px-3 py-2 text-sm border rounded bg-white dark:bg-gray-800 text-black dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-700 dark:text-gray-300 mb-1 block">
                              {transaction.type === 'entrada' ? 'Origem' : 'Categoria'}
                            </label>
                            <input
                              type="text"
                              value={editSourceOrCategory}
                              onChange={(e) => setEditSourceOrCategory(e.target.value)}
                              className="w-full px-3 py-2 text-sm border rounded bg-white dark:bg-gray-800 text-black dark:text-white"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-xs text-gray-700 dark:text-gray-300 mb-1 block">
                            Descrição
                          </label>
                          <input
                            type="text"
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            className="w-full px-3 py-2 text-sm border rounded bg-white dark:bg-gray-800 text-black dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-700 dark:text-gray-300 mb-1 block">
                            Data
                          </label>
                          <input
                            type="date"
                            value={editDate}
                            onChange={(e) => setEditDate(e.target.value)}
                            className="w-full px-3 py-2 text-sm border rounded bg-white dark:bg-gray-800 text-black dark:text-white"
                          />
                        </div>
                        {tags && tags.length > 0 && (
                          <div>
                            <label className="text-xs text-gray-700 dark:text-gray-300 mb-2 block">
                              Tags
                            </label>
                            <div className="flex flex-wrap gap-2">
                              {tags.map(tag => (
                                <button
                                  key={tag.id}
                                  type="button"
                                  onClick={() => {
                                    setEditTags(prev =>
                                      prev.includes(tag.id)
                                        ? prev.filter(id => id !== tag.id)
                                        : [...prev, tag.id]
                                    );
                                  }}
                                  className={`px-3 py-1.5 text-sm rounded-full transition-all ${
                                    editTags.includes(tag.id)
                                      ? 'ring-2 ring-offset-2 ring-blue-500'
                                      : 'opacity-70 hover:opacity-100'
                                  }`}
                                  style={{ 
                                    backgroundColor: tag.color,
                                    color: 'white'
                                  }}
                                >
                                  {tag.name}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="flex gap-2">
                          <button
                            onClick={handleSaveEdit}
                            disabled={isUpdating}
                            className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
                          >
                            {isUpdating ? 'Salvando...' : 'Salvar'}
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            disabled={isUpdating}
                            className="px-4 py-2 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 disabled:bg-gray-400"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      // Modo de Visualização
                      <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
                        <div className="flex-1 w-full">
                          <div className="flex items-center gap-3">
                            {transaction.user.image && (
                              <img
                                src={transaction.user.image}
                                alt={transaction.user.name || ''}
                                className="w-10 h-10 rounded-full flex-shrink-0"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className={`font-semibold text-lg ${
                                transaction.type === 'entrada'
                                  ? 'text-green-700 dark:text-green-400'
                                  : 'text-red-700 dark:text-red-400'
                              }`}>
                                {transaction.type === 'saida' ? '- ' : ''}R$ {transaction.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                                {transaction.user.name} • {transaction.sourceOrCategory || (transaction.type === 'entrada' ? 'Sem origem' : 'Sem categoria')}
                              </p>
                              {transaction.description && (
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                  {transaction.description}
                                </p>
                              )}
                              {transaction.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {transaction.tags.map((tag) => (
                                    <span
                                      key={tag.id}
                                      className="px-2 py-0.5 text-xs rounded-full text-white"
                                      style={{ backgroundColor: tag.color }}
                                    >
                                      {tag.name}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <p className="text-xs text-gray-500 whitespace-nowrap">
                            {new Date(transaction.date).toLocaleDateString('pt-BR')}
                          </p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEdit(transaction.type, transaction.item)}
                              className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                            >
                              ✏️ Editar
                            </button>
                            <button
                              onClick={() => handleDelete(transaction.type, transaction.id)}
                              className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                            >
                              🗑️ Excluir
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                  Nenhuma transação encontrada com os filtros aplicados
                </p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function TransactionsPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
        <p className="text-lg">Carregando...</p>
      </div>
    }>
      <TransactionsContent />
    </Suspense>
  );
}
