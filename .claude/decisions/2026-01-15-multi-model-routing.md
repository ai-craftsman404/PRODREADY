# Architectural Decision: Multi-Model Routing Strategy

**Date:** 2026-01-15
**Status:** ✅ Approved
**Impact:** Core Architecture

---

## Context

PRODREADY uses a 7-agent system (Orchestrator, Planner, Security, Playwright, Evaluator, Git, Reporting) to perform iterative code hardening. Each agent has different computational requirements—some require deep reasoning and code generation, while others perform deterministic operations like git commands or file formatting.

Initially, the architecture specified "Claude Sonnet 4.5" as a single model for all operations. This was suboptimal because:

1. **Validation quality matters more than cost** — False positives waste client time
2. **Deterministic operations don't need reasoning** — Git commands, formatting, schema validation
3. **Cost efficiency without quality loss** — Opportunity to optimize with no downside

---

## Decision

Implement a **multi-model routing strategy** that assigns models based on agent role and task complexity:

### Model Assignments

| Agent | Model | Rationale |
|-------|-------|-----------|
| Orchestrator | Sonnet 4.5 | Workflow coordination requires reasoning |
| Planner | Sonnet 4.5 | Classification and test planning |
| Security | Sonnet 4.5 (remediation)<br>Haiku 4 (execution) | Code understanding vs. tool execution |
| Playwright | Sonnet 4.5 (authoring)<br>Haiku 4 (execution) | Test generation vs. test running |
| **Evaluator** | **Opus 4.5** | **CRITICAL: Validation quality is paramount** |
| **Git** | **Haiku 4** | **Deterministic operations—85% cost savings** |
| Reporting | Sonnet 4.5 (narrative)<br>Haiku 4 (formatting) | Prose generation vs. template rendering |

### Configuration Presets

Users can choose via `.harden/config.yaml`:

- **`cost-optimized`**: Minimize costs; skip Opus (use Sonnet for evaluator)
- **`balanced`** (default): Strategy above—Opus for evaluator, Haiku for deterministic
- **`quality-focused`**: Opus for evaluator + security; Sonnet everywhere else

---

## Rationale

### 1. Production AI Best Practices

This strategy follows proven patterns from mature AI systems:

- **Validation deserves best model:** False positives are more expensive than API costs
- **Deterministic ops don't need reasoning:** 85% cost savings with zero quality loss
- **User control is essential:** Different projects have different priorities (cost vs. quality)

### 2. Cost Impact Analysis

**Example Hardening Cycle:**

| Component | Model | Estimated Cost |
|-----------|-------|----------------|
| Orchestrator (workflow) | Sonnet | $0.054 |
| Planner (analysis) | Sonnet | $0.090 |
| Security (execution + remediation) | Haiku + Sonnet | $0.173 |
| Playwright (generation + execution) | Sonnet + Haiku | $0.303 |
| **Evaluator (validation)** | **Opus** | **$0.675** ← Strategic spend |
| Git (all operations) | Haiku | $0.002 ← Major savings |
| Reporting (narrative + formatting) | Sonnet + Haiku | $0.126 |
| **TOTAL** | | **$1.423** |

**Comparison:**
- All-Sonnet baseline: $0.966
- Optimized strategy: $1.423 (+47%)
- **But:** Opus validation prevents false positives worth 10x the cost difference

### 3. Extensibility

This architecture is easily extensible:

- **Today:** 3-model strategy (simple to implement)
- **Future:** Task-level complexity routing (if needed)
- **Advanced:** ML-based adaptive routing (learn from historical performance)

---

## Consequences

### Positive

1. **Higher validation quality:** Evaluator using Opus significantly reduces false positives
2. **Cost efficiency on deterministic tasks:** Git operations save 85% with no quality loss
3. **User flexibility:** Three presets accommodate different project priorities
4. **Transparent cost tracking:** All model usage logged in cycle records
5. **Simple implementation:** Only 3 models to manage initially

### Negative

1. **Slightly higher per-cycle cost** (+47% vs all-Sonnet in example scenario)
2. **Additional complexity:** Router logic, configuration management
3. **Regional availability:** Opus 4.5 may not be available in all regions initially

### Neutral

1. **Model version updates:** Need to monitor Anthropic releases and update model IDs
2. **Pricing changes:** Need to update cost calculations if Anthropic changes pricing
3. **Fallback strategy:** Need graceful degradation if preferred model unavailable

---

## Implementation

### Files Modified

1. **PRODREADY_ARCHITECTURE.md**
   - Updated "Core Technologies" section to list all three models
   - Added "Multi-Model Routing Strategy" section with full specification
   - Updated each agent's role section to specify assigned model

2. **MULTI_MODEL_ROUTING_STRATEGY.md** (new file)
   - Comprehensive guide with implementation code
   - Cost impact analysis
   - Configuration examples
   - Best practices from production systems

### Code Components to Implement

```typescript
// src/core/model-router.ts
export class ModelRouter {
  selectModel(context: {
    agent: AgentType;
    task: TaskType;
    complexity?: TaskComplexity;
  }): ModelConfig;

  logUsage(result: ModelUsageResult): void;
  calculateCost(model: string, inputTokens: number, outputTokens: number): number;
}
```

### Configuration Schema

```yaml
# .harden/config.yaml
model_strategy:
  preset: "balanced"  # "cost-optimized" | "balanced" | "quality-focused"
  overrides:
    evaluator: "opus-4.5"
    git: "haiku-4"
  max_cost_per_cycle: 3.00
  fallback_on_unavailable: "sonnet-4.5"
  retry_with_upgrade: true
```

---

## Monitoring

Each cycle records model usage:

```yaml
# .harden/cycles/<cycle_id>.yaml
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
```

---

## Alternatives Considered

### 1. All-Sonnet (Original Design)
- **Pro:** Simplest implementation
- **Con:** Missed optimization opportunities (Git operations)
- **Con:** Lower validation quality than available with Opus

### 2. All-Opus (Maximum Quality)
- **Pro:** Highest quality across the board
- **Con:** Prohibitively expensive (~5x cost increase)
- **Con:** Overkill for deterministic operations

### 3. All-Haiku (Maximum Efficiency)
- **Pro:** Lowest cost
- **Con:** Insufficient reasoning capability for code generation
- **Con:** Unacceptable quality loss for validation

### 4. Dynamic Per-Task Routing
- **Pro:** Optimal granularity
- **Con:** Too complex for MVP
- **Decision:** Defer to post-MVP if needed

---

## References

- [Anthropic Model Pricing](https://www.anthropic.com/pricing)
- [Claude API Documentation](https://docs.anthropic.com/en/api/messages)
- [PRODREADY_ARCHITECTURE.md](../../PRODREADY_ARCHITECTURE.md#multi-model-routing-strategy)
- [MULTI_MODEL_ROUTING_STRATEGY.md](../../MULTI_MODEL_ROUTING_STRATEGY.md)

---

## Approval

**Approved by:** User (George)
**Date:** 2026-01-15
**Next Action:** Implement ModelRouter in MVP Phase 0 scaffolding
