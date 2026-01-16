/**
 * PRODREADY - Main exports
 *
 * This file exports all core classes and types for programmatic use
 */

// Core
export { ModelRouter, ModelTier, type AgentType, type TaskType, type ModelConfig } from './core/model-router.js';
export { CacheManager, type CacheStrategy, type CacheMetrics } from './core/cache-manager.js';

// Agents
export { BaseAgent, type AgentConfig } from './agents/base-agent.js';
export { GitAgent } from './agents/git-agent.js';

// Version
export const VERSION = '1.0.0';
