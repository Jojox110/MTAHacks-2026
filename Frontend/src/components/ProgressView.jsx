import { useMemo } from 'react';
import { motion } from 'framer-motion';

function getAcademicYear(semester) {
  const [session, yearStr] = semester.split(' ');
  const year = parseInt(yearStr);
  // Fall starts a new academic year; Spring/Summer belong to the prior fall's year
  if (session === 'Fall') return `${year}–${year + 1}`;
  return `${year - 1}–${year}`;
}

export default function ProgressView({ courses, selectedCourses, scheduleMap = {} }) {
  const totalCredits = selectedCourses.reduce((sum, c) => sum + c.credits, 0);
  const selectedIds = selectedCourses.map((c) => c.id);

  const targetCredits = 120;
  const creditPercent = Math.min(100, (totalCredits / targetCredits) * 100);

  // Group by department (derived from course data, not static list)
  const deptProgress = useMemo(() => {
    const deptMap = {};
    for (const c of courses) {
      if (!deptMap[c.dept]) deptMap[c.dept] = { dept: c.dept, total: 0, enrolled: 0, courses: [] };
      deptMap[c.dept].total++;
      deptMap[c.dept].courses.push(c);
      if (selectedIds.includes(c.id)) deptMap[c.dept].enrolled++;
    }
    return Object.values(deptMap)
      .filter((d) => d.enrolled > 0)
      .sort((a, b) => b.enrolled - a.enrolled);
  }, [courses, selectedIds]);

  // Group by semester
  const semesterBreakdown = useMemo(() => {
    return Object.entries(scheduleMap)
      .filter(([, ids]) => ids.length > 0)
      .map(([semester, ids]) => {
        const semCourses = ids.map((id) => courses.find((c) => c.id === id)).filter(Boolean);
        const credits = semCourses.reduce((sum, c) => sum + c.credits, 0);
        return { semester, courses: semCourses, credits };
      })
      .sort((a, b) => {
        const order = ['Fall', 'Spring', 'Summer'];
        const [sA, yA] = a.semester.split(' ');
        const [sB, yB] = b.semester.split(' ');
        return (+yA - +yB) || (order.indexOf(sA) - order.indexOf(sB));
      });
  }, [scheduleMap, courses]);

  // Group by academic year
  const yearBreakdown = useMemo(() => {
    const yearMap = {};
    for (const sem of semesterBreakdown) {
      const ay = getAcademicYear(sem.semester);
      if (!yearMap[ay]) yearMap[ay] = { year: ay, semesters: [], credits: 0, courseCount: 0 };
      yearMap[ay].semesters.push(sem);
      yearMap[ay].credits += sem.credits;
      yearMap[ay].courseCount += sem.courses.length;
    }
    return Object.values(yearMap);
  }, [semesterBreakdown]);

  return (
    <div className="progress-view">
      <h2>Degree Progress</h2>

      <div className="progress-overview">
        <motion.div className="progress-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <div className="progress-card-label">Credits Enrolled</div>
          <div className="progress-card-value accent">{totalCredits}</div>
          <div className="progress-bar-container">
            <div className="progress-bar-fill" style={{ width: `${creditPercent}%` }} />
          </div>
        </motion.div>

        <motion.div className="progress-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="progress-card-label">Credits Remaining</div>
          <div className="progress-card-value">{Math.max(0, targetCredits - totalCredits)}</div>
          <div className="progress-bar-container">
            <div className="progress-bar-fill success" style={{ width: `${100 - creditPercent}%` }} />
          </div>
        </motion.div>

        <motion.div className="progress-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <div className="progress-card-label">Courses Selected</div>
          <div className="progress-card-value">{selectedCourses.length}</div>
        </motion.div>

        <motion.div className="progress-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="progress-card-label">Departments Covered</div>
          <div className="progress-card-value">{deptProgress.filter((d) => d.enrolled > 0).length}</div>
        </motion.div>
      </div>

      {/* ─── By Semester ─── */}
      {semesterBreakdown.length > 0 && (
        <>
          <h3 className="progress-section-heading">By Semester</h3>
          <div className="semester-progress">
            {semesterBreakdown.map((sem, i) => (
              <motion.div
                key={sem.semester}
                className="semester-card"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * i }}
              >
                <div className="semester-card-header">
                  <h4>{sem.semester}</h4>
                  <span className="semester-card-stats">
                    {sem.courses.length} course{sem.courses.length !== 1 ? 's' : ''} &middot; {sem.credits} cr
                  </span>
                </div>
                <div className="dept-courses">
                  {sem.courses.map((c) => (
                    <span key={c.id} className="dept-course-chip enrolled">{c.id}</span>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </>
      )}

      {/* ─── By Year ─── */}
      {yearBreakdown.length > 0 && (
        <>
          <h3 className="progress-section-heading">By Academic Year</h3>
          <div className="year-progress">
            {yearBreakdown.map((yr, i) => {
              const yearPercent = Math.min(100, (yr.credits / 30) * 100); // ~30 credits per year target
              return (
                <motion.div
                  key={yr.year}
                  className="year-card"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * i }}
                >
                  <div className="year-card-header">
                    <h4>{yr.year}</h4>
                    <span className="year-card-stats">{yr.credits} credits</span>
                  </div>
                  <div className="progress-bar-container">
                    <div className="progress-bar-fill" style={{ width: `${yearPercent}%` }} />
                  </div>
                  <div className="year-semesters">
                    {yr.semesters.map((sem) => (
                      <div key={sem.semester} className="year-semester-row">
                        <span className="year-semester-label">{sem.semester}</span>
                        <span className="year-semester-detail">
                          {sem.courses.length} course{sem.courses.length !== 1 ? 's' : ''} &middot; {sem.credits} cr
                        </span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </>
      )}

      {/* ─── By Department ─── */}
      <h3 className="progress-section-heading">By Department</h3>
      <div className="dept-progress">
        {deptProgress.map((d, i) => (
          <motion.div
            key={d.dept}
            className="dept-card"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * i }}
          >
            <div className="dept-card-header">
              <h4>{d.dept}</h4>
              <span>{d.enrolled}/{d.total}</span>
            </div>
            <div className="progress-bar-container">
              <div
                className="progress-bar-fill"
                style={{ width: `${d.total > 0 ? (d.enrolled / d.total) * 100 : 0}%` }}
              />
            </div>
            <div className="dept-courses">
              {d.courses.map((c) => (
                <span
                  key={c.id}
                  className={`dept-course-chip ${selectedIds.includes(c.id) ? 'enrolled' : ''}`}
                >
                  {c.id}
                </span>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
