import { client } from './src/db';

(async () => {
  try {
    console.log('Deletando sessões existentes...');
    await client`DELETE FROM sessions`;
    console.log('✅ Sessões deletadas!');
    
    console.log('Removendo coluna id...');
    await client`ALTER TABLE sessions DROP COLUMN IF EXISTS id CASCADE`;
    console.log('✅ Coluna id removida!');
    
    console.log('Adicionando nova chave primária...');
    await client`ALTER TABLE sessions ADD PRIMARY KEY (session_token)`;
    console.log('✅ Chave primária adicionada!');
    
    process.exit(0);
  } catch (e) {
    console.error('Erro:', e);
    process.exit(1);
  }
})();
