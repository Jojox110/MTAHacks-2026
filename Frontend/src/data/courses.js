export const DEPARTMENTS = [
  'Computer Science',
  'Mathematics',
  'Physics',
  'Engineering',
  'Business',
  'English',
  'Psychology',
  'Biology',
  'Chemistry',
  'Economics',
];

export const TIME_SLOTS = [
  '8:00 AM', '8:30 AM', '9:00 AM', '9:30 AM',
  '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM',
  '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM',
  '4:00 PM', '4:30 PM', '5:00 PM', '5:30 PM',
  '6:00 PM', '6:30 PM', '7:00 PM',
];

export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

export const CATALOG = [
  // Computer Science
  { id: 'CS101', name: 'Intro to Computer Science', dept: 'Computer Science', credits: 3, prereqs: [], schedule: { days: ['Mon', 'Wed', 'Fri'], start: '9:00 AM', end: '9:50 AM' }, color: '#e8a849' },
  { id: 'CS201', name: 'Data Structures', dept: 'Computer Science', credits: 3, prereqs: ['CS101'], schedule: { days: ['Tue', 'Thu'], start: '10:00 AM', end: '11:15 AM' }, color: '#e8a849' },
  { id: 'CS301', name: 'Algorithms', dept: 'Computer Science', credits: 3, prereqs: ['CS201'], schedule: { days: ['Mon', 'Wed', 'Fri'], start: '11:00 AM', end: '11:50 AM' }, color: '#e8a849' },
  { id: 'CS310', name: 'Operating Systems', dept: 'Computer Science', credits: 3, prereqs: ['CS201'], schedule: { days: ['Tue', 'Thu'], start: '1:00 PM', end: '2:15 PM' }, color: '#e8a849' },
  { id: 'CS320', name: 'Database Systems', dept: 'Computer Science', credits: 3, prereqs: ['CS201'], schedule: { days: ['Mon', 'Wed'], start: '2:00 PM', end: '3:15 PM' }, color: '#e8a849' },
  { id: 'CS330', name: 'Software Engineering', dept: 'Computer Science', credits: 3, prereqs: ['CS201'], schedule: { days: ['Tue', 'Thu'], start: '3:30 PM', end: '4:45 PM' }, color: '#e8a849' },
  { id: 'CS340', name: 'Computer Networks', dept: 'Computer Science', credits: 3, prereqs: ['CS201'], schedule: { days: ['Mon', 'Wed', 'Fri'], start: '1:00 PM', end: '1:50 PM' }, color: '#e8a849' },
  { id: 'CS401', name: 'Machine Learning', dept: 'Computer Science', credits: 3, prereqs: ['CS301', 'MATH201'], schedule: { days: ['Tue', 'Thu'], start: '11:00 AM', end: '12:15 PM' }, color: '#e8a849' },
  { id: 'CS410', name: 'Artificial Intelligence', dept: 'Computer Science', credits: 3, prereqs: ['CS301'], schedule: { days: ['Mon', 'Wed'], start: '4:00 PM', end: '5:15 PM' }, color: '#e8a849' },
  { id: 'CS420', name: 'Cybersecurity', dept: 'Computer Science', credits: 3, prereqs: ['CS340'], schedule: { days: ['Tue', 'Thu'], start: '2:00 PM', end: '3:15 PM' }, color: '#e8a849' },
  { id: 'CS430', name: 'Web Development', dept: 'Computer Science', credits: 3, prereqs: ['CS201'], schedule: { days: ['Mon', 'Wed', 'Fri'], start: '3:00 PM', end: '3:50 PM' }, color: '#e8a849' },
  { id: 'CS440', name: 'Mobile App Development', dept: 'Computer Science', credits: 3, prereqs: ['CS330'], schedule: { days: ['Tue', 'Thu'], start: '9:00 AM', end: '10:15 AM' }, color: '#e8a849' },

  // Mathematics
  { id: 'MATH101', name: 'Calculus I', dept: 'Mathematics', credits: 4, prereqs: [], schedule: { days: ['Mon', 'Tue', 'Wed', 'Thu'], start: '8:00 AM', end: '8:50 AM' }, color: '#5c9ee0' },
  { id: 'MATH102', name: 'Calculus II', dept: 'Mathematics', credits: 4, prereqs: ['MATH101'], schedule: { days: ['Mon', 'Tue', 'Wed', 'Thu'], start: '9:00 AM', end: '9:50 AM' }, color: '#5c9ee0' },
  { id: 'MATH201', name: 'Linear Algebra', dept: 'Mathematics', credits: 3, prereqs: ['MATH102'], schedule: { days: ['Mon', 'Wed', 'Fri'], start: '10:00 AM', end: '10:50 AM' }, color: '#5c9ee0' },
  { id: 'MATH202', name: 'Discrete Mathematics', dept: 'Mathematics', credits: 3, prereqs: ['MATH101'], schedule: { days: ['Tue', 'Thu'], start: '11:00 AM', end: '12:15 PM' }, color: '#5c9ee0' },
  { id: 'MATH301', name: 'Probability & Statistics', dept: 'Mathematics', credits: 3, prereqs: ['MATH102'], schedule: { days: ['Mon', 'Wed', 'Fri'], start: '2:00 PM', end: '2:50 PM' }, color: '#5c9ee0' },
  { id: 'MATH310', name: 'Differential Equations', dept: 'Mathematics', credits: 3, prereqs: ['MATH102'], schedule: { days: ['Tue', 'Thu'], start: '1:00 PM', end: '2:15 PM' }, color: '#5c9ee0' },

  // Physics
  { id: 'PHYS101', name: 'Physics I: Mechanics', dept: 'Physics', credits: 4, prereqs: ['MATH101'], schedule: { days: ['Mon', 'Wed', 'Fri'], start: '11:00 AM', end: '11:50 AM' }, color: '#c084fc' },
  { id: 'PHYS102', name: 'Physics II: E&M', dept: 'Physics', credits: 4, prereqs: ['PHYS101', 'MATH102'], schedule: { days: ['Tue', 'Thu'], start: '2:00 PM', end: '3:15 PM' }, color: '#c084fc' },
  { id: 'PHYS201', name: 'Modern Physics', dept: 'Physics', credits: 3, prereqs: ['PHYS102'], schedule: { days: ['Mon', 'Wed'], start: '3:00 PM', end: '4:15 PM' }, color: '#c084fc' },

  // Engineering
  { id: 'ENGR101', name: 'Intro to Engineering', dept: 'Engineering', credits: 3, prereqs: [], schedule: { days: ['Mon', 'Wed'], start: '10:00 AM', end: '11:15 AM' }, color: '#e0855c' },
  { id: 'ENGR201', name: 'Circuits & Electronics', dept: 'Engineering', credits: 3, prereqs: ['PHYS102'], schedule: { days: ['Tue', 'Thu'], start: '9:00 AM', end: '10:15 AM' }, color: '#e0855c' },
  { id: 'ENGR301', name: 'Signal Processing', dept: 'Engineering', credits: 3, prereqs: ['ENGR201', 'MATH310'], schedule: { days: ['Mon', 'Wed', 'Fri'], start: '1:00 PM', end: '1:50 PM' }, color: '#e0855c' },

  // Business
  { id: 'BUS101', name: 'Intro to Business', dept: 'Business', credits: 3, prereqs: [], schedule: { days: ['Tue', 'Thu'], start: '10:00 AM', end: '11:15 AM' }, color: '#5ec269' },
  { id: 'BUS201', name: 'Financial Accounting', dept: 'Business', credits: 3, prereqs: ['BUS101'], schedule: { days: ['Mon', 'Wed', 'Fri'], start: '9:00 AM', end: '9:50 AM' }, color: '#5ec269' },
  { id: 'BUS210', name: 'Marketing Principles', dept: 'Business', credits: 3, prereqs: ['BUS101'], schedule: { days: ['Tue', 'Thu'], start: '1:00 PM', end: '2:15 PM' }, color: '#5ec269' },
  { id: 'BUS301', name: 'Business Analytics', dept: 'Business', credits: 3, prereqs: ['BUS201', 'MATH301'], schedule: { days: ['Mon', 'Wed'], start: '11:00 AM', end: '12:15 PM' }, color: '#5ec269' },
  { id: 'BUS310', name: 'Management & Leadership', dept: 'Business', credits: 3, prereqs: ['BUS101'], schedule: { days: ['Tue', 'Thu'], start: '3:30 PM', end: '4:45 PM' }, color: '#5ec269' },

  // English
  { id: 'ENG101', name: 'English Composition', dept: 'English', credits: 3, prereqs: [], schedule: { days: ['Mon', 'Wed', 'Fri'], start: '10:00 AM', end: '10:50 AM' }, color: '#e05c9e' },
  { id: 'ENG201', name: 'Technical Writing', dept: 'English', credits: 3, prereqs: ['ENG101'], schedule: { days: ['Tue', 'Thu'], start: '11:00 AM', end: '12:15 PM' }, color: '#e05c9e' },

  // Psychology
  { id: 'PSY101', name: 'Intro to Psychology', dept: 'Psychology', credits: 3, prereqs: [], schedule: { days: ['Mon', 'Wed', 'Fri'], start: '1:00 PM', end: '1:50 PM' }, color: '#84c0fc' },
  { id: 'PSY201', name: 'Cognitive Psychology', dept: 'Psychology', credits: 3, prereqs: ['PSY101'], schedule: { days: ['Tue', 'Thu'], start: '2:00 PM', end: '3:15 PM' }, color: '#84c0fc' },

  // Biology
  { id: 'BIO101', name: 'General Biology', dept: 'Biology', credits: 4, prereqs: [], schedule: { days: ['Mon', 'Wed', 'Fri'], start: '8:00 AM', end: '8:50 AM' }, color: '#84e0a8' },
  { id: 'BIO201', name: 'Genetics', dept: 'Biology', credits: 3, prereqs: ['BIO101'], schedule: { days: ['Tue', 'Thu'], start: '10:00 AM', end: '11:15 AM' }, color: '#84e0a8' },

  // Chemistry
  { id: 'CHEM101', name: 'General Chemistry', dept: 'Chemistry', credits: 4, prereqs: [], schedule: { days: ['Mon', 'Wed', 'Fri'], start: '9:00 AM', end: '9:50 AM' }, color: '#e0d45c' },
  { id: 'CHEM201', name: 'Organic Chemistry', dept: 'Chemistry', credits: 4, prereqs: ['CHEM101'], schedule: { days: ['Tue', 'Thu'], start: '1:00 PM', end: '2:15 PM' }, color: '#e0d45c' },

  // Economics
  { id: 'ECON101', name: 'Microeconomics', dept: 'Economics', credits: 3, prereqs: [], schedule: { days: ['Tue', 'Thu'], start: '9:00 AM', end: '10:15 AM' }, color: '#a8e05c' },
  { id: 'ECON102', name: 'Macroeconomics', dept: 'Economics', credits: 3, prereqs: ['ECON101'], schedule: { days: ['Mon', 'Wed', 'Fri'], start: '11:00 AM', end: '11:50 AM' }, color: '#a8e05c' },
  { id: 'ECON201', name: 'Econometrics', dept: 'Economics', credits: 3, prereqs: ['ECON102', 'MATH301'], schedule: { days: ['Tue', 'Thu'], start: '3:30 PM', end: '4:45 PM' }, color: '#a8e05c' },
];

export const CAREER_PATHS = {
  'Software Engineer': {
    required: ['CS101', 'CS201', 'CS301', 'CS310', 'CS320', 'CS330', 'MATH101', 'MATH202'],
    recommended: ['CS401', 'CS430', 'CS440', 'MATH201', 'ENG101'],
    description: 'Build software systems, web apps, and scalable platforms.',
  },
  'Data Scientist': {
    required: ['CS101', 'CS201', 'MATH101', 'MATH102', 'MATH201', 'MATH301', 'CS401'],
    recommended: ['CS301', 'CS320', 'ECON101', 'PSY101', 'BUS301'],
    description: 'Analyze data, build ML models, and derive insights.',
  },
  'Cybersecurity Analyst': {
    required: ['CS101', 'CS201', 'CS340', 'CS420', 'CS310'],
    recommended: ['CS301', 'MATH202', 'CS330', 'ENG201'],
    description: 'Protect systems and networks from security threats.',
  },
  'AI/ML Engineer': {
    required: ['CS101', 'CS201', 'CS301', 'CS401', 'CS410', 'MATH101', 'MATH102', 'MATH201'],
    recommended: ['MATH301', 'CS320', 'PSY201'],
    description: 'Design and deploy artificial intelligence systems.',
  },
  'Product Manager': {
    required: ['BUS101', 'BUS210', 'BUS310', 'CS101', 'ENG101', 'ENG201'],
    recommended: ['PSY101', 'ECON101', 'BUS201', 'BUS301', 'CS201'],
    description: 'Lead product strategy and cross-functional teams.',
  },
  'Financial Analyst': {
    required: ['BUS101', 'BUS201', 'ECON101', 'ECON102', 'MATH101', 'MATH301'],
    recommended: ['BUS301', 'ECON201', 'MATH102', 'CS101'],
    description: 'Evaluate investments and financial performance.',
  },
  'Biomedical Engineer': {
    required: ['ENGR101', 'BIO101', 'CHEM101', 'PHYS101', 'MATH101', 'MATH102'],
    recommended: ['PHYS102', 'ENGR201', 'BIO201', 'CHEM201'],
    description: 'Apply engineering to healthcare and medical devices.',
  },
  'UX Researcher': {
    required: ['PSY101', 'PSY201', 'CS101', 'ENG101', 'ENG201'],
    recommended: ['BUS210', 'MATH301', 'CS430'],
    description: 'Study user behavior to improve product experiences.',
  },
};

export function getTimeRow(time) {
  const [h, m] = time.replace(/ (AM|PM)/, '').split(':').map(Number);
  const isPM = time.includes('PM');
  const hour24 = isPM && h !== 12 ? h + 12 : (!isPM && h === 12 ? 0 : h);
  return (hour24 - 8) * 2 + (m >= 30 ? 1 : 0) + 1;
}

export function getTimeSpan(start, end) {
  return getTimeRow(end) - getTimeRow(start);
}

export function hasConflict(course, selectedCourses) {
  for (const sel of selectedCourses) {
    const sharedDays = course.schedule.days.filter(d => sel.schedule.days.includes(d));
    if (sharedDays.length === 0) continue;
    const s1 = getTimeRow(course.schedule.start);
    const e1 = s1 + getTimeSpan(course.schedule.start, course.schedule.end);
    const s2 = getTimeRow(sel.schedule.start);
    const e2 = s2 + getTimeSpan(sel.schedule.start, sel.schedule.end);
    if (s1 < e2 && s2 < e1) return sel;
  }
  return null;
}
