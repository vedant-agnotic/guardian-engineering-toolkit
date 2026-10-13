import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { loadConfig } from '../config/load.js';
import { splitCsv } from '../config/validate.js';
import { getRepoRoot } from '../core/git.js';
import { out, ui } from '../core/log.js';
import { compileBranchFormat, slugify } from '../validation/branch.js';
import { fillFormat } from '../validation/template.js';
import { createBranchCommand } from './branch.js';

const HINTS: Record<string, string> = {
  number: 'digits, e.g. 123',
  ticket: 'ticket key, e.g. ABC-123',
  scope: 'area of the code, e.g. auth',
  description: 'what the branch is for, e.g. "add login page"',
};

/**
 * `branch create` without a name: asks for each part of the configured format,
 * builds the name, validates it, and only then creates and switches to it.
 */
export async function guidedBranchCommand(from?: string): Promise<void> {
  if (!input.isTTY) throw new Error('Usage: git-guardian branch create <name> [--from <start-point>] (a name is required without a terminal)');
  const config = loadConfig(getRepoRoot());
  const compiled = compileBranchFormat(config.branch);
  const types = splitCsv(config.branch.types);
  const rl = createInterface({ input, output });
  const values: Record<string, string> = {};
  try {
    ui.title('New branch');
    console.log(`Format: ${out.placeholders(config.branch.format)}\n`);
    for (const name of compiled.placeholders) {
      const optional = isOptional(config.branch.format, name);
      if (name === 'type') {
        const answer = (await rl.question(`${out.bold(out.cyan('Type'))} ${out.dim(`(${types.join(', ')}; Enter for ${types[0]})`)}\n${out.cyan('>')} `)).trim();
        values.type = types[Number(answer) - 1] ?? (answer || types[0]);
        continue;
      }
      const label = name === 'description' ? 'Description' : name[0].toUpperCase() + name.slice(1);
      const answer = (await rl.question(`${out.bold(out.cyan(label))} ${out.dim(`(${HINTS[name] ?? name}${optional ? ', optional: Enter to skip' : ''})`)}\n${out.cyan('>')} `)).trim();
      if (!answer && !optional) throw new Error(`${label} is required by the format ${config.branch.format}.`);
      if (answer) values[name] = name === 'description' ? slugify(answer) : name === 'ticket' ? answer.toUpperCase() : answer;
    }
  } finally {
    rl.close();
  }
  const name = fillFormat(compiled, values);
  ui.info(`Branch name: ${out.green(name)}`);
  createBranchCommand(name, from); // validates before creating
}

/** True when the placeholder only appears inside [ ... ] in the format. */
function isOptional(format: string, placeholder: string): boolean {
  const outside = format.replace(/\[[^\]]*\]/g, '');
  return !outside.includes(`<${placeholder}>`);
}
