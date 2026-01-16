/**
 * CacheManager: Prompt caching implementation for PRODREADY
 *
 * Strategy:
 * - Cache system prompts + MCP tool definitions (MVP)
 * - Cache unchanged codebase files (Post-MVP)
 * - Cache previous cycle artifacts (Post-MVP)
 * - 90% cost reduction on cached content, 2x latency improvement
 *
 * Reference: PROMPT_CACHING_STRATEGY.md
 */

export interface CacheControl {
  type: 'ephemeral';
}

export interface CacheableContent {
  type: 'text';
  text: string;
  cache_control?: CacheControl;
}

export interface CacheMetrics {
  total_input_tokens: number;
  cached_tokens: number;
  cache_hit_rate: number;
  cost_breakdown: {
    regular_input: number;
    cache_writes: number;
    cache_reads: number;
  };
  savings: {
    vs_no_cache: number;
    cumulative_session: number;
  };
  latency_improvement: {
    avg_response_time_ms: number;
    speedup: number;
  };
}

export interface CacheStrategy {
  enabled: boolean;
  cache_targets: {
    system_prompts: boolean;      // Agent instructions
    mcp_tools: boolean;            // Tool definitions
    codebase_files: boolean;       // Unchanged files (SHA-based)
    previous_artifacts: boolean;   // SARIF from previous cycle
    security_knowledge: boolean;   // CWE, OWASP databases
  };
  min_cacheable_size: number;      // Anthropic minimum (1024 tokens)
  aggressive_caching: boolean;     // Cache more aggressively
}

export class CacheManager {
  private static readonly VERSION = '1.0.0';
  private static readonly MIN_CACHEABLE_TOKENS = 1024;
  // CACHE_TTL_MINUTES is informational - Anthropic default is 5 minutes (non-configurable)

  private strategy: CacheStrategy;
  private metrics: CacheMetrics;
  private cacheKeys: Map<string, { sha?: string; version?: string; cycleId?: number }>;

  constructor(strategy?: Partial<CacheStrategy>) {
    this.strategy = {
      enabled: true,
      cache_targets: {
        system_prompts: true,
        mcp_tools: true,
        codebase_files: false,      // Post-MVP
        previous_artifacts: false,   // Post-MVP
        security_knowledge: false    // Post-MVP
      },
      min_cacheable_size: CacheManager.MIN_CACHEABLE_TOKENS,
      aggressive_caching: false,
      ...strategy
    };

    this.metrics = this.initializeMetrics();
    this.cacheKeys = new Map();
  }

  /**
   * Create cacheable system prompt for agent
   */
  createCachedSystemPrompt(agentType: string, systemPrompt: string): CacheableContent {
    if (!this.strategy.enabled || !this.strategy.cache_targets.system_prompts) {
      return { type: 'text', text: systemPrompt };
    }

    // Add version prefix to auto-invalidate on upgrade
    const versionedPrompt = this.addVersionPrefix(systemPrompt);

    // Store cache key
    this.cacheKeys.set(`system_${agentType}`, { version: CacheManager.VERSION });

    return {
      type: 'text',
      text: versionedPrompt,
      cache_control: { type: 'ephemeral' }
    };
  }

  /**
   * Create cacheable MCP tool definitions
   */
  createCachedMCPTools(toolDefinitions: string): CacheableContent {
    if (!this.strategy.enabled || !this.strategy.cache_targets.mcp_tools) {
      return { type: 'text', text: toolDefinitions };
    }

    // Add version prefix
    const versionedTools = this.addVersionPrefix(toolDefinitions);

    return {
      type: 'text',
      text: versionedTools,
      cache_control: { type: 'ephemeral' }
    };
  }

  /**
   * Create cacheable codebase file content (SHA-based invalidation)
   */
  createCachedFileContent(
    filePath: string,
    content: string,
    currentSHA: string,
    previousSHA?: string
  ): CacheableContent {
    if (
      !this.strategy.enabled ||
      !this.strategy.cache_targets.codebase_files ||
      currentSHA !== previousSHA
    ) {
      return { type: 'text', text: content };
    }

    // File unchanged, cache it
    const cacheKey = `file_${filePath}`;
    this.cacheKeys.set(cacheKey, { sha: currentSHA });

    return {
      type: 'text',
      text: this.addSHAPrefix(content, filePath, currentSHA),
      cache_control: { type: 'ephemeral' }
    };
  }

  /**
   * Create cacheable previous cycle artifacts
   */
  createCachedArtifact(
    artifactType: 'sarif' | 'report',
    content: string,
    cycleId: number
  ): CacheableContent {
    if (!this.strategy.enabled || !this.strategy.cache_targets.previous_artifacts) {
      return { type: 'text', text: content };
    }

    // Artifacts are immutable per cycle
    const cacheKey = `artifact_${artifactType}_${cycleId}`;
    this.cacheKeys.set(cacheKey, { cycleId });

    return {
      type: 'text',
      text: this.addCyclePrefix(content, cycleId),
      cache_control: { type: 'ephemeral' }
    };
  }

  /**
   * Create cacheable security knowledge base
   */
  createCachedSecurityKnowledge(knowledgeBase: string, kbVersion: string): CacheableContent {
    if (!this.strategy.enabled || !this.strategy.cache_targets.security_knowledge) {
      return { type: 'text', text: knowledgeBase };
    }

    // Knowledge base is versioned
    this.cacheKeys.set('security_kb', { version: kbVersion });

    return {
      type: 'text',
      text: this.addVersionPrefix(knowledgeBase, kbVersion),
      cache_control: { type: 'ephemeral' }
    };
  }

  /**
   * Check if content is large enough to cache
   */
  isCacheable(content: string): boolean {
    // Rough estimation: 1 token ≈ 4 characters
    const estimatedTokens = content.length / 4;
    return estimatedTokens >= this.strategy.min_cacheable_size;
  }

  /**
   * Record cache usage metrics
   */
  recordCacheUsage(
    totalInputTokens: number,
    cachedTokens: number,
    cacheWriteTokens: number,
    responseTimeMs: number
  ): void {
    this.metrics.total_input_tokens += totalInputTokens;
    this.metrics.cached_tokens += cachedTokens;

    // Calculate hit rate
    if (this.metrics.total_input_tokens > 0) {
      this.metrics.cache_hit_rate =
        (this.metrics.cached_tokens / this.metrics.total_input_tokens) * 100;
    }

    // Update cost breakdown (prices per million tokens)
    const REGULAR_INPUT_COST = 3.0 / 1_000_000; // Sonnet base rate
    const CACHE_WRITE_COST = 3.75 / 1_000_000;  // +25% for cache writes
    const CACHE_READ_COST = 0.3 / 1_000_000;    // -90% for cache reads

    const regularTokens = totalInputTokens - cachedTokens - cacheWriteTokens;
    this.metrics.cost_breakdown.regular_input += regularTokens * REGULAR_INPUT_COST;
    this.metrics.cost_breakdown.cache_writes += cacheWriteTokens * CACHE_WRITE_COST;
    this.metrics.cost_breakdown.cache_reads += cachedTokens * CACHE_READ_COST;

    // Calculate savings
    const noCacheCost = totalInputTokens * REGULAR_INPUT_COST;
    const actualCost =
      this.metrics.cost_breakdown.regular_input +
      this.metrics.cost_breakdown.cache_writes +
      this.metrics.cost_breakdown.cache_reads;
    this.metrics.savings.vs_no_cache = noCacheCost - actualCost;

    // Update latency improvement
    this.metrics.latency_improvement.avg_response_time_ms = responseTimeMs;
    // Cached responses are ~2x faster
    const estimatedNoCacheTime = responseTimeMs * (1 + this.metrics.cache_hit_rate / 100);
    this.metrics.latency_improvement.speedup = estimatedNoCacheTime / responseTimeMs;
  }

  /**
   * Get current cache metrics
   */
  getMetrics(): CacheMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics (e.g., at start of new cycle)
   */
  resetMetrics(): void {
    this.metrics = this.initializeMetrics();
  }

  /**
   * Get all cache keys (for debugging)
   */
  getCacheKeys(): Map<string, { sha?: string; version?: string; cycleId?: number }> {
    return new Map(this.cacheKeys);
  }

  /**
   * Clear all cache keys
   */
  clearCacheKeys(): void {
    this.cacheKeys.clear();
  }

  /**
   * Add version prefix to content for cache invalidation
   */
  private addVersionPrefix(content: string, version: string = CacheManager.VERSION): string {
    return `[PRODREADY ${version}]\n${content}`;
  }

  /**
   * Add SHA prefix to file content for cache invalidation
   */
  private addSHAPrefix(content: string, filePath: string, sha: string): string {
    return `[FILE: ${filePath}]\n[SHA: ${sha}]\n\n${content}`;
  }

  /**
   * Add cycle prefix to artifact content
   */
  private addCyclePrefix(content: string, cycleId: number): string {
    return `[Cycle ${cycleId} Findings]\n\n${content}`;
  }

  /**
   * Initialize empty metrics
   */
  private initializeMetrics(): CacheMetrics {
    return {
      total_input_tokens: 0,
      cached_tokens: 0,
      cache_hit_rate: 0,
      cost_breakdown: {
        regular_input: 0,
        cache_writes: 0,
        cache_reads: 0
      },
      savings: {
        vs_no_cache: 0,
        cumulative_session: 0
      },
      latency_improvement: {
        avg_response_time_ms: 0,
        speedup: 1.0
      }
    };
  }

  /**
   * Calculate expected savings for a session
   */
  calculateExpectedSavings(totalCycles: number, avgInputTokensPerCycle: number): {
    without_caching: number;
    with_caching: number;
    savings_usd: number;
    savings_percent: number;
  } {
    const REGULAR_COST_PER_MTOK = 3.0;
    const CACHE_READ_COST_PER_MTOK = 0.3;
    const CACHE_WRITE_COST_PER_MTOK = 3.75;

    // Assume 60% of tokens are cacheable after first cycle
    const cacheableRatio = 0.6;
    const cacheableTokens = avgInputTokensPerCycle * cacheableRatio;
    const nonCacheableTokens = avgInputTokensPerCycle * (1 - cacheableRatio);

    // Without caching
    const withoutCaching = (totalCycles * avgInputTokensPerCycle * REGULAR_COST_PER_MTOK) / 1_000_000;

    // With caching (first cycle writes, rest read)
    const firstCycleCost = (nonCacheableTokens * REGULAR_COST_PER_MTOK + cacheableTokens * CACHE_WRITE_COST_PER_MTOK) / 1_000_000;
    const subsequentCycleCost = ((totalCycles - 1) * (nonCacheableTokens * REGULAR_COST_PER_MTOK + cacheableTokens * CACHE_READ_COST_PER_MTOK)) / 1_000_000;
    const withCaching = firstCycleCost + subsequentCycleCost;

    return {
      without_caching: withoutCaching,
      with_caching: withCaching,
      savings_usd: withoutCaching - withCaching,
      savings_percent: ((withoutCaching - withCaching) / withoutCaching) * 100
    };
  }
}
