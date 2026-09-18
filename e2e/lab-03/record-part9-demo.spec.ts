import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';

const VIDEOS_DIR = path.join(process.cwd(), 'artifacts', 'lab-03', 'videos');
const BRAIN_ARTIFACTS_DIR = 'C:\\Users\\Muhammad Asad Aziz\\.gemini\\antigravity-ide\\brain\\11ee51fb-3981-4703-9ac8-878f2a45b713';

// Helper to scroll all the way down, pause, and scroll all the way up
async function scrollDownAndUp(page: any) {
  await page.waitForTimeout(600);
  await page.evaluate(() => {
    const maxScroll = Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight,
      document.body.offsetHeight,
      document.documentElement.offsetHeight
    );
    window.scrollTo({ top: maxScroll, behavior: 'smooth' });
  });
  await page.waitForTimeout(1500);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  await page.waitForTimeout(1000);
}

// Helper to cycle through Desktop -> Tablet -> Mobile -> back to Desktop
async function cycleDeviceViewports(page: any) {
  // Device 1: Desktop (1280x800)
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.waitForTimeout(500);
  await scrollDownAndUp(page);

  // Device 2: Tablet (768x800)
  await page.setViewportSize({ width: 768, height: 800 });
  await page.waitForTimeout(500);
  await scrollDownAndUp(page);

  // Device 3: Mobile (375x800)
  await page.setViewportSize({ width: 375, height: 800 });
  await page.waitForTimeout(500);
  await scrollDownAndUp(page);

  // Switch back to Desktop (1280x800)
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.waitForTimeout(800);
}

test('Record Part 9: Multi-Device Responsive Demonstration (Desktop, Tablet, Mobile)', async ({ browser }) => {
  test.setTimeout(240000);

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

  // =========================================================================
  // Screen 1: Login Page
  // =========================================================================
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.locator('[data-testid="login-email-input"]')).toBeVisible({ timeout: 10000 });

  // Cycle viewports on Login Page
  await cycleDeviceViewports(page);

  // =========================================================================
  // Screen 2: Change Password Page
  // =========================================================================
  await page.locator('[data-testid="login-email-input"]').fill('new.requester@kmutt.ac.th');
  await page.waitForTimeout(250);
  await page.locator('[data-testid="login-password-input"]').fill('InitialPass123!');
  await page.waitForTimeout(250);
  await page.locator('[data-testid="login-submit-button"]').click();

  await expect(page.locator('text=/Change Your Initial Password/i')).toBeVisible({ timeout: 10000 });
  await expect(page.locator('[data-testid="new-password-input"]')).toBeVisible({ timeout: 10000 });

  // Cycle viewports on Change Password Page
  await cycleDeviceViewports(page);

  // =========================================================================
  // Screen 3: Ticket Queue Page (IT Staff View)
  // =========================================================================
  await context.clearCookies();
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await expect(page.locator('[data-testid="login-email-input"]')).toBeVisible({ timeout: 10000 });
  await page.locator('[data-testid="login-email-input"]').fill('wichai.it@kmutt.ac.th');
  await page.waitForTimeout(250);
  await page.locator('[data-testid="login-password-input"]').fill('Password123!');
  await page.waitForTimeout(250);
  await page.locator('[data-testid="login-submit-button"]').click();

  await expect(page.locator('[data-testid="staff-ticket-queue-view"]')).toBeVisible({ timeout: 10000 });
  await expect(page.locator('[data-testid^="queue-row-"]').first()).toBeVisible({ timeout: 10000 });

  // Cycle viewports on Ticket Queue Page
  await cycleDeviceViewports(page);

  // =========================================================================
  // Screen 4: Ticket Detail Page (IT Staff View)
  // =========================================================================
  await page.locator('[data-testid="queue-search-input"]').fill('TKT-2026-00002');
  await page.waitForTimeout(600);
  const queueRow = page.locator('[data-testid^="queue-row-"]').first();
  await queueRow.click();
  await expect(page.locator('[data-testid="staff-ticket-detail-view"]')).toBeVisible({ timeout: 10000 });

  // Cycle viewports on Ticket Detail Page
  await cycleDeviceViewports(page);

  // =========================================================================
  // Screen 5: User Management Page (Administrator View)
  // =========================================================================
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
  await expect(page.locator('[data-testid="users-table"]')).toBeVisible({ timeout: 10000 });

  // Cycle viewports on User Management Page
  await cycleDeviceViewports(page);

  // -------------------------------------------------------------------------
  // Finalize Video Recording & Transcode to MP4
  // -------------------------------------------------------------------------
  const video = page.video();
  await page.close();
  await context.close();

  if (video) {
    const videoPath = await video.path();
    const targetWebmPath = path.join(VIDEOS_DIR, 'part-9-responsive-showcase.webm');
    const targetMp4Path = path.join(VIDEOS_DIR, 'part-9-responsive-showcase.mp4');

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
        const brainMp4 = path.join(BRAIN_ARTIFACTS_DIR, 'part-9-responsive-showcase.mp4');
        fs.copyFileSync(targetMp4Path, brainMp4);
        const brainWebm = path.join(BRAIN_ARTIFACTS_DIR, 'part-9-responsive-showcase.webm');
        fs.copyFileSync(targetWebmPath, brainWebm);
        console.log(`Copied to brain artifacts: ${brainMp4}`);
      }
    } catch (err) {
      console.error('FFmpeg transcoding failed:', err);
    }
  }
});
