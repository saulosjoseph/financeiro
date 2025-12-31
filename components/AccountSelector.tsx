'use client';

import { Account } from '@/lib/hooks/useAccounts';

interface AccountSelectorProps {
  accounts: Account[] | undefined;
  selectedAccountId: string | null;
  onChange: (accountId: string) => void;
  disabled?: boolean;
}

export default function AccountSelector({
  accounts,
  selectedAccountId,
  onChange,
  disabled = false,
}: AccountSelectorProps) {
  if (!accounts || accounts.length === 0) {
    return (
      <div className="text-sm text-gray-500">
        Nenhuma conta disponível
      </div>
    );
  }

  const activeAccounts = accounts.filter(acc => acc.isActive);

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        Conta
      </label>
      <select
        value={selectedAccountId || ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
      >
        <option value="">Selecione uma conta</option>
        {activeAccounts.map((account) => (
          <option key={account.id} value={account.id}>
            {account.icon} {account.name}
            {account.isDefault && ' (Padrão)'}
          </option>
        ))}
      </select>
    </div>
  );
}
