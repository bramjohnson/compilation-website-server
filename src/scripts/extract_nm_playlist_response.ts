import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { NintendoMusicLibraryGameAlbum, NintendoMusicLibraryTrack, PrismaClient } from "../generated/prisma/client";
import { createPrismaClient } from "../prisma";
import { title } from "node:process";
import { createNintendoMusicTrack } from "../model/nintendoMusic.model";

interface RawNintendoMusicMediaPayload {
  durationMillis: number;
}

interface RawNintendoMusicMedia {
  payloadList: RawNintendoMusicMediaPayload[];
}

interface RawNintendoMusicTrack {
  id: string;
  name: string;
  media: RawNintendoMusicMedia;
}

interface RawNintendoMusicGame {
  id: string;
  name: string;
}

interface RawOfficialPlaylistsResponse {
  game: RawNintendoMusicGame;
  tracks: RawNintendoMusicTrack[];
}

function getRawNintendoMusicRespones(): [string[], RawOfficialPlaylistsResponse[]] {
  const rawResponseFilePaths = readdirSync("./mitmed/raw/officialPlaylists");
  console.log(rawResponseFilePaths);
  const rawRespones = rawResponseFilePaths.map((filePath) => {
    const rawFilePath = `./mitmed/raw/officialPlaylists/${filePath}`
    console.debug(`Reading raw response from ${rawFilePath}`)
    return readFileSync(rawFilePath)
  }
  );
  const rawJsonResponses = rawRespones.map((response) =>
    JSON.parse(response.toString()),
  ) as RawOfficialPlaylistsResponse[];
  return [rawResponseFilePaths, rawJsonResponses];
}

interface ExtractedNintendoMusicGame {
  id: string;
  name: string;
}

interface ExtractedNintendoMusicTrack {
  id: string;
  name: string;
  durationMillis: number;
}

interface ExtractedNintendoMusic {
  game: ExtractedNintendoMusicGame;
  tracks: ExtractedNintendoMusicTrack[];
}

function extractedNintendoMusicFromRawNintendoMusic(
  rawNintendoMusic: RawOfficialPlaylistsResponse,
): ExtractedNintendoMusic {
  return {
    game: {
      id: rawNintendoMusic.game.id,
      name: rawNintendoMusic.game.name,
    },
    tracks: rawNintendoMusic.tracks.map((track) => ({
      id: track.id,
      name: track.name,
      durationMillis: track.media.payloadList[0].durationMillis,
    })),
  };
}

/* 
  Applies the extracted data to the database, updating it idempotently.
  1. Resolve a NintendoMusicGameAlbum from the extracted data:
    a. Check for an exiting NintendoMusicGameAlbum with the nintendoMusicId field matching the extracted data.
    b. If unresolved, look for an existing NintendoMusicGameAlbum with an identical name. Update the object with the nintendoMusicId field.
    c. If unresolved, create a new NintendoMusicGameAlbum from the extracted data.
  2. Resolve the NintendoMusicTracks from the extracted data:
    a. Check for an existing NintendoMusicTrack with the nintendoMusicId field matching the extracted data.
    b. If unresolved, look for an existing NintendoMusicTrack with an identical name and the same GameAlbum ID. Update the object with the nintendoMusicId field.
    c. If unresolved, create a new NintendoMusicTrack from the extracted data.
*/
async function applyExtractedData(prismaClient: PrismaClient, data: ExtractedNintendoMusic) {
  async function resolveGameAlbum(): Promise<NintendoMusicLibraryGameAlbum> {
    const gameData = {
      nintendoMusicId: data.game.id,
      name: data.game.name,
    }

    // First resolve the game album
    const existingGameAlbum = await prismaClient.nintendoMusicLibraryGameAlbum.findUnique({
      where: {
        nintendoMusicId: data.game.id
      }
    })

    // Case 1a: An album already has the nintendoMusicId; update it.
    if (existingGameAlbum !== null) {
      console.debug(`Resolved ${data.game.id} ${data.game.name} to existing identical game album.`)
      return await prismaClient.nintendoMusicLibraryGameAlbum.update({
        data: gameData,
        where: {
          id: existingGameAlbum.id,
          nintendoMusicId: data.game.id,
        },
      })
    }
    // INVARIANT: No album exists in the database with a matching nintendoMusicId

    const existingSimilarGameAlbum = await prismaClient.nintendoMusicLibraryGameAlbum.findFirst({
      where: {
        name: data.game.name
      }
    });

    // Case 1b: An album is similarly named; update it and attach the nintendoMusicId
    if (existingSimilarGameAlbum !== null) {
      console.debug(`Resolved ${data.game.id} to existing similarly named game album ${existingSimilarGameAlbum.id} ${existingSimilarGameAlbum.name}`)
      const updatedSimilarGameAlbum = await prismaClient.nintendoMusicLibraryGameAlbum.update({
        data: gameData,
        where: {
          id: existingSimilarGameAlbum.id,
        },
      })
      return updatedSimilarGameAlbum
    }
    // INVARIANT: No similarly named album exists in the database

    // Case 1c: Create a new game album with the nintendoMusicId
    console.debug(`Resolved ${data.game.id} ${data.game.name} by creating a new game album`)
    return await prismaClient.nintendoMusicLibraryGameAlbum.create({
      data: gameData
    })
  }

  async function resolveGameTrack(parentGame: NintendoMusicLibraryGameAlbum, track: ExtractedNintendoMusicTrack): Promise<NintendoMusicLibraryTrack> {
    const trackData = {
      title: track.name,
      duration: track.durationMillis,
      nintendoMusicId: track.id,
    }

    const existingTrack = await prismaClient.nintendoMusicLibraryTrack.findUnique({
      where: {
        nintendoMusicId: track.id
      }
    })

    // Case 2a: A track exists with the nintendoMusicId; update it.
    if (existingTrack !== null) {
      console.debug(`Resolved ${track.id} ${track.name} to existing identical track.`)
      return await prismaClient.nintendoMusicLibraryTrack.update({
        data: trackData,
        where: {
          id: existingTrack.id,
          nintendoMusicId: track.id,
        },
      })
    }
    // INVARIANT: No track exists with the nintendoMusicId

    const existingSimilarTrack = await prismaClient.nintendoMusicLibraryTrack.findFirst({
      where: {
        nintendoMusicLibraryGameAlbumId: parentGame.id,
        title: track.name,
      }
    })

    // Case 2b: A similarly named track exists; update it and attach nintendoMusicId.
    if (existingSimilarTrack !== null) {
      console.debug(`Resolved ${track.id} to existing similarly named track ${existingSimilarTrack.id} ${existingSimilarTrack.title}`)
      return await prismaClient.nintendoMusicLibraryTrack.update({
        data: trackData,
        where: {
          id: existingSimilarTrack.id,
        }
      })
    }
    // INVARIANT: No similarly named track exists in the database.

    // Case 2c: Create the track with the resolved game ID and 
    console.debug(`Resolved ${track.id} ${track.name} by creating a new track`)
    return await createNintendoMusicTrack(prismaClient, track.name, track.durationMillis, parentGame.id, track.id)
  }

  const resolvedGameAlbum = await resolveGameAlbum();

  const resolvedTracks = [];
  for (const dataTrack of data.tracks) {
    const resolved = await resolveGameTrack(resolvedGameAlbum, dataTrack);
    resolvedTracks.push(resolved)
  }

  console.info(`Resolved ${resolvedTracks.length} tracks from ${data.game.name}!`)
}

function main() {
  const [rawPaths, rawResponses] = getRawNintendoMusicRespones();
  const extracteds = rawResponses.map((response) =>
    extractedNintendoMusicFromRawNintendoMusic(response),
  );

  const prismaClient = createPrismaClient();
  extracteds.forEach(extracted => applyExtractedData(prismaClient, extracted))

  extracteds.map((extracted, idx) => {
    const rawPath = rawPaths[idx];
    writeFileSync(`./mitmed/extracted/${rawPath}`, JSON.stringify(extracted));
  });
}

main();
