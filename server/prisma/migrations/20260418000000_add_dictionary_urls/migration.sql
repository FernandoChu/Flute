-- CreateTable
CREATE TABLE "dictionary_urls" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "language_id" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "url_template" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dictionary_urls_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "dictionary_urls" ADD CONSTRAINT "dictionary_urls_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dictionary_urls" ADD CONSTRAINT "dictionary_urls_language_id_fkey" FOREIGN KEY ("language_id") REFERENCES "languages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
