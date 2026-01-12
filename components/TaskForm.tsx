'use client';

import { useState, useEffect } from 'react';
import { X, Calendar, DollarSign, User, Lightbulb, CheckCircle2, CreditCard, ShoppingCart, Coins } from 'lucide-react';
import { formatCurrency, parseCurrency } from '@/lib/utils/currencyMask';
import { useAccounts } from '@/lib/hooks/useAccounts';
import { useEntradas } from '@/lib/hooks/useEntradas';
import { useSaidas } from '@/lib/hooks/useSaidas';

interface TaskFormProps {
  familyId: string;
  familyMembers: Array<{ user: { id: string; name: string | null } }>;
  onClose: () => void;
  onSuccess: () => void;
}

export default function TaskForm({ familyId, familyMembers, onClose, onSuccess }: TaskFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [dueDate, setDueDate] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [type, setType] = useState('standard');
  const [amount, setAmount] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringType, setRecurringType] = useState('monthly');
  const [recurringDay, setRecurringDay] = useState(new Date().getDate());
  const [recurringEndDate, setRecurringEndDate] = useState('');
  const [transactionMode, setTransactionMode] = useState<'none' | 'create' | 'link'>('none');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [linkedTransactionId, setLinkedTransactionId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { accounts } = useAccounts(familyId);
  const { recurringEntradas } = useEntradas(familyId);
  const { recurringSaidas } = useSaidas(familyId);

  // Auto-select first account when available
  useEffect(() => {
    if (accounts && accounts.length > 0 && !selectedAccountId) {
      setSelectedAccountId(accounts[0].id);
    }
  }, [accounts, selectedAccountId]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCurrency(e.target.value);
    setAmount(formatted);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      alert('O título é obrigatório');
      return;
    }

    if (transactionMode !== 'none' && !selectedAccountId) {
      alert('Selecione uma conta para a integração financeira');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: {
        title: string;
        description: string;
        priority: string;
        dueDate: string | null;
        assigneeId: string | null;
        type: string;
        amount: number | null;
        isRecurring: boolean;
        recurringType: string | null;
        recurringDay: number | null;
        recurringEndDate: string | null;
        autoGenerateTransaction: boolean;
        transactionMode: string | null;
        accountId: string | null;
        linkedRecurringSaidaId?: string;
        linkedRecurringEntradaId?: string;
      } = {
        title,
        description,
        priority,
        dueDate: dueDate || null,
        assigneeId: assigneeId || null,
        type,
        amount: amount ? parseFloat(parseCurrency(amount)) : null,
        isRecurring,
        recurringType: isRecurring ? recurringType : null,
        recurringDay: isRecurring ? recurringDay : null,
        recurringEndDate: isRecurring && recurringEndDate ? recurringEndDate : null,
        autoGenerateTransaction: transactionMode !== 'none',
        transactionMode: transactionMode === 'none' ? null : transactionMode,
        accountId: selectedAccountId || null,
      };

      if (transactionMode === 'link') {
        if (type === 'bill_payment' || type === 'shopping_list') {
          payload.linkedRecurringSaidaId = linkedTransactionId;
        } else if (type === 'income') {
          payload.linkedRecurringEntradaId = linkedTransactionId;
        }
      }

      const response = await fetch(`/api/families/${familyId}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        onSuccess();
        onClose();
      } else {
        const error = await response.json();
        alert(error.error || 'Erro ao criar tarefa');
      }
    } catch {
      alert('Erro ao criar tarefa');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRecurringTransactions = () => {
    if (type === 'bill_payment' || type === 'shopping_list') {
      return recurringSaidas || [];
    } else if (type === 'income') {
      return recurringEntradas || [];
    }
    return [];
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Nova Tarefa</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Título *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Descrição
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          {/* Priority & Due Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Prioridade
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="low">Baixa</option>
                <option value="medium">Média</option>
                <option value="high">Alta</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Data de Vencimento
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          {/* Assignee */}
          {familyMembers && familyMembers.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <User className="w-4 h-4" />
                Responsável
              </label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">Sem responsável</option>
                {familyMembers.map((member) => (
                  <option key={member.user.id} value={member.user.id}>
                    {member.user.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Financial Integration */}
          <fieldset className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-800/50">
            <legend className="text-sm font-medium text-gray-700 dark:text-gray-300 px-2 flex items-center gap-2">
              Integração Financeira
              <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full font-normal">
                Opcional
              </span>
            </legend>

            <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-xs text-blue-800 dark:text-blue-200 flex items-start gap-2">
                <Lightbulb className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span><strong>Dica:</strong> Tarefas padrão são simples (ex: "Limpar o quarto"). Use integração financeira apenas para contas, compras ou receitas que afetam o orçamento.</span>
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tipo de Tarefa
                </label>
                <select
                  value={type}
                  onChange={(e) => {
                    setType(e.target.value);
                    setTransactionMode('none');
                    setLinkedTransactionId('');
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="standard">Tarefa Padrão (sem integração financeira)</option>
                  <option value="bill_payment">Pagamento de Conta</option>
                  <option value="shopping_list">Lista de Compras</option>
                  <option value="income">Receita</option>
                </select>
                
                {/* Icon indicator below select */}
                <div className="flex items-center gap-2 mt-2 text-xs text-gray-500 dark:text-gray-400">
                  {type === 'standard' && (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      <span>Tarefa normal sem vínculo financeiro</span>
                    </>
                  )}
                  {type === 'bill_payment' && (
                    <>
                      <CreditCard className="w-4 h-4 text-purple-600" />
                      <span>Ao concluir, pode gerar uma despesa automaticamente</span>
                    </>
                  )}
                  {type === 'shopping_list' && (
                    <>
                      <ShoppingCart className="w-4 h-4 text-orange-600" />
                      <span>Ao concluir, pode registrar o valor real gasto</span>
                    </>
                  )}
                  {type === 'income' && (
                    <>
                      <Coins className="w-4 h-4 text-green-600" />
                      <span>Ao concluir, pode gerar uma receita automaticamente</span>
                    </>
                  )}
                </div>
              </div>

              {type !== 'standard' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                      <DollarSign className="w-4 h-4" />
                      Valor Estimado
                    </label>
                    <input
                      type="text"
                      value={amount}
                      onChange={handleAmountChange}
                      placeholder="R$ 0,00"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Conta
                    </label>
                    <select
                      value={selectedAccountId}
                      onChange={(e) => setSelectedAccountId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      {accounts?.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      Transação Recorrente
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="transactionMode"
                          value="none"
                          checked={transactionMode === 'none'}
                          onChange={() => setTransactionMode('none')}
                          className="w-4 h-4 text-purple-600"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">Sem integração</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="transactionMode"
                          value="create"
                          checked={transactionMode === 'create'}
                          onChange={() => setTransactionMode('create')}
                          className="w-4 h-4 text-purple-600"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">Criar nova transação recorrente</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="transactionMode"
                          value="link"
                          checked={transactionMode === 'link'}
                          onChange={() => setTransactionMode('link')}
                          className="w-4 h-4 text-purple-600"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">Vincular com existente</span>
                      </label>
                    </div>
                  </div>

                  {transactionMode === 'link' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Selecione a Transação
                      </label>
                      <select
                        value={linkedTransactionId}
                        onChange={(e) => setLinkedTransactionId(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="">Selecione...</option>
                        {getRecurringTransactions().map((transaction: { id: string; description: string | null; recurringType?: string | null; amount: string | number }) => (
                          <option key={transaction.id} value={transaction.id}>
                            {transaction.description} - {transaction.recurringType} - R$ {transaction.amount}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </>
              )}
            </div>
          </fieldset>

          {/* Recurring Task */}
          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
                className="w-4 h-4 text-purple-600"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Tarefa Recorrente
              </span>
            </label>
          </div>

          {isRecurring && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Frequência
                </label>
                <select
                  value={recurringType}
                  onChange={(e) => setRecurringType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="weekly">Semanal</option>
                  <option value="biweekly">Quinzenal</option>
                  <option value="monthly">Mensal</option>
                  <option value="quarterly">Trimestral</option>
                  <option value="annual">Anual</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Dia
                </label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={recurringDay}
                  onChange={(e) => setRecurringDay(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
          )}

          {/* Submit Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Criando...' : 'Criar Tarefa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
