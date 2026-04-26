<p align="center">
  <img src=".github/banner.svg" alt="Flute — A reading-first language app" width="100%" />
</p>

A reading-based language learning app inspired by Lute3, LingQ, and Readlang. Import text content, select words for instant translations and audio playback, track vocabulary progress, and review with spaced repetition (FSRS).

The name Flute is to pay respect to Lute3, which stands for (Learning Using Texts). I'll let you decide what the `F` in Flute stands for.

## Installation

The recommended installation method is to run it using [docker](https://docs.docker.com/engine/install/). 
- Download this repository.
- Rename `.env.example` into `.env`, change the `ENCRYPTION_KEY` if wanted.
- `cd` into the folder, install and run with `docker compose build --no-cache && docker compose up`. Open the app at http://localhost:3001.
- Create an account in DeepL and get an [api key](https://www.deepl.com/en/your-account/keys). Put it in the settings in Flute.
- Create an account in Google Console, and then make a project. Get an [api key](https://console.cloud.google.com/apis/credentials) for `Cloud Text-to-Speech API`. Put it in the settings in Flute, and choose your preferred model and voice. I suggest the Chirp HD model for accuracy/price (roughly 15-20 hours of audio in the free tier).
  - WARNING: Unlike DeepL, Google Cloud can consume more tokens beyond the ones in the free tier and will charge you for this. Also, not all models have a free tier.

To update just run:
```
git pull
docker compose build --no-cache
docker compose up -d
```

To pause run `docker compose stop`, to re-start `docker compose up -d`.

## Suggested usage flow

1. Get an `epub` version of the book you want to read in the language you want to learn. 
   - You can use the [translate-book](https://github.com/FernandoChu/translate-book) skill to translate a source epub to your target language, further specifying difficulty level.
   - The TOC of the epub splits the import into "lessons", so ensure it is correct.
2. Import the epub in the app (Library > New collection > Import file).
3. Read, and select words/sentences to translate them if needed.
4. Mark the status of the word by hovering over it and pressing numbers 1-5 (or by right clicking). Mark the words with a 1 that you wish to review later.
5. Go to the review section, and practice the flashcards, filter by status (e.g. by `1`).
