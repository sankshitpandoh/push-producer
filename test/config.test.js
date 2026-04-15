const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { getDefaultSoundPath, readConfig, resolveSoundPath, setSoundPath } = require("../src/config");

test("resolveSoundPath keeps legacy success config working", () => {
  const configDir = fs.mkdtempSync(path.join(os.tmpdir(), "pushproducer-config-"));
  fs.writeFileSync(
    path.join(configDir, "config.json"),
    `${JSON.stringify({ soundPath: "/tmp/legacy-success.wav" }, null, 2)}\n`,
    "utf8"
  );

  assert.equal(resolveSoundPath(configDir, "success"), "/tmp/legacy-success.wav");
});

test("resolveSoundPath falls back to default failure sound path", () => {
  const configDir = fs.mkdtempSync(path.join(os.tmpdir(), "pushproducer-config-"));
  assert.equal(resolveSoundPath(configDir, "failure"), getDefaultSoundPath(configDir, "failure"));
});

test("setSoundPath stores separate success and failure paths", () => {
  const configDir = fs.mkdtempSync(path.join(os.tmpdir(), "pushproducer-config-"));
  setSoundPath("/tmp/success.wav", configDir, "success");
  setSoundPath("/tmp/failure.wav", configDir, "failure");

  const config = readConfig(configDir);
  assert.equal(config.successSoundPath, "/tmp/success.wav");
  assert.equal(config.soundPath, "/tmp/success.wav");
  assert.equal(config.failureSoundPath, "/tmp/failure.wav");
});
