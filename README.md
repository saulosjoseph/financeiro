# Financeiro

Aplicação de gestão financeira desenvolvida com Next.js e PostgreSQL.

## Pré-requisitos

- Node.js 20.9.0 ou superior
- Docker e Docker Compose

## Configuração

1. Clone o repositório
2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente:
```bash
cp .env.example .env.local
```

4. Inicie o banco de dados PostgreSQL:
```bash
docker-compose up -d
```

5. Aguarde alguns segundos para o banco inicializar, então inicie a aplicação:
```bash
npm run dev
```

A aplicação estará disponível em `http://localhost:3000`

## Banco de Dados

O PostgreSQL estará disponível em:
- Host: localhost
- Porta: 5432
- Database: financeiro
- Usuário: financeiro
- Senha: financeiro123

### Comandos úteis do Docker

```bash
# Iniciar o banco de dados
docker-compose up -d

# Parar o banco de dados
docker-compose down

# Ver logs do banco
docker-compose logs -f postgres

# Acessar o PostgreSQL via CLI
docker-compose exec postgres psql -U financeiro -d financeiro
```

## Estrutura do Projeto

- `/app` - Páginas e layouts Next.js
- `/lib` - Utilitários e configurações (incluindo conexão com banco)
- `/public` - Arquivos estáticos

## Desenvolvimento

```bash
# Modo desenvolvimento
npm run dev

# Build para produção
npm run build

# Iniciar em produção
npm run start

# Lint
npm run lint
```

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
