import { PrismaClient } from "@prisma/client";

// Backwards compatibility for Lab 2 test suites that referenced prisma.requesterUser
declare module "@prisma/client" {
  interface PrismaClient {
    requesterUser: PrismaClient["user"];
  }
}

// Lazy singleton: the client is created on first use, not at import time.
// This keeps route modules and tests that don't touch the DB (e.g. /api/health)
// free of database side effects.
let client: PrismaClient | null = null;

export function getPrisma(): PrismaClient {
  if (!client) {
    client = new PrismaClient();
    // Alias requesterUser to user for legacy test compatibility
    (client as any).requesterUser = (client as any).user;
  }
  return client;
}
