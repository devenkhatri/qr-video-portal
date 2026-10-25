'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import QRCode from 'qrcode';
import { extractYouTubeId, getYouTubeThumbnail } from '@/lib/youtube';
import styles from './AdminVideoTable.module.css';

interface VideoRow {
  videoId: string;
  youtubeId: string;
  title: string;
  language: string;
  category: string;
  tags: string[];
  description: string;
  views: number;
  uniqueViewers: number;
  lastViewed: string | null;
}

type SortKey = 'title' | 'views' | 'uniqueViewers' | 'lastViewed' | 'category' | 'language';
type SortDir = 'asc' | 'desc';

interface Props {
  baseUrl: string; // e.g. "https://your-domain.com"
  refreshTrigger?: number;
  onRefreshed?: (date: Date) => void;
}

const COMMON_LANGUAGES = [
  { code: 'en', label: 'English (EN)' },
  { code: 'hi', label: 'Hindi (HI)' },
  { code: 'gu', label: 'Gujarati (GU)' },
];

function buildWatchUrl(baseUrl: string, youtubeId: string, language: string): string {
  return `${baseUrl}/watch?video=${encodeURIComponent(youtubeId)}&lang=${encodeURIComponent(language)}`;
}

export default function AdminVideoTable({ baseUrl, refreshTrigger, onRefreshed }: Props) {
  const [videos, setVideos] = useState<VideoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isDemoData, setIsDemoData] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [langFilter, setLangFilter] = useState('');

  // Sort
  const [sortKey, setSortKey] = useState<SortKey>('views');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // QR modal state
  const [qrModal, setQrModal] = useState<{ videoId: string; title: string; url: string } | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Copy feedback — tracks which video ID (or 'modal') was just copied
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Add Video modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUrlOrId, setNewUrlOrId] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newVideoId, setNewVideoId] = useState('');
  const [newCategory, setNewCategory] = useState('Oncology');
  const [newLanguage, setNewLanguage] = useState('en');
  const [newCustomLanguage, setNewCustomLanguage] = useState('');
  const [newTags, setNewTags] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');
  const [lastAddedVideo, setLastAddedVideo] = useState<VideoRow | null>(null);


  // Live extracted YouTube ID
  const liveYouTubeId = extractYouTubeId(newUrlOrId);

  const onRefreshedRef = useRef(onRefreshed);
  useEffect(() => {
    onRefreshedRef.current = onRefreshed;
  }, [onRefreshed]);

  const loadVideos = useCallback(() => {
    fetch(`/api/admin/videos?t=${Date.now()}`, { cache: 'no-store' })
      .then(r => { if (!r.ok) throw new Error('Failed'); return r.json(); })
      .then(data => {
        setVideos(data.videos || []);
        setIsDemoData(data.isDemoData);
        setLoading(false);
        onRefreshedRef.current?.(new Date());
      })
      .catch(() => {
        setError('Failed to load video data.');
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    loadVideos();
  }, [loadVideos, refreshTrigger]);

  // Generate QR whenever modal opens
  useEffect(() => {
    if (!qrModal) { setQrDataUrl(''); return; }
    QRCode.toDataURL(qrModal.url, {
      width: 320,
      margin: 2,
      color: { dark: '#111827', light: '#FFFFFF' },
    }).then(setQrDataUrl).catch(() => setQrDataUrl(''));
  }, [qrModal]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const openQr = useCallback((video: VideoRow) => {
    const url = buildWatchUrl(baseUrl, video.youtubeId, video.language);
    setQrModal({ videoId: video.youtubeId, title: video.title, url });
  }, [baseUrl]);

  const closeQr = () => setQrModal(null);

  const resetAddForm = () => {
    setNewUrlOrId('');
    setNewTitle('');
    setNewVideoId('');
    setNewCategory('Oncology');
    setNewLanguage('en');
    setNewCustomLanguage('');
    setNewTags('');
    setNewDescription('');
    setSubmitError('');
    setSubmitSuccess('');
    setLastAddedVideo(null);
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    resetAddForm();
  };

  const handleAddVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!liveYouTubeId) {
      setSubmitError('Please enter a valid YouTube URL or 11-character video ID.');
      return;
    }
    if (!newTitle.trim()) {
      setSubmitError('Please enter a video title.');
      return;
    }

    setSubmitting(true);
    setSubmitError('');

    const resolvedCategory = newCategory.trim() || 'Oncology';
    const resolvedLanguage = newLanguage === '__custom__' ? newCustomLanguage.trim() : newLanguage;

    try {
      const res = await fetch('/api/admin/videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          urlOrId: newUrlOrId.trim(),
          title: newTitle.trim(),
          videoId: newVideoId.trim() || undefined,
          category: resolvedCategory,
          language: resolvedLanguage || 'en',
          tags: newTags.trim(),
          description: newDescription.trim(),
        }),
      });


      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to add video');
      }

      setSubmitSuccess(data.message || 'Video added successfully!');
      loadVideos();
      if (data.video) {
        setLastAddedVideo({
          videoId: data.video.videoId,
          youtubeId: data.video.youtubeId,
          title: data.video.title,
          language: data.video.language,
          category: data.video.category,
          tags: data.video.tags || [],
          description: data.video.description || '',
          views: 0,
          uniqueViewers: 0,
          lastViewed: null,
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An error occurred while saving the video.';
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  };


  const downloadQr = () => {
    if (!qrDataUrl || !qrModal) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `qr-${qrModal.videoId}.png`;
    a.click();
  };

  const copyUrl = async (url: string, id: string) => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // fallback for older browsers
      const el = document.createElement('textarea');
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Derived data
  const categories = Array.from(new Set(videos.map(v => v.category))).sort();
  const languages = Array.from(new Set(videos.map(v => v.language))).sort();


  const filtered = videos
    .filter(v => {
      const q = search.toLowerCase();
      if (q && !v.title.toLowerCase().includes(q) && !v.videoId.toLowerCase().includes(q) && !v.tags.join(' ').toLowerCase().includes(q)) return false;
      if (categoryFilter && v.category !== categoryFilter) return false;
      if (langFilter && v.language !== langFilter) return false;
      return true;
    })
    .sort((a, b) => {
      let av: string | number = a[sortKey] ?? '';
      let bv: string | number = b[sortKey] ?? '';
      if (typeof av === 'string' && typeof bv === 'string') {
        av = av.toLowerCase(); bv = bv.toLowerCase();
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <span className={styles.sortNeutral}>⇅</span>;
    return <span className={styles.sortActive}>{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  if (loading) return <div className={styles.loadState}><div className={styles.spinner} />Loading video data...</div>;
  if (error) return <div className={styles.errorState}>{error}</div>;

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <div>
          <h2 className={styles.sectionTitle}>📹 All Videos</h2>
          <p className={styles.sectionSub}>Per-video analytics · sortable &amp; filterable · QR code generator</p>
        </div>
        <div className={styles.headerRight}>
          {isDemoData && <span className={styles.demoBadge}>Demo Data</span>}
          <button
            id="btn-open-add-video"
            className={styles.btnAddVideo}
            onClick={() => setShowAddModal(true)}
          >
            <span>➕</span> Add New Video
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <input
          id="video-search"
          className={styles.searchInput}
          type="search"
          placeholder="Search by title, ID, or tag…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          id="category-filter"
          className={styles.select}
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
        >
          <option value="">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select
          id="lang-filter"
          className={styles.select}
          value={langFilter}
          onChange={e => setLangFilter(e.target.value)}
        >
          <option value="">All Languages</option>
          {languages.map(l => <option key={l} value={l}>{l.toUpperCase()}</option>)}
        </select>
        <span className={styles.resultCount}>{filtered.length} video{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Table */}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.thSortable} onClick={() => handleSort('title')}>
                Title <SortIcon col="title" />
              </th>
              <th className={styles.thSortable} onClick={() => handleSort('category')}>
                Category <SortIcon col="category" />
              </th>
              <th className={styles.thSortable} onClick={() => handleSort('language')}>
                Lang <SortIcon col="language" />
              </th>
              <th className={`${styles.thSortable} ${styles.thNum}`} onClick={() => handleSort('views')}>
                Views <SortIcon col="views" />
              </th>
              <th className={`${styles.thSortable} ${styles.thNum}`} onClick={() => handleSort('uniqueViewers')}>
                Unique <SortIcon col="uniqueViewers" />
              </th>
              <th className={`${styles.thSortable} ${styles.thDate}`} onClick={() => handleSort('lastViewed')}>
                Last Viewed <SortIcon col="lastViewed" />
              </th>
              <th className={styles.thActions}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className={styles.emptyRow}>No videos match your filters</td></tr>
            ) : filtered.map(v => {
              const watchUrl = buildWatchUrl(baseUrl, v.youtubeId, v.language);
              return (
                <tr key={v.videoId} className={styles.row}>
                  <td className={styles.tdTitle}>
                    <div className={styles.titleMain}>{v.title}</div>
                    <div className={styles.titleSub}>ID: {v.videoId} • YouTube: <code>{v.youtubeId}</code></div>
                    <div className={styles.tagList}>
                      {v.tags.map(t => <span key={t} className={styles.tag}>{t}</span>)}
                    </div>
                  </td>
                  <td><span className={styles.categoryBadge}>{v.category}</span></td>
                  <td><span className={styles.langBadge}>{v.language.toUpperCase()}</span></td>
                  <td className={styles.tdNum}>
                    <span className={styles.numBig}>{v.views}</span>
                  </td>
                  <td className={styles.tdNum}>
                    <span className={styles.numMuted}>{v.uniqueViewers}</span>
                  </td>
                  <td className={styles.tdDate}>
                    {v.lastViewed
                      ? new Date(v.lastViewed).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                      : <span className={styles.never}>Never</span>}
                  </td>
                  <td className={styles.tdActions}>
                    <button
                      id={`qr-btn-${v.videoId}`}
                      className={styles.btnQr}
                      onClick={() => openQr(v)}
                      title="View QR Code"
                    >
                      📱 QR
                    </button>
                    <button
                      id={`copy-btn-${v.videoId}`}
                      className={`${styles.btnCopy} ${copiedId === v.videoId ? styles.btnCopied : ''}`}
                      onClick={() => copyUrl(watchUrl, v.videoId)}
                      title="Copy watch URL"
                    >
                      {copiedId === v.videoId ? '✅ Copied!' : '📋 Copy URL'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* QR Modal */}
      {qrModal && (
        <div className={styles.modalOverlay} onClick={closeQr}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <h3 className={styles.modalTitle}>QR Code</h3>
                <p className={styles.modalSub}>{qrModal.title}</p>
              </div>
              <button className={styles.closeBtn} onClick={closeQr} id="qr-modal-close">✕</button>
            </div>

            <div className={styles.qrWrap}>
              {qrDataUrl
                ? <Image src={qrDataUrl} alt={`QR code for ${qrModal.title}`} className={styles.qrImage} width={240} height={240} unoptimized />
                : <div className={styles.qrLoading}>Generating…</div>
              }
            </div>

            <div className={styles.urlBox}>
              <span className={styles.urlText}>{qrModal.url}</span>
            </div>

            <div className={styles.modalActions}>
              <button
                id="qr-download-btn"
                className={styles.btnDownload}
                onClick={downloadQr}
                disabled={!qrDataUrl}
              >
                ⬇️ Download PNG
              </button>
              <button
                id="qr-copy-url-btn"
                className={`${styles.btnCopyUrl} ${copiedId === 'modal' ? styles.btnCopied : ''}`}
                onClick={() => copyUrl(qrModal.url, 'modal')}
              >
                {copiedId === 'modal' ? '✅ Copied!' : '📋 Copy URL'}
              </button>
            </div>

            <canvas ref={canvasRef} style={{ display: 'none' }} />
          </div>
        </div>
      )}

      {/* Add Video Modal */}
      {showAddModal && (
        <div className={styles.modalOverlay} onClick={closeAddModal}>
          <div className={styles.addModal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <h3 className={styles.modalTitle}>➕ Add New Video</h3>
                <p className={styles.modalSub}>Extracts YouTube ID and saves to Google Sheet</p>
              </div>
              <button className={styles.closeBtn} onClick={closeAddModal} id="add-video-modal-close">✕</button>
            </div>

            {submitSuccess && lastAddedVideo ? (
              <div className={styles.addSuccessCard}>
                <div className={styles.successIcon}>🎉</div>
                <h4 className={styles.successTitle}>Video Added Successfully!</h4>
                <p className={styles.successMsg}>{submitSuccess}</p>
                <div className={styles.successActions}>
                  <button
                    id="btn-success-view-qr"
                    className={styles.btnSuccessQr}
                    onClick={() => {
                      const added = lastAddedVideo;
                      closeAddModal();
                      openQr(added);
                    }}
                  >
                    📱 View &amp; Download QR Code
                  </button>
                  <button
                    id="btn-success-add-another"
                    className={styles.btnSuccessAddAnother}
                    onClick={resetAddForm}
                  >
                    ➕ Add Another Video
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleAddVideo} className={styles.modalForm}>
                <div className={styles.modalBody}>
                  {submitError && (
                    <div className={styles.submitError}>
                      <span>⚠️</span>
                      <span>{submitError}</span>
                    </div>
                  )}

                  {/* YouTube URL or ID */}
                  <div className={styles.formGroup}>
                    <label htmlFor="video-url-input" className={styles.formLabel}>
                      <span>YouTube URL or ID <span className={styles.formRequired}>*</span></span>
                    </label>
                    <input
                      id="video-url-input"
                      type="text"
                      className={styles.formInput}
                      placeholder="Paste full URL (e.g. https://www.youtube.com/watch?v=... or https://youtu.be/...) or ID"
                      value={newUrlOrId}
                      onChange={e => setNewUrlOrId(e.target.value)}
                      required
                      autoFocus
                    />
                    <span className={styles.formHelper}>
                      Supports standard youtube.com links, youtu.be short links, shorts, embeds, and raw 11-char IDs.
                    </span>

                    {/* Live Extraction Preview */}
                    {newUrlOrId.trim() && (
                      liveYouTubeId ? (
                        <div className={styles.extractedBox}>
                          <div className={styles.extractedBadge}>
                            <span>✅</span>
                            <span>Extracted YouTube ID: <strong>{liveYouTubeId}</strong></span>
                          </div>
                          <div className={styles.thumbPreview}>
                            <Image
                              src={getYouTubeThumbnail(liveYouTubeId)}
                              alt="Video Thumbnail Preview"
                              className={styles.thumbImg}
                              width={110}
                              height={62}
                              unoptimized
                            />
                            <div className={styles.thumbMeta}>
                              <span className={styles.thumbLabel}>Ready to save &amp; embed</span>
                              <a
                                href={`https://www.youtube.com/watch?v=${liveYouTubeId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={styles.thumbLink}
                              >
                                Test on YouTube ↗
                              </a>
                            </div>
                          </div>

                        </div>
                      ) : (
                        <div className={styles.extractedError}>
                          ⚠️ Could not recognize a valid YouTube ID from this URL. Please check the URL format.
                        </div>
                      )
                    )}
                  </div>

                  {/* Title */}
                  <div className={styles.formGroup}>
                    <label htmlFor="video-title-input" className={styles.formLabel}>
                      <span>Title <span className={styles.formRequired}>*</span></span>
                    </label>
                    <input
                      id="video-title-input"
                      type="text"
                      className={styles.formInput}
                      placeholder="e.g. Cardiology: Heart Attack Symptoms & First Aid"
                      value={newTitle}
                      onChange={e => setNewTitle(e.target.value)}
                      required
                    />
                  </div>

                  {/* Slug / Video ID (Optional) */}
                  <div className={styles.formGroup}>
                    <label htmlFor="video-slug-input" className={styles.formLabel}>
                      <span>Custom Video Slug / ID <span className={styles.formHelper}>(Optional)</span></span>
                    </label>
                    <input
                      id="video-slug-input"
                      type="text"
                      className={styles.formInput}
                      placeholder="e.g. cardiac-first-aid (auto-generated from title if blank)"
                      value={newVideoId}
                      onChange={e => setNewVideoId(e.target.value)}
                    />
                  </div>

                  {/* Category & Language grid */}
                  <div className={styles.formGrid}>
                    <div className={styles.formGroup}>
                      <label htmlFor="video-category-input" className={styles.formLabel}>
                        <span>Category <span className={styles.formRequired}>*</span></span>
                      </label>
                      <input
                        id="video-category-input"
                        type="text"
                        className={styles.formInput}
                        placeholder="e.g. Oncology"
                        value={newCategory}
                        onChange={e => setNewCategory(e.target.value)}
                        required
                      />
                    </div>


                    <div className={styles.formGroup}>
                      <label htmlFor="video-language-select" className={styles.formLabel}>
                        <span>Language <span className={styles.formRequired}>*</span></span>
                      </label>
                      <select
                        id="video-language-select"
                        className={styles.formSelect}
                        value={newLanguage}
                        onChange={e => setNewLanguage(e.target.value)}
                      >
                        {COMMON_LANGUAGES.map(l => (
                          <option key={l.code} value={l.code}>{l.label}</option>
                        ))}
                        <option value="__custom__">+ Other Language Code</option>
                      </select>
                      {newLanguage === '__custom__' && (
                        <input
                          id="video-custom-language-input"
                          type="text"
                          className={styles.formInput}
                          placeholder="e.g. fr, de, ml…"
                          value={newCustomLanguage}
                          onChange={e => setNewCustomLanguage(e.target.value)}
                          style={{ marginTop: '0.4rem' }}
                          required
                        />
                      )}
                    </div>
                  </div>

                  {/* Tags */}
                  <div className={styles.formGroup}>
                    <label htmlFor="video-tags-input" className={styles.formLabel}>
                      <span>Tags <span className={styles.formHelper}>(Comma-separated)</span></span>
                    </label>
                    <input
                      id="video-tags-input"
                      type="text"
                      className={styles.formInput}
                      placeholder="e.g. Heart Health, First Aid, Emergency, ECG"
                      value={newTags}
                      onChange={e => setNewTags(e.target.value)}
                    />
                  </div>

                  {/* Description */}
                  <div className={styles.formGroup}>
                    <label htmlFor="video-description-input" className={styles.formLabel}>
                      <span>Description</span>
                    </label>
                    <textarea
                      id="video-description-input"
                      className={styles.formTextarea}
                      rows={3}
                      placeholder="Brief overview of clinical topics and guidelines covered in this video…"
                      value={newDescription}
                      onChange={e => setNewDescription(e.target.value)}
                    />
                  </div>
                </div>

                <div className={styles.modalFooter}>
                  <button
                    type="button"
                    className={styles.btnCancel}
                    onClick={closeAddModal}
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    id="btn-submit-add-video"
                    type="submit"
                    className={styles.btnSubmit}
                    disabled={submitting || !liveYouTubeId || !newTitle.trim()}
                  >
                    {submitting ? (
                      <>
                        <span className={styles.spinner} style={{ width: 14, height: 14, borderWidth: 2 }} />
                        <span>Saving to Sheet…</span>
                      </>
                    ) : (
                      <>
                        <span>💾</span>
                        <span>Save to Google Sheet</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

