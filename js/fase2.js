/* ══════════════════════════════════════════════════════════════
   MICHAEL: EM BUSCA DO BIG MAC PERDIDO — fase2.js
   FASE 2: A FÁBRICA DO QUEIJO
   ══════════════════════════════════════════════════════════════ */
'use strict';

// ═══ CANVAS ═══
const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');
const CW = 900, CH = 500, GROUND = 400;
const GRAVITY = 0.52, JUMP_V = -10.8, SPD = 4.8;
const MAP_W = 9200;
const SAFE = {x1:3800, x2:5200};

// ═══ SAVE ═══
const SAVE_KEY = 'michael_bigmac_save_v1';
function loadSave()     { try{return JSON.parse(localStorage.getItem(SAVE_KEY)||'{}');}catch(e){return{};} }
function writeSave(p)   { try{const d=loadSave();Object.assign(d,p);localStorage.setItem(SAVE_KEY,JSON.stringify(d));}catch(e){} }
function readNuggets()  { return parseInt(loadSave().nuggets||0,10); }
function readSettings() { return loadSave().settings||{}; }
function readPlatform() { return (loadSave().settings||{}).platform||'pc'; }
function devSave(p)     { if(!DEV_NOSAVE) writeSave(p); }

let DEV_GODMODE=false, DEV_NOSAVE=false;
let gState='PLAYING', sessionNuggets=0;

// ═══ GAMEPAD ═══
const GP={connected:false,type:'xbox',showIcons:true,DZ:0.25,leftX:0,leftY:0,leftY_prev:0,btnA:false,btnA_prev:false,btnB:false,btnB_prev:false,btnX:false,btnX_prev:false,btnY:false,btnY_prev:false,btnStart:false,btnStart_prev:false,dUp:false,dUp_prev:false,dDown:false,dDown_prev:false,dLeft:false,dLeft_prev:false,dRight:false,dRight_prev:false,lastNavTime:0};

function pollGamepad(){
  const gamepads=navigator.getGamepads?navigator.getGamepads():[];let gp=null;
  for(const g of gamepads){if(g&&g.connected){gp=g;break;}}
  if(!gp){if(GP.connected){GP.connected=false;updateGamepadIcons();}return;}
  if(!GP.connected){GP.connected=true;GP.type=/playstation|dualshock|dualsense/i.test(gp.id)?'ps':'xbox';updateGamepadIcons();}
  GP.leftX=Math.abs(gp.axes[0])>GP.DZ?gp.axes[0]:0;
  GP.leftY_prev=GP.leftY;GP.leftY=Math.abs(gp.axes[1])>GP.DZ?gp.axes[1]:0;
  GP.btnA_prev=GP.btnA;GP.btnA=!!(gp.buttons[0]?.pressed);
  GP.btnB_prev=GP.btnB;GP.btnB=!!(gp.buttons[1]?.pressed);
  GP.btnX_prev=GP.btnX;GP.btnX=!!(gp.buttons[2]?.pressed);
  GP.btnY_prev=GP.btnY;GP.btnY=!!(gp.buttons[3]?.pressed);
  GP.btnStart_prev=GP.btnStart;GP.btnStart=!!(gp.buttons[9]?.pressed||gp.buttons[8]?.pressed);
  GP.dUp_prev=GP.dUp;GP.dUp=!!(gp.buttons[12]?.pressed);
  GP.dDown_prev=GP.dDown;GP.dDown=!!(gp.buttons[13]?.pressed);
  GP.dLeft_prev=GP.dLeft;GP.dLeft=!!(gp.buttons[14]?.pressed);
  GP.dRight_prev=GP.dRight;GP.dRight=!!(gp.buttons[15]?.pressed);
}

function applyGamepadInput(){
  if(!GP.connected)return;
  const btnA_edge=GP.btnA&&!GP.btnA_prev,btnB_edge=GP.btnB&&!GP.btnB_prev,btnX_edge=GP.btnX&&!GP.btnX_prev,btnY_edge=GP.btnY&&!GP.btnY_prev,start_edge=GP.btnStart&&!GP.btnStart_prev;
  const now=Date.now();
  const axisUp=GP.leftY<-0.4&&GP.leftY_prev>=-0.4,axisDown=GP.leftY>0.4&&GP.leftY_prev<=0.4;
  const navUp=(GP.dUp&&!GP.dUp_prev)||(axisUp&&now-GP.lastNavTime>200),navDown=(GP.dDown&&!GP.dDown_prev)||(axisDown&&now-GP.lastNavTime>200),navLeft=GP.dLeft&&!GP.dLeft_prev,navRight=GP.dRight&&!GP.dRight_prev;
  if(navUp||navDown)GP.lastNavTime=now;
  if(gState==='CUTSCENE'){if(btnA_edge||navRight)cutsceneNext();if(navLeft)cutscenePrev();return;}
  if(gState==='INVENTORY'){if(btnY_edge||btnB_edge)toggleInventoryPanel();if(btnA_edge)invPanelUse();return;}
  if(gState==='SHOP'){shopGpNavHandle(navUp,navDown,btnA_edge,btnB_edge);return;}
  if(gState==='INGAME_MENU'){igmGpNavHandle(navUp,navDown,navLeft,navRight,btnA_edge,btnB_edge);return;}
  if(gState==='CONFIRM_RESTART'){if(btnA_edge)restartPhase();if(btnB_edge)closeConfirmRestart();return;}
  if(gState==='GAMEOVER'){if(btnA_edge)restartPhase();if(btnB_edge)goToMenu();return;}
  if(gState!=='PLAYING')return;
  const moveLeft=GP.leftX<-GP.DZ||GP.dLeft,moveRight=GP.leftX>GP.DZ||GP.dRight;
  if(moveLeft){keys.left=true;keys.right=false;P.facing=-1;}
  else if(moveRight){keys.right=true;keys.left=false;P.facing=1;}
  else{keys.left=false;keys.right=false;}
  if(btnA_edge&&P.onGround)keys.jump=true;
  if(btnX_edge)keys.interact=true;
  if(btnY_edge)toggleInventoryPanel();
  if(start_edge)openIngameMenu();
}

function updateGamepadIcons(){
  const el=document.getElementById('gamepad-hints');if(!el)return;
  if(!GP.connected||!GP.showIcons){el.classList.add('hidden');return;}
  el.classList.remove('hidden');
  const isPS=GP.type==='ps';
  document.getElementById('gph-title')&&(document.getElementById('gph-title').textContent=isPS?'DUALSHOCK':'XBOX');
  const bj=document.getElementById('gph-btn-jump');if(bj){bj.textContent=isPS?'×':'A';bj.className='gph-btn gph-a';}
  const bi=document.getElementById('gph-btn-interact');if(bi){bi.textContent=isPS?'□':'X';bi.className=isPS?'gph-btn gph-x-ps':'gph-btn gph-x-xbox';}
  const bb=document.getElementById('gph-btn-bag');if(bb){bb.textContent=isPS?'△':'Y';bb.className=isPS?'gph-btn gph-y-ps':'gph-btn gph-y-xbox';}
  const bm=document.getElementById('gph-btn-menu');if(bm){bm.textContent='≡';bm.className='gph-btn gph-start';}
  const csHint=document.getElementById('cutscene-gp-hint');if(csHint){csHint.textContent=isPS?'× avançar  ← voltar':'A avançar  ← voltar';csHint.classList.remove('hidden');}
}

// ═══ PLAYER ═══
const P={x:80,y:GROUND-62,w:40,h:62,vx:0,vy:0,onGround:false,lives:3,maxLives:3,invul:false,invulTimer:0,INVUL_DUR:1800,potion:null,POTION_DUR:30000,item:null,facing:1,state:'idle',animFrame:0,animTimer:0,ANIM_SPD:110,sprites:{}};
['idle','run0','run1','run2','run3','jump','hurt'].forEach(n=>{const img=new Image();img.onload=()=>P.sprites[n]=img;img.onerror=()=>P.sprites[n]=null;img.src=`assets/sprites/Michael/${n}.png`;});

// ═══ PARTICLES ═══
const particles=[];
function spawnDeathParticles(ex,ey,type){
  const cols={pickle:['#44BB22','#66DD33','#22AA00','#88EE44'],cheese:['#FFDD00','#FFAA00','#FFE066','#CC8800'],sausage:['#CC4400','#FF6600','#AA2200','#FF8844']};
  const c=cols[type]||cols.cheese;
  for(let i=0;i<20;i++){const a=(i/20)*Math.PI*2+Math.random()*.4,s=2.5+Math.random()*5;particles.push({x:ex,y:ey,vx:Math.cos(a)*s*(0.6+Math.random()*.8),vy:Math.sin(a)*s-2-Math.random()*3,col:c[Math.floor(Math.random()*c.length)],size:3+Math.random()*5,life:1,decay:.025+Math.random()*.03,gravity:.18,type:Math.random()<.4?'star':'square',rot:Math.random()*Math.PI*2,rotSpd:(Math.random()-.5)*.2});}
  particles.push({x:ex,y:ey-20,vx:0,vy:-1.2,text:'+2🍗',life:1,decay:.018,isText:true,col:'#FFD700'});
}
function updateParticles(){for(let i=particles.length-1;i>=0;i--){const p=particles[i];if(p.isText){p.y+=p.vy;p.life-=p.decay;}else{p.x+=p.vx;p.y+=p.vy;p.vy+=p.gravity||0;p.vx*=.97;p.life-=p.decay;if(p.rot!==undefined)p.rot+=p.rotSpd;}if(p.life<=0)particles.splice(i,1);}}
function drawParticles(camX){particles.forEach(p=>{ctx.save();ctx.globalAlpha=Math.max(0,p.life);if(p.isText){ctx.font=`bold ${Math.round(10+6*p.life)}px "Press Start 2P",monospace`;ctx.fillStyle=p.col;ctx.textAlign='center';ctx.fillText(p.text,p.x-camX,p.y);}else{const sx=p.x-camX,sy=p.y;if(p.type==='star'){ctx.translate(sx,sy);ctx.rotate(p.rot);ctx.fillStyle=p.col;drawStar5(ctx,p.size);}else if(p.type==='circle'){ctx.fillStyle=p.col;ctx.beginPath();ctx.arc(sx,sy,p.size/2,0,Math.PI*2);ctx.fill();}else{ctx.translate(sx,sy);ctx.rotate(p.rot||0);ctx.fillStyle=p.col;ctx.fillRect(-p.size/2,-p.size/2,p.size,p.size);}}ctx.restore();});}
function drawStar5(ctx,r){ctx.beginPath();for(let i=0;i<5;i++){const ao=(i*2*Math.PI/5)-Math.PI/2,ai=ao+Math.PI/5;ctx.lineTo(Math.cos(ao)*r,Math.sin(ao)*r);ctx.lineTo(Math.cos(ai)*r*.45,Math.sin(ai)*r*.45);}ctx.closePath();ctx.fill();}

// ═══ WIND WAVES ═══
const windWaves=[];let nextWindTime=3000+Math.random()*5000;
function updateWind(dt){nextWindTime-=dt;if(nextWindTime<=0){const n=2+Math.floor(Math.random()*3);for(let i=0;i<n;i++)windWaves.push({x:-200-i*90,y:60+Math.random()*(GROUND-120),len:40+Math.random()*100,speed:3+Math.random()*4,alpha:.12+Math.random()*.18,h:Math.max(1,Math.round(1+Math.random()*2)),segments:Math.floor(2+Math.random()*3)});nextWindTime=3000+Math.random()*6000;}for(let i=windWaves.length-1;i>=0;i--){windWaves[i].x+=windWaves[i].speed;if(windWaves[i].x>MAP_W+300)windWaves.splice(i,1);}}
function drawWindWaves(camX){windWaves.forEach(w=>{const sx=w.x-camX;if(sx>CW+50||sx+w.len<-50)return;ctx.save();ctx.globalAlpha=w.alpha;ctx.fillStyle='rgba(255,255,220,0.9)';const ps=Math.max(1,w.h),segLen=Math.round(w.len/w.segments),gap=Math.round(segLen*.4);for(let s=0;s<w.segments;s++){const dx=sx+s*(segLen+gap);ctx.fillRect(Math.round(dx),Math.round(w.y),segLen-gap,ps);}ctx.restore();});}

// ═══ BACKGROUND — Cheese Factory / Cave ═══
const BG_LAYERS2=[];
function initBG2(){
  // Stone/factory wall bg layers
  const cfgs=[
    {spd:.05,n:60, col:'#1A0E00',type:'arch'},
    {spd:.12,n:80, col:'#221208',type:'pipe'},
    {spd:.22,n:100,col:'#2A1800',type:'wall'},
    {spd:.40,n:60, col:'#160C00',type:'column'},
  ];
  const span=MAP_W*1.3;
  cfgs.forEach(c=>{BG_LAYERS2.push({...c,items:Array.from({length:c.n},()=>({x:Math.random()*span,h:60+Math.random()*120,w:20+Math.random()*60}))});});
}
function drawBG2(camX){
  const t=Date.now();
  // Dark cave/factory gradient
  const sky=ctx.createLinearGradient(0,0,0,GROUND);
  sky.addColorStop(0,'#0C0600');sky.addColorStop(.3,'#1A0E04');sky.addColorStop(.7,'#241408');sky.addColorStop(1,'#2E1A0A');
  ctx.fillStyle=sky;ctx.fillRect(0,0,CW,GROUND);

  // Distant lava/cheese glow at horizon
  const glow=ctx.createLinearGradient(0,GROUND-80,0,GROUND);
  glow.addColorStop(0,'rgba(255,160,0,0)');glow.addColorStop(1,'rgba(255,180,0,.12)');
  ctx.fillStyle=glow;ctx.fillRect(0,GROUND-80,CW,80);

  // Background factory elements
  BG_LAYERS2.forEach(layer=>{
    const span=MAP_W*1.3,offset=(camX*layer.spd)%span;
    layer.items.forEach(item=>{
      let tx=item.x-offset;while(tx<-item.w-20)tx+=span;if(tx>CW+item.w)return;
      if(layer.type==='arch')    drawFactoryArch(tx,item.w,item.h,layer.col);
      else if(layer.type==='pipe')drawFactoryPipe(tx,item.w,item.h);
      else if(layer.type==='wall')drawFactoryWall(tx,item.w,item.h,layer.col);
      else if(layer.type==='column')drawFactoryColumn(tx,item.h);
    });
  });

  // Cheese drips from ceiling (decorative)
  for(let i=0;i<8;i++){
    const drx=(i*1200-camX*.08+MAP_W*.15)%MAP_W;
    const dsx=drx%CW;if(dsx<-20||dsx>CW+20)continue;
    const dLen=25+Math.sin(t*.001+i)*8;
    drawCheeseDrip(dsx,0,dLen);
  }

  // Floating cheese mist particles
  ctx.save();ctx.globalAlpha=.06;
  for(let i=0;i<6;i++){const px=(i*170+t*.008*(i%2===0?1:-1))%CW,py=80+Math.sin(t*.001+i*.8)*40;ctx.fillStyle='#FFDD44';ctx.beginPath();ctx.arc(px,py,18+i*4,0,Math.PI*2);ctx.fill();}
  ctx.restore();
}

function drawFactoryArch(x,w,h,col){
  ctx.fillStyle=col;ctx.fillRect(x,GROUND-h,w,h);
  ctx.fillStyle=lighten2(col,8);ctx.fillRect(x,GROUND-h,w,4);
  ctx.fillStyle=darken2(col,8);ctx.fillRect(x,GROUND-h,3,h);
  // Arch opening
  if(w>30){ctx.fillStyle='rgba(0,0,0,.6)';const aw=w*.6,ax=x+(w-aw)/2;ctx.beginPath();ctx.moveTo(ax,GROUND-h*.3);ctx.lineTo(ax,GROUND-h*.6);ctx.bezierCurveTo(ax,GROUND-h*.9,ax+aw,GROUND-h*.9,ax+aw,GROUND-h*.6);ctx.lineTo(ax+aw,GROUND-h*.3);ctx.closePath();ctx.fill();}
}
function drawFactoryPipe(x,w,h){
  const cy=GROUND-h/2;
  ctx.fillStyle='#3A3028';ctx.fillRect(x,cy-w/4,h,w/2);
  ctx.fillStyle='#4A4035';ctx.fillRect(x,cy-w/4,h,w*.15);
  ctx.fillStyle='#5A5042';ctx.fillRect(x,cy-w/4,w*.25,w/2);
  // Bolt
  ctx.fillStyle='#666050';ctx.fillRect(x+h/4,cy-w/4-2,6,6);ctx.fillRect(x+h*.75,cy-w/4-2,6,6);
  // Steam puff
  ctx.save();ctx.globalAlpha=.15+.1*Math.sin(Date.now()*.002+x*.01);ctx.fillStyle='#DDCC88';ctx.beginPath();ctx.arc(x+h*.5,cy-w/3-8,6,0,Math.PI*2);ctx.fill();ctx.restore();
}
function drawFactoryWall(x,w,h,col){
  const brickH=12,brickW=24;
  for(let row=0;row<h/brickH;row++){const offset=(row%2)*brickW/2;for(let col=0;col<w/brickW+1;col++){const bx=x+col*brickW-offset,by=GROUND-h+row*brickH;const shade=((row+col)%2===0)?0:6;ctx.fillStyle=shade?lighten2(col2,shade):col2;ctx.fillRect(bx,by,brickW-1,brickH-1);}}}
const col2='#2A1800';
function drawFactoryColumn(x,h){ctx.fillStyle='#3A2A18';ctx.fillRect(x-8,GROUND-h,16,h);ctx.fillStyle='#4A3A28';ctx.fillRect(x-6,GROUND-h,4,h);ctx.fillStyle='#2A1A08';ctx.fillRect(x+2,GROUND-h,4,h);ctx.fillStyle='#5A4A38';ctx.fillRect(x-10,GROUND-h,20,8);ctx.fillRect(x-10,GROUND-h+h/2-4,20,8);}
function drawCheeseDrip(x,startY,len){ctx.fillStyle='#FFCC00';ctx.fillRect(x-2,startY,4,len*.6);ctx.fillRect(x-3,startY+len*.6,6,len*.2);ctx.fillStyle='#FFDD44';ctx.beginPath();ctx.ellipse(x,startY+len,4,5,0,0,Math.PI*2);ctx.fill();}
function lighten2(hex,amt){try{let r=parseInt(hex.slice(1,3),16)+amt,g=parseInt(hex.slice(3,5),16)+amt,b=parseInt(hex.slice(5,7),16)+amt;return`rgb(${cl(r)},${cl(g)},${cl(b)})`;}catch{return hex;}}
function darken2(hex,amt){try{let r=parseInt(hex.slice(1,3),16)-amt,g=parseInt(hex.slice(3,5),16)-amt,b=parseInt(hex.slice(5,7),16)-amt;return`rgb(${cl(r)},${cl(g)},${cl(b)})`;}catch{return hex;}}
function cl(v){return Math.max(0,Math.min(255,v));}

// ═══ AMBIENTS ═══
const ambients2=[];
function initAmbients2(){for(let i=0;i<30;i++)ambients2.push({x:Math.random()*MAP_W,y:40+Math.random()*(GROUND-100),vx:(Math.random()-.5)*.4,phase:Math.random()*Math.PI*2,size:1.5+Math.random()*2.5,col:Math.random()<.6?'#FFEE44':'#FF9900'});}
function drawAmbients2(camX){const t=Date.now();ambients2.forEach(a=>{const sx=((a.x-camX*.7)%(MAP_W*1.5)+MAP_W*1.5)%(MAP_W*1.5);if(sx<-20||sx>CW+20)return;const g=.2+.6*Math.abs(Math.sin(t*.0025+a.phase));ctx.save();ctx.globalAlpha=g;ctx.fillStyle=a.col;ctx.beginPath();ctx.arc(sx,a.y+Math.sin(t*.0012+a.phase)*6,a.size*.7,0,Math.PI*2);ctx.fill();ctx.globalAlpha=g*.25;ctx.beginPath();ctx.arc(sx,a.y+Math.sin(t*.0012+a.phase)*6,a.size*2.2,0,Math.PI*2);ctx.fill();ctx.restore();a.x+=a.vx*.4;if(a.x<0)a.x=MAP_W;if(a.x>MAP_W)a.x=0;});}

// ═══ GROUND LAYOUT ═══
const HOLES2=[
  {x:480,  w:80},
  {x:950,  w:90},
  {x:1550, w:100},
  {x:2300, w:85},
  {x:2900, w:95},
  {x:5500, w:110},
  {x:6200, w:90},
  {x:7000, w:120},
  {x:7800, w:100},
  {x:8500, w:90},
];

// ── IRON PLATFORMS (static, gray, metallic) ──
const IRON_PLATFORMS=[
  // Section 1: climbing intro
  {x:320,  y:GROUND-80,  w:120,h:18},
  {x:580,  y:GROUND-145, w:110,h:18},
  {x:760,  y:GROUND-210, w:105,h:18},
  {x:1000, y:GROUND-145, w:115,h:18},
  {x:1200, y:GROUND-80,  w:120,h:18},
  // Section 2: mid heights
  {x:1420, y:GROUND-130, w:100,h:18},
  {x:1630, y:GROUND-195, w:100,h:18},
  {x:1870, y:GROUND-255, w:95, h:18},
  {x:2100, y:GROUND-195, w:100,h:18},
  {x:2350, y:GROUND-130, w:110,h:18},
  // Section 3: after safe zone — factory depths
  {x:5350, y:GROUND-90,  w:120,h:18},
  {x:5580, y:GROUND-160, w:105,h:18},
  {x:5820, y:GROUND-230, w:100,h:18},
  {x:6100, y:GROUND-160, w:110,h:18},
  {x:6340, y:GROUND-90,  w:120,h:18},
  {x:6600, y:GROUND-150, w:100,h:18},
  {x:6850, y:GROUND-220, w:100,h:18},
  {x:7150, y:GROUND-150, w:115,h:18},
  {x:7400, y:GROUND-90,  w:120,h:18},
  // Final climb to cheese
  {x:7700, y:GROUND-120, w:110,h:18},
  {x:7950, y:GROUND-195, w:100,h:18},
  {x:8200, y:GROUND-265, w:95, h:18},
  {x:8500, y:GROUND-195, w:105,h:18},
  {x:8750, y:GROUND-130, w:120,h:18},
];

// ── CLOUD PLATFORMS (disappearing — white/light blue) ──
// These appear after x~4600 as a secret bonus route to a chest
// Also scattered in section 3 as shortcuts
const CLOUD_PLATFORM_DEFS=[
  // Bonus route to chest (x 4600-5100)
  {x:4600, y:GROUND-110, w:90},
  {x:4750, y:GROUND-170, w:80},
  {x:4900, y:GROUND-230, w:80},
  {x:5020, y:GROUND-290, w:90},  // leads to chest
  // Scattered shortcuts
  {x:6050, y:GROUND-125, w:85},
  {x:6480, y:GROUND-200, w:80},
  {x:7050, y:GROUND-125, w:85},
  {x:7650, y:GROUND-165, w:80},
];

let cloudPlats=[];
function initCloudPlats(){
  cloudPlats=CLOUD_PLATFORM_DEFS.map((d,i)=>({
    ...d,h:14,id:i,
    state:'solid',   // 'solid' | 'shaking' | 'fading' | 'gone' | 'respawning'
    timer:0,
    SHAKE_DUR:800,   // ms before fading after stepped on
    FADE_DUR:600,
    GONE_DUR:4000,   // respawn time
    alpha:1,
  }));
}

function updateCloudPlats(dt){
  cloudPlats.forEach(cp=>{
    if(cp.state==='shaking'){
      cp.timer+=dt;
      if(cp.timer>=cp.SHAKE_DUR){cp.state='fading';cp.timer=0;}
    }else if(cp.state==='fading'){
      cp.timer+=dt;cp.alpha=1-(cp.timer/cp.FADE_DUR);
      if(cp.timer>=cp.FADE_DUR){cp.state='gone';cp.timer=0;cp.alpha=0;}
    }else if(cp.state==='gone'){
      cp.timer+=dt;
      if(cp.timer>=cp.GONE_DUR){cp.state='respawning';cp.timer=0;cp.alpha=0;}
    }else if(cp.state==='respawning'){
      cp.timer+=dt;cp.alpha=cp.timer/cp.FADE_DUR;
      if(cp.timer>=cp.FADE_DUR){cp.state='solid';cp.alpha=1;}
    }
  });
}

function drawCloudPlats(camX){
  const t=Date.now();
  cloudPlats.forEach(cp=>{
    if(cp.state==='gone')return;
    const sx=cp.x-camX;if(sx>CW+20||sx+cp.w<-20)return;
    ctx.save();ctx.globalAlpha=cp.alpha;
    const shakeX=cp.state==='shaking'?Math.sin(t*.04)*3:0;
    const bx=sx+shakeX,by=cp.y;

    // Shadow under cloud
    ctx.globalAlpha=cp.alpha*.25;ctx.fillStyle='rgba(0,0,0,.3)';
    ctx.beginPath();ctx.ellipse(bx+cp.w/2,by+cp.h+4,cp.w*.45,5,0,0,Math.PI*2);ctx.fill();
    ctx.globalAlpha=cp.alpha;

    // Cloud body — pixel art style (white/light blue)
    const ps=4; // pixel size
    const pw=Math.round(cp.w/ps),ph=3;
    const colors=['#E8F4FF','#DDEEFF','#C8E8FF'];
    // Top fluffy row
    for(let i=1;i<pw-1;i++){ctx.fillStyle=colors[0];ctx.fillRect(bx+i*ps,by-ps,ps,ps);}
    // Middle bulk
    for(let row=0;row<ph;row++){
      for(let i=0;i<pw;i++){
        const shade=(i+row)%3;ctx.fillStyle=colors[shade];
        ctx.fillRect(bx+i*ps,by+row*ps,ps,ps);
      }
    }
    // Bottom shadow
    ctx.fillStyle='rgba(100,150,220,.3)';ctx.fillRect(bx,by+ph*ps,cp.w,ps);

    // Sparkle effect for solid platforms
    if(cp.state==='solid'||cp.state==='respawning'){
      const sk=Math.sin(t*.008+cp.id)*2;
      ctx.fillStyle='rgba(255,255,255,.7)';
      ctx.fillRect(bx+cp.w*.2+sk,by-3,2,2);
      ctx.fillRect(bx+cp.w*.7-sk,by-2,2,2);
    }
    // Warning cracks when shaking
    if(cp.state==='shaking'){
      ctx.strokeStyle='rgba(200,100,50,.6)';ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(bx+cp.w*.3,by);ctx.lineTo(bx+cp.w*.4,by+cp.h);ctx.stroke();
      ctx.beginPath();ctx.moveTo(bx+cp.w*.65,by);ctx.lineTo(bx+cp.w*.55,by+cp.h);ctx.stroke();
    }
    ctx.restore();
  });
}

// ═══ CHEST (treasure chest with 100 nuggets) ═══
const CHEST={x:5040,y:GROUND-50,w:50,h:50,opened:false,interactR:70};
function drawChest(camX){
  if(CHEST.opened)return;
  const sx=CHEST.x-camX,sy=CHEST.y;
  if(sx>CW+60||sx+CHEST.w<-60)return;
  const t=Date.now();

  // Glow when near
  const dist=Math.abs((P.x+P.w/2)-(CHEST.x+CHEST.w/2));
  if(dist<CHEST.interactR){
    ctx.save();ctx.globalAlpha=.15+.1*Math.sin(t*.006);
    const rg=ctx.createRadialGradient(sx+25,sy+25,5,sx+25,sy+25,55);
    rg.addColorStop(0,'#FFD700');rg.addColorStop(1,'rgba(255,215,0,0)');
    ctx.fillStyle=rg;ctx.fillRect(sx-30,sy-30,110,110);ctx.restore();
  }

  // Chest body
  ctx.fillStyle='#5C2E00';ctx.fillRect(sx,sy+18,CHEST.w,CHEST.h-18);
  // Wood planks
  ctx.fillStyle='#4A2000';for(let i=0;i<3;i++)ctx.fillRect(sx,sy+18+i*11,CHEST.w,2);
  // Iron bands
  ctx.fillStyle='#888';ctx.fillRect(sx+5,sy+18,4,CHEST.h-18);ctx.fillRect(sx+CHEST.w-9,sy+18,4,CHEST.h-18);
  ctx.fillRect(sx,sy+26,CHEST.w,3);
  // Lock
  ctx.fillStyle='#BB9900';ctx.fillRect(sx+18,sy+28,14,10);
  ctx.fillStyle='#997700';ctx.fillRect(sx+21,sy+36,8,4);
  ctx.fillStyle='#000';ctx.beginPath();ctx.arc(sx+25,sy+33,3,0,Math.PI*2);ctx.fill();
  // Lid
  ctx.fillStyle='#7A3E00';ctx.fillRect(sx,sy,CHEST.w,20);
  ctx.fillStyle='#8B4C00';ctx.fillRect(sx,sy,CHEST.w,6);
  ctx.fillStyle='#664400';ctx.fillRect(sx,sy+16,CHEST.w,4);
  // Gold trim
  ctx.fillStyle='#FFCC00';ctx.fillRect(sx-1,sy+14,CHEST.w+2,4);ctx.fillRect(sx-1,sy,4,20);ctx.fillRect(sx+CHEST.w-3,sy,4,20);
  // Bounce animation
  const bob=Math.sin(t*.004)*2;
  ctx.fillStyle='#FFD700';
  ['✦','+','✦'].forEach((star,i)=>{ctx.font='10px sans-serif';ctx.textAlign='center';ctx.fillText(star,sx+12+i*13,sy-8+bob+Math.sin(t*.005+i)*3);});
}

// ═══ GROUND DRAWING ═══
function buildGroundSegs(){let s=[{x:0,ex:MAP_W}];HOLES2.forEach(h=>{s=s.flatMap(seg=>{if(h.x>=seg.ex||h.x+h.w<=seg.x)return[seg];const o=[];if(h.x>seg.x)o.push({x:seg.x,ex:h.x});if(h.x+h.w<seg.ex)o.push({x:h.x+h.w,ex:seg.ex});return o;});});return s;}
const GROUND_SEGS2=buildGroundSegs();

function drawGround2(camX){
  const vis0=camX,vis1=camX+CW;
  GROUND_SEGS2.forEach(seg=>{
    if(seg.ex<vis0||seg.x>vis1)return;
    const sx=Math.max(seg.x,vis0)-camX,ex=Math.min(seg.ex,vis1)-camX,gw=ex-sx;
    if(gw<=0)return;
    // Factory floor — dark stone with grating
    const sg=ctx.createLinearGradient(0,GROUND,0,CH);
    sg.addColorStop(0,'#3A3020');sg.addColorStop(.04,'#5A4828');sg.addColorStop(.12,'#3A3020');sg.addColorStop(.35,'#2A2010');sg.addColorStop(1,'#100C06');
    ctx.fillStyle=sg;ctx.fillRect(sx,GROUND,gw,CH-GROUND);
    // Metal grating on top
    ctx.fillStyle='#4A4030';ctx.fillRect(sx,GROUND,gw,6);
    ctx.fillStyle='#5A5038';ctx.fillRect(sx,GROUND,gw,2);
    // Grating holes
    ctx.fillStyle='rgba(0,0,0,.35)';for(let i=0;i<gw;i+=8)ctx.fillRect(sx+i,GROUND+2,4,3);
    // Cheese ooze at base
    if(Math.random()<.001){
      ctx.fillStyle='rgba(255,220,0,.15)';
      ctx.fillRect(sx+Math.random()*gw,GROUND+6,8,2);
    }
    // Bolt details
    ctx.fillStyle='#888';for(let i=Math.floor(sx/32);i<(sx+gw)/32+1;i++)ctx.fillRect(sx+(i*32-sx%32),GROUND+1,3,3);
  });

  // Iron platforms
  IRON_PLATFORMS.forEach(pl=>{
    const sx=pl.x-camX;if(sx>CW||sx+pl.w<0)return;
    drawIronPlatform(sx,pl.y,pl.w,pl.h);
  });

  // Holes
  HOLES2.forEach(h=>{
    const sx=h.x-camX;if(sx>CW||sx+h.w<0)return;
    const hg=ctx.createLinearGradient(0,GROUND,0,CH);
    hg.addColorStop(0,'#0A0600');hg.addColorStop(.2,'#050300');hg.addColorStop(1,'#000');
    ctx.fillStyle=hg;ctx.fillRect(sx,GROUND,h.w,CH-GROUND);
    // Lava glow at bottom of holes
    const lg=ctx.createRadialGradient(sx+h.w/2,CH,2,sx+h.w/2,CH,h.w*.6);
    lg.addColorStop(0,'rgba(255,80,0,.35)');lg.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=lg;ctx.fillRect(sx,GROUND,h.w,CH-GROUND);
    // Jagged edges
    ctx.fillStyle='#3A2A18';
    for(let y=GROUND;y<GROUND+60;y+=8){ctx.fillRect(sx-(2+Math.abs(Math.sin(y*.25))*4),y,4,8);ctx.fillRect(sx+h.w+(1+Math.abs(Math.sin(y*.3+1))*4),y,4,8);}
    // Shadow cast inward
    const shadowL=ctx.createLinearGradient(sx,0,sx+22,0);shadowL.addColorStop(0,'rgba(0,0,0,.75)');shadowL.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=shadowL;ctx.fillRect(sx,GROUND,22,CH-GROUND);
    const shadowR=ctx.createLinearGradient(sx+h.w,0,sx+h.w-22,0);shadowR.addColorStop(0,'rgba(0,0,0,.75)');shadowR.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=shadowR;ctx.fillRect(sx+h.w-22,GROUND,22,CH-GROUND);
  });
}

function drawIronPlatform(sx,y,w,h){
  // Shadow
  ctx.fillStyle='rgba(0,0,0,.35)';ctx.fillRect(sx+5,y+5,w,h);
  // Main metal body
  const mg=ctx.createLinearGradient(0,y,0,y+h);
  mg.addColorStop(0,'#6A6050');mg.addColorStop(.35,'#5A5040');mg.addColorStop(.8,'#3A3020');mg.addColorStop(1,'#2A2010');
  ctx.fillStyle=mg;ctx.fillRect(sx,y,w,h);
  // Top highlight
  ctx.fillStyle='#8A8068';ctx.fillRect(sx,y,w,3);
  ctx.fillStyle='rgba(255,240,200,.15)';ctx.fillRect(sx+2,y,w-4,1);
  // Metal plate lines
  ctx.fillStyle='rgba(0,0,0,.3)';
  const step=Math.round(w/3);
  for(let i=1;i<3;i++)ctx.fillRect(sx+i*step,y,2,h);
  // Rivets
  ctx.fillStyle='#AAA090';
  [[4,h/2],[w-8,h/2],[w/2-3,2],[w/2-3,h-4]].forEach(([rx,ry])=>{ctx.beginPath();ctx.arc(sx+rx,y+ry,2.5,0,Math.PI*2);ctx.fill();ctx.fillStyle='rgba(255,255,220,.4)';ctx.beginPath();ctx.arc(sx+rx-0.5,y+ry-0.5,1,0,Math.PI*2);ctx.fill();ctx.fillStyle='#AAA090';});
  // Bottom edge
  ctx.fillStyle='#1A1408';ctx.fillRect(sx,y+h-2,w,2);
  // Support pillar
  const pillarH=GROUND-(y+h);
  if(pillarH>0){
    const pg=ctx.createLinearGradient(sx+w/2-5,0,sx+w/2+5,0);
    pg.addColorStop(0,'#2A2010');pg.addColorStop(.5,'#4A4030');pg.addColorStop(1,'#2A2010');
    ctx.fillStyle=pg;ctx.fillRect(sx+w/2-5,y+h,10,pillarH);
    ctx.fillStyle='#888';ctx.fillRect(sx+w/2-6,y+h+2,12,4);
  }
}

// ═══ ENEMY SPRITES ═══
const enemyImgs2={pickle:[null,null],cheese_guard:[null,null],sausage:[null,null]};
function preloadEnemyImgs2(){
  [['pickle',['pickle_walk0','pickle_walk1']],['cheese_guard',['cheese_guard0','cheese_guard1']],['sausage',['sausage_walk0','sausage_walk1']]].forEach(([type,names])=>{
    names.forEach((name,i)=>{const img=new Image();img.onload=()=>enemyImgs2[type][i]=img;img.onerror=()=>enemyImgs2[type][i]=null;img.src=`assets/sprites/Enemies/${name}.png`;});
  });
}

// ═══ ENEMY DEFINITIONS ═══
const ENEMY_DEFS2=[
  // Section 1
  {t:'pickle',  x:380,  p:120},
  {t:'pickle',  x:700,  p:140},
  {t:'sausage', x:1050},
  {t:'pickle',  x:1350, p:130},
  {t:'sausage', x:1700},
  {t:'pickle',  x:2000, p:150},
  {t:'cheese_guard',x:2400},
  {t:'pickle',  x:2800, p:120},
  {t:'sausage', x:3200},
  {t:'pickle',  x:3500, p:140},
  // Section 3
  {t:'pickle',  x:5300, p:130},
  {t:'sausage', x:5650},
  {t:'cheese_guard',x:6000},
  {t:'pickle',  x:6300, p:150},
  {t:'sausage', x:6700},
  {t:'pickle',  x:7000, p:130},
  {t:'cheese_guard',x:7400},
  {t:'pickle',  x:7700, p:140},
  {t:'sausage', x:8100},
  {t:'pickle',  x:8400, p:120},
  {t:'sausage', x:8700},
];

let enemies2=[];
function spawnEnemies2(){
  enemies2=ENEMY_DEFS2.filter(d=>d.x<SAFE.x1||d.x>SAFE.x2).map(d=>{
    const e={type:d.t,alive:true,hitTimer:0,animFrame:0,animTimer:0};
    if(d.t==='pickle')       Object.assign(e,{x:d.x,y:GROUND-48,w:36,h:48,originX:d.x,patrolDist:d.p||130,vx:1.3,dir:1});
    else if(d.t==='sausage') Object.assign(e,{x:d.x,y:GROUND-52,w:52,h:52,originX:d.x,patrolDist:160,vx:1.6,dir:1});
    else if(d.t==='cheese_guard') Object.assign(e,{x:d.x,y:GROUND-60,w:44,h:60,charging:false,chargeVx:0,chargeLeft:0,dir:-1,originX:d.x,chargeSpeed:4});
    return e;
  });
}

function isWorldXOverHole2(wx){return HOLES2.some(h=>wx>h.x-4&&wx<h.x+h.w+4);}
function isEnemyOverHole2(e){return isWorldXOverHole2(e.x+4)||isWorldXOverHole2(e.x+e.w-4);}

function drawEnemy2(e,camX){
  if(!e.alive)return;const sx=e.x-camX;if(sx<-80||sx>CW+80)return;
  if(e.hitTimer>0){ctx.save();ctx.globalAlpha=.55;ctx.fillStyle='#FFF';ctx.fillRect(sx,e.y,e.w,e.h);ctx.restore();return;}
  // Try sprite
  let imgs=null;
  if(e.type==='pickle')imgs=enemyImgs2.pickle;
  else if(e.type==='sausage')imgs=enemyImgs2.sausage;
  else if(e.type==='cheese_guard')imgs=enemyImgs2.cheese_guard;
  const f=e.animFrame%2;
  const sprImg=imgs&&(imgs[f]||imgs[1-f]);
  if(sprImg){ctx.save();ctx.translate(sx+e.w/2,e.y+e.h/2);if(e.dir===-1)ctx.scale(-1,1);ctx.drawImage(sprImg,-e.w/2,-e.h/2,e.w,e.h);ctx.restore();return;}
  // Procedural fallback
  if(e.type==='pickle')     drawPickle(e,sx);
  else if(e.type==='sausage')drawSausage(e,sx);
  else if(e.type==='cheese_guard')drawCheeseGuard(e,sx);
}

function drawPickle(e,sx){
  const cx=sx+e.w/2,cy=e.y+e.h/2,t=Date.now(),af=e.animFrame%2;
  // Shadow
  ctx.save();ctx.globalAlpha=.2;ctx.fillStyle='#000';ctx.beginPath();ctx.ellipse(cx,e.y+e.h,12,4,0,0,Math.PI*2);ctx.fill();ctx.restore();
  // Legs
  const ls=af?4:-4;
  ctx.fillStyle='#1A6A10';ctx.fillRect(cx-10,e.y+e.h-14,8,14+ls);ctx.fillRect(cx+2,e.y+e.h-14,8,14-ls);
  ctx.fillStyle='#220F08';ctx.fillRect(cx-11,e.y+e.h-2+Math.abs(ls/2),10,4);ctx.fillRect(cx+1,e.y+e.h-2+Math.abs(-ls/2),10,4);
  // Body
  const bodyG=ctx.createLinearGradient(sx,e.y,sx+e.w,e.y);
  bodyG.addColorStop(0,'#1A6A10');bodyG.addColorStop(.3,'#2A8A20');bodyG.addColorStop(.6,'#1A6A10');bodyG.addColorStop(1,'#0E4A08');
  ctx.fillStyle=bodyG;ctx.beginPath();ctx.ellipse(cx,cy-4,e.w*.45,e.h*.52,0,0,Math.PI*2);ctx.fill();
  // Bumps
  ctx.fillStyle='#3AAA28';[-.3,0,.3].forEach(off=>ctx.fillRect(cx+off*e.w-3,e.y+4+Math.random()*.5,6,4));
  // Eyes
  ctx.fillStyle='#FFF';ctx.fillRect(cx-10,cy-12,8,7);ctx.fillRect(cx+2,cy-12,8,7);
  ctx.fillStyle='#001800';ctx.fillRect(cx-8,cy-10,4,4);ctx.fillRect(cx+4,cy-10,4,4);
  ctx.strokeStyle='#001800';ctx.lineWidth=1.5;
  ctx.beginPath();ctx.moveTo(cx-11,cy-16);ctx.lineTo(cx-2,cy-12);ctx.stroke();
  ctx.beginPath();ctx.moveTo(cx+11,cy-16);ctx.lineTo(cx+2,cy-12);ctx.stroke();
  ctx.beginPath();ctx.moveTo(cx-5,cy-4);ctx.quadraticCurveTo(cx,cy-2,cx+5,cy-4);ctx.stroke();
  // Seeds
  ctx.fillStyle='#CCEE88';[-.25,.1,.35].forEach((off,i)=>{ctx.save();ctx.translate(cx+off*e.w,cy-8+i*6);ctx.rotate(.3);ctx.fillRect(-2,-1,4,2);ctx.restore();});
}

function drawSausage(e,sx){
  const cx=sx+e.w/2,cy=e.y+e.h/2,t=Date.now(),af=e.animFrame%2;
  ctx.save();ctx.globalAlpha=.2;ctx.fillStyle='#000';ctx.beginPath();ctx.ellipse(cx,e.y+e.h,14,5,0,0,Math.PI*2);ctx.fill();ctx.restore();
  // Legs
  const ls=af?5:-5;
  ctx.fillStyle='#CC3300';ctx.fillRect(cx-12,e.y+e.h-16,9,16+ls);ctx.fillRect(cx+3,e.y+e.h-16,9,16-ls);
  ctx.fillStyle='#551100';ctx.fillRect(cx-13,e.y+e.h-2+Math.abs(ls/2),11,5);ctx.fillRect(cx+2,e.y+e.h-2+Math.abs(-ls/2),11,5);
  // Sausage body
  const sg=ctx.createLinearGradient(sx,e.y,sx+e.w,e.y);
  sg.addColorStop(0,'#CC3300');sg.addColorStop(.35,'#EE5522');sg.addColorStop(.65,'#CC3300');sg.addColorStop(1,'#AA2200');
  ctx.fillStyle=sg;ctx.beginPath();ctx.ellipse(cx,cy-2,e.w*.47,e.h*.48,0,0,Math.PI*2);ctx.fill();
  // Shine
  ctx.fillStyle='rgba(255,180,140,.3)';ctx.beginPath();ctx.ellipse(cx-e.w*.12,cy-e.h*.18,e.w*.14,e.h*.12,-0.3,0,Math.PI*2);ctx.fill();
  // Sausage ends (darker)
  ctx.fillStyle='#881800';ctx.beginPath();ctx.ellipse(sx+4,cy,4,e.h*.3,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(sx+e.w-4,cy,4,e.h*.3,0,0,Math.PI*2);ctx.fill();
  // Skin texture lines
  ctx.strokeStyle='rgba(150,40,0,.3)';ctx.lineWidth=1;
  for(let i=1;i<5;i++){ctx.beginPath();ctx.moveTo(cx-e.w*.3+i*e.w*.15,e.y+4);ctx.lineTo(cx-e.w*.3+i*e.w*.15,e.y+e.h-8);ctx.stroke();}
  // Face
  ctx.fillStyle='#FFF';ctx.fillRect(cx-10,cy-8,8,7);ctx.fillRect(cx+2,cy-8,8,7);
  ctx.fillStyle='#220000';ctx.fillRect(cx-8,cy-6,4,4);ctx.fillRect(cx+4,cy-6,4,4);
  ctx.strokeStyle='#220000';ctx.lineWidth=1.5;
  ctx.beginPath();ctx.moveTo(cx-5,cy+2);ctx.lineTo(cx+5,cy+2);ctx.stroke();
}

function drawCheeseGuard(e,sx){
  const cx=sx+e.w/2,cy=e.y+e.h/2,t=Date.now();
  ctx.save();ctx.globalAlpha=.22;ctx.fillStyle='#000';ctx.beginPath();ctx.ellipse(cx,e.y+e.h,13,5,0,0,Math.PI*2);ctx.fill();ctx.restore();
  if(e.charging){ctx.save();ctx.globalAlpha=.3+.15*Math.abs(Math.sin(t*.015));ctx.fillStyle='#FF8800';ctx.beginPath();ctx.ellipse(cx,cy,e.w*.7,e.h*.6,0,0,Math.PI*2);ctx.fill();ctx.restore();}
  // Cheese wedge body
  ctx.fillStyle='#FFCC00';ctx.beginPath();ctx.moveTo(cx-e.w*.45,e.y+e.h*.7);ctx.lineTo(cx,e.y);ctx.lineTo(cx+e.w*.45,e.y+e.h*.7);ctx.closePath();ctx.fill();
  ctx.fillStyle='#FFDD44';ctx.beginPath();ctx.moveTo(cx-e.w*.4,e.y+e.h*.65);ctx.lineTo(cx-e.w*.05,e.y+e.h*.15);ctx.lineTo(cx+e.w*.25,e.y+e.h*.65);ctx.closePath();ctx.fill();
  // Holes in cheese
  ctx.fillStyle='#CC9900';[[-0.1,.35],[.15,.5],[-.2,.55]].forEach(([ox,oy])=>{ctx.beginPath();ctx.arc(cx+ox*e.w,e.y+oy*e.h,4,0,Math.PI*2);ctx.fill();});
  // Legs
  ctx.fillStyle='#AA8800';ctx.fillRect(cx-10,e.y+e.h*.7,8,e.h*.3);ctx.fillRect(cx+2,e.y+e.h*.7,8,e.h*.3);
  ctx.fillStyle='#664400';ctx.fillRect(cx-12,e.y+e.h-4,12,5);ctx.fillRect(cx,e.y+e.h-4,12,5);
  // Eyes and face
  const ey=e.y+e.h*.4;
  ctx.fillStyle='#FFF';ctx.fillRect(cx-10,ey-4,8,7);ctx.fillRect(cx+2,ey-4,8,7);
  ctx.fillStyle='#331100';ctx.fillRect(cx-8,ey-2,4,4);ctx.fillRect(cx+4,ey-2,4,4);
  ctx.strokeStyle='#331100';ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(cx-11,ey-8);ctx.lineTo(cx-2,ey-4);ctx.stroke();
  ctx.beginPath();ctx.moveTo(cx+11,ey-8);ctx.lineTo(cx+2,ey-4);ctx.stroke();
  if(e.charging){ctx.fillStyle='#330000';ctx.beginPath();ctx.arc(cx,ey+8,5,0,Math.PI*2);ctx.fill();}
  else{ctx.strokeStyle='#331100';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(cx-5,ey+6);ctx.quadraticCurveTo(cx,ey+3,cx+5,ey+6);ctx.stroke();}
}

// ═══ UPDATE ENEMIES ═══
function updateEnemies2(dt){
  if(gState!=='PLAYING')return;
  enemies2.forEach(e=>{
    if(!e.alive)return;
    if(e.hitTimer>0)e.hitTimer-=dt;
    e.animTimer=(e.animTimer||0)+dt;
    if(e.animTimer>170){e.animFrame=(e.animFrame+1)%2;e.animTimer=0;}
    const eCx=e.x+e.w/2,pCx=P.x+P.w/2;
    if(e.type==='pickle'||e.type==='sausage'){
      const nextX=e.x+e.vx,foot=e.vx>0?nextX+e.w:nextX;
      if(isWorldXOverHole2(foot))e.vx*=-1;else e.x+=e.vx;
      if(e.x<e.originX-e.patrolDist||e.x>e.originX+e.patrolDist)e.vx*=-1;
      if(isEnemyOverHole2(e)){e.y+=GRAVITY*2;if(e.y>CH+20){e.alive=false;return;}}else e.y=GROUND-e.h;
      e.dir=pCx>eCx?1:-1;
    }else if(e.type==='cheese_guard'){
      if(!e.charging){const dist=Math.abs(pCx-eCx);if(dist<240&&dist>40){e.charging=true;e.chargeVx=(pCx>eCx?1:-1)*e.chargeSpeed;e.chargeLeft=260;e.dir=e.chargeVx>0?1:-1;}}
      else{const nxt=e.x+e.chargeVx,chk=e.chargeVx>0?nxt+e.w:nxt;if(isWorldXOverHole2(chk)){e.y+=GRAVITY*3;if(e.y>CH+20){e.alive=false;return;}}else e.x+=e.chargeVx;e.chargeLeft-=Math.abs(e.chargeVx);if(e.chargeLeft<=0){e.charging=false;e.chargeVx=0;}if(e.x<0||e.x+e.w>MAP_W){e.charging=false;e.chargeVx=0;}}
      if(!isEnemyOverHole2(e))e.y=GROUND-e.h;
    }
    // Collision
    if(rectsOverlap(P,e)){
      const pBot=P.y+P.h,eTop=e.y,zone=e.type==='cheese_guard'?e.h*.28:18;
      if(P.vy>0.5&&pBot<eTop+zone){killEnemy(e);P.vy=JUMP_V*.55;}
      else if(!P.invul&&!P.potion)takeDamage();
    }
  });
}

function killEnemy(e){e.alive=false;sessionNuggets+=2;updateHUDNuggets();spawnDeathParticles(e.x+e.w/2,e.y+e.h/2,e.type);}
function rectsOverlap(a,b){return a.x+6<b.x+b.w-6&&a.x+a.w-6>b.x+6&&a.y+8<b.y+b.h-6&&a.y+a.h-4>b.y+8;}

// ═══ SHOP ═══
const SHOP2={x:4300,y:GROUND-92,w:160,h:92,interactR:130};
const PEDESTAL2={x:9000,y:GROUND-70,w:80,h:70,collected:false,interactR:110};

function drawShopWorld2(camX){
  const sx=SHOP2.x-camX;if(sx<-220||sx>CW+220)return;
  const sy=SHOP2.y;
  ctx.fillStyle='#2A1A00';ctx.fillRect(sx,sy,SHOP2.w,SHOP2.h);
  ctx.fillStyle='#3A2800';for(let i=0;i<6;i++)ctx.fillRect(sx,sy+i*16,SHOP2.w,3);
  ctx.fillStyle='#1E1000';ctx.fillRect(sx,sy+SHOP2.h-18,SHOP2.w,18);
  ctx.fillStyle='#5C3C10';ctx.fillRect(sx,sy+SHOP2.h-20,SHOP2.w,5);
  const cg=ctx.createLinearGradient(sx,sy-36,sx,sy);cg.addColorStop(0,'#FFAA00');cg.addColorStop(1,'#FF7700');
  ctx.fillStyle=cg;ctx.beginPath();ctx.moveTo(sx-12,sy);ctx.lineTo(sx+SHOP2.w+12,sy);ctx.lineTo(sx+SHOP2.w+4,sy-30);ctx.lineTo(sx-4,sy-30);ctx.closePath();ctx.fill();
  ctx.fillStyle='rgba(255,220,80,.15)';for(let i=0;i<5;i++)ctx.fillRect(sx+14+i*28,sy-30,12,30);
  ctx.fillStyle='#FFFFF0';ctx.fillRect(sx+14,sy+8,SHOP2.w-28,24);ctx.strokeStyle='#886600';ctx.lineWidth=2;ctx.strokeRect(sx+14,sy+8,SHOP2.w-28,24);
  ctx.fillStyle='#331100';ctx.font='6px "Press Start 2P",monospace';ctx.textAlign='center';ctx.fillText('FEIRA DO',sx+SHOP2.w/2,sy+18);ctx.fillText('RHYAN',sx+SHOP2.w/2,sy+27);ctx.textAlign='left';ctx.font='20px sans-serif';ctx.fillText('🧑‍🌾',sx+SHOP2.w/2-14,sy+SHOP2.h-8);
}

function drawPedestal2(camX){
  if(PEDESTAL2.collected)return;
  const sx=PEDESTAL2.x-camX;if(sx<-120||sx>CW+120)return;
  const sy=PEDESTAL2.y,cx2=sx+PEDESTAL2.w/2,t=Date.now();
  // Pedestal body — golden factory plinth
  const sg=ctx.createLinearGradient(sx,sy,sx+PEDESTAL2.w,sy);sg.addColorStop(0,'#888');sg.addColorStop(.5,'#AAA');sg.addColorStop(1,'#888');
  ctx.fillStyle=sg;ctx.fillRect(sx,sy,PEDESTAL2.w,PEDESTAL2.h);
  ctx.fillStyle='#FFCC00';ctx.fillRect(sx-4,sy-5,PEDESTAL2.w+8,8);ctx.fillRect(sx-6,sy+PEDESTAL2.h-6,PEDESTAL2.w+12,8);
  ctx.fillStyle='rgba(255,220,0,.12)';ctx.beginPath();const rg2=ctx.createRadialGradient(cx2,sy-25,5,cx2,sy-25,70);rg2.addColorStop(0,'#FFCC00');rg2.addColorStop(1,'rgba(255,200,0,0)');ctx.fillStyle=rg2;ctx.fillRect(sx-60,sy-80,PEDESTAL2.w+120,90);
  const floatY=sy-45+Math.sin(t*.003)*7;
  ctx.font=`${34+Math.sin(t*.004)*2}px sans-serif`;ctx.textAlign='center';ctx.fillText('🧀',cx2,floatY);ctx.textAlign='left';
  // Sparkles
  for(let i=0;i<6;i++){const sa=(t*.0025+i*(Math.PI*2/6))%(Math.PI*2);ctx.save();ctx.globalAlpha=.6+.4*Math.sin(t*.008+i);ctx.fillStyle='#FFD700';ctx.fillRect(cx2+Math.cos(sa)*38-2,floatY-8+Math.sin(sa)*22-2,4,4);ctx.restore();}
  const pd=Math.abs((P.x+P.w/2)-(PEDESTAL2.x+PEDESTAL2.w/2));
  if(pd<PEDESTAL2.interactR){ctx.save();ctx.globalAlpha=.15;ctx.fillStyle='#FFD700';ctx.fillRect(sx-10,sy-60,PEDESTAL2.w+20,PEDESTAL2.h+65);ctx.restore();}
}

// ═══ MAP NUGGETS ═══
const NUGGET_DEFS2=[
  {x:250,y:GROUND-30},{x:420,y:GROUND-30},{x:640,y:GROUND-100},{x:820,y:GROUND-165},
  {x:1080,y:GROUND-100},{x:1180,y:GROUND-30},{x:1500,y:GROUND-145},{x:1730,y:GROUND-165},
  {x:1960,y:GROUND-225},{x:2200,y:GROUND-30},{x:2500,y:GROUND-30},{x:2850,y:GROUND-30},
  {x:3100,y:GROUND-30},{x:3400,y:GROUND-30},{x:3700,y:GROUND-30},
  // Cloud bonus route
  {x:4650,y:GROUND-130},{x:4800,y:GROUND-190},{x:4960,y:GROUND-260},{x:5030,y:GROUND-310},
  // Section 3
  {x:5400,y:GROUND-30},{x:5650,y:GROUND-120},{x:5900,y:GROUND-190},{x:6100,y:GROUND-30},
  {x:6400,y:GROUND-120},{x:6700,y:GROUND-30},{x:7000,y:GROUND-145},{x:7250,y:GROUND-30},
  {x:7550,y:GROUND-165},{x:7800,y:GROUND-30},{x:8050,y:GROUND-195},{x:8300,y:GROUND-265},
  {x:8600,y:GROUND-195},{x:8850,y:GROUND-30},
];
let mapNuggets2=[];
function spawnMapNuggets2(){mapNuggets2=NUGGET_DEFS2.map((d,i)=>({id:i,x:d.x,y:d.y,collected:false,phase:Math.random()*Math.PI*2}));}
function drawMapNuggets2(camX){
  const t=Date.now();
  mapNuggets2.forEach(n=>{
    if(n.collected)return;const sx=n.x-camX;if(sx<-30||sx>CW+30)return;
    const bob=Math.sin(t*.004+n.phase)*3,sy=n.y+bob;
    ctx.save();ctx.globalAlpha=.2+.15*Math.abs(Math.sin(t*.004+n.phase));
    const rg=ctx.createRadialGradient(sx,sy,2,sx,sy,18);rg.addColorStop(0,'#FF9900');rg.addColorStop(1,'rgba(255,153,0,0)');
    ctx.fillStyle=rg;ctx.fillRect(sx-18,sy-18,36,36);ctx.restore();
    ctx.font='20px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('🍗',sx,sy);ctx.textBaseline='alphabetic';
  });
}
function checkNuggetCollision2(){
  mapNuggets2.forEach(n=>{if(n.collected)return;const dist=Math.hypot(P.x+P.w/2-n.x,P.y+P.h/2-n.y);if(dist<22){n.collected=true;sessionNuggets+=1;updateHUDNuggets();sfxNugget();particles.push({x:n.x,y:n.y-14,vx:0,vy:-1.1,text:'+1🍗',life:1,decay:.022,isText:true,col:'#FF9900'});}});
}

// ═══ PHYSICS ═══
function platformAbove2(px,py,pw){
  for(const pl of IRON_PLATFORMS){if(px+pw-4>pl.x&&px+4<pl.x+pl.w&&py+P.h>=pl.y&&py+P.h<=pl.y+pl.h+14&&P.vy>=0)return{y:pl.y,type:'iron'};}
  for(const cp of cloudPlats){if(cp.state==='gone'||cp.alpha<0.1)continue;if(px+pw-4>cp.x&&px+4<cp.x+cp.w&&py+P.h>=cp.y&&py+P.h<=cp.y+cp.h+12&&P.vy>=0)return{y:cp.y,type:'cloud',ref:cp};}
  return null;
}
function isOnSolid2(px,py,pw){return!HOLES2.some(h=>px+pw-6>h.x+6&&px+6<h.x+h.w-6);}

function updatePhysics2(dt){
  if(gState!=='PLAYING')return;
  if(keys.left){P.vx=-SPD;P.facing=-1;P.state='run';}
  else if(keys.right){P.vx=SPD;P.facing=1;P.state='run';}
  else{P.vx*=.75;if(Math.abs(P.vx)<.2)P.vx=0;}
  if(!keys.left&&!keys.right)P.state=P.onGround?'idle':'jump';
  if(keys.jump&&P.onGround){P.vy=JUMP_V;P.onGround=false;P.state='jump';keys.jump=false;}
  P.vy+=GRAVITY;if(P.vy>18)P.vy=18;
  P.x+=P.vx;P.y+=P.vy;
  if(P.x<0){P.x=0;P.vx=0;}if(P.x+P.w>MAP_W){P.x=MAP_W-P.w;P.vx=0;}
  P.onGround=false;
  const plat=platformAbove2(P.x,P.y,P.w);
  if(plat){P.y=plat.y-P.h;P.vy=0;P.onGround=true;if(plat.type==='cloud'&&plat.ref&&plat.ref.state==='solid'){plat.ref.state='shaking';plat.ref.timer=0;}}
  if(P.y+P.h>=GROUND){if(isOnSolid2(P.x,P.y,P.w)){P.y=GROUND-P.h;P.vy=0;P.onGround=true;}else if(P.y>GROUND+150)takeDamage2(true);}
  if(!P.onGround)P.state='jump';else if(Math.abs(P.vx)>.5)P.state='run';else P.state='idle';
  P.animTimer+=dt;if(P.animTimer>P.ANIM_SPD){P.animFrame=(P.animFrame+1)%4;P.animTimer=0;}
  if(P.invul){P.invulTimer-=dt;if(P.invulTimer<=0){P.invul=false;P.invulTimer=0;}}
  if(P.potion){P.potion.timeLeft-=dt;if(P.potion.timeLeft<=0){P.potion=null;updateInvulBar(0);}else updateInvulBar(P.potion.timeLeft/P.POTION_DUR);}
  const prog=Math.min(1,Math.max(0,(P.x-80)/(PEDESTAL2.x-180)));
  document.getElementById('hud-progress-fill').style.width=(prog*100)+'%';
}

function takeDamage2(instant=false){
  if(DEV_GODMODE||P.potion||P.invul)return;
  P.lives--;P.state='hurt';updateHUDLives();
  const flash=document.getElementById('damage-flash');
  flash.classList.remove('flash-active');void flash.offsetWidth;flash.classList.add('flash-active');
  if(P.lives<=0){triggerGameOver2();return;}
  if(instant){P.x=80;P.y=GROUND-P.h-2;P.vx=0;P.vy=0;}
  P.invul=true;P.invulTimer=P.INVUL_DUR;
}

// ═══ PLAYER DRAW ═══
function drawPlayer2(camX){
  const sx=P.x-camX,sy=P.y;
  if(P.invul&&!P.potion&&Math.floor(Date.now()/75)%2===1)return;
  ctx.save();ctx.translate(sx+P.w/2,sy+P.h/2);if(P.facing===-1)ctx.scale(-1,1);
  const spKey=P.state==='run'?`run${P.animFrame%4}`:P.state;
  if(P.sprites[spKey])ctx.drawImage(P.sprites[spKey],-P.w/2,-P.h/2,P.w,P.h);
  else drawMichaelProc2();
  ctx.restore();
  if(P.potion){ctx.save();ctx.globalAlpha=.22+.12*Math.sin(Date.now()*.008);const rg3=ctx.createRadialGradient(sx+P.w/2,sy+P.h/2,10,sx+P.w/2,sy+P.h/2,46);rg3.addColorStop(0,'#88CCFF');rg3.addColorStop(1,'rgba(136,204,255,0)');ctx.fillStyle=rg3;ctx.fillRect(sx-12,sy-12,P.w+24,P.h+24);ctx.restore();}
}
function drawMichaelProc2(){
  const t=Date.now(),hw=P.w/2,hh=P.h/2;
  const run=P.state==='run',jump=P.state==='jump',hurt=P.state==='hurt';
  const ls=run?Math.sin(t*.015)*12:0,as=run?Math.sin(t*.015+Math.PI)*10:0;
  const ib=P.state==='idle'?Math.sin(t*.003)*1.5:0;
  ctx.save();ctx.globalAlpha=.25;ctx.fillStyle='#000';ctx.beginPath();ctx.ellipse(0,hh+2,15,5,0,0,Math.PI*2);ctx.fill();ctx.restore();
  ctx.fillStyle='#2244AA';ctx.save();ctx.translate(-7,hh*.35+ib);ctx.rotate((ls-(jump?8:0))*Math.PI/180);ctx.fillRect(-5,0,11,24);ctx.fillStyle='#221100';ctx.fillRect(-6,22,14,8);ctx.restore();
  ctx.fillStyle='#2244AA';ctx.save();ctx.translate(7,hh*.35+ib);ctx.rotate((-ls+(jump?8:0))*Math.PI/180);ctx.fillRect(-5,0,11,24);ctx.fillStyle='#221100';ctx.fillRect(-6,22,14,8);ctx.restore();
  ctx.fillStyle=hurt?'#FF4400':'#E85500';ctx.fillRect(-12,-hh*.35+ib,24,hh*.75);ctx.fillStyle='rgba(255,255,255,.15)';ctx.fillRect(2,-hh*.22+ib,8,7);
  ctx.fillStyle='#FFAA66';ctx.save();ctx.translate(-14,-hh*.2+ib);ctx.rotate((as-(jump?-25:0))*Math.PI/180);ctx.fillRect(-5,0,10,22);ctx.restore();
  ctx.save();ctx.translate(14,-hh*.2+ib);ctx.rotate((-as+(jump?-25:0))*Math.PI/180);ctx.fillRect(-5,0,10,22);ctx.restore();
  const headY=-hh*.72+ib;
  ctx.fillStyle='#FFAA66';ctx.fillRect(-5,headY+22,10,8);ctx.beginPath();ctx.ellipse(0,headY+10,14,16,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#3A1A00';ctx.beginPath();ctx.ellipse(0,headY-2,14,10,0,0,Math.PI);ctx.fill();ctx.fillRect(-14,headY-2,28,5);
  const eyeY=headY+8;
  ctx.fillStyle='#FFF';ctx.fillRect(-9,eyeY-4,7,7);ctx.fillRect(2,eyeY-4,7,7);
  ctx.fillStyle='#1A0A00';ctx.fillRect(-7,eyeY-2,4,4);ctx.fillRect(4,eyeY-2,4,4);
}

// ═══ INPUT ═══
const keys={left:false,right:false,jump:false,interact:false,useItem:false};
function setupInput2(){
  const K={ArrowLeft:'left',a:'left',A:'left',ArrowRight:'right',d:'right',D:'right',ArrowUp:'jump',w:'jump',W:'jump',' ':'jump',e:'interact',E:'interact',q:'useItem',Q:'useItem'};
  document.addEventListener('keydown',ev=>{if(K[ev.key]){if(K[ev.key]==='jump'&&P.onGround)keys.jump=true;else keys[K[ev.key]]=true;}if(ev.key==='Escape'){ev.preventDefault();openIngameMenu2();}});
  document.addEventListener('keyup',ev=>{if(K[ev.key]&&K[ev.key]!=='jump')keys[K[ev.key]]=false;});
  [['mb-left','left'],['mb-right','right'],['mb-jump','jump'],['mb-interact','interact'],['mb-item','useItem']].forEach(([id,key])=>{
    const btn=document.getElementById(id);if(!btn)return;
    const dn=e=>{e.preventDefault();if(key==='jump'&&P.onGround)keys.jump=true;else keys[key]=true;btn.classList.add('pressed');};
    const up=e=>{e.preventDefault();if(key!=='jump')keys[key]=false;btn.classList.remove('pressed');};
    btn.addEventListener('touchstart',dn,{passive:false});btn.addEventListener('touchend',up,{passive:false});
    btn.addEventListener('mousedown',dn);btn.addEventListener('mouseup',up);
  });
}

// ═══ INTERACT ═══
let interactTarget2=null;
function checkInteractables2(){
  const pCx=P.x+P.w/2;
  const ds=Math.abs(pCx-(SHOP2.x+SHOP2.w/2));
  const dp=Math.abs(pCx-(PEDESTAL2.x+PEDESTAL2.w/2));
  const dc=Math.abs(pCx-(CHEST.x+CHEST.w/2));
  const hint=document.getElementById('interact-hint');
  const hIcon=document.getElementById('interact-icon'),hText=document.getElementById('interact-text');
  if(!CHEST.opened&&dc<CHEST.interactR&&gState==='PLAYING'){
    hint.classList.remove('hidden');hIcon.textContent='📦';hText.textContent='[E] Abrir Baú';
    interactTarget2='chest';
  }else if(ds<SHOP2.interactR&&gState==='PLAYING'){
    hint.classList.remove('hidden');hIcon.textContent='🏪';hText.textContent='[E] Feira do Rhyan';
    interactTarget2='shop';
  }else if(!PEDESTAL2.collected&&dp<PEDESTAL2.interactR&&gState==='PLAYING'){
    hint.classList.remove('hidden');hIcon.textContent='🧀';hText.textContent='[E] Pegar o Queijo!';
    interactTarget2='pedestal';
  }else{hint.classList.add('hidden');interactTarget2=null;}
  if(keys.interact&&interactTarget2){
    keys.interact=false;
    if(interactTarget2==='chest')openChest();
    else if(interactTarget2==='shop')openShop2();
    else if(interactTarget2==='pedestal'&&!PEDESTAL2.collected)collectCheese();
  }
}

// ═══ CHEST OPEN ═══
function openChest(){
  if(CHEST.opened)return;
  CHEST.opened=true;
  sessionNuggets+=100;updateHUDNuggets();
  sfxBuy();
  particles.push({x:CHEST.x+25,y:CHEST.y-30,vx:0,vy:-1.5,text:'+100🍗',life:1.2,decay:.012,isText:true,col:'#FFD700'});
  for(let i=0;i<30;i++){const a=Math.random()*Math.PI*2,s=2+Math.random()*6;particles.push({x:CHEST.x+25,y:CHEST.y+10,vx:Math.cos(a)*s,vy:Math.sin(a)*s-4,col:Math.random()<.5?'#FFD700':'#FFAA00',size:4+Math.random()*6,life:1,decay:.02,gravity:.15,type:'square',rot:Math.random()*Math.PI*2,rotSpd:(Math.random()-.5)*.3});}
  showCompletionToastF2('📦 Baú encontrado! +100🍗');
}
function showCompletionToastF2(msg){
  let el=document.getElementById('completion-toast');
  if(!el){el=document.createElement('div');el.id='completion-toast';el.style.cssText='position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);z-index:200;font-family:"Press Start 2P",monospace;font-size:12px;color:#0A0400;background:linear-gradient(180deg,#FFD700,#FF6B00);border:4px solid #994400;padding:18px 28px;text-align:center;white-space:pre-line;box-shadow:0 0 30px rgba(255,215,0,.6);';document.getElementById('game-wrap').appendChild(el);}
  el.textContent=msg;el.style.display='block';el.style.opacity='1';
  setTimeout(()=>{el.style.transition='opacity .6s';el.style.opacity='0';setTimeout(()=>{el.style.display='none';el.style.transition='';},650);},3500);
}

// ═══ SHOP ═══
let shopFocusIdx2=0;
function openShop2(){
  gState='SHOP';shopFocusIdx2=0;
  document.getElementById('shop-overlay').classList.remove('hidden');
  document.getElementById('shop-nugget-display').textContent=(readNuggets()+sessionNuggets).toLocaleString('pt-BR');
  document.getElementById('shop-msg').textContent='';
  updateShopFocus2();
}
function closeShop2(){gState='PLAYING';document.getElementById('shop-overlay').classList.add('hidden');}
function updateShopFocus2(){const items=document.querySelectorAll('.shop-item');items.forEach((el,i)=>el.classList.toggle('shop-selected',i===shopFocusIdx2));}
function shopGpNavHandle(up,down,pressA,pressB){
  const items=Array.from(document.querySelectorAll('.shop-item'));const n=items.length;
  if(up){shopFocusIdx2=(shopFocusIdx2-1+n)%n;updateShopFocus2();}
  if(down){shopFocusIdx2=(shopFocusIdx2+1)%n;updateShopFocus2();}
  if(pressA){const btn=items[shopFocusIdx2]?.querySelector('.shop-buy-btn');if(btn)btn.click();}
  if(pressB)closeShop2();
}
function buyItem2(type){
  const total=readNuggets()+sessionNuggets;const msg=document.getElementById('shop-msg');
  if(type==='life'){if(P.lives>=P.maxLives){msg.className='msg-err';msg.textContent='Vida já está cheia!';return;}if(total<30){msg.className='msg-err';msg.textContent='Nuggets insuficientes!';return;}sessionNuggets-=30;if(sessionNuggets<0){writeSave({nuggets:Math.max(0,readNuggets()+sessionNuggets)});sessionNuggets=0;}P.lives=Math.min(P.lives+1,P.maxLives);updateHUDLives();updateHUDNuggets();document.getElementById('shop-nugget-display').textContent=(readNuggets()+sessionNuggets).toLocaleString('pt-BR');msg.className='msg-ok';msg.textContent='❤ Vida recuperada!';sfxBuy();}
  else if(type==='potion'){if(P.item==='potion'){msg.className='msg-err';msg.textContent='Você já tem uma poção!';return;}if(total<20){msg.className='msg-err';msg.textContent='Nuggets insuficientes!';return;}sessionNuggets-=20;if(sessionNuggets<0){writeSave({nuggets:Math.max(0,readNuggets()+sessionNuggets)});sessionNuggets=0;}P.item='potion';updateInventoryUI();updateHUDNuggets();document.getElementById('shop-nugget-display').textContent=(readNuggets()+sessionNuggets).toLocaleString('pt-BR');msg.className='msg-ok';msg.textContent='⚡ Poção na mochila!';sfxBuy();}
}

// ═══ INVENTORY ═══
function toggleBag(){toggleInventoryPanel();}
function toggleInventoryPanel(){
  const panel=document.getElementById('inventory-panel');if(!panel)return;
  if(panel.classList.contains('hidden')){gState='INVENTORY';renderInventoryPanel();panel.classList.remove('hidden');}
  else{panel.classList.add('hidden');if(gState==='INVENTORY')gState='PLAYING';}
}
function renderInventoryPanel(){
  const icon=document.getElementById('inv-ps-icon-0'),name=document.getElementById('inv-ps-name-0'),desc=document.getElementById('inv-ps-desc-0'),slot=document.getElementById('inv-ps-0'),useBtn=document.getElementById('inv-use-btn');
  if(P.item==='potion'){icon.textContent='⚡';name.textContent='POÇÃO';desc.textContent='30s de invulnerabilidade';slot.classList.add('inv-selected');slot.classList.remove('inv-empty');if(useBtn)useBtn.disabled=false;}
  else{icon.textContent='—';name.textContent='VAZIO';desc.textContent='';slot.classList.remove('inv-selected');slot.classList.add('inv-empty');if(useBtn)useBtn.disabled=true;}
  document.getElementById('bag-item-dot')?.classList.toggle('hidden',!P.item);
  document.getElementById('mob-bag-dot')?.classList.toggle('hidden',!P.item);
}
function invPanelUse(){if(P.item==='potion'){P.potion={timeLeft:P.POTION_DUR};P.item=null;updateInventoryUI();document.getElementById('invul-bar-wrap').classList.remove('hidden');sfxBuy();toggleInventoryPanel();}}
function useBagItem(slot){if(slot===0)invPanelUse();}
function checkItemUse(){if(keys.useItem&&P.item){keys.useItem=false;if(P.item==='potion'){P.potion={timeLeft:P.POTION_DUR};P.item=null;updateInventoryUI();document.getElementById('invul-bar-wrap').classList.remove('hidden');}}}

// ═══ HUD ═══
function updateHUDLives(){[1,2,3].forEach(i=>{document.getElementById(`heart${i}`)?.classList.toggle('lost',i>P.lives);document.getElementById(`mob-heart${i}`)?.classList.toggle('lost',i>P.lives);});}
function updateHUDNuggets(){const val=(readNuggets()+sessionNuggets).toLocaleString('pt-BR');document.getElementById('hud-nuggets').textContent=val;const mob=document.getElementById('mob-nugget-count');if(mob)mob.textContent=val;}
function updateInventoryUI(){document.getElementById('bag-item-dot')?.classList.toggle('hidden',!P.item);document.getElementById('mob-bag-dot')?.classList.toggle('hidden',!P.item);}
function updateInvulBar(ratio){document.getElementById('invul-fill').style.width=(ratio*100)+'%';document.getElementById('invul-timer').textContent=Math.ceil(ratio*P.POTION_DUR/1000)+'s';if(ratio<=0)document.getElementById('invul-bar-wrap').classList.add('hidden');}

// ═══ IN-GAME MENU ═══
let igmFocusIdx2=0;
function openIngameMenu2(){
  if(gState==='CUTSCENE')return;
  document.getElementById('inventory-panel')?.classList.add('hidden');
  gState='INGAME_MENU';
  document.getElementById('ingame-menu').classList.remove('hidden');
  igmTab2('game');igmFocusIdx2=0;updateIGMFocus2();
  const s=readSettings();
  const mv=document.getElementById('igm-vol-music');if(mv){mv.value=s.musicVol||80;document.getElementById('igm-vol-music-val').textContent=s.musicVol||80;}
  const sv=document.getElementById('igm-vol-sfx');if(sv){sv.value=s.sfxVol||80;document.getElementById('igm-vol-sfx-val').textContent=s.sfxVol||80;}
  const mb=document.getElementById('igm-btn-mute');if(mb){mb.textContent=(s.mute?'ON':'OFF');mb.classList.toggle('on',!!s.mute);}
  document.getElementById('dev-god-status')?.classList.toggle('hidden',!DEV_GODMODE);
  document.getElementById('god-badge')?.classList.toggle('hidden',!DEV_GODMODE);
}
function closeIngameMenu2(){gState='PLAYING';document.getElementById('ingame-menu').classList.add('hidden');document.getElementById('igm-code-result').textContent='';}
function igmTab2(id){document.querySelectorAll('.igm-tab').forEach(b=>b.classList.toggle('active',b.getAttribute('onclick').includes("'"+id+"'")));document.querySelectorAll('.igm-panel').forEach(p=>p.classList.add('hidden'));document.getElementById('igm-tab-'+id)?.classList.remove('hidden');igmFocusIdx2=0;updateIGMFocus2();}
function igmUpdateAudio2(key,val){const s=loadSave();const settings=s.settings||{};settings[key]=parseInt(val,10);devSave({settings});if(key==='musicVol'&&typeof musicSetVolume==='function')musicSetVolume(parseInt(val,10));}
function igmToggleMute2(){const s=loadSave();const st=s.settings||{};st.mute=!st.mute;devSave({settings:st});const btn=document.getElementById('igm-btn-mute');if(btn){btn.textContent=st.mute?'ON':'OFF';btn.classList.toggle('on',st.mute);}if(typeof musicSetMute==='function')musicSetMute(st.mute);}
function updateIGMFocus2(){const panel=document.querySelector('.igm-panel:not(.hidden)');if(!panel)return;const f=Array.from(panel.querySelectorAll('.igm-action-btn,.igm-toggle,input[type="range"]'));f.forEach((el,i)=>el.classList.toggle('gp-focused-item',i===igmFocusIdx2));}
function igmGpNavHandle(up,down,left,right,pressA,pressB){
  if(pressB){closeIngameMenu2();return;}
  const tabs=Array.from(document.querySelectorAll('.igm-tab'));const ai=tabs.findIndex(t=>t.classList.contains('active'));
  if(left&&ai>0)tabs[ai-1].click();if(right&&ai<tabs.length-1)tabs[ai+1].click();
  const panel=document.querySelector('.igm-panel:not(.hidden)');if(!panel)return;
  const f=Array.from(panel.querySelectorAll('.igm-action-btn,.igm-toggle,input[type="range"]'));if(!f.length)return;
  if(up)igmFocusIdx2=Math.max(0,igmFocusIdx2-1);if(down)igmFocusIdx2=Math.min(f.length-1,igmFocusIdx2+1);
  updateIGMFocus2();
  if(pressA){const el=f[igmFocusIdx2];if(el?.tagName==='BUTTON'){el.click();}else if(el?.type==='range'){el.value=Math.min(100,parseInt(el.value)+10);el.dispatchEvent(new Event('input'));}}
}

// ═══ IGM CODES ═══
const IGM_CODES2={BIGMAC:{reward:50,msg:'+50🍗',type:'nuggets'},HAMBURGUER:{reward:20,msg:'+20🍗',type:'nuggets'},FOGONABRASA:{reward:100,msg:'+100🍗',type:'nuggets'},GORDAOQUERO:{reward:30,msg:'+30🍗',type:'nuggets'},SEMPATROCINIO:{reward:75,msg:'+75🍗',type:'nuggets'},LENDARIO:{reward:200,msg:'+200🍗',type:'nuggets'},GODMODE:{type:'dev_god'},NOSAVE:{type:'dev_nosave'},DEVRESETALL:{type:'dev_reset'}};
function igmRedeemCode2(){
  const input=document.getElementById('igm-code-input'),result=document.getElementById('igm-code-result'),code=input.value.trim().toUpperCase();
  if(!code){result.style.color='#FF4444';result.textContent='⚠ Digite um código!';return;}
  if(code==='GODMODE'){DEV_GODMODE=!DEV_GODMODE;result.style.color='#FFD700';result.textContent=`⚡ IMORTALIDADE: ${DEV_GODMODE?'ATIVADA':'DESATIVADA'}`;document.getElementById('dev-god-status')?.classList.toggle('hidden',!DEV_GODMODE);document.getElementById('god-badge')?.classList.toggle('hidden',!DEV_GODMODE);input.value='';return;}
  if(code==='NOSAVE'){DEV_NOSAVE=!DEV_NOSAVE;result.style.color='#FFD700';result.textContent=`💾 AUTOSAVE: ${DEV_NOSAVE?'DESATIVADO':'ATIVADO'}`;input.value='';return;}
  if(code==='DEVRESETALL'){try{localStorage.removeItem(SAVE_KEY);}catch(e){}result.style.color='#FF4444';result.textContent='🔧 Resetado! Recarregue.';input.value='';return;}
  const save=loadSave();const redeemed=save.redeemed||[];
  if(redeemed.includes(code)){result.style.color='#FFD700';result.textContent='🔁 Já resgatado!';return;}
  const promo=IGM_CODES2[code];if(!promo||promo.type!=='nuggets'){result.style.color='#FF4444';result.textContent='✕ Código inválido!';return;}
  redeemed.push(code);sessionNuggets+=promo.reward;updateHUDNuggets();devSave({redeemed,nuggets:readNuggets()});result.style.color='#44FF88';result.textContent='✔ '+promo.msg;input.value='';
}

// ═══ COLLECT CHEESE ═══
function collectCheese(){
  PEDESTAL2.collected=true;
  document.getElementById('interact-hint').classList.add('hidden');
  // No cutscene — direct finish with toast
  const base=loadSave();
  const ingredients=base.ingredients||[];
  if(!ingredients.includes('cheese'))ingredients.push('cheese');
  devSave({nuggets:(base.nuggets||0)+sessionNuggets+60,currentPhase:3,ingredients,fase2complete:true});
  // Show collection message briefly then navigate
  showCompletionToastF2('🧀 QUEIJO COLETADO!\n+60🍗 · 2/7 ingredientes');
  gState='CUTSCENE';
  setTimeout(()=>{window.location.href='index.html?completed=fase2';},3000);
}

// ═══ GAME OVER / RESTART ═══
function triggerGameOver2(){gState='GAMEOVER';document.getElementById('gameover-overlay').classList.remove('hidden');}
function restartPhase(){window.location.reload();}
function confirmRestart(){document.getElementById('ingame-menu').classList.add('hidden');document.getElementById('confirm-restart').classList.remove('hidden');gState='CONFIRM_RESTART';}
function closeConfirmRestart(){document.getElementById('confirm-restart').classList.add('hidden');document.getElementById('ingame-menu').classList.remove('hidden');gState='INGAME_MENU';}
function goToMenu(){devSave({nuggets:readNuggets()+sessionNuggets});window.location.href='index.html';}

// ═══ CAMERA ═══
let camX=0;
function updateCamera2(){const target=P.x-CW/2+P.w/2;camX+=(target-camX)*.12;camX=Math.max(0,Math.min(MAP_W-CW,camX));}

// ═══ MOBILE ═══
function setupMobile2(){
  const platform=readPlatform(),mc=document.getElementById('mobile-controls');
  const isTouch='ontouchstart'in window||navigator.maxTouchPoints>0;
  const showMobile=platform==='mobile'||isTouch;
  if(mc)mc.classList.toggle('hidden',!showMobile);
  const hud=document.getElementById('hud');if(hud)hud.style.display=showMobile?'none':'';
}

// ═══ PHASE INTRO ═══
function showPhaseIntro2(){
  const el=document.getElementById('phase-intro');if(!el)return;
  el.classList.add('show');
  setTimeout(()=>{el.style.transition='opacity .6s ease';el.style.opacity='0';setTimeout(()=>{el.style.display='none';},700);},2200);
}

// ═══ MAIN LOOP ═══
let lastTS=0;
function loop2(ts){
  requestAnimationFrame(loop2);
  const dt=Math.min(ts-lastTS,50);lastTS=ts;
  pollGamepad();
  applyGamepadInput();
  if(gState==='PLAYING'){
    updatePhysics2(dt);
    updateEnemies2(dt);
    checkInteractables2();
    checkItemUse();
    checkNuggetCollision2();
    updateCloudPlats(dt);
    updateWind(dt);
  }
  if(gState==='PLAYING'||gState==='INVENTORY')updateCamera2();
  updateParticles();

  ctx.clearRect(0,0,CW,CH);
  drawBG2(camX);
  drawGround2(camX);
  drawCloudPlats(camX);
  drawChest(camX);
  drawShopWorld2(camX);
  drawPedestal2(camX);
  drawMapNuggets2(camX);
  enemies2.forEach(e=>drawEnemy2(e,camX));
  drawParticles(camX);
  drawWindWaves(camX);
  drawPlayer2(camX);
  // Vignette
  const vig=ctx.createRadialGradient(CW/2,CH/2,CW*.25,CW/2,CH/2,CW*.8);
  vig.addColorStop(0,'rgba(0,0,0,0)');vig.addColorStop(1,'rgba(0,0,0,.45)');
  ctx.fillStyle=vig;ctx.fillRect(0,0,CW,CH);
}

// ═══ INIT ═══
function init2(){
  const s=readSettings();
  if(s.fullscreen)document.documentElement.requestFullscreen?.().catch(()=>{});
  GP.showIcons=s.showGamepadIcons!==false;
  sessionNuggets=0;
  updateHUDLives();updateHUDNuggets();updateInventoryUI();
  initBG2();initAmbients2();
  spawnEnemies2();spawnMapNuggets2();initCloudPlats();
  preloadEnemyImgs2();
  setupInput2();setupMobile2();
  if(typeof musicPlayGame==='function'){musicSyncSettings?.();musicPlayGame();}
  showPhaseIntro2();
  document.getElementById('igm-code-input')?.addEventListener('keydown',e=>{if(e.key==='Enter')igmRedeemCode2();});
  document.addEventListener('keydown',e=>{if((e.key==='q'||e.key==='Q')&&(gState==='PLAYING'||gState==='INVENTORY'))toggleInventoryPanel();});
  requestAnimationFrame(ts=>{lastTS=ts;requestAnimationFrame(loop2);});
}
window.addEventListener('DOMContentLoaded',init2);

// ═══ SFX ═══
let f2AudioCtx=null;
function f2GetAudio(){if(!f2AudioCtx)try{f2AudioCtx=new(window.AudioContext||window.webkitAudioContext)();}catch(e){}return f2AudioCtx;}
function f2IsMuted(){return!!(readSettings().mute);}
function f2Vol(){return((readSettings().sfxVol??80)/100)*.9;}
function sfxClick(){if(f2IsMuted())return;const ac=f2GetAudio();if(!ac)return;const o=ac.createOscillator(),g=ac.createGain();o.connect(g);g.connect(ac.destination);o.type='square';o.frequency.setValueAtTime(520,ac.currentTime);o.frequency.exponentialRampToValueAtTime(260,ac.currentTime+0.08);g.gain.setValueAtTime(f2Vol()*.18,ac.currentTime);g.gain.exponentialRampToValueAtTime(0.001,ac.currentTime+0.1);o.start();o.stop(ac.currentTime+0.12);}
function sfxHover(){if(f2IsMuted())return;const ac=f2GetAudio();if(!ac)return;const o=ac.createOscillator(),g=ac.createGain();o.connect(g);g.connect(ac.destination);o.type='square';o.frequency.value=380;g.gain.setValueAtTime(f2Vol()*.07,ac.currentTime);g.gain.exponentialRampToValueAtTime(0.001,ac.currentTime+0.06);o.start();o.stop(ac.currentTime+0.07);}
function sfxBack(){if(f2IsMuted())return;const ac=f2GetAudio();if(!ac)return;const o=ac.createOscillator(),g=ac.createGain();o.connect(g);g.connect(ac.destination);o.type='square';o.frequency.setValueAtTime(260,ac.currentTime);o.frequency.exponentialRampToValueAtTime(130,ac.currentTime+0.1);g.gain.setValueAtTime(f2Vol()*.15,ac.currentTime);g.gain.exponentialRampToValueAtTime(0.001,ac.currentTime+0.12);o.start();o.stop(ac.currentTime+0.14);}
function sfxBuy(){if(f2IsMuted())return;const ac=f2GetAudio();if(!ac)return;[261.63,329.63,392].forEach((freq,i)=>{const o=ac.createOscillator(),g=ac.createGain();o.connect(g);g.connect(ac.destination);o.type='square';o.frequency.value=freq;const t=ac.currentTime+i*.09;g.gain.setValueAtTime(f2Vol()*.15,t);g.gain.exponentialRampToValueAtTime(0.001,t+0.12);o.start(t);o.stop(t+0.14);});}
function sfxNugget(){if(f2IsMuted())return;const ac=f2GetAudio();if(!ac)return;const o=ac.createOscillator(),g=ac.createGain();o.connect(g);g.connect(ac.destination);o.type='square';o.frequency.setValueAtTime(660,ac.currentTime);o.frequency.exponentialRampToValueAtTime(880,ac.currentTime+0.06);g.gain.setValueAtTime(f2Vol()*.15,ac.currentTime);g.gain.exponentialRampToValueAtTime(0.001,ac.currentTime+0.1);o.start();o.stop(ac.currentTime+0.11);}

function hookF2Sounds(){document.querySelectorAll('.shop-buy-btn,.igm-action-btn,.igm-redeem-btn,.igm-tab,.go-btn,.confirm-yes,.hud-menu-btn,#cutscene-prev,#cutscene-next').forEach(btn=>{if(btn.dataset.sh)return;btn.dataset.sh='1';btn.addEventListener('mouseenter',()=>sfxHover());btn.addEventListener('click',()=>sfxClick());});document.querySelectorAll('#shop-close,.igm-close,.confirm-no,.go-btn-sec').forEach(btn=>{if(btn.dataset.bh)return;btn.dataset.bh='1';btn.addEventListener('click',()=>sfxBack());});}
window.addEventListener('load',hookF2Sounds);
document.addEventListener('click',()=>setTimeout(hookF2Sounds,40),{once:false,passive:true});