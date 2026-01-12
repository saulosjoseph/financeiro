'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Calendar as CalendarIcon, AlertCircle, ChevronLeft, ChevronRight, CheckSquare } from 'lucide-react';
import { useFamily } from '@/lib/hooks/useFamily';
import { useTasks } from '@/lib/hooks/useTasks';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils/currencyMask';
import { toast } from 'sonner';

function CalendarioContent() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const familyId = searchParams.get('family');

  const { selectedFamily } = useFamily(familyId);
  const { tasks, mutate } = useTasks(familyId);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  useEffect(() => {
    if (!familyId) {
      router.push('/dashboard');
    }
  }, [familyId, router]);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek, year, month };
  };

  const getTasksForDate = (date: Date) => {
    return tasks.filter((task) => {
      if (!task.dueDate) return false;
      const taskDate = new Date(task.dueDate);
      return (
        taskDate.getDate() === date.getDate() &&
        taskDate.getMonth() === date.getMonth() &&
        taskDate.getFullYear() === date.getFullYear()
      );
    });
  };

  const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentDate);

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
    setSelectedDate(null);
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
    setSelectedDate(null);
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
          <CalendarIcon className="w-16 h-16 text-purple-600 dark:text-purple-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Calendário de Tarefas
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Faça login para ver o calendário
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
            Selecione uma família para ver o calendário
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

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const selectedDateTasks = selectedDate ? getTasksForDate(selectedDate) : [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <CalendarIcon className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Calendário de Tarefas
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                {selectedFamily.name}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {monthNames[month]} {year}
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={previousMonth}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </button>
                <button
                  onClick={nextMonth}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </button>
              </div>
            </div>

            {/* Week Days */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              {weekDays.map((day) => (
                <div
                  key={day}
                  className="text-center text-sm font-medium text-gray-600 dark:text-gray-400 py-2"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-2">
              {/* Empty cells for days before month starts */}
              {Array.from({ length: startingDayOfWeek }).map((_, index) => (
                <div key={`empty-${index}`} className="aspect-square" />
              ))}

              {/* Days of the month */}
              {Array.from({ length: daysInMonth }).map((_, index) => {
                const day = index + 1;
                const date = new Date(year, month, day);
                const dayTasks = getTasksForDate(date);
                const isToday =
                  date.getDate() === new Date().getDate() &&
                  date.getMonth() === new Date().getMonth() &&
                  date.getFullYear() === new Date().getFullYear();
                const isSelected =
                  selectedDate &&
                  date.getDate() === selectedDate.getDate() &&
                  date.getMonth() === selectedDate.getMonth() &&
                  date.getFullYear() === selectedDate.getFullYear();

                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDate(date)}
                    className={`aspect-square p-2 rounded-lg border-2 transition-colors ${
                      isSelected
                        ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/20'
                        : isToday
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {day}
                    </div>
                    {dayTasks.length > 0 && (
                      <div className="flex justify-center mt-1 gap-1">
                        {dayTasks.slice(0, 3).map((task, i) => (
                          <div
                            key={i}
                            className={`w-1.5 h-1.5 rounded-full ${
                              task.status === 'completed'
                                ? 'bg-green-600'
                                : task.priority === 'high'
                                ? 'bg-red-600'
                                : task.priority === 'medium'
                                ? 'bg-yellow-600'
                                : 'bg-gray-600'
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Legenda:</h3>
              <div className="flex flex-wrap gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-600"></div>
                  <span className="text-gray-600 dark:text-gray-400">Alta Prioridade</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-600"></div>
                  <span className="text-gray-600 dark:text-gray-400">Média Prioridade</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-gray-600"></div>
                  <span className="text-gray-600 dark:text-gray-400">Baixa Prioridade</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-600"></div>
                  <span className="text-gray-600 dark:text-gray-400">Concluída</span>
                </div>
              </div>
            </div>
          </div>

          {/* Tasks for Selected Date */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm sticky top-8">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                {selectedDate
                  ? `Tarefas - ${selectedDate.getDate()} de ${monthNames[selectedDate.getMonth()]}`
                  : 'Selecione uma data'}
              </h3>

              {selectedDate && selectedDateTasks.length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Nenhuma tarefa para esta data
                </p>
              )}

              <div className="space-y-3">
                {selectedDateTasks.map((task) => (
                  <div
                    key={task.id}
                    className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                        {task.title}
                      </h4>
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${
                          task.priority === 'high'
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                            : task.priority === 'medium'
                            ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                            : 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300'
                        }`}
                      >
                        {task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Média' : 'Baixa'}
                      </span>
                    </div>
                    {task.description && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                        {task.description}
                      </p>
                    )}
                    {task.amount && (
                      <p className="text-xs text-gray-500 dark:text-gray-500 mb-3">
                        Valor: {formatCurrency(task.amount)}
                      </p>
                    )}
                    {task.status !== 'completed' && (
                      <button
                        onClick={() => handleCompleteTask(task.id)}
                        className="w-full text-xs px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors flex items-center justify-center gap-1"
                      >
                        <CheckSquare className="w-3 h-3" />
                        Concluir
                      </button>
                    )}
                    {task.status === 'completed' && (
                      <div className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                        <CheckSquare className="w-3 h-3" />
                        Concluída
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CalendarioPage() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <CalendarioContent />
    </Suspense>
  );
}
