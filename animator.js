class CatAnimator {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.animations = {};
    this.current = null;
    this.frameIdx = 0;
    this.blend = 0;
    this.fps = 8;
    this.playing = false;
    this._last = null;
    this._raf = null;
    this._accumMs = 0;
    this.scale = 1;
    this.onFrame = null;
  }

  loadSprites(basePath, def) {
    const load = src => new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => res(img);
      img.onerror = () => rej(new Error('Failed: ' + src));
      img.src = src;
    });

    const promises = [];
    for (const [name, files] of Object.entries(def)) {
      const imgs = files.map(f => load(basePath + '/' + f));
      promises.push(
        Promise.all(imgs).then(loaded => { this.animations[name] = loaded; })
      );
    }
    return Promise.all(promises);
  }

  play(animName) {
    if (!this.animations[animName]) return;
    this.current = animName;
    this.frameIdx = 0;
    this.blend = 0;
    this._accumMs = 0;
    this.playing = true;
    if (!this._raf) this._loop(performance.now());
  }

  stop() {
    this.playing = false;
    if (this._raf) { cancelAnimationFrame(this._raf); this._raf = null; }
  }

  setFPS(fps) { this.fps = fps; }

  _loop(ts) {
    this._raf = requestAnimationFrame(t => this._loop(t));
    const dt = this._last === null ? 0 : ts - this._last;
    this._last = ts;
    this.update(dt);
    this.render();
  }

  update(dtMs) {
    if (!this.playing || !this.current) return;
    const frames = this.animations[this.current];
    if (!frames || frames.length === 0) return;

    const msPerFrame = 1000 / this.fps;
    this._accumMs += dtMs;

    while (this._accumMs >= msPerFrame) {
      this._accumMs -= msPerFrame;
      this.blend = 0;
      this.frameIdx = (this.frameIdx + 1) % frames.length;
    }

    this.blend = Math.min(1, this._accumMs / msPerFrame);
  }

  render() {
    const { canvas, ctx } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!this.current) return;

    const frames = this.animations[this.current];
    if (!frames || frames.length === 0) return;

    const cur = frames[this.frameIdx];
    const next = frames[(this.frameIdx + 1) % frames.length];
    const s = this.scale;

    const dw = cur.naturalWidth * s;
    const dh = cur.naturalHeight * s;
    const dx = (canvas.width - dw) / 2;
    const dy = (canvas.height - dh);

    if (this.blend > 0.05) {
      ctx.globalAlpha = 1 - this.blend;
      ctx.drawImage(cur, dx, dy, dw, dh);

      const ndw = next.naturalWidth * s;
      const ndh = next.naturalHeight * s;
      const ndx = (canvas.width - ndw) / 2;
      const ndy = (canvas.height - ndh);

      ctx.globalAlpha = this.blend;
      ctx.drawImage(next, ndx, ndy, ndw, ndh);
      ctx.globalAlpha = 1;
    } else {
      ctx.drawImage(cur, dx, dy, dw, dh);
    }

    if (this.onFrame) this.onFrame(this.frameIdx, frames.length);
  }
}
