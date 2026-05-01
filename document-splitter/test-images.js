/**
 * test-images.js — closed-loop image-embedding test for the document-splitter tool
 *
 * Tests the full pipeline:
 *   1. Source DOCX has external image relationships (r:link → OneDrive URLs)
 *   2. Every external image filename matches a file in Media.zip
 *   3. The pre-patch logic correctly rewrites r:link → r:embed in the source XML
 *   4. Any existing output DOCX/DOC files in the root have all images fully embedded
 *      (correct r:embed, image bytes present, no remaining external rels)
 *
 * Usage:
 *   node document-splitter/test-images.js
 *   node document-splitter/test-images.js path/to/output.docx  (verify a specific file)
 *
 * Dependencies: jszip  (npm install --save-dev jszip)
 */

"use strict";

const fs   = require("fs");
const path = require("path");
const JSZip = require("jszip");

// ─── Paths ───────────────────────────────────────────────────────────────────

const ROOT         = path.join(__dirname, "..");
const SOURCE_DOCX  = path.join(__dirname, "source", "CP4807 - Introduction to microcontrollers 05 04 26.docx");
const SOURCE_MEDIA = path.join(__dirname, "source", "Media.zip");

// ─── Counters ────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
let skipped = 0;

function pass(msg)   { console.log(`  ✓  ${msg}`); passed++; }
function fail(msg)   { console.log(`  ✗  ${msg}`); failed++; }
function skip(msg)   { console.log(`  –  ${msg} (skipped)`); skipped++; }
function info(msg)   { console.log(`     ${msg}`); }
function section(t)  { console.log(`\n${"═".repeat(64)}\n  ${t}\n${"═".repeat(64)}`); }

// ─── XML helpers (regex-only — no DOM library needed) ────────────────────────

function parseRels(xmlStr) {
  const rels = new Map();
  // Use (?:[^>"]|"[^"]*")* so quoted attribute values (which may contain /)
  // are consumed as a unit — prevents file:/// URLs from breaking the match.
  for (const m of xmlStr.matchAll(/<Relationship\s+((?:[^>"]|"[^"]*")*)\s*\/?>/g)) {
    const attrs = {};
    for (const a of m[1].matchAll(/(\w+)="([^"]*)"/g)) attrs[a[1]] = a[2];
    if (attrs.Id) {
      rels.set(attrs.Id, {
        type:   attrs.Type        || "",
        target: attrs.Target      || "",
        mode:   attrs.TargetMode  || "Internal",
      });
    }
  }
  return rels;
}

// Returns { links: [{rId}], embeds: [{rId}] }
function findImageRefs(docXml) {
  const links  = [...docXml.matchAll(/[\w][\w-]*:link="([^"]+)"/g)].map(m => ({ rId: m[1] }));
  const embeds = [...docXml.matchAll(/[\w][\w-]*:embed="([^"]+)"/g)].map(m => ({ rId: m[1] }));
  return { links, embeds };
}

function normalizeKey(name) {
  return path.basename(name).toLowerCase().replace(/\s+/g, " ").trim();
}

function decodeFileName(raw) {
  try { return decodeURIComponent(raw); } catch (_) { return raw; }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  // If a specific file is passed as argument, just verify it and exit.
  const argFile = process.argv[2];
  if (argFile) {
    section(`Verifying: ${argFile}`);
    await verifyOutputDocx(argFile);
    printSummary();
    return;
  }

  // ── Test 1: Source DOCX ──────────────────────────────────────────────────
  section("TEST 1 — Source DOCX: external image relationships");

  if (!fs.existsSync(SOURCE_DOCX)) {
    fail(`Source DOCX not found: ${SOURCE_DOCX}`);
    printSummary(); return;
  }
  pass("Source DOCX file exists");

  const sourceZip = await JSZip.loadAsync(fs.readFileSync(SOURCE_DOCX));

  if (!sourceZip.file("word/document.xml")) { fail("Missing word/document.xml");  printSummary(); return; }
  if (!sourceZip.file("word/_rels/document.xml.rels")) { fail("Missing relationships file"); printSummary(); return; }
  pass("DOCX contains word/document.xml and relationships file");

  const docXmlOriginal = await sourceZip.file("word/document.xml").async("string");
  const relsXml        = await sourceZip.file("word/_rels/document.xml.rels").async("string");
  const rels           = parseRels(relsXml);

  info(`Total relationships in source: ${rels.size}`);

  const extImageRels = [...rels.entries()].filter(
    ([, r]) => r.mode === "External" && r.type.includes("/image")
  );

  if (extImageRels.length === 0) {
    skip("No external image relationships — source may already be fully embedded");
  } else {
    pass(`Found ${extImageRels.length} external image relationship(s)`);
    for (const [rId, rel] of extImageRels) {
      const fileName = decodeFileName(rel.target.split(/[\\/]/).pop());
      info(`  ${rId}: ${fileName}`);
    }
  }

  const { links: docLinks } = findImageRefs(docXmlOriginal);
  if (docLinks.length > 0) {
    pass(`Source document XML contains ${docLinks.length} r:link attribute(s)`);
  } else {
    fail("No r:link attributes found in source document.xml — check namespace prefix");
    info("Snippet of drawing XML:");
    const snippet = docXmlOriginal.match(/(?:blip|drawing).{0,300}/i)?.[0] || "(none found)";
    info(`  ${snippet}`);
  }

  // ── Test 2: Media ZIP ────────────────────────────────────────────────────
  section("TEST 2 — Media ZIP: file matching");

  if (!fs.existsSync(SOURCE_MEDIA)) {
    skip(`Media ZIP not found: ${SOURCE_MEDIA}`);
    // Can still run pre-patch test (will all fail to match)
  }

  const mediaIndex = new Map(); // normalizedKey → original basename

  if (fs.existsSync(SOURCE_MEDIA)) {
    const mediaZip = await JSZip.loadAsync(fs.readFileSync(SOURCE_MEDIA));
    for (const [name, entry] of Object.entries(mediaZip.files)) {
      if (!entry.dir && !name.startsWith("__MACOSX/")) {
        mediaIndex.set(normalizeKey(name), path.basename(name));
      }
    }
    pass(`Media ZIP loaded — ${mediaIndex.size} file(s)`);
  }

  let matchCount = 0;
  let missCount  = 0;

  for (const [rId, rel] of extImageRels) {
    const fileName = decodeFileName(rel.target.split(/[\\/]/).pop());
    const key      = normalizeKey(fileName);
    if (mediaIndex.has(key)) {
      pass(`${rId}: "${fileName}" → matched "${mediaIndex.get(key)}" in ZIP`);
      matchCount++;
    } else {
      fail(`${rId}: "${fileName}" → NO MATCH in ZIP  (key="${key}")`);
      info("  Keys in ZIP: " + [...mediaIndex.keys()].slice(0, 5).join(", ") + (mediaIndex.size > 5 ? "…" : ""));
      missCount++;
    }
  }

  if (extImageRels.length > 0) {
    if (missCount === 0) pass(`All ${matchCount} external image(s) matched`);
    else                 fail(`${missCount} of ${extImageRels.length} external image(s) could not be matched`);
  }

  // ── Test 3: Pre-patch simulation ─────────────────────────────────────────
  section("TEST 3 — Pre-patch: r:link → r:embed rewrite");

  let patchedXml = docXmlOriginal;
  let patchCount = 0;

  for (const [rId, rel] of extImageRels) {
    const fileName = decodeFileName(rel.target.split(/[\\/]/).pop());
    const key      = normalizeKey(fileName);
    if (!mediaIndex.has(key)) continue; // already failed above

    const safeId = rId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const before = patchedXml;
    patchedXml = patchedXml.replace(
      new RegExp(`([\\w][\\w-]*):link="${safeId}"`, "g"),
      `$1:embed="${rId}"`
    );
    if (patchedXml !== before) {
      pass(`Swapped r:link="${rId}" → r:embed="${rId}"`);
      patchCount++;
    } else {
      fail(`String replacement found nothing for r:link="${rId}"`);
      // Show what's actually around blip elements for debugging
      const blipSnippet = docXmlOriginal.match(new RegExp(`.{0,80}${safeId}.{0,80}`))?.[0] || "(not found)";
      info(`  Context in source XML: …${blipSnippet}…`);
    }
  }

  // Confirm no image r:link remains after patch
  const { links: remaining } = findImageRefs(patchedXml);
  const remainingImageLinks = remaining.filter(l => {
    const r = rels.get(l.rId);
    return r && r.type.includes("/image");
  });

  if (remainingImageLinks.length === 0 && patchCount > 0) {
    pass(`No r:link remains for image rels after patch — source XML is clean`);
  } else if (remainingImageLinks.length > 0) {
    fail(`${remainingImageLinks.length} image r:link(s) NOT patched: ${remainingImageLinks.map(l => l.rId).join(", ")}`);
  }

  // Confirm r:embed count increased
  const { embeds: afterEmbeds } = findImageRefs(patchedXml);
  const imageEmbeds = afterEmbeds.filter(e => {
    const r = rels.get(e.rId);
    return r && r.type.includes("/image");
  });
  if (imageEmbeds.length > 0) {
    pass(`Patched XML has ${imageEmbeds.length} r:embed reference(s) for images`);
  }

  // ── Test 4: Verify existing output files ─────────────────────────────────
  section("TEST 4 — Existing output files: structure verification");

  const candidates = [];

  // Scan root directory for any .doc/.docx files.
  // Strip both ASCII and Unicode curly quotes from the filename before testing
  // (Word sometimes creates filenames with “/” smart quotes).
  const QUOTE_RE = /^["“”]|["“”]$/g;
  for (const f of fs.readdirSync(ROOT)) {
    if (/\.(docx?|doc)$/i.test(f.replace(QUOTE_RE, ""))) {
      candidates.push(path.join(ROOT, f));
    }
  }

  // Also scan document-splitter/outputs/docx/
  const outputDocxDir = path.join(__dirname, "outputs", "docx");
  if (fs.existsSync(outputDocxDir)) {
    for (const f of fs.readdirSync(outputDocxDir)) {
      if (/\.(docx?|doc)$/i.test(f)) candidates.push(path.join(outputDocxDir, f));
    }
  }

  const found = candidates.filter(f => fs.existsSync(f));
  if (found.length === 0) {
    skip("No existing output DOCX files found to verify");
  } else {
    for (const f of found) {
      console.log(`\n  → Checking: ${path.basename(f)}`);
      await verifyOutputDocx(f);
    }
  }

  printSummary();
}

// ─── Verify a single output DOCX/DOC file ────────────────────────────────────

async function verifyOutputDocx(filePath) {
  if (!fs.existsSync(filePath)) {
    fail(`File not found: ${filePath}`);
    return;
  }

  // Check ZIP magic bytes (50 4B = "PK")
  const buf4 = Buffer.alloc(4);
  const fd   = fs.openSync(filePath, "r");
  fs.readSync(fd, buf4, 0, 4, 0);
  fs.closeSync(fd);

  if (buf4[0] !== 0x50 || buf4[1] !== 0x4B) {
    fail(`Not a ZIP/DOCX — magic bytes: ${buf4.toString("hex").substring(0, 8)} (expected 504b0304)`);
    info("This is a genuine legacy .doc binary file. The tool must output .docx format.");
    return;
  }
  pass("File is valid ZIP/DOCX format (PK magic bytes)");

  // Strip non-alphanumeric suffix chars (e.g. trailing curly quote in filename)
  const fileExt = path.extname(filePath).toLowerCase().replace(/[^a-z0-9]/g, "");
  if (fileExt === "doc") {
    fail(`File has .doc extension — rename to .docx so Word opens it as OOXML (not legacy binary)`);
    info("Word may enter compatibility mode for .doc-named OOXML and silently drop images.");
  } else {
    pass(`File extension is .${fileExt}`);
  }

  const zip = await JSZip.loadAsync(fs.readFileSync(filePath));

  for (const req of ["word/document.xml", "word/_rels/document.xml.rels", "[Content_Types].xml"]) {
    zip.file(req) ? pass(`Has ${req}`) : fail(`Missing ${req}`);
  }

  const docXml  = await zip.file("word/document.xml").async("string");
  const relsXml = await zip.file("word/_rels/document.xml.rels").async("string");
  const rels    = parseRels(relsXml);

  // No External image relationships
  const extImgRels = [...rels.entries()].filter(
    ([, r]) => r.mode === "External" && r.type.includes("/image")
  );
  if (extImgRels.length === 0) {
    pass("No External image relationships — images are not externally linked");
  } else {
    fail(`${extImgRels.length} External image rel(s) remain (images will not load without OneDrive access):`);
    for (const [id, r] of extImgRels) info(`  ${id}: ${r.target}`);
  }

  // No r:link for image rels
  const { links } = findImageRefs(docXml);
  const imgLinks  = links.filter(l => { const r = rels.get(l.rId); return r && r.type.includes("/image"); });
  if (imgLinks.length === 0) {
    pass("No r:link attributes on image elements");
  } else {
    fail(`${imgLinks.length} r:link(s) found on image elements — Word will treat as external reference`);
    for (const l of imgLinks) info(`  r:link="${l.rId}"`);
  }

  // r:embed references → must resolve to real non-empty files
  const { embeds } = findImageRefs(docXml);
  const imgEmbeds  = embeds.filter(e => { const r = rels.get(e.rId); return r && r.type.includes("/image"); });

  if (imgEmbeds.length === 0) {
    fail("No r:embed attributes found for images — document has no embedded images");
  } else {
    info(`Image r:embed references: ${imgEmbeds.length}`);
    let allGood = true;
    for (const { rId } of imgEmbeds) {
      const rel = rels.get(rId);
      if (!rel) { fail(`r:embed="${rId}" — no relationship entry`); allGood = false; continue; }
      const raw  = rel.target.replace(/^\//, "");
      const full = raw.startsWith("word/") ? raw : `word/${raw}`;
      const entry = zip.file(full);
      if (!entry) {
        fail(`r:embed="${rId}" → "${full}" — FILE MISSING from ZIP`);
        allGood = false;
      } else {
        const data = await entry.async("uint8array");
        if (data.length === 0) {
          fail(`r:embed="${rId}" → "${full}" — file is EMPTY (0 bytes)`);
          allGood = false;
        } else {
          pass(`r:embed="${rId}" → "${full}" — ${data.length.toLocaleString()} bytes ✓`);
        }
      }
    }
    if (allGood) pass(`All ${imgEmbeds.length} embedded image(s) resolve to non-empty files`);
  }
}

// ─── Summary ──────────────────────────────────────────────────────────────────

function printSummary() {
  const total = passed + failed + skipped;
  section("SUMMARY");
  console.log(`  Passed:  ${passed}`);
  console.log(`  Failed:  ${failed}`);
  console.log(`  Skipped: ${skipped}`);
  console.log(`  Total:   ${total}`);
  if (failed === 0) {
    console.log("\n  ✓ All checks passed — image embedding pipeline looks healthy\n");
  } else {
    console.log(`\n  ✗ ${failed} check(s) failed — see details above\n`);
    process.exit(1);
  }
}

main().catch(err => { console.error("\nFatal error:", err); process.exit(1); });
