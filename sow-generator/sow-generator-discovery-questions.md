# SOW Generator – Discovery Questions & Proposed Answers (Reviewed)

## Executive Summary
Yes — the **current SOW Generator app already proves we can serve granular content in different ways for different customers/courses**. The app lets us select topics, generate a scheme of work, attach hardware, and print/export a structured plan. That validates the core idea. Next steps are about **content schema, authoring workflow, and output standards (SCORM vs non‑SCORM)**.

---

## App Review (How it Works Today)
**Repo:** https://github.com/hadefuwa/matrix-dev (app path `/sow-generator`)

**Flow:**
1. **Select topics** from the topics tree.
2. **Set class size**.
3. **Generate Scheme** – builds a structured SOW.
4. **Review/Edit** – via review page.
5. **Print/Export** (current output is print‑ready HTML).

**Data Sources:**
- `data/topics.json` – lesson topics & metadata
- `data/hardware.json` – hardware catalogue
- `data/templates.json` – SOW templates

**Key point:** It’s already a **structured content system**. That’s the foundation we need for SCORM or other exports.

---

## 1) Can we get AI to serve granular content in different ways for different customers/courses?
**Answer:** **Yes.** The current generator already proves dynamic selection and customization. AI can be added on top of this structure for **rewrites, summaries, or different customer‑specific tone/formatting**.

---

## 2) What format does our granular content need to be in? (Word/PDF/Excel/PPT, etc.)
**Answer:** The *source of truth* should be structured (JSON or Spreadsheet), not Word/PDF.
- **Input/authoring:** Spreadsheet (CSV/Google Sheets) or JSON
- **Outputs:** PDF/Word for teacher packs, PPT for slides, SCORM packages for LMS

**Recommendation:** Use **structured spreadsheet → JSON → outputs**. Avoid Word/PDF as authoring inputs.

---

## 3) What functionality do we want? What UI?
**Answer:** The current UI already covers most of the pipeline. We should formalize workflows:
- **Create document** (teacher resources)
- **Create SCORM‑compliant content**
- **Customize course** (audience, level, tone, duration, included topics)

**UI suggestion (evolution of current app):**
- Wizard steps: Select topics → audience → output format → review → export

---

## 4) Create SCORM‑compliant content – and with what features?
**Answer:** We can generate SCORM packages from the same data structure. A SCORM package is essentially:
- an **`imsmanifest.xml`** (course structure + metadata)
- one or more **SCOs** (Sharable Content Objects)
- static assets (HTML/CSS/JS/media)

**Minimum features (MVP):**
- Titles + learning objectives
- Module/lesson sequencing (simple linear order)
- Completion tracking (complete/incomplete)
- Duration/time tracking
- Optional score/pass‑fail for quizzes

**Nice‑to‑have features (Phase 2):**
- Mastery/assessment logic (pass thresholds)
- Optional branching or prerequisites
- Rich media (video, interactive activities)
- Accessibility metadata

**Recommendation:** Start with **SCORM 1.2** (simpler data model: `cmi.core.*`). Move to **SCORM 2004** only if we need advanced sequencing rules.

---

## 5) What data do we need to record about each learning resource? (SCORM) What is the DB structure?
**Answer:** We already store topics in `topics.json`. We need to formalize fields.

**Proposed minimum fields:**
- ID, Title, Subject, Domain, Level
- Learning objectives
- Content blocks (text, activity, resources)
- Duration
- Assessment items (if any)
- Metadata (tags, audience, prerequisites)

**High‑level data model:**
- **Courses** → **Modules** → **Resources** → **Assessments**
- Outputs (PDF/PPT/SCORM) are derived from these.

---

## 6) Can we generate SCORM content from a spreadsheet + AI? Or what editing tool do we use?
**Answer:** Yes. The cleanest pipeline is:
1. **Spreadsheet** as the authoring source of truth (topics, objectives, activities, duration, assessments)
2. **AI generation** to expand text (lesson notes, activities, teacher prompts)
3. **JSON mapping** to a consistent schema
4. **SCORM packaging** into a compliant ZIP (manifest + SCOs)

**Options:**
- **Internal generator:** Spreadsheet → JSON → SCORM package (best fit with current app + low cost)
- **External authoring tools:** Adapt / Articulate / H5P (faster UI authoring but expensive + harder to automate)

**Recommendation:** Build the internal generator first, then evaluate external tools only if we need advanced interactions or non‑technical authoring.

---

## 7) What format do we need to present content in to create a course?
**Answer:** A structured **course map spreadsheet** (like CP4807 syllabus mapping).

**Required columns:**
- Topic, Objectives, Activities, Assessment, Duration, Resources, Level, Audience

---

## 8) Do we understand SCORM? (I don’t fully.)
**Answer:** SCORM is a **packaging + tracking standard** for LMS delivery. Key terms:
- **LMS** = Learning Management System (where SCORM is uploaded)
- **SCO** = Sharable Content Object (a launchable unit)
- **API** = JS interface the LMS exposes for tracking
- **`cmi.core` / `cmi.score` / `cmi.completion_status`** = fields the LMS tracks

**SCORM 1.2 vs 2004:**
- **1.2:** simpler, widely supported, limited sequencing
- **2004:** more complex, supports sequencing rules

**Recommendation:** Do a 30‑minute primer + create a **1‑page SCORM checklist** (manifest, SCO launch, completion tracking, score tracking). That’s enough for MVP.

---

## 9) Do we want to offer learning PowerPoints and a full student‑centered course, or just teacher support materials?
**Answer:** This is a product decision.

- **Option A:** Teacher support materials only (fastest MVP)
- **Option B:** Full student course + teacher pack (higher value, more work)

**Recommendation:** Start with **Option A** and expand once pipeline is stable.

---

## Proposed Next Steps
1. **Formalize content schema** (based on existing topics.json).
2. Decide MVP outputs (PDF + PPT vs SCORM).
3. Build a **SCORM prototype exporter** (1 module).
4. Confirm target audience focus (teacher vs student‑facing).

---

*File location:* `matrix-dev/sow-generator/sow-generator-discovery-questions.md`
