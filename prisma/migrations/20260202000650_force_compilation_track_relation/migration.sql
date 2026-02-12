/*
  Warnings:

  - Made the column `compilationId` on table `CompilationTrack` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "CompilationTrack" DROP CONSTRAINT "CompilationTrack_compilationId_fkey";

-- AlterTable
ALTER TABLE "CompilationTrack" ALTER COLUMN "compilationId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "CompilationTrack" ADD CONSTRAINT "CompilationTrack_compilationId_fkey" FOREIGN KEY ("compilationId") REFERENCES "Compilation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
