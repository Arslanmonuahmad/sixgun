// Studio Sample-Based & Physical PCM Audio Engine for Volleyball & Gun Fight!
// Loads and plays 44.1kHz 16-bit PCM WAV SFX from /sfx/*.wav with instant in-memory PCM sample buffers
// for zero-latency shooter firearms, human hurt/death vocalizations, and realistic leather volleyball impacts.

type SfxSampleKey =
  | 'assault_rifle'
  | 'shotgun_blast'
  | 'bullet_hit'
  | 'male_hurt'
  | 'female_hurt'
  | 'player_hurt'
  | 'player_death'
  | 'female_death'
  | 'kaun_hai_re'
  | 'birds_forest_nature'
  | 'ball_bump'
  | 'ball_spike'
  | 'ball_bounce';

const FEMALE_CHARACTER_IDS = new Set([
  'strawberry_kid', // BERRY
  'purple_shades',  // MAYA
  'pink_visor',     // MOCHI
  'astro_bean',     // NOVA
]);

class CrayonAudioEngine {
  private ctx: AudioContext | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private sampleBuffers: Map<SfxSampleKey, AudioBuffer> = new Map();
  private rawArrayBuffers: Map<SfxSampleKey, ArrayBuffer> = new Map();
  private wavFetchStarted: boolean = false;
  public muted: boolean = false;
  public sfxVolume: number = 0.8;
  public musicVolume: number = 0.65;
  private lastFootstepTime: number = 0;
  private lastHurtTime: number = 0;
  private lastEnemyHurtTime: number = 0;
  private lastDeathSoundTime: number = 0;
  private lastKaunHaiReTime: number = 0;
  private kaunHaiRePlayedCount: number = 0;
  private kaunHaiReMaxPerMatch: number = 2;
  private playerDeathsInMatch: number = 0;
  private lastAiGunTime: number = 0;
  private lastFlameTime: number = 0;
  private lastHitMarkerTime: number = 0;
  private activeHurtSources: Set<AudioBufferSourceNode> = new Set();

  // Background forest birds & nature ambience state (5% volume in Volleyball, 2% volume in Gun Fight)
  private natureAmbienceWanted: boolean = false;
  private natureAmbienceBaseVolume: number = 0.05;
  private natureSourceNode: AudioBufferSourceNode | null = null;
  private natureGainNode: GainNode | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      // Pre-fetch raw WAV bytes immediately on app startup so real studio recordings are ready on first click
      this.prefetchRawWavBytes();
    }
  }

  /**
   * Resets per-match voice counters at the start of a Gun Fight match so "Kaun hai re?!" plays 1 to 3 times max!
   */
  public resetGunMatchVoiceState() {
    this.kaunHaiRePlayedCount = 0;
    this.kaunHaiReMaxPerMatch = 1 + Math.floor(Math.random() * 3); // 1 to 3 times max in the whole match
    this.playerDeathsInMatch = 0;
    this.lastKaunHaiReTime = 0;
  }

  public isFemaleCharacter(charId?: string): boolean {
    if (!charId) return false;
    return FEMALE_CHARACTER_IDS.has(charId);
  }

  private prefetchRawWavBytes() {
    const keys: SfxSampleKey[] = [
      'assault_rifle',
      'shotgun_blast',
      'bullet_hit',
      'male_hurt',
      'female_hurt',
      'player_hurt',
      'player_death',
      'female_death',
      'kaun_hai_re',
      'birds_forest_nature',
      'ball_bump',
      'ball_spike',
      'ball_bounce',
    ];
    keys.forEach((key) => {
      fetch(`/sfx/${key}.wav`)
        .then((res) => (res.ok ? res.arrayBuffer() : Promise.reject()))
        .then((buf) => {
          this.rawArrayBuffers.set(key, buf);
          if (this.ctx) {
            this.decodeSingleWav(this.ctx, key, buf);
          }
        })
        .catch(() => {});
    });
  }

  private decodeSingleWav(ctx: AudioContext, key: SfxSampleKey, rawBuf: ArrayBuffer) {
    ctx
      .decodeAudioData(rawBuf.slice(0))
      .then((decoded) => {
        this.sampleBuffers.set(key, decoded);
        if (key === 'birds_forest_nature' && this.natureAmbienceWanted && this.ctx) {
          this.restartNatureLoopWithBuffer(this.ctx, decoded);
        }
      })
      .catch(() => {});
  }

  private getContext(): AudioContext | null {
    if (this.muted || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.initInstantPcmSamples(this.ctx);
        this.preloadWavFiles(this.ctx);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    if (this.natureAmbienceWanted && !this.natureSourceNode && this.ctx) {
      this.startNatureLoopInternal(this.ctx);
    }
    return this.ctx;
  }

  /**
   * Decodes all pre-fetched or remaining 44.1kHz WAV files from /sfx/*.wav into Web Audio API AudioBuffers
   */
  private preloadWavFiles(ctx: AudioContext) {
    if (this.wavFetchStarted) return;
    this.wavFetchStarted = true;
    const keys: SfxSampleKey[] = [
      'assault_rifle',
      'shotgun_blast',
      'bullet_hit',
      'male_hurt',
      'female_hurt',
      'player_hurt',
      'player_death',
      'female_death',
      'kaun_hai_re',
      'birds_forest_nature',
      'ball_bump',
      'ball_spike',
      'ball_bounce',
    ];
    keys.forEach((key) => {
      const cachedRaw = this.rawArrayBuffers.get(key);
      if (cachedRaw) {
        this.decodeSingleWav(ctx, key, cachedRaw);
      } else {
        fetch(`/sfx/${key}.wav`)
          .then((res) => (res.ok ? res.arrayBuffer() : Promise.reject()))
          .then((buf) => {
            this.rawArrayBuffers.set(key, buf);
            this.decodeSingleWav(ctx, key, buf);
          })
          .catch(() => {});
      }
    });
  }

  /**
   * Biquad filter helper for building instant non-vocal impact buffers before async WAV decode finishes
   */
  private filterPcm(
    input: Float32Array,
    sr: number,
    type: 'bandpass' | 'lowpass',
    freq: number,
    q: number
  ): Float32Array {
    const out = new Float32Array(input.length);
    const w0 = (2 * Math.PI * freq) / sr;
    const cosw0 = Math.cos(w0);
    const sinw0 = Math.sin(w0);
    const alpha = sinw0 / (2 * q);
    let b0 = 0,
      b1 = 0,
      b2 = 0;
    const a0 = 1 + alpha;
    const a1 = (-2 * cosw0) / a0;
    const a2 = (1 - alpha) / a0;
    if (type === 'bandpass') {
      b0 = alpha / a0;
      b1 = 0;
      b2 = -alpha / a0;
    } else {
      b0 = (1 - cosw0) / 2 / a0;
      b1 = (1 - cosw0) / a0;
      b2 = (1 - cosw0) / 2 / a0;
    }
    let x1 = 0,
      x2 = 0,
      y1 = 0,
      y2 = 0;
    for (let i = 0; i < input.length; i++) {
      const x0 = input[i];
      const y0 = b0 * x0 + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
      out[i] = y0;
      x2 = x1;
      x1 = x0;
      y2 = y1;
      y1 = y0;
    }
    return out;
  }

  /**
   * Builds only non-vocal physical impact fallbacks (gunshots, bullet hit, ball hits) for the first 10ms before WAV decode.
   * Hurt and death vocalizations NEVER use synthetic oscillators — they exclusively play the real recorded WAV files!
   */
  private initInstantPcmSamples(ctx: AudioContext) {
    const sr = ctx.sampleRate;

    // 1. Crisp Bullet Impact Hit Marker
    {
      const N = Math.floor(sr * 0.08);
      const buf = ctx.createBuffer(1, N, sr);
      const raw = new Float32Array(N);
      for (let i = 0; i < N; i++) raw[i] = Math.random() * 2 - 1;
      const fleshSnap = this.filterPcm(raw, sr, 'bandpass', 1650, 1.5);
      const bodyThud = this.filterPcm(raw, sr, 'lowpass', 260, 0.9);
      const out = buf.getChannelData(0);
      for (let i = 0; i < N; i++) {
        const t = i / sr;
        const env = Math.min(1, t / 0.001) * Math.exp(-t * 68);
        const punch =
          Math.sin(2 * Math.PI * (90 + 130 * Math.exp(-t * 110)) * t) *
          Math.exp(-t * 60) *
          0.6;
        out[i] =
          Math.tanh((punch + fleshSnap[i] * env * 0.7 + bodyThud[i] * env * 0.8) * 1.4) *
          0.8;
      }
      if (!this.sampleBuffers.has('bullet_hit')) {
        this.sampleBuffers.set('bullet_hit', buf);
      }
    }

    // 2. Warm Volleyball Bump / Pass PCM Buffer
    {
      const N = Math.floor(sr * 0.15);
      const buf = ctx.createBuffer(1, N, sr);
      const raw = new Float32Array(N);
      for (let i = 0; i < N; i++) raw[i] = Math.random() * 2 - 1;
      const warmLeather = this.filterPcm(raw, sr, 'bandpass', 820, 2.0);
      const out = buf.getChannelData(0);
      let pFund = 0,
        pCavity = 0,
        pSub = 0;
      for (let i = 0; i < N; i++) {
        const t = i / sr;
        const attack = Math.min(1, t / 0.002);
        const fFund = 110 + 90 * Math.exp(-t * 62);
        const fCavity = 270 + 52 * Math.exp(-t * 75);
        const fSub = 68 + 42 * Math.exp(-t * 50);
        pFund += (2 * Math.PI * fFund) / sr;
        pCavity += (2 * Math.PI * fCavity) / sr;
        pSub += (2 * Math.PI * fSub) / sr;
        const body = Math.sin(pFund) * Math.exp(-t * 34) * 0.58;
        const cavity = Math.sin(pCavity) * Math.exp(-t * 52) * 0.25;
        const sub = Math.sin(pSub) * Math.exp(-t * 42) * 0.32;
        const touch = warmLeather[i] * Math.exp(-t * 110) * 0.2;
        out[i] = Math.tanh(attack * (body + cavity + sub + touch) * 1.25) * 0.8;
      }
      if (!this.sampleBuffers.has('ball_bump')) {
        this.sampleBuffers.set('ball_bump', buf);
      }
    }

    // 3. Volleyball Spike PCM Buffer
    {
      const N = Math.floor(sr * 0.2);
      const buf = ctx.createBuffer(1, N, sr);
      const raw = new Float32Array(N);
      for (let i = 0; i < N; i++) raw[i] = Math.random() * 2 - 1;
      const palmSnap = this.filterPcm(raw, sr, 'bandpass', 1120, 1.8);
      const out = buf.getChannelData(0);
      let pSub = 0,
        pBody = 0;
      for (let i = 0; i < N; i++) {
        const t = i / sr;
        const attack = Math.min(1, t / 0.002);
        const fSub = 66 + 115 * Math.exp(-t * 52);
        const fBody = 130 + 110 * Math.exp(-t * 60);
        pSub += (2 * Math.PI * fSub) / sr;
        pBody += (2 * Math.PI * fBody) / sr;
        const subBoom = Math.sin(pSub) * Math.exp(-t * 28) * 0.55;
        const midPunch = Math.sin(pBody) * Math.exp(-t * 36) * 0.44;
        const snap = palmSnap[i] * Math.exp(-t * 90) * 0.3;
        out[i] = Math.tanh(attack * (subBoom + midPunch + snap) * 1.3) * 0.82;
      }
      if (!this.sampleBuffers.has('ball_spike')) {
        this.sampleBuffers.set('ball_spike', buf);
      }
    }

    // 4. Court / Sand Bounce PCM Buffer
    {
      const N = Math.floor(sr * 0.14);
      const buf = ctx.createBuffer(1, N, sr);
      const raw = new Float32Array(N);
      for (let i = 0; i < N; i++) raw[i] = Math.random() * 2 - 1;
      const softSand = this.filterPcm(raw, sr, 'lowpass', 540, 0.9);
      const out = buf.getChannelData(0);
      let pThud = 0;
      for (let i = 0; i < N; i++) {
        const t = i / sr;
        const attack = Math.min(1, t / 0.0025);
        const fThud = 60 + 80 * Math.exp(-t * 52);
        pThud += (2 * Math.PI * fThud) / sr;
        const thud = Math.sin(pThud) * Math.exp(-t * 34) * 0.58;
        const sand = softSand[i] * Math.exp(-t * 65) * 0.2;
        out[i] = Math.tanh(attack * (thud + sand) * 1.25) * 0.78;
      }
      if (!this.sampleBuffers.has('ball_bounce')) {
        this.sampleBuffers.set('ball_bounce', buf);
      }
    }
  }

  /**
   * Starts or stops the 5% volume background Forest Birds & Nature ambience for both Volleyball and Gun Fight!
   */
  public setVolleyballNatureAmbience(active: boolean, baseVolume: number = 0.05) {
    this.natureAmbienceWanted = active;
    this.natureAmbienceBaseVolume = baseVolume;
    if (!active || this.muted) {
      this.stopNatureLoopInternal();
      return;
    }
    const ctx = this.getContext();
    if (ctx) {
      this.startNatureLoopInternal(ctx);
      this.syncVolleyballNatureAmbienceVolume();
    }
  }

  /**
   * Keeps the background forest birds music volume at ~5% in both Volleyball and Gun Fight!
   */
  public syncVolleyballNatureAmbienceVolume() {
    if (this.muted || !this.natureAmbienceWanted) {
      this.stopNatureLoopInternal();
      return;
    }
    if (this.natureGainNode && this.ctx) {
      const musicSliderScale = Math.min(1.5, Math.max(0, this.musicVolume / 0.65));
      const targetGain =
        this.musicVolume <= 0.01
          ? 0.0001
          : this.natureAmbienceBaseVolume * musicSliderScale;
      this.natureGainNode.gain.setTargetAtTime(
        targetGain,
        this.ctx.currentTime,
        0.15
      );
    } else if (this.natureAmbienceWanted && !this.natureSourceNode) {
      const ctx = this.getContext();
      if (ctx) this.startNatureLoopInternal(ctx);
    }
  }

  private startNatureLoopInternal(ctx: AudioContext) {
    if (this.natureSourceNode) return;
    const buffer = this.sampleBuffers.get('birds_forest_nature');
    if (!buffer) return;

    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;

    const gain = ctx.createGain();
    const musicSliderScale = Math.min(1.5, Math.max(0, this.musicVolume / 0.65));
    const targetGain =
      this.muted || this.musicVolume <= 0.01
        ? 0.0001
        : this.natureAmbienceBaseVolume * musicSliderScale;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.setTargetAtTime(targetGain, ctx.currentTime, 0.35);

    src.connect(gain);
    gain.connect(ctx.destination);
    src.start(ctx.currentTime);

    this.natureSourceNode = src;
    this.natureGainNode = gain;
  }

  private restartNatureLoopWithBuffer(ctx: AudioContext, buffer: AudioBuffer) {
    this.stopNatureLoopInternal();
    this.sampleBuffers.set('birds_forest_nature', buffer);
    if (this.natureAmbienceWanted && !this.muted) {
      this.startNatureLoopInternal(ctx);
    }
  }

  private stopNatureLoopInternal() {
    if (this.natureSourceNode) {
      try {
        this.natureSourceNode.stop();
        this.natureSourceNode.disconnect();
      } catch {
        // ignore if already stopped
      }
      this.natureSourceNode = null;
    }
    if (this.natureGainNode) {
      try {
        this.natureGainNode.disconnect();
      } catch {
        // ignore
      }
      this.natureGainNode = null;
    }
  }

  /**
   * Plays a preloaded real WAV sample buffer
   */
  private playSample(
    key: SfxSampleKey,
    volume: number = 0.5,
    playbackRate: number = 1.0,
    trackAsHurt: boolean = false
  ): boolean {
    const ctx = this.getContext();
    if (!ctx || this.sfxVolume <= 0.01) return false;
    const buffer = this.sampleBuffers.get(key);
    if (!buffer) return false;

    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.playbackRate.setValueAtTime(playbackRate, ctx.currentTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(this.scaleGain(volume), ctx.currentTime);

    src.connect(gain);
    gain.connect(ctx.destination);
    if (trackAsHurt) {
      this.activeHurtSources.add(src);
      src.onended = () => {
        this.activeHurtSources.delete(src);
      };
    }
    src.start(ctx.currentTime);
    return true;
  }

  private stopActiveHurtSounds() {
    this.activeHurtSources.forEach((src) => {
      try {
        src.stop();
        src.disconnect();
      } catch {
        // ignore
      }
    });
    this.activeHurtSources.clear();
  }

  private getNoiseBuffer(ctx: AudioContext): AudioBuffer {
    if (this.noiseBuffer && this.noiseBuffer.sampleRate === ctx.sampleRate) {
      return this.noiseBuffer;
    }
    const bufferSize = Math.floor(ctx.sampleRate * 0.5);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    this.noiseBuffer = buffer;
    return buffer;
  }

  private scaleGain(base: number, isMusic: boolean = false): number {
    const mult = isMusic ? this.musicVolume : this.sfxVolume;
    return Math.max(0.0005, base * Math.max(0, Math.min(1, mult)));
  }

  /**
   * VOLLEYBALL: Warm Leather Volleyball Bump / Pass
   */
  public playBallPop(_rallyCount: number = 1, isSweetSpot: boolean = false) {
    if (isSweetSpot) {
      this.playRainbowSmash();
      return;
    }
    const rate = 0.96 + Math.random() * 0.08;
    this.playSample('ball_bump', 0.48, rate);
  }

  /**
   * VOLLEYBALL: Overhead Serve Hit
   */
  public playServeHit() {
    const rate = 0.94 + Math.random() * 0.07;
    this.playSample('ball_spike', 0.56, rate);
  }

  /**
   * VOLLEYBALL: Finger-Set Pop
   */
  public playSetLift() {
    const rate = 1.14 + Math.random() * 0.07;
    this.playSample('ball_bump', 0.42, rate);
  }

  /**
   * VOLLEYBALL & DODGEBALL: Court Floor Bounce
   */
  public playBallFloorBounce(intensity: number = 1.0) {
    const vol = Math.min(1, Math.max(0.35, intensity));
    const rate = 0.95 + Math.random() * 0.08;
    this.playSample('ball_bounce', 0.48 * vol, rate);
  }

  public playBallBounce(intensity: number = 1.0) {
    this.playBallFloorBounce(intensity);
  }

  /**
   * VOLLEYBALL: Power Spike
   */
  public playRainbowSmash() {
    const rate = 0.97 + Math.random() * 0.06;
    this.playSample('ball_spike', 0.65, rate);
  }

  public playSpikeHit(isSuper: boolean = false, _isSweet: boolean = false) {
    const rate = isSuper ? 0.92 : 0.98 + Math.random() * 0.06;
    this.playSample('ball_spike', isSuper ? 0.72 : 0.58, rate);
  }

  /**
   * DODGEBALL: High-Velocity Throw Whoosh & Leather Snap
   */
  public playDodgeballThrow(isSuper: boolean = false) {
    const rate = isSuper ? 0.9 : 1.02 + Math.random() * 0.06;
    this.playSample('ball_spike', isSuper ? 0.72 : 0.56, rate);
  }

  /**
   * DODGEBALL: Heavy Rubber Ball Body Smack + Guaranteed Hurt/KO Voice
   */
  public playDodgeballHit(
    victimCharId?: string,
    isSuper: boolean = false,
    isKo: boolean = false
  ) {
    const ctx = this.getContext();
    if (!ctx || this.sfxVolume <= 0.01) return;

    // 1. Punchy ball smack + flesh hit marker
    this.playSample('bullet_hit', isSuper ? 0.58 : 0.46, 0.94 + Math.random() * 0.08);
    this.playSample('ball_spike', isSuper ? 0.68 : 0.52, 0.88 + Math.random() * 0.08);

    // 2. Guaranteed Hurt or KO Voice so every Dodgeball hit feels impactful!
    const isFemale = this.isFemaleCharacter(victimCharId);
    if (isKo) {
      this.stopActiveHurtSounds();
      this.playSample(
        isFemale ? 'female_death' : 'player_death',
        0.85,
        0.98 + Math.random() * 0.04
      );
    } else {
      const sampleKey: SfxSampleKey = isFemale ? 'female_hurt' : 'male_hurt';
      this.playSample(sampleKey, 0.55, 0.98 + Math.random() * 0.05, true);
    }
  }

  /**
   * DODGEBALL: Crisp Mid-Air Catch Pop & Reflex Chime
   */
  public playDodgeballCatch() {
    this.playSample('ball_bump', 0.62, 1.12);
    this.playMedkitPickup();
  }

  /**
   * BOTH GAMES: Soft Jump Thud (No high-pitched "souun" sine sweep!)
   */
  public playJump() {
    const ctx = this.getContext();
    if (!ctx || this.sfxVolume <= 0.01) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(115, now);
    osc.frequency.exponentialRampToValueAtTime(65, now + 0.055);

    gain.gain.setValueAtTime(this.scaleGain(0.14), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.065);
  }

  public playJumpBoing() {
    this.playJump();
  }

  /**
   * BOTH GAMES: Subtle Soft Footstep Tap (Rate-limited so it never spams)
   */
  public playFootstep() {
    const ctx = this.getContext();
    if (!ctx || this.sfxVolume <= 0.01) return;

    const now = ctx.currentTime;
    if (now - this.lastFootstepTime < 0.3) return;
    this.lastFootstepTime = now;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    const pitch = 95 + Math.random() * 18;
    osc.frequency.setValueAtTime(pitch, now);
    osc.frequency.exponentialRampToValueAtTime(42, now + 0.038);
    gain.gain.setValueAtTime(this.scaleGain(0.09), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.042);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.045);
  }

  /**
   * GUN FIGHT: Subtle Jump Pad Thump
   */
  public playSpringPadBoing() {
    this.playJump();
  }

  /**
   * GUN FIGHT: Medkit Health Pickup Chime (+HP)
   */
  public playMedkitPickup() {
    const ctx = this.getContext();
    if (!ctx || this.sfxVolume <= 0.01) return;

    const now = ctx.currentTime;
    const healNotes = [523.25, 659.25];
    healNotes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      const start = now + idx * 0.045;
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(this.scaleGain(0.14), start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.16);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.18);
    });
  }

  /**
   * BOTH GAMES: Dash / Dive Impact
   */
  public playDive() {
    this.playSample('ball_bounce', 0.32, 1.15);
  }

  /**
   * VOLLEYBALL: Elastic Net-Cord Thump
   */
  public playNetTouch() {
    this.playSample('ball_bounce', 0.36, 0.85);
  }

  public playPointScored(playerWonPoint: boolean) {
    const ctx = this.getContext();
    if (!ctx || this.musicVolume <= 0.01) return;

    const now = ctx.currentTime;
    const notes = playerWonPoint
      ? [523.25, 659.25, 783.99]
      : [392.0, 311.13, 261.63];

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      const startTime = now + idx * 0.075;
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(this.scaleGain(0.22, true), startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.24);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + 0.26);
    });
  }

  public playStarCollect() {
    this.playMedkitPickup();
  }

  public playButtonClick() {
    const ctx = this.getContext();
    if (!ctx || this.sfxVolume <= 0.01) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(720, now + 0.03);
    gain.gain.setValueAtTime(this.scaleGain(0.09), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.038);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.042);
  }

  public playMenuClick() {
    this.playButtonClick();
  }

  public playScoreCheer() {
    this.playPointScored(true);
  }

  /**
   * VOLLEYBALL: Referee Whistle on Serve
   */
  public playServeWhistle() {
    const ctx = this.getContext();
    if (!ctx || this.sfxVolume <= 0.01) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(2150, now);
    osc.frequency.setValueAtTime(2260, now + 0.04);
    gain.gain.setValueAtTime(this.scaleGain(0.22), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  public playSpikeBoom() {
    this.playRainbowSmash();
  }

  /**
   * GUN FIGHT: Real Studio Recorded Firearm Gun Shot (/sfx/assault_rifle.wav — lowered so it's comfortable and never masks voices!)
   */
  public playGunShot(isPlayer: boolean = true) {
    const ctx = this.getContext();
    if (!ctx) return;
    if (!isPlayer) {
      if (ctx.currentTime - this.lastAiGunTime < 0.11) return;
      this.lastAiGunTime = ctx.currentTime;
    }
    const volScale = isPlayer ? 0.24 : 0.075;
    const rate = 0.96 + Math.random() * 0.07;
    this.playSample('assault_rifle', volScale, rate);
  }

  /**
   * GUN FIGHT: Real Studio Recorded Pump Shotgun Blast (/sfx/shotgun_blast.wav — lowered so it's comfortable!)
   */
  public playShotgunBlast(isPlayer: boolean = true) {
    const ctx = this.getContext();
    if (!ctx) return;
    if (!isPlayer) {
      if (ctx.currentTime - this.lastAiGunTime < 0.14) return;
      this.lastAiGunTime = ctx.currentTime;
    }
    const volScale = isPlayer ? 0.28 : 0.095;
    const rate = 0.96 + Math.random() * 0.06;
    this.playSample('shotgun_blast', volScale, rate);
  }

  /**
   * GUN FIGHT: Clean Non-Sweeping Flamethrower Air Burst
   */
  public playFlamethrowerWhoosh(isPlayer: boolean = true) {
    const ctx = this.getContext();
    if (!ctx || this.sfxVolume <= 0.01) return;

    const now = ctx.currentTime;
    if (now - this.lastFlameTime < 0.12) return;
    this.lastFlameTime = now;

    const volScale = isPlayer ? 0.1 : 0.04;

    const noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = this.getNoiseBuffer(ctx);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(340, now);
    filter.Q.setValueAtTime(0.5, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(this.scaleGain(volScale), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    noiseSrc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noiseSrc.start(now);
    noiseSrc.stop(now + 0.1);
  }

  /**
   * GUN FIGHT: Tactical Weapon Crate Pickup
   */
  public playWeaponPickup() {
    this.playMedkitPickup();
  }

  /**
   * GUN FIGHT: Crisp Bullet Impact Hit Marker (/sfx/bullet_hit.wav)
   */
  public playHitMarker() {
    const ctx = this.getContext();
    if (!ctx) return;
    if (ctx.currentTime - this.lastHitMarkerTime < 0.065) return;
    this.lastHitMarkerTime = ctx.currentTime;
    const rate = 0.96 + Math.random() * 0.08;
    this.playSample('bullet_hit', 0.26, rate);
  }

  /**
   * GUN FIGHT: Occasional Human Hurt Vocalization (Not on every hit — 3.5s cooldown & 32% chance!)
   */
  public playPlayerHurt(charId?: string) {
    const ctx = this.getContext();
    if (!ctx || this.sfxVolume <= 0.01) return;

    const now = ctx.currentTime;
    if (now - this.lastHurtTime < 3.5) return;
    if (Math.random() > 0.32) return;
    this.lastHurtTime = now;

    const sampleKey: SfxSampleKey = this.isFemaleCharacter(charId)
      ? 'female_hurt'
      : 'male_hurt';
    const rate = 0.98 + Math.random() * 0.04;
    this.playSample(sampleKey, 0.54, rate, true);
  }

  /**
   * GUN FIGHT: Occasional Enemy Hurt Vocalization (Not on every hit — 4.2s cooldown & 28% chance!)
   */
  public playEnemyHurt(charId?: string) {
    const ctx = this.getContext();
    if (!ctx || this.sfxVolume <= 0.01) return;

    const now = ctx.currentTime;
    if (now - this.lastEnemyHurtTime < 4.2) return;
    if (Math.random() > 0.28) return;
    this.lastEnemyHurtTime = now;

    const sampleKey: SfxSampleKey = this.isFemaleCharacter(charId)
      ? 'female_hurt'
      : 'male_hurt';
    const rate = 0.98 + Math.random() * 0.05;
    this.playSample(sampleKey, 0.36, rate, true);
  }

  /**
   * GUN FIGHT: Human Death / KO Sound & "Kaun hai re?!" (1 to 3 times max per Gun Fight match when player gets killed!)
   * Also rate-limited so death sounds don't trigger on every single elimination constantly.
   */
  public playDeathSound(
    isPlayerVictim: boolean = false,
    isPlayerKiller: boolean = false,
    charId?: string
  ) {
    const ctx = this.getContext();
    if (!ctx || this.sfxVolume <= 0.01) return;

    const now = ctx.currentTime;

    // 1. When YOU (the player) get killed: play "Kaun hai re?!" 1 to 3 times max across the whole Gun Fight match!
    if (isPlayerVictim) {
      this.stopActiveHurtSounds();
      this.playerDeathsInMatch += 1;

      const canPlayKaunHaiRe =
        this.kaunHaiRePlayedCount < this.kaunHaiReMaxPerMatch &&
        (this.lastKaunHaiReTime === 0 || now - this.lastKaunHaiReTime > 10.0) &&
        (this.playerDeathsInMatch === 1 || Math.random() < 0.55);

      if (canPlayKaunHaiRe && this.sampleBuffers.has('kaun_hai_re')) {
        this.kaunHaiRePlayedCount += 1;
        this.lastKaunHaiReTime = now;
        this.lastDeathSoundTime = now;
        this.playSample('kaun_hai_re', 0.95, 1.0);
        return;
      }

      // Otherwise play normal player death sound ~50% of the time (not always!)
      if (now - this.lastDeathSoundTime < 3.0 || Math.random() > 0.5) {
        return;
      }
      this.lastDeathSoundTime = now;
      const isFemale = this.isFemaleCharacter(charId);
      this.playSample(
        isFemale ? 'female_death' : 'player_death',
        0.88,
        0.98 + Math.random() * 0.04
      );
      return;
    }

    // 2. When an AI enemy dies: only play occasionally (when player gets a kill & 45% chance with 3.5s cooldown) so it's never spammy!
    if (!isPlayerKiller) return;
    if (now - this.lastDeathSoundTime < 3.5) return;
    if (Math.random() > 0.45) return;

    this.stopActiveHurtSounds();
    this.lastDeathSoundTime = now;

    const isFemale = this.isFemaleCharacter(charId);
    const sampleKey: SfxSampleKey = isFemale ? 'female_death' : 'player_death';
    this.playSample(sampleKey, 0.85, 0.98 + Math.random() * 0.05);
  }

  /**
   * GUN FIGHT: Legacy alias that calls the real KO sound
   */
  public playElimination(isPlayerKill: boolean = true, charId?: string) {
    this.playDeathSound(!isPlayerKill, isPlayerKill, charId);
  }

  /**
   * GUN FIGHT: Respawn Sound (Subtle soft chime)
   */
  public playRespawnSound() {
    this.playButtonClick();
  }

  /**
   * GUN FIGHT: Wall Ricochet (Silenced so missed bullets never make annoying 'souun' sweeps!)
   */
  public playWallRicochet() {
    // Intentionally silent so stray bullets hitting walls never create repetitive sine sweeps
  }

  /**
   * GUN FIGHT: Gentle 3-2-1 Countdown Beep & "FIGHT!" / Overtime Chord
   */
  public playCountdownBeep(isFinalGo: boolean = false) {
    const ctx = this.getContext();
    if (!ctx || this.sfxVolume <= 0.01) return;

    const now = ctx.currentTime;
    if (isFinalGo) {
      [523.25, 659.25, 783.99].forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(this.scaleGain(0.16), now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.27);
      });
    } else {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now);
      gain.gain.setValueAtTime(this.scaleGain(0.14), now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.12);
    }
  }

  public playVictoryFanfare() {
    const ctx = this.getContext();
    if (!ctx || this.musicVolume <= 0.01) return;

    const now = ctx.currentTime;
    const fanfare = [523.25, 659.25, 783.99, 1046.5];
    fanfare.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      const start = now + idx * 0.085;
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(this.scaleGain(0.16, true), start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.32);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.34);
    });
  }

  public playLoseStinger() {
    this.playPointScored(false);
  }

  public playExplosionBoom() {
    this.playShotgunBlast(false);
  }

  public playSuperUltimate() {
    this.playMedkitPickup();
  }
}

export const crayonAudio = new CrayonAudioEngine();
