# CourseForge

Course planning platform for Universite de Moncton students. Build your schedule, track degree progress, and get AI-powered course recommendations.

## Features

- **Weekly Calendar** — Visual schedule grid (Mon-Fri, 8h-22h) with drag-and-drop course blocks, conflict detection, and color-coded courses
- **Course Catalog** — Browse and search 400+ courses by department, filter by prerequisites, and add to your schedule
- **Program Tracking** — View your degree requirements (63 programs supported) with option groups for electives, prefix-based choices, and OFG bank courses
- **Progress View** — Track completed vs remaining credits across all semesters with per-year breakdowns
- **AI Advisor** — Get personalized course recommendations based on your major, minor, and current schedule
- **Multi-Session Support** — Plan across Hiver, Printemps-Ete, and Automne 2026 sessions
- **User Accounts** — Register/login, save schedules, set major/minor

## Tech Stack

| Layer    | Technology                          |
|----------|-------------------------------------|
| Frontend | React 19, Vite 8, Framer Motion    |
| Backend  | FastAPI, SQLite, Uvicorn            |
| Deploy   | Docker, Nginx                       |

## Project Structure

```
CourseForge/
├── Frontend/
│   ├── src/
│   │   ├── App.jsx                  # Main app, routing, state management
│   │   ├── App.css                  # All styles
│   │   ├── components/
│   │   │   ├── LoginScreen.jsx      # Auth UI
│   │   │   ├── CourseCatalog.jsx    # Course browser/search
│   │   │   ├── ScheduleGrid.jsx     # Weekly calendar view
│   │   │   ├── ProgramView.jsx      # Degree requirements display
│   │   │   ├── ProgressView.jsx     # Credit progress tracker
│   │   │   └── AIAdvisor.jsx        # AI recommendation panel
│   │   └── data/
│   │       └── api.js               # API service layer
│   ├── public/
│   │   ├── programs.json            # 63 program definitions with option groups
│   │   ├── schedule_hiver_2026_moncton_fix.json
│   │   ├── schedule_printemps_ete_2026_moncton_fix.json
│   │   └── schedule_automne_2026_moncton_fix.json
│   ├── Dockerfile
│   └── nginx.conf
├── Backend/
│   ├── main.py                      # FastAPI app entry point
│   ├── config.py                    # DB path, CORS origins
│   ├── database.py                  # SQLite connection + schema
│   ├── seed.py                      # Course data seeder
│   ├── models/                      # Pydantic request/response models
│   ├── routers/                     # API route handlers
│   │   ├── auth.py                  # POST /api/register, /api/login, GET/PUT /api/me
│   │   ├── courses.py               # GET /api/courses, /api/departments
│   │   ├── schedules.py             # GET/POST /api/schedule
│   │   └── recommendations.py       # POST /api/ai/recommend
│   ├── services/                    # Business logic
│   ├── data/                        # Seed data (courses.json)
│   ├── requirements.txt
│   └── Dockerfile
├── docker-compose.yml
└── LICENSE                          # GPL-3.0
```

## Getting Started

### Docker (recommended)

```bash
docker compose up --build
```

- Frontend: http://localhost:3000
- Backend: http://localhost:8000

The frontend nginx proxies `/api/` requests to the backend internally, so only the frontend port needs to be exposed/tunneled.

### Local Development

**Backend:**

```bash
cd Backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

Runs on http://localhost:8000

**Frontend:**

```bash
cd Frontend
npm install
npm run dev
```

Runs on http://localhost:5173. In dev mode, API calls go to `http://localhost:8000` by default. Override with:

```bash
VITE_API_URL=http://your-backend:8000/api npm run dev
```

## API Endpoints

| Method | Endpoint            | Auth | Description                    |
|--------|---------------------|------|--------------------------------|
| POST   | `/api/register`     | No   | Create account                 |
| POST   | `/api/login`        | No   | Login by email                 |
| GET    | `/api/me`           | Yes  | Get current user               |
| PUT    | `/api/me`           | Yes  | Update major/minor             |
| GET    | `/api/courses`      | No   | List all courses               |
| GET    | `/api/departments`  | No   | List departments               |
| GET    | `/api/schedule`     | Yes  | Load saved schedule            |
| POST   | `/api/schedule`     | Yes  | Save schedule                  |
| POST   | `/api/ai/recommend` | Yes  | Get AI course recommendations  |

## Environment Variables

| Variable       | Default              | Description               |
|----------------|----------------------|---------------------------|
| `DB_PATH`      | `courseforge.db`     | SQLite database file path |
| `VITE_API_URL` | `/api`               | Backend API base URL      |

## License

GPL-3.0 - See [LICENSE](LICENSE) for details.
