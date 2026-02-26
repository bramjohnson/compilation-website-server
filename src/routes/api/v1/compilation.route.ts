import { PrismaClient } from "../../../generated/prisma/client";
import { Router } from "express";
import z from "zod";

export function setupCompilationRouter(prismaClient: PrismaClient): Router {
  const compilationRouter = Router();

  compilationRouter.get("/", async (req, res) => {
    try {
      const compilations = await prismaClient.compilation.findMany();
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
  });

  const CompilationCreationParamsSchema = z.object({
    id: z.string().transform(Number).pipe(z.number().int()).optional(),
  });

  const CompilationCreationBodySchema = z.object({
    title: z.string(),
    creatorID: z.number().int().positive(),
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

  compilationRouter.patch("/:id", async (req, res) => {
    const parseParamsResult = CompilationCreationParamsSchema.safeParse(
      req.body,
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
    const { title, creatorID, userDefinedTracks, compilationTracks } = body;

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
  });

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

  compilationRouter.post("/", async (req, res) => {
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
  });

  return compilationRouter;
}
