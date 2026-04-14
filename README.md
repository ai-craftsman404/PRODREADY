# PRODREADY

[![PRODREADY CI](https://github.com/ai-craftsman404/PRODREADY/actions/workflows/prodready-ci.yml/badge.svg)](https://github.com/ai-craftsman404/PRODREADY/actions/workflows/prodready-ci.yml)

> AI-powered SDLC hardening CLI tool that transforms vibe-coded Next.js/React prototypes into production-ready applications.

## Status: Phase 0 - Scaffolding Complete ✅

This is the foundational implementation of PRODREADY. The core architecture is in place and ready for Phase 1 (Security Pipeline) development.

---

## What is PRODREADY?

PRODREADY is a CLI tool that uses AI agents to iteratively harden prototype applications through:
- **Security scanning** (SAST, SCA, vulnerability detection)
- **Test generation** (E2E, unit, integration tests with Playwright)
- **Quality validation** (Evaluator agent with Claude Opus 4.5)
- **Automated fixes** (Security remediation, dependency updates)

### Key Features

- **7-Agent System**: Orchestrator, Planner, Security, Playwright, Evaluator, Git, Reporting
- **Multi-Model Routing**: Intelligent model selection (Haiku/Sonnet/Opus) based on task complexity
- **Prompt Caching**: 47% cost reduction through strategic caching
- **Two Artifacts**: Append-only `harden-report.html` + `harden-findings.sarif`
- **Repo-Resident State**: All state in `.harden/` directory (version controlled)

---

## Phase 0 Implementation

### ✅ Completed Components

#### 1. **ModelRouter** ([src/core/model-router.ts](src/core/model-router.ts))
- Multi-model selection logic (Haiku 4, Sonnet 4.5, Opus 4.5)
- Cost calculation and tracking
- Usage logging for analytics
- Strategy presets: `cost-optimized`, `balanced`, `quality-focused`

#### 2. **CacheManager** ([src/core/cache-manager.ts](src/core/cache-manager.ts))
- Anthropic prompt caching integration
- Cache system prompts, MCP tools, and static content
- 90% cost reduction on cached tokens
- Cache metrics tracking

#### 3. **BaseAgent** ([src/agents/base-agent.ts](src/agents/base-agent.ts))
- Abstract base class for all agents
- Integrates ModelRouter + CacheManager
- Anthropic API integration (@anthropic-ai/sdk)
- Standardized invocation pattern

#### 4. **GitAgent** ([src/agents/git-agent.ts](src/agents/git-agent.ts))
- Branch creation/management
- Diff analysis
- SHA retrieval for cache invalidation
- Always uses Haiku 4 (deterministic operations)

#### 5. **CLI Skeleton** ([src/cli/](src/cli/))
- Commander.js integration
- `prodready init`: Initialize `.harden/` directory ✅
- `prodready cycle`: Run hardening cycle (stub)
- `prodready session`: Multi-cycle session (stub)
- `prodready status`: Show hardening status ✅

---

## Installation

### Prerequisites

- Node.js 20+
- Git repository
- Anthropic API key

### Setup

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Link CLI globally (for development)
npm link

# Test installation
prodready --version
```

### Environment Variables

```bash
# Required
export ANTHROPIC_API_KEY="your-api-key-here"
```

---

## Usage

### Initialize a Repository

```bash
cd your-nextjs-app
prodready init
```

This creates:
```
your-nextjs-app/
├── .harden/               # State directory (repo-resident)
│   ├── state.yaml         # Current state pointer
│   ├── config.yaml        # Configuration
│   ├── cycles/            # Per-cycle records
│   ├── plans/             # Proposed plans
│   ├── approvals/         # User approvals
│   ├── evidence/          # Evidence manifests
│   └── telemetry/         # Model usage, costs
└── .hardenignore          # User suppressions template
```

### Check Status

```bash
prodready status
```

Shows current hardening progress:
- Categories complete
- Tests generated/passing
- Issues remaining
- Cycle history

### Run Hardening Cycle (Coming in Phase 1)

```bash
# Interactive category selection
prodready cycle

# Specific category
prodready cycle --category security

# Auto-suggest next category
prodready cycle --auto

# Run all categories
prodready cycle --all
```

---

## Architecture

### Multi-Model Routing

| Agent | Model | Rationale |
|-------|-------|-----------|
| **Evaluator** | **Opus 4.5** | Validation quality is paramount |
| **Git** | **Haiku 4** | Deterministic operations (85% cost savings) |
| **All others** | **Sonnet 4.5** | Reasoning + code generation |

### Prompt Caching Strategy

**MVP Caching:**
- System prompts (agent instructions)
- MCP tool definitions
- **Expected savings:** 47% cost reduction, 2x latency improvement

**Post-MVP:**
- Unchanged codebase files (SHA-based)
- Previous cycle artifacts
- Security knowledge bases

---

## Configuration

Edit `.harden/config.yaml` to customize:

```yaml
model_strategy:
  preset: "balanced"  # cost-optimized | balanced | quality-focused
  max_cost_per_cycle: 3.00  # USD

caching_strategy:
  enabled: true
  cache_targets:
    system_prompts: true
    mcp_tools: true

scope:
  categories:
    security: true
    e2e_tests: true
    smoke_tests: true

tools:
  semgrep:
    enabled: true
  playwright:
    enabled: true
```

---

## Development

### Project Structure

```
prodready/
├── src/
│   ├── cli/              # CLI commands
│   │   ├── commands/
│   │   │   ├── init.ts   ✅
│   │   │   ├── cycle.ts  📝 (stub)
│   │   │   ├── session.ts 📝 (stub)
│   │   │   └── status.ts ✅
│   │   └── index.ts      ✅
│   ├── core/
│   │   ├── model-router.ts    ✅
│   │   └── cache-manager.ts   ✅
│   ├── agents/
│   │   ├── base-agent.ts      ✅
│   │   └── git-agent.ts       ✅
│   ├── mcp/              📝 (Phase 1)
│   ├── reporting/        📝 (Phase 1)
│   └── state/            📝 (Phase 1)
├── tests/                📝 (Phase 1)
└── package.json          ✅
```

### Scripts

```bash
npm run build         # Compile TypeScript
npm run dev           # Watch mode
npm run test          # Run tests (Phase 1)
npm run lint          # ESLint
npm run format        # Prettier
```

---

## Roadmap

### ✅ Phase 0: Scaffolding (COMPLETE)
- Node.js/TypeScript project setup
- Core classes: ModelRouter, CacheManager, BaseAgent
- GitAgent implementation
- CLI skeleton with init/status commands

### 📝 Phase 1: Security Pipeline (NEXT)
- Integrate Semgrep MCP
- Orchestrator + Security Agent + Evaluator Agent
- Generate SARIF artifact (single cycle)
- Generate HTML report (single cycle)
- Conversational UX for findings presentation
- Basic approval workflow

### 📝 Phase 2: Full MVP
- Add Playwright MCP for test generation
- Implement RED-GREEN-REFACTOR workflow
- Add override system (.hardenignore)
- Implement simple auto-fix (dependency updates)
- Append-only artifacts (multiple cycles)
- Test on real Lovable/Bolt repo

### 📝 Phase 3: Polish & Validation
- Crash recovery
- State migration system
- Comprehensive error handling
- Rich progress streaming
- Documentation
- Test on 5+ vibe-coded repos

---

## Architecture Decisions

See [.claude/decisions/](c:\Users\georg\claude-code-project\AI-test-suite\.claude\decisions) for detailed ADRs:

- [2026-01-15-prompt-caching.md](.claude/decisions/2026-01-15-prompt-caching.md)

See architecture documents:
- [START_HERE_IMPLEMENTATION.md](START_HERE_IMPLEMENTATION.md)
- [PRODREADY_ARCHITECTURE.md](PRODREADY_ARCHITECTURE.md)
- [MULTI_MODEL_ROUTING_STRATEGY.md](MULTI_MODEL_ROUTING_STRATEGY.md)
- [PROMPT_CACHING_STRATEGY.md](PROMPT_CACHING_STRATEGY.md)

---

## Contributing

This project is in early development. Contributions welcome after MVP release.

---

## License

MIT

---

**Built with Claude Sonnet 4.5 via Claude Code** 🚀
