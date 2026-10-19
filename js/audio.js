let actx = null;

export function ensureAudio() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!actx) actx = new AC();
  if (actx.state === 'suspended') actx.resume();
  return actx;
}

export function playDing() {
  const ctx = ensureAudio();
  if (!ctx) return;
  const t0 = ctx.currentTime;
  const master = ctx.createGain();
  master.gain.setValueAtTime(0.0001, t0);
  master.gain.exponentialRampToValueAtTime(0.45, t0 + 0.006);
  master.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.1);
  master.connect(ctx.destination);

  const partials = [[1046.5, 1.0, 1.0], [1568.0, 0.42, 0.8], [2093.0, 0.26, 0.65], [2637.0, 0.12, 0.45]];
  for (const [freq, amp, decay] of partials) {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    const g = ctx.createGain();
    g.gain.setValueAtTime(amp, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + decay);
    osc.connect(g);
    g.connect(master);
    osc.start(t0);
    osc.stop(t0 + 1.2);
  }

  const click = ctx.createOscillator();
  click.type = 'triangle';
  click.frequency.setValueAtTime(2600, t0);
  click.frequency.exponentialRampToValueAtTime(900, t0 + 0.05);
  const cg = ctx.createGain();
  cg.gain.setValueAtTime(0.18, t0);
  cg.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.06);
  click.connect(cg);
  cg.connect(master);
  click.start(t0);
  click.stop(t0 + 0.08);
}
