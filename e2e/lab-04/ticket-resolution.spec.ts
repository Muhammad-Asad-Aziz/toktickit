import { test, expect } from '@playwright/test';

test.describe('Issue 20: Ticket Resolution Gate & Status Lifecycle (AC-07 to AC-11, E2E-02)', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('E2E-02: Full journey - Resolution gate blocks action-less resolution; succeeds after action logged', async ({ page, request }) => {
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
        summary: `Resolution Gate Test - ${Date.now()}`,
        description: 'Testing resolution gate blocks action-less resolution and passes after action logged.',
        categoryId: 1,
        relatedSystemId: 1,
        requestedPriority: 'MEDIUM',
      },
    });
    expect(createRes.status()).toBe(201);
    const createdTicket = await createRes.json();
    const ticketNumber = createdTicket.ticketNumber;

    // -------------------------------------------------------------------------
    // 2. Staff Logs in via Browser
    // -------------------------------------------------------------------------
    await expect(page.locator('[data-testid="login-email-input"]')).toBeVisible({ timeout: 15000 });
    await page.locator('[data-testid="login-email-input"]').fill('wichai.it@kmutt.ac.th');
    await page.locator('[data-testid="login-password-input"]').fill('Password123!');
    await page.locator('[data-testid="login-submit-button"]').click();

    await expect(page.locator('[data-testid="staff-dashboard"]')).toBeVisible({ timeout: 15000 });
    await page.locator('[data-testid="nav-staff-queue"]').click();

    await expect(page.locator('[data-testid="staff-ticket-queue-view"]')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('[data-testid="queue-skeleton"]')).toBeHidden({ timeout: 15000 });

    // Search and open the newly created ticket
    await page.locator('[data-testid="queue-search-input"]').fill(ticketNumber);
    await page.waitForTimeout(600);

    const ticketRow = page.locator('[data-testid^="queue-row-"]').filter({ hasText: ticketNumber }).first();
    await expect(ticketRow).toBeVisible({ timeout: 10000 });
    await ticketRow.click();

    await expect(page.locator('[data-testid="staff-ticket-detail-view"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="ticket-number"]')).toHaveText(ticketNumber);

    // Transition from NEW to IN_PROGRESS so RESOLVED is an allowed next state
    const statusSelect = page.locator('[data-testid="status-transition-select"]');
    await expect(statusSelect).toBeVisible({ timeout: 5000 });
    await statusSelect.selectOption('IN_PROGRESS');
    await page.locator('[data-testid="transition-status-btn"]').click();
    await expect(page.locator('[data-testid="ticket-status-badge"]')).toContainText(/in.?progress/i, { timeout: 8000 });

    // -------------------------------------------------------------------------
    // 3. Attempt Resolution on Action-less Ticket (Resolution Gate Block, BR-07)
    // -------------------------------------------------------------------------
    await statusSelect.selectOption('RESOLVED');

    // Verify Resolution Gate warning is rendered and transition button is disabled
    const gateWarning = page.locator('[data-testid="resolution-blocked-warning"]');
    await expect(gateWarning).toBeVisible({ timeout: 8000 });
    await expect(gateWarning).toContainText('Resolution Blocked');
    await expect(page.locator('[data-testid="transition-status-btn"]')).toBeDisabled();

    // Verify ticket status did NOT change to Resolved
    await expect(page.locator('[data-testid="ticket-status-badge"]')).not.toContainText(/resolved/i);

    // -------------------------------------------------------------------------
    // 4. Log an Action Taken to Satisfy the Resolution Gate (BR-07, AC-07)
    // -------------------------------------------------------------------------
    await page.locator('[data-testid="open-create-action-modal-btn"]').click();
    const modal = page.locator('[data-testid="action-taken-modal"]');
    await expect(modal).toBeVisible({ timeout: 5000 });

    await page.locator('[data-testid="action-description-input"]').fill('Inspected hardware diagnostics; replaced faulty cable and cleared error logs.');
    await page.locator('[data-testid="action-result-input"]').fill('All diagnostics passed with zero anomalies.');

    await page.locator('[data-testid="submit-action-taken-btn"]').click();
    await expect(modal).toBeHidden({ timeout: 8000 });

    // -------------------------------------------------------------------------
    // 5. Re-Attempt Resolution (Should now Succeed)
    // -------------------------------------------------------------------------
    await statusSelect.selectOption('RESOLVED');
    await page.locator('[data-testid="transition-status-btn"]').click();

    // Verify status updates to Resolved
    await expect(page.locator('[data-testid="ticket-status-badge"]')).toContainText(/resolved/i, { timeout: 10000 });
  });
});
