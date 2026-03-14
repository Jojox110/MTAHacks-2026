import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getAIRecommendation } from '../data/api';

export default function AIAdvisor({ courses, selectedIds, onSelectCourse, userMajor, userMinor }) {
  const [open, setOpen] = useState(true);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleSubmit = async () => {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    try {
      const rec = await getAIRecommendation(prompt, selectedIds, userMajor, userMinor);
      setResult(rec);
    } catch (err) {
      console.error('AI recommendation failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="ai-panel">
      <div className="ai-header" onClick={() => setOpen(!open)}>
        <div className="ai-header-left">
          <div className="ai-icon">&#9830;</div>
          <h3>AI Course Advisor</h3>
        </div>
        <span className={`chevron ${open ? 'open' : ''}`}>&#9660;</span>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            className="ai-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <p className="ai-description">
              Tell me about your career goals or the kind of job you want, and
              I'll recommend the best courses for your path.
            </p>

            <div className="ai-input-group">
              <textarea
                className="ai-textarea"
                placeholder="e.g. I want to become a machine learning engineer working on AI products..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <button
                className="ai-submit"
                onClick={handleSubmit}
                disabled={!prompt.trim() || loading}
              >
                {loading ? 'Analyzing...' : 'Get Recommendations'}
              </button>
            </div>

            <AnimatePresence>
              {loading && (
                <motion.div
                  className="ai-loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="spinner" />
                  <span>Finding your ideal course path...</span>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {result && !loading && (
                <motion.div
                  className="ai-results"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <h4>{result.careerPath}</h4>
                  <p className="ai-results-path">{result.description}</p>

                  <div>
                    {result.required.map((id) => {
                      const course = courses.find((c) => c.id === id);
                      if (!course) return null;
                      const isSelected = selectedIds.includes(id);
                      return (
                        <span
                          key={id}
                          className={`ai-course-tag required ${isSelected ? 'selected' : ''}`}
                          onClick={() => !isSelected && onSelectCourse(course)}
                        >
                          {id}
                          <span className="tag-label">req</span>
                        </span>
                      );
                    })}
                    {result.recommended.map((id) => {
                      const course = courses.find((c) => c.id === id);
                      if (!course) return null;
                      const isSelected = selectedIds.includes(id);
                      return (
                        <span
                          key={id}
                          className={`ai-course-tag recommended ${isSelected ? 'selected' : ''}`}
                          onClick={() => !isSelected && onSelectCourse(course)}
                        >
                          {id}
                          <span className="tag-label">rec</span>
                        </span>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
