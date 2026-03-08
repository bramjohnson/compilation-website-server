import { NextFunction, Request, Response, Router } from "express";
import { PrismaClient, User } from "../../../generated/prisma/client";
import { jwtVerify, SignJWT } from "jose";
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

export interface RequestWithResolvableUser extends Request {
    user?: User
}

export function authenticateMiddlewareClosure(prismaClient: PrismaClient) {
    return async (req: RequestWithResolvableUser, res: Response, next: NextFunction) => {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith("Bearer ")) {
            return res.status(401).json({ error: "Missing or malformed token" });
        }

        const token = authHeader.slice(7);

        try {
            const { payload } = await jwtVerify(token, JWT_SECRET);
            if (payload.sub === undefined) {
                return res.status(404).json({ error: "Could not find user for the provided token" })
            }

            const userID: number = parseInt(payload.sub)
            const user = await prismaClient.user.findUnique({ where: { id: userID } })
            if (user === null) {
                return res.status(404).json({ error: "User not found" })
            }

            req.user = user;
            next();
        } catch {
            return res.status(401).json({ error: "Invalid or expired token" })
        }
    }
}

export function setupUserRouter(prismaClient: PrismaClient): Router {
    const userRouter = Router();

    userRouter.post("/register", async (req, res) => {
        const { username, password } = req.body

        try {
            const hashed = await bcrypt.hash(password, SALT_ROUNDS);
            const user = await prismaClient.user.create({
                data: { username, password: hashed }
            })

            return res.status(201).json({
                id: user.id, username: user.username,
            })
        } catch (err) {
            if (err.code === "P2002") {
                return res.status(409).json({ error: "Username already taken" })
            }

            console.error(err);
            return res.status(500).json({ error: "Internal server error" })
        }
    })

    userRouter.post("/login", async (req, res) => {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: "Username and password are required" })
        }

        try {
            const user = await prismaClient.user.findUnique({ where: { username } });
            const isPasswordCorrect = user && (await bcrypt.compare(password, user.password))
            if (!isPasswordCorrect) {
                return res.status(401).json({ error: "Invalid credentials" })
            }

            const token = await new SignJWT({ username: user.username })
                .setProtectedHeader({ alg: "HS256" })
                .setSubject(String(user.id))
                .setExpirationTime("8h")
                .sign(JWT_SECRET)

            res.cookie('token', token, {
                // httpOnly: true,
                // secure: true,
                // sameSite: "strict",
            })
            return res.json({ token })
        } catch (err) {
            console.error(err);
            return res.status(500).json({ error: "Internal server error" })
        }
    })

    return userRouter
}
