import postgres from 'postgres';
import * as dotenv from 'dotenv';
import path from 'path';

// Carregar .env.local
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

async function fixSessions() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL não encontrada');
    process.exit(1);
  }

  const client = postgres(connectionString);
  
  try {
    console.log('Deletando sessões...');
    await client`DELETE FROM sessions`;
    console.log('✅ Sessões deletadas');
    
    console.log('Removendo coluna id...');
    await client`ALTER TABLE sessions DROP COLUMN IF EXISTS id CASCADE`;
    console.log('✅ Coluna id removida');
    
    console.log('Adicionando chave primária...');
    await client`ALTER TABLE sessions ADD PRIMARY KEY (session_token)`;
    console.log('✅ Chave primária adicionada');
    
    await client.end();
    process.exit(0);
  } catch (error) {
    console.error('Erro:', error);
    await client.end();
    process.exit(1);
  }
}

fixSessions();
