import { PrismaClient } from "@prisma/client/extension";
import { Router } from "express";

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
    return creatorRouter
}


