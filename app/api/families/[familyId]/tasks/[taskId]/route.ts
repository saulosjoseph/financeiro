import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/src/db';
import { tasks, familyMembers, saidas, entradas } from '@/src/db/schema';
import { eq, and } from 'drizzle-orm';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ familyId: string; taskId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const { familyId, taskId } = await params;

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
  
  // Special handling for completing a task
  if (body.status === 'completed' || body.status === 'done') {
    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId),
      with: {
        linkedRecurringSaida: true,
        linkedRecurringEntrada: true,
      },
    });

    if (!task) {
      return NextResponse.json({ error: 'Tarefa não encontrada' }, { status: 404 });
    }

    // Update task status
    await db.update(tasks)
      .set({
        status: 'completed',
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, taskId));

    // If task has linked recurring transaction and autoGenerateTransaction is true,
    // create a single instance of the transaction
    if (task.autoGenerateTransaction && body.generateTransaction !== false) {
      if (task.linkedRecurringSaidaId && task.linkedRecurringSaida) {
        // Create a single expense instance
        await db.insert(saidas).values({
          familyId,
          accountId: task.linkedRecurringSaida.accountId,
          userId: session.user.id,
          amount: body.actualAmount || task.amount || task.linkedRecurringSaida.amount,
          description: task.linkedRecurringSaida.description,
          category: task.linkedRecurringSaida.category,
          date: new Date(),
          linkedTaskId: taskId,
          wasGeneratedByTask: true,
          isRecurring: false,
        });
      } else if (task.linkedRecurringEntradaId && task.linkedRecurringEntrada) {
        // Create a single income instance
        await db.insert(entradas).values({
          familyId,
          accountId: task.linkedRecurringEntrada.accountId,
          userId: session.user.id,
          amount: body.actualAmount || task.amount || task.linkedRecurringEntrada.amount,
          description: task.linkedRecurringEntrada.description,
          source: task.linkedRecurringEntrada.source,
          date: new Date(),
          linkedTaskId: taskId,
          wasGeneratedByTask: true,
          isRecurring: false,
        });
      }
    }

    const updatedTask = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId),
      with: {
        createdBy: true,
        assignee: true,
        linkedRecurringEntrada: true,
        linkedRecurringSaida: true,
      },
    });

    return NextResponse.json(updatedTask);
  }

  // Regular update
  const updateData: any = {
    updatedAt: new Date(),
  };

  if (body.title !== undefined) updateData.title = body.title;
  if (body.description !== undefined) updateData.description = body.description;
  if (body.status !== undefined) updateData.status = body.status;
  if (body.priority !== undefined) updateData.priority = body.priority;
  if (body.dueDate !== undefined) updateData.dueDate = body.dueDate ? new Date(body.dueDate) : null;
  if (body.assigneeId !== undefined) updateData.assigneeId = body.assigneeId;
  if (body.amount !== undefined) updateData.amount = body.amount ? body.amount.toString() : null;

  await db.update(tasks)
    .set(updateData)
    .where(eq(tasks.id, taskId));

  const updatedTask = await db.query.tasks.findFirst({
    where: eq(tasks.id, taskId),
    with: {
      createdBy: true,
      assignee: true,
      linkedRecurringEntrada: true,
      linkedRecurringSaida: true,
    },
  });

  return NextResponse.json(updatedTask);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ familyId: string; taskId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const { familyId, taskId } = await params;

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

  await db.delete(tasks).where(eq(tasks.id, taskId));

  return NextResponse.json({ success: true });
}
