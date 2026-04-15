# PRODREADY User Interaction & Prompt Flow

> **Last Updated:** 2026-01-16
> **Version:** 1.0
> **Status:** Phase 0 Complete - Ready for Phase 1 Implementation

---

## Table of Contents

1. [High-Level Interaction Flow](#high-level-interaction-flow)
2. [Detailed Cycle Workflow](#detailed-cycle-workflow)
3. [Agent Communication Patterns](#agent-communication-patterns)
4. [User Approval Gates](#user-approval-gates)
5. [Error Handling & Retry Flow](#error-handling--retry-flow)
6. [Multi-Cycle Session Flow](#multi-cycle-session-flow)

---

## High-Level Interaction Flow

```mermaid
sequenceDiagram
    actor User
    participant CLI as PRODREADY CLI
    participant Orch as Orchestrator Agent
    participant Specialists as Specialist Agents
    participant Eval as Evaluator Agent
    participant Report as Reporting Agent

    User->>CLI: prodready cycle --category security
    CLI->>CLI: Load .harden/state.yaml
    CLI->>Orch: Initialize session context

    Note over Orch: System prompt loaded<br/>with cached instructions

    Orch->>User: 🔍 Starting security cycle<br/>Current status: 0/3 categories complete
    Orch->>Specialists: Spawn Planner Agent

    Note over Specialists: Analyze codebase diff<br/>Classify findings<br/>Plan test targets

    Specialists-->>Orch: Plan generated (plan-001.yaml)
    Orch->>User: 📋 Plan Summary:<br/>- 3 security scans<br/>- 5 affected routes<br/>- Est. 8-12 min
    Orch->>User: ❓ Approve plan? [Y/n/modify]

    User->>Orch: Y

    Orch->>Specialists: Execute Security Agent

    loop For each scan target
        Specialists->>Specialists: Run Semgrep/Snyk
        Specialists->>User: ⏳ Scanning api/auth...
        Specialists->>User: ⚠️  Found 2 high severity issues
    end

    Specialists-->>Orch: Raw findings (12 total)

    Orch->>Eval: Validate & ground findings

    Note over Eval: Opus 4.5 validation<br/>Cross-check code<br/>Add explanations

    Eval-->>Orch: Evaluated findings (10 verified)

    Orch->>User: 📊 Evaluation complete:<br/>✅ 10 verified findings<br/>❌ 2 false positives removed

    Orch->>User: Present findings with details

    loop For each finding
        Orch->>User: Display finding card
        User->>Orch: [approve/suppress/modify]
    end

    Orch->>Report: Generate artifacts
    Report-->>Orch: harden-report.html<br/>harden-findings.sarif

    Orch->>CLI: Update state.yaml
    CLI->>User: ✅ Cycle complete!<br/>📄 View report: .harden/harden-report.html
```

---

## Detailed Cycle Workflow

### 1. Initialization Phase

```mermaid
flowchart TD
    Start([User: prodready cycle]) --> LoadState[Load .harden/state.yaml]
    LoadState --> CheckInit{.harden/<br/>exists?}

    CheckInit -->|No| Error[❌ Error: Run 'prodready init' first]
    CheckInit -->|Yes| LoadConfig[Load .harden/config.yaml]

    LoadConfig --> CheckCategory{Category<br/>specified?}

    CheckCategory -->|No| Interactive[Show category selector]
    CheckCategory -->|Yes| ValidateCategory{Category<br/>valid?}

    Interactive --> UserSelect[User selects category]
    UserSelect --> ValidateCategory

    ValidateCategory -->|Invalid| Error2[❌ Error: Unknown category]
    ValidateCategory -->|Valid| CheckStatus{Already<br/>complete?}

    CheckStatus -->|Yes| Warn[⚠️  Warning: Category already complete<br/>Continue anyway?]
    CheckStatus -->|No| InitOrch[Initialize Orchestrator Agent]

    Warn --> UserDecision{User<br/>choice?}
    UserDecision -->|No| End([Exit])
    UserDecision -->|Yes| InitOrch

    InitOrch --> BuildContext[Build session context:<br/>- Current state<br/>- Git diff<br/>- Previous findings<br/>- Config settings]

    BuildContext --> StartCycle[🚀 Start Cycle Workflow]

    Error --> End
    Error2 --> End
```

### 2. Planning Phase

```mermaid
sequenceDiagram
    participant Orch as Orchestrator
    participant Planner as Planner Agent
    participant User
    participant Git as Git Agent

    Orch->>Git: Get diff since last cycle
    Git-->>Orch: Diff summary (12 files changed)

    Orch->>Planner: Analyze diff + classify category

    Note over Planner: Uses Context Engine MCP<br/>Analyzes dependencies<br/>Classifies criticality

    Planner->>Planner: Identify affected routes
    Planner->>Planner: Classify finding types
    Planner->>Planner: Assess criticality
    Planner->>Planner: Estimate runtime

    Planner-->>Orch: plan-001.yaml

    Orch->>User: 📋 Present plan summary

    rect rgb(230, 230, 250)
        Note over User: Plan Display Format:<br/><br/>Category: Security<br/>Scope: 5 routes, 12 files<br/>Actions:<br/>  • SAST scan (Semgrep)<br/>  • Dependency scan (Snyk)<br/>  • ESLint security rules<br/>Estimated: 8-12 minutes<br/><br/>Critical flows: 2<br/>  - /api/auth (login)<br/>  - /api/users (data access)<br/><br/>Non-critical flows: 3<br/>  - /search<br/>  - /profile<br/>  - /settings
    end

    Orch->>User: ❓ Options:<br/>[A] Approve & continue<br/>[M] Modify plan<br/>[S] Skip this cycle<br/>[?] Explain details

    alt User approves
        User->>Orch: A
        Orch->>Orch: Proceed to execution
    else User modifies
        User->>Orch: M
        Orch->>User: What would you like to change?
        User->>Orch: Only scan critical flows
        Orch->>Planner: Regenerate plan (critical only)
        Planner-->>Orch: Updated plan
        Orch->>User: 📋 Updated plan summary
    else User requests explanation
        User->>Orch: ?
        Orch->>User: Detailed explanation of each action
        Orch->>User: ❓ Approve updated plan? [Y/n/modify]
    else User skips
        User->>Orch: S
        Orch->>User: ⏭️  Cycle skipped
    end
```

### 3. Execution Phase

```mermaid
flowchart TD
    Start([Plan Approved]) --> DetermineAgent{Category<br/>type?}

    DetermineAgent -->|security| SpawnSecurity[Spawn Security Agent]
    DetermineAgent -->|e2e_tests| SpawnPlaywright[Spawn Playwright Agent]
    DetermineAgent -->|smoke_tests| SpawnBoth[Spawn Security + Playwright]

    SpawnSecurity --> SecurityWork[Security Workflow]
    SpawnPlaywright --> PlaywrightWork[Playwright Workflow]
    SpawnBoth --> SecurityWork
    SpawnBoth --> PlaywrightWork

    SecurityWork --> RunSAST[Run SAST Semgrep]
    RunSAST --> StreamProgress1[⏳ User: Scanning api/auth...]
    StreamProgress1 --> RunSCA[Run SCA Snyk]
    RunSCA --> StreamProgress2[⏳ User: Checking dependencies...]
    StreamProgress2 --> RunESLint[Run ESLint security rules]
    RunESLint --> StreamProgress3[⏳ User: Analyzing code patterns...]
    StreamProgress3 --> CollectFindings[Collect raw findings]

    PlaywrightWork --> DiscoverRoutes[Discover routes via Next.js MCP]
    DiscoverRoutes --> StreamProgress4[⏳ User: Discovering routes...]
    StreamProgress4 --> GenerateTests[Generate Playwright tests]
    GenerateTests --> StreamProgress5[⏳ User: Generating test: auth-flow.spec.ts]
    StreamProgress5 --> ExecuteTests[Execute tests in Docker]
    ExecuteTests --> StreamProgress6[⏳ User: Running tests...]
    StreamProgress6 --> CaptureEvidence[Capture traces/screenshots]
    CaptureEvidence --> CollectResults[Collect test results]

    CollectFindings --> Merge[Merge all findings]
    CollectResults --> Merge

    Merge --> ReturnToOrch[Return to Orchestrator]

    ReturnToOrch --> EvaluationPhase([Evaluation Phase])
```

### 4. Evaluation & Approval Phase

```mermaid
sequenceDiagram
    participant Orch as Orchestrator
    participant Eval as Evaluator Agent<br/>(Opus 4.5)
    participant User

    Orch->>Eval: Validate findings (12 raw)

    Note over Eval: Uses Opus 4.5<br/>Highest quality validation

    loop For each finding
        Eval->>Eval: Read actual code at location
        Eval->>Eval: Verify issue exists
        Eval->>Eval: Add file:line grounding
        Eval->>Eval: Generate explanation
        Eval->>Eval: Assess confidence level
        Eval->>Eval: Check false positive likelihood
    end

    Eval-->>Orch: Evaluated findings:<br/>✅ 10 verified<br/>❌ 2 false positives

    Orch->>User: 📊 Evaluation Summary:<br/><br/>✅ 10 verified findings<br/>  • 3 high severity<br/>  • 5 medium severity<br/>  • 2 low severity<br/><br/>❌ 2 false positives removed<br/><br/>Ready to review findings...

    User->>Orch: [Press Enter to continue]

    loop For each verified finding
        Orch->>User: Present finding card

        rect rgb(255, 240, 240)
            Note over User: Finding Card Display:<br/><br/>════════════════════════════════<br/>Finding #1 of 10<br/>════════════════════════════════<br/><br/>🚨 HIGH SEVERITY<br/><br/>Issue: Cross-Site Scripting (XSS) vulnerability<br/><br/>Location: src/components/SearchBar.tsx:42<br/><br/>Code:<br/>```typescript<br/>const searchQuery = req.query.q;<br/>return div{searchQuery}/div; // ← Unsafe<br/>```<br/><br/>Explanation:<br/>User input from query parameter 'q' is<br/>directly rendered without sanitization...<br/><br/>Recommendation:<br/>Use DOMPurify or escape user input:<br/>```typescript<br/>import DOMPurify from 'dompurify';<br/>const sanitized = DOMPurify.sanitize(searchQuery);<br/>```<br/><br/>References:<br/>• CWE-79: Cross-site Scripting<br/>• OWASP A7:2017-XSS<br/><br/>Confidence: HIGH<br/>════════════════════════════════
        end

        Orch->>User: ❓ Actions:<br/>[A] Approve (include in report)<br/>[S] Suppress (add to .hardenignore)<br/>[M] Modify explanation<br/>[?] More details<br/>[Q] Approve remaining & quit

        alt User approves
            User->>Orch: A
            Orch->>Orch: Mark finding as approved
        else User suppresses
            User->>Orch: S
            Orch->>User: Reason for suppression? (optional)
            User->>Orch: Known issue, tracked in JIRA-123
            Orch->>Orch: Add to .hardenignore with comment
        else User modifies
            User->>Orch: M
            Orch->>User: What needs clarification?
            User->>Orch: Add note about staging environment
            Orch->>Eval: Regenerate explanation with context
            Eval-->>Orch: Updated explanation
            Orch->>User: 📝 Updated finding
        else User requests details
            User->>Orch: ?
            Orch->>User: Full technical details + exploit scenario
            Orch->>User: ❓ Approve? [A/S/M]
        else User approves all
            User->>Orch: Q
            Orch->>Orch: Auto-approve remaining findings
        end
    end

    Orch->>User: ✅ Review complete!<br/>Approved: 8 findings<br/>Suppressed: 2 findings<br/><br/>Proceeding to report generation...
```

### 5. Reporting Phase

```mermaid
flowchart TD
    Start([Findings Approved]) --> CheckArtifacts{Artifacts<br/>exist?}

    CheckArtifacts -->|First cycle| CreateNew[Create new artifacts]
    CheckArtifacts -->|Subsequent cycle| AppendMode[Append mode]

    CreateNew --> GenHTML[Generate harden-report.html]
    AppendMode --> AppendHTML[Append to harden-report.html]

    GenHTML --> HTMLContent[HTML content includes:<br/>• Executive summary<br/>• Cycle history<br/>• Findings by severity<br/>• Test results<br/>• Evidence links<br/>• Progress charts]

    AppendHTML --> HTMLContent

    HTMLContent --> GenSARIF[Generate/update harden-findings.sarif]

    GenSARIF --> SARIFContent[SARIF content includes:<br/>• Schema v2.1.0<br/>• Tool metadata<br/>• Results array<br/>• Location data<br/>• Severity levels<br/>• CWE/OWASP mapping]

    SARIFContent --> UpdateState[Update .harden/state.yaml]

    UpdateState --> StateChanges[State updates:<br/>• Increment cycle count<br/>• Update category status<br/>• Record findings count<br/>• Update last_cycle_id<br/>• Update timestamps]

    StateChanges --> CreateCycleRecord[Create .harden/cycles/cycle-001.yaml]

    CreateCycleRecord --> CycleData[Cycle record includes:<br/>• Full plan<br/>• Execution log<br/>• Findings IDs<br/>• Approvals<br/>• Model usage<br/>• Cost data<br/>• Cache metrics]

    CycleData --> GitCommit{Auto-commit<br/>enabled?}

    GitCommit -->|Yes| CommitChanges[Git commit:<br/>• Updated artifacts<br/>• State files<br/>• Test files<br/>• Cycle record]

    GitCommit -->|No| Skip[Skip commit]

    CommitChanges --> Display[Display summary to user]
    Skip --> Display

    Display --> ShowSummary[📊 User sees:<br/>━━━━━━━━━━━━━━━━━━━━━━━━<br/>✅ Cycle 1 Complete!<br/>━━━━━━━━━━━━━━━━━━━━━━━━<br/><br/>Category: Security<br/>Status: Complete<br/><br/>Results:<br/>• 8 findings approved<br/>• 2 findings suppressed<br/>• 0 tests generated<br/>• Duration: 9m 23s<br/><br/>Artifacts:<br/>📄 harden-report.html<br/>📄 harden-findings.sarif<br/><br/>Cost: $1.47 USD<br/>Models used:<br/>  • Sonnet 4.5: 3 calls<br/>  • Opus 4.5: 1 call<br/>  • Haiku 4: 2 calls<br/><br/>Next: Run 'prodready status']

    ShowSummary --> End([End Cycle])
```

---

## Agent Communication Patterns

### Orchestrator ↔ Specialist Communication

```mermaid
sequenceDiagram
    participant Orch as Orchestrator<br/>(Stateful)
    participant Spec as Specialist Agent<br/>(Stateless)

    Note over Orch: Maintains conversation context<br/>across entire session

    Orch->>Spec: Spawn with task context

    rect rgb(240, 248, 255)
        Note over Spec: Task Context:<br/>{<br/>  task_type: "security_scan",<br/>  scope: ["api/auth", "api/users"],<br/>  config: { tool: "semgrep" },<br/>  previous_findings: [...],<br/>  cached_content: [...]<br/>}
    end

    Spec->>Spec: Load cached system prompt
    Spec->>Spec: Load cached MCP tools
    Spec->>Spec: Execute task

    loop Progress updates
        Spec->>Orch: Stream progress
        Orch->>Orch: Update CLI display
    end

    Spec-->>Orch: Task result + metadata

    rect rgb(240, 255, 240)
        Note over Orch: Result Format:<br/>{<br/>  status: "success",<br/>  findings: [...],<br/>  evidence: [...],<br/>  model_used: "sonnet-4.5",<br/>  tokens: {input: 1200, output: 800},<br/>  duration_ms: 8234,<br/>  cache_hit_rate: 0.65<br/>}
    end

    Orch->>Orch: Integrate result into context

    Note over Orch: Context preserved for<br/>next specialist invocation
```

### Prompt Caching Flow

```mermaid
flowchart LR
    subgraph "First Cycle"
        A1[Orchestrator Init] --> B1[Build System Prompt]
        B1 --> C1[Mark as cacheable]
        C1 --> D1[API Call: +3% cache write cost]
        D1 --> E1[Response received]
    end

    subgraph "Second Cycle"
        A2[Orchestrator Init] --> B2[Build System Prompt]
        B2 --> C2[Check version hash]
        C2 --> D2{Prompt<br/>changed?}
        D2 -->|No| E2[API Call: Use cache<br/>-90% input token cost]
        D2 -->|Yes| F2[API Call: Invalidate cache<br/>Write new cache]
        E2 --> G2[Response: 2x faster]
        F2 --> G2
    end

    subgraph "Cached Content Types"
        H1[System Prompts<br/>Version: v1.0.0]
        H2[MCP Tool Definitions<br/>Hash: abc123]
        H3[Unchanged Files<br/>SHA: def456]
        H4[Previous Artifacts<br/>Cycle ID: 1]
    end

    style E2 fill:#90EE90
    style G2 fill:#90EE90
    style D1 fill:#FFE4B5
    style F2 fill:#FFE4B5
```

---

## User Approval Gates

### Critical Decision Points

```mermaid
flowchart TD
    Start([Cycle Started]) --> Gate1{Gate 1:<br/>Approve Plan?}

    Gate1 -->|Yes| Execute[Execute Plan]
    Gate1 -->|Modify| ModifyPlan[User modifies plan]
    Gate1 -->|No| CancelCycle[❌ Cycle cancelled]

    ModifyPlan --> Regenerate[Planner regenerates plan]
    Regenerate --> Gate1

    Execute --> Gate2{Gate 2:<br/>Review Findings?}

    Gate2 -->|Yes| ShowFindings[Present findings one-by-one]
    Gate2 -->|Skip| AutoApprove[⚠️  Auto-approve all<br/>with low confidence]

    ShowFindings --> PerFinding{For each<br/>finding}

    PerFinding -->|Approve| AddToReport[✅ Add to report]
    PerFinding -->|Suppress| AddToIgnore[Add to .hardenignore]
    PerFinding -->|Modify| EditFinding[User edits explanation]

    AddToReport --> NextFinding{More<br/>findings?}
    AddToIgnore --> NextFinding
    EditFinding --> AddToReport

    NextFinding -->|Yes| PerFinding
    NextFinding -->|No| Gate3{Gate 3:<br/>Generate Report?}

    AutoApprove --> Gate3

    Gate3 -->|Yes| GenerateArtifacts[Generate HTML + SARIF]
    Gate3 -->|No| SaveDraft[💾 Save draft state]

    GenerateArtifacts --> Gate4{Gate 4:<br/>Commit Changes?}

    Gate4 -->|Yes| GitCommit[Git commit + push]
    Gate4 -->|No| ManualCommit[User commits manually later]

    GitCommit --> Complete[✅ Cycle Complete]
    ManualCommit --> Complete
    SaveDraft --> Complete
    CancelCycle --> End([End])
    Complete --> End

    style Gate1 fill:#FFE4B5
    style Gate2 fill:#FFE4B5
    style Gate3 fill:#FFE4B5
    style Gate4 fill:#FFE4B5
```

---

## Error Handling & Retry Flow

```mermaid
sequenceDiagram
    participant User
    participant Orch as Orchestrator
    participant Agent as Specialist Agent
    participant Retry as Retry Logic

    Orch->>Agent: Execute task
    Agent->>Agent: Attempt operation
    Agent-->>Orch: ❌ Error: API timeout

    Orch->>Retry: Check retry policy

    rect rgb(255, 240, 240)
        Note over Retry: Retry Policy:<br/><br/>Max retries: 3<br/>Backoff: exponential (2s, 4s, 8s)<br/>Retryable errors:<br/>  • API timeout<br/>  • Rate limit<br/>  • Temporary network error<br/><br/>Non-retryable errors:<br/>  • Auth failure<br/>  • Invalid config<br/>  • Model not found
    end

    alt Retryable & attempts < max
        Retry->>User: ⚠️  Temporary error, retrying... (1/3)
        Retry->>Agent: Retry with backoff
        Agent->>Agent: Attempt operation

        alt Success on retry
            Agent-->>Orch: ✅ Success
            Orch->>User: ✅ Recovered from error
        else Failure persists
            Agent-->>Orch: ❌ Error persists
            Retry->>User: ⚠️  Retrying... (2/3)
            Retry->>Agent: Retry with longer backoff

            alt Success on 2nd retry
                Agent-->>Orch: ✅ Success
                Orch->>User: ✅ Recovered after 2 retries
            else Max retries exhausted
                Agent-->>Orch: ❌ Max retries exceeded
                Orch->>User: ❌ Operation failed after 3 attempts<br/><br/>Options:<br/>[R] Retry manually<br/>[S] Skip this operation<br/>[A] Abort cycle

                User->>Orch: Choice?

                alt User retries
                    Orch->>Agent: Manual retry
                else User skips
                    Orch->>Orch: Mark operation as skipped
                    Orch->>User: ⏭️  Operation skipped, continuing...
                else User aborts
                    Orch->>User: 🛑 Cycle aborted
                    Orch->>Orch: Save partial state
                end
            end
        end
    else Non-retryable error
        Retry->>User: ❌ Fatal error: Invalid API key<br/><br/>Please check your ANTHROPIC_API_KEY<br/>and run 'prodready cycle' again.
        Orch->>Orch: Save error state
    end
```

---

## Multi-Cycle Session Flow

### Complete Session from Init to Multiple Cycles

```mermaid
flowchart TD
    Start([New Project]) --> Init[prodready init]

    Init --> CreateStructure[Create .harden/ structure]
    CreateStructure --> CreateBranch[Create hardening branch]
    CreateBranch --> InitState[Initialize state.yaml]

    InitState --> Cycle1Start[prodready cycle --category security]

    Cycle1Start --> C1Plan[Plan security scan]
    C1Plan --> C1Exec[Execute Security Agent]
    C1Exec --> C1Eval[Evaluate findings Opus 4.5]
    C1Eval --> C1Approve[User approves 8 findings]
    C1Approve --> C1Report[Generate artifacts<br/>Cycle 1]
    C1Report --> C1State[Update state:<br/>security: in_progress<br/>last_cycle_id: 1]

    C1State --> Status1[prodready status]
    Status1 --> ShowStatus1[📊 1/3 categories started<br/>8 findings total]

    ShowStatus1 --> Cycle2Start[prodready cycle --category e2e_tests]

    Cycle2Start --> C2Plan[Plan E2E tests]
    C2Plan --> C2Exec[Execute Playwright Agent]
    C2Exec --> C2Tests[Generate 5 tests]
    C2Tests --> C2Run[Run tests: 4 pass, 1 fail]
    C2Run --> C2Eval[Evaluate test quality]
    C2Eval --> C2Approve[User approves tests]
    C2Approve --> C2Report[Append to artifacts<br/>Cycle 2]
    C2Report --> C2State[Update state:<br/>e2e_tests: complete<br/>last_cycle_id: 2]

    C2State --> Cycle3Start[prodready cycle --category security]

    Note1[Re-running security<br/>after code changes]
    Cycle3Start -.->|context| Note1

    Cycle3Start --> C3Diff[Git diff: 3 files changed]
    C3Diff --> C3Plan[Plan incremental scan<br/>Only affected routes]
    C3Plan --> C3Exec[Execute Security Agent<br/>Faster with caching]
    C3Exec --> C3Eval[Evaluate: 2 new findings<br/>6 previous resolved]
    C3Eval --> C3Cross[Cross-reference with Cycle 1]
    C3Cross --> C3Display[Display:<br/>🟢 6 resolved<br/>🔴 2 new<br/>🟡 2 persisting]
    C3Display --> C3Approve[User approves new findings]
    C3Approve --> C3Report[Append to artifacts<br/>Cycle 3]
    C3Report --> C3State[Update state:<br/>security: complete<br/>last_cycle_id: 3]

    C3State --> FinalStatus[prodready status]

    FinalStatus --> ShowFinal[📊 2/3 categories complete<br/>10 total findings<br/>4 E2E tests passing<br/>Ready for production review]

    ShowFinal --> SessionMode[prodready session --max-cycles 5]

    Note2[Session mode:<br/>Auto-run multiple cycles<br/>with checkpoints]
    SessionMode -.->|context| Note2

    SessionMode --> SessionLoop{Cycle<br/>< max?}

    SessionLoop -->|Yes| AutoCycle[Auto-select next category]
    SessionLoop -->|No| SessionDone[Session complete]

    AutoCycle --> CheckCritical{Critical<br/>issues?}

    CheckCritical -->|Yes| HaltSession[🛑 Halt: Critical issue found<br/>Manual review required]
    CheckCritical -->|No| ContinueSession[Continue to next cycle]

    ContinueSession --> SessionLoop

    HaltSession --> ManualReview[User reviews and fixes]
    ManualReview --> SessionLoop

    SessionDone --> FinalReport[Generate final report<br/>All cycles summarized]

    FinalReport --> End([Project Hardened])

    style Cycle1Start fill:#E6F3FF
    style Cycle2Start fill:#E6F3FF
    style Cycle3Start fill:#E6F3FF
    style SessionMode fill:#FFE6F0
```

---

## Prompt Engineering Patterns

### System Prompt Structure (Cached)

```yaml
# Orchestrator Agent System Prompt (Cached)

version: "PRODREADY_v1.0.0"  # Version string for cache invalidation

role: |
  You are the Orchestrator Agent for PRODREADY, an AI-powered SDLC hardening system.
  Your role is to coordinate the complete hardening workflow from planning through reporting.

capabilities:
  - Spawn and coordinate specialist agents
  - Manage user interactions and approvals
  - Maintain state across cycle phases
  - Assemble final artifacts

tools_available:
  - request_approval: Ask user for approval with structured options
  - prompt_user: Ask user a question and wait for response
  - save_state: Persist state to .harden/state.yaml
  - request_override: Request user override for suppression
  - spawn_agent: Invoke a specialist agent with context

workflow_phases:
  1: planning
  2: execution
  3: evaluation
  4: approval
  5: reporting

conversation_style: |
  - Clear, concise status updates
  - Use emojis for visual clarity (✅ ❌ ⏳ 🚨 📊)
  - Stream progress during long operations
  - Always explain what you're doing and why
  - Present options with clear [A/B/C] choices
  - Respect user decisions (never argue)

critical_rules:
  - ALWAYS use Opus 4.5 for Evaluator agent
  - NEVER auto-approve findings without user consent
  - ALWAYS ground findings with file:line references
  - NEVER modify code without user approval
  - ALWAYS respect .hardenignore suppressions
```

### User Prompt Templates

```typescript
// Finding Presentation Template
const findingPrompt = {
  title: "Finding #{index} of {total}",
  severity: "HIGH | MEDIUM | LOW",
  issue: "Brief one-line description",
  location: "file.ts:line",
  code_snippet: "Surrounding code context",
  explanation: "What, where, why in plain language",
  recommendation: "How to fix with code example",
  references: ["CWE-XX", "OWASP Category"],
  confidence: "HIGH | MEDIUM | LOW",
  actions: [
    "[A] Approve (include in report)",
    "[S] Suppress (add to .hardenignore)",
    "[M] Modify explanation",
    "[?] More details",
    "[Q] Approve remaining & quit"
  ]
};

// Approval Request Template
const approvalPrompt = {
  context: "Current phase and what needs approval",
  summary: "Key metrics or decisions to review",
  options: [
    { key: "Y", label: "Yes, proceed", default: true },
    { key: "N", label: "No, cancel" },
    { key: "M", label: "Modify first" }
  ],
  timeout: 300, // 5 minutes before auto-cancel
  allow_empty: false
};

// Progress Stream Template
const progressPrompt = {
  phase: "execution | evaluation | reporting",
  current_task: "Scanning api/auth...",
  progress: "3/10",
  elapsed_time: "2m 15s",
  estimated_remaining: "~6m",
  spinner: true
};
```

---

## State Transitions

### Category Status Lifecycle

```mermaid
stateDiagram-v2
    [*] --> not_started: Initial state

    not_started --> in_progress: Cycle started

    in_progress --> in_progress: Multiple cycles<br/>refining category
    in_progress --> complete: All critical<br/>issues resolved
    in_progress --> blocked: Critical failure<br/>requires manual fix

    blocked --> in_progress: User resolves<br/>blocking issue

    complete --> in_progress: User re-opens<br/>or new issues found

    complete --> [*]: Category finished
```

### Finding Status Lifecycle

```mermaid
stateDiagram-v2
    [*] --> new: Discovered in<br/>current cycle

    new --> verified: Evaluator confirms<br/>finding is valid
    new --> false_positive: Evaluator rejects

    verified --> approved: User approves<br/>for report
    verified --> suppressed: User suppresses<br/>via .hardenignore

    approved --> resolved: Fixed in<br/>subsequent cycle
    approved --> persisting: Still present in<br/>next cycle

    persisting --> resolved: Fixed later
    persisting --> persisting: Multiple cycles<br/>not yet fixed

    resolved --> regressed: Issue reappears<br/>in later cycle

    regressed --> approved: Re-confirmed<br/>as valid

    false_positive --> [*]
    suppressed --> [*]
    resolved --> [*]
```

---

## CLI Output Examples

### Terminal Output During Cycle

```
$ prodready cycle --category security

🔍 Initializing PRODREADY...
   ✅ Loaded .harden/state.yaml
   ✅ Current branch: harden/2026-01-16-001
   ✅ Git diff: 12 files changed since last cycle

📋 Planning Phase
   ⏳ Analyzing codebase structure...
   ⏳ Classifying affected routes...
   ✅ Plan generated (8-12 min estimated)

════════════════════════════════════════════════════
Plan Summary - Cycle 2 (Security Category)
════════════════════════════════════════════════════

Scope:
  • 5 routes affected
  • 12 files changed
  • 2 critical flows, 3 non-critical flows

Actions:
  1. SAST scan (Semgrep)
     - Focus: XSS, SQL injection, auth bypasses
     - Rulesets: default, security, typescript

  2. Dependency scan (Snyk)
     - Check: npm packages for known CVEs
     - Target: package.json + lock files

  3. ESLint security rules
     - Rules: no-eval, no-implied-eval, detect-unsafe-regex

Estimated Duration: 8-12 minutes
Estimated Cost: $1.20-$1.80 USD

════════════════════════════════════════════════════

❓ Approve plan and continue? [Y/n/modify/?]
> Y

✅ Plan approved, starting execution...

🔬 Execution Phase
   ⏳ Running SAST scan...
      ⏳ Scanning src/api/auth/route.ts...
      ⚠️  Found 2 high severity issues
      ⏳ Scanning src/components/SearchBar.tsx...
      ⚠️  Found 1 medium severity issue
      ⏳ Scanning src/lib/db.ts...
      ✅ No issues found

   ✅ SAST scan complete (12 findings)

   ⏳ Running dependency scan...
      ⏳ Analyzing package.json...
      ⚠️  Found 3 vulnerabilities (1 high, 2 moderate)

   ✅ Dependency scan complete

   ⏳ Running ESLint security rules...
      ✅ No additional issues found

📊 Evaluation Phase (Opus 4.5)
   ⏳ Validating 15 raw findings...
   ⏳ Cross-checking with actual code...
   ⏳ Adding file:line grounding...
   ⏳ Generating explanations...

   ✅ Evaluation complete!
      ✅ 12 findings verified
      ❌ 3 false positives removed

════════════════════════════════════════════════════
Evaluation Summary
════════════════════════════════════════════════════

✅ 12 verified findings:
   • 3 high severity
   • 5 medium severity
   • 4 low severity

❌ 3 false positives removed:
   • 1: Import statement flagged incorrectly
   • 2: Test file flagged (outside scope)
   • 3: Deprecated but safe API usage

Ready to review findings individually...

════════════════════════════════════════════════════

Press [Enter] to continue
>

════════════════════════════════════════════════════
Finding #1 of 12
════════════════════════════════════════════════════

🚨 HIGH SEVERITY

Issue: Cross-Site Scripting (XSS) vulnerability
Location: src/components/SearchBar.tsx:42

Code:
  40 | export function SearchBar({ onSearch }) {
  41 |   const searchQuery = req.query.q;
  42 |   return <div>{searchQuery}</div>;  // ← Unsafe
  43 | }

Explanation:
User input from query parameter 'q' is directly rendered
without sanitization, allowing potential XSS attacks.

An attacker could craft a URL like:
  /search?q=<script>alert('XSS')</script>

The script would execute in the user's browser.

Recommendation:
Use DOMPurify or escape user input before rendering:

  import DOMPurify from 'dompurify';
  const sanitized = DOMPurify.sanitize(searchQuery);
  return <div>{sanitized}</div>;

Or use textContent instead of innerHTML.

References:
  • CWE-79: Cross-site Scripting
  • OWASP A7:2017-XSS

Confidence: HIGH
False Positive Likelihood: LOW

════════════════════════════════════════════════════

❓ Actions:
   [A] Approve (include in report)
   [S] Suppress (add to .hardenignore)
   [M] Modify explanation
   [?] More details
   [Q] Approve remaining & quit
>

[... continues for each finding ...]

✅ Review complete!
   Approved: 10 findings
   Suppressed: 2 findings

📄 Generating Reports
   ⏳ Appending to harden-report.html...
   ⏳ Updating harden-findings.sarif...
   ✅ Artifacts generated

💾 Updating State
   ✅ .harden/state.yaml updated
   ✅ .harden/cycles/cycle-002.yaml created

════════════════════════════════════════════════════
✅ Cycle 2 Complete!
════════════════════════════════════════════════════

Category: Security
Status: Complete

Results:
  • 10 findings approved
  • 2 findings suppressed
  • 0 tests generated
  • Duration: 9m 23s

Artifacts:
  📄 .harden/harden-report.html
  📄 .harden/harden-findings.sarif

Cost: $1.47 USD
Models used:
  • Sonnet 4.5: 3 calls (planning, execution, reporting)
  • Opus 4.5: 1 call (evaluation)
  • Haiku 4: 2 calls (git operations, SARIF formatting)

Cache Performance:
  • Hit rate: 62%
  • Savings: $0.85 (47% vs no cache)
  • Latency improvement: 1.8x

════════════════════════════════════════════════════

Next Steps:
  • View report: .harden/harden-report.html
  • Check status: prodready status
  • Continue: prodready cycle --category e2e_tests

```

---

## Maintenance Notes

**This document should be updated when:**

1. New agents are added to the system
2. User interaction patterns change
3. Approval gates are modified
4. CLI output format changes
5. Error handling logic is updated
6. New prompt engineering patterns emerge
7. State management schema changes

**Update History:**
- 2026-01-16: Initial version (Phase 0 complete)

**Related Documents:**
- [PRODREADY_ARCHITECTURE.md](../../docs/PRODREADY_ARCHITECTURE.md)
- [MULTI_MODEL_ROUTING_STRATEGY.md](../../docs/MULTI_MODEL_ROUTING_STRATEGY.md)
- [PROMPT_CACHING_STRATEGY.md](../../docs/PROMPT_CACHING_STRATEGY.md)
- [START_HERE_IMPLEMENTATION.md](../../docs/START_HERE_IMPLEMENTATION.md)
