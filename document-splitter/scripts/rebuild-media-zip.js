#!/usr/bin/env node
// Renames files in source/Media/ (spaces → underscores) and rebuilds source/Media.zip.
// Run from the repo root: node document-splitter/scripts/rebuild-media-zip.js

const fs   = require("fs");
const path = require("path");
const JSZip = require("jszip");

const MEDIA_DIR  = path.join(__dirname, "..", "source", "Media");
const ZIP_OUT    = path.join(__dirname, "..", "source", "Media.zip");

function sanitize(name) {
  return name.replace(/[\s#%&?]/g, "_");
}

async function main() {
  const entries = fs.readdirSync(MEDIA_DIR);
  let renamed = 0;

  // Rename files in place
  for (const name of entries) {
    const safe = sanitize(name);
    if (safe !== name) {
      const src  = path.join(MEDIA_DIR, name);
      const dest = path.join(MEDIA_DIR, safe);
      if (fs.existsSync(dest)) {
        console.warn(`  SKIP  "${name}" → "${safe}" (destination already exists)`);
      } else {
        fs.renameSync(src, dest);
        console.log(`  RENAME  "${name}" → "${safe}"`);
        renamed++;
      }
    }
  }

  console.log(`\n${renamed} file(s) renamed in ${MEDIA_DIR}`);

  // Rebuild Media.zip from the now-sanitized directory
  const zip = new JSZip();
  const finalEntries = fs.readdirSync(MEDIA_DIR);
  for (const name of finalEntries) {
    const filePath = path.join(MEDIA_DIR, name);
    if (!fs.statSync(filePath).isFile()) continue;
    zip.file(name, fs.readFileSync(filePath));
  }

  const buf = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  fs.writeFileSync(ZIP_OUT, buf);
  console.log(`\nRebuilt ${ZIP_OUT} with ${finalEntries.length} file(s)`);
}

main().catch(e => { console.error(e); process.exit(1); });
