# Flute

A reading-based language learning app inspired by LingQ, Lute3, and Readlang. Import text content, click words for translations, track vocabulary status, and review via spaced repetition (FSRS).

This project is mostly vibe coded.

## Features

- **Import content** — paste text or upload `.txt`, `.epub`, and `.srt` files; EPUBs are split into chapters as individual lessons
- **Interactive reader** — click any word to see its translation, set vocabulary status, and add notes
- **Phrase translation** — select a phrase or sentence for full translation
- **Vocabulary tracking** — words progress through statuses (New → Learning 1–4 → Known/Ignored)
- **Spaced repetition** — review vocabulary with FSRS scheduling (Again/Hard/Good/Easy ratings)
- **Translation providers** — bring your own Google Translate or DeepL API key
- **Multi-user** — header-based auth (`x-username`)

## Tech Stack

| Layer    | Stack                                              |
| -------- | -------------------------------------------------- |
| Client   | React 19, Vite 6, Tailwind CSS 4, Wouter, TanStack Query |
| Server   | Express 4, Prisma ORM, PostgreSQL                  |
| Shared   | TypeScript types, constants, tokenizer              |
| Infra    | Docker, docker-compose                              |

## Getting Started

### With Docker

```bash
docker compose up
```

This starts PostgreSQL and the app, runs migrations, seeds languages, and serves on `http://localhost:3001`.

### Local Development

**Prerequisites:** Node.js 22+, PostgreSQL

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment — create `server/.env`:
   ```
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/flute?schema=public
   ENCRYPTION_KEY=<32-byte-hex-key>
   PORT=3001
   ```

3. Set up the database:
   ```bash
   npm run db:migrate -w server
   npm run db:seed -w server
   ```

4. Start development servers:
   ```bash
   npm run dev
   ```
   Server runs on `http://localhost:3001`, client on `http://localhost:5173` (proxies API requests to the server).

## Project Structure

```
flute/
├── shared/          # Types, constants, tokenizer (used by server + client)
├── server/          # Express API + Prisma
│   ├── src/
│   │   ├── routes/
│   │   ├── services/
│   │   └── middleware/
│   └── prisma/      # Schema + migrations
├── client/          # React SPA
│   └── src/
│       ├── components/
│       ├── hooks/
│       ├── pages/
│       └── lib/
├── docker-compose.yml
└── Dockerfile
```

## Scripts

```bash
npm run dev              # Start server + client concurrently
npm run dev:server       # Server only
npm run dev:client       # Client only
npm run test             # Run all tests (shared + server)
npm run db:migrate -w server   # Run Prisma migrations
npm run db:seed -w server      # Seed languages
npm run db:studio -w server    # Open Prisma Studio
```
