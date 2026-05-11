import { PrismaClient } from "@prisma/client/extension";
import { Router } from "express";
import { setupSearchRouter } from "./search.route";

export function setupMetaRouter(prismaClient: PrismaClient): Router {
  const metaRouter = Router();
  metaRouter.get("/", (_, res) => res.send("Hello from API meta!"));
  metaRouter.use("/search", setupSearchRouter(prismaClient));
  return metaRouter;
}
