-- Renomear tabelas de income/expense para entrada/saida
-- IMPORTANTE: Esta migration preserva todos os dados existentes

-- Renomear tabela incomes para entradas
ALTER TABLE "incomes" RENAME TO "entradas";

-- Renomear tabela income_tags para entrada_tags
ALTER TABLE "income_tags" RENAME TO "entrada_tags";

-- Renomear tabela expenses para saidas
ALTER TABLE "expenses" RENAME TO "saidas";

-- Renomear tabela expense_tags para saida_tags
ALTER TABLE "expense_tags" RENAME TO "saida_tags";

-- Renomear coluna income_id para entrada_id na tabela entrada_tags
ALTER TABLE "entrada_tags" RENAME COLUMN "income_id" TO "entrada_id";

-- Renomear coluna expense_id para saida_id na tabela saida_tags
ALTER TABLE "saida_tags" RENAME COLUMN "expense_id" TO "saida_id";

-- Atualizar constraints e indexes (o Postgres renomeia automaticamente, mas vamos garantir)
-- Os índices e foreign keys são renomeados automaticamente pelo Postgres quando a tabela é renomeada
