import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const SCREENSHOTS_BASE = path.join(process.cwd(), 'artifacts', 'lab-03', 'screenshots');

test.describe('Lab 3 Official Submission Screenshots (34 Visual Evidence Artifacts)', () => {
  test.describe.configure({ mode: 'serial' });

  // ---------------------------------------------------------------------------
  // Category 1: Authentication & Password Lifecycle (Screenshots 01 - 09) - Labsheet Part 5
  // ---------------------------------------------------------------------------
  test('Capture Screenshots 01-09: Authentication & Session Lifecycle (Part 5)', async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    // 01: Valid Login Screen on Desktop (1280x800) with credentials populated
    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(page.locator('[data-testid="login-email-input"]')).toBeVisible({ timeout: 10000 });
    await page.locator('[data-testid="login-email-input"]').fill('sompong.it@kmutt.ac.th');
    await page.locator('[data-testid="login-password-input"]').fill('Password123!');
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(SCREENSHOTS_BASE, 'authentication', '01-login-screen-desktop.png'), fullPage: true });

    // 02: Login Submitting Busy State (spinner and disabled controls)
    await page.route('**/api/v1/auth/login', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await route.continue();
    });

    await page.locator('[data-testid="login-submit-button"]').click();
    await expect(page.locator('[data-testid="login-submit-button"]')).toBeDisabled({ timeout: 5000 });
    await expect(page.locator('[data-testid="login-submit-button"]')).toContainText('Signing in...');
    await page.screenshot({ path: path.join(SCREENSHOTS_BASE, 'authentication', '02-login-submitting-busy-state.png'), fullPage: true });

    await expect(page.locator('[data-testid="logout-button"]')).toBeVisible({ timeout: 10000 });
    await page.unroute('**/api/v1/auth/login');

    // 03: Invalid Credentials Error Alert (1280x800)
    await context.clearCookies();
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(page.locator('[data-testid="login-email-input"]')).toBeVisible({ timeout: 10000 });

    await page.locator('[data-testid="login-email-input"]').fill('sompong.it@kmutt.ac.th');
    await page.locator('[data-testid="login-password-input"]').fill('WrongPassword999!');
    await page.locator('[data-testid="login-submit-button"]').click();
    await expect(page.locator('[data-testid="login-error-alert"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="login-error-alert"]')).toContainText('Invalid email or password');
    await page.screenshot({ path: path.join(SCREENSHOTS_BASE, 'authentication', '03-login-invalid-credentials-alert.png'), fullPage: true });

    // 04: Inactive Account Handling Safe Feedback (1280x800)
    await page.locator('[data-testid="login-email-input"]').fill('prasert.in@kmutt.ac.th');
    await page.locator('[data-testid="login-password-input"]').fill('Password123!');
    await page.locator('[data-testid="login-submit-button"]').click();
    await expect(page.locator('[data-testid="login-error-alert"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="login-error-alert"]')).toContainText('Invalid email or password');
    await page.screenshot({ path: path.join(SCREENSHOTS_BASE, 'authentication', '04-login-inactive-account-alert.png'), fullPage: true });

    // Ensure new.requester@kmutt.ac.th has mustChangePassword = true and InitialPass123!
    await page.request.post('http://localhost:3000/api/v1/auth/login', {
      data: { email: 'admin.toktick@kmutt.ac.th', password: 'Password123!' },
    });
    const usersRes = await page.request.get('http://localhost:3000/api/v1/admin/users?search=new.requester');
    const usersData = await usersRes.json();
    const targetUser = usersData.users?.find((u: any) => u.email === 'new.requester@kmutt.ac.th');
    if (targetUser) {
      await page.request.post(`http://localhost:3000/api/v1/admin/users/${targetUser.id}/reset-password`, {
        data: { initialPassword: 'InitialPass123!' },
      });
    }
    await page.context().clearCookies();
    await page.goto('/');
    await expect(page.locator('[data-testid="login-email-input"]')).toBeVisible({ timeout: 10000 });

    // 05: Mandatory Initial Password Change Screen (unfulfilled checklist)
    await page.locator('[data-testid="login-email-input"]').fill('new.requester@kmutt.ac.th');
    await page.locator('[data-testid="login-password-input"]').fill('InitialPass123!');
    await page.locator('[data-testid="login-submit-button"]').click();
    await expect(page.locator('text=/Change Your Initial Password/i')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(400); // Allow smooth auto-scroll to position card
    await page.screenshot({ path: path.join(SCREENSHOTS_BASE, 'authentication', '05-change-password-checklist-initial.png'), fullPage: true });

    // 06: Mandatory Password Change - Rules Satisfied (green checkmarks)
    await page.locator('[data-testid="current-password-input"]').fill('InitialPass123!');
    await page.locator('[data-testid="new-password-input"]').fill('ValidPass1!');
    await page.locator('[data-testid="confirm-password-input"]').fill('ValidPass1!');
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(SCREENSHOTS_BASE, 'authentication', '06-change-password-checklist-satisfied.png'), fullPage: true });

    // 07: Authenticated User & Role Display in Header
    await page.locator('[data-testid="change-password-submit-button"]').click();
    await expect(page.locator('[data-testid="user-name-display"]')).toHaveText('New Requester', { timeout: 10000 });
    await expect(page.locator('[data-testid="user-role-badge"]')).toHaveText('Requester', { timeout: 10000 });
    await page.waitForTimeout(500); // Allow smooth scroll to top
    await page.screenshot({ path: path.join(SCREENSHOTS_BASE, 'authentication', '07-header-user-role-badge.png'), fullPage: true });

    // 08: Logout Execution & Clean Login View
    await page.locator('[data-testid="logout-button"]').click();
    await expect(page.locator('[data-testid="login-email-input"]')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(SCREENSHOTS_BASE, 'authentication', '08-logout-success.png'), fullPage: true });

    // 09: Direct Access Blocked After Logout (Direct API request returning 401 Unauthorized JSON)
    await context.clearCookies();
    await page.goto('http://localhost:3000/api/v1/auth/me');
    await expect(page.locator('body')).toContainText('Authentication required');
    await page.screenshot({ path: path.join(SCREENSHOTS_BASE, 'authentication', '09-direct-api-blocked-unauthorized.png'), fullPage: true });
  });

  // ---------------------------------------------------------------------------
  // Category 2: IT Staff Ticket Queue & Controls (Screenshots 10 - 19) - Labsheet Part 6
  // ---------------------------------------------------------------------------
  test('Capture Screenshots 10-19: Staff Ticket Queue Responsive Views & Filtering (Part 6)', async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    // Login as IT Staff
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.locator('[data-testid="login-email-input"]').fill('wichai.it@kmutt.ac.th');
    await page.locator('[data-testid="login-password-input"]').fill('Password123!');
    await page.locator('[data-testid="login-submit-button"]').click();

    await expect(page.locator('[data-testid="staff-ticket-queue-view"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="queue-skeleton"]')).toBeHidden({ timeout: 10000 });

    // 10: Staff Queue Desktop - Realistic queue data, badges, and ownership (1280x800)
    await page.screenshot({ path: path.join(SCREENSHOTS_BASE, 'staff-queue', '10-staff-queue-desktop.png'), fullPage: true });

    // 11: Staff Queue Tablet - Responsive horizontal overflow wrapper (768x1024)
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(SCREENSHOTS_BASE, 'staff-queue', '11-staff-queue-tablet.png'), fullPage: true });

    // 12: Staff Queue Mobile - Responsive stacked Zen Green cards (375x812)
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(SCREENSHOTS_BASE, 'staff-queue', '12-staff-queue-mobile-cards.png'), fullPage: true });

    // 13: Staff Queue Search & Multi-Field Filters Applied (1280x800)
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.locator('[data-testid="queue-search-input"]').fill('Printer');
    await page.locator('[data-testid="filter-status"]').selectOption('NEW');
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(SCREENSHOTS_BASE, 'staff-queue', '13-staff-queue-search-filtered.png'), fullPage: true });

    // 14: Staff Queue Owner Filter - Unassigned Tickets
    await page.locator('[data-testid="queue-search-input"]').fill('');
    await page.locator('[data-testid="filter-status"]').selectOption('');
    await page.locator('[data-testid="filter-owner"]').selectOption('unassigned');
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(SCREENSHOTS_BASE, 'staff-queue', '14-staff-queue-owner-unassigned.png'), fullPage: true });

    // 15: Staff Queue Column Sorting Applied (IT Priority / Creation Date)
    await page.locator('[data-testid="reset-filters-button"]').click();
    await page.waitForTimeout(400);
    await page.locator('[data-testid="th-sort-priority"]').click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(SCREENSHOTS_BASE, 'staff-queue', '15-staff-queue-sorting-applied.png'), fullPage: true });

    // 16: Staff Queue Pagination Controls & Metadata
    await page.locator('[data-testid="page-size-select"]').selectOption('25');
    await page.waitForTimeout(400);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(SCREENSHOTS_BASE, 'staff-queue', '16-staff-queue-pagination.png'), fullPage: true });

    // 17: Staff Queue Empty / No-Results Feedback
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.locator('[data-testid="queue-search-input"]').fill('NonExistentTicketQuery9999');
    await page.waitForTimeout(600);
    await expect(page.locator('[data-testid="queue-empty-state"]')).toBeVisible({ timeout: 5000 });
    await page.screenshot({ path: path.join(SCREENSHOTS_BASE, 'staff-queue', '17-staff-queue-empty-no-results.png'), fullPage: true });

    // 18: Staff Queue Failure Feedback (Safe Error Banner with Retry)
    await page.route('**/api/v1/staff/tickets*', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: { message: 'Database connection timeout' } }),
      });
    });
    await page.locator('[data-testid="reset-filters-button"]').click();
    await expect(page.locator('[data-testid="queue-error-alert"]')).toBeVisible({ timeout: 5000 });
    await page.screenshot({ path: path.join(SCREENSHOTS_BASE, 'staff-queue', '18-staff-queue-failure-feedback.png'), fullPage: true });
    await page.unroute('**/api/v1/staff/tickets*');

    // 19: Staff Queue Open-Detail Action Leading to Ticket Detail View
    await page.locator('button:has-text("Retry")').click();
    await expect(page.locator('[data-testid="queue-error-alert"]')).toBeHidden({ timeout: 10000 });
    const firstRow = page.locator('[data-testid^="queue-row-"]').first();
    await expect(firstRow).toBeVisible({ timeout: 10000 });
    await firstRow.click();
    await expect(page.locator('[data-testid="staff-ticket-detail-view"]')).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: path.join(SCREENSHOTS_BASE, 'staff-queue', '19-staff-queue-open-detail-action.png'), fullPage: true });
  });

  // ---------------------------------------------------------------------------
  // Category 3: Staff Ticket Detail & Collaboration Flow (Screenshots 20 - 31) - Labsheet Part 7
  // ---------------------------------------------------------------------------
  test('Capture Screenshots 20-31: Ticket Detail Operational Controls & Dual Threads (Part 7)', async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    // 1. Login as IT Staff (Wichai)
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.locator('[data-testid="login-email-input"]').fill('wichai.it@kmutt.ac.th');
    await page.locator('[data-testid="login-password-input"]').fill('Password123!');
    await page.locator('[data-testid="login-submit-button"]').click();

    await expect(page.locator('[data-testid="staff-ticket-queue-view"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="queue-skeleton"]')).toBeHidden({ timeout: 10000 });

    // Open unassigned ticket TKT-2026-00002 via search
    await page.locator('[data-testid="queue-search-input"]').fill('TKT-2026-00002');
    await page.waitForTimeout(600);
    const ticketRow = page.locator('[data-testid^="queue-row-"]').first();
    await expect(ticketRow).toBeVisible({ timeout: 10000 });
    await ticketRow.click();
    await expect(page.locator('[data-testid="staff-ticket-detail-view"]')).toBeVisible({ timeout: 10000 });

    // 20: Ticket Claim / Reassign (1-click Claim to Wichai IT)
    const claimBtn = page.locator('[data-testid="claim-ticket-btn"]');
    if (await claimBtn.isVisible() && await claimBtn.isEnabled()) {
      await claimBtn.click();
      await expect(page.locator('[data-testid="current-owner-display"]')).toContainText('Wichai IT', { timeout: 10000 });
      await page.waitForTimeout(400);
    }
    await page.screenshot({ path: path.join(SCREENSHOTS_BASE, 'staff-ticket-detail', '20-ticket-detail-claim-reassign.png'), fullPage: true });

    // 21: IT Priority Updated to URGENT
    await page.locator('[data-testid="it-priority-select"]').selectOption('URGENT');
    await page.locator('[data-testid="save-priority-btn"]').click();
    await expect(page.locator('[data-testid="ticket-it-priority-badge"]')).toContainText('URGENT', { timeout: 10000 });
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(SCREENSHOTS_BASE, 'staff-ticket-detail', '21-ticket-detail-it-priority.png'), fullPage: true });

    // 22: Permitted Status Transitions Executed (NEW -> OPEN -> IN_PROGRESS)
    const currentStatus = (await page.locator('[data-testid="ticket-status-badge"]').innerText()).trim();
    if (currentStatus === 'NEW') {
      await page.locator('[data-testid="status-transition-select"]').selectOption('OPEN');
      await page.locator('[data-testid="transition-status-btn"]').click();
      await expect(page.locator('[data-testid="ticket-status-badge"]')).toHaveText('OPEN', { timeout: 10000 });
      await page.waitForTimeout(400);
    }
    await page.locator('[data-testid="status-transition-select"]').selectOption('IN_PROGRESS');
    await page.locator('[data-testid="transition-status-btn"]').click();
    await expect(page.locator('[data-testid="ticket-status-badge"]')).toHaveText('IN_PROGRESS', { timeout: 10000 });
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(SCREENSHOTS_BASE, 'staff-ticket-detail', '22-ticket-detail-status-transition.png'), fullPage: true });

    // 23: Public Comment Posted
    await page.locator('[data-testid="public-comment-input"]').fill('Investigating projector bulb issue. Replacement lamp requested.');
    await page.locator('[data-testid="submit-public-comment-btn"]').click();
    await expect(page.locator('[data-testid="public-comments-list"]')).toContainText('Replacement lamp requested', { timeout: 10000 });
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(SCREENSHOTS_BASE, 'staff-ticket-detail', '23-ticket-detail-public-comment.png'), fullPage: true });

    // 24: Confidential Internal IT Note Posted (Amber Guardrail)
    await page.locator('[data-testid="internal-note-input"]').fill('Internal diagnostics: Bulb filament degraded. Workorder #8821 dispatched to facilities.');
    await page.locator('[data-testid="submit-internal-note-btn"]').click();
    await expect(page.locator('[data-testid="internal-notes-list"]')).toContainText('Bulb filament degraded', { timeout: 10000 });
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(SCREENSHOTS_BASE, 'staff-ticket-detail', '24-ticket-detail-internal-note.png'), fullPage: true });

    // 25: Attachment Continuity (Lab 2 attachments rendered on ticket detail)
    await expect(page.locator('text=projector-error-log.png')).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: path.join(SCREENSHOTS_BASE, 'staff-ticket-detail', '25-ticket-detail-attachment-continuity.png'), fullPage: true });

    // 26: Validation Feedback (Empty inputs disable submit buttons with character counter)
    await page.locator('[data-testid="public-comment-input"]').fill('');
    await page.locator('[data-testid="internal-note-input"]').fill('');
    await expect(page.locator('[data-testid="submit-public-comment-btn"]')).toBeDisabled();
    await expect(page.locator('[data-testid="submit-internal-note-btn"]')).toBeDisabled();
    await page.locator('[data-testid="public-comment-input"]').fill('Draft comment text for validation test');
    await page.locator('[data-testid="public-comment-input"]').focus();
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(SCREENSHOTS_BASE, 'staff-ticket-detail', '26-ticket-detail-validation-feedback.png'), fullPage: true });
    await page.locator('[data-testid="public-comment-input"]').fill('');

    // 27: Safe Failure Behavior (Simulated 500 error display on priority save)
    await page.route('**/api/v1/staff/tickets/*/priority', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: { message: 'Database connection timeout during priority save.' } }),
      });
    });
    await page.locator('[data-testid="it-priority-select"]').selectOption('LOW');
    await page.locator('[data-testid="save-priority-btn"]').click();
    await expect(page.locator('text=Database connection timeout during priority save.')).toBeVisible({ timeout: 5000 });
    await page.screenshot({ path: path.join(SCREENSHOTS_BASE, 'staff-ticket-detail', '27-ticket-detail-safe-failure.png'), fullPage: true });
    await page.unroute('**/api/v1/staff/tickets/*/priority');

    // 28: Role Restrictions (Requester view strictly hides internal notes and operational controls)
    await page.locator('[data-testid="logout-button"]').click();
    await expect(page.locator('[data-testid="login-email-input"]')).toBeVisible({ timeout: 10000 });

    await page.locator('[data-testid="login-email-input"]').fill('anong.sta@kmutt.ac.th');
    await page.locator('[data-testid="login-password-input"]').fill('Password123!');
    await page.locator('[data-testid="login-submit-button"]').click();

    await page.locator('[data-testid="nav-my-tickets"]').click();
    await expect(page.locator('[data-testid="my-tickets-container"]')).toBeVisible({ timeout: 10000 });

    const reqTicketRow = page.locator('tr').filter({ hasText: 'TKT-2026-00002' });
    await expect(reqTicketRow).toBeVisible({ timeout: 10000 });
    await reqTicketRow.locator('[data-testid^="ticket-link-"]').click();
    await expect(page.locator('[data-testid="ticket-detail-view"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="internal-notes-section"]')).toBeHidden();
    await expect(page.locator('[data-testid="claim-ticket-btn"]')).toBeHidden();
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(SCREENSHOTS_BASE, 'staff-ticket-detail', '28-ticket-detail-role-restrictions.png'), fullPage: true });

    // 29: Requester Resolution Indication
    const indicateResolvedBtn = page.locator('[data-testid="indicate-resolved-btn"]');
    if (await indicateResolvedBtn.isVisible()) {
      await indicateResolvedBtn.click();
      await expect(page.locator('[data-testid="resolve-confirm-modal"]')).toBeVisible({ timeout: 5000 });
      await page.locator('[data-testid="confirm-resolve-btn"]').click();
      await expect(page.locator('[data-testid="requester-resolved-banner"]')).toBeVisible({ timeout: 10000 });
      await page.waitForTimeout(400);
    }
    await page.screenshot({ path: path.join(SCREENSHOTS_BASE, 'staff-ticket-detail', '29-ticket-detail-requester-resolved.png'), fullPage: true });

    // 30: Staff View of Requester Resolution Alert
    await page.locator('[data-testid="logout-button"]').click();
    await expect(page.locator('[data-testid="login-email-input"]')).toBeVisible({ timeout: 10000 });

    await page.locator('[data-testid="login-email-input"]').fill('wichai.it@kmutt.ac.th');
    await page.locator('[data-testid="login-password-input"]').fill('Password123!');
    await page.locator('[data-testid="login-submit-button"]').click();

    await expect(page.locator('[data-testid="staff-ticket-queue-view"]')).toBeVisible({ timeout: 10000 });
    await page.locator('[data-testid="queue-search-input"]').fill('TKT-2026-00002');
    await page.waitForTimeout(600);
    const staffRow = page.locator('[data-testid^="queue-row-"]').first();
    await staffRow.click();
    await expect(page.locator('[data-testid="staff-ticket-detail-view"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="requester-resolved-indicator"]')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(SCREENSHOTS_BASE, 'staff-ticket-detail', '30-ticket-detail-staff-resolution-alert.png'), fullPage: true });

    // 31: Direct API Authorization Evidence (Requester blocked from staff endpoint returning HTTP 403 Forbidden JSON)
    await page.locator('[data-testid="logout-button"]').click();
    await expect(page.locator('[data-testid="login-email-input"]')).toBeVisible({ timeout: 10000 });
    await page.locator('[data-testid="login-email-input"]').fill('anong.sta@kmutt.ac.th');
    await page.locator('[data-testid="login-password-input"]').fill('Password123!');
    await page.locator('[data-testid="login-submit-button"]').click();
    await expect(page.locator('[data-testid="user-name-display"]')).toBeVisible({ timeout: 10000 });

    await page.goto('http://localhost:3000/api/v1/staff/tickets');
    await expect(page.locator('body')).toContainText('FORBIDDEN');
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(SCREENSHOTS_BASE, 'staff-ticket-detail', '31-ticket-detail-direct-api-403.png'), fullPage: true });
  });

  // ---------------------------------------------------------------------------
  // Category 4: Administrator User Management (Screenshots 32 - 43) - Labsheet Part 8
  // ---------------------------------------------------------------------------
  test('Capture Screenshots 32-43: Administrator User Management & Security Modals', async ({ page, context }) => {
    test.setTimeout(120000);
    await context.clearCookies();
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    // -------------------------------------------------------------------------
    // 32: User Management Desktop (1280x800) - Full User List Table
    // -------------------------------------------------------------------------
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.locator('[data-testid="login-email-input"]').fill('admin.toktick@kmutt.ac.th');
    await page.locator('[data-testid="login-password-input"]').fill('Password123!');
    await page.locator('[data-testid="login-submit-button"]').click();

    await expect(page.locator('[data-testid="user-management-view"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="users-table"]')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(SCREENSHOTS_BASE, 'user-management', '32-user-admin-desktop.png'), fullPage: false });

    // -------------------------------------------------------------------------
    // 33: User Management Search & Role Filter Applied
    // -------------------------------------------------------------------------
    await page.locator('[data-testid="input-search-users"]').fill('wichai');
    await page.locator('[data-testid="select-role-filter"]').selectOption('IT_STAFF');
    await page.locator('button:has-text("Search")').click();
    await page.waitForTimeout(500);
    await expect(page.locator('[data-testid="users-table"]')).toContainText('Wichai IT');
    await expect(page.locator('[data-testid="btn-reset-filters"]')).toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOTS_BASE, 'user-management', '33-user-admin-search-filter.png'), fullPage: false });

    // Reset filters
    await page.locator('[data-testid="btn-reset-filters"]').click();
    await page.waitForTimeout(500);

    // -------------------------------------------------------------------------
    // 34: Create User Modal with Permitted Role & Password Complexity Rules
    // -------------------------------------------------------------------------
    await page.locator('[data-testid="btn-create-user"]').click();
    const createModal = page.locator('[data-testid="form-create-user"]');
    await expect(createModal).toBeVisible({ timeout: 5000 });
    await page.locator('[data-testid="input-create-name"]').fill('Chaiwat Technician');
    await page.locator('[data-testid="input-create-email"]').fill('chaiwat.tech@kmutt.ac.th');
    await page.locator('[data-testid="select-create-role"]').selectOption('IT_STAFF');
    await page.locator('[data-testid="input-create-password"]').fill('Pass1!');
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(SCREENSHOTS_BASE, 'user-management', '34-user-admin-create-modal.png'), fullPage: false });

    // -------------------------------------------------------------------------
    // 35: Duplicate Email Conflict & Validation Feedback (409 Conflict)
    // -------------------------------------------------------------------------
    await page.locator('[data-testid="input-create-email"]').fill('anong.sta@kmutt.ac.th');
    await page.locator('[data-testid="input-create-password"]').fill('ValidSecurePass123!');
    await page.locator('[data-testid="btn-submit-create"]').click();
    await expect(page.locator('[data-testid="create-error-alert"]')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(SCREENSHOTS_BASE, 'user-management', '35-user-admin-duplicate-validation.png'), fullPage: false });
    await page.locator('[data-testid="btn-cancel-create"]').click();
    await expect(createModal).toBeHidden();

    // -------------------------------------------------------------------------
    // 36: Edit User & Deactivate Account (Inactive state in directory)
    // -------------------------------------------------------------------------
    const targetUserRow = page.locator('tr').filter({ hasText: 'ekachai.it@kmutt.ac.th' });
    await targetUserRow.locator('button:has-text("Edit")').click();
    const editModal = page.locator('[data-testid="form-edit-user"]');
    await expect(editModal).toBeVisible({ timeout: 5000 });
    await page.locator('[data-testid="toggle-edit-active"]').uncheck();
    await page.locator('[data-testid="btn-submit-edit"]').click();
    await expect(editModal).toBeHidden({ timeout: 10000 });
    await expect(targetUserRow.locator('[data-testid^="status-badge-"]')).toHaveText('Inactive');
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(SCREENSHOTS_BASE, 'user-management', '36-user-admin-edit-deactivate.png'), fullPage: false });

    // -------------------------------------------------------------------------
    // 37: Set New Initial Password Modal with Notice
    // -------------------------------------------------------------------------
    const resetUserRow = page.locator('tr').filter({ hasText: 'nareerat.it@kmutt.ac.th' });
    await resetUserRow.locator('button:has-text("Reset Pwd")').click();
    const resetModal = page.locator('[data-testid="form-reset-password"]');
    await expect(resetModal).toBeVisible({ timeout: 5000 });
    await page.locator('[data-testid="input-reset-password"]').fill('TemporaryResetPass123!');
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(SCREENSHOTS_BASE, 'user-management', '37-user-admin-reset-password-modal.png'), fullPage: false });

    // Submit reset password
    await page.locator('[data-testid="btn-submit-reset"]').click();
    await expect(resetModal).toBeHidden({ timeout: 10000 });

    // -------------------------------------------------------------------------
    // 38: Forced Password Change on Next Login
    // -------------------------------------------------------------------------
    await page.locator('[data-testid="logout-button"]').click();
    await expect(page.locator('[data-testid="login-email-input"]')).toBeVisible({ timeout: 10000 });

    await page.locator('[data-testid="login-email-input"]').fill('nareerat.it@kmutt.ac.th');
    await page.locator('[data-testid="login-password-input"]').fill('TemporaryResetPass123!');
    await page.locator('[data-testid="login-submit-button"]').click();

    await expect(page.locator('text=/Change Your Initial Password/i')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="new-password-input"]')).toBeVisible();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREENSHOTS_BASE, 'user-management', '38-user-admin-forced-password-change-login.png'), fullPage: false });

    // -------------------------------------------------------------------------
    // 39: Prevention of Self-Deactivation (BR-11)
    // -------------------------------------------------------------------------
    await context.clearCookies();
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    await expect(page.locator('[data-testid="login-email-input"]')).toBeVisible({ timeout: 10000 });
    await page.locator('[data-testid="login-email-input"]').fill('admin.toktick@kmutt.ac.th');
    await page.locator('[data-testid="login-password-input"]').fill('Password123!');
    await page.locator('[data-testid="login-submit-button"]').click();
    await expect(page.locator('[data-testid="user-management-view"]')).toBeVisible({ timeout: 10000 });

    const selfRow = page.locator('tr').filter({ hasText: 'admin.toktick@kmutt.ac.th' });
    await selfRow.locator('button:has-text("Edit")').click();
    await expect(editModal).toBeVisible({ timeout: 5000 });
    await expect(page.locator('[data-testid="self-edit-warning"]')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('[data-testid="select-edit-role"]')).toBeDisabled();
    await expect(page.locator('[data-testid="toggle-edit-active"]')).toBeDisabled();
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(SCREENSHOTS_BASE, 'user-management', '39-user-admin-self-deactivation-guard.png'), fullPage: false });
    await page.locator('[data-testid="btn-cancel-edit"]').click();
    await expect(editModal).toBeHidden();

    // -------------------------------------------------------------------------
    // 40: Prevention of Removing the Last Active Administrator (BR-12)
    // -------------------------------------------------------------------------
    const backupAdminRow = page.locator('tr').filter({ hasText: 'backup.admin@kmutt.ac.th' });
    await backupAdminRow.locator('button:has-text("Edit")').click();
    await expect(editModal).toBeVisible({ timeout: 5000 });
    await page.locator('[data-testid="toggle-edit-active"]').uncheck();
    await page.locator('[data-testid="btn-submit-edit"]').click();
    await expect(editModal).toBeHidden({ timeout: 10000 });
    await expect(backupAdminRow.locator('[data-testid^="status-badge-"]')).toHaveText('Inactive');

    // With backup.admin inactive, activeAdminCount is 1. Open edit on backup.admin to show BR-12 last admin protection banner
    await backupAdminRow.locator('button:has-text("Edit")').click();
    await expect(editModal).toBeVisible({ timeout: 5000 });
    await expect(page.locator('[data-testid="last-admin-warning"]')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('[data-testid="select-edit-role"]')).toBeDisabled();
    await expect(page.locator('[data-testid="toggle-edit-active"]')).toBeDisabled();
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(SCREENSHOTS_BASE, 'user-management', '40-user-admin-last-admin-guard.png'), fullPage: false });
    await page.locator('[data-testid="btn-cancel-edit"]').click();
    await expect(editModal).toBeHidden();

    // -------------------------------------------------------------------------
    // 41: Forbidden Access for Non-Administrators (HTTP 403 Forbidden)
    // -------------------------------------------------------------------------
    await page.locator('[data-testid="logout-button"]').click();
    await expect(page.locator('[data-testid="login-email-input"]')).toBeVisible({ timeout: 10000 });

    await page.locator('[data-testid="login-email-input"]').fill('anong.sta@kmutt.ac.th');
    await page.locator('[data-testid="login-password-input"]').fill('Password123!');
    await page.locator('[data-testid="login-submit-button"]').click();
    await expect(page.locator('[data-testid="user-name-display"]')).toBeVisible({ timeout: 10000 });

    // Non-admin attempts direct access to admin users endpoint
    await page.goto('http://localhost:3000/api/v1/admin/users');
    await expect(page.locator('body')).toContainText('FORBIDDEN');
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(SCREENSHOTS_BASE, 'user-management', '41-user-admin-forbidden-non-admin.png'), fullPage: true });

    // -------------------------------------------------------------------------
    // 42: Safe Failure Feedback (Simulated 500 Server Failure Banner)
    // -------------------------------------------------------------------------
    await context.clearCookies();
    await page.goto('http://localhost:5173/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    await expect(page.locator('[data-testid="login-email-input"]')).toBeVisible({ timeout: 10000 });
    await page.locator('[data-testid="login-email-input"]').fill('admin.toktick@kmutt.ac.th');
    await page.locator('[data-testid="login-password-input"]').fill('Password123!');
    await page.locator('[data-testid="login-submit-button"]').click();
    await expect(page.locator('[data-testid="user-management-view"]')).toBeVisible({ timeout: 10000 });

    // Intercept update user with simulated 500 error
    await page.route('**/api/v1/admin/users/*', (route) => {
      if (route.request().method() === 'PATCH') {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'error',
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Database failure: unable to update user record. Safe failure feedback displayed without crashing.',
          }),
        });
      } else {
        route.continue();
      }
    });

    const sompongRow = page.locator('tr').filter({ hasText: 'sompong.it@kmutt.ac.th' });
    await sompongRow.locator('button:has-text("Edit")').click();
    await expect(editModal).toBeVisible({ timeout: 5000 });
    await page.locator('[data-testid="btn-submit-edit"]').click();
    await expect(page.locator('[data-testid="edit-error-alert"]')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(SCREENSHOTS_BASE, 'user-management', '42-user-admin-safe-failure-feedback.png'), fullPage: false });

    await page.unroute('**/api/v1/admin/users/*');
    await page.locator('[data-testid="btn-cancel-edit"]').click();
    await expect(editModal).toBeHidden();

    // -------------------------------------------------------------------------
    // 43: Responsive Zen Green Presentation (Mobile Viewport 375x812 with Scroll)
    // -------------------------------------------------------------------------
    await page.setViewportSize({ width: 375, height: 812 });
    await expect(page.locator('[data-testid="mobile-users-list"]')).toBeVisible({ timeout: 10000 });
    await page.evaluate(() => window.scrollTo({ top: 220, behavior: 'smooth' }));
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREENSHOTS_BASE, 'user-management', '43-user-admin-responsive-mobile.png'), fullPage: false });
  });

  // ---------------------------------------------------------------------------
  // Category 5: Major Screens Responsive Presentation (Screenshots 44 - 58) - Labsheet Part 9
  // ---------------------------------------------------------------------------
  test('Capture Screenshots 44-58: Responsive Presentation (Desktop, Tablet, Mobile)', async ({ page, context }) => {
    test.setTimeout(180000);
    const RESPONSIVE_DIR = path.join(SCREENSHOTS_BASE, 'responsive');
    if (!fs.existsSync(RESPONSIVE_DIR)) {
      fs.mkdirSync(RESPONSIVE_DIR, { recursive: true });
    }

    // =========================================================================
    // Screen 1: Login Page
    // =========================================================================
    await context.clearCookies();
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(page.locator('[data-testid="login-email-input"]')).toBeVisible({ timeout: 10000 });

    // 44: Login Desktop (1280x800)
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(RESPONSIVE_DIR, '44-responsive-login-desktop.png'), fullPage: false });

    // 45: Login Tablet (768x1024)
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(RESPONSIVE_DIR, '45-responsive-login-tablet.png'), fullPage: false });

    // 46: Login Mobile (375x812)
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(RESPONSIVE_DIR, '46-responsive-login-mobile.png'), fullPage: false });

    // =========================================================================
    // Screen 2: Change Password Page
    // =========================================================================
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.locator('[data-testid="login-email-input"]').fill('new.requester@kmutt.ac.th');
    await page.locator('[data-testid="login-password-input"]').fill('InitialPass123!');
    await page.locator('[data-testid="login-submit-button"]').click();

    await expect(page.locator('text=/Change Your Initial Password/i')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="new-password-input"]')).toBeVisible({ timeout: 10000 });

    // 47: Change Password Desktop (1280x800)
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(RESPONSIVE_DIR, '47-responsive-change-password-desktop.png'), fullPage: false });

    // 48: Change Password Tablet (768x1024)
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(RESPONSIVE_DIR, '48-responsive-change-password-tablet.png'), fullPage: false });

    // 49: Change Password Mobile (375x812)
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(RESPONSIVE_DIR, '49-responsive-change-password-mobile.png'), fullPage: false });

    // =========================================================================
    // Screen 3: Ticket Queue Page (IT Staff View)
    // =========================================================================
    await context.clearCookies();
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(page.locator('[data-testid="login-email-input"]')).toBeVisible({ timeout: 10000 });
    await page.locator('[data-testid="login-email-input"]').fill('wichai.it@kmutt.ac.th');
    await page.locator('[data-testid="login-password-input"]').fill('Password123!');
    await page.locator('[data-testid="login-submit-button"]').click();

    await expect(page.locator('[data-testid="staff-ticket-queue-view"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid^="queue-row-"]').first()).toBeVisible({ timeout: 10000 });

    // 50: Ticket Queue Desktop (1280x800)
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(RESPONSIVE_DIR, '50-responsive-ticket-queue-desktop.png'), fullPage: false });

    // 51: Ticket Queue Tablet (768x1024)
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(RESPONSIVE_DIR, '51-responsive-ticket-queue-tablet.png'), fullPage: false });

    // 52: Ticket Queue Mobile (375x812)
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(RESPONSIVE_DIR, '52-responsive-ticket-queue-mobile.png'), fullPage: false });

    // =========================================================================
    // Screen 4: Ticket Detail Page (IT Staff View)
    // =========================================================================
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.locator('[data-testid="queue-search-input"]').fill('TKT-2026-00002');
    await page.waitForTimeout(600);
    const queueRow = page.locator('[data-testid^="queue-row-"]').first();
    await queueRow.click();
    await expect(page.locator('[data-testid="staff-ticket-detail-view"]')).toBeVisible({ timeout: 10000 });

    // 53: Ticket Detail Desktop (1280x800)
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(RESPONSIVE_DIR, '53-responsive-ticket-detail-desktop.png'), fullPage: false });

    // 54: Ticket Detail Tablet (768x1024)
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(RESPONSIVE_DIR, '54-responsive-ticket-detail-tablet.png'), fullPage: false });

    // 55: Ticket Detail Mobile (375x812)
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(RESPONSIVE_DIR, '55-responsive-ticket-detail-mobile.png'), fullPage: false });

    // =========================================================================
    // Screen 5: User Management Page (Administrator View)
    // =========================================================================
    await context.clearCookies();
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(page.locator('[data-testid="login-email-input"]')).toBeVisible({ timeout: 10000 });
    await page.locator('[data-testid="login-email-input"]').fill('admin.toktick@kmutt.ac.th');
    await page.locator('[data-testid="login-password-input"]').fill('Password123!');
    await page.locator('[data-testid="login-submit-button"]').click();

    await expect(page.locator('[data-testid="user-management-view"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="users-table"]')).toBeVisible({ timeout: 10000 });

    // 56: User Management Desktop (1280x800)
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(RESPONSIVE_DIR, '56-responsive-user-management-desktop.png'), fullPage: false });

    // 57: User Management Tablet (768x1024)
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(RESPONSIVE_DIR, '57-responsive-user-management-tablet.png'), fullPage: false });

    // 58: User Management Mobile (375x812)
    await page.setViewportSize({ width: 375, height: 812 });
    await expect(page.locator('[data-testid="mobile-users-list"]')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(RESPONSIVE_DIR, '58-responsive-user-management-mobile.png'), fullPage: false });
  });
});


