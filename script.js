/* ═══════════════════════════════════════════════════
   Aryan Medam — Personal Website Script
   Tabs · Metronome · Tuner
═══════════════════════════════════════════════════ */

'use strict';

// ─────────────────────────────────────────
// YEAR
// ─────────────────────────────────────────
document.getElementById('year').textContent = new Date().getFullYear();

// ─────────────────────────────────────────
// TAB NAVIGATION
// ─────────────────────────────────────────
const navBtns = document.querySelectorAll('.nav-btn');
const sections = document.querySelectorAll('.tab-section');

navBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.tab;

    navBtns.forEach(b => b.classList.remove('active'));
    sections.forEach(s => s.classList.remove('active'));

    btn.classList.add('active');
    document.getElementById(target).classList.add('active');
  });
});

// ─────────────────────────────────────────
// METRONOME
// ─────────────────────────────────────────
(function Metronome() {
  const audioCtx = new (window.AudioContext || /** @type {any} */(window).webkitAudioContext)();

  let bpm          = 120;
  let isRunning    = false;
  let currentBeat  = 0;
  let totalBeats   = 4;
  let subdivision  = 1;
  let nextNoteTime = 0;
  let schedulerID  = null;
  let tapTimes     = [];

  const LOOK_AHEAD   = 0.1;   // seconds
  const SCHEDULE_INT = 25;    // ms

  // DOM refs
  const bpmValueEl  = document.getElementById('bpm-value');
  const bpmSlider   = document.getElementById('bpm-slider');
  const bpmDown     = document.getElementById('bpm-down');
  const bpmUp       = document.getElementById('bpm-up');
  const toggleBtn   = document.getElementById('metro-toggle');
  const tapBtn      = document.getElementById('tap-btn');
  const tsBtns      = document.querySelectorAll('.ts-btn');
  const subBtns     = document.querySelectorAll('.sub-btn');
  const beatDots    = document.querySelectorAll('.beat-dot');

  function setBPM(val) {
    bpm = Math.min(300, Math.max(20, Math.round(val)));
    bpmValueEl.textContent = bpm;
    bpmSlider.value = bpm;
  }

  function updateDots() {
    beatDots.forEach((dot, i) => {
      dot.style.display = i < totalBeats ? 'block' : 'none';
    });
  }

  function flashBeat(beat) {
    beatDots.forEach((dot, i) => {
      dot.classList.remove('active-beat');
      if (i === beat % totalBeats) dot.classList.add('active-beat');
    });
  }

  // Web Audio click
  function scheduleClick(time, isDownbeat, isSubdivision) {
    const osc    = audioCtx.createOscillator();
    const gain   = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    if (isDownbeat) {
      osc.frequency.value = 1200;
      gain.gain.setValueAtTime(0.6, time);
    } else if (isSubdivision) {
      osc.frequency.value = 660;
      gain.gain.setValueAtTime(0.2, time);
    } else {
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.4, time);
    }

    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);
    osc.start(time);
    osc.stop(time + 0.05);
  }

  function scheduler() {
    const secPerBeat = 60 / bpm;
    const secPerSub  = secPerBeat / subdivision;

    while (nextNoteTime < audioCtx.currentTime + LOOK_AHEAD) {
      const beat    = currentBeat;
      const isDown  = beat === 0;
      scheduleClick(nextNoteTime, isDown, false);

      // subdivisions (skip 1st which is the beat itself)
      for (let s = 1; s < subdivision; s++) {
        scheduleClick(nextNoteTime + s * secPerSub, false, true);
      }

      // schedule visual flash
      const flashDelay = Math.max(0, (nextNoteTime - audioCtx.currentTime) * 1000);
      const beatSnap   = beat;
      setTimeout(() => flashBeat(beatSnap), flashDelay);

      currentBeat = (currentBeat + 1) % totalBeats;
      nextNoteTime += secPerBeat;
    }
  }

  function startMetronome() {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    currentBeat  = 0;
    nextNoteTime = audioCtx.currentTime + 0.05;
    schedulerID  = setInterval(scheduler, SCHEDULE_INT);
    isRunning    = true;
    toggleBtn.textContent = 'Stop';
    toggleBtn.classList.add('running');
  }

  function stopMetronome() {
    clearInterval(schedulerID);
    isRunning = false;
    currentBeat = 0;
    toggleBtn.textContent = 'Start';
    toggleBtn.classList.remove('running');
    beatDots.forEach(d => d.classList.remove('active-beat'));
  }

  // Controls
  bpmSlider.addEventListener('input', () => setBPM(bpmSlider.value));
  bpmDown.addEventListener('click', () => setBPM(bpm - 1));
  bpmUp.addEventListener('click',   () => setBPM(bpm + 1));
  toggleBtn.addEventListener('click', () => isRunning ? stopMetronome() : startMetronome());

  tsBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tsBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      totalBeats = parseInt(btn.dataset.beats, 10);
      updateDots();
    });
  });

  subBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      subBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      subdivision = parseInt(btn.dataset.sub, 10);
    });
  });

  // Tap tempo
  tapBtn.addEventListener('click', () => {
    const now = performance.now();
    tapTimes.push(now);
    if (tapTimes.length > 8) tapTimes.shift();

    if (tapTimes.length >= 2) {
      let sum = 0;
      for (let i = 1; i < tapTimes.length; i++) {
        sum += tapTimes[i] - tapTimes[i - 1];
      }
      const avgMs = sum / (tapTimes.length - 1);
      setBPM(Math.round(60000 / avgMs));
    }

    // reset tap history after 3 seconds of silence
    clearTimeout(tapBtn._resetTimer);
    tapBtn._resetTimer = setTimeout(() => { tapTimes = []; }, 3000);
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', e => {
    if (document.getElementById('metronome').classList.contains('active')) {
      if (e.code === 'Space') {
        e.preventDefault();
        isRunning ? stopMetronome() : startMetronome();
      }
      if (e.code === 'ArrowUp')   setBPM(bpm + 1);
      if (e.code === 'ArrowDown') setBPM(bpm - 1);
    }
  });

  updateDots();
})();

// ─────────────────────────────────────────
// TUNER
// ─────────────────────────────────────────
(function Tuner() {
  const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

  let audioCtx     = null;
  let analyser     = null;
  let mediaStream  = null;
  let animFrame    = null;
  let isRunning    = false;

  const noteEl     = document.getElementById('tuner-note');
  const octaveEl   = document.getElementById('tuner-octave');
  const centsEl    = document.getElementById('tuner-cents');
  const needleEl   = document.getElementById('tuner-needle');
  const statusEl   = document.getElementById('tuner-status');
  const toggleBtn  = document.getElementById('tuner-toggle');
  const refPitchEl = document.getElementById('ref-pitch');

  function getRefA4() {
    return parseFloat(refPitchEl.value) || 440;
  }

  // Autocorrelation pitch detection
  function detectPitch(buffer, sampleRate) {
    const SIZE   = buffer.length;
    const MAX_SAMPLES = Math.floor(SIZE / 2);
    let bestOffset = -1;
    let bestCorr   = 0;
    let lastCorr   = 1;
    let foundGoodCorr = false;
    const THRESHOLD = 0.9;

    const rms = Math.sqrt(buffer.reduce((s, v) => s + v * v, 0) / SIZE);
    if (rms < 0.015) return null; // silence

    let correlations = new Float32Array(MAX_SAMPLES);

    for (let offset = 0; offset < MAX_SAMPLES; offset++) {
      let corr = 0;
      for (let i = 0; i < MAX_SAMPLES; i++) {
        corr += Math.abs(buffer[i] - buffer[i + offset]);
      }
      corr = 1 - corr / MAX_SAMPLES;
      correlations[offset] = corr;

      if (corr > THRESHOLD && corr > lastCorr) {
        foundGoodCorr = true;
        if (corr > bestCorr) {
          bestCorr   = corr;
          bestOffset = offset;
        }
      } else if (foundGoodCorr) {
        // Parabolic interpolation for sub-sample accuracy
        const x0 = bestOffset > 0    ? correlations[bestOffset - 1] : correlations[bestOffset];
        const x2 = bestOffset + 1 < MAX_SAMPLES ? correlations[bestOffset + 1] : correlations[bestOffset];
        if (x2 > x0) {
          bestOffset += (x2 - x0) / (2 * (2 * correlations[bestOffset] - x2 - x0));
        }
        return sampleRate / bestOffset;
      }
      lastCorr = corr;
    }

    if (bestOffset === -1) return null;
    return sampleRate / bestOffset;
  }

  function freqToNoteData(freq) {
    const A4     = getRefA4();
    const semis  = 12 * Math.log2(freq / A4);
    const noteIdx = Math.round(semis) + 57; // A4 = MIDI 69, C4 = 60 → index 9 in octave
    const cents  = Math.round((semis - Math.round(semis)) * 100);
    const octave = Math.floor(noteIdx / 12);
    const name   = NOTE_NAMES[((noteIdx % 12) + 12) % 12];
    return { name, octave, cents };
  }

  function updateNeedle(cents) {
    // ±50 cents maps to ±70° rotation
    const angle = Math.max(-70, Math.min(70, cents * 1.4));
    needleEl.style.transform = `translateX(-50%) rotate(${angle}deg)`;
  }

  function updateStatus(cents) {
    statusEl.classList.remove('in-tune', 'sharp', 'flat');
    if (Math.abs(cents) <= 5) {
      statusEl.textContent = 'In Tune';
      statusEl.classList.add('in-tune');
    } else if (cents > 5) {
      statusEl.textContent = 'Sharp';
      statusEl.classList.add('sharp');
    } else {
      statusEl.textContent = 'Flat';
      statusEl.classList.add('flat');
    }
  }

  function analyze() {
    if (!isRunning) return;
    const buffer = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(buffer);

    const freq = detectPitch(buffer, audioCtx.sampleRate);
    if (freq && freq > 60 && freq < 5000) {
      const { name, octave, cents } = freqToNoteData(freq);
      noteEl.textContent   = name;
      octaveEl.textContent = octave;
      centsEl.textContent  = (cents >= 0 ? '+' : '') + cents;
      updateNeedle(cents);
      updateStatus(cents);
    } else {
      // fade to silence state
      noteEl.textContent   = '--';
      octaveEl.textContent = '';
      centsEl.textContent  = '0';
      updateNeedle(0);
      statusEl.textContent = '--';
      statusEl.classList.remove('in-tune', 'sharp', 'flat');
    }

    animFrame = requestAnimationFrame(analyze);
  }

  async function startTuner() {
    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      audioCtx    = new (window.AudioContext || /** @type {any} */(window).webkitAudioContext)();
      analyser    = audioCtx.createAnalyser();
      analyser.fftSize = 2048;

      const source = audioCtx.createMediaStreamSource(mediaStream);
      source.connect(analyser);

      isRunning = true;
      toggleBtn.textContent = 'Stop Tuner';
      toggleBtn.classList.add('running');
      statusEl.textContent = 'Listening...';
      analyze();
    } catch (err) {
      statusEl.textContent = 'Microphone access denied.';
      console.warn('Tuner mic error:', err);
    }
  }

  function stopTuner() {
    isRunning = false;
    if (animFrame)   cancelAnimationFrame(animFrame);
    if (mediaStream) mediaStream.getTracks().forEach(t => t.stop());
    if (audioCtx)    audioCtx.close();
    toggleBtn.textContent = 'Start Tuner';
    toggleBtn.classList.remove('running');
    noteEl.textContent   = '--';
    octaveEl.textContent = '';
    centsEl.textContent  = '0';
    statusEl.textContent = '--';
    statusEl.classList.remove('in-tune', 'sharp', 'flat');
    updateNeedle(0);
  }

  toggleBtn.addEventListener('click', () => isRunning ? stopTuner() : startTuner());
})();

// ─────────────────────────────────────────
// DRUM SEQUENCER
// ─────────────────────────────────────────
(function Sequencer() {

  /* ── Constants ─────────────────────────── */
  const STEPS      = 16;
  const TRACKS     = ['kick', 'snare', 'hihat', 'tom'];
  const LOOK_AHEAD = 0.1;   // seconds
  const SCHED_INT  = 25;    // ms

  // Sample files for each kit — relative paths from index.html
  const SAMPLE_MAP = {
    '808': {
      kick:  '808 Kit/BD 808 Mid Color A 05.wav',
      snare: '808 Kit/SD B 808 Tape Tone C 06.wav',
      hihat: '808 Kit/CH A 808 Tape.wav',
      tom:   '808 Kit/Tom Mid A 808 08.wav',
    },
    '909': {
      kick:  '909 Kit/Reverb Roland TR-909 Sample Pack_Kick Accent Mid Tone Min Attack Mjn Decay.wav',
      snare: '909 Kit/Reverb Roland TR-909 Sample Pack_Snare Accent Mid Tuning Mid Tone Mid Snap.wav',
      hihat: '909 Kit/Reverb Roland TR-909 Sample Pack_Hat Closed Mid Decay.wav',
      tom:   '909 Kit/Reverb Roland TR-909 Sample Pack_Tom Mid Mid Tune Mid Decay.wav',
    },
    'linn': {
      kick:  'Linn Kit/Reverb LinnDrum Sample Pack_Kick Hard.wav',
      snare: 'Linn Kit/Reverb LinnDrum Sample Pack_Snare Hard.wav',
      hihat: 'Linn Kit/Reverb LinnDrum Sample Pack_Hat Close.wav',
      tom:   'Linn Kit/Reverb LinnDrum Sample Pack_Tom1.wav',
    },
  };

  /* ── State ──────────────────────────────── */
  let machine      = '909';
  let bpm          = 120;
  let swingPercent = 0;
  let isRunning    = false;
  let currentStep  = 0;
  let nextStepTime = 0;
  let schedulerID  = null;
  const lastVisSteps = { kick: -1, snare: -1, hihat: -1, tom: -1 };

  // Pattern: track → bool[16]
  const pattern = {
    kick:  new Array(STEPS).fill(false),
    snare: new Array(STEPS).fill(false),
    hihat: new Array(STEPS).fill(false),
    tom:   new Array(STEPS).fill(false),
  };

  // Per-track volume (0–1)
  const volumes = { kick: 0.85, snare: 0.75, hihat: 0.55, tom: 0.75 };

  // Per-track active step count for polymetric sequencing (1–16)
  const trackLengths = { kick: 16, snare: 16, hihat: 16, tom: 16 };

  // Loaded AudioBuffers keyed by kit name then track name
  const sampleBuffers = {
    '808':  { kick: null, snare: null, hihat: null, tom: null },
    '909':  { kick: null, snare: null, hihat: null, tom: null },
    'linn': { kick: null, snare: null, hihat: null, tom: null },
  };

  /* ── Audio context ───────────────────────── */
  const audioCtx  = new (window.AudioContext || /** @type {any} */(window).webkitAudioContext)();
  const masterOut = audioCtx.createGain();
  masterOut.gain.value = 0.85;
  masterOut.connect(audioCtx.destination);

  // 0.5-second white noise buffer for synthesis
  const noiseBuffer = (() => {
    const len  = audioCtx.sampleRate * 0.5;
    const buf  = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  })();

  /* ── Status display ──────────────────────── */
  const statusEl = document.getElementById('seq-status');

  function setStatus(msg, type = '') {
    if (!statusEl) return;
    statusEl.textContent = msg;
    statusEl.className   = 'seq-status' + (type ? ' ' + type : '');
  }

  /* ── Sample loading ──────────────────────── */
  async function loadSample(path) {
    const res = await fetch(encodeURI(path));
    if (!res.ok) throw new Error(`HTTP ${res.status} — ${path}`);
    const ab = await res.arrayBuffer();
    return audioCtx.decodeAudioData(ab);
  }

  async function loadKit(kit) {
    const paths = SAMPLE_MAP[kit];
    if (!paths) return;
    setStatus(`Loading ${kit} samples…`, 'loading');

    const entries = await Promise.all(
      Object.entries(paths).map(async ([track, path]) => {
        try {
          const buf = await loadSample(path);
          return [track, buf];
        } catch (err) {
          console.warn('Could not load sample:', path, err);
          return [track, null];
        }
      })
    );

    let loaded = 0;
    for (const [track, buf] of entries) {
      sampleBuffers[kit][track] = buf;
      if (buf) loaded++;
    }

    if (loaded === 0) {
      setStatus('⚠ Samples blocked — open via HTTP: python3 -m http.server 8080', 'error');
    } else if (loaded < TRACKS.length) {
      setStatus(`${kit} kit: ${loaded}/${TRACKS.length} samples loaded`);
    } else {
      setStatus(`${kit} kit ready`, 'ready');
      setTimeout(() => setStatus(''), 2500);
    }
  }

  /* ── Play a loaded AudioBuffer ───────────── */
  function playSample(buf, t, vol) {
    const src  = audioCtx.createBufferSource();
    src.buffer = buf;
    const gain = audioCtx.createGain();
    gain.gain.value = vol;
    src.connect(gain);
    gain.connect(masterOut);
    src.start(t);
  }

  /* ── Synthesis fallback (909 + Linn) ─────── */
  function makeDistCurve(amount) {
    const n = 256, curve = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      curve[i] = ((Math.PI + amount) * x) / (Math.PI + amount * Math.abs(x));
    }
    return curve;
  }

  function playKick(t, vol) {
    const P = {
      '909': { f0: 150, f1: 50, sweep: 0.50, decay: 0.55, dist: 180 },
      'linn': { f0: 195, f1: 68, sweep: 0.28, decay: 0.38, dist: 60  },
    }[machine] || { f0: 150, f1: 50, sweep: 0.50, decay: 0.55, dist: 180 };

    const osc  = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    if (P.dist > 0) {
      const ws = audioCtx.createWaveShaper();
      ws.curve = makeDistCurve(P.dist);
      ws.oversample = '2x';
      osc.connect(ws); ws.connect(gain);
    } else {
      osc.connect(gain);
    }
    gain.connect(masterOut);
    osc.frequency.setValueAtTime(P.f0, t);
    osc.frequency.exponentialRampToValueAtTime(P.f1, t + P.sweep);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(vol * 0.92, t + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.001, t + P.decay);
    osc.start(t); osc.stop(t + P.decay + 0.06);
  }

  function playSnare(t, vol) {
    const P = {
      '909': { nhpf: 2000, ndecay: 0.28, ngain: 0.70, tf: 185, tdecay: 0.12, tgain: 0.50 },
      'linn': { nhpf: 3800, ndecay: 0.16, ngain: 0.82, tf: 220, tdecay: 0.09, tgain: 0.38 },
    }[machine] || { nhpf: 2000, ndecay: 0.28, ngain: 0.70, tf: 185, tdecay: 0.12, tgain: 0.50 };

    const ns = audioCtx.createBufferSource();
    ns.buffer = noiseBuffer;
    const nhpf = audioCtx.createBiquadFilter();
    nhpf.type = 'highpass'; nhpf.frequency.value = P.nhpf;
    const ng = audioCtx.createGain();
    ns.connect(nhpf); nhpf.connect(ng); ng.connect(masterOut);
    ng.gain.setValueAtTime(vol * P.ngain, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + P.ndecay);
    ns.start(t); ns.stop(t + P.ndecay + 0.02);

    const osc = audioCtx.createOscillator();
    const tg  = audioCtx.createGain();
    osc.connect(tg); tg.connect(masterOut);
    osc.frequency.value = P.tf;
    tg.gain.setValueAtTime(vol * P.tgain, t);
    tg.gain.exponentialRampToValueAtTime(0.001, t + P.tdecay);
    osc.start(t); osc.stop(t + P.tdecay + 0.02);
  }

  function playHihat(t, vol) {
    const P = {
      '909': { ftype: 'bandpass', freq: 8000, Q: 1.6, decay: 0.075 },
      'linn': { ftype: 'highpass', freq: 9200, Q: 0.7, decay: 0.048 },
    }[machine] || { ftype: 'bandpass', freq: 8000, Q: 1.6, decay: 0.075 };

    const ns = audioCtx.createBufferSource();
    ns.buffer = noiseBuffer;
    const filt = audioCtx.createBiquadFilter();
    filt.type = P.ftype; filt.frequency.value = P.freq; filt.Q.value = P.Q;
    const gain = audioCtx.createGain();
    ns.connect(filt); filt.connect(gain); gain.connect(masterOut);
    gain.gain.setValueAtTime(vol * 0.42, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + P.decay);
    ns.start(t); ns.stop(t + P.decay + 0.01);
  }

  function playTom(t, vol) {
    const P = {
      '909': { f0: 200, f1: 78, sweep: 0.38, decay: 0.44 },
      'linn': { f0: 245, f1: 88, sweep: 0.24, decay: 0.30 },
    }[machine] || { f0: 200, f1: 78, sweep: 0.38, decay: 0.44 };

    const osc  = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain); gain.connect(masterOut);
    osc.frequency.setValueAtTime(P.f0, t);
    osc.frequency.exponentialRampToValueAtTime(P.f1, t + P.sweep);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(vol * 0.82, t + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, t + P.decay);
    osc.start(t); osc.stop(t + P.decay + 0.06);
  }

  // Per-kit volume multipliers to roughly balance levels (since some kits have louder samples than others)
  const KIT_GAIN = { '808': 0.4, '909': 2.6, 'linn': 0.3 };

  /* ── Dispatch: sample if available, else synth ── */
  function fireTrack(track, t, vol) {
    const scaledVol = vol * (KIT_GAIN[machine] ?? 1.0);
    const buf = sampleBuffers[machine] && sampleBuffers[machine][track];
    if (buf) {
      playSample(buf, t, scaledVol);
      return;
    }
    switch (track) {
      case 'kick':  playKick(t, scaledVol);  break;
      case 'snare': playSnare(t, scaledVol); break;
      case 'hihat': playHihat(t, scaledVol); break;
      case 'tom':   playTom(t, scaledVol);   break;
    }
  }

  /* ── Scheduler ───────────────────────────── */
  function fireStep(step, t) {
    TRACKS.forEach(track => {
      if (pattern[track][step % trackLengths[track]]) fireTrack(track, t, volumes[track]);
    });
  }

  function scheduler() {
    const sec16  = 60 / (bpm * 4);
    const swing  = (swingPercent / 100) * sec16 * 0.5;

    while (nextStepTime < audioCtx.currentTime + LOOK_AHEAD) {
      const step = currentStep;
      fireStep(step, nextStepTime);

      // Visual update
      const delay = Math.max(0, (nextStepTime - audioCtx.currentTime) * 1000);
      const s = step;
      setTimeout(() => movePlayhead(s), delay);

      // Advance – swing delays odd steps, compensates on even
      nextStepTime += (currentStep % 2 === 0) ? sec16 + swing : sec16 - swing;
      currentStep = (currentStep + 1) % 720720; // LCM(1–16): no track ever resets mid-cycle
    }
  }

  /* ── Playhead visual ─────────────────────── */
  function movePlayhead(step) {
    TRACKS.forEach(tr => {
      const newPos = step % trackLengths[tr];
      if (lastVisSteps[tr] >= 0) stepEls[tr][lastVisSteps[tr]].classList.remove('current');
      stepEls[tr][newPos].classList.add('current');
      lastVisSteps[tr] = newPos;
    });
  }

  function clearPlayhead() {
    TRACKS.forEach(tr => {
      if (lastVisSteps[tr] >= 0) {
        stepEls[tr][lastVisSteps[tr]].classList.remove('current');
        lastVisSteps[tr] = -1;
      }
    });
  }

  /* ── Start / Stop ────────────────────────── */
  function startSeq() {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    currentStep  = 0;
    nextStepTime = audioCtx.currentTime + 0.05;
    schedulerID  = setInterval(scheduler, SCHED_INT);
    isRunning    = true;
    seqToggleBtn.textContent = 'Stop';
    seqToggleBtn.classList.add('running');
  }

  function stopSeq() {
    clearInterval(schedulerID);
    isRunning = false;
    clearPlayhead();
    seqToggleBtn.textContent = 'Play';
    seqToggleBtn.classList.remove('running');
  }

  /* ── Polymetric helpers ──────────────────── */
  function repositionHandle(track) {
    const handle = handleEls[track];
    if (!handle) return;
    const len     = trackLengths[track];
    const refBtn  = len < STEPS ? stepEls[track][len] : stepEls[track][STEPS - 1];
    const parentRect = handle.parentElement.getBoundingClientRect();
    const btnRect    = refBtn.getBoundingClientRect();
    const x = len < STEPS
      ? btnRect.left  - parentRect.left
      : btnRect.right - parentRect.left;
    handle.style.left = x + 'px';
  }

  function stepLenFromX(track, clientX) {
    for (let i = 0; i < STEPS; i++) {
      const r   = stepEls[track][i].getBoundingClientRect();
      const mid = (r.left + r.right) / 2;
      if (clientX < mid) return Math.max(1, i);
    }
    return STEPS;
  }

  function updateTrackLengthUI(track) {
    const len = trackLengths[track];
    stepEls[track].forEach((btn, i) => btn.classList.toggle('out-of-range', i >= len));
    repositionHandle(track);
  }

  /* ── Build DOM ───────────────────────────── */
  const seqGrid   = document.getElementById('seq-grid');
  const seqRuler  = document.getElementById('seq-ruler');
  const stepEls   = {};
  const handleEls = {};
  let   draggingTrack = null;

  // Ruler
  for (let g = 0; g < 4; g++) {
    const grp = document.createElement('div');
    grp.className = 'ruler-group';
    for (let s = 0; s < 4; s++) {
      const n   = document.createElement('span');
      const idx = g * 4 + s;
      n.className = 'ruler-num' + (s === 0 ? ' beat' : '');
      n.textContent = idx + 1;
      grp.appendChild(n);
    }
    seqRuler.appendChild(grp);
  }

  // Grid tracks
  TRACKS.forEach(track => {
    stepEls[track] = [];

    const row  = document.createElement('div');
    row.className   = 'seq-track';
    row.dataset.track = track;

    // Label + volume slider
    const left = document.createElement('div');
    left.className = 'track-left';

    const nameEl = document.createElement('span');
    nameEl.className   = 'track-name';
    nameEl.textContent = track === 'hihat' ? 'Hi-Hat'
                       : track.charAt(0).toUpperCase() + track.slice(1);

    const volEl  = document.createElement('input');
    volEl.type   = 'range';
    volEl.className = 'track-vol';
    volEl.min = 0; volEl.max = 100;
    volEl.value = Math.round(volumes[track] * 100);
    volEl.addEventListener('input', () => { volumes[track] = volEl.value / 100; });

    left.appendChild(nameEl);
    left.appendChild(volEl);
    row.appendChild(left);

    // 4 groups of 4 step buttons
    const stepsDiv = document.createElement('div');
    stepsDiv.className = 'track-steps';

    for (let g = 0; g < 4; g++) {
      const group = document.createElement('div');
      group.className = 'step-group';

      for (let s = 0; s < 4; s++) {
        const idx = g * 4 + s;
        const btn = document.createElement('button');
        btn.className      = 'step-btn';
        btn.dataset.step   = idx;
        btn.setAttribute('aria-label', `${track} step ${idx + 1}`);

        btn.addEventListener('click', () => {
          pattern[track][idx] = !pattern[track][idx];
          btn.classList.toggle('on', pattern[track][idx]);
        });

        stepEls[track].push(btn);
        group.appendChild(btn);
      }
      stepsDiv.appendChild(group);
    }

    // Length drag handle
    const handle = document.createElement('div');
    handle.className = 'track-length-handle';
    handle.setAttribute('aria-label', `${track} length handle`);
    stepsDiv.appendChild(handle);
    handleEls[track] = handle;

    handle.addEventListener('mousedown', e => {
      draggingTrack = track;
      handle.classList.add('dragging');
      e.preventDefault();
    });

    row.appendChild(stepsDiv);
    seqGrid.appendChild(row);
  });

  // Drag move / release
  document.addEventListener('mousemove', e => {
    if (!draggingTrack) return;
    const newLen = stepLenFromX(draggingTrack, e.clientX);
    if (newLen !== trackLengths[draggingTrack]) {
      trackLengths[draggingTrack] = newLen;
      updateTrackLengthUI(draggingTrack);
    }
  });

  document.addEventListener('mouseup', () => {
    if (draggingTrack) {
      handleEls[draggingTrack].classList.remove('dragging');
      draggingTrack = null;
    }
  });

  // Reposition handles on resize and whenever the sequencer tab is shown
  // (section is display:none on load so getBoundingClientRect returns 0)
  window.addEventListener('resize', () => TRACKS.forEach(repositionHandle));
  document.querySelector('.nav-btn[data-tab="sequencer"]')
    .addEventListener('click', () => requestAnimationFrame(() => TRACKS.forEach(repositionHandle)));

  /* ── Control wiring ──────────────────────── */
  const seqToggleBtn = document.getElementById('seq-toggle');
  seqToggleBtn.addEventListener('click', () => isRunning ? stopSeq() : startSeq());

  // BPM
  const seqBpmEl = document.getElementById('seq-bpm-value');
  function setSeqBPM(val) {
    bpm = Math.min(300, Math.max(20, Math.round(val)));
    seqBpmEl.textContent = bpm;
  }
  document.getElementById('seq-bpm-down').addEventListener('click', () => setSeqBPM(bpm - 1));
  document.getElementById('seq-bpm-up').addEventListener('click',   () => setSeqBPM(bpm + 1));

  // BPM held-down repeat
  function holdRepeat(el, fn) {
    let timeout, interval;
    el.addEventListener('mousedown', () => {
      fn();
      timeout = setTimeout(() => { interval = setInterval(fn, 80); }, 400);
    });
    ['mouseup','mouseleave'].forEach(ev =>
      el.addEventListener(ev, () => { clearTimeout(timeout); clearInterval(interval); })
    );
  }
  holdRepeat(document.getElementById('seq-bpm-down'), () => setSeqBPM(bpm - 1));
  holdRepeat(document.getElementById('seq-bpm-up'),   () => setSeqBPM(bpm + 1));

  // Swing
  const swingSlider = document.getElementById('seq-swing');
  const swingValEl  = document.getElementById('seq-swing-val');
  swingSlider.addEventListener('input', () => {
    swingPercent = parseInt(swingSlider.value, 10);
    swingValEl.textContent = swingPercent + '%';
  });

  // Machine
  document.querySelectorAll('.machine-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.machine-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      machine = btn.dataset.machine;
    });
  });

  // Clear
  document.getElementById('seq-clear').addEventListener('click', () => {
    TRACKS.forEach(track => {
      pattern[track].fill(false);
      trackLengths[track] = 16;
      stepEls[track].forEach(b => b.classList.remove('on', 'out-of-range'));
      updateTrackLengthUI(track);
    });
  });

  // Randomize – musically plausible pattern
  document.getElementById('seq-randomize').addEventListener('click', () => {
    TRACKS.forEach(track => { pattern[track].fill(false); });

    // Kick: 1 and 9, with common variations
    [0, 8].forEach(s => { pattern.kick[s] = true; });
    if (Math.random() > 0.45) pattern.kick[4]  = true;
    if (Math.random() > 0.55) pattern.kick[12] = true;
    if (Math.random() > 0.72) pattern.kick[6]  = true;
    if (Math.random() > 0.80) pattern.kick[14] = true;
    if (Math.random() > 0.85) pattern.kick[10] = true;

    // Snare: 5 and 13 (2 and 4)
    [4, 12].forEach(s => { pattern.snare[s] = true; });
    if (Math.random() > 0.65) pattern.snare[2]  = true;
    if (Math.random() > 0.75) pattern.snare[10] = true;
    if (Math.random() > 0.82) pattern.snare[14] = true;

    // Hi-hat: 8th notes with variable density
    const density = Math.random();
    for (let s = 0; s < STEPS; s += 2) {
      if (Math.random() > 0.15) pattern.hihat[s] = true;
    }
    if (density > 0.5) {
      [1, 3, 5, 7, 9, 11, 13, 15].forEach(s => {
        if (Math.random() > 0.65) pattern.hihat[s] = true;
      });
    }

    // Tom: sparse accent, avoid downbeats
    [2, 3, 6, 7, 10, 11, 14, 15].forEach(s => {
      if (Math.random() > 0.84) pattern.tom[s] = true;
    });

    // Randomize track lengths for polymetric variation (4–16 steps)
    TRACKS.forEach(track => {
      trackLengths[track] = 4 + Math.floor(Math.random() * 13);
      updateTrackLengthUI(track);
    });

    // Sync UI
    TRACKS.forEach(track => {
      stepEls[track].forEach((btn, i) => {
        btn.classList.toggle('on', pattern[track][i]);
      });
    });
  });

  // Space bar shortcut while sequencer tab is active
  document.addEventListener('keydown', e => {
    if (document.getElementById('sequencer').classList.contains('active') &&
        e.code === 'Space' && document.activeElement.tagName !== 'INPUT') {
      e.preventDefault();
      isRunning ? stopSeq() : startSeq();
    }
  });

  // Pre-load the default kit (909); lazy-load others on first switch
  loadKit('909');

  document.querySelectorAll('.machine-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const kit = btn.dataset.machine;
      if (SAMPLE_MAP[kit] && !sampleBuffers[kit].kick) {
        loadKit(kit);
      }
    });
  });

})();
