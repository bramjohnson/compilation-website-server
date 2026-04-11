/*
  Warnings:

  - Made the column `createdAt` on table `Compilation` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Compilation" ALTER COLUMN "createdAt" SET NOT NULL;
