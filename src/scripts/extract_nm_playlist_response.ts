import { readdirSync, readFileSync, writeFileSync } from "node:fs";

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

interface RawNintendoMusicResponse {
  game: RawNintendoMusicGame;
  tracks: RawNintendoMusicTrack[];
}

function getRawNintendoMusicRespones(): [string[], RawNintendoMusicResponse[]] {
  const rawResponseFilePaths = readdirSync("./mitmed/raw/");
  console.log(rawResponseFilePaths);
  const rawRespones = rawResponseFilePaths.map((filePath) =>
    readFileSync(`./mitmed/raw/${filePath}`),
  );
  const rawJsonResponses = rawRespones.map((response) =>
    JSON.parse(response.toString()),
  ) as RawNintendoMusicResponse[];
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
  rawNintendoMusic: RawNintendoMusicResponse,
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
  extracteds.map((extracted, idx) => {
    const rawPath = rawPaths[idx];
    writeFileSync(`./mitmed/extracted/${rawPath}`, JSON.stringify(extracted));
  });
}

main();
