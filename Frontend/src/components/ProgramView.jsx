import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';

export default function ProgramView({ programData, courses = [], userMajor, userMinor, scheduleMap, onUpdateProfile }) {
  const [editing, setEditing] = useState(false);
  const [editMajor, setEditMajor] = useState(userMajor || '');
  const [editMinor, setEditMinor] = useState(userMinor || '');

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

  // Check if the program being edited needs a minor
  const editProgram = useMemo(() => {
    if (!editMajor || !programData?.programs) return null;
    return programData.programs.find((p) => p.name === editMajor) || null;
  }, [editMajor, programData]);

  const editNeedsMinor = editProgram?.minor_requirements?.has_minor ?? false;

  // Reset minor when switching to a program that doesn't need one
  useEffect(() => {
    if (editing && !editNeedsMinor) setEditMinor('');
  }, [editing, editNeedsMinor]);

  const programStats = useMemo(() => {
    if (!program) return null;
    // Required courses
    const reqCourses = program.all_courses.filter((c) => c.type !== 'option');
    const reqScheduled = reqCourses.filter((c) => allScheduledIds.has(c.code));
    const reqCredits = reqCourses.reduce((s, c) => s + c.credits, 0);
    const reqScheduledCredits = reqCourses.filter((c) => allScheduledIds.has(c.code)).reduce((s, c) => s + c.credits, 0);

    // Option groups: count credits needed and fulfilled
    let optTotalCredits = 0;
    let optScheduledCredits = 0;
    for (const y of (program.years || [])) {
      for (const og of (y.option_groups || [])) {
        optTotalCredits += og.credits_required;
        const groupCourses = y.courses.filter((c) => c.option_group === og.id);
        const scheduledCr = groupCourses.filter((c) => allScheduledIds.has(c.code)).reduce((s, c) => s + c.credits, 0);
        optScheduledCredits += Math.min(scheduledCr, og.credits_required);
      }
    }

    // Open OFG credits (1 course per OFG, 3 cr each)
    const openOfgs = program.ofg_requirements?.open || [];
    const ofgTotalCredits = openOfgs.reduce((s, o) => s + o.credits, 0);
    let ofgScheduledCredits = 0;
    for (const ofg of openOfgs) {
      const ofgCourses = courses.filter((c) => c.ofg && c.ofg.split(',').map((t) => t.trim()).includes(ofg.ofg));
      if (ofgCourses.some((c) => allScheduledIds.has(c.id))) ofgScheduledCredits += ofg.credits;
    }

    const totalCredits = reqCredits + optTotalCredits + ofgTotalCredits;
    const scheduledCredits = reqScheduledCredits + optScheduledCredits + ofgScheduledCredits;

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
            {program ? 'Change Program' : 'Select Program'}
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
              <option value="">Select your program</option>
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
                <option value="">Select your minor</option>
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
          <h3>No program selected</h3>
          <p>Click "Select Program" above to choose your degree program.</p>
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
            <div className="progress-card-label">Credits Scheduled</div>
            <div className="progress-card-value accent">{programStats.scheduledCredits}<span className="program-stat-total">/{programStats.totalCredits}</span></div>
            <div className="progress-bar-container">
              <div className="progress-bar-fill" style={{ width: `${programStats.totalCredits > 0 ? (programStats.scheduledCredits / programStats.totalCredits) * 100 : 0}%` }} />
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

      {/* ─── Program Courses by Year ─── */}
      {program && program.years && (
        <>
          <h3 className="progress-section-heading">Course Plan by Year</h3>
          <div className="program-years">
            {[...program.years].sort((a, b) => a.year - b.year).map((year, i) => {
              const obligatoire = year.courses.filter((c) => c.type !== 'option');
              const optionGroups = year.option_groups || [];

              // Count required courses scheduled
              const reqScheduled = obligatoire.filter((c) => allScheduledIds.has(c.code));
              const reqCredits = obligatoire.reduce((s, c) => s + c.credits, 0);
              const reqScheduledCredits = reqScheduled.reduce((s, c) => s + c.credits, 0);

              // Count option group completion
              let optScheduledCredits = 0;
              let optTotalCredits = 0;
              let optGroupsDone = 0;
              for (const og of optionGroups) {
                optTotalCredits += og.credits_required;
                const groupCourses = year.courses.filter((c) => c.option_group === og.id);
                const scheduled = groupCourses.filter((c) => allScheduledIds.has(c.code));
                const scheduledCr = scheduled.reduce((s, c) => s + c.credits, 0);
                const done = Math.min(scheduledCr, og.credits_required);
                optScheduledCredits += done;
                if (done >= og.credits_required) optGroupsDone++;
              }

              const totalNeeded = reqCredits + optTotalCredits;
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
                      {totalDone}/{totalNeeded} cr
                    </span>
                  </div>
                  <div className="progress-bar-container">
                    <div className="progress-bar-fill" style={{ width: `${totalNeeded > 0 ? (totalDone / totalNeeded) * 100 : 0}%` }} />
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
                              <span className="program-course-prereq" title={`Prereqs: ${course.prerequisites.map((g) => Array.isArray(g) ? g.join(' / ') : g).join(' + ')}`}>
                                &#8592; {course.prerequisites.map((g) => Array.isArray(g) ? g.join(' / ') : g).join(' + ')}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Option groups */}
                  {optionGroups.map((og) => {
                    const groupCourses = year.courses.filter((c) => c.option_group === og.id);
                    const scheduled = groupCourses.filter((c) => allScheduledIds.has(c.code));
                    const scheduledCr = scheduled.reduce((s, c) => s + c.credits, 0);
                    const fulfilled = scheduledCr >= og.credits_required;
                    return (
                      <div key={og.id} className="program-option-group">
                        <div className={`program-option-header ${fulfilled ? 'fulfilled' : ''}`}>
                          <span>{og.label}</span>
                          <span className="program-option-status">
                            {fulfilled ? `\u2713 ${scheduledCr}/${og.credits_required} cr` : `${scheduledCr}/${og.credits_required} cr`}
                          </span>
                        </div>
                        <div className="program-course-list">
                          {groupCourses.map((course) => {
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
                    );
                  })}

                  {year.open_credits > 0 && (
                    <div className="program-minor-slot">
                      {year.open_credits} cr from electives / options
                    </div>
                  )}
                  {year.minor_credits > 0 && (
                    <div className="program-minor-slot">
                      + {year.minor_credits} cr from minor
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </>
      )}

      {/* ─── OFG Requirements ─── */}
      {program && program.ofg_requirements && program.ofg_requirements.open && program.ofg_requirements.open.length > 0 && (
        <>
          <h3 className="progress-section-heading">OFG — Formation g&eacute;n&eacute;rale</h3>
          <div className="program-ofg-grid">
            {program.ofg_requirements.open.map((ofg) => {
              const ofgCourses = courses.filter((c) => c.ofg && c.ofg.split(',').map((t) => t.trim()).includes(ofg.ofg));
              const scheduled = ofgCourses.filter((c) => allScheduledIds.has(c.id));
              const fulfilled = scheduled.length > 0;
              return (
                <motion.div
                  key={ofg.ofg}
                  className={`program-ofg-card ${fulfilled ? 'fulfilled' : ''}`}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="program-ofg-header">
                    <span className="program-ofg-tag">{ofg.ofg}</span>
                    <span className="program-ofg-status">{fulfilled ? '\u2713' : `${ofg.credits} cr`}</span>
                  </div>
                  <div className="program-ofg-name">{ofg.name}</div>
                  {fulfilled ? (
                    <div className="program-ofg-fulfilled">
                      {scheduled.map((c) => (
                        <span key={c.id} className="dept-course-chip enrolled">{c.id}</span>
                      ))}
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

          {/* Fulfilled OFGs (by required courses) */}
          {program.ofg_requirements.fulfilled && Object.keys(program.ofg_requirements.fulfilled).length > 0 && (
            <div className="program-ofg-fulfilled-list">
              {Object.entries(program.ofg_requirements.fulfilled).map(([ofgKey, codes]) => (
                <div key={ofgKey} className="program-ofg-fulfilled-row">
                  <span className="program-ofg-tag small">{ofgKey}</span>
                  <span className="program-ofg-fulfilled-by">
                    {codes.join(', ')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ─── Minor Requirements ─── */}
      {program && program.minor_requirements && (
        <div className="program-minor-info">
          {program.minor_requirements.has_minor ? (
            <p className="program-minor-note">This program includes {program.minor_requirements.total_credits} credits from a minor.</p>
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
              <div className="progress-card-label">Courses Scheduled</div>
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
              <h4 className="program-minor-courses-heading">Elective Options ({minor.elective_credits} cr to choose)</h4>
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
