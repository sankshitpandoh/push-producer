const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const MARKER_START = "# >>> pushproducer >>>";
const MARKER_END = "# <<< pushproducer <<<";

function detectShell(shellName) {
  if (shellName) {
    return shellName;
  }

  const envShell = process.env.SHELL || "";
  const base = path.basename(envShell);
  return base || "zsh";
}

function getRcFile(shellName, customPath) {
  if (customPath) {
    return path.resolve(customPath);
  }

  const home = os.homedir();
  const shell = detectShell(shellName);

  if (shell === "zsh") {
    return path.join(home, ".zshrc");
  }

  if (shell === "bash") {
    return path.join(home, ".bashrc");
  }

  if (shell === "fish") {
    return path.join(home, ".config", "fish", "config.fish");
  }

  throw new Error(`Unsupported shell: ${shell}`);
}

function shellEscape(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

function createSnippet(shellName, executablePath) {
  const shell = detectShell(shellName);
  const commandPath = shellEscape(path.resolve(executablePath));

  if (shell === "fish") {
    return [
      MARKER_START,
      `function git --wraps git --description 'pushproducer git wrapper'`,
      "  command git $argv",
      "  set -l status_code $status",
      `  ${commandPath} __after-git $status_code $PWD $argv >/dev/null 2>/dev/null`,
      "  return $status_code",
      "end",
      MARKER_END
    ].join("\n");
  }

  return [
    MARKER_START,
    "git() {",
    "  command git \"$@\"",
    "  local status_code=$?",
    `  ${commandPath} __after-git \"$status_code\" \"$PWD\" \"$@\" >/dev/null 2>/dev/null`,
    "  return $status_code",
    "}",
    MARKER_END
  ].join("\n");
}

function upsertSnippet(existing, snippet) {
  const normalized = existing || "";
  const pattern = new RegExp(`${escapeRegex(MARKER_START)}[\\s\\S]*?${escapeRegex(MARKER_END)}\\n?`, "g");
  const withoutOld = normalized.replace(pattern, "").trimEnd();
  return `${withoutOld}${withoutOld ? "\n\n" : ""}${snippet}\n`;
}

function removeSnippet(existing) {
  const normalized = existing || "";
  const pattern = new RegExp(`${escapeRegex(MARKER_START)}[\\s\\S]*?${escapeRegex(MARKER_END)}\\n?`, "g");
  return normalized.replace(pattern, "").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function installShellIntegration({ shellName, rcFile, executablePath }) {
  const resolvedRcFile = getRcFile(shellName, rcFile);
  fs.mkdirSync(path.dirname(resolvedRcFile), { recursive: true });
  const existing = fs.existsSync(resolvedRcFile) ? fs.readFileSync(resolvedRcFile, "utf8") : "";
  const snippet = createSnippet(shellName, executablePath);
  fs.writeFileSync(resolvedRcFile, upsertSnippet(existing, snippet), "utf8");
  return resolvedRcFile;
}

function uninstallShellIntegration({ shellName, rcFile }) {
  const resolvedRcFile = getRcFile(shellName, rcFile);
  if (!fs.existsSync(resolvedRcFile)) {
    return resolvedRcFile;
  }

  const existing = fs.readFileSync(resolvedRcFile, "utf8");
  fs.writeFileSync(resolvedRcFile, removeSnippet(existing), "utf8");
  return resolvedRcFile;
}

module.exports = {
  MARKER_END,
  MARKER_START,
  createSnippet,
  detectShell,
  getRcFile,
  installShellIntegration,
  removeSnippet,
  uninstallShellIntegration,
  upsertSnippet
};
