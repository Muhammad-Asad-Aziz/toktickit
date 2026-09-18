import { test, expect } from '@playwright/test';

test.describe('IT Staff Ticket Management & Cross-Role Collaboration Flow (Lab 3)', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  // ---------------------------------------------------------------------------
  // STAFF-E2E-01: IT Staff Login & Default Staff Queue Navigation
  // ---------------------------------------------------------------------------
  test('STAFF-E2E-01: IT Staff login lands directly on Staff Ticket Queue', async ({ page }) => {
    await expect(page.locator('[data-testid="login-email-input"]')).toBeVisible({ timeout: 10000 });

    await page.locator('[data-testid="login-email-input"]').fill('wichai.it@kmutt.ac.th');
    await page.locator('[data-testid="login-password-input"]').fill('Password123!');
    await page.locator('[data-testid="login-submit-button"]').click();

    // Verify default view is staff ticket queue
    await expect(page.locator('[data-testid="staff-ticket-queue-view"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="user-name-display"]')).toHaveText('Wichai IT');
    await expect(page.locator('[data-testid="user-role-badge"]')).toHaveText('IT Staff');

    // Verify staff queue elements
    await expect(page.locator('[data-testid="queue-search-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="filter-status"]')).toBeVisible();
    await expect(page.locator('[data-testid="filter-priority"]')).toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // STAFF-E2E-02: Staff Queue Filtering, Search, and Reset
  // ---------------------------------------------------------------------------
  test('STAFF-E2E-02: Staff Queue search, multi-criteria filtering, and filter reset', async ({ page }) => {
    await page.locator('[data-testid="login-email-input"]').fill('wichai.it@kmutt.ac.th');
    await page.locator('[data-testid="login-password-input"]').fill('Password123!');
    await page.locator('[data-testid="login-submit-button"]').click();

    await expect(page.locator('[data-testid="staff-ticket-queue-view"]')).toBeVisible({ timeout: 10000 });

    // Wait for tickets to load
    await expect(page.locator('[data-testid="queue-skeleton"]')).toBeHidden({ timeout: 10000 });
    const initialRows = page.locator('[data-testid^="queue-row-"]');
    await expect(initialRows.first()).toBeVisible({ timeout: 10000 });

    // 1. Search by summary keyword "Printer"
    const searchInput = page.locator('[data-testid="queue-search-input"]');
    await searchInput.fill('Printer');
    await page.waitForTimeout(600); // Wait for debounce / fetch

    await expect(page.locator('[data-testid^="queue-row-"]').filter({ hasText: 'Printer paper jam' })).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid^="queue-row-"]').filter({ hasText: 'Microsoft Teams' })).toHaveCount(0);

    // 2. Clear search, filter by status NEW
    await searchInput.fill('');
    await page.locator('[data-testid="filter-status"]').selectOption('NEW');
    await page.waitForTimeout(600);

    await expect(page.locator('[data-testid^="queue-row-"]').filter({ hasText: 'Printer paper jam' })).toBeVisible({ timeout: 10000 });

    // 3. Reset filters
    const resetBtn = page.locator('[data-testid="reset-filters-button"]');
    await expect(resetBtn).toBeVisible();
    await resetBtn.click();
    await page.waitForTimeout(600);

    // Verify search and status are cleared, default sorted tickets visible
    await expect(searchInput).toHaveValue('');
    await expect(page.locator('[data-testid="filter-status"]')).toHaveValue('');
    await expect(page.locator('[data-testid^="queue-row-"]').filter({ hasText: 'Microsoft Teams' })).toBeVisible({ timeout: 10000 });
  });

  // ---------------------------------------------------------------------------
  // STAFF-E2E-03: Full Operational Lifecycle: Claim, Priority, Transitions, Comments & Notes
  // ---------------------------------------------------------------------------
  test('STAFF-E2E-03: IT Staff claims ticket, updates priority, executes transitions, and posts notes', async ({ page }) => {
    await page.locator('[data-testid="login-email-input"]').fill('wichai.it@kmutt.ac.th');
    await page.locator('[data-testid="login-password-input"]').fill('Password123!');
    await page.locator('[data-testid="login-submit-button"]').click();

    await expect(page.locator('[data-testid="staff-ticket-queue-view"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="queue-skeleton"]')).toBeHidden({ timeout: 10000 });

    // Open unassigned ticket TKT-2026-00011 (Printer paper jam error 50.4 in Eng Building)
    const ticketRow = page.locator('[data-testid^="queue-row-"]').filter({ hasText: 'TKT-2026-00011' });
    await expect(ticketRow).toBeVisible({ timeout: 10000 });
    await ticketRow.click();

    // Verify Staff Ticket Detail view loaded
    await expect(page.locator('[data-testid="staff-ticket-detail-view"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="ticket-number"]')).toHaveText('TKT-2026-00011');
    await expect(page.locator('[data-testid="ticket-summary"]')).toHaveText('Printer paper jam error 50.4 in Eng Building');

    // 1. Claim Ticket (Assign to Me)
    const claimBtn = page.locator('[data-testid="claim-ticket-btn"]');
    if (await claimBtn.isVisible() && await claimBtn.isEnabled()) {
      await claimBtn.click();
      await expect(page.locator('[data-testid="current-owner-display"]')).toContainText('Wichai IT', { timeout: 10000 });
    }

    // 2. Update IT Priority to URGENT
    const prioritySelect = page.locator('[data-testid="it-priority-select"]');
    await prioritySelect.selectOption('URGENT');
    const savePriorityBtn = page.locator('[data-testid="save-priority-btn"]');
    await expect(savePriorityBtn).toBeEnabled();
    await savePriorityBtn.click();
    await expect(page.locator('[data-testid="ticket-it-priority-badge"]')).toContainText('URGENT', { timeout: 10000 });

    // 3. Status Transition: NEW -> OPEN -> IN_PROGRESS
    const currentStatus = await page.locator('[data-testid="ticket-status-badge"]').innerText();
    const transitionSelect = page.locator('[data-testid="status-transition-select"]');
    const transitionBtn = page.locator('[data-testid="transition-status-btn"]');

    if (currentStatus.trim() === 'NEW') {
      await transitionSelect.selectOption('OPEN');
      await transitionBtn.click();
      await expect(page.locator('[data-testid="ticket-status-badge"]')).toHaveText('OPEN', { timeout: 10000 });
    }

    const updatedStatus = await page.locator('[data-testid="ticket-status-badge"]').innerText();
    if (updatedStatus.trim() === 'OPEN') {
      await transitionSelect.selectOption('IN_PROGRESS');
      await transitionBtn.click();
      await expect(page.locator('[data-testid="ticket-status-badge"]')).toHaveText('IN_PROGRESS', { timeout: 10000 });
    }

    // 4. Post Public Comment
    const commentInput = page.locator('[data-testid="public-comment-input"]');
    await commentInput.fill('Investigating paper jam in tray 2. Roller replacement scheduled.');
    await page.locator('[data-testid="submit-public-comment-btn"]').click();

    const publicList = page.locator('[data-testid="public-comments-list"]');
    await expect(publicList).toContainText('Roller replacement scheduled', { timeout: 10000 });
    await expect(publicList).toContainText('Wichai IT');

    // 5. Post Confidential Internal IT Note
    const internalSection = page.locator('[data-testid="internal-notes-section"]');
    await expect(internalSection).toBeVisible();
    await expect(page.locator('[data-testid="internal-note-confidential-banner"]')).toContainText('CONFIDENTIAL — INTERNAL IT NOTE');

    const noteInput = page.locator('[data-testid="internal-note-input"]');
    await noteInput.fill('Internal diagnostics: Pickup roller rubber surface degraded.');
    await page.locator('[data-testid="submit-internal-note-btn"]').click();

    const notesList = page.locator('[data-testid="internal-notes-list"]');
    await expect(notesList).toContainText('Pickup roller rubber surface degraded', { timeout: 10000 });
    await expect(notesList).toContainText('Wichai IT');
  });

  // ---------------------------------------------------------------------------
  // STAFF-E2E-04: Cross-Role Requester Verification & Indicate Resolved
  // ---------------------------------------------------------------------------
  test('STAFF-E2E-04: Requester verifies public comment, zero internal note leak, and indicates problem resolved', async ({ page }) => {
    // Login as the requester for ticket TKT-2026-00011 (anong.sta@kmutt.ac.th)
    await page.locator('[data-testid="login-email-input"]').fill('anong.sta@kmutt.ac.th');
    await page.locator('[data-testid="login-password-input"]').fill('Password123!');
    await page.locator('[data-testid="login-submit-button"]').click();

    await expect(page.locator('[data-testid="user-name-display"]')).toHaveText('Anong Staff', { timeout: 10000 });
    await expect(page.locator('[data-testid="user-role-badge"]')).toHaveText('Requester');

    // Switch to My Tickets
    await page.locator('[data-testid="nav-my-tickets"]').click();
    await expect(page.locator('[data-testid="my-tickets-container"]')).toBeVisible({ timeout: 10000 });

    // Open ticket TKT-2026-00011
    const ticketRow = page.locator('tr').filter({ hasText: 'TKT-2026-00011' });
    await expect(ticketRow).toBeVisible({ timeout: 10000 });
    await ticketRow.locator('[data-testid^="ticket-link-"]').click();

    // Verify Requester Ticket Detail view
    await expect(page.locator('[data-testid="ticket-detail-view"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="ticket-number"]')).toHaveText('TKT-2026-00011');

    // 1. Verify Public Comment is visible to Requester
    await expect(page.locator('[data-testid="public-comments-list"]')).toContainText('Roller replacement scheduled', { timeout: 10000 });

    // 2. Strict Security Assertion: Internal Notes section is completely absent from DOM
    await expect(page.locator('[data-testid="internal-notes-section"]')).toHaveCount(0);
    await expect(page.locator('text=CONFIDENTIAL — INTERNAL IT NOTE')).toHaveCount(0);
    await expect(page.locator('text=Pickup roller rubber surface degraded')).toHaveCount(0);

    // 3. Indicate Problem Resolved (BR-05)
    const indicateResolvedBtn = page.locator('[data-testid="indicate-resolved-btn"]');
    if (await indicateResolvedBtn.isVisible()) {
      await indicateResolvedBtn.click();

      // Confirm in modal dialog
      const modal = page.locator('[data-testid="resolve-confirm-modal"]');
      await expect(modal).toBeVisible({ timeout: 5000 });
      await page.locator('[data-testid="confirm-resolve-btn"]').click();

      // Banner appears confirming requester indication
      await expect(page.locator('[data-testid="requester-resolved-banner"]')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('[data-testid="requester-resolved-banner"]')).toContainText('You indicated this problem appears resolved');
    }
  });

  // ---------------------------------------------------------------------------
  // STAFF-E2E-05: Staff Verification of Requester Resolution & Navigation Boundary
  // ---------------------------------------------------------------------------
  test('STAFF-E2E-05: IT Staff sees requester resolution alert and completes workflow to RESOLVED', async ({ page }) => {
    // 1. Verify Requester cannot see Staff Queue in nav
    await page.locator('[data-testid="login-email-input"]').fill('anong.sta@kmutt.ac.th');
    await page.locator('[data-testid="login-password-input"]').fill('Password123!');
    await page.locator('[data-testid="login-submit-button"]').click();
    await expect(page.locator('[data-testid="user-role-badge"]')).toHaveText('Requester', { timeout: 10000 });
    await expect(page.locator('[data-testid="nav-staff-queue"]')).toHaveCount(0);

    // Logout Requester
    await page.locator('[data-testid="logout-button"]').click();
    await expect(page.locator('[data-testid="login-email-input"]')).toBeVisible({ timeout: 10000 });

    // 2. Login as IT Staff
    await page.locator('[data-testid="login-email-input"]').fill('wichai.it@kmutt.ac.th');
    await page.locator('[data-testid="login-password-input"]').fill('Password123!');
    await page.locator('[data-testid="login-submit-button"]').click();

    await expect(page.locator('[data-testid="staff-ticket-queue-view"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="queue-skeleton"]')).toBeHidden({ timeout: 10000 });

    // Open ticket TKT-2026-00011
    const ticketRow = page.locator('[data-testid^="queue-row-"]').filter({ hasText: 'TKT-2026-00011' });
    await ticketRow.click();
    await expect(page.locator('[data-testid="staff-ticket-detail-view"]')).toBeVisible({ timeout: 10000 });

    // Verify Requester Resolution indicator banner is visible to Staff
    await expect(page.locator('[data-testid="requester-resolved-indicator"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="requester-resolved-indicator"]')).toContainText('Requester indicated problem appears resolved');

    // Transition status to RESOLVED
    const transitionSelect = page.locator('[data-testid="status-transition-select"]');
    const transitionBtn = page.locator('[data-testid="transition-status-btn"]');
    await transitionSelect.selectOption('RESOLVED');
    await transitionBtn.click();

    // Verify status updated to RESOLVED
    await expect(page.locator('[data-testid="ticket-status-badge"]')).toHaveText('RESOLVED', { timeout: 10000 });
  });
});
