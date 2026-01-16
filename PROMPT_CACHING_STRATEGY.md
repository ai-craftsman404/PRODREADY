# PRODREADY Prompt Caching Strategy

> **Status:** ✅ RECOMMENDED (High-impact optimization)
> **Created:** 2026-01-15
> **Impact:** 90% cost reduction on cached content, 2x latency improvement
> **References:** [Anthropic Prompt Caching Docs](https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching)

---

## Executive Summary

**Prompt caching can reduce PRODREADY costs by 50-70% and improve latency by 2x** by caching:
1. **System prompts** (agent instructions, MCP tool definitions)
2. **Codebase context** (static files read for analysis)
3. **Previous cycle artifacts** (SARIF findings, test results)
4. **Static reference data** (security rules, CWE database, best practices)

**Key Insight:** In iterative hardening cycles, most context remains stable between cycles—only the diff changes. This is **perfect** for prompt caching.

---

## How Anthropic Prompt Caching Works

### Pricing

| Content Type | Cost per MTok |
|--------------|---------------|
| **Regular input** | $3.00 (Sonnet) |
| **Cache write** | $3.75 (+25% to write) |
| **Cache read** | **$0.30 (-90% to read)** ← HUGE SAVINGS |
| Cache TTL | 5 minutes |

### Mechanics

- Mark content blocks with `cache_control: {type: "ephemeral"}`
- Minimum cacheable size: 1024 tokens (~800 words)
- Maximum cache TTL: 5 minutes
- Cache key: Exact content match (byte-level)

### When It Helps Most

✅ **Excellent for:**
- Long system prompts (agent instructions)
- Static reference data (security rules, documentation)
- Large code contexts that don't change between requests
- Multi-turn conversations with stable context

❌ **Not useful for:**
- Content that changes every request
- Very short prompts (<1024 tokens)
- One-off requests

---

## PRODREADY Caching Opportunities

### Opportunity Analysis

| Cache Target | Size (est.) | Reuse Pattern | Savings Potential |
|--------------|-------------|---------------|-------------------|
| **Agent system prompts** | 3-5K tokens | Every agent invocation | 90% on 3-5K tokens |
| **MCP tool definitions** | 5-10K tokens | Every agent invocation | 90% on 5-10K tokens |
| **Codebase file context** | 10-50K tokens | Across same-file tasks | 90% on unchanged files |
| **Previous SARIF findings** | 5-15K tokens | Evaluator validation | 90% on 5-15K tokens |
| **Security knowledge base** | 10-20K tokens | Security agent tasks | 90% on 10-20K tokens |
| **Test generation templates** | 2-5K tokens | Playwright agent tasks | 90% on 2-5K tokens |

### Expected Impact Per Cycle

**Baseline cycle (no caching):**
- Total input tokens: 122K
- Cost: $1.423 (with multi-model routing)

**With optimal caching (cycle 2+):**
- Cacheable content: ~70K tokens (system prompts + static context)
- First write: 70K × $0.00375 = $0.26 (+$0.026 vs regular)
- Subsequent reads: 70K × $0.0003 = $0.021 (-90% savings)
- Non-cached: 52K × $0.003 = $0.156
- **New total: ~$0.60** (vs $1.42 = **58% cost reduction**)

---

## Implementation Strategy

### 1. Agent System Prompt Caching

**Target:** Cache agent instructions that don't change between cycles.

```typescript
// src/agents/base-agent.ts

export abstract class BaseAgent {
  protected systemPrompt: string;

  async invoke(userMessage: string, context: InvocationContext) {
    const response = await this.anthropic.messages.create({
      model: this.getModel(),
      max_tokens: 4096,
      system: [
        {
          type: "text",
          text: this.systemPrompt,  // Agent-specific instructions
          cache_control: { type: "ephemeral" }  // ← Cache this
        },
        {
          type: "text",
          text: this.getMCPToolDefinitions(),  // MCP tool schemas
          cache_control: { type: "ephemeral" }  // ← Cache this too
        }
      ],
      messages: [
        {
          role: "user",
          content: userMessage
        }
      ]
    });
  }
}
```

**Why this works:**
- Agent instructions are static per version
- MCP tool definitions don't change during a session
- Size: 3-10K tokens per agent (well above 1024 minimum)
- Reuse: Every agent invocation in every cycle

**Savings:** ~90% on 8-15K tokens per agent invocation

---

### 2. Codebase Context Caching

**Target:** Cache file contents when analyzing unchanged files.

```typescript
// src/agents/security-agent.ts

async analyzeFile(filePath: string, previousCycleSHA: string) {
  const currentSHA = await git.getFileSHA(filePath);

  // Build cacheable file context
  const fileContext = {
    path: filePath,
    sha: currentSHA,
    content: await fs.readFile(filePath, 'utf-8'),
    imports: await analyzeImports(filePath),
    exports: await analyzeExports(filePath)
  };

  // Use SHA as cache key indicator
  const cacheControl = (currentSHA === previousCycleSHA)
    ? { type: "ephemeral" }  // File unchanged, cache it
    : undefined;             // File changed, no caching

  const response = await this.anthropic.messages.create({
    model: this.getModel(),
    system: [
      {
        type: "text",
        text: this.systemPrompt,
        cache_control: { type: "ephemeral" }
      }
    ],
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Analyze this file for security issues:\n\n${JSON.stringify(fileContext, null, 2)}`,
            cache_control: cacheControl  // ← Only cache if unchanged
          },
          {
            type: "text",
            text: `Previous findings from Cycle ${previousCycle}:\n${previousFindings}`
            // Don't cache—changes every cycle
          }
        ]
      }
    ]
  });
}
```

**Why this works:**
- Most files don't change between cycles (especially in large codebases)
- Diff-aware hardening means we only modify a few files per cycle
- Same file context gets reused across Security, Playwright, Evaluator agents

**Savings:** ~90% on 10-50K tokens per unchanged file

---

### 3. Previous Cycle Artifacts Caching

**Target:** Cache previous SARIF findings when Evaluator validates new findings.

```typescript
// src/agents/evaluator-agent.ts

async validateFinding(
  newFinding: RawFinding,
  previousCycleSARIF: SARIF,
  cycleId: number
) {
  // Previous cycle SARIF doesn't change during this cycle
  const previousFindingsText = JSON.stringify(previousCycleSARIF, null, 2);

  const response = await this.anthropic.messages.create({
    model: 'claude-opus-4-5-20251101',
    system: [
      {
        type: "text",
        text: this.systemPrompt,
        cache_control: { type: "ephemeral" }
      },
      {
        type: "text",
        text: this.getSecurityKnowledgeBase(),  // CWE, OWASP reference
        cache_control: { type: "ephemeral" }    // ← Cache security knowledge
      }
    ],
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Previous validated findings from Cycle ${cycleId - 1}:\n\n${previousFindingsText}`,
            cache_control: { type: "ephemeral" }  // ← Cache previous SARIF
          },
          {
            type: "text",
            text: `New finding to validate:\n${JSON.stringify(newFinding, null, 2)}`
            // Current finding—don't cache
          }
        ]
      }
    ]
  });
}
```

**Why this works:**
- Previous cycle artifacts are immutable (append-only)
- Evaluator validates multiple findings per cycle against same previous context
- Security knowledge base (CWE, OWASP) is completely static

**Savings:** ~90% on 15-35K tokens across all Evaluator validations in a cycle

---

### 4. Multi-Turn Cycle Conversations

**Target:** Cache accumulating context within a single cycle.

```typescript
// src/core/orchestrator.ts

export class Orchestrator {
  private cycleMessages: Message[] = [];

  async runCycle(cycleId: number) {
    // Initialize with cached static context
    const staticContext = this.buildStaticContext();

    // Step 1: Plan
    this.cycleMessages.push({
      role: "user",
      content: [
        {
          type: "text",
          text: staticContext,
          cache_control: { type: "ephemeral" }  // ← Cache for entire cycle
        },
        {
          type: "text",
          text: "Analyze diff and propose plan for Cycle ${cycleId}"
        }
      ]
    });

    const planResponse = await this.invokeAgent('planner');
    this.cycleMessages.push({ role: "assistant", content: planResponse });

    // Step 2: Execute (static context still cached from Step 1)
    this.cycleMessages.push({
      role: "user",
      content: "Execute approved categories: Security, E2E Tests"
    });

    const executeResponse = await this.invokeAgent('orchestrator');
    // Cache hit on staticContext—no re-transmission
  }

  private buildStaticContext(): string {
    return `
      Repository: ${this.repo.name}
      Branch: ${this.hardeningBranch}
      Base commit: ${this.baseCommit}

      Project structure:
      ${this.getProjectStructure()}

      Previous cycle summary:
      ${this.getPreviousCycleSummary()}

      .harden/config.yaml:
      ${this.getConfig()}
    `;
  }
}
```

**Why this works:**
- Within a cycle, repo metadata doesn't change
- Multiple agent invocations can share same cached context
- 5-minute TTL is perfect for cycle duration (typically 2-10 minutes)

**Savings:** ~90% on 5-10K tokens for 4-8 agent invocations per cycle

---

### 5. Test Generation Template Caching

**Target:** Cache Playwright test templates and patterns.

```typescript
// src/agents/playwright-agent.ts

async generateTest(route: string, testType: 'smoke' | 'e2e' | 'a11y') {
  const templates = this.getTestTemplates();  // Large library of patterns

  const response = await this.anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    system: [
      {
        type: "text",
        text: this.systemPrompt,
        cache_control: { type: "ephemeral" }
      },
      {
        type: "text",
        text: `Test generation templates and best practices:\n\n${templates}`,
        cache_control: { type: "ephemeral" }  // ← Cache templates
      }
    ],
    messages: [
      {
        role: "user",
        content: `Generate ${testType} test for route: ${route}`
      }
    ]
  });
}
```

**Why this works:**
- Test templates are static reference material
- Reused across all test generation tasks in a cycle
- Large corpus (2-5K tokens)

**Savings:** ~90% on 2-5K tokens per test generation

---

## Cache Invalidation Strategy

### When to Invalidate Cache

**Agent system prompts:**
- ❌ Never invalidate mid-session
- ✅ Invalidate on PRODREADY version upgrade
- **Strategy:** Include version string in prompt to auto-invalidate

**Codebase files:**
- ✅ Check git SHA before reusing
- ✅ Invalidate if file modified
- **Strategy:** Include SHA in cache key logic

**Previous cycle artifacts:**
- ❌ Never invalidate within cycle
- ✅ New cycle = new cache key
- **Strategy:** Include cycle ID in content

**Security knowledge base:**
- ❌ Never invalidate mid-session
- ✅ Update weekly with latest CWE/CVE data
- **Strategy:** Version the knowledge base

### Cache Key Versioning

```typescript
// src/core/cache-manager.ts

export class CacheManager {
  private getCacheVersion(): string {
    return `v${PRODREADY_VERSION}-${this.securityKBVersion}-${this.cycleId}`;
  }

  buildCachedSystemPrompt(agentType: AgentType): string {
    const version = this.getCacheVersion();
    return `
      [PRODREADY ${version}]
      ${this.getAgentInstructions(agentType)}
    `;
    // Version prefix ensures cache invalidates on upgrade
  }
}
```

---

## Configuration

### User-Configurable Caching

```yaml
# .harden/config.yaml

caching_strategy:
  enabled: true  # Master switch

  # What to cache
  cache_targets:
    system_prompts: true        # Agent instructions
    mcp_tools: true             # Tool definitions
    codebase_files: true        # Unchanged files
    previous_artifacts: true    # SARIF, reports from previous cycle
    security_knowledge: true    # CWE, OWASP databases

  # Cache behavior
  min_cacheable_size: 1024      # Anthropic minimum
  cache_ttl_minutes: 5          # Anthropic default (non-configurable)

  # Optimization
  aggressive_caching: false     # If true, cache more aggressively (may increase first-cycle cost)
```

---

## Expected Impact: Real-World Scenario

### Scenario: 10-Cycle Hardening Session

**Assumptions:**
- 10 cycles to fully harden a Next.js app
- Each cycle: 5 agent invocations (Planner, Security, Playwright, Evaluator, Reporting)
- 30% of codebase changes each cycle (rest cached)

**Without Caching:**
```
Cycle 1: $1.42
Cycle 2: $1.42
...
Cycle 10: $1.42
─────────────
Total: $14.20
```

**With Optimal Caching:**
```
Cycle 1: $1.45 (+$0.03 cache write overhead)
Cycle 2: $0.62 (cache reads)
Cycle 3: $0.65 (cache reads + some new files)
...
Cycle 10: $0.68
─────────────
Total: ~$7.50

SAVINGS: 47% ($6.70 saved)
```

**Latency Improvement:**
- Cached requests: ~2x faster (fewer tokens to process)
- User-visible impact: Cycles complete 30-50% faster

---

## Implementation Checklist

### Phase 1: Foundation (MVP)
- [ ] Implement `CacheManager` class
- [ ] Add cache versioning logic
- [ ] Cache agent system prompts
- [ ] Cache MCP tool definitions
- [ ] Add cache metrics logging

### Phase 2: Context Caching (Post-MVP)
- [ ] Cache unchanged codebase files (SHA-based)
- [ ] Cache previous cycle SARIF artifacts
- [ ] Cache security knowledge base

### Phase 3: Advanced Optimization (Future)
- [ ] Multi-turn conversation caching
- [ ] Aggressive pre-caching of likely-needed files
- [ ] Cache warming strategies
- [ ] A/B testing to validate savings

---

## Monitoring & Metrics

Track per cycle in `.harden/cycles/<cycle_id>.yaml`:

```yaml
cache_metrics:
  total_input_tokens: 122000
  cached_tokens: 68000
  cache_hit_rate: 55.7%

  cost_breakdown:
    regular_input: 54000 @ $0.003 = $0.162
    cache_writes: 0 @ $0.00375 = $0.000      # Only Cycle 1
    cache_reads: 68000 @ $0.0003 = $0.020    # Cycles 2+

  savings:
    vs_no_cache: $0.204 (50% reduction)
    cumulative_session: $1.84

  latency_improvement:
    avg_response_time: 1.2s (vs 2.3s uncached)
    speedup: 1.92x
```

---

## Best Practices

### 1. Cache Stable Content First
Start with most stable, largest content:
- Agent instructions (static per version)
- MCP tools (static per session)
- Security knowledge (static per day/week)

### 2. Use Content-Based Cache Keys
Include version/SHA in content to auto-invalidate:
```typescript
const cachedContent = `
  [VERSION: ${PRODREADY_VERSION}]
  [FILE_SHA: ${fileSHA}]
  ${fileContent}
`;
```

### 3. Monitor Cache Hit Rates
- Target: >50% cache hit rate by Cycle 2
- Alert if hit rate drops unexpectedly
- Optimize cache targets based on metrics

### 4. Don't Over-Cache
- Don't cache content <1024 tokens (won't work)
- Don't cache rapidly changing content (wastes write cost)
- Don't cache if TTL < expected reuse time

### 5. Educate Users
Show cache savings in reports:
```
Cycle 3 Complete
Cost: $0.65 (saved $0.77 vs no caching)
Cache hit rate: 58%
```

---

## Risks & Mitigations

### Risk: Cache Invalidation Bugs
**Problem:** Stale cache causes incorrect results
**Mitigation:**
- Include version/SHA in all cached content
- Log cache keys and hit/miss events
- Add cache validation checks

### Risk: Cache Write Overhead
**Problem:** First cycle costs +25% for cache writes
**Mitigation:**
- Clearly communicate in documentation
- Show cumulative savings to justify
- Make caching opt-in for single-cycle use cases

### Risk: TTL Too Short for Long Cycles
**Problem:** 5-minute TTL expires during long cycles
**Mitigation:**
- Design cycles to complete <5 minutes typically
- For long cycles, batch agent invocations to reuse cache
- Document cache expiry in user-facing messages

---

## References

- [Anthropic Prompt Caching Documentation](https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching)
- [Anthropic Pricing](https://www.anthropic.com/pricing)
- [PRODREADY Architecture](./PRODREADY_ARCHITECTURE.md)
- [Multi-Model Routing Strategy](./MULTI_MODEL_ROUTING_STRATEGY.md)

---

## Decision Recommendation

### ✅ IMPLEMENT IN MVP

**Rationale:**
1. **High ROI:** 47% cost reduction with moderate implementation complexity
2. **User delight:** 2x latency improvement on cached cycles
3. **Competitive advantage:** Demonstrates technical sophistication
4. **Easy wins first:** Start with system prompt caching (simple, guaranteed savings)

**Phased Rollout:**
- **MVP:** Cache system prompts + MCP tools only (simple, safe, 20-30% savings)
- **Post-MVP:** Add codebase file caching (moderate complexity, 40-50% total savings)
- **Future:** Advanced multi-turn caching (complex, 50-60% total savings)

---

**Status:** ✅ RECOMMENDED FOR MVP

**Next Step:** Integrate into architecture and Phase 0 scaffolding

**Updated:** 2026-01-15
