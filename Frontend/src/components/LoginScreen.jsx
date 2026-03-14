import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { registerUser, loginUser, fetchPrograms } from '../data/api';

export default function LoginScreen({ onComplete }) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [major, setMajor] = useState('');
  const [minor, setMinor] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [programData, setProgramData] = useState({ programs: [], available_minors: [] });

  useEffect(() => {
    fetchPrograms().then(setProgramData);
  }, []);

  // Find the selected program to check if it needs a minor
  const selectedProgram = useMemo(() => {
    if (!major) return null;
    return programData.programs.find((p) => p.name === major) || null;
  }, [major, programData]);

  const needsMinor = selectedProgram?.minor_requirements?.has_minor ?? false;

  // Reset minor when switching to a program that doesn't need one
  useEffect(() => {
    if (!needsMinor) setMinor('');
  }, [needsMinor]);

  const handleContinue = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    setLoading(true);
    setError('');
    try {
      const user = await loginUser(email);
      localStorage.setItem('courseforge_token', user.token);
      onComplete(user);
      return;
    } catch {
      // Email not found — new user, show step 2
    } finally {
      setLoading(false);
    }
    setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const user = await registerUser({ name, email, major: major || null, minor: minor || null });
      localStorage.setItem('courseforge_token', user.token);
      onComplete(user);
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-screen">
      <div className="bg-noise" />
      <div className="bg-gradient" />

      <motion.div
        className="login-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="login-logo">
          <h1>Course<span className="logo-accent">Forge</span></h1>
          <span className="logo-tag">2026</span>
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.form
              key="step1"
              className="login-form"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
              onSubmit={handleContinue}
            >
              <h2>Welcome</h2>
              <p className="login-subtitle">Plan your perfect semester</p>

              <div className="login-field">
                <label>Name</label>
                <input
                  type="text"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <div className="login-field">
                <label>Email</label>
                <input
                  type="email"
                  placeholder="you@university.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="login-button" disabled={!name.trim() || !email.trim() || loading}>
                {loading ? 'Checking...' : 'Continue'}
              </button>
            </motion.form>
          )}

          {step === 2 && (
            <motion.form
              key="step2"
              className="login-form"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
              onSubmit={handleSubmit}
            >
              <h2>Academic Profile</h2>
              <p className="login-subtitle">Help us personalize your experience</p>

              <div className="login-field">
                <label>Program</label>
                <select value={major} onChange={(e) => setMajor(e.target.value)}>
                  <option value="">Select your program</option>
                  {programData.programs.map((p) => (
                    <option key={p.name} value={p.name}>
                      {p.name}{p.degree ? ` — ${p.degree}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {selectedProgram && !needsMinor && (
                <div className="login-minor-info">
                  This program does not require a minor.
                </div>
              )}

              {needsMinor && (
                <div className="login-field">
                  <label>Minor <span className="optional">({selectedProgram.minor_requirements.total_credits} cr required)</span></label>
                  <select value={minor} onChange={(e) => setMinor(e.target.value)}>
                    <option value="">Select your minor</option>
                    {programData.available_minors.map((m) => (
                      <option key={m.name} value={m.name}>
                        {m.name} ({m.total_credits} cr)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {error && <div className="login-error">{error}</div>}

              <div className="login-actions">
                <button type="button" className="login-back" onClick={() => setStep(1)}>
                  Back
                </button>
                <button type="submit" className="login-button" disabled={loading}>
                  {loading ? 'Setting up...' : 'Start Planning'}
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
