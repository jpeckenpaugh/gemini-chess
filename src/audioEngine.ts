// Wizard Chess Audio Synthesizer (Web Audio API)
// Procedural sound design: Stone slides, physical melee impact, stone shattering, piece selection, check warning, checkmate fanfare.

class WizardChessAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isMuted: boolean = false;
  private volume: number = 0.8;
  private initialized: boolean = false;
  private whiteVoiceSet: 'w' | 'b' = 'w'; // 'w' = UK English, 'b' = US English
  private blackVoiceSet: 'w' | 'b' = 'b'; // 'b' = US English, 'w' = UK English

  constructor() {
    // Read user mute preference from localStorage
    try {
      const storedMute = localStorage.getItem('wizard_chess_muted');
      if (storedMute !== null) {
        this.isMuted = storedMute === 'true';
      }
      const storedWhiteVoice = localStorage.getItem('wizard_chess_voice_w');
      if (storedWhiteVoice === 'w' || storedWhiteVoice === 'b') {
        this.whiteVoiceSet = storedWhiteVoice;
      }
      const storedBlackVoice = localStorage.getItem('wizard_chess_voice_b');
      if (storedBlackVoice === 'w' || storedBlackVoice === 'b') {
        this.blackVoiceSet = storedBlackVoice;
      }
    } catch {
      // Ignore localStorage restrictions
    }
  }

  public getVoiceSet(color: 'w' | 'b'): 'w' | 'b' {
    return color === 'w' ? this.whiteVoiceSet : this.blackVoiceSet;
  }

  public setVoiceSet(color: 'w' | 'b', setKey: 'w' | 'b'): void {
    if (color === 'w') {
      this.whiteVoiceSet = setKey;
      try { localStorage.setItem('wizard_chess_voice_w', setKey); } catch {}
    } else {
      this.blackVoiceSet = setKey;
      try { localStorage.setItem('wizard_chess_voice_b', setKey); } catch {}
    }
  }

  private initContext(): boolean {
    if (this.ctx && this.masterGain) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return true;
    }

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return false;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
      this.initialized = true;
      return true;
    } catch (e) {
      console.warn('AudioContext failed to initialize:', e);
      return false;
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    try {
      localStorage.setItem('wizard_chess_muted', String(this.isMuted));
    } catch {
      // Ignore
    }

    if (this.masterGain && this.ctx) {
      const targetGain = this.isMuted ? 0 : this.volume;
      this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.masterGain.gain.linearRampToValueAtTime(targetGain, this.ctx.currentTime + 0.05);
    }
    return this.isMuted;
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    try {
      localStorage.setItem('wizard_chess_muted', String(this.isMuted));
    } catch {
      // Ignore
    }
    if (this.masterGain && this.ctx) {
      const targetGain = this.isMuted ? 0 : this.volume;
      this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.masterGain.gain.linearRampToValueAtTime(targetGain, this.ctx.currentTime + 0.05);
    }
  }

  /**
   * Sound 1: Crisp stone tap / hum when selecting a piece on the marble board
   */
  public playSelectPiece(): void {
    if (this.isMuted || !this.initContext() || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(540, now + 0.04);
    osc.frequency.exponentialRampToValueAtTime(280, now + 0.12);

    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.13);
  }

  /**
   * Sound 2: Heavy sculpted stone sliding across marble altar
   */
  public playStoneSlide(): void {
    if (this.isMuted || !this.initContext() || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    // Filtered pink/brown noise for stone friction
    const bufferSize = this.ctx.sampleRate * 0.45;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = data[i];
      data[i] *= 3.5; // Gain compensation
    }

    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = buffer;

    const biquad = this.ctx.createBiquadFilter();
    biquad.type = 'bandpass';
    biquad.frequency.setValueAtTime(380, now);
    biquad.frequency.linearRampToValueAtTime(220, now + 0.45);
    biquad.Q.value = 1.8;

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.01, now);
    noiseGain.gain.linearRampToValueAtTime(0.35, now + 0.08);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    // Deep stone resonance thud at finish
    const lowOsc = this.ctx.createOscillator();
    const lowGain = this.ctx.createGain();
    lowOsc.type = 'sine';
    lowOsc.frequency.setValueAtTime(95, now + 0.28);
    lowOsc.frequency.exponentialRampToValueAtTime(42, now + 0.45);
    lowGain.gain.setValueAtTime(0.0, now);
    lowGain.gain.setValueAtTime(0.28, now + 0.28);
    lowGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    noiseSource.connect(biquad);
    biquad.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    lowOsc.connect(lowGain);
    lowGain.connect(this.masterGain);

    noiseSource.start(now);
    noiseSource.stop(now + 0.46);
    lowOsc.start(now + 0.28);
    lowOsc.stop(now + 0.46);
  }

  /**
   * Sound 3: Melee weapon swing / whoosh
   */
  public playWeaponSwing(): void {
    if (this.isMuted || !this.initContext() || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    const bufferSize = this.ctx.sampleRate * 0.25;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(250, now);
    filter.frequency.exponentialRampToValueAtTime(1400, now + 0.12);
    filter.frequency.exponentialRampToValueAtTime(400, now + 0.24);
    filter.Q.value = 3.5;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.42, now + 0.10);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(now);
    noise.stop(now + 0.26);
  }

  /**
   * Sound 4: Melee strike impact (dense stone / metal sword colliding)
   */
  public playMeleeImpact(): void {
    if (this.isMuted || !this.initContext() || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    // Heavy sub impact thud
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'triangle';
    subOsc.frequency.setValueAtTime(150, now);
    subOsc.frequency.exponentialRampToValueAtTime(35, now + 0.28);

    subGain.gain.setValueAtTime(0.8, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    subOsc.connect(subGain);
    subGain.connect(this.masterGain);

    // Stone clack transient
    const highOsc = this.ctx.createOscillator();
    const highGain = this.ctx.createGain();
    highOsc.type = 'square';
    highOsc.frequency.setValueAtTime(680, now);
    highOsc.frequency.exponentialRampToValueAtTime(120, now + 0.08);

    highGain.gain.setValueAtTime(0.5, now);
    highGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    highOsc.connect(highGain);
    highGain.connect(this.masterGain);

    subOsc.start(now);
    subOsc.stop(now + 0.3);
    highOsc.start(now);
    highOsc.stop(now + 0.1);
  }

  /**
   * Sound 5: Violent stone shatter & tumbling debris
   */
  public playStoneShatter(): void {
    if (this.isMuted || !this.initContext() || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    // 1. Noise burst for initial fragmentation crack
    const bufferSize = this.ctx.sampleRate * 0.7;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const highFilter = this.ctx.createBiquadFilter();
    highFilter.type = 'highpass';
    highFilter.frequency.setValueAtTime(1200, now);
    highFilter.frequency.exponentialRampToValueAtTime(400, now + 0.5);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.7, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

    noise.connect(highFilter);
    highFilter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    noise.start(now);
    noise.stop(now + 0.7);

    // 2. Multiple stone clatter chips (fragments hitting the marble altar)
    const chipTimes = [0.06, 0.14, 0.22, 0.31, 0.42, 0.53];
    const chipFreqs = [880, 1140, 720, 960, 640, 520];

    chipTimes.forEach((delay, idx) => {
      const chipOsc = this.ctx!.createOscillator();
      const chipGain = this.ctx!.createGain();
      const t = now + delay;

      chipOsc.type = 'triangle';
      chipOsc.frequency.setValueAtTime(chipFreqs[idx], t);
      chipOsc.frequency.exponentialRampToValueAtTime(chipFreqs[idx] * 0.4, t + 0.04);

      chipGain.gain.setValueAtTime(0.24 / (idx * 0.3 + 1), t);
      chipGain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

      chipOsc.connect(chipGain);
      chipGain.connect(this.masterGain!);

      chipOsc.start(t);
      chipOsc.stop(t + 0.06);
    });

    // 3. Sub-bass ground rumble
    const rumble = this.ctx.createOscillator();
    const rumbleGain = this.ctx.createGain();
    rumble.type = 'sine';
    rumble.frequency.setValueAtTime(90, now);
    rumble.frequency.exponentialRampToValueAtTime(28, now + 0.55);

    rumbleGain.gain.setValueAtTime(0.65, now);
    rumbleGain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

    rumble.connect(rumbleGain);
    rumbleGain.connect(this.masterGain);

    rumble.start(now);
    rumble.stop(now + 0.6);
  }

  /**
   * Sound 6: Check alert (mystical warning chime)
   */
  public playCheckWarning(): void {
    if (this.isMuted || !this.initContext() || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    const notes = [440, 554.37]; // A4, C#5 dissonant Gothic tension
    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.06);

      gain.gain.setValueAtTime(0.0, now + idx * 0.06);
      gain.gain.linearRampToValueAtTime(0.3, now + idx * 0.06 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.6);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(now + idx * 0.06);
      osc.stop(now + idx * 0.06 + 0.65);
    });
  }

  /**
   * Sound 7: Sanctum Checkmate Fanfare / Bell Toll
   */
  public playCheckmate(): void {
    if (this.isMuted || !this.initContext() || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    // Deep cathedral bell fundamental + overtones
    const bellFreqs = [110, 220, 330, 440, 660, 880];
    const bellGains = [0.5, 0.35, 0.22, 0.18, 0.12, 0.08];

    bellFreqs.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = i === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(bellGains[i], now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.4 - i * 0.2);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(now);
      osc.stop(now + 2.5);
    });

    // Dramatic descending brass-like triad after the bell strikes
    const chord = [330, 392, 493.88]; // E minor sanctum chord
    chord.forEach((f, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      const startTime = now + 0.25 + idx * 0.12;

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f, startTime);

      const filter = this.ctx!.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, startTime);
      filter.frequency.exponentialRampToValueAtTime(250, startTime + 1.6);

      gain.gain.setValueAtTime(0.0, startTime);
      gain.gain.linearRampToValueAtTime(0.2, startTime + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 1.8);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(startTime);
      osc.stop(startTime + 1.9);
    });
  }

  /**
   * Sound 8: Pre-baked character dialogue with RASP (Rust Audio Shift Processor) WASM
   */
  private dialogueRawCache: Map<string, Uint8Array> = new Map();
  private raspModule: any = null;
  private raspLoaded: boolean = false;
  private raspLoadingPromise: Promise<boolean> | null = null;

  private async initRasp(): Promise<boolean> {
    if (this.raspLoaded) return true;
    if (this.raspLoadingPromise) return this.raspLoadingPromise;

    this.raspLoadingPromise = (async () => {
      try {
        const rasp = await import('./wasm/rasp.js' as any);
        const wasmRes = await fetch('/wasm/rasp_bg.wasm');
        if (!wasmRes.ok) return false;
        const wasmBytes = await wasmRes.arrayBuffer();
        await rasp.default({ module_or_path: wasmBytes });
        this.raspModule = rasp;
        this.raspLoaded = true;
        console.log(`[WizardAudio] RASP Rust WASM Initialized (${rasp.version()})`);
        return true;
      } catch (err) {
        console.warn('[WizardAudio] RASP WASM load fallback to native Web Audio:', err);
        return false;
      }
    })();

    return this.raspLoadingPromise;
  }

  public async playDialogue(
    pieceType: string,
    eventType: 'move' | 'capture' | 'check' | 'checkmate',
    color: 'w' | 'b' = 'w',
    fromR: number = 3,
    fromC: number = 3
  ): Promise<void> {
    if (this.isMuted || !this.initContext() || !this.ctx || !this.masterGain) return;

    try {
      const manifestRes = await fetch('/src/dialogueManifest.json');
      if (!manifestRes.ok) return;
      const manifest = await manifestRes.json();
      const voiceSetKey = this.getVoiceSet(color);
      const teamData = manifest[voiceSetKey] || manifest[color] || manifest.w;
      if (!teamData) return;
      const pieceData = teamData[pieceType];
      if (!pieceData) return;
      const lines = pieceData[eventType];
      if (!lines || !Array.isArray(lines) || lines.length === 0) return;

      const chosen = lines[Math.floor(Math.random() * lines.length)];
      if (!chosen || !chosen.file) return;

      let rawBytes = this.dialogueRawCache.get(chosen.file);
      if (!rawBytes) {
        const audioRes = await fetch(chosen.file);
        if (!audioRes.ok) return;
        const arrayBuf = await audioRes.arrayBuffer();
        rawBytes = new Uint8Array(arrayBuf);
        this.dialogueRawCache.set(chosen.file, rawBytes);
      }

      // Unique deterministic seed for this specific piece instance on the board
      // e.g. "pawn-w-1-4", "pawn-b-6-2"
      const pieceSeed = `${color}-${pieceType}-${fromR}-${fromC}`;
      let audioBuffer: AudioBuffer | null = null;

      // Try RASP Rust WASM formant and pitch voice modulation first!
      const raspReady = await this.initRasp();
      if (raspReady && this.raspModule?.render) {
        try {
          const renderedSamples: Float32Array = this.raspModule.render(rawBytes, pieceSeed);
          if (renderedSamples && renderedSamples.length > 0) {
            audioBuffer = this.ctx.createBuffer(1, renderedSamples.length, 48000);
            audioBuffer.getChannelData(0).set(renderedSamples);
          }
        } catch (wasmErr) {
          console.warn('[WizardAudio] RASP render error:', wasmErr);
        }
      }

      // Fallback decode if WASM render not available
      if (!audioBuffer) {
        audioBuffer = await this.ctx.decodeAudioData(rawBytes.buffer.slice(0) as ArrayBuffer);
      }

      const source = this.ctx.createBufferSource();
      source.buffer = audioBuffer;

      // Spatial 3D Stereo Panning based on board column (queenside = left, kingside = right)
      let finalNode: AudioNode = source;
      if ('createStereoPanner' in this.ctx) {
        const panner = this.ctx.createStereoPanner();
        const panValue = Math.max(-0.65, Math.min(0.65, ((fromC - 3.5) / 3.5) * 0.55));
        panner.pan.setValueAtTime(panValue, this.ctx.currentTime);
        source.connect(panner);
        finalNode = panner;
      }

      const voiceGain = this.ctx.createGain();
      voiceGain.gain.setValueAtTime(0.9, this.ctx.currentTime);

      finalNode.connect(voiceGain);
      voiceGain.connect(this.masterGain);

      source.start();
    } catch {
      // Gracefully ignore audio decode/fetch errors
    }
  }
}

export const wizardAudio = new WizardChessAudioEngine();
