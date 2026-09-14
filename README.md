# BloomLater — Full Application & DevOps Handover Documentation

> **BloomLater** is a digital time capsule web application. Users can write letters, memories, and predictions to their future selves, seal them with a target unlock date, and receive/open them once unlocked.

---

## 1. Executive Summary & Purpose

This document provides complete technical, architectural, operational, and deployment guidelines for **DevOps / SRE / Platform Engineers** to containerize, orchestrate (Docker, Kubernetes, Nomad, etc.), and build CI/CD pipelines (e.g. Jenkins, GitHub Actions, GitLab CI) for BloomLater.

All containerization and cluster-specific configurations (Dockerfiles, Kubernetes manifests, CI workflows) have been stripped from the repository to give DevOps a completely clean slate for implementing standard CI/CD & deployment strategies.

---

## 2. Technology Stack & Runtime Matrix

| Layer | Technology | Runtime / Version Requirements | Purpose / Notes |
|---|---|---|---|
| **Frontend** | React 18 (SPA), Vite 5 | Node.js `>= 20.0.0` (npm `>= 10.0.0`) | Client interface built with Tailwind CSS, Framer Motion, TanStack Query, Zustand |
| **Backend** | Express 4.19, Node.js | Node.js `>= 20.0.0` | REST API, JWT auth, input validation, background cron job |
| **Database** | MongoDB | `>= 6.0` (Tested on `7.0`) | Primary persistent database (users, capsule metadata & content) |
| **Logging** | Pino & Pino-HTTP | Node stream / JSON | Structured JSON stdout logging suitable for Logstash, Promtail, CloudWatch, Datadog |
| **Job Scheduler** | `node-cron` | In-process | Evaluates sealed capsules every minute and updates status to `unlockable` |
| **Storage Driver** | Local filesystem (or S3-compatible) | POSIX / S3 API | Manages user file attachments (local path default: `./uploads`) |

---

## 3. Project Structure & Key File Paths

```text
BloomLater/
├── .env.example                  # Central reference environment variable template
├── .gitignore                    # Git rules excluding node_modules, build outputs, .env
├── README.md                     # Application & DevOps documentation (this file)
│
├── backend/                      # Node.js + Express API Backend Service
│   ├── package.json              # Scripts & production dependencies
│   ├── package-lock.json         # Locked dependency graph
│   ├── server.js                 # Entry point: handles DB connect, server listen, graceful shutdown
│   ├── src/
│   │   ├── app.js                # Express app factory (middleware, CORS, security headers, routes)
│   │   ├── config/
│   │   │   └── db.js             # Mongoose connection logic, reconnection strategy & health ping
│   │   ├── controllers/
│   │   │   ├── auth.controller.js    # Login, registration, token refresh, session revoke
│   │   │   └── capsule.controller.js # CRUD, status checking, unlock actions, stats
│   │   ├── jobs/
│   │   │   └── unlockCapsules.job.js # Cron worker running at '0 * * * * *'
│   │   ├── middleware/
│   │   │   ├── auth.middleware.js         # JWT verification & claims parsing
│   │   │   ├── errorHandler.middleware.js # Standardized error JSON responses
│   │   │   ├── rateLimiter.middleware.js  # Brute-force & request throttling
│   │   │   └── validate.middleware.js     # Zod request body validation
│   │   ├── models/
│   │   │   ├── Capsule.model.js           # Capsule schema, indexes on unlockAt, status, owner
│   │   │   └── User.model.js              # User schema & password hashing hooks
│   │   ├── routes/
│   │   │   ├── auth.routes.js             # /api/auth
│   │   │   ├── capsule.routes.js          # /api/capsules
│   │   │   └── health.routes.js           # /health (Liveness & Readiness probe)
│   │   └── utils/
│   │       ├── logger.js                  # Pino structured logging instance
│   │       └── tokens.js                  # JWT access/refresh token signing & verification
│   └── uploads/                           # Local storage directory for user uploads (if local driver)
│
├── frontend/                     # Single Page Application (SPA)
│   ├── package.json              # Client dependencies and Vite script
│   ├── package-lock.json         # Client lockfile
│   ├── index.html                # Vite HTML shell
│   ├── vite.config.js            # Vite configuration (port 5173, bundle chunks)
│   ├── tailwind.config.js        # Design tokens, custom animations, styling
│   ├── postcss.config.js         # CSS processing
│   └── src/
│       ├── main.jsx              # React DOM mounting
│       ├── App.jsx               # Client routes & global query provider
│       ├── components/           # Reusable UI, motion & capsule components
│       ├── pages/                # Landing, Vault, Create, View Capsule, Auth pages
│       ├── stores/               # Zustand auth session store
│       └── lib/
│           ├── apiClient.js      # Axios instance (baseURL configured via import.meta.env.VITE_API_URL)
│           └── queryClient.js    # TanStack Query client
│
└── database/
    └── seed.js                   # Standalone database population script (creates demo user & sample capsules)
```

---

## 4. Architecture & Networking Flow

```
                     +---------------------------------------+
                     |         Clients (Browser/App)         |
                     +-------------------+-------------------+
                                         |
                                         v
                     +---------------------------------------+
                     |   Reverse Proxy / Ingress / Load Balancer   |
                     |  (e.g., Nginx / Traefik / ALB / Ingress)    |
                     +---------+-------------------+---------+
                               |                   |
               Path: /*        |                   | Path: /api/*, /health
         (Static SPA files)    |                   | (API requests)
                               v                   v
                     +-------------------+   +-----------------------+
                     | Frontend Service  |   | Backend API Service   |
                     | Port: 5173 / 80   |   | Port: 4000            |
                     | (Static Nginx     |   | (Node.js Express)     |
                     |  or CDN S3 Bucket)|   +-----------+-----------+
                     +-------------------+               |
                                                         | Mongoose ODM (port 27017)
                                                         v
                                             +-----------------------+
                                             | MongoDB 7.x Database  |
                                             | (mongodb://...)       |
                                             +-----------------------+
```

### Port Allocations
* **Frontend Dev Server**: `5173` (Vite dev)
* **Frontend Production Artifact**: Static files (`dist/`) intended to be hosted by Nginx/Caddy on port `80`/`443` or deployed to cloud object storage + CDN (S3 + CloudFront).
* **Backend API**: `4000` (configurable via `PORT` environment variable).
* **Database**: `27017` (MongoDB internal/private connection).

---

## 5. Environment Variables & Configurations

### Global & Backend Configuration (`.env`)

| Variable | Required | Default | Description | Example / Recommended Value |
|---|---|---|---|---|
| `NODE_ENV` | Yes | `development` | Runtime environment mode (`development`, `production`, `test`) | `production` |
| `PORT` | No | `4000` | Port on which the Express HTTP server binds | `4000` |
| `MONGO_URI` | Yes | — | MongoDB connection string including credentials & database name | `mongodb://user:pass@mongo.internal:27017/bloomlater?authSource=admin` |
| `JWT_ACCESS_SECRET` | Yes | — | High-entropy secret for signing short-lived access tokens (min 64 chars) | Generate: `openssl rand -hex 64` |
| `JWT_REFRESH_SECRET` | Yes | — | High-entropy secret for signing long-lived refresh tokens (min 64 chars) | Generate: `openssl rand -hex 64` |
| `JWT_ACCESS_EXPIRES_IN`| No | `15m` | Token expiration duration string | `15m` |
| `JWT_REFRESH_EXPIRES_IN`| No | `7d` | Refresh token duration string | `7d` |
| `CORS_ORIGIN` | Yes | `http://localhost:5173` | Comma-delimited list of allowed origins. Set to domain in production | `https://bloomlater.yourdomain.com` |
| `STORAGE_DRIVER` | No | `local` | Attachment storage mechanism (`local` or `s3`) | `local` (or `s3`) |
| `UPLOAD_DIR` | Cond. | `./uploads` | Destination folder on disk when `STORAGE_DRIVER=local` | `/var/data/bloomlater/uploads` |
| `S3_BUCKET` | Cond. | — | S3 bucket name if `STORAGE_DRIVER=s3` | `my-capsule-storage` |
| `S3_REGION` | Cond. | — | AWS / S3-compatible region | `us-east-1` |
| `S3_ACCESS_KEY_ID` | Cond. | — | AWS IAM / S3 access key | `AKIA...` |
| `S3_SECRET_ACCESS_KEY`| Cond. | — | AWS IAM / S3 secret key | `wJalr...` |
| `S3_ENDPOINT` | No | — | Custom endpoint if using MinIO, Wasabi, or Ceph | `https://minio.internal:9000` |
| `SEED_DEMO_PASSWORD` | No | `Demo1234!` | Password used by `database/seed.js` for default demo user | `ComplexPass#2026` |

### Frontend Build-Time Configuration

| Variable | Required | Default | Description |
|---|---|---|---|
| `VITE_API_URL` | No | `/api` | Base URL used by Axios in the browser. In production behind a reverse proxy, `/api` is standard. For isolated hostnames, use `https://api.yourdomain.com/api`. |

> **DevOps Notice**: `VITE_` variables are bundled directly into the static JavaScript bundles during `npm run build`. They must be injected during the build step, not at container runtime (unless a dynamic runtime injection script is used).

---

## 6. Build, Test & Run Commands

### Backend

```bash
# 1. Navigate to backend
cd backend

# 2. Install dependencies (Production only or full)
npm ci

# 3. Code quality / Lint
npm run lint

# 4. Start Development Server (Hot-reload)
npm run dev

# 5. Start Production Server
npm run start
# Entrypoint is: node server.js
```

### Frontend

```bash
# 1. Navigate to frontend
cd frontend

# 2. Install dependencies
npm ci

# 3. Code quality / Lint
npm run lint

# 4. Local Development Server
npm run dev

# 5. Build Production Artifacts
npm run build
# Output directory: frontend/dist/
```

### Database Seeding (Demo / Initial Verification)

```bash
# Run from backend directory (to leverage installed dependencies):
cd backend
node --require dotenv/config ../database/seed.js dotenv_config_path=../.env
```
Default credentials created:
* **User**: `demo@bloomlater.app`
* **Password**: `Demo1234!`

---

## 7. Health Checks & Observability

### Health Check Endpoint
* **Path**: `GET /health`
* **Port**: `4000`
* **Authentication**: None (Public)
* **Response Status**:
  * `200 OK`: Database connected, application healthy.
  * `503 Service Unavailable`: MongoDB disconnected or degraded.

**Sample Health Check Response (`200 OK`)**:
```json
{
  "status": "ok",
  "timestamp": "2026-09-10T05:22:00.000Z",
  "uptime": 3600,
  "version": "1.0.0",
  "checks": {
    "mongodb": {
      "status": "ok",
      "latencyMs": 2
    }
  }
}
```

### Process Management & Graceful Shutdown
`server.js` listens to `SIGTERM` and `SIGINT`:
1. Closes the HTTP server to refuse new incoming traffic.
2. Waits for existing in-flight connections to drain.
3. Implements a 10-second timeout safeguard (`server.force_shutdown`) to prevent hanging containers before terminating with exit code 1.

---

## 8. API Reference Map

| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| `GET` | `/health` | No | Health check for container probes & load balancers |
| `POST` | `/api/auth/register` | No | Creates new account (Username, Email, Password) |
| `POST` | `/api/auth/login` | No | Authenticates user; returns JWT access token + sets HTTP-only refresh cookie |
| `POST` | `/api/auth/refresh` | Cookie | Rotates refresh token and issues new access token |
| `POST` | `/api/auth/logout` | JWT | Invalidates user session |
| `GET` | `/api/auth/me` | JWT | Returns current authenticated user profile |
| `GET` | `/api/capsules` | JWT | Retrieves paginated capsules owned by authenticated user |
| `POST` | `/api/capsules` | JWT | Creates and seals a new time capsule with scheduled `unlockAt` |
| `GET` | `/api/capsules/stats` | JWT | Summarizes count of sealed, unlockable, and opened capsules |
| `GET` | `/api/capsules/:id` | JWT | Returns single capsule detail (message hidden if still `sealed`) |
| `POST` | `/api/capsules/:id/open` | JWT | Unlocks a capsule whose `unlockAt` timestamp has passed |
| `DELETE`| `/api/capsules/:id` | JWT | Soft deletes a capsule |

---

## 9. Recommendations for DevOps & Jenkins CI/CD

When authoring your Jenkins pipeline (`Jenkinsfile`), containerization, and orchestration layers, consider the following blueprint:

### A. Recommended Docker Containerization
1. **Frontend**:
   * **Stage 1 (Builder)**: `node:20-alpine` runs `npm ci` and `npm run build` with build-arg `VITE_API_URL`.
   * **Stage 2 (Runner)**: `nginx:alpine` copies `frontend/dist` to `/usr/share/nginx/html`.
   * Include standard Nginx SPA routing fallback (`try_files $uri $uri/ /index.html;`) and reverse proxy configuration for `/api` and `/health` routing to the backend service.
2. **Backend**:
   * **Multi-stage build**: `node:20-alpine`.
   * Run `npm ci --only=production` to keep container image minimal.
   * Run process as non-root user (e.g. `USER node`).
   * Mount persistent volume for uploads if `STORAGE_DRIVER=local`.

### B. Suggested Jenkins Pipeline Stages
1. **Checkout**: Pull from GitHub repository.
2. **Lint & Test**:
   * Run `npm run lint` in `backend/` and `frontend/`.
   * Run build checks.
3. **Container Build & Tag**:
   * Build frontend & backend images tagged with Jenkins build number / Git commit SHA (e.g. `bloomlater-backend:${BUILD_NUMBER}-${GIT_COMMIT:0:7}`).
4. **Security & Vulnerability Scanning**:
   * Run container vulnerability scanner (Trivy, Snyk, or Grype).
5. **Image Push**:
   * Push images to Container Registry (Docker Hub, Harbor, ECR, Nexus, GHCR).
6. **Deploy / CD Trigger**:
   * Deploy via SSH/Ansible, Helm chart, Docker Compose on target servers, or GitOps manifest repository update.

### C. Storage & Stateful Considerations
* If deploying multi-replica backend pods, ensure `STORAGE_DRIVER` is set to `s3` (or use shared NFS / CephFS PVs if using `local`) so attachments are accessible across all backend replicas.
* In high-availability environments, connect the backend to an external managed MongoDB cluster (e.g., MongoDB Atlas, Percona Operator) with replica sets enabled.
