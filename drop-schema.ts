import postgres from 'postgres';

async function dropAll() {
  const client = postgres('postgresql://financeiro:financeiro123@localhost:5432/financeiro');
  
  try {
    await client`DROP SCHEMA public CASCADE`;
    await client`CREATE SCHEMA public`;
    console.log('✓ Schema dropped and recreated');
    await client.end();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    await client.end();
    process.exit(1);
  }
}

dropAll();
