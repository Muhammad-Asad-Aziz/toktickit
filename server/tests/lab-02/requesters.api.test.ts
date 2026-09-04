import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { seed } from "../../prisma/seed.js";
import { getPrisma } from "../../src/prisma.js";

describe("Feature 2: Development Requester Context & Master Data APIs", () => {
  beforeAll(async () => {
    // Ensure database is seeded before running API assertions
    await seed();
  });

  // API-01: GET /api/requesters returns 200 and active users
  it("API-01: GET /api/requesters returns HTTP 200 with active users array", async () => {
    const res = await request(app).get("/api/requesters");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(4);
  });

  // API-02: Inactive requester exclusion
  it("API-02: GET /api/requesters strictly excludes inactive users (Prasert Inactive)", async () => {
    const res = await request(app).get("/api/requesters");
    expect(res.status).toBe(200);
    const inactiveUser = res.body.find(
      (user: { email: string }) => user.email === "prasert.ina@kmutt.ac.th"
    );
    expect(inactiveUser).toBeUndefined();
  });

  // API-03: Required schema fields on returned requesters
  it("API-03: GET /api/requesters returns objects with id, name, lowercase email, department, and isActive: true", async () => {
    const res = await request(app).get("/api/requesters");
    expect(res.status).toBe(200);
    for (const user of res.body) {
      expect(typeof user.id).toBe("number");
      expect(typeof user.name).toBe("string");
      expect(typeof user.email).toBe("string");
      expect(user.email).toBe(user.email.toLowerCase());
      expect(user.isActive).toBe(true);
    }
  });

  // API-04: GET /api/related-systems returns active systems
  it("API-04: GET /api/related-systems returns HTTP 200 with at least 6 active systems", async () => {
    const res = await request(app).get("/api/related-systems");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(6);

    const systemNames = res.body.map((s: { name: string }) => s.name);
    expect(systemNames).toContain("Email");
    expect(systemNames).toContain("Campus Wi-Fi");
    expect(systemNames).toContain("VPN");
    expect(systemNames).toContain("LEB2 App");
  });

  // API-05: GET /api/categories returns exactly 4 categories (backward compatibility)
  it("API-05: GET /api/categories returns HTTP 200 with exactly 4 seeded categories in id order", async () => {
    const res = await request(app).get("/api/categories");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      { id: 1, name: "Account and Access" },
      { id: 2, name: "Hardware" },
      { id: 3, name: "Software" },
      { id: 4, name: "Network" },
    ]);
  });

  // API-06: Database seed script idempotency
  it("API-06: Calling seed() twice consecutively executes safely with zero duplicate key errors", async () => {
    const prisma = getPrisma();
    
    // Call seed once
    await seed(prisma);
    const catCount1 = await prisma.category.count();
    const reqCount1 = await prisma.requesterUser.count();
    const sysCount1 = await prisma.relatedSystem.count();

    // Call seed second time
    await seed(prisma);
    const catCount2 = await prisma.category.count();
    const reqCount2 = await prisma.requesterUser.count();
    const sysCount2 = await prisma.relatedSystem.count();

    expect(catCount2).toBe(catCount1);
    expect(reqCount2).toBe(reqCount1);
    expect(sysCount2).toBe(sysCount1);
  });
});
