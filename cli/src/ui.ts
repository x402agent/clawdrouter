const useColor =
  process.stdout.isTTY === true &&
  process.env.NO_COLOR === undefined &&
  process.env.TERM !== "dumb";

function wrap(open: string, close: string, text: string): string {
  if (!useColor) return text;
  return `\x1b[${open}m${text}\x1b[${close}m`;
}

export const color = {
  bold: (t: string) => wrap("1", "22", t),
  dim: (t: string) => wrap("2", "22", t),
  red: (t: string) => wrap("31", "39", t),
  green: (t: string) => wrap("32", "39", t),
  yellow: (t: string) => wrap("33", "39", t),
  blue: (t: string) => wrap("34", "39", t),
  magenta: (t: string) => wrap("35", "39", t),
  cyan: (t: string) => wrap("36", "39", t),
};

export function info(message: string): void {
  console.log(`${color.cyan("▸")} ${message}`);
}

export function success(message: string): void {
  console.log(`${color.green("✓")} ${message}`);
}

export function warn(message: string): void {
  console.warn(`${color.yellow("⚠")} ${message}`);
}

export function err(message: string): void {
  console.error(`${color.red("✗")} ${message}`);
}

const BANNER_INNER_WIDTH = 52;

export function printBanner(version: string): void {
  const titleRaw = `  solana-clawd  v${version}`;
  const subtitleRaw = "  One-shot AI agent minting on Solana";

  const titleColored = color.bold("  solana-clawd  ") + color.dim(`v${version}`);
  const titlePadding = " ".repeat(Math.max(0, BANNER_INNER_WIDTH - titleRaw.length));
  const subtitleColored = color.dim(subtitleRaw);
  const subtitlePadding = " ".repeat(Math.max(0, BANNER_INNER_WIDTH - subtitleRaw.length));

  const bar = "═".repeat(BANNER_INNER_WIDTH);
  const lines = [
    "",
    color.magenta(`  ╔${bar}╗`),
    `${color.magenta("  ║")}${titleColored}${titlePadding}${color.magenta("║")}`,
    `${color.magenta("  ║")}${subtitleColored}${subtitlePadding}${color.magenta("║")}`,
    color.magenta(`  ╚${bar}╝`),
    "",
  ];
  console.log(lines.join("\n"));
}
