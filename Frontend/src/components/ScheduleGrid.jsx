import React from 'react';
import { motion } from 'framer-motion';
import { DAYS, TIME_SLOTS, getTimeSpan } from '../data/courses';

export default function ScheduleGrid({ selectedCourses, onRemoveCourse }) {
  const totalCredits = selectedCourses.reduce((sum, c) => sum + c.credits, 0);

  // Build time rows (8 AM to 7 PM = 22 half-hour slots)
  const timeLabels = TIME_SLOTS;

  return (
    <div className="schedule-view">
      <div className="schedule-header">
        <h2>Your Schedule</h2>
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
        <div className="schedule-grid">
          {/* Header row */}
          <div className="grid-corner" />
          {DAYS.map((day) => (
            <div key={day} className="grid-day-header">{day}</div>
          ))}

          {/* Time rows */}
          {timeLabels.map((time, i) => {
            const isHour = !time.includes(':30');
            return (
              <React.Fragment key={time}>
                <div className={`grid-time-label ${isHour ? 'hour' : ''}`}>
                  {isHour ? time : ''}
                </div>
                {DAYS.map((day) => (
                  <div key={`${day}-${time}`} className={`grid-cell ${isHour ? 'hour' : ''}`}>
                    {/* Course blocks are rendered on the first cell of their time span */}
                    {selectedCourses
                      .filter(
                        (c) =>
                          c.schedule.days.includes(day) &&
                          c.schedule.start === time
                      )
                      .map((course) => {
                        const span = getTimeSpan(course.schedule.start, course.schedule.end);
                        const height = span * 32;
                        return (
                          <motion.div
                            key={course.id}
                            className="schedule-block"
                            style={{
                              height: `${height - 4}px`,
                              background: `${course.color}22`,
                              borderColor: `${course.color}44`,
                              color: course.color,
                            }}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                            onClick={() => onRemoveCourse(course)}
                            title={`Click to remove ${course.id}`}
                          >
                            <div className="schedule-block-id">{course.id}</div>
                            {height > 50 && (
                              <div className="schedule-block-name">{course.name}</div>
                            )}
                            {height > 70 && (
                              <div className="schedule-block-time">
                                {course.schedule.start}–{course.schedule.end}
                              </div>
                            )}
                          </motion.div>
                        );
                      })}
                  </div>
                ))}
              </React.Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
}
