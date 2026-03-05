/*
  Warnings:

  - You are about to drop the column `email` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `User` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[username]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `password` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `username` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "User_email_key";

-- Step 1: Add new columns as nullable first so existing rows don't violate constraints
ALTER TABLE "User" ADD COLUMN "username" TEXT;
ALTER TABLE "User" ADD COLUMN "password" TEXT;

-- Step 2: Backfill the existing user using their current `name` and a pre-hashed password
UPDATE "User"
SET
  "username" = "name",
  "password" = '$2b$12$u3BjuGdO/H1h3LtMLWRCReISb3Q/ZJfy8WeAe1OqCkvaSvHrQezkq'
WHERE "id" = 1;

-- Step 3: Now that all rows have values, enforce NOT NULL and the unique constraint
ALTER TABLE "User" ALTER COLUMN "username" SET NOT NULL;
ALTER TABLE "User" ALTER COLUMN "password" SET NOT NULL;
ALTER TABLE "User" ADD CONSTRAINT "User_username_key" UNIQUE ("username");

-- Step 4: Drop the old columns
ALTER TABLE "User" DROP COLUMN "email";
ALTER TABLE "User" DROP COLUMN "name";
