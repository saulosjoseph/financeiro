'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSaidas, PeriodType } from '@/lib/hooks/useSaidas';
import { useTags } from '@/lib/hooks/useTags';
import { useFamily } from '@/lib/hooks/useFamily';
import TagSelector from '@/components/TagSelector';
import PeriodToggle from '@/components/PeriodToggle';
import Link from 'next/link';
import { formatCurrency, parseCurrency } from '@/lib/utils/currencyMask';

function SaidasContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const familyId = searchParams.get('family');

  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringType, setRecurringType] = useState<string>('monthly');
  const [recurringDay, setRecurringDay] = useState<number>(new Date().getDate());
  const [recurringEndDate, setRecurringEndDate] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isAddingSaida, setIsAddingSaida] = useState(false);
  const [showCreateTag, setShowCreateTag] = useState(false);
  const [tagName, setTagName] = useState('');
  const [tagColor, setTagColor] = useState('#6B7280');
  const [isCreatingTag, setIsCreatingTag] = useState(false);
  const [periodo, setPeriodo] = useState<PeriodType>('mes');

  const { selectedFamily } = useFamily(familyId);
  const { 
    saidas, 
    totalMes, 
    totalAno, 
    totalGeral, 
    countMes, 
    countAno, 
    countGeral, 
    getPeriodLabel, 
    getFilteredData, 
    mutate: mutateSaidas 
  } = useSaidas(familyId);
  const { tags, mutate: mutateTags } = useTags(familyId);

  useEffect(() => {
    if (!familyId) {
      router.push('/dashboard');
    }
  }, [familyId, router]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCurrency(e.target.value);
    setAmount(formatted);
  };

  const handleAddSaida = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !familyId) return;
    setIsAddingSaida(true);

    try {
      const response = await fetch(`/api/families/${familyId}/saidas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(parseCurrency(amount)),
          description,
          category,
          date: new Date(date).toISOString(),
          isRecurring,
          recurringType: isRecurring ? recurringType : undefined,
          recurringDay: isRecurring ? recurringDay : undefined,
          recurringEndDate: isRecurring && recurringEndDate ? new Date(recurringEndDate).toISOString() : undefined,
          tagIds: selectedTags,
        }),
      });

      if (response.ok) {
        setAmount('');
        setDescription('');
        setCategory('');
        setDate(new Date().toISOString().split('T')[0]);
        setIsRecurring(false);
        setRecurringType('monthly');
        setRecurringDay(new Date().getDate());
        setRecurringEndDate('');
        setSelectedTags([]);
        mutateSaidas();
        alert('Saída adicionada com sucesso!');
      } else {
        alert('Erro ao adicionar saída');
      }
    } catch (error) {
      alert('Erro ao adicionar saída');
    } finally {
      setIsAddingSaida(false);
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

  const getTotalByPeriod = () => {
    return periodo === 'mes' ? totalMes : periodo === 'ano' ? totalAno : totalGeral;
  };

  const getPeriodTitle = () => {
    return periodo === 'mes' ? 'Saída Familiar do Mês' : periodo === 'ano' ? 'Saída Familiar do Ano' : 'Saída Familiar Total';
  };

  const getEmptyMessage = () => {
    if (periodo === 'geral') return 'Nenhuma saída registrada ainda';
    return `Nenhuma saída registrada em ${getPeriodLabel(periodo)}`;
  };

  const filteredSaidas = getFilteredData(periodo);

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
                💳 Saídas {selectedFamily && `- ${selectedFamily.name}`}
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

          {/* Period Toggle */}
          <div className="flex justify-center">
            <PeriodToggle
              selectedPeriod={periodo}
              onPeriodChange={setPeriodo}
              countMes={countMes}
              countAno={countAno}
              countGeral={countGeral}
            />
          </div>

          {/* Total Card */}
          <div className="bg-gradient-to-r from-red-500 to-rose-600 p-6 rounded-lg text-white">
            <p className="text-sm opacity-90">{getPeriodTitle()}</p>
            <p className="text-4xl font-bold mt-2 transition-all duration-300 ease-in-out">
              R$ {getTotalByPeriod().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs opacity-75 mt-1">{getPeriodLabel(periodo)}</p>
          </div>

          {/* Add Form */}
          <form onSubmit={handleAddSaida} className="bg-red-50 dark:bg-red-950 p-4 rounded-lg space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-medium text-base text-black dark:text-zinc-50">Adicionar Nova Saída</h3>
              <button
                type="button"
                onClick={() => setShowCreateTag(!showCreateTag)}
                className="text-sm text-red-600 dark:text-red-400 hover:underline"
              >
                {showCreateTag ? 'Cancelar' : '+ Nova Tag'}
              </button>
            </div>

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

            <TagSelector tags={tags} selectedTags={selectedTags} onToggleTag={toggleTag} />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                inputMode="numeric"
                placeholder="Valor (R$)"
                value={amount}
                onChange={handleAmountChange}
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-700 dark:text-gray-300 mb-1 block">
                  Data
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm border rounded bg-white dark:bg-gray-800 text-black dark:text-white"
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isRecurring}
                    onChange={(e) => setIsRecurring(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Saída Recorrente
                  </span>
                </label>
              </div>
            </div>

            {isRecurring && (
              <div className="bg-red-100 dark:bg-red-900 p-3 rounded border border-red-200 dark:border-red-800 space-y-3">
                <h4 className="text-sm font-medium text-red-900 dark:text-red-100">
                  Configuração de Recorrência
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-700 dark:text-gray-300 mb-1 block">
                      Tipo de Recorrência
                    </label>
                    <select
                      value={recurringType}
                      onChange={(e) => setRecurringType(e.target.value)}
                      className="w-full px-3 py-2 text-sm border rounded bg-white dark:bg-gray-800 text-black dark:text-white"
                    >
                      <option value="weekly">Semanal</option>
                      <option value="biweekly">Quinzenal</option>
                      <option value="monthly">Mensal</option>
                      <option value="bimonthly">Bimestral</option>
                      <option value="quarterly">Trimestral</option>
                      <option value="semiannual">Semestral</option>
                      <option value="annual">Anual</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-700 dark:text-gray-300 mb-1 block">
                      {recurringType === 'weekly' ? 'Dia da Semana (0-6)' : 'Dia do Mês (1-31)'}
                    </label>
                    <input
                      type="number"
                      min={recurringType === 'weekly' ? 0 : 1}
                      max={recurringType === 'weekly' ? 6 : 31}
                      value={recurringDay}
                      onChange={(e) => setRecurringDay(parseInt(e.target.value))}
                      className="w-full px-3 py-2 text-sm border rounded bg-white dark:bg-gray-800 text-black dark:text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-700 dark:text-gray-300 mb-1 block">
                    Data de Término (opcional)
                  </label>
                  <input
                    type="date"
                    value={recurringEndDate}
                    onChange={(e) => setRecurringEndDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded bg-white dark:bg-gray-800 text-black dark:text-white"
                  />
                </div>
              </div>
            )}

            <input
              type="text"
              placeholder="Descrição (opcional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-sm border rounded bg-white dark:bg-gray-800 text-black dark:text-white"
            />
            <button
              type="submit"
              disabled={isAddingSaida}
              className="w-full px-4 py-3 text-base bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400 font-medium"
            >
              {isAddingSaida ? 'Adicionando...' : '+ Adicionar Saída'}
            </button>
          </form>

          {/* List */}
          <div>
            <h3 className="font-medium text-base text-black dark:text-zinc-50 mb-3">
              Histórico de Saídas
            </h3>
            <div className="space-y-3">
              {filteredSaidas && filteredSaidas.length > 0 ? (
                filteredSaidas.map((saida) => (
                  <div
                    key={saida.id}
                    className="p-4 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-900"
                  >
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
                      <div className="flex-1 w-full">
                        <div className="flex items-center gap-3">
                          {saida.user.image && (
                            <img
                              src={saida.user.image}
                              alt={saida.user.name || ''}
                              className="w-10 h-10 rounded-full flex-shrink-0"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-lg text-red-700 dark:text-red-400">
                              - R$ {parseFloat(saida.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                              {saida.user.name} • {saida.category || 'Sem categoria'}
                            </p>
                            {saida.tags && saida.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {saida.tags.map((saidaTag) => (
                                  <span
                                    key={saidaTag.id}
                                    className="px-2 py-0.5 text-xs rounded-full text-white"
                                    style={{ backgroundColor: saidaTag.tag.color }}
                                  >
                                    {saidaTag.tag.name}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        {saida.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 ml-13">
                            {saida.description}
                          </p>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 ml-13 sm:ml-0 whitespace-nowrap">
                        {new Date(saida.date).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                  {getEmptyMessage()}
                </p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function SaidasPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
        <p className="text-lg">Carregando...</p>
      </div>
    }>
      <SaidasContent />
    </Suspense>
  );
}
