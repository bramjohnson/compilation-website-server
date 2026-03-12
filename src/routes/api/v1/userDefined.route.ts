import { Router } from "express";
import z from "zod";
import { optionalStringQuery } from "../../../util/prisma.util";
import { PrismaClient } from "../../../generated/prisma/client";

export function setupUserDefinedRouter(prismaClient: PrismaClient): Router {
  const userDefinedRouter = Router();

  const UserDefinedAlbumQuerySchema = z.object({
    name: z.string().optional(),
  });

  userDefinedRouter.get("/album", async (req, res) => {
    const parseResult = UserDefinedAlbumQuerySchema.safeParse(req.query);
    if (!parseResult.success) {
      return res.status(400).json({
        error: "Invalid query parameters",
        details: parseResult.error,
      });
    }

    const query = parseResult.data;
    const { name } = query;

    // Use this query for name, if it is present...
    const nameQuery = optionalStringQuery<"UserDefinedAlbum">(name, {
      contains: name,
      mode: "insensitive",
    });

    const userDefinedAlbums = await prismaClient.userDefinedAlbum.findMany({
      where: {
        name: nameQuery,
      },
    });

    res.json(userDefinedAlbums);
  });

  const UserDefinedAlbumParamsSchema = z.object({
    id: z.string().transform(Number).pipe(z.number().int()).optional(),
  });

  userDefinedRouter.get("/album/:id/track", async (req, res) => {
    const parseResult = UserDefinedAlbumParamsSchema.safeParse(req.params);
    if (!parseResult.success) {
      return res.status(400).json({
        error: "Invalid parameters",
        details: parseResult.error,
      });
    }

    const query = parseResult.data;
    const { id } = query;

    const userDefinedAlbums = await prismaClient.userDefinedTrack.findMany({
      where: {
        userDefinedAlbumId: id,
      },
    });

    res.json(userDefinedAlbums);
  });

  const UserDefinedAlbumCreationSchema = z.object({
    name: z.string(),
  });

  userDefinedRouter.post("/album", async (req, res) => {
    const parseResult = UserDefinedAlbumCreationSchema.safeParse(req.query);
    if (!parseResult.success) {
      return res.status(400).json({
        error: "Invalid query parameters",
        details: parseResult.error,
      });
    }

    const query = parseResult.data;
    const { name } = query;

    const userDefinedAlbums = await prismaClient.userDefinedAlbum.create({
      data: { name },
    });

    res.json(userDefinedAlbums);
  });

  const UserDefinedTrackQuerySchema = z.object({
    title: z.string().optional(),
  });

  userDefinedRouter.get("/track", async (req, res) => {
    const parseResult = UserDefinedTrackQuerySchema.safeParse(req.query);
    if (!parseResult.success) {
      return res.status(400).json({
        error: "Invalid query parameters",
        details: parseResult.error,
      });
    }

    const query = parseResult.data;
    const { title } = query;

    const userDefinedTracks = await prismaClient.userDefinedTrack.findMany({
      where: {
        title: {
          contains: title,
          mode: "insensitive",
        },
      },
      include: {
        userDefinedAlbum: true,
        nintendoMusicLibraryTrack: true,
      },
    });

    res.json(userDefinedTracks);
  });

  const UserDefinedTrackCreationSchema = z.object({
    userDefinedAlbumId: z.string().transform(Number).pipe(z.number().int()),
    title: z.string(),
  });

  userDefinedRouter.post("/track", async (req, res) => {
    const parseResult = UserDefinedTrackCreationSchema.safeParse(req.query);
    if (!parseResult.success) {
      return res.status(400).json({
        error: "Invalid query parameters",
        details: parseResult.error,
      });
    }

    const query = parseResult.data;
    const { title, userDefinedAlbumId } = query;

    const userDefinedTrack = await prismaClient.userDefinedTrack.create({
      data: {
        title,
        duration: 0,
        userDefinedAlbum: {
          connect: { id: userDefinedAlbumId },
        },
      },
      include: {
        userDefinedAlbum: true,
      },
    });

    res.json(userDefinedTrack);
  });

  const UserDefinedTrackParamsSchema = z.object({
    id: z.string().transform(Number).pipe(z.number().int()),
  });

  const UserDefinedTrackPatchSchema = z.object({
    nintendoMusicTrackId: z.int().optional(),
  });

  userDefinedRouter.patch("/track/:id", async (req, res) => {
    const parseResult = UserDefinedTrackParamsSchema.safeParse(req.params);
    if (!parseResult.success) {
      return res.status(400).json({
        error: "Invalid query parameters",
        details: parseResult.error,
      });
    }

    const query = parseResult.data;
    const { id } = query;

    const parseResult2 = UserDefinedTrackPatchSchema.safeParse(req.body);
    if (!parseResult2.success) {
      return res.status(400).json({
        error: "Invalid query parameters",
        details: parseResult2.error,
      });
    }

    const query2 = parseResult2.data;
    const { nintendoMusicTrackId } = query2;

    try {
      const userDefinedTrack = await prismaClient.userDefinedTrack.update({
        where: {
          id: id,
        },
        data: {
          nintendoMusicLibraryTrack: {
            connect: {
              id: nintendoMusicTrackId,
            },
          },
        },
      });

      return res.json(userDefinedTrack);
    } catch (err) {
      console.error(err);
      return res
        .status(500)
        .json({ error: "Could not PATCH the userDefinedTrack" });
    }
  });

  return userDefinedRouter;
}
