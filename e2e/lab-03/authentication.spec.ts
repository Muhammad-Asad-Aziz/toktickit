import { test, expect } from '@playwright/test';

test.describe('Authentication & Session Lifecycle (Lab 3)', () => {
  test.beforeEach(async ({ page, context }) => {
    // Ensure clean state before each test
    await context.clearCookies();
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  // ---------------------------------------------------------------------------
  // AUTH-E2E-01: Valid IT Staff Login & Session Persistence
  // ---------------------------------------------------------------------------
  test('AUTH-E2E-01: Valid user login establishes session and persists across reload', async ({ page }) => {
    await expect(page.locator('[data-testid="login-email-input"]')).toBeVisible({ timeout: 10000 });

    await page.locator('[data-testid="login-email-input"]').fill('wichai.it@kmutt.ac.th');
    await page.locator('[data-testid="login-password-input"]').fill('Password123!');
    await page.locator('[data-testid="login-submit-button"]').click();

    // Verify successful login into Staff Queue
    await expect(page.locator('[data-testid="user-name-display"]')).toHaveText('Wichai IT', { timeout: 10000 });
    await expect(page.locator('[data-testid="user-role-badge"]')).toHaveText('IT Staff');

    // Verify session persistence across page reload
    await page.reload();
    await expect(page.locator('[data-testid="user-name-display"]')).toHaveText('Wichai IT', { timeout: 10000 });
    await expect(page.locator('[data-testid="user-role-badge"]')).toHaveText('IT Staff');
  });

  // ---------------------------------------------------------------------------
  // AUTH-E2E-02: Invalid Credentials Rejection
  // ---------------------------------------------------------------------------
  test('AUTH-E2E-02: Rejects invalid password with safe generic error', async ({ page }) => {
    await expect(page.locator('[data-testid="login-email-input"]')).toBeVisible({ timeout: 10000 });

    await page.locator('[data-testid="login-email-input"]').fill('sompong.it@kmutt.ac.th');
    await page.locator('[data-testid="login-password-input"]').fill('WrongPassword999!');
    await page.locator('[data-testid="login-submit-button"]').click();

    // Verify generic error alert
    const errorAlert = page.locator('[data-testid="login-error-alert"]');
    await expect(errorAlert).toBeVisible({ timeout: 10000 });
    await expect(errorAlert).toContainText(/Invalid email or password/i);

    // Verify user remains on login view
    await expect(page.locator('[data-testid="login-email-input"]')).toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // AUTH-E2E-03: Inactive Account Rejection
  // ---------------------------------------------------------------------------
  test('AUTH-E2E-03: Rejects inactive user with identical safe generic error', async ({ page }) => {
    await expect(page.locator('[data-testid="login-email-input"]')).toBeVisible({ timeout: 10000 });

    await page.locator('[data-testid="login-email-input"]').fill('prasert.in@kmutt.ac.th');
    await page.locator('[data-testid="login-password-input"]').fill('Password123!');
    await page.locator('[data-testid="login-submit-button"]').click();

    // Verify identical error alert without disclosing inactive status
    const errorAlert = page.locator('[data-testid="login-error-alert"]');
    await expect(errorAlert).toBeVisible({ timeout: 10000 });
    await expect(errorAlert).toContainText(/Invalid email or password/i);

    // Verify user remains on login view
    await expect(page.locator('[data-testid="login-email-input"]')).toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // AUTH-E2E-04: Mandatory Initial Password Change Flow
  // ---------------------------------------------------------------------------
  test('AUTH-E2E-04: Mandatory initial password change enforces rules and unlocks app', async ({ page }) => {
    // Idempotency: Reset new.requester password via admin API if previously changed
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

    // Clear session cookies for login
    await page.context().clearCookies();
    await page.goto('/');
    await expect(page.locator('[data-testid="login-email-input"]')).toBeVisible({ timeout: 10000 });

    // Login with seeded user flagged with mustChangePassword = true
    await page.locator('[data-testid="login-email-input"]').fill('new.requester@kmutt.ac.th');
    await page.locator('[data-testid="login-password-input"]').fill('InitialPass123!');
    await page.locator('[data-testid="login-submit-button"]').click();

    // Verify trapped in Change Password view
    await expect(page.locator('text=/Change Your Initial Password/i')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="new-password-input"]')).toBeVisible();

    // Enter current password
    await page.locator('[data-testid="current-password-input"]').fill('InitialPass123!');

    // Test password complexity rules live indicators
    await page.locator('[data-testid="new-password-input"]').fill('weak');
    await expect(page.locator('[data-testid="rule-length"]')).toContainText('At least 8 characters long');

    // Fill valid new password meeting all complexity requirements
    const newCompliantPassword = 'SecureNewPassword2026!';
    await page.locator('[data-testid="new-password-input"]').fill(newCompliantPassword);
    await page.locator('[data-testid="confirm-password-input"]').fill(newCompliantPassword);

    // Assert submit button is enabled and submit
    const submitBtn = page.locator('[data-testid="change-password-submit-button"]');
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();

    // Verify redirection to application home
    await expect(page.locator('[data-testid="user-name-display"]')).toHaveText('New Requester', { timeout: 10000 });
    await expect(page.locator('[data-testid="user-role-badge"]')).toHaveText('Requester');

    // Verify subsequent page reload stays in app and does not re-trap in Change Password
    await page.reload();
    await expect(page.locator('[data-testid="user-name-display"]')).toHaveText('New Requester', { timeout: 10000 });
  });

  // ---------------------------------------------------------------------------
  // AUTH-E2E-05: Application Header Profile Display & Logout Invalidation
  // ---------------------------------------------------------------------------
  test('AUTH-E2E-05: User profile rendering in header and logout session invalidation', async ({ page }) => {
    await expect(page.locator('[data-testid="login-email-input"]')).toBeVisible({ timeout: 10000 });

    // Login as Sompong IT
    await page.locator('[data-testid="login-email-input"]').fill('sompong.it@kmutt.ac.th');
    await page.locator('[data-testid="login-password-input"]').fill('Password123!');
    await page.locator('[data-testid="login-submit-button"]').click();

    // Verify header profile and role badge
    await expect(page.locator('[data-testid="user-name-display"]')).toHaveText('Sompong IT', { timeout: 10000 });
    await expect(page.locator('[data-testid="user-role-badge"]')).toHaveText('Requester');

    // Click logout
    const logoutBtn = page.locator('[data-testid="logout-button"]');
    await expect(logoutBtn).toBeVisible();
    await logoutBtn.click();

    // Assert session is cleared and returned to login view
    await expect(page.locator('[data-testid="login-email-input"]')).toBeVisible({ timeout: 10000 });

    // Verify direct access to app remains blocked after logout
    await page.goto('/');
    await expect(page.locator('[data-testid="login-email-input"]')).toBeVisible({ timeout: 10000 });
  });
});
