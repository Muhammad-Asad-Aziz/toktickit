import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';

const VIDEOS_DIR = path.join(process.cwd(), 'artifacts', 'lab-03', 'videos');

test('Record Part 5: Authentication & Password Lifecycle Demo', async ({ browser }) => {
  // Ensure output video directory exists
  if (!fs.existsSync(VIDEOS_DIR)) {
    fs.mkdirSync(VIDEOS_DIR, { recursive: true });
  }

  // Ensure new.requester@kmutt.ac.th has mustChangePassword = true and InitialPass123!
  try {
    const adminLoginRes = await fetch('http://localhost:3000/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin.toktick@kmutt.ac.th', password: 'Password123!' }),
    });
    const setCookie = adminLoginRes.headers.get('set-cookie') || '';
    const usersRes = await fetch('http://localhost:3000/api/v1/admin/users?search=new.requester', {
      headers: { cookie: setCookie },
    });
    const usersData = await usersRes.json();
    const user = usersData.users?.find((u: any) => u.email === 'new.requester@kmutt.ac.th');
    if (user) {
      await fetch(`http://localhost:3000/api/v1/admin/users/${user.id}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          cookie: setCookie,
        },
        body: JSON.stringify({ initialPassword: 'InitialPass123!' }),
      });
    }
  } catch (err) {
    console.error('Idempotency reset error:', err);
  }

  // Create isolated browser context with video recording enabled
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    recordVideo: {
      dir: VIDEOS_DIR,
      size: { width: 1280, height: 800 },
    },
  });

  const page = await context.newPage();

  // -------------------------------------------------------------------------
  // 1. Initial Load
  // -------------------------------------------------------------------------
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.locator('[data-testid="login-email-input"]')).toBeVisible({ timeout: 10000 });
  await page.waitForTimeout(1000);

  // -------------------------------------------------------------------------
  // 2. Demonstrate Invalid Credentials & Safe Generic Failure Feedback
  // -------------------------------------------------------------------------
  await page.locator('[data-testid="login-email-input"]').fill('sompong.it@kmutt.ac.th');
  await page.waitForTimeout(400);
  await page.locator('[data-testid="login-password-input"]').fill('WrongPassword999!');
  await page.waitForTimeout(500);
  await page.locator('[data-testid="login-submit-button"]').click();

  const errorAlert = page.locator('[data-testid="login-error-alert"]');
  await expect(errorAlert).toBeVisible({ timeout: 10000 });
  await expect(errorAlert).toContainText(/Invalid email or password/i);
  await page.waitForTimeout(2000); // Hold for viewer comprehension

  // -------------------------------------------------------------------------
  // 3. Demonstrate Inactive Account Rejection (Safe Non-Enumeration)
  // -------------------------------------------------------------------------
  await page.locator('[data-testid="login-email-input"]').fill('prasert.in@kmutt.ac.th');
  await page.waitForTimeout(400);
  await page.locator('[data-testid="login-password-input"]').fill('Password123!');
  await page.waitForTimeout(500);
  await page.locator('[data-testid="login-submit-button"]').click();

  await expect(errorAlert).toBeVisible({ timeout: 10000 });
  await expect(errorAlert).toContainText(/Invalid email or password/i);
  await page.waitForTimeout(2000); // Hold for viewer comprehension

  // -------------------------------------------------------------------------
  // 4. Demonstrate Mandatory Initial Password Change & Live Checklist
  // -------------------------------------------------------------------------
  await page.locator('[data-testid="login-email-input"]').fill('new.requester@kmutt.ac.th');
  await page.waitForTimeout(400);
  await page.locator('[data-testid="login-password-input"]').fill('InitialPass123!');
  await page.waitForTimeout(500);
  await page.locator('[data-testid="login-submit-button"]').click();

  // Intercepted into Change Password screen
  await expect(page.locator('text=/Change Your Initial Password/i')).toBeVisible({ timeout: 10000 });
  await page.waitForTimeout(600);

  // Smooth scroll down once at this page so the complete card and submit button are in view
  await page.evaluate(() => {
    window.scrollTo({ top: 160, behavior: 'smooth' });
  });
  await page.waitForTimeout(1400);

  // Fill Current Password
  await page.locator('[data-testid="current-password-input"]').fill('InitialPass123!');
  await page.waitForTimeout(600);

  // Type partial weak password to demonstrate live rules unmet
  await page.locator('[data-testid="new-password-input"]').fill('Pass1');
  await page.waitForTimeout(1200);

  // Complete strong password to demonstrate all rules met
  await page.locator('[data-testid="new-password-input"]').fill('ValidPass1!');
  await page.waitForTimeout(1200);

  // Type mismatched confirmation
  await page.locator('[data-testid="confirm-password-input"]').fill('Mismatch123!');
  await page.waitForTimeout(800);

  // Fix confirmation match
  await page.locator('[data-testid="confirm-password-input"]').fill('ValidPass1!');
  await page.waitForTimeout(800);

  // Submit and enter application
  await page.locator('[data-testid="change-password-submit-button"]').click();
  await page.waitForTimeout(1000);

  // Smooth scroll back up to the top to showcase the header, authenticated user display, and navigation
  await page.evaluate(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  await page.waitForTimeout(1200);

  // -------------------------------------------------------------------------
  // 5. Demonstrate Authenticated User / Role Display in Header
  // -------------------------------------------------------------------------
  await expect(page.locator('[data-testid="user-name-display"]')).toHaveText('New Requester', { timeout: 10000 });
  await expect(page.locator('[data-testid="user-role-badge"]')).toHaveText('Requester', { timeout: 10000 });
  await page.waitForTimeout(2500); // Hold view to display role and dashboard

  // -------------------------------------------------------------------------
  // 6. Demonstrate Logout & Session Invalidation
  // -------------------------------------------------------------------------
  const logoutBtn = page.locator('[data-testid="logout-button"]');
  await expect(logoutBtn).toBeVisible();
  await logoutBtn.click();
  await expect(page.locator('[data-testid="login-email-input"]')).toBeVisible({ timeout: 10000 });
  await page.waitForTimeout(1500);

  // -------------------------------------------------------------------------
  // 7. Demonstrate Direct Access Blocked After Logout
  // -------------------------------------------------------------------------
  await page.goto('/');
  await expect(page.locator('[data-testid="login-email-input"]')).toBeVisible({ timeout: 10000 });
  await expect(page.locator('[data-testid="user-name-display"]')).toHaveCount(0);
  await page.waitForTimeout(2000); // Final view

  // Close page and context to finalize video writing
  const video = page.video();
  await page.close();
  await context.close();

  // Rename video to meaningful artifact name
  if (video) {
    const videoPath = await video.path();
    const targetPath = path.join(VIDEOS_DIR, 'part-5-authentication-lifecycle.webm');
    const mp4Path = path.join(VIDEOS_DIR, 'part-5-authentication-lifecycle.mp4');
    if (fs.existsSync(targetPath)) {
      fs.unlinkSync(targetPath);
    }
    fs.renameSync(videoPath, targetPath);
    console.log(`Video recording saved: ${targetPath}`);

    // Transcode to MP4 (H.264/yuv420p) for Adobe Acrobat PDF embedding compatibility
    try {
      execSync(`ffmpeg -y -i "${targetPath}" -c:v libx264 -pix_fmt yuv420p -movflags +faststart "${mp4Path}"`, {
        stdio: 'ignore',
      });
      console.log(`MP4 recording generated: ${mp4Path}`);
    } catch {
      // ffmpeg optional fallback
    }
  }
});
