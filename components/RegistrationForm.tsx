'use client';

import { useState } from 'react';
import { normalizeMobile, isValidMobile, setClientCookie } from '@/lib/mobile';
import type { Lang } from '@/lib/languages';
import { GENDERS, REG, USER_TYPES } from '@/lib/registrationStrings';
import styles from './RegistrationForm.module.css';

interface FormData {
  name: string;
  age: string;
  gender: string;
  mobile: string;
  email: string;
  country: string;
  state: string;
  district: string;
  userType: string;
  userTypeOther: string;
}

interface RegistrationFormProps {
  onSuccess: (userId?: string, userName?: string) => void;
  userId: string;
  /** Language of the labels and messages. Stored values (gender, role) stay in English. */
  lang?: Lang;
}

export default function RegistrationForm({ onSuccess, userId, lang = 'gu' }: RegistrationFormProps) {
  const t = REG[lang];

  // Step 1: 'mobile' (phone check), Step 2: 'details' (first-time profile registration)
  const [step, setStep] = useState<'mobile' | 'details'>('mobile');

  // Step 1 state
  const [mobileInput, setMobileInput] = useState('');
  const [checkingMobile, setCheckingMobile] = useState(false);
  const [welcomeUser, setWelcomeUser] = useState<string | null>(null);

  // Step 2 state
  const [formData, setFormData] = useState<FormData>({
    name: '',
    age: '',
    gender: '',
    mobile: '',
    email: '',
    country: 'India',
    state: 'Gujarat',
    district: '',
    userType: '',
    userTypeOther: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleMobileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    // Allow digits, spaces, and dashes for easy typing/pasting
    setMobileInput(e.target.value);
  };

  // Step 1: Check if mobile already exists in Google Sheet
  const handleMobileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const clean = normalizeMobile(mobileInput);
    if (!clean || !isValidMobile(clean)) {
      setError(t.mobileInvalid);
      return;
    }

    setCheckingMobile(true);
    try {
      const res = await fetch('/api/check-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: clean }),
      });

      if (!res.ok) {
        throw new Error('Verification failed');
      }

      const data = await res.json();

      if (data.exists && data.user) {
        // Returning registered user recognized
        const existingId = data.user.userId || userId;
        setWelcomeUser(data.user.name || '');

        // Store registration in both LocalStorage & 1-Year Cookie
        try {
          localStorage.setItem('user_registered', 'true');
          localStorage.setItem('user_id', existingId);
          localStorage.setItem('user_mobile', clean);
          if (data.user.name) {
            localStorage.setItem('user_name', data.user.name);
          }
        } catch {
          // LocalStorage fallback handled silently
        }
        setClientCookie('qr_user_registered', 'true');
        setClientCookie('qr_user_id', existingId);
        setClientCookie('qr_user_mobile', clean);
        if (data.user.name) {
          setClientCookie('qr_user_name', data.user.name);
        }

        // Brief delay for the friendly greeting before the content opens
        setTimeout(() => {
          onSuccess(existingId, data.user.name || '');
        }, 700);
      } else {
        // New user: proceed to Step 2 with phone number already saved
        setFormData(prev => ({ ...prev, mobile: clean }));
        setStep('details');
      }
    } catch {
      setError(t.verifyFail);
    } finally {
      setCheckingMobile(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Step 2: Submit New Profile
  const handleDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) return setError(t.errors.name);
    if (!formData.age || isNaN(Number(formData.age)) || Number(formData.age) < 1 || Number(formData.age) > 120) {
      return setError(t.errors.age);
    }
    if (!formData.gender) return setError(t.errors.gender);
    if (!formData.district.trim()) return setError(t.errors.district);
    if (!formData.userType) return setError(t.errors.userType);
    if (formData.userType === 'Other' && !formData.userTypeOther.trim()) return setError(t.errors.other);

    setLoading(true);
    try {
      const cleanMob = normalizeMobile(formData.mobile || mobileInput);

      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, ...formData, mobile: cleanMob }),
      });

      if (!res.ok) {
        throw new Error('Registration failed');
      }

      const data = await res.json();
      const effectiveId = data.userId || userId;
      const registeredName = formData.name.trim();

      // Persist across both LocalStorage & 1-Year Cookie
      try {
        localStorage.setItem('user_registered', 'true');
        localStorage.setItem('user_id', effectiveId);
        localStorage.setItem('user_mobile', cleanMob);
        if (registeredName) {
          localStorage.setItem('user_name', registeredName);
        }
      } catch {
        // Silent fallback
      }
      setClientCookie('qr_user_registered', 'true');
      setClientCookie('qr_user_id', effectiveId);
      setClientCookie('qr_user_mobile', cleanMob);
      if (registeredName) {
        setClientCookie('qr_user_name', registeredName);
      }

      onSuccess(effectiveId, registeredName);
    } catch {
      setError(t.errors.generic);
    } finally {
      setLoading(false);
    }
  };

  const Steps = (
    <ol className={styles.steps} aria-hidden="true">
      <li className={`${styles.stepDot} ${styles.stepDone}`} />
      <li className={`${styles.stepDot} ${step === 'details' ? styles.stepDone : ''}`} />
    </ol>
  );

  const Spinner = <span className={styles.spinner} aria-hidden="true" />;

  // -------------------------------------------------------------
  // STEP 1: MOBILE NUMBER (a quick check for returning readers)
  // -------------------------------------------------------------
  if (step === 'mobile') {
    return (
      <main className={styles.wrap} id="main" lang={lang}>
        <div className={styles.card}>
          {Steps}
          <div className={styles.header}>
            <span className={styles.iconWrap} aria-hidden="true">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="6" y="2.5" width="12" height="19" rx="2.5" />
                <path d="M11 18.5h2" />
              </svg>
            </span>
            <h1 className={styles.title}>{t.welcome}</h1>
            <p className={styles.subtitle}>{t.mobileSubtitle}</p>
          </div>

          <form onSubmit={handleMobileSubmit} className={styles.form} noValidate>
            {welcomeUser && (
              <div className={styles.welcomeBanner} role="status">
                {t.welcomeBack(welcomeUser)}
              </div>
            )}

            <div className={styles.field}>
              <label htmlFor="mobileInput" className={styles.label}>{t.mobileLabel}</label>
              <div className={styles.mobileWrap}>
                <span className={styles.prefix} aria-hidden="true">+91</span>
                <input
                  id="mobileInput"
                  name="mobileInput"
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="tel-national"
                  enterKeyHint="go"
                  autoFocus
                  placeholder="98765 43210"
                  value={mobileInput}
                  onChange={handleMobileInputChange}
                  className={styles.mobileInput}
                  disabled={checkingMobile || welcomeUser !== null}
                  maxLength={14}
                  required
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? 'reg-error' : undefined}
                />
              </div>
            </div>

            {error && <p id="reg-error" className={styles.error} role="alert">{error}</p>}

            <button type="submit" className={styles.submit} disabled={checkingMobile || welcomeUser !== null}>
              {checkingMobile ? <>{Spinner}{t.verifying}</> : welcomeUser ? <>{Spinner}{t.starting}</> : t.continue}
            </button>

            <p className={styles.privacy}>{t.privacy}</p>
          </form>
        </div>
      </main>
    );
  }

  // -------------------------------------------------------------
  // STEP 2: QUICK PROFILE (first-time readers only)
  // -------------------------------------------------------------
  const cleanMobileDisplay = normalizeMobile(formData.mobile || mobileInput);

  return (
    <main className={styles.wrap} id="main" lang={lang}>
      <div className={styles.card}>
        {Steps}
        <div className={styles.header}>
          <span className={styles.stepBadge}>{t.step}</span>
          <h1 className={styles.title}>{t.title2}</h1>
          <p className={styles.subtitle}>{t.sub2}</p>
        </div>

        {/* Confirmed mobile number, with a way back to fix a typo */}
        <div className={styles.confirmed}>
          <div>
            <span className={styles.confirmedLabel}>{t.mobileLabel}</span>
            <span className={styles.confirmedValue}>+91 {cleanMobileDisplay}</span>
          </div>
          <button type="button" className={styles.changeBtn} onClick={() => setStep('mobile')}>
            {t.change}
          </button>
        </div>

        <form onSubmit={handleDetailsSubmit} className={styles.form} noValidate>
          <fieldset className={styles.group}>
            <legend className={styles.legend}><span className={styles.legendNum}>1</span>{t.personal}</legend>

            <div className={styles.field}>
              <label htmlFor="name" className={styles.label}>{t.fullName}</label>
              <input
                id="name" name="name" type="text" value={formData.name} onChange={handleChange}
                placeholder={t.namePh} className={styles.input} autoComplete="name" autoFocus required
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="age" className={styles.label}>{t.age}</label>
              <input
                id="age" name="age" type="number" inputMode="numeric" min="1" max="120" value={formData.age}
                onChange={handleChange} placeholder={t.agePh} className={styles.input} required
              />
            </div>

            <fieldset className={styles.field}>
              <legend className={styles.label}>{t.gender}</legend>
              <div className={styles.pills} role="radiogroup" aria-label={t.gender}>
                {GENDERS.map(g => (
                  <label key={g} className={`${styles.pill} ${formData.gender === g ? styles.pillOn : ''}`}>
                    <input
                      type="radio" name="gender" value={g} checked={formData.gender === g}
                      onChange={handleChange} className={styles.pillInput} required
                    />
                    <span>{t.genders[g]}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          </fieldset>

          <fieldset className={styles.group}>
            <legend className={styles.legend}><span className={styles.legendNum}>2</span>{t.location}</legend>

            <div className={styles.field}>
              <label htmlFor="district" className={styles.label}>{t.district}</label>
              <input
                id="district" name="district" type="text" value={formData.district} onChange={handleChange}
                placeholder={t.districtPh} className={styles.input} required
              />
            </div>

            <div className={styles.row}>
              <div className={styles.field}>
                <label htmlFor="state" className={styles.label}>{t.state}</label>
                <input id="state" name="state" type="text" value={formData.state} onChange={handleChange} className={styles.input} required />
              </div>
              <div className={styles.field}>
                <label htmlFor="country" className={styles.label}>{t.country}</label>
                <input id="country" name="country" type="text" value={formData.country} onChange={handleChange} className={styles.input} required />
              </div>
            </div>

            <div className={styles.field}>
              <label htmlFor="email" className={styles.label}>
                {t.email} <span className={styles.optional}>{t.optional}</span>
              </label>
              <input
                id="email" name="email" type="email" inputMode="email" value={formData.email} onChange={handleChange}
                placeholder="you@email.com" className={styles.input} autoComplete="email"
              />
            </div>
          </fieldset>

          <fieldset className={styles.group}>
            <legend className={styles.legend}><span className={styles.legendNum}>3</span>{t.role}</legend>

            <div className={styles.field}>
              <label htmlFor="userType" className={styles.label}>{t.registeringAs}</label>
              <select id="userType" name="userType" value={formData.userType} onChange={handleChange} className={styles.input} required>
                <option value="">{t.selectCategory}</option>
                {USER_TYPES.map(u => (
                  <option key={u} value={u}>{t.userTypes[u]}</option>
                ))}
              </select>
            </div>

            {formData.userType === 'Other' && (
              <div className={styles.field}>
                <label htmlFor="userTypeOther" className={styles.label}>{t.specify}</label>
                <input
                  id="userTypeOther" name="userTypeOther" type="text" value={formData.userTypeOther}
                  onChange={handleChange} placeholder={t.describe} className={styles.input} required
                />
              </div>
            )}
          </fieldset>

          {error && <p className={styles.error} role="alert">{error}</p>}

          {/* Stays in view on phones so the primary action is never scrolled away */}
          <div className={styles.actions}>
            <button type="submit" className={styles.submit} disabled={loading}>
              {loading ? <>{Spinner}{t.submitting}</> : t.submit}
            </button>
            <p className={styles.privacy}>{t.privacy2}</p>
          </div>
        </form>
      </div>
    </main>
  );
}
