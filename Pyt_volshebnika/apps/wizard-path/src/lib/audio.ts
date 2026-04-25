let audioCtx: AudioContext | null = null;
let isMuted = false;
let bgMusicNode: OscillatorNode | null = null;
let bgGainNode: GainNode | null = null;
let bgMusicStarted = false;

function getContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function startBgMusic() {
  if (bgMusicStarted || isMuted) return;
  try {
    const ctx = getContext();
    bgGainNode = ctx.createGain();
    bgGainNode.gain.setValueAtTime(0.04, ctx.currentTime);
    bgGainNode.connect(ctx.destination);

    const notes = [261.63, 293.66, 329.63, 349.23, 392, 440, 493.88, 523.25];
    let step = 0;

    function playNote() {
      if (!bgGainNode || isMuted) return;
      const ctx2 = getContext();
      const osc = ctx2.createOscillator();
      const g = ctx2.createGain();
      osc.type = 'sine';
      const freq = notes[step % notes.length];
      osc.frequency.setValueAtTime(freq, ctx2.currentTime);

      g.gain.setValueAtTime(0, ctx2.currentTime);
      g.gain.linearRampToValueAtTime(0.06, ctx2.currentTime + 0.3);
      g.gain.linearRampToValueAtTime(0, ctx2.currentTime + 1.2);

      osc.connect(g);
      g.connect(ctx2.destination);
      osc.start();
      osc.stop(ctx2.currentTime + 1.2);

      step++;
      if (!isMuted) {
        setTimeout(playNote, 1400 + Math.random() * 800);
      }
    }

    playNote();
    bgMusicStarted = true;
  } catch (e) {
    // Ignore
  }
}

export const audioManager = {
  setMuted(muted: boolean) {
    isMuted = muted;
    if (bgGainNode) {
      const ctx = getContext();
      bgGainNode.gain.setValueAtTime(muted ? 0 : 0.04, ctx.currentTime);
    }
    if (!muted && !bgMusicStarted) {
      startBgMusic();
    }
  },

  getMuted() {
    return isMuted;
  },

  startBgMusic() {
    startBgMusic();
  },

  playTyping() {
    if (isMuted) return;
    try {
      const ctx = getContext();
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(800 + Math.random() * 300, ctx.currentTime);

      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.025, ctx.currentTime + 0.005);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    } catch (e) {
      // Ignore
    }
  },

  playClick() {
    if (isMuted) return;
    try {
      const ctx = getContext();
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(400, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(900, ctx.currentTime + 0.08);

      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch (e) {
      // Ignore
    }
  },

  playMagical() {
    if (isMuted) return;
    try {
      const ctx = getContext();
      [523, 659, 783].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.15);
        g.gain.setValueAtTime(0, ctx.currentTime + i * 0.15);
        g.gain.linearRampToValueAtTime(0.1, ctx.currentTime + i * 0.15 + 0.1);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.5);
        osc.connect(g);
        g.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.15);
        osc.stop(ctx.currentTime + i * 0.15 + 0.5);
      });
    } catch (e) {
      // Ignore
    }
  }
};
