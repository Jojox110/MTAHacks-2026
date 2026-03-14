import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DEPARTMENTS } from '../data/courses';
import { hasConflict } from '../data/courses';

export default function CourseCatalog({ courses, selectedCourses, onToggleCourse }) {
  const [dept, setDept] = useState('All');
  const [search, setSearch] = useState('');

  const selectedIds = selectedCourses.map((c) => c.id);

  const filtered = useMemo(() => {
    return courses.filter((c) => {
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
  }, [courses, dept, search]);

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

      <div className="course-list">
        <AnimatePresence mode="popLayout">
          {filtered.map((course) => {
            const isSelected = selectedIds.includes(course.id);
            const conflictWith = !isSelected
              ? hasConflict(course, selectedCourses)
              : null;

            const prereqsMet = course.prereqs.every((p) => selectedIds.includes(p));

            return (
              <motion.div
                key={course.id}
                className={`course-card ${isSelected ? 'selected' : ''} ${conflictWith ? 'conflict' : ''}`}
                onClick={() => {
                  if (!conflictWith || isSelected) onToggleCourse(course);
                }}
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
                  <span className="course-card-credits">{course.credits} cr</span>
                </div>
                <div className="course-card-name">{course.name}</div>
                <div className="course-card-schedule">
                  {course.schedule.days.join('/')} &middot;{' '}
                  {course.schedule.start}–{course.schedule.end}
                </div>
                {course.prereqs.length > 0 && (
                  <div className={`course-card-prereqs ${!prereqsMet ? 'unmet' : ''}`}>
                    {prereqsMet ? 'Prereqs met' : `Prereqs: ${course.prereqs.join(', ')}`}
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
