/*
  Warnings:

  - Made the column `userDefinedTrackId` on table `CompilationTrack` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "CompilationTrack" DROP CONSTRAINT "CompilationTrack_userDefinedTrackId_fkey";

-- AlterTable
ALTER TABLE "CompilationTrack" ALTER COLUMN "userDefinedTrackId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "CompilationTrack" ADD CONSTRAINT "CompilationTrack_userDefinedTrackId_fkey" FOREIGN KEY ("userDefinedTrackId") REFERENCES "UserDefinedTrack"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
