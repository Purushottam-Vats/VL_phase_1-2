# API Reference (Phase 2)

Base URL: `http://localhost:5000/api` (in development the frontend reaches it through the Vite proxy at `/api`).

All responses are JSON. Success: `{ "success": true, ... }`. Failure: `{ "success": false, "message": "...", "details": [{ "field", "message" }] }`.
Protected routes need the header `Authorization: Bearer <token>`.

| Status | Meaning |
|---|---|
| 400 | Validation failed / malformed request |
| 401 | Missing, invalid or expired token; wrong login |
| 403 | Authenticated but the role is not allowed |
| 404 | Not found (also returned when a record belongs to someone else) |
| 409 | Conflict (duplicate email, invalid status change, already assigned) |

## Auth

| Method | Path | Access | Body / notes |
|---|---|---|---|
| POST | `/auth/register` | public | `name, email, password, role (student\|teacher), school?, grade?, section?, preferredLanguage? (en\|kn\|hi), inviteCode?` - teachers need `inviteCode` equal to `TEACHER_INVITE_CODE`. Returns `{ token, user }` (201). |
| POST | `/auth/login` | public | `email, password` -> `{ token, user }` |
| GET | `/auth/me` | any user | current user |
| PATCH | `/auth/me` | any user | any of `name, school, grade, section, preferredLanguage` |
| POST | `/auth/change-password` | any user | `currentPassword, newPassword` |

Password rule: 8-72 characters, at least one letter and one number.

## Catalogue (any logged-in user)

| Method | Path | Query | Notes |
|---|---|---|---|
| GET | `/subjects` | `lang` | 3 subjects with `experimentCount` |
| GET | `/experiments` | `subject` (key or id), `difficulty`, `q`, `lang`, `page`, `limit` | summaries + pagination |
| GET | `/experiments/:idOrSlug` | `lang` | full content (steps, equipment, explanation, rural context) + `quiz`. Missing Kannada/Hindi fields fall back to English. |

## Users

| Method | Path | Access | Notes |
|---|---|---|---|
| GET | `/users/students` | **teacher** | `grade, section, q, page, limit` |

## Assignments

| Method | Path | Access | Notes |
|---|---|---|---|
| GET | `/assignments` | any | Students: only their own. Teachers: only ones they created. Filters: `status, experiment, student (teacher only), lang, page, limit` |
| GET | `/assignments/:id` | owner | 404 for anyone else |
| POST | `/assignments` | **teacher** | `studentIds[], experimentId, dueDate (future), instructions?` - one assignment per student; duplicates are skipped and listed in `skipped`. Creates notifications. |
| PATCH | `/assignments/:id` | **teacher (owner)** | `dueDate?, instructions?` |
| POST | `/assignments/:id/review` | **teacher (owner)** | `feedback, marks? (0-100)`; only when status is `submitted` |
| DELETE | `/assignments/:id` | **teacher (owner)** | only while `assigned` / `in_progress` |
| PATCH | `/assignments/:id/status` | **student (owner)** | `status: in_progress \| submitted` (forward only) |

Status flow: `assigned -> in_progress -> submitted -> reviewed` (reviewed only via the teacher review endpoint).

## Health

`GET /health` - public; reports API and database connection state.

## Collections (Mongoose models)

`User, Subject, Experiment, Assignment, ExperimentProgress, PracticalRecord, StudentActivity, Notification` - see `backend/models/`.
Their API routes (progress, practical records, sync, AI) arrive in Phases 4-6.
