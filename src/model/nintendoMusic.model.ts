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
        async function findOrCreateUserDefinedAlbum(): Promise<UserDefinedAlbum> {
            // If UserDefinedAlbum does not exist for Nintendo Music Track, create it.
            const newUserDefinedAlbum = await prismaClient.userDefinedAlbum.upsert({
                where: {
                    name: nintendoMusicTrack.nintendoMusicLibraryGameAlbum!.name,
                },
                create: {
                    name: nintendoMusicTrack.nintendoMusicLibraryGameAlbum!.name,
                },
                update: {
                    name: nintendoMusicTrack.nintendoMusicLibraryGameAlbum!.name,
                },
            });

            console.info(
                `Created the UserDefinedAlbum "${newUserDefinedAlbum.name}" during the creation of NintendoMusicTrack`,
            );
            return newUserDefinedAlbum;
        }

        const userDefinedAlbum = await findOrCreateUserDefinedAlbum()
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