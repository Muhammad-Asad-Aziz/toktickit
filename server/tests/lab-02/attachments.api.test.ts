import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import path from "node:path";
import fs from "node:fs";
import { app } from "../../src/app.js";
import { seed } from "../../prisma/seed.js";
import { getPrisma } from "../../src/prisma.js";
import { UPLOAD_DIR } from "../../src/routes/tickets.js";

describe("Feature 9 / Issue 5: Attachment Lifecycle & Soft-Removal API Tests", () => {
  let requester1Id: number;
  let requester2Id: number;
  let ticket1Id: number;
  let ticket2Id: number;

  beforeAll(async () => {
    await seed();
    const prisma = getPrisma();

    const req1 = await prisma.requesterUser.findUnique({
      where: { email: "sompong.it@kmutt.ac.th" },
    });
    const req2 = await prisma.requesterUser.findUnique({
      where: { email: "anong.sta@kmutt.ac.th" },
    });

    requester1Id = req1!.id;
    requester2Id = req2!.id;

    // Create tickets
    const t1Res = await request(app)
      .post("/api/tickets")
      .send({
        requesterId: requester1Id,
        categoryId: 1,
        relatedSystemId: 1,
        requestedPriority: "High",
        summary: "Attachment Test Ticket Req 1",
        description: "Ticket for testing attachment upload, download, and soft removal.",
      });
    ticket1Id = t1Res.body.id;

    const t2Res = await request(app)
      .post("/api/tickets")
      .send({
        requesterId: requester2Id,
        categoryId: 2,
        relatedSystemId: 2,
        requestedPriority: "Low",
        summary: "Attachment Test Ticket Req 2",
        description: "Ticket for testing cross-requester protection.",
      });
    ticket2Id = t2Res.body.id;
  });

  // API-ATT-01: Valid Attachment Upload
  it("API-ATT-01: Uploads a valid PNG file and returns 201 with saved metadata", async () => {
    const pngBuffer = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    ]);

    const res = await request(app)
      .post(`/api/tickets/${ticket1Id}/attachments`)
      .set("x-requester-id", String(requester1Id))
      .attach("file", pngBuffer, "valid_screenshot.png");

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body.originalFilename).toBe("valid_screenshot.png");
    expect(res.body.isRemoved).toBe(false);
    expect(res.body.ticketId).toBe(ticket1Id);
  });

  // API-ATT-02: Cross-Requester Upload Rejection
  it("API-ATT-02: Rejects attachment upload to unowned ticket with 403 Forbidden", async () => {
    const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

    const res = await request(app)
      .post(`/api/tickets/${ticket1Id}/attachments`)
      .set("x-requester-id", String(requester2Id)) // Requester 2 targeting Requester 1's ticket
      .attach("file", pngBuffer, "unauthorized.png");

    expect([403, 404]).toContain(res.status);
    expect(res.body.error.code).toMatch(/FORBIDDEN|NOT_FOUND/);
  });

  // API-ATT-03: File Size Boundary Rejection (>5MB)
  it("API-ATT-03: Rejects files exceeding 5MB with 400 FILE_TOO_LARGE", async () => {
    const oversizedBuffer = Buffer.alloc(5 * 1024 * 1024 + 10);

    const res = await request(app)
      .post(`/api/tickets/${ticket1Id}/attachments`)
      .set("x-requester-id", String(requester1Id))
      .attach("file", oversizedBuffer, "large.png");

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("FILE_TOO_LARGE");
  });

  // API-ATT-04: File Type Boundary Rejection
  it("API-ATT-04: Rejects files with unsupported extensions or MIME types with 400 UNSUPPORTED_FILE_TYPE", async () => {
    const textBuffer = Buffer.from("Hello world script content");

    const res = await request(app)
      .post(`/api/tickets/${ticket1Id}/attachments`)
      .set("x-requester-id", String(requester1Id))
      .attach("file", textBuffer, "malicious.sh");

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("UNSUPPORTED_FILE_TYPE");
  });

  // API-ATT-05: 5 Active Files Ceiling Rejection
  it("API-ATT-05: Rejects upload exceeding 5 active attachments limit with 400 ATTACHMENT_LIMIT_EXCEEDED", async () => {
    const prisma = getPrisma();

    // Create a new dedicated ticket for testing 5-file ceiling
    const runId1 = `${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const dedicatedTicket = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-99-${runId1.slice(-8)}`,
        requesterId: requester1Id,
        categoryId: 1,
        relatedSystemId: 1,
        summary: "Ceiling test ticket",
        description: "Dedicated ticket to test 5 active attachments ceiling.",
        requestedPriority: "Low",
      },
    });

    // Seed 5 active attachments directly
    for (let i = 1; i <= 5; i++) {
      await prisma.attachment.create({
        data: {
          ticketId: dedicatedTicket.id,
          originalFilename: `file_${i}.png`,
          storedFilename: `uuid_stored_${runId1}_${i}.png`,
          mimeType: "image/png",
          fileSize: 1000,
          isRemoved: false,
        },
      });
    }

    const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
    const res = await request(app)
      .post(`/api/tickets/${dedicatedTicket.id}/attachments`)
      .set("x-requester-id", String(requester1Id))
      .attach("file", pngBuffer, "file_6.png");

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("ATTACHMENT_LIMIT_EXCEEDED");
  });

  // API-ATT-06: Tombstone Exclusion from Active Ceiling
  it("API-ATT-06: Permits upload when 1 of 5 attachments is soft-removed (active count = 4)", async () => {
    const prisma = getPrisma();

    const runId2 = `${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const dedicatedTicket = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-99-${runId2.slice(-8)}`,
        requesterId: requester1Id,
        categoryId: 1,
        relatedSystemId: 1,
        summary: "Tombstone reclamation test ticket",
        description: "Testing that soft-removed attachments do not count toward the active limit.",
        requestedPriority: "Low",
      },
    });

    // Seed 4 active attachments and 1 soft-removed attachment
    for (let i = 1; i <= 4; i++) {
      await prisma.attachment.create({
        data: {
          ticketId: dedicatedTicket.id,
          originalFilename: `active_${i}.png`,
          storedFilename: `uuid_act_${runId2}_${i}.png`,
          mimeType: "image/png",
          fileSize: 1000,
          isRemoved: false,
        },
      });
    }

    await prisma.attachment.create({
      data: {
        ticketId: dedicatedTicket.id,
        originalFilename: "removed_old.png",
        storedFilename: `uuid_rem_old_${runId2}.png`,
        mimeType: "image/png",
        fileSize: 1000,
        isRemoved: true,
        removalReason: "Old file",
        removedAt: new Date(),
        removedByRequesterId: requester1Id,
      },
    });

    const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
    const res = await request(app)
      .post(`/api/tickets/${dedicatedTicket.id}/attachments`)
      .set("x-requester-id", String(requester1Id))
      .attach("file", pngBuffer, "new_5th_active.png");

    expect(res.status).toBe(201);
    expect(res.body.originalFilename).toBe("new_5th_active.png");
  });

  // API-ATT-07: Valid Attachment Binary Download
  it("API-ATT-07: Downloads active attachment binary with 200 OK and Content-Disposition header", async () => {
    const prisma = getPrisma();

    // Write a physical mock file to UPLOAD_DIR
    const uniqueName = `test-download-${Date.now()}.png`;
    const physicalPath = path.join(UPLOAD_DIR, uniqueName);
    const fileContent = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x01, 0x02, 0x03]);
    fs.writeFileSync(physicalPath, fileContent);

    const att = await prisma.attachment.create({
      data: {
        ticketId: ticket1Id,
        originalFilename: "download_me.png",
        storedFilename: uniqueName,
        mimeType: "image/png",
        fileSize: fileContent.length,
        isRemoved: false,
      },
    });

    const res = await request(app)
      .get(`/api/attachments/${att.id}/download`)
      .set("x-requester-id", String(requester1Id));

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("image/png");
    expect(res.headers["content-disposition"]).toContain('filename="download_me.png"');
    expect(res.body).toEqual(fileContent);

    // Cleanup physical file
    if (fs.existsSync(physicalPath)) {
      fs.unlinkSync(physicalPath);
    }
  });

  // API-ATT-08: Cross-Requester Download Rejection
  it("API-ATT-08: Rejects download by unowned requester with 403 Forbidden", async () => {
    const prisma = getPrisma();

    const att = await prisma.attachment.create({
      data: {
        ticketId: ticket1Id,
        originalFilename: "private_report.pdf",
        storedFilename: `test-private-${Date.now()}-${Math.random()}.pdf`,
        mimeType: "application/pdf",
        fileSize: 500,
        isRemoved: false,
      },
    });

    // Requester 2 tries to download Requester 1's attachment
    const res = await request(app)
      .get(`/api/attachments/${att.id}/download`)
      .set("x-requester-id", String(requester2Id));

    expect([403, 404]).toContain(res.status);
    expect(res.body.error.code).toMatch(/FORBIDDEN|NOT_FOUND/);
  });

  // API-ATT-09: Soft-Removed File Download Rejection
  it("API-ATT-09: Returns 410 Gone (or 404 Not Found) when downloading soft-removed file", async () => {
    const prisma = getPrisma();

    const att = await prisma.attachment.create({
      data: {
        ticketId: ticket1Id,
        originalFilename: "deleted_doc.pdf",
        storedFilename: `test-deleted-${Date.now()}-${Math.random()}.pdf`,
        mimeType: "application/pdf",
        fileSize: 500,
        isRemoved: true,
        removalReason: "Confidential document uploaded accidentally",
        removedAt: new Date(),
        removedByRequesterId: requester1Id,
      },
    });

    const res = await request(app)
      .get(`/api/attachments/${att.id}/download`)
      .set("x-requester-id", String(requester1Id));

    expect([410, 404]).toContain(res.status);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe("ATTACHMENT_REMOVED");
  });

  // API-ATT-10: Soft-Removal with Valid Reason
  it("API-ATT-10: Soft-removes attachment with valid reason, setting metadata and unlinking disk binary", async () => {
    const prisma = getPrisma();

    // Create physical mock file
    const uniqueName = `test-soft-remove-${Date.now()}-${Math.random()}.png`;
    const physicalPath = path.join(UPLOAD_DIR, uniqueName);
    fs.writeFileSync(physicalPath, Buffer.from("to be removed"));

    const att = await prisma.attachment.create({
      data: {
        ticketId: ticket1Id,
        originalFilename: "to_remove.png",
        storedFilename: uniqueName,
        mimeType: "image/png",
        fileSize: 13,
        isRemoved: false,
      },
    });

    const res = await request(app)
      .delete(`/api/attachments/${att.id}`)
      .set("x-requester-id", String(requester1Id))
      .send({ removalReason: "Uploaded wrong diagram version" });

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(att.id);
    expect(res.body.isRemoved).toBe(true);
    expect(res.body.removalReason).toBe("Uploaded wrong diagram version");
    expect(res.body.removedAt).toBeDefined();
    expect(res.body.removedByRequesterId).toBe(requester1Id);

    // Verify DB update
    const dbRecord = await prisma.attachment.findUnique({
      where: { id: att.id },
    });
    expect(dbRecord?.isRemoved).toBe(true);

    // Verify physical file unlinked
    expect(fs.existsSync(physicalPath)).toBe(false);
  });

  // API-ATT-11: Blank Removal Reason Rejection
  it("API-ATT-11: Rejects removal without reason or with whitespace-only reason with 400 Bad Request", async () => {
    const prisma = getPrisma();

    const att = await prisma.attachment.create({
      data: {
        ticketId: ticket1Id,
        originalFilename: "valid_stay.png",
        storedFilename: `test-stay-${Date.now()}-${Math.random()}.png`,
        mimeType: "image/png",
        fileSize: 100,
        isRemoved: false,
      },
    });

    const res = await request(app)
      .delete(`/api/attachments/${att.id}`)
      .set("x-requester-id", String(requester1Id))
      .send({ removalReason: "   " });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
    expect(res.body.error.fieldErrors).toBeDefined();

    // Verify record was NOT removed
    const dbRecord = await prisma.attachment.findUnique({
      where: { id: att.id },
    });
    expect(dbRecord?.isRemoved).toBe(false);
  });

  // API-ATT-12: Cross-Requester Removal Rejection
  it("API-ATT-12: Rejects soft-removal by non-owner with 403 Forbidden", async () => {
    const prisma = getPrisma();

    const att = await prisma.attachment.create({
      data: {
        ticketId: ticket1Id,
        originalFilename: "owner_only.png",
        storedFilename: `test-owner-${Date.now()}-${Math.random()}.png`,
        mimeType: "image/png",
        fileSize: 100,
        isRemoved: false,
      },
    });

    // Requester 2 attempts to delete Requester 1's attachment
    const res = await request(app)
      .delete(`/api/attachments/${att.id}`)
      .set("x-requester-id", String(requester2Id))
      .send({ removalReason: "Malicious attempt to remove other user's file" });

    expect([403, 404]).toContain(res.status);
    expect(res.body.error.code).toMatch(/FORBIDDEN|NOT_FOUND/);

    const dbRecord = await prisma.attachment.findUnique({
      where: { id: att.id },
    });
    expect(dbRecord?.isRemoved).toBe(false);
  });

  // API-ATT-13: Already Removed Attachment Rejection
  it("API-ATT-13: Rejects removal on already removed attachment with 400 Bad Request", async () => {
    const prisma = getPrisma();

    const att = await prisma.attachment.create({
      data: {
        ticketId: ticket1Id,
        originalFilename: "already_gone.png",
        storedFilename: `test-gone-${Date.now()}-${Math.random()}.png`,
        mimeType: "image/png",
        fileSize: 100,
        isRemoved: true,
        removalReason: "Initial removal reason",
        removedAt: new Date(),
        removedByRequesterId: requester1Id,
      },
    });

    const res = await request(app)
      .delete(`/api/attachments/${att.id}`)
      .set("x-requester-id", String(requester1Id))
      .send({ removalReason: "Trying to remove again" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("ATTACHMENT_ALREADY_REMOVED");
  });
});
