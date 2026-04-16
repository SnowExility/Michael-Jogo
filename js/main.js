/* ================================================================
   MICHAEL: EM BUSCA DO BIG MAC PERDIDO  —  main.js
   ================================================================ */
'use strict';

const STATE = {
  nuggets:0,currentPhase:0,introSeen:false,bookSeen:false,ingredients:[],
  settings:{musicVol:80,sfxVol:80,mute:false,graphicsQuality:'media',scanlines:true,pixelPerfect:true,resolution:'1280',fullscreen:false,brightness:50,platform:'pc'},
  promoCodes:{redeemed:[],available:{
    'BIGMAC':      {reward:50,  msg:'+50 Nuggets!'},
    'LIA':         {reward:20,  msg:'+20 Nuggets! 🧔'},
    'MEUBILU':     {reward:100, msg:'+100 Nuggets!'},
    'RHYAN':       {reward:30,  msg:'+30 Nuggets!'},
    'SIXSEVEN':    {reward:75,  msg:'+67 Nuggets!'},
    'DAVICAGADOR': {reward:200, msg:'+200 Nuggets!'},
    'DEVRESETALL': {reward:0,   msg:'🔧 MODO DEV: Progresso resetado!',dev:true},
  }}
};

const SAVE_KEY = 'michael_bigmac_save_v1';
function saveGame(){try{localStorage.setItem(SAVE_KEY,JSON.stringify({nuggets:STATE.nuggets,currentPhase:STATE.currentPhase,introSeen:STATE.introSeen,bookSeen:STATE.bookSeen,settings:STATE.settings,redeemed:STATE.promoCodes.redeemed,ingredients:STATE.ingredients}));}catch(e){}}
function loadGame(){try{const d=JSON.parse(localStorage.getItem(SAVE_KEY)||'{}');STATE.nuggets=d.nuggets??0;STATE.currentPhase=d.currentPhase??0;STATE.introSeen=d.introSeen??false;STATE.bookSeen=d.bookSeen??false;STATE.ingredients=d.ingredients??[];Object.assign(STATE.settings,d.settings??{});STATE.promoCodes.redeemed=d.redeemed??[];return true;}catch(e){return false;}}
function resetAllProgress(){try{localStorage.removeItem(SAVE_KEY);}catch(e){}STATE.nuggets=0;STATE.currentPhase=0;STATE.introSeen=false;STATE.bookSeen=false;STATE.promoCodes.redeemed=[];Object.assign(STATE.settings,{musicVol:80,sfxVol:80,mute:false,graphicsQuality:'media',scanlines:true,pixelPerfect:true,resolution:'1280',fullscreen:false,brightness:50,platform:'pc'});}

const INTRO_LINES=['Baseados em fatos que não aconteceram','Mas que talvez aconteceriam\nse o McDonald\'s desaparecesse','0% dos direitos reservados.\nRoubei mesmo.','Eu lhes apresento...'];
let introIndex=0,introTimeout=null,introRunning=false;
function startIntro(){introRunning=true;showNextIntroLine();}
function showNextIntroLine(){if(!introRunning)return;const el=document.getElementById('intro-line');el.classList.remove('visible','cursor');setTimeout(()=>{if(!introRunning)return;if(introIndex>=INTRO_LINES.length){enterMenu();return;}el.innerHTML=INTRO_LINES[introIndex].replace(/\n/g,'<br>');if(introIndex===INTRO_LINES.length-1)el.classList.add('cursor');el.classList.add('visible');introIndex++;const delay=introIndex===INTRO_LINES.length?2200:2600;introTimeout=setTimeout(showNextIntroLine,delay);},500);}
function skipIntro(){introRunning=false;clearTimeout(introTimeout);enterMenu();}
function enterMenu(){introRunning=false;STATE.introSeen=true;saveGame();const intro=document.getElementById('intro-screen');intro.style.opacity='0';setTimeout(()=>{intro.classList.add('hidden');showMenu();},800);}

function showMenu(){
  const menu=document.getElementById('menu-screen');
  menu.classList.remove('hidden');menu.style.opacity='0';
  requestAnimationFrame(()=>{menu.style.transition='opacity .6s ease';menu.style.opacity='1';});
  updateNuggetDisplay();applySettings();renderIngredientTracker();checkCompletionMessage();
  if(typeof musicPlayMenu==='function'){musicSyncSettings();musicPlayMenu();}
  const bc=document.getElementById('btn-continue');
  if(STATE.currentPhase>0)bc.classList.remove('disabled');else bc.classList.add('disabled');
}
function updateNuggetDisplay(){document.getElementById('nugget-value').textContent=STATE.nuggets.toLocaleString('pt-BR');}
function addNuggets(amount){if(amount===0)return;STATE.nuggets+=amount;updateNuggetDisplay();saveGame();const el=document.getElementById('nugget-value');el.classList.remove('nugget-pop');void el.offsetWidth;el.classList.add('nugget-pop');}

function startNewGame(){
  document.documentElement.requestFullscreen?.().catch(()=>{});
  STATE.currentPhase=0;STATE.bookSeen=false;saveGame();
  const menu=document.getElementById('menu-screen');menu.style.opacity='0';
  setTimeout(()=>{menu.classList.add('hidden');showBookIntro();},400);
}
function continueGame(){
  const bc=document.getElementById('btn-continue');if(bc.classList.contains('disabled'))return;
  document.documentElement.requestFullscreen?.().catch(()=>{});
  window.location.href=`fase${STATE.currentPhase||1}.html`;
}

// ── BOOK PAGES ──
const BOOK_PAGES=[
  {image:'assets/images/story/page1',alt:'Michael chegando ao McDonald\'s',text:'Era uma manhã comum quando Michael iria comer seu primeiro hamburguer de manhã, ele caminhava ate o McDonalds para seu café da manhã, junto de um refrigerante',num:'— I —'},
  {image:'assets/images/story/page2',alt:'Big Mac roubado!',text:'Ao chegar no balcão, fez seu pedido de sempre. Mas o atendente lhe trouxe uma noticia horrivel "S-senhor... o Big Mac foi ROUBADO!" O hambúrguer e todos os ingredientes tinham desaparecido.',num:'— II —'},
  {image:'assets/images/story/page3',alt:'Michael em desespero',text:'Michael logo entrou em panico, pois o seu BigMac era a unica coisa que salvava a manhã dele, sem o BigMac de manhã, ele não poderia render nas partidas ranqueadas no League Of Legends!!!',num:'— III —'},
  {image:'assets/images/story/page4',alt:'Michael parte em missão',text:'Mas, o atendente falou sobre uma coisa que poderia mudar isso: quem roubou fugiu por aquela floresta. Se Michael tiver coragem, vai conseguir recuperar os hamburgueres!<br><br>E assim foi feito, Michael partiu em busca do BIG MAC PERDIDO.',num:'— IV —'},
];
let bookPage=0,bookIsAnimating=false;

function showBookIntro(){if(typeof musicPause==='function')musicPause();const s=document.getElementById('book-screen');s.classList.remove('hidden');s.style.opacity='0';setTimeout(()=>{s.style.transition='opacity .5s ease';s.style.opacity='1';},50);}
function openBook(){const c=document.getElementById('book-closed'),o=document.getElementById('book-open');c.style.transition='opacity .4s ease,transform .4s ease';c.style.opacity='0';c.style.transform='scale(1.1)';setTimeout(()=>{c.classList.add('hidden');o.classList.remove('hidden');bookPage=0;renderBookSpread(0);renderPageDots();},400);}

function renderBookSpread(pi){
  const lc=document.getElementById('left-page-content'),rc=document.getElementById('right-page-content');
  if(pi===0){lc.innerHTML=buildBlankPage();rc.innerHTML=buildStoryPage(BOOK_PAGES[0],1);}
  else if(pi<=2){lc.innerHTML=buildStoryPage(BOOK_PAGES[pi-1],pi);rc.innerHTML=buildStoryPage(BOOK_PAGES[pi],pi+1);}
  else{lc.innerHTML=buildStoryPage(BOOK_PAGES[2],3);rc.innerHTML=buildFinalPage();}
  updatePageDots(pi);
}
function buildBlankPage(){return`<div class="page-blank"><div class="page-blank-ornament">⊱ ────────── ⊰</div><div class="page-blank-burger">🍔</div><div class="page-blank-title">Michael<br>Em Busca do<br>Big Mac Perdido</div><div class="page-blank-ornament">⊱ ────────── ⊰</div></div>`;}
function buildStoryPage(page,num){const src=page.image;const png=src.endsWith('.png')?src:src+'.png';const svg=src.replace(/\.png$/,'')+'.svg';return`<div class="page-image-wrap"><img src="${png}" alt="${page.alt}" onerror="if(this.src!=='${svg}')this.src='${svg}'"/></div><p class="page-text">${page.text}</p><div class="page-number">${page.num}</div>`;}
function buildFinalPage(){return`<div class="page-final"><div class="page-final-text">E assim começa a grande jornada de Michael em busca dos ingredientes do Big Mac perdido...</div><div style="font-size:36px;margin:8px 0">🍔</div><div class="page-final-sub">Será que ele conseguirá?<br>Depende de você.</div><button class="page-start-btn" onclick="startActualGame(event)">▶ COMEÇAR AVENTURA</button><div class="page-final-footer">— FIM DO PRÓLOGO —</div></div>`;}

function renderPageDots(){const c=document.getElementById('page-dots');c.innerHTML='';[0,1,3].forEach((s,i)=>{const d=document.createElement('div');d.className='page-dot'+(bookPage===s?' active':'');c.appendChild(d);});}
function updatePageDots(pi){const dots=document.querySelectorAll('.page-dot');const ai=pi===0?0:pi<=2?1:2;dots.forEach((d,i)=>d.classList.toggle('active',i===ai));}

function nextPage(){
  if(bookIsAnimating)return;if(bookPage>=3)return;
  bookIsAnimating=true;
  const r=document.getElementById('book-page-right'),l=document.getElementById('book-page-left');
  r.classList.add('page-flip-out-right');l.classList.add('page-flip-out-left');
  setTimeout(()=>{r.classList.remove('page-flip-out-right');l.classList.remove('page-flip-out-left');bookPage++;renderBookSpread(bookPage);r.classList.add('page-flip-in-right');l.classList.add('page-flip-in-left');setTimeout(()=>{r.classList.remove('page-flip-in-right');l.classList.remove('page-flip-in-left');bookIsAnimating=false;},340);},330);
}
function prevPage(){
  if(bookIsAnimating)return;if(bookPage<=0)return;
  bookIsAnimating=true;
  const r=document.getElementById('book-page-right'),l=document.getElementById('book-page-left');
  r.classList.add('page-flip-out-left');l.classList.add('page-flip-out-right');
  setTimeout(()=>{r.classList.remove('page-flip-out-left');l.classList.remove('page-flip-out-right');bookPage--;renderBookSpread(bookPage);r.classList.add('page-flip-in-left');l.classList.add('page-flip-in-right');setTimeout(()=>{r.classList.remove('page-flip-in-left');l.classList.remove('page-flip-in-right');bookIsAnimating=false;},340);},330);
}
function skipBookIntro(){const s=document.getElementById('book-screen');s.style.opacity='0';setTimeout(()=>{s.classList.add('hidden');startActualGame();},400);}
function startActualGame(e){if(e)e.stopPropagation();STATE.bookSeen=true;STATE.currentPhase=1;saveGame();const s=document.getElementById('book-screen');s.style.opacity='0';setTimeout(()=>{s.classList.add('hidden');window.location.href='fase1.html';},400);}

// ── MODALS ──
function openModal(id){closeAllModals(false);document.getElementById('modal-backdrop').classList.remove('hidden');const m=document.getElementById('modal-'+id);if(!m)return;m.classList.remove('hidden');if(id==='settings')initSettingsUI();if(id==='promo')renderPromoHistory();document.addEventListener('keydown',escListener);}
function closeAllModals(rmEsc=true){document.getElementById('modal-backdrop').classList.add('hidden');document.querySelectorAll('.modal').forEach(m=>m.classList.add('hidden'));if(rmEsc)document.removeEventListener('keydown',escListener);}
function escListener(e){if(e.key==='Escape')closeAllModals();}
function switchTab(id){document.querySelectorAll('.tab-btn').forEach(b=>{b.classList.toggle('active',b.getAttribute('onclick').includes("'"+id+"'"));});document.querySelectorAll('.tab-content').forEach(c=>c.classList.add('hidden'));const t=document.getElementById('tab-'+id);if(t)t.classList.remove('hidden');}
function initSettingsUI(){const s=STATE.settings;setSlider('vol-music','vol-music-val',s.musicVol);setSlider('vol-sfx','vol-sfx-val',s.sfxVol);setToggle('btn-mute',s.mute);setToggle('btn-scanlines',s.scanlines);setToggle('btn-pixel',s.pixelPerfect);setSlider('brightness','brightness-val',s.brightness);setToggle('btn-fullscreen',s.fullscreen);setPlatformUI(s.platform);renderPromoHistory();}
function setSlider(iid,vid,v){const e=document.getElementById(iid),vl=document.getElementById(vid);if(e)e.value=v;if(vl)vl.textContent=v;}
function setToggle(bid,on){const b=document.getElementById(bid);if(!b)return;b.textContent=on?'ON':'OFF';b.dataset.on=on?'true':'false';b.classList.toggle('active-on',!!on);}
function updateSetting(key,value){STATE.settings[key]=isNaN(value)?value:Number(value);applySettings();saveGame();if(key==='musicVol'&&typeof musicSetVolume==='function')musicSetVolume(Number(value));}
function setOption(btn,key,value){btn.closest('.option-group')?.querySelectorAll('.opt-btn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');updateSetting(key,value);}
function toggleMute(){STATE.settings.mute=!STATE.settings.mute;setToggle('btn-mute',STATE.settings.mute);saveGame();if(typeof musicSetMute==='function')musicSetMute(STATE.settings.mute);}
function toggleScanlines(){STATE.settings.scanlines=!STATE.settings.scanlines;setToggle('btn-scanlines',STATE.settings.scanlines);applySettings();saveGame();}
function togglePixel(){STATE.settings.pixelPerfect=!STATE.settings.pixelPerfect;setToggle('btn-pixel',STATE.settings.pixelPerfect);applySettings();saveGame();}
function toggleFullscreen(){STATE.settings.fullscreen=!STATE.settings.fullscreen;setToggle('btn-fullscreen',STATE.settings.fullscreen);if(STATE.settings.fullscreen)document.documentElement.requestFullscreen?.().catch(()=>{});else document.exitFullscreen?.().catch(()=>{});saveGame();}
function setPlatform(platform){STATE.settings.platform=platform;document.getElementById('plat-pc').classList.toggle('active',platform==='pc');document.getElementById('plat-mobile').classList.toggle('active',platform==='mobile');setPlatformUI(platform);saveGame();}
function setPlatformUI(platform){document.getElementById('controls-pc').classList.toggle('hidden',platform!=='pc');document.getElementById('controls-mobile').classList.toggle('hidden',platform!=='mobile');}
function applySettings(){const s=STATE.settings;document.querySelectorAll('.scanlines').forEach(el=>{el.style.display=s.scanlines?'block':'none';});document.documentElement.style.setProperty('--brightness',s.brightness/50);document.body.style.imageRendering=s.pixelPerfect?'pixelated':'auto';}

// ── PROMO CODES ──
function redeemCode(){const input=document.getElementById('promo-input'),result=document.getElementById('promo-result'),code=input.value.trim().toUpperCase();if(!code){result.className='promo-error';result.textContent='⚠ Digite um código primeiro!';return;}if(code==='DEVRESETALL'){resetAllProgress();result.className='promo-success';result.textContent='🔧 DEV: Todo progresso resetado!';input.value='';updateNuggetDisplay();return;}if(STATE.promoCodes.redeemed.includes(code)){result.className='promo-already';result.textContent='🔁 Código já foi resgatado!';return;}const promo=STATE.promoCodes.available[code];if(!promo){result.className='promo-error';result.textContent='✕ Código inválido. Tente outro!';return;}STATE.promoCodes.redeemed.push(code);addNuggets(promo.reward);result.className='promo-success';result.textContent='✔ '+promo.msg;input.value='';renderPromoHistory();saveGame();}
function renderPromoHistory(){const c=document.getElementById('promo-history');if(!c)return;if(!STATE.promoCodes.redeemed.length){c.innerHTML='<span style="font-size:7px;color:rgba(255,245,214,0.3);letter-spacing:.06em">Nenhum código resgatado ainda...</span>';return;}c.innerHTML=STATE.promoCodes.redeemed.map(c=>`<span class="promo-tag">✔ ${c}</span>`).join('');}

// ── GAMEPAD ──
const MENU_GP={connected:false,type:'xbox',DZ:0.28,btnA_prev:false,btnB_prev:false,dUp_prev:false,dDown_prev:false,dLeft_prev:false,dRight_prev:false,axisY_prev:0,focusIndex:0,_menuActive:false,lastNavTime:0,NAV_REPEAT:180,_settingsIdx:0};
function startMenuGpPoll(){function gpFrame(){pollMenuGamepad();requestAnimationFrame(gpFrame);}gpFrame();}
function pollMenuGamepad(){const gamepads=navigator.getGamepads?navigator.getGamepads():[];let gp=null;for(const g of gamepads){if(g&&g.connected){gp=g;break;}}if(!gp){if(MENU_GP.connected){MENU_GP.connected=false;MENU_GP._menuActive=false;document.getElementById('gp-indicator')?.classList.add('hidden');}return;}if(!MENU_GP.connected){MENU_GP.connected=true;MENU_GP._menuActive=false;MENU_GP.focusIndex=0;MENU_GP.type=/playstation|dualshock|dualsense/i.test(gp.id)?'ps':'xbox';showGpIndicator();}const now=Date.now();const btnA=!!(gp.buttons[0]?.pressed),btnB=!!(gp.buttons[1]?.pressed),dUp=!!(gp.buttons[12]?.pressed),dDown=!!(gp.buttons[13]?.pressed),dLeft=!!(gp.buttons[14]?.pressed),dRight=!!(gp.buttons[15]?.pressed),axisY=Math.abs(gp.axes[1])>MENU_GP.DZ?gp.axes[1]:0,axisX=Math.abs(gp.axes[0])>MENU_GP.DZ?gp.axes[0]:0;const pressA=btnA&&!MENU_GP.btnA_prev,pressB=btnB&&!MENU_GP.btnB_prev,pressUp=(dUp&&!MENU_GP.dUp_prev)||(axisY<-0.4&&MENU_GP.axisY_prev>=-0.4&&now-MENU_GP.lastNavTime>MENU_GP.NAV_REPEAT),pressDown=(dDown&&!MENU_GP.dDown_prev)||(axisY>0.4&&MENU_GP.axisY_prev<=0.4&&now-MENU_GP.lastNavTime>MENU_GP.NAV_REPEAT),pressLeft=(dLeft&&!MENU_GP.dLeft_prev)||(axisX<-0.4&&now-MENU_GP.lastNavTime>MENU_GP.NAV_REPEAT),pressRight=(dRight&&!MENU_GP.dRight_prev)||(axisX>0.4&&now-MENU_GP.lastNavTime>MENU_GP.NAV_REPEAT);if(pressUp||pressDown||pressLeft||pressRight)MENU_GP.lastNavTime=now;const am=getActiveModal();if(am==='none')gpNavMainMenu(pressUp,pressDown,pressA,pressB);else if(am==='settings')gpNavSettings(pressUp,pressDown,pressLeft,pressRight,pressA,pressB);else if(am==='other'){if(pressB)closeAllModals();gpNavGenericModal(pressUp,pressDown,pressA,pressB);}else if(am==='book'){if(pressRight||pressA)nextPage?.();if(pressLeft)prevPage?.();if(pressB)skipBookIntro?.();}MENU_GP.btnA_prev=btnA;MENU_GP.btnB_prev=btnB;MENU_GP.dUp_prev=dUp;MENU_GP.dDown_prev=dDown;MENU_GP.dLeft_prev=dLeft;MENU_GP.dRight_prev=dRight;MENU_GP.axisY_prev=axisY;}
function getActiveModal(){if(!document.getElementById('modal-backdrop')?.classList.contains('hidden')){if(!document.getElementById('modal-settings')?.classList.contains('hidden'))return'settings';return'other';}if(!document.getElementById('book-open')?.classList.contains('hidden'))return'book';if(!document.getElementById('book-closed')?.classList.contains('hidden'))return'book';return'none';}
function showGpIndicator(){const el=document.getElementById('gp-indicator');if(!el)return;document.getElementById('gp-indicator-icon').textContent='🎮';document.getElementById('gp-indicator-text').textContent=MENU_GP.type==='ps'?'DualShock detectado':'Controle Xbox detectado';el.classList.remove('hidden');}
const MENU_NAV_IDS=['btn-play','btn-continue','btn-help','btn-credits'];
function gpNavMainMenu(up,down,pressA,pressB){const btns=MENU_NAV_IDS.map(id=>document.getElementById(id)).filter(Boolean);if(!btns.length)return;if(!MENU_GP._menuActive){MENU_GP._menuActive=true;MENU_GP.focusIndex=0;gpSetFocus(btns,0);return;}let idx=Math.max(0,Math.min(MENU_GP.focusIndex,btns.length-1));if(up){idx=(idx-1+btns.length)%btns.length;MENU_GP.focusIndex=idx;gpSetFocus(btns,idx);}if(down){idx=(idx+1)%btns.length;MENU_GP.focusIndex=idx;gpSetFocus(btns,idx);}if(pressA){sfxMenuClick();btns[idx]?.click();}}
function gpSetFocus(btns,idx){btns.forEach((b,i)=>b.classList.toggle('gp-focused',i===idx));}
function gpNavSettings(up,down,left,right,pressA,pressB){if(pressB){closeAllModals();MENU_GP._menuActive=false;return;}const tabs=Array.from(document.querySelectorAll('#settings-tabs .tab-btn'));const ai=tabs.findIndex(t=>t.classList.contains('active'));if(left&&ai>0){sfxMenuClick();tabs[ai-1].click();}if(right&&ai<tabs.length-1){sfxMenuClick();tabs[ai+1].click();}const content=document.querySelector('.tab-content:not(.hidden)');if(!content)return;const rows=Array.from(content.querySelectorAll('.setting-row,.opt-btn.active,.toggle-btn'));if(!rows.length)return;if(!MENU_GP._settingsIdx)MENU_GP._settingsIdx=0;if(up)MENU_GP._settingsIdx=Math.max(0,MENU_GP._settingsIdx-1);if(down)MENU_GP._settingsIdx=Math.min(rows.length-1,MENU_GP._settingsIdx+1);rows.forEach((r,i)=>r.classList.toggle('gp-focused-item',i===MENU_GP._settingsIdx));if(pressA){const el=rows[MENU_GP._settingsIdx];const btn=el?.querySelector('button,.opt-btn,.toggle-btn')||el;if(btn?.tagName==='BUTTON'){sfxMenuClick();btn.click();}}}
function gpNavGenericModal(up,down,pressA,pressB){const modal=document.querySelector('.modal:not(.hidden)');if(!modal)return;const f=Array.from(modal.querySelectorAll('button:not(.modal-close),.tab-btn,.promo-btn'));if(!f.length){if(pressB||pressA)closeAllModals();return;}if(!MENU_GP._modalIdx)MENU_GP._modalIdx=0;if(up)MENU_GP._modalIdx=Math.max(0,MENU_GP._modalIdx-1);if(down)MENU_GP._modalIdx=Math.min(f.length-1,MENU_GP._modalIdx+1);f.forEach((b,i)=>b.classList.toggle('gp-focused',i===MENU_GP._modalIdx));if(pressA){sfxMenuClick();f[MENU_GP._modalIdx]?.click();}if(pressB){closeAllModals();MENU_GP._menuActive=false;}}
function sfxMenuClick(){try{const ac=new(window.AudioContext||window.webkitAudioContext)();const o=ac.createOscillator(),g=ac.createGain();o.connect(g);g.connect(ac.destination);o.type='square';o.frequency.value=520;g.gain.setValueAtTime(0.14,ac.currentTime);g.gain.exponentialRampToValueAtTime(0.001,ac.currentTime+0.1);o.start();o.stop(ac.currentTime+0.12);}catch(e){}}

// ── BOOT ──
window.addEventListener('DOMContentLoaded',()=>{
  loadGame();
  const pi=document.getElementById('promo-input');if(pi)pi.addEventListener('keydown',e=>{if(e.key==='Enter')redeemCode();});
  document.addEventListener('keydown',e=>{const bo=document.getElementById('book-open');if(!bo||bo.classList.contains('hidden'))return;if(e.key==='ArrowRight')nextPage();if(e.key==='ArrowLeft')prevPage();});
  document.addEventListener('keydown',e=>{if(e.ctrlKey&&e.shiftKey&&e.key==='R'){e.preventDefault();if(confirm('[DEV] Resetar TODO o progresso?')){resetAllProgress();location.reload();}}});
  if(!STATE.introSeen)startIntro();else{document.getElementById('intro-screen').classList.add('hidden');showMenu();}
  startMenuGpPoll();
});

// ── INGREDIENTS ──
const INGREDIENTS=[
  {id:'bun_bottom',name:'Pão (Base)',   emoji:'🍞',phase:1},
  {id:'cheese',    name:'Queijo',       emoji:'🧀',phase:2},
  {id:'pickle',    name:'Picles',       emoji:'🥒',phase:3},
  {id:'lettuce_i', name:'Alface',       emoji:'🥬',phase:4},
  {id:'sauce',     name:'Molho',        emoji:'🫙',phase:5},
  {id:'beef',      name:'Carne',        emoji:'🥩',phase:6},
  {id:'bun_mid',   name:'Pão (Meio)',   emoji:'🍞',phase:7},
];
function renderIngredientTracker(){const el=document.getElementById('ingredient-tracker');if(!el)return;const collected=STATE.ingredients||[];el.innerHTML='';INGREDIENTS.forEach(ing=>{const got=collected.includes(ing.id);const slot=document.createElement('div');slot.className='ing-slot'+(got?' ing-got':'');slot.title=ing.name+(got?' ✔ Coletado':' — Fase '+ing.phase);slot.innerHTML=`<span class="ing-emoji">${got?ing.emoji:'?'}</span>`;if(got){const ck=document.createElement('span');ck.className='ing-check';ck.textContent='✔';slot.appendChild(ck);}el.appendChild(slot);});}
function checkCompletionMessage(){
  const params=new URLSearchParams(window.location.search);
  const completed=params.get('completed');
  if(completed==='fase1'){const c=(STATE.ingredients||[]).length;setTimeout(()=>{showCompletionToast(`🍞 Pão (Base) coletado! +50🍗\n${c}/7 ingredientes do Big Mac`);window.history.replaceState({},'',window.location.pathname);},600);}
  if(completed==='fase2'){const c=(STATE.ingredients||[]).length;setTimeout(()=>{showCompletionToast(`🧀 Queijo coletado! +60🍗\n${c}/7 ingredientes do Big Mac`);window.history.replaceState({},'',window.location.pathname);},600);}
}
function showCompletionToast(msg){const el=document.getElementById('completion-toast');if(!el)return;el.textContent=msg;el.classList.remove('hidden','toast-hide');el.classList.add('toast-show');setTimeout(()=>{el.classList.add('toast-hide');setTimeout(()=>el.classList.add('hidden'),600);},4500);}

// ── SFX ──
let audioCtx=null;
function getAudioCtx(){if(!audioCtx){try{audioCtx=new(window.AudioContext||window.webkitAudioContext)();}catch(e){}}return audioCtx;}
function playMenuClick(){if(STATE.settings.mute)return;const ctx=getAudioCtx();if(!ctx)return;const vol=(STATE.settings.sfxVol??80)/100;const osc=ctx.createOscillator(),gain=ctx.createGain();osc.connect(gain);gain.connect(ctx.destination);osc.type='square';osc.frequency.setValueAtTime(520,ctx.currentTime);osc.frequency.exponentialRampToValueAtTime(260,ctx.currentTime+0.08);gain.gain.setValueAtTime(vol*0.18,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.1);osc.start(ctx.currentTime);osc.stop(ctx.currentTime+0.12);}
function playMenuHover(){if(STATE.settings.mute)return;const ctx=getAudioCtx();if(!ctx)return;const vol=(STATE.settings.sfxVol??80)/100;const osc=ctx.createOscillator(),gain=ctx.createGain();osc.connect(gain);gain.connect(ctx.destination);osc.type='square';osc.frequency.setValueAtTime(380,ctx.currentTime);gain.gain.setValueAtTime(vol*0.08,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.06);osc.start(ctx.currentTime);osc.stop(ctx.currentTime+0.07);}
function hookButtonSounds(){document.querySelectorAll('.menu-btn,.menu-btn-corner,.modal-close,.tab-btn,.promo-btn').forEach(btn=>{if(btn.dataset.soundHooked)return;btn.dataset.soundHooked='1';btn.addEventListener('mouseenter',()=>playMenuHover());btn.addEventListener('click',()=>playMenuClick());});}
document.addEventListener('click',()=>setTimeout(hookButtonSounds,50),{once:false,passive:true});
window.addEventListener('load',hookButtonSounds);