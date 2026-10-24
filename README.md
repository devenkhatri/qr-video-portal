# 🏥 QR Video Portal & Analytics Engine

A lightweight, mobile-first web application designed to host and gate 60–70 unlisted educational YouTube videos behind a one-time demographic registration form, complete with an analytics dashboard.

---

## 🚀 Features

- **Single Dynamic Page Template**: Dynamic routing via `/watch?video=xxx` eliminates the need to create separate pages for every video.
- **One-Time Demographic Gate**: Collects user details (Name, Gender, Phone, Region, Profession) on first scan. Persisted via `localStorage` so returning viewers are never prompted again.
- **Privacy-First Video Embedding**: YouTube player embedded securely via `youtube-nocookie.com`.
- **Google Sheets Integration**: Stores user registrations and video view events directly in Google Sheets.
- **Protected Analytics Dashboard**: Password-protected `/admin` dashboard featuring Chart.js KPI cards, views-per-video bar charts, gender breakdown pie charts, and recent registration logs.
- **Mobile-First UX**: Optimized for in-app web views (WhatsApp, Instagram, camera QR scanners) and mobile browsers (iOS Safari, Android Chrome).

---

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Vanilla CSS (CSS Modules) with modern dark medical-blue theme
- **Authentication**: `iron-session` encrypted session cookies
- **Database**: Google Sheets API v4
- **Charts**: Chart.js & React-Chartjs-2

---

## 📦 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
Set the following keys:
- `ADMIN_PASSWORD`: Password for accessing the `/admin` dashboard (default: `admin123`).
- `SESSION_SECRET`: Random 32+ character string for cookie encryption.
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`: Google Cloud Service Account email.
- `GOOGLE_PRIVATE_KEY`: Service Account RSA private key.
- `GOOGLE_SHEET_ID`: Target Google Spreadsheet ID.

*(Note: If Google credentials are not set, the app will run in Demo Simulation Mode for local previewing.)*

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📱 QR Code URL Structure

Each QR code should point to:
```
https://yourdomain.com/watch?video=<video-slug>
```

Example links:
- `http://localhost:3000/watch?video=intro-cardiac`
- `http://localhost:3000/watch?video=diabetes-basics`
- `http://localhost:3000/watch?video=hypertension-101`

To add more videos, simply add an entry to [`data/videos.json`](./data/videos.json):
```json
{
  "new-video-slug": {
    "youtubeId": "UNLISTED_YOUTUBE_ID",
    "title": "Title of the Video",
    "language": "en",
    "description": "Short summary of the lecture or topic.",
    "category": "Cardiology",
    "tags": ["Heart Health", "Prevention", "ECG Basics"]
  }
}
```

---

## 📊 Google Sheets Setup

Create a Google Sheet with two tabs:
1. **`registrations`**:
   - Headers: `user_id`, `name`, `gender`, `phone`, `region`, `profession`, `registered_at`
2. **`analytics`**:
   - Headers: `event_id`, `video_id`, `user_id`, `watched_at`

Share the sheet with your Service Account email with **Editor** permissions.
