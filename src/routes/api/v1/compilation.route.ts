import { PrismaClient } from "@prisma/client/extension"
import { Router } from "express"
import z from "zod"

export function setupCompilationRouter(prismaClient: PrismaClient): Router {
    const compilationRouter = Router()

    compilationRouter.get('/', async (req, res) => {
        try {
            const compilations = await prismaClient.compilation.findMany()
            res.json(compilations)
        } catch (e) {
            console.error(e)
            res.status(500)
        }
    })

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
            console.error(e)
            res.status(500)
        }
    });

    const CompilationCreationSchema = z.object({
        title: z.string(),
    });

    compilationRouter.post("/", async (req, res) => {
        const parseResult = CompilationCreationSchema.safeParse(req.body);
        if (!parseResult.success) {
            return res.status(400).json({
                error: "Invalid query parameters",
                details: parseResult.error,
            });
        }

        const query = parseResult.data;
        const { title } = query;

        try {
            const compilation = await prismaClient.compilation.create({
                data: {
                    name: title,
                    compilationTracks: []
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
            console.error(e)
            res.status(500)
        }
    })

    return compilationRouter
}
