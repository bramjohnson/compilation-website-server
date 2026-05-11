import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import sharp from "sharp";
import path from "path";
import fs from "fs/promises";
import { PrismaClient, ImageType } from "../../../generated/prisma/client";
import {
  authenticateMiddlewareClosure,
  RequestWithResolvableUser,
} from "./users.route";
import { Readable } from "stream";
import { ReadableStream } from "node:stream/web";

// -------------------------------------------------------
// Config
// -------------------------------------------------------

const IMAGE_SERVER_USERNAME = process.env.IMAGES_SERVER_USERNAME || "user";
const IMAGE_SERVER_PASSWORD =
  process.env.IMAGES_SERVER_PASSWORD || "IMAGE_SERVER_PASSWORD";
const IMAGE_SERVER_URL = process.env.IMAGES_SERVER_URL || "http://example.com";

const UPLOAD_DIR = path.resolve("uploads");
const CACHE_DIR = path.resolve("uploads/cache");
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

const IMAGE_CONSTRAINTS: Record<ImageType, { width: number; height: number }> =
  {
    PROFILE_PICTURE: { width: 1024, height: 1024 },
    THUMBNAIL: { width: 1920, height: 1080 },
    BANNER: { width: 1920, height: 240 },
  };

// -------------------------------------------------------
// Multer — store in memory so Sharp can process before saving
// -------------------------------------------------------
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) cb(null, true);
    else cb(new Error(`Unsupported file type: ${file.mimetype}`));
  },
});

class ImageServerInterface {
  private username: String;
  private password: String;

  constructor(username: String, password: String) {
    this.username = username;
    this.password = password;
  }

  getHeaders() {
    const authHeaders = new Headers();
    authHeaders.set(
      "Authorization",
      "Basic " + btoa(this.username + ":" + this.password),
    );
    return authHeaders;
  }

  async getImage(id: string) {
    return await fetch(`${IMAGE_SERVER_URL}/image/${id}`, {
      headers: this.getHeaders(),
    });
  }

  async postImage(form: FormData) {
    return await fetch(IMAGE_SERVER_URL, {
      method: "POST",
      body: form,
      headers: this.getHeaders(),
    });
  }
}

// Router
export function setupImagesRouter(prismaClient: PrismaClient): Router {
  const router = Router();
  const imageServer = new ImageServerInterface(
    IMAGE_SERVER_USERNAME,
    IMAGE_SERVER_PASSWORD,
  );

  // -------------------------------------------------------
  // POST /images/upload/:type
  // Accepts: multipart/form-data with field "image" and body field "ownerId"
  // -------------------------------------------------------

  router.post(
    "/upload/:type",
    authenticateMiddlewareClosure(prismaClient),
    upload.single("image"),
    async (
      req: RequestWithResolvableUser,
      res: Response,
      next: NextFunction,
    ) => {
      try {
        const user = req.user!;
        const type = req.params.type?.toUpperCase() as ImageType;

        if (!Object.values(ImageType).includes(type)) {
          res.status(400).json({
            error: `Invalid image type. Must be one of: ${Object.values(ImageType).join(", ")}`,
          });
          return;
        }

        if (!req.file) {
          res.status(400).json({ error: "No image file provided." });
          return;
        }

        const resizedBuffer = await sharp(req.file.buffer)
          .resize({
            width: 800,
            height: 600,
            fit: "inside", // Maintains aspect ratio
          })
          .jpeg({ quality: 80 }) // Optional: compress to JPEG
          .toBuffer();

        const ownerId = user.id;
        const form = new FormData();
        const blob = new Blob([resizedBuffer], { type: "image/jpeg" });
        form.append("image", blob, req.file.originalname);

        const imageServerRes = await imageServer.postImage(form);
        console.log(imageServerRes);

        const responsebody = await imageServerRes.json();
        console.log(responsebody);
        console.log(responsebody.id);

        const image = await prismaClient.image.upsert({
          where: {
            remoteKey: responsebody.id,
          },
          update: {},
          create: {
            type: type,
            owner: {
              connect: {
                id: ownerId,
              },
            },
            remoteKey: responsebody.id,
          },
          select: {
            id: true,
            owner: true,
            remoteKey: true,
          },
        });

        res.status(201).json(image);
      } catch (err) {
        next(err);
      }
    },
  );

  // -------------------------------------------------------
  // GET /images/:id
  // Serves the original image.
  // -------------------------------------------------------

  router.get(
    "/:id",
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const image = await prismaClient.image.findUnique({
          where: { id: req.params.id },
        });

        if (!image) {
          res.status(404).json({ error: "Image not found." });
          return;
        }

        const authHeaders = new Headers();
        authHeaders.set(
          "Authorization",
          "Basic " + btoa(IMAGE_SERVER_USERNAME + ":" + IMAGE_SERVER_PASSWORD),
        );
        const imageServerRes = await fetch(
          `${IMAGE_SERVER_URL}/image/${image.remoteKey}`,
          { headers: authHeaders },
        );

        res.setHeader("Cache-Control", "max-age=600");

        if (!imageServerRes.body) {
          return res.status(404).send("Could not find image");
        }

        Readable.fromWeb(imageServerRes.body as ReadableStream).pipe(res);
      } catch (err) {
        next(err);
      }
    },
  );

  // -------------------------------------------------------
  // GET /images/:id/resize?w=256&h=256
  // Serves a resized variant. Generated on first request, then cached.
  // -------------------------------------------------------

  router.get(
    "/:id/resize",
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const w = parseInt(req.query.w as string);
        const h = parseInt(req.query.h as string);

        if (!w || !h || w < 1 || h < 1 || w > 4096 || h > 4096) {
          res.status(400).json({
            error:
              "Query params w and h are required and must be between 1–4096.",
          });
          return;
        }

        const image = await prismaClient.image.findUnique({
          where: { id: req.params.id },
        });
        if (!image) {
          res.status(404).json({ error: "Image not found." });
          return;
        }

        // Check cache first
        await ensureDir(CACHE_DIR);
        const cachedName = cacheFilename(image.id, w, h);
        const cachedPath = path.join(CACHE_DIR, cachedName);

        try {
          await fs.access(cachedPath); // throws if not found
          res.sendFile(cachedPath); // cache hit — serve immediately
          return;
        } catch {
          // cache miss — generate below
        }

        await sharp(image.path)
          .resize(w, h, { fit: "inside", withoutEnlargement: true })
          .webp({ quality: 85 })
          .toFile(cachedPath);

        res.sendFile(cachedPath);
      } catch (err) {
        next(err);
      }
    },
  );

  // -------------------------------------------------------
  // DELETE /images/:id
  // Removes DB record, original file, and any cached variants.
  // -------------------------------------------------------

  router.delete(
    "/:id",
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const image = await prismaClient.image.findUnique({
          where: { id: req.params.id },
        });
        if (!image) {
          res.status(404).json({ error: "Image not found." });
          return;
        }

        // Delete original
        await fs.unlink(image.path).catch(() => {
          /* already gone, no-op */
        });

        // Delete any cached variants matching this image id
        const cacheFiles = await fs
          .readdir(CACHE_DIR)
          .catch(() => [] as string[]);
        await Promise.all(
          cacheFiles
            .filter((f) => f.startsWith(image.id))
            .map((f) => fs.unlink(path.join(CACHE_DIR, f)).catch(() => {})),
        );

        await prismaClient.image.delete({ where: { id: image.id } });

        res.status(200).json({ message: "Image deleted." });
      } catch (err) {
        next(err);
      }
    },
  );

  return router;
}

// -------------------------------------------------------
// Helpers
// -------------------------------------------------------

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

/** Sanitize and process the uploaded buffer, saving the original to disk. */
async function saveOriginal(
  buffer: Buffer,
  type: ImageType,
  filename: string,
): Promise<string> {
  const dir = path.join(UPLOAD_DIR, type.toLowerCase());
  await ensureDir(dir);

  const constraints = IMAGE_CONSTRAINTS[type];
  const filePath = path.join(dir, filename);

  // Re-encode through Sharp to strip metadata/EXIF and enforce a max size cap.
  // We do NOT resize here — that happens on-demand.
  await sharp(buffer)
    .resize(constraints.width, constraints.height, {
      fit: "inside", // preserve aspect ratio, never upscale
      withoutEnlargement: true,
    })
    .webp({ quality: 90 }) // normalize to webp
    .toFile(filePath);

  return filePath;
}

/** Build a deterministic cache filename for a given size variant. */
function cacheFilename(imageId: string, w: number, h: number): string {
  return `${imageId}_${w}x${h}.webp`;
}
