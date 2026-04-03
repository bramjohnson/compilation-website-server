/*
  Warnings:

  - A unique constraint covering the columns `[nintendoMusicTrackId]` on the table `NintendoMusicLibraryTrack` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "NintendoMusicLibraryTrack" ADD COLUMN     "nintendoMusicTrackId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "NintendoMusicLibraryTrack_nintendoMusicTrackId_key" ON "NintendoMusicLibraryTrack"("nintendoMusicTrackId");
