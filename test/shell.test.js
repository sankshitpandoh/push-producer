const test = require("node:test");
const assert = require("node:assert/strict");

const { MARKER_START, createSnippet, removeSnippet, upsertSnippet } = require("../src/shell");

test("createSnippet builds zsh wrapper", () => {
  const snippet = createSnippet("zsh", "/tmp/pushproducer");
  assert.match(snippet, /git\(\) \{/);
  assert.match(snippet, /__after-git/);
});

test("upsertSnippet replaces existing snippet", () => {
  const first = upsertSnippet("", createSnippet("zsh", "/tmp/a"));
  const second = upsertSnippet(first, createSnippet("zsh", "/tmp/b"));
  assert.equal((second.match(new RegExp(MARKER_START, "g")) || []).length, 1);
  assert.match(second, /\/tmp\/b/);
});

test("removeSnippet strips managed block", () => {
  const original = `alias gs="git status"\n\n${createSnippet("zsh", "/tmp/pushproducer")}\n`;
  const cleaned = removeSnippet(original);
  assert.doesNotMatch(cleaned, /__after-git/);
  assert.match(cleaned, /alias gs/);
});
