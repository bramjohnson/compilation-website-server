import { createPrismaClient } from "../prisma";

const prismaClient = createPrismaClient();
const ezonater = await prismaClient.user.findFirst({
  where: {
    username: "Ezonater",
  },
});

console.log(ezonater!.username);
