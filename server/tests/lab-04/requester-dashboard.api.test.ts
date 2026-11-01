import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { seed } from "../../prisma/seed.js";
import { getPrisma } from "../../src/prisma.js";
import bcrypt from "bcryptjs";

describe("Issue 21: Requester Dashboard API Integration Suite", () => {
  let sompongCookie: any;
  let sompongUserId: number;
  let kittisakCookie: any;
  let kittisakUserId: number;

  beforeAll(async () => {
    await seed();
    const prisma = getPrisma();

    // 1. Authenticate Requester 1 (Sompong IT)
    const sompongLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "sompong.it@kmutt.ac.th", password: "Password123!" });
    sompongCookie = sompongLogin.headers["set-cookie"] as string | string[];
    sompongUserId = sompongLogin.body.user.id;

    // 2. Authenticate Requester 2 (Kittisak Student)
    const kittisakLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "kittisak.stu@kmutt.ac.th", password: "Password123!" });
    kittisakCookie = kittisakLogin.headers["set-cookie"] as string | string[];
    kittisakUserId = kittisakLogin.body.user.id;
  });

  it("DSH-01: Authenticated requester queries dashboard metrics strictly scoped to owned tickets (AC-21.1, BR-11, FR-04)", async () => {
    const prisma = getPrisma();
    const res = await request(app)
      .get("/api/v1/dashboards/requester")
      .set("Cookie", sompongCookie);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("metrics");
    expect(res.body).toHaveProperty("recentlyUpdatedTickets");

    const metrics = res.body.metrics;
    expect(typeof metrics.totalOpen).toBe("number");
    expect(typeof metrics.openTicketsCount).toBe("number");
    expect(metrics.openTicketsCount).toBe(metrics.totalOpen);
    expect(typeof metrics.waitingForRequester).toBe("number");
    expect(typeof metrics.waitingForRequesterCount).toBe("number");
    expect(typeof metrics.inProgress).toBe("number");
    expect(typeof metrics.resolved).toBe("number");
    expect(typeof metrics.closed).toBe("number");
    expect(typeof metrics.recentlyResolvedCount).toBe("number");

    // Authoritative database cross-check for Sompong's tickets
    const dbTotalOpen = await prisma.ticket.count({
      where: {
        requesterId: sompongUserId,
        currentStatus: { in: ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "REOPENED"] },
      },
    });
    const dbWaiting = await prisma.ticket.count({
      where: {
        requesterId: sompongUserId,
        currentStatus: "WAITING_FOR_REQUESTER",
      },
    });

    expect(metrics.totalOpen).toBe(dbTotalOpen);
    expect(metrics.waitingForRequester).toBe(dbWaiting);
  });

  it("DSH-02: Returns at most 5 owned tickets sorted strictly descending by updatedAt with strict isolation (AC-21.1, BR-11)", async () => {
    const prisma = getPrisma();
    const res = await request(app)
      .get("/api/v1/dashboards/requester")
      .set("Cookie", sompongCookie);

    expect(res.status).toBe(200);
    const tickets = res.body.recentlyUpdatedTickets;
    expect(Array.isArray(tickets)).toBe(true);
    expect(tickets.length).toBeLessThanOrEqual(5);

    // Verify ordering: newest updatedAt first
    for (let i = 0; i < tickets.length - 1; i++) {
      const currentUpdated = new Date(tickets[i].updatedAt).getTime();
      const nextUpdated = new Date(tickets[i + 1].updatedAt).getTime();
      expect(currentUpdated).toBeGreaterThanOrEqual(nextUpdated);
    }

    // Verify data isolation: every returned ticket belongs strictly to Sompong
    if (tickets.length > 0) {
      const ticketIds = tickets.map((t: any) => t.id);
      const dbTickets = await prisma.ticket.findMany({
        where: { id: { in: ticketIds } },
        select: { id: true, requesterId: true },
      });
      for (const t of dbTickets) {
        expect(t.requesterId).toBe(sompongUserId);
        expect(t.requesterId).not.toBe(kittisakUserId);
      }
    }
  });

  it("DSH-07: Unauthenticated request to requester dashboard returns 401 Unauthorized (AC-21.1, AC-21.5)", async () => {
    const res = await request(app).get("/api/v1/dashboards/requester");

    expect(res.status).toBe(401);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("DSH-08: Safe empty state fallback when requester owns zero tickets (AC-21.1, AC-15, BR-14)", async () => {
    const prisma = getPrisma();
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash("Password123!", salt);

    // Create an empty requester user with zero tickets
    const emptyRequester = await prisma.user.upsert({
      where: { email: "zero.tickets@kmutt.ac.th" },
      update: { mustChangePassword: false, isActive: true },
      create: {
        name: "Zero Tickets User",
        email: "zero.tickets@kmutt.ac.th",
        passwordHash,
        role: "REQUESTER",
        mustChangePassword: false,
        isActive: true,
      },
    });

    const loginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "zero.tickets@kmutt.ac.th", password: "Password123!" });
    const emptyCookie = loginRes.headers["set-cookie"] as string | string[];

    const res = await request(app)
      .get("/api/v1/dashboards/requester")
      .set("Cookie", emptyCookie);

    expect(res.status).toBe(200);
    expect(res.body.metrics).toEqual({
      totalOpen: 0,
      openTicketsCount: 0,
      waitingForRequester: 0,
      waitingForRequesterCount: 0,
      inProgress: 0,
      resolved: 0,
      closed: 0,
      recentlyResolvedCount: 0,
    });
    expect(res.body.recentlyUpdatedTickets).toEqual([]);
  });

  it("Supports backwards-compatible alias /api/dashboards/requester", async () => {
    const res = await request(app)
      .get("/api/dashboards/requester")
      .set("Cookie", sompongCookie);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("metrics");
  });
});

