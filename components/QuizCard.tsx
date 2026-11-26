'use client';

import { useRef, useState } from 'react';
import { IconCheck } from '@/components/admin/icons';
import { saveQuizResult } from '@/lib/progress';
import { STRINGS } from '@/lib/strings';
import type { Lang, OptionKey, Question } from '@/types/guide';
import styles from './QuizCard.module.css';

interface QuizCardProps {
  pointId: string;
  questions: Question[];
  lang: Lang;
  userId: string;
}

/** Per question: every option the patient has tried, in order. The first try decides the score. */
type Tries = Record<string, OptionKey[]>;

/**
 * Taps are sent one at a time, in order, so two quick taps can never race to create two rows.
 * `newRun` marks the first tap of a fresh visit, so the server starts a new " | " group.
 */
let queue: Promise<unknown> = Promise.resolve();
function logAttempt(questionId: string, selected: OptionKey, newRun: boolean, userId: string, language: string) {
  const uid = localStorage.getItem('user_id') || userId;
  queue = queue.then(() =>
    fetch('/api/quiz-attempt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(newRun ? { 'x-quiz-new-run': '1' } : {}) },
      body: JSON.stringify({ questionId, selected, userId: uid, language }),
    }).catch(() => {
      // logging is best effort; the self-test must keep working
    })
  );
}

export default function QuizCard({ pointId, questions, lang, userId }: QuizCardProps) {
  const t = STRINGS[lang];
  const [tries, setTries] = useState<Tries>({});
  // Only the first run-through is logged; "try again" is practice
  const logging = useRef(true);

  const isSolved = (q: Question) => tries[q.id]?.includes(q.correct) ?? false;
  const solvedCount = questions.filter(isSolved).length;
  const done = solvedCount === questions.length;
  const firstTryCorrect = questions.filter(q => tries[q.id]?.[0] === q.correct).length;

  const choose = (q: Question, key: OptionKey) => {
    if (isSolved(q) || tries[q.id]?.includes(key)) return;
    const next: Tries = { ...tries, [q.id]: [...(tries[q.id] ?? []), key] };
    setTries(next);

    // Every tap is logged onto this reader's single row for the question
    if (logging.current) logAttempt(q.id, key, !tries[q.id], userId, lang);

    if (questions.every(x => next[x.id]?.includes(x.correct))) {
      saveQuizResult(pointId, questions.filter(x => next[x.id]?.[0] === x.correct).length, questions.length);
    }
  };

  const reset = () => {
    logging.current = false;
    setTries({});
  };

  return (
    <section className={styles.card} aria-labelledby={`quiz-${pointId}`}>
      <h2 id={`quiz-${pointId}`} className={styles.title}>{t.testYourself}</h2>
      <p className={styles.hint}>{t.testHint}</p>

      {questions.map((q, n) => {
        const attempted = tries[q.id] ?? [];
        const solved = isSolved(q);
        return (
          <fieldset key={q.id} className={styles.question}>
            <legend className={styles.legend}>
              <span className={styles.num}>{n + 1}</span>
              {q.question}
            </legend>

            <div className={styles.options}>
              {q.options.map(o => {
                const tried = attempted.includes(o.key);
                const right = tried && o.key === q.correct;
                const wrong = tried && o.key !== q.correct;
                return (
                  <button
                    key={o.key}
                    type="button"
                    className={`${styles.option} ${right ? styles.right : ''} ${wrong ? styles.wrong : ''}`}
                    onClick={() => choose(q, o.key)}
                    disabled={solved || tried}
                    aria-pressed={tried}
                  >
                    <span className={styles.key} aria-hidden="true">{o.key.toUpperCase()}</span>
                    <span className={styles.optionText}>{o.text}</span>
                  </button>
                );
              })}
            </div>

            <div aria-live="polite">
              {solved && (
                <p className={`${styles.feedback} ${styles.feedbackRight}`}>
                  <strong>{t.correctAnswer}</strong>
                  {q.explanation && <span> {q.explanation}</span>}
                </p>
              )}
              {!solved && attempted.length > 0 && (
                <p className={`${styles.feedback} ${styles.feedbackWrong}`}>{t.wrongAnswer}</p>
              )}
            </div>
          </fieldset>
        );
      })}

      {done && (
        <div className={styles.result} aria-live="polite">
          <span className={styles.resultIcon}><IconCheck size={18} /></span>
          <span className={styles.resultText}>
            {t.yourScore}: {firstTryCorrect} / {questions.length}
          </span>
          <button type="button" className={styles.retry} onClick={reset}>{t.tryAgain}</button>
        </div>
      )}
    </section>
  );
}
