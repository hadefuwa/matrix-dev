# Google Search Console Removal Steps

Use this after deployment so Google removes already indexed pages faster.

## 1) Verify property

1. Open Google Search Console.
2. Select your domain property for this site.

## 2) Request fast temporary removals

1. Open `Indexing` -> `Removals`.
2. Click `New request`.
3. Choose `Temporarily remove URL`.
4. Submit each sensitive URL (or submit a prefix pattern if needed).

## 3) Confirm noindex is visible to Google

1. Open `URL Inspection`.
2. Paste a page URL from your site.
3. Click `Test live URL`.
4. Confirm Google can see:
   - `<meta name="robots" content="noindex, nofollow">`, or
   - `X-Robots-Tag: noindex, nofollow`.
5. Click `Request indexing` so Google recrawls and processes deindex signals.

## 4) Check progress

1. Wait for recrawl and processing.
2. Re-check with `site:yourdomain.com` search query.
3. Repeat inspection/removal for any remaining URLs.
