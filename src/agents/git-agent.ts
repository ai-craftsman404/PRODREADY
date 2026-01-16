/**
 * GitAgent: Git operations with deterministic Haiku routing
 *
 * Always uses Claude Haiku 4 for all operations (85% cost savings)
 * Handles:
 * - Branch creation/switching
 * - Diff analysis
 * - Commit operations
 * - SHA retrieval for cache invalidation
 */

import { BaseAgent } from './base-agent.js';
import { AgentConfig } from './base-agent.js';
import { execSync } from 'child_process';

export interface GitDiffSummary {
  files_changed: number;
  insertions: number;
  deletions: number;
  changed_files: string[];
}

export interface GitBranchInfo {
  current: string;
  all: string[];
}

export class GitAgent extends BaseAgent {
  constructor(config: AgentConfig) {
    super('git', config);
    this.initialize();
  }

  protected initialize(): void {
    // Git operations are deterministic, always use Haiku
    this.setSystemPrompt(`
You are a Git operations specialist for PRODREADY hardening cycles.

Your role:
- Create and manage git branches for hardening workflows
- Analyze diffs to identify changed files
- Extract git metadata (SHAs, commit messages, etc.)
- Perform deterministic git operations

All operations should be precise and deterministic. Never perform destructive operations without explicit user approval.
    `.trim());

    // Git agent doesn't use MCP tools in MVP
    this.setMCPToolDefinitions('');
  }

  /**
   * Create a hardening branch from base branch
   */
  async createHardeningBranch(baseBranch: string = 'main'): Promise<string> {
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const branchName = `harden/${timestamp}-001`;

    try {
      // Ensure we're on base branch
      this.executeGitCommand(`git checkout ${baseBranch}`);

      // Create and checkout hardening branch
      this.executeGitCommand(`git checkout -b ${branchName}`);

      return branchName;
    } catch (error) {
      throw new Error(`Failed to create hardening branch: ${error}`);
    }
  }

  /**
   * Get diff summary between two commits
   */
  async getDiffSummary(fromCommit: string, toCommit: string = 'HEAD'): Promise<GitDiffSummary> {
    try {
      // Get diff stats
      const diffStats = this.executeGitCommand(`git diff --shortstat ${fromCommit}..${toCommit}`);
      const match = diffStats.match(/(\d+) files? changed(?:, (\d+) insertions?\(\+\))?(?:, (\d+) deletions?\(-\))?/);

      const filesChanged = match ? parseInt(match[1], 10) : 0;
      const insertions = match && match[2] ? parseInt(match[2], 10) : 0;
      const deletions = match && match[3] ? parseInt(match[3], 10) : 0;

      // Get list of changed files
      const changedFilesOutput = this.executeGitCommand(`git diff --name-only ${fromCommit}..${toCommit}`);
      const changedFiles = changedFilesOutput
        .split('\n')
        .filter(line => line.trim().length > 0);

      return {
        files_changed: filesChanged,
        insertions,
        deletions,
        changed_files: changedFiles
      };
    } catch (error) {
      throw new Error(`Failed to get diff summary: ${error}`);
    }
  }

  /**
   * Get current commit SHA
   */
  async getCurrentCommitSHA(): Promise<string> {
    try {
      return this.executeGitCommand('git rev-parse HEAD').trim();
    } catch (error) {
      throw new Error(`Failed to get current commit SHA: ${error}`);
    }
  }

  /**
   * Get SHA for a specific file
   */
  async getFileSHA(filePath: string): Promise<string> {
    try {
      return this.executeGitCommand(`git hash-object ${filePath}`).trim();
    } catch (error) {
      throw new Error(`Failed to get file SHA for ${filePath}: ${error}`);
    }
  }

  /**
   * Get current branch name
   */
  async getCurrentBranch(): Promise<string> {
    try {
      return this.executeGitCommand('git branch --show-current').trim();
    } catch (error) {
      throw new Error(`Failed to get current branch: ${error}`);
    }
  }

  /**
   * Get all branches
   */
  async getAllBranches(): Promise<GitBranchInfo> {
    try {
      const current = await this.getCurrentBranch();
      const allBranches = this.executeGitCommand('git branch --list')
        .split('\n')
        .map(line => line.replace('*', '').trim())
        .filter(line => line.length > 0);

      return {
        current,
        all: allBranches
      };
    } catch (error) {
      throw new Error(`Failed to get branches: ${error}`);
    }
  }

  /**
   * Switch to a branch
   */
  async switchBranch(branchName: string): Promise<void> {
    try {
      this.executeGitCommand(`git checkout ${branchName}`);
    } catch (error) {
      throw new Error(`Failed to switch to branch ${branchName}: ${error}`);
    }
  }

  /**
   * Create a commit
   */
  async createCommit(message: string, files?: string[]): Promise<string> {
    try {
      // Add files if specified, otherwise add all
      if (files && files.length > 0) {
        this.executeGitCommand(`git add ${files.join(' ')}`);
      } else {
        this.executeGitCommand('git add .');
      }

      // Create commit
      this.executeGitCommand(`git commit -m "${message}"`);

      // Return new commit SHA
      return await this.getCurrentCommitSHA();
    } catch (error) {
      throw new Error(`Failed to create commit: ${error}`);
    }
  }

  /**
   * Get file content at specific commit
   */
  async getFileAtCommit(filePath: string, commit: string): Promise<string> {
    try {
      return this.executeGitCommand(`git show ${commit}:${filePath}`);
    } catch (error) {
      throw new Error(`Failed to get file ${filePath} at commit ${commit}: ${error}`);
    }
  }

  /**
   * Check if working directory is clean
   */
  async isWorkingDirectoryClean(): Promise<boolean> {
    try {
      const status = this.executeGitCommand('git status --porcelain');
      return status.trim().length === 0;
    } catch (error) {
      throw new Error(`Failed to check working directory status: ${error}`);
    }
  }

  /**
   * Get list of untracked files
   */
  async getUntrackedFiles(): Promise<string[]> {
    try {
      const output = this.executeGitCommand('git ls-files --others --exclude-standard');
      return output
        .split('\n')
        .filter(line => line.trim().length > 0);
    } catch (error) {
      throw new Error(`Failed to get untracked files: ${error}`);
    }
  }

  /**
   * Get list of modified files
   */
  async getModifiedFiles(): Promise<string[]> {
    try {
      const output = this.executeGitCommand('git diff --name-only');
      return output
        .split('\n')
        .filter(line => line.trim().length > 0);
    } catch (error) {
      throw new Error(`Failed to get modified files: ${error}`);
    }
  }

  /**
   * Execute git command synchronously
   * Note: Using execSync for simplicity in MVP. Post-MVP can migrate to async.
   */
  private executeGitCommand(command: string): string {
    try {
      return execSync(command, {
        cwd: process.cwd(),
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe']
      });
    } catch (error: any) {
      // Rethrow with more context
      throw new Error(`Git command failed: ${command}\n${error.stderr || error.message}`);
    }
  }

  /**
   * Validate that current directory is a git repository
   */
  async validateGitRepo(): Promise<boolean> {
    try {
      this.executeGitCommand('git rev-parse --git-dir');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get repository root directory
   */
  async getRepoRoot(): Promise<string> {
    try {
      return this.executeGitCommand('git rev-parse --show-toplevel').trim();
    } catch (error) {
      throw new Error(`Failed to get repository root: ${error}`);
    }
  }

  /**
   * Get commit message for a SHA
   */
  async getCommitMessage(sha: string): Promise<string> {
    try {
      return this.executeGitCommand(`git log -1 --pretty=%B ${sha}`).trim();
    } catch (error) {
      throw new Error(`Failed to get commit message for ${sha}: ${error}`);
    }
  }

  /**
   * Get file SHAs for multiple files (for cache invalidation)
   */
  async getFileSHAs(filePaths: string[]): Promise<Map<string, string>> {
    const shas = new Map<string, string>();

    for (const filePath of filePaths) {
      try {
        const sha = await this.getFileSHA(filePath);
        shas.set(filePath, sha);
      } catch (error) {
        // File might not exist or be untracked, skip it
        console.warn(`Warning: Could not get SHA for ${filePath}`);
      }
    }

    return shas;
  }
}
