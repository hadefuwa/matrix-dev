"use strict";
// Content provider: reads the public WordPress REST API of the Matrix site.
// A PHP/WP_Query port would implement the same two functions: searchSite, readPage.

const SITE_BASE = (process.env.CHAT_SITE_BASE || "https://www.matrixtsl.com").replace(/\/+$/, "");
const ALLOWED_HOSTS = new Set(
  (process.env.CHAT_ALLOWED_HOSTS || "www.matrixtsl.com,matrixtsl.com").split(",").map((h) => h.trim().toLowerCase())
);
const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_PAGE_CHARS = Number(process.env.CHAT_MAX_PAGE_CHARS || 6000);
const FETCH_TIMEOUT_MS = 10000;
const TYPES = ["product", "page", "post", "learning-centre", "case-studies", "teacher-resources"];

const cache = new Map();
function cached(key, loader) {
  const hit = cache.get(key);
  if (hit && hit.exp > Date.now()) return Promise.resolve(hit.val);
  return loader().then((val) => {
    cache.set(key, { val, exp: Date.now() + CACHE_TTL_MS });
    if (cache.size > 500) cache.delete(cache.keys().next().value);
    return val;
  });
}

function isAllowedUrl(raw) {
  try {
    const u = new URL(raw);
    return u.protocol === "https:" && ALLOWED_HOSTS.has(u.hostname.toLowerCase()) && !u.username && !u.password;
  } catch (_) {
    return false;
  }
}

async function safeFetch(url, accept) {
  // Manual redirects so every hop is re-checked against the allow-list (SSRF guard).
  let current = url;
  for (let i = 0; i < 4; i++) {
    if (!isAllowedUrl(current)) throw new Error("URL is not on the Matrix site");
    const res = await fetch(current, {
      redirect: "manual",
      headers: { Accept: accept, "User-Agent": "MatrixChatbot/1.0" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
    });
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      current = new URL(res.headers.get("location"), current).toString();
      continue;
    }
    if (!res.ok) throw new Error(`Site returned HTTP ${res.status}`);
    return res;
  }
  throw new Error("Too many redirects");
}

function decodeEntities(s) {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&apos;|&rsquo;|&lsquo;/g, "'").replace(/&ndash;|&mdash;/g, "-");
}

function htmlToText(html) {
  let h = html
    .replace(/<(script|style|noscript|svg|nav|footer|header|form|iframe)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");
  h = h.replace(/<a\s[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (_, href, inner) => {
    const txt = inner.replace(/<[^>]+>/g, "").trim();
    return /\.pdf(\?|$)/i.test(href) ? ` ${txt} [PDF: ${href}] ` : ` ${txt} `;
  });
  h = h.replace(/<\/(p|div|li|h[1-6]|tr|br)>|<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, " ");
  return decodeEntities(h).replace(/[ \t\f\r]+/g, " ").replace(/\n\s*/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

async function getJson(url) {
  return (await safeFetch(url, "application/json")).json();
}

async function searchSite(query) {
  const q = String(query || "").trim().slice(0, 200);
  if (!q) return { error: "Empty query" };
  return cached(`s:${q.toLowerCase()}`, async () => {
    const url = `${SITE_BASE}/wp-json/wp/v2/search?search=${encodeURIComponent(q)}&per_page=5&_fields=id,title,url,subtype`;
    const items = await getJson(url);
    return {
      results: items.map((r) => ({ title: decodeEntities(r.title || ""), url: r.url, type: r.subtype })),
      note: items.length ? undefined : "No results. Try different keywords."
    };
  });
}

async function resolveRestItem(url) {
  const u = new URL(url);
  const slug = u.pathname.split("/").filter(Boolean).pop();
  if (!slug) return null;
  for (const type of TYPES) {
    try {
      const items = await getJson(`${SITE_BASE}/wp-json/wp/v2/${type}?slug=${encodeURIComponent(slug)}&_fields=title,content,link,excerpt`);
      if (Array.isArray(items) && items.length) return items[0];
    } catch (_) {}
  }
  return null;
}

async function readPage(url) {
  if (!isAllowedUrl(url)) return { error: "Only pages on the Matrix TSL website can be read." };
  const key = `p:${url}`;
  return cached(key, async () => {
    let title = "", text = "";
    const item = await resolveRestItem(url).catch(() => null);
    if (item) {
      title = decodeEntities((item.title && item.title.rendered) || "");
      text = htmlToText((item.content && item.content.rendered) || "");
    }
    if (text.length < 200) {
      // Fallback for builder-rendered pages: fetch HTML and keep <main> content.
      const html = await (await safeFetch(url, "text/html")).text();
      const t = html.match(/<title>([\s\S]*?)<\/title>/i);
      if (t && !title) title = decodeEntities(t[1]).trim();
      const body = (html.match(/<main[\s\S]*?<\/main>/i) || [html])[0];
      text = htmlToText(body);
    }
    const truncated = text.length > MAX_PAGE_CHARS;
    return { url, title, content: text.slice(0, MAX_PAGE_CHARS), truncated };
  });
}

module.exports = { searchSite, readPage, isAllowedUrl, SITE_BASE };
