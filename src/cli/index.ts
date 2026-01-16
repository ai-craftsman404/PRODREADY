#!/usr/bin/env node

/**
 * PRODREADY CLI - Main entry point
 *
 * Commands:
 * - prodready init: Initialize .harden/ directory in target repo
 * - prodready cycle: Run one hardening cycle
 * - prodready session: Run multiple cycles interactively
 * - prodready status: Show current hardening status
 */

import { Command } from 'commander';
import { initCommand } from './commands/init.js';
import { cycleCommand } from './commands/cycle.js';
import { sessionCommand } from './commands/session.js';
import { statusCommand } from './commands/status.js';

const program = new Command();

program
  .name('prodready')
  .description('AI-powered SDLC hardening CLI tool for Next.js/React applications')
  .version('1.0.0');

// prodready init
program
  .command('init')
  .description('Initialize .harden/ directory and create hardening branch')
  .option('--target-branch <branch>', 'Target branch to harden', 'main')
  .option('--no-branch', 'Skip creating hardening branch')
  .action(initCommand);

// prodready cycle
program
  .command('cycle')
  .description('Run one hardening cycle')
  .option('--category <category>', 'Specific category to run (security, unit, e2e, etc.)')
  .option('--auto', 'Auto-suggest next category based on state')
  .option('--all', 'Run all categories in sequence')
  .action(cycleCommand);

// prodready session
program
  .command('session')
  .description('Run multiple hardening cycles interactively')
  .option('--max-cycles <number>', 'Maximum number of cycles', '10')
  .option('--auto-continue', 'Continue without prompting between cycles')
  .action(sessionCommand);

// prodready status
program
  .command('status')
  .description('Show current hardening status')
  .option('--verbose', 'Show detailed status including all findings')
  .option('--json', 'Output status as JSON')
  .action(statusCommand);

// Parse arguments
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
