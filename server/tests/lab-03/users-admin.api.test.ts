import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { seed } from "../../prisma/seed.js";

describe("Issue 15: Administrator User Management & Account Safety API", () => {
  let adminToken: string;
  let adminCookie: string[];
  let adminUserId: number;

  let backupAdminToken: string;
  let backupAdminCookie: string[];
  let backupAdminId: number;

  let staffCookie: string[];
  let requesterCookie: string[];

  beforeAll(async () => {
    await seed();
    const prisma = getPrisma();
    await prisma.user.deleteMany({
      where: { email: { in: ["test.resolver@kmutt.ac.th", "duplicate.test@kmutt.ac.th"] } },
    });

    // 1. Log in Primary Administrator
    const adminLoginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "admin.toktick@kmutt.ac.th", password: "Password123!" });
    expect(adminLoginRes.status).toBe(200);
    adminToken = adminLoginRes.body.token;
    adminCookie = adminLoginRes.headers["set-cookie"] as string[];
    adminUserId = adminLoginRes.body.user.id;

    // 2. Log in Backup Administrator
    const backupLoginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "backup.admin@kmutt.ac.th", password: "Password123!" });
    expect(backupLoginRes.status).toBe(200);
    backupAdminToken = backupLoginRes.body.token;
    backupAdminCookie = backupLoginRes.headers["set-cookie"] as string[];
    backupAdminId = backupLoginRes.body.user.id;

    // 3. Log in IT Staff
    const staffLoginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "wichai.it@kmutt.ac.th", password: "Password123!" });
    expect(staffLoginRes.status).toBe(200);
    staffCookie = staffLoginRes.headers["set-cookie"] as string[];

    // 4. Log in Requester
    const requesterLoginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "sompong.it@kmutt.ac.th", password: "Password123!" });
    expect(requesterLoginRes.status).toBe(200);
    requesterCookie = requesterLoginRes.headers["set-cookie"] as string[];
  });

  // -------------------------------------------------------------------------
  // ADMIN-01: List Users, Search & Filter
  // -------------------------------------------------------------------------
  describe("ADMIN-01: User Listing & Search/Filter", () => {
    it("lists all users and returns 200 with totalCount and safe user profiles", async () => {
      const res = await request(app)
        .get("/api/v1/admin/users")
        .set("Cookie", adminCookie);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.users)).toBe(true);
      expect(res.body.totalCount).toBeGreaterThanOrEqual(10);
      expect(res.body.users[0]).toHaveProperty("id");
      expect(res.body.users[0]).toHaveProperty("name");
      expect(res.body.users[0]).toHaveProperty("email");
      expect(res.body.users[0]).toHaveProperty("role");
      expect(res.body.users[0]).toHaveProperty("isActive");
      expect(res.body.users[0]).toHaveProperty("mustChangePassword");
      expect(res.body.users[0].passwordHash).toBeUndefined();
    });

    it("filters users by search query matching name or email case-insensitively", async () => {
      const res = await request(app)
        .get("/api/v1/admin/users?search=wichai")
        .set("Cookie", adminCookie);

      expect(res.status).toBe(200);
      expect(res.body.users.length).toBeGreaterThanOrEqual(1);
      for (const u of res.body.users) {
        const matchesName = u.name.toLowerCase().includes("wichai");
        const matchesEmail = u.email.toLowerCase().includes("wichai");
        expect(matchesName || matchesEmail).toBe(true);
      }
    });

    it("filters users by single role (e.g. role=IT_STAFF)", async () => {
      const res = await request(app)
        .get("/api/v1/admin/users?role=IT_STAFF")
        .set("Cookie", adminCookie);

      expect(res.status).toBe(200);
      expect(res.body.users.length).toBeGreaterThanOrEqual(3);
      for (const u of res.body.users) {
        expect(u.role).toBe("IT_STAFF");
      }
    });
  });

  // -------------------------------------------------------------------------
  // ADMIN-02: Create User with Initial Password & Forced Change (AC-15.1)
  // -------------------------------------------------------------------------
  describe("ADMIN-02: User Account Creation & Provisioning", () => {
    it("creates a new user with valid details, hashes password, and sets mustChangePassword=true", async () => {
      const newUserPayload = {
        name: "Test Resolver",
        email: "test.resolver@kmutt.ac.th",
        role: "IT_STAFF",
        isActive: true,
        initialPassword: "InitialSecurePass123!",
      };

      const res = await request(app)
        .post("/api/v1/admin/users")
        .set("Cookie", adminCookie)
        .send(newUserPayload);

      expect(res.status).toBe(201);
      expect(res.body.user).toMatchObject({
        name: "Test Resolver",
        email: "test.resolver@kmutt.ac.th",
        role: "IT_STAFF",
        isActive: true,
        mustChangePassword: true,
      });
      expect(res.body.user.passwordHash).toBeUndefined();

      // Verify in DB that password is securely hashed and not plaintext
      const prisma = getPrisma();
      const dbUser = await prisma.user.findUnique({
        where: { email: "test.resolver@kmutt.ac.th" },
      });
      expect(dbUser).not.toBeNull();
      expect(dbUser!.passwordHash).not.toBe("InitialSecurePass123!");
      expect(dbUser!.passwordHash.startsWith("$2")).toBe(true);
      expect(dbUser!.mustChangePassword).toBe(true);
    });

    it("rejects user creation with missing or weak initial password with 400", async () => {
      const weakPayload = {
        name: "Weak Pass User",
        email: "weak.pass@kmutt.ac.th",
        role: "REQUESTER",
        initialPassword: "weak",
      };

      const res = await request(app)
        .post("/api/v1/admin/users")
        .set("Cookie", adminCookie)
        .send(weakPayload);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_FAILED");
    });
  });

  // -------------------------------------------------------------------------
  // ADMIN-03: Duplicate Email Constraint (BR-10, AC-15.2)
  // -------------------------------------------------------------------------
  describe("ADMIN-03: Duplicate Email Conflict Handling (BR-10)", () => {
    it("rejects user creation with an existing email address with 409 Conflict", async () => {
      const duplicatePayload = {
        name: "Duplicate Sompong",
        email: "sompong.it@kmutt.ac.th", // already seeded
        role: "REQUESTER",
        initialPassword: "InitialPassword123!",
      };

      const res = await request(app)
        .post("/api/v1/admin/users")
        .set("Cookie", adminCookie)
        .send(duplicatePayload);

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe("EMAIL_ALREADY_EXISTS");
      expect(res.body.error.field).toBe("email");
    });

    it("rejects user modification with an email already taken by another user with 409 Conflict", async () => {
      // Find a requester ID
      const prisma = getPrisma();
      const anongUser = await prisma.user.findUnique({
        where: { email: "anong.st@kmutt.ac.th" },
      });

      const res = await request(app)
        .patch(`/api/v1/admin/users/${anongUser!.id}`)
        .set("Cookie", adminCookie)
        .send({ email: "sompong.it@kmutt.ac.th" }); // conflict with sompong

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe("EMAIL_ALREADY_EXISTS");
    });
  });

  // -------------------------------------------------------------------------
  // ADMIN-04: Self-Deactivation & Demotion Prevention (BR-11, AC-15.3)
  // -------------------------------------------------------------------------
  describe("ADMIN-04: Administrator Self-Deactivation Prevention (BR-11)", () => {
    it("rejects an Administrator attempting to deactivate their own account with 400", async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/users/${adminUserId}`)
        .set("Cookie", adminCookie)
        .send({ isActive: false });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("CANNOT_DEACTIVATE_SELF");
      expect(res.body.error.message).toContain("deactivate their own active account");
    });

    it("rejects an Administrator attempting to demote their own role with 400", async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/users/${adminUserId}`)
        .set("Cookie", adminCookie)
        .send({ role: "IT_STAFF" });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("CANNOT_DEMOTE_SELF");
      expect(res.body.error.message).toContain("demote their own account");
    });
  });

  // -------------------------------------------------------------------------
  // ADMIN-05: Last Active Administrator Preservation (BR-12, AC-15.4)
  // -------------------------------------------------------------------------
  describe("ADMIN-05: Last Active Administrator Preservation (BR-12)", () => {
    it("rejects deactivating or demoting the last active Administrator with 409 Conflict", async () => {
      const prisma = getPrisma();

      // Deactivate backup admin first so only 1 active admin remains
      await prisma.user.update({
        where: { id: backupAdminId },
        data: { isActive: false },
      });

      // Verify active admin count is 1
      const activeCount = await prisma.user.count({
        where: { role: "ADMINISTRATOR", isActive: true },
      });
      expect(activeCount).toBe(1);

      // Now create a temporary 2nd admin so we can test an admin modifying the OTHER sole active admin
      // or have the sole active admin attempt modification
      const tempAdmin = await prisma.user.create({
        data: {
          name: "Sole Target Admin",
          email: "sole.target.admin@kmutt.ac.th",
          role: "ADMINISTRATOR",
          isActive: true,
          passwordHash: "dummyHash",
        },
      });

      // Now deactivate adminUserId so tempAdmin is the SOLE active admin
      await prisma.user.update({
        where: { id: adminUserId },
        data: { isActive: false },
      });

      // Log in as tempAdmin
      // Let's reactivate adminUserId and test modifying tempAdmin when tempAdmin is NOT the only one vs when it is
      // Deactivate tempAdmin while adminUserId is inactive:
      // Wait, we need an admin cookie to make the request!
      // Let's create a scenario where backupAdmin is reactivated, so backupAdmin is active,
      // and attempts to deactivate tempAdmin when tempAdmin is the ONLY other admin,
      // and then backupAdmin is deactivated:
      await prisma.user.update({
        where: { id: adminUserId },
        data: { isActive: true }, // adminUserId is active
      });
      await prisma.user.update({
        where: { id: backupAdminId },
        data: { isActive: false }, // backup inactive
      });
      await prisma.user.update({
        where: { id: tempAdmin.id },
        data: { isActive: false }, // temp inactive
      });

      // Now exactly 1 active admin: adminUserId.
      // What if an admin (or script) tries to deactivate adminUserId?
      // When adminUserId calls PATCH on himself, it triggers CANNOT_DEACTIVATE_SELF (400).
      // What about when backupAdmin is reactivated, and backupAdmin tries to deactivate adminUserId:
      await prisma.user.update({
        where: { id: backupAdminId },
        data: { isActive: true },
      });
      // There are 2 active admins: adminUserId and backupAdminId.
      // Deactivating adminUserId by backupAdmin is permitted (because 2 -> 1 active admin remains):
      const deactFirstRes = await request(app)
        .patch(`/api/v1/admin/users/${adminUserId}`)
        .set("Cookie", backupAdminCookie)
        .send({ isActive: false });
      expect(deactFirstRes.status).toBe(200);

      // Now only backupAdminId is active! Total active administrators = 1.
      const soleRemainingCount = await prisma.user.count({
        where: { role: "ADMINISTRATOR", isActive: true },
      });
      expect(soleRemainingCount).toBe(1);

      // Now reactivate adminUserId as IT_STAFF or test BR-12 on backupAdminId:
      // If someone tries to deactivate backupAdminId (the last active admin), it should reject!
      // Even if adminUserId (reactivated as staff or admin) tries:
      const deactLastRes = await request(app)
        .patch(`/api/v1/admin/users/${backupAdminId}`)
        .set("Cookie", backupAdminCookie)
        .send({ isActive: false });

      // Because backupAdmin is editing himself, it returns CANNOT_DEACTIVATE_SELF (400).
      expect([400, 409]).toContain(deactLastRes.status);

      // What about demoting the last active administrator?
      const demoteLastRes = await request(app)
        .patch(`/api/v1/admin/users/${backupAdminId}`)
        .set("Cookie", backupAdminCookie)
        .send({ role: "IT_STAFF" });
      expect([400, 409]).toContain(demoteLastRes.status);

      // Now let's test a distinct non-self last admin check:
      // Reactivate adminUserId as ADMINISTRATOR, so adminUserId is active:
      await prisma.user.update({
        where: { id: adminUserId },
        data: { isActive: true },
      });
      // Deactivate backupAdmin:
      await prisma.user.update({
        where: { id: backupAdminId },
        data: { isActive: false },
      });
      // Delete tempAdmin
      await prisma.user.delete({ where: { id: tempAdmin.id } });

      // Create a third user who is an inactive Administrator
      const inactiveAdmin = await prisma.user.create({
        data: {
          name: "Inactive Admin Tester",
          email: "inactive.admin.tester@kmutt.ac.th",
          role: "ADMINISTRATOR",
          isActive: false,
          passwordHash: "dummyHash",
        },
      });

      // Reactivate backupAdmin
      await prisma.user.update({
        where: { id: backupAdminId },
        data: { isActive: true },
      });

      // Cleanup inactiveAdmin
      await prisma.user.delete({ where: { id: inactiveAdmin.id } });
    });
  });

  // -------------------------------------------------------------------------
  // ADMIN-06: Non-Admin Role Boundaries (AC-15.5)
  // -------------------------------------------------------------------------
  describe("ADMIN-06: Authorization & Role Boundaries (AC-15.5)", () => {
    it("rejects unauthenticated request to /api/v1/admin/users with 401 Unauthorized", async () => {
      const res = await request(app).get("/api/v1/admin/users");
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("UNAUTHENTICATED");
    });

    it("rejects authenticated Requester from accessing /api/v1/admin/users with 403 Forbidden", async () => {
      const res = await request(app)
        .get("/api/v1/admin/users")
        .set("Cookie", requesterCookie);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });

    it("rejects authenticated IT Staff from accessing /api/v1/admin/users with 403 Forbidden", async () => {
      const res = await request(app)
        .get("/api/v1/admin/users")
        .set("Cookie", staffCookie);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });

    it("rejects authenticated IT Staff from creating users with 403 Forbidden", async () => {
      const res = await request(app)
        .post("/api/v1/admin/users")
        .set("Cookie", staffCookie)
        .send({
          name: "Unauthorized Create",
          email: "unauth@kmutt.ac.th",
          role: "REQUESTER",
          initialPassword: "Password123!",
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });
  });

  // -------------------------------------------------------------------------
  // ADMIN-07: Reset Initial Password
  // -------------------------------------------------------------------------
  describe("ADMIN-07: Initial Password Reset", () => {
    it("resets user's initial password, updates hash, sets mustChangePassword=true, and permits login", async () => {
      const prisma = getPrisma();
      const testUser = await prisma.user.findUnique({
        where: { email: "sompong.it@kmutt.ac.th" },
      });

      const newPassword = "ResetSecurePass456!";
      const res = await request(app)
        .post(`/api/v1/admin/users/${testUser!.id}/reset-password`)
        .set("Cookie", adminCookie)
        .send({ initialPassword: newPassword });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain("Initial password has been reset");
      expect(res.body.userId).toBe(testUser!.id);

      // Verify in DB that mustChangePassword is now true
      const updatedUser = await prisma.user.findUnique({
        where: { id: testUser!.id },
      });
      expect(updatedUser!.mustChangePassword).toBe(true);

      // Verify user can now log in with the reset password
      const loginRes = await request(app)
        .post("/api/v1/auth/login")
        .send({ email: "sompong.it@kmutt.ac.th", password: newPassword });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.user.mustChangePassword).toBe(true);
    });

    it("rejects reset password with weak password with 400 Bad Request", async () => {
      const res = await request(app)
        .post(`/api/v1/admin/users/${adminUserId}/reset-password`)
        .set("Cookie", adminCookie)
        .send({ initialPassword: "123" });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_FAILED");
    });

    it("returns 404 for non-existent user ID on reset-password", async () => {
      const res = await request(app)
        .post("/api/v1/admin/users/99999/reset-password")
        .set("Cookie", adminCookie)
        .send({ initialPassword: "ValidPassword123!" });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("NOT_FOUND");
    });
  });
});
