/*
  Warnings:

  - You are about to drop the column `thumbnailURL` on the `Compilation` table. All the data in the column will be lost.
  - You are about to drop the column `avatarURL` on the `User` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[name]` on the table `UserDefinedAlbum` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "ImageType" AS ENUM ('PROFILE_PICTURE', 'THUMBNAIL');

-- AlterTable
ALTER TABLE "Compilation" DROP COLUMN "thumbnailURL",
ADD COLUMN     "thumbnailId" TEXT;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "avatarURL";

-- CreateTable
CREATE TABLE "Image" (
    "id" TEXT NOT NULL,
    "type" "ImageType" NOT NULL,
    "path" TEXT NOT NULL,
    "ownerId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Image_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserDefinedAlbum_name_key" ON "UserDefinedAlbum"("name");

-- AddForeignKey
ALTER TABLE "Compilation" ADD CONSTRAINT "Compilation_thumbnailId_fkey" FOREIGN KEY ("thumbnailId") REFERENCES "Image"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Image" ADD CONSTRAINT "Image_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
