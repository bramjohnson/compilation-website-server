-- CreateEnum
CREATE TYPE "Permission" AS ENUM ('IMPERSONATE_CREATE_COMPILATION', 'IMPERSONATE_EDIT_COMPILATION', 'IMPERSONATE_DELETE_COMPILATION');

-- CreateTable
CREATE TABLE "UserPermission" (
    "id" SERIAL NOT NULL,
    "permission" "Permission" NOT NULL,
    "grantorId" INTEGER NOT NULL,
    "granteeId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserPermission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserPermission_grantorId_granteeId_permission_key" ON "UserPermission"("grantorId", "granteeId", "permission");

-- AddForeignKey
ALTER TABLE "UserPermission" ADD CONSTRAINT "UserPermission_grantorId_fkey" FOREIGN KEY ("grantorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPermission" ADD CONSTRAINT "UserPermission_granteeId_fkey" FOREIGN KEY ("granteeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
