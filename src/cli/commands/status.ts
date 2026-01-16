/**
 * prodready status - Show current hardening status
 *
 * TODO: Implement status display from .harden/state.yaml
 */

import chalk from 'chalk';
import * as fs from 'fs/promises';
import * as path from 'path';
import YAML from 'yaml';
import ora from 'ora';

interface StatusOptions {
  verbose?: boolean;
  json?: boolean;
}

export async function statusCommand(options: StatusOptions): Promise<void> {
  const spinner = ora('Loading .harden/state.yaml...').start();

  try {
    const cwd = process.cwd();
    const stateFile = path.join(cwd, '.harden', 'state.yaml');

    // Check if .harden exists
    const exists = await fs.access(stateFile).then(() => true).catch(() => false);
    if (!exists) {
      spinner.fail(chalk.red('.harden/state.yaml not found'));
      console.log(chalk.yellow('\nRun "prodready init" first to initialize the repository'));
      process.exit(1);
    }

    // Load state
    const stateContent = await fs.readFile(stateFile, 'utf-8');
    const state = YAML.parse(stateContent);

    spinner.succeed('State loaded');

    if (options.json) {
      // JSON output
      console.log(JSON.stringify(state, null, 2));
    } else {
      // Human-readable output
      console.log(chalk.bold.blue('\n📊 PRODREADY Status\n'));

      console.log(chalk.white('Repository:'));
      console.log(chalk.gray(`  Target branch: ${state.target_branch}`));
      console.log(chalk.gray(`  Hardening branch: ${state.hardening_branch || 'N/A'}`));
      console.log(chalk.gray(`  Last cycle: ${state.last_cycle_id}`));

      console.log(chalk.white('\nCategories:'));
      Object.entries(state.categories).forEach(([name, cat]: [string, any]) => {
        const emoji = cat.status === 'complete' ? '✅' : cat.status === 'in_progress' ? '🔄' : '⏸️';
        console.log(chalk.gray(`  ${emoji} ${name}: ${cat.status}`));
        if (options.verbose && cat.cycles?.length > 0) {
          console.log(chalk.gray(`     Cycles: ${cat.cycles.join(', ')}`));
        }
      });

      console.log(chalk.white('\nOverall Progress:'));
      const progress = state.overall_progress;
      console.log(chalk.gray(`  Categories complete: ${progress.categories_complete}/${progress.categories_total}`));
      console.log(chalk.gray(`  Tests generated: ${progress.total_tests_generated}`));
      console.log(chalk.gray(`  Tests passing: ${progress.total_tests_passing}`));
      console.log(chalk.gray(`  Critical issues: ${progress.critical_issues_remaining}`));
      console.log(chalk.gray(`  High issues: ${progress.high_issues_remaining}`));

      console.log(chalk.white('\nTooling:'));
      console.log(chalk.gray(`  PRODREADY version: ${state.tooling.prodready_version}`));
      console.log(chalk.gray(`  Node version: ${state.tooling.node_version}`));

      console.log('');
    }

  } catch (error) {
    spinner.fail(chalk.red('Failed to load status'));
    console.error(error);
    process.exit(1);
  }
}
