# Financial Dashboard

Dashboard financeiro pessoal para controle de gastos, investimentos e proventos. Desenvolvido com Next.js 16, React 19 e banco de dados na edge com Turso.

## Funcionalidades

- **Dashboard** — visão geral do mês com KPIs de saldo, gastos e patrimônio
- **Gastos** — registro de transações, categorização, gráfico por categoria e checklist mensal
- **Investimentos** — posições em carteira, alocação por ativo, evolução do patrimônio e histórico de proventos
- **Importação XP** — upload de extrato da XP Investimentos (.xlsx) com parser automático
- **Privacy toggle** — oculta todos os valores financeiros com um clique
- **Responsivo** — layout adaptado para mobile e desktop com sidebar recolhível
- **Temas** — suporte a modo claro e escuro

## Tech Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI | React 19 + TypeScript |
| Estilo | Tailwind CSS v4 + shadcn/ui |
| Gráficos | Recharts |
| Banco de dados | Turso (libSQL / SQLite na edge) |
| Formulários | React Hook Form + Zod |
| Deploy | Vercel |

## Rodando localmente

### Pré-requisitos

- Node.js 18+
- Conta no [Turso](https://turso.tech) (gratuita)

### 1. Clone o repositório

```bash
git clone https://github.com/bellegalvao/financial-dashboard.git
cd financial-dashboard
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Configure as variáveis de ambiente

Crie um arquivo `.env.local` na raiz do projeto:

```env
TURSO_DATABASE_URL=libsql://seu-banco.turso.io
TURSO_AUTH_TOKEN=seu-token
```

Para obter esses valores, crie um banco no Turso:

```bash
turso db create financial-dashboard
turso db show financial-dashboard --url
turso db tokens create financial-dashboard
```

### 4. Inicie o servidor de desenvolvimento

```bash
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000) no navegador.

## Deploy

O projeto está configurado para deploy na Vercel. Adicione as variáveis `TURSO_DATABASE_URL` e `TURSO_AUTH_TOKEN` nas configurações de ambiente do projeto na Vercel.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/bellegalvao/financial-dashboard)
