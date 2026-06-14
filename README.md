# Lead Kanban Backend

API REST em NestJS para autenticacao, gestao de leads em funil Kanban, cadastro de imoveis e integracao com um microservico de IA.

## Tecnologias

- Node.js 22 LTS
- NestJS 11
- PostgreSQL 16
- Prisma ORM 6
- JWT
- bcryptjs
- Swagger
- Docker e Docker Compose

## Estrutura

```txt
backend-case/
|-- prisma/
|   |-- migrations/             # Historico de migrations do banco
|   `-- schema.prisma           # Modelos User, Status, Lead e Imovel
|-- src/
|   |-- common/                 # Decorators e tipos compartilhados
|   |-- modules/
|   |   |-- ai/                 # Integracao com microservico de IA
|   |   |-- auth/               # Registro, login, JWT e guard
|   |   |-- imoveis/            # CRUD de imoveis
|   |   |-- leads/              # CRUD, filtros, Kanban e movimentacao de leads
|   |   |-- prisma/             # PrismaModule e PrismaService
|   |   |-- statuses/           # CRUD das etapas do funil Kanban
|   |   `-- users/              # Criacao e consulta de usuarios
|   |-- app.module.ts
|   `-- main.ts                 # Bootstrap, Swagger, CORS e prefixo /api
|-- docker-compose.yml
|-- Dockerfile
`-- package.json
```

## Regras principais

- Cada usuario tem seus proprios leads, status e imoveis.
- Ao registrar um usuario, o backend cria um pipeline padrao de status.
- Status sao personalizaveis: o usuario pode criar, editar, ordenar, escolher cor e apagar.
- Um mesmo imovel pode estar relacionado a varios leads.
- Cada lead pode ter no maximo um `imovelId`.
- Ao editar o preco de um imovel, o backend sincroniza o `value` dos leads ligados a ele.
- Ao apagar um imovel, os leads ligados ficam sem `imovelId` e com `value` nulo.
- A IA recebe um contexto montado pelo backend com dados do CRM do usuario autenticado.

## Variaveis de ambiente

Crie o arquivo `.env` a partir do exemplo:

```powershell
Copy-Item .env.example .env
```

Exemplo para desenvolvimento local:

```env
DATABASE_URL="postgresql://postgres:SUA_SENHA@localhost:5432/lead_kanban?schema=public"
JWT_SECRET="use-uma-string-longa-e-aleatoria"
JWT_EXPIRES_IN="1d"
PORT=3000
CORS_ORIGIN="http://localhost:3001"
AI_SERVICE_URL="http://localhost:8000"
```

## Rodando localmente

Instale as dependencias:

```powershell
npm install
```

Gere o Prisma Client:

```powershell
npm run prisma:generate
```

Rode as migrations:

```powershell
npm run prisma:migrate
```

Inicie a API:

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

## Rodando com Docker Compose

Suba os containers:

```powershell
docker compose up -d --build
```

Acesse o Swagger:

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

## Prisma e migrations

Durante desenvolvimento:

```powershell
npm run prisma:migrate -- --name nome_da_migration
```

Depois de alterar o `schema.prisma`, gere o client:

```powershell
npm run prisma:generate
```

Em deploy, aplique migrations existentes:

```powershell
npx prisma migrate deploy
```

## Autenticacao

As rotas protegidas esperam um JWT no header:

```http
Authorization: Bearer <token>
```

O token e retornado em:

```http
POST /api/auth/login
```

## Endpoints principais

### Auth

- `POST /api/auth/register`: cria usuario e pipeline padrao.
- `POST /api/auth/login`: retorna JWT.
- `GET /api/auth/me`: retorna usuario autenticado.

### Statuses

- `GET /api/statuses`: lista status do pipeline com contagem de leads.
- `POST /api/statuses`: cria status.
- `PATCH /api/statuses/:id`: atualiza nome, cor e ordem.
- `DELETE /api/statuses/:id`: remove status vazio.
- `DELETE /api/statuses/:id?moveToStatusId=<id>`: move os leads para outro status antes de apagar.

Payload de criacao/edicao:

```json
{
  "name": "Visita agendada",
  "color": "#14b8a6",
  "order": 2
}
```

`color` e `order` sao opcionais. Se `order` nao for enviado na criacao, o backend coloca o status no final do pipeline.

### Leads

- `GET /api/leads`: lista leads com filtros `search` e `statusId`.
- `GET /api/leads/kanban`: lista status com leads agrupados.
- `POST /api/leads`: cria lead.
- `PATCH /api/leads/:id`: edita lead.
- `PATCH /api/leads/:id/move`: move lead entre status.
- `DELETE /api/leads/:id`: remove lead.

Criando lead com imovel existente:

```json
{
  "company": "Acme Ltda",
  "contactName": "Carla Souza",
  "email": "carla@acme.com",
  "phone": "+55 11 99999-9999",
  "statusId": "status-id",
  "imovelId": "imovel-id",
  "nextFollowUp": "2026-06-15T14:00:00.000Z"
}
```

Criando lead e imovel juntos:

```json
{
  "company": "Acme Ltda",
  "contactName": "Carla Souza",
  "statusId": "status-id",
  "imovel": {
    "title": "Apartamento no Centro",
    "city": "Sao Paulo",
    "state": "SP",
    "price": 450000
  }
}
```

Use `imovelId` ou `imovel`, nunca os dois ao mesmo tempo.

### Imoveis

- `GET /api/imoveis`: lista imoveis do usuario com os leads relacionados.
- `GET /api/imoveis/:id`: consulta imovel.
- `POST /api/imoveis`: cria imovel.
- `PATCH /api/imoveis/:id`: edita imovel.
- `DELETE /api/imoveis/:id`: remove imovel e limpa o vinculo dos leads ligados a ele.

Payload de imovel:

```json
{
  "title": "Casa Jardim",
  "propertyType": "Casa",
  "address": "Rua das Flores, 123",
  "city": "Sao Paulo",
  "state": "SP",
  "price": 650000,
  "bedrooms": 3,
  "bathrooms": 2,
  "areaM2": 120,
  "notes": "Aceita financiamento."
}
```

### IA

- `POST /api/ai/chat`: envia mensagens para o microservico de IA com contexto do CRM.

Payload recebido do frontend:

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

O campo `context` do frontend e opcional. O backend monta um novo contexto em JSON com:

- `crm.statuses`: status do pipeline com cor, ordem e contagem de leads.
- `crm.recentLeads`: ultimos leads atualizados com status e imovel relacionado.
- `crm.upcomingContacts`: proximos contatos baseados em `nextFollowUp`.
- `crm.imoveis`: catalogo resumido de imoveis.
- `matchedCrm`: recorte priorizado por termos das ultimas mensagens do usuario.
- `extraContext`: texto opcional enviado pelo frontend.
- `unavailableData`: dados ainda sem tabela propria, como tarefas e historico dedicado.

Payload enviado pelo backend ao microservico configurado em `AI_SERVICE_URL`:

```json
{
  "userId": "user-id",
  "messages": [
    {
      "role": "user",
      "content": "Quais leads devo priorizar hoje?"
    }
  ],
  "context": "{\"generatedAt\":\"2026-06-14T12:00:00.000Z\",\"matchedCrm\":null,\"crm\":{\"statuses\":[],\"recentLeads\":[],\"upcomingContacts\":[],\"imoveis\":[]}}"
}
```

## Testes

Os testes ficam ao lado dos services testados, usando a convencao `*.test.ts`.

Rodar todos os testes:

```powershell
npm test
```

Rodar build:

```powershell
npm run build
```

Rodar cobertura:

```powershell
npm run test:cov
```

## Scripts

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

## Observacoes de seguranca

- Nunca suba o arquivo `.env` para o GitHub.
- Use um `JWT_SECRET` longo e aleatorio.
- Em producao, configure `CORS_ORIGIN` com o dominio real do frontend.
- Use `prisma migrate deploy` em ambientes de deploy.
