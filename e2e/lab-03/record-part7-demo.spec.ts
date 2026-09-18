import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';

const VIDEOS_DIR = path.join(process.cwd(), 'artifacts', 'lab-03', 'videos');
const BRAIN_ARTIFACTS_DIR = 'C:\\Users\\Muhammad Asad Aziz\\.gemini\\antigravity-ide\\brain\\11ee51fb-3981-4703-9ac8-878f2a45b713';

test('Record Part 7: IT Staff Ticket Detail & Collaboration Lifecycle Demo', async ({ browser }) => {
  test.setTimeout(120000);

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
  // 1. Login as IT Staff (Wichai) & Open Clean Ticket TKT-2026-00002
  // -------------------------------------------------------------------------
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await page.locator('[data-testid="login-email-input"]').fill('wichai.it@kmutt.ac.th');
  await page.waitForTimeout(250);
  await page.locator('[data-testid="login-password-input"]').fill('Password123!');
  await page.waitForTimeout(250);
  await page.locator('[data-testid="login-submit-button"]').click();

  await expect(page.locator('[data-testid="staff-ticket-queue-view"]')).toBeVisible({ timeout: 10000 });
  await page.locator('[data-testid="queue-search-input"]').fill('TKT-2026-00002');
  await page.waitForTimeout(800);

  const ticketRow = page.locator('[data-testid^="queue-row-"]').first();
  await expect(ticketRow).toBeVisible({ timeout: 10000 });
  await ticketRow.click();
  await expect(page.locator('[data-testid="staff-ticket-detail-view"]')).toBeVisible({ timeout: 10000 });
  await page.waitForTimeout(1500);

  // -------------------------------------------------------------------------
  // 2. Attachment Continuity (Lab 2 active files rendered with download action)
  // -------------------------------------------------------------------------
  await page.evaluate(() => window.scrollTo({ top: 320, behavior: 'smooth' }));
  await page.waitForTimeout(2000); // Showcase attachment projector-error-log.png, size, and download button
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  await page.waitForTimeout(800);

  // -------------------------------------------------------------------------
  // 3. Claim / Reassign Ticket
  // -------------------------------------------------------------------------
  const claimBtn = page.locator('[data-testid="claim-ticket-btn"]');
  if (await claimBtn.isVisible() && await claimBtn.isEnabled()) {
    await claimBtn.click();
    await expect(page.locator('[data-testid="current-owner-display"]')).toContainText('Wichai IT', { timeout: 10000 });
    await page.waitForTimeout(1500);
  }

  // -------------------------------------------------------------------------
  // 4. IT Operational Priority Update (URGENT)
  // -------------------------------------------------------------------------
  await page.locator('[data-testid="it-priority-select"]').selectOption('URGENT');
  await page.waitForTimeout(500);
  await page.locator('[data-testid="save-priority-btn"]').click();
  await expect(page.locator('[data-testid="ticket-it-priority-badge"]')).toContainText('URGENT', { timeout: 10000 });
  await page.waitForTimeout(1500);

  // -------------------------------------------------------------------------
  // 5. Permitted Status Transitions (NEW -> OPEN -> IN_PROGRESS)
  // -------------------------------------------------------------------------
  const currentStatus = (await page.locator('[data-testid="ticket-status-badge"]').innerText()).trim();
  if (currentStatus === 'NEW') {
    await page.locator('[data-testid="status-transition-select"]').selectOption('OPEN');
    await page.waitForTimeout(400);
    await page.locator('[data-testid="transition-status-btn"]').click();
    await expect(page.locator('[data-testid="ticket-status-badge"]')).toHaveText('OPEN', { timeout: 10000 });
    await page.waitForTimeout(1000);
  }
  await page.locator('[data-testid="status-transition-select"]').selectOption('IN_PROGRESS');
  await page.waitForTimeout(400);
  await page.locator('[data-testid="transition-status-btn"]').click();
  await expect(page.locator('[data-testid="ticket-status-badge"]')).toHaveText('IN_PROGRESS', { timeout: 10000 });
  await page.waitForTimeout(1500);

  // -------------------------------------------------------------------------
  // 6. Validation Feedback (Empty fields disabled with character counters)
  // -------------------------------------------------------------------------
  await page.evaluate(() => window.scrollTo({ top: 650, behavior: 'smooth' }));
  await page.waitForTimeout(800);
  await expect(page.locator('[data-testid="submit-public-comment-btn"]')).toBeDisabled();
  await expect(page.locator('[data-testid="submit-internal-note-btn"]')).toBeDisabled();
  await page.waitForTimeout(1500);

  // -------------------------------------------------------------------------
  // 7. Public Comments (Collaborative Thread)
  // -------------------------------------------------------------------------
  await page.locator('[data-testid="public-comment-input"]').fill('Investigating projector bulb issue. Replacement lamp requested.');
  await page.waitForTimeout(600);
  await page.locator('[data-testid="submit-public-comment-btn"]').click();
  await expect(page.locator('[data-testid="public-comments-list"]')).toContainText('Replacement lamp requested', { timeout: 10000 });
  await page.waitForTimeout(1500);

  // -------------------------------------------------------------------------
  // 8. Confidential Internal Notes (Amber Box with Lock Badge)
  // -------------------------------------------------------------------------
  await page.locator('[data-testid="internal-note-input"]').fill('Internal diagnostics: Bulb filament degraded. Workorder #8821 dispatched to facilities.');
  await page.waitForTimeout(600);
  await page.locator('[data-testid="submit-internal-note-btn"]').click();
  await expect(page.locator('[data-testid="internal-notes-list"]')).toContainText('Bulb filament degraded', { timeout: 10000 });
  await page.waitForTimeout(2000);

  // -------------------------------------------------------------------------
  // 9. Safe Failure Behavior (Simulated 500 API error on priority change)
  // -------------------------------------------------------------------------
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  await page.waitForTimeout(600);
  await page.route('**/api/v1/staff/tickets/*/priority', (route) => {
    route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ error: { message: 'Database connection timeout during priority save.' } }),
    });
  });
  await page.locator('[data-testid="it-priority-select"]').selectOption('LOW');
  await page.waitForTimeout(300);
  await page.locator('[data-testid="save-priority-btn"]').click();
  await expect(page.locator('.alert-danger')).toBeVisible({ timeout: 10000 });
  await page.waitForTimeout(2000); // Showcase non-crashing safe failure alert banner
  await page.unroute('**/api/v1/staff/tickets/*/priority');

  // -------------------------------------------------------------------------
  // 10. Role Restrictions (Requester View: Internal Notes & Controls Absent)
  // -------------------------------------------------------------------------
  await page.locator('[data-testid="logout-button"]').click();
  await expect(page.locator('[data-testid="login-email-input"]')).toBeVisible({ timeout: 10000 });

  await page.locator('[data-testid="login-email-input"]').fill('anong.sta@kmutt.ac.th');
  await page.waitForTimeout(250);
  await page.locator('[data-testid="login-password-input"]').fill('Password123!');
  await page.waitForTimeout(250);
  await page.locator('[data-testid="login-submit-button"]').click();

  await page.locator('[data-testid="nav-my-tickets"]').click();
  await expect(page.locator('[data-testid="my-tickets-container"]')).toBeVisible({ timeout: 10000 });

  const reqTicketRow = page.locator('tr').filter({ hasText: 'TKT-2026-00002' });
  await expect(reqTicketRow).toBeVisible({ timeout: 10000 });
  await reqTicketRow.locator('[data-testid^="ticket-link-"]').click();
  await expect(page.locator('[data-testid="ticket-detail-view"]')).toBeVisible({ timeout: 10000 });

  // Scroll through Requester view showing absence of Internal Notes and IT controls
  await page.evaluate(() => window.scrollTo({ top: 350, behavior: 'smooth' }));
  await page.waitForTimeout(2000);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  await page.waitForTimeout(800);

  // -------------------------------------------------------------------------
  // 11. Requester Resolution Indication (Problem Appears Resolved Banner)
  // -------------------------------------------------------------------------
  const indicateResolvedBtn = page.locator('[data-testid="indicate-resolved-btn"]');
  if (await indicateResolvedBtn.isVisible()) {
    await indicateResolvedBtn.click();
    await expect(page.locator('[data-testid="resolve-confirm-modal"]')).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(800);
    await page.locator('[data-testid="confirm-resolve-btn"]').click();
    await expect(page.locator('[data-testid="requester-resolved-banner"]')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(2000);
  }

  // -------------------------------------------------------------------------
  // 12. Direct API Authorization Evidence (HTTP 403 Forbidden JSON)
  // -------------------------------------------------------------------------
  await page.goto('http://localhost:3000/api/v1/staff/tickets');
  await expect(page.locator('body')).toContainText('FORBIDDEN');
  await page.waitForTimeout(2500); // Showcase raw HTTP 403 Forbidden payload

  // -------------------------------------------------------------------------
  // 13. Staff Resolution Alert (Staff view with Requester Resolution Banner)
  // -------------------------------------------------------------------------
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
  await page.locator('[data-testid="queue-search-input"]').fill('TKT-2026-00002');
  await page.waitForTimeout(600);
  const staffRow = page.locator('[data-testid^="queue-row-"]').first();
  await staffRow.click();
  await expect(page.locator('[data-testid="staff-ticket-detail-view"]')).toBeVisible({ timeout: 10000 });
  await expect(page.locator('[data-testid="requester-resolved-indicator"]')).toBeVisible({ timeout: 10000 });
  await page.waitForTimeout(3000); // Final hold on prominent resolution indicator banner

  // -------------------------------------------------------------------------
  // Finalize Video Recording & Transcode to MP4
  // -------------------------------------------------------------------------
  const video = page.video();
  await page.close();
  await context.close();

  if (video) {
    const videoPath = await video.path();
    const targetWebmPath = path.join(VIDEOS_DIR, 'part-7-staff-ticket-detail.webm');
    const targetMp4Path = path.join(VIDEOS_DIR, 'part-7-staff-ticket-detail.mp4');

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
        const brainMp4 = path.join(BRAIN_ARTIFACTS_DIR, 'part-7-staff-ticket-detail.mp4');
        fs.copyFileSync(targetMp4Path, brainMp4);
        console.log(`Copied to brain artifacts: ${brainMp4}`);
      }
    } catch (err) {
      console.error('FFmpeg transcoding failed:', err);
    }
  }
});

