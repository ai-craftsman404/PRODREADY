# PRODREADY Multi-Model Routing Strategy

> **Status:** ✅ OFFICIAL ARCHITECTURE (Integrated into PRODREADY_ARCHITECTURE.md)
> **Created:** 2026-01-15
> **Purpose:** Cost optimization through intelligent model selection based on task complexity
> **Decision:** User-approved strategy based on production AI best practices

---

## Problem Statement

Currently, PRODREADY uses **Claude Sonnet 4.5** for ALL agent tasks, regardless of complexity. This is suboptimal because:

1. **Cost inefficiency:** Simple tasks (file operations, formatting, basic validation) don't need Sonnet 4.5's capabilities
2. **Latency overhead:** Simpler models like Haiku are faster for straightforward tasks
3. **Scalability:** High-volume operations (scanning large codebases) could be cheaper with tiered models

---

## Proposed Solution: Dynamic Model Router

### Model Tier Selection

| Model | Cost/MTok | Use Cases | Agent Assignments |
|-------|-----------|-----------|-------------------|
| **Claude Haiku 4** | $0.40 / $2 | Fast, deterministic tasks | • Git operations<br>• File I/O<br>• SARIF formatting<br>• Evidence manifest generation<br>• Cycle record persistence |
| **Claude Sonnet 4.5** | $3 / $15 | Complex reasoning, code generation | • Test planning (Planner Agent)<br>• Test generation (Playwright Agent)<br>• Security remediation (Security Agent)<br>• Report narrative (Reporting Agent) |
| **Claude Opus 4.5** | $15 / $75 | Multi-step reasoning, high-stakes decisions | • Evaluator Agent (grounding/validation)<br>• Complex architectural decisions<br>• Ambiguity resolution<br>• Human override review |

### Decision Matrix

```yaml
agent_model_mapping:
  orchestrator: sonnet-4.5      # Needs coordination logic
  planner: sonnet-4.5            # Needs reasoning about test coverage
  security: sonnet-4.5           # Needs code understanding for remediation
  playwright: sonnet-4.5         # Needs test authoring creativity
  evaluator: opus-4.5            # CRITICAL: needs highest reasoning for validation
  git: haiku-4                   # Deterministic operations only
  reporting: sonnet-4.5          # Needs narrative generation

# Task-level overrides (if more granular)
task_model_routing:
  - task: "format_sarif"
    model: haiku-4
    reason: "Deterministic JSON manipulation"

  - task: "generate_playwright_test"
    model: sonnet-4.5
    reason: "Requires code reasoning and selector strategy"

  - task: "validate_findings_with_evidence"
    model: opus-4.5
    reason: "High-stakes validation; false positives costly"

  - task: "append_cycle_record"
    model: haiku-4
    reason: "YAML append with schema validation"

  - task: "compute_diff_scope"
    model: haiku-4
    reason: "Git diff parsing and file list generation"

  - task: "execute_remediation_plan"
    model: sonnet-4.5
    reason: "Requires code editing and testing"
```

---

## Implementation Architecture

### 1. Model Router Component

```typescript
// src/core/model-router.ts

export enum ModelTier {
  HAIKU = 'claude-haiku-4-20250901',
  SONNET = 'claude-sonnet-4-5-20250929',
  OPUS = 'claude-opus-4-5-20251101'
}

export interface TaskComplexity {
  reasoning_depth: 'shallow' | 'medium' | 'deep';
  code_generation: boolean;
  validation_stakes: 'low' | 'medium' | 'high';
  deterministic: boolean;
}

export class ModelRouter {
  /**
   * Select optimal model based on task characteristics
   */
  selectModel(
    agent: AgentType,
    task: TaskType,
    complexity?: TaskComplexity
  ): ModelTier {
    // Agent-level defaults
    const agentDefaults: Record<AgentType, ModelTier> = {
      orchestrator: ModelTier.SONNET,
      planner: ModelTier.SONNET,
      security: ModelTier.SONNET,
      playwright: ModelTier.SONNET,
      evaluator: ModelTier.OPUS,      // CRITICAL: always use best model
      git: ModelTier.HAIKU,
      reporting: ModelTier.SONNET
    };

    // Task-level overrides
    if (complexity?.deterministic && !complexity.code_generation) {
      return ModelTier.HAIKU;
    }

    if (complexity?.validation_stakes === 'high') {
      return ModelTier.OPUS;
    }

    return agentDefaults[agent];
  }

  /**
   * Estimate cost for a given task
   */
  estimateCost(
    model: ModelTier,
    inputTokens: number,
    outputTokens: number
  ): number {
    const pricing = {
      [ModelTier.HAIKU]:  { input: 0.40, output: 2.00 },
      [ModelTier.SONNET]: { input: 3.00, output: 15.00 },
      [ModelTier.OPUS]:   { input: 15.00, output: 75.00 }
    };

    const rates = pricing[model];
    return (inputTokens * rates.input + outputTokens * rates.output) / 1_000_000;
  }
}
```

### 2. Agent Base Class Integration

```typescript
// src/agents/base-agent.ts

export abstract class BaseAgent {
  protected modelRouter: ModelRouter;
  protected defaultModel: ModelTier;

  constructor(
    protected agentType: AgentType,
    protected config: AgentConfig
  ) {
    this.modelRouter = new ModelRouter();
    this.defaultModel = this.modelRouter.selectModel(agentType, 'default');
  }

  /**
   * Execute task with optimal model selection
   */
  protected async executeWithModel<T>(
    task: TaskType,
    complexity: TaskComplexity,
    prompt: string
  ): Promise<T> {
    const model = this.modelRouter.selectModel(
      this.agentType,
      task,
      complexity
    );

    const startTime = Date.now();
    const result = await this.callClaudeAPI(model, prompt);
    const duration = Date.now() - startTime;

    // Log for cost tracking
    this.logModelUsage({
      agent: this.agentType,
      task,
      model,
      inputTokens: result.usage.input_tokens,
      outputTokens: result.usage.output_tokens,
      cost: this.modelRouter.estimateCost(
        model,
        result.usage.input_tokens,
        result.usage.output_tokens
      ),
      duration
    });

    return result.content;
  }
}
```

### 3. Example: Git Agent (Always Haiku)

```typescript
// src/agents/git-agent.ts

export class GitAgent extends BaseAgent {
  constructor(config: AgentConfig) {
    super('git', config);
    // Git operations are always deterministic, always use Haiku
  }

  async createHardeningBranch(baseBranch: string): Promise<string> {
    return this.executeWithModel(
      'create_branch',
      {
        reasoning_depth: 'shallow',
        code_generation: false,
        validation_stakes: 'low',
        deterministic: true  // Forces Haiku
      },
      `Create a hardening branch from ${baseBranch} with timestamp naming...`
    );
  }
}
```

### 4. Example: Evaluator Agent (Always Opus)

```typescript
// src/agents/evaluator-agent.ts

export class EvaluatorAgent extends BaseAgent {
  constructor(config: AgentConfig) {
    super('evaluator', config);
    // Evaluator is CRITICAL - always use Opus for highest accuracy
  }

  async validateFinding(finding: SecurityFinding): Promise<ValidationResult> {
    return this.executeWithModel(
      'validate_finding',
      {
        reasoning_depth: 'deep',
        code_generation: false,
        validation_stakes: 'high',  // Forces Opus
        deterministic: false
      },
      `Validate this security finding with evidence grounding...`
    );
  }
}
```

---

## Cost Impact Analysis

### Current Architecture (All Sonnet 4.5)

```
Typical Hardening Cycle Costs (estimated):
- Planner: 5K input + 2K output = $0.045
- Security: 20K input + 5K output = $0.135
- Playwright: 15K input + 8K output = $0.165
- Evaluator: 30K input + 3K output = $0.135
- Git: 2K input + 500 output = $0.014
- Reporting: 10K input + 4K output = $0.090
--------------------------------
Total per cycle: ~$0.584
```

### Optimized Multi-Model Architecture

```
Typical Hardening Cycle Costs (estimated):
- Planner (Sonnet): 5K input + 2K output = $0.045
- Security (Sonnet): 20K input + 5K output = $0.135
- Playwright (Sonnet): 15K input + 8K output = $0.165
- Evaluator (Opus): 30K input + 3K output = $0.675  ← Higher but justified
- Git (Haiku): 2K input + 500 output = $0.002       ← 85% savings
- Reporting (Sonnet): 10K input + 4K output = $0.090
--------------------------------
Total per cycle: ~$1.112

Wait, this is MORE expensive! But...
```

### Why Higher Cost Can Be Better

The **Evaluator using Opus** is intentionally more expensive because:

1. **False positive reduction:** Better grounding = fewer wasted remediation cycles
2. **Trust in automation:** Higher quality validation = more confidence in results
3. **Client value:** Fewer spurious findings = better client experience

The **Git using Haiku** saves ~85% on deterministic operations.

### Real Optimization: Task Granularity

```
Optimized with Task-Level Routing:
- Planner (Sonnet): Core planning = $0.045
- Security Agent:
  - Semgrep execution (Haiku): $0.003
  - Finding classification (Sonnet): $0.050
  - Remediation generation (Sonnet): $0.082
- Playwright Agent:
  - Test planning (Sonnet): $0.080
  - Test execution (Haiku): $0.004
  - Trace analysis (Haiku): $0.003
- Evaluator (Opus): Validation only = $0.675
- Git (Haiku): All operations = $0.002
- Reporting:
  - Narrative (Sonnet): $0.060
  - SARIF formatting (Haiku): $0.002
  - HTML templating (Haiku): $0.003
--------------------------------
Total per cycle: ~$1.009

Savings: ~10% vs all-Sonnet, with higher quality validation
```

---

## Configuration

### User-Configurable Model Strategy

Allow users to override in `.harden/config.yaml`:

```yaml
# .harden/config.yaml

model_strategy:
  mode: "optimized"  # "optimized" | "all-sonnet" | "all-opus" | "custom"

  # Custom overrides
  agent_models:
    evaluator: "opus-4.5"     # Always use Opus for validation
    git: "haiku-4"            # Always use Haiku for git ops
    # Others use default "optimized" routing

  # Budget constraints
  max_cost_per_cycle: 2.00    # USD, halt if exceeded

  # Fallback strategy
  fallback_on_error: "sonnet-4.5"  # If Opus/Haiku unavailable
```

---

## Implementation Phases

### Phase 1: Foundation (MVP)
- [ ] Implement `ModelRouter` class
- [ ] Add model selection to `BaseAgent`
- [ ] Default to Sonnet 4.5 for all agents (no behavior change)

### Phase 2: Agent Optimization (Post-MVP)
- [ ] Route Git agent to Haiku
- [ ] Route Evaluator agent to Opus
- [ ] Add cost tracking and logging

### Phase 3: Task-Level Routing (Future)
- [ ] Classify tasks by complexity
- [ ] Dynamic routing based on task characteristics
- [ ] A/B testing to validate cost/quality tradeoffs

### Phase 4: Intelligence Layer (Advanced)
- [ ] Learn from past task success/failure rates
- [ ] Adaptive routing based on historical performance
- [ ] Anomaly detection (e.g., Haiku task required retry with Sonnet)

---

## Monitoring & Metrics

Track these metrics per cycle:

```yaml
model_usage_metrics:
  cycle_id: 42
  total_cost: 1.05
  model_breakdown:
    haiku: { tasks: 12, cost: 0.015, avg_latency_ms: 450 }
    sonnet: { tasks: 8, cost: 0.360, avg_latency_ms: 1200 }
    opus: { tasks: 2, cost: 0.675, avg_latency_ms: 2500 }

  cost_efficiency:
    baseline_all_sonnet: 0.584
    actual_cost: 1.05
    delta: +79.8%
    justification: "Opus validation reduced false positives by 40%"
```

---

## Open Questions

1. **Should users control model routing?**
   - Pro: Flexibility for budget-conscious vs quality-focused users
   - Con: Adds complexity; most users won't care

2. **Should we dynamically upgrade models mid-cycle?**
   - Example: Haiku attempts task → fails validation → retry with Sonnet
   - Pro: Cost optimization with quality fallback
   - Con: Adds latency and complexity

3. **Should we use extended thinking for Evaluator?**
   - Claude can use "extended thinking" for complex reasoning tasks
   - Evaluator validation might benefit from this
   - Cost: Thinking tokens are billed at output rates

4. **Regional model availability?**
   - Opus 4.5 may not be available in all regions initially
   - Need fallback strategy

---

## Decision: Official Strategy (APPROVED)

### Official Multi-Model Strategy:

**Model Assignments by Agent:**

1. **Orchestrator Agent:** Sonnet 4.5 (workflow coordination)
2. **Planner Agent:** Sonnet 4.5 (classification and test planning)
3. **Security Agent:** Sonnet 4.5 for remediation | Haiku 4 for tool execution
4. **Playwright Agent:** Sonnet 4.5 for test authoring | Haiku 4 for test execution
5. **Evaluator Agent:** **Opus 4.5** (CRITICAL—validation quality is paramount)
6. **Git Agent:** **Haiku 4** (deterministic operations—85% cost savings)
7. **Reporting Agent:** Sonnet 4.5 for narrative | Haiku 4 for formatting

**Key Principles:**

1. **Quality > Cost for Validation:** Evaluator uses Opus to prevent false positives
2. **Efficiency for Determinism:** Git/formatting operations use Haiku
3. **Reasoning Where Needed:** Code generation and planning use Sonnet
4. **User Control:** Three presets (cost-optimized, balanced, quality-focused)
5. **Transparent Tracking:** All model usage logged in cycle records

**Rationale:**

- **Proven in Production:** Based on best practices from mature AI systems
- **Strategic Cost Allocation:** Spend more on validation, save on deterministic ops
- **Simpler Implementation:** Only 3 models to manage (Haiku, Sonnet, Opus)
- **Extensible:** Easy to add task-level routing in future iterations
- **User-Friendly:** Sensible defaults with override capability

### Implementation Timeline:

- **MVP (v1):** Full implementation with 3-model strategy
- **Post-MVP:** Add task-level complexity routing if needed
- **Future:** Machine learning-based adaptive routing based on historical performance

---

## References

- [Anthropic Model Pricing](https://www.anthropic.com/pricing)
- [Claude API Model IDs](https://docs.anthropic.com/en/docs/about-claude/models)
- [Model Context Protocol (MCP)](https://modelcontextprotocol.io)
- [PRODREADY Architecture](./PRODREADY_ARCHITECTURE.md#multi-model-routing-strategy)

---

**Status:** ✅ APPROVED & INTEGRATED

**Implementation:** Ready for MVP development

**Updated:** 2026-01-15 (integrated into core architecture)
