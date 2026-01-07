'use client';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '@/lib/utils/dateAnalysis';

interface BalanceAreaChartProps {
  data: Array<{
    date: string;
    balance: number;
  }>;
  title: string;
}

export default function BalanceAreaChart({ data, title }: BalanceAreaChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-900 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">{title}</h3>
        <p className="text-gray-500 dark:text-gray-400 text-center py-8">Nenhum dado disponível</p>
      </div>
    );
  }

  const isPositive = data[data.length - 1]?.balance >= 0;

  return (
    <div className="bg-white dark:bg-gray-900 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={isPositive ? "#10b981" : "#ef4444"} stopOpacity={0.8}/>
              <stop offset="95%" stopColor={isPositive ? "#10b981" : "#ef4444"} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey="date" stroke="#9ca3af" />
          <YAxis 
            tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
            stroke="#9ca3af"
          />
          <Tooltip 
            formatter={(value: number) => formatCurrency(value)}
            contentStyle={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              border: '1px solid #ccc',
              borderRadius: '4px',
            }}
          />
          <Area 
            type="monotone" 
            dataKey="balance" 
            stroke={isPositive ? "#10b981" : "#ef4444"}
            fillOpacity={1} 
            fill="url(#colorBalance)" 
            name="Saldo Acumulado"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
