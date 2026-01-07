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
import CategoryPieChart from '@/components/charts/CategoryPieChart';
import TopExpensesBarChart from '@/components/charts/TopExpensesBarChart';
import StackedBarChart from '@/components/charts/StackedBarChart';
import BalanceAreaChart from '@/components/charts/BalanceAreaChart';
import TrendLineChart from '@/components/charts/TrendLineChart';
import HeatmapChart from '@/components/charts/HeatmapChart';
import WaterfallChart from '@/components/charts/WaterfallChart';
import KPIDashboard from '@/components/charts/KPIDashboard';
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
  const { entradas, totalGeral: totalEntrada } = useEntradas(familyId);
  const { saidas, totalGeral: totalSaida } = useSaidas(familyId);

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

  // Data for Category Pie Chart (Expenses by Tag)
  const expensesByCategory = useMemo(() => {
    if (!filteredExpenses) return [];
    const categoryMap = new Map<string, number>();
    
    filteredExpenses.forEach(expense => {
      const category = expense.tag || 'Sem categoria';
      categoryMap.set(category, (categoryMap.get(category) || 0) + parseFloat(expense.amount));
    });
    
    return Array.from(categoryMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredExpenses]);

  // Data for Income Pie Chart
  const incomesBySource = useMemo(() => {
    if (!filteredIncomes) return [];
    const sourceMap = new Map<string, number>();
    
    filteredIncomes.forEach(income => {
      const source = income.description || 'Sem descrição';
      sourceMap.set(source, (sourceMap.get(source) || 0) + parseFloat(income.amount));
    });
    
    return Array.from(sourceMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8); // Top 8 sources
  }, [filteredIncomes]);

  // Data for Monthly Stacked Bar Chart
  const monthlyData = useMemo(() => {
    if (!filteredIncomes || !filteredExpenses) return [];
    
    const monthMap = new Map<string, { receitas: number; despesas: number }>();
    
    filteredIncomes.forEach(income => {
      const month = new Date(income.date).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      const data = monthMap.get(month) || { receitas: 0, despesas: 0 };
      data.receitas += parseFloat(income.amount);
      monthMap.set(month, data);
    });
    
    filteredExpenses.forEach(expense => {
      const month = new Date(expense.date).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      const data = monthMap.get(month) || { receitas: 0, despesas: 0 };
      data.despesas += parseFloat(expense.amount);
      monthMap.set(month, data);
    });
    
    return Array.from(monthMap.entries())
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => {
        const [monthA, yearA] = a.month.split('/');
        const [monthB, yearB] = b.month.split('/');
        return new Date(`20${yearA}-${monthA}-01`).getTime() - new Date(`20${yearB}-${monthB}-01`).getTime();
      });
  }, [filteredIncomes, filteredExpenses]);

  // Data for Balance Area Chart
  const balanceData = useMemo(() => {
    if (!filteredIncomes || !filteredExpenses) return [];
    
    const dateMap = new Map<string, { entrada: number; saida: number }>();
    
    filteredIncomes.forEach(income => {
      const date = new Date(income.date).toLocaleDateString('pt-BR');
      const data = dateMap.get(date) || { entrada: 0, saida: 0 };
      data.entrada += parseFloat(income.amount);
      dateMap.set(date, data);
    });
    
    filteredExpenses.forEach(expense => {
      const date = new Date(expense.date).toLocaleDateString('pt-BR');
      const data = dateMap.get(date) || { entrada: 0, saida: 0 };
      data.saida += parseFloat(expense.amount);
      dateMap.set(date, data);
    });
    
    let cumulativeBalance = 0;
    return Array.from(dateMap.entries())
      .sort((a, b) => {
        const [dayA, monthA, yearA] = a[0].split('/').map(Number);
        const [dayB, monthB, yearB] = b[0].split('/').map(Number);
        return new Date(yearA, monthA - 1, dayA).getTime() - new Date(yearB, monthB - 1, dayB).getTime();
      })
      .map(([date, data]) => {
        cumulativeBalance += data.entrada - data.saida;
        return { date, balance: cumulativeBalance };
      });
  }, [filteredIncomes, filteredExpenses]);

  // Data for Trend Line Chart with Moving Average
  const trendData = useMemo(() => {
    if (!filteredExpenses) return [];
    
    const dateMap = new Map<string, number>();
    filteredExpenses.forEach(expense => {
      const date = new Date(expense.date).toLocaleDateString('pt-BR');
      dateMap.set(date, (dateMap.get(date) || 0) + parseFloat(expense.amount));
    });
    
    const sortedData = Array.from(dateMap.entries())
      .sort((a, b) => {
        const [dayA, monthA, yearA] = a[0].split('/').map(Number);
        const [dayB, monthB, yearB] = b[0].split('/').map(Number);
        return new Date(yearA, monthA - 1, dayA).getTime() - new Date(yearB, monthB - 1, dayB).getTime();
      });
    
    // Calculate 7-day moving average
    return sortedData.map(([date, value], index) => {
      const window = sortedData.slice(Math.max(0, index - 6), index + 1);
      const movingAverage = window.reduce((sum, [, val]) => sum + val, 0) / window.length;
      return { date, value, movingAverage };
    });
  }, [filteredExpenses]);

  // Data for Heatmap (Expenses by Day and Hour)
  const heatmapData = useMemo(() => {
    if (!filteredExpenses) return [];
    
    const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const heatMap = new Map<string, { amount: number; count: number }>();
    
    filteredExpenses.forEach(expense => {
      const date = new Date(expense.date);
      const dayOfWeek = DAYS[date.getDay()];
      const hour = date.getHours();
      const key = `${dayOfWeek}-${hour}`;
      
      const data = heatMap.get(key) || { amount: 0, count: 0 };
      data.amount += parseFloat(expense.amount);
      data.count += 1;
      heatMap.set(key, data);
    });
    
    return Array.from(heatMap.entries()).map(([key, data]) => {
      const [dayOfWeek, hourStr] = key.split('-');
      return { dayOfWeek, hour: parseInt(hourStr), ...data };
    });
  }, [filteredExpenses]);

  // Data for Waterfall Chart
  const waterfallData = useMemo(() => {
    return {
      initialBalance: 0, // Could be fetched from account balance
      incomes: filteredTotalIncome,
      expenses: filteredTotalExpense,
      finalBalance: filteredBalance,
    };
  }, [filteredTotalIncome, filteredTotalExpense, filteredBalance]);

  // Data for KPI Dashboard
  const kpiData = useMemo(() => {
    const totalTransactions = (filteredIncomes?.length || 0) + (filteredExpenses?.length || 0);
    const daysInPeriod = Math.ceil(
      (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)
    ) || 1;
    
    return {
      savingsRate: filteredTotalIncome > 0 ? ((filteredTotalIncome - filteredTotalExpense) / filteredTotalIncome) * 100 : 0,
      avgDailyExpense: filteredTotalExpense / daysInPeriod,
      avgTransactionValue: totalTransactions > 0 ? (filteredTotalIncome + filteredTotalExpense) / totalTransactions : 0,
      daysToGoal: undefined, // Can be calculated if goal is defined
      totalTransactions,
    };
  }, [filteredIncomes, filteredExpenses, filteredTotalIncome, filteredTotalExpense, startDate, endDate]);

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

          {/* KPI Dashboard */}
          <KPIDashboard data={kpiData} />

          {/* Charts Grid - First Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CategoryPieChart 
              data={expensesByCategory} 
              title="💰 Gastos por Categoria"
            />
            <CategoryPieChart 
              data={incomesBySource} 
              title="📈 Receitas por Fonte"
            />
          </div>

          {/* Waterfall Chart */}
          <WaterfallChart 
            data={waterfallData} 
            title="🌊 Fluxo de Caixa (Waterfall)"
          />

          {/* Charts Grid - Second Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TopExpensesBarChart 
              data={filteredExpenses} 
              title="🔝 Top 10 Maiores Gastos"
              limit={10}
            />
            <BalanceAreaChart 
              data={balanceData} 
              title="📊 Evolução do Saldo Acumulado"
            />
          </div>

          {/* Monthly Comparison */}
          <StackedBarChart 
            data={monthlyData} 
            title="📅 Receitas vs Despesas por Mês"
          />

          {/* Trend Analysis */}
          <TrendLineChart 
            data={trendData} 
            title="📉 Tendência de Gastos com Média Móvel"
            dataKey="Gastos Diários"
            color="#ef4444"
          />

          {/* Heatmap */}
          <HeatmapChart 
            data={heatmapData} 
            title="🔥 Mapa de Calor - Gastos por Dia da Semana e Hora"
          />

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
