const path = require("node:path");
const { spawnSync } = require("node:child_process");

const GIT_OPTIONS_WITH_VALUES = new Set([
  "-C",
  "-c",
  "--config-env",
  "--exec-path",
  "--git-dir",
  "--namespace",
  "--super-prefix",
  "--work-tree"
]);

const PUSH_OPTIONS_WITH_VALUES = new Set([
  "--repo",
  "-o",
  "--receive-pack",
  "--server-option",
  "--set-upstream",
  "-u"
]);

function runGit(args, cwd) {
  const result = spawnSync("git", args, {
    cwd,
    encoding: "utf8"
  });

  if (result.status !== 0) {
    return null;
  }

  return (result.stdout || "").trim();
}

function extractCommandContext(args, shellCwd) {
  let cwd = path.resolve(shellCwd);
  let subcommand = null;
  let subcommandIndex = -1;

  for (let i = 0; i < args.length; i += 1) {
    const token = args[i];

    if (token === "-C") {
      const nextDir = args[i + 1];
      if (nextDir) {
        cwd = path.resolve(cwd, nextDir);
        i += 1;
      }
      continue;
    }

    if (token.startsWith("-C") && token !== "-C") {
      cwd = path.resolve(cwd, token.slice(2));
      continue;
    }

    if (token === "-c") {
      i += 1;
      continue;
    }

    if (token.startsWith("-c") && token !== "-c") {
      continue;
    }

    if (GIT_OPTIONS_WITH_VALUES.has(token)) {
      i += 1;
      continue;
    }

    if (token.startsWith("--") || (token.startsWith("-") && token !== "-")) {
      continue;
    }

    subcommand = token;
    subcommandIndex = i;
    break;
  }

  return {
    cwd,
    subcommand,
    subcommandIndex
  };
}

function resolvePushRemoteArg(pushArgs) {
  for (let i = 0; i < pushArgs.length; i += 1) {
    const token = pushArgs[i];

    if (!token) {
      continue;
    }

    if (token === "--") {
      return pushArgs[i + 1] || null;
    }

    if (token.startsWith("--repo=")) {
      return token.slice("--repo=".length);
    }

    if (token === "-u" || token === "--set-upstream") {
      continue;
    }

    if (token === "--repo") {
      return pushArgs[i + 1] || null;
    }

    if (PUSH_OPTIONS_WITH_VALUES.has(token)) {
      i += 1;
      continue;
    }

    if (token.startsWith("-") && token !== "-") {
      continue;
    }

    return token;
  }

  return null;
}

function looksLikeUrlOrScp(value) {
  return /^(?:[a-z]+:\/\/|[^@\s]+@[^:\s]+:)/i.test(value);
}

function inferRemoteUrl(cwd, remoteArg) {
  if (remoteArg) {
    if (looksLikeUrlOrScp(remoteArg)) {
      return remoteArg;
    }

    const remoteUrl = runGit(["remote", "get-url", "--push", remoteArg], cwd);
    if (remoteUrl) {
      return remoteUrl;
    }
  }

  const currentBranch = getCurrentBranch(cwd);
  if (currentBranch) {
    const branchRemote = runGit(["config", "--get", `branch.${currentBranch}.remote`], cwd);
    if (branchRemote) {
      const remoteUrl = runGit(["remote", "get-url", "--push", branchRemote], cwd);
      if (remoteUrl) {
        return remoteUrl;
      }
    }
  }

  const originRemote = runGit(["remote", "get-url", "--push", "origin"], cwd);
  return originRemote || null;
}

function getCurrentBranch(cwd) {
  return runGit(["branch", "--show-current"], cwd);
}

function normalizeGitHost(remoteUrl) {
  if (!remoteUrl) {
    return null;
  }

  if (remoteUrl.startsWith("git@")) {
    const afterAt = remoteUrl.split("@")[1] || "";
    return afterAt.split(":")[0] || null;
  }

  try {
    const parsed = new URL(remoteUrl);
    return parsed.hostname;
  } catch (error) {
    return null;
  }
}

function isGitHubRemote(remoteUrl) {
  const host = normalizeGitHost(remoteUrl);
  return host === "github.com";
}

function getPushEventAfterGit(exitCode, shellCwd, args) {
  const command = extractCommandContext(args, shellCwd);
  if (command.subcommand !== "push") {
    return null;
  }

  const pushArgs = args.slice(command.subcommandIndex + 1);
  const remoteArg = resolvePushRemoteArg(pushArgs);
  const remoteUrl = inferRemoteUrl(command.cwd, remoteArg);

  if (!remoteUrl || !isGitHubRemote(remoteUrl)) {
    return null;
  }

  return {
    cwd: command.cwd,
    exitCode: Number(exitCode),
    outcome: Number(exitCode) === 0 ? "success" : "failure",
    remoteArg,
    remoteUrl
  };
}

function shouldTriggerAfterGit(exitCode, shellCwd, args) {
  const pushEvent = getPushEventAfterGit(exitCode, shellCwd, args);
  if (!pushEvent || pushEvent.outcome !== "success") {
    return null;
  }

  return pushEvent;
}

module.exports = {
  extractCommandContext,
  getPushEventAfterGit,
  inferRemoteUrl,
  isGitHubRemote,
  normalizeGitHost,
  resolvePushRemoteArg,
  shouldTriggerAfterGit
};
