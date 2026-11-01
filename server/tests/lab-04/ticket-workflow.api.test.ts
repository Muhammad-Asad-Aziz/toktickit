import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { seed } from "../../prisma/seed.js";
import { getPrisma } from "../../src/prisma.js";
import { TicketStatus } from "@prisma/client";

describe("Issue 20: Ticket Status Lifecycle, Concurrency & Resolution Gate API Suite", () => {
  let staffCookie: string | string[];
  let requesterCookie: string | string[];
  let adminCookie: string | string[];

  let ticketWithZeroActionsId: number;
  let ticketWithActionId: number;
  let ticketInNewStatusId: number;
  let ticketForWorkflowId: number;

  beforeAll(async () => {
    await seed();
    const prisma = getPrisma();

    // 1. Authenticate Staff (Wichai IT)
    const staffLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "wichai.it@kmutt.ac.th", password: "Password123!" });
    staffCookie = staffLogin.headers["set-cookie"] as string | string[];

    // 2. Authenticate Requester (Sompong IT)
    const reqLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "sompong.it@kmutt.ac.th", password: "Password123!" });
    requesterCookie = reqLogin.headers["set-cookie"] as string | string[];

    // 3. Authenticate Administrator (Admin TokTick)
    const adminLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "admin.toktick@kmutt.ac.th", password: "Password123!" });
    adminCookie = adminLogin.headers["set-cookie"] as string | string[];

    // 4. Create dedicated test tickets with unique suffix or cleanup
    const runId = Math.floor(Math.random() * 100000);
    await prisma.ticket.deleteMany({
      where: {
        ticketNumber: {
          startsWith: "TKT-20-",
        },
      },
    });

    // Ticket A: IN_PROGRESS with 0 actions (for WRK-01 resolution gate block)
    const ticketZero = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-20-A-${runId}`,
        requesterId: reqLogin.body.user.id,
        categoryId: 1,
        relatedSystemId: 1,
        summary: "Zero actions resolution test ticket",
        description: "Testing resolution gate invariant block",
        currentStatus: TicketStatus.IN_PROGRESS,
      },
    });
    ticketWithZeroActionsId = ticketZero.id;

    // Ticket B: IN_PROGRESS with 1 action (for WRK-02 resolution gate pass)
    const ticketAction = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-20-B-${runId}`,
        requesterId: reqLogin.body.user.id,
        categoryId: 1,
        relatedSystemId: 1,
        summary: "One action resolution test ticket",
        description: "Testing resolution gate invariant pass",
        currentStatus: TicketStatus.IN_PROGRESS,
        actionsTaken: {
          create: {
            actionDescription: "Performed firmware diagnostic scan on gateway router.",
            result: "Scan cleared with zero hardware faults reported.",
            performedById: staffLogin.body.user.id,
            followUpRequired: false,
          },
        },
      },
    });
    ticketWithActionId = ticketAction.id;

    // Ticket C: NEW status (for WRK-04 invalid transition)
    const ticketNew = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-20-C-${runId}`,
        requesterId: reqLogin.body.user.id,
        categoryId: 1,
        relatedSystemId: 1,
        summary: "New status invalid transition ticket",
        description: "Testing illegal status jumps from NEW",
        currentStatus: TicketStatus.NEW,
      },
    });
    ticketInNewStatusId = ticketNew.id;

    // Ticket D: Full lifecycle workflow
    const ticketWorkflow = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-20-D-${runId}`,
        requesterId: reqLogin.body.user.id,
        categoryId: 1,
        relatedSystemId: 1,
        summary: "Full workflow lifecycle test ticket",
        description: "Testing complete progression from NEW to CLOSED",
        currentStatus: TicketStatus.NEW,
      },
    });
    ticketForWorkflowId = ticketWorkflow.id;
  });

  // ---------------------------------------------------------------------------
  // WRK-01: Resolution Gate Block on Ticket with 0 Actions Taken (BR-07, AC-20.2)
  // ---------------------------------------------------------------------------
  it("WRK-01: rejects transition to RESOLVED if ticket has 0 Actions Taken (400 Bad Request, BR-07, AC-20.2)", async () => {
    const res = await request(app)
      .patch(`/api/v1/staff/tickets/${ticketWithZeroActionsId}/status`)
      .set("Cookie", staffCookie)
      .send({ status: "RESOLVED" });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
    expect(res.body.error.code).toBe("RESOLUTION_REQUIRES_ACTION_TAKEN");
    expect(res.body.error.message).toBe("Cannot resolve ticket without at least one recorded Action Taken.");

    // Verify ticket status was not changed in DB
    const prisma = getPrisma();
    const t = await prisma.ticket.findUnique({ where: { id: ticketWithZeroActionsId } });
    expect(t?.currentStatus).toBe(TicketStatus.IN_PROGRESS);
  });

  // ---------------------------------------------------------------------------
  // WRK-02: Successful Resolution with >= 1 Recorded Action Taken (BR-07, AC-20.2)
  // ---------------------------------------------------------------------------
  it("WRK-02: permits transition to RESOLVED when ticket has >= 1 recorded Action Taken (200 OK, BR-07, AC-20.2)", async () => {
    const res = await request(app)
      .patch(`/api/v1/staff/tickets/${ticketWithActionId}/status`)
      .set("Cookie", staffCookie)
      .send({ status: "RESOLVED" });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("currentStatus", "RESOLVED");
    expect(res.body.ticket).toHaveProperty("currentStatus", "RESOLVED");

    const prisma = getPrisma();
    const t = await prisma.ticket.findUnique({ where: { id: ticketWithActionId } });
    expect(t?.currentStatus).toBe(TicketStatus.RESOLVED);
  });

  // ---------------------------------------------------------------------------
  // WRK-03: Requester Advisory Resolution Separation (BR-08, AC-20.3)
  // ---------------------------------------------------------------------------
  it("WRK-03: updates requesterResolvedAt without mutating currentStatus (200 OK, BR-08, AC-20.3)", async () => {
    const prisma = getPrisma();
    const initialTicket = await prisma.ticket.findUnique({ where: { id: ticketWithZeroActionsId } });
    expect(initialTicket?.currentStatus).toBe(TicketStatus.IN_PROGRESS);

    const res = await request(app)
      .post(`/api/v1/tickets/${ticketWithZeroActionsId}/resolve-request`)
      .set("Cookie", requesterCookie);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("requesterResolvedAt");

    // Invariant: currentStatus must remain IN_PROGRESS
    const afterTicket = await prisma.ticket.findUnique({ where: { id: ticketWithZeroActionsId } });
    expect(afterTicket?.currentStatus).toBe(TicketStatus.IN_PROGRESS);
    expect(afterTicket?.requesterResolvedAt).not.toBeNull();
  });

  // ---------------------------------------------------------------------------
  // WRK-04: Status Transition Matrix Enforcement (BR-06, AC-20.1)
  // ---------------------------------------------------------------------------
  it("WRK-04: rejects invalid status jumps (e.g. NEW -> RESOLVED) with 400 Bad Request (BR-06, AC-20.1)", async () => {
    const res = await request(app)
      .patch(`/api/v1/staff/tickets/${ticketInNewStatusId}/status`)
      .set("Cookie", staffCookie)
      .send({ status: "RESOLVED" });

    expect(res.status).toBe(400);
    expect(res.body.error).toHaveProperty("code", "INVALID_STATUS_TRANSITION");
    expect(res.body.error.message).toContain("Cannot transition ticket status from NEW to RESOLVED");
  });

  // ---------------------------------------------------------------------------
  // WRK-05: Optimistic Concurrency Control (BR-09 / BR-10, AC-20.4)
  // ---------------------------------------------------------------------------
  it("WRK-05: rejects stale status update with 409 Conflict (BR-09, AC-20.4)", async () => {
    // Provide a deliberately stale timestamp
    const staleTimestamp = "2020-01-01T00:00:00.000Z";

    const res = await request(app)
      .patch(`/api/v1/staff/tickets/${ticketInNewStatusId}/status`)
      .set("Cookie", staffCookie)
      .send({
        status: "OPEN",
        versionTimestamp: staleTimestamp,
      });

    expect(res.status).toBe(409);
    expect(res.body.error).toHaveProperty("code", "STALE_RECORD_CONFLICT");
    expect(res.body.error.message).toContain("The ticket was modified by another user");
  });

  // ---------------------------------------------------------------------------
  // WRK-06: Terminal Status Invariant on CLOSED (BR-06, AC-20.1)
  // ---------------------------------------------------------------------------
  it("WRK-06: rejects any status transitions from CLOSED terminal state (400 Bad Request, BR-06, AC-20.1)", async () => {
    const prisma = getPrisma();
    const closedTicket = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-20-CLS-${Math.floor(Math.random() * 100000)}`,
        requesterId: (await prisma.user.findFirst({ where: { role: "REQUESTER" } }))!.id,
        categoryId: 1,
        relatedSystemId: 1,
        summary: "Closed ticket terminal test",
        description: "Checking terminal closure invariant",
        currentStatus: TicketStatus.CLOSED,
      },
    });

    const res = await request(app)
      .patch(`/api/v1/staff/tickets/${closedTicket.id}/status`)
      .set("Cookie", staffCookie)
      .send({ status: "REOPENED" });

    expect(res.status).toBe(400);
    expect(res.body.error).toHaveProperty("code", "INVALID_STATUS_TRANSITION");
  });

  // ---------------------------------------------------------------------------
  // WRK-07: Cancellation Reason Validation (BR-06, AC-20.1)
  // ---------------------------------------------------------------------------
  it("WRK-07: requires cancellationReason >= 5 chars when transitioning to CANCELLED (BR-06, AC-20.1)", async () => {
    // Attempt cancellation with missing / short reason
    const resShort = await request(app)
      .patch(`/api/v1/staff/tickets/${ticketInNewStatusId}/status`)
      .set("Cookie", staffCookie)
      .send({ status: "CANCELLED", cancellationReason: "bad" });

    expect(resShort.status).toBe(400);
    expect(resShort.body.error.code).toBe("VALIDATION_FAILED");
    expect(resShort.body.error.message).toBe("Cancellation reason must be at least 5 characters.");

    // Successful cancellation with valid reason
    const resValid = await request(app)
      .patch(`/api/v1/staff/tickets/${ticketInNewStatusId}/status`)
      .set("Cookie", staffCookie)
      .send({ status: "CANCELLED", cancellationReason: "Duplicate ticket created by accident." });

    expect(resValid.status).toBe(200);
    expect(resValid.body.currentStatus).toBe("CANCELLED");

    // Internal note was logged
    const prisma = getPrisma();
    const note = await prisma.internalNote.findFirst({
      where: { ticketId: ticketInNewStatusId },
      orderBy: { createdAt: "desc" },
    });
    expect(note?.content).toContain("Duplicate ticket created by accident.");
  });

  // ---------------------------------------------------------------------------
  // WRK-08: Role Guard Enforcement (AC-20.1)
  // ---------------------------------------------------------------------------
  it("WRK-08: rejects Requester attempting to patch ticket status with 403 Forbidden (AC-20.1)", async () => {
    const res = await request(app)
      .patch(`/api/v1/staff/tickets/${ticketForWorkflowId}/status`)
      .set("Cookie", requesterCookie)
      .send({ status: "OPEN" });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  // ---------------------------------------------------------------------------
  // WRK-09: Complete Legal State Progression Sequence (BR-06, BR-07, AC-20.1, AC-20.2)
  // ---------------------------------------------------------------------------
  it("WRK-09: successfully navigates NEW -> OPEN -> IN_PROGRESS -> RESOLVED -> CLOSED with actions taken", async () => {
    const prisma = getPrisma();

    // 1. NEW -> OPEN
    const step1 = await request(app)
      .patch(`/api/v1/staff/tickets/${ticketForWorkflowId}/status`)
      .set("Cookie", staffCookie)
      .send({ status: "OPEN" });
    expect(step1.status).toBe(200);
    expect(step1.body.currentStatus).toBe("OPEN");

    // 2. OPEN -> IN_PROGRESS
    const step2 = await request(app)
      .patch(`/api/v1/staff/tickets/${ticketForWorkflowId}/status`)
      .set("Cookie", staffCookie)
      .send({ status: "IN_PROGRESS" });
    expect(step2.status).toBe(200);
    expect(step2.body.currentStatus).toBe("IN_PROGRESS");

    // 3. Attempt resolution without action -> Must fail
    const stepFail = await request(app)
      .patch(`/api/v1/staff/tickets/${ticketForWorkflowId}/status`)
      .set("Cookie", staffCookie)
      .send({ status: "RESOLVED" });
    expect(stepFail.status).toBe(400);

    // 4. Log Action Taken
    const staffUser = await prisma.user.findFirst({ where: { email: "wichai.it@kmutt.ac.th" } });
    await prisma.actionTaken.create({
      data: {
        ticketId: ticketForWorkflowId,
        actionDescription: "Replaced faulty optical transceiver on switch port 2.",
        result: "Fiber link returned to 10Gbps full duplex.",
        performedById: staffUser!.id,
      },
    });

    // 5. IN_PROGRESS -> RESOLVED -> Must succeed
    const step3 = await request(app)
      .patch(`/api/v1/staff/tickets/${ticketForWorkflowId}/status`)
      .set("Cookie", staffCookie)
      .send({ status: "RESOLVED" });
    expect(step3.status).toBe(200);
    expect(step3.body.currentStatus).toBe("RESOLVED");

    // 6. RESOLVED -> CLOSED -> Must succeed
    const step4 = await request(app)
      .patch(`/api/v1/staff/tickets/${ticketForWorkflowId}/status`)
      .set("Cookie", staffCookie)
      .send({ status: "CLOSED" });
    expect(step4.status).toBe(200);
    expect(step4.body.currentStatus).toBe("CLOSED");

    // 7. Verify CLOSED is terminal -> attempting REOPENED fails
    const step5 = await request(app)
      .patch(`/api/v1/staff/tickets/${ticketForWorkflowId}/status`)
      .set("Cookie", staffCookie)
      .send({ status: "REOPENED" });
    expect(step5.status).toBe(400);
    expect(step5.body.error.code).toBe("INVALID_STATUS_TRANSITION");
  });
});

