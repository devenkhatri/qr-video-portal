import { Metadata } from 'next';
import videos from '@/data/videos.json';
import { VideoConfig } from '@/types/video';
import WatchClient from './WatchClient';
import styles from './watch.module.css';

interface WatchPageProps {
  searchParams: Promise<{ video?: string; lang?: string }>;
}

const allVideos = videos as Record<string, VideoConfig>;

// Find a video entry by its YouTube ID (the value used in the URL ?video= param), with fallback to JSON key
function findVideo(param: string): VideoConfig | null {
  return Object.values(allVideos).find(v => v.youtubeId === param) ?? allVideos[param] ?? null;
}

export async function generateMetadata({ searchParams }: WatchPageProps): Promise<Metadata> {
  const { video: queryParam } = await searchParams;
  const video = queryParam ? findVideo(queryParam) : null;

  return {
    title: video ? `${video.title} | Medical Video Portal` : 'Medical Video Portal',
    description: video?.description || 'Watch educational medical videos.',
    robots: { index: false }, // Never index watch pages — videos are unlisted
  };
}

export default async function WatchPage({ searchParams }: WatchPageProps) {
  const { video: queryParam, lang } = await searchParams;
  const video = queryParam ? findVideo(queryParam) : null;

  if (!queryParam || !video) {
    return (
      <div className={styles.errorPage}>
        <div className={styles.errorCard}>
          <div className={styles.errorIcon}>⚠️</div>
          <h1 className={styles.errorTitle}>Invalid QR Code</h1>
          <p className={styles.errorMsg}>
            This QR code does not point to a valid video. Please scan the correct code from your guidebook.
          </p>
        </div>
      </div>
    );
  }

  // Use URL lang param, fallback to the video's configured language
  const language = lang || video.language;

  return (
    <main className={styles.main}>
      {/* Consistently pass youtubeId for analytics tracking */}
      <WatchClient videoId={video.youtubeId} video={video} language={language} />
    </main>
  );
}

