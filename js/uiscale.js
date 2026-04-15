/* ═══════════════════════════════════════════════════════
   UI SCALE — Michael: Em Busca do Big Mac Perdido
   Zoom tipo DPI — preenche a tela e escala proporcionalmente
   ═══════════════════════════════════════════════════════ */
'use strict';

const UISP_KEY = 'michael_uiscale_v3';
let _uispOpen  = false;
let _uiScale   = 1.0;
let _brightness = 100;

;(function init() {
  try {
    const d = JSON.parse(localStorage.getItem(UISP_KEY) || '{}');
    if (d.scale !== undefined)      _uiScale    = Math.max(0.5, Math.min(2, parseFloat(d.scale) || 1));
    if (d.brightness !== undefined) _brightness = Math.max(20, Math.min(150, parseInt(d.brightness) || 100));
  } catch(e) {}

  document.addEventListener('DOMContentLoaded', () => {
    // Base body setup — must run before applyAll
    document.body.style.cssText = 'margin:0;padding:0;overflow:hidden;background:#000;width:100vw;height:100vh;';
    document.documentElement.style.cssText = 'margin:0;padding:0;overflow:hidden;';

    _applyAll();
    window.addEventListener('resize', _applyAll);
    document.addEventListener('fullscreenchange', () => { _applyAll(); _syncFsBtn(); });
  });
})();

// ── CORE: fits element to viewport then applies _uiScale ──
function _applyAll() {
  _applyBrightness(_brightness);
  _syncFsBtn();
  _syncScaleBtns();
  _syncBrightnessSlider();

  const wrap = document.getElementById('game-wrap');
  if (wrap) { _fitElement(wrap, 900, 500); return; }

  const menu = document.getElementById('menu-screen');
  if (menu) { _fitElement(menu, 1280, 720); }
}

function _fitElement(el, baseW, baseH) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const fitScale = Math.min(vw / baseW, vh / baseH);
  const finalScale = fitScale * _uiScale;

  // px dimensions after scaling
  const sw = baseW * finalScale;
  const sh = baseH * finalScale;

  // pixel-perfect center offset
  const left = Math.floor((vw - sw) / 2);
  const top  = Math.floor((vh - sh) / 2);

  el.style.position        = 'fixed';
  el.style.width           = baseW + 'px';
  el.style.height          = baseH + 'px';
  el.style.left            = '0';
  el.style.top             = '0';
  el.style.margin          = '0';
  el.style.transformOrigin = 'top left';
  el.style.transform       = `translate(${left}px,${top}px) scale(${finalScale})`;
  el.style.zIndex          = '1';
}

// ── PUBLIC ──
function toggleUIScalePanel() {
  _uispOpen = !_uispOpen;
  const panel = document.getElementById('ui-scale-panel');
  const btn   = document.getElementById('ui-scale-toggle-btn');
  if (!panel) return;
  panel.classList.toggle('hidden', !_uispOpen);
  if (btn) {
    btn.style.background = _uispOpen ? 'linear-gradient(180deg,#FFD700,#FF6B00)' : '';
    btn.style.color      = _uispOpen ? '#0A0400' : '';
  }
  if (_uispOpen) { _syncFsBtn(); _syncScaleBtns(); _syncBrightnessSlider(); }
}

function setUIScale(scale) {
  _uiScale = Math.max(0.5, Math.min(2, parseFloat(scale)));
  _applyAll();
  _save();
  _syncScaleBtns();
  _syncSliderFromScale();
}

// Called by the realtime slider
function uispSliderChange(val) {
  const scale = parseFloat(val) / 100;
  setUIScale(scale);
  document.getElementById('uisp-scale-label').textContent = Math.round(scale * 100) + '%';
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
  const lbl = document.getElementById('uisp-bright-label');
  if (lbl) lbl.textContent = _brightness + '%';
}

// ── INTERNAL ──
function _applyBrightness(val) {
  document.documentElement.style.setProperty('--brightness', val / 100);
  let ov = document.getElementById('_brightness_overlay');
  if (!ov) {
    ov = document.createElement('div');
    ov.id = '_brightness_overlay';
    ov.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:99997;transition:background .2s;';
    document.body.appendChild(ov);
  }
  if (val < 100) {
    ov.style.background = `rgba(0,0,0,${(1 - val / 100) * 0.75})`;
  } else {
    ov.style.background = 'transparent';
  }
  // Slight overbright effect
  const wrap = document.getElementById('game-wrap') || document.getElementById('menu-screen');
  if (wrap && val > 100) {
    wrap.style.filter = `brightness(${val / 100})`;
  } else if (wrap) {
    wrap.style.filter = '';
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
  const lbl = document.getElementById('uisp-bright-label');
  if (lbl) lbl.textContent = _brightness + '%';
}

function _syncSliderFromScale() {
  const sl = document.getElementById('uisp-scale-slider');
  if (sl) sl.value = Math.round(_uiScale * 100);
  const lbl = document.getElementById('uisp-scale-label');
  if (lbl) lbl.textContent = Math.round(_uiScale * 100) + '%';
}

function _save() {
  try { localStorage.setItem(UISP_KEY, JSON.stringify({ scale: _uiScale, brightness: _brightness })); }
  catch(e) {}
}

// ── AUTO FULLSCREEN ──
// Browsers only allow requestFullscreen after a user gesture.
// We hook the first click/touch anywhere on the page.
function uispAutoFullscreen() {
  const _try = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(()=>{});
    }
    document.removeEventListener('click',   _try);
    document.removeEventListener('touchend', _try);
    document.removeEventListener('keydown',  _try);
  };
  if (!document.fullscreenElement) {
    // Try immediately (works if called from inside click handler)
    document.documentElement.requestFullscreen?.().catch(()=>{
      // Fallback: wait for next interaction
      document.addEventListener('click',    _try, {once:true});
      document.addEventListener('touchend', _try, {once:true});
      document.addEventListener('keydown',  _try, {once:true});
    });
  }
}
