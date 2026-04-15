function clampSample(value) {
  if (value > 1) {
    return 1;
  }
  if (value < -1) {
    return -1;
  }
  return value;
}

function writeString(buffer, offset, value) {
  buffer.write(value, offset, value.length, "ascii");
}

function createWaveBuffer({
  durationSeconds = 0.82,
  sampleRate = 44100,
  amplitude = 0.28
} = {}) {
  const totalSamples = Math.floor(durationSeconds * sampleRate);
  const pcmData = Buffer.alloc(totalSamples * 2);

  for (let i = 0; i < totalSamples; i += 1) {
    const time = i / sampleRate;
    const attack = Math.min(1, time / 0.02);
    const release = Math.min(1, (durationSeconds - time) / 0.12);
    const envelope = Math.max(0, Math.min(attack, release));

    let sample = 0;

    if (time >= 0.04 && time < 0.29) {
      sample += Math.sin(2 * Math.PI * 523.25 * (time - 0.04)) * 0.8;
    }

    if (time >= 0.34 && time < 0.62) {
      sample += Math.sin(2 * Math.PI * 659.25 * (time - 0.34)) * 0.8;
    }

    if (time >= 0.12 && time < 0.62) {
      sample += Math.sin(2 * Math.PI * 130.81 * time) * 0.28;
    }

    const output = clampSample(sample * envelope * amplitude);
    pcmData.writeInt16LE(Math.round(output * 0x7fff), i * 2);
  }

  const header = Buffer.alloc(44);
  writeString(header, 0, "RIFF");
  header.writeUInt32LE(36 + pcmData.length, 4);
  writeString(header, 8, "WAVE");
  writeString(header, 12, "fmt ");
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  writeString(header, 36, "data");
  header.writeUInt32LE(pcmData.length, 40);

  return Buffer.concat([header, pcmData]);
}

module.exports = {
  createWaveBuffer
};
