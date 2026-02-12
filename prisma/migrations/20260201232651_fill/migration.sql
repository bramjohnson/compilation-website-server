-- CreateTable
CREATE TABLE "NintendoMusicLibraryGameAlbum" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "NintendoMusicLibraryGameAlbum_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NintendoMusicLibraryTrack" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "nintendoMusicLibraryGameAlbumId" INTEGER,

    CONSTRAINT "NintendoMusicLibraryTrack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Compilation" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "creatorId" INTEGER,

    CONSTRAINT "Compilation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompilationTrack" (
    "id" SERIAL NOT NULL,
    "compilationId" INTEGER,
    "position" INTEGER NOT NULL,
    "addedToNMLPlaylist" BOOLEAN NOT NULL,
    "userDefinedTrackId" INTEGER,

    CONSTRAINT "CompilationTrack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserDefinedAlbum" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "UserDefinedAlbum_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserDefinedTrack" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "userDefinedAlbumId" INTEGER,
    "nintendoMusicLibraryTrackId" INTEGER,

    CONSTRAINT "UserDefinedTrack_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "NintendoMusicLibraryTrack" ADD CONSTRAINT "NintendoMusicLibraryTrack_nintendoMusicLibraryGameAlbumId_fkey" FOREIGN KEY ("nintendoMusicLibraryGameAlbumId") REFERENCES "NintendoMusicLibraryGameAlbum"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Compilation" ADD CONSTRAINT "Compilation_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompilationTrack" ADD CONSTRAINT "CompilationTrack_compilationId_fkey" FOREIGN KEY ("compilationId") REFERENCES "Compilation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompilationTrack" ADD CONSTRAINT "CompilationTrack_userDefinedTrackId_fkey" FOREIGN KEY ("userDefinedTrackId") REFERENCES "UserDefinedTrack"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserDefinedTrack" ADD CONSTRAINT "UserDefinedTrack_userDefinedAlbumId_fkey" FOREIGN KEY ("userDefinedAlbumId") REFERENCES "UserDefinedAlbum"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserDefinedTrack" ADD CONSTRAINT "UserDefinedTrack_nintendoMusicLibraryTrackId_fkey" FOREIGN KEY ("nintendoMusicLibraryTrackId") REFERENCES "NintendoMusicLibraryTrack"("id") ON DELETE SET NULL ON UPDATE CASCADE;
