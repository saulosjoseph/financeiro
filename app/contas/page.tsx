'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { CreditCard, Edit, Trash2 } from 'lucide-react';
import { useFamily } from '@/lib/hooks/useFamily';
import { useAccounts } from '@/lib/hooks/useAccounts';
import FamilySelector from '@/components/FamilySelector';
import AccountCard from '@/components/AccountCard';
import AccountForm from '@/components/AccountForm';
import Link from 'next/link';
import { toast } from 'sonner';

export default function ContasPage() {
  const { data: session, status } = useSession();
  const { families } = useFamily();
  const [selectedFamilyId, setSelectedFamilyId] = useState<string | null>(null);
  const { accounts, isLoading, createAccount, updateAccount, deleteAccount } = useAccounts(selectedFamilyId);
  
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<string | null>(null);

  // Auto-select first family
  useEffect(() => {
    if (families && families.length > 0 && !selectedFamilyId) {
      setSelectedFamilyId(families[0].id);
    }
  }, [families, selectedFamilyId]);

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Carregando...</div>
      </div>
    );
  }

  if (!session) {
    redirect('/');
  }

  const activeAccounts = accounts?.filter(acc => acc.isActive) || [];
  const inactiveAccounts = accounts?.filter(acc => !acc.isActive) || [];
  
  const totalBalance = activeAccounts.reduce((sum, acc) => {
    // Não incluir cartões de crédito no total
    if (acc.type === 'credit_card') return sum;
    return sum + (acc.currentBalance || acc.initialBalance);
  }, 0);

  const totalCreditCardDebt = activeAccounts
    .filter(acc => acc.type === 'credit_card')
    .reduce((sum, acc) => {
      const balance = acc.currentBalance || acc.initialBalance;
      return sum + (balance < 0 ? Math.abs(balance) : 0);
    }, 0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const handleCreateAccount = async (data: any) => {
    await createAccount(data);
    setShowCreateForm(false);
  };

  const handleUpdateAccount = async (data: any) => {
    if (editingAccount) {
      await updateAccount(editingAccount, data);
      setEditingAccount(null);
    }
  };

  const handleDeleteAccount = async (accountId: string) => {
    if (confirm('Tem certeza que deseja deletar esta conta? Esta ação não pode ser desfeita.')) {
      try {
        await deleteAccount(accountId);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Erro ao deletar conta');
      }
    }
  };

  const editingAccountData = editingAccount 
    ? accounts?.find(acc => acc.id === editingAccount)
    : undefined;

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
              <div className="flex items-center gap-3 mb-6">
                <CreditCard className="w-7 h-7 text-teal-600 dark:text-teal-400" />
                <h1 className="text-2xl sm:text-3xl font-semibold text-black dark:text-zinc-50">
                  Gerenciar Contas
                </h1>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Gerencie suas contas bancárias, cartões e investimentos
              </p>
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

          <div>
            <h2 className="text-lg font-semibold text-black dark:text-white mb-3">Selecione uma Família</h2>
          <FamilySelector
            families={families}
            selectedFamilyId={selectedFamilyId}
            onSelectFamily={setSelectedFamilyId}
          />
        </div>

        {!selectedFamilyId ? (
          <div className="text-center py-12 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <p className="text-gray-500 dark:text-gray-400">Selecione uma família para gerenciar as contas</p>
          </div>
        ) : (
          <>
            {/* Resumo financeiro */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6 rounded-lg text-white">
                <p className="text-sm opacity-90">Saldo Total</p>
                <p className="text-3xl font-bold mt-2">
                  {formatCurrency(totalBalance)}
                </p>
                <p className="text-xs opacity-75 mt-1">
                  {activeAccounts.filter(a => a.type !== 'credit_card').length} conta(s)
                </p>
              </div>

              <div className="bg-gradient-to-r from-red-500 to-rose-600 p-6 rounded-lg text-white">
                <p className="text-sm opacity-90">Dívida em Cartões</p>
                <p className="text-3xl font-bold mt-2">
                  {formatCurrency(totalCreditCardDebt)}
                </p>
                <p className="text-xs opacity-75 mt-1">
                  {activeAccounts.filter(a => a.type === 'credit_card').length} cartão(ões)
                </p>
              </div>

              <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-6 rounded-lg text-white">
                <p className="text-sm opacity-90">Patrimônio Líquido</p>
                <p className="text-3xl font-bold mt-2">
                  {formatCurrency(totalBalance - totalCreditCardDebt)}
                </p>
                <p className="text-xs opacity-75 mt-1">
                  {activeAccounts.length} conta(s) ativa(s)
                </p>
              </div>
            </div>

            {/* Botão criar conta */}
            {!showCreateForm && !editingAccount && (
              <button
                onClick={() => setShowCreateForm(true)}
                className="w-full p-4 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-400 hover:border-blue-500 hover:text-blue-600 dark:hover:border-blue-400 dark:hover:text-blue-400 transition-colors"
              >
                + Nova Conta
              </button>
            )}

            {/* Formulário de criação */}
            {showCreateForm && (
              <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                <h2 className="text-xl font-semibold text-black dark:text-white mb-4">Criar Nova Conta</h2>
                <AccountForm
                  onSubmit={handleCreateAccount}
                  onCancel={() => setShowCreateForm(false)}
                />
              </div>
            )}

            {/* Formulário de edição */}
            {editingAccount && editingAccountData && (
              <div className="bg-purple-50 dark:bg-purple-950 p-4 rounded-lg">
                <h2 className="text-xl font-semibold text-black dark:text-white mb-4">Editar Conta</h2>
                <AccountForm
                  account={editingAccountData}
                  onSubmit={handleUpdateAccount}
                  onCancel={() => setEditingAccount(null)}
                />
              </div>
            )}

            {/* Lista de contas ativas */}
            {isLoading ? (
              <div className="text-center py-12">
                <div className="text-gray-500 dark:text-gray-400">Carregando contas...</div>
              </div>
            ) : activeAccounts.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <p className="text-gray-500 dark:text-gray-400">Nenhuma conta cadastrada ainda</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                  Crie sua primeira conta para começar
                </p>
              </div>
            ) : (
              <div>
                <h2 className="text-xl font-semibold text-black dark:text-white mb-4">Contas Ativas</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeAccounts.map((account) => (
                    <div key={account.id} className="relative group">
                      <AccountCard account={account} />
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                        <button
                          onClick={() => setEditingAccount(account.id)}
                          className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm shadow-lg"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteAccount(account.id)}
                          className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm shadow-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Contas inativas */}
            {inactiveAccounts.length > 0 && (
              <div className="pt-4 border-t">
                <h2 className="text-xl font-semibold text-gray-500 dark:text-gray-400 mb-4">
                  Contas Inativas
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {inactiveAccounts.map((account) => (
                    <div key={account.id} className="relative group opacity-50">
                      <AccountCard account={account} />
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                        <button
                          onClick={() => setEditingAccount(account.id)}
                          className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm shadow-lg"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteAccount(account.id)}
                          className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm shadow-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
        </div>
      </main>
    </div>
  );
}
