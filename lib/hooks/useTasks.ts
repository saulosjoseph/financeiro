import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export interface Task {
  id: string;
  familyId: string;
  createdById: string;
  assigneeId: string | null;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: Date | null;
  type: string;
  amount: string | null;
  linkedRecurringEntradaId: string | null;
  linkedRecurringSaidaId: string | null;
  autoGenerateTransaction: boolean;
  isRecurring: boolean;
  recurringType: string | null;
  recurringDay: number | null;
  recurringEndDate: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: any;
  assignee?: any;
  linkedRecurringEntrada?: any;
  linkedRecurringSaida?: any;
}

export function useTasks(familyId: string | null) {
  const { data, error, mutate } = useSWR<Task[]>(
    familyId ? `/api/families/${familyId}/tasks` : null,
    fetcher
  );

  // Calculate statistics
  const tasks = data || [];
  const todoTasks = tasks.filter(t => t.status === 'todo');
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
  const completedTasks = tasks.filter(t => t.status === 'completed');
  
  // Calculate financial impact
  const pendingFinancialImpact = tasks
    .filter(t => t.status !== 'completed' && t.amount)
    .reduce((sum, task) => {
      const amount = parseFloat(task.amount || '0');
      if (task.type === 'bill_payment' || task.type === 'shopping_list') {
        return sum - amount; // Negative impact (expenses)
      } else if (task.type === 'income') {
        return sum + amount; // Positive impact (income)
      }
      return sum;
    }, 0);

  // Tasks by type
  const billPaymentTasks = tasks.filter(t => t.type === 'bill_payment');
  const shoppingListTasks = tasks.filter(t => t.type === 'shopping_list');
  const incomeTasks = tasks.filter(t => t.type === 'income');
  
  // Overdue tasks
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const overdueTasks = tasks.filter(t => {
    if (!t.dueDate || t.status === 'completed') return false;
    const dueDate = new Date(t.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    return dueDate < today;
  });

  // Upcoming tasks (next 7 days)
  const weekFromNow = new Date();
  weekFromNow.setDate(weekFromNow.getDate() + 7);
  weekFromNow.setHours(23, 59, 59, 999);
  const upcomingTasks = tasks.filter(t => {
    if (!t.dueDate || t.status === 'completed') return false;
    const dueDate = new Date(t.dueDate);
    return dueDate >= today && dueDate <= weekFromNow;
  });

  return {
    tasks,
    todoTasks,
    inProgressTasks,
    completedTasks,
    billPaymentTasks,
    shoppingListTasks,
    incomeTasks,
    overdueTasks,
    upcomingTasks,
    pendingFinancialImpact,
    isLoading: !error && !data,
    isError: error,
    mutate,
  };
}
