import { test, expect } from '@playwright/test';

test.describe('Administrator User Management & Security Boundaries (Lab 3)', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  // ---------------------------------------------------------------------------
  // USER-E2E-01: Administrator Login & Default Navigation
  // ---------------------------------------------------------------------------
  test('USER-E2E-01: Administrator login lands directly on User Management', async ({ page }) => {
    await expect(page.locator('[data-testid="login-email-input"]')).toBeVisible({ timeout: 10000 });

    await page.locator('[data-testid="login-email-input"]').fill('admin.toktick@kmutt.ac.th');
    await page.locator('[data-testid="login-password-input"]').fill('Password123!');
    await page.locator('[data-testid="login-submit-button"]').click();

    // Verify default landing view is User Management
    await expect(page.locator('[data-testid="user-management-view"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="user-name-display"]')).toHaveText('Admin TokTick');
    await expect(page.locator('[data-testid="user-role-badge"]')).toHaveText('Administrator');

    // Verify directory table is visible
    await expect(page.locator('[data-testid="users-table"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="btn-create-user"]')).toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // USER-E2E-02: Directory Search and Role Filtering
  // ---------------------------------------------------------------------------
  test('USER-E2E-02: User directory search, role filtering, and reset filters', async ({ page }) => {
    await page.locator('[data-testid="login-email-input"]').fill('admin.toktick@kmutt.ac.th');
    await page.locator('[data-testid="login-password-input"]').fill('Password123!');
    await page.locator('[data-testid="login-submit-button"]').click();

    await expect(page.locator('[data-testid="user-management-view"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="users-table"]')).toBeVisible({ timeout: 10000 });

    // 1. Search by Name
    const searchInput = page.locator('input[placeholder*="Search by name or email"]');
    await searchInput.fill('Wichai');
    await page.locator('button:has-text("Search")').click();
    await page.waitForTimeout(500);

    // Verify matching user is visible and others hidden
    await expect(page.locator('[data-testid="users-table"]')).toContainText('Wichai IT');
    await expect(page.locator('[data-testid="users-table"]')).not.toContainText('Kittisak Student');

    // 2. Filter by Role: IT_STAFF
    await searchInput.fill('');
    const roleSelect = page.locator('select').filter({ hasText: 'All Roles' });
    await roleSelect.selectOption('IT_STAFF');
    await page.locator('button:has-text("Search")').click();
    await page.waitForTimeout(500);

    await expect(page.locator('[data-testid="users-table"]')).toContainText('Wichai IT');
    await expect(page.locator('[data-testid="users-table"]')).toContainText('Nareerat IT');
    await expect(page.locator('[data-testid="users-table"]')).not.toContainText('Admin TokTick');

    // 3. Reset Filters
    const resetBtn = page.locator('[data-testid="btn-reset-filters"]');
    await expect(resetBtn).toBeVisible();
    await resetBtn.click();
    await page.waitForTimeout(500);

    // Verify all roles restored
    await expect(page.locator('[data-testid="users-table"]')).toContainText('Admin TokTick');
    await expect(page.locator('[data-testid="users-table"]')).toContainText('Wichai IT');
  });

  // ---------------------------------------------------------------------------
  // USER-E2E-03: Create User & Duplicate Email Conflict Rejection
  // ---------------------------------------------------------------------------
  test('USER-E2E-03: Create user account and reject duplicate email (409 conflict)', async ({ page }) => {
    await page.locator('[data-testid="login-email-input"]').fill('admin.toktick@kmutt.ac.th');
    await page.locator('[data-testid="login-password-input"]').fill('Password123!');
    await page.locator('[data-testid="login-submit-button"]').click();

    await expect(page.locator('[data-testid="user-management-view"]')).toBeVisible({ timeout: 10000 });

    // 1. Open Create User Modal
    await page.locator('[data-testid="btn-create-user"]').click();
    const createModal = page.locator('[data-testid="form-create-user"]');
    await expect(createModal).toBeVisible({ timeout: 5000 });

    // 2. Fill valid form
    const newUserEmail = `test.staff.${Date.now()}@kmutt.ac.th`;
    await page.locator('[data-testid="input-create-name"]').fill('Test Staff Officer');
    await page.locator('[data-testid="input-create-email"]').fill(newUserEmail);
    await page.locator('[data-testid="select-create-role"]').selectOption('IT_STAFF');
    await page.locator('[data-testid="input-create-password"]').fill('InitialSecurePass123!');

    // 3. Submit creation
    await page.locator('[data-testid="btn-submit-create"]').click();

    // Verify modal closes and user appears in table
    await expect(createModal).toBeHidden({ timeout: 10000 });
    await expect(page.locator('[data-testid="users-table"]')).toContainText('Test Staff Officer', { timeout: 10000 });
    await expect(page.locator('[data-testid="users-table"]')).toContainText(newUserEmail);

    // 4. Duplicate Email Guardrail: Attempt to create user with the exact same email
    await page.locator('[data-testid="btn-create-user"]').click();
    await expect(createModal).toBeVisible({ timeout: 5000 });

    await page.locator('[data-testid="input-create-name"]').fill('Duplicate User Attempt');
    await page.locator('[data-testid="input-create-email"]').fill(newUserEmail);
    await page.locator('[data-testid="select-create-role"]').selectOption('REQUESTER');
    await page.locator('[data-testid="input-create-password"]').fill('InitialSecurePass123!');

    await page.locator('[data-testid="btn-submit-create"]').click();

    // Verify duplicate email conflict error alert
    const errorAlert = page.locator('[data-testid="create-error-alert"]');
    await expect(errorAlert).toBeVisible({ timeout: 10000 });
    await expect(errorAlert).toContainText(/already registered|conflict|exists/i);

    // Cancel modal
    await page.locator('[data-testid="btn-cancel-create"]').click();
    await expect(createModal).toBeHidden();
  });

  // ---------------------------------------------------------------------------
  // USER-E2E-04: Edit User & Deactivation / Login Invalidation
  // ---------------------------------------------------------------------------
  test('USER-E2E-04: Edit user name/role and deactivate account to prevent login', async ({ page }) => {
    await page.locator('[data-testid="login-email-input"]').fill('admin.toktick@kmutt.ac.th');
    await page.locator('[data-testid="login-password-input"]').fill('Password123!');
    await page.locator('[data-testid="login-submit-button"]').click();

    await expect(page.locator('[data-testid="user-management-view"]')).toBeVisible({ timeout: 10000 });

    // Target seeded user ekachai.it@kmutt.ac.th
    const userRow = page.locator('tr').filter({ hasText: 'ekachai.it@kmutt.ac.th' });
    await expect(userRow).toBeVisible({ timeout: 10000 });

    // Click edit button for this user
    await userRow.locator('button:has-text("Edit")').click();

    const editModal = page.locator('[data-testid="form-edit-user"]');
    await expect(editModal).toBeVisible({ timeout: 5000 });

    // Deactivate account
    const activeToggle = page.locator('[data-testid="toggle-edit-active"]');
    if (!(await activeToggle.isChecked())) {
      await activeToggle.check();
      await page.locator('[data-testid="btn-submit-edit"]').click();
      await expect(editModal).toBeHidden({ timeout: 10000 });
      await userRow.locator('button:has-text("Edit")').click();
      await expect(editModal).toBeVisible({ timeout: 5000 });
    }
    await expect(activeToggle).toBeChecked();
    await activeToggle.uncheck();

    // Submit changes
    await page.locator('[data-testid="btn-submit-edit"]').click();
    await expect(editModal).toBeHidden({ timeout: 10000 });

    // Verify status badge updated to Inactive in table
    await expect(userRow.locator('[data-testid^="status-badge-"]')).toHaveText('Inactive', { timeout: 10000 });

    // Logout admin
    await page.locator('[data-testid="logout-button"]').click();
    await expect(page.locator('[data-testid="login-email-input"]')).toBeVisible({ timeout: 10000 });

    // Attempt login with deactivated user
    await page.locator('[data-testid="login-email-input"]').fill('ekachai.it@kmutt.ac.th');
    await page.locator('[data-testid="login-password-input"]').fill('Password123!');
    await page.locator('[data-testid="login-submit-button"]').click();

    // Verify safe generic rejection
    const loginError = page.locator('[data-testid="login-error-alert"]');
    await expect(loginError).toBeVisible({ timeout: 10000 });
    await expect(loginError).toContainText(/Invalid email or password/i);

    // Restore ekachai.it@kmutt.ac.th to active status for test idempotency
    try {
      await page.request.post('http://localhost:3000/api/v1/auth/login', {
        data: { email: 'admin.toktick@kmutt.ac.th', password: 'Password123!' },
      });
      const usersRes = await page.request.get('http://localhost:3000/api/v1/admin/users?search=ekachai');
      const usersData = await usersRes.json();
      const ekachai = usersData?.data?.users?.find((u: any) => u.email === 'ekachai.it@kmutt.ac.th');
      if (ekachai) {
        await page.request.put(`http://localhost:3000/api/v1/admin/users/${ekachai.id}`, {
          data: { name: ekachai.name, department: ekachai.department, role: ekachai.role, isActive: true },
        });
      }
    } catch {
      // Best-effort cleanup
    }
  });

  // ---------------------------------------------------------------------------
  // USER-E2E-05: Safety Invariants: Self-Deactivation (BR-11) & Last Admin (BR-12)
  // ---------------------------------------------------------------------------
  test('USER-E2E-05: Enforces self-deactivation guard (BR-11) and last active admin guard (BR-12)', async ({ page }) => {
    await page.locator('[data-testid="login-email-input"]').fill('admin.toktick@kmutt.ac.th');
    await page.locator('[data-testid="login-password-input"]').fill('Password123!');
    await page.locator('[data-testid="login-submit-button"]').click();

    await expect(page.locator('[data-testid="user-management-view"]')).toBeVisible({ timeout: 10000 });

    // 1. Check self-edit protection on Admin TokTick
    const selfRow = page.locator('tr').filter({ hasText: 'admin.toktick@kmutt.ac.th' });
    await expect(selfRow.locator('[data-testid="badge-you"]')).toBeVisible({ timeout: 10000 });

    await selfRow.locator('button:has-text("Edit")').click();
    const editModal = page.locator('[data-testid="form-edit-user"]');
    await expect(editModal).toBeVisible({ timeout: 5000 });

    // Verify warning banner and disabled controls
    await expect(page.locator('[data-testid="self-edit-warning"]')).toBeVisible();
    await expect(page.locator('[data-testid="select-edit-role"]')).toBeDisabled();
    await expect(page.locator('[data-testid="toggle-edit-active"]')).toBeDisabled();

    // Close modal
    await page.locator('[data-testid="btn-cancel-edit"]').click();
    await expect(editModal).toBeHidden();

    // 2. Deactivate backup admin to leave only 1 active admin
    const backupAdminRow = page.locator('tr').filter({ hasText: 'backup.admin@kmutt.ac.th' });
    await backupAdminRow.locator('button:has-text("Edit")').click();
    await expect(editModal).toBeVisible({ timeout: 5000 });

    await page.locator('[data-testid="toggle-edit-active"]').uncheck();
    await page.locator('[data-testid="btn-submit-edit"]').click();
    await expect(editModal).toBeHidden({ timeout: 10000 });
    await expect(backupAdminRow.locator('[data-testid^="status-badge-"]')).toHaveText('Inactive');

    // 3. Now only 1 active admin remains. Verify last active admin protection
    await selfRow.locator('button:has-text("Edit")').click();
    await expect(editModal).toBeVisible({ timeout: 5000 });
    await expect(page.locator('[data-testid="select-edit-role"]')).toBeDisabled();
    await expect(page.locator('[data-testid="toggle-edit-active"]')).toBeDisabled();
    await page.locator('[data-testid="btn-cancel-edit"]').click();
  });

  // ---------------------------------------------------------------------------
  // USER-E2E-06: Administrator Resets Initial Password & Forced Change on Next Login
  // ---------------------------------------------------------------------------
  test('USER-E2E-06: Administrator resets initial password, forcing password change on next login', async ({ page }) => {
    await page.locator('[data-testid="login-email-input"]').fill('admin.toktick@kmutt.ac.th');
    await page.locator('[data-testid="login-password-input"]').fill('Password123!');
    await page.locator('[data-testid="login-submit-button"]').click();

    await expect(page.locator('[data-testid="user-management-view"]')).toBeVisible({ timeout: 10000 });

    // Target user nareerat.it@kmutt.ac.th
    const userRow = page.locator('tr').filter({ hasText: 'nareerat.it@kmutt.ac.th' });
    await expect(userRow).toBeVisible({ timeout: 10000 });

    // Open Reset Password Modal
    await userRow.locator('button:has-text("Reset Pwd")').click();
    const resetModal = page.locator('[data-testid="form-reset-password"]');
    await expect(resetModal).toBeVisible({ timeout: 5000 });

    // Fill temporary password meeting complexity requirements
    const tempPassword = 'TemporaryResetPass123!';
    await page.locator('[data-testid="input-reset-password"]').fill(tempPassword);
    await page.locator('[data-testid="btn-submit-reset"]').click();

    // Wait for success alert or modal closure
    await expect(resetModal).toBeHidden({ timeout: 10000 });

    // Logout Admin
    await page.locator('[data-testid="logout-button"]').click();
    await expect(page.locator('[data-testid="login-email-input"]')).toBeVisible({ timeout: 10000 });

    // Login with reset temporary password
    await page.locator('[data-testid="login-email-input"]').fill('nareerat.it@kmutt.ac.th');
    await page.locator('[data-testid="login-password-input"]').fill(tempPassword);
    await page.locator('[data-testid="login-submit-button"]').click();

    // Verify user is forced into Change Password view
    await expect(page.locator('text=/Change Your Initial Password/i')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="new-password-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="change-password-submit-button"]')).toBeVisible();
  });
});
