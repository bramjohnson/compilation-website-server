import { Permission, PrismaClient } from "../../../generated/prisma/client";
import { Router } from "express";
import z from "zod";
import {
  authenticateMiddlewareClosure,
  RequestWithResolvableUser,
} from "./users.route";
import { nanoid12 } from "../../../prisma";

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
    cursor: z.string().transform(Number).pipe(z.number().int()).optional(),
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

    const { createdAt, limit, cursor } = parseParamsResult.data;

    const querySkip = cursor !== undefined ? 1 : undefined;
    const queryTake = limit || 5;
    const queryCursor =
      cursor !== undefined
        ? {
            id: cursor,
          }
        : undefined;

    try {
      const compilations = await prismaClient.compilation.findMany({
        orderBy: {
          createdAt,
        },
        cursor: queryCursor,
        skip: querySkip,
        take: queryTake,
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
    const compilationID = req.params.id;

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
    id: z.string().optional(),
  });

  const CompilationCreationBodySchema = z.object({
    title: z.string().nonempty(),
    creatorID: z.string(),
    thumbnailID: z.string().optional(),
    visibility: z.string(),
    originalRelease: z.iso.datetime().optional(),
    userDefinedTracks: z
      .array(
        z.object({
          id: z.string(),
          position: z.number().int().min(0),
        }),
      )
      .optional(),
    compilationTracks: z
      .array(
        z.object({
          id: z.string(),
          position: z.number().int().min(0),
        }),
      )
      .optional(),
    nintendoMusicURL: z.url().optional(),
  });

  const CompilationPutTrackUnionSchema = z
    .discriminatedUnion("trackType", [
      z.object({
        trackType: z.literal("newUserDefined"),
        userDefinedTrackId: z.string(),
        // position: z.number().int().min(0, "Position must be specified"),
      }),
      z.object({
        trackType: z.literal("compilationTrack"),
        compilationTrackId: z.string(),
        // position: z.number().int().min(0, "Position must be specified"),
      }),
    ])
    .array();

  const CompilationPutFormSchema = z.object({
    id: z.string().optional(),
    title: z
      .string()
      .min(5, "Compilation title must be at least 5 characters.")
      .max(128, "Compilation title must be at most 128 characters."),
    description: z.string().nonempty("Description is required"),
    releaseDate: z.string().min(1, "Release date is required"), // Can map to Calendar component
    visibility: z.enum(["PUBLIC", "PRIVATE"]),
    creatorId: z.string(),
    nintendoMusicURL: z.httpUrl().optional(),
    thumbnailId: z.string("needed thumbnail").nonempty("needed thumbnail"),
    tracklist: CompilationPutTrackUnionSchema,
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

      const parseBodyResult = CompilationPutFormSchema.safeParse(req.body);
      if (!parseBodyResult.success) {
        return res.status(400).json({
          error: "Invalid query parameters",
          details: parseBodyResult.error,
        });
      }

      const body = parseBodyResult.data;
      const {
        title,
        creatorId,
        thumbnailId,
        visibility,
        nintendoMusicURL,
        releaseDate,
        tracklist,
      } = body;

      // Return early if the user is requesting to impersonate another user and does not have the sufficient permissions
      if (
        req.user &&
        creatorId !== req.user.id &&
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
              connect: { id: creatorId },
            },
            visibility: visibility,
            originalRelease: releaseDate,
            nintendoMusicURL: nintendoMusicURL,
            thumbnail: thumbnailId
              ? {
                  connect: { id: thumbnailId },
                }
              : undefined,
            compilationTracks: tracklist
              .map((track, pos) => ({
                track: track,
                position: pos,
              }))
              .reduce(
                (
                  {
                    updateMany,
                    createMany,
                  }: { updateMany: any; createMany: any },
                  { track, position },
                ) => {
                  switch (track.trackType) {
                    case "newUserDefined": {
                      // Create a new CompilationTrack for the UserDefinedTrack.
                      return {
                        updateMany,
                        createMany: {
                          data: [
                            ...createMany.data,
                            {
                              id: nanoid12(),
                              userDefinedTrackId: track.userDefinedTrackId,
                              position: position,
                              addedToNMLPlaylist: false,
                            },
                          ],
                        },
                      };
                    }
                    case "compilationTrack": {
                      // Update a CompilationTrack on this Compilation with new position
                      return {
                        updateMany: [
                          ...updateMany,
                          {
                            where: { id: track.compilationTrackId },
                            data: { position: position },
                          },
                        ],
                        createMany,
                      };
                    }
                  }
                },
                { updateMany: [], createMany: { data: [] } },
              ),
            //     {
            //   updateMany: compilationTracks?.map((track, idx) => ({
            //     where: { id: track.id },
            //     data: { position: track.position },
            //   })),
            //   createMany: userDefinedTracks
            //     ? {
            //       data: userDefinedTracks.map((track, idx) => ({
            //         id: nanoid12(),
            //         userDefinedTrackId: track.id,
            //         position: track.position,
            //         addedToNMLPlaylist: false,
            //       })),
            //     }
            //     : undefined,
            // },
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
    title: z.string(),
    description: z.string(),
    creatorId: z.string(),
    thumbnailId: z.string(),
    tracklist: CompilationPutTrackUnionSchema,
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
      const { title, description, tracklist, creatorId, thumbnailId } = body;

      try {
        const compilation = await prismaClient.compilation.create({
          data: {
            id: nanoid12(),
            name: title,
            description: description,
            creator: {
              connect: { id: creatorId },
            },
            thumbnail: {
              connect: { id: thumbnailId },
            },
            compilationTracks: {
              create: tracklist
                ?.filter((track) => track.trackType === "newUserDefined")
                .map((track, pos) => ({
                  id: nanoid12(),
                  position: pos,
                  userDefinedTrack: {
                    connect: { id: track.userDefinedTrackId },
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

  compilationRouter.delete(
    "/:id",
    authenticateMiddlewareClosure(prismaClient),
    async (req: RequestWithResolvableUser, res) => {
      const compilationId = req.params.id as string;

      try {
        const compilation = await prismaClient.compilation.findUnique({
          where: {
            id: compilationId,
          },
        });

        if (compilation?.creatorId !== req.user?.id) {
          res.status(401).json({ error: "No access to this compilation" });
          return;
        }

        const deleteCompilationTracks =
          prismaClient.compilationTrack.deleteMany({
            where: {
              compilationId: compilationId,
            },
          });

        const deleteCompilation = prismaClient.compilation.delete({
          where: {
            id: compilationId,
          },
        });

        await prismaClient.$transaction([
          deleteCompilationTracks,
          deleteCompilation,
        ]);

        res.send("deleted yipee");
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

      async function canRequestingUserPatchThisCompilation(): Promise<boolean> {
        if (
          req.user?.permissionsReceived.some(
            (permission) =>
              permission.permission === "IMPERSONATE_EDIT_COMPILATION" ||
              permission.permission === "OVERLORD",
          )
        ) {
          return true;
        }

        try {
          const compilation = await prismaClient.compilation.findUnique({
            where: {
              id: compilationId,
            },
          });

          return compilation?.creatorId === req.user?.id;
        } catch {
          return false;
        }
      }

      if (!canRequestingUserPatchThisCompilation()) {
        res.status(401).json({ error: "No access to this compilation" });
        return;
      }

      const trackId = req.params.trackId as string;

      try {
        const updatedCompilationTrack =
          await prismaClient.compilationTrack.update({
            where: {
              id: trackId,
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
