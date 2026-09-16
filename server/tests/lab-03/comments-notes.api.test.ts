import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { seed } from "../../prisma/seed.js";
import { getPrisma } from "../../src/prisma.js";

describe("Comments and Internal Notes API Suite (Issue 14)", () => {
  let staffCookie: string[];
  let requesterCookie: string[];
  let requesterId: number;
  let testTicketId: number;

  beforeAll(async () => {
    await seed();
    const prisma = getPrisma();

    // Authenticate IT Staff
    const staffLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "wichai.it@kmutt.ac.th", password: "Password123!" });
    staffCookie = staffLogin.headers["set-cookie"];

    // Authenticate Requester
    const requesterLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "sompong.it@kmutt.ac.th", password: "Password123!" });
    requesterCookie = requesterLogin.headers["set-cookie"];
    requesterId = requesterLogin.body.user.id;

    // Get an existing ticket owned by requester
    const ticket = await prisma.ticket.findFirst({
      where: { requesterId },
    });
    testTicketId = ticket!.id;
  });

  // COMM-01: Append Public Comment
  it("COMM-01: Requester and IT Staff can post public comments", async () => {
    // 1. Requester posts a comment
    const reqRes = await request(app)
      .post(`/api/v1/tickets/${testTicketId}/comments`)
      .set("Cookie", requesterCookie)
      .send({ content: "Here is additional context about the Wi-Fi drop." });

    expect(reqRes.status).toBe(201);
    expect(reqRes.body).toHaveProperty("comment");
    expect(reqRes.body.comment).toHaveProperty("id");
    expect(reqRes.body.comment).toHaveProperty("content", "Here is additional context about the Wi-Fi drop.");
    expect(reqRes.body.comment).toHaveProperty("author");
    expect(reqRes.body.comment.author).toHaveProperty("role", "REQUESTER");

    // 2. IT Staff posts a comment
    const staffRes = await request(app)
      .post(`/api/v1/tickets/${testTicketId}/comments`)
      .set("Cookie", staffCookie)
      .send({ content: "Thank you, we are looking into the CB2 access point logs." });

    expect(staffRes.status).toBe(201);
    expect(staffRes.body.comment).toHaveProperty("id");
    expect(staffRes.body.comment.author).toHaveProperty("role", "IT_STAFF");
  });

  // COMM-02: Validation on Public Comments
  it("COMM-02: rejects empty or whitespace-only comment with 400 Bad Request", async () => {
    const res = await request(app)
      .post(`/api/v1/tickets/${testTicketId}/comments`)
      .set("Cookie", requesterCookie)
      .send({ content: "    " });

    expect(res.status).toBe(400);
    expect(res.body.error).toHaveProperty("code", "VALIDATION_FAILED");
  });

  it("COMM-02b: rejects comment exceeding 2000 characters with 400 Bad Request", async () => {
    const longContent = "A".repeat(2001);
    const res = await request(app)
      .post(`/api/v1/tickets/${testTicketId}/comments`)
      .set("Cookie", requesterCookie)
      .send({ content: longContent });

    expect(res.status).toBe(400);
    expect(res.body.error).toHaveProperty("code", "VALIDATION_FAILED");
  });

  // NOTE-01: IT Staff Appends Internal Note
  it("NOTE-01: IT Staff posts confidential internal note successfully", async () => {
    const res = await request(app)
      .post(`/api/v1/tickets/${testTicketId}/notes`)
      .set("Cookie", staffCookie)
      .send({ content: "Switch port 14 on CB2 floor 3 showing high packet drop rate." });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("note");
    expect(res.body.note).toHaveProperty("id");
    expect(res.body.note).toHaveProperty("content", "Switch port 14 on CB2 floor 3 showing high packet drop rate.");
    expect(res.body.note).toHaveProperty("author");
    expect(res.body.note.author).toHaveProperty("role", "IT_STAFF");
  });

  it("NOTE-01b: rejects empty internal note with 400 Bad Request", async () => {
    const res = await request(app)
      .post(`/api/v1/tickets/${testTicketId}/notes`)
      .set("Cookie", staffCookie)
      .send({ content: "" });

    expect(res.status).toBe(400);
    expect(res.body.error).toHaveProperty("code", "VALIDATION_FAILED");
  });

  it("NOTE-01c: rejects internal note exceeding 2000 characters with 400 Bad Request", async () => {
    const longNote = "B".repeat(2001);
    const res = await request(app)
      .post(`/api/v1/tickets/${testTicketId}/notes`)
      .set("Cookie", staffCookie)
      .send({ content: longNote });

    expect(res.status).toBe(400);
    expect(res.body.error).toHaveProperty("code", "VALIDATION_FAILED");
  });

  // Append-Only Verification (BR-08)
  it("APPEND-01: verifies no update (PUT/PATCH) or deletion (DELETE) routes exist for comments or notes", async () => {
    const putComment = await request(app)
      .put(`/api/v1/tickets/${testTicketId}/comments/1`)
      .set("Cookie", staffCookie)
      .send({ content: "attempt update" });
    expect([404, 405]).toContain(putComment.status);

    const deleteComment = await request(app)
      .delete(`/api/v1/tickets/${testTicketId}/comments/1`)
      .set("Cookie", staffCookie);
    expect([404, 405]).toContain(deleteComment.status);

    const putNote = await request(app)
      .put(`/api/v1/tickets/${testTicketId}/notes/1`)
      .set("Cookie", staffCookie)
      .send({ content: "attempt update" });
    expect([404, 405]).toContain(putNote.status);

    const deleteNote = await request(app)
      .delete(`/api/v1/tickets/${testTicketId}/notes/1`)
      .set("Cookie", staffCookie);
    expect([404, 405]).toContain(deleteNote.status);
  });
});
