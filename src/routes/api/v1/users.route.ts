import { Router } from "express";
import { PrismaClient } from "../../../generated/prisma/client";

export function setupUserRouter(prismaClient: PrismaClient): Router {
    const userRouter = Router();

    return userRouter
}
