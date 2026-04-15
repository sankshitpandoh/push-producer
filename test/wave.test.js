const test = require("node:test");
const assert = require("node:assert/strict");

const { createWaveBuffer } = require("../src/wave");

test("createWaveBuffer emits a wav header", () => {
  const buffer = createWaveBuffer();
  assert.equal(buffer.subarray(0, 4).toString("ascii"), "RIFF");
  assert.equal(buffer.subarray(8, 12).toString("ascii"), "WAVE");
  assert.ok(buffer.length > 44);
});
