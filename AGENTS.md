# AI Resume Generator — Quick Context Reference

> **Read this file first.** It contains everything needed to work on this project without reading the source code. Updated 5 Sep 2026.

---

## Project Identity

- **Name**: ResumeForge / AI Resume Generator & ATS Optimizer
- **Type**: College project, solo developer
- **Repo**: `D:\college project` (monorepo: `frontend/` + `backend/`)
- **Live Frontend**: https://ai-resume-generator-iota-gules.vercel.app
- **Live Backend**: https://ai-resume-generator-q9y3.onrender.com
- **Stack**: Next.js 15 (App Router) + TypeScript + Tailwind CSS v4 | FastAPI + Python 3.11 | Groq API (groq/compound-mini) | Supabase Auth + PostgreSQL

---

## Architecture in 10 Lines

```
Browser → Next.js 15 (App Router, client components)
  ├── Zustand stores (resume, JD, analysis, template)
  ├── Shared Header with mobile hamburger
  ├── RequireAuth wraps protected pages
  └── Typed api-client.ts → FastAPI Backend (/api/v1/*)
       ├── ResumeParserService (PyMuPDF / python-docx + Groq)
       ├── AIOrchestrationService (Groq + truthfulness guardrail + retry)
       ├── ScoringService (deterministic keyword match + Groq)
       ├── ExportService (ReportLab PDF / python-docx DOCX)
       └── SupabaseService (auth + resumes/JD/scores CRUD)
```

Auth: Supabase Auth (Google OAuth + email/password). Client-side implicit flow. Session persisted in cookies. `RequireAuth` component on protected routes. No middleware.

---

## Routes

### Frontend (8 pages + 1 API)

| URL | File | Auth | Description |
|---|---|---|---|
| `/` | `app/page.tsx` | No | Landing page |
| `/login` | `app/login/page.tsx` | No | Google OAuth + email/password |
| `/auth/callback` | `app/auth/callback/page.tsx` | No | OAuth redirect handler |
| `/dashboard` | `app/dashboard/page.tsx` | Yes | User dashboard with saved resumes |
| `/build` | `app/build/page.tsx` | Yes | 9-section resume builder |
| `/upload` | `app/upload/page.tsx` | Yes | Drag-and-drop PDF/DOCX upload + parse |
| `/job-description` | `app/job-description/page.tsx` | Yes | JD paste/upload + analysis |
| `/analysis` | `app/analysis/page.tsx` | Yes | ATS score + keywords + recommendations |
| `/preview` | `app/preview/page.tsx` | Yes | Template select + live preview + export |
| `/api/health` | `app/api/health/route.ts` | No | Health check |

All auth-gated pages use shared `Header` component (mobile hamburger + 6 nav items + avatar + sign-out).

### Backend (7 endpoints under `/api/v1`)

| Endpoint | Method | Request Body | Notes |
|---|---|---|---|
| `/resume/parse` | POST | FormData (file) | PDF/DOCX → structured resume |
| `/resume/validate` | POST | `{resume: Resume}` | Validation only |
| `/job-description/analyze` | POST | FormData (text/file) | Extracts skills, keywords |
| `/ai/generate` | POST | `{action_type, source_content, source_bullets, job_description_analysis}` | **Top-level fields, NOT nested** |
| `/analysis/score` | POST | `{resume, job_description_analysis}` | Hybrid deterministic + AI scoring |
| `/export/pdf` | POST | `{resume, template_id}` | Returns binary PDF |
| `/export/docx` | POST | `{resume, template_id}` | Returns binary DOCX |

Error envelope: `{"error":{"code":"","message":"","details":null}}`

---

## Key File Map

### Backend (`backend/app/`)

| Path | Purpose |
|---|---|
| `main.py` | FastAPI app, CORS (allow_origins from env + hardcoded Vercel URL), exception handlers |
| `core/config.py` | Pydantic Settings. `cors_origins_list` always includes production Vercel URL. `GROQ_MODEL_NAME` default = `groq/compound-mini` |
| `integrations/groq_client.py` | Groq API wrapper. **Auto-fallback**: if model 404s, retries with `groq/compound-mini` |
| `services/ai_orchestration_service.py` | AI generation + truthfulness guardrail (entity comparison) + retry on guardrail failure |
| `services/scoring_service.py` | Hybrid: deterministic keyword match + AI qualitative scoring |
| `services/export_service.py` | ReportLab PDF + python-docx DOCX, 3 templates (modern/classic/compact) |
| `models/analysis.py` | `AIGenerationRequest`: action_type (5 enum) + optional source_content, source_bullets, job_description_analysis |
| `models/resume.py` | Resume, PersonalDetails, ExperienceEntry, EducationEntry, ProjectEntry, SkillGroup, etc. |
| `prompts/` | 4 versioned prompt modules (never inline strings) |

### Frontend (`frontend/`)

| Path | Purpose |
|---|---|
| `app/layout.tsx` | Root layout: AuthProvider + ErrorBoundary |
| `app/globals.css` | Tailwind v4 + custom design tokens + responsive typography |
| `components/layout/Header.tsx` | **Shared** responsive header with mobile hamburger drawer |
| `components/auth/RequireAuth.tsx` | Redirects to /login if no user, shows spinner while loading |
| `lib/auth.tsx` | AuthProvider context: signInWithGoogle, signInWithEmail, signUpWithEmail, signOut |
| `lib/api-client.ts` | Typed API client. **Note**: `aiGenerate()` sends request body at top level (NOT wrapped in `{request:...}`) |
| `lib/supabase.ts` | Supabase client with `persistSession: true, flowType: "implicit"` |
| `lib/supabase/data.ts` | `use client` — saveResumeToSupabase, loadResumesFromSupabase, deleteResumeFromSupabase, etc. |
| `stores/useResumeStore.ts` | Full resume CRUD + dirty tracking + auto-updated timestamps |
| `stores/useJobDescriptionStore.ts` | JD input + analysis + loading/error |
| `stores/useAnalysisStore.ts` | ATS score + staleness tracking |
| `stores/useTemplateStore.ts` | Selected template + zoom (50-150) |
| `features/ai-analysis/components/AISuggestionPanel.tsx` | Accept/Edit/Discard pattern for AI suggestions |

---

## Critical Gotchas (bugs we already fixed)

| Gotcha | What happened | The fix |
|---|---|---|
| `.gitignore` `build/` pattern | Matched `frontend/app/build/`, excluding the resume builder route from git — 404 on `/build` in production | Changed to `/build/` in `.gitignore` |
| CORS origin missing | `BACKEND_CORS_ORIGINS` only had `localhost:3000`, production Vercel URL blocked | Hardcoded production URL in `cors_origins_list` as always-include fallback |
| AI request body wrapping | Frontend sent `{request:{...}}`, backend expected `{...}` at top level — 422 validation | Changed `body: { request }` → `body: request` in `api-client.ts` |
| Groq model deprecated | `llama-3.3-70b-versatile` removed from Groq API — 404 on all AI calls | Default changed to `groq/compound-mini` + auto-fallback on 404 in `groq_client.py` |
| Open redirect in login | `redirect` query param accepted any URL | Now validates `redirectTo.startsWith("/")` |
| CORS `allow_methods`/`allow_headers` too narrow | Only GET/POST/OPTIONS + specific headers — preflight failures | Changed to `["*"]` for both |

---

## Environment Variables

### Backend (`.env` + Render dashboard)

| Variable | Current Value | Notes |
|---|---|---|
| `GROQ_API_KEY` | gsk_1iYb3j... | Must be set in Render |
| `GROQ_MODEL_NAME` | `groq/compound-mini` | Default in code; Render may still have old `llama-3.3-70b-versatile` — fallback handles this |
| `BACKEND_CORS_ORIGINS` | `http://localhost:3000,https://ai-resume-generator-iota-gules.vercel.app` | Code always adds Vercel URL even if env var is stale |
| `SUPABASE_URL` | https://tcaemfebpkytedbhzqqs.supabase.co | Must be set in Render |
| `SUPABASE_KEY` | (service_role key) | Must be set in Render |

### Frontend (`.env.local` + Vercel dashboard)

| Variable | Value | Notes |
|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | `http://localhost:8000` | Must be set to Render URL in Vercel: `https://ai-resume-generator-q9y3.onrender.com` |
| `NEXT_PUBLIC_SUPABASE_URL` | https://tcaemfebpkytedbhzqqs.supabase.co | Must be set in Vercel |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | (anon key) | Must be set in Vercel |

---

## Coding Conventions

- **TypeScript**: Strict mode, no `any`, PascalCase components, camelCase functions
- **Python**: PEP 8, snake_case functions, PascalCase classes
- **JSON field names**: `snake_case` everywhere (no camelCase translation)
- **No comments** unless explicitly requested
- **Logging**: `extra={"detail": ...}` (never `extra={"message": ...}`)
- **AI prompts**: Always in `app/prompts/` modules, never inline strings
- **Auth pattern**: Client-side `RequireAuth` component wrapping protected pages, no middleware

---

## How to Run Locally

```bash
# Backend
cd backend && pip install -r requirements.txt && uvicorn app.main:app --reload
# → http://127.0.0.1:8000

# Frontend
cd frontend && npm install && npm run dev
# → http://localhost:3000
```

---

## What's Not Done Yet

- **Tests**: `backend/tests/` is empty, no frontend tests
- **Rate limiting**: `slowapi` imported but not wired
- **Supabase persistence**: Service exists but API routes don't call it (stateless mode)
- **Saved resume editing**: Dashboard "Edit" button resets to empty instead of loading saved resume
- **Undo/redo**: No history stack in resume builder
- **Auto-save**: No periodic save to Supabase when resume is dirty

---

## Spec Documents (deep detail)

Read these only when you need exact field constraints, validation rules, or security specs:

1. `01_PRD_AI_Resume_Generator.md` — Business rules, personas, MoSCoW priorities
2. `02_TRD_AI_Resume_Generator.md` — Architecture, API contracts, coding standards
3. `03_Application_Flow_AI_Resume_Generator.md` — Screen-by-screen behavior
4. `04_Data_Schema_AI_Resume_Generator.md` — Every field name, type, max-length
5. `05_Security_AI_Resume_Generator.md` — Upload security, CORS, XSS, prompt injection
