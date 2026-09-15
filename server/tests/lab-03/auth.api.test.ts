import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { seed } from "../../prisma/seed.js";

describe("Issue 12: Authentication API & Security Protocols", () => {
  beforeAll(async () => {
    await seed();
  });

  // AUTH-01: Valid Login
  it("AUTH-01: logs in an active user, returns 200, sets session cookie and returns user profile without passwordHash", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "sompong.it@kmutt.ac.th", password: "Password123!" });

    expect(res.status).toBe(200);
    expect(res.headers["set-cookie"]).toBeDefined();
    expect(res.headers["set-cookie"][0]).toContain("toktickit_session=");
    expect(res.body.user).toMatchObject({
      email: "sompong.it@kmutt.ac.th",
      role: "REQUESTER",
      mustChangePassword: false,
      isActive: true,
    });
    expect(res.body.user.passwordHash).toBeUndefined();
    expect(res.body.token).toBeDefined();
  });

  // AUTH-02: Incorrect Password
  it("AUTH-02: returns 401 with generic safe error for incorrect password", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "sompong.it@kmutt.ac.th", password: "WrongPassword999!" });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
    expect(res.body.error.message).toBe("Invalid email or password");
  });

  // AUTH-03: Inactive User Account (BR-01 Anti-Enumeration)
  it("AUTH-03: returns 401 generic safe error for inactive account without disclosing existence or status", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "prasert.ina@kmutt.ac.th", password: "Password123!" });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
    expect(res.body.error.message).toBe("Invalid email or password");
  });

  // AUTH-04: Authenticated /me
  it("AUTH-04: retrieves current authenticated user profile via GET /api/v1/auth/me", async () => {
    const loginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "wichai.it@kmutt.ac.th", password: "Password123!" });

    const cookie = loginRes.headers["set-cookie"];

    const meRes = await request(app)
      .get("/api/v1/auth/me")
      .set("Cookie", cookie);

    expect(meRes.status).toBe(200);
    expect(meRes.body.user).toMatchObject({
      email: "wichai.it@kmutt.ac.th",
      role: "IT_STAFF",
      isActive: true,
    });
  });

  // AUTH-05: Unauthenticated /me
  it("AUTH-05: returns 401 Unauthorized when requesting /me without session", async () => {
    const res = await request(app).get("/api/v1/auth/me");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  // AUTH-06: Logout Session Invalidation
  it("AUTH-06: logs out user, clears session cookie, and invalidates subsequent /me requests", async () => {
    const loginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "admin.toktick@kmutt.ac.th", password: "Password123!" });

    const cookie = loginRes.headers["set-cookie"];

    const logoutRes = await request(app)
      .post("/api/v1/auth/logout")
      .set("Cookie", cookie);

    expect(logoutRes.status).toBe(200);
    expect(logoutRes.body.message).toBe("Successfully logged out.");

    // Subsequent request without cookie returns 401
    const meRes = await request(app).get("/api/v1/auth/me");
    expect(meRes.status).toBe(401);
  });

  // AUTH-07: Mandatory Password Change Route Interception (BR-02)
  it("AUTH-07: intercepts operational routes with 403 PASSWORD_CHANGE_REQUIRED for users with mustChangePassword = true", async () => {
    const loginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "new.requester@kmutt.ac.th", password: "InitialPass123!" });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.user.mustChangePassword).toBe(true);

    const cookie = loginRes.headers["set-cookie"];

    const ticketRes = await request(app)
      .get("/api/v1/tickets")
      .set("Cookie", cookie);

    expect(ticketRes.status).toBe(403);
    expect(ticketRes.body.error.code).toBe("PASSWORD_CHANGE_REQUIRED");
  });

  // AUTH-08: Successful Password Change Flow
  it("AUTH-08: updates password, clears mustChangePassword flag, and enables login with new credentials", async () => {
    // 1. Log in with initial credentials
    const loginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "new.requester@kmutt.ac.th", password: "InitialPass123!" });

    const cookie = loginRes.headers["set-cookie"];

    // 2. Change password to strong compliant password
    const changeRes = await request(app)
      .post("/api/v1/auth/change-password")
      .set("Cookie", cookie)
      .send({
        currentPassword: "InitialPass123!",
        newPassword: "UpdatedSecurePass123!",
        confirmPassword: "UpdatedSecurePass123!",
      });

    expect(changeRes.status).toBe(200);
    expect(changeRes.body.user.mustChangePassword).toBe(false);

    // 3. Verify new login succeeds
    const newLoginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "new.requester@kmutt.ac.th", password: "UpdatedSecurePass123!" });

    expect(newLoginRes.status).toBe(200);
    expect(newLoginRes.body.user.mustChangePassword).toBe(false);
  });

  // AUTH-09: Weak Password Rejection
  it("AUTH-09: rejects weak new password failing complexity rules with 400 Bad Request", async () => {
    const loginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "sompong.it@kmutt.ac.th", password: "Password123!" });

    const cookie = loginRes.headers["set-cookie"];

    const changeRes = await request(app)
      .post("/api/v1/auth/change-password")
      .set("Cookie", cookie)
      .send({
        currentPassword: "Password123!",
        newPassword: "short",
        confirmPassword: "short",
      });

    expect(changeRes.status).toBe(400);
    expect(changeRes.body.error.code).toBe("VALIDATION_FAILED");
  });

  // AUTH-10: Anti-Spoofing Regression (BR-03, AC-05)
  it("AUTH-10: derives requesterId strictly from authenticated session ignoring client-supplied requesterId", async () => {
    const loginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "sompong.it@kmutt.ac.th", password: "Password123!" });

    const cookie = loginRes.headers["set-cookie"];
    const sompongId = loginRes.body.user.id;

    const res = await request(app)
      .post("/api/v1/tickets")
      .set("Cookie", cookie)
      .send({
        requesterId: 9999, // Attempted spoofing
        categoryId: 1,
        relatedSystemId: 1,
        requestedPriority: "Medium",
        summary: "Anti-spoofing session derivation test ticket",
        description: "Validating that server-side session strictly determines ticket requester ownership.",
      });

    expect(res.status).toBe(201);
    expect(res.body.requesterId).toBe(sompongId);
    expect(res.body.requesterId).not.toBe(9999);
  });
});
