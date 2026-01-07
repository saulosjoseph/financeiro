'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Repeat } from 'lucide-react';
import { useTransfers } from '@/lib/hooks/useTransfers';
import { useAccounts } from '@/lib/hooks/useAccounts';
import { useFamily } from '@/lib/hooks/useFamily';
import AccountSelector from '@/components/AccountSelector';
import Link from 'next/link';
import { formatCurrency, parseCurrency } from '@/lib/utils/currencyMask';
import { toast } from 'sonner';

function TransferenciasContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const familyId = searchParams.get('family');

  const [fromAccountId, setFromAccountId] = useState<string | null>(null);
  const [toAccountId, setToAccountId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isCreating, setIsCreating] = useState(false);

  const { selectedFamily } = useFamily(familyId);
  const { accounts } = useAccounts(familyId);
  const { transfers, isLoading, mutate } = useTransfers(familyId);

  useEffect(() => {
    if (!familyId) {
      router.push('/dashboard');
    }
  }, [familyId, router]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '') {
      setAmount('');
      return;
    }
    const formatted = formatCurrency(value);
    setAmount(formatted);
  };

  const handleCreateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !familyId || !fromAccountId || !toAccountId) {
      toast.error('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    if (fromAccountId === toAccountId) {
      toast.error('As contas de origem e destino devem ser diferentes');
      return;
    }

    setIsCreating(true);

    try {
      const response = await fetch(`/api/families/${familyId}/transfers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromAccountId,
          toAccountId,
          amount: parseFloat(parseCurrency(amount)),
          description,
          date: new Date(date).toISOString(),
        }),
      });

      if (response.ok) {
        setAmount('');
        setDescription('');
        setFromAccountId(null);
        setToAccountId(null);
        setDate(new Date().toISOString().split('T')[0]);
        await mutate();
        toast.success('Transferência criada com sucesso!');
      } else {
        const error = await response.json();
        toast.error(`Erro ao criar transferência: ${error.error}`);
      }
    } catch (error) {
      toast.error('Erro ao criar transferência');
      console.error(error);
    } finally {
      setIsCreating(false);
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
              <div className="flex items-center gap-3 border-b pb-4">
                <Repeat className="w-7 h-7 text-cyan-600 dark:text-cyan-400" />
                <h1 className="text-2xl sm:text-3xl font-semibold text-black dark:text-zinc-50">
                  Transferências {selectedFamily && `- ${selectedFamily.name}`}
                </h1>
              </div>
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

          {/* Create Transfer Form */}
          <form onSubmit={handleCreateTransfer} className="bg-cyan-50 dark:bg-cyan-950 p-4 rounded-lg space-y-4">
            <h3 className="font-medium text-base text-black dark:text-zinc-50">Nova Transferência</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-700 dark:text-gray-300 mb-1 block">
                  Conta de Origem *
                </label>
                <AccountSelector
                  accounts={accounts || []}
                  selectedAccountId={fromAccountId}
                  onChange={setFromAccountId}
                  disabled={isCreating}
                />
              </div>
              <div>
                <label className="text-xs text-gray-700 dark:text-gray-300 mb-1 block">
                  Conta de Destino *
                </label>
                <AccountSelector
                  accounts={accounts || []}
                  selectedAccountId={toAccountId}
                  onChange={setToAccountId}
                  disabled={isCreating}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-700 dark:text-gray-300 mb-1 block">
                  Valor *
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="R$ 0,00"
                  value={amount}
                  onChange={handleAmountChange}
                  required
                  className="w-full px-3 py-2 text-sm border rounded bg-white dark:bg-gray-800 text-black dark:text-white"
                />
              </div>
              <div>
                <label className="text-xs text-gray-700 dark:text-gray-300 mb-1 block">
                  Data *
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
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
                placeholder="Descrição da transferência (opcional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 text-sm border rounded bg-white dark:bg-gray-800 text-black dark:text-white"
              />
            </div>

            <button
              type="submit"
              disabled={isCreating || !fromAccountId || !toAccountId}
              className="w-full py-2 bg-cyan-600 text-white rounded hover:bg-cyan-700 disabled:bg-gray-400 font-medium"
            >
              {isCreating ? 'Criando...' : 'Criar Transferência'}
            </button>
          </form>

          {/* Transfer History */}
          <div>
            <h3 className="font-medium text-base text-black dark:text-zinc-50 mb-3">
              Histórico de Transferências
            </h3>
            {isLoading ? (
              <p className="text-center py-8 text-gray-500">Carregando...</p>
            ) : !transfers || transfers.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <p className="text-gray-500 dark:text-gray-400">
                  Nenhuma transferência registrada ainda
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {transfers.map((transfer) => (
                  <div
                    key={transfer.id}
                    className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {transfer.fromAccount && (
                            <>
                              <span
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: transfer.fromAccount.color }}
                              />
                              <span className="text-sm font-medium text-black dark:text-white">
                                {transfer.fromAccount.name}
                              </span>
                            </>
                          )}
                          <span className="text-gray-500">→</span>
                          {transfer.toAccount && (
                            <>
                              <span
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: transfer.toAccount.color }}
                              />
                              <span className="text-sm font-medium text-black dark:text-white">
                                {transfer.toAccount.name}
                              </span>
                            </>
                          )}
                        </div>
                        {transfer.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                            {transfer.description}
                          </p>
                        )}
                        <p className="text-xs text-gray-500 dark:text-gray-500">
                          {new Date(transfer.date).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-cyan-600 dark:text-cyan-400">
                          R$ {transfer.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function TransferenciasPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
        <p className="text-lg">Carregando...</p>
      </div>
    }>
      <TransferenciasContent />
    </Suspense>
  );
}
