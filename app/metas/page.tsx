'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useGoals, type SavingsGoal } from '@/lib/hooks/useGoals';
import { useFamily } from '@/lib/hooks/useFamily';
import Link from 'next/link';
import { formatCurrency, parseCurrency } from '@/lib/utils/currencyMask';

function MetasContent() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const familyId = searchParams.get('family');

  const [showCreateGoal, setShowCreateGoal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [priority, setPriority] = useState(0);
  const [isEmergencyFund, setIsEmergencyFund] = useState(false);
  const [monthlyExpenses, setMonthlyExpenses] = useState('');
  const [targetMonths, setTargetMonths] = useState(3);
  const [isCreatingGoal, setIsCreatingGoal] = useState(false);

  const [selectedGoal, setSelectedGoal] = useState<SavingsGoal | null>(null);
  const [contributionAmount, setContributionAmount] = useState('');
  const [contributionDescription, setContributionDescription] = useState('');
  const [isAddingContribution, setIsAddingContribution] = useState(false);

  const { selectedFamily } = useFamily(familyId);
  const { goals, mutate: mutateGoals } = useGoals(familyId);

  useEffect(() => {
    if (!familyId) {
      router.push('/dashboard');
    }
  }, [familyId, router]);

  const handleAmountChange = (setter: (value: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCurrency(e.target.value);
    setter(formatted);
  };

  const calculateEmergencyFundTarget = () => {
    if (!monthlyExpenses) return 0;
    return parseFloat(parseCurrency(monthlyExpenses)) * targetMonths;
  };

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!familyId) return;

    let finalTargetAmount = parseFloat(parseCurrency(targetAmount));
    
    if (isEmergencyFund && monthlyExpenses) {
      finalTargetAmount = calculateEmergencyFundTarget();
    }

    if (!name.trim() || finalTargetAmount <= 0) {
      alert('Nome e valor alvo são obrigatórios');
      return;
    }

    setIsCreatingGoal(true);

    try {
      const response = await fetch(`/api/families/${familyId}/goals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          targetAmount: finalTargetAmount,
          targetDate: targetDate ? new Date(targetDate).toISOString() : null,
          priority,
          isEmergencyFund,
          monthlyExpenses: isEmergencyFund ? parseFloat(parseCurrency(monthlyExpenses)) : null,
          targetMonths: isEmergencyFund ? targetMonths : null,
        }),
      });

      if (response.ok) {
        setName('');
        setDescription('');
        setTargetAmount('');
        setTargetDate('');
        setPriority(0);
        setIsEmergencyFund(false);
        setMonthlyExpenses('');
        setTargetMonths(3);
        setShowCreateGoal(false);
        mutateGoals();
      } else {
        const error = await response.json();
        alert(error.error || 'Erro ao criar meta');
      }
    } catch (error) {
      alert('Erro ao criar meta');
    } finally {
      setIsCreatingGoal(false);
    }
  };

  const handleAddContribution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!familyId || !selectedGoal || !contributionAmount) return;

    const amount = parseFloat(parseCurrency(contributionAmount));
    if (amount <= 0) {
      alert('Valor deve ser maior que zero');
      return;
    }

    setIsAddingContribution(true);

    try {
      const response = await fetch(`/api/families/${familyId}/goals/${selectedGoal.id}/contributions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          description: contributionDescription,
          date: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        setContributionAmount('');
        setContributionDescription('');
        setSelectedGoal(null);
        mutateGoals();
      } else {
        const error = await response.json();
        alert(error.error || 'Erro ao adicionar contribuição');
      }
    } catch (error) {
      alert('Erro ao adicionar contribuição');
    } finally {
      setIsAddingContribution(false);
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (!confirm('Tem certeza que deseja deletar esta meta?')) return;
    if (!familyId) return;

    try {
      const response = await fetch(`/api/families/${familyId}/goals/${goalId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        mutateGoals();
      } else {
        alert('Erro ao deletar meta');
      }
    } catch (error) {
      alert('Erro ao deletar meta');
    }
  };

  const getProgressPercentage = (goal: SavingsGoal) => {
    const current = parseFloat(goal.currentAmount);
    const target = parseFloat(goal.targetAmount);
    return Math.min((current / target) * 100, 100);
  };

  const getPriorityLabel = (priority: number) => {
    switch (priority) {
      case 2: return 'Alta';
      case 1: return 'Média';
      default: return 'Baixa';
    }
  };

  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 2: return 'bg-red-100 text-red-800';
      case 1: return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-4xl flex-col py-4 sm:py-16 px-4 sm:px-8 bg-white dark:bg-black mx-auto">
        <div className="flex flex-col gap-4 sm:gap-6 w-full">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b pb-4 gap-3">
            <div>
              <Link
                href={`/dashboard?family=${familyId}`}
                className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 mb-2 inline-block"
              >
                ← Voltar ao Dashboard
              </Link>
              <h1 className="text-2xl sm:text-3xl font-semibold text-black dark:text-zinc-50">
                🎯 Metas {selectedFamily && `- ${selectedFamily.name}`}
              </h1>
            </div>
          </div>

          {/* Criar Nova Meta */}
          <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-medium text-base text-black dark:text-zinc-50">
                {showCreateGoal ? 'Criar Nova Meta' : 'Adicionar Nova Meta'}
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateGoal(!showCreateGoal)}
                className="text-sm text-green-600 dark:text-green-400 hover:underline"
              >
                {showCreateGoal ? 'Cancelar' : '+ Nova Meta'}
              </button>
            </div>

        {showCreateGoal && (
          <form onSubmit={handleCreateGoal} className="space-y-4">
            <div className="flex items-center space-x-4 mb-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={isEmergencyFund}
                  onChange={(e) => setIsEmergencyFund(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-sm font-medium text-gray-700">
                  Reserva de Emergência
                </span>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome da Meta *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={isEmergencyFund ? 'Reserva de Emergência' : 'Ex: Viagem, Casa Nova, etc'}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prioridade
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(parseInt(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value={0}>Baixa</option>
                  <option value={1}>Média</option>
                  <option value={2}>Alta</option>
                </select>
              </div>
            </div>

            {isEmergencyFund ? (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-4">
                <p className="text-sm text-blue-800 font-medium">
                  💡 Configure sua reserva de emergência baseada nas suas despesas mensais
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Despesas Mensais (R$) *
                    </label>
                    <input
                      type="text"
                      value={monthlyExpenses}
                      onChange={handleAmountChange(setMonthlyExpenses)}
                      placeholder="R$ 0,00"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Meses de Reserva *
                    </label>
                    <select
                      value={targetMonths}
                      onChange={(e) => setTargetMonths(parseInt(e.target.value))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value={3}>3 meses (Mínimo)</option>
                      <option value={6}>6 meses (Recomendado)</option>
                      <option value={12}>12 meses (Conservador)</option>
                    </select>
                  </div>
                </div>

                {monthlyExpenses && (
                  <div className="text-center p-3 bg-white rounded-lg">
                    <p className="text-sm text-gray-600">Valor Alvo Calculado</p>
                    <p className="text-2xl font-bold text-blue-600">
                      R$ {calculateEmergencyFundTarget().toFixed(2).replace('.', ',')}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valor Alvo (R$) *
                </label>
                <input
                  type="text"
                  value={targetAmount}
                  onChange={handleAmountChange(setTargetAmount)}
                  placeholder="R$ 0,00"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descrição
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detalhes sobre esta meta..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data Alvo
                </label>
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={isCreatingGoal}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isCreatingGoal ? 'Criando...' : 'Criar Meta'}
              </button>
              <button
                type="button"
                onClick={() => setShowCreateGoal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Lista de Metas */}
      <div className="space-y-6">
        {!goals || goals.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center text-gray-500">
            <p className="text-lg mb-2">📊 Nenhuma meta cadastrada</p>
            <p className="text-sm">Crie sua primeira meta de economia acima</p>
          </div>
        ) : (
          goals.map((goal) => {
            const progress = getProgressPercentage(goal);
            const current = parseFloat(goal.currentAmount);
            const target = parseFloat(goal.targetAmount);
            const remaining = target - current;
            
            return (
              <div
                key={goal.id}
                className={`bg-white rounded-lg shadow-md overflow-hidden ${
                  goal.isCompleted ? 'border-2 border-green-500' : ''
                }`}
              >
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-xl font-bold text-gray-900">
                          {goal.isEmergencyFund && '🛡️ '}{goal.name}
                        </h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(goal.priority)}`}>
                          {getPriorityLabel(goal.priority)}
                        </span>
                        {goal.isCompleted && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            ✓ Concluída
                          </span>
                        )}
                      </div>
                      {goal.description && (
                        <p className="text-sm text-gray-600 mb-2">{goal.description}</p>
                      )}
                      {goal.targetDate && (
                        <p className="text-sm text-gray-500">
                          📅 Meta: {new Date(goal.targetDate).toLocaleDateString('pt-BR')}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteGoal(goal.id)}
                      className="text-red-600 hover:text-red-800 text-sm font-medium"
                    >
                      🗑️ Excluir
                    </button>
                  </div>

                  {/* Barra de Progresso */}
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600">
                        R$ {current.toFixed(2).replace('.', ',')} de R$ {target.toFixed(2).replace('.', ',')}
                      </span>
                      <span className="font-semibold text-gray-900">
                        {progress.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full transition-all ${
                          goal.isCompleted ? 'bg-green-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    {!goal.isCompleted && remaining > 0 && (
                      <p className="text-sm text-gray-600 mt-2">
                        Faltam R$ {remaining.toFixed(2).replace('.', ',')} para atingir a meta
                      </p>
                    )}
                  </div>

                  {/* Informações de Reserva de Emergência */}
                  {goal.isEmergencyFund && goal.monthlyExpenses && goal.targetMonths && (
                    <div className="bg-blue-50 rounded-lg p-3 mb-4 text-sm">
                      <p className="text-blue-800">
                        💰 Baseado em despesas mensais de R$ {parseFloat(goal.monthlyExpenses).toFixed(2).replace('.', ',')} × {goal.targetMonths} meses
                      </p>
                    </div>
                  )}

                  {/* Adicionar Contribuição */}
                  {!goal.isCompleted && (
                    <div className="border-t pt-4">
                      {selectedGoal?.id === goal.id ? (
                        <form onSubmit={handleAddContribution} className="space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <input
                                type="text"
                                value={contributionAmount}
                                onChange={handleAmountChange(setContributionAmount)}
                                placeholder="R$ 0,00"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                required
                              />
                            </div>
                            <div>
                              <input
                                type="text"
                                value={contributionDescription}
                                onChange={(e) => setContributionDescription(e.target.value)}
                                placeholder="Descrição (opcional)"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              type="submit"
                              disabled={isAddingContribution}
                              className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors text-sm"
                            >
                              {isAddingContribution ? 'Adicionando...' : 'Confirmar Contribuição'}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedGoal(null);
                                setContributionAmount('');
                                setContributionDescription('');
                              }}
                              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                            >
                              Cancelar
                            </button>
                          </div>
                        </form>
                      ) : (
                        <button
                          onClick={() => setSelectedGoal(goal)}
                          className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                        >
                          + Adicionar Contribuição
                        </button>
                      )}
                    </div>
                  )}

                  {/* Últimas Contribuições */}
                  {goal.contributions && goal.contributions.length > 0 && (
                    <div className="border-t mt-4 pt-4">
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">
                        Últimas Contribuições ({goal._count?.contributions || 0})
                      </h4>
                      <div className="space-y-2">
                        {goal.contributions.map((contribution) => (
                          <div
                            key={contribution.id}
                            className="flex justify-between items-center text-sm bg-gray-50 rounded p-2"
                          >
                            <div>
                              <p className="font-medium text-gray-900">
                                R$ {parseFloat(contribution.amount).toFixed(2).replace('.', ',')}
                              </p>
                              {contribution.description && (
                                <p className="text-gray-600 text-xs">{contribution.description}</p>
                              )}
                            </div>
                            <p className="text-gray-500 text-xs">
                              {new Date(contribution.date).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function MetasPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><p className="text-gray-600">Carregando...</p></div>}>
      <MetasContent />
    </Suspense>
  );
}
