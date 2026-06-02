/* ===== Rope Cut — Full Progression System ===== */
(function() {
  'use strict';
  const SAVE_KEY = 'rc_progress';
  const DAILY_KEY = 'rc_daily_bonus';

  const UPGRADE_TIERS = {
    weapon: {
      name: 'Blade',
      icon: '🔪',
      maxLevel: 5,
      levels: [
        { level: 0, name: 'Dull Knife',     bonus: { ropeCount: 5 },  gemReq: 0,   coinsReq: 0 },
        { level: 1, name: 'Sharp Knife',    bonus: { ropeCount: 6 },  gemReq: 50,  coinsReq: 1000 },
        { level: 2, name: 'Scissors',       bonus: { ropeCount: 7 },  gemReq: 80,  coinsReq: 2000 },
        { level: 3, name: 'Shears',         bonus: { ropeCount: 8 },  gemReq: 120, coinsReq: 4000 },
        { level: 4, name: 'Sword',          bonus: { ropeCount: 10 }, gemReq: 200, coinsReq: 8000 },
        { level: 5, name: '⚡ Lightsaber',  bonus: { ropeCount: 12 }, gemReq: 500, coinsReq: 20000 },
      ]
    },
    case: {
      name: 'Net',
      icon: '🕸️',
      maxLevel: 5,
      levels: [
        { level: 0, name: 'Tiny Net',    bonus: { basketSize: 0 },  gemReq: 0,   coinsReq: 0 },
        { level: 1, name: 'Small Net',   bonus: { basketSize: 1 },  gemReq: 40,  coinsReq: 800 },
        { level: 2, name: 'Medium Net',  bonus: { basketSize: 1 },  gemReq: 70,  coinsReq: 1600 },
        { level: 3, name: 'Large Net',   bonus: { basketSize: 2 },  gemReq: 100, coinsReq: 3200 },
        { level: 4, name: 'Big Catch',   bonus: { basketSize: 2 },  gemReq: 180, coinsReq: 6400 },
        { level: 5, name: '💎 Mega Net', bonus: { basketSize: 3 },  gemReq: 400, coinsReq: 16000 },
      ]
    },
    outfit: {
      name: 'Star',
      icon: '⭐',
      maxLevel: 5,
      levels: [
        { level: 0, name: 'Bronze Star',   bonus: { scoreMult: 1 },   gemReq: 0,   coinsReq: 0 },
        { level: 1, name: 'Silver Star',   bonus: { scoreMult: 1.2 }, gemReq: 30,  coinsReq: 600 },
        { level: 2, name: 'Gold Star',     bonus: { scoreMult: 1.4 }, gemReq: 60,  coinsReq: 1200 },
        { level: 3, name: 'Platinum Star', bonus: { scoreMult: 1.7 }, gemReq: 90,  coinsReq: 2400 },
        { level: 4, name: 'Diamond Star',  bonus: { scoreMult: 2 },   gemReq: 150, coinsReq: 4800 },
        { level: 5, name: '🔥 Cosmic Star',bonus: { scoreMult: 2.5 }, gemReq: 350, coinsReq: 12000 },
      ]
    }
  };

  const PREMIUM_ITEMS = {
    legendarySkins: [
      { id: 'lg_goldblade',  name: 'Golden Blade',  desc: 'Gold-plated cutting blade', price: 4.99, gemPrice: 0, tier: 'legendary', type: 'weapon_skin' },
      { id: 'lg_iceblade',   name: 'Ice Cutter',    desc: 'Frozen crystal blade',      price: 6.99, gemPrice: 0, tier: 'legendary', type: 'weapon_skin' },
    ],
    premiumCases: [
      { id: 'pc_royal',      name: 'Royal Pass',    desc: '7 days: 2x coins + 50 gems/day', price: 4.99, gemPrice: 0, type: 'subscription', duration: '7d' },
    ],
    bundles: [
      { id: 'bundle_starter', name: 'Starter Bundle', desc: '200 gems + 5 star boosters + exclusive blade', price: 2.99, gemPrice: 0, type: 'one_time' },
      { id: 'bundle_mega',    name: 'Mega Pack',      desc: '500 gems + 15 boosters + golden theme', price: 7.99, gemPrice: 0, type: 'one_time' },
    ],
    removeAds: { id: 'remove_ads', name: 'Remove Ads', desc: 'Permanently remove all ads', price: 2.99, gemPrice: 0, type: 'one_time' },
  };

  const GEM_PACKS = [
    { id: 'gems_small',  name: 'Small Gem Pack',   gems: 100,  price: 0.99,  bonus: 0,    popular: false },
    { id: 'gems_medium', name: 'Standard Gem Pack', gems: 500,  price: 3.99,  bonus: 50,   popular: true  },
    { id: 'gems_large',  name: 'Large Gem Pack',   gems: 1200, price: 7.99,  bonus: 200,  popular: false },
    { id: 'gems_mega',   name: 'Mega Gem Pack',    gems: 4000, price: 19.99, bonus: 1000, popular: false },
  ];

  const CATALOG = {
    themes: [
      { id: 'default',   name: 'Classic Dark',   price: 0,    desc: 'Original dark theme',         colors: { bg: '#0f1020', accent: '#1a1a2e' } },
      { id: 'workshop',  name: 'Workshop',       price: 500,  desc: 'Wooden workshop style',       colors: { bg: '#1a0a00', accent: '#3a2010' } },
      { id: 'sky',       name: 'Sky Garden',     price: 800,  desc: 'Bright blue sky theme',       colors: { bg: '#0a2a4a', accent: '#1a4a6a' } },
      { id: 'sunset',    name: 'Sunset Glow',    price: 1000, desc: 'Warm sunset colors',          colors: { bg: '#2d1b3d', accent: '#4a1a3a' } },
      { id: 'neon',      name: 'Neon Nights',    price: 2000, desc: 'Bright neon city theme',      colors: { bg: '#1a0030', accent: '#2a0050' } },
    ],
    bladeSkins: [
      { id: 'basic',     name: 'Basic Blade',    price: 0,    desc: 'Standard cutting blade',      color: '#aaaaaa' },
      { id: 'silver',    name: 'Silver Edge',    price: 600,  desc: 'Shiny silver blade',          color: '#c0c0c0' },
      { id: 'gold',      name: 'Gold Edge',      price: 1200, desc: 'Luxurious gold blade',        color: '#ffd700' },
      { id: 'neon',      name: 'Neon Edge',      price: 2000, desc: 'Neon glowing blade',          color: '#00ffff' },
      { id: 'rainbow',   name: 'Rainbow Blade',  price: 3500, desc: 'Rainbow prism blade',         color: '#ff69b4' },
    ],
    ropeStyles: [
      { id: 'classic',   name: 'Classic Rope',   price: 0,    desc: 'Standard brown rope' },
      { id: 'golden',    name: 'Golden Rope',    price: 800,  desc: 'Golden decorative rope' },
      { id: 'neon',      name: 'Neon Rope',      price: 1500, desc: 'Neon colored rope' },
      { id: 'chain',     name: 'Chain Link',     price: 2500, desc: 'Metal chain style' },
    ],
    powerupPacks: [
      { id: 'stars',     name: 'Star Boost',     price: 300,  items: { starBoost: 3 },      desc: '3 star boosters' },
      { id: 'ropes',     name: 'Extra Ropes',    price: 400,  items: { extraRope: 3 },      desc: '3 extra rope cuts' },
      { id: 'mega',      name: 'Mega Bundle',    price: 1000, items: { starBoost: 5, extraRope: 5 }, desc: '5 star boost + 5 ropes' },
    ],
  };

  const ACHIEVEMENTS = [
    { id: 'first_win',    name: 'First Cut',       desc: 'Complete your first level',              reward: { coins: 50, gems: 0 },  icon: '✂️', check: p => p.totalWins >= 1 },
    { id: 'win_10',       name: 'Rope Master',     desc: 'Complete 10 levels',                     reward: { coins: 200, gems: 5 }, icon: '🔪', check: p => p.totalWins >= 10 },
    { id: 'win_50',       name: 'Cutting Expert',  desc: 'Complete 50 levels',                     reward: { coins: 1000, gems: 20 },icon: '🏆', check: p => p.totalWins >= 50 },
    { id: 'three_stars',  name: 'Perfect Cut',     desc: 'Get 3 stars on a level',                 reward: { coins: 300, gems: 10 },icon: '⭐', check: p => p.threeStarLevels >= 1 },
    { id: 'ten_3stars',   name: 'Star Collector',  desc: 'Get 3 stars on 10 levels',              reward: { coins: 1500, gems: 30 },icon: '💫', check: p => p.threeStarLevels >= 10 },
    { id: 'collect_100',  name: 'Collector',       desc: 'Collect 100 items total',                reward: { coins: 500, gems: 15 }, icon: '📦', check: p => p.totalCollected >= 100 },
  ];

  function defaultState() {
    return {
      coins: 150, gems: 0, totalGems: 0, xp: 0, level: 1, highestLevel: 1,
      totalWins: 0, totalPlays: 0, threeStarLevels: 0, totalCollected: 0,
      upgrades: { weapon: 0, case: 0, outfit: 0 },
      ownedThemes: ['default'], ownedBladeSkins: ['basic'], ownedRopeStyles: ['classic'],
      activeTheme: 'default', activeBladeSkin: 'basic', activeRopeStyle: 'classic',
      powerups: { starBoost: 3, extraRope: 2 },
      inventory: {}, achievements: {}, lastSaveDate: null, adFree: false, subscriptions: {},
      completedLevels: {},
    };
  }

  let state = null;
  function save() { state.lastSaveDate = new Date().toISOString(); try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch(e) {} }
  function load() { try { const raw = localStorage.getItem(SAVE_KEY); if(raw){state={...defaultState(),...JSON.parse(raw)};save();return true;} }catch(e){} reset(); return false; }
  function reset() { state = defaultState(); save(); }
  function xpForLevel(lvl){return Math.floor(100*Math.pow(1.2,lvl-1));}
  function addXp(a){if(!state)return false;state.xp+=a;let l=false;while(state.xp>=xpForLevel(state.level)){state.xp-=xpForLevel(state.level);state.level++;l=true;}save();return l;}
  function addCoins(a){if(!state)return 0;state.coins+=a;save();return state.coins;}
  function spendCoins(a){if(!state||state.coins<a)return false;state.coins-=a;save();return true;}
  function addGems(a){if(!state)return 0;state.gems+=a;state.totalGems+=a;save();return state.gems;}
  function spendGems(a){if(!state||state.gems<a)return false;state.gems-=a;save();return true;}
  function getUpgradeCost(cat,cl){const t=UPGRADE_TIERS[cat];if(!t)return null;const n=cl+1;const ld=t.levels.find(l=>l.level===n);if(!ld)return null;return{coins:ld.coinsReq,gems:ld.gemReq};}
  function upgradeItem(cat,ug=false){if(!state)return{success:false,reason:'no_state'};const t=UPGRADE_TIERS[cat];if(!t)return{success:false,reason:'invalid'};const c=state.upgrades[cat]||0;if(c>=t.maxLevel)return{success:false,reason:'max'};const cs=getUpgradeCost(cat,c);if(!cs)return{success:false,reason:'nodata'};if(ug){if(state.gems<cs.gems)return{success:false,reason:'nogems'};spendGems(cs.gems);}else{if(state.coins<cs.coins)return{success:false,reason:'nocoins'};spendCoins(cs.coins);}state.upgrades[cat]++;save();return{success:true,newLevel:state.upgrades[cat]};}
  function getActiveBonuses(){if(!state)return{ropeCount:5,basketSize:0,scoreMult:1};const b={ropeCount:5,basketSize:0,scoreMult:1};const w=UPGRADE_TIERS.weapon.levels[state.upgrades.weapon||0];if(w)b.ropeCount=w.bonus.ropeCount;const c=UPGRADE_TIERS.case.levels[state.upgrades.case||0];if(c)b.basketSize=c.bonus.basketSize;const o=UPGRADE_TIERS.outfit.levels[state.upgrades.outfit||0];if(o)b.scoreMult=o.bonus.scoreMult;return b;}
  function ownsPremiumItem(id){return state&&state.inventory&&state.inventory[id]===true;}
  function purchasePremiumItem(id){if(!state)return false;state.inventory[id]=true;if(id==='remove_ads'){state.adFree=true;if(window.AdsManager)AdsManager.onAdsRemoved();}const bg={bundle_starter:200,bundle_mega:500};if(bg[id])addGems(bg[id]);save();return true;}
  function checkAchievements(){if(!state)return[];const u=[];for(const a of ACHIEVEMENTS){if(state.achievements[a.id])continue;if(a.check(state)){state.achievements[a.id]=true;addCoins(a.reward.coins);if(a.reward.gems)addGems(a.reward.gems);u.push(a);}}if(u.length>0)save();return u;}
  function claimDailyBonus(){if(!state)return null;const n=new Date();const t=n.toDateString();try{const l=localStorage.getItem(DAILY_KEY);if(l===t)return null;const y=new Date(n);y.setDate(y.getDate()-1);const s=l===y.toDateString()?(state.dailyStreak||0)+1:1;state.dailyStreak=s;const c=Math.min(100+(s-1)*20,1000);const g=s>=7?5:s>=3?2:0;addCoins(c);if(g)addGems(g);localStorage.setItem(DAILY_KEY,t);save();return{streak:s,coins:c,gems:g};}catch(e){return null;}}
  function endOfGame(r){if(!state)return;state.totalPlays++;if(r.won){state.totalWins++;if(r.level>state.highestLevel)state.highestLevel=r.level;if(!state.completedLevels[r.level]||r.stars>(state.completedLevels[r.level]||0))state.completedLevels[r.level]=r.stars;if(r.stars>=3)state.threeStarLevels=Object.values(state.completedLevels).filter(s=>s>=3).length;}if(r.collected)state.totalCollected+=r.collected;addXp(r.won?100:20);if(r.won)addCoins(20+r.stars*15+Math.floor(r.level*5));save();}
  function getState(){return state;}
  function getUpgradeTiers(){return UPGRADE_TIERS;}
  function getPremiumItems(){return PREMIUM_ITEMS;}
  function getGemPacks(){return GEM_PACKS;}
  function getCatalog(){return CATALOG;}
  function getAchievements(){return ACHIEVEMENTS;}
  function getCoinBalance(){return state?state.coins:0;}
  function getGemBalance(){return state?state.gems:0;}
  window.ProgressionSystem={load,save,reset,addCoins,spendCoins,getCoinBalance,addGems,spendGems,getGemBalance,addXp,xpForLevel,upgradeItem,getUpgradeCost,getActiveBonuses,getUpgradeTiers,UPGRADE_TIERS,getPremiumItems,PREMIUM_ITEMS,getGemPacks,GEM_PACKS,ownsPremiumItem,purchasePremiumItem,getCatalog,CATALOG,getAchievements,ACHIEVEMENTS,checkAchievements,endOfGame,claimDailyBonus,getState,defaultState};
})();
