import { PrismaClient } from "./generated/prisma/client";
import { createPrismaClient } from "./prisma";

async function createEzonater(prismaClient: PrismaClient) {
  const user = await prismaClient.user.create({
    data: {
      email: "ezonater@gmail.com",
      name: "Ezonater",
    },
  });

  console.log(user);
}

async function createCompilation(prismaClient: PrismaClient) {
  const compilation = await prismaClient.compilation.create({
    data: {
      name: "quiet winter",
      description: "",
      creator: {
        connect: {
          email: "ezonater@gmail.com",
        },
      },
    },
  });

  console.log(compilation);
}

async function createUserDefinedAlbum(prismaClient: PrismaClient) {
  const userDefinedAlbum = await prismaClient.userDefinedAlbum.create({
    data: {
      name: "Animal Crossing: Wild World - K.K.'s Choice Mix!",
    },
  });

  console.log(userDefinedAlbum);
}

async function createUserDefinedTrack(prismaClient: PrismaClient) {
  const userDefinedTrack = await prismaClient.userDefinedTrack.create({
    data: {
      title: "Title (First Snow Mix)",
      duration: 304,
      userDefinedAlbum: {
        connect: {
          id: 1,
        },
      },
    },
  });

  console.log(userDefinedTrack);
}

async function createCompilationTrack(prismaClient: PrismaClient) {
  const compilationTrack = await prismaClient.compilationTrack.create({
    data: {
      compilation: {
        connect: {
          id: 1,
        },
      },
      position: 1,
      addedToNMLPlaylist: false,
      userDefinedTrack: {
        connect: {
          id: 1,
        },
      },
    },
  });

  console.log(compilationTrack);
}

async function getCompilation(prismaClient: PrismaClient) {
  const compilation = await prismaClient.compilation.findUnique({
    where: {
      id: 1,
    },
    include: {
      compilationTracks: {
        include: {
          userDefinedTrack: true,
        },
      },
    },
  });

  console.log(JSON.stringify(compilation));
}

async function addThumbnailToCompilation(prismaClient: PrismaClient) {
  const compilationPrime = await prismaClient.compilation.update({
    where: {
      id: 1,
    },
    data: {
      thumbnailURL: "/thumb.png",
    },
  });
  console.log(compilationPrime);
}

async function main() {
  const prismaClient = createPrismaClient();

  await addThumbnailToCompilation(prismaClient);

  await prismaClient.$disconnect();
}

main();
