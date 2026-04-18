#!/usr/bin/env node
import { boolFlag, parseArgs, repeatedFlag, stringFlag } from "./args.js";
import { runLogout } from "./commands/logout.js";
import { parseService, runMint } from "./commands/mint.js";
import { runPair } from "./commands/pair.js";
import { runStatus } from "./commands/status.js";
import { color, err, printBanner, warn } from "./ui.js";

const VERSION = "0.1.0";

async function main(argv: string[]): Promise<number> {
  const args = parseArgs(argv);

  if (boolFlag(args, "version")) {
    console.log(VERSION);
    return 0;
  }

  const command = args.positional[0];

  if (!command || boolFlag(args, "help")) {
    printHelp(command);
    return command ? 0 : 0;
  }

  switch (command) {
    case "pair": {
      const code = args.positional[1];
      if (!code) {
        err("Missing pair code. Usage: solana-clawd pair <CODE>");
        return 2;
      }
      return runPair({
        code,
        baseUrl: stringFlag(args, "base-url"),
        label: stringFlag(args, "label"),
      });
    }

    case "mint": {
      const services = repeatedFlag(args, "service")
        .map(parseService)
        .filter((s): s is { name: string; endpoint: string } => s !== null);
      const serviceRejects = repeatedFlag(args, "service").length - services.length;
      if (serviceRejects > 0) {
        warn(`Ignored ${serviceRejects} malformed --service value(s). Expected name=endpoint.`);
      }
      return runMint({
        name: stringFlag(args, "name"),
        description: stringFlag(args, "description"),
        agentUri: stringFlag(args, "agent-uri"),
        services: services.length > 0 ? services : undefined,
        trust: repeatedFlag(args, "trust"),
        baseUrl: stringFlag(args, "base-url"),
        json: boolFlag(args, "json"),
      });
    }

    case "status": {
      return runStatus({
        baseUrl: stringFlag(args, "base-url"),
        json: boolFlag(args, "json"),
      });
    }

    case "logout": {
      return runLogout({
        baseUrl: stringFlag(args, "base-url"),
        keepLocal: boolFlag(args, "keep-local"),
      });
    }

    case "birth": {
      warn("`birth` (Blockchain Buddy hatch) is not yet available on this CLI.");
      console.log(`  Follow the flow in the web terminal for now.`);
      return 64;
    }

    default:
      err(`Unknown command: ${command}`);
      printHelp();
      return 64;
  }
}

function printHelp(command?: string): void {
  printBanner(VERSION);

  if (command === "pair") {
    console.log(color.bold("solana-clawd pair <CODE>"));
    console.log("  Redeem a 6-character pair code from the terminal UI.");
    console.log("");
    console.log(color.bold("Flags"));
    console.log("  --label <text>      Friendly device label (default: hostname)");
    console.log("  --base-url <url>    Override server (default: https://solanaclawd.com)");
    return;
  }

  if (command === "mint") {
    console.log(color.bold("solana-clawd mint --name <name> [options]"));
    console.log("  Mint a Metaplex Core agent NFT using your paired wallet.");
    console.log("");
    console.log(color.bold("Required"));
    console.log("  -n, --name <text>         Agent name (3–64 chars)");
    console.log("");
    console.log(color.bold("Optional"));
    console.log("  -d, --description <text>  Agent description (≤ 2000 chars)");
    console.log("  -u, --agent-uri <url>     Pre-pinned metadata URI (IPFS/HTTPS)");
    console.log("  --service name=url        Service endpoint (repeatable)");
    console.log("  --trust <type>            Trust model (repeatable)");
    console.log("  --json                    Emit machine-readable JSON result");
    console.log("  --base-url <url>          Override server");
    return;
  }

  console.log(color.bold("Usage"));
  console.log("  solana-clawd <command> [options]");
  console.log("");
  console.log(color.bold("Commands"));
  console.log("  pair <CODE>     Pair with a wallet via code from the terminal UI");
  console.log("  mint            Mint an agent NFT with the paired session");
  console.log("  status          Show the current pairing status");
  console.log("  logout          Revoke the server session and clear local state");
  console.log("  birth           (coming soon) Hatch a Blockchain Buddy");
  console.log("");
  console.log(color.bold("Global flags"));
  console.log("  -h, --help            Show help (or `solana-clawd <cmd> --help`)");
  console.log("  -v, --version         Print version");
  console.log("");
  console.log(color.bold("Environment"));
  console.log("  SOLANA_CLAWD_BASE_URL  Override the API base URL");
  console.log("");
  console.log(color.bold("Quick start"));
  console.log("  1. Visit https://solanaclawd.com, connect your wallet, click Generate code");
  console.log("  2. solana-clawd pair ABC123");
  console.log("  3. solana-clawd mint --name \"DeFi Scanner\" --description \"…\"");
}

main(process.argv.slice(2))
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error) => {
    err(`Unexpected error: ${(error as Error).message}`);
    if (process.env.SOLANA_CLAWD_DEBUG === "1") {
      console.error(error);
    }
    process.exitCode = 1;
  });
