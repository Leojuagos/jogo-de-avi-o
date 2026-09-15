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
const adminButton = document.getElementById('adminButton');
const adminOverlay = document.getElementById('adminOverlay');
const adminPasswordForm = document.getElementById('adminPasswordForm');
const adminPassword = document.getElementById('adminPassword');
const adminError = document.getElementById('adminError');
const adminCancelButton = document.getElementById('adminCancelButton');
const phaseOverlay = document.getElementById('phaseOverlay');
const phaseGrid = document.getElementById('phaseGrid');
const phaseCancelButton = document.getElementById('phaseCancelButton');
const scoreValue = document.getElementById('scoreValue');
const waveValue = document.getElementById('waveValue');
const altitudeValue = document.getElementById('altitudeValue');
const reticle = document.getElementById('reticle');
const aircraftImages = {
  player: { image: new Image(), rotation: 0, width: 54, height: 92 },
  mig35: { image: new Image(), rotation: Math.PI / 2, width: 96, height: 60 },
  su57: { image: new Image(), rotation: Math.PI * 2, width: 120, height: 80 },
  kamikaze: { image: new Image(), rotation: 0, width: 110, height: 76 },
  f15e: { image: new Image(), rotation: 0, width: 150, height: 90 },
  f15ex: { image: new Image(), rotation: 0, width: 150, height: 90 },
  b2: { image: new Image(), rotation: 0, width: 150, height: 90 }
};
aircraftImages.player.image.src = 'f16.png';
aircraftImages.mig35.image.src = 'mig35.png';
aircraftImages.su57.image.src = 'su57.png';
aircraftImages.kamikaze.image.src = 'kamikaze.png';
aircraftImages.f15e.image.src = 'f15E.png';
aircraftImages.f15ex.image.src = 'f15EX.png';
aircraftImages.b2.image.src = 'b2.png';

let width = 0, height = 0, lastTime = 0, animationId;
let gameState = 'menu', score = 0, health = 100, wave = 1, waveKills = 0, spawnTimer = 0, enemyId = 0;
let soundEnabled = true, audioContext;
let player, bullets = [], enemyBullets = [], lasers = [], laserWarnings = [], fallingThreats = [], enemies = [], powerUps = [], particles = [], clouds = [], keys = {};
let waveRoster = [], kamikazeTarget = null, kamikazeShadow = null, kamikazeLineX = null;
const touch = { x:0, y:0, fire:false };
const joystick = document.getElementById('joystick');
const joystickKnob = document.getElementById('joystickKnob');
const combatLane = { margin: .30, edge: 30 };
const bossFuriousSpeed = 1.5;
const bossFuriousSize = 1.25;
const aircraftFlightSpeed = 92;
const aircraftHitboxes = { fighter: { width: 35, height: 39 }, ace: { width: 54, height: 48 }, kamikaze: { width: 48, height: 44 }, boss: { width: 130, height: 70 } };
function isMobileGame() { return width <= 650 || window.matchMedia('(pointer: coarse)').matches; }
function getMobileWaveTarget() { return [0,4,5,5,4,5][wave] || 5; }
function getBossSpeedMultiplier() { return boss?.enraged ? (isMobileGame() ? .85 : bossFuriousSpeed) : 1; }
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

function getResponsiveScale() { return Math.min(1, Math.max(.72, Math.min(width / 900, height / 700))); }
function resize() { const ratio = Math.min(window.devicePixelRatio || 1, 2); width = canvas.clientWidth; height = canvas.clientHeight; canvas.width = width * ratio; canvas.height = height * ratio; ctx.setTransform(ratio,0,0,ratio,0,0); if (player) { player.y = height - 105 * getResponsiveScale(); updateReticle(); } }
window.addEventListener('resize', resize); resize();

function resetGame() { const scale=getResponsiveScale(); score=0; health=100; wave=1; waveKills=0; spawnTimer=0; waveDelay=0; powerUpTimer=8; boss=null; waveRoster=[]; kamikazeTarget=null; kamikazeShadow=null; bullets=[]; enemyBullets=[]; lasers=[]; laserWarnings=[]; fallingThreats=[]; enemies=[]; powerUps=[]; particles=[]; player={x:width/2,y:height-105*scale,w:42*scale,h:58*scale,cooldown:0,shield:0,overload:0,overheated:0,timeSinceShot:1}; clouds=Array.from({length:8},(_,i)=>({x:(i*173)%width,y:30+(i*91)%(height*.72),s:(.5+(i%3)*.22)*scale,speed:5+i%4})); updateHud(); }
function updateHud() { scoreValue.textContent=String(score).padStart(6,'0'); waveValue.textContent=`${String(wave).padStart(2,'0')} / 10`; altitudeValue.textContent=(3200 + Math.floor(score/5)).toLocaleString('pt-BR'); }
function getScores() { try { return JSON.parse(localStorage.getItem('skyRaidersScores') || '[]'); } catch { return []; } }
function saveScore() { try { const scores=[...getScores(),score].sort((first,second)=>second-first).slice(0,5); localStorage.setItem('skyRaidersScores',JSON.stringify(scores)); } catch {} }
function updateScoreboard() { const scores=getScores(); const highScore=String(scores[0] || 0).padStart(6,'0'); const scoreMarkup=scores.length?scores.map((value,index)=>`<li><span>${String(index+1).padStart(2,'0')}</span><strong>${String(value).padStart(6,'0')}</strong></li>`).join(''):'<li class="empty-score">NENHUMA PONTUAÇÃO</li>'; highScoreValue.textContent=highScore; scoreList.innerHTML=scoreMarkup; settingsHighScoreValue.textContent=highScore; settingsScoreList.innerHTML=scoreMarkup; }
function startGame() { resetGame(); gameState='playing'; menuOverlay.classList.add('hidden'); settingsOverlay.classList.add('hidden'); resultOverlay.classList.add('hidden'); scoreboard.classList.add('hidden'); pauseOverlay.classList.add('hidden'); reticle.style.display='block'; updateReticle(); lastTime=performance.now(); cancelAnimationFrame(animationId); animationId=requestAnimationFrame(loop); }
function startAdminPhase(selectedWave) { resetGame(); wave=selectedWave; waveKills=selectedWave===5||selectedWave===10?getWaveTarget():0; waveRoster=[]; gameState='playing'; menuOverlay.classList.add('hidden'); adminOverlay.classList.add('hidden'); phaseOverlay.classList.add('hidden'); resultOverlay.classList.add('hidden'); pauseOverlay.classList.add('hidden'); reticle.style.display='block'; updateHud(); updateReticle(); lastTime=performance.now(); cancelAnimationFrame(animationId); animationId=requestAnimationFrame(loop); }
function openAdmin() { adminOverlay.classList.remove('hidden'); adminPassword.value=''; adminError.textContent=''; adminPassword.focus(); }
function openPhaseMenu() { adminOverlay.classList.add('hidden'); phaseOverlay.classList.remove('hidden'); }
function openSettings() { updateScoreboard(); settingsOverlay.classList.remove('hidden'); settingsHome.classList.remove('hidden'); aviaryPage.classList.add('hidden'); }
function closeSettings() { settingsOverlay.classList.add('hidden'); }
function updateSettingsSound() { settingsSoundButton.querySelector('span').textContent=`SOM: ${soundEnabled?'ON':'OFF'}`; }
function openAviary() { settingsHome.classList.add('hidden'); aviaryPage.classList.remove('hidden'); }
function exitGame() { window.close(); setTimeout(() => { if (!window.closed) window.location.replace('about:blank'); }, 100); }
function togglePause() { if(gameState==='playing'){gameState='paused';pauseOverlay.classList.remove('hidden');reticle.style.display='none';}else if(gameState==='paused'){gameState='playing';pauseOverlay.classList.add('hidden');reticle.style.display='block';lastTime=performance.now();animationId=requestAnimationFrame(loop);} }
function returnToMenu() { gameState='menu';cancelAnimationFrame(animationId);pauseOverlay.classList.add('hidden');resultOverlay.classList.add('hidden');menuOverlay.classList.remove('hidden');reticle.style.display='none'; }
function finishGame(won) { gameState=won?'won':'lost'; saveScore(); updateScoreboard(); document.getElementById('resultEyebrow').textContent=won?'RELATÓRIO DE MISSÃO':'SINAL PERDIDO'; document.getElementById('resultTitle').textContent=won?'MISSÃO CUMPRIDA':'AVIÃO ABATIDO'; document.getElementById('resultText').textContent=won?'Cinco ondas destruídas. O céu pertence à sua esquadrilha.':'Sua aeronave não conseguiu romper a formação inimiga.'; document.getElementById('finalScore').textContent=String(score).padStart(6,'0'); resultOverlay.classList.remove('hidden'); reticle.style.display='none'; }

function getCombatBounds() { const scale=getResponsiveScale(); const margin = Math.max(combatLane.edge * scale, width * (isMobileGame() ? .12 : combatLane.margin)); return { min:margin, max:width-margin }; }
function updateReticle() {
  if (!player) return;
  if (kamikazeTarget) { reticle.style.left=`${kamikazeTarget.x}px`; reticle.style.top=`${kamikazeTarget.y}px`; reticle.classList.add('locked'); return; }
  const alignedEnemy = enemies
    .filter(enemy => Math.abs(enemy.x - player.x) < Math.max(18, enemy.w * .72) && enemy.y < player.y)
    .sort((first, second) => second.y - first.y)[0];
  const targetX = player.x;
  const targetY = alignedEnemy ? alignedEnemy.y : player.y;
  reticle.style.left = `${targetX}px`;
  reticle.style.top = `${targetY}px`;
  reticle.classList.toggle('locked', Boolean(alignedEnemy));
}
function getWaveComposition() { const mobileCompositions={6:['kamikaze','kamikaze','kamikaze','kamikaze'],7:['kamikaze','kamikaze','kamikaze','fighter','fighter','fighter'],8:['kamikaze','kamikaze','fighter','fighter','fighter','ace','ace','ace'],9:['kamikaze','kamikaze','kamikaze','ace','ace','ace'],10:['kamikaze','kamikaze','kamikaze','ace','ace','ace','fighter','fighter']}; const desktopCompositions={6:['kamikaze','kamikaze','kamikaze','kamikaze','kamikaze','kamikaze'],7:['kamikaze','kamikaze','kamikaze','kamikaze','fighter','fighter','fighter','fighter'],8:['kamikaze','kamikaze','kamikaze','fighter','fighter','fighter','fighter','ace','ace','ace','ace'],9:['kamikaze','kamikaze','kamikaze','kamikaze','ace','ace','ace','ace'],10:['kamikaze','kamikaze','kamikaze','ace','ace','ace','fighter','fighter']}; return (isMobileGame()?mobileCompositions:desktopCompositions)[wave] || []; }
function spawnEnemy() { const scale=getResponsiveScale(); if(wave>=6&&waveRoster.length===0){if(enemies.length>0)return;waveRoster=getWaveComposition();} const type = wave >= 6 ? waveRoster.pop() : (wave > 1 && Math.random() > .78 ? 'ace' : 'fighter'); const bounds = getCombatBounds(); const kamikaze=type==='kamikaze'; enemies.push({id:enemyId++,x:bounds.min+Math.random()*(bounds.max-bounds.min),y:-55*scale,w:(type==='ace'?50:type==='kamikaze'?55:38)*scale,h:(type==='ace'?66:type==='kamikaze'?58:53)*scale,speed:aircraftFlightSpeed,type,hp:type==='ace'||kamikaze?2:1,phase:Math.random()*7,state:'flight',climbTimer:0,warningTimer:0,targetX:0}); }
function spawnPowerUp() { const bounds = getCombatBounds(); powerUps.push({x:bounds.min+Math.random()*(bounds.max-bounds.min),y:-25,speed:85,rotation:0}); }
function spawnBoss() { if(enemies.length>0) return; const scale=getResponsiveScale(); const bounds = getCombatBounds(); if(wave===10){const mobileSolo=isMobileGame();boss={mode:'duo',mobileSolo,duoWave:false,nextRetreatOrder:0,returnQueue:[],aircraft:[{id:'f15e',x:width*.36,y:-90*scale,w:150*scale,h:90*scale,speed:42,hp:30,maxHp:30,phase:0,attackStep:0,attackState:'ready',attackCooldown:0,state:'normal',enraged:false},{id:'f15ex',x:width*.64,y:-130*scale,w:150*scale,h:90*scale,speed:42,hp:30,maxHp:30,phase:Math.PI,attackStep:0,attackState:mobileSolo?'waiting':'normal',attackCooldown:0,state:mobileSolo?'waiting':'normal',enraged:false}]};enemies=[];playTone(70,.6,'sawtooth',.1,35);return;} boss={x:(bounds.min+bounds.max)/2,y:-90*scale,w:150*scale,h:90*scale,speed:42,hp:30,maxHp:30,phase:0,attack:0,attackTimer:2,laserLaunchTimer:Infinity,transitionBatch:0,state:'normal',enraged:false}; enemies=[]; playTone(90,.5,'sawtooth',.08,45); }
function spawnDuoIntermission() { const bounds=getCombatBounds(), roster=['kamikaze','kamikaze','kamikaze','kamikaze','ace','ace','ace','ace','fighter','fighter','fighter','fighter']; enemies=[]; roster.forEach((type,index)=>{const scale=getResponsiveScale(),kamikaze=type==='kamikaze';enemies.push({id:enemyId++,x:bounds.min+(bounds.max-bounds.min)*(index+1)/(roster.length+1),y:-55-(index%4)*70,w:50,h:66,speed:aircraftFlightSpeed,type,hp:type==='fighter'?1:2,phase:index,state:'flight',climbProgress:0,climbStartY:0,targetX:0,kamikaze:kamikaze});}); }
function duoAttack(aircraft) { const speed=300,origin={x:aircraft.x,y:aircraft.y+48};aircraft.attackState='active';if(aircraft.id==='f15e'&&aircraft.attackStep===0){const count=aircraft.enraged?7:5;for(let i=-(count-1)/2;i<=(count-1)/2;i++)enemyBullets.push({owner:aircraft.id,type:'basic',x:origin.x,y:origin.y,vx:i*18,vy:speed});aircraft.attackRemaining=1;playTone(120,.2,'square',.06,60);}else if(aircraft.id==='f15e'){const countRockets=aircraft.enraged?8:5;for(let i=0;i<countRockets;i++){const bounds=getCombatBounds();fallingThreats.push({owner:aircraft.id,x:Math.max(bounds.min,Math.min(bounds.max,player.x+(Math.random()-.5)*(aircraft.enraged?180:300))),y:-50-i*45,speed:aircraft.enraged?260:210,phase:i,wobble:aircraft.enraged?30:18});}aircraft.attackRemaining=1;playTone(150,.2,'square',.06,55);}else if(aircraft.attackStep===0){const guided=aircraft.enraged?5:3;for(let i=0;i<guided;i++)enemyBullets.push({owner:aircraft.id,type:'guided',x:origin.x+(i-2)*18,y:origin.y,vx:0,vy:260,life:aircraft.enraged?6:4});aircraft.straightTimer=aircraft.enraged?6:4;aircraft.straightShotTimer=Infinity;aircraft.attackRemaining=aircraft.straightTimer;playTone(180,.18,'sine',.06,80);}else{aircraft.straightTimer=aircraft.enraged?7:5;aircraft.straightShotTimer=0;aircraft.attackRemaining=aircraft.straightTimer;playTone(220,.18,'square',.06,100);} }
function updateDuoAttack(aircraft,dt) { if(aircraft.id!=='f15ex'||!aircraft.straightTimer)return;aircraft.straightTimer-=dt;aircraft.straightShotTimer-=dt;if(aircraft.straightShotTimer<=0){const count=aircraft.enraged?2:1;for(let i=0;i<count;i++){const angle=aircraft.enraged?(i?Math.PI/2:-Math.PI/2):Math.atan2(player.x-aircraft.x,player.y-aircraft.y);enemyBullets.push({owner:aircraft.id,type:'basic',x:aircraft.x,y:aircraft.y+45,vx:Math.sin(angle)*300,vy:Math.cos(angle)*300});}aircraft.straightShotTimer=.5;}if(aircraft.straightTimer<=0)aircraft.straightTimer=0;}
function updateDuoProjectiles(dt) { enemyBullets.forEach(projectile=>{projectile.x+=projectile.vx*dt;projectile.y+=projectile.vy*dt;if(projectile.type==='guided'){projectile.vx+=(player.x-projectile.x)*dt*1.4;projectile.vy+=(player.y-projectile.y)*dt*1.4;}});enemyBullets=enemyBullets.filter(projectile=>projectile.y<height+40&&projectile.x>-40&&projectile.x<width+40);for(let index=enemyBullets.length-1;index>=0;index--){const projectile=enemyBullets[index];if(Math.abs(projectile.x-player.x)<22&&Math.abs(projectile.y-player.y)<35){enemyBullets.splice(index,1);hitPlayer();}}fallingThreats.forEach(threat=>{threat.y+=threat.speed*dt;});fallingThreats=fallingThreats.filter(threat=>threat.y<height+80);for(let index=fallingThreats.length-1;index>=0;index--){const threat=fallingThreats[index];if(Math.abs(threat.x-player.x)<30&&Math.abs(threat.y-player.y)<40){fallingThreats.splice(index,1);hitPlayer();}}}
function duoAttackFinished(aircraft) { return aircraft.attackRemaining<=0&&!enemyBullets.some(projectile=>projectile.owner===aircraft.id)&&!fallingThreats.some(threat=>threat.owner===aircraft.id)&&(!aircraft.straightTimer||aircraft.straightTimer<=0); }
function spawnBossTransitionWave() { const bounds=getCombatBounds(), aircraftCount=isMobileGame()?4:8; for(let index=0;index<aircraftCount;index++){enemies.push({id:enemyId++,x:bounds.min+(bounds.max-bounds.min)*(index+1)/(aircraftCount+1),y:-55-(index%3)*70,w:50,h:66,speed:70+Math.random()*25,type:'ace',hp:2,phase:Math.random()*7});} }
function startBossTransition() { boss.state='retreating'; boss.transitionBatch=1; boss.attackTimer=Infinity; boss.laserLaunchTimer=Infinity; enemyBullets=[]; lasers=[]; laserWarnings=[]; fallingThreats=[]; enemies=[]; spawnBossTransitionWave(); playTone(70,.5,'sawtooth',.08,30); }
function getLaserPositions() { const bounds=getCombatBounds(), count=boss?.enraged?(isMobileGame()?3:4):(isMobileGame()?2:3), spacing=(bounds.max-bounds.min)/(count+1); return Array.from({length:count},(_,index)=>bounds.min+spacing*(index+1)); }
function bossBasicAttack() { const speed=300*getBossSpeedMultiplier(), spread=15*Math.PI/180, origin={x:boss.x,y:boss.y+55}, projectileCount=boss.enraged?(isMobileGame()?3:7):(isMobileGame()?3:5); for(let index=-(projectileCount-1)/2;index<=(projectileCount-1)/2;index++){const angle=spread*index/2;enemyBullets.push({type:'basic',x:origin.x,y:origin.y,vx:Math.sin(angle)*speed,vy:Math.cos(angle)*speed});} playTone(120,.12,'square',.05,70); }
function bossLaserWarning() { laserWarnings=getLaserPositions().map(x=>({x,time:boss.enraged&&isMobileGame()?1.5:boss.enraged?1.5/bossFuriousSpeed:1.5})); playTone(260,.35,'sine',.04,520); }
function bossLaserAttack() { lasers=getLaserPositions().map(x=>({x,time:boss.enraged&&isMobileGame()?.7:boss.enraged?.9/bossFuriousSpeed:.9})); laserWarnings=[]; playTone(90,.28,'sawtooth',.06,45); }
function bossBallAttack() { const bounds=getCombatBounds(), speedMultiplier=getBossSpeedMultiplier(), ballCount=boss.enraged?(isMobileGame()?3:8):(isMobileGame()?4:8), verticalGap=boss.enraged&&isMobileGame()?180:isMobileGame()?145:105; fallingThreats=Array.from({length:ballCount},(_,index)=>({x:bounds.min+(bounds.max-bounds.min)*(index+1)/(ballCount+1),y:-60-index*verticalGap,speed:(145+index%3*18)*speedMultiplier,phase:index*.9,wobble:18})); playTone(170,.2,'square',.05,70); }
function bossFuriousCombo() { enemyBullets=[]; lasers=[]; laserWarnings=[]; fallingThreats=[]; bossBasicAttack(); bossLaserWarning(); bossBallAttack(); boss.laserLaunchTimer=isMobileGame()?1.5:1.5/bossFuriousSpeed; playTone(100,.18,'sawtooth',.04,180); }
function getWaveTarget() { return wave >= 6 ? getWaveComposition().length : isMobileGame() ? getMobileWaveTarget() : wave >= 4 ? wave + 2 : 5 + wave; }
function shoot() { if (player.cooldown>0||player.overheated>0) return; bullets.push({x:player.x,y:player.y-30,speed:620,vx:0}); player.cooldown=.22; player.timeSinceShot=0; player.overload=Math.min(100,player.overload+9); if(player.overload>=100) player.overheated=3; playTone(170, .09, 'square', .035, 80); }
function updateWeaponCooling(dt) { player.timeSinceShot+=dt; const coolingRate=player.overheated>0?54.6:28.6; if(player.timeSinceShot>.25) player.overload=Math.max(0,player.overload-coolingRate*dt); if(player.overheated>0) player.overheated=Math.max(0,player.overheated-dt); }
function findBulletTarget(bullet) {
  const targets = enemies
    .filter(enemy => enemy.y < bullet.y - 8 && Math.abs(enemy.x - bullet.x) < 150)
    .sort((first, second) => Math.abs(first.x - bullet.x) - Math.abs(second.x - bullet.x));
  if (boss && boss.y < bullet.y - 8 && Math.abs(boss.x - bullet.x) < 150) targets.push(boss);
  return targets.sort((first, second) => Math.abs(first.x - bullet.x) - Math.abs(second.x - bullet.x))[0];
}
function burst(x,y,color,count=10) { for(let i=0;i<count;i++){const a=Math.random()*Math.PI*2,s=35+Math.random()*130; particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:.35+Math.random()*.45,color,size:2+Math.random()*3});} }
function kamikazeExplosion(x,y) { burst(x,y,'#f5d27a',32); burst(x,y,'#d85e3f',22); particles.push({x,y,vx:0,vy:0,life:.45,color:'#fff3c4',size:30}); playNoise(.42,.14); playTone(95,.42,'sawtooth',.09,28); }
function hitPlayer(damage=25) { if(player.shield>0){player.shield=0;burst(player.x,player.y,'#75c9d8',22);playTone(520,.18,'sine',.06,180);return;} health-=damage; burst(player.x,player.y,'#e5ae50',16); playNoise(.24, .1); playTone(110, .24, 'sawtooth', .06, 45); updateHud(); if(health<=0) finishGame(false); }
function hitByKamikaze() { if(player.shield>0){player.shield=0;burst(player.x,player.y,'#75c9d8',22);playTone(520,.18,'sine',.06,180);return;} hitPlayer(2); }
function getEnemyHitbox(type) { return aircraftHitboxes[type] || aircraftHitboxes.fighter; }
function update(dt) { if(gameState!=='playing') return; const move = (keys.ArrowLeft||keys.a?-1:0)+(keys.ArrowRight||keys.d?1:0)+touch.x; const verticalMove = (keys.w||keys.W?-1:0)+(keys.s||keys.S?1:0)+touch.y; const bounds = getCombatBounds(); const scale=getResponsiveScale(); const movementMultiplier=isMobileGame()?.75:1; player.x += Math.max(-1,Math.min(1,move))*300*movementMultiplier*dt; player.x=Math.max(bounds.min,Math.min(bounds.max,player.x)); player.y += Math.max(-1,Math.min(1,verticalMove))*240*movementMultiplier*dt; player.y=Math.max(90*scale,Math.min(height-65*scale,player.y)); player.cooldown=Math.max(0,player.cooldown-dt); player.timeSinceShot+=dt; const coolingRate=player.overheated>0?54.6:28.6; if(player.timeSinceShot>.25) player.overload=Math.max(0,player.overload-coolingRate*dt); if(player.overheated>0) player.overheated=Math.max(0,player.overheated-dt); if(keys[' ']||touch.fire) shoot(); if(waveDelay>0) waveDelay=Math.max(0,waveDelay-dt); spawnTimer-=dt; if(wave===5&&waveKills>=getWaveTarget()&&!boss) spawnBoss(); if(!boss&&waveDelay<=0&&waveKills<getWaveTarget()&&spawnTimer<=0){spawnEnemy(); spawnTimer=Math.max(isMobileGame()?.65:.38,1.15-wave*.1);}
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
  kamikazeShadow=null; kamikazeLineX=null;
  enemies.forEach(e=>{if(e.type==='kamikaze'){if(e.state==='flight'){e.y+=e.speed*dt;e.x+=Math.sin(e.phase+e.y*.012)*18*dt;}else if(e.state==='climb'){e.climbProgress=Math.min(1,e.climbProgress+dt/2);e.y=e.climbStartY+(-140*scale-e.climbStartY)*e.climbProgress;e.targetX=player.x;kamikazeShadow={x:player.x,y:player.y};if(e.climbProgress>=1){e.state='warning';e.warningTimer=1;kamikazeTarget={x:player.x,y:player.y};kamikazeLineX=player.x;}}else if(e.state==='warning'){e.y=-140*scale;e.warningTimer-=dt;kamikazeShadow={x:player.x,y:player.y};kamikazeTarget={x:player.x,y:player.y};kamikazeLineX=e.targetX;if(e.warningTimer<=0){e.state='dive';e.y=-100;e.x=e.targetX;kamikazeTarget=null;kamikazeShadow=null;}}else if(e.state==='dive'){e.y+=760*dt;e.x+=(player.x-e.x)*Math.min(1,dt*.55);kamikazeLineX=e.x;}}else{e.y+=e.speed*dt;e.x+=Math.sin(e.phase+e.y*.012)*18*dt;}e.x=Math.max(bounds.min,Math.min(bounds.max,e.x));});
  if(boss){const bossSpeedMultiplier=getBossSpeedMultiplier();if(boss.state==='retreating'){boss.y-=boss.speed*bossSpeedMultiplier*dt;if(boss.y<-110*scale&&enemies.length===0){if(boss.transitionBatch<2){boss.transitionBatch++;spawnBossTransitionWave();}else{boss.state='returning';boss.enraged=true;boss.y=-90*scale;boss.attackTimer=0;boss.laserLaunchTimer=Infinity;}}}else if(boss.state==='returning'){boss.y=Math.min(150,boss.y+boss.speed*bossSpeedMultiplier*dt);boss.phase+=dt;boss.x+=(Math.sin(boss.phase*.9)*70*bossSpeedMultiplier)*dt;boss.x=Math.max(bounds.min,Math.min(bounds.max,boss.x));if(boss.y>=150){boss.state='furious';boss.hp=boss.maxHp;boss.attackTimer=0;boss.laserLaunchTimer=Infinity;}}else if(boss.state==='furious'){boss.y=Math.min(150,boss.y+boss.speed*bossSpeedMultiplier*dt);boss.phase+=dt;boss.x+=(Math.sin(boss.phase*.9)*70*bossSpeedMultiplier)*dt;boss.x=Math.max(bounds.min,Math.min(bounds.max,boss.x));boss.attackTimer-=dt;boss.laserLaunchTimer-=dt;if(boss.attackTimer<=0){bossFuriousCombo();boss.attackTimer=isMobileGame()?5:4;}if(boss.laserLaunchTimer<=0){bossLaserAttack();boss.laserLaunchTimer=Infinity;}}else{boss.y=Math.min(150,boss.y+boss.speed*bossSpeedMultiplier*dt);boss.phase+=dt;boss.x+=(Math.sin(boss.phase*.9)*70*bossSpeedMultiplier)*dt;boss.x=Math.max(bounds.min,Math.min(bounds.max,boss.x));boss.attackTimer-=dt;if(boss.attackTimer<=0){if(boss.attack===0){bossBasicAttack();boss.attack=1;}else if(boss.attack===1){bossLaserWarning();boss.attack=2;}else if(boss.attack===2){bossLaserAttack();boss.attack=3;}else{bossBallAttack();boss.attack=0;}boss.attackTimer=1.5;}}}
  powerUps.forEach(powerUp=>{powerUp.y+=powerUp.speed*dt;powerUp.rotation+=dt*4;});
  for(let i=powerUps.length-1;i>=0;i--){const powerUp=powerUps[i];if(powerUp.y>height+30){powerUps.splice(i,1);continue;}if(Math.abs(powerUp.x-player.x)<28&&Math.abs(powerUp.y-player.y)<45){powerUps.splice(i,1);player.shield=1;burst(player.x,player.y,'#75c9d8',14);playTone(760,.16,'sine',.05,1040);}}
  enemyBullets.forEach(b=>{b.x+=b.vx*dt;b.y+=b.vy*dt;});enemyBullets=enemyBullets.filter(b=>b.y<height+30);for(let i=enemyBullets.length-1;i>=0;i--){const b=enemyBullets[i];if(Math.abs(b.x-player.x)<18&&Math.abs(b.y-player.y)<35){enemyBullets.splice(i,1);hitPlayer();}}
  laserWarnings.forEach(warning=>{warning.time-=dt;});laserWarnings=laserWarnings.filter(warning=>warning.time>0);
  lasers.forEach(laser=>{laser.time-=dt;if(!laser.hit&&Math.abs(laser.x-player.x)<14){laser.hit=true;hitPlayer();}});lasers=lasers.filter(laser=>laser.time>0);
  fallingThreats.forEach(threat=>{threat.y+=threat.speed*dt;threat.x+=Math.sin(threat.phase+threat.y*.012)*threat.wobble*dt;});for(let i=fallingThreats.length-1;i>=0;i--){const threat=fallingThreats[i];if(threat.y>height+100){fallingThreats.splice(i,1);continue;}if(Math.abs(threat.x-player.x)<22&&Math.abs(threat.y-player.y)<35){fallingThreats.splice(i,1);hitPlayer();}}
  for(let i=enemies.length-1;i>=0;i--){const e=enemies[i]; if(e.y>height+50){enemies.splice(i,1);if(e.type==='kamikaze'&&e.state==='dive'){kamikazeExplosion(e.x,player.y);kamikazeLineX=null;}else hitPlayer();continue;} const hitbox=getEnemyHitbox(e.type); if(e.state!=='climb'&&e.state!=='warning'&&Math.abs(e.x-player.x)<(hitbox.width+player.w)*.34&&Math.abs(e.y-player.y)<(hitbox.height+player.h)*.35){enemies.splice(i,1);if(e.type==='kamikaze'&&e.state==='dive'){kamikazeExplosion(e.x,e.y);kamikazeLineX=null;hitByKamikaze();}else hitPlayer();}}
  for(let i=bullets.length-1;i>=0;i--){
    const bullet=bullets[i];
    const bossSizeMultiplier=boss?.enraged?bossFuriousSize:1;
    const bossHitboxWidth=aircraftHitboxes.boss.width*scale*bossSizeMultiplier;
    const bossHitboxHeight=aircraftHitboxes.boss.height*scale*bossSizeMultiplier;
    if(boss&&boss.state!=='retreating'&&boss.state!=='returning'&&Math.abs(bullet.x-boss.x)<bossHitboxWidth&&Math.abs(bullet.y-boss.y)<bossHitboxHeight){
      bullets.splice(i,1);boss.hp--;burst(bullet.x,bullet.y,'#f1c16a',7);playTone(280,.08,'triangle',.04,120);
      if(boss.hp<=boss.maxHp/2&&boss.state==='normal'){startBossTransition();continue;}
      if(boss.hp<=0){score+=1500;burst(boss.x,boss.y,'#d85e3f',45);playNoise(.5,.12);playTone(80,.5,'sawtooth',.08,25);boss=null;finishGame(true);return;}
      continue;
    }
    for(let j=enemies.length-1;j>=0;j--){
      const enemy=enemies[j];
      const hitbox=getEnemyHitbox(enemy.type);
      const hitWidth=hitbox.width;
      const hitHeight=hitbox.height;
      if(Math.abs(bullet.x-enemy.x)>=hitWidth||Math.abs(bullet.y-enemy.y)>=hitHeight) continue;
      bullets.splice(i,1);enemy.hp--;burst(bullet.x,bullet.y,'#f1c16a',5);playTone(280,.08,'triangle',.04,120);
      if(enemy.type==='kamikaze'&&enemy.state==='dive'){enemies.splice(j,1);kamikazeExplosion(enemy.x,enemy.y);kamikazeLineX=null;}else if(enemy.hp<=0&&enemy.type==='kamikaze'){enemy.state='climb';enemy.climbProgress=0;enemy.climbStartY=enemy.y;enemy.targetX=player.x;waveKills++;score+=180;burst(enemy.x,enemy.y,'#d85e3f',12);playTone(100,.22,'sawtooth',.05,240);}else if(enemy.hp<=0){score+=enemy.type==='ace'?250:100;waveKills++;enemies.splice(j,1);burst(enemy.x,enemy.y,'#d85e3f',18);playNoise(.16,.07);playTone(150,.2,'sawtooth',.05,35);}
      break;
    }
  }
  particles.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=70*dt;p.life-=dt;});particles=particles.filter(p=>p.life>0);
  if(wave===10&&waveKills>=getWaveTarget()&&enemies.length===0&&waveDelay<=0&&!boss){spawnBoss();return;}
  if(wave<10&&wave!==5&&waveKills>=getWaveTarget()&&enemies.length===0&&waveDelay<=0){wave++;waveKills=0;waveRoster=[];waveDelay=2.5;spawnTimer=waveDelay;updateHud();}
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
function drawPlayerBars(){const scale=getResponsiveScale(),barWidth=58*scale,barHeight=5*scale,barX=player.x-barWidth/2,barY=player.y+57*scale;ctx.fillStyle='rgba(16,39,49,.75)';ctx.fillRect(barX,barY,barWidth,barHeight);ctx.fillStyle='#d85e3f';ctx.fillRect(barX,barY,barWidth*Math.max(0,health/100),barHeight);ctx.fillStyle='rgba(16,39,49,.75)';ctx.fillRect(barX,barY+8*scale,barWidth,barHeight);ctx.fillStyle=player.overheated>0?'#d85e3f':'#d6c35b';ctx.fillRect(barX,barY+8*scale,barWidth*(player.overload/100),barHeight);}
function draw() {const scale=getResponsiveScale();drawBackground();laserWarnings.forEach(warning=>{ctx.strokeStyle='rgba(255,255,255,.8)';ctx.lineWidth=2*scale;ctx.setLineDash([8*scale,10*scale]);ctx.beginPath();ctx.moveTo(warning.x,0);ctx.lineTo(warning.x,height);ctx.stroke();});ctx.setLineDash([]);lasers.forEach(laser=>{ctx.strokeStyle='#d92323';ctx.lineWidth=18*scale;ctx.shadowBlur=18*scale;ctx.shadowColor='#e52f2f';ctx.beginPath();ctx.moveTo(laser.x,0);ctx.lineTo(laser.x,height);ctx.stroke();ctx.strokeStyle='#fff';ctx.lineWidth=5*scale;ctx.shadowBlur=0;ctx.beginPath();ctx.moveTo(laser.x,0);ctx.lineTo(laser.x,height);ctx.stroke();});powerUps.forEach(powerUp=>{ctx.save();ctx.translate(powerUp.x,powerUp.y);ctx.rotate(powerUp.rotation);ctx.fillStyle='#75c9d8';ctx.shadowBlur=14*scale;ctx.shadowColor='#75c9d8';ctx.fillRect(-10*scale,-10*scale,20*scale,20*scale);ctx.fillStyle='#173c4c';ctx.fillRect(-3*scale,-8*scale,6*scale,16*scale);ctx.fillRect(-8*scale,-3*scale,16*scale,6*scale);ctx.restore();});enemyBullets.forEach(b=>{ctx.fillStyle='#d85e3f';ctx.shadowBlur=12*scale;ctx.shadowColor='#d85e3f';ctx.fillRect(b.x-4*scale,b.y-8*scale,8*scale,16*scale);ctx.shadowBlur=0;});fallingThreats.forEach(threat=>{ctx.fillStyle='#8f4b42';ctx.shadowBlur=12*scale;ctx.shadowColor='#d85e3f';ctx.beginPath();ctx.arc(threat.x,threat.y,18*scale,0,Math.PI*2);ctx.fill();ctx.fillStyle='#f0b6a0';ctx.shadowBlur=0;ctx.beginPath();ctx.arc(threat.x-5*scale,threat.y-6*scale,5*scale,0,Math.PI*2);ctx.fill();});bullets.forEach(b=>{ctx.fillStyle='#ffe4a5';ctx.shadowBlur=12*scale;ctx.shadowColor='#ffba46';ctx.fillRect(b.x-2*scale,b.y-12*scale,4*scale,18*scale);ctx.shadowBlur=0;});enemies.forEach(e=>drawPlane(e.x,e.y,(e.type==='ace'?1.25:1)*scale,e.type==='ace'?'#5c666b':'#b5c2c5',e.type==='ace'?'su57':'mig35'));if(boss){const bossScale=1.5*scale*(boss.enraged?bossFuriousSize:1),bossHitboxScale=boss.enraged?bossFuriousSize:1;drawPlane(boss.x,boss.y,bossScale,'#5c666b','b2');ctx.fillStyle='rgba(16,39,49,.75)';ctx.fillRect(boss.x-55*scale*bossHitboxScale,boss.y-75*scale,110*scale*bossHitboxScale,7*scale);ctx.fillStyle=boss.enraged?'#d85e3f':'#d85e3f';ctx.fillRect(boss.x-55*scale*bossHitboxScale,boss.y-75*scale,110*scale*bossHitboxScale*(boss.hp/boss.maxHp),7*scale);}if(player){if(player.shield>0){ctx.strokeStyle='#75c9d8';ctx.lineWidth=3*scale;ctx.shadowBlur=16*scale;ctx.shadowColor='#75c9d8';ctx.beginPath();ctx.arc(player.x,player.y,43*scale,0,Math.PI*2);ctx.stroke();ctx.shadowBlur=0;}drawPlane(player.x,player.y,1.35*scale,'#3e4b59','player');drawPlayerBars();}particles.forEach(p=>{ctx.globalAlpha=Math.max(0,p.life/.7);ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,p.size*scale,p.size*scale);});ctx.globalAlpha=1;}
function loop(time){const dt=Math.min((time-lastTime)/1000,.035);lastTime=time;update(dt);draw();if(gameState==='playing')animationId=requestAnimationFrame(loop);}
window.addEventListener('keydown',e=>{keys[e.key]=true;if(e.key==='Escape'){e.preventDefault();togglePause();}if([' ','ArrowLeft','ArrowRight','w','W','s','S'].includes(e.key))e.preventDefault();});window.addEventListener('keyup',e=>{keys[e.key]=false;});
function updateJoystick(event) { const rect=joystick.getBoundingClientRect(), radius=rect.width*.34, centerX=rect.left+rect.width/2, centerY=rect.top+rect.height/2; let x=(event.clientX-centerX)/radius, y=(event.clientY-centerY)/radius; const length=Math.hypot(x,y); if(length>1){x/=length;y/=length;} touch.x=x; touch.y=y; joystickKnob.style.transform=`translate(calc(-50% + ${x*radius}px), calc(-50% + ${y*radius}px))`; }
function resetJoystick() { touch.x=0; touch.y=0; joystickKnob.style.transform='translate(-50%, -50%)'; }
joystick.addEventListener('pointerdown', event=>{event.preventDefault();joystick.setPointerCapture(event.pointerId);updateJoystick(event);});
joystick.addEventListener('pointermove', event=>{if(joystick.hasPointerCapture(event.pointerId)) updateJoystick(event);});
joystick.addEventListener('pointerup', resetJoystick); joystick.addEventListener('pointercancel', resetJoystick); joystick.addEventListener('lostpointercapture', resetJoystick);
document.querySelector('[data-control="fire"]').addEventListener('pointerdown',event=>{event.preventDefault();touch.fire=true;});
document.querySelector('[data-control="fire"]').addEventListener('pointerup',()=>{touch.fire=false;});
document.querySelector('[data-control="fire"]').addEventListener('pointercancel',()=>{touch.fire=false;});
document.querySelector('[data-control="fire"]').addEventListener('pointerleave',()=>{touch.fire=false;});
document.querySelector('[data-control="fire"]').addEventListener('lostpointercapture',()=>{touch.fire=false;});
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
adminButton.addEventListener('click',openAdmin);
adminPasswordForm.addEventListener('submit',event=>{event.preventDefault();if(adminPassword.value==='291211')openPhaseMenu();else{adminError.textContent='SENHA INCORRETA';adminPassword.select();}});
adminCancelButton.addEventListener('click',()=>adminOverlay.classList.add('hidden'));
phaseCancelButton.addEventListener('click',()=>phaseOverlay.classList.add('hidden'));
for(let selectedWave=1;selectedWave<=10;selectedWave++){const phaseButton=document.createElement('button');phaseButton.className='phase-button';phaseButton.type='button';phaseButton.textContent=String(selectedWave).padStart(2,'0');phaseButton.setAttribute('aria-label',`Iniciar fase ${selectedWave}`);phaseButton.addEventListener('click',()=>startAdminPhase(selectedWave));phaseGrid.appendChild(phaseButton);}
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
const baseDrawScene = draw;
const drawScene = function() { const duoBoss=boss?.mode==='duo',savedBoss=boss; if(duoBoss) boss=null; baseDrawScene(); if(duoBoss) boss=savedBoss; };
const updateSingleBoss = update;
function syncDuoRetreat() { if(!boss?.aircraft)return; boss.aircraft.forEach(aircraft=>{if(aircraft.state==='normal'&&aircraft.hp<=aircraft.maxHp/2){aircraft.state='retreating';aircraft.retreatOrder=boss.nextRetreatOrder++;}}); }
function returnNextDuoBoss() { if(!boss?.returnQueue?.length)return; const next=boss.returnQueue.shift(); next.state='returning';next.hp=next.maxHp;next.enraged=true;next.attackStep=0;next.attackState='cooldown';next.attackCooldown=1; }
function updateDuoBoss(dt) { if(gameState!=='playing')return; const scale=getResponsiveScale(),bounds=getCombatBounds();const move=(keys.ArrowLeft||keys.a?-1:0)+(keys.ArrowRight||keys.d?1:0)+touch.x;player.x=Math.max(bounds.min,Math.min(bounds.max,player.x+Math.max(-1,Math.min(1,move))*300*dt));player.cooldown=Math.max(0,player.cooldown-dt);if(keys[' ']||touch.fire)shoot();if(boss.duoWave){enemies.forEach(enemy=>{enemy.y+=enemy.speed*dt;enemy.x+=Math.sin(enemy.phase+enemy.y*.012)*18*dt;});for(let i=enemies.length-1;i>=0;i--){const enemy=enemies[i];if(enemy.y>height+50){enemies.splice(i,1);hitPlayer();continue;}if(Math.abs(enemy.x-player.x)<35&&Math.abs(enemy.y-player.y)<45){enemies.splice(i,1);hitPlayer();}}}boss.aircraft.forEach(aircraft=>{if(aircraft.state==='retreating')return;if(aircraft.state==='returning'){aircraft.y=Math.min(150,aircraft.y+aircraft.speed*dt);if(aircraft.y>=150)aircraft.state='furious';return;}aircraft.y=Math.min(150,aircraft.y+aircraft.speed*dt);aircraft.phase+=dt;aircraft.x+=Math.sin(aircraft.phase)*45*dt;aircraft.attackTimer-=dt;if(aircraft.id==='f15ex'&&aircraft.straightTimer>0)updateDuoAttack(aircraft,dt);if(aircraft.attackTimer<=0&&(!aircraft.straightTimer||aircraft.straightTimer<=0)){duoAttack(aircraft);aircraft.attackTimer=1;}});if(!boss.duoWave&&boss.aircraft.some(aircraft=>aircraft.state==='retreating')){boss.duoWave=true;spawnDuoIntermission();}if(boss.duoWave&&enemies.length===0&&boss.aircraft.some(aircraft=>aircraft.state==='retreating'))boss.aircraft.forEach(aircraft=>{if(aircraft.state==='retreating')aircraft.state='returning';});for(let i=bullets.length-1;i>=0;i--){const bullet=bullets[i];bullet.y-=bullet.speed*dt;let hit=false;for(const aircraft of boss.aircraft){if(aircraft.state!=='retreating'&&Math.abs(bullet.x-aircraft.x)<80*scale&&Math.abs(bullet.y-aircraft.y)<55*scale){aircraft.hp--;bullets.splice(i,1);hit=true;if(aircraft.hp<=aircraft.maxHp/2&&aircraft.state==='normal'){aircraft.state='retreating';boss.returnOrder??=aircraft.id;}if(aircraft.hp<=0&&aircraft.state==='furious'){score+=1800;aircraft.state='dead';}break;}}if(hit)continue;for(let j=enemies.length-1;j>=0;j--){const enemy=enemies[j];const hitbox=getEnemyHitbox(enemy.type);if(Math.abs(bullet.x-enemy.x)<hitbox.width&&Math.abs(bullet.y-enemy.y)<hitbox.height){enemy.hp--;bullets.splice(i,1);if(enemy.hp<=0){enemies.splice(j,1);waveKills++;score+=enemy.type==='ace'?250:enemy.type==='fighter'?100:180;}break;}}}if(boss.aircraft.every(aircraft=>aircraft.state==='dead')){boss=null;finishGame(true);return;}updateReticle();}
function updateDuoBoss(dt) {
  if (gameState !== 'playing') return;
  const scale = getResponsiveScale();
  const bounds = getCombatBounds();
  const horizontalMove = (keys.ArrowLeft || keys.a ? -1 : 0) + (keys.ArrowRight || keys.d ? 1 : 0) + touch.x;
  const verticalMove = (keys.w || keys.W ? -1 : 0) + (keys.s || keys.S ? 1 : 0) + touch.y;
  player.x = Math.max(bounds.min, Math.min(bounds.max, player.x + Math.max(-1, Math.min(1, horizontalMove)) * 300 * dt));
  player.y = Math.max(90 * scale, Math.min(height - 65 * scale, player.y + Math.max(-1, Math.min(1, verticalMove)) * 240 * dt));
  player.cooldown = Math.max(0, player.cooldown - dt);
  updateWeaponCooling(dt);
  if (keys[' '] || touch.fire) shoot();
  if (boss.duoWave) {
    kamikazeShadow=null; kamikazeLineX=null;
    enemies.forEach(enemy => { if(enemy.type==='kamikaze'){if(enemy.state==='flight'){enemy.y+=enemy.speed*dt;enemy.x+=Math.sin(enemy.phase+enemy.y*.012)*18*dt;}else if(enemy.state==='climb'){enemy.climbProgress=Math.min(1,enemy.climbProgress+dt/2);enemy.y=enemy.climbStartY+(-140*scale-enemy.climbStartY)*enemy.climbProgress;enemy.targetX=player.x;kamikazeShadow={x:player.x,y:player.y};if(enemy.climbProgress>=1){enemy.state='warning';enemy.warningTimer=1;kamikazeTarget={x:player.x,y:player.y};kamikazeLineX=player.x;}}else if(enemy.state==='warning'){enemy.y=-140*scale;enemy.warningTimer-=dt;kamikazeShadow={x:player.x,y:player.y};kamikazeTarget={x:player.x,y:player.y};kamikazeLineX=enemy.targetX;if(enemy.warningTimer<=0){enemy.state='dive';enemy.y=-100;enemy.x=enemy.targetX;kamikazeTarget=null;kamikazeShadow=null;}}else if(enemy.state==='dive'){enemy.y+=760*dt;enemy.x+=(player.x-enemy.x)*Math.min(1,dt*.55);kamikazeLineX=enemy.x;}}else{enemy.y+=enemy.speed*dt;enemy.x+=Math.sin(enemy.phase+enemy.y*.012)*18*dt;}});
    for (let index = enemies.length - 1; index >= 0; index--) {
      const enemy = enemies[index];
      if (enemy.y > height + 50) { enemies.splice(index,1); if(enemy.type==='kamikaze'&&enemy.state==='dive'){kamikazeExplosion(enemy.x,player.y);kamikazeLineX=null;}else hitPlayer(); continue; }
      if (enemy.state!=='climb'&&enemy.state!=='warning'&&Math.abs(enemy.x-player.x)<35&&Math.abs(enemy.y-player.y)<45) { enemies.splice(index,1); if(enemy.type==='kamikaze'&&enemy.state==='dive'){kamikazeExplosion(enemy.x,enemy.y);kamikazeLineX=null;hitByKamikaze();}else hitPlayer(); }
    }
  }
  boss.aircraft.forEach(aircraft => {
    if (aircraft.state === 'waiting') return;
    if (aircraft.state === 'retreating') { aircraft.y -= aircraft.speed * dt; return; }
    if (aircraft.state === 'dead') return;
    if (aircraft.state === 'returning') { aircraft.y = Math.min(150, aircraft.y + aircraft.speed * dt); if (aircraft.y >= 150) { aircraft.state = 'furious'; aircraft.attackStep = 0; aircraft.attackState = 'ready'; aircraft.attackCooldown = 1; aircraft.hp = aircraft.maxHp; } return; }
    aircraft.y = Math.min(150, aircraft.y + aircraft.speed * dt);
    aircraft.phase += dt;
    aircraft.x = Math.max(bounds.min + 90 * scale, Math.min(bounds.max - 90 * scale, aircraft.x + Math.sin(aircraft.phase) * 45 * dt));
    if (aircraft.attackState === 'active') {
      aircraft.attackRemaining=Math.max(0,aircraft.attackRemaining-dt);
      if (aircraft.id === 'f15ex' && aircraft.straightTimer > 0) updateDuoAttack(aircraft, dt);
      if (duoAttackFinished(aircraft)) { aircraft.attackState = 'cooldown'; aircraft.attackCooldown = 1; aircraft.attackStep = (aircraft.attackStep + 1) % 2; }
    } else if (aircraft.attackState === 'cooldown') {
      aircraft.attackCooldown -= dt;
      if (aircraft.attackCooldown <= 0) aircraft.attackState = 'ready';
    } else if (aircraft.attackState === 'ready') duoAttack(aircraft);
  });
  if (boss.mobileSolo && !boss.duoWave) {
    const firstRetreating=boss.aircraft.find(aircraft=>aircraft.state==='retreating');
    const waiting=boss.aircraft.find(aircraft=>aircraft.state==='waiting');
    if(firstRetreating&&waiting&&firstRetreating.y<-110*scale){waiting.state='normal';waiting.y=-130*scale;waiting.attackState='ready';}
  }
  if (!boss.duoWave && boss.aircraft.every(aircraft => aircraft.state === 'retreating' && aircraft.y < -110 * scale)) { boss.duoWave = true; boss.returnQueue=boss.aircraft.slice().sort((first,second)=>first.retreatOrder-second.retreatOrder); if(boss.mobileSolo){returnNextDuoBoss();}else{spawnDuoIntermission();} }
  if (boss.duoWave && enemies.length === 0 && boss.returnQueue.length === 2) returnNextDuoBoss();
  if (boss.duoWave && boss.aircraft.some(aircraft => aircraft.state === 'dead') && boss.returnQueue.length) returnNextDuoBoss();
  for (let index = bullets.length - 1; index >= 0; index--) {
    const bullet = bullets[index];
    bullet.y -= bullet.speed * dt;
    let hit = false;
    for (const aircraft of boss.aircraft) {
      if (aircraft.state !== 'retreating' && aircraft.state !== 'returning' && aircraft.state !== 'dead' && Math.abs(bullet.x - aircraft.x) < 80 * scale && Math.abs(bullet.y - aircraft.y) < 55 * scale) {
        aircraft.hp--; bullets.splice(index, 1); hit = true;
        if (aircraft.hp <= aircraft.maxHp / 2 && aircraft.state === 'normal') aircraft.state = 'retreating';
        if (aircraft.hp <= 0 && aircraft.state === 'furious') { aircraft.state = 'dead'; score += 1800; if(boss.duoWave) returnNextDuoBoss(); }
        break;
      }
    }
    if (hit) continue;
    for (let enemyIndex = enemies.length - 1; enemyIndex >= 0; enemyIndex--) {
      const enemy = enemies[enemyIndex]; const hitbox = getEnemyHitbox(enemy.type);
      if (Math.abs(bullet.x - enemy.x) < hitbox.width && Math.abs(bullet.y - enemy.y) < hitbox.height) { enemy.hp--; bullets.splice(index, 1); if (enemy.type==='kamikaze'&&enemy.state==='dive'){enemies.splice(enemyIndex,1);kamikazeExplosion(enemy.x,enemy.y);kamikazeLineX=null;waveKills++;score+=180;}else if (enemy.hp <= 0 && enemy.type==='kamikaze'){enemy.state='climb';enemy.climbProgress=0;enemy.climbStartY=enemy.y;enemy.targetX=player.x;waveKills++;score+=180;burst(enemy.x,enemy.y,'#d85e3f',12);playTone(100,.22,'sawtooth',.05,240);}else if (enemy.hp <= 0) { enemies.splice(enemyIndex, 1); waveKills++; score += enemy.type === 'ace' ? 250 : enemy.type === 'fighter' ? 100 : 180; } break; }
    }
  }
  if (boss.aircraft.every(aircraft => aircraft.state === 'dead')) { boss = null; finishGame(true); return; }
  particles.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=70*dt;p.life-=dt;});
  particles=particles.filter(p=>p.life>0);
  updateReticle();
}
update = function(dt) { if (boss?.mode === 'duo') { syncDuoRetreat(); updateDuoProjectiles(dt); updateDuoBoss(dt); return; } updateSingleBoss(dt); };
draw = function() { drawScene(); const scale=getResponsiveScale(); if(boss?.mode==='duo'){boss.aircraft.filter(aircraft=>aircraft.state!=='dead').forEach(aircraft=>{drawPlane(aircraft.x,aircraft.y,1.45*scale,aircraft.id==='f15e'?'#69757a':'#8c989b',aircraft.id);ctx.fillStyle='rgba(16,39,49,.75)';ctx.fillRect(aircraft.x-55*scale,aircraft.y-75*scale,110*scale,7*scale);ctx.fillStyle=aircraft.enraged?'#d85e3f':'#e5ae50';ctx.fillRect(aircraft.x-55*scale,aircraft.y-75*scale,110*scale*Math.max(0,aircraft.hp/aircraft.maxHp),7*scale);});}if(kamikazeLineX!==null){ctx.strokeStyle='rgba(216,35,35,.9)';ctx.lineWidth=2*scale;ctx.setLineDash([8*scale,10*scale]);ctx.beginPath();ctx.moveTo(kamikazeLineX,0);ctx.lineTo(kamikazeLineX,height);ctx.stroke();ctx.setLineDash([]);}if(kamikazeShadow){const pulse=1+Math.sin(performance.now()*.012)*.08;ctx.save();ctx.translate(kamikazeShadow.x,kamikazeShadow.y+24*scale);ctx.scale(pulse,1);ctx.fillStyle='rgba(25,18,16,.48)';ctx.shadowBlur=18*scale;ctx.shadowColor='rgba(216,94,63,.8)';ctx.beginPath();ctx.ellipse(0,0,34*scale,11*scale,0,0,Math.PI*2);ctx.fill();ctx.restore();}enemies.filter(enemy=>enemy.type==='kamikaze').forEach(enemy=>drawPlane(enemy.x,enemy.y,1.15*scale,'#d85e3f','kamikaze')); };
const showResult = finishGame;
finishGame = function(won) { if(won&&wave===5){boss=null;wave=6;waveKills=0;waveRoster=[];waveDelay=2.5;spawnTimer=waveDelay;updateHud();gameState='playing';return;} showResult(won); if(won){document.getElementById('resultText').textContent='Dez ondas destruídas. O céu pertence à sua esquadrilha.';} };
resetGame(); draw();
