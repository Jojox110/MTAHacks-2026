import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DEPT_NAMES } from '../data/courses';

export default function CourseCatalog({ courses, selectedCourses, onToggleCourse, userMajor, userMinor, priorCourseIds = new Set(), programData, allScheduledIds = new Set() }) {
  const [dept, setDept] = useState('All');
  const [ofgFilter, setOfgFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [showCompleted, setShowCompleted] = useState(false);
  const [needFilter, setNeedFilter] = useState('All');

  const selectedIds = selectedCourses.map((c) => c.id);

  // Build set of courses needed for program/minor that aren't yet scheduled
  const programCourseIds = useMemo(() => {
    if (!programData) return new Set();
    const ids = new Set();
    if (userMajor) {
      const prog = programData.programs?.find((p) => p.name === userMajor);
      if (prog) {
        prog.all_courses.forEach((c) => ids.add(c.code));
        // Include OFG courses
        for (const ofg of (prog.ofg_requirements?.open || [])) {
          courses.filter((c) => c.ofg && c.ofg.split(',').map((t) => t.trim()).includes(ofg.ofg))
            .forEach((c) => ids.add(c.id));
        }
      }
    }
    if (userMinor) {
      const min = programData.available_minors?.find((m) => m.name === userMinor);
      if (min) min.all_courses.forEach((c) => ids.add(c.code));
    }
    return ids;
  }, [programData, userMajor, userMinor, courses]);

  // Find option courses in fulfilled groups (no longer needed)
  const fulfilledOptionCodes = useMemo(() => {
    const fulfilled = new Set();
    if (!programData) return fulfilled;
    const prog = userMajor ? programData.programs?.find((p) => p.name === userMajor) : null;
    if (!prog) return fulfilled;
    for (const y of (prog.years || [])) {
      for (const og of (y.option_groups || [])) {
        const groupCourses = y.courses.filter((c) => c.option_group === og.id);
        const scheduledCr = groupCourses
          .filter((c) => allScheduledIds.has(c.code))
          .reduce((s, c) => s + c.credits, 0);
        if (scheduledCr >= og.credits_required) {
          for (const c of groupCourses) {
            if (!allScheduledIds.has(c.code)) fulfilled.add(c.code);
          }
        }
      }
    }
    return fulfilled;
  }, [programData, userMajor, allScheduledIds]);

  // Open OFG courses needed (1 per OFG, exclude fulfilled OFGs)
  const neededOfgIds = useMemo(() => {
    const needed = new Set();
    if (!programData || !userMajor) return needed;
    const prog = programData.programs?.find((p) => p.name === userMajor);
    if (!prog || !prog.ofg_requirements?.open) return needed;
    for (const ofg of prog.ofg_requirements.open) {
      const ofgCourses = courses.filter((c) => c.ofg && c.ofg.split(',').map((t) => t.trim()).includes(ofg.ofg));
      const alreadyHasOne = ofgCourses.some((c) => allScheduledIds.has(c.id));
      if (!alreadyHasOne) {
        // Add all courses for this OFG as potential options
        ofgCourses.forEach((c) => needed.add(c.id));
      }
    }
    return needed;
  }, [programData, userMajor, courses, allScheduledIds]);

  const neededCourseIds = useMemo(() => {
    const needed = new Set();
    for (const id of programCourseIds) {
      if (!allScheduledIds.has(id) && !fulfilledOptionCodes.has(id)) needed.add(id);
    }
    // Add unfulfilled OFG courses
    for (const id of neededOfgIds) {
      needed.add(id);
    }
    return needed;
  }, [programCourseIds, allScheduledIds, fulfilledOptionCodes, neededOfgIds]);

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
      if (needFilter === 'needed' && !neededCourseIds.has(c.id)) return false;
      if (needFilter === 'program' && !programCourseIds.has(c.id)) return false;
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
  }, [courses, dept, ofgFilter, search, priorCourseIds, showCompleted, needFilter, neededCourseIds, programCourseIds]);

  function getTooltip(course, isSelected, isCompleted, prereqsMet, missingPrereqs) {
    if (isSelected) return `Click to remove ${course.id} from this semester`;
    if (isCompleted && showCompleted) return `Already completed in a prior semester. Click to retake.`;
    if (!prereqsMet) return `Missing prerequisites: ${missingPrereqs.join(', ')}. Complete them in an earlier semester first.`;
    const desc = course.description ? `\n${course.description.slice(0, 120)}...` : '';
    return `Click to add ${course.id} – ${course.name} (${course.credits} cr)${desc}`;
  }

  return (
    <>
      {programCourseIds.size > 0 && (
        <div className="filter-section">
          <label>Progress</label>
          <select value={needFilter} onChange={(e) => setNeedFilter(e.target.value)}>
            <option value="All">All courses</option>
            <option value="needed">Needed — not yet scheduled ({neededCourseIds.size})</option>
            <option value="program">All program/minor courses ({programCourseIds.size})</option>
          </select>
        </div>
      )}

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

            // prereqs is [["A","B"], ["C"]] meaning (A or B) AND C
            const prereqsMet = course.prereqs.length === 0 || course.prereqs.every((group) =>
              Array.isArray(group) ? group.some((p) => priorCourseIds.has(p)) : priorCourseIds.has(group)
            );
            const missingPrereqs = course.prereqs
              .filter((group) => Array.isArray(group) ? !group.some((p) => priorCourseIds.has(p)) : !priorCourseIds.has(group))
              .map((group) => Array.isArray(group) ? group.join(' / ') : group);

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
                      : `Prereqs: ${missingPrereqs.join(' + ')}`}
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
