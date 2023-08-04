/*
  Warnings:

  - You are about to drop the `AnimeNotification` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "AnimeNotification";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "Anime" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "guildId" TEXT NOT NULL,
    "animeId" INTEGER NOT NULL,
    "animeDb" TEXT NOT NULL,
    CONSTRAINT "Anime_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Guild" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "loop" BOOLEAN NOT NULL DEFAULT false,
    "queueIndex" INTEGER NOT NULL DEFAULT 0,
    "queueEmbedId" TEXT,
    "playerEmbedId" TEXT,
    "musicChannel" TEXT,
    "retainQueue" BOOLEAN NOT NULL DEFAULT false,
    "prefix" TEXT NOT NULL DEFAULT '!',
    "aniNotifChannelId" TEXT,
    "aniNotifisBlacklist" BOOLEAN NOT NULL DEFAULT false
);
INSERT INTO "new_Guild" ("id", "loop", "musicChannel", "playerEmbedId", "prefix", "queueEmbedId", "queueIndex", "retainQueue") SELECT "id", "loop", "musicChannel", "playerEmbedId", "prefix", "queueEmbedId", "queueIndex", "retainQueue" FROM "Guild";
DROP TABLE "Guild";
ALTER TABLE "new_Guild" RENAME TO "Guild";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
