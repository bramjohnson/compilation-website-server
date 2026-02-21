import { PrismaClient } from "@prisma/client/extension";
import { Router } from "express";
import z from "zod";
import { optionalStringQuery } from "../../../util/prisma.util";

export function setupCreatorRouter(prismaClient: PrismaClient): Router {
    const creatorRouter = Router()
    creatorRouter.get("/:id", async (req, res) => {
        const creatorIDString = req.params.id;
        const creatorID = parseInt(creatorIDString);

        try {
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
        } catch (e) {
            console.error(e)
            res.status(500)
        }
    });

    const CreatorQuerySchema = z.object({
        creatorId: z
            .string()
            .transform(Number)
            .pipe(z.number().int())
            .optional(),
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

        // Use this query for name, if it is present...
        const nameQuery = optionalStringQuery<"Creator">(name, {
            contains: name,
            mode: "insensitive",
        });

        const users = await prismaClient.user.findMany({
            where: {
                name: nameQuery,
                creatorId: creatorId,
            },
        });

        res.json(users);
    });

    return creatorRouter
}


