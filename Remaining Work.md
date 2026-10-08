# Remaining Work — AI Resume Generator & ATS Optimizer

**Last Updated:** 4 September 2026

---

## 1. Automated Testing (High Priority)

### 1.1 Backend Tests

The `backend/tests/` directory is currently empty. No automated tests exist.

- [ ] **Unit tests for services** — ResumeParserService, JobDescriptionAnalysisService, AIOrchestrationService, ScoringService, ExportService
- [ ] **Unit tests for integrations** — GroqClient (mock API responses), PDF parser, DOCX parser, PDF generator, DOCX generator, Supabase client
- [ ] **Unit tests for guardrails** — Verify truthfulness guardrail rejects fabricated entities, accepts valid rephrasings, retries correctly on failure
- [ ] **API endpoint tests** — All 7 endpoints with valid/invalid/missing inputs, file upload edge cases, auth token handling
- [ ] **Integration test** — End-to-end flow: upload resume → parse → add JD → score → AI rewrite → export PDF

### 1.2 Frontend Tests

- [ ] Component tests for all UI primitives (Button, TextInput, TextArea, Card, Modal, Badge)
- [ ] Page-level tests for all 8 routes
- [ ] Store tests for all 4 Zustand stores (resume CRUD, JD state, analysis state, template state)
- [ ] API client tests with mocked fetch responses
- [ ] Auth flow tests (login, logout, session persistence, protected route redirect)

---

## 2. Backend Hardening (High Priority)

### 2.1 Rate Limiting

`slowapi` is imported in `main.py` but **not wired into any routes**.

- [ ] Apply rate limiter to all `/api/v1/*` endpoints
- [ ] Configure per-endpoint limits (e.g., stricter on `/ai/generate` due to Groq costs)
- [ ] Return proper 429 responses with retry-after headers

### 2.2 Supabase Persistence

The `SupabaseService` is implemented but **not called from any API route**. All routes operate in stateless mode.

- [ ] Wire `saveResumeToSupabase` into resume creation flow
- [ ] Wire `saveJobDescriptionToSupabase` into JD analysis flow
- [ ] Wire `saveAtsScoreToSupabase` into scoring flow
- [ ] Wire `loadResumesFromSupabase` into dashboard data loading
- [ ] Wire `deleteResumeFromSupabase` into resume deletion

### 2.3 Background Tasks

- [ ] Schedule temp file cleanup as a recurring background task (currently exists but not scheduled)
- [ ] Implement `cleanup_old_sessions()` Supabase function call on a schedule

### 2.4 Resume Upload to Supabase Storage

- [ ] Store uploaded files in Supabase Storage instead of parsing and discarding
- [ ] Allow users to re-download their original uploaded file

---

## 3. Frontend Enhancements (Medium Priority)

### 3.1 Resume Persistence

Currently the dashboard loads saved resumes but clicking "Edit" on a saved resume loads an empty resume (it calls `resetResume()` instead of loading the selected resume into the store).

- [ ] When user clicks "Edit" on a saved resume, load that resume's data into `useResumeStore` before navigating to `/build`
- [ ] Add auto-save to Supabase when resume is dirty and user is authenticated
- [ ] Add "Save" button or indicator showing save status

### 3.2 Resume Version Management

- [ ] Allow users to create multiple resumes (currently only one active session)
- [ ] Add resume name/label for easy identification
- [ ] Duplicate resume feature

### 3.3 Undo/Redo

- [ ] Add undo/redo capability to the resume builder using a history stack in the store

### 3.4 Keyboard Shortcuts

- [ ] Add keyboard navigation for section switching (e.g., Ctrl+1 through Ctrl+9)
- [ ] Add Ctrl+S for save, Ctrl+Z for undo

### 3.5 Drag-and-Drop Reordering

- [ ] Add drag-and-drop for section ordering in the build sidebar
- [ ] Add drag-and-drop for bullet point reordering within experience/project sections

---

## 4. Mobile & Responsive Refinements (Medium Priority)

### 4.1 Touch Experience

- [ ] Add swipe gestures for section navigation on mobile build page
- [ ] Improve skill badge tap targets (currently the X button is too small)
- [ ] Add bottom sheet pattern for AI suggestion panel on mobile

### 4.2 Offline Support

- [ ] Add service worker for offline resume editing
- [ ] Queue API calls when offline and replay when back online

### 4.3 PWA

- [ ] Add `manifest.json` for installability
- [ ] Add app icon and splash screen

---

## 5. AI & Scoring Improvements (Medium Priority)

### 5.1 Prompt Optimization

- [ ] A/B test prompt variations for better summary generation quality
- [ ] Add temperature tuning per action type (creative for summary, precise for bullet rewrites)
- [ ] Add streaming responses for AI generation to reduce perceived latency

### 5.2 Scoring Enhancements

- [ ] Add sub-score explanations (why each sub-score is what it is)
- [ ] Add trend tracking (score improvement over time when user makes changes)
- [ ] Add industry-specific scoring benchmarks

### 5.3 More AI Actions

- [ ] AI skill suggestion (suggest skills based on experience descriptions)
- [ ] AI cover letter generation based on resume + JD
- [ ] AI interview question preparation based on resume + JD

---

## 6. Accessibility (Medium Priority)

- [ ] Full WCAG 2.1 AA audit
- [ ] Add ARIA labels to all interactive elements
- [ ] Ensure all forms have proper fieldset/legend structure
- [ ] Add skip-to-content link
- [ ] Test with screen reader (NVDA/VoiceOver)
- [ ] Add high-contrast mode
- [ ] Ensure all color combinations meet 4.5:1 contrast ratio

---

## 7. DevOps & Monitoring (Medium Priority)

### 7.1 CI/CD Pipeline

- [ ] Add GitHub Actions workflow for backend tests
- [ ] Add GitHub Actions workflow for frontend build + lint
- [ ] Add pre-commit hooks (lint, typecheck, format)

### 7.2 Monitoring & Logging

- [ ] Add application performance monitoring (e.g., Sentry)
- [ ] Add frontend error tracking
- [ ] Add backend health check dashboard
- [ ] Set up uptime monitoring for both services

### 7.3 Environment Variable Validation

- [ ] Add startup validation that all required env vars are set
- [ ] Add `/health` endpoint that checks all dependencies (Groq, Supabase)
- [ ] Document all required Vercel and Render environment variables in a setup guide

---

## 8. Documentation (Low Priority)

- [ ] User guide / FAQ page
- [ ] API documentation (Swagger/OpenAPI is auto-generated but could be enhanced)
- [ ] Developer onboarding guide
- [ ] Architecture decision records (ADRs) for key choices (implicit flow, Zustand, etc.)

---

## 9. Nice-to-Have Features (Low Priority)

### 9.1 Resume Templates

- [ ] Additional template designs (Creative, Minimal, Executive)
- [ ] Custom color scheme per template
- [ ] Custom font selection

### 9.2 Collaboration

- [ ] Share resume via link (read-only)
- [ ] Get feedback/comments on resume
- [ ] Resume comparison (compare two versions)

### 9.3 Job Application Tracker

- [ ] Track which jobs the user has applied to
- [ ] Link resumes to specific job applications
- [ ] Application status tracking (applied, interview, offer, rejected)

### 9.4 Internationalization

- [ ] Multi-language support for the UI
- [ ] Resume generation in different languages
- [ ] Locale-specific resume formatting conventions

---

## 10. Known Technical Debt

| Item | Description | Impact |
|---|---|---|
| ESLint config broken | `eslint-plugin-react` incompatible with ESLint 10 — throws TypeError | No linting during development |
| Unused `Header.tsx` patterns | Old `Header` component exists alongside the new shared one | Minor confusion, no runtime impact |
| `@supabase/ssr` server client unused | `lib/supabase/server.ts` exists but no server components use it | Dead code |
| CSS variable consolidation | Some Tailwind hardcoded colors could be consolidated into CSS variables | Maintenance friction |
| No React error boundary per route | Only one global `ErrorBoundary` in layout | A crash in one section takes down the whole page |
| `medium` variant missing on Button | `ButtonProps` type allows `"medium"` but `variantClasses` doesn't have it | TypeScript error if used |
| Cold start latency | Render free tier sleeps after 15 minutes of inactivity | First request after idle takes 30-60s |
