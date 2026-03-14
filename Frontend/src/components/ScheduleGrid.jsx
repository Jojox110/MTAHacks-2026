import { motion, AnimatePresence } from 'framer-motion';

export default function ScheduleGrid({ selectedCourses, onRemoveCourse }) {
  const totalCredits = selectedCourses.reduce((sum, c) => sum + c.credits, 0);

  // Group by department
  const byDept = {};
  for (const c of selectedCourses) {
    if (!byDept[c.dept]) byDept[c.dept] = [];
    byDept[c.dept].push(c);
  }
  const deptEntries = Object.entries(byDept).sort((a, b) => a[0].localeCompare(b[0]));

  return (
    <div className="schedule-view">
      <div className="schedule-header">
        <h2>Semester Courses</h2>
        <div className="schedule-stats">
          <div className="stat">
            <div className="stat-value accent">{selectedCourses.length}</div>
            <div className="stat-label">Courses</div>
          </div>
          <div className="stat">
            <div className="stat-value">{totalCredits}</div>
            <div className="stat-label">Credits</div>
          </div>
        </div>
      </div>

      {selectedCourses.length === 0 ? (
        <div className="empty-schedule">
          <div className="empty-schedule-icon">&#9634;</div>
          <h3>No courses yet</h3>
          <p>
            Select courses from the catalog or use the AI advisor to get
            personalized recommendations.
          </p>
        </div>
      ) : (
        <div className="semester-course-list">
          <AnimatePresence mode="popLayout">
            {deptEntries.map(([dept, courses]) => (
              <motion.div
                key={dept}
                className="semester-dept-group"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <div className="semester-dept-label">{dept}</div>
                {courses.map((course) => (
                  <motion.div
                    key={course.id}
                    className="semester-course-item"
                    style={{ borderLeftColor: course.color }}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 8 }}
                    transition={{ duration: 0.15 }}
                    title={course.description || course.name}
                  >
                    <div className="semester-course-main">
                      <div className="semester-course-top">
                        <span className="semester-course-id" style={{ color: course.color }}>{course.id}</span>
                        <span className="semester-course-credits">{course.credits} cr</span>
                      </div>
                      <div className="semester-course-name">{course.name}</div>
                      {course.prereqs && course.prereqs.length > 0 && (
                        <div className="semester-course-prereqs">
                          Prereqs: {course.prereqs.join(', ')}
                        </div>
                      )}
                    </div>
                    <button
                      className="semester-course-remove"
                      onClick={() => onRemoveCourse(course)}
                      title={`Remove ${course.id}`}
                    >
                      &times;
                    </button>
                  </motion.div>
                ))}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
