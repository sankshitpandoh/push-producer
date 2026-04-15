const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const CONFIG_DIR_NAME = ".pushproducer";
const CONFIG_FILE_NAME = "config.json";
const DEFAULT_SOUND_NAME = "default-tag.wav";

function getHomeDir() {
  return os.homedir();
}

function getConfigDir(customDir) {
  return customDir ? path.resolve(customDir) : path.join(getHomeDir(), CONFIG_DIR_NAME);
}

function getConfigPath(customDir) {
  return path.join(getConfigDir(customDir), CONFIG_FILE_NAME);
}

function getDefaultSoundPath(customDir) {
  return path.join(getConfigDir(customDir), DEFAULT_SOUND_NAME);
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

function resolveSoundPath(customDir) {
  const config = readConfig(customDir);
  return config.soundPath ? path.resolve(config.soundPath) : getDefaultSoundPath(customDir);
}

function setSoundPath(soundPath, customDir) {
  const config = readConfig(customDir);
  config.soundPath = path.resolve(soundPath);
  writeConfig(config, customDir);
}

module.exports = {
  ensureDir,
  getConfigDir,
  getConfigPath,
  getDefaultSoundPath,
  readConfig,
  resolveSoundPath,
  setSoundPath,
  writeConfig
};
