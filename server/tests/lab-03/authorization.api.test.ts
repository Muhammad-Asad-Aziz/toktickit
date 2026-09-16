import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { seed } from "../../prisma/seed.js";
import { getPrisma } from "../../src/prisma.js";

describe("Staff Ticket Detail Security and Authorization API Suite (Issue 14)", () => {
  let staffCookie: string[];
  let requester1Cookie: string[];
  let requester1Id: number;
  let requester2Cookie: string[];
  let requester2Id: number;

  let ticketOwnedByReq1: number;
  let ticketOwnedByReq2: number;

  beforeAll(async () => {
    await seed();
    const prisma = getPrisma();

    // Authenticate IT Staff (Wichai)
    const staffLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "wichai.it@kmutt.ac.th", password: "Password123!" });
    staffCookie = staffLogin.headers["set-cookie"];

    // Authenticate Requester 1 (Sompong)
    const req1Login = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "sompong.it@kmutt.ac.th", password: "Password123!" });
    requester1Cookie = req1Login.headers["set-cookie"];
    requester1Id = req1Login.body.user.id;

    // Authenticate Requester 2 (Anong)
    const req2Login = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "anong.sta@kmutt.ac.th", password: "Password123!" });
    requester2Cookie = req2Login.headers["set-cookie"];
    requester2Id = req2Login.body.user.id;

    // Get or create tickets owned by Requester 1 and Requester 2
    let t1 = await prisma.ticket.findFirst({ where: { requesterId: requester1Id } });
    if (!t1) {
      t1 = await prisma.ticket.create({
        data: {
          ticketNumber: "TKT-2026-88001",
          requesterId: requester1Id,
          categoryId: 1,
          relatedSystemId: 1,
          summary: "Requester 1 ticket",
          description: "Testing authorization",
          requestedPriority: "MEDIUM",
        },
      });
    }
    ticketOwnedByReq1 = t1.id;

    let t2 = await prisma.ticket.findFirst({ where: { requesterId: requester2Id } });
    if (!t2) {
      t2 = await prisma.ticket.create({
        data: {
          ticketNumber: "TKT-2026-88002",
          requesterId: requester2Id,
          categoryId: 1,
          relatedSystemId: 1,
          summary: "Requester 2 ticket",
          description: "Testing cross requester barrier",
          requestedPriority: "LOW",
        },
      });
    }
    ticketOwnedByReq2 = t2.id;

    // Ensure there is an internal note on ticketOwnedByReq1
    await prisma.internalNote.create({
      data: {
        ticketId: ticketOwnedByReq1,
        authorId: staffLogin.body.user.id,
        content: "Top secret diagnostic information for staff only",
      },
    });
  });

  // NOTE-02: Requester Cannot Create Internal Note (BR-04)
  it("NOTE-02: rejects Requester attempting to post internal note with 403 Forbidden", async () => {
    const res = await request(app)
      .post(`/api/v1/tickets/${ticketOwnedByReq1}/notes`)
      .set("Cookie", requester1Cookie)
      .send({ content: "Requester attempting to write internal note" });

    expect(res.status).toBe(403);
    expect(res.body.error).toHaveProperty("code", "FORBIDDEN");
  });

  // NOTE-03: Internal Notes Omitted for Requester (BR-04)
  it("NOTE-03: strictly strips internalNotes when Requester fetches ticket detail", async () => {
    const res = await request(app)
      .get(`/api/v1/tickets/${ticketOwnedByReq1}`)
      .set("Cookie", requester1Cookie);

    expect(res.status).toBe(200);
    const body = res.body;
    expect(body.internalNotes).toBeUndefined();
    if (body.ticket) {
      expect(body.ticket.internalNotes).toBeUndefined();
    }

    // But IT Staff DOES see internalNotes on the same ticket
    const staffRes = await request(app)
      .get(`/api/v1/tickets/${ticketOwnedByReq1}`)
      .set("Cookie", staffCookie);

    expect(staffRes.status).toBe(200);
    const staffTicket = staffRes.body.ticket ?? staffRes.body;
    expect(staffTicket.internalNotes).toBeDefined();
    expect(Array.isArray(staffTicket.internalNotes)).toBe(true);
    expect(staffTicket.internalNotes.length).toBeGreaterThan(0);
    const contents = staffTicket.internalNotes.map((n: any) => n.content);
    expect(contents.some((c: string) => c.includes("Top secret diagnostic"))).toBe(true);
  });

  // AUTH-TKT-01: Cross-Requester Boundary (BR-03)
  it("AUTH-TKT-01: rejects Requester viewing ticket owned by another requester with 403 or 404", async () => {
    const res = await request(app)
      .get(`/api/v1/tickets/${ticketOwnedByReq2}`)
      .set("Cookie", requester1Cookie);

    expect([403, 404]).toContain(res.status);
    expect(res.body).toHaveProperty("error");
  });

  // AUTH-TKT-02: Requester Operational Controls Prohibited
  it("AUTH-TKT-02: rejects Requester calling assignment endpoint with 403 Forbidden", async () => {
    const res = await request(app)
      .patch(`/api/v1/staff/tickets/${ticketOwnedByReq1}/assignment`)
      .set("Cookie", requester1Cookie)
      .send({ ownerId: null });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("AUTH-TKT-02b: rejects Requester calling priority endpoint with 403 Forbidden", async () => {
    const res = await request(app)
      .patch(`/api/v1/staff/tickets/${ticketOwnedByReq1}/priority`)
      .set("Cookie", requester1Cookie)
      .send({ itPriority: "URGENT" });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("AUTH-TKT-02c: rejects Requester calling status transition endpoint with 403 Forbidden", async () => {
    const res = await request(app)
      .patch(`/api/v1/staff/tickets/${ticketOwnedByReq1}/status`)
      .set("Cookie", requester1Cookie)
      .send({ status: "CLOSED" });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  // AUTH-TKT-03: Cross-Requester Comment Posting Prohibited
  it("AUTH-TKT-03: rejects Requester posting public comment on another requester's ticket with 403 Forbidden", async () => {
    const res = await request(app)
      .post(`/api/v1/tickets/${ticketOwnedByReq2}/comments`)
      .set("Cookie", requester1Cookie)
      .send({ content: "Unauthorized comment on other requester ticket" });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });
});
