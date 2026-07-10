# Sherlock Internship Challenge
![React](https://img.shields.io/badge/Frontend-React-61DAFB)
![Express](https://img.shields.io/badge/Backend-Express-000000)
![FastAPI](https://img.shields.io/badge/AI-FastAPI-009688)
![Gemini](https://img.shields.io/badge/LLM-Gemini-4285F4)
![Socket.IO](https://img.shields.io/badge/Realtime-Socket.IO-010101)
A modular, scalable full-stack scaffold consisting of three independent
services:

| Service      | Stack                                                        | Purpose                                   |
|--------------|---------------------------------------------------------------|--------------------------------------------|
| `frontend/`  | React + Vite, TailwindCSS, React Router, Axios, Socket.IO Client | Client application                        |
| `backend/`   | Node.js, Express, Socket.IO, Multer, CORS, dotenv              | API server & real-time gateway            |
| `ai-service/`| Python, FastAPI, (optional) Gemini                             | Candidate identification microservice — Feature Extraction Service, Candidate Confidence Engine, Gemini-backed Candidate Identification with deterministic fallback |

Dashboard: <img width="1897" height="862" alt="image" src="https://github.com/user-attachments/assets/403ea393-e3c4-41e4-b545-b5e0bc7f00a9" />
System Architecture: <img width="1920" height="1080" alt="Untitled design" src="https://github.com/user-attachments/assets/0670375b-9a34-442e-bcb7-cd523087db81" />
AI Pipeline: <img width="1920" height="1080" alt="Untitled design (1)" src="https://github.com/user-attachments/assets/13f2505d-00d1-47ba-acd0-3a7d8de229d5" />



See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for a full system diagram and
request-flow walkthrough, and [`EVALUATION.md`](./EVALUATION.md) for how
the system was tested, the edge cases it targets, and its known
limitations.

> **Status:** All three services are implemented end-to-end: the
> Node backend exposes meeting/participant/analyze/candidate REST
> resources and a Socket.IO realtime gateway (mock participant activity
> + a normalized timeline feed); the Python AI service implements the
> Feature Extraction Service, the (non-AI, rule-based) Candidate
> Confidence Engine, and a Gemini-backed Candidate Identification layer
> with a deterministic fallback when no API key is configured; the
> frontend dashboard renders all of it live, with REST for initial
> hydration and Socket.IO for realtime updates. Remaining gaps: no
> database (all state is in-memory/mocked), no authentication, and no
> automated test suite — see §7 below.

---

## 1. Project Structure

```
sherlock-internship-challenge/
├── frontend/                  # React + Vite client
│   ├── public/
│   ├── src/
│   │   ├── api/                # Axios instance(s)
│   │   │   └── axiosClient.js
│   │   ├── assets/
│   │   ├── components/         # Reusable UI components
│   │   ├── config/             # Centralized env config
│   │   │   └── index.js
│   │   ├── context/             # App-wide React context providers
│   │   │   └── SocketContext.jsx  # Owns the socket connection lifecycle
│   │   ├── hooks/               # Custom React hooks
│   │   │   └── useSocket.js     # Access shared socket + connection status
│   │   ├── pages/               # Route-level pages
│   │   │   └── Home.jsx
│   │   ├── routes/              # React Router definitions
│   │   │   └── AppRoutes.jsx
│   │   ├── services/            # Socket.IO client, API service wrappers
│   │   │   └── socket.js        # Shared Socket.IO client instance
│   │   ├── utils/               # Shared helpers
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css            # Tailwind directives
│   ├── index.html
│   ├── package.json
│   ├── postcss.config.js
│   ├── tailwind.config.js
│   ├── vite.config.js
│   └── .env.example
│
├── backend/                    # Node.js + Express API/Socket.IO server
│   ├── src/
│   │   ├── api/
│   │   │   └── routes/
│   │   │       └── index.js     # Root API router (mounted at /api)
│   │   ├── config/
│   │   │   └── index.js         # Centralized env config
│   │   ├── middleware/
│   │   │   ├── errorHandler.js
│   │   │   ├── requestLogger.js
│   │   │   └── upload.js        # Multer config
│   │   ├── services/            # Business logic (analysis, candidate, meeting, participant)
│   │   ├── sockets/
│   │   │   └── index.js         # Socket.IO server setup
│   │   ├── utils/               # Shared helpers
│   │   ├── app.js               # Express app (middleware + route mounting)
│   │   └── server.js            # HTTP server bootstrap
│   ├── uploads/                 # Multer upload destination (gitignored)
│   ├── package.json
│   └── .env.example
│
├── ai-service/                  # Python FastAPI microservice
│   ├── app/
│   │   ├── api/                 # features/confidence/analyze/candidate routers
│   │   ├── core/                # DEFAULT_CONFIDENCE_WEIGHTS + GEMINI_* config
│   │   ├── models/               # Pydantic request/response schemas
│   │   ├── services/             # Feature Extraction, Confidence Engine,
│   │   │                         # Gemini Candidate Identification + fallback
│   │   └── utils/                # similarity / math helpers
│   ├── main.py                   # FastAPI entrypoint
│   ├── requirements.txt
│   └── .env.example
│
├── shared/                       # Cross-service reference constants
│   ├── constants.js
│   └── README.md
│
├── .gitignore
└── README.md                     # You are here
```

---

## 2. Prerequisites

- Node.js ≥ 18
- npm ≥ 9
- Python ≥ 3.10 (for the AI service)

---

## 3. Getting Started

### 3.1 Backend

```bash
cd backend
cp .env.example .env      # already copied for you in this scaffold
npm install
npm run dev                # requires nodemon (devDependency)
# or
npm start
```

The server starts on `http://localhost:5000` and exposes:
- `GET /health` — service health check
- `GET /api` — placeholder API root

Socket.IO is attached to the same HTTP server and accepts connections from
`CLIENT_URL` (see `.env`).

### 3.2 Frontend

```bash
cd frontend
cp .env.example .env      # already copied for you in this scaffold
npm install
npm run dev
```

The app starts on `http://localhost:5173` (Vite default) and is configured
to talk to the backend via `VITE_API_BASE_URL` / `VITE_SOCKET_URL`.

### 3.3 AI Service

```bash
cd ai-service
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --reload --port 8000
```

Exposes `GET /health` plus the full candidate-identification pipeline
(`/api/features/*`, `/api/confidence/*`, `/api/analyze`,
`/api/candidate/*`) — see [`ai-service/README.md`](./ai-service/README.md)
for the complete route list. Runs entirely without external
dependencies; set `GEMINI_API_KEY` in `.env` to enable the Gemini
reasoning layer, or leave it unset to run in deterministic fallback
mode.

---

## 4. Environment Variables

### backend/.env
| Variable            | Default                  | Description                          |
|---------------------|---------------------------|---------------------------------------|
| `PORT`               | `5000`                    | Express server port                   |
| `NODE_ENV`           | `development`             | Environment name                      |
| `CLIENT_URL`         | `http://localhost:5173`   | Allowed CORS/Socket.IO origin          |
| `AI_SERVICE_URL`     | `http://localhost:8000`   | Base URL for the Python AI service     |
| `UPLOAD_DIR`         | `uploads`                 | Multer disk storage destination        |
| `MAX_UPLOAD_SIZE_MB` | `10`                      | Multer file size limit (MB)            |

### frontend/.env
| Variable              | Default                  | Description                    |
|-----------------------|---------------------------|----------------------------------|
| `VITE_API_BASE_URL`   | `http://localhost:5000`   | Axios base URL                  |
| `VITE_SOCKET_URL`     | `http://localhost:5000`   | Socket.IO client target         |

### ai-service/.env
| Variable            | Default                  | Description            |
|---------------------|---------------------------|-------------------------|
| `AI_SERVICE_PORT`    | `8000`                    | Uvicorn port            |
| `BACKEND_URL`        | `http://localhost:5000`   | Node backend base URL   |

---

## 5. Deployment on Render

This project is prepared for deployment on **Render** as three separate services. Follow these instructions to deploy each one.

### 5.1 AI Service (FastAPI)
Deploy the AI service first so the backend has its URL ready.

1. Create a new **Web Service** on Render.
2. Connect your Git repository.
3. Configure the following settings:
   - **Root Directory**: `ai-service`
   - **Environment**: `Python`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
4. Add the following **Environment Variables**:
   - `GEMINI_API_KEY`: *(Optional)* Your Gemini API key from Google AI Studio. If unset, it will fall back to deterministic mode.
   - `GEMINI_MODEL`: `gemini-2.0-flash`
   - `GEMINI_TIMEOUT_SECONDS`: `20`
5. Click **Deploy**. Note the generated service URL (e.g. `https://sherlock-ai.onrender.com`).

### 5.2 Backend (Express + Socket.IO)
Deploy the backend next.

1. Create a new **Web Service** on Render.
2. Connect your Git repository.
3. Configure the following settings:
   - **Root Directory**: `backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
4. Add the following **Environment Variables**:
   - `NODE_ENV`: `production`
   - `AI_SERVICE_URL`: The URL of your deployed AI service (from step 5.1).
   - `FRONTEND_URL`: The URL of your deployed frontend (from step 5.3, e.g. `https://sherlock.onrender.com`).
5. Click **Deploy**. Note the generated backend URL (e.g. `https://sherlock-backend.onrender.com`).

### 5.3 Frontend (React + Vite)
Deploy the frontend last.

1. Create a new **Static Site** on Render.
2. Connect your Git repository.
3. Configure the following settings:
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Publish Directory**: `dist`
4. Add the following **Environment Variables**:
   - `VITE_API_BASE_URL`: The URL of your deployed backend (from step 5.2).
   - `VITE_SOCKET_URL`: The URL of your deployed backend (from step 5.2).
5. Click **Deploy**.

---

## 6. Design Principles

- **Modular by layer**: `api/routes` (HTTP), `services` (business logic),
  `middleware` (cross-cutting concerns), `utils` (helpers), `sockets`
  (real-time) are kept separate so each can grow independently.
- **Centralized config**: both frontend and backend read all environment
  values through a single `config/index.js`, never `process.env` /
  `import.meta.env` directly elsewhere.
- **No premature business logic**: routes, services, and AI endpoints were
  intentionally left as placeholders/READMEs early on so each layer could
  be designed deliberately instead of retrofitting; all three services
  are now implemented end-to-end (see the Status note above).

---

## 7. Realtime Foundation (Socket.IO)

The frontend now auto-connects to the backend's Socket.IO server as soon
as the app loads, and auto-reconnects if the connection drops:

- `frontend/src/services/socket.js` — single shared `socket` instance
  (reconnection enabled with exponential backoff) plus `connectSocket()` /
  `disconnectSocket()` helpers. Any future real-time feature should import
  this same instance rather than creating a new one.
- `frontend/src/context/SocketContext.jsx` — `SocketProvider`, mounted
  once in `main.jsx`, starts the connection on app load and tracks
  connection status (`connecting` / `connected` / `disconnected`) as the
  socket connects, disconnects, and reconnects.
- `frontend/src/hooks/useSocket.js` — `useSocket()` hook for any
  component to read `{ socket, status, isConnected }`. `Header.jsx` uses
  it to show a small live/connecting/offline indicator as a working
  example.

Participant activity and a normalized timeline feed are now implemented
as event handlers on top of this connectivity foundation — see
`backend/src/sockets/`. Chat and WebRTC/signaling are not implemented.

---

## 8. Assumptions

This prototype targets the Sherlock Internship Challenge brief. Where
the brief left implementation details open, the following assumptions
were made:

- **Meeting telemetry is provided, not captured.** The prototype
  assumes an upstream integration (Google Meet / Zoom / Teams SDK,
  or Sherlock's own capture pipeline) hands the AI service the shape
  defined in `ai-service/app/models/schemas.py` (`MeetingData`): per
  -participant expected vs. observed identity, join time, speaking
  activity, camera time, transcript stats, and face-detection
  sampling. Capturing that telemetry from a real meeting platform is
  out of scope for this challenge; the built-in mock data
  (`mock_data_service.py`) stands in for it.
- **"Expected identity" comes from calendar/ATS metadata.** The
  `expectedIdentity` (name/email) on each participant is assumed to
  come from the interview's calendar invite / ATS record — exactly the
  "External Metadata" the brief describes (candidate name, candidate
  email, interview schedule, interviewer names) — while
  `observedIdentity` is whatever the participant actually presents as
  in the meeting. The scoring is deliberately built to *not* trust
  `expectedIdentity` blindly, since the brief explicitly calls out
  wrong/mistyped names as a case to handle.
- **A single "candidate" per meeting.** The system assumes exactly one
  interview candidate is present per meeting (consistent with the
  brief's framing) and ranks every other participant as "not the
  candidate," rather than trying to detect multiple simultaneous
  candidates.
- **Confidence is relative within a meeting, not an absolute
  probability.** `confidenceScore` answers "who, among the people in
  this meeting, most looks like the invited candidate," not a
  calibrated P(this person is the candidate) — see `EVALUATION.md` §3.
- **No authentication, persistence, or automated tests.** These were
  intentionally treated as out of scope for a challenge prototype
  (see the Roadmap below) so effort could go into the core
  identification/confidence/explainability logic the brief is actually
  evaluating.
- **Gemini is optional, not required.** The system is assumed to run
  correctly with `GEMINI_API_KEY` unset (deterministic fallback) so it
  stays reviewable without handing out API credentials; the LLM layer
  is treated as an enhancement on top of the rule-based engine, not a
  hard dependency.

## 9. Roadmap / Next Milestone

- [x] Define application-specific Socket.IO events (participant
      activity + a normalized timeline feed) on top of the connectivity
      foundation above — see `backend/src/sockets/`
- [x] Implement an AI service HTTP client in the backend
      (`backend/src/clients/aiServiceClient.js`) and domain services
      that call it (`analysis.service.js`, `candidate.service.js`)
- [x] Build out FastAPI routers/services/models in `ai-service/app/`
      (Feature Extraction Service, Candidate Confidence Engine,
      Gemini-backed Candidate Identification)
- [x] Add frontend pages/components for the actual challenge UI
      (`frontend/src/pages/Dashboard.jsx` and its cards)
- [ ] Design and implement upload API (`POST /api/upload`) using the
      existing Multer middleware — configured but not yet wired to a route
- [ ] Add authentication (if required by the challenge spec)
- [ ] Add automated tests (Jest/Vitest for JS, Pytest for Python)
- [ ] Add Docker/Compose setup for one-command local orchestration
- [ ] Add a persistence layer (meeting/participant state is currently
      in-memory only and resets on server restart)
