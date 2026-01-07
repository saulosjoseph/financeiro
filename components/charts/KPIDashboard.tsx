'use client';

import { formatCurrency } from '@/lib/utils/dateAnalysis';

interface KPIDashboardProps {
  data: {
    savingsRate: number; // % de economia
    avgDailyExpense: number; // média de gasto diário
    avgTransactionValue: number; // ticket médio
    daysToGoal?: number; // dias para atingir meta
    totalTransactions: number;
  };
}

export default function KPIDashboard({ data }: KPIDashboardProps) {
  return (
    <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-6 rounded-lg shadow-lg text-white">
      <h3 className="text-xl font-bold mb-6">📊 Indicadores Chave</h3>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Taxa de Poupança */}
        <div className="bg-white/10 backdrop-blur-sm p-4 rounded-lg">
          <div className="text-xs opacity-80 mb-1">Taxa de Poupança</div>
          <div className="text-3xl font-bold">{data.savingsRate.toFixed(1)}%</div>
          <div className="text-xs mt-2 opacity-75">
            {data.savingsRate >= 20 ? '🎉 Excelente!' : data.savingsRate >= 10 ? '👍 Bom' : '⚠️ Atenção'}
          </div>
        </div>

        {/* Média Diária */}
        <div className="bg-white/10 backdrop-blur-sm p-4 rounded-lg">
          <div className="text-xs opacity-80 mb-1">Gasto Diário Médio</div>
          <div className="text-2xl font-bold">{formatCurrency(data.avgDailyExpense)}</div>
          <div className="text-xs mt-2 opacity-75">Por dia</div>
        </div>

        {/* Ticket Médio */}
        <div className="bg-white/10 backdrop-blur-sm p-4 rounded-lg">
          <div className="text-xs opacity-80 mb-1">Ticket Médio</div>
          <div className="text-2xl font-bold">{formatCurrency(data.avgTransactionValue)}</div>
          <div className="text-xs mt-2 opacity-75">{data.totalTransactions} transações</div>
        </div>

        {/* Dias para Meta */}
        <div className="bg-white/10 backdrop-blur-sm p-4 rounded-lg">
          <div className="text-xs opacity-80 mb-1">Dias para Meta</div>
          <div className="text-3xl font-bold">
            {data.daysToGoal !== undefined ? data.daysToGoal : '--'}
          </div>
          <div className="text-xs mt-2 opacity-75">
            {data.daysToGoal !== undefined 
              ? data.daysToGoal < 0 
                ? '❌ Meta não atingível' 
                : data.daysToGoal === 0
                ? '🎯 Meta atingida!'
                : '📅 Dias restantes'
              : 'Sem meta definida'
            }
          </div>
        </div>
      </div>
    </div>
  );
}
