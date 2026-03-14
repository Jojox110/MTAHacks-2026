import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import './App.css';

import LoginScreen from './components/LoginScreen';
import AIAdvisor from './components/AIAdvisor';
import CourseCatalog from './components/CourseCatalog';
import ScheduleGrid from './components/ScheduleGrid';
import ProgressView from './components/ProgressView';
import ProgramView from './components/ProgramView';
import { fetchCourses, fetchPrograms, updateProfile, getCurrentUser, saveSchedule, loadSchedule } from './data/api';

const SESSIONS = ['Fall', 'Spring', 'Summer'];
const START_YEAR = 2026;
const NUM_YEARS = 4;

function buildSemesters() {
  const semesters = [];
  for (let y = START_YEAR; y < START_YEAR + NUM_YEARS; y++) {
    for (const s of SESSIONS) {
      semesters.push(`${s} ${y}`);
    }
  }
  return semesters;
}

const ALL_SEMESTERS = buildSemesters();

function App() {
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [courses, setCourses] = useState([]);
  const [scheduleMap, setScheduleMap] = useState({}); // { "Fall 2026": ["CS101", ...] }
  const [activeSemester, setActiveSemester] = useState(ALL_SEMESTERS[0]);
  const [activeTab, setActiveTab] = useState('schedule');
  const [programData, setProgramData] = useState(null);

  // Derive selected courses for the active semester
  const selectedCourses = useMemo(() => {
    const ids = scheduleMap[activeSemester] || [];
    return ids.map((id) => courses.find((c) => c.id === id)).filter(Boolean);
  }, [scheduleMap, activeSemester, courses]);

  // All courses across all semesters (for progress)
  const allSelectedCourses = useMemo(() => {
    const allIds = [...new Set(Object.values(scheduleMap).flat())];
    return allIds.map((id) => courses.find((c) => c.id === id)).filter(Boolean);
  }, [scheduleMap, courses]);

  // Course IDs from semesters BEFORE the active one (completed prereqs)
  const priorCourseIds = useMemo(() => {
    const activeIdx = ALL_SEMESTERS.indexOf(activeSemester);
    const ids = new Set();
    for (let i = 0; i < activeIdx; i++) {
      const sem = ALL_SEMESTERS[i];
      for (const id of (scheduleMap[sem] || [])) {
        ids.add(id);
      }
    }
    return ids;
  }, [scheduleMap, activeSemester]);

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

  // Load course catalog and program data
  useEffect(() => {
    fetchCourses().then(setCourses);
    fetchPrograms().then(setProgramData);
  }, []);

  // Load saved schedule when user logs in
  useEffect(() => {
    if (!user || courses.length === 0) return;
    loadSchedule().then((data) => {
      if (data.schedule) {
        setScheduleMap(data.schedule);
      } else if (data.courseIds && data.courseIds.length > 0) {
        // Backwards compat: old format had flat courseIds
        setScheduleMap({ [ALL_SEMESTERS[0]]: data.courseIds });
      }
    }).catch(() => {});
  }, [user, courses]);

  // Auto-save schedule when it changes
  useEffect(() => {
    if (!user) return;
    const hasAnyCourses = Object.values(scheduleMap).some((ids) => ids.length > 0);
    if (!hasAnyCourses) return;
    saveSchedule(scheduleMap).catch(() => {});
  }, [user, scheduleMap]);

  const selectedIds = selectedCourses.map((c) => c.id);

  const updateSemesterCourses = useCallback((updater) => {
    setScheduleMap((prev) => {
      const currentIds = prev[activeSemester] || [];
      const newIds = updater(currentIds);
      if (newIds === currentIds) return prev;
      return { ...prev, [activeSemester]: newIds };
    });
  }, [activeSemester]);

  const toggleCourse = useCallback(
    (course) => {
      updateSemesterCourses((ids) => {
        if (ids.includes(course.id)) {
          return ids.filter((id) => id !== course.id);
        }
        return [...ids, course.id];
      });
    },
    [updateSemesterCourses]
  );

  const addCourse = useCallback(
    (course) => {
      updateSemesterCourses((ids) => {
        if (ids.includes(course.id)) return ids;
        return [...ids, course.id];
      });
    },
    [updateSemesterCourses]
  );

  const removeCourse = useCallback((course) => {
    updateSemesterCourses((ids) => ids.filter((id) => id !== course.id));
  }, [updateSemesterCourses]);

  const handleUpdateProfile = useCallback(async (major, minor) => {
    try {
      const updated = await updateProfile({ major, minor });
      setUser(updated);
    } catch {
      // ignore
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('courseforge_token');
    setUser(null);
    setScheduleMap({});
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
            <div className="user-info-left">
              <span className="user-name">{user.name}</span>
              {user.major && <span className="user-program">{user.major}</span>}
            </div>
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
            userMinor={user.minor}
            priorCourseIds={priorCourseIds}
            programData={programData}
            allScheduledIds={new Set(Object.values(scheduleMap).flat())}
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
            className={`nav-tab ${activeTab === 'program' ? 'active' : ''}`}
            onClick={() => setActiveTab('program')}
          >
            Program
          </button>
          <button
            className={`nav-tab ${activeTab === 'progress' ? 'active' : ''}`}
            onClick={() => setActiveTab('progress')}
          >
            Progress
          </button>

          <div className="semester-picker">
            <select
              value={activeSemester}
              onChange={(e) => setActiveSemester(e.target.value)}
            >
              {ALL_SEMESTERS.map((sem) => {
                const count = (scheduleMap[sem] || []).length;
                return (
                  <option key={sem} value={sem}>
                    {sem}{count > 0 ? ` (${count})` : ''}
                  </option>
                );
              })}
            </select>
          </div>
        </nav>

        {activeTab === 'schedule' && (
          <ScheduleGrid
            selectedCourses={selectedCourses}
            onRemoveCourse={removeCourse}
          />
        )}
        {activeTab === 'program' && (
          <ProgramView
            programData={programData}
            courses={courses}
            userMajor={user.major}
            userMinor={user.minor}
            scheduleMap={scheduleMap}
            onUpdateProfile={handleUpdateProfile}
          />
        )}
        {activeTab === 'progress' && (
          <ProgressView
            courses={courses}
            selectedCourses={allSelectedCourses}
            scheduleMap={scheduleMap}
            programData={programData}
            userMajor={user.major}
            userMinor={user.minor}
          />
        )}
      </main>
    </div>
  );
}

export default App;
