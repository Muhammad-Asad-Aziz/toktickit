import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const SCREENSHOTS_DIR = path.join(process.cwd(), 'artifacts', 'lab-04', 'screenshots', 'actions-taken');

test.describe('Issue 19: Actions Taken UI Visual Evidence Capture', () => {
  test.beforeAll(() => {
    if (!fs.existsSync(SCREENSHOTS_DIR)) {
      fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
    }
  });

  test.beforeEach(async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('Capture visual screenshots for Actions Taken UI across viewports and roles', async ({ page }) => {
    // ---------------------------------------------------------------------------
    // 1. Log in as IT Staff (Wichai IT)
    // ---------------------------------------------------------------------------
    await expect(page.locator('[data-testid="login-email-input"]')).toBeVisible({ timeout: 15000 });
    await page.locator('[data-testid="login-email-input"]').fill('wichai.it@kmutt.ac.th');
    await page.locator('[data-testid="login-password-input"]').fill('Password123!');
    await page.locator('[data-testid="login-submit-button"]').click();

    // Verify Staff Queue loads
    await expect(page.locator('[data-testid="staff-ticket-queue-view"]')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('[data-testid="queue-skeleton"]')).toBeHidden({ timeout: 15000 });

    // Search for ticket TKT-2026-00001
    await page.locator('[data-testid="queue-search-input"]').fill('TKT-2026-00001');
    await page.waitForTimeout(600);

    const ticketRow = page.locator('[data-testid^="queue-row-"]').first();
    await expect(ticketRow).toBeVisible({ timeout: 10000 });
    await ticketRow.click();

    // Verify Staff Ticket Detail view and Actions Taken section load
    await expect(page.locator('[data-testid="staff-ticket-detail-view"]')).toBeVisible({ timeout: 10000 });
    const actionsSection = page.locator('[data-testid="actions-taken-section"]');
    await expect(actionsSection).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1000);

    // ---------------------------------------------------------------------------
    // Artifact 1: Desktop Viewport (1280x800)
    // ---------------------------------------------------------------------------
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '01-actions-taken-desktop.png'),
      fullPage: true,
    });

    // ---------------------------------------------------------------------------
    // Artifact 2: Tablet Viewport (768x1024)
    // ---------------------------------------------------------------------------
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '02-actions-taken-tablet.png'),
      fullPage: true,
    });

    // ---------------------------------------------------------------------------
    // Artifact 3: Mobile Viewport (375x667)
    // ---------------------------------------------------------------------------
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '03-actions-taken-mobile.png'),
      fullPage: true,
    });

    // ---------------------------------------------------------------------------
    // Artifact 4: Create/Edit Action Modal with Follow-Up Note Toggled
    // ---------------------------------------------------------------------------
    await page.setViewportSize({ width: 1280, height: 800 });
    const logActionBtn = page.locator('[data-testid="open-create-action-modal-btn"]');
    await expect(logActionBtn).toBeVisible({ timeout: 5000 });
    await logActionBtn.click();

    const modal = page.locator('[data-testid="action-taken-modal"]');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Fill sample values
    await page.locator('[data-testid="action-description-input"]').fill('Inspected core rack patch panel and replaced connector.');
    await page.locator('[data-testid="action-result-input"]').fill('Port throughput restored to 1Gbps full duplex.');

    // Toggle Follow-up Required
    const followupCheckbox = page.locator('[data-testid="followup-required-checkbox"]');
    await followupCheckbox.click();
    await expect(page.locator('[data-testid="followup-note-input"]')).toBeVisible({ timeout: 5000 });
    await page.locator('[data-testid="followup-note-input"]').fill('Monitor port drop telemetry tomorrow morning during peak hours.');

    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '04-actions-taken-modal.png'),
      fullPage: true,
    });

    // Close modal
    await page.locator('[data-testid="cancel-action-taken-btn"]').click();
    await expect(modal).toBeHidden({ timeout: 5000 });

    // ---------------------------------------------------------------------------
    // Artifact 5: Requester Ticket Detail Read-Only View
    // ---------------------------------------------------------------------------
    // Log out as staff
    await page.locator('[data-testid="logout-button"]').click();
    await expect(page.locator('[data-testid="login-email-input"]')).toBeVisible({ timeout: 10000 });

    // Log in as Requester (Sompong IT)
    await page.locator('[data-testid="login-email-input"]').fill('sompong.it@kmutt.ac.th');
    await page.locator('[data-testid="login-password-input"]').fill('Password123!');
    await page.locator('[data-testid="login-submit-button"]').click();

    // Navigate to "My Tickets"
    const navMyTickets = page.locator('[data-testid="nav-my-tickets"]');
    await expect(navMyTickets).toBeVisible({ timeout: 10000 });
    await navMyTickets.click();
    await page.waitForTimeout(1000);

    const ticketLink = page.locator('[data-testid^="ticket-link-"]').first();
    await expect(ticketLink).toBeVisible({ timeout: 10000 });
    await ticketLink.click();

    // Wait for Requester Ticket Detail view to load
    await expect(page.locator('[data-testid="actions-taken-section"]')).toBeVisible({ timeout: 10000 });
    // Verify "+ Log Action Taken" is absent
    await expect(page.locator('[data-testid="open-create-action-modal-btn"]')).toHaveCount(0);

    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '05-actions-taken-requester.png'),
      fullPage: true,
    });
  });
});
