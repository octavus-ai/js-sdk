/* eslint-disable no-console */
/**
 * Terminal output utilities with colors and formatting.
 * Console statements are intentional for CLI output.
 */

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  bold: '\x1b[1m',
};

export function success(message: string): void {
  console.log(`${colors.green}✓${colors.reset} ${message}`);
}

export function error(message: string): void {
  console.error(`${colors.red}✗${colors.reset} ${message}`);
}

export function warning(message: string): void {
  console.log(`${colors.yellow}⚠${colors.reset} ${message}`);
}

export function info(message: string): void {
  console.log(`${colors.blue}ℹ${colors.reset} ${message}`);
}

export function dim(message: string): void {
  console.log(`${colors.gray}${message}${colors.reset}`);
}

export function bold(text: string): string {
  return `${colors.bold}${text}${colors.reset}`;
}

export function cyan(text: string): string {
  return `${colors.cyan}${text}${colors.reset}`;
}

export function green(text: string): string {
  return `${colors.green}${text}${colors.reset}`;
}

export function yellow(text: string): string {
  return `${colors.yellow}${text}${colors.reset}`;
}

export function red(text: string): string {
  return `${colors.red}${text}${colors.reset}`;
}

export function gray(text: string): string {
  return `${colors.gray}${text}${colors.reset}`;
}

/**
 * Print a key-value pair with formatting
 */
export function keyValue(key: string, value: string): void {
  console.log(`  ${colors.gray}${key}:${colors.reset} ${value}`);
}

/**
 * Print a table row
 */
export function tableRow(columns: string[], widths: number[]): void {
  const formatted = columns.map((col, i) => col.padEnd(widths[i] ?? 20)).join('  ');
  console.log(formatted);
}

/**
 * Print a separator line
 */
export function separator(): void {
  console.log();
}

/**
 * JSON output mode for CI/CD
 */
export function json(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}
