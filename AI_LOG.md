# AI Assistant Implementation & Conversation Log 

## 1. Provider & Model Configuration

- **Provider**: Groq Cloud API
- **Model**: `openai/gpt-oss-120b` (official Groq model identifier for GPT-OSS 120B)
- **Fallback Model**: `llama-3.3-70b-versatile` (configured in backend environment handling if model is unavailable)
- **Orchestration Architecture**: Server-side orchestration implemented in `backend/src/services/ai-assistant.service.ts` using `groq-sdk` with maximum 5 tool iteration turns and low temperature (`0.1`) for financial precision.
- **Environment Keys**:
  - `GROQ_API_KEY`: Configured in `backend/.env` (excluded by `.gitignore`).
  - `GROQ_MODEL`: `openai/gpt-oss-120b`.
  - Placeholder configuration is maintained in `backend/.env.example`.

---

## 2. Implemented AI Tools Specification

### Tool 1: `get_loan_schemes()`
- **Purpose**: Retrieves active gold loan schemes from PostgreSQL (`LoanScheme` model).
- **Parameters**: None (`{}`)
- **Guardrails**:
  - The assistant is prohibited from inventing, modifying, or describing schemes not returned directly by this tool.
  - Returns scheme code, name, annual interest rate, tenure, and max LTV.
- **Output Schema**:
  ```json
  {
    "success": true,
    "count": 2,
    "schemes": [
      {
        "id": "...",
        "code": "PLAN_BULLET_01",
        "name": "Bullet Repayment",
        "annualInterestRate": 12.0,
        "tenureMonths": 12,
        "maxLtv": 0.70
      },
      {
        "id": "...",
        "code": "PLAN_EMI_01",
        "name": "Monthly EMI",
        "annualInterestRate": 10.5,
        "tenureMonths": 12,
        "maxLtv": 0.75
      }
    ]
  }
  ```

### Tool 2: `calculate_quote(grossWeightGrams, netWeightGrams, karat)`
- **Purpose**: Authoritative collateral valuation and maximum eligible loan calculations via `LoanCalculatorService`.
- **Parameters**:
  - `grossWeightGrams` (number, required: $0 < \text{gross} \le 1000\text{g}$)
  - `netWeightGrams` (number, required: $0 < \text{net} \le \text{gross}$)
  - `karat` (integer, enum: `[18, 22, 24]`)
- **Guardrails**:
  - **Non-authoritative calculations rule**: The LLM must NEVER calculate, estimate, or invent gold valuation, pure gold grams, interest rates, or loan amounts.
  - Rejects invalid weight relationships with `INVALID_WEIGHT_RELATION` ($45\text{g} > 40\text{g}$).
  - Collateral value is assessed against the authoritative benchmark ₹7,000/g rate.
- **Output Schema**:
  ```json
  {
    "success": true,
    "quote": {
      "grossWeightGrams": 50,
      "netWeightGrams": 45,
      "karat": 22,
      "pureGoldGrams": 41.25,
      "rate24kPerGram": 7000,
      "goldValue": 288750,
      "schemes": [
        {
          "code": "PLAN_BULLET_01",
          "name": "Bullet Repayment",
          "annualInterestRate": 12.0,
          "tenureMonths": 12,
          "maxLtv": 0.70,
          "eligibleLoan": 202125
        },
        {
          "code": "PLAN_EMI_01",
          "name": "Monthly EMI",
          "annualInterestRate": 10.5,
          "tenureMonths": 12,
          "maxLtv": 0.75,
          "eligibleLoan": 216562
        }
      ]
    }
  }
  ```

### Tool 3: `submit_application(payload)`
- **Purpose**: Atomically ingests the verified gold loan application into PostgreSQL (`LoanApplication` model).
- **Parameters**:
  - `fullName` (string, 2–60 characters, letters and spaces only)
  - `mobileNumber` (string, valid 10-digit Indian mobile number starting with 6–9)
  - `grossWeightGrams` (number, $0 < \text{gross} \le 1000\text{g}$)
  - `netWeightGrams` (number, $0 < \text{net} \le \text{gross}$)
  - `karat` (integer, 18, 22, or 24)
  - `schemeId` (string, valid UUID or scheme code e.g. `PLAN_BULLET_01`)
  - `email` (string, optional)
  - `appliedLoanAmount` (number, optional)
  - `userConfirmed` (boolean, required: `true`)
- **Guardrails**:
  - **Mandatory affirmative confirmation**: Rejects submission with `CONFIRMATION_REQUIRED` unless `userConfirmed === true`.
  - **7-day duplicate mobile lockout**: Rejects existing applications within 7 days with `DUPLICATE_APPLICATION` and provides the existing application ID.
  - **Single submission enforcement**: Intercepts repeat confirmations on already submitted applications with `ALREADY_SUBMITTED` without hitting the database or throwing unhandled 409 errors.

---

## 3. Five Required Conversation Scenarios

These five scenarios are permanently verified in automated test suite `backend/test/ai-assistant.test.ts`:

### Scenario 1: Happy Path Through Confirmed Submission
- **User Prompt**: *"I want to apply for a loan against 50g gross (45g net) 22K gold."*
- **Assistant Execution Flow**:
  1. Invokes tool `calculate_quote({ grossWeightGrams: 50, netWeightGrams: 45, karat: 22 })`.
  2. Receives valuation: ₹2,88,750 collateral value, ₹2,02,125 under Bullet Repayment (12% p.a.), ₹2,16,562 under Monthly EMI (10.5% p.a.).
  3. Displays structured `QuoteSummaryCard` and requests applicant details (Full Name, Mobile Number, Scheme).
  4. User provides: *"My name is Rohan Varma, mobile 9876600001, scheme Bullet Repayment."*
  5. Assistant outputs structured Application Summary card with masked mobile (`9876XXXX01`) and visible **Confirm Application** and **Cancel** buttons, prompting:
     *"Do you confirm and authorize this gold loan application? (Yes/No)"*
  6. User clicks **Confirm Application** (or types *"Yes, I confirm"*).
  7. Assistant invokes tool `submit_application({ fullName: "Rohan Varma", mobileNumber: "9876600001", grossWeightGrams: 50, netWeightGrams: 45, karat: 22, schemeId: "PLAN_BULLET_01", userConfirmed: true })`.
  8. Application created in PostgreSQL (`ALD-XXXXX-XXXX`).
  9. Assistant returns success state with Application ID, Application Number, and `SUBMITTED` status. Pending confirmation card is permanently hidden.
- **Actual Test Outcome**: Verified in `test/ai-assistant.test.ts` (Scenario 1 Happy Path test passes).

---

### Scenario 2: Missing Information & Follow-Up Questions
- **User Prompt**: *"Hi, I have some gold jewelry at home and need cash. How much can I get?"*
- **Assistant Execution Flow**:
  1. Detects that gross weight, net gold weight, and purity karat are missing.
  2. Does NOT invoke any tool or guess numbers.
  3. Responds with targeted follow-up questions:
     *"I would be glad to help you get a gold loan quote. To calculate your valuation accurately, could you please provide:
     1. Gross physical weight (in grams)
     2. Net gold weight excluding stones (in grams)
     3. Gold purity (18K, 22K, or 24K)?"*
  4. Preserves conversation context so that when the user supplies the missing parameters, previously given information is retained without asking again.
- **Actual Test Outcome**: Verified in `test/ai-assistant.test.ts` (Scenario 2 Missing Information test passes).

---

### Scenario 3: Duplicate Mobile Number Within Seven Days
- **User Prompt**: User confirms application with mobile number `9876600002` that already applied 2 days prior.
- **Assistant Execution Flow**:
  1. Invokes `submit_application` with `mobileNumber: "9876600002"`.
  2. PostgreSQL duplicate detection catches active lead within 7-day window.
  3. Tool returns:
     `{ success: false, error: "DUPLICATE_APPLICATION", existingApplicationId: "3fabf199-...", message: "A gold loan application for mobile number 9876600002 was already submitted within the last 7 days..." }`
  4. Assistant receives error, stops workflow, and does NOT retry.
  5. Informs applicant:
     *"An active application already exists for mobile number 9876XXXX02 within the last 7 days (Existing Application ID: 3fabf199-...). Under RBI compliance rules, duplicate applications within 7 days are restricted. Please check your existing application status in the dashboard."*
- **Actual Test Outcome**: Verified in `test/ai-assistant.test.ts` (Scenario 3 Duplicate Mobile test passes).

---

### Scenario 4: Off-Topic Request Politely Declined
- **User Prompt**: *"What is the best cryptocurrency or stock to buy right now for quick profit?"*
- **Assistant Execution Flow**:
  1. Domain guardrail triggers on off-topic financial speculation.
  2. Assistant does not invoke any tools or provide market tips.
  3. Replies politely and firmly:
     *"I am AuLoanDesk's specialized Gold Loan Assistant. I can only assist you with gold loan inquiries, valuations, and applications. How can I help you with your gold loan today?"*
- **Actual Test Outcome**: Verified in `test/ai-assistant.test.ts` (Scenario 4 Off-topic test passes).

---

### Scenario 5: Net Weight Greater than Gross Weight
- **User Prompt**: *"Calculate my quote: gross weight is 40g and net weight is 45g with 22 karat."*
- **Assistant Execution Flow**:
  1. Invokes tool `calculate_quote({ grossWeightGrams: 40, netWeightGrams: 45, karat: 22 })`.
  2. Backend validator catches $45\text{g} > 40\text{g}$ and returns:
     `{ success: false, error: "INVALID_WEIGHT_RELATION", message: "Net gold weight cannot exceed gross weight." }`
  3. Assistant explains error clearly and prompts user for corrected numbers:
     *"There was an issue with your weights: Net gold weight (45g) cannot exceed gross physical weight (40g). Please provide the correct weights where net gold weight is less than or equal to gross weight."*
- **Actual Test Outcome**: Verified in `test/ai-assistant.test.ts` (Scenario 5 Net > Gross test passes).

---

## 4. Observed AI Mistakes & Automated Test Guards

### Mistake 1: Premature Submission Hallucination
- **Observed Behavior**: During initial prototyping, when the user supplied all required parameters in one message, the model occasionally invoked `submit_application` immediately in the same turn without displaying the confirmation summary or asking for affirmative confirmation.
- **Automated Test Guard**: Backend tool validator in `executeTool` strictly checks `args.userConfirmed === true`. If false or missing, it aborts with `CONFIRMATION_REQUIRED`. Test `"Confirmation Guardrail: submit_application rejects without explicit user confirmation"` in `backend/test/ai-assistant.test.ts` validates this behavior.

### Mistake 2: Missing Details Follow-Up Protocol
- **Observed Behavior**: The model would sometimes invent a default karat (e.g. assuming 22K) or assume Bullet Repayment when the user omitted them, or output incomplete quotes.
- **Automated Test Guard**: System prompt Rule 3 explicitly lists mandatory parameters for quotes (3 parameters) and applications (6 parameters). If any parameter is missing, the assistant MUST NOT call `calculate_quote` or `submit_application`. Tests `"Missing required fields trigger follow-up questions without premature tool calls or quotes"` and `"Incomplete details never produce a quote table or application summary"` verify this.

### Mistake 3: Repeated Confirmation / Post-Submission Re-prompting
- **Observed Behavior**: After clicking Confirm Application, the user's message *"Yes, I confirm and authorize this gold loan application"* was previously treated by the stateless LLM as a new confirmation request, prompting for confirmation again or causing a 409 conflict.
- **Automated Test Guard**: Backend `chatWithAssistant` scans conversation history for existing application numbers (`ALD-XXXXX-XXXX`). If present, system context enforces post-submission behavior, and any repeat `submit_application` calls are intercepted with `ALREADY_SUBMITTED`. Test `"Regression: after clicking Confirm Application and successful submission, repeated confirmation message... is handled exactly once"` verifies single submission.

### Mistake 4: Disappearing Confirmation Buttons & Viewport Clipping
- **Observed Behavior**: In the chat widget, when both `QuoteSummaryCard` (~350px) and `ApplicationConfirmationCard` (~320px) rendered together, synchronous smooth scrolling stopped halfway down the message bubble, cutting off the Confirm Application and Cancel buttons below the scrollable viewport. Additionally, if the LLM emitted a markdown table instead of JSON, the table was stripped on the backend, leaving `applicationSummary` null.
- **Automated Test Guard**: Multi-strategy parsing in `extractApplicationSummary` supports JSON blocks with flexible field order as well as Markdown pipe tables. On the frontend, `AiAssistantChat.tsx` uses dual-trigger scroll alignment (`requestAnimationFrame` + `container.scrollTop = container.scrollHeight`), ensuring the confirmation card and its buttons are immediately visible without manual scrolling.

---

## 5. Actual Test Verification Results

All 26 AI Assistant tests and all 68 backend tests pass cleanly in Vitest:

```
 RUN  v5.0.4 D:/Personal Project/TGlobal/backend

 ✓ test/loan-calculator.test.ts (8 tests)
 ✓ test/health.test.ts (2 tests)
 ✓ test/ai-assistant.test.ts (26 tests)
 ✓ test/loan-api.test.ts (15 tests)
 ✓ test/backend-hardening.test.ts (17 tests)

 Test Files  5 passed (5)
      Tests  68 passed (68)
   Duration  1.33s
```

### AI Assistant Test Coverage Detail (`test/ai-assistant.test.ts`):
1. `Tool 1: get_loan_schemes returns active schemes from database` (PASS)
2. `Tool 2: calculate_quote computes authoritative financial figures` (PASS)
3. `Tool 2: calculate_quote rejects when net weight > gross weight` (PASS)
4. `Tool 2: calculate_quote rejects unsupported karats (e.g., 20K)` (PASS)
5. `Tool 3: submit_application succeeds with valid payload and userConfirmed: true` (PASS)
6. `Confirmation Guardrail: submit_application rejects without explicit user confirmation` (PASS)
7. `Scenario 1: Happy path conversation through confirmed submission` (PASS)
8. `Scenario 2: Missing information triggers targeted follow-up questions` (PASS)
9. `Scenario 3: Duplicate mobile number within 7 days triggers error handling` (PASS)
10. `Scenario 4: Off-topic request is politely declined` (PASS)
11. `Scenario 5: Net weight greater than gross weight triggers validation error` (PASS)
12. `HTTP POST /api/v1/assistant/chat processes multi-turn messages and returns structured response` (PASS)
13. `HTTP POST /api/v1/chat endpoint alias functions identically to /api/v1/assistant/chat` (PASS)
14. `HTTP POST /api/v1/assistant/chat validates message structure with 400 for empty payload` (PASS)
15. `Clean summary extraction: extractQuoteSummary derives structured quote` (PASS)
16. `Clean summary extraction: stripMarkdownTables cleans raw pipe tables` (PASS)
17. `Missing required fields trigger follow-up questions without premature tool calls or quotes` (PASS)
18. `Schema requirement check: Payment method is not part of existing schema and not required` (PASS)
19. `Incomplete details never produce a quote table or application summary` (PASS)
20. `Previously supplied details are retained during follow-up questions` (PASS)
21. `Model and provider branding do not appear in user-facing message text` (PASS)
22. `Successful confirmation: submits application exactly once, returns submittedApplication with ID, applicationNumber and status SUBMITTED, and suppresses pending confirmation cards` (PASS)
23. `Repeated confirmation / post-submission query: does not trigger duplicate submission or throw unhandled 409 error` (PASS)
24. `Cancellation flow: user clicking Cancel or declining does not invoke submit_application` (PASS)
25. `Regression: after clicking Confirm Application and successful submission, repeated confirmation message is handled exactly once` (PASS)
26. `End-to-end API verification of single submission state over HTTP` (PASS)

---

## 6. Known Limitations & Engineering Mitigations

1. **LLM Formatting Non-Determinism**:
   - *Limitation*: LLMs may output application summaries in diverse formats (JSON code blocks, Markdown pipe tables, bullet lists).
   - *Mitigation*: Backend `extractApplicationSummary` implements multi-strategy extraction: it first scans for ````application-summary```` or ````json```` blocks with flexible key order, then parses Markdown pipe tables before they are stripped. Numeric values are sanitized with regex to remove commas and currency symbols.

2. **Network Timeouts & Rate Limits**:
   - *Limitation*: External LLM API calls may encounter latency spikes or HTTP 429 rate limits.
   - *Mitigation*: The service catches HTTP 429 and returns a polite domain error (`RATE_LIMIT_EXCEEDED`). A fallback model (`llama-3.3-70b-versatile`) is supported if the primary model is unavailable.

3. **Multi-Turn Context Size**:
   - *Limitation*: Extended chat sessions accumulate token overhead.
   - *Mitigation*: The frontend only sends active conversation turns; tool call iterations are capped at 5 per request; system instructions enforce concise responses.
