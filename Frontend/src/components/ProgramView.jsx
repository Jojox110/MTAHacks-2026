import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Find scheduled courses that satisfy an option group */
function findMatchingCourses(og, yearCourses, allCourses, scheduledIds) {
  const groupCourses = yearCourses.filter((c) => c.option_group === og.id);
  const ogCodes = og.codes || [];
  const ogPrefix = og.prefix || '';

  return allCourses.filter((c) => {
    if (!scheduledIds.has(c.id)) return false;
    if (groupCourses.some((gc) => gc.code === c.id)) return true;
    if (ogCodes.length > 0 && ogCodes.includes(c.id)) return true;
    if (ogPrefix && c.id.startsWith(ogPrefix)) return true;
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
      ? `Formation générale — OFG ${ofgMatch[1]}`
      : 'Formation générale (banque OFG)';
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
          {ogCodes.length > 12 && <span className="program-ofg-more">+{ogCodes.length - 12} autres</span>}
        </div>
      )}

      {/* Prefix hint */}
      {type === 'prefix' && matchingScheduled.length === 0 && (
        <div className="og-hint">
          Choisir des cours <strong>{prefix}</strong>{og.levels ? ` de niveau ${og.levels}` : ''} dans le catalogue
        </div>
      )}

      {/* Free elective hint */}
      {type === 'free' && matchingScheduled.length === 0 && (
        <div className="og-hint">
          N'importe quel cours du catalogue
        </div>
      )}

      {/* OFG hint */}
      {type === 'ofg' && matchingScheduled.length === 0 && (
        <div className="og-hint">
          Choisir dans la banque de cours OFG
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
  const [pendingChoices, setPendingChoices] = useState(null);   // { semKey: [{code,name}] }
  const [userChoices, setUserChoices] = useState({});           // { semKey: [code] }

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
        <h2>Mon programme</h2>
        {!editing && (
          <button className="program-change-btn" onClick={() => setEditing(true)}>
            {program ? 'Changer' : 'Choisir un programme'}
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
            <label>Programme</label>
            <select value={editMajor} onChange={(e) => setEditMajor(e.target.value)}>
              <option value="">Choisir votre programme</option>
              {programData.programs.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.name}{p.degree ? ` — ${p.degree}` : ''}
                </option>
              ))}
            </select>
          </div>

          {editProgram && !editNeedsMinor && (
            <div className="program-edit-info">
              Ce programme ne nécessite pas de mineure.
            </div>
          )}

          {editNeedsMinor && (
            <div className="program-edit-field">
              <label>Mineure ({editProgram.minor_requirements.total_credits} cr requis)</label>
              <select value={editMinor} onChange={(e) => setEditMinor(e.target.value)}>
                <option value="">Choisir votre mineure</option>
                {programData.available_minors.map((m) => (
                  <option key={m.name} value={m.name}>
                    {m.name} ({m.total_credits} cr)
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="program-edit-actions">
            <button className="login-back" onClick={handleCancel}>Annuler</button>
            <button className="login-button" onClick={handleSave}>Sauvegarder</button>
          </div>
        </motion.div>
      )}

      {/* ─── No program selected ─── */}
      {!program && !editing && (
        <div className="program-empty">
          <div className="program-empty-icon">&#9734;</div>
          <h3>Aucun programme</h3>
          <p>Cliquez sur "Choisir un programme" pour sélectionner votre programme d'études.</p>
        </div>
      )}

      {/* ─── Program Overview Cards ─── */}
      {program && programStats && (
        <div className="program-overview-cards">
          <motion.div className="progress-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <div className="progress-card-label">Programme</div>
            <div className="program-card-title">{program.name}</div>
            {program.degree && <div className="program-card-degree">{program.degree}</div>}
          </motion.div>
          <motion.div className="progress-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div className="progress-card-label">Crédits planifiés</div>
            <div className="progress-card-value accent">{programStats.scheduledCredits}<span className="program-stat-total">/{program.total_credits}</span></div>
            <div className="progress-bar-container">
              <div className="progress-bar-fill" style={{ width: `${program.total_credits > 0 ? (programStats.scheduledCredits / program.total_credits) * 100 : 0}%` }} />
            </div>
          </motion.div>
          {program.years && (
            <motion.div className="progress-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <div className="progress-card-label">Durée</div>
              <div className="progress-card-value">{program.years.length} <span className="program-stat-total">ans</span></div>
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
          <h3 className="progress-section-heading">Optimiser l&apos;horaire 4 ans</h3>
          <p className="program-optimize-desc">
            Décrivez vos intérêts ou objectifs de carrière. L&apos;IA remplira les cours optionnels.
          </p>
          <div className="program-optimize-input">
            <textarea
              className="program-optimize-textarea"
              placeholder="Ex.: Je veux devenir ingénieur en IA et travailler sur des produits de machine learning..."
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
                try {
                  const result = await onOptimizeSchedule(userMajor, optimizePrompt.trim());
                  if (result?.pendingChoices && Object.keys(result.pendingChoices).length > 0) {
                    setPendingChoices(result.pendingChoices);
                  }
                } catch (err) {
                  setOptimizeError(err?.message || 'Erreur lors de l\'optimisation');
                } finally {
                  setOptimizing(false);
                }
              }}
              disabled={!optimizePrompt.trim() || optimizing}
            >
              {optimizing ? 'Optimisation...' : 'Optimiser l\'horaire'}
            </button>
          </div>
          {optimizeError && (
            <div className="program-optimize-error">{optimizeError}</div>
          )}

          {/* ─── Pending choices: LLM couldn't find relevant courses ─── */}
          {pendingChoices && (
            <div className="program-pending-choices">
              <p className="program-pending-title">
                L&apos;IA n&apos;a pas trouvé de cours pertinents pour certains semestres. Veuillez choisir manuellement&nbsp;:
              </p>
              {Object.entries(pendingChoices).map(([semKey, options]) => (
                <div key={semKey} className="program-pending-sem">
                  <strong>{semKey}</strong>
                  <div className="program-pending-options">
                    {options.map((opt) => {
                      const chosen = (userChoices[semKey] || []).includes(opt.code);
                      return (
                        <button
                          key={opt.code}
                          className={`program-pending-opt ${chosen ? 'chosen' : ''}`}
                          onClick={() => {
                            setUserChoices((prev) => {
                              const cur = prev[semKey] || [];
                              return {
                                ...prev,
                                [semKey]: chosen
                                  ? cur.filter((c) => c !== opt.code)
                                  : [...cur, opt.code],
                              };
                            });
                          }}
                        >
                          {opt.code} — {opt.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              <button
                className="program-optimize-btn"
                style={{ marginTop: 12 }}
                onClick={async () => {
                  setOptimizing(true);
                  setOptimizeError(null);
                  try {
                    const result = await onOptimizeSchedule(userMajor, optimizePrompt.trim(), userChoices);
                    if (result?.pendingChoices && Object.keys(result.pendingChoices).length > 0) {
                      setPendingChoices(result.pendingChoices);
                      setUserChoices({});
                    } else {
                      setPendingChoices(null);
                    }
                  } catch (err) {
                    setOptimizeError(err?.message || 'Erreur');
                  } finally {
                    setOptimizing(false);
                  }
                }}
                disabled={optimizing}
              >
                {optimizing ? 'Mise à jour...' : 'Confirmer les choix'}
              </button>
            </div>
          )}
        </motion.div>
      )}

      {/* ─── Program Courses by Year ─── */}
      {program && program.years && (
        <>
          <h3 className="progress-section-heading">Cheminement par année</h3>
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
                              <span className="program-course-prereq" title={`Préalables: ${course.prerequisites.map((g) => Array.isArray(g) ? g.join(' / ') : g).join(' + ')}`}>
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
                          <span className="og-label">Crédits de la mineure</span>
                        </div>
                        <span className="og-status">{minorCr} cr</span>
                      </div>
                      <div className="og-hint">
                        Cours provenant de votre programme de mineure
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
          <h3 className="progress-section-heading">OFG — Formation générale</h3>
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
                          {isDone ? '\u2713' : '3 cr requis'}
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
                            <span className="program-ofg-more">+{ofgCourses.length - 8} autres</span>
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
            <p className="program-minor-note">Ce programme comprend {program.minor_requirements.total_credits} crédits de mineure.</p>
          ) : (
            <p className="program-minor-note">{program.minor_requirements.how_it_works}</p>
          )}
        </div>
      )}

      {/* ─── Minor Section ─── */}
      {minor && minorStats && (
        <>
          <h3 className="progress-section-heading">Mineure : {minor.name}</h3>
          <div className="program-overview-cards minor-overview">
            <motion.div className="progress-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <div className="progress-card-label">Crédits mineure</div>
              <div className="progress-card-value accent">{minorStats.scheduledCredits}<span className="program-stat-total">/{minorStats.totalCredits}</span></div>
              <div className="progress-bar-container">
                <div className="progress-bar-fill" style={{ width: `${minorStats.totalCredits > 0 ? (minorStats.scheduledCredits / minorStats.totalCredits) * 100 : 0}%` }} />
              </div>
            </motion.div>
            <motion.div className="progress-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              <div className="progress-card-label">Cours planifiés</div>
              <div className="progress-card-value">{minorStats.scheduled}<span className="program-stat-total">/{minorStats.total}</span></div>
            </motion.div>
          </div>

          {minor.required_courses && minor.required_courses.length > 0 && (
            <div className="program-minor-courses">
              <h4 className="program-minor-courses-heading">Cours obligatoires</h4>
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
              <h4 className="program-minor-courses-heading">Cours à option ({minor.elective_credits} cr à choisir)</h4>
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
