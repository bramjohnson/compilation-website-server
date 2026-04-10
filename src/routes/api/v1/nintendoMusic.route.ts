import { Router } from "express";
import z from "zod";
import { PrismaClient } from "../../../generated/prisma/client";

export function setupNintendoMusicRouter(prismaClient: PrismaClient): Router {
  const nintendoMusicRouter = Router();

  const NintendoMusicAlbumQuerySchema = z.object({
    id: z.string().transform(Number).pipe(z.number().int()).optional(),
    name: z.string().optional(),
  });

  nintendoMusicRouter.get("/album", async (req, res) => {
    const parseResult = NintendoMusicAlbumQuerySchema.safeParse(req.query);
    if (!parseResult.success) {
      return res.status(400).json({
        error: "Invalid query parameters",
        details: parseResult.error,
      });
    }

    const query = parseResult.data;
    const { name, id } = query;

    const nintendoMusicAlbums =
      await prismaClient.nintendoMusicLibraryGameAlbum.findMany({
        where: {
          id: id,
          name: {
            contains: name,
            mode: "insensitive",
          },
        },
      });

    res.json(nintendoMusicAlbums);
  });

  const NintendoMusicAlbumParamsSchema = z.object({
    id: z.string().transform(Number).pipe(z.number().int()).optional(),
  });

  nintendoMusicRouter.get("/album/:id", async (req, res) => {
    const parseResult = NintendoMusicAlbumParamsSchema.safeParse(req.params);
    if (!parseResult.success) {
      return res.status(400).json({
        error: "Invalid query parameters",
        details: parseResult.error,
      });
    }

    const query = parseResult.data;
    const { id } = query;

    const nintendoMusicAlbums =
      await prismaClient.nintendoMusicLibraryGameAlbum.findUnique({
        where: {
          id: id,
        },
        include: {
          tracks: true,
        },
      });

    res.json(nintendoMusicAlbums);
  });

  const NintendoMusicAlbumCreationSchema = z.object({
    name: z.string(),
  });

  nintendoMusicRouter.post("/album", async (req, res) => {
    const parseResult = NintendoMusicAlbumCreationSchema.safeParse(req.query);
    if (!parseResult.success) {
      return res.status(400).json({
        error: "Invalid query parameters",
        details: parseResult.error,
      });
    }

    const query = parseResult.data;
    const { name } = query;

    const nintendoMusicAlbums =
      await prismaClient.nintendoMusicLibraryGameAlbum.create({
        data: { name },
      });

    res.json(nintendoMusicAlbums);
  });

  const NintendoMusicTrackQuerySchema = z.object({
    title: z.string().optional(),
  });

  nintendoMusicRouter.get("/track", async (req, res) => {
    const parseResult = NintendoMusicTrackQuerySchema.safeParse(req.query);
    if (!parseResult.success) {
      return res.status(400).json({
        error: "Invalid query parameters",
        details: parseResult.error,
      });
    }

    const query = parseResult.data;
    const { title } = query;

    const userDefinedTracks =
      await prismaClient.nintendoMusicLibraryTrack.findMany({
        where: {
          title: {
            contains: title,
            mode: "insensitive",
          },
        },
        include: {
          nintendoMusicLibraryGameAlbum: true,
        },
      });

    res.json(userDefinedTracks);
  });

  nintendoMusicRouter.get("/album/:id/track", async (req, res) => {
    const parseResult = NintendoMusicAlbumParamsSchema.safeParse(req.params);
    if (!parseResult.success) {
      return res.status(400).json({
        error: "Invalid query parameters",
        details: parseResult.error,
      });
    }

    const query = parseResult.data;
    const { id } = query;

    const parseResult2 = NintendoMusicTrackQuerySchema.safeParse(req.query);
    if (!parseResult2.success) {
      return res.status(400).json({
        error: "Invalid query parameters",
        details: parseResult2.error,
      });
    }

    const query2 = parseResult2.data;
    const { title } = query2;

    const nintendoMusicAlbums =
      await prismaClient.nintendoMusicLibraryTrack.findMany({
        where: {
          nintendoMusicLibraryGameAlbumId: id,
          title: {
            contains: title,
            mode: "insensitive",
          },
        },
        include: {
          nintendoMusicLibraryGameAlbum: true,
        },
      });

    res.json(nintendoMusicAlbums);
  });

  const NintendoMusicTrackCreationSchema = z.object({
    nintendoMusicAlbumId: z.string().transform(Number).pipe(z.number().int()),
    title: z.string(),
  });

  nintendoMusicRouter.post("/track", async (req, res) => {
    const parseResult = NintendoMusicTrackCreationSchema.safeParse(req.query);
    if (!parseResult.success) {
      return res.status(400).json({
        error: "Invalid query parameters",
        details: parseResult.error,
      });
    }

    const query = parseResult.data;
    const { title, nintendoMusicAlbumId } = query;

    const nintendoMusicTrack =
      await prismaClient.nintendoMusicLibraryTrack.create({
        data: {
          title,
          duration: 0,
          nintendoMusicLibraryGameAlbum: {
            connect: { id: nintendoMusicAlbumId },
          },
        },
        include: {
          nintendoMusicLibraryGameAlbum: true,
        },
      });

    if (nintendoMusicTrack.nintendoMusicLibraryGameAlbum === null) {
      return res.json(nintendoMusicTrack); // Exit early if there is no album attached for some reason...
    }

    const updatedUserDefinedTracks =
      await prismaClient.userDefinedTrack.updateMany({
        where: {
          title: nintendoMusicTrack.title,
          userDefinedAlbum: {
            name: nintendoMusicTrack.nintendoMusicLibraryGameAlbum.name,
          },
        },
        data: {
          nintendoMusicLibraryTrackId: nintendoMusicTrack.id,
        },
      });

    if (updatedUserDefinedTracks.count > 0) {
      console.info(
        `Connected NintendoMusicTrack "${nintendoMusicTrack.title}" to UserDefinedTrack of the same name`,
      );
    }

    if (updatedUserDefinedTracks.count === 0) {
      let userDefinedAlbum = await prismaClient.userDefinedAlbum.findFirst({
        where: {
          name: nintendoMusicTrack.nintendoMusicLibraryGameAlbum.name,
        },
      });

      // If UserDefinedAlbum does not exist for Nintendo Music Track, create it.
      if (userDefinedAlbum === null) {
        userDefinedAlbum = await prismaClient.userDefinedAlbum.create({
          data: {
            name: nintendoMusicTrack.nintendoMusicLibraryGameAlbum.name,
          },
        });

        console.info(
          `Created the UserDefinedAlbum "${userDefinedAlbum.name}" during the creation of NintendoMusicTrack`,
        );
      }

      const userDefinedTrack = await prismaClient.userDefinedTrack.create({
        data: {
          title,
          duration: 0,
          userDefinedAlbum: {
            connect: { id: userDefinedAlbum.id },
          },
          nintendoMusicLibraryTrack: {
            connect: { id: nintendoMusicTrack.id },
          },
        },
        include: {
          userDefinedAlbum: true,
        },
      });

      console.info(
        `Created the UserDefinedTrack "${userDefinedTrack.title}" during the creation of NintendoMusicTrack`,
      );
    }

    res.json(nintendoMusicTrack);
  });

  return nintendoMusicRouter;
}
