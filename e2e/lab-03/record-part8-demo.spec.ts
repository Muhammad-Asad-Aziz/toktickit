import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';

const VIDEOS_DIR = path.join(process.cwd(), 'artifacts', 'lab-03', 'videos');
const BRAIN_ARTIFACTS_DIR = 'C:\\Users\\Muhammad Asad Aziz\\.gemini\\antigravity-ide\\brain\\11ee51fb-3981-4703-9ac8-878f2a45b713';

test('Record Part 8: Administrator User Management & Security Lifecycle Demo', async ({ browser }) => {
  test.setTimeout(180000);

  if (!fs.existsSync(VIDEOS_DIR)) {
    fs.mkdirSync(VIDEOS_DIR, { recursive: true });
  }

  const context = await browser.newContext({
    recordVideo: {
      dir: VIDEOS_DIR,
      size: { width: 1280, height: 800 },
    },
  });

  const page = await context.newPage();

  // -------------------------------------------------------------------------
  // 1. Initial State & Administrator Login
  // -------------------------------------------------------------------------
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await expect(page.locator('[data-testid="login-email-input"]')).toBeVisible({ timeout: 10000 });
  await page.locator('[data-testid="login-email-input"]').fill('admin.toktick@kmutt.ac.th');
  await page.waitForTimeout(300);
  await page.locator('[data-testid="login-password-input"]').fill('Password123!');
  await page.waitForTimeout(300);
  await page.locator('[data-testid="login-submit-button"]').click();

  // -------------------------------------------------------------------------
  // 2. User Directory Desktop View & Smooth Scroll
  // -------------------------------------------------------------------------
  await expect(page.locator('[data-testid="user-management-view"]')).toBeVisible({ timeout: 10000 });
  await expect(page.locator('[data-testid="users-table"]')).toBeVisible({ timeout: 10000 });
  await page.waitForTimeout(1000);

  // Smooth scroll down the user list to show Name, Email, Role, Status, and Actions
  await page.evaluate(() => window.scrollTo({ top: 380, behavior: 'smooth' }));
  await page.waitForTimeout(2000);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  await page.waitForTimeout(1000);

  // -------------------------------------------------------------------------
  // 3. Search and Optional Role Filtering
  // -------------------------------------------------------------------------
  await page.locator('[data-testid="input-search-users"]').fill('wichai');
  await page.waitForTimeout(400);
  await page.locator('[data-testid="select-role-filter"]').selectOption('IT_STAFF');
  await page.waitForTimeout(400);
  await page.locator('button:has-text("Search")').click();
  await page.waitForTimeout(1500);

  // Verify filtered result and reset filter
  await expect(page.locator('[data-testid="users-table"]')).toContainText('Wichai IT');
  const resetBtn = page.locator('[data-testid="btn-reset-filters"]');
  await expect(resetBtn).toBeVisible();
  await page.waitForTimeout(1000);
  await resetBtn.click();
  await page.waitForTimeout(1200);

  // -------------------------------------------------------------------------
  // 4. Create User with Permitted Role & Initial Password Checklist
  // -------------------------------------------------------------------------
  await page.locator('[data-testid="btn-create-user"]').click();
  const createModal = page.locator('[data-testid="form-create-user"]');
  await expect(createModal).toBeVisible({ timeout: 5000 });
  await page.waitForTimeout(500);

  await page.locator('[data-testid="input-create-name"]').fill('Chaiwat Technician');
  await page.waitForTimeout(300);
  await page.locator('[data-testid="input-create-email"]').fill('chaiwat.tech@kmutt.ac.th');
  await page.waitForTimeout(300);
  await page.locator('[data-testid="select-create-role"]').selectOption('IT_STAFF');
  await page.waitForTimeout(300);

  // Demonstrate live password complexity feedback
  await page.locator('[data-testid="input-create-password"]').fill('Pass1!');
  await page.waitForTimeout(1500);
  await page.locator('[data-testid="input-create-password"]').fill('ValidInitialPass123!');
  await page.waitForTimeout(1500);

  await page.locator('[data-testid="btn-submit-create"]').click();
  await expect(createModal).toBeHidden({ timeout: 10000 });
  await page.waitForTimeout(1200);

  // -------------------------------------------------------------------------
  // 5. Duplicate-Email Conflict & Invalid-Input Validation
  // -------------------------------------------------------------------------
  await page.locator('[data-testid="btn-create-user"]').click();
  await expect(createModal).toBeVisible({ timeout: 5000 });
  await page.waitForTimeout(400);

  await page.locator('[data-testid="input-create-name"]').fill('Duplicate Attempt');
  await page.waitForTimeout(200);
  await page.locator('[data-testid="input-create-email"]').fill('chaiwat.tech@kmutt.ac.th');
  await page.waitForTimeout(200);
  await page.locator('[data-testid="select-create-role"]').selectOption('REQUESTER');
  await page.waitForTimeout(200);
  await page.locator('[data-testid="input-create-password"]').fill('ValidInitialPass123!');
  await page.waitForTimeout(400);

  await page.locator('[data-testid="btn-submit-create"]').click();
  await expect(page.locator('[data-testid="create-error-alert"]')).toBeVisible({ timeout: 10000 });
  await page.waitForTimeout(2000); // Highlight duplicate email 409 conflict alert
  await page.locator('[data-testid="btn-cancel-create"]').click();
  await expect(createModal).toBeHidden();
  await page.waitForTimeout(600);

  // -------------------------------------------------------------------------
  // 6. Edit Name, Email, Role, and Activation State (Deactivate User)
  // -------------------------------------------------------------------------
  const targetUserRow = page.locator('tr').filter({ hasText: 'ekachai.it@kmutt.ac.th' });
  await targetUserRow.locator('button:has-text("Edit")').click();
  const editModal = page.locator('[data-testid="form-edit-user"]');
  await expect(editModal).toBeVisible({ timeout: 5000 });
  await page.waitForTimeout(800);

  await page.locator('[data-testid="toggle-edit-active"]').uncheck();
  await page.waitForTimeout(800);
  await page.locator('[data-testid="btn-submit-edit"]').click();
  await expect(editModal).toBeHidden({ timeout: 10000 });
  await expect(targetUserRow.locator('[data-testid^="status-badge-"]')).toHaveText('Inactive');
  await page.waitForTimeout(1500);

  // -------------------------------------------------------------------------
  // 7. Set a New Initial Password
  // -------------------------------------------------------------------------
  const resetUserRow = page.locator('tr').filter({ hasText: 'nareerat.it@kmutt.ac.th' });
  await resetUserRow.locator('button:has-text("Reset Pwd")').click();
  const resetModal = page.locator('[data-testid="form-reset-password"]');
  await expect(resetModal).toBeVisible({ timeout: 5000 });
  await page.waitForTimeout(800);

  await page.locator('[data-testid="input-reset-password"]').fill('TemporaryResetPass123!');
  await page.waitForTimeout(1500); // Showcase satisfied criteria checklist and reset notice
  await page.locator('[data-testid="btn-submit-reset"]').click();
  await expect(resetModal).toBeHidden({ timeout: 10000 });
  await page.waitForTimeout(1000);

  // -------------------------------------------------------------------------
  // 8. Demonstrate Required Password Change at Next Login
  // -------------------------------------------------------------------------
  await page.locator('[data-testid="logout-button"]').click();
  await expect(page.locator('[data-testid="login-email-input"]')).toBeVisible({ timeout: 10000 });
  await page.waitForTimeout(600);

  await page.locator('[data-testid="login-email-input"]').fill('nareerat.it@kmutt.ac.th');
  await page.waitForTimeout(250);
  await page.locator('[data-testid="login-password-input"]').fill('TemporaryResetPass123!');
  await page.waitForTimeout(250);
  await page.locator('[data-testid="login-submit-button"]').click();

  // Redirected to Change Initial Password
  await expect(page.locator('text=/Change Your Initial Password/i')).toBeVisible({ timeout: 10000 });
  await expect(page.locator('[data-testid="new-password-input"]')).toBeVisible();
  await page.waitForTimeout(800);

  // Smooth scroll down to show the full checklist and submit action
  await page.evaluate(() => window.scrollTo({ top: 260, behavior: 'smooth' }));
  await page.waitForTimeout(2000);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  await page.waitForTimeout(800);

  // -------------------------------------------------------------------------
  // 9. Prevention of Self-Deactivation (BR-11)
  // -------------------------------------------------------------------------
  await context.clearCookies();
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await expect(page.locator('[data-testid="login-email-input"]')).toBeVisible({ timeout: 10000 });
  await page.locator('[data-testid="login-email-input"]').fill('admin.toktick@kmutt.ac.th');
  await page.waitForTimeout(250);
  await page.locator('[data-testid="login-password-input"]').fill('Password123!');
  await page.waitForTimeout(250);
  await page.locator('[data-testid="login-submit-button"]').click();
  await expect(page.locator('[data-testid="user-management-view"]')).toBeVisible({ timeout: 10000 });

  const selfRow = page.locator('tr').filter({ hasText: 'admin.toktick@kmutt.ac.th' });
  await selfRow.locator('button:has-text("Edit")').click();
  await expect(editModal).toBeVisible({ timeout: 5000 });
  await expect(page.locator('[data-testid="self-edit-warning"]')).toBeVisible({ timeout: 5000 });
  await expect(page.locator('[data-testid="select-edit-role"]')).toBeDisabled();
  await expect(page.locator('[data-testid="toggle-edit-active"]')).toBeDisabled();
  await page.waitForTimeout(2500); // Showcase BR-11 protection banner
  await page.locator('[data-testid="btn-cancel-edit"]').click();
  await expect(editModal).toBeHidden();
  await page.waitForTimeout(600);

  // -------------------------------------------------------------------------
  // 10. Prevention of Removing the Last Active Administrator (BR-12)
  // -------------------------------------------------------------------------
  const backupAdminRow = page.locator('tr').filter({ hasText: 'backup.admin@kmutt.ac.th' });
  await backupAdminRow.locator('button:has-text("Edit")').click();
  await expect(editModal).toBeVisible({ timeout: 5000 });
  await page.waitForTimeout(500);
  await page.locator('[data-testid="toggle-edit-active"]').uncheck();
  await page.waitForTimeout(500);
  await page.locator('[data-testid="btn-submit-edit"]').click();
  await expect(editModal).toBeHidden({ timeout: 10000 });
  await expect(backupAdminRow.locator('[data-testid^="status-badge-"]')).toHaveText('Inactive');
  await page.waitForTimeout(800);

  // With backup.admin inactive, open edit to verify BR-12 last admin guard
  await backupAdminRow.locator('button:has-text("Edit")').click();
  await expect(editModal).toBeVisible({ timeout: 5000 });
  await expect(page.locator('[data-testid="last-admin-warning"]')).toBeVisible({ timeout: 5000 });
  await expect(page.locator('[data-testid="select-edit-role"]')).toBeDisabled();
  await expect(page.locator('[data-testid="toggle-edit-active"]')).toBeDisabled();
  await page.waitForTimeout(2500); // Showcase BR-12 last-admin warning banner
  await page.locator('[data-testid="btn-cancel-edit"]').click();
  await expect(editModal).toBeHidden();
  await page.waitForTimeout(600);

  // -------------------------------------------------------------------------
  // 11. Forbidden Access for Non-Administrators (HTTP 403 Forbidden)
  // -------------------------------------------------------------------------
  await page.locator('[data-testid="logout-button"]').click();
  await expect(page.locator('[data-testid="login-email-input"]')).toBeVisible({ timeout: 10000 });

  await page.locator('[data-testid="login-email-input"]').fill('anong.sta@kmutt.ac.th');
  await page.waitForTimeout(250);
  await page.locator('[data-testid="login-password-input"]').fill('Password123!');
  await page.waitForTimeout(250);
  await page.locator('[data-testid="login-submit-button"]').click();
  await expect(page.locator('[data-testid="user-name-display"]')).toBeVisible({ timeout: 10000 });

  // Direct access to admin endpoint returning HTTP 403 Forbidden JSON
  await page.goto('http://localhost:3000/api/v1/admin/users');
  await expect(page.locator('body')).toContainText('FORBIDDEN');
  await page.waitForTimeout(2500);

  // -------------------------------------------------------------------------
  // 12. Safe Failure Feedback & Responsive Mobile Zen Green Presentation
  // -------------------------------------------------------------------------
  await context.clearCookies();
  await page.goto('http://localhost:5173/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await expect(page.locator('[data-testid="login-email-input"]')).toBeVisible({ timeout: 10000 });
  await page.locator('[data-testid="login-email-input"]').fill('admin.toktick@kmutt.ac.th');
  await page.waitForTimeout(250);
  await page.locator('[data-testid="login-password-input"]').fill('Password123!');
  await page.waitForTimeout(250);
  await page.locator('[data-testid="login-submit-button"]').click();
  await expect(page.locator('[data-testid="user-management-view"]')).toBeVisible({ timeout: 10000 });

  // Intercept update user with simulated 500 error for safe failure demonstration
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
  await page.waitForTimeout(600);
  await page.locator('[data-testid="btn-submit-edit"]').click();
  await expect(page.locator('[data-testid="edit-error-alert"]')).toBeVisible({ timeout: 10000 });
  await page.waitForTimeout(2500); // Showcase safe failure feedback banner

  await page.unroute('**/api/v1/admin/users/*');
  await page.locator('[data-testid="btn-cancel-edit"]').click();
  await expect(editModal).toBeHidden();
  await page.waitForTimeout(600);

  // Responsive Mobile Presentation (375x812) with Scroll
  await page.setViewportSize({ width: 375, height: 812 });
  await expect(page.locator('[data-testid="mobile-users-list"]')).toBeVisible({ timeout: 10000 });
  await page.waitForTimeout(1000);

  // Smooth scroll through stacked mobile user cards
  await page.evaluate(() => window.scrollTo({ top: 350, behavior: 'smooth' }));
  await page.waitForTimeout(2000);
  await page.evaluate(() => window.scrollTo({ top: 700, behavior: 'smooth' }));
  await page.waitForTimeout(2000);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  await page.waitForTimeout(1500);

  // -------------------------------------------------------------------------
  // Finalize Video Recording & Transcode to MP4
  // -------------------------------------------------------------------------
  const video = page.video();
  await page.close();
  await context.close();

  if (video) {
    const videoPath = await video.path();
    const targetWebmPath = path.join(VIDEOS_DIR, 'part-8-user-management.webm');
    const targetMp4Path = path.join(VIDEOS_DIR, 'part-8-user-management.mp4');

    if (fs.existsSync(targetWebmPath)) {
      fs.unlinkSync(targetWebmPath);
    }
    fs.renameSync(videoPath, targetWebmPath);
    console.log(`Video recording saved: ${targetWebmPath}`);

    // Transcode to MP4 (H.264/yuv420p) for Adobe Acrobat PDF embedding compatibility
    try {
      execSync(`ffmpeg -y -i "${targetWebmPath}" -c:v libx264 -pix_fmt yuv420p -movflags +faststart "${targetMp4Path}"`, {
        stdio: 'ignore',
      });
      console.log(`MP4 recording generated: ${targetMp4Path}`);

      // Copy to Brain Artifacts directory
      if (fs.existsSync(BRAIN_ARTIFACTS_DIR)) {
        const brainMp4 = path.join(BRAIN_ARTIFACTS_DIR, 'part-8-user-management.mp4');
        fs.copyFileSync(targetMp4Path, brainMp4);
        console.log(`Copied to brain artifacts: ${brainMp4}`);
      }
    } catch (err) {
      console.error('FFmpeg transcoding failed:', err);
    }
  }
});
