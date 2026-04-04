import { PrismaClient } from "../generated/prisma/client";
import { createPrismaClient } from "../prisma";

async function removeDuplicates(prismaClient: PrismaClient) {
    const userDefinedAlbums = await prismaClient.userDefinedAlbum.findMany({ include: { tracks: true } });
    const hasUserDefinedAlbumNameBeenUsed = new Map<string, number>() // from name -> id
    for (const album of userDefinedAlbums) {
        const existingId = hasUserDefinedAlbumNameBeenUsed.get(album.name);
        if (existingId !== undefined && existingId !== album.id) {
            // Move connected tracks to the existing album
            for (const connectedTrack of album.tracks) {
                console.debug(`Moving track ${connectedTrack.id} ${connectedTrack.title} from ${album.id} to ${existingId}`)
                await prismaClient.userDefinedTrack.update({
                    where: {
                        id: connectedTrack.id
                    },
                    data: {
                        userDefinedAlbumId: existingId
                    }
                })
            }

            console.info(`Deleting ${album.id} ${album.name} in favor of existing duplicate ${existingId}`)
            await prismaClient.userDefinedAlbum.delete({
                where: {
                    id: album.id
                }
            })
        } else {
            hasUserDefinedAlbumNameBeenUsed.set(album.name, album.id)
        }
    }
}

function main() {
    const prismaClient = createPrismaClient();
    removeDuplicates(prismaClient)
}

main();
