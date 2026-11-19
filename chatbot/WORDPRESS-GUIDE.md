# Matrix TSL chatbot: getting it onto the WordPress site

## What exists today

| Piece | Location | Notes |
|---|---|---|
| Tool loop (OpenRouter, max 4 tool calls) | `chatbot/chat.js` | Default model `z-ai/glm-5.3`; override with `CHAT_MODEL` |
| Site tools: `search_site`, `read_page` | `chatbot/site.js` | Reads the public WP REST API of matrixtsl.com, https + allow-listed hosts only |
| System prompt | `chatbot/system-prompt.md` | Placeholders `{{CONTACT_URL}}`, `{{MAX_TOOL_CALLS}}` |
| Endpoint | `POST /api/chatbot/message` | Live at https://matrixtsl.dev, per-IP rate limit |
| Widget | `chatbot/widget/widget.js` | Vanilla JS, no dependencies; endpoint set with `data-endpoint` |
| Eval | `chatbot/evals/questions.json`, `run-evals.js` | 50 questions; `CHAT_MODEL=... node chatbot/evals/run-evals.js` |

**There is no data to export.** The bot has no database or vector store. It searches and reads the live website on every question. Only the prompt, the tool contracts and the eval carry over to WordPress.

Measured cost: about $0.001 per question on GLM 5.3 (about $0.014 on Sonnet 5.5).

---

## Option A: Our own plugin running inside WordPress

A PHP port of `chat.js` and `site.js`, installed on the marketing team's WordPress.

**How it works**
- REST route `/wp-json/matrix-chat/v1/message`.
- `search_site` uses `WP_Query` over pages, posts and the product, learning-centre, case-studies and teacher-resources post types.
- `read_page` loads the post content from the database, strips HTML, caps length, and only accepts URLs on the site's own domain.
- Key stored as `define('MATRIX_CHAT_OPENROUTER_KEY', '...');` in `wp-config.php`. Model set by `MATRIX_CHAT_MODEL`.
- The widget is enqueued by the plugin. Prompt is a text file in the plugin folder.

**Carry over from this repo:** `system-prompt.md`, `widget.js`, `questions.json` (point `EVAL_ENDPOINT` at the WP route to run the eval).

**Pros:** everything on one site; reads WordPress directly (correct handling of drafts, private and password-protected content); no dependency on matrixtsl.dev; logging can use a WP table.
**Cons:** needs a PHP port; needs a test WordPress to verify; a second copy of the prompt to keep in sync.
**Effort:** a few days including testing.

**Needed from the marketing team:** a staging WordPress, permission to install a plugin, and a way to edit `wp-config.php`.

---

## Option B: Thin plugin that calls the existing Railway endpoint

A tiny plugin that only loads `widget.js` and sends questions to `https://matrixtsl.dev/api/chatbot/message`.

**How it works**
- Plugin enqueues the widget script with `data-endpoint` pointing at the Railway URL.
- The API key stays on Railway only.
- **Not done yet:** CORS headers plus an origin allow-list on the endpoint, so only matrixtsl.com can call it (about 20 lines in `server.js`).

**Pros:** fastest route to the real site; no PHP port; one prompt, one place to update; updates deploy via git push.
**Cons:** the production site depends on matrixtsl.dev being up; the bot still reads WordPress over public REST rather than the database; cross-origin requests need the allow-list; the Railway service becomes a production dependency, so treat it accordingly.
**Effort:** under a day.

**Needed from the marketing team:** permission to install a small plugin (or a snippet in the theme footer).

---

## Option C: Off-the-shelf WordPress chatbot plugin

Commercial or free AI chat plugins from the plugin directory.

- Most index the site into their own store (often a vector database or a vendor's cloud). IT has said no to a vector database, so check the plugin's data flow first.
- Some let you paste a custom system prompt. You can reuse the rules from `system-prompt.md`.
- You lose control of the tool loop, the 4-call limit, citations, `read_page` host restrictions, and our eval harness.
- Check where visitor questions are sent and stored (GDPR), and the monthly price.

**Pros:** no development.
**Cons:** vendor data handling; less control over grounding and guard-rails; recurring cost; hard to run our eval against it.

---

## Quick comparison

| | A: Own plugin | B: Thin plugin | C: Off-the-shelf |
|---|---|---|---|
| Time to live | Days | Under a day | Hours |
| Needs matrixtsl.dev running | No | Yes | No |
| Reads WP database directly | Yes | No (public REST) | Depends |
| Our prompt and eval apply | Yes | Yes | Partly |
| Data stays with us | Yes | Yes | Check vendor |
| Ongoing cost | OpenRouter only | OpenRouter + Railway | Vendor fee + usage |

**Suggested path:** B to get a live pilot on the real site quickly, then A if the marketing team wants it fully self-contained.

---

## Still to build (any option)

- Global daily spend cap with a "contact us" fallback.
- Question and answer logging with a retention setting.
- Nonce or origin check (required for B).
- PDF and datasheet handling: today `read_page` only surfaces PDF links as `[PDF: url]`; reading PDF contents would need a text-extraction step and caching.

## GDPR notes for logging and the widget

- Questions can contain personal data (names, emails, order details). Add a short privacy notice in the widget and link the privacy policy.
- Log only what is needed, set a short retention period (for example 30 to 90 days), and make deletion possible.
- OpenRouter and the model provider process the questions. Record them as processors in the privacy policy and check OpenRouter's data-handling settings.
- Do not store IP addresses in logs, or hash them.

## Keeping things in sync

If both the Node and PHP versions exist, treat `system-prompt.md` as the single source and copy it into the plugin on release. Re-run `questions.json` against whichever endpoint is live before each change goes out, and compare models with `CHAT_MODEL`.
