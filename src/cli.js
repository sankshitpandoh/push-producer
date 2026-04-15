const fs = require("node:fs");
const path = require("node:path");

const { getConfigDir, getConfigPath, resolveSoundPath, setSoundPath } = require("./config");
const { shouldTriggerAfterGit } = require("./git");
const { createSnippet, detectShell, getRcFile, installShellIntegration, uninstallShellIntegration } = require("./shell");
const { commandExists, ensureDefaultSound, getPlayer, playSound } = require("./sound");

function printHelp() {
  console.log(`pushproducer

Commands:
  install [--shell zsh|bash|fish] [--rc-file PATH] [--config-dir PATH]
  uninstall [--shell zsh|bash|fish] [--rc-file PATH]
  play [--sound PATH] [--config-dir PATH]
  set-sound <PATH> [--config-dir PATH]
  doctor [--shell zsh|bash|fish] [--rc-file PATH] [--config-dir PATH]

Internal:
  __after-git <exitCode> <cwd> <git args...>`);
}

function parseFlags(argv) {
  const args = [];
  const flags = {};

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token.startsWith("--")) {
      const [key, inlineValue] = token.slice(2).split("=", 2);
      if (inlineValue !== undefined) {
        flags[key] = inlineValue;
        continue;
      }

      const next = argv[i + 1];
      if (next && !next.startsWith("--")) {
        flags[key] = next;
        i += 1;
      } else {
        flags[key] = true;
      }
      continue;
    }

    args.push(token);
  }

  return { args, flags };
}

async function handleInstall(flags) {
  ensureDefaultSound(flags["config-dir"]);
  const shellName = detectShell(flags.shell);
  const executablePath = fs.realpathSync(process.argv[1]);
  const rcFile = installShellIntegration({
    shellName,
    rcFile: flags["rc-file"],
    executablePath
  });

  console.log(`Installed pushproducer for ${shellName}.`);
  console.log(`Shell config: ${rcFile}`);
  console.log(`Config dir: ${getConfigDir(flags["config-dir"])}`);
  console.log(`Default sound: ${resolveSoundPath(flags["config-dir"])}`);
  console.log(`Restart your shell or run: source ${rcFile}`);
}

async function handleUninstall(flags) {
  const shellName = detectShell(flags.shell);
  const rcFile = uninstallShellIntegration({
    shellName,
    rcFile: flags["rc-file"]
  });
  console.log(`Removed pushproducer shell integration from ${rcFile}`);
}

async function handlePlay(flags) {
  await playSound({
    customDir: flags["config-dir"],
    soundPath: flags.sound
  });
  console.log("Played pushproducer tag.");
}

async function handleSetSound(args, flags) {
  const soundPath = args[0];
  if (!soundPath) {
    throw new Error("Missing sound path. Usage: pushproducer set-sound <PATH>");
  }

  const resolved = path.resolve(soundPath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Sound file does not exist: ${resolved}`);
  }

  setSoundPath(resolved, flags["config-dir"]);
  console.log(`Custom sound set to ${resolved}`);
}

async function handleDoctor(flags) {
  const shellName = detectShell(flags.shell);
  const rcFile = getRcFile(shellName, flags["rc-file"]);
  const configDir = getConfigDir(flags["config-dir"]);
  const configPath = getConfigPath(flags["config-dir"]);
  const soundPath = resolveSoundPath(flags["config-dir"]);
  const player = getPlayer(soundPath);

  console.log(`shell: ${shellName}`);
  console.log(`rcFile: ${rcFile}`);
  console.log(`configDir: ${configDir}`);
  console.log(`configPath: ${configPath}`);
  console.log(`soundPath: ${soundPath}`);
  console.log(`soundExists: ${fs.existsSync(soundPath)}`);
  console.log(`audioPlayer: ${player ? player.command : "missing"}`);
  console.log(`afplayAvailable: ${commandExists("afplay")}`);
}

async function handleAfterGit(args) {
  const exitCode = args[0];
  const cwd = args[1];
  const gitArgs = args.slice(2);
  const trigger = shouldTriggerAfterGit(exitCode, cwd, gitArgs);

  if (!trigger) {
    return;
  }

  await playSound({
    background: true
  });
}

async function main(argv) {
  const { args, flags } = parseFlags(argv);
  const command = args[0];

  if (!command || command === "help" || command === "--help") {
    printHelp();
    return;
  }

  if (command === "install") {
    await handleInstall(flags);
    return;
  }

  if (command === "uninstall") {
    await handleUninstall(flags);
    return;
  }

  if (command === "play") {
    await handlePlay(flags);
    return;
  }

  if (command === "set-sound") {
    await handleSetSound(args.slice(1), flags);
    return;
  }

  if (command === "doctor") {
    await handleDoctor(flags);
    return;
  }

  if (command === "__after-git") {
    await handleAfterGit(args.slice(1));
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

module.exports = {
  main,
  parseFlags,
  printHelp
};
