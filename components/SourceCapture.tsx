'use client';

import { useEffect } from 'react';
import { getClientCookie, setClientCookie } from '@/lib/mobile';

/**
 * Remembers which QR code / campaign a visitor arrived from (?src=clinic-a) so registration can
 * attribute them to it. First touch wins: a later visit from another link doesn't overwrite it.
 */
export default function SourceCapture() {
  useEffect(() => {
    const raw = new URLSearchParams(window.location.search).get('src');
    const src = (raw || '').toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
    if (src && !getClientCookie('qr_src')) setClientCookie('qr_src', src, 90);
  }, []);
  return null;
}
