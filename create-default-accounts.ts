import 'dotenv/config';
import { db } from './src/db';
import * as schema from './src/db/schema';
import { eq, sql } from 'drizzle-orm';

async function createDefaultAccounts() {
  try {
    console.log('🔍 Procurando famílias sem contas...');

    // Get all families
    const families = await db.select().from(schema.families);

    console.log(`📊 Total de famílias encontradas: ${families.length}`);

    let createdCount = 0;

    for (const family of families) {
      // Check if family already has accounts
      const existingAccounts = await db
        .select()
        .from(schema.financialAccounts)
        .where(eq(schema.financialAccounts.familyId, family.id));

      if (existingAccounts.length === 0) {
        console.log(`\n📝 Criando conta padrão para família: ${family.name} (${family.id})`);

        // Create default account
        const [newAccount] = await db
          .insert(schema.financialAccounts)
          .values({
            familyId: family.id,
            name: 'Conta Principal',
            type: 'checking',
            color: '#3B82F6',
            icon: '💳',
            isDefault: true,
            isActive: true,
          })
          .returning();

        console.log(`✅ Conta criada: ${newAccount.name} (${newAccount.id})`);
        createdCount++;

        // Now update existing entradas and saidas to link to this account
        const updateEntradas = await db
          .update(schema.entradas)
          .set({ accountId: newAccount.id })
          .where(
            sql`${schema.entradas.familyId} = ${family.id} AND ${schema.entradas.accountId} IS NULL`
          );

        const updateSaidas = await db
          .update(schema.saidas)
          .set({ accountId: newAccount.id })
          .where(
            sql`${schema.saidas.familyId} = ${family.id} AND ${schema.saidas.accountId} IS NULL`
          );

        console.log(`   📥 Entradas atualizadas`);
        console.log(`   📤 Saídas atualizadas`);
      } else {
        console.log(`\n✓ Família ${family.name} já possui ${existingAccounts.length} conta(s)`);

        // Update transactions without accountId to use first account
        const firstAccount = existingAccounts[0];
        
        await db
          .update(schema.entradas)
          .set({ accountId: firstAccount.id })
          .where(
            sql`${schema.entradas.familyId} = ${family.id} AND ${schema.entradas.accountId} IS NULL`
          );

        await db
          .update(schema.saidas)
          .set({ accountId: firstAccount.id })
          .where(
            sql`${schema.saidas.familyId} = ${family.id} AND ${schema.saidas.accountId} IS NULL`
          );
      }
    }

    console.log(`\n\n✨ Migração concluída!`);
    console.log(`📊 Estatísticas:`);
    console.log(`   - Total de famílias: ${families.length}`);
    console.log(`   - Contas padrão criadas: ${createdCount}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Erro na migração:', error);
    process.exit(1);
  }
}

createDefaultAccounts();
