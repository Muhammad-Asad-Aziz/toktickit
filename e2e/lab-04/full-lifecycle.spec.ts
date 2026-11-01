import { test, expect } from '@playwright/test';

test.describe('Issue 22 / Scenario 1: Full Service-Desk Ticket Lifecycle & Resolution Gate', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('Full Multi-Role Flow: Creation -> Gate Block -> Action Taken -> Resolution -> Requester Advisory -> Closure', async ({ page }) => {
    // -------------------------------------------------------------------------
    // Step 1: Requester Logs In and Creates Ticket
    // -------------------------------------------------------------------------
    await expect(page.locator('[data-testid="login-email-input"]')).toBeVisible({ timeout: 15000 });
    await page.locator('[data-testid="login-email-input"]').fill('sompong.it@kmutt.ac.th');
    await page.locator('[data-testid="login-password-input"]').fill('Password123!');
    await page.locator('[data-testid="login-submit-button"]').click();

    // Verify Requester lands on dashboard
    await expect(page.locator('[data-testid="requester-dashboard"]')).toBeVisible({ timeout: 15000 });

    // Navigate to Create Ticket view
    await page.locator('[data-testid="nav-create-ticket"]').click();
    await expect(page.locator('#ticket-summary')).toBeVisible({ timeout: 10000 });

    // Fill form
    await page.locator('#ticket-category').selectOption({ index: 1 });
    await page.locator('#ticket-system').selectOption({ index: 1 });
    await page.locator('.priority-pill.priority-high').click();

    const testSummary = `Conference Room B HDMI Port Issue - ${Date.now()}`;
    await page.locator('#ticket-summary').fill(testSummary);
    await page.locator('#ticket-description').fill('The wall plate HDMI connector has pins bent and video cuts in and out during lectures.');

    // Submit ticket
    await page.locator('button[type="submit"]').click();

    // Capture created ticket number
    const createdNumberLocator = page.locator('[data-testid="created-ticket-number"]');
    await expect(createdNumberLocator).toBeVisible({ timeout: 10000 });
    const createdTicketNumber = (await createdNumberLocator.innerText()).trim();
    expect(createdTicketNumber).toMatch(/^TKT-\d{4}-\d{5}$/);

    // Logout Requester
    await page.locator('[data-testid="logout-button"]').click();
    await expect(page.locator('[data-testid="login-email-input"]')).toBeVisible({ timeout: 10000 });

    // -------------------------------------------------------------------------
    // Step 2: IT Staff Logs In, Claims Ticket, and Attempts Premature Resolution
    // -------------------------------------------------------------------------
    await page.locator('[data-testid="login-email-input"]').fill('wichai.it@kmutt.ac.th');
    await page.locator('[data-testid="login-password-input"]').fill('Password123!');
    await page.locator('[data-testid="login-submit-button"]').click();

    // Verify Staff lands on Staff Dashboard
    await expect(page.locator('[data-testid="staff-dashboard"]')).toBeVisible({ timeout: 15000 });

    // Navigate to Staff Queue
    await page.locator('[data-testid="nav-staff-queue"]').click();
    await expect(page.locator('[data-testid="staff-ticket-queue-view"]')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('[data-testid="queue-skeleton"]')).toBeHidden({ timeout: 15000 });

    // Search for the newly created ticket
    const searchInput = page.locator('[data-testid="queue-search-input"]');
    await searchInput.fill(createdTicketNumber);
    await page.waitForTimeout(600); // debounce wait

    const targetRow = page.locator('[data-testid^="queue-row-"]').filter({ hasText: createdTicketNumber }).first();
    await expect(targetRow).toBeVisible({ timeout: 10000 });
    await targetRow.click();

    // Verify Staff Ticket Detail view
    await expect(page.locator('[data-testid="staff-ticket-detail-view"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="ticket-number"]')).toHaveText(createdTicketNumber);

    // Claim ticket if unassigned
    const claimBtn = page.locator('[data-testid="claim-ticket-btn"]');
    if (await claimBtn.isVisible() && await claimBtn.isEnabled()) {
      await claimBtn.click();
      await page.waitForTimeout(500);
    }

    // Transition to IN_PROGRESS first if current status is NEW
    const currentStatusText = await page.locator('[data-testid="ticket-status-badge"]').innerText();
    if (currentStatusText.includes('New') || currentStatusText.includes('NEW')) {
      const statusSelect = page.locator('[data-testid="status-transition-select"]');
      await statusSelect.selectOption('IN_PROGRESS');
      await page.locator('[data-testid="transition-status-btn"]').click();
      await expect(page.locator('[data-testid="ticket-status-badge"]')).toContainText(/in.?progress/i, { timeout: 10000 });
    }

    // --- Resolution Gate Invariant (BR-07, AC-07) ---
    // Attempt to transition to RESOLVED with 0 Actions Taken
    const statusSelect = page.locator('[data-testid="status-transition-select"]');
    await statusSelect.selectOption('RESOLVED');

    // Verify Resolution Gate blocks transition: warning is displayed and transition button is disabled
    const gateWarning = page.locator('[data-testid="resolution-blocked-warning"]');
    await expect(gateWarning).toBeVisible({ timeout: 8000 });
    await expect(gateWarning).toContainText('Resolution Blocked');
    await expect(page.locator('[data-testid="transition-status-btn"]')).toBeDisabled();
    await expect(page.locator('[data-testid="ticket-status-badge"]')).toContainText(/in.?progress/i);

    // -------------------------------------------------------------------------
    // Step 3: IT Staff Logs Required Action Taken with Follow-Up Note (AC-01 to AC-04)
    // -------------------------------------------------------------------------
    const logActionBtn = page.locator('[data-testid="open-create-action-modal-btn"]');
    await expect(logActionBtn).toBeVisible();
    await logActionBtn.click();

    const actionModal = page.locator('[data-testid="action-taken-modal"]');
    await expect(actionModal).toBeVisible({ timeout: 5000 });

    // Verify auto-performer display card reflects authenticated staff user
    await expect(page.locator('[data-testid="performer-display-card"]')).toContainText('Wichai IT');

    // Fill Action Taken fields
    await page.locator('[data-testid="action-description-input"]').fill('Inspected wall plate connector; straightened bent pin 14 and verified continuity.');
    await page.locator('[data-testid="action-result-input"]').fill('4K 60Hz HDMI video link stabilized on primary display.');

    // Toggle Follow-up Required
    await page.locator('[data-testid="followup-required-checkbox"]').click();
    const followupNoteInput = page.locator('[data-testid="followup-note-input"]');
    await expect(followupNoteInput).toBeVisible({ timeout: 5000 });
    await followupNoteInput.fill('Order replacement reinforced wall plate during summer maintenance window.');

    await page.locator('[data-testid="attachment-notes-input"]').fill('Refer to photo of damaged connector in attachments.');

    // Submit Action Taken modal
    await page.locator('[data-testid="submit-action-taken-btn"]').click();
    await expect(actionModal).toBeHidden({ timeout: 8000 });

    // Verify Action Taken appears in list with amber follow-up badge
    const actionsList = page.locator('[data-testid="actions-taken-list"]');
    await expect(actionsList).toBeVisible({ timeout: 8000 });
    await expect(actionsList).toContainText('Inspected wall plate connector');
    await expect(actionsList).toContainText('Follow-up Required');

    // -------------------------------------------------------------------------
    // Step 4: Successful Transition to RESOLVED (Resolution Gate Passes)
    // -------------------------------------------------------------------------
    await statusSelect.selectOption('RESOLVED');
    await page.locator('[data-testid="transition-status-btn"]').click();

    // Verify status badge updates to Resolved
    await expect(page.locator('[data-testid="ticket-status-badge"]')).toContainText(/resolved/i, { timeout: 10000 });

    // Logout IT Staff
    await page.locator('[data-testid="logout-button"]').click();
    await expect(page.locator('[data-testid="login-email-input"]')).toBeVisible({ timeout: 10000 });

    // -------------------------------------------------------------------------
    // Step 5: Requester Logs In, Observes Read-Only Actions, and Marks Advisory Resolved
    // -------------------------------------------------------------------------
    await page.locator('[data-testid="login-email-input"]').fill('sompong.it@kmutt.ac.th');
    await page.locator('[data-testid="login-password-input"]').fill('Password123!');
    await page.locator('[data-testid="login-submit-button"]').click();

    await expect(page.locator('[data-testid="requester-dashboard"]')).toBeVisible({ timeout: 15000 });

    // Navigate to My Tickets and open the ticket
    await page.locator('[data-testid="nav-my-tickets"]').click();
    await expect(page.locator('[data-testid="my-tickets-container"]')).toBeVisible({ timeout: 15000 });

    const requesterTicketRow = page.locator('tr').filter({ hasText: createdTicketNumber }).first();
    await expect(requesterTicketRow).toBeVisible({ timeout: 10000 });
    await requesterTicketRow.locator('[data-testid^="ticket-link-"]').click();

    // Verify Requester Ticket Detail view
    await expect(page.locator('[data-testid="ticket-detail-view"]')).toBeVisible({ timeout: 10000 });

    // Verify Actions Taken are rendered in Read-Only mode (create and edit buttons absent)
    await expect(page.locator('[data-testid="actions-taken-section"]')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('[data-testid="open-create-action-modal-btn"]')).toHaveCount(0);
    await expect(page.locator('[data-testid^="edit-action-btn-"]')).toHaveCount(0);

    // Click "Problem Appears Resolved" advisory button (BR-08, AC-09)
    const indicateResolvedBtn = page.locator('[data-testid="indicate-resolved-btn"]');
    if (await indicateResolvedBtn.isVisible()) {
      await indicateResolvedBtn.click();
      await expect(page.locator('[data-testid="resolve-confirm-modal"]')).toBeVisible({ timeout: 5000 });
      await page.locator('[data-testid="confirm-resolve-btn"]').click();
      await expect(page.locator('[data-testid="resolve-confirm-modal"]')).toBeHidden({ timeout: 5000 });

      // Verify advisory banner displayed
      await expect(page.locator('[data-testid="requester-resolved-banner"]')).toBeVisible({ timeout: 8000 });
    }

    // Verify ticket status remains Resolved
    await expect(page.locator('[data-testid="ticket-status-badge"]')).toContainText(/resolved/i);

    // Logout Requester
    await page.locator('[data-testid="logout-button"]').click();
    await expect(page.locator('[data-testid="login-email-input"]')).toBeVisible({ timeout: 10000 });

    // -------------------------------------------------------------------------
    // Step 6: IT Staff Verifies Advisory Resolution and Transitions to CLOSED
    // -------------------------------------------------------------------------
    await page.locator('[data-testid="login-email-input"]').fill('wichai.it@kmutt.ac.th');
    await page.locator('[data-testid="login-password-input"]').fill('Password123!');
    await page.locator('[data-testid="login-submit-button"]').click();

    await expect(page.locator('[data-testid="staff-dashboard"]')).toBeVisible({ timeout: 15000 });
    await page.locator('[data-testid="nav-staff-queue"]').click();

    await page.locator('[data-testid="queue-search-input"]').fill(createdTicketNumber);
    await page.waitForTimeout(600);
    await page.locator('[data-testid^="queue-row-"]').filter({ hasText: createdTicketNumber }).first().click();

    await expect(page.locator('[data-testid="staff-ticket-detail-view"]')).toBeVisible({ timeout: 10000 });

    // Verify requester resolved indicator is visible on Staff Detail
    await expect(page.locator('[data-testid="requester-resolved-indicator"]')).toBeVisible({ timeout: 8000 });

    // Final transition to CLOSED
    await page.locator('[data-testid="status-transition-select"]').selectOption('CLOSED');
    await page.locator('[data-testid="transition-status-btn"]').click();

    // Verify status is CLOSED
    await expect(page.locator('[data-testid="ticket-status-badge"]')).toContainText(/closed/i, { timeout: 10000 });
  });
});
