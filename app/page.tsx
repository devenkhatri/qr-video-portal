import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { getAllVideos } from '@/lib/videos';
import { VideoItem } from '@/types/video';
import VideoCatalog from '@/components/VideoCatalog';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Medical Video Portal | Educational Health Video Library',
  description: 'Browse, search, and watch physician-reviewed educational medical videos. Filter by clinical topic, tags, or scan guidebook QR codes.',
};

export default async function HomePage() {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
  const isAdmin = Boolean(session.isAdmin);

  const rawVideos = await getAllVideos();
  const videos: VideoItem[] = Object.entries(rawVideos).map(([id, config]) => ({
    id,
    ...config,
  }));

  return (
    <main>
      <VideoCatalog initialVideos={videos} isAdmin={isAdmin} />
    </main>
  );
}
