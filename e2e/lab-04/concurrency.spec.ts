import { test, expect } from '@playwright/test';

test.describe('Issue 22 / Scenario 2: Optimistic Concurrency & Conflict Recovery (BR-10, AC-11)', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('Simulated concurrent edit rejects stale update with 409 Conflict and preserves uncommitted drafts', async ({ page, request }) => {
    // -------------------------------------------------------------------------
    // 1. Create a dedicated ticket via Requester API for isolation
    // -------------------------------------------------------------------------
    const requesterLogin = await request.post('http://localhost:3000/api/v1/auth/login', {
      data: { email: 'sompong.it@kmutt.ac.th', password: 'Password123!' },
    });
    expect(requesterLogin.status()).toBe(200);
    const reqCookie = requesterLogin.headers()['set-cookie'];
    const createRes = await request.post('http://localhost:3000/api/v1/tickets', {
      headers: { cookie: reqCookie },
      data: {
        summary: `Concurrency OCC Test - ${Date.now()}`,
        description: 'Testing optimistic concurrency control and 409 conflict handling.',
        categoryId: 1,
        relatedSystemId: 1,
        requestedPriority: 'HIGH',
      },
    });
    expect(createRes.status()).toBe(201);
    const createdTicket = await createRes.json();
    const ticketId = createdTicket.id;
    const ticketNumber = createdTicket.ticketNumber;

    // Transition fresh ticket to IN_PROGRESS via staff API so valid transitions exist
    const staffLogin = await request.post('http://localhost:3000/api/v1/auth/login', {
      data: { email: 'ekachai.it@kmutt.ac.th', password: 'Password123!' },
    });
    expect(staffLogin.status()).toBe(200);
    const staffCookie = staffLogin.headers()['set-cookie'];
    await request.patch(`http://localhost:3000/api/v1/staff/tickets/${ticketId}/status`, {
      headers: { cookie: staffCookie },
      data: { status: 'IN_PROGRESS' },
    });

    // -------------------------------------------------------------------------
    // 2. Staff Logs in via Browser (Tab A)
    // -------------------------------------------------------------------------
    await expect(page.locator('[data-testid="login-email-input"]')).toBeVisible({ timeout: 15000 });
    await page.locator('[data-testid="login-email-input"]').fill('wichai.it@kmutt.ac.th');
    await page.locator('[data-testid="login-password-input"]').fill('Password123!');
    await page.locator('[data-testid="login-submit-button"]').click();

    // Verify Staff lands on Staff Dashboard
    await expect(page.locator('[data-testid="staff-dashboard"]')).toBeVisible({ timeout: 15000 });

    // Navigate to Staff Queue
    await page.locator('[data-testid="nav-staff-queue"]').click();
    await expect(page.locator('[data-testid="staff-ticket-queue-view"]')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('[data-testid="queue-skeleton"]')).toBeHidden({ timeout: 15000 });

    // Search and open the dedicated ticket
    await page.locator('[data-testid="queue-search-input"]').fill(ticketNumber);
    await page.waitForTimeout(600);
    const ticketRow = page.locator('[data-testid^="queue-row-"]').filter({ hasText: ticketNumber }).first();
    await expect(ticketRow).toBeVisible({ timeout: 10000 });
    await ticketRow.click();

    // Verify Staff Ticket Detail view loaded in browser
    await expect(page.locator('[data-testid="staff-ticket-detail-view"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="ticket-number"]')).toHaveText(ticketNumber);

    // Wait 1.2s to ensure subsequent background modification timestamp difference exceeds 1000ms (BR-10 / OCC gate)
    await page.waitForTimeout(1200);

    // -------------------------------------------------------------------------
    // 3. Parallel Background Session Modifies Ticket to Advance updatedAt
    // -------------------------------------------------------------------------
    const updateRes = await request.patch(`http://localhost:3000/api/v1/staff/tickets/${ticketId}/priority`, {
      headers: { cookie: staffCookie },
      data: { itPriority: 'URGENT' },
    });
    expect(updateRes.status()).toBe(200);

    // -------------------------------------------------------------------------
    // 4. User in Tab A Writes an Uncommitted Draft Note
    // -------------------------------------------------------------------------
    const draftNoteText = 'Customer confirmed switch port 14 patch was completed during morning maintenance.';
    const noteInput = page.locator('[data-testid="internal-note-input"]');
    await expect(noteInput).toBeVisible({ timeout: 5000 });
    await noteInput.fill(draftNoteText);

    // -------------------------------------------------------------------------
    // 5. Tab A Attempts Status Transition with Stale Timestamp
    // -------------------------------------------------------------------------
    const statusSelect = page.locator('[data-testid="status-transition-select"]');
    await expect(statusSelect).toBeVisible({ timeout: 5000 });
    await statusSelect.selectOption('WAITING_FOR_REQUESTER');
    await page.locator('[data-testid="transition-status-btn"]').click();

    // -------------------------------------------------------------------------
    // 6. Assert 409 Conflict Handling & Non-Destructive Draft Preservation
    // -------------------------------------------------------------------------
    const conflictBanner = page.locator('[data-testid="concurrency-conflict-banner"]');
    await expect(conflictBanner).toBeVisible({ timeout: 8000 });
    await expect(conflictBanner).toContainText('Update Conflict');

    // Verify uncommitted draft note is preserved
    await expect(noteInput).toHaveValue(draftNoteText);

    // Click "Reload Ticket" to recover gracefully
    const reloadBtn = page.locator('[data-testid="reload-ticket-btn"]');
    await expect(reloadBtn).toBeVisible();
    await reloadBtn.click();

    // Verify conflict banner dismissed
    await expect(conflictBanner).toBeHidden({ timeout: 8000 });

    // Verify draft note remains intact after reload
    await expect(noteInput).toHaveValue(draftNoteText);
  });
});
