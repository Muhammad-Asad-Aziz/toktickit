import { test, expect } from '@playwright/test';

test.describe('Issue 18 & 19: Actions Taken End-to-End Flow (AC-01 to AC-06, E2E-01)', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('E2E-01: Full journey - Staff logs and edits action; Requester views read-only action', async ({ page }) => {
    // -------------------------------------------------------------------------
    // 1. Staff Logs in and Opens Ticket
    // -------------------------------------------------------------------------
    await expect(page.locator('[data-testid="login-email-input"]')).toBeVisible({ timeout: 15000 });
    await page.locator('[data-testid="login-email-input"]').fill('wichai.it@kmutt.ac.th');
    await page.locator('[data-testid="login-password-input"]').fill('Password123!');
    await page.locator('[data-testid="login-submit-button"]').click();

    await expect(page.locator('[data-testid="staff-dashboard"]')).toBeVisible({ timeout: 15000 });
    await page.locator('[data-testid="nav-staff-queue"]').click();

    await expect(page.locator('[data-testid="staff-ticket-queue-view"]')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('[data-testid="queue-skeleton"]')).toBeHidden({ timeout: 15000 });

    // Search and open ticket TKT-2026-00001
    await page.locator('[data-testid="queue-search-input"]').fill('TKT-2026-00001');
    await page.waitForTimeout(600);
    const ticketRow = page.locator('[data-testid^="queue-row-"]').filter({ hasText: 'TKT-2026-00001' }).first();
    await expect(ticketRow).toBeVisible({ timeout: 10000 });
    await ticketRow.click();

    await expect(page.locator('[data-testid="staff-ticket-detail-view"]')).toBeVisible({ timeout: 10000 });
    const actionsSection = page.locator('[data-testid="actions-taken-section"]');
    await expect(actionsSection).toBeVisible({ timeout: 10000 });

    // -------------------------------------------------------------------------
    // 2. Staff Creates New Action Taken (AC-01, AC-02, AC-03)
    // -------------------------------------------------------------------------
    await page.locator('[data-testid="open-create-action-modal-btn"]').click();
    const modal = page.locator('[data-testid="action-taken-modal"]');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Verify auto-performer display
    await expect(page.locator('[data-testid="performer-display-card"]')).toContainText('Wichai IT');

    const uniqueDesc = `Diagnostic ping sweep and cable test - ${Date.now()}`;
    await page.locator('[data-testid="action-description-input"]').fill(uniqueDesc);
    await page.locator('[data-testid="action-result-input"]').fill('0% packet loss to core switch. Interface stable.');

    // Follow-up required toggle
    await page.locator('[data-testid="followup-required-checkbox"]').click();
    await page.locator('[data-testid="followup-note-input"]').fill('Check interface error counters tomorrow.');

    await page.locator('[data-testid="submit-action-taken-btn"]').click();
    await expect(modal).toBeHidden({ timeout: 8000 });

    // Verify action appeared in list
    const actionItem = page.locator('[data-testid="actions-taken-list"]').filter({ hasText: uniqueDesc });
    await expect(actionItem).toBeVisible({ timeout: 8000 });
    await expect(actionItem).toContainText('Wichai IT');
    await expect(actionItem).toContainText('Follow-up Required');

    // Logout Staff
    await page.locator('[data-testid="logout-button"]').click();

    // -------------------------------------------------------------------------
    // 3. Requester Logs in and Verifies Read-Only Visibility (AC-05, AC-06)
    // -------------------------------------------------------------------------
    await page.locator('[data-testid="login-email-input"]').fill('sompong.it@kmutt.ac.th');
    await page.locator('[data-testid="login-password-input"]').fill('Password123!');
    await page.locator('[data-testid="login-submit-button"]').click();

    await expect(page.locator('[data-testid="requester-dashboard"]')).toBeVisible({ timeout: 15000 });
    await page.locator('[data-testid="nav-my-tickets"]').click();
    await expect(page.locator('[data-testid="my-tickets-container"]')).toBeVisible({ timeout: 15000 });

    // Search and Open TKT-2026-00001
    await page.locator('[data-testid="filter-search-input"]').fill('TKT-2026-00001');
    await page.waitForTimeout(600);
    const reqTicketRow = page.locator('tr').filter({ hasText: 'TKT-2026-00001' }).first();
    await expect(reqTicketRow).toBeVisible({ timeout: 10000 });
    await reqTicketRow.locator('[data-testid^="ticket-link-"]').click();

    await expect(page.locator('[data-testid="ticket-detail-view"]')).toBeVisible({ timeout: 10000 });

    // Assert Actions Taken rendered in read-only mode
    const reqActionsSection = page.locator('[data-testid="actions-taken-section"]');
    await expect(reqActionsSection).toBeVisible({ timeout: 8000 });
    await expect(page.locator('[data-testid="open-create-action-modal-btn"]')).toHaveCount(0);
    await expect(reqActionsSection).toContainText(uniqueDesc);
  });
});
