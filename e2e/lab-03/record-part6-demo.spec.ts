import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';

const VIDEOS_DIR = path.join(process.cwd(), 'artifacts', 'lab-03', 'videos');

test('Record Part 6: IT Staff Ticket Queue & Controls Demo', async ({ browser }) => {
  // Ensure output video directory exists
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
  // 1. Initial Login & Realistic Queue Display (Deskop 1280x800)
  // -------------------------------------------------------------------------
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await page.locator('[data-testid="login-email-input"]').fill('wichai.it@kmutt.ac.th');
  await page.waitForTimeout(300);
  await page.locator('[data-testid="login-password-input"]').fill('Password123!');
  await page.waitForTimeout(400);
  await page.locator('[data-testid="login-submit-button"]').click();

  await expect(page.locator('[data-testid="staff-ticket-queue-view"]')).toBeVisible({ timeout: 10000 });
  await expect(page.locator('[data-testid="queue-skeleton"]')).toBeHidden({ timeout: 10000 });
  await page.waitForTimeout(2500); // Hold view to display realistic queue data, status/priority badges, and ownership

  // -------------------------------------------------------------------------
  // 2. Search & Multi-Field Filtering
  // -------------------------------------------------------------------------
  // Keyword search
  await page.locator('[data-testid="queue-search-input"]').fill('Printer');
  await page.waitForTimeout(1200);

  // Status dropdown filter
  await page.locator('[data-testid="filter-status"]').selectOption('NEW');
  await page.waitForTimeout(1200);

  // Clear filters
  await page.locator('[data-testid="reset-filters-button"]').click();
  await page.waitForTimeout(1000);

  // -------------------------------------------------------------------------
  // 3. Assigned / Unassigned Ownership Demonstration
  // -------------------------------------------------------------------------
  await page.locator('[data-testid="filter-owner"]').selectOption('unassigned');
  await page.waitForTimeout(1500); // Hold to display unassigned tickets

  await page.locator('[data-testid="reset-filters-button"]').click();
  await page.waitForTimeout(1000);

  // -------------------------------------------------------------------------
  // 4. Column Sorting (IT Priority & Creation Date)
  // -------------------------------------------------------------------------
  // Sort by IT Priority
  await page.locator('[data-testid="th-sort-priority"]').click();
  await page.waitForTimeout(1500); // Display Urgent-to-Low order and sort indicator

  // Sort by Created Date
  await page.locator('[data-testid="th-sort-created-at"]').click();
  await page.waitForTimeout(1500); // Display ascending date order and sort indicator

  // -------------------------------------------------------------------------
  // 5. Pagination Controls & Total Records Display
  // -------------------------------------------------------------------------
  await page.evaluate(() => window.scrollTo({ top: 400, behavior: 'smooth' }));
  await page.waitForTimeout(800);

  await page.locator('[data-testid="page-size-select"]').selectOption('25');
  await page.waitForTimeout(1500);

  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  await page.waitForTimeout(800);

  // -------------------------------------------------------------------------
  // 6. Empty / No-Results Feedback
  // -------------------------------------------------------------------------
  await page.locator('[data-testid="queue-search-input"]').fill('NonExistentTicketQuery9999');
  await page.waitForTimeout(1500); // Hold view to display empty banner & Clear Filters button

  await page.locator('[data-testid="reset-filters-button"]').click();
  await page.waitForTimeout(1000);

  // -------------------------------------------------------------------------
  // 7. Responsive Behavior: Tablet & Mobile Stacked Cards
  // -------------------------------------------------------------------------
  // Tablet viewport (768x1024)
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.waitForTimeout(2000); // Showcase tablet layout and overflow handling

  // Mobile viewport (375x812)
  await page.setViewportSize({ width: 375, height: 812 });
  await page.waitForTimeout(1500); // Showcase mobile stacked Zen Green cards

  // Scroll through mobile cards
  await page.evaluate(() => window.scrollBy({ top: 350, behavior: 'smooth' }));
  await page.waitForTimeout(1500);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  await page.waitForTimeout(1000);

  // Restore Desktop viewport (1280x800)
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.waitForTimeout(1000);

  // -------------------------------------------------------------------------
  // 8. Open-Detail Action Leading to Ticket Detail View
  // -------------------------------------------------------------------------
  const firstRow = page.locator('[data-testid^="queue-row-"]').first();
  await expect(firstRow).toBeVisible({ timeout: 10000 });
  await firstRow.click();

  await expect(page.locator('[data-testid="staff-ticket-detail-view"]')).toBeVisible({ timeout: 10000 });
  await page.waitForTimeout(3000); // Final hold on Ticket Detail operational screen

  // -------------------------------------------------------------------------
  // Finalize Video Recording & Transcode to MP4
  // -------------------------------------------------------------------------
  const video = page.video();
  await page.close();
  await context.close();

  if (video) {
    const videoPath = await video.path();
    const targetPath = path.join(VIDEOS_DIR, 'part-6-staff-ticket-queue.webm');
    const mp4Path = path.join(VIDEOS_DIR, 'part-6-staff-ticket-queue.mp4');
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
      // ffmpeg fallback
    }
  }
});
