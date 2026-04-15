const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const CONFIG_DIR_NAME = ".pushproducer";
const CONFIG_FILE_NAME = "config.json";
const DEFAULT_SOUND_NAMES = {
  success: "default-tag.wav",
  failure: "default-fail-tag.wav"
};

function getHomeDir() {
  return os.homedir();
}

function getConfigDir(customDir) {
  return customDir ? path.resolve(customDir) : path.join(getHomeDir(), CONFIG_DIR_NAME);
}

function getConfigPath(customDir) {
  return path.join(getConfigDir(customDir), CONFIG_FILE_NAME);
}

function normalizeEventName(eventName) {
  return eventName === "failure" ? "failure" : "success";
}

function getConfigSoundKey(eventName) {
  return normalizeEventName(eventName) === "failure" ? "failureSoundPath" : "successSoundPath";
}

function getDefaultSoundPath(customDir, eventName = "success") {
  const normalizedEvent = normalizeEventName(eventName);
  return path.join(getConfigDir(customDir), DEFAULT_SOUND_NAMES[normalizedEvent]);
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function readConfig(customDir) {
  const configPath = getConfigPath(customDir);
  if (!fs.existsSync(configPath)) {
    return {};
  }

  const raw = fs.readFileSync(configPath, "utf8");
  if (!raw.trim()) {
    return {};
  }

  return JSON.parse(raw);
}

function writeConfig(config, customDir) {
  const configDir = getConfigDir(customDir);
  ensureDir(configDir);
  fs.writeFileSync(getConfigPath(customDir), `${JSON.stringify(config, null, 2)}\n`, "utf8");
}

function resolveSoundPath(customDir, eventName = "success") {
  const config = readConfig(customDir);
  const normalizedEvent = normalizeEventName(eventName);

  if (normalizedEvent === "success") {
    const successPath = config.successSoundPath || config.soundPath;
    return successPath ? path.resolve(successPath) : getDefaultSoundPath(customDir, normalizedEvent);
  }

  return config.failureSoundPath
    ? path.resolve(config.failureSoundPath)
    : getDefaultSoundPath(customDir, normalizedEvent);
}

function setSoundPath(soundPath, customDir, eventName = "success") {
  const config = readConfig(customDir);
  const normalizedEvent = normalizeEventName(eventName);
  const resolvedSoundPath = path.resolve(soundPath);

  config[getConfigSoundKey(normalizedEvent)] = resolvedSoundPath;
  if (normalizedEvent === "success") {
    config.soundPath = resolvedSoundPath;
  }

  writeConfig(config, customDir);
}

module.exports = {
  ensureDir,
  getConfigDir,
  getConfigPath,
  getDefaultSoundPath,
  normalizeEventName,
  readConfig,
  resolveSoundPath,
  setSoundPath,
  writeConfig
};
