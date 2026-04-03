import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { createPrismaClient } from "../prisma";

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

interface RawRelatedPlaylistsResponse {
  allPlaylist: {
    id: string;
    tracksNum: number;
  };
}

function getRawNintendoMusicRespones(): [
  string[],
  RawOfficialPlaylistsResponse[],
] {
  const rawResponseFilePaths = readdirSync("./mitmed/raw/officialPlaylists/");
  console.log(rawResponseFilePaths);
  const rawRespones = rawResponseFilePaths.map((filePath) =>
    readFileSync(`./mitmed/raw/officialPlaylists/${filePath}`),
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

function main() {
  const [rawPaths, rawResponses] = getRawNintendoMusicRespones();
  const extracteds = rawResponses.map((response) =>
    extractedNintendoMusicFromRawNintendoMusic(response),
  );

  const prismaClient = createPrismaClient();
  extracteds.forEach(async (extracted) => {
    // Try to automatically associate to existing game
    const gameGuess =
      await prismaClient.nintendoMusicLibraryGameAlbum.findFirst({
        where: {
          name: extracted.game.name,
        },
      });

    if (gameGuess === null) {
      console.log("No good guess ):");
      return;
    }

    console.log(`Updating ${gameGuess.name} with ID ${extracted.game.id}`);
    prismaClient.nintendoMusicLibraryGameAlbum.update({
      where: {
        id: gameGuess.id,
      },
      data: {
        nintendoMusicId: extracted.game.id,
      },
    });

    extracted.tracks.forEach(async (track) => {
      // Try to automatically associate to existing track
      const trackGuess = await prismaClient.nintendoMusicLibraryTrack.findFirst(
        {
          where: {
            title: track.name,
            nintendoMusicLibraryGameAlbumId: gameGuess.id,
          },
        },
      );

      if (trackGuess === null) {
        console.log(`No good track guess for ${track.name}`);
        return;
      }

      console.log(`Updating ${trackGuess.title} with ID ${track.id}`);
      prismaClient.nintendoMusicLibraryTrack.update({
        where: {
          id: trackGuess.id,
        },
        data: {
          nintendoMusicId: track.id,
        },
      });
    });
  });

  extracteds.map((extracted, idx) => {
    const rawPath = rawPaths[idx];
    writeFileSync(`./mitmed/extracted/${rawPath}`, JSON.stringify(extracted));
  });
}

main();
