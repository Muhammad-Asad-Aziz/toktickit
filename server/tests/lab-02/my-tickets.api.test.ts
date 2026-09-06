import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import crypto from "node:crypto";
import { app } from "../../src/app.js";
import { seed } from "../../prisma/seed.js";
import { getPrisma } from "../../src/prisma.js";

describe("Feature 8 / Feature 4: My Tickets API Tests", () => {
  let requester1Id: number;
  let requester2Id: number;
  let inactiveRequesterId: number;
  let categoryNetworkId: number;
  let categoryHwId: number;
  let systemWifiId: number;

  beforeAll(async () => {
    // Seed standard reference data
    await seed();
    const prisma = getPrisma();

    // Clean up any lingering test-specific artifacts from previous aborted runs
    await prisma.attachment.deleteMany({
      where: { ticket: { ticketNumber: { startsWith: "TKT-2026-90" } } },
    });
    await prisma.ticket.deleteMany({
      where: { ticketNumber: { startsWith: "TKT-2026-90" } },
    });
    await prisma.requesterUser.deleteMany({
      where: {
        email: {
          in: [
            "mytickets.tester1@kmutt.ac.th",
            "mytickets.tester2@kmutt.ac.th",
            "mytickets.inactive@kmutt.ac.th",
          ],
        },
      },
    });

    // Create dedicated test requesters for strict test isolation across parallel suites
    const tester1 = await prisma.requesterUser.create({
      data: {
        name: "MyTickets Tester 1",
        email: "mytickets.tester1@kmutt.ac.th",
        department: "Information Technology Office",
        isActive: true,
      },
    });
    const tester2 = await prisma.requesterUser.create({
      data: {
        name: "MyTickets Tester 2",
        email: "mytickets.tester2@kmutt.ac.th",
        department: "Academic Affairs Office",
        isActive: true,
      },
    });
    const testerInactive = await prisma.requesterUser.create({
      data: {
        name: "MyTickets Inactive",
        email: "mytickets.inactive@kmutt.ac.th",
        department: "Human Resources Office",
        isActive: false,
      },
    });

    requester1Id = tester1.id;
    requester2Id = tester2.id;
    inactiveRequesterId = testerInactive.id;

    // Retrieve test category and systems
    const networkCat = await prisma.category.findUnique({ where: { name: "Network" } });
    const hwCat = await prisma.category.findUnique({ where: { name: "Hardware" } });
    const wifiSys = await prisma.relatedSystem.findUnique({ where: { name: "Campus Wi-Fi" } });

    categoryNetworkId = networkCat!.id;
    categoryHwId = hwCat!.id;
    systemWifiId = wifiSys!.id;

    // Seed 3 tickets for Requester 1
    // Ticket 1: High priority, Network, New, Wi-Fi summary
    const t1 = await prisma.ticket.create({
      data: {
        ticketNumber: "TKT-2026-90001",
        requesterId: requester1Id,
        categoryId: categoryNetworkId,
        relatedSystemId: systemWifiId,
        summary: "Cannot connect to campus Wi-Fi in building SCL",
        description: "Wi-Fi authentication keeps failing on 3rd floor.",
        requestedPriority: "High",
        itPriority: "Medium",
        currentStatus: "New",
        createdAt: new Date("2026-09-01T10:00:00Z"),
      },
    });

    // Add 2 active attachments and 1 removed attachment to Ticket 1
    await prisma.attachment.create({
      data: {
        ticketId: t1.id,
        originalFilename: "wifi_diag.png",
        storedFilename: `${crypto.randomUUID()}.png`,
        mimeType: "image/png",
        fileSize: 102400,
        isRemoved: false,
      },
    });
    await prisma.attachment.create({
      data: {
        ticketId: t1.id,
        originalFilename: "speedtest.pdf",
        storedFilename: `${crypto.randomUUID()}.pdf`,
        mimeType: "application/pdf",
        fileSize: 204800,
        isRemoved: false,
      },
    });
    await prisma.attachment.create({
      data: {
        ticketId: t1.id,
        originalFilename: "wrong_file.jpg",
        storedFilename: `${crypto.randomUUID()}.jpg`,
        mimeType: "image/jpeg",
        fileSize: 51200,
        isRemoved: true,
        removalReason: "Uploaded by mistake",
      },
    });

    // Ticket 2: Low priority, Hardware, Assigned, Printer summary, UNASSIGNED IT Priority (null)
    await prisma.ticket.create({
      data: {
        ticketNumber: "TKT-2026-90002",
        requesterId: requester1Id,
        categoryId: categoryHwId,
        relatedSystemId: systemWifiId,
        summary: "Department shared printer offline",
        description: "Paper jam error code 502.",
        requestedPriority: "Low",
        itPriority: null, // UNASSIGNED
        currentStatus: "Assigned",
        createdAt: new Date("2026-09-02T10:00:00Z"),
      },
    });

    // Ticket 3: Urgent priority, Network, New, VPN issue, UNASSIGNED IT Priority (null)
    await prisma.ticket.create({
      data: {
        ticketNumber: "TKT-2026-90003",
        requesterId: requester1Id,
        categoryId: categoryNetworkId,
        relatedSystemId: systemWifiId,
        summary: "VPN portal login loop",
        description: "Cannot access internal grading portal from home.",
        requestedPriority: "Urgent",
        itPriority: null, // UNASSIGNED
        currentStatus: "New",
        createdAt: new Date("2026-09-03T10:00:00Z"),
      },
    });

    // Seed 2 tickets for Requester 2
    await prisma.ticket.create({
      data: {
        ticketNumber: "TKT-2026-90004",
        requesterId: requester2Id,
        categoryId: categoryNetworkId,
        relatedSystemId: systemWifiId,
        summary: "Requester 2 secret ticket Wi-Fi issue",
        description: "Belongs to Requester 2 only.",
        requestedPriority: "High",
        itPriority: "High",
        currentStatus: "New",
        createdAt: new Date("2026-09-04T10:00:00Z"),
      },
    });
    await prisma.ticket.create({
      data: {
        ticketNumber: "TKT-2026-90005",
        requesterId: requester2Id,
        categoryId: categoryHwId,
        relatedSystemId: systemWifiId,
        summary: "Requester 2 laptop screen flicker",
        description: "Hardware defect on university laptop.",
        requestedPriority: "Medium",
        itPriority: null,
        currentStatus: "In Progress",
        createdAt: new Date("2026-09-05T10:00:00Z"),
      },
    });
  });

  afterAll(async () => {
    const prisma = getPrisma();
    await prisma.attachment.deleteMany({
      where: { ticket: { ticketNumber: { startsWith: "TKT-2026-90" } } },
    });
    await prisma.ticket.deleteMany({
      where: { ticketNumber: { startsWith: "TKT-2026-90" } },
    });
    await prisma.requesterUser.deleteMany({
      where: {
        email: {
          in: [
            "mytickets.tester1@kmutt.ac.th",
            "mytickets.tester2@kmutt.ac.th",
            "mytickets.inactive@kmutt.ac.th",
          ],
        },
      },
    });
  });

  // API-MYT-01: Owned Tickets Retrieval
  it("API-MYT-01: Returns HTTP 200 with paginated array of owned tickets for active requester", async () => {
    const res = await request(app)
      .get("/api/tickets")
      .set("x-requester-id", String(requester1Id));

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("items");
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.items.length).toBe(3);
    expect(res.body.totalCount).toBe(3);
    expect(res.body.totalPages).toBe(1);
    expect(res.body.currentPage).toBe(1);
    expect(res.body.page).toBe(1);
    expect(res.body.pageSize).toBe(10);

    // Verify relations and aliases
    const first = res.body.items[0];
    expect(first).toHaveProperty("ticketNumber");
    expect(first).toHaveProperty("ticketNo");
    expect(first.ticketNo).toBe(first.ticketNumber);
    expect(first).toHaveProperty("currentStatus");
    expect(first).toHaveProperty("status");
    expect(first.category).toHaveProperty("name");
    expect(first.relatedSystem).toHaveProperty("name");
  });

  // API-MYT-02: Cross-Requester Ownership Boundary
  it("API-MYT-02: Strictly isolates tickets between requesters (Requester 2 sees only own 2 tickets)", async () => {
    const res = await request(app)
      .get("/api/tickets")
      .set("x-requester-id", String(requester2Id));

    expect(res.status).toBe(200);
    expect(res.body.items.length).toBe(2);
    expect(res.body.totalCount).toBe(2);

    // Assert that zero tickets belonging to Requester 1 appear in Requester 2's response
    const ticketNumbers = res.body.items.map((t: any) => t.ticketNumber);
    expect(ticketNumbers).toContain("TKT-2026-90004");
    expect(ticketNumbers).toContain("TKT-2026-90005");
    expect(ticketNumbers).not.toContain("TKT-2026-90001");
    expect(ticketNumbers).not.toContain("TKT-2026-90002");
    expect(ticketNumbers).not.toContain("TKT-2026-90003");
  });

  // API-MYT-03: Missing Requester Header Rejection
  it("API-MYT-03: Rejects missing x-requester-id with HTTP 400 and strictly ignores query ?requesterId=1", async () => {
    // Attempt with no header and query parameter spoofing
    const res = await request(app)
      .get(`/api/tickets?requesterId=${requester1Id}`);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("MISSING_REQUESTER_ID");
    expect(res.body.error.message).toContain("x-requester-id");
  });

  // API-MYT-04: Inactive Requester Rejection
  it("API-MYT-04: Rejects inactive development requester with HTTP 400 VALIDATION_FAILED", async () => {
    const res = await request(app)
      .get("/api/tickets")
      .set("x-requester-id", String(inactiveRequesterId));

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
    expect(res.body.error.fieldErrors[0].field).toBe("requesterId");
  });

  // API-MYT-05: Free-Text Search by Ticket Number
  it("API-MYT-05: Filters tickets by exact ticketNumber", async () => {
    const res = await request(app)
      .get("/api/tickets?search=TKT-2026-90001")
      .set("x-requester-id", String(requester1Id));

    expect(res.status).toBe(200);
    expect(res.body.items.length).toBe(1);
    expect(res.body.items[0].ticketNumber).toBe("TKT-2026-90001");
  });

  // API-MYT-06: Free-Text Search by Summary Keyword
  it("API-MYT-06: Performs case-insensitive search across summary", async () => {
    const res = await request(app)
      .get("/api/tickets?search=wi-fi")
      .set("x-requester-id", String(requester1Id));

    expect(res.status).toBe(200);
    expect(res.body.items.length).toBe(1);
    expect(res.body.items[0].summary).toContain("Cannot connect to campus Wi-Fi");
  });

  // API-MYT-07: Cross-Requester Search Isolation
  it("API-MYT-07: Cross-requester search returns 0 results when searching for another user's ticket", async () => {
    // Requester 1 searches for Requester 2's ticket number
    const res = await request(app)
      .get("/api/tickets?search=TKT-2026-90004")
      .set("x-requester-id", String(requester1Id));

    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([]);
    expect(res.body.totalCount).toBe(0);
  });

  // API-MYT-08: Category Filtering
  it("API-MYT-08: Filters tickets by Category ID or Category Name", async () => {
    // By ID
    const resById = await request(app)
      .get(`/api/tickets?category=${categoryHwId}`)
      .set("x-requester-id", String(requester1Id));

    expect(resById.status).toBe(200);
    expect(resById.body.items.length).toBe(1);
    expect(resById.body.items[0].category.name).toBe("Hardware");

    // By Name
    const resByName = await request(app)
      .get("/api/tickets?category=Network")
      .set("x-requester-id", String(requester1Id));

    expect(resByName.status).toBe(200);
    expect(resByName.body.items.length).toBe(2);
    expect(resByName.body.items.every((t: any) => t.category.name === "Network")).toBe(true);
  });

  // API-MYT-09: Priority & Status Filtering (including itPriority = UNASSIGNED)
  it("API-MYT-09: Filters by priority, status, and itPriority=UNASSIGNED matching null", async () => {
    // Priority + Status
    const resPriStatus = await request(app)
      .get("/api/tickets?requestedPriority=High&status=New")
      .set("x-requester-id", String(requester1Id));

    expect(resPriStatus.status).toBe(200);
    expect(resPriStatus.body.items.length).toBe(1);
    expect(resPriStatus.body.items[0].ticketNumber).toBe("TKT-2026-90001");

    // IT Priority = UNASSIGNED (should match tickets 2 and 3 where itPriority is null)
    const resUnassigned = await request(app)
      .get("/api/tickets?itPriority=UNASSIGNED")
      .set("x-requester-id", String(requester1Id));

    expect(resUnassigned.status).toBe(200);
    expect(resUnassigned.body.items.length).toBe(2);
    expect(resUnassigned.body.items.every((t: any) => t.itPriority === null)).toBe(true);
  });

  // API-MYT-10: Bounded Pagination Math & Fallbacks
  it("API-MYT-10: Handles pagination math, out-of-bounds requests, and non-numeric fallbacks", async () => {
    // Negative or non-numeric page normalizes to 1
    const resNormalize = await request(app)
      .get("/api/tickets?page=-5&pageSize=invalid")
      .set("x-requester-id", String(requester1Id));

    expect(resNormalize.status).toBe(200);
    expect(resNormalize.body.currentPage).toBe(1);
    expect(resNormalize.body.pageSize).toBe(10);

    // Page beyond totalPages returns empty items array with valid envelope
    const resOutOfBounds = await request(app)
      .get("/api/tickets?page=99&pageSize=10")
      .set("x-requester-id", String(requester1Id));

    expect(resOutOfBounds.status).toBe(200);
    expect(resOutOfBounds.body.items).toEqual([]);
    expect(resOutOfBounds.body.currentPage).toBe(99);
    expect(resOutOfBounds.body.totalCount).toBe(3);
    expect(resOutOfBounds.body.totalPages).toBe(1);

    // Zero records yields totalPages: 0
    const resZero = await request(app)
      .get("/api/tickets?search=nonexistentterm")
      .set("x-requester-id", String(requester1Id));

    expect(resZero.status).toBe(200);
    expect(resZero.body.items).toEqual([]);
    expect(resZero.body.totalCount).toBe(0);
    expect(resZero.body.totalPages).toBe(0);
  });

  // API-MYT-11: Column Sorting (ASC vs DESC)
  it("API-MYT-11: Correctly sorts tickets by createdAt in ascending and descending order", async () => {
    const resDesc = await request(app)
      .get("/api/tickets?sortBy=createdAt&sortOrder=desc")
      .set("x-requester-id", String(requester1Id));

    expect(resDesc.status).toBe(200);
    expect(resDesc.body.items[0].ticketNumber).toBe("TKT-2026-90003"); // Sep 3
    expect(resDesc.body.items[2].ticketNumber).toBe("TKT-2026-90001"); // Sep 1

    const resAsc = await request(app)
      .get("/api/tickets?sortBy=createdAt&sortOrder=asc")
      .set("x-requester-id", String(requester1Id));

    expect(resAsc.status).toBe(200);
    expect(resAsc.body.items[0].ticketNumber).toBe("TKT-2026-90001"); // Sep 1
    expect(resAsc.body.items[2].ticketNumber).toBe("TKT-2026-90003"); // Sep 3
  });

  // API-MYT-12: Active Attachment Count Aggregation
  it("API-MYT-12: attachmentCount counts only active non-removed attachments", async () => {
    const res = await request(app)
      .get("/api/tickets?search=TKT-2026-90001")
      .set("x-requester-id", String(requester1Id));

    expect(res.status).toBe(200);
    expect(res.body.items.length).toBe(1);
    // Ticket 1 has 2 active attachments and 1 soft-removed attachment
    expect(res.body.items[0].attachmentCount).toBe(2);
  });
});
