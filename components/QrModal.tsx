'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import QRCode from 'qrcode';
import type { Lang } from '@/lib/languages';
import { SHARE } from '@/lib/shareStrings';
import { IconCheck, IconClose, IconCopy } from './admin/icons';
import styles from './QrModal.module.css';

export interface QrTarget {
  /** Used for the downloaded file name */
  key: string;
  title: string;
  url: string;
  subtext: string;
}

interface QrModalProps {
  target: QrTarget;
  onClose: () => void;
  /** Admin only: lets the admin tag the QR with a campaign (?src=...) to attribute registrations. */
  allowSource?: boolean;
  /** Reader pages pass their language to enable sharing (message follows it). Admin omits it: no share. */
  shareLang?: Lang;
}

/** Keeps campaign tags URL- and spreadsheet-safe: lowercase letters, digits, dashes. */
export function cleanSource(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
}

function withSource(url: string, source: string): string {
  if (!source) return url;
  return `${url}${url.includes('?') ? '&' : '?'}src=${encodeURIComponent(source)}`;
}

const FONT_STACK =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans Gujarati", "Noto Sans Devanagari", Roboto, Helvetica, Arial, sans-serif';

/** Wraps text onto multiple lines to fit a given maxWidth on an HTML5 canvas. */
function wrapCanvasText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

/** Generates a high-resolution, print-ready QR card with a prominent title and subtext. */
async function generateCompositeQr(url: string, title: string, subtext: string): Promise<string> {
  const baseQrDataUrl = await QRCode.toDataURL(url, {
    width: 600,
    margin: 2,
    color: { dark: '#0f172a', light: '#ffffff' },
    errorCorrectionLevel: 'M',
  });

  const qrImage = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = baseQrDataUrl;
  });

  const cardWidth = 720;
  const qrSize = 500;
  const paddingX = 40;
  const maxTextWidth = cardWidth - paddingX * 2;

  const measureCtx = document.createElement('canvas').getContext('2d');
  if (!measureCtx) return baseQrDataUrl;

  const effectiveTitle = title?.trim() || 'Guidebook';
  const titleFontSize = effectiveTitle.length > 50 ? 34 : 38;
  const titleLineHeight = titleFontSize + 14;
  const subtextFontSize = 22;
  const subtextLineHeight = 32;

  measureCtx.font = `bold ${titleFontSize}px ${FONT_STACK}`;
  const titleLines = wrapCanvasText(measureCtx, effectiveTitle, maxTextWidth);

  const topPadding = 40;
  const qrToTitleGap = 30;
  const titleToSubtextGap = 14;
  const bottomPadding = 44;

  const titleBlockHeight = titleLines.length * titleLineHeight;
  const subtextBlockHeight = subtext ? titleToSubtextGap + subtextLineHeight : 0;
  const cardHeight = topPadding + qrSize + qrToTitleGap + titleBlockHeight + subtextBlockHeight + bottomPadding;

  const canvas = document.createElement('canvas');
  canvas.width = cardWidth;
  canvas.height = cardHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return baseQrDataUrl;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, cardWidth, cardHeight);
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 3;
  ctx.strokeRect(1.5, 1.5, cardWidth - 3, cardHeight - 3);

  const qrX = (cardWidth - qrSize) / 2;
  ctx.drawImage(qrImage, qrX, topPadding, qrSize, qrSize);

  ctx.fillStyle = '#0f172a';
  ctx.font = `bold ${titleFontSize}px ${FONT_STACK}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  let textY = topPadding + qrSize + qrToTitleGap + titleLineHeight / 2;
  for (const line of titleLines) {
    ctx.fillText(line, cardWidth / 2, textY);
    textY += titleLineHeight;
  }

  if (subtext) {
    ctx.fillStyle = '#475569';
    ctx.font = `600 ${subtextFontSize}px ${FONT_STACK}`;
    ctx.fillText(subtext, cardWidth / 2, textY + titleToSubtextGap / 2);
  }

  return canvas.toDataURL('image/png');
}

export default function QrModal({ target: baseTarget, onClose, allowSource, shareLang }: QrModalProps) {
  const [source, setSource] = useState('');
  const cleaned = allowSource ? cleanSource(source) : '';
  const target = useMemo(
    () => ({ ...baseTarget, url: withSource(baseTarget.url, cleaned), key: cleaned ? `${baseTarget.key}-${cleaned}` : baseTarget.key }),
    [baseTarget, cleaned]
  );
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [qrFile, setQrFile] = useState<File | null>(null);
  const [canNativeShare, setCanNativeShare] = useState(false);
  const [shareNote, setShareNote] = useState('');
  const sh = shareLang ? SHARE[shareLang] : null;
  const shareText = sh ? sh.message(baseTarget.title) : '';

  // Generate the print-ready card whenever the target changes
  useEffect(() => {
    let isCurrent = true;
    setQrDataUrl('');
    generateCompositeQr(target.url, target.title, target.subtext)
      .then(url => isCurrent && setQrDataUrl(url))
      .catch(() => {
        // Fall back to a plain QR if the canvas card fails
        QRCode.toDataURL(target.url, { width: 320, margin: 2 })
          .then(url => isCurrent && setQrDataUrl(url))
          .catch(() => isCurrent && setQrDataUrl(''));
      });
    return () => {
      isCurrent = false;
    };
  }, [target]);

  // Prepare the QR card as a File once, so the native share can happen inside the tap
  useEffect(() => {
    setCanNativeShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function');
    if (!qrDataUrl) {
      setQrFile(null);
      return;
    }
    let isCurrent = true;
    fetch(qrDataUrl)
      .then(r => r.blob())
      .then(b => isCurrent && setQrFile(new File([b], `qr-${target.key}.png`, { type: 'image/png' })))
      .catch(() => isCurrent && setQrFile(null));
    return () => {
      isCurrent = false;
    };
  }, [qrDataUrl, target.key]);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const download = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `qr-${target.key}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const note = (msg: string) => {
    setShareNote(msg);
    setTimeout(() => setShareNote(''), 3000);
  };

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
  };

  /** Native share sheet: link + message + QR image where the platform allows files. */
  const nativeShare = async () => {
    if (!sh) return;
    // The link is part of the text: some apps (WhatsApp, iOS) drop `url` when a file is attached.
    const text = `${shareText}\n${target.url}`;
    try {
      if (qrFile && navigator.canShare?.({ files: [qrFile] })) {
        await navigator.share({ files: [qrFile], title: baseTarget.title, text });
      } else {
        await navigator.share({ title: baseTarget.title, text: shareText, url: target.url });
      }
    } catch (e) {
      if ((e as DOMException)?.name !== 'AbortError') note(sh.failed);
    }
  };

  const open = (href: string) => window.open(href, '_blank', 'noopener,noreferrer');

  const instagram = async () => {
    if (!sh) return;
    await copyText(`${shareText}\n${target.url}`);
    note(sh.instagramCopied);
    open('https://www.instagram.com/');
  };

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(target.url);
    } catch {
      const el = document.createElement('textarea');
      el.value = target.url;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} role="dialog" aria-modal="true" aria-label="QR code" onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div>
            <h3 className={styles.modalTitle}>QR Code</h3>
            <p className={styles.modalSub}>{target.title}</p>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose} id="qr-modal-close" aria-label="Close"><IconClose size={20} /></button>
        </div>

        <div className={styles.qrWrap}>
          {qrDataUrl
            ? <Image src={qrDataUrl} alt={`QR code card for ${target.title}`} className={styles.qrImage} width={330} height={420} unoptimized />
            : <div className={styles.qrLoading}>Generating…</div>}
        </div>

        {allowSource && (
          <div className={styles.sourceBox}>
            <label htmlFor="qr-source" className={styles.sourceLabel}>Campaign tag (optional)</label>
            <input
              id="qr-source"
              className={styles.sourceInput}
              value={source}
              onChange={e => setSource(e.target.value)}
              placeholder="e.g. clinic-ahmedabad"
              maxLength={60}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
            />
            <span className={styles.sourceHint}>Registrations from this QR are counted under this tag in Analytics.</span>
          </div>
        )}

        <div className={styles.urlBox}>
          <span className={styles.urlText}>{target.url}</span>
        </div>

        <div className={styles.modalActions}>
          <button type="button" id="qr-download-btn" className={styles.btnDownload} onClick={download} disabled={!qrDataUrl}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 4v11M7 11l5 5 5-5M5 20h14" />
            </svg>
            Download PNG
          </button>
          <button
            type="button"
            id="qr-copy-url-btn"
            className={`${styles.btnCopyUrl} ${copied ? styles.btnCopied : ''}`}
            onClick={copyUrl}
          >
            {copied ? <IconCheck size={18} /> : <IconCopy size={18} />}
            {copied ? 'Copied' : 'Copy link'}
          </button>
        </div>

        {sh && (
          <div className={styles.shareBox} lang={shareLang}>
            {canNativeShare ? (
              <button type="button" id="qr-share-btn" className={styles.btnShare} onClick={nativeShare}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
                  <path d="M8.6 10.5l6.8-4M8.6 13.5l6.8 4" />
                </svg>
                {sh.share}
              </button>
            ) : (
              <>
                <p className={styles.shareLabel}>{sh.shareVia}</p>
                <ul className={styles.shareList}>
                  {[
                    { id: 'whatsapp', label: 'WhatsApp', href: `https://wa.me/?text=${encodeURIComponent(`${shareText}\n${target.url}`)}` },
                    { id: 'telegram', label: 'Telegram', href: `https://t.me/share/url?url=${encodeURIComponent(target.url)}&text=${encodeURIComponent(shareText)}` },
                    { id: 'facebook', label: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(target.url)}` },
                  ].map(p => (
                    <li key={p.id}><button type="button" className={styles.shareChip} onClick={() => open(p.href)}>{p.label}</button></li>
                  ))}
                  <li><button type="button" className={styles.shareChip} onClick={instagram}>Instagram</button></li>
                  <li>
                    <a className={styles.shareChip} href={`mailto:?subject=${encodeURIComponent(sh.emailSubject)}&body=${encodeURIComponent(`${shareText}\n${target.url}`)}`}>Email</a>
                  </li>
                  <li>
                    <a className={styles.shareChip} href={`sms:?&body=${encodeURIComponent(`${shareText} ${target.url}`)}`}>SMS</a>
                  </li>
                </ul>
              </>
            )}
            <p className={styles.shareNote} role="status" aria-live="polite">{shareNote}</p>
          </div>
        )}
      </div>
    </div>
  );
}
