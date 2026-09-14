# TokTickIT Sprint 3 (Lab 3) — UI Specification & Style Contract

**Document Title**: Sprint 3 User Interface & Style Specification  
**Document ID**: UI-SPEC-LAB-03  
**Version**: 1.0 (Approved Baseline)  
**Status**: Ready for Implementation  
**Theme**: KMUTT IT Service Desk "Zen Green" Design System  
**Traceability Reference**: [Lab_3_sheet.pdf](../reference/Lab_3_sheet.pdf) (§7, §8, §14), [specification.md](./specification.md)  
**Approved Decisions**: DR-01 through DR-25 (incorporating Lab 2 baselines + Sprint 3 extensions)

---

## 1. Design Tokens & CSS Variables

All custom components, cards, tables, badges, and buttons must consume these standardized CSS custom properties. Page-local hardcoded hex colors or generic Bootstrap color classes for brand elements are prohibited.

```css
:root {
  /* Brand Zen Green Palette (Labsheet §7) */
  --zen-primary-green:      #006B3C; /* App header, primary CTA, active emphasis */
  --zen-secondary-green:    #0B7A46; /* Active tabs, hover states, focus accents, links */
  --zen-pale-green:         #EAF6EF; /* Selected cards, table row hover, subtle surfaces */
  --zen-page-bg:            #F5F7F6; /* Application background canvas */
  --zen-surface:            #FFFFFF; /* Card, panel, and modal surface */
  
  /* Typography & Text */
  --zen-font-family:        system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  --zen-font-size-base:     16px;    /* DR-01: Base body scale (1.0rem) */
  --zen-font-size-label:    16px;    /* DR-06: Form label font size */
  --zen-font-size-error:    13px;    /* DR-13: Validation error font size */
  --zen-text-primary:       #1C2826; /* Dark charcoal-green text (never pure #000) */
  --zen-text-muted:         #5B6573; /* Secondary metadata, timestamps, helper copy */
  
  /* Borders & Controls */
  --zen-border-neutral:     #D1D5DB; /* Standard field and card border */
  --zen-border-radius:      6px;     /* DR-05: Standard control radius (rounded-2) */
  --zen-control-height:     40px;    /* DR-05: Uniform single-line input height */
  --zen-field-readonly-bg:  #F0F4F1; /* Soft gray-green shading for read-only fields */
  
  /* Focus & Accessibility */
  --zen-focus-ring-color:   #0B7A46; /* Focus outline color */
  --zen-focus-halo:         0 0 0 3px rgba(11, 122, 70, 0.20); /* Focus halo */
  --zen-focus-outline:      2px solid var(--zen-focus-ring-color); /* A11y focus ring */
  
  /* Feedback Colors */
  --zen-error:              #B3261E; /* Dark red text and invalid border */
  --zen-error-bg:           #FDF2F2; /* Error banner background */
  --zen-error-glow:         0 0 0 3px rgba(179, 38, 30, 0.15); /* Invalid field focus */
  --zen-warning:            #D97706; /* Amber callouts and badges */
  --zen-warning-bg:         #FFFBEB; /* Amber background for Internal Notes */
  --zen-warning-border:     #F59E0B; /* Amber border for Internal Notes */
  --zen-success:            #2E7D32; /* Green confirmation icon and text */
  --zen-success-bg:         #EDF7ED; /* Green success alert background */
  
  /* Internal Note Security Tokens (Sprint 3 Extension) */
  --zen-note-bg:            #FFFBEB; /* High-contrast amber background */
  --zen-note-border:        #F59E0B; /* Solid amber border */
  --zen-note-badge-bg:      #FEF3C7; /* Badge background */
  --zen-note-badge-text:    #92400E; /* Deep amber text */
  
  /* Dimensions & Spacing */
  --zen-field-spacing:      20px;    /* Vertical margin between form fields */
  --zen-card-padding:       24px;    /* Desktop card internal padding */
  --zen-container-max-w:    1320px;  /* Desktop container max width */
}
```

---

## 2. Typography, Badges & Button Hierarchies

### 2.1. Typography
* **Font Family**: Standard system font stack (`system-ui, -apple-system, sans-serif`).
* **Page Headings (`h1`)**: `1.75rem` (`28px`), `font-weight: 700`, color `var(--zen-text-primary)`.
* **Section Headings (`h2`)**: `1.375rem` (`22px`), `font-weight: 600`, color `var(--zen-primary-green)`.
* **Card Subheadings (`h3`)**: `1.125rem` (`18px`), `font-weight: 600`, color `var(--zen-text-primary)`.
* **Form Labels**: Placed strictly above input controls, `16px`, `font-weight: 600`. Required inputs display `<span class="text-danger ms-1" aria-hidden="true">*</span>`.
* **Validation Error Text**: `13px`, `font-weight: 500`, color `var(--zen-error)`.

### 2.2. Badges (Never Color Alone)
Every badge combines a distinct background tint, border, explicit label text, and an accessible icon/symbol:

#### 1. Status Badges
| Status | Background | Text Color | Border | Visual Symbol |
| :--- | :--- | :--- | :--- | :---: |
| `NEW` | `#EAF6EF` | `#006B3C` | `1px solid #C4E5D2` | 🟢 New |
| `OPEN` | `#E0F2FE` | `#0369A1` | `1px solid #BAE6FD` | 🔵 Open |
| `IN_PROGRESS` | `#FEF3C7` | `#92400E` | `1px solid #FDE68A` | 🟡 In Progress |
| `WAITING_FOR_REQUESTER` | `#F3E8FF` | `#6B21A8` | `1px solid #E9D5FF` | 🟣 Awaiting User |
| `RESOLVED` | `#DCFCE7` | `#15803D` | `1px solid #BBF7D0` | 🟢 Resolved |
| `CLOSED` | `#F3F4F6` | `#374151` | `1px solid #E5E7EB` | ⚫ Closed |
| `REOPENED` | `#FFEDD5` | `#C2410C` | `1px solid #FED7AA` | 🟠 Reopened |
| `CANCELLED` | `#FEE2E2` | `#991B1B` | `1px solid #FECACA` | 🔴 Cancelled |

#### 2. Priority Badges (Requested Priority & IT Priority)
| Priority | Background | Text Color | Border | Visual Symbol |
| :--- | :--- | :--- | :--- | :---: |
| `LOW` | `#F3F4F6` | `#374151` | `1px solid #E5E7EB` | 🔽 Low |
| `MEDIUM` | `#DBEAFE` | `#1E40AF` | `1px solid #BFDBFE` | 🔹 Medium |
| `HIGH` | `#FEF3C7` | `#92400E` | `1px solid #FDE68A` | ⚠️ High |
| `URGENT` | `#FEE2E2` | `#991B1B` | `1px solid #FECACA` | 🚨 Urgent |

#### 3. Role Badges
| Role | Background | Text Color | Border | Label |
| :--- | :--- | :--- | :--- | :--- |
| `REQUESTER` | `#EAF6EF` | `#006B3C` | `1px solid #C4E5D2` | Requester |
| `IT_STAFF` | `#E0F2FE` | `#0369A1` | `1px solid #BAE6FD` | IT Staff |
| `ADMINISTRATOR` | `#F3E8FF` | `#6B21A8` | `1px solid #E9D5FF` | Administrator |

#### 4. Account Activation Badges
* `Active`: Background `#DCFCE7`, text `#15803D`, border `1px solid #BBF7D0`.
* `Inactive`: Background `#FEE2E2`, text `#991B1B`, border `1px solid #FECACA`.

### 2.3. Button Hierarchies
* **Primary Action (`.btn-zen-primary`)**:
  - Background `var(--zen-primary-green)` (`#006B3C`), text `#FFFFFF`, radius `6px`, font-weight `600`, min-height `40px` (`48px` on mobile).
  - Hover: Background `var(--zen-secondary-green)` (`#0B7A46`), subtle lift `translateY(-1px)`.
  - Disabled/Submitting: Background `#8EAA9A`, cursor `not-allowed`, inline animated spinner.
* **Secondary / Outline Action (`.btn-zen-outline`)**:
  - Background transparent, border `1px solid var(--zen-border-neutral)`, text `var(--zen-text-primary)`.
  - Hover: Background `var(--zen-pale-green)`, border `var(--zen-secondary-green)`.
* **Destructive Action (`.btn-zen-danger`)**:
  - Background `var(--zen-error)` (`#B3261E`), text `#FFFFFF`.
* **Quick Operational Shortcuts**:
  - `Claim Ticket` Button: Compact primary green button with person-check icon.
  - `Problem Appears Resolved` Button: Soft green outline button with checkmark icon.

---

## 3. Wireframes & Layout Specifications

### 3.1. Application Shell & Global Header
```
+---------------------------------------------------------------------------------------------------------+
| [TokTickIT Logo]   TokTickIT Desk   |  My Tickets  |  Create Ticket  |  Staff Queue  |  User Admin      |
|                                                                        [John Doe (IT Staff) v] [Logout] |
+---------------------------------------------------------------------------------------------------------+
```
* Replaces the Lab 2 simulated requester selector with authenticated user name and role badge.
* Role-specific navigation rules:
  - **Requester**: "My Tickets", "Create Ticket".
  - **IT Staff**: "Staff Queue", "Create Ticket", "My Tickets".
  - **Administrator**: "User Admin", "Staff Queue", "My Tickets".
* Profile dropdown displays full name, email, role badge, and explicit "Logout" action.

---

### 3.2. Screen 1: Login View (`/login`)
```
+-------------------------------------------------------+
|                    [TokTickIT Logo]                   |
|              Sign in to TokTickIT Desk                |
|                                                       |
|  [ Alert: Invalid email or password (if error) ]      |
|                                                       |
|  Email Address *                                      |
|  [ user@kmutt.ac.th                                 ] |
|                                                       |
|  Password *                                           |
|  [ ******************                              ]  |
|                                                       |
|  [   Sign In (with spinner when busy)               ] |
+-------------------------------------------------------+
```
* Centered card layout (`max-width: 440px`), margin top `80px`.
* Email input with autofocus, trim on blur, lowercase normalization.
* Password input with masked bullets.
* Generic error alert box (`--zen-error-bg`) if credentials fail or account is inactive (`BR-01`).
* Submitting state disables inputs and shows animated spinner inside primary button.

---

### 3.3. Screen 2: Mandatory First-Login Password Change View (`/change-password`)
```
+-------------------------------------------------------+
|                    [TokTickIT Logo]                   |
|                Change Your Initial Password           |
|  For your security, you must update your password     |
|  before accessing the IT Service Desk.                |
|                                                       |
|  Current Password *                                   |
|  [ ******************                              ]  |
|                                                       |
|  New Password *                                       |
|  [ ******************                              ]  |
|                                                       |
|  Password Requirements:                               |
|  [v] At least 8 characters long                       |
|  [v] Contains an uppercase letter (A-Z)               |
|  [v] Contains a lowercase letter (a-z)                |
|  [v] Contains a numeric digit (0-9)                   |
|  [v] Contains a special symbol (!@#$%^&*...)          |
|                                                       |
|  Confirm New Password *                               |
|  [ ******************                              ]  |
|  [ Inline error: Passwords do not match (if any)   ]  |
|                                                       |
|  [   Update Password & Enter Application            ] |
+-------------------------------------------------------+
```
* Intercepts access when `mustChangePassword === true`.
* Interactive live requirements checklist (turns green checkmark as each criterion is satisfied).
* Confirmation mismatch validated on blur and submit.
* Upon success, updates password, sets `mustChangePassword = false`, and transitions into normal app view.

---

### 3.4. Screen 3: IT Staff Ticket Queue (`/staff/tickets`)
```
+---------------------------------------------------------------------------------------------------------+
| IT Staff Ticket Queue                                                       Total Tickets: 42           |
+---------------------------------------------------------------------------------------------------------+
| [ Search ticket number or summary...              ] [ Status: All v ] [ Category: All v ]               |
| [ IT Priority: All v ] [ Owner: All v ]                               [ Reset Filters ]                 |
+---------------------------------------------------------------------------------------------------------+
| Ticket No    | Created    | Summary               | Category | Req. Prio | IT Prio  | Status | Owner    |
+--------------+------------+-----------------------+----------+-----------+----------+--------+----------+
| TKT-2026-0001| 2026-09-03 | Wi-Fi disconnects...  | Network  | [HIGH]    | [URGENT] | [OPEN] | Wichai I.|
| TKT-2026-0002| 2026-09-03 | Projector in CB2301...| Hardware | [MEDIUM]  | [MEDIUM] | [NEW]  | Unassigned|
| ...          | ...        | ...                   | ...      | ...       | ...      | ...    | ...      |
+---------------------------------------------------------------------------------------------------------+
| Showing 1 to 10 of 42 tickets                     Rows per page: [10 v]  < Prev [1] [2] [3] Next >      |
+---------------------------------------------------------------------------------------------------------+
```
* Multi-control filter toolbar with instant response and clear-all button.
* Column headers with clickable sorting indicators (Created Date, Ticket No, Summary, IT Priority, Status).
* Row hover effect (`--zen-pale-green`) and row click navigation to Ticket Detail.
* Desktop table collapses gracefully into stacked Zen Green cards on mobile (`< 768px`) with zero horizontal overflow.
* Feedback states: Loading skeleton rows (`.zen-skeleton`), empty queue state, no-results filter state with reset CTA.

---

### 3.5. Screen 4: IT Staff Ticket Detail (`/staff/tickets/:id`)
```
+---------------------------------------------------------------------------------------------------------+
| < Back to Staff Queue      Ticket: TKT-2026-00001                   Status: [OPEN]   IT Priority: [HIGH]|
+---------------------------------------------------------------------------------------------------------+
| [LEFT COLUMN: Ticket Information]                | [RIGHT COLUMN: Operational Management]               |
|                                                  |                                                      |
| Requester Information                            | Ticket Ownership                                     |
| Name: Sompong IT (Computer Engineering)          | Current Owner: [ Wichai IT                     v ]   |
| Email: sompong.it@kmutt.ac.th                    | [ Claim Ticket (Assign to Me) ]                      |
|                                                  |                                                      |
| Category: Network     System: Campus Wi-Fi       | IT Priority                                          |
| Requested Priority: [HIGH]                       | [ High                                         v ]   |
| Created: 2026-09-03 10:14                        |                                                      |
|                                                  | Ticket Status Workflow                               |
| Summary                                          | Current: OPEN                                        |
| Wi-Fi disconnects frequently in CB2              | Next Status: [ In Progress                     v ]   |
|                                                  | [ Update Status ]                                    |
| Description                                      |                                                      |
| (Full detailed description text...)              | Attachments (2)                                      |
|                                                  | [icon] wifi_log.pdf (1.2 MB) [Download]              |
| Requester Resolution Indication:                 |                                                      |
| [*] Requester indicated problem appears resolved |                                                      |
|     on 2026-09-04 14:20                          |                                                      |
+--------------------------------------------------+------------------------------------------------------+
| [BOTTOM SECTION: Collaboration Threads]                                                                 |
|                                                                                                         |
| === PUBLIC COMMENTS (Visible to Requester & Staff) ==================================================== |
| +-----------------------------------------------------------------------------------------------------+ |
| | Sompong IT (Requester) - 2026-09-03 11:00                                                           | |
| | The Wi-Fi dropped again during my 10 AM lecture.                                                    | |
| +-----------------------------------------------------------------------------------------------------+ |
| | Wichai IT (IT Staff) - 2026-09-03 13:30                                                             | |
| | Access point CB2-AP-04 has been rebooted. Please check if signal stabilizes.                        | |
| +-----------------------------------------------------------------------------------------------------+ |
| [ Add Public Comment...                                                                             ] |
| [ Post Public Comment ]                                                                                 |
|                                                                                                         |
| === INTERNAL NOTES (STRICTLY CONFIDENTIAL - IT STAFF ONLY) ============================================ |
| +-----------------------------------------------------------------------------------------------------+ |
| | [LOCK ICON] Wichai IT (IT Staff) - 2026-09-03 13:15                     *CONFIDENTIAL INTERNAL NOTE*| |
| | Network switch firmware on 3rd floor rack needs patch. Scheduled maintenance window Friday 10 PM.   | |
| +-----------------------------------------------------------------------------------------------------+ |
| [ Add Private Internal Note (never visible to requester)...                                         ] |
| [ Post Internal Note ]                                                                                  |
+---------------------------------------------------------------------------------------------------------+
```
* **Visual Differentiation between Comments and Notes**:
  - **Public Comments**: Standard Zen Pale Green border (`#C4E5D2`), white surface, requester/staff author badge.
  - **Internal Notes**: High-contrast **Amber styling** (`var(--zen-note-bg): #FFFBEB`, border `2px solid #F59E0B`), prominent **Lock Icon** (🔒), and header banner stating: *"STRICTLY CONFIDENTIAL — IT STAFF ONLY"*.
* Operational controls allow 1-click "Claim Ticket" shortcut or assigning to any active staff member.
* Status workflow dropdown restricts choices strictly to permitted targets per the transition matrix.
* Attachments list with secure binary download.

---

### 3.6. Screen 5: Requester Ticket Detail Update (`/tickets/:id`)
* Continues the read-only presentation of core ticket fields and attachments from Lab 2.
* **Adds**:
  - Public Comments thread allowing the Requester to read comments from IT Staff and append new comments.
  - **"Problem Appears Resolved"** action button:
    - Displayed when ticket is in active status and not yet marked resolved by user.
    - Prompts for confirmation: *"Indicate that this problem appears resolved? (This notifies IT Staff but does not immediately close the ticket)."*
    - Once clicked, transforms into a confirmed green alert badge: *"You indicated this problem appears resolved on [Timestamp]."*
* **Excludes**:
  - Internal Notes thread is **completely absent** from the DOM and never requested over the API.
  - Operational assignment, IT Priority, and status transition dropdowns are hidden.

---

### 3.7. Screen 6: Administrator User Management (`/admin/users`)
```
+---------------------------------------------------------------------------------------------------------+
| Administrator User Management                                              [ + Create New User ]        |
+---------------------------------------------------------------------------------------------------------+
| [ Search users by name or email...                ] [ Role Filter: All v ]                              |
+---------------------------------------------------------------------------------------------------------+
| Full Name           | Email Address               | Role          | Status      | Actions               |
+---------------------+-----------------------------+---------------+-------------+-----------------------+
| Admin TokTick       | admin.toktick@kmutt.ac.th   | [ADMIN]       | [Active]    | [ Edit ] [ Reset Pwd ]|
| Wichai IT           | wichai.it@kmutt.ac.th       | [IT STAFF]    | [Active]    | [ Edit ] [ Reset Pwd ]|
| Sompong IT          | sompong.it@kmutt.ac.th      | [REQUESTER]   | [Active]    | [ Edit ] [ Reset Pwd ]|
| Prasert Inactive    | prasert.in@kmutt.ac.th      | [REQUESTER]   | [Inactive]  | [ Edit ] [ Reset Pwd ]|
+---------------------------------------------------------------------------------------------------------+
```

#### Create User Slideout / Modal:
* Fields: Full Name, Email Address, Role selector (`Requester`, `IT Staff`, `Administrator`), Active toggle (default `true`), Initial Password field.
* Validation: All fields required; valid email format; password complexity rules; duplicate email check.
* Notice: Explains that `mustChangePassword = true` is automatically applied.

#### Edit User Slideout / Modal:
* Fields: Full Name, Email Address, Role selector, Active toggle (`Active` / `Inactive`).
* Action: "Save Changes" and "Deactivate Account" button.
* **Safety Guards**:
  - If the logged-in Administrator edits their own row, the Active toggle is disabled with helper text: *"You cannot deactivate your own administrative account (BR-11)."*
  - If the user is the sole active Administrator in the system, the Active toggle and Role dropdown are disabled with helper text: *"Cannot deactivate or demote the system's last active Administrator (BR-12)."*

#### Reset Initial Password Modal:
* Triggered via "Reset Pwd" action on user row.
* Field: New Initial Password.
* Notice: *"The user will be required to change this password on their next login."*

---

## 4. Responsive Breakpoints & Viewport Adaptations

| Breakpoint Range | Device Target | Layout Adaptations |
| :--- | :--- | :--- |
| **Desktop** ($\ge 1200\text{px}$) | Large monitors, laptops | Multi-column layouts; full data tables with all columns; side-by-side Ticket Detail panels; sticky filter toolbars; max-width `1320px`. |
| **Tablet** ($768\text{px} - 1024\text{px}$) | iPads, tablets | 2-column stacked layout; data tables with horizontal scroll overflow container; collapsible filter bar; modal dialogs centered with 80% viewport width. |
| **Mobile** ($< 768\text{px}$) | Smartphones | Single-column linear layout; tables collapse into stacked Zen Green cards; full-screen modal overlays; minimum `48px` tap targets; offcanvas hamburger navigation drawer; **strictly zero horizontal page scroll**. |

### Mobile Card Structure for Ticket Queue:
```
+-------------------------------------------------------+
| TKT-2026-00001                                [OPEN]  |
| Wi-Fi disconnects frequently in CB2                   |
| Category: Network          IT Priority: [URGENT]      |
| Owner: Wichai IT           Date: 2026-09-03           |
|                                                       |
| [ View Ticket Details > ]                             |
+-------------------------------------------------------+
```

---

## 5. Interaction & Validation Rules

1. **Blur Validation Rule (`AGENTS.md` §4, `BR-10`)**:
   - As the user types or leaves a field (`blur`), invalid formats (e.g., malformed email) clear/blank out to maintain neat input state.
   - Premature red validation error alerts do **not** fire during general field typing.
   - Form-level error messages only render upon clicking the explicit Save/Submit button.
2. **Accessible Tooltips (`data-tooltip`)**:
   - The native HTML `title` attribute is prohibited on interactive elements. Custom accessible tooltips using `data-tooltip` must be utilized.
3. **Interactive Loading Shimmers**:
   - Data-fetching tables and detail panels render `.zen-skeleton` pulsing shimmer placeholders instead of jarring layout shifts.
4. **Button Submitting Feedback**:
   - Buttons enter a disabled submitting state with an animated SVG spinner and adjusted label (e.g., "Signing In...", "Saving...", "Updating...").
