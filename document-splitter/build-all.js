/**
 * build-all.js — full Node.js pipeline that replicates what the browser tool does
 *
 * 1. Loads the source DOCX
 * 2. Loads Media.zip and builds the media index
 * 3. Applies the pre-patch (r:link → r:embed in source XML)
 * 4. Finds all blocks (<HTML>, <worksheet>, <document>)
 * 5. Builds a mini-DOCX for every block that has a filename
 * 6. Writes output files to document-splitter/outputs/docx/
 * 7. Verifies every output — reports whether each image is embedded correctly
 *
 * Usage:
 *   node document-splitter/build-all.js
 *   node document-splitter/build-all.js path/to/source.docx path/to/Media.zip
 */

"use strict";

const fs    = require("fs");
const path  = require("path");
const JSZip = require("jszip");
const { DOMParser, XMLSerializer } = require("@xmldom/xmldom");

// ─── Config ──────────────────────────────────────────────────────────────────

const ROOT         = path.join(__dirname, "..");
const SOURCE_DOCX  = process.argv[2] || path.join(__dirname, "source", "CP4807 - Introduction to microcontrollers 05 04 26.docx");
const SOURCE_MEDIA = process.argv[3] || path.join(__dirname, "source", "Media.zip");
const OUT_DIR      = path.join(__dirname, "outputs", "docx");

// ─── Logging ─────────────────────────────────────────────────────────────────

let passed = 0, failed = 0;
const log   = (m) => console.log(`  ${m}`);
const ok    = (m) => { console.log(`  ✓  ${m}`); passed++; };
const fail  = (m) => { console.log(`  ✗  ${m}`); failed++; };
const hr    = (t)  => console.log(`\n${"═".repeat(64)}\n  ${t}\n${"═".repeat("═".repeat(64).length)}`);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalizeKey(name) {
  return path.basename(String(name)).trim().toLowerCase().replace(/[\s]+/g, "_");
}
function decodeFileName(raw) {
  try { return decodeURIComponent(raw); } catch (_) { return raw; }
}
function escXml(v) {
  return String(v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}
function sanitizeMediaFilename(name) { return String(name).replace(/[\s#%&?]/g, "_"); }

const xParser = new DOMParser({ onError: () => {} });
const xSer    = new XMLSerializer();

function getByLocal(node, name) {
  const r = [];
  function walk(n) {
    if (n.nodeType === 1 && n.localName === name) r.push(n);
    for (let c = n.firstChild; c; c = c.nextSibling) walk(c);
  }
  walk(node);
  return r;
}
function getText(node) {
  let t = "";
  for (const tn of getByLocal(node, "t")) t += (tn.textContent || "").replace(/ /g, " ");
  return t.trim();
}

const NODE_TAG_STRIP_RE = /<\/?(HTML|worksheet|document)\s*>|<filename>[^<>]*<\/filename>|<(?:image|video|audio|datasheet)[^<>]*>[^<>]*<\/(?:image|video|audio|datasheet)>/gi;

function stripTagMarkupFromNode(node) {
  const tNodes = node.getElementsByTagNameNS ? node.getElementsByTagNameNS("*", "t") : [];
  for (const t of tNodes) {
    const orig = t.textContent || "";
    const stripped = orig.replace(NODE_TAG_STRIP_RE, "");
    if (stripped !== orig) t.textContent = stripped;
  }
}

function isNodeEffectivelyEmpty(node) {
  if (node.getElementsByTagNameNS("*", "drawing").length > 0) return false;
  if (node.getElementsByTagNameNS("*", "blip").length    > 0) return false;
  const tNodes = node.getElementsByTagNameNS ? node.getElementsByTagNameNS("*", "t") : [];
  for (const t of tNodes) { if ((t.textContent || "").trim()) return false; }
  return true;
}

// ─── Parse DOCX structure ────────────────────────────────────────────────────

async function parseDocx(docxPath) {
  const buf = fs.readFileSync(docxPath);
  const zip = await JSZip.loadAsync(buf);

  // Relationships
  const relsXmlStr = await zip.file("word/_rels/document.xml.rels")?.async("string");
  const rels = new Map();
  if (relsXmlStr) {
    for (const m of relsXmlStr.matchAll(/<Relationship\s+((?:[^>"]|"[^"]*")*)\s*\/?>/g)) {
      const attrs = {};
      for (const a of m[1].matchAll(/(\w+)="([^"]*)"/g)) attrs[a[1]] = a[2];
      if (attrs.Id) rels.set(attrs.Id, { type: attrs.Type||"", target: attrs.Target||"", mode: attrs.TargetMode||"Internal" });
    }
  }

  // Structural XML
  const stylesXml    = await zip.file("word/styles.xml")?.async("string")       || null;
  const numberingXml = await zip.file("word/numbering.xml")?.async("string")    || null;
  const themeXml     = await zip.file("word/theme/theme1.xml")?.async("string") || null;
  const docXml       = await zip.file("word/document.xml")?.async("string");
  if (!docXml) throw new Error("Missing word/document.xml");

  // Paragraphs
  const doc    = xParser.parseFromString(docXml, "application/xml");
  const bodyEl = getByLocal(doc, "body")[0];
  const paragraphs = [];
  for (let c = bodyEl.firstChild; c; c = c.nextSibling) {
    if (c.nodeType !== 1) continue;
    const ln = c.localName;
    if (ln === "p" || ln === "tbl") {
      paragraphs.push({ index: paragraphs.length, text: getText(c), xmlNode: c, isTable: ln === "tbl" });
    } else if (ln === "sdt") {
      const sdtContent = getByLocal(c, "sdtContent")[0];
      if (sdtContent) {
        for (let sc = sdtContent.firstChild; sc; sc = sc.nextSibling) {
          if (sc.nodeType === 1 && (sc.localName === "p" || sc.localName === "tbl")) {
            paragraphs.push({ index: paragraphs.length, text: getText(sc), xmlNode: sc, isTable: sc.localName === "tbl" });
          }
        }
      }
    }
  }

  return { zip, rels, docXml, stylesXml, numberingXml, themeXml, paragraphs };
}

// ─── Build media index ────────────────────────────────────────────────────────

async function buildMediaIndex(mediaZipPath) {
  const index = new Map();
  if (!fs.existsSync(mediaZipPath)) return index;
  const buf = fs.readFileSync(mediaZipPath);
  const zip = await JSZip.loadAsync(buf);
  for (const [name, entry] of Object.entries(zip.files)) {
    if (!entry.dir && !name.startsWith("__MACOSX/")) {
      const exportName = path.basename(name);
      const key        = normalizeKey(exportName);
      const data       = await entry.async("uint8array");
      index.set(key, { exportName, data });
    }
  }
  return index;
}

// ─── Pre-patch ────────────────────────────────────────────────────────────────

function applyPrePatch(docXml, rels, mediaIndex) {
  let patched = docXml;
  let count   = 0;
  for (const [rId, rel] of rels) {
    if (rel.mode !== "External" || !rel.type.includes("/image")) continue;
    const fileName = decodeFileName(rel.target.split(/[\\/]/).pop());
    const key      = normalizeKey(fileName);
    const resolved = mediaIndex.get(key);
    if (!resolved) continue;
    const escapedId = escXml(rId);
    const safeId    = escapedId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const before    = patched;
    patched = patched.replace(new RegExp(`(\\w[\\w-]*):link="${safeId}"`, "g"), `$1:embed="${escapedId}"`);
    if (patched !== before) {
      rels.set(rId, { ...rel, mode: "Internal", target: `media/${resolved.exportName}`, _resolvedFile: resolved });
      count++;
    }
  }
  return { patchedXml: patched, patchCount: count };
}

// ─── Reparse paragraph nodes from patched XML ────────────────────────────────

function reparseParagraphNodes(patchedXml, paragraphs) {
  const bodyDoc = xParser.parseFromString(patchedXml, "application/xml");
  const bodyEl  = getByLocal(bodyDoc, "body")[0];
  if (!bodyEl) return;
  let i = 0;
  for (const child of bodyEl.childNodes) {
    if (child.nodeType !== 1) continue;
    const ln = child.localName;
    if (ln === "p" || ln === "tbl") {
      if (paragraphs[i]) paragraphs[i].xmlNode = child;
      i++;
    } else if (ln === "sdt") {
      const sdtContent = getByLocal(child, "sdtContent")[0];
      if (sdtContent) {
        for (let sc = sdtContent.firstChild; sc; sc = sc.nextSibling) {
          if (sc.nodeType === 1 && (sc.localName === "p" || sc.localName === "tbl")) {
            if (paragraphs[i]) paragraphs[i].xmlNode = sc;
            i++;
          }
        }
      }
    }
  }
}

// ─── Find blocks ──────────────────────────────────────────────────────────────

function findBlocks(paragraphs) {
  const joined     = paragraphs.map(p => p.text).join("\n");
  const offsets    = [];
  let off = 0;
  for (const p of paragraphs) { offsets.push(off); off += p.text.length + 1; }
  const toParaIdx  = (pos) => {
    let lo = 0, hi = offsets.length - 1;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (offsets[mid] <= pos) lo = mid; else hi = mid - 1; }
    return lo;
  };

  const blocks  = [];
  const TOKEN   = /<filename>\s*[\u201c\u201d"]?([^\u201c\u201d"<>\n]+)[\u201c\u201d"]?\s*<\/filename>|<(HTML|worksheet|document)>|<\/(HTML|worksheet|document)>/gi;
  let current   = null;
  let tok;
  while ((tok = TOKEN.exec(joined)) !== null) {
    const idx = toParaIdx(tok.index);
    if (tok[2])                             { current = { tagType: tok[2], openIdx: idx, filename: null }; }
    else if (tok[3] && current)             { blocks.push({ ...current, closeIdx: idx }); current = null; }
    else if (tok[1] && current && !current.filename) { current.filename = tok[1].trim().replace(/[\u201c\u201d"]/g, ""); }
  }
  return blocks;
}

// ─── Extract content paragraph nodes ────────────────────────────────────────
// Same logic as the fixed extractContentParaNodes in upload-media.js:
// include opening paragraph if it is a table (cover-table pattern).

function extractContentNodes(block, paragraphs) {
  const open  = block.openIdx;
  const close = block.closeIdx;
  const nodes = [];
  const openEntry = paragraphs[open];
  if (openEntry && openEntry.isTable) nodes.push(openEntry.xmlNode);
  for (let i = open + 1; i < close; i++) {
    const p = paragraphs[i];
    if (!p) continue;
    // Skip paragraphs that are purely structural tag markers — their combined text
    // reduces to empty after removing all tag patterns.  Guard image paragraphs:
    // an image-only paragraph also has empty text, so check for drawing elements
    // before discarding.
    if (!p.isTable) {
      const hasImage = getByLocal(p.xmlNode, "drawing").length > 0 || getByLocal(p.xmlNode, "blip").length > 0;
      if (!hasImage && !p.text.replace(NODE_TAG_STRIP_RE, "").trim()) continue;
    }
    nodes.push(p.xmlNode);
  }
  return nodes;
}

// ─── Build block relationships + media list ──────────────────────────────────

function buildBlockRels(contentNodes, rels) {
  const usedRids = new Set();
  for (const node of contentNodes) {
    const raw = xSer.serializeToString(node);
    for (const m of raw.matchAll(/[\w][\w-]*:(?:embed|link|id|href)="([^"]+)"/g)) usedRids.add(m[1]);
  }

  const relEntries     = [];
  const mediaFiles     = [];
  const linkedToEmbed  = new Set();

  for (const [rId, rel] of rels) {
    if (!usedRids.has(rId)) continue;
    const isImg = rel.type.includes("/image");

    if (rel.mode === "Internal" && isImg && rel._resolvedFile) {
      const f = rel._resolvedFile;
      const safeName = sanitizeMediaFilename(f.exportName);
      mediaFiles.push({ name: safeName, data: f.data });
      relEntries.push(`  <Relationship Id="${escXml(rId)}" Type="${escXml(rel.type)}" Target="media/${escXml(safeName)}"/>`);
    } else if (rel.mode === "External" && isImg) {
      // fallback: should have been patched already, but handle it anyway
      relEntries.push(`  <Relationship Id="${escXml(rId)}" Type="${escXml(rel.type)}" Target="${escXml(rel.target)}" TargetMode="External"/>`);
    } else if (rel.mode === "Internal") {
      relEntries.push(`  <Relationship Id="${escXml(rId)}" Type="${escXml(rel.type)}" Target="${escXml(rel.target)}"/>`);
    } else {
      relEntries.push(`  <Relationship Id="${escXml(rId)}" Type="${escXml(rel.type)}" Target="${escXml(rel.target)}" TargetMode="External"/>`);
    }
  }

  const relsXml = [
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`,
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">`,
    ...relEntries,
    `</Relationships>`
  ].join("\n");

  return { relsXml, mediaFiles, linkedToEmbed };
}

// ─── Build document.xml ───────────────────────────────────────────────────────

function buildDocumentXml(contentNodes, patchedXml) {
  const envDoc  = xParser.parseFromString(patchedXml, "application/xml");
  const envBody = getByLocal(envDoc, "body")[0];
  while (envBody.firstChild) envBody.removeChild(envBody.firstChild);
  for (const node of contentNodes) {
    const imported = envDoc.importNode(node, true);
    stripTagMarkupFromNode(imported);
    if (!isNodeEffectivelyEmpty(imported)) envBody.appendChild(imported);
  }
  const W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
  envBody.appendChild(envDoc.createElementNS(W_NS, "w:sectPr"));
  return xSer.serializeToString(envDoc);
}

// ─── Content types ────────────────────────────────────────────────────────────

const MIME = { png:"image/png", jpg:"image/jpeg", jpeg:"image/jpeg", gif:"image/gif", bmp:"image/bmp", svg:"image/svg+xml", webp:"image/webp" };

function buildContentTypes(mediaFiles) {
  const exts = new Set(mediaFiles.map(f => f.name.split(".").pop().toLowerCase()).filter(Boolean));
  const extLines = [...exts].map(e => `  <Default Extension="${e}" ContentType="${MIME[e] || "application/octet-stream"}"/>`);
  return [
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`,
    `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">`,
    `  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>`,
    `  <Default Extension="xml" ContentType="application/xml"/>`,
    ...extLines,
    `  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>`,
    `</Types>`
  ].join("\n");
}

const PKG_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

// ─── Build one DOCX ──────────────────────────────────────────────────────────

async function buildDocx(block, paragraphs, rels, patchedXml, stylesXml, numberingXml, themeXml) {
  const contentNodes = extractContentNodes(block, paragraphs);
  if (!contentNodes.length) return null;

  const { relsXml, mediaFiles } = buildBlockRels(contentNodes, rels);
  const docXml  = buildDocumentXml(contentNodes, patchedXml);

  const zip = new JSZip();
  zip.file("word/document.xml", docXml);
  zip.file("word/_rels/document.xml.rels", relsXml);
  if (stylesXml)    zip.file("word/styles.xml",       stylesXml);
  if (numberingXml) zip.file("word/numbering.xml",    numberingXml);
  if (themeXml)     zip.file("word/theme/theme1.xml", themeXml);
  const seen = new Set();
  for (const f of mediaFiles) {
    if (!seen.has(f.name)) { seen.add(f.name); zip.file(`word/media/${f.name}`, f.data); }
  }
  zip.file("_rels/.rels", PKG_RELS);
  zip.file("[Content_Types].xml", buildContentTypes(mediaFiles));

  return zip.generateAsync({ type: "nodebuffer" });
}

// ─── Verify a built DOCX (minimal inline version) ───────────────────────────

async function verifyDocx(buf, label) {
  const zip = await JSZip.loadAsync(buf);

  // Parse rels
  const relsXmlStr = await zip.file("word/_rels/document.xml.rels")?.async("string") || "";
  const relsMap    = new Map();
  for (const m of relsXmlStr.matchAll(/<Relationship\s+((?:[^>"]|"[^"]*")*)\s*\/?>/g)) {
    const attrs = {};
    for (const a of m[1].matchAll(/(\w+)="([^"]*)"/g)) attrs[a[1]] = a[2];
    if (attrs.Id) relsMap.set(attrs.Id, { type: attrs.Type||"", target: attrs.Target||"", mode: attrs.TargetMode||"Internal" });
  }

  const docXml  = await zip.file("word/document.xml")?.async("string") || "";
  const embeds  = [...docXml.matchAll(/[\w][\w-]*:embed="([^"]+)"/g)].map(m => m[1]);
  const imgEmbs = embeds.filter(rId => { const r = relsMap.get(rId); return r && r.type.includes("/image"); });
  const extImgs = [...relsMap.entries()].filter(([,r]) => r.mode === "External" && r.type.includes("/image"));

  if (extImgs.length > 0) {
    fail(`${label}: ${extImgs.length} external image rel(s) still present`);
    return;
  }
  if (imgEmbs.length === 0) {
    log(`  ${label}: no embedded images (block may not have images)`);
    return;
  }

  let allGood = true;
  for (const rId of imgEmbs) {
    const rel  = relsMap.get(rId);
    if (!rel) { fail(`${label}: r:embed="${rId}" — no rel entry`); allGood = false; continue; }
    const raw  = rel.target.replace(/^\//, "");
    const full = raw.startsWith("word/") ? raw : `word/${raw}`;
    const entry = zip.file(full);
    if (!entry) { fail(`${label}: r:embed="${rId}" → ${full} — MISSING from ZIP`); allGood = false; continue; }
    const data = await entry.async("uint8array");
    if (data.length === 0) { fail(`${label}: r:embed="${rId}" → ${full} — EMPTY`); allGood = false; continue; }
    ok(`${label}: r:embed="${rId}" → ${path.basename(full)} — ${data.length.toLocaleString()} bytes ✓`);
  }
  if (allGood) ok(`${label}: all ${imgEmbs.length} image(s) correctly embedded`);
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\nSource DOCX : ${SOURCE_DOCX}`);
  console.log(`Media ZIP   : ${SOURCE_MEDIA}`);
  console.log(`Output dir  : ${OUT_DIR}\n`);

  if (!fs.existsSync(SOURCE_DOCX)) { console.error("ERROR: Source DOCX not found"); process.exit(1); }
  if (!fs.existsSync(SOURCE_MEDIA)) { console.error("ERROR: Media ZIP not found"); process.exit(1); }

  hr("STEP 1 — Load source DOCX");
  const { zip: sourceZip, rels, docXml, stylesXml, numberingXml, themeXml, paragraphs } = await parseDocx(SOURCE_DOCX);
  ok(`Parsed ${paragraphs.length} paragraph/table nodes`);
  const extImgRels = [...rels.entries()].filter(([,r]) => r.mode === "External" && r.type.includes("/image"));
  ok(`Found ${extImgRels.length} external image relationship(s)`);

  hr("STEP 2 — Load Media ZIP");
  const mediaIndex = await buildMediaIndex(SOURCE_MEDIA);
  ok(`Media index: ${mediaIndex.size} file(s) loaded`);

  hr("STEP 3 — Pre-patch (r:link → r:embed)");
  const { patchedXml, patchCount } = applyPrePatch(docXml, rels, mediaIndex);
  ok(`Patched ${patchCount} external image rel(s) → Internal`);
  reparseParagraphNodes(patchedXml, paragraphs);
  ok("Paragraph XML nodes refreshed from patched document XML");

  hr("STEP 4 — Detect blocks");
  const blocks = findBlocks(paragraphs);
  ok(`Found ${blocks.length} block(s)`);
  for (const b of blocks) log(`  [${b.openIdx}–${b.closeIdx}] <${b.tagType}> ${b.filename || "(no filename)"}`);

  hr("STEP 5 — Build & verify every block DOCX");
  fs.mkdirSync(OUT_DIR, { recursive: true });

  let built = 0, skipped = 0;
  for (const block of blocks) {
    if (!block.filename) { skipped++; continue; }
    // Only build .doc/.docx blocks (skip .html for now)
    if (/\.html?$/i.test(block.filename)) { skipped++; continue; }

    const outName = block.filename.replace(/\.doc$/i, ".docx").replace(/[^a-zA-Z0-9._\- ]/g, "_");
    const outPath = path.join(OUT_DIR, outName);

    try {
      const buf = await buildDocx(block, paragraphs, rels, patchedXml, stylesXml, numberingXml, themeXml);
      if (!buf) { log(`  SKIP ${outName}: no content nodes`); skipped++; continue; }
      fs.writeFileSync(outPath, buf);
      built++;
      await verifyDocx(buf, outName);
    } catch (err) {
      fail(`${outName}: build failed — ${err.message}`);
    }
  }

  hr("SUMMARY");
  console.log(`  Blocks built  : ${built}`);
  console.log(`  Blocks skipped: ${skipped}`);
  console.log(`  Checks passed : ${passed}`);
  console.log(`  Checks failed : ${failed}`);
  console.log(`  Output dir    : ${OUT_DIR}\n`);

  if (failed === 0) {
    console.log("  ✓ All checks passed — every block DOCX has its images correctly embedded\n");
  } else {
    console.log(`  ✗ ${failed} check(s) failed — see details above\n`);
    process.exit(1);
  }
}

main().catch(err => { console.error("\nFatal:", err); process.exit(1); });
