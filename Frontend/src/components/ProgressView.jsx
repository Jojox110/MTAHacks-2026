import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { DEPARTMENTS } from '../data/courses';

export default function ProgressView({ courses, selectedCourses }) {
  const totalCredits = selectedCourses.reduce((sum, c) => sum + c.credits, 0);
  const selectedIds = selectedCourses.map((c) => c.id);

  // Typical graduation needs ~120 credits
  const targetCredits = 120;
  const creditPercent = Math.min(100, (totalCredits / targetCredits) * 100);

  // Group by department
  const deptProgress = useMemo(() => {
    return DEPARTMENTS.map((dept) => {
      const deptCourses = courses.filter((c) => c.dept === dept);
      const enrolled = deptCourses.filter((c) => selectedIds.includes(c.id));
      return {
        dept,
        total: deptCourses.length,
        enrolled: enrolled.length,
        courses: deptCourses,
      };
    }).filter((d) => d.total > 0);
  }, [courses, selectedIds]);

  return (
    <div className="progress-view">
      <h2>Degree Progress</h2>

      <div className="progress-overview">
        <motion.div
          className="progress-card"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <div className="progress-card-label">Credits Enrolled</div>
          <div className="progress-card-value accent">{totalCredits}</div>
          <div className="progress-bar-container">
            <div
              className="progress-bar-fill"
              style={{ width: `${creditPercent}%` }}
            />
          </div>
        </motion.div>

        <motion.div
          className="progress-card"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="progress-card-label">Credits Remaining</div>
          <div className="progress-card-value">
            {Math.max(0, targetCredits - totalCredits)}
          </div>
          <div className="progress-bar-container">
            <div
              className="progress-bar-fill success"
              style={{ width: `${100 - creditPercent}%` }}
            />
          </div>
        </motion.div>

        <motion.div
          className="progress-card"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <div className="progress-card-label">Courses Selected</div>
          <div className="progress-card-value">{selectedCourses.length}</div>
        </motion.div>

        <motion.div
          className="progress-card"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="progress-card-label">Departments Covered</div>
          <div className="progress-card-value">
            {deptProgress.filter((d) => d.enrolled > 0).length}
          </div>
        </motion.div>
      </div>

      <h3 style={{
        fontFamily: 'var(--font-display)',
        fontSize: '1.25rem',
        fontWeight: 400,
        marginBottom: '16px',
        color: 'var(--text-secondary)',
      }}>
        By Department
      </h3>

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
              <span>
                {d.enrolled}/{d.total}
              </span>
            </div>
            <div className="progress-bar-container">
              <div
                className="progress-bar-fill"
                style={{
                  width: `${d.total > 0 ? (d.enrolled / d.total) * 100 : 0}%`,
                }}
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
