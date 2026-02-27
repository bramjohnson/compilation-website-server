-- CreateEnum
CREATE TYPE "CompilationVisibility" AS ENUM ('PRIVATE', 'PUBLIC');

-- AlterTable
ALTER TABLE "Compilation" ADD COLUMN     "visibility" "CompilationVisibility" NOT NULL DEFAULT 'PRIVATE';
