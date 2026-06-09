# PI-308 Production Test Results App

A browser-based production test reporting application for replacing the existing Excel-based PI-308 test report spreadsheet.

The current process uses an Excel workbook with three tabs to record production build and test information. This project converts that workflow into a web app so production staff can complete test reports through a browser and save the results directly to a controlled storage location.

## Project Purpose

The aim of this project is to provide a simple, controlled and reliable method for production staff to complete PI-308 test reports electronically during product builds.

Instead of completing an Excel spreadsheet manually and saving or copying files afterwards, users will open a web page, enter the required information, and press **Save**. The completed test record will then be stored automatically in the correct location.

## Key Requirements

* Browser-based application
* No local software installation required on production computers
* Replaces the existing Excel spreadsheet workflow
* Supports the three existing spreadsheet tabs as separate app sections or pages
* Allows production staff to enter build and test information
* Saves completed test records automatically
* Stores results in a controlled location, ideally on the company NAS
* Reduces manual file handling and copy/paste errors
* Provides a more consistent production reporting process

## Current Process

The existing PI-308 process is based on an Excel workbook containing three tabs.

Production or engineering staff currently enter test information into the spreadsheet and save the results electronically. This works, but it relies on manual file management and is not ideal for controlled production use.

## Proposed Web App Workflow

```text
Production staff member
        ↓
Opens web app in browser
        ↓
Completes PI-308 test report
        ↓
Presses Save
        ↓
Web app submits data securely
        ↓
Result is stored automatically
        ↓
File/report is available from the controlled NAS location
```

## Proposed System Architecture

```text
Browser Frontend
        ↓ HTTPS
Backend API
        ↓
Restricted storage location / NAS folder
```

The browser should not write directly to the NAS. Instead, the frontend should submit the test data to a backend service. The backend service will then handle validation, formatting, file creation and storage.

## Main Features

### 1. Digital Test Report Form

The app will convert the existing Excel workbook into a structured digital form.

Each of the three spreadsheet tabs may become:

* a separate page
* a separate section
* a step in a multi-page form

### 2. Browser-Only Access

Production users should not need to install any additional software.

The app should run through a standard browser such as Chrome, Edge or Firefox.

### 3. Controlled Data Entry

The form should use appropriate field types to reduce input errors, such as:

* text fields
* dropdown lists
* date fields
* number fields
* pass/fail selectors
* operator name fields
* product/build references
* comments and notes fields

### 4. Automatic Saving

When the user presses **Save**, the app should automatically store the completed report.

Possible output formats:

* JSON
* CSV
* PDF
* Excel-compatible file
* database record

The final format will depend on the production and IT requirements.

### 5. NAS Storage

The preferred storage location is a controlled folder on the company NAS.

The NAS folder should not be exposed directly to the internet. Instead, a secure backend service should write the data to the required NAS location.

Suggested IT approach:

```text
Web app/API endpoint
        ↓
Service account with restricted permissions
        ↓
Specific NAS production test results folder
```

The service account should only have access to the required folder.

### 6. Security Considerations

The final deployment should consider:

* user authentication
* HTTPS
* firewall restrictions
* IP restrictions
* restricted NAS folder permissions
* service account access
* audit logging
* input validation
* backup and recovery
* protection against accidental overwriting

## Suggested Folder Structure

```text
pi-308-production-test-app/
│
├── README.md
├── package.json
├── .gitignore
│
├── src/
│   ├── frontend/
│   │   ├── index.html
│   │   ├── styles/
│   │   ├── scripts/
│   │   └── pages/
│   │
│   ├── backend/
│   │   ├── server.js
│   │   ├── routes/
│   │   ├── services/
│   │   └── storage/
│   │
│   └── shared/
│       └── validation/
│
├── docs/
│   ├── original-excel-workflow.md
│   ├── form-field-mapping.md
│   └── deployment-notes.md
│
└── test-results/
    └── example-output/
```

## Development Notes

The first development stage should focus on accurately converting the existing Excel workbook into a working web form.

Recommended first steps:

1. Review the three Excel tabs
2. List every required field
3. Group fields into logical sections
4. Decide which fields are mandatory
5. Define the output format
6. Build the browser form
7. Add validation
8. Add save/export functionality
9. Connect the backend to the final storage location

## Initial Milestones

### Milestone 1: Spreadsheet Mapping

* Review all three Excel tabs
* Identify all form fields
* Identify calculated fields
* Identify required fields
* Identify pass/fail criteria
* Create a field mapping document

### Milestone 2: Frontend Prototype

* Build the basic browser interface
* Create three form sections/pages
* Add basic field validation
* Add a save button
* Generate a local test output file

### Milestone 3: Backend Save Function

* Create backend API endpoint
* Receive submitted test data
* Validate submitted data
* Generate output file or record
* Save result to a controlled folder

### Milestone 4: NAS Integration

* Confirm IT-approved storage method
* Configure restricted NAS folder access
* Configure backend service permissions
* Test saving reports to the NAS
* Confirm file naming and folder structure

### Milestone 5: Production Testing

* Trial with sample production reports
* Check usability with production staff
* Confirm saved data is complete and accurate
* Confirm report retrieval process
* Finalise deployment method

## Possible Technology Stack

The final technology stack is not fixed yet.

Possible options:

### Frontend

* HTML
* CSS
* JavaScript
* React
* Vue
* Svelte

### Backend

* Node.js / Express
* Python / Flask
* Python / FastAPI
* .NET

### Storage

* NAS folder
* JSON files
* CSV files
* PDF reports
* SQL database
* Excel-compatible exports

## Example Save Data Structure

```json
{
  "reportId": "PI-308-0001",
  "product": "",
  "serialNumber": "",
  "operator": "",
  "date": "",
  "buildReference": "",
  "testResults": {
    "section1": {},
    "section2": {},
    "section3": {}
  },
  "overallResult": "",
  "comments": ""
}
```

## Open Questions

* What final output format is required?
* Should completed reports be saved as PDF, Excel, JSON, CSV or database records?
* Does the report need approval/sign-off?
* Should users log in before submitting reports?
* Should reports be editable after saving?
* Should the system generate report numbers automatically?
* Should the app support searching previous results?
* Should the app produce printable reports?
* What NAS folder should the results be saved to?
* What access method will IT approve for NAS storage?
* Should the app be hosted internally or externally?

## Deployment Requirements

The production deployment should allow users to access the application using only a browser.

Example:

```text
https://production-results.companyname.co.uk
```

Users should be able to:

1. Open the web app
2. Complete the PI-308 report
3. Press Save
4. Receive confirmation that the report has been stored

## Status

Initial development stage.

The existing Excel spreadsheet workflow is being reviewed and converted into a browser-based production reporting application.

## Author

Hamed Adefuwa
Electrical Engineering Product Manager
