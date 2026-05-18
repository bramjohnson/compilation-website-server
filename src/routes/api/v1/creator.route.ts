import { PrismaClient } from "../../../generated/prisma/client";
import { Router } from "express";
import z from "zod";
import {
  authenticateMiddlewareClosure,
  RequestWithResolvableUser,
} from "./users.route";

export function setupCreatorRouter(prismaClient: PrismaClient): Router {
  const creatorRouter = Router();

  creatorRouter.get(
    "/compilation",
    authenticateMiddlewareClosure(prismaClient),
    async (req: RequestWithResolvableUser, res) => {
      const authenticatedUser = req.user!;
      try {
        const compilations = await prismaClient.compilation.findMany({
          where: {
            creatorId: authenticatedUser.id,
          },
        });
        res.json(compilations);
      } catch {
        res.status(400).json({ error: "Could not get compilations" });
      }
    },
  );

  creatorRouter.get("/:id", async (req, res) => {
    const creatorIDString = req.params.id;
    const creatorID = parseInt(creatorIDString);
    if (Number.isNaN(creatorID)) {
      res.status(403).json({ error: "Could not parse creator ID" });
      return;
    }

    try {
      const creator = await prismaClient.user.findUnique({
        where: {
          id: creatorID,
        },
        select: {
          compilations: {
            orderBy: { originalRelease: "desc" },
            select: {
              id: true,
              name: true,
              thumbnailId: true,
              originalRelease: true,
            },
          },
          permissionsReceived: true,
          createdAt: true,
          username: true,
          avatarId: true,
          bannerId: true,
        },
      });
      const oldestCompilationIndex = creator!.compilations.length - 1;
      const oldestCompilationDate =
        creator?.compilations[oldestCompilationIndex].originalRelease;
      res.json({ ...creator, oldestCompilationDate });
    } catch (e) {
      console.error(e);
      res.status(500);
    }
  });

  const CreatorQuerySchema = z.object({
    creatorId: z.string().transform(Number).pipe(z.number().int()).optional(),
    name: z.string().optional(),
  });

  creatorRouter.get("/", async (req, res) => {
    const parseResult = CreatorQuerySchema.safeParse(req.query);
    if (!parseResult.success) {
      return res.status(400).json({
        error: "Invalid query parameters",
        details: parseResult.error,
      });
    }

    const query = parseResult.data;
    const { creatorId, name } = query;

    const users = await prismaClient.user.findMany({
      where: {
        username: {
          contains: name,
          mode: "insensitive",
        },
        creatorId: creatorId,
      },
      select: {
        id: true,
        username: true,
        createdAt: true,
        password: false,
      },
    });

    res.json(users);
  });

  return creatorRouter;
}
