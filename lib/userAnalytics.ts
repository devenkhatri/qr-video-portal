import { getSheetsClient, SHEET_ID, RANGES } from './sheets';
import { getGuideIndex, type GuideIndex } from './guide';
import { normalizeMobile } from './mobile';

/* ------------------------------------------------------------------ */
/* Raw data                                                            */
/* ------------------------------------------------------------------ */

export interface RawUser {
  userId: string;
  name: string;
  age: string;
  gender: string;
  mobile: string;
  email: string;
  country: string;
  state: string;
  district: string;
  userType: string;
  registeredAt: number; // epoch ms, 0 when unknown
  source: string;
  /** Every user_id this person has ever had (registrations can be re-submitted). */
  aliases: string[];
}

export interface RawEvent {
  itemId: string; // point id, or chapter id for chapter-level opens
  userId: string;
  at: number;
  lang: string;
}

export interface AnalyticsData {
  users: RawUser[];
  events: RawEvent[];
  isDemo: boolean;
}

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Calendar day (YYYY-MM-DD) in India time, so "today" matches what the admin sees. */
function istDay(ms: number): string {
  return new Date(ms + IST_OFFSET_MS).toISOString().slice(0, 10);
}

function toMs(v: string | undefined): number {
  const t = v ? new Date(v).getTime() : NaN;
  return Number.isFinite(t) ? t : 0;
}

/** Mobile numbers are personal data: lists show only the last four digits. */
export function maskMobile(mobile: string): string {
  const digits = normalizeMobile(mobile) || mobile || '';
  if (!digits) return '';
  return digits.length <= 4 ? digits : `${'•'.repeat(Math.max(0, digits.length - 4))}${digits.slice(-4)}`;
}

/** Groups "Other: something" under a single "Other" bucket for segment analysis. */
export function userTypeGroup(userType: string): string {
  if (!userType) return 'Not specified';
  return userType.startsWith('Other') ? 'Other' : userType;
}

// Short in-memory cache so the Analytics and Users tabs don't each re-read the whole Sheet
let cache: { at: number; data: AnalyticsData } | null = null;
const CACHE_TTL_MS = 10 * 1000;

export async function loadAnalyticsData(): Promise<AnalyticsData> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.data;

  const data =
    !SHEET_ID || !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ? await buildDemoData() : await loadFromSheets();
  cache = { at: Date.now(), data };
  return data;
}

async function loadFromSheets(): Promise<AnalyticsData> {
  const sheets = getSheetsClient();
  const [regRes, evRes] = await Promise.all([
    sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: RANGES.registrations }),
    sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: RANGES.analytics }),
  ]);

  // Column layout: [0] userId [1] name [2] age [3] gender [4] mobile [5] email [6] country
  // [7] state [8] district [9] userType [10] registered_at [11] source
  const regRows = (regRes.data.values || []).filter(r => r[0] && r[0] !== 'user_id');

  // One person per mobile number; the latest row wins, but every old user_id stays an alias
  const byKey = new Map<string, RawUser>();
  for (const r of regRows) {
    const key = normalizeMobile(r[4]) || r[0];
    const prev = byKey.get(key);
    const aliases = new Set([...(prev?.aliases ?? []), r[0]]);
    byKey.set(key, {
      userId: r[0],
      name: r[1] || '',
      age: r[2] || '',
      gender: r[3] || '',
      mobile: normalizeMobile(r[4]) || r[4] || '',
      email: r[5] || '',
      country: r[6] || '',
      state: r[7] || '',
      district: r[8] || '',
      userType: r[9] || '',
      registeredAt: toMs(r[10]),
      source: (r[11] || prev?.source || '').trim(),
      aliases: [...aliases],
    });
  }

  const events: RawEvent[] = [];
  for (const r of evRes.data.values || []) {
    if (!r[0] || r[0] === 'event_id') continue;
    const at = toMs(r[3]);
    if (!at) continue;
    events.push({ itemId: r[1] || '', userId: r[2] || '', at, lang: r[4] || '' });
  }

  return { users: [...byKey.values()], events, isDemo: false };
}

/** Deterministic sample data so the dashboard can be previewed without Google credentials. */
async function buildDemoData(): Promise<AnalyticsData> {
  const guide = await getGuideIndex();
  let seed = 7;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  const pickOne = <T,>(list: T[]): T => list[Math.floor(rand() * list.length)];

  const names = ['Asha Patel', 'Ravi Shah', 'Meena Joshi', 'Kiran Desai', 'Nilesh Mehta', 'Pooja Trivedi', 'Sanjay Rana', 'Hetal Modi', 'Vijay Solanki', 'Dr. Anita Rao', 'Dr. Manish Vyas', 'Bhavna Parmar', 'Jignesh Thakkar', 'Rekha Chauhan', 'Mahesh Gohil'];
  const types = ['Oncologist', 'Non-cancer Doctor', 'Cancer Patient', 'ASHA', 'Nurse - Coordinator', 'Other: Volunteer'];
  const places: [string, string][] = [['Gujarat', 'Ahmedabad'], ['Gujarat', 'Surat'], ['Gujarat', 'Rajkot'], ['Maharashtra', 'Mumbai'], ['Rajasthan', 'Jaipur']];
  const sources = ['', '', 'clinic-ahmedabad', 'camp-surat', 'whatsapp'];
  const langs = ['gu', 'gu', 'gu', 'hi', 'en'];
  const now = Date.now();

  const users: RawUser[] = [];
  const events: RawEvent[] = [];
  for (let i = 0; i < 64; i++) {
    const [state, district] = pickOne(places);
    const registeredAt = now - Math.floor(rand() * 60 * DAY_MS);
    const id = `demo-${i + 1}`;
    users.push({
      userId: id,
      name: `${pickOne(names)}${i > 14 ? ` ${i}` : ''}`,
      age: String(20 + Math.floor(rand() * 55)),
      gender: rand() < 0.55 ? 'Female' : 'Male',
      mobile: `9${String(Math.floor(100000000 + rand() * 899999999))}`,
      email: i % 3 === 0 ? `user${i}@example.com` : '',
      country: 'India',
      state,
      district,
      userType: pickOne(types),
      registeredAt,
      source: pickOne(sources),
      aliases: [id],
    });

    // ~70% of people go on to read; each reads a run of points in 1-4 chapters over a few days
    if (rand() < 0.7 && guide.chapters.length) {
      const lang = pickOne(langs);
      const chapterCount = 1 + Math.floor(rand() * 4);
      for (let c = 0; c < chapterCount; c++) {
        const chapter = guide.chapters[Math.floor(rand() * guide.chapters.length)];
        const dayShift = Math.floor(rand() * 5) * DAY_MS;
        const at0 = Math.min(now, registeredAt + dayShift + 60_000);
        events.push({ itemId: chapter.id, userId: id, at: at0, lang });
        const reach = Math.ceil(rand() * chapter.pointIds.length);
        chapter.pointIds.slice(0, reach).forEach((pid, k) => {
          events.push({ itemId: pid, userId: id, at: Math.min(now, at0 + (k + 1) * 90_000), lang });
        });
      }
    }
  }
  return { users, events, isDemo: true };
}

/* ------------------------------------------------------------------ */
/* Per-user rollup                                                     */
/* ------------------------------------------------------------------ */

export interface UserStats {
  views: number;
  distinctPoints: number;
  activeDays: number;
  firstActive: number;
  lastActive: number;
  languages: Record<string, number>;
  /** chapterId -> distinct points viewed */
  pointsByChapter: Record<string, number>;
  openedChapters: Set<string>;
}

function chapterOf(guide: GuideIndex, chapterIds: Set<string>, itemId: string): string | null {
  const p = guide.points[itemId];
  if (p) return p.chapterId;
  return chapterIds.has(itemId) ? itemId : null;
}

/** Joins events to registered users (through any of their user_ids). */
export function rollupUsers(data: AnalyticsData, guide: GuideIndex): Map<string, UserStats> {
  const chapterIds = new Set(guide.chapters.map(c => c.id));
  const owner = new Map<string, string>();
  for (const u of data.users) for (const a of u.aliases) owner.set(a, u.userId);

  const points = new Map<string, Set<string>>();
  const perChapter = new Map<string, Map<string, Set<string>>>();
  const days = new Map<string, Set<string>>();
  const stats = new Map<string, UserStats>();

  for (const e of data.events) {
    const uid = owner.get(e.userId);
    if (!uid) continue; // anonymous or unregistered viewers
    let s = stats.get(uid);
    if (!s) {
      s = { views: 0, distinctPoints: 0, activeDays: 0, firstActive: e.at, lastActive: e.at, languages: {}, pointsByChapter: {}, openedChapters: new Set() };
      stats.set(uid, s);
      points.set(uid, new Set());
      perChapter.set(uid, new Map());
      days.set(uid, new Set());
    }
    s.views += 1;
    s.firstActive = Math.min(s.firstActive, e.at);
    s.lastActive = Math.max(s.lastActive, e.at);
    const lang = e.lang || 'unknown';
    s.languages[lang] = (s.languages[lang] || 0) + 1;
    days.get(uid)!.add(istDay(e.at));

    const ch = chapterOf(guide, chapterIds, e.itemId);
    if (ch) s.openedChapters.add(ch);
    if (guide.points[e.itemId]) {
      points.get(uid)!.add(e.itemId);
      const m = perChapter.get(uid)!;
      if (!m.has(ch!)) m.set(ch!, new Set());
      m.get(ch!)!.add(e.itemId);
    }
  }

  for (const [uid, s] of stats) {
    s.distinctPoints = points.get(uid)!.size;
    s.activeDays = days.get(uid)!.size;
    for (const [ch, set] of perChapter.get(uid)!) s.pointsByChapter[ch] = set.size;
  }
  return stats;
}

/* ------------------------------------------------------------------ */
/* Directory (option 1), detail (2), CSV                               */
/* ------------------------------------------------------------------ */

export interface UserRow {
  userId: string;
  name: string;
  age: string;
  gender: string;
  maskedMobile: string;
  state: string;
  district: string;
  userType: string;
  source: string;
  registeredAt: number;
  views: number;
  distinctPoints: number;
  chaptersOpened: number;
  chaptersCompleted: number;
  firstActive: number;
  lastActive: number;
}

const EMPTY_STATS: UserStats = {
  views: 0, distinctPoints: 0, activeDays: 0, firstActive: 0, lastActive: 0, languages: {}, pointsByChapter: {}, openedChapters: new Set(),
};

function completedChapters(s: UserStats, guide: GuideIndex): number {
  return guide.chapters.filter(c => c.pointIds.length > 0 && (s.pointsByChapter[c.id] || 0) >= c.pointIds.length).length;
}

export function buildUserRows(data: AnalyticsData, guide: GuideIndex): UserRow[] {
  const stats = rollupUsers(data, guide);
  return data.users
    .map(u => {
      const s = stats.get(u.userId) ?? EMPTY_STATS;
      return {
        userId: u.userId,
        name: u.name,
        age: u.age,
        gender: u.gender,
        maskedMobile: maskMobile(u.mobile),
        state: u.state,
        district: u.district,
        userType: u.userType,
        source: u.source,
        registeredAt: u.registeredAt,
        views: s.views,
        distinctPoints: s.distinctPoints,
        chaptersOpened: s.openedChapters.size,
        chaptersCompleted: completedChapters(s, guide),
        firstActive: s.firstActive,
        lastActive: s.lastActive,
      };
    })
    .sort((a, b) => b.registeredAt - a.registeredAt);
}

export interface UserDetail {
  profile: Omit<RawUser, 'aliases'>;
  totals: { views: number; distinctPoints: number; activeDays: number; firstActive: number; lastActive: number };
  languages: Record<string, number>;
  chapters: { id: string; title: string; viewed: number; total: number; opened: boolean }[];
  timeline: { at: number; chapterTitle: string; pointHeading: string; lang: string }[];
}

export function buildUserDetail(data: AnalyticsData, guide: GuideIndex, userId: string): UserDetail | null {
  const user = data.users.find(u => u.userId === userId);
  if (!user) return null;

  const stats = rollupUsers(data, guide).get(user.userId) ?? EMPTY_STATS;
  const chapterTitle = new Map(guide.chapters.map(c => [c.id, c.title]));
  const aliases = new Set(user.aliases);

  const timeline = data.events
    .filter(e => aliases.has(e.userId))
    .sort((a, b) => b.at - a.at)
    .slice(0, 200)
    .map(e => {
      const p = guide.points[e.itemId];
      return {
        at: e.at,
        chapterTitle: chapterTitle.get(p ? p.chapterId : e.itemId) ?? e.itemId,
        pointHeading: p ? p.heading || e.itemId : '',
        lang: e.lang,
      };
    });

  const { aliases: _aliases, ...profile } = user;
  void _aliases;
  return {
    profile,
    totals: { views: stats.views, distinctPoints: stats.distinctPoints, activeDays: stats.activeDays, firstActive: stats.firstActive, lastActive: stats.lastActive },
    languages: stats.languages,
    chapters: guide.chapters.map(c => ({
      id: c.id,
      title: c.title,
      viewed: stats.pointsByChapter[c.id] || 0,
      total: c.pointIds.length,
      opened: stats.openedChapters.has(c.id),
    })),
    timeline,
  };
}

/** Spreadsheet apps run cells that start with = + - @ as formulas; names are user-typed, so neutralise them. */
function csvCell(v: string | number): string {
  let s = String(v ?? '');
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function buildUsersCsv(data: AnalyticsData, guide: GuideIndex): string {
  const stats = rollupUsers(data, guide);
  const iso = (ms: number) => (ms ? new Date(ms).toISOString() : '');
  const header = ['name', 'age', 'gender', 'mobile', 'email', 'country', 'state', 'district', 'user_type', 'source', 'registered_at', 'views', 'points_read', 'chapters_completed', 'active_days', 'first_active', 'last_active'];
  const lines = [header.join(',')];
  for (const u of [...data.users].sort((a, b) => b.registeredAt - a.registeredAt)) {
    const s = stats.get(u.userId) ?? EMPTY_STATS;
    lines.push(
      [u.name, u.age, u.gender, u.mobile, u.email, u.country, u.state, u.district, u.userType, u.source, iso(u.registeredAt), s.views, s.distinctPoints, completedChapters(s, guide), s.activeDays, iso(s.firstActive), iso(s.lastActive)]
        .map(csvCell)
        .join(',')
    );
  }
  return lines.join('\r\n');
}

/* ------------------------------------------------------------------ */
/* Insights (options 3-7)                                              */
/* ------------------------------------------------------------------ */

export interface Insights {
  isDemoData: boolean;
  /** Option 4: last 90 days, oldest first */
  daily: { date: string; registrations: number; views: number; activeUsers: number }[];
  /** Option 3 */
  engagement: {
    registered: number;
    activated: number;
    neverViewed: number;
    activationRate: number;
    active7: number;
    active30: number;
    avgPointsPerReader: number;
    avgViewsPerReader: number;
    returningReaders: number;
    returningRate: number;
    topUsers: { userId: string; name: string; userType: string; district: string; points: number; views: number }[];
  };
  /** Option 5: share of each user type's readers who opened each chapter */
  segments: {
    userTypes: { type: string; readers: number }[];
    chapters: { id: string; title: string }[];
    /** cells[chapterIndex][userTypeIndex] = distinct readers of that type who opened the chapter */
    cells: number[][];
  };
  languageMix: {
    byUserType: { label: string; total: number; langs: Record<string, number> }[];
    byState: { label: string; total: number; langs: Record<string, number> }[];
  };
  /** Option 6 */
  funnel: { id: string; title: string; points: number; opened: number; half: number; completed: number }[];
  /** Option 7 */
  sources: { source: string; registrations: number; activated: number; views: number; avgPoints: number }[];
}

const round1 = (n: number) => Math.round(n * 10) / 10;

export function buildInsights(data: AnalyticsData, guide: GuideIndex, now = Date.now()): Insights {
  const stats = rollupUsers(data, guide);
  const owner = new Map<string, RawUser>();
  for (const u of data.users) for (const a of u.aliases) owner.set(a, u);

  /* Time series */
  const dayKeys: string[] = [];
  for (let i = 89; i >= 0; i--) dayKeys.push(istDay(now - i * DAY_MS));
  const dayIndex = new Map(dayKeys.map((d, i) => [d, i]));
  const daily = dayKeys.map(date => ({ date, registrations: 0, views: 0, activeUsers: 0 }));
  const activeSets: Set<string>[] = dayKeys.map(() => new Set());
  for (const u of data.users) {
    const i = u.registeredAt ? dayIndex.get(istDay(u.registeredAt)) : undefined;
    if (i !== undefined) daily[i].registrations += 1;
  }
  for (const e of data.events) {
    const i = dayIndex.get(istDay(e.at));
    if (i === undefined) continue;
    daily[i].views += 1;
    activeSets[i].add(owner.get(e.userId)?.userId ?? e.userId);
  }
  activeSets.forEach((set, i) => (daily[i].activeUsers = set.size));

  /* Engagement */
  const readers = data.users.filter(u => (stats.get(u.userId)?.views ?? 0) > 0);
  const registered = data.users.length;
  const activeSince = (days: number) => readers.filter(u => stats.get(u.userId)!.lastActive >= now - days * DAY_MS).length;
  const returning = readers.filter(u => stats.get(u.userId)!.activeDays >= 2).length;
  const sum = (f: (s: UserStats) => number) => readers.reduce((t, u) => t + f(stats.get(u.userId)!), 0);

  const topUsers = [...readers]
    .sort((a, b) => {
      const sa = stats.get(a.userId)!, sb = stats.get(b.userId)!;
      return sb.distinctPoints - sa.distinctPoints || sb.views - sa.views;
    })
    .slice(0, 5)
    .map(u => ({ userId: u.userId, name: u.name, userType: u.userType, district: u.district, points: stats.get(u.userId)!.distinctPoints, views: stats.get(u.userId)!.views }));

  /* Segments: user type x chapter */
  const readersByType = new Map<string, number>();
  for (const u of readers) {
    const t = userTypeGroup(u.userType);
    readersByType.set(t, (readersByType.get(t) || 0) + 1);
  }
  const typeList = [...readersByType.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  const typeIndex = new Map(typeList.map(([t], i) => [t, i]));
  const cells = guide.chapters.map(() => typeList.map(() => 0));
  for (const u of readers) {
    const ti = typeIndex.get(userTypeGroup(u.userType));
    if (ti === undefined) continue;
    guide.chapters.forEach((c, ci) => {
      if (stats.get(u.userId)!.openedChapters.has(c.id)) cells[ci][ti] += 1;
    });
  }

  /* Language mix (view counts, registered users only) */
  const mix = (labelOf: (u: RawUser) => string) => {
    const m = new Map<string, Record<string, number>>();
    for (const u of readers) {
      const label = labelOf(u) || 'Not specified';
      const langs = m.get(label) ?? {};
      for (const [l, n] of Object.entries(stats.get(u.userId)!.languages)) langs[l] = (langs[l] || 0) + n;
      m.set(label, langs);
    }
    return [...m.entries()]
      .map(([label, langs]) => ({ label, langs, total: Object.values(langs).reduce((a, b) => a + b, 0) }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  };

  /* Funnel */
  const funnel = guide.chapters.map(c => {
    const total = c.pointIds.length;
    let opened = 0, half = 0, completed = 0;
    for (const u of readers) {
      const s = stats.get(u.userId)!;
      if (!s.openedChapters.has(c.id)) continue;
      opened += 1;
      const read = s.pointsByChapter[c.id] || 0;
      if (total > 0 && read >= Math.ceil(total / 2)) half += 1;
      if (total > 0 && read >= total) completed += 1;
    }
    return { id: c.id, title: c.title, points: total, opened, half, completed };
  });

  /* Sources */
  const bySource = new Map<string, { registrations: number; activated: number; views: number; points: number }>();
  for (const u of data.users) {
    const key = u.source || '(direct)';
    const row = bySource.get(key) ?? { registrations: 0, activated: 0, views: 0, points: 0 };
    const s = stats.get(u.userId);
    row.registrations += 1;
    if (s && s.views > 0) row.activated += 1;
    row.views += s?.views ?? 0;
    row.points += s?.distinctPoints ?? 0;
    bySource.set(key, row);
  }

  return {
    isDemoData: data.isDemo,
    daily,
    engagement: {
      registered,
      activated: readers.length,
      neverViewed: registered - readers.length,
      activationRate: registered ? readers.length / registered : 0,
      active7: activeSince(7),
      active30: activeSince(30),
      avgPointsPerReader: readers.length ? round1(sum(s => s.distinctPoints) / readers.length) : 0,
      avgViewsPerReader: readers.length ? round1(sum(s => s.views) / readers.length) : 0,
      returningReaders: returning,
      returningRate: readers.length ? returning / readers.length : 0,
      topUsers,
    },
    segments: {
      userTypes: typeList.map(([type, n]) => ({ type, readers: n })),
      chapters: guide.chapters.map(c => ({ id: c.id, title: c.title })),
      cells,
    },
    languageMix: { byUserType: mix(u => userTypeGroup(u.userType)), byState: mix(u => u.state) },
    funnel,
    sources: [...bySource.entries()]
      .map(([source, r]) => ({
        source,
        registrations: r.registrations,
        activated: r.activated,
        views: r.views,
        avgPoints: r.activated ? round1(r.points / r.activated) : 0,
      }))
      .sort((a, b) => b.registrations - a.registrations),
  };
}
