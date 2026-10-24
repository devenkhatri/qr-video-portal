'use client';

import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import RegistrationForm from '@/components/RegistrationForm';
import YouTubePlayer from '@/components/YouTubePlayer';
import { VideoConfig } from '@/types/video';
import styles from './WatchClient.module.css';

interface WatchClientProps {
  videoId: string;
  video: VideoConfig;
}

type ViewState = 'loading' | 'form' | 'player';

export default function WatchClient({ videoId, video }: WatchClientProps) {
  const [viewState, setViewState] = useState<ViewState>('loading');
  const [userId, setUserId] = useState<string>('');

  useEffect(() => {
    // Get or create persistent user ID
    let uid = localStorage.getItem('user_id');
    if (!uid) {
      uid = uuidv4();
    }
    setUserId(uid);

    // Check registration status
    const isRegistered = localStorage.getItem('user_registered') === 'true';
    if (isRegistered) {
      setViewState('player');
    } else {
      setViewState('form');
    }
  }, []);

  const handleRegistrationSuccess = useCallback(() => {
    setViewState('player');
  }, []);

  const handleVideoReady = useCallback(() => {
    // Track view event (fire-and-forget — video still plays even if tracking fails)
    const uid = localStorage.getItem('user_id') || userId;
    fetch('/api/track-view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoId, userId: uid }),
    }).catch(() => {
      // Silent fail — tracking should never block the video
    });
  }, [videoId, userId]);

  if (viewState === 'loading') {
    return (
      <div className={styles.loadingScreen}>
        <div className={styles.loadingSpinner} />
        <p className={styles.loadingText}>Loading...</p>
      </div>
    );
  }

  if (viewState === 'form') {
    return (
      <RegistrationForm
        userId={userId}
        onSuccess={handleRegistrationSuccess}
      />
    );
  }

  return (
    <div className={styles.playerScreen}>
      <div className={styles.playerHeader}>
        <div className={styles.logo}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.41 19.54C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.96A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z" />
            <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" />
          </svg>
          Medical Video Portal
        </div>
      </div>
      <YouTubePlayer
        youtubeId={video.youtubeId}
        title={video.title}
        category={video.category}
        tags={video.tags}
        description={video.description}
        onReady={handleVideoReady}
      />
    </div>
  );
}
