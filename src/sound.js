const fs = require("node:fs");
const { spawn, spawnSync } = require("node:child_process");
const path = require("node:path");

const { ensureDir, getConfigDir, getDefaultSoundPath, resolveSoundPath } = require("./config");
const { createWaveBuffer } = require("./wave");

function commandExists(command) {
  const lookupCommand = process.platform === "win32" ? "where" : "which";

  try {
    const result = spawnSync(lookupCommand, [command], {
      stdio: "ignore"
    });
    return result.status === 0;
  } catch (error) {
    return false;
  }
}

function getPlayer(soundPath) {
  const platform = process.platform;

  if (platform === "darwin" && commandExists("afplay")) {
    return { command: "afplay", args: [soundPath] };
  }

  if (platform === "win32") {
    return {
      command: "powershell",
      args: [
        "-NoProfile",
        "-Command",
        `(New-Object Media.SoundPlayer ${JSON.stringify(soundPath)}).PlaySync();`
      ]
    };
  }

  const linuxPlayers = [
    ["paplay", [soundPath]],
    ["aplay", [soundPath]],
    ["ffplay", ["-nodisp", "-autoexit", "-loglevel", "quiet", soundPath]],
    ["play", ["-q", soundPath]]
  ];

  for (const [command, args] of linuxPlayers) {
    if (commandExists(command)) {
      return { command, args };
    }
  }

  return null;
}

function ensureDefaultSound(customDir, eventName = "success") {
  const configDir = getConfigDir(customDir);
  const soundPath = getDefaultSoundPath(customDir, eventName);
  ensureDir(configDir);

  if (!fs.existsSync(soundPath)) {
    fs.writeFileSync(soundPath, createWaveBuffer({ preset: eventName }));
  }

  return soundPath;
}

function ensureUsableSound(customDir, eventName = "success") {
  const soundPath = resolveSoundPath(customDir, eventName);

  if (fs.existsSync(soundPath)) {
    return soundPath;
  }

  if (path.resolve(soundPath) === path.resolve(getDefaultSoundPath(customDir, eventName))) {
    return ensureDefaultSound(customDir, eventName);
  }

  throw new Error(`Configured ${eventName} sound file does not exist: ${soundPath}`);
}

function playSound(options = {}) {
  const { customDir, soundPath, background = false, eventName = "success" } = options;
  const resolvedSound = soundPath ? path.resolve(soundPath) : ensureUsableSound(customDir, eventName);
  const player = getPlayer(resolvedSound);

  if (!player) {
    throw new Error("No supported audio player found. Install afplay, paplay, aplay, ffplay, or sox.");
  }

  const child = spawn(player.command, player.args, {
    detached: background,
    stdio: background ? "ignore" : "inherit"
  });

  if (background) {
    child.unref();
    return null;
  }

  return new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`Audio player exited with code ${code}`));
    });
  });
}

module.exports = {
  commandExists,
  ensureDefaultSound,
  ensureUsableSound,
  getPlayer,
  playSound
};
