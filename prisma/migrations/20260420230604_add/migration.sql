/*
  Warnings:

  - You are about to drop the column `path` on the `Image` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[remoteKey]` on the table `Image` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `remoteKey` to the `Image` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Image" DROP COLUMN "path",
ADD COLUMN     "remoteKey" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Image_remoteKey_key" ON "Image"("remoteKey");
