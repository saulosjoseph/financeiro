# Funcionalidades de Data e Recorrência

## 📅 Funcionalidades Implementadas

### 1. **Data Obrigatória**
Todos os gastos e ganhos agora possuem uma data específica associada:
- Campo de data no formulário de adição
- Data padrão: data atual
- Permite selecionar datas passadas ou futuras

### 2. **Recorrência**
Suporte completo para gastos e ganhos recorrentes:

#### Tipos de Recorrência:
- **Semanal**: Repete toda semana no dia especificado (0-6, sendo 0 = Domingo)
- **Quinzenal**: Repete a cada 14 dias
- **Mensal**: Repete todo mês no dia especificado (1-31)
- **Bimestral**: Repete a cada 2 meses
- **Trimestral**: Repete a cada 3 meses (quarterly)
- **Semestral**: Repete a cada 6 meses
- **Anual**: Repete todo ano na mesma data

#### Configurações de Recorrência:
- **Tipo de Recorrência**: Escolha o intervalo de repetição
- **Dia de Recorrência**: 
  - Para semanal: dia da semana (0-6)
  - Para outros: dia do mês (1-31)
- **Data de Término**: Opcional, define quando a recorrência termina

### 3. **Análises Temporais**
Nova página de análises com visualizações por período:

#### Períodos Disponíveis:
- **Semanal**: Análise da semana atual (Domingo a Sábado)
- **Quinzenal**: Últimas 2 semanas
- **Mensal**: Mês atual
- **Bimestral**: Últimos 2 meses
- **Trimestral**: Trimestre atual (Q1, Q2, Q3, Q4)
- **Semestral**: Semestre atual (S1, S2)
- **Anual**: Ano atual

#### Visualizações:
- Gráficos comparativos de rendas vs gastos
- Histórico dos últimos 6 períodos
- Médias por período
- Saldo de cada período
- Cards com resumo do período atual

## 🗂️ Estrutura do Banco de Dados

### Campos Adicionados

**Income & Expense:**
```prisma
date             DateTime      // Data do registro
isRecurring      Boolean       // Se é recorrente
recurringType    String?       // Tipo de recorrência
recurringDay     Int?          // Dia da recorrência
recurringEndDate DateTime?     // Data final da recorrência
```

### Índices Criados
- `@@index([familyId, date])` - Otimização para queries por família e data
- `@@index([isRecurring])` - Otimização para queries de recorrência

## 📱 Como Usar

### Adicionar Renda/Gasto Único
1. Acesse "Adicionar Renda" ou "Adicionar Gasto"
2. Preencha valor, descrição, etc.
3. Selecione a data
4. Clique em "Adicionar"

### Adicionar Renda/Gasto Recorrente
1. Acesse "Adicionar Renda" ou "Adicionar Gasto"
2. Preencha os dados básicos
3. Marque a opção "Recorrente"
4. Configure:
   - Tipo de recorrência
   - Dia da recorrência
   - Data de término (opcional)
5. Clique em "Adicionar"

### Ver Análises
1. Acesse o Dashboard
2. Clique no card "Ver Análises"
3. Selecione o período desejado
4. Visualize os gráficos e estatísticas

## 🎯 Navegação

- **Dashboard** (`/dashboard`) - Visão geral e resumo
- **Rendas** (`/rendas`) - Gerenciar rendas
- **Gastos** (`/gastos`) - Gerenciar gastos
- **Análises** (`/analises`) - Relatórios e gráficos

## 🔄 Próximos Passos

Para executar as migrations no banco de dados quando estiver disponível:

```bash
npm run db:migrate:dev
```

Ou em produção:

```bash
npm run db:migrate:deploy
```

## 📊 Utilitários de Análise

**Arquivo:** `lib/utils/dateAnalysis.ts`

Funções disponíveis:
- `getDateRangeForPeriod()` - Obter range de datas para um período
- `filterByDateRange()` - Filtrar itens por range de datas
- `calculatePeriodAnalysis()` - Calcular análise de um período
- `getPeriodLabel()` - Obter label formatada do período
- `getMultiplePeriods()` - Obter múltiplos períodos para comparação
- `formatCurrency()` - Formatar valores em moeda BRL

## 🎨 Componentes

- **PeriodSelector** - Seletor de período de análise
- **PeriodAnalysisChart** - Gráfico de análise por período
- **StatsCard** - Card de estatísticas (reutilizável)
