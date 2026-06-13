# CompliancePulse

CompliancePulse is an AI-assisted regulatory compliance platform for financial services
organizations. It centralizes regulations, controls, incidents, alerts, and audit evidence,
and layers an AI assistant and "agentic" workflows on top to help compliance teams monitor
risk, detect conflicting requirements, and generate evidence packages.

## Features

- **Dashboard** — at-a-glance compliance score, open alerts/incidents, and risk trends
- **Regulations** — browse regulatory frameworks (PCI DSS, GDPR, CCPA, AML/KYC, LGPD, ...),
  decompose regulations into atomic requirements, and detect conflicts between frameworks
- **Controls** — manage compliance controls and their status against frameworks
- **Incidents & Alerts** — track, acknowledge, and update the status of compliance incidents
  and alerts
- **Monitoring** — ingest and view monitoring/telemetry data feeding the compliance posture
- **Risk** — heatmaps and trend analysis of risk over time
- **Evidence** — generate and review audit evidence packages
- **Agents** — view agent activity/tasks and provide human-in-the-loop (HITL) feedback
- **Insights** — AI-generated compliance insights
- **Assistant** — chat-based compliance assistant powered by Google Gemini
- **Multi-tenant** auth (JWT-based) with per-tenant settings

## Tech Stack

- **Backend**: FastAPI (Python), MongoDB via Motor, JWT auth, Google Gemini for AI features
- **Frontend**: React (Create React App + CRACO), Tailwind CSS, Radix UI / shadcn-style
  components
- **Database**: MongoDB

## Project Structure

```
.
├── backend/
│   ├── server.py              # FastAPI app and all API routes
│   ├── seed.py                # Seeds demo tenant/data into MongoDB
│   ├── emergentintegrations/  # Local Gemini chat client shim
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── pages/              # Dashboard, Regulations, Controls, Incidents, ...
│   │   ├── components/         # Shared UI components
│   │   ├── context/             # Auth context
│   │   └── lib/, hooks/
│   ├── Dockerfile
│   └── .env.example
├── docker-compose.yml
└── requirements.txt            # Top-level convenience requirements
```

## Getting Started

### Option 1: Docker Compose (recommended)

This spins up MongoDB, the FastAPI backend, and the React frontend (served via nginx).

1. Copy the backend env file and fill in the values (see [Environment Variables](#environment-variables)):

   ```bash
   cp backend/.env.example backend/.env
   ```

2. Build and start everything:

   ```bash
   docker compose up --build
   ```

3. Open the app:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000/api
   - API docs (Swagger): http://localhost:8000/docs

> Note: `REACT_APP_BACKEND_URL` is baked into the frontend build at image build time
> (a Create React App limitation). If you change the backend's host/port, update the
> `args.REACT_APP_BACKEND_URL` build arg in `docker-compose.yml` and rebuild the
> `frontend` service.

### Option 2: Run Locally (without Docker)

#### Prerequisites

- Python 3.11+
- Node.js 18+ and npm
- A running MongoDB instance (local, Docker, or MongoDB Atlas)

#### Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env
# edit .env with your MongoDB URL, JWT secret, and Gemini API key

uvicorn server:app --reload --port 8000
```

#### Frontend

```bash
cd frontend
npm install

cp .env.example .env
# set REACT_APP_BACKEND_URL=http://localhost:8000

npm start
```

The frontend dev server runs on http://localhost:3000 and proxies API calls to
`REACT_APP_BACKEND_URL`.

## Seeding Demo Data

To populate the database with a demo tenant, sample regulations, controls, incidents,
alerts, and a demo admin user:

```bash
cd backend
python seed.py
```

This creates a demo login:

- **Email**: `admin@compliancepulse.demo`
- **Password**: `admin123`

## Environment Variables

### Backend (`backend/.env`)

| Variable               | Description                                              | Default                     |
|------------------------|-----------------------------------------------------------|------------------------------|
| `MONGO_URL`            | MongoDB connection string                                | `mongodb://localhost:27017` |
| `DB_NAME`              | MongoDB database name                                    | `compliance_db`             |
| `JWT_SECRET_KEY`       | Secret used to sign JWT auth tokens                      | `default-secret`            |
| `JWT_ALGORITHM`        | JWT signing algorithm                                    | `HS256`                      |
| `JWT_EXPIRATION_HOURS` | JWT token lifetime in hours                              | `24`                          |
| `CORS_ORIGINS`         | Comma-separated list of allowed CORS origins (`*` for all) | `*`                          |
| `GEMINI_API_KEY`       | Google Gemini API key, used by the AI chat assistant and other AI features | _(required for AI features)_ |

If MongoDB is unreachable at startup, the backend automatically falls back to an
in-memory mock database (`mongomock-motor`), so the API can still run for local
development/demos — note that data will not persist across restarts in that mode.

### Frontend (`frontend/.env`)

| Variable                | Description                          | Default                  |
|--------------------------|---------------------------------------|---------------------------|
| `REACT_APP_BACKEND_URL`  | Base URL of the FastAPI backend       | `http://localhost:8000`  |

## API Overview

The backend exposes a REST API under `/api`, including:

- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- `GET/POST /api/regulations`, `POST /api/regulations/{id}/decompose`,
  `POST /api/regulations/analyze-conflicts`, `GET /api/regulations/conflicts`
- `GET/POST /api/controls`
- `GET/POST /api/incidents`, `PUT /api/incidents/{id}/status`
- `GET/POST /api/alerts`, `PUT /api/alerts/{id}/acknowledge`
- `GET /api/dashboard/stats`, `GET /api/risk/heatmap`, `GET /api/risk/trends`
- `GET/POST /api/monitoring/data`, `POST /api/monitoring/ingest`
- `GET/POST /api/evidence/packages`, `POST /api/evidence/generate`
- `GET/POST /api/agents/tasks`, `PUT /api/agents/tasks/{id}/hitl`, `GET /api/agents/activity`
- `GET /api/insights`, `POST /api/chat`
- `GET/PUT /api/tenants/current`, `GET/POST /api/policies`, `GET/POST /api/documents`,
  `POST /api/documents/upload`

Full interactive documentation is available at `/docs` (Swagger UI) once the backend is
running.

## Notes on AI Integration : 

AI-powered features (the chat assistant, conflict analysis, evidence generation, etc.)
use Google's Gemini models via a small local compatibility shim
(`backend/emergentintegrations/`). These features require a valid `GEMINI_API_KEY`
(a Gemini API key) to be set in `backend/.env`; without it, those endpoints will return
an error but the rest of the application will work normally.
