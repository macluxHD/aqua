-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Guild" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "loop" BOOLEAN NOT NULL DEFAULT false,
    "queueIndex" INTEGER NOT NULL DEFAULT 0,
    "queueEmbedId" TEXT,
    "playerEmbedId" TEXT,
    "musicChannelId" TEXT,
    "retainQueue" BOOLEAN NOT NULL DEFAULT false,
    "prefix" TEXT NOT NULL DEFAULT '!',
    "aniNotifChannelId" TEXT,
    "aniNotifisBlacklist" BOOLEAN NOT NULL DEFAULT false,
    "aniNotifSchedule" TEXT NOT NULL DEFAULT '1 0 * * *'
);
INSERT INTO "new_Guild" ("aniNotifChannelId", "aniNotifisBlacklist", "id", "loop", "musicChannelId", "playerEmbedId", "prefix", "queueEmbedId", "queueIndex", "retainQueue") SELECT "aniNotifChannelId", "aniNotifisBlacklist", "id", "loop", "musicChannelId", "playerEmbedId", "prefix", "queueEmbedId", "queueIndex", "retainQueue" FROM "Guild";
DROP TABLE "Guild";
ALTER TABLE "new_Guild" RENAME TO "Guild";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
