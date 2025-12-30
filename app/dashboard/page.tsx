'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFamily } from '@/lib/hooks/useFamily';
import { useEntradas, PeriodType } from '@/lib/hooks/useEntradas';
import { useSaidas } from '@/lib/hooks/useSaidas';
import { useGoals } from '@/lib/hooks/useGoals';
import FamilySelector from '@/components/FamilySelector';
import CreateFamilyForm from '@/components/CreateFamilyForm';
import StatsCard from '@/components/StatsCard';
import PeriodToggleDual from '@/components/PeriodToggleDual';
import Link from 'next/link';

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [selectedFamilyId, setSelectedFamilyId] = useState<string | null>(null);
  const [showAddMember, setShowAddMember] = useState(false);
  const [memberEmail, setMemberEmail] = useState('');
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [showShareLinks, setShowShareLinks] = useState(false);
  const [shareLinks, setShareLinks] = useState<any[]>([]);
  const [isCreatingLink, setIsCreatingLink] = useState(false);
  const [periodo, setPeriodo] = useState<PeriodType>('mes');
  const [showInitialBalance, setShowInitialBalance] = useState(false);
  const [initialBalanceInput, setInitialBalanceInput] = useState('');
  const [isSavingBalance, setIsSavingBalance] = useState(false);

  const { families, selectedFamily, mutate: mutateFamilies } = useFamily(selectedFamilyId);
  const { totalMes: totalEntradaMes, totalAno: totalEntradaAno, totalGeral: totalEntradaGeral, countMes: countEntradaMes, countAno: countEntradaAno, countGeral: countEntradaGeral } = useEntradas(selectedFamilyId);
  const { totalMes: totalSaidaMes, totalAno: totalSaidaAno, totalGeral: totalSaidaGeral, countMes: countSaidaMes, countAno: countSaidaAno, countGeral: countSaidaGeral } = useSaidas(selectedFamilyId);
  const { goals } = useGoals(selectedFamilyId);

  const totalEntrada = periodo === 'mes' ? totalEntradaMes : periodo === 'ano' ? totalEntradaAno : totalEntradaGeral;
  const totalSaida = periodo === 'mes' ? totalSaidaMes : periodo === 'ano' ? totalSaidaAno : totalSaidaGeral;
  const initialBalance = selectedFamily?.initialBalance ? parseFloat(selectedFamily.initialBalance.toString()) : 0;
  const balance = periodo === 'geral' ? initialBalance + totalEntrada - totalSaida : totalEntrada - totalSaida;
  const isAdmin = selectedFamily?.members.find(m => m.user.id === session?.user?.id)?.role === 'admin';

  // Save selected family to localStorage
  useEffect(() => {
    if (selectedFamilyId) {
      localStorage.setItem('selectedFamilyId', selectedFamilyId);
    }
  }, [selectedFamilyId]);

  // Load selected family from localStorage on mount or auto-select if only one family
  useEffect(() => {
    if (!families || families.length === 0) return;
    
    // If user has only one family, auto-select it
    if (families.length === 1 && !selectedFamilyId) {
      setSelectedFamilyId(families[0].id);
      return;
    }
    
    // Otherwise, try to load from localStorage
    const savedFamilyId = localStorage.getItem('selectedFamilyId');
    if (savedFamilyId && families.find(f => f.id === savedFamilyId)) {
      setSelectedFamilyId(savedFamilyId);
    }
  }, [families, selectedFamilyId]);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberEmail.trim() || !selectedFamilyId) return;
    setIsAddingMember(true);

    try {
      const response = await fetch(`/api/families/${selectedFamilyId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: memberEmail }),
      });

      if (response.ok) {
        setMemberEmail('');
        setShowAddMember(false);
        mutateFamilies();
        alert('Membro adicionado com sucesso!');
      } else {
        const error = await response.json();
        alert(error.error || 'Erro ao adicionar membro');
      }
    } catch (error) {
      alert('Erro ao adicionar membro');
    } finally {
      setIsAddingMember(false);
    }
  };

  const fetchShareLinks = async () => {
    if (!selectedFamilyId) return;
    try {
      const response = await fetch(`/api/families/${selectedFamilyId}/share-link`);
      if (response.ok) {
        const data = await response.json();
        setShareLinks(data);
      }
    } catch (error) {
      console.error('Error fetching share links:', error);
    }
  };

  const handleCreateShareLink = async () => {
    if (!selectedFamilyId) return;
    setIsCreatingLink(true);
    try {
      const response = await fetch(`/api/families/${selectedFamilyId}/share-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'member', expiresInDays: 7 }),
      });

      if (response.ok) {
        const data = await response.json();
        setShareLinks([...shareLinks, data]);
        alert('Link criado com sucesso!');
      } else {
        const error = await response.json();
        alert(error.error || 'Erro ao criar link');
      }
    } catch (error) {
      alert('Erro ao criar link');
    } finally {
      setIsCreatingLink(false);
    }
  };

  const handleDeleteShareLink = async (linkId: string) => {
    if (!selectedFamilyId || !confirm('Deseja realmente deletar este link?')) return;
    try {
      const response = await fetch(`/api/families/${selectedFamilyId}/share-link?linkId=${linkId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setShareLinks(shareLinks.filter(link => link.id !== linkId));
        alert('Link deletado com sucesso!');
      } else {
        const error = await response.json();
        alert(error.error || 'Erro ao deletar link');
      }
    } catch (error) {
      alert('Erro ao deletar link');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Link copiado para a área de transferência!');
  };

  const handleSaveInitialBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFamilyId || !isAdmin) return;

    setIsSavingBalance(true);
    try {
      const response = await fetch(`/api/families/${selectedFamilyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          initialBalance: parseFloat(initialBalanceInput) || 0 
        }),
      });

      if (response.ok) {
        await mutateFamilies();
        setShowInitialBalance(false);
        setInitialBalanceInput('');
        alert('Saldo inicial atualizado com sucesso!');
      } else {
        const error = await response.json();
        alert(`Erro ao atualizar saldo inicial: ${error.error || 'Erro desconhecido'}`);
      }
    } catch (error) {
      console.error('Error saving initial balance:', error);
      alert('Erro ao atualizar saldo inicial');
    } finally {
      setIsSavingBalance(false);
    }
  };

  useEffect(() => {
    if (showInitialBalance && selectedFamily?.initialBalance !== undefined) {
      setInitialBalanceInput(selectedFamily.initialBalance.toString());
    }
  }, [showInitialBalance, selectedFamily?.initialBalance]);

  useEffect(() => {
    if (showShareLinks && selectedFamilyId) {
      fetchShareLinks();
    }
  }, [showShareLinks, selectedFamilyId]);

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
        <p className="text-lg">Carregando...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
        <div className="flex flex-col items-center gap-6 p-8 bg-white dark:bg-gray-900 rounded-lg shadow-lg">
          <h1 className="text-3xl font-semibold text-black dark:text-zinc-50">
            💰 Financeiro App
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Faça login para continuar
          </p>
          <button
            onClick={() => signIn('google')}
            className="flex items-center gap-3 px-6 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            <span className="font-medium text-gray-700 dark:text-gray-200">
              Entrar com Google
            </span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-6xl flex-col py-4 sm:py-16 px-4 sm:px-8 bg-white dark:bg-black mx-auto">
        <div className="flex flex-col gap-4 sm:gap-6 w-full">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b pb-4 gap-3">
            <h1 className="text-2xl sm:text-3xl font-semibold text-black dark:text-zinc-50">
              💰 Dashboard Financeiro
            </h1>
            <div className="flex items-center gap-3 sm:gap-4">
              {session.user?.image && (
                <img
                  src={session.user.image}
                  alt={session.user.name || 'User'}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full"
                />
              )}
              <div className="text-left sm:text-right">
                <p className="text-xs sm:text-sm font-medium text-black dark:text-white">
                  {session.user?.name}
                </p>
                <button
                  onClick={() => signOut()}
                  className="text-xs text-red-600 hover:text-red-700 dark:text-red-400"
                >
                  Sair
                </button>
              </div>
            </div>
          </div>

          {/* Create Family - Only show if user has no families */}
          {families && families.length === 0 && (
            <CreateFamilyForm onSuccess={mutateFamilies} />
          )}

          {/* Family Selection - Only show if user has more than one family */}
          {families && families.length > 1 && (
            <div>
              <h2 className="text-lg font-semibold text-black dark:text-white mb-3">
                Selecione uma Família
              </h2>
              <FamilySelector
                families={families}
                selectedFamilyId={selectedFamilyId}
                onSelectFamily={setSelectedFamilyId}
              />
            </div>
          )}

          {/* Dashboard Content */}
          {selectedFamilyId && selectedFamily && (
            <div className="border-t pt-6 space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <h2 className="text-xl sm:text-2xl font-semibold text-black dark:text-white">
                  {selectedFamily.name}
                </h2>
                {isAdmin && (
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => setShowInitialBalance(!showInitialBalance)}
                      className="px-4 py-2 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 whitespace-nowrap"
                    >
                      {showInitialBalance ? 'Cancelar' : '💰 Saldo Inicial'}
                    </button>
                    <button
                      onClick={() => setShowAddMember(!showAddMember)}
                      className="px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 whitespace-nowrap"
                    >
                      {showAddMember ? 'Cancelar' : '+ Adicionar por Email'}
                    </button>
                    <button
                      onClick={() => setShowShareLinks(!showShareLinks)}
                      className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 whitespace-nowrap"
                    >
                      {showShareLinks ? 'Fechar Links' : '🔗 Links de Convite'}
                    </button>
                  </div>
                )}
              </div>

              {/* Initial Balance Form */}
              {showInitialBalance && (
                <form onSubmit={handleSaveInitialBalance} className="bg-purple-50 dark:bg-purple-950 p-4 rounded-lg">
                  <h3 className="font-medium text-sm sm:text-base text-black dark:text-zinc-50 mb-3">
                    💰 Configurar Saldo Inicial
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-3">
                    Defina o valor que você tinha antes de começar a usar o app. Este valor será considerado apenas no cálculo do <strong>Saldo Total</strong>.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={initialBalanceInput}
                      onChange={(e) => setInitialBalanceInput(e.target.value)}
                      required
                      className="flex-1 px-3 py-2 text-sm border rounded bg-white dark:bg-gray-800 text-black dark:text-white"
                    />
                    <button
                      type="submit"
                      disabled={isSavingBalance}
                      className="px-4 py-2 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 whitespace-nowrap"
                    >
                      {isSavingBalance ? 'Salvando...' : 'Salvar'}
                    </button>
                  </div>
                  {selectedFamily?.initialBalance !== undefined && selectedFamily.initialBalance !== 0 && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                      Saldo inicial atual: <strong>R$ {parseFloat(selectedFamily.initialBalance.toString()).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                    </p>
                  )}
                </form>
              )}

              {/* Add Member Form */}
              {showAddMember && (
                <form onSubmit={handleAddMember} className="bg-green-50 dark:bg-green-950 p-4 rounded-lg">
                  <h3 className="font-medium text-sm sm:text-base text-black dark:text-zinc-50 mb-3">
                    Adicionar Membro por Email
                  </h3>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="email"
                      placeholder="email@exemplo.com"
                      value={memberEmail}
                      onChange={(e) => setMemberEmail(e.target.value)}
                      required
                      className="flex-1 px-3 py-2 text-sm border rounded bg-white dark:bg-gray-800 text-black dark:text-white"
                    />
                    <button
                      type="submit"
                      disabled={isAddingMember}
                      className="px-6 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 whitespace-nowrap"
                    >
                      {isAddingMember ? 'Adicionando...' : 'Adicionar'}
                    </button>
                  </div>
                </form>
              )}

              {/* Share Links Section */}
              {showShareLinks && (
                <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-medium text-sm sm:text-base text-black dark:text-zinc-50">
                      Links de Convite (Uso Único)
                    </h3>
                    <button
                      onClick={handleCreateShareLink}
                      disabled={isCreatingLink}
                      className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
                    >
                      {isCreatingLink ? 'Criando...' : '+ Criar Novo Link'}
                    </button>
                  </div>

                  {shareLinks.length === 0 ? (
                    <p className="text-sm text-gray-600 dark:text-gray-400 text-center py-4">
                      Nenhum link ativo. Crie um link para compartilhar com outras pessoas.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {shareLinks.map((link) => (
                        <div
                          key={link.id}
                          className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700"
                        >
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                  Expira em: {new Date(link.expiresAt).toLocaleDateString('pt-BR')}
                                </span>
                                {link.usedAt && (
                                  <span className="text-xs bg-gray-500 text-white px-2 py-0.5 rounded">
                                    Usado
                                  </span>
                                )}
                              </div>
                              <code className="text-xs bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded block overflow-x-auto">
                                {`${window.location.origin}/join/${link.token}`}
                              </code>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => copyToClipboard(`${window.location.origin}/join/${link.token}`)}
                                className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 whitespace-nowrap"
                              >
                                📋 Copiar
                              </button>
                              <button
                                onClick={() => handleDeleteShareLink(link.id)}
                                className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded border border-blue-200 dark:border-blue-800">
                    <p className="text-xs text-blue-800 dark:text-blue-200">
                      💡 <strong>Dica:</strong> Links de convite podem ser usados apenas uma vez e expiram em 7 dias. 
                      Compartilhe com pessoas que você deseja adicionar à família.
                    </p>
                  </div>
                </div>
              )}

              {/* Members List */}
              <div>
                <h3 className="font-medium text-base text-black dark:text-zinc-50 mb-3">Membros</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {selectedFamily.members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded"
                    >
                      {member.user.image && (
                        <img
                          src={member.user.image}
                          alt={member.user.name || ''}
                          className="w-10 h-10 rounded-full flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-black dark:text-white truncate">
                          {member.user.name || 'Sem nome'}
                          {member.role === 'admin' && (
                            <span className="ml-2 text-xs bg-blue-600 text-white px-2 py-1 rounded">
                              Admin
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                          {member.user.email}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Period Toggle */}
              <div className="flex justify-center">
                <PeriodToggleDual
                  selectedPeriod={periodo}
                  onPeriodChange={setPeriodo}
                  countEntradasMes={countEntradaMes}
                  countEntradasAno={countEntradaAno}
                  countEntradasGeral={countEntradaGeral}
                  countSaidasMes={countSaidaMes}
                  countSaidasAno={countSaidaAno}
                  countSaidasGeral={countSaidaGeral}
                />
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatsCard
                  title={periodo === 'mes' ? 'Entradas do Mês' : periodo === 'ano' ? 'Entradas do Ano' : 'Entradas Totais'}
                  value={totalEntrada}
                  gradient="from-green-500 to-emerald-600"
                />
                <StatsCard
                  title={periodo === 'mes' ? 'Saídas do Mês' : periodo === 'ano' ? 'Saídas do Ano' : 'Saídas Totais'}
                  value={totalSaida}
                  gradient="from-red-500 to-rose-600"
                />
                <StatsCard
                  title={periodo === 'mes' ? 'Saldo do Mês' : periodo === 'ano' ? 'Saldo do Ano' : 'Saldo Total'}
                  value={balance}
                  gradient={balance >= 0 ? 'from-blue-500 to-indigo-600' : 'from-orange-500 to-amber-600'}
                  breakdown={periodo === 'geral' && initialBalance !== 0 ? [
                    { label: 'Saldo Inicial', value: initialBalance },
                    { label: 'Entradas', value: totalEntrada },
                    { label: 'Saídas', value: -totalSaida },
                  ] : undefined}
                />
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
                <Link
                  href={`/entradas?family=${selectedFamilyId}`}
                  className="flex items-center justify-center gap-3 p-6 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
                >
                  <span className="text-3xl">💵</span>
                  <div>
                    <h3 className="text-xl font-bold">Adicionar Entrada</h3>
                    <p className="text-sm opacity-90">Registrar nova entrada</p>
                  </div>
                </Link>
                <Link
                  href={`/saidas?family=${selectedFamilyId}`}
                  className="flex items-center justify-center gap-3 p-6 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-all shadow-lg hover:shadow-xl"
                >
                  <span className="text-3xl">💳</span>
                  <div>
                    <h3 className="text-xl font-bold">Adicionar Saída</h3>
                    <p className="text-sm opacity-90">Registrar nova saída</p>
                  </div>
                </Link>
                <Link
                  href={`/transacoes?family=${selectedFamilyId}`}
                  className="flex items-center justify-center gap-3 p-6 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg hover:shadow-xl"
                >
                  <span className="text-3xl">📋</span>
                  <div>
                    <h3 className="text-xl font-bold">Transações</h3>
                    <p className="text-sm opacity-90">Ver e editar</p>
                  </div>
                </Link>
                <Link
                  href={`/analises?family=${selectedFamilyId}`}
                  className="flex items-center justify-center gap-3 p-6 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl"
                >
                  <span className="text-3xl">📊</span>
                  <div>
                    <h3 className="text-xl font-bold">Ver Análises</h3>
                    <p className="text-sm opacity-90">Relatórios e gráficos</p>
                  </div>
                </Link>
                <Link
                  href={`/metas?family=${selectedFamilyId}`}
                  className="flex items-center justify-center gap-3 p-6 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all shadow-lg hover:shadow-xl"
                >
                  <span className="text-3xl">🎯</span>
                  <div>
                    <h3 className="text-xl font-bold">Metas</h3>
                    <p className="text-sm opacity-90">Ver e gerenciar</p>
                  </div>
                </Link>
              </div>

              {/* Goals Summary */}
              {goals && goals.length > 0 && (
                <div className="border-t pt-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-semibold text-black dark:text-white">
                      🎯 Suas Metas de Economia
                    </h3>
                    <Link
                      href={`/metas?family=${selectedFamilyId}`}
                      className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium"
                    >
                      Ver todas →
                    </Link>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {goals.slice(0, 3).map((goal) => {
                      const current = parseFloat(goal.currentAmount);
                      const target = parseFloat(goal.targetAmount);
                      const progress = Math.min((current / target) * 100, 100);
                      
                      return (
                        <div
                          key={goal.id}
                          className={`bg-white dark:bg-gray-900 rounded-lg shadow-md p-4 ${
                            goal.isCompleted ? 'border-2 border-green-500' : ''
                          }`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-semibold text-gray-900 dark:text-white text-sm">
                              {goal.isEmergencyFund && '🛡️ '}{goal.name}
                            </h4>
                            {goal.isCompleted && (
                              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                ✓
                              </span>
                            )}
                          </div>
                          <div className="mb-3">
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-gray-600 dark:text-gray-400">
                                R$ {current.toFixed(2).replace('.', ',')}
                              </span>
                              <span className="font-semibold text-gray-900 dark:text-white">
                                {progress.toFixed(0)}%
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full transition-all ${
                                  goal.isCompleted ? 'bg-green-500' : 'bg-blue-500'
                                }`}
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            Meta: R$ {target.toFixed(2).replace('.', ',')}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
