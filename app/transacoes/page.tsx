'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useIncomes, Income } from '@/lib/hooks/useIncomes';
import { useExpenses, Expense } from '@/lib/hooks/useExpenses';
import { useFamily } from '@/lib/hooks/useFamily';
import { useTags } from '@/lib/hooks/useTags';
import { formatCurrency as formatCurrencyMask, parseCurrency } from '@/lib/utils/currencyMask';
import Link from 'next/link';

type TransactionType = 'all' | 'income' | 'expense';
type SortBy = 'date' | 'value' | 'description';
type SortOrder = 'asc' | 'desc';
type ChartType = 'none' | 'pie' | 'bar' | 'line';

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
  const [editingItem, setEditingItem] = useState<{type: 'income' | 'expense', item: Income | Expense} | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editSourceOrCategory, setEditSourceOrCategory] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editTags, setEditTags] = useState<string[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedChart, setSelectedChart] = useState<ChartType>('none');

  const { selectedFamily } = useFamily(familyId);
  const { incomes, totalIncome, mutate: mutateIncomes } = useIncomes(familyId);
  const { expenses, totalExpense, mutate: mutateExpenses } = useExpenses(familyId);
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
      type: 'income' | 'expense';
      amount: number;
      description: string;
      sourceOrCategory: string;
      date: string;
      user: any;
      tags: any[];
      item: Income | Expense;
    }> = [];

    // Adicionar rendas
    if (transactionType === 'all' || transactionType === 'income') {
      transactions = transactions.concat(
        (incomes || []).map(income => ({
          id: income.id,
          type: 'income' as const,
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
    if (transactionType === 'all' || transactionType === 'expense') {
      transactions = transactions.concat(
        (expenses || []).map(expense => ({
          id: expense.id,
          type: 'expense' as const,
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
  }, [incomes, expenses, transactionType, selectedTags, startDate, endDate, minValue, maxValue, searchText, sortBy, sortOrder]);

  const toggleTag = (tagId: string) => {
    setSelectedTags(prev =>
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    );
  };

  const handleEdit = (type: 'income' | 'expense', item: Income | Expense) => {
    setEditingItem({ type, item });
    setEditAmount(formatCurrencyMask(item.amount));
    setEditDescription(item.description || '');
    setEditSourceOrCategory(type === 'income' ? (item as Income).source || '' : (item as Expense).category || '');
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
      const endpoint = editingItem.type === 'income' 
        ? `/api/families/${familyId}/incomes`
        : `/api/families/${familyId}/expenses`;

      const body: any = {
        id: editingItem.item.id,
        amount: parseFloat(parseCurrency(editAmount)),
        description: editDescription,
        date: new Date(editDate).toISOString(),
        tagIds: editTags,
      };

      if (editingItem.type === 'income') {
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
        if (editingItem.type === 'income') {
          mutateIncomes();
        } else {
          mutateExpenses();
        }
        handleCancelEdit();
        alert('Atualizado com sucesso!');
      } else {
        alert('Erro ao atualizar');
      }
    } catch (error) {
      alert('Erro ao atualizar');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async (type: 'income' | 'expense', id: string) => {
    if (!familyId || !confirm('Deseja realmente excluir este item?')) return;

    try {
      const endpoint = type === 'income'
        ? `/api/families/${familyId}/incomes?id=${id}`
        : `/api/families/${familyId}/expenses?id=${id}`;

      const response = await fetch(endpoint, {
        method: 'DELETE',
      });

      if (response.ok) {
        if (type === 'income') {
          mutateIncomes();
        } else {
          mutateExpenses();
        }
        alert('Excluído com sucesso!');
      } else {
        alert('Erro ao excluir');
      }
    } catch (error) {
      alert('Erro ao excluir');
    }
  };

  const filteredTotalIncome = filteredTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const filteredTotalExpense = filteredTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const filteredBalance = filteredTotalIncome - filteredTotalExpense;

  // Preparar dados para gráficos
  const chartData = useMemo(() => {
    // Agrupar por categoria/origem
    const groupedData: { [key: string]: { income: number; expense: number } } = {};
    
    filteredTransactions.forEach(t => {
      const key = t.sourceOrCategory || (t.type === 'income' ? 'Sem origem' : 'Sem categoria');
      if (!groupedData[key]) {
        groupedData[key] = { income: 0, expense: 0 };
      }
      if (t.type === 'income') {
        groupedData[key].income += t.amount;
      } else {
        groupedData[key].expense += t.amount;
      }
    });

    return Object.entries(groupedData).map(([label, values]) => ({
      label,
      income: values.income,
      expense: values.expense,
      total: values.income + values.expense,
    }));
  }, [filteredTransactions]);

  // Dados para gráfico de linha (por data)
  const lineChartData = useMemo(() => {
    const dataByDate: { [key: string]: { income: number; expense: number } } = {};
    
    filteredTransactions.forEach(t => {
      const dateKey = new Date(t.date).toLocaleDateString('pt-BR');
      if (!dataByDate[dateKey]) {
        dataByDate[dateKey] = { income: 0, expense: 0 };
      }
      if (t.type === 'income') {
        dataByDate[dateKey].income += t.amount;
      } else {
        dataByDate[dateKey].expense += t.amount;
      }
    });

    return Object.entries(dataByDate)
      .sort((a, b) => {
        const [dayA, monthA, yearA] = a[0].split('/').map(Number);
        const [dayB, monthB, yearB] = b[0].split('/').map(Number);
        return new Date(yearA, monthA - 1, dayA).getTime() - new Date(yearB, monthB - 1, dayB).getTime();
      })
      .map(([date, values]) => ({
        date,
        income: values.income,
        expense: values.expense,
      }));
  }, [filteredTransactions]);

  // Renderizar gráfico de pizza
  const renderPieChart = () => {
    if (chartData.length === 0) return null;
    
    const total = chartData.reduce((sum, item) => sum + item.total, 0);
    let currentAngle = -90;
    
    return (
      <div className="flex flex-col items-center gap-4">
        <svg viewBox="0 0 200 200" className="w-full max-w-md">
          {chartData.map((item, index) => {
            const percentage = (item.total / total) * 100;
            const sliceAngle = (percentage / 100) * 360;
            const endAngle = currentAngle + sliceAngle;
            
            const startX = 100 + 80 * Math.cos((currentAngle * Math.PI) / 180);
            const startY = 100 + 80 * Math.sin((currentAngle * Math.PI) / 180);
            const endX = 100 + 80 * Math.cos((endAngle * Math.PI) / 180);
            const endY = 100 + 80 * Math.sin((endAngle * Math.PI) / 180);
            
            const largeArcFlag = sliceAngle > 180 ? 1 : 0;
            
            const path = `M 100 100 L ${startX} ${startY} A 80 80 0 ${largeArcFlag} 1 ${endX} ${endY} Z`;
            
            const colors = [
              '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
              '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16'
            ];
            
            const slice = (
              <path
                key={index}
                d={path}
                fill={colors[index % colors.length]}
                stroke="white"
                strokeWidth="2"
              />
            );
            
            currentAngle = endAngle;
            return slice;
          })}
        </svg>
        <div className="grid grid-cols-2 gap-2 w-full">
          {chartData.map((item, index) => {
            const colors = [
              '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
              '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16'
            ];
            const percentage = ((item.total / total) * 100).toFixed(1);
            
            return (
              <div key={index} className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: colors[index % colors.length] }}
                />
                <span className="text-xs text-gray-700 dark:text-gray-300">
                  {item.label}: {percentage}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Renderizar gráfico de barras
  const renderBarChart = () => {
    if (chartData.length === 0) return null;
    
    const maxValue = Math.max(...chartData.map(item => Math.max(item.income, item.expense)));
    const barHeight = 40;
    const chartHeight = chartData.length * (barHeight + 10) + 60;
    
    return (
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 600 ${chartHeight}`} className="w-full min-w-[600px]">
          {/* Eixo Y - Labels */}
          {chartData.map((item, index) => (
            <text
              key={`label-${index}`}
              x="5"
              y={index * (barHeight + 10) + barHeight / 2 + 35}
              className="text-xs fill-gray-700 dark:fill-gray-300"
              dominantBaseline="middle"
            >
              {item.label.substring(0, 15)}
            </text>
          ))}
          
          {/* Barras de Rendas */}
          {chartData.map((item, index) => {
            const width = (item.income / maxValue) * 350;
            return (
              <g key={`income-${index}`}>
                <rect
                  x="150"
                  y={index * (barHeight + 10) + 20}
                  width={width}
                  height={barHeight / 2 - 2}
                  fill="#10b981"
                  rx="2"
                />
                <text
                  x={150 + width + 5}
                  y={index * (barHeight + 10) + 20 + barHeight / 4}
                  className="text-xs fill-gray-700 dark:fill-gray-300"
                  dominantBaseline="middle"
                >
                  R$ {item.income.toFixed(2)}
                </text>
              </g>
            );
          })}
          
          {/* Barras de Gastos */}
          {chartData.map((item, index) => {
            const width = (item.expense / maxValue) * 350;
            return (
              <g key={`expense-${index}`}>
                <rect
                  x="150"
                  y={index * (barHeight + 10) + 20 + barHeight / 2}
                  width={width}
                  height={barHeight / 2 - 2}
                  fill="#ef4444"
                  rx="2"
                />
                <text
                  x={150 + width + 5}
                  y={index * (barHeight + 10) + 20 + barHeight / 2 + barHeight / 4}
                  className="text-xs fill-gray-700 dark:fill-gray-300"
                  dominantBaseline="middle"
                >
                  R$ {item.expense.toFixed(2)}
                </text>
              </g>
            );
          })}
        </svg>
        <div className="flex gap-4 justify-center mt-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded" />
            <span className="text-xs text-gray-700 dark:text-gray-300">Rendas</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded" />
            <span className="text-xs text-gray-700 dark:text-gray-300">Gastos</span>
          </div>
        </div>
      </div>
    );
  };

  // Renderizar gráfico de linha
  const renderLineChart = () => {
    if (lineChartData.length === 0) return null;
    
    const maxValue = Math.max(
      ...lineChartData.map(item => Math.max(item.income, item.expense))
    );
    const chartWidth = 600;
    const chartHeight = 300;
    const padding = 50;
    
    const xStep = (chartWidth - 2 * padding) / (lineChartData.length - 1 || 1);
    
    const getY = (value: number) => {
      return chartHeight - padding - ((value / maxValue) * (chartHeight - 2 * padding));
    };
    
    const incomePoints = lineChartData
      .map((item, index) => `${padding + index * xStep},${getY(item.income)}`)
      .join(' ');
    
    const expensePoints = lineChartData
      .map((item, index) => `${padding + index * xStep},${getY(item.expense)}`)
      .join(' ');
    
    return (
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full min-w-[600px]">
          {/* Eixos */}
          <line
            x1={padding}
            y1={chartHeight - padding}
            x2={chartWidth - padding}
            y2={chartHeight - padding}
            stroke="currentColor"
            strokeWidth="1"
            className="text-gray-300 dark:text-gray-700"
          />
          <line
            x1={padding}
            y1={padding}
            x2={padding}
            y2={chartHeight - padding}
            stroke="currentColor"
            strokeWidth="1"
            className="text-gray-300 dark:text-gray-700"
          />
          
          {/* Linha de Rendas */}
          <polyline
            points={incomePoints}
            fill="none"
            stroke="#10b981"
            strokeWidth="2"
          />
          
          {/* Linha de Gastos */}
          <polyline
            points={expensePoints}
            fill="none"
            stroke="#ef4444"
            strokeWidth="2"
          />
          
          {/* Pontos */}
          {lineChartData.map((item, index) => (
            <g key={index}>
              <circle
                cx={padding + index * xStep}
                cy={getY(item.income)}
                r="4"
                fill="#10b981"
              />
              <circle
                cx={padding + index * xStep}
                cy={getY(item.expense)}
                r="4"
                fill="#ef4444"
              />
            </g>
          ))}
          
          {/* Labels do eixo X */}
          {lineChartData.map((item, index) => (
            <text
              key={`label-${index}`}
              x={padding + index * xStep}
              y={chartHeight - padding + 20}
              className="text-xs fill-gray-700 dark:fill-gray-300"
              textAnchor="middle"
            >
              {item.date.substring(0, 5)}
            </text>
          ))}
        </svg>
        <div className="flex gap-4 justify-center mt-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded" />
            <span className="text-xs text-gray-700 dark:text-gray-300">Rendas</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded" />
            <span className="text-xs text-gray-700 dark:text-gray-300">Gastos</span>
          </div>
        </div>
      </div>
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
                  onClick={() => setTransactionType('income')}
                  className={`px-4 py-2 text-sm rounded ${
                    transactionType === 'income'
                      ? 'bg-green-600 text-white'
                      : 'bg-white dark:bg-gray-800 text-black dark:text-white border'
                  }`}
                >
                  Rendas
                </button>
                <button
                  onClick={() => setTransactionType('expense')}
                  className={`px-4 py-2 text-sm rounded ${
                    transactionType === 'expense'
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

          {/* Seletor de Gráficos */}
          <div className="bg-purple-50 dark:bg-purple-950 p-4 rounded-lg border border-purple-200 dark:border-purple-900">
            <h3 className="font-medium text-base text-black dark:text-zinc-50 mb-3">
              Visualização em Gráficos
            </h3>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setSelectedChart('none')}
                className={`px-4 py-2 text-sm rounded ${
                  selectedChart === 'none'
                    ? 'bg-purple-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-black dark:text-white border'
                }`}
              >
                Sem Gráfico
              </button>
              <button
                onClick={() => setSelectedChart('pie')}
                className={`px-4 py-2 text-sm rounded ${
                  selectedChart === 'pie'
                    ? 'bg-purple-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-black dark:text-white border'
                }`}
              >
                📊 Gráfico de Pizza
              </button>
              <button
                onClick={() => setSelectedChart('bar')}
                className={`px-4 py-2 text-sm rounded ${
                  selectedChart === 'bar'
                    ? 'bg-purple-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-black dark:text-white border'
                }`}
              >
                📊 Gráfico de Barras
              </button>
              <button
                onClick={() => setSelectedChart('line')}
                className={`px-4 py-2 text-sm rounded ${
                  selectedChart === 'line'
                    ? 'bg-purple-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-black dark:text-white border'
                }`}
              >
                📈 Gráfico de Linha
              </button>
            </div>
          </div>

          {/* Renderizar Gráfico Selecionado */}
          {selectedChart !== 'none' && (
            <div className="bg-white dark:bg-gray-900 p-6 rounded-lg border border-gray-200 dark:border-gray-800">
              <h3 className="font-medium text-lg text-black dark:text-zinc-50 mb-4">
                {selectedChart === 'pie' && 'Gráfico de Pizza - Distribuição por Categoria/Origem'}
                {selectedChart === 'bar' && 'Gráfico de Barras - Comparação por Categoria/Origem'}
                {selectedChart === 'line' && 'Gráfico de Linha - Evolução no Tempo'}
              </h3>
              {filteredTransactions.length > 0 ? (
                <>
                  {selectedChart === 'pie' && renderPieChart()}
                  {selectedChart === 'bar' && renderBarChart()}
                  {selectedChart === 'line' && renderLineChart()}
                </>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                  Nenhum dado disponível para exibir o gráfico
                </p>
              )}
            </div>
          )}

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
                      transaction.type === 'income'
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
                              {transaction.type === 'income' ? 'Origem' : 'Categoria'}
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
                                transaction.type === 'income'
                                  ? 'text-green-700 dark:text-green-400'
                                  : 'text-red-700 dark:text-red-400'
                              }`}>
                                {transaction.type === 'expense' ? '- ' : ''}R$ {transaction.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                                {transaction.user.name} • {transaction.sourceOrCategory || (transaction.type === 'income' ? 'Sem origem' : 'Sem categoria')}
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
