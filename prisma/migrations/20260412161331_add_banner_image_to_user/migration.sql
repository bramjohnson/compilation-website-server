/*
  Warnings:

  - A unique constraint covering the columns `[bannerId]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
ALTER TYPE "ImageType" ADD VALUE 'BANNER';

-- AlterEnum
ALTER TYPE "Permission" ADD VALUE 'IMPERSONATE_EDIT_USER';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "bannerId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_bannerId_key" ON "User"("bannerId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_bannerId_fkey" FOREIGN KEY ("bannerId") REFERENCES "Image"("id") ON DELETE SET NULL ON UPDATE CASCADE;
