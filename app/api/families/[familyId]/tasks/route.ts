import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/src/db';
import { tasks, familyMembers, entradas, saidas } from '@/src/db/schema';
import { eq, and, desc } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ familyId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const { familyId } = await params;

  // Verify user is a member of this family
  const membership = await db.query.familyMembers.findFirst({
    where: and(
      eq(familyMembers.familyId, familyId),
      eq(familyMembers.userId, session.user.id)
    ),
  });

  if (!membership) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  // Get all tasks for this family
  const familyTasks = await db.query.tasks.findMany({
    where: eq(tasks.familyId, familyId),
    orderBy: [desc(tasks.createdAt)],
    with: {
      createdBy: true,
      assignee: true,
      linkedRecurringEntrada: true,
      linkedRecurringSaida: true,
    },
  });

  return NextResponse.json(familyTasks);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ familyId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const { familyId } = await params;

  // Verify user is a member of this family
  const membership = await db.query.familyMembers.findFirst({
    where: and(
      eq(familyMembers.familyId, familyId),
      eq(familyMembers.userId, session.user.id)
    ),
  });

  if (!membership) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  const body = await request.json();
  const {
    title,
    description,
    status = 'todo',
    priority = 'medium',
    dueDate,
    type = 'standard',
    amount,
    assigneeId,
    isRecurring = false,
    recurringType,
    recurringDay,
    recurringEndDate,
    autoGenerateTransaction = true,
    transactionMode, // 'create' or 'link'
    linkedRecurringEntradaId,
    linkedRecurringSaidaId,
  } = body;

  // Create the task
  const [newTask] = await db.insert(tasks).values({
    familyId,
    createdById: session.user.id,
    assigneeId: assigneeId || null,
    title,
    description: description || null,
    status,
    priority,
    dueDate: dueDate ? new Date(dueDate) : null,
    type,
    amount: amount ? amount.toString() : null,
    isRecurring,
    recurringType: isRecurring ? recurringType : null,
    recurringDay: isRecurring ? recurringDay : null,
    recurringEndDate: isRecurring && recurringEndDate ? new Date(recurringEndDate) : null,
    autoGenerateTransaction,
    linkedRecurringEntradaId: linkedRecurringEntradaId || null,
    linkedRecurringSaidaId: linkedRecurringSaidaId || null,
  }).returning();

  // If transactionMode is 'create', create a new recurring transaction
  if (transactionMode === 'create' && amount && isRecurring) {
    if (type === 'bill_payment' || type === 'shopping_list') {
      // Create recurring saida
      const [newSaida] = await db.insert(saidas).values({
        familyId,
        accountId: body.accountId, // Required from request
        userId: session.user.id,
        amount: amount.toString(),
        description: title,
        category: type === 'bill_payment' ? 'Contas' : 'Compras',
        date: new Date(),
        linkedTaskId: newTask.id,
        wasGeneratedByTask: true,
        isRecurring: true,
        recurringType,
        recurringDay,
        recurringEndDate: recurringEndDate ? new Date(recurringEndDate) : null,
      }).returning();

      // Update task with linked transaction
      await db.update(tasks)
        .set({ linkedRecurringSaidaId: newSaida.id })
        .where(eq(tasks.id, newTask.id));
    } else if (type === 'income') {
      // Create recurring entrada
      const [newEntrada] = await db.insert(entradas).values({
        familyId,
        accountId: body.accountId,
        userId: session.user.id,
        amount: amount.toString(),
        description: title,
        source: 'Tarefa Recorrente',
        date: new Date(),
        linkedTaskId: newTask.id,
        wasGeneratedByTask: true,
        isRecurring: true,
        recurringType,
        recurringDay,
        recurringEndDate: recurringEndDate ? new Date(recurringEndDate) : null,
      }).returning();

      // Update task with linked transaction
      await db.update(tasks)
        .set({ linkedRecurringEntradaId: newEntrada.id })
        .where(eq(tasks.id, newTask.id));
    }
  }

  return NextResponse.json(newTask, { status: 201 });
}
