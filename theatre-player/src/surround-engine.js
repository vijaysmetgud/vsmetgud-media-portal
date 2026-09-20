/**
 * surround-engine.js
 * ---------------------------------------------------------------------------
 * "Home-theatre / Atmos-style" audio for any <video> or <audio> element,
 * built only on the Web Audio API (no libraries, no licences).
 *
 * What it does
 *   - Builds a virtual 5.1 + 2 height-speaker room (FL FR C LFE SL SR + TL TR).
 *   - Real 5.1 tracks are used as they are. Stereo tracks are up-mixed:
 *     centre (dialogue) from L+R, surrounds from the L-R "side" signal,
 *     bass channel from the low end, heights from the highs of fronts+surrounds.
 *   - Adds room reverb, dialogue presence EQ, bass shelf and a compressor
 *     (the "night" preset squashes loud explosions / quiet dialogue).
 *
 * Three output modes
 *   'speakers'     stereo tower speakers / TV / laptop  -> wide-stage fold-down
 *   'headphones'   binaural HRTF, each virtual speaker is placed around you
 *   'multichannel' real 5.1 output to an AV receiver / soundbar over HDMI
 *                  (needs the OS sound device set to 5.1 or 7.1)
 *   'auto'         multichannel when the device offers >= 6 channels, else speakers
 *
 * Note: this is virtual surround, not a licensed Dolby Atmos decoder.
 *
 * Usage
 *   import { SurroundEngine } from './surround-engine.js';
 *   const engine = SurroundEngine.attach(videoElement);
 *   button.onclick = () => engine.enable('cinema');   // must be a user click
 *   engine.setPreset('music');
 *   engine.setParam('bass', 0.8);                     // bass|space|height|dialogue 0..1
 *   engine.setOutputMode('headphones');
 *   engine.disable();
 * ---------------------------------------------------------------------------
 */

const PRESETS = {
  cinema:   { bass: 0.60, space: 0.45, height: 0.60, dialogue: 0.50, night: false },
  music:    { bass: 0.45, space: 0.30, height: 0.35, dialogue: 0.15, night: false },
  dialogue: { bass: 0.35, space: 0.25, height: 0.30, dialogue: 0.90, night: false },
  night:    { bass: 0.25, space: 0.30, height: 0.40, dialogue: 0.80, night: true }
};

// virtual speaker positions for headphone mode: [azimuth deg (+ = right), elevation deg]
const HRTF_POSITIONS = {
  FL: [-30, 0], FR: [30, 0], C: [0, 0],
  SL: [-110, 0], SR: [110, 0],
  TL: [-35, 50], TR: [35, 50]
};

const MASTER_LEVEL = 0.75; // headroom for the summed speakers

/* ----------------------------- small helpers ---------------------------- */

const gainNode = (ctx, v = 1) => {
  const n = ctx.createGain();
  n.gain.value = v;
  return n;
};

const biquad = (ctx, type, freq, q = 0.707, gain = 0) => {
  const n = ctx.createBiquadFilter();
  n.type = type;
  n.frequency.value = freq;
  n.Q.value = q;
  n.gain.value = gain;
  return n;
};

const delayNode = (ctx, seconds) => {
  const n = ctx.createDelay(0.1);
  n.delayTime.value = seconds;
  return n;
};

function place(panner, azimuthDeg, elevationDeg, dist = 2) {
  const a = (azimuthDeg * Math.PI) / 180;
  const e = (elevationDeg * Math.PI) / 180;
  // listener sits at the origin looking down -Z
  const x = Math.sin(a) * Math.cos(e) * dist;
  const y = Math.sin(e) * dist;
  const z = -Math.cos(a) * Math.cos(e) * dist;
  if (panner.positionX) {
    panner.positionX.value = x;
    panner.positionY.value = y;
    panner.positionZ.value = z;
  } else {
    panner.setPosition(x, y, z);
  }
}

/* --------------------------------- engine -------------------------------- */

export class SurroundEngine {

  /** One engine per element (createMediaElementSource may only be called once). */
  static attach(el) {
    if (!SurroundEngine._instances) SurroundEngine._instances = new WeakMap();
    let engine = SurroundEngine._instances.get(el);
    if (!engine) {
      engine = new SurroundEngine(el);
      SurroundEngine._instances.set(el, engine);
    }
    return engine;
  }

  constructor(el, options = {}) {
    if (!el) throw new Error('SurroundEngine needs a <video> or <audio> element');
    this.el = el;
    this.mode = options.outputMode || 'speakers';
    this.preset = 'off';
    this.params = { ...PRESETS.cinema };
    this.layout = 'stereo';      // detected source layout: 'stereo' | '5.1'
    this.forcedLayout = null;    // null = auto-detect
    this.ctx = null;
    this._active = false;
    this._r = null;              // current renderer
    this._listeners = new Set();
  }

  /* ------------------------------ public API ------------------------------ */

  /** Turn the effect on. Call from a click/tap handler (browser autoplay rules). */
  async enable(preset = 'cinema') {
    this._ensure();
    await this.ctx.resume();
    this.setPreset(preset);
  }

  disable() {
    this.setPreset('off');
  }

  setPreset(name) {
    if (name === 'off') {
      this.preset = 'off';
      this._setActive(false);
      this._emit();
      return;
    }
    if (!PRESETS[name]) throw new Error('Unknown preset: ' + name);
    this._ensure();
    this.preset = name;
    this.params = { ...PRESETS[name] };
    this._setActive(true);
    this._apply();
    this._emit();
  }

  /** name: 'bass' | 'space' | 'height' | 'dialogue', value 0..1 */
  setParam(name, value) {
    if (!(name in this.params) || name === 'night') return;
    this.params[name] = Math.min(1, Math.max(0, Number(value)));
    if (this.ctx) this._apply();
    this._emit();
  }

  /** 'speakers' | 'headphones' | 'multichannel' | 'auto' */
  setOutputMode(mode) {
    if (!['speakers', 'headphones', 'multichannel', 'auto'].includes(mode)) {
      throw new Error('Unknown output mode: ' + mode);
    }
    this.mode = mode;
    if (this._active) this._buildRenderer();
    this._emit();
  }

  /** 'auto' | 'stereo' | '5.1' - override the automatic source detection. */
  setSourceLayout(layout) {
    this.forcedLayout = layout === 'auto' ? null : layout;
    this.layout = this.forcedLayout || 'stereo';
    if (this.ctx) this._apply();
    this._emit();
  }

  /**
   * Free the audio context. Only call this after the element has been removed
   * from the page: an element that was routed through a closed context stays silent.
   */
  dispose() {
    if (this._detectTimer) clearInterval(this._detectTimer);
    if (this.ctx) {
      try { this.ctx.close(); } catch (e) { /* ignore */ }
    }
    this.ctx = null;
    this._active = false;
    this._r = null;
    this._listeners.clear();
    if (SurroundEngine._instances) SurroundEngine._instances.delete(this.el);
  }

  getState() {
    return {
      active: this._active,
      preset: this.preset,
      params: { ...this.params },
      requestedMode: this.mode,
      outputMode: this.ctx ? this._effectiveMode() : this.mode,
      maxChannels: this.ctx ? this.ctx.destination.maxChannelCount || 2 : null,
      layout: this.layout,
      layoutForced: !!this.forcedLayout,
      contextState: this.ctx ? this.ctx.state : 'not-started'
    };
  }

  onChange(fn) {
    this._listeners.add(fn);
    return () => this._listeners.delete(fn);
  }

  /* ------------------------------ graph build ----------------------------- */

  _ensure() {
    if (this.ctx) return;

    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) throw new Error('Web Audio API is not supported in this browser');

    // 'interactive' keeps output latency (and lip-sync offset) as small as possible
    const ctx = (this.ctx = new AC({ latencyHint: 'interactive' }));
    const g = (v) => gainNode(ctx, v);
    const bq = (...a) => biquad(ctx, ...a);
    const dl = (s) => delayNode(ctx, s);

    this.src = ctx.createMediaElementSource(this.el);

    // ---- bypass (dry) path and master
    this.dry = g(1);
    this.src.connect(this.dry);
    this.dry.connect(ctx.destination);

    this.master = g(0);                       // 'max' channel mode: carries 2 or 6 channels
    this.master.connect(ctx.destination);

    this.comp = ctx.createDynamicsCompressor();
    this.stereoOut = g(1);                    // stereo renderers feed this
    this.stereoOut.channelCount = 2;
    this.stereoOut.channelCountMode = 'explicit';
    this.stereoOut.channelInterpretation = 'speakers';
    this.stereoOut.connect(this.comp);
    this.comp.connect(this.master);

    // ---- force a 6-channel view of the source: stereo is up-mixed (L R only),
    //      mono becomes centre, real 5.1 passes through untouched
    this.input = g(1);
    this.input.channelCount = 6;
    this.input.channelCountMode = 'explicit';
    this.input.channelInterpretation = 'speakers';
    this.src.connect(this.input);

    const split = (this.split = ctx.createChannelSplitter(6));
    this.input.connect(split);
    // splitter outputs: 0 L, 1 R, 2 C, 3 LFE, 4 SL, 5 SR

    // ---- front L / R (with bass shelf)
    this.shelfL = bq('lowshelf', 100, 0.7, 0);
    this.shelfR = bq('lowshelf', 100, 0.7, 0);
    this.busFL = g(1);
    this.busFR = g(1);
    split.connect(this.shelfL, 0);
    split.connect(this.shelfR, 1);
    this.shelfL.connect(this.busFL);
    this.shelfR.connect(this.busFR);

    // ---- centre: real channel + dialogue derived from L+R (stereo only)
    const sumLR = g(0.5);
    split.connect(sumLR, 0);
    split.connect(sumLR, 1);

    this.cReal = g(1);
    split.connect(this.cReal, 2);
    const cHP = bq('highpass', 120);
    this.cDerive = g(0);
    sumLR.connect(cHP);
    cHP.connect(this.cDerive);
    const cSum = g(1);
    this.cReal.connect(cSum);
    this.cDerive.connect(cSum);
    this.presence = bq('peaking', 2800, 1.0, 0);
    this.busC = g(1);
    cSum.connect(this.presence);
    this.presence.connect(this.busC);

    // ---- surrounds: real channels + ambience derived from L-R (stereo only)
    this.busSL = g(1);
    this.busSR = g(1);
    split.connect(this.busSL, 4);
    split.connect(this.busSR, 5);

    const sideL = g(0.5);
    const sideR = g(-0.5);
    split.connect(sideL, 0);
    split.connect(sideR, 1);
    const sideSum = g(1);
    sideL.connect(sideSum);
    sideR.connect(sideSum);
    const sideHP = bq('highpass', 250);
    sideSum.connect(sideHP);

    this.slDerive = g(0);
    this.srDerive = g(0);
    const srInvert = g(-1);
    const slDelay = dl(0.012);
    const srDelay = dl(0.018);
    sideHP.connect(this.slDerive);
    this.slDerive.connect(slDelay);
    slDelay.connect(this.busSL);
    sideHP.connect(srInvert);
    srInvert.connect(this.srDerive);
    this.srDerive.connect(srDelay);
    srDelay.connect(this.busSR);

    // ---- LFE: real channel + low end of L+R (stereo only)
    this.lfeReal = g(1);
    split.connect(this.lfeReal, 3);
    const lp1 = bq('lowpass', 110);
    const lp2 = bq('lowpass', 110);
    this.lfeDerive = g(0);
    sumLR.connect(lp1);
    lp1.connect(lp2);
    lp2.connect(this.lfeDerive);
    this.busLFE = g(1);
    this.lfeReal.connect(this.busLFE);
    this.lfeDerive.connect(this.busLFE);

    // ---- height speakers: highs of fronts + surrounds, "air" EQ, small delay
    const makeTop = (busSide, busFront, seconds) => {
      const inN = g(1);
      const front = g(0.5);
      busSide.connect(inN);
      busFront.connect(front);
      front.connect(inN);
      const hp = bq('highpass', 500);
      const air = bq('peaking', 7500, 1.0, 5);
      const d = dl(seconds);
      const out = g(0);
      inN.connect(hp);
      hp.connect(air);
      air.connect(d);
      d.connect(out);
      return out;
    };
    this.busTL = makeTop(this.busSL, this.busFL, 0.008);
    this.busTR = makeTop(this.busSR, this.busFR, 0.011);

    // ---- room reverb
    const revIn = g(0.5);
    [this.busFL, this.busFR, this.busSL, this.busSR].forEach((b) => b.connect(revIn));
    const cSend = g(0.4);
    this.busC.connect(cSend);
    cSend.connect(revIn);

    const conv = ctx.createConvolver();
    conv.buffer = this._makeImpulse();
    const revHP = bq('highpass', 200);
    const revLP = bq('lowpass', 6500);
    this.reverbWet = g(0.2);
    revIn.connect(conv);
    conv.connect(revHP);
    revHP.connect(revLP);
    revLP.connect(this.reverbWet);

    // ---- taps: the only nodes the renderers connect from
    this.tap = {};
    const tapOf = (name, node) => {
      const t = g(1);
      node.connect(t);
      this.tap[name] = t;
    };
    tapOf('FL', this.busFL);
    tapOf('FR', this.busFR);
    tapOf('C', this.busC);
    tapOf('LFE', this.busLFE);
    tapOf('SL', this.busSL);
    tapOf('SR', this.busSR);
    tapOf('TL', this.busTL);
    tapOf('TR', this.busTR);
    tapOf('REV', this.reverbWet);

    // ---- source layout detector (real 5.1 has energy in C / SL / SR, up-mixed stereo has none)
    const makeAnalyser = () => {
      const a = ctx.createAnalyser();
      a.fftSize = 1024;
      return a;
    };
    this._an = [makeAnalyser(), makeAnalyser(), makeAnalyser()];
    split.connect(this._an[0], 2);
    split.connect(this._an[1], 4);
    split.connect(this._an[2], 5);
    this._anBuf = new Float32Array(1024);
    this._detectTimer = setInterval(() => this._detectLayoutOnce(), 500);

    const resetLayout = () => {
      if (this.forcedLayout) return;
      this.layout = 'stereo';
      this._apply();
      this._emit();
    };
    this.el.addEventListener('loadstart', resetLayout);
    this.el.addEventListener('emptied', resetLayout);
    this.el.addEventListener('play', () => {
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    });
  }

  _makeImpulse() {
    const ctx = this.ctx;
    const rate = ctx.sampleRate;
    const len = Math.floor(rate * 0.9);
    const pre = Math.floor(rate * 0.015);
    const buf = ctx.createBuffer(2, len, rate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = pre; i < len; i++) {
        const t = (i - pre) / (len - pre);
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 3.2);
      }
    }
    return buf;
  }

  _detectLayoutOnce() {
    if (!this.ctx || this.forcedLayout || this.layout === '5.1' || this.el.paused) return;
    let peak = 0;
    for (const a of this._an) {
      a.getFloatTimeDomainData(this._anBuf);
      let s = 0;
      for (let i = 0; i < this._anBuf.length; i++) s += this._anBuf[i] * this._anBuf[i];
      peak = Math.max(peak, Math.sqrt(s / this._anBuf.length));
    }
    if (peak > 0.002) {
      this.layout = '5.1';
      this._apply();
      this._emit();
    }
  }

  /* ------------------------------- renderers ------------------------------ */

  _effectiveMode() {
    const max = this.ctx.destination.maxChannelCount || 2;
    if (this.mode === 'auto') return max >= 6 ? 'multichannel' : 'speakers';
    if (this.mode === 'multichannel' && max < 6) return 'speakers'; // device cannot do 5.1
    return this.mode;
  }

  _teardownRenderer() {
    if (this._r) {
      this._r.nodes.forEach((n) => {
        try { n.disconnect(); } catch (e) { /* already disconnected */ }
      });
    }
    this._r = null;
    Object.values(this.tap || {}).forEach((t) => {
      try { t.disconnect(); } catch (e) { /* ignore */ }
    });
    // back to a normal stereo destination
    try {
      const dest = this.ctx.destination;
      dest.channelCount = 2;
      dest.channelInterpretation = 'speakers';
    } catch (e) { /* ignore */ }
  }

  _buildRenderer() {
    this._teardownRenderer();

    const ctx = this.ctx;
    const T = this.tap;
    const nodes = [];
    const track = (n) => { nodes.push(n); return n; };
    const g = (v) => track(gainNode(ctx, v));
    const mode = this._effectiveMode();

    if (mode === 'multichannel') {
      // discrete FL FR C LFE SL SR straight to the receiver
      const dest = ctx.destination;
      dest.channelCount = Math.min(6, dest.maxChannelCount);
      dest.channelInterpretation = 'discrete';

      const merger = track(ctx.createChannelMerger(6));
      const feed = (tap, index, level = 1) => {
        const n = g(level);
        tap.connect(n);
        n.connect(merger, 0, index);
      };
      feed(T.FL, 0);
      feed(T.FR, 1);
      feed(T.C, 2);
      feed(T.LFE, 3);
      feed(T.SL, 4);
      feed(T.SR, 5);
      // no ceiling speakers on a 5.1 set-up: fold heights and room reverb into the surrounds
      feed(T.TL, 4, 0.5);
      feed(T.TR, 5, 0.5);
      const rs = track(ctx.createChannelSplitter(2));
      T.REV.connect(rs);
      const rl = g(0.6);
      const rr = g(0.6);
      rs.connect(rl, 0);
      rs.connect(rr, 1);
      rl.connect(merger, 0, 4);
      rr.connect(merger, 0, 5);

      merger.connect(this.master);
      this._r = { mode, nodes };
      return;
    }

    if (mode === 'headphones') {
      // every virtual speaker is an HRTF source placed around the listener
      Object.entries(HRTF_POSITIONS).forEach(([name, [az, el]]) => {
        const p = track(ctx.createPanner());
        p.panningModel = 'HRTF';
        p.distanceModel = 'inverse';
        p.refDistance = 1;
        p.rolloffFactor = 0; // position only, no distance attenuation
        place(p, az, el);
        T[name].connect(p);
        p.connect(this.stereoOut);
      });
      const bass = g(0.7);
      T.LFE.connect(bass);
      bass.connect(this.stereoOut);
      T.REV.connect(this.stereoOut);
      this._r = { mode, nodes };
      return;
    }

    // 'speakers': fold-down for stereo towers with a widened sound stage
    const sumL = g(1);
    const sumR = g(1);
    const merge = track(ctx.createChannelMerger(2));
    sumL.connect(merge, 0, 0);
    sumR.connect(merge, 0, 1);
    merge.connect(this.stereoOut);

    const send = (tap, dest, level) => {
      const n = g(level);
      tap.connect(n);
      n.connect(dest);
    };
    send(T.FL, sumL, 1.0);
    send(T.FR, sumR, 1.0);
    send(T.C, sumL, 0.707);
    send(T.C, sumR, 0.707);
    send(T.LFE, sumL, 0.5);
    send(T.LFE, sumR, 0.5);
    send(T.SL, sumL, 0.75);
    send(T.SR, sumR, 0.75);
    send(T.TL, sumL, 0.55);
    send(T.TR, sumR, 0.55);

    // widening: each surround also leaks, phase-inverted and slightly delayed, to the far speaker
    const widen = (tap, dest, seconds) => {
      const hp = track(biquad(ctx, 'highpass', 300));
      const d = track(delayNode(ctx, seconds));
      const inv = g(-0.3);
      tap.connect(hp);
      hp.connect(d);
      d.connect(inv);
      inv.connect(dest);
    };
    widen(T.SL, sumR, 0.0006);
    widen(T.SR, sumL, 0.0006);

    T.REV.connect(this.stereoOut);
    this._r = { mode, nodes };
  }

  /* ------------------------------ parameters ------------------------------ */

  _setActive(on) {
    this._active = on;
    const t = this.ctx.currentTime;
    if (on) {
      this._buildRenderer();
      this.dry.gain.setTargetAtTime(0, t, 0.03);
      this.master.gain.setTargetAtTime(MASTER_LEVEL, t, 0.03);
    } else {
      this.dry.gain.setTargetAtTime(1, t, 0.03);
      this.master.gain.setTargetAtTime(0, t, 0.03);
      this._teardownRenderer(); // stops HRTF / reverb CPU cost while bypassed
    }
  }

  _apply() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const set = (param, v) => param.setTargetAtTime(v, t, 0.05);
    const { bass, space, height, dialogue, night } = this.params;
    const derive = this.layout === '5.1' ? 0 : 1; // only up-mix when the source is not real 5.1

    set(this.shelfL.gain, bass * 6);
    set(this.shelfR.gain, bass * 6);
    set(this.busLFE.gain, 0.3 + 1.4 * bass);
    set(this.lfeDerive.gain, derive);

    set(this.cReal.gain, 1 + 0.5 * dialogue);
    set(this.cDerive.gain, 0.65 * dialogue * derive);
    set(this.presence.gain, dialogue * 5);

    set(this.slDerive.gain, (0.2 + 0.9 * space) * derive);
    set(this.srDerive.gain, (0.2 + 0.9 * space) * derive);
    set(this.reverbWet.gain, 0.05 + 0.4 * space);

    set(this.busTL.gain, height * 0.9);
    set(this.busTR.gain, height * 0.9);

    this.comp.threshold.value = night ? -32 : -18;
    this.comp.ratio.value = night ? 8 : 3;
    this.comp.knee.value = 20;
    this.comp.attack.value = 0.01;
    this.comp.release.value = 0.25;
  }

  _emit() {
    const state = this.getState();
    this._listeners.forEach((fn) => {
      try { fn(state); } catch (e) { console.error(e); }
    });
  }
}

export default SurroundEngine;
