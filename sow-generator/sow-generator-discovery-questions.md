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
**Answer:** We can generate SCORM packages from the same data structure.

**Minimum features:**
- Titles, objectives
- Module sequencing
- Completion tracking (complete/incomplete)
- Score/pass‑fail (optional)
- Duration tracking

**Recommendation:** Start with **SCORM 1.2** (simpler). Upgrade to SCORM 2004 only if sequencing rules are needed.

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
**Answer:** Yes — spreadsheet + AI can generate structured content, then package to SCORM.

**Options:**
- **Internal generator:** Spreadsheet → JSON → SCORM package
- **External authoring tools:** (Adapt, Articulate, H5P) – higher cost/overhead

**Recommendation:** Build internal generator first; it fits the existing architecture.

---

## 7) What format do we need to present content in to create a course?
**Answer:** A structured **course map spreadsheet** (like CP4807 syllabus mapping).

**Required columns:**
- Topic, Objectives, Activities, Assessment, Duration, Resources, Level, Audience

---

## 8) Do we understand SCORM? (I don’t fully.)
**Answer:** We should do a short internal primer. SCORM is a packaging + tracking standard for LMS delivery.

**Recommendation:** 30‑minute walkthrough + a minimal SCORM checklist for MVP.

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
