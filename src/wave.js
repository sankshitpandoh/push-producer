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
  preset = "success",
  durationSeconds = 0.82,
  sampleRate = 44100,
  amplitude = 0.28
} = {}) {
  const wavePreset = getPreset(preset);
  const totalSamples = Math.floor(durationSeconds * sampleRate);
  const pcmData = Buffer.alloc(totalSamples * 2);

  for (let i = 0; i < totalSamples; i += 1) {
    const time = i / sampleRate;
    const attack = Math.min(1, time / 0.02);
    const release = Math.min(1, (durationSeconds - time) / 0.12);
    const envelope = Math.max(0, Math.min(attack, release));

    let sample = 0;

    for (const note of wavePreset.leadNotes) {
      if (time >= note.start && time < note.end) {
        sample += Math.sin(2 * Math.PI * note.frequency * (time - note.start)) * note.volume;
      }
    }

    if (time >= wavePreset.bassNote.start && time < wavePreset.bassNote.end) {
      sample += Math.sin(2 * Math.PI * wavePreset.bassNote.frequency * time) * wavePreset.bassNote.volume;
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

function getPreset(preset) {
  if (preset === "failure") {
    return {
      leadNotes: [
        { start: 0.03, end: 0.23, frequency: 392.0, volume: 0.78 },
        { start: 0.24, end: 0.55, frequency: 293.66, volume: 0.8 }
      ],
      bassNote: {
        start: 0.08,
        end: 0.55,
        frequency: 98.0,
        volume: 0.3
      }
    };
  }

  return {
    leadNotes: [
      { start: 0.04, end: 0.29, frequency: 523.25, volume: 0.8 },
      { start: 0.34, end: 0.62, frequency: 659.25, volume: 0.8 }
    ],
    bassNote: {
      start: 0.12,
      end: 0.62,
      frequency: 130.81,
      volume: 0.28
    }
  };
}

module.exports = {
  createWaveBuffer
};
