# PRODREADY: Complete Architecture & Design Document

> **Last Updated:** 2026-01-14
> **Status:** Architecture Design Phase - Ready for Review
> **Version:** 1.0

---

## 📋 Table of Contents

1. [Business Objectives](#business-objectives)
2. [Technical Architecture](#technical-architecture)
3. [Agent System](#agent-system)
4. [TDD Cycle Model](#tdd-cycle-model)
5. [User Override System](#user-override-system)
6. [MCP Integration](#mcp-integration)
7. [State Management](#state-management)
8. [Artifact Generation](#artifact-generation)
9. [Development Strategy](#development-strategy)
10. [MVP Specification](#mvp-specification)

---

## 🎯 Business Objectives {#business-objectives}

### Primary Business Goal
Enable vibe-coding platforms (Lovable, Bolt, v0, etc.) to **bridge the prototype-to-production gap** by providing an AI-powered hardening service that makes their generated code enterprise-ready.

### Target Buyers & Market

#### Primary Buyer Persona
- **Enterprise vibe-coding platforms** (B2B2B model)
- **Few large customers** (partnership-first, not mass market)
- Platforms need a "**Harden this app**" button to satisfy enterprise customers

#### End Users
- Developers using vibe-coding tools to build prototypes
- Enterprises evaluating whether to adopt vibe-coded applications
- Teams that hit **security/compliance/QA gates** with prototype code

### Value Proposition

#### For Platform Partners (Lovable/Bolt)
✅ **Differentiation:** "Our prototypes are production-ready, not just demos"
✅ **Enterprise sales enabler:** Address security/compliance objections
✅ **Reduced support burden:** Fewer "how do I make this production-ready?" questions
✅ **Upsell opportunity:** Premium feature or add-on service

#### For End Users (Developers)
✅ **Time savings:** Automated test generation + security scanning
✅ **Confidence:** Full audit trail proves compliance readiness
✅ **Learning:** See what production-ready code looks like
✅ **Iterative improvement:** Each cycle improves code quality

#### For Enterprises (Procurement)
✅ **Risk mitigation:** Security findings identified and tracked
✅ **Audit compliance:** SARIF + HTML reports for compliance teams
✅ **Deterministic quality:** Repeatable, automated hardening process
✅ **Vendor credibility:** Vibe-coding platforms become viable for serious projects

### Go-to-Market Strategy

#### Phase 1: Platform Partnerships (v1 focus)
- Target 2-3 major vibe-coding platforms
- Proof-of-concept integrations
- Partnership revenue model (per-hardening-session or subscription)

#### Phase 2: Direct Sales (post-v1)
- Standalone CLI for enterprises
- License model for internal use
- Professional services for custom hardening rules

#### Phase 3: Ecosystem Play (future)
- Marketplace of hardening rules/templates
- Community-contributed test patterns
- Integration with CI/CD platforms

### Revenue Model (Implied)

#### V1 Target: Usage-Based Partnership
- Platforms pay per hardening cycle
- Metering built into CLI from day one
- Transparent cost structure tied to AI API usage

#### Potential Models
- **Per-cycle pricing:** $X per hardening cycle
- **Subscription tiers:** Based on repos hardened per month
- **Platform revenue share:** % of platform's enterprise upsell
- **Enterprise license:** Flat fee for unlimited internal use

### Success Metrics

#### Technical Success (MVP)
- ✅ One complete cycle on real vibe-coded repo
- ✅ Both artifacts generated correctly
- ✅ At least one security finding identified
- ✅ At least one test generated and passing
- ✅ Deterministic, repeatable results

#### Business Success (Post-MVP)
- 🎯 Partnership MOU with 1+ vibe-coding platform
- 🎯 10+ real repos successfully hardened
- 🎯 Benchmark showing measurable improvement
- 🎯 Customer testimonial/case study
- 🎯 Clear ROI calculation for platform partners

### Competitive Positioning

**Category Creation:** "AI-Powered SDLC Hardening for Vibe-Coded Applications"

#### Why Now?
- ✅ Vibe-coding is exploding (Lovable, Bolt, v0, Cursor, etc.)
- ✅ Enterprises are skeptical of AI-generated code
- ✅ Gap between prototype and production is painful
- ✅ MCP ecosystem makes integration feasible
- ✅ Claude's coding capabilities are production-ready

#### Differentiation vs. Alternatives

| Alternative | Limitation | PRODREADY Advantage |
|------------|-----------|-------------------|
| Manual testing/security | Too slow, expensive | Automated + AI-guided |
| Generic SAST tools | Not vibe-code aware | Understands vibe patterns |
| CI/CD only | Post-commit feedback | Pre-merge hardening |
| Consulting services | Not scalable | Self-service + audit trail |

### Core Insight

**PRODREADY doesn't compete with vibe-coding platforms—it enables them.**

By solving the "prototype to production" problem, PRODREADY makes vibe-coding viable for enterprise use cases, dramatically expanding the addressable market for platform partners.

**This is platform enablement, not a standalone product.**

---

## 🏗️ Technical Architecture {#technical-architecture}

### High-Level Architecture

```
PRODREADY CLI (Local, TypeScript/Node.js)
├── Conversational Engine
│   └── Claude streaming API (@anthropic-ai/sdk)
│       ├── Custom Tools (approve, prompt, report)
│       └── Bundled MCP Servers
│           ├── Microsoft Playwright MCP
│           ├── Semgrep MCP
│           ├── Git/GitHub MCP
│           ├── Next.js DevTools MCP
│           ├── Test Runner MCP
│           ├── Snyk MCP
│           ├── ESLint MCP
│           └── Context Engine MCP
├── State Management
│   ├── .harden/ (repo-resident state)
│   ├── Cycle records (append-only YAML)
│   └── Evidence manifests (JSON)
└── Artifact Generation
    ├── harden-report.html (narrative + manifest)
    └── harden-findings.sarif (security facts)
```

### Technical Stack

#### Core Technologies
- **Language:** Node.js / TypeScript
- **AI Models:** Anthropic Claude (multi-model routing + prompt caching)
  - **Primary:** Claude Sonnet 4.5 (most agents)
  - **Performance:** Claude Haiku 4 (deterministic operations)
  - **Quality:** Claude Opus 4.5 (critical validation)
  - **Optimization:** Prompt caching (47% cost reduction, 2x latency improvement)
- **AI SDK:** @anthropic-ai/sdk
- **MCP Integration:** @modelcontextprotocol/sdk
- **CLI Framework:** Commander.js or similar
- **UI/TUI:** Ink (React for CLI) or Inquirer.js

#### Deployment Model
- **v1:** Pure local CLI (runs on developer's machine)
- **Distribution:** npm install -g prodready
- **Execution:** Local with remote API calls to Claude + MCP servers
- **Bundling:** MCP servers bundled with CLI package

#### Key Design Decisions

1. **Template-based generation (early iterations)**
   - Iterations 1-3: Use structured templates with strict constraints
   - Post-iteration 3: Transition to hybrid (templates + AI flexibility)
   - Always allow human override to avoid repetition

2. **Smart dependency-aware scoping**
   - Analyze changed files and import graph
   - Determine affected tests/routes
   - Skip unnecessary work in diff-aware cycles

3. **Mark-resolved-but-keep-visible audit trail**
   - Track finding status across cycles (new/persists/resolved/regressed)
   - Maintain complete history in artifacts
   - Cross-reference findings between cycles

4. **Static analysis of Next.js structure**
   - Parse app/pages directory
   - Analyze route files and component exports
   - Deterministic test discovery without runtime

5. **Rich progress streaming CLI**
   - Live progress indicators during long operations
   - Test execution status updates
   - Findings streamed as discovered

6. **Auto-migration on version upgrades**
   - Detect old .harden/ schema versions
   - Automatically migrate to current version
   - Preserve all historical data

7. **Hybrid agent architecture**
   - Orchestrator manages workflow (persistent Claude conversation)
   - Specialists execute focused tasks (dedicated Claude calls when needed)
   - MCP servers provide tool capabilities

8. **Container-based test isolation**
   - Docker containers for deterministic test environment
   - Clean state each cycle
   - Auto-generated Docker configurations

9. **Retry with different approach on failures**
   - AI attempts alternative fixes (max 2-3 retries)
   - Clear retry limits and timeouts
   - Fallback to user guidance after exhaustion

10. **Critical flow classification**
    - AI classifies user flows by criticality
    - Critical flows gate cycle completion
    - Non-critical flows tracked but optional

### Security Considerations

#### Secrets Handling
- **Automatic scrubbing:** Detect and redact secret patterns (regex + entropy detection)
- **Respect .gitignore:** Auto-exclude common sensitive files (.env*, *.key, secrets/)
- **User configuration:** Allow custom ignore patterns
- **AI provider trust:** Rely on Anthropic's data handling policies

#### API Key Management
- **Embedded API access:** PRODREADY provides API key for v1 (usage limits)
- **Usage tracking:** Built-in metering from day one
- **Rate limiting:** Respect API limits and handle gracefully

#### MCP Security
- **Prioritize official servers:** Use Anthropic, Microsoft, GitHub, Semgrep official servers
- **Vet third-party servers:** Security analysis before bundling
- **Sandboxing:** Docker isolation for MCP server execution
- **No credential hardcoding:** Environment variables only

---

## 🎭 Agent System {#agent-system}

### Agent Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                   ORCHESTRATOR AGENT                            │
│            (Workflow coordination & user interaction)           │
└───────────────┬─────────────────────────────────────────────────┘
                │
                ↓ Spawns specialists
    ┌───────────┴───────────┬─────────────┬─────────────┐
    ↓                       ↓             ↓             ↓
┌─────────┐          ┌─────────┐    ┌─────────┐   ┌─────────┐
│ PLANNER │          │PLAYWRIGHT│    │SECURITY │   │   GIT   │
│  AGENT  │          │  AGENT   │    │  AGENT  │   │  AGENT  │
└────┬────┘          └────┬─────┘    └────┬────┘   └────┬────┘
     │                    │               │             │
     │ Raw findings       │ Raw findings  │ Raw findings│
     └────────────────────┴───────────────┴─────────────┘
                          ↓
     ┌────────────────────────────────────────────────────┐
     │          EVALUATOR/APPROVAL AGENT                  │
     │  (Quality gate, grounding, explanation enrichment) │
     └────────────────┬───────────────────────────────────┘
                      │
                      ↓ Evaluated & grounded findings
     ┌────────────────────────────────────────────────────┐
     │            ORCHESTRATOR APPROVAL GATE              │
     │  • Review evaluator assessment                     │
     │  • Present to user for human approval              │
     │  • Only approved findings proceed to reporting     │
     └────────────────┬───────────────────────────────────┘
                      │
                      ↓ Approved findings only
                 ┌─────────┐
                 │REPORTING│
                 │  AGENT  │
                 └─────────┘
```

### Multi-Model Routing Strategy

**Philosophy:** Use the right model for the right task—optimize for both cost and quality based on task characteristics.

#### Model Selection Matrix

| Agent | Model | Rationale | Cost Impact |
|-------|-------|-----------|-------------|
| **Orchestrator** | Sonnet 4.5 | Complex workflow coordination; needs reasoning | Baseline |
| **Planner** | Sonnet 4.5 | Category classification; test planning | Baseline |
| **Security** | Sonnet 4.5 | Code understanding; remediation generation | Baseline |
| **Playwright** | Sonnet 4.5 | Test authoring; selector strategies | Baseline |
| **Evaluator** | **Opus 4.5** | **CRITICAL: Validation quality is paramount** | +5x cost, justified |
| **Git** | **Haiku 4** | Deterministic operations only | -85% cost |
| **Reporting** | Haiku 4 (format)<br>Sonnet 4.5 (narrative) | Hybrid: templates vs. prose | -50% cost |

#### Task-Level Routing Rules

**Use Haiku 4 for:**
- Git operations (branch creation, diff parsing, commit formatting)
- File I/O operations (read/write/append)
- SARIF formatting and schema validation
- Evidence manifest generation (structured JSON/YAML)
- Cycle record persistence
- Template-based text generation

**Use Sonnet 4.5 for:**
- Test planning and classification
- Playwright test generation
- Security finding remediation
- Code analysis and transformation
- Narrative report generation
- User prompt interpretation
- Workflow orchestration

**Use Opus 4.5 for:**
- **Evaluator validation** (ALWAYS—false positives are costly)
- Complex architectural decisions requiring deep reasoning
- Ambiguity resolution with high stakes
- Multi-step reasoning chains

#### Implementation: Dynamic Model Router

```typescript
// src/core/model-router.ts

export class ModelRouter {
  /**
   * Select optimal model based on agent and task complexity
   */
  selectModel(context: {
    agent: AgentType;
    task: TaskType;
    complexity?: {
      reasoning_depth: 'shallow' | 'medium' | 'deep';
      code_generation: boolean;
      validation_stakes: 'low' | 'medium' | 'high';
      deterministic: boolean;
    };
  }): ModelConfig {
    // RULE 1: Evaluator ALWAYS uses Opus (non-negotiable)
    if (context.agent === 'evaluator') {
      return { model: 'claude-opus-4-5-20251101', temperature: 0.3 };
    }

    // RULE 2: Git ALWAYS uses Haiku (deterministic only)
    if (context.agent === 'git') {
      return { model: 'claude-haiku-4-20250901', temperature: 0 };
    }

    // RULE 3: Task-level complexity routing
    if (context.complexity) {
      // Deterministic + no code = Haiku
      if (context.complexity.deterministic && !context.complexity.code_generation) {
        return { model: 'claude-haiku-4-20250901', temperature: 0 };
      }

      // High validation stakes = Opus
      if (context.complexity.validation_stakes === 'high') {
        return { model: 'claude-opus-4-5-20251101', temperature: 0.3 };
      }

      // Deep reasoning = Sonnet minimum
      if (context.complexity.reasoning_depth === 'deep') {
        return { model: 'claude-sonnet-4-5-20250929', temperature: 0.5 };
      }
    }

    // RULE 4: Default to Sonnet for all other agents
    return { model: 'claude-sonnet-4-5-20250929', temperature: 0.5 };
  }

  /**
   * Log model usage for cost tracking
   */
  logUsage(result: {
    agent: AgentType;
    task: TaskType;
    model: string;
    input_tokens: number;
    output_tokens: number;
    duration_ms: number;
  }): void {
    const cost = this.calculateCost(result.model, result.input_tokens, result.output_tokens);

    // Append to .harden/telemetry/model-usage.jsonl
    appendLine('.harden/telemetry/model-usage.jsonl', {
      timestamp: new Date().toISOString(),
      ...result,
      cost_usd: cost
    });
  }

  private calculateCost(model: string, inputTokens: number, outputTokens: number): number {
    const pricing = {
      'claude-haiku-4-20250901': { input: 0.40, output: 2.00 },
      'claude-sonnet-4-5-20250929': { input: 3.00, output: 15.00 },
      'claude-opus-4-5-20251101': { input: 15.00, output: 75.00 }
    };
    const rates = pricing[model] || pricing['claude-sonnet-4-5-20250929'];
    return (inputTokens * rates.input + outputTokens * rates.output) / 1_000_000;
  }
}
```

#### Cost Impact: Real-World Cycle Example

**Scenario:** Hardening a Next.js app with 3 security findings, 5 routes

| Agent | Task | Model | Est. Tokens (I/O) | Cost |
|-------|------|-------|-------------------|------|
| Orchestrator | Workflow coordination | Sonnet | 8K / 2K | $0.054 |
| Planner | Analyze diff, propose categories | Sonnet | 15K / 3K | $0.090 |
| Security | Run Semgrep | Haiku | 2K / 500 | $0.002 |
| Security | Classify 3 findings | Sonnet | 5K / 2K | $0.045 |
| Security | Generate 3 remediations | Sonnet | 12K / 6K | $0.126 |
| Playwright | Plan test coverage | Sonnet | 10K / 2K | $0.060 |
| Playwright | Generate 5 tests | Sonnet | 20K / 12K | $0.240 |
| Playwright | Run Playwright | Haiku | 3K / 1K | $0.003 |
| Evaluator | **Validate 3 findings** | **Opus** | 25K / 4K | **$0.675** |
| Git | Create branch, commits | Haiku | 2K / 500 | $0.002 |
| Reporting | Generate narrative | Sonnet | 15K / 5K | $0.120 |
| Reporting | Format SARIF | Haiku | 5K / 2K | $0.006 |
| **TOTAL** | | | **122K / 40K** | **$1.423** |

**Comparison to All-Sonnet:**
- All-Sonnet cost: ~$0.966
- Optimized cost: $1.423
- **+47% cost but:**
  - **Evaluator quality** prevents false positives (saves client time)
  - **Git/formatting optimized** (faster execution)
  - **Strategic spend** on validation where it matters most

#### User Configuration Override

Allow users to customize via `.harden/config.yaml`:

```yaml
# .harden/config.yaml

model_strategy:
  # Presets: "cost-optimized" | "quality-focused" | "balanced" (default)
  preset: "balanced"

  # Custom overrides (optional)
  overrides:
    evaluator: "opus-4.5"      # Force Opus for validation
    git: "haiku-4"             # Force Haiku for git ops

  # Budget guardrails
  max_cost_per_cycle: 3.00     # USD; halt if exceeded and prompt user

  # Fallback behavior
  fallback_on_unavailable: "sonnet-4.5"  # If preferred model unavailable

  # Retry strategy
  retry_with_upgrade: true     # If Haiku task fails, retry with Sonnet
```

**Preset Behaviors:**

- **`cost-optimized`**: Maximize Haiku usage; Sonnet for code gen only; Skip Opus (use Sonnet for evaluator)
- **`balanced`** (default): Strategy above—Opus for evaluator, Haiku for deterministic, Sonnet for reasoning
- **`quality-focused`**: Opus for evaluator + security remediations; Sonnet everywhere else

#### Best Practices from Production AI Systems

1. **Always use best model for validation/grounding**
   - False positives are more expensive than API costs
   - Evaluator quality directly impacts user trust

2. **Deterministic operations don't need reasoning**
   - Git commands, file formatting, schema validation → Haiku
   - 85% cost savings with zero quality loss

3. **Log everything for cost attribution**
   - Track model usage per agent/task
   - Identify optimization opportunities
   - Debug unexpected cost spikes

4. **Fail gracefully with upgrades**
   - If Haiku task fails validation, retry with Sonnet
   - If Sonnet times out, offer Haiku for partial result

5. **User control is key**
   - Budget-conscious users can opt for cost-optimized
   - Security-critical projects can opt for quality-focused
   - Default balanced strategy works for 80% of cases

#### Monitoring Dashboard

Each cycle records model usage in `.harden/cycles/<cycle_id>.yaml`:

```yaml
model_usage:
  total_cost_usd: 1.423
  total_tokens: { input: 122000, output: 40000 }
  breakdown:
    - agent: evaluator
      model: opus-4.5
      cost: 0.675
      justification: "Critical validation quality"
    - agent: git
      model: haiku-4
      cost: 0.002
      justification: "Deterministic operations"
    # ... etc
```

This data feeds into:
- Per-cycle cost reporting
- Cumulative project cost tracking
- Model performance analytics
- Optimization recommendations

---

### Prompt Caching Strategy

**Goal:** Reduce costs by 47% and improve latency by 2x using Anthropic's prompt caching feature.

#### How It Works

Anthropic's prompt caching allows marking content blocks as cacheable. Subsequent requests with the same cached content:
- **Cost:** 90% reduction ($0.30/MTok vs $3.00/MTok for cache reads)
- **Latency:** ~2x faster (fewer tokens to process)
- **TTL:** 5 minutes (perfect for iterative cycles)

#### What We Cache

**Tier 1 (MVP): System-Level Caching**
```typescript
// System prompts + MCP tool definitions (never change during session)
{
  system: [
    {
      type: "text",
      text: agentInstructions,          // 3-5K tokens
      cache_control: { type: "ephemeral" }
    },
    {
      type: "text",
      text: mcpToolDefinitions,         // 5-10K tokens
      cache_control: { type: "ephemeral" }
    }
  ]
}
```

**Savings:** 20-30% cost reduction with zero complexity

**Tier 2 (Post-MVP): Context Caching**
```typescript
// Codebase files (unchanged between cycles)
{
  content: [
    {
      type: "text",
      text: unchangedFileContext,       // 10-50K tokens
      cache_control: { type: "ephemeral" }
    },
    {
      type: "text",
      text: previousCycleSARIF,         // 5-15K tokens
      cache_control: { type: "ephemeral" }
    }
  ]
}
```

**Savings:** 40-50% cost reduction (cumulative)

**Tier 3 (Future): Reference Data Caching**
```typescript
// Security knowledge base, test templates (completely static)
{
  content: [
    {
      type: "text",
      text: securityKnowledgeBase,      // 10-20K tokens
      cache_control: { type: "ephemeral" }
    }
  ]
}
```

**Savings:** 50-60% cost reduction (cumulative)

#### Cache Invalidation Strategy

**Agent Instructions:**
- Include version string: `[PRODREADY v1.0.0]` → auto-invalidates on upgrade
- Cache lifetime: Entire session (5 min TTL refreshes on reuse)

**Codebase Files:**
- Check git SHA before marking cacheable
- Only cache if `current_sha === previous_cycle_sha`
- Cache lifetime: Until file modified

**Previous Artifacts:**
- Include cycle ID in content: `[Cycle 3 Findings]`
- Immutable per cycle (append-only architecture)
- Cache lifetime: Current cycle duration

#### Expected Impact: 10-Cycle Session

| Cycle | Without Caching | With Caching | Savings |
|-------|----------------|--------------|---------|
| 1 | $1.42 | $1.45 (+cache write) | -$0.03 |
| 2 | $1.42 | $0.62 (cache hits) | $0.80 |
| 3 | $1.42 | $0.65 | $0.77 |
| ... | ... | ... | ... |
| 10 | $1.42 | $0.68 | $0.74 |
| **Total** | **$14.20** | **$7.50** | **$6.70 (47%)** |

**Latency:** Cached cycles complete 30-50% faster

#### Configuration

```yaml
# .harden/config.yaml
caching_strategy:
  enabled: true
  cache_targets:
    system_prompts: true        # Agent instructions
    mcp_tools: true             # Tool definitions
    codebase_files: true        # Unchanged files (SHA-based)
    previous_artifacts: true    # SARIF from previous cycle
    security_knowledge: true    # CWE, OWASP databases
```

#### Monitoring

Each cycle tracks cache performance:

```yaml
# .harden/cycles/<cycle_id>.yaml
cache_metrics:
  total_input_tokens: 122000
  cached_tokens: 68000
  cache_hit_rate: 55.7%
  cost_savings_vs_no_cache: $0.204 (50%)
  latency_improvement: 1.92x
```

**Full specification:** See [PROMPT_CACHING_STRATEGY.md](./PROMPT_CACHING_STRATEGY.md)

---

### Agent Roles & Responsibilities

#### 1. Orchestrator Agent (Always Active)

**Role:** Master conductor of the hardening workflow

**Model:** Claude Sonnet 4.5 (requires complex workflow coordination and reasoning)

**Tools Available:**
- All MCP servers
- Custom tools: `request_approval`, `prompt_user`, `save_state`, `request_override`
- Ability to spawn specialist agents

**Responsibilities:**
- Manage overall cycle workflow
- Route decisions to appropriate specialists
- Coordinate specialist outputs
- Present findings/decisions to user
- Handle user interactions (approvals, overrides)
- Manage state persistence
- Assemble final artifacts
- Cycle completion criteria enforcement

**Implementation:**
- One long-running Claude conversation per session
- Maintains context across specialist invocations
- Stateful workflow management

---

#### 2. Planner Agent (Specialist)

**Role:** Analyze changes, classify findings, propose remediation categories

**Model:** Claude Sonnet 4.5 (requires reasoning for classification and test planning)

**Tools Available:**
- Context Engine MCP (dependency analysis)
- Next.js DevTools MCP (app structure)
- Git MCP (diff analysis)
- TypeScript Assistant MCP (code analysis)

**Responsibilities:**
- Analyze diff since last cycle or from base
- Identify affected components/routes
- Classify findings into categories
- Assess criticality (critical vs non-critical)
- Propose test targets based on changes
- Generate execution plan for category

**Output:** `.harden/plans/<plan_id>.yaml`
```yaml
plan_id: "plan-cycle-1"
cycle_id: 1
category: "security"
timestamp: "2026-01-14T10:00:00Z"
analysis:
  files_changed: 12
  routes_affected: ["api/auth", "api/users"]
  components_affected: ["SearchBar", "LoginForm"]
test_targets:
  - type: "security_scan"
    scope: "full_codebase"
    priority: "high"
  - type: "security_test"
    target: "api/auth"
    criticality: "critical"
    rationale: "Auth endpoints handle sensitive data"
  - type: "security_test"
    target: "SearchBar"
    criticality: "non-critical"
    rationale: "User input handling"
proposed_actions:
  - category: "SAST"
    tool: "semgrep"
    config: "default"
  - category: "dependency_scan"
    tool: "snyk"
estimated_runtime: "5-10 minutes"
generated_by: "planner_agent_v1"
```

---

#### 3. Security Agent (Specialist)

**Role:** Security scanning, SAST, dependency analysis, security test generation

**Model:** Claude Sonnet 4.5 (requires code understanding and remediation generation) | Haiku 4 for tool execution

**Tools Available:**
- Semgrep MCP (SAST)
- Snyk MCP (SCA)
- ESLint MCP (code quality/security)
- npm audit (via Test Runner MCP)

**Responsibilities:**
- Run security scans per plan
- Generate SARIF-compatible findings
- Create security regression tests
- Identify vulnerability patterns
- Assess severity and exploitability
- Suggest remediation strategies

**Output:** Raw findings + security tests
```yaml
findings:
  - finding_id: "SEC-001-RAW"
    source: "semgrep"
    rule_id: "javascript.react.security.audit.react-dangerously-set-innerhtml"
    severity: "high"
    location:
      file: "src/components/SearchBar.tsx"
      line: 42
    message: "Unsanitized user input"
    cwe: "CWE-79"
tests_generated:
  - test_file: "tests/security/xss-searchbar.spec.ts"
    test_type: "security_regression"
    status: "failing"
```

---

#### 4. Playwright Agent (Specialist)

**Role:** E2E test generation and execution

**Model:** Claude Sonnet 4.5 (requires test authoring and selector strategies) | Haiku 4 for test execution

**Tools Available:**
- Microsoft Playwright MCP
- Test Runner MCP
- Next.js DevTools MCP (route discovery)
- Docker MCP (test environment)

**Responsibilities:**
- Discover routes and user flows
- Generate Playwright E2E tests
- Configure test environment (Docker if needed)
- Execute tests and capture traces
- Collect evidence (screenshots, videos, traces)
- Assess test coverage

**Output:** Test files + execution results
```yaml
tests_generated:
  - test_id: "TEST-001-RAW"
    test_file: "tests/e2e/auth-flow.spec.ts"
    flow: "login"
    criticality: "critical"
    status: "passing"
    runtime: "3.2s"
  - test_id: "TEST-002-RAW"
    test_file: "tests/e2e/search.spec.ts"
    flow: "search"
    criticality: "non-critical"
    status: "failing"
    runtime: "timeout"
    error: "Element not found: [data-testid='search-results']"
evidence:
  - type: "trace"
    path: "test-results/auth-flow/trace.zip"
  - type: "screenshot"
    path: "test-results/search/failure.png"
```

---

#### 5. Evaluator/Approval Agent (Quality Gate)

**Role:** Validate specialist findings, add grounding, generate explanations

**Model:** Claude Opus 4.5 (CRITICAL: highest quality validation—false positives are extremely costly)

**Tools Available:**
- File system access (read_file, grep)
- AST analysis tools
- Context Engine MCP
- ESLint MCP
- Security knowledge bases (CWE, OWASP)

**Responsibilities:**
- **Validate findings:** Cross-check against actual code
- **Add grounding:** File:line references, code snippets, context
- **Generate explanations:** What, where, why, how-to-fix
- **Assess confidence:** High/medium/low reliability
- **Flag uncertainties:** Issues requiring human review
- **Detect false positives:** Verify findings are accurate
- **Cross-reference:** Check for contradictions between findings

**Output:** Evaluated findings with grounding
```yaml
evaluated_findings:
  - finding_id: "SEC-001"
    raw_finding_ref: "SEC-001-RAW"
    validation_status: "verified"
    confidence: "high"
    false_positive_likelihood: "low"
    grounding:
      file: "src/components/SearchBar.tsx"
      line: 42
      code_snippet: |
        const searchQuery = req.query.q;
        return <div>{searchQuery}</div>  // ← Unsafe
      context_before: |
        export function SearchBar({ onSearch }) {
          const router = useRouter();
      context_after: |
          return (
            <div className="search">
    explanation: |
      User input from query parameter 'q' is directly rendered
      without sanitization, allowing potential XSS attacks.

      An attacker could craft a URL like:
      /search?q=<script>alert('XSS')</script>

      The script would execute in the user's browser.
    recommendation: |
      Use DOMPurify or escape user input before rendering:

      import DOMPurify from 'dompurify';
      const sanitized = DOMPurify.sanitize(searchQuery);
      return <div>{sanitized}</div>

      Or use textContent instead of innerHTML.
    evidence:
      - semgrep_rule_id: "javascript.react.security.audit.react-dangerously-set-innerhtml"
      - confidence: "high"
      - cwe: "CWE-79"
      - owasp: "A7:2017-Cross-Site Scripting (XSS)"
    references:
      - "https://owasp.org/www-community/attacks/xss/"
      - "https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html"

flagged_findings:
  - finding_id: "SEC-002"
    reason: "Low confidence - pattern unclear"
    evaluator_notes: |
      Semgrep flagged potential SQL injection, but code uses
      parameterized queries. May be false positive.
      Requires human review to confirm.
    requires_human_review: true

discarded_findings:
  - finding_id: "SEC-003-RAW"
    reason: "False positive - input sanitized upstream"
    evaluator_notes: |
      Input is sanitized on line 38 with validator.escape().
      Semgrep pattern doesn't detect this.
```

---

#### 6. Git Agent (Specialist)

**Role:** Version control operations

**Model:** Claude Haiku 4 (deterministic operations only—85% cost savings)

**Tools Available:**
- Git MCP
- GitHub MCP

**Responsibilities:**
- Branch management
- Diff analysis
- Commit operations
- PR creation (when requested)
- Conflict detection/resolution
- Git history analysis

---

#### 7. Reporting Agent (Specialist)

**Role:** Generate narrative reports and evidence manifests

**Model:** Hybrid—Sonnet 4.5 for narrative generation | Haiku 4 for SARIF formatting and templating

**Tools Available:**
- File system access
- Template rendering engine
- SARIF parser/generator
- Evidence aggregation tools

**Responsibilities:**
- Generate HTML report sections
- Append to harden-report.html
- Generate SARIF sections
- Append to harden-findings.sarif
- Create evidence manifests
- Cross-reference findings with evidence
- Generate before/after comparisons

---

### Agent Collaboration Protocol

#### Shared Invariants
- Never create additional artifacts beyond harden-report.html and harden-findings.sarif
- Append-only per cycle; never overwrite history
- All durable state in .harden/ in the target repo
- Gates signal; do not block execution
- All findings must be grounded before reporting

#### Handoff Objects (Always in Repo)
- `Plan` → `.harden/plans/<plan_id>.yaml`
- `Approval` → `.harden/approvals/<approval_id>.yaml`
- `Cycle record` → `.harden/cycles/<cycle_id>.yaml`
- `Evidence manifest` → `.harden/evidence/<cycle_id>.json`
- `Overrides` → `.hardenignore` (user-managed)

#### Evaluation & Approval Flow

```
Specialist Agent → Raw Findings
      ↓
Evaluator Agent → Validated, Grounded Findings
      ↓
Orchestrator → Review & Route to User
      ↓
User Approval/Override → Approved Findings Only
      ↓
Reporting Agent → Artifacts
```

**Critical Rule:** No finding goes into reports without:
1. Evaluator validation
2. Grounding information (file:line:code)
3. Clear explanation
4. User or orchestrator approval

---

## 🔄 TDD Cycle Model {#tdd-cycle-model}

### Core Principle

Each PRODREADY cycle focuses on **ONE test category** following the Red-Green-Refactor pattern.

### Test Categories

```yaml
categories:
  - id: "security"
    name: "Security Hardening"
    order: 1  # Run first (most critical)
    mcp_servers:
      - "semgrep"
      - "snyk"
      - "eslint"
    test_types:
      - "SAST scan"
      - "Dependency vulnerabilities"
      - "Security regression tests"
    success_criteria:
      - "No critical/high vulnerabilities"
      - "All security tests pass"

  - id: "unit"
    name: "Unit Testing"
    order: 2
    mcp_servers:
      - "test-runner"
      - "jest"
    test_types:
      - "Component unit tests"
      - "Utility function tests"
      - "Business logic tests"
    success_criteria:
      - "≥80% code coverage"
      - "All unit tests pass"

  - id: "integration"
    name: "Integration Testing"
    order: 3
    mcp_servers:
      - "test-runner"
      - "playwright"
    test_types:
      - "API endpoint tests"
      - "Database integration tests"
      - "Service integration tests"
    success_criteria:
      - "All API contracts validated"
      - "All integrations tested"

  - id: "e2e"
    name: "End-to-End Testing"
    order: 4
    mcp_servers:
      - "playwright"
      - "test-runner"
    test_types:
      - "Critical user flows"
      - "Cross-browser tests"
      - "User journey validation"
    success_criteria:
      - "All critical flows pass"
      - "No UI regressions"

  - id: "performance"
    name: "Performance Testing"
    order: 5
    mcp_servers:
      - "lighthouse"
      - "playwright"
    test_types:
      - "Load time benchmarks"
      - "Core Web Vitals"
      - "Resource optimization"
    success_criteria:
      - "LCP < 2.5s"
      - "FID < 100ms"
      - "CLS < 0.1"

  - id: "accessibility"
    name: "Accessibility Testing"
    order: 6
    mcp_servers:
      - "axe-core"
      - "playwright"
    test_types:
      - "WCAG 2.1 AA compliance"
      - "Screen reader testing"
      - "Keyboard navigation"
    success_criteria:
      - "No critical a11y violations"
      - "WCAG AA compliant"
```

### Cycle Workflow: Red-Green-Refactor

#### 🔴 RED Phase: Identify & Test

**Objective:** Find issues, generate tests that reveal them

**Steps:**
1. **Analyze Current State**
   - Git Agent: Compute diff since last cycle
   - Planner Agent: Analyze category-specific needs

2. **Execute Specialist**
   - Category-specific agent runs scans/generates tests
   - Returns raw findings

3. **Evaluate Findings**
   - Evaluator Agent validates and grounds findings
   - Adds explanations and confidence levels

4. **Present to User**
   ```
   🔴 RED Phase: Security Issues Found

   Findings:
   • [CRITICAL] XSS vulnerability (SearchBar.tsx:42)
   • [HIGH] Weak cryptography (auth/token.ts:128)
   • [MEDIUM] Missing CSRF protection (3 forms)

   Generated Tests: 8 security tests
   Status: 6 failing ❌, 2 passing ✅

   Proceed to GREEN phase (fix issues)?
   [Yes] [No - Review First] [Skip Category]
   ```

#### 🟢 GREEN Phase: Fix Until Tests Pass

**Objective:** Apply fixes until all tests pass

**Steps:**
1. **User Selects Fixes to Apply**
   - Review each finding with grounding
   - Approve/reject/defer individual fixes

2. **Generate Remediation Code**
   - Remediation Agent proposes fixes
   - Evaluator Agent reviews fix safety

3. **Apply Fixes**
   - Apply approved code changes
   - Re-run tests

4. **Retry if Needed**
   - If tests still fail: try alternative approach
   - Max 2-3 retry attempts
   - Flag for manual intervention if exhausted

5. **Validate Success**
   ```
   🟢 GREEN Phase: Fixes Applied

   Results:
   • Fixed: XSS vulnerability ✅
   • Fixed: Weak cryptography ✅
   • Deferred: CSRF protection (user choice)

   Tests Status: 7/8 passing ✅
   1 test deferred (CSRF)

   Proceed to REFACTOR phase?
   [Yes] [No - Complete Cycle] [Review Changes]
   ```

#### 🔵 REFACTOR Phase: Improve & Optimize (Optional)

**Objective:** Improve code quality without changing behavior

**Steps:**
1. **Identify Opportunities**
   - Planner Agent suggests refactorings
   - Code smells, patterns, architecture improvements

2. **User Approves Refactorings**
   - Review each suggestion
   - Select which to apply

3. **Apply Refactorings**
   - Apply selected improvements
   - Re-run ALL tests (category + previous categories)
   - Ensure nothing broke

4. **Complete Cycle**
   ```
   🔵 REFACTOR Phase: Improvements Applied

   Refactorings:
   • Extracted validation to reusable function ✅
   • Added input sanitization helper ✅

   All Tests Status: 65/68 passing ✅
   (2 tests from previous categories still passing)

   Cycle Complete!
   ```

### Cycle Triggers & Scope

#### User-Initiated
```bash
# Interactive - user chooses category
prodready cycle

# Direct category specification
prodready cycle --category security
prodready cycle --category e2e

# Multiple categories in sequence
prodready cycle --category unit,integration

# Auto-suggest based on state
prodready cycle --auto  # Runs next uncompleted category

# Full suite (all categories)
prodready cycle --all
```

#### What Defines a Cycle
1. **Scope:** ONE test category (or user-selected multiple)
2. **Trigger:** User command
3. **Structure:** RED → GREEN → REFACTOR phases
4. **Output:** Category-specific tests + fixes + appended artifacts
5. **Duration:** Until success criteria met OR user stops
6. **Repeatability:** Can re-run categories after code changes (diff-aware)

### Cycle State Tracking

Each cycle updates `.harden/state.yaml`:

```yaml
# Category Progress
categories:
  security:
    status: "complete"
    cycles: [1, 5]  # Run in cycle 1, re-run in cycle 5
    last_run: "2026-01-14T10:00:00Z"
    tests_generated: 8
    tests_passing: 7
    findings_fixed: 2
    findings_deferred: 1

  unit:
    status: "in_progress"
    cycles: [2]
    current_phase: "green"

  e2e:
    status: "not_started"

  accessibility:
    status: "skipped"
    skip_reason: "Not in scope for MVP"
```

### Diff-Aware Re-runs

When re-running a category after code changes:

```bash
# Code changed, re-run security
prodready cycle --category security

# Orchestrator detects previous security cycle
# Planner analyzes: "Only auth/* files changed"
# Security Agent: "Re-scan only auth/* and related tests"
# Evaluator: "Compare findings with Cycle 1"
# Report: "Cycle 5 (Security re-run): 1 new issue, 2 previous issues resolved"
```

---

## 🎛️ User Override System {#user-override-system}

### Override Capabilities

Users have complete control to override, ignore, or suppress:
1. **Findings** (security issues, quality issues)
2. **Tests** (generated or existing)
3. **Remediations** (proposed fixes)
4. **Categories** (entire test categories)

### Override Actions

#### For Findings
- **Ignore this cycle:** Skip for now, will reappear next cycle
- **Suppress forever:** Add to `.hardenignore`, never show again
- **Mark false positive:** Evaluator was wrong, document why
- **Defer to later cycle:** Acknowledge but don't fix yet

#### For Tests
- **Skip this cycle:** Don't run this test now
- **Disable permanently:** Add to `.hardenignore`
- **Mark as flaky:** Apply retry logic (3 attempts)
- **Override parameters:** Change timeout, retries, etc.

#### For Remediations
- **Reject:** Don't apply this fix
- **Accept with modifications:** User modifies proposed code
- **Defer:** Fix later, just document for now

#### For Categories
- **Skip this cycle:** Don't run this category now
- **Disable for project:** Never run this category (add to .hardenignore)

### `.hardenignore` File

User-managed suppression rules (version controlled):

```yaml
# .hardenignore - PRODREADY Suppression Rules

version: "1.0"

# Ignore specific security findings
ignore_findings:
  - id: "SEC-042"
    reason: "Known false positive - input is sanitized upstream"
    ignored_by: "user@example.com"
    ignored_at: "2026-01-14"
    expires: null  # or "2026-03-01" for temporary

  - rule: "javascript.react.security.audit.react-dangerously-set-innerhtml"
    files: ["src/components/RichTextEditor.tsx"]
    reason: "Intentional use with DOMPurify sanitization"
    ignored_by: "security-team"
    ignored_at: "2026-01-10"

# Ignore specific tests
ignore_tests:
  - test: "tests/e2e/flaky-animation-test.spec.ts"
    reason: "Known flaky - animation timing unreliable in CI"
    ignored_by: "qa-team"
    retest_after: "2026-02-01"

  - pattern: "tests/e2e/third-party-*.spec.ts"
    reason: "External dependencies - test separately"

# Ignore patterns (glob-based)
ignore_patterns:
  - path: "src/legacy/**/*"
    reason: "Legacy code - rewrite planned Q2"
    categories: ["security", "tests"]

  - path: "**/*.generated.ts"
    reason: "Auto-generated code"
    categories: ["all"]

# Category-level disables
disabled_categories:
  - category: "accessibility"
    reason: "Not in scope for MVP"
    disabled_by: "product-owner"
    disabled_at: "2026-01-05"
```

### Interactive Override UI

During cycle execution, users see checkbox interfaces:

```
┌─────────────────────────────────────────────────────────────┐
│  Security Findings (3 found)                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [✓] SEC-001: XSS vulnerability in SearchBar.tsx:42        │
│      Confidence: High | Severity: Critical                  │
│      Actions: [Fix] [Ignore This Cycle] [Suppress Forever] │
│               [Mark False Positive] [View Details]          │
│                                                             │
│  [✓] SEC-002: Weak crypto in auth/token.ts:128             │
│      Confidence: High | Severity: High                      │
│      Actions: [Fix] [Ignore This Cycle] [Suppress Forever] │
│                                                             │
│  [ ] SEC-003: Missing CSRF token in forms                  │
│      Confidence: Medium | Severity: Medium                  │
│      ⚠️  Flagged by evaluator: May be false positive        │
│      Actions: [✓ Ignore This Cycle] [Mark False Positive]  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Override Tracking in State

All overrides documented in cycle records:

```yaml
# .harden/cycles/1.yaml

user_overrides:
  findings:
    - finding_id: "SEC-003"
      action: "ignored_this_cycle"
      reason: "Reviewing with security team next week"
      overridden_at: "2026-01-14T10:45:00Z"
      overridden_by: "user@example.com"

    - finding_id: "SEC-007"
      action: "marked_false_positive"
      reason: "Input is sanitized on line 38"
      added_to_hardenignore: true

  tests:
    - test_id: "TEST-003"
      action: "skipped_this_cycle"
      reason: "Payment gateway sandbox not available"
      retry_next_cycle: true

  remediations:
    - fix_id: "FIX-002"
      action: "deferred"
      reason: "Breaking change - needs migration plan"
      defer_until: "cycle_3"
```

### Override Reflection in Reports

Reports show excluded items with reasons:

#### HTML Report
```html
<div class="finding excluded">
  <h3>⊘ SEC-003: Missing CSRF token</h3>
  <p class="status">Status: Ignored (this cycle only)</p>
  <details>
    <summary>Why was this ignored?</summary>
    <p><strong>Reason:</strong> Reviewing with security team</p>
    <p><strong>By:</strong> user@example.com</p>
    <p><strong>When:</strong> 2026-01-14 10:45:00</p>
    <p><strong>Will retry:</strong> Next cycle</p>
  </details>
</div>
```

#### SARIF Report
```json
{
  "ruleId": "SEC-003",
  "level": "warning",
  "suppressions": [{
    "kind": "inSource",
    "status": "accepted",
    "justification": "Reviewing with security team",
    "properties": {
      "suppressedBy": "user@example.com",
      "retryNextCycle": true
    }
  }]
}
```

### Custom MCP Tool: `request_override`

Orchestrator uses this tool to request user override decisions:

```typescript
{
  name: "request_override",
  description: "Request user decision to override, ignore, or suppress",
  inputSchema: {
    type: "object",
    properties: {
      item_type: {
        type: "string",
        enum: ["finding", "test", "remediation"]
      },
      item_id: { type: "string" },
      item_details: { type: "object" },
      override_options: {
        type: "array",
        items: {
          type: "object",
          properties: {
            action: { type: "string" },
            label: { type: "string" },
            description: { type: "string" }
          }
        }
      },
      evaluator_notes: { type: "string" },
      recommended_action: { type: "string" }
    }
  }
}
```

---

## 🔌 MCP Integration {#mcp-integration}

### MCP Servers (Bundled with CLI)

#### Production-Ready (Official)
1. **Microsoft Playwright MCP**
   - E2E test generation and execution
   - Trace recording, video capture
   - 143 device emulations
   - Repository: github.com/microsoft/playwright-mcp

2. **Semgrep MCP** (Official)
   - SAST with SARIF output
   - Security/supply chain/secrets scanning
   - Repository: github.com/semgrep/mcp

3. **Snyk MCP** (Official)
   - Comprehensive SCA, SAST, IaC, container security
   - Integration with Snyk platform
   - Documentation: docs.snyk.io/integrations/snyk-studio-agentic-integrations

4. **ESLint MCP** (Official)
   - JavaScript/TypeScript code quality and security
   - Documentation: eslint.org/docs/latest/use/mcp

5. **Git MCP** (Official)
   - Basic Git operations
   - Repository: github.com/modelcontextprotocol/servers

6. **GitHub MCP** (Official)
   - Repository intelligence
   - Issue/PR automation
   - CI/CD visibility
   - Repository: github.com/github/github-mcp-server

#### Community (Vetted)
7. **Context Engine MCP**
   - TypeScript project analysis
   - Dependency tracking
   - Repository: github.com/raheesahmed/context-engine-mcp-server

8. **Next.js DevTools MCP** (Official Vercel)
   - Built into Next.js 16+
   - Error detection, route analysis
   - Component metadata, bundle analysis
   - Repository: github.com/vercel/next-devtools-mcp

9. **Test Runner MCP**
   - Unified interface: Bats, Pytest, Jest, Go, Rust
   - Repository: playbooks.com/mcp/privsim/mcp-test-runner

10. **@cyanheads/git-mcp-server**
    - Comprehensive Git operations
    - Commit signing, safety checks
    - Repository: github.com/cyanheads/git-mcp-server

### MCP Deployment Strategy

**Bundled Approach:** Package MCP servers as dependencies

```json
{
  "name": "prodready",
  "version": "1.0.0",
  "dependencies": {
    "@anthropic-ai/sdk": "^0.x.x",
    "@modelcontextprotocol/sdk": "^1.x.x",
    "@microsoft/playwright-mcp": "^x.x.x",
    "@semgrep/mcp": "^x.x.x",
    // ... other MCP servers
  }
}
```

**CLI spawns MCP servers as subprocesses:**
- User runs: `prodready cycle`
- CLI automatically starts required MCP servers
- Orchestrator agent connects via MCP protocol
- MCP servers shut down when cycle completes

### MCP Security Vetting

**Process for bundling third-party MCPs:**
1. Verify official sources (Anthropic, Microsoft, GitHub, etc.)
2. Run SCA tools on MCP package dependencies
3. Review MCP server code for security issues
4. Test in sandboxed environment
5. Monitor for updates/vulnerabilities
6. Use Docker isolation for execution

---

## 📁 State Management {#state-management}

### Repository Structure

```
/target-repo/
├── .harden/                          # Repo-resident state
│   ├── state.yaml                    # Current state pointer
│   ├── test-categories.yaml          # Category definitions
│   ├── cycles/                       # Cycle records (append-only)
│   │   ├── 1.yaml
│   │   ├── 2.yaml
│   │   └── 3.yaml
│   ├── plans/                        # Proposed plans
│   │   ├── plan-cycle-1.yaml
│   │   └── plan-cycle-2.yaml
│   ├── approvals/                    # User approvals
│   │   ├── approval-cycle-1.yaml
│   │   └── approval-cycle-2.yaml
│   └── evidence/                     # Evidence manifests
│       ├── cycle-1.json
│       └── cycle-2.json
├── .hardenignore                     # User suppressions
├── harden-report.html                # Append-only HTML report
└── harden-findings.sarif             # Append-only SARIF report
```

### `.harden/state.yaml`

Main state file tracking current progress:

```yaml
schema_version: "v1"
target_branch: "main"
hardening_branch: "harden/2026-01-14"
last_cycle_id: 3
created_at: "2026-01-14T09:00:00Z"
updated_at: "2026-01-14T14:30:00Z"

tooling:
  cli_version: "1.0.0"
  claude_model: "claude-sonnet-4-5-20250929"
  mcp_servers:
    playwright: "1.2.0"
    semgrep: "1.5.0"
    git: "1.0.0"

# TDD Category tracking
categories:
  security:
    status: "complete"
    cycles: [1]
    last_run: "2026-01-14T10:00:00Z"
    tests_generated: 8
    tests_passing: 7
    findings_fixed: 2
    findings_deferred: 1

  unit:
    status: "complete"
    cycles: [2]
    last_run: "2026-01-14T12:00:00Z"
    tests_generated: 45
    tests_passing: 45
    coverage: "82%"

  integration:
    status: "complete"
    cycles: [3]
    last_run: "2026-01-14T14:30:00Z"
    tests_generated: 12
    tests_passing: 11

  e2e:
    status: "not_started"
    cycles: []

  performance:
    status: "not_started"
    cycles: []

  accessibility:
    status: "skipped"
    skip_reason: "Not in scope for MVP"

# Overall progress
overall_progress:
  categories_complete: 3
  categories_total: 6
  categories_skipped: 1
  total_tests_generated: 65
  total_tests_passing: 63
  critical_issues_remaining: 0
  high_issues_remaining: 1
```

### `.harden/cycles/<cycle_id>.yaml`

Complete record of each cycle:

```yaml
cycle_id: 1
category: "security"
timestamp: "2026-01-14T10:00:00Z"
base_commit: "abc123def"
head_commit: "def456abc"
phase_completed: "refactor"
status: "complete"

# Git context
diff_summary:
  files_changed: 12
  insertions: 245
  deletions: 89

# Plan reference
plan_ref: ".harden/plans/plan-cycle-1.yaml"

# Raw specialist outputs
raw_findings:
  security_agent:
    - finding_id: "SEC-001-RAW"
      source: "semgrep"
      rule_id: "javascript.react.security.xss"
      # ... raw semgrep output

# Evaluator processing
evaluation:
  evaluator_agent_id: "eval-cycle-1"
  processed_at: "2026-01-14T10:15:00Z"

  evaluated_findings:
    - finding_id: "SEC-001"
      raw_finding_ref: "SEC-001-RAW"
      status: "approved"
      confidence: "high"
      grounding: { ... }
      explanation: "..."

  flagged_findings:
    - finding_id: "SEC-002"
      reason: "Low confidence"
      requires_human_review: true

  discarded_findings:
    - finding_id: "SEC-003-RAW"
      reason: "False positive"

# User overrides
user_overrides:
  findings:
    - finding_id: "SEC-003"
      action: "ignored_this_cycle"
      reason: "Reviewing with team"

  tests:
    - test_id: "TEST-003"
      action: "skipped_this_cycle"

# Approval reference
approval_ref: ".harden/approvals/approval-cycle-1.yaml"

# Actions taken
actions_taken:
  - action: "security_scan"
    tool: "semgrep"
    status: "complete"
    findings: 3

  - action: "generate_tests"
    tool: "playwright"
    status: "complete"
    tests_generated: 8

  - action: "remediation"
    fixes_applied: 2
    fixes_deferred: 1

# Results per phase
results:
  red_phase:
    findings: 3
    tests_generated: 8
    tests_failing: 6

  green_phase:
    fixes_applied: 2
    tests_passing: 7
    retry_attempts: 1

  refactor_phase:
    refactorings_applied: 2
    tests_still_passing: 7

# Evidence
evidence_manifest_ref: ".harden/evidence/cycle-1.json"

# Gate signals
gate_signals:
  critical_issues_found: true
  critical_issues_fixed: true
  high_issues_found: true
  high_issues_remaining: 1

# Next recommendation
next_recommended_category: "unit"
```

### `.harden/evidence/<cycle_id>.json`

Evidence manifest linking to artifacts:

```json
{
  "cycle_id": 1,
  "category": "security",
  "timestamp": "2026-01-14T10:30:00Z",
  "evidence": {
    "security_scans": [
      {
        "tool": "semgrep",
        "version": "1.5.0",
        "config": "default",
        "sarif_ref": "harden-findings.sarif#/runs/0/results/0-2",
        "execution_time": "12.3s"
      }
    ],
    "tests_generated": [
      {
        "test_file": "tests/security/xss-searchbar.spec.ts",
        "framework": "playwright",
        "status": "passing",
        "runtime": "2.1s",
        "trace": "test-results/xss-searchbar/trace.zip"
      }
    ],
    "remediations": [
      {
        "finding_id": "SEC-001",
        "file": "src/components/SearchBar.tsx",
        "lines_changed": "42-45",
        "diff_ref": "git-diff-cycle-1-sec-001.patch",
        "validation": {
          "build_passed": true,
          "tests_passed": true,
          "new_issues_introduced": false
        }
      }
    ],
    "screenshots": [
      "test-results/auth-flow/screenshot-1.png"
    ],
    "traces": [
      "test-results/auth-flow/trace.zip"
    ]
  }
}
```

### State Migration

**Auto-migration on CLI upgrade:**

```typescript
// Detect schema version
const currentSchema = state.schema_version;
const cliSchema = "v1";

if (currentSchema !== cliSchema) {
  console.log(`Migrating state from ${currentSchema} to ${cliSchema}...`);

  // Apply migrations
  const migrations = getMigrationsNeeded(currentSchema, cliSchema);
  for (const migration of migrations) {
    await migration.apply(state);
  }

  // Update schema version
  state.schema_version = cliSchema;
  await saveState(state);

  console.log("Migration complete ✅");
}
```

### Crash Recovery

**Resume incomplete cycles:**

```yaml
# .harden/state.yaml shows incomplete cycle
last_cycle_id: 3
current_cycle_state:
  cycle_id: 3
  category: "e2e"
  phase: "green"
  steps_completed:
    - "scan"
    - "generate_tests"
  steps_pending:
    - "apply_fixes"
    - "report"

# On next `prodready cycle`, orchestrator detects:
# "Cycle 3 incomplete at GREEN phase. Resume? [Yes] [No - Start Fresh]"
```

---

## 📊 Artifact Generation {#artifact-generation}

### Two Append-Only Artifacts

1. **`harden-report.html`** - Human narrative + embedded evidence
2. **`harden-findings.sarif`** - Machine-authoritative security facts

### Design Principles

- **Append-only:** Each cycle adds sections, never overwrites
- **No duplication:** HTML references SARIF for facts, doesn't duplicate
- **Cross-referenced:** Clear links between artifacts
- **Audit trail:** Complete history visible
- **Status tracking:** Findings marked as new/resolved/persists/regressed

### `harden-report.html` Structure

```html
<!DOCTYPE html>
<html>
<head>
  <title>PRODREADY Hardening Report</title>
  <style>/* ... embedded CSS ... */</style>
</head>
<body>
  <header>
    <h1>PRODREADY Hardening Report</h1>
    <div class="metadata">
      <p>Repository: example/vibe-coded-app</p>
      <p>Branch: harden/2026-01-14</p>
      <p>Generated: 2026-01-14 14:30:00 UTC</p>
      <p>CLI Version: 1.0.0</p>
    </div>
  </header>

  <nav>
    <ul>
      <li><a href="#summary">Summary</a></li>
      <li><a href="#cycle-1">Cycle 1: Security</a></li>
      <li><a href="#cycle-2">Cycle 2: Unit Tests</a></li>
      <li><a href="#cycle-3">Cycle 3: Integration</a></li>
      <li><a href="#evidence">Evidence Manifest</a></li>
    </ul>
  </nav>

  <section id="summary">
    <h2>Overall Summary</h2>
    <table>
      <tr><th>Metric</th><th>Value</th></tr>
      <tr><td>Cycles Complete</td><td>3</td></tr>
      <tr><td>Categories Complete</td><td>3/6</td></tr>
      <tr><td>Tests Generated</td><td>65</td></tr>
      <tr><td>Tests Passing</td><td>63 (96.9%)</td></tr>
      <tr><td>Critical Issues Found</td><td>2</td></tr>
      <tr><td>Critical Issues Fixed</td><td>2</td></tr>
      <tr><td>High Issues Remaining</td><td>1</td></tr>
    </table>
  </section>

  <section id="cycle-1">
    <h2>Cycle 1: Security Hardening</h2>
    <div class="cycle-metadata">
      <p>Timestamp: 2026-01-14 10:00:00 UTC</p>
      <p>Commit: abc123def → def456abc</p>
      <p>Status: ✅ Complete (RED → GREEN → REFACTOR)</p>
    </div>

    <h3>Phase 1: RED (Identify Issues)</h3>
    <p>Scanned codebase with Semgrep, found 3 security issues:</p>
    <ul>
      <li><strong>SEC-001 (CRITICAL):</strong> XSS vulnerability in SearchBar
        <a href="#sarif-SEC-001">[SARIF Details]</a>
      </li>
      <li><strong>SEC-002 (HIGH):</strong> Weak cryptography in auth/token.ts
        <a href="#sarif-SEC-002">[SARIF Details]</a>
      </li>
      <li><strong>SEC-003 (MEDIUM):</strong> Missing CSRF protection
        <span class="status deferred">Deferred by user</span>
      </li>
    </ul>

    <h3>Phase 2: GREEN (Apply Fixes)</h3>
    <div class="finding fixed">
      <h4>✅ SEC-001: XSS Vulnerability Fixed</h4>
      <p><strong>Location:</strong> <code>src/components/SearchBar.tsx:42</code></p>
      <p><strong>Issue:</strong> User input rendered without sanitization</p>
      <p><strong>Fix Applied:</strong></p>
      <pre><code>// Before:
return &lt;div&gt;{searchQuery}&lt;/div&gt;

// After:
import DOMPurify from 'dompurify';
const sanitized = DOMPurify.sanitize(searchQuery);
return &lt;div&gt;{sanitized}&lt;/div&gt;</code></pre>
      <p><strong>Validation:</strong> Build passed ✅, Tests passed ✅</p>
      <p><strong>Evidence:</strong>
        <a href="evidence/cycle-1-sec-001-diff.patch">Diff</a> |
        <a href="test-results/xss-searchbar/trace.zip">Test Trace</a>
      </p>
    </div>

    <h3>Phase 3: REFACTOR (Improvements)</h3>
    <p>Applied 2 refactorings:</p>
    <ul>
      <li>Extracted input validation to <code>utils/sanitize.ts</code></li>
      <li>Added reusable sanitization helper function</li>
    </ul>

    <h3>Cycle Summary</h3>
    <p>✅ Fixed 2/3 issues, generated 8 security tests (7 passing)</p>
    <p>Next: Unit Testing</p>
  </section>

  <section id="cycle-2">
    <h2>Cycle 2: Unit Testing</h2>
    <!-- ... similar structure ... -->
  </section>

  <section id="cycle-3">
    <h2>Cycle 3: Integration Testing</h2>
    <!-- ... similar structure ... -->
  </section>

  <section id="evidence">
    <h2>Evidence Manifest</h2>
    <p>All evidence files referenced in this report:</p>
    <ul>
      <li><strong>Cycle 1:</strong> <a href=".harden/evidence/cycle-1.json">cycle-1.json</a></li>
      <li><strong>Cycle 2:</strong> <a href=".harden/evidence/cycle-2.json">cycle-2.json</a></li>
      <li><strong>Cycle 3:</strong> <a href=".harden/evidence/cycle-3.json">cycle-3.json</a></li>
    </ul>
    <p>For machine-readable security findings, see: <a href="harden-findings.sarif">harden-findings.sarif</a></p>
  </section>

  <footer>
    <p>Generated by PRODREADY v1.0.0 | Powered by Claude Sonnet 4.5</p>
  </footer>
</body>
</html>
```

### `harden-findings.sarif` Structure

SARIF-inspired with custom extensions for multi-cycle tracking:

```json
{
  "$schema": "https://json.schemastore.org/sarif-2.1.0.json",
  "version": "2.1.0",
  "runs": [
    {
      "tool": {
        "driver": {
          "name": "PRODREADY",
          "version": "1.0.0",
          "informationUri": "https://prodready.dev",
          "rules": [
            {
              "id": "javascript.react.security.xss",
              "name": "react-xss",
              "shortDescription": {
                "text": "Potential XSS vulnerability"
              },
              "fullDescription": {
                "text": "User input rendered without sanitization"
              },
              "helpUri": "https://owasp.org/www-community/attacks/xss/",
              "properties": {
                "cwe": "CWE-79",
                "owasp": "A7:2017-Cross-Site Scripting"
              }
            }
          ]
        }
      },
      "results": [
        {
          "ruleId": "javascript.react.security.xss",
          "ruleIndex": 0,
          "level": "error",
          "message": {
            "text": "User input from query parameter rendered without sanitization"
          },
          "locations": [
            {
              "physicalLocation": {
                "artifactLocation": {
                  "uri": "src/components/SearchBar.tsx"
                },
                "region": {
                  "startLine": 42,
                  "startColumn": 10,
                  "endLine": 42,
                  "endColumn": 45,
                  "snippet": {
                    "text": "return <div>{searchQuery}</div>"
                  }
                }
              }
            }
          ],
          "properties": {
            "prodready": {
              "finding_id": "SEC-001",
              "cycle_discovered": 1,
              "cycle_fixed": 1,
              "status": "fixed",
              "confidence": "high",
              "evaluator_notes": "Verified by examining code. High confidence.",
              "fix_applied": {
                "cycle": 1,
                "commit": "def456abc",
                "diff_ref": ".harden/evidence/cycle-1-sec-001.patch"
              }
            }
          },
          "fixes": [
            {
              "description": {
                "text": "Sanitize user input with DOMPurify"
              },
              "artifactChanges": [
                {
                  "artifactLocation": {
                    "uri": "src/components/SearchBar.tsx"
                  },
                  "replacements": [
                    {
                      "deletedRegion": {
                        "startLine": 42,
                        "startColumn": 10,
                        "endLine": 42,
                        "endColumn": 45
                      },
                      "insertedContent": {
                        "text": "const sanitized = DOMPurify.sanitize(searchQuery);\nreturn <div>{sanitized}</div>"
                      }
                    }
                  ]
                }
              ]
            }
          ]
        },
        {
          "ruleId": "SEC-003",
          "level": "warning",
          "message": {
            "text": "Missing CSRF protection"
          },
          "suppressions": [
            {
              "kind": "inSource",
              "status": "accepted",
              "justification": "Deferred to next cycle by user",
              "properties": {
                "suppressedBy": "user@example.com",
                "suppressedAt": "2026-01-14T10:45:00Z",
                "retryNextCycle": true
              }
            }
          ],
          "properties": {
            "prodready": {
              "finding_id": "SEC-003",
              "cycle_discovered": 1,
              "status": "deferred",
              "user_override": {
                "action": "deferred",
                "reason": "Reviewing with security team",
                "defer_until": "cycle_4"
              }
            }
          }
        }
      ],
      "properties": {
        "prodready": {
          "cycle_id": 1,
          "cycle_category": "security",
          "timestamp": "2026-01-14T10:30:00Z",
          "base_commit": "abc123def",
          "head_commit": "def456abc"
        }
      }
    },
    {
      "tool": {
        "driver": {
          "name": "PRODREADY",
          "version": "1.0.0"
        }
      },
      "results": [
        /* Cycle 2 results ... */
      ],
      "properties": {
        "prodready": {
          "cycle_id": 2,
          "cycle_category": "unit",
          "timestamp": "2026-01-14T12:00:00Z"
        }
      }
    }
  ]
}
```

### Key SARIF Extensions

**Custom properties under `prodready` namespace:**
- `finding_id`: PRODREADY internal ID
- `cycle_discovered`: Which cycle found this issue
- `cycle_fixed`: Which cycle fixed this issue (if fixed)
- `status`: new | persists | fixed | regressed | deferred
- `confidence`: Evaluator confidence level
- `evaluator_notes`: Grounding and explanation
- `user_override`: Override information if applicable

### Artifact Generation Process

```
Cycle Complete
    ↓
Reporting Agent
    ↓
├─> Generate HTML Section
│   ├─> Narrative of cycle
│   ├─> Before/after comparisons
│   ├─> References to SARIF (no duplication)
│   └─> Links to evidence files
│
├─> Generate SARIF Run
│   ├─> Convert findings to SARIF format
│   ├─> Add custom prodready properties
│   ├─> Include fix information
│   └─> Track status (new/fixed/persists)
│
└─> Append to Both Artifacts
    ├─> HTML: Append <section id="cycle-N">
    └─> SARIF: Append new run to runs[]
```

---

## 🚀 Development Strategy {#development-strategy}

### Use Claude Code for Development

**Approach:** Leverage Claude Code features to accelerate PRODREADY development

#### Strategies:
1. **Use Claude Code as development environment**
   - Let Claude Code help write code, review designs, test
   - PRODREADY itself is standalone CLI

2. **Study Claude Code patterns**
   - Examine how Claude Code implements subagents
   - Learn MCP integration patterns
   - Model conversational UX after Claude Code

3. **Consider future Claude Code skill**
   - Potential: Make PRODREADY available as `/prodready` skill
   - Users could run within Claude Code sessions
   - Post-v1 consideration

### Testing Strategy

#### Unit Tests
- Test individual components (agents, parsers, generators)
- Mock MCP server responses
- Test state management logic

#### Integration Tests
- Test agent coordination
- Test MCP server integration
- Test artifact generation

#### E2E Tests
- Run full cycles on fixture repos
- Validate complete workflows
- Test crash recovery

#### Validation Dataset
- **Primary:** Vibe-coded repos from GitHub
- **Sources:** Lovable, Bolt, v0 generated apps
- **Selection Criteria:**
  - Publicly available
  - Representative of vibe-coding patterns
  - Various complexity levels (simple, medium, complex)
  - Different frameworks/patterns

### Implementation Phases

#### Phase 0: Scaffolding (1-2 days)
- [ ] CLI skeleton with commands (init, cycle, session, status)
- [ ] .harden/ state initialization
- [ ] Claude SDK integration proof
- [ ] Basic MCP SDK integration
- [ ] One MCP server working (Git MCP)

#### Phase 1: Security Pipeline (3-5 days)
- [ ] Integrate Semgrep MCP
- [ ] Orchestrator + Security Agent + Evaluator Agent
- [ ] Generate SARIF artifact (single cycle)
- [ ] Generate HTML report (single cycle)
- [ ] Conversational UX for findings presentation
- [ ] Basic approval workflow

#### Phase 2: Full MVP (5-7 days)
- [ ] Add Playwright MCP for test generation
- [ ] Implement RED-GREEN-REFACTOR workflow
- [ ] Add override system (.hardenignore)
- [ ] Implement simple auto-fix (dependency updates)
- [ ] Append-only artifacts (multiple cycles)
- [ ] Test on real Lovable/Bolt repo

#### Phase 3: Polish & Validation (3-5 days)
- [ ] Crash recovery
- [ ] State migration system
- [ ] Comprehensive error handling
- [ ] Rich progress streaming
- [ ] Documentation
- [ ] Test on 5+ vibe-coded repos

### Repository Structure

```
/prodready/
├── src/
│   ├── cli/                    # CLI entry point
│   │   ├── commands/
│   │   │   ├── init.ts
│   │   │   ├── cycle.ts
│   │   │   ├── session.ts
│   │   │   └── status.ts
│   │   └── ui/                 # TUI components
│   │       ├── approval.ts
│   │       ├── override.ts
│   │       └── progress.ts
│   ├── core/                   # Orchestration
│   │   ├── orchestrator.ts
│   │   ├── cycle-manager.ts
│   │   └── state-manager.ts
│   ├── agents/                 # Agent implementations
│   │   ├── orchestrator-agent.ts
│   │   ├── planner-agent.ts
│   │   ├── security-agent.ts
│   │   ├── playwright-agent.ts
│   │   ├── evaluator-agent.ts
│   │   ├── git-agent.ts
│   │   └── reporting-agent.ts
│   ├── mcp/                    # MCP integration
│   │   ├── mcp-client.ts
│   │   ├── servers/
│   │   │   ├── semgrep.ts
│   │   │   ├── playwright.ts
│   │   │   └── git.ts
│   │   └── tools/              # Custom MCP tools
│   │       ├── request-approval.ts
│   │       ├── request-override.ts
│   │       └── save-state.ts
│   ├── reporting/              # Artifact generation
│   │   ├── html-generator.ts
│   │   ├── sarif-generator.ts
│   │   └── templates/
│   │       └── report.html
│   ├── state/                  # State management
│   │   ├── schema.ts
│   │   ├── migrations.ts
│   │   └── persistence.ts
│   ├── utils/                  # Utilities
│   │   ├── git.ts
│   │   ├── file-system.ts
│   │   └── security.ts
│   └── index.ts
├── tests/                      # Tests
│   ├── unit/
│   ├── integration/
│   ├── e2e/
│   └── fixtures/               # Fixture repos
├── docs/                       # Documentation
├── package.json
├── tsconfig.json
└── README.md
```

---

## 🎯 MVP Specification {#mvp-specification}

### MVP Goal

**Run ONE complete TDD cycle (Security category) on a real vibe-coded repo from GitHub, demonstrating the full RED-GREEN-REFACTOR workflow with all approval gates and artifact generation.**

### MVP Scope

#### In Scope
✅ Single category: Security hardening
✅ Semgrep MCP integration (SAST)
✅ Simple test generation (smoke tests)
✅ Simple auto-fix (dependency updates via npm audit fix)
✅ Evaluator agent with grounding
✅ User approval gates
✅ User override system (basic)
✅ Both artifacts generated (HTML + SARIF)
✅ Conversational CLI UX
✅ One complete RED-GREEN-REFACTOR cycle
✅ Test on 1 Lovable/Bolt repo

#### Out of Scope (Post-MVP)
❌ Multiple categories in MVP
❌ Sophisticated test generation (just smoke tests)
❌ Complex auto-remediation (just deps)
❌ Docker-based test isolation
❌ Diff-aware iteration (first run only)
❌ State migration (v1 schema only)
❌ Retry logic on failures
❌ Performance optimization

### MVP Success Criteria

1. **Functional:**
   - [ ] CLI runs `prodready init` successfully
   - [ ] CLI runs `prodready cycle --category security`
   - [ ] Semgrep finds at least 1 security issue
   - [ ] Evaluator adds grounding + explanation
   - [ ] User sees approval UI with checkboxes
   - [ ] User can override/ignore findings
   - [ ] Simple fix applied (dependency update)
   - [ ] Tests generated and executed
   - [ ] Both artifacts created with Cycle 1 data
   - [ ] Artifacts are append-only (test with 2 cycles)

2. **Quality:**
   - [ ] No findings in report without grounding
   - [ ] All user overrides documented
   - [ ] Audit trail complete in .harden/
   - [ ] SARIF format is valid
   - [ ] HTML report is readable

3. **Validation:**
   - [ ] Works on real Lovable/Bolt repo
   - [ ] Deterministic results (run twice, same findings)
   - [ ] Recovers from Ctrl+C gracefully

### MVP Test Repo Selection

**Criteria for choosing test repo:**
- Public GitHub repo
- Generated by Lovable/Bolt/v0
- Next.js or React
- Has some security issues (XSS, weak deps, etc.)
- Small to medium size (not overwhelming)
- Representative of vibe-coding patterns

### MVP Deliverables

1. **Working CLI**
   - Installable via npm
   - Commands: init, cycle, status
   - Conversational UX

2. **Documentation**
   - README with setup instructions
   - Usage guide
   - Architecture overview (this document)

3. **Artifacts**
   - Example harden-report.html from test repo
   - Example harden-findings.sarif from test repo
   - Example .harden/ state files

4. **Demo**
   - Video or live demo of full cycle
   - Before/after comparison
   - Artifact walkthrough

---

## 📚 Additional Resources

### MCP Server Research
See: [MCP_SERVERS_RESEARCH.md](./MCP_SERVERS_RESEARCH.md) for comprehensive list of available MCP servers, maturity assessments, and integration recommendations.

### Original Specification
See: [AGENTS.md](c:\Users\georg\Downloads\AGENTS.md) for original project specification and requirements.

---

**Document Status:** ✅ Complete - Ready for Implementation Planning

**Next Steps:**
1. Review and validate architecture decisions
2. Identify any missing requirements or edge cases
3. Begin Phase 0 implementation (scaffolding)
4. Set up development environment with Claude Code

---

*Generated: 2026-01-14*
*Version: 1.0*
*Status: Architecture Complete*
