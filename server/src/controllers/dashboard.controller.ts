import { Request, Response } from "express";
import { getPrisma } from "../prisma.js";
import { Priority, TicketStatus } from "@prisma/client";

/**
 * GET /api/v1/dashboards/requester
 * Scoped personal operational metrics and recently updated tickets for authenticated requesters.
 * Data Isolation: tickets where requesterId === req.user.id (BR-11, BR-14, AC-21.1).
 */
export async function getRequesterDashboard(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: {
          code: "UNAUTHENTICATED",
          message: "Authentication required.",
          timestamp: new Date().toISOString(),
        },
      });
    }

    const requesterId = req.user.id;
    const prisma = getPrisma();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [statusGroups, recentlyResolvedCount, recentlyUpdatedTickets] = await Promise.all([
      // Group ticket counts by currentStatus for this requester
      prisma.ticket.groupBy({
        by: ["currentStatus"],
        where: { requesterId },
        _count: { _all: true },
      }),
      // Count tickets resolved or closed within last 30 calendar days
      prisma.ticket.count({
        where: {
          requesterId,
          currentStatus: { in: [TicketStatus.RESOLVED, TicketStatus.CLOSED] },
          updatedAt: { gte: thirtyDaysAgo },
        },
      }),
      // Top 5 most recently updated tickets owned by this requester
      prisma.ticket.findMany({
        where: { requesterId },
        orderBy: { updatedAt: "desc" },
        take: 5,
        select: {
          id: true,
          ticketNumber: true,
          summary: true,
          currentStatus: true,
          requestedPriority: true,
          itPriority: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
    ]);

    // Map status groups into individual counter variables
    const statusCounts: Record<string, number> = {};
    for (const group of statusGroups) {
      if (group.currentStatus) {
        statusCounts[group.currentStatus] = group._count._all;
      }
    }

    const waitingForRequester = statusCounts[TicketStatus.WAITING_FOR_REQUESTER] || 0;
    const inProgress = statusCounts[TicketStatus.IN_PROGRESS] || 0;
    const resolved = statusCounts[TicketStatus.RESOLVED] || 0;
    const closed = statusCounts[TicketStatus.CLOSED] || 0;
    const newCount = statusCounts[TicketStatus.NEW] || 0;
    const openCount = statusCounts[TicketStatus.OPEN] || 0;
    const reopened = statusCounts[TicketStatus.REOPENED] || 0;

    // totalOpen includes all non-terminal active tickets: NEW, OPEN, IN_PROGRESS, WAITING_FOR_REQUESTER, REOPENED
    const totalOpen = newCount + openCount + inProgress + waitingForRequester + reopened;

    const metrics = {
      totalOpen,
      openTicketsCount: totalOpen,
      waitingForRequester,
      waitingForRequesterCount: waitingForRequester,
      inProgress,
      resolved,
      closed,
      recentlyResolvedCount,
    };

    return res.status(200).json({
      metrics,
      recentlyUpdatedTickets,
    });
  } catch (error) {
    console.error("Error fetching requester dashboard:", error);
    return res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to fetch requester dashboard metrics.",
        timestamp: new Date().toISOString(),
      },
    });
  }
}

/**
 * Shared aggregation helper to fetch staff queue metrics and recent queue tickets.
 */
async function fetchStaffQueueAggregates(staffUserId: number) {
  const prisma = getPrisma();
  const activeStatuses: TicketStatus[] = [
    TicketStatus.NEW,
    TicketStatus.OPEN,
    TicketStatus.IN_PROGRESS,
    TicketStatus.WAITING_FOR_REQUESTER,
    TicketStatus.REOPENED,
  ];

  const [
    statusGroups,
    activePriorityGroups,
    unassignedCount,
    myAssignedCount,
    recentlyUpdatedTickets,
  ] = await Promise.all([
    // Group counts across all 8 statuses
    prisma.ticket.groupBy({
      by: ["currentStatus"],
      _count: { _all: true },
    }),
    // Group active tickets by itPriority
    prisma.ticket.groupBy({
      by: ["itPriority"],
      where: { currentStatus: { in: activeStatuses } },
      _count: { _all: true },
    }),
    // Count active unassigned tickets (ownerId === null)
    prisma.ticket.count({
      where: {
        ownerId: null,
        currentStatus: { in: activeStatuses },
      },
    }),
    // Count active tickets owned by the current staff member
    prisma.ticket.count({
      where: {
        ownerId: staffUserId,
        currentStatus: { in: activeStatuses },
      },
    }),
    // Top 5 most recently updated active queue tickets
    prisma.ticket.findMany({
      where: { currentStatus: { in: activeStatuses } },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: {
        id: true,
        ticketNumber: true,
        summary: true,
        currentStatus: true,
        itPriority: true,
        owner: {
          select: {
            id: true,
            name: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    }),
  ]);

  // Map 8 status counts
  const statusCounts: Record<string, number> = {
    NEW: 0,
    OPEN: 0,
    IN_PROGRESS: 0,
    WAITING_FOR_REQUESTER: 0,
    RESOLVED: 0,
    CLOSED: 0,
    REOPENED: 0,
    CANCELLED: 0,
  };
  for (const group of statusGroups) {
    if (group.currentStatus) {
      statusCounts[group.currentStatus] = group._count._all;
    }
  }

  // Map 4 active priority counts
  const priorityCounts: Record<string, number> = {
    URGENT: 0,
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
  };
  for (const group of activePriorityGroups) {
    if (group.itPriority) {
      priorityCounts[group.itPriority] = group._count._all;
    }
  }

  const newCount = statusCounts.NEW;
  const openCount = statusCounts.OPEN;
  const inProgressCount = statusCounts.IN_PROGRESS;
  const waitingForRequesterCount = statusCounts.WAITING_FOR_REQUESTER;
  const totalActiveTicketsCount =
    statusCounts.NEW +
    statusCounts.OPEN +
    statusCounts.IN_PROGRESS +
    statusCounts.WAITING_FOR_REQUESTER +
    statusCounts.REOPENED;

  const metrics = {
    newCount,
    openCount,
    inProgressCount,
    waitingForRequesterCount,
    myAssignedCount,
    myOwnedTicketsCount: myAssignedCount,
    unassignedCount,
    unassignedTicketsCount: unassignedCount,
    totalActiveTicketsCount,
    statusCounts,
    priorityCounts,
  };

  return { metrics, recentlyUpdatedTickets };
}

/**
 * GET /api/v1/dashboards/staff
 * Global operational queue metrics and recent queue tickets across the service desk.
 * Role Guard: IT_STAFF and ADMINISTRATOR only (BR-12, AC-21.2).
 */
export async function getStaffDashboard(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: {
          code: "UNAUTHENTICATED",
          message: "Authentication required.",
          timestamp: new Date().toISOString(),
        },
      });
    }

    if (req.user.role !== "IT_STAFF" && req.user.role !== "ADMINISTRATOR") {
      return res.status(403).json({
        error: {
          code: "FORBIDDEN",
          message: "You do not have permission to access staff dashboard.",
          timestamp: new Date().toISOString(),
        },
      });
    }

    const { metrics, recentlyUpdatedTickets } = await fetchStaffQueueAggregates(req.user.id);

    return res.status(200).json({
      metrics,
      recentlyUpdatedTickets,
    });
  } catch (error) {
    console.error("Error fetching staff dashboard:", error);
    return res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to fetch staff dashboard metrics.",
        timestamp: new Date().toISOString(),
      },
    });
  }
}

/**
 * GET /api/v1/dashboards/admin
 * Operational staff queue metrics plus system-wide administrative account tallies.
 * Role Guard: ADMINISTRATOR only (BR-13, AC-21.3).
 */
export async function getAdminDashboard(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: {
          code: "UNAUTHENTICATED",
          message: "Authentication required.",
          timestamp: new Date().toISOString(),
        },
      });
    }

    if (req.user.role !== "ADMINISTRATOR") {
      return res.status(403).json({
        error: {
          code: "FORBIDDEN",
          message: "Administrator role required to access administrative dashboard.",
          timestamp: new Date().toISOString(),
        },
      });
    }

    const prisma = getPrisma();

    const [staffData, userRoleGroups, activeUsersCount, inactiveUsersCount, totalTicketsCount] =
      await Promise.all([
        fetchStaffQueueAggregates(req.user.id),
        prisma.user.groupBy({
          by: ["role"],
          _count: { _all: true },
        }),
        prisma.user.count({ where: { isActive: true } }),
        prisma.user.count({ where: { isActive: false } }),
        prisma.ticket.count(),
      ]);

    const usersByRole: Record<string, number> = {
      REQUESTER: 0,
      IT_STAFF: 0,
      ADMINISTRATOR: 0,
    };
    for (const group of userRoleGroups) {
      if (group.role) {
        usersByRole[group.role] = group._count._all;
      }
    }

    const requestersCount = usersByRole.REQUESTER || 0;
    const staffCount = usersByRole.IT_STAFF || 0;
    const adminCount = usersByRole.ADMINISTRATOR || 0;
    const totalUsers = activeUsersCount + inactiveUsersCount;

    const adminMetrics = {
      totalUsers,
      activeUsers: activeUsersCount,
      activeUsersCount,
      inactiveUsersCount,
      requestersCount,
      staffCount,
      adminCount,
      usersByRole,
      totalTicketsCount,
    };

    return res.status(200).json({
      staffMetrics: staffData.metrics,
      metrics: staffData.metrics, // alias for convenience
      adminMetrics,
      recentlyUpdatedTickets: staffData.recentlyUpdatedTickets,
    });
  } catch (error) {
    console.error("Error fetching admin dashboard:", error);
    return res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to fetch admin dashboard metrics.",
        timestamp: new Date().toISOString(),
      },
    });
  }
}

