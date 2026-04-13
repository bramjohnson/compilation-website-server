import { createPrismaClient } from "../prisma";

const prismaClient = createPrismaClient();
const ezonater = await prismaClient.user.findUnique({
  where: {
    username: "Ezonater",
  },
});

if (ezonater === null) {
  throw new Error("FEJWOIF");
}

await prismaClient.userPermission.upsert({
  where: {
    grantorId_granteeId_permission: {
      grantorId: ezonater.id,
      granteeId: ezonater.id,
      permission: "OVERLORD",
    },
  },
  update: {}, // nothing to update if it already exists
  create: {
    permission: "OVERLORD",
    granteeId: ezonater.id,
    grantorId: ezonater.id,
  },
});
