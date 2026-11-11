# Virtual Lab for Learning Science

RNS Institute of Technology - Community Project (1BCP308), Dept. of CSE (AI&ML), Semester 3.
An offline-first virtual science laboratory for rural high-school students: Physics, Chemistry and Biology
simulations, English/Kannada/Hindi, AI assistance, automated practical records and a teacher dashboard.

## Project status

| Phase | Scope | Status |
|---|---|---|
| 1 | Project setup (React + Vite, Express, MongoDB) | Done |
| 2 | Authentication, role-based access, schemas, seed data, API tests | Done |
| 3 | Student/teacher dashboards, subject and experiment pages | Next |
| 4 | Simulations (9 experiments) | |
| 5 | AI assistant, multilingual UI, voice, practical-record PDF | |
| 6 | PWA, service worker, IndexedDB, sync | |
| 7 | Integration, testing, optimisation | |

**What works now:** registration and login for students and teachers (JWT + bcrypt), role-based API
protection, all 8 MongoDB collections, seed data (3 subjects, 9 experiments with English/Kannada/Hindi content,
10 students/teachers, assignments), the experiment catalogue API, assignment management API, and a React app with
landing, login, registration and basic student/teacher dashboards that use the real API.

## Folder structure

```
virtual-lab/
├── backend/            Express + Mongoose REST API
│   ├── config/         env + database connection
│   ├── controllers/    request handlers
│   ├── middleware/     auth (JWT), role check, validation, errors
│   ├── models/         8 Mongoose schemas
│   ├── routes/ validators/ utils/ services/
│   ├── seed/           seed script + data
│   ├── tests/          Jest + Supertest (70 tests)
│   ├── app.js          Express app (exported for tests)
│   └── server.js       starts the server
├── frontend/           React 18 + Vite + Tailwind
│   └── src/            pages, components, layouts, context, services, simulations/, offline/, translations/ ...
├── documentation/API.md
├── .env.example
└── README.md
```

## Running on Windows

### 1. Install the tools (one time)

1. **Node.js 20 or 22 LTS** - https://nodejs.org (choose the LTS installer). Check: open *Command Prompt* and run `node -v` and `npm -v`.
2. **MongoDB** - pick ONE:
   - **A. Local:** install *MongoDB Community Server* from https://www.mongodb.com/try/download/community. In the installer keep
     "Install MongoDB as a Service" ticked. It then runs automatically on `127.0.0.1:27017`. (Optional: *MongoDB Compass* to browse data.)
   - **B. Cloud (no install):** create a free cluster at https://www.mongodb.com/atlas, add a database user, allow your IP under
     *Network Access*, and copy the connection string into `MONGODB_URI` (see step 3).
3. **VS Code** and **Git** are optional but recommended. **Postman** helps for testing the API.

### 2. Install dependencies

Open a terminal in the `virtual-lab` folder:

```bat
cd backend
npm install
cd ..\frontend
npm install
cd ..
```

(or `npm run install:all` from the root folder)

### 3. Configure environment variables

```bat
copy .env.example backend\.env
```

Open `backend\.env` and set at least:

- `JWT_SECRET` - any random text of 32+ characters (command in the file shows how to generate one)
- `MONGODB_URI` - leave as is for local MongoDB, or paste your Atlas string
- `TEACHER_INVITE_CODE` - the code teachers type when registering (default `RNSIT-TEACHER-2026`)

### 4. Load the sample data

```bat
cd backend
npm run seed
```

Use `npm run seed:reset` to wipe the database first. Running `npm run seed` again is safe (it does not duplicate data).

### 5. Start the app (two terminals)

**Terminal 1 - backend**
```bat
cd backend
npm run dev
```
You should see `[db] connected ...` and `Virtual Lab API running on http://localhost:5000/api`.
Check http://localhost:5000/api/health in the browser.

**Terminal 2 - frontend**
```bat
cd frontend
npm run dev
```
Open **http://localhost:5173**.

### Demo accounts (created by the seed)

| Role | Email | Password |
|---|---|---|
| Teacher | teacher1@example.com | Teacher@123 |
| Teacher | teacher2@example.com | Teacher@123 |
| Student | student1@example.com ... student8@example.com | Student@123 |

On the login page (development mode) the "Demo student / Demo teacher" buttons fill these in for you.
These passwords are for local development only.

## Running the tests

```bat
cd backend
npm test
```
Starts an **in-memory MongoDB** (`mongodb-memory-server`); nothing in your real database is touched. The **first run downloads a MongoDB
binary (about 100-200 MB) and needs internet**; later runs use the cached copy. To use an already-running MongoDB instead, set
`TEST_MONGODB_URI=mongodb://127.0.0.1:27017` (PowerShell: `$env:TEST_MONGODB_URI="mongodb://127.0.0.1:27017"`).

```bat
cd frontend
npm test
```
Runs 14 UI tests (login, registration, route protection, logout) with Vitest + Testing Library. No database needed.

## Testing the API by hand (Postman)

1. `POST http://localhost:5000/api/auth/login` with JSON `{"email":"teacher1@example.com","password":"Teacher@123"}` - copy the `token`.
2. Add header `Authorization: Bearer <token>` and call `GET /api/users/students` (works).
3. Log in as `student1@example.com` and call the same URL - you get **403**. That is the role check.

Full endpoint list: `documentation/API.md`.

## Design decisions worth knowing (useful for your viva)

- **Teacher sign-up needs an invite code.** If anyone could register as a teacher they could read every student's data. The code lives in `.env`.
- **`bcryptjs` instead of `bcrypt`.** Same bcrypt algorithm and hash format, but pure JavaScript, so `npm install` never needs C++ build tools on Windows.
- **The role is read from the database on every request**, not trusted from the token; a disabled account is locked out immediately.
- **Offline sync is designed in already.** Progress and practical records have a client-generated `clientId` with a unique index, so re-sending the offline queue can never create duplicates (Phase 6).
- **Kannada/Hindi content falls back to English field by field.** Seed data has Kannada/Hindi titles, objectives and introductions; full translation of steps and explanations happens in Phase 5. **Please have a Kannada/Hindi-speaking teacher proof-read all translated text.**
- **Search uses regular expressions, not a MongoDB text index**, because the catalogue is small and it handles Kannada/Hindi text correctly.

## Troubleshooting

| Problem | Fix |
|---|---|
| `ECONNREFUSED ::1:27017` | Use `127.0.0.1`, not `localhost`, in `MONGODB_URI`. |
| `Could not connect to MongoDB` | Start the service: Win+R -> `services.msc` -> *MongoDB Server* -> Start. Or use Atlas. |
| `'npm' is not recognized` | Reinstall Node.js and reopen the terminal. |
| Port 5000 or 5173 already in use | Change `PORT` in `backend\.env`; for the frontend run `npm run dev -- --port 5174`. If you change the backend port also set `VITE_API_PROXY=http://127.0.0.1:<port>`. |
| Login page says "Cannot reach the server" | The backend is not running (Terminal 1). |
| Teacher registration says "disabled" | `TEACHER_INVITE_CODE` is empty in `backend\.env`. |
| Atlas connection times out | Add your IP address in Atlas -> Network Access. |
