'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useEntradas } from '@/lib/hooks/useEntradas';
import { useSaidas } from '@/lib/hooks/useSaidas';
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
  
  // Inicializar datas: primeiro dia do mês até hoje
  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    return firstDay.toISOString().split('T')[0];
  });
  
  const [endDate, setEndDate] = useState(() => {
    const now = new Date();
    return now.toISOString().split('T')[0];
  });

  const { selectedFamily } = useFamily(familyId);
  const { entradas, totalEntrada } = useEntradas(familyId);
  const { saidas, totalSaida } = useSaidas(familyId);

  useEffect(() => {
    if (!familyId) {
      router.push('/dashboard');
    }
  }, [familyId, router]);

  // Filtrar rendas e gastos por data
  const filteredIncomes = useMemo(() => {
    if (!entradas) return [];
    return entradas.filter(entrada => {
      const incomeDate = new Date(entrada.date);
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999); // Incluir o dia inteiro
      return incomeDate >= start && incomeDate <= end;
    });
  }, [entradas, startDate, endDate]);

  const filteredExpenses = useMemo(() => {
    if (!saidas) return [];
    return saidas.filter(saida => {
      const expenseDate = new Date(saida.date);
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999); // Incluir o dia inteiro
      return expenseDate >= start && expenseDate <= end;
    });
  }, [saidas, startDate, endDate]);

  const filteredTotalIncome = filteredIncomes.reduce((sum, entrada) => sum + parseFloat(entrada.amount), 0);
  const filteredTotalExpense = filteredExpenses.reduce((sum, saida) => sum + parseFloat(saida.amount), 0);
  const filteredBalance = filteredTotalIncome - filteredTotalExpense;

  // Preparar dados para o gráfico de linha
  const lineChartData = useMemo(() => {
    const dataByDate: { [key: string]: { entrada: number; saida: number } } = {};
    
    // Agrupar rendas por data
    filteredIncomes.forEach(entrada => {
      const dateKey = new Date(entrada.date).toLocaleDateString('pt-BR');
      if (!dataByDate[dateKey]) {
        dataByDate[dateKey] = { entrada: 0, saida: 0 };
      }
      dataByDate[dateKey].entrada += parseFloat(entrada.amount);
    });
    
    // Agrupar gastos por data
    filteredExpenses.forEach(saida => {
      const dateKey = new Date(saida.date).toLocaleDateString('pt-BR');
      if (!dataByDate[dateKey]) {
        dataByDate[dateKey] = { entrada: 0, saida: 0 };
      }
      dataByDate[dateKey].saida += parseFloat(saida.amount);
    });

    // Ordenar por data
    return Object.entries(dataByDate)
      .sort((a, b) => {
        const [dayA, monthA, yearA] = a[0].split('/').map(Number);
        const [dayB, monthB, yearB] = b[0].split('/').map(Number);
        return new Date(yearA, monthA - 1, dayA).getTime() - new Date(yearB, monthB - 1, dayB).getTime();
      })
      .map(([date, values]) => ({
        date,
        entrada: values.entrada,
        saida: values.saida,
      }));
  }, [filteredIncomes, filteredExpenses]);

  const analyses = useMemo(() => {
    if (!filteredIncomes || !filteredExpenses) return [];

    const periods = getMultiplePeriods(selectedPeriod, 6);
    return periods.map(({ range, label }) =>
      calculatePeriodAnalysis(filteredIncomes, filteredExpenses, range, label)
    );
  }, [filteredIncomes, filteredExpenses, selectedPeriod]);

  const currentPeriodAnalysis = analyses.length > 0 ? analyses[analyses.length - 1] : null;
  const balance = totalEntrada - totalSaida;

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
              title="Rendas no Período"
              value={filteredTotalIncome}
              gradient="from-green-500 to-emerald-600"
            />
            <StatsCard
              title="Gastos no Período"
              value={filteredTotalExpense}
              gradient="from-red-500 to-rose-600"
            />
            <StatsCard
              title="Saldo do Período"
              value={filteredBalance}
              gradient={filteredBalance >= 0 ? 'from-blue-500 to-indigo-600' : 'from-orange-500 to-amber-600'}
            />
          </div>

          {/* Date Range Selector */}
          <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-900">
            <h3 className="font-medium text-base text-black dark:text-zinc-50 mb-3">
              Período do Relatório
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-700 dark:text-gray-300 mb-1 block">
                  Data Inicial
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  max={endDate}
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
                  min={startDate}
                  className="w-full px-3 py-2 text-sm border rounded bg-white dark:bg-gray-800 text-black dark:text-white"
                />
              </div>
            </div>
            <div className="mt-3 flex gap-2 flex-wrap">
              <button
                onClick={() => {
                  const now = new Date();
                  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
                  setStartDate(firstDay.toISOString().split('T')[0]);
                  setEndDate(now.toISOString().split('T')[0]);
                }}
                className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Mês Atual
              </button>
              <button
                onClick={() => {
                  const now = new Date();
                  const firstDay = new Date(now.getFullYear(), 0, 1);
                  setStartDate(firstDay.toISOString().split('T')[0]);
                  setEndDate(now.toISOString().split('T')[0]);
                }}
                className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Ano Atual
              </button>
              <button
                onClick={() => {
                  const now = new Date();
                  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                  const lastDayOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
                  setStartDate(lastMonth.toISOString().split('T')[0]);
                  setEndDate(lastDayOfLastMonth.toISOString().split('T')[0]);
                }}
                className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Mês Passado
              </button>
              <button
                onClick={() => {
                  const now = new Date();
                  const thirtyDaysAgo = new Date(now);
                  thirtyDaysAgo.setDate(now.getDate() - 30);
                  setStartDate(thirtyDaysAgo.toISOString().split('T')[0]);
                  setEndDate(now.toISOString().split('T')[0]);
                }}
                className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Últimos 30 Dias
              </button>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
              Exibindo dados de {new Date(startDate).toLocaleDateString('pt-BR')} até {new Date(endDate).toLocaleDateString('pt-BR')}
            </p>
          </div>

          {/* Gráfico de Linha */}
          <div className="bg-white dark:bg-gray-900 p-6 rounded-lg border border-gray-200 dark:border-gray-800">
            <h3 className="font-medium text-lg text-black dark:text-zinc-50 mb-4">
              📈 Evolução de Rendas e Gastos no Período
            </h3>
            {lineChartData.length > 0 ? (
              <div className="overflow-x-auto">
                <svg viewBox={`0 0 ${Math.max(600, lineChartData.length * 50)} 300`} className="w-full min-w-[600px]">
                  {(() => {
                    const maxValue = Math.max(
                      ...lineChartData.map(item => Math.max(item.entrada, item.saida))
                    );
                    const chartWidth = Math.max(600, lineChartData.length * 50);
                    const chartHeight = 300;
                    const padding = 50;
                    
                    const xStep = (chartWidth - 2 * padding) / (lineChartData.length - 1 || 1);
                    
                    const getY = (value: number) => {
                      return chartHeight - padding - ((value / maxValue) * (chartHeight - 2 * padding));
                    };
                    
                    const incomePoints = lineChartData
                      .map((item, index) => `${padding + index * xStep},${getY(item.entrada)}`)
                      .join(' ');
                    
                    const expensePoints = lineChartData
                      .map((item, index) => `${padding + index * xStep},${getY(item.saida)}`)
                      .join(' ');
                    
                    return (
                      <>
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
                          strokeWidth="3"
                        />
                        
                        {/* Linha de Gastos */}
                        <polyline
                          points={expensePoints}
                          fill="none"
                          stroke="#ef4444"
                          strokeWidth="3"
                        />
                        
                        {/* Pontos */}
                        {lineChartData.map((item, index) => (
                          <g key={index}>
                            <circle
                              cx={padding + index * xStep}
                              cy={getY(item.entrada)}
                              r="5"
                              fill="#10b981"
                            />
                            <circle
                              cx={padding + index * xStep}
                              cy={getY(item.saida)}
                              r="5"
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
                        
                        {/* Labels de valor (eixo Y) */}
                        {[0, 0.25, 0.5, 0.75, 1].map((fraction, idx) => {
                          const value = maxValue * fraction;
                          const y = chartHeight - padding - (fraction * (chartHeight - 2 * padding));
                          return (
                            <text
                              key={`y-label-${idx}`}
                              x={padding - 10}
                              y={y}
                              className="text-xs fill-gray-700 dark:fill-gray-300"
                              textAnchor="end"
                              dominantBaseline="middle"
                            >
                              R$ {value.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                            </text>
                          );
                        })}
                      </>
                    );
                  })()}
                </svg>
                <div className="flex gap-4 justify-center mt-4">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-green-500 rounded" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Rendas</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-red-500 rounded" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Gastos</span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                Nenhum dado disponível para o período selecionado
              </p>
            )}
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
