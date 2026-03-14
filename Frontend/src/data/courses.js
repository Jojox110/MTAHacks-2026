// Departments are loaded dynamically from API now.
// This is the static fallback list extracted from the UMoncton course data.
export const DEPARTMENTS = [
  'ACAD','ADCO','ADFI','ADFS','ADGO','ADMI','ADMK','ADMN','ADPU','ADRD',
  'ADRH','ADSA','ADSF','ADSG','ADSI','ALLE','ANGL','ARDR','ARVI','ASTR',
  'BADI','BICH','BIOL','BIOT','BTIL','CHIM','CRIM','DROI','ECON','EDAN',
  'EDDP','EDDS','EDUC','EPAP','EPED','ESPA','ETEV','ETFA','FASS','FLSA',
  'FORS','FRAN','FRLS','FSCI','GCIV','GEIN','GELE','GEOG','GERO','GGEN',
  'GIZC','GLST','GMEC','HIST','ICOM','INFO','KNEP','LING','LITT','MATH',
  'MUED','MULT','MUSI','NUAL','NUEF','ORCO','PHIL','PHYS','PSYC','RADI',
  'RESN','SANT','SCPO','SCRE','SCSO','SENV','SINF','SOCI','STAT','SVIE',
  'TLMD','TRAD','TRES','TSOC','TSTX',
];

// Human-readable department names from UMoncton
export const DEPT_NAMES = {
  'ACAD': 'Acadie',
  'ADCO': 'Comptabilité',
  'ADFI': 'Finance',
  'ADFS': 'Fiscalité',
  'ADGO': 'Gestion des opérations',
  'ADMI': 'Administration',
  'ADMK': 'Marketing',
  'ADMN': 'Management',
  'ADPU': 'Administration publique',
  'ADRD': 'Administration réseau distrib.',
  'ADRH': 'Ressources humaines',
  'ADSA': 'Gestion des serv. de santé',
  'ADSF': 'Gestion services financiers',
  'ADSG': 'Administration science gestion',
  'ADSI': "Syst. d'info. organisationnels",
  'ALLE': 'Allemand',
  'ANGL': 'Anglais',
  'ARDR': 'Art dramatique',
  'ARVI': 'Arts visuels',
  'ASTR': 'Astronomie',
  'BADI': "Design d'intérieur",
  'BICH': 'Biochimie',
  'BIOL': 'Biologie',
  'BIOT': 'Biotechnologie',
  'BTIL': 'Technologie, info, leadership',
  'CHIM': 'Chimie',
  'CRIM': 'Criminologie',
  'DROI': 'Droit',
  'ECON': 'Économie',
  'EDAN': 'Andragogie',
  'EDDP': 'Didactique au primaire',
  'EDDS': 'Didactique au secondaire',
  'EDUC': 'Éducation',
  'EPAP': 'Éducation phys-Activité phys',
  'EPED': 'Éducation physique - Éducation',
  'ESPA': 'Espagnol',
  'ETEV': "Études de l'environnement",
  'ETFA': 'Études familiales',
  'FASS': 'Faculté arts et sc soc',
  'FLSA': 'Français langue seconde avancé',
  'FORS': 'Foresterie',
  'FRAN': 'Français',
  'FRLS': 'Français langue seconde',
  'FSCI': 'Faculté des sciences',
  'GCIV': 'Génie civil',
  'GEIN': "Gestion de l'information",
  'GELE': 'Génie électrique',
  'GEOG': 'Géographie',
  'GERO': 'Gérontologie',
  'GGEN': 'Génie général',
  'GIZC': 'Gestion intégrée zone côtière',
  'GLST': 'Gest. loisir sport tourisme',
  'GMEC': 'Génie mécanique',
  'HIST': 'Histoire',
  'ICOM': 'Information-communication',
  'INFO': 'Informatique',
  'KNEP': 'Kinésiologie et éduc. phys.',
  'LING': 'Linguistique',
  'LITT': 'Littérature',
  'MATH': 'Mathématiques',
  'MUED': 'Musique éducation',
  'MULT': 'Multidisciplinaire',
  'MUSI': 'Musique',
  'NUAL': 'Nutrition-alimentation',
  'NUEF': 'Nutrition et études familiales',
  'ORCO': 'Orientation et counseling',
  'PHIL': 'Philosophie',
  'PHYS': 'Physique',
  'PSYC': 'Psychologie',
  'RADI': 'Radiologie',
  'RESN': 'Ressources naturelles',
  'SANT': 'Sciences de la santé',
  'SCPO': 'Science politique',
  'SCRE': 'Sciences religieuses',
  'SCSO': 'Sciences sociales',
  'SENV': "Science de l'environnement",
  'SINF': 'Science infirmière',
  'SOCI': 'Sociologie',
  'STAT': 'Statistique',
  'SVIE': 'Sciences de la vie',
  'TLMD': 'Tech. de laboratoire médical',
  'TRAD': 'Traduction',
  'TRES': 'Thérapie respiratoire',
  'TSOC': 'Travail social',
  'TSTX': 'Toxicomanie',
};

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
