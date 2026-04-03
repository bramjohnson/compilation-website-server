/*
  Warnings:

  - A unique constraint covering the columns `[nintendoMusicId]` on the table `NintendoMusicLibraryGameAlbum` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "NintendoMusicLibraryGameAlbum" ADD COLUMN     "nintendoMusicId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "NintendoMusicLibraryGameAlbum_nintendoMusicId_key" ON "NintendoMusicLibraryGameAlbum"("nintendoMusicId");
