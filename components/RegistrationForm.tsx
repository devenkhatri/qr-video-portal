'use client';

import { useState } from 'react';
import styles from './RegistrationForm.module.css';

interface FormData {
  name: string;
  gender: string;
  phone: string;
  region: string;
  profession: string;
}

interface RegistrationFormProps {
  onSuccess: () => void;
  userId: string;
}

export default function RegistrationForm({ onSuccess, userId }: RegistrationFormProps) {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    gender: '',
    phone: '',
    region: '',
    profession: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Please enter your name.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, ...formData }),
      });

      if (!res.ok) {
        throw new Error('Registration failed');
      }

      // Set localStorage token
      localStorage.setItem('user_registered', 'true');
      localStorage.setItem('user_id', userId);
      onSuccess();
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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
          <h1 className={styles.title}>Quick Registration</h1>
          <p className={styles.subtitle}>
            Please fill in a few details to access the video. This only takes 30 seconds.
          </p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
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
              placeholder="Enter your full name"
              className={styles.input}
              autoComplete="name"
              required
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Gender</label>
            <div className={styles.radioGroup}>
              {['Male', 'Female', 'Other', 'Prefer not to say'].map(g => (
                <label key={g} className={styles.radioLabel}>
                  <input
                    type="radio"
                    name="gender"
                    value={g}
                    checked={formData.gender === g}
                    onChange={handleChange}
                    className={styles.radio}
                  />
                  <span>{g}</span>
                </label>
              ))}
            </div>
          </div>

          <div className={styles.field}>
            <label htmlFor="phone" className={styles.label}>Phone Number</label>
            <input
              id="phone"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              placeholder="+91 XXXXX XXXXX"
              className={styles.input}
              autoComplete="tel"
            />
          </div>

          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label htmlFor="region" className={styles.label}>City / Region</label>
              <input
                id="region"
                name="region"
                type="text"
                value={formData.region}
                onChange={handleChange}
                placeholder="e.g. Mumbai"
                className={styles.input}
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="profession" className={styles.label}>Profession / Specialty</label>
              <input
                id="profession"
                name="profession"
                type="text"
                value={formData.profession}
                onChange={handleChange}
                placeholder="e.g. Cardiologist"
                className={styles.input}
              />
            </div>
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <button
            type="submit"
            className={styles.submitBtn}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className={styles.spinner} />
                Submitting...
              </>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 12h14M12 5l7 7-7 7" />
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
