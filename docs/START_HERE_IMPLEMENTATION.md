# 🚀 PRODREADY Implementation — Start Here

> **Purpose:** Bootstrap document for new Claude Code session
> **Status:** Ready for Phase 0 scaffolding
> **Date:** 2026-01-15

---

## Quick Start (Copy-Paste This)

```
I'm starting implementation of PRODREADY, an AI-powered SDLC hardening CLI tool.

Please read these files in order to understand the architecture:
1. PRODREADY_ARCHITECTURE.md
2. MULTI_MODEL_ROUTING_STRATEGY.md
3. PROMPT_CACHING_STRATEGY.md

Then let's start Phase 0: Scaffolding (create project structure, initialize TypeScript, implement core classes).
```

---

## What is PRODREADY?

**One-liner:** AI-powered CLI that transforms vibe-coded Next.js/React prototypes into production-ready apps through iterative, diff-aware hardening cycles.

**Core workflow:**
1. User runs `prodready init` in their Next.js repo
2. User runs `prodready cycle` → system analyzes diff, proposes hardening categories
3. User approves categories → system generates tests, fixes security issues, validates findings
4. System produces 2 artifacts: `harden-report.html` + `harden-findings.sarif`
5. Repeat cycles until production-ready

**Key constraints:**
- CLI-only (no hosted UI)
- Local execution (data plane on client, control plane via Anthropic API)
- 2 artifacts only (append-only across cycles)
- Repo-resident state (`.harden/` directory)
- Human approval required for all changes

---

## Architecture Quick Reference

### 7-Agent System

```
Orchestrator (Sonnet 4.5)
    ├─→ Planner (Sonnet 4.5) — analyze diff, propose categories
    ├─→ Security (Sonnet/Haiku) — SAST, SCA, remediation
    ├─→ Playwright (Sonnet/Haiku) — E2E test generation
    ├─→ Evaluator (Opus 4.5) — validate findings, add grounding ★ CRITICAL
    ├─→ Git (Haiku 4) — branch management, diff analysis
    └─→ Reporting (Sonnet/Haiku) — HTML narrative + SARIF
```

### Multi-Model Routing

| Agent | Model | Why |
|-------|-------|-----|
| Evaluator | **Opus 4.5** | Validation quality is paramount |
| Git | **Haiku 4** | Deterministic operations (85% cost savings) |
| All others | **Sonnet 4.5** | Reasoning & code generation |

### Prompt Caching (47% cost reduction)

**MVP:** Cache system prompts + MCP tool definitions
**Post-MVP:** Cache unchanged files + previous cycle artifacts

---

## Project Structure

```
prodready/
├── src/
│   ├── cli/              # Commander.js CLI commands
│   │   ├── init.ts       # prodready init
│   │   ├── cycle.ts      # prodready cycle
│   │   └── session.ts    # prodready session (multi-cycle)
│   ├── core/
│   │   ├── orchestrator.ts       # Main workflow coordinator
│   │   ├── model-router.ts       # Multi-model selection logic
│   │   ├── cache-manager.ts      # Prompt caching implementation
│   │   └── cycle-manager.ts      # Cycle state management
│   ├── agents/
│   │   ├── base-agent.ts         # Abstract base class
│   │   ├── planner-agent.ts
│   │   ├── security-agent.ts
│   │   ├── playwright-agent.ts
│   │   ├── evaluator-agent.ts
│   │   ├── git-agent.ts
│   │   └── reporting-agent.ts
│   ├── plugins/
│   │   ├── semgrep.ts            # Semgrep integration
│   │   ├── playwright.ts         # Playwright integration
│   │   └── npm-audit.ts          # npm audit integration
│   ├── reporting/
│   │   ├── html-reporter.ts      # harden-report.html generator
│   │   └── sarif-reporter.ts     # harden-findings.sarif generator
│   └── vcs/
│       └── git.ts                # Git operations wrapper
├── tests/                        # Self-tests for hardener
├── package.json
└── tsconfig.json

# Target repo (where user runs prodready)
target-repo/
├── .harden/                      # Created by prodready init
│   ├── state.yaml                # Minimal state pointer
│   ├── config.yaml               # User configuration
│   ├── cycles/                   # Per-cycle decision records
│   ├── plans/                    # Proposed plans
│   ├── approvals/                # User approvals
│   ├── evidence/                 # Evidence manifests
│   └── telemetry/                # Model usage, costs
├── harden-report.html            # Append-only HTML report
└── harden-findings.sarif         # Append-only SARIF
```

---

## Tech Stack

```json
{
  "language": "TypeScript",
  "runtime": "Node.js 20+",
  "dependencies": {
    "@anthropic-ai/sdk": "latest",
    "@modelcontextprotocol/sdk": "latest",
    "commander": "^11.0.0",
    "yaml": "^2.3.0",
    "semver": "^7.5.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "@types/node": "^20.0.0",
    "vitest": "^1.0.0"
  }
}
```

---

## Phase 0: Scaffolding (First Session Goals)

### Milestone 1: Project Initialization
- [ ] Create Node.js/TypeScript project
- [ ] Initialize package.json with dependencies
- [ ] Set up tsconfig.json with strict mode
- [ ] Create directory structure per architecture

### Milestone 2: Core Classes (Foundational)
- [ ] Implement `ModelRouter` class
  - Model selection logic (Opus/Sonnet/Haiku routing)
  - Cost calculation
  - Usage logging
- [ ] Implement `CacheManager` class
  - Cache control markers
  - Version-based invalidation
  - Cache metrics tracking
- [ ] Implement `BaseAgent` abstract class
  - Anthropic API integration
  - Model router integration
  - Cache manager integration

### Milestone 3: CLI Skeleton
- [ ] Implement `prodready init` command
  - Validate git repo
  - Create `.harden/` directory structure
  - Initialize `state.yaml` and `config.yaml`
  - Create initial hardening branch
- [ ] Implement `prodready cycle` command (stub)
  - Parse command-line args
  - Load state from `.harden/state.yaml`
  - Invoke Orchestrator (TODO: implement)
- [ ] Implement `prodready session` command (stub)
  - Multi-cycle loop
  - Exit conditions

### Milestone 4: Git Operations
- [ ] Implement `GitAgent` class
  - Branch creation/switching
  - Diff analysis
  - Commit operations
  - SHA retrieval (for cache invalidation)

### Success Criteria for Phase 0
- [ ] `npm install -g prodready` works locally
- [ ] `prodready init` creates `.harden/` structure
- [ ] `prodready --version` shows version
- [ ] ModelRouter unit tests pass (95%+ coverage)
- [ ] CacheManager unit tests pass (95%+ coverage)
- [ ] GitAgent integration tests pass

---

## Key Implementation Guidelines

### 1. Multi-Model Routing (CRITICAL)

```typescript
// src/core/model-router.ts

export type AgentType =
  | 'orchestrator'
  | 'planner'
  | 'security'
  | 'playwright'
  | 'evaluator'  // ALWAYS Opus
  | 'git'        // ALWAYS Haiku
  | 'reporting';

export class ModelRouter {
  selectModel(agent: AgentType): ModelConfig {
    // See MULTI_MODEL_ROUTING_STRATEGY.md for full logic
    if (agent === 'evaluator') return OPUS_CONFIG;
    if (agent === 'git') return HAIKU_CONFIG;
    return SONNET_CONFIG;
  }
}
```

### 2. Prompt Caching (MVP = System Prompts Only)

```typescript
// src/agents/base-agent.ts

async invoke(userMessage: string) {
  return await this.anthropic.messages.create({
    model: this.modelRouter.selectModel(this.agentType),
    system: [
      {
        type: "text",
        text: `[PRODREADY ${VERSION}]\n${this.systemPrompt}`,
        cache_control: { type: "ephemeral" }  // ← Cache this
      },
      {
        type: "text",
        text: this.getMCPToolDefinitions(),
        cache_control: { type: "ephemeral" }  // ← Cache this too
      }
    ],
    messages: [{ role: "user", content: userMessage }]
  });
}
```

### 3. State Management (Repo-Resident)

```typescript
// .harden/state.yaml

schema_version: "v1"
target_branch: "main"
hardening_branch: "harden/2026-01-15-001"
last_cycle_id: 3
created_at: "2026-01-15T10:00:00Z"
updated_at: "2026-01-15T10:45:00Z"
tooling:
  prodready_version: "1.0.0"
  semgrep_version: "1.45.0"
  playwright_version: "1.40.0"
```

### 4. Two Artifacts Only (STRICT)

```typescript
// ALLOWED OUTPUT FILES (in target repo):
const ALLOWED_OUTPUTS = [
  'harden-report.html',      // Human-readable narrative
  'harden-findings.sarif'    // Machine-readable facts
];

// .harden/** is internal state, not "output"
```

### 5. Append-Only Cycles

```typescript
// Each cycle APPENDS to both artifacts

// harden-report.html
<section id="cycle-1">...</section>
<section id="cycle-2">...</section>  // ← Appended
<section id="cycle-3">...</section>  // ← Appended

// harden-findings.sarif (sectioned by cycle metadata)
{
  "runs": [
    { "tool": { "name": "prodready" }, "results": [...] }  // Cycle 1
  ]
}
// Cycle 2 appends new run or extends results array
```

---

## Configuration Schema

```yaml
# .harden/config.yaml (created by prodready init)

# Multi-model routing
model_strategy:
  preset: "balanced"  # "cost-optimized" | "balanced" | "quality-focused"
  overrides:
    evaluator: "opus-4.5"
    git: "haiku-4"
  max_cost_per_cycle: 3.00  # USD

# Prompt caching
caching_strategy:
  enabled: true
  cache_targets:
    system_prompts: true     # MVP
    mcp_tools: true          # MVP
    codebase_files: false    # Post-MVP
    previous_artifacts: false # Post-MVP

# Hardening scope
scope:
  categories:
    security: true
    e2e_tests: true
    smoke_tests: true
    a11y: false              # Post-MVP
    performance: false       # Post-MVP

# Tool configuration
tools:
  semgrep:
    enabled: true
    config: "auto"           # "auto" | path to custom config
  playwright:
    enabled: true
    browsers: ["chromium"]
  snyk:
    enabled: false           # Optional

# Workflow
workflow:
  auto_approve_low_risk: false  # Require manual approval for all
  max_cycles_per_session: 10
```

---

## Example First Cycle Flow

```bash
# User's repo (Next.js app)
cd my-nextjs-app

# Initialize hardening
prodready init
# ✓ Created .harden/ directory
# ✓ Initialized state.yaml
# ✓ Created hardening branch: harden/2026-01-15-001
# ✓ Ready to harden!

# Run first cycle
prodready cycle
# 🔍 Analyzing codebase...
# 📊 Found 12 files, 3 routes, 2400 LOC
#
# 🎯 Proposed hardening categories:
#   [✓] Security (5 potential issues found)
#   [✓] E2E Tests (3 routes need tests)
#   [✓] Smoke Tests (app boots, health check)
#
# ❓ Approve categories? (Space to toggle, Enter to confirm)
#   [x] Security
#   [x] E2E Tests
#   [x] Smoke Tests
#
# ✅ Approved! Starting cycle 1...
#
# 🔒 Security Agent: Running Semgrep...
#   → Found 5 findings
# 🧪 Playwright Agent: Generating E2E tests...
#   → Generated 3 tests for routes
# ✅ Evaluator Agent: Validating findings...
#   → 5 findings validated, 0 false positives
# 📝 Reporting Agent: Generating artifacts...
#   → harden-report.html (Cycle 1)
#   → harden-findings.sarif (Cycle 1)
#
# ✅ Cycle 1 complete!
#
# 📊 Summary:
#   - Cost: $1.45 (cache warming)
#   - Duration: 3m 42s
#   - Findings: 5 security issues
#   - Tests: 3 E2E tests generated
#
# 💡 Next steps:
#   1. Review harden-report.html
#   2. Fix issues or override false positives
#   3. Run: prodready cycle (iterate)
```

---

## Critical Architecture Decisions to Remember

### 1. Evaluator is Non-Negotiable
**Every finding must pass through Evaluator (Opus 4.5) before reporting.**
- Prevents false positives
- Adds grounding (file:line, code snippets, explanations)
- Assesses confidence level
- Worth the cost (5x Sonnet) — false positives waste more time

### 2. Diff-Aware Processing
**Only analyze changed files + their dependencies.**
- Planner computes diff since last cycle
- Security/Playwright focus on affected files
- Unchanged files can use cached analysis (Post-MVP)

### 3. User Approval Required
**Never modify code without explicit approval.**
- Show findings first
- Get category-level approval
- Respect `.hardenignore` for overrides

### 4. Repo-Resident State Only
**No server-side state storage.**
- All state in `.harden/` (committed to branch)
- Artifacts in repo root
- Enables resumption, auditing, collaboration

### 5. MCP Integration (Future-Proof)
**Use MCP protocol for all tooling.**
- Semgrep MCP, Playwright MCP, Git MCP, etc.
- Pluggable architecture
- Community can add custom MCPs

---

## Common Pitfalls to Avoid

### ❌ DON'T: Create extra output files
```typescript
// WRONG
fs.writeFileSync('cycle-1-plan.json', ...);  // ❌ Extra file!
```

```typescript
// CORRECT
// Store in .harden/plans/plan-cycle-1.yaml (internal state)
// Only harden-report.html and harden-findings.sarif in root
```

### ❌ DON'T: Use single model for everything
```typescript
// WRONG
const model = 'claude-sonnet-4-5-20250929';  // Hardcoded!
```

```typescript
// CORRECT
const model = this.modelRouter.selectModel(this.agentType);
```

### ❌ DON'T: Skip Evaluator validation
```typescript
// WRONG
const findings = await securityAgent.scan();
await reporter.writeSARIF(findings);  // ❌ No validation!
```

```typescript
// CORRECT
const rawFindings = await securityAgent.scan();
const validatedFindings = await evaluatorAgent.validate(rawFindings);
await reporter.writeSARIF(validatedFindings);
```

### ❌ DON'T: Forget to log costs
```typescript
// WRONG
const response = await anthropic.messages.create({...});
// ❌ No cost tracking!
```

```typescript
// CORRECT
const response = await anthropic.messages.create({...});
this.modelRouter.logUsage({
  agent: this.agentType,
  model: response.model,
  input_tokens: response.usage.input_tokens,
  output_tokens: response.usage.output_tokens,
  cost_usd: this.modelRouter.calculateCost(...)
});
```

---

## Testing Strategy

### Unit Tests (Vitest)
- ModelRouter logic (all routing rules)
- CacheManager cache key generation
- Cost calculation accuracy
- YAML parsing/serialization

### Integration Tests
- CLI commands (init, cycle, session)
- Agent invocations with mocked Anthropic API
- Git operations (branch creation, diff parsing)
- SARIF generation

### E2E Tests (Dogfooding)
- Run PRODREADY on itself
- Run PRODREADY on public Next.js repos
- Validate output artifacts

---

## Success Metrics (MVP)

- [ ] **Functional:** `prodready cycle` completes without errors on a Next.js app
- [ ] **Artifacts:** Both `harden-report.html` and `harden-findings.sarif` generated
- [ ] **Cost:** Per-cycle cost <$2.00 for typical app (with caching)
- [ ] **Quality:** Evaluator validation reduces false positives by >40% vs raw Semgrep
- [ ] **Speed:** Cycle completes in <5 minutes for typical app
- [ ] **Determinism:** Running same cycle twice produces identical artifacts

---

## Related Documentation

- [PRODREADY_ARCHITECTURE.md](./PRODREADY_ARCHITECTURE.md) — Full technical architecture
- [MULTI_MODEL_ROUTING_STRATEGY.md](./MULTI_MODEL_ROUTING_STRATEGY.md) — Model selection logic
- [PROMPT_CACHING_STRATEGY.md](./PROMPT_CACHING_STRATEGY.md) — Caching implementation
- [POST_MVP_REMINDERS.md](./POST_MVP_REMINDERS.md) — Trust implementation post-MVP
- [PRODREADY_DEPLOYMENT_STRATEGY.md](./PRODREADY_DEPLOYMENT_STRATEGY.md) — Business strategy
- [.claude/decisions/](../.claude/decisions/) — Architectural decision records

---

## Quick Command Reference

```bash
# Development
npm run build        # Compile TypeScript
npm run test         # Run tests
npm run lint         # ESLint + Prettier

# Local installation
npm link             # Install globally from source

# Usage
prodready init       # Initialize .harden/ in target repo
prodready cycle      # Run one hardening cycle
prodready session    # Run multiple cycles interactively
prodready --version  # Show version
prodready --help     # Show help

# Development workflow
npm run dev          # Watch mode (recompile on change)
npm run test:watch   # Test watch mode
```

---

## Questions? Check These First

**Q: Why Opus for Evaluator?**
A: False positives waste more developer time than API costs. Opus validation prevents bad findings from reaching users.

**Q: Why only 2 output files?**
A: Simplicity and adherence to original spec. HTML for humans, SARIF for machines. Everything else is internal state.

**Q: Why append-only cycles?**
A: Audit trail. Users can see progression over time. Rollback if needed.

**Q: Why repo-resident state?**
A: Trust. No server-side data storage. User owns all state. Collaboration-friendly (commit `.harden/` to branch).

**Q: Why CLI-only for MVP?**
A: Fastest to MVP. Platform partnerships don't need UI (Lovable/Bolt integrate CLI). Web UI is post-MVP.

---

## Ready to Start?

Run this in your new Claude Code session:

```
I'm implementing PRODREADY MVP. I've read START_HERE_IMPLEMENTATION.md.

Let's start Phase 0 scaffolding:
1. Initialize Node.js/TypeScript project
2. Create directory structure
3. Implement ModelRouter class
4. Implement CacheManager class
5. Implement BaseAgent abstract class
6. Create CLI skeleton with Commander.js

Show me the first file to create.
```

---

**Good luck! You've got a rock-solid architecture. Time to build.** 🚀
