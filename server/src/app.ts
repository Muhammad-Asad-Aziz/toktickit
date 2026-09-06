import express, { Request, Response } from "express";
import cors from "cors";
import { getPrisma } from "./prisma.js";
import { getRequesters } from "./routes/requesters.js";
import { getRelatedSystems } from "./routes/relatedSystems.js";
import { createTicket, getTickets, handleUploadMiddleware } from "./routes/tickets.js";

// The Express app is exported separately from app.listen() (see index.ts) so
// Supertest can import `app` without opening a port. Do not merge these files.
export const app = express();

app.use(cors());          // already wired: lets the Vite dev server call this API
app.use(express.json());

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------
app.get("/api/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok", service: "TokTickIT API" });
});

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
// Development Requesters (Feature 2)
// ---------------------------------------------------------------------------
app.get("/api/requesters", getRequesters);
app.get("/api/v1/requesters", getRequesters);

// ---------------------------------------------------------------------------
// Related Systems (Feature 2)
// ---------------------------------------------------------------------------
app.get("/api/related-systems", getRelatedSystems);
app.get("/api/v1/related-systems", getRelatedSystems);

// ---------------------------------------------------------------------------
// Create Ticket (Feature 3 / Feature 7)
// ---------------------------------------------------------------------------
app.post("/api/tickets", handleUploadMiddleware, createTicket);
app.post("/api/v1/tickets", handleUploadMiddleware, createTicket);

// ---------------------------------------------------------------------------
// My Tickets / Query Tickets (Feature 8 / Feature 4)
// ---------------------------------------------------------------------------
app.get("/api/tickets", getTickets);
app.get("/api/v1/tickets", getTickets);

export default app;

