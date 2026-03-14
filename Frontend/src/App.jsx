import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import './App.css';

import AIAdvisor from './components/AIAdvisor';
import CourseCatalog from './components/CourseCatalog';
import ScheduleGrid from './components/ScheduleGrid';
import ProgressView from './components/ProgressView';
import { fetchCourses } from './data/api';
import { hasConflict } from './data/courses';

function App() {
  const [courses, setCourses] = useState([]);
  const [selectedCourses, setSelectedCourses] = useState([]);
  const [activeTab, setActiveTab] = useState('schedule');

  // Load course catalog from API
  useEffect(() => {
    fetchCourses().then(setCourses);
  }, []);

  const selectedIds = selectedCourses.map((c) => c.id);

  const toggleCourse = useCallback(
    (course) => {
      setSelectedCourses((prev) => {
        const exists = prev.find((c) => c.id === course.id);
        if (exists) {
          return prev.filter((c) => c.id !== course.id);
        }
        // Check for conflicts before adding
        const conflict = hasConflict(course, prev);
        if (conflict) return prev;
        return [...prev, course];
      });
    },
    []
  );

  const addCourse = useCallback(
    (course) => {
      setSelectedCourses((prev) => {
        if (prev.find((c) => c.id === course.id)) return prev;
        const conflict = hasConflict(course, prev);
        if (conflict) return prev;
        return [...prev, course];
      });
    },
    []
  );

  const removeCourse = useCallback((course) => {
    setSelectedCourses((prev) => prev.filter((c) => c.id !== course.id));
  }, []);

  return (
    <div className="app">
      {/* Background effects */}
      <div className="bg-noise" />
      <div className="bg-gradient" />

      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo">
            <h1>
              Course<span className="logo-accent">Forge</span>
            </h1>
            <span className="logo-tag">2026</span>
          </div>
        </div>

        <div className="sidebar-content">
          <AIAdvisor
            courses={courses}
            selectedIds={selectedIds}
            onSelectCourse={addCourse}
          />
          <CourseCatalog
            courses={courses}
            selectedCourses={selectedCourses}
            onToggleCourse={toggleCourse}
          />
        </div>

        {/* Selected courses summary */}
        {selectedCourses.length > 0 && (
          <motion.div
            className="selected-summary"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h4>Selected ({selectedCourses.length})</h4>
            <div>
              {selectedCourses.map((c) => (
                <span key={c.id} className="selected-chip">
                  {c.id}
                  <button onClick={() => removeCourse(c)}>&times;</button>
                </span>
              ))}
            </div>
            <div className="selected-total">
              <span>Total Credits</span>
              <strong>
                {selectedCourses.reduce((sum, c) => sum + c.credits, 0)}
              </strong>
            </div>
          </motion.div>
        )}
      </aside>

      {/* Main content */}
      <main className="main">
        <nav className="nav-tabs">
          <button
            className={`nav-tab ${activeTab === 'schedule' ? 'active' : ''}`}
            onClick={() => setActiveTab('schedule')}
          >
            Schedule
            {selectedCourses.length > 0 && (
              <span className="badge">{selectedCourses.length}</span>
            )}
          </button>
          <button
            className={`nav-tab ${activeTab === 'progress' ? 'active' : ''}`}
            onClick={() => setActiveTab('progress')}
          >
            Progress
          </button>
        </nav>

        {activeTab === 'schedule' && (
          <ScheduleGrid
            selectedCourses={selectedCourses}
            onRemoveCourse={removeCourse}
          />
        )}
        {activeTab === 'progress' && (
          <ProgressView
            courses={courses}
            selectedCourses={selectedCourses}
          />
        )}
      </main>
    </div>
  );
}

export default App;
