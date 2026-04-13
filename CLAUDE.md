# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Flute is a LingQ-style language learning app for reading-based study. Users import text content, click words for translations, track vocabulary status, and review via spaced repetition (FSRS). Multi-user with header-based auth (`x-username`). Users supply their own translation API keys (Google Translate, DeepL).

## Commands

```bash
# Development (from repo root)
npm run dev              # Start both server (3001) and client (5173) concurrently
npm run dev:server       # Server only
npm run dev:client       # Client only

# Testing
npm run test             # Run tests in shared + server workspaces
npm run test -w server   # Server tests only
npm run test -w shared   # Shared tests only

# Database (from root or server workspace)
npm run db:migrate -w server   # Run Prisma migrations
npm run db:seed -w server      # Seed 20 languages
npm run db:studio -w server    # Visual DB editor

# Build
npm run build -w client  # tsc + vite build
npm run build -w server  # tsc to dist/
```

## Architecture

**Monorepo** with npm workspaces: `shared`, `server`, `client`.

### shared/
Types (`WordStatus` enum, entity interfaces), constants (providers, file types), and `tokenizer.ts` (text tokenization with CJK character detection). Used by both server and client.

### server/
Express 4 + Prisma ORM + PostgreSQL. Routes in `src/routes/`, services in `src/services/`.

- **Auth**: Header-based (`x-username`), `requireAuth` middleware upserts user
- **Translation**: Provider pattern (`src/services/translation/`) — factory returns Google or DeepL provider based on user's stored API key. Keys encrypted with AES-256-GCM via `encryption.ts`
- **SRS**: `ts-fsrs` library wrapped in `srs.service.ts` — handles card scheduling, rating (Again/Hard/Good/Easy), interval formatting
- **File parsing**: `file-parser.ts` handles .txt, .epub (chapters→lessons), .srt
- **Authorization**: `assertOwnership(userId, resource, resourceId)` checks collection/lesson ownership

### client/
React 19 + Vite 6 + Wouter (routing) + TanStack Query + Tailwind CSS 4.

- **Word state**: `useWordStatuses` hook uses `useSyncExternalStore` with an external store to avoid O(n) re-renders — each `WordToken` subscribes only to its own term
- **Auth state**: `useAuth` hook uses `useSyncExternalStore` + storage events for cross-tab sync
- **API layer**: `lib/api.ts` — `apiFetch()` wrapper injects `x-username` header from localStorage
- **Dev proxy**: Vite proxies `/api` requests to `http://localhost:3001`

### Key data flow (Reader)
1. Lesson text tokenized via shared `tokenizer.ts`
2. Each token rendered as `WordToken` (memo'd, subscribes to its term in external store)
3. Word click → popup with status/translation/notes; changes go through optimistic local update then API call
4. Phrase selection → sentence translation via translation provider

## Database

PostgreSQL with Prisma. Schema at `server/prisma/schema.prisma`. Key models: User, Language, Collection, Lesson, Word, WordReview, ApiKey, TranslationCache.

Word status values: New=0, Learning1=1, Learning2=2, Learning3=3, Learning4=4, Known=5, Ignored=6.

## Environment

Requires `.env` in `server/` with:
- `DATABASE_URL` — PostgreSQL connection string
- `ENCRYPTION_KEY` — for API key encryption
- `PORT` — server port (default 3001)
