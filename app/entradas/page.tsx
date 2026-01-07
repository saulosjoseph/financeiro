'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useEntradas, PeriodType } from '@/lib/hooks/useEntradas';
import { useTags } from '@/lib/hooks/useTags';
import { useFamily } from '@/lib/hooks/useFamily';
import { useAccounts } from '@/lib/hooks/useAccounts';
import TagSelector from '@/components/TagSelector';
import AccountSelector from '@/components/AccountSelector';
import PeriodToggle from '@/components/PeriodToggle';
import Link from 'next/link';
import { formatCurrency, parseCurrency } from '@/lib/utils/currencyMask';
import { toast } from 'sonner';

function EntradasContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const familyId = searchParams.get('family');

  const [accountId, setAccountId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [source, setSource] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringType, setRecurringType] = useState<string>('monthly');
  const [recurringDay, setRecurringDay] = useState<number>(new Date().getDate());
  const [recurringEndDate, setRecurringEndDate] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isAddingEntrada, setIsAddingEntrada] = useState(false);
  const [showCreateTag, setShowCreateTag] = useState(false);
  const [tagName, setTagName] = useState('');
  const [tagColor, setTagColor] = useState('#6B7280');
  const [isCreatingTag, setIsCreatingTag] = useState(false);
  const [periodo, setPeriodo] = useState<PeriodType>('mes');

  const { selectedFamily } = useFamily(familyId);
  const { accounts } = useAccounts(familyId);
  const { 
    entradas, 
    totalMes, 
    totalAno, 
    totalGeral, 
    countMes, 
    countAno, 
    countGeral, 
    getPeriodLabel, 
    getFilteredData, 
    mutate: mutateEntradas 
  } = useEntradas(familyId);
  const { tags, mutate: mutateTags } = useTags(familyId);

  useEffect(() => {
    if (!familyId) {
      router.push('/dashboard');
    }
  }, [familyId, router]);

  // Auto-select default account
  useEffect(() => {
    if (accounts && accounts.length > 0 && !accountId) {
      const defaultAccount = accounts.find(acc => acc.isDefault && acc.isActive);
      setAccountId(defaultAccount?.id || accounts[0].id);
    }
  }, [accounts, accountId]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCurrency(e.target.value);
    setAmount(formatted);
  };

  const handleAddEntrada = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !familyId || !accountId) {
      toast.error('Por favor, selecione uma conta');
      return;
    }
    setIsAddingEntrada(true);

    try {
      const response = await fetch(`/api/families/${familyId}/entradas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId,
          amount: parseFloat(parseCurrency(amount)),
          description,
          source,
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
        setSource('');
        setDate(new Date().toISOString().split('T')[0]);
        setIsRecurring(false);
        setRecurringType('monthly');
        setRecurringDay(new Date().getDate());
        setRecurringEndDate('');
        setSelectedTags([]);
        mutateEntradas();
        toast.success('Entrada adicionada com sucesso!');
      } else {
        toast.error('Erro ao adicionar entrada');
      }
    } catch (error) {
      toast.error('Erro ao adicionar entrada');
    } finally {
      setIsAddingEntrada(false);
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
        toast.success('Tag criada com sucesso!');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Erro ao criar tag');
      }
    } catch (error) {
      toast.error('Erro ao criar tag');
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
    return periodo === 'mes' ? 'Entrada Familiar do Mês' : periodo === 'ano' ? 'Entrada Familiar do Ano' : 'Entrada Familiar Total';
  };

  const getEmptyMessage = () => {
    if (periodo === 'geral') return 'Nenhuma entrada registrada ainda';
    return `Nenhuma entrada registrada em ${getPeriodLabel(periodo)}`;
  };

  const filteredEntradas = getFilteredData(periodo);

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
                💵 Entradas {selectedFamily && `- ${selectedFamily.name}`}
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
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6 rounded-lg text-white">
            <p className="text-sm opacity-90">{getPeriodTitle()}</p>
            <p className="text-4xl font-bold mt-2 transition-all duration-300 ease-in-out">
              R$ {getTotalByPeriod().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs opacity-75 mt-1">{getPeriodLabel(periodo)}</p>
          </div>

          {/* Add Form */}
          <form onSubmit={handleAddEntrada} className="bg-purple-50 dark:bg-purple-950 p-4 rounded-lg space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-medium text-base text-black dark:text-zinc-50">Adicionar Nova Entrada</h3>
              <button
                type="button"
                onClick={() => setShowCreateTag(!showCreateTag)}
                className="text-sm text-purple-600 dark:text-purple-400 hover:underline"
              >
                {showCreateTag ? 'Cancelar' : '+ Nova Tag'}
              </button>
            </div>

            {showCreateTag && (
              <div className="bg-white dark:bg-gray-800 p-3 rounded border border-purple-200 dark:border-purple-800">
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
                    className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-400 whitespace-nowrap"
                  >
                    {isCreatingTag ? 'Criando...' : 'Criar'}
                  </button>
                </div>
              </div>
            )}

            <TagSelector tags={tags} selectedTags={selectedTags} onToggleTag={toggleTag} />

            <div>
              <label className="text-xs text-gray-700 dark:text-gray-300 mb-1 block">
                Conta *
              </label>
              <AccountSelector
                accounts={accounts || []}
                selectedAccountId={accountId}
                onChange={setAccountId}
                disabled={isAddingEntrada}
              />
            </div>

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
                placeholder="Origem (ex: Salário)"
                value={source}
                onChange={(e) => setSource(e.target.value)}
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
                    Entrada Recorrente
                  </span>
                </label>
              </div>
            </div>

            {isRecurring && (
              <div className="bg-purple-100 dark:bg-purple-900 p-3 rounded border border-purple-200 dark:border-purple-800 space-y-3">
                <h4 className="text-sm font-medium text-purple-900 dark:text-purple-100">
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
              disabled={isAddingEntrada}
              className="w-full px-4 py-3 text-base bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-400 font-medium"
            >
              {isAddingEntrada ? 'Adicionando...' : '+ Adicionar Entrada'}
            </button>
          </form>

          {/* List */}
          <div>
            <h3 className="font-medium text-base text-black dark:text-zinc-50 mb-3">
              Histórico de Entradas
            </h3>
            <div className="space-y-3">
              {filteredEntradas && filteredEntradas.length > 0 ? (
                filteredEntradas.map((entrada) => (
                  <div
                    key={entrada.id}
                    className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800"
                  >
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
                      <div className="flex-1 w-full">
                        <div className="flex items-center gap-3">
                          {entrada.user.image && (
                            <img
                              src={entrada.user.image}
                              alt={entrada.user.name || ''}
                              className="w-10 h-10 rounded-full flex-shrink-0"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-lg text-green-600 dark:text-green-400">
                              R$ {parseFloat(entrada.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                              {entrada.user.name} • {entrada.source || 'Sem origem'}
                            </p>
                            {entrada.tags && entrada.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {entrada.tags.map((entradaTag) => (
                                  <span
                                    key={entradaTag.id}
                                    className="px-2 py-0.5 text-xs rounded-full text-white"
                                    style={{ backgroundColor: entradaTag.tag.color }}
                                  >
                                    {entradaTag.tag.name}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        {entrada.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 ml-13">
                            {entrada.description}
                          </p>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 ml-13 sm:ml-0 whitespace-nowrap">
                        {new Date(entrada.date).toLocaleDateString('pt-BR')}
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

export default function EntradasPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
        <p className="text-lg">Carregando...</p>
      </div>
    }>
      <EntradasContent />
    </Suspense>
  );
}
