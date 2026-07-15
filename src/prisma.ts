import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client";
import { customAlphabet } from "nanoid";

const connectionString = `${process.env.DATABASE_URL}`;
export const nanoid12 = customAlphabet(
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_",
  12,
);

export function createPrismaClient() {
  const adapter = new PrismaPg({ connectionString });
  const basePrisma = new PrismaClient({ adapter });

  return basePrisma.$extends({
    query: {
      $allModels: {
        async create({ args, query }) {
          // Automatically inject an ID if one wasn't explicitly passed
          args.data.id = args.data.id || nanoid12();
          return query(args);
        },
        async createMany({ args, query }) {
          if (Array.isArray(args.data)) {
            args.data.forEach((item) => {
              item.id = item.id || nanoid12();
            });
          } else {
            args.data.id = args.data.id || nanoid12();
          }
          return query(args);
        },
      },
    },
  });
}
