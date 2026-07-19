# Prep Desk — AI Interview Readiness Platform

An end-to-end interview prep tool. Paste a job description (and optionally your resume), and it will:

- **Score your fit** for the role (0–100) with an explanation, matched skills, and skill gaps
- **Generate likely interview questions** — technical and behavioral, tailored to the JD and your gaps
- **Build a day-by-day study plan** for however many days you have left, with a progress tracker
- **Rewrite your resume** to be ATS-friendly and tailored to the role, exportable as a polished PDF (3 templates)
- **Save everything** to your account — every analysis, plan, and resume version, with auth and history

All of the "intelligence" (scoring, questions, plans, resume rewriting) is powered by **Mistral AI**.
**You only need to add your API key — everything else is already wired up.**

---

## 1. Architecture

```
interview-platform/
├── backend/                  FastAPI + SQLite + Mistral AI (via httpx REST calls)
│   ├── app/
│   │   ├── main.py           FastAPI app, CORS, router registration
│   │   ├── config.py         Settings, loads backend/.env
│   │   ├── database.py       SQLAlchemy engine/session
│   │   ├── models_db.py      ORM models: User, Analysis, StudyPlan, Resume
│   │   ├── schemas.py        Pydantic request/response models
│   │   ├── auth.py           JWT + password hashing
│   │   ├── llm.py            Mistral API client (JSON-mode chat completions over REST)
│   │   ├── services/
│   │   │   ├── analyzer.py   Prompt + logic: JD/resume match, questions
│   │   │   ├── planner.py    Prompt + logic: day-by-day study plan
│   │   │   ├── resume_ai.py  Prompt + logic: ATS resume rewrite
│   │   │   └── pdf_render.py Jinja2 HTML render → calls the node PDF service
│   │   ├── templates_resume/ 3 HTML resume templates (classic/modern/compact)
│   │   ├── routers/          auth, analyze, plan, resume endpoints
│   │   └── utils/file_extract.py   PDF/DOCX/TXT resume text extraction
│   ├── pdf_service/
│   │   ├── generate_pdf.js   Puppeteer: HTML file → PDF file
│   │   └── package.json
│   └── requirements.txt
│
└── frontend/                 React + Vite (no UI framework, hand-styled)
    └── src/
        ├── lib/api.js         Fetch wrapper with JWT auth
        ├── lib/auth-context.jsx
        └── components/        NewAnalysis, AnalysisResult, PlanNew/View,
                                ResumeBuilder/Detail, History, AuthPage, ScoreGauge
```

The backend never fabricates resume content — the resume rewrite prompt is instructed to only
rephrase/reorganize/quantify what you actually provided, never invent employers or skills.

---

## 2. Prerequisites

- **Python 3.10+**
- **Node.js 18+** and npm (for both the frontend and the Puppeteer PDF service)
- A **Mistral API key** — get one at https://console.mistral.ai/

---

## 3. Setup

### 3.1 Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
```

Open `backend/.env` and set your key:

```
MISTRAL_API_KEY=your-mistral-key-here
```

**Presenting/demoing and worried about rate limits?** Add multiple comma-separated keys instead —
requests automatically round-robin across them, and if one gets rate-limited mid-demo it fails over
to the next one on the very next request:

```
MISTRAL_API_KEYS=key-one,key-two,key-three
```

Then set up email — **required**, since new accounts must verify a one-time code sent to their inbox,
and password reset also works by emailed code. Any SMTP provider works; the easiest is Gmail with an
[App Password](https://myaccount.google.com/apppasswords) (your regular Gmail password won't work):

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=you@gmail.com
SMTP_PASSWORD=your-16-character-app-password
SMTP_FROM_EMAIL=you@gmail.com
```

Then start the API:

```bash
uvicorn app.main:app --reload --port 8000
```

The SQLite database (`interview.db`) and a persistent JWT secret are created automatically on first run.

### 3.2 PDF service (Puppeteer)

```bash
cd backend/pdf_service
npm install
```

This downloads a bundled Chromium the first time (needs normal internet access) — after that, resume
PDF export works standalone. The FastAPI backend calls this script as a subprocess; you don't run it
directly.

> **Restricted network / corporate proxy?** If the Chromium download is blocked, install a system
> Chromium/Chrome and point Puppeteer at it instead of downloading its own:
> ```bash
> PUPPETEER_SKIP_DOWNLOAD=true npm install
> export PUPPETEER_EXECUTABLE_PATH=/path/to/chrome-or-chromium
> ```
> Set `PUPPETEER_EXECUTABLE_PATH` in the environment the backend runs in (e.g. add it to `backend/.env`
> loading, or export it in your shell before starting uvicorn).

### 3.3 Frontend

```bash
cd frontend
npm install
cp .env.example .env     # defaults to http://localhost:8000, change if needed
npm run dev
```

Visit **http://localhost:5173**, create an account, enter the code emailed to you, and go.

---

## 4. Environment variables

**`backend/.env`**

| Variable | Required | Default | Notes |
|---|---|---|---|
| `MISTRAL_API_KEY` | **Yes**¹ | — | Enables all AI features. Without it, AI endpoints return a clear 400 error telling you to add it. |
| `MISTRAL_API_KEYS` | No | — | Comma-separated list of multiple keys to round-robin/fail over across. Takes priority over `MISTRAL_API_KEY` if set. |
| `MISTRAL_MODEL` | No | `mistral-large-latest` | Override the model used for every AI call. |
| `SMTP_HOST` / `SMTP_PORT` | **Yes** | — | SMTP server for sending OTP emails (signup verification, password reset). |
| `SMTP_USERNAME` / `SMTP_PASSWORD` | **Yes** | — | SMTP login credentials (for Gmail, use an App Password). |
| `SMTP_FROM_EMAIL` / `SMTP_FROM_NAME` | **Yes**² / No | — / `Prep Desk` | The "from" address/name on OTP emails. |
| `OTP_EXPIRE_MINUTES` | No | `10` | How long a verification/reset code stays valid. |
| `CORS_ORIGINS` | No | `http://localhost:5173,http://127.0.0.1:5173` | Comma-separated allowed frontend origins. |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No | `10080` (7 days) | JWT session length. |
| `DATABASE_URL` | No | local SQLite file | Point at Postgres/MySQL if you outgrow SQLite. |
| `JWT_SECRET` | No | auto-generated | Auto-created and persisted into `.env` on first run — don't need to set it. |

¹ Either `MISTRAL_API_KEY` or `MISTRAL_API_KEYS` must be set.
² Registration and login won't work at all without SMTP configured, since every account must verify
an emailed code before it can sign in.

**`frontend/.env`**

| Variable | Default |
|---|---|
| `VITE_API_URL` | `http://localhost:8000` |

---

## 5. API overview

All routes except the ones under `/api/auth/` below require `Authorization: Bearer <token>`.

| Method & path | Purpose |
|---|---|
| `POST /api/auth/register` | Create account (unverified) — sends a 6-digit email code |
| `POST /api/auth/verify-otp` | Verify the signup code → returns a session token |
| `POST /api/auth/resend-otp` | Resend a code (`purpose`: `register` or `reset`) |
| `POST /api/auth/login` | Sign in — 403 with a clear message if not yet verified |
| `POST /api/auth/forgot-password` | Send a password-reset code by email |
| `POST /api/auth/reset-password` | Reset password with the emailed code → returns a session token |
| `GET /api/auth/me` | Current user |
| `POST /api/resume/extract` | Extract text from an uploaded `.pdf`/`.docx`/`.txt` resume |
| `POST /api/analyze` | JD + resume → match score, skills, questions (saved to history) |
| `GET /api/history/analyses` | List your past analyses |
| `POST /api/plan` | Generate a day-by-day study plan |
| `PATCH /api/plan/{id}/progress` | Mark a day complete/incomplete |
| `GET /api/resume/templates` | List available resume templates |
| `POST /api/resume/improve` | AI-rewrite a resume for a target role (auto-fills the page) |
| `POST /api/resume/preview` | Render resume JSON → HTML (for in-browser preview / template gallery) |
| `POST /api/resume` | Save a resume version |
| `POST /api/resume/pdf` | Render resume JSON → downloadable PDF |
| `GET /api/resume/{id}/pdf` | Re-download a saved resume as PDF |

Interactive docs: **http://localhost:8000/docs**

---

## 6. Feature list (already built)

- A public marketing landing page (hero, features, how-it-works)
- Full email-verified auth: signup sends a 6-digit code, login blocks unverified accounts, and
  forgot-password works the same way via an emailed reset code
- Multi-key support for Mistral — configure several API keys and requests automatically round-robin
  across them and fail over on rate limits, so a live demo doesn't get cut off by one key's limit
- AI-powered match scoring, skill-gap detection, and question generation
- Personalized day-by-day study plans with a per-day progress tracker
- ATS resume rewriting that **reuses the resume you already uploaded during analysis** — no re-pasting;
  it runs automatically off your existing text and the JD's skill gaps
- Resume rewriting is tuned to **fill exactly one A4 page** — sparse drafts automatically get a second,
  truthful expansion pass so there's no empty white space, without ever fabricating experience
- Live template gallery (see all 3 layouts rendered with your real content before picking one) and a
  full-size preview modal before you download
- PDF export via Puppeteer, with clear, actionable error messages if Node/Puppeteer/Chromium aren't set up yet
- Every analysis, plan, and resume saved to your account history
- Resume upload (`.pdf` / `.docx` / `.txt`) with automatic text extraction
- Copy-to-clipboard on each generated interview question

## 7. Ideas for what to add next

- **Mock interview mode** — timed Q&A with self-rating and notes per question
- **Company-specific question packs** — scrape/curate real questions per company
- **LinkedIn import** — pull your profile straight in instead of pasting text
- **Editable saved resumes** — currently saved resumes are view/download only; wire the builder's
  edit form up to load an existing saved resume
- **Team/coach mode** — share an analysis + plan with a mentor for feedback
- **Calendar integration** — push each study day to Google/Outlook calendar with reminders
- **Analytics dashboard** — track match-score trends across multiple job applications over time
- **Streaming AI responses** — stream the analysis/plan/resume generation token-by-token instead of
  waiting for the full response
- **Rate-limit backoff/queueing** — currently a rate-limited key is just skipped for that request;
  a smarter version could temporarily "cool down" a key and prefer others for a few minutes

---

## 8. Troubleshooting

- **"AI features are not enabled"** — you haven't set `MISTRAL_API_KEY` (or `MISTRAL_API_KEYS`) in
  `backend/.env`, or you need to restart uvicorn after adding it.
- **"All configured Mistral API key(s) are currently rate-limited"** — every key you've configured hit
  its limit at the same time. Add another key to `MISTRAL_API_KEYS`, or wait a bit.
- **Registration/login fails with an email error** — SMTP isn't configured (or the credentials are
  wrong). Set `SMTP_HOST`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_FROM_EMAIL` in `backend/.env`. For
  Gmail, you must use an [App Password](https://myaccount.google.com/apppasswords), not your normal password.
- **Didn't receive the OTP email** — check spam, then use "Resend code" on the verification screen;
  codes expire after `OTP_EXPIRE_MINUTES` (default 10).
- **"Puppeteer isn't installed yet"** — run `npm install` inside `backend/pdf_service` once.
- **"Puppeteer's bundled Chromium isn't installed"** — run
  `cd backend/pdf_service && npx puppeteer browsers install chrome`, or set `PUPPETEER_EXECUTABLE_PATH`
  to a system Chrome/Chromium binary (see §3.2).
- **"Node.js is not installed or not on PATH"** — install Node 18+ and make sure `node` is on your PATH;
  the FastAPI backend shells out to it for PDF generation.
- **CORS errors in the browser console** — make sure `frontend/.env`'s `VITE_API_URL` matches where
  uvicorn is actually running, and that it's included in `backend/.env`'s `CORS_ORIGINS`.
