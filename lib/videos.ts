import { getSheetsClient, SHEET_ID, RANGES } from './sheets';
import fallbackVideos from '@/data/videos.json';
import { VideoConfig } from '@/types/video';

// In-memory videos store for fallback/demo mode
const inMemoryVideos: Record<string, VideoConfig> = { ...fallbackVideos };

// Cache video list in-memory for 60 seconds to avoid hitting Google Sheets API rate limits
let cachedVideos: Record<string, VideoConfig> | null = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 60 * 1000; // 1 minute

export function invalidateVideosCache() {
  cachedVideos = null;
  lastFetchTime = 0;
}

export async function getAllVideos(forceRefresh = false): Promise<Record<string, VideoConfig>> {
  const now = Date.now();
  if (!forceRefresh && cachedVideos && now - lastFetchTime < CACHE_TTL_MS) {
    return cachedVideos;
  }

  // If Google Sheets credentials are not configured, use local fallback
  if (!SHEET_ID || !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
    return inMemoryVideos as Record<string, VideoConfig>;
  }

  try {
    const sheets = getSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: RANGES.videos,
    });

    const rows = response.data.values || [];
    // If sheet has only header or is empty, fall back to inMemoryVideos
    if (rows.length <= 1) {
      console.warn('[videos] "videos" sheet is empty or only has headers; using fallback');
      return inMemoryVideos as Record<string, VideoConfig>;
    }

    // Skip header row: [video_id, youtube_id, title, language, category, tags, description]
    const dataRows = rows.slice(1);
    const result: Record<string, VideoConfig> = {};

    for (const row of dataRows) {
      const videoId = (row[0] || '').trim();
      const youtubeId = (row[1] || '').trim();
      const title = (row[2] || '').trim();

      // Skip row if missing key identifiers
      if (!videoId && !youtubeId) continue;

      const key = videoId || youtubeId;
      const language = (row[3] || 'en').trim();
      const category = (row[4] || 'General').trim();
      const tagsRaw = (row[5] || '').trim();
      const tags = tagsRaw
        ? tagsRaw.split(',').map((t: string) => t.trim()).filter(Boolean)
        : [];
      const description = (row[6] || '').trim();

      result[key] = {
        youtubeId: youtubeId || videoId,
        title: title || key,
        language,
        category,
        tags,
        description,
      };
    }

    if (Object.keys(result).length > 0) {
      cachedVideos = result;
      lastFetchTime = now;
      return result;
    }

    return inMemoryVideos as Record<string, VideoConfig>;
  } catch (err) {
    console.error('[videos] Failed to fetch videos from Google Sheets; using fallback:', err);
    return cachedVideos || (inMemoryVideos as Record<string, VideoConfig>);
  }
}

/**
 * Finds a video by YouTube ID (preferred) or internal slug/ID
 */
export async function findVideo(param: string): Promise<VideoConfig | null> {
  const all = await getAllVideos();
  return (
    Object.values(all).find(v => v.youtubeId === param) ??
    all[param] ??
    null
  );
}

export interface AddVideoInput {
  videoId?: string;
  youtubeId: string;
  title: string;
  language?: string;
  category?: string;
  tags?: string[];
  description?: string;
}

/**
 * Adds a new video to the Google Sheet (or in-memory store in demo mode)
 */
export async function addVideo(input: AddVideoInput): Promise<{
  video: VideoConfig & { videoId: string };
  sheetAppended: boolean;
}> {
  const youtubeId = input.youtubeId.trim();
  const title = input.title.trim();
  const language = (input.language || 'en').trim();
  const category = (input.category || 'Oncology').trim();
  const tags = input.tags || [];

  const description = (input.description || '').trim();

  // Determine videoId (slug)
  let videoId = (input.videoId || '').trim();
  if (!videoId) {
    videoId = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    if (!videoId) {
      videoId = youtubeId;
    }
  }

  // Sanitize videoId
  videoId = videoId.toLowerCase().replace(/[^a-z0-9_-]/g, '-').replace(/-+/g, '-');

  const newVideo: VideoConfig = {
    youtubeId,
    title,
    language,
    category,
    tags,
    description,
  };

  // If Google Sheets credentials are configured
  if (SHEET_ID && process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
    const sheets = getSheetsClient();

    // Check if sheet has headers or is empty
    try {
      const checkResponse = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: RANGES.videos,
      });

      const existingRows = checkResponse.data.values || [];
      if (existingRows.length === 0) {
        // Append headers first: [video_id, youtube_id, title, language, category, tags, description]
        await sheets.spreadsheets.values.append({
          spreadsheetId: SHEET_ID,
          range: RANGES.videos,
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [
              ['video_id', 'youtube_id', 'title', 'language', 'category', 'tags', 'description'],
            ],
          },
        });
      }
    } catch (checkErr) {
      console.warn('[videos] Could not verify existing headers on sheet, attempting append:', checkErr);
    }

    // Append the new video row
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: RANGES.videos,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[
          videoId,
          youtubeId,
          title,
          language,
          category,
          tags.join(', '),
          description,
        ]],
      },
    });

    invalidateVideosCache();

    return {
      video: { ...newVideo, videoId },
      sheetAppended: true,
    };
  }

  // Fallback / Demo simulation mode
  inMemoryVideos[videoId] = newVideo;
  invalidateVideosCache();

  return {
    video: { ...newVideo, videoId },
    sheetAppended: false,
  };
}

