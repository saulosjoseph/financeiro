// Database types inferred from schema
export type User = {
  id: string;
  name: string | null;
  email: string;
  emailVerified: Date | null;
  image: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type Family = {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
};

export type FamilyMember = {
  id: string;
  familyId: string;
  userId: string;
  role: string;
  createdAt: Date;
};

export type FinancialAccount = {
  id: string;
  familyId: string;
  name: string;
  type: string;
  initialBalance: string;
  creditLimit: string | null;
  color: string;
  icon: string;
  description: string | null;
  isDefault: boolean;
  isActive: boolean;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

export type Transfer = {
  id: string;
  familyId: string;
  fromAccountId: string;
  toAccountId: string;
  amount: string;
  description: string | null;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type Tag = {
  id: string;
  name: string;
  color: string;
  familyId: string;
  createdAt: Date;
};

export type Entrada = {
  id: string;
  familyId: string;
  accountId: string;
  userId: string;
  amount: string;
  description: string | null;
  source: string | null;
  date: Date;
  isRecurring: boolean;
  recurringType: string | null;
  recurringDay: number | null;
  recurringEndDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type Saida = {
  id: string;
  familyId: string;
  accountId: string;
  userId: string;
  amount: string;
  description: string | null;
  category: string | null;
  date: Date;
  isRecurring: boolean;
  recurringType: string | null;
  recurringDay: number | null;
  recurringEndDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type SavingsGoal = {
  id: string;
  familyId: string;
  name: string;
  description: string | null;
  targetAmount: string;
  currentAmount: string;
  targetDate: Date | null;
  priority: number;
  isEmergencyFund: boolean;
  monthlyExpenses: string | null;
  targetMonths: number | null;
  isCompleted: boolean;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type GoalContribution = {
  id: string;
  goalId: string;
  entradaId: string | null;
  amount: string;
  description: string | null;
  date: Date;
  createdAt: Date;
};
