import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { seed } from "../../prisma/seed.js";
import { getPrisma } from "../../src/prisma.js";

describe("Feature 9 / Issue 5: Ticket Detail API Tests", () => {
  let requester1Id: number;
  let requester2Id: number;
  let ticket1Id: number;
  let ticket2Id: number;

  beforeAll(async () => {
    await seed();
    const prisma = getPrisma();

    // Get active requesters
    const req1 = await prisma.requesterUser.findUnique({
      where: { email: "sompong.it@kmutt.ac.th" },
    });
    const req2 = await prisma.requesterUser.findUnique({
      where: { email: "anong.sta@kmutt.ac.th" },
    });

    requester1Id = req1!.id;
    requester2Id = req2!.id;

    // Create a ticket for requester 1
    const t1Res = await request(app)
      .post("/api/tickets")
      .send({
        requesterId: requester1Id,
        categoryId: 4, // Network
        relatedSystemId: 1,
        requestedPriority: "High",
        summary: "Wi-Fi connection drop in building SCL",
        description: "Frequent disconnections when roaming between access points on 3rd floor.",
      });
    ticket1Id = t1Res.body.id;

    // Create a ticket for requester 2
    const t2Res = await request(app)
      .post("/api/tickets")
      .send({
        requesterId: requester2Id,
        categoryId: 3, // Software
        relatedSystemId: 4, // LEB2
        requestedPriority: "Medium",
        summary: "LEB2 session timeout during submission",
        description: "Student portal logged out unexpectedly while uploading assignment.",
      });
    ticket2Id = t2Res.body.id;
  });

  // API-TD-01: Owned Ticket Inspection
  it("API-TD-01: Returns 200 OK with full ticket details when accessed by owner", async () => {
    const res = await request(app)
      .get(`/api/tickets/${ticket1Id}`)
      .set("x-requester-id", String(requester1Id));

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(ticket1Id);
    expect(res.body.ticketNumber).toMatch(/^TKT-\d{4}-\d{5}$/);
    expect(res.body.ticketNo).toBe(res.body.ticketNumber);
    expect(res.body.summary).toBe("Wi-Fi connection drop in building SCL");
    expect(res.body.description).toBe("Frequent disconnections when roaming between access points on 3rd floor.");
    expect(res.body.requestedPriority).toBe("High");
    expect(res.body.currentStatus).toBe("New");
    expect(res.body.status).toBe("New");
    expect(res.body.requester.id).toBe(requester1Id);
    expect(res.body.requester.name).toBe("Sompong IT");
    expect(res.body.category.name).toBe("Network");
    expect(res.body.relatedSystem).toBeDefined();
    expect(Array.isArray(res.body.attachments)).toBe(true);
  });

  // API-TD-02: Cross-Requester Access Rejection
  it("API-TD-02: Rejects cross-requester ticket inspection with 403 Forbidden", async () => {
    // Requester 2 attempts to fetch Requester 1's ticket
    const res = await request(app)
      .get(`/api/tickets/${ticket1Id}`)
      .set("x-requester-id", String(requester2Id));

    expect([403, 404]).toContain(res.status);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toMatch(/FORBIDDEN|NOT_FOUND/);
  });

  // API-TD-03: Non-Existent Ticket ID
  it("API-TD-03: Returns 404 Not Found when ticket ID does not exist", async () => {
    const res = await request(app)
      .get("/api/tickets/99999")
      .set("x-requester-id", String(requester1Id));

    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe("TICKET_NOT_FOUND");
  });

  // API-TD-04: Missing Requester Header
  it("API-TD-04: Returns 400 Bad Request when x-requester-id header is missing", async () => {
    const res = await request(app).get(`/api/tickets/${ticket1Id}`);

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe("MISSING_REQUESTER_ID");
  });

  // API-TD-05: Active & Soft-Removed Attachment Payloads
  it("API-TD-05: Returns both active and soft-removed attachments in payload with correct flags", async () => {
    const prisma = getPrisma();

    // Insert 1 active attachment and 1 soft-removed attachment directly
    const uniqueActive = `uuid-act-${Date.now()}-${Math.random()}.png`;
    const uniqueRemoved = `uuid-rem-${Date.now()}-${Math.random()}.pdf`;

    const activeAtt = await prisma.attachment.create({
      data: {
        ticketId: ticket1Id,
        originalFilename: "active_signal.png",
        storedFilename: uniqueActive,
        mimeType: "image/png",
        fileSize: 102400,
        isRemoved: false,
      },
    });

    const removedAtt = await prisma.attachment.create({
      data: {
        ticketId: ticket1Id,
        originalFilename: "wrong_report.pdf",
        storedFilename: uniqueRemoved,
        mimeType: "application/pdf",
        fileSize: 204800,
        isRemoved: true,
        removalReason: "Uploaded wrong document by mistake",
        removedAt: new Date(),
        removedByRequesterId: requester1Id,
      },
    });

    const res = await request(app)
      .get(`/api/tickets/${ticket1Id}`)
      .set("x-requester-id", String(requester1Id));

    expect(res.status).toBe(200);
    const attachments = res.body.attachments;
    expect(attachments.length).toBeGreaterThanOrEqual(2);

    const foundActive = attachments.find((a: any) => a.id === activeAtt.id);
    expect(foundActive).toBeDefined();
    expect(foundActive.isRemoved).toBe(false);
    expect(foundActive.originalFilename).toBe("active_signal.png");

    const foundRemoved = attachments.find((a: any) => a.id === removedAtt.id);
    expect(foundRemoved).toBeDefined();
    expect(foundRemoved.isRemoved).toBe(true);
    expect(foundRemoved.removalReason).toBe("Uploaded wrong document by mistake");
    expect(foundRemoved.removedAt).toBeDefined();
  });
});
