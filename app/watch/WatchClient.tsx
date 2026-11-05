'use client';

import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import RegistrationForm from '@/components/RegistrationForm';
import YouTubePlayer from '@/components/YouTubePlayer';
import SiteHeader from '@/components/SiteHeader';
import { VideoConfig } from '@/types/video';
import { getClientCookie, setClientCookie } from '@/lib/mobile';
import styles from './WatchClient.module.css';

interface WatchClientProps {
  videoId: string;
  video: VideoConfig;
  language: string;
  isAdmin?: boolean;
}

type ViewState = 'loading' | 'form' | 'player';

export default function WatchClient({ videoId, video, language, isAdmin }: WatchClientProps) {
  const [viewState, setViewState] = useState<ViewState>('loading');
  const [userId, setUserId] = useState<string>('');
  const [userName, setUserName] = useState<string>('');

  useEffect(() => {
    // Check both cookie and localStorage for registration status
    const cookieRegistered = getClientCookie('qr_user_registered') === 'true';
    const localRegistered = localStorage.getItem('user_registered') === 'true';
    const isRegistered = cookieRegistered || localRegistered;

    // Get or create persistent user ID
    let uid = localStorage.getItem('user_id') || getClientCookie('qr_user_id');
    if (!uid) {
      uid = uuidv4();
    }
    setUserId(uid);

    // Retrieve user name if available
    const storedName = localStorage.getItem('user_name') || getClientCookie('qr_user_name') || '';
    if (storedName) {
      setUserName(storedName);
    }

    if (isRegistered) {
      // Sync across both storage types for maximum persistence
      try {
        localStorage.setItem('user_registered', 'true');
        localStorage.setItem('user_id', uid);
        if (storedName) localStorage.setItem('user_name', storedName);
      } catch (e) {
        console.warn('LocalStorage not accessible', e);
      }
      setClientCookie('qr_user_registered', 'true');
      setClientCookie('qr_user_id', uid);
      if (storedName) setClientCookie('qr_user_name', storedName);
      setViewState('player');
    } else {
      setViewState('form');
    }
  }, []);

  const handleRegistrationSuccess = useCallback((registeredUserId?: string, registeredUserName?: string) => {
    if (registeredUserId) {
      setUserId(registeredUserId);
    }
    if (registeredUserName) {
      setUserName(registeredUserName);
    }
    setViewState('player');
  }, []);

  const handleVideoReady = useCallback(() => {
    // Track view event (fire-and-forget — video still plays even if tracking fails)
    const uid = localStorage.getItem('user_id') || userId;
    fetch('/api/track-view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoId, userId: uid, language }),
    }).catch(() => {
      // Silent fail — tracking should never block the video
    });
  }, [videoId, userId, language]);

  const renderStatusBadges = () => (
    <>
      {userName && (
        <div className={styles.userBadge} title={`Logged in as ${userName}`}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className={styles.userIcon} aria-hidden="true">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          <span className={styles.userName}>{userName}</span>
        </div>
      )}
      {language && (
        <span className={styles.langBadge}>🌐 {language.toUpperCase()}</span>
      )}
    </>
  );

  if (viewState === 'loading') {
    return (
      <div className={styles.loadingScreen}>
        <SiteHeader isAdmin={isAdmin} showHomeLink extraRight={renderStatusBadges()} />
        <div className={styles.loadingBody}>
          <div className={styles.loadingSpinner} />
          <p className={styles.loadingText}>Loading video...</p>
        </div>
      </div>
    );
  }

  if (viewState === 'form') {
    return (
      <div className={styles.formScreen}>
        <SiteHeader isAdmin={isAdmin} showHomeLink extraRight={renderStatusBadges()} />
        <RegistrationForm
          userId={userId}
          onSuccess={handleRegistrationSuccess}
        />
      </div>
    );
  }

  return (
    <div className={styles.playerScreen}>
      <SiteHeader
        isAdmin={isAdmin}
        showHomeLink
        extraRight={renderStatusBadges()}
      />
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
