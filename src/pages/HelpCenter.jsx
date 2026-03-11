import { useState } from 'react';
import styles from './HelpCenter.module.css';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

const CATEGORIES = [
  { value: 'map_issue',       label: '🗺️  Map / Location issue' },
  { value: 'tracking_issue',  label: '📍  Tracking not working' },
  { value: 'ui_bug',          label: '🖥️  UI / Display bug' },
  { value: 'performance',     label: '⚡  Performance problem' },
  { value: 'other',           label: '💬  Other' },
];

const FAQS = [
  {
    q: 'How do I get the tracking link?',
    a: 'When a trip is started on the Delhi Metro Tracker app, an SMS is automatically sent to the emergency contact with a tracking link. Tap the link to open the live map in your browser.',
  },
  {
    q: 'The tracking ID says "not found" — what does that mean?',
    a: 'This usually means the journey has already ended, the tracking ID was mistyped, or the trip has not started yet. Check the SMS you received for the correct link.',
  },
  {
    q: 'The map shows the person has stopped moving. Is something wrong?',
    a: 'If you see a "Signal lost" warning on the map, the app has not sent a location update for over 2 minutes. This can happen in deep underground sections or if the phone lost internet. If the warning persists, try contacting the person directly.',
  },
  {
    q: 'Can I replay a past trip?',
    a: 'Yes — log in with the same Google account used on the app. Past trips with GPS data will appear in your trip history with a replay option.',
  },
  {
    q: 'Is my location data stored?',
    a: 'GPS data for active trips is stored temporarily in memory for live tracking. When a trip ends, the path is saved to your account in Firebase. Only you and people with your tracking link can see it.',
  },
];

export default function HelpCenter() {
  const [openFaq, setOpenFaq] = useState(null);
  const [form, setForm] = useState({
    name: '', email: '', category: 'tracking_issue', description: '', trackingId: '',
  });
  const [submitState, setSubmitState] = useState('idle'); // idle | loading | success | error
  const [errorMsg, setErrorMsg] = useState('');

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.description.trim().length < 20) {
      setErrorMsg('Please describe the issue in at least 20 characters.');
      return;
    }
    setErrorMsg('');
    setSubmitState('loading');

    try {
      const res = await fetch(`${BACKEND_URL}/api/bug-reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim() || undefined,
          email: form.email.trim() || undefined,
          category: form.category,
          description: form.description.trim(),
          trackingId: form.trackingId.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Submission failed');
      setSubmitState('success');
      setForm({ name: '', email: '', category: 'tracking_issue', description: '', trackingId: '' });
    } catch (err) {
      setErrorMsg(err.message || 'Something went wrong. Please try again.');
      setSubmitState('error');
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        {/* Hero */}
        <div className={styles.hero}>
          <h1 className={styles.heroTitle}>Help Center</h1>
          <p className={styles.heroSub}>
            Find answers to common questions or report a bug.
            We read every report.
          </p>
        </div>

        <div className={styles.grid}>
          {/* FAQ column */}
          <section className={styles.faqSection}>
            <h2 className={styles.sectionTitle}>
              <span className={styles.sectionDot} />
              Frequently Asked
            </h2>

            <div className={styles.faqList}>
              {FAQS.map((faq, i) => (
                <div
                  key={i}
                  className={`${styles.faqItem} ${openFaq === i ? styles.faqOpen : ''}`}
                >
                  <button
                    className={styles.faqQuestion}
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  >
                    <span>{faq.q}</span>
                    <svg
                      width="16" height="16" viewBox="0 0 24 24" fill="none"
                      className={styles.faqChevron}
                      style={{ transform: openFaq === i ? 'rotate(180deg)' : 'rotate(0)' }}
                    >
                      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                  {openFaq === i && (
                    <p className={styles.faqAnswer}>{faq.a}</p>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Bug report column */}
          <section className={styles.reportSection}>
            <h2 className={styles.sectionTitle}>
              <span className={styles.sectionDot} style={{ background: 'var(--color-error)' }} />
              Report a Bug
            </h2>

            {submitState === 'success' ? (
              <div className={styles.successCard}>
                <div className={styles.successIcon}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="var(--color-success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h3 className={styles.successTitle}>Report submitted!</h3>
                <p className={styles.successSub}>
                  Thank you for helping improve the app. We'll look into it shortly.
                </p>
                <button
                  className={styles.btnSecondary}
                  onClick={() => setSubmitState('idle')}
                >
                  Submit another report
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className={styles.form}>
                <div className={styles.formRow}>
                  <Field label="Name (optional)">
                    <input
                      type="text"
                      className={styles.input}
                      placeholder="Your name"
                      value={form.name}
                      onChange={handleChange('name')}
                    />
                  </Field>
                  <Field label="Email (optional)">
                    <input
                      type="email"
                      className={styles.input}
                      placeholder="For follow-up"
                      value={form.email}
                      onChange={handleChange('email')}
                    />
                  </Field>
                </div>

                <Field label="Category">
                  <select
                    className={styles.input}
                    value={form.category}
                    onChange={handleChange('category')}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </Field>

                <Field label="Tracking ID (optional)" hint="If this bug is about a specific journey">
                  <input
                    type="text"
                    className={styles.input}
                    placeholder="TRK-XXXXXX"
                    value={form.trackingId}
                    onChange={handleChange('trackingId')}
                    maxLength={10}
                    style={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}
                  />
                </Field>

                <Field label="Description *">
                  <textarea
                    className={`${styles.input} ${styles.textarea}`}
                    placeholder="Describe what happened, what you expected, and any steps to reproduce the issue…"
                    value={form.description}
                    onChange={handleChange('description')}
                    rows={5}
                    minLength={20}
                    maxLength={2000}
                  />
                  <span className={styles.charCount}>
                    {form.description.length} / 2000
                  </span>
                </Field>

                {errorMsg && <p className={styles.errorMsg}>{errorMsg}</p>}

                <button
                  type="submit"
                  className={styles.btnPrimary}
                  disabled={submitState === 'loading'}
                >
                  {submitState === 'loading' ? (
                    <span className={styles.spinner} />
                  ) : (
                    <>
                      Send Report
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{marginLeft:'8px'}}>
                        <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </>
                  )}
                </button>
              </form>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <div className={styles.field}>
      <label className={styles.fieldLabel}>
        {label}
        {hint && <span className={styles.fieldHint}>{hint}</span>}
      </label>
      {children}
    </div>
  );
}
