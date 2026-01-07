-- Dropar e recriar tabela sessions com estrutura correta
DROP TABLE IF EXISTS sessions CASCADE;

CREATE TABLE sessions (
  session_token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires TIMESTAMP NOT NULL
);
