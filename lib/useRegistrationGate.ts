'use client';

import { useCallback, useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { getClientCookie, setClientCookie } from '@/lib/mobile';

export type GateState = 'loading' | 'form' | 'open';

/**
 * Registration gate shared by every guidebook page that needs it.
 * Uses the same cookie/localStorage convention as the original watch page, so a visitor
 * registers once and every chapter and point page stays open afterwards.
 */
export function useRegistrationGate() {
  const [state, setState] = useState<GateState>('loading');
  const [userId, setUserId] = useState('');

  useEffect(() => {
    const registered =
      getClientCookie('qr_user_registered') === 'true' ||
      localStorage.getItem('user_registered') === 'true';

    let uid = localStorage.getItem('user_id') || getClientCookie('qr_user_id');
    if (!uid) uid = uuidv4();
    setUserId(uid);

    if (registered) {
      try {
        localStorage.setItem('user_registered', 'true');
        localStorage.setItem('user_id', uid);
      } catch {
        // storage unavailable; cookies still carry the state
      }
      setClientCookie('qr_user_registered', 'true');
      setClientCookie('qr_user_id', uid);
      setState('open');
    } else {
      setState('form');
    }
  }, []);

  const onRegistered = useCallback(() => setState('open'), []);

  return { state, userId, onRegistered };
}

/** Fire-and-forget view tracking: reading must never be blocked by analytics. */
export function trackView(id: string, userId: string, language: string) {
  const uid = localStorage.getItem('user_id') || userId;
  fetch('/api/track-view', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ videoId: id, userId: uid, language }),
  }).catch(() => {
    // ignore
  });
}
