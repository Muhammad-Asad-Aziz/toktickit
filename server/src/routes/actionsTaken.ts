import { Router, Request, Response } from "express";
import { getPrisma } from "../prisma.js";

export const actionsTakenRouter = Router({ mergeParams: true });

/**
 * POST /api/v1/tickets/:id/actions-taken
 * Create a new Action Taken line item under a ticket.
 * Role Guard: IT_STAFF and ADMINISTRATOR only.
 */
export async function createActionTaken(req: Request, res: Response) {
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
          message: "You do not have permission to log actions taken.",
          timestamp: new Date().toISOString(),
        },
      });
    }

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
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      select: { id: true },
    });

    if (!ticket) {
      return res.status(404).json({
        error: {
          code: "TICKET_NOT_FOUND",
          message: "Ticket not found.",
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Auto-derived performer: strictly derived from session (BR-02, BR-06)
    const performedById = req.user.id;

    // 1. Validate actionDateTime
    let actionDateTime = new Date();
    if (req.body.actionDateTime !== undefined && req.body.actionDateTime !== null) {
      const parsedDate = new Date(req.body.actionDateTime);
      if (isNaN(parsedDate.getTime())) {
        return res.status(400).json({
          error: {
            code: "VALIDATION_FAILED",
            message: "Invalid action date/time format.",
            fieldErrors: [{ field: "actionDateTime", message: "Invalid action date/time format." }],
            timestamp: new Date().toISOString(),
          },
        });
      }
      if (parsedDate.getTime() > Date.now()) {
        return res.status(400).json({
          error: {
            code: "VALIDATION_FAILED",
            message: "Action date/time cannot be in the future.",
            fieldErrors: [{ field: "actionDateTime", message: "Action date/time cannot be in the future." }],
            timestamp: new Date().toISOString(),
          },
        });
      }
      actionDateTime = parsedDate;
    }

    // 2. Validate actionDescription (5 to 1000 characters)
    const rawDesc = typeof req.body.actionDescription === "string" ? req.body.actionDescription.trim() : "";
    if (!rawDesc || rawDesc.length < 5 || rawDesc.length > 1000) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_FAILED",
          message: "Action description must be between 5 and 1000 characters.",
          fieldErrors: [{ field: "actionDescription", message: "Action description must be between 5 and 1000 characters." }],
          timestamp: new Date().toISOString(),
        },
      });
    }

    // 3. Validate result (2 to 1000 characters)
    const rawResult = typeof req.body.result === "string" ? req.body.result.trim() : "";
    if (!rawResult || rawResult.length < 2 || rawResult.length > 1000) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_FAILED",
          message: "Result must be between 2 and 1000 characters.",
          fieldErrors: [{ field: "result", message: "Result must be between 2 and 1000 characters." }],
          timestamp: new Date().toISOString(),
        },
      });
    }

    // 4. Validate followUpRequired (boolean)
    if (typeof req.body.followUpRequired !== "boolean") {
      return res.status(400).json({
        error: {
          code: "VALIDATION_FAILED",
          message: "Follow-up required must be a boolean.",
          fieldErrors: [{ field: "followUpRequired", message: "Follow-up required must be a boolean." }],
          timestamp: new Date().toISOString(),
        },
      });
    }
    const followUpRequired = req.body.followUpRequired;

    // 5. Validate followUpNote conditionally (BR-05)
    let followUpNote: string | null = null;
    if (followUpRequired) {
      const rawNote = typeof req.body.followUpNote === "string" ? req.body.followUpNote.trim() : "";
      if (!rawNote || rawNote.length < 3 || rawNote.length > 1000) {
        return res.status(400).json({
          error: {
            code: "VALIDATION_FAILED",
            message: "Follow-up note is required when follow-up is needed (3-1000 characters).",
            fieldErrors: [
              {
                field: "followUpNote",
                message: "Follow-up note is required when follow-up is needed (3-1000 characters).",
              },
            ],
            timestamp: new Date().toISOString(),
          },
        });
      }
      followUpNote = rawNote;
    }

    // 6. Validate attachmentNotes (optional, max 500 characters)
    let attachmentNotes: string | null = null;
    if (req.body.attachmentNotes !== undefined && req.body.attachmentNotes !== null) {
      const rawAttNotes = typeof req.body.attachmentNotes === "string" ? req.body.attachmentNotes.trim() : "";
      if (rawAttNotes.length > 500) {
        return res.status(400).json({
          error: {
            code: "VALIDATION_FAILED",
            message: "Attachment notes cannot exceed 500 characters.",
            fieldErrors: [{ field: "attachmentNotes", message: "Attachment notes cannot exceed 500 characters." }],
            timestamp: new Date().toISOString(),
          },
        });
      }
      attachmentNotes = rawAttNotes.length > 0 ? rawAttNotes : null;
    }

    const actionTaken = await prisma.actionTaken.create({
      data: {
        ticketId,
        actionDateTime,
        actionDescription: rawDesc,
        result: rawResult,
        performedById,
        followUpRequired,
        followUpNote,
        attachmentNotes,
      },
      include: {
        performedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return res.status(201).json({
      actionTaken: {
        id: actionTaken.id,
        ticketId: actionTaken.ticketId,
        actionDateTime: actionTaken.actionDateTime.toISOString(),
        actionDescription: actionTaken.actionDescription,
        result: actionTaken.result,
        followUpRequired: actionTaken.followUpRequired,
        followUpNote: actionTaken.followUpNote,
        attachmentNotes: actionTaken.attachmentNotes,
        performedBy: actionTaken.performedBy,
        createdAt: actionTaken.createdAt.toISOString(),
        updatedAt: actionTaken.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Failed to create action taken:", error);
    return res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to create action taken.",
        timestamp: new Date().toISOString(),
      },
    });
  }
}

/**
 * GET /api/v1/tickets/:id/actions-taken
 * List all Action Taken line items for a ticket sorted chronologically ascending.
 * Role Guard: IT_STAFF / ADMINISTRATOR on all tickets; REQUESTER on owned tickets only.
 */
export async function getActionsTaken(req: Request, res: Response) {
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
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      select: { id: true, requesterId: true },
    });

    if (!ticket) {
      return res.status(404).json({
        error: {
          code: "TICKET_NOT_FOUND",
          message: "Ticket not found.",
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Role check: Requesters can only access owned tickets (BR-03)
    if (req.user.role === "REQUESTER" && ticket.requesterId !== req.user.id) {
      return res.status(403).json({
        error: {
          code: "FORBIDDEN",
          message: "You do not have permission to view actions for this ticket.",
          timestamp: new Date().toISOString(),
        },
      });
    }

    const actions = await prisma.actionTaken.findMany({
      where: { ticketId },
      orderBy: { actionDateTime: "asc" },
      include: {
        performedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return res.status(200).json({
      actionsTaken: actions.map((a) => ({
        id: a.id,
        ticketId: a.ticketId,
        actionDateTime: a.actionDateTime.toISOString(),
        actionDescription: a.actionDescription,
        result: a.result,
        followUpRequired: a.followUpRequired,
        followUpNote: a.followUpNote,
        attachmentNotes: a.attachmentNotes,
        performedBy: a.performedBy,
        createdAt: a.createdAt.toISOString(),
        updatedAt: a.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Failed to list actions taken:", error);
    return res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to list actions taken.",
        timestamp: new Date().toISOString(),
      },
    });
  }
}

/**
 * PUT /api/v1/tickets/:id/actions-taken/:actionId
 * Update an existing Action Taken record. Performer is immutable (BR-06).
 * Role Guard: IT_STAFF and ADMINISTRATOR only.
 */
export async function updateActionTaken(req: Request, res: Response) {
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
          message: "You do not have permission to update actions taken.",
          timestamp: new Date().toISOString(),
        },
      });
    }

    const ticketId = parseInt(req.params.id, 10);
    const actionId = parseInt(req.params.actionId, 10);

    if (isNaN(ticketId) || ticketId <= 0 || isNaN(actionId) || actionId <= 0) {
      return res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Action taken or ticket not found.",
          timestamp: new Date().toISOString(),
        },
      });
    }

    const prisma = getPrisma();
    const existingAction = await prisma.actionTaken.findFirst({
      where: { id: actionId, ticketId },
    });

    if (!existingAction) {
      return res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Action taken record not found.",
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Optimistic Concurrency Check (BR-10)
    if (req.body.versionTimestamp !== undefined && req.body.versionTimestamp !== null) {
      const clientTime = new Date(req.body.versionTimestamp).getTime();
      const serverTime = existingAction.updatedAt.getTime();
      if (isNaN(clientTime) || clientTime !== serverTime) {
        return res.status(409).json({
          error: {
            code: "STALE_RECORD_CONFLICT",
            message: "The action taken record was modified by another user. Please reload the ticket.",
            timestamp: new Date().toISOString(),
          },
        });
      }
    }

    // 1. Validate actionDateTime
    let actionDateTime = existingAction.actionDateTime;
    if (req.body.actionDateTime !== undefined && req.body.actionDateTime !== null) {
      const parsedDate = new Date(req.body.actionDateTime);
      if (isNaN(parsedDate.getTime())) {
        return res.status(400).json({
          error: {
            code: "VALIDATION_FAILED",
            message: "Invalid action date/time format.",
            fieldErrors: [{ field: "actionDateTime", message: "Invalid action date/time format." }],
            timestamp: new Date().toISOString(),
          },
        });
      }
      if (parsedDate.getTime() > Date.now()) {
        return res.status(400).json({
          error: {
            code: "VALIDATION_FAILED",
            message: "Action date/time cannot be in the future.",
            fieldErrors: [{ field: "actionDateTime", message: "Action date/time cannot be in the future." }],
            timestamp: new Date().toISOString(),
          },
        });
      }
      actionDateTime = parsedDate;
    }

    // 2. Validate actionDescription (5 to 1000 characters)
    const rawDesc = typeof req.body.actionDescription === "string" ? req.body.actionDescription.trim() : "";
    if (!rawDesc || rawDesc.length < 5 || rawDesc.length > 1000) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_FAILED",
          message: "Action description must be between 5 and 1000 characters.",
          fieldErrors: [{ field: "actionDescription", message: "Action description must be between 5 and 1000 characters." }],
          timestamp: new Date().toISOString(),
        },
      });
    }

    // 3. Validate result (2 to 1000 characters)
    const rawResult = typeof req.body.result === "string" ? req.body.result.trim() : "";
    if (!rawResult || rawResult.length < 2 || rawResult.length > 1000) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_FAILED",
          message: "Result must be between 2 and 1000 characters.",
          fieldErrors: [{ field: "result", message: "Result must be between 2 and 1000 characters." }],
          timestamp: new Date().toISOString(),
        },
      });
    }

    // 4. Validate followUpRequired (boolean)
    if (typeof req.body.followUpRequired !== "boolean") {
      return res.status(400).json({
        error: {
          code: "VALIDATION_FAILED",
          message: "Follow-up required must be a boolean.",
          fieldErrors: [{ field: "followUpRequired", message: "Follow-up required must be a boolean." }],
          timestamp: new Date().toISOString(),
        },
      });
    }
    const followUpRequired = req.body.followUpRequired;

    // 5. Validate followUpNote conditionally (BR-05)
    let followUpNote: string | null = null;
    if (followUpRequired) {
      const rawNote = typeof req.body.followUpNote === "string" ? req.body.followUpNote.trim() : "";
      if (!rawNote || rawNote.length < 3 || rawNote.length > 1000) {
        return res.status(400).json({
          error: {
            code: "VALIDATION_FAILED",
            message: "Follow-up note is required when follow-up is needed (3-1000 characters).",
            fieldErrors: [
              {
                field: "followUpNote",
                message: "Follow-up note is required when follow-up is needed (3-1000 characters).",
              },
            ],
            timestamp: new Date().toISOString(),
          },
        });
      }
      followUpNote = rawNote;
    }

    // 6. Validate attachmentNotes (optional, max 500 characters)
    let attachmentNotes: string | null = null;
    if (req.body.attachmentNotes !== undefined && req.body.attachmentNotes !== null) {
      const rawAttNotes = typeof req.body.attachmentNotes === "string" ? req.body.attachmentNotes.trim() : "";
      if (rawAttNotes.length > 500) {
        return res.status(400).json({
          error: {
            code: "VALIDATION_FAILED",
            message: "Attachment notes cannot exceed 500 characters.",
            fieldErrors: [{ field: "attachmentNotes", message: "Attachment notes cannot exceed 500 characters." }],
            timestamp: new Date().toISOString(),
          },
        });
      }
      attachmentNotes = rawAttNotes.length > 0 ? rawAttNotes : null;
    }

    // Update with immutable performedById (BR-06)
    const updated = await prisma.actionTaken.update({
      where: { id: actionId },
      data: {
        actionDateTime,
        actionDescription: rawDesc,
        result: rawResult,
        followUpRequired,
        followUpNote,
        attachmentNotes,
      },
      include: {
        performedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return res.status(200).json({
      actionTaken: {
        id: updated.id,
        ticketId: updated.ticketId,
        actionDateTime: updated.actionDateTime.toISOString(),
        actionDescription: updated.actionDescription,
        result: updated.result,
        followUpRequired: updated.followUpRequired,
        followUpNote: updated.followUpNote,
        attachmentNotes: updated.attachmentNotes,
        performedBy: updated.performedBy,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Failed to update action taken:", error);
    return res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to update action taken.",
        timestamp: new Date().toISOString(),
      },
    });
  }
}

// Router dispatch table
actionsTakenRouter.post("/", createActionTaken);
actionsTakenRouter.get("/", getActionsTaken);
actionsTakenRouter.put("/:actionId", updateActionTaken);

