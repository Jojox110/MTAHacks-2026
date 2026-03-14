import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DEPT_NAMES } from '../data/courses';

export default function CourseCatalog({ courses, selectedCourses, onToggleCourse, userMajor, priorCourseIds = new Set() }) {
  const [dept, setDept] = useState(userMajor || 'All');
  const [ofgFilter, setOfgFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [showCompleted, setShowCompleted] = useState(false);

  const selectedIds = selectedCourses.map((c) => c.id);

  // Build department list from actual course data
  const departments = useMemo(() => {
    const depts = [...new Set(courses.map((c) => c.dept))].sort();
    return depts;
  }, [courses]);

  // Build OFG list from actual course data
  const ofgTypes = useMemo(() => {
    const tags = new Set();
    courses.forEach((c) => {
      if (c.ofg) c.ofg.split(',').forEach((t) => tags.add(t.trim()));
    });
    return [...tags].sort();
  }, [courses]);

  const filtered = useMemo(() => {
    return courses.filter((c) => {
      const isCompleted = priorCourseIds.has(c.id);
      if (isCompleted && !showCompleted) return false;
      if (dept !== 'All' && c.dept !== dept) return false;
      if (ofgFilter !== 'All') {
        if (!c.ofg) return false;
        if (!c.ofg.split(',').map((t) => t.trim()).includes(ofgFilter)) return false;
      }
      if (search) {
        const q = search.toLowerCase();
        const deptName = (DEPT_NAMES[c.dept] || '').toLowerCase();
        return (
          c.id.toLowerCase().includes(q) ||
          c.name.toLowerCase().includes(q) ||
          c.dept.toLowerCase().includes(q) ||
          deptName.includes(q) ||
          (c.description || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [courses, dept, ofgFilter, search, priorCourseIds, showCompleted]);

  function getTooltip(course, isSelected, isCompleted, prereqsMet, missingPrereqs) {
    if (isSelected) return `Click to remove ${course.id} from this semester`;
    if (isCompleted && showCompleted) return `Already completed in a prior semester. Click to retake.`;
    if (!prereqsMet) return `Missing prerequisites: ${missingPrereqs.join(', ')}. Complete them in an earlier semester first.`;
    const desc = course.description ? `\n${course.description.slice(0, 120)}...` : '';
    return `Click to add ${course.id} – ${course.name} (${course.credits} cr)${desc}`;
  }

  return (
    <>
      <div className="filter-section">
        <label>Department</label>
        <select value={dept} onChange={(e) => setDept(e.target.value)}>
          <option value="All">All Departments ({courses.length})</option>
          {departments.map((d) => (
            <option key={d} value={d}>{d} – {DEPT_NAMES[d] || d}</option>
          ))}
        </select>
      </div>

      <div className="filter-section">
        <label>OFG</label>
        <select value={ofgFilter} onChange={(e) => setOfgFilter(e.target.value)}>
          <option value="All">All OFG types</option>
          {ofgTypes.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      </div>

      <div className="filter-section">
        <label>Search</label>
        <input
          type="text"
          placeholder="Course ID, name, or keyword..."
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
          {filtered.slice(0, 100).map((course) => {
            const isCompleted = priorCourseIds.has(course.id);
            const isSelected = selectedIds.includes(course.id);

            const prereqsMet = course.prereqs.length === 0 || course.prereqs.every((p) => priorCourseIds.has(p));
            const missingPrereqs = course.prereqs.filter((p) => !priorCourseIds.has(p));

            const blocked = !isSelected && !isCompleted && !prereqsMet;
            const tooltip = getTooltip(course, isSelected, isCompleted, prereqsMet, missingPrereqs);

            return (
              <motion.div
                key={course.id}
                className={`course-card ${isSelected ? 'selected' : ''} ${isCompleted && !isSelected ? 'completed' : ''} ${blocked ? 'conflict' : ''}`}
                onClick={() => {
                  if (isSelected) return onToggleCourse(course);
                  if (blocked) return;
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
                  {course.ofg && (
                    <span className="course-card-ofg">{course.ofg}</span>
                  )}
                  <span className="course-card-credits">{course.credits} cr</span>
                </div>
                <div className="course-card-name">{course.name}</div>
                {course.prereqs.length > 0 && (
                  <div className={`course-card-prereqs ${!prereqsMet ? 'unmet' : ''}`}>
                    {prereqsMet
                      ? 'Prereqs met'
                      : `Prereqs: ${course.prereqs.map((p) => `${p}${priorCourseIds.has(p) ? ' \u2713' : ''}`).join(', ')}`}
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
        {filtered.length > 100 && (
          <div className="course-list-overflow">
            Showing 100 of {filtered.length} courses. Use search to narrow results.
          </div>
        )}
      </div>
    </>
  );
}
