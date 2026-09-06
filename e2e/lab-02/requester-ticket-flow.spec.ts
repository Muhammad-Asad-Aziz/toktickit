import { test, expect, Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const SCREENSHOTS_DIR = path.resolve('artifacts/lab-02/screenshots');

/**
 * Capture full-page screenshots across Desktop, Tablet, and Mobile viewports
 * in accordance with Contract §5.
 */
async function captureMultiViewport(page: Page, screenName: string) {
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  }

  const viewports = [
    { name: 'desktop', width: 1280, height: 800 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'mobile', width: 375, height: 812 },
  ];

  for (const vp of viewports) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.waitForTimeout(300); // Allow responsive CSS transitions and layout adjustment
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, `${screenName}-${vp.name}.png`),
      fullPage: true,
    });
  }

  // Restore Desktop viewport for test continuity
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.waitForTimeout(200);
}

test.describe('Requester Ticketing Lifecycle & E2E Verification (Feature 10)', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to client app
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('E2E-01: Full requester ticket lifecycle with attachments, screenshots & isolation', async ({ page }) => {
    test.setTimeout(120000);

    // -------------------------------------------------------------------------
    // STEP 1: Select simulated Requester in header identity widget
    // -------------------------------------------------------------------------
    // Per AC-02, on clean start with no cached requester, the selector modal opens automatically.
    // If not already visible, click the header button.
    const modal = page.locator('.modal.show');
    try {
      await expect(modal).toBeVisible({ timeout: 2000 });
    } catch {
      const requesterBtn = page.getByRole('button', { name: /select requester|change requester/i });
      await expect(requesterBtn).toBeVisible();
      await requesterBtn.click();
    }

    await expect(modal).toBeVisible();
    await expect(modal).toContainText('Development Notice:');


    // Select Sompong IT
    const requesterSelect = page.locator('#requester-select');
    await expect(requesterSelect).toBeVisible();
    await expect(page.locator('#requester-select option', { hasText: 'Sompong IT' })).toBeAttached({ timeout: 10000 });
    const sompongValue = await page.locator('#requester-select option', { hasText: 'Sompong IT' }).getAttribute('value');
    await requesterSelect.selectOption(sompongValue!);

    // Click Continue
    const continueBtn = page.getByRole('button', { name: 'Continue' });
    await expect(continueBtn).toBeEnabled();
    await continueBtn.click();

    // Verify modal closes and header reflects active identity badge
    await expect(modal).toBeHidden();
    const activeBadge = page.locator('[data-testid="active-user-badge"]');
    await expect(activeBadge).toBeVisible();
    await expect(activeBadge).toContainText('Sompong IT');

    // -------------------------------------------------------------------------
    // STEP 2: Navigate to Create Ticket form, fill details, stage attachment
    // -------------------------------------------------------------------------
    const navCreateBtn = page.locator('[data-testid="nav-create-ticket"]');
    await navCreateBtn.click();

    // Wait for form to load reference data
    const categorySelect = page.locator('#ticket-category');
    await expect(categorySelect).toBeVisible();
    await expect(page.locator('#ticket-category option', { hasText: 'Network' })).toBeAttached({ timeout: 10000 });
    const networkValue = await page.locator('#ticket-category option', { hasText: 'Network' }).getAttribute('value');
    await categorySelect.selectOption(networkValue!);

    const systemSelect = page.locator('#ticket-system');
    await expect(systemSelect).toBeVisible();
    await expect(page.locator('#ticket-system option', { hasText: 'Campus Wi-Fi' })).toBeAttached({ timeout: 10000 });
    const wifiValue = await page.locator('#ticket-system option', { hasText: 'Campus Wi-Fi' }).getAttribute('value');
    await systemSelect.selectOption(wifiValue!);


    // Select High priority pill
    const highPriorityPill = page.locator('.priority-pill.priority-high');
    await highPriorityPill.click();
    await expect(highPriorityPill).toHaveClass(/active/);

    // Enter Summary and Description
    const summaryInput = page.locator('#ticket-summary');
    await summaryInput.fill('E2E Wi-Fi Connection Failure in SCL Building');

    const descriptionInput = page.locator('#ticket-description');
    await descriptionInput.fill(
      'Automated E2E Playwright test verifying ticket creation, attachments, and isolation across KMUTT campus network.'
    );

    // Stage a valid file attachment
    const attachmentInput = page.locator('#attachment-file-input');
    await attachmentInput.setInputFiles({
      name: 'network-diagnostic.png',
      mimeType: 'image/png',
      buffer: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64'
      ),
    });

    // Verify staged file is listed
    await expect(page.locator('.list-group-item:has-text("network-diagnostic.png")')).toBeVisible();

    // Capture visual evidence screenshots for Create Ticket view
    await captureMultiViewport(page, 'create-ticket');

    // Submit ticket
    const submitBtn = page.getByRole('button', { name: /submit ticket/i });
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();

    // Assert confirmation card appears with official Ticket Number (TKT-YYYY-NNNNN)
    const ticketNumberElem = page.locator('[data-testid="created-ticket-number"]');
    await expect(ticketNumberElem).toBeVisible({ timeout: 15000 });
    const createdTicketNumber = (await ticketNumberElem.innerText()).trim();
    expect(createdTicketNumber).toMatch(/^TKT-\d{4}-\d{5}$/);

    // -------------------------------------------------------------------------
    // STEP 3: Navigate to "My Tickets" and assert listing metadata
    // -------------------------------------------------------------------------
    const viewMyTicketsBtn = page.getByRole('button', { name: /view in my tickets/i });
    await viewMyTicketsBtn.click();

    // Verify table / card contains our new ticket
    const ticketEntry = page.locator(`text=${createdTicketNumber}`);
    await expect(ticketEntry.first()).toBeVisible({ timeout: 10000 });

    // Verify metadata in row/card
    const parentContainer = page.locator(
      `tr:has-text("${createdTicketNumber}"), [data-testid^="ticket-card-"]:has-text("${createdTicketNumber}")`
    );
    await expect(parentContainer.first()).toContainText('E2E Wi-Fi Connection Failure in SCL Building');
    await expect(parentContainer.first()).toContainText('Network');
    await expect(parentContainer.first().locator('.badge-status-new')).toBeVisible();
    await expect(parentContainer.first().locator('.badge-priority-high')).toBeVisible();

    // Capture visual evidence screenshots for My Tickets view
    await captureMultiViewport(page, 'my-tickets');

    // -------------------------------------------------------------------------
    // STEP 4: Open "Ticket Detail" view and verify read-only fields
    // -------------------------------------------------------------------------
    // Click on the ticket link
    await page.locator(`[data-testid^="ticket-link-"]:has-text("${createdTicketNumber}"), [data-testid^="ticket-card-"]:has-text("${createdTicketNumber}")`).first().click();

    // Assert Ticket Detail view renders
    const detailView = page.locator('[data-testid="ticket-detail-view"]');
    await expect(detailView).toBeVisible({ timeout: 10000 });

    // Assert read-only header fields
    await expect(page.locator('[data-testid="ticket-number"]')).toHaveText(createdTicketNumber);
    await expect(page.locator('[data-testid="ticket-status-badge"]')).toHaveText('New');
    await expect(page.locator('[data-testid="ticket-summary"]')).toHaveText(
      'E2E Wi-Fi Connection Failure in SCL Building'
    );
    await expect(page.locator('[data-testid="ticket-requester-name"]')).toContainText('Sompong IT');
    await expect(page.locator('[data-testid="ticket-description"]')).toContainText(
      'Automated E2E Playwright test'
    );

    // Assert initial active attachment is present
    await expect(
      page.locator('[data-testid="active-attachments-list"]:has-text("network-diagnostic.png")')
    ).toBeVisible();

    // -------------------------------------------------------------------------
    // STEP 5: Attachment Lifecycle (Upload 2nd, Download Active, Soft-Remove)
    // -------------------------------------------------------------------------
    // Upload a second attachment (PDF)
    const fileUploadInput = page.locator('[data-testid="file-upload-input"]');
    await fileUploadInput.setInputFiles({
      name: 'syslog-report.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Count 0>>endobj\nxref\n0 3\n0000000000 65535 f\n0000000010 00000 n\n0000000053 00000 n\ntrailer<</Size 3/Root 1 0 R>>\nstartxref\n102\n%%EOF'),
    });

    // Assert both active attachments are listed (count = 2)
    const activeList = page.locator('[data-testid="active-attachments-list"]');
    await expect(activeList.locator('> div')).toHaveCount(2, { timeout: 10000 });
    await expect(activeList).toContainText('syslog-report.pdf');

    // Capture visual evidence screenshots for Ticket Detail (Active state)
    await captureMultiViewport(page, 'ticket-detail-active');

    // Download an active attachment
    const downloadPromise = page.waitForEvent('download');
    await page.locator('[data-testid^="download-btn-"]').first().click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBeTruthy();

    // Soft-remove one attachment
    await page.locator('[data-testid^="remove-btn-"]').first().click();

    // Verify modal appears
    const removeModal = page.locator('[data-testid="remove-attachment-modal"]');
    await expect(removeModal).toBeVisible();

    // Fill mandatory removal reason
    const reasonInput = page.locator('[data-testid="removal-reason-input"]');
    await reasonInput.fill('Uploaded outdated screenshot by mistake');

    // Confirm removal
    const confirmBtn = page.locator('[data-testid="confirm-remove-btn"], [data-testid="confirm-removal-btn"]');
    await confirmBtn.click();


    // Verify modal closes and active count decrements to 1
    await expect(removeModal).toBeHidden({ timeout: 10000 });
    await expect(activeList.locator('> div')).toHaveCount(1);

    // Verify removed file appears in the Removed Attachments Audit Log with tombstone styling
    const removedList = page.locator('[data-testid="removed-attachments-list"]');
    await expect(removedList).toBeVisible();
    await expect(removedList).toContainText('Uploaded outdated screenshot by mistake');
    await expect(removedList.locator('.badge:has-text("Removed")')).toBeVisible();

    // Capture visual evidence screenshots for Ticket Detail (Removed tombstone state)
    await captureMultiViewport(page, 'ticket-detail-removed');

    // -------------------------------------------------------------------------
    // STEP 6: Switch active Requester and assert strict data isolation
    // -------------------------------------------------------------------------
    // Click Change Requester in header
    const changeRequesterBtn = page.getByRole('button', { name: /change requester/i });
    await changeRequesterBtn.click();

    // Select Anong Staff
    await expect(requesterSelect).toBeVisible();
    await expect(page.locator('#requester-select option', { hasText: 'Anong Staff' })).toBeAttached({ timeout: 10000 });
    const anongValue = await page.locator('#requester-select option', { hasText: 'Anong Staff' }).getAttribute('value');
    await requesterSelect.selectOption(anongValue!);
    await continueBtn.click();

    // Assert header reflects new active user
    await expect(activeBadge).toContainText('Anong Staff');

    // Return to My Tickets view
    const navMyTickets = page.locator('[data-testid="nav-my-tickets"]');
    await navMyTickets.click();

    // Wait for list to load under Anong Staff
    await page.waitForTimeout(500);

    // Assert Sompong's newly created ticket is NOT present in Anong's list
    const sompongTicketInAnongList = page.locator(`text=${createdTicketNumber}`);
    await expect(sompongTicketInAnongList).toHaveCount(0);

    // Switch back to Sompong IT to verify ticket reappears
    await changeRequesterBtn.click();
    await requesterSelect.selectOption(sompongValue!);
    await continueBtn.click();
    await expect(activeBadge).toContainText('Sompong IT');

    await navMyTickets.click();

    // Assert ticket is visible again for Sompong
    await expect(page.locator(`text=${createdTicketNumber}`).first()).toBeVisible({ timeout: 10000 });
  });
});
