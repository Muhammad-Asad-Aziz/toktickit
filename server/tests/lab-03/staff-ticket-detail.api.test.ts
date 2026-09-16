import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { seed } from "../../prisma/seed.js";
import { getPrisma } from "../../src/prisma.js";

describe("Staff Ticket Detail Operational Controls API Suite (Issue 14)", () => {
  let staffCookie: string[];
  let staffUserId: number;
  let otherStaffCookie: string[];
  let otherStaffId: number;
  let adminCookie: string[];
  let requesterCookie: string[];
  let requesterId: number;
  let inactiveStaffId: number;

  let testTicketId: number;
  let closedTicketId: number;

  beforeAll(async () => {
    await seed();
    const prisma = getPrisma();

    // Authenticate IT Staff 1 (Wichai)
    const staffLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "wichai.it@kmutt.ac.th", password: "Password123!" });
    staffCookie = staffLogin.headers["set-cookie"];
    staffUserId = staffLogin.body.user.id;

    // Authenticate IT Staff 2 (Nareerat)
    const otherStaffLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "nareerat.it@kmutt.ac.th", password: "Password123!" });
    otherStaffCookie = otherStaffLogin.headers["set-cookie"];
    otherStaffId = otherStaffLogin.body.user.id;

    // Authenticate Admin
    const adminLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "admin.toktick@kmutt.ac.th", password: "Password123!" });
    adminCookie = adminLogin.headers["set-cookie"];

    // Authenticate Requester (Sompong)
    const requesterLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "sompong.it@kmutt.ac.th", password: "Password123!" });
    requesterCookie = requesterLogin.headers["set-cookie"];
    requesterId = requesterLogin.body.user.id;

    const inactiveUser = await prisma.user.findFirst({ where: { email: "inactive.staff@kmutt.ac.th" } });
    inactiveStaffId = inactiveUser?.id || 9999;

    // Fetch an unassigned ticket for testing
    const unassignedTicket = await prisma.ticket.findFirst({
      where: { requesterId, currentStatus: "NEW" },
    });
    if (unassignedTicket) {
      testTicketId = unassignedTicket.id;
    } else {
      // Create a test ticket if needed
      const created = await prisma.ticket.create({
        data: {
          ticketNumber: "TKT-2026-99001",
          requesterId,
          categoryId: 1,
          relatedSystemId: 1,
          summary: "Operational test ticket",
          description: "Testing operational transitions and controls",
          requestedPriority: "MEDIUM",
          currentStatus: "NEW",
        },
      });
      testTicketId = created.id;
    }

    // Create a closed ticket for terminal state testing
    const closed = await prisma.ticket.create({
      data: {
        ticketNumber: "TKT-2026-99002",
        requesterId,
        categoryId: 1,
        relatedSystemId: 1,
        summary: "Terminal test ticket",
        description: "Testing terminal states",
        requestedPriority: "LOW",
        currentStatus: "CLOSED",
      },
    });
    closedTicketId = closed.id;
  });

  // TKTOP-01: IT Staff Claims Ticket
  it("TKTOP-01: IT Staff claims unassigned ticket successfully", async () => {
    const res = await request(app)
      .patch(`/api/v1/staff/tickets/${testTicketId}/assignment`)
      .set("Cookie", staffCookie)
      .send({ ownerId: staffUserId });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("message");
    expect(res.body).toHaveProperty("owner");
    expect(res.body.owner).toHaveProperty("id", staffUserId);
    expect(res.body.owner).toHaveProperty("name", "Wichai IT");
  });

  // TKTOP-02: IT Staff Reassigns or Unassigns Ticket
  it("TKTOP-02: IT Staff reassigns ticket to another staff member", async () => {
    const res = await request(app)
      .patch(`/api/v1/staff/tickets/${testTicketId}/assignment`)
      .set("Cookie", staffCookie)
      .send({ ownerId: otherStaffId });

    expect(res.status).toBe(200);
    expect(res.body.owner).toHaveProperty("id", otherStaffId);
    expect(res.body.owner).toHaveProperty("name", "Nareerat IT");
  });

  it("TKTOP-02b: IT Staff unassigns ticket with ownerId: null", async () => {
    const res = await request(app)
      .patch(`/api/v1/staff/tickets/${testTicketId}/assignment`)
      .set("Cookie", staffCookie)
      .send({ ownerId: null });

    expect(res.status).toBe(200);
    expect(res.body.owner).toBeNull();
  });

  it("TKTOP-02c: rejects assigning ticket to a Requester with 400 Bad Request", async () => {
    const res = await request(app)
      .patch(`/api/v1/staff/tickets/${testTicketId}/assignment`)
      .set("Cookie", staffCookie)
      .send({ ownerId: requesterId });

    expect(res.status).toBe(400);
    expect(res.body.error).toHaveProperty("code", "INVALID_ASSIGNEE");
  });

  it("TKTOP-02d: rejects assigning ticket to inactive staff with 400 Bad Request", async () => {
    const res = await request(app)
      .patch(`/api/v1/staff/tickets/${testTicketId}/assignment`)
      .set("Cookie", staffCookie)
      .send({ ownerId: inactiveStaffId });

    expect(res.status).toBe(400);
    expect(res.body.error).toHaveProperty("code", "INVALID_ASSIGNEE");
  });

  // TKTOP-03: Update IT Priority
  it("TKTOP-03: IT Staff updates IT operational priority", async () => {
    const res = await request(app)
      .patch(`/api/v1/staff/tickets/${testTicketId}/priority`)
      .set("Cookie", staffCookie)
      .send({ itPriority: "URGENT" });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("itPriority", "URGENT");
  });

  it("TKTOP-03b: rejects invalid priority with 400 Bad Request", async () => {
    const res = await request(app)
      .patch(`/api/v1/staff/tickets/${testTicketId}/priority`)
      .set("Cookie", staffCookie)
      .send({ itPriority: "CRITICAL_INVALID" });

    expect(res.status).toBe(400);
    expect(res.body.error).toHaveProperty("code", "VALIDATION_FAILED");
  });

  // TKTOP-04: Permitted Status Transition
  it("TKTOP-04: IT Staff executes permitted status transition NEW -> OPEN -> IN_PROGRESS", async () => {
    // 1. NEW -> OPEN
    const res1 = await request(app)
      .patch(`/api/v1/staff/tickets/${testTicketId}/status`)
      .set("Cookie", staffCookie)
      .send({ status: "OPEN" });

    expect(res1.status).toBe(200);
    expect(res1.body).toHaveProperty("currentStatus", "OPEN");

    // 2. OPEN -> IN_PROGRESS
    const res2 = await request(app)
      .patch(`/api/v1/staff/tickets/${testTicketId}/status`)
      .set("Cookie", staffCookie)
      .send({ status: "IN_PROGRESS" });

    expect(res2.status).toBe(200);
    expect(res2.body).toHaveProperty("currentStatus", "IN_PROGRESS");
  });

  // TKTOP-05: Prohibited Status Transition
  it("TKTOP-05: rejects prohibited status transition with 400 Bad Request", async () => {
    // Current status is IN_PROGRESS. Transition to NEW is forbidden!
    const res = await request(app)
      .patch(`/api/v1/staff/tickets/${testTicketId}/status`)
      .set("Cookie", staffCookie)
      .send({ status: "NEW" });

    expect(res.status).toBe(400);
    expect(res.body.error).toHaveProperty("code", "INVALID_STATUS_TRANSITION");
  });

  it("TKTOP-05b: rejects status transition from terminal CLOSED status with 400 Bad Request (except REOPENED)", async () => {
    const res = await request(app)
      .patch(`/api/v1/staff/tickets/${closedTicketId}/status`)
      .set("Cookie", staffCookie)
      .send({ status: "OPEN" });

    expect(res.status).toBe(400);
    expect(res.body.error).toHaveProperty("code", "INVALID_STATUS_TRANSITION");
  });

  // TKTOP-06: Requester Indicates Problem Appears Resolved (BR-05)
  it("TKTOP-06: Requester indicates problem appears resolved without altering ticket status", async () => {
    const res = await request(app)
      .post(`/api/v1/tickets/${testTicketId}/resolve-request`)
      .set("Cookie", requesterCookie);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("message");
    expect(res.body).toHaveProperty("requesterResolvedAt");
    expect(res.body.requesterResolvedAt).not.toBeNull();

    // Verify ticket status was not changed (still IN_PROGRESS)
    const checkRes = await request(app)
      .get(`/api/v1/tickets/${testTicketId}`)
      .set("Cookie", staffCookie);

    expect(checkRes.status).toBe(200);
    const t = checkRes.body.ticket ?? checkRes.body;
    expect(t.currentStatus).toBe("IN_PROGRESS");
    expect(t.requesterResolvedAt).not.toBeNull();
  });

  it("TKTOP-06b: rejects problem resolved action on closed ticket with 400 Bad Request", async () => {
    const res = await request(app)
      .post(`/api/v1/tickets/${closedTicketId}/resolve-request`)
      .set("Cookie", requesterCookie);

    expect(res.status).toBe(400);
    expect(res.body.error).toHaveProperty("code", "INVALID_ACTION");
  });

  // TKTOP-07: Fetch Assignees
  it("TKTOP-07: IT Staff fetches active assignees list", async () => {
    const res = await request(app)
      .get("/api/v1/staff/tickets/assignees")
      .set("Cookie", staffCookie);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("assignees");
    expect(Array.isArray(res.body.assignees)).toBe(true);
    expect(res.body.assignees.length).toBeGreaterThan(0);

    // Verify inactive staff and requesters are excluded
    const emails = res.body.assignees.map((a: any) => a.email);
    expect(emails).toContain("wichai.it@kmutt.ac.th");
    expect(emails).toContain("nareerat.it@kmutt.ac.th");
    expect(emails).not.toContain("inactive.staff@kmutt.ac.th");
    expect(emails).not.toContain("sompong.it@kmutt.ac.th");
  });
});
