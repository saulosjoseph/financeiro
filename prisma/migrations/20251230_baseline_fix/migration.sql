-- Verificar e renomear tabelas se necessário
DO $$
BEGIN
  -- Se expenses existe e saidas não existe, renomear
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'expenses') 
     AND NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'saidas') THEN
    ALTER TABLE expenses RENAME TO saidas;
  END IF;

  -- Se income existe e entradas não existe, renomear
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'income') 
     AND NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'entradas') THEN
    ALTER TABLE income RENAME TO entradas;
  END IF;
END $$;
