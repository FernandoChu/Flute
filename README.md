# Flute

A reading-based language learning app inspired by Lute3, LingQ, and Readlang. Import text content, select words for instant translations and audio playback, track vocabulary progress, and review with spaced repetition (FSRS).

The name Flute is to pay respect to Lute3, which stands for (Learning Using Texts). I'll let you decide what the `F` in Flute stands for.

Below, an AI-generated description.

## Features

- **Interactive Reader** — Click any word for translations, status tracking, and notes. Select phrases for sentence-level translation.
- **Vocabulary Tracking** — Words progress through stages: New → Learning (1–4) → Known/Ignored. Filter, sort, and browse your full vocabulary.
- **Spaced Repetition** — Review due words with FSRS scheduling (Again/Hard/Good/Easy ratings).
- **Content Import** — Upload `.txt`, `.epub` (chapters become lessons), and `.srt` subtitle files. Attach audio to lessons.
- **Translation Providers** — Bring your own Google Translate or DeepL API key. Keys are encrypted at rest (AES-256-GCM).
- **Multi-language** — Supports CJK and space-delimited languages with appropriate tokenization.
- **Multi-user** — Header-based auth (`x-username`), per-user vocabulary and settings.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Client | React 19, Vite 6, Tailwind CSS 4, Wouter, TanStack Query |
| Server | Express 4, Prisma 7, PostgreSQL |
| Shared | TypeScript types, constants, tokenizer |
| SRS | ts-fsrs |

Monorepo managed with npm workspaces (`shared/`, `server/`, `client/`).

## Getting Started

### Prerequisites

- Node.js
- PostgreSQL

### Setup

```bash
npm install

# Configure server environment
cp server/.env.example server/.env
# Edit server/.env with:
#   DATABASE_URL=postgresql://...
#   ENCRYPTION_KEY=<32-byte hex key>
#   PORT=3001

# Initialize database
npm run db:migrate -w server
npm run db:seed -w server      # Seeds 20 languages

# Start development
npm run dev                    # Server (3001) + Client (5173)
```

## Commands

```bash
# Development
npm run dev              # Start server + client concurrently
npm run dev:server       # Server only (port 3001)
npm run dev:client       # Client only (port 5173)

# Testing
npm run test             # Run all tests
npm run test -w server   # Server tests only
npm run test -w shared   # Shared tests only

# Database
npm run db:migrate -w server   # Run Prisma migrations
npm run db:seed -w server      # Seed languages
npm run db:studio -w server    # Visual DB editor (Prisma Studio)

# Build
npm run build -w client  # TypeScript + Vite build
npm run build -w server  # TypeScript build
```

## Project Structure

```
shared/          Types, constants, tokenizer (used by both server and client)
server/
  src/
    routes/      Express route handlers
    services/    Business logic (translation, SRS, file parsing, encryption)
  prisma/        Schema and migrations
client/
  src/
    pages/       LoginPage, LibraryPage, ReaderPage, VocabularyPage, ReviewPage, SettingsPage
    components/  Reader, vocabulary, modals, layout
    hooks/       useAuth, useWordStatuses (useSyncExternalStore for performance)
    lib/         API client with x-username header injection
```
