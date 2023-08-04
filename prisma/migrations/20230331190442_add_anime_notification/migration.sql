-- CreateTable
CREATE TABLE "AnimeNotification" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "guildId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "animeId" INTEGER NOT NULL,
    "animeDb" TEXT NOT NULL,
    CONSTRAINT "AnimeNotification_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
