import { Compilation, PrismaClient } from "../generated/prisma/client";

export function listCompilations(client: PrismaClient): Promise<Compilation[]> {
    return client.compilation.findMany()
}