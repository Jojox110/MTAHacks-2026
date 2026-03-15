import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const DAYS = ['Lu', 'Ma', 'Me', 'Je', 'Ve'];
const DAY_LABELS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];
const START_HOUR = 8;
const END_HOUR = 22;
const HOUR_HEIGHT = 60; // px per hour

// Parse "MaVe" → ['Ma', 'Ve'], "LuMeVe" → ['Lu', 'Me', 'Ve']
function parseDays(dayStr) {
  if (!dayStr || dayStr === 'À dét.') return [];
  const result = [];
  const abbrevs = ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'];
  let remaining = dayStr;
  while (remaining.length > 0) {
    const match = abbrevs.find((a) => remaining.startsWith(a));
    if (match) {
      result.push(match);
      remaining = remaining.slice(match.length);
    } else {
      remaining = remaining.slice(1);
    }
  }
  return result.filter((d) => DAYS.includes(d));
}

// Parse "0830-0945" → { start: 8.5, end: 9.75 }
function parseTime(timeStr) {
  if (!timeStr || timeStr === 'À dét.') return null;
  const parts = timeStr.split('-');
  if (parts.length !== 2) return null;
  const parse = (t) => {
    const h = parseInt(t.slice(0, 2), 10);
    const m = parseInt(t.slice(2, 4), 10);
    return h + m / 60;
  };
  return { start: parse(parts[0]), end: parse(parts[1]) };
}

// Generate distinct colors for courses
const COURSE_COLORS = [
  '#e8a849', '#5c9ee0', '#5ec269', '#e05c5c', '#b07ce8',
  '#e0a05c', '#5ccec2', '#e07cb0', '#8ce05c', '#e0d45c',
  '#5c7ce0', '#e0785c', '#7ce0b0', '#c45ce0', '#5ce0e0',
];

export default function ScheduleGrid({ selectedCourses, onRemoveCourse, sessionData, optimizerSections = {} }) {
  const [hoveredBlock, setHoveredBlock] = useState(null);
  const totalCredits = selectedCourses.reduce((sum, c) => sum + c.credits, 0);

  // Build calendar blocks from selected courses + session data
  const { blocks, conflicts, unscheduled } = useMemo(() => {
    const blocks = [];
    const unscheduled = [];

    if (!sessionData || sessionData.length === 0) {
      // No session data, show all as unscheduled
      return { blocks: [], conflicts: [], unscheduled: selectedCourses };
    }

    selectedCourses.forEach((course, idx) => {
      const color = course.color || COURSE_COLORS[idx % COURSE_COLORS.length];
      // Find matching sections in session data
      const sections = sessionData.filter((s) => s.sigle === course.id);
      if (sections.length === 0) {
        unscheduled.push(course);
        return;
      }
      // Use the optimizer-chosen section (by NRC) if available, otherwise fall back to the first section
      const chosenNrc = optimizerSections[course.id]?.nrc;
      const section = (chosenNrc && sections.find((s) => s.nrc === chosenNrc)) || sections[0];
      let hasTimeSlot = false;

      (section.schedule || []).forEach((slot) => {
        const days = parseDays(slot.days);
        const time = parseTime(slot.time);
        if (!time || days.length === 0) return;
        hasTimeSlot = true;

        days.forEach((day) => {
          blocks.push({
            courseId: course.id,
            courseName: course.name || section.titre,
            nrc: section.nrc,
            groupe: section.groupe,
            professor: section.professor,
            location: slot.location,
            day,
            dayIdx: DAYS.indexOf(day),
            start: time.start,
            end: time.end,
            color,
            course,
          });
        });
      });

      if (!hasTimeSlot) {
        unscheduled.push(course);
      }
    });

    // Detect conflicts (overlapping blocks on same day)
    const conflicts = new Set();
    for (let i = 0; i < blocks.length; i++) {
      for (let j = i + 1; j < blocks.length; j++) {
        const a = blocks[i];
        const b = blocks[j];
        if (a.dayIdx === b.dayIdx && a.start < b.end && b.start < a.end) {
          conflicts.add(i);
          conflicts.add(j);
        }
      }
    }

    return { blocks, conflicts, unscheduled };
  }, [selectedCourses, sessionData]);

  const hours = [];
  for (let h = START_HOUR; h < END_HOUR; h++) hours.push(h);

  return (
    <div className="schedule-view">
      <div className="schedule-header">
        <h2>Horaire</h2>
        <div className="schedule-stats">
          <div className="stat">
            <div className="stat-value accent">{selectedCourses.length}</div>
            <div className="stat-label">Cours</div>
          </div>
          <div className="stat">
            <div className="stat-value">{totalCredits}</div>
            <div className="stat-label">Crédits</div>
          </div>
          {conflicts.size > 0 && (
            <div className="stat">
              <div className="stat-value" style={{ color: 'var(--danger)' }}>!</div>
              <div className="stat-label">Conflits</div>
            </div>
          )}
        </div>
      </div>

      {selectedCourses.length === 0 ? (
        <div className="empty-schedule">
          <div className="empty-schedule-icon">&#128197;</div>
          <h3>Aucun cours</h3>
          <p>
            Sélectionnez des cours dans le catalogue ou utilisez le conseiller IA
            pour des recommandations personnalisées.
          </p>
        </div>
      ) : (
        <>
          {/* Weekly calendar grid */}
          <div className="cal-container">
            <div className="cal-grid">
              {/* Header row */}
              <div className="cal-corner" />
              {DAY_LABELS.map((label, i) => (
                <div key={i} className="cal-day-header">
                  {label}
                </div>
              ))}

              {/* Time gutter + day columns */}
              <div className="cal-time-gutter">
                {hours.map((h) => (
                  <div key={h} className="cal-time-label" style={{ height: HOUR_HEIGHT }}>
                    {String(h).padStart(2, '0')}:00
                  </div>
                ))}
              </div>

              <div className="cal-body">
                {/* Grid lines */}
                {hours.map((h) => (
                  <div
                    key={h}
                    className="cal-hour-line"
                    style={{ top: (h - START_HOUR) * HOUR_HEIGHT }}
                  />
                ))}

                {/* Day column separators */}
                {DAYS.map((_, i) => (
                  <div
                    key={i}
                    className="cal-day-col"
                    style={{ left: `${(i / 5) * 100}%`, width: `${100 / 5}%` }}
                  />
                ))}

                {/* Course blocks */}
                <AnimatePresence>
                  {blocks.map((block, i) => {
                    const top = (block.start - START_HOUR) * HOUR_HEIGHT;
                    const height = (block.end - block.start) * HOUR_HEIGHT;
                    const left = `calc(${(block.dayIdx / 5) * 100}% + 2px)`;
                    const width = `calc(${100 / 5}% - 4px)`;
                    const isConflict = conflicts.has(i);
                    const isHovered = hoveredBlock === block.courseId;

                    return (
                      <motion.div
                        key={`${block.courseId}-${block.day}-${block.start}`}
                        className={`cal-block${isConflict ? ' conflict' : ''}${isHovered ? ' hovered' : ''}`}
                        style={{
                          top,
                          height: Math.max(height, 20),
                          left,
                          width,
                          '--block-color': block.color,
                          borderColor: isConflict ? 'var(--danger)' : block.color,
                        }}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.2 }}
                        onMouseEnter={() => setHoveredBlock(block.courseId)}
                        onMouseLeave={() => setHoveredBlock(null)}
                        title={`${block.courseId} — ${block.courseName}\n${block.professor || ''}\n${block.location || ''}`}
                      >
                        <div className="cal-block-id">{block.courseId}</div>
                        {height >= 40 && (
                          <div className="cal-block-name">{block.courseName}</div>
                        )}
                        {height >= 55 && block.location && (
                          <div className="cal-block-location">{block.location}</div>
                        )}
                        <button
                          className="cal-block-remove"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveCourse(block.course);
                          }}
                        >
                          &times;
                        </button>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Unscheduled courses (no timetable data) */}
          {unscheduled.length > 0 && (
            <div className="cal-unscheduled">
              <h4>Cours sans horaire disponible</h4>
              <div className="cal-unscheduled-list">
                {unscheduled.map((course) => (
                  <div key={course.id} className="cal-unscheduled-item">
                    <span className="cal-unscheduled-id" style={{ color: course.color }}>
                      {course.id}
                    </span>
                    <span className="cal-unscheduled-name">{course.name}</span>
                    <span className="cal-unscheduled-cr">{course.credits} cr</span>
                    <button
                      className="semester-course-remove"
                      onClick={() => onRemoveCourse(course)}
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
