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

/**
 * GET /api/tickets & GET /api/v1/tickets
 * Query tickets owned by the active Requester with search, filters, sorting, and pagination
 */
export async function getTickets(req: Request, res: Response) {
  try {
    const rawRequesterId = req.headers["x-requester-id"];
    const requesterId = parseInt(rawRequesterId as string, 10);

    // 1. Mandatory header check (strict requester isolation)
    // Any incoming req.query.requesterId is strictly ignored
    if (!rawRequesterId || isNaN(requesterId) || requesterId <= 0) {
      return res.status(400).json({
        error: {
          code: "MISSING_REQUESTER_ID",
          message: "A valid requester ID must be provided via the 'x-requester-id' header.",
          timestamp: new Date().toISOString(),
        },
      });
    }

    // 2. Verify active requester
    const prisma = getPrisma();
    const requester = await prisma.requesterUser.findUnique({
      where: { id: requesterId },
    });

    if (!requester || !requester.isActive) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_FAILED",
          message: "The specified development requester is inactive or does not exist.",
          fieldErrors: [{ field: "requesterId", message: "Requester must be an active development user." }],
          timestamp: new Date().toISOString(),
        },
      });
    }

    // 3. Extract query parameters
    const {
      search,
      category,
      requestedPriority,
      itPriority,
      status,
      sortBy,
      sortOrder,
      page: queryPage,
      pageSize: queryPageSize,
    } = req.query;

    // 4. Build Prisma where clause with hard ownership invariant
    const whereClause: any = {
      AND: [
        { requesterId }, // INVARIANT: Strict cross-requester data isolation
      ],
    };

    // Search filter (ticketNumber or summary case-insensitive substring)
    if (typeof search === "string" && search.trim().length > 0) {
      const term = search.trim();
      whereClause.AND.push({
        OR: [
          { ticketNumber: { contains: term, mode: "insensitive" } },
          { summary: { contains: term, mode: "insensitive" } },
        ],
      });
    }

    // Category filter (ID or name)
    if (category) {
      const catNum = parseInt(category as string, 10);
      if (!isNaN(catNum)) {
        whereClause.AND.push({ categoryId: catNum });
      } else if (typeof category === "string" && category.trim().length > 0) {
        whereClause.AND.push({
          category: { name: { equals: category.trim(), mode: "insensitive" } },
        });
      }
    }

    // Requested priority filter
    if (typeof requestedPriority === "string" && requestedPriority.trim().length > 0) {
      whereClause.AND.push({
        requestedPriority: { equals: requestedPriority.trim(), mode: "insensitive" },
      });
    }

    // IT priority filter (handles "UNASSIGNED" -> null)
    if (typeof itPriority === "string" && itPriority.trim().length > 0) {
      if (itPriority.trim().toUpperCase() === "UNASSIGNED") {
        whereClause.AND.push({ itPriority: null });
      } else {
        whereClause.AND.push({
          itPriority: { equals: itPriority.trim(), mode: "insensitive" },
        });
      }
    }

    // Status filter
    if (typeof status === "string" && status.trim().length > 0) {
      whereClause.AND.push({
        currentStatus: { equals: status.trim(), mode: "insensitive" },
      });
    }

    // 5. Pagination mathematics & boundary normalization
    const parsedPage = parseInt(queryPage as string, 10);
    const page = Math.max(1, isNaN(parsedPage) ? 1 : parsedPage);

    const allowedPageSizes = [10, 25, 50];
    const parsedPageSize = parseInt(queryPageSize as string, 10);
    const pageSize = allowedPageSizes.includes(parsedPageSize) ? parsedPageSize : 10;

    const skip = (page - 1) * pageSize;
    const take = pageSize;

    // 6. Sorting configuration
    const allowedSortFields: Record<string, string> = {
      createdat: "createdAt",
      ticketnumber: "ticketNumber",
      ticketno: "ticketNumber",
      summary: "summary",
      updatedat: "updatedAt",
      requestedpriority: "requestedPriority",
      itpriority: "itPriority",
      currentstatus: "currentStatus",
      status: "currentStatus",
    };

    const sortField =
      typeof sortBy === "string" && allowedSortFields[sortBy.toLowerCase()]
        ? allowedSortFields[sortBy.toLowerCase()]
        : "createdAt";

    const sortDirection =
      typeof sortOrder === "string" && sortOrder.toLowerCase() === "asc" ? "asc" : "desc";

    const orderBy = { [sortField]: sortDirection };

    // 7. Execute count and findMany in parallel
    const [totalCount, tickets] = await Promise.all([
      prisma.ticket.count({ where: whereClause }),
      prisma.ticket.findMany({
        where: whereClause,
        skip,
        take,
        orderBy,
        include: {
          category: true,
          relatedSystem: true,
          attachments: {
            where: { isRemoved: false },
            select: { id: true },
          },
        },
      }),
    ]);

    const totalPages = totalCount === 0 ? 0 : Math.ceil(totalCount / pageSize);

    // 8. Serialize response with compatibility aliases
    const items = tickets.map((t) => ({
      id: t.id,
      ticketNumber: t.ticketNumber,
      ticketNo: t.ticketNumber, // Compatibility alias
      summary: t.summary,
      requestedPriority: t.requestedPriority,
      itPriority: t.itPriority,
      currentStatus: t.currentStatus,
      status: t.currentStatus, // Compatibility alias
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      category: {
        id: t.category.id,
        code: t.category.code,
        name: t.category.name,
      },
      relatedSystem: {
        id: t.relatedSystem.id,
        name: t.relatedSystem.name,
      },
      attachmentCount: t.attachments.length,
    }));

    return res.status(200).json({
      items,
      totalCount,
      totalPages,
      currentPage: page,
      page, // Compatibility alias
      pageSize,
    });
  } catch {
    return res.status(500).json({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "An unexpected error occurred while retrieving tickets.",
        timestamp: new Date().toISOString(),
      },
    });
  }
}
