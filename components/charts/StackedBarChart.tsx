'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '@/lib/utils/dateAnalysis';

interface StackedBarChartProps {
  data: Array<{
    month: string;
    receitas: number;
    despesas: number;
  }>;
  title: string;
}

export default function StackedBarChartComponent({ data, title }: StackedBarChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-900 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">{title}</h3>
        <p className="text-gray-500 dark:text-gray-400 text-center py-8">Nenhum dado disponível</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">{title}</h3>
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey="month" stroke="#9ca3af" />
          <YAxis 
            tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
            stroke="#9ca3af"
          />
          <Tooltip 
            formatter={(value: number | undefined) => formatCurrency(value || 0)}
            contentStyle={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              border: '1px solid #ccc',
              borderRadius: '4px',
            }}
          />
          <Legend />
          <Bar dataKey="receitas" fill="#10b981" name="Receitas" radius={[8, 8, 0, 0]} />
          <Bar dataKey="despesas" fill="#ef4444" name="Despesas" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
