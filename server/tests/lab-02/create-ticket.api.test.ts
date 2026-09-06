import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { seed } from "../../prisma/seed.js";
import { getPrisma } from "../../src/prisma.js";

describe("Feature 7 / Feature 3: Create Ticket Form & Validation API Tests", () => {
  beforeAll(async () => {
    // Seed database with master categories, systems, and requesters
    await seed();
  });

  // API-TKT-01: Valid Ticket Creation (JSON)
  it("API-TKT-01: Creates a ticket with valid JSON payload and returns 201 with TKT-YYYY-NNNNN", async () => {
    const payload = {
      requesterId: 1, // Sompong IT
      categoryId: 4, // Network
      relatedSystemId: 1, // Campus Wi-Fi (or Email)
      requestedPriority: "High",
      summary: "Cannot connect to campus Wi-Fi in building SCL",
      description: "Device repeatedly fails authentication when trying to connect to KMUTT-Secure on the 3rd floor.",
    };

    const res = await request(app)
      .post("/api/tickets")
      .send(payload)
      .set("Content-Type", "application/json");

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(typeof res.body.id).toBe("number");
    expect(res.body.ticketNumber).toMatch(/^TKT-\d{4}-\d{5}$/);
    expect(res.body.ticketNo).toBe(res.body.ticketNumber);
    expect(res.body.currentStatus).toBe("New");
    expect(res.body.status).toBe("New");
    expect(res.body.itPriority).toBeNull();
    expect(res.body.summary).toBe(payload.summary);
    expect(res.body.description).toBe(payload.description);
    expect(res.body.requestedPriority).toBe("High");
    expect(res.body.requester.name).toBe("Sompong IT");
    expect(res.body.category.name).toBe("Network");
    expect(res.body.attachments).toEqual([]);
  });

  // API-TKT-02: Sequential Number Allocation
  it("API-TKT-02: Sequentially created tickets receive consecutive non-colliding numbers", async () => {
    const payloadBase = {
      requesterId: 2, // Anong Staff
      categoryId: 1, // Account and Access
      relatedSystemId: 1,
      requestedPriority: "Medium",
      summary: "Sequential Number Test Ticket",
      description: "Verifying that consecutive tickets increment the sequence without gaps.",
    };

    const res1 = await request(app).post("/api/tickets").send(payloadBase);
    const res2 = await request(app).post("/api/tickets").send(payloadBase);

    expect(res1.status).toBe(201);
    expect(res2.status).toBe(201);

    const match1 = res1.body.ticketNumber.match(/^TKT-(\d{4})-(\d{5})$/);
    const match2 = res2.body.ticketNumber.match(/^TKT-(\d{4})-(\d{5})$/);

    expect(match1).not.toBeNull();
    expect(match2).not.toBeNull();
    expect(match1![1]).toBe(match2![1]); // Same year

    const num1 = parseInt(match1![2], 10);
    const num2 = parseInt(match2![2], 10);
    expect(num2).toBe(num1 + 1);
  });

  // API-TKT-03: Concurrency Safety (Atomic Sequence)
  it("API-TKT-03: Multiple parallel ticket creation requests allocate unique sequential numbers", async () => {
    const payload = {
      requesterId: 3, // Kittisak Student
      categoryId: 2, // Hardware
      relatedSystemId: 6, // Printer
      requestedPriority: "Low",
      summary: "Concurrent Ticket Submission",
      description: "Ensuring database transactions prevent race conditions during parallel submissions.",
    };

    const promises = Array.from({ length: 5 }, () =>
      request(app).post("/api/tickets").send(payload)
    );

    const responses = await Promise.all(promises);

    for (const res of responses) {
      expect(res.status).toBe(201);
    }

    const ticketNumbers = responses.map((r) => r.body.ticketNumber);
    const uniqueNumbers = new Set(ticketNumbers);
    expect(uniqueNumbers.size).toBe(5);
  });

  // API-TKT-04: Missing Required Fields
  it("API-TKT-04: Rejects submission with missing required fields with HTTP 400 and fieldErrors", async () => {
    const res = await request(app).post("/api/tickets").send({
      requesterId: 1,
      summary: "",
      description: "",
    });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
    expect(Array.isArray(res.body.error.fieldErrors)).toBe(true);

    const errorFields = res.body.error.fieldErrors.map((f: { field: string }) => f.field);
    expect(errorFields).toContain("summary");
    expect(errorFields).toContain("description");
    expect(errorFields).toContain("categoryId");
    expect(errorFields).toContain("relatedSystemId");
  });

  // API-TKT-05: Summary Max Length Boundary (100 characters)
  it("API-TKT-05: Enforces 100 character boundary on ticket summary", async () => {
    const validSummary = "A".repeat(100);
    const invalidSummary = "A".repeat(101);

    const validRes = await request(app).post("/api/tickets").send({
      requesterId: 1,
      categoryId: 3,
      relatedSystemId: 4,
      requestedPriority: "Low",
      summary: validSummary,
      description: "Testing maximum summary boundary of exactly 100 characters.",
    });
    expect(validRes.status).toBe(201);

    const invalidRes = await request(app).post("/api/tickets").send({
      requesterId: 1,
      categoryId: 3,
      relatedSystemId: 4,
      requestedPriority: "Low",
      summary: invalidSummary,
      description: "Testing summary exceeding 100 characters boundary.",
    });
    expect(invalidRes.status).toBe(400);
    expect(invalidRes.body.error.fieldErrors.some((f: any) => f.field === "summary")).toBe(true);
  });

  // API-TKT-06: Description Min Length (10) and Max Length (2000) Boundaries
  it("API-TKT-06: Enforces description length boundaries (10 to 2000 characters)", async () => {
    const shortDesc = "123456789"; // 9 characters
    const minDesc = "1234567890"; // 10 characters
    const maxDesc = "B".repeat(2000); // 2000 characters
    const tooLongDesc = "B".repeat(2001); // 2001 characters

    // 9 chars fails
    const resShort = await request(app).post("/api/tickets").send({
      requesterId: 1,
      categoryId: 1,
      relatedSystemId: 1,
      requestedPriority: "Medium",
      summary: "Valid summary",
      description: shortDesc,
    });
    expect(resShort.status).toBe(400);

    // 10 chars passes
    const resMin = await request(app).post("/api/tickets").send({
      requesterId: 1,
      categoryId: 1,
      relatedSystemId: 1,
      requestedPriority: "Medium",
      summary: "Valid summary",
      description: minDesc,
    });
    expect(resMin.status).toBe(201);

    // 2000 chars passes
    const resMax = await request(app).post("/api/tickets").send({
      requesterId: 1,
      categoryId: 1,
      relatedSystemId: 1,
      requestedPriority: "Medium",
      summary: "Valid summary",
      description: maxDesc,
    });
    expect(resMax.status).toBe(201);

    // 2001 chars fails
    const resTooLong = await request(app).post("/api/tickets").send({
      requesterId: 1,
      categoryId: 1,
      relatedSystemId: 1,
      requestedPriority: "Medium",
      summary: "Valid summary",
      description: tooLongDesc,
    });
    expect(resTooLong.status).toBe(400);
  });

  // API-TKT-07: Inactive Requester Rejection
  it("API-TKT-07: Rejects ticket submission referencing an inactive requester", async () => {
    // Look up inactive requester
    const prisma = getPrisma();
    const inactiveUser = await prisma.requesterUser.findFirst({
      where: { isActive: false },
    });
    expect(inactiveUser).not.toBeNull();

    const res = await request(app).post("/api/tickets").send({
      requesterId: inactiveUser!.id,
      categoryId: 1,
      relatedSystemId: 1,
      requestedPriority: "Urgent",
      summary: "Inactive user attempting submission",
      description: "This ticket submission must be rejected because requester is inactive.",
    });

    expect(res.status).toBe(400);
    expect(res.body.error.fieldErrors.some((f: any) => f.field === "requesterId")).toBe(true);
  });

  // Foreign Key Validation: Invalid Category or System
  it("API-TKT-07B: Rejects ticket submission with nonexistent category or system ID", async () => {
    const resCategory = await request(app).post("/api/tickets").send({
      requesterId: 1,
      categoryId: 99999, // nonexistent
      relatedSystemId: 1,
      requestedPriority: "Medium",
      summary: "Invalid Category Test",
      description: "Testing that invalid foreign keys return 400 gracefully.",
    });
    expect(resCategory.status).toBe(400);
    expect(resCategory.body.error.fieldErrors.some((f: any) => f.field === "categoryId")).toBe(true);

    const resSystem = await request(app).post("/api/tickets").send({
      requesterId: 1,
      categoryId: 1,
      relatedSystemId: 99999, // nonexistent
      requestedPriority: "Medium",
      summary: "Invalid System Test",
      description: "Testing that invalid foreign keys return 400 gracefully.",
    });
    expect(resSystem.status).toBe(400);
    expect(resSystem.body.error.fieldErrors.some((f: any) => f.field === "relatedSystemId")).toBe(true);
  });

  // API-TKT-08: Valid Multipart Attachment Upload
  it("API-TKT-08: Creates a ticket with valid attachment via multipart/form-data", async () => {
    const pngBuffer = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      "base64"
    );

    const res = await request(app)
      .post("/api/tickets")
      .field("requesterId", "1")
      .field("categoryId", "4")
      .field("relatedSystemId", "2")
      .field("requestedPriority", "high")
      .field("summary", "Wi-Fi error with screenshot attached")
      .field("description", "Screenshot illustrates the exact authentication error message encountered.")
      .attach("attachments", pngBuffer, "wifi_screenshot.png");

    expect(res.status).toBe(201);
    expect(res.body.ticketNumber).toMatch(/^TKT-\d{4}-\d{5}$/);
    expect(Array.isArray(res.body.attachments)).toBe(true);
    expect(res.body.attachments.length).toBe(1);
    expect(res.body.attachments[0].originalFilename).toBe("wifi_screenshot.png");
    expect(res.body.attachments[0].mimeType).toBe("image/png");
    expect(res.body.attachments[0].fileSize).toBeGreaterThan(0);
  });

  // API-TKT-09: Attachment Type Boundary Rejection
  it("API-TKT-09: Rejects unsupported attachment file formats (.txt, .exe) with HTTP 400", async () => {
    const txtBuffer = Buffer.from("Hello world unsupported text file");

    const res = await request(app)
      .post("/api/tickets")
      .field("requesterId", "1")
      .field("categoryId", "1")
      .field("relatedSystemId", "1")
      .field("requestedPriority", "Low")
      .field("summary", "Testing invalid file type")
      .field("description", "Attempting to attach a plain text file which should be blocked.")
      .attach("attachments", txtBuffer, "notes.txt");

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("UNSUPPORTED_FILE_TYPE");
  });

  // API-TKT-10: Attachment Size Boundary Rejection (> 5 MB)
  it("API-TKT-10: Rejects attachment exceeding 5 MB limit with HTTP 400 FILE_TOO_LARGE", async () => {
    // 5 MB = 5,242,880 bytes. Create buffer of 5,242,881 bytes
    const oversizedBuffer = Buffer.alloc(5 * 1024 * 1024 + 1);

    const res = await request(app)
      .post("/api/tickets")
      .field("requesterId", "1")
      .field("categoryId", "1")
      .field("relatedSystemId", "1")
      .field("requestedPriority", "Low")
      .field("summary", "Testing oversized file attachment")
      .field("description", "Attempting to attach a 5MB+1 byte file which must be rejected.")
      .attach("attachments", oversizedBuffer, "large_report.pdf");

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("FILE_TOO_LARGE");
  });

  // API-TKT-11: Attachment Quantity Boundary Rejection (> 5 files)
  it("API-TKT-11: Rejects ticket submission with more than 5 attachments", async () => {
    const pngBuffer = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      "base64"
    );

    const reqBuilder = request(app)
      .post("/api/tickets")
      .field("requesterId", "1")
      .field("categoryId", "1")
      .field("relatedSystemId", "1")
      .field("requestedPriority", "Low")
      .field("summary", "Testing 6 files limit rejection")
      .field("description", "Submitting 6 attachments at once to verify total file limit enforcement.");

    for (let i = 1; i <= 6; i++) {
      reqBuilder.attach("attachments", pngBuffer, `screenshot_${i}.png`);
    }

    const res = await reqBuilder;
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("ATTACHMENT_LIMIT_EXCEEDED");
  });
});
