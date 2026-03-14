import { useMemo } from 'react';
import { motion } from 'framer-motion';

function getAcademicYear(semester) {
  const [session, yearStr] = semester.split(' ');
  const year = parseInt(yearStr);
  // Fall starts a new academic year; Spring/Summer belong to the prior fall's year
  if (session === 'Fall') return `${year}–${year + 1}`;
  return `${year - 1}–${year}`;
}

export default function ProgressView({ courses, selectedCourses, scheduleMap = {}, programData, userMajor, userMinor }) {
  const totalCredits = selectedCourses.reduce((sum, c) => sum + c.credits, 0);
  const selectedIds = selectedCourses.map((c) => c.id);

  // Find the user's program and minor from programData
  const program = useMemo(() => {
    if (!userMajor || !programData?.programs) return null;
    return programData.programs.find((p) => p.name === userMajor) || null;
  }, [programData, userMajor]);

  const minor = useMemo(() => {
    if (!userMinor || !programData?.available_minors) return null;
    return programData.available_minors.find((m) => m.name === userMinor) || null;
  }, [programData, userMinor]);

  // Use program's total credits as target if available, otherwise 120
  const targetCredits = program ? program.total_credits : 120;
  const creditPercent = Math.min(100, (totalCredits / targetCredits) * 100);

  // Program course completion stats
  const programProgress = useMemo(() => {
    if (!program) return null;
    const programCodes = new Set(program.all_courses.map((c) => c.code));
    const scheduledInProgram = selectedIds.filter((id) => programCodes.has(id));
    const scheduledCredits = program.all_courses
      .filter((c) => selectedIds.includes(c.code))
      .reduce((s, c) => s + c.credits, 0);
    const totalProgramCredits = program.all_courses.reduce((s, c) => s + c.credits, 0);
    return {
      total: programCodes.size,
      scheduled: scheduledInProgram.length,
      totalCredits: totalProgramCredits,
      scheduledCredits,
      percent: programCodes.size > 0 ? (scheduledInProgram.length / programCodes.size) * 100 : 0,
    };
  }, [program, selectedIds]);

  // Minor course completion stats
  const minorProgress = useMemo(() => {
    if (!minor) return null;
    const minorCodes = new Set(minor.all_courses.map((c) => c.code));
    const scheduledInMinor = selectedIds.filter((id) => minorCodes.has(id));
    const scheduledCredits = minor.all_courses
      .filter((c) => selectedIds.includes(c.code))
      .reduce((s, c) => s + c.credits, 0);
    const totalMinorCredits = minor.all_courses.reduce((s, c) => s + c.credits, 0);
    return {
      total: minorCodes.size,
      scheduled: scheduledInMinor.length,
      totalCredits: totalMinorCredits,
      scheduledCredits,
      percent: minorCodes.size > 0 ? (scheduledInMinor.length / minorCodes.size) * 100 : 0,
    };
  }, [minor, selectedIds]);

  // Per-year progress for the program
  const yearProgress = useMemo(() => {
    if (!program || !program.years) return [];
    return [...program.years].sort((a, b) => a.year - b.year).map((year) => {
      const yearCodes = year.courses.map((c) => c.code);
      const scheduled = yearCodes.filter((code) => selectedIds.includes(code));
      const scheduledCredits = year.courses
        .filter((c) => selectedIds.includes(c.code))
        .reduce((s, c) => s + c.credits, 0);
      return {
        label: year.label,
        year: year.year,
        total: yearCodes.length,
        scheduled: scheduled.length,
        totalCredits: year.credits,
        scheduledCredits,
        courses: year.courses,
      };
    });
  }, [program, selectedIds]);

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
  const academicYearBreakdown = useMemo(() => {
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

      {/* ─── Overall Stats ─── */}
      <div className="progress-overview">
        <motion.div className="progress-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <div className="progress-card-label">Credits Enrolled</div>
          <div className="progress-card-value accent">{totalCredits}<span className="program-stat-total">/{targetCredits}</span></div>
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

      {/* ─── Program Progress ─── */}
      {programProgress && (
        <>
          <h3 className="progress-section-heading">Program: {program.name}</h3>
          <div className="progress-overview">
            <motion.div className="progress-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <div className="progress-card-label">Program Courses</div>
              <div className="progress-card-value accent">{programProgress.scheduled}<span className="program-stat-total">/{programProgress.total}</span></div>
              <div className="progress-bar-container">
                <div className="progress-bar-fill" style={{ width: `${programProgress.percent}%` }} />
              </div>
            </motion.div>
            <motion.div className="progress-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              <div className="progress-card-label">Program Credits</div>
              <div className="progress-card-value">{programProgress.scheduledCredits}<span className="program-stat-total">/{programProgress.totalCredits}</span></div>
              <div className="progress-bar-container">
                <div className="progress-bar-fill" style={{ width: `${programProgress.totalCredits > 0 ? (programProgress.scheduledCredits / programProgress.totalCredits) * 100 : 0}%` }} />
              </div>
            </motion.div>
          </div>

          {/* Per-year program progress */}
          {yearProgress.length > 0 && (
            <div className="program-year-progress-grid">
              {yearProgress.map((yr, i) => (
                <motion.div
                  key={yr.year}
                  className="program-year-progress-card"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * i }}
                >
                  <div className="program-year-progress-header">
                    <h4>{yr.label}</h4>
                    <span className="program-year-progress-stats">
                      {yr.scheduled}/{yr.total} courses &middot; {yr.scheduledCredits}/{yr.totalCredits} cr
                    </span>
                  </div>
                  <div className="progress-bar-container">
                    <div className="progress-bar-fill" style={{ width: `${yr.total > 0 ? (yr.scheduled / yr.total) * 100 : 0}%` }} />
                  </div>
                  <div className="dept-courses">
                    {yr.courses.map((c) => (
                      <span
                        key={c.code}
                        className={`dept-course-chip ${selectedIds.includes(c.code) ? 'enrolled' : ''}`}
                      >
                        {c.code}
                      </span>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ─── Minor Progress ─── */}
      {minorProgress && (
        <>
          <h3 className="progress-section-heading">Minor: {minor.name}</h3>
          <div className="progress-overview">
            <motion.div className="progress-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <div className="progress-card-label">Minor Courses</div>
              <div className="progress-card-value accent">{minorProgress.scheduled}<span className="program-stat-total">/{minorProgress.total}</span></div>
              <div className="progress-bar-container">
                <div className="progress-bar-fill" style={{ width: `${minorProgress.percent}%` }} />
              </div>
            </motion.div>
            <motion.div className="progress-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              <div className="progress-card-label">Minor Credits</div>
              <div className="progress-card-value">{minorProgress.scheduledCredits}<span className="program-stat-total">/{minorProgress.totalCredits}</span></div>
              <div className="progress-bar-container">
                <div className="progress-bar-fill" style={{ width: `${minorProgress.totalCredits > 0 ? (minorProgress.scheduledCredits / minorProgress.totalCredits) * 100 : 0}%` }} />
              </div>
            </motion.div>
          </div>
          <div className="minor-course-chips">
            {minor.all_courses.map((c) => (
              <span
                key={c.code}
                className={`dept-course-chip ${selectedIds.includes(c.code) ? 'enrolled' : ''}`}
              >
                {c.code}
              </span>
            ))}
          </div>
        </>
      )}

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
      {academicYearBreakdown.length > 0 && (
        <>
          <h3 className="progress-section-heading">By Academic Year</h3>
          <div className="year-progress">
            {academicYearBreakdown.map((yr, i) => {
              const ayPercent = Math.min(100, (yr.credits / 30) * 100); // ~30 credits per year target
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
                    <div className="progress-bar-fill" style={{ width: `${ayPercent}%` }} />
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
