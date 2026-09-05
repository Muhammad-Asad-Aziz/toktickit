import { Request, Response, NextFunction } from "express";
import multer, { FileFilterCallback } from "multer";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import { getPrisma } from "../prisma.js";
import { generateTicketNumber } from "../services/ticketNumberService.js";

// Ensure uploads directory exists regardless of current working directory
export const UPLOAD_DIR = fs.existsSync(path.resolve(process.cwd(), "src"))
  ? path.resolve(process.cwd(), "uploads")
  : path.resolve(process.cwd(), "server", "uploads");

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

const ALLOWED_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".pdf",
]);

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB = 5,242,880 bytes
const MAX_ATTACHMENTS = 5;

// Configure Multer disk storage with UUID sanitization
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${crypto.randomUUID()}${ext}`;
    cb(null, uniqueName);
  },
});

function fileFilter(_req: Request, file: Express.Multer.File, cb: FileFilterCallback) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_MIME_TYPES.has(file.mimetype) || !ALLOWED_EXTENSIONS.has(ext)) {
    const error = new Error(`File '${file.originalname}' has an unsupported format. Allowed types: JPG, PNG, WEBP, PDF.`) as Error & { code?: string };
    error.code = "UNSUPPORTED_FILE_TYPE";
    return cb(error);
  }
  cb(null, true);
}

// Allow reading up to 10 files in multer so our controller can cleanly reject >5 with ATTACHMENT_LIMIT_EXCEEDED
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 10,
  },
}).array("attachments", 10);

/**
 * Middleware wrapping multer to standardize error envelopes for file rejections
 */
export function handleUploadMiddleware(req: Request, res: Response, next: NextFunction) {
  const contentType = req.headers["content-type"] || "";
  if (!contentType.includes("multipart/form-data")) {
    return next();
  }

  upload(req, res, (err: unknown) => {
    if (err) {
      const multerErr = err as { code?: string; message?: string };
      if (multerErr.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          error: {
            code: "FILE_TOO_LARGE",
            message: "File exceeds the maximum allowed size of 5 MB.",
            timestamp: new Date().toISOString(),
          },
        });
      }

      if (multerErr.code === "UNSUPPORTED_FILE_TYPE") {
        return res.status(400).json({
          error: {
            code: "UNSUPPORTED_FILE_TYPE",
            message: multerErr.message || "Unsupported file format. Allowed types: JPG, PNG, WEBP, PDF.",
            timestamp: new Date().toISOString(),
          },
        });
      }

      return res.status(400).json({
        error: {
          code: "VALIDATION_FAILED",
          message: multerErr.message || "Failed to process uploaded file.",
          timestamp: new Date().toISOString(),
        },
      });
    }
    next();
  });
}

/**
 * Safe cleanup of any files saved during a failed request
 */
async function cleanupFiles(files?: Express.Multer.File[]) {
  if (!files || files.length === 0) return;
  for (const file of files) {
    try {
      if (file.path && fs.existsSync(file.path)) {
        await fs.promises.unlink(file.path);
      }
    } catch {
      // Ignore cleanup error
    }
  }
}

interface FieldError {
  field: string;
  message: string;
}

const VALID_PRIORITIES = new Set(["low", "medium", "high", "urgent"]);
const PRIORITY_MAP: Record<string, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

/**
 * POST /api/tickets and POST /api/v1/tickets
 * Handles ticket creation with atomic sequence generation and optional attachment storage.
 */
export async function createTicket(req: Request, res: Response) {
  const files = req.files as Express.Multer.File[] | undefined;

  // 1. Check attachment quantity boundary
  if (files && files.length > MAX_ATTACHMENTS) {
    await cleanupFiles(files);
    return res.status(400).json({
      error: {
        code: "ATTACHMENT_LIMIT_EXCEEDED",
        message: `A maximum of ${MAX_ATTACHMENTS} attachments are allowed per ticket.`,
        timestamp: new Date().toISOString(),
      },
    });
  }

  // 2. Validate field inputs
  const fieldErrors: FieldError[] = [];

  const rawRequesterId = req.body.requesterId ?? req.headers["x-requester-id"];
  const requesterId = Number(rawRequesterId);
  if (!rawRequesterId || isNaN(requesterId) || requesterId <= 0) {
    fieldErrors.push({
      field: "requesterId",
      message: "Valid Requester ID is required.",
    });
  }

  const rawCategoryId = req.body.categoryId;
  const categoryId = Number(rawCategoryId);
  if (!rawCategoryId || isNaN(categoryId) || categoryId <= 0) {
    fieldErrors.push({
      field: "categoryId",
      message: "Category is required.",
    });
  }

  const rawSystemId = req.body.relatedSystemId;
  const relatedSystemId = Number(rawSystemId);
  if (!rawSystemId || isNaN(relatedSystemId) || relatedSystemId <= 0) {
    fieldErrors.push({
      field: "relatedSystemId",
      message: "Related System is required.",
    });
  }

  const rawPriority = String(req.body.requestedPriority ?? "").trim().toLowerCase();
  if (!rawPriority || !VALID_PRIORITIES.has(rawPriority)) {
    fieldErrors.push({
      field: "requestedPriority",
      message: "Requested Priority must be Low, Medium, High, or Urgent.",
    });
  }

  const summary = String(req.body.summary ?? "").trim();
  if (!summary) {
    fieldErrors.push({
      field: "summary",
      message: "Summary is required.",
    });
  } else if (summary.length > 100) {
    fieldErrors.push({
      field: "summary",
      message: "Summary is required and must not exceed 100 characters.",
    });
  }

  const description = String(req.body.description ?? "").trim();
  if (!description) {
    fieldErrors.push({
      field: "description",
      message: "Description is required.",
    });
  } else if (description.length < 10) {
    fieldErrors.push({
      field: "description",
      message: "Description must be at least 10 characters.",
    });
  } else if (description.length > 2000) {
    fieldErrors.push({
      field: "description",
      message: "Description must not exceed 2000 characters.",
    });
  }

  if (fieldErrors.length > 0) {
    await cleanupFiles(files);
    return res.status(400).json({
      error: {
        code: "VALIDATION_FAILED",
        message: "Validation failed for ticket creation.",
        fieldErrors,
        timestamp: new Date().toISOString(),
      },
    });
  }

  const normalizedPriority = PRIORITY_MAP[rawPriority];
  const prisma = getPrisma();

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Verify requester exists and is active (BR-09)
      const requester = await tx.requesterUser.findUnique({
        where: { id: requesterId },
      });
      if (!requester || !requester.isActive) {
        throw new Error("INACTIVE_OR_INVALID_REQUESTER");
      }

      // Verify category exists and is active
      const category = await tx.category.findUnique({
        where: { id: categoryId },
      });
      if (!category || !category.isActive) {
        throw new Error("INVALID_CATEGORY");
      }

      // Verify related system exists and is active
      const system = await tx.relatedSystem.findUnique({
        where: { id: relatedSystemId },
      });
      if (!system || !system.isActive) {
        throw new Error("INVALID_RELATED_SYSTEM");
      }

      // Generate atomic sequential ticket number
      const ticketNumber = await generateTicketNumber(tx);

      // Create Ticket record with initial status "New"
      const ticket = await tx.ticket.create({
        data: {
          ticketNumber,
          requesterId,
          categoryId,
          relatedSystemId,
          summary,
          description,
          requestedPriority: normalizedPriority,
          currentStatus: "New",
          itPriority: null,
        },
      });

      // Persist attachments if provided
      const createdAttachments = [];
      if (files && files.length > 0) {
        for (const file of files) {
          const att = await tx.attachment.create({
            data: {
              ticketId: ticket.id,
              originalFilename: file.originalname,
              storedFilename: file.filename,
              mimeType: file.mimetype,
              fileSize: file.size,
            },
          });
          createdAttachments.push(att);
        }
      }

      return {
        id: ticket.id,
        ticketNumber: ticket.ticketNumber,
        ticketNo: ticket.ticketNumber, // Compatibility alias with api-spec.md
        requesterId: ticket.requesterId,
        categoryId: ticket.categoryId,
        relatedSystemId: ticket.relatedSystemId,
        summary: ticket.summary,
        description: ticket.description,
        requestedPriority: ticket.requestedPriority,
        itPriority: ticket.itPriority,
        currentStatus: ticket.currentStatus,
        status: ticket.currentStatus, // Compatibility alias with api-spec.md
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
        requester: {
          id: requester.id,
          name: requester.name,
          email: requester.email,
        },
        category: {
          id: category.id,
          code: category.code,
          name: category.name,
        },
        relatedSystem: {
          id: system.id,
          name: system.name,
        },
        attachments: createdAttachments.map((a) => ({
          id: a.id,
          originalFilename: a.originalFilename,
          mimeType: a.mimeType,
          fileSize: a.fileSize,
          createdAt: a.createdAt,
        })),
      };
    });

    return res.status(201).json(result);
  } catch (error: unknown) {
    await cleanupFiles(files);
    const errMessage = (error as Error).message;

    if (errMessage === "INACTIVE_OR_INVALID_REQUESTER") {
      return res.status(400).json({
        error: {
          code: "VALIDATION_FAILED",
          message: "The specified development requester is inactive or does not exist.",
          fieldErrors: [{ field: "requesterId", message: "Requester must be an active development user." }],
          timestamp: new Date().toISOString(),
        },
      });
    }

    if (errMessage === "INVALID_CATEGORY") {
      return res.status(400).json({
        error: {
          code: "VALIDATION_FAILED",
          message: "The specified category is inactive or does not exist.",
          fieldErrors: [{ field: "categoryId", message: "Invalid category selected." }],
          timestamp: new Date().toISOString(),
        },
      });
    }

    if (errMessage === "INVALID_RELATED_SYSTEM") {
      return res.status(400).json({
        error: {
          code: "VALIDATION_FAILED",
          message: "The specified related system is inactive or does not exist.",
          fieldErrors: [{ field: "relatedSystemId", message: "Invalid related system selected." }],
          timestamp: new Date().toISOString(),
        },
      });
    }

    return res.status(500).json({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "An unexpected error occurred while creating the ticket. Please try again.",
        timestamp: new Date().toISOString(),
      },
    });
  }
}
