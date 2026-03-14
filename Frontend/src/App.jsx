import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import './App.css';

import LoginScreen from './components/LoginScreen';
import AIAdvisor from './components/AIAdvisor';
import CourseCatalog from './components/CourseCatalog';
import ScheduleGrid from './components/ScheduleGrid';
import ProgressView from './components/ProgressView';
import { fetchCourses, getCurrentUser, saveSchedule, loadSchedule } from './data/api';
import { hasConflict } from './data/courses';

function App() {
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [courses, setCourses] = useState([]);
  const [selectedCourses, setSelectedCourses] = useState([]);
  const [activeTab, setActiveTab] = useState('schedule');

  // Restore session from localStorage
  useEffect(() => {
    const token = localStorage.getItem('courseforge_token');
    if (token) {
      getCurrentUser()
        .then(setUser)
        .catch(() => localStorage.removeItem('courseforge_token'))
        .finally(() => setAuthChecked(true));
    } else {
      setAuthChecked(true);
    }
  }, []);

  // Load course catalog
  useEffect(() => {
    fetchCourses().then(setCourses);
  }, []);

  // Load saved schedule when user logs in
  useEffect(() => {
    if (!user || courses.length === 0) return;
    loadSchedule().then(({ courseIds }) => {
      if (courseIds.length > 0) {
        const saved = courseIds
          .map((id) => courses.find((c) => c.id === id))
          .filter(Boolean);
        setSelectedCourses(saved);
      }
    }).catch(() => {});
  }, [user, courses]);

  // Auto-save schedule when it changes
  useEffect(() => {
    if (!user || selectedCourses.length === 0) return;
    const ids = selectedCourses.map((c) => c.id);
    saveSchedule(ids).catch(() => {});
  }, [user, selectedCourses]);

  const selectedIds = selectedCourses.map((c) => c.id);

  const toggleCourse = useCallback(
    (course) => {
      setSelectedCourses((prev) => {
        const exists = prev.find((c) => c.id === course.id);
        if (exists) {
          return prev.filter((c) => c.id !== course.id);
        }
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

  const handleLogout = () => {
    localStorage.removeItem('courseforge_token');
    setUser(null);
    setSelectedCourses([]);
  };

  // Show nothing until auth check completes
  if (!authChecked) return null;

  // Show login screen if not authenticated
  if (!user) {
    return <LoginScreen onComplete={setUser} />;
  }

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
          <div className="user-info">
            <span className="user-name">{user.name}</span>
            <button className="logout-btn" onClick={handleLogout}>Log out</button>
          </div>
        </div>

        <div className="sidebar-content">
          <AIAdvisor
            courses={courses}
            selectedIds={selectedIds}
            onSelectCourse={addCourse}
            userMajor={user.major}
            userMinor={user.minor}
          />
          <CourseCatalog
            courses={courses}
            selectedCourses={selectedCourses}
            onToggleCourse={toggleCourse}
            userMajor={user.major}
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
