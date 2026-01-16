/**
 * BaseAgent: Abstract base class for all PRODREADY agents
 *
 * Integrates:
 * - Anthropic API (@anthropic-ai/sdk)
 * - ModelRouter (multi-model selection)
 * - CacheManager (prompt caching)
 *
 * All agents extend this class and implement agent-specific logic.
 */

import Anthropic from '@anthropic-ai/sdk';
import { ModelRouter, AgentType, TaskType, TaskComplexity, ModelTier } from '../core/model-router.js';
import { CacheManager, CacheableContent } from '../core/cache-manager.js';

export interface AgentConfig {
  anthropicApiKey?: string;
  modelRouter: ModelRouter;
  cacheManager: CacheManager;
}

export interface AgentInvocationContext {
  cycleId?: number;
  previousCycleSHA?: string;
  fileSHAs?: Map<string, string>;
}

export interface AgentResponse<T = unknown> {
  content: T;
  usage: {
    input_tokens: number;
    output_tokens: number;
    cache_creation_input_tokens?: number;
    cache_read_input_tokens?: number;
  };
  model: string;
  duration_ms: number;
}

export abstract class BaseAgent {
  protected anthropic: Anthropic;
  protected modelRouter: ModelRouter;
  protected cacheManager: CacheManager;
  protected agentType: AgentType;
  protected systemPrompt: string;
  protected mcpToolDefinitions: string;

  constructor(agentType: AgentType, config: AgentConfig) {
    this.agentType = agentType;
    this.modelRouter = config.modelRouter;
    this.cacheManager = config.cacheManager;

    // Initialize Anthropic client
    const apiKey = config.anthropicApiKey || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY is required');
    }
    this.anthropic = new Anthropic({ apiKey });

    // Subclasses must set these
    this.systemPrompt = '';
    this.mcpToolDefinitions = '';
  }

  /**
   * Execute a task with optimal model selection and caching
   */
  protected async executeWithModel<T>(
    task: TaskType,
    complexity: TaskComplexity,
    userMessage: string,
    _context?: AgentInvocationContext
  ): Promise<AgentResponse<T>> {
    const startTime = Date.now();

    // Select optimal model
    const modelConfig = this.modelRouter.selectModel(this.agentType, task, complexity);

    // Build system messages with caching
    const systemMessages = this.buildSystemMessages();

    // Make API call
    try {
      const response = await this.anthropic.messages.create({
        model: modelConfig.model,
        max_tokens: 4096,
        temperature: modelConfig.temperature,
        system: systemMessages,
        messages: [
          {
            role: 'user',
            content: userMessage
          }
        ]
      });

      const duration = Date.now() - startTime;

      // Log model usage
      this.modelRouter.logUsage({
        agent: this.agentType,
        task,
        model: modelConfig.model,
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens,
        cost_usd: this.modelRouter.calculateCost(
          modelConfig.model,
          response.usage.input_tokens,
          response.usage.output_tokens
        ),
        duration_ms: duration
      });

      // Record cache usage if available
      const usage: any = response.usage; // Type assertion for cache fields
      if (usage.cache_creation_input_tokens || usage.cache_read_input_tokens) {
        this.cacheManager.recordCacheUsage(
          response.usage.input_tokens,
          usage.cache_read_input_tokens || 0,
          usage.cache_creation_input_tokens || 0,
          duration
        );
      }

      // Extract content
      const content = this.extractContent<T>(response);

      return {
        content,
        usage: response.usage,
        model: response.model,
        duration_ms: duration
      };
    } catch (error) {
      // Handle API errors
      if (error instanceof Anthropic.APIError) {
        throw new Error(
          `Anthropic API error (${error.status}): ${error.message}`
        );
      }
      throw error;
    }
  }

  /**
   * Build system messages with caching support
   */
  protected buildSystemMessages(): CacheableContent[] {
    const messages: CacheableContent[] = [];

    // Add system prompt (cached)
    if (this.systemPrompt) {
      messages.push(
        this.cacheManager.createCachedSystemPrompt(this.agentType, this.systemPrompt)
      );
    }

    // Add MCP tool definitions (cached)
    if (this.mcpToolDefinitions) {
      messages.push(
        this.cacheManager.createCachedMCPTools(this.mcpToolDefinitions)
      );
    }

    return messages;
  }

  /**
   * Extract content from API response
   */
  protected extractContent<T>(response: Anthropic.Message): T {
    // Handle text content blocks
    const textBlocks = response.content.filter(
      (block): block is Anthropic.TextBlock => block.type === 'text'
    );

    if (textBlocks.length === 0) {
      throw new Error('No text content in response');
    }

    // For now, concatenate all text blocks
    const text = textBlocks.map(block => block.text).join('\n');

    // Attempt to parse as JSON if it looks like JSON
    if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
      try {
        return JSON.parse(text) as T;
      } catch {
        // Not valid JSON, return as string
        return text as T;
      }
    }

    return text as T;
  }

  /**
   * Simple invoke method for basic usage
   */
  async invoke(userMessage: string, context?: AgentInvocationContext): Promise<string> {
    const response = await this.executeWithModel<string>(
      'default',
      {
        reasoning_depth: 'medium',
        code_generation: false,
        validation_stakes: 'medium',
        deterministic: false
      },
      userMessage,
      context
    );

    return response.content;
  }

  /**
   * Get agent type
   */
  getAgentType(): AgentType {
    return this.agentType;
  }

  /**
   * Get current model configuration
   */
  getCurrentModel(): ModelTier {
    const config = this.modelRouter.selectModel(this.agentType);
    return config.model;
  }

  /**
   * Set system prompt (called by subclasses)
   */
  protected setSystemPrompt(prompt: string): void {
    this.systemPrompt = prompt;
  }

  /**
   * Set MCP tool definitions (called by subclasses)
   */
  protected setMCPToolDefinitions(definitions: string): void {
    this.mcpToolDefinitions = definitions;
  }

  /**
   * Abstract method for agent-specific initialization
   * Subclasses must implement this to set system prompts and tools
   */
  protected abstract initialize(): void;
}
