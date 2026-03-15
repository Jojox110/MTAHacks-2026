/**
 * API service layer — all backend calls go through here.
 */

const API_BASE = import.meta.env.VITE_API_URL || '/api';

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

export async function updateProfile({ major, minor }) {
  return authFetch('/me', {
    method: 'PUT',
    body: JSON.stringify({ major, minor }),
  });
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

// ─── Programs & Minors ───

export async function fetchPrograms() {
  try {
    const res = await fetch('/programs.json');
    if (!res.ok) throw new Error('Failed to load programs');
    return res.json();
  } catch {
    return { programs: [], available_minors: [] };
  }
}

// ─── AI Advisor ───

export async function getAIRecommendation(prompt, currentCourses = [], major = null, minor = null) {
  return authFetch('/ai/recommend', {
    method: 'POST',
    body: JSON.stringify({ prompt, currentCourses, major, minor }),
  });
}

export async function chatWithAdvisor({ studentProfile, message, history = [], currentCourses = [], numToSelect = 2 }) {
  return authFetch('/ai/chat', {
    method: 'POST',
    body: JSON.stringify({ studentProfile, message, history, currentCourses, numToSelect }),
  });
}

// ─── Session schedule data (timetable) ───

const SESSION_FILES = {
  'Hiver 2026':         '/schedule_hiver_2026_moncton_fix.json',
  'Printemps-Été 2026': '/schedule_printemps_ete_2026_moncton_fix.json',
  'Automne 2026':       '/schedule_automne_2026_moncton_fix.json',
};

const sessionCache = {};

export async function fetchSessionSchedule(session) {
  if (sessionCache[session]) return sessionCache[session];
  const file = SESSION_FILES[session];
  if (!file) return [];
  try {
    const res = await fetch(file);
    if (!res.ok) throw new Error('Failed');
    const data = await res.json();
    sessionCache[session] = data;
    return data;
  } catch {
    return [];
  }
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

// ─── Schedule Optimizer (4-year plan) ───

export async function optimizeSchedule(program, userPrompt, minor = null, userChoices = null) {
  // Start the job
  const { job_id } = await authFetch('/schedule/optimize', {
    method: 'POST',
    body: JSON.stringify({
      program,
      userPrompt,
      minor: minor || undefined,
      userChoices: userChoices || undefined,
    }),
  });

  // Poll until done (LLM can take several minutes)
  while (true) {
    await new Promise((r) => setTimeout(r, 2000));
    const status = await authFetch(`/schedule/optimize/${job_id}`);
    if (status.status === 'done') return status;
    if (status.status === 'error') throw new Error(status.detail || 'Optimization failed');
    // status === 'pending' → keep polling
  }
}
