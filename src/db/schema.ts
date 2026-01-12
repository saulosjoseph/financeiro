import { pgTable, text, timestamp, boolean, decimal, integer, unique, index, primaryKey } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users table
export const users = pgTable('users', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name'),
  email: text('email').notNull().unique(),
  emailVerified: timestamp('email_verified', { mode: 'date' }),
  image: text('image'),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  familyMembers: many(familyMembers),
  entradas: many(entradas),
  saidas: many(saidas),
  createdTasks: many(tasks, { relationName: 'createdTasks' }),
  assignedTasks: many(tasks, { relationName: 'assignedTasks' }),
}));

// Families table
export const families = pgTable('families', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
});

export const familiesRelations = relations(families, ({ many }) => ({
  members: many(familyMembers),
  invitations: many(familyInvitations),
  shareLinks: many(familyShareLinks),
  financialAccounts: many(financialAccounts),
  entradas: many(entradas),
  saidas: many(saidas),
  tags: many(tags),
  savingsGoals: many(savingsGoals),
  transfers: many(transfers),
  tasks: many(tasks),
}));

// Financial Accounts table
export const financialAccounts = pgTable('financial_accounts', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  familyId: text('family_id').notNull().references(() => families.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  type: text('type').notNull(), // "checking", "savings", "cash", "credit_card", "investment"
  initialBalance: decimal('initial_balance', { precision: 10, scale: 2 }).notNull().default('0'),
  creditLimit: decimal('credit_limit', { precision: 10, scale: 2 }),
  color: text('color').notNull().default('#6B7280'),
  icon: text('icon').notNull().default('wallet'),
  description: text('description'),
  isDefault: boolean('is_default').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  displayOrder: integer('display_order').notNull().default(0),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
}, (table) => ({
  uniqueFamilyName: unique().on(table.familyId, table.name),
  familyActiveIdx: index('financial_accounts_family_active_idx').on(table.familyId, table.isActive),
  familyOrderIdx: index('financial_accounts_family_order_idx').on(table.familyId, table.displayOrder),
}));

export const financialAccountsRelations = relations(financialAccounts, ({ one, many }) => ({
  family: one(families, {
    fields: [financialAccounts.familyId],
    references: [families.id],
  }),
  entradas: many(entradas),
  saidas: many(saidas),
  transfersFrom: many(transfers, { relationName: 'transferFrom' }),
  transfersTo: many(transfers, { relationName: 'transferTo' }),
}));

// Transfers table
export const transfers = pgTable('transfers', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  familyId: text('family_id').notNull().references(() => families.id, { onDelete: 'cascade' }),
  fromAccountId: text('from_account_id').notNull().references(() => financialAccounts.id, { onDelete: 'cascade' }),
  toAccountId: text('to_account_id').notNull().references(() => financialAccounts.id, { onDelete: 'cascade' }),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  description: text('description'),
  date: timestamp('date', { mode: 'date' }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
}, (table) => ({
  familyDateIdx: index('transfers_family_date_idx').on(table.familyId, table.date),
  fromAccountIdx: index('transfers_from_account_idx').on(table.fromAccountId),
  toAccountIdx: index('transfers_to_account_idx').on(table.toAccountId),
}));

export const transfersRelations = relations(transfers, ({ one }) => ({
  family: one(families, {
    fields: [transfers.familyId],
    references: [families.id],
  }),
  fromAccount: one(financialAccounts, {
    fields: [transfers.fromAccountId],
    references: [financialAccounts.id],
    relationName: 'transferFrom',
  }),
  toAccount: one(financialAccounts, {
    fields: [transfers.toAccountId],
    references: [financialAccounts.id],
    relationName: 'transferTo',
  }),
}));

// Tags table
export const tags = pgTable('tags', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  color: text('color').notNull().default('#6B7280'),
  familyId: text('family_id').notNull().references(() => families.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
}, (table) => ({
  uniqueFamilyName: unique().on(table.familyId, table.name),
}));

export const tagsRelations = relations(tags, ({ one, many }) => ({
  family: one(families, {
    fields: [tags.familyId],
    references: [families.id],
  }),
  entradas: many(entradaTags),
  saidas: many(saidaTags),
}));

// Family Members table
export const familyMembers = pgTable('family_members', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  familyId: text('family_id').notNull().references(() => families.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: text('role').notNull().default('member'),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
}, (table) => ({
  uniqueFamilyUser: unique().on(table.familyId, table.userId),
}));

export const familyMembersRelations = relations(familyMembers, ({ one }) => ({
  family: one(families, {
    fields: [familyMembers.familyId],
    references: [families.id],
  }),
  user: one(users, {
    fields: [familyMembers.userId],
    references: [users.id],
  }),
}));

// Family Invitations table
export const familyInvitations = pgTable('family_invitations', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  familyId: text('family_id').notNull().references(() => families.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  token: text('token').notNull().unique(),
  role: text('role').notNull().default('member'),
  invitedBy: text('invited_by').notNull(),
  expiresAt: timestamp('expires_at', { mode: 'date' }).notNull(),
  acceptedAt: timestamp('accepted_at', { mode: 'date' }),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
}, (table) => ({
  uniqueFamilyEmail: unique().on(table.familyId, table.email),
  tokenIdx: index('family_invitations_token_idx').on(table.token),
  emailIdx: index('family_invitations_email_idx').on(table.email),
}));

export const familyInvitationsRelations = relations(familyInvitations, ({ one }) => ({
  family: one(families, {
    fields: [familyInvitations.familyId],
    references: [families.id],
  }),
}));

// Family Share Links table
export const familyShareLinks = pgTable('family_share_links', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  familyId: text('family_id').notNull().references(() => families.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  role: text('role').notNull().default('member'),
  createdBy: text('created_by').notNull(),
  usedBy: text('used_by'),
  usedAt: timestamp('used_at', { mode: 'date' }),
  expiresAt: timestamp('expires_at', { mode: 'date' }).notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
}, (table) => ({
  tokenIdx: index('family_share_links_token_idx').on(table.token),
}));

export const familyShareLinksRelations = relations(familyShareLinks, ({ one }) => ({
  family: one(families, {
    fields: [familyShareLinks.familyId],
    references: [families.id],
  }),
}));

// Entradas table
export const entradas = pgTable('entradas', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  familyId: text('family_id').notNull().references(() => families.id, { onDelete: 'cascade' }),
  accountId: text('account_id').notNull().references(() => financialAccounts.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  description: text('description'),
  source: text('source'),
  date: timestamp('date', { mode: 'date' }).notNull().defaultNow(),
  linkedTaskId: text('linked_task_id'),
  wasGeneratedByTask: boolean('was_generated_by_task').notNull().default(false),
  isRecurring: boolean('is_recurring').notNull().default(false),
  recurringType: text('recurring_type'),
  recurringDay: integer('recurring_day'),
  recurringEndDate: timestamp('recurring_end_date', { mode: 'date' }),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
}, (table) => ({
  familyAccountDateIdx: index('entradas_family_account_date_idx').on(table.familyId, table.accountId, table.date),
  accountDateIdx: index('entradas_account_date_idx').on(table.accountId, table.date),
  recurringIdx: index('entradas_recurring_idx').on(table.isRecurring),
}));

export const entradasRelations = relations(entradas, ({ one, many }) => ({
  family: one(families, {
    fields: [entradas.familyId],
    references: [families.id],
  }),
  account: one(financialAccounts, {
    fields: [entradas.accountId],
    references: [financialAccounts.id],
  }),
  user: one(users, {
    fields: [entradas.userId],
    references: [users.id],
  }),
  tags: many(entradaTags),
  goalContributions: many(goalContributions),
}));

// Entrada Tags join table
export const entradaTags = pgTable('entrada_tags', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  entradaId: text('entrada_id').notNull().references(() => entradas.id, { onDelete: 'cascade' }),
  tagId: text('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
}, (table) => ({
  uniqueEntradaTag: unique().on(table.entradaId, table.tagId),
}));

export const entradaTagsRelations = relations(entradaTags, ({ one }) => ({
  entrada: one(entradas, {
    fields: [entradaTags.entradaId],
    references: [entradas.id],
  }),
  tag: one(tags, {
    fields: [entradaTags.tagId],
    references: [tags.id],
  }),
}));

// Saidas table
export const saidas = pgTable('saidas', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  familyId: text('family_id').notNull().references(() => families.id, { onDelete: 'cascade' }),
  accountId: text('account_id').notNull().references(() => financialAccounts.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  description: text('description'),
  category: text('category'),
  date: timestamp('date', { mode: 'date' }).notNull().defaultNow(),
  linkedTaskId: text('linked_task_id'),
  wasGeneratedByTask: boolean('was_generated_by_task').notNull().default(false),
  isRecurring: boolean('is_recurring').notNull().default(false),
  recurringType: text('recurring_type'),
  recurringDay: integer('recurring_day'),
  recurringEndDate: timestamp('recurring_end_date', { mode: 'date' }),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
}, (table) => ({
  familyAccountDateIdx: index('saidas_family_account_date_idx').on(table.familyId, table.accountId, table.date),
  accountDateIdx: index('saidas_account_date_idx').on(table.accountId, table.date),
  recurringIdx: index('saidas_recurring_idx').on(table.isRecurring),
}));

export const saidasRelations = relations(saidas, ({ one, many }) => ({
  family: one(families, {
    fields: [saidas.familyId],
    references: [families.id],
  }),
  account: one(financialAccounts, {
    fields: [saidas.accountId],
    references: [financialAccounts.id],
  }),
  user: one(users, {
    fields: [saidas.userId],
    references: [users.id],
  }),
  tags: many(saidaTags),
}));

// Saida Tags join table
export const saidaTags = pgTable('saida_tags', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  saidaId: text('saida_id').notNull().references(() => saidas.id, { onDelete: 'cascade' }),
  tagId: text('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
}, (table) => ({
  uniqueSaidaTag: unique().on(table.saidaId, table.tagId),
}));

export const saidaTagsRelations = relations(saidaTags, ({ one }) => ({
  saida: one(saidas, {
    fields: [saidaTags.saidaId],
    references: [saidas.id],
  }),
  tag: one(tags, {
    fields: [saidaTags.tagId],
    references: [tags.id],
  }),
}));

// NextAuth tables
export const accounts = pgTable('accounts', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  provider: text('provider').notNull(),
  providerAccountId: text('provider_account_id').notNull(),
  refresh_token: text('refresh_token'),
  access_token: text('access_token'),
  expires_at: integer('expires_at'),
  token_type: text('token_type'),
  scope: text('scope'),
  id_token: text('id_token'),
  session_state: text('session_state'),
}, (table) => ({
  uniqueProviderAccount: unique().on(table.provider, table.providerAccountId),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

export const sessions = pgTable('sessions', {
  sessionToken: text('session_token').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
});

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const verificationTokens = pgTable('verification_tokens', {
  identifier: text('identifier').notNull(),
  token: text('token').notNull(),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
}, (table) => ({
  primaryKey: primaryKey({ columns: [table.identifier, table.token] }),
}));

// Savings Goals table
export const savingsGoals = pgTable('savings_goals', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  familyId: text('family_id').notNull().references(() => families.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  targetAmount: decimal('target_amount', { precision: 10, scale: 2 }).notNull(),
  currentAmount: decimal('current_amount', { precision: 10, scale: 2 }).notNull().default('0'),
  targetDate: timestamp('target_date', { mode: 'date' }),
  priority: integer('priority').notNull().default(0),
  isEmergencyFund: boolean('is_emergency_fund').notNull().default(false),
  monthlyExpenses: decimal('monthly_expenses', { precision: 10, scale: 2 }),
  targetMonths: integer('target_months'),
  isCompleted: boolean('is_completed').notNull().default(false),
  completedAt: timestamp('completed_at', { mode: 'date' }),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
}, (table) => ({
  familyIdx: index('savings_goals_family_idx').on(table.familyId),
  completedIdx: index('savings_goals_completed_idx').on(table.isCompleted),
}));

export const savingsGoalsRelations = relations(savingsGoals, ({ one, many }) => ({
  family: one(families, {
    fields: [savingsGoals.familyId],
    references: [families.id],
  }),
  contributions: many(goalContributions),
}));

// Goal Contributions table
export const goalContributions = pgTable('goal_contributions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  goalId: text('goal_id').notNull().references(() => savingsGoals.id, { onDelete: 'cascade' }),
  entradaId: text('entrada_id').references(() => entradas.id, { onDelete: 'set null' }),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  description: text('description'),
  date: timestamp('date', { mode: 'date' }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
}, (table) => ({
  goalDateIdx: index('goal_contributions_goal_date_idx').on(table.goalId, table.date),
}));

export const goalContributionsRelations = relations(goalContributions, ({ one }) => ({
  goal: one(savingsGoals, {
    fields: [goalContributions.goalId],
    references: [savingsGoals.id],
  }),
  entrada: one(entradas, {
    fields: [goalContributions.entradaId],
    references: [entradas.id],
  }),
}));

// Tasks table
export const tasks = pgTable('tasks', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  familyId: text('family_id').notNull().references(() => families.id, { onDelete: 'cascade' }),
  createdById: text('created_by_id').notNull().references(() => users.id),
  assigneeId: text('assignee_id').references(() => users.id),
  
  title: text('title').notNull(),
  description: text('description'),
  status: text('status').notNull().default('todo'),
  priority: text('priority').notNull().default('medium'),
  dueDate: timestamp('due_date', { mode: 'date' }),
  
  type: text('type').notNull().default('standard'),
  amount: decimal('amount', { precision: 10, scale: 2 }),
  linkedRecurringEntradaId: text('linked_recurring_entrada_id').references(() => entradas.id),
  linkedRecurringSaidaId: text('linked_recurring_saida_id').references(() => saidas.id),
  autoGenerateTransaction: boolean('auto_generate_transaction').notNull().default(true),
  
  isRecurring: boolean('is_recurring').notNull().default(false),
  recurringType: text('recurring_type'),
  recurringDay: integer('recurring_day'),
  recurringEndDate: timestamp('recurring_end_date', { mode: 'date' }),
  
  completedAt: timestamp('completed_at', { mode: 'date' }),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
}, (table) => ({
  familyDateIdx: index('tasks_family_date_idx').on(table.familyId, table.dueDate),
  assigneeStatusIdx: index('tasks_assignee_status_idx').on(table.assigneeId, table.status),
  recurringIdx: index('tasks_recurring_idx').on(table.isRecurring),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  family: one(families, {
    fields: [tasks.familyId],
    references: [families.id],
  }),
  createdBy: one(users, {
    fields: [tasks.createdById],
    references: [users.id],
  }),
  assignee: one(users, {
    fields: [tasks.assigneeId],
    references: [users.id],
  }),
  linkedRecurringEntrada: one(entradas, {
    fields: [tasks.linkedRecurringEntradaId],
    references: [entradas.id],
  }),
  linkedRecurringSaida: one(saidas, {
    fields: [tasks.linkedRecurringSaidaId],
    references: [saidas.id],
  }),
}));
