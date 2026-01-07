'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { formatCurrency } from '@/lib/utils/dateAnalysis';

interface TopExpensesBarChartProps {
  data: Array<{
    description: string;
    amount: number;
    date: string;
    tag?: string;
  }>;
  title: string;
  limit?: number;
}

export default function TopExpensesBarChart({ data, title, limit = 10 }: TopExpensesBarChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-900 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">{title}</h3>
        <p className="text-gray-500 dark:text-gray-400 text-center py-8">Nenhum dado disponível</p>
      </div>
    );
  }

  const sortedData = [...data]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit)
    .map(item => ({
      name: item.description.length > 25 ? item.description.substring(0, 25) + '...' : item.description,
      value: item.amount,
      fullName: item.description,
      date: new Date(item.date).toLocaleDateString('pt-BR'),
      tag: item.tag || 'Sem categoria',
    }));

  return (
    <div className="bg-white dark:bg-gray-900 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">{title}</h3>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={sortedData} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis 
            type="number"
            tickFormatter={(value) => `R$ ${value.toLocaleString('pt-BR')}`}
            stroke="#9ca3af"
          />
          <YAxis 
            dataKey="name" 
            type="category" 
            width={150}
            stroke="#9ca3af"
          />
          <Tooltip 
            formatter={(value: number | undefined) => formatCurrency(value || 0)}
            labelFormatter={(label) => {
              const item = sortedData.find(d => d.name === label);
              return item?.fullName || label;
            }}
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                return (
                  <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded shadow-lg">
                    <p className="font-semibold text-gray-900 dark:text-white">{data.fullName}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Data: {data.date}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Categoria: {data.tag}</p>
                    <p className="text-lg font-bold text-red-600 dark:text-red-400 mt-1">
                      {formatCurrency(data.value)}
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Bar dataKey="value" radius={[0, 8, 8, 0]}>
            {sortedData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={`hsl(${(index * 30) % 360}, 70%, 50%)`} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
