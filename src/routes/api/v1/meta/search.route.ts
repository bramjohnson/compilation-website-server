import { Router } from "express";
import { PrismaClient } from "../../../../generated/prisma/client";

export function setupSearchRouter(prismaClient: PrismaClient): Router {
  const searchRouter = Router();

  searchRouter.get("/:content", async (req, res) => {
    const searchContent = req.params.content;

    const usersFound = await prismaClient.user.findMany({
      where: {
        username: {
          contains: searchContent,
          mode: "insensitive",
        },
      },
    });

    const compilationsFound = await prismaClient.compilation.findMany({
      where: {
        name: {
          contains: searchContent,
          mode: "insensitive",
        },
      },
    });

    res.json({
      usersFound,
      compilationsFound,
    });
  });

  return searchRouter;
}
