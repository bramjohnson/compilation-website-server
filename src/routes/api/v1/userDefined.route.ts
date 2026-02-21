import { Router } from "express";
import z from "zod";
import { optionalStringQuery } from "../../../util/prisma.util";
import { PrismaClient } from "../../../generated/prisma/client";

export function setupUserDefinedRouter(prismaClient: PrismaClient): Router {
    const userDefinedRouter = Router()

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
            data: { name }
        });

        res.json(userDefinedAlbums);
    })

    const UserDefinedTrackQuerySchema = z.object({
        userDefinedAlbumId: z
            .string()
            .transform(Number)
            .pipe(z.number().int())
            .optional(),
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
        const { title, userDefinedAlbumId } = query;

        // Use this query for name, if it is present...
        const titleQuery = optionalStringQuery<"UserDefinedTrack">(title, {
            contains: title,
            mode: "insensitive",
        });

        const userDefinedTracks = await prismaClient.userDefinedTrack.findMany({
            where: {
                title: titleQuery,
                userDefinedAlbumId: userDefinedAlbumId,
            },
            include: {
                userDefinedAlbum: true
            }
        });

        res.json(userDefinedTracks);
    });

    const UserDefinedTrackCreationSchema = z.object({
        userDefinedAlbumId: z
            .string()
            .transform(Number)
            .pipe(z.number().int()),
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
                    connect: { id: userDefinedAlbumId }
                }
            },
            include: {
                userDefinedAlbum: true
            }
        });

        res.json(userDefinedTrack);
    })

    return userDefinedRouter
}