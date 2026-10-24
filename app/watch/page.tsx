import { Metadata } from 'next';
import videos from '@/data/videos.json';
import { VideoConfig } from '@/types/video';
import WatchClient from './WatchClient';
import styles from './watch.module.css';

interface WatchPageProps {
  searchParams: Promise<{ video?: string }>;
}

const allVideos = videos as Record<string, VideoConfig>;

export async function generateMetadata({ searchParams }: WatchPageProps): Promise<Metadata> {
  const { video: videoId } = await searchParams;
  const video = videoId ? allVideos[videoId] : null;

  return {
    title: video ? `${video.title} | Medical Video Portal` : 'Medical Video Portal',
    description: video?.description || 'Watch educational medical videos.',
    robots: { index: false }, // Never index watch pages — videos are unlisted
  };
}

export default async function WatchPage({ searchParams }: WatchPageProps) {
  const { video: videoId } = await searchParams;

  if (!videoId || !allVideos[videoId]) {
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

  const video = allVideos[videoId];

  return (
    <main className={styles.main}>
      <WatchClient videoId={videoId} video={video} />
    </main>
  );
}
