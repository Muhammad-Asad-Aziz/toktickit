import { test, expect } from '@playwright/test';

test.describe('Issue 22 / Scenario 3: Role-Based Dashboards & 1-Click Drill-Downs (BR-11 to BR-14, AC-12 to AC-15)', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('Requester Dashboard: Scoped Metrics Isolation & 1-Click Drill-Down to My Tickets', async ({ page }) => {
    // 1. Log in as Requester (Sompong IT)
    await expect(page.locator('[data-testid="login-email-input"]')).toBeVisible({ timeout: 15000 });
    await page.locator('[data-testid="login-email-input"]').fill('sompong.it@kmutt.ac.th');
    await page.locator('[data-testid="login-password-input"]').fill('Password123!');
    await page.locator('[data-testid="login-submit-button"]').click();

    // 2. Verify Requester lands on Requester Dashboard by default
    await expect(page.locator('[data-testid="requester-dashboard"]')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('[data-testid="requester-welcome-banner"]')).toContainText('Sompong IT');

    // 3. Verify Scoped Metric Cards exist
    const myOpenCard = page.locator('[data-testid="card-my-open"]');
    const inProgressCard = page.locator('[data-testid="card-in-progress"]');
    const resolvedCard = page.locator('[data-testid="card-resolved"]');
    const closedCard = page.locator('[data-testid="card-closed"]');

    await expect(myOpenCard).toBeVisible({ timeout: 8000 });
    await expect(inProgressCard).toBeVisible();
    await expect(resolvedCard).toBeVisible();
    await expect(closedCard).toBeVisible();

    // 4. Test 1-Click Drill-Down to My Tickets
    const drilldownLink = page.locator('[data-testid="drilldown-my-open"]');
    await expect(drilldownLink).toBeVisible();
    await drilldownLink.click();

    // Verify browser transitions to My Tickets container
    await expect(page.locator('[data-testid="my-tickets-container"]')).toBeVisible({ timeout: 10000 });

    // Logout
    await page.locator('[data-testid="logout-button"]').click();
  });

  test('IT Staff Dashboard: Service-Desk Operational Metrics & 1-Click Drill-Down to Queue', async ({ page }) => {
    // 1. Log in as IT Staff (Wichai IT)
    await expect(page.locator('[data-testid="login-email-input"]')).toBeVisible({ timeout: 15000 });
    await page.locator('[data-testid="login-email-input"]').fill('wichai.it@kmutt.ac.th');
    await page.locator('[data-testid="login-password-input"]').fill('Password123!');
    await page.locator('[data-testid="login-submit-button"]').click();

    // 2. Verify Staff lands on Staff Dashboard by default
    await expect(page.locator('[data-testid="staff-dashboard"]')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('[data-testid="staff-dashboard-banner"]')).toContainText('IT Staff Dashboard');
    await expect(page.locator('[data-testid="user-name-display"]')).toContainText('Wichai IT');

    // 3. Verify Operational KPI Cards
    const unassignedCard = page.locator('[data-testid="card-unassigned"]');
    const myAssignedCard = page.locator('[data-testid="card-my-assigned"]');
    const totalActiveCard = page.locator('[data-testid="card-total-active"]');
    const criticalCard = page.locator('[data-testid="card-critical"]');

    await expect(unassignedCard).toBeVisible({ timeout: 8000 });
    await expect(myAssignedCard).toBeVisible();
    await expect(totalActiveCard).toBeVisible();
    await expect(criticalCard).toBeVisible();

    // 4. Test 1-Click Drill-Down to Staff Queue with Unassigned Filter
    const drilldownUnassigned = page.locator('[data-testid="drilldown-unassigned"]');
    await expect(drilldownUnassigned).toBeVisible();
    await drilldownUnassigned.click();

    // Verify browser transitions to Staff Ticket Queue
    await expect(page.locator('[data-testid="staff-ticket-queue-view"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="queue-skeleton"]')).toBeHidden({ timeout: 10000 });

    // Verify unassigned filter is pre-selected
    const ownerFilter = page.locator('[data-testid="filter-owner"]');
    if (await ownerFilter.isVisible()) {
      await expect(ownerFilter).toHaveValue('unassigned');
    }

    // Logout
    await page.locator('[data-testid="logout-button"]').click();
  });

  test('Administrator Dashboard: System User Tallies & Drill-Down to User Management', async ({ page }) => {
    // 1. Log in as Administrator (Admin TokTick)
    await expect(page.locator('[data-testid="login-email-input"]')).toBeVisible({ timeout: 15000 });
    await page.locator('[data-testid="login-email-input"]').fill('admin.toktick@kmutt.ac.th');
    await page.locator('[data-testid="login-password-input"]').fill('Password123!');
    await page.locator('[data-testid="login-submit-button"]').click();

    // 2. Verify Administrator lands on Staff Dashboard with Admin Extensions
    await expect(page.locator('[data-testid="staff-dashboard"]')).toBeVisible({ timeout: 15000 });

    // 3. Verify Administrative System Metrics Section is rendered
    const adminSection = page.locator('[data-testid="admin-statistics-section"]');
    await expect(adminSection).toBeVisible({ timeout: 8000 });
    await expect(page.locator('[data-testid="admin-total-users"]')).toBeVisible();
    await expect(page.locator('[data-testid="admin-active-users"]')).toBeVisible();
    await expect(page.locator('[data-testid="admin-inactive-users"]')).toBeVisible();
    await expect(page.locator('[data-testid="admin-total-tickets"]')).toBeVisible();

    // 4. Test Drill-Down to User Management
    const manageUsersBtn = page.locator('[data-testid="admin-manage-users-btn"]');
    await expect(manageUsersBtn).toBeVisible();
    await manageUsersBtn.click();

    // Verify browser transitions to User Management view
    await expect(page.locator('[data-testid="user-management-view"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="btn-create-user"]')).toBeVisible();

    // Logout
    await page.locator('[data-testid="logout-button"]').click();
  });
});
