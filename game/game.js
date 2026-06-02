/* ===== Rope Cut — Game Engine =====
   Cut ropes in correct order to drop items into a basket
   Physics: gravity, pendulum, collision detection
*/
const W = 600, H = 700;
let canvas, ctx;
let particles = null;

// ─── Game State ──────────────────────────────────────
let currentLevel = 1;
let items = [];
let ropes = [];
let basket = null;
let cutRopes = [];
let collectedItems = 0;
let totalItems = 0;
let gameState = 'menu';
let unusedRopes = 0;
let totalRopes = 0;
let itemsInBasket = 0;
let starRating = 0;
let gameActive = false;
let hoveredRope = -1;

// ─── Physics ─────────────────────────────────────────
const GRAVITY = 0.4;
const FRICTION = 0.98;

function updatePhysics() {
  for (const item of items) {
    if (item.falling) {
      item.vy += GRAVITY;
      item.x += item.vx * 0.5;
      item.y += item.vy;
      item.vx *= FRICTION;
      item.vy *= FRICTION;
      item.rotation += item.vy * 0.02;
      
      // Ground collision
      if (item.y + item.size > H - 50) {
        item.y = H - 50 - item.size;
        item.vy = 0;
        item.vx *= 0.8;
        if (Math.abs(item.vy) < 0.5) item.falling = false;
      }
      
      // Basket collision
      if (basket && 
          item.x + item.size > basket.x && 
          item.x < basket.x + basket.w &&
          item.y + item.size > basket.y && 
          item.y + item.size < basket.y + basket.h + 10 &&
          item.falling) {
        // Caught in basket
        item.falling = false;
        item.inBasket = true;
        item.y = basket.y + basket.h - item.size - 5;
        item.vy = 0;
        item.vx = 0;
        if (!item.collected) {
          item.collected = true;
          itemsInBasket++;
          collectedItems++;
          if (particles) particles.emit(item.x, item.y, '#ffd700', 8);
        }
      }
      
      // Floor bounce
      if (item.y + item.size > H - 50) {
        item.y = H - 50 - item.size;
        item.vy *= -0.3;
        if (Math.abs(item.vy) < 1) item.vy = 0;
      }
    } else if (item.connectedRopes.length > 0) {
      // Pendulum physics - connected to a rope
      let totalForceX = 0, totalForceY = 0;
      for (const ropeIdx of item.connectedRopes) {
        const rope = ropes[ropeIdx];
        if (!rope || rope.cut) continue;
        const dx = rope.anchorX - item.x;
        const dy = rope.anchorY - item.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist > 0) {
          const force = (dist - rope.length) * 0.02;
          totalForceX += (dx / dist) * force;
          totalForceY += (dy / dist) * force;
        }
      }
      item.vx += totalForceX;
      item.vy += totalForceY + GRAVITY * 0.3;
      item.vx *= 0.98;
      item.vy *= 0.98;
      item.x += item.vx;
      item.y += item.vy;
      item.rotation += item.vx * 0.01;
    }
  }
}

// ─── Level Generator ─────────────────────────────────
function generateLevel(level) {
  items = [];
  ropes = [];
  cutRopes = [];
  collectedItems = 0;
  itemsInBasket = 0;
  totalRopes = 0;
  unusedRopes = 0;
  gameActive = true;
  
  const bonuses = window.ProgressionSystem ? ProgressionSystem.getActiveBonuses() : {};
  const basketSizeBonus = bonuses.basketSize || 0;
  const ropeCount = Math.min(bonuses.ropeCount || 5, 12);
  
  // Basket at bottom
  basket = {
    x: W/2 - 50 - basketSizeBonus * 10,
    y: H - 90,
    w: 100 + basketSizeBonus * 20,
    h: 40,
  };
  
  // Generate items based on level
  const numItems = Math.min(2 + Math.floor(level / 3), 8);
  totalItems = numItems;
  
  const itemNames = ['🍎', '⚽', '💰', '🔑', '💎', '🎁', '📦', '🏀', '🍊', '🧸'];
  const itemColors = ['#e74c3c', '#3498db', '#f1c40f', '#9b59b6', '#1abc9c', '#e67e22', '#2ecc71', '#e74c3c', '#f39c12', '#95a5a6'];
  
  // Place items spread across top area
  const spacing = (W - 100) / (numItems + 1);
  
  for (let i = 0; i < numItems; i++) {
    const x = 70 + spacing * (i + 0.5) + (Math.random() - 0.5) * 30;
    const y = 80 + Math.random() * 80;
    const itemIdx = Math.min(i, itemNames.length - 1);
    
    const item = {
      x, y,
      size: 24,
      vx: 0, vy: 0,
      rotation: 0,
      falling: false,
      inBasket: false,
      collected: false,
      connectedRopes: [],
      name: itemNames[itemIdx % itemNames.length],
      color: itemColors[itemIdx % itemColors.length],
      type: Math.random() > 0.5 ? 'collectible' : 'obstacle',
    };
    items.push(item);
    
    // Create 1-2 ropes connecting item to top anchors
    const numRopes = 1 + Math.floor(Math.random() * 2);
    for (let r = 0; r < numRopes; r++) {
      const anchorX = x + (Math.random() - 0.5) * 80;
      const anchorY = 20 + Math.random() * 30;
      const ropeLen = Math.sqrt((x - anchorX)**2 + (y - anchorY)**2);
      
      const rope = {
        itemIdx: i,
        anchorX, anchorY,
        length: ropeLen * (0.8 + Math.random() * 0.4),
        cut: false,
        color: getRopeColor(),
        width: 2 + Math.random() * 1,
      };
      ropes.push(rope);
      item.connectedRopes.push(ropes.length - 1);
    }
  }
  
  totalRopes = ropes.length;
  unusedRopes = totalRopes;
  
  updateRopeCount();
}

function getRopeColor() {
  const state = window.ProgressionSystem?.getState();
  const style = state?.activeRopeStyle || 'classic';
  const colors = { classic: '#8B6914', golden: '#ffd700', neon: '#00ffff', chain: '#aaaaaa' };
  return colors[style] || '#8B6914';
}

// ─── Canvas Setup ────────────────────────────────────
function initCanvas() {
  canvas = document.getElementById('game-canvas');
  ctx = canvas.getContext('2d');
  canvas.width = W;
  canvas.height = H;
  const maxW = window.innerWidth - 16;
  const maxH = window.innerHeight - 160;
  const scale = Math.min(maxW / W, maxH / H, 1);
  canvas.style.width = (W * scale) + 'px';
  canvas.style.height = (H * scale) + 'px';
}

// ─── Game Logic ──────────────────────────────────────
function startLevel(level) {
  currentLevel = level;
  if (window.RetentionSystem) RetentionSystem.onGameStart();
  generateLevel(level);
  gameState = 'playing';
  hoveredRope = -1;
  starRating = 0;
  
  document.getElementById('game-over-box').classList.remove('show');
  document.getElementById('level-complete-box').classList.remove('show');
  document.getElementById('level-value').textContent = level;
  document.getElementById('stars-value').textContent = '⭐☆☆';
  
  if (particles) particles.emitLevelUp();
}

function cutRope(ropeIdx) {
  if (ropeIdx < 0 || ropeIdx >= ropes.length) return;
  const rope = ropes[ropeIdx];
  if (rope.cut) return;
  
  rope.cut = true;
  cutRopes.push(ropeIdx);
  unusedRopes--;
  
  const item = items[rope.itemIdx];
  if (item && !item.falling) {
    // Check if all ropes for this item are cut
    const allCut = item.connectedRopes.every(ri => ropes[ri]?.cut);
    if (allCut) {
      item.falling = true;
      item.vy = -2;
      if (particles) particles.emit(item.x, item.y, '#ffd700', 6);
    }
  }
  
  // Emit cut particles
  if (particles) {
    particles.emit(rope.anchorX, rope.anchorY, '#ffffff', 5);
  }
  
  updateRopeCount();
  checkWinCondition();
}

function checkWinCondition() {
  // Win when all items are either collected in basket or fell off screen
  const allItemsDone = items.every(item => {
    return item.collected || item.y > H + 50;
  });
  
  if (allItemsDone) {
    gameActive = false;
    gameState = 'win';
    showLevelComplete();
  }
}

function update(dt) {
  updatePhysics();
  
  // Check items that fell off screen
  for (const item of items) {
    if (item.y > H + 50 && !item.collected) {
      item.collected = true; // Mark as done (failed)
    }
  }
}

function updateRopeCount() {
  document.getElementById('ropes-value').textContent = unusedRopes;
}

// ─── Render ──────────────────────────────────────────
function render() {
  ctx.clearRect(0, 0, W, H);
  
  // Background
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#0a0a2a');
  grad.addColorStop(1, '#1a1a3a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  
  // Ceiling
  ctx.fillStyle = '#2a2a4a';
  ctx.fillRect(0, 0, W, 15);
  ctx.strokeStyle = '#4a4a6a';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, 15); ctx.lineTo(W, 15); ctx.stroke();
  
  // Ground
  ctx.fillStyle = '#2a2a4a';
  ctx.fillRect(0, H - 50, W, 50);
  ctx.strokeStyle = '#4a4a6a';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, H - 50); ctx.lineTo(W, H - 50); ctx.stroke();
  
  // Basket
  if (basket) {
    ctx.save();
    ctx.strokeStyle = '#8B4513';
    ctx.lineWidth = 3;
    ctx.fillStyle = 'rgba(139, 69, 19, 0.2)';
    ctx.beginPath();
    ctx.roundRect(basket.x, basket.y, basket.w, basket.h, 4);
    ctx.fill();
    ctx.stroke();
    
    // Basket weave pattern
    ctx.strokeStyle = 'rgba(139, 69, 19, 0.4)';
    ctx.lineWidth = 1;
    for (let i = 0; i < basket.w; i += 10) {
      ctx.beginPath(); ctx.moveTo(basket.x + i, basket.y); ctx.lineTo(basket.x + i, basket.y + basket.h); ctx.stroke();
    }
    for (let j = 0; j < basket.h; j += 8) {
      ctx.beginPath(); ctx.moveTo(basket.x, basket.y + j); ctx.lineTo(basket.x + basket.w, basket.y + j); ctx.stroke();
    }
    
    // Label
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🎯 GOAL', basket.x + basket.w/2, basket.y - 5);
    ctx.restore();
  }
  
  // Ropes
  for (let i = 0; i < ropes.length; i++) {
    const rope = ropes[i];
    if (rope.cut) continue;
    
    const item = items[rope.itemIdx];
    if (!item) continue;
    
    const isHovered = i === hoveredRope;
    
    ctx.save();
    ctx.strokeStyle = isHovered ? '#ffffff' : rope.color;
    ctx.lineWidth = isHovered ? 4 : rope.width;
    ctx.shadowColor = isHovered ? '#ffffff' : 'transparent';
    ctx.shadowBlur = isHovered ? 8 : 0;
    
    // Rope curve with sag
    ctx.beginPath();
    ctx.moveTo(rope.anchorX, rope.anchorY);
    
    const midX = (rope.anchorX + item.x) / 2;
    const midY = (rope.anchorY + item.y) / 2 + 15;
    ctx.quadraticCurveTo(midX, midY, item.x, item.y);
    
    ctx.stroke();
    ctx.restore();
  }
  
  // Cut rope segments (fallen)
  for (const rope of ropes) {
    if (!rope.cut) continue;
    ctx.strokeStyle = 'rgba(139, 69, 19, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(rope.anchorX, rope.anchorY);
    ctx.lineTo(rope.anchorX + (Math.random() - 0.5) * 20, rope.anchorY + 20 + Math.random() * 10);
    ctx.stroke();
  }
  
  // Items
  for (const item of items) {
    if (item.y > H + 100) continue;
    
    ctx.save();
    ctx.translate(item.x, item.y);
    ctx.rotate(item.rotation);
    
    // Item shadow when falling
    if (item.falling) {
      ctx.shadowColor = 'rgba(0,0,0,0.3)';
      ctx.shadowBlur = 10;
    }
    
    // Draw item circle
    ctx.fillStyle = item.color;
    ctx.beginPath();
    ctx.arc(0, 0, item.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Item emoji
    ctx.fillStyle = '#fff';
    ctx.font = '18px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(item.name, 0, 2);
    
    // Shine
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.beginPath();
    ctx.arc(-6, -6, item.size * 0.3, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
  }
  
  // Particles
  if (particles) { particles.update(); particles.draw(ctx); }
  
  // Collection counter
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = '14px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`📦 ${itemsInBasket}/${totalItems}`, W/2, H - 12);
  
  // Cut instructions
  if (gameState === 'playing' && ropes.length > 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('✂️ Tap a rope to cut it', W/2, 50);
  }
}

// ─── Touch/Click Handling ────────────────────────────
function findRopeAt(x, y) {
  for (let i = 0; i < ropes.length; i++) {
    const rope = ropes[i];
    if (rope.cut) continue;
    const item = items[rope.itemIdx];
    if (!item) continue;
    
    // Check distance to rope curve
    const steps = 10;
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const px = (1-t)*(1-t)*rope.anchorX + 2*(1-t)*t*((rope.anchorX+item.x)/2) + t*t*item.x;
      const py = (1-t)*(1-t)*rope.anchorY + 2*(1-t)*t*((rope.anchorY+item.y)/2+15) + t*t*item.y;
      const dx = x - px, dy = y - py;
      if (Math.sqrt(dx*dx + dy*dy) < 20) return i;
    }
  }
  return -1;
}

function initControls() {
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    hoveredRope = findRopeAt(x, y);
    canvas.style.cursor = hoveredRope >= 0 ? 'pointer' : 'default';
  });
  
  canvas.addEventListener('click', (e) => {
    if (gameState !== 'playing') return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    const ropeIdx = findRopeAt(x, y);
    if (ropeIdx >= 0) cutRope(ropeIdx);
  });
  
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (gameState !== 'playing') return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    const t = e.touches[0];
    const x = (t.clientX - rect.left) * scaleX;
    const y = (t.clientY - rect.top) * scaleY;
    const ropeIdx = findRopeAt(x, y);
    if (ropeIdx >= 0) cutRope(ropeIdx);
  }, { passive: false });
}

// ─── UI ──────────────────────────────────────────────
function showNotification(msg) {
  const el = document.getElementById('notification');
  if (el) { el.textContent = msg; el.className = 'show'; clearTimeout(el._timeout); el._timeout = setTimeout(() => el.className = '', 2500); }
}

function updateHUD() {
  if (!window.ProgressionSystem) return;
  const state = ProgressionSystem.getState();
  const coins = document.getElementById('hud-coins');
  const gems = document.getElementById('hud-gems');
  if (coins) coins.textContent = state.coins;
  if (gems) gems.textContent = state.gems;
}

function showLevelComplete() {
  const box = document.getElementById('level-complete-box');
  box.querySelector('#complete-level').textContent = 'Level ' + currentLevel;
  
  // Star rating based on collected items vs unused ropes
  const ratio = itemsInBasket / totalItems;
  const scoreMult = window.ProgressionSystem ? ProgressionSystem.getActiveBonuses().scoreMult : 1;
  
  if (ratio >= 0.9) starRating = 3;
  else if (ratio >= 0.6) starRating = 2;
  else if (ratio > 0) starRating = 1;
  else starRating = 0;
  
  // Bonus stars for unused ropes
  if (unusedRopes === totalRopes && starRating === 3) {
    // Perfect - 3 stars only
  }
  
  const stars = '⭐'.repeat(starRating) + '☆'.repeat(3 - starRating);
  document.getElementById('stars-row').textContent = stars;
  document.getElementById('stars-value').textContent = stars;
  
  const bonus = 20 + starRating * 15 + Math.floor(currentLevel * 5);
  const scoreBonus = Math.floor(bonus * scoreMult);
  box.querySelector('#reward-display').textContent = '+' + scoreBonus + ' 🪙';
  box.classList.add('show');
  
  if (window.ProgressionSystem) {
    ProgressionSystem.endOfGame({
      won: starRating > 0,
      level: currentLevel,
      stars: starRating,
      collected: itemsInBasket,
    });
    if (starRating > 0) ProgressionSystem.addCoins(scoreBonus);
    const unlocked = ProgressionSystem.checkAchievements();
    updateHUD();
  }
  // New system hooks
  if (window.RetentionSystem) RetentionSystem.onGameEnd(scoreBonus);
  if (window.ChallengesSystem) {
    ChallengesSystem.reportProgress('score', scoreBonus);
    ChallengesSystem.reportProgress('games', 1);
    if (starRating >= 3) ChallengesSystem.reportProgress('perfect', 1);
  }
  if (window.AdsManager) AdsManager.tryShowInterstitial();
  
  if (particles && starRating > 0) {
    particles.emitReward(W/2, H/2);
  }
}

// ─── Game Loop ───────────────────────────────────────
let lastTime = 0;

function gameLoop(timestamp) {
  const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
  lastTime = timestamp;
  
  if (gameState === 'playing') {
    update(dt);
  }
  
  render();
  requestAnimationFrame(gameLoop);
}

// ─── Init ────────────────────────────────────────────
function init() {
  initCanvas();
  initControls();
  
  particles = new ParticleSystem();
  
  if (window.ProgressionSystem) {
    ProgressionSystem.load();
    const state = ProgressionSystem.getState();
    currentLevel = Math.min(state.highestLevel, 30);
    updateHUD();
    setInterval(updateHUD, 3000);
  }

  // Initialize new systems
  if (window.AdsManager) AdsManager.init();
  if (window.ChallengesSystem) ChallengesSystem.init();
  if (window.StoreRotator) StoreRotator.init();
  if (window.RetentionSystem) RetentionSystem.init();
  if (window.CollectiblesSystem) CollectiblesSystem.init();
  if (window.TutorialSystem) {
    TutorialSystem.init({ gameTitle: 'Rope Cut' });
    if (TutorialSystem.shouldShow()) setTimeout(() => TutorialSystem.start(), 500);
  }
  
  // Get saved best stars for display
  const state = window.ProgressionSystem?.getState();
  
  // UI Buttons
  document.getElementById('play-btn')?.addEventListener('click', () => startLevel(currentLevel));
  document.getElementById('restart-btn')?.addEventListener('click', () => startLevel(currentLevel));
  document.getElementById('next-level-btn')?.addEventListener('click', () => {
    currentLevel = Math.min(currentLevel + 1, 30);
    startLevel(currentLevel);
  });
  document.getElementById('shop-btn')?.addEventListener('click', () => {
    if (window.ShopUI) ShopUI.open();
  });
  
  startLevel(currentLevel);
  gameLoop(performance.now());
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
