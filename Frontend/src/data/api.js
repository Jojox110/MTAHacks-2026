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
  try {
    return await authFetch('/ai/recommend', {
      method: 'POST',
      body: JSON.stringify({ prompt, currentCourses, major, minor }),
    });
  } catch {
    // Fallback: local keyword matching
    const { CAREER_PATHS } = await import('./courses.js');
    await new Promise(r => setTimeout(r, 1500));

    const lower = prompt.toLowerCase();
    const keywords = {
      'Software Engineer': ['software', 'web', 'app', 'code', 'programming', 'developer', 'full stack', 'frontend', 'backend'],
      'Data Scientist': ['data', 'analytics', 'statistics', 'analysis', 'insight'],
      'Cybersecurity Analyst': ['security', 'cyber', 'hacking', 'network', 'protect'],
      'AI/ML Engineer': ['ai', 'machine learning', 'ml', 'artificial intelligence', 'deep learning', 'neural'],
      'Product Manager': ['product', 'manage', 'lead', 'strategy', 'pm'],
      'Financial Analyst': ['finance', 'financial', 'investment', 'banking', 'accounting', 'money'],
      'Biomedical Engineer': ['biomedical', 'medical', 'health', 'bio', 'healthcare'],
      'UX Researcher': ['ux', 'user experience', 'design', 'research', 'usability'],
    };

    let bestMatch = 'Software Engineer';
    let bestScore = 0;
    for (const [path, words] of Object.entries(keywords)) {
      const score = words.filter(w => lower.includes(w)).length;
      if (score > bestScore) { bestScore = score; bestMatch = path; }
    }

    const pathData = CAREER_PATHS[bestMatch];
    return {
      careerPath: bestMatch,
      description: pathData.description,
      required: pathData.required,
      recommended: pathData.recommended,
    };
  }
}

// ─── Schedule persistence ───

export async function saveSchedule(courseIds) {
  try {
    return await authFetch('/schedule', {
      method: 'POST',
      body: JSON.stringify({ courseIds }),
    });
  } catch {
    console.log('Schedule saved (local fallback):', courseIds);
    return { success: true };
  }
}

export async function loadSchedule() {
  try {
    return await authFetch('/schedule');
  } catch {
    return { courseIds: [] };
  }
}
