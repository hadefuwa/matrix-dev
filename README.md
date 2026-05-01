# Matrix Apps — matrix-dev

Central hub for Matrix TSL internal web applications. All apps are served from a single Node.js service under `matrixtsl.dev`, with a shared dashboard as the entry point.

**Live:** [matrixtsl.dev](https://matrixtsl.dev)

---

## Apps

| App | Route | Description |
|-----|-------|-------------|
| Dashboard | `/` | Matrix Apps home page (served from `dashboard/index.html`) |
| Scheme of Work Generator | `/sow-generator` | Build and review Scheme of Work content |
| SCORM Example Builder | `/scorm-example` | Build SCORM package examples and related outputs |
| SF2 Portal | `/sf2-portal/` | Static SF2 portal app |
| IM Portal | `/im-portal/` | Static IM portal app |

---

## Architecture

```
matrixtsl.dev/
├── /                      → dashboard/index.html
├── /sow-generator         → sow-generator/index.html
├── /review.html           → sow-generator/review.html
├── /admin.html            → sow-generator/admin.html
├── /hardware.html         → sow-generator/hardware.html
├── /scorm-example         → scorm-example/index.html
├── /scorm-example/*       → scorm-example/* (static files)
├── /sf2-portal/*          → sf2-portal/* (static files)
├── /im-portal/*           → im-portal/* (static files)
├── /api/topics            → data/topics.json (GET/PUT)
├── /api/hardware          → data/hardware.json (GET/PUT)
├── /api/templates         → data/templates.json (GET/PUT)
├── /api/upload-image      → assets/uploads/ (POST — admin only)
├── /api/sow/chat          → Gemini-backed SOW assistant
└── /api/eblocks/chat      → Gemini-backed E-blocks assistant
```

One Node.js server (`server.js`) serves all static apps and API routes.

---

## Project Structure

```
matrix-dev/
│
├── server.js                 # Main Node.js server (routing + APIs + static files)
├── package.json              # npm scripts and dependencies
├── README.md
│
├── dashboard/
│   └── index.html            # Home page served at "/"
│
├── sow-generator/
│   ├── index.html            # SOW Generator app
│   ├── app.js
│   ├── styles.css
│   ├── review.html
│   ├── review.js
│   ├── review.css
│   ├── review-shared.js
│   ├── admin.html            # Topic editor
│   └── hardware.html         # Hardware editor
│
├── scorm-example/            # SCORM workflow app and generated outputs
│   ├── index.html
│   ├── backend.html
│   ├── upload.html
│   ├── workflow.html
│   ├── upload-media.js
│   ├── source/
│   ├── outputs/
│   ├── reports/
│   └── specs/
│
├── sf2-portal/               # Static SF2 portal app
├── im-portal/                # Static IM portal app
├── assets/                   # Shared static assets
├── data/                     # JSON data for API endpoints
├── SEARCH_CONSOLE_REMOVAL_STEPS.md
└── robots.txt
```

---

## Running Locally

### Prerequisites
- Node.js 18+

### Steps

```bash
git clone https://github.com/hadefuwa/matrix-dev.git
cd matrix-dev
npm install
node server.js
```

Open [http://localhost:3000](http://localhost:3000).

Install dependencies once with `npm install` (currently includes `tinymce`).

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Port the server listens on |
| `ADMIN_TOKEN` | *(none)* | Token required for admin write operations (PUT /api/*, POST /api/upload-image). If not set, write endpoints return 500. |
| `GEMINI_API_KEY` | *(none)* | Google AI Studio API key used by `POST /api/eblocks/chat`. Keep it server-side only. |
| `DATA_DIR` | `./data` | Path to JSON data files directory |
| `IMAGE_UPLOAD_DIR` | `./assets/uploads` | Path where uploaded images are saved |
| `SITE_USERNAME` | `admin` | Username used when site auth is enabled |
| `SITE_PASSWORD` | *(none)* | Password used when site auth is enabled |

Set `ADMIN_TOKEN` to enable topic/hardware editing:

```bash
ADMIN_TOKEN=your-secret-token node server.js
```

---

## Deployment (Railway)

This project is deployed on [Railway](https://railway.com) as the `matrix-home` service inside the `wonderful-acceptance` project.

### Initial Setup

1. Create a new service in Railway
2. **Settings → Source → Connect Repo** → select `hadefuwa/matrix-dev`, branch `main`
3. Railway will auto-detect Node.js and run `npm start` → `node server.js`
4. Set environment variables in Railway → **Variables**:
   - `ADMIN_TOKEN` = your secret token
   - `GEMINI_API_KEY` = your Google AI Studio key for the E-blocks assistant
5. Add custom domain: `matrixtsl.dev`

### Auto-Deploy

Once connected to GitHub, every push to `main` triggers an automatic Railway deployment. No manual steps needed.

```bash
git add .
git commit -m "Your change"
git push
# Railway deploys automatically
```

### Railway CLI (optional)

If you need to interact with the service manually:

```bash
railway login
railway link          # link this directory to the Railway project
railway logs          # view live logs
railway open          # open Railway dashboard
```

Note: `railway up` (direct upload) is not recommended for this repo due to asset size. Use GitHub-connected auto-deploy instead.

---

## API Reference

All write endpoints require the `ADMIN_TOKEN` in one of:
- Header: `X-Admin-Token: <token>`
- Header: `Authorization: Bearer <token>`

### GET /api/topics
Returns the full topics array from `data/topics.json`.

### PUT /api/topics
Replaces the full topics array. Body must be a JSON array.

### GET /api/hardware
Returns hardware catalogue from `data/hardware.json`.

### PUT /api/hardware
Replaces hardware catalogue. Body must be a JSON array.

### GET /api/templates
Returns SoW templates from `data/templates.json`.

### PUT /api/templates
Replaces templates. Body must be a JSON array.

### POST /api/upload-image
Uploads a base64-encoded image.

**Request body:**
```json
{
  "filename": "my-image.png",
  "contentType": "image/png",
  "data": "<base64 string>"
}
```

**Response:**
```json
{
  "ok": true,
  "path": "/assets/uploads/my-image-1234567890.png",
  "size": 45231
}
```

Constraints: PNG/JPEG only, max 1 MB per image.

### POST /api/eblocks/chat
Gemini-backed assistant endpoint for the E-blocks IDE.

**Request body:**
```json
{
  "message": "Why is my LED not blinking?",
  "editorCode": "// current code",
  "boardType": "Arduino Mega (arduino:avr:mega)",
  "worksheet": {
    "code": "CP0507-1",
    "title": "Motors and Microcontrollers",
    "text": "..."
  },
  "serialContext": "[12:00:00] LED ON",
  "conversation": [
    { "role": "user", "content": "Previous question" },
    { "role": "assistant", "content": "Previous answer" }
  ]
}
```

**Response:**
```json
{
  "reply": "Check the selected board, pin mode, and whether the browser IDE or a physical board is running the code.",
  "usage": {
    "promptTokenCount": 123,
    "candidatesTokenCount": 45,
    "totalTokenCount": 168
  },
  "warnings": []
}
```

### GET /api/health
Returns server status and configuration info.

### POST /api/sow/chat
Gemini-backed assistant endpoint for the SOW Generator.

---

## Adding a New App

1. **Static app** (HTML/CSS/JS only): copy files into a new subfolder, e.g. `new-app/`. The server serves directories automatically — it will be accessible at `/new-app/`.

2. **App requiring a named route**: add a route in `server.js` inside `serveStatic()`:

```js
if (pathname === "/new-app" || pathname === "/new-app/") {
  return sendFile(res, path.join(ROOT_DIR, "new-app", "index.html"));
}
```

3. **Add a card to the dashboard**: edit `dashboard/index.html` and add a new `.app-card` inside `.app-grid`. Follow the existing card pattern and add a colour theme in the `<style>` block.

---

## Image Compression

Worksheet images are stored as WebP (converted from the original PNGs extracted from PDFs) at 75% quality, max 1400px wide. This reduces the worksheet images folder from ~125 MB to ~15 MB.

If you add new worksheets with extracted PNG images, run the compression script from `sow-generator-railway`:

```bash
# From sow-generator-railway — extract images from a new PDF
node extract-single-pdf-images.mjs assets/worksheets/YOUR-NEW-FILE.pdf

# Then from matrix-dev — compress the new PNGs
node compress-images.mjs
```

The compression script (`compress-images.mjs`) uses `sharp` from `sow-generator-railway/node_modules`. It converts all PNGs under `assets/worksheets/` to WebP and updates `data/topics.json` references automatically.

---

## Related Repositories

| Repo | Status | Notes |
|------|--------|-------|
| [sow-generator-railway](https://github.com/hadefuwa/sow-generator-railway) | Archived | Original standalone SOW Generator. Code moved into this repo (`sow-generator/`). |
| [IM-Teachers-Portal](https://github.com/hadefuwa/IM-Teachers-Portal) | Archived | Original IM portal. Code now lives in this repo (`im-portal/`). |
