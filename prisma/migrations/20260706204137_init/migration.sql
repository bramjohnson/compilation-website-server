-- CreateEnum
CREATE TYPE "Permission" AS ENUM ('OVERLORD', 'IMPERSONATE_CREATE_COMPILATION', 'IMPERSONATE_EDIT_COMPILATION', 'IMPERSONATE_DELETE_COMPILATION', 'CREATE_NINTENDO_MUSIC_TRACK', 'CREATE_NINTENDO_MUSIC_ALBUM', 'IMPERSONATE_EDIT_USER');

-- CreateEnum
CREATE TYPE "CompilationVisibility" AS ENUM ('PRIVATE', 'PUBLIC');

-- CreateEnum
CREATE TYPE "ImageType" AS ENUM ('PROFILE_PICTURE', 'THUMBNAIL', 'BANNER');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "displayName" TEXT,
    "avatarId" TEXT,
    "bannerId" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPermission" (
    "id" TEXT NOT NULL,
    "permission" "Permission" NOT NULL,
    "grantorId" TEXT NOT NULL,
    "granteeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserPermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpotifyGameAlbum" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "spotifyAlbumId" TEXT NOT NULL,

    CONSTRAINT "SpotifyGameAlbum_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpotifyGameTrack" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "spotifyGameAlbumId" TEXT,

    CONSTRAINT "SpotifyGameTrack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NintendoMusicLibraryGameAlbum" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nintendoMusicId" TEXT,

    CONSTRAINT "NintendoMusicLibraryGameAlbum_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NintendoMusicLibraryTrack" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "nintendoMusicLibraryGameAlbumId" TEXT,
    "nintendoMusicId" TEXT,

    CONSTRAINT "NintendoMusicLibraryTrack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Compilation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "thumbnailId" TEXT,
    "nintendoMusicURL" TEXT,
    "youtubeURL" TEXT,
    "visibility" "CompilationVisibility" NOT NULL DEFAULT 'PRIVATE',
    "originalRelease" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Compilation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompilationTrack" (
    "id" TEXT NOT NULL,
    "compilationId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "addedToNMLPlaylist" BOOLEAN NOT NULL,
    "userDefinedTrackId" TEXT NOT NULL,

    CONSTRAINT "CompilationTrack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserDefinedAlbum" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "UserDefinedAlbum_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserDefinedTrack" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "userDefinedAlbumId" TEXT NOT NULL,
    "nintendoMusicLibraryTrackId" TEXT,
    "spotifyGameTrackId" TEXT,

    CONSTRAINT "UserDefinedTrack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Image" (
    "id" TEXT NOT NULL,
    "remoteKey" TEXT NOT NULL,
    "type" "ImageType" NOT NULL,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Image_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_avatarId_key" ON "User"("avatarId");

-- CreateIndex
CREATE UNIQUE INDEX "User_bannerId_key" ON "User"("bannerId");

-- CreateIndex
CREATE UNIQUE INDEX "UserPermission_grantorId_granteeId_permission_key" ON "UserPermission"("grantorId", "granteeId", "permission");

-- CreateIndex
CREATE UNIQUE INDEX "NintendoMusicLibraryGameAlbum_nintendoMusicId_key" ON "NintendoMusicLibraryGameAlbum"("nintendoMusicId");

-- CreateIndex
CREATE UNIQUE INDEX "NintendoMusicLibraryTrack_nintendoMusicId_key" ON "NintendoMusicLibraryTrack"("nintendoMusicId");

-- CreateIndex
CREATE UNIQUE INDEX "UserDefinedAlbum_name_key" ON "UserDefinedAlbum"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Image_remoteKey_key" ON "Image"("remoteKey");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_avatarId_fkey" FOREIGN KEY ("avatarId") REFERENCES "Image"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_bannerId_fkey" FOREIGN KEY ("bannerId") REFERENCES "Image"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPermission" ADD CONSTRAINT "UserPermission_granteeId_fkey" FOREIGN KEY ("granteeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPermission" ADD CONSTRAINT "UserPermission_grantorId_fkey" FOREIGN KEY ("grantorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpotifyGameTrack" ADD CONSTRAINT "SpotifyGameTrack_spotifyGameAlbumId_fkey" FOREIGN KEY ("spotifyGameAlbumId") REFERENCES "SpotifyGameAlbum"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NintendoMusicLibraryTrack" ADD CONSTRAINT "NintendoMusicLibraryTrack_nintendoMusicLibraryGameAlbumId_fkey" FOREIGN KEY ("nintendoMusicLibraryGameAlbumId") REFERENCES "NintendoMusicLibraryGameAlbum"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Compilation" ADD CONSTRAINT "Compilation_thumbnailId_fkey" FOREIGN KEY ("thumbnailId") REFERENCES "Image"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Compilation" ADD CONSTRAINT "Compilation_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompilationTrack" ADD CONSTRAINT "CompilationTrack_compilationId_fkey" FOREIGN KEY ("compilationId") REFERENCES "Compilation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompilationTrack" ADD CONSTRAINT "CompilationTrack_userDefinedTrackId_fkey" FOREIGN KEY ("userDefinedTrackId") REFERENCES "UserDefinedTrack"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserDefinedTrack" ADD CONSTRAINT "UserDefinedTrack_nintendoMusicLibraryTrackId_fkey" FOREIGN KEY ("nintendoMusicLibraryTrackId") REFERENCES "NintendoMusicLibraryTrack"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserDefinedTrack" ADD CONSTRAINT "UserDefinedTrack_spotifyGameTrackId_fkey" FOREIGN KEY ("spotifyGameTrackId") REFERENCES "SpotifyGameTrack"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserDefinedTrack" ADD CONSTRAINT "UserDefinedTrack_userDefinedAlbumId_fkey" FOREIGN KEY ("userDefinedAlbumId") REFERENCES "UserDefinedAlbum"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Image" ADD CONSTRAINT "Image_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
