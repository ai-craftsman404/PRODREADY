/**
 * ModelRouter: Intelligent multi-model selection for PRODREADY agents
 *
 * Strategy:
 * - Haiku 4: Deterministic operations (git, formatting, file I/O) - 85% cost savings
 * - Sonnet 4.5: Complex reasoning, code generation (most agents)
 * - Opus 4.5: Critical validation (Evaluator agent) - quality over cost
 *
 * Reference: MULTI_MODEL_ROUTING_STRATEGY.md
 */

export enum ModelTier {
  HAIKU = 'claude-haiku-4-20250901',
  SONNET = 'claude-sonnet-4-5-20250929',
  OPUS = 'claude-opus-4-5-20251101'
}

export type AgentType =
  | 'orchestrator'
  | 'planner'
  | 'security'
  | 'playwright'
  | 'evaluator'  // ALWAYS Opus (non-negotiable)
  | 'git'        // ALWAYS Haiku (deterministic only)
  | 'reporting';

export type TaskType =
  | 'default'
  | 'create_branch'
  | 'format_sarif'
  | 'generate_playwright_test'
  | 'validate_finding'
  | 'append_cycle_record'
  | 'compute_diff_scope'
  | 'execute_remediation_plan'
  | 'generate_narrative';

export interface TaskComplexity {
  reasoning_depth: 'shallow' | 'medium' | 'deep';
  code_generation: boolean;
  validation_stakes: 'low' | 'medium' | 'high';
  deterministic: boolean;
}

export interface ModelConfig {
  model: ModelTier;
  temperature: number;
}

export interface ModelUsageLog {
  agent: AgentType;
  task: TaskType;
  model: ModelTier;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
  duration_ms: number;
  timestamp: string;
}

export type ModelStrategyPreset = 'cost-optimized' | 'balanced' | 'quality-focused';

export interface ModelStrategyConfig {
  preset: ModelStrategyPreset;
  overrides?: Partial<Record<AgentType, ModelTier>>;
  max_cost_per_cycle?: number;
  fallback_on_unavailable?: ModelTier;
  retry_with_upgrade?: boolean;
}

/**
 * Model pricing per million tokens (as of 2026-01-15)
 */
const MODEL_PRICING = {
  [ModelTier.HAIKU]: { input: 0.40, output: 2.00 },
  [ModelTier.SONNET]: { input: 3.00, output: 15.00 },
  [ModelTier.OPUS]: { input: 15.00, output: 75.00 }
} as const;

/**
 * Default agent-to-model mapping (balanced strategy)
 */
const DEFAULT_AGENT_MODELS: Record<AgentType, ModelTier> = {
  orchestrator: ModelTier.SONNET,  // Needs coordination logic
  planner: ModelTier.SONNET,       // Needs reasoning about test coverage
  security: ModelTier.SONNET,      // Needs code understanding for remediation
  playwright: ModelTier.SONNET,    // Needs test authoring creativity
  evaluator: ModelTier.OPUS,       // CRITICAL: needs highest reasoning for validation
  git: ModelTier.HAIKU,            // Deterministic operations only
  reporting: ModelTier.SONNET      // Needs narrative generation (can override per task)
};

export class ModelRouter {
  private strategy: ModelStrategyConfig;
  private usageLog: ModelUsageLog[] = [];

  constructor(strategy: ModelStrategyConfig = { preset: 'balanced' }) {
    this.strategy = strategy;
  }

  /**
   * Select optimal model based on agent type and task complexity
   */
  selectModel(
    agent: AgentType,
    _task: TaskType = 'default',
    complexity?: TaskComplexity
  ): ModelConfig {
    // RULE 1: Check for user overrides first
    if (this.strategy.overrides?.[agent]) {
      return this.createModelConfig(this.strategy.overrides[agent]);
    }

    // RULE 2: Evaluator ALWAYS uses Opus (non-negotiable for quality)
    if (agent === 'evaluator') {
      return this.createModelConfig(ModelTier.OPUS, 0.3);
    }

    // RULE 3: Git ALWAYS uses Haiku (deterministic operations)
    if (agent === 'git') {
      return this.createModelConfig(ModelTier.HAIKU, 0);
    }

    // RULE 4: Task-level complexity routing
    if (complexity) {
      // Deterministic + no code generation = Haiku
      if (complexity.deterministic && !complexity.code_generation) {
        return this.createModelConfig(ModelTier.HAIKU, 0);
      }

      // High validation stakes = Opus
      if (complexity.validation_stakes === 'high') {
        return this.createModelConfig(ModelTier.OPUS, 0.3);
      }

      // Deep reasoning = Sonnet minimum
      if (complexity.reasoning_depth === 'deep') {
        return this.createModelConfig(ModelTier.SONNET, 0.5);
      }
    }

    // RULE 5: Apply preset strategy
    const model = this.getModelForPreset(agent);
    return this.createModelConfig(model);
  }

  /**
   * Get model based on strategy preset
   */
  private getModelForPreset(agent: AgentType): ModelTier {
    switch (this.strategy.preset) {
      case 'cost-optimized':
        // Maximize Haiku usage, no Opus
        if (agent === 'evaluator') return ModelTier.SONNET; // Downgrade evaluator
        if (agent === 'git' || agent === 'reporting') return ModelTier.HAIKU;
        return ModelTier.SONNET;

      case 'quality-focused':
        // Use Opus for critical agents
        if (agent === 'evaluator' || agent === 'security') return ModelTier.OPUS;
        if (agent === 'git') return ModelTier.HAIKU; // Still use Haiku for deterministic
        return ModelTier.SONNET;

      case 'balanced':
      default:
        return DEFAULT_AGENT_MODELS[agent];
    }
  }

  /**
   * Create model config with appropriate temperature
   */
  private createModelConfig(model: ModelTier, temperature?: number): ModelConfig {
    if (temperature !== undefined) {
      return { model, temperature };
    }

    // Default temperatures per model
    switch (model) {
      case ModelTier.HAIKU:
        return { model, temperature: 0 }; // Deterministic
      case ModelTier.OPUS:
        return { model, temperature: 0.3 }; // Focused reasoning
      case ModelTier.SONNET:
      default:
        return { model, temperature: 0.5 }; // Balanced creativity
    }
  }

  /**
   * Calculate cost for API usage
   */
  calculateCost(model: ModelTier, inputTokens: number, outputTokens: number): number {
    const pricing = MODEL_PRICING[model];
    return (inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000;
  }

  /**
   * Log model usage for cost tracking and analytics
   */
  logUsage(log: Omit<ModelUsageLog, 'timestamp'>): void {
    const entry: ModelUsageLog = {
      ...log,
      timestamp: new Date().toISOString()
    };
    this.usageLog.push(entry);
  }

  /**
   * Get usage statistics for current session
   */
  getUsageStats(): {
    total_cost: number;
    total_tokens: { input: number; output: number };
    by_model: Record<ModelTier, { tasks: number; cost: number; avg_latency_ms: number }>;
    by_agent: Record<AgentType, { tasks: number; cost: number }>;
  } {
    const stats = {
      total_cost: 0,
      total_tokens: { input: 0, output: 0 },
      by_model: {} as Record<ModelTier, { tasks: number; cost: number; avg_latency_ms: number }>,
      by_agent: {} as Record<AgentType, { tasks: number; cost: number }>
    };

    // Initialize model stats
    Object.values(ModelTier).forEach(model => {
      stats.by_model[model] = { tasks: 0, cost: 0, avg_latency_ms: 0 };
    });

    // Initialize agent stats
    (['orchestrator', 'planner', 'security', 'playwright', 'evaluator', 'git', 'reporting'] as AgentType[]).forEach(agent => {
      stats.by_agent[agent] = { tasks: 0, cost: 0 };
    });

    // Aggregate usage
    this.usageLog.forEach(log => {
      stats.total_cost += log.cost_usd;
      stats.total_tokens.input += log.input_tokens;
      stats.total_tokens.output += log.output_tokens;

      // By model
      stats.by_model[log.model].tasks += 1;
      stats.by_model[log.model].cost += log.cost_usd;
      stats.by_model[log.model].avg_latency_ms += log.duration_ms;

      // By agent
      stats.by_agent[log.agent].tasks += 1;
      stats.by_agent[log.agent].cost += log.cost_usd;
    });

    // Calculate average latencies
    Object.keys(stats.by_model).forEach(model => {
      const modelKey = model as ModelTier;
      if (stats.by_model[modelKey].tasks > 0) {
        stats.by_model[modelKey].avg_latency_ms /= stats.by_model[modelKey].tasks;
      }
    });

    return stats;
  }

  /**
   * Check if cycle cost exceeds budget
   */
  checkBudget(cycleId: number): { exceeded: boolean; current: number; limit: number } {
    const cycleCost = this.usageLog
      .filter(log => log.timestamp >= this.getCycleStartTime(cycleId))
      .reduce((sum, log) => sum + log.cost_usd, 0);

    const limit = this.strategy.max_cost_per_cycle ?? Infinity;

    return {
      exceeded: cycleCost > limit,
      current: cycleCost,
      limit
    };
  }

  /**
   * Get cycle start time (placeholder - would be managed by CycleManager)
   */
  private getCycleStartTime(_cycleId: number): string {
    // TODO: Integrate with CycleManager to get actual cycle start time
    return new Date().toISOString();
  }

  /**
   * Export usage log for persistence
   */
  exportUsageLog(): ModelUsageLog[] {
    return [...this.usageLog];
  }

  /**
   * Clear usage log (e.g., at start of new cycle)
   */
  clearUsageLog(): void {
    this.usageLog = [];
  }
}
