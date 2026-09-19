import { Router, Request, Response } from "express";
import { getPrisma } from "../prisma.js";
import { requireAuth, requirePasswordChanged, requireRole } from "../middleware/auth.js";
import { Priority, TicketStatus } from "@prisma/client";

export const staffTicketsRouter = Router();

/**
 * GET /api/v1/staff/tickets
 * Query the shared ticket queue with search, multi-field filtering, sorting, and pagination.
 * Role Guard: IT_STAFF and ADMINISTRATOR only (BR-06).
 */
export async function getStaffTickets(req: Request, res: Response) {
  try {
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const status = typeof req.query.status === "string" ? req.query.status.trim() : "";
    const category = req.query.category;
    const itPriority = typeof req.query.itPriority === "string" ? req.query.itPriority.trim() : "";
    const owner = typeof req.query.owner === "string" ? req.query.owner.trim() : "";
    const sortBy = typeof req.query.sortBy === "string" ? req.query.sortBy.trim() : "createdAt";
    const sortOrder =
      typeof req.query.sortOrder === "string" && req.query.sortOrder.toLowerCase() === "asc"
        ? ("asc" as const)
        : ("desc" as const);

    const rawPage = parseInt(req.query.page as string, 10);
    const page = !isNaN(rawPage) && rawPage >= 1 ? rawPage : 1;

    const rawPageSize = parseInt(req.query.pageSize as string, 10);
    const pageSize = [10, 25, 50].includes(rawPageSize) ? rawPageSize : 10;

    const where: any = {};

    // 1. Case-insensitive search on ticketNumber or summary
    if (search) {
      where.OR = [
        { ticketNumber: { contains: search, mode: "insensitive" } },
        { summary: { contains: search, mode: "insensitive" } },
      ];
    }

    // 2. Exact status filter
    if (status) {
      const validStatuses = Object.values(TicketStatus) as string[];
      const normalizedStatus = status.toUpperCase();
      if (validStatuses.includes(normalizedStatus)) {
        where.currentStatus = normalizedStatus as TicketStatus;
      }
    }

    // 3. Category filter
    if (category !== undefined && category !== "") {
      const catId = typeof category === "number" ? category : parseInt(String(category), 10);
      if (!isNaN(catId)) {
        where.categoryId = catId;
      }
    }

    // 4. IT Priority filter
    if (itPriority) {
      const validPriorities = Object.values(Priority) as string[];
      const normalizedPriority = itPriority.toUpperCase();
      if (validPriorities.includes(normalizedPriority)) {
        where.itPriority = normalizedPriority as Priority;
      }
    }

    // 5. Owner filter (numeric user ID or "unassigned")
    if (owner) {
      if (owner.toLowerCase() === "unassigned") {
        where.ownerId = null;
      } else {
        const ownerId = parseInt(owner, 10);
        if (!isNaN(ownerId)) {
          where.ownerId = ownerId;
        }
      }
    }

    // 6. Sort field & direction
    const allowedSortFields: Record<string, string> = {
      createdAt: "createdAt",
      ticketNumber: "ticketNumber",
      summary: "summary",
      itPriority: "itPriority",
      currentStatus: "currentStatus",
    };
    const sortField = allowedSortFields[sortBy] || "createdAt";
    const orderBy = { [sortField]: sortOrder };

    const skip = (page - 1) * pageSize;
    const take = pageSize;

    const prisma = getPrisma();
    const [totalCount, tickets] = await prisma.$transaction([
      prisma.ticket.count({ where }),
      prisma.ticket.findMany({
        where,
        include: {
          requester: {
            select: { id: true, name: true, email: true },
          },
          owner: {
            select: { id: true, name: true, email: true },
          },
          category: {
            select: { id: true, name: true, code: true },
          },
        },
        orderBy,
        skip,
        take,
      }),
    ]);

    const totalPages = totalCount === 0 ? 1 : Math.ceil(totalCount / pageSize);

    const items = tickets.map((t) => ({
      id: t.id,
      ticketNumber: t.ticketNumber,
      summary: t.summary,
      categoryName: t.category.name,
      categoryId: t.categoryId,
      requestedPriority: t.requestedPriority,
      itPriority: t.itPriority || t.requestedPriority || "MEDIUM",
      currentStatus: t.currentStatus,
      requesterName: t.requester.name,
      requesterId: t.requesterId,
      ownerName: t.owner ? t.owner.name : null,
      ownerId: t.ownerId,
      requesterResolved: Boolean(t.requesterResolvedAt),
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    }));

    return res.status(200).json({
      items,
      totalCount,
      page,
      pageSize,
      totalPages,
    });
  } catch (error) {
    console.error("Failed to query staff ticket queue:", error);
    return res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to query staff ticket queue.",
        timestamp: new Date().toISOString(),
      },
    });
  }
}

/**
 * PATCH /api/v1/staff/tickets/:id/assignment
 * Assign, reassign, or unassign ticket ownership.
 */
export async function assignTicketOwner(req: Request, res: Response) {
  try {
    const ticketId = parseInt(req.params.id, 10);
    if (isNaN(ticketId) || ticketId <= 0) {
      return res.status(404).json({
        error: {
          code: "TICKET_NOT_FOUND",
          message: "Ticket not found.",
          timestamp: new Date().toISOString(),
        },
      });
    }

    const prisma = getPrisma();
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) {
      return res.status(404).json({
        error: {
          code: "TICKET_NOT_FOUND",
          message: "Ticket not found.",
          timestamp: new Date().toISOString(),
        },
      });
    }

    const { ownerId } = req.body;
    if (ownerId === undefined) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_FAILED",
          message: "ownerId field is required.",
          timestamp: new Date().toISOString(),
        },
      });
    }

    let newOwner = null;
    if (ownerId !== null) {
      const parsedOwnerId = typeof ownerId === "number" ? ownerId : parseInt(String(ownerId), 10);
      if (isNaN(parsedOwnerId) || parsedOwnerId <= 0) {
        return res.status(400).json({
          error: {
            code: "INVALID_ASSIGNEE",
            message: "Assignee must be a valid user ID.",
            timestamp: new Date().toISOString(),
          },
        });
      }

      const targetUser = await prisma.user.findUnique({ where: { id: parsedOwnerId } });
      if (!targetUser || !targetUser.isActive || (targetUser.role !== "IT_STAFF" && targetUser.role !== "ADMINISTRATOR")) {
        return res.status(400).json({
          error: {
            code: "INVALID_ASSIGNEE",
            message: "Ticket can only be assigned to an active IT Staff or Administrator.",
            timestamp: new Date().toISOString(),
          },
        });
      }
      newOwner = { id: targetUser.id, name: targetUser.name, email: targetUser.email };
    }

    await prisma.ticket.update({
      where: { id: ticketId },
      data: { ownerId: newOwner ? newOwner.id : null },
    });

    return res.status(200).json({
      message: "Ownership updated successfully.",
      owner: newOwner,
    });
  } catch (error) {
    console.error("Failed to update ticket ownership:", error);
    return res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to update ticket ownership.",
        timestamp: new Date().toISOString(),
      },
    });
  }
}

/**
 * PATCH /api/v1/staff/tickets/:id/priority
 * Update ticket IT Priority.
 */
export async function updateTicketPriority(req: Request, res: Response) {
  try {
    const ticketId = parseInt(req.params.id, 10);
    if (isNaN(ticketId) || ticketId <= 0) {
      return res.status(404).json({
        error: {
          code: "TICKET_NOT_FOUND",
          message: "Ticket not found.",
          timestamp: new Date().toISOString(),
        },
      });
    }

    const prisma = getPrisma();
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) {
      return res.status(404).json({
        error: {
          code: "TICKET_NOT_FOUND",
          message: "Ticket not found.",
          timestamp: new Date().toISOString(),
        },
      });
    }

    const { itPriority } = req.body;
    const validPriorities = Object.values(Priority) as string[];
    if (!itPriority || !validPriorities.includes(String(itPriority).toUpperCase())) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_FAILED",
          message: `itPriority must be one of ${validPriorities.join(", ")}.`,
          timestamp: new Date().toISOString(),
        },
      });
    }

    const normalizedPriority = String(itPriority).toUpperCase() as Priority;
    await prisma.ticket.update({
      where: { id: ticketId },
      data: { itPriority: normalizedPriority },
    });

    return res.status(200).json({
      message: "IT Priority updated.",
      itPriority: normalizedPriority,
    });
  } catch (error) {
    console.error("Failed to update IT Priority:", error);
    return res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to update IT Priority.",
        timestamp: new Date().toISOString(),
      },
    });
  }
}

const ALLOWED_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  NEW: [TicketStatus.OPEN, TicketStatus.CANCELLED],
  OPEN: [TicketStatus.IN_PROGRESS, TicketStatus.WAITING_FOR_REQUESTER, TicketStatus.CANCELLED],
  IN_PROGRESS: [TicketStatus.WAITING_FOR_REQUESTER, TicketStatus.RESOLVED, TicketStatus.CANCELLED],
  WAITING_FOR_REQUESTER: [TicketStatus.IN_PROGRESS, TicketStatus.RESOLVED],
  RESOLVED: [TicketStatus.CLOSED, TicketStatus.REOPENED],
  CLOSED: [TicketStatus.REOPENED],
  REOPENED: [TicketStatus.IN_PROGRESS, TicketStatus.CANCELLED],
  CANCELLED: [],
};

/**
 * PATCH /api/v1/staff/tickets/:id/status
 * Transition ticket status adhering to state machine transition matrix.
 */
export async function transitionTicketStatus(req: Request, res: Response) {
  try {
    const ticketId = parseInt(req.params.id, 10);
    if (isNaN(ticketId) || ticketId <= 0) {
      return res.status(404).json({
        error: {
          code: "TICKET_NOT_FOUND",
          message: "Ticket not found.",
          timestamp: new Date().toISOString(),
        },
      });
    }

    const prisma = getPrisma();
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) {
      return res.status(404).json({
        error: {
          code: "TICKET_NOT_FOUND",
          message: "Ticket not found.",
          timestamp: new Date().toISOString(),
        },
      });
    }

    const { status } = req.body;
    const validStatuses = Object.values(TicketStatus) as string[];
    if (!status || !validStatuses.includes(String(status).toUpperCase())) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_FAILED",
          message: `status must be one of ${validStatuses.join(", ")}.`,
          timestamp: new Date().toISOString(),
        },
      });
    }

    const targetStatus = String(status).toUpperCase() as TicketStatus;
    const allowed = ALLOWED_TRANSITIONS[ticket.currentStatus] || [];
    if (!allowed.includes(targetStatus)) {
      return res.status(400).json({
        error: {
          code: "INVALID_STATUS_TRANSITION",
          message: `Cannot transition ticket status from ${ticket.currentStatus} to ${targetStatus}.`,
          timestamp: new Date().toISOString(),
        },
      });
    }

    await prisma.ticket.update({
      where: { id: ticketId },
      data: { currentStatus: targetStatus },
    });

    return res.status(200).json({
      message: "Ticket status transitioned.",
      currentStatus: targetStatus,
    });
  } catch (error) {
    console.error("Failed to transition ticket status:", error);
    return res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to transition ticket status.",
        timestamp: new Date().toISOString(),
      },
    });
  }
}

// Attach middleware chain to router
staffTicketsRouter.get(
  "/",
  requireAuth,
  requirePasswordChanged,
  requireRole("IT_STAFF", "ADMINISTRATOR"),
  getStaffTickets
);

staffTicketsRouter.patch(
  "/:id/assignment",
  requireAuth,
  requirePasswordChanged,
  requireRole("IT_STAFF", "ADMINISTRATOR"),
  assignTicketOwner
);

staffTicketsRouter.patch(
  "/:id/priority",
  requireAuth,
  requirePasswordChanged,
  requireRole("IT_STAFF", "ADMINISTRATOR"),
  updateTicketPriority
);

staffTicketsRouter.patch(
  "/:id/status",
  requireAuth,
  requirePasswordChanged,
  requireRole("IT_STAFF", "ADMINISTRATOR"),
  transitionTicketStatus
);

staffTicketsRouter.get(
  "/assignees",
  requireAuth,
  requirePasswordChanged,
  requireRole("IT_STAFF", "ADMINISTRATOR"),
  async (_req: Request, res: Response) => {
    try {
      const staff = await getPrisma().user.findMany({
        where: {
          isActive: true,
          role: { in: ["IT_STAFF", "ADMINISTRATOR"] },
        },
        select: { id: true, name: true, email: true, role: true },
        orderBy: { name: "asc" },
      });
      return res.status(200).json({ assignees: staff });
    } catch (error) {
      console.error("Failed to fetch assignees:", error);
      return res.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to fetch assignees.",
          timestamp: new Date().toISOString(),
        },
      });
    }
  }
);

