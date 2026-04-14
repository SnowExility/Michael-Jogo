/* ═══════════════════════════════════════════════════════
   UI SCALE — Michael: Em Busca do Big Mac Perdido
   Controle flutuante de escala de tela e fullscreen
   ═══════════════════════════════════════════════════════ */
'use strict';

const UISP_KEY = 'michael_uiscale';

let _uispOpen = false;
let _currentScale = 1.0;
let _currentBrightness = 100;

// ── Load saved state ──
(function uispInit() {
  try {
    const d = JSON.parse(localStorage.getItem(UISP_KEY) || '{}');
    if (d.scale)      _currentScale      = d.scale;
    if (d.brightness) _currentBrightness = d.brightness;
  } catch(e) {}

  // Apply on page load (after DOM ready)
  document.addEventListener('DOMContentLoaded', () => {
    _applyScale(_currentScale, false);
    _applyBrightness(_currentBrightness, false);
    _updateFsButton();
    // Sync slider
    const sl = document.getElementById('uisp-brightness');
    if (sl) sl.value = _currentBrightness;
    // Sync scale buttons
    _highlightScaleBtn(_currentScale);
  });

  // Keep fullscreen button in sync
  document.addEventListener('fullscreenchange', _updateFsButton);
})();

// ── TOGGLE PANEL ──
function toggleUIScalePanel() {
  _uispOpen = !_uispOpen;
  const panel = document.getElementById('ui-scale-panel');
  const btn   = document.getElementById('ui-scale-toggle-btn');
  if (!panel) return;
  if (_uispOpen) {
    panel.classList.remove('hidden');
    _updateFsButton();
    btn.style.background = 'linear-gradient(180deg,#FFD700,#FF6B00)';
    btn.style.color = '#0A0400';
  } else {
    panel.classList.add('hidden');
    btn.style.background = '';
    btn.style.color = '';
  }
}

// ── UI SCALE ──
function setUIScale(scale) {
  _currentScale = scale;
  _applyScale(scale, true);
  _highlightScaleBtn(scale);
  _save();
}

function _applyScale(scale, animate) {
  const root = document.documentElement;
  if (animate) root.style.transition = 'transform 0.25s ease';
  root.style.transformOrigin = 'top left';
  root.style.transform       = `scale(${scale})`;
  root.style.width           = `${100 / scale}%`;
  root.style.height          = `${100 / scale}%`;
  if (animate) setTimeout(() => root.style.transition = '', 300);
}

function _highlightScaleBtn(scale) {
  document.querySelectorAll('.uisp-btn').forEach(b => {
    const bScale = parseFloat(b.textContent) / 100;
    b.classList.toggle('uisp-active', Math.abs(bScale - scale) < 0.01);
  });
}

// ── FULLSCREEN ──
function uispToggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen?.().catch(() => {});
  } else {
    document.exitFullscreen?.().catch(() => {});
  }
  setTimeout(_updateFsButton, 300);
}

function _updateFsButton() {
  const btn = document.getElementById('uisp-fs-btn');
  if (!btn) return;
  const isFS = !!document.fullscreenElement;
  btn.textContent = isFS ? 'ON ✓' : 'OFF';
  btn.classList.toggle('uisp-toggle-on', isFS);
}

// ── BRIGHTNESS ──
function uispSetBrightness(val) {
  _currentBrightness = parseInt(val);
  _applyBrightness(_currentBrightness, false);
  _save();
}

function _applyBrightness(val, animate) {
  const frac = val / 100;
  document.documentElement.style.setProperty('--brightness', frac);
  // Also apply a CSS filter on body for real brightness control
  document.body.style.filter = `brightness(${frac})`;
}

// ── SAVE ──
function _save() {
  try {
    localStorage.setItem(UISP_KEY, JSON.stringify({
      scale: _currentScale,
      brightness: _currentBrightness,
    }));
  } catch(e) {}
}