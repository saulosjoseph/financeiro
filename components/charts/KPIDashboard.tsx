'use client';

import { formatCurrency } from '@/lib/utils/dateAnalysis';
import { BarChart3, TrendingDown, TrendingUp, Target, AlertCircle, CheckCircle2, XCircle, Calendar } from 'lucide-react';

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
      <div className="flex items-center gap-2 mb-6">
        <BarChart3 className="w-6 h-6" />
        <h3 className="text-xl font-bold">Indicadores Chave</h3>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Taxa de Poupança */}
        <div className="bg-white/10 backdrop-blur-sm p-4 rounded-lg">
          <div className="text-xs opacity-80 mb-1">Taxa de Poupança</div>
          <div className="text-3xl font-bold">{data.savingsRate.toFixed(1)}%</div>
          <div className="text-xs mt-2 opacity-75 flex items-center gap-1">
            {data.savingsRate >= 20 ? (
              <><CheckCircle2 className="w-3 h-3" /> Excelente!</>
            ) : data.savingsRate >= 10 ? (
              <><TrendingUp className="w-3 h-3" /> Bom</>
            ) : (
              <><AlertCircle className="w-3 h-3" /> Atenção</>
            )}
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
          <div className="text-xs mt-2 opacity-75 flex items-center gap-1">
            {data.daysToGoal !== undefined 
              ? data.daysToGoal < 0 
                ? <><XCircle className="w-3 h-3" /> Meta não atingível</>
                : data.daysToGoal === 0
                ? <><Target className="w-3 h-3" /> Meta atingida!</>
                : <><Calendar className="w-3 h-3" /> Dias restantes</>
              : 'Sem meta definida'
            }
          </div>
        </div>
      </div>
    </div>
  );
}
