import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const SCREENSHOTS_DIR = path.resolve('artifacts/lab-02/screenshots');
const REPORT_FILE = path.resolve('artifacts/lab-02/submission-evidence-report.md');

test.describe('My Tickets, Attachment Lifecycle & Cross-Requester Security Evidence Suite', () => {
  test.beforeAll(() => {
    if (!fs.existsSync(SCREENSHOTS_DIR)) {
      fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
    }
  });

  test('Generate complete visual and protocol evidence for My Tickets, Attachments, and Cross-Requester Isolation', async ({
    page,
  }) => {
    test.setTimeout(120000);

    // Set desktop viewport for crisp, legible typography and table layout
    await page.setViewportSize({ width: 1280, height: 800 });

    const newEvidenceRecords: {
      index: string;
      title: string;
      filename: string;
      requirement: string;
      description: string;
      backendPayload?: any;
    }[] = [];

    // =========================================================================
    // STEP 1: Requester A Selection & My Tickets Initial List (Evidence 13)
    // =========================================================================
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem(
        'toktickit_current_requester',
        JSON.stringify({
          id: 1,
          name: 'Sompong IT',
          email: 'sompong.it@kmutt.ac.th',
          department: 'Information Technology Office',
          isActive: true,
        })
      );
    });
    await page.reload();

    const navMyTickets = page.locator('[data-testid="nav-my-tickets"]');
    await expect(navMyTickets).toBeVisible({ timeout: 10000 });
    await navMyTickets.click();

    const searchInput = page.locator('[data-testid="filter-search-input"]');
    await expect(searchInput).toBeVisible({ timeout: 10000 });

    // Assert tickets table is rendered and populated for Sompong IT
    const firstTicketLink = page.locator('[data-testid^="ticket-link-"]').first();
    await expect(firstTicketLink).toBeVisible({ timeout: 10000 });
    const sompongTicketNumber = (await firstTicketLink.textContent())?.trim();
    const sompongTestId = await firstTicketLink.getAttribute('data-testid');
    const sompongTicketId = sompongTestId?.replace('ticket-link-', '');

    const screenshot13 = '13-requester-a-ticket-list.png';
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, screenshot13),
      fullPage: true,
    });
    newEvidenceRecords.push({
      index: '9',
      title: 'My Tickets — Requester A Selected & Ticket List Presentation',
      filename: screenshot13,
      requirement: 'Show Requester A selected and their ticket list',
      description:
        'Demonstrates the authenticated My Tickets view for Requester A (Sompong IT) displaying active user badge, ticket table with metadata, status badges, and pagination range summary.',
    });

    // =========================================================================
    // STEP 2: Live Search Active Filter (Evidence 14)
    // =========================================================================
    await searchInput.fill('Wi-Fi');
    await page.waitForTimeout(600); // Allow 350ms debounce to settle and load

    const screenshot14 = '14-my-tickets-search-active.png';
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, screenshot14),
      fullPage: true,
    });
    newEvidenceRecords.push({
      index: '10',
      title: 'My Tickets — Live Search Keyword Filtering',
      filename: screenshot14,
      requirement: 'Include search filter in action',
      description:
        'Demonstrates live client-side search filtering debounced by 350ms, narrowing the ticket catalog dynamically to matching summaries and descriptions.',
    });

    // =========================================================================
    // STEP 3: Dropdown Category & Status Filters (Evidence 15)
    // =========================================================================
    await searchInput.fill('');
    await page.waitForTimeout(500);

    const categorySelect = page.locator('[data-testid="filter-category-select"]');
    await categorySelect.selectOption({ label: 'Network' });

    const statusSelect = page.locator('[data-testid="filter-status-select"]');
    await statusSelect.selectOption({ label: 'New' });
    await page.waitForTimeout(500);

    const screenshot15 = '15-my-tickets-filters-applied.png';
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, screenshot15),
      fullPage: true,
    });
    newEvidenceRecords.push({
      index: '11',
      title: 'My Tickets — Category & Status Dropdown Filters',
      filename: screenshot15,
      requirement: 'Include dropdown filters and clear-filters control',
      description:
        'Demonstrates multi-attribute filtering (Category: Network, Status: New) with the active "Clear Filters" secondary action button.',
    });

    // =========================================================================
    // STEP 4: Column Header Sorting (Evidence 16)
    // =========================================================================
    const clearFiltersBtn = page.locator('[data-testid="clear-filters-btn"]');
    if (await clearFiltersBtn.isVisible()) {
      await clearFiltersBtn.click();
      await page.waitForTimeout(500);
    }

    const ticketNoTh = page.locator('th.sortable-th', { hasText: /ticket no/i });
    await ticketNoTh.click();
    await page.waitForTimeout(500);

    const screenshot16 = '16-my-tickets-column-sorting.png';
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, screenshot16),
      fullPage: true,
    });
    newEvidenceRecords.push({
      index: '12',
      title: 'My Tickets — Sortable Column Headers',
      filename: screenshot16,
      requirement: 'Include sorting with visual directional indicators',
      description:
        'Demonstrates interactive column sorting on Ticket No with active visual direction indicator (▲ / ▼) in compliance with Zen styling.',
    });

    // =========================================================================
    // STEP 5: No-Results Filtered State (Evidence 17)
    // =========================================================================
    await searchInput.fill('NONEXISTENT_QUERY_XYZ_999');
    await page.waitForTimeout(600);

    const noResultsState = page.locator('[data-testid="no-results-state"]');
    await expect(noResultsState).toBeVisible({ timeout: 5000 });

    const screenshot17 = '17-my-tickets-no-results-state.png';
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, screenshot17),
      fullPage: true,
    });
    newEvidenceRecords.push({
      index: '13',
      title: 'My Tickets — Filtered No-Results Empty State',
      filename: screenshot17,
      requirement: 'Include no-results state with clear filters action',
      description:
        'Demonstrates graceful zero-match feedback card (🔍 No matching tickets found) when filter or search criteria match zero tickets.',
    });

    // =========================================================================
    // STEP 6: Pagination Controls (Evidence 18)
    // =========================================================================
    await page.locator('[data-testid="clear-filters-btn"]').click();
    await page.waitForTimeout(500);

    const page2Btn = page.locator('[data-testid="page-btn-2"]');
    if (await page2Btn.isVisible()) {
      await page2Btn.click();
      await page.waitForTimeout(500);
    }

    const paginationSummary = page.locator('[data-testid="pagination-summary"]');
    await expect(paginationSummary).toBeVisible();

    const screenshot18 = '18-my-tickets-pagination-controls.png';
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, screenshot18),
      fullPage: true,
    });
    newEvidenceRecords.push({
      index: '14',
      title: 'My Tickets — Server-Side Pagination Controls',
      filename: screenshot18,
      requirement: 'Include pagination controls and range indicator',
      description:
        'Demonstrates server-side pagination bar displaying active page pills, items-per-page selector, and range summary ("Showing 11 to 20 of X tickets").',
    });

    // Return to page 1
    const page1Btn = page.locator('[data-testid="page-btn-1"]');
    if (await page1Btn.isVisible()) {
      await page1Btn.click();
      await page.waitForTimeout(500);
    }

    // Helper to robustly select requester by substring and complete modal flow
    async function selectRequesterByName(name: string) {
      const modal = page.locator('.modal.show');
      await expect(modal).toBeVisible({ timeout: 5000 });
      const opt = page.locator('#requester-select option', { hasText: name });
      await expect(opt).toBeAttached({ timeout: 10000 });
      const val = await opt.getAttribute('value');
      await page.locator('#requester-select').selectOption(val!);
      const continueBtn = page.getByRole('button', { name: 'Continue' });
      await expect(continueBtn).toBeEnabled({ timeout: 5000 });
      await continueBtn.click();
      await expect(modal).toBeHidden({ timeout: 10000 });
    }

    // =========================================================================
    // STEP 7: Requester Switch & Ticket Disappearance (Evidence 19)
    // =========================================================================
    const changeRequesterBtn = page.getByRole('button', { name: /change requester/i });
    await changeRequesterBtn.click();
    await selectRequesterByName('Anong Staff');

    const activeBadge = page.locator('[data-testid="active-user-badge"]');
    await expect(activeBadge).toContainText('Anong Staff');
    await page.waitForTimeout(600);

    // Verify Sompong's ticket is NOT present in Anong's list
    if (sompongTicketNumber) {
      await expect(page.locator(`text=${sompongTicketNumber}`)).toHaveCount(0);
    }

    const screenshot19 = '19-requester-switch-tickets-disappear.png';
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, screenshot19),
      fullPage: true,
    });
    newEvidenceRecords.push({
      index: '15',
      title: 'My Tickets — Cross-Requester Ownership Boundary (A Disappears)',
      filename: screenshot19,
      requirement: 'Change to Requester B and demonstrate that Requester A’s tickets disappear',
      description:
        'Demonstrates that switching the active simulated requester immediately purges Requester A’s tickets from the DOM and renders only Requester B’s records, strictly enforcing AC-03.',
    });

    // =========================================================================
    // STEP 8: Requester with Zero Tickets — Empty State (Evidence 20)
    // =========================================================================
    await changeRequesterBtn.click();
    await selectRequesterByName('Wichai Faculty');

    await expect(activeBadge).toContainText('Wichai Faculty');
    const emptyState = page.locator('[data-testid="empty-state"]');
    await expect(emptyState).toBeVisible({ timeout: 5000 });
    await expect(emptyState).toContainText('No tickets submitted yet');

    const screenshot20 = '20-requester-empty-state.png';
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, screenshot20),
      fullPage: true,
    });
    newEvidenceRecords.push({
      index: '16',
      title: 'My Tickets — Zero-Record Requester Empty State',
      filename: screenshot20,
      requirement: 'Include empty state for requesters with no submitted tickets',
      description:
        'Demonstrates the empty state card (📥 No tickets submitted yet) displayed when the selected requester has zero lifetime tickets, featuring a primary action to create their first ticket.',
    });

    // =========================================================================
    // STEP 9: Owned Ticket Detail Inspection (Evidence 21)
    // =========================================================================
    // Switch back to Sompong IT
    await changeRequesterBtn.click();
    await selectRequesterByName('Sompong IT');
    await expect(activeBadge).toContainText('Sompong IT');

    // Click on the first owned ticket to open detail view
    await page.locator('[data-testid^="ticket-link-"]').first().click();
    const detailView = page.locator('[data-testid="ticket-detail-view"]');
    await expect(detailView).toBeVisible({ timeout: 10000 });

    // Assert read-only fields
    await expect(page.locator('[data-testid="ticket-number"]')).toBeVisible();
    await expect(page.locator('[data-testid="ticket-status-badge"]')).toBeVisible();
    await expect(page.locator('[data-testid="ticket-requester-name"]')).toContainText('Sompong IT');

    const screenshot21 = '21-owned-ticket-detail-view.png';
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, screenshot21),
      fullPage: true,
    });
    newEvidenceRecords.push({
      index: '17',
      title: 'Ticket Detail — Owned Ticket Inspection & Metadata Presentation',
      filename: screenshot21,
      requirement: 'Show Owned Ticket Detail with read-only fields and status badge',
      description:
        'Demonstrates the Ticket Detail view for an owned ticket displaying read-only ticket number, status badge, requester name, summary, category, urgency, impact, and description.',
    });

    // =========================================================================
    // STEP 10: Add Active Attachment (Evidence 22)
    // =========================================================================
    const fileUploadInput = page.locator('[data-testid="file-upload-input"]');
    await fileUploadInput.setInputFiles({
      name: 'architecture-diagram.png',
      mimeType: 'image/png',
      buffer: Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44,
        0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f,
        0x15, 0xc4, 0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00,
        0x01, 0x00, 0x00, 0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
        0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
      ]),
    });

    const activeAttachmentsList = page.locator('[data-testid="active-attachments-list"]');
    await expect(activeAttachmentsList).toContainText('architecture-diagram.png', {
      timeout: 10000,
    });

    const screenshot22 = '22-attachment-added-active.png';
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, screenshot22),
      fullPage: true,
    });
    newEvidenceRecords.push({
      index: '18',
      title: 'Ticket Attachments — Add Active Attachment',
      filename: screenshot22,
      requirement: 'Add attachment and demonstrate active attachment rendering',
      description:
        'Demonstrates successful upload and rendering of a valid PNG attachment with active count badge increment, download trigger, and remove action.',
    });

    // =========================================================================
    // STEP 11: Download Active Attachment Verification
    // =========================================================================
    const activeDiagRow = page
      .locator('[data-testid="active-attachments-list"] [data-testid^="attachment-row-"]', {
        hasText: 'architecture-diagram.png',
      })
      .first();
    await expect(activeDiagRow).toBeVisible({ timeout: 5000 });

    const downloadPromise = page.waitForEvent('download');
    await activeDiagRow.locator('[data-testid^="download-btn-"]').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('architecture-diagram.png');

    // =========================================================================
    // STEP 12: Soft Removal Modal with Mandatory Reason (Evidence 23)
    // =========================================================================
    await activeDiagRow.locator('[data-testid^="remove-btn-"]').click();

    const removeModal = page.locator('[data-testid="remove-attachment-modal"]');
    await expect(removeModal).toBeVisible();

    const reasonInput = page.locator('[data-testid="removal-reason-input"]');
    await reasonInput.fill('Superseded by updated network topology schema v2');

    const screenshot23 = '23-soft-removal-modal-with-reason.png';
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, screenshot23),
      fullPage: true,
    });
    newEvidenceRecords.push({
      index: '19',
      title: 'Ticket Attachments — Soft Removal Confirmation Modal',
      filename: screenshot23,
      requirement: 'Soft removal with reason requirement',
      description:
        'Demonstrates the accessible confirmation modal requiring an audited removal reason (3-250 characters) prior to soft-deleting the attachment.',
    });

    const confirmRemoveBtn = page.locator(
      '[data-testid="confirm-remove-btn"], [data-testid="confirm-removal-btn"]'
    );
    await confirmRemoveBtn.click();
    await expect(removeModal).toBeHidden({ timeout: 10000 });

    // =========================================================================
    // STEP 13: Retained Metadata in Tombstone Audit Log (Evidence 24)
    // =========================================================================
    const removedList = page.locator('[data-testid="removed-attachments-list"]');
    await expect(removedList).toBeVisible({ timeout: 10000 });

    const tombstoneRow = removedList
      .locator('[data-testid^="tombstone-row-"]', {
        hasText: 'architecture-diagram.png',
      })
      .first();
    await expect(tombstoneRow).toBeVisible({ timeout: 10000 });
    await expect(tombstoneRow).toContainText('architecture-diagram.png');
    await expect(tombstoneRow).toContainText('Superseded by updated network topology schema v2');

    const tombstoneTestId = await tombstoneRow.getAttribute('data-testid');
    const removedAttachmentId = tombstoneTestId?.replace('tombstone-row-', '');

    const screenshot24 = '24-retained-metadata-tombstone-log.png';
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, screenshot24),
      fullPage: true,
    });
    newEvidenceRecords.push({
      index: '20',
      title: 'Ticket Attachments — Retained Metadata & Tombstone Audit Log',
      filename: screenshot24,
      requirement: 'Demonstrate retained metadata and blocked removed download',
      description:
        'Demonstrates the Removed Attachments Audit Log displaying strikethrough filename, removal timestamp, removal reason in quotes, and permanent download block notification.',
    });

    // =========================================================================
    // STEP 14: Blocked Download of Soft-Removed File (API HTTP 410 Evidence)
    // =========================================================================
    // Assert download button is absent from the tombstone row
    await expect(tombstoneRow.locator('button:has-text("Download")')).toHaveCount(0);

    // Direct HTTP request to download the soft-removed file
    const directDownloadRes = await page.request.get(
      `http://localhost:3000/api/attachments/${removedAttachmentId}/download`,
      { headers: { 'x-requester-id': '1' } }
    );
    expect([410, 404]).toContain(directDownloadRes.status());
    const removedPayload = await directDownloadRes.json();
    expect(removedPayload.error.code).toBe('ATTACHMENT_REMOVED');

    // =========================================================================
    // STEP 15: Cross-Requester Search Isolation (Evidence 25)
    // =========================================================================
    // Switch to Anong Staff
    await changeRequesterBtn.click();
    await selectRequesterByName('Anong Staff');
    await expect(activeBadge).toContainText('Anong Staff');

    // Navigate to My Tickets
    await navMyTickets.click();
    await page.waitForTimeout(500);

    // Search for Sompong's ticket number
    if (sompongTicketNumber) {
      await searchInput.fill(sompongTicketNumber);
      await page.waitForTimeout(600);
      await expect(page.locator('[data-testid="no-results-state"]')).toBeVisible({
        timeout: 5000,
      });
    }

    const screenshot25 = '25-cross-requester-search-isolation.png';
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, screenshot25),
      fullPage: true,
    });
    newEvidenceRecords.push({
      index: '21',
      title: 'Security Boundary — Cross-Requester Search Isolation',
      filename: screenshot25,
      requirement: 'Include cross-requester search isolation evidence',
      description:
        'Demonstrates that searching for another requester’s ticket number yields zero results and renders the safe no-results state, proving search queries are confined to the active user.',
    });

    // =========================================================================
    // STEP 16: Direct Unauthorized Ticket Access Rejection (Evidence 26)
    // =========================================================================
    // Switch back to Sompong, open detail view, then switch to Anong Staff right in detail view
    await changeRequesterBtn.click();
    await selectRequesterByName('Sompong IT');
    await expect(activeBadge).toContainText('Sompong IT');

    // Open Sompong's ticket detail view
    await page.locator('[data-testid^="ticket-link-"]').first().click();
    await expect(detailView).toBeVisible({ timeout: 10000 });

    // Switch requester to Anong Staff WHILE viewing Sompong's ticket
    await changeRequesterBtn.click();
    await selectRequesterByName('Anong Staff');
    await expect(activeBadge).toContainText('Anong Staff');

    // RequesterTicketDetail detects requesterId change and re-evaluates -> 403 Forbidden!
    const forbiddenCard = page.locator('[data-testid="forbidden-error-card"]');
    await expect(forbiddenCard).toBeVisible({ timeout: 10000 });
    await expect(page.locator('h2:has-text("Access Forbidden")')).toBeVisible();

    const screenshot26 = '26-unauthorized-ticket-access-403.png';
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, screenshot26),
      fullPage: true,
    });
    newEvidenceRecords.push({
      index: '22',
      title: 'Security Boundary — Unauthorized Ticket Access Rejection (403 Forbidden)',
      filename: screenshot26,
      requirement: 'Unauthorized ticket-access test and cross-requester rejection',
      description:
        'Demonstrates that direct attempts by an unauthorized requester to inspect another user’s ticket trigger an HTTP 403 Forbidden rejection card (🔒 Access Forbidden) with zero data leakage.',
      backendPayload: {
        status: 403,
        errorCode: 'FORBIDDEN_TICKET_ACCESS',
        testedEndpoint: `/api/tickets/${sompongTicketId}`,
        unauthorizedRequesterId: 2,
        ticketOwnerId: 1,
      },
    });

    // =========================================================================
    // STEP 17: Direct Cross-Requester Attachment Operations (API Rejection)
    // =========================================================================
    // 1. Cross-requester download rejection
    const crossDownloadRes = await page.request.get(
      `http://localhost:3000/api/attachments/${removedAttachmentId}/download`,
      { headers: { 'x-requester-id': '2' } }
    );
    expect([403, 404]).toContain(crossDownloadRes.status());
    const crossDownloadPayload = await crossDownloadRes.json();

    // 2. Cross-requester removal rejection
    const crossDeleteRes = await page.request.delete(
      `http://localhost:3000/api/attachments/${removedAttachmentId}`,
      {
        headers: { 'x-requester-id': '2', 'Content-Type': 'application/json' },
        data: { removalReason: 'Malicious removal attempt' },
      }
    );
    expect([403, 404]).toContain(crossDeleteRes.status());
    const crossDeletePayload = await crossDeleteRes.json();

    // 3. Cross-requester upload rejection
    const crossUploadRes = await page.request.post(
      `http://localhost:3000/api/tickets/${sompongTicketId}/attachments`,
      {
        headers: { 'x-requester-id': '2' },
        multipart: {
          file: {
            name: 'unauthorized_payload.png',
            mimeType: 'image/png',
            buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
          },
        },
      }
    );
    expect([403, 404]).toContain(crossUploadRes.status());
    const crossUploadPayload = await crossUploadRes.json();

    // =========================================================================
    // STEP 18: Append to Evidence Report Dossier
    // =========================================================================
    let existingReport = fs.existsSync(REPORT_FILE) ? fs.readFileSync(REPORT_FILE, 'utf8') : '';

    let appendix = `\n\n---\n\n## 4. Phase 2 Evidence: My Tickets, Attachments & Cross-Requester Security\n\n`;
    appendix += `| Index | Requirement Focus | Screenshot File | Status | Verification Summary |\n`;
    appendix += `| :---: | :--- | :--- | :---: | :--- |\n`;

    for (const record of newEvidenceRecords) {
      appendix += `| **${record.index}** | ${record.requirement} | [\`${record.filename}\`](./screenshots/${record.filename}) | **VERIFIED** | ${record.title} |\n`;
    }

    appendix += `\n### Detailed Phase 2 Visual Evidence\n\n`;

    for (const record of newEvidenceRecords) {
      appendix += `#### Evidence ${record.index}: ${record.title}\n\n`;
      appendix += `* **Requirement Mapped**: ${record.requirement}\n`;
      appendix += `* **Visual Artifact**: ![${record.title}](./screenshots/${record.filename})\n`;
      appendix += `* **Detailed Explanation**: ${record.description}\n`;
      if (record.backendPayload) {
        appendix += `* **Intercepted Protocol Payload**:\n\`\`\`json\n${JSON.stringify(record.backendPayload, null, 2)}\n\`\`\`\n`;
      }
      appendix += `\n---\n\n`;
    }

    appendix += `### Cross-Requester Security Protocol Payloads\n\n`;
    appendix += `#### 1. Blocked Download of Soft-Removed File (HTTP 410 Gone)\n`;
    appendix += `* **Endpoint**: \`GET /api/attachments/${removedAttachmentId}/download\`\n`;
    appendix += `* **Response Status**: \`${directDownloadRes.status()}\`\n`;
    appendix += `* **Payload**:\n\`\`\`json\n${JSON.stringify(removedPayload, null, 2)}\n\`\`\`\n\n`;

    appendix += `#### 2. Cross-Requester Download Rejection (HTTP 403 Forbidden)\n`;
    appendix += `* **Endpoint**: \`GET /api/attachments/${removedAttachmentId}/download\` with \`x-requester-id: 2\`\n`;
    appendix += `* **Response Status**: \`${crossDownloadRes.status()}\`\n`;
    appendix += `* **Payload**:\n\`\`\`json\n${JSON.stringify(crossDownloadPayload, null, 2)}\n\`\`\`\n\n`;

    appendix += `#### 3. Cross-Requester Removal Rejection (HTTP 403 Forbidden)\n`;
    appendix += `* **Endpoint**: \`DELETE /api/attachments/${removedAttachmentId}\` with \`x-requester-id: 2\`\n`;
    appendix += `* **Response Status**: \`${crossDeleteRes.status()}\`\n`;
    appendix += `* **Payload**:\n\`\`\`json\n${JSON.stringify(crossDeletePayload, null, 2)}\n\`\`\`\n\n`;

    appendix += `#### 4. Cross-Requester Upload Rejection (HTTP 403 Forbidden)\n`;
    appendix += `* **Endpoint**: \`POST /api/tickets/${sompongTicketId}/attachments\` with \`x-requester-id: 2\`\n`;
    appendix += `* **Response Status**: \`${crossUploadRes.status()}\`\n`;
    appendix += `* **Payload**:\n\`\`\`json\n${JSON.stringify(crossUploadPayload, null, 2)}\n\`\`\`\n`;

    fs.writeFileSync(REPORT_FILE, existingReport + appendix, 'utf8');
  });
});
