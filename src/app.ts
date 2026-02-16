import express from "express";
import { PrismaClient } from "./generated/prisma/client";
import { createPrismaClient } from "./prisma";
import z, { startsWith } from "zod";
import {
  StringFilter,
  UserDefinedAlbumWhereInput,
} from "./generated/prisma/models";
import { optionalIntQuery, optionalStringQuery } from "./util/prisma.util";
const app = express();
const port = 3000;

function addWildcardCORS() {
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept",
    );
    next();
  });
}

function appWithContext(prismaClient: PrismaClient) {
  app.get("/", (req, res) => {
    res.send("Hello World!");
  });

  app.get("/creator/:id", async (req, res) => {
    const creatorIDString = req.params.id;
    const creatorID = parseInt(creatorIDString);

    const creator = await prismaClient.user.findUnique({
      where: {
        id: creatorID,
      },
      include: {
        compilations: {
          select: {
            id: true,
            name: true,
            thumbnailURL: true,
          },
        },
      },
    });

    res.json(creator);
  });

  app.get('/compilation', async (req, res) => {
    const compilations = await prismaClient.compilation.findMany()
    res.json(compilations)
  })

  app.get("/compilation/:id", async (req, res) => {
    const compilationIDString = req.params.id;
    const compilationID = parseInt(compilationIDString);

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
  });

  const UserDefinedAlbumQuerySchema = z.object({
    name: z.string().optional(),
  });

  app.get("/userDefined/album", async (req, res) => {
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

  const UserDefinedTrackQuerySchema = z.object({
    userDefinedAlbumId: z
      .string()
      .transform(Number)
      .pipe(z.number().int())
      .optional(),
    title: z.string().optional(),
  });

  app.get("/userDefined/track", async (req, res) => {
    const parseResult = UserDefinedTrackQuerySchema.safeParse(req.query);
    if (!parseResult.success) {
      return res.status(400).json({
        error: "Invalid query parameters",
        details: parseResult.error,
      });
    }

    const query = parseResult.data;
    const { title, userDefinedAlbumId } = query;

    // Use this query for name, if it is present...
    const titleQuery = optionalStringQuery<"UserDefinedTrack">(title, {
      contains: title,
      mode: "insensitive",
    });

    const userDefinedAlbums = await prismaClient.userDefinedTrack.findMany({
      where: {
        title: titleQuery,
        userDefinedAlbumId: userDefinedAlbumId,
      },
    });

    res.json(userDefinedAlbums);
  });

  app.listen(port, () => {
    return console.log(`Express is listening at http://localhost:${port}`);
  });
}

function setup() {
  const prismaClient = createPrismaClient();
  addWildcardCORS();
  appWithContext(prismaClient);
}

setup();
