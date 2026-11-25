'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import QRCode from 'qrcode';
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

export default function QrModal({ target: baseTarget, onClose, allowSource }: QrModalProps) {
  const [source, setSource] = useState('');
  const cleaned = allowSource ? cleanSource(source) : '';
  const target = useMemo(
    () => ({ ...baseTarget, url: withSource(baseTarget.url, cleaned), key: cleaned ? `${baseTarget.key}-${cleaned}` : baseTarget.key }),
    [baseTarget, cleaned]
  );
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [copied, setCopied] = useState(false);

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
      </div>
    </div>
  );
}
