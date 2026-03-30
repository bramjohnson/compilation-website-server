import express from "express";
import { createPrismaClient } from "./prisma";
import { setupAPIRouter } from "./routes/api/api.route";
import cors from "cors";
import cookieParser from "cookie-parser";

function setup() {
  const app = express();
  const prismaClient = createPrismaClient();

  // Setup extra methods
  app.use((_, res, next) => {
    res.header("Access-Control-Allow-Methods", "PUT, PATCH, DELETE");
    next();
  });

  // Setup CORS
  app.use(
    cors({
      origin: "http://localhost:5173",
      credentials: true,
    }),
  );

  // Setup API routes
  app.use(express.json());
  app.use(cookieParser());
  app.use("/api", setupAPIRouter(prismaClient));

  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    return console.log(`Express is listening at http://localhost:${port}`);
  });
}

setup();
