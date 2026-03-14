import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DEPARTMENTS } from '../data/courses';
import { hasConflict } from '../data/courses';

export default function CourseCatalog({ courses, selectedCourses, onToggleCourse, userMajor, priorCourseIds = new Set() }) {
  const [dept, setDept] = useState(userMajor || 'All');
  const [search, setSearch] = useState('');
  const [showCompleted, setShowCompleted] = useState(false);

  const selectedIds = selectedCourses.map((c) => c.id);

  const filtered = useMemo(() => {
    return courses.filter((c) => {
      // Hide courses completed in prior semesters (unless toggled on)
      const isCompleted = priorCourseIds.has(c.id);
      if (isCompleted && !showCompleted) return false;

      if (dept !== 'All' && c.dept !== dept) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          c.id.toLowerCase().includes(q) ||
          c.name.toLowerCase().includes(q) ||
          c.dept.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [courses, dept, search, priorCourseIds, showCompleted]);

  // Build tooltip for each course
  function getTooltip(course, isSelected, isCompleted, conflictWith, prereqsMet, missingPrereqs) {
    if (isSelected) return `Click to remove ${course.id} from this semester`;
    if (isCompleted && showCompleted) return `Already completed in a prior semester. Click to retake.`;
    if (conflictWith) return `Time conflict with ${conflictWith.id} (${conflictWith.schedule.days.join('/')} ${conflictWith.schedule.start}–${conflictWith.schedule.end})`;
    if (!prereqsMet) return `Missing prerequisites: ${missingPrereqs.join(', ')}. Complete them in an earlier semester first.`;
    return `Click to add ${course.id} – ${course.name} (${course.credits} credits, ${course.schedule.days.join('/')} ${course.schedule.start}–${course.schedule.end})`;
  }

  return (
    <>
      <div className="filter-section">
        <label>Department</label>
        <select value={dept} onChange={(e) => setDept(e.target.value)}>
          <option value="All">All Departments</option>
          {DEPARTMENTS.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>

      <div className="filter-section">
        <label>Search</label>
        <input
          type="text"
          placeholder="Course ID or name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="filter-section completed-toggle">
        <label className="toggle-label">
          <input
            type="checkbox"
            checked={showCompleted}
            onChange={(e) => setShowCompleted(e.target.checked)}
          />
          <span>Show completed courses ({priorCourseIds.size})</span>
        </label>
      </div>

      <div className="course-list">
        <AnimatePresence mode="popLayout">
          {filtered.map((course) => {
            const isCompleted = priorCourseIds.has(course.id);
            const isSelected = selectedIds.includes(course.id);
            const conflictWith = !isSelected && !isCompleted
              ? hasConflict(course, selectedCourses)
              : null;

            // Prereqs are met if completed in a prior semester
            const prereqsMet = course.prereqs.every((p) => priorCourseIds.has(p));
            const missingPrereqs = course.prereqs.filter((p) => !priorCourseIds.has(p));

            const blocked = !isSelected && !isCompleted && (conflictWith || !prereqsMet);
            const tooltip = getTooltip(course, isSelected, isCompleted, conflictWith, prereqsMet, missingPrereqs);

            return (
              <motion.div
                key={course.id}
                className={`course-card ${isSelected ? 'selected' : ''} ${isCompleted && !isSelected ? 'completed' : ''} ${blocked ? 'conflict' : ''}`}
                onClick={() => {
                  if (isSelected) return onToggleCourse(course);
                  if (blocked) return;
                  // Allow retake if showCompleted is on
                  if (isCompleted) return onToggleCourse(course);
                  onToggleCourse(course);
                }}
                title={tooltip}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15 }}
              >
                <div className="course-card-header">
                  <div
                    className="course-color-dot"
                    style={{ background: course.color }}
                  />
                  <span className="course-card-id">{course.id}</span>
                  {isCompleted && !isSelected && (
                    <span className="course-card-done">Done</span>
                  )}
                  <span className="course-card-credits">{course.credits} cr</span>
                </div>
                <div className="course-card-name">{course.name}</div>
                <div className="course-card-schedule">
                  {course.schedule.days.join('/')} &middot;{' '}
                  {course.schedule.start}–{course.schedule.end}
                </div>
                {course.prereqs.length > 0 && (
                  <div className={`course-card-prereqs ${!prereqsMet ? 'unmet' : ''}`}>
                    {prereqsMet
                      ? 'Prereqs met'
                      : `Prereqs: ${course.prereqs.map((p) => `${p}${priorCourseIds.has(p) ? ' \u2713' : ''}`).join(', ')}`}
                  </div>
                )}
                {conflictWith && !isSelected && (
                  <div className="course-card-prereqs unmet">
                    Conflicts with {conflictWith.id}
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </>
  );
}
