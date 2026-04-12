import { NextFunction, request, Request, Response, Router } from "express";
import {
  PrismaClient,
  User,
  UserPermission,
} from "../../../generated/prisma/client";
import { jwtVerify, SignJWT } from "jose";
import bcrypt from "bcrypt";
import z from "zod";
import { parse } from "dotenv";

const SALT_ROUNDS = 12;
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

export interface UserWithPermissions extends User { }

export interface RequestWithResolvableUser extends Request {
  user?: User & { permissionsReceived: UserPermission[] };
}

export function authenticateMiddlewareClosure(prismaClient: PrismaClient) {
  return async (
    req: RequestWithResolvableUser,
    res: Response,
    next: NextFunction,
  ) => {
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ error: "Missing or malformed token" });
    }

    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      if (payload.sub === undefined) {
        return res
          .status(404)
          .json({ error: "Could not find user for the provided token" });
      }

      const userID: number = parseInt(payload.sub);
      const user = await prismaClient.user.findUnique({
        where: { id: userID },
        include: {
          permissionsReceived: true,
        },
      });
      if (user === null) {
        return res.status(404).json({ error: "User not found" });
      }

      req.user = user;
      next();
    } catch {
      return res.status(401).json({ error: "Invalid or expired token" });
    }
  };
}

const MINIMUM_USERNAME_LENGTH = 3;
const MINIMUM_PASSWORD_LENGTH = 8;
export function setupUserRouter(prismaClient: PrismaClient): Router {
  const userRouter = Router();

  const UserRegisterBody = z.object({
    username: z.string().min(MINIMUM_USERNAME_LENGTH),
    password: z.string().min(MINIMUM_PASSWORD_LENGTH),
  });
  userRouter.post("/register", async (req, res) => {
    const parseResult = UserRegisterBody.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: "Invalid body",
        details: parseResult.error,
      });
    }
    const { username, password } = parseResult.data;

    try {
      const hashed = await bcrypt.hash(password, SALT_ROUNDS);
      const user = await prismaClient.user.create({
        data: { username, password: hashed },
      });

      return res.status(201).json({
        id: user.id,
        username: user.username,
      });
    } catch (err) {
      if (err.code === "P2002") {
        return res.status(409).json({ error: "Username already taken" });
      }

      console.error(err);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  userRouter.post("/login", async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
      return res
        .status(400)
        .json({ error: "Username and password are required" });
    }

    try {
      const user = await prismaClient.user.findUnique({ where: { username } });
      const isPasswordCorrect =
        user && (await bcrypt.compare(password, user.password));
      if (!isPasswordCorrect) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const token = await new SignJWT({ username: user.username })
        .setProtectedHeader({ alg: "HS256" })
        .setSubject(String(user.id))
        .setExpirationTime("8h")
        .sign(JWT_SECRET);

      res.cookie("token", token, {
        httpOnly: true,
        secure: false, // TODO: True in production
        sameSite: "lax",
      });
      return res.json({ token });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  userRouter.get("/session", authenticateMiddlewareClosure(prismaClient), async (req: RequestWithResolvableUser, res) => {
    if (req.user === undefined) {
      return res.status(403).json({ error: "Not authenticated" });
    } else {
      return res.status(200).json(req.user);
    }
  })

  userRouter.get(
    "/authenticated",
    authenticateMiddlewareClosure(prismaClient),
    async (req: RequestWithResolvableUser, res) => {
      if (req.user === undefined) {
        return res.status(403).json({ error: "Not authenticated" });
      } else {
        return res.status(200).json({ message: "Is authenticated" });
      }
    },
  );

  const UserPatchBodySchema = z.object({
    bannerId: z.string().optional()
  });
  userRouter.patch("/:id", authenticateMiddlewareClosure(prismaClient), async (req: RequestWithResolvableUser, res: Response) => {
    if (req.user === undefined) {
      return res.status(403).json({ error: "Unauthenticated" })
    }

    const authenticatedUser = req.user;
    const requestingForUserId = parseInt(req.params.id)
    const requestingForUser = await prismaClient.user.findUnique({ where: { id: requestingForUserId } })

    if (requestingForUser === null) {
      return res.status(404).json({ error: "Could not find associate user" })
    }

    if (requestingForUser.id !== authenticatedUser.id && !authenticatedUser.permissionsReceived.some(permission => permission.permission === "IMPERSONATE_EDIT_USER")) {
      return res.status(403).json({ error: "Cannot impersonate another user" })
    }

    const parseBodyResult = UserPatchBodySchema.safeParse(
      req.body,
    );
    if (!parseBodyResult.success) {
      return res.status(400).json({
        error: "Invalid body",
        details: parseBodyResult.error,
      });
    }

    const { bannerId } = parseBodyResult.data

    const response = await prismaClient.user.update({
      where: {
        id: requestingForUserId
      },
      data: {
        banner: {
          connect: {
            id: bannerId
          }
        }
      }
    })

    return res.json(response)
  })

  return userRouter;
}
