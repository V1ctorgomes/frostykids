# Frosty Kids — Controle de crianças

Aplicação mobile-first para cadastro, busca e check-in de crianças no evento Frosty.

## Stack

- Next.js + TypeScript + Tailwind
- Prisma + PostgreSQL
- Auth por senha compartilhada
- Pronto para Docker e Vercel

## Identidade

Cores oficiais Frosty:

- Azul `#0034DB`
- Verde `#46C42C`
- Logo em `public/logo-frosty.svg`

## Rodar com Docker (recomendado localmente)

```bash
docker compose up --build -d
```

App: http://localhost:3080  
Senha padrão: `frosty2026` (altere com `APP_PASSWORD`)

> A porta `3080` evita conflito com outros serviços locais. Para mudar, edite `ports` em `docker-compose.yml`.

Só o banco (para usar `npm run dev`):

```bash
npm run docker:db
cp .env.example .env   # se ainda não tiver
npm install
npm run db:push
npm run dev
```

## Importar planilha

```bash
npm run import -- ./dados/sua-planilha.xlsx
```

## Deploy na Vercel

1. Crie o projeto na Vercel e importe o repositório.
2. Crie um banco Postgres (Prisma Postgres / Neon / Vercel Postgres).
3. Configure as variáveis de ambiente:

| Variável | Descrição |
|---|---|
| `DATABASE_URL` | Connection string do Postgres |
| `APP_PASSWORD` | Senha da equipe |
| `SESSION_SECRET` | Segredo longo aleatório |

4. Deploy. O build já roda `prisma generate`.
5. Após o primeiro deploy, sincronize o schema:

```bash
DATABASE_URL="sua-url-de-producao" npx prisma db push
DATABASE_URL="sua-url-de-producao" npm run import -- ./dados/planilha.xlsx
```

Região sugerida: `gru1` (São Paulo) — já definida em `vercel.json`.

## Uso no celular

- Layout estreito (max ~28rem), botões grandes, dock fixo no rodapé
- Fonte 16px nos inputs (sem zoom no iOS)
- Safe-area para notch
- Check-in com um toque por criança
