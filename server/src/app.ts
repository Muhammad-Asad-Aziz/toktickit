import express, { Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { getPrisma } from "./prisma.js";
import { authRouter } from "./routes/auth.js";
import { authenticateUser, requirePasswordChanged } from "./middleware/auth.js";
import { getRequesters } from "./routes/requesters.js";
import { getRelatedSystems } from "./routes/relatedSystems.js";
import {
  createTicket,
  getTickets,
  getTicketById,
  uploadAttachment,
  downloadAttachment,
  removeAttachment,
  handleUploadMiddleware,
  handleSingleUploadMiddleware,
  indicateProblemResolved,
  appendPublicComment,
  appendInternalNote,
} from "./routes/tickets.js";
import { staffTicketsRouter } from "./routes/staffTickets.js";
import { adminUsersRouter } from "./routes/adminUsers.js";

// The Express app is exported separately from app.listen() (see index.ts) so
// Supertest can import `app` without opening a port. Do not merge these files.
export const app = express();

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json());
app.use(authenticateUser);

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------
app.get("/api/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok", service: "TokTickIT API" });
});

// ---------------------------------------------------------------------------
// Authentication APIs (Lab 3 Feature 12)
// ---------------------------------------------------------------------------
app.use("/api/v1/auth", authRouter);
app.use("/api/auth", authRouter);

// ---------------------------------------------------------------------------
// Staff Ticket Queue (Lab 3 Feature 13)
// ---------------------------------------------------------------------------
app.use("/api/v1/staff/tickets", staffTicketsRouter);
app.use("/api/staff/tickets", staffTicketsRouter);

// ---------------------------------------------------------------------------
// Administrator User Management (Lab 3 Feature 15)
// ---------------------------------------------------------------------------
app.use("/api/v1/admin/users", adminUsersRouter);
app.use("/api/admin/users", adminUsersRouter);

// ---------------------------------------------------------------------------
// Category list (Lab 1 backwards compatible + Lab 2 v1 endpoint)
// ---------------------------------------------------------------------------
app.get("/api/categories", async (_req: Request, res: Response) => {
  try {
    const categories = await getPrisma().category.findMany({
      select: { id: true, name: true },
      orderBy: { id: "asc" },
    });
    res.status(200).json(categories);
  } catch {
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

app.get("/api/v1/categories", async (_req: Request, res: Response) => {
  try {
    const categories = await getPrisma().category.findMany({
      where: { isActive: true },
      select: { id: true, code: true, name: true, description: true, isActive: true },
      orderBy: { id: "asc" },
    });
    res.status(200).json(categories);
  } catch {
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

// ---------------------------------------------------------------------------
// Development Requesters (Feature 2 - Lab 2 Backwards Compatibility)
// ---------------------------------------------------------------------------
app.get("/api/requesters", getRequesters);
app.get("/api/v1/requesters", getRequesters);

// ---------------------------------------------------------------------------
// Related Systems (Feature 2)
// ---------------------------------------------------------------------------
app.get("/api/related-systems", getRelatedSystems);
app.get("/api/v1/related-systems", getRelatedSystems);

// ---------------------------------------------------------------------------
// Create Ticket (Feature 3 / Feature 7 / Lab 3: guarded by requirePasswordChanged)
// ---------------------------------------------------------------------------
app.post("/api/tickets", requirePasswordChanged, handleUploadMiddleware, createTicket);
app.post("/api/v1/tickets", requirePasswordChanged, handleUploadMiddleware, createTicket);

// ---------------------------------------------------------------------------
// My Tickets / Query Tickets (Feature 8 / Feature 4)
// ---------------------------------------------------------------------------
app.get("/api/tickets", requirePasswordChanged, getTickets);
app.get("/api/v1/tickets", requirePasswordChanged, getTickets);

// ---------------------------------------------------------------------------
// Ticket Detail & Attachments (Feature 9 / Feature 5)
// ---------------------------------------------------------------------------
app.get("/api/tickets/:id", requirePasswordChanged, getTicketById);
app.get("/api/v1/tickets/:id", requirePasswordChanged, getTicketById);

app.post("/api/tickets/:id/attachments", requirePasswordChanged, handleSingleUploadMiddleware, uploadAttachment);
app.post("/api/v1/tickets/:id/attachments", requirePasswordChanged, handleSingleUploadMiddleware, uploadAttachment);

app.get("/api/attachments/:id/download", requirePasswordChanged, downloadAttachment);
app.get("/api/v1/attachments/:id/download", requirePasswordChanged, downloadAttachment);

app.delete("/api/attachments/:id", requirePasswordChanged, removeAttachment);
app.delete("/api/v1/attachments/:id", requirePasswordChanged, removeAttachment);

// ---------------------------------------------------------------------------
// Ticket Operational Actions & Collaboration (Issue 14)
// ---------------------------------------------------------------------------
app.post("/api/tickets/:id/resolve-request", requirePasswordChanged, indicateProblemResolved);
app.post("/api/v1/tickets/:id/resolve-request", requirePasswordChanged, indicateProblemResolved);

app.post("/api/tickets/:id/comments", requirePasswordChanged, appendPublicComment);
app.post("/api/v1/tickets/:id/comments", requirePasswordChanged, appendPublicComment);

app.post("/api/tickets/:id/notes", requirePasswordChanged, appendInternalNote);
app.post("/api/v1/tickets/:id/notes", requirePasswordChanged, appendInternalNote);

export default app;
