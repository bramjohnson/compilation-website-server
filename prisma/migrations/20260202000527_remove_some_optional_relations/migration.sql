/*
  Warnings:

  - Made the column `creatorId` on table `Compilation` required. This step will fail if there are existing NULL values in that column.
  - Made the column `userDefinedAlbumId` on table `UserDefinedTrack` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Compilation" DROP CONSTRAINT "Compilation_creatorId_fkey";

-- DropForeignKey
ALTER TABLE "UserDefinedTrack" DROP CONSTRAINT "UserDefinedTrack_userDefinedAlbumId_fkey";

-- AlterTable
ALTER TABLE "Compilation" ALTER COLUMN "creatorId" SET NOT NULL;

-- AlterTable
ALTER TABLE "UserDefinedTrack" ALTER COLUMN "userDefinedAlbumId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "Compilation" ADD CONSTRAINT "Compilation_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserDefinedTrack" ADD CONSTRAINT "UserDefinedTrack_userDefinedAlbumId_fkey" FOREIGN KEY ("userDefinedAlbumId") REFERENCES "UserDefinedAlbum"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
