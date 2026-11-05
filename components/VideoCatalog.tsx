'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import QRCode from 'qrcode';
import { VideoItem } from '@/types/video';
import { getYouTubeThumbnail } from '@/lib/youtube';
import SiteHeader from '@/components/SiteHeader';
import styles from './VideoCatalog.module.css';

interface Props {
  initialVideos: VideoItem[];
  isAdmin?: boolean;
}

type SortOption = 'default' | 'title-asc' | 'title-desc' | 'category-asc';

const LANGUAGE_LABELS: Record<string, string> = {
  en: 'English (EN)',
  hi: 'Hindi (HI)',
  gu: 'Gujarati (GU)',
  mr: 'Marathi (MR)',
  bn: 'Bengali (BN)',
  ta: 'Tamil (TA)',
  te: 'Telugu (TE)',
  kn: 'Kannada (KN)',
};

export default function VideoCatalog({ initialVideos, isAdmin }: Props) {
  const [videos] = useState<VideoItem[]>(initialVideos);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('default');
  const [showGuidebookHelp, setShowGuidebookHelp] = useState(false);

  // QR Modal State
  const [qrModalVideo, setQrModalVideo] = useState<VideoItem | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);

  // Extract all categories with count
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const v of videos) {
      const cat = v.category || 'General';
      counts[cat] = (counts[cat] || 0) + 1;
    }
    return counts;
  }, [videos]);

  const uniqueCategories = useMemo(() => {
    return Object.keys(categoryCounts).sort();
  }, [categoryCounts]);

  // Extract all tags with count
  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const v of videos) {
      if (Array.isArray(v.tags)) {
        for (const t of v.tags) {
          const cleanTag = t.trim();
          if (cleanTag) {
            counts[cleanTag] = (counts[cleanTag] || 0) + 1;
          }
        }
      }
    }
    return counts;
  }, [videos]);

  const allTags = useMemo(() => {
    return Object.keys(tagCounts).sort((a, b) => tagCounts[b] - tagCounts[a]);
  }, [tagCounts]);

  // Extract unique languages
  const uniqueLanguages = useMemo(() => {
    const langs = new Set<string>();
    for (const v of videos) {
      if (v.language) langs.add(v.language.toLowerCase());
    }
    return Array.from(langs).sort();
  }, [videos]);

  // Handle clicking a tag pill on any card or tag bar
  const handleTagClick = useCallback((tag: string) => {
    setSelectedTag((prev) => (prev?.toLowerCase() === tag.toLowerCase() ? null : tag));
  }, []);

  // Filter and sort videos
  const filteredVideos = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return videos.filter((video) => {
      // Category filter
      if (selectedCategory !== 'all' && (video.category || 'General') !== selectedCategory) {
        return false;
      }

      // Tag filter
      if (selectedTag) {
        const hasTag = video.tags && video.tags.some(
          (t) => t.trim().toLowerCase() === selectedTag.toLowerCase()
        );
        if (!hasTag) return false;
      }

      // Language filter
      if (selectedLanguage !== 'all' && (video.language || 'en').toLowerCase() !== selectedLanguage.toLowerCase()) {
        return false;
      }

      // Search query
      if (q) {
        const inTitle = video.title.toLowerCase().includes(q);
        const inDesc = (video.description || '').toLowerCase().includes(q);
        const inCat = (video.category || '').toLowerCase().includes(q);
        const inTags = video.tags && video.tags.some((t) => t.toLowerCase().includes(q));
        if (!inTitle && !inDesc && !inCat && !inTags) {
          return false;
        }
      }

      return true;
    });
  }, [videos, searchQuery, selectedCategory, selectedTag, selectedLanguage]);

  const sortedVideos = useMemo(() => {
    const list = [...filteredVideos];
    switch (sortBy) {
      case 'title-asc':
        return list.sort((a, b) => a.title.localeCompare(b.title));
      case 'title-desc':
        return list.sort((a, b) => b.title.localeCompare(a.title));
      case 'category-asc':
        return list.sort((a, b) => (a.category || '').localeCompare(b.category || '') || a.title.localeCompare(b.title));
      case 'default':
      default:
        return list;
    }
  }, [filteredVideos, sortBy]);

  const hasActiveFilters = Boolean(
    searchQuery.trim() ||
    selectedCategory !== 'all' ||
    selectedTag !== null ||
    selectedLanguage !== 'all' ||
    sortBy !== 'default'
  );

  const resetAllFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedTag(null);
    setSelectedLanguage('all');
    setSortBy('default');
  };

  // Generate QR Data URL when modal opens
  useEffect(() => {
    if (!qrModalVideo) {
      setQrDataUrl('');
      setCopiedLink(false);
      return;
    }

    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const watchUrl = `${origin}/watch?video=${encodeURIComponent(qrModalVideo.id || qrModalVideo.youtubeId)}&lang=${encodeURIComponent(qrModalVideo.language || 'en')}`;

    QRCode.toDataURL(watchUrl, {
      width: 440,
      margin: 2,
      color: { dark: '#0a0f1e', light: '#ffffff' },
      errorCorrectionLevel: 'M',
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('Failed to generate QR code:', err));
  }, [qrModalVideo]);

  const handleCopyLink = () => {
    if (!qrModalVideo) return;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const watchUrl = `${origin}/watch?video=${encodeURIComponent(qrModalVideo.id || qrModalVideo.youtubeId)}&lang=${encodeURIComponent(qrModalVideo.language || 'en')}`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(watchUrl).then(() => {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      });
    }
  };

  return (
    <>
      {/* Top Header / Navigation with consistent logo/title and conditional admin login */}
      <SiteHeader
        isAdmin={isAdmin}
        showGuidebookButton
        onGuidebookClick={() => setShowGuidebookHelp((prev) => !prev)}
        guidebookExpanded={showGuidebookHelp}
      />

      <div className={styles.container}>
        {/* Guidebook Helper Drawer */}
      {showGuidebookHelp && (
        <aside className={styles.guidebookBanner} role="region" aria-label="Guidebook instructions">
          <div className={styles.guidebookBannerLeft}>
            <span className={styles.guidebookIcon}>📱</span>
            <div>
              <div className={styles.guidebookBannerTitle}>Have a physical guidebook or clinic poster?</div>
              <div className={styles.guidebookBannerText}>
                You can scan the QR code directly with your smartphone camera to jump straight to the video. Alternatively, browse and watch any video below.
              </div>
            </div>
          </div>
          <button
            type="button"
            className={styles.guidebookBannerDismiss}
            onClick={() => setShowGuidebookHelp(false)}
            aria-label="Close guidebook guide"
          >
            ✕
          </button>
        </aside>
      )}

      {/* Hero Intro */}
      <section className={styles.hero}>
        <div className={styles.badge}>
          <span className={styles.badgePulse}></span>
          <span>Verified Health Education</span>
        </div>
        <h1 className={styles.title}>Educational Medical Videos</h1>
        <p className={styles.subtitle}>
          Explore physician-reviewed educational videos for patients, caregivers, and community health workers. Click any tag to filter by related clinical topics.
        </p>
      </section>

      {/* Search, Filter & Sort Controls Deck */}
      <section className={styles.filterDeck} aria-label="Video search and filter controls">
        <div className={styles.searchSortRow}>
          {/* Search Box */}
          <div className={styles.searchBox}>
            <span className={styles.searchIcon}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search by title, topic, tags, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search videos"
            />
            {searchQuery && (
              <button
                type="button"
                className={styles.searchClear}
                onClick={() => setSearchQuery('')}
                aria-label="Clear search query"
              >
                ✕
              </button>
            )}
          </div>

          {/* Dropdown Filters */}
          <div className={styles.dropdownGroup}>
            {/* Language Filter */}
            <div className={styles.selectWrapper}>
              <label htmlFor="language-select" className={styles.selectLabel}>Language</label>
              <select
                id="language-select"
                className={styles.selectInput}
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
              >
                <option value="all">All Languages</option>
                {uniqueLanguages.map((lang) => (
                  <option key={lang} value={lang}>
                    {LANGUAGE_LABELS[lang] || lang.toUpperCase()}
                  </option>
                ))}
              </select>
              <span className={styles.selectArrow}>▼</span>
            </div>

            {/* Sort Options */}
            <div className={styles.selectWrapper}>
              <label htmlFor="sort-select" className={styles.selectLabel}>Sort By</label>
              <select
                id="sort-select"
                className={styles.selectInput}
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
              >
                <option value="default">Default Order</option>
                <option value="title-asc">Title: A to Z</option>
                <option value="title-desc">Title: Z to A</option>
                <option value="category-asc">Category: A to Z</option>
              </select>
              <span className={styles.selectArrow}>▼</span>
            </div>
          </div>
        </div>

        {/* Categories Row */}
        <div className={styles.categoryRow} role="radiogroup" aria-label="Filter by category">
          <span className={styles.categoryLabel}>Category:</span>
          <button
            type="button"
            className={`${styles.categoryPill} ${selectedCategory === 'all' ? styles.categoryPillActive : ''}`}
            onClick={() => setSelectedCategory('all')}
          >
            <span>All</span>
            <span className={styles.categoryCount}>{videos.length}</span>
          </button>
          {uniqueCategories.map((category) => (
            <button
              key={category}
              type="button"
              className={`${styles.categoryPill} ${selectedCategory === category ? styles.categoryPillActive : ''}`}
              onClick={() => setSelectedCategory(category)}
            >
              <span>{category}</span>
              <span className={styles.categoryCount}>{categoryCounts[category] || 0}</span>
            </button>
          ))}
        </div>

        {/* Tags Filter Row */}
        {allTags.length > 0 && (
          <div className={styles.tagFilterRow} role="group" aria-label="Filter by tag">
            <span className={styles.categoryLabel}>Tags:</span>
            {allTags.map((tag) => {
              const isTagActive = selectedTag?.toLowerCase() === tag.toLowerCase();
              return (
                <button
                  key={tag}
                  type="button"
                  className={`${styles.tagFilterPill} ${isTagActive ? styles.tagFilterPillActive : ''}`}
                  onClick={() => handleTagClick(tag)}
                  title={isTagActive ? `Active tag: #${tag}. Click to clear.` : `Filter by tag: #${tag}`}
                  aria-pressed={isTagActive}
                >
                  <span className={styles.tagHash}>#</span>
                  <span>{tag}</span>
                  <span className={styles.categoryCount}>{tagCounts[tag] || 0}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Active Filters Summary Bar */}
        {hasActiveFilters && (
          <div className={styles.activeBar}>
            <div className={styles.activeChips}>
              <span className={styles.activeLabel}>Active filters:</span>
              {searchQuery && (
                <button
                  type="button"
                  className={styles.activeChip}
                  onClick={() => setSearchQuery('')}
                  title="Remove search filter"
                >
                  <span>Search: &quot;{searchQuery}&quot;</span>
                  <span className={styles.chipDismiss}>✕</span>
                </button>
              )}
              {selectedCategory !== 'all' && (
                <button
                  type="button"
                  className={styles.activeChip}
                  onClick={() => setSelectedCategory('all')}
                  title="Remove category filter"
                >
                  <span>Category: {selectedCategory}</span>
                  <span className={styles.chipDismiss}>✕</span>
                </button>
              )}
              {selectedTag && (
                <button
                  type="button"
                  className={styles.activeChip}
                  onClick={() => setSelectedTag(null)}
                  title="Remove tag filter"
                >
                  <span>Tag: #{selectedTag}</span>
                  <span className={styles.chipDismiss}>✕</span>
                </button>
              )}
              {selectedLanguage !== 'all' && (
                <button
                  type="button"
                  className={styles.activeChip}
                  onClick={() => setSelectedLanguage('all')}
                  title="Remove language filter"
                >
                  <span>Lang: {LANGUAGE_LABELS[selectedLanguage] || selectedLanguage.toUpperCase()}</span>
                  <span className={styles.chipDismiss}>✕</span>
                </button>
              )}
              {sortBy !== 'default' && (
                <button
                  type="button"
                  className={styles.activeChip}
                  onClick={() => setSortBy('default')}
                  title="Reset sort order"
                >
                  <span>Sort: {sortBy}</span>
                  <span className={styles.chipDismiss}>✕</span>
                </button>
              )}
            </div>
            <button
              type="button"
              className={styles.resetBtn}
              onClick={resetAllFilters}
            >
              Reset all filters
            </button>
          </div>
        )}
      </section>

      {/* Results Count Header */}
      <div className={styles.resultsHeader}>
        <div className={styles.resultsCount}>
          Showing <strong>{sortedVideos.length}</strong> of <strong>{videos.length}</strong> videos
          {selectedTag && (
            <span> tagged with <strong>#{selectedTag}</strong></span>
          )}
        </div>
      </div>

      {/* Video Cards Grid */}
      {sortedVideos.length > 0 ? (
        <div className={styles.videoGrid} role="feed" aria-busy="false">
          {sortedVideos.map((video) => {
            const watchHref = `/watch?video=${encodeURIComponent(video.id || video.youtubeId)}&lang=${encodeURIComponent(video.language || 'en')}`;
            const thumbnailSrc = getYouTubeThumbnail(video.youtubeId);
            const langLabel = LANGUAGE_LABELS[video.language?.toLowerCase()] || (video.language || 'EN').toUpperCase();

            return (
              <article key={video.id || video.youtubeId} className={styles.videoCard}>
                {/* Thumbnail Area */}
                <Link href={watchHref} className={styles.thumbnailWrapper} tabIndex={-1} aria-hidden="true">
                  <Image
                    src={thumbnailSrc}
                    alt={video.title}
                    width={480}
                    height={270}
                    className={styles.thumbnailImg}
                    unoptimized
                  />
                  <div className={styles.thumbnailOverlay}>
                    <div className={styles.playBtn} aria-hidden="true">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                        <polygon points="5 3 19 12 5 21 5 3" />
                      </svg>
                    </div>
                  </div>
                  {/* Overlay Badges */}
                  <span className={styles.badgeTopLeft}>{video.category || 'General'}</span>
                  <span className={styles.badgeTopRight}>{langLabel.split(' ')[0]}</span>
                </Link>

                {/* Card Body */}
                <div className={styles.cardBody}>
                  <h2 className={styles.cardTitle}>
                    <Link href={watchHref} className={styles.cardTitleLink}>
                      {video.title}
                    </Link>
                  </h2>

                  <p className={styles.cardDesc}>
                    {video.description || 'Clinical educational video covering diagnosis, risk factors, and patient care recommendations.'}
                  </p>

                  {/* Tags as Clickable Pills */}
                  {Array.isArray(video.tags) && video.tags.length > 0 && (
                    <div className={styles.tagsSection}>
                      <div className={styles.tagsLabel}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                          <line x1="7" y1="7" x2="7.01" y2="7" />
                        </svg>
                        <span>Tags:</span>
                      </div>
                      <div className={styles.tagList}>
                        {video.tags.map((tag) => {
                          const isTagActive = selectedTag?.toLowerCase() === tag.trim().toLowerCase();
                          return (
                            <button
                              key={tag}
                              type="button"
                              className={`${styles.tagPill} ${isTagActive ? styles.activeTagPill : ''}`}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleTagClick(tag.trim());
                              }}
                              title={isTagActive ? `Active filter: #${tag}. Click to remove.` : `Filter videos by #${tag}`}
                              aria-pressed={isTagActive}
                            >
                              <span className={styles.tagHash}>#</span>
                              <span>{tag.trim()}</span>
                              {isTagActive && <span className={styles.tagActiveCheck}>✓</span>}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Footer Actions */}
                <div className={styles.cardFooter}>
                  <Link href={watchHref} className={styles.watchBtn}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                    <span>Watch Video</span>
                  </Link>
                  <button
                    type="button"
                    className={styles.qrBtn}
                    onClick={() => setQrModalVideo(video)}
                    title="View &amp; scan QR code"
                    aria-label={`Show QR code for ${video.title}`}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <rect x="3" y="3" width="7" height="7" />
                      <rect x="14" y="3" width="7" height="7" />
                      <rect x="14" y="14" width="7" height="7" />
                      <rect x="3" y="14" width="7" height="7" />
                    </svg>
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>🔍</div>
          <h2 className={styles.emptyTitle}>No Matching Videos Found</h2>
          <p className={styles.emptyText}>
            We couldn&apos;t find any educational videos matching your current search or filter combination.
            Try clearing filters or searching with a different term.
          </p>
          <button
            type="button"
            className={styles.emptyClearBtn}
            onClick={resetAllFilters}
          >
            Clear All Filters
          </button>
        </div>
      )}

      {/* QR Preview Modal */}
      {qrModalVideo && (
        <div
          className={styles.modalBackdrop}
          onClick={() => setQrModalVideo(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="qr-modal-title"
        >
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className={styles.modalClose}
              onClick={() => setQrModalVideo(null)}
              aria-label="Close modal"
            >
              ✕
            </button>
            <h2 id="qr-modal-title" className={styles.modalTitle}>{qrModalVideo.title}</h2>
            <p className={styles.modalSub}>
              Scan this code with a smartphone camera to watch directly.
            </p>

            <div className={styles.modalQrBox}>
              {qrDataUrl ? (
                <Image
                  src={qrDataUrl}
                  alt={`QR Code for ${qrModalVideo.title}`}
                  width={220}
                  height={220}
                  className={styles.modalQrImg}
                  unoptimized
                />
              ) : (
                <div style={{ width: 220, height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>
                  Generating QR...
                </div>
              )}
            </div>

            <div className={styles.modalActions}>
              <Link
                href={`/watch?video=${encodeURIComponent(qrModalVideo.id || qrModalVideo.youtubeId)}&lang=${encodeURIComponent(qrModalVideo.language || 'en')}`}
                className={styles.modalWatchBtn}
              >
                Watch Video Now
              </Link>
              <button
                type="button"
                className={styles.modalCopyBtn}
                onClick={handleCopyLink}
              >
                {copiedLink ? '✓ Watch Link Copied!' : 'Copy Direct Watch Link'}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  );
}
