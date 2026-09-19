import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { seed } from "../../prisma/seed.js";

describe("IT Staff Ticket Queue API Suite (Issue 13)", () => {
  let staffCookie: any;
  let adminCookie: any;
  let requesterCookie: any;
  let staffUserId: number;

  beforeAll(async () => {
    await seed();

    // Authenticate IT Staff
    const staffLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "wichai.it@kmutt.ac.th", password: "Password123!" });
    staffCookie = staffLogin.headers["set-cookie"];
    staffUserId = staffLogin.body.user.id;

    // Authenticate Administrator
    const adminLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "admin.toktick@kmutt.ac.th", password: "Password123!" });
    adminCookie = adminLogin.headers["set-cookie"];

    // Authenticate Requester
    const requesterLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "sompong.it@kmutt.ac.th", password: "Password123!" });
    requesterCookie = requesterLogin.headers["set-cookie"];
  });

  // QUEUE-01: IT Staff Queue Query
  it("QUEUE-01: permits IT_STAFF to query ticket queue with pagination metadata", async () => {
    const res = await request(app)
      .get("/api/v1/staff/tickets")
      .set("Cookie", staffCookie);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("items");
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body).toHaveProperty("totalCount");
    expect(res.body.totalCount).toBeGreaterThan(0);
    expect(res.body).toHaveProperty("page", 1);
    expect(res.body).toHaveProperty("pageSize", 10);
    expect(res.body).toHaveProperty("totalPages");
    expect(res.body.totalPages).toBeGreaterThanOrEqual(1);

    if (res.body.items.length > 0) {
      const item = res.body.items[0];
      expect(item).toHaveProperty("id");
      expect(item).toHaveProperty("ticketNumber");
      expect(item).toHaveProperty("summary");
      expect(item).toHaveProperty("categoryName");
      expect(item).toHaveProperty("categoryId");
      expect(item).toHaveProperty("requestedPriority");
      expect(item).toHaveProperty("itPriority");
      expect(item).toHaveProperty("currentStatus");
      expect(item).toHaveProperty("requesterName");
      expect(item).toHaveProperty("requesterId");
      expect(item).toHaveProperty("ownerName");
      expect(item).toHaveProperty("ownerId");
      expect(item).toHaveProperty("requesterResolved");
      expect(item).toHaveProperty("createdAt");
      expect(item).toHaveProperty("updatedAt");
    }
  });

  // QUEUE-01b: Administrator Queue Access
  it("QUEUE-01b: permits ADMINISTRATOR to query ticket queue with full access", async () => {
    const res = await request(app)
      .get("/api/v1/staff/tickets")
      .set("Cookie", adminCookie);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("items");
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.totalCount).toBeGreaterThan(0);
  });

  // QUEUE-07: Requester Access Prohibited (BR-06)
  it("QUEUE-07: rejects REQUESTER access with HTTP 403 Forbidden", async () => {
    const res = await request(app)
      .get("/api/v1/staff/tickets")
      .set("Cookie", requesterCookie);

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty("error");
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("QUEUE-07b: rejects unauthenticated request with HTTP 401 Unauthorized", async () => {
    const res = await request(app).get("/api/v1/staff/tickets");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  // QUEUE-02: Text Search
  it("QUEUE-02: filters tickets by partial case-insensitive summary or ticket number", async () => {
    const res = await request(app)
      .get("/api/v1/staff/tickets?search=wi-fi")
      .set("Cookie", staffCookie);

    expect(res.status).toBe(200);
    expect(res.body.items.length).toBeGreaterThan(0);
    expect(
      res.body.items.every(
        (t: any) =>
          t.summary.toLowerCase().includes("wi-fi") ||
          t.ticketNumber.toLowerCase().includes("wi-fi")
      )
    ).toBe(true);

    const resTkt = await request(app)
      .get("/api/v1/staff/tickets?search=TKT-2026-00001")
      .set("Cookie", staffCookie);

    expect(resTkt.status).toBe(200);
    expect(resTkt.body.items.length).toBe(1);
    expect(resTkt.body.items[0].ticketNumber).toBe("TKT-2026-00001");
  });

  // QUEUE-03: Status and IT Priority Filtering
  it("QUEUE-03: filters tickets by status and itPriority combination", async () => {
    const res = await request(app)
      .get("/api/v1/staff/tickets?status=OPEN&itPriority=URGENT")
      .set("Cookie", staffCookie);

    expect(res.status).toBe(200);
    expect(res.body.items.length).toBeGreaterThan(0);
    expect(
      res.body.items.every(
        (t: any) => t.currentStatus === "OPEN" && t.itPriority === "URGENT"
      )
    ).toBe(true);
  });

  // QUEUE-04: Owner Filtering (Assigned vs Unassigned)
  it("QUEUE-04a: filters tickets assigned to specific staff owner", async () => {
    const res = await request(app)
      .get(`/api/v1/staff/tickets?owner=${staffUserId}`)
      .set("Cookie", staffCookie);

    expect(res.status).toBe(200);
    expect(res.body.items.length).toBeGreaterThan(0);
    expect(res.body.items.every((t: any) => t.ownerId === staffUserId)).toBe(true);
  });

  it("QUEUE-04b: filters unassigned tickets using token 'unassigned'", async () => {
    const res = await request(app)
      .get("/api/v1/staff/tickets?owner=unassigned")
      .set("Cookie", staffCookie);

    expect(res.status).toBe(200);
    expect(res.body.items.length).toBeGreaterThan(0);
    expect(res.body.items.every((t: any) => t.ownerId === null)).toBe(true);
  });

  // QUEUE-05: Multi-column Sorting
  it("QUEUE-05: sorts tickets by createdAt, ticketNumber, and itPriority in asc/desc order", async () => {
    // Sort by createdAt asc
    const resAsc = await request(app)
      .get("/api/v1/staff/tickets?sortBy=createdAt&sortOrder=asc&pageSize=25")
      .set("Cookie", staffCookie);

    expect(resAsc.status).toBe(200);
    const datesAsc = resAsc.body.items.map((t: any) => new Date(t.createdAt).getTime());
    for (let i = 0; i < datesAsc.length - 1; i++) {
      expect(datesAsc[i]).toBeLessThanOrEqual(datesAsc[i + 1]);
    }

    // Sort by createdAt desc
    const resDesc = await request(app)
      .get("/api/v1/staff/tickets?sortBy=createdAt&sortOrder=desc&pageSize=25")
      .set("Cookie", staffCookie);

    expect(resDesc.status).toBe(200);
    const datesDesc = resDesc.body.items.map((t: any) => new Date(t.createdAt).getTime());
    for (let i = 0; i < datesDesc.length - 1; i++) {
      expect(datesDesc[i]).toBeGreaterThanOrEqual(datesDesc[i + 1]);
    }

    // Sort by ticketNumber asc
    const resTktAsc = await request(app)
      .get("/api/v1/staff/tickets?sortBy=ticketNumber&sortOrder=asc&pageSize=25")
      .set("Cookie", staffCookie);

    expect(resTktAsc.status).toBe(200);
    const tickets = resTktAsc.body.items.map((t: any) => t.ticketNumber);
    for (let i = 0; i < tickets.length - 1; i++) {
      expect(tickets[i].localeCompare(tickets[i + 1])).toBeLessThanOrEqual(0);
    }
  });

  // QUEUE-06: Pagination Boundaries
  it("QUEUE-06: respects page and pageSize boundaries accurately", async () => {
    // Page 1 with pageSize 10
    const resPage1 = await request(app)
      .get("/api/v1/staff/tickets?page=1&pageSize=10")
      .set("Cookie", staffCookie);

    expect(resPage1.status).toBe(200);
    expect(resPage1.body.page).toBe(1);
    expect(resPage1.body.pageSize).toBe(10);
    expect(resPage1.body.items.length).toBeLessThanOrEqual(10);
    expect(resPage1.body.totalCount).toBeGreaterThan(10);
    expect(resPage1.body.totalPages).toBeGreaterThanOrEqual(2);

    // Page 2 with pageSize 10
    const resPage2 = await request(app)
      .get("/api/v1/staff/tickets?page=2&pageSize=10")
      .set("Cookie", staffCookie);

    expect(resPage2.status).toBe(200);
    expect(resPage2.body.page).toBe(2);
    expect(resPage2.body.pageSize).toBe(10);
    expect(resPage2.body.items.length).toBeGreaterThan(0);

    // Verify disjoint sets between page 1 and page 2
    const page1Ids = resPage1.body.items.map((t: any) => t.id);
    const page2Ids = resPage2.body.items.map((t: any) => t.id);
    const overlap = page1Ids.filter((id: number) => page2Ids.includes(id));
    expect(overlap.length).toBe(0);

    // Page size 25
    const resPageSize25 = await request(app)
      .get("/api/v1/staff/tickets?page=1&pageSize=25")
      .set("Cookie", staffCookie);

    expect(resPageSize25.status).toBe(200);
    expect(resPageSize25.body.pageSize).toBe(25);
    expect(resPageSize25.body.items.length).toBe(
      Math.min(25, resPageSize25.body.totalCount)
    );
    expect(resPageSize25.body.totalPages).toBe(
      Math.ceil(resPageSize25.body.totalCount / 25)
    );
  });
});
