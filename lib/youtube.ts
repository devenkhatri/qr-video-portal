/**
 * Utility functions for YouTube URL parsing and extraction.
 */

/**
 * Extracts a YouTube Video ID from various YouTube URL formats or returns the ID if already clean.
 *
 * Supported formats:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - https://www.youtube.com/v/VIDEO_ID
 * - https://www.youtube.com/shorts/VIDEO_ID
 * - https://www.youtube.com/live/VIDEO_ID
 * - https://m.youtube.com/watch?v=VIDEO_ID
 * - https://music.youtube.com/watch?v=VIDEO_ID
 * - Direct 11-character video ID: VIDEO_ID
 */
export function extractYouTubeId(urlOrId: string): string | null {
  if (!urlOrId || typeof urlOrId !== 'string') return null;
  const input = urlOrId.trim();

  // If already an 11-char YouTube ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(input)) {
    return input;
  }

  // Regex covering standard YouTube paths & query parameters:
  // - youtube.com/watch?v=ID (and with extra query params before or after)
  // - youtu.be/ID
  // - youtube.com/embed/ID
  // - youtube.com/v/ID
  // - youtube.com/shorts/ID
  // - youtube.com/live/ID
  const patterns = [
    // youtu.be/ID or youtube.com/(embed|v|shorts|live)/ID
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|shorts\/|live\/))([a-zA-Z0-9_-]{11})/i,
    // youtube.com/watch?...v=ID
    /youtube\.com\/watch\?(?:.*&)?v=([a-zA-Z0-9_-]{11})/i,
  ];

  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  // Fallback: robust URL parsing
  try {
    const urlString = input.startsWith('http://') || input.startsWith('https://')
      ? input
      : `https://${input}`;
    const parsed = new URL(urlString);
    const host = parsed.hostname.toLowerCase();

    if (host.includes('youtube.com')) {
      const v = parsed.searchParams.get('v');
      if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) {
        return v;
      }
      const parts = parsed.pathname.split('/').filter(Boolean);
      // Handles /embed/ID, /v/ID, /shorts/ID, /live/ID
      if (parts.length >= 2 && ['embed', 'v', 'shorts', 'live'].includes(parts[parts.length - 2].toLowerCase())) {
        const id = parts[parts.length - 1];
        if (/^[a-zA-Z0-9_-]{11}$/.test(id)) return id;
      }
      for (const part of parts) {
        if (/^[a-zA-Z0-9_-]{11}$/.test(part)) return part;
      }
    } else if (host.includes('youtu.be')) {
      const parts = parsed.pathname.split('/').filter(Boolean);
      if (parts[0] && /^[a-zA-Z0-9_-]{11}$/.test(parts[0])) {
        return parts[0];
      }
    }
  } catch {
    // ignore URL parsing error
  }

  return null;
}

/**
 * Returns a YouTube thumbnail image URL for a given YouTube ID.
 * Uses mqdefault (320x180) by default.
 */
export function getYouTubeThumbnail(youtubeId: string): string {
  return `https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`;
}
