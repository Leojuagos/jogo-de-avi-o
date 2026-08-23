const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const menuOverlay = document.getElementById('menuOverlay');
const resultOverlay = document.getElementById('resultOverlay');
const settingsOverlay = document.getElementById('settingsOverlay');
const settingsHome = document.getElementById('settingsHome');
const aviaryPage = document.getElementById('aviaryPage');
const pauseOverlay = document.getElementById('pauseOverlay');
const startButton = document.getElementById('startButton');
const settingsButton = document.getElementById('settingsButton');
const exitButton = document.getElementById('exitButton');
const settingsBackButton = document.getElementById('settingsBackButton');
const aviaryButton = document.getElementById('aviaryButton');
const aviaryBackButton = document.getElementById('aviaryBackButton');
const settingsSoundButton = document.getElementById('settingsSoundButton');
const restartButton = document.getElementById('restartButton');
const resultMenuButton = document.getElementById('resultMenuButton');
const scoresButton = document.getElementById('scoresButton');
const scoreboard = document.getElementById('scoreboard');
const highScoreValue = document.getElementById('highScoreValue');
const scoreList = document.getElementById('scoreList');
const settingsHighScoreValue = document.getElementById('settingsHighScoreValue');
const settingsScoreList = document.getElementById('settingsScoreList');
const resumeButton = document.getElementById('resumeButton');
const pauseRestartButton = document.getElementById('pauseRestartButton');
const menuButton = document.getElementById('menuButton');
const soundButton = document.getElementById('soundButton');
const fullscreenButton = document.getElementById('fullscreenButton');
const minimizeButton = document.getElementById('minimizeButton');
const scoreValue = document.getElementById('scoreValue');
const waveValue = document.getElementById('waveValue');
const altitudeValue = document.getElementById('altitudeValue');
const reticle = document.getElementById('reticle');
const aircraftImages = {
  player: { image: new Image(), rotation: 0, width: 54, height: 92 },
  mig35: { image: new Image(), rotation: Math.PI / 2, width: 96, height: 60 },
  su57: { image: new Image(), rotation: Math.PI * 2, width: 120, height: 80 },
  b2: { image: new Image(), rotation: 0, width: 150, height: 90 }
};
aircraftImages.player.image.src = 'f16.png';
aircraftImages.mig35.image.src = 'mig35.png';
aircraftImages.su57.image.src = 'su57.png';
aircraftImages.b2.image.src = 'b2.png';

let width = 0, height = 0, lastTime = 0, animationId;
let gameState = 'menu', score = 0, health = 100, wave = 1, waveKills = 0, spawnTimer = 0, enemyId = 0;
let soundEnabled = true, audioContext;
let player, bullets = [], enemyBullets = [], enemies = [], powerUps = [], particles = [], clouds = [], keys = {};
const touch = { left:false, right:false, fire:false };
const combatLane = { margin: .24, edge: 30 };
let powerUpTimer = 8, waveDelay = 0;
let boss = null;

function initAudio() {
  if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
  if (audioContext.state === 'suspended') audioContext.resume();
}
function playTone(frequency, duration, type='square', volume=.04, endFrequency=frequency) {
  if (!soundEnabled || !audioContext) return;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), audioContext.currentTime + duration);
  gain.gain.setValueAtTime(volume, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(.001, audioContext.currentTime + duration);
  oscillator.connect(gain).connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + duration);
}
function playNoise(duration=.18, volume=.08) {
  if (!soundEnabled || !audioContext) return;
  const buffer = audioContext.createBuffer(1, audioContext.sampleRate * duration, audioContext.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i=0; i<data.length; i++) data[i] = (Math.random()*2-1) * (1-i/data.length);
  const source = audioContext.createBufferSource();
  const gain = audioContext.createGain();
  source.buffer = buffer;
  gain.gain.value = volume;
  source.connect(gain).connect(audioContext.destination);
  source.start();
}

function resize() { const ratio = Math.min(window.devicePixelRatio || 1, 2); width = canvas.clientWidth; height = canvas.clientHeight; canvas.width = width * ratio; canvas.height = height * ratio; ctx.setTransform(ratio,0,0,ratio,0,0); if (player) { player.y = height - 105; updateReticle(); } }
window.addEventListener('resize', resize); resize();

function resetGame() { score=0; health=100; wave=1; waveKills=0; spawnTimer=0; waveDelay=0; powerUpTimer=8; boss=null; bullets=[]; enemyBullets=[]; enemies=[]; powerUps=[]; particles=[]; player={x:width/2,y:height-105,w:42,h:58,cooldown:0,shield:0,overload:0,overheated:0,timeSinceShot:1}; clouds=Array.from({length:8},(_,i)=>({x:(i*173)%width,y:30+(i*91)%(height*.72),s:.5+(i%3)*.22,speed:5+i%4})); updateHud(); }
function updateHud() { scoreValue.textContent=String(score).padStart(6,'0'); waveValue.textContent=`0${wave} / 05`; altitudeValue.textContent=(3200 + Math.floor(score/5)).toLocaleString('pt-BR'); }
function getScores() { try { return JSON.parse(localStorage.getItem('skyRaidersScores') || '[]'); } catch { return []; } }
function saveScore() { try { const scores=[...getScores(),score].sort((first,second)=>second-first).slice(0,5); localStorage.setItem('skyRaidersScores',JSON.stringify(scores)); } catch {} }
function updateScoreboard() { const scores=getScores(); const highScore=String(scores[0] || 0).padStart(6,'0'); const scoreMarkup=scores.length?scores.map((value,index)=>`<li><span>${String(index+1).padStart(2,'0')}</span><strong>${String(value).padStart(6,'0')}</strong></li>`).join(''):'<li class="empty-score">NENHUMA PONTUAÇÃO</li>'; highScoreValue.textContent=highScore; scoreList.innerHTML=scoreMarkup; settingsHighScoreValue.textContent=highScore; settingsScoreList.innerHTML=scoreMarkup; }
function startGame() { resetGame(); gameState='playing'; menuOverlay.classList.add('hidden'); settingsOverlay.classList.add('hidden'); resultOverlay.classList.add('hidden'); scoreboard.classList.add('hidden'); pauseOverlay.classList.add('hidden'); reticle.style.display='block'; updateReticle(); lastTime=performance.now(); cancelAnimationFrame(animationId); animationId=requestAnimationFrame(loop); }
function openSettings() { updateScoreboard(); settingsOverlay.classList.remove('hidden'); settingsHome.classList.remove('hidden'); aviaryPage.classList.add('hidden'); }
function closeSettings() { settingsOverlay.classList.add('hidden'); }
function updateSettingsSound() { settingsSoundButton.querySelector('span').textContent=`SOM: ${soundEnabled?'ON':'OFF'}`; }
function openAviary() { settingsHome.classList.add('hidden'); aviaryPage.classList.remove('hidden'); }
function exitGame() { window.close(); setTimeout(() => { if (!window.closed) window.location.replace('about:blank'); }, 100); }
function togglePause() { if(gameState==='playing'){gameState='paused';pauseOverlay.classList.remove('hidden');reticle.style.display='none';}else if(gameState==='paused'){gameState='playing';pauseOverlay.classList.add('hidden');reticle.style.display='block';lastTime=performance.now();animationId=requestAnimationFrame(loop);} }
function returnToMenu() { gameState='menu';cancelAnimationFrame(animationId);pauseOverlay.classList.add('hidden');resultOverlay.classList.add('hidden');menuOverlay.classList.remove('hidden');reticle.style.display='none'; }
function finishGame(won) { gameState=won?'won':'lost'; saveScore(); updateScoreboard(); document.getElementById('resultEyebrow').textContent=won?'RELATÓRIO DE MISSÃO':'SINAL PERDIDO'; document.getElementById('resultTitle').textContent=won?'MISSÃO CUMPRIDA':'AVIÃO ABATIDO'; document.getElementById('resultText').textContent=won?'Cinco ondas destruídas. O céu pertence à sua esquadrilha.':'Sua aeronave não conseguiu romper a formação inimiga.'; document.getElementById('finalScore').textContent=String(score).padStart(6,'0'); resultOverlay.classList.remove('hidden'); reticle.style.display='none'; }

function getCombatBounds() { const margin = Math.max(combatLane.edge, width * combatLane.margin); return { min:margin, max:width-margin }; }
function updateReticle() {
  if (!player) return;
  const alignedEnemy = enemies
    .filter(enemy => Math.abs(enemy.x - player.x) < Math.max(18, enemy.w * .72) && enemy.y < player.y)
    .sort((first, second) => second.y - first.y)[0];
  const targetX = player.x;
  const targetY = alignedEnemy ? alignedEnemy.y : player.y;
  reticle.style.left = `${targetX}px`;
  reticle.style.top = `${targetY}px`;
  reticle.classList.toggle('locked', Boolean(alignedEnemy));
}
function spawnEnemy() { const type = wave > 1 && Math.random() > .78 ? 'ace' : 'fighter'; const bounds = getCombatBounds(); enemies.push({id:enemyId++,x:bounds.min+Math.random()*(bounds.max-bounds.min),y:-55,w:type==='ace'?50:38,h:type==='ace'?66:53,speed:55+wave*8+Math.random()*35,type,hp:type==='ace'?2:1,phase:Math.random()*7}); }
function spawnPowerUp() { const bounds = getCombatBounds(); powerUps.push({x:bounds.min+Math.random()*(bounds.max-bounds.min),y:-25,speed:85,rotation:0}); }
function spawnBoss() { if(enemies.length>0) return; const bounds = getCombatBounds(); boss={x:(bounds.min+bounds.max)/2,y:-90,w:150,h:90,speed:42,hp:30,maxHp:30,phase:0,ammo:3,maxAmmo:3,shotTimer:3,reloadTimer:0}; enemies=[]; playTone(90,.5,'sawtooth',.08,45); }
function bossShoot() { const speed=300, angle=15*Math.PI/180, origin={x:boss.x,y:boss.y+55}; enemyBullets.push({x:origin.x,y:origin.y,vx:0,vy:speed},{x:origin.x,y:origin.y,vx:-Math.sin(angle)*speed,vy:Math.cos(angle)*speed},{x:origin.x,y:origin.y,vx:Math.sin(angle)*speed,vy:Math.cos(angle)*speed}); playTone(120,.12,'square',.05,70); }
function getWaveTarget() { return 5 + wave; }
function shoot() { if (player.cooldown>0||player.overheated>0) return; bullets.push({x:player.x,y:player.y-30,speed:620,vx:0}); player.cooldown=.22; player.timeSinceShot=0; player.overload=Math.min(100,player.overload+9); if(player.overload>=100) player.overheated=3; playTone(170, .09, 'square', .035, 80); }
function findBulletTarget(bullet) {
  const targets = enemies
    .filter(enemy => enemy.y < bullet.y - 8 && Math.abs(enemy.x - bullet.x) < 150)
    .sort((first, second) => Math.abs(first.x - bullet.x) - Math.abs(second.x - bullet.x));
  if (boss && boss.y < bullet.y - 8 && Math.abs(boss.x - bullet.x) < 150) targets.push(boss);
  return targets.sort((first, second) => Math.abs(first.x - bullet.x) - Math.abs(second.x - bullet.x))[0];
}
function burst(x,y,color,count=10) { for(let i=0;i<count;i++){const a=Math.random()*Math.PI*2,s=35+Math.random()*130; particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:.35+Math.random()*.45,color,size:2+Math.random()*3});} }
function hitPlayer() { if(player.shield>0){player.shield=0;burst(player.x,player.y,'#75c9d8',22);playTone(520,.18,'sine',.06,180);return;} health-=25; burst(player.x,player.y,'#e5ae50',16); playNoise(.24, .1); playTone(110, .24, 'sawtooth', .06, 45); updateHud(); if(health<=0) finishGame(false); }
function update(dt) { if(gameState!=='playing') return; const move = (keys.ArrowLeft||keys.a||touch.left?-1:0)+(keys.ArrowRight||keys.d||touch.right?1:0); const verticalMove = (keys.w||keys.W?-1:0)+(keys.s||keys.S?1:0); const bounds = getCombatBounds(); player.x += move*300*dt; player.x=Math.max(bounds.min,Math.min(bounds.max,player.x)); player.y += verticalMove*240*dt; player.y=Math.max(90,Math.min(height-65,player.y)); player.cooldown=Math.max(0,player.cooldown-dt); player.timeSinceShot+=dt; const coolingRate=player.overheated>0?54.6:28.6; if(player.timeSinceShot>.25) player.overload=Math.max(0,player.overload-coolingRate*dt); if(player.overheated>0) player.overheated=Math.max(0,player.overheated-dt); if(keys[' ']||touch.fire) shoot(); if(waveDelay>0) waveDelay=Math.max(0,waveDelay-dt); spawnTimer-=dt; if(wave===5&&waveKills>=getWaveTarget()&&!boss) spawnBoss(); if(!boss&&waveDelay<=0&&waveKills<getWaveTarget()&&spawnTimer<=0){spawnEnemy(); spawnTimer=Math.max(.38,1.15-wave*.1);}
  for(const cloud of clouds){ cloud.y+=cloud.speed*dt; if(cloud.y>height+80){cloud.y=-60;cloud.x=Math.random()*width;} }
  bullets.forEach(b=>{
    const target = findBulletTarget(b);
    if (target) {
      const desiredVx = Math.max(-150, Math.min(150, (target.x - b.x) * 2.2));
      const maxChange = 260 * dt;
      b.vx += Math.max(-maxChange, Math.min(maxChange, desiredVx - b.vx));
    } else {
      b.vx *= Math.max(0, 1 - 4 * dt);
    }
    b.x += b.vx * dt;
    b.y -= b.speed * dt;
  }); bullets=bullets.filter(b=>b.y>-30);
  powerUpTimer-=dt; if(powerUpTimer<=0){spawnPowerUp();powerUpTimer=12+Math.random()*8;}
  enemies.forEach(e=>{e.y+=e.speed*dt;e.x+=Math.sin(e.phase+e.y*.012)*18*dt;e.x=Math.max(bounds.min,Math.min(bounds.max,e.x));});
  if(boss){if(boss.reloadTimer>0){boss.reloadTimer-=dt;if(boss.reloadTimer<=0){boss.reloadTimer=0;boss.ammo=boss.maxAmmo;boss.shotTimer=0;}}else{boss.y=Math.min(150,boss.y+boss.speed*dt);boss.phase+=dt;boss.x+=(Math.sin(boss.phase*.9)*70)*dt;boss.x=Math.max(bounds.min,Math.min(bounds.max,boss.x));boss.shotTimer-=dt;if(boss.shotTimer<=0&&boss.ammo>0){bossShoot();boss.ammo--;boss.shotTimer=3;if(boss.ammo===0)boss.reloadTimer=5;}}}
  powerUps.forEach(powerUp=>{powerUp.y+=powerUp.speed*dt;powerUp.rotation+=dt*4;});
  for(let i=powerUps.length-1;i>=0;i--){const powerUp=powerUps[i];if(powerUp.y>height+30){powerUps.splice(i,1);continue;}if(Math.abs(powerUp.x-player.x)<28&&Math.abs(powerUp.y-player.y)<45){powerUps.splice(i,1);player.shield=1;burst(player.x,player.y,'#75c9d8',14);playTone(760,.16,'sine',.05,1040);}}
  enemyBullets.forEach(b=>{b.x+=b.vx*dt;b.y+=b.vy*dt;});enemyBullets=enemyBullets.filter(b=>b.y<height+30);for(let i=enemyBullets.length-1;i>=0;i--){const b=enemyBullets[i];if(Math.abs(b.x-player.x)<18&&Math.abs(b.y-player.y)<35){enemyBullets.splice(i,1);hitPlayer();}}
  for(let i=enemies.length-1;i>=0;i--){const e=enemies[i]; if(e.y>height+50){enemies.splice(i,1);hitPlayer();continue;} if(Math.abs(e.x-player.x)<(e.w+player.w)*.34&&Math.abs(e.y-player.y)<(e.h+player.h)*.35){enemies.splice(i,1);hitPlayer();}}
  for(let i=bullets.length-1;i>=0;i--){
    const bullet=bullets[i];
    if(boss&&Math.abs(bullet.x-boss.x)<boss.w*.48&&Math.abs(bullet.y-boss.y)<boss.h*.45){
      if(boss.reloadTimer>0){bullets.splice(i,1);burst(bullet.x,bullet.y,'#75c9d8',5);continue;}
      bullets.splice(i,1);boss.hp--;burst(bullet.x,bullet.y,'#f1c16a',7);playTone(280,.08,'triangle',.04,120);
      if(boss.hp<=0){score+=1500;burst(boss.x,boss.y,'#d85e3f',45);playNoise(.5,.12);playTone(80,.5,'sawtooth',.08,25);boss=null;finishGame(true);return;}
      continue;
    }
    for(let j=enemies.length-1;j>=0;j--){
      const enemy=enemies[j];
      const hitWidth=enemy.type==='ace'?34:27;
      const hitHeight=enemy.type==='ace'?44:35;
      if(Math.abs(bullet.x-enemy.x)>=hitWidth||Math.abs(bullet.y-enemy.y)>=hitHeight) continue;
      bullets.splice(i,1);enemy.hp--;burst(bullet.x,bullet.y,'#f1c16a',5);playTone(280,.08,'triangle',.04,120);
      if(enemy.hp<=0){score+=enemy.type==='ace'?250:100;waveKills++;enemies.splice(j,1);burst(enemy.x,enemy.y,'#d85e3f',18);playNoise(.16,.07);playTone(150,.2,'sawtooth',.05,35);}
      break;
    }
  }
  particles.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=70*dt;p.life-=dt;});particles=particles.filter(p=>p.life>0);
  if(wave<5&&waveKills>=getWaveTarget()&&enemies.length===0&&waveDelay<=0){wave++;waveKills=0;waveDelay=2.5;spawnTimer=waveDelay;updateHud();}
  updateReticle();
}
function drawBackground() { const sky=ctx.createLinearGradient(0,0,0,height);sky.addColorStop(0,'#4a7186');sky.addColorStop(.5,'#80a9ae');sky.addColorStop(1,'#d0c18e');ctx.fillStyle=sky;ctx.fillRect(0,0,width,height);const bounds=getCombatBounds();ctx.fillStyle='rgba(16,48,56,.12)';ctx.fillRect(bounds.min,0,bounds.max-bounds.min,height);ctx.strokeStyle='rgba(239,235,209,.22)';ctx.setLineDash([8,14]);ctx.beginPath();ctx.moveTo(bounds.min,0);ctx.lineTo(bounds.min,height);ctx.moveTo(bounds.max,0);ctx.lineTo(bounds.max,height);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='rgba(255,230,171,.2)';ctx.beginPath();ctx.arc(width*.79,height*.2,75,0,Math.PI*2);ctx.fill(); clouds.forEach(c=>{ctx.save();ctx.translate(c.x,c.y);ctx.scale(c.s,c.s);ctx.fillStyle='rgba(239,235,209,.23)';ctx.beginPath();ctx.ellipse(0,0,74,18,0,0,Math.PI*2);ctx.ellipse(-32,2,35,13,0,0,Math.PI*2);ctx.ellipse(32,-4,37,17,0,0,Math.PI*2);ctx.fill();ctx.restore();}); }
function drawPlane(x,y,scale,color,model='player'){ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);ctx.lineJoin='round';
  const aircraft=aircraftImages[model];
  if(aircraft && aircraft.image.complete && aircraft.image.naturalWidth>0){ctx.rotate(aircraft.rotation);ctx.drawImage(aircraft.image,-aircraft.width/2,-aircraft.height/2,aircraft.width,aircraft.height);ctx.restore();return;}
  const enemy=model!=='player';
  const bodyGradient=ctx.createLinearGradient(-30,0,30,0);bodyGradient.addColorStop(0,enemy?'#202f38':'#1d3c49');bodyGradient.addColorStop(.5,color);bodyGradient.addColorStop(1,enemy?'#18262e':'#35616d');
  ctx.fillStyle=bodyGradient;ctx.beginPath();
  if(model==='player'){
    ctx.moveTo(0,-42);ctx.lineTo(4,-29);ctx.lineTo(7,-17);ctx.lineTo(29,-7);ctx.lineTo(34,3);ctx.lineTo(10,1);ctx.lineTo(6,13);ctx.lineTo(9,29);ctx.lineTo(4,27);ctx.lineTo(0,20);ctx.lineTo(-4,27);ctx.lineTo(-9,29);ctx.lineTo(-6,13);ctx.lineTo(-10,1);ctx.lineTo(-34,3);ctx.lineTo(-29,-7);ctx.lineTo(-7,-17);ctx.lineTo(-4,-29);ctx.closePath();
  }else if(model==='su57'){
    ctx.moveTo(0,-46);ctx.lineTo(8,-34);ctx.lineTo(43,-15);ctx.lineTo(48,-5);ctx.lineTo(20,-8);ctx.lineTo(30,8);ctx.lineTo(39,28);ctx.lineTo(27,34);ctx.lineTo(10,20);ctx.lineTo(7,43);ctx.lineTo(2,37);ctx.lineTo(0,27);ctx.lineTo(-2,37);ctx.lineTo(-7,43);ctx.lineTo(-10,20);ctx.lineTo(-27,34);ctx.lineTo(-39,28);ctx.lineTo(-30,8);ctx.lineTo(-20,-8);ctx.lineTo(-48,-5);ctx.lineTo(-43,-15);ctx.lineTo(-8,-34);ctx.closePath();
  }else{
    ctx.moveTo(0,-40);ctx.lineTo(7,-26);ctx.lineTo(31,-14);ctx.lineTo(40,-3);ctx.lineTo(15,-5);ctx.lineTo(12,9);ctx.lineTo(28,29);ctx.lineTo(18,35);ctx.lineTo(6,21);ctx.lineTo(4,40);ctx.lineTo(0,35);ctx.lineTo(-4,40);ctx.lineTo(-6,21);ctx.lineTo(-18,35);ctx.lineTo(-28,29);ctx.lineTo(-12,9);ctx.lineTo(-15,-5);ctx.lineTo(-40,-3);ctx.lineTo(-31,-14);ctx.lineTo(-7,-26);ctx.closePath();
  }ctx.fill();
  ctx.fillStyle=enemy?'#4d5960':'#5b6874';ctx.beginPath();ctx.moveTo(-5,-27);ctx.lineTo(5,-27);ctx.lineTo(7,25);ctx.lineTo(0,38);ctx.lineTo(-7,25);ctx.closePath();ctx.fill();
  if(model==='player'){ctx.fillStyle='#253541';ctx.beginPath();ctx.moveTo(-8,-13);ctx.lineTo(8,-13);ctx.lineTo(5,3);ctx.lineTo(-5,3);ctx.closePath();ctx.fill();ctx.fillStyle='#9caeb5';ctx.beginPath();ctx.ellipse(0,-22,3.5,8,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#161f27';ctx.fillRect(-3,18,6,9);}
  if(model==='mig35'){ctx.fillStyle='#263940';ctx.fillRect(-20,5,9,17);ctx.fillRect(11,5,9,17);ctx.fillStyle='#b8c6c9';ctx.fillRect(-17,23,6,9);ctx.fillRect(11,23,6,9);ctx.fillStyle='#d9e2e2';ctx.beginPath();ctx.moveTo(-14,-10);ctx.lineTo(-5,-15);ctx.lineTo(-5,1);ctx.lineTo(-18,-1);ctx.closePath();ctx.fill();ctx.beginPath();ctx.moveTo(14,-10);ctx.lineTo(5,-15);ctx.lineTo(5,1);ctx.lineTo(18,-1);ctx.closePath();ctx.fill();}
  if(model==='su57'){ctx.fillStyle='#202d34';ctx.fillRect(-23,7,11,18);ctx.fillRect(12,7,11,18);ctx.fillStyle='#78848a';ctx.beginPath();ctx.moveTo(-15,-7);ctx.lineTo(-5,-15);ctx.lineTo(-5,3);ctx.lineTo(-20,0);ctx.closePath();ctx.fill();ctx.beginPath();ctx.moveTo(15,-7);ctx.lineTo(5,-15);ctx.lineTo(5,3);ctx.lineTo(20,0);ctx.closePath();ctx.fill();ctx.fillStyle='#303d43';ctx.beginPath();ctx.moveTo(-27,-12);ctx.lineTo(-8,-25);ctx.lineTo(-10,-7);ctx.lineTo(-30,-4);ctx.closePath();ctx.fill();ctx.beginPath();ctx.moveTo(27,-12);ctx.lineTo(8,-25);ctx.lineTo(10,-7);ctx.lineTo(30,-4);ctx.closePath();ctx.fill();}
  if(enemy){ctx.strokeStyle=model==='mig35'?'rgba(53,71,78,.42)':'rgba(190,201,199,.28)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(-6,-8);ctx.lineTo(-6,16);ctx.moveTo(6,-8);ctx.lineTo(6,16);ctx.stroke();}
  ctx.restore();
}
function drawPlayerBars(){const barWidth=58,barHeight=5,barX=player.x-barWidth/2,barY=player.y+57;ctx.fillStyle='rgba(16,39,49,.75)';ctx.fillRect(barX,barY,barWidth,barHeight);ctx.fillStyle='#d85e3f';ctx.fillRect(barX,barY,barWidth*Math.max(0,health/100),barHeight);ctx.fillStyle='rgba(16,39,49,.75)';ctx.fillRect(barX,barY+8,barWidth,barHeight);ctx.fillStyle=player.overheated>0?'#d85e3f':'#d6c35b';ctx.fillRect(barX,barY+8,barWidth*(player.overload/100),barHeight);}
function draw() {drawBackground();powerUps.forEach(powerUp=>{ctx.save();ctx.translate(powerUp.x,powerUp.y);ctx.rotate(powerUp.rotation);ctx.fillStyle='#75c9d8';ctx.shadowBlur=14;ctx.shadowColor='#75c9d8';ctx.fillRect(-10,-10,20,20);ctx.fillStyle='#173c4c';ctx.fillRect(-3,-8,6,16);ctx.fillRect(-8,-3,16,6);ctx.restore();});enemyBullets.forEach(b=>{ctx.fillStyle='#d85e3f';ctx.shadowBlur=12;ctx.shadowColor='#d85e3f';ctx.fillRect(b.x-4,b.y-8,8,16);ctx.shadowBlur=0;});bullets.forEach(b=>{ctx.fillStyle='#ffe4a5';ctx.shadowBlur=12;ctx.shadowColor='#ffba46';ctx.fillRect(b.x-2,b.y-12,4,18);ctx.shadowBlur=0;});enemies.forEach(e=>drawPlane(e.x,e.y,e.type==='ace'?1.25:1,e.type==='ace'?'#5c666b':'#b5c2c5',e.type==='ace'?'su57':'mig35'));if(boss){if(boss.reloadTimer>0){ctx.strokeStyle='#75c9d8';ctx.lineWidth=4;ctx.shadowBlur=18;ctx.shadowColor='#75c9d8';ctx.beginPath();ctx.arc(boss.x,boss.y,70,0,Math.PI*2);ctx.stroke();ctx.shadowBlur=0;}drawPlane(boss.x,boss.y,1.5,'#5c666b','b2');ctx.fillStyle='rgba(16,39,49,.75)';ctx.fillRect(boss.x-55,boss.y-75,110,7);ctx.fillStyle='#d85e3f';ctx.fillRect(boss.x-55,boss.y-75,110*(boss.hp/boss.maxHp),7);}if(player){if(player.shield>0){ctx.strokeStyle='#75c9d8';ctx.lineWidth=3;ctx.shadowBlur=16;ctx.shadowColor='#75c9d8';ctx.beginPath();ctx.arc(player.x,player.y,43,0,Math.PI*2);ctx.stroke();ctx.shadowBlur=0;}drawPlane(player.x,player.y,1.35,'#3e4b59','player');drawPlayerBars();}particles.forEach(p=>{ctx.globalAlpha=Math.max(0,p.life/.7);ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,p.size,p.size);});ctx.globalAlpha=1;}
function loop(time){const dt=Math.min((time-lastTime)/1000,.035);lastTime=time;update(dt);draw();if(gameState==='playing')animationId=requestAnimationFrame(loop);}
window.addEventListener('keydown',e=>{keys[e.key]=true;if(e.key==='Escape'){e.preventDefault();togglePause();}if([' ','ArrowLeft','ArrowRight','w','W','s','S'].includes(e.key))e.preventDefault();});window.addEventListener('keyup',e=>{keys[e.key]=false;});
['touchstart','touchend','mousedown','mouseup'].forEach(event=>document.querySelectorAll('[data-control]').forEach(button=>button.addEventListener(event,e=>{e.preventDefault();touch[button.dataset.control]=event==='touchstart'||event==='mousedown';}))); 
startButton.addEventListener('click',()=>{initAudio();startGame();});
exitButton.addEventListener('click',exitGame);
restartButton.addEventListener('click',()=>{initAudio();startGame();});
resultMenuButton.addEventListener('click',returnToMenu);
scoresButton.addEventListener('click',()=>{scoreboard.classList.toggle('hidden');scoresButton.querySelector('b').textContent=scoreboard.classList.contains('hidden')?'▾':'▴';});
resumeButton.addEventListener('click',togglePause);
pauseRestartButton.addEventListener('click',()=>{initAudio();startGame();});
menuButton.addEventListener('click',returnToMenu);
soundButton.addEventListener('click',()=>{soundEnabled=!soundEnabled;soundButton.querySelector('strong').textContent=soundEnabled?'ON':'OFF';if(soundEnabled){initAudio();playTone(440,.1,'sine',.035,660);}});
settingsButton.addEventListener('click',openSettings);
settingsBackButton.addEventListener('click',closeSettings);
aviaryButton.addEventListener('click',openAviary);
aviaryBackButton.addEventListener('click',()=>{aviaryPage.classList.add('hidden');settingsHome.classList.remove('hidden');});
settingsSoundButton.addEventListener('click',()=>{soundEnabled=!soundEnabled;updateSettingsSound();soundButton.querySelector('strong').textContent=soundEnabled?'ON':'OFF';if(soundEnabled){initAudio();playTone(440,.1,'sine',.035,660);}});
async function toggleFullscreen() {
  const gameStage = document.querySelector('.game-stage');
  if (!document.fullscreenElement) await gameStage.requestFullscreen();
  else await document.exitFullscreen();
}
function updateFullscreenLabel() {
  const active = Boolean(document.fullscreenElement);
  fullscreenButton.querySelector('strong').textContent = active ? '↙' : '↗';
  fullscreenButton.setAttribute('aria-label', active ? 'Sair da tela cheia' : 'Ativar tela cheia');
}
fullscreenButton.addEventListener('click', toggleFullscreen);
minimizeButton.addEventListener('click', async () => {
  if (document.fullscreenElement) await document.exitFullscreen();
});
document.addEventListener('fullscreenchange', updateFullscreenLabel);
window.addEventListener('keydown', e => { if (e.key.toLowerCase() === 'f') toggleFullscreen(); });
resetGame(); draw();
