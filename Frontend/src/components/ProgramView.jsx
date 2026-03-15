import { useState, useMemo, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

// ─── Schedule conflict helpers ────────────────────────────────────────────────

const DAYS_ORDER = ['Lu', 'Ma', 'Me', 'Je', 'Ve'];

function parseDays(dayStr) {
  if (!dayStr || dayStr === 'À dét.') return [];
  const result = [];
  let remaining = dayStr;
  while (remaining.length > 0) {
    const found = DAYS_ORDER.find((d) => remaining.startsWith(d));
    if (found) { result.push(found); remaining = remaining.slice(found.length); }
    else { remaining = remaining.slice(1); }
  }
  return result;
}

function parseTime(timeStr) {
  if (!timeStr || timeStr === 'À dét.' || !timeStr.includes('-')) return null;
  const [a, b] = timeStr.split('-');
  const toH = (t) => t.length >= 4 ? parseInt(t.slice(0, 2)) + parseInt(t.slice(2, 4)) / 60 : 0;
  return [toH(a), toH(b)];
}

/** Returns true if two section schedule arrays share a day+time overlap. */
function schedulesConflict(schedA, schedB) {
  const slotsA = [];
  for (const s of schedA) {
    const days = parseDays(s.days || '');
    const time = parseTime(s.time || '');
    if (!days.length || !time) continue;
    for (const d of days) slotsA.push([d, time[0], time[1]]);
  }
  const slotsB = [];
  for (const s of schedB) {
    const days = parseDays(s.days || '');
    const time = parseTime(s.time || '');
    if (!days.length || !time) continue;
    for (const d of days) slotsB.push([d, time[0], time[1]]);
  }
  for (const [da, sa, ea] of slotsA) {
    for (const [db, sb, eb] of slotsB) {
      if (da === db && sa < eb && sb < ea) return true;
    }
  }
  return false;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Find scheduled courses that satisfy an option group */
function findMatchingCourses(og, yearCourses, allCourses, scheduledIds) {
  const groupCourses = yearCourses.filter((c) => c.option_group === og.id);
  const ogCodes = og.codes || [];
  const ogPrefix = og.prefix || '';
  // e.g. levels "4000" → first digit is "4", so INFO4XXX must start with "INFO4"
  const levelPrefix = og.levels ? String(og.levels)[0] : '';

  return allCourses.filter((c) => {
    if (!scheduledIds.has(c.id)) return false;
    if (groupCourses.some((gc) => gc.code === c.id)) return true;
    if (ogCodes.length > 0 && ogCodes.includes(c.id)) return true;
    if (ogPrefix) {
      if (!c.id.startsWith(ogPrefix)) return false;
      // If a level is specified, the digit after the prefix must match
      if (levelPrefix && c.id[ogPrefix.length] !== levelPrefix) return false;
      return true;
    }
    return false;
  });
}

/** Classify an option group for display */
function classifyOG(og) {
  const label = og.label || '';
  const codes = og.codes || [];
  const prefix = og.prefix || '';
  const lbl = label.toLowerCase();

  if (lbl.includes('banque ofg') || lbl.includes('ofg')) return 'ofg';
  if (lbl.includes('au choix') && !prefix && codes.length === 0) return 'free';
  if (lbl.includes('ou à option') && !prefix && codes.length === 0) return 'free';
  if (prefix) return 'prefix';
  if (codes.length > 0) return 'codes';
  return 'free';
}

// ─── Option Group Card ──────────────────────────────────────────────────────

function OptionGroupCard({ og, yearCourses, allCourses, scheduledIds }) {
  const type = classifyOG(og);
  const groupCourses = yearCourses.filter((c) => c.option_group === og.id);
  const matchingScheduled = findMatchingCourses(og, yearCourses, allCourses, scheduledIds);
  const scheduledCr = matchingScheduled.reduce((s, c) => s + c.credits, 0);
  const fulfilled = scheduledCr >= og.credits_required;
  const ogCodes = og.codes || [];
  const prefix = og.prefix || '';

  // Icon based on type
  const icon = type === 'ofg' ? '\u2605' : type === 'free' ? '\u25CB' : type === 'prefix' ? '\u25A1' : '\u25CF';

  // Friendly label
  let displayLabel = og.label;
  if (type === 'ofg') {
    const ofgMatch = og.label.match(/OFG\s*(\d|[?])/);
    displayLabel = ofgMatch && ofgMatch[1] !== '?'
      ? `General Education — OFG ${ofgMatch[1]}`
      : 'General Education (OFG bank)';
  }

  return (
    <div className={`og-card og-${type}`}>
      <div className={`og-header ${fulfilled ? 'fulfilled' : ''}`}>
        <div className="og-header-left">
          <span className="og-icon">{icon}</span>
          <span className="og-label">{displayLabel}</span>
        </div>
        <span className="og-status">
          {fulfilled
            ? <><span className="og-check">&#10003;</span> {scheduledCr}/{og.credits_required} cr</>
            : <>{scheduledCr}/{og.credits_required} cr</>
          }
        </span>
      </div>

      {/* Progress bar for multi-credit groups */}
      {og.credits_required > 3 && (
        <div className="progress-bar-container" style={{ margin: '6px 12px 0' }}>
          <div
            className={`progress-bar-fill ${fulfilled ? 'success' : ''}`}
            style={{ width: `${Math.min((scheduledCr / og.credits_required) * 100, 100)}%` }}
          />
        </div>
      )}

      {/* Matched scheduled courses */}
      {matchingScheduled.length > 0 && (
        <div className="og-matched">
          {matchingScheduled.map((c) => (
            <div key={c.id} className="program-course-item scheduled">
              <span className="program-course-code">{c.id}</span>
              <span className="program-course-name">{c.name}</span>
              <span className="program-course-cr">{c.credits} cr</span>
              <span className="program-course-check">&#10003;</span>
            </div>
          ))}
        </div>
      )}

      {/* Linked year courses (old option_group id pattern) */}
      {groupCourses.filter((gc) => !matchingScheduled.some((m) => m.id === gc.code)).length > 0 && (
        <div className="og-options">
          {groupCourses
            .filter((gc) => !matchingScheduled.some((m) => m.id === gc.code))
            .map((course) => {
              const isScheduled = scheduledIds.has(course.code);
              return (
                <div key={course.code} className={`program-course-item ${isScheduled ? 'scheduled' : ''}`}>
                  <span className="program-course-code">{course.code}</span>
                  <span className="program-course-name">{course.name}</span>
                  <span className="program-course-cr">{course.credits} cr</span>
                  {isScheduled && <span className="program-course-check">&#10003;</span>}
                </div>
              );
          })}
        </div>
      )}

      {/* Show code chips for options with specific codes */}
      {type === 'codes' && groupCourses.length === 0 && matchingScheduled.length === 0 && ogCodes.length > 0 && (
        <div className="og-chips">
          {ogCodes.slice(0, 12).map((code) => (
            <span key={code} className={`dept-course-chip ${scheduledIds.has(code) ? 'enrolled' : ''}`}>{code}</span>
          ))}
          {ogCodes.length > 12 && <span className="program-ofg-more">+{ogCodes.length - 12} more</span>}
        </div>
      )}

      {/* Prefix hint */}
      {type === 'prefix' && matchingScheduled.length === 0 && (
        <div className="og-hint">
          Choose <strong>{prefix}</strong>{og.levels ? ` level ${og.levels}` : ''} courses from the catalog
        </div>
      )}

      {/* Free elective hint */}
      {type === 'free' && matchingScheduled.length === 0 && (
        <div className="og-hint">
          Any course from the catalog
        </div>
      )}

      {/* OFG hint */}
      {type === 'ofg' && matchingScheduled.length === 0 && (
        <div className="og-hint">
          Choose from the OFG course bank
        </div>
      )}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function ProgramView({ programData, courses = [], userMajor, userMinor, scheduleMap, onUpdateProfile, onOptimizeSchedule }) {
  const [editing, setEditing] = useState(false);
  const [editMajor, setEditMajor] = useState(userMajor || '');
  const [editMinor, setEditMinor] = useState(userMinor || '');
  const [optimizePrompt, setOptimizePrompt] = useState('');
  const [optimizing, setOptimizing] = useState(false);
  const [optimizeError, setOptimizeError] = useState(null);
  // pendingChoices: { semKey: { options: [{code,name}], recommended: [code], slots: n } }
  const [pendingChoices, setPendingChoices] = useState(null);
  // advisor chat state
  const [advisorMessages, setAdvisorMessages] = useState([]);  // [{role,content}]
  const [userChoices, setUserChoices] = useState({});           // { semKey: [code] }
  const [advisorInput, setAdvisorInput] = useState('');
  const advisorBottomRef = useRef(null);

  useEffect(() => {
    setEditMajor(userMajor || '');
    setEditMinor(userMinor || '');
  }, [userMajor, userMinor]);

  const allScheduledIds = useMemo(() => {
    return new Set(Object.values(scheduleMap).flat());
  }, [scheduleMap]);

  const program = useMemo(() => {
    if (!userMajor || !programData?.programs) return null;
    return programData.programs.find((p) => p.name === userMajor) || null;
  }, [programData, userMajor]);

  const minor = useMemo(() => {
    if (!userMinor || !programData?.available_minors) return null;
    return programData.available_minors.find((m) => m.name === userMinor) || null;
  }, [programData, userMinor]);

  const editProgram = useMemo(() => {
    if (!editMajor || !programData?.programs) return null;
    return programData.programs.find((p) => p.name === editMajor) || null;
  }, [editMajor, programData]);

  const editNeedsMinor = editProgram?.minor_requirements?.has_minor ?? false;

  // Scroll advisor chat to bottom when messages change
  useEffect(() => {
    advisorBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [advisorMessages]);

  // Build initial advisor message when pending choices arrive
  useEffect(() => {
    if (!pendingChoices) return;
    const lines = ['Based on your interests, here are my recommendations for each elective slot:\n'];
    for (const [semKey, data] of Object.entries(pendingChoices)) {
      const recommended = (data.recommended || [])
        .map((code) => (data.options || []).find((o) => o.code === code))
        .filter(Boolean);
      const others = (data.options || []).filter((o) => !(data.recommended || []).includes(o.code));
      lines.push(`**${semKey}** (${data.slots} slot${data.slots > 1 ? 's' : ''} to fill)`);
      if (recommended.length > 0) {
        lines.push(`  I recommend: ${recommended.map((o) => `${o.code} — ${o.name}`).join(', ')}`);
      }
      if (others.length > 0) {
        lines.push(`  Other options: ${others.map((o) => `${o.code} — ${o.name}`).join(', ')}`);
      }
      lines.push('');
    }
    lines.push('Which courses would you like to add? You can click options below or tell me your preference.');
    setAdvisorMessages([{ role: 'advisor', content: lines.join('\n') }]);
  }, [pendingChoices]);

  useEffect(() => {
    if (editing && !editNeedsMinor) setEditMinor('');
  }, [editing, editNeedsMinor]);

  // ─── Stats ─────────────────────────────────────────────────────────────

  const programStats = useMemo(() => {
    if (!program) return null;
    let totalCredits = 0;
    let scheduledCredits = 0;

    for (const y of (program.years || [])) {
      // Obligatory courses
      const oblig = y.courses.filter((c) => c.type !== 'option');
      totalCredits += oblig.reduce((s, c) => s + c.credits, 0);
      scheduledCredits += oblig.filter((c) => allScheduledIds.has(c.code)).reduce((s, c) => s + c.credits, 0);

      // Option groups
      for (const og of (y.option_groups || [])) {
        totalCredits += og.credits_required;
        const matching = findMatchingCourses(og, y.courses, courses, allScheduledIds);
        scheduledCredits += Math.min(matching.reduce((s, c) => s + c.credits, 0), og.credits_required);
      }

      // Minor credits count toward total
      totalCredits += y.minor_credits || 0;
    }

    // OFG open
    const openOfgs = program.ofg_requirements?.open || [];
    totalCredits += openOfgs.length * 3;
    const progCodes = new Set(program.all_courses.map((c) => c.code));
    const ofgUsed = new Set();
    for (const ofg of openOfgs) {
      const match = courses.find((c) =>
        c.ofg && c.ofg.split(',').map((t) => t.trim()).includes(ofg.ofg)
        && allScheduledIds.has(c.id)
        && !progCodes.has(c.id)
        && !ofgUsed.has(c.id)
      );
      if (match) {
        scheduledCredits += 3;
        ofgUsed.add(match.id);
      }
    }

    return { totalCredits, scheduledCredits };
  }, [program, allScheduledIds, courses]);

  const minorStats = useMemo(() => {
    if (!minor) return null;
    const allCodes = minor.all_courses.map((c) => c.code);
    const scheduled = allCodes.filter((code) => allScheduledIds.has(code));
    const totalCredits = minor.all_courses.reduce((s, c) => s + c.credits, 0);
    const scheduledCredits = minor.all_courses
      .filter((c) => allScheduledIds.has(c.code))
      .reduce((s, c) => s + c.credits, 0);
    return { total: allCodes.length, scheduled: scheduled.length, totalCredits, scheduledCredits };
  }, [minor, allScheduledIds]);

  const handleSave = () => {
    onUpdateProfile(editMajor || null, editMinor || null);
    setEditing(false);
  };

  const handleCancel = () => {
    setEditMajor(userMajor || '');
    setEditMinor(userMinor || '');
    setEditing(false);
  };

  return (
    <div className="program-view">
      <div className="program-view-header">
        <h2>My Program</h2>
        {!editing && (
          <button className="program-change-btn" onClick={() => setEditing(true)}>
            {program ? 'Change' : 'Choose a program'}
          </button>
        )}
      </div>

      {/* ─── Edit Program/Minor ─── */}
      {editing && programData && (
        <motion.div
          className="program-edit-panel"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="program-edit-field">
            <label>Program</label>
            <select value={editMajor} onChange={(e) => setEditMajor(e.target.value)}>
              <option value="">Choose your program</option>
              {programData.programs.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.name}{p.degree ? ` — ${p.degree}` : ''}
                </option>
              ))}
            </select>
          </div>

          {editProgram && !editNeedsMinor && (
            <div className="program-edit-info">
              This program does not require a minor.
            </div>
          )}

          {editNeedsMinor && (
            <div className="program-edit-field">
              <label>Minor ({editProgram.minor_requirements.total_credits} cr required)</label>
              <select value={editMinor} onChange={(e) => setEditMinor(e.target.value)}>
                <option value="">Choose your minor</option>
                {programData.available_minors.map((m) => (
                  <option key={m.name} value={m.name}>
                    {m.name} ({m.total_credits} cr)
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="program-edit-actions">
            <button className="login-back" onClick={handleCancel}>Cancel</button>
            <button className="login-button" onClick={handleSave}>Save</button>
          </div>
        </motion.div>
      )}

      {/* ─── No program selected ─── */}
      {!program && !editing && (
        <div className="program-empty">
          <div className="program-empty-icon">&#9734;</div>
          <h3>No program</h3>
          <p>Click "Choose a program" to select your field of study.</p>
        </div>
      )}

      {/* ─── Program Overview Cards ─── */}
      {program && programStats && (
        <div className="program-overview-cards">
          <motion.div className="progress-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <div className="progress-card-label">Program</div>
            <div className="program-card-title">{program.name}</div>
            {program.degree && <div className="program-card-degree">{program.degree}</div>}
          </motion.div>
          <motion.div className="progress-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div className="progress-card-label">Planned Credits</div>
            <div className="progress-card-value accent">{programStats.scheduledCredits}<span className="program-stat-total">/{program.total_credits}</span></div>
            <div className="progress-bar-container">
              <div className="progress-bar-fill" style={{ width: `${program.total_credits > 0 ? (programStats.scheduledCredits / program.total_credits) * 100 : 0}%` }} />
            </div>
          </motion.div>
          {program.years && (
            <motion.div className="progress-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <div className="progress-card-label">Duration</div>
              <div className="progress-card-value">{program.years.length} <span className="program-stat-total">years</span></div>
            </motion.div>
          )}
        </div>
      )}

      {/* ─── Optimize 4-year schedule ─── */}
      {program && onOptimizeSchedule && (
        <motion.div
          className="program-optimize-panel"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <h3 className="progress-section-heading">Optimize 4-Year Schedule</h3>
          <p className="program-optimize-desc">
            Describe your interests or career goals. The AI will fill in the elective courses.
          </p>
          <div className="program-optimize-input">
            <textarea
              className="program-optimize-textarea"
              placeholder="E.g.: I want to become an AI engineer and work on machine learning products..."
              value={optimizePrompt}
              onChange={(e) => { setOptimizePrompt(e.target.value); setOptimizeError(null); }}
              rows={3}
            />
            <button
              className="program-optimize-btn"
              onClick={async () => {
                if (!optimizePrompt.trim() || optimizing) return;
                setOptimizing(true);
                setOptimizeError(null);
                setPendingChoices(null);
                setUserChoices({});
                setAdvisorMessages([]);
                setAdvisorInput('');
                try {
                  const result = await onOptimizeSchedule(userMajor, optimizePrompt.trim());
                  if (result?.pendingChoices && Object.keys(result.pendingChoices).length > 0) {
                    setPendingChoices(result.pendingChoices);
                  }
                } catch (err) {
                  setOptimizeError(err?.message || 'Optimization error');
                } finally {
                  setOptimizing(false);
                }
              }}
              disabled={!optimizePrompt.trim() || optimizing}
            >
              {optimizing ? 'Optimizing...' : 'Optimize Schedule'}
            </button>
          </div>
          {optimizeError && (
            <div className="program-optimize-error">{optimizeError}</div>
          )}

          {/* ─── Pending choices: AI advisor chat ─── */}
          {pendingChoices && (
            <div className="program-advisor-chat">
              <h4 className="program-advisor-chat-title">&#9830; AI Course Advisor</h4>

              {/* Message bubbles */}
              <div className="program-advisor-messages">
                {advisorMessages.map((msg, i) => (
                  <div key={i} className={`program-advisor-bubble ${msg.role}`}>
                    <span className="program-advisor-bubble-role">
                      {msg.role === 'user' ? 'You' : 'Advisor'}
                    </span>
                    <p style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</p>
                  </div>
                ))}
                <div ref={advisorBottomRef} />
              </div>

              {/* Clickable option buttons per semester */}
              {Object.entries(pendingChoices).map(([semKey, data]) => {
                const slots = data.slots || 1;
                const chosen = userChoices[semKey] || [];
                return (
                  <div key={semKey} className="program-pending-sem">
                    <strong>{semKey}</strong>
                    <span className="program-pending-slots">
                      {' '}— choose {slots} course{slots > 1 ? 's' : ''}
                    </span>
                    <div className="program-pending-options">
                      {(data.options || []).map((opt) => {
                        const isChosen = chosen.includes(opt.code);
                        const isRecommended = (data.recommended || []).includes(opt.code);
                        // Disable if it conflicts with any already-chosen course in this semester
                        const conflicts = !isChosen && chosen.some((chosenCode) => {
                          const chosenOpt = (data.options || []).find((o) => o.code === chosenCode);
                          return chosenOpt && schedulesConflict(opt.schedule || [], chosenOpt.schedule || []);
                        });
                        return (
                          <button
                            key={opt.code}
                            className={`program-pending-opt ${isChosen ? 'chosen' : ''} ${isRecommended ? 'recommended' : ''} ${conflicts ? 'conflicted' : ''}`}
                            disabled={conflicts}
                            title={conflicts ? 'Conflicts with a course you already selected' : undefined}
                            onClick={() => {
                              if (conflicts) return;
                              setUserChoices((prev) => {
                                const cur = prev[semKey] || [];
                                if (isChosen) {
                                  return { ...prev, [semKey]: cur.filter((c) => c !== opt.code) };
                                }
                                // Replace if at slot limit, otherwise append
                                const next = cur.length >= slots ? [...cur.slice(0, slots - 1), opt.code] : [...cur, opt.code];
                                return { ...prev, [semKey]: next };
                              });
                            }}
                          >
                            {isRecommended && <span className="opt-star">★ </span>}
                            {conflicts && <span className="opt-conflict">✕ </span>}
                            {opt.code} — {opt.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* Free-text reply */}
              <div className="program-advisor-input-row">
                <input
                  className="program-advisor-input"
                  type="text"
                  placeholder="Tell the advisor your preference, or just click options above…"
                  value={advisorInput}
                  onChange={(e) => setAdvisorInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && advisorInput.trim()) {
                      setAdvisorMessages((m) => [...m, { role: 'user', content: advisorInput.trim() }]);
                      setAdvisorInput('');
                    }
                  }}
                />
              </div>

              {/* Confirm button */}
              <button
                className="program-optimize-btn"
                style={{ marginTop: 10 }}
                onClick={async () => {
                  const allChosen = Object.values(userChoices).every((v) => v.length > 0);
                  if (!allChosen) {
                    setAdvisorMessages((m) => [
                      ...m,
                      { role: 'advisor', content: 'Please select at least one course for each semester before confirming.' },
                    ]);
                    return;
                  }
                  setAdvisorMessages((m) => [
                    ...m,
                    { role: 'user', content: `I'll go with: ${Object.entries(userChoices).map(([sem, codes]) => `${codes.join(', ')} for ${sem}`).join('; ')}.` },
                  ]);
                  setOptimizing(true);
                  setOptimizeError(null);
                  try {
                    const result = await onOptimizeSchedule(userMajor, optimizePrompt.trim(), userChoices);
                    if (result?.pendingChoices && Object.keys(result.pendingChoices).length > 0) {
                      setPendingChoices(result.pendingChoices);
                      setUserChoices({});
                    } else {
                      setPendingChoices(null);
                      setAdvisorMessages([]);
                      setAdvisorMessages((m) => [...m, { role: 'advisor', content: 'All done! Your selections have been added to the schedule.' }]);
                      setTimeout(() => setPendingChoices(null), 2000);
                    }
                  } catch (err) {
                    setOptimizeError(err?.message || 'Error');
                  } finally {
                    setOptimizing(false);
                  }
                }}
                disabled={optimizing}
              >
                {optimizing ? 'Updating…' : 'Confirm choices'}
              </button>
            </div>
          )}
        </motion.div>
      )}

      {/* ─── Program Courses by Year ─── */}
      {program && program.years && (
        <>
          <h3 className="progress-section-heading">Pathway by Year</h3>
          <div className="program-years">
            {[...program.years].sort((a, b) => a.year - b.year).map((year, i) => {
              const obligatoire = year.courses.filter((c) => c.type !== 'option');
              const optionGroups = year.option_groups || [];
              const minorCr = year.minor_credits || 0;

              // Count fulfillment
              const reqScheduledCredits = obligatoire.filter((c) => allScheduledIds.has(c.code)).reduce((s, c) => s + c.credits, 0);
              let optScheduledCredits = 0;
              for (const og of optionGroups) {
                const matching = findMatchingCourses(og, year.courses, courses, allScheduledIds);
                optScheduledCredits += Math.min(matching.reduce((s, c) => s + c.credits, 0), og.credits_required);
              }
              const totalDone = reqScheduledCredits + optScheduledCredits;

              return (
                <motion.div
                  key={year.year}
                  className="program-year-card"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * i }}
                >
                  <div className="program-year-header">
                    <h4>{year.label}</h4>
                    <span className="program-year-stats">
                      {totalDone}/{year.credits} cr
                    </span>
                  </div>
                  <div className="progress-bar-container">
                    <div className="progress-bar-fill" style={{ width: `${year.credits > 0 ? (totalDone / year.credits) * 100 : 0}%` }} />
                  </div>

                  {/* Required courses */}
                  {obligatoire.length > 0 && (
                    <div className="program-course-list">
                      {obligatoire.map((course) => {
                        const isScheduled = allScheduledIds.has(course.code);
                        return (
                          <div key={course.code} className={`program-course-item ${isScheduled ? 'scheduled' : ''}`}>
                            <span className="program-course-code">{course.code}</span>
                            <span className="program-course-name">{course.name}</span>
                            <span className="program-course-cr">{course.credits} cr</span>
                            {isScheduled && <span className="program-course-check">&#10003;</span>}
                            {course.prerequisites && course.prerequisites.length > 0 && (
                              <span className="program-course-prereq" title={`Prerequisites: ${course.prerequisites.map((g) => Array.isArray(g) ? g.join(' / ') : g).join(' + ')}`}>
                                &#8592; {course.prerequisites.map((g) => Array.isArray(g) ? g.join(' / ') : g).join(' + ')}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Option groups */}
                  {optionGroups.map((og) => (
                    <OptionGroupCard
                      key={og.id}
                      og={og}
                      yearCourses={year.courses}
                      allCourses={courses}
                      scheduledIds={allScheduledIds}
                    />
                  ))}

                  {/* Minor credits */}
                  {minorCr > 0 && (
                    <div className="og-card og-minor">
                      <div className="og-header">
                        <div className="og-header-left">
                          <span className="og-icon">&#9830;</span>
                          <span className="og-label">Minor Credits</span>
                        </div>
                        <span className="og-status">{minorCr} cr</span>
                      </div>
                      <div className="og-hint">
                        Courses from your minor program
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </>
      )}

      {/* ─── OFG Requirements (open only) ─── */}
      {program && program.ofg_requirements?.open?.length > 0 && (
        <>
          <h3 className="progress-section-heading">OFG — General Education</h3>
          {(() => {
            const OFG_NAMES = {
              OFG1: 'Initiation au travail intellectuel universitaire',
              OFG2: 'Ouverture à l\'Autre et/ou internationalisation',
              OFG3: 'Initiation à la responsabilité sociale et citoyenne',
              OFG4: 'Initiation à la multidisciplinarité et/ou l\'interdisciplinarité',
              OFG5: 'Connaissances en mathématiques et/ou sciences',
              OFG6: 'Sensibilité aux arts et lettres',
              OFG7: 'Capacité de penser logiquement et de manière critique',
              OFG8: 'Capacité de s\'exprimer en français',
              OFG9: 'Capacité de s\'exprimer en anglais',
            };
            const openOfgs = program.ofg_requirements.open;
            const programCourseIds = new Set(program.all_courses.map((c) => c.code));
            const usedCourseIds = new Set();
            const ofgFulfilledBy = {};

            for (const ofg of openOfgs) {
              const ofgKey = ofg.ofg;
              const ofgCourses = courses.filter((c) =>
                c.ofg && c.ofg.split(',').map((t) => t.trim()).includes(ofgKey)
                && allScheduledIds.has(c.id)
                && !programCourseIds.has(c.id)
                && !usedCourseIds.has(c.id)
              );
              if (ofgCourses.length > 0) {
                ofgFulfilledBy[ofgKey] = ofgCourses[0];
                usedCourseIds.add(ofgCourses[0].id);
              }
            }

            return (
              <div className="program-ofg-grid">
                {openOfgs.map((ofg) => {
                  const ofgKey = ofg.ofg;
                  const filledBy = ofgFulfilledBy[ofgKey];
                  const isDone = !!filledBy;
                  const ofgCourses = courses.filter((c) =>
                    c.ofg && c.ofg.split(',').map((t) => t.trim()).includes(ofgKey)
                    && !programCourseIds.has(c.id)
                  );

                  return (
                    <motion.div
                      key={ofgKey}
                      className={`program-ofg-card ${isDone ? 'fulfilled' : ''}`}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <div className="program-ofg-header">
                        <span className="program-ofg-tag">{ofgKey}</span>
                        <span className="program-ofg-status">
                          {isDone ? '\u2713' : '3 cr required'}
                        </span>
                      </div>
                      <div className="program-ofg-name">{OFG_NAMES[ofgKey] || ofgKey}</div>
                      {isDone ? (
                        <div className="program-ofg-fulfilled">
                          <span className="dept-course-chip enrolled">{filledBy.id}</span>
                        </div>
                      ) : (
                        <div className="program-ofg-options">
                          {ofgCourses.slice(0, 8).map((c) => (
                            <span key={c.id} className="dept-course-chip">{c.id}</span>
                          ))}
                          {ofgCourses.length > 8 && (
                            <span className="program-ofg-more">+{ofgCourses.length - 8} more</span>
                          )}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            );
          })()}
        </>
      )}

      {/* ─── Minor Requirements ─── */}
      {program && program.minor_requirements && (
        <div className="program-minor-info">
          {program.minor_requirements.has_minor ? (
            <p className="program-minor-note">This program includes {program.minor_requirements.total_credits} minor credits.</p>
          ) : (
            <p className="program-minor-note">{program.minor_requirements.how_it_works}</p>
          )}
        </div>
      )}

      {/* ─── Minor Section ─── */}
      {minor && minorStats && (
        <>
          <h3 className="progress-section-heading">Minor: {minor.name}</h3>
          <div className="program-overview-cards minor-overview">
            <motion.div className="progress-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <div className="progress-card-label">Minor Credits</div>
              <div className="progress-card-value accent">{minorStats.scheduledCredits}<span className="program-stat-total">/{minorStats.totalCredits}</span></div>
              <div className="progress-bar-container">
                <div className="progress-bar-fill" style={{ width: `${minorStats.totalCredits > 0 ? (minorStats.scheduledCredits / minorStats.totalCredits) * 100 : 0}%` }} />
              </div>
            </motion.div>
            <motion.div className="progress-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              <div className="progress-card-label">Planned Courses</div>
              <div className="progress-card-value">{minorStats.scheduled}<span className="program-stat-total">/{minorStats.total}</span></div>
            </motion.div>
          </div>

          {minor.required_courses && minor.required_courses.length > 0 && (
            <div className="program-minor-courses">
              <h4 className="program-minor-courses-heading">Required Courses</h4>
              <div className="program-course-list">
                {minor.required_courses.map((course) => {
                  const isScheduled = allScheduledIds.has(course.code);
                  return (
                    <div key={course.code} className={`program-course-item ${isScheduled ? 'scheduled' : ''}`}>
                      <span className="program-course-code">{course.code}</span>
                      <span className="program-course-name">{course.name}</span>
                      <span className="program-course-cr">{course.credits} cr</span>
                      {isScheduled && <span className="program-course-check">&#10003;</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {minor.elective_courses && minor.elective_courses.length > 0 && (
            <div className="program-minor-courses">
              <h4 className="program-minor-courses-heading">Elective Courses ({minor.elective_credits} cr to choose)</h4>
              <div className="program-course-list">
                {minor.elective_courses.map((course) => {
                  const isScheduled = allScheduledIds.has(course.code);
                  return (
                    <div key={course.code} className={`program-course-item ${isScheduled ? 'scheduled' : ''}`}>
                      <span className="program-course-code">{course.code}</span>
                      <span className="program-course-name">{course.name}</span>
                      <span className="program-course-cr">{course.credits} cr</span>
                      {isScheduled && <span className="program-course-check">&#10003;</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
