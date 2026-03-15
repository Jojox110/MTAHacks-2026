import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { chatWithAdvisor } from '../data/api';

export default function AIAdvisor({ courses, selectedIds, onSelectCourse }) {
  const [open, setOpen] = useState(true);

  // Phase: 'input' → user writes profile; 'chat' → conversation in progress
  const [phase, setPhase] = useState('input');
  const [profileText, setProfileText] = useState('');
  const [inputText, setInputText] = useState('');
  const [history, setHistory] = useState([]);       // [{role, content}]
  const [loading, setLoading] = useState(false);
  const [finalized, setFinalized] = useState(false);
  const [recommendations, setRecommendations] = useState([]);

  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, loading]);

  const sendMessage = async (messageText, isFirst = false) => {
    if (!messageText.trim() || loading) return;

    const profile = isFirst ? messageText : profileText;
    const currentHistory = isFirst ? [] : history;
    const displayHistory = [
      ...currentHistory,
      { role: 'user', content: messageText },
    ];

    setHistory(displayHistory);
    setInputText('');
    setLoading(true);

    try {
      const res = await chatWithAdvisor({
        studentProfile: profile,
        message: messageText,
        history: currentHistory,
        currentCourses: selectedIds,
        numToSelect: 2,
      });

      setHistory(res.history);

      if (res.finalized) {
        setFinalized(true);
        setRecommendations(res.recommendations);
      }
    } catch (err) {
      setHistory((h) => [
        ...h,
        { role: 'assistant', content: '⚠️ Something went wrong. Please try again.' },
      ]);
      console.error('AI chat error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStart = () => {
    if (!profileText.trim()) return;
    setProfileText(profileText);
    setPhase('chat');
    sendMessage(profileText, true);
  };

  const handleReply = () => {
    sendMessage(inputText);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      phase === 'input' ? handleStart() : handleReply();
    }
  };

  const handleReset = () => {
    setPhase('input');
    setProfileText('');
    setInputText('');
    setHistory([]);
    setFinalized(false);
    setRecommendations([]);
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
            {/* ── Phase: input ── */}
            {phase === 'input' && (
              <>
                <p className="ai-description">
                  Tell me about yourself — your background, interests, and career goals —
                  and I'll help you pick the right courses.
                </p>
                <div className="ai-input-group">
                  <textarea
                    className="ai-textarea"
                    placeholder="e.g. I'm a 2nd-year CS student interested in machine learning and computer vision. I want to work in AI research..."
                    value={profileText}
                    onChange={(e) => setProfileText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    rows={4}
                  />
                  <button
                    className="ai-submit"
                    onClick={handleStart}
                    disabled={!profileText.trim()}
                  >
                    Start Chat
                  </button>
                </div>
              </>
            )}

            {/* ── Phase: chat ── */}
            {phase === 'chat' && (
              <>
                {/* Message bubbles */}
                <div className="ai-chat-messages">
                  {history.map((msg, i) => (
                    <motion.div
                      key={i}
                      className={`ai-bubble ${msg.role}`}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <span className="ai-bubble-role">
                        {msg.role === 'user' ? 'You' : 'Advisor'}
                      </span>
                      <p>{msg.content}</p>
                    </motion.div>
                  ))}

                  {loading && (
                    <motion.div
                      className="ai-bubble assistant"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <span className="ai-bubble-role">Advisor</span>
                      <div className="ai-typing">
                        <span /><span /><span />
                      </div>
                    </motion.div>
                  )}

                  <div ref={bottomRef} />
                </div>

                {/* Finalized recommendations */}
                {finalized && recommendations.length > 0 && (
                  <motion.div
                    className="ai-results"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <h4>Recommended Courses</h4>
                    <div>
                      {recommendations.map((rec) => {
                        const courseId = rec.class_id;
                        const course = courses.find((c) => c.id === courseId);
                        const isSelected = selectedIds.includes(courseId);
                        return (
                          <div key={courseId || rec.class_name} className="ai-rec-card">
                            <span
                              className={`ai-course-tag required ${isSelected ? 'selected' : ''}`}
                              onClick={() => course && !isSelected && onSelectCourse(course)}
                              title={rec.reasoning}
                            >
                              {courseId || rec.class_name}
                              {!isSelected && <span className="tag-label">+ add</span>}
                            </span>
                            <p className="ai-rec-reasoning">{rec.reasoning}</p>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}

                {/* Reply input (hidden once finalized) */}
                {!finalized && (
                  <div className="ai-chat-input-row">
                    <input
                      className="ai-chat-input"
                      type="text"
                      placeholder="Reply to the advisor..."
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyDown={handleKeyDown}
                      disabled={loading}
                    />
                    <button
                      className="ai-submit"
                      onClick={handleReply}
                      disabled={!inputText.trim() || loading}
                    >
                      Send
                    </button>
                  </div>
                )}

                <button className="ai-reset-btn" onClick={handleReset}>
                  Start over
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
