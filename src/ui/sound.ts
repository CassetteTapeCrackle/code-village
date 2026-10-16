// Soft sounds made on the fly with Web Audio (no files to download). Off unless the learner turns them on.
export type Sound = "pass" | "fail" | "fanfare";
type Note = { freq: number; at: number; length: number };

export function notesFor(sound: Sound): Note[] {
  if (sound === "pass")
    return [523.25, 659.25, 783.99].map((freq, i) => ({ freq, at: i * 0.09, length: 0.16 }));
  if (sound === "fail") return [{ freq: 196, at: 0, length: 0.18 }];
  return [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5].map((freq, i) => ({
    freq,
    at: i * 0.12,
    length: i === 5 ? 0.4 : 0.14,
  }));
}

let audio: AudioContext | null = null;

export function play(sound: Sound): void {
  try {
    audio ??= new AudioContext();
    const start = audio.currentTime + 0.01;
    for (const note of notesFor(sound)) {
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = sound === "fail" ? "sine" : "triangle";
      osc.frequency.value = note.freq;
      gain.gain.setValueAtTime(0.0001, start + note.at);
      gain.gain.exponentialRampToValueAtTime(0.12, start + note.at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + note.at + note.length);
      osc.connect(gain).connect(audio.destination);
      osc.start(start + note.at);
      osc.stop(start + note.at + note.length + 0.05);
    }
  } catch {
    // no audio here (old browser, blocked): stay quiet
  }
}
