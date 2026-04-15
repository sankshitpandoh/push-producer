const fs = require("node:fs");
const path = require("node:path");

const { getConfigDir, getConfigPath, resolveSoundPath, setSoundPath } = require("./config");
const { getPushEventAfterGit } = require("./git");
const { detectShell, getRcFile, installShellIntegration, uninstallShellIntegration } = require("./shell");
const { commandExists, ensureDefaultSound, getPlayer, playSound } = require("./sound");

function printHelp() {
  console.log(`pushproducer

Commands:
  install [--shell zsh|bash|fish] [--rc-file PATH] [--config-dir PATH]
  uninstall [--shell zsh|bash|fish] [--rc-file PATH]
  play [--event success|failure] [--sound PATH] [--config-dir PATH]
  set-sound <PATH> [--event success|failure] [--config-dir PATH]
  set-success-sound <PATH> [--config-dir PATH]
  set-failure-sound <PATH> [--config-dir PATH]
  doctor [--shell zsh|bash|fish] [--rc-file PATH] [--config-dir PATH]

Internal:
  __after-git <exitCode> <cwd> <git args...>`);
}

function resolveEventFlag(flags, fallbackEvent = "success") {
  const eventName = flags.event || fallbackEvent;
  if (eventName !== "success" && eventName !== "failure") {
    throw new Error(`Unsupported event "${eventName}". Use "success" or "failure".`);
  }

  return eventName;
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
  const successSoundPath = ensureDefaultSound(flags["config-dir"], "success");
  const failureSoundPath = ensureDefaultSound(flags["config-dir"], "failure");
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
  console.log(`Default success sound: ${successSoundPath}`);
  console.log(`Default failure sound: ${failureSoundPath}`);
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
  const eventName = resolveEventFlag(flags);
  await playSound({
    customDir: flags["config-dir"],
    eventName,
    soundPath: flags.sound
  });
  console.log(`Played pushproducer ${eventName} tag.`);
}

async function handleSetSound(args, flags, fallbackEvent = "success") {
  const soundPath = args[0];
  if (!soundPath) {
    throw new Error("Missing sound path. Usage: pushproducer set-sound <PATH>");
  }

  const resolved = path.resolve(soundPath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Sound file does not exist: ${resolved}`);
  }

  const eventName = resolveEventFlag(flags, fallbackEvent);
  setSoundPath(resolved, flags["config-dir"], eventName);
  console.log(`Custom ${eventName} sound set to ${resolved}`);
}

async function handleDoctor(flags) {
  const shellName = detectShell(flags.shell);
  const rcFile = getRcFile(shellName, flags["rc-file"]);
  const configDir = getConfigDir(flags["config-dir"]);
  const configPath = getConfigPath(flags["config-dir"]);
  const successSoundPath = resolveSoundPath(flags["config-dir"], "success");
  const failureSoundPath = resolveSoundPath(flags["config-dir"], "failure");
  const player = getPlayer(successSoundPath) || getPlayer(failureSoundPath);

  console.log(`shell: ${shellName}`);
  console.log(`rcFile: ${rcFile}`);
  console.log(`configDir: ${configDir}`);
  console.log(`configPath: ${configPath}`);
  console.log(`successSoundPath: ${successSoundPath}`);
  console.log(`successSoundExists: ${fs.existsSync(successSoundPath)}`);
  console.log(`failureSoundPath: ${failureSoundPath}`);
  console.log(`failureSoundExists: ${fs.existsSync(failureSoundPath)}`);
  console.log(`audioPlayer: ${player ? player.command : "missing"}`);
  console.log(`afplayAvailable: ${commandExists("afplay")}`);
}

async function handleAfterGit(args) {
  const exitCode = args[0];
  const cwd = args[1];
  const gitArgs = args.slice(2);
  const pushEvent = getPushEventAfterGit(exitCode, cwd, gitArgs);

  if (!pushEvent) {
    return;
  }

  await playSound({
    background: true,
    eventName: pushEvent.outcome
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

  if (command === "set-success-sound") {
    await handleSetSound(args.slice(1), { ...flags, event: "success" }, "success");
    return;
  }

  if (command === "set-failure-sound") {
    await handleSetSound(args.slice(1), { ...flags, event: "failure" }, "failure");
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
