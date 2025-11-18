'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFamily } from '@/lib/hooks/useFamily';
import { useIncomes } from '@/lib/hooks/useIncomes';
import { useExpenses } from '@/lib/hooks/useExpenses';
import FamilySelector from '@/components/FamilySelector';
import CreateFamilyForm from '@/components/CreateFamilyForm';
import StatsCard from '@/components/StatsCard';
import Link from 'next/link';

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [selectedFamilyId, setSelectedFamilyId] = useState<string | null>(null);
  const [showAddMember, setShowAddMember] = useState(false);
  const [memberEmail, setMemberEmail] = useState('');
  const [isAddingMember, setIsAddingMember] = useState(false);

  const { families, selectedFamily, mutate: mutateFamilies } = useFamily(selectedFamilyId);
  const { totalIncome } = useIncomes(selectedFamilyId);
  const { totalExpense } = useExpenses(selectedFamilyId);

  const balance = totalIncome - totalExpense;
  const isAdmin = selectedFamily?.members.find(m => m.user.id === session?.user?.id)?.role === 'admin';

  // Save selected family to localStorage
  useEffect(() => {
    if (selectedFamilyId) {
      localStorage.setItem('selectedFamilyId', selectedFamilyId);
    }
  }, [selectedFamilyId]);

  // Load selected family from localStorage on mount
  useEffect(() => {
    const savedFamilyId = localStorage.getItem('selectedFamilyId');
    if (savedFamilyId && families?.find(f => f.id === savedFamilyId)) {
      setSelectedFamilyId(savedFamilyId);
    }
  }, [families]);

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

          {/* Create Family */}
          <CreateFamilyForm onSuccess={mutateFamilies} />

          {/* Family Selection */}
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

          {/* Dashboard Content */}
          {selectedFamilyId && selectedFamily && (
            <div className="border-t pt-6 space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <h2 className="text-xl sm:text-2xl font-semibold text-black dark:text-white">
                  {selectedFamily.name}
                </h2>
                {isAdmin && (
                  <button
                    onClick={() => setShowAddMember(!showAddMember)}
                    className="px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 whitespace-nowrap"
                  >
                    {showAddMember ? 'Cancelar' : '+ Adicionar Membro'}
                  </button>
                )}
              </div>

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

              {/* Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatsCard
                  title="Rendas Totais"
                  value={totalIncome}
                  gradient="from-green-500 to-emerald-600"
                />
                <StatsCard
                  title="Gastos Totais"
                  value={totalExpense}
                  gradient="from-red-500 to-rose-600"
                />
                <StatsCard
                  title="Saldo"
                  value={balance}
                  gradient={balance >= 0 ? 'from-blue-500 to-indigo-600' : 'from-orange-500 to-amber-600'}
                />
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Link
                  href={`/rendas?family=${selectedFamilyId}`}
                  className="flex items-center justify-center gap-3 p-6 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
                >
                  <span className="text-3xl">💵</span>
                  <div>
                    <h3 className="text-xl font-bold">Adicionar Renda</h3>
                    <p className="text-sm opacity-90">Registrar nova entrada</p>
                  </div>
                </Link>
                <Link
                  href={`/gastos?family=${selectedFamilyId}`}
                  className="flex items-center justify-center gap-3 p-6 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-all shadow-lg hover:shadow-xl"
                >
                  <span className="text-3xl">💳</span>
                  <div>
                    <h3 className="text-xl font-bold">Adicionar Gasto</h3>
                    <p className="text-sm opacity-90">Registrar nova saída</p>
                  </div>
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
