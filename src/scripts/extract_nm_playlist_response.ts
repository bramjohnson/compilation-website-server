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

function getRawNintendoMusicRespones(): [string[], RawNintendoMusicResponse[]] {
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
    1. Check for an exiting NintendoMusicGameAlbum with the nintendoMusicId field matching the extracted data.
    1. If unresolved, look for an existing NintendoMusicGameAlbum with an identical name. Update the object with the nintendoMusicId field.
    2. If unresolved, create a new NintendoMusicGameAlbum from the extracted data.
  2. Resolve the NintendoMusicTracks from the extracted data:
    1. Check for an existing NintendoMusicTrack with the nintendoMusicId field matching the extracted data.
    2. If unresolved, look for an existing NintendoMusicTrack with an identical name and the same GameAlbum ID. Update the object with the nintendoMusicId field.
    3. If unresolved, create a new NintendoMusicTrack from the extracted data.
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

    // Case 2
    const existingSimilarGameAlbum = await prismaClient.nintendoMusicLibraryGameAlbum.findFirst({
      where: {
        name: data.game.name
      }
    });
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

    // Case 3
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

    const existingSimilarTrack = await prismaClient.nintendoMusicLibraryTrack.findFirst({
      where: {
        nintendoMusicLibraryGameAlbumId: parentGame.id,
        title: track.name,
      }
    })
    if (existingSimilarTrack !== null) {
      console.debug(`Resolved ${track.id} to existing similarly named track ${existingSimilarTrack.id} ${existingSimilarTrack.title}`)
      return await prismaClient.nintendoMusicLibraryTrack.update({
        data: trackData,
        where: {
          id: existingSimilarTrack.id,
        }
      })
    }

    console.debug(`Resolved ${track.id} ${track.name} by creating a new track`)
    return await createNintendoMusicTrack(prismaClient, track.name, track.durationMillis, parentGame.id)
  }

  const resolvedGameAlbum = await resolveGameAlbum();
  const resolvedTracks = await Promise.all(data.tracks.map(track => resolveGameTrack(resolvedGameAlbum, track)));
  console.info(`Resolved ${resolvedTracks.length} tracks!`)
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
