// Water-ripple effect on the hero photo, following the cursor.
// Classic two-buffer height-field simulation on a reduced-resolution canvas; each frame the
// photo is resampled with offsets from the wave slope. The loop sleeps when the water is calm.
// Fine pointers only; touch and reduced-motion visitors see the static photo.

const MAX_W = 960; // simulation width cap, keeps each frame cheap
const DAMP = 5; // higher = longer-lasting waves (value >> DAMP is removed each step)

export function initRipple(): void {
  const hero = document.querySelector<HTMLElement>('.hero');
  const canvas = document.getElementById('hero-ripple') as HTMLCanvasElement | null;
  const img = hero?.querySelector<HTMLImageElement>('.hero-bg img');
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!hero || !canvas || !img || !fine || reduce) return;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return;

  let W = 0;
  let H = 0;
  let scale = 1;
  let tex: Uint8ClampedArray | null = null;
  let frame: ImageData | null = null;
  let cur = new Int16Array(0);
  let prev = new Int16Array(0);
  let raf = 0;
  let calmFrames = 0;
  let lastDrop = 0;

  function setup() {
    const r = canvas!.getBoundingClientRect();
    if (!r.width || !r.height || !img!.naturalWidth) return;
    scale = Math.min(1, MAX_W / r.width);
    W = Math.max(2, Math.round(r.width * scale));
    H = Math.max(2, Math.round(r.height * scale));
    canvas!.width = W;
    canvas!.height = H;
    // Draw the photo with object-fit: cover and the same focal point as the CSS image.
    const iw = img!.naturalWidth;
    const ih = img!.naturalHeight;
    const s = Math.max(W / iw, H / ih);
    const dw = iw * s;
    const dh = ih * s;
    const fx = parseFloat(getComputedStyle(img!).objectPosition.split(' ')[0]) / 100 || 0.5;
    ctx!.drawImage(img!, (W - dw) * fx, (H - dh) * 0.3, dw, dh);
    tex = new Uint8ClampedArray(ctx!.getImageData(0, 0, W, H).data);
    frame = ctx!.createImageData(W, H);
    cur = new Int16Array(W * H);
    prev = new Int16Array(W * H);
    hero!.classList.add('has-ripple');
  }

  function drop(cx: number, cy: number, radius: number, strength: number) {
    const x0 = Math.round(cx * scale);
    const y0 = Math.round(cy * scale);
    for (let y = -radius; y <= radius; y++) {
      for (let x = -radius; x <= radius; x++) {
        const px = x0 + x;
        const py = y0 + y;
        if (px < 1 || py < 1 || px >= W - 1 || py >= H - 1 || x * x + y * y > radius * radius) continue;
        cur[py * W + px] += strength;
      }
    }
    calmFrames = 0;
    if (!raf) raf = requestAnimationFrame(step);
  }

  function step() {
    if (!tex || !frame) return;
    // Propagate the wave.
    let energy = 0;
    for (let y = 1; y < H - 1; y++) {
      const row = y * W;
      for (let x = 1; x < W - 1; x++) {
        const i = row + x;
        let v = ((cur[i - 1] + cur[i + 1] + cur[i - W] + cur[i + W]) >> 1) - prev[i];
        v -= v >> DAMP;
        prev[i] = v;
        energy += v < 0 ? -v : v;
      }
    }
    const t = cur;
    cur = prev;
    prev = t;

    // Refract the photo through the wave slope.
    const out = frame.data;
    for (let y = 1; y < H - 1; y++) {
      const row = y * W;
      for (let x = 1; x < W - 1; x++) {
        const i = row + x;
        const dx = cur[i - 1] - cur[i + 1];
        const dy = cur[i - W] - cur[i + W];
        let sx = x + (dx >> 4);
        let sy = y + (dy >> 4);
        if (sx < 0) sx = 0;
        else if (sx >= W) sx = W - 1;
        if (sy < 0) sy = 0;
        else if (sy >= H) sy = H - 1;
        const s = (sy * W + sx) << 2;
        const o = i << 2;
        const shade = dx >> 5; // light catching the wave crest
        out[o] = tex[s] + shade;
        out[o + 1] = tex[s + 1] + shade;
        out[o + 2] = tex[s + 2] + shade;
        out[o + 3] = 255;
      }
    }
    ctx!.putImageData(frame, 0, 0);

    calmFrames = energy < W * H * 0.02 ? calmFrames + 1 : 0;
    if (calmFrames > 30) {
      ctx!.putImageData(new ImageData(new Uint8ClampedArray(tex), W, H), 0, 0);
      raf = 0;
      return;
    }
    raf = requestAnimationFrame(step);
  }

  const start = () => {
    setup();
    hero.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse' || !tex) return;
      const now = performance.now();
      if (now - lastDrop < 16) return;
      lastDrop = now;
      const r = canvas.getBoundingClientRect();
      drop(e.clientX - r.left, e.clientY - r.top, 5, 420);
    });
    hero.addEventListener('pointerdown', (e) => {
      if (!tex) return;
      const r = canvas.getBoundingClientRect();
      drop(e.clientX - r.left, e.clientY - r.top, 9, 900);
    });
    let resizeTimer = 0;
    window.addEventListener('resize', () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(setup, 200);
    });
  };

  if (img.complete && img.naturalWidth) start();
  else img.addEventListener('load', start, { once: true });
}
