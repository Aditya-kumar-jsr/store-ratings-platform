# Store Ratings Platform

A full-stack web application where users submit 1–5 star ratings for stores. A single
login serves three roles — **System Administrator**, **Normal User**, and **Store Owner** —
each with role-specific functionality.

## Tech stack

| Layer     | Technology                                   |
| --------- | -------------------------------------------- |
| Backend   | Express.js + TypeScript                       |
| Database  | PostgreSQL (local for dev, Render-managed in prod) |
| Frontend  | React + TypeScript (Vite)                     |
| Auth      | Google OAuth + JWT sessions                   |
| Hosting   | Render (API + Postgres + static site via `render.yaml`) |

## Project layout

```
.
├── render.yaml
├── backend/
│   └── src/
│       ├── config/
│       ├── db/
│       ├── controllers/
│       ├── routes/
│       ├── middleware/
│       └── utils/
└── frontend/
    └── src/
        ├── api/
        ├── context/
        ├── components/
        └── pages/
```

## Prerequisites

- Node.js 18+ (tested on Node 20)
- PostgreSQL 14+ running locally (no Docker required)

### Install PostgreSQL locally (macOS / Homebrew)

```bash
brew install postgresql@16
brew services start postgresql@16

psql -d postgres -c "CREATE ROLE store_user LOGIN PASSWORD 'store_pass';"
psql -d postgres -c "CREATE DATABASE store_ratings OWNER store_user;"
```

(On Linux use your package manager; on Windows use the official installer or WSL.)

## Getting started

### 1. Backend

```bash
cd backend
cp .env.example .env
npm install
npm run seed
npm run dev
```

> `npm run seed` is idempotent — it applies the schema and inserts demo users,
> stores and ratings. Use `npm run migrate` if you only want the schema.

For Google OAuth, configure these backend variables:

```bash
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
GOOGLE_REDIRECT_URI=http://localhost:4000/api/auth/google/callback
API_PUBLIC_URL=http://localhost:4000
CLIENT_ORIGIN=http://localhost:5173
```

In Google Cloud Console, add the redirect URI above for local development. For
production, use your deployed API URL with `/api/auth/google/callback`.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

The Vite dev server proxies `/api` to the backend, so no extra config is needed.

## Deploying to Render

The repo includes a `render.yaml` Blueprint that provisions everything — the
**PostgreSQL database, the Express API, and the static React site** — in a single
Render project. There is no separate database vendor and no Docker.

1. Push the repo to GitHub.
2. In Render: **New → Blueprint** and select the repo. Render reads `render.yaml`
   and creates the database + both services.
3. The API gets `DATABASE_URL` injected automatically and runs
   `npm run start:prod`, which applies the schema, seeds the admin, then boots.
4. After the first deploy, set the two cross-reference URLs:
   - API service → `CLIENT_ORIGIN` = the static site URL.
   - API service → `API_PUBLIC_URL` = the API service URL.
   - API service → `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
   - API service → `GOOGLE_REDIRECT_URI` = `<API URL>/api/auth/google/callback`.
   - Web service → `VITE_API_URL` = the API service URL, then redeploy the site.

Locally the frontend talks to the API through the Vite proxy; in production it
uses `VITE_API_URL`.

## Seeded users

Seed data creates users and roles. Users sign in with Google OAuth using the
same email address. Password login and signup are not exposed by the app.

## Roles & functionality

### System Administrator
- Dashboard with total users / stores / ratings.
- Add stores, normal users, admin users (and store owners).
- List users (Name, Email, Address, Role) and stores (Name, Email, Address, Rating).
- Filter every listing by Name, Email, Address, Role.
- View full user details, including the store rating for owners.

### Normal User
- Google OAuth sign-in.
- Browse all stores; search by Name and Address.
- See overall rating + their own submitted rating per store.
- Submit and modify a rating (1–5).

### Store Owner
- Google OAuth sign-in.
- Dashboard: average store rating + list of users who rated the store.

## Form validation rules

Enforced on **both** client and server:

- **Name** — required (no length limit).
- **Address** — max 400 characters.
- **Email** — standard email format.

## Notable design decisions

- **Roles enforced in two layers** — `authorize()` middleware on the API, and
  role-aware routing/guards on the client.
- **Sorting** — every table supports ascending/descending sort (client-side in
  `DataTable`); the API also accepts `sortBy`/`order` with a column whitelist to
  prevent SQL injection.
- **Filtering** — server-side `ILIKE` filters, debounced from the UI.
- **Ratings** — a `UNIQUE (user_id, store_id)` constraint plus an upsert means
  "submit" and "modify" are the same idempotent operation.
- **Security** — Google OAuth identity, JWT app sessions, `helmet`, CORS locked
  to the client origin, parameterized SQL throughout.

## API overview

| Method | Endpoint                      | Role   | Purpose                              |
| ------ | ----------------------------- | ------ | ------------------------------------ |
| GET    | `/api/auth/google`            | public | Start Google OAuth                   |
| GET    | `/api/auth/google/callback`   | public | Complete Google OAuth                |
| GET    | `/api/auth/me`                | any    | Current user                         |
| GET    | `/api/users/dashboard`        | admin  | Counts for the admin dashboard       |
| GET    | `/api/users`                  | admin  | List/filter/sort users               |
| GET    | `/api/users/:id`              | admin  | User details (rating if owner)       |
| POST   | `/api/users`                  | admin  | Create a user of any role            |
| DELETE | `/api/users/:id`              | admin  | Delete a user (cannot delete self)   |
| GET    | `/api/stores`                 | any    | List stores (+ own rating for users) |
| POST   | `/api/stores`                 | admin  | Create a store                       |
| DELETE | `/api/stores/:id`             | admin  | Delete a store                       |
| GET    | `/api/stores/owner/dashboard` | owner  | Owner dashboard                      |
| POST   | `/api/ratings`                | user   | Submit / modify a rating             |
