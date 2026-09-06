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

const singleUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
  },
}).fields([
  { name: "file", maxCount: 1 },
  { name: "attachment", maxCount: 1 },
]);

/**
 * Middleware wrapping multer for single file attachment uploads
 */
export function handleSingleUploadMiddleware(req: Request, res: Response, next: NextFunction) {
  const contentType = req.headers["content-type"] || "";
  if (!contentType.includes("multipart/form-data")) {
    return next();
  }

  singleUpload(req, res, (err: unknown) => {
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

    if (req.files) {
      const filesObj = req.files as Record<string, Express.Multer.File[]>;
      req.file = filesObj["file"]?.[0] || filesObj["attachment"]?.[0] || Object.values(filesObj)[0]?.[0];
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

/**
 * GET /api/tickets/:id & GET /api/v1/tickets/:id
 * Retrieve detailed read-only ticket information for an owned ticket.
 */
export async function getTicketById(req: Request, res: Response) {
  try {
    const rawRequesterId = req.headers["x-requester-id"];
    const requesterId = parseInt(rawRequesterId as string, 10);

    if (!rawRequesterId || isNaN(requesterId) || requesterId <= 0) {
      return res.status(400).json({
        error: {
          code: "MISSING_REQUESTER_ID",
          message: "A valid requester ID must be provided via the 'x-requester-id' header.",
          timestamp: new Date().toISOString(),
        },
      });
    }

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

    const ticketId = parseInt(req.params.id, 10);
    if (isNaN(ticketId) || ticketId <= 0) {
      return res.status(404).json({
        error: {
          code: "TICKET_NOT_FOUND",
          message: "The requested ticket was not found.",
          timestamp: new Date().toISOString(),
        },
      });
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        requester: {
          select: { id: true, name: true, email: true, department: true },
        },
        category: {
          select: { id: true, code: true, name: true },
        },
        relatedSystem: {
          select: { id: true, name: true },
        },
        attachments: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            originalFilename: true,
            mimeType: true,
            fileSize: true,
            isRemoved: true,
            removalReason: true,
            removedAt: true,
            removedByRequesterId: true,
            createdAt: true,
          },
        },
      },
    });

    if (!ticket) {
      return res.status(404).json({
        error: {
          code: "TICKET_NOT_FOUND",
          message: "The requested ticket was not found.",
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Security Check: Cross-requester rejection
    if (ticket.requesterId !== requesterId) {
      return res.status(403).json({
        error: {
          code: "FORBIDDEN_TICKET_ACCESS",
          message: "You do not have permission to view this ticket.",
          timestamp: new Date().toISOString(),
        },
      });
    }

    return res.status(200).json({
      id: ticket.id,
      ticketNumber: ticket.ticketNumber,
      ticketNo: ticket.ticketNumber, // Compatibility alias
      summary: ticket.summary,
      description: ticket.description,
      requestedPriority: ticket.requestedPriority,
      itPriority: ticket.itPriority,
      currentStatus: ticket.currentStatus,
      status: ticket.currentStatus, // Compatibility alias
      ticketOwner: null,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
      requester: {
        id: ticket.requester.id,
        name: ticket.requester.name,
        displayName: ticket.requester.name, // Compatibility alias
        email: ticket.requester.email,
        department: ticket.requester.department,
      },
      category: {
        id: ticket.category.id,
        code: ticket.category.code,
        name: ticket.category.name,
      },
      relatedSystem: {
        id: ticket.relatedSystem.id,
        name: ticket.relatedSystem.name,
      },
      attachments: ticket.attachments.map((a) => ({
        id: a.id,
        originalFilename: a.originalFilename,
        mimeType: a.mimeType,
        fileSize: a.fileSize,
        sizeBytes: a.fileSize, // Compatibility alias
        isRemoved: a.isRemoved,
        isDeleted: a.isRemoved, // Compatibility alias
        removalReason: a.removalReason,
        removedAt: a.removedAt,
        removedByRequesterId: a.removedByRequesterId,
        createdAt: a.createdAt,
        uploadedAt: a.createdAt, // Compatibility alias
      })),
    });
  } catch {
    return res.status(500).json({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "An unexpected error occurred while retrieving the ticket.",
        timestamp: new Date().toISOString(),
      },
    });
  }
}

/**
 * POST /api/tickets/:id/attachments & POST /api/v1/tickets/:id/attachments
 * Upload and attach a permitted file to an owned ticket.
 */
export async function uploadAttachment(req: Request, res: Response) {
  const file = req.file;

  try {
    const rawRequesterId = req.headers["x-requester-id"];
    const requesterId = parseInt(rawRequesterId as string, 10);

    if (!rawRequesterId || isNaN(requesterId) || requesterId <= 0) {
      if (file?.path && fs.existsSync(file.path)) {
        await fs.promises.unlink(file.path);
      }
      return res.status(400).json({
        error: {
          code: "MISSING_REQUESTER_ID",
          message: "A valid requester ID must be provided via the 'x-requester-id' header.",
          timestamp: new Date().toISOString(),
        },
      });
    }

    const prisma = getPrisma();
    const requester = await prisma.requesterUser.findUnique({
      where: { id: requesterId },
    });

    if (!requester || !requester.isActive) {
      if (file?.path && fs.existsSync(file.path)) {
        await fs.promises.unlink(file.path);
      }
      return res.status(400).json({
        error: {
          code: "VALIDATION_FAILED",
          message: "The specified development requester is inactive or does not exist.",
          fieldErrors: [{ field: "requesterId", message: "Requester must be an active development user." }],
          timestamp: new Date().toISOString(),
        },
      });
    }

    const ticketId = parseInt(req.params.id, 10);
    if (isNaN(ticketId) || ticketId <= 0) {
      if (file?.path && fs.existsSync(file.path)) {
        await fs.promises.unlink(file.path);
      }
      return res.status(404).json({
        error: {
          code: "TICKET_NOT_FOUND",
          message: "The requested ticket was not found.",
          timestamp: new Date().toISOString(),
        },
      });
    }

    if (!file) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_FAILED",
          message: "File is required.",
          fieldErrors: [{ field: "file", message: "No file was uploaded." }],
          timestamp: new Date().toISOString(),
        },
      });
    }

    const createdAttachment = await prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.findUnique({
        where: { id: ticketId },
      });

      if (!ticket) {
        throw new Error("TICKET_NOT_FOUND");
      }

      if (ticket.requesterId !== requesterId) {
        throw new Error("FORBIDDEN_TICKET_ACCESS");
      }

      // Check active attachment count (must be < 5)
      const activeCount = await tx.attachment.count({
        where: {
          ticketId,
          isRemoved: false,
        },
      });

      if (activeCount >= 5) {
        throw new Error("ATTACHMENT_LIMIT_EXCEEDED");
      }

      return tx.attachment.create({
        data: {
          ticketId,
          originalFilename: file.originalname,
          storedFilename: file.filename,
          mimeType: file.mimetype,
          fileSize: file.size,
          isRemoved: false,
        },
      });
    });

    return res.status(201).json({
      id: createdAttachment.id,
      ticketId: createdAttachment.ticketId,
      originalFilename: createdAttachment.originalFilename,
      mimeType: createdAttachment.mimeType,
      fileSize: createdAttachment.fileSize,
      sizeBytes: createdAttachment.fileSize, // Compatibility alias
      isRemoved: createdAttachment.isRemoved,
      isDeleted: createdAttachment.isRemoved, // Compatibility alias
      removalReason: createdAttachment.removalReason,
      removedAt: createdAttachment.removedAt,
      createdAt: createdAttachment.createdAt,
      uploadedAt: createdAttachment.createdAt, // Compatibility alias
    });
  } catch (error: unknown) {
    if (file?.path && fs.existsSync(file.path)) {
      try {
        await fs.promises.unlink(file.path);
      } catch {
        // ignore unlink error
      }
    }

    const msg = (error as Error).message;
    if (msg === "TICKET_NOT_FOUND") {
      return res.status(404).json({
        error: {
          code: "TICKET_NOT_FOUND",
          message: "The requested ticket was not found.",
          timestamp: new Date().toISOString(),
        },
      });
    }

    if (msg === "FORBIDDEN_TICKET_ACCESS") {
      return res.status(403).json({
        error: {
          code: "FORBIDDEN_TICKET_ACCESS",
          message: "You do not have permission to attach files to this ticket.",
          timestamp: new Date().toISOString(),
        },
      });
    }

    if (msg === "ATTACHMENT_LIMIT_EXCEEDED") {
      return res.status(400).json({
        error: {
          code: "ATTACHMENT_LIMIT_EXCEEDED",
          message: "A maximum of 5 active attachments are allowed per ticket.",
          timestamp: new Date().toISOString(),
        },
      });
    }

    return res.status(500).json({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "An unexpected error occurred while uploading the attachment.",
        timestamp: new Date().toISOString(),
      },
    });
  }
}

/**
 * GET /api/attachments/:id/download & GET /api/v1/attachments/:id/download
 * Stream active attachment binary for download.
 */
export async function downloadAttachment(req: Request, res: Response) {
  try {
    const rawRequesterId = req.headers["x-requester-id"];
    const requesterId = parseInt(rawRequesterId as string, 10);

    if (!rawRequesterId || isNaN(requesterId) || requesterId <= 0) {
      return res.status(400).json({
        error: {
          code: "MISSING_REQUESTER_ID",
          message: "A valid requester ID must be provided via the 'x-requester-id' header.",
          timestamp: new Date().toISOString(),
        },
      });
    }

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

    const attachmentId = parseInt(req.params.id, 10);
    if (isNaN(attachmentId) || attachmentId <= 0) {
      return res.status(404).json({
        error: {
          code: "ATTACHMENT_NOT_FOUND",
          message: "The requested attachment was not found.",
          timestamp: new Date().toISOString(),
        },
      });
    }

    const attachment = await prisma.attachment.findUnique({
      where: { id: attachmentId },
      include: {
        ticket: { select: { id: true, requesterId: true } },
      },
    });

    if (!attachment) {
      return res.status(404).json({
        error: {
          code: "ATTACHMENT_NOT_FOUND",
          message: "The requested attachment was not found.",
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Ownership check: must belong to active requester's ticket
    if (attachment.ticket.requesterId !== requesterId) {
      return res.status(403).json({
        error: {
          code: "FORBIDDEN_ATTACHMENT_ACCESS",
          message: "You do not have permission to download this attachment.",
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Soft-removed check
    if (attachment.isRemoved || attachment.removedAt !== null) {
      return res.status(410).json({
        error: {
          code: "ATTACHMENT_REMOVED",
          message: "This attachment has been removed and is no longer available for download.",
          timestamp: new Date().toISOString(),
        },
      });
    }

    const filePath = path.join(UPLOAD_DIR, attachment.storedFilename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        error: {
          code: "FILE_NOT_FOUND",
          message: "The physical attachment file could not be found on the server.",
          timestamp: new Date().toISOString(),
        },
      });
    }

    res.setHeader("Content-Type", attachment.mimeType);
    res.setHeader("Content-Disposition", `attachment; filename="${attachment.originalFilename}"`);
    res.setHeader("Content-Length", attachment.fileSize);

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  } catch {
    return res.status(500).json({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "An unexpected error occurred while downloading the attachment.",
        timestamp: new Date().toISOString(),
      },
    });
  }
}

/**
 * DELETE /api/attachments/:id & DELETE /api/v1/attachments/:id
 * Soft-remove an attachment with an audited removal reason.
 */
export async function removeAttachment(req: Request, res: Response) {
  try {
    const rawRequesterId = req.headers["x-requester-id"];
    const requesterId = parseInt(rawRequesterId as string, 10);

    if (!rawRequesterId || isNaN(requesterId) || requesterId <= 0) {
      return res.status(400).json({
        error: {
          code: "MISSING_REQUESTER_ID",
          message: "A valid requester ID must be provided via the 'x-requester-id' header.",
          timestamp: new Date().toISOString(),
        },
      });
    }

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

    const attachmentId = parseInt(req.params.id, 10);
    if (isNaN(attachmentId) || attachmentId <= 0) {
      return res.status(404).json({
        error: {
          code: "ATTACHMENT_NOT_FOUND",
          message: "The requested attachment was not found.",
          timestamp: new Date().toISOString(),
        },
      });
    }

    const rawReason = req.body?.removalReason;
    const removalReason = typeof rawReason === "string" ? rawReason.trim() : "";
    if (!removalReason || removalReason.length < 3 || removalReason.length > 250) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_FAILED",
          message: "Removal reason is required and must be between 3 and 250 characters.",
          fieldErrors: [
            {
              field: "removalReason",
              message: "A removal reason is required (between 3 and 250 characters).",
            },
          ],
          timestamp: new Date().toISOString(),
        },
      });
    }

    const attachment = await prisma.attachment.findUnique({
      where: { id: attachmentId },
      include: {
        ticket: { select: { id: true, requesterId: true } },
      },
    });

    if (!attachment) {
      return res.status(404).json({
        error: {
          code: "ATTACHMENT_NOT_FOUND",
          message: "The requested attachment was not found.",
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Ownership check: must belong to active requester's ticket
    if (attachment.ticket.requesterId !== requesterId) {
      return res.status(403).json({
        error: {
          code: "FORBIDDEN_ATTACHMENT_ACCESS",
          message: "You do not have permission to remove this attachment.",
          timestamp: new Date().toISOString(),
        },
      });
    }

    if (attachment.isRemoved) {
      return res.status(400).json({
        error: {
          code: "ATTACHMENT_ALREADY_REMOVED",
          message: "This attachment has already been removed.",
          timestamp: new Date().toISOString(),
        },
      });
    }

    const removedAt = new Date();
    const updated = await prisma.attachment.update({
      where: { id: attachmentId },
      data: {
        isRemoved: true,
        removalReason,
        removedAt,
        removedByRequesterId: requesterId,
      },
    });

    // Unlink physical file from disk
    const filePath = path.join(UPLOAD_DIR, attachment.storedFilename);
    try {
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
      }
    } catch {
      // ignore physical delete error
    }

    return res.status(200).json({
      id: updated.id,
      ticketId: updated.ticketId,
      originalFilename: updated.originalFilename,
      isRemoved: updated.isRemoved,
      isDeleted: updated.isRemoved, // Compatibility alias
      removalReason: updated.removalReason,
      removedAt: updated.removedAt,
      removedByRequesterId: updated.removedByRequesterId,
    });
  } catch {
    return res.status(500).json({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "An unexpected error occurred while removing the attachment.",
        timestamp: new Date().toISOString(),
      },
    });
  }
}

