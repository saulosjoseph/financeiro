-- Renomear tabelas de income/expense para entrada/saida
-- IMPORTANTE: Esta migration preserva todos os dados existentes
-- IDEMPOTENTE: Só faz as alterações se as tabelas antigas existirem

DO $$
BEGIN
  -- Renomear tabela incomes para entradas (se incomes existir)
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'incomes') THEN
    ALTER TABLE "incomes" RENAME TO "entradas";
  END IF;

  -- Renomear tabela income_tags para entrada_tags (se income_tags existir)
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'income_tags') THEN
    ALTER TABLE "income_tags" RENAME TO "entrada_tags";
  END IF;

  -- Renomear tabela expenses para saidas (se expenses existir)
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'expenses') THEN
    ALTER TABLE "expenses" RENAME TO "saidas";
  END IF;

  -- Renomear tabela expense_tags para saida_tags (se expense_tags existir)
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'expense_tags') THEN
    ALTER TABLE "expense_tags" RENAME TO "saida_tags";
  END IF;

  -- Renomear coluna income_id para entrada_id (se coluna existir)
  IF EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'entrada_tags' 
    AND column_name = 'income_id'
  ) THEN
    ALTER TABLE "entrada_tags" RENAME COLUMN "income_id" TO "entrada_id";
  END IF;

  -- Renomear coluna expense_id para saida_id (se coluna existir)
  IF EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'saida_tags' 
    AND column_name = 'expense_id'
  ) THEN
    ALTER TABLE "saida_tags" RENAME COLUMN "expense_id" TO "saida_id";
  END IF;
END $$;
