/**
 * API service layer — all backend calls go through here.
 * Currently returns mock data. Replace with real fetch() calls when backend is ready.
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

/**
 * Fetch course catalog from backend
 */
export async function fetchCourses() {
  // TODO: Replace with real API call
  // return fetch(`${API_BASE}/courses`).then(r => r.json());
  const { CATALOG } = await import('./courses.js');
  return CATALOG;
}

/**
 * Fetch career paths from backend
 */
export async function fetchCareerPaths() {
  // TODO: Replace with real API call
  // return fetch(`${API_BASE}/career-paths`).then(r => r.json());
  const { CAREER_PATHS } = await import('./courses.js');
  return CAREER_PATHS;
}

/**
 * Send user preferences to AI advisor and get recommended path + courses
 * @param {string} prompt - User's career goals / preferences
 * @param {string[]} currentCourses - IDs of currently selected courses
 * @returns {Promise<{ careerPath: string, description: string, required: string[], recommended: string[] }>}
 */
export async function getAIRecommendation(prompt, currentCourses = []) {
  // TODO: Replace with real API call
  // return fetch(`${API_BASE}/ai/recommend`, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ prompt, currentCourses }),
  // }).then(r => r.json());

  // Mock: simple keyword matching for demo
  const { CAREER_PATHS } = await import('./courses.js');

  await new Promise(r => setTimeout(r, 1500)); // simulate latency

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
    if (score > bestScore) {
      bestScore = score;
      bestMatch = path;
    }
  }

  const pathData = CAREER_PATHS[bestMatch];
  return {
    careerPath: bestMatch,
    description: pathData.description,
    required: pathData.required,
    recommended: pathData.recommended,
  };
}

/**
 * Save user's schedule to backend
 * @param {string[]} courseIds
 */
export async function saveSchedule(courseIds) {
  // TODO: Replace with real API call
  // return fetch(`${API_BASE}/schedule`, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ courseIds }),
  // }).then(r => r.json());
  console.log('Schedule saved (mock):', courseIds);
  return { success: true };
}

/**
 * Load user's saved schedule from backend
 */
export async function loadSchedule() {
  // TODO: Replace with real API call
  // return fetch(`${API_BASE}/schedule`).then(r => r.json());
  return { courseIds: [] };
}
