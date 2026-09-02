# AI Resume Generator & ATS Optimizer — Project Context

## 1. Project Overview

A no-login, browser-based web application that helps job seekers create, refine, and tailor resumes against specific job descriptions using AI. The product combines structured resume building, AI-assisted rewriting, and ATS compatibility analysis into a single guided workflow.

**Stack**: Next.js 15 (App Router) + TypeScript + Tailwind CSS frontend | FastAPI + Python backend | Groq API (Llama 3.3 70B Versatile) for AI | Supabase for persistent storage

**Repository**: `D:\college project` (monorepo with `frontend/` and `backend/`)

---

## 2. Specification Documents (Source of Truth)

Five documents define the product completely. All implementation decisions resolve by re-reading these:

| # | File | Purpose |
|---|---|---|
| 1 | `01_PRD_AI_Resume_Generator.md` | Business rules, user stories, MoSCoW priorities, personas |
| 2 | `02_TRD_AI_Resume_Generator.md` | System architecture, API contracts, folder structure, coding standards |
| 3 | `03_Application_Flow_AI_Resume_Generator.md` | Screen-by-screen behavior, interactions, validation rules, master flowchart |
| 4 | `04_Data_Schema_AI_Resume_Generator.md` | Every field name, type, required/optional status, max-length constraints |
| 5 | `05_Security_AI_Resume_Generator.md` | File upload security, prompt injection protection, XSS prevention, CORS, logging |

---

## 3. Architecture

### 3.1 System Architecture

```
Browser (Next.js 15 SPA)
  ├── Zustand stores (resume, JD, analysis, template state)
  ├── React Hook Form + Zod validation
  ├── Tailwind CSS styling
  └── Typed API client → FastAPI Backend
       ├── /api/v1/resume/parse
       ├── /api/v1/resume/validate
       ├── /api/v1/job-description/analyze
       ├── /api/v1/ai/generate
       ├── /api/v1/analysis/score
       ├── /api/v1/export/pdf
       └── /api/v1/export/docx
            ├── ResumeParserService (PyMuPDF / python-docx)
            ├── JobDescriptionAnalysisService (Groq AI)
            ├── AIOrchestrationService (Groq AI + guardrails)
            ├── ScoringService (deterministic keyword match + Groq AI)
            ├── ExportService (ReportLab PDF / python-docx DOCX)
            └── SupabaseService (persistent storage)
```

### 3.2 Design Principles

- **Clean Architecture**: Business logic isolated from framework code
- **SOLID**: Single-responsibility services, dependency on abstractions
- **Separation of Concerns**: API layer → Service layer → Integration layer
- **Backend as canonical source**: Pydantic models are truth; Zod schemas mirror them
- **Truthfulness guardrail**: AI never introduces skills, employers, dates, metrics not in source content
- **No-login, no persistent user content**: Session-scoped state only (Zustand on frontend, ephemeral request processing on backend)

---

## 4. Backend Implementation Details

### 4.1 Folder Structure

```
backend/
├── app/
│   ├── main.py                          # FastAPI app, CORS, exception handlers, lifespan
│   ├── api/v1/
│   │   ├── resume.py                    # POST /api/v1/resume/parse, /resume/validate
│   │   ├── job_description.py           # POST /api/v1/job-description/analyze
│   │   ├── analysis.py                  # POST /api/v1/analysis/score
│   │   ├── ai.py                        # POST /api/v1/ai/generate
│   │   └── export.py                   # POST /api/v1/export/pdf, /export/docx
│   ├── services/
│   │   ├── resume_parser_service.py     # PDF/DOCX text extraction + AI structuring
│   │   ├── job_description_service.py  # JD text analysis via Groq
│   │   ├── ai_orchestration_service.py  # Central AI generation + guardrail validation
│   │   ├── scoring_service.py           # Deterministic keyword match + AI qualitative scoring
│   │   └── export_service.py            # PDF (ReportLab) and DOCX (python-docx) generation
│   ├── integrations/
│   │   ├── groq_client.py              # Groq API wrapper with retry/timeout
│   │   ├── pdf_parser.py               # PyMuPDF text extraction
│   │   ├── docx_parser.py              # python-docx text extraction
│   │   ├── pdf_generator.py            # ReportLab PDF with HTML escaping + 3 templates
│   │   ├── docx_generator.py           # python-docx DOCX generation + 3 templates
│   │   └── supabase_client.py          # Supabase CRUD for sessions, resumes, JDs, scores
│   ├── prompts/
│   │   ├── resume_structuring_prompt.py # v1.0 - Structuring raw resume text into schema
│   │   ├── job_description_prompt.py    # v1.0 - Extracting skills/responsibilities/keywords
│   │   ├── generation_prompts.py        # v1.0 - 5 generation templates + JD context helper
│   │   └── scoring_prompt.py            # v1.0 - AI qualitative scoring + recommendations
│   ├── models/
│   │   ├── resume.py                    # Resume, PersonalDetails, ExperienceEntry, etc.
│   │   ├── job_description.py           # JobDescriptionInput, JobDescriptionAnalysis, KeywordItem
│   │   ├── analysis.py                  # ATSScoreResult, SubScores, Recommendation, AIGenerationRequest/Result
│   │   ├── errors.py                    # ErrorDetail, ErrorResponse
│   │   └── responses.py                 # ParsedResumeResult, ResumeValidationResult, RootModel wrappers
│   ├── core/
│   │   ├── config.py                    # Settings (env vars), SUPABASE_URL/KEY, GROQ_API_KEY, etc.
│   │   ├── logging.py                   # JSON formatter, correlation ID, sanitized logs
│   │   └── exceptions.py               # AppException hierarchy, error_envelope()
│   └── utils/
│       └── file_validation.py           # MIME signature detection, size validation, temp cleanup
├── supabase_schema.sql                  # CREATE TABLE statements for Supabase
├── requirements.txt                     # All Python dependencies (pinned ranges)
└── tests/
```

### 4.2 Pydantic Models (Canonical Data Schema)

All models match Data Schema Document exactly:

**Resume Schema** (`models/resume.py`):
- `Resume` → `personal_details` (required), `professional_summary` (max 800), `experience[]`, `education[]`, `projects[]`, `skills[]`, `certifications[]`, `achievements[]`, `references[] | ReferencesMode`, `meta` (required)
- `PersonalDetails` → `full_name` (required, max 120), `professional_title` (max 150), `email` (EmailStr), `phone` (max 30), `location` (max 150), `links[]`
- `ExperienceEntry` → `id` (UUID), `company_name` (max 150, required), `job_title` (max 150, required), `start_date` (required), `end_date` (required, accepts "present"), `description_bullets[]` (each max 400), `order_index`
- `EducationEntry` → `id`, `institution_name` (required, max 150), `degree` (required, max 150), `start_date`, `end_date` (accepts "present"/"expected"), `details` (max 300), `order_index`
- `ProjectEntry` → `id`, `project_name` (required, max 150), `link`, `timeframe` (max 60), `description_bullets[]`, `order_index`
- `SkillGroup` → `category_label` (max 60), `skills[]` (each max 60, min 1)
- `CertificationEntry` → `id`, `certification_name` (required, max 150), `issuing_organization`, `date_obtained`, `expiration_date`
- `AchievementEntry` → `id`, `statement` (max 300), `order_index`
- `ReferenceEntry` → `id`, `name` (required, max 120), `relationship` (max 100), `contact_info` (max 150)
- `ReferencesMode` → enum: `"available_upon_request"`
- `ResumeMeta` → `source` (created/uploaded), `created_at`, `updated_at`

**Job Description Schema** (`models/job_description.py`):
- `JobDescriptionInput` → `source_type` (pasted_text/uploaded_file), `raw_text` (max 20000), `job_title`, `company_name`
- `JobDescriptionAnalysis` → `required_skills[]`, `preferred_skills[]`, `responsibilities[]`, `keywords[]`, `analysis_confidence` (high/medium/low)
- `KeywordItem` → `term` (max 80), `importance` (required/preferred), `source_context` (max 200)

**AI Analysis Schema** (`models/analysis.py`):
- `ATSScoreResult` → `overall_score` (0-100), `sub_scores`, `matched_keywords[]`, `missing_required_keywords[]`, `missing_preferred_keywords[]`, `recommendations[]`, `computed_at`, `resume_snapshot_hash`
- `SubScores` → `keyword_coverage` (0-100), `skills_alignment` (0-100), `experience_relevance` (0-100), `formatting_compatibility` (0-100)
- `Recommendation` → `priority` (high/medium/low), `message` (max 300), `related_section` (enum or null)
- `AIGenerationRequest` → `action_type` (5 enum values), `source_content`, `source_bullets[]`, `job_description_analysis`
- `AIGenerationResult` → `generated_content`, `generated_bullets[]`, `guardrail_validated` (bool), `warning_message`

### 4.3 API Endpoints

All under `/api/v1` prefix. Consistent error envelope: `{ "error": { "code", "message", "details" } }`

| Endpoint | Method | Request | Response | Status Codes |
|---|---|---|---|---|
| `/resume/parse` | POST | multipart file (PDF/DOCX) | `ParsedResumeResult` | 200, 413, 415, 422, 502 |
| `/resume/validate` | POST | `{ "resume": Resume }` | `ResumeValidationResult` | 200, 422 |
| `/job-description/analyze` | POST | FormData (text/file + job_title + company_name) | `JobDescriptionAnalysis` | 200, 400, 413, 415, 502 |
| `/ai/generate` | POST | `{ "request": AIGenerationRequest }` | `AIGenerationResult` | 200, 422, 502, 504 |
| `/analysis/score` | POST | `{ "resume": Resume, "job_description_analysis": JobDescriptionAnalysis }` | `ATSScoreResult` | 200, 422, 502 |
| `/export/pdf` | POST | `{ "resume": Resume, "template_id": string }` | Binary PDF stream | 200, 400, 500 |
| `/export/docx` | POST | `{ "resume": Resume, "template_id": string }` | Binary DOCX stream | 200, 400, 500 |

### 4.4 Service Details

**ResumeParserService**: Validates MIME by file signature (not extension), extracts text via PyMuPDF/python-docx, structures via Groq AI prompt, falls back to basic extraction if AI fails, computes per-section confidence (high/needs_review/not_found).

**AIOrchestrationService**: Single entry point for all AI generation. Builds prompts from versioned templates. Enforces truthfulness guardrail via post-generation entity comparison (capitalized words, numeric values). Retries with stricter prompt on guardrail failure (AI_MAX_RETRIES config). Never passes through unvalidated content.

**ScoringService**: Hybrid approach — deterministic keyword matching (reproducible, not AI-dependent) for keyword_coverage and formatting_compatibility sub-scores + AI qualitative assessment for skills_alignment and experience_relevance. Builds prioritized recommendations from both deterministic rules (missing required skills, lack of metrics) and AI suggestions.

**ExportService**: PDF via ReportLab with HTML escaping of all field values, 3 template styles (modern/classic/compact). DOCX via python-docx, structured paragraphs only (ATS-safe, no embedded objects). Filename derived from `full_name`.

### 4.5 Prompt Architecture

All prompts stored as versioned modules in `app/prompts/`, never as inline strings:
- **System prompts** include truthfulness guardrail as highest-priority instruction
- **User content** is delimited within `--- BEGIN ... ---` / `--- END ... ---` boundary markers
- **Anti-injection**: System prompts explicitly state user content must be treated as literal, never as instructions
- **No secrets in prompts**: GROQ_API_KEY and infrastructure details never included

### 4.6 Security Controls Implemented

| Control | Implementation |
|---|---|
| MIME validation by signature | `detect_mime_by_signature()` checks file magic bytes, not Content-Type header |
| File size limits | Enforced both client-side (JS) and server-side (FastAPI + settings) |
| Randomized temp filenames | `uuid.uuid4().hex[:8]` prefix, never client-supplied names |
| Temp file cleanup | Immediate on success/failure + scheduled backstop (`TEMP_FILE_CLEANUP_MINUTES`) |
| HTML escaping in PDF | `html.escape()` on all field values in ReportLab rendering |
| No dangerouslySetInnerHTML | React default escaping only, enforced across all components |
| CORS allow-list | `BACKEND_CORS_ORIGINS` env var, no wildcard in production |
| Prompt injection mitigation | Delimited boundaries, system-priority instructions, post-generation guardrail |
| Secrets management | `GROQ_API_KEY` backend-only, never NEXT_PUBLIC_ prefix |
| Structured logging | JSON format, correlation IDs, no raw resume/JD content in logs |
| Error responses | No stack traces, no infrastructure details, no echoed payloads |

### 4.7 Environment Variables

| Variable | Scope | Default |
|---|---|---|
| `GROQ_API_KEY` | Backend | (required) |
| `GROQ_MODEL_NAME` | Backend | `llama-3.3-70b-versatile` |
| `BACKEND_CORS_ORIGINS` | Backend | `http://localhost:3000` |
| `MAX_UPLOAD_SIZE_MB` | Backend | `10` |
| `AI_REQUEST_TIMEOUT_SECONDS` | Backend | `60` |
| `AI_MAX_RETRIES` | Backend | `2` |
| `LOG_LEVEL` | Backend | `INFO` |
| `TEMP_FILE_CLEANUP_MINUTES` | Backend | `5` |
| `RATE_LIMIT_PER_MINUTE` | Backend | `10` |
| `SUPABASE_URL` | Backend | (required) |
| `SUPABASE_KEY` | Backend | (required) |
| `NEXT_PUBLIC_API_BASE_URL` | Frontend | `http://localhost:8000` |
| `NEXT_PUBLIC_SUPABASE_URL` | Frontend | (required) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Frontend | (required) |

### 4.8 Supabase Schema

Tables created in `supabase_schema.sql`:
- `sessions` — anonymous session tracking (id, created_at, last_active_at, ip_hash)
- `resumes` — full resume JSON stored in JSONB columns (id, session_id, personal_details, professional_summary, experience, education, projects, skills, certifications, achievements, references_data, meta, source)
- `job_descriptions` — JD data + analysis results (id, session_id, resume_id, source_type, raw_text, job_title, company_name, analysis JSONB)
- `ats_scores` — score results (id, session_id, resume_id, job_description_id, overall_score, sub_scores JSONB, matched/missing keywords, recommendations JSONB, resume_snapshot_hash)
- `ai_generation_logs` — metadata only, no content (id, session_id, action_type, guardrail_validated)
- `rate_limit_counters` — ephemeral rate limiting (client_identifier, window_start_at, request_count)
- Auto-cleanup function: `cleanup_old_sessions()` deletes sessions idle > 24 hours

---

## 5. Frontend Implementation Details

### 5.1 Folder Structure

```
frontend/
├── app/
│   ├── layout.tsx                       # Root layout with metadata
│   ├── globals.css                      # Tailwind imports + CSS variables
│   ├── page.tsx                         # Landing page (hero + 4-step guide)
│   ├── build/page.tsx                   # Resume builder with sidebar navigator
│   ├── upload/page.tsx                  # Drag-and-drop resume upload
│   ├── job-description/page.tsx         # JD paste/upload + analysis trigger
│   ├── analysis/page.tsx                # ATS score display + keyword match + recommendations
│   └── preview/page.tsx                 # Template selection + live preview + export modal
├── features/
│   ├── resume-builder/
│   │   ├── components/
│   │   │   ├── PersonalDetailsSection.tsx
│   │   │   ├── SummarySection.tsx
│   │   │   ├── ExperienceSection.tsx
│   │   │   ├── EducationSection.tsx
│   │   │   ├── ProjectsSection.tsx
│   │   │   ├── SkillsSection.tsx
│   │   │   ├── CertificationsSection.tsx
│   │   │   ├── AchievementsSection.tsx
│   │   │   └── ReferencesSection.tsx
│   │   ├── hooks/
│   │   │   └── useResumeBuilder.ts
│   │   └── api.ts
│   ├── resume-upload/
│   │   ├── hooks/
│   │   │   └── useResumeUpload.ts
│   │   └── api.ts
│   ├── job-description/
│   │   ├── hooks/
│   │   │   └── useJobDescriptionAnalysis.ts
│   │   └── api.ts
│   ├── ai-analysis/
│   │   ├── components/
│   │   │   └── AISuggestionPanel.tsx     # Reusable accept/edit/discard pattern
│   │   ├── hooks/
│   │   │   ├── useAIGeneration.ts
│   │   │   └── useScoring.ts
│   │   └── api.ts
│   ├── template-preview/
│   │   └── hooks/
│   │       └── useTemplateSelection.ts
│   └── export/
│       ├── hooks/
│       │   └── useExport.ts
│       └── api.ts
├── components/ui/
│   ├── Button.tsx                        # Variants: primary/secondary/ghost/danger, sizes, loading
│   ├── TextInput.tsx                     # Label + error + helper text
│   ├── TextArea.tsx                      # Label + error + helper text
│   ├── Card.tsx                          # Card, CardHeader, CardContent
│   ├── Modal.tsx                         # Overlay modal with title + close
│   ├── ProgressIndicator.tsx             # Staged progress + Spinner + LoadingOverlay
│   └── Badge.tsx                         # success/warning/error/info/neutral
├── stores/
│   ├── useResumeStore.ts                 # Full resume CRUD + section-level helpers
│   ├── useJobDescriptionStore.ts         # JD input + analysis + loading/error
│   ├── useAnalysisStore.ts               # ATS score + staleness tracking
│   └── useTemplateStore.ts               # Selected template + zoom level
├── lib/
│   ├── api-client.ts                     # Typed API client (all 7 endpoints)
│   ├── supabase.ts                       # Supabase client + Database type
│   ├── schemas/
│   │   ├── resume.ts                     # Zod schemas for all resume models
│   │   ├── job_description.ts            # Zod schemas for JD models
│   │   ├── analysis.ts                    # Zod schemas for AI analysis models
│   │   ├── api.ts                        # Zod schemas for API response models
│   │   └── index.ts                      # Re-exports
│   └── utils/
│       └── helpers.ts                    # generateId, formatDate, downloadBlob, isExportReady, getScoreColor
├── types/
│   ├── resume.ts                         # TypeScript interfaces for Resume schema
│   ├── job_description.ts                # TypeScript interfaces for JD schema
│   ├── analysis.ts                       # TypeScript interfaces for AI analysis schema
│   ├── api.ts                            # TypeScript interfaces for API responses
│   └── index.ts                          # Re-exports
```

### 5.2 Zustand Stores

**useResumeStore**: Full `Resume` object in state. Methods: `setResume`, `updatePersonalDetails`, `setProfessionalSummary`, `addExperience/updateExperience/removeExperience/reorderExperience`, same for education/projects/certifications/achievements, `addSkillGroup/updateSkillGroup/removeSkillGroup`, `setReferences`, `resetResume`, `loadParsedResume`. Tracks `dirty` flag and auto-updates `meta.updated_at`.

**useJobDescriptionStore**: `input` (JobDescriptionInput), `analysis` (JobDescriptionAnalysis | null), `isLoading`, `error`. Methods: `setInput`, `setAnalysis`, `setLoading`, `setError`, `reset`.

**useAnalysisStore**: `scoreResult` (ATSScoreResult | null), `isLoading`, `error`, `isStale` (marks stale when resume changes after scoring). Methods: `setScoreResult`, `setLoading`, `setError`, `markStale`, `reset`.

**useTemplateStore**: `selectedTemplateId` (default "modern"), `zoom` (default 100). Methods: `setTemplate`, `setZoom` (clamped 50-150).

### 5.3 AISuggestionPanel Component

Reusable pattern used across Summary, Experience, Projects, and Achievements sections:
- **Props**: `actionType`, `sourceContent`, `sourceBullets`, `onAccept(content)`, `onAcceptBullets(bullets)`, `onDiscard`, `onClose`
- **States**: Loading → Result display → Accept/Edit/Discard
- **Behavior**: Calls `/api/v1/ai/generate`, shows generated content alongside original, offers 3 explicit actions
- **Guardrail failure handling**: Shows specific warning message, offers retry
- **JD context**: Automatically includes job description analysis when available, shows "Tailored to: [Job Title]"

### 5.4 Page Behaviors

**Landing Page** (`/`): Hero headline, 4-step how-it-works, "Get Started" CTA → routes to `/build`

**Build Page** (`/build`): Sidebar navigator with 9 sections (Personal Details → References). Section completion indicators (✓/Required badge). Auto-saves to Zustand on every field change. Next/Previous navigation. Quick links to JD input and Preview.

**Upload Page** (`/upload`): Drag-and-drop dropzone, client-side validation (type + size), "Upload & Parse" triggers backend, staged progress messages ("Reading your file..." → "Identifying sections..." → "Structuring your experience..."), on success loads parsed resume into store and redirects to `/build`.

**Job Description Page** (`/job-description`): Tab toggle (paste/upload), optional job title + company name, "Analyze" triggers backend, on success redirects to `/analysis`. "Skip for Now" option.

**Analysis Page** (`/analysis`): Shows JD analysis summary (required/preferred skills, responsibilities, confidence badge). "Analyze My Resume" triggers scoring. Displays ATS score gauge (0-100), sub-score bars, recommendations with priority badges and section click-through, keyword matching (matched/missing required/missing preferred) with expandable detail.

**Preview Page** (`/preview`): Left panel with template selection (Modern/Classic/Compact, ATS-safe badges), zoom slider, Export button, Edit/Score links. Right panel with live resume preview (A4-formatted, template-aware rendering). Export modal with PDF/DOCX format choice, download triggers, success/error states.

### 5.5 Client-Side Validation Rules

- `personal_details.full_name` required for export
- At least one of experience/education/projects required for export
- File uploads: PDF/DOCX only, max 10MB (client + server)
- JD analysis: non-empty text or file selected before "Analyze" enabled
- AI actions disabled when source content is empty (with tooltip explanation)

---

## 6. Data Flow (End-to-End Session)

1. User lands on `/` → clicks "Get Started" → `/build` with empty resume in Zustand
2. User fills Personal Details → auto-saved to `useResumeStore`
3. User fills sections (Summary with AI improve, Experience with bullet rewrites, etc.)
4. **OR** user goes to `/upload` → uploads file → backend parses → loads into store → redirects to `/build`
5. User navigates to `/job-description` → pastes JD → backend analyzes → stores in `useJobDescriptionStore`
6. User goes to `/analysis` → triggers scoring → `ScoringService` computes deterministic + AI scores → stores in `useAnalysisStore`
7. User reviews ATS score, clicks recommendations → back to `/build` to edit
8. User triggers AI rewrites via `AISuggestionPanel` → `AIOrchestrationService` generates with guardrails → user accepts/edits/discards → updates `useResumeStore`
9. User goes to `/preview` → selects template → live preview renders from store
10. User clicks Export → client-side validation → backend generates PDF/DOCX → browser downloads file
11. Success state offers second format export or further editing

---

## 7. Current Status

### 7.1 Completed (All Features)

- [x] Monorepo scaffolding (frontend/ + backend/)
- [x] Backend Pydantic models matching Data Schema Document exactly
- [x] Backend core (config, logging, exceptions, error envelope)
- [x] All 7 API endpoints under `/api/v1`
- [x] All 5 backend services (Parser, JD Analysis, AI Orchestration, Scoring, Export)
- [x] All 4 prompt templates with truthfulness guardrails
- [x] All backend integrations (Groq, PDF/DOCX parsers, PDF/DOCX generators, Supabase)
- [x] Frontend TypeScript types mirroring all backend Pydantic models
- [x] Frontend Zod schemas mirroring all backend Pydantic models
- [x] 4 Zustand stores (Resume, JD, Analysis, Template)
- [x] 7 UI primitives (Button, TextInput, TextArea, Card, Modal, ProgressIndicator, Badge)
- [x] Landing page
- [x] Resume Builder with all 9 sections
- [x] Resume Upload + Parsing pipeline
- [x] Job Description Input + Analysis pipeline
- [x] AISuggestionPanel (accept/edit/discard) integrated into Summary, Experience, Projects, Achievements
- [x] ATS Score + Keyword Matching screens
- [x] Template Selection (Modern/Classic/Compact) + Live Preview + Zoom
- [x] PDF + DOCX Export
- [x] Supabase integration (backend client + frontend client + SQL schema)
- [x] Security controls (MIME validation, temp file cleanup, HTML escaping, CORS, prompt injection mitigation)

### 7.2 Build Status

- **Frontend**: `npm run build` passes with 0 errors, 7 routes generated
- **Backend**: `uvicorn app.main:app` starts successfully, `/health` returns 200, all 12 routes registered
- **Python dependency conflict resolved**: `httpx>=0.24.0,<0.28` compatible with both `groq` and `supabase`

### 7.3 Known Limitations / TODO

- **Tests**: No automated tests written yet (`backend/tests/` is empty)
- **Rate limiting**: `slowapi` imported but not wired into routes yet
- **Supabase persistence**: Backend `SupabaseService` implemented but not yet called from API routes (routes still operate in stateless mode)
- **Scheduled cleanup**: Background temp file cleanup function exists but not scheduled as a recurring task
- **Resume upload file → Supabase storage**: Uploaded files are parsed and discarded, not stored in Supabase Storage
- **CSS variables**: Some Tailwind hardcoded colors could be further consolidated into CSS variables
- **Mobile responsiveness**: Layout works but not extensively tested on mobile viewports
- **Error boundary**: No React error boundary component for graceful frontend crash handling

---

## 8. How to Run

### Backend

```bash
cd backend
pip install -r requirements.txt
# Create .env with GROQ_API_KEY, SUPABASE_URL, SUPABASE_KEY
uvicorn app.main:app --reload
# Server at http://127.0.0.1:8000
# API docs at http://127.0.0.1:8000/docs
```

### Frontend

```bash
cd frontend
npm install
# .env.local already has NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
npm run dev
# App at http://localhost:3000
```

### Supabase Setup

1. Create a Supabase project at https://supabase.com
2. Run the SQL in `backend/supabase_schema.sql` in the SQL Editor
3. Copy the project URL and anon key into backend `.env` and frontend `.env.local`

---

## 9. Coding Standards

- **TypeScript**: Strict mode, `any` disallowed, PascalCase components, camelCase functions, SCREAMING_SNAKE_CASE constants
- **Python**: PEP 8, snake_case functions, PascalCase classes, UPPER_SNAKE_CASE constants
- **Field names**: `snake_case` in JSON wire format and backend models; frontend API client handles any `camelCase` translation internally
- **All backend service files**: Module-level docstring describing single responsibility
- **All exported functions/components**: Explicit type annotations
- **No comments**: Unless explicitly requested (per coding standard)
- **Logging**: `extra={"detail": ...}` (never `extra={"message": ...}` — conflicts with Python LogRecord)
