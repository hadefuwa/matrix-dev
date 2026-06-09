Here’s a practical development plan you can follow from Excel spreadsheet to working web app.

# PI-308 Production Test Results App Development Plan

## 1. Project Goal

Convert the existing PI-308 Excel spreadsheet into a browser-based production test results app.

Production staff should be able to:

* open the app in a web browser
* complete the required production/test report fields
* press Save
* have the result stored automatically in the correct controlled location
* avoid manually copying files to the NAS

## 2. Recommended App Structure

The app should be split into three main layers:

```text
Browser Frontend
        ↓
Backend API
        ↓
Storage / NAS / Database / File Output
```

The browser should handle the form interface.
The backend should handle saving, validation, file creation and NAS access.

## 3. Development Phases

## Phase 1: Spreadsheet Review and Field Mapping

### Objective

Understand the existing Excel workbook fully before writing too much code.

### Tasks

* Review all three Excel tabs
* List every field from each tab
* Identify which fields are user-entered
* Identify which fields are calculated
* Identify which fields are fixed labels/headings
* Identify pass/fail criteria
* Identify mandatory fields
* Identify dropdown fields
* Identify signature/approval fields if any
* Identify any duplicated data between tabs

### Output

Create a document called:

```text
docs/form-field-mapping.md
```

Suggested table format:

```text
Excel Tab | Field Name | Type | Required | App Section | Notes
```

## Phase 2: Define the Data Model

### Objective

Create the structure the app will use internally to store one completed PI-308 report.

### Tasks

* Decide the main report fields
* Define the three tab structures as sections
* Decide how test results should be grouped
* Decide how pass/fail results are stored
* Decide how comments and notes are stored
* Decide how report IDs are generated
* Decide how timestamps are handled

### Example Structure

```json
{
  "reportId": "PI-308-0001",
  "createdAt": "2026-06-09T10:30:00Z",
  "operator": "",
  "product": "",
  "serialNumber": "",
  "buildReference": "",
  "sections": {
    "tab1": {},
    "tab2": {},
    "tab3": {}
  },
  "overallResult": "",
  "comments": ""
}
```

### Output

Create:

```text
src/shared/pi308Schema.js
```

or, if using TypeScript:

```text
src/shared/pi308Schema.ts
```

## Phase 3: Choose the Technology Stack

### Recommended Simple Stack

For a small internal production app, I would use:

```text
Frontend: React or plain HTML/CSS/JavaScript
Backend: Node.js with Express
Storage: JSON/CSV/PDF/Excel output to controlled folder
```

### My recommended starting stack

```text
Vite + React frontend
Node.js + Express backend
File output first
NAS integration later
```

This keeps the first version simple but still allows proper backend saving later.

## Phase 4: Create the Basic Project

### Objective

Set up the initial GitHub project structure.

### Suggested Folder Structure

```text
pi-308-production-test-app/
│
├── README.md
├── package.json
├── .gitignore
│
├── docs/
│   ├── form-field-mapping.md
│   ├── deployment-notes.md
│   └── test-plan.md
│
├── frontend/
│   ├── index.html
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   ├── components/
│   │   ├── pages/
│   │   └── styles/
│
├── backend/
│   ├── server.js
│   ├── routes/
│   ├── services/
│   ├── storage/
│   └── output/
│
└── shared/
    └── pi308Schema.js
```

## Phase 5: Build the Frontend Prototype

### Objective

Create a working browser form that visually represents the three Excel tabs.

### Tasks

* Create the main app layout
* Create three form sections/pages
* Add navigation between sections
* Add text fields
* Add dropdowns
* Add checkboxes/pass-fail selectors
* Add comments fields
* Add Save Draft button
* Add Submit/Save Final button
* Add basic field validation
* Add confirmation message after saving

### Suggested UI Layout

```text
Header
- PI-308 Production Test Report
- Report ID
- Operator
- Date

Navigation
- Section 1
- Section 2
- Section 3
- Review & Save

Main Area
- Form fields

Footer
- Save Draft
- Save Final
```

## Phase 6: Add Local Validation

### Objective

Prevent incomplete or obviously incorrect reports being submitted.

### Tasks

* Mark required fields
* Validate serial number format if needed
* Validate date fields
* Validate numerical ranges
* Ensure pass/fail fields are completed
* Warn user before submitting incomplete forms
* Highlight missing fields

### Example Validation Rules

```text
Operator name required
Serial number required
Date required
All mandatory test results completed
Overall pass/fail result required
```

## Phase 7: Build the Backend API

### Objective

Allow the frontend to submit completed report data to the server.

### Required Endpoints

```text
GET  /api/health
POST /api/reports/save-draft
POST /api/reports/submit
GET  /api/reports/:reportId
```

### Backend Responsibilities

* receive form data
* validate the data again server-side
* generate report ID
* generate timestamp
* save the result
* return success/failure response
* prevent overwriting existing reports accidentally

## Phase 8: Add File Output

### Objective

Generate a useful stored report from the submitted data.

### Start simple

First version should save as:

```text
JSON
```

Then add one or more production-friendly formats:

```text
CSV
PDF
Excel-compatible .xlsx
```

### Recommended Output Strategy

For development:

```text
Save JSON first
```

For production:

```text
Save PDF or Excel-compatible report
Also save raw JSON for traceability
```

### Suggested File Naming

```text
PI-308_[SerialNumber]_[YYYY-MM-DD]_[ReportID].json
```

Example:

```text
PI-308_SN12345_2026-06-09_PI-308-0001.json
```

## Phase 9: Add Review Page

### Objective

Let the operator check the report before final submission.

### Tasks

* Show all entered data in a summary page
* Highlight missing fields
* Show calculated overall result
* Allow user to go back and edit
* Add final submit button
* Show final confirmation after saving

## Phase 10: Add Storage Integration

### Objective

Move from local development output to controlled company storage.

### Possible Storage Routes

```text
Option 1: Backend writes to local server folder
Option 2: Backend writes to NAS mapped folder
Option 3: Backend writes to NAS UNC path
Option 4: Backend writes to secure upload location provided by IT
Option 5: Backend writes to database, then exports reports
```

### Preferred Architecture

```text
Browser
  ↓ HTTPS
Backend API
  ↓ restricted service account
NAS folder
```

### IT Requirements

Ask IT/Halifax Computers for:

* secure hosting location for the web app
* HTTPS access
* authentication method
* restricted NAS folder
* service account for the backend
* permission to write only to the required folder
* backup policy
* firewall/IP restrictions
* test environment before production release

## Phase 11: Add Authentication

### Objective

Only approved users should be able to submit reports.

### Options

```text
Simple password protection
Microsoft 365 login
Windows/domain authentication
IT-managed login
```

For production use, IT-managed authentication is preferred.

## Phase 12: Add Report History/Search

### Objective

Allow previous reports to be found easily.

### Minimum Features

* search by serial number
* search by report ID
* search by date
* search by operator
* filter by pass/fail

This can be added after the first working save system.

## Phase 13: Testing

### Functional Testing

* Can open the app in browser
* Can complete all sections
* Can save draft
* Can submit final report
* Missing fields are caught
* Saved file contains correct data
* File name is correct
* Existing reports are not overwritten
* Error message appears if save fails

### Production Testing

* Test with actual production staff
* Test with real PI-308 examples
* Compare app output against original Excel process
* Confirm all required data is captured
* Confirm reports are stored correctly
* Confirm reports can be retrieved later

### Security Testing

* Confirm users cannot access other NAS folders
* Confirm unauthorised users cannot submit reports
* Confirm HTTPS is used
* Confirm invalid data is rejected
* Confirm backend does not expose file paths

## Phase 14: Deployment

### Deployment Goal

Production staff use only a browser.

Example:

```text
https://production-results.companyname.co.uk
```

### Deployment Tasks

* build frontend
* host frontend and backend
* configure environment variables
* configure storage path
* configure service account
* enable HTTPS
* test on production PCs
* confirm firewall rules
* document backup process
* hand over basic user instructions

## Phase 15: Documentation

Create these documents:

```text
README.md
docs/form-field-mapping.md
docs/deployment-notes.md
docs/user-guide.md
docs/test-plan.md
docs/change-log.md
```

## Suggested Development Order

### Version 0.1

* basic frontend
* three sections matching Excel tabs
* manual Save button
* local JSON export

### Version 0.2

* backend API
* server-side saving
* basic validation
* report ID generation

### Version 0.3

* PDF or Excel output
* review page
* improved layout

### Version 0.4

* NAS save path
* restricted permissions
* error handling
* production-style file naming

### Version 1.0

* authentication
* production deployment
* tested with real users
* documentation complete

## Initial To-Do List

1. Upload or review the original Excel workbook
2. Map all fields from the three tabs
3. Decide on the exact output format
4. Create the frontend form structure
5. Create the backend save endpoint
6. Save first test report as JSON
7. Add validation
8. Add report preview page
9. Add PDF or Excel export
10. Work with IT on NAS-backed storage
11. Test with production staff
12. Deploy first production version

## Important Design Decision

Do not make the browser write directly to the NAS.

Use this:

```text
Browser → Backend API → NAS
```

Not this:

```text
Browser → NAS
```

This keeps the system more secure, easier to control, and more realistic for production use.
