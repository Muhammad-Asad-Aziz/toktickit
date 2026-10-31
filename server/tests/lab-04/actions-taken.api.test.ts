import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { seed } from "../../prisma/seed.js";
import { getPrisma } from "../../src/prisma.js";

describe("Issue 18: Actions Taken API Integration Suite", () => {
  let staffCookie: string | string[];
  let adminCookie: string | string[];
  let requesterCookie: string | string[];
  let otherRequesterCookie: string | string[];
  let staffUserId: number;
  let adminUserId: number;
  let requesterUserId: number;
  let otherRequesterUserId: number;

  let ownedTicketId: number;
  let unownedTicketId: number;
  let zeroActionTicketId: number;

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

    // 4. Authenticate Other Requester (Kittisak Student)
    const otherRequesterLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "kittisak.stu@kmutt.ac.th", password: "Password123!" });
    otherRequesterCookie = otherRequesterLogin.headers["set-cookie"] as string | string[];
    otherRequesterUserId = otherRequesterLogin.body.user.id;

    // Retrieve test tickets
    // TKT-2026-00001 owned by Sompong (Requester)
    const ticket1 = await prisma.ticket.findUnique({
      where: { ticketNumber: "TKT-2026-00001" },
    });
    ownedTicketId = ticket1!.id;

    // TKT-2026-00003 owned by Kittisak (Other Requester)
    const ticket3 = await prisma.ticket.findUnique({
      where: { ticketNumber: "TKT-2026-00003" },
    });
    unownedTicketId = ticket3!.id;

    // TKT-2026-00002 has zero actions
    const ticket2 = await prisma.ticket.findUnique({
      where: { ticketNumber: "TKT-2026-00002" },
    });
    zeroActionTicketId = ticket2!.id;
  });

  // -------------------------------------------------------------------------
  // ACT-01: Create valid Action Taken by IT Staff (AC-18.1)
  // -------------------------------------------------------------------------
  it("ACT-01: IT Staff creates valid Action Taken (201 Created, AC-18.1)", async () => {
    const res = await request(app)
      .post(`/api/v1/tickets/${ownedTicketId}/actions-taken`)
      .set("Cookie", staffCookie)
      .send({
        actionDescription: "Replaced faulty Ethernet RJ45 keystone jack in Room 302.",
        result: "Gigabit Ethernet link negotiated and passed 10-minute ping test with zero loss.",
        followUpRequired: false,
        attachmentNotes: "Replaced jack discarded into hardware recycling bin.",
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("actionTaken");
    const act = res.body.actionTaken;
    expect(act).toHaveProperty("id");
    expect(act.ticketId).toBe(ownedTicketId);
    expect(act.actionDescription).toBe("Replaced faulty Ethernet RJ45 keystone jack in Room 302.");
    expect(act.result).toBe("Gigabit Ethernet link negotiated and passed 10-minute ping test with zero loss.");
    expect(act.followUpRequired).toBe(false);
    expect(act.followUpNote).toBeNull();
    expect(act.attachmentNotes).toBe("Replaced jack discarded into hardware recycling bin.");
    expect(act.performedBy).toEqual({
      id: staffUserId,
      name: "Wichai IT",
      email: "wichai.it@kmutt.ac.th",
      role: "IT_STAFF",
    });
    expect(act).toHaveProperty("createdAt");
    expect(act).toHaveProperty("updatedAt");
  });

  // -------------------------------------------------------------------------
  // ACT-02: Auto-derived performer audit trail; spoofing ignored (AC-18.1, BR-02, BR-06)
  // -------------------------------------------------------------------------
  it("ACT-02: Performer ID auto-derived from session; payload spoofing ignored (AC-18.1, BR-02)", async () => {
    const res = await request(app)
      .post(`/api/v1/tickets/${ownedTicketId}/actions-taken`)
      .set("Cookie", staffCookie)
      .send({
        actionDescription: "Verified wireless controller configuration.",
        result: "SSID broadcast restored.",
        followUpRequired: false,
        performedById: 9999, // Attempt to spoof another user ID
      });

    expect(res.status).toBe(201);
    // Must be attributed to authenticated staff member, not spoofed ID
    expect(res.body.actionTaken.performedBy.id).toBe(staffUserId);
    expect(res.body.actionTaken.performedBy.id).not.toBe(9999);
  });

  // -------------------------------------------------------------------------
  // ACT-03: Missing follow-up note when required (AC-18.3, BR-05)
  // -------------------------------------------------------------------------
  it("ACT-03: followUpRequired=true without note returns 400 Bad Request (AC-18.3, BR-05)", async () => {
    // 1. Missing followUpNote field completely
    const resMissing = await request(app)
      .post(`/api/v1/tickets/${ownedTicketId}/actions-taken`)
      .set("Cookie", staffCookie)
      .send({
        actionDescription: "Rebooted core distribution router.",
        result: "Routing tables converged.",
        followUpRequired: true,
      });

    expect(resMissing.status).toBe(400);
    expect(resMissing.body).toHaveProperty("error");
    expect(resMissing.body.error.code).toBe("VALIDATION_FAILED");
    expect(resMissing.body.error.message).toContain("Follow-up note is required");

    // 2. Whitespace-only followUpNote
    const resEmpty = await request(app)
      .post(`/api/v1/tickets/${ownedTicketId}/actions-taken`)
      .set("Cookie", staffCookie)
      .send({
        actionDescription: "Rebooted core distribution router.",
        result: "Routing tables converged.",
        followUpRequired: true,
        followUpNote: "   ",
      });

    expect(resEmpty.status).toBe(400);
    expect(resEmpty.body.error.code).toBe("VALIDATION_FAILED");
  });

  // -------------------------------------------------------------------------
  // ACT-04: Valid follow-up note persisted (AC-18.3, BR-05)
  // -------------------------------------------------------------------------
  it("ACT-04: followUpRequired=true with valid follow-up note persists successfully (AC-18.3, BR-05)", async () => {
    const res = await request(app)
      .post(`/api/v1/tickets/${ownedTicketId}/actions-taken`)
      .set("Cookie", staffCookie)
      .send({
        actionDescription: "Applied temporary patch to access switch.",
        result: "Switch CPU dropped from 98% to 15%.",
        followUpRequired: true,
        followUpNote: "Schedule permanent firmware upgrade during weekend maintenance window.",
      });

    expect(res.status).toBe(201);
    expect(res.body.actionTaken.followUpRequired).toBe(true);
    expect(res.body.actionTaken.followUpNote).toBe(
      "Schedule permanent firmware upgrade during weekend maintenance window."
    );
  });

  // -------------------------------------------------------------------------
  // ACT-05: Update existing Action Taken by Staff (AC-18.1, BR-04, BR-06)
  // -------------------------------------------------------------------------
  it("ACT-05: Staff updates action description and result; performer remains immutable (200 OK)", async () => {
    // 1. Create action
    const createRes = await request(app)
      .post(`/api/v1/tickets/${ownedTicketId}/actions-taken`)
      .set("Cookie", staffCookie)
      .send({
        actionDescription: "Initial diagnostics of DNS resolver.",
        result: "DNS lookup latency 250ms.",
        followUpRequired: false,
      });

    const actionId = createRes.body.actionTaken.id;

    // 2. Update action using Administrator
    const updateRes = await request(app)
      .put(`/api/v1/tickets/${ownedTicketId}/actions-taken/${actionId}`)
      .set("Cookie", adminCookie)
      .send({
        actionDescription: "Updated diagnostics: flushed local bind9 cache and restarted daemon.",
        result: "DNS resolution response dropped to 2ms.",
        followUpRequired: false,
        followUpNote: null,
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.actionTaken.actionDescription).toBe(
      "Updated diagnostics: flushed local bind9 cache and restarted daemon."
    );
    expect(updateRes.body.actionTaken.result).toBe("DNS resolution response dropped to 2ms.");
    // Performer ID must remain the original author (Wichai IT), not changed to Admin (BR-06)
    expect(updateRes.body.actionTaken.performedBy.id).toBe(staffUserId);
  });

  // -------------------------------------------------------------------------
  // ACT-06: Requester queries actions for owned ticket (AC-18.4, BR-03)
  // -------------------------------------------------------------------------
  it("ACT-06: Requester retrieves Actions Taken for owned ticket (200 OK, AC-18.4)", async () => {
    const res = await request(app)
      .get(`/api/v1/tickets/${ownedTicketId}/actions-taken`)
      .set("Cookie", requesterCookie);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("actionsTaken");
    expect(Array.isArray(res.body.actionsTaken)).toBe(true);
    expect(res.body.actionsTaken.length).toBeGreaterThanOrEqual(1);

    // Verify chronological ascending sorting (BR-01)
    const dates = res.body.actionsTaken.map((a: { actionDateTime: string }) =>
      new Date(a.actionDateTime).getTime()
    );
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i]).toBeGreaterThanOrEqual(dates[i - 1]);
    }
  });

  // -------------------------------------------------------------------------
  // ACT-07: Requester attempts to create Action Taken (AC-18.2, BR-03)
  // -------------------------------------------------------------------------
  it("ACT-07: Requester write attempt (POST) is rejected with 403 Forbidden (AC-18.2)", async () => {
    const res = await request(app)
      .post(`/api/v1/tickets/${ownedTicketId}/actions-taken`)
      .set("Cookie", requesterCookie)
      .send({
        actionDescription: "Requester trying to log physical action.",
        result: "Work completed by student.",
        followUpRequired: false,
      });

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty("error");
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  // -------------------------------------------------------------------------
  // ACT-08: Requester attempts to update Action Taken (AC-18.2, BR-03)
  // -------------------------------------------------------------------------
  it("ACT-08: Requester update attempt (PUT) is rejected with 403 Forbidden (AC-18.2)", async () => {
    // Get existing action
    const listRes = await request(app)
      .get(`/api/v1/tickets/${ownedTicketId}/actions-taken`)
      .set("Cookie", staffCookie);
    const actionId = listRes.body.actionsTaken[0].id;

    const res = await request(app)
      .put(`/api/v1/tickets/${ownedTicketId}/actions-taken/${actionId}`)
      .set("Cookie", requesterCookie)
      .send({
        actionDescription: "Requester trying to overwrite staff action description.",
        result: "Modified result.",
        followUpRequired: false,
      });

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty("error");
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  // -------------------------------------------------------------------------
  // ACT-09: Safe empty array handling for zero-action tickets (AC-18.4)
  // -------------------------------------------------------------------------
  it("ACT-09: Zero-action ticket safely returns empty array [] (200 OK, AC-18.4)", async () => {
    const res = await request(app)
      .get(`/api/v1/tickets/${zeroActionTicketId}/actions-taken`)
      .set("Cookie", staffCookie);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("actionsTaken");
    expect(res.body.actionsTaken).toEqual([]);
  });

  // -------------------------------------------------------------------------
  // ACT-10: Requester queries unowned ticket actions (AC-18.5, BR-03)
  // -------------------------------------------------------------------------
  it("ACT-10: Requester querying unowned ticket actions rejected with 403 Forbidden (AC-18.5)", async () => {
    // Sompong attempts to read Kittisak's ticket actions
    const res = await request(app)
      .get(`/api/v1/tickets/${unownedTicketId}/actions-taken`)
      .set("Cookie", requesterCookie);

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty("error");
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  // -------------------------------------------------------------------------
  // ACT-11: Optimistic concurrency conflict on stale update (BR-10)
  // -------------------------------------------------------------------------
  it("ACT-11: Stale versionTimestamp on PUT returns 409 Conflict (BR-10)", async () => {
    const createRes = await request(app)
      .post(`/api/v1/tickets/${ownedTicketId}/actions-taken`)
      .set("Cookie", staffCookie)
      .send({
        actionDescription: "Tested wireless beacon intervals.",
        result: "Beacon sent at 100ms intervals.",
        followUpRequired: false,
      });

    const actionId = createRes.body.actionTaken.id;

    // Submit stale timestamp (e.g. 5 minutes ago)
    const staleTimestamp = new Date(Date.now() - 300000).toISOString();

    const conflictRes = await request(app)
      .put(`/api/v1/tickets/${ownedTicketId}/actions-taken/${actionId}`)
      .set("Cookie", staffCookie)
      .send({
        actionDescription: "Concurrent overwrite attempt with stale timestamp.",
        result: "Result update.",
        followUpRequired: false,
        versionTimestamp: staleTimestamp,
      });

    expect(conflictRes.status).toBe(409);
    expect(conflictRes.body).toHaveProperty("error");
    expect(conflictRes.body.error.code).toBe("STALE_RECORD_CONFLICT");
  });

  // -------------------------------------------------------------------------
  // Edge Case: Reject future action date/time
  // -------------------------------------------------------------------------
  it("Edge Case: Future actionDateTime is rejected with 400 Bad Request", async () => {
    const futureDate = new Date(Date.now() + 86400000).toISOString(); // Tomorrow
    const res = await request(app)
      .post(`/api/v1/tickets/${ownedTicketId}/actions-taken`)
      .set("Cookie", staffCookie)
      .send({
        actionDateTime: futureDate,
        actionDescription: "Action scheduled for tomorrow.",
        result: "Work done.",
        followUpRequired: false,
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
    expect(res.body.error.message).toContain("future");
  });

  // -------------------------------------------------------------------------
  // Edge Case: Description and result length boundaries
  // -------------------------------------------------------------------------
  it("Edge Case: Description < 5 chars or result < 2 chars rejected with 400", async () => {
    // Description too short
    const resShortDesc = await request(app)
      .post(`/api/v1/tickets/${ownedTicketId}/actions-taken`)
      .set("Cookie", staffCookie)
      .send({
        actionDescription: "Fix",
        result: "Done working.",
        followUpRequired: false,
      });

    expect(resShortDesc.status).toBe(400);
    expect(resShortDesc.body.error.code).toBe("VALIDATION_FAILED");

    // Result too short
    const resShortResult = await request(app)
      .post(`/api/v1/tickets/${ownedTicketId}/actions-taken`)
      .set("Cookie", staffCookie)
      .send({
        actionDescription: "Valid action description here.",
        result: "D",
        followUpRequired: false,
      });

    expect(resShortResult.status).toBe(400);
    expect(resShortResult.body.error.code).toBe("VALIDATION_FAILED");
  });

  // -------------------------------------------------------------------------
  // Edge Case: Non-existent ticket returns 404
  // -------------------------------------------------------------------------
  it("Edge Case: Non-existent ticket returns 404 Not Found", async () => {
    const res = await request(app)
      .get("/api/v1/tickets/999999/actions-taken")
      .set("Cookie", staffCookie);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("TICKET_NOT_FOUND");
  });

  // -------------------------------------------------------------------------
  // Edge Case: Unauthenticated request returns 401
  // -------------------------------------------------------------------------
  it("Edge Case: Unauthenticated request returns 401 Unauthorized", async () => {
    const res = await request(app).get(`/api/v1/tickets/${ownedTicketId}/actions-taken`);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });
});

