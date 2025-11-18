'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useIncomes } from '@/lib/hooks/useIncomes';
import { useExpenses } from '@/lib/hooks/useExpenses';
import { useFamily } from '@/lib/hooks/useFamily';
import PeriodSelector from '@/components/PeriodSelector';
import PeriodAnalysisChart from '@/components/PeriodAnalysisChart';
import StatsCard from '@/components/StatsCard';
import {
  PeriodType,
  getMultiplePeriods,
  calculatePeriodAnalysis,
  formatCurrency,
} from '@/lib/utils/dateAnalysis';
import Link from 'next/link';

function AnalysesContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const familyId = searchParams.get('family');

  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('monthly');

  const { selectedFamily } = useFamily(familyId);
  const { incomes, totalIncome } = useIncomes(familyId);
  const { expenses, totalExpense } = useExpenses(familyId);

  useEffect(() => {
    if (!familyId) {
      router.push('/dashboard');
    }
  }, [familyId, router]);

  const analyses = useMemo(() => {
    if (!incomes || !expenses) return [];

    const periods = getMultiplePeriods(selectedPeriod, 6);
    return periods.map(({ range, label }) =>
      calculatePeriodAnalysis(incomes, expenses, range, label)
    );
  }, [incomes, expenses, selectedPeriod]);

  const currentPeriodAnalysis = analyses.length > 0 ? analyses[analyses.length - 1] : null;
  const balance = totalIncome - totalExpense;

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
                📊 Análises {selectedFamily && `- ${selectedFamily.name}`}
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

          {/* Overall Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatsCard
              title="Total de Rendas"
              value={totalIncome}
              gradient="from-green-500 to-emerald-600"
            />
            <StatsCard
              title="Total de Gastos"
              value={totalExpense}
              gradient="from-red-500 to-rose-600"
            />
            <StatsCard
              title="Saldo Total"
              value={balance}
              gradient={balance >= 0 ? 'from-blue-500 to-indigo-600' : 'from-orange-500 to-amber-600'}
            />
          </div>

          {/* Current Period Summary */}
          {currentPeriodAnalysis && (
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-6 rounded-lg text-white">
              <p className="text-sm opacity-90">Período Atual ({currentPeriodAnalysis.period})</p>
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div>
                  <p className="text-xs opacity-75">Rendas</p>
                  <p className="text-xl font-bold">{formatCurrency(currentPeriodAnalysis.totalIncome)}</p>
                </div>
                <div>
                  <p className="text-xs opacity-75">Gastos</p>
                  <p className="text-xl font-bold">{formatCurrency(currentPeriodAnalysis.totalExpense)}</p>
                </div>
                <div>
                  <p className="text-xs opacity-75">Saldo</p>
                  <p className="text-xl font-bold">{formatCurrency(currentPeriodAnalysis.balance)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Period Selector */}
          <div>
            <h3 className="font-medium text-base text-black dark:text-zinc-50 mb-3">
              Selecione o Período de Análise
            </h3>
            <PeriodSelector
              selectedPeriod={selectedPeriod}
              onSelectPeriod={setSelectedPeriod}
            />
          </div>

          {/* Analysis Chart */}
          <div className="bg-gray-50 dark:bg-gray-900 p-6 rounded-lg">
            <h3 className="font-medium text-lg text-black dark:text-zinc-50 mb-4">
              Histórico - {selectedPeriod === 'weekly' ? 'Semanal' :
                selectedPeriod === 'biweekly' ? 'Quinzenal' :
                selectedPeriod === 'monthly' ? 'Mensal' :
                selectedPeriod === 'bimonthly' ? 'Bimestral' :
                selectedPeriod === 'quarterly' ? 'Trimestral' :
                selectedPeriod === 'semiannual' ? 'Semestral' : 'Anual'}
            </h3>
            <PeriodAnalysisChart analyses={analyses} />
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg border border-green-200 dark:border-green-900">
              <h4 className="font-medium text-sm text-green-900 dark:text-green-100 mb-2">
                Média de Rendas por Período
              </h4>
              <p className="text-2xl font-bold text-green-700 dark:text-green-400">
                {formatCurrency(
                  analyses.reduce((sum, a) => sum + a.totalIncome, 0) / (analyses.length || 1)
                )}
              </p>
            </div>
            <div className="bg-red-50 dark:bg-red-950 p-4 rounded-lg border border-red-200 dark:border-red-900">
              <h4 className="font-medium text-sm text-red-900 dark:text-red-100 mb-2">
                Média de Gastos por Período
              </h4>
              <p className="text-2xl font-bold text-red-700 dark:text-red-400">
                {formatCurrency(
                  analyses.reduce((sum, a) => sum + a.totalExpense, 0) / (analyses.length || 1)
                )}
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function AnalysesPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
        <p className="text-lg">Carregando...</p>
      </div>
    }>
      <AnalysesContent />
    </Suspense>
  );
}
