import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { seed } from "../../prisma/seed.js";
import { getPrisma } from "../../src/prisma.js";

describe("Issue 21: Staff & Admin Dashboard API Integration Suite", () => {
  let staffCookie: any;
  let staffUserId: number;
  let adminCookie: any;
  let adminUserId: number;
  let requesterCookie: any;
  let requesterUserId: number;

  beforeAll(async () => {
    await seed();
    const prisma = getPrisma();

    // 1. Authenticate IT Staff (Wichai IT)
    const staffLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "wichai.it@kmutt.ac.th", password: "Password123!" });
    staffCookie = staffLogin.headers["set-cookie"] as string | string[];
    staffUserId = staffLogin.body.user.id;

    // 2. Authenticate Administrator (Admin TokTick)
    const adminLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "admin.toktick@kmutt.ac.th", password: "Password123!" });
    adminCookie = adminLogin.headers["set-cookie"] as string | string[];
    adminUserId = adminLogin.body.user.id;

    // 3. Authenticate Requester (Sompong IT)
    const requesterLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "sompong.it@kmutt.ac.th", password: "Password123!" });
    requesterCookie = requesterLogin.headers["set-cookie"] as string | string[];
    requesterUserId = requesterLogin.body.user.id;
  });

  it("DSH-03: IT Staff queries global operational queue metrics and distributions (AC-21.2, BR-12, FR-04)", async () => {
    const prisma = getPrisma();
    const res = await request(app)
      .get("/api/v1/dashboards/staff")
      .set("Cookie", staffCookie);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("metrics");
    expect(res.body).toHaveProperty("recentlyUpdatedTickets");

    const metrics = res.body.metrics;
    expect(typeof metrics.newCount).toBe("number");
    expect(typeof metrics.openCount).toBe("number");
    expect(typeof metrics.inProgressCount).toBe("number");
    expect(typeof metrics.waitingForRequesterCount).toBe("number");
    expect(typeof metrics.unassignedCount).toBe("number");
    expect(typeof metrics.myAssignedCount).toBe("number");
    expect(typeof metrics.totalActiveTicketsCount).toBe("number");

    // Verify 8 status counts structure
    expect(metrics.statusCounts).toBeDefined();
    const expectedStatuses = [
      "NEW",
      "OPEN",
      "IN_PROGRESS",
      "WAITING_FOR_REQUESTER",
      "RESOLVED",
      "CLOSED",
      "REOPENED",
      "CANCELLED",
    ];
    for (const st of expectedStatuses) {
      expect(typeof metrics.statusCounts[st]).toBe("number");
    }

    // Verify 4 priority counts structure
    expect(metrics.priorityCounts).toBeDefined();
    const expectedPriorities = ["URGENT", "HIGH", "MEDIUM", "LOW"];
    for (const pr of expectedPriorities) {
      expect(typeof metrics.priorityCounts[pr]).toBe("number");
    }

    // Database cross-check for unassigned and myAssigned active tickets
    const activeStatuses = ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "REOPENED"];
    const dbUnassigned = await prisma.ticket.count({
      where: {
        ownerId: null,
        currentStatus: { in: activeStatuses },
      },
    });
    const dbMyAssigned = await prisma.ticket.count({
      where: {
        ownerId: staffUserId,
        currentStatus: { in: activeStatuses },
      },
    });

    expect(metrics.unassignedCount).toBe(dbUnassigned);
    expect(metrics.myAssignedCount).toBe(dbMyAssigned);

    // Verify recently updated queue tickets
    const recent = res.body.recentlyUpdatedTickets;
    expect(Array.isArray(recent)).toBe(true);
    expect(recent.length).toBeLessThanOrEqual(5);
    for (const t of recent) {
      expect(t).toHaveProperty("id");
      expect(t).toHaveProperty("ticketNumber");
      expect(t).toHaveProperty("currentStatus");
      expect(activeStatuses).toContain(t.currentStatus);
    }
  });

  it("DSH-04: Requester attempting to access staff dashboard receives 403 Forbidden (AC-21.2, BR-12)", async () => {
    const res = await request(app)
      .get("/api/v1/dashboards/staff")
      .set("Cookie", requesterCookie);

    expect(res.status).toBe(403);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("DSH-05: Administrator queries admin dashboard receiving staff metrics + system statistics (AC-21.3, BR-13, FR-04)", async () => {
    const prisma = getPrisma();
    const res = await request(app)
      .get("/api/v1/dashboards/admin")
      .set("Cookie", adminCookie);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("staffMetrics");
    expect(res.body).toHaveProperty("adminMetrics");
    expect(res.body).toHaveProperty("recentlyUpdatedTickets");

    const adminMetrics = res.body.adminMetrics;
    expect(typeof adminMetrics.totalUsers).toBe("number");
    expect(typeof adminMetrics.activeUsers).toBe("number");
    expect(typeof adminMetrics.inactiveUsersCount).toBe("number");
    expect(typeof adminMetrics.requestersCount).toBe("number");
    expect(typeof adminMetrics.staffCount).toBe("number");
    expect(typeof adminMetrics.adminCount).toBe("number");
    expect(typeof adminMetrics.totalTicketsCount).toBe("number");

    // Cross-check usersByRole
    expect(adminMetrics.usersByRole).toBeDefined();
    expect(typeof adminMetrics.usersByRole.REQUESTER).toBe("number");
    expect(typeof adminMetrics.usersByRole.IT_STAFF).toBe("number");
    expect(typeof adminMetrics.usersByRole.ADMINISTRATOR).toBe("number");

    // Database verification
    const dbTotalUsers = await prisma.user.count();
    const dbTotalTickets = await prisma.ticket.count();
    expect(adminMetrics.totalUsers).toBe(dbTotalUsers);
    expect(adminMetrics.totalTicketsCount).toBe(dbTotalTickets);
  });

  it("DSH-06: IT Staff member attempting to access admin dashboard receives 403 Forbidden (AC-21.3, BR-13)", async () => {
    const res = await request(app)
      .get("/api/v1/dashboards/admin")
      .set("Cookie", staffCookie);

    expect(res.status).toBe(403);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("Unauthenticated request to staff or admin dashboard returns 401 Unauthorized", async () => {
    const resStaff = await request(app).get("/api/v1/dashboards/staff");
    expect(resStaff.status).toBe(401);
    expect(resStaff.body.error.code).toBe("UNAUTHENTICATED");

    const resAdmin = await request(app).get("/api/v1/dashboards/admin");
    expect(resAdmin.status).toBe(401);
    expect(resAdmin.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("Administrator can also query staff dashboard directly (AC-21.2)", async () => {
    const res = await request(app)
      .get("/api/v1/dashboards/staff")
      .set("Cookie", adminCookie);

    expect(res.status).toBe(200);
    expect(res.body.metrics).toBeDefined();
  });
});

