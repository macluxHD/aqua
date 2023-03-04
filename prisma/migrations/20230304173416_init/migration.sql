-- CreateTable
CREATE TABLE "Guild" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "loop" BOOLEAN NOT NULL DEFAULT false,
    "queueIndex" INTEGER NOT NULL DEFAULT 0,
    "queueEmbedId" TEXT,
    "playerEmbedId" TEXT,
    "musicChannel" TEXT,
    "retainQueue" BOOLEAN NOT NULL DEFAULT false,
    "prefix" TEXT NOT NULL DEFAULT '!'
);

-- CreateTable
CREATE TABLE "Queue" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "guildId" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "thumbnail" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "channelThumbnail" TEXT NOT NULL,
    CONSTRAINT "Queue_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
