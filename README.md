# 🚀 Lead Kanban Backend

API REST em NestJS para autenticacao, gestao de leads em funil Kanban e integracao com um microservico de IA em FastAPI.

## 🧰 Tecnologias

- Node.js 22 LTS
- NestJS 11
- PostgreSQL 16
- Prisma ORM 6
- JWT
- bcryptjs
- Swagger
- Docker e Docker Compose

## 📁 Estrutura do backend

```txt
backend-case/
|-- prisma/
|   |-- migrations/             # Historico de migrations do banco
|   `-- schema.prisma           # Modelos User, Status e Lead
|-- src/
|   |-- common/                 # Decorators e tipos compartilhados
|   |-- modules/
|   |   |-- ai/                 # Integracao com microservico FastAPI
|   |   |-- auth/               # Registro, login, JWT e guard
|   |   |-- leads/              # CRUD, filtros, Kanban e movimentacao de leads
|   |   |-- prisma/             # PrismaModule e PrismaService
|   |   |-- statuses/           # Etapas do pipeline Kanban
|   |   `-- users/              # Criacao e consulta de usuarios
|   |-- types/                  # Declaracoes auxiliares de tipos
|   |-- app.module.ts           # Modulo raiz da aplicacao
|   `-- main.ts                 # Bootstrap, Swagger, CORS e prefixo /api
|-- docker-compose.yml          # Backend + PostgreSQL
|-- Dockerfile                  # Build da API em container
`-- package.json                # Scripts, dependencias e configuracao do Jest
```

Os testes ficam ao lado dos services testados, usando a convencao `*.test.ts`. Exemplo: `src/modules/auth/auth.service.test.ts`.

## ✅ Modulos com testes

O backend possui testes unitarios para os principais modulos de regra de negocio:

- `AuthService`: registro, login, normalizacao de e-mail e credenciais invalidas.
- `LeadsService`: listagem com filtros, criacao, movimentacao e validacao de dono.
- `StatusesService`: pipeline padrao, ordenacao, ownership e exclusao segura.
- `UsersService`: criacao de usuario e conflito de e-mail duplicado.

Para executar:

```powershell
npm test
```

Para rodar com cobertura:

```powershell
npm run test:cov
```

## 📌 Requisitos

Para rodar localmente sem Docker:

- Node.js 22+
- npm 10+
- PostgreSQL instalado e rodando

Para rodar com Docker:

- Docker Desktop
- Docker Compose, ja incluido no Docker Desktop

## 🔐 Variaveis de ambiente

Crie o arquivo `.env` a partir do exemplo:

```powershell
Copy-Item .env.example .env
```

Preencha os valores no `.env`.

Exemplo para desenvolvimento local:

```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/DATABASE_NAME?schema=public"
JWT_SECRET="YOUR_LONG_RANDOM_SECRET"
JWT_EXPIRES_IN="1d"
PORT=3000
CORS_ORIGIN="http://localhost:3001"
AI_SERVICE_URL="http://localhost:8000"
```

Quando o backend roda dentro do Docker Compose, o `DATABASE_URL` e sobrescrito para usar o host `postgres`, que e o nome do servico Docker. Para rodar localmente fora do Docker, use `localhost`.

## 🐳 Rodando com Docker Compose

Este e o caminho mais simples, porque o Compose sobe o PostgreSQL e o backend juntos.

1. Instale o Docker Desktop:

```txt
https://www.docker.com/products/docker-desktop/
```

2. Abra o Docker Desktop e espere ele iniciar.

3. Crie o `.env`:

```powershell
Copy-Item .env.example .env
```

4. No `.env`, defina pelo menos um `JWT_SECRET` real:

```env
JWT_SECRET="use-uma-string-longa-e-aleatoria"
```

5. Suba os containers:

```powershell
docker compose up -d --build
```

6. Acesse o Swagger:

```txt
http://localhost:3000/docs
```

Comandos uteis:

```powershell
docker compose ps
docker compose logs -f backend
docker compose logs -f postgres
docker compose down
```

Para apagar tambem os dados do banco Docker:

```powershell
docker compose down -v
```

Use `-v` com cuidado, pois ele remove o volume do PostgreSQL.

## 💻 Rodando localmente sem Docker

Use este caminho se quiser rodar o NestJS direto na sua maquina com `npm run start:dev`.

### 1. Instalar PostgreSQL no Windows

Baixe o instalador oficial:

```txt
https://www.postgresql.org/download/windows/
```

Durante a instalacao:

- mantenha a porta `5432`
- defina a senha do usuario `postgres`
- instale tambem o `pgAdmin` se quiser uma interface visual

Depois da instalacao, confirme se o PostgreSQL esta rodando:

```powershell
Test-NetConnection localhost -Port 5432
```

O resultado esperado e:

```txt
TcpTestSucceeded : True
```

### 2. Criar o banco

Se voce instalou o PostgreSQL com o usuario `postgres`, crie o banco:

```powershell
createdb -U postgres lead_kanban
```

Se o comando `createdb` nao for reconhecido, adicione a pasta `bin` do PostgreSQL ao PATH ou use o pgAdmin para criar um database chamado `lead_kanban`.

### 3. Configurar o .env

Crie o arquivo:

```powershell
Copy-Item .env.example .env
```

Configure o `DATABASE_URL` de acordo com seu usuario, senha e banco:

```env
DATABASE_URL="postgresql://postgres:SUA_SENHA@localhost:5432/lead_kanban?schema=public"
JWT_SECRET="use-uma-string-longa-e-aleatoria"
JWT_EXPIRES_IN="1d"
PORT=3000
CORS_ORIGIN="http://localhost:3001"
AI_SERVICE_URL="http://localhost:8000"
```

### 4. Instalar dependencias

```powershell
npm install
```

### 5. Gerar Prisma Client

```powershell
npm run prisma:generate
```

### 6. Rodar migrations

```powershell
npm run prisma:migrate
```

Para criar uma migration com nome especifico depois de alterar o `schema.prisma`:

```powershell
npm run prisma:migrate -- --name nome_da_migration
```

### 7. Iniciar a API

```powershell
npm run start:dev
```

A API fica em:

```txt
http://localhost:3000/api
```

Swagger:

```txt
http://localhost:3000/docs
```

## 🗄️ Prisma e migrations

Durante desenvolvimento, use:

```powershell
npm run prisma:migrate -- --name nome_da_migration
```

Esse comando cria uma migration em `prisma/migrations` e aplica no banco configurado no `.env`.

Dentro do Docker, o container aplica migrations existentes automaticamente ao iniciar:

```dockerfile
npx prisma migrate deploy && node dist/main
```

Se quiser aplicar manualmente dentro do container:

```powershell
docker compose exec backend npx prisma migrate deploy
```

## 🧭 Endpoints principais

- `POST /api/auth/register`: cria usuario e pipeline padrao
- `POST /api/auth/login`: retorna JWT
- `GET /api/auth/me`: retorna usuario autenticado
- `GET /api/statuses`: lista status do pipeline
- `POST /api/statuses`: cria status
- `PATCH /api/statuses/:id`: atualiza status
- `DELETE /api/statuses/:id`: remove status vazio
- `GET /api/leads`: lista leads com filtros `search` e `statusId`
- `GET /api/leads/kanban`: lista status com leads agrupados
- `POST /api/leads`: cria lead
- `PATCH /api/leads/:id`: edita lead
- `PATCH /api/leads/:id/move`: move lead entre status
- `DELETE /api/leads/:id`: remove lead
- `POST /api/ai/chat`: encaminha mensagens para o microservico FastAPI

## 🛡️ Autenticacao

As rotas protegidas esperam um JWT no header:

```http
Authorization: Bearer <token>
```

O token e retornado em:

```http
POST /api/auth/login
```

## 🤖 Integracao com frontend e IA

O frontend NextJS deve chamar esta API em:

```txt
http://localhost:3000/api
```

Para o chatbot, o frontend chama:

```http
POST /api/ai/chat
```

O backend encaminha a conversa para o microservico FastAPI configurado em `AI_SERVICE_URL`.

Payload esperado:

```json
{
  "messages": [
    {
      "role": "user",
      "content": "Quais leads devo priorizar hoje?"
    }
  ],
  "context": "Tela Kanban de vendas"
}
```

## 🧪 Scripts

```powershell
npm run start:dev
npm run build
npm run lint
npm test
npm run test:cov
npm run prisma:generate
npm run prisma:migrate
npm run prisma:studio
```

## 🔒 Observacoes de seguranca

- Nunca suba o arquivo `.env` para o GitHub.
- Use um `JWT_SECRET` longo e aleatorio.
- Em producao, configure `CORS_ORIGIN` com o dominio real do frontend.
- Use `prisma migrate deploy` em ambientes de deploy.
