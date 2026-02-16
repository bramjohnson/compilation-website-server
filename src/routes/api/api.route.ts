import { PrismaClient } from "@prisma/client/extension";
import { Router } from "express";
import { setupV1Router } from "./v1/v1.route";

export function setupAPIRouter(prismaClient: PrismaClient): Router {
    const apiRouter = Router()
    apiRouter.get("/", (_, res) => res.send("Hello from API!"));
    apiRouter.use("/v1", setupV1Router(prismaClient))
    return apiRouter
}