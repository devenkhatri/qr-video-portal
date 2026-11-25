'use client';

import { useEffect, useRef } from 'react';
import { IconClose } from './admin/icons';
import styles from './ImageLightbox.module.css';

interface ImageLightboxProps {
  src: string;
  alt: string;
  closeLabel: string;
  onClose: () => void;
}

/** Full-screen image viewer: tap anywhere, press Escape, or use the close button to dismiss. */
export default function ImageLightbox({ src, alt, closeLabel, onClose }: ImageLightboxProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();

    // Stop the page behind from scrolling while the viewer is open
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);

    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = original;
      previouslyFocused?.focus?.();
    };
  }, [onClose]);

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label={alt} onClick={onClose}>
      <button ref={closeRef} type="button" className={styles.close} onClick={onClose} aria-label={closeLabel}>
        <IconClose size={22} />
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className={styles.image} />
    </div>
  );
}
