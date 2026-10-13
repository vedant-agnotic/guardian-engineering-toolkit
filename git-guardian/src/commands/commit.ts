import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { loadConfig } from '../config/load.js';
import { splitCsv } from '../config/validate.js';
import { currentBranch, getRepoRoot } from '../core/git.js';
import { run } from '../core/exec.js';
import { out, ui } from '../core/log.js';
import { extractParts, resolveType } from '../validation/parts.js';
import { compileCommitFormat, validateCommitMessage } from '../validation/commit.js';
import { fillFormat } from '../validation/template.js';

/**
 * Interactive commit helper: prompts for type, ticket/number, scope and description,
 * auto-detecting known values from the current branch name, validates, and runs git commit.
 */
export async function guidedCommitCommand(extraArgs: string[] = []): Promise<void> {
  const repoRoot = getRepoRoot();
  const config = loadConfig(repoRoot);
  const compiled = compileCommitFormat(config.commit);
  const types = splitCsv(config.commit.types);
  const branch = currentBranch(repoRoot) ?? '';

  // Extract any ticket/number or leading type from the current branch
  const branchParts = extractParts(branch, compiled);
  let branchType: string | null = null;
  const leading = /^([A-Za-z]+)[/:\s_-]/.exec(branch.trim());
  if (leading) {
    branchType = resolveType(leading[1], types);
  }

  if (!input.isTTY) {
    throw new Error('git-guardian commit needs an interactive terminal. Use "git commit -m <msg>" in non-interactive environments.');
  }

  // Check if anything is staged or if flags like -a are passed
  const hasStaged = run('git', ['diff', '--cached', '--quiet'], { cwd: repoRoot }).status !== 0;
  const isAll = extraArgs.includes('-a') || extraArgs.includes('--all');
  if (!hasStaged && !isAll && !extraArgs.includes('--amend')) {
    ui.warn('No staged changes found. Stage changes with "git add" first, or pass -a.');
  }

  const rl = createInterface({ input, output });
  const values: Record<string, string> = {};
  let body = '';

  try {
    ui.title('Guided commit');
    if (branch) console.log(`Branch: ${out.cyan(branch)}`);
    console.log(`Format: ${out.placeholders(config.commit.format)}\n`);

    for (const name of compiled.placeholders) {
      if (name === 'type') {
        const defaultType = branchType ?? types[0];
        const answer = (
          await rl.question(
            `${out.bold(out.cyan('Type'))} ${out.dim(`(${types.join(', ')}; Enter for ${defaultType})`)}\n${out.cyan('> ')}`,
          )
        ).trim();
        const selected = types[Number(answer) - 1] ?? resolveType(answer, types) ?? (answer || defaultType);
        values.type = selected;
        continue;
      }

      if (name === 'ticket') {
        const defaultTicket = branchParts.ticket ?? '';
        const promptText = defaultTicket ? `Enter for ${defaultTicket}` : 'e.g. ABC-123';
        const answer = (
          await rl.question(
            `${out.bold(out.cyan('Ticket'))} ${out.dim(`(${promptText})`)}\n${out.cyan('> ')}`,
          )
        ).trim();
        const ticketVal = answer ? answer.toUpperCase() : defaultTicket;
        if (!ticketVal && !isOptional(config.commit.format, 'ticket')) {
          throw new Error(`Ticket is required by format ${config.commit.format}.`);
        }
        if (ticketVal) values.ticket = ticketVal;
        continue;
      }

      if (name === 'number') {
        const defaultNumber = branchParts.number ?? '';
        const promptText = defaultNumber ? `Enter for ${defaultNumber}` : 'e.g. 123';
        const answer = (
          await rl.question(
            `${out.bold(out.cyan('Number'))} ${out.dim(`(${promptText})`)}\n${out.cyan('> ')}`,
          )
        ).trim();
        const numVal = answer || defaultNumber;
        if (!numVal && !isOptional(config.commit.format, 'number')) {
          throw new Error(`Number is required by format ${config.commit.format}.`);
        }
        if (numVal) values.number = numVal;
        continue;
      }

      if (name === 'scope') {
        const answer = (
          await rl.question(
            `${out.bold(out.cyan('Scope'))} ${out.dim('(optional area of code, e.g. auth; Enter to skip)')}\n${out.cyan('> ')}`,
          )
        ).trim();
        if (answer) values.scope = answer.toLowerCase();
        continue;
      }

      if (name === 'description') {
        const answer = (
          await rl.question(
            `${out.bold(out.cyan('Description'))} ${out.dim('(short summary of what changed)')}\n${out.cyan('> ')}`,
          )
        ).trim();
        if (!answer) throw new Error('Description is required.');
        values.description = answer.charAt(0).toLowerCase() + answer.slice(1);
        continue;
      }
    }

    const bodyAnswer = (
      await rl.question(
        `\n${out.bold(out.cyan('Longer commit body / details?'))} ${out.dim('(optional; Enter to skip)')}\n${out.cyan('> ')}`,
      )
    ).trim();
    if (bodyAnswer) body = bodyAnswer;
  } finally {
    rl.close();
  }

  const subject = fillFormat(compiled, values);
  const fullMessage = body ? `${subject}\n\n${body}` : subject;

  // Validate the generated message
  const validation = validateCommitMessage(fullMessage, config.commit);
  if (!validation.valid) {
    throw new Error(`Generated commit message is invalid:\n${validation.reason}`);
  }

  ui.info(`Message: ${out.green(subject)}`);
  console.log('');

  // Run native git commit
  const commitArgs = ['commit', '-m', fullMessage, ...extraArgs];
  const execution = run('git', commitArgs, { cwd: repoRoot, stdio: 'inherit' });
  if (execution.status !== 0) {
    throw new Error('git commit failed.');
  }
  ui.success('Commit recorded successfully.');
}

function isOptional(format: string, placeholder: string): boolean {
  const outside = format.replace(/\[[^\]]*\]/g, '');
  return !outside.includes(`<${placeholder}>`);
}
