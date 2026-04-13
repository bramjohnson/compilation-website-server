import { Permission, PrismaClient } from "../../../generated/prisma/client";
import { Router } from "express";
import z from "zod";
import {
  authenticateMiddlewareClosure,
  RequestWithResolvableUser,
} from "./users.route";

export function setupCompilationRouter(prismaClient: PrismaClient): Router {
  const compilationRouter = Router();

  compilationRouter.get(
    "/:id/editable",
    authenticateMiddlewareClosure(prismaClient),
    (req: RequestWithResolvableUser, res) => {
      if (req.user !== undefined) {
        return res.status(200).json({ message: "Yes you can edit this!" });
      } else {
        return res.status(403).json({ error: "No access" });
      }
    },
  );

  const CompilationFilterParamsSchema = z.object({
    createdAt: z.enum(["desc", "asc"]).optional(),
    limit: z.string().transform(Number).pipe(z.number().int()).optional(),
  });
  compilationRouter.get("/", async (req, res) => {
    const parseParamsResult = CompilationFilterParamsSchema.safeParse(
      req.query,
    );
    if (!parseParamsResult.success) {
      return res.status(400).json({
        error: "Invalid query parameters",
        details: parseParamsResult.error,
      });
    }

    const { createdAt, limit } = parseParamsResult.data;

    try {
      const compilations = await prismaClient.compilation.findMany({
        orderBy: {
          createdAt,
        },
        take: limit,
        select: {
          id: true,
          name: true,
          thumbnailId: true,
          originalRelease: true,
          createdAt: true,
          creator: {
            select: {
              id: true,
              username: true,
            },
          },
        },
      });
      res.json(compilations);
    } catch (e) {
      console.error(e);
      res.status(500);
    }
  });

  compilationRouter.get("/:id", async (req, res) => {
    const compilationIDString = req.params.id;
    const compilationID = parseInt(compilationIDString);

    try {
      const compilation = await prismaClient.compilation.findUnique({
        where: {
          id: compilationID,
        },
        include: {
          creator: {
            select: {
              id: true,
              username: true,
              avatarId: true,
            },
          },
          thumbnail: true,
          compilationTracks: {
            select: {
              id: true,
              position: true,
              addedToNMLPlaylist: true,
              userDefinedTrack: {
                select: {
                  id: true,
                  title: true,
                  duration: true,
                  userDefinedAlbum: true,
                  nintendoMusicLibraryTrackId: true,
                  nintendoMusicLibraryTrack: true,
                },
              },
            },
          },
        },
      });
      res.json(compilation);
    } catch (e) {
      console.error(e);
      res.status(500);
    }
  });

  const CompilationCreationParamsSchema = z.object({
    id: z.string().transform(Number).pipe(z.number().int()).optional(),
  });

  const CompilationCreationBodySchema = z.object({
    title: z.string().nonempty(),
    creatorID: z.number().int().positive(),
    thumbnailID: z.string().optional(),
    visibility: z.string(),
    originalRelease: z.iso.datetime().optional(),
    userDefinedTracks: z.array(
      z.object({
        id: z.number().int().positive(),
        position: z.number().int().min(0),
      }),
    ),
    compilationTracks: z.array(
      z.object({
        id: z.number().int().positive(),
        position: z.number().int().min(0),
      }),
    ),
  });

  compilationRouter.put(
    "/:id",
    authenticateMiddlewareClosure(prismaClient),
    async (req: RequestWithResolvableUser, res) => {
      const parseParamsResult = CompilationCreationParamsSchema.safeParse(
        req.params,
      );
      if (!parseParamsResult.success) {
        return res.status(400).json({
          error: "Invalid query parameters",
          details: parseParamsResult.error,
        });
      }

      const params = parseParamsResult.data;
      const { id } = params;

      const parseBodyResult = CompilationCreationBodySchema.safeParse(req.body);
      if (!parseBodyResult.success) {
        return res.status(400).json({
          error: "Invalid query parameters",
          details: parseBodyResult.error,
        });
      }

      const body = parseBodyResult.data;
      const {
        title,
        creatorID,
        thumbnailID,
        userDefinedTracks,
        compilationTracks,
        visibility,
        originalRelease,
      } = body;

      // Return early if the user is requesting to impersonate another user and does not have the sufficient permissions
      if (
        req.user &&
        creatorID !== req.user.id &&
        !req.user.permissionsReceived.some(
          (p) =>
            p.permission === Permission.IMPERSONATE_CREATE_COMPILATION ||
            p.permission === Permission.OVERLORD,
        )
      ) {
        res.status(401).json({ error: "Insufficient Permissions" });
        return;
      }

      if (visibility !== "PUBLIC" && visibility !== "PRIVATE") {
        res.status(401).json({ error: "Invalid visibility" });
        return;
      }

      try {
        const compilation = await prismaClient.compilation.update({
          where: {
            id: id,
          },
          data: {
            name: title,
            creator: {
              connect: { id: creatorID },
            },
            visibility: visibility,
            originalRelease: originalRelease,
            thumbnail: thumbnailID
              ? {
                  connect: { id: thumbnailID },
                }
              : undefined,
            compilationTracks: {
              updateMany: compilationTracks.map((track, idx) => ({
                where: { id: track.id },
                data: { position: track.position },
              })),
              createMany: {
                data: userDefinedTracks.map((track, idx) => ({
                  userDefinedTrackId: track.id,
                  position: track.position,
                  addedToNMLPlaylist: false,
                })),
              },
            },
          },
          include: {
            creator: true,
            thumbnail: true,
            compilationTracks: {
              select: {
                id: true,
                position: true,
                addedToNMLPlaylist: true,
                userDefinedTrack: {
                  select: {
                    id: true,
                    title: true,
                    duration: true,
                    userDefinedAlbum: true,
                    nintendoMusicLibraryTrackId: true,
                    nintendoMusicLibraryTrack: true,
                  },
                },
              },
            },
          },
        });
        res.json(compilation);
      } catch (e) {
        console.error(e);
        res.status(500);
      }
    },
  );

  const CompilationIDBodySchema = z.object({
    creatorID: z.number().int().positive(),
    userDefinedTrackIDs: z.array(
      z.object({
        id: z.number().int().positive(),
        position: z.number().int().min(0),
      }),
    ),
    title: z.string(),
  });

  compilationRouter.post(
    "/",
    authenticateMiddlewareClosure(prismaClient),
    async (req: RequestWithResolvableUser, res) => {
      console.info(req.body);
      const parseResult = CompilationIDBodySchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          error: "Invalid query parameters",
          details: parseResult.error,
        });
      }

      const body = parseResult.data;
      const { title, userDefinedTrackIDs, creatorID } = body;

      try {
        const compilation = await prismaClient.compilation.create({
          data: {
            name: title,
            description: "",
            creator: {
              connect: { id: creatorID },
            },
            compilationTracks: {
              create: userDefinedTrackIDs.map((track) => ({
                position: track.position,
                userDefinedTrack: {
                  connect: { id: track.id },
                },
                addedToNMLPlaylist: false,
              })),
            },
          },
          include: {
            creator: true,
            compilationTracks: {
              select: {
                id: true,
                addedToNMLPlaylist: true,
                userDefinedTrack: {
                  select: {
                    id: true,
                    title: true,
                    duration: true,
                    userDefinedAlbum: true,
                  },
                },
              },
            },
          },
        });
        res.json(compilation);
      } catch (e) {
        console.error(e);
        res.status(500);
      }
    },
  );

  const CompilationPatchSchema = z.object({
    addedToNMLPlaylist: z.boolean().optional(),
  });

  compilationRouter.patch(
    "/:compilationId/track/:trackId",
    authenticateMiddlewareClosure(prismaClient),
    async (req: RequestWithResolvableUser, res) => {
      const compilationId = req.params.compilationId as string;

      const parseResult = CompilationPatchSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          error: "Invalid query parameters",
          details: parseResult.error,
        });
      }

      const body = parseResult.data;
      const { addedToNMLPlaylist } = body;

      try {
        const compilation = await prismaClient.compilation.findUnique({
          where: {
            id: parseInt(compilationId),
          },
        });

        if (compilation?.creatorId !== req.user?.id) {
          res.status(401).json({ error: "No access to this compilation" });
          return;
        }

        const trackId = req.params.trackId as string;
        const updatedCompilationTrack =
          await prismaClient.compilationTrack.update({
            where: {
              id: parseInt(trackId),
            },
            data: {
              addedToNMLPlaylist: addedToNMLPlaylist,
            },
            select: {
              id: true,
              position: true,
              addedToNMLPlaylist: true,
              userDefinedTrack: {
                select: {
                  id: true,
                  title: true,
                  duration: true,
                  userDefinedAlbum: true,
                  nintendoMusicLibraryTrackId: true,
                  nintendoMusicLibraryTrack: true,
                },
              },
            },
          });
        res.json(updatedCompilationTrack);
      } catch (e) {
        console.error(e);
        res.status(500);
      }
    },
  );

  return compilationRouter;
}
