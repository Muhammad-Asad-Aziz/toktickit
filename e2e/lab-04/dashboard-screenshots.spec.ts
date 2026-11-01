import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const REQUESTER_DIR = path.join(process.cwd(), 'artifacts', 'lab-04', 'screenshots', 'requester-dashboard');
const STAFF_DIR = path.join(process.cwd(), 'artifacts', 'lab-04', 'screenshots', 'staff-dashboard');

test.describe('Issue 21: Role-Based Dashboards Visual Evidence Capture', () => {
  test.beforeAll(() => {
    if (!fs.existsSync(REQUESTER_DIR)) {
      fs.mkdirSync(REQUESTER_DIR, { recursive: true });
    }
    if (!fs.existsSync(STAFF_DIR)) {
      fs.mkdirSync(STAFF_DIR, { recursive: true });
    }
  });

  test.beforeEach(async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('Capture visual screenshots for Requester, IT Staff, and Admin Dashboards across viewports', async ({ page }) => {
    // ---------------------------------------------------------------------------
    // Part 1: Requester Dashboard (Sompong IT)
    // ---------------------------------------------------------------------------
    await expect(page.locator('[data-testid="login-email-input"]')).toBeVisible({ timeout: 15000 });
    await page.locator('[data-testid="login-email-input"]').fill('sompong.it@kmutt.ac.th');
    await page.locator('[data-testid="login-password-input"]').fill('Password123!');
    await page.locator('[data-testid="login-submit-button"]').click();

    // Verify Requester Dashboard loads by default post-login (AC-21.5, BR-14)
    await expect(page.locator('[data-testid="requester-dashboard"]')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('[data-testid="card-my-open"]')).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(600);

    // 1.1 Desktop Viewport (1280x800)
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(REQUESTER_DIR, 'requester-dashboard-desktop.png'),
      fullPage: true,
    });
    await page.screenshot({
      path: path.join(REQUESTER_DIR, '01-requester-dashboard-desktop.png'),
      fullPage: true,
    });

    // 1.2 Tablet Viewport (768x1024)
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(REQUESTER_DIR, 'requester-dashboard-tablet.png'),
      fullPage: true,
    });
    await page.screenshot({
      path: path.join(REQUESTER_DIR, '02-requester-dashboard-tablet.png'),
      fullPage: true,
    });

    // 1.3 Mobile Viewport (375x667)
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(REQUESTER_DIR, 'requester-dashboard-mobile.png'),
      fullPage: true,
    });
    await page.screenshot({
      path: path.join(REQUESTER_DIR, '03-requester-dashboard-mobile.png'),
      fullPage: true,
    });

    // 1.4 Drill-Down Interaction to MyTickets
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.locator('[data-testid="drilldown-my-open"]').click();
    await expect(page.locator('[data-testid="my-tickets-container"]')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(REQUESTER_DIR, '04-requester-drilldown-mytickets.png'),
      fullPage: true,
    });

    // ---------------------------------------------------------------------------
    // Part 2: IT Staff Dashboard (Wichai IT)
    // ---------------------------------------------------------------------------
    await page.locator('[data-testid="logout-button"]').click();
    await expect(page.locator('[data-testid="login-email-input"]')).toBeVisible({ timeout: 10000 });

    await page.locator('[data-testid="login-email-input"]').fill('wichai.it@kmutt.ac.th');
    await page.locator('[data-testid="login-password-input"]').fill('Password123!');
    await page.locator('[data-testid="login-submit-button"]').click();

    // Verify Staff Dashboard loads by default post-login (AC-21.5, BR-14)
    await expect(page.locator('[data-testid="staff-dashboard"]')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('[data-testid="card-unassigned"]')).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(600);

    // 2.1 Desktop Viewport (1280x800)
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(STAFF_DIR, 'staff-dashboard-desktop.png'),
      fullPage: true,
    });
    await page.screenshot({
      path: path.join(STAFF_DIR, '01-staff-dashboard-desktop.png'),
      fullPage: true,
    });

    // 2.2 Tablet Viewport (768x1024)
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(STAFF_DIR, 'staff-dashboard-tablet.png'),
      fullPage: true,
    });
    await page.screenshot({
      path: path.join(STAFF_DIR, '02-staff-dashboard-tablet.png'),
      fullPage: true,
    });

    // 2.3 Mobile Viewport (375x667)
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(STAFF_DIR, 'staff-dashboard-mobile.png'),
      fullPage: true,
    });
    await page.screenshot({
      path: path.join(STAFF_DIR, '03-staff-dashboard-mobile.png'),
      fullPage: true,
    });

    // 2.4 Drill-Down Interaction to Unassigned Queue
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.locator('[data-testid="drilldown-unassigned"]').click();
    await expect(page.locator('[data-testid="staff-ticket-queue-view"]')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(STAFF_DIR, '04-staff-drilldown-queue.png'),
      fullPage: true,
    });

    // ---------------------------------------------------------------------------
    // Part 3: Administrator Dashboard with System Tallies (Admin TokTick)
    // ---------------------------------------------------------------------------
    await page.locator('[data-testid="logout-button"]').click();
    await expect(page.locator('[data-testid="login-email-input"]')).toBeVisible({ timeout: 10000 });

    await page.locator('[data-testid="login-email-input"]').fill('admin.toktick@kmutt.ac.th');
    await page.locator('[data-testid="login-password-input"]').fill('Password123!');
    await page.locator('[data-testid="login-submit-button"]').click();

    // Verify Staff Dashboard loads with Administrator Statistics section
    await expect(page.locator('[data-testid="staff-dashboard"]')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('[data-testid="admin-statistics-section"]')).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(600);

    // 3.1 Admin Desktop Viewport (1280x800)
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(STAFF_DIR, 'admin-dashboard-desktop.png'),
      fullPage: true,
    });
    await page.screenshot({
      path: path.join(STAFF_DIR, '05-admin-dashboard-desktop.png'),
      fullPage: true,
    });
  });
});
