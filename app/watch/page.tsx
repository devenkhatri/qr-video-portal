import { Metadata } from 'next';
import { findVideo } from '@/lib/videos';
import WatchClient from './WatchClient';
import styles from './watch.module.css';

interface WatchPageProps {
  searchParams: Promise<{ video?: string; lang?: string }>;
}

export async function generateMetadata({ searchParams }: WatchPageProps): Promise<Metadata> {
  const { video: queryParam } = await searchParams;
  const video = queryParam ? await findVideo(queryParam) : null;
  const title = video ? `${video.title} | Medical Video Portal` : 'Medical Video Portal';
  const description = video?.description || 'Watch educational clinical videos with instant QR code access.';

  return {
    title,
    description,
    robots: { index: false }, // Never index watch pages — videos are unlisted
    openGraph: {
      title,
      description,
      images: [
        {
          url: '/og-image.jpg',
          width: 1200,
          height: 675,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/og-image.jpg'],
    },
  };
}

export default async function WatchPage({ searchParams }: WatchPageProps) {
  const { video: queryParam, lang } = await searchParams;
  const video = queryParam ? await findVideo(queryParam) : null;

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

