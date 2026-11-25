'use client';

import { useCallback, useEffect, useState } from 'react';

/** Reader-controlled text size, remembered on the device. Applied as a CSS variable (--reader-scale). */
const KEY = 'guide_text_size';
const SCALES = [1, 1.15, 1.3, 1.5];

function apply(step: number) {
  document.documentElement.style.setProperty('--reader-scale', String(SCALES[step] ?? 1));
}

export function useReadingSize() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    let saved = 0;
    try {
      saved = Number(localStorage.getItem(KEY)) || 0;
    } catch {
      // ignore: default size
    }
    const s = Math.min(Math.max(saved, 0), SCALES.length - 1);
    setStep(s);
    apply(s);
  }, []);

  const change = useCallback((delta: number) => {
    setStep(prev => {
      const next = Math.min(Math.max(prev + delta, 0), SCALES.length - 1);
      apply(next);
      try {
        localStorage.setItem(KEY, String(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  return {
    step,
    canDecrease: step > 0,
    canIncrease: step < SCALES.length - 1,
    decrease: () => change(-1),
    increase: () => change(1),
  };
}
