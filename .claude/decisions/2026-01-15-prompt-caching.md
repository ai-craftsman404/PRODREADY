# Architectural Decision: Prompt Caching Strategy

**Date:** 2026-01-15
**Status:** ✅ Approved for MVP
**Impact:** Core Architecture — Cost & Performance Optimization

---

## Context

PRODREADY's iterative hardening workflow involves repeated agent invocations across multiple cycles. Each cycle:
- Invokes 5-8 agents (Orchestrator, Planner, Security, Playwright, Evaluator, Git, Reporting)
- Passes large static context (system prompts, MCP tool definitions, codebase files)
- Analyzes previous cycle artifacts (SARIF findings, test results)
- References static knowledge bases (CWE, OWASP, security rules)

**Key Observation:** In iterative cycles, **most context remains stable**—only the diff changes. This is ideal for caching.

Anthropic's prompt caching feature offers:
- **90% cost reduction** on cached content reads ($0.30/MTok vs $3.00/MTok)
- **~2x latency improvement** (fewer tokens to process)
- **5-minute TTL** (perfect for cycle duration of 2-10 minutes)

---

## Decision

Implement **prompt caching in three tiers**, starting with MVP-friendly system-level caching:

### Tier 1: System-Level Caching (MVP)

Cache content that **never changes during a session:**

1. **Agent system prompts** (3-5K tokens each)
   - Agent-specific instructions
   - Workflow guidelines
   - Output format specifications

2. **MCP tool definitions** (5-10K tokens total)
   - Tool schemas
   - Parameter specifications
   - Usage examples

**Implementation complexity:** Low
**Expected savings:** 20-30% cost reduction
**Risk:** Minimal (content is truly static)

### Tier 2: Context Caching (Post-MVP)

Cache content that **doesn't change between cycles:**

1. **Unchanged codebase files** (10-50K tokens)
   - Git SHA-based cache validation
   - Only cache if `current_sha === previous_cycle_sha`

2. **Previous cycle artifacts** (5-15K tokens)
   - Immutable SARIF findings from previous cycle
   - Historical test results
   - Append-only by design

**Implementation complexity:** Medium
**Expected savings:** 40-50% cumulative cost reduction
**Risk:** Low (SHA validation ensures correctness)

### Tier 3: Reference Data Caching (Future)

Cache **completely static reference data:**

1. **Security knowledge bases** (10-20K tokens)
   - CWE database
   - OWASP Top 10 reference
   - Security best practices

2. **Test templates** (2-5K tokens)
   - Playwright test patterns
   - Selector strategies
   - Assertion libraries

**Implementation complexity:** Low
**Expected savings:** 50-60% cumulative cost reduction
**Risk:** Minimal (data is static per version)

---

## Rationale

### Why This Matters

**Cost Impact (10-cycle session):**
```
Without caching: 10 × $1.42 = $14.20
With caching:    $1.45 + (9 × $0.65) = $7.50

Total savings: $6.70 (47% reduction)
```

**Latency Impact:**
- Cached requests process ~2x faster
- User-visible: Cycles complete 30-50% faster
- Improved developer experience

**Competitive Advantage:**
- Demonstrates technical sophistication
- Makes iterative hardening economically viable
- Scales better for large codebases

### Why Anthropic's Caching Fits Perfectly

1. **5-minute TTL matches cycle duration:**
   - Typical cycle: 2-10 minutes
   - Cache stays warm throughout cycle
   - Cache refreshes on reuse (extends TTL)

2. **Byte-level cache matching:**
   - Deterministic (no false cache hits)
   - Works with version strings for auto-invalidation
   - Simple to reason about

3. **Low risk of stale data:**
   - We control cache invalidation via version strings
   - Git SHA validation for file content
   - Immutable previous artifacts (append-only design)

---

## Implementation Strategy

### Phase 1: MVP (System-Level Caching)

**Goal:** 20-30% savings with minimal complexity

```typescript
// src/agents/base-agent.ts

export abstract class BaseAgent {
  async invoke(userMessage: string) {
    return await this.anthropic.messages.create({
      model: this.getModel(),
      system: [
        {
          type: "text",
          text: `[PRODREADY ${VERSION}]\n${this.systemPrompt}`,
          cache_control: { type: "ephemeral" }
        },
        {
          type: "text",
          text: this.getMCPToolDefinitions(),
          cache_control: { type: "ephemeral" }
        }
      ],
      messages: [{ role: "user", content: userMessage }]
    });
  }
}
```

**Key features:**
- Version string in prompt → auto-invalidates on upgrade
- MCP tools cached separately for granular control
- Zero risk (content is truly static)

**Deliverables:**
- [ ] `CacheManager` class
- [ ] Version string injection
- [ ] Cache metrics logging
- [ ] Integration with all agents

### Phase 2: Post-MVP (Context Caching)

**Goal:** 40-50% cumulative savings

```typescript
// src/agents/security-agent.ts

async analyzeFile(filePath: string) {
  const currentSHA = await git.getFileSHA(filePath);
  const previousSHA = this.cycleState.previousFileSHAs[filePath];

  const fileContext = await fs.readFile(filePath, 'utf-8');

  const cacheControl = (currentSHA === previousSHA)
    ? { type: "ephemeral" }   // Unchanged → cache it
    : undefined;              // Changed → no cache

  return await this.invoke({
    role: "user",
    content: [
      {
        type: "text",
        text: `[FILE: ${filePath}] [SHA: ${currentSHA}]\n${fileContext}`,
        cache_control: cacheControl
      },
      {
        type: "text",
        text: "Analyze for security issues"
      }
    ]
  });
}
```

**Key features:**
- Git SHA validation ensures correctness
- Cache only unchanged files (diff-aware)
- SHA in content → auto-invalidates on change

**Deliverables:**
- [ ] SHA-based cache logic
- [ ] File context caching in Security agent
- [ ] Previous artifact caching in Evaluator agent
- [ ] Cache hit rate monitoring

### Phase 3: Future (Reference Data Caching)

**Goal:** 50-60% cumulative savings

```typescript
// src/agents/evaluator-agent.ts

async validateFinding(finding: RawFinding) {
  return await this.invoke({
    system: [
      {
        type: "text",
        text: this.systemPrompt,
        cache_control: { type: "ephemeral" }
      },
      {
        type: "text",
        text: `[CWE_DB v${CWE_VERSION}]\n${this.getCWEDatabase()}`,
        cache_control: { type: "ephemeral" }
      }
    ],
    messages: [/* ... */]
  });
}
```

**Key features:**
- Version CWE/OWASP databases for auto-invalidation
- Completely static (safe to cache aggressively)

**Deliverables:**
- [ ] CWE database integration
- [ ] OWASP reference integration
- [ ] Test template library caching

---

## Configuration

### User-Facing Configuration

```yaml
# .harden/config.yaml

caching_strategy:
  enabled: true              # Master switch

  # What to cache
  cache_targets:
    system_prompts: true        # Agent instructions (MVP)
    mcp_tools: true             # Tool definitions (MVP)
    codebase_files: true        # Unchanged files (Post-MVP)
    previous_artifacts: true    # SARIF from prev cycle (Post-MVP)
    security_knowledge: true    # CWE, OWASP (Future)

  # Optimization
  aggressive_caching: false   # Cache more, accept +25% first-cycle cost
```

### Internal Configuration

```typescript
// src/core/cache-config.ts

export const CACHE_CONFIG = {
  minCacheableSize: 1024,      // Anthropic minimum
  cacheTTLMinutes: 5,          // Non-configurable (Anthropic)
  versionPrefix: `PRODREADY ${VERSION}`,

  // What to cache by tier
  tier1: ['system_prompts', 'mcp_tools'],
  tier2: ['codebase_files', 'previous_artifacts'],
  tier3: ['security_knowledge', 'test_templates']
};
```

---

## Monitoring & Metrics

### Per-Cycle Metrics

Track in `.harden/cycles/<cycle_id>.yaml`:

```yaml
cache_metrics:
  total_input_tokens: 122000
  cached_tokens: 68000
  cache_hit_rate: 55.7%

  cost_breakdown:
    regular_input: $0.162
    cache_writes: $0.000      # Only Cycle 1
    cache_reads: $0.020       # Cycles 2+

  savings:
    vs_no_cache: $0.204 (50% reduction)
    cumulative_session: $1.84

  latency:
    avg_response_time: 1.2s
    vs_uncached: 2.3s
    speedup: 1.92x
```

### Session-Level Metrics

Aggregate across cycles:

```yaml
# .harden/telemetry/cache-summary.yaml

session_cache_performance:
  total_cycles: 10
  total_cost: $7.50
  total_savings: $6.70 (47%)
  avg_hit_rate: 58%
  avg_speedup: 1.85x
```

### Alerting

- **Cache hit rate < 30% after Cycle 2** → Investigate cache invalidation
- **Unexpected cache misses** → Log and alert
- **Cache write cost > expected** → Review cache targets

---

## Risks & Mitigations

### Risk 1: Stale Cache Causing Incorrect Results

**Likelihood:** Low
**Impact:** High (incorrect security findings)

**Mitigations:**
1. **Version all cached content:**
   ```typescript
   const cachedPrompt = `[PRODREADY ${VERSION}]\n${prompt}`;
   ```
2. **Git SHA validation for file content:**
   ```typescript
   if (currentSHA !== previousSHA) {
     cacheControl = undefined; // Don't cache
   }
   ```
3. **Extensive logging:**
   - Log every cache hit/miss with cache key
   - Track cache invalidation events
4. **Testing:**
   - Unit tests for cache key generation
   - Integration tests for cache invalidation scenarios

**Residual Risk:** Minimal (deterministic invalidation)

---

### Risk 2: Cache Write Overhead in Cycle 1

**Likelihood:** Certain
**Impact:** Low (+25% cost in first cycle only)

**Mitigations:**
1. **Clear user communication:**
   ```
   Cycle 1: $1.45 (includes cache warming)
   Cycle 2+: $0.65 (cache savings: $0.80)
   ```
2. **Show cumulative savings:**
   ```
   Session total: $7.50 (saved $6.70 vs no caching)
   ```
3. **Make caching opt-in for single-cycle use:**
   ```yaml
   caching_strategy:
     enabled: auto  # Only enable if >1 cycle expected
   ```

**Residual Risk:** None (user expectations managed)

---

### Risk 3: Cache Expiry During Long Cycles

**Likelihood:** Low (cycles typically <5 min)
**Impact:** Medium (cache miss causes retry)

**Mitigations:**
1. **Design for <5 minute cycles:**
   - Batch agent invocations
   - Parallel execution where possible
2. **Document cache TTL:**
   ```
   ⚠️  Cache expires after 5 minutes of inactivity.
       For long cycles, batch operations to maintain cache.
   ```
3. **Graceful degradation:**
   - Cache miss = regular request (no failure)
   - Log cache expiry events for analysis

**Residual Risk:** Low (rare edge case)

---

## Success Metrics

### MVP Success Criteria

- [ ] **20% cost reduction** in Cycle 2+ vs Cycle 1 (baseline: no caching)
- [ ] **Cache hit rate >50%** by Cycle 2
- [ ] **Zero cache-related bugs** in user testing
- [ ] **<1% cache miss rate** for system prompts (should be 0%)

### Post-MVP Success Criteria

- [ ] **40% cost reduction** cumulative
- [ ] **Cache hit rate >60%** by Cycle 3
- [ ] **Latency improvement >1.5x** vs uncached

### Long-Term Goals

- [ ] **50% cost reduction** cumulative (with Tier 3)
- [ ] **Cache hit rate >70%** for mature projects
- [ ] **User-reported performance improvement** in surveys

---

## Alternatives Considered

### Alternative 1: Manual Response Caching (Application-Level)

**Approach:** Cache API responses in local database

**Pros:**
- More control over cache lifetime
- Can cache across sessions

**Cons:**
- Complex implementation (cache invalidation is hard)
- Storage management overhead
- Doesn't improve latency (still send all tokens)
- Reinventing Anthropic's built-in feature

**Decision:** Rejected (inferior to prompt caching)

---

### Alternative 2: No Caching (Baseline)

**Approach:** Accept higher costs as cost of doing business

**Pros:**
- Simpler implementation
- No cache invalidation bugs

**Cons:**
- 47% higher costs over 10 cycles ($14.20 vs $7.50)
- Slower cycles (no latency improvement)
- Less competitive vs. other tools

**Decision:** Rejected (unacceptable cost/performance)

---

### Alternative 3: Aggressive Caching Everything

**Approach:** Cache all content, regardless of stability

**Pros:**
- Maximum potential savings

**Cons:**
- High cache write overhead in Cycle 1 (+25% cost)
- Frequent cache invalidation (net negative ROI)
- Complex cache key management

**Decision:** Rejected (tiered approach is optimal)

---

## References

- [Anthropic Prompt Caching Documentation](https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching)
- [Anthropic Pricing](https://www.anthropic.com/pricing)
- [PROMPT_CACHING_STRATEGY.md](../../docs/PROMPT_CACHING_STRATEGY.md) — Full specification
- [PRODREADY_ARCHITECTURE.md](../../docs/PRODREADY_ARCHITECTURE.md) — Core architecture
- [Multi-Model Routing Strategy](./2026-01-15-multi-model-routing.md) — Complementary optimization

---

## Approval

**Approved by:** User (George)
**Date:** 2026-01-15
**Scope:** MVP implementation (Tier 1 caching)
**Next Steps:**
1. Implement `CacheManager` in Phase 0 scaffolding
2. Integrate with `BaseAgent` class
3. Add cache metrics to cycle records
4. Validate savings in initial testing

---

**Status:** ✅ APPROVED FOR MVP

**Implementation Priority:** High (foundational optimization)
