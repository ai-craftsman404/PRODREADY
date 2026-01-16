/**
 * prodready init - Initialize .harden/ directory
 *
 * Creates:
 * - .harden/ directory structure
 * - state.yaml
 * - config.yaml
 * - Initial hardening branch
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import YAML from 'yaml';
import chalk from 'chalk';
import ora from 'ora';
import { execSync } from 'child_process';

interface InitOptions {
  targetBranch: string;
  branch: boolean;
}

export async function initCommand(options: InitOptions): Promise<void> {
  console.log(chalk.bold.blue('\n🚀 PRODREADY Initialization\n'));

  const cwd = process.cwd();
  const hardenDir = path.join(cwd, '.harden');

  try {
    // Step 1: Validate git repo
    const spinner = ora('Validating git repository...').start();
    await validateGitRepo(cwd);
    spinner.succeed('Git repository validated');

    // Step 2: Check if already initialized
    const exists = await fs.access(hardenDir).then(() => true).catch(() => false);
    if (exists) {
      spinner.fail(chalk.red('.harden/ directory already exists'));
      console.log(chalk.yellow('\nTo re-initialize, please remove .harden/ directory first'));
      process.exit(1);
    }

    // Step 3: Create .harden/ directory structure
    spinner.start('Creating .harden/ directory structure...');
    await createDirectoryStructure(hardenDir);
    spinner.succeed('.harden/ directory structure created');

    // Step 4: Initialize state.yaml
    spinner.start('Initializing state.yaml...');
    const targetBranch = options.targetBranch;
    await createStateFile(hardenDir, targetBranch);
    spinner.succeed('state.yaml initialized');

    // Step 5: Create config.yaml
    spinner.start('Creating config.yaml...');
    await createConfigFile(hardenDir);
    spinner.succeed('config.yaml created');

    // Step 6: Create hardening branch
    if (options.branch) {
      spinner.start('Creating hardening branch...');
      const branchName = await createHardeningBranch(targetBranch);
      spinner.succeed(`Hardening branch created: ${chalk.green(branchName)}`);
    } else {
      spinner.info('Skipped creating hardening branch (--no-branch)');
    }

    // Step 7: Create .hardenignore template
    spinner.start('Creating .hardenignore template...');
    await createHardenIgnoreFile(cwd);
    spinner.succeed('.hardenignore template created');

    // Success message
    console.log(chalk.bold.green('\n✅ PRODREADY initialized successfully!\n'));
    console.log(chalk.gray('Next steps:'));
    console.log(chalk.white('  1. Review and customize .harden/config.yaml'));
    console.log(chalk.white('  2. Run: ') + chalk.cyan('prodready cycle') + chalk.white(' to start hardening'));
    console.log(chalk.white('  3. Review artifacts: harden-report.html, harden-findings.sarif\n'));

  } catch (error) {
    console.error(chalk.red('\n❌ Initialization failed:'), error);
    process.exit(1);
  }
}

/**
 * Validate that current directory is a git repository
 */
async function validateGitRepo(cwd: string): Promise<void> {
  try {
    execSync('git rev-parse --git-dir', { cwd, stdio: 'ignore' });
  } catch {
    throw new Error('Not a git repository. Please run this command in a git repository.');
  }
}


/**
 * Create .harden/ directory structure
 */
async function createDirectoryStructure(hardenDir: string): Promise<void> {
  const dirs = [
    hardenDir,
    path.join(hardenDir, 'cycles'),
    path.join(hardenDir, 'plans'),
    path.join(hardenDir, 'approvals'),
    path.join(hardenDir, 'evidence'),
    path.join(hardenDir, 'telemetry')
  ];

  for (const dir of dirs) {
    await fs.mkdir(dir, { recursive: true });
  }
}

/**
 * Create initial state.yaml
 */
async function createStateFile(
  hardenDir: string,
  targetBranch: string
): Promise<void> {
  const state = {
    schema_version: 'v1',
    target_branch: targetBranch,
    hardening_branch: null, // Will be set after branch creation
    last_cycle_id: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    tooling: {
      prodready_version: '1.0.0',
      node_version: process.version
    },
    categories: {
      security: {
        status: 'not_started',
        cycles: [],
        tests_generated: 0,
        tests_passing: 0,
        findings_fixed: 0,
        findings_deferred: 0
      },
      unit: {
        status: 'not_started',
        cycles: []
      },
      integration: {
        status: 'not_started',
        cycles: []
      },
      e2e: {
        status: 'not_started',
        cycles: []
      },
      performance: {
        status: 'not_started',
        cycles: []
      },
      accessibility: {
        status: 'not_started',
        cycles: []
      }
    },
    overall_progress: {
      categories_complete: 0,
      categories_total: 6,
      categories_skipped: 0,
      total_tests_generated: 0,
      total_tests_passing: 0,
      critical_issues_remaining: 0,
      high_issues_remaining: 0
    }
  };

  const stateYaml = YAML.stringify(state);
  await fs.writeFile(path.join(hardenDir, 'state.yaml'), stateYaml, 'utf-8');
}

/**
 * Create default config.yaml
 */
async function createConfigFile(hardenDir: string): Promise<void> {
  const config = {
    model_strategy: {
      preset: 'balanced', // 'cost-optimized' | 'balanced' | 'quality-focused'
      overrides: {
        evaluator: 'opus-4.5',
        git: 'haiku-4'
      },
      max_cost_per_cycle: 3.0 // USD
    },
    caching_strategy: {
      enabled: true,
      cache_targets: {
        system_prompts: true,
        mcp_tools: true,
        codebase_files: false, // Post-MVP
        previous_artifacts: false, // Post-MVP
        security_knowledge: false // Post-MVP
      }
    },
    scope: {
      categories: {
        security: true,
        e2e_tests: true,
        smoke_tests: true,
        unit_tests: false, // Post-MVP
        integration_tests: false, // Post-MVP
        a11y: false,
        performance: false
      }
    },
    tools: {
      semgrep: {
        enabled: true,
        config: 'auto'
      },
      playwright: {
        enabled: true,
        browsers: ['chromium']
      },
      snyk: {
        enabled: false
      }
    },
    workflow: {
      auto_approve_low_risk: false,
      max_cycles_per_session: 10
    }
  };

  const configYaml = YAML.stringify(config);
  await fs.writeFile(path.join(hardenDir, 'config.yaml'), configYaml, 'utf-8');
}

/**
 * Create hardening branch
 */
async function createHardeningBranch(targetBranch: string): Promise<string> {
  const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const branchName = `harden/${timestamp}-001`;

  try {
    // Ensure we're on target branch
    execSync(`git checkout ${targetBranch}`, { stdio: 'ignore' });

    // Create and checkout hardening branch
    execSync(`git checkout -b ${branchName}`, { stdio: 'ignore' });

    // Update state.yaml with branch name
    const hardenDir = path.join(process.cwd(), '.harden');
    const stateFile = path.join(hardenDir, 'state.yaml');
    const stateContent = await fs.readFile(stateFile, 'utf-8');
    const state = YAML.parse(stateContent);
    state.hardening_branch = branchName;
    state.updated_at = new Date().toISOString();
    await fs.writeFile(stateFile, YAML.stringify(state), 'utf-8');

    return branchName;
  } catch (error) {
    throw new Error(`Failed to create hardening branch: ${error}`);
  }
}

/**
 * Create .hardenignore template
 */
async function createHardenIgnoreFile(cwd: string): Promise<void> {
  const template = `# .hardenignore - PRODREADY Suppression Rules
# Version: 1.0

version: "1.0"

# Ignore specific security findings
# ignore_findings:
#   - id: "SEC-042"
#     reason: "Known false positive - input sanitized upstream"
#     ignored_by: "user@example.com"
#     ignored_at: "2026-01-15"

# Ignore specific tests
# ignore_tests:
#   - test: "tests/e2e/flaky-test.spec.ts"
#     reason: "Known flaky - animation timing unreliable"
#     retest_after: "2026-02-01"

# Ignore file patterns (glob-based)
# ignore_patterns:
#   - path: "src/legacy/**/*"
#     reason: "Legacy code - rewrite planned"
#     categories: ["security", "tests"]

# Category-level disables
# disabled_categories:
#   - category: "accessibility"
#     reason: "Not in scope for MVP"
#     disabled_by: "product-owner"
`;

  await fs.writeFile(path.join(cwd, '.hardenignore'), template, 'utf-8');
}
