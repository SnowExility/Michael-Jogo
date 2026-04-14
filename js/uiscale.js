/* ═══════════════════════════════════════════════════════
   UI SCALE — Michael: Em Busca do Big Mac Perdido
   Ajusta o zoom do jogo para caber na tela do dispositivo
   Funciona como "DPI" — aumenta/diminui tudo proporcionalmente
   mantendo a tela sempre preenchida
   ═══════════════════════════════════════════════════════ */
'use strict';

const UISP_KEY = 'michael_uiscale_v2';
let _uispOpen  = false;
let _uiScale   = 1.0;  // multiplier sobre o fit automático
let _brightness = 100; // 20-150

// ── INIT ──
;(function() {
  try {
    const d = JSON.parse(localStorage.getItem(UISP_KEY) || '{}');
    if (d.scale !== undefined)      _uiScale    = parseFloat(d.scale) || 1;
    if (d.brightness !== undefined) _brightness = parseInt(d.brightness) || 100;
  } catch(e) {}

  document.addEventListener('DOMContentLoaded', () => {
    _applyAll();
    window.addEventListener('resize', _applyAll);
    document.addEventListener('fullscreenchange', () => {
      _applyAll();
      _syncFsBtn();
    });
  });
})();

// ── APPLY: faz o #game-wrap ou body.scale cobrir a tela ──
function _applyAll() {
  _applyBrightness(_brightness);
  _syncFsBtn();
  _syncScaleBtns();
  _syncBrightnessSlider();

  // On the game page, scale the canvas wrapper
  const wrap = document.getElementById('game-wrap');
  if (wrap) {
    _fitGameWrap(wrap);
    return;
  }

  // On menu/index, scale the menu-screen
  const menu = document.getElementById('menu-screen');
  if (menu) {
    _fitMenuScreen(menu);
  }
}

function _fitGameWrap(wrap) {
  // The game canvas is 900×500. We want it to fill the window,
  // then apply _uiScale as an extra multiplier.
  const ww = window.innerWidth;
  const wh = window.innerHeight;
  const baseW = 900, baseH = 500;
  const fitScale = Math.min(ww / baseW, wh / baseH);
  const finalScale = fitScale * _uiScale;

  wrap.style.width     = baseW + 'px';
  wrap.style.height    = baseH + 'px';
  wrap.style.transform = `scale(${finalScale})`;
  wrap.style.transformOrigin = 'top left';
  wrap.style.position  = 'absolute';
  wrap.style.left      = Math.round((ww - baseW * finalScale) / 2) + 'px';
  wrap.style.top       = Math.round((wh - baseH * finalScale) / 2) + 'px';
  document.body.style.overflow = 'hidden';
  document.body.style.background = '#000';
}

function _fitMenuScreen(menu) {
  // Menu fills whole viewport, scale content inside
  const ww = window.innerWidth;
  const wh = window.innerHeight;
  const baseW = 1280, baseH = 720; // design size
  const fitScale = Math.min(ww / baseW, wh / baseH) * _uiScale;

  menu.style.transformOrigin = 'top left';
  menu.style.transform       = `scale(${fitScale})`;
  menu.style.width           = baseW + 'px';
  menu.style.height          = baseH + 'px';
  menu.style.left            = Math.round((ww - baseW * fitScale) / 2) + 'px';
  menu.style.top             = Math.round((wh - baseH * fitScale) / 2) + 'px';
  menu.style.position        = 'absolute';
  document.body.style.overflow = 'hidden';
  document.body.style.background = '#000';
}

// ── PUBLIC API ──
function toggleUIScalePanel() {
  _uispOpen = !_uispOpen;
  const panel = document.getElementById('ui-scale-panel');
  const btn   = document.getElementById('ui-scale-toggle-btn');
  if (!panel) return;
  panel.classList.toggle('hidden', !_uispOpen);
  if (btn) {
    btn.style.background = _uispOpen
      ? 'linear-gradient(180deg,#FFD700,#FF6B00)' : '';
    btn.style.color = _uispOpen ? '#0A0400' : '';
  }
  if (_uispOpen) { _syncFsBtn(); _syncScaleBtns(); _syncBrightnessSlider(); }
}

function setUIScale(scale) {
  _uiScale = Math.max(0.5, Math.min(2, parseFloat(scale)));
  _applyAll();
  _save();
}

function uispToggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen?.().catch(()=>{});
  } else {
    document.exitFullscreen?.().catch(()=>{});
  }
}

function uispSetBrightness(val) {
  _brightness = Math.max(20, Math.min(150, parseInt(val)));
  _applyBrightness(_brightness);
  _save();
}

function _applyBrightness(val) {
  const f = val / 100;
  document.documentElement.style.setProperty('--brightness', f);
  // Use a dedicated overlay instead of body filter (avoids menu glitch)
  let ov = document.getElementById('_brightness_overlay');
  if (!ov) {
    ov = document.createElement('div');
    ov.id = '_brightness_overlay';
    ov.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:99998;mix-blend-mode:multiply;transition:background .2s;';
    document.body.appendChild(ov);
  }
  if (val < 100) {
    const dark = Math.round((1 - val/100) * 220);
    ov.style.background = `rgba(0,0,0,${(1 - val/100) * 0.7})`;
  } else if (val > 100) {
    ov.style.background = 'transparent';
    document.body.style.filter = `brightness(${val/100})`;
  } else {
    ov.style.background = 'transparent';
    document.body.style.filter = '';
  }
}

function _syncFsBtn() {
  const btn = document.getElementById('uisp-fs-btn');
  if (!btn) return;
  const isFS = !!document.fullscreenElement;
  btn.textContent = isFS ? 'ON ✓' : 'OFF';
  btn.classList.toggle('uisp-toggle-on', isFS);
}

function _syncScaleBtns() {
  document.querySelectorAll('.uisp-btn[data-scale]').forEach(b => {
    b.classList.toggle('uisp-active', Math.abs(parseFloat(b.dataset.scale) - _uiScale) < 0.01);
  });
}

function _syncBrightnessSlider() {
  const sl = document.getElementById('uisp-brightness');
  if (sl) sl.value = _brightness;
}

function _save() {
  try {
    localStorage.setItem(UISP_KEY, JSON.stringify({ scale: _uiScale, brightness: _brightness }));
  } catch(e) {}
}