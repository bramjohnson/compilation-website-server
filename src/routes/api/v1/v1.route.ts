import { PrismaClient } from "@prisma/client/extension";
import { Router } from "express";
import { setupCompilationRouter } from "./compilation.route";
import { setupCreatorRouter } from "./creator.route";
import { setupUserDefinedRouter } from "./userDefined.route";
import { setupNintendoMusicRouter } from "./nintendoMusic.route";

export function setupV1Router(prismaClient: PrismaClient): Router {
  const v1Router = Router();
  v1Router.get("/", (_, res) => res.send("Hello from API v1!"));
  v1Router.get("/docs", (_, res) =>
    res.sendFile("redoc-static.html", {
      root: "C:/Users/Default.DESKTOP-IFHGSV5/Documents/Code/compilation-website-server",
    }),
  );
  v1Router.get("/openapi", (_, res) =>
    res.sendFile("openapi-v1.yaml", {
      root: "C:/Users/Default.DESKTOP-IFHGSV5/Documents/Code/compilation-website-server",
    }),
  );
  v1Router.use("/compilation", setupCompilationRouter(prismaClient));
  v1Router.use("/creator", setupCreatorRouter(prismaClient));
  v1Router.use("/userDefined", setupUserDefinedRouter(prismaClient));
  v1Router.use("/nintendoMusic", setupNintendoMusicRouter(prismaClient));
  return v1Router;
}
