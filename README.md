# BloomLater

> A digital time capsule. Seal a message today. Open it when the future is ready.

[![CI](https://github.com/your-org/bloomlater/actions/workflows/ci.yml/badge.svg)](https://github.com/your-org/bloomlater/actions/workflows/ci.yml)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser / Client                         │
└──────────────────────────────┬──────────────────────────────────┘
                               │ HTTPS/REST
┌──────────────────────────────▼──────────────────────────────────┐
│  Tier 1: Frontend                                               │
│  React 18 + Vite + Tailwind CSS + Framer Motion                │
│  Served by Nginx (gzip, long-cache headers, SPA fallback)      │
│  Port: 80                                                       │
└──────────────────────────────┬──────────────────────────────────┘
                               │ REST API via Nginx proxy → :4000
┌──────────────────────────────▼──────────────────────────────────┐
│  Tier 2: Backend                                                │
│  Node.js 20 + Express + Pino + Helmet + Zod                    │
│  JWT auth (access 15m + refresh 7d in httpOnly cookie)         │
│  node-cron: flips capsule status sealed→unlockable every min   │
│  Port: 4000                                                     │
└──────────────────────────────┬──────────────────────────────────┘
                               │ Mongoose ODM
┌──────────────────────────────▼──────────────────────────────────┐
│  Tier 3: MongoDB 7.0                                            │
│  Collections: users, capsules                                   │
│  Persistent volume, indexes on owner/unlockAt/status           │
│  Port: 27017 (internal only)                                    │
└─────────────────────────────────────────────────────────────────┘
```

## Local Development — Quick Start

### Prerequisites

- Docker & Docker Compose v2
- Node.js 20 (for local frontend dev without Docker)

### 1. Configure environment

```bash
cp .env.example .env
# Edit .env and set JWT_ACCESS_SECRET and JWT_REFRESH_SECRET:
openssl rand -hex 64   # run twice, once per secret
```

### 2. Start the full stack

```bash
docker compose up --build
```

This starts MongoDB, the backend API, runs the seed script, then starts the frontend.

After startup completes (∼30s), open **http://localhost**.

### 3. Demo credentials

```
Email:    demo@bloomlater.app
Password: Demo1234!
```

The seed script creates 4 capsules:
- **Sealed (1 year)** — A letter to my future self
- **Sealed (10 years)** — Predictions for the next decade
- **Ready to open** — Things I want to remember about today
- **Already opened** — A message I already opened

### Local Frontend Dev (hot-reload without Docker)

```bash
cd frontend
npm install
VITE_API_URL=http://localhost:4000/api npm run dev
```

Then start only the backend + Mongo:

```bash
docker compose up mongo backend
```

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `MONGO_URI` | Yes | — | MongoDB connection URI |
| `MONGO_INITDB_ROOT_USERNAME` | Yes | bloomlater | Mongo root username |
| `MONGO_INITDB_ROOT_PASSWORD` | Yes | — | Mongo root password |
| `JWT_ACCESS_SECRET` | Yes | — | 64-byte hex string for access tokens |
| `JWT_REFRESH_SECRET` | Yes | — | 64-byte hex string for refresh tokens |
| `JWT_ACCESS_EXPIRES_IN` | No | 15m | Access token TTL |
| `JWT_REFRESH_EXPIRES_IN` | No | 7d | Refresh token TTL |
| `CORS_ORIGIN` | No | http://localhost:5173 | Allowed CORS origin(s), comma-separated |
| `PORT` | No | 4000 | Backend server port |
| `NODE_ENV` | No | development | production \| development |
| `STORAGE_DRIVER` | No | local | local \| s3 |
| `VITE_API_URL` | No | /api | Frontend API base URL (build-time) |
| `SEED_DEMO_PASSWORD` | No | Demo1234! | Seed script demo user password |

---

## Project Structure

```
BloomLater/
├── frontend/          # React + Vite SPA
│   ├── src/
│   │   ├── components/  # layout, capsule, motion, ui
│   │   ├── pages/       # Landing, Vault, Create, CapsulePage, Login, Register
│   │   ├── hooks/       # useAuth, useCountdown
│   │   ├── stores/      # Zustand auth store
│   │   ├── lib/         # apiClient (axios + interceptors), queryClient
│   │   └── utils/       # formatters
│   ├── nginx.conf       # Nginx server config (gzip, SPA fallback, API proxy)
│   └── Dockerfile       # Multi-stage: node build → nginx serve
│
├── backend/           # Node.js + Express API
│   ├── src/
│   │   ├── routes/       # auth, capsule, health
│   │   ├── controllers/  # business logic
│   │   ├── models/       # User, Capsule (Mongoose)
│   │   ├── middleware/   # auth, validate, errorHandler
│   │   ├── config/       # db (Mongoose connect + ping)
│   │   ├── utils/        # logger (Pino), tokens (JWT)
│   │   └── jobs/         # unlockCapsules.job (node-cron)
│   └── Dockerfile        # Multi-stage, non-root user
│
├── database/
│   └── seed.js           # Demo user + 4 capsules
│
├── k8s/               # Kubernetes / Kustomize
│   ├── base/            # Shared manifests
│   └── overlays/        # dev + prod environments
│
├── .github/
│   └── workflows/
│       └── ci.yml        # GitHub Actions CI/CD
│
├── docker-compose.yml    # Full local stack
└── .env.example          # Environment template
```

---

## API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | — | Create account |
| POST | `/api/auth/login` | — | Login, get tokens |
| POST | `/api/auth/refresh` | Cookie | Rotate refresh token |
| POST | `/api/auth/logout` | JWT | Revoke session |
| GET | `/api/auth/me` | JWT | Get current user |
| POST | `/api/capsules` | JWT | Create + seal capsule |
| GET | `/api/capsules` | JWT | List my capsules (paginated) |
| GET | `/api/capsules/stats` | JWT | Aggregate stats |
| GET | `/api/capsules/:id` | JWT | Get single capsule |
| POST | `/api/capsules/:id/open` | JWT | Open unlockable capsule |
| DELETE | `/api/capsules/:id` | JWT | Soft-delete capsule |
| GET | `/health` | — | Liveness/readiness probe |

---

## Design System

- **Colors**: Warm cream (#F5F0E8) base, rust/terracotta (#C4541A), olive (#4A5C2F), mustard (#D4A017) accents
- **Fonts**: Syne (display), DM Sans (body), JetBrains Mono (labels), Playfair Display italic (accent)
- **Layout**: Numbered section structure (01 / HERO, 02 / VAULT…), not a generic SaaS template
- **Motion**: Framer Motion scroll reveals, wax-seal crack unlock animation, cursor dot in hero
- **Accessibility**: `prefers-reduced-motion` respected globally, focus rings, semantic HTML, ARIA labels

---

## Kubernetes / GitOps

See [k8s/README.md](./k8s/README.md) for full deployment guide.

**Promotion flow:**
```
git push main → CI builds + scans → pushes image with SHA tag
→ kustomize edit set image → ArgoCD syncs prod cluster
```

---

## Known Limitations

- **File attachments**: The data model and API support attachments (via `attachments[]` schema), but the UI implements text-only capsules. The storage layer uses local disk; S3 wiring is scaffolded but not connected.
- **MongoDB auth**: The Mongo instance in Docker Compose uses `authSource=admin` auth. For a production replica set, use the official MongoDB Kubernetes Operator or Atlas.
- **Refresh token rotation**: Stored as a bcrypt hash; this prevents reuse but if a user logs in from many devices simultaneously, earlier refresh tokens are invalidated.
- **Rate limiting**: In-memory (express-rate-limit). In a multi-replica Kubernetes deployment, use Redis-backed rate limiting (`rate-limit-redis`).
- **ArgoCD**: The ArgoCD Application manifest requires ArgoCD to be pre-installed in the cluster and a PAT (`GITOPS_PAT`) in GitHub Actions secrets for the GitOps tag bump step.

---

## License

MIT
