'use client';

import { useEffect, useRef } from 'react';
import styles from './YouTubePlayer.module.css';

interface YouTubePlayerProps {
  youtubeId: string;
  title: string;
  category?: string;
  tags?: string[];
  description?: string;
  onReady?: () => void;
}

export default function YouTubePlayer({
  youtubeId,
  title,
  category,
  tags,
  description,
  onReady,
}: YouTubePlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const readyFired = useRef(false);

  useEffect(() => {
    // Fire onReady after a short delay (iframe load)
    const timer = setTimeout(() => {
      if (!readyFired.current && onReady) {
        readyFired.current = true;
        onReady();
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [onReady]);

  const embedUrl = `https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&rel=0&modestbranding=1&playsinline=1`;

  return (
    <div className={styles.container}>
      <div className={styles.playerWrap}>
        <iframe
          ref={iframeRef}
          src={embedUrl}
          title={title}
          className={styles.iframe}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
      <div className={styles.videoInfo}>
        {category && (
          <div className={styles.metaRow}>
            <span className={styles.categoryBadge}>{category}</span>
          </div>
        )}
        <h2 className={styles.videoTitle}>{title}</h2>
        {description && (
          <p className={styles.videoDesc}>{description}</p>
        )}
        {tags && tags.length > 0 && (
          <div className={styles.tagList}>
            {tags.map((tag) => (
              <span key={tag} className={styles.tagChip}>
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
