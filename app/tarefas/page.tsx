'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckSquare, Plus, AlertCircle, Calendar, DollarSign } from 'lucide-react';
import { useFamily } from '@/lib/hooks/useFamily';
import { useTasks } from '@/lib/hooks/useTasks';
import TaskForm from '@/components/TaskForm';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils/currencyMask';
import { toast } from 'sonner';

function TarefasContent() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const familyId = searchParams.get('family');

  const { selectedFamily } = useFamily(familyId);
  const {
    tasks,
    todoTasks,
    inProgressTasks,
    completedTasks,
    overdueTasks,
    pendingFinancialImpact,
    mutate,
  } = useTasks(familyId);

  const [filter, setFilter] = useState<'all' | 'todo' | 'in_progress' | 'completed'>('all');
  const [showCreateTask, setShowCreateTask] = useState(false);

  useEffect(() => {
    if (!familyId) {
      router.push('/dashboard');
    }
  }, [familyId, router]);

  const getFilteredTasks = () => {
    switch (filter) {
      case 'todo':
        return todoTasks;
      case 'in_progress':
        return inProgressTasks;
      case 'completed':
        return completedTasks;
      default:
        return tasks;
    }
  };

  const filteredTasks = getFilteredTasks();

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-600 bg-red-50 dark:bg-red-900/20';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20';
      case 'low':
        return 'text-green-600 bg-green-50 dark:bg-green-900/20';
      default:
        return 'text-gray-600 bg-gray-50 dark:bg-gray-900/20';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-50 dark:bg-green-900/20';
      case 'in_progress':
        return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20';
      case 'todo':
        return 'text-gray-600 bg-gray-50 dark:bg-gray-900/20';
      default:
        return 'text-gray-600 bg-gray-50 dark:bg-gray-900/20';
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      const response = await fetch(`/api/families/${familyId}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      });

      if (response.ok) {
        mutate();
        toast.success('Tarefa concluída!');
      } else {
        toast.error('Erro ao concluir tarefa');
      }
    } catch {
      toast.error('Erro ao concluir tarefa');
    }
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <CheckSquare className="w-16 h-16 text-purple-600 dark:text-purple-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Sistema de Tarefas
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Faça login para gerenciar suas tarefas
          </p>
        </div>
      </div>
    );
  }

  if (!selectedFamily) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-purple-600 dark:text-purple-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">
            Selecione uma família para ver as tarefas
          </p>
          <Link
            href="/dashboard"
            className="mt-4 inline-block px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            Voltar ao Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <CheckSquare className="w-8 h-8 text-purple-600 dark:text-purple-400" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Tarefas
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  {selectedFamily.name}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowCreateTask(true)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Nova Tarefa
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 dark:text-gray-400 text-sm">A Fazer</span>
              <CheckSquare className="w-5 h-5 text-gray-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {todoTasks.length}
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 dark:text-gray-400 text-sm">Em Progresso</span>
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {inProgressTasks.length}
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 dark:text-gray-400 text-sm">Atrasadas</span>
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <p className="text-3xl font-bold text-red-600">
              {overdueTasks.length}
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 dark:text-gray-400 text-sm">Impacto Financeiro</span>
              <DollarSign className={`w-5 h-5 ${pendingFinancialImpact < 0 ? 'text-red-600' : 'text-green-600'}`} />
            </div>
            <p className={`text-2xl font-bold ${pendingFinancialImpact < 0 ? 'text-red-600' : 'text-green-600'}`}>
              {formatCurrency(Math.abs(pendingFinancialImpact).toString())}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {pendingFinancialImpact < 0 ? 'A pagar' : 'A receber'}
            </p>
          </div>
        </div>

        {/* Filter Buttons */}
        <div className="flex gap-2 mb-6 flex-wrap">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'all'
                ? 'bg-purple-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            Todas ({tasks.length})
          </button>
          <button
            onClick={() => setFilter('todo')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'todo'
                ? 'bg-purple-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            A Fazer ({todoTasks.length})
          </button>
          <button
            onClick={() => setFilter('in_progress')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'in_progress'
                ? 'bg-purple-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            Em Progresso ({inProgressTasks.length})
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'completed'
                ? 'bg-purple-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            Concluídas ({completedTasks.length})
          </button>
        </div>

        {/* Tasks List */}
        <div className="space-y-4">
          {filteredTasks.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-12 text-center">
              <CheckSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Nenhuma tarefa encontrada
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Crie sua primeira tarefa para começar
              </p>
              <button
                onClick={() => setShowCreateTask(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Nova Tarefa
              </button>
            </div>
          ) : (
            filteredTasks.map((task) => (
              <div
                key={task.id}
                className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {task.title}
                      </h3>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(task.priority)}`}>
                        {task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Média' : 'Baixa'}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(task.status)}`}>
                        {task.status === 'completed' ? 'Concluída' : task.status === 'in_progress' ? 'Em Progresso' : 'A Fazer'}
                      </span>
                    </div>
                    {task.description && (
                      <p className="text-gray-600 dark:text-gray-400 mb-3">
                        {task.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                      {task.dueDate && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {new Date(task.dueDate).toLocaleDateString('pt-BR')}
                        </div>
                      )}
                      {task.amount && (
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-4 h-4" />
                          {formatCurrency(task.amount)}
                        </div>
                      )}
                      {task.assignee && (
                        <div>
                          Responsável: {task.assignee.name}
                        </div>
                      )}
                    </div>
                  </div>
                  {task.status !== 'completed' && (
                    <button
                      onClick={() => handleCompleteTask(task.id)}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                    >
                      Concluir
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Task Form Modal */}
      {showCreateTask && selectedFamily && (
        <TaskForm
          familyId={familyId!}
          familyMembers={selectedFamily.members}
          onClose={() => setShowCreateTask(false)}
          onSuccess={() => {
            mutate();
            toast.success('Tarefa criada com sucesso!');
          }}
        />
      )}
    </div>
  );
}

export default function TarefasPage() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <TarefasContent />
    </Suspense>
  );
}
