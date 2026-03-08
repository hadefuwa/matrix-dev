# Matrix Apps — matrix-dev

Central hub for Matrix TSL internal web applications. All apps are served from a single Node.js service under `matrixtsl.dev`, with a shared dashboard as the entry point.

**Live:** [matrixtsl.dev](https://matrixtsl.dev)

---

## Apps

| App | Route | Description |
|-----|-------|-------------|
| Dashboard | `/` | Matrix Apps home — links to all apps |
| Scheme of Work Generator | `/sow-generator` | Plan and generate engineering course SoWs |
| IM Teachers Portal | `/teachers/` | Resources and lesson materials for IM programme teachers |

---

## Architecture

```
matrixtsl.dev/
├── /                  → index.html        (Dashboard)
├── /sow-generator     → sow.html          (SOW Generator app)
├── /review.html       → review.html       (SOW review/edit step)
├── /admin.html        → admin.html        (Topic Editor — admin only)
├── /hardware.html     → hardware.html     (Hardware Editor — admin only)
├── /teachers/         → teachers/         (IM Teachers Portal — static)
├── /api/topics        → data/topics.json  (GET/PUT)
├── /api/hardware      → data/hardware.json(GET/PUT)
├── /api/templates     → data/templates.json (GET/PUT)
└── /api/upload-image  → assets/uploads/   (POST — admin only)
```

One Railway service. One domain. No subdomains or external URLs.

---

## Project Structure

```
matrix-dev/
│
├── server.js               # Node.js HTTP server — routing, API, file serving
├── package.json            # start: node server.js
│
├── index.html              # Dashboard (Matrix Apps home page)
├── sow.html                # SOW Generator app entry point
├── styles.css              # Shared styles (SOW generator)
├── app.js                  # SOW Generator frontend logic
├── review.html             # SOW review/edit page
├── review.js               # Review page logic
├── review.css              # Review page styles
├── review-shared.js        # Shared review utilities
├── admin.html              # Topic Editor (requires ADMIN_TOKEN)
├── hardware.html           # Hardware Editor (requires ADMIN_TOKEN)
│
├── assets/
│   ├── favicon.png         # App icon
│   ├── matrix light.png    # Matrix TSL logo (light)
│   ├── matrix dark.png     # Matrix TSL logo (dark)
│   ├── hardware/           # Hardware product images
│   ├── worksheets/         # Worksheet PDFs + extracted WebP images
│   │   ├── *.pdf           # Source worksheet documents
│   │   └── *-images/       # Page images extracted from each PDF (WebP)
│   ├── uploads/            # User-uploaded images (created at runtime)
│   └── placeholder*.jpg    # Fallback topic images
│
├── data/
│   ├── topics.json         # All SOW topic definitions (edited via /admin.html)
│   ├── hardware.json       # Hardware catalogue (edited via /hardware.html)
│   └── templates.json      # SoW document templates
│
└── teachers/               # IM Teachers Portal (self-contained static app)
    ├── index.html
    ├── css/styles.css
    ├── js/
    │   ├── auth.js         # Client-side login (session-based)
    │   └── main.js
    └── assets/
        ├── documents/      # Course PDFs (IM0004, IM3214, IM6930)
        ├── images/         # Course imagery
        └── matrix-logo.png
```

---

## Running Locally

### Prerequisites
- Node.js 18+

### Steps

```bash
git clone https://github.com/hadefuwa/matrix-dev.git
cd matrix-dev
node server.js
```

Open [http://localhost:3000](http://localhost:3000).

No `npm install` needed — the server uses only Node.js built-in modules (`http`, `fs`, `path`).

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Port the server listens on |
| `ADMIN_TOKEN` | *(none)* | Token required for admin write operations (PUT /api/*, POST /api/upload-image). If not set, write endpoints return 500. |
| `GEMINI_API_KEY` | *(none)* | Google AI Studio API key used by `POST /api/eblocks/chat`. Keep it server-side only. |
| `DATA_DIR` | `./data` | Path to JSON data files directory |
| `IMAGE_UPLOAD_DIR` | `./assets/uploads` | Path where uploaded images are saved |

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

---

## Adding a New App

1. **Static app** (HTML/CSS/JS only): copy files into a new subfolder, e.g. `new-app/`. The server serves directories automatically — it will be accessible at `/new-app/`.

2. **App requiring a named route**: add a route in `server.js` inside `serveStatic()`:

```js
if (pathname === "/new-app" || pathname === "/new-app/") {
  return sendFile(res, path.join(ROOT_DIR, "new-app", "index.html"));
}
```

3. **Add a card to the dashboard**: edit `index.html` and add a new `.app-card` inside `.app-grid`. Follow the existing card pattern and add a colour theme in the `<style>` block.

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
| [sow-generator-railway](https://github.com/hadefuwa/sow-generator-railway) | Archived | Original standalone SOW Generator. Code merged into this repo. |
| [IM-Teachers-Portal](https://github.com/hadefuwa/IM-Teachers-Portal) | Archived | Original Teachers Portal. Code merged into `teachers/` in this repo. |
