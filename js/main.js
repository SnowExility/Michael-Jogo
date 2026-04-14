/* ================================================================
   MICHAEL: EM BUSCA DO BIG MAC PERDIDO  —  main.js
   Sistema de save, intro, livro 3D, menu, configurações, nuggets
   ================================================================ */
'use strict';

// ──────────────────────────────────────────────────────────────
// ESTADO GLOBAL
// ──────────────────────────────────────────────────────────────
const STATE = {
  nuggets:      0,
  currentPhase: 0,
  introSeen:    false,
  bookSeen:     false,
  ingredients:  [], // ids dos ingredientes coletados

  settings: {
    musicVol: 80, sfxVol: 80, mute: false,
    graphicsQuality: 'media', scanlines: true, pixelPerfect: true,
    resolution: '1280', fullscreen: false, brightness: 50, platform: 'pc',
  },

  promoCodes: {
    redeemed: [],
    available: {
      'BIGMAC':       { reward: 50,  msg: '+50 Nuggets! 🍔 O clássico chegou!'           },
      'HAMBURGUER':   { reward: 20,  msg: '+20 Nuggets! 🧔 Honra ao protagonista!'       },
      'FOGONABRASA':  { reward: 100, msg: '+100 Nuggets! 🔥 Código do amigo cruel!'      },
      'GORDAOQUERO':  { reward: 30,  msg: '+30 Nuggets! 🐷 Sem julgamentos aqui!'        },
      'SEMPATROCINIO':{ reward: 75,  msg: '+75 Nuggets! 🏳️ Obrigado por jogar!'        },
      'LENDARIO':     { reward: 200, msg: '+200 Nuggets! 👑 Código lendário resgatado!'  },
      // Dev
      'DEVRESETALL':  { reward: 0,   msg: '🔧 MODO DEV: Progresso resetado!', dev: true },
    }
  }
};

// ──────────────────────────────────────────────────────────────
// SAVE / LOAD (localStorage)
// ──────────────────────────────────────────────────────────────
const SAVE_KEY = 'michael_bigmac_save_v1';

function saveGame() {
  try {
    const data = {
      nuggets:      STATE.nuggets,
      currentPhase: STATE.currentPhase,
      introSeen:    STATE.introSeen,
      bookSeen:     STATE.bookSeen,
      settings:     STATE.settings,
      redeemed:     STATE.promoCodes.redeemed,
      ingredients:  STATE.ingredients,
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch(e) { console.warn('[SAVE] Erro ao salvar:', e); }
}

function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    STATE.nuggets      = data.nuggets      ?? 0;
    STATE.currentPhase = data.currentPhase ?? 0;
    STATE.introSeen    = data.introSeen    ?? false;
    STATE.bookSeen     = data.bookSeen     ?? false;
    STATE.ingredients  = data.ingredients  ?? [];
    Object.assign(STATE.settings, data.settings ?? {});
    STATE.promoCodes.redeemed = data.redeemed ?? [];
    return true;
  } catch(e) { console.warn('[LOAD] Erro ao carregar:', e); return false; }
}

/** Apaga TODO o progresso — usado pelo código DEV */
function resetAllProgress() {
  try { localStorage.removeItem(SAVE_KEY); } catch(e) {}
  STATE.nuggets       = 0;
  STATE.currentPhase  = 0;
  STATE.introSeen     = false;
  STATE.bookSeen      = false;
  STATE.promoCodes.redeemed = [];
  Object.assign(STATE.settings, {
    musicVol: 80, sfxVol: 80, mute: false,
    graphicsQuality: 'media', scanlines: true, pixelPerfect: true,
    resolution: '1280', fullscreen: false, brightness: 50, platform: 'pc',
  });
  console.log('%c[DEV] ✅ Todo o progresso foi resetado!', 'color:#44FF88;font-weight:bold');
}

// ──────────────────────────────────────────────────────────────
// INTRO (texto de patrocínio)
// ──────────────────────────────────────────────────────────────
const INTRO_LINES = [
  'Baseados em fatos que não aconteceram',
  'Mas que talvez aconteceriam\nse o McDonald\'s desaparecesse',
  '0% dos direitos reservados.\nRoubei mesmo.',
  'Eu lhes apresento...',
];

let introIndex = 0, introTimeout = null, introRunning = false;

function startIntro() {
  introRunning = true;
  showNextIntroLine();
}

function showNextIntroLine() {
  if (!introRunning) return;
  const el = document.getElementById('intro-line');
  el.classList.remove('visible', 'cursor');
  setTimeout(() => {
    if (!introRunning) return;
    if (introIndex >= INTRO_LINES.length) { enterMenu(); return; }
    el.innerHTML = INTRO_LINES[introIndex].replace(/\n/g, '<br>');
    if (introIndex === INTRO_LINES.length - 1) el.classList.add('cursor');
    el.classList.add('visible');
    introIndex++;
    const delay = introIndex === INTRO_LINES.length ? 2200 : 2600;
    introTimeout = setTimeout(showNextIntroLine, delay);
  }, 500);
}

function skipIntro() {
  introRunning = false;
  clearTimeout(introTimeout);
  enterMenu();
}

function enterMenu() {
  introRunning = false;
  STATE.introSeen = true;
  saveGame();
  const intro = document.getElementById('intro-screen');
  intro.style.opacity = '0';
  setTimeout(() => { intro.classList.add('hidden'); showMenu(); }, 800);
}

// ──────────────────────────────────────────────────────────────
// MENU
// ──────────────────────────────────────────────────────────────
function showMenu() {
  const menu = document.getElementById('menu-screen');
  menu.classList.remove('hidden');
  menu.style.opacity = '0';
  requestAnimationFrame(() => {
    menu.style.transition = 'opacity .6s ease';
    menu.style.opacity = '1';
  });

  updateNuggetDisplay();
  applySettings();
  renderIngredientTracker();
  checkCompletionMessage();

  // Start menu music
  if (typeof musicPlayMenu === 'function') {
    musicSyncSettings();
    musicPlayMenu();
  }

  const btnContinue = document.getElementById('btn-continue');
  if (STATE.currentPhase > 0) {
    btnContinue.classList.remove('disabled');
  } else {
    btnContinue.classList.add('disabled');
  }
}

function updateNuggetDisplay() {
  document.getElementById('nugget-value').textContent =
    STATE.nuggets.toLocaleString('pt-BR');
}

function addNuggets(amount) {
  if (amount === 0) return;
  STATE.nuggets += amount;
  updateNuggetDisplay();
  saveGame();
  const el = document.getElementById('nugget-value');
  el.classList.remove('nugget-pop');
  void el.offsetWidth;
  el.classList.add('nugget-pop');
}

// ──────────────────────────────────────────────────────────────
// INICIAR / CONTINUAR JOGO
// ──────────────────────────────────────────────────────────────
function applyFullscreenSetting() {
  if (STATE.settings.fullscreen) {
    document.documentElement.requestFullscreen?.().catch(()=>{});
  }
}

function startNewGame() {
  applyFullscreenSetting();
  // Novo Jogo SEMPRE mostra a história do livro
  STATE.currentPhase = 0;
  STATE.bookSeen = false; // força mostrar o livro de novo
  saveGame();
  const menu = document.getElementById('menu-screen');
  menu.style.opacity = '0';
  setTimeout(() => {
    menu.classList.add('hidden');
    showBookIntro();
  }, 400);
}

function continueGame() {
  const btnContinue = document.getElementById('btn-continue');
  if (btnContinue.classList.contains('disabled')) return;
  applyFullscreenSetting();
  const phase = STATE.currentPhase || 1;
  window.location.href = `fase${phase}.html`;
}

// ──────────────────────────────────────────────────────────────
// LIVRO 3D — INTRODUÇÃO
// ──────────────────────────────────────────────────────────────

/* Conteúdo das 4 páginas */
const BOOK_PAGES = [
  {
    image: 'assets/images/story/page1.png',
    alt:   'Michael chegando ao McDonald\'s',
    text:  '"Era uma vez, um garoto chamado Michael. Michael era muito fã do McDonald, e estava indo lá num sábado, a sétima vez na semana pedir o seu bigmac para o seu café da manhã."',
    num:   '— I —',
  },
  {
    image: 'assets/images/story/page2.png',
    alt:   'Big Mac roubado!',
    text:  'Mas quando ele falou seu pedido para o atendente, o atendente dá a péssima notícia que os ingredientes do Big Mac foram roubados!!!',
    num:   '— II —',
  },
  {
    image: 'assets/images/story/page3.png',
    alt:   'Michael em desespero',
    text:  'Michael entra em pânico. O que seria da sua vida sem os seus lindos hambúrgueres? Mas o atendente fala uma coisa importante, se Michael fosse valente o bastante...',
    num:   '— III —',
  },
  {
    image: 'assets/images/story/page4.png',
    alt:   'Michael parte em missão',
    text:  'Ele poderia seguir na floresta  para encontrar os ingredientes roubados, e então juntar para ter o seu bigmac de volta. Michael aceita, essa agora é sua missão',
    num:   '— IV —',
  },
];

/* Estado do livro */
let bookPage       = 0;  // página atual (0-3)
let bookIsAnimating = false;

function showBookIntro() {
  // Pause menu music during story
  if (typeof musicPause === 'function') musicPause();
  const screen = document.getElementById('book-screen');
  screen.classList.remove('hidden');
  screen.style.opacity = '0';
  setTimeout(() => {
    screen.style.transition = 'opacity .5s ease';
    screen.style.opacity = '1';
  }, 50);
}

function openBook() {
  const closed = document.getElementById('book-closed');
  const open   = document.getElementById('book-open');

  // Animate closed book flying open
  closed.style.transition = 'opacity .4s ease, transform .4s ease';
  closed.style.opacity = '0';
  closed.style.transform = 'scale(1.1)';

  setTimeout(() => {
    closed.classList.add('hidden');
    open.classList.remove('hidden');
    bookPage = 0;
    renderBookSpread(bookPage);
    renderPageDots();
  }, 400);
}

function renderBookSpread(pageIndex) {
  const leftContent  = document.getElementById('left-page-content');
  const rightContent = document.getElementById('right-page-content');

  if (pageIndex === 0) {
    // First spread: blank decorative left, page 1 on right
    leftContent.innerHTML  = buildBlankPage();
    rightContent.innerHTML = buildStoryPage(BOOK_PAGES[0], 1);
  } else if (pageIndex <= 2) {
    // Middle spreads: page N-1 left, page N right
    leftContent.innerHTML  = buildStoryPage(BOOK_PAGES[pageIndex - 1], pageIndex);
    rightContent.innerHTML = buildStoryPage(BOOK_PAGES[pageIndex], pageIndex + 1);
  } else {
    // Last spread: page 3 left, final/start page right
    leftContent.innerHTML  = buildStoryPage(BOOK_PAGES[2], 3);
    rightContent.innerHTML = buildFinalPage();
  }

  updatePageDots(pageIndex);
}

function buildBlankPage() {
  return `
    <div class="page-blank">
      <div class="page-blank-ornament">⊱ ────────── ⊰</div>
      <div class="page-blank-burger">🍔</div>
      <div class="page-blank-title">Michael<br>Em Busca do<br>Big Mac Perdido</div>
      <div class="page-blank-ornament">⊱ ────────── ⊰</div>
    </div>`;
}

function buildStoryPage(page, num) {
  // Try png first, fallback to svg via onerror
  const src = page.image;
  const pngSrc = src.endsWith('.png') ? src : src + '.png';
  const svgSrc = src.replace(/\.png$/, '') + '.svg';
  return `
    <div class="page-image-wrap">
      <img src="${pngSrc}" alt="${page.alt}"
           onerror="if(this.src!=='${svgSrc}')this.src='${svgSrc}'" />
    </div>
    <p class="page-text">${page.text}</p>
    <div class="page-number">${page.num}</div>`;
}

function buildFinalPage() {
  return `
    <div style="width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;gap:16px;position:relative;z-index:2;">
      <div style="font-family:'Cinzel',serif;font-size:clamp(9px,1.5vw,13px);color:var(--brown);text-align:center;line-height:1.8;">
        E assim começa a grande jornada de Michael em busca dos ingredientes do Big Mac perdido...
      </div>
      <div style="font-size:36px;margin:8px 0;">🍔</div>
      <div style="font-family:'Cinzel',serif;font-size:clamp(8px,1.2vw,11px);color:var(--brown);opacity:.6;text-align:center;font-style:italic;">
        Será que ele conseguirá?<br>Depende de você.
      </div>
      <button class="page-start-btn" onclick="startActualGame(event)">
        ▶ COMEÇAR AVENTURA
      </button>
      <div style="font-size:8px;font-family:'Press Start 2P',monospace;color:var(--brown);opacity:.4;margin-top:4px;">— FIM DO PRÓLOGO —</div>
    </div>`;
}

function renderPageDots() {
  const container = document.getElementById('page-dots');
  container.innerHTML = '';
  // 3 spreads (0, 1, 3)
  const spreads = [0, 1, 3];
  spreads.forEach((s, i) => {
    const dot = document.createElement('div');
    dot.className = 'page-dot' + (bookPage === s ? ' active' : '');
    container.appendChild(dot);
  });
}

function updatePageDots(pageIndex) {
  const dots = document.querySelectorAll('.page-dot');
  const activeIndex = pageIndex === 0 ? 0 : pageIndex <= 2 ? 1 : 2;
  dots.forEach((d, i) => d.classList.toggle('active', i === activeIndex));
}

function nextPage() {
  if (bookIsAnimating) return;
  const maxPage = 3; // 0=first spread, 1=middle, 2=last, 3=final
  if (bookPage >= maxPage) return;

  bookIsAnimating = true;

  const right = document.getElementById('book-page-right');
  const left  = document.getElementById('book-page-left');

  right.classList.add('page-flip-out-right');
  left.classList.add('page-flip-out-left');

  setTimeout(() => {
    right.classList.remove('page-flip-out-right');
    left.classList.remove('page-flip-out-left');

    bookPage++;
    renderBookSpread(bookPage);

    right.classList.add('page-flip-in-right');
    left.classList.add('page-flip-in-left');

    setTimeout(() => {
      right.classList.remove('page-flip-in-right');
      left.classList.remove('page-flip-in-left');
      bookIsAnimating = false;
    }, 320);
  }, 310);
}

function prevPage() {
  if (bookIsAnimating) return;
  if (bookPage <= 0) return;

  bookIsAnimating = true;

  const right = document.getElementById('book-page-right');
  const left  = document.getElementById('book-page-left');

  right.classList.add('page-flip-out-left');
  left.classList.add('page-flip-out-right');

  setTimeout(() => {
    right.classList.remove('page-flip-out-left');
    left.classList.remove('page-flip-out-right');

    bookPage--;
    renderBookSpread(bookPage);

    right.classList.add('page-flip-in-left');
    left.classList.add('page-flip-in-right');

    setTimeout(() => {
      right.classList.remove('page-flip-in-left');
      left.classList.remove('page-flip-in-right');
      bookIsAnimating = false;
    }, 320);
  }, 310);
}

function skipBookIntro() {
  const screen = document.getElementById('book-screen');
  screen.style.opacity = '0';
  setTimeout(() => {
    screen.classList.add('hidden');
    startActualGame();
  }, 400);
}

function startActualGame(e) {
  if (e) e.stopPropagation();

  STATE.bookSeen = true;
  STATE.currentPhase = 1;
  saveGame();

  const screen = document.getElementById('book-screen');
  screen.style.opacity = '0';
  setTimeout(() => {
    screen.classList.add('hidden');
    // Go to fase 1!
    window.location.href = 'fase1.html';
  }, 400);
}

// ──────────────────────────────────────────────────────────────
// MODALS
// ──────────────────────────────────────────────────────────────
function openModal(id) {
  closeAllModals(false);
  document.getElementById('modal-backdrop').classList.remove('hidden');
  const modal = document.getElementById('modal-' + id);
  if (!modal) return;
  modal.classList.remove('hidden');
  if (id === 'settings') initSettingsUI();
  if (id === 'promo')    renderPromoHistory();
  document.addEventListener('keydown', escListener);
}

function closeAllModals(rmEsc = true) {
  document.getElementById('modal-backdrop').classList.add('hidden');
  document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
  if (rmEsc) document.removeEventListener('keydown', escListener);
}

function escListener(e) { if (e.key === 'Escape') closeAllModals(); }

// ──────────────────────────────────────────────────────────────
// SETTINGS
// ──────────────────────────────────────────────────────────────
function switchTab(id) {
  document.querySelectorAll('.tab-btn').forEach(b => {
    b.classList.toggle('active', b.getAttribute('onclick').includes("'"+id+"'"));
  });
  document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
  const tab = document.getElementById('tab-' + id);
  if (tab) tab.classList.remove('hidden');
}

function initSettingsUI() {
  const s = STATE.settings;
  setSlider('vol-music','vol-music-val', s.musicVol);
  setSlider('vol-sfx',  'vol-sfx-val',  s.sfxVol);
  setToggle('btn-mute',      s.mute);
  setToggle('btn-scanlines', s.scanlines);
  setToggle('btn-pixel',     s.pixelPerfect);
  setSlider('brightness','brightness-val', s.brightness);
  setToggle('btn-fullscreen', s.fullscreen);
  setPlatformUI(s.platform);
  renderPromoHistory();
}

function setSlider(inputId, valId, value) {
  const el = document.getElementById(inputId);
  const vl = document.getElementById(valId);
  if (el) el.value = value;
  if (vl) vl.textContent = value;
}

function setToggle(btnId, isOn) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.textContent = isOn ? 'ON' : 'OFF';
  btn.dataset.on  = isOn ? 'true' : 'false';
  btn.classList.toggle('active-on', !!isOn);
}

function updateSetting(key, value) {
  STATE.settings[key] = isNaN(value) ? value : Number(value);
  applySettings();
  saveGame();
}

function setOption(btn, key, value) {
  btn.closest('.option-group')?.querySelectorAll('.opt-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  updateSetting(key, value);
}

function toggleMute()       { STATE.settings.mute        = !STATE.settings.mute;        setToggle('btn-mute',      STATE.settings.mute);        saveGame(); }
function toggleScanlines()  { STATE.settings.scanlines   = !STATE.settings.scanlines;   setToggle('btn-scanlines', STATE.settings.scanlines);   applySettings(); saveGame(); }
function togglePixel()      { STATE.settings.pixelPerfect= !STATE.settings.pixelPerfect;setToggle('btn-pixel',     STATE.settings.pixelPerfect);applySettings(); saveGame(); }

function toggleFullscreen() {
  STATE.settings.fullscreen = !STATE.settings.fullscreen;
  setToggle('btn-fullscreen', STATE.settings.fullscreen);
  if (STATE.settings.fullscreen) document.documentElement.requestFullscreen?.().catch(()=>{});
  else document.exitFullscreen?.().catch(()=>{});
  saveGame();
}

function setPlatform(platform) {
  STATE.settings.platform = platform;
  document.getElementById('plat-pc').classList.toggle('active',     platform === 'pc');
  document.getElementById('plat-mobile').classList.toggle('active', platform === 'mobile');
  setPlatformUI(platform);
  saveGame();
}
function setPlatformUI(platform) {
  document.getElementById('controls-pc').classList.toggle('hidden',     platform !== 'pc');
  document.getElementById('controls-mobile').classList.toggle('hidden', platform !== 'mobile');
}

function applySettings() {
  const s = STATE.settings;
  document.querySelectorAll('.scanlines').forEach(el => {
    el.style.display = s.scanlines ? 'block' : 'none';
  });
  document.documentElement.style.setProperty('--brightness', s.brightness / 50);
  document.body.style.imageRendering = s.pixelPerfect ? 'pixelated' : 'auto';
}

// ──────────────────────────────────────────────────────────────
// PROMO CODES
// ──────────────────────────────────────────────────────────────
function redeemCode() {
  const input  = document.getElementById('promo-input');
  const result = document.getElementById('promo-result');
  const code   = input.value.trim().toUpperCase();

  if (!code) { result.className='promo-error'; result.textContent='⚠ Digite um código primeiro!'; return; }

  // Código dev especial — reseta tudo
  if (code === 'DEVRESETALL') {
    resetAllProgress();
    result.className = 'promo-success';
    result.textContent = '🔧 DEV: Todo progresso resetado! Atualize a página.';
    input.value = '';
    updateNuggetDisplay();
    return;
  }

  if (STATE.promoCodes.redeemed.includes(code)) {
    result.className='promo-already'; result.textContent='🔁 Código "'+code+'" já foi resgatado!'; return;
  }

  const promo = STATE.promoCodes.available[code];
  if (!promo) { result.className='promo-error'; result.textContent='✕ Código inválido. Tente outro!'; return; }

  STATE.promoCodes.redeemed.push(code);
  addNuggets(promo.reward);
  result.className = 'promo-success';
  result.textContent = '✔ ' + promo.msg;
  input.value = '';
  renderPromoHistory();
  saveGame();
}

function renderPromoHistory() {
  const container = document.getElementById('promo-history');
  if (!container) return;
  if (STATE.promoCodes.redeemed.length === 0) {
    container.innerHTML = '<span style="font-size:7px;color:rgba(255,245,214,0.3);letter-spacing:.06em">Nenhum código resgatado ainda...</span>';
    return;
  }
  container.innerHTML = STATE.promoCodes.redeemed
    .map(c => `<span class="promo-tag">✔ ${c}</span>`)
    .join('');
}

// ──────────────────────────────────────────────────────────────
// GAMEPAD NAVIGATION (menu) — reescrito do zero
// ──────────────────────────────────────────────────────────────
const MENU_GP = {
  connected: false, type: 'xbox',
  DZ: 0.28,
  // prev states
  btnA_prev: false, btnB_prev: false,
  dUp_prev: false, dDown_prev: false,
  dLeft_prev: false, dRight_prev: false,
  axisY_prev: 0,
  // nav state
  focusIndex: 0,
  _menuActive: false,
  lastNavTime: 0,
  NAV_REPEAT: 180,
  _settingsIdx: 0,
};

let _gpPollId = null;

function startMenuGpPoll() {
  // Use rAF instead of setInterval for better reliability
  function gpFrame() {
    pollMenuGamepad();
    _gpPollId = requestAnimationFrame(gpFrame);
  }
  gpFrame();
}

function pollMenuGamepad() {
  const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
  let gp = null;
  for (const g of gamepads) { if (g && g.connected) { gp = g; break; } }

  if (!gp) {
    if (MENU_GP.connected) {
      MENU_GP.connected = false;
      MENU_GP._menuActive = false;
      document.getElementById('gp-indicator')?.classList.add('hidden');
    }
    return;
  }

  if (!MENU_GP.connected) {
    MENU_GP.connected = true;
    MENU_GP._menuActive = false;
    MENU_GP.focusIndex = 0;
    MENU_GP.type = /playstation|dualshock|dualsense/i.test(gp.id) ? 'ps' : 'xbox';
    showGpIndicator();
  }

  const now = Date.now();

  // Read all inputs
  const btnA   = !!(gp.buttons[0]?.pressed);
  const btnB   = !!(gp.buttons[1]?.pressed);
  const dUp    = !!(gp.buttons[12]?.pressed);
  const dDown  = !!(gp.buttons[13]?.pressed);
  const dLeft  = !!(gp.buttons[14]?.pressed);
  const dRight = !!(gp.buttons[15]?.pressed);
  const axisY  = Math.abs(gp.axes[1]) > MENU_GP.DZ ? gp.axes[1] : 0;
  const axisX  = Math.abs(gp.axes[0]) > MENU_GP.DZ ? gp.axes[0] : 0;

  // Edge detection
  const pressA  = btnA  && !MENU_GP.btnA_prev;
  const pressB  = btnB  && !MENU_GP.btnB_prev;
  const pressUp = (dUp && !MENU_GP.dUp_prev) ||
                  (axisY < -0.4 && MENU_GP.axisY_prev >= -0.4 && now - MENU_GP.lastNavTime > MENU_GP.NAV_REPEAT);
  const pressDown = (dDown && !MENU_GP.dDown_prev) ||
                    (axisY > 0.4 && MENU_GP.axisY_prev <= 0.4 && now - MENU_GP.lastNavTime > MENU_GP.NAV_REPEAT);
  const pressLeft  = (dLeft  && !MENU_GP.dLeft_prev)  || (axisX < -0.4 && now - MENU_GP.lastNavTime > MENU_GP.NAV_REPEAT);
  const pressRight = (dRight && !MENU_GP.dRight_prev) || (axisX >  0.4 && now - MENU_GP.lastNavTime > MENU_GP.NAV_REPEAT);

  if (pressUp || pressDown || pressLeft || pressRight) MENU_GP.lastNavTime = now;

  // ── Route input based on what's visible ──
  const activeModal = getActiveModal();

  if (activeModal === 'none') {
    gpNavMainMenu(pressUp, pressDown, pressA, pressB);
  } else if (activeModal === 'settings') {
    gpNavSettings(pressUp, pressDown, pressLeft, pressRight, pressA, pressB);
  } else if (activeModal === 'other') {
    if (pressB) closeAllModals();
    // Navigate buttons inside modal
    gpNavGenericModal(pressUp, pressDown, pressA, pressB);
  } else if (activeModal === 'book') {
    if (pressRight || pressA) nextPage?.();
    if (pressLeft) prevPage?.();
    if (pressB) skipBookIntro?.();
  }

  // Save prev
  MENU_GP.btnA_prev = btnA; MENU_GP.btnB_prev = btnB;
  MENU_GP.dUp_prev = dUp;   MENU_GP.dDown_prev = dDown;
  MENU_GP.dLeft_prev = dLeft; MENU_GP.dRight_prev = dRight;
  MENU_GP.axisY_prev = axisY;
}

function getActiveModal() {
  if (!document.getElementById('modal-backdrop')?.classList.contains('hidden')) {
    if (!document.getElementById('modal-settings')?.classList.contains('hidden')) return 'settings';
    return 'other';
  }
  if (!document.getElementById('book-open')?.classList.contains('hidden')) return 'book';
  if (!document.getElementById('book-closed')?.classList.contains('hidden')) return 'book';
  return 'none';
}

function showGpIndicator() {
  const el = document.getElementById('gp-indicator');
  if (!el) return;
  document.getElementById('gp-indicator-icon').textContent = '🎮';
  document.getElementById('gp-indicator-text').textContent =
    MENU_GP.type === 'ps' ? 'DualShock detectado' : 'Controle Xbox detectado';
  el.classList.remove('hidden');
}

// ── MAIN MENU ──
const MENU_NAV_IDS = ['btn-play', 'btn-continue', 'btn-help', 'btn-credits'];

function gpNavMainMenu(up, down, pressA, pressB) {
  const btns = MENU_NAV_IDS.map(id => document.getElementById(id)).filter(Boolean);
  if (!btns.length) return;

  if (!MENU_GP._menuActive) {
    MENU_GP._menuActive = true;
    MENU_GP.focusIndex = 0;
    gpSetFocus(btns, 0);
    return;
  }

  let idx = Math.max(0, Math.min(MENU_GP.focusIndex, btns.length - 1));

  if (up)   { idx = (idx - 1 + btns.length) % btns.length; MENU_GP.focusIndex = idx; gpSetFocus(btns, idx); }
  if (down) { idx = (idx + 1) % btns.length;                MENU_GP.focusIndex = idx; gpSetFocus(btns, idx); }
  if (pressA) {
    sfxMenuClick();
    btns[idx]?.click();
  }
}

function gpSetFocus(btns, idx) {
  btns.forEach((b, i) => b.classList.toggle('gp-focused', i === idx));
}

// Keep old name as alias
const menuGpNav = gpNavMainMenu;
function setGpFocus(btns, idx) { gpSetFocus(btns, idx); }

// ── SETTINGS MODAL ──
function gpNavSettings(up, down, left, right, pressA, pressB) {
  if (pressB) { closeAllModals(); MENU_GP._menuActive = false; return; }
  const tabs = Array.from(document.querySelectorAll('#settings-tabs .tab-btn'));
  const activeTab = tabs.findIndex(t => t.classList.contains('active'));
  if (left  && activeTab > 0)             { sfxMenuClick(); tabs[activeTab - 1].click(); }
  if (right && activeTab < tabs.length-1) { sfxMenuClick(); tabs[activeTab + 1].click(); }

  const content = document.querySelector('.tab-content:not(.hidden)');
  if (!content) return;
  const rows = Array.from(content.querySelectorAll('.setting-row, .opt-btn.active, .toggle-btn'));
  if (!rows.length) return;
  if (!MENU_GP._settingsIdx) MENU_GP._settingsIdx = 0;
  if (up)   MENU_GP._settingsIdx = Math.max(0, MENU_GP._settingsIdx - 1);
  if (down) MENU_GP._settingsIdx = Math.min(rows.length - 1, MENU_GP._settingsIdx + 1);
  rows.forEach((r, i) => r.classList.toggle('gp-focused-item', i === MENU_GP._settingsIdx));
  if (pressA) {
    const el = rows[MENU_GP._settingsIdx];
    const btn = el?.querySelector('button, .opt-btn, .toggle-btn') || el;
    if (btn?.tagName === 'BUTTON') { sfxMenuClick(); btn.click(); }
  }
}

// ── GENERIC MODAL (help, credits, promo, etc) ──
function gpNavGenericModal(up, down, pressA, pressB) {
  const modal = document.querySelector('.modal:not(.hidden)');
  if (!modal) return;
  const focusables = Array.from(modal.querySelectorAll('button:not(.modal-close), .tab-btn, .shop-buy-btn, .promo-btn'));
  if (!focusables.length) {
    if (pressB || pressA) closeAllModals();
    return;
  }
  if (!MENU_GP._modalIdx) MENU_GP._modalIdx = 0;
  if (up)   MENU_GP._modalIdx = Math.max(0, MENU_GP._modalIdx - 1);
  if (down) MENU_GP._modalIdx = Math.min(focusables.length - 1, MENU_GP._modalIdx + 1);
  focusables.forEach((b, i) => b.classList.toggle('gp-focused', i === MENU_GP._modalIdx));
  if (pressA) { sfxMenuClick(); focusables[MENU_GP._modalIdx]?.click(); }
  if (pressB) { closeAllModals(); MENU_GP._menuActive = false; }
}

// ── SHOP GP ──
function shopGpNav() {} // kept for compatibility

function sfxMenuClick() {
  try {
    const ac = new (window.AudioContext || window.webkitAudioContext)();
    const o = ac.createOscillator(), g = ac.createGain();
    o.connect(g); g.connect(ac.destination);
    o.type = 'square'; o.frequency.value = 520;
    g.gain.setValueAtTime(0.14, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.1);
    o.start(); o.stop(ac.currentTime + 0.12);
  } catch(e) {}
}

function startMenuGpPollInterval() {
  startMenuGpPoll(); // calls the rAF version
}

// ──────────────────────────────────────────────────────────────
// BOOT
// ──────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  loadGame();

  // Enter key on promo input
  const pi = document.getElementById('promo-input');
  if (pi) pi.addEventListener('keydown', e => { if (e.key==='Enter') redeemCode(); });

  // Keyboard navigation for book (arrow keys)
  document.addEventListener('keydown', e => {
    const bookOpen = document.getElementById('book-open');
    if (!bookOpen || bookOpen.classList.contains('hidden')) return;
    if (e.key === 'ArrowRight') nextPage();
    if (e.key === 'ArrowLeft')  prevPage();
  });

  // DEV shortcut: Ctrl+Shift+R = reset
  document.addEventListener('keydown', e => {
    if (e.ctrlKey && e.shiftKey && e.key === 'R') {
      e.preventDefault();
      if (confirm('[DEV] Resetar TODO o progresso do jogo?')) {
        resetAllProgress();
        location.reload();
      }
    }
  });

  // Decide fluxo inicial
  if (!STATE.introSeen) {
    startIntro();
  } else {
    document.getElementById('intro-screen').classList.add('hidden');
    showMenu();
  }

  startMenuGpPoll();
  console.log('%c🍔 Michael: Em Busca do Big Mac Perdido', 'color:#FFD700;font-size:14px;font-weight:bold');
  console.log('%c[DEV] Use o código DEVRESETALL nos códigos promocionais, ou Ctrl+Shift+R para resetar tudo.', 'color:#FF9944');
});

// ──────────────────────────────────────────────────────────────
// INGREDIENTES DO BIG MAC (menu tracker)
// ──────────────────────────────────────────────────────────────
const INGREDIENTS = [
  {id:'bun_bottom',name:'Pão (Base)',    emoji:'🍞', phase:1},
  {id:'beef',      name:'Carne',         emoji:'🥩', phase:2},
  {id:'cheese',    name:'Queijo',        emoji:'🧀', phase:3},
  {id:'lettuce_i', name:'Alface',        emoji:'🥬', phase:4},
  {id:'sauce',     name:'Molho Especial',emoji:'🫙', phase:5},
  {id:'onion',     name:'Cebola',        emoji:'🧅', phase:6},
  {id:'bun_mid',   name:'Pão (Meio)',    emoji:'🍞', phase:7},
];

function renderIngredientTracker() {
  const el = document.getElementById('ingredient-tracker');
  if (!el) return;
  const collected = STATE.ingredients || [];
  el.innerHTML = '';
  INGREDIENTS.forEach(ing => {
    const got = collected.includes(ing.id);
    const slot = document.createElement('div');
    slot.className = 'ing-slot' + (got ? ' ing-got' : '');
    slot.title = ing.name + (got ? ' ✔ Coletado' : ' — Fase ' + ing.phase);
    slot.innerHTML = `<span class="ing-emoji">${got ? ing.emoji : '?'}</span>`;
    if (got) {
      const ck = document.createElement('span');
      ck.className = 'ing-check'; ck.textContent='✔';
      slot.appendChild(ck);
    }
    el.appendChild(slot);
  });
}

function checkCompletionMessage() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('completed') === 'fase1') {
    const collected = (STATE.ingredients || []).length;
    const total = 7;
    setTimeout(() => {
      showCompletionToast(`🍞 Pão (Base) coletado! +50🍗\n${collected}/${total} ingredientes do Big Mac`);
      window.history.replaceState({}, '', window.location.pathname);
    }, 600);
  }
}

function showCompletionToast(msg) {
  const el = document.getElementById('completion-toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.remove('hidden', 'toast-hide');
  el.classList.add('toast-show');
  setTimeout(() => {
    el.classList.add('toast-hide');
    setTimeout(() => el.classList.add('hidden'), 600);
  }, 4000);
}

// ──────────────────────────────────────────────────────────────
// SOM DE BOTÃO (Web Audio API — sem arquivo externo)
// ──────────────────────────────────────────────────────────────
let audioCtx = null;

function getAudioCtx() {
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {}
  }
  return audioCtx;
}

function playMenuClick() {
  if (STATE.settings.mute) return;
  const ctx = getAudioCtx(); if (!ctx) return;
  const vol = (STATE.settings.sfxVol ?? 80) / 100;
  // Pixel "blip" — short square wave
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain); gain.connect(ctx.destination);
  osc.type = 'square';
  osc.frequency.setValueAtTime(520, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(260, ctx.currentTime + 0.08);
  gain.gain.setValueAtTime(vol * 0.18, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.12);
}

function playMenuHover() {
  if (STATE.settings.mute) return;
  const ctx = getAudioCtx(); if (!ctx) return;
  const vol = (STATE.settings.sfxVol ?? 80) / 100;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain); gain.connect(ctx.destination);
  osc.type = 'square';
  osc.frequency.setValueAtTime(380, ctx.currentTime);
  gain.gain.setValueAtTime(vol * 0.08, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.07);
}

function playMenuBack() {
  if (STATE.settings.mute) return;
  const ctx = getAudioCtx(); if (!ctx) return;
  const vol = (STATE.settings.sfxVol ?? 80) / 100;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain); gain.connect(ctx.destination);
  osc.type = 'square';
  osc.frequency.setValueAtTime(260, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(130, ctx.currentTime + 0.1);
  gain.gain.setValueAtTime(vol * 0.15, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.14);
}

// Hook all menu buttons with sounds
function hookButtonSounds() {
  document.querySelectorAll('.menu-btn, .menu-btn-corner, .modal-close, .tab-btn, .shop-buy-btn, .pause-btn, .opt-btn, .toggle-btn, .promo-btn, .igm-tab, .igm-action-btn, .igm-redeem-btn, .shop-buy-btn, #cutscene-prev, #cutscene-next').forEach(btn => {
    if (btn.dataset.soundHooked) return;
    btn.dataset.soundHooked = '1';
    btn.addEventListener('mouseenter', () => playMenuHover());
    btn.addEventListener('click',      () => playMenuClick());
  });
  // Close buttons get "back" sound
  document.querySelectorAll('.modal-close, .igm-close, #shop-close, .confirm-no, .go-btn-sec').forEach(btn => {
    if (btn.dataset.backHooked) return;
    btn.dataset.backHooked = '1';
    btn.addEventListener('click', () => playMenuBack());
  });
}

// Re-hook when modals open (since modals get added dynamically)
const _origOpenModal = typeof openModal !== 'undefined' ? openModal : null;
document.addEventListener('click', () => {
  // Lazy hook on any interaction
  setTimeout(hookButtonSounds, 50);
}, {once: false, passive: true});

window.addEventListener('load', hookButtonSounds);