'use client';

import { Account } from '@/lib/hooks/useAccounts';

interface AccountCardProps {
  account: Account;
  onClick?: () => void;
}

export default function AccountCard({ account, onClick }: AccountCardProps) {
  const balance = account.currentBalance || account.initialBalance;
  const isCreditCard = account.type === 'credit_card';
  const isNegative = balance < 0;
  
  // Para cartão de crédito, mostrar utilização do limite
  const creditUtilization = isCreditCard && account.creditLimit
    ? (Math.abs(balance) / account.creditLimit) * 100
    : 0;

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      checking: 'Conta Corrente',
      savings: 'Poupança',
      cash: 'Dinheiro',
      credit_card: 'Cartão de Crédito',
      investment: 'Investimento',
    };
    return labels[type] || type;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(Math.abs(value));
  };

  return (
    <div
      onClick={onClick}
      className={`p-4 rounded-lg border-2 transition-all ${
        onClick ? 'cursor-pointer hover:shadow-lg hover:-translate-y-1' : ''
      }`}
      style={{ borderColor: account.color }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{account.icon}</span>
          <div>
            <h3 className="font-semibold text-gray-900">{account.name}</h3>
            <p className="text-xs text-gray-500">{getTypeLabel(account.type)}</p>
          </div>
        </div>
        {account.isDefault && (
          <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
            Padrão
          </span>
        )}
      </div>

      <div className="space-y-2">
        <div>
          <p className="text-xs text-gray-500 mb-1">
            {isCreditCard ? 'Fatura Atual' : 'Saldo'}
          </p>
          <p
            className={`text-2xl font-bold ${
              isCreditCard
                ? isNegative
                  ? 'text-red-600'
                  : 'text-green-600'
                : isNegative
                ? 'text-red-600'
                : 'text-gray-900'
            }`}
          >
            {isCreditCard && isNegative ? '-' : ''}
            {formatCurrency(balance)}
          </p>
        </div>

        {isCreditCard && account.creditLimit && (
          <div>
            <div className="flex justify-between text-xs text-gray-600 mb-1">
              <span>Limite disponível</span>
              <span>{creditUtilization.toFixed(0)}% usado</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  creditUtilization > 80
                    ? 'bg-red-500'
                    : creditUtilization > 50
                    ? 'bg-yellow-500'
                    : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(creditUtilization, 100)}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Limite: {formatCurrency(account.creditLimit)}
            </p>
          </div>
        )}

        {account.description && (
          <p className="text-sm text-gray-600 pt-2 border-t border-gray-200">
            {account.description}
          </p>
        )}

        <div className="flex gap-4 text-xs text-gray-500 pt-2 border-t border-gray-200">
          <span>📈 {account.entradasCount || 0} entradas</span>
          <span>📉 {account.saidasCount || 0} saídas</span>
        </div>
      </div>
    </div>
  );
}
