'use client';

import { useEffect, useState } from 'react';

/**
 * Reading progress, kept only on the reader's own device (localStorage).
 * It powers "Continue reading", check marks and per-chapter progress bars. Nothing is sent anywhere.
 */
const KEY = 'guide_progress_v1';
const EVENT = 'guide-progress-change';

export interface LastVisited {
  chapterId: string;
  chapterTitle: string;
  pointId?: string;
  pointHeading?: string;
  lang: string;
  at: number;
}

export interface Progress {
  /** point id -> time it was opened */
  read: Record<string, number>;
  last?: LastVisited;
  /** point id -> best quiz result on this device */
  quiz: Record<string, QuizResult>;
}

export interface QuizResult {
  correct: number;
  total: number;
  at: number;
}

const EMPTY: Progress = { read: {}, quiz: {} };

export function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw);
    return {
      read: parsed && typeof parsed.read === 'object' && parsed.read ? parsed.read : {},
      last: parsed?.last,
      quiz: parsed && typeof parsed.quiz === 'object' && parsed.quiz ? parsed.quiz : {},
    };
  } catch {
    return EMPTY;
  }
}

function save(next: Progress) {
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(EVENT));
  } catch {
    // Storage can be unavailable (private mode, in-app browsers); progress is a nicety, never required
  }
}

export function markPointRead(pointId: string) {
  const p = loadProgress();
  if (p.read[pointId]) return;
  save({ ...p, read: { ...p.read, [pointId]: Date.now() } });
}

/** Keeps the best score per point, so a retry can only improve the stored result. */
export function saveQuizResult(pointId: string, correct: number, total: number) {
  const p = loadProgress();
  const prev = p.quiz[pointId];
  if (prev && prev.total === total && prev.correct >= correct) return;
  save({ ...p, quiz: { ...p.quiz, [pointId]: { correct, total, at: Date.now() } } });
}

export function setLastVisited(last: Omit<LastVisited, 'at'>) {
  save({ ...loadProgress(), last: { ...last, at: Date.now() } });
}

/** Reactive progress: updates when it changes in this tab or another one. Empty on the server and first paint. */
export function useProgress(): Progress {
  const [progress, setProgress] = useState<Progress>(EMPTY);

  useEffect(() => {
    const update = () => setProgress(loadProgress());
    update();
    window.addEventListener(EVENT, update);
    window.addEventListener('storage', update);
    return () => {
      window.removeEventListener(EVENT, update);
      window.removeEventListener('storage', update);
    };
  }, []);

  return progress;
}
