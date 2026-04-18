export interface ParsedArgs {
  positional: string[];
  flags: Record<string, string | true>;
  repeated: Record<string, string[]>;
}

const ALIASES: Record<string, string> = {
  h: "help",
  v: "version",
  n: "name",
  d: "description",
  u: "agent-uri",
};

const REPEATABLE = new Set(["service", "trust", "registration"]);

const BOOL_FLAGS = new Set(["help", "version", "json", "keep-local"]);

export function parseArgs(argv: string[]): ParsedArgs {
  const positional: string[] = [];
  const flags: Record<string, string | true> = {};
  const repeated: Record<string, string[]> = {};

  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token === undefined) continue;

    if (token === "--") {
      positional.push(...argv.slice(i + 1));
      break;
    }

    if (token.startsWith("--")) {
      const eqIdx = token.indexOf("=");
      let key: string;
      let value: string | undefined;
      if (eqIdx >= 0) {
        key = token.slice(2, eqIdx);
        value = token.slice(eqIdx + 1);
      } else {
        key = token.slice(2);
        value = undefined;
      }
      assignFlag(flags, repeated, key, value, argv, i, (consumed) => {
        i += consumed;
      });
    } else if (token.startsWith("-") && token.length > 1) {
      const short = token.slice(1);
      const key = ALIASES[short] ?? short;
      assignFlag(flags, repeated, key, undefined, argv, i, (consumed) => {
        i += consumed;
      });
    } else {
      positional.push(token);
    }
  }

  return { positional, flags, repeated };
}

function assignFlag(
  flags: Record<string, string | true>,
  repeated: Record<string, string[]>,
  key: string,
  inlineValue: string | undefined,
  argv: string[],
  index: number,
  advance: (consumed: number) => void
): void {
  if (BOOL_FLAGS.has(key)) {
    flags[key] = true;
    return;
  }

  let value = inlineValue;
  if (value === undefined) {
    const next = argv[index + 1];
    if (next === undefined || next.startsWith("-")) {
      flags[key] = true;
      return;
    }
    value = next;
    advance(1);
  }

  if (REPEATABLE.has(key)) {
    (repeated[key] ??= []).push(value);
  } else {
    flags[key] = value;
  }
}

export function stringFlag(args: ParsedArgs, key: string): string | undefined {
  const value = args.flags[key];
  return typeof value === "string" ? value : undefined;
}

export function boolFlag(args: ParsedArgs, key: string): boolean {
  return args.flags[key] === true;
}

export function repeatedFlag(args: ParsedArgs, key: string): string[] {
  return args.repeated[key] ?? [];
}
