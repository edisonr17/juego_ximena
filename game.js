'use strict';

const SPRITE_W = 266;
const SPRITE_H = 200;

// All frames share the same ground line: cat bottom at canvas_h - 20
const FOOT_Y = 180;
const ANIM_FOOT = {
  idle:       FOOT_Y,
  walk:       FOOT_Y,
  jump_start: FOOT_Y,
  jump_air:   FOOT_Y,
  fall:       FOOT_Y,
  land:       FOOT_Y,
};

// ─────────────────────────────────────────────────────────────────────────────
//  SPRITE LOADER
// ─────────────────────────────────────────────────────────────────────────────
class SpriteLoader {
  constructor() { this._c = new Map(); }

  load(name, src) {
    if (this._c.has(name)) return Promise.resolve(this._c.get(name));
    return new Promise((res, rej) => {
      const img = new Image();
      img.onload  = () => { this._c.set(name, img); res(img); };
      img.onerror = () => rej(new Error('Cannot load: ' + src));
      img.src = src;
    });
  }

  loadBatch(def) {
    return Promise.all(Object.entries(def).map(([k, v]) => this.load(k, v)));
  }

  get(n) { return this._c.get(n) ?? null; }
}

// ─────────────────────────────────────────────────────────────────────────────
//  INPUT MANAGER
// ─────────────────────────────────────────────────────────────────────────────
class InputManager {
  constructor() {
    this._held    = new Set();
    this._pressed = new Set();
    const BLOCK   = new Set(['Space','ArrowLeft','ArrowRight','ArrowUp','ArrowDown']);
    window.addEventListener('keydown', e => {
      if (BLOCK.has(e.code)) e.preventDefault();
      if (!this._held.has(e.code)) this._pressed.add(e.code);
      this._held.add(e.code);
    });
    window.addEventListener('keyup', e => this._held.delete(e.code));
  }
  held(c)    { return this._held.has(c);    }
  pressed(c) { return this._pressed.has(c); }
  flush()    { this._pressed.clear();        }
}

// ─────────────────────────────────────────────────────────────────────────────
//  ANIMATION CLIP
// ─────────────────────────────────────────────────────────────────────────────
class AnimClip {
  constructor(frames, fps, loop = true) {
    this.frames   = frames;
    this.fps      = fps;
    this.loop     = loop;
    this._t       = 0;
    this._i       = 0;
    this.finished = false;
  }
  reset() { this._t = 0; this._i = 0; this.finished = false; }
  update(dt) {
    if (this.finished) return;
    this._t += dt;
    const d = 1 / this.fps;
    while (this._t >= d) {
      this._t -= d;
      if (this._i < this.frames.length - 1) { this._i++; }
      else if (this.loop) { this._i = 0; }
      else { this.finished = true; return; }
    }
  }
  get frame() { return this.frames[this._i]; }
}

// ─────────────────────────────────────────────────────────────────────────────
//  ANIMATION CONTROLLER
//  • Cross-fades between clips (130 ms)
//  • Interpolates the foot-Y pivot during transition (prevents vertical jump)
//  • All sprites drawn with foot anchored at (footX, footY) in world space
// ─────────────────────────────────────────────────────────────────────────────
class AnimationController {
  constructor(loader) {
    this._loader   = loader;
    this._clips    = {};
    this._footYs   = {};          // per-clip foot position in PNG
    this._active   = null;
    this._prevImg  = null;
    this._prevSX   = 1;
    this._prevFY   = 0;           // previous foot-Y in PNG
    this._lastSX   = 1;
    this._blendT   = 0;
    this._blendDur = 0.13;
    this._blending = false;
  }

  register(name, frames, fps, footY, loop = true) {
    this._clips[name]  = new AnimClip(frames, fps, loop);
    this._footYs[name] = footY;
  }

  play(name, force = false) {
    if (this._active === name && !force) return;
    if (this._active && this._clips[this._active]) {
      const img = this._loader.get(this._clips[this._active].frame);
      if (img) {
        this._prevImg  = img;
        this._prevSX   = this._lastSX;
        this._prevFY   = this._footYs[this._active] ?? SPRITE_SZ * 0.88;
        this._blendT   = 0;
        this._blending = true;
      }
    }
    this._active = name;
    this._clips[name]?.reset();
  }

  update(dt) {
    this._clips[this._active]?.update(dt);
    if (this._blending) {
      this._blendT += dt;
      if (this._blendT >= this._blendDur) { this._blending = false; this._prevImg = null; }
    }
  }

  isDone() { return this._clips[this._active]?.finished ?? true; }

  // footX, footY  — world position where the cat's feet touch
  // scaleX        — signed (negative = facing left)
  // scaleY        — always positive
  draw(ctx, footX, footY, scaleX, scaleY) {
    this._lastSX = scaleX;
    const curFY  = this._footYs[this._active] ?? SPRITE_SZ * 0.88;
    const blend  = this._blending ? Math.min(1, this._blendT / this._blendDur) : 1;

    // Interpolate pivot during cross-fade so the cat doesn't jump vertically
    const interpFY = this._blending
      ? this._prevFY * (1 - blend) + curFY * blend
      : curFY;

    if (this._blending && this._prevImg) {
      this._blit(ctx, this._prevImg, footX, footY, this._prevSX, scaleY, 1 - blend, interpFY);
    }
    if (this._active && this._clips[this._active]) {
      const img = this._loader.get(this._clips[this._active].frame);
      if (img) this._blit(ctx, img, footX, footY, scaleX, scaleY, blend, interpFY);
    }
  }

  _blit(ctx, img, footX, footY, sx, sy, alpha, footYinPNG) {
    const dw       = SPRITE_W * Math.abs(sx);
    const dh       = SPRITE_H * sy;
    const pivotOff = footYinPNG * sy;   // distance from sprite top to foot
    const left     = footX - dw / 2;
    const top      = footY - pivotOff;

    ctx.save();
    ctx.globalAlpha = alpha;
    if (sx < 0) {
      ctx.translate(footX * 2, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(img, left, top, dw, dh);
    ctx.restore();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  PHYSICS CONTROLLER
// ─────────────────────────────────────────────────────────────────────────────
class PhysicsController {
  constructor(x, groundY) {
    this.x        = x;
    this.y        = groundY;
    this.vx       = 0;
    this.vy       = 0;
    this.onGround = true;
    this.groundY  = groundY;
    this.minX     = 0;
    this.maxX     = 800;

    this.gravity     = 1100;
    this.jumpImpulse = -530;
    this.maxWalk     = 250;
    this.walkAccel   = 1800;
    this.frictionK   = 8;
    this.maxFall     = 900;
  }

  jump() {
    if (!this.onGround) return;
    this.vy = this.jumpImpulse;
    this.onGround = false;
  }

  update(dt, left, right) {
    if (right)     this.vx = Math.min(this.maxWalk,  this.vx + this.walkAccel * dt);
    else if (left) this.vx = Math.max(-this.maxWalk, this.vx - this.walkAccel * dt);
    else {
      this.vx *= Math.exp(-this.frictionK * dt);
      if (Math.abs(this.vx) < 3) this.vx = 0;
    }
    if (!this.onGround) this.vy = Math.min(this.maxFall, this.vy + this.gravity * dt);

    this.x = Math.max(this.minX, Math.min(this.maxX, this.x + this.vx * dt));
    this.y += this.vy * dt;

    if (this.y >= this.groundY) {
      this.y = this.groundY; this.vy = 0; this.onGround = true;
    } else {
      this.onGround = false;
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  STATE MACHINE
// ─────────────────────────────────────────────────────────────────────────────
const S = Object.freeze({
  IDLE:'IDLE', WALK:'WALK',
  JUMP_START:'JUMP_START', JUMP_AIR:'JUMP_AIR', FALL:'FALL', LAND:'LAND',
});

// ─────────────────────────────────────────────────────────────────────────────
//  CAT CHARACTER
// ─────────────────────────────────────────────────────────────────────────────
class CatCharacter {
  constructor(loader, physics, input) {
    this._p    = physics;
    this._in   = input;
    this._anim = new AnimationController(loader);
    this._st   = S.IDLE;
    this._dir  = 1;
    this.scale = 0.55;

    const R = (n, fr, fps, fy, loop = true) => this._anim.register(n, fr, fps, fy, loop);
    R('idle',       ['idle_01','idle_02','idle_03','idle_04','idle_05'],              4,  ANIM_FOOT.idle);
    R('walk',       ['walk_01','walk_02','walk_03','walk_04','walk_05'],            10,  ANIM_FOOT.walk);
    R('jump_start', ['jump_01','jump_02'],                               14,  ANIM_FOOT.jump_start, false);
    R('jump_air',   ['jump_03'],                                          4,  ANIM_FOOT.jump_air);
    R('fall',       ['jump_04','jump_05'],                                8,  ANIM_FOOT.fall);
    R('land',       ['crouch_01','crouch_02','crouch_03','crouch_04'],   10,  ANIM_FOOT.land, false);

    this._anim.play('idle');
  }

  get state() { return this._st; }

  _go(next) {
    if (this._st === next) return;
    this._st = next;
    switch (next) {
      case S.IDLE:       this._anim.play('idle');             break;
      case S.WALK:       this._anim.play('walk');             break;
      case S.JUMP_START: this._anim.play('jump_start', true); this._p.jump(); break;
      case S.JUMP_AIR:   this._anim.play('jump_air');         break;
      case S.FALL:       this._anim.play('fall');             break;
      case S.LAND:       this._anim.play('land', true);       break;
    }
  }

  update(dt) {
    const L    = this._in.held('ArrowLeft');
    const R    = this._in.held('ArrowRight');
    const jump = this._in.pressed('Space');

    if (R) this._dir = 1; else if (L) this._dir = -1;
    this._p.update(dt, L, R);

    const moving  = L || R;
    const slow    = !moving && Math.abs(this._p.vx) < 25;
    const goingUp = this._p.vy < 0;

    switch (this._st) {
      case S.IDLE:
        if (jump)   { this._go(S.JUMP_START); break; }
        if (moving) { this._go(S.WALK);       break; }
        break;
      case S.WALK:
        if (jump) { this._go(S.JUMP_START); break; }
        if (slow) { this._go(S.IDLE);       break; }
        break;
      case S.JUMP_START:
        if (this._anim.isDone()) this._go(goingUp ? S.JUMP_AIR : S.FALL);
        break;
      case S.JUMP_AIR:
        if (!goingUp) this._go(S.FALL);
        break;
      case S.FALL:
        if (this._p.onGround) this._go(S.LAND);
        break;
      case S.LAND:
        if (this._anim.isDone()) this._go(moving ? S.WALK : S.IDLE);
        break;
    }

    this._anim.update(dt);
  }

  render(ctx) {
    const s  = this.scale;
    const sx = this._dir * s;
    this._anim.draw(ctx, this._p.x, this._p.y, sx, s);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  GAME
// ─────────────────────────────────────────────────────────────────────────────
class Game {
  constructor(canvas) {
    this._cv   = canvas;
    this._ctx  = canvas.getContext('2d');
    this._in   = new InputManager();
    this._cat  = null;
    this._gy   = 0;
    this._stars = [];
    this._last  = null;
  }

  async init() {
    const loader = new SpriteLoader();
    const names  = [
      'idle_01','idle_02','idle_03','idle_04','idle_05',
      'walk_01','walk_02','walk_03','walk_04','walk_05',
      'jump_01','jump_02','jump_03','jump_04','jump_05',
      'crouch_01','crouch_02','crouch_03','crouch_04',
    ];
    await loader.loadBatch(Object.fromEntries(names.map(n => [n, `sprites/${n}.png`])));

    this._gy = this._cv.height - 72;
    const phys = new PhysicsController(this._cv.width / 2, this._gy);
    phys.minX = 80;
    phys.maxX = this._cv.width - 80;
    this._cat = new CatCharacter(loader, phys, this._in);

    let r = 0xDEAD1337;
    const lcg = () => { r = (Math.imul(r,1664525)+1013904223)|0; return (r>>>0)/0xFFFFFFFF; };
    this._stars = Array.from({length:80}, () => ({
      x: lcg()*this._cv.width, y: lcg()*this._gy*0.85,
      r: lcg()*1.3+0.3, a: lcg()*0.5+0.15,
    }));
  }

  start() { requestAnimationFrame(ts => this._loop(ts)); }

  _loop(ts) {
    requestAnimationFrame(t => this._loop(t));
    const dt = this._last === null ? 0 : Math.min((ts - this._last)/1000, 0.05);
    this._last = ts;
    this._cat.update(dt);
    this._render();
    this._in.flush();
  }

  _render() {
    const { _ctx:ctx, _cv:cv, _gy:gy } = this;

    const sky = ctx.createLinearGradient(0,0,0,cv.height);
    sky.addColorStop(0,'#050E1C'); sky.addColorStop(1,'#0A1F3D');
    ctx.fillStyle = sky;
    ctx.fillRect(0,0,cv.width,cv.height);

    for (const s of this._stars) {
      ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,Math.PI*2);
      ctx.fillStyle = `rgba(210,230,255,${s.a})`; ctx.fill();
    }

    // Shadow blob under cat
    const cx   = this._cat._p.x;
    const dist = Math.max(0, gy - this._cat._p.y);
    const sa   = Math.max(0, 0.45 - dist*0.0018);
    const ss   = Math.max(0.2, 1 - dist*0.005);
    ctx.save();
    ctx.globalAlpha = sa; ctx.fillStyle = '#000518';
    ctx.beginPath(); ctx.ellipse(cx,gy+6,44*ss,8*ss,0,0,Math.PI*2); ctx.fill();
    ctx.restore();

    // Ground
    const gf = ctx.createLinearGradient(0,gy,0,cv.height);
    gf.addColorStop(0,'#152A44'); gf.addColorStop(1,'#090F1E');
    ctx.fillStyle = gf; ctx.fillRect(0,gy+2,cv.width,cv.height);

    ctx.save();
    ctx.shadowColor='#2E75B6'; ctx.shadowBlur=12;
    ctx.strokeStyle='#2E75B6'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(0,gy+2); ctx.lineTo(cv.width,gy+2); ctx.stroke();
    ctx.restore();

    this._cat.render(ctx);
    this._hud(ctx);

    ctx.save();
    ctx.fillStyle='rgba(100,140,180,0.32)';
    ctx.font='11px Inter,system-ui,sans-serif'; ctx.textAlign='center';
    ctx.fillText('← → Mover   ESPACIO Saltar', cv.width/2, cv.height-10);
    ctx.restore();
  }

  _hud(ctx) {
    const state = this._cat.state;
    const x=14,y=14,w=144,h=46,r=10;
    ctx.save();
    ctx.fillStyle='rgba(4,12,26,0.82)'; ctx.strokeStyle='#1a3a5c'; ctx.lineWidth=1;
    ctx.beginPath();
    ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.arcTo(x+w,y,x+w,y+r,r);
    ctx.lineTo(x+w,y+h-r); ctx.arcTo(x+w,y+h,x+w-r,y+h,r);
    ctx.lineTo(x+r,y+h); ctx.arcTo(x,y+h,x,y+h-r,r);
    ctx.lineTo(x,y+r); ctx.arcTo(x,y,x+r,y,r); ctx.closePath();
    ctx.fill(); ctx.stroke();

    ctx.fillStyle='#3a5c7a'; ctx.font='10px Inter,system-ui,sans-serif';
    ctx.textAlign='left'; ctx.fillText('ESTADO',x+12,y+17);
    ctx.fillStyle='#2E75B6'; ctx.font='bold 15px Inter,system-ui,sans-serif';
    ctx.fillText(state,x+12,y+36);
    ctx.restore();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  BOOT
// ─────────────────────────────────────────────────────────────────────────────
window.addEventListener('load', async () => {
  const canvas = document.getElementById('gameCanvas');
  const game   = new Game(canvas);
  try {
    await game.init();
    game.start();
  } catch (err) {
    console.error('Boot error:', err);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle='#2E75B6'; ctx.font='14px Inter,system-ui';
    ctx.fillText('Error cargando sprites — ver consola', 20, 40);
  }
});
