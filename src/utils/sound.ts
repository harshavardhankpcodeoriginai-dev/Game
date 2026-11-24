let ctx: AudioContext | null = null;

function tone(freq: number, dur: number, type: OscillatorType = "sine", vol = 0.15, slide = 0) {
  try {
    if (!ctx) ctx = new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, ctx.currentTime);
    if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, ctx.currentTime + dur);
    g.gain.setValueAtTime(vol, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + dur);
  } catch {
    /* audio unsupported */
  }
}

export type SoundKind = "drop" | "bounce" | "merge" | "gameover" | "best";

export function playSound(kind: SoundKind) {
  switch (kind) {
    case "drop": return tone(420, 0.12, "triangle", 0.12, 0.6);
    case "bounce": return tone(180, 0.06, "sine", 0.06);
    case "merge": return tone(520, 0.18, "sine", 0.15, 1.8);
    case "gameover": return tone(300, 0.6, "sawtooth", 0.1, 0.3);
    case "best": tone(660, 0.15, "square", 0.08); setTimeout(() => tone(990, 0.25, "square", 0.08), 140);
  }
}
