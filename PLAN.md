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

**Server**: `services/srs.service.ts` — SM-2 algorithm.

**SM-2 rules**:
- Quality ≥ 3: interval = 1d → 6d → prev × easeFactor; repetitions++
- Quality < 3: reset to interval=1, repetitions=0
- EF = max(1.3, EF + (0.1 - (5-q)(0.08 + (5-q)×0.02)))

**Endpoints**:
- `GET /api/reviews/due?languageId&limit=20` — words due now
- `GET /api/reviews/due/count`
- `POST /api/reviews/:wordId` — `{ quality }` → updated schedule
- `GET /api/reviews/distractors?wordId&count=3` — random translations for multiple choice

**Client files**:
- `pages/ReviewPage.tsx` — mode selector, progress tracking, session summary
- `components/review/FlashcardReview.tsx` — flip card, rate: Again(0)/Hard(2)/Good(3)/Easy(5)
- `components/review/MultipleChoiceReview.tsx` — 4 choices (1 correct + 3 distractors)
- `components/review/ReviewSummary.tsx`, `ReviewProgress.tsx`

**Auto-create reviews**: When word status transitions to Learning 1+, insert `word_reviews` row with defaults.

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
- Tests (`vitest`): SM-2 algorithm, tokenizer, file parsers, auth endpoints, CRUD endpoints
- Dev scripts: `concurrently` for client+server, `tsx` for server dev, `nodemon`

---

## Dependencies

**Server**: express, cors, helmet, morgan, @prisma/client, prisma, multer, axios, epub2, srt-parser-2, dotenv  
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
7. Complete a flashcard review session with correct SRS scheduling
8. Upload audio, play in reader
9. Run `vitest`, check error handling
