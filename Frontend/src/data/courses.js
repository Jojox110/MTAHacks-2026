// Departments are loaded dynamically from API now.
// This is the static fallback list extracted from the UMoncton course data.
export const DEPARTMENTS = [
  'ACAD','ADCO','ADFI','ADFS','ADGO','ADMI','ADMK','ADMN','ADPU','ADRD',
  'ADRH','ADSA','ADSF','ADSG','ADSI','ALLE','ANGL','ARDR','ARVI','ASTR',
  'BICH','BIOL','CHIM','CRIM','DROI','ECOL','EDUC','EPAP','FORS','GCIV',
  'GELE','GEIN','GEOG','GMEC','HIST','HMEC','HSTC','INFO','KINS','LANG',
  'LING','LITT','MATH','MSAG','MUSI','NUAL','PEPS','PHIL','PHYS','PSED',
  'PSYC','RADI','RLGS','SCPO','SINF','SOCI','STAT','TSOC','TRAD',
];

// No time-based scheduling — UMoncton data doesn't include times.
// These are kept only for backwards compatibility if needed.
export const TIME_SLOTS = [];
export const DAYS = [];

// CATALOG is no longer bundled — loaded from backend API.
// Kept as empty array for fallback.
export const CATALOG = [];

// Career paths are no longer static — recommendation engine uses course descriptions.
export const CAREER_PATHS = {};

// No time conflict detection needed without schedule data.
export function hasConflict() {
  return null;
}
