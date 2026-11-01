# TokTickIT Sprint 4 (Lab 4) — UI Specification & Style Contract

**Document Title**: Sprint 4 User Interface & Style Specification  
**Document ID**: UI-SPEC-LAB-04  
**Version**: 1.0 (Approved Baseline)  
**Status**: Ready for Implementation  
**Theme**: KMUTT IT Service Desk "Zen Green" Design System  
**Traceability Reference**: [Lab_04_labsheet.pdf](../reference/Lab_04_labsheet.pdf) (§7, §8, §14), [specification.md](./specification.md)  
**Approved Decisions**: DR-01 through DR-30 (incorporating Labs 2 & 3 baselines + Sprint 4 extensions)

---

## 1. Design Tokens & CSS Variables

All dashboard widgets, metric cards, action tables, modal dialogs, status badges, and interactive controls must consume these standardized CSS custom properties defined in `:root`. Local hardcoded hex codes or raw Bootstrap utility overrides that violate brand palette harmony are prohibited.

```css
:root {
  /* Brand Zen Green Palette (Labsheet §7) */
  --zen-primary-green:      #006B3C; /* App header, primary CTA buttons, active tab emphasis */
  --zen-secondary-green:    #0B7A46; /* Hover states, focus rings, link accents */
  --zen-pale-green:         #EAF6EF; /* Selected card background, table hover surface, soft badges */
  --zen-page-bg:            #F5F7F6; /* Application background canvas */
  --zen-surface:            #FFFFFF; /* Card, panel, and modal background */

  /* Typography & Text */
  --zen-font-family:        system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  --zen-font-size-base:     16px;    /* DR-01: Base body scale */
  --zen-font-size-label:    16px;    /* DR-06: Form label font size */
  --zen-font-size-error:    13px;    /* DR-13: Validation error font size */
  --zen-font-size-kpi:      32px;    /* Dashboard metric number font size */
  --zen-font-size-meta:     13px;    /* Metadata, timestamps, helper notes */
  --zen-text-primary:       #1C2826; /* Dark charcoal-green text (never pure #000) */
  --zen-text-muted:         #5B6573; /* Secondary metadata and labels */

  /* Borders & Controls */
  --zen-border-neutral:     #D1D5DB; /* Standard field and card border */
  --zen-border-subtle:      #E5E7EB; /* Subtle dividers and table grid lines */
  --zen-border-radius:      6px;     /* DR-05: Standard control radius (rounded-2) */
  --zen-border-radius-lg:   10px;    /* Dashboard metric cards and modal radius */
  --zen-control-height:     40px;    /* DR-05: Uniform single-line input height */
  --zen-field-readonly-bg:  #F0F4F1; /* Soft gray-green shading for read-only fields */

  /* Focus & Accessibility */
  --zen-focus-ring-color:   #0B7A46; /* Focus outline color */
  --zen-focus-halo:         0 0 0 3px rgba(11, 122, 70, 0.20); /* Focus halo */
  --zen-focus-outline:      2px solid var(--zen-focus-ring-color); /* A11y focus ring */

  /* Feedback Colors */
  --zen-error:              #B3261E; /* Dark red text and invalid field border */
  --zen-error-bg:           #FDF2F2; /* Error banner and alert background */
  --zen-error-glow:         0 0 0 3px rgba(179, 38, 30, 0.15); /* Invalid field focus glow */
  --zen-warning:            #D97706; /* Amber callouts and follow-up badges */
  --zen-warning-bg:         #FFFBEB; /* Amber background for follow-up notes & internal notes */
  --zen-warning-border:     #F59E0B; /* Amber border */
  --zen-success:            #2E7D32; /* Green confirmation icon and text */
  --zen-success-bg:         #EDF7ED; /* Green success alert background */
  --zen-info-bg:            #F0F9FF; /* Blue informational banner background */
  --zen-info-border:        #BAE6FD; /* Blue informational banner border */

  /* Actions Taken Tokens (Sprint 4 Extension) */
  --zen-action-bg:          #FFFFFF; /* White action card surface */
  --zen-action-border:      #D1D5DB; /* Action item border */
  --zen-action-header-bg:   #F9FAFB; /* Action table header background */
  --zen-followup-badge-bg:  #FEF3C7; /* Amber follow-up tag */
  --zen-followup-badge-text:#92400E; /* Amber follow-up text */

  /* Dimensions & Spacing */
  --zen-field-spacing:      20px;    /* Vertical margin between form fields */
  --zen-card-padding:       24px;    /* Desktop card internal padding */
  --zen-container-max-w:    1320px;  /* Desktop container max width */
}
```

---

## 2. Typography, Badges & Status Indicators

### 2.1. Typography
* **Page Headings (`h1`)**: `1.75rem` (`28px`), `font-weight: 700`, color `var(--zen-text-primary)`.
* **Section Headings (`h2`)**: `1.375rem` (`22px`), `font-weight: 600`, color `var(--zen-primary-green)`.
* **Metric Counter Values**: `2.0rem` (`32px`), `font-weight: 700`, color `var(--zen-primary-green)`.
* **Form Labels**: Placed strictly above inputs, `16px`, `font-weight: 600`. Required inputs display `<span class="text-danger ms-1" aria-hidden="true">*</span>`.
* **Validation Error Text**: `13px`, `font-weight: 500`, color `var(--zen-error)`.

### 2.2. Status Badges (Never Color Alone)
Every status badge combines a distinct background tint, border, explicit label text, and an accessible unicode icon/symbol:

| Status | Background | Text Color | Border | Visual Symbol & Label |
| :--- | :--- | :--- | :--- | :---: |
| `NEW` | `#EAF6EF` | `#006B3C` | `1px solid #C4E5D2` | 🟢 New |
| `OPEN` | `#E0F2FE` | `#0369A1` | `1px solid #BAE6FD` | 🔵 Open |
| `IN_PROGRESS` | `#FEF3C7` | `#92400E` | `1px solid #FDE68A` | 🟡 In Progress |
| `WAITING_FOR_REQUESTER` | `#F3E8FF` | `#6B21A8` | `1px solid #E9D5FF` | 🟣 Awaiting User |
| `RESOLVED` | `#DCFCE7` | `#15803D` | `1px solid #BBF7D0` | 🟢 Resolved |
| `CLOSED` | `#F3F4F6` | `#374151` | `1px solid #E5E7EB` | ⚫ Closed |
| `REOPENED` | `#FFEDD5` | `#C2410C` | `1px solid #FED7AA` | 🟠 Reopened |
| `CANCELLED` | `#FEE2E2` | `#991B1B` | `1px solid #FECACA` | 🔴 Cancelled |

---

## 3. Screen Layouts & Component Specifications

### 3.1. IT Staff Dashboard (`/staff/dashboard`)

The IT Staff Dashboard serves as the operational headquarters for technicians and desk agents, providing instant visibility into incoming queue pressure, individual assignments, and urgent incidents.

```
+--------------------------------------------------------------------------------------------------+
| TokTickIT [Zen Header]                     [Queue] [Dashboard] [My Tickets]    (Wichai IT | Staff) |
+--------------------------------------------------------------------------------------------------+
| IT Staff Dashboard                                                                                |
| High-level operational overview and pending workload.                                            |
|                                                                                                  |
| [ Metric Card 1 ]       [ Metric Card 2 ]       [ Metric Card 3 ]       [ Metric Card 4 ]        |
|  Unassigned Tickets      My Owned Tickets        Total Active Tickets    Urgent / High Priority  |
|  4                      6                       18                      7                        |
|  [View Unassigned ->]   [View My Work ->]       [View Active Queue ->]  [View Critical ->]       |
|                                                                                                  |
| +-------------------------------------------------------+ +------------------------------------+ |
| | Workload by Status                                    | | Workload by IT Priority            | |
| |  [NEW: 2] [OPEN: 4] [IN_PROGRESS: 8] [WAITING: 4]     | |  [URGENT: 3] [HIGH: 7]             | |
| |  [RESOLVED: 5] [CLOSED: 22] [REOPENED: 0]             | |  [MEDIUM: 6] [LOW: 2]              | |
| +-------------------------------------------------------+ +------------------------------------+ |
|                                                                                                  |
| Recently Updated Active Tickets                                                                   |
| +----------------------------------------------------------------------------------------------+ |
| | Ticket #       | Summary                  | Priority | Status       | Owner      | Updated   | |
| |----------------+--------------------------+----------+--------------+------------+-----------| |
| | TKT-2026-00014 | Core Switch Port Down    | ⚠️ URGENT| 🟡 IN_PROG   | Wichai IT  | 10m ago   | |
| | TKT-2026-00018 | Lab 2 Wi-Fi Offline      | ⚠️ HIGH  | 🔵 OPEN      | Unassigned | 25m ago   | |
| | TKT-2026-00012 | Projector Lamp Burnout   | 🔹 MEDIUM| 🟣 WAITING   | Nareerat   | 1h ago    | |
| +----------------------------------------------------------------------------------------------+ |
+--------------------------------------------------------------------------------------------------+
```

#### Detailed Widget Specifications:
1. **Summary Metric Cards**:
   - Four top-level cards: `Unassigned Tickets`, `My Owned Tickets`, `Total Active Tickets`, `Urgent/High Tickets`.
   - Each card displays a clear label, `32px` bold numerical value, and a 1-click drill-down button linking to `/staff/tickets` pre-filtered by query parameters (e.g. `?owner=unassigned`, `?owner=me`, `?priority=URGENT,HIGH`).
2. **Status Distribution Bar / Badges**:
   - Interactive badge cluster breaking down ticket counts across all 8 statuses.
   - Clicking any status badge navigates directly to the ticket queue filtered by that status.
3. **IT Priority Breakdown**:
   - Visual cards grouping active tickets by `URGENT`, `HIGH`, `MEDIUM`, `LOW`.
4. **Recently Updated Active Tickets Table**:
   - Displays the top 5 most recently updated non-closed tickets.
   - Columns: Ticket #, Summary, IT Priority badge, Status badge, Owner, Last Updated relative time.
   - Entire row or Ticket # is clickable, opening the Ticket Detail view.
5. **Empty States**:
   - When no tickets match a category, displays a clean Zen Green empty-state box: *"No unassigned tickets pending. Excellent job!"* with an icon.

---

### 3.2. Requester Dashboard (`/requester/dashboard`)

The Requester Dashboard provides students, staff, and faculty with a simplified personal portal highlighting tickets that need their input and celebrating resolved requests.

```
+--------------------------------------------------------------------------------------------------+
| TokTickIT [Zen Header]                        [Dashboard] [My Tickets] [+ New Ticket]  (Mana | Req)|
+--------------------------------------------------------------------------------------------------+
| Welcome back, Mana Student!                                                                      |
| Track and manage your active IT service requests.                                                |
|                                                                                                  |
| [ Metric Card 1 ]               [ Metric Card 2 ]               [ Metric Card 3 ]                |
|  Active Tickets                  Action Required                 Recently Resolved               |
|  3                              1                               5                                |
|  [View All Tickets ->]          [Review Questions ->]           [View Resolved History ->]       |
|                                                                                                  |
| +----------------------------------------------------------------------------------------------+ |
| | ⚠️ Action Required on 1 Ticket                                                               | |
| | IT Staff is waiting for your response on: TKT-2026-00012 ("Projector lamp failure").         | |
| | [Reply to Staff ->]                                                                          | |
| +----------------------------------------------------------------------------------------------+ |
|                                                                                                  |
| Recently Updated Tickets                                                                         |
| +----------------------------------------------------------------------------------------------+ |
| | Ticket #       | Summary                  | Priority | Status       | Last Updated | Action  | |
| |----------------+--------------------------+----------+--------------+--------------+---------| |
| | TKT-2026-00012 | Projector lamp failure   | ⚠️ HIGH  | 🟣 Awaiting  | 10m ago      | [Open]  | |
| | TKT-2026-00008 | VPN Connection Error     | 🔹 MEDIUM| 🟡 In Prog   | 2h ago       | [Open]  | |
| | TKT-2026-00003 | Wi-Fi Account Locked     | 🔹 MEDIUM| 🟢 Resolved  | Yesterday    | [Open]  | |
| +----------------------------------------------------------------------------------------------+ |
+--------------------------------------------------------------------------------------------------+
```

#### Detailed Widget Specifications:
1. **Personal Metric Cards**:
   - `Active Tickets`: Counts tickets in `NEW`, `OPEN`, `IN_PROGRESS`, `REOPENED`.
   - `Action Required`: Counts tickets in `WAITING_FOR_REQUESTER` (high-visibility amber accent).
   - `Recently Resolved`: Counts tickets resolved in the last 30 days.
2. **Action Required Alert Banner**:
   - Rendered only if `waitingForRequesterCount > 0`.
   - Amber alert border and background (`--zen-warning-bg`, `--zen-warning-border`), explicitly listing tickets awaiting requester input with direct link to comment.
3. **Recently Updated Tickets Table**:
   - Top 5 tickets owned by the requester, sorted by `updatedAt` descending.
   - Shows Ticket #, Summary, Priority badge, Status badge, Last Updated, and an "Open Ticket" CTA button.

---

### 3.3. Administrator Dashboard (`/admin/dashboard`)

The Administrator Dashboard reuses the complete IT Staff operational dashboard and appends an administrative system metrics section:
* **User Accounts by Role**: Badges showing counts for `REQUESTER`, `IT_STAFF`, and `ADMINISTRATOR`.
* **System Account Health**: Active accounts count vs. Inactive accounts count.
* **Total Cumulative Tickets**: Lifetime ticket count.
* **Quick Administrative Links**: Direct button navigating to User Management (`/admin/users`).

---

### 3.4. Actions Taken Section on Ticket Detail

The Actions Taken area is added as a prominent card on the IT Staff Ticket Detail view (and rendered read-only on the Requester Ticket Detail view).

```
+--------------------------------------------------------------------------------------------------+
| Actions Taken by IT Staff                                                  [+ Log Action Taken]  |
| Granular investigation, troubleshooting steps, and technical actions performed.                  |
|--------------------------------------------------------------------------------------------------|
| [2026-10-29 10:30]  Performed by: Wichai IT                                 [Edit Action]        |
| Description: Inspected Cisco 2960 switch in Building 2, Room 304. Replaced damaged patch cord.   |
| Result: Port link status returned to UP/UP at 1Gbps. VLAN 10 restored.                          |
| Attachment Notes: Photo of damaged RJ45 connector uploaded to Attachments (switch_port_bad.jpg). |
| Follow-up: ⚠️ Required                                                                          |
| Follow-up Note: Monitor packet drop counters over next 24 hours during peak lecture hours.       |
|--------------------------------------------------------------------------------------------------|
| [2026-10-29 09:15]  Performed by: Ekachai IT                                [Edit Action]        |
| Description: Remote ping test from core router to edge switch IP 10.20.4.15.                     |
| Result: 100% packet loss. Confirmed power supply active via smart PDU. Physical visit needed.   |
| Follow-up: None                                                                                  |
+--------------------------------------------------------------------------------------------------+
```

#### Detailed Component Specifications:
1. **Actions Taken Header**:
   - Heading: `Actions Taken by IT Staff` (`h2`, `var(--zen-primary-green)`).
   - Subtitle: *"Granular investigation, troubleshooting steps, and technical actions performed."*
   - CTA Button: `+ Log Action Taken` (Zen Primary Green button, visible **only** to IT Staff and Administrators).
2. **Action Item Cards / Rows**:
   - Border: `1px solid var(--zen-border-neutral)` with `var(--zen-border-radius)`.
   - Action Date/Time: Formatted cleanly (`YYYY-MM-DD HH:mm`) with clock icon.
   - Auto-Attributed Performer: `Performed by: <Staff Name>` displayed in bold charcoal-green.
   - Description & Result: Formatted with distinct labels.
   - Attachment Notes: Displayed with paperclip icon if populated; omitted if blank.
   - Follow-Up Indicator:
     - If `followUpRequired === true`: Displays amber badge `⚠️ Follow-up Required` and displays the `followUpNote` inside an amber callout box (`--zen-warning-bg`, `--zen-warning-border`).
     - If `followUpRequired === false`: Displays subtle gray badge `No Follow-up Needed`.
   - Edit Trigger: `Edit Action` button (subtle secondary button, visible only to IT Staff/Admin).
3. **Log / Edit Action Modal Form**:
   - **Modal Header**: `Log New Action Taken` or `Edit Action Taken`.
   - **Action Date/Time Field**: `<input type="datetime-local">`. Defaults to current local date/time. Validated to prevent future dates.
   - **Performer Display**: Non-editable display card: `Performed by: Wichai IT (auto-assigned from your session)`.
   - **Action Description Textarea**: Required, placeholder: *"Describe the physical or remote diagnostic action taken..."*, min 5, max 1,000 characters.
   - **Result Textarea**: Required, placeholder: *"Document the immediate outcome or technical finding..."*, min 2, max 1,000 characters.
   - **Follow-up Required Toggle**: Checkbox or switch control labeled `Follow-up Required?`.
   - **Follow-up Note Textarea**:
     - Dynamically rendered / enabled **only when** `Follow-up Required` is checked.
     - Mandatory when enabled (min 3, max 1,000 characters).
     - Displays error message if submitted empty while toggle is active.
   - **Attachment Notes Input**: Optional text input (max 500 characters), placeholder: *"e.g. Look at photo switch_port_bad.jpg in Attachments"*.
   - **Modal Buttons**: `Save Action Taken` (Primary Green) and `Cancel` (Secondary outline).

---

### 3.5. Ticket Status Workflow Controls & Resolution Gate Feedback

1. **Workflow Action Controls**:
   - Dropdown or button group displaying **only permitted next statuses** according to the transition matrix.
   - Target status options are dynamically filtered based on `currentStatus`.
2. **Resolution Gate Interactive Guard**:
   - When user selects `RESOLVED` or `CLOSED`:
     - If ticket has **zero Actions Taken**: The control displays a clear inline warning alert:
       > ⚠️ **Resolution Blocked**: You must log at least one Action Taken before this ticket can be resolved.
     - The `Confirm Status Change` button is disabled or, if clicked, triggers a visible validation error banner explaining the requirement.
3. **Cancellation Note Modal**:
   - When user selects `CANCELLED`:
     - Opens a confirmation dialog requiring a non-empty cancellation reason ($\ge 5$ characters).
4. **Optimistic Concurrency Conflict Feedback**:
   - If another staff member has transitioned the ticket in the background, a `409 Conflict` modal appears:
     > ⚠️ **Update Conflict**: Another staff member updated this ticket while you were working. Your changes were not applied to avoid overwriting their work. [Reload Ticket]

---

## 4. Responsive Breakpoints & Viewport Rules

The interface must strictly maintain full functional parity and guarantee **zero horizontal scrollbar ($overflow-x: hidden$)** across all responsive viewports:

| Breakpoint Tier | Viewport Width | Dashboard Layout | Actions Taken Layout | Controls & Modals |
| :--- | :--- | :--- | :--- | :--- |
| **Desktop** | $\ge 1200\text{px}$ | 4-column KPI cards; 2-column distribution breakdown; full data table | Full-width table/card list with side-by-side action metadata and edit button | Centered modal ($600\text{px}$ max width) |
| **Tablet** | $768\text{px} - 1024\text{px}$ | 2-column KPI cards; stacked distribution cards; responsive table | Stacked card list with action date and performer in single header line | Centered modal ($520\text{px}$ max width) |
| **Mobile** | $< 768\text{px}$ | 1-column vertically stacked KPI cards; vertically stacked tables | Full-width mobile card layout; action fields stacked vertically; full-width buttons | Full-screen or bottom-sheet modal ($100\%$ width, zero margin) |

---

## 5. Component Feedback States

1. **Loading State**:
   - Dashboard metric cards display smooth pulsing skeleton placeholders while fetching summary metrics.
   - Action table displays a skeleton loading indicator during network retrieval.
2. **Empty State**:
   - Dashboards with 0 tickets display reassuring Zen Green empty banners with icons.
   - Actions Taken section with 0 actions displays: *"No actions recorded yet. IT Staff must log actions taken before resolving this ticket."*
3. **Form-Level Blur Validation Rule (`AGENTS.md` §4)**:
   - Form inputs with invalid formats (e.g. invalid date format) clear/blank out on blur.
   - Field-level validation error messages appear only upon clicking the explicit **Save Action Taken** or **Update Status** button.
4. **Forbidden State (`403 Forbidden`)**:
   - Requesters attempting direct API access to create Actions Taken or view staff dashboards receive safe generic error alerts.

---

## 6. Accessibility & Usability Checklist

* [x] **Color Independence**: Every status and priority badge features a text label and unicode icon in addition to background color.
* [x] **Focus Ring Visibility**: All interactive controls, buttons, toggles, and modal inputs exhibit a 2px solid green focus outline (`--zen-focus-outline`) with halo on keyboard Tab focus.
* [x] **Accessible Tooltips**: All informative tooltips use `data-tooltip` attributes. The native HTML `title` attribute is strictly avoided.
* [x] **Contrast Compliance**: All text and badge color combinations maintain a contrast ratio exceeding 4.5:1 against their backgrounds.
* [x] **ARIA Semantics**:
  - Modals use `role="dialog"`, `aria-modal="true"`, and `aria-labelledby`.
  - Conditional follow-up input uses `aria-describedby` and `aria-required="true"`.
  - Error messages use `role="alert"`.
* [x] **Zero Horizontal Scroll**: Viewport containers enforce `overflow-x: hidden` with fluid grid wrapping down to $320\text{px}$ device width.

