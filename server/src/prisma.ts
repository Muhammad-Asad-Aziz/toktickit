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

function normalizeEnumValues(data: any) {
  if (!data || typeof data !== "object") return;
  if (typeof data.requestedPriority === "string") {
    data.requestedPriority = data.requestedPriority.toUpperCase();
  }
  if (typeof data.itPriority === "string") {
    data.itPriority = data.itPriority.toUpperCase();
  }
  if (typeof data.currentStatus === "string") {
    let s = data.currentStatus.toUpperCase().replace(/\s+/g, "_");
    if (s === "ASSIGNED") {
      s = "OPEN";
    }
    data.currentStatus = s;
  }
}

export function getPrisma(): PrismaClient {
  if (!client) {
    client = new PrismaClient();
    // Alias requesterUser to user for legacy test compatibility
    (client as any).requesterUser = (client as any).user;

    client.$use(async (params, next) => {
      if (params.model === "Ticket") {
        if (params.args?.data) {
          if (Array.isArray(params.args.data)) {
            params.args.data.forEach(normalizeEnumValues);
          } else {
            normalizeEnumValues(params.args.data);
          }
        }
        if (params.args?.where) {
          if (typeof params.args.where.requestedPriority === "string") {
            params.args.where.requestedPriority = params.args.where.requestedPriority.toUpperCase();
          }
          if (typeof params.args.where.itPriority === "string") {
            params.args.where.itPriority = params.args.where.itPriority.toUpperCase();
          }
          if (typeof params.args.where.currentStatus === "string") {
            params.args.where.currentStatus = params.args.where.currentStatus.toUpperCase().replace(/\s+/g, "_");
          }
        }
      }
      return next(params);
    });
  }
  return client;
}
