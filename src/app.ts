import express from "express";
import { createPrismaClient } from "./prisma";
import { setupAPIRouter } from "./routes/api/api.route";

function setup() {
  const app = express();
  const prismaClient = createPrismaClient();

  // Setup Wildcard CORS
  app.use((_, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept",
    );
    next();
  });

  // Setup API routes
  app.use(express.json());
  app.use("/api", setupAPIRouter(prismaClient));

  const port = 3000;
  app.listen(port, () => {
    return console.log(`Express is listening at http://localhost:${port}`);
  });
}

setup();
