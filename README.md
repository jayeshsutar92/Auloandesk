# AuLoanDesk — Institutional Gold Loan Portal & AI Assistant

AuLoanDesk is an institutional-grade, full-stack digital gold loan origination platform developed for TGlobal Technologies. The platform combines a structured 3-step application workflow, an administrative leads queue, and an intelligent AI Gold Loan Assistant powered by Groq and the `openai/gpt-oss-120b` model.

---

## Architecture Overview

```mermaid
graph TD
    Client[Web Frontend: React 19 + TypeScript + Vite + Tailwind CSS v4]
    AdminDash[Admin Dashboard: /leads]
    ChatWidget[Goldie AI Chat Panel]
    GuidedFlow[3-Step Loan Origination Flow]
    
    Backend[Node.js + Express 5 + TypeScript + ESM Backend]
    Prisma[(PostgreSQL + Prisma ORM 7.10)]
    GroqAPI[Groq API: openai/gpt-oss-120b]

    GuidedFlow -->|POST /api/v1/quotes & POST /api/v1/leads| Backend
    AdminDash -->|GET /api/v1/leads & PATCH /api/v1/leads/:id/status| Backend
    ChatWidget -->|POST /api/v1/assistant/chat| Backend
    
    Backend -->|Tool 1: get_loan_schemes| Prisma
    Backend -->|Tool 2: calculate_quote| Backend
    Backend -->|Tool 3: submit_application| Prisma
    Backend <-->|Chat Completions & Function Tool Calling| GroqAPI
```

---

## Core System Architecture & Highlights

### 1. Backend Foundation (Node.js, Express 5, TypeScript ESM)
- **Modular Architecture**: Clean separation of concerns across routes, controllers, services, middleware, and validators.
- **Security Middleware Stack**:
  - `helmet`: Security headers configured for API protection.
  - `cors`: Explicit origin whitelisting (`CORS_ORIGIN`).
  - `zod`: Strict request payload validation on all incoming data.
  - Centralized error handling: Consistent JSON error contract with domain-specific HTTP status codes.

### 2. Database Models & Precision Calculation Engine
- **PostgreSQL with Prisma ORM 7.10** (`@prisma/adapter-pg` driver adapter):
  - `LoanScheme`: Active schemes with interest rates, tenures, and maximum LTV ceilings.
  - `LoanApplication`: Ingested loan applications with masked contact details, gold weights, karat, valuation, and statuses.
  - `ApplicationStatusAudit`: Immutable audit log capturing status transitions, acting officer, and review notes.
  - `IdempotencyRecord`: Transactional idempotency store mapping deterministic request hashes to cached responses.
- **Active Seeded Schemes**:
  - `PLAN_BULLET_01`: **Bullet Repayment** — 12.0% p.a., 12-month tenure, 70% max LTV.
  - `PLAN_EMI_01`: **Monthly EMI** — 10.5% p.a., 12-month tenure, 75% max LTV (regulatory RBI ceiling).
- **Financial Calculation Engine (`LoanCalculatorService`)**:
  - Pure gold conversion: $\text{netWeight} \times \frac{\text{karat}}{24}$.
  - Benchmark 24K valuation: Pure gold grams $\times$ ₹7,000/g.
  - Eligible loan amount: Floor rounding to nearest integer of $\text{goldValue} \times \text{maxLtv}$.
  - All financial math computed using `Decimal.js` to eliminate IEEE-754 floating-point inaccuracies.

### 3. REST API Endpoints

| Method | Endpoint | Description | Auth / Headers |
|---|---|---|---|
| `GET` | `/health`, `/api/v1/health` | Service health probe (uptime, status, environment) | Public |
| `GET` | `/api/v1/gold-rate` | Authoritative 24K benchmark gold rate (₹7,000/g) with 5-minute TTL cache | Public |
| `GET` | `/api/v1/loan-schemes` | List of all active gold loan schemes | Public |
| `POST` | `/api/v1/quotes` | Valuation calculation across schemes for specified weight and karat | `Content-Type: application/json` |
| `POST` | `/api/v1/leads` | Submit new gold loan application (supports idempotency & concurrency locks) | `Idempotency-Key` (optional) |
| `GET` | `/api/v1/leads` | Administrative lead queue with scheme and status filters | Query params: `schemeId`, `status` |
| `PATCH` | `/api/v1/leads/:id/status` | Enforce application status transition (`SUBMITTED` $\rightarrow$ `UNDER_REVIEW` $\rightarrow$ `APPROVED` / `REJECTED`) | `Content-Type: application/json` |
| `GET` | `/api/v1/leads/:id/audits` | Retrieve chronological audit trail for a loan application | Public |
| `POST` | `/api/v1/assistant/chat` | AI Assistant conversational endpoint with function tool calling | `Content-Type: application/json` |

### 4. Production Hardening & Reliability (B1)
- **Idempotency Protection**: Supports `Idempotency-Key` on `POST /api/v1/leads`. Replays return the cached response without creating duplicates. Reusing the same key with differing payloads is rejected with HTTP 400 (`IDEMPOTENCY_PAYLOAD_MISMATCH`).
- **Concurrency-Safe Deduplication**: Uses PostgreSQL transaction advisory locks (`pg_advisory_xact_lock`) to serialize simultaneous submissions on the same mobile number. Conflicting concurrent requests return HTTP 409 (`DUPLICATE_APPLICATION`) with the `existingApplicationId`.
- **Application Status Lifecycle**: Strict state-machine validation prevents invalid transitions (e.g., direct jumps from `SUBMITTED` to `APPROVED` or modifications to terminal states).
- **Atomic Audit Trail**: Every status change atomically creates an `ApplicationStatusAudit` record within the same database transaction.
- **Cached Gold Benchmark**: In-memory 5-minute TTL cache for the ₹7,000/g benchmark rate with stale-while-revalidate safety.

### 5. Frontend Client Application (React 19, TypeScript, Vite, Tailwind CSS v4)
- **Guided 3-Step Wizard**:
  1. *Collateral Details*: Gross weight, net gold weight, karat purity selection (18K, 22K, 24K).
  2. *Live Debounced Quotes*: Instant valuation, pure gold weight, and comparison of Bullet vs. EMI schemes.
  3. *Applicant Information & Confirmation*: Contact info, masked preview, explicit submission consent.
- **Administrative Leads Dashboard (`/leads`)**:
  - Filterable by loan scheme and application status.
  - Masked mobile display (`9876XXXX10`) protecting borrower privacy.
  - Application detail modals with collateral breakdown, audit trail, and status transition actions.
- **Floating Goldie AI Assistant Widget**:
  - Slide-over chat widget available across all views.
  - Dynamic UI components: `QuoteSummaryCard`, `ApplicationConfirmationCard` (with visible **Confirm Application** and **Cancel** buttons), and `ApplicationSubmittedCard`.
  - Double-scroll auto-alignment ensuring action buttons are immediately visible without requiring manual scroll hunting.

---

## AI Assistant Configuration (Groq)

### Environment Variables
Configure the following in `backend/.env` (see `backend/.env.example`):

```ini
# Server Configuration
PORT=4000
NODE_ENV=development

# Security & CORS
CORS_ORIGIN=http://localhost:5173

# Database Connection (PostgreSQL)
DATABASE_URL=postgresql://postgres:postgrespassword@localhost:5432/auloandesk?schema=public

# AI Assistant Configuration (Groq)
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=openai/gpt-oss-120b
```
Alternatively, use your preferred AI provider's API key and model name, provided you update the backend configuration and integration to support that provider.

> **Security Note:** `backend/.env` is excluded from git in `.gitignore`. Never commit real API keys or database passwords.

### Registered AI Tools
The assistant is constrained to three backend-enforced tools:
1. `get_loan_schemes()`: Fetches database-backed schemes. The assistant is prohibited from describing or inventing unlisted schemes.
2. `calculate_quote(netWeightGrams, grossWeightGrams, karat)`: Calls the authoritative financial service. Enforces $0 < \text{net} \le \text{gross} \le 1000\text{g}$ and karat $\in \{18, 22, 24\}$.
3. `submit_application(payload)`: Ingests the application into PostgreSQL. Requires `userConfirmed: true` following an explicit display of the full summary.

---

## Getting Started

### Prerequisites
- **Node.js**: v20+ (ESM compatible)
- **npm**: v10+
- **PostgreSQL**: v14+ (running locally or accessible via network)
- **Groq API Key**: Active key from [Groq Console](https://console.groq.com/)

---

### Step-by-Step Installation & Setup

#### 1. Clone the Repository
```bash
git clone https://github.com/jayeshsutar92/Auloandesk.git
cd Auloandesk
```

#### 2. Backend Setup
```bash
cd backend
npm install

# Configure environment variables
cp .env.example .env
# Edit .env and supply your DATABASE_URL and GROQ_API_KEY

# Apply database migrations and seed loan schemes
npx prisma migrate dev
npm run db:seed
```

#### 3. Frontend Setup
```bash
cd ../frontend
npm install

# Configure environment variables (optional, defaults to http://localhost:4000/api/v1)
cp .env.example .env
```

---

### Running the Application

#### Start Backend Server
```bash
cd backend
npm run dev
# Server starts on http://localhost:4000
# Health check: http://localhost:4000/health
```

#### Start Frontend Development Server
```bash
cd frontend
npm run dev
# Application accessible at http://localhost:5173
```

---

## Testing & Verification

### Run Backend Tests (Vitest)
Executes all 68 unit, financial, API, concurrency, and conversational AI tests:
```bash
cd backend
npm test
```

#### Test Suite Breakdown (68 Tests Total)
- `test/loan-calculator.test.ts` (8 tests): Decimal precision, net/gross validation, karat purity math, LTV limits.
- `test/health.test.ts` (2 tests): Health check probe, uptime, and system status endpoints.
- `test/ai-assistant.test.ts` (26 tests): Groq assistant orchestration, tool calling, missing detail follow-ups, confirmation cards, duplicate prevention, and post-submission persistence.
- `test/loan-api.test.ts` (15 tests): REST API endpoints, scheme listing, quote calculations, lead ingestion, 7-day lockout, and filtering.
- `test/backend-hardening.test.ts` (17 tests): Idempotency key replay and mismatch rejection, PostgreSQL advisory locking, status transitions, and audit logs.

### Run Code Quality Checks
```bash
# Backend linting and type checking
cd backend
npm run lint
npm run typecheck

# Frontend linting and production bundle build
cd ../frontend
npm run lint
npm run build
```

---

## Regulatory Compliance & Safeguards

- **RBI Loan-to-Value (LTV) Ceiling**: Statutory maximum LTV is strictly capped at 75% of assessed 24K gold collateral value.
- **7-Day Anti-Duplicate Mobile Lockout**: Re-applications with the same mobile number within 7 days are rejected with HTTP 409 (`DUPLICATE_APPLICATION`).
- **Data Privacy & Masking**: Customer mobile numbers are masked in all public UI views, admin lists, and assistant conversations (`9876XXXX10`). Full numbers are stored securely for authorized KYC/credit verification only.
- **Explicit Informed Consent**: Applications require deliberate affirmative confirmation (via visible UI action button or explicit confirmation phrase) before submission.
