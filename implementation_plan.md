# QR Video Portal — Implementation Plan

## Goal

Build a **lightweight, mobile-first web portal** that gates 60–70 unlisted YouTube videos behind a one-time demographic registration form. Users arrive via QR code → register once (localStorage persisted) → watch their video. Every view is logged. A password-protected admin dashboard shows registration demographics and per-video analytics — all backed by **Google Sheets** as the database, deployed on **Vercel** via **Next.js**.

---

## User Review Required

> [!IMPORTANT]
> **Google Sheets as a Database**: Google Sheets is ideal for a quick, visible data store the doctor can check at any time. However, it has a write rate limit of ~1 request/second per sheet. For low-to-moderate concurrent traffic (typical for a medical education portal), this is perfectly fine. If you expect viral traffic spikes, Supabase/Firebase would be better.

> [!IMPORTANT]
> **Admin Dashboard Password**: The admin password will be stored as an environment variable in Vercel (`ADMIN_PASSWORD`). It is compared server-side (via a Next.js API route) and a session cookie is issued. This is simple and secure for a single-admin use case.

> [!WARNING]
> **localStorage Limitation**: `localStorage` is scoped per browser and per device. If a user switches phone/browser, they will see the registration form again. This is by design per the doctor's spec and is acceptable for this use case.

---

## Open Questions

> [!NOTE]
> **Video IDs**: The doctor will need to provide a mapping of QR code identifiers → YouTube unlisted video IDs. The plan assumes these are stored in a JSON config file (`/src/data/videos.json`) that the developer updates. We can also expose a simple admin UI to manage this later.

> [!NOTE]
> **Google Sheets Setup**: The doctor (or developer) needs to create one Google Sheet and share it with a Google Service Account. The plan includes step-by-step instructions for this.

---

## Architecture Overview

```mermaid
flowchart TD
    QR["📱 QR Code Scan\n(yourdomain.com/watch?video=abc123)"]
    LP["Dynamic Watch Page\n(/watch)"]
    LS{"localStorage\nuser_registered?"}
    FORM["Registration Form\nName · Gender · Phone · Region · Profession"]
    SHEETS["Google Sheets\n(via Service Account API)"]
    LS_SET["Set localStorage token"]
    PLAYER["YouTube Iframe Player\n(unlisted video)"]
    ANALYTICS["Log View Event\n→ Analytics Sheet"]
    ADMIN["Admin Dashboard\n(/admin) — password protected"]

    QR --> LP
    LP --> LS
    LS -- "Not Registered" --> FORM
    FORM -- "Submit" --> SHEETS
    SHEETS --> LS_SET
    LS_SET --> PLAYER
    LS -- "Registered" --> PLAYER
    PLAYER --> ANALYTICS
    ANALYTICS --> SHEETS
    ADMIN --> SHEETS
```

---

## Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Framework | **Next.js 14** (App Router) | SSR, API routes, easy Vercel deploy |
| Styling | **Vanilla CSS** (CSS Modules) | No dependencies, full control, fast |
| Database | **Google Sheets** (Sheets API v4) | Doctor can view data directly |
| Auth (Admin) | **Session cookie + env var password** | Simplest secure approach |
| Deployment | **Vercel** | Native Next.js support, free tier |
| Video | **YouTube iframe API** | Unlisted video embed |

---

## Data Model (Google Sheets)

### Sheet 1: `registrations`
| Column | Type | Description |
|---|---|---|
| `user_id` | string | UUID auto-generated in browser |
| `name` | string | User's name |
| `gender` | string | Male / Female / Other |
| `phone` | string | Phone number |
| `region` | string | City / Region |
| `profession` | string | Specialty / Profession |
| `registered_at` | ISO datetime | Timestamp of form submission |

### Sheet 2: `analytics`
| Column | Type | Description |
|---|---|---|
| `event_id` | string | UUID per view event |
| `video_id` | string | Matches URL param `?video=xxx` |
| `user_id` | string | From localStorage (for returning users) |
| `watched_at` | ISO datetime | Timestamp of view |

### Sheet 3: `videos` (optional config)
| Column | Type | Description |
|---|---|---|
| `video_id` | string | Slug used in QR URL |
| `youtube_id` | string | Unlisted YouTube video ID |
| `title` | string | Display title |
| `language` | string | Language code |

---

## Proposed Changes

### Component: Project Scaffolding

#### [NEW] `package.json`
Initialize Next.js 14 project with required dependencies:
```json
{
  "dependencies": {
    "next": "14",
    "react": "^18",
    "react-dom": "^18",
    "googleapis": "^140",
    "uuid": "^10",
    "iron-session": "^8"
  }
}
```

#### [NEW] `.env.local` (template — never committed)
```bash
# Google Sheets Service Account
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n..."
GOOGLE_SHEET_ID=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms

# Admin Dashboard
ADMIN_PASSWORD=changeme123

# (Optional) Base URL
NEXT_PUBLIC_BASE_URL=https://yourdomain.com
```

---

### Component: Video Config

#### [NEW] `src/data/videos.json`
A simple JSON map from QR slug → YouTube video details:
```json
{
  "intro-cardiac": {
    "youtubeId": "dQw4w9WgXcQ",
    "title": "Introduction to Cardiac Health",
    "language": "en"
  },
  "diabetes-basics": {
    "youtubeId": "abc123XYZ",
    "title": "Diabetes Basics",
    "language": "en"
  }
}
```

> The developer adds entries here whenever a new QR code is created.

---

### Component: Google Sheets API Client

#### [NEW] `src/lib/sheets.ts`
Singleton Google Sheets client that the API routes use:
```typescript
import { google } from 'googleapis';

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

export const sheets = google.sheets({ version: 'v4', auth });
export const SHEET_ID = process.env.GOOGLE_SHEET_ID!;
```

---

### Component: API Routes (Next.js Route Handlers)

#### [NEW] `src/app/api/register/route.ts`
Handles POST from the demographic form. Appends a row to `registrations` sheet.

```typescript
// POST /api/register
// Body: { userId, name, gender, phone, region, profession }
// Response: { success: true }
export async function POST(req: Request) {
  const body = await req.json();
  const { userId, name, gender, phone, region, profession } = body;
  
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: 'registrations!A:G',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[
        userId, name, gender, phone,
        region, profession,
        new Date().toISOString()
      ]]
    }
  });
  
  return Response.json({ success: true });
}
```

#### [NEW] `src/app/api/track-view/route.ts`
Handles POST when a video loads. Appends to `analytics` sheet.

```typescript
// POST /api/track-view
// Body: { videoId, userId }
export async function POST(req: Request) {
  const { videoId, userId } = await req.json();
  const eventId = crypto.randomUUID();
  
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: 'analytics!A:D',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[ eventId, videoId, userId, new Date().toISOString() ]]
    }
  });
  
  return Response.json({ success: true });
}
```

#### [NEW] `src/app/api/admin/login/route.ts`
Compares submitted password to env var, issues an `iron-session` encrypted cookie.

#### [NEW] `src/app/api/admin/stats/route.ts`
Protected route that reads both sheets and aggregates:
- Total registrations
- Views per video
- Demographics breakdown (gender, profession, region)

---

### Component: Pages

#### [NEW] `src/app/watch/page.tsx` — **The Core Dynamic Page**

This is the heart of the application. It:
1. Reads `?video=xxx` from URL params
2. Looks up `videos.json` to get the YouTube ID
3. Checks/sets `localStorage` on the client
4. Shows either the **Registration Form** or the **Video Player**

```
/watch?video=intro-cardiac
         │
         ├─ video config found ──► render WatchClient component
         └─ video not found ──► 404 / "Invalid QR code" message
```

The page is a Server Component that resolves the video config, then hands off to a Client Component (`WatchClient`) that handles all browser-side logic (localStorage, form, player).

#### [NEW] `src/app/watch/WatchClient.tsx` — Client Component

```typescript
'use client';

// On mount:
// 1. Check localStorage for 'user_registered'
// 2a. If registered → show YouTubePlayer, call /api/track-view
// 2b. If not registered → show RegistrationForm
// After form submit → save to LS, show YouTubePlayer, call /api/track-view
```

**State machine:**
```
LOADING → CHECK_LS → FORM | PLAYER
                  FORM ──(submit)──► PLAYER
```

#### [NEW] `src/app/admin/page.tsx` — Admin Dashboard

Password-protected page. Uses `iron-session` to check session cookie server-side. Shows:
- Total registered users count
- Bar chart: Views per video
- Pie chart: Gender breakdown
- Table: Top regions / professions

Charts rendered with a lightweight library (e.g., **Chart.js** via `react-chartjs-2`).

#### [NEW] `src/app/admin/login/page.tsx` — Admin Login

Simple form that POSTs to `/api/admin/login`.

#### [NEW] `src/app/page.tsx` — Root Landing Page

A friendly "Scan a QR code to watch a video" placeholder page so the root URL isn't blank.

---

### Component: UI Components

#### [NEW] `src/components/RegistrationForm.tsx`
Form with:
- **Name** — text input
- **Gender** — radio buttons (Male / Female / Other / Prefer not to say)
- **Phone** — tel input with basic validation
- **Region / City** — text input
- **Profession / Specialty** — text input or searchable dropdown

On submit: calls `/api/register`, sets localStorage, fires callback to parent.

#### [NEW] `src/components/YouTubePlayer.tsx`
Embeds YouTube iframe with:
- `youtube-nocookie.com` domain for privacy
- Responsive aspect-ratio wrapper (16:9)
- `allow="autoplay; encrypted-media"` on iOS
- Fires `onReady` callback to trigger view tracking

#### [NEW] `src/components/AdminCharts.tsx`
Chart.js bar + pie charts for the dashboard.

---

### Component: Styling

#### [NEW] `src/app/globals.css`
Global design tokens: dark medical-blue palette, smooth gradients, typography (Google Fonts: **Inter**).

#### CSS Modules per component
Each component gets its own `.module.css` for scoped styles.

---

## File Tree (Final)

```
qr-video-portal/
├── src/
│   ├── app/
│   │   ├── page.tsx                    # Root landing
│   │   ├── globals.css                 # Global styles + design tokens
│   │   ├── layout.tsx                  # Root layout
│   │   ├── watch/
│   │   │   ├── page.tsx                # Server component: resolves video
│   │   │   └── WatchClient.tsx         # Client: LS check, form, player
│   │   ├── admin/
│   │   │   ├── page.tsx                # Protected dashboard
│   │   │   └── login/
│   │   │       └── page.tsx            # Login form
│   │   └── api/
│   │       ├── register/route.ts       # POST → registrations sheet
│   │       ├── track-view/route.ts     # POST → analytics sheet
│   │       └── admin/
│   │           ├── login/route.ts      # POST → set session cookie
│   │           └── stats/route.ts      # GET → aggregate analytics
│   ├── components/
│   │   ├── RegistrationForm.tsx
│   │   ├── YouTubePlayer.tsx
│   │   └── AdminCharts.tsx
│   ├── lib/
│   │   └── sheets.ts                   # Google Sheets API client
│   └── data/
│       └── videos.json                 # Video slug → YouTube ID map
├── .env.local                          # Secrets (git-ignored)
├── .env.example                        # Template for env vars
├── next.config.ts
├── package.json
└── README.md
```

---

## QR Code Strategy

Each QR code encodes a URL like:
```
https://yourdomain.com/watch?video=intro-cardiac
```

**Recommendation**: Use a redirect shortener service (e.g., [Dub.co](https://dub.co) — free, custom domain, redirects can be updated later). This means the physical printed QR codes point to `dub.co/xxx` → `yourdomain.com/watch?video=abc`, and the destination can be changed without reprinting.

---

## Google Sheets Setup Instructions (for doctor/developer)

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project → Enable **Google Sheets API**
3. Create a **Service Account** → Download JSON key
4. Copy `client_email` and `private_key` into `.env.local`
5. Create a new Google Sheet with 3 tabs: `registrations`, `analytics`, `videos`
6. Add headers to each tab (matching the data model above)
7. Share the Sheet with the service account email (Editor permission)
8. Copy the Sheet ID from the URL → add to `.env.local`

---

## Verification Plan

### Automated Tests
```bash
# Type checking
npx tsc --noEmit

# Lint
npm run lint

# Build (catches SSR/client mismatches)
npm run build
```

### Manual Verification Checklist

| Test | Steps | Expected |
|---|---|---|
| **First-time user** | Open `/watch?video=intro-cardiac` in fresh browser | Registration form appears |
| **Form submission** | Fill and submit form | Row appears in `registrations` sheet within ~2s |
| **Returning user** | Reload same page | Form is skipped, video loads immediately |
| **View tracking** | Watch video | Row appears in `analytics` sheet |
| **Invalid video** | `/watch?video=notexist` | Friendly error message |
| **Admin login** | Go to `/admin`, enter correct password | Dashboard with charts loads |
| **Admin wrong password** | Enter wrong password | Error message, no access |
| **iOS Safari** | Test on iPhone (Safari + Chrome iOS) | Registration + video works |
| **Android Chrome** | Test on Android | Registration + video works |
| **In-app browser** | Open QR link from WhatsApp / Instagram | Registration + video works |
| **QR code scan** | Print or display a QR code, scan with phone camera | Correct video loads |

---

## Deployment Steps (Vercel)

1. Push code to GitHub (repo: `devenkhatri/qr-video-portal`)
2. Import repo into [Vercel](https://vercel.com)
3. Add all env vars from `.env.local` in Vercel dashboard → Settings → Environment Variables
4. Deploy → get `*.vercel.app` URL or connect custom domain
5. Update QR code redirect links to point to production URL

---

## Estimated Build Order

| Phase | Tasks | Estimated Time |
|---|---|---|
| **Phase 1** | Scaffold Next.js, setup Google Sheets client, create API routes | 2–3 hrs |
| **Phase 2** | Build Watch page: LS logic, Registration Form, YouTube Player | 3–4 hrs |
| **Phase 3** | Build Admin dashboard: login, charts, stats API | 2–3 hrs |
| **Phase 4** | Styling (mobile-first, premium feel) | 2–3 hrs |
| **Phase 5** | QA testing (mobile browsers, in-app browsers) + deploy | 1–2 hrs |
| **Total** | | **~10–15 hrs** |
