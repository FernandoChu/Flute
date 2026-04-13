# LingQ Clone — Implementation Plan

## Context
Build a LingQ-style language learning app. Users import text content, read it interactively (clicking words for translations), track vocabulary status, and review words via spaced repetition. Multi-user with auth. Users supply their own translation API keys.

**Tech stack**: Vite+React+TypeScript (wouter routing) | Node+Express+PostgreSQL  
**Monorepo**: `/client`, `/server`, `/shared`

---

## Phase 1: Scaffolding & Database

**Goal**: Monorepo structure, DB schema, dev tooling, health check endpoint.

**Root files**: `package.json` (workspaces), `tsconfig.base.json`, `.gitignore`, `.env.example`

**`/shared`**: Shared TS types (`Collection`, `Lesson`, `Word`, `WordReview`, `WordStatus` enum), constants (provider names, file types)

**`/server`**: Express entrypoint, Prisma schema + migrations + seeds

**Database tables**:
| Table | Key columns |
|-------|-------------|
| `users` | id (UUID), username (UNIQUE), native_language_id, study_language_id, created_at |
| `api_keys` | user_id, provider, api_key_encrypted; UNIQUE(user_id, provider) |
| `languages` | id (serial), code (ISO 639-1), name |
| `collections` | user_id, title, source_language_id, target_language_id |
| `lessons` | collection_id, title, text_content, audio_url, position |
| `words` | user_id, language_id, term, translation, status (0=New,1-4=Learning,5=Known,6=Ignored); UNIQUE(user_id, language_id, term) |
| `word_reviews` | word_id (UNIQUE), ease_factor, interval, repetitions, next_review, last_reviewed |

**`/client`**: Vite config (proxy `/api` → `:3001`), React root, App with route stubs, fetch wrapper with `x-username` header injection from `localStorage`. Use `@tanstack/react-query` for data fetching.

**Prisma setup**: `server/prisma/schema.prisma` with all models. Run `prisma migrate dev` to create tables, `prisma db seed` for language seeds.

**Verify**: Server starts → `GET /api/health` returns OK. Client dev server renders stub page. `npx prisma studio` shows tables.

---

## Phase 2: Authentication (Simple Username)

**No external auth libraries.** This app is designed for self-hosting, so authentication is just selecting/creating a username.

**Server files**:
- `middleware/auth.ts` — reads `x-username` header from requests. Looks up (or auto-creates) a `users` row by username. Attaches `req.user` (with `id` and `username`) to the request. Returns 401 if header is missing.
- `routes/auth.ts` — `POST /api/auth/login` (body: `{ username }`) — upserts user, returns user object. `GET /api/auth/me` — returns current user from header. `GET /api/auth/users` — lists all usernames (for the picker).

**Client files**:
- `pages/LoginPage.tsx` — username text input + "Enter" button. Shows existing usernames as quick-select options. Stores chosen username in `localStorage`.
- `hooks/useAuth.ts` — reads username from `localStorage`, provides `login(username)` / `logout()` / `currentUser`. Redirects to login page if no username set.
- `components/ProtectedRoute.tsx` — checks `localStorage` for username, redirects to `/login` if absent.
- Fetch wrapper injects `x-username` header on every API request from `localStorage`.

**Details**: On login, the server upserts a `users` row by username. All other tables FK to `users.id`. No passwords, no tokens, no sessions — just the username header. Suitable for single-user or trusted-network self-hosted deployments.

---

## Phase 3: Content Management

**Libraries**: `multer`, `epub2` (EPUB parsing), `srt-parser-2`

**Server files**:
- `routes/collections.ts`, `routes/lessons.ts` — full CRUD
- `services/file-parser.ts` — `parseTxt`, `parseEpub` (extracts chapters), `parseSrt`
- `services/authorization.ts` — `assertOwnership(userId, resource, id)` utility using Prisma queries

**Key endpoints**:
- `GET/POST /api/collections`, `PUT/DELETE /api/collections/:id`
- `GET/POST /api/collections/:id/lessons`
- `POST /api/collections/:id/lessons/upload` — multipart file upload
- `GET/PUT/DELETE /api/lessons/:id`
- `GET /api/languages` (public)

**Client files**:
- `pages/LibraryPage.tsx` — collection grid with lesson lists
- `CreateCollectionModal.tsx` — title + source/target language pickers
- `CreateLessonModal.tsx` — text paste OR file upload (.txt/.epub/.srt)

**EPUB handling**: chapters become separate lessons within the collection.

---

## Phase 4: Reader View (core feature)

This is the heart of the app — the most complex component.

**`/shared`**: `tokenizer.ts` — splits text into word/non-word tokens. Handles CJK (per-character split) via Unicode range detection.

**Server**: `routes/words.ts` + `services/word.service.ts` — word CRUD + batch status updates.

**Endpoints**:
- `GET /api/words?languageId=X` — all user words for a language (batch load)
- `POST /api/words` — create/save word
- `PUT /api/words/:id` — update status/translation/notes
- `PATCH /api/words/batch-status` — bulk status change

**Client files**:
- `pages/ReaderPage.tsx` — fetches lesson + word statuses, manages popup state
- `components/reader/TokenizedText.tsx` — renders word tokens, memoized
- `components/reader/WordToken.tsx` — clickable word, CSS class by status (blue=new, yellow gradient=learning 1-4, none=known, dimmed=ignored). `React.memo` with custom comparator.
- `components/reader/WordPopup.tsx` — floating popup (portal) showing term, translation, status selector (1/2/3/4/K/X), notes field
- `components/reader/SentenceTranslation.tsx` — translate full sentence on demand
- `hooks/useWordStatuses.ts` — loads word map, provides `getStatus(term)` + `updateWord(term, data)` with optimistic updates. Uses `useSyncExternalStore` pattern to avoid O(n) re-renders.

**Performance**: ~5000 word tokens per lesson. React.memo + external store pattern keeps re-renders scoped to changed words only.

---

## Phase 5: Translation API Integration

**Libraries**: `axios` (external API calls), Node `crypto` (AES-256-GCM for key encryption)

**Server files**:
- `services/encryption.ts` — encrypt/decrypt API keys (AES-256-GCM, `ENCRYPTION_KEY` env var)
- `services/translation/translation.provider.ts` — `TranslationProvider` interface (`translateWord`, `translateSentence`)
- `services/translation/google.provider.ts` — Google Translate v2
- `services/translation/deepl.provider.ts` — DeepL API
- `services/translation/factory.ts` — `getProvider(providerName, apiKey)` factory
- `routes/settings.ts` — API key management (never returns raw keys)
- `routes/translate.ts` — translation proxy endpoints
- `middleware/rateLimit.ts` — per-user rate limiting (60 req/min)

**Key endpoints**:
- `GET/POST/DELETE /api/settings/api-keys` — manage keys (GET returns `hasKey` only)
- `POST /api/translate/word` — `{ term, sourceLang, targetLang }` → `{ translation }`
- `POST /api/translate/sentence` — full sentence translation
- `POST /api/translate/test` — validate key works

**Client**: `pages/SettingsPage.tsx` — provider selector, masked key display, test button. Wire translation into `WordPopup`.

**Extensibility**: New provider = new file implementing interface + register in factory + add to constants.

**Translation cache**: Cache results in DB table `(source_lang, target_lang, term, provider, translation)` to save users money.

---

## Phase 6: Vocabulary Management

**Server**: `routes/vocabulary.ts` — filtered, paginated, sorted word listing.

**Endpoints**:
- `GET /api/vocabulary?languageId&status&search&sortBy&sortDir&page&limit` → `{ words, total, page, pages }`
- `GET /api/vocabulary/stats?languageId` → `{ total, new, learning, known, ignored }`
- `DELETE /api/words/:id`, `DELETE /api/words/batch`

**Client files**:
- `pages/VocabularyPage.tsx` — table with filters, sort, pagination, inline editing, bulk actions
- `components/vocabulary/VocabularyTable.tsx`, `StatusBadge.tsx`, `VocabularyFilters.tsx`
- `components/common/Pagination.tsx`

**Dashboard update**: Show per-language word counts, due reviews today, recent lessons.

---

## Phase 7: SRS Review System

**Library**: `ts-fsrs` ([open-spaced-repetition/ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs)) — FSRS algorithm (superior to SM-2).

**Database migration**: Update `word_reviews` table to store FSRS card fields:
| Column | Type | Default | Notes |
|--------|------|---------|-------|
| `due` | DateTime | now() | Next review date |
| `stability` | Float | 0 | Memory strength |
| `difficulty` | Float | 0 | Card difficulty [1-10] |
| `elapsed_days` | Int | 0 | Days since last review |
| `scheduled_days` | Int | 0 | Days until next review |
| `reps` | Int | 0 | Total reviews completed |
| `lapses` | Int | 0 | Count of failures |
| `state` | Int | 0 | 0=New, 1=Learning, 2=Review, 3=Relearning |
| `last_review` | DateTime? | null | Most recent review timestamp |

Remove old SM-2 columns (`ease_factor`, `interval`, `repetitions`, `next_review`, `last_reviewed`).

**Server**: `services/srs.service.ts` — thin wrapper around `ts-fsrs`.
- `createScheduler()` — returns `fsrs()` instance
- `scheduleReview(card, rating)` — calls `scheduler.next(card, now, rating)`, returns updated card + log
- `getEmptyCard()` — calls `createEmptyCard()` from ts-fsrs
- `previewRatings(card)` — calls `scheduler.repeat(card, now)`, returns next due dates for all 4 ratings (for UI preview)

**Endpoints**:
- `GET /api/reviews/due?languageId&limit=20` — words with `due <= now`, ordered by due date
- `GET /api/reviews/due/count` — count of due reviews
- `POST /api/reviews/:wordId` — `{ rating }` (1=Again, 2=Hard, 3=Good, 4=Easy) → runs FSRS scheduling, updates card in DB, returns updated schedule
- `GET /api/reviews/preview/:wordId` — returns next due dates for each rating (Again/Hard/Good/Easy) so the UI can show "next review in X" per button
- `GET /api/reviews/distractors?wordId&count=3` — random translations for multiple choice

**Client files**:
- `pages/ReviewPage.tsx` — mode selector (flashcard/multiple-choice), progress tracking, session summary
- `components/review/FlashcardReview.tsx` — flip card, rate buttons: Again / Hard / Good / Easy (show next interval on each button)
- `components/review/MultipleChoiceReview.tsx` — 4 choices (1 correct + 3 distractors), auto-rate Good on correct / Again on incorrect
- `components/review/ReviewSummary.tsx` — session stats (reviewed count, again/hard/good/easy breakdown)
- `components/review/ReviewProgress.tsx` — progress bar for current session

**Auto-create reviews**: When word status transitions to Learning 1+, insert `word_reviews` row with `createEmptyCard()` defaults.

---

## Phase 8: Audio Support

**Server**: `routes/audio.ts` — upload/delete/stream audio. Store files at `uploads/audio/<userId>/<lessonId>/`. Multer: audio MIME types, max 100MB.

**Endpoints**:
- `POST /api/lessons/:id/audio` — upload
- `DELETE /api/lessons/:id/audio`
- `GET /api/audio/:filename` — stream (ownership-checked)

**Client**: `components/reader/AudioPlayer.tsx` — play/pause, seek, speed (0.5x–2x), volume, keyboard shortcuts (Space/arrows). HTML5 `<audio>` under the hood. Shown in ReaderPage when lesson has audio.

Update `CreateLessonModal` to accept optional audio (.mp3/.wav/.ogg/.m4a).

---

## Phase 9: Polish & Testing

- Global error handler (`middleware/errorHandler.ts`, custom `AppError` class)
- React `ErrorBoundary`, Toast notifications, Spinner/Skeleton loaders
- Consistent API response shape: `{ data }` / `{ error: { message, code } }`
- Security: `helmet`, CORS, `express-validator` on all endpoints
- Logging: `morgan`
- Styling: Tailwind CSS (`tailwindcss` + `@tailwindcss/vite`)
- Tests (`vitest`): FSRS scheduling, tokenizer, file parsers, auth endpoints, CRUD endpoints
- Dev scripts: `concurrently` for client+server, `tsx` for server dev, `nodemon`

---

## Dependencies

**Server**: express, cors, helmet, morgan, @prisma/client, prisma, multer, axios, epub2, srt-parser-2, dotenv, ts-fsrs  
**Client**: react, react-dom, wouter, @tanstack/react-query, tailwindcss  
**Dev**: typescript, tsx, nodemon, vitest, concurrently, @vitejs/plugin-react, type packages

## Critical Path
`Phase 1 → 2 → 3 → 4 → 5 (wire into 4) → 6 → 7`  
Phase 8 (audio) is independent after Phase 3. Phase 9 is ongoing.

## Verification
Each phase ends with a manual test:
1. Health check + Prisma migration + Prisma Studio
2. Enter username → see library → switch user → protected route redirects to login
3. Create collection + lesson via paste and file upload
4. Open lesson, click words, see highlights, change statuses
5. Configure API key, get translations in reader
6. Browse/filter/edit vocabulary
7. Complete a flashcard review session with FSRS scheduling (intervals grow with Good/Easy, reset with Again)
8. Upload audio, play in reader
9. Run `vitest`, check error handling
