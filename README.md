# Cancer Care Guidebook

A mobile-first, multilingual guidebook. Readers scan a QR code (or open the site), choose a language, pick a **chapter**, and read its **points** one page at a time. Each point can have text, images and a YouTube video. Content lives in a Google Sheet, so it can be edited without touching code.

The product name is set in one place: [`lib/site.ts`](./lib/site.ts).

---

## How it works

```
Language  →  Chapters  →  Chapter overview  →  Point page
  /          /guide       /guide/<chapter>     /guide/<chapter>/<point>
```

All pages take `?lang=gu|hi|en`. Gujarati is the default.

- **Chapters** are cards with an icon, an accent colour, a description and a point count.
- **Chapter overview** lists every point; each point opens on its own page.
- **Point page** shows one point with progress ("2 / 8"), previous/next navigation and, on the last point, a link to the next chapter.
- **Reader comforts** (all stored on the reader's own device, nothing is sent anywhere): a language switch in the header that keeps the same page, a text-size control on point pages, tap-to-zoom images, "Continue reading" on the home page, check marks and per-chapter progress. Every page ends with a medical disclaimer.
- **Registration gate**: on the first chapter or point page a visitor opens, a one-time form (mobile number, name, age, gender, location) is shown. After that every page stays open. State is kept in cookies and `localStorage`.
- **QR codes**: the public chapter cards and point pages have a QR button, and the admin dashboard can generate print-ready cards for the whole guidebook, every chapter and every point.
- **Admin** (`/admin`, password protected): registration charts, a Chapters tab (reading stats and QR codes for every chapter and point) and a **Content** tab for editing everything below without opening the Google Sheet.

---

## Editing content (admin)

Sign in at `/admin` and open the **Content** tab (`/admin?tab=content`). The admin is built mobile-first: on a phone the three sections (Analytics, Chapters, Content) sit in a bottom tab bar.

- **Add chapter / Add point**: a form with Gujarati, Hindi and English tabs (a green dot marks languages that have content). Points take a heading, text and YouTube link per language, plus a shared list of image links.
- **Edit**: changes the text, images, video links and visibility. A point stays in its chapter, and ids never change, so printed QR codes keep working.
- **▲ ▼**: reorder chapters, or points within a chapter. Order numbers are renumbered for you.
- **Hide / Show**: hidden items stay in the Sheet but are not shown to readers. Nothing is ever deleted by the app; to remove a row permanently, delete it in the Sheet.
- **Open ↗**: opens the reader page in a new tab.

Everything is saved to the `chapters` and `points` tabs below, so the Sheet remains the source of truth and can still be edited directly. Readers see changes within about a minute (content is cached for 60 seconds).

Images are links, not uploads: paste any public image URL, or a Google Drive share link (shared as "Anyone with the link").

---

## Google Sheet

Share the sheet with your service account email (**Editor**). The app reads these tabs; columns are matched by **header name**, so their order does not matter.

### `chapters`

| Column | Notes |
|---|---|
| `chapter_id` | Short, URL-safe id, e.g. `diagnosis`. Used in links and QR codes, so don't rename it after printing. |
| `order` | Number; chapters are sorted by it. |
| `title_gu`, `title_en`, `title_hi` | Chapter title per language. |
| `active` | `FALSE` or `no` hides the chapter. Blank means visible. |
| `icon` | Optional emoji shown on the card. |
| `description_gu`, `description_en`, `description_hi` | Optional one-line description per language. |

### `points`

| Column | Notes |
|---|---|
| `point_id` | Unique id, e.g. `diagnosis-1`. Used in links and QR codes, so don't rename it after printing. |
| `chapter_id` | Must match a row in `chapters`. |
| `order` | Number; points are sorted by it within the chapter. |
| `heading_gu`, `heading_en`, `heading_hi` | Point title per language. |
| `text_gu`, `text_en`, `text_hi` | Body text per language. Line breaks are kept. |
| `image_urls` | 0 or more image URLs, separated by commas or new lines. Google Drive share links are converted automatically (the file must be shared as "Anyone with the link"). |
| `video_url_gu`, `video_url_en`, `video_url_hi` | Optional YouTube link or id **per language**. |
| `active` | `FALSE` or `no` hides the point. Blank means visible. |

**Language fallback.** If a heading or text is empty in the chosen language, the first available language is shown instead. Videos never fall back: a Gujarati reader is not shown an English video, so a point shows no video when its language has none.

**Adding a language.** Add `_xx` columns in both tabs and one entry in [`lib/languages.ts`](./lib/languages.ts) (plus the small UI labels in [`lib/strings.ts`](./lib/strings.ts)).

### `registrations` (written by the app)

`user_id, name, age, gender, mobile, email, country, state, district, user_type, registered_at`

A repeat registration with the same mobile number updates the existing row.

### `analytics` (written by the app)

`event_id, video_id, user_id, watched_at, language`

The `video_id` column holds a **chapter id** (chapter overview views) or a **point id** (point page views). The admin Chapters tab rolls point views up to their chapter.

### `videos` (retired)

The old per-video catalog is no longer read. The tab can stay in the sheet or be deleted.

---

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run dev                  # http://localhost:3000
```

Environment variables:

- `ADMIN_PASSWORD`: password for `/admin`.
- `SESSION_SECRET`: random string of 32+ characters for cookie encryption.
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`, `GOOGLE_SHEET_ID`: Google Sheets access.
- `NEXT_PUBLIC_APP_URL`: public site URL (used for page metadata).

**Demo mode.** Without the Google variables the app runs on the sample content in [`data/guide.json`](./data/guide.json) and simulates registration and tracking, so it can be previewed without a sheet. Content is cached for 60 seconds, so Sheet edits show up within a minute.

### Checks

```bash
npm run lint
npm run build
```

> Don't run `npm run build` while `npm run dev` is running in the same folder: both write to `.next` and the dev server breaks. Stop it first, or delete `.next` and restart it afterwards.

---

## QR code links

| Target | URL |
|---|---|
| Whole guidebook (language selector) | `https://yourdomain.com/` |
| A chapter | `https://yourdomain.com/guide/<chapter_id>?lang=gu` |
| A single point | `https://yourdomain.com/guide/<chapter_id>/<point_id>?lang=gu` |

Download print-ready cards from `/admin` → **Chapters**. Pick the QR language first; the title on the card follows it.

---

## Tech stack

Next.js 14 (App Router) · TypeScript · CSS Modules · `iron-session` · Google Sheets API v4 · Chart.js · `qrcode`. Design notes are in [`.impeccable.md`](./.impeccable.md).
