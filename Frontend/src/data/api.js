/**
 * API service layer — all backend calls go through here.
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

function getToken() {
  return localStorage.getItem('courseforge_token');
}

async function authFetch(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Request failed (${res.status})`);
  }
  return res.json();
}

// ─── Auth ───

export async function registerUser({ name, email, major, minor }) {
  return authFetch('/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, major, minor }),
  });
}

export async function loginUser(email) {
  return authFetch('/login', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function getCurrentUser() {
  return authFetch('/me');
}

// ─── Courses ───

export async function fetchCourses() {
  try {
    return await authFetch('/courses');
  } catch {
    // Fallback to local data if backend is unavailable
    const { CATALOG } = await import('./courses.js');
    return CATALOG;
  }
}

export async function fetchCareerPaths() {
  try {
    return await authFetch('/career-paths');
  } catch {
    const { CAREER_PATHS } = await import('./courses.js');
    return CAREER_PATHS;
  }
}

// ─── AI Advisor ───

export async function getAIRecommendation(prompt, currentCourses = [], major = null, minor = null) {
  return authFetch('/ai/recommend', {
    method: 'POST',
    body: JSON.stringify({ prompt, currentCourses, major, minor }),
  });
}

// ─── Schedule persistence ───
// scheduleMap: { "Fall 2026": ["CS101", ...], "Spring 2027": [...] }

export async function saveSchedule(scheduleMap) {
  try {
    return await authFetch('/schedule', {
      method: 'POST',
      body: JSON.stringify({ schedule: scheduleMap }),
    });
  } catch {
    // Fallback: persist in localStorage
    localStorage.setItem('courseforge_schedule', JSON.stringify(scheduleMap));
    return { success: true };
  }
}

export async function loadSchedule() {
  try {
    return await authFetch('/schedule');
  } catch {
    // Fallback: load from localStorage
    const saved = localStorage.getItem('courseforge_schedule');
    if (saved) {
      return { schedule: JSON.parse(saved) };
    }
    return { schedule: {} };
  }
}
