/* ═══════════════════════════════════════════════════════════
   MICHAEL: EM BUSCA DO BIG MAC PERDIDO — music.js
   Sistema de Música
   ─ Toca arquivo MP3/OGG se existir
   ─ Senão gera música 8-bit procedural pela Web Audio API
   ═══════════════════════════════════════════════════════════ */
'use strict';

const MUS = {
  ctx: null,
  masterGain: null,
  currentTrack: null,  // 'menu' | 'game' | null
  volume: 0.7,
  muted: false,
  fadeTimer: null,

  // Audio element (para arquivos externos)
  audioEl: null,

  // Procedural engine
  proc: {
    running: false,
    nodes: [],
    bpm: 120,
    beat: 0,
    nextBeatTime: 0,
    scheduler: null,
  }
};

// ─── Arquivos externos (coloque em assets/audio/ se quiser) ───
const TRACK_FILES = {
  menu: 'assets/audio/music_menu.mp3',
  game: 'assets/audio/music_game.mp3',
};

// ─── INIT ───
function musicInit() {
  try {
    MUS.ctx = new (window.AudioContext || window.webkitAudioContext)();
    MUS.masterGain = MUS.ctx.createGain();
    MUS.masterGain.gain.value = MUS.volume;
    MUS.masterGain.connect(MUS.ctx.destination);
  } catch(e) { console.warn('[MUSIC] Web Audio não suportado'); }

  // Lê config salva
  try {
    const s = JSON.parse(localStorage.getItem('michael_bigmac_save_v1') || '{}');
    const settings = s.settings || {};
    if (settings.musicVol !== undefined) MUS.volume = settings.musicVol / 100;
    if (settings.mute) MUS.muted = true;
    if (MUS.masterGain) MUS.masterGain.gain.value = MUS.muted ? 0 : MUS.volume;
  } catch(e) {}
}

// ─── PLAY ───
function musicPlay(track) {
  if (!MUS.ctx) musicInit();
  if (MUS.currentTrack === track) return;

  musicFadeOut(() => {
    MUS.currentTrack = track;
    _startTrack(track);
  });
}

function musicStop(cb) {
  musicFadeOut(() => {
    MUS.currentTrack = null;
    if (cb) cb();
  });
}

// ─── SET VOLUME ───
function musicSetVolume(vol) { // 0-100
  MUS.volume = vol / 100;
  if (MUS.masterGain && !MUS.muted) {
    MUS.masterGain.gain.setTargetAtTime(MUS.volume, MUS.ctx.currentTime, 0.05);
  }
}

function musicSetMute(muted) {
  MUS.muted = muted;
  if (MUS.masterGain) {
    MUS.masterGain.gain.setTargetAtTime(muted ? 0 : MUS.volume, MUS.ctx.currentTime, 0.05);
  }
  if (MUS.audioEl) MUS.audioEl.muted = muted;
}

// ─── FADE ───
function musicFadeOut(cb) {
  clearTimeout(MUS.fadeTimer);
  _stopProceduralMusic();

  if (MUS.audioEl) {
    const el = MUS.audioEl;
    let vol = el.volume;
    const step = () => {
      vol -= 0.05;
      if (vol <= 0) {
        el.pause(); el.currentTime = 0; el.volume = 1;
        MUS.audioEl = null;
        if (cb) cb();
      } else {
        el.volume = vol;
        MUS.fadeTimer = setTimeout(step, 40);
      }
    };
    step();
  } else {
    if (cb) cb();
  }
}

// ─── START TRACK ───
function _startTrack(track) {
  if (!MUS.ctx) return;
  // Resume context if suspended (browser autoplay policy)
  if (MUS.ctx.state === 'suspended') MUS.ctx.resume();

  // Try loading an external file first
  const url = TRACK_FILES[track];
  const audio = new Audio();
  audio.preload = 'auto';
  audio.loop = true;
  audio.volume = MUS.muted ? 0 : MUS.volume;

  audio.addEventListener('canplay', () => {
    audio.play().then(() => {
      MUS.audioEl = audio;
    }).catch(() => {
      // File exists but autoplay blocked — fallback to procedural
      _startProceduralMusic(track);
    });
  }, { once: true });

  audio.addEventListener('error', () => {
    // File doesn't exist — use procedural
    _startProceduralMusic(track);
  }, { once: true });

  audio.src = url;
}

// ═══════════════════════════════════════════════════════════════
// MÚSICA PROCEDURAL 8-BIT
// ═══════════════════════════════════════════════════════════════

// ── MENU MUSIC: calma, arpeggio suave, estilo RPG 8-bit ──
const MENU_MELODY = [
  // C major feel — calm, looping 16 bars
  523.25, 659.25, 783.99, 659.25,   // C5 E5 G5 E5
  523.25, 587.33, 698.46, 587.33,   // C5 D5 F5 D5
  493.88, 587.33, 739.99, 587.33,   // B4 D5 F#5 D5
  523.25, 659.25, 783.99, 1046.5,   // C5 E5 G5 C6
  392.00, 493.88, 587.33, 493.88,   // G4 B4 D5 B4
  349.23, 440.00, 523.25, 440.00,   // F4 A4 C5 A4
  392.00, 466.16, 587.33, 466.16,   // G4 Bb4 D5 Bb4
  523.25, 659.25, 523.25, 392.00,   // C5 E5 C5 G4
];
const MENU_BASS = [
  130.81, 130.81, 146.83, 146.83,   // C3 C3 D3 D3
  130.81, 130.81, 174.61, 174.61,   // C3 C3 F3 F3
  123.47, 123.47, 146.83, 146.83,   // B2 B2 D3 D3
  130.81, 130.81, 196.00, 196.00,   // C3 C3 G3 G3
  98.00,  98.00,  123.47, 123.47,   // G2 G2 B2 B2
  87.31,  87.31,  110.00, 110.00,   // F2 F2 A2 A2
  98.00,  98.00,  116.54, 116.54,   // G2 G2 Bb2 Bb2
  130.81, 130.81, 98.00,  98.00,    // C3 C3 G2 G2
];

// ── GAME MUSIC: energética, ritmo de ação 8-bit ──
const GAME_MELODY = [
  // Energetic D minor run
  587.33, 698.46, 783.99, 698.46,   // D5 F5 G5 F5
  587.33, 523.25, 493.88, 523.25,   // D5 C5 B4 C5
  587.33, 659.25, 698.46, 783.99,   // D5 E5 F5 G5
  880.00, 783.99, 698.46, 587.33,   // A5 G5 F5 D5
  659.25, 698.46, 783.99, 880.00,   // E5 F5 G5 A5
  1046.5, 880.00, 783.99, 698.46,   // C6 A5 G5 F5
  659.25, 587.33, 523.25, 493.88,   // E5 D5 C5 B4
  523.25, 587.33, 659.25, 783.99,   // C5 D5 E5 G5
];
const GAME_BASS = [
  146.83, 146.83, 174.61, 174.61,   // D3 D3 F3 F3
  146.83, 146.83, 130.81, 130.81,   // D3 D3 C3 C3
  146.83, 146.83, 174.61, 174.61,   // D3 D3 F3 F3
  220.00, 220.00, 174.61, 174.61,   // A3 A3 F3 F3
  164.81, 164.81, 174.61, 174.61,   // E3 E3 F3 F3
  261.63, 261.63, 220.00, 220.00,   // C4 C4 A3 A3
  164.81, 164.81, 146.83, 123.47,   // E3 E3 D3 B2
  130.81, 146.83, 164.81, 196.00,   // C3 D3 E3 G3
];
const GAME_DRUMS = [
  // kick, hihat pattern — 1 = kick, 2 = snare, 3 = hihat, 0 = rest
  1,3,2,3, 1,3,2,3, 1,3,2,3, 1,3,2,3,
  1,3,2,3, 1,3,2,3, 1,1,2,3, 1,3,2,3,
];

function _startProceduralMusic(track) {
  if (!MUS.ctx || MUS.proc.running) return;
  MUS.proc.running = true;
  MUS.proc.beat = 0;

  const isMenu = track === 'menu';
  const bpm = isMenu ? 88 : 148;
  const beatDur = 60 / bpm;
  MUS.proc.bpm = bpm;
  MUS.proc.nextBeatTime = MUS.ctx.currentTime + 0.05;

  const melody = isMenu ? MENU_MELODY : GAME_MELODY;
  const bass   = isMenu ? MENU_BASS   : GAME_BASS;
  const drums  = isMenu ? null        : GAME_DRUMS;

  function scheduleBeats() {
    if (!MUS.proc.running) return;

    const AHEAD = 0.25; // schedule this many seconds ahead
    while (MUS.proc.nextBeatTime < MUS.ctx.currentTime + AHEAD) {
      const t = MUS.proc.nextBeatTime;
      const b = MUS.proc.beat % melody.length;

      // ── Melody (square wave) ──
      if (melody[b] > 0) {
        const noteVol = isMenu ? 0.12 : 0.14;
        _playNote(melody[b], t, beatDur * 0.85, 'square', noteVol);
      }

      // ── Bass (triangle, lower octave) ──
      if (bass[b] > 0 && (b % 2 === 0 || !isMenu)) {
        _playNote(bass[b], t, beatDur * (isMenu ? 1.8 : 0.9), 'triangle', 0.18);
      }

      // ── Drums (only game track) ──
      if (drums) {
        const d = drums[b % drums.length];
        if (d === 1) _playKick(t);
        else if (d === 2) _playSnare(t);
        else if (d === 3) _playHihat(t, 0.06);
      }

      // ── Ambient chord (menu only, every 4 beats) ──
      if (isMenu && b % 4 === 0) {
        const chordFreqs = [melody[b], melody[b] * 1.26, melody[b] * 1.498];
        chordFreqs.forEach(f => _playNote(f, t, beatDur * 3.8, 'sine', 0.05));
      }

      MUS.proc.beat++;
      MUS.proc.nextBeatTime += beatDur;
    }

    MUS.proc.scheduler = setTimeout(scheduleBeats, 80);
  }

  scheduleBeats();
}

function _stopProceduralMusic() {
  MUS.proc.running = false;
  clearTimeout(MUS.proc.scheduler);
  MUS.proc.scheduler = null;
  // Clean up any lingering nodes (they auto-disconnect after stop)
}

// ── Note helper ──
function _playNote(freq, when, dur, type, vol) {
  if (!MUS.ctx || !MUS.masterGain) return;
  try {
    const osc  = MUS.ctx.createOscillator();
    const gain = MUS.ctx.createGain();
    osc.connect(gain);
    gain.connect(MUS.masterGain);
    osc.type = type || 'square';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, when);
    gain.gain.linearRampToValueAtTime(vol, when + 0.01);
    gain.gain.setValueAtTime(vol, when + dur * 0.7);
    gain.gain.exponentialRampToValueAtTime(0.001, when + dur);
    osc.start(when);
    osc.stop(when + dur + 0.01);
  } catch(e) {}
}

// ── Kick drum ──
function _playKick(when) {
  if (!MUS.ctx) return;
  try {
    const osc  = MUS.ctx.createOscillator();
    const gain = MUS.ctx.createGain();
    osc.connect(gain); gain.connect(MUS.masterGain);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, when);
    osc.frequency.exponentialRampToValueAtTime(30, when + 0.12);
    gain.gain.setValueAtTime(0.4, when);
    gain.gain.exponentialRampToValueAtTime(0.001, when + 0.18);
    osc.start(when); osc.stop(when + 0.2);
  } catch(e) {}
}

// ── Snare ──
function _playSnare(when) {
  if (!MUS.ctx) return;
  try {
    const buf  = MUS.ctx.createBuffer(1, MUS.ctx.sampleRate * 0.12, MUS.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src  = MUS.ctx.createBufferSource();
    const gain = MUS.ctx.createGain();
    const filt = MUS.ctx.createBiquadFilter();
    filt.type = 'bandpass'; filt.frequency.value = 2500; filt.Q.value = 0.8;
    src.buffer = buf;
    src.connect(filt); filt.connect(gain); gain.connect(MUS.masterGain);
    gain.gain.setValueAtTime(0.22, when);
    gain.gain.exponentialRampToValueAtTime(0.001, when + 0.12);
    src.start(when); src.stop(when + 0.14);
  } catch(e) {}
}

// ── Hi-hat ──
function _playHihat(when, vol) {
  if (!MUS.ctx) return;
  try {
    const buf  = MUS.ctx.createBuffer(1, MUS.ctx.sampleRate * 0.05, MUS.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src  = MUS.ctx.createBufferSource();
    const gain = MUS.ctx.createGain();
    const filt = MUS.ctx.createBiquadFilter();
    filt.type = 'highpass'; filt.frequency.value = 7000;
    src.buffer = buf;
    src.connect(filt); filt.connect(gain); gain.connect(MUS.masterGain);
    gain.gain.setValueAtTime(vol || 0.07, when);
    gain.gain.exponentialRampToValueAtTime(0.001, when + 0.04);
    src.start(when); src.stop(when + 0.05);
  } catch(e) {}
}

// ═══════════════════════════════════════════════════════════════
// API PÚBLICA — chamada pelo index e fase1
// ═══════════════════════════════════════════════════════════════

// No menu/index: toca a música do menu
function musicPlayMenu()  { musicPlay('menu'); }

// No jogo: toca a música do jogo
function musicPlayGame()  { musicPlay('game'); }

// Para tudo (cutscene, história, etc)
function musicPause()     {
  if (MUS.audioEl) MUS.audioEl.pause();
  _stopProceduralMusic();
}

// Retoma a faixa atual
function musicResume() {
  if (!MUS.currentTrack) return;
  if (MUS.audioEl) {
    MUS.audioEl.play().catch(()=>{});
  } else {
    _startProceduralMusic(MUS.currentTrack);
  }
}

// Sync com as configurações salvas
function musicSyncSettings() {
  try {
    const s = JSON.parse(localStorage.getItem('michael_bigmac_save_v1') || '{}');
    const st = s.settings || {};
    if (st.musicVol !== undefined) musicSetVolume(st.musicVol);
    musicSetMute(!!st.mute);
  } catch(e) {}
}