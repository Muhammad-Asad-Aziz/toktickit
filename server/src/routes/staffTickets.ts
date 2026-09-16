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

// Attach middleware chain to router
staffTicketsRouter.get(
  "/",
  requireAuth,
  requirePasswordChanged,
  requireRole("IT_STAFF", "ADMINISTRATOR"),
  getStaffTickets
);
