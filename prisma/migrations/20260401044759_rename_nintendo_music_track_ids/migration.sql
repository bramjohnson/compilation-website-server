/*
  Warnings:

  - You are about to drop the column `nintendoMusicTrackId` on the `NintendoMusicLibraryTrack` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[nintendoMusicId]` on the table `NintendoMusicLibraryTrack` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "NintendoMusicLibraryTrack_nintendoMusicTrackId_key";

-- AlterTable
ALTER TABLE "NintendoMusicLibraryTrack" DROP COLUMN "nintendoMusicTrackId",
ADD COLUMN     "nintendoMusicId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "NintendoMusicLibraryTrack_nintendoMusicId_key" ON "NintendoMusicLibraryTrack"("nintendoMusicId");
