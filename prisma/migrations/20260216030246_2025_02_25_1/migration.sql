-- AlterTable
ALTER TABLE "Compilation" ADD COLUMN     "nintendoMusicURL" TEXT,
ADD COLUMN     "youtubeURL" TEXT;

-- AlterTable
ALTER TABLE "UserDefinedTrack" ADD COLUMN     "spotifyGameTrackId" INTEGER;

-- CreateTable
CREATE TABLE "SpotifyGameAlbum" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "spotifyAlbumId" INTEGER NOT NULL,

    CONSTRAINT "SpotifyGameAlbum_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpotifyGameTrack" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "spotifyGameAlbumId" INTEGER,

    CONSTRAINT "SpotifyGameTrack_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SpotifyGameTrack" ADD CONSTRAINT "SpotifyGameTrack_spotifyGameAlbumId_fkey" FOREIGN KEY ("spotifyGameAlbumId") REFERENCES "SpotifyGameAlbum"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserDefinedTrack" ADD CONSTRAINT "UserDefinedTrack_spotifyGameTrackId_fkey" FOREIGN KEY ("spotifyGameTrackId") REFERENCES "SpotifyGameTrack"("id") ON DELETE SET NULL ON UPDATE CASCADE;
