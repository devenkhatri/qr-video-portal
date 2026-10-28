'use client';

import { useState } from 'react';
import { normalizeMobile, isValidMobile, setClientCookie } from '@/lib/mobile';
import styles from './RegistrationForm.module.css';

const USER_TYPES = [
  'Cancer Patient',
  'Relative of Patient',
  'Normal Person',
  'ASHA',
  'Nurse - Coordinator',
  'CHO',
  'Non-cancer Doctor',
  'Oncologist',
  'Other',
];

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
}

export default function RegistrationForm({ onSuccess, userId }: RegistrationFormProps) {
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

  // Handle Step 1 Phone Input
  const handleMobileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    // Allow digits, spaces, and dashes for easy typing/pasting
    const raw = e.target.value;
    setMobileInput(raw);
  };

  // Step 1: Check if mobile already exists in Google Sheet
  const handleMobileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const clean = normalizeMobile(mobileInput);
    if (!clean || !isValidMobile(clean)) {
      setError('Please enter a valid 10-digit mobile number.');
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
        // Returning registered user recognized!
        const existingId = data.user.userId || userId;
        const userName = data.user.name || 'Doctor / Friend';
        setWelcomeUser(userName);

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

        // Brief delay for the friendly greeting before loading video
        setTimeout(() => {
          onSuccess(existingId, data.user.name || '');
        }, 700);
      } else {
        // New user: proceed to Step 2 with phone number already saved
        setFormData(prev => ({ ...prev, mobile: clean }));
        setStep('details');
      }
    } catch {
      setError('Could not verify number. Please check your connection and try again.');
    } finally {
      setCheckingMobile(false);
    }
  };

  // Handle Step 2 Form Changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Step 2: Submit New Profile
  const handleDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Please enter your name.');
      return;
    }
    if (!formData.age || isNaN(Number(formData.age)) || Number(formData.age) < 1 || Number(formData.age) > 120) {
      setError('Please enter a valid age.');
      return;
    }
    if (!formData.gender) {
      setError('Please select your gender.');
      return;
    }
    if (!formData.district.trim()) {
      setError('Please enter your district.');
      return;
    }
    if (!formData.userType) {
      setError('Please select who you are.');
      return;
    }
    if (formData.userType === 'Other' && !formData.userTypeOther.trim()) {
      setError('Please specify your role.');
      return;
    }

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
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------
  // RENDER STEP 1: MOBILE ENTRY (PROGRESSIVE CHECK)
  // -------------------------------------------------------------
  if (step === 'mobile') {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.header}>
            <div className={styles.iconWrap}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                <line x1="12" y1="18" x2="12.01" y2="18" />
              </svg>
            </div>
            <h1 className={styles.title}>Welcome</h1>
            <p className={styles.subtitle}>
              Enter your mobile number to access the video.
            </p>
          </div>

          <form onSubmit={handleMobileSubmit} className={styles.form}>
            {welcomeUser && (
              <div className={styles.welcomeBanner}>
                <span>🟢</span>
                <span>Welcome back, <strong>{welcomeUser}</strong>! Starting your video…</span>
              </div>
            )}

            <div className={styles.field}>
              <label htmlFor="mobileInput" className={styles.label}>
                Mobile Number <span className={styles.required}>*</span>
              </label>

              <div className={styles.mobileInputWrap}>
                <div className={styles.countryCodePrefix}>
                  <span>🇮🇳</span>
                  <span>+91</span>
                </div>
                <input
                  id="mobileInput"
                  name="mobileInput"
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="tel-national"
                  autoFocus
                  placeholder="98765 43210"
                  value={mobileInput}
                  onChange={handleMobileInputChange}
                  className={styles.mobileFieldInput}
                  disabled={checkingMobile || welcomeUser !== null}
                  maxLength={14}
                  required
                />
              </div>
            </div>

            {error && <p className={styles.error}>{error}</p>}

            <button
              type="submit"
              className={styles.submitBtn}
              disabled={checkingMobile || welcomeUser !== null}
            >
              {checkingMobile ? (
                <>
                  <span className={styles.spinner} />
                  Verifying...
                </>
              ) : welcomeUser ? (
                <>
                  <span className={styles.spinner} />
                  Starting Video...
                </>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                  Continue to Video
                </>
              )}
            </button>

            <p className={styles.privacy}>
              🔒 Your mobile number is used to identify your access. No passwords or OTPs required.
            </p>
          </form>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER STEP 2: COMPLETE PROFILE (FIRST-TIME USER ONLY)
  // -------------------------------------------------------------
  const cleanMobileDisplay = normalizeMobile(formData.mobile || mobileInput);

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.iconWrap}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <span className={styles.stepBadge}>Step 2 of 2 • Quick Profile</span>
          <h1 className={styles.title}>Quick Registration</h1>
          <p className={styles.subtitle}>
            Please fill in a few details to complete your access. This only takes a minute.
          </p>
        </div>

        {/* Confirmed Mobile Badge with Change Option */}
        <div className={styles.mobileConfirmedBanner}>
          <div className={styles.mobileConfirmedInfo}>
            <span className={styles.mobileConfirmedLabel}>Mobile Number</span>
            <span className={styles.mobileConfirmedValue}>🇮🇳 +91 {cleanMobileDisplay}</span>
          </div>
          <button
            type="button"
            className={styles.changeMobileBtn}
            onClick={() => setStep('mobile')}
            title="Change mobile number"
          >
            Change
          </button>
        </div>

        <form onSubmit={handleDetailsSubmit} className={styles.form}>
          {/* Section 1: Personal Details */}
          <div className={styles.sectionHeader}>
            <span className={styles.sectionBadge}>1</span>
            <span className={styles.sectionTitle}>Personal Details</span>
          </div>

          {/* Name */}
          <div className={styles.field}>
            <label htmlFor="name" className={styles.label}>
              Full Name <span className={styles.required}>*</span>
            </label>
            <input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g. Dr. Rajesh Patel"
              className={styles.input}
              autoComplete="name"
              autoFocus
              required
            />
          </div>

          {/* Age & Gender row */}
          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label htmlFor="age" className={styles.label}>
                Age <span className={styles.required}>*</span>
              </label>
              <input
                id="age"
                name="age"
                type="number"
                min="1"
                max="120"
                value={formData.age}
                onChange={handleChange}
                placeholder="e.g. 35"
                className={styles.input}
                required
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>
                Gender <span className={styles.required}>*</span>
              </label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className={styles.select}
                required
              >
                <option value="">Select gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          {/* Section 2: Contact & Location */}
          <div className={styles.sectionHeader}>
            <span className={styles.sectionBadge}>2</span>
            <span className={styles.sectionTitle}>Location &amp; Contact</span>
          </div>

          {/* Email (optional) */}
          <div className={styles.field}>
            <label htmlFor="email" className={styles.label}>
              Email <span className={styles.optional}>(optional)</span>
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="your@email.com"
              className={styles.input}
              autoComplete="email"
            />
          </div>

          {/* Country & State row */}
          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label htmlFor="country" className={styles.label}>
                Country <span className={styles.required}>*</span>
              </label>
              <input
                id="country"
                name="country"
                type="text"
                value={formData.country}
                onChange={handleChange}
                placeholder="India"
                className={styles.input}
                required
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="state" className={styles.label}>
                State <span className={styles.required}>*</span>
              </label>
              <input
                id="state"
                name="state"
                type="text"
                value={formData.state}
                onChange={handleChange}
                placeholder="Gujarat"
                className={styles.input}
                required
              />
            </div>
          </div>

          {/* District */}
          <div className={styles.field}>
            <label htmlFor="district" className={styles.label}>
              District <span className={styles.required}>*</span>
            </label>
            <input
              id="district"
              name="district"
              type="text"
              value={formData.district}
              onChange={handleChange}
              placeholder="e.g. Ahmedabad, Surat, Rajkot"
              className={styles.input}
              required
            />
          </div>

          {/* Section 3: Role / Category */}
          <div className={styles.sectionHeader}>
            <span className={styles.sectionBadge}>3</span>
            <span className={styles.sectionTitle}>Your Role</span>
          </div>

          <div className={styles.field}>
            <label htmlFor="userType" className={styles.label}>
              I am registering as <span className={styles.required}>*</span>
            </label>
            <select
              id="userType"
              name="userType"
              value={formData.userType}
              onChange={handleChange}
              className={styles.select}
              required
            >
              <option value="">Select your category</option>
              {USER_TYPES.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {formData.userType === 'Other' && (
            <div className={styles.field}>
              <label htmlFor="userTypeOther" className={styles.label}>
                Please specify your role <span className={styles.required}>*</span>
              </label>
              <input
                id="userTypeOther"
                name="userTypeOther"
                type="text"
                value={formData.userTypeOther}
                onChange={handleChange}
                placeholder="Describe your role"
                className={styles.input}
                required
              />
            </div>
          )}

          {error && <p className={styles.error}>{error}</p>}

          <button
            type="submit"
            className={styles.submitBtn}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className={styles.spinner} />
                Completing Registration...
              </>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                Watch Video
              </>
            )}
          </button>

          <p className={styles.privacy}>
            🔒 Your information is kept private and used only for educational analytics.
          </p>
        </form>
      </div>
    </div>
  );
}
