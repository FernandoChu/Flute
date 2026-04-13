-- CreateTable
CREATE TABLE "translation_cache" (
    "id" TEXT NOT NULL,
    "source_lang" TEXT NOT NULL,
    "target_lang" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "translation" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "translation_cache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "translation_cache_source_lang_target_lang_term_provider_key" ON "translation_cache"("source_lang", "target_lang", "term", "provider");
