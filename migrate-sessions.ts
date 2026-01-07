import { client } from './src/db';
import fs from 'fs';
import path from 'path';

async function migrate() {
  try {
    console.log('Migrando tabela sessions...');
    
    const sql = fs.readFileSync(path.join(__dirname, 'fix-sessions.sql'), 'utf-8');
    
    await client.unsafe(sql);
    
    console.log('✅ Migração concluída com sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro na migração:', error);
    process.exit(1);
  }
}

migrate();
