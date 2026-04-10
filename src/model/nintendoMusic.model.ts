import { NintendoMusicLibraryTrack, PrismaClient, UserDefinedAlbum } from "../generated/prisma/client";

export async function createNintendoMusicTrack(prismaClient: PrismaClient, title: string, durationMillis: number, nintendoMusicAlbumId: number, nintendoMusicId: string): Promise<NintendoMusicLibraryTrack> {
    const nintendoMusicTrack =
        await prismaClient.nintendoMusicLibraryTrack.create({
            data: {
                title,
                duration: durationMillis,
                nintendoMusicId: nintendoMusicId,
                nintendoMusicLibraryGameAlbum: {
                    connect: { id: nintendoMusicAlbumId },
                },
            },
            include: {
                nintendoMusicLibraryGameAlbum: true,
            },
        });

    if (nintendoMusicTrack.nintendoMusicLibraryGameAlbum === null) {
        return nintendoMusicTrack
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
    } else {
        async function findOrCreateUserDefinedAlbum(gameName: string): Promise<UserDefinedAlbum> {
            const existingUserDefinedAlbum = await prismaClient.userDefinedAlbum.findUnique({
                where: {
                    name: gameName,
                }
            })

            // It already exists, we found it!
            if (existingUserDefinedAlbum !== null) {
                return existingUserDefinedAlbum
            }

            const newUserDefinedAlbum = await prismaClient.userDefinedAlbum.create({
                data: {
                    name: gameName
                }
            });
            console.info(
                `Created the UserDefinedAlbum "${newUserDefinedAlbum.name}" during the creation of NintendoMusicTrack`,
            );
            return newUserDefinedAlbum
        }

        const userDefinedAlbum = await findOrCreateUserDefinedAlbum(nintendoMusicTrack.nintendoMusicLibraryGameAlbum.name)
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

    return nintendoMusicTrack;
}