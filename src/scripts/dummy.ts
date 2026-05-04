import { createPrismaClient } from "../prisma";

function randomTimestamp(): string {
  const start = new Date("2026-01-01T00:00:00.000Z").getTime();
  const end = new Date("2026-03-30T23:59:59.999Z").getTime();
  const random = new Date(start + Math.random() * (end - start));
  return random.toISOString();
}

const prismaClient = createPrismaClient();
const images = await prismaClient.image.findMany({
  select: { id: true },
});
await prismaClient.$transaction(
  images.map((c) =>
    prismaClient.image.delete({
      where: { id: c.id },
    }),
  ),
);
