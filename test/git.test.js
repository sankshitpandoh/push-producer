const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const {
  extractCommandContext,
  isGitHubRemote,
  normalizeGitHost,
  resolvePushRemoteArg,
  shouldTriggerAfterGit
} = require("../src/git");

test("extractCommandContext handles -C before push", () => {
  const result = extractCommandContext(["-C", "packages/app", "push", "origin"], "/tmp/work");
  assert.equal(result.cwd, "/tmp/work/packages/app");
  assert.equal(result.subcommand, "push");
  assert.equal(result.subcommandIndex, 2);
});

test("resolvePushRemoteArg finds remote after push flags", () => {
  const result = resolvePushRemoteArg(["--set-upstream", "origin", "main"]);
  assert.equal(result, "origin");
});

test("normalizeGitHost handles ssh remotes", () => {
  assert.equal(normalizeGitHost("git@github.com:openai/demo.git"), "github.com");
});

test("isGitHubRemote only matches github.com", () => {
  assert.equal(isGitHubRemote("https://github.com/openai/demo.git"), true);
  assert.equal(isGitHubRemote("git@gitlab.com:openai/demo.git"), false);
});

test("shouldTriggerAfterGit recognizes successful github push", () => {
  const repoDir = fs.mkdtempSync(path.join(os.tmpdir(), "pushproducer-repo-"));
  execFileSync("git", ["init"], { cwd: repoDir, stdio: "ignore" });
  execFileSync("git", ["remote", "add", "origin", "https://github.com/openai/demo.git"], {
    cwd: repoDir,
    stdio: "ignore"
  });

  const trigger = shouldTriggerAfterGit(0, repoDir, ["push", "origin"]);
  assert.ok(trigger);
  assert.equal(trigger.remoteUrl, "https://github.com/openai/demo.git");
});

test("shouldTriggerAfterGit skips non-github remotes", () => {
  const repoDir = fs.mkdtempSync(path.join(os.tmpdir(), "pushproducer-repo-"));
  execFileSync("git", ["init"], { cwd: repoDir, stdio: "ignore" });
  execFileSync("git", ["remote", "add", "origin", "https://gitlab.com/openai/demo.git"], {
    cwd: repoDir,
    stdio: "ignore"
  });

  const trigger = shouldTriggerAfterGit(0, repoDir, ["push", "origin"]);
  assert.equal(trigger, null);
});
