'use client';

import useSWR from 'swr';
import { useState } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';

interface User {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
}

interface FamilyMember {
  id: string;
  role: string;
  user: User;
}

interface Family {
  id: string;
  name: string;
  members: FamilyMember[];
  _count: {
    incomes: number;
  };
}

interface Income {
  id: string;
  amount: string;
  description: string | null;
  source: string | null;
  date: string;
  user: User;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function Home() {
  const { data: session, status } = useSession();
  const { data: families, mutate: mutateFamilies } = useSWR<Family[]>('/api/families', fetcher);
  const [selectedFamily, setSelectedFamily] = useState<string | null>(null);
  const { data: incomes, mutate: mutateIncomes } = useSWR<Income[]>(
    selectedFamily ? `/api/families/${selectedFamily}/incomes` : null,
    fetcher
  );

  // Estados para criar família
  const [familyName, setFamilyName] = useState('');
  const [isCreatingFamily, setIsCreatingFamily] = useState(false);

  // Estados para adicionar renda
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [source, setSource] = useState('');
  const [isAddingIncome, setIsAddingIncome] = useState(false);

  // Estados para adicionar membro
  const [memberEmail, setMemberEmail] = useState('');
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);

  const handleCreateFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!familyName.trim()) return;
    setIsCreatingFamily(true);

    try {
      const response = await fetch('/api/families', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: familyName }),
      });

      if (response.ok) {
        setFamilyName('');
        mutateFamilies();
      } else {
        alert('Erro ao criar família');
      }
    } catch (error) {
      alert('Erro ao criar família');
    } finally {
      setIsCreatingFamily(false);
    }
  };

  const handleAddIncome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !selectedFamily) return;
    setIsAddingIncome(true);

    try {
      const response = await fetch(`/api/families/${selectedFamily}/incomes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(amount),
          description,
          source,
        }),
      });

      if (response.ok) {
        setAmount('');
        setDescription('');
        setSource('');
        mutateIncomes();
        mutateFamilies();
      } else {
        alert('Erro ao adicionar renda');
      }
    } catch (error) {
      alert('Erro ao adicionar renda');
    } finally {
      setIsAddingIncome(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberEmail.trim() || !selectedFamily) return;
    setIsAddingMember(true);

    try {
      const response = await fetch(`/api/families/${selectedFamily}/members`, {
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

  const getTotalIncome = () => {
    if (!incomes || !Array.isArray(incomes)) return 0;
    return incomes.reduce((sum, income) => sum + parseFloat(income.amount), 0);
  };

  const currentFamily = Array.isArray(families) ? families.find(f => f.id === selectedFamily) : undefined;
  const isAdmin = currentFamily?.members.find(m => m.user.id === session?.user?.id)?.role === 'admin';

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
            🚀 Financeiro App
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
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-4xl flex-col py-16 px-8 bg-white dark:bg-black">
        <div className="flex flex-col gap-6 w-full">
          {/* Header */}
          <div className="flex justify-between items-center border-b pb-4">
            <h1 className="text-3xl font-semibold text-black dark:text-zinc-50">
              💰 Financeiro Familiar
            </h1>
            <div className="flex items-center gap-4">
              {session.user?.image && (
                <img
                  src={session.user.image}
                  alt={session.user.name || 'User'}
                  className="w-10 h-10 rounded-full"
                />
              )}
              <div className="text-right">
                <p className="text-sm font-medium text-black dark:text-white">
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

          {/* Criar Família */}
          <form onSubmit={handleCreateFamily} className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
            <h3 className="font-medium text-black dark:text-zinc-50 mb-3">Criar Nova Família</h3>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Nome da família"
                value={familyName}
                onChange={(e) => setFamilyName(e.target.value)}
                required
                className="flex-1 px-3 py-2 border rounded bg-white dark:bg-gray-800 text-black dark:text-white"
              />
              <button
                type="submit"
                disabled={isCreatingFamily}
                className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
              >
                {isCreatingFamily ? 'Criando...' : 'Criar'}
              </button>
            </div>
          </form>

          {/* Lista de Famílias */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.isArray(families) && families.map((family) => (
              <button
                key={family.id}
                onClick={() => setSelectedFamily(family.id)}
                className={`p-4 rounded-lg border-2 text-left transition-colors ${
                  selectedFamily === family.id
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-950'
                    : 'border-gray-200 dark:border-gray-700 hover:border-blue-400'
                }`}
              >
                <h3 className="font-semibold text-lg text-black dark:text-white">{family.name}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {family.members.length} membro(s)
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {family._count.incomes} renda(s)
                </p>
              </button>
            ))}
            {(!families || !Array.isArray(families) || families.length === 0) && (
              <p className="text-gray-500 dark:text-gray-400 col-span-3 text-center py-8">
                Nenhuma família criada ainda
              </p>
            )}
          </div>

          {/* Detalhes da Família Selecionada */}
          {selectedFamily && currentFamily && (
            <div className="border-t pt-6 space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-semibold text-black dark:text-white">
                  {currentFamily.name}
                </h2>
                {isAdmin && (
                  <button
                    onClick={() => setShowAddMember(!showAddMember)}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    {showAddMember ? 'Cancelar' : 'Adicionar Membro'}
                  </button>
                )}
              </div>

              {/* Formulário Adicionar Membro */}
              {showAddMember && (
                <form onSubmit={handleAddMember} className="bg-green-50 dark:bg-green-950 p-4 rounded-lg">
                  <h3 className="font-medium text-black dark:text-zinc-50 mb-3">
                    Adicionar Membro por Email
                  </h3>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      placeholder="email@exemplo.com"
                      value={memberEmail}
                      onChange={(e) => setMemberEmail(e.target.value)}
                      required
                      className="flex-1 px-3 py-2 border rounded bg-white dark:bg-gray-800 text-black dark:text-white"
                    />
                    <button
                      type="submit"
                      disabled={isAddingMember}
                      className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
                    >
                      {isAddingMember ? 'Adicionando...' : 'Adicionar'}
                    </button>
                  </div>
                </form>
              )}

              {/* Membros */}
              <div>
                <h3 className="font-medium text-black dark:text-zinc-50 mb-3">Membros</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {currentFamily.members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded"
                    >
                      {member.user.image && (
                        <img
                          src={member.user.image}
                          alt={member.user.name || ''}
                          className="w-10 h-10 rounded-full"
                        />
                      )}
                      <div className="flex-1">
                        <p className="font-medium text-black dark:text-white">
                          {member.user.name || 'Sem nome'}
                          {member.role === 'admin' && (
                            <span className="ml-2 text-xs bg-blue-600 text-white px-2 py-1 rounded">
                              Admin
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {member.user.email}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Adicionar Renda */}
              <form onSubmit={handleAddIncome} className="bg-purple-50 dark:bg-purple-950 p-4 rounded-lg space-y-3">
                <h3 className="font-medium text-black dark:text-zinc-50">Adicionar Renda</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Valor (R$)"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    className="px-3 py-2 border rounded bg-white dark:bg-gray-800 text-black dark:text-white"
                  />
                  <input
                    type="text"
                    placeholder="Origem (ex: Salário)"
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    className="px-3 py-2 border rounded bg-white dark:bg-gray-800 text-black dark:text-white"
                  />
                </div>
                <input
                  type="text"
                  placeholder="Descrição (opcional)"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border rounded bg-white dark:bg-gray-800 text-black dark:text-white"
                />
                <button
                  type="submit"
                  disabled={isAddingIncome}
                  className="w-full px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-400"
                >
                  {isAddingIncome ? 'Adicionando...' : 'Adicionar Renda'}
                </button>
              </form>

              {/* Renda Total */}
              <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6 rounded-lg text-white">
                <p className="text-sm opacity-90">Renda Familiar Total</p>
                <p className="text-4xl font-bold mt-2">
                  R$ {getTotalIncome().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>

              {/* Lista de Rendas */}
              <div>
                <h3 className="font-medium text-black dark:text-zinc-50 mb-3">Rendas Registradas</h3>
                <div className="space-y-3">
                  {Array.isArray(incomes) && incomes.map((income) => (
                    <div
                      key={income.id}
                      className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            {income.user.image && (
                              <img
                                src={income.user.image}
                                alt={income.user.name || ''}
                                className="w-8 h-8 rounded-full"
                              />
                            )}
                            <div>
                              <p className="font-semibold text-lg text-black dark:text-white">
                                R$ {parseFloat(income.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {income.user.name} • {income.source || 'Sem origem'}
                              </p>
                            </div>
                          </div>
                          {income.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                              {income.description}
                            </p>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-500">
                          {new Date(income.date).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                  ))}
                  {(!incomes || !Array.isArray(incomes) || incomes.length === 0) && (
                    <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                      Nenhuma renda registrada ainda
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
