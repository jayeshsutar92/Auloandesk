# AI Assistant Implementation & Conversation Log (Phase 5)

## 1. Provider & Model Configuration

- **Provider**: Groq API
- **Model**: `openai/gpt-oss-120b` (verified official Groq model identifier for GPT-OSS 120B)
- **Architecture**: Server-side orchestration via `backend/src/services/ai-assistant.service.ts` using `groq-sdk`.
- **Environment Keys**:
  - `GROQ_API_KEY`: Stored securely in `backend/.env` (excluded by `.gitignore`).
  - `GROQ_MODEL`: `openai/gpt-oss-120b` (fallback: `llama-3.3-70b-versatile`).

---

## 2. Implemented AI Tools Specification

### Tool 1: `get_loan_schemes()`
- **Purpose**: Retrieves all active gold loan schemes from PostgreSQL (`LoanScheme` model).
- **Parameters**: None (`{}`)
- **Guardrail**: The assistant is forbidden from inventing or discussing schemes not returned by this tool.
- **Output**: Array of active schemes with `code`, `name`, `annualInterestRate`, `tenureMonths`, and `maxLtv`.

### Tool 2: `calculate_quote(netWeightGrams, grossWeightGrams, karat)`
- **Purpose**: Computes authoritative collateral valuation and maximum eligible loan amounts using `LoanCalculatorService`.
- **Parameters**:
  - `grossWeightGrams` (number, $0 < \text{gross} \le 1000$)
  - `netWeightGrams` (number, $0 < \text{net} \le \text{gross}$)
  - `karat` (integer, enum: `[18, 22, 24]`)
- **Guardrail**: Non-authoritative calculations rule. The LLM is strictly prohibited from doing mental arithmetic or inventing financial values.
- **Output**: Pure gold weight (24K equivalent), assessed gold valuation at benchmark ₹7,000/g, and eligible loan amounts for all active schemes.

### Tool 3: `submit_application(payload)`
- **Purpose**: Ingests the finalized gold loan application into PostgreSQL (`LoanApplication` model).
- **Parameters**:
  - `fullName`, `mobileNumber`, `grossWeightGrams`, `netWeightGrams`, `karat`, `schemeId`, `email?`, `appliedLoanAmount?`
  - `userConfirmed` (boolean, required: `true`)
- **Guardrail**: Mandatory explicit user confirmation. Rejects submission with `CONFIRMATION_REQUIRED` unless `userConfirmed === true`. Rejects duplicate applications within 7 days with `DUPLICATE_APPLICATION` (HTTP 409).

---

## 3. Five Required Conversation Scenarios

### Scenario 1: Happy Path Through Confirmed Submission
- **User Prompt**: *"I want to apply for a loan against 50g gross (45g net) 22K gold."*
- **Assistant Action**:
  1. Invokes tool `calculate_quote({ grossWeightGrams: 50, netWeightGrams: 45, karat: 22 })`.
  2. Receives valuation: ₹2,88,750 collateral value, ₹2,02,125 eligible loan under `PLAN_BULLET_01` (12% p.a.), ₹2,16,562 under `PLAN_EMI_01` (10.5% p.a.).
  3. Presents quote options and asks for applicant details (Name, Mobile).
  4. User provides: *"My name is Rohan Varma, mobile 9876600001, scheme Bullet Repayment."*
  5. Assistant presents full Application Summary with masked mobile (`9876XXXX01`) and explicitly asks:
     *"Do you confirm and authorize this gold loan application? (Yes/No)"*
  6. User confirms: *"Yes, I confirm."*
  7. Assistant invokes tool `submit_application({ fullName: "Rohan Varma", mobileNumber: "9876600001", grossWeightGrams: 50, netWeightGrams: 45, karat: 22, schemeId: "PLAN_BULLET_01", userConfirmed: true })`.
  8. Application successfully created (`ALD-XXXXX-XXXX`).
- **Outcome**: Sanction initiated with unique application number.

---

### Scenario 2: Missing Information & Follow-Up Questions
- **User Prompt**: *"Hi, I have some gold jewelry at home and need cash. How much can I get?"*
- **Assistant Action**:
  1. Detects that gross weight, net gold weight, and purity karat are missing.
  2. Does NOT invoke any tool or guess numbers.
  3. Responds with clarifying follow-up questions:
     *"I would be glad to help you get a gold loan quote. To calculate your valuation accurately, could you please provide:
     1. Gross physical weight (in grams)
     2. Net gold weight excluding stones (in grams)
     3. Gold purity (18K, 22K, or 24K)?"*
- **Outcome**: Successfully guides user to supply required inputs before running calculations.

---

### Scenario 3: Duplicate Mobile Number Within Seven Days
- **User Prompt**: User confirms application with mobile number `9876600002` that already applied 2 days ago.
- **Assistant Action**:
  1. Invokes `submit_application` with `mobileNumber: "9876600002"`.
  2. Backend database query detects existing lead within 7-day window.
  3. Tool returns:
     `{ success: false, error: "DUPLICATE_APPLICATION", existingApplicationId: "3fabf199-...", message: "An application with this mobile number already exists within the last 7 days." }`
  4. Assistant receives error, stops workflow, and does NOT retry.
  5. Informs applicant:
     *"An active application already exists for mobile number 9876XXXX02 within the last 7 days (Existing ID: 3fabf199-...). Under RBI compliance rules, duplicate applications within 7 days are restricted. Please check your existing application status in the dashboard."*
- **Outcome**: Clean rejection adhering to regulatory lockout without looping or fabricating success.

---

### Scenario 4: Off-Topic Request Politely Declined
- **User Prompt**: *"What is the best cryptocurrency or stock to buy right now for quick profit?"*
- **Assistant Action**:
  1. Domain guardrail filters out speculative financial / crypto inquiries.
  2. Refuses advice without invoking tools.
  3. Replies:
     *"I am AuLoanDesk's specialized Gold Loan Assistant. I can only assist you with gold loan inquiries, valuations, and applications. How can I help you with your gold loan today?"*
- **Outcome**: Firm domain confinement adhering to ethical lending policies.

---

### Scenario 5: Net Weight Greater than Gross Weight
- **User Prompt**: *"Calculate my quote: gross weight is 40g and net weight is 45g with 22 karat."*
- **Assistant Action**:
  1. Invokes `calculate_quote({ grossWeightGrams: 40, netWeightGrams: 45, karat: 22 })`.
  2. Backend validator catches $45\text{g} > 40\text{g}$ and returns:
     `{ success: false, error: "INVALID_WEIGHT_RELATION", message: "Validation Error: Net gold weight (45g) cannot exceed gross weight (40g)." }`
  3. Assistant communicates error:
     *"There was an issue with your weights: Net gold weight (45g) cannot exceed gross physical weight (40g). Please provide the correct weights where net gold weight is less than or equal to gross weight."*
- **Outcome**: Catches physically impossible collateral and prompts for customer correction.

---

## 4. Observed AI Mistake & Automated Test Guard

### Observed Mistake During Development
During the initial integration of `submit_application`, the LLM had a tendency upon receiving all five applicant parameters (name, mobile, gross weight, net weight, scheme) to immediately trigger `submit_application` in the same turn without displaying the comprehensive summary card and without waiting for the user to explicitly reply *"Yes"*. The model hallucinated that providing the information was equivalent to consenting to submission.

### How the Automated Test Catches It
We implemented an explicit backend check in `executeTool` within `backend/src/services/ai-assistant.service.ts`:
```typescript
if (args.userConfirmed !== true) {
  return {
    success: false,
    error: "CONFIRMATION_REQUIRED",
    message: "CRITICAL: Application submission was aborted because userConfirmed was not true. You MUST first present the complete Application Summary... and ask: 'Do you confirm and authorize this gold loan application? (Yes/No)'."
  };
}
```

In `backend/test/ai-assistant.test.ts`, the automated test:
`it("Confirmation Guardrail: submit_application rejects without explicit user confirmation")`
passes `{ userConfirmed: false }` or omits it. The test asserts that the backend returns `success: false` and `error: "CONFIRMATION_REQUIRED"`. This guarantees that even if an LLM is prompted or jailbroken to submit prematurely, the backend API adamantly refuses to write to the database until explicit user affirmative consent has been recorded.

---

## 5. B1: Backend Hardening & AI Assistant Integration

The backend hardening updates (B1) strengthen the infrastructure underlying the AI Assistant:

1. **Transactional Advisory Lock Protection on AI Ingestion**:
   When the AI tool `submit_application` calls `createLead()`, the submission runs under PostgreSQL transaction advisory locking (`SELECT pg_advisory_xact_lock(hashtext('lead_mobile:' || mobileNumber))`). If an applicant tries to submit via both the guided form and the chat assistant at the same instant, the database serializes both requests: one succeeds and the other triggers the canonical `DUPLICATE_APPLICATION` error with `existingApplicationId`.

2. **Immutable Audit Trail for AI-Assisted Applications**:
   Every application created via the assistant is created with initial status `SUBMITTED`. Subsequent lifecycle transitions (e.g. `UNDER_REVIEW`, `APPROVED`, `REJECTED`) executed by credit officers or automated underwriting pipelines are recorded atomically in `application_status_audits` with the acting officer/system, timestamp, and review notes.

3. **Authoritative Gold Benchmark**:
   Both the AI `calculate_quote` tool and the REST `POST /api/v1/quotes` endpoint derive collateral valuation strictly from `getCurrentRate24k()`, ensuring consistent pricing across direct web application flows and interactive conversational sessions.

---

## 6. Conversational Flow Hardening & UI Polish

### 1. Model Branding Removal
- All applicant-facing references to model/provider branding (such as the "Groq 120B" badge or GPT model names) have been removed from the frontend chat interface and system prompts.
- The assistant is presented simply and professionally as the **AuLoanDesk Loan Assistant**.
- Model configuration (`GROQ_MODEL`, `GROQ_API_KEY`) remains strictly internal to the backend orchestration service.

### 2. Missing Details Protocol
- **Strict Pre-Calculation Validation**: The assistant must collect and validate all required application details before calculating quotes or preparing an application:
  - Gold valuation quotes require: `grossWeightGrams`, `netWeightGrams`, and `karat`.
  - Loan applications require: `fullName`, `mobileNumber`, `grossWeightGrams`, `netWeightGrams`, `karat`, and `schemeId`.
- **Targeted Follow-Ups & State Retention**: If an applicant provides partial information (e.g., Sarah provides her name, mobile, gross weight, and net weight, but omits karat or repayment scheme):
  - The assistant identifies the exact missing field(s).
  - Asks a concise follow-up question.
  - Preserves previously supplied details across multi-turn context.
  - Waits for user input before proceeding.
- **Zero Hallucination / Premature Display**: The assistant never displays an incomplete quote, raw table, or application summary card while required details are missing. Values and consent are never assumed.
- **Schema Alignment**: The application schema and validators (`schema.prisma`, `loan.validator.ts`) were inspected. Payment method is not part of the schema or loan origination flow, so no unsupported fields were introduced.

### 3. Quote Presentation Upgrade
- Raw Markdown pipe tables have been completely removed and suppressed from the chat UI (`stripMarkdownTables` on the backend, custom markdown component suppression and clean regex on the frontend).
- Quotes are rendered via a dedicated, institutional `QuoteSummaryCard` component featuring:
  - Assessed gold valuation at the benchmark ₹7,000/g rate.
  - Calculated pure gold content (24K equivalent).
  - Scheme comparison cards with annual interest rate, tenure, max LTV, and prominent eligible loan amount.
- All calculations remain 100% backend-authoritative (`LoanCalculatorService`); the LLM never invents loan values.
- Explicit user confirmation is strictly required prior to application submission.

### 4. Automated Test Coverage
- Automated test suite in `backend/test/ai-assistant.test.ts` covers:
  - Complete application details producing authoritative quotes.
  - Missing required fields triggering concise follow-up questions.
  - Retention of previously provided applicant details during follow-ups.
  - Verification that incomplete inputs never produce quote tables or application summaries.
  - Verification of schema requirements (no extraneous payment method field).
  - Verification that model/provider branding is absent from user-facing prompts and errors.
  - Happy path with mandatory explicit confirmation before submission.


